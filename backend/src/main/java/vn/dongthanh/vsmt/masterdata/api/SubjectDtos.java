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
            @Schema(description = "Số nhà; bỏ trống nếu nhà chưa có số") @Size(max = 30) String houseNo,
            @Schema(description = "Tên đường/hẻm: chỉ dùng khi không chọn streetId (đường chờ xác minh hoặc địa chỉ cũ)")
            @Size(max = 200) String street,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long areaId,
            @Pattern(regexp = "^$|^[0-9]{9,15}$", message = "chỉ gồm 9–15 chữ số") String phone,
            @Positive Integer memberCount,
            @Size(max = 100) String representativeName,
            @Size(max = 14) String taxCode,
            @Size(max = 2000) String note,
            @Schema(description = "Chỉ dùng khi tạo mới: hợp đồng đầu tiên (không bắt buộc)") @Valid ContractRequest contract,
            @Schema(description = "Đường chuẩn trong danh mục (ưu tiên hơn street)") Long streetId,
            @Schema(description = "Không tìm thấy đường trong danh mục: ghi tên tạm ở street, chờ xác minh") boolean streetPending,
            @Schema(description = "Phòng/căn, phân biệt nhiều đối tượng chung địa chỉ") @Size(max = 30) String unitNo,
            @Schema(description = "Vị trí bổ sung, nhất là khi nhà chưa có số") @Size(max = 255) String locationNote,
            @Schema(description = "Lý do xác nhận là hộ khác khi địa chỉ nghi trùng") @Size(max = 500) String duplicateReason) {

        SubjectCommand toCommand() {
            return new SubjectCommand(type, name, houseNo, street, areaId, phone, memberCount, representativeName, taxCode,
                    note, streetId, streetPending, unitNo, locationNote, duplicateReason);
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
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số nhà + đường, ghép sẵn") String address,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String houseNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) String street,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Null: địa chỉ cũ chưa chuẩn hóa hoặc đường chờ xác minh") Long streetId,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean streetPending,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String unitNo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String locationNote,
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
                    s.getHouseNo(), s.getStreet(), s.getStreetRef() == null ? null : s.getStreetRef().getId(),
                    s.isStreetPending(), s.getUnitNo(), s.getLocationNote(), s.getArea().getId(), s.getArea().getCode(), s.getArea().getDistrict().getCode(), s.getPhone(),
                    s.getStatus(), s.getMemberCount(), s.getRepresentativeName(), s.getTaxCode(), s.getNote(), current,
                    sorted.stream().map(ContractDto::of).toList());
        }
    }

    public record DuplicateCheckRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long streetId,
            @Size(max = 30) String houseNo,
            @Size(max = 30) String unitNo,
            @Schema(description = "Khi sửa hộ: loại chính hồ sơ đang sửa") Long excludeSubjectId) {
    }

    /** Thông tin tối thiểu để cán bộ đối chiếu hồ sơ nghi trùng. */
    public record DuplicateDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED) SubjectStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) String address) {

        static DuplicateDto of(ServiceSubject s) {
            return new DuplicateDto(s.getId(), s.getCode(), s.getName(), s.getPhone(), s.getStatus(), s.getAddress());
        }
    }

    public record SubjectPageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<SubjectDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) int page,
            @Schema(requiredMode = RequiredMode.REQUIRED) int size) {
    }
}
