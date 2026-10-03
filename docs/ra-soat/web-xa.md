# Web xã / quản trị / lãnh đạo + khung chung — rà soát 04/10/2026

Nhánh `ra-soat/web-xa`. Không xem được màn thật (tiện ích Chrome không kết nối); rà trên code, đối chiếu `docs/business-rules.md` và backend, kiểm bằng test.

## Component/token dùng chung cho lane Web công ty

| Thứ | Ở đâu | Dùng khi |
|---|---|---|
| `brand`, `semantic` (success/warning/danger/info/neutral, mỗi màu `fg` + `bg` đạt AA), `space`, `type` | `app/theme.ts` | Mọi chỗ cần màu / khoảng cách / cỡ chữ trong TSX. Không đặt hex cứng |
| Biến CSS `--success-fg`, `--danger-bg`…, `--space-1..5`, `--radius`, `--shadow-card` | `app/layout/shell.css` | Viết CSS riêng của màn |
| `PageHeader` (title, description, extra) | `shared/PageHeader.tsx` | Tiêu đề trang (h1) thay `Typography.Title level={3}` |
| `StatCard`, `StatGrid` (tone theo semantic) | `shared/StatCard.tsx` | Thẻ số liệu đầu trang |
| `LoadingBlock`, `EmptyBlock`, `ErrorBlock` (có nút Thử lại) | `shared/StateBlock.tsx` | Đang tải / trống / lỗi cả khối |
| `StatusTag` (tone) | `shared/StatusTag.tsx` | Nhãn trạng thái theo màu ngữ nghĩa |
| `errorText(err, fallback?)` | `shared/errorText.ts` | Hiện đúng `message` backend (BR-GEN-05), thay các `errorMessage` tự viết |
| `formatPercent` | `shared/format.ts` | Tỷ lệ % kiểu Việt Nam |
| Lớp `.page-header`, `.stat-card`, `.state-block`, `.skip-link`; lớp `.clm-*` đã nâng cỡ chữ gốc | `shell.css` | Lane công ty có thể bỏ override cỡ chữ trong `collector.css` |

Quy ước: chữ thân 15px, ô nhập / nút cao 40px, tiêu đề bảng 13px không viết hoa, viền focus 3px, tôn trọng `prefers-reduced-motion`. Danh sách ảo của antd Select render ít dòng hơn khi ô cao 40px trong jsdom; Select ít lựa chọn nên đặt `virtual={false}` để test chọn được.

## Đã rà
- [x] Khung chung: theme, layout, menu, đăng nhập, trang 403/404
- [x] /commune/subjects (+ form hồ sơ), /commune/areas, /commune/companies, /commune/charges (khoản, phiếu YCT, lập phiếu)
- [x] /admin/config (kỳ thu, biểu giá, công ty, địa bàn), /admin/accounts (+ vai trò), /admin/logs, /admin/data
- [x] /leader/dashboard, /leader/approvals, /leader/report

## Sạn đã sửa
| # | Màn / file | Sạn | Rule | Commit |
|---|---|---|---|---|
| 1 | Khung chung | Chữ nhỏ (13px), ô nhập thấp, màu phụ nhạt, không viền focus, thiếu link bỏ qua menu, đăng nhập một thẻ trơn | BR-GEN-07, a11y | 02d4111, cba9585 |
| 2 | Khoản thu → bảng khoản | Thiếu cột Nhóm giá (test đỏ) | — | 5ca6c3d |
| 3 | Khoản thu → test phiếu YCT | Test không mở ngăn kéo "Lập phiếu YCT" (test đỏ) | — | 5ca6c3d |
| 4 | Công ty | Chỉ quản trị thấy nút Thêm công ty; cán bộ xã cũng phải thêm được (QĐ-L1) | BR-MD-03 | c8d59a6 |
| 5 | Cấu hình → địa bàn / khu vực | Hai form cùng id `name` làm nhãn trỏ nhầm ô (test đỏ, lỗi a11y thật) | — | c09af90 |
| 6 | Khu vực (test) | Test đòi nút Đổi công ty đã bỏ theo quyết định 29/09 | BR-MD-01 | 8e9d779 |
| 7 | Hồ sơ hộ | Bảng có hai cột "Địa chỉ"; lịch sử nhân khẩu dùng `toLocaleDateString`; Miễn 100% hiện "· " cụt khi không có lý do | BR-GEN-02 | 6ffe666 |
| 8 | Khu vực | Danh sách công ty trong popup phân công gồm cả công ty Ngừng hợp tác (backend sẽ 422) | BR-MD-04 | 6ffe666 |
| 9 | Khu vực, Biểu giá, Cấu hình địa bàn | Lỗi mạng hiện "Chưa từng phân công / Chưa có biểu giá"; lỗi tải báo "không thể lưu" | BR-GEN-05 | 6ffe666 |
| 10 | Công ty → tiến độ nộp | Đang tải / lỗi hiện "chưa có khoản phải thu"; đổi tên công ty không làm mới màn Khu vực | BR-REM-12 | 6ffe666 |
| 11 | Tài khoản | Sửa chính mình vẫn đổi được vai trò; không hiện tên đăng nhập; câu khóa tài khoản sai (token cũ còn hạn); ma trận vai trò thiếu phạm vi / quyền của Lãnh đạo (bấm Lưu làm mất quyền) | BR-PLT-04, 06, 07 | b9df15d |
| 12 | Nhật ký | Thiếu nhãn 4 hành động biểu giá, hiện mã tiếng Anh | BR-GEN-07 | b9df15d |
| 13 | Phiếu YCT | "Sửa lại" ở bước xem trước xóa hết đã nhập; lỗi tải kỳ / loại phí hiện form rỗng; ngày, tiền tự format | BR-GEN-01, 02 | ee089c8 |
| 14 | Dashboard lãnh đạo | Cờ dưới 45% theo tỷ lệ nộp nhưng thanh và danh sách in tỷ lệ thu; KPI hiện 0 khi đang tải / lỗi; bỏ qua lỗi đề nghị chờ duyệt; không Thử lại | BR-REM-10, BR-LD-02 | da153c6 |
| 15 | Báo cáo lãnh đạo | Đổi kỳ không xóa lọc công ty / tổ; Tiến độ / Đối soát không màu như Dashboard; CSV tải không ổn định; % tự format | BR-LD-08 | da153c6 |
| 16 | Chờ duyệt (chú thích) | Còn chữ "hợp đồng" trong chú thích code | BR-GEN-08 | da153c6 |
| 17 | StreetSearch | Lỗi eslint `set-state-in-effect` (đã có từ trước) | — | b4cd899 |
| 18 | Kỳ thu → mở kỳ | Ô chọn tháng ảo hóa làm test không chọn được tháng 10 sau khi tăng cỡ ô | — | b4cd899 |

Tổng: 18 mục. Test đỏ của lane đã xanh: ChargesHubPage 3, AreasPage 1, CompaniesPage 1, LocationsSettings 1.

## Sạn chưa sửa (kèm lý do)
- Nhật ký: ô Trước/Sau in JSON thô (khóa và giá trị tiếng Anh). Cần bảng nhãn khóa, tốn công, ưu tiên thấp.
- Phiếu YCT: nhánh "Không có khoản mới" chưa liệt kê hộ bị bỏ qua và lý do.
- Quản trị dữ liệu: iframe Jmix chưa có trạng thái tải / lỗi.
- Nhiều màn còn `errorMessage` tự viết (AccountsPage, ApprovalsPage, CreateApprovalModal); nên chuyển sang `errorText` dần.
- ConfigPage không nhớ tab qua URL (`useTabParam` có sẵn).
- Nút ☰ luôn `aria-label="Mở menu"`; cột Công ty ở bảng khoản chỉ hiện mã.
- Mới áp `PageHeader` cho mọi màn của lane; `StatCard` / `StatusTag` mới có trong shared, chưa thay hết `Tag` màu antd và thẻ KPI có vòng tròn của dashboard.
- Không xem được màn thật nên chưa chỉnh khoảng cách theo mắt; cần một lượt nhìn bằng trình duyệt.

## Câu hỏi nghiệp vụ
| # | Tình huống | Code đang làm gì | Tài liệu nói gì | Đề xuất |
|---|---|---|---|---|
| 1 | Sửa biểu giá đã ban hành | UI và backend `updateDraft` vẫn cho sửa đơn giá của bản ACTIVE / EXPIRED; nhật ký có nhãn "Sửa biểu giá đã ban hành" | BR-MD-11: bản đã ban hành không sửa | Chốt rule theo thực tế (cho sửa có ghi nhật ký) hoặc khóa nút Sửa + backend trả `TARIFF_NOT_DRAFT` |
| 2 | "Còn phải nộp" khi công ty nộp dư | Dashboard cộng `max(remaining, 0)`; Báo cáo "Tổng toàn xã" cộng thẳng | BR-REM-12: các màn khớp số | Dùng chung một cách (đề xuất: không kẹp 0, hiện số âm là "nộp dư") |
| 3 | Vòng tỷ lệ ở Dashboard | Màu cố định xanh lá / xanh dương | BR-REM-11 chỉ nói màn Đối soát | Áp dải 4 màu của Đối soát cho Dashboard |
| 4 | Hạn mức đề nghị hoàn | Form giới hạn theo `charge.amount` | BR-LD-05: ≤ đã thu − đã hoàn | Nếu `Charge` trả `refunded`, chặn theo `amount − refunded` |
| 5 | Cảnh báo ở xem trước phiếu YCT | Chỉ `AREA_WITHOUT_COMPANY` có `warning=true` | BR-BIL-06: cả 3 loại bỏ qua "kèm cảnh báo" | Cảnh báo cả 3 loại, Alert viết chung |
| 6 | Hộ nhóm theo ký chưa có định mức | Một hộ thiếu định mức làm hỏng cả lần xem trước (`QUOTA_KG_REQUIRED`) | BR-BIL-03 chỉ nói không lập được | Bỏ qua riêng hộ đó, nêu mã hộ trong cảnh báo |

## Yêu cầu sang lane khác
| # | Gửi lane | Cần gì | Vì sao | Trạng thái |
|---|---|---|---|---|
| 1 | Backend | `ChargeEligibility.java:70` đổi "Không có hợp đồng hiệu lực…" thành "Hộ chưa có đăng ký thu phí hiệu lực vào ngày …"; `ChargeCalculator.java:44` "Hợp đồng nhóm tính theo ký…" thành "Đăng ký thu phí nhóm theo ký chưa có định mức kg/tháng" | Message hiện thẳng ở cột Lý do màn xem trước phiếu YCT (BR-GEN-08) | Chờ |
| 2 | Backend | Nhật ký ghi `CREATE_STREET` (và mã mới nếu có): báo tên entity để thêm nhãn | Màn Nhật ký hiện nguyên mã | Chờ |
| 3 | Backend | Nếu chốt câu hỏi 4: thêm `refunded` vào `ChargeDto` | Chặn hạn mức hoàn ở form | Chờ quyết định |
| 4 | Web công ty | Dùng `PageHeader` / `StatCard` / `StateBlock` / `errorText`; bỏ override cỡ chữ `.clm-*`; Select ít lựa chọn thêm `virtual={false}` | Đồng bộ giao diện, test ổn định | Đã báo leader |
| 5 | Web công ty | Nhãn hai loại khiếu nại mới (BR-CMP-05) nằm ở thư mục khiếu nại; thư mục lane này không có chỗ dùng | — | Chờ |
