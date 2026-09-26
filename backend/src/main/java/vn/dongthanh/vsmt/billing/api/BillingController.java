package vn.dongthanh.vsmt.billing.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.SkipReason;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueResult;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.RequestSummary;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Lập khoản: phiếu yêu cầu thu, khoản phải thu")
@RestController
@RequestMapping("/api/billing")
@RequiredArgsConstructor
public class BillingController {

    private final ChargeRequestService service;

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
            @RequestParam(required = false) Long subjectId, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(500) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<Charge> result = service.searchCharges(periodId, areaId, status, subjectId,
                PageRequest.of(page, size, Sort.by("code")), actor);
        LocalDate today = service.today();
        return new ChargePageDto(result.getContent().stream().map(c -> ChargeDto.of(c, today)).toList(),
                result.getTotalElements(), page, size);
    }

    public record IssueRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long feeTypeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ChargeScope scopeType,
            @Schema(description = "Bắt buộc khi scopeType = AREAS") List<@NotNull Long> areaIds,
            @Schema(description = "Bắt buộc khi scopeType = COMPANY") Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Hạn hộ đóng, không sau hạn công ty nộp xã")
            @NotNull(message = "không được để trống") LocalDate dueDate,
            @Schema(description = "Chỉ với loại phí giá cố định; trống thì dùng giá mặc định") @PositiveOrZero Long unitPrice,
            @Size(max = 2000) String note) {

        IssueCommand toCommand() {
            return new IssueCommand(periodId, feeTypeId, scopeType, areaIds, companyId, dueDate, unitPrice, note);
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
            @Schema(requiredMode = RequiredMode.REQUIRED) List<SkippedDto> skipped) {

        static IssueResultDto of(IssueResult r) {
            return new IssueResultDto(r.requestCode(), r.chargeCount(), r.exemptCount(), r.totalAmount(),
                    r.warningCount(), r.skipped().stream().map(s -> new SkippedDto(s.subjectId(), s.subjectCode(),
                            s.subjectName(), s.areaCode(), s.reason(), s.reason().warning(), s.message())).toList());
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
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long unitPrice,
            @Schema(requiredMode = RequiredMode.REQUIRED) long chargeCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long exemptCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long totalAmount) {

        static ChargeRequestDto of(RequestSummary s) {
            var r = s.request();
            return new ChargeRequestDto(r.getId(), r.getCode(), r.getPeriod().getId(), r.getPeriod().getCode(),
                    r.getFeeType().getCode(), r.getFeeType().getName(), r.getScopeType(), r.getIssueDate(),
                    r.getDueDate(), r.getUnitPrice(), s.chargeCount(), s.exemptCount(), s.totalAmount());
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
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chưa thu và đã qua hạn đóng") boolean overdue) {

        static ChargeDto of(Charge c, LocalDate today) {
            return new ChargeDto(c.getId(), c.getCode(), c.getChargeRequest().getCode(), c.getSubject().getId(),
                    c.getSubject().getCode(), c.getSubject().getName(), c.getSubject().getAddress(), c.getArea().getId(),
                    c.getArea().getCode(), c.getCompany().getId(), c.getCompany().getCode(), c.getPeriod().getId(),
                    c.getPeriod().getCode(), c.getFeeType().getCode(), c.getTariffGroup(), c.getUnitPrice(),
                    c.getMonths(), c.getAmount(), c.getDueDate(), c.getStatus(), c.isOverdue(today));
        }
    }

    public record ChargePageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ChargeDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) int page,
            @Schema(requiredMode = RequiredMode.REQUIRED) int size) {
    }
}
