package vn.dongthanh.vsmt.citizen.api;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketPostStatus;
import vn.dongthanh.vsmt.citizen.domain.MarketPostType;
import vn.dongthanh.vsmt.citizen.service.MarketService;
import vn.dongthanh.vsmt.citizen.service.MarketService.CreatePostCommand;
import vn.dongthanh.vsmt.citizen.service.MarketService.PostDetail;
import vn.dongthanh.vsmt.citizen.service.MarketService.PostView;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

@Tag(name = "App người dân: chợ đồ cũ")
@RestController
@RequestMapping("/api/citizen/market/posts")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService market;

    @Operation(summary = "Danh sách bài, mới nhất trước; mặc định chỉ bài đang đăng")
    @GetMapping
    public MarketPostPageDto list(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam(required = false) MarketPostType type,
            @RequestParam(defaultValue = "OPEN") MarketPostStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        Page<PostView> result = market.list(citizen, status, type,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        return new MarketPostPageDto(result.getContent().stream()
                .map(v -> MarketPostDto.of(v.post(), v.commentCount(), citizen)).toList(), result.getTotalElements());
    }

    @Operation(summary = "Chi tiết bài kèm bình luận (cũ trước)")
    @GetMapping("/{id}")
    public MarketPostDetailDto detail(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        PostDetail d = market.detail(citizen, id);
        return new MarketPostDetailDto(MarketPostDto.of(d.post(), d.comments().size(), citizen),
                d.comments().stream().map(c -> MarketCommentDto.of(c, citizen)).toList());
    }

    @Operation(summary = "Đăng bài (không kiểm duyệt, O6); ảnh là tên trả về từ POST /api/citizen/photos")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MarketPostDto create(@AuthenticationPrincipal CurrentCitizen citizen,
            @Valid @RequestBody CreateMarketPostRequest request) {
        MarketPost post = market.create(citizen, new CreatePostCommand(request.title(), request.postType(),
                request.description(), request.pickupLocation(), request.photoNames()));
        return MarketPostDto.of(post, 0, citizen);
    }

    @Operation(summary = "Đóng bài (chỉ người đăng, không mở lại)")
    @PostMapping("/{id}/status")
    public MarketPostDto changeStatus(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody MarketPostStatusRequest request) {
        PostView v = market.changeStatus(citizen, id, request.status());
        return MarketPostDto.of(v.post(), v.commentCount(), citizen);
    }

    @Operation(summary = "Bình luận vào bài")
    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public MarketCommentDto comment(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody MarketCommentRequest request) {
        return MarketCommentDto.of(market.comment(citizen, id, request.content()), citizen);
    }

    public record CreateMarketPostRequest(
            @Schema(example = "Ghế sofa 3 chỗ còn dùng tốt")
            @NotBlank(message = "không được để trống") @Size(max = 150) String title,
            @NotNull(message = "không được để trống") MarketPostType postType,
            @NotBlank(message = "không được để trống") @Size(max = 2000) String description,
            @Schema(example = "Hẻm 12, Tổ dân phố 08") @Size(max = 255) String pickupLocation,
            @Schema(description = "Tên ảnh (trường name) trả về từ POST /api/citizen/photos, không nhận URL")
            @Size(max = MarketService.MAX_PHOTOS, message = "tối đa " + MarketService.MAX_PHOTOS + " ảnh")
            List<@NotNull(message = "không được để trống")
                    @Pattern(regexp = PhotoStorage.NAME_PATTERN, message = "không phải tên ảnh đã tải lên") String>
                    photoNames) {
    }

    public record MarketPostStatusRequest(@NotNull(message = "không được để trống") MarketPostStatus status) {
    }

    public record MarketCommentRequest(
            @NotBlank(message = "không được để trống") @Size(max = 1000) String content) {
    }

    /** Người đăng / bình luận hiển thị "tên · tổ"; không lộ SĐT. */
    public record MarketAuthorDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String displayName,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "Tổ dân phố 07") String areaName) {

        static MarketAuthorDto of(CitizenAccount a) {
            Area area = a.getSubject().getArea();
            return new MarketAuthorDto(a.getDisplayName(), area.getCode(), area.getName());
        }
    }

    public record MarketPostDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "CDC-041") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String title,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketPostType postType,
            @Schema(requiredMode = RequiredMode.REQUIRED) String description,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đường dẫn tương đối, cần token người dân")
            List<String> photoUrls,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String pickupLocation,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketPostStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAuthorDto author,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Bài của người đang đăng nhập") boolean mine,
            @Schema(requiredMode = RequiredMode.REQUIRED) long commentCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static MarketPostDto of(MarketPost p, long commentCount, CurrentCitizen viewer) {
            return new MarketPostDto(p.getId(), p.getCode(), p.getTitle(), p.getPostType(), p.getDescription(),
                    p.getPhotoNames().stream().map(PhotoController::url).toList(), p.getPickupLocation(),
                    p.getStatus(), MarketAuthorDto.of(p.getAuthor()), p.isAuthoredBy(viewer.accountId()),
                    commentCount, p.getCreatedAt());
        }
    }

    public record MarketCommentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAuthorDto author,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Bình luận của người đang đăng nhập")
            boolean mine,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static MarketCommentDto of(MarketComment c, CurrentCitizen viewer) {
            return new MarketCommentDto(c.getId(), c.getContent(), MarketAuthorDto.of(c.getAuthor()),
                    c.getAuthor().getId().equals(viewer.accountId()), c.getCreatedAt());
        }
    }

    public record MarketPostDetailDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketPostDto post,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketCommentDto> comments) {
    }

    public record MarketPostPageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketPostDto> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total) {
    }
}
