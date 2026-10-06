package vn.dongthanh.vsmt.collection.service;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.masterdata.service.PeriodGuard;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Ghi nhận kết quả thu (R20, G4): hộ chỉ có Đã đóng hoặc Chưa đóng, nên mỗi lần thu phải đúng bằng số cần đóng và
 * khoản chuyển ngay sang Đã thu; không có thu một phần hay lượt ghé không thu được. Chỉ hai cách đóng: tiền mặt cho
 * người đi thu ({@link #recordPayment}) và chuyển khoản VietQR, ghi tự động khi ngân hàng báo về
 * ({@link #recordBankTransfer}); không ai tự bấm "đã chuyển khoản", không có thanh toán mô phỏng.
 * Người đi thu chỉ ghi cho khoản trong tổ được giao; quản lý công ty ghi thay cho hộ của công ty mình (phải chọn
 * người đi thu đang giữ tiền). Gửi lại cùng {@code clientRequestId} trả kết quả cũ (sau khi kiểm phạm vi). Kỳ đã khóa
 * hoặc khoản miễn thì không ghi được.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CollectionService {

    static final String ENTITY = "Charge";

    private final PaymentRepository payments;
    private final ChargeRepository charges;
    private final CollectorWorkService scope;
    private final UserRepository users;
    private final PeriodGuard periodGuard;
    private final CitizenAccountRepository citizenAccounts;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record PaymentCommand(Long chargeId, long amount, PaymentMethod method, String clientRequestId,
            String bankRef, String note, Long collectorId) {
    }

    public record PaymentOutcome(Payment payment, Charge charge, long paidAmount, long remainingAmount,
            boolean replayed) {
    }

    public record Activity(Charge charge, List<Payment> payments, long paidAmount) {
    }

    public PaymentOutcome recordPayment(PaymentCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COLLECTOR, Role.COMPANY_MANAGER);
        // Khóa dòng khoản TRƯỚC khi nạp: lần thu song song cùng khoản chờ lần trước commit rồi mới đọc trạng thái,
        // tổng đã thu và clientRequestId, nên không thu vượt và gửi trùng thì trả bản ghi cũ.
        lockRequest(cmd.clientRequestId());
        charges.lockById(cmd.chargeId());
        Charge charge = loadInScope(cmd.chargeId(), actor);
        Optional<Payment> existing = payments.findByClientRequestId(cmd.clientRequestId());
        if (existing.isPresent()) {
            return replay(existing.get(), cmd.chargeId());
        }
        requireCollectable(charge);
        if (cmd.method() != PaymentMethod.CASH) {
            throw new BusinessRuleException("PAYMENT_METHOD_INVALID",
                    "Chỉ ghi nhận tiền mặt ở đây; chuyển khoản tự ghi nhận khi ngân hàng báo tiền vào qua mã VietQR.");
        }
        Long collectorId = collectorFor(cmd, actor);

        long paidBefore = payments.sumByChargeId(charge.getId());
        long remaining = charge.getAmount() - paidBefore;
        if (cmd.amount() != remaining) {
            throw new BusinessRuleException("PAYMENT_AMOUNT_INVALID", "Số tiền phải đúng bằng số cần đóng ("
                    + Money.format(remaining) + ").");
        }
        String code = nextCode(charge);
        OffsetDateTime now = OffsetDateTime.now(clock);
        Map<String, Object> before = state(charge, paidBefore);

        Payment payment = payments.save(Payment.builder()
                .code(code).charge(charge).amount(cmd.amount()).method(cmd.method()).paidAt(now)
                .collectorId(collectorId).confirmedBy(actor.id()).bankRef(blankToNull(cmd.bankRef()))
                .note(blankToNull(cmd.note())).clientRequestId(cmd.clientRequestId())
                .build());
        charge.markPaid(now);
        Map<String, Object> after = state(charge, charge.getAmount());
        after.put("payment", code);
        after.put("paymentAmount", cmd.amount());
        after.put("method", cmd.method());
        audit.record(actor, "RECORD_PAYMENT", ENTITY, charge.getCode(), before, after);
        notifyHousehold(charge, cmd.amount());
        return new PaymentOutcome(payment, charge, charge.getAmount(), 0, false);
    }

    /**
     * Chuyển khoản ngân hàng đã được SePay xác nhận (04/10): số tiền phải bằng đúng số cần đóng thì mới ghi và khoản
     * chuyển Đã thu; không gắn người đi thu (tiền vào thẳng tài khoản công ty). {@code requestKey} theo mã giao dịch SePay
     * nên SePay gửi lại không ghi lần hai.
     */
    public Payment recordBankTransfer(Long chargeId, long amount, String bankRef, String requestKey) {
        lockRequest(requestKey);
        charges.lockById(chargeId);
        Optional<Payment> existing = payments.findByClientRequestId(requestKey);
        if (existing.isPresent()) {
            return existing.get();
        }
        Charge charge = charges.findByIdWithDetails(chargeId).orElseThrow(CollectionService::chargeNotFound);
        requireCollectable(charge);
        long paidBefore = payments.sumByChargeId(chargeId);
        long remaining = charge.getAmount() - paidBefore;
        if (amount != remaining) {
            throw new BusinessRuleException("TRANSFER_AMOUNT_MISMATCH", "Số tiền chuyển khoản " + Money.format(amount)
                    + " khác số cần đóng " + Money.format(remaining) + ".");
        }
        String code = nextCode(charge);
        OffsetDateTime now = OffsetDateTime.now(clock);
        Map<String, Object> before = state(charge, paidBefore);
        Payment payment = payments.save(Payment.builder()
                .code(code).charge(charge).amount(amount).method(PaymentMethod.TRANSFER).paidAt(now)
                .bankRef(blankToNull(bankRef)).note("Chuyển khoản qua SePay").clientRequestId(requestKey)
                .build());
        charge.markPaid(now);
        Map<String, Object> after = state(charge, charge.getAmount());
        after.put("payment", code);
        after.put("paymentAmount", amount);
        after.put("method", PaymentMethod.TRANSFER);
        audit.recordSystem("RECORD_BANK_TRANSFER", ENTITY, charge.getCode(), before, after);
        notifyHousehold(charge, amount);
        return payment;
    }

    /**
     * Hoàn tiền đã được lãnh đạo duyệt (T58): ghi dòng thanh toán âm (không gắn người đi thu nên tiền mặt đang giữ
     * không đổi), ghi nhận vào sổ ở {@code ledgerPeriod}. Hoàn một phần giữ Đã thu; hoàn hết thì khoản về Chưa thu (O9).
     */
    public Payment recordRefund(Charge charge, long amount, CollectionPeriod ledgerPeriod, String note, String requestKey,
            Long actorId) {
        charges.lockById(charge.getId());
        long paidBefore = payments.sumByChargeId(charge.getId());
        if (amount <= 0 || amount > paidBefore) {
            throw new BusinessRuleException("REFUND_AMOUNT_INVALID",
                    "Số tiền hoàn phải lớn hơn 0 và không vượt số đã thu (" + Money.format(paidBefore) + ").");
        }
        Payment refund = payments.save(Payment.builder()
                .code(nextCode(charge)).charge(charge).amount(-amount).method(PaymentMethod.REFUND)
                .paidAt(OffsetDateTime.now(clock)).confirmedBy(actorId).note(blankToNull(note))
                .clientRequestId(requestKey).ledgerPeriod(ledgerPeriod)
                .build());
        if (paidBefore == amount && charge.getStatus() == ChargeStatus.PAID) {
            charge.markUnpaidAfterRefund();
        }
        return refund;
    }

    /** Đã thu (sau hoàn) của một khoản. */
    @Transactional(readOnly = true)
    public long paidOf(Long chargeId) {
        return payments.sumByChargeId(chargeId);
    }

    /** Các lần thanh toán của một hộ (mọi hình thức), mới nhất trước — danh sách xác nhận trên app người dân. */
    @Transactional(readOnly = true)
    public List<Payment> paymentsOfSubject(Long subjectId) {
        return payments.findBySubjectIdWithCharge(subjectId);
    }

    /** Một lần thanh toán của hộ; của hộ khác trả 404 như không tồn tại. */
    @Transactional(readOnly = true)
    public Payment paymentOfSubject(Long paymentId, Long subjectId) {
        return payments.findByIdWithCharge(paymentId)
                .filter(p -> p.getCharge().getSubject().getId().equals(subjectId))
                .orElseThrow(() -> new NotFoundException("PAYMENT_NOT_FOUND", "Không tìm thấy thanh toán."));
    }

    /** Lịch sử thu của một khoản: các lần thanh toán (theo phạm vi người gọi). */
    @Transactional(readOnly = true)
    public Activity activity(Long chargeId, CurrentUser actor) {
        Charge charge = actor.hasRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.LEADER)
                ? charges.findByIdWithDetails(chargeId).orElseThrow(CollectionService::chargeNotFound)
                : loadInScope(chargeId, actor);
        return new Activity(charge, payments.findByChargeIdOrderByPaidAtAsc(chargeId), payments.sumByChargeId(chargeId));
    }

    /** Đã thu và lần thu gần nhất cho nhiều khoản (danh sách của người đi thu). */
    @Transactional(readOnly = true)
    public Map<Long, ChargeProgress> progressOf(List<Long> chargeIds) {
        Map<Long, ChargeProgress> result = new HashMap<>();
        if (chargeIds.isEmpty()) {
            return result;
        }
        Map<Long, Long> paid = new HashMap<>();
        Map<Long, OffsetDateTime> paidAt = new HashMap<>();
        payments.sumsByChargeIds(chargeIds).forEach(r -> {
            paid.put((Long) r[0], ((Number) r[1]).longValue());
            paidAt.put((Long) r[0], (OffsetDateTime) r[2]);
        });
        chargeIds.forEach(id -> result.put(id, new ChargeProgress(paid.getOrDefault(id, 0L), paidAt.get(id))));
        return result;
    }

    public record ChargeProgress(long paidAmount, OffsetDateTime lastPaidAt) {
    }

    private PaymentOutcome replay(Payment existing, Long chargeId) {
        Charge charge = existing.getCharge();
        if (!charge.getId().equals(chargeId)) {
            throw requestReused();
        }
        long paid = payments.sumByChargeId(chargeId);
        return new PaymentOutcome(existing, charge, paid, charge.getAmount() - paid, true);
    }

    private Charge loadInScope(Long chargeId, CurrentUser actor) {
        Charge charge = charges.findByIdWithDetails(chargeId).orElseThrow(CollectionService::chargeNotFound);
        if (actor.role() == Role.COLLECTOR) {
            scope.requireInScope(charge, actor);
        } else if (!Objects.equals(charge.getCompany().getId(), actor.companyId())) {
            throw chargeNotFound();
        }
        return charge;
    }

    private void requireCollectable(Charge charge) {
        periodGuard.requireOpen(charge.getPeriod());
        if (charge.getStatus() == ChargeStatus.EXEMPT) {
            throw new BusinessRuleException("CHARGE_EXEMPT", "Khoản " + charge.getCode() + " được miễn, không thu.");
        }
        if (charge.getStatus() == ChargeStatus.PAID) {
            throw new BusinessRuleException("CHARGE_ALREADY_PAID", "Khoản " + charge.getCode() + " đã thu đủ.");
        }
        if (charge.getStatus() == ChargeStatus.WRITTEN_OFF) {
            throw new BusinessRuleException("CHARGE_WRITTEN_OFF", "Khoản " + charge.getCode() + " đã xóa nợ, không thu.");
        }
    }

    /** Báo hộ khi người thu ghi tiền: hộ thấy ngay khoản đã được ghi nhận Đã đóng. */
    private void notifyHousehold(Charge charge, long amount) {
        String body = "Đã ghi nhận " + Money.format(amount) + " cho khoản " + charge.getCode() + ", khoản đã đóng.";
        for (Long citizenId : citizenAccounts.findActiveIdsBySubject(charge.getSubject().getId())) {
            notifications.publish(NotificationCommand.toCitizen(citizenId, NotificationKind.RECEIPT,
                    "Đã ghi nhận thu phí " + charge.getPeriod().getCode(), body, null), null);
        }
    }

    private Long collectorFor(PaymentCommand cmd, CurrentUser actor) {
        if (actor.role() == Role.COLLECTOR) {
            return actor.id();
        }
        if (cmd.collectorId() == null) {
            throw new BusinessRuleException("PAYMENT_COLLECTOR_REQUIRED",
                    "Ghi thay phải chọn người đi thu đã nhận tiền.");
        }
        User collector = users.findById(cmd.collectorId())
                .filter(u -> u.getRole() == Role.COLLECTOR && Objects.equals(u.getCompanyId(), actor.companyId()))
                .orElseThrow(() -> new NotFoundException("COLLECTOR_NOT_FOUND", "Không tìm thấy người đi thu của công ty."));
        return collector.getId();
    }

    /**
     * Gửi trùng đồng thời (cùng clientRequestId, kể cả hai khoản khác nhau) phải xếp hàng để lần sau thấy bản ghi của
     * lần trước và trả bản cũ / REQUEST_ID_REUSED, thay vì đụng ràng buộc duy nhất rồi trả 500 (BR-COL-05).
     */
    private void lockRequest(String clientRequestId) {
        payments.lockCodePrefix("req:" + clientRequestId);
    }

    private String nextCode(Charge charge) {
        String prefix = "TT-" + charge.getPeriod().documentToken() + "-";
        payments.lockCodePrefix(prefix); // khóa khoản chỉ khóa một khoản; mã thì dùng chung cả kỳ
        return prefix + "%06d".formatted(payments.maxCodeNumber(prefix) + 1);
    }

    private static Map<String, Object> state(Charge charge, long paid) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", charge.getStatus());
        m.put("chargeAmount", charge.getAmount());
        m.put("paidAmount", paid);
        return m;
    }

    private static ConflictException requestReused() {
        return new ConflictException("REQUEST_ID_REUSED", "Mã yêu cầu đã dùng cho một khoản khác.");
    }

    private static NotFoundException chargeNotFound() {
        return new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu trong phạm vi của bạn.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
