# Prototype hệ thống thu giá dịch vụ vệ sinh môi trường — v2.2

Prototype mới được dựng độc lập theo `../prototype/SPEC-TONG-HOP.md` phiên bản 2.2 và các yêu cầu làm rõ đến ngày 14/09/2026. Bản cũ trong `outputs/prototype` không bị thay đổi.

## Chạy prototype

Mở trực tiếp `index.html` bằng Chrome hoặc Edge. Prototype không cần máy chủ, cài đặt thư viện hoặc kết nối mạng.

## Phạm vi

- HTML5, CSS3 và JavaScript thuần.
- Một ứng dụng responsive dùng chung cho năm vai trò nội bộ.
- Người dân thuộc giai đoạn 2 nên không có vai trò đăng nhập trong bản này.
- Dữ liệu, QR, sao kê và chứng từ đều là minh họa.
- Các form mở trong modal và không lưu dữ liệu.

## Vai trò

1. Cán bộ xã.
2. Người đi thu được xã giao trực tiếp theo tuyến.
3. Kế toán.
4. Lãnh đạo.
5. Quản trị hệ thống.

## Nội dung cập nhật 2.2

- Xã tạo hồ sơ hộ, phân loại `attributeType`, sau đó gán đơn vị và tuyến.
- 11 công ty là danh mục phối hợp theo tuyến, không bắt buộc có tài khoản hệ thống.
- Xã giao trực tiếp tuyến và phạm vi dữ liệu cho người đi thu.
- Màn phân tuyến có bản đồ giản lược và bảng đủ 11 công ty/tuyến.
- Người đi thu nhập kết quả từng hộ trên web hoặc theo lô Excel.
- Khóa hộ–kỳ–dịch vụ liên kết dòng phải thu với các dòng đã thu.
- Xã theo dõi công nợ qua tiến độ người/tuyến và đốc thúc đầu mối; người đi thu xử lý từng hộ.
- Hai màn hiện trường có tìm kiếm/lọc thật, lưới desktop và danh sách một cột trên mobile.
- Hộ đã chấm dứt bị khóa thu/QR; phát sinh mới chuyển thành ngoại lệ.
- Dashboard lãnh đạo có thu–chi, hiệu quả đơn vị và tỷ lệ thành công.
- Màn quản trị “Luồng tiền & QR” so sánh các mô hình tài khoản nhận.

## Cấu trúc

```text
prototype-v2/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   ├── tokens.css
    │   ├── app.css
    │   └── responsive.css
    └── js/
        ├── config.js
        ├── data.js
        ├── dialogs.js
        ├── views.js
        └── app.js
```

## Lưu ý nghiệp vụ

Biểu giá và số liệu sử dụng trong prototype chỉ nhằm trực quan hóa luồng. Hệ thống thật phải cấu hình theo văn bản pháp lý, địa bàn, nhóm đối tượng và thời gian hiệu lực; không hard-code mức giá từ prototype.
