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
import vn.dongthanh.vsmt.remittance.domain.CommunePayout;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.service.CommunePayoutService;
import vn.dongthanh.vsmt.remittance.service.CommunePayoutService.IssuePayoutCommand;
import vn.dongthanh.vsmt.remittance.service.CommunePayoutService.PayoutView;

@Tag(name = "Nộp tiền về xã: phiếu chi trả công ty")
@RestController
@RequestMapping("/api/remittance/payouts")
@RequiredArgsConstructor
public class CommunePayoutController {

    private final CommunePayoutService payouts;

    @Operation(summary = "Lập phiếu chi trả công ty khi xã trả lại tiền (cán bộ xã); số tiền ≤ số xã còn phải trả của kỳ")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PayoutDto issue(@Valid @RequestBody IssuePayoutRequest req, @AuthenticationPrincipal CurrentUser actor) {
        CommunePayout p = payouts.issue(
                new IssuePayoutCommand(req.companyId(), req.periodId(), req.amount(), req.method(), req.payoutDate(), req.documentRef(),
                req.note()), actor);
        return PayoutDto.of(payouts.get(p.getId(), actor));
    }

    @Operation(summary = "Phiếu chi trả công ty theo kỳ/công ty, kèm lũy kế xã đã trả; công ty chỉ thấy phiếu của mình")
    @GetMapping
    public List<PayoutDto> list(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long companyId, @AuthenticationPrincipal CurrentUser actor) {
        return payouts.list(periodId, companyId, actor).stream().map(PayoutDto::of).toList();
    }

    @Operation(summary = "Một phiếu chi trả công ty (để in: số tiền bằng chữ, lũy kế, xã còn phải trả)")
    @GetMapping("/{id}")
    public PayoutDto get(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return PayoutDto.of(payouts.get(id, actor));
    }

    public record IssuePayoutRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @Positive(message = "phải lớn hơn 0") long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ReceiptMethod method,
            @Schema(description = "Để trống thì lấy hôm nay") LocalDate payoutDate,
            @Size(max = 50) String documentRef,
            @Size(max = 500) String note) {
    }

    public record PayoutDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "PC-CT-1026-001") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số tiền bằng chữ") String amountInWords,
            @Schema(requiredMode = RequiredMode.REQUIRED) ReceiptMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate payoutDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String documentRef,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Lũy kế xã đã trả tới phiếu này") long cumulativePaid,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số xã phải trả lại công ty của kỳ (= −còn phải nộp)") long periodOwed,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Xã còn phải trả sau phiếu này = số xã phải trả − lũy kế đã trả") long remainingAfter) {

        static PayoutDto of(PayoutView v) {
            CommunePayout p = v.payout();
            return new PayoutDto(p.getId(), p.getCode(), p.getCompany().getId(), p.getCompany().getCode(),
                    p.getCompany().getName(), p.getPeriod().getId(), p.getPeriod().getCode(), p.getPeriod().getLabel(),
                    p.getAmount(), VietnameseMoneyWords.read(p.getAmount()), p.getMethod(), p.getPayoutDate(), p.getDocumentRef(), p.getNote(),
                    v.cumulativePaid(), v.periodOwed(), v.remainingAfter());
        }
    }
}
