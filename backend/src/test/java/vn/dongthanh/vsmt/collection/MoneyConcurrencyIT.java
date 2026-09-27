package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CashService;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.remittance.service.PeriodLockService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Ghi tiền song song như server thật: dữ liệu commit, không có transaction của test bao ngoài (khóa dòng chỉ có tác
 * dụng giữa các transaction thật). Mỗi test giữ transaction thứ nhất mở (đã khóa, chưa commit) rồi mới cho lượt thứ hai
 * chạy, nên thiếu khóa là test đỏ chắc chắn chứ không tùy may rủi. Chờ tối đa 30 giây, chốt luôn được mở trong
 * finally và pool bị dừng trước khi xóa dữ liệu, để khóa sai không làm treo cả bộ test.
 */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class MoneyConcurrencyIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired PeriodService periods;
    @Autowired PeriodLockService periodLock;
    @Autowired CompanyReceiptService receipts;
    @Autowired ChargeRequestService chargeRequests;
    @Autowired CollectionService collection;
    @Autowired CashService cash;
    @Autowired FeeTypeRepository feeTypes;

    final ExecutorService pool = Executors.newFixedThreadPool(4);
    FeeType extra;
    long chargeId;
    String collector;
    String officer;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> {
            fx.build();
            periods.startCollecting(fx.october.getId(), fx.actor(fx.admin));
            extra = feeTypes.save(FeeType.create("EXTRA", "Phụ phí", PricingMode.FIXED, 10_000L));
        });
        chargeId = fx.chargeId("DTH-H000001"); // 80.000 đ, KV07 của thu07
        collector = fx.bearer(fx.thu07);
        officer = fx.bearer(fx.officer);
    }

    @AfterEach
    void clean() throws InterruptedException {
        pool.shutdownNow();
        pool.awaitTermination(30, TimeUnit.SECONDS);
        cleaner.truncateAll();
    }

    @Test
    void secondPaymentOnTheSameChargeWaitsForTheFirstAndCannotExceedTheAmount() throws Exception {
        List<MockHttpServletResponse> waited = whileHeldOpen(
                () -> collection.recordPayment(new PaymentCommand(chargeId, 50_000, PaymentMethod.CASH, "p-a", null,
                        null, null), fx.actor(fx.thu07)),
                () -> pay(50_000, "p-b"));

        assertRejected(waited.get(0), "PAYMENT_AMOUNT_INVALID");
        assertThat(jdbc.queryForObject("select sum(amount) from payments where charge_id = ?", Long.class, chargeId))
                .isEqualTo(50_000L);
        assertThat(jdbc.queryForObject("select status from charges where id = ?", String.class, chargeId))
                .isEqualTo("UNPAID");
    }

    @Test
    void secondHandoverWaitsForTheFirstAndCannotExceedCashHeld() throws Exception {
        assertThat(pay(80_000, "cash-1").getStatus()).isEqualTo(201);

        List<MockHttpServletResponse> waited = whileHeldOpen(
                () -> cash.handover(fx.thu07.getId(), 50_000, null, null, fx.actor(fx.dv01Manager)),
                () -> post("/api/collection/cash/handovers", fx.bearer(fx.dv01Manager),
                        "{\"collectorId\":%d,\"amount\":50000}".formatted(fx.thu07.getId())));

        assertRejected(waited.get(0), "HANDOVER_AMOUNT_INVALID");
        assertThat(jdbc.queryForObject("select sum(amount) from cash_handovers where collector_id = ?", Long.class,
                fx.thu07.getId())).isEqualTo(50_000L);
    }

    @Test
    void writesWaitingForThePeriodLockAreRejectedOnceTheLockCommits() throws Exception {
        remitInFull();

        List<MockHttpServletResponse> waited = whileHeldOpen(
                () -> periodLock.lock(fx.october.getId(), fx.actor(fx.officer)),
                () -> pay(80_000, "during-lock"),
                () -> post("/api/billing/charge-requests", officer,
                        "{\"periodId\":%d,\"feeTypeId\":%d,\"scopeType\":\"ALL\",\"dueDate\":\"2026-10-25\"}"
                                .formatted(fx.october.getId(), extra.getId())));

        assertRejected(waited.get(0), "PERIOD_LOCKED");
        assertRejected(waited.get(1), "PERIOD_LOCKED");
        assertThat(periodStatus()).isEqualTo("LOCKED");
        assertThat(jdbc.queryForObject("select count(*) from payments", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from charges", Integer.class)).isEqualTo(6);
    }

    @Test
    void lockWaitsForAnInFlightChargeRequestAndThenSeesItsDebt() throws Exception {
        remitInFull();

        List<MockHttpServletResponse> waited = whileHeldOpen(
                () -> chargeRequests.publish(new IssueCommand(fx.october.getId(), extra.getId(), ChargeScope.ALL, null,
                        null, LocalDate.of(2026, 10, 25), null, null), fx.actor(fx.officer)),
                () -> post("/api/remittance/periods/" + fx.october.getId() + "/lock", officer, "{}"));

        assertRejected(waited.get(0), "PERIOD_HAS_DEBT");
        assertThat(periodStatus()).isEqualTo("COLLECTING");
        assertThat(jdbc.queryForObject("select count(*) from charges", Integer.class)).isEqualTo(12);
    }

    /**
     * Chạy {@code holder} trong một transaction và giữ transaction đó mở (khóa đã lấy, chưa commit); các việc
     * {@code waiters} gửi sau đó phải còn đứng chờ sau 1 giây. Rồi mới commit {@code holder} và trả kết quả các việc chờ.
     */
    @SafeVarargs
    private List<MockHttpServletResponse> whileHeldOpen(Runnable holder,
            Callable<MockHttpServletResponse>... waiters) throws Exception {
        CountDownLatch held = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        try {
            Future<?> first = pool.submit(() -> tx.executeWithoutResult(s -> {
                holder.run();
                held.countDown();
                await(release);
            }));
            assertThat(held.await(30, TimeUnit.SECONDS)).isTrue();

            List<Future<MockHttpServletResponse>> waiting = new ArrayList<>();
            for (Callable<MockHttpServletResponse> waiter : waiters) {
                waiting.add(pool.submit(waiter));
            }
            assertThatThrownBy(() -> waiting.get(0).get(1, TimeUnit.SECONDS)).isInstanceOf(TimeoutException.class);
            assertThat(waiting).noneMatch(Future::isDone);

            release.countDown();
            first.get(30, TimeUnit.SECONDS);
            List<MockHttpServletResponse> responses = new ArrayList<>();
            for (Future<MockHttpServletResponse> f : waiting) {
                responses.add(f.get(30, TimeUnit.SECONDS));
            }
            return responses;
        } finally {
            release.countDown();
        }
    }

    private void remitInFull() {
        tx.executeWithoutResult(s -> {
            receipts.issue(new IssueReceiptCommand(fx.dv01.getId(), fx.october.getId(), 320_000,
                    ReceiptMethod.TRANSFER, null, null, null, null), fx.actor(fx.officer));
            receipts.issue(new IssueReceiptCommand(fx.dv07.getId(), fx.october.getId(), 160_000,
                    ReceiptMethod.TRANSFER, null, null, null, null), fx.actor(fx.officer));
        });
    }

    private MockHttpServletResponse pay(long amount, String requestId) throws Exception {
        return post("/api/collection/payments", collector,
                "{\"chargeId\":%d,\"amount\":%d,\"method\":\"CASH\",\"clientRequestId\":\"%s\"}"
                        .formatted(chargeId, amount, requestId));
    }

    private MockHttpServletResponse post(String path, String token, String body) throws Exception {
        return mvc.perform(MockMvcRequestBuilders.post(path)
                        .header(HttpHeaders.AUTHORIZATION, token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andReturn().getResponse();
    }

    private void assertRejected(MockHttpServletResponse response, String code) throws Exception {
        assertThat(response.getStatus()).isEqualTo(422);
        assertThat(json.readTree(response.getContentAsString()).get("code").asText()).isEqualTo(code);
    }

    private String periodStatus() {
        return jdbc.queryForObject("select status from collection_periods where id = ?", String.class,
                fx.october.getId());
    }

    private static void await(CountDownLatch latch) {
        try {
            latch.await(30, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
