package vn.dongthanh.vsmt.collection.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.api.BillingController.ChargeDto;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.CollectionVisit;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.domain.VisitResult;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.Activity;
import vn.dongthanh.vsmt.collection.service.CollectionService.ChargeProgress;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentOutcome;
import vn.dongthanh.vsmt.collection.service.CollectionService.VisitCommand;
import vn.dongthanh.vsmt.collection.service.CollectionService.VisitOutcome;
import vn.dongthanh.vsmt.collection.service.CollectorAssignmentService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thu tiền: ghi nhận kết quả thu")
@RestController
@RequestMapping("/api/collection")
@RequiredArgsConstructor
public class PaymentController {

    private final CollectionService collection;
    private final CollectorAssignmentService assignments;

    @Operation(summary = "Danh sách thu của người đi thu: khoản trong tổ được giao, kèm đã thu và lượt ghé mới nhất")
    @GetMapping("/my-work")
    public List<CollectorChargeDto> myWork(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) ChargeStatus status, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "500") @Min(1) @Max(1000) int size, @AuthenticationPrincipal CurrentUser actor) {
        return withProgress(assignments.myCharges(periodId, status, PageRequest.of(page, size, Sort.by("code")), actor));
    }

    private List<CollectorChargeDto> withProgress(Page<Charge> result) {
        Map<Long, ChargeProgress> progress = collection.progressOf(result.getContent().stream().map(Charge::getId).toList());
        LocalDate today = assignments.today();
        return result.getContent().stream()
                .map(c -> CollectorChargeDto.of(ChargeDto.of(c, today), progress.get(c.getId())))
                .toList();
    }

    @Operation(summary = "Hộ được giao của công ty: khoản các tổ công ty phụ trách, kèm đã thu và lượt ghé mới nhất")
    @GetMapping("/company-work")
    public List<CollectorChargeDto> companyWork(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long areaId, @RequestParam(required = false) ChargeStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "1000") @Min(1) @Max(2000) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<Charge> result = assignments.companyCharges(periodId, areaId, status,
                PageRequest.of(page, size, Sort.by("code")), actor);
        return withProgress(result);
    }

    @Operation(summary = "Ghi nhận thanh toán (tiền mặt / chuyển khoản); gửi lại cùng clientRequestId trả kết quả cũ (200)")
    @PostMapping("/payments")
    public ResponseEntity<PaymentResultDto> pay(@Valid @RequestBody PaymentRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        PaymentOutcome r = collection.recordPayment(new PaymentCommand(req.chargeId(), req.amount(), req.method(),
                req.clientRequestId(), req.bankRef(), req.note(), req.collectorId()), actor);
        return ResponseEntity.status(r.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(PaymentResultDto.of(r));
    }

    @Operation(summary = "Ghi lượt ghé không thu được (vắng / hẹn / từ chối); không đổi trạng thái khoản")
    @PostMapping("/visits")
    public ResponseEntity<VisitDto> visit(@Valid @RequestBody VisitRequest req, @AuthenticationPrincipal CurrentUser actor) {
        VisitOutcome r = collection.recordVisit(new VisitCommand(req.chargeId(), req.result(), req.revisitDate(),
                req.note(), req.clientRequestId()), actor);
        return ResponseEntity.status(r.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(VisitDto.of(r.visit()));
    }

    @Operation(summary = "Lịch sử thu của một khoản: thanh toán và lượt ghé")
    @GetMapping("/charges/{id}/activity")
    public ActivityDto activity(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        Activity a = collection.activity(id, actor);
        return new ActivityDto(ChargeDto.of(a.charge(), assignments.today()), a.paidAmount(),
                a.charge().getAmount() - a.paidAmount(), a.payments().stream().map(PaymentDto::of).toList(),
                a.visits().stream().map(VisitDto::of).toList());
    }

    public record PaymentRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @Positive(message = "phải lớn hơn 0") long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") PaymentMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "UUID do client sinh, chống gửi trùng")
            @NotBlank @Size(max = 40) String clientRequestId,
            @Size(max = 50) String bankRef,
            @Size(max = 500) String note,
            @Schema(description = "Bắt buộc khi quản lý công ty ghi thay: người đi thu đã nhận tiền") Long collectorId) {
    }

    public record VisitRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") VisitResult result,
            @Schema(description = "Bắt buộc khi hẹn lại") LocalDate revisitDate,
            @Size(max = 500) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank @Size(max = 40) String clientRequestId) {
    }

    public record PaymentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "TT-1026-000123") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) PaymentMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime paidAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long collectorId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static PaymentDto of(Payment p) {
            return new PaymentDto(p.getId(), p.getCode(), p.getAmount(), p.getMethod(), p.getPaidAt(), p.getCollectorId(),
                    p.getNote());
        }
    }

    public record PaymentResultDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) PaymentDto payment,
            @Schema(requiredMode = RequiredMode.REQUIRED) String chargeCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeStatus chargeStatus,
            @Schema(requiredMode = RequiredMode.REQUIRED) long paidAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long remainingAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "true khi gửi lại cùng clientRequestId") boolean replayed) {

        static PaymentResultDto of(PaymentOutcome r) {
            return new PaymentResultDto(PaymentDto.of(r.payment()), r.charge().getCode(), r.charge().getStatus(),
                    r.paidAmount(), r.remainingAmount(), r.replayed());
        }
    }

    public record VisitDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) VisitResult result,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime visitedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate revisitDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static VisitDto of(CollectionVisit v) {
            return new VisitDto(v.getId(), v.getCharge().getId(), v.getResult(), v.getVisitedAt(), v.getRevisitDate(),
                    v.getNote());
        }
    }

    public record CollectorChargeDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeDto charge,
            @Schema(requiredMode = RequiredMode.REQUIRED) long paidAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long remainingAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) VisitDto lastVisit) {

        static CollectorChargeDto of(ChargeDto c, ChargeProgress p) {
            long paid = p == null ? 0 : p.paidAmount();
            return new CollectorChargeDto(c, paid, c.amount() - paid,
                    p == null || p.lastVisit() == null ? null : VisitDto.of(p.lastVisit()));
        }
    }

    public record ActivityDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeDto charge,
            @Schema(requiredMode = RequiredMode.REQUIRED) long paidAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long remainingAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<PaymentDto> payments,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<VisitDto> visits) {
    }
}
