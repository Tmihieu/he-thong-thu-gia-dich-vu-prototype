package vn.dongthanh.vsmt.leadership.service;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.leadership.domain.ApprovalRequest;
import vn.dongthanh.vsmt.leadership.domain.ApprovalRequestRepository;
import vn.dongthanh.vsmt.leadership.domain.ApprovalStatus;
import vn.dongthanh.vsmt.leadership.domain.ApprovalType;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.service.ContractExemptedEvent;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Đề nghị miễn giảm / hoàn / xóa nợ (SPEC §9.10, T55–T58). Xã lập (miễn giảm tự tạo khi xã bật cờ trên hợp đồng),
 * lãnh đạo duyệt hoặc từ chối (từ chối bắt buộc ý kiến). Hoàn và xóa nợ ghi nhận ở kỳ của khoản nếu kỳ chưa khóa,
 * ngược lại ở kỳ đang thu mới nhất (O10: số kỳ đã khóa giữ nguyên).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ApprovalService {

    static final String ENTITY = "ApprovalRequest";
    private static final DateTimeFormatter MMYY = DateTimeFormatter.ofPattern("MMyy");

    private final ApprovalRequestRepository requests;
    private final ChargeRepository charges;
    private final ServiceContractRepository contracts;
    private final CollectionPeriodRepository periods;
    private final CollectionService collection;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record CreateCommand(ApprovalType type, Long chargeId, Long amount, String reason, String decisionNo) {
    }

    /** Xã lập đề nghị hoàn hoặc xóa nợ cho một khoản. Miễn giảm không lập tay: bật cờ trên hợp đồng. */
    public ApprovalRequest create(CreateCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        if (cmd.type() == ApprovalType.EXEMPTION) {
            throw new BusinessRuleException("APPROVAL_TYPE_INVALID",
                    "Miễn giảm lập bằng cách bật \"Miễn 100%\" trên đăng ký thu phí.");
        }
        String reason = requireText(cmd.reason());
        charges.lockById(cmd.chargeId());
        Charge charge = charges.findByIdWithDetails(cmd.chargeId())
                .orElseThrow(() -> new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu."));
        if (requests.existsByChargeIdAndTypeAndStatus(charge.getId(), cmd.type(), ApprovalStatus.PENDING)) {
            throw new BusinessRuleException("APPROVAL_PENDING_EXISTS",
                    "Khoản " + charge.getCode() + " đã có đề nghị cùng loại đang chờ duyệt.");
        }
        Long amount = null;
        if (cmd.type() == ApprovalType.WRITE_OFF) {
            requireWriteOffable(charge);
        } else {
            amount = cmd.amount();
            requireRefundable(charge, amount);
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        ApprovalRequest saved = requests.save(ApprovalRequest.forCharge(nextCode(now), cmd.type(), charge, amount, reason,
                blankToNull(cmd.decisionNo()), actor.id(), now));
        notifyLeaders(saved, label(saved) + " khoản " + charge.getCode() + " · " + charge.getSubject().getName());
        audit.record(actor, "CREATE_APPROVAL", ENTITY, saved.getCode(), null, snapshot(saved));
        return saved;
    }

    /** Xã bật miễn 100% trên hợp đồng: tự tạo đề nghị miễn giảm để lãnh đạo duyệt sau (quyết định 29/09/2026). */
    @EventListener
    public void onContractExempted(ContractExemptedEvent e) {
        ServiceContract contract = contracts.findById(e.contractId()).orElseThrow();
        // Bật / tắt / bật lại khi đề nghị cũ còn chờ: giữ một đề nghị, không tạo thêm.
        if (!requests.findByContractIdAndTypeAndStatus(contract.getId(), ApprovalType.EXEMPTION, ApprovalStatus.PENDING)
                .isEmpty()) {
            return;
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        ApprovalRequest saved = requests.save(ApprovalRequest.forContract(nextCode(now), contract,
                e.reason(), e.decisionNo(), e.actor().id(), now));
        notifyLeaders(saved, "Miễn giảm đăng ký " + contract.getContractNo() + " · " + contract.getSubject().getName());
        audit.record(e.actor(), "CREATE_APPROVAL", ENTITY, saved.getCode(), null, snapshot(saved));
    }

    public ApprovalRequest approve(Long id, String note, CurrentUser actor) {
        actor.requireRole(Role.LEADER);
        ApprovalRequest r = forDecision(id);
        Map<String, Object> before = snapshot(r);
        CollectionPeriod effective = null;
        switch (r.getType()) {
            case EXEMPTION -> {
                // Chỉ ghi nhận: cờ miễn đã được xã bật. Xã đã tắt thì không còn gì để ghi nhận.
                if (!r.getContract().isExempt()) {
                    throw new BusinessRuleException("EXEMPTION_ALREADY_REMOVED",
                            "Xã đã tắt miễn trên đăng ký " + r.getContract().getContractNo() + "; từ chối để đóng đề nghị.");
                }
            }
            case WRITE_OFF -> {
                Charge charge = lockedCharge(r);
                requireWriteOffable(charge);
                effective = ledgerPeriodFor(charge);
                charge.writeOff(effective);
            }
            case REFUND -> {
                Charge charge = lockedCharge(r);
                effective = ledgerPeriodFor(charge);
                collection.recordRefund(charge, r.getAmount(), effective, "Hoàn theo đề nghị " + r.getCode(),
                        "refund-" + r.getCode(), actor.id());
            }
        }
        r.approve(note, effective, actor.id(), OffsetDateTime.now(clock));
        notifyRequester(r);
        audit.record(actor, "APPROVE_APPROVAL", ENTITY, r.getCode(), before, snapshot(r));
        return r;
    }

    public ApprovalRequest reject(Long id, String note, CurrentUser actor) {
        actor.requireRole(Role.LEADER);
        ApprovalRequest r = forDecision(id);
        Map<String, Object> before = snapshot(r);
        r.reject(note, actor.id(), OffsetDateTime.now(clock));
        if (r.getType() == ApprovalType.EXEMPTION) {
            revokeExemption(r.getContract());
        }
        notifyRequester(r);
        audit.record(actor, "REJECT_APPROVAL", ENTITY, r.getCode(), before, snapshot(r));
        return r;
    }

    /** Xã, lãnh đạo, quản trị xem mọi đề nghị. */
    @Transactional(readOnly = true)
    public List<ApprovalRequest> list(ApprovalStatus status, ApprovalType type, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.LEADER, Role.ADMIN);
        return requests.search(status, type);
    }

    /** Một đề nghị kèm hộ / khoản / kỳ (đọc lại sau khi ghi để trả về, không dùng open-in-view). */
    @Transactional(readOnly = true)
    public ApprovalRequest get(Long id, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.LEADER, Role.ADMIN);
        return requests.findByIdWithDetails(id)
                .orElseThrow(() -> new NotFoundException("APPROVAL_NOT_FOUND", "Không tìm thấy đề nghị."));
    }

    /**
     * O8: bỏ cờ miễn; khoản Miễn giảm của hợp đồng trong kỳ chưa khóa về Chưa thu (số tiền tính lại theo đơn giá đã
     * chụp). Xã đã tự tắt cờ trước đó thì không còn gì để bỏ.
     */
    private void revokeExemption(ServiceContract contract) {
        if (contract.isExempt()) {
            contract.revokeExemption();
        }
        // Kể cả khi xã đã tự tắt cờ: khoản đã phát hành dạng Miễn giảm vẫn phải về Chưa thu. Đọc trạng thái kỳ kèm
        // FOR SHARE để khóa kỳ song song phải chờ (kỳ vừa khóa thì bỏ qua, số kỳ khóa giữ nguyên).
        for (Charge c : charges.findByContractInUnlockedPeriods(contract.getId(), ChargeStatus.EXEMPT, PeriodStatus.LOCKED)) {
            if (!PeriodStatus.LOCKED.name().equals(periods.lockStatusForShare(c.getPeriod().getId()))) {
                c.revokeExemption(contract.getQuotaKg());
            }
        }
    }

    private ApprovalRequest forDecision(Long id) {
        ApprovalRequest r = requests.findByIdForUpdate(id)
                .orElseThrow(() -> new NotFoundException("APPROVAL_NOT_FOUND", "Không tìm thấy đề nghị."));
        r.requirePending();
        return r;
    }

    private Charge lockedCharge(ApprovalRequest r) {
        charges.lockById(r.getCharge().getId());
        return charges.findByIdWithDetails(r.getCharge().getId()).orElseThrow();
    }

    /**
     * Kỳ ghi nhận: kỳ của khoản nếu chưa khóa, ngược lại kỳ đang thu mới nhất. Đọc trạng thái kèm FOR SHARE (như
     * PeriodGuard) để khóa kỳ song song phải chờ.
     */
    private CollectionPeriod ledgerPeriodFor(Charge charge) {
        CollectionPeriod own = charge.getPeriod();
        if (!PeriodStatus.LOCKED.name().equals(periods.lockStatusForShare(own.getId()))) {
            return own;
        }
        for (CollectionPeriod p : periods.findByStatusOrderByStartDateDesc(PeriodStatus.COLLECTING)) {
            if (PeriodStatus.COLLECTING.name().equals(periods.lockStatusForShare(p.getId()))) {
                return p;
            }
        }
        throw new BusinessRuleException("NO_COLLECTING_PERIOD",
                "Kỳ " + own.getCode() + " đã khóa và chưa có kỳ đang thu để ghi nhận điều chỉnh.");
    }

    private void requireWriteOffable(Charge charge) {
        if (charge.getStatus() != ChargeStatus.UNPAID || collection.paidOf(charge.getId()) > 0) {
            throw new BusinessRuleException("WRITE_OFF_NOT_ALLOWED",
                    "Chỉ xóa nợ khoản chưa thu và chưa có lần thu nào (" + charge.getCode() + ").");
        }
    }

    private void requireRefundable(Charge charge, Long amount) {
        long paid = collection.paidOf(charge.getId());
        if (amount == null || amount <= 0 || amount > paid) {
            throw new BusinessRuleException("REFUND_AMOUNT_INVALID",
                    "Số tiền hoàn phải lớn hơn 0 và không vượt số đã thu (" + Money.format(paid) + ").");
        }
    }

    private String nextCode(OffsetDateTime now) {
        requests.lockCodes();
        String prefix = "DN-" + now.format(MMYY) + "-";
        return prefix + String.format("%03d", requests.maxSeq(prefix) + 1);
    }

    private void notifyLeaders(ApprovalRequest r, String what) {
        notifications.publish(NotificationCommand.toRole(Role.LEADER, NotificationKind.INFO,
                "Đề nghị " + r.getCode() + " chờ duyệt", what + ". Lý do: " + r.getReason(),
                link("leader.approvals", r.getId())), r.getRequestedBy());
    }

    private void notifyRequester(ApprovalRequest r) {
        String result = r.getStatus() == ApprovalStatus.APPROVED ? "đã được duyệt" : "bị từ chối";
        notifications.publish(NotificationCommand.toUser(r.getRequestedBy(), NotificationKind.INFO,
                "Đề nghị " + r.getCode() + " " + result, label(r) + (r.getDecisionNote() == null ? ""
                        : ". Ý kiến lãnh đạo: " + r.getDecisionNote()),
                link("commune.approvals", r.getId())), r.getDecidedBy());
    }

    private static String label(ApprovalRequest r) {
        return switch (r.getType()) {
            case EXEMPTION -> "Miễn giảm";
            case REFUND -> "Hoàn " + Money.format(r.getAmount());
            case WRITE_OFF -> "Xóa nợ";
        };
    }

    private static Map<String, Object> snapshot(ApprovalRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", r.getType());
        m.put("status", r.getStatus());
        m.put("contract", r.getContract() == null ? null : r.getContract().getContractNo());
        m.put("charge", r.getCharge() == null ? null : r.getCharge().getCode());
        m.put("amount", r.getAmount());
        m.put("reason", r.getReason());
        m.put("decisionNote", r.getDecisionNote());
        m.put("effectivePeriod", r.getEffectivePeriod() == null ? null : r.getEffectivePeriod().getCode());
        return m;
    }

    private static Map<String, Object> link(String screen, Long id) {
        return Map.of("screen", screen, "params", Map.of("approvalId", id));
    }

    private static String requireText(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("APPROVAL_REASON_REQUIRED", "Phải ghi lý do đề nghị.");
        }
        return reason.trim();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
