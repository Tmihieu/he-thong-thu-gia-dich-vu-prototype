# Checklist diễn tập T50 (SPEC §10)

Dùng khi chạy tay kịch bản §10. Cách chạy và điều kiện seed: `docs/demo-runbook.md`. Tài khoản: `docs/demo-accounts.md` (web mật khẩu `Demo@2026`, app OTP `123456`).

- Chạy **2 lần liên tiếp từ CSDL sạch**: mỗi lần `docker compose down -v`, build lại lần lượt, `docker compose up`, rồi `cd mobile && npx expo start`.
- Tick cột Lần 1 / Lần 2 khi thấy đúng cột "Phải thấy". Sai thì ghi vào `tasks/demo-issues.md` (mẫu cuối file), không sửa giữa chừng.
- Mỗi vai trò web mở một cửa sổ ẩn danh riêng. Mở F12 (Console) ở mọi cửa sổ từ đầu.

**Mặc định đang dùng** (phiên -fe đề xuất, người dùng cho "dùng mặc định" 28/09/2026; muốn khác thì báo trước khi chạy):
- Mở kỳ là Đang thu luôn, **không có** nút "Bắt đầu thu" (data dictionary §5.0 P1).
- Bước 2 phân công KV24 cho **DV01**.
- Bước 5: nhắc nộp → lập phiếu thu **hết số còn nợ kỳ 09 (khoảng 75.000)** → lập phiếu **một phần kỳ 10**.

**Không phải lỗi:** Phí rác cồng kềnh không sinh khoản thu (O5). Không có chữ "biên lai" trong app (O1).

## Web

| # | Ai | Làm | Phải thấy | Lần 1 | Lần 2 |
|---|---|---|---|---|---|
| 1 | `admin` | Cấu hình → Kỳ thu → **Mở kỳ** tháng 10/2026, hạn công ty nộp xã sau ngày demo (vd. 31/10/2026) | Dòng "Tháng 10/2026" trạng thái **Đang thu**, biểu giá `BG-65-2026`; không có nút "Bắt đầu thu" | ☐ | ☐ |
| 2a | `canbo_xa` | Khu vực → KV24 → **Phân công** → DV01 | KV24 hiện DV01 | ☐ | ☐ |
| 2b | `canbo_xa` | Khoản thu → Phiếu YCT: kỳ 10/2026, phí vệ sinh môi trường, toàn xã, hạn hộ đóng ≤ hạn kỳ → **Xem trước** → **Phát hành** | Xem trước không còn cảnh báo "chưa có công ty phụ trách"; phát hành ra mã `YCT-1026-01`; tab Khoản thu có khoản `KT-1026-…` | ☐ | ☐ |
| 3a | `dv01` | Khu vực được giao → Phân tổ → phân **KV24** cho `thu07` | Trước: `thu07` ↔ KV07, `thu09` ↔ KV09, KV24 chưa có người. Sau: KV24 ↔ `thu07` | ☐ | ☐ |
| 3b | `thu07` (điện thoại, `http://<IP LAN>:5173`) | Danh sách thu (kỳ 10/2026): ghi **2 hộ tiền mặt**, **1 hộ vắng** | 2 hộ thành Đã thu, 1 hộ có lượt vắng; Tiền mặt đang giữ = tổng 2 hộ | ☐ | ☐ |
| 3c | `dv01` | Khu vực được giao → Tổng quan → **Nhận tiền mặt** của `thu07` | `thu07` → Tiền mặt: đang giữ về **0** | ☐ | ☐ |
| 3d | `thu07` | Chọn kỳ **09/2026** → hộ `DTH-H000122` → Lịch sử; một hộ → **Báo sai thông tin** | Lịch sử: vắng 08/09, thu 10/09. `canbo_xa` và `dv01` có thông báo ở chuông | ☐ | ☐ |
| 5a | `canbo_xa` | Tiến độ thu (kỳ 10/2026) → dòng DV01 → **Nhắc nộp** → gửi | Trước khi nhắc: DV01 **Quá hạn nộp**, "Nợ kỳ trước" khoảng 75.000. `dv01` có "Nhắc nộp tiền Tháng 09/2026" ở chuông | ☐ | ☐ |
| 5b | `canbo_xa` | Khoản thu → Phiếu thu công ty → kỳ **09/2026** → **Lập phiếu** DV01, đúng số còn phải nộp (khoảng **75.000**) | Tự mở bản in, số tiền bằng chữ đúng; kỳ 09 DV01 Đã nộp đủ | ☐ | ☐ |
| 5c | `canbo_xa` | Kỳ **10/2026** → **Lập phiếu** DV01, số nhỏ hơn "còn phải nộp" | Tiến độ thu: **Nộp một phần**; Đối soát: **Đang nộp**; 3 màn (Tiến độ, Đối soát, màn DV01) cùng số | ☐ | ☐ |
| 5d | `dv01` → `canbo_xa` | Phiếu thu xã lập → **Báo sai sót** một phiếu; xã → Khoản thu → Sai sót phiếu thu → xử lý kèm ghi chú | Phiếu hiện "Đã báo sai sót · chờ xã kiểm tra" rồi Đã xử lý; `dv01` có thông báo | ☐ | ☐ |
| 8 | `canbo_xa` | Đối soát → **Khóa kỳ** 10/2026 | **Bị chặn**, lý do nêu công ty còn nợ và số tiền (không phải "chỉ khóa được kỳ đang thu") | ☐ | ☐ |
| + | `admin` | Nhật ký: lọc người `canbo_xa`, hành động "Lập phiếu thu cho công ty" | Có dòng phiếu vừa lập, mở ra thấy trước/sau | ☐ | ☐ |

## App người dân (Expo Go, `0902000128`)

| # | Làm | Phải thấy | Lần 1 | Lần 2 |
|---|---|---|---|---|
| 4a | Đăng nhập SĐT `0902000128` → **Nhận mã OTP** → `123456` | Trang chủ "Xin chào", có ô Khoản phí, Việc của bạn | ☐ | ☐ |
| 4b | Khoản phí phải đóng → khoản kỳ 10/2026 → Thanh toán (mô phỏng) → chọn một phương thức → xác nhận | Màn Xác nhận thanh toán có mã xác nhận; không có khoản kỳ 09 (đã đóng trong seed) | ☐ | ☐ |
| 4c | Web `dv01` → Hộ được giao | `DTH-H000128` **Đã thu**; app tab Thông báo có "Thanh toán thành công" | ☐ | ☐ |
| 6a | Gửi phản ánh kiến nghị → chọn loại, mô tả → **Gửi phản ánh** | Phản ánh hiện ở Việc của bạn; `canbo_xa` có thông báo "Phản ánh mới từ app…" | ☐ | ☐ |
| 6b | Web: `canbo_xa` Khiếu nại → **Chuyển công ty xử lý** DV01; `dv01` → **Phản hồi về xã**; `canbo_xa` → **Đóng khiếu nại** | Mỗi bước có thông báo cho bên kia | ☐ | ☐ |
| 6c | App → phản ánh vừa gửi (chờ ≤ 30 giây) | Tiến trình xử lý đủ các mốc; tab Thông báo có 3 thông báo (chuyển công ty, công ty phản hồi, xã đóng) | ☐ | ☐ |
| 7a | Đăng ký rác cồng kềnh → loại, số lượng, ngày mong muốn, **chọn 1–2 ảnh** → **Gửi đăng ký** | Yêu cầu `CK-<tháng năm hôm nay>-…` Chờ xác nhận, ảnh hiện trong chi tiết; `dv01` có thông báo | ☐ | ☐ |
| 7b | Web `dv01` → Rác cồng kềnh → yêu cầu mới (thấy ảnh, bấm xem lớn) → **Báo phí** | App (≤ 30 giây): **Phí và lịch hẹn** hiện phí công ty báo; có thông báo | ☐ | ☐ |
| 7c | Tab Chợ đồ cũ → **Đăng bài** (ảnh tùy chọn) | Bài mới đầu danh sách, hiện "tên · tổ", không lộ SĐT | ☐ | ☐ |
| 7d | Máy thứ hai đăng nhập `0902000161` → bài vừa đăng → bình luận → **Gửi**; để nguyên màn chi tiết | Bình luận hiện dưới bài | ☐ | ☐ |
| 7e | Quay lại `0902000128` → bài của mình → **Đóng bài** → xác nhận | Bài biến khỏi danh sách mặc định, không có nút mở lại; máy `0902000161` (≤ 30 giây) ô bình luận ẩn, hiện câu bài đã đóng | ☐ | ☐ |
| 9 | Suốt kịch bản | Console web (F12) và log `npx expo start` không có lỗi đỏ | ☐ | ☐ |

## Ghi lỗi (`tasks/demo-issues.md`)

```
| Lần | Bước | Chặn? | Thấy gì | Mong đợi | Ảnh/console |
|---|---|---|---|---|---|
| 1 | 5c | Chặn | Đối soát vẫn "Lệch" | "Đang nộp" | F12: … |
```

"Chặn" = không đi tiếp được bước sau hoặc sai số tiền. Xong 2 lần: người dùng xác nhận danh sách lỗi không chặn còn lại (tiêu chí T50).
