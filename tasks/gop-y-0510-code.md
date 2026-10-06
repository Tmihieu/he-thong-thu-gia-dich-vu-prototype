# Code theo góp ý BA 05/10

Nguồn chuẩn: [use-cases.md](../docs/use-cases.md). Danh sách chỗ demo chưa theo kịp: mục "Bản demo chưa theo kịp" trong [thay-doi-gop-y-0510.md](../docs/thay-doi-gop-y-0510.md).

Làm tuần tự từng lát, mỗi lát một commit, chỉ một việc nặng (`mvnw verify`, docker build) một lúc. Backend trước, rồi web, rồi Flutter.

| Lát | Việc | UC | Trạng thái |
|---|---|---|---|
| S1 | Chỉ một hạn nộp: bỏ hạn hộ đóng riêng của phiếu YCT/khoản; quá hạn và nhắc hộ tính theo hạn của kỳ | UC-20, UC-44 | xong backend (IT chưa chạy: Docker tắt); web ở S6 |
| S2 | Tài khoản nhận chuyển khoản của xã: khai báo (quản trị viên), VietQR và đối chiếu SePay dùng tài khoản này, bỏ `companies.bank_account`, giao dịch chờ đối chiếu chuyển sang cán bộ xã | UC-15, UC-24..27, UC-54 | xong backend (IT chưa chạy: Docker tắt); web ở S6 (màn khai tài khoản xã, bỏ ô ngân hàng ở Công ty, đổi quyền UC-27, DTO transfer-info mất `configured`), Flutter ở S7 (xử lý 409) |
| S3 | Bỏ phân tổ (`collector_assignments`), lịch thu gom (`collection_schedules`), vị trí khu vực (`areas.latitude/longitude`); người đi thu thu mọi hộ có khoản của công ty, ghi ai đã thu | UC-12, UC-14, UC-18, UC-23, UC-30, UC-33 | xong backend (migration V44; IT chưa chạy: Docker tắt); web ở S6 (bỏ màn phân tổ, lịch thu gom, bản đồ khu vực; `/my-work`, `/company-work` không còn theo tổ; thêm `company-work?collectorId=` và `GET /collection/collectors/{id}/payments` cho UC-33), Flutter ở S7 (bỏ lịch thu gom `GET /citizen/schedule`) |
| S4 | Quản trị viên tạo tài khoản người đi thu (công ty không còn tạo) | UC-04 | xong backend (IT chưa chạy: Docker tắt; CollectorAccountIT đã sửa); web ở S6 (bỏ nút tạo/sửa/khóa/đặt lại mật khẩu ở menu "Người đi thu" của công ty, chỉ còn xem; thêm màn quản trị tạo người đi thu có chọn công ty qua `/api/platform/users`; `POST/PUT/lock/unlock/password` của `/api/platform/collector-accounts` đã bỏ, chỉ còn GET) |
| S5 | Phải nộp xã tính trên đã thu; khóa kỳ theo điều kiện mới; công nợ hộ sang kỳ sau | UC-38, UC-39 | chờ chốt cách lưu công nợ hộ và làm tròn phí thu gom |
| S6 | Web theo các lát trên | | xong |
| S7 | Flutter theo các lát trên (bỏ lịch thu gom) | | chưa |
