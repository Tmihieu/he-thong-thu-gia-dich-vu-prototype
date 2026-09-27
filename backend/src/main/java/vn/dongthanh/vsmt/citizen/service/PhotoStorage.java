package vn.dongthanh.vsmt.citizen.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.GlobalExceptionHandler;
import vn.dongthanh.vsmt.platform.common.NotFoundException;

/**
 * Lưu ảnh người dân tải lên vào thư mục {@code vsmt.upload-dir} trên ổ đĩa local (chợ đồ cũ; rác cồng kềnh T46 dùng
 * lại). Bài đăng chỉ lưu tên ảnh, không nhận URL tự do.
 */
@Component
public class PhotoStorage {

    /**
     * Khớp {@code spring.servlet.multipart.max-file-size}: trên server thật Tomcat chặn trước (422 {@code FILE_TOO_LARGE}
     * ở GlobalExceptionHandler); kiểm lại ở đây, cùng mã lỗi, phòng khi giới hạn multipart bị đổi.
     */
    public static final long MAX_BYTES = 5L * 1024 * 1024;

    /**
     * Dưới mức trống này của ổ chứa {@code vsmt.upload-dir} thì từ chối ảnh mới, để ảnh không làm đầy ổ của CSDL/log.
     * ponytail: ngưỡng cố định cho demo một máy; khi chạy thật đưa vào cấu hình hoặc chuyển ảnh sang object storage.
     */
    static final long MIN_FREE_BYTES = 1024L * 1024 * 1024;

    /** Chỉ tên do {@link #save} sinh (UUID + đuôi chuẩn) mới được đọc: chặn path traversal. */
    public static final String NAME_PATTERN =
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$";

    private static final Pattern NAME = Pattern.compile(NAME_PATTERN);
    private static final Map<String, String> CONTENT_TYPES =
            Map.of("jpg", "image/jpeg", "png", "image/png", "webp", "image/webp");

    private final Path dir;

    public PhotoStorage(@Value("${vsmt.upload-dir}") String dir) throws IOException {
        this.dir = Files.createDirectories(Path.of(dir).toAbsolutePath().normalize());
    }

    /**
     * Lưu một ảnh JPEG/PNG/WebP tối đa 5 MB, trả tên file mới.
     * ponytail: chưa có hạn mức tải lên theo tài khoản và chưa dọn ảnh không bài nào dùng (tải lên rồi không đăng),
     * ổn cho demo; khi chạy thật thêm hạn mức mỗi tài khoản mỗi ngày hoặc job xóa ảnh không được tham chiếu sau N giờ.
     */
    public String save(MultipartFile file) throws IOException {
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessRuleException(GlobalExceptionHandler.FILE_TOO_LARGE, "Ảnh vượt quá 5 MB.");
        }
        byte[] bytes = file.getBytes();
        String ext = extensionOf(bytes);
        if (ext == null) {
            throw new BusinessRuleException("PHOTO_TYPE_INVALID", "Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
        }
        requireFreeSpace(Files.getFileStore(dir).getUsableSpace());
        String name = UUID.randomUUID() + "." + ext;
        Files.write(dir.resolve(name), bytes, StandardOpenOption.CREATE_NEW);
        return name;
    }

    static void requireFreeSpace(long usableBytes) {
        if (usableBytes < MIN_FREE_BYTES) {
            throw new BusinessRuleException("STORAGE_FULL", "Máy chủ sắp hết chỗ lưu ảnh, vui lòng thử lại sau.");
        }
    }

    public boolean exists(String name) {
        return name != null && NAME.matcher(name).matches() && Files.isRegularFile(dir.resolve(name));
    }

    /** Tên ảnh gắn vào bài đăng / yêu cầu: bỏ tên trùng, tên nào chưa được tải lên thì 422 {@code PHOTO_NOT_FOUND}. */
    public List<String> requireStored(List<String> names) {
        List<String> distinct = names == null ? List.of() : names.stream().distinct().toList();
        for (String name : distinct) {
            if (!exists(name)) {
                throw new BusinessRuleException("PHOTO_NOT_FOUND",
                        "Ảnh \"" + name + "\" không tồn tại. Vui lòng tải ảnh lên lại.");
            }
        }
        return distinct;
    }

    public StoredPhoto load(String name) throws IOException {
        if (!exists(name)) {
            throw new NotFoundException("PHOTO_NOT_FOUND", "Không tìm thấy ảnh.");
        }
        return new StoredPhoto(Files.readAllBytes(dir.resolve(name)),
                CONTENT_TYPES.get(name.substring(name.lastIndexOf('.') + 1)));
    }

    /** Nhận dạng bằng magic bytes, không tin Content-Type hay đuôi file phía client gửi. */
    static String extensionOf(byte[] b) {
        if (startsWith(b, 0, 0xFF, 0xD8, 0xFF)) {
            return "jpg";
        }
        if (startsWith(b, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
            return "png";
        }
        if (startsWith(b, 0, 'R', 'I', 'F', 'F') && startsWith(b, 8, 'W', 'E', 'B', 'P')) {
            return "webp";
        }
        return null;
    }

    private static boolean startsWith(byte[] b, int offset, int... magic) {
        if (b.length < offset + magic.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if ((b[offset + i] & 0xFF) != magic[i]) {
                return false;
            }
        }
        return true;
    }

    public record StoredPhoto(byte[] bytes, String contentType) {
    }
}
