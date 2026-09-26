package vn.dongthanh.vsmt.collection.api;

import java.time.LocalDate;
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
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.api.BillingController.ChargeDto;
import vn.dongthanh.vsmt.billing.api.BillingController.ChargePageDto;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.collection.domain.CollectorAssignment;
import vn.dongthanh.vsmt.collection.service.CollectorAssignmentService;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thu tiền: phân tổ người đi thu, khoản theo phạm vi")
@RestController
@RequestMapping("/api/collection")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectorAssignmentService service;

    @Operation(summary = "Người đi thu của công ty (quản lý công ty)")
    @GetMapping("/collectors")
    public List<CollectorDto> collectors(@AuthenticationPrincipal CurrentUser actor) {
        return service.collectorsOf(actor).stream().map(CollectorDto::of).toList();
    }

    @Operation(summary = "Phân tổ đang hiệu lực vào ngày (mặc định hôm nay), theo phạm vi người gọi")
    @GetMapping("/collector-assignments")
    public List<CollectorAssignmentDto> assignments(@RequestParam(required = false) LocalDate date,
            @AuthenticationPrincipal CurrentUser actor) {
        return service.activeOn(date != null ? date : service.today(), actor).stream()
                .map(CollectorAssignmentDto::of).toList();
    }

    @Operation(summary = "Phân tổ cho người đi thu (quản lý công ty); người cũ của tổ kết thúc vào ngày trước")
    @PostMapping("/collector-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public List<CollectorAssignmentDto> assign(@Valid @RequestBody AssignCollectorRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return service.assign(req.collectorId(), req.areaIds(), req.fromDate(), req.note(), actor).stream()
                .map(CollectorAssignmentDto::of).toList();
    }

    @Operation(summary = "Kết thúc phân tổ vào ngày endDate (quản lý công ty)")
    @PostMapping("/collector-assignments/{id}/end")
    public CollectorAssignmentDto end(@PathVariable Long id, @Valid @RequestBody EndAssignmentRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return CollectorAssignmentDto.of(service.end(id, req.endDate(), actor));
    }

    @Operation(summary = "Khoản của hộ trong các tổ được giao (người đi thu)")
    @GetMapping("/my-charges")
    public ChargePageDto myCharges(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) ChargeStatus status, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "200") @Min(1) @Max(500) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<Charge> result = service.myCharges(periodId, status, PageRequest.of(page, size, Sort.by("code")), actor);
        LocalDate today = service.today();
        return new ChargePageDto(result.getContent().stream().map(c -> ChargeDto.of(c, today)).toList(),
                result.getTotalElements(), page, size);
    }

    @Operation(summary = "Một khoản trong phạm vi người đi thu; ngoài tổ được giao → 404")
    @GetMapping("/my-charges/{id}")
    public ChargeDto myCharge(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return ChargeDto.of(service.myCharge(id, actor), service.today());
    }

    public record AssignCollectorRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long collectorId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotEmpty(message = "phải chọn ít nhất một tổ")
            List<@NotNull Long> areaIds,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") LocalDate fromDate,
            @Size(max = 2000) String note) {
    }

    public record EndAssignmentRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") LocalDate endDate) {
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

    public record CollectorAssignmentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long collectorId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String collectorUsername,
            @Schema(requiredMode = RequiredMode.REQUIRED) String collectorName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate validFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate validTo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static CollectorAssignmentDto of(CollectorAssignment a) {
            return new CollectorAssignmentDto(a.getId(), a.getCollector().getId(), a.getCollector().getUsername(),
                    a.getCollector().getFullName(), a.getArea().getId(), a.getArea().getCode(), a.getArea().getName(),
                    a.getCompany().getId(), a.getValidFrom(), a.getValidTo(), a.getNote());
        }
    }
}
