package vn.dongthanh.vsmt.citizen.service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketCategory;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository.CommentCount;
import vn.dongthanh.vsmt.citizen.domain.MarketImage;
import vn.dongthanh.vsmt.citizen.domain.MarketImageRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketPostRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketPostStatus;
import vn.dongthanh.vsmt.citizen.domain.MarketSavedPost;
import vn.dongthanh.vsmt.citizen.domain.MarketSavedPostRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketTag;
import vn.dongthanh.vsmt.citizen.domain.MarketUserBlock;
import vn.dongthanh.vsmt.citizen.domain.MarketUserBlockRepository;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage.StoredPhoto;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.common.RateLimitException;
import vn.dongthanh.vsmt.platform.common.UnauthorizedException;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Chợ đồ cũ v2 (docs/cho-do-cu-spec.md). Người dân ACTIVE đọc + tương tác; 5 vai trò nội bộ ACTIVE chỉ đọc (D06).
 * Một chính sách xem ({@link #viewable}) dùng chung cho feed/chi tiết/bình luận/ảnh/SĐT/lưu: bài ẩn chỉ chủ bài xem,
 * chặn hai chiều → 404 như không tồn tại. Đăng là hiển thị, không kiểm duyệt (D05).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MarketService {

    public static final int MAX_PHOTOS = 5;
    public static final int MAX_POSTS_PER_DAY = 10;
    public static final int MAX_COMMENTS_PER_10_MIN = 30;
    public static final int MAX_UPLOADS_PER_DAY = 50;
    static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final Sort NEWEST = Sort.by(Sort.Direction.DESC, "createdAt", "id");
    private static final long NO_VIEWER = -1L;
    // Giờ hệ thống (không dùng Clock bean) để cửa sổ hạn mức cùng nguồn giờ với @CreationTimestamp của bài/bình luận.

    private final MarketPostRepository posts;
    private final MarketCommentRepository comments;
    private final MarketImageRepository images;
    private final MarketSavedPostRepository saved;
    private final MarketUserBlockRepository blocks;
    private final CitizenAccountRepository accounts;
    private final AreaRepository areas;
    private final UserRepository users;
    private final CitizenQueryService citizens;
    private final PhotoStorage photos;
    private final NotificationService notifications;

    /** Người xem: citizenId null là tài khoản nội bộ (chỉ đọc). */
    public record Viewer(Long citizenId) {
        boolean internal() {
            return citizenId == null;
        }

        long key() {
            return internal() ? NO_VIEWER : citizenId;
        }
    }

    // ---------- Đọc (mọi vai trò đã đăng nhập) ----------

    /** Kiểm tài khoản còn hoạt động ở server, token còn hạn chưa đủ. */
    @Transactional(readOnly = true)
    public Viewer viewer(Authentication auth) {
        Object p = auth == null ? null : auth.getPrincipal();
        if (p instanceof CurrentCitizen c) {
            return new Viewer(citizens.requireActive(c).getId());
        }
        if (p instanceof CurrentUser u && users.findById(u.id()).filter(User::isActive).isPresent()) {
            return new Viewer(null);
        }
        throw new UnauthorizedException("UNAUTHORIZED", "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
    }

    @Transactional(readOnly = true)
    public List<Area> areas() {
        return areas.findAll(Sort.by("code"));
    }

    @Transactional(readOnly = true)
    public Page<PostView> feed(Viewer viewer, String q, Set<MarketTag> tags, MarketCategory category, Long areaId,
            int page, int size) {
        Set<MarketTag> anyOf = tags == null || tags.isEmpty() ? EnumSet.allOf(MarketTag.class) : tags;
        String pattern = "%" + likeEscape(q == null ? "" : q.strip().toLowerCase()) + "%";
        return views(viewer, posts.feed(MarketPostStatus.OPEN, anyOf, category, areaId, pattern, viewer.key(),
                PageRequest.of(page, size, NEWEST)));
    }

    @Transactional(readOnly = true)
    public PostView detail(Viewer viewer, Long id) {
        return views(viewer, List.of(requireViewable(viewer, id))).getFirst();
    }

    @Transactional(readOnly = true)
    public Page<MarketComment> comments(Viewer viewer, Long postId, int page, int size) {
        requireViewable(viewer, postId);
        return comments.visible(postId, viewer.key(),
                PageRequest.of(page, size, Sort.by("createdAt", "id")));
    }

    @Transactional(readOnly = true)
    public StoredPhoto image(Viewer viewer, Long postId, Long imageId) throws IOException {
        requireViewable(viewer, postId);
        MarketImage img = images.findById(imageId).filter(i -> postId.equals(i.getPostId()))
                .orElseThrow(MarketService::notFound);
        return photos.load(img.getStorageName());
    }

    // ---------- Người dân: bài của tôi ----------

    @Transactional(readOnly = true)
    public Page<PostView> mine(CurrentCitizen citizen, MarketPostStatus status, Boolean hidden, int page, int size) {
        Viewer v = citizenViewer(citizen);
        return views(v, posts.mine(v.citizenId(), status, hidden, PageRequest.of(page, size, NEWEST)));
    }

    public PostView create(CurrentCitizen citizen, PostCommand cmd, UUID requestId) {
        CitizenAccount author = citizens.requireActive(citizen);
        MarketPost.Content content = normalize(cmd);
        String fp = fingerprint(content, cmd.photoIds());
        posts.lockKey("market:post:" + author.getId());
        MarketPost existing = posts.findByAuthorIdAndClientRequestId(author.getId(), requestId).orElse(null);
        if (existing != null) {
            requireSameRequest(existing.getRequestFingerprint(), fp);
            return views(new Viewer(author.getId()), List.of(existing)).getFirst();
        }
        OffsetDateTime startOfDay = ZonedDateTime.now(ZONE).toLocalDate().atStartOfDay(ZONE)
                .toOffsetDateTime();
        if (posts.countByAuthorIdAndCreatedAtGreaterThanEqual(author.getId(), startOfDay) >= MAX_POSTS_PER_DAY) {
            throw rateLimited("Mỗi ngày đăng tối đa " + MAX_POSTS_PER_DAY + " bài.", untilTomorrow());
        }
        List<MarketImage> attach = requireAttachable(author.getId(), null, cmd.photoIds());
        posts.lockKey("CDC-");
        String code = "CDC-%03d".formatted(posts.maxCodeNumber() + 1);
        MarketPost post = posts.save(MarketPost.create(code, author, content, requestId, fp));
        attachAll(post.getId(), attach, List.of());
        return views(new Viewer(author.getId()), List.of(post)).getFirst();
    }

    /** Dữ liệu màn sửa (kèm SĐT, version); chỉ chủ bài. */
    @Transactional(readOnly = true)
    public PostView editPayload(CurrentCitizen citizen, Long id) {
        Viewer v = citizenViewer(citizen);
        return views(v, List.of(requireOwn(v, id))).getFirst();
    }

    public PostView edit(CurrentCitizen citizen, Long id, PostCommand cmd, int version) {
        Viewer v = citizenViewer(citizen);
        // Cùng khóa với tạo bài: hai request song song không cùng gắn một ảnh chưa gắn vào hai bài.
        posts.lockKey("market:post:" + v.citizenId());
        MarketPost post = requireOwnLocked(v, id);
        requireVersion(post, version);
        MarketPost.Content content = normalize(cmd);
        List<MarketImage> current = images.findByPostIdInOrderBySortOrderAscIdAsc(List.of(id));
        List<MarketImage> next = requireAttachable(v.citizenId(), id, cmd.photoIds());
        post.edit(content, OffsetDateTime.now());
        attachAll(id, next, current);
        posts.flush();
        return views(v, List.of(post)).getFirst();
    }

    /** Đã đúng trạng thái → thành công không ghi (kể cả version cũ); đổi thật mới kiểm version. */
    public PostView changeStatus(CurrentCitizen citizen, Long id, MarketPostStatus status, int version) {
        Viewer v = citizenViewer(citizen);
        MarketPost post = requireOwnLocked(v, id);
        if (post.getStatus() != status) {
            requireVersion(post, version);
            post.setStatus(status);
            posts.flush();
        }
        return views(v, List.of(post)).getFirst();
    }

    public PostView setVisibility(CurrentCitizen citizen, Long id, boolean hidden, int version) {
        Viewer v = citizenViewer(citizen);
        MarketPost post = requireOwnLocked(v, id);
        if (post.isHidden() != hidden) {
            requireVersion(post, version);
            post.setHidden(hidden);
            posts.flush();
        }
        return views(v, List.of(post)).getFirst();
    }

    /** SĐT chủ bài tự chia sẻ: chỉ người dân, bài OPEN không ẩn, không chặn; không chia sẻ → 404. */
    @Transactional(readOnly = true)
    public String contact(CurrentCitizen citizen, Long id) {
        MarketPost post = requireViewable(citizenViewer(citizen), id);
        if (post.getStatus() != MarketPostStatus.OPEN || post.isHidden() || post.contactPhoneForAuthorizedReader() == null) {
            throw notFound();
        }
        return post.contactPhoneForAuthorizedReader();
    }

    // ---------- Bình luận + thông báo ----------

    public MarketComment comment(CurrentCitizen citizen, Long postId, String rawContent, UUID requestId) {
        CitizenAccount me = citizens.requireActive(citizen);
        Viewer v = new Viewer(me.getId());
        String content = rawContent.strip();
        String fp = sha256(postId + "\n" + content);
        posts.lockKey("market:comment:" + me.getId());
        MarketPost post = posts.lockById(postId).filter(p -> viewable(v, p)).orElseThrow(MarketService::notFound);
        MarketComment existing = comments.findByAuthorIdAndClientRequestId(me.getId(), requestId).orElse(null);
        if (existing != null) {
            requireSameRequest(existing.getRequestFingerprint(), fp);
            return existing;
        }
        if (post.getStatus() != MarketPostStatus.OPEN || post.isHidden()) {
            throw new BusinessRuleException("MARKET_POST_CLOSED", "Bài " + post.getCode() + " không nhận bình luận mới.");
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (comments.countByAuthorIdAndCreatedAtGreaterThanEqual(me.getId(), now.minusMinutes(10))
                >= MAX_COMMENTS_PER_10_MIN) {
            throw rateLimited("Tối đa " + MAX_COMMENTS_PER_10_MIN + " bình luận mỗi 10 phút.", 600);
        }
        MarketComment saved = comments.save(MarketComment.create(post, me, content, requestId, fp));
        notifyComment(post, me.getId());
        return saved;
    }

    /**
     * Người khác bình luận → chủ bài; chủ bài bình luận → những người từng bình luận. Cùng transaction với bình luận,
     * mỗi bình luận chạy đúng một lần (retry trả bản cũ trước khi tới đây) nên không trùng. Nội dung cố định, không
     * chép caption/bình luận/SĐT.
     */
    private void notifyComment(MarketPost post, Long commenterId) {
        Long authorId = post.getAuthor().getId();
        List<Long> recipients = commenterId.equals(authorId)
                ? comments.commenterIds(post.getId()) : List.of(authorId);
        for (Long r : recipients) {
            if (r.equals(commenterId) || blocks.blockedEitherWay(r, commenterId)
                    || !accounts.findById(r).map(CitizenAccount::isActive).orElse(false)) {
                continue;
            }
            notifications.publish(NotificationCommand.toCitizen(r, NotificationKind.INFO, "Chợ đồ cũ",
                    "Có bình luận mới trong bài đăng",
                    Map.of("screen", "citizen.marketDetail", "params", Map.of("postId", post.getId()))), null);
        }
    }

    // ---------- Ảnh ----------

    public MarketImage upload(CurrentCitizen citizen, MultipartFile file) throws IOException {
        Long me = citizens.requireActive(citizen).getId();
        posts.lockKey("market:upload:" + me);
        OffsetDateTime startOfDay = ZonedDateTime.now(ZONE).toLocalDate().atStartOfDay(ZONE)
                .toOffsetDateTime();
        if (images.countByUploaderIdAndCreatedAtGreaterThanEqual(me, startOfDay) >= MAX_UPLOADS_PER_DAY) {
            throw rateLimited("Mỗi ngày tải tối đa " + MAX_UPLOADS_PER_DAY + " ảnh.", untilTomorrow());
        }
        return images.save(MarketImage.uploaded(photos.save(file), me, OffsetDateTime.now()));
    }

    /** Ảnh chưa gắn: chỉ người tải; đã gắn: theo quyền bài. */
    @Transactional(readOnly = true)
    public StoredPhoto preview(CurrentCitizen citizen, Long imageId) throws IOException {
        Viewer v = citizenViewer(citizen);
        MarketImage img = images.findById(imageId).orElseThrow(MarketService::notFound);
        boolean ok = img.getPostId() == null ? v.citizenId().equals(img.getUploaderId())
                : posts.findByIdWithAuthor(img.getPostId()).filter(p -> viewable(v, p)).isPresent();
        if (!ok) {
            throw notFound();
        }
        return photos.load(img.getStorageName());
    }

    /**
     * Route ảnh cũ {@code /api/citizen/photos/{name}}: file thuộc chợ chỉ trả khi có bài tham chiếu người xem được đọc,
     * hoặc là ảnh legacy dùng chung với rác cồng kềnh (giữ quyền bulky hiện hữu).
     */
    @Transactional(readOnly = true)
    public boolean legacyPhotoReadable(Long citizenId, String name) {
        List<MarketImage> refs = images.findByStorageName(name);
        if (refs.isEmpty() || images.usedByBulky(name)) {
            return true;
        }
        Viewer v = new Viewer(citizenId);
        return refs.stream().anyMatch(i -> i.getPostId() != null
                && posts.findByIdWithAuthor(i.getPostId()).filter(p -> viewable(v, p)).isPresent());
    }

    /** Không nhận vào nghiệp vụ khác (rác cồng kềnh) file đã đánh dấu chợ, tránh đi vòng quyền đọc. */
    @Transactional(readOnly = true)
    public boolean isMarketPhoto(List<String> names) {
        return names != null && !names.isEmpty() && images.existsByStorageNameIn(names);
    }

    // ---------- Lưu bài ----------

    @Transactional(readOnly = true)
    public Page<SavedView> savedPosts(CurrentCitizen citizen, int page, int size) {
        Viewer v = citizenViewer(citizen);
        Page<MarketSavedPost> rows = saved.findByCitizenId(v.citizenId(), PageRequest.of(page, size,
                Sort.by(Sort.Direction.DESC, "createdAt", "postId")));
        List<MarketPost> visible = rows.stream()
                .map(s -> posts.findByIdWithAuthor(s.getPostId()).filter(p -> viewable(v, p)).orElse(null))
                .filter(p -> p != null).toList();
        Map<Long, PostView> byId = views(v, visible).stream()
                .collect(Collectors.toMap(pv -> pv.post().getId(), pv -> pv));
        return rows.map(s -> new SavedView(s.getPostId(), byId.get(s.getPostId())));
    }

    public void save(CurrentCitizen citizen, Long postId) {
        Viewer v = citizenViewer(citizen);
        requireViewable(v, postId);
        if (!saved.existsById(new MarketSavedPost.Key(v.citizenId(), postId))) {
            saved.save(MarketSavedPost.of(v.citizenId(), postId, OffsetDateTime.now()));
        }
    }

    /** Bỏ lưu được cả bài không còn xem được. */
    public void unsave(CurrentCitizen citizen, Long postId) {
        saved.deleteById(new MarketSavedPost.Key(citizenViewer(citizen).citizenId(), postId));
    }

    // ---------- Chặn ----------

    @Transactional(readOnly = true)
    public Page<BlockView> blocked(CurrentCitizen citizen, int page, int size) {
        Long me = citizenViewer(citizen).citizenId();
        return blocks.findByBlockerId(me, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
                .map(b -> new BlockView(b.getBlockedId(),
                        accounts.findById(b.getBlockedId()).map(CitizenAccount::getDisplayName).orElse("")));
    }

    public void block(CurrentCitizen citizen, Long targetId) {
        Long me = citizenViewer(citizen).citizenId();
        if (me.equals(targetId)) {
            throw new BusinessRuleException("MARKET_BLOCK_SELF", "Không thể chặn chính mình.");
        }
        if (!accounts.existsById(targetId)) {
            throw new NotFoundException("MARKET_USER_NOT_FOUND", "Không tìm thấy người dùng.");
        }
        if (!blocks.existsById(new MarketUserBlock.Key(me, targetId))) {
            blocks.save(MarketUserBlock.of(me, targetId, OffsetDateTime.now()));
        }
    }

    public void unblock(CurrentCitizen citizen, Long targetId) {
        blocks.deleteById(new MarketUserBlock.Key(citizenViewer(citizen).citizenId(), targetId));
    }

    // ---------- Quyền ----------

    private boolean viewable(Viewer v, MarketPost p) {
        boolean mine = !v.internal() && p.isAuthoredBy(v.citizenId());
        if (p.isHidden() && !mine) {
            return false;
        }
        return v.internal() || mine || !blocks.blockedEitherWay(v.citizenId(), p.getAuthor().getId());
    }

    private MarketPost requireViewable(Viewer v, Long id) {
        return posts.findByIdWithAuthor(id).filter(p -> viewable(v, p)).orElseThrow(MarketService::notFound);
    }

    /** Không xem được → 404; xem được nhưng không phải chủ → 403. */
    private MarketPost requireOwn(Viewer v, Long id) {
        MarketPost p = requireViewable(v, id);
        if (!p.isAuthoredBy(v.citizenId())) {
            throw new AccessDeniedException("Chỉ người đăng được sửa bài " + p.getCode());
        }
        return p;
    }

    private MarketPost requireOwnLocked(Viewer v, Long id) {
        requireOwn(v, id);
        return posts.lockById(id).orElseThrow(MarketService::notFound);
    }

    private Viewer citizenViewer(CurrentCitizen citizen) {
        return new Viewer(citizens.requireActive(citizen).getId());
    }

    private static void requireVersion(MarketPost p, int version) {
        if (p.getVersion() != version) {
            throw new ConflictException("MARKET_POST_CONFLICT",
                    "Bài đăng vừa được thay đổi ở nơi khác. Vui lòng tải lại rồi thử lại.");
        }
    }

    private static void requireSameRequest(String storedFp, String fp) {
        if (!fp.equals(storedFp)) {
            throw new ConflictException("IDEMPOTENCY_CONFLICT",
                    "Mã yêu cầu đã được dùng cho nội dung khác. Vui lòng tải lại rồi thử lại.");
        }
    }

    // ---------- Ảnh gắn bài ----------

    /**
     * Ảnh hợp lệ cho bài: upload chưa gắn của chính mình, hoặc ảnh đang gắn đúng bài đang sửa ({@code postId}).
     * Không nhận ảnh của người khác/bài khác/legacy đã tháo.
     */
    private List<MarketImage> requireAttachable(Long me, Long postId, List<Long> ids) {
        List<Long> distinct = ids == null ? List.of() : new ArrayList<>(new LinkedHashSet<>(ids));
        if (distinct.size() > MAX_PHOTOS) {
            throw new BusinessRuleException("MARKET_PHOTO_LIMIT", "Tối đa " + MAX_PHOTOS + " ảnh.");
        }
        Map<Long, MarketImage> found = images.findAllById(distinct).stream()
                .collect(Collectors.toMap(MarketImage::getId, i -> i));
        List<MarketImage> result = new ArrayList<>();
        for (Long id : distinct) {
            MarketImage i = found.get(id);
            boolean ok = i != null && (postId != null && postId.equals(i.getPostId())
                    || i.getPostId() == null && !i.isLegacy() && me.equals(i.getUploaderId()));
            if (!ok) {
                throw new BusinessRuleException("PHOTO_NOT_FOUND", "Ảnh không tồn tại. Vui lòng tải ảnh lên lại.");
            }
            result.add(i);
        }
        return result;
    }

    private void attachAll(Long postId, List<MarketImage> next, List<MarketImage> current) {
        current.stream().filter(i -> !next.contains(i)).forEach(MarketImage::detach);
        for (int k = 0; k < next.size(); k++) {
            next.get(k).attach(postId, k);
        }
    }

    // ---------- Chuẩn hóa ----------

    private static MarketPost.Content normalize(PostCommand cmd) {
        String caption = cmd.caption() == null ? "" : cmd.caption().strip();
        if (caption.isEmpty() || caption.length() > 2500) {
            throw new BusinessRuleException("MARKET_CAPTION_INVALID", "Nội dung bài phải có 1–2.500 ký tự.");
        }
        Set<MarketTag> tags = cmd.tags() == null || cmd.tags().isEmpty() ? Set.of() : EnumSet.copyOf(cmd.tags());
        if (tags.isEmpty()) {
            throw new BusinessRuleException("MARKET_TAGS_REQUIRED", "Chọn ít nhất một nhãn.");
        }
        String phone = null;
        if (Boolean.TRUE.equals(cmd.sharePhone())) {
            phone = PhoneNumbers.normalize(cmd.contactPhone()).orElseThrow(() -> new BusinessRuleException(
                    "MARKET_PHONE_INVALID", "Số điện thoại liên hệ không hợp lệ."));
        }
        return new MarketPost.Content(caption, tags, cmd.category() == null ? MarketCategory.OTHER : cmd.category(),
                phone);
    }

    private static String fingerprint(MarketPost.Content c, List<Long> photoIds) {
        return sha256(c.caption() + "\n" + new TreeSet<>(c.tags()) + "\n" + c.category() + "\n"
                + c.contactPhone() + "\n" + (photoIds == null ? List.of() : new LinkedHashSet<>(photoIds)));
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** {@code %}, {@code _}, {@code !} là ký tự người dùng, không phải wildcard (query dùng escape {@code !}). */
    static String likeEscape(String s) {
        return s.replace("!", "!!").replace("%", "!%").replace("_", "!_");
    }

    private long untilTomorrow() {
        ZonedDateTime now = ZonedDateTime.now(ZONE);
        return Duration.between(now, now.toLocalDate().plusDays(1).atStartOfDay(ZONE)).toSeconds();
    }

    private static RateLimitException rateLimited(String message, long retryAfter) {
        return new RateLimitException("MARKET_RATE_LIMIT", message + " Vui lòng thử lại sau.", retryAfter);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("MARKET_POST_NOT_FOUND", "Bài đăng không tồn tại hoặc không còn khả dụng.");
    }

    // ---------- View ----------

    private Page<PostView> views(Viewer v, Page<MarketPost> page) {
        return new PageImpl<>(views(v, page.getContent()), page.getPageable(), page.getTotalElements());
    }

    private List<PostView> views(Viewer v, List<MarketPost> list) {
        if (list.isEmpty()) {
            return List.of();
        }
        List<Long> ids = list.stream().map(MarketPost::getId).toList();
        Map<Long, Long> counts = comments.countVisible(ids, v.key()).stream()
                .collect(Collectors.toMap(CommentCount::getPostId, CommentCount::getTotal));
        Map<Long, List<Long>> imageIds = images.findByPostIdInOrderBySortOrderAscIdAsc(ids).stream()
                .collect(Collectors.groupingBy(MarketImage::getPostId, Collectors.mapping(MarketImage::getId,
                        Collectors.toList())));
        return list.stream().map(p -> {
            boolean mine = !v.internal() && p.isAuthoredBy(v.citizenId());
            boolean open = p.getStatus() == MarketPostStatus.OPEN && !p.isHidden();
            boolean isSaved = !v.internal() && saved.existsById(new MarketSavedPost.Key(v.citizenId(), p.getId()));
            return new PostView(p, counts.getOrDefault(p.getId(), 0L), imageIds.getOrDefault(p.getId(), List.of()),
                    mine, isSaved, !v.internal() && open, !v.internal() && open && p.isSharePhone(),
                    p.getArea().getCode(), p.getArea().getName(), p.getAuthor().getDisplayName());
        }).toList();
    }

    public record PostCommand(String caption, Set<MarketTag> tags, MarketCategory category, List<Long> photoIds,
            Boolean sharePhone, String contactPhone) {
    }

    public record PostView(MarketPost post, long commentCount, List<Long> imageIds, boolean mine, boolean saved,
            boolean canComment, boolean canCall, String areaCode, String areaName, String authorName) {
    }

    /** {@code post} null: bài không còn khả dụng (ẩn/chặn), chỉ còn nút Bỏ lưu. */
    public record SavedView(Long postId, PostView post) {
    }

    public record BlockView(Long citizenId, String displayName) {
    }
}
