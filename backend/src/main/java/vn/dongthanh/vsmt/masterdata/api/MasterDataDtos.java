package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyType;
import vn.dongthanh.vsmt.masterdata.domain.District;

public final class MasterDataDtos {

    private MasterDataDtos() {
    }

    public record DistrictDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Integer sortOrder) {

        static DistrictDto of(District d) {
            return new DistrictDto(d.getId(), d.getCode(), d.getName(), d.getNote(), d.getSortOrder());
        }
    }

    public record AreaDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long districtId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH") String districtCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) ActiveStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số đối tượng chưa chấm dứt") long subjectCount) {

        static AreaDto of(Area a, long subjectCount) {
            return new AreaDto(a.getId(), a.getCode(), a.getName(), a.getDistrict().getId(),
                    a.getDistrict().getCode(), a.getStatus(), subjectCount);
        }
    }

    public record CompanyDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DV01") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) String contactName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String contactPhone,
            @Schema(requiredMode = RequiredMode.REQUIRED) ActiveStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate validFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate validTo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) CompanyType orgType,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String taxCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String address,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String email,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String communeContractNo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String bankAccount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String bankName) {

        static CompanyDto of(Company c) {
            return new CompanyDto(c.getId(), c.getCode(), c.getName(), c.getContactName(), c.getContactPhone(),
                    c.getStatus(), c.getValidFrom(), c.getValidTo(), c.getOrgType(), c.getTaxCode(), c.getAddress(),
                    c.getEmail(), c.getCommuneContractNo(), c.getBankAccount(), c.getBankName());
        }
    }
}
