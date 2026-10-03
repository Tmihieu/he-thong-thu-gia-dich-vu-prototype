package vn.dongthanh.vsmt.leadership;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

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
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;

import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.service.SubjectService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.ContractCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/**
 * T54–T58: lãnh đạo chỉ đọc + duyệt; xóa nợ / hoàn / miễn giảm qua đề nghị; điều chỉnh kỳ đã khóa ghi vào kỳ đang
 * thu (O8–O10, chốt 29/09/2026). Kỳ 10/2026 của fixture: DV01 phải thu 320.000 (4 hộ), DV07 160.000.
 */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class LeadershipIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired MutableClock clock;
    @Autowired UserRepository users;
    @Autowired CollectionPeriodRepository periods;
    @Autowired CompanyReceiptService receipts;
    @Autowired ChargeRequestService chargeRequests;
    @Autowired SubjectService subjects;

    User leader;
    String officer;
    String lead;

    @BeforeEach
    void seed() {
        fx.build();
        leader = users.save(User.create("lanhdao_fx", "Lãnh đạo", Role.LEADER, null, "x"));
        officer = fx.bearer(fx.officer);
        lead = fx.bearer(leader);
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void leaderReadsEverythingButCannotWriteBusinessData() throws Exception {
        mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, lead))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/billing/charges").param("periodId", fx.october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, lead))
                .andExpect(status().isOk());

        send("/api/remittance/periods/" + fx.october.getId() + "/lock", lead, "{}").andExpect(status().isForbidden());
        send("/api/remittance/receipts", lead, "{}").andExpect(status().isForbidden());
        send("/api/masterdata/subjects", lead, "{}").andExpect(status().isForbidden());
        send("/api/leadership/approvals", lead, writeOff(fx.chargeId("DTH-H000001"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/masterdata/subjects/1").header(HttpHeaders.AUTHORIZATION, lead)
                .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/collection/collector-assignments/1").header(HttpHeaders.AUTHORIZATION, lead))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyLeaderDecidesAndAWrittenOffChargeCannotBePaid() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        long id = create(writeOff(charge));
        send("/api/leadership/approvals/" + id + "/approve", fx.bearer(fx.dv01Manager), "{}")
                .andExpect(status().isForbidden());
        approve(id);

        send("/api/collection/payments", fx.bearer(fx.thu07), """
                {"chargeId":%d,"amount":30000,"method":"CASH","clientRequestId":"after-write-off"}"""
                .formatted(charge))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("CHARGE_WRITTEN_OFF"));
    }

    @Test
    void approvedWriteOffLeavesTheCompanyDueAndOnlyLeaderDecides() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        long id = create(writeOff(charge));

        send("/api/leadership/approvals/" + id + "/approve", officer, "{}").andExpect(status().isForbidden());
        send("/api/leadership/approvals/" + id + "/reject", lead, "{\"note\":\"  \"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("APPROVAL_NOTE_REQUIRED"));
        send("/api/leadership/approvals/" + id + "/approve", lead, "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.effectivePeriodCode").value(fx.october.getCode()));
        send("/api/leadership/approvals/" + id + "/approve", lead, "{}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("APPROVAL_ALREADY_DECIDED"));

        assertThat(chargeStatus(charge)).isEqualTo("WRITTEN_OFF");
        ledgerOf(fx.october.getId(), "DV01")
                .andExpect(jsonPath("$[0].due").value(240_000))
                .andExpect(jsonPath("$[0].remaining").value(240_000));
    }

    @Test
    void writeOffNeedsAnUntouchedUnpaidCharge() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        pay(charge, 30_000, "p-1");
        send("/api/leadership/approvals", officer, writeOff(charge))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("WRITE_OFF_NOT_ALLOWED"));
    }

    @Test
    void partialRefundKeepsPaidFullRefundReopensAndCashHeldIsUntouched() throws Exception {
        long charge = fx.chargeId("DTH-H000002");
        pay(charge, 80_000, "p-1");

        send("/api/leadership/approvals", officer, refund(charge, 90_000))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("REFUND_AMOUNT_INVALID"));
        approve(create(refund(charge, 30_000)));
        assertThat(chargeStatus(charge)).isEqualTo("PAID");
        ledgerOf(fx.october.getId(), "DV01")
                .andExpect(jsonPath("$[0].collected").value(50_000))
                .andExpect(jsonPath("$[0].refunded").value(30_000));
        // Khoản trả thêm field refunded để giao diện tính hạn mức hoàn.
        mvc.perform(get("/api/billing/charges").param("periodId", fx.october.getId().toString())
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.items[?(@.id == %d)].refunded".formatted(charge)).value(org.hamcrest.Matchers.contains(30_000)));

        approve(create(refund(charge, 50_000)));
        assertThat(chargeStatus(charge)).isEqualTo("UNPAID");
        mvc.perform(get("/api/collection/cash/held").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$[?(@.collectorUsername == 'thu07_fx')].held").value(80_000));
    }

    @Test
    void writeOffOfALockedPeriodGoesToTheCollectingPeriodAsAdjustment() throws Exception {
        receipts.issue(new IssueReceiptCommand(fx.dv01.getId(), fx.october.getId(), 320_000, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
        receipts.issue(new IssueReceiptCommand(fx.dv07.getId(), fx.october.getId(), 160_000, ReceiptMethod.TRANSFER,
                null, null, null, null), fx.actor(fx.officer));
        send("/api/remittance/periods/" + fx.october.getId() + "/lock", officer, "{}").andExpect(status().isOk());
        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 30), fx.october.getTariffVersion()));

        long paidOctober = fx.chargeId("DTH-H000001");
        jdbc.update("insert into payments (code, charge_id, amount, method, paid_at, collector_id, client_request_id)"
                + " values ('TT-FX-1', ?, 80000, 'CASH', now(), ?, 'fx-oct-1')", paidOctober, fx.thu07.getId());
        jdbc.update("update charges set status = 'PAID', paid_at = now() where id = ?", paidOctober);
        long id = create(writeOff(fx.chargeId("DTH-H000003")));
        send("/api/leadership/approvals/" + id + "/approve", lead, "{}")
                .andExpect(jsonPath("$.effectivePeriodCode").value(november.getCode()));
        approve(create(refund(paidOctober, 20_000)));

        ledgerOf(fx.october.getId(), "DV01")
                .andExpect(jsonPath("$[0].due").value(320_000))
                .andExpect(jsonPath("$[0].collected").value(80_000))
                .andExpect(jsonPath("$[0].remaining").value(0));
        ledgerOf(november.getId(), "DV01")
                .andExpect(jsonPath("$[0].adjustment").value(80_000))
                .andExpect(jsonPath("$[0].refunded").value(20_000))
                .andExpect(jsonPath("$[0].collected").value(-20_000))
                .andExpect(jsonPath("$[0].remaining").value(-80_000))
                // Điều chỉnh tính như đã nộp: 0 + 80.000 − (−20.000).
                .andExpect(jsonPath("$[0].gap").value(100_000));
    }

    @Test
    void exemptingAContractCreatesARequestAndRejectingItReopensOpenPeriodCharges() throws Exception {
        long contract = jdbc.queryForObject("select c.id from service_contracts c join service_subjects s"
                + " on s.id = c.subject_id where s.code = 'DTH-H000004'", Long.class);
        subjects.updateContract(contract, new ContractCommand(TariffGroup.HH_3_PLUS, LocalDate.of(2026, 1, 1), null,
                true, "Hộ nghèo", "QĐ-01", null), fx.actor(fx.officer));
        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 30), fx.october.getTariffVersion()));
        chargeRequests.publish(new IssueCommand(november.getId(), fx.env.getId(), ChargeScope.ALL, null, null,
                LocalDate.of(2026, 11, 25), null, null), fx.actor(fx.officer));
        long novCharge = jdbc.queryForObject("select c.id from charges c join service_subjects s on s.id = c.subject_id"
                + " where s.code = 'DTH-H000004' and c.period_id = ?", Long.class, november.getId());
        assertThat(chargeStatus(novCharge)).isEqualTo("EXEMPT");

        String list = mvc.perform(get("/api/leadership/approvals").param("status", "PENDING")
                        .header(HttpHeaders.AUTHORIZATION, lead))
                .andExpect(jsonPath("$[0].type").value("EXEMPTION"))
                .andExpect(jsonPath("$[0].subjectCode").value("DTH-H000004"))
                .andReturn().getResponse().getContentAsString();
        int id = JsonPath.read(list, "$[0].id");
        send("/api/leadership/approvals/" + id + "/reject", lead, "{\"note\":\"Chưa đủ hồ sơ hộ nghèo\"}")
                .andExpect(status().isOk());

        assertThat(chargeStatus(novCharge)).isEqualTo("UNPAID");
        assertThat(jdbc.queryForObject("select amount from charges where id = ?", Long.class, novCharge))
                .isEqualTo(80_000L);
        assertThat(jdbc.queryForObject("select exempt from service_contracts where id = ?", Boolean.class, contract))
                .isFalse();
        assertThat(jdbc.queryForObject("select count(*) from notifications where title like ?", Long.class,
                "Đề nghị % bị từ chối")).isEqualTo(1L);
    }

    @Test
    void rejectAfterOfficerTurnedExemptionOffStillReopensChargesAndReToggleKeepsOneRequest() throws Exception {
        long contract = jdbc.queryForObject("select c.id from service_contracts c join service_subjects s"
                + " on s.id = c.subject_id where s.code = 'DTH-H000004'", Long.class);
        exempt(contract, true);
        CollectionPeriod november = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null,
                LocalDate.of(2026, 11, 30), fx.october.getTariffVersion()));
        chargeRequests.publish(new IssueCommand(november.getId(), fx.env.getId(), ChargeScope.ALL, null, null,
                LocalDate.of(2026, 11, 25), null, null), fx.actor(fx.officer));
        exempt(contract, false);
        exempt(contract, true);
        exempt(contract, false);
        assertThat(jdbc.queryForObject("select count(*) from approval_requests", Long.class)).isEqualTo(1L);
        long id = jdbc.queryForObject("select id from approval_requests", Long.class);

        send("/api/leadership/approvals/" + id + "/approve", lead, "{}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("EXEMPTION_ALREADY_REMOVED"));
        send("/api/leadership/approvals/" + id + "/reject", lead, "{\"note\":\"Xã đã tắt\"}").andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select c.status from charges c join service_subjects s on s.id = c.subject_id"
                + " where s.code = 'DTH-H000004' and c.period_id = ?", String.class, november.getId())).isEqualTo("UNPAID");
    }

    private void exempt(long contractId, boolean on) {
        subjects.updateContract(contractId, new ContractCommand(TariffGroup.HH_3_PLUS, LocalDate.of(2026, 1, 1), null,
                on, on ? "Hộ nghèo" : null, null, null), fx.actor(fx.officer));
    }

    private String writeOff(long chargeId) {
        return """
                {"type":"WRITE_OFF","chargeId":%d,"reason":"Hộ chuyển đi, không liên lạc được"}""".formatted(chargeId);
    }

    private String refund(long chargeId, long amount) {
        return """
                {"type":"REFUND","chargeId":%d,"amount":%d,"reason":"Thu nhầm hộ"}""".formatted(chargeId, amount);
    }

    private long create(String body) throws Exception {
        String json = send("/api/leadership/approvals", officer, body)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(json, "$.id")).longValue();
    }

    private void approve(long id) throws Exception {
        send("/api/leadership/approvals/" + id + "/approve", lead, "{}").andExpect(status().isOk());
    }

    private void pay(long chargeId, long amount, String requestId) throws Exception {
        send("/api/collection/payments", fx.bearer(fx.thu07), """
                {"chargeId":%d,"amount":%d,"method":"CASH","clientRequestId":"%s"}"""
                .formatted(chargeId, amount, requestId)).andExpect(status().isCreated());
    }

    private String chargeStatus(long chargeId) {
        return jdbc.queryForObject("select status from charges where id = ?", String.class, chargeId);
    }

    private ResultActions ledgerOf(long periodId, String companyCode) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", String.valueOf(periodId))
                        .header(HttpHeaders.AUTHORIZATION, lead))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].companyCode").value(companyCode));
    }

    private ResultActions send(String path, String token, String body) throws Exception {
        return mvc.perform(post(path).header(HttpHeaders.AUTHORIZATION, token).contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }
}
