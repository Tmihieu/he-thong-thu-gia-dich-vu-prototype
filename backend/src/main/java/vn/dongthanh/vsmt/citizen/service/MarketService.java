package vn.dongthanh.vsmt.citizen.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.MarketComment;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketCommentRepository.CommentCount;
import vn.dongthanh.vsmt.citizen.domain.MarketPost;
import vn.dongthanh.vsmt.citizen.domain.MarketPostRepository;
import vn.dongthanh.vsmt.citizen.domain.MarketPostStatus;
import vn.dongthanh.vsmt.citizen.domain.MarketPostType;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/**
 * Chợ đồ cũ (T47): mọi người dân đã đăng nhập xem mọi bài, bình luận được bài đang đăng; chỉ người đăng đóng bài (D9).
 * Không kiểm duyệt (O6).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MarketService {

    /** Theo form đăng bài của prototype ("Thêm tối đa 5 ảnh", citizen-mobile.js); kiểm ở request. */
    public static final int MAX_PHOTOS = 5;

    private final MarketPostRepository posts;
    private final MarketCommentRepository comments;
    private final CitizenQueryService citizens;
    private final PhotoStorage photos;

    @Transactional(readOnly = true)
    public Page<PostView> list(CurrentCitizen citizen, MarketPostStatus status, MarketPostType type, Pageable page) {
        citizens.requireActive(citizen);
        Page<MarketPost> result = posts.search(status, type, page);
        Map<Long, Long> counts = result.isEmpty() ? Map.of()
                : comments.countByPostIds(result.map(MarketPost::getId).getContent()).stream()
                        .collect(Collectors.toMap(CommentCount::getPostId, CommentCount::getTotal));
        return result.map(p -> new PostView(p, counts.getOrDefault(p.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public PostDetail detail(CurrentCitizen citizen, Long id) {
        citizens.requireActive(citizen);
        return new PostDetail(find(id), comments.findByPostWithAuthor(id));
    }

    public MarketPost create(CurrentCitizen citizen, CreatePostCommand cmd) {
        CitizenAccount author = citizens.requireActive(citizen);
        List<String> names = photos.requireStored(cmd.photoNames());
        posts.lockCodePrefix("CDC-");
        String code = "CDC-%03d".formatted(posts.maxCodeNumber() + 1);
        return posts.save(MarketPost.create(code, author, cmd.title().trim(), cmd.postType(),
                cmd.description().trim(), names, blankToNull(cmd.pickupLocation())));
    }

    /** Endpoint giữ dạng đổi trạng thái nhưng chỉ nhận CLOSED: không mở lại bài (quyết định 27/09/2026). */
    public PostView changeStatus(CurrentCitizen citizen, Long id, MarketPostStatus status) {
        Long myId = citizens.requireActive(citizen).getId();
        MarketPost post = find(id);
        if (!post.isAuthoredBy(myId)) {
            throw new AccessDeniedException("Chỉ người đăng được đổi trạng thái bài " + post.getCode());
        }
        if (status != MarketPostStatus.CLOSED) {
            throw new BusinessRuleException("MARKET_POST_STATUS_INVALID",
                    "Chỉ đóng được bài đăng; bài đã đóng không mở lại được.");
        }
        post.close();
        return new PostView(post, comments.countByPostId(id));
    }

    public MarketComment comment(CurrentCitizen citizen, Long postId, String content) {
        CitizenAccount author = citizens.requireActive(citizen);
        MarketPost post = find(postId);
        post.requireOpen("bình luận");
        return comments.save(MarketComment.create(post, author, content.trim()));
    }

    private MarketPost find(Long id) {
        return posts.findByIdWithAuthor(id)
                .orElseThrow(() -> new NotFoundException("MARKET_POST_NOT_FOUND", "Không tìm thấy bài đăng."));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public record CreatePostCommand(String title, MarketPostType postType, String description,
            String pickupLocation, List<String> photoNames) {
    }

    public record PostView(MarketPost post, long commentCount) {
    }

    public record PostDetail(MarketPost post, List<MarketComment> comments) {
    }
}
