package vn.dongthanh.vsmt.remittance.api;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.AreaProgressService;
import vn.dongthanh.vsmt.remittance.service.AreaProgressService.AreaProgress;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.LedgerRow;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Progress;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Reconciliation;

@Tag(name = "Nộp tiền về xã: sổ công ty–kỳ")
@RestController
@RequestMapping("/api/remittance")
@RequiredArgsConstructor
public class LedgerController {

    private final CompanyLedgerService ledger;
    private final AreaProgressService areaProgress;

    @Operation(summary = "Sổ công ty–kỳ: phải thu, đã thu (tiền mặt, chuyển khoản), phí thu gom giữ lại, phải nộp xã, đã nộp, còn nộp, nợ kỳ trước, tiến độ, đối soát."
            + " Xã và quản trị thấy mọi công ty; công ty chỉ thấy dòng của mình")
    @GetMapping("/ledger")
    public List<LedgerRowDto> ledger(@RequestParam Long periodId, @AuthenticationPrincipal CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER, Role.LEADER);
        if (actor.role() == Role.COMPANY_MANAGER) {
            return List.of(LedgerRowDto.of(ledger.row(actor.companyId(), periodId)));
        }
        return ledger.ledger(periodId).stream().map(LedgerRowDto::of).toList();
    }

    @Operation(summary = "Tiến độ thu theo tổ trong kỳ (công ty theo khoản đã phát hành; tổ chưa có công ty đánh dấu)."
            + " Công ty chỉ thấy tổ của mình")
    @GetMapping("/area-progress")
    public List<AreaProgressDto> areaProgress(@RequestParam Long periodId, @AuthenticationPrincipal CurrentUser actor) {
        return areaProgress.progress(periodId, actor).stream().map(AreaProgressDto::of).toList();
    }

    public record AreaProgressDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String districtCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) long due,
            @Schema(requiredMode = RequiredMode.REQUIRED) long collected,
            @Schema(requiredMode = RequiredMode.REQUIRED) long chargeCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long paidCount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số khoản miễn giảm 100%") long exemptCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long subjectCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) double collectionRate,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean lowCollectionRate,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tổ chưa có công ty (R13)") boolean noCompany) {

        static AreaProgressDto of(AreaProgress p) {
            return new AreaProgressDto(p.area().getId(), p.area().getCode(), p.area().getName(),
                    p.area().getDistrict().getCode(), p.company() == null ? null : p.company().getId(),
                    p.company() == null ? null : p.company().getCode(), p.due(), p.collected(), p.chargeCount(),
                    p.paidCount(), p.exemptCount(), p.subjectCount(), p.collectionRate(), p.lowCollectionRate(), p.company() == null);
        }
    }

    public record LedgerRowDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Phải thu") long due,
            @Schema(requiredMode = RequiredMode.REQUIRED) long chargeCount,
            @Schema(requiredMode = RequiredMode.REQUIRED,
                    description = "Điều chỉnh kỳ trước: khoản kỳ đã khóa được xóa nợ, ghi nhận ở kỳ này") long adjustment,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã hoàn cho hộ, ghi nhận ở kỳ này") long refunded,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã thu của hộ gồm tiền mặt và chuyển khoản (đã trừ hoàn), ghi nhận ở kỳ này") long collected,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Trong đã thu: tiền mặt công ty giữ (đã trừ hoàn). Chuyển khoản vào tài khoản xã = đã thu − tiền mặt") long cashCollected,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã nộp về xã") long received,
            @Schema(requiredMode = RequiredMode.REQUIRED) long receiptCount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Còn phải nộp = phải nộp xã − đã nộp; âm là xã trả lại công ty phần chênh")
            long remaining,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chênh lệch = đã nộp về xã − phải nộp xã; âm là còn nộp thiếu, dương là nộp dư (xã trả lại công ty)") long gap,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Nợ các kỳ trước đã hết hạn") long previousDebt,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean overdue,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã thu / phải thu (%)") double collectionRate,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tỷ lệ thu dưới 45%") boolean lowCollectionRate,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã nộp về xã / phải nộp xã (%)") double remittedRate,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tỷ lệ đã nộp dưới 45% phải nộp xã; phải nộp xã = 0 thì không gắn cờ")
            boolean lowRemittedRate,
            @Schema(requiredMode = RequiredMode.REQUIRED) Progress progress,
            @Schema(requiredMode = RequiredMode.REQUIRED) Reconciliation reconciliation,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Phí thu gom công ty được hưởng: tính từ biểu giá trên toàn bộ số đã thu (cả chuyển khoản), làm tròn đồng theo từng khoản") long retained,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Phải nộp xã = tiền mặt đã thu − điều chỉnh kỳ trước − phí thu gom của toàn bộ số đã thu; âm thì xã trả lại công ty") long payable) {

        static LedgerRowDto of(LedgerRow r) {
            return new LedgerRowDto(r.companyId(), r.companyCode(), r.companyName(), r.periodId(), r.due(),
                    r.chargeCount(), r.adjustment(), r.refunded(), r.collected(), r.cashCollected(), r.received(), r.receiptCount(), r.remaining(), r.gap(),
                    r.previousDebt(), r.overdue(), r.collectionRate(), r.lowCollectionRate(), r.remittedRate(),
                    r.lowRemittedRate(), r.progress(), r.reconciliation(), r.retained(), r.payable());
        }
    }
}
