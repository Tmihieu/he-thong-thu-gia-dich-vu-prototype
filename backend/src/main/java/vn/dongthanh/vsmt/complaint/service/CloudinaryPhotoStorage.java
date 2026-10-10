package vn.dongthanh.vsmt.complaint.service;

import java.io.IOException;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.extern.slf4j.Slf4j;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Lưu ảnh khiếu nại trên Cloudinary, cấu hình bằng {@code vsmt.cloudinary.url} (biến {@code CLOUDINARY_URL} dạng
 * {@code cloudinary://<api_key>:<api_secret>@<cloud_name>}). Để trống thì ứng dụng vẫn khởi động, chỉ việc tải ảnh
 * bị từ chối {@code PHOTO_STORAGE_NOT_CONFIGURED}.
 * ponytail: ảnh để loại {@code upload} (ai có URL đều xem được; tên ngẫu nhiên nên không đoán được) và chưa xóa ảnh
 * trên Cloudinary khi khiếu nại bị xóa / ảnh tải lên mà không gửi. Khi chạy thật cân nhắc loại {@code authenticated}
 * kèm URL ký, và job dọn ảnh mồ côi.
 */
@Slf4j
@Component
public class CloudinaryPhotoStorage implements ComplaintPhotoStorage {

    static final String FOLDER = "vsmt/complaints";

    private final Cloudinary cloudinary;
    private final String urlPrefix;

    public CloudinaryPhotoStorage(@Value("${vsmt.cloudinary.url:}") String cloudinaryUrl) {
        if (cloudinaryUrl == null || cloudinaryUrl.isBlank()) {
            this.cloudinary = null;
            this.urlPrefix = null;
            log.warn("Chưa cấu hình CLOUDINARY_URL: không tải được ảnh khiếu nại.");
        } else {
            this.cloudinary = new Cloudinary(cloudinaryUrl.trim());
            this.urlPrefix = "https://res.cloudinary.com/" + cloudinary.config.cloudName + "/image/upload/";
        }
    }

    @Override
    public String store(byte[] bytes, String extension) {
        requireConfigured();
        try {
            Map<?, ?> result = cloudinary.uploader().upload(bytes, ObjectUtils.asMap(
                    "folder", FOLDER,
                    "resource_type", "image",
                    "allowed_formats", "jpg,png,webp",
                    "use_filename", false,
                    "unique_filename", true,
                    "overwrite", false));
            Object url = result.get("secure_url");
            if (url == null) {
                throw new IOException("Cloudinary không trả secure_url");
            }
            return url.toString();
        } catch (IOException | RuntimeException e) {
            log.error("Tải ảnh lên Cloudinary không thành công", e);
            throw new BusinessRuleException("PHOTO_UPLOAD_FAILED", "Không tải được ảnh lên. Vui lòng thử lại sau.");
        }
    }

    @Override
    public boolean owns(String url) {
        return urlPrefix != null && url != null && url.startsWith(urlPrefix);
    }

    private void requireConfigured() {
        if (cloudinary == null) {
            throw new BusinessRuleException("PHOTO_STORAGE_NOT_CONFIGURED",
                    "Hệ thống chưa cấu hình nơi lưu ảnh. Vui lòng liên hệ quản trị.");
        }
    }
}
