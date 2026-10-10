package vn.dongthanh.vsmt.remittance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
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
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.remittance.service.CompanyReminderAutoService;
import vn.dongthanh.vsmt.remittance.service.CompanyReminderAutoService.Rule;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CompanyReminderAutoIT extends IntegrationTest {

    @Autowired CompanyReminderAutoService reminders;
    @Autowired CompanyLedgerService ledger;
    @Autowired CompanyReceiptService receipts;
    @Autowired CollectionFixture fixture;
    @Autowired MutableClock clock;
    @Autowired JdbcTemplate jdbc;
    @Autowired MockMvc mvc;
    @Autowired PeriodAutoService periodAuto;
    @Autowired PeriodPublishService periodPublish;

    @BeforeEach
    void seed() {
        fixture.build();
        reminders.update(new Rule(true, 3, 3), fixture.actor(fixture.admin));
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void companiesMustPayBeforeHouseholdsAndRemindersStopWhenPaid() {
        var row = ledger.row(fixture.dv01.getId(), fixture.october.getId());
        assertThat(row.collected()).isZero();
        assertThat(row.payable()).isEqualTo(320_000);
        assertThat(reminders.runNow(fixture.actor(fixture.admin))).isZero();
        clock.set(Instant.parse("2026-10-28T02:00:00Z"));
        assertThat(reminders.preview(fixture.actor(fixture.admin))).hasSize(2);
        assertThat(reminders.runNow(fixture.actor(fixture.admin))).isEqualTo(2);
        assertThat(reminders.runScheduled()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from company_reminder_deliveries", Integer.class)).isEqualTo(2);
        receipts.issue(new IssueReceiptCommand(fixture.dv01.getId(), fixture.october.getId(), 320_000,
                ReceiptMethod.CASH, null, null, null, null), fixture.actor(fixture.officer));
        assertThat(ledger.row(fixture.dv01.getId(), fixture.october.getId()).settled()).isTrue();
        fixture.collectAllCash();
        assertThat(ledger.row(fixture.dv01.getId(), fixture.october.getId()).payable()).isEqualTo(320_000);
        clock.set(Instant.parse("2026-11-01T02:00:00Z"));
        assertThat(reminders.preview(fixture.actor(fixture.admin))).singleElement()
                .satisfies(target -> assertThat(target.companyId()).isEqualTo(fixture.dv07.getId()));
        assertThat(reminders.runScheduled()).isEqualTo(1);
        assertThat(ledger.overdueDebtsOf(fixture.dv07.getId())).singleElement()
                .satisfies(debt -> assertThat(debt.remaining()).isEqualTo(160_000));
        clock.set(Instant.parse("2026-11-02T02:00:00Z"));
        assertThat(reminders.runScheduled()).isZero();
        clock.set(Instant.parse("2026-11-04T02:00:00Z"));
        assertThat(reminders.runScheduled()).isEqualTo(1);
        reminders.update(new Rule(false, 3, 3), fixture.actor(fixture.admin));
        assertThat(reminders.preview(fixture.actor(fixture.admin))).isEmpty();
    }

    @Test
    void tariffSplitAndWriteOffAdjustOnlyTransportAndProcessing() {
        jdbc.update("update tariff_rates set collection_fee = 40000, transport_fee = 25000, processing_fee = 15000"
                + " where tariff_version_id = ?", fixture.october.getTariffVersion().getId());
        var row = ledger.row(fixture.dv01.getId(), fixture.october.getId());
        assertThat(row.payable()).isEqualTo(160_000);
        assertThat(row.payableTransport()).isEqualTo(100_000);
        assertThat(row.payableProcessing()).isEqualTo(60_000);
        jdbc.update("update charges set status = 'WRITTEN_OFF', written_off_period_id = period_id where id = ?",
                fixture.chargeId("DTH-H000001"));
        assertThat(ledger.row(fixture.dv01.getId(), fixture.october.getId()).payable()).isEqualTo(120_000);
        clock.set(Instant.parse("2026-11-01T02:00:00Z"));
        assertThat(ledger.overdueDebtsOf(fixture.dv01.getId())).singleElement()
                .satisfies(debt -> assertThat(debt.remaining()).isEqualTo(120_000));
    }

    @Test
    void onlyAdminCanConfigureAndInvalidDaysAreRejected() throws Exception {
        mvc.perform(get("/api/remittance/reminder-rule")
                .header(HttpHeaders.AUTHORIZATION, fixture.bearer(fixture.dv01Manager)))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/remittance/reminder-rule")
                .header(HttpHeaders.AUTHORIZATION, fixture.bearer(fixture.officer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":true,\"daysBeforeDue\":3,\"repeatEveryDays\":3}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/remittance/reminder-rule")
                .header(HttpHeaders.AUTHORIZATION, fixture.bearer(fixture.admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":true,\"daysBeforeDue\":-1,\"repeatEveryDays\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void dueDayAndRepeatBoundaries() {
        LocalDate due = LocalDate.of(2026, 10, 31);
        Rule rule = new Rule(true, 3, 3);
        assertThat(CompanyReminderAutoService.eligible(due.minusDays(4), due, null, rule)).isFalse();
        assertThat(CompanyReminderAutoService.eligible(due.minusDays(3), due, null, rule)).isTrue();
        assertThat(CompanyReminderAutoService.eligible(due, due, due.minusDays(3), rule)).isFalse();
        assertThat(CompanyReminderAutoService.eligible(due.plusDays(1), due, due.minusDays(3), rule)).isTrue();
        assertThat(CompanyReminderAutoService.eligible(due.plusDays(1), due, due.plusDays(1), rule)).isFalse();
    }

    @Test
    void adminCreatesDraftPreviewsEveryChargeAndPublishesOnlyOnConfirmation() {
        var admin = fixture.actor(fixture.admin);
        var draft = periodAuto.createDraft(PeriodType.MONTH, 2026, 11, admin);
        long original = jdbc.queryForObject("select count(*) from charges", Long.class);
        var preview = periodPublish.preview(draft.getId(), null, null, null, admin);
        assertThat(preview.result().chargeCount()).isEqualTo(6);
        assertThat(preview.result().plannedCharges()).hasSize(6);
        assertThat(preview.result().totalAmount()).isEqualTo(480_000);
        assertThat(jdbc.queryForObject("select count(*) from charges", Long.class)).isEqualTo(original);
        var published = periodPublish.publish(draft.getId(), null, null, null, null, admin);
        assertThat(published.result().chargeCount()).isEqualTo(6);
        assertThat(jdbc.queryForObject("select count(*) from charges", Long.class)).isEqualTo(original + 6);
        assertThat(ledger.row(fixture.dv01.getId(), draft.getId()).payable()).isEqualTo(320_000);
    }
}
