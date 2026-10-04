# Checklist: Chợ đồ cũ trong xã

Theo [spec v1.0](cho-do-cu-spec.md) và [plan](cho-do-cu-plan.md), ngày 29/09/2026. Chưa triển khai; mọi ô nghiệm thu để trống. Chỉ tick kèm bằng chứng test/thao tác, không dựa vào việc có code.

## CD01 — Chuẩn bị và quyết định

- [ ] D01–D10 được phản ánh đúng trong thiết kế; không trường giá, nhiều tag, đăng ngay, chỉ người đăng nhập xem.
- [ ] Ghi phiên bản schema hiện tại và cấp số Flyway không trùng; liệt kê route ảnh/notification/query phải kiểm quyền.
- [ ] Fixture legacy: title 150 + description 2.000, GIVE/EXCHANGE, OPEN/CLOSED, ảnh shared/thiếu, comments, hai người cùng hộ.
- [ ] API mới có schema thống nhất, method ghi không mở cho nội bộ; danh sách vai trò đủ 5.

## CD02 — Schema và migration

- [ ] Caption gộp đủ title + mô tả; không tự đưa địa chỉ nhận cũ vào nội dung công khai.
- [ ] Tag cũ map đúng, category OTHER, area backfill có ghi rõ giới hạn lịch sử.
- [ ] Giữ id/code/tác giả/thời gian/status/comments/bytes ảnh; sharePhone=false, không lấy số đăng nhập.
- [ ] Cột legacy giữ dữ liệu nhưng không chặn INSERT mới; không sửa migration đã chạy, không reset DB.
- [ ] Bảng tags/saved/blocks/images và constraint idempotency/ownership/index được kiểm trên PostgreSQL.
- [ ] Backfill ảnh legacy không tự nhận tác giả là uploader, file thiếu có báo cáo; không xóa ảnh bulky.

## CD03 — Đọc, tìm và lọc

- [ ] Chưa đăng nhập →401; tài khoản khóa không dùng được token cũ để đọc.
- [ ] Người dân + 5 vai trò nội bộ đọc được; nội bộ không truy cập rộng `/api/citizen/**`.
- [ ] Tag chọn nhiều khớp OR; tag/category/area/q kết hợp AND; mảng tag trùng không tạo bài trùng trong kết quả.
- [ ] Tìm caption trim/case-insensitive, `%`/`_` literal, dấu tiếng Việt đúng giới hạn đã ghi.
- [ ] Phân trang ổn định createdAt/id, page/size hợp lệ; 125 bài đọc được hết khi dữ liệu đứng yên.
- [ ] Đổi lọc reset trang, tải thêm khử trùng ID; bài ẩn/blocked loại trước count/page.
- [ ] Bình luận phân trang riêng, count đúng phần được xem; detail không trả tất cả comments.
- [ ] Closed không ở feed nhưng vẫn đọc trực tiếp/đã lưu nếu đủ quyền.

## CD04 — Đăng, sửa, trạng thái, liên hệ

- [ ] Form chỉ caption, ảnh, multi-tags, category, khu vực chỉ đọc và liên hệ opt-in; không title/price/pickupLocation.
- [ ] Caption/ảnh/tag/category/số điện thoại validate ở server; unknown price/amount/currency field →422; caption ghi giá vẫn được.
- [ ] Bài nhiều tag giữ nguyên sau tạo/sửa/reload; không ép về một tag.
- [ ] Đăng hiển thị ngay OPEN; không trạng thái chờ duyệt, nút báo cáo hoặc inbox chưa có người xử lý.
- [ ] Chỉ đúng author account sửa/đổi trạng thái; thành viên cùng hộ không được quyền thay.
- [ ] Đóng/mở lại/ẩn/hiện đúng bảng chuyển trạng thái; mở lại không đẩy ngày đăng mới.
- [ ] Trạng thái/visibility đã đạt đích trả thành công không ghi kể cả version cũ; chuyển giá trị thật và sửa nội dung kiểm version.
- [ ] Đóng bài ngăn comment mới/gọi; ẩn ngăn người khác detail/ảnh/contact.
- [ ] Sửa giữ tác giả/area/ngày đăng/status; stale version →409 và giữ nội dung người dùng đang nhập.
- [ ] Retry tạo/comment cùng key+payload chỉ một bản ghi/thông báo; cùng key khác payload →409; đồng thời đóng và comment không vi phạm trạng thái.
- [ ] Retry comment vẫn kiểm quyền hiện tại: blocked/ẩn →404; CLOSED còn đọc được trả comment cũ, request mới →422.
- [ ] Hạn mức tạo/comment/upload nguyên tử, 429 có Retry-After; retry không tính hai lần.
- [ ] SĐT không tự lấy từ hồ sơ, không trong DTO feed/detail; tắt chia sẻ xóa số lưu; nội bộ/blocked/ẩn/đóng không đọc được số.
- [ ] Bấm Gọi mở dialer; thiết bị không hỗ trợ xử lý lỗi rõ, không tự gọi.

## CD05 — Ảnh và hồi quy bulky

- [ ] Upload giới hạn 5 MB/magic bytes/tên file; post tối đa 5 ảnh, thứ tự ảnh giữ đúng.
- [ ] Upload chưa gắn chỉ uploader preview; không gắn upload/filename của người khác, không tái gắn legacy của bài khác.
- [ ] Ảnh route theo bài kiểm quyền; biết imageId/storageName không đủ để đọc.
- [ ] Route `/api/citizen/photos/{name}` cũ không bypass bài market-only bị ẩn/blocked.
- [ ] Tháo ảnh cuối khỏi bài không mất dấu nguồn market và không làm route cũ đọc được; request bulky mới không gắn filename market để vượt quyền.
- [ ] File có tham chiếu bulky không bị xóa/chặn sai nghiệp vụ; nội bộ không đọc được ảnh bulky qua route chợ.
- [ ] Ảnh tháo khỏi bài không còn đọc qua post; sửa thất bại vẫn giữ ảnh cũ, không mất bytes.
- [ ] Cache ảnh/SĐT private,no-store; sau chặn/ẩn/đăng xuất không hiện dữ liệu cache của phiên cũ.

## CD06 — Lưu, chặn và thông báo

- [ ] Lưu/bỏ lưu idempotent, riêng account; bài không khả dụng có placeholder không lộ nội dung nhưng bỏ lưu được.
- [ ] A chặn B: cả hai mất khả năng xem bài/ảnh/comment/contact và tương tác nhau.
- [ ] B vẫn chặn A thì A bỏ chặn không khôi phục quyền; chặn mình →422; không gửi thông báo bị chặn.
- [ ] Trên bài C, comments/count lọc theo viewer; không xóa nội dung của C, không khóa tính năng phí/phản ánh.
- [ ] Thông báo đúng chủ bài hoặc người từng bình luận khi chủ bài trả lời; không tự gửi, không gửi người lưu bài/nội bộ/blocked.
- [ ] Không thông báo cho comment rollback; dedup theo comment/recipient.
- [ ] Preview không chứa caption/comment/SĐT; list/unread-count/read/read-all và deep link thống nhất khi bài ẩn/chặn.
- [ ] `citizen.marketDetail` mở đúng bài hoặc thông báo không khả dụng; polling dùng hạ tầng hiện có.

## CD07–CD09 — Giao diện

- [ ] Mobile có feed caption/ảnh/tags, tìm/lọc, loading/error/empty/retry và tải thêm; không nhãn giá.
- [ ] Form giữ nội dung khi lỗi, khóa gửi khi upload; từ sửa quay lại không mất lựa chọn và không tự lưu thay đổi.
- [ ] Tin của tôi/Đã lưu/Đã chặn hoạt động; nút nhãn đúng trạng thái; không tự hết hạn.
- [ ] Dropdown/chips chọn nhiều thao tác được với trợ năng; kiểm màn nhỏ, caption dài, nhiều tag.
- [ ] Android/iOS: chọn ảnh, chuyển đổi HEIC theo luồng sẵn có, nhập bình luận không bị bàn phím che, mở dialer, back navigation.
- [ ] Đổi tài khoản cùng thiết bị không thấy saved/block/contact/photo cache của người trước.
- [ ] Web đủ 5 vai trò đọc feed/detail/comments/ảnh; không nút ghi, không lộ liên hệ riêng, deep link yêu cầu đăng nhập.
- [ ] Lãnh đạo vẫn giữ hạn chế API ghi cũ; người dân không đọc được các API nội bộ khác.

## CD10 — Kiểm chứng và bàn giao

- [ ] Sinh OpenAPI/schema web + mobile, typecheck sạch; schema chợ không có price/title cũ.
- [ ] Backend: focused IT cho quyền/filter/migration/concurrency/notification trước; `backend/mvnw.cmd verify` cuối đợt đạt.
- [ ] Web: `npm run lint`, `npm test`, `npm run build` đạt sau đổi menu/màn.
- [ ] Mobile (Flutter): `flutter analyze`, `flutter test`; lưu kết quả thực tế, không tick test chưa chạy.
- [ ] Diễn tập nâng cấp bản sao DB/uploads cũ, kiểm counts và nội dung trước/sau; ghi phương án restore và giới hạn dữ liệu phát sinh.
- [ ] Smoke luồng phí/hộ/bulky không hồi quy; demo đăng/tìm/comment/gọi/ẩn/chặn/mở lại trọn vẹn.
- [ ] Cập nhật SPEC/data dictionary/tasks bằng quyết định thay thế sau khi triển khai; ghi bằng chứng test, hạn chế và mục chưa nghiệm thu.

## Nghiên cứu sau — không chặn phát triển demo hiện tại

- [ ] Quy trình báo cáo/kiểm duyệt, người chịu trách nhiệm, quyền gỡ/khóa chợ và xử lý phản hồi.
- [ ] Đánh giá mô hình và yêu cầu pháp lý trước công khai; không tuyên bố bỏ giá là đủ miễn nghĩa vụ.
- [ ] Auth production thay OTP demo, chính sách nội dung/quyền riêng tư và lưu trữ vận hành.
- [ ] Đánh giá nhu cầu chat riêng, đa xã, tự hết hạn, dọn ảnh và push thật trước khi mở scope.
