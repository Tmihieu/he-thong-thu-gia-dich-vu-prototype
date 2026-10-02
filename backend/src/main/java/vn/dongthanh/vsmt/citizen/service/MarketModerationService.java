package vn.dongthanh.vsmt.citizen.service;

import java.io.IOException;
import java.text.Normalizer;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository.CommentCount;
import vn.dongthanh.vsmt.citizen.domain.MarketFilterKeyword;
import vn.dongthanh.vsmt.citizen.domain.MarketFilterKeywordRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketImage;
import vn.dongthanh.vsmt.citizen.domain.MarketImageRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketModeration;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketPostReport;
import vn.dongthanh.vsmt.citizen.domain.MarketPostReportRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketPostReportRepository.ReportCount;
import vn.dongthanh.vsmt.citizen.domain.MarketPostRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketPostStatus;
import vn.dongthanh.vsmt.citizen.domain.MarketReportResolution;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage.StoredPhoto;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Kiểm duyệt chợ đồ cũ của cán bộ xã: danh sách mọi bài, xử lý bài chờ duyệt/bị báo cáo, quản lý từ khóa lọc.
 * Bộ lọc ({@link #matchedKeywords}) chạy khi người dân đăng/sửa bài; khớp từ khóa thì bài chờ duyệt.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MarketModerationService {

    private final MarketPostRepository posts;
    private final MarketPostReportRepository reports;
    private final MarketFilterKeywordRepository keywords;
    private final MarketCommentRepository comments;
    private final MarketImageRepository images;
    private final PhotoStorage photos;
    private final NotificationService notifications;

    // ---------- Bộ lọc ----------

    /** Từ khóa xuất hiện như một cụm từ riêng (không dính chữ khác), không phân biệt hoa thường, chuẩn hóa NFC. */
    @Transactional(readOnly = true)
    public List<String> matchedKeywords(String text) {
        String haystack = nfc(text).toLowerCase(Locale.ROOT);
        return keywords.findAll(Sort.by("keyword")).stream().map(MarketFilterKeyword::getKeyword)
                .filter(k -> Pattern.compile("(?<![\\p{L}\\p{N}])" + Pattern.quote(nfc(k).toLowerCase(Locale.ROOT))
                        + "(?![\\p{L}\\p{N}])").matcher(haystack).find())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MarketFilterKeyword> keywords(CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        return keywords.findAll(Sort.by("keyword"));
    }

    public MarketFilterKeyword addKeyword(CurrentUser actor, String raw) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        String keyword = nfc(raw == null ? "" : raw).strip().replaceAll("\\s+", " ");
        if (keyword.isEmpty() || keyword.length() > 100) {
            throw new BusinessRuleException("MARKET_KEYWORD_INVALID", "Từ khóa phải có 1–100 ký tự.");
        }
        if (keywords.existsIgnoreCase(keyword)) {
            throw new ConflictException("MARKET_KEYWORD_EXISTS", "Từ khóa \"" + keyword + "\" đã có trong bộ lọc.");
        }
        return keywords.save(MarketFilterKeyword.of(keyword, actor.id(), OffsetDateTime.now()));
    }

    public void removeKeyword(CurrentUser actor, Long id) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        keywords.deleteById(id);
    }

    // ---------- Danh sách / chi tiết ----------

    @Transactional(readOnly = true)
    public Summary summary(CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        return new Summary(posts.countByModeration(MarketModeration.PENDING_REVIEW),
                posts.admin(null, null, true, "%", PageRequest.of(0, 1)).getTotalElements());
    }

    @Transactional(readOnly = true)
    public Page<AdminPostView> list(CurrentUser actor, MarketModeration moderation, MarketPostStatus status,
            boolean reported, String q, int page, int size) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        String pattern = "%" + MarketService.likeEscape(q == null ? "" : q.strip().toLowerCase()) + "%";
        Page<MarketPost> rows = posts.admin(moderation, status, reported, pattern,
                PageRequest.of(page, size, MarketService.NEWEST));
        return new PageImpl<>(views(rows.getContent()), rows.getPageable(), rows.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminDetail detail(CurrentUser actor, Long id) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        MarketPost post = require(id);
        List<MarketComment> all = comments.visible(id, -1L, PageRequest.of(0, 200, Sort.by("createdAt", "id")))
                .getContent();
        return new AdminDetail(views(List.of(post)).getFirst(), reports.findAllForPost(id), all,
                matchedKeywords(post.getCaption()));
    }

    @Transactional(readOnly = true)
    public StoredPhoto image(CurrentUser actor, Long postId, Long imageId) throws IOException {
        actor.requireRole(Role.COMMUNE_OFFICER);
        MarketImage img = images.findById(imageId).filter(i -> postId.equals(i.getPostId()))
                .orElseThrow(MarketModerationService::notFound);
        return photos.load(img.getStorageName());
    }

    // ---------- Xử lý ----------

    /** Duyệt / giữ bài: bài lên feed, báo cáo đang mở đóng với kết quả "giữ". */
    public AdminPostView approve(CurrentUser actor, Long id, String note) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        MarketPost post = posts.lockById(id).orElseThrow(MarketModerationService::notFound);
        boolean wasHeld = !post.isPublished();
        post.moderate(MarketModeration.PUBLISHED, blankToNull(note), actor.id(), OffsetDateTime.now());
        resolveOpenReports(id, MarketReportResolution.KEPT, actor);
        if (wasHeld) {
            notifyAuthor(post, "Bài " + post.getCode() + " đã được duyệt và hiển thị trên chợ.");
        }
        posts.flush();
        return views(List.of(post)).getFirst();
    }

    /** Gỡ / từ chối bài: bài không còn hiển thị, chủ bài thấy lý do; báo cáo đang mở đóng với kết quả "gỡ". */
    public AdminPostView reject(CurrentUser actor, Long id, String note) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        String reason = blankToNull(note);
        if (reason == null) {
            throw new BusinessRuleException("MARKET_REJECT_REASON_REQUIRED", "Nhập lý do gỡ bài để báo cho người đăng.");
        }
        MarketPost post = posts.lockById(id).orElseThrow(MarketModerationService::notFound);
        post.moderate(MarketModeration.REJECTED, reason, actor.id(), OffsetDateTime.now());
        resolveOpenReports(id, MarketReportResolution.REMOVED, actor);
        notifyAuthor(post, "Bài " + post.getCode() + " đã bị gỡ khỏi chợ. Lý do: " + reason);
        posts.flush();
        return views(List.of(post)).getFirst();
    }

    /** Báo cán bộ xã có bài cần xem (chờ duyệt vì bộ lọc / bị báo cáo). */
    void notifyOfficers(MarketPost post, String body) {
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.INFO,
                "Chợ đồ cũ: bài " + post.getCode() + " cần xem xét", body,
                Map.of("screen", "commune.market", "params", Map.of("postId", post.getId()))), null);
    }

    private void notifyAuthor(MarketPost post, String body) {
        notifications.publish(NotificationCommand.toCitizen(post.getAuthor().getId(), NotificationKind.INFO,
                "Chợ đồ cũ", body, Map.of("screen", "citizen.marketDetail", "params",
                        Map.of("postId", post.getId()))), null);
    }

    private void resolveOpenReports(Long postId, MarketReportResolution resolution, CurrentUser actor) {
        OffsetDateTime now = OffsetDateTime.now();
        reports.findByPostIdAndResolvedAtIsNull(postId).forEach(r -> r.resolve(resolution, actor.id(), now));
    }

    private MarketPost require(Long id) {
        return posts.findByIdWithAuthor(id).orElseThrow(MarketModerationService::notFound);
    }

    private List<AdminPostView> views(List<MarketPost> list) {
        if (list.isEmpty()) {
            return List.of();
        }
        List<Long> ids = list.stream().map(MarketPost::getId).toList();
        Map<Long, Long> commentCounts = comments.countVisible(ids, -1L).stream()
                .collect(Collectors.toMap(CommentCount::getPostId, CommentCount::getTotal));
        Map<Long, Long> reportCounts = reports.countOpen(ids).stream()
                .collect(Collectors.toMap(ReportCount::getPostId, ReportCount::getTotal));
        Map<Long, List<Long>> imageIds = images.findByPostIdInOrderBySortOrderAscIdAsc(ids).stream()
                .collect(Collectors.groupingBy(MarketImage::getPostId, Collectors.mapping(MarketImage::getId,
                        Collectors.toList())));
        return list.stream().map(p -> new AdminPostView(p, imageIds.getOrDefault(p.getId(), List.of()),
                commentCounts.getOrDefault(p.getId(), 0L), reportCounts.getOrDefault(p.getId(), 0L),
                p.getArea().getCode(), p.getArea().getName(), p.getAuthor().getDisplayName())).toList();
    }

    private static String nfc(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFC);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    private static NotFoundException notFound() {
        return new NotFoundException("MARKET_POST_NOT_FOUND", "Bài đăng không tồn tại.");
    }

    public record Summary(long pendingReview, long reported) {
    }

    public record AdminPostView(MarketPost post, List<Long> imageIds, long commentCount, long openReports,
            String areaCode, String areaName, String authorName) {
    }

    public record AdminDetail(AdminPostView view, List<MarketPostReport> reports, List<MarketComment> comments,
            List<String> matchedKeywords) {
    }
}
