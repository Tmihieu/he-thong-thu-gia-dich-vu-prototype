package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Không chạy trong transaction của test vì cần kiểm tra hai yêu cầu song song; dữ liệu dọn sau mỗi ca. */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class CompanyReceiptIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;
    @Autowired CompanyReceiptService receiptService;
    @Autowired CollectionService collection;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> {
            fx.build();
            collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "p-1",
                    null, null, null), fx.actor(fx.thu07));
        });
    }

    @AfterEach
    void clean() {
        cleaner.truncateAll();
    }

    @Test
    void receiptsChangeLedgerReceivedAndRemainingWithCumulativeAndWords() throws Exception {
        String officer = fx.bearer(fx.officer);
        issue(officer, fx.dv01.getId(), 200_000)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.code").value("PT-CT-1026-001"))
                .andExpect(jsonPath("$.payerName").value("Người Mẫu A"))
                .andExpect(jsonPath("$.amountInWords").value("Hai trăm nghìn đồng"))
                .andExpect(jsonPath("$.cumulativePaid").value(200_000))
                .andExpect(jsonPath("$.remainingAfter").value(120_000));
        issue(officer, fx.dv01.getId(), 100_000)
                .andExpect(jsonPath("$.code").value("PT-CT-1026-002"))
                .andExpect(jsonPath("$.cumulativePaid").value(300_000))
                .andExpect(jsonPath("$.remainingAfter").value(20_000));

        mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, officer))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].received").value(contains(300_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].remaining").value(contains(20_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].receiptCount").value(contains(2)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].progress").value(contains("PARTIAL")));

        issue(officer, fx.dv01.getId(), 20_001)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RECEIPT_AMOUNT_OUT_OF_RANGE"));
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'ISSUE_COMPANY_RECEIPT'",
                Integer.class)).isEqualTo(2);
    }

    @Test
    void companySeesOnlyItsOwnReceipts() throws Exception {
        String officer = fx.bearer(fx.officer);
        issue(officer, fx.dv01.getId(), 100_000);
        issue(officer, fx.dv07.getId(), 50_000);

        list(fx.dv07Manager).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].companyCode").value("DV07"));
        list(fx.officer).andExpect(jsonPath("$[*].companyCode", contains("DV01", "DV07")));
        long dv01Receipt = jdbc.queryForObject("select id from company_receipts where amount = 100000", Long.class);
        mvc.perform(get("/api/remittance/receipts/" + dv01Receipt).header(HttpHeaders.AUTHORIZATION,
                fx.bearer(fx.dv07Manager))).andExpect(status().isNotFound());
        issue(fx.bearer(fx.dv01Manager), fx.dv01.getId(), 1_000).andExpect(status().isForbidden());
    }

    @Test
    void parallelRequestsGetDistinctSequentialCodes() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<String> dv01 = () -> {
                start.await();
                return issueDirect(fx.dv01.getId(), 100_000).getCode();
            };
            Callable<String> dv07 = () -> {
                start.await();
                return issueDirect(fx.dv07.getId(), 100_000).getCode();
            };
            List<Future<String>> results = List.of(pool.submit(dv01), pool.submit(dv07));
            start.countDown();
            List<String> codes = List.of(results.get(0).get(), results.get(1).get());
            assertThat(codes).containsExactlyInAnyOrder("PT-CT-1026-001", "PT-CT-1026-002");
        } finally {
            pool.shutdownNow();
        }
    }

    private CompanyReceipt issueDirect(Long companyId, long amount) {
        return receiptService.issue(new IssueReceiptCommand(companyId, fx.october.getId(), amount, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
    }

    private ResultActions issue(String token, Long companyId, long amount) throws Exception {
        return mvc.perform(post("/api/remittance/receipts").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":%d,\"method\":\"TRANSFER\"}"
                        .formatted(companyId, fx.october.getId(), amount)));
    }

    private ResultActions list(User user) throws Exception {
        return mvc.perform(get("/api/remittance/receipts").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }
}
