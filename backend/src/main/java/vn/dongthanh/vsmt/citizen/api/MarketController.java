package vn.dongthanh.vsmt.citizen.api;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonAnySetter;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.MarketCategory;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketImage;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketModeration;
import vn.dongthanh.vsmt.citizen.domain.MarketPostStatus;
import vn.dongthanh.vsmt.citizen.domain.MarketReportReason;
import vn.dongthanh.vsmt.citizen.domain.MarketTag;
import vn.dongthanh.vsmt.citizen.service.MarketService;
import vn.dongthanh.vsmt.citizen.service.MarketService.PostCommand;
import vn.dongthanh.vsmt.citizen.service.MarketService.PostView;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/** Chợ đồ cũ: ghi và dữ liệu cá nhân của người dân (docs/cho-do-cu-spec.md §10). Đọc chung ở {@link MarketReadController}. */
@Tag(name = "App người dân: chợ đồ cũ")
@RestController
@Validated
@RequestMapping("/api/citizen/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketService market;

    @Operation(summary = "Bài của tôi, gồm bài ẩn/đã xong")
    @GetMapping("/posts/mine")
    public PageDto<MarketPostDto> mine(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam(required = false) MarketPostStatus status, @RequestParam(required = false) Boolean hidden,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return PageDto.of(market.mine(citizen, status, hidden, page, size).map(MarketPostDto::of));
    }

    @Operation(summary = "Đăng bài; khớp từ khóa lọc thì chờ cán bộ xã duyệt; retry cùng clientRequestId trả bài cũ")
    @PostMapping("/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public MarketPostDto create(@AuthenticationPrincipal CurrentCitizen citizen,
            @Valid @RequestBody CreateMarketPostRequest r) {
        return MarketPostDto.of(market.create(citizen, r.command(), r.clientRequestId()));
    }

    @Operation(summary = "Dữ liệu màn sửa (chủ bài): kèm SĐT liên hệ và version")
    @GetMapping("/posts/{id}/edit")
    public MarketEditDto editPayload(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        return MarketEditDto.of(market.editPayload(citizen, id));
    }

    @Operation(summary = "Sửa nội dung (chủ bài), cần version khớp; không đổi tác giả/tổ/trạng thái")
    @PatchMapping("/posts/{id}")
    public MarketPostDto edit(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody UpdateMarketPostRequest r) {
        return MarketPostDto.of(market.edit(citizen, id, r.command(), r.version()));
    }

    @Operation(summary = "Đóng / mở lại bài (chủ bài)")
    @PostMapping("/posts/{id}/status")
    public MarketPostDto changeStatus(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody MarketStatusRequest r) {
        return MarketPostDto.of(market.changeStatus(citizen, id, r.status(), r.version()));
    }

    @Operation(summary = "Ẩn / hiện bài (chủ bài)")
    @PutMapping("/posts/{id}/visibility")
    public MarketPostDto visibility(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody MarketVisibilityRequest r) {
        return MarketPostDto.of(market.setVisibility(citizen, id, r.hidden(), r.version()));
    }

    @Operation(summary = "Bình luận; retry cùng clientRequestId trả bình luận cũ")
    @PostMapping("/posts/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public MarketCommentDto comment(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody MarketCommentRequest r) {
        return MarketCommentDto.of(market.comment(citizen, id, r.content(), r.clientRequestId()), citizen.accountId());
    }

    @Operation(summary = "Báo cáo bài vi phạm; đã báo cáo (chưa xử lý) thì không ghi thêm")
    @PostMapping("/posts/{id}/reports")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void report(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody MarketReportRequest r) {
        market.report(citizen, id, r.reason(), r.note());
    }

    @Operation(summary = "SĐT liên hệ chủ bài tự chia sẻ; không chia sẻ/không đủ quyền → 404")
    @GetMapping("/posts/{id}/contact")
    public ResponseEntity<MarketContactDto> contact(@AuthenticationPrincipal CurrentCitizen citizen,
            @PathVariable Long id) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .body(new MarketContactDto(market.contact(citizen, id)));
    }

    @Operation(summary = "Tải ảnh cho bài (JPEG/PNG/WebP ≤ 5 MB); chưa gắn bài thì chỉ người tải xem được")
    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MarketImageDto upload(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam("file") MultipartFile file) throws IOException {
        MarketImage img = market.upload(citizen, file);
        return new MarketImageDto(img.getId(), previewUrl(img.getId()));
    }

    @Operation(summary = "Xem ảnh vừa tải (người tải) hoặc ảnh đã gắn (theo quyền bài)")
    @GetMapping("/images/{imageId}/preview")
    public ResponseEntity<byte[]> preview(@AuthenticationPrincipal CurrentCitizen citizen,
            @PathVariable Long imageId) throws IOException {
        return MarketReadController.privateImage(market.preview(citizen, imageId));
    }

    @Operation(summary = "Bài đã lưu; bài không còn khả dụng chỉ còn postId")
    @GetMapping("/saved")
    public PageDto<MarketSavedDto> saved(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return PageDto.of(market.savedPosts(citizen, page, size)
                .map(s -> new MarketSavedDto(s.postId(), s.post() == null ? null : MarketPostDto.of(s.post()))));
    }

    @Operation(summary = "Lưu bài")
    @PutMapping("/saved/{postId}")
    public SavedStateDto save(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long postId) {
        market.save(citizen, postId);
        return new SavedStateDto(true);
    }

    @Operation(summary = "Bỏ lưu (cả bài không còn xem được)")
    @DeleteMapping("/saved/{postId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsave(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long postId) {
        market.unsave(citizen, postId);
    }

    @Operation(summary = "Người tôi đã chặn")
    @GetMapping("/blocks")
    public PageDto<MarketBlockDto> blocks(@AuthenticationPrincipal CurrentCitizen citizen,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return PageDto.of(market.blocked(citizen, page, size)
                .map(b -> new MarketBlockDto(b.citizenId(), b.displayName())));
    }

    @Operation(summary = "Chặn một người dân (hiệu lực hai chiều trong chợ)")
    @PutMapping("/blocks/{citizenId}")
    public BlockStateDto block(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long citizenId) {
        market.block(citizen, citizenId);
        return new BlockStateDto(true);
    }

    @Operation(summary = "Bỏ chặn (chỉ quan hệ mình tạo)")
    @DeleteMapping("/blocks/{citizenId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unblock(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long citizenId) {
        market.unblock(citizen, citizenId);
    }

    static String previewUrl(Long imageId) {
        return "/api/citizen/market/images/" + imageId + "/preview";
    }

    /** Không nhận thuộc tính ngoài khai báo (vd. price/amount/currency) → 422, chỉ riêng DTO chợ (D01). */
    static void rejectUnknown(String name) {
        throw new BusinessRuleException("MARKET_FIELD_UNKNOWN", "Trường \"" + name + "\" không được hỗ trợ.");
    }

    // ---------- Request ----------

    public record CreateMarketPostRequest(
            @NotBlank(message = "không được để trống") @Size(max = 2500) String caption,
            @NotEmpty(message = "chọn ít nhất một nhãn") @Size(max = 4) Set<@NotNull MarketTag> tags,
            @Schema(description = "Mặc định OTHER") MarketCategory category,
            @Size(max = MarketService.MAX_PHOTOS) List<@NotNull Long> photoIds,
            Boolean sharePhone,
            @Size(max = 20) String contactPhone,
            @NotNull(message = "không được để trống") UUID clientRequestId) {

        @JsonAnySetter
        void unknown(String name, Object value) {
            rejectUnknown(name);
        }

        PostCommand command() {
            return new PostCommand(caption, tags, category, photoIds, sharePhone, contactPhone);
        }
    }

    public record UpdateMarketPostRequest(
            @NotBlank(message = "không được để trống") @Size(max = 2500) String caption,
            @NotEmpty(message = "chọn ít nhất một nhãn") @Size(max = 4) Set<@NotNull MarketTag> tags,
            MarketCategory category,
            @Size(max = MarketService.MAX_PHOTOS) List<@NotNull Long> photoIds,
            Boolean sharePhone,
            @Size(max = 20) String contactPhone,
            @NotNull(message = "không được để trống") Integer version) {

        @JsonAnySetter
        void unknown(String name, Object value) {
            rejectUnknown(name);
        }

        PostCommand command() {
            return new PostCommand(caption, tags, category, photoIds, sharePhone, contactPhone);
        }
    }

    public record MarketStatusRequest(@NotNull MarketPostStatus status, @NotNull Integer version) {
    }

    public record MarketVisibilityRequest(@NotNull Boolean hidden, @NotNull Integer version) {
    }

    public record MarketReportRequest(@NotNull MarketReportReason reason, @Size(max = 500) String note) {
    }

    public record MarketCommentRequest(
            @NotBlank(message = "không được để trống") @Size(max = 1000) String content,
            @NotNull(message = "không được để trống") UUID clientRequestId) {
    }

    // ---------- Response ----------

    public record PageDto<T>(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<T> items,
            @Schema(requiredMode = RequiredMode.REQUIRED) long total,
            @Schema(requiredMode = RequiredMode.REQUIRED) int page,
            @Schema(requiredMode = RequiredMode.REQUIRED) int size,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean hasMore) {

        static <T> PageDto<T> of(Page<T> p) {
            return new PageDto<>(p.getContent(), p.getTotalElements(), p.getNumber(), p.getSize(), p.hasNext());
        }
    }

    /** Chỉ phục vụ hiển thị + chặn; không mã hộ, không SĐT. */
    public record MarketAuthorDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long citizenId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String displayName) {
    }

    public record MarketAreaDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name) {
    }

    public record MarketPostDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "CDC-041") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String caption,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketTag> tags,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketCategory category,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAreaDto area,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đường dẫn tương đối, cần token")
            List<String> photoUrls,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketPostStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean hidden,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Người khác chỉ thấy bài PUBLISHED")
            MarketModeration moderation,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Chỉ chủ bài: lý do chờ duyệt/bị gỡ")
            String moderationNote,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAuthorDto author,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Lần sửa nội dung gần nhất")
            OffsetDateTime editedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Chỉ chủ bài") Integer version,
            @Schema(requiredMode = RequiredMode.REQUIRED) long commentCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean canComment,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean canCall,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean mine,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean saved) {

        static MarketPostDto of(PostView v) {
            MarketPost p = v.post();
            return new MarketPostDto(p.getId(), p.getCode(), p.getCaption(),
                    p.getTags().stream().sorted().toList(), p.getCategory(),
                    new MarketAreaDto(v.areaCode(), v.areaName()),
                    v.imageIds().stream().map(i -> "/api/market/posts/" + p.getId() + "/images/" + i).toList(),
                    p.getStatus(), p.isHidden(), p.getModeration(), v.mine() ? p.getModerationNote() : null,
                    new MarketAuthorDto(p.getAuthor().getId(), v.authorName()),
                    p.getCreatedAt(), p.getEditedAt(), v.mine() ? p.getVersion() : null, v.commentCount(),
                    v.canComment(), v.canCall(), v.mine(), v.saved());
        }
    }

    public record MarketEditImageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String previewUrl) {
    }

    public record MarketEditDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketPostDto post,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketEditImageDto> images,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean sharePhone,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String contactPhone,
            @Schema(requiredMode = RequiredMode.REQUIRED) int version) {

        static MarketEditDto of(PostView v) {
            MarketPost p = v.post();
            return new MarketEditDto(MarketPostDto.of(v),
                    v.imageIds().stream().map(i -> new MarketEditImageDto(i, previewUrl(i))).toList(),
                    p.isSharePhone(), p.contactPhoneForAuthorizedReader(), p.getVersion());
        }
    }

    public record MarketCommentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAuthorDto author,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean mine,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static MarketCommentDto of(MarketComment c, Long viewerId) {
            Long authorId = c.getAuthor().getId();
            return new MarketCommentDto(c.getId(), c.getContent(),
                    new MarketAuthorDto(authorId, c.getAuthor().getDisplayName()), authorId.equals(viewerId),
                    c.getCreatedAt());
        }
    }

    public record MarketContactDto(@Schema(requiredMode = RequiredMode.REQUIRED) String phone) {
    }

    public record MarketImageDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String previewUrl) {
    }

    public record MarketSavedDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long postId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "null: bài không còn khả dụng") MarketPostDto post) {
    }

    public record SavedStateDto(@Schema(requiredMode = RequiredMode.REQUIRED) boolean saved) {
    }

    public record MarketBlockDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long citizenId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String displayName) {
    }

    public record BlockStateDto(@Schema(requiredMode = RequiredMode.REQUIRED) boolean blocked) {
    }
}
