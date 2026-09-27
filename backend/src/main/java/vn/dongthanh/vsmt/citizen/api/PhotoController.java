package vn.dongthanh.vsmt.citizen.api;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.service.CitizenQueryService;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage;
import vn.dongthanh.vsmt.citizen.service.PhotoStorage.StoredPhoto;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/** Ảnh người dân tải lên, dùng chung cho chợ đồ cũ và rác cồng kềnh (T46). Mọi người dân đã đăng nhập xem được. */
@Tag(name = "App người dân: ảnh")
@RestController
@RequestMapping(PhotoController.BASE_PATH)
@RequiredArgsConstructor
public class PhotoController {

    static final String BASE_PATH = "/api/citizen/photos";

    private final CitizenQueryService citizens;
    private final PhotoStorage photos;

    static String url(String name) {
        return BASE_PATH + "/" + name;
    }

    @Operation(summary = "Tải một ảnh JPEG/PNG/WebP (tối đa 5 MB), nhận tên để gắn vào bài đăng")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PhotoDto upload(@AuthenticationPrincipal CurrentCitizen citizen, @RequestParam("file") MultipartFile file)
            throws IOException {
        citizens.requireActive(citizen);
        String name = photos.save(file);
        return new PhotoDto(name, url(name));
    }

    @Operation(summary = "Tải về một ảnh đã lưu")
    @GetMapping("/{name}")
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal CurrentCitizen citizen,
            @PathVariable @Pattern(regexp = PhotoStorage.NAME_PATTERN, message = "không hợp lệ") String name)
            throws IOException {
        citizens.requireActive(citizen);
        StoredPhoto photo = photos.load(name);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(photo.contentType())).body(photo.bytes());
    }

    public record PhotoDto(
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "3f1c2a9e-8b7d-4c6e-9f00-1a2b3c4d5e6f.jpg")
            String name,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đường dẫn tương đối, cần token người dân")
            String url) {
    }
}
