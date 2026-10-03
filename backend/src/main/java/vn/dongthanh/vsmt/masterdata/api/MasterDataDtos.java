package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;
import java.time.LocalTime;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionSchedule;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyType;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.WasteType;
import vn.dongthanh.vsmt.masterdata.service.CompanyService.CompanyCommand;

public final class MasterDataDtos {

    private MasterDataDtos() {
    }

    public record DistrictRequest(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 2000) String note,
            @PositiveOrZero Integer sortOrder) {
    }

    public record AreaRequest(
            @NotBlank @Size(max = 100) String name,
            @NotNull ActiveStatus status) {
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

    public record CollectionScheduleDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "1 = Thứ 2 … 7 = Chủ nhật (ISO)", example = "3")
            int weekday,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Null = hằng tuần; 1 = tuần đầu tháng") Integer weekOfMonth,
            @Schema(requiredMode = RequiredMode.REQUIRED, type = "string", example = "17:00:00") LocalTime startTime,
            @Schema(requiredMode = RequiredMode.REQUIRED, type = "string", example = "19:00:00") LocalTime endTime,
            @Schema(requiredMode = RequiredMode.REQUIRED) WasteType wasteType,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static CollectionScheduleDto of(CollectionSchedule s) {
            return new CollectionScheduleDto(s.getId(), s.getArea().getId(), s.getWeekday(), s.getWeekOfMonth(),
                    s.getStartTime(), s.getEndTime(), s.getWasteType(), s.getNote());
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

    public record CompanyRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 200) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 100) String contactName,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Pattern(regexp = "^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String contactPhone,
            @Schema(description = "Để trống: thêm mới là Hoạt động, sửa thì giữ nguyên") ActiveStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") LocalDate validFrom,
            LocalDate validTo,
            CompanyType orgType,
            @Pattern(regexp = "^$|^[0-9-]{10,14}$", message = "10–14 chữ số") String taxCode,
            @Size(max = 255) String address,
            @Email(message = "không đúng định dạng") @Size(max = 100) String email,
            @Size(max = 50) String communeContractNo,
            @Size(max = 50) String bankAccount,
            @Size(max = 100) String bankName) {

        public CompanyCommand toCommand() {
            return new CompanyCommand(name, contactName, contactPhone, status, validFrom, validTo, orgType, taxCode,
                    address, email, communeContractNo, bankAccount, bankName);
        }
    }
}
