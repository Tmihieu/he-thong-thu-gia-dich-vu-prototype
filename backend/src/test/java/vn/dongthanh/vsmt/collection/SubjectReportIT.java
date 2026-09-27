package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

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

import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/** T53: người đi thu xem lịch sử hộ (thanh toán + lượt ghé theo thời gian) và báo sai thông tin hộ (G7: chỉ thông báo). */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class SubjectReportIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired MutableClock clock;
    @Autowired ServiceSubjectRepository subjects;

    String collector;

    @BeforeEach
    void seed() {
        fx.build();
        collector = fx.bearer(fx.thu07);
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void historyMergesPaymentsAndVisitsInTimeOrder() throws Exception {
        long charge = fx.chargeId("DTH-H000002");
        visit(charge, "ABSENT", null, "v-1");
        at(1);
        pay(charge, 30_000, "p-1");
        at(2);
        visit(charge, "APPOINTMENT", "\"2026-10-05\"", "v-2");
        at(3);
        pay(charge, 50_000, "p-2");

        mvc.perform(get("/api/collection/charges/" + charge + "/history").header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].visit.result").value("ABSENT"))
                .andExpect(jsonPath("$[0].payment").value(nullValue()))
                .andExpect(jsonPath("$[1].payment.amount").value(30_000))
                .andExpect(jsonPath("$[1].visit").value(nullValue()))
                .andExpect(jsonPath("$[2].visit.revisitDate").value("2026-10-05"))
                .andExpect(jsonPath("$[3].payment.amount").value(50_000))
                .andExpect(jsonPath("$[3].payment.code").value("TT-1026-000002"));
    }

    @Test
    void collectorOfAnotherAreaOrCompanyCannotSeeHistory() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        pay(charge, 80_000, "p-1");

        for (User other : new User[] {fx.thu09, fx.thu12}) {
            mvc.perform(get("/api/collection/charges/" + charge + "/history")
                            .header(HttpHeaders.AUTHORIZATION, fx.bearer(other)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("CHARGE_NOT_FOUND"));
        }
    }

    @Test
    void reportNotifiesCommuneAndTheAreaCompanyButNotOtherCompanies() throws Exception {
        long subject = subjectId("DTH-H000001");
        report(collector, fx.chargeId("DTH-H000001"), "MOVED_AWAY", "\"  Cả nhà đã chuyển về quê từ 09/2026  \"")
                .andExpect(status().isNoContent());

        expectReportNotice(fx.officer, "commune.subjects", subject);
        expectReportNotice(fx.dv01Manager, "company.households", subject);
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$.total").value(0));

        Map<String, Object> audit = jdbc.queryForMap("select entity_id, after_data ->> 'type' as type"
                + " from audit_logs where action = 'REPORT_SUBJECT'");
        assertThat(audit).containsEntry("entity_id", "DTH-H000001").containsEntry("type", "MOVED_AWAY");
    }

    @Test
    void subjectMovedToAnotherAreaAfterIssuingIsStillReportableOnItsCharge() throws Exception {
        // Xã sửa tổ của hộ sau khi phát hành: khoản vẫn thuộc KV07 (G3) nên vẫn nằm trong danh sách của thu07.
        subjects.findById(subjectId("DTH-H000001")).orElseThrow().setArea(fx.kv09);

        report(collector, fx.chargeId("DTH-H000001"), "WRONG_INFO", "\"Hộ đã chuyển sang tổ 09\"")
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/notifications").param("kind", "INFO")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].body").value(containsString("(KV07)")));
    }

    @Test
    void chargeOutsideAssignedAreaIs404AndOtherRolesAreForbidden() throws Exception {
        long kv07Charge = fx.chargeId("DTH-H000001");
        report(fx.bearer(fx.thu09), kv07Charge, "WRONG_INFO", "\"Sai số nhà\"")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("CHARGE_NOT_FOUND"));
        report(fx.bearer(fx.thu12), kv07Charge, "WRONG_INFO", "\"Sai số nhà\"")
                .andExpect(status().isNotFound());
        report(fx.bearer(fx.dv01Manager), kv07Charge, "WRONG_INFO", "\"Sai số nhà\"")
                .andExpect(status().isForbidden());
        assertThat(notificationCount()).isZero();
    }

    @Test
    void missingBlankOrTooLongDescriptionIsRejected() throws Exception {
        long charge = fx.chargeId("DTH-H000001");
        report(collector, charge, "WRONG_INFO", "null")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value(containsString("description")));
        report(collector, charge, "WRONG_INFO", "\"   \"").andExpect(status().isBadRequest());
        report(collector, charge, "WRONG_INFO", "\"" + "x".repeat(1001) + "\"").andExpect(status().isBadRequest());
        report(collector, charge, "KHAC", "\"Sai số nhà\"").andExpect(status().isBadRequest());
        assertThat(notificationCount()).isZero();
    }

    private void expectReportNotice(User receiver, String screen, long subjectId) throws Exception {
        mvc.perform(get("/api/notifications").param("kind", "INFO")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(receiver)))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Người đi thu báo hộ DTH-H000001 đã chuyển đi"))
                .andExpect(jsonPath("$.items[0].body").value(containsString("Nội dung: Cả nhà đã chuyển về quê")))
                .andExpect(jsonPath("$.items[0].link.screen").value(screen))
                .andExpect(jsonPath("$.items[0].link.params.subjectId").value(subjectId));
    }

    private void at(int hoursAfterNow) {
        clock.set(FixedClockConfig.NOW.plusSeconds(hoursAfterNow * 3600L));
    }

    private void pay(long chargeId, long amount, String requestId) throws Exception {
        mvc.perform(post("/api/collection/payments").header(HttpHeaders.AUTHORIZATION, collector)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"amount\":%d,\"method\":\"CASH\",\"clientRequestId\":\"%s\"}"
                                .formatted(chargeId, amount, requestId)))
                .andExpect(status().isCreated());
    }

    private void visit(long chargeId, String result, String revisitDateJson, String requestId) throws Exception {
        mvc.perform(post("/api/collection/visits").header(HttpHeaders.AUTHORIZATION, collector)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"chargeId\":%d,\"result\":\"%s\",\"revisitDate\":%s,\"clientRequestId\":\"%s\"}"
                                .formatted(chargeId, result, revisitDateJson, requestId)))
                .andExpect(status().isCreated());
    }

    private ResultActions report(String token, long chargeId, String type, String descriptionJson) throws Exception {
        return mvc.perform(post("/api/collection/subject-reports").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"chargeId\":%d,\"reportType\":\"%s\",\"description\":%s}"
                        .formatted(chargeId, type, descriptionJson)));
    }

    private long subjectId(String code) {
        return jdbc.queryForObject("select id from service_subjects where code = ?", Long.class, code);
    }

    private int notificationCount() {
        return jdbc.queryForObject("select count(*) from notifications", Integer.class);
    }
}
