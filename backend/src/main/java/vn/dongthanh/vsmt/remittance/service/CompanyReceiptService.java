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
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceiptRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;

/**
 * Phiếu thu xã lập cho công ty (R15): chỉ cán bộ xã; 1 phiếu 1 kỳ, 1 kỳ nộp nhiều lần; 0 &lt; số tiền ≤ còn phải nộp
 * theo sổ công ty–kỳ. Khóa dòng kỳ thu trong transaction để mã phiếu tuần tự không trùng và hai phiếu song song
 * không cùng vượt số còn nộp.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CompanyReceiptService {

    static final String ENTITY = "CompanyReceipt";

    private final CompanyReceiptRepository receipts;
    private final CollectionPeriodRepository periods;
    private final CompanyRepository companies;
    private final CompanyLedgerService ledger;
    private final AuditService audit;
    private final Clock clock;

    public record IssueReceiptCommand(Long companyId, Long periodId, long amount, ReceiptMethod method,
            LocalDate receiptDate, String payerName, String documentRef, String note) {
    }

    /** Phiếu kèm lũy kế đã nộp của công ty cho kỳ tính tới phiếu này (R30) và phải thu của kỳ. */
    public record ReceiptView(CompanyReceipt receipt, long cumulativePaid, long periodDue) {

        public long remainingAfter() {
            return periodDue - cumulativePaid;
        }
    }

    public CompanyReceipt issue(IssueReceiptCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdForUpdate(cmd.periodId())
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
        PeriodGuard.requireOpen(period);
        Company company = companies.findById(cmd.companyId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        LocalDate today = LocalDate.now(clock);
        LocalDate date = cmd.receiptDate() != null ? cmd.receiptDate() : today;
        if (date.isAfter(today)) {
            throw new BusinessRuleException("RECEIPT_DATE_INVALID", "Ngày nộp không được sau hôm nay.");
        }
        long remaining = ledger.remaining(company.getId(), period.getId());
        if (cmd.amount() <= 0 || cmd.amount() > remaining) {
            throw new BusinessRuleException("RECEIPT_AMOUNT_OUT_OF_RANGE",
                    "Số tiền phải lớn hơn 0 và không vượt số còn phải nộp (" + Money.format(remaining) + ").");
        }
        String prefix = "PT-CT-" + period.documentToken() + "-";
        String code = prefix + "%03d".formatted(receipts.maxCodeNumber(prefix) + 1);
        String payer = cmd.payerName() == null || cmd.payerName().isBlank() ? company.getContactName()
                : cmd.payerName().trim();
        CompanyReceipt saved = receipts.save(CompanyReceipt.builder()
                .code(code).company(company).period(period).amount(cmd.amount()).method(cmd.method())
                .receiptDate(date).payerName(payer).documentRef(blankToNull(cmd.documentRef()))
                .note(blankToNull(cmd.note())).issuedBy(actor.id())
                .build());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("company", company.getCode());
        after.put("period", period.getCode());
        after.put("amount", cmd.amount());
        after.put("method", cmd.method());
        after.put("remainingBefore", remaining);
        after.put("remainingAfter", remaining - cmd.amount());
        audit.record(actor, "ISSUE_COMPANY_RECEIPT", ENTITY, code, null, after);
        return saved;
    }

    /** Phiếu thu theo kỳ/công ty; công ty chỉ thấy phiếu của mình. Kèm lũy kế (R30). */
    @Transactional(readOnly = true)
    public List<ReceiptView> list(Long periodId, Long companyId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER);
        Long scopedCompany = actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : companyId;
        List<CompanyReceipt> all = receipts.search(periodId, scopedCompany);
        Map<String, Long> running = new HashMap<>();
        Map<String, Long> dueCache = new HashMap<>();
        List<ReceiptView> views = new ArrayList<>();
        for (CompanyReceipt r : all) {
            String key = r.getCompany().getId() + ":" + r.getPeriod().getId();
            long cumulative = running.merge(key, r.getAmount(), Long::sum);
            long due = dueCache.computeIfAbsent(key,
                    k -> ledger.row(r.getCompany().getId(), r.getPeriod().getId()).due());
            views.add(new ReceiptView(r, cumulative, due));
        }
        return views;
    }

    @Transactional(readOnly = true)
    public ReceiptView get(Long id, CurrentUser actor) {
        CompanyReceipt r = receipts.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("RECEIPT_NOT_FOUND", "Không tìm thấy phiếu thu."));
        if (actor.role() == Role.COMPANY_MANAGER && !Objects.equals(r.getCompany().getId(), actor.companyId())) {
            throw new NotFoundException("RECEIPT_NOT_FOUND", "Không tìm thấy phiếu thu.");
        }
        return list(r.getPeriod().getId(), r.getCompany().getId(), actor).stream()
                .filter(v -> v.receipt().getId().equals(id)).findFirst().orElseThrow();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
