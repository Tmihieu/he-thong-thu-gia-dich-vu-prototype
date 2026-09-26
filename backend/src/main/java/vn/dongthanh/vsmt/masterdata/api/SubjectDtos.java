package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.ContractCommand;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.SubjectCommand;

public final class SubjectDtos {

    private SubjectDtos() {
    }

    public record ContractRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") LocalDate validFrom,
            LocalDate validTo,
            boolean exempt,
            @Size(max = 255) String exemptReason,
            @Size(max = 50) String exemptDecisionNo,
            @Size(max = 2000) String note) {

        ContractCommand toCommand() {
            return new ContractCommand(tariffGroup, validFrom, validTo, exempt, exemptReason, exemptDecisionNo, note);
        }
    }

    public record SubjectRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") SubjectType type,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 200) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 255) String address,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long areaId,
            @Pattern(regexp = "^$|^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String phone,
            @Positive Integer memberCount,
            @Size(max = 100) String representativeName,
            @Size(max = 14) String taxCode,
            @Size(max = 2000) String note,
            @Schema(description = "Chỉ dùng khi tạo mới: hợp đồng đầu tiên (không bắt buộc)") @Valid ContractRequest contract) {

        SubjectCommand toCommand() {
            return new SubjectCommand(type, name, address, areaId, phone, memberCount, representativeName, taxCode, note);
        }
    }

    public record EndSubjectRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Ngày cuối cùng còn cung cấp dịch vụ")
            @NotNull(message = "không được để trống") LocalDate endDate,
            @Size(max = 2000) String reason) {
    }

    public record ContractDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "ĐK-DTH-0128") String contractNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate validFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate validTo,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean exempt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String exemptReason,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String exemptDecisionNo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static ContractDto of(ServiceContract c) {
            return new ContractDto(c.getId(), c.getContractNo(), c.getTariffGroup(), c.getValidFrom(), c.getValidTo(),
                    c.isExempt(), c.getExemptReason(), c.getExemptDecisionNo(), c.getNote());
        }
    }

    /** "Hồ sơ hộ": đối tượng + hợp đồng hiệu lực hôm nay + toàn bộ hợp đồng (mới nhất trước). */
    public record SubjectDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH-H000128") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) SubjectType subjectType,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) String address,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH") String districtCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED) SubjectStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Integer memberCount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String representativeName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String taxCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) ContractDto currentContract,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ContractDto> contracts) {

        static SubjectDto of(ServiceSubject s, List<ServiceContract> contracts) {
            LocalDate today = LocalDate.now();
            List<ServiceContract> sorted = contracts.stream()
                    .sorted((a, b) -> b.getValidFrom().compareTo(a.getValidFrom())).toList();
            ContractDto current = sorted.stream().filter(c -> c.covers(today)).findFirst().map(ContractDto::of)
                    .orElse(null);
            return new SubjectDto(s.getId(), s.getCode(), s.getSubjectType(), s.getName(), s.getAddress(),
                    s.getArea().getId(), s.getArea().getCode(), s.getArea().getDistrict().getCode(), s.getPhone(),
                    s.getStatus(), s.getMemberCount(), s.getRepresentativeName(), s.getTaxCode(), s.getNote(), current,
                    sorted.stream().map(ContractDto::of).toList());
        }
    }

    public record SubjectPageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<SubjectDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) int page,
            @Schema(requiredMode = RequiredMode.REQUIRED) int size) {
    }
}
