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
import vn.dongthanh.vsmt.remittance.domain.CommunePayout;
import vn.dongthanh.vsmt.remittance.domain.CommunePayoutRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssue;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueRepository;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueStatus;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueType;

/**
 * Báo sai sót phiếu chi trả (UC-56, UC-57), đối xứng báo sai sót phiếu thu: công ty báo trên phiếu xã trả mình → thông
 * báo tới cán bộ xã; xã xử lý = đóng kèm ghi chú kết quả → thông báo về công ty. Dùng chung bảng {@code receipt_issues}.
 * Không sửa, không hủy phiếu.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PayoutIssueService {

    static final String ENTITY = "PayoutIssue";

    private final ReceiptIssueRepository issues;
    private final CommunePayoutRepository payouts;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public ReceiptIssue report(Long payoutId, ReceiptIssueType type, Long correctAmount, String description,
            CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        CommunePayout payout = payouts.findByIdWithDetails(payoutId)
                .filter(p -> Objects.equals(p.getCompany().getId(), actor.companyId()))
                .orElseThrow(() -> new NotFoundException("PAYOUT_NOT_FOUND", "Không tìm thấy phiếu chi trả của công ty."));
        if (description == null || description.isBlank()) {
            throw new BusinessRuleException("RECEIPT_ISSUE_DESCRIPTION_REQUIRED", "Phải mô tả sai sót.");
        }
        String text = description.trim();
        ReceiptIssue saved = issues.save(ReceiptIssue.reportPayout(payout, type, correctAmount, text, actor.id()));
        String extra = correctAmount == null ? "" : " Số đúng theo công ty: " + Money.format(correctAmount) + ".";
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.RECEIPT,
                payout.getCompany().getCode() + " báo sai sót phiếu chi trả " + payout.getCode(), text + extra,
                ReceiptIssueService.link("remittance.payoutIssues", "issueId", saved.getId())), actor.id());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("payout", payout.getCode());
        after.put("type", type);
        after.put("correctAmount", correctAmount);
        after.put("description", text);
        audit.record(actor, "REPORT_PAYOUT_ISSUE", ENTITY, String.valueOf(saved.getId()), null, after);
        return saved;
    }

    public ReceiptIssue resolve(Long issueId, String resolutionNote, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ReceiptIssue issue = issues.findPayoutIssueById(issueId)
                .orElseThrow(() -> new NotFoundException("RECEIPT_ISSUE_NOT_FOUND", "Không tìm thấy sai sót."));
        issue.resolve(resolutionNote, actor.id(), OffsetDateTime.now(clock));
        CommunePayout payout = issue.getPayout();
        notifications.publish(NotificationCommand.toCompany(payout.getCompany().getId(), Role.COMPANY_MANAGER,
                NotificationKind.RECEIPT, "Xã đã xử lý sai sót phiếu chi trả " + payout.getCode(), issue.getResolutionNote(),
                ReceiptIssueService.link("company.receipts", "payoutId", payout.getId())), actor.id());
        audit.record(actor, "RESOLVE_PAYOUT_ISSUE", ENTITY, String.valueOf(issue.getId()),
                Map.of("status", ReceiptIssueStatus.PENDING),
                Map.of("status", ReceiptIssueStatus.RESOLVED, "resolutionNote", issue.getResolutionNote()));
        return issue;
    }

    /** Xã và lãnh đạo thấy mọi sai sót; công ty chỉ thấy sai sót trên phiếu của mình; quản trị viên không có. */
    @Transactional(readOnly = true)
    public List<ReceiptIssue> list(ReceiptIssueStatus status, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.COMPANY_MANAGER, Role.LEADER);
        return issues.searchPayoutIssues(status, actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : null);
    }
}
