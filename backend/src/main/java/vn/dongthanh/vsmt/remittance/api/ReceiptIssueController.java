package vn.dongthanh.vsmt.remittance.api;

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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssue;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueStatus;
import vn.dongthanh.vsmt.remittance.domain.ReceiptIssueType;
import vn.dongthanh.vsmt.remittance.service.ReceiptIssueService;

@Tag(name = "Nộp tiền về xã: sai sót phiếu thu")
@RestController
@RequestMapping("/api/remittance/receipt-issues")
@RequiredArgsConstructor
public class ReceiptIssueController {

    private final ReceiptIssueService issues;

    @Operation(summary = "Công ty báo sai sót trên phiếu thu của mình; thông báo tới cán bộ xã")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IssueDto report(@Valid @RequestBody ReportIssueRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return IssueDto.of(issues.report(req.receiptId(), req.issueType(), req.correctAmount(), req.description(), actor));
    }

    @Operation(summary = "Sai sót phiếu thu; công ty chỉ thấy sai sót trên phiếu của mình")
    @GetMapping
    public List<IssueDto> list(@RequestParam(required = false) ReceiptIssueStatus status,
            @AuthenticationPrincipal CurrentUser actor) {
        return issues.list(status, actor).stream().map(IssueDto::of).toList();
    }

    @Operation(summary = "Xã đánh dấu đã xử lý kèm ghi chú kết quả (không sửa phiếu, G6); thông báo về công ty")
    @PostMapping("/{id}/resolve")
    public IssueDto resolve(@PathVariable Long id, @Valid @RequestBody ResolveIssueRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return IssueDto.of(issues.resolve(id, req.resolutionNote(), actor));
    }

    public record ReportIssueRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long receiptId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ReceiptIssueType issueType,
            @Schema(description = "Nên nhập khi sai số tiền") @PositiveOrZero(message = "không được âm") Long correctAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 1000, message = "tối đa 1000 ký tự") String description) {
    }

    public record ResolveIssueRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 1000, message = "tối đa 1000 ký tự") String resolutionNote) {
    }

    public record IssueDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long receiptId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String receiptCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) long receiptAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) ReceiptIssueType issueType,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long correctAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) String description,
            @Schema(requiredMode = RequiredMode.REQUIRED) ReceiptIssueStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime reportedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime resolvedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String resolutionNote) {

        static IssueDto of(ReceiptIssue i) {
            CompanyReceipt r = i.getReceipt();
            return new IssueDto(i.getId(), r.getId(), r.getCode(), r.getAmount(), r.getCompany().getId(),
                    r.getCompany().getCode(), r.getCompany().getName(), r.getPeriod().getLabel(), i.getIssueType(),
                    i.getCorrectAmount(), i.getDescription(), i.getStatus(), i.getCreatedAt(), i.getResolvedAt(),
                    i.getResolutionNote());
        }
    }
}
