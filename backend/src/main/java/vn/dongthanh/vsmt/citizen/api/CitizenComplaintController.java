package vn.dongthanh.vsmt.citizen.api;

import java.io.IOException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.service.CitizenQueryService;
import vn.dongthanh.vsmt.complaint.domain.Complaint;
import vn.dongthanh.vsmt.complaint.domain.ComplaintCategory;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEvent;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEventType;
import vn.dongthanh.vsmt.complaint.domain.ComplaintStatus;
import vn.dongthanh.vsmt.complaint.service.ComplaintPhotoService;
import vn.dongthanh.vsmt.complaint.service.ComplaintService;
import vn.dongthanh.vsmt.complaint.service.ComplaintService.CitizenSubmission;
import vn.dongthanh.vsmt.complaint.service.ComplaintService.ComplaintDetail;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/** Phản ánh của người dân trên app (T43): gửi kênh APP, xem danh sách và timeline đồng bộ với xã / công ty. */
@Tag(name = "App người dân: phản ánh, kiến nghị")
@RestController
@RequestMapping("/api/citizen/complaints")
@RequiredArgsConstructor
public class CitizenComplaintController {

    private final CitizenQueryService citizens;
    private final ComplaintService complaints;
    private final ComplaintPhotoService photos;

    @Operation(summary = "Gửi phản ánh (kênh APP); vị trí để trống thì lấy địa chỉ hộ")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CitizenComplaintDetailDto submit(@AuthenticationPrincipal CurrentCitizen citizen,
            @Valid @RequestBody SubmitComplaintRequest request) {
        CitizenAccount account = citizens.requireActive(citizen);
        ComplaintDetail detail = complaints.submitFromApp(new CitizenSubmission(account.getId(),
                account.getDisplayName(), account.getPhone(), account.getSubject().getId(), request.category(),
                request.content(), request.location(), request.photoUrls()));
        return CitizenComplaintDetailDto.of(detail, complaints.today());
    }

    @Operation(summary = "Tải một ảnh JPEG/PNG/WebP (tối đa 5 MB) lên Cloudinary, nhận URL để đính kèm phản ánh")
    @PostMapping(path = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CitizenComplaintPhotoDto uploadPhoto(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam("file") MultipartFile file) throws IOException {
        citizens.requireActive(citizen);
        return new CitizenComplaintPhotoDto(photos.upload(file));
    }

    @Operation(summary = "Phản ánh của hộ, mới nhất trước")
    @GetMapping
    public List<CitizenComplaintDto> list(@AuthenticationPrincipal CurrentCitizen citizen) {
        CitizenAccount account = citizens.requireActive(citizen);
        LocalDate today = complaints.today();
        return complaints.listOfCitizen(account.getSubject().getId()).stream().map(c -> CitizenComplaintDto.of(c, today)).toList();
    }

    @Operation(summary = "Chi tiết phản ánh kèm timeline (của hộ khác trả 404)")
    @GetMapping("/{id}")
    public CitizenComplaintDetailDto get(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        CitizenAccount account = citizens.requireActive(citizen);
        return CitizenComplaintDetailDto.of(complaints.getOfCitizen(id, account.getSubject().getId()), complaints.today());
    }

    public record SubmitComplaintRequest(
            @NotNull(message = "không được để trống") ComplaintCategory category,
            @NotBlank(message = "không được để trống") @Size(max = 4000) String content,
            @Schema(description = "Nơi xảy ra sự việc; để trống = địa chỉ hộ") @Size(max = 100) String location,
            @Schema(description = "URL ảnh đã tải lên qua /api/citizen/complaints/photos") @Size(max = 5, message = "tối đa 5 ảnh")
            List<String> photoUrls) {
    }

    public record CitizenComplaintPhotoDto(@Schema(requiredMode = RequiredMode.REQUIRED) String url) {
    }

    public record CitizenComplaintDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KN-1026-001") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate receivedDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintCategory category,
            @Schema(requiredMode = RequiredMode.REQUIRED) String summary,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String location,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String forwardedCompanyName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate deadline,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chưa giải quyết và đã qua hạn") boolean overdue,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String resolution,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime resolvedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "URL ảnh đính kèm (Cloudinary, công khai)")
            List<String> photoUrls) {

        static CitizenComplaintDto of(Complaint c, LocalDate today) {
            var f = c.getForwardedCompany();
            return new CitizenComplaintDto(c.getId(), c.getCode(), c.getReceivedDate(), c.getCategory(), c.getSummary(),
                    c.getContent(), c.getLocation(), c.getArea().getCode(), c.getArea().getName(), c.getStatus(),
                    f == null ? null : f.getName(), c.getDeadline(), c.isOverdue(today), c.getResolution(),
                    c.getResolvedAt(), ComplaintPhotoService.split(c.getPhotoUrls()));
        }
    }

    public record CitizenComplaintEventDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintEventType eventType,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime occurredAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) String actorLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content) {

        static CitizenComplaintEventDto of(ComplaintEvent e) {
            return new CitizenComplaintEventDto(e.getId(), e.getEventType(), e.getOccurredAt(), e.getActorLabel(),
                    e.getContent());
        }
    }

    public record CitizenComplaintDetailDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) CitizenComplaintDto complaint,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<CitizenComplaintEventDto> events) {

        static CitizenComplaintDetailDto of(ComplaintDetail d, LocalDate today) {
            return new CitizenComplaintDetailDto(CitizenComplaintDto.of(d.complaint(), today),
                    d.events().stream().map(CitizenComplaintEventDto::of).toList());
        }
    }
}
