# Runbook demo

Chạy kịch bản SPEC §10 trên laptop bằng dữ liệu seed giả (profile `demo`). Không dùng dữ liệu thật.

## Yêu cầu

- Docker Desktop đang chạy; ổ chứa dữ liệu Docker còn trống vài GB cho lần build đầu (image JDK, Node, thư viện Maven và npm).
- Node.js trên laptop (chạy `npx expo start`; app người dân không nằm trong docker).
- Điện thoại cài **Expo Go** bản hỗ trợ SDK 57, cùng mạng Wi-Fi với laptop.

## Chạy db + backend + web

1. Đã có `.env` từ lúc dev thì dùng luôn. Chưa có thì tạo ở gốc repo từ `.env.example`, đổi `POSTGRES_PASSWORD` và `JWT_SECRET` (tối thiểu 32 ký tự). `.env` không được commit.
   Postgres chỉ đọc `POSTGRES_PASSWORD` khi tạo volume lần đầu: máy đã chạy `docker compose up -d db` mà đổi mật khẩu thì backend báo `password authentication failed`. Khi đó chạy `docker compose down -v` trước (dữ liệu chỉ là seed).
2. Tắt `./mvnw spring-boot:run` và `npm run dev` nếu đang chạy (trùng cổng 8080, 5173).
3. Kiểm ổ C còn trên 3 GB, rồi từ gốc repo build **lần lượt** từng image (`docker compose up --build` chạy Maven và npm song song; trên máy 7,3 GB RAM, các việc nặng chạy cùng lúc từng làm Docker treo):
   ```sh
   docker compose build backend
   docker compose build web
   docker compose up
   ```
   Máy khỏe thì gộp thành `docker compose up --build`. Lần đầu mất vài phút (tải image, thư viện Maven và npm). Backend chạy Flyway và nạp seed demo khi khởi động; xong khi log có `Started VsmtApplication`.

| Thành phần | Địa chỉ |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI | http://localhost:8080/v3/api-docs |

- Đổi cổng mở ra máy bằng `WEB_PORT`, `BACKEND_PORT`, `POSTGRES_PORT` trong `.env`.
- Người đi thu dùng web giao diện mobile trên điện thoại: mở `http://<IP LAN>:5173` (lấy IP như mục dưới).

## Chạy app người dân (Expo Go)

1. Lấy IP LAN của laptop: `ipconfig` → dòng **IPv4 Address** của card Wi-Fi (ví dụ `192.168.1.66`).
2. Tạo `mobile/.env.local` (git bỏ qua) từ `mobile/.env.example`, sửa IP, cổng là `BACKEND_PORT`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.66:8080
   ```
3. Chạy:
   ```sh
   cd mobile
   npm install
   npx expo start
   ```
   Quét mã QR (Android: trong Expo Go; iPhone: bằng app Camera). Đổi Wi-Fi thì IP đổi: sửa `.env.local` rồi chạy `npx expo start --clear`.

Không kết nối được (tường lửa Windows, Wi-Fi chặn các máy nói chuyện với nhau, `--tunnel`): xem `mobile/README.md`.

## Tài khoản

Xem [`docs/demo-accounts.md`](demo-accounts.md). Web: mật khẩu chung `Demo@2026`. App người dân: SĐT `0902000128` (hộ `DTH-H000128`), OTP cố định `123456`.

## Kịch bản §10

| Bước | Đăng nhập | Việc |
|---|---|---|
| 1 | `admin` | Mở kỳ 10/2026 (tháng) theo QĐ 65/2026 |
| 2 | `canbo_xa` | Phân công một tổ chưa có công ty (KV24) bằng popup; tạo phiếu yêu cầu thu toàn xã → xem trước → phát hành |
| 3 | `dv01`, `thu07` (điện thoại) | DV01 phân tổ cho người đi thu; người đi thu ghi nhận 2 hộ tiền mặt, 1 hộ vắng; bàn giao tiền mặt cho công ty |
| 4 | App `0902000128`, `dv01` | Hộ `DTH-H000128` thanh toán mô phỏng trên app → công ty thấy "Đã thu" |
| 5 | `canbo_xa`, `dv01` | Xã lập phiếu thu khi DV01 nộp một phần; tiến độ và đối soát hiện "Đang nộp"; xã nhắc nộp → DV01 nhận thông báo; DV01 báo sai sót phiếu thu → xã xử lý |
| 6 | App, `canbo_xa`, `dv01` | Dân gửi khiếu nại → xã chuyển DV01 → DV01 phản hồi → xã đóng → dân thấy timeline và thông báo |
| 7 | App, `dv01` | Dân đăng ký rác cồng kềnh → DV01 báo phí; dân đăng một bài chợ đồ cũ |
| 8 | `canbo_xa` | Thử khóa kỳ khi còn nợ → bị chặn, có lý do rõ ràng |
| 9 | — | Toàn bộ chạy trên `docker compose up` + `npx expo start`, không lỗi console |

**Rà seed theo §10:** sẽ bổ sung sau khi T39–T48 xong (kỳ 10/2026 chưa mở, KV24 chưa phân công, DV01 + người đi thu KV07/KV09, hộ `DTH-H000128` có tài khoản dân).

## Reset dữ liệu về seed ban đầu

```sh
docker compose down -v
docker compose up
```

Code đã đổi thì build lại lần lượt như bước 3 trước khi `up`. `down -v` xóa volume `vsmt-db-data` (dùng chung với CSDL dev của `docker compose up -d db`) và `vsmt-uploads` (ảnh người dân đã tải lên).
