# Cấu hình tự động kỳ thu và nhắc công ty nộp tiền

## Quy tắc nộp trước (09/10/2026)

Công ty phải nộp trước phần **vận chuyển + xử lý** của các khoản đã phát hành trong kỳ, kể cả khi chưa thu được tiền từ hộ. Phần thu gom công ty giữ không tính vào số phải nộp xã.

- Phải nộp: phần vận chuyển + xử lý theo biểu giá gắn với kỳ, trừ điều chỉnh xóa nợ tương ứng.
- Còn phải nộp: phải nộp trừ tổng phiếu thu công ty đã nộp về xã.
- Thu tiền hộ, kể cả thu công nợ hộ kỳ cũ, không làm tăng nghĩa vụ nộp xã lần thứ hai.
- Khoản miễn có số tiền 0; khoản xóa nợ trong kỳ được loại khỏi số phải nộp. Xóa nợ kỳ đã khóa được giảm ở kỳ ghi nhận điều chỉnh.
- Các khoản phí giá cố định không có cơ cấu biểu giá vận chuyển/xử lý không được tính vào ứng nộp này.
- Tiến độ, đối soát, lập phiếu thu và nhắc nộp dùng chung số còn phải nộp. Phần “Cty đã thu” vẫn phản ánh tiền thực thu, tách biệt với nghĩa vụ ứng nộp.

Công thức áp dụng khi đọc sổ của các kỳ hiện có, không sửa khoản thu hoặc phiếu thu đã lưu. Vì vậy số phải nộp và công nợ hiển thị của kỳ cũ cũng có thể thay đổi so với công thức dựa trên số đã thu trước đây.

## Admin cấu hình nhắc công ty

1. Đăng nhập admin → **Cấu hình → Nhắc công ty nộp tiền**.
2. Bật nhắc tự động, đặt số ngày **nhắc trước hạn** (0–365; 0 là đúng ngày đến hạn) và **nhắc lại khi quá hạn** (1–365 ngày).
3. Bấm **Lưu cấu hình nhắc nộp**. Danh sách dự kiến gửi hôm nay tính theo cấu hình đã lưu, số còn phải nộp và lịch đã gửi.
4. Muốn gửi ngay: xem trước danh sách → **Gửi nhắc ngay** → xác nhận. Thao tác này gửi thông báo thật trong ứng dụng cho quản lý công ty, không gửi SMS/Zalo.

Hệ thống chạy lúc **08:00 giờ Việt Nam**, cần backend đang chạy. Chỉ nhắc kỳ đang thu còn phải nộp > 0; nhắc một lần trong khoảng trước hạn/đúng hạn, quá hạn mới lặp lại theo số ngày đã đặt. Nếu bỏ lỡ ngày bắt đầu, lần chạy tiếp theo vẫn nhắc. Chạy tay và lịch tự động dùng chung lịch gửi, không gửi trùng công ty–kỳ trong ngày. Quy tắc mặc định tắt; không gửi cho công ty đã nộp đủ hoặc kỳ đã khóa.

## Admin cấu hình tạo kỳ và xem trước

1. Vào **Cấu hình → Kỳ thu → Tự tạo kỳ thu**.
2. Chọn bật/tắt, chu kỳ tháng/quý, ngày tạo (1–28), hạn công ty nộp xã (ngày cuối kỳ cộng số ngày đã đặt), rồi **Lưu quy tắc**.
3. Lịch chạy **07:30 giờ Việt Nam**: từ ngày cấu hình tạo kỳ tháng kế tiếp; kỳ quý chỉ tạo trong tháng cuối quý. **Chạy thử ngay** thực sự tạo dự thảo nếu tới lịch, không tự phát hành khoản. Chạy lại không tạo trùng kỳ.
4. Trên danh sách kỳ dự thảo, bấm **Xem trước & mở kỳ**. Kiểm tra hạn nộp, số khoản, tổng tiền, danh sách từng hộ/công ty/số tiền và các hộ bị bỏ qua kèm lý do.
5. Bấm **Mở kỳ & phát hành** và xác nhận để sinh khoản. Trước xác nhận, kỳ vẫn là dự thảo và chưa có khoản thu; xem trước không lưu thay đổi kỳ. Hệ thống tính lại dữ liệu khi phát hành.

Admin cũng có thể **Tạo kỳ dự thảo** thủ công và xem trước ngay. Cán bộ xã vẫn xem/mở dự thảo tại **Khoản thu → Phiếu YCT → Kỳ chờ mở**. Các tài khoản công ty không được đổi quy tắc hoặc mở kỳ.

## Kiểm tra local

Xem [hướng dẫn mở web local](demo-runbook.md#mở-nhanh-web-local-trên-windows-đã-build-trước-đó). Khi cập nhật code, build lại backend và web rồi khởi động lại; migration `V50` tự tạo bảng quy tắc và lịch gửi, không cần xóa database.

Để thử nhắc nộp, chọn kỳ đang thu có công ty còn phải nộp và hạn trong khoảng cấu hình. Để thử mở kỳ, tạo một kỳ dự thảo chưa có, kiểm tra danh sách xem trước rồi chỉ xác nhận khi muốn phát hành khoản thật vào dữ liệu local.
