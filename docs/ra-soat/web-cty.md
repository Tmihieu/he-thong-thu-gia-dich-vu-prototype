# Web công ty / người đi thu / đối soát / khiếu nại — rà soát 04/10/2026

## Đã rà
- [x] Tiến độ thu (`ProgressPage`) — số tiền, nhắc nộp, chỉ đọc với Lãnh đạo
- [x] Đối soát (`ReconciliationPage`, `PeriodTrend`, khóa kỳ)
- [x] Phiếu thu xã lập + lập phiếu + in; Sai sót phiếu thu (xã và công ty)
- [x] Màn Công ty: Tổng quan, Hộ được giao, Nhận tiền mặt, Phân tổ
- [x] Người đi thu: Danh sách thu, Tiền mặt, Tài khoản, báo sai thông tin, lịch sử hộ
- [x] Khiếu nại (xã + công ty), Thông báo (chuông + trung tâm), Chợ đồ cũ, Đồ cồng kềnh
- Chưa xem được màn thật: backend 8080 chưa chạy lúc rà, nên kiểm bằng đọc code + vitest (không có ảnh chụp).

## Sạn đã sửa
| # | Màn / file | Sạn | Rule | Commit |
|---|---|---|---|---|
| 1 | Tiến độ, Đối soát, Phiếu thu, Màn công ty | Chỉ hiện "phải thu"/"còn phải nộp"; thiếu công ty cầm lại, phải nộp xã, điều chỉnh kỳ trước, đã hoàn (số backend đã trả). Thêm `LedgerBreakdown` dùng chung, không tính lại ở frontend | BR-REM-02/03/12, BR-LD-07 | ed6150a |
| 2 | Tiến độ | Mất ô "Phải nộp xã", "Công ty cầm lại" ở thẻ tổng | BR-REM-03 | ed6150a |
| 3 | Danh sách thu (người đi thu) | Còn nút lọc "Đã hẹn", "Vắng nhà" dù giao diện đã ẩn vắng/hẹn | BR-COL-04 | 873b0cf |
| 4 | Danh sách thu | "Chưa thu" = tổng − đã thu, lẫn khoản Miễn giảm / Đã xóa nợ | BR-COL-09, BR-BIL-10 | 873b0cf |
| 5 | Danh sách thu + Hộ được giao | Kỳ đã khóa vẫn cho bấm ghi thu | BR-COL-12 | 873b0cf |
| 6 | Ghi thu (`ResultSheet`) | Sau khi ghi không làm mới sổ công ty–kỳ → Tiến độ/Đối soát/Màn công ty lệch số đến khi tải lại | BR-REM-12 | 873b0cf |
| 7 | Lịch sử hộ | Dòng hoàn tiền hiện "Đã thu −x" | BR-LD-05 | 873b0cf |
| 8 | Màn công ty | Màu vòng tiến độ đặt cứng → token Ant Design | — | ed6150a |
| 9 | Thông báo | Link `company.households` trỏ tab không còn (`households`) → `overview` | BR-NTF-02 | b9eb47b |
| 10 | Thông báo | Lỗi đánh dấu đã đọc không hiện; nền chưa đọc màu cứng | BR-GEN-05 | b9eb47b |
| 11 | Đối soát | Thiếu vòng tỷ lệ thu; thêm `RateRings` theo ngưỡng 25/50/75 | BR-REM-11 | 62d2119 |
| 12 | Khiếu nại | Chi tiết chưa có thanh bước Mới → Đang xử lý → Đã giải quyết; đang tải dùng Spin | BR-CMP-01 | 62d2119 |
| 13 | Công ty / người đi thu | Nhãn "Cập nhật" mơ hồ → "Ghi thu", "Xác nhận đã thu" | BR-GEN-07 | a96037d |

## Làm đẹp (người đi thu, người lớn tuổi)
Chữ to (tên hộ 22px, số tiền 32px), "Tiền mặt đang giữ" luôn hiện trên đầu, 2 nút lớn **Đã thu tiền mặt / Đã thu chuyển khoản** ngay trên thẻ hộ → mở bước xác nhận số tiền (chống bấm nhầm), ô lọc ≥ 44px, danh sách tải dùng skeleton. CSS ở `features/collection/collector.css` (dùng biến màu sẵn của `shell.css`). Commit bdebde4.

## Đợt 2
- QĐ-L6: đồ cồng kềnh PENDING hiện "Chờ công ty báo phí" (citizen/api.ts).
- Nhãn 2 loại khiếu nại mới FACILITY / COLLECTION_REQUEST (BR-CMP-05), khai báo trong union nên không vỡ type trước khi gen lại schema.
- PeriodTrend bỏ màu cứng, dùng token Ant Design.
- Phiếu thu (xã) và Phiếu thu xã lập (công ty): thêm hàng thẻ tổng `LedgerStats` (phải thu / cầm lại / phải nộp xã / đã nộp / còn phải nộp).
- Thông báo: biểu tượng theo loại + chấm chưa đọc.
- **Chưa xem màn thật**: tiện ích Chrome không kết nối được nên không đăng nhập xem màn, không chạy được design-critique / high-end-visual-design trên màn thật. Đợt 2 chỉ kiểm bằng tsc, eslint, vitest.

## Đợt 3 — áp hệ thiết kế chung
PageHeader cho các màn cấp trang (Tiến độ, Đối soát, Khu vực được giao, Khiếu nại xã + công ty, Rác cồng kềnh, Thông báo, Chợ cộng đồng); StatCard/StatGrid thay thẻ số tự chế (`LedgerStats` dùng chung Tiến độ, Phiếu thu, màn Công ty; thẻ đếm khiếu nại, đồ cồng kềnh, tiền mặt người đi thu); LoadingBlock/EmptyBlock/ErrorBlock thay Spin/Empty/Alert lỗi rời; StatusTag + tone thống nhất (`remittance/tones.ts`, `COMPLAINT_STATUS_TONES`, `BULKY_STATUS_TONES`, `NOTIFICATION_KIND_TONES`, `workState().tone`); lỗi API qua `shared/errorText`. `collector.css` chỉ còn phần riêng (tiền đang giữ, 2 nút thu). Các tab con (Phiếu thu, Sai sót phiếu thu, Phân tổ, Hộ được giao) nằm trong hub nên không có PageHeader riêng. Alert lỗi trong modal/form giữ nguyên (lỗi gửi form).

## Sạn chưa sửa
- Màn Công ty đếm "Số hộ đã thu x/y" tính cả hộ Miễn giảm/Đã xóa nợ ở mẫu số — cần backend cho số đếm riêng, nên để nguyên.
- `PeriodTrend` còn vài màu cứng (`#eef1f4`, `#fff`); đổi sang token khi lane Web xã đưa token chung.
- `StreetSearch.tsx` (masterdata) có 1 lỗi eslint `set-state-in-effect` — thuộc lane Web xã.
- Chưa dùng được `design-critique` trên màn thật vì không có backend để dựng dữ liệu.

## Câu hỏi nghiệp vụ
| # | Tình huống | Code đang làm gì | Tài liệu nói gì | Đề xuất |
|---|---|---|---|---|
| 1 | Tiến độ: "Tỷ lệ nộp" công ty | Hiện `remittedRate` + cờ `lowRemittedRate` của backend | QĐ-L2: so đã nộp / phải nộp xã | Backend đổi mẫu số sang `payable` (xem yêu cầu 1) |

## Yêu cầu sang lane khác
| # | Gửi lane | Cần gì | Vì sao | Trạng thái |
|---|---|---|---|---|
| 1 | Backend | `LedgerRowDto.remittedRate`/`lowRemittedRate` tính theo `payable` (payable = 0 → không cờ); sửa mô tả schema `remaining` ("phải thu − điều chỉnh − đã nộp" → "phải nộp xã − đã nộp") và `retained` ("theo tỷ lệ cấu hình" đã bỏ) | QĐ-L2, BR-REM-03 | Chờ |
| 2 | Backend | Số hộ đã thu / cần thu loại trừ Miễn giảm, Đã xóa nợ (hoặc trả `payableCount`) | Sạn chưa sửa #1 | Chờ |
| 3 | Web xã | Token/component chung cho thẻ số liệu, thanh tỷ lệ; `shell.css` phần `.clm-*` (kích thước chữ người đi thu đang override ở `collection/collector.css`, gộp về shell khi tiện) | Tránh trùng | Chờ |
