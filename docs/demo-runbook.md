# Runbook demo

Chạy kịch bản SPEC §10 trên laptop bằng dữ liệu seed giả (profile `demo`). Không dùng dữ liệu thật.

**Lưu ý 06/10:** `docs/use-cases.md` đã sửa theo góp ý BA 05/10 (xem `docs/thay-doi-gop-y-0510.md`), code demo chưa đổi. Chỗ nào ghi **(chưa có trong bản demo)** là nghiệp vụ chuẩn mới, demo chạy vẫn theo hành vi cũ ghi kèm.

## Yêu cầu

- Docker Desktop đang chạy; ổ chứa dữ liệu Docker còn trống vài GB cho lần build đầu (image JDK, Node, thư viện Maven và npm).
- Flutter SDK trên laptop (app người dân ở `mobile-flutter/`, không nằm trong docker).
- Điện thoại Android cùng mạng Wi-Fi với laptop.

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

## Chạy app người dân (Flutter) với backend trong docker

App Flutter ở `mobile-flutter/`, gọi **thẳng cổng backend** của docker (không qua nginx). Địa chỉ backend gắn lúc build bằng `--dart-define=API_URL=...`.

1. Lấy IP LAN của laptop: `ipconfig` → dòng **IPv4 Address** của card Wi-Fi (ví dụ `192.168.1.66`).
2. Cắm điện thoại Android (đã bật gỡ lỗi USB) rồi chạy, cổng là `BACKEND_PORT` (mặc định 8080):
   ```sh
   cd mobile-flutter
   flutter run --dart-define=API_URL=http://192.168.1.66:8080
   ```
   Hoặc build APK để cài: `flutter build apk --release --target-platform android-arm64 --dart-define=API_URL=http://192.168.1.66:8080`.
3. Trên màn **Đăng nhập** bấm "Kiểm tra kết nối máy chủ" để chắc điện thoại gọi được backend. Đổi Wi-Fi thì IP đổi: build lại với `API_URL` mới.

Không kết nối được: thử mở `http://<IP LAN>:8080/v3/api-docs` bằng trình duyệt điện thoại; không mở được thì do tường lửa Windows (cho Docker Desktop qua mạng đang dùng) hoặc Wi-Fi chặn các máy nói chuyện với nhau (dùng điểm phát Wi-Fi từ điện thoại).

## Tài khoản

Xem [`docs/demo-accounts.md`](demo-accounts.md). Web: mật khẩu chung `Demo@2026` cho `admin`, `canbo_xa`, `dv01`…`dv11`, `thu01`…`thu23`. App người dân: SĐT `0902000128` (hộ `DTH-H000128`), OTP cố định `123456`; `0903000128` là thành viên thứ hai cùng hộ.

## Dữ liệu seed cho §10

Mọi tên, SĐT, địa chỉ là dữ liệu giả ("Mẫu", đầu số `0902…`, `0911…`). Seed ở `backend/src/main/resources/db/seed/`.

| Điều kiện ban đầu | Seed |
|---|---|
| Kỳ 10/2026 **chưa mở** (bước 1) | Không có kỳ 10/2026 |
| KV24 chưa có công ty (bước 2) | `V6_1` + `V40_2`: mọi ấp khác (51) đã phân công, hiệu lực 01/09–31/12/2026; KV24 nay là Ấp 47 |
| DV01 phụ trách KV07, KV09; người đi thu `thu07`, `thu09` (bước 3) | `V6_1`, `V9_1` |
| Hộ `DTH-H000128` (KV07, DV01) có tài khoản app (bước 4) | `V18_1` |
| **Kỳ cũ 09/2026 đã quá hạn, DV01 còn nợ** (bước 5 nhắc nộp) | `V22_1`, xem dưới |
| Chợ đồ cũ có bài giả; `CDC-035` của hộ kịch bản đang mở, `CDC-033` đã đóng (bước 7) | `V20_1` |
| Lịch thu gom mọi tổ (chuẩn: bỏ lịch thu gom khỏi UC-12; app còn màn này, **chưa có trong bản demo**) | `V17_1` |
| **Kỳ 09/2026 có số liệu của cả 11 công ty** (Tiến độ thu, Đối soát, Tổng quan không chỉ DV01) | `V40_3`, xem dưới |

**Dữ liệu minh họa nhiều công ty** (`V40_3`, toàn bộ là GIẢ): 28 ấp thêm mới có 6 hộ gia đình mỗi ấp (cách 4 ấp có thêm 1 hộ kinh doanh); phiếu `YCT-0926-02` phát hành kỳ 09/2026 cho 10 công ty DV02–DV11 (số liệu DV01 của `V22_1` không đổi; Ấp 47 chưa có công ty nên chưa có khoản). Mỗi công ty một mức thu/nộp để Tiến độ thu có đủ trạng thái, đọc ở kỳ 09/2026:

| Công ty | Hộ đã đóng | Đã nộp về xã (so với phải nộp) | Hiện ở Tiến độ thu |
|---|---|---|---|
| DV02, DV11 | 100% | đủ | Đã nộp đủ |
| DV03, DV07 | ~83%, ~91% | đủ | Đã nộp đủ |
| DV04 | ~87% | ~60% | Quá hạn nộp |
| DV09 | ~78% | ~80% | Quá hạn nộp (còn ít) |
| DV05, DV08 | ~71%, ~44% | 40%, 30% | Quá hạn nộp, nộp dưới 45% (DV08 thu cũng dưới 45%) |
| DV06 | ~57% | 0 | Quá hạn nộp, chưa nộp |
| DV10 | ~32% | 0 | Quá hạn nộp, thu dưới 45% |
| DV01 | 8 lần thu (xem dưới) | 400.000 | Quá hạn nộp |

- **Tài khoản ngân hàng tạm** cho cả 11 công ty. Chuẩn: mọi chuyển khoản vào một tài khoản chung của xã do quản trị khai báo (UC-54), hồ sơ công ty không có tài khoản **(chưa có trong bản demo)**; demo hiện vẫn dùng tài khoản của từng công ty (`Vietcombank 9999000001` của DV01, `MBBank 9999000002` … `MSB 9999000011`, không phải tài khoản thật): màn Thu tiền của người đi thu và app người dân hiện mã VietQR, app không còn nút thanh toán mô phỏng. Hộ có app còn nợ kỳ 09 để thử đóng online: `0902000221` (`TTT-H000221`) và `0902000341` (`NB-H000341`), cùng DV07, mỗi hộ 80.000.
- **Chuyển khoản qua QR** (Chuẩn: **cán bộ xã** xem giao dịch chờ đối chiếu (UC-27); demo hiện hiện ở màn công ty, Cấu hình → công ty → *Chuyển khoản chờ đối chiếu*, **chưa có trong bản demo** phần chuyển sang xã): phần lớn đã khớp và ghi Đã thu tự động; còn 5 dòng chờ đối chiếu mỗi lý do một dòng — không có mã khoản (DV05, DV07), sai số tiền (DV03), sai tài khoản (DV06), khoản đã đóng rồi (DV09).
- Tiền mặt đã bàn giao và phiếu thu nộp về xã (`PT-CT-0926-002…`) có đủ ở các công ty; một số người đi thu còn đang giữ tiền mặt chưa bàn giao (màn Tiền mặt của công ty). Mọi thao tác trên có dòng nhật ký.
- Demo thu qua ngân hàng không cần tài khoản thật: đặt `SEPAY_WEBHOOK_API_KEY=demo-sepay-key` trong `.env` (khởi động lại backend), mở khoản trong app để xem nội dung chuyển khoản (`VSMT` + số khoản 6 chữ số), số tài khoản và số tiền, rồi chạy `scripts/simulate-bank-transfer.sh <nội dung CK> <số tiền> <số tài khoản>` (gọi `POST /api/payments/sepay/webhook`). App chuyển sang **Đã đóng**, công ty thấy **Đã thu**.

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

1. **`admin`** → Cấu hình → Kỳ thu. **Cách A (tự động, 04/10):** ở thẻ **Tự tạo kỳ thu** bật quy tắc (tháng, ngày tạo kỳ 1, công ty nộp xã 10 ngày) → **Lưu quy tắc** → **Chạy thử ngay**; hệ thống tạo kỳ kế tiếp ở dạng **Dự thảo** và báo cán bộ xã (bước 2 mở kỳ bằng tab **Kỳ chờ mở**, không cần lập phiếu YCT riêng). Ngày thật là đầu tháng nên kỳ tự tạo là tháng kế tiếp; muốn đúng kỳ 10/2026 thì dùng cách B. **Cách B (thủ công):** nút **Mở kỳ thủ công** → mở kỳ **tháng 10/2026**, hạn công ty nộp xã **sau ngày demo** (vd. 31/10/2026; hạn trước ngày demo thì kỳ 10 cũng thành quá hạn). Biểu giá tự gắn `BG-65-2026` (QĐ 65/2026); kỳ vào thẳng **Đang thu**.
2. **`canbo_xa`** → Khu vực → KV24 → **Phân công** (popup) cho **DV01**. Rồi Khoản thu → Phiếu YCT: kỳ 10/2026, phí vệ sinh môi trường, phạm vi toàn xã → **Xem trước**. Chuẩn: kỳ chỉ có một hạn nộp (hạn công ty nộp xã, hộ đóng trong hạn này), không nhập hạn hộ đóng riêng; demo hiện còn ô hạn hộ đóng, nhập không sau hạn kỳ **(chưa có trong bản demo)** → → **Phát hành**. Phân công KV24 trước khi phát hành, không thì hộ KV24 bị bỏ qua với cảnh báo "chưa có công ty phụ trách".
3. Chuẩn: không còn phân tổ (UC-18 bỏ), người đi thu thu được mọi hộ có khoản của công ty và hệ thống ghi người đã thu **(chưa có trong bản demo)**. Demo hiện: **`dv01`** → Khu vực được giao → Phân tổ: phân **KV24** (vừa nhận ở bước 2, chưa có người đi thu) cho `thu07`; seed đã phân sẵn `thu07` ↔ KV07, `thu09` ↔ KV09. **`thu07`** trên điện thoại (`http://<IP LAN>:5173`) → Danh sách thu (kỳ 10/2026): ghi **2 hộ tiền mặt**, **1 hộ vắng**. **`dv01`** → Tổng quan → **Nhận tiền mặt** của `thu07`; `thu07` → Tiền mặt thấy đang giữ về 0.
   - Lịch sử hộ / báo sai (T53): `thu07` chọn kỳ **09/2026** → hộ `DTH-H000122` → **Lịch sử** (vắng 08/09, thu 10/09); **Báo sai thông tin** một hộ → `canbo_xa` và `dv01` nhận thông báo.
4. **App `0902000128`** → Khoản phí của hộ → khoản kỳ 10/2026 → hiện mã QR chuyển khoản của DV01. Chạy `scripts/simulate-bank-transfer.sh VSMT<số khoản> <số tiền> 9999000001` (giả lập ngân hàng báo tiền về) → app hiện **Đã đóng**. **`dv01`** → Hộ được giao: `DTH-H000128` hiện **Đã thu**.
5. Nộp tiền về xã (thứ tự người dùng chốt 28/09/2026, vì nợ kỳ 09 — xem ghi chú ở mục seed):
   1. **`canbo_xa`** → Tiến độ thu (kỳ 10/2026): dòng DV01 **Quá hạn nộp**, "Nợ kỳ trước 919.000" → **Nhắc nộp** → gửi. **`dv01`** thấy thông báo "Nhắc nộp tiền Tháng 09/2026" ở chuông.
   2. DV01 nộp hết kỳ cũ: `canbo_xa` → Khoản thu → Phiếu thu công ty → chọn **kỳ 09/2026** → **Lập phiếu** ở dòng DV01, số tiền **919.000** → kỳ 09 của DV01 Đã nộp đủ.
   3. DV01 nộp một phần kỳ 10: chọn **kỳ 10/2026** → **Lập phiếu** ở dòng DV01, số tiền nhỏ hơn "còn phải nộp" → Tiến độ thu hiện **Nộp một phần**, Đối soát hiện **Đang nộp**.
   4. **`dv01`** → Khu vực được giao → Phiếu thu xã lập → **Báo sai sót** một phiếu → **`canbo_xa`** → Khoản thu → Sai sót phiếu thu → xử lý (đóng kèm ghi chú).
6. **App** → Phản ánh, kiến nghị → gửi mới. **`canbo_xa`** → Khiếu nại → chuyển DV01. **`dv01`** → Khiếu nại → phản hồi. **`canbo_xa`** → đóng. App thấy timeline và thông báo.
7. **App** → Rác cồng kềnh → Đăng ký: mô tả, **chọn ảnh** (tối đa 5 ảnh, mỗi ảnh ≤ 5 MB, JPEG/PNG/WebP) → gửi. **`dv01`** → Rác cồng kềnh → mở yêu cầu (có ảnh hộ gửi) → **Báo phí**; app thấy phí công ty báo (phí này không sinh khoản thu, O5).
   **App** → tab Chợ đồ cũ → đăng một bài (ảnh không bắt buộc) → bình luận ở bài khác; người đăng **đóng bài** được (không mở lại, bài đóng không nhận bình luận mới).
8. **`canbo_xa`** → Đối soát → **Khóa kỳ** 10/2026 khi còn công ty chưa nộp đủ → bị chặn, thông báo nêu công ty còn nợ. Chuẩn: chỉ khóa được khi mọi công ty nộp đủ số phải nộp xã (tính trên đã thu) **và** kỳ đã thu đủ mọi khoản hoặc đã đến hạn nộp; khoản hộ chưa đóng khi khóa thành công nợ của hộ, nộp được ở kỳ sau **(chưa có trong bản demo)**. Demo hiện chưa xét hạn nộp, kỳ khóa thì chặn thu và không chuyển nợ hộ.
9. Cả kịch bản chạy trên `docker compose up` + app Flutter: mở DevTools (F12) của trình duyệt và log `flutter run`, không có lỗi đỏ.

Xem thêm: **`admin`** → Nhật ký: lọc theo người/hành động, thấy dòng lập phiếu thu kèm trước/sau (và các dòng seed của kỳ 09).

## Reset dữ liệu về seed ban đầu

```sh
docker compose down -v
docker compose up
```

Code đã đổi thì build lại lần lượt như bước 3 trước khi `up`. `down -v` xóa volume `vsmt-db-data` (dùng chung với CSDL dev của `docker compose up -d db`) và `vsmt-uploads` (ảnh người dân đã tải lên).
