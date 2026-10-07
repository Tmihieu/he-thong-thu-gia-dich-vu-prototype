# Kịch bản đi qua luồng chính và các case quan trọng

Bản 05/10/2026, viết theo code hiện tại (nhánh `fix/gop-y-ba-0510`) và `docs/business-rules.md`. Thay phần §10 của `docs/demo-runbook.md` ở những chỗ đã cũ: người đi thu không còn ghi vắng/hẹn/thu một phần, rác cồng kềnh đã bỏ, lãnh đạo không còn màn duyệt đề nghị trên web.

**Lưu ý 08/10:** mục 4d–4f viết lại theo phiếu quyết toán (07/10, `docs/quyet-toan-0710.md`): mỗi công ty mỗi kỳ một phiếu, bỏ phiếu thu / phiếu chi trả và báo sai sót phiếu; kỳ có hạn dân đóng và hạn quyết toán (ngày 5 tháng sau kỳ). Các dòng 4.25–4.27 (sai sót phiếu thu) và 4.39–4.49 (phiếu chi trả) đã bỏ; dòng mới đánh số từ 4.50.

**Lưu ý 06/10:** `docs/use-cases.md` đã sửa theo góp ý BA 05/10 (xem `docs/thay-doi-gop-y-0510.md`), code demo chưa đổi theo. Dòng nào ghi **(chưa có trong bản demo)** thì cột Kết quả nêu theo nghiệp vụ chuẩn; chạy trên demo hiện tại sẽ ra hành vi cũ ghi sau chữ "Demo hiện:", không tính là lỗi.

Đi theo thứ tự từ trên xuống: mỗi phần dùng dữ liệu phần trước tạo ra. Cột **Đạt** để đánh dấu khi chạy; dòng **✗** là case lỗi, phải bị chặn đúng thông báo.

## 0. Chuẩn bị

1. Chạy từ CSDL sạch: `docker compose down -v` rồi `docker compose up -d --build db backend web` (bỏ `jmix-admin`, đang build lỗi). Chờ `curl localhost:8080/actuator/health` trả 401 hoặc 200.
2. Mỗi vai trò một cửa sổ ẩn danh (hoặc một trình duyệt riêng) để không phải đăng xuất qua lại:

| Vai trò | Địa chỉ | Đăng nhập |
|---|---|---|
| Quản trị | http://localhost:5173 | nút nhanh **Quản trị** (`admin`) |
| Cán bộ xã | http://localhost:5173 | **Cán bộ xã** (`canbo_xa`) |
| Lãnh đạo | http://localhost:5173 | **Lãnh đạo** (`lanhdao`) |
| Công ty DV01 | http://localhost:5173 | **Công ty DV01** (`dv01`) |
| Người đi thu | http://localhost:5173, thu nhỏ cửa sổ ~400px (F12 → chế độ điện thoại) | **Người thu Ấp 39** (`thu07`) |
| Người dân | http://localhost:5173/citizen | SĐT `0902000128`, OTP `123456` |
| Người dân thứ 2 (chợ, khiếu nại) | http://localhost:5173/citizen | SĐT `0902000221`, OTP `123456` |

Mật khẩu chung `Demo@2026`. Mở F12 ở mọi cửa sổ: chạy hết kịch bản không có lỗi đỏ trong Console.

**Số liệu seed cần nhớ:** kỳ 09/2026 đang thu, hạn dân đóng 25/09, hạn quyết toán 05/10 (đã qua cả hai); chưa công ty nào có phiếu quyết toán kỳ 09 nên cả 11 công ty **Quá hạn quyết toán**; DV01 nộp xã 24.212, 10 công ty còn lại xã trả công ty; còn 5 giao dịch QR chưa xác định công ty (300.000 đ); chưa có kỳ 10/2026; Ấp 47 chưa có công ty; `thu07` phụ trách Ấp 39 (hộ `DTH-H000128`), đang giữ 0 đ tiền mặt.

---

## 1. Đăng nhập và phân quyền

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 1.1 | Mỗi vai trò | Đăng nhập | Vào đúng menu: xã 8 mục (Hồ sơ hộ … Chợ cộng đồng); công ty 3 mục; người đi thu 3 mục; quản trị 4 mục; lãnh đạo 4 mục | |
| 1.2 ✗ | Bất kỳ | Sai mật khẩu | Báo sai tài khoản/mật khẩu, không vào | |
| 1.3 ✗ | `dv01` | Gõ thẳng `localhost:5173/commune/charges` | Không vào được màn của xã | |
| 1.4 ✗ | `thu07` | Gõ thẳng `/company/assigned` | Không vào được | |
| 1.5 ✗ | Người dân | OTP `000000` | "Số điện thoại hoặc mã OTP không đúng." | |
| 1.6 ✗ | `admin` → Tài khoản | **Khóa** chính tài khoản `admin` | "Không tự khóa tài khoản đang đăng nhập." | |

## 2. Cấu hình (quản trị)

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 2.1 | `admin` → Cấu hình → Biểu giá | Xem bản `BG-65-2026` | Đang áp dụng, có giá thu gom + vận chuyển + xử lý từng nhóm; chỉ nhóm **Đăng ký cân, có phí xử lý** có xử lý 421 (453 + 180 + 421 = 1.054 đ/kg); nhóm 500–9.000 kg ghi "nguồn thải nhỏ"; chưa có dòng HGĐ theo nhân khẩu, ô **Thu hộ gia đình theo nhân khẩu** tắt | |
| 2.2 ✗ | `admin` → Biểu giá | Soạn bản dự thảo bỏ trống một nhóm (không phải HGĐ theo nhân khẩu) → **Ban hành** | "Biểu giá phải có đơn giá cho đủ các nhóm giá." | |
| 2.2b ✗ | `admin` → Biểu giá | Dự thảo bật **Thu hộ gia đình theo nhân khẩu**, chọn địa bàn DTH, để trống đơn giá HGĐ theo nhân khẩu → **Ban hành** | "Biểu giá thu theo nhân khẩu phải có đơn giá một người." | |
| 2.2c | `admin` → Biểu giá | Dự thảo hiệu lực **01/11/2026**, bật theo nhân khẩu cho **DTH**, đơn giá một người số tạm (vd. 10.000 + 5.000) → **Ban hành** | Ban hành được; `BG-65-2026` kết thúc 31/10/2026; xem lại thấy ô nhân khẩu + DTH. Dùng cho 9.13–9.14 | |
| 2.3 | `admin` → Cấu hình → Kỳ thu | **Tạo kỳ dự thảo** tháng **10/2026** (chỉ chọn loại, năm, tháng) | Kỳ 10/2026 hiện ngay **đầu** bảng, trạng thái **Dự thảo**, gắn `BG-65-2026`, cột Ngày mở và Hạn dân đóng để trống, Hạn quyết toán **05/11/2026**; `canbo_xa` có thông báo kỳ chờ mở | |
| 2.4 ✗ | `admin` | Tạo lại kỳ 10/2026 lần nữa | "Kỳ … đã được tạo trước đó." | |
| 2.5 | `admin` → Kỳ thu → thẻ **Tự tạo kỳ thu** | Bật quy tắc tháng, ngày tạo 1 → **Lưu quy tắc** (không còn ô số ngày hộ đóng / công ty nộp xã) | Lưu được; không tạo kỳ trùng với kỳ 10 vừa tạo | |
| 2.6 | `admin` → Công ty & địa bàn | Xem 11 công ty DV01–DV11 | Trạng thái Đang hợp tác. Chuẩn: hồ sơ công ty không có tài khoản ngân hàng (tài khoản nhận chuyển khoản là của xã, do quản trị khai báo, UC-54) **(chưa có trong bản demo)**. Demo hiện: còn tài khoản ngân hàng tạm của từng công ty, chưa có chỗ khai báo tài khoản của xã | |

## 3. Luồng 1 — Mở kỳ và phát hành khoản thu (BF-01)

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 3.1 | `canbo_xa` → Khu vực | Mở **Ấp 47** → **Phân công** cho **DV01** | Ấp 47 hiện DV01 trên bảng; **Lịch sử** có dòng mới. Chuẩn: không còn bản đồ khu vực (UC-14 bỏ) **(chưa có trong bản demo)**. Demo hiện: còn hiện trên bản đồ và kéo thả vị trí | |
| 3.2 ✗ | `canbo_xa` → Khu vực | Phân công Ấp 39 (đang là DV01) cho DV02 cùng khoảng ngày | Báo "Khu vực … đang do … phụ trách." hoặc tự đóng phân công cũ theo BR-MD-01 — ghi lại hành vi thật | |
| 3.3 | `canbo_xa` → Khoản thu → Phiếu YCT → **Lập phiếu YCT** | Ô Kỳ thu: **Tháng 10/2026** nằm trên cùng; chọn nó, ô **Hạn dân đóng** mặc định **25/10/2026**, dưới ghi hạn quyết toán 05/11/2026 → **Xem trước** | Danh sách khoản + tổng tiền; hộ miễn 100% (`DTH-H000149`) là 0 đ | |
| 3.4 ✗ | `canbo_xa` (màn xem trước) | Đặt hạn dân đóng **05/11/2026** (bằng hoặc sau hạn quyết toán) | Bị chặn: "Hạn dân đóng phải trước hạn quyết toán (…)" (`PERIOD_DUE_AFTER_SETTLEMENT`) | |
| 3.5 | `canbo_xa` | Giữ hạn dân đóng 25/10/2026 → **Mở kỳ & phát hành** → xác nhận | Kỳ 10/2026 thành **Đang thu**; có phiếu `YCT-1026-01`; khoản sinh cho các hộ có đăng ký hiệu lực | |
| 3.6 | `canbo_xa` → Khoản thu → Phiếu YCT | **Lập phiếu YCT** cùng kỳ, toàn xã → **Xem trước** | Các hộ đã có khoản bị bỏ qua kèm cảnh báo trùng, không sinh khoản thứ 2 | |
| 3.7 | `dv01` → Khu vực được giao → Tổng quan | Chọn kỳ 10/2026 | Thấy tổng phải thu kỳ 10, gồm cả hộ Ấp 47 vừa nhận | |
| 3.8 | Người dân `0902000128` | Trang chủ | Có thông báo khoản mới; **Khoản phí phải đóng** có khoản kỳ 10/2026 | |

## 4. Luồng 2 — Thu tiền, nộp về xã, khóa kỳ (BF-02)

### 4a. Thu tiền mặt (phân tổ đã bỏ)

Chuẩn (UC-18 bỏ): không phân tổ; người đi thu thu được mọi hộ có khoản của công ty, hệ thống ghi ai đã thu khoản nào. Bản demo còn phân tổ nên 4.1 và 4.3 chạy theo hành vi cũ.

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 4.1 | `dv01` → Khu vực được giao → Phân tổ | **Phân tổ cho người đi thu**: Ấp 47 → `thu07` | Chuẩn: bỏ bước này, `thu07` thấy sẵn mọi hộ của DV01 gồm Ấp 47 **(chưa có trong bản demo)**. Demo hiện: dòng mới; `thu07` thấy thêm hộ Ấp 47 | |
| 4.2 | `dv01` → Người đi thu | **Thêm** một người đi thu mới, rồi **Đặt lại mật khẩu**, **Khóa** | Chuẩn: quản trị viên tạo tài khoản người đi thu cho từng công ty (UC-04), công ty không tự thêm **(chưa có trong bản demo)**. Demo hiện: làm được, chỉ với người của DV01 | |
| 4.3 | `thu07` → Danh sách thu | Kỳ 10/2026 | Chuẩn: thấy mọi hộ có khoản của DV01 **(chưa có trong bản demo)**. Demo hiện: chỉ thấy hộ Ấp 39 + Ấp 47 (tổ được giao). Mỗi hộ **Đã đóng / Chưa đóng** | |
| 4.4 | `thu07` | Hộ thứ nhất → **Đã thu tiền mặt** → **Xác nhận đã thu** | Hộ thành **Đã đóng**; có mã xác nhận `TT-1026-…` | |
| 4.5 | `thu07` | Làm tiếp một hộ thứ hai | Như trên | |
| 4.6 ✗ | `thu07` | Bấm lại hộ đã đóng | Không còn nút thu; nếu gọi được thì "Khoản … đã thu đủ." | |
| 4.7 ✗ | `thu07` | Hộ miễn 100% (nếu có trong tổ) | Không thu được: "Khoản … được miễn, không thu." | |
| 4.8 | `thu07` → Tiền mặt | Xem | Đang giữ = tổng 2 hộ vừa thu | |

### 4b. Chuyển khoản VietQR

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 4.9 | Người dân `0902000128` | Khoản phí → khoản kỳ 10 → **Chuyển khoản VietQR** | Mã QR tài khoản DV01 (Vietcombank `9999000001`), nội dung `VSMT…`, số tiền đúng | |
| 4.10 | Máy (Git Bash, gốc repo) | `scripts/simulate-bank-transfer.sh <nội dung> <số tiền> 9999000001` | App chuyển **Đã đóng**; `dv01` → Hộ được giao: `DTH-H000128` **Đã thu**; tiền mặt của `thu07` **không** đổi | |
| 4.11 ✗ | Máy | Chạy lại lệnh trên lần nữa | Không tạo thanh toán thứ 2; giao dịch vào **Chuyển khoản chờ đối chiếu** (khoản đã đóng) | |
| 4.12 ✗ | Máy | Gửi sai số tiền (vd. thiếu 1.000) cho một khoản Chưa đóng khác | Khoản vẫn Chưa đóng; dòng lý do "sai số tiền" ở **Chuyển khoản chờ đối chiếu** | |
| 4.13 | `thu07` | Hộ Chưa đóng → mở QR "Quét mã để chuyển khoản" → **Mô phỏng chuyển khoản** | "Giao dịch thành công"; hộ Đã đóng, không cộng vào tiền mặt đang giữ | |
| 4.14 | `canbo_xa` → Chuyển khoản chờ đối chiếu | Xem | Chuẩn: **cán bộ xã** xem (UC-27), công ty không xem **(chưa có trong bản demo)**. Demo hiện: màn này hiện cho `dv01`. Có 5 dòng seed (không mã, sai tiền, sai tài khoản, đã đóng) + các dòng ở 4.11–4.12 | |

### 4c. Bàn giao tiền mặt

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 4.15 ✗ | `dv01` → Tổng quan → **Nhận tiền mặt** của `thu07` | Nhập số **lớn hơn** đang giữ | "Số tiền bàn giao phải lớn hơn 0 và không vượt tiền mặt đang giữ …" | |
| 4.16 ✗ | `dv01` | Ngày bàn giao ngày mai | "Ngày bàn giao không được sau hôm nay." | |
| 4.17 | `dv01` | Nhận đúng số đang giữ → **Xác nhận đã nhận** | `thu07` → Tiền mặt về **0**, **Lịch sử bàn giao** có dòng mới | |

### 4d. Nhắc nộp, quyết toán (UC-34, UC-35)

**Phải nộp xã tính trên số đã thu** (góp ý BA 05/10): phải nộp xã = tiền mặt công ty đã thu − điều chỉnh kỳ trước − phí thu gom của **toàn bộ** số đã thu (cả chuyển khoản vào tài khoản xã). Với biểu giá BG-65-2026 nhóm HH_3_PLUS (80.000 đ = thu gom 57.000 + vận chuyển 23.000): mỗi hộ nộp **tiền mặt** làm phải nộp xã tăng **23.000 đ**; mỗi hộ **chuyển khoản** làm giảm **57.000 đ**. Phải nộp xã chính là **chênh lệch** trên phiếu quyết toán: dương công ty nộp xã, âm xã trả công ty, 0 vẫn lập phiếu (BR-REM-18).

Seed kỳ 09/2026 (đã qua hạn dân đóng 25/09 và hạn quyết toán 05/10, chưa có phiếu nào): DV01 chênh lệch **24.212** (công ty nộp xã); DV02 **−310.000**, DV03 −322.000, DV04 −396.000, DV05 −176.000, DV06 −158.000, DV07 −402.000, DV08 −174.000, DV09 −228.000, DV10 −57.000, DV11 −327.000 (xã trả công ty).

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 4.18 | `canbo_xa` → Tiến độ thu, Đối soát | Kỳ 09/2026, rồi kỳ 10/2026 | Kỳ 09: cả 11 công ty **Quá hạn quyết toán**, Đối soát lọc **Chưa quyết toán 11**. Kỳ 10: DV01 hiện quá hạn vì còn phải nộp kỳ 09 (nợ kỳ trước 24.212) | |
| 4.19 | `canbo_xa` | Kỳ 09 → DV01 → **Nhắc nộp** → **Gửi nhắc nộp** | `dv01` có thông báo ở chuông; bấm vào mở đúng màn | |
| 4.20 ✗ | `canbo_xa` | Nhắc DV02 (xã trả công ty, không có số phải nộp) | "Công ty … không có kỳ nào quá hạn còn nợ, không cần nhắc nộp." | |
| 4.21 ✗ | `canbo_xa` → Đối soát → kỳ 10/2026 | Tìm nút **Lập phiếu quyết toán** (chưa tới hạn dân đóng 25/10); gọi `POST /api/remittance/settlements` cho kỳ 10 | Nút bị khóa, rê chuột thấy "Chỉ lập sau hạn dân đóng 25/10/2026"; API báo "Chỉ lập phiếu quyết toán sau hạn dân đóng (25/10/2026)." | |
| 4.22 | `canbo_xa` → Đối soát → kỳ 09/2026 | Dòng DV02 → **Lập phiếu quyết toán** → hình thức **Chuyển khoản**, ngày hôm nay, để trống người đại diện → **Lập phiếu** | Popup hiện công ty phải nộp xã **6.694.819**, xã phải trả công ty **7.004.819**, chênh lệch **−310.000** (xã trả công ty), không sửa được. Phiếu **`QT-0926-001`**; bản in có số tiền bằng chữ "Ba trăm mười nghìn đồng", người đại diện = người đầu mối DV02. Dòng DV02 thành **Đã quyết toán**, nút **Xem phiếu QT-0926-001** | |
| 4.23 | `canbo_xa` | Dòng DV01 → **Lập phiếu quyết toán** → hình thức **Tiền mặt** | Chênh lệch **24.212** (công ty nộp xã); phiếu `QT-0926-002`; ô Xã đang giữ: "+ Đã thu từ Cty" 24.212, "− Đã chi cho Cty" 310.000. Kỳ 10: DV01 không còn quá hạn do nợ kỳ trước | |
| 4.50 ✗ | `canbo_xa` (API) | Gọi lại `POST /api/remittance/settlements` cho DV02 kỳ 09 | 409 "Công ty DV02 đã quyết toán Tháng 09/2026." | |
| 4.51 ✗ | `canbo_xa` | Lập phiếu DV03 (chênh lệch −322.000) bỏ trống hình thức (hoặc gọi API không có `method`) | "Phải chọn hình thức chuyển tiền." | |
| 4.52 ✗ | `canbo_xa` (API) | Lập phiếu DV03 với ngày quyết toán ngày mai | "Ngày quyết toán không được sau hôm nay." | |
| 4.53 | `dv01` → Khu vực được giao → tab **Phiếu quyết toán** | Xem; bấm thông báo "Xã đã lập phiếu quyết toán QT-0926-002" ở chuông | Chỉ thấy `QT-0926-002` của DV01, không thấy phiếu DV02; không có nút báo sai sót; thông báo mở đúng màn | |
| 4.54 ✗ | `dv01`, `lanhdao`, `admin` (API) | Gọi `POST /api/remittance/settlements` | 403 (chỉ cán bộ xã lập) | |
| 4.55 | `lanhdao` → menu **Phiếu quyết toán**, Đối soát | Chọn kỳ 09/2026 | Thấy `QT-0926-001`, `QT-0926-002`; **không** có nút Lập phiếu quyết toán. `admin` → Nhật ký thấy dòng `ISSUE_SETTLEMENT` (Lập phiếu quyết toán) kèm số tiền | |
| 4.56 | `canbo_xa` | Sau 4.22: hộ `TTT-H000221` (DV07, còn nợ kỳ 09) → lập phiếu quyết toán DV07 trước, rồi người dân chuyển khoản khoản kỳ 09 (như 4.10) | Khoản **Đã đóng**; tiền ghi vào **kỳ 10** (Đối soát kỳ 10 DV07 có thêm số đã thu), số kỳ 09 và phiếu DV07 giữ nguyên (BR-REM-19) | |
| 4.24 | `canbo_xa` → Tiến độ thu | So số DV01 kỳ 10 với `dv01` → Tổng quan và Đối soát | Phải thu / đã thu (tiền mặt + chuyển khoản) / phí thu gom công ty hưởng / phải nộp xã **khớp nhau** ở cả 3 màn (BR-REM-12). Ví dụ: 2 hộ tiền mặt (160.000) + 1 hộ chuyển khoản (80.000): thu gom 3 × 57.000 = 171.000, phải nộp xã = 160.000 − 171.000 = −11.000 | |

### 4f. Khóa kỳ

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 4.28 ✗ | `canbo_xa` → Đối soát → kỳ 09/2026 → **Khóa kỳ** | Seed còn 5 giao dịch QR chưa xác định công ty | "Chưa khóa được kỳ 2026-09 vì còn 5 giao dịch chuyển khoản chưa xác định công ty (300.000 đ)." (`PERIOD_UNIDENTIFIED_QR`; cộng thêm giao dịch tạo ở 4.11–4.12 nếu có). Demo chưa có màn xử lý giao dịch này: muốn thử tiếp phải xóa chúng trong CSDL demo (`delete from bank_transfers where status = 'UNMATCHED'`) | |
| 4.29 ✗ | `lanhdao` → Đối soát | Tìm nút Khóa kỳ | Không có (chỉ xem) | |
| 4.31 ✗ | `canbo_xa` | Hết QR chưa xác định, mới quyết toán DV01, DV02 (và DV07 nếu đã làm 4.56) → **Khóa kỳ** 09 | "Chưa khóa được kỳ 2026-09 vì còn n công ty chưa quyết toán: DV03, DV04, …" (`PERIOD_NOT_SETTLED`, nêu đủ mã công ty) | |
| 4.30 | `canbo_xa` | Lập phiếu quyết toán cho mọi công ty còn lại → **Khóa kỳ** 09 (cần kỳ 10 đang thu) | Khóa được dù còn hộ chưa đóng. Hộ chưa đóng kỳ 09 thành **công nợ của hộ**: app `0902000221` (`TTT-H000221`) vẫn thấy khoản kỳ 09 cần đóng (nếu chưa đóng ở 4.56), chuyển khoản qua mã QR (hoặc người đi thu ghi tiền mặt) → khoản **Đã đóng**, tiền ghi vào **kỳ 10**; số kỳ 09 giữ nguyên | |
| 4.32 ✗ | `canbo_xa` | Kỳ 09 đã khóa → thử lập phiếu quyết toán kỳ 09, phát hành thêm khoản kỳ 09 | API báo "Kỳ 2026-09 đã khóa, không thay đổi được." | |
| 4.33 ✗ | (Máy hoặc người đi thu) | Kỳ 09 đã khóa, **chưa có kỳ đang thu**: ghi thu hộ còn nợ kỳ 09 | "… đã khóa và chưa có kỳ đang thu để ghi nhận tiền công nợ của hộ." | |
| 4.34 | `canbo_xa` → Tiến độ thu | Sau khi khóa kỳ 09 (4.30), chọn kỳ 10/2026 | Có đủ thẻ: Phải thu, Đã thu (tiền mặt, chuyển khoản), Phải nộp xã, Đã nộp, Còn phải nộp, **Công nợ hộ** (N hộ, tổng tiền các khoản chưa thu của kỳ 09, đúng bằng số hộ chưa đóng kỳ 09). Công ty chưa quyết toán kỳ 10 hiện **Chưa quyết toán** (chưa tới hạn quyết toán 05/11); không còn nhãn "Nộp một phần" | |
| 4.35 | `canbo_xa` | Thẻ Công nợ hộ → **Xem danh sách**; rồi mở công ty → cột "Hộ còn nợ kỳ cũ" của tổ → bấm số | Danh sách hộ: hộ, địa chỉ, tổ, công ty, kỳ (Tháng 09/2026), số tiền, số kỳ nợ; bấm từ tổ chỉ còn hộ của tổ đó. Phân trang 10 dòng | |
| 4.36 | `canbo_xa` | Hộ `TTT-H000221` nộp công nợ kỳ 09 (như 4.30) → mở lại Tiến độ thu kỳ 10 | Thẻ Công nợ hộ **giảm 1 hộ** và hết hộ đó trong danh sách; thẻ Đã thu có chú thích "trong đó thu công nợ kỳ cũ: <số tiền khoản đã nộp>" | |
| 4.37 | `canbo_xa` → Đối soát, kỳ 10 | Xem bảng | Nhóm Xã nhận qua QR, Cty thu tiền mặt, cột Kết quả, Phiếu quyết toán; đầu bảng ghi hạn dân đóng 25/10/2026 và hạn quyết toán 05/11/2026; lọc **Tất cả / Chưa quyết toán / Đã quyết toán** | |
| 4.38 | `lanhdao` → Tiến độ thu | Xem thẻ Công nợ hộ và danh sách | Thấy thẻ và danh sách; **không** có nút "Nhắc công ty nộp". Tài khoản `dv01` không vào được màn này (1.3) | |

## 5. Quy trình con F — Miễn giảm, hoàn, xóa nợ (lãnh đạo duyệt)

Web chỉ còn phần **miễn giảm** (bật trên hồ sơ hộ). Hoàn tiền và xóa nợ không còn nút trên web (commit `0832b77`), lãnh đạo cũng không còn màn duyệt: thử qua Swagger `http://localhost:8080/swagger-ui.html` → nhóm approvals (đăng nhập lấy token bằng `POST /api/platform/auth/login`).

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 5.1 ✗ | `canbo_xa` → Hồ sơ hộ → một hộ → đăng ký | Bật **Miễn 100%** không ghi lý do | "Miễn 100% phải ghi lý do miễn." | |
| 5.2 | `canbo_xa` | Bật Miễn 100% có lý do | Khoản Chưa thu kỳ 10 của hộ thành **Miễn giảm** 0 đ; tự tạo đề nghị `DN-1026-…` chờ lãnh đạo | |
| 5.3 | `lanhdao` (API) | `POST …/approvals/{id}/reject` không ý kiến | 422 "Từ chối phải ghi ý kiến." | |
| 5.4 | `lanhdao` (API) | Từ chối có ý kiến | Cờ miễn bị bỏ; khoản kỳ 10 về **Chưa thu**, số tiền tính lại; xã có thông báo | |
| 5.5 ✗ | `lanhdao` (API) | Duyệt lại đề nghị vừa từ chối | "Đề nghị … đã được xử lý." | |
| 5.6 ✗ | `canbo_xa` (API) | Xóa nợ khoản đã có thanh toán | "Chỉ xóa nợ khoản chưa thu và chưa có lần thu nào …" | |
| 5.7 ✗ | `canbo_xa` (API) | Hoàn số tiền lớn hơn đã thu | "Số tiền hoàn phải lớn hơn 0 và không vượt số đã thu …" | |

**Cần chốt:** bỏ màn duyệt trên web thì lãnh đạo duyệt miễn giảm ở đâu? Hiện đề nghị miễn giảm tự sinh nhưng không ai duyệt được trên giao diện.

## 6. Luồng 3 — Khiếu nại (BF-03)

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 6.1 | Người dân `0902000128` | **Gửi phản ánh kiến nghị** → **Gửi phản ánh mới** (loại, mô tả, nơi xảy ra) → **Gửi phản ánh** | Mã `KN-1026-…`, trạng thái **Mới**; `canbo_xa` có thông báo | |
| 6.2 ✗ | Người dân | Gửi khi trống mô tả | Không gửi được, báo thiếu trường bắt buộc | |
| 6.3 | `canbo_xa` → Khiếu nại | Mở khiếu nại → **Chuyển công ty** DV01 | **Đang xử lý**, hạn +3 ngày; `dv01` có thông báo | |
| 6.4 ✗ | `canbo_xa` | Chuyển lần nữa | "Khiếu nại … đã chuyển … xử lý." | |
| 6.5 | `dv01` → Khiếu nại | **Giải quyết khiếu nại** → **Gửi phản hồi** | Phản hồi vào timeline; xã có thông báo; công ty **không** có nút đóng | |
| 6.6 ✗ | `canbo_xa` | **Đóng khiếu nại** khi trống kết quả | "Phải ghi kết quả giải quyết." | |
| 6.7 | `canbo_xa` | Đóng có kết quả | **Đã giải quyết**; app: **Chi tiết phản ánh** có đủ Tiến trình xử lý + Kết quả, có thông báo | |
| 6.8 | `canbo_xa` | **Ghi nhận khiếu nại** kênh **Điện thoại** cho một hộ | Tạo được; không gắn tài khoản app (hộ không thấy trên app) | |
| 6.9 ✗ | `canbo_xa` | Ghi nhận với ngày tiếp nhận ngày mai | "Ngày tiếp nhận không được sau hôm nay." | |
| 6.10 ✗ | `dv02` (đăng nhập tay) | Xem Khiếu nại | Không thấy khiếu nại đã chuyển cho DV01 | |

## 7. Luồng 4 — Chợ đồ cũ và kiểm duyệt (BF-04)

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 7.1 | `canbo_xa` → Chợ cộng đồng → **Bộ lọc từ khóa** | **Thêm từ khóa** vd. `lừa đảo` | Lưu được | |
| 7.2 ✗ | `canbo_xa` | Thêm lại đúng từ khóa đó | "Từ khóa … đã có trong bộ lọc." | |
| 7.3 | Người dân `0902000128` → Chợ đồ cũ → **Đăng tin** | Nội dung bình thường, 1 nhãn, 1 ảnh → **Đăng bài** | Bài hiện ngay trên chợ | |
| 7.4 ✗ | Người dân | Đăng bài không chọn nhãn | "Chọn ít nhất một nhãn." | |
| 7.5 ✗ | Người dân | Đính ảnh > 5 MB hoặc file `.gif` | "Ảnh vượt quá 5 MB." / "Chỉ nhận ảnh JPEG, PNG hoặc WebP." | |
| 7.6 | Người dân | Đăng bài có chữ `lừa đảo` | **Bài đang chờ duyệt**; không hiện cho người khác; `canbo_xa` thấy ở tab **Chờ duyệt** | |
| 7.7 | `canbo_xa` | **Duyệt cho hiển thị** | Bài hiện trên chợ | |
| 7.8 | Người dân `0902000221` | Mở bài ở 7.3 → **Bình luận** → **Lưu** | Chủ bài có thông báo bình luận; bài vào **Tin đã lưu** | |
| 7.9 | Người dân `0902000221` | **Báo cáo bài đăng** → **Gửi báo cáo** | "Đã gửi báo cáo. Cán bộ xã sẽ xem xét."; xã thấy ở tab **Bị báo cáo** | |
| 7.10 ✗ | Chủ bài `0902000128` | Báo cáo bài của chính mình | "Không thể báo cáo bài của chính mình." | |
| 7.11 ✗ | `canbo_xa` | **Gỡ bài** không lý do | "Nhập lý do gỡ bài để báo cho người đăng." | |
| 7.12 | `canbo_xa` | Gỡ bài có lý do | Bài biến khỏi chợ; chủ bài có thông báo kèm lý do; chủ bài không sửa được ("… đã bị cán bộ xã gỡ, không sửa được nữa.") | |
| 7.13 | Chủ bài (bài khác) | **Ẩn bài** → **Hiện bài**; **Đánh dấu đã xong** → **Mở lại** | Đổi trạng thái đúng; bài đã xong không nhận bình luận mới | |
| 7.14 | `0902000221` | **Chặn người đăng** → Tài khoản → **Người đã chặn** → **Bỏ chặn** | Chặn thì không thấy bài của nhau (hai chiều), bỏ chặn thấy lại | |
| 7.15 ✗ | `dv01`, `thu07` | Tìm mục chợ | Không có (chỉ người dân + cán bộ xã) | |

## 8. Lãnh đạo, báo cáo, nhật ký, thông báo

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 8.1 | `lanhdao` → Dashboard | Kỳ 09 và kỳ 10 | Cảnh báo **Tỷ lệ nộp thấp (dưới 45%)** có DV05, DV08, DV10 (kỳ 09); **Nộp chậm / nợ kỳ trước**; số khớp Tiến độ thu của xã | |
| 8.2 | `lanhdao` → Báo cáo tổng hợp | Lọc theo công ty, theo tổ → **Xuất báo cáo** | File CSV mở bằng Excel không lỗi dấu; có dòng **Tổng toàn xã**, cột **Phải nộp xã**, **Hộ miễn 100%** | |
| 8.3 ✗ | `lanhdao` | Tiến độ thu / Đối soát / Phiếu quyết toán | Chỉ xem: không có Nhắc nộp, Lập phiếu quyết toán, Khóa kỳ | |
| 8.4 | `admin` → Nhật ký | Lọc theo `canbo_xa`, hành động lập phiếu quyết toán | Có dòng ở 4.22–4.23 kèm số tiền | |
| 8.5 | Mọi vai trò | Chuông → bấm một thông báo | Mở đúng màn liên quan; **Đánh dấu tất cả đã đọc** hết số đỏ | |

## 9. Hồ sơ hộ (case dữ liệu)

| # | Vai trò | Thao tác | Kết quả mong đợi | Đạt |
|---|---|---|---|---|
| 9.1 | `canbo_xa` → Hồ sơ hộ → **Thêm hộ** | Hộ gia đình 2 người, đường theo danh mục, Ấp 39 | Tạo được; đăng ký thu phí tự gắn nhóm ≤2 người; không hiện số hợp đồng | |
| 9.2 ✗ | `canbo_xa` | Thêm hộ trùng địa chỉ hộ đã có | Cảnh báo "Địa chỉ này trùng với hồ sơ …" với **Mở hồ sơ đã có** / **Xác nhận là hộ khác** (cảnh báo, không chặn hẳn) | |
| 9.3 | `canbo_xa` | Gõ đường không có trong danh mục → **Ghi nhận chờ xác minh** | Lưu được, đường đánh dấu chờ xác minh | |
| 9.4 | `canbo_xa` | Đổi hộ 2 người (nhóm ≤2, địa bàn chưa bật nhân khẩu) thành 4 người | Khoản kỳ 10 giữ giá cũ; đăng ký mới (nhóm ≥3) bắt đầu từ kỳ sau; có lịch sử nhân khẩu | |
| 9.5 | `canbo_xa` → **Nhập từ Excel** | **Tải file mẫu**, điền 2 dòng đúng + 1 dòng sai → chọn file | Xem trước báo lỗi dòng sai, **không ghi dòng nào**; sửa hết lỗi thì ghi cả 3 | |
| 9.6 | `thu07` | Hộ bất kỳ → **Báo sai** → **Gửi báo cáo** | `canbo_xa` và `dv01` có thông báo | |
| 9.7 | `thu07` | Chọn kỳ 09 → hộ `DTH-H000122` → **Lịch sử** | Thấy lịch sử nộp các kỳ của hộ | |
| 9.8 | `canbo_xa` → **Thêm hộ** | Loại **Nguồn thải lớn** | Nhóm giá chỉ có **Đăng ký cân, có phí xử lý**, có ô định mức kg/tháng; mã mới dạng `…-NL00001` | |
| 9.9 | `canbo_xa` | Nguồn thải nhỏ, nhóm **Đăng ký cân**, định mức 600 kg (hiệu lực từ kỳ sau, hoặc kỳ chưa phát hành) → lập khoản kỳ đó | Khoản = 1.054 × 600 = **632.400 đ**/tháng. Xóa định mức → hồ sơ bị bỏ qua ở xem trước kèm lý do thiếu định mức kg | |
| 9.10 ✗ | `canbo_xa` | Hộ gia đình đang nhóm ≤2: mở đăng ký, chọn nhóm | Chỉ có nhóm hộ gia đình; chỉ chuyển được sang **HGĐ theo nhân khẩu**. Nguồn thải nhỏ không thấy nhóm hộ gia đình | |
| 9.11 | `canbo_xa` | Kỳ 10 đang thu: đổi nhóm đăng ký của một nguồn thải nhỏ (mã `KD…`/`DN…`) từ bậc 250–500 kg sang **Đăng ký cân** + định mức | Đăng ký cũ kết thúc **31/10/2026**, đăng ký mới nhóm cân từ **01/11/2026**; khoản kỳ 10 giữ nhóm và số tiền cũ | |
| 9.12 ✗ | `canbo_xa` | Đổi loại nguồn thải nhỏ đang bậc 250–500 kg (đăng ký còn hiệu lực) thành **Nguồn thải lớn** | "Đăng ký thu phí … dùng nhóm giá không hợp loại mới; kết thúc hoặc sửa đăng ký trước khi đổi loại." | |
| 9.13 | `admin` + `canbo_xa` | Sau 2.2c: tạo kỳ 11/2026 (gắn biểu giá mới) → lập phiếu YCT → **Xem trước** | Hộ gia đình ở DTH tính đơn giá một người × số nhân khẩu dù đăng ký ghi ≤2 / ≥3; hộ TTT / NB vẫn theo nhóm cũ. Sau phát hành, màn Khoản thu hiện "HGĐ theo nhân khẩu · N người" | |
| 9.14 | `canbo_xa` | Trước khi lập khoản kỳ 11: đổi một hộ DTH từ 4 thành 5 người | Không tách đăng ký; khoản kỳ 11 lập sau đó tính **5 người** (áp ngay). Khoản đã lập giữ số người cũ | |

## Khoảng trống đã biết (không tính là lỗi khi chạy)

- **Lãnh đạo duyệt đề nghị**: không có màn web (mục 5). Cần chốt có làm lại màn duyệt không.
- **Rác cồng kềnh**: đã bỏ (04/10), không thử.
- **Quản lý thành viên hộ trên app**: chưa có màn, app chỉ xem thông tin hộ.
- **SMS/Zalo nhắc nộp**: chưa làm; nhắc chỉ trong app (xã chạy tay `POST /api/notifications/household-reminders/run`).
- **Jmix** (`/jmix`, Quản trị dữ liệu): container đang build lỗi.

## Reset để chạy lại

```sh
docker compose down -v
docker compose up -d --build db backend web
```
