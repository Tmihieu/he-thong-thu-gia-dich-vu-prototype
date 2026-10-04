package vn.dongthanh.vsmt.citizen.api;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.api.MarketController.MarketAreaDto;
import vn.dongthanh.vsmt.citizen.api.MarketController.MarketAuthorDto;
import vn.dongthanh.vsmt.citizen.api.MarketController.PageDto;
import vn.dongthanh.vsmt.citizen.domain.MarketCategory;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketFilterKeyword;
import vn.dongthanh.vsmt.citizen.domain.MarketModeration;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketPostReport;
import vn.dongthanh.vsmt.citizen.domain.MarketPostStatus;
import vn.dongthanh.vsmt.citizen.domain.MarketReportReason;
import vn.dongthanh.vsmt.citizen.domain.MarketReportResolution;
import vn.dongthanh.vsmt.citizen.domain.MarketTag;
import vn.dongthanh.vsmt.citizen.service.MarketModerationService;
import vn.dongthanh.vsmt.citizen.service.MarketModerationService.AdminDetail;
import vn.dongthanh.vsmt.citizen.service.MarketModerationService.AdminPostView;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/** Cán bộ xã quản lý chợ đồ cũ: danh sách bài, duyệt bài chờ/bị báo cáo, bộ lọc từ khóa trước khi đăng. */
@Tag(name = "Chợ đồ cũ: kiểm duyệt (cán bộ xã)")
@RestController
@Validated
@RequestMapping("/api/market-moderation")
@RequiredArgsConstructor
public class MarketModerationController {

    private final MarketModerationService moderation;

    @Operation(summary = "Số bài chờ duyệt và số bài có báo cáo chưa xử lý")
    @GetMapping("/summary")
    public MarketModerationSummaryDto summary(@AuthenticationPrincipal CurrentUser actor) {
        MarketModerationService.Summary s = moderation.summary(actor);
        return new MarketModerationSummaryDto(s.pendingReview(), s.reported());
    }

    @Operation(summary = "Mọi bài (kể cả ẩn, chờ duyệt, bị gỡ); reported=true chỉ bài có báo cáo chưa xử lý")
    @GetMapping("/posts")
    public PageDto<MarketAdminPostDto> list(@AuthenticationPrincipal CurrentUser actor,
            @RequestParam(required = false) MarketModeration moderation,
            @RequestParam(required = false) MarketPostStatus status,
            @RequestParam(defaultValue = "false") boolean reported,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return PageDto.of(this.moderation.list(actor, moderation, status, reported, q, page, size)
                .map(MarketAdminPostDto::of));
    }

    @Operation(summary = "Chi tiết bài kèm báo cáo, bình luận và từ khóa lọc bị khớp")
    @GetMapping("/posts/{id}")
    public MarketAdminDetailDto detail(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long id) {
        return MarketAdminDetailDto.of(moderation.detail(actor, id));
    }

    @Operation(summary = "Ảnh của bài (mọi trạng thái)")
    @GetMapping("/posts/{id}/images/{imageId}")
    public ResponseEntity<byte[]> image(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long id,
            @PathVariable Long imageId) throws IOException {
        return MarketReadController.privateImage(moderation.image(actor, id, imageId));
    }

    @Operation(summary = "Duyệt / giữ bài: hiển thị trên chợ, đóng các báo cáo chưa xử lý")
    @PostMapping("/posts/{id}/approve")
    public MarketAdminPostDto approve(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long id,
            @Valid @RequestBody MarketModerationRequest r) {
        return MarketAdminPostDto.of(moderation.approve(actor, id, r.note()));
    }

    @Operation(summary = "Gỡ / từ chối bài (bắt buộc lý do), đóng các báo cáo chưa xử lý")
    @PostMapping("/posts/{id}/reject")
    public MarketAdminPostDto reject(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long id,
            @Valid @RequestBody MarketModerationRequest r) {
        return MarketAdminPostDto.of(moderation.reject(actor, id, r.note()));
    }

    @Operation(summary = "Từ khóa của bộ lọc trước khi đăng")
    @GetMapping("/keywords")
    public List<MarketKeywordDto> keywords(@AuthenticationPrincipal CurrentUser actor) {
        return moderation.keywords(actor).stream().map(MarketKeywordDto::of).toList();
    }

    @Operation(summary = "Thêm từ khóa lọc")
    @PostMapping("/keywords")
    @ResponseStatus(HttpStatus.CREATED)
    public MarketKeywordDto addKeyword(@AuthenticationPrincipal CurrentUser actor,
            @Valid @RequestBody MarketKeywordRequest r) {
        return MarketKeywordDto.of(moderation.addKeyword(actor, r.keyword()));
    }

    @Operation(summary = "Xóa từ khóa lọc")
    @DeleteMapping("/keywords/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeKeyword(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long id) {
        moderation.removeKeyword(actor, id);
    }

    // ---------- Request ----------

    public record MarketModerationRequest(@Size(max = 500) String note) {
    }

    public record MarketKeywordRequest(@NotBlank(message = "không được để trống") @Size(max = 100) String keyword) {
    }

    // ---------- Response ----------

    public record MarketModerationSummaryDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) long pendingReview,
            @Schema(requiredMode = RequiredMode.REQUIRED) long reported) {
    }

    public record MarketAdminPostDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String caption,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketTag> tags,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketCategory category,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAreaDto area,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<String> photoUrls,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketPostStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean hidden,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketModeration moderation,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String moderationNote,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime moderatedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) long openReports,
            @Schema(requiredMode = RequiredMode.REQUIRED) long commentCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAuthorDto author,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime editedAt) {

        static MarketAdminPostDto of(AdminPostView v) {
            MarketPost p = v.post();
            return new MarketAdminPostDto(p.getId(), p.getCode(), p.getCaption(),
                    p.getTags().stream().sorted().toList(), p.getCategory(),
                    new MarketAreaDto(v.areaCode(), v.areaName()),
                    v.imageIds().stream().map(i -> "/api/market-moderation/posts/" + p.getId() + "/images/" + i)
                            .toList(),
                    p.getStatus(), p.isHidden(), p.getModeration(), p.getModerationNote(), p.getModeratedAt(),
                    v.openReports(), v.commentCount(), new MarketAuthorDto(p.getAuthor().getId(), v.authorName()),
                    p.getCreatedAt(), p.getEditedAt());
        }
    }

    public record MarketReportDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketReportReason reason,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED) String reporterName,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) MarketReportResolution resolution,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime resolvedAt) {

        static MarketReportDto of(MarketPostReport r) {
            return new MarketReportDto(r.getId(), r.getReason(), r.getNote(), r.getReporter().getDisplayName(),
                    r.getCreatedAt(), r.getResolution(), r.getResolvedAt());
        }
    }

    public record MarketAdminCommentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED) String authorName,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static MarketAdminCommentDto of(MarketComment c) {
            return new MarketAdminCommentDto(c.getId(), c.getContent(), c.getAuthor().getDisplayName(),
                    c.getCreatedAt());
        }
    }

    public record MarketAdminDetailDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) MarketAdminPostDto post,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketReportDto> reports,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketAdminCommentDto> comments,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<String> matchedKeywords) {

        static MarketAdminDetailDto of(AdminDetail d) {
            return new MarketAdminDetailDto(MarketAdminPostDto.of(d.view()),
                    d.reports().stream().map(MarketReportDto::of).toList(),
                    d.comments().stream().map(MarketAdminCommentDto::of).toList(), d.matchedKeywords());
        }
    }

    public record MarketKeywordDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String keyword,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static MarketKeywordDto of(MarketFilterKeyword k) {
            return new MarketKeywordDto(k.getId(), k.getKeyword(), k.getCreatedAt());
        }
    }
}
