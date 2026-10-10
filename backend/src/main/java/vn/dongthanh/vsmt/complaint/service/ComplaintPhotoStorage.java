package vn.dongthanh.vsmt.complaint.service;

/** Nơi lưu ảnh đính kèm khiếu nại. Triển khai hiện tại: {@link CloudinaryPhotoStorage}. */
public interface ComplaintPhotoStorage {

    /** Lưu một ảnh đã được kiểm tra loại và dung lượng, trả URL https công khai của ảnh. */
    String store(byte[] bytes, String extension);

    /** URL có do kho này sinh ra không; chỉ URL của chính mình mới được gắn vào khiếu nại. */
    boolean owns(String url);
}
