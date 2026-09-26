package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceiptRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssue;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueStatus;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueType;

/**
 * Báo sai sót phiếu thu (R28): quản lý công ty báo trên phiếu của mình → thông báo RECEIPT tới cán bộ xã;
 * xã xử lý = đóng kèm ghi chú kết quả (G6) → thông báo RECEIPT về công ty. Không sửa, không hủy phiếu.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ReceiptIssueService {

    static final String ENTITY = "ReceiptIssue";

    private final ReceiptIssueRepository issues;
    private final CompanyReceiptRepository receipts;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public ReceiptIssue report(Long receiptId, ReceiptIssueType type, Long correctAmount, String description,
            CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        CompanyReceipt receipt = receipts.findByIdWithDetails(receiptId)
                .filter(r -> Objects.equals(r.getCompany().getId(), actor.companyId()))
                .orElseThrow(() -> new NotFoundException("RECEIPT_NOT_FOUND", "Không tìm thấy phiếu thu của công ty."));
        if (description == null || description.isBlank()) {
            throw new BusinessRuleException("RECEIPT_ISSUE_DESCRIPTION_REQUIRED", "Phải mô tả sai sót.");
        }
        String text = description.trim();
        ReceiptIssue saved = issues.save(ReceiptIssue.report(receipt, type, correctAmount, text, actor.id()));
        String extra = correctAmount == null ? "" : " Số đúng theo công ty: " + Money.format(correctAmount) + ".";
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.RECEIPT,
                receipt.getCompany().getCode() + " báo sai sót phiếu thu " + receipt.getCode(), text + extra,
                link("remittance.receiptIssues", "issueId", saved.getId())), actor.id());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("receipt", receipt.getCode());
        after.put("type", type);
        after.put("correctAmount", correctAmount);
        after.put("description", text);
        audit.record(actor, "REPORT_RECEIPT_ISSUE", ENTITY, String.valueOf(saved.getId()), null, after);
        return saved;
    }

    public ReceiptIssue resolve(Long issueId, String resolutionNote, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ReceiptIssue issue = issues.findByIdWithDetails(issueId)
                .orElseThrow(() -> new NotFoundException("RECEIPT_ISSUE_NOT_FOUND", "Không tìm thấy sai sót."));
        issue.resolve(resolutionNote, actor.id(), OffsetDateTime.now(clock));
        CompanyReceipt receipt = issue.getReceipt();
        notifications.publish(NotificationCommand.toCompany(receipt.getCompany().getId(), Role.COMPANY_MANAGER,
                NotificationKind.RECEIPT, "Xã đã xử lý sai sót phiếu thu " + receipt.getCode(), issue.getResolutionNote(),
                link("company.receipts", "receiptId", receipt.getId())), actor.id());
        audit.record(actor, "RESOLVE_RECEIPT_ISSUE", ENTITY, String.valueOf(issue.getId()),
                Map.of("status", ReceiptIssueStatus.PENDING),
                Map.of("status", ReceiptIssueStatus.RESOLVED, "resolutionNote", issue.getResolutionNote()));
        return issue;
    }

    /** Xã và quản trị thấy mọi sai sót; công ty chỉ thấy sai sót trên phiếu của mình. */
    @Transactional(readOnly = true)
    public List<ReceiptIssue> list(ReceiptIssueStatus status, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER);
        return issues.search(status, actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : null);
    }

    static Map<String, Object> link(String screen, String param, Long id) {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("screen", screen);
        link.put("params", Map.of(param, id == null ? 0 : id));
        return link;
    }
}
