package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
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
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** T35: công ty báo sai sót phiếu của mình → xã thấy và xử lý kèm ghi chú (G6) → công ty thấy "Đã xử lý". */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class ReceiptIssueIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired CollectionFixture fx;
    @Autowired CompanyReceiptService receipts;

    CompanyReceipt receipt;

    @BeforeEach
    void seed() {
        fx.build();
        receipt = receipts.issue(new IssueReceiptCommand(fx.dv01.getId(), fx.october.getId(), 200_000,
                ReceiptMethod.TRANSFER, null, null, "UNC-1", null), fx.actor(fx.officer));
    }

    @Test
    void issuingAReceiptNotifiesTheCompany() throws Exception {
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.items[0].kind").value("RECEIPT"))
                .andExpect(jsonPath("$.items[0].title").value("Xã đã lập phiếu thu " + receipt.getCode()));
        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void companyReportsOfficerResolvesAndCompanySeesResult() throws Exception {
        String reported = report(fx.dv01Manager, """
                {"receiptId": %d, "issueType": "WRONG_AMOUNT", "correctAmount": 250000,
                 "description": "Chuyển 250.000 đ, phiếu ghi 200.000 đ"}""".formatted(receipt.getId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.receiptCode").value(receipt.getCode()))
                .andReturn().getResponse().getContentAsString();
        long issueId = Long.parseLong(reported.replaceAll(".*\"id\":(\\d+).*", "$1"));

        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.items[0].kind").value("RECEIPT"))
                .andExpect(jsonPath("$.items[0].title").value("DV01 báo sai sót phiếu thu " + receipt.getCode()));
        mvc.perform(get("/api/remittance/receipt-issues").param("status", "PENDING")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].companyCode").value("DV01"))
                .andExpect(jsonPath("$[0].correctAmount").value(250_000));

        resolve(issueId, "{\"resolutionNote\": \"   \"}").andExpect(status().isBadRequest());
        resolve(issueId, "{\"resolutionNote\": \"Đã kiểm tra sao kê, lập phiếu bổ sung 50.000 đ\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"));
        resolve(issueId, "{\"resolutionNote\": \"Lần hai\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("RECEIPT_ISSUE_ALREADY_RESOLVED"));

        mvc.perform(get("/api/notifications").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$.items[0].title").value("Xã đã xử lý sai sót phiếu thu " + receipt.getCode()));
        mvc.perform(get("/api/remittance/receipt-issues").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(jsonPath("$[0].status").value("RESOLVED"))
                .andExpect(jsonPath("$[0].resolutionNote").value("Đã kiểm tra sao kê, lập phiếu bổ sung 50.000 đ"));
        mvc.perform(get("/api/remittance/receipt-issues").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv07Manager)))
                .andExpect(jsonPath("$").isEmpty());

        // G6: phiếu không bị sửa.
        assertThat(jdbc.queryForObject("select amount from company_receipts where id = ?", Long.class, receipt.getId()))
                .isEqualTo(200_000L);
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action in"
                + " ('REPORT_RECEIPT_ISSUE', 'RESOLVE_RECEIPT_ISSUE')", Integer.class)).isEqualTo(2);
    }

    @Test
    void anotherCompanyCannotReportOnThisReceipt() throws Exception {
        report(fx.dv07Manager, """
                {"receiptId": %d, "issueType": "NOT_OURS", "description": "Không phải của chúng tôi"}"""
                .formatted(receipt.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RECEIPT_NOT_FOUND"));
    }

    @Test
    void onlyCompanyReportsAndDescriptionIsRequired() throws Exception {
        report(fx.officer, """
                {"receiptId": %d, "issueType": "WRONG_PERIOD", "description": "x"}""".formatted(receipt.getId()))
                .andExpect(status().isForbidden());
        report(fx.dv01Manager, """
                {"receiptId": %d, "issueType": "WRONG_PERIOD", "description": ""}""".formatted(receipt.getId()))
                .andExpect(status().isBadRequest());
    }

    private ResultActions report(User user, String body) throws Exception {
        return mvc.perform(post("/api/remittance/receipt-issues").header(HttpHeaders.AUTHORIZATION, fx.bearer(user))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions resolve(long id, String body) throws Exception {
        return mvc.perform(post("/api/remittance/receipt-issues/{id}/resolve", id)
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }
}
