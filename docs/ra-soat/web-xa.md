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
- Ô Trước/Sau ở Nhật ký: trường lạ không có trong bảng nhãn hiện "Thông tin khác" (bảng `AUDIT_FIELD_LABELS` bổ sung dần khi backend ghi trường mới).
- Tab ở Cấu hình chưa nhớ qua URL (`useTabParam` có sẵn).
- Mới chụp và soát lại các màn Hồ sơ hộ, Khoản thu, Khu vực, Công ty, Tài khoản, Nhật ký, Dashboard, Chờ duyệt; chưa chụp form hồ sơ hộ, form lập phiếu YCT, form biểu giá và Báo cáo sau đợt này.

## Câu hỏi nghiệp vụ
Đã chốt ở `docs/ra-soat/quyet-dinh-leader.md`: QĐ-L7 (biểu giá đã ban hành không sửa đơn giá), QĐ-L12 (còn phải nộp không kẹp 0, âm hiện "Nộp thừa X đ"), QĐ-L13 (vòng tỷ lệ Dashboard theo dải BR-REM-11), QĐ-L14 (xem trước phiếu YCT liệt kê mọi nhóm bị bỏ qua), QĐ-L16 (tỷ lệ tối đa 100%). Còn chờ: hạn mức đề nghị hoàn theo đã thu − đã hoàn khi `ChargeDto` có `refunded`.

## Yêu cầu sang lane khác
| # | Gửi lane | Cần gì | Vì sao | Trạng thái |
|---|---|---|---|---|
| 1 | Backend | `ChargeEligibility.java:70` đổi "Không có hợp đồng hiệu lực…" thành "Hộ chưa có đăng ký thu phí hiệu lực vào ngày …"; `ChargeCalculator.java:44` "Hợp đồng nhóm tính theo ký…" thành "Đăng ký thu phí nhóm theo ký chưa có định mức kg/tháng" | Message hiện thẳng ở cột Lý do màn xem trước phiếu YCT (BR-GEN-08) | Chờ |
| 2 | Backend | Nhật ký ghi `CREATE_STREET` (và mã mới nếu có): báo tên entity để thêm nhãn | Màn Nhật ký hiện nguyên mã | Chờ |
| 3 | Backend | Nếu chốt câu hỏi 4: thêm `refunded` vào `ChargeDto` | Chặn hạn mức hoàn ở form | Chờ quyết định |
| 4 | Web công ty | Dùng `PageHeader` / `StatCard` / `StateBlock` / `errorText`; bỏ override cỡ chữ `.clm-*`; Select ít lựa chọn thêm `virtual={false}` | Đồng bộ giao diện, test ổn định | Đã báo leader |
| 5 | Web công ty | Nhãn hai loại khiếu nại mới (BR-CMP-05) nằm ở thư mục khiếu nại; thư mục lane này không có chỗ dùng | — | Chờ |

## Đợt 3 (cập nhật)
| # | Việc | Commit |
|---|---|---|
| 19 | `Tag` màu antd → `StatusTag` ở mọi màn lane; biểu giá đã ban hành ẩn nút Sửa (QĐ-L7) | 4a36ed6, d3e54e3 |
| 20 | Dashboard: 4 thẻ đầu dùng `StatCard`; còn phải nộp không kẹp 0, số âm "Nộp thừa X đ" (QĐ-L12); vòng tỷ lệ theo `rateBand`/`cappedRate` (QĐ-L13, L16); vòng "Đã nộp về xã" tính trên số phải nộp xã; Cảnh báo thu gọn thành một dòng khi cả 3 mục bằng 0 | 80a46e1, 74b30b2, 359a5b8 |
| 21 | Xem trước phiếu YCT liệt kê mọi nhóm bị bỏ qua kèm số hộ, danh sách lọc theo nhóm; cũng hiện sau khi phát hành (QĐ-L14) | 80a46e1 |
| 22 | Nhật ký: trường thay đổi hiện bảng Trường / Trước / Sau bằng nhãn tiếng Việt, giá trị enum / ngày / tiền được đổi dạng | d7400f0, 37af5f8 |
| 23 | Quản trị dữ liệu: kiểm Jmix trước khi nhúng, không chạy thì hiện `ErrorBlock` có Thử lại | d7400f0 |
| 24 | `errorTextOrNull` dùng chung thay mọi `errorMessage` tự viết trong lane | 359a5b8 |
| 25 | Token nền Alert (warning / error / info / success) sáng, chữ đậm; quy ước bảng `.cell-nowrap`, `.cell-money`, `.row-actions` | 74b30b2, 1dd19d4 |
| 26 | Hồ sơ hộ: cột Mã cố định, độ rộng cột chia lại, bỏ tag "Chưa chuẩn hóa" từng dòng, thay bằng biểu tượng + ô lọc đếm; Khoản thu: mã không bẻ dòng, kỳ ghi "Tháng MM/YYYY", nút đề nghị dạng link; Công ty, Tài khoản, Khu vực, Cấu hình: nút thao tác dạng link, cột không bẻ dòng, cuộn ngang | 74b30b2, 1dd19d4 |
| 27 | Chờ duyệt có mô tả và trạng thái trống bằng `EmptyBlock` | 1dd19d4 |

Kiểm sau commit `d3e54e3`: `tsc --noEmit` sạch, `eslint src` sạch; vitest chạy từng thư mục (máy 7,3 GB, chỉ một việc nặng một lúc): masterdata 49 test, billing 9, platform 5, leadership 7, app + shared 27, đều xanh.

## Đợt 4 (cập nhật)
| # | Việc | Commit |
|---|---|---|
| 28 | Bảng vừa màn 1366: Hồ sơ hộ chia lại độ rộng (tổng 970px), Khoản thu gộp Nhóm giá vào dòng phụ của Đối tượng, bỏ cột thao tác cố định; thanh bên 240px | 7cacb8b, b29ae7c |
| 29 | Nút chính nằm ở `extra` của PageHeader: Hồ sơ hộ (Thêm hộ), Công ty (Thêm công ty, cán bộ xã), Khu vực (Phân công), Tài khoản | 7cacb8b |
| 30 | Hạn mức đề nghị hoàn = số tiền khoản − đã hoàn (`ChargeDto` chưa có `paidAmount`; backend vẫn kiểm lại), hiện "đã hoàn X đ"; thêm test | 7cacb8b |
| 31 | Xem trước và kết quả phiếu YCT dùng `skippedByReason` của schema, nhãn QUOTA_KG_REQUIRED | 7cacb8b |
| 32 | Báo cáo lãnh đạo: dòng tổng lộ mã code ra giao diện do thiếu ngoặc JSX (lỗi của đợt 3); thêm kiểm trong test | b29ae7c |
| 33 | Phiếu YCT: cột Kỳ ghi "Tháng MM/YYYY" | commit sau b29ae7c |

Đã chụp và soát bằng Edge (1366×900): Hồ sơ hộ, Khoản thu, Khu vực, Công ty, Tài khoản, Nhật ký, Dashboard, Chờ duyệt, Báo cáo, form hồ sơ hộ, form lập phiếu YCT, tab Biểu giá. Chưa chụp form soạn biểu giá (nút không bấm được bằng script) và popup phân công.

Kiểm cuối: `tsc --noEmit` sạch, `eslint src` sạch. vitest từng thư mục: masterdata 49, billing 9, platform 5, leadership 8, app + shared 27, đều xanh. Đã tắt Vite.
