package vn.dongthanh.vsmt.citizen.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

class PhotoStorageTest {

    @Test
    void rejectsNewPhotosWhenDiskBelowOneGigabyteFree() {
        assertThatThrownBy(() -> PhotoStorage.requireFreeSpace(PhotoStorage.MIN_FREE_BYTES - 1))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Máy chủ sắp hết chỗ lưu ảnh, vui lòng thử lại sau.")
                .extracting("code").isEqualTo("STORAGE_FULL");
        assertThatCode(() -> PhotoStorage.requireFreeSpace(PhotoStorage.MIN_FREE_BYTES)).doesNotThrowAnyException();
    }
}
