# Kiểm kê prototype v3.1 (tham chiếu cho data dictionary)

> Tạo 23/09/2026 bằng agent quét mã nguồn. Mô tả **những gì prototype đang làm**, không phải thiết kế mục tiêu. Đường dẫn tương đối `assets/js/`.

Toàn bộ dữ liệu nằm trong bộ nhớ; tải lại trang là khôi phục. Ngày "hôm nay" cố định `CS_TODAY = "2026-09-17"`. Tiền là số nguyên VND.

## 0. Dữ liệu còn dùng từ file cũ

| File:dòng | Nội dung | Cách dùng hiện tại |
|---|---|---|
| commune-management.js:5-8 | `MANAGEMENT_UNITS` (công ty) | Mảng gốc, 11 tên từ `APP_DATA.contractors` |
| commune-management.js:9-16 | `MANAGEMENT_AREAS` (24 tổ) | `KV01..KV24`, `start 2026-09-01`, `end 2026-12-31` |
| single-unit-area.js:4-9 | `area.unit` | KV24 bắt đầu chưa phân công |
| data.js:200-224 | users, tariffVersions, audit | Seed cho quản trị |

Phân công sau khi nạp: DV01→KV07,KV09 · DV02→KV01,KV02 · DV03→KV03,KV13,KV14 · DV04→KV04,KV15 · DV05→KV16 · DV06→KV05,KV06 · DV07→KV12,KV17,KV18 · DV08→KV08,KV19 · DV09→KV20 · DV10→KV10,KV23 · DV11→KV11,KV21,KV22 · KV24 chưa có.

Công ty: DV01 Công ty MTĐT Đông Thạnh · DV02 HTX Môi trường An Phú · DV03 Công ty Dịch vụ Hóc Môn · DV04 HTX Xanh Nhị Bình · DV05 Công ty Môi trường Tân Tiến · DV06 Công ty Công ích Thành Phát · DV07 Công ty Xanh Sài Gòn · DV08 HTX Dịch vụ Phú Thành · DV09 Công ty Môi trường Minh Tâm · DV10 HTX Thu gom Hòa Bình · DV11 Trung tâm Cung ứng dịch vụ công xã.

## 1. Entity

### 1.1 Công ty — `MANAGEMENT_UNITS` (commune-management.js:5, commune-simple.js:29-33)
| Trường | Ví dụ | Kiểu | Ghi chú |
|---|---|---|---|
| id | DV01 | string PK | `DV${seq}` |
| name | Công ty MTĐT Đông Thạnh | string | |
| contact | Trần Hoàng Phúc | string | đầu mối |
| phone | 0900 000 001 | string | |
| status | active | enum | active "Hoạt động" / inactive "Tạm ngưng" |
| start, end | 2026-01-01 / 2026-12-31 | date | hiệu lực |

### 1.2 Khu vực / tổ dân phố — `MANAGEMENT_AREAS`
| Trường | Ví dụ | Kiểu | Ghi chú |
|---|---|---|---|
| id | KV07 | string PK | cố định, không thêm/xóa |
| name | Tổ dân phố 07 | string | |
| households | 14 | int dẫn xuất | đếm đối tượng active, tính 1 lần |
| unit | DV01 / null | FK công ty | 1 công ty phụ trách |
| start, end | 2026-09-01 | date | hiệu lực phân công hiện tại — **không lưu lịch sử** |

Địa bàn (DTH/TTT/NB) chỉ suy ra từ tiền tố mã đối tượng; không có FK khu vực → địa bàn.

### 1.3 Đối tượng (hộ + hợp đồng gộp) — `CS_SUBJECTS` (commune-simple.js:45-118)
| Trường | Ví dụ | Kiểu | Ghi chú |
|---|---|---|---|
| code | DTH-H000128 | string PK | tiền tố DTH/TTT/NB + H/KD/DN |
| name | Nguyễn Văn Minh | string | |
| type | Hộ gia đình | enum | Hộ gia đình / Hộ kinh doanh / Doanh nghiệp |
| address | 12/5 Đặng Thúc Vịnh | string | |
| phone | 0903 218 128 | string | |
| area | KV07 | FK khu vực | |
| contract | HĐ-DTH-0128 / "—" | string | hợp đồng nhúng trong đối tượng |
| contractFrom | 01/01/2026 | date | |
| tariff | HGĐ ≥ 3 người | FK nhóm giá | |
| status | active | enum | active "Đang cung cấp" / pending "Chờ xử lý" / ended "Đã chấm dứt" |
| exempt, exemptReason, note | true / Hộ nghèo | bool / string | miễn 100%, không sửa được trên UI |

### 1.4 Nhóm giá — `CS_TARIFFS` (commune-simple.js:27) — nguồn giá duy nhất khi tính
HGĐ ≤ 2 người 40.000 · HGĐ ≥ 3 người 80.000 · Chủ nguồn thải nhỏ 119.000 · Theo khối lượng 1.266.000 (đ/tháng). Không có phiên bản.

### 1.5 Phiên bản biểu giá (quản trị) — `RS_TARIFFS` (roles-simple.js:204)
code (BG-65-G2-H3), legal (QĐ 65/2026/QĐ-UBND), scope (text), collection/transport/processing (chuỗi tiền), effective (chuỗi khoảng ngày), status (Đang áp dụng/Dự thảo/Hết hiệu lực). **Chỉ hiển thị, không liên kết với 1.4.**

### 1.6 Loại phí — `CS_FEE_TYPES` (commune-simple.js:124)
env "Phí vệ sinh môi trường (CTRSH)" (giá theo nhóm giá) · bulky "Phí thu gom rác cồng kềnh" 150.000 · extra "Phụ phí dịch vụ phát sinh" 50.000.

### 1.7 Kỳ thu — `CS_PERIODS` (commune-simple.js:40)
id (2026-09 / 2026-Q4), label, open, due (hạn công ty nộp xã), legal (căn cứ), status (Đã mở / Đang thu / Đã khóa), note.

### 1.8 Phiếu yêu cầu thu — `CS_REQUESTS` (commune-simple.js:133)
id `YCT-MMYY-nn`, period FK, feeType FK, scope (**chuỗi tự do**), date, due, count, exempt, total (phi chuẩn hóa), note.

### 1.9 Khoản phải thu của hộ — `CS_CHARGES` (commune-simple.js:138-196) — nguồn duy nhất cho phải thu/đã thu
id `KT-MMYY-H000128`(-BU/-EX), request FK, feeType FK, subject FK, period FK, due, amount (0 nếu miễn; người thu có thể ghi đè số thực thu), status (unpaid Chưa thu / overdue Quá hạn / paid Đã thu / exempt Miễn giảm), paidAt, method (Tiền mặt/Chuyển khoản), note. `overdue` chỉ có trong seed, không tự chuyển.

### 1.10 Phiếu thu xã lập cho công ty — `CS_COMPANY_RECEIPTS` (commune-simple.js:293)
id `PT-CT-MMYY-nnn`, companyId FK, period FK (1 kỳ/phiếu), amount, method, date, payer, bankRef, note, status.

### 1.11 Báo sai sót phiếu thu — `RS_RECEIPT_ISSUES` (roles-simple.js:165)
map receiptId → text (loại: Sai số tiền / Sai kỳ thu / Sai chứng từ / Không phải khoản nộp của công ty). Xã **không có màn xử lý**.

### 1.12 Nhắc nộp — `CS_REMINDERS` (commune-simple.js:209)
id NN-001, companyId, date, due, periods (mảng nhãn kỳ), amount, content. Xóa hết khi công ty hết nợ quá hạn.

### 1.13 Khiếu nại — `CS_COMPLAINTS` (commune-simple.js:198, roles-simple.js:177)
id KN-2609-nnn, date, name, subject (FK mềm), phone, area FK, channel (Ứng dụng người dân / Điện thoại / Trực tiếp tại xã), content, status (new / processing / done; phía công ty có thêm "Quá hạn xử lý" dẫn xuất), result (**ghi đè, không lưu lịch sử**), forwardedTo FK công ty, deadline (hôm nay + 3), reply {by, date}.

### 1.14 Dòng hộ–kỳ phía công ty/người thu — `rsRows()` (roles-simple.js:142) — **phép chiếu của CS_CHARGES**
Thêm: status thăm hộ (appointment Đã hẹn / absent Vắng nhà), collector, confirmedBy, receipt (số biên lai `BL-MMYY-nnnn` **sinh khi render, không ổn định**). Không có entity biên lai hộ.

### 1.15 Người đi thu — `RS_COLLECTORS` (roles-simple.js:48-103)
username, name, area (**chuỗi tên tổ**, 1 người/tổ), phone.

### 1.16 Bàn giao tiền mặt người thu → công ty — `RS_HANDOVERS` (roles-simple.js:169)
id BG-MMYY-nn, collector, period, date, amount, note.

### 1.17 Thông báo web — `APP_NOTIFICATIONS` (notifications.js:7)
id, roles[], companyId, kind (reminder / complaint / receipt / info), title, body, link {role, screen, companyId, label}, time, read.

### 1.18 Quản trị
- `RS_USERS`: username, name, organization (chuỗi), roles (**1 chuỗi**), lastLogin, status (Hoạt động / Bắt buộc 2FA / Đã khóa).
- `RS_ROLES`: name, scope (Toàn xã / Đúng một công ty / Hộ công ty giao / Hệ thống), functions, perms {view, edit, approve, export}.
- `RS_DISTRICTS`: code (DTH/TTT/NB), name, groups, subjects, note.
- `RS_BACKUPS`, `APP_DATA.audit` (time, actor, role, action, object, result — không thao tác nào ghi audit).

### 1.20 App người dân (citizen-mobile.js) — toàn bộ cứng
- `CITIZEN_PROFILE`: **không khớp** CS_SUBJECTS DTH-H000128.
- `CITIZEN_BILL`: kỳ, hạn, tổng, dòng (Thu gom 45k, Vận chuyển 20k, Xử lý 12k, VAT 3k), lịch sử.
- `CITIZEN_SCHEDULE`: [thứ, khung giờ, loại rác].
- `CITIZEN_COMPLAINTS`: id PA-…, csId FK → CS_COMPLAINTS, type (5 loại), summary, date, status, detail, timeline[].
- `CITIZEN_MARKET`: id CDC-…, title, tag (Cho tặng / Trao đổi), owner, time, description, comments[].
- `CITIZEN_BULKY`: id CK-…, item, date, fee (text), status. Form: loại vật dụng (4), số lượng, địa chỉ, ngày mong muốn, ảnh.
- `CITIZEN_NOTIFICATIONS`: group (complaint / transaction), title, text, time, unread.
- Chỉ **khiếu nại** liên thông với dữ liệu xã; thanh toán, biên lai, rác cồng kềnh, chợ đồ cũ, lịch thu gom là dữ liệu rời.

## 2. Quy tắc nghiệp vụ đã cài

| # | Quy tắc | Vị trí | Công thức |
|---|---|---|---|
| R1 | Số tiền khoản | commune-simple.js:239 | env: giá nhóm × (quý ? 3 : 1); phí khác: giá nhập ?? giá mặc định; miễn → 0 |
| R2 | Đối tượng được lập khoản | :930-944 | active, có hợp đồng, thuộc khu vực đã có công ty; bỏ qua nếu đã có khoản cùng loại phí trùng kỳ (tháng nằm trong quý và ngược lại) |
| R3 | Phạm vi phiếu YCT | :932 | toàn xã / các tổ chọn / các tổ của 1 công ty |
| R5 | Tiến độ khu vực | :244 | phải thu = Σ amount; đã thu = Σ amount paid |
| R6 | Phải thu công ty | :262 | Σ phải thu các tổ đang giao — **dùng phân công hiện tại cho cả kỳ cũ** |
| R7 | Đã nộp về xã | :264 | Σ phiếu thu công ty theo kỳ |
| R8 | Công ty báo đã thu | :278 | Σ khoản paid trong tổ của công ty |
| R9–R11 | Nợ theo kỳ, nợ kỳ trước | :269-290 | còn nộp = phải thu − đã nộp; quá hạn khi hạn kỳ < hôm nay |
| R13 | Báo cáo tiến độ | :518-590 | trạng thái: Chưa có công ty / Đã nộp đủ / Quá hạn nộp / Nộp một phần / Chưa nộp; < 45% cảnh báo |
| R14 | Đối soát | :593-628 | chênh lệch = đã nộp − đã thu; Lệch / Đang nộp / Khớp |
| R15 | Lập phiếu thu | :1090-1112 | 0 < số tiền ≤ còn nộp của kỳ; 1 phiếu 1 kỳ; được nộp nhiều lần |
| R16 | Nhắc nộp | :507-515 | chỉ công ty có nợ quá hạn; hạn mặc định +5 ngày |
| R17 | Phân công khu vực | :1131-1156 | ghi đè, không lịch sử; bỏ phân công bắt buộc chọn công ty thay |
| R18–R19 | Kỳ thu | roles-simple.js:434-460, :715-733 | tạo 6 tháng/4 quý kế tiếp; Đã mở → Đang thu → Đã khóa; **chặn khóa khi còn công ty nợ** |
| R20 | Ghi nhận đã thu | roles-simple.js:162, :626-678 | ghi status paid, amount, method, paidAt; vắng/hẹn/từ chối chỉ đổi dòng hiển thị |
| R21–R22 | Tiền mặt người thu giữ | :174, :267 | Σ tiền mặt đã thu − Σ bàn giao; bàn giao ≤ đang giữ |
| R24–R27 | Khiếu nại | commune-simple.js:1169-1186, roles-simple.js:653, citizen-mobile.js:221-392 | tạo → new; xã: processing/done, chuyển công ty (hạn +3 ngày); công ty phản hồi; đồng bộ trạng thái về app dân |
| R28 | Báo sai sót phiếu thu | roles-simple.js:645 | lưu text + thông báo xã |
| R29–R30 | In phiếu thu | commune-simple.js:318-337, :753 | đọc số tiền bằng chữ; lũy kế đã nộp đến phiếu |

Thông báo phát sinh: reminder → công ty; complaint → xã + công ty; receipt → công ty (xã lập phiếu thu) / xã (báo sai sót); info → xã + công ty (người thu báo hộ chuyển đi / sai thông tin).

## 3. Màn hình theo vai trò

- **Cán bộ xã:** subjects · charges (khoản thu / phiếu YCT / phiếu thu) · areas · companies + company-detail · progress · reconciliation · complaints.
- **Công ty:** assigned (vòng tiến độ, bảng người thu, danh sách hộ, phiếu thu xã, nhận tiền mặt) · complaints.
- **Người đi thu (mobile web):** list (cập nhật kết quả: tiền mặt / chuyển khoản / vắng / hẹn / từ chối; lịch sử; báo sai thông tin) · cash · account · receipt.
- **Quản trị:** accounts (người dùng, vai trò) · config (địa bàn, công ty, biểu giá, kỳ thu: mở / bắt đầu thu / khóa) · logs (audit, sao lưu).
- **Chung:** trung tâm thông báo.
- **App người dân:** home · payment · paymentReceipt · receipts · schedule · complaints / complaintNew / complaintDetail · market / marketDetail / marketNew · bulkyNew / bulkyStatus · notifications · account · household · settings.
