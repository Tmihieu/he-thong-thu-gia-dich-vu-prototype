package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffRate;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.masterdata.service.TariffService.DraftCommand;
import vn.dongthanh.vsmt.masterdata.service.TariffService.RateInput;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: biểu giá, loại phí")
@RestController
@RequestMapping("/api/masterdata")
@RequiredArgsConstructor
public class TariffController {

    private final TariffService tariffs;

    @Operation(summary = "Các phiên bản biểu giá kèm đơn giá theo nhóm, mới nhất trước")
    @GetMapping("/tariffs")
    public List<TariffVersionDto> tariffs() {
        return tariffs.versions().stream().map(TariffVersionDto::of).toList();
    }

    @Operation(summary = "Tạo dự thảo biểu giá (quản trị); phải đủ đơn giá 4 nhóm")
    @PostMapping("/tariffs")
    @ResponseStatus(HttpStatus.CREATED)
    public TariffVersionDto createDraft(@Valid @RequestBody CreateTariffRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return TariffVersionDto.of(tariffs.createDraft(req.code(), req.draft().toCommand(), actor));
    }

    @Operation(summary = "Sửa dự thảo biểu giá (quản trị); bản đã ban hành không sửa được (422 TARIFF_NOT_DRAFT)")
    @PutMapping("/tariffs/{id}")
    public TariffVersionDto updateDraft(@PathVariable Long id, @Valid @RequestBody TariffDraftRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return TariffVersionDto.of(tariffs.updateDraft(id, req.toCommand(), actor));
    }

    @Operation(summary = "Ban hành dự thảo (quản trị); bản đang áp dụng kết thúc ngay trước ngày hiệu lực mới")
    @PostMapping("/tariffs/{id}/issue")
    public TariffVersionDto issue(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return TariffVersionDto.of(tariffs.issue(id, actor));
    }

    @Operation(summary = "Danh sách loại phí")
    @GetMapping("/fee-types")
    public List<FeeTypeDto> feeTypes() {
        return tariffs.feeTypes().stream().map(FeeTypeDto::of).toList();
    }

    public record RateRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) @PositiveOrZero long collectionFee,
            @Schema(requiredMode = RequiredMode.REQUIRED) @PositiveOrZero long transportFee,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "đ/hộ/tháng")
            @NotBlank(message = "không được để trống") @Size(max = 30) String unitLabel) {
    }

    public record TariffDraftRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "QĐ 65/2026/QĐ-UBND")
            @NotBlank(message = "không được để trống") @Size(max = 100) String legalBasis,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") LocalDate validFrom,
            @Schema(description = "Để trống là không thời hạn") LocalDate validTo,
            @Size(max = 255) String scopeNote,
            @Size(max = 2000) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotEmpty @Valid List<RateRequest> rates) {

        DraftCommand toCommand() {
            return new DraftCommand(legalBasis, validFrom, validTo, blankToNull(scopeNote), blankToNull(note),
                    rates.stream().map(r -> new RateInput(r.tariffGroup(), r.collectionFee(), r.transportFee(),
                            r.unitLabel())).toList());
        }

        private static String blankToNull(String s) {
            return s == null || s.isBlank() ? null : s.trim();
        }
    }

    public record CreateTariffRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "BG-70-2027")
            @NotBlank(message = "không được để trống") @Size(max = 20) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull @Valid TariffDraftRequest draft) {
    }

    public record TariffRateDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) long collectionFee,
            @Schema(requiredMode = RequiredMode.REQUIRED) long transportFee,
            @Schema(requiredMode = RequiredMode.REQUIRED) long monthlyTotal,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "đ/hộ/tháng") String unitLabel) {

        static TariffRateDto of(TariffRate r) {
            return new TariffRateDto(r.getTariffGroup(), r.getCollectionFee(), r.getTransportFee(),
                    r.getMonthlyTotal(), r.getUnitLabel());
        }
    }

    public record TariffVersionDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "BG-65-2026") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String legalBasis,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate issuedDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate validFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate validTo,
            @Schema(requiredMode = RequiredMode.REQUIRED) TariffStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String scopeNote,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<TariffRateDto> rates) {

        static TariffVersionDto of(TariffVersion v) {
            return new TariffVersionDto(v.getId(), v.getCode(), v.getLegalBasis(), v.getIssuedDate(),
                    v.getValidFrom(), v.getValidTo(), v.getStatus(), v.getScopeNote(), v.getNote(),
                    v.getRates().stream().map(TariffRateDto::of).toList());
        }
    }

    public record FeeTypeDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "ENV") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) PricingMode pricingMode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long defaultPrice,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean active) {

        static FeeTypeDto of(FeeType f) {
            return new FeeTypeDto(f.getId(), f.getCode(), f.getName(), f.getPricingMode(), f.getDefaultPrice(),
                    f.isActive());
        }
    }
}
