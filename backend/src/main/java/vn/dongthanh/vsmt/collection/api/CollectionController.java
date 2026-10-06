package vn.dongthanh.vsmt.collection.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
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
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.api.BillingController.ChargeDto;
import vn.dongthanh.vsmt.billing.api.BillingController.ChargePageDto;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.domain.SubjectReportType;
import vn.dongthanh.vsmt.collection.service.CollectorWorkService;
import vn.dongthanh.vsmt.collection.service.SubjectReportService;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thu tiền: người đi thu, khoản của công ty, báo sai thông tin hộ")
@RestController
@RequestMapping("/api/collection")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectorWorkService service;
    private final SubjectReportService subjectReports;

    @Operation(summary = "Người đi thu của công ty (quản lý công ty)")
    @GetMapping("/collectors")
    public List<CollectorDto> collectors(@AuthenticationPrincipal CurrentUser actor) {
        return service.collectorsOf(actor).stream().map(CollectorDto::of).toList();
    }

    @Operation(summary = "Lịch sử thu của một người đi thu của công ty, mới trước (UC-33, quản lý công ty)")
    @GetMapping("/collectors/{collectorId}/payments")
    public List<CollectorPaymentDto> collectorPayments(@PathVariable Long collectorId,
            @AuthenticationPrincipal CurrentUser actor) {
        return service.paymentsOf(collectorId, actor).stream().map(CollectorPaymentDto::of).toList();
    }

    @Operation(summary = "Khoản của mọi hộ thuộc công ty (người đi thu)")
    @GetMapping("/my-charges")
    public ChargePageDto myCharges(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) ChargeStatus status, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "200") @Min(1) @Max(500) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<Charge> result = service.companyCharges(periodId, null, status, PageRequest.of(page, size, Sort.by("code")), actor);
        LocalDate today = service.today();
        return new ChargePageDto(result.getContent().stream().map(c -> ChargeDto.of(c, today)).toList(),
                result.getTotalElements(), page, size);
    }

    @Operation(summary = "Một khoản của công ty người đi thu; công ty khác → 404")
    @GetMapping("/my-charges/{id}")
    public ChargeDto myCharge(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return ChargeDto.of(service.myCharge(id, actor), service.today());
    }

    @Operation(summary = "Người đi thu báo hộ của một khoản của công ty đã chuyển đi / sai thông tin;"
            + " thông báo tới xã và công ty")
    @PostMapping("/subject-reports")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportSubject(@Valid @RequestBody SubjectReportRequest req, @AuthenticationPrincipal CurrentUser actor) {
        subjectReports.report(req.chargeId(), req.reportType(), req.description(), actor);
    }

    public record SubjectReportRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống")
            SubjectReportType reportType,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 1000, message = "tối đa 1000 ký tự") String description) {
    }

    public record CollectorDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String username,
            @Schema(requiredMode = RequiredMode.REQUIRED) String fullName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean active) {

        static CollectorDto of(User u) {
            return new CollectorDto(u.getId(), u.getUsername(), u.getFullName(), u.getPhone(), u.isActive());
        }
    }

    public record CollectorPaymentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "TT-1026-000123") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime paidAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) PaymentMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String chargeCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectName) {

        static CollectorPaymentDto of(Payment p) {
            var c = p.getCharge();
            return new CollectorPaymentDto(p.getId(), p.getCode(), p.getPaidAt(), p.getAmount(), p.getMethod(),
                    c.getId(), c.getCode(), c.getPeriod().getCode(), c.getSubject().getCode(), c.getSubject().getName());
        }
    }
}
