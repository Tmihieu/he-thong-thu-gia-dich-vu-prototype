package vn.dongthanh.vsmt.masterdata.api;

import java.time.OffsetDateTime;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.api.PeriodController.PeriodDto;
import vn.dongthanh.vsmt.masterdata.domain.PeriodAutoRule;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService.DraftRun;
import vn.dongthanh.vsmt.masterdata.service.PeriodAutoService.RuleCommand;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: quy tắc tự tạo kỳ thu")
@RestController
@RequestMapping("/api/masterdata/period-rule")
@RequiredArgsConstructor
public class PeriodRuleController {

    private final PeriodAutoService service;

    @Operation(summary = "Quy tắc tự tạo kỳ thu dự thảo (quản trị)")
    @GetMapping
    public PeriodRuleDto get(@AuthenticationPrincipal CurrentUser actor) {
        return PeriodRuleDto.of(service.rule(actor));
    }

    @Operation(summary = "Sửa quy tắc tự tạo kỳ thu: bật/tắt, chu kỳ, ngày tạo, số ngày hạn (quản trị)")
    @PutMapping
    public PeriodRuleDto update(@Valid @RequestBody PeriodRuleRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return PeriodRuleDto.of(service.updateRule(new RuleCommand(req.enabled(), req.periodType(), req.createDay(),
                req.householdDueDays(), req.remitDueDays()), actor));
    }

    @Operation(summary = "Chạy ngay quy tắc để thử (quản trị): tạo kỳ dự thảo nếu đã tới ngày, không thì cho biết lý do")
    @PostMapping("/run")
    public DraftRunDto run(@AuthenticationPrincipal CurrentUser actor) {
        DraftRun r = service.runNow(actor);
        return new DraftRunDto(r.created() != null, r.message(), r.created() == null ? null : PeriodDto.of(r.created()));
    }

    public record PeriodRuleRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean enabled,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") PeriodType periodType,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "25",
                    description = "Từ ngày này trong tháng thì tạo kỳ kế tiếp (kỳ quý: tháng cuối quý)")
            @Min(1) @Max(28) int createDay,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "15",
                    description = "Hạn hộ đóng mặc định = ngày phát hành + số ngày này")
            @Min(1) @Max(365) int householdDueDays,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "10",
                    description = "Hạn công ty nộp xã = ngày cuối kỳ + số ngày này")
            @Min(0) @Max(365) int remitDueDays) {
    }

    public record PeriodRuleDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean enabled,
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodType periodType,
            @Schema(requiredMode = RequiredMode.REQUIRED) int createDay,
            @Schema(requiredMode = RequiredMode.REQUIRED) int householdDueDays,
            @Schema(requiredMode = RequiredMode.REQUIRED) int remitDueDays,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime updatedAt) {

        static PeriodRuleDto of(PeriodAutoRule r) {
            return new PeriodRuleDto(r.isEnabled(), r.getPeriodType(), r.getCreateDay(), r.getHouseholdDueDays(),
                    r.getRemitDueDays(), r.getUpdatedAt());
        }
    }

    public record DraftRunDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean created,
            @Schema(requiredMode = RequiredMode.REQUIRED) String message,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) PeriodDto period) {
    }
}
