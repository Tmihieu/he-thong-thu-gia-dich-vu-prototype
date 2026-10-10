package vn.dongthanh.vsmt.complaint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import vn.dongthanh.vsmt.complaint.service.ComplaintPhotoService;
import vn.dongthanh.vsmt.complaint.service.ComplaintPhotoStorage;

class ComplaintPhotoServiceTest {

    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00};

    final ComplaintPhotoStorage storage = mock(ComplaintPhotoStorage.class);
    final ComplaintPhotoService service = new ComplaintPhotoService(storage);

    @Test
    void uploadsJpegAndReturnsStorageUrl() throws IOException {
        when(storage.store(any(), eq("jpg"))).thenReturn("https://res.cloudinary.com/demo/image/upload/v1/a.jpg");

        String url = service.upload(new MockMultipartFile("file", "x.jpg", "image/jpeg", JPEG));

        assertThat(url).isEqualTo("https://res.cloudinary.com/demo/image/upload/v1/a.jpg");
    }

    @Test
    void detectsTypeByContentNotByFileNameOrContentType() throws IOException {
        when(storage.store(any(), eq("png"))).thenReturn("u");

        assertThat(service.upload(new MockMultipartFile("file", "x.jpg", "image/jpeg", PNG))).isEqualTo("u");
    }

    @Test
    void rejectsNonImageWithoutCallingStorage() {
        var fake = new MockMultipartFile("file", "x.jpg", "image/jpeg", "<html>".getBytes());

        assertThatThrownBy(() -> service.upload(fake)).extracting("code").isEqualTo("PHOTO_TYPE_INVALID");
        verify(storage, never()).store(any(), any());
    }

    @Test
    void rejectsPhotoOverFiveMegabytes() {
        var big = new MockMultipartFile("file", "x.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1]);

        assertThatThrownBy(() -> service.upload(big)).extracting("code").isEqualTo("FILE_TOO_LARGE");
        verify(storage, never()).store(any(), any());
    }

    @Test
    void splitHandlesNullBlankAndLines() {
        assertThat(ComplaintPhotoService.split(null)).isEmpty();
        assertThat(ComplaintPhotoService.split("  ")).isEmpty();
        assertThat(ComplaintPhotoService.split("a\nb")).isEqualTo(List.of("a", "b"));
    }
}
