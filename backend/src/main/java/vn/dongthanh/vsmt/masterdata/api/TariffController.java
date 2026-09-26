package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffRate;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.service.TariffService;

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

    @Operation(summary = "Danh sách loại phí")
    @GetMapping("/fee-types")
    public List<FeeTypeDto> feeTypes() {
        return tariffs.feeTypes().stream().map(FeeTypeDto::of).toList();
    }

    public record TariffRateDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) long collectionFee,
            @Schema(requiredMode = RequiredMode.REQUIRED) long processingFee,
            @Schema(requiredMode = RequiredMode.REQUIRED) long monthlyTotal,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "đ/hộ/tháng") String unitLabel) {

        static TariffRateDto of(TariffRate r) {
            return new TariffRateDto(r.getTariffGroup(), r.getCollectionFee(), r.getProcessingFee(),
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
