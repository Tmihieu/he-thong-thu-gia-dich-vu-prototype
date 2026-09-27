package vn.dongthanh.vsmt.citizen.api;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.dongthanh.vsmt.citizen.domain.BulkyItemType;
import vn.dongthanh.vsmt.citizen.domain.BulkyStatus;
import vn.dongthanh.vsmt.citizen.domain.BulkyWasteRequest;
import vn.dongthanh.vsmt.citizen.domain.DaySlot;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage;

/** DTO rác cồng kềnh dùng chung cho app người dân và web công ty. */
public final class BulkyDtos {

    private BulkyDtos() {
    }

    public record CreateBulkyRequest(
            @NotNull(message = "không được để trống") BulkyItemType itemType,
            @Size(max = 255, message = "tối đa 255 ký tự") String itemDescription,
            @Min(value = 1, message = "phải từ 1 trở lên") @Max(value = 99, message = "tối đa 99") int quantity,
            @Schema(description = "Để trống = địa chỉ hộ") @Size(max = 255, message = "tối đa 255 ký tự") String address,
            @NotNull(message = "không được để trống") LocalDate preferredDate,
            DaySlot preferredSlot,
            @Schema(description = "Tên ảnh (trường name) trả về từ POST /api/citizen/photos, không nhận URL; tùy chọn")
            @Size(max = 5, message = "tối đa 5 ảnh")
            List<@NotNull(message = "không được để trống")
                    @Pattern(regexp = PhotoStorage.NAME_PATTERN, message = "không phải tên ảnh đã tải lên") String>
                    photoNames) {
    }

    public record QuoteBulkyRequest(
            @Positive(message = "phải lớn hơn 0") @Max(value = 10_000_000, message = "tối đa 10.000.000 đ") long fee,
            @Schema(description = "Để trống = ngày hộ mong muốn") LocalDate scheduledDate) {
    }

    public record CancelBulkyRequest(
            @NotBlank(message = "không được để trống") @Size(max = 255, message = "tối đa 255 ký tự") String reason) {
    }

    public record BulkyRequestDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "CK-1026-006") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long subjectId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH-H000128") String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String citizenName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String citizenPhone,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) BulkyItemType itemType,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String itemDescription,
            @Schema(requiredMode = RequiredMode.REQUIRED) int quantity,
            @Schema(requiredMode = RequiredMode.REQUIRED) String address,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate preferredDate,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) DaySlot preferredSlot,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đường dẫn tương đối, cần token: app dân "
                    + "/api/citizen/photos/{name}, web /api/bulky-requests/{id}/photos/{name}")
            List<String> photoUrls,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long quotedFee,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime quotedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate scheduledDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) BulkyStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime collectedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String cancelReason,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static BulkyRequestDto forCitizen(BulkyWasteRequest r) {
            return of(r, r.getPhotoNames().stream().map(PhotoController::url).toList());
        }

        static BulkyRequestDto forCompany(BulkyWasteRequest r) {
            return of(r, r.getPhotoNames().stream().map(n -> BulkyWasteController.photoUrl(r.getId(), n)).toList());
        }

        private static BulkyRequestDto of(BulkyWasteRequest r, List<String> photos) {
            var s = r.getSubject();
            var a = r.getCitizenAccount();
            return new BulkyRequestDto(r.getId(), r.getCode(), s.getId(), s.getCode(), s.getName(), a.getDisplayName(),
                    a.getPhone(), s.getArea().getCode(), r.getItemType(), r.getItemDescription(), r.getQuantity(),
                    r.getAddress(), r.getPreferredDate(), r.getPreferredSlot(), photos, r.getCompany().getId(),
                    r.getCompany().getName(), r.getQuotedFee(), r.getQuotedAt(), r.getScheduledDate(), r.getStatus(),
                    r.getCollectedAt(), r.getCancelReason(), r.getCreatedAt());
        }
    }
}
