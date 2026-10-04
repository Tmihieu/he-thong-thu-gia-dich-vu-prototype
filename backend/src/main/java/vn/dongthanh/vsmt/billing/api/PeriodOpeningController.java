package vn.dongthanh.vsmt.billing.api;

import java.time.LocalDate;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.api.BillingController.IssueResultDto;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.DraftPreview;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.PublishResult;
import vn.dongthanh.vsmt.masterdata.api.PeriodController.PeriodDto;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Lập khoản: mở kỳ dự thảo")
@RestController
@RequestMapping("/api/billing/periods")
@RequiredArgsConstructor
public class PeriodOpeningController {

    private final PeriodPublishService service;

    @Operation(summary = "Xem trước các khoản sẽ lập khi mở kỳ dự thảo (cán bộ xã, không ghi khoản)")
    @PostMapping("/{id}/draft-preview")
    public DraftPreviewDto preview(@PathVariable Long id, @Valid @RequestBody DraftPreviewRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        DraftPreview p = service.preview(id, req.householdDueDate(), actor);
        return new DraftPreviewDto(PeriodDto.of(p.period()), p.dueDate(), IssueResultDto.of(p.result()));
    }

    @Operation(summary = "Mở kỳ dự thảo và phát hành phiếu yêu cầu thu cho toàn xã (cán bộ xã), trong một bước")
    @PostMapping("/{id}/publish")
    public PublishPeriodDto publish(@PathVariable Long id, @Valid @RequestBody PublishPeriodRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        PublishResult r = service.publish(id, req.householdDueDate(), req.note(), actor);
        return new PublishPeriodDto(PeriodDto.of(r.period()), IssueResultDto.of(r.result()));
    }

    public record DraftPreviewRequest(
            @Schema(description = "Hạn hộ đóng; trống thì theo quy tắc của quản trị") LocalDate householdDueDate) {
    }

    public record PublishPeriodRequest(
            @Schema(description = "Hạn hộ đóng; trống thì theo quy tắc của quản trị") LocalDate householdDueDate,
            @Size(max = 2000) String note) {
    }

    public record DraftPreviewDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodDto period,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Hạn hộ đóng đã dùng để tính xem trước")
            LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) IssueResultDto result) {
    }

    public record PublishPeriodDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodDto period,
            @Schema(requiredMode = RequiredMode.REQUIRED) IssueResultDto result) {
    }
}
