package vn.dongthanh.vsmt.remittance.api;

import java.time.LocalDate;
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
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.common.VietnameseMoneyWords;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceipt;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.domain.ReceiptStatus;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.IssueReceiptCommand;
import vn.dongthanh.vsmt.remittance.service.CompanyReceiptService.ReceiptView;

@Tag(name = "Nộp tiền về xã: phiếu thu công ty")
@RestController
@RequestMapping("/api/remittance/receipts")
@RequiredArgsConstructor
public class CompanyReceiptController {

    private final CompanyReceiptService receipts;

    @Operation(summary = "Lập phiếu thu khi công ty nộp tiền (cán bộ xã); số tiền ≤ còn phải nộp của kỳ")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReceiptDto issue(@Valid @RequestBody IssueReceiptRequest req, @AuthenticationPrincipal CurrentUser actor) {
        CompanyReceipt r = receipts.issue(new IssueReceiptCommand(req.companyId(), req.periodId(), req.amount(),
                req.method(), req.receiptDate(), req.payerName(), req.documentRef(), req.note()), actor);
        return ReceiptDto.of(receipts.get(r.getId(), actor));
    }

    @Operation(summary = "Phiếu thu theo kỳ/công ty, kèm lũy kế đã nộp tới từng phiếu; công ty chỉ thấy phiếu của mình")
    @GetMapping
    public List<ReceiptDto> list(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long companyId, @AuthenticationPrincipal CurrentUser actor) {
        return receipts.list(periodId, companyId, actor).stream().map(ReceiptDto::of).toList();
    }

    @Operation(summary = "Một phiếu thu (để in: số tiền bằng chữ, lũy kế, còn phải nộp)")
    @GetMapping("/{id}")
    public ReceiptDto get(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return ReceiptDto.of(receipts.get(id, actor));
    }

    public record IssueReceiptRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @Positive(message = "phải lớn hơn 0") long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ReceiptMethod method,
            @Schema(description = "Để trống thì lấy hôm nay") LocalDate receiptDate,
            @Schema(description = "Để trống thì lấy người đầu mối công ty") @Size(max = 100) String payerName,
            @Size(max = 50) String documentRef,
            @Size(max = 500) String note) {
    }

    public record ReceiptDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "PT-CT-1026-001") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số tiền bằng chữ (R29)") String amountInWords,
            @Schema(requiredMode = RequiredMode.REQUIRED) ReceiptMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate receiptDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) String payerName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String documentRef,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED) ReceiptStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Lũy kế đã nộp tới phiếu này (R30)") long cumulativePaid,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Phải thu của công ty trong kỳ") long periodDue,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Còn phải nộp sau phiếu này") long remainingAfter) {

        static ReceiptDto of(ReceiptView v) {
            CompanyReceipt r = v.receipt();
            return new ReceiptDto(r.getId(), r.getCode(), r.getCompany().getId(), r.getCompany().getCode(),
                    r.getCompany().getName(), r.getPeriod().getId(), r.getPeriod().getCode(), r.getPeriod().getLabel(),
                    r.getAmount(), VietnameseMoneyWords.read(r.getAmount()), r.getMethod(), r.getReceiptDate(),
                    r.getPayerName(), r.getDocumentRef(), r.getNote(), r.getStatus(), v.cumulativePaid(), v.periodDue(),
                    v.remainingAfter());
        }
    }
}
