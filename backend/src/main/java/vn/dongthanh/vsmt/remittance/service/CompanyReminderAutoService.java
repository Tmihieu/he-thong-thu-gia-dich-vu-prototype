package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

@Service
@RequiredArgsConstructor
@Transactional
public class CompanyReminderAutoService {

    private final JdbcTemplate jdbc;
    private final CollectionPeriodRepository periods;
    private final CompanyLedgerService ledger;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record Rule(boolean enabled, int daysBeforeDue, int repeatEveryDays) {
    }

    public record Target(Long companyId, String companyCode, String companyName, Long periodId,
            String periodLabel, LocalDate dueDate, long remaining, boolean overdue) {
    }

    @Transactional(readOnly = true)
    public Rule rule(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return loadRule(false);
    }

    public Rule update(Rule rule, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        if (rule.daysBeforeDue() < 0 || rule.daysBeforeDue() > 365
                || rule.repeatEveryDays() < 1 || rule.repeatEveryDays() > 365) {
            throw new IllegalArgumentException("Số ngày nhắc trước phải từ 0–365; nhắc lại từ 1–365 ngày.");
        }
        Rule before = loadRule(true);
        jdbc.update("update company_reminder_rule set enabled = ?, days_before_due = ?, repeat_every_days = ? where id = 1",
                rule.enabled(), rule.daysBeforeDue(), rule.repeatEveryDays());
        audit.record(actor, "UPDATE_COMPANY_REMINDER_RULE", "CompanyReminderRule", "1", before, rule);
        return rule;
    }

    @Transactional(readOnly = true)
    public List<Target> preview(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return targets(loadRule(false), LocalDate.now(clock));
    }

    public int runNow(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return sendDue(actor);
    }

    public int runScheduled() {
        return sendDue(null);
    }

    private int sendDue(CurrentUser actor) {
        Rule rule = loadRule(true);
        LocalDate today = LocalDate.now(clock);
        List<Target> targets = targets(rule, today);
        int sent = 0;
        for (Target target : targets) {
            int inserted = jdbc.update("insert into company_reminder_deliveries (company_id, period_id, sent_on, amount)"
                    + " values (?, ?, ?, ?) on conflict do nothing",
                    target.companyId(), target.periodId(), today, target.remaining());
            if (inserted == 0) {
                continue;
            }
            String body = "Kính gửi " + target.companyName() + ", công ty còn phải nộp về xã "
                    + Money.format(target.remaining()) + " phần vận chuyển và xử lý của " + target.periodLabel()
                    + " (theo các khoản đã phát hành, đã trừ số đã nộp). Công ty phải nộp trước dù chưa thu từ hộ. Hạn nộp: "
                    + target.dueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy"))
                    + (target.overdue() ? ". Khoản nộp đã quá hạn, đề nghị công ty nộp ngay."
                            : ". Đề nghị công ty nộp đủ trước hạn.");
            notifications.publish(NotificationCommand.toCompany(target.companyId(), Role.COMPANY_MANAGER,
                    NotificationKind.REMINDER, (target.overdue() ? "Quá hạn nộp xã · " : "Nhắc nộp xã · ")
                            + target.periodLabel(), body, Map.of("screen", "company.receipts")),
                    actor == null ? null : actor.id());
            sent++;
        }
        Map<String, Object> result = Map.of("sent", sent, "date", today);
        if (actor == null) {
            if (sent > 0) {
                audit.recordSystem("RUN_COMPANY_REMINDERS", "CompanyReminderRule", "1", null, result);
            }
        } else {
            audit.record(actor, "RUN_COMPANY_REMINDERS", "CompanyReminderRule", "1", null, result);
        }
        return sent;
    }

    private List<Target> targets(Rule rule, LocalDate today) {
        if (!rule.enabled()) {
            return List.of();
        }
        List<Target> targets = new ArrayList<>();
        for (var period : periods.findByStatusOrderByStartDateDesc(PeriodStatus.COLLECTING)) {
            if (today.isBefore(period.getDueDate().minusDays(rule.daysBeforeDue()))) {
                continue;
            }
            for (var row : ledger.companiesWithDebt(period.getId())) {
                LocalDate lastSent = jdbc.queryForObject(
                        "select max(sent_on) from company_reminder_deliveries where company_id = ? and period_id = ?",
                        (result, rowNumber) -> result.getObject(1, LocalDate.class), row.companyId(), period.getId());
                if (eligible(today, period.getDueDate(), lastSent, rule)) {
                    targets.add(new Target(row.companyId(), row.companyCode(), row.companyName(), period.getId(),
                            period.getLabel(), period.getDueDate(), row.remaining(), row.overdue()));
                }
            }
        }
        return targets;
    }

    public static boolean eligible(LocalDate today, LocalDate dueDate, LocalDate lastSent, Rule rule) {
        if (!rule.enabled() || today.isBefore(dueDate.minusDays(rule.daysBeforeDue()))) {
            return false;
        }
        if (lastSent == null) {
            return true;
        }
        return today.isAfter(dueDate) && !today.isBefore(lastSent.plusDays(rule.repeatEveryDays()));
    }

    private Rule loadRule(boolean lock) {
        return jdbc.queryForObject("select enabled, days_before_due, repeat_every_days from company_reminder_rule"
                + " where id = 1" + (lock ? " for update" : ""),
                (result, rowNumber) -> new Rule(result.getBoolean(1), result.getInt(2), result.getInt(3)));
    }
}
