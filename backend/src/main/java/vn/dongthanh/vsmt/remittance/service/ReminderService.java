package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.PaymentReminder;
import vn.dongthanh.vsmt.remittance.domain.PaymentReminderRepository;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.PeriodDebt;

/**
 * Nhắc nộp (R16): cán bộ xã nhắc công ty có nợ quá hạn theo sổ công ty–kỳ; hạn mới mặc định ngày nhắc + 5; nội dung
 * soạn sẵn sửa được; phát thông báo REMINDER tới quản lý công ty. Lịch sử nhắc giữ nguyên (D6).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ReminderService {

    static final String ENTITY = "PaymentReminder";
    static final int DEFAULT_DAYS = 5;
    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final PaymentReminderRepository reminders;
    private final CompanyRepository companies;
    private final CompanyLedgerService ledger;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record ReminderDraft(Company company, List<PeriodDebt> debts, long amount, LocalDate dueDate, String content) {
    }

    /** {@code periodIds} null thì lấy mọi kỳ nợ quá hạn; {@code dueDate}, {@code content} null thì dùng mặc định. */
    public record CreateReminderCommand(Long companyId, List<Long> periodIds, LocalDate dueDate, String content) {
    }

    /** Nhắc nộp kèm cờ công ty đã hết nợ các kỳ được nhắc (tính từ sổ, không lưu, D6). */
    public record ReminderView(PaymentReminder reminder, boolean settled) {
    }

    @Transactional(readOnly = true)
    public ReminderDraft draft(Long companyId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Company company = company(companyId);
        List<PeriodDebt> debts = ledger.overdueDebtsOf(companyId);
        LocalDate due = LocalDate.now(clock).plusDays(DEFAULT_DAYS);
        long amount = debts.stream().mapToLong(PeriodDebt::remaining).sum();
        return new ReminderDraft(company, debts, amount, due, defaultContent(company, debts, amount, due));
    }

    public PaymentReminder create(CreateReminderCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Company company = company(cmd.companyId());
        List<PeriodDebt> overdue = ledger.overdueDebtsOf(company.getId());
        if (overdue.isEmpty()) {
            throw new BusinessRuleException("NO_OVERDUE_DEBT", "Công ty " + company.getCode()
                    + " không có kỳ nào quá hạn còn nợ, không cần nhắc nộp.");
        }
        List<PeriodDebt> selected = overdue;
        if (cmd.periodIds() != null && !cmd.periodIds().isEmpty()) {
            Set<Long> wanted = new HashSet<>(cmd.periodIds());
            selected = overdue.stream().filter(d -> wanted.contains(d.period().getId())).toList();
            if (selected.size() != wanted.size()) {
                throw new BusinessRuleException("REMINDER_PERIOD_INVALID",
                        "Chỉ nhắc được các kỳ đã quá hạn mà công ty còn nợ.");
            }
        }
        LocalDate today = LocalDate.now(clock);
        LocalDate due = cmd.dueDate() != null ? cmd.dueDate() : today.plusDays(DEFAULT_DAYS);
        if (due.isBefore(today)) {
            throw new BusinessRuleException("REMINDER_DUE_DATE_INVALID", "Hạn nộp mới không được trước hôm nay.");
        }
        long amount = selected.stream().mapToLong(PeriodDebt::remaining).sum();
        String content = cmd.content() != null && !cmd.content().isBlank() ? cmd.content().trim()
                : defaultContent(company, selected, amount, due);
        List<CollectionPeriod> periods = selected.stream().map(PeriodDebt::period).toList();
        String code = "NN-%03d".formatted(reminders.maxCodeNumber() + 1);
        PaymentReminder saved = reminders.save(PaymentReminder.create(code, company, today, due, periods, amount,
                content, actor.id()));

        String periodLabels = periods.stream().map(CollectionPeriod::getLabel).collect(Collectors.joining(", "));
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("screen", "company.receipts");
        link.put("params", Map.of("reminderId", saved.getId() == null ? 0 : saved.getId()));
        notifications.publish(NotificationCommand.toCompany(company.getId(), Role.COMPANY_MANAGER, NotificationKind.REMINDER,
                "Nhắc nộp tiền " + periodLabels, content, link), actor.id());

        Map<String, Object> after = new LinkedHashMap<>();
        after.put("company", company.getCode());
        after.put("periods", periods.stream().map(CollectionPeriod::getCode).toList());
        after.put("amount", amount);
        after.put("dueDate", due);
        audit.record(actor, "CREATE_PAYMENT_REMINDER", ENTITY, code, null, after);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ReminderView> list(Long companyId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER);
        Long scoped = actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : companyId;
        return reminders.search(scoped).stream().map(r -> {
            Set<Long> stillOwing = ledger.overdueDebtsOf(r.getCompany().getId()).stream()
                    .map(d -> d.period().getId()).collect(Collectors.toSet());
            boolean settled = r.getPeriods().stream().noneMatch(p -> stillOwing.contains(p.getId()));
            return new ReminderView(r, settled);
        }).toList();
    }

    private Company company(Long id) {
        return companies.findById(id)
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
    }

    private static String defaultContent(Company company, List<PeriodDebt> debts, long amount, LocalDate due) {
        String lines = debts.stream().map(d -> "- " + d.period().getLabel() + ": " + Money.format(d.remaining()))
                .collect(Collectors.joining("\n"));
        return "Kính gửi " + company.getName() + ",\n"
                + "Đến nay công ty còn chưa nộp đủ tiền giá dịch vụ đã thu về xã:\n" + lines + "\n"
                + "Tổng cộng: " + Money.format(amount) + ". Đề nghị công ty nộp số còn thiếu trước ngày "
                + VN_DATE.format(due) + ".\nUBND xã Đông Thạnh.";
    }
}
