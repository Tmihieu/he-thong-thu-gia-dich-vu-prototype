package vn.dongthanh.vsmt.citizen.api;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.api.MarketController.MarketCommentDto;
import vn.dongthanh.vsmt.citizen.api.MarketController.MarketPostDto;
import vn.dongthanh.vsmt.citizen.api.MarketController.PageDto;
import vn.dongthanh.vsmt.citizen.domain.MarketCategory;
import vn.dongthanh.vsmt.citizen.domain.MarketTag;
import vn.dongthanh.vsmt.citizen.service.MarketService;
import vn.dongthanh.vsmt.citizen.service.MarketService.Viewer;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage.StoredPhoto;

/**
 * Đọc chợ cho mọi tài khoản ACTIVE: người dân và 5 vai trò nội bộ (D06). Chỉ GET; SecurityConfig chặn method khác.
 */
@Tag(name = "Chợ đồ cũ: đọc (người dân + nội bộ)")
@RestController
@Validated
@RequestMapping("/api/market")
@RequiredArgsConstructor
public class MarketReadController {

    private final MarketService market;

    @Operation(summary = "Danh mục tag, loại đồ, tổ")
    @GetMapping("/metadata")
    public MarketMetadataDto metadata(Authentication auth) {
        market.viewer(auth);
        return new MarketMetadataDto(Arrays.asList(MarketTag.values()), Arrays.asList(MarketCategory.values()),
                market.areas().stream().map(a -> new AreaDto(a.getId(), a.getCode(), a.getName())).toList());
    }

    @Operation(summary = "Feed bài đang đăng; tag khớp OR, các nhóm lọc AND; mới nhất trước")
    @GetMapping("/posts")
    public PageDto<MarketPostDto> feed(Authentication auth,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) Set<MarketTag> tags,
            @RequestParam(required = false) MarketCategory category,
            @RequestParam(required = false) Long areaId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return PageDto.of(market.feed(market.viewer(auth), q, tags, category, areaId, page, size)
                .map(MarketPostDto::of));
    }

    @Operation(summary = "Chi tiết bài (không kèm bình luận, không SĐT)")
    @GetMapping("/posts/{id}")
    public MarketPostDto detail(Authentication auth, @PathVariable Long id) {
        return MarketPostDto.of(market.detail(market.viewer(auth), id));
    }

    @Operation(summary = "Bình luận của bài, cũ trước, có phân trang và lọc chặn")
    @GetMapping("/posts/{id}/comments")
    public PageDto<MarketCommentDto> comments(Authentication auth, @PathVariable Long id,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        Viewer v = market.viewer(auth);
        return PageDto.of(market.comments(v, id, page, size).map(c -> MarketCommentDto.of(c, v.citizenId())));
    }

    @Operation(summary = "Ảnh của bài, kiểm quyền bài")
    @GetMapping("/posts/{id}/images/{imageId}")
    public ResponseEntity<byte[]> image(Authentication auth, @PathVariable Long id, @PathVariable Long imageId)
            throws IOException {
        return privateImage(market.image(market.viewer(auth), id, imageId));
    }

    static ResponseEntity<byte[]> privateImage(StoredPhoto photo) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate())
                .contentType(MediaType.parseMediaType(photo.contentType())).body(photo.bytes());
    }

    public record AreaDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name) {
    }

    public record MarketMetadataDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketTag> tags,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<MarketCategory> categories,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<AreaDto> areas) {
    }
}
