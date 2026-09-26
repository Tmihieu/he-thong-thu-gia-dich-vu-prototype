package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** SPEC §9.6: tiến độ (theo tổ), đối soát (sổ phía xã) và dòng công ty (sổ phía công ty) cùng một con số. */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class LedgerConsistencyIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;
    @Autowired CompanyReceiptService receipts;

    @BeforeEach
    void seed() {
        fx.build();
        pay("DTH-H000001", fx.thu07, "p-1");
        pay("DTH-H000003", fx.thu09, "p-2");
        pay("DTH-H000005", fx.thu12, "p-3");
        receipts.issue(new IssueReceiptCommand(fx.dv01.getId(), fx.october.getId(), 100_000, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
    }

    @Test
    void progressReconciliationAndCompanyViewAgree() throws Exception {
        List<Map<String, Object>> areaRows = read("/api/remittance/area-progress", fx.officer);
        List<Map<String, Object>> ledgerRows = read("/api/remittance/ledger", fx.officer);

        Map<Object, Long> dueFromAreas = areaRows.stream().filter(r -> r.get("companyCode") != null)
                .collect(Collectors.groupingBy(r -> r.get("companyCode"), Collectors.summingLong(r -> num(r, "due"))));
        Map<Object, Long> collectedFromAreas = areaRows.stream().filter(r -> r.get("companyCode") != null)
                .collect(Collectors.groupingBy(r -> r.get("companyCode"), Collectors.summingLong(r -> num(r, "collected"))));

        for (Map<String, Object> row : ledgerRows) {
            Object code = row.get("companyCode");
            assertThat(num(row, "due")).as("phải thu %s", code).isEqualTo(dueFromAreas.get(code));
            assertThat(num(row, "collected")).as("đã thu %s", code).isEqualTo(collectedFromAreas.get(code));

            User manager = "DV01".equals(code) ? fx.dv01Manager : fx.dv07Manager;
            Map<String, Object> companyView = read("/api/remittance/ledger", manager).get(0);
            assertThat(companyView).as("dòng công ty %s", code).isEqualTo(row);
        }
        Map<String, Object> dv01 = ledgerRows.stream().filter(r -> "DV01".equals(r.get("companyCode"))).findFirst().orElseThrow();
        assertThat(dv01).containsEntry("progress", "PARTIAL").containsEntry("reconciliation", "PENDING");
        assertThat(num(dv01, "received")).isEqualTo(100_000);
    }

    @Test
    void companyAreaProgressIsScopedAndUnassignedAreasAreFlagged() throws Exception {
        List<Map<String, Object>> dv07Rows = read("/api/remittance/area-progress", fx.dv07Manager);
        assertThat(dv07Rows).extracting(r -> r.get("areaCode")).containsExactly("KV12");
        assertThat(read("/api/remittance/area-progress", fx.officer)).extracting(r -> r.get("noCompany")).containsOnly(false);
    }

    private void pay(String subject, User collector, String requestId) {
        collection.recordPayment(new PaymentCommand(fx.chargeId(subject), 80_000, PaymentMethod.CASH, requestId, null,
                null, null), fx.actor(collector));
    }

    private List<Map<String, Object>> read(String path, User user) throws Exception {
        String body = mvc.perform(get(path).param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user))).andReturn().getResponse().getContentAsString();
        return json.readValue(body, new TypeReference<>() {
        });
    }

    private static long num(Map<String, Object> row, String key) {
        return ((Number) row.get(key)).longValue();
    }
}
