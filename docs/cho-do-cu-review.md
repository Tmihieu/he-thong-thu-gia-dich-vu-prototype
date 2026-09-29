# Chợ đồ cũ trong xã — phản biện và quyết định chờ chốt

Ngày: 29/09/2026. Đây là biên bản phản biện ban đầu, giữ lại để truy vết; các đề xuất/câu hỏi bên dưới đã được thay thế bởi quyết định cuối trong [spec v1.0](cho-do-cu-spec.md), [plan riêng](cho-do-cu-plan.md) và [checklist](cho-do-cu-checklist.md).

## Kết quả chốt sau phản biện

- Không có trường giá nhưng cho người dân tự ghi giá trong caption/ảnh/bình luận; không trích xuất dữ liệu giá.
- Chỉ caption + tối đa 5 ảnh; nhiều tag trong mỗi bài, không bắt chọn một mục đích duy nhất.
- Kiểm duyệt/báo cáo cần nghiên cứu thêm; trước mắt đăng ngay, không xây luồng cán bộ duyệt/ẩn bài.
- Người đăng nhập hệ thống được xem; spec diễn giải gồm người dân và các vai trò nội bộ chỉ đọc.
- Bình luận + gọi điện opt-in, chưa chat riêng; sửa/ẩn/hiện/đóng/mở lại, chưa tự hết hạn.
- Có lưu bài, chặn người dùng và thông báo tương tác; chưa có thông báo kết quả kiểm duyệt.
- Các mục “chờ chốt” và đề xuất một tag bên dưới là lịch sử, không phải yêu cầu hiện hành. Chưa triển khai code.

## Yêu cầu đã xác nhận

- Phát triển chức năng chợ hiện có trong app người dân, phạm vi trong xã.
- Không có trường giá trong entity, CSDL, API và form; không có lọc/sắp xếp theo giá.
- Bài đăng có caption, ảnh và nhãn mục đích như Tìm đồ, Bán đồ, Cho tặng.
- Có đăng bài, tìm kiếm/lọc; các nhóm liên hệ, quản lý bài và quản lý nội dung cần chốt chi tiết.
- Một agent phản biện độc lập; người dùng chốt câu hỏi trước khi hoàn thiện plan riêng, spec và checklist.
- Chưa triển khai code trong giai đoạn này.

## Hiện trạng đã đối chiếu code

- `MarketPost`, migration `V20__market.sql` và DTO hiện không có giá.
- Hai mục đích GIVE/EXCHANGE; form bắt buộc title và description; tối đa 5 ảnh không bắt buộc; có pickupLocation.
- Có danh sách, chi tiết, bình luận, chủ bài đóng bài; không mở lại, không bình luận mới trên bài đóng.
- Backend đã phân trang, nhưng mobile hiện lấy 100 bài đầu và chưa có tải tiếp.
- Chưa có tìm chữ, danh mục vật dụng, lọc tổ, sửa bài, lưu bài, báo cáo, quản lý nội dung hoặc chat riêng trong luồng được kiểm tra.
- DTO tác giả chỉ có tên hiển thị và tổ; địa điểm nhận do người đăng nhập đang được trả về công khai cho người xem bài.
- Query chợ hiện không có điều kiện xã. Phải ghi rõ giả định một hệ thống cho một xã; không suy diễn rằng đã hỗ trợ phân quyền nhiều xã.
- SPEC §9.9/O6 và data dictionary đang quy định không kiểm duyệt; D9/T47 quy định đóng bài không mở lại. Quyết định mới cần nêu rõ nội dung thay thế.

## Kết quả phản biện độc lập

1. Không có trường giá không phải bằng chứng miễn nghĩa vụ pháp lý. Cần tách ràng buộc kỹ thuật khỏi việc phân loại hoạt động; caption/ảnh/bình luận có thể vẫn chứa giá và tag Bán đồ thể hiện nhu cầu mua bán.
2. Một ô caption phù hợp yêu cầu mới nhưng cần chuyển dữ liệu title + description cũ, không tạo entity Caption riêng và không làm mất nội dung bài cũ.
3. Nhãn mục đích và danh mục đồ là hai khái niệm khác nhau. Đề xuất một mục đích + một danh mục cố định; chưa cần hệ thống hashtag tổng quát.
4. Chat riêng cần quyền truy cập hội thoại, thông báo, chặn/quản lý lạm dụng và lưu trữ; không thể coi là một nút giao diện. Không tự công khai SĐT đăng nhập hay địa chỉ hồ sơ hộ.
5. Báo cáo phải có người xử lý và kết quả. Khóa quyền chợ không được vô tình khóa các chức năng đóng phí/phản ánh khác của app người dân.
6. Khi mở rộng phải có tải tiếp và giới hạn đăng/bình luận hợp lý, tái sử dụng backend phân trang và bộ upload hiện có.

## Quyết định cần người dùng trả lời

Các lựa chọn đã gửi qua bộ câu hỏi, chưa tự chọn thay người dùng:

| ID | Nội dung |
|---|---|
| Q1 | Cho ghi giá tự do trong caption/ảnh/bình luận hay cấm nội dung ghi giá công khai? |
| Q2 | Một ô caption hay tiêu đề + caption? |
| Q3 | Một mục đích trong Tìm đồ/Bán đồ/Cho tặng/Đổi đồ + một danh mục, hay nhiều tag tự nhập? |
| Q4 | Bình luận + gọi điện tự nguyện, chat riêng + bình luận, hay chỉ bình luận? |
| Q5 | Đăng ngay và cán bộ xử lý báo cáo, duyệt trước, hay quản trị xử lý? |
| Q6 | Chỉ người dân đăng nhập xem/tương tác, công khai tên và tổ, hay cho khách xem? |
| Q7 | Sửa/ẩn/đóng/mở lại, tự hết hạn 30 ngày, hay giữ đóng không mở lại? |
| Q8 | Lưu bài, chặn người dùng và thông báo: làm ngay những mục nào? |

## Bộ tài liệu sẽ hoàn thiện sau khi chốt

- `docs/cho-do-cu-plan.md`: phạm vi, phần tái sử dụng, thứ tự triển khai, phụ thuộc, chuyển dữ liệu, kiểm chứng.
- `docs/cho-do-cu-spec.md`: vai trò, màn hình/luồng, entity và ràng buộc không giá, API, trạng thái, quyền dữ liệu, lỗi, thông báo, giới hạn và các quyết định thay thế spec cũ.
- `docs/cho-do-cu-checklist.md`: task triển khai và tiêu chí nghiệm thu truy vết theo spec; kiểm tra quyền, dữ liệu cũ, lọc/phân trang và thao tác mobile/web quản lý.

## Lưu ý về căn cứ pháp lý

Không ghi kết luận “bỏ trường giá thì không phải sàn thương mại” trong spec. Nguồn Chính phủ được đọc ngày 29/09/2026 phân biệt trách nhiệm chung của nền tảng với nghĩa vụ bổ sung khi có đặt hàng trực tuyến; nguồn này không xác nhận mô hình cụ thể của dự án được miễn. Cần đánh giá mô hình vận hành thực tế trước triển khai công khai.

Nguồn: https://baochinhphu.vn/chi-dao-dieu-hanh-cua-chinh-phu-thu-tuong-chinh-phu-ngay-4-7-2026-102260704180249001.htm
