package vn.dongthanh.vsmt.complaint.api;

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
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.complaint.domain.Complaint;
import vn.dongthanh.vsmt.complaint.domain.ComplaintCategory;
import vn.dongthanh.vsmt.complaint.domain.ComplaintChannel;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEvent;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEventType;
import vn.dongthanh.vsmt.complaint.domain.ComplaintStatus;
import vn.dongthanh.vsmt.complaint.service.ComplaintPhotoService;
import vn.dongthanh.vsmt.complaint.service.ComplaintService;
import vn.dongthanh.vsmt.complaint.service.ComplaintService.ComplaintDetail;
import vn.dongthanh.vsmt.complaint.service.ComplaintService.CreateComplaintCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Khiếu nại")
@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaints;
    private final ComplaintPhotoService photos;

    @Operation(summary = "Danh sách khiếu nại, mới nhất trước; công ty chỉ thấy khiếu nại đã chuyển cho mình (G12)")
    @GetMapping
    public List<ComplaintDto> list(@RequestParam(required = false) ComplaintStatus status,
            @AuthenticationPrincipal CurrentUser actor) {
        LocalDate today = complaints.today();
        return complaints.list(status, actor).stream().map(c -> ComplaintDto.of(c, today)).toList();
    }

    @Operation(summary = "Chi tiết khiếu nại kèm timeline")
    @GetMapping("/{id}")
    public ComplaintDetailDto get(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return ComplaintDetailDto.of(complaints.get(id, actor), complaints.today());
    }

    @Operation(summary = "Cán bộ xã ghi nhận khiếu nại qua điện thoại / trực tiếp")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ComplaintDetailDto create(@Valid @RequestBody CreateComplaintRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        Complaint c = complaints.create(new CreateComplaintCommand(req.complainantName(), req.complainantPhone(),
                req.subjectId(), req.areaId(), req.channel(), req.category(), req.summary(), req.content(),
                req.receivedDate(), req.photoUrls()), actor);
        return get(c.getId(), actor);
    }

    @Operation(summary = "Tải một ảnh JPEG/PNG/WebP (tối đa 5 MB) lên Cloudinary, nhận URL để gắn vào khiếu nại")
    @PostMapping(path = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ComplaintPhotoDto uploadPhoto(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal CurrentUser actor)
            throws IOException {
        actor.requireRole(Role.COMMUNE_OFFICER);
        return new ComplaintPhotoDto(photos.upload(file));
    }

    @Operation(summary = "Chuyển công ty xử lý (để trống công ty: công ty phụ trách khu vực), hạn hôm nay + 3 ngày")
    @PostMapping("/{id}/forward")
    public ComplaintDetailDto forward(@PathVariable Long id, @Valid @RequestBody ForwardRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        complaints.forward(id, req.companyId(), req.areaId(), req.note(), actor);
        return get(id, actor);
    }

    @Operation(summary = "Công ty được chuyển phản hồi kết quả xử lý")
    @PostMapping("/{id}/reply")
    public ComplaintDetailDto reply(@PathVariable Long id, @Valid @RequestBody ReplyRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        complaints.reply(id, req.content(), actor);
        return get(id, actor);
    }

    @Operation(summary = "Công ty bị chuyển nhầm trả lại xã kèm lý do; xã chuyển lại công ty khác. Không trả chi tiết: "
            + "sau khi trả, khiếu nại không còn thuộc công ty đó")
    @PostMapping("/{id}/return")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void returnToCommune(@PathVariable Long id, @Valid @RequestBody ReturnRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        complaints.returnToCommune(id, req.reason(), actor);
    }

    @Operation(summary = "Cán bộ xã đóng khiếu nại kèm kết quả cuối")
    @PostMapping("/{id}/close")
    public ComplaintDetailDto close(@PathVariable Long id, @Valid @RequestBody CloseRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        complaints.close(id, req.resolution(), actor);
        return get(id, actor);
    }

    public record CreateComplaintRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 100, message = "tối đa 100 ký tự") String complainantName,
            @Pattern(regexp = "^$|^0\\d{9}$", message = "phải gồm 10 chữ số, bắt đầu bằng 0") String complainantPhone,
            @Schema(description = "Hộ / đối tượng liên quan, nếu biết") Long subjectId,
            @Schema(description = "Để trống thì lấy khu vực của hộ") Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ComplaintChannel channel,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ComplaintCategory category,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 200, message = "tối đa 200 ký tự") String summary,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 4000, message = "tối đa 4000 ký tự") String content,
            @Schema(description = "Để trống thì lấy hôm nay") LocalDate receivedDate,
            @Schema(description = "URL ảnh đã tải lên qua /api/complaints/photos") @Size(max = 5, message = "tối đa 5 ảnh")
            List<String> photoUrls) {
    }

    public record ComplaintPhotoDto(@Schema(requiredMode = RequiredMode.REQUIRED) String url) {
    }

    public record ForwardRequest(
            @Schema(description = "Để trống thì lấy công ty phụ trách khu vực") Long companyId,
            @Schema(description = "Sửa khu vực của khiếu nại trước khi chuyển (sự việc xảy ra ở nơi khác hộ); để trống thì giữ nguyên")
            Long areaId,
            @Size(max = 1000, message = "tối đa 1000 ký tự") String note) {
    }

    public record ReturnRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Lý do trả lại, vd. không thuộc khu vực công ty phụ trách")
            @NotBlank(message = "không được để trống") @Size(max = 1000, message = "tối đa 1000 ký tự") String reason) {
    }

    public record ReplyRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 2000, message = "tối đa 2000 ký tự") String content) {
    }

    public record CloseRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 2000, message = "tối đa 2000 ký tự") String resolution) {
    }

    public record ComplaintDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KN-1026-001") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate receivedDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) String complainantName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String complainantPhone,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long subjectId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String subjectName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintChannel channel,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintCategory category,
            @Schema(requiredMode = RequiredMode.REQUIRED) String summary,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Nơi xảy ra sự việc, người dân nhập từ app")
            String location,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long forwardedCompanyId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String forwardedCompanyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String forwardedCompanyName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate deadline,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chưa giải quyết và đã qua hạn") boolean overdue,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String resolution,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime resolvedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "URL ảnh đính kèm (Cloudinary, công khai)")
            List<String> photoUrls) {

        static ComplaintDto of(Complaint c, LocalDate today) {
            var s = c.getSubject();
            var f = c.getForwardedCompany();
            return new ComplaintDto(c.getId(), c.getCode(), c.getReceivedDate(), c.getComplainantName(),
                    c.getComplainantPhone(), s == null ? null : s.getId(), s == null ? null : s.getCode(),
                    s == null ? null : s.getName(), c.getArea().getId(), c.getArea().getCode(), c.getArea().getName(),
                    c.getChannel(), c.getCategory(), c.getSummary(), c.getContent(), c.getLocation(), c.getStatus(),
                    f == null ? null : f.getId(), f == null ? null : f.getCode(), f == null ? null : f.getName(),
                    c.getDeadline(), c.isOverdue(today), c.getResolution(), c.getResolvedAt(),
                    ComplaintPhotoService.split(c.getPhotoUrls()));
        }
    }

    public record EventDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintEventType eventType,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime occurredAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) String actorLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content) {

        static EventDto of(ComplaintEvent e) {
            return new EventDto(e.getId(), e.getEventType(), e.getOccurredAt(), e.getActorLabel(), e.getContent());
        }
    }

    public record ComplaintDetailDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) ComplaintDto complaint,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<EventDto> events) {

        static ComplaintDetailDto of(ComplaintDetail d, LocalDate today) {
            return new ComplaintDetailDto(ComplaintDto.of(d.complaint(), today),
                    d.events().stream().map(EventDto::of).toList());
        }
    }
}
