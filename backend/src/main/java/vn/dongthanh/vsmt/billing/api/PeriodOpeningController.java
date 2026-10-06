package vn.dongthanh.vsmt.billing.api;

import java.time.LocalDate;
import java.util.List;

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
import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.DraftPreview;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.PublishResult;
import vn.dongthanh.vsmt.billing.service.PeriodPublishService.Scope;
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
        DraftPreview p = service.preview(id, req.openDate(), req.companyDueDate(),
                scope(req.feeTypeId(), req.scopeType(), req.areaIds(), req.companyId(), req.unitPrice()), actor);
        return new DraftPreviewDto(PeriodDto.of(p.period()), IssueResultDto.of(p.result()));
    }

    @Operation(summary = "Mở kỳ dự thảo và phát hành phiếu yêu cầu thu theo phạm vi chọn, mặc định toàn xã (cán bộ xã), trong một bước")
    @PostMapping("/{id}/publish")
    public PublishPeriodDto publish(@PathVariable Long id, @Valid @RequestBody PublishPeriodRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        PublishResult r = service.publish(id, req.openDate(), req.companyDueDate(), req.note(),
                scope(req.feeTypeId(), req.scopeType(), req.areaIds(), req.companyId(), req.unitPrice()), actor);
        return new PublishPeriodDto(PeriodDto.of(r.period()), IssueResultDto.of(r.result()));
    }

    public record DraftPreviewRequest(
            @Schema(description = "Ngày mở kỳ; trống thì giữ ngày của dự thảo (đầu kỳ)") LocalDate openDate,
            @Schema(description = "Hạn nộp (hạn duy nhất của kỳ); trống thì giữ hạn của dự thảo") LocalDate companyDueDate,
            @Schema(description = "Loại phí; trống thì phí vệ sinh môi trường") Long feeTypeId,
            @Schema(description = "Phạm vi; trống thì toàn xã") ChargeScope scopeType,
            @Schema(description = "Bắt buộc khi scopeType = AREAS") List<Long> areaIds,
            @Schema(description = "Bắt buộc khi scopeType = COMPANY") Long companyId,
            @Schema(description = "Chỉ với loại phí giá cố định") Long unitPrice) {
    }

    public record PublishPeriodRequest(
            @Schema(description = "Ngày mở kỳ; trống thì giữ ngày của dự thảo (đầu kỳ)") LocalDate openDate,
            @Schema(description = "Hạn nộp (hạn duy nhất của kỳ); trống thì giữ hạn của dự thảo") LocalDate companyDueDate,
            @Schema(description = "Loại phí; trống thì phí vệ sinh môi trường") Long feeTypeId,
            @Schema(description = "Phạm vi; trống thì toàn xã") ChargeScope scopeType,
            @Schema(description = "Bắt buộc khi scopeType = AREAS") List<Long> areaIds,
            @Schema(description = "Bắt buộc khi scopeType = COMPANY") Long companyId,
            @Schema(description = "Chỉ với loại phí giá cố định") Long unitPrice,
            @Size(max = 2000) String note) {
    }

    private static Scope scope(Long feeTypeId, ChargeScope scopeType, List<Long> areaIds, Long companyId, Long unitPrice) {
        return scopeType == null ? null : new Scope(feeTypeId, scopeType, areaIds, companyId, unitPrice);
    }

    public record DraftPreviewDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodDto period,
            @Schema(requiredMode = RequiredMode.REQUIRED) IssueResultDto result) {
    }

    public record PublishPeriodDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) PeriodDto period,
            @Schema(requiredMode = RequiredMode.REQUIRED) IssueResultDto result) {
    }
}
