package vn.dongthanh.vsmt.complaint.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.GlobalExceptionHandler;
import vn.dongthanh.vsmt.platform.common.ImageSignature;

/** Kiểm tra và lưu ảnh đính kèm khiếu nại; chỉ nhận lại đúng URL do {@link ComplaintPhotoStorage} đã sinh. */
@Service
@RequiredArgsConstructor
public class ComplaintPhotoService {

    public static final int MAX_PHOTOS = 5;
    /** Khớp {@code spring.servlet.multipart.max-file-size}. */
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    private static final String SEPARATOR = "\n";

    private final ComplaintPhotoStorage storage;

    /** Tải một ảnh JPEG/PNG/WebP tối đa 5 MB, trả URL để gắn vào khiếu nại. */
    public String upload(MultipartFile file) throws IOException {
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessRuleException(GlobalExceptionHandler.FILE_TOO_LARGE, "Ảnh vượt quá 5 MB.");
        }
        byte[] bytes = file.getBytes();
        String ext = ImageSignature.extensionOf(bytes);
        if (ext == null) {
            throw new BusinessRuleException("PHOTO_TYPE_INVALID", "Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
        }
        return storage.store(bytes, ext);
    }

    /** Bỏ URL trùng, tối đa {@link #MAX_PHOTOS}; URL lạ (không do kho này sinh ra) bị từ chối. */
    public List<String> requireOwned(List<String> urls) {
        List<String> distinct = urls == null ? List.of() : urls.stream().distinct().toList();
        if (distinct.size() > MAX_PHOTOS) {
            throw new BusinessRuleException("PHOTO_TOO_MANY", "Chỉ đính kèm tối đa " + MAX_PHOTOS + " ảnh.");
        }
        for (String url : distinct) {
            if (!storage.owns(url)) {
                throw new BusinessRuleException("PHOTO_NOT_FOUND", "Ảnh đính kèm không hợp lệ. Vui lòng tải ảnh lên lại.");
            }
        }
        return distinct;
    }

    /** Cột {@code photo_urls}: mỗi dòng một URL; {@code null} nếu không có ảnh. */
    static String join(List<String> urls) {
        return urls.isEmpty() ? null : String.join(SEPARATOR, urls);
    }

    public static List<String> split(String stored) {
        return stored == null || stored.isBlank() ? List.of()
                : Arrays.stream(stored.split(SEPARATOR)).filter(s -> !s.isBlank()).toList();
    }
}
