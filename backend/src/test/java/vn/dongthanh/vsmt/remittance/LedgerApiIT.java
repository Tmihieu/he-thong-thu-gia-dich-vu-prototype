package vn.dongthanh.vsmt.remittance;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService.AssignCommand;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class LedgerApiIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;
    @Autowired AreaAssignmentService areaAssignments;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

    @BeforeEach
    void seed() {
        fx.build();
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "p-1", null,
                null, null), fx.actor(fx.thu07));
    }

    @Test
    void communeSeesEveryCompanyWithAggregatedFigures() throws Exception {
        ledger(fx.officer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].companyCode", contains("DV01", "DV07")))
                .andExpect(jsonPath("$[0].due").value(320_000))
                .andExpect(jsonPath("$[0].chargeCount").value(4))
                .andExpect(jsonPath("$[0].collected").value(80_000))
                .andExpect(jsonPath("$[0].cashCollected").value(80_000))
                // Phải nộp xã tính trên số ĐÃ THU (tiền mặt 80.000, biểu giá thu gom 0), không phải phải thu 320.000.
                .andExpect(jsonPath("$[0].payable").value(80_000))
                .andExpect(jsonPath("$[0].received").value(0))
                .andExpect(jsonPath("$[0].remaining").value(80_000))
                .andExpect(jsonPath("$[0].gap").value(-80_000))
                .andExpect(jsonPath("$[0].collectionRate").value(25.0))
                .andExpect(jsonPath("$[0].lowCollectionRate").value(true))
                .andExpect(jsonPath("$[0].remittedRate").value(0.0))
                .andExpect(jsonPath("$[0].lowRemittedRate").value(true))
                .andExpect(jsonPath("$[0].progress").value("NOT_PAID"))
                .andExpect(jsonPath("$[0].reconciliation").value("PENDING"))
                .andExpect(jsonPath("$[1].due").value(160_000))
                .andExpect(jsonPath("$[1].payable").value(0));
        ledger(fx.admin).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void companyKeepsTheCollectionPartAndRemitsOnlyTheTransportPart() throws Exception {
        // Công ty cầm lại phần thu gom của số ĐÃ THU, chỉ nộp phần vận chuyển. Biểu giá 57.000 thu gom + 23.000 vận chuyển.
        jdbc.update("update tariff_rates set collection_fee = 57000, transport_fee = 23000 where tariff_group = 'HH_3_PLUS'");

        ledger(fx.officer)
                .andExpect(jsonPath("$[0].due").value(320_000))
                .andExpect(jsonPath("$[0].retained").value(57_000))
                .andExpect(jsonPath("$[0].payable").value(23_000))
                .andExpect(jsonPath("$[0].remaining").value(23_000))
                // Đã thu 80.000 (thu gom 57.000, vận chuyển 23.000), chưa nộp: thiếu 23.000.
                .andExpect(jsonPath("$[0].gap").value(-23_000))
                .andExpect(jsonPath("$[1].retained").value(0))
                .andExpect(jsonPath("$[1].payable").value(0));
    }

    @Test
    void retainedAlsoCoversBankTransfersAndPayableCanBeNegative() throws Exception {
        // Hộ DTH-H000003 (DV01) chuyển khoản 80.000 vào tài khoản xã: công ty không giữ tiền mặt nhưng vẫn được hưởng phí
        // thu gom 57.000 của khoản đó. DV01: đã thu 160.000 (tiền mặt 80.000 + chuyển khoản 80.000), phí thu gom 114.000
        // trên cả 160.000, phải nộp xã = 80.000 - 114.000 = -34.000: xã trả lại công ty 34.000, không cắt về 0.
        jdbc.update("update tariff_rates set collection_fee = 57000, transport_fee = 23000 where tariff_group = 'HH_3_PLUS'");
        collection.recordBankTransfer(fx.chargeId("DTH-H000003"), 80_000, "FT001", "sepay-1");

        ledger(fx.officer)
                .andExpect(jsonPath("$[0].collected").value(160_000))
                .andExpect(jsonPath("$[0].cashCollected").value(80_000))
                .andExpect(jsonPath("$[0].retained").value(114_000))
                .andExpect(jsonPath("$[0].payable").value(-34_000))
                .andExpect(jsonPath("$[0].remaining").value(-34_000))
                .andExpect(jsonPath("$[0].gap").value(34_000))
                .andExpect(jsonPath("$[0].progress").value("PAID_IN_FULL"))
                .andExpect(jsonPath("$[0].reconciliation").value("MATCHED"));
        // Còn phải nộp âm thì không lập được phiếu thu nộp thêm.
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/remittance/receipts")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"companyId\":%d,\"periodId\":%d,\"amount\":1000,\"method\":\"CASH\"}"
                                .formatted(fx.dv01.getId(), fx.october.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RECEIPT_AMOUNT_OUT_OF_RANGE"))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("xã trả lại công ty 34.000 đ")));
    }

    @Test
    void exemptChargesAreOutOfTheHouseholdCountDenominator() throws Exception {
        // DV01 có 4 khoản; một khoản miễn giảm thì chỉ còn 3 khoản cần thu, vẫn đếm 1 hộ miễn.
        jdbc.update("update charges set status = 'EXEMPT', amount = 0 where id = (select min(id) from charges"
                + " where company_id = ? and id <> ?)", fx.dv01.getId(), fx.chargeId("DTH-H000001"));

        ledger(fx.officer).andExpect(jsonPath("$[0].chargeCount").value(3));
        mvc.perform(get("/api/remittance/area-progress").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                // DV01 có thể trải nhiều tổ: kiểm tổng trên mọi dòng thay vì giả định một dòng.
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].exemptCount",
                        org.hamcrest.Matchers.hasItem(1)));
    }

    @Test
    void companySeesOnlyItsOwnRowAndCollectorIsDenied() throws Exception {
        ledger(fx.dv07Manager)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].companyCode").value("DV07"))
                .andExpect(jsonPath("$[0].due").value(160_000));
        ledger(fx.thu07).andExpect(status().isForbidden());
    }

    @Test
    void movingAnAreaToAnotherCompanyAfterIssueKeepsThePeriodOnTheOldCompany() throws Exception {
        areaAssignments.assign(new AssignCommand(List.of(fx.kv12.getId()), fx.dv01.getId(), LocalDate.of(2026, 11, 1),
                null, null), fx.actor(fx.officer));

        ledger(fx.officer)
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].due").value(contains(160_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].due").value(contains(320_000)));
    }

    private ResultActions ledger(User user) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }
}
