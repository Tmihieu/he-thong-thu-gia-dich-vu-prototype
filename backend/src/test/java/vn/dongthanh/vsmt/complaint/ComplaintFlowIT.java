package vn.dongthanh.vsmt.complaint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** T36: xã tạo → chuyển DV01 → DV01 phản hồi → xã đóng; mỗi bước có thông báo; công ty khác không thấy (G12). */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class ComplaintFlowIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;

    long id;

    @BeforeEach
    void seed() throws Exception {
        fx.build();
        long subjectId = jdbc.queryForObject("select id from service_subjects where code = 'DTH-H000001'", Long.class);
        String body = call(fx.officer, post("/api/complaints"), """
                {"complainantName": "Nguyễn Văn Mẫu", "complainantPhone": "0900000128", "subjectId": %d,
                 "channel": "PHONE", "category": "LATE_COLLECTION", "summary": "Tổ 7 chưa được thu gom 2 ngày",
                 "content": "Rác để trước nhà 2 ngày chưa ai lấy."}""".formatted(subjectId))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.complaint.code").value("KN-1026-001"))
                .andExpect(jsonPath("$.complaint.areaCode").value("KV07"))
                .andExpect(jsonPath("$.complaint.status").value("NEW"))
                .andExpect(jsonPath("$.events[0].eventType").value("RECEIVED"))
                .andReturn().getResponse().getContentAsString();
        id = Long.parseLong(body.replaceAll("^\\{\"complaint\":\\{\"id\":(\\d+).*", "$1"));
    }

    @Test
    void fullFlowAppendsTimelineAndNotifiesEachSide() throws Exception {
        notifications(fx.officer).andExpect(jsonPath("$.items[0].title").value("Khiếu nại mới KN-1026-001 · Nguyễn Văn Mẫu"));
        // G12: chưa chuyển thì công ty phụ trách khu vực cũng chưa thấy.
        call(fx.dv01Manager, get("/api/complaints"), null).andExpect(jsonPath("$").isEmpty());
        notifications(fx.dv01Manager).andExpect(jsonPath("$.items[?(@.kind == 'COMPLAINT')]").isEmpty());

        call(fx.officer, post("/api/complaints/{id}/forward", id), "{}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.complaint.status").value("PROCESSING"))
                .andExpect(jsonPath("$.complaint.forwardedCompanyCode").value("DV01"))
                .andExpect(jsonPath("$.complaint.deadline").value("2026-10-04"))
                .andExpect(jsonPath("$.complaint.overdue").value(false));
        notifications(fx.dv01Manager).andExpect(jsonPath("$.items[0].title").value("Xã chuyển khiếu nại KN-1026-001 · hạn 04/10/2026"));
        call(fx.dv01Manager, get("/api/complaints"), null).andExpect(jsonPath("$[0].code").value("KN-1026-001"));

        call(fx.dv01Manager, post("/api/complaints/{id}/reply", id), "{\"content\": \"Đã bổ sung chuyến thu gom trong ngày\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.complaint.status").value("PROCESSING"))
                .andExpect(jsonPath("$.events[2].actorLabel").value("Công ty Một"));
        notifications(fx.officer).andExpect(jsonPath("$.items[0].title").value("DV01 phản hồi khiếu nại KN-1026-001"));

        call(fx.officer, post("/api/complaints/{id}/close", id), "{\"resolution\": \"\"}").andExpect(status().isBadRequest());
        call(fx.officer, post("/api/complaints/{id}/close", id), "{\"resolution\": \"Đã bổ sung chuyến thu gom\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.complaint.status").value("RESOLVED"))
                .andExpect(jsonPath("$.events.length()").value(4))
                .andExpect(jsonPath("$.events[0].content").value("Xã tiếp nhận qua điện thoại"))
                .andExpect(jsonPath("$.events[3].eventType").value("CLOSED"));
        notifications(fx.dv01Manager).andExpect(jsonPath("$.items[0].title").value("Xã đã đóng khiếu nại KN-1026-001"));

        call(fx.dv01Manager, post("/api/complaints/{id}/reply", id), "{\"content\": \"Muộn\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("COMPLAINT_CLOSED"));
    }

    @Test
    void anotherCompanyCannotSeeOrReplyEvenAfterForwarding() throws Exception {
        call(fx.officer, post("/api/complaints/{id}/forward", id), "{}").andExpect(status().isOk());

        call(fx.dv07Manager, get("/api/complaints"), null).andExpect(jsonPath("$").isEmpty());
        call(fx.dv07Manager, get("/api/complaints/{id}", id), null).andExpect(status().isNotFound());
        call(fx.dv07Manager, post("/api/complaints/{id}/reply", id), "{\"content\": \"x\"}").andExpect(status().isNotFound());
        call(fx.dv01Manager, post("/api/complaints/{id}/forward", id), "{}").andExpect(status().isForbidden());
        call(fx.thu07, get("/api/complaints"), null).andExpect(status().isForbidden());
    }

    @Test
    void timelineRowsCannotBeUpdatedOrDeleted() {
        assertThatThrownBy(() -> jdbc.update("update complaint_events set content = 'sửa' where complaint_id = ?", id))
                .hasMessageContaining("chỉ được thêm");
    }

    @Test
    void invalidInputIs400AndAppChannelIs422() throws Exception {
        call(fx.officer, post("/api/complaints"), """
                {"complainantName": "", "complainantPhone": "123", "channel": "PHONE", "category": "OTHER",
                 "summary": "x", "content": "y", "areaId": %d}""".formatted(fx.kv07.getId()))
                .andExpect(status().isBadRequest());
        call(fx.officer, post("/api/complaints"), """
                {"complainantName": "A", "channel": "APP", "category": "OTHER", "summary": "x", "content": "y",
                 "areaId": %d}""".formatted(fx.kv07.getId()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("COMPLAINT_CHANNEL_INVALID"));
        assertThat(jdbc.queryForObject("select count(*) from complaints", Integer.class)).isEqualTo(1);
    }

    private ResultActions notifications(User user) throws Exception {
        return call(user, get("/api/notifications"), null);
    }

    private ResultActions call(User user,
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, fx.bearer(user));
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }
}
