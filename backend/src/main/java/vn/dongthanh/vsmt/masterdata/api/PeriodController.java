package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService;
import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: kỳ thu")
@RestController
@RequestMapping("/api/masterdata/periods")
@RequiredArgsConstructor
public class PeriodController {

    private final PeriodService periods;
    private final PeriodAutoService auto;

    @Operation(summary = "Danh sách kỳ thu đã mở, mới nhất trước (không gồm kỳ dự thảo); có date thì chỉ các kỳ chứa ngày đó")
    @GetMapping
    public List<PeriodDto> list(@RequestParam(required = false) LocalDate date) {
        List<CollectionPeriod> result = date == null ? periods.list() : periods.covering(date);
        return result.stream().map(PeriodDto::of).toList();
    }

    @Operation(summary = "Kỳ dự thảo hệ thống tự tạo, chờ cán bộ xã mở (cán bộ xã, quản trị)")
    @GetMapping("/drafts")
    public List<PeriodDto> drafts(@AuthenticationPrincipal CurrentUser actor) {
        return auto.drafts(actor).stream().map(PeriodDto::of).toList();
    }

    @Operation(summary = "Chi tiết kỳ thu")
    @GetMapping("/{id}")
    public PeriodDto get(@PathVariable Long id) {
        return PeriodDto.of(periods.get(id));
    }

    @Operation(summary = "Tạo kỳ thu tháng/quý dự thảo (quản trị) và báo cán bộ xã; cán bộ xã đặt ngày mở, hạn nộp rồi mở kỳ")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PeriodDto open(@Valid @RequestBody OpenPeriodRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return PeriodDto.of(auto.createDraft(req.type(), req.year(), req.number(), actor));
    }

    public record OpenPeriodRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") PeriodType type,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "2026") @Min(2020) @Max(2100) int year,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "10", description = "Tháng 1–12 hoặc quý 1–4")
            @Min(1) @Max(12) int number) {
    }

    public record PeriodDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "2026-10") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodType periodType,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "Tháng 10/2026") String label,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate startDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate endDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate openDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Hạn dân đóng") LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Hạn quyết toán: ngày 5 tháng sau kỳ") LocalDate settlementDueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long tariffVersionId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "BG-65-2026") String tariffVersionCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime lockedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        public static PeriodDto of(CollectionPeriod p) {
            return new PeriodDto(p.getId(), p.getCode(), p.getPeriodType(), p.getLabel(), p.getStartDate(),
                    p.getEndDate(), p.getOpenDate(), p.getDueDate(), p.getSettlementDueDate(), p.getTariffVersion().getId(),
                    p.getTariffVersion().getCode(), p.getStatus(), p.getLockedAt(), p.getNote());
        }
    }
}
