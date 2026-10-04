# Deploy demo lên Render

`render.yaml` tạo PostgreSQL 16, backend Spring Boot và web React/nginx tại Singapore.
Web có URL HTTPS do Render cấp, hoạt động độc lập với máy cá nhân.
Backend và PostgreSQL giao tiếp qua mạng riêng; web chuyển tiếp `/api/` đến backend.

## Chi phí và tài khoản

Đây là cấu hình **trả phí**: hai dịch vụ Starter, PostgreSQL Basic 256 MB,
1 GB lưu trữ database và 1 GB lưu ảnh. Dự trù khoảng 20 USD/tháng cộng lưu trữ,
băng thông vượt mức và thuế nếu có. Xem số tiền Render hiển thị trước khi Apply:
https://render.com/pricing.
Gói miễn phí có giới hạn ngủ dịch vụ và thời hạn database, không phù hợp demo chạy liên tục.

## Triển khai

1. Đưa các file cấu hình này lên một branch GitHub của repository.
2. Đăng nhập https://dashboard.render.com, chọn **New > Blueprint** và kết nối repository
   `Tmihieu/he-thong-thu-gia-dich-vu-prototype`.
3. Chọn branch chứa `render.yaml`; xem đủ ba tài nguyên và chi phí rồi Apply.
4. Đợi PostgreSQL sẵn sàng, backend hoàn tất Flyway và web báo **Live**.
5. Mở URL HTTPS trong trang dịch vụ `vsmt-demo-web`. URL thực tế do Render cấp;
   không suy ra URL chỉ từ tên dịch vụ.

Không cần nhập mật khẩu database hoặc JWT: Blueprint tự nối thông tin PostgreSQL
và sinh `JWT_SECRET`. Không đưa `.env` của máy cá nhân lên GitHub.

## Dữ liệu demo và kiểm tra

- `SPRING_PROFILES_ACTIVE=demo` bật cả `db/migration` và `db/seed` ngay lần khởi động đầu.
- Flyway ghi nhận các migration đã chạy; redeploy không xóa hay nạp trùng dữ liệu đã seed.
- Đăng nhập `admin` / `Demo@2026`, mở danh sách hộ và kỳ thu để kiểm tra dữ liệu.
- Tài khoản khác và số điện thoại demo: [demo-accounts.md](demo-accounts.md).
- Mở `/healthz` trên URL web: phải trả HTTP 200 và JSON OpenAPI của backend.
- Thử tải lại một đường dẫn con trên web để kiểm tra React Router.
- Ảnh upload lưu trên disk `/app/uploads`, không mất khi redeploy.
- Nếu dùng app mobile (Flutter), build với `--dart-define=API_URL=<URL HTTPS của web>`,
  vì `/api/` được proxy đến backend.

Đây là môi trường dữ liệu giả với tài khoản demo công khai. Không nhập dữ liệu thật.
Nếu backend báo hết bộ nhớ, kiểm tra Render Metrics trước khi nâng gói (sẽ tăng chi phí).
Việc gắn disk có thể gây gián đoạn ngắn khi redeploy; cấu hình không phải HA.

Tham khảo Blueprint: https://render.com/docs/blueprint-spec.
