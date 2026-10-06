package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import vn.dongthanh.vsmt.collection.service.BankTransferService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/** Webhook SePay: đúng mã + đúng số tiền + đúng tài khoản của xã thì tự ghi đã thu; còn lại vào chờ đối chiếu. */
@TestPropertySource(properties = "vsmt.sepay.webhook-api-key=khoa-thu")
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class SepayWebhookIT extends IntegrationTest {

    static final String ACCOUNT = "0071000888888";

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired JdbcTemplate jdbc;

    long chargeId;
    long amount;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        fx.build();
        saveAccount();
        chargeId = jdbc.queryForObject("select id from charges where company_id = ? order by id limit 1", Long.class,
                fx.dv01.getId());
        amount = jdbc.queryForObject("select amount from charges where id = ?", Long.class, chargeId);
    }

    /** Test này không bọc transaction (webhook tự commit từng bước) nên phải dọn, kẻo IT sau trùng dữ liệu fixture. */
    @AfterEach
    void clean() {
        cleaner.truncateAll();
    }

    @Test
    void matchingTransferMarksChargePaidOnceEvenWhenSepayRetries() throws Exception {
        String body = tx(101, ACCOUNT, "NGUYEN VAN A chuyen tien " + BankTransferService.codeOf(chargeId), amount);

        send(body, "Apikey khoa-thu").andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        send(body, "Apikey khoa-thu").andExpect(status().isOk());

        assertThat(jdbc.queryForObject("select status from charges where id = ?", String.class, chargeId)).isEqualTo("PAID");
        assertThat(jdbc.queryForList("select method || ':' || amount from payments where charge_id = ?", String.class, chargeId))
                .containsExactly("TRANSFER:" + amount);
        assertThat(jdbc.queryForObject("select status from bank_transfers where sepay_id = 101", String.class))
                .isEqualTo("MATCHED");
    }

    @Test
    void wrongAmountMissingCodeAndWrongAccountAreParkedWithoutTouchingTheCharge() throws Exception {
        String code = BankTransferService.codeOf(chargeId);
        send(tx(201, ACCOUNT, code, amount - 1000), "Apikey khoa-thu").andExpect(status().isOk());
        send(tx(202, ACCOUNT, "chuyen tien rac", amount), "Apikey khoa-thu").andExpect(status().isOk());
        send(tx(203, "999999", code, amount), "Apikey khoa-thu").andExpect(status().isOk());

        assertThat(jdbc.queryForObject("select status from charges where id = ?", String.class, chargeId)).isEqualTo("UNPAID");
        assertThat(jdbc.queryForObject("select count(*) from payments where charge_id = ?", Long.class, chargeId)).isZero();
        assertThat(jdbc.queryForList("select reason from bank_transfers order by sepay_id", String.class))
                .containsExactly("AMOUNT_MISMATCH", "NO_CODE", "WRONG_ACCOUNT");

        // Chỉ cán bộ xã xem được giao dịch chờ đối chiếu; công ty bị chặn.
        mvc.perform(get("/api/collection/bank-transfers/unmatched").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(3));
        mvc.perform(get("/api/collection/bank-transfers/unmatched").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.dv01Manager)))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsMissingOrWrongKeyAndIgnoresOutgoingMoney() throws Exception {
        String body = tx(301, ACCOUNT, BankTransferService.codeOf(chargeId), amount);
        send(body, null).andExpect(status().isUnauthorized());
        send(body, "Apikey sai").andExpect(status().isUnauthorized());
        send(body.replace("\"in\"", "\"out\""), "Apikey khoa-thu").andExpect(status().isOk());

        assertThat(jdbc.queryForObject("select count(*) from bank_transfers", Long.class)).isZero();
        assertThat(jdbc.queryForObject("select status from charges where id = ?", String.class, chargeId)).isEqualTo("UNPAID");
    }

    @Test
    void collectorGetsTransferInfoForQr() throws Exception {
        long kv07Charge = jdbc.queryForObject("select id from charges where area_id = ? order by id limit 1", Long.class,
                fx.kv07.getId());
        mvc.perform(get("/api/collection/charges/" + kv07Charge + "/transfer-info")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu07)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bankAccount").value(ACCOUNT))
                .andExpect(jsonPath("$.code").value(BankTransferService.codeOf(kv07Charge)));
    }

    @Test
    void transferInfoIsConflictUntilAdminDeclaresCommuneAccount() throws Exception {
        jdbc.update("delete from commune_bank_account");
        mvc.perform(get("/api/collection/charges/" + chargeId + "/transfer-info")
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu07)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COMMUNE_BANK_ACCOUNT_MISSING"));
        // Chưa khai tài khoản thì giao dịch không tự khớp.
        send(tx(401, ACCOUNT, BankTransferService.codeOf(chargeId), amount), "Apikey khoa-thu").andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select reason from bank_transfers where sepay_id = 401", String.class))
                .isEqualTo("WRONG_ACCOUNT");

        String body = "{\"bankName\":\"MBBank\",\"accountNumber\":\"0 3 3\",\"accountHolder\":\"UBND XA\"}";
        mvc.perform(put("/api/masterdata/commune-bank-account").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.officer)))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/masterdata/commune-bank-account").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.accountNumber").value("033"));
        mvc.perform(get("/api/masterdata/commune-bank-account").header(HttpHeaders.AUTHORIZATION, fx.bearer(fx.thu07)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.bankName").value("MBBank"));
    }

    private void saveAccount() {
        jdbc.update("insert into commune_bank_account (bank_name, account_number, account_holder) values ('Vietcombank', ?, 'UBND XA')",
                ACCOUNT);
    }

    private static String tx(long id, String account, String content, long amount) {
        return """
                {"id":%d,"gateway":"Vietcombank","transactionDate":"2026-10-04 16:30:00","accountNumber":"%s","code":null,
                 "content":"%s","transferType":"in","transferAmount":%d,"accumulated":0,"subAccount":null,
                 "referenceCode":"FT%d","description":""}""".formatted(id, account, content, amount, id);
    }

    private ResultActions send(String body, String authorization) throws Exception {
        var req = post("/api/payments/sepay/webhook").contentType(MediaType.APPLICATION_JSON).content(body);
        if (authorization != null) {
            req.header(HttpHeaders.AUTHORIZATION, authorization);
        }
        return mvc.perform(req);
    }
}
