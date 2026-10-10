package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
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
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.domain.Settlement;
import vn.dongthanh.vsmt.remittance.domain.SettlementRepository;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.LedgerRow;

/**
 * Phiếu quyết toán (07/10, docs/quyet-toan-0710.md): chỉ cán bộ xã lập, kỳ đang thu, sau hạn dân đóng; mỗi công ty mỗi kỳ
 * một phiếu, kể cả khi chênh lệch bằng 0. Số tiền hệ thống tính từ sổ công ty–kỳ, người lập không nhập: công ty phải nộp
 * xã = vận chuyển + xử lý trong tiền mặt (phải nộp xã + thu gom QR), xã phải trả công ty = thu gom trong QR, chênh lệch =
 * phải nộp xã. Khóa dòng kỳ (FOR UPDATE) để mã phiếu tuần tự không trùng và tiền đang ghi song song (FOR SHARE) vào kỳ
 * xong trước khi chốt số. Không sửa, không hủy, không báo sai sót.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SettlementService {

    static final String ENTITY = "Settlement";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final SettlementRepository settlements;
    private final CollectionPeriodRepository periods;
    private final CompanyRepository companies;
    private final CompanyLedgerService ledger;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record IssueSettlementCommand(Long companyId, Long periodId, ReceiptMethod method, LocalDate settleDate,
            String representativeName, String documentRef, String note) {
    }

    public Settlement issue(IssueSettlementCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        CollectionPeriod period = periods.findByIdForUpdate(cmd.periodId())
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
        PeriodGuard.requireOpenAsLoaded(period);
        Company company = companies.findById(cmd.companyId())
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        LocalDate today = LocalDate.now(clock);
        if (!today.isAfter(period.getDueDate())) {
            throw new BusinessRuleException("SETTLEMENT_TOO_EARLY", "Chỉ lập phiếu quyết toán sau hạn dân đóng ("
                    + period.getDueDate().format(DATE) + ").");
        }
        if (settlements.existsByPeriodIdAndCompanyId(period.getId(), company.getId())) {
            throw new ConflictException("SETTLEMENT_EXISTS", "Công ty " + company.getCode() + " đã quyết toán "
                    + period.getLabel() + ".");
        }
        LocalDate date = cmd.settleDate() != null ? cmd.settleDate() : today;
        if (date.isAfter(today)) {
            throw new BusinessRuleException("SETTLEMENT_DATE_INVALID", "Ngày quyết toán không được sau hôm nay.");
        }
        LedgerRow row = ledger.row(company.getId(), period.getId());
        if (row.settled()) {
            throw new BusinessRuleException("SETTLEMENT_NOTHING", "Công ty " + company.getCode()
                    + " không có số liệu ở " + period.getLabel() + ", không cần quyết toán.");
        }
        if (row.payable() != 0 && cmd.method() == null) {
            throw new BusinessRuleException("SETTLEMENT_METHOD_REQUIRED", "Phải chọn hình thức chuyển tiền.");
        }
        String prefix = "QT-" + period.documentToken() + "-";
        String code = prefix + "%03d".formatted(settlements.maxCodeNumber(prefix) + 1);
        String representative = blankToNull(cmd.representativeName()) != null ? cmd.representativeName().trim()
                : company.getContactName();
        Settlement saved = settlements.save(Settlement.builder()
                .code(code).company(company).period(period).companyOwes(row.payable() + row.qrCollection())
                .communeOwes(row.qrCollection()).method(cmd.method()).settleDate(date)
                .representativeName(representative).documentRef(blankToNull(cmd.documentRef()))
                .note(blankToNull(cmd.note())).issuedBy(actor.id())
                .build());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("company", company.getCode());
        after.put("period", period.getCode());
        after.put("companyOwes", saved.getCompanyOwes());
        after.put("communeOwes", saved.getCommuneOwes());
        after.put("amount", saved.getAmount());
        after.put("method", saved.getMethod());
        after.put("settleDate", date);
        audit.record(actor, "ISSUE_SETTLEMENT", ENTITY, code, null, after);
        notifications.publish(NotificationCommand.toCompany(company.getId(), Role.COMPANY_MANAGER, NotificationKind.RECEIPT,
                "Xã đã lập phiếu quyết toán " + code, period.getLabel() + ": " + direction(saved.getAmount()) + ".",
                link(saved.getId())), actor.id());
        return saved;
    }

    /** Phiếu theo kỳ/công ty; công ty chỉ thấy phiếu của mình, lãnh đạo chỉ xem. */
    @Transactional(readOnly = true)
    public List<Settlement> list(Long periodId, Long companyId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.COMPANY_MANAGER, Role.LEADER);
        Long scopedCompany = actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : companyId;
        return settlements.search(periodId, scopedCompany);
    }

    @Transactional(readOnly = true)
    public Settlement get(Long id, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.COMPANY_MANAGER, Role.LEADER);
        Settlement s = settlements.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("SETTLEMENT_NOT_FOUND", "Không tìm thấy phiếu quyết toán."));
        if (actor.role() == Role.COMPANY_MANAGER && !Objects.equals(s.getCompany().getId(), actor.companyId())) {
            throw new NotFoundException("SETTLEMENT_NOT_FOUND", "Không tìm thấy phiếu quyết toán.");
        }
        return s;
    }

    static String direction(long amount) {
        if (amount > 0) {
            return "công ty nộp xã " + Money.format(amount);
        }
        if (amount < 0) {
            return "xã trả công ty " + Money.format(-amount);
        }
        return "hai bên không chuyển tiền (chênh lệch 0 đ)";
    }

    private static Map<String, Object> link(Long id) {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("screen", "company.settlements");
        link.put("params", Map.of("settlementId", id));
        return link;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
