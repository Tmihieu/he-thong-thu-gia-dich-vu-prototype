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
4. **Nên chạy từ CSDL sạch** (`docker compose down -v` rồi `docker compose up`): volume `vsmt-db-data` dùng chung với CSDL dev. CSDL đó đã từng thử tay trong tháng 09 (mở kỳ 09/2026, ghi thu `TT-0926-…`, bàn giao `BG-0926-…`, phiếu thu `PT-CT-0926-…`) thì seed kỳ cũ (`V22_1`) báo lỗi Flyway trùng mã, backend không lên; đã mở kỳ 10/2026 thì §10 bước 1 báo "Kỳ 2026-10 đã được mở". Cả hai trường hợp: `down -v`.

| Thành phần | Địa chỉ |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:8080 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI | http://localhost:8080/v3/api-docs |

- Đổi cổng mở ra máy bằng `WEB_PORT`, `BACKEND_PORT`, `POSTGRES_PORT` trong `.env`.
- Web gọi API qua nginx (`/api/` chuyển sang backend, nhận body tới 50 MB như backend). Ảnh người dân tải lên nằm trong volume `vsmt-uploads`, còn nguyên khi container backend bị tạo lại.
- Người đi thu dùng web giao diện mobile trên điện thoại: mở `http://<IP LAN>:5173` (lấy IP như mục dưới).

## Chạy app người dân (Expo Go) với backend trong docker

App chạy trên laptop bằng Expo, gọi **thẳng cổng backend** của docker (không qua nginx).

1. Lấy IP LAN của laptop: `ipconfig` → dòng **IPv4 Address** của card Wi-Fi (ví dụ `192.168.1.66`).
2. Tạo `mobile/.env.local` (git bỏ qua) từ `mobile/.env.example`, sửa IP, cổng là `BACKEND_PORT` (mặc định 8080):
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.66:8080
   ```
3. Chạy:
   ```sh
   cd mobile
   npm install
   npx expo start
   ```
   Quét mã QR (Android: trong Expo Go; iPhone: bằng app Camera). Trên màn **Đăng nhập** bấm "Kiểm tra kết nối máy chủ" để chắc điện thoại gọi được backend. Đổi Wi-Fi thì IP đổi: sửa `.env.local` rồi chạy `npx expo start --clear`.

Không kết nối được: thử mở `http://<IP LAN>:8080/v3/api-docs` bằng trình duyệt điện thoại; không mở được thì do tường lửa Windows (cho Docker Desktop qua mạng đang dùng) hoặc Wi-Fi chặn các máy nói chuyện với nhau (dùng điểm phát Wi-Fi từ điện thoại). Không tải được bundle thì `npx expo start --tunnel`. Chi tiết ở `mobile/README.md`.

## Tài khoản

Xem [`docs/demo-accounts.md`](demo-accounts.md). Web: mật khẩu chung `Demo@2026` cho `admin`, `canbo_xa`, `dv01`…`dv11`, `thu01`…`thu23`. App người dân: SĐT `0902000128` (hộ `DTH-H000128`), OTP cố định `123456`; `0903000128` là thành viên thứ hai cùng hộ.

## Dữ liệu seed cho §10

Mọi tên, SĐT, địa chỉ là dữ liệu giả ("Mẫu", đầu số `0902…`, `0911…`). Seed ở `backend/src/main/resources/db/seed/`.

| Điều kiện ban đầu | Seed |
|---|---|
| Kỳ 10/2026 **chưa mở** (bước 1) | Không có kỳ 10/2026 |
| KV24 chưa có công ty (bước 2) | `V6_1`: 23 tổ còn lại đã phân công, hiệu lực 01/09–31/12/2026 |
| DV01 phụ trách KV07, KV09; người đi thu `thu07`, `thu09` (bước 3) | `V6_1`, `V9_1` |
| Hộ `DTH-H000128` (KV07, DV01) có tài khoản app (bước 4) | `V18_1` |
| **Kỳ cũ 09/2026 đã quá hạn, DV01 còn nợ** (bước 5 nhắc nộp) | `V22_1`, xem dưới |
| Chợ đồ cũ có bài giả; `CDC-035` của hộ kịch bản đang mở, `CDC-033` đã đóng (bước 7) | `V20_1` |
| Lịch thu gom mọi tổ | `V17_1` |

**Kỳ cũ 09/2026** (`V22_1`): trạng thái Đang thu, hạn công ty nộp xã **25/09/2026** — đã quá hạn cả ngày làm seed lẫn ngày demo 21/10. Chỉ phát hành cho DV01 (phiếu `YCT-0926-01`, phạm vi công ty):

| DV01 · kỳ 09/2026 | Số tiền |
|---|---|
| Phải thu (19 khoản: 9 hộ KV07, 9 hộ + 1 hộ kinh doanh KV09, giá BG-65-2026) | 1.319.000 |
| Công ty đã thu (8 lần; 7 khoản thu đủ, `DTH-H000125` thu một phần) | 609.000 |
| Đã nộp về xã (phiếu `PT-CT-0926-001`, 22/09) | 400.000 |
| **Còn phải nộp, quá hạn** | **919.000** |

- Hộ kịch bản `DTH-H000128` đã đóng kỳ 09 bằng tiền mặt, nên app chỉ còn khoản kỳ 10 để thanh toán ở bước 4.
- `thu07`, `thu09` đã bàn giao hết tiền mặt kỳ 09 (`BG-0926-01`, `BG-0926-02`): bước 3 bắt đầu với 0 đồng đang giữ.
- Lịch sử hộ kỳ 09 cho màn người đi thu: `DTH-H000122` vắng 08/09 rồi thu 10/09; `DTH-H000124` hẹn lại 12/09, còn nợ; `DTH-H000125` thu một phần.
- Các thao tác trên có dòng nhật ký (mở kỳ, phát hành, ghi thu, bàn giao, lập phiếu thu).
- Vì DV01 còn nợ kỳ 09 nên ở kỳ 10/2026, dòng DV01 trên Tiến độ thu hiện **Quá hạn nộp** kèm "Nợ kỳ trước 919.000" và Đối soát hiện **Lệch** (quy tắc nợ kỳ trước R9–R11), cho tới khi DV01 nộp hết kỳ 09. Bước 5 dưới đây làm theo thứ tự đó.

## Kịch bản §10

Web mở ở http://localhost:5173; mỗi vai trò dùng một cửa sổ ẩn danh riêng cho khỏi đăng xuất qua lại.

1. **`admin`** → Cấu hình → Kỳ thu. **Cách A (tự động, 04/10):** ở thẻ **Tự tạo kỳ thu** bật quy tắc (tháng, ngày tạo kỳ 1, hộ đóng 15 ngày, công ty nộp xã 10 ngày) → **Lưu quy tắc** → **Chạy thử ngay**; hệ thống tạo kỳ kế tiếp ở dạng **Dự thảo** và báo cán bộ xã (bước 2 mở kỳ bằng tab **Kỳ chờ mở**, không cần lập phiếu YCT riêng). Ngày thật là đầu tháng nên kỳ tự tạo là tháng kế tiếp; muốn đúng kỳ 10/2026 thì dùng cách B. **Cách B (thủ công):** nút **Mở kỳ thủ công** → mở kỳ **tháng 10/2026**, hạn công ty nộp xã **sau ngày demo** (vd. 31/10/2026; hạn trước ngày demo thì kỳ 10 cũng thành quá hạn). Biểu giá tự gắn `BG-65-2026` (QĐ 65/2026); kỳ vào thẳng **Đang thu**.
2. **`canbo_xa`** → Khu vực → KV24 → **Phân công** (popup) cho **DV01**. Rồi Khoản thu → Phiếu YCT: kỳ 10/2026, phí vệ sinh môi trường, phạm vi toàn xã, hạn hộ đóng không sau hạn kỳ → **Xem trước** → **Phát hành**. Phân công KV24 trước khi phát hành, không thì hộ KV24 bị bỏ qua với cảnh báo "chưa có công ty phụ trách".
3. **`dv01`** → Khu vực được giao → Phân tổ: phân **KV24** (vừa nhận ở bước 2, chưa có người đi thu) cho `thu07`. Seed đã phân sẵn `thu07` ↔ KV07, `thu09` ↔ KV09. **`thu07`** trên điện thoại (`http://<IP LAN>:5173`) → Danh sách thu (kỳ 10/2026): ghi **2 hộ tiền mặt**, **1 hộ vắng**. **`dv01`** → Tổng quan → **Nhận tiền mặt** của `thu07`; `thu07` → Tiền mặt thấy đang giữ về 0.
   - Lịch sử hộ / báo sai (T53): `thu07` chọn kỳ **09/2026** → hộ `DTH-H000122` → **Lịch sử** (vắng 08/09, thu 10/09); **Báo sai thông tin** một hộ → `canbo_xa` và `dv01` nhận thông báo.
4. **App `0902000128`** → Khoản phí của hộ → khoản kỳ 10/2026 → thanh toán mô phỏng. **`dv01`** → Hộ được giao: `DTH-H000128` hiện **Đã thu**.
5. Nộp tiền về xã (thứ tự người dùng chốt 28/09/2026, vì nợ kỳ 09 — xem ghi chú ở mục seed):
   1. **`canbo_xa`** → Tiến độ thu (kỳ 10/2026): dòng DV01 **Quá hạn nộp**, "Nợ kỳ trước 919.000" → **Nhắc nộp** → gửi. **`dv01`** thấy thông báo "Nhắc nộp tiền Tháng 09/2026" ở chuông.
   2. DV01 nộp hết kỳ cũ: `canbo_xa` → Khoản thu → Phiếu thu công ty → chọn **kỳ 09/2026** → **Lập phiếu** ở dòng DV01, số tiền **919.000** → kỳ 09 của DV01 Đã nộp đủ.
   3. DV01 nộp một phần kỳ 10: chọn **kỳ 10/2026** → **Lập phiếu** ở dòng DV01, số tiền nhỏ hơn "còn phải nộp" → Tiến độ thu hiện **Nộp một phần**, Đối soát hiện **Đang nộp**.
   4. **`dv01`** → Khu vực được giao → Phiếu thu xã lập → **Báo sai sót** một phiếu → **`canbo_xa`** → Khoản thu → Sai sót phiếu thu → xử lý (đóng kèm ghi chú).
6. **App** → Phản ánh, kiến nghị → gửi mới. **`canbo_xa`** → Khiếu nại → chuyển DV01. **`dv01`** → Khiếu nại → phản hồi. **`canbo_xa`** → đóng. App thấy timeline và thông báo.
7. **App** → Rác cồng kềnh → Đăng ký: mô tả, **chọn ảnh** (tối đa 5 ảnh, mỗi ảnh ≤ 5 MB, JPEG/PNG/WebP) → gửi. **`dv01`** → Rác cồng kềnh → mở yêu cầu (có ảnh hộ gửi) → **Báo phí**; app thấy phí công ty báo (phí này không sinh khoản thu, O5).
   **App** → tab Chợ đồ cũ → đăng một bài (ảnh không bắt buộc) → bình luận ở bài khác; người đăng **đóng bài** được (không mở lại, bài đóng không nhận bình luận mới).
8. **`canbo_xa`** → Đối soát → **Khóa kỳ** 10/2026 khi còn công ty chưa nộp đủ → bị chặn, thông báo nêu công ty còn nợ.
9. Cả kịch bản chạy trên `docker compose up` + `npx expo start`: mở DevTools (F12) của trình duyệt và log Expo, không có lỗi đỏ.

Xem thêm: **`admin`** → Nhật ký: lọc theo người/hành động, thấy dòng lập phiếu thu kèm trước/sau (và các dòng seed của kỳ 09).

## Reset dữ liệu về seed ban đầu

```sh
docker compose down -v
docker compose up
```

Code đã đổi thì build lại lần lượt như bước 3 trước khi `up`. `down -v` xóa volume `vsmt-db-data` (dùng chung với CSDL dev của `docker compose up -d db`) và `vsmt-uploads` (ảnh người dân đã tải lên).
