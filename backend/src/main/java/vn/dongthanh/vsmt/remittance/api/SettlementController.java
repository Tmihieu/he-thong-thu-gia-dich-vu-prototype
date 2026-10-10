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
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.common.VietnameseMoneyWords;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.domain.ReceiptMethod;
import vn.dongthanh.vsmt.remittance.domain.Settlement;
import vn.dongthanh.vsmt.remittance.service.SettlementService;
import vn.dongthanh.vsmt.remittance.service.SettlementService.IssueSettlementCommand;

@Tag(name = "Nộp tiền về xã: phiếu quyết toán")
@RestController
@RequestMapping("/api/remittance/settlements")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlements;

    @Operation(summary = "Lập phiếu quyết toán (cán bộ xã) sau hạn dân đóng; số tiền hệ thống tính từ sổ công ty–kỳ."
            + " Mỗi công ty mỗi kỳ một phiếu (409 nếu đã có)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SettlementDto issue(@Valid @RequestBody IssueSettlementRequest req, @AuthenticationPrincipal CurrentUser actor) {
        Settlement s = settlements.issue(new IssueSettlementCommand(req.companyId(), req.periodId(), req.method(),
                req.settleDate(), req.representativeName(), req.documentRef(), req.note()), actor);
        return SettlementDto.of(settlements.get(s.getId(), actor));
    }

    @Operation(summary = "Phiếu quyết toán theo kỳ/công ty; công ty chỉ thấy phiếu của mình")
    @GetMapping
    public List<SettlementDto> list(@RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Long companyId, @AuthenticationPrincipal CurrentUser actor) {
        return settlements.list(periodId, companyId, actor).stream().map(SettlementDto::of).toList();
    }

    @Operation(summary = "Một phiếu quyết toán (để in: số tiền bằng chữ)")
    @GetMapping("/{id}")
    public SettlementDto get(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return SettlementDto.of(settlements.get(id, actor));
    }

    public record IssueSettlementRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long periodId,
            @Schema(description = "Bắt buộc khi chênh lệch khác 0") ReceiptMethod method,
            @Schema(description = "Để trống thì lấy hôm nay") LocalDate settleDate,
            @Schema(description = "Người đại diện công ty; để trống thì lấy người đầu mối công ty") @Size(max = 100) String representativeName,
            @Size(max = 50) String documentRef,
            @Size(max = 500) String note) {
    }

    public record SettlementDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "QT-0926-001") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Công ty phải nộp xã: vận chuyển + xử lý trong tiền mặt") long companyOwes,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Xã phải trả công ty: thu gom trong QR") long communeOwes,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chênh lệch = công ty phải nộp − xã phải trả; dương công ty nộp xã, âm xã trả công ty") long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số tiền chuyển (trị tuyệt đối của chênh lệch) bằng chữ") String amountInWords,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Null khi chênh lệch bằng 0") ReceiptMethod method,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate settleDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) String representativeName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String documentRef,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static SettlementDto of(Settlement s) {
            return new SettlementDto(s.getId(), s.getCode(), s.getCompany().getId(), s.getCompany().getCode(),
                    s.getCompany().getName(), s.getPeriod().getId(), s.getPeriod().getCode(), s.getPeriod().getLabel(),
                    s.getCompanyOwes(), s.getCommuneOwes(), s.getAmount(), VietnameseMoneyWords.read(Math.abs(s.getAmount())),
                    s.getMethod(), s.getSettleDate(), s.getRepresentativeName(), s.getDocumentRef(), s.getNote());
        }
    }
}
