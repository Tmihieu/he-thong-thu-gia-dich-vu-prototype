# Làm lại trang Đối soát theo mockup (07/10)

> **Đã thay 07/10:** quyết định "giữ nhiều phiếu thu và nhiều phiếu chi trong một kỳ" bên dưới không còn hiệu lực, thay bằng một phiếu quyết toán mỗi công ty mỗi kỳ: xem `docs/quyet-toan-0710.md`.

Nguồn: `docs/doi-soat/SPEC.md` + `mockup.html` (gói bàn giao, đã chép vào repo). Trang: `web/src/features/remittance/ReconciliationPage/`. Màu và style dùng lại của web hiện tại (Ant Design, `StatCard`, `StatusTag`, `MoneyText`), không chép CSS của mockup.

## Trạng thái: đã làm 07/10 (backend + web), IT liên quan đã xanh (PeriodLock, Ledger, CommunePayout, CompanyReceipt), chưa push

Quyết định của người dùng 07/10 (thay cho mục 3 cũ):
- **Giữ nhiều phiếu thu và nhiều phiếu chi trong một kỳ** (không đổi sang 1 phiếu mỗi công ty). Cán bộ xã lập phiếu; số tiền là số chênh lệch còn lại.
- Cột Phiếu: chưa khớp thì nút Lập phiếu thu / chi (mở form hiện có); đã khớp chỉ có nút **Xem phiếu** (popup liệt kê + In), không có chi tiết phiếu bên dưới bảng.
- **Chặn khóa kỳ khi còn QR chưa xác định** (`PERIOD_UNIDENTIFIED_QR`). Seed demo hiện có 5 giao dịch chưa khớp (300.000 đ) nên kỳ chưa khóa được tới khi xử lý ở menu Chuyển khoản chờ đối chiếu.
- Tỷ lệ vận chuyển / thu gom không khác nhau giữa công ty (lấy theo biểu giá của kỳ, như phí thu gom hiện có).
- Còn lại theo mockup: bỏ cảnh báo nợ kỳ trước, biểu đồ 3 tháng, cột Điều chỉnh ở trang này (PreviousDebtAlert vẫn dùng ở Tiến độ thu; `PeriodTrend` đã xóa).

## Đã làm

- Backend: `LedgerRow` thêm `qrCollection`; suy ra `qrTotal`, `qrTransport`, `cashTransport`, `cashCollection`, `holding`, `entitled`, `settled`. `cashTransport = payable + qrCollection` nên đã trừ điều chỉnh kỳ trước. `GET /api/remittance/unidentified-qr`. Khóa kỳ chặn khi còn QR chưa khớp.
- Web: viết lại `ReconciliationPage` (khối xã đang giữ, dải QR chưa xác định, bảng nhóm cột, tab lọc, lập phiếu thu / chi, Xem phiếu), thêm `VouchersModal`. Dùng màu `semantic` của theme, không chép CSS mockup.
- Kiểm: unit `CompanyLedgerServiceTest` (ca Cty A, Cty B của SPEC mục 8), `PeriodLockServiceTest`; web tsc, lint, 166 test; số liệu thật 33 dòng seed đều thỏa `holding − entitled` = số còn phải trả / thu.

## Còn lại

- Chạy `mvnw verify` đầy đủ (mới chạy 5 IT liên quan).
- Quy tắc R7 (khóa số sau khi lập phiếu, snapshot) chưa làm: số dòng đã khớp vẫn tính lại theo dữ liệu hiện có.
- Trường hợp thu trùng QR + tiền mặt chưa có xử lý riêng.
- Cập nhật `docs/use-cases.md` (UC-38, UC-39) và `business-rules.md` cho chặn khóa kỳ.
