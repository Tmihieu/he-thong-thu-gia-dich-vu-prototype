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
| **Kỳ cũ 09/2026 đã quá hạn** (hạn 25/09); theo công thức phải nộp xã tính trên đã thu thì **không công ty nào còn nợ** (DV01 đã nộp dư, xã trả lại 175.788 đ), xem dưới | `V22_1`, `V40_3` |
| Chợ đồ cũ có bài giả; `CDC-035` của hộ kịch bản đang mở, `CDC-033` đã đóng (bước 7) | `V20_1` |
| Lịch thu gom mọi tổ (chuẩn: bỏ lịch thu gom khỏi UC-12; app còn màn này, **chưa có trong bản demo**) | `V17_1` |
| **Kỳ 09/2026 có số liệu của cả 11 công ty** (Tiến độ thu, Đối soát, Tổng quan không chỉ DV01) | `V40_3`, xem dưới |

**Dữ liệu minh họa nhiều công ty** (`V40_3`, toàn bộ là GIẢ): 28 ấp thêm mới có 6 hộ gia đình mỗi ấp (cách 4 ấp có thêm 1 nguồn thải nhỏ, mã `KD…` cũ); phiếu `YCT-0926-02` phát hành kỳ 09/2026 cho 10 công ty DV02–DV11 (số liệu DV01 của `V22_1` không đổi; Ấp 47 chưa có công ty nên chưa có khoản). Mỗi công ty một mức thu/nộp. Số liệu kỳ 09/2026 theo công thức **phải nộp xã tính trên đã thu** (tiền mặt đã thu − điều chỉnh − phí thu gom của toàn bộ số đã thu, cả chuyển khoản; xem BR-REM-03):

| Công ty | Phải thu | Đã thu (tiền mặt + chuyển khoản) | Phí thu gom công ty hưởng | Phải nộp xã | Đã nộp | Còn phải nộp |
|---|---|---|---|---|---|---|
| DV01 | 31.313.732 | 30.633.732 (13.371.474 + 17.262.258) | 13.347.262 | 24.212 | 200.000 | −175.788 |
| DV02 | 28.111.068 | 28.111.068 (12.501.626 + 15.609.442) | 12.811.626 | −310.000 | 730.000 | −1.040.000 |
| DV03 | 36.367.480 | 35.847.480 (15.803.860 + 20.043.620) | 16.125.860 | −322.000 | 867.000 | −1.189.000 |
| DV04 | 31.323.816 | 31.003.816 (13.534.012 + 17.469.804) | 13.930.012 | −396.000 | 417.000 | −813.000 |
| DV05 | 26.120.152 | 25.640.152 (11.184.164 + 14.455.988) | 11.360.164 | −176.000 | 192.000 | −368.000 |
| DV06 | 34.934.564 | 33.774.564 (14.804.398 + 18.970.166) | 14.962.398 | −158.000 | 0 | −158.000 |
| DV07 | 30.930.900 | 30.570.900 (13.534.550 + 17.036.350) | 13.936.550 | −402.000 | 901.000 | −1.303.000 |
| DV08 | 25.769.236 | 24.409.236 (10.626.702 + 13.782.534) | 10.800.702 | −174.000 | 208.000 | −382.000 |
| DV09 | 32.943.648 | 32.543.648 (14.168.936 + 18.374.712) | 14.396.936 | −228.000 | 420.000 | −648.000 |
| DV10 | 28.661.984 | 27.301.984 (11.859.088 + 15.442.896) | 11.916.088 | −57.000 | 0 | −57.000 |
| DV11 | 24.858.320 | 24.858.320 (11.109.240 + 13.749.080) | 11.436.240 | −327.000 | 753.000 | −1.080.000 |

⚠ Seed viết cho công thức cũ (phải nộp = phải thu − phí thu gom, phiếu thu ~40–100% của số đó) và có ~40% hộ chuyển khoản, nên với công thức mới **chỉ DV01 có phải nộp xã dương (24.212 đ) và mọi công ty đã nộp dư**: cột "Còn phải nộp" âm hiện "Xã trả lại công ty X đ"; **không công ty nào còn nợ quá hạn** nên Nhắc nộp (bước 5.1) không có đối tượng và mọi công ty đủ điều kiện để khóa kỳ 09. Muốn demo nợ phải ghi thêm tiền mặt (xem bước 5). Cột "Đã thu" là số cũ, các cột phí thu gom/phải nộp là tính lại.

- **Nguồn thải lớn có phí xử lý** (`V48_1`, 07/10): mỗi công ty 2 hồ sơ `NL…` (nhà máy, siêu thị, bệnh viện, khu trọ… tên giả) ở 2 ấp khác nhau, nhóm cân đủ chi phí 1.054 đ/kg (thu gom 453 + vận chuyển 180 + xử lý 421), định mức 9.060–18.030 kg/tháng, đã thu đủ kỳ 09: một hộ trả QR, một hộ trả tiền mặt (người thu đã bàn giao). Số kg tiền mặt : QR = 453 : 601 nên **phải nộp xã, đã nộp, còn phải nộp không đổi**; chỉ phải thu, đã thu, phí thu gom và cột **Xử lý** ở màn Đối soát (bấm *Chi tiết*) có số. Ví dụ DV01: `DTH-NL00001` (Ấp 39, tiền mặt 12.231 kg) và `TTT-NL00001` (Ấp 02, QR 16.227 kg).
- **Tài khoản ngân hàng tạm** cho cả 11 công ty. Chuẩn: mọi chuyển khoản vào một tài khoản chung của xã do quản trị khai báo (UC-54), hồ sơ công ty không có tài khoản **(chưa có trong bản demo)**; demo hiện vẫn dùng tài khoản của từng công ty (`Vietcombank 9999000001` của DV01, `MBBank 9999000002` … `MSB 9999000011`, không phải tài khoản thật): màn Thu tiền của người đi thu và app người dân hiện mã VietQR, app không còn nút thanh toán mô phỏng. Hộ có app còn nợ kỳ 09 để thử đóng online: `0902000221` (`TTT-H000221`) và `0902000341` (`NB-H000341`), cùng DV07, mỗi hộ 80.000.
- **Chuyển khoản qua QR** (Chuẩn: **cán bộ xã** xem giao dịch chờ đối chiếu (UC-27); demo hiện hiện ở màn công ty, Cấu hình → công ty → *Chuyển khoản chờ đối chiếu*, **chưa có trong bản demo** phần chuyển sang xã): phần lớn đã khớp và ghi Đã thu tự động; còn 5 dòng chờ đối chiếu mỗi lý do một dòng — không có mã khoản (DV05, DV07), sai số tiền (DV03), sai tài khoản (DV06), khoản đã đóng rồi (DV09).
- Tiền mặt đã bàn giao và phiếu thu nộp về xã (`PT-CT-0926-002…`) có đủ ở các công ty; một số người đi thu còn đang giữ tiền mặt chưa bàn giao (màn Tiền mặt của công ty). Mọi thao tác trên có dòng nhật ký.
- Demo thu qua ngân hàng không cần tài khoản thật: đặt `SEPAY_WEBHOOK_API_KEY=demo-sepay-key` trong `.env` (khởi động lại backend), mở khoản trong app để xem nội dung chuyển khoản (`VSMT` + số khoản 6 chữ số), số tài khoản và số tiền, rồi chạy `scripts/simulate-bank-transfer.sh <nội dung CK> <số tiền> <số tài khoản>` (gọi `POST /api/payments/sepay/webhook`). App chuyển sang **Đã đóng**, công ty thấy **Đã thu**.

**Kỳ cũ 09/2026** (`V22_1`): trạng thái Đang thu, hạn công ty nộp xã **25/09/2026** — đã quá hạn cả ngày làm seed lẫn ngày demo 21/10. Chỉ phát hành cho DV01 (phiếu `YCT-0926-01`, phạm vi công ty):

| DV01 · kỳ 09/2026 | Số tiền |
|---|---|
| Phải thu (21 khoản: 9 hộ KV07, 9 hộ + 1 nguồn thải nhỏ KV09, giá BG-65-2026; thêm 2 nguồn thải lớn của `V48_1`) | 31.313.732 |
| Đã thu (10 lần, mọi khoản đã thu là thu đủ): tiền mặt 13.371.474 + chuyển khoản 17.262.258 | 30.633.732 |
| Phí thu gom công ty được hưởng (tính theo từng khoản đã thu, cả chuyển khoản) | 13.347.262 |
| **Phải nộp xã** = 13.371.474 − 0 (điều chỉnh) − 13.347.262 | **24.212** |
| Đã nộp về xã (phiếu `PT-CT-0926-001`, 22/09) | 200.000 |
| **Còn phải nộp** = 24.212 − 200.000 (âm: xã trả lại công ty 175.788 đ) | **−175.788** |

- Hộ kịch bản `DTH-H000128` đã đóng kỳ 09 bằng tiền mặt, nên app chỉ còn khoản kỳ 10 để thanh toán ở bước 4.
- `thu07`, `thu09` đã bàn giao hết tiền mặt kỳ 09 (`BG-0926-01`, `BG-0926-02`): bước 3 bắt đầu với 0 đồng đang giữ.
- Lịch sử hộ kỳ 09 cho màn người đi thu: `DTH-H000122` vắng 08/09 rồi thu 10/09; `DTH-H000124` hẹn lại 12/09, còn nợ.
- Các thao tác trên có dòng nhật ký (mở kỳ, phát hành, ghi thu, bàn giao, lập phiếu thu, lập phiếu chi trả công ty).
- Theo công thức mới DV01 **không còn nợ kỳ 09** nên ở kỳ 10/2026 dòng DV01 trên Tiến độ thu **không** hiện "Quá hạn nộp" hay cảnh báo "Kỳ trước chưa khóa" từ seed (trước đây hiện nợ 919.000 do phải nộp tính trên phải thu). Kỳ 09 vẫn còn các hộ chưa đóng (kể cả `TTT-H000221`, `NB-H000341` có app): khi khóa kỳ 09 họ thành **công nợ của hộ**, nộp được ở kỳ 10 và tiền tính vào kỳ 10 (bước 8). Sau khi khóa kỳ 09, thẻ **Công nợ hộ** ở Tiến độ thu hiện số hộ và tiền các khoản kỳ 09 chưa thu (bấm **Xem danh sách** để xem hộ); hộ nộp ở kỳ 10 thì hết nợ và phần đó hiện ở chú thích "trong đó thu công nợ kỳ cũ" của thẻ Đã thu.

## Kịch bản §10

Web mở ở http://localhost:5173; mỗi vai trò dùng một cửa sổ ẩn danh riêng cho khỏi đăng xuất qua lại.

1. **`admin`** → Cấu hình → Kỳ thu. **Cách A (tự động, 04/10):** ở thẻ **Tự tạo kỳ thu** bật quy tắc (tháng, ngày tạo kỳ 1, công ty nộp xã 10 ngày) → **Lưu quy tắc** → **Chạy thử ngay**; hệ thống tạo kỳ kế tiếp ở dạng **Dự thảo** và báo cán bộ xã (bước 2 mở kỳ bằng tab **Kỳ chờ mở**, không cần lập phiếu YCT riêng). Ngày thật là đầu tháng nên kỳ tự tạo là tháng kế tiếp; muốn đúng kỳ 10/2026 thì dùng cách B. **Cách B (thủ công):** nút **Mở kỳ thủ công** → mở kỳ **tháng 10/2026**, hạn công ty nộp xã **sau ngày demo** (vd. 31/10/2026; hạn trước ngày demo thì kỳ 10 cũng thành quá hạn). Biểu giá tự gắn `BG-65-2026` (QĐ 65/2026); kỳ vào thẳng **Đang thu**.
2. **`canbo_xa`** → Khu vực → KV24 → **Phân công** (popup) cho **DV01**. Rồi Khoản thu → Phiếu YCT: kỳ 10/2026, phí vệ sinh môi trường, phạm vi toàn xã → **Xem trước**. Chuẩn: kỳ chỉ có một hạn nộp (hạn công ty nộp xã, hộ đóng trong hạn này), không nhập hạn hộ đóng riêng; demo hiện còn ô hạn hộ đóng, nhập không sau hạn kỳ **(chưa có trong bản demo)** → → **Phát hành**. Phân công KV24 trước khi phát hành, không thì hộ KV24 bị bỏ qua với cảnh báo "chưa có công ty phụ trách".
3. Chuẩn: không còn phân tổ (UC-18 bỏ), người đi thu thu được mọi hộ có khoản của công ty và hệ thống ghi người đã thu **(chưa có trong bản demo)**. Demo hiện: **`dv01`** → Khu vực được giao → Phân tổ: phân **KV24** (vừa nhận ở bước 2, chưa có người đi thu) cho `thu07`; seed đã phân sẵn `thu07` ↔ KV07, `thu09` ↔ KV09. **`thu07`** trên điện thoại (`http://<IP LAN>:5173`) → Danh sách thu (kỳ 10/2026): ghi **2 hộ tiền mặt**, **1 hộ vắng**. **`dv01`** → Tổng quan → **Nhận tiền mặt** của `thu07`; `thu07` → Tiền mặt thấy đang giữ về 0.
   - Lịch sử hộ / báo sai (T53): `thu07` chọn kỳ **09/2026** → hộ `DTH-H000122` → **Lịch sử** (vắng 08/09, thu 10/09); **Báo sai thông tin** một hộ → `canbo_xa` và `dv01` nhận thông báo.
4. **App `0902000128`** → Khoản phí của hộ → khoản kỳ 10/2026 → hiện mã QR chuyển khoản của DV01. Chạy `scripts/simulate-bank-transfer.sh VSMT<số khoản> <số tiền> 9999000001` (giả lập ngân hàng báo tiền về) → app hiện **Đã đóng**. **`dv01`** → Hộ được giao: `DTH-H000128` hiện **Đã thu**.
5. Nộp tiền về xã. **Phải nộp xã tính trên số đã thu** (tiền mặt đã thu − điều chỉnh − phí thu gom của toàn bộ số đã thu, kể cả chuyển khoản): mỗi hộ tiền mặt 80.000 đ làm DV01 phải nộp thêm 23.000 đ, mỗi hộ chuyển khoản 80.000 đ làm giảm 57.000 đ (công ty hưởng phí thu gom nhưng tiền vào tài khoản xã); âm thì xã trả lại công ty. Seed không có công ty nào nợ (xem ghi chú ở mục seed), nên các bước 5.1–5.3 cần số còn phải nộp dương ở kỳ 10: ở bước 3 ghi **ít nhất 4 hộ tiền mặt** (4 hộ = 92.000 đ; trừ 57.000 đ của hộ chuyển khoản ở bước 4 còn 35.000 đ).
   1. (Nhắc nộp, cần công ty nợ quá hạn) mở kỳ 10 ở bước 1 với hạn nộp **đã qua** rồi thu tiền mặt như trên nhưng chưa lập phiếu: **`canbo_xa`** → Tiến độ thu: dòng DV01 **Quá hạn nộp** → **Nhắc nộp** → gửi. **`dv01`** thấy thông báo "Nhắc nộp tiền Tháng 10/2026" ở chuông. Với hạn nộp sau ngày demo thì không có công ty quá hạn và nút Nhắc nộp báo "không có kỳ nào quá hạn còn nợ".
   2. DV01 nộp hết số còn phải nộp: `canbo_xa` → Khoản thu → Phiếu thu công ty → chọn **kỳ 10/2026** → **Lập phiếu** ở dòng DV01, số tiền đúng bằng "còn phải nộp" (số tiền mỗi phiếu không vượt số còn phải nộp) → DV01 Đã nộp đủ. Kỳ 09: DV01 đã nộp dư (xã trả lại 175.788 đ), lập phiếu bị chặn.
   3. DV01 nộp một phần: **Lập phiếu** số nhỏ hơn "còn phải nộp" → Tiến độ thu hiện **Nộp một phần**, Đối soát hiện **Đang nộp**.
   4. **`dv01`** → Khu vực được giao → Phiếu thu xã lập → **Báo sai sót** một phiếu → **`canbo_xa`** → Khoản thu → Sai sót phiếu thu → xử lý (đóng kèm ghi chú).
   5. Xã trả lại công ty (UC-55): `canbo_xa` → Khoản thu → **Phiếu chi trả công ty** → kỳ 09/2026 (seed: DV01 phải nộp xã âm, xã trả lại 175.788) → **Lập phiếu chi** DV01, chọn hình thức, số tiền không vượt số xã còn phải trả → **In**. Tiến độ thu hiện "Xã trả lại công ty …, đã trả …, còn …"; trả đủ thì Đối soát **Khớp**. Còn xã phải trả thì **Khóa kỳ** bị chặn (`PERIOD_COMMUNE_OWES`). **`dv01`** thấy phiếu ở mục Phiếu xã trả lại và thông báo, **Báo sai sót** được; `canbo_xa` xử lý ở tab **Sai sót phiếu chi trả**. **`lanhdao`** → menu **Phiếu chi trả** chỉ xem.
6. **App** → Phản ánh, kiến nghị → gửi mới. **`canbo_xa`** → Khiếu nại → chuyển DV01. **`dv01`** → Khiếu nại → phản hồi. **`canbo_xa`** → đóng. App thấy timeline và thông báo.
7. **App** → Rác cồng kềnh → Đăng ký: mô tả, **chọn ảnh** (tối đa 5 ảnh, mỗi ảnh ≤ 5 MB, JPEG/PNG/WebP) → gửi. **`dv01`** → Rác cồng kềnh → mở yêu cầu (có ảnh hộ gửi) → **Báo phí**; app thấy phí công ty báo (phí này không sinh khoản thu, O5).
   **App** → tab Chợ đồ cũ → đăng một bài (ảnh không bắt buộc) → bình luận ở bài khác; người đăng **đóng bài** được (không mở lại, bài đóng không nhận bình luận mới).
8. **`canbo_xa`** → Đối soát → **Khóa kỳ** 10/2026 khi còn công ty chưa nộp đủ phải nộp xã, hoặc khi kỳ còn khoản hộ chưa đóng mà chưa đến hạn nộp → bị chặn, thông báo nêu lý do (công ty còn nợ và số nợ; số khoản hộ chưa đóng và hạn nộp). Khóa được khi mọi công ty nộp đủ phải nộp xã (tính trên đã thu) **và** kỳ đã thu đủ mọi khoản **hoặc** đã đến hạn nộp (hôm nay ≥ ngày hạn). Thử thật với **kỳ 09/2026** (hạn 25/09 đã qua, không công ty nào nợ): Khóa kỳ 09 → khóa được; hộ chưa đóng kỳ 09 thành **công nợ của hộ**, nộp được ở kỳ 10 (cần kỳ 10 đang thu từ bước 1) và tiền ghi vào kỳ 10; số kỳ 09 giữ nguyên, kỳ 09 vẫn chặn lập thêm khoản và phiếu thu.
9. Cả kịch bản chạy trên `docker compose up` + app Flutter: mở DevTools (F12) của trình duyệt và log `flutter run`, không có lỗi đỏ.

Xem thêm: **`admin`** → Nhật ký: lọc theo người/hành động, thấy dòng lập phiếu thu kèm trước/sau (và các dòng seed của kỳ 09).

## Reset dữ liệu về seed ban đầu

```sh
docker compose down -v
docker compose up
```

Code đã đổi thì build lại lần lượt như bước 3 trước khi `up`. `down -v` xóa volume `vsmt-db-data` (dùng chung với CSDL dev của `docker compose up -d db`) và `vsmt-uploads` (ảnh người dân đã tải lên).
