package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.service.PeriodGuard;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.CommunePayout;
import vn.dongthanh.vsmt.remittance.domain.CommunePayoutRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;

/**
 * Phiếu chi trả công ty (UC-55): xã trả lại công ty khi phải nộp xã của công ty trong kỳ âm. Chỉ cán bộ xã lập; 1 phiếu
 * 1 kỳ, 1 kỳ trả nhiều lần; 0 &lt; số tiền ≤ số xã còn phải trả theo sổ công ty–kỳ ({@code communeOwed}). Khóa dòng kỳ
 * thu để mã phiếu tuần tự và hai phiếu song song không cùng vượt số còn trả. Không sửa, không hủy.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CommunePayoutService {

    static final String ENTITY = "CommunePayout";

    private final CommunePayoutRepository payouts;
    private final CollectionPeriodRepository periods;
    private final CompanyRepository companies;
    private final CompanyLedgerService ledger;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record IssuePayoutCommand(Long companyId, Long periodId, long amount, ReceiptMethod method, LocalDate payoutDate,
            String documentRef, String note) {
    }

    /** Phiếu kèm lũy kế xã đã trả tới phiếu này, số xã phải trả lại của kỳ (= −còn phải nộp) và số còn phải trả sau phiếu. */
    public record PayoutView(CommunePayout payout, long cumulativePaid, long periodOwed) {

        public long remainingAfter() {
            return Math.max(0, periodOwed - cumulativePaid);
        }
    }

    public CommunePayout issue(IssuePayoutCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdForUpdate(cmd.periodId())
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
        PeriodGuard.requireOpenAsLoaded(period);
        Company company = companies.findById(cmd.companyId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        LocalDate today = LocalDate.now(clock);
        LocalDate date = cmd.payoutDate() != null ? cmd.payoutDate() : today;
        if (date.isAfter(today)) {
            throw new BusinessRuleException("PAYOUT_DATE_INVALID", "Ngày trả không được sau hôm nay.");
        }
        long owed = ledger.row(company.getId(), period.getId()).communeOwed();
        if (cmd.amount() <= 0 || cmd.amount() > owed) {
            String detail = owed > 0 ? "không vượt số xã còn phải trả (" + Money.format(owed) + ")"
                    : "xã không còn số phải trả lại công ty ở kỳ này";
            throw new BusinessRuleException("PAYOUT_AMOUNT_OUT_OF_RANGE", "Số tiền phải lớn hơn 0 và " + detail + ".");
        }
        String prefix = "PC-CT-" + period.documentToken() + "-";
        String code = prefix + "%03d".formatted(payouts.maxCodeNumber(prefix) + 1);
        CommunePayout saved = payouts.save(CommunePayout.builder()
                .code(code).company(company).period(period).amount(cmd.amount()).method(cmd.method())
                .payoutDate(date).documentRef(blankToNull(cmd.documentRef())).note(blankToNull(cmd.note())).issuedBy(actor.id()).build());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("company", company.getCode());
        after.put("period", period.getCode());
        after.put("amount", cmd.amount());
        after.put("method", cmd.method());
        after.put("owedBefore", owed);
        after.put("owedAfter", owed - cmd.amount());
        audit.record(actor, "ISSUE_COMMUNE_PAYOUT", ENTITY, code, null, after);
        notifications.publish(NotificationCommand.toCompany(company.getId(), Role.COMPANY_MANAGER, NotificationKind.RECEIPT,
                "Xã đã lập phiếu chi trả " + code, "Xã đã trả lại " + Money.format(cmd.amount()) + " cho " + period.getLabel()
                        + ". Xã còn phải trả kỳ này: " + Money.format(owed - cmd.amount()) + ".",
                ReceiptIssueService.link("company.receipts", "payoutId", saved.getId())), actor.id());
        return saved;
    }

    /** Phiếu chi theo kỳ/công ty; công ty chỉ thấy phiếu của mình. Lãnh đạo chỉ xem; quản trị viên không có. */
    @Transactional(readOnly = true)
    public List<PayoutView> list(Long periodId, Long companyId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.COMPANY_MANAGER, Role.LEADER);
        Long scopedCompany = actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : companyId;
        Map<String, Long> running = new HashMap<>();
        Map<String, Long> owedCache = new HashMap<>();
        List<PayoutView> views = new ArrayList<>();
        for (CommunePayout p : payouts.search(periodId, scopedCompany)) {
            String key = p.getCompany().getId() + ":" + p.getPeriod().getId();
            long cumulative = running.merge(key, p.getAmount(), Long::sum);
            long owed = owedCache.computeIfAbsent(key, k -> {
                var row = ledger.row(p.getCompany().getId(), p.getPeriod().getId());
                return row.communeOwed() + row.communePaid();
            });
            views.add(new PayoutView(p, cumulative, owed));
        }
        return views;
    }

    @Transactional(readOnly = true)
    public PayoutView get(Long id, CurrentUser actor) {
        CommunePayout p = payouts.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("PAYOUT_NOT_FOUND", "Không tìm thấy phiếu chi trả."));
        if (actor.role() == Role.COMPANY_MANAGER && !Objects.equals(p.getCompany().getId(), actor.companyId())) {
            throw new NotFoundException("PAYOUT_NOT_FOUND", "Không tìm thấy phiếu chi trả.");
        }
        return list(p.getPeriod().getId(), p.getCompany().getId(), actor).stream()
                .filter(v -> v.payout().getId().equals(id)).findFirst().orElseThrow();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
