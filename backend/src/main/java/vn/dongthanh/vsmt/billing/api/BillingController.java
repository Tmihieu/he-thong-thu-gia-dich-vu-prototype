package vn.dongthanh.vsmt.billing.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
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
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeAdjustment;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.billing.service.ChargeCorrectionService;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.SkipReason;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.collection.domain.PaymentRepository;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueResult;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.RequestSummary;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Lập khoản: phiếu yêu cầu thu, khoản phải thu")
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final ChargeRequestService service;
    private final PaymentRepository payments;
    private final ChargeCorrectionService corrections;

    @Operation(summary = "Xem trước phiếu yêu cầu thu: số khoản, tổng tiền, danh sách bỏ qua (không ghi CSDL)")
    @PostMapping("/charge-requests/preview")
    public IssueResultDto preview(@Valid @RequestBody IssueRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return IssueResultDto.of(service.preview(req.toCommand(), actor));
    }

    @Operation(summary = "Phát hành phiếu yêu cầu thu; 201 khi có khoản mới, 200 khi không có khoản mới (không lưu phiếu)")
    @PostMapping("/charge-requests")
    public ResponseEntity<IssueResultDto> publish(@Valid @RequestBody IssueRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        IssueResult result = service.publish(req.toCommand(), actor);
        return ResponseEntity.status(result.requestCode() != null ? HttpStatus.CREATED : HttpStatus.OK)
                .body(IssueResultDto.of(result));
    }

    @Operation(summary = "Phiếu yêu cầu thu đã phát hành, kèm số khoản và tổng tiền (cán bộ xã, quản trị)")
    @GetMapping("/charge-requests")
    public List<ChargeRequestDto> requests(@RequestParam(required = false) Long periodId,
            @AuthenticationPrincipal CurrentUser actor) {
        return service.listRequests(periodId, actor).stream().map(ChargeRequestDto::of).toList();
    }

    @Operation(summary = "Khoản phải thu; công ty chỉ thấy khoản của công ty mình")
    @GetMapping("/charges")
    public ChargePageDto charges(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long areaId, @RequestParam(required = false) ChargeStatus status,
            @RequestParam(required = false) Long subjectId, @RequestParam(required = false) Long companyId,
            @RequestParam(required = false) @Schema(description = "Tìm theo tên hoặc mã hộ") String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(500) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<Charge> result = service.searchCharges(periodId, areaId, status, subjectId, companyId, q,
                PageRequest.of(page, size, Sort.by("code")), actor);
        LocalDate today = service.today();
        Map<Long, Long> refunded = new HashMap<>();
        payments.refundedByChargeIds(result.getContent().stream().map(Charge::getId).toList())
                .forEach(r -> refunded.put((Long) r[0], (Long) r[1]));
        // Lần thu cuối (không tính hoàn) của mỗi khoản: ngày đóng và hình thức.
        Map<Long, Object[]> lastPayment = new HashMap<>();
        payments.paymentsByChargeIds(result.getContent().stream().map(Charge::getId).toList())
                .forEach(r -> lastPayment.put((Long) r[0], r));
        return new ChargePageDto(result.getContent().stream().map(c -> {
            Object[] p = lastPayment.get(c.getId());
            return ChargeDto.of(c, today, refunded.getOrDefault(c.getId(), 0L),
                    p == null ? null : (OffsetDateTime) p[1], p == null ? null : (PaymentMethod) p[2]);
        }).toList(),
                result.getTotalElements(), page, size);
    }

    @Operation(summary = "Chi tiết khoản: các lần thu / hoàn và lịch sử điều chỉnh, hủy")
    @GetMapping("/charges/{id}")
    public ChargeDetailDto charge(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return ChargeDetailDto.of(corrections.detail(id, actor), service.today());
    }

    @Operation(summary = "Điều chỉnh khoản chưa thu lập sai phí theo biểu giá của kỳ (cán bộ xã): chọn lại nhóm giá,"
            + " nhân khẩu / định mức kg; số tiền tính lại. Kỳ chưa khóa, chưa có lần thu")
    @PostMapping("/charges/{id}/adjust")
    public ChargeDto adjust(@PathVariable Long id, @Valid @RequestBody AdjustChargeRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return ChargeDto.of(corrections.adjust(id, req.tariffGroup(), req.memberCount(), req.quotaKg(), req.reason(),
                actor), service.today());
    }

    @Operation(summary = "Hủy khoản lập sai (cán bộ xã), bắt buộc lý do; kỳ chưa khóa, chưa có lần thu")
    @PostMapping("/charges/{id}/cancel")
    public ChargeDto cancel(@PathVariable Long id, @Valid @RequestBody CancelChargeRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return ChargeDto.of(corrections.cancel(id, req.reason(), actor), service.today());
    }

    public record AdjustChargeRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") TariffGroup tariffGroup,
            @Schema(description = "Bắt buộc với nhóm theo nhân khẩu") @Positive(message = "phải lớn hơn 0") Integer memberCount,
            @Schema(description = "Bắt buộc với nhóm tính theo ký (kg/tháng)") @Positive(message = "phải lớn hơn 0") Long quotaKg,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 2000) String reason) {
    }

    public record CancelChargeRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 2000) String reason) {
    }

    public record ChargePaymentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Âm với dòng hoàn tiền") long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) PaymentMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime paidAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {
    }

    public record ChargeAdjustmentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeAdjustment.Type type,
            @Schema(requiredMode = RequiredMode.REQUIRED) long oldAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long newAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) String reason,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) TariffGroup oldTariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) TariffGroup newTariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Nhân khẩu hoặc kg/tháng") Long oldQuantity,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long newQuantity) {
    }

    public record TariffRateOptionDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) TariffGroup group,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đơn giá tháng (đ/hộ, đ/người hoặc đ/kg)") long monthlyTotal,
            @Schema(requiredMode = RequiredMode.REQUIRED) String unitLabel) {
    }

    public record ChargeDetailDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeDto charge,
            @Schema(requiredMode = RequiredMode.REQUIRED) String feeTypeName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long quotaKg,
            @Schema(requiredMode = RequiredMode.REQUIRED) long paidAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED,
                    description = "Cán bộ xã điều chỉnh / hủy được: chưa thu hoặc miễn giảm, chưa có lần thu, kỳ chưa khóa")
            boolean correctable,
            @Schema(requiredMode = RequiredMode.REQUIRED,
                    description = "Điều chỉnh theo biểu giá được: như correctable, thêm khoản Chưa thu tính theo biểu giá")
            boolean adjustable,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Mã biểu giá của kỳ") String tariffCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<TariffRateOptionDto> tariffRates,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ChargePaymentDto> payments,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ChargeAdjustmentDto> adjustments) {

        static ChargeDetailDto of(ChargeCorrectionService.Detail d, LocalDate today) {
            Charge c = d.charge();
            long paid = d.payments().stream().mapToLong(p -> p.getAmount()).sum();
            boolean correctable = c.isCorrectable() && d.payments().isEmpty()
                    && c.getPeriod().getStatus() == PeriodStatus.COLLECTING;
            return new ChargeDetailDto(ChargeDto.of(c, today), c.getFeeType().getName(), c.getPeriod().getLabel(),
                    c.getCompany().getName(), c.getArea().getName(), c.getQuotaKg(), paid, correctable,
                    correctable && c.getStatus() == ChargeStatus.UNPAID && !d.rates().isEmpty(), d.tariffCode(),
                    d.rates().stream().map(r -> new TariffRateOptionDto(r.group(), r.monthlyTotal(), r.unitLabel())).toList(),
                    d.payments().stream().map(p -> new ChargePaymentDto(p.getId(), p.getCode(), p.getAmount(),
                            p.getMethod(), p.getPaidAt(), p.getNote())).toList(),
                    d.adjustments().stream().map(a -> new ChargeAdjustmentDto(a.getId(), a.getType(), a.getOldAmount(),
                            a.getNewAmount(), a.getReason(), a.getCreatedAt(), a.getOldTariffGroup(), a.getNewTariffGroup(),
                            a.getOldQuantity(), a.getNewQuantity())).toList());
        }
    }

    public record IssueRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long feeTypeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ChargeScope scopeType,
            @Schema(description = "Bắt buộc khi scopeType = AREAS") List<@NotNull Long> areaIds,
            @Schema(description = "Bắt buộc khi scopeType = COMPANY") Long companyId,
            @Schema(description = "Chỉ với loại phí giá cố định; trống thì dùng giá mặc định") @PositiveOrZero Long unitPrice,
            @Size(max = 2000) String note) {

        IssueCommand toCommand() {
            return new IssueCommand(periodId, feeTypeId, scopeType, areaIds, companyId, unitPrice, note);
        }
    }

    public record SkippedDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long subjectId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) SkipReason reason,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean warning,
            @Schema(requiredMode = RequiredMode.REQUIRED) String message) {
    }

    public record IssueResultDto(
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Null khi không có khoản mới")
            String requestCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) int chargeCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) int exemptCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long totalAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) int warningCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<SkippedDto> skipped,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số hộ bị bỏ qua theo từng lý do (chỉ lý do có hộ)")
            Map<SkipReason, Long> skippedByReason,
            List<vn.dongthanh.vsmt.billing.service.ChargeRequestService.PreviewCharge> plannedCharges) {

        static IssueResultDto of(IssueResult r) {
            return new IssueResultDto(r.requestCode(), r.chargeCount(), r.exemptCount(), r.totalAmount(),
                    r.warningCount(), r.skipped().stream().map(s -> new SkippedDto(s.subjectId(), s.subjectCode(),
                            s.subjectName(), s.areaCode(), s.reason(), s.reason().warning(), s.message())).toList(),
                    r.skipped().stream().collect(java.util.stream.Collectors.groupingBy(s -> s.reason(),
                            () -> new java.util.EnumMap<>(SkipReason.class), java.util.stream.Collectors.counting())),
                    r.plannedCharges());
        }
    }

    public record ChargeRequestDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "YCT-1026-01") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String feeTypeCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String feeTypeName,
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeScope scopeType,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate issueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long unitPrice,
            @Schema(requiredMode = RequiredMode.REQUIRED) long chargeCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long exemptCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long totalAmount) {

        static ChargeRequestDto of(RequestSummary s) {
            var r = s.request();
            return new ChargeRequestDto(r.getId(), r.getCode(), r.getPeriod().getId(), r.getPeriod().getCode(),
                    r.getFeeType().getCode(), r.getFeeType().getName(), r.getScopeType(), r.getIssueDate(),
                    r.getUnitPrice(), s.chargeCount(), s.exemptCount(), s.totalAmount());
        }
    }

    public record ChargeDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KT-1026-DTH-H000128") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String requestCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long subjectId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectAddress,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String feeTypeCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) long unitPrice,
            @Schema(requiredMode = RequiredMode.REQUIRED) int months,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Hạn nộp của kỳ (hạn duy nhất)") LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chưa thu và đã qua hạn nộp của kỳ") boolean overdue,
            @Schema(requiredMode = RequiredMode.REQUIRED,
                    description = "Tổng đã hoàn của khoản (số dương); chỉ điền ở GET /api/billing/charges, nơi khác là 0") long refunded,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Số nhân khẩu chụp trên khoản theo nhân khẩu, không có thì số hiện tại của hộ; nguồn thải là null") Integer memberCount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Ngày giờ đóng (lần thu cuối); chỉ điền ở GET /api/billing/charges, khoản chưa thu là null")
            OffsetDateTime paidAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Hình thức đóng (tiền mặt / chuyển khoản); chỉ điền ở GET /api/billing/charges")
            PaymentMethod paymentMethod,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Lý do hủy; chỉ khoản Đã hủy")
            String cancelReason,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime cancelledAt) {

        public static ChargeDto of(Charge c, LocalDate today) {
            return of(c, today, 0);
        }

        public static ChargeDto of(Charge c, LocalDate today, long refunded) {
            return of(c, today, refunded, null, null);
        }

        public static ChargeDto of(Charge c, LocalDate today, long refunded, OffsetDateTime paidAt,
                PaymentMethod paymentMethod) {
            return new ChargeDto(c.getId(), c.getCode(), c.getChargeRequest().getCode(), c.getSubject().getId(),
                    c.getSubject().getCode(), c.getSubject().getName(), c.getSubject().getAddress(), c.getArea().getId(),
                    c.getArea().getCode(), c.getCompany().getId(), c.getCompany().getCode(), c.getPeriod().getId(),
                    c.getPeriod().getCode(), c.getFeeType().getCode(), c.getTariffGroup(), c.getUnitPrice(),
                    c.getMonths(), c.getAmount(), c.getPeriod().getDueDate(), c.getStatus(), c.isOverdue(today), refunded,
                    c.getMemberCount() != null ? c.getMemberCount() : c.getSubject().getMemberCount(), paidAt, paymentMethod,
                    c.getCancelReason(), c.getCancelledAt());
        }
    }

    public record ChargePageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ChargeDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) int page,
            @Schema(requiredMode = RequiredMode.REQUIRED) int size) {
    }
}
