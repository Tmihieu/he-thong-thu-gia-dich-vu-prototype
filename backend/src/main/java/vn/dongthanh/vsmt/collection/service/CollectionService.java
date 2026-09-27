package vn.dongthanh.vsmt.collection.service;

import java.time.Clock;
import java.time.LocalDate;
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
import vn.dongthanh.vsmt.collection.domain.CollectionVisit;
import vn.dongthanh.vsmt.collection.domain.CollectionVisitRepository;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.collection.domain.VisitResult;
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
 * Ghi nhận kết quả thu (R20, G4): thanh toán tiền mặt / chuyển khoản và lượt ghé không thu được.
 * Người đi thu chỉ ghi cho khoản trong tổ được giao; quản lý công ty ghi thay cho hộ của công ty mình (phải chọn
 * người đi thu đang giữ tiền). Gửi lại cùng {@code clientRequestId} trả kết quả cũ (sau khi kiểm phạm vi). Khoản
 * chuyển Đã thu khi tổng thanh toán bằng số tiền khoản; thu vượt số còn thiếu bị chặn. Kỳ đã khóa hoặc khoản miễn thì
 * không ghi được.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CollectionService {

    static final String ENTITY = "Charge";

    private final PaymentRepository payments;
    private final CollectionVisitRepository visits;
    private final ChargeRepository charges;
    private final CollectorAssignmentService scope;
    private final UserRepository users;
    private final PeriodGuard periodGuard;
    private final AuditService audit;
    private final Clock clock;

    public record PaymentCommand(Long chargeId, long amount, PaymentMethod method, String clientRequestId,
            String bankRef, String note, Long collectorId) {
    }

    public record VisitCommand(Long chargeId, VisitResult result, LocalDate revisitDate, String note,
            String clientRequestId) {
    }

    public record PaymentOutcome(Payment payment, Charge charge, long paidAmount, long remainingAmount,
            boolean replayed) {
    }

    public record VisitOutcome(CollectionVisit visit, boolean replayed) {
    }

    /** Người dân thanh toán mô phỏng trên app: trả đúng số còn thiếu của khoản thuộc hộ mình. */
    public record CitizenPaymentCommand(Long chargeId, Long subjectId, Long citizenAccountId, String citizenPhone,
            long amount, String clientRequestId) {
    }

    public record Activity(Charge charge, List<Payment> payments, List<CollectionVisit> visits, long paidAmount) {
    }

    public PaymentOutcome recordPayment(PaymentCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COLLECTOR, Role.COMPANY_MANAGER);
        // Khóa dòng khoản TRƯỚC khi nạp: lần thu song song cùng khoản chờ lần trước commit rồi mới đọc trạng thái,
        // tổng đã thu và clientRequestId, nên không thu vượt và gửi trùng thì trả bản ghi cũ.
        charges.lockById(cmd.chargeId());
        Charge charge = loadInScope(cmd.chargeId(), actor);
        Optional<Payment> existing = payments.findByClientRequestId(cmd.clientRequestId());
        if (existing.isPresent()) {
            return replay(existing.get(), cmd.chargeId());
        }
        requireCollectable(charge);
        if (cmd.method() == PaymentMethod.APP_SIMULATED) {
            throw new BusinessRuleException("PAYMENT_METHOD_INVALID",
                    "Thanh toán qua app người dân không ghi nhận ở đây.");
        }
        Long collectorId = collectorFor(cmd, actor);

        long paidBefore = payments.sumByChargeId(charge.getId());
        long remaining = charge.getAmount() - paidBefore;
        if (cmd.amount() <= 0 || cmd.amount() > remaining) {
            throw new BusinessRuleException("PAYMENT_AMOUNT_INVALID", "Số tiền phải lớn hơn 0 và không vượt số còn thiếu ("
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
        long paidAfter = paidBefore + cmd.amount();
        if (paidAfter >= charge.getAmount()) {
            charge.markPaid(now);
        }
        Map<String, Object> after = state(charge, paidAfter);
        after.put("payment", code);
        after.put("paymentAmount", cmd.amount());
        after.put("method", cmd.method());
        audit.record(actor, "RECORD_PAYMENT", ENTITY, charge.getCode(), before, after);
        return new PaymentOutcome(payment, charge, paidAfter, charge.getAmount() - paidAfter, false);
    }

    /**
     * Thanh toán mô phỏng từ app người dân (T40, O1): khoản phải thuộc hộ của tài khoản, số tiền phải bằng đúng số
     * còn thiếu (công ty vừa thu một phần thì app phải tải lại), trả đủ thì khoản chuyển Đã thu.
     */
    public PaymentOutcome recordCitizenPayment(CitizenPaymentCommand cmd) {
        charges.lockById(cmd.chargeId());
        Charge charge = charges.findByIdWithDetails(cmd.chargeId())
                .filter(c -> c.getSubject().getId().equals(cmd.subjectId()))
                .orElseThrow(() -> new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu."));
        Optional<Payment> existing = payments.findByClientRequestId(cmd.clientRequestId());
        if (existing.isPresent()) {
            if (!Objects.equals(existing.get().getCitizenAccountId(), cmd.citizenAccountId())) {
                throw requestReused();
            }
            return replay(existing.get(), cmd.chargeId());
        }
        requireCollectable(charge);

        long paidBefore = payments.sumByChargeId(charge.getId());
        long remaining = charge.getAmount() - paidBefore;
        if (cmd.amount() != remaining) {
            throw new BusinessRuleException("PAYMENT_AMOUNT_CHANGED", "Số tiền cần đóng đã thay đổi, hiện còn "
                    + Money.format(remaining) + ". Vui lòng tải lại trước khi thanh toán.");
        }
        String code = nextCode(charge);
        OffsetDateTime now = OffsetDateTime.now(clock);
        Map<String, Object> before = state(charge, paidBefore);

        Payment payment = payments.save(Payment.builder()
                .code(code).charge(charge).amount(remaining).method(PaymentMethod.APP_SIMULATED).paidAt(now)
                .citizenAccountId(cmd.citizenAccountId()).clientRequestId(cmd.clientRequestId())
                .build());
        charge.markPaid(now);
        Map<String, Object> after = state(charge, charge.getAmount());
        after.put("payment", code);
        after.put("paymentAmount", remaining);
        after.put("method", PaymentMethod.APP_SIMULATED);
        audit.recordCitizen(cmd.citizenPhone(), "RECORD_CITIZEN_PAYMENT", ENTITY, charge.getCode(), before, after);
        return new PaymentOutcome(payment, charge, charge.getAmount(), 0, false);
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

    public VisitOutcome recordVisit(VisitCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COLLECTOR, Role.COMPANY_MANAGER);
        Charge charge = loadInScope(cmd.chargeId(), actor);
        Optional<CollectionVisit> existing = visits.findByClientRequestId(cmd.clientRequestId());
        if (existing.isPresent()) {
            if (!existing.get().getCharge().getId().equals(cmd.chargeId())) {
                throw requestReused();
            }
            return new VisitOutcome(existing.get(), true);
        }
        requireCollectable(charge);
        if (cmd.result() == VisitResult.APPOINTMENT && cmd.revisitDate() == null) {
            throw new BusinessRuleException("VISIT_REVISIT_DATE_REQUIRED", "Hẹn lại phải có ngày hẹn.");
        }
        CollectionVisit visit = visits.save(CollectionVisit.record(charge, cmd.result(), OffsetDateTime.now(clock),
                cmd.revisitDate(), blankToNull(cmd.note()), actor.id(), cmd.clientRequestId()));
        return new VisitOutcome(visit, false);
    }

    /** Lịch sử thu của một khoản: các lần thanh toán và lượt ghé (theo phạm vi người gọi). */
    @Transactional(readOnly = true)
    public Activity activity(Long chargeId, CurrentUser actor) {
        Charge charge = actor.role() == Role.COMMUNE_OFFICER || actor.role() == Role.ADMIN
                ? charges.findByIdWithDetails(chargeId).orElseThrow(CollectionService::chargeNotFound)
                : loadInScope(chargeId, actor);
        return new Activity(charge, payments.findByChargeIdOrderByPaidAtAsc(chargeId),
                visits.findByChargeIdOrderByVisitedAtAsc(chargeId), payments.sumByChargeId(chargeId));
    }

    /** Đã thu và lượt ghé mới nhất cho nhiều khoản (danh sách của người đi thu). */
    @Transactional(readOnly = true)
    public Map<Long, ChargeProgress> progressOf(List<Long> chargeIds) {
        Map<Long, ChargeProgress> result = new HashMap<>();
        if (chargeIds.isEmpty()) {
            return result;
        }
        Map<Long, Long> paid = new HashMap<>();
        payments.sumsByChargeIds(chargeIds).forEach(r -> paid.put((Long) r[0], ((Number) r[1]).longValue()));
        Map<Long, CollectionVisit> latest = new HashMap<>();
        visits.findLatestByChargeIds(chargeIds).forEach(v -> latest.put(v.getCharge().getId(), v));
        chargeIds.forEach(id -> result.put(id, new ChargeProgress(paid.getOrDefault(id, 0L), latest.get(id))));
        return result;
    }

    public record ChargeProgress(long paidAmount, CollectionVisit lastVisit) {
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

    private String nextCode(Charge charge) {
        String prefix = "TT-" + charge.getPeriod().documentToken() + "-";
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
