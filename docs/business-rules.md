# Bộ business rule — hệ thống thu giá dịch vụ VSMT xã Đông Thạnh

Bản 04/10/2026, gom từ `SPEC.md`, `docs/data-dictionary.md` §5.0 + phần bổ sung, `docs/main-business-flows.md`, `docs/thay-doi-2026-10-03.md`, `docs/cho-do-cu-spec.md`. Khi các nguồn lệch nhau, **quyết định mới hơn thắng** (cột Nguồn ghi ngày chốt).

Trạng thái: **Chốt** = đã có quyết định, code phải khớp · **Chờ xã** = chưa có quyết định, không tự đặt · **Demo** = chấp nhận tạm cho demo.
Cột "Kiểm" để các lane điền khi rà: ✔ khớp · ✘ lệch (ghi số sạn trong file lane) · trống = chưa rà.

## 0. Chung

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-GEN-01 | Tiền là số nguyên VND (`long`/`bigint`), không số thực; hiển thị có dấu chấm nghìn + "đ" | SPEC §3 | Chốt | |
| BR-GEN-02 | Ngày trong API `yyyy-MM-dd`, hiển thị `dd/MM/yyyy`; múi giờ `Asia/Ho_Chi_Minh` | SPEC §3 | Chốt | |
| BR-GEN-03 | Mọi thao tác tạo/sửa tiền ghi audit (ai, lúc nào, trước/sau) | SPEC §8 | Chốt | |
| BR-GEN-04 | Vai trò + phạm vi dữ liệu kiểm ở backend, không dựa vào ẩn nút. Công ty A gọi dữ liệu công ty B → 403/404 | SPEC §6, §7 | Chốt | |
| BR-GEN-05 | Lỗi nghiệp vụ trả 409/422 kèm `code` + `message` tiếng Việt; giao diện hiện đúng `message` | SPEC §6 | Chốt | |
| BR-GEN-06 | Mã chứng từ: kỳ tháng `MMYY`, kỳ quý `Q{quý}{YY}` (vd. `YCT-Q426-01`) | DD G11 | Chốt | |
| BR-GEN-07 | Nhãn giao diện tiếng Việt có dấu; enum hiển thị qua `labels.ts`, không lộ mã tiếng Anh | SPEC §6 | Chốt | |
| BR-GEN-08 | Hộ dân không có "hợp đồng": giao diện gọi **Đăng ký thu phí**, ẩn số hợp đồng. "Hợp đồng với xã" của công ty giữ nguyên | 03/10 | Chốt | |

## 1. Tài khoản, vai trò (`platform`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-PLT-01 | Vai trò nội bộ: `ADMIN`, `COMMUNE_OFFICER`, `COMPANY_MANAGER`, `COLLECTOR`, `LEADER`. Người dân chỉ ở `CitizenAccount`, token riêng | DD G8, 29/09 | Chốt | |
| BR-PLT-02 | Đăng nhập ra đúng menu theo vai trò; API sai vai trò → 403 | SPEC §9.2 | Chốt | |
| BR-PLT-03 | Mật khẩu 8–72 ký tự, quá 72 byte → 422 `PASSWORD_TOO_LONG`; quản trị đặt / đặt lại (kể cả mật khẩu người đi thu, BR-PLT-08) | DD T51 | Chốt | |
| BR-PLT-04 | Quản trị không tự khóa, không tự đổi vai trò mình (`CANNOT_LOCK_SELF`, `CANNOT_CHANGE_OWN_ROLE`) | DD T51 | Chốt | |
| BR-PLT-05 | Người đi thu còn giữ tiền mặt → không đổi vai trò / công ty (`COLLECTOR_HOLDS_CASH`). Đã bỏ phân tổ nên không còn điều kiện `COLLECTOR_HAS_ASSIGNMENTS` | DD T51, góp ý BA 05/10 | Chốt | |
| BR-PLT-06 | Khóa tài khoản chỉ chặn từ lần đăng nhập sau (token cũ còn tới hết hạn) | DD T51 | Demo | |
| BR-PLT-07 | Lãnh đạo: chỉ GET, trừ `/api/leadership/**` và `/api/notifications/**`. Không khóa kỳ, không cấu hình, không tài khoản | SPEC §9.10 | Chốt | |
| BR-PLT-08 | **Sửa 05/10/2026 (UC-04):** chỉ **quản trị viên** tạo, sửa họ tên / liên hệ, khóa / mở khóa, đặt lại mật khẩu tài khoản `COLLECTOR`, qua `/api/platform/users` (chọn công ty; mỗi người đi thu thuộc đúng một công ty). Quản lý công ty **không còn** các quyền này, chỉ **xem** danh sách người đi thu của công ty mình (`GET /api/platform/collector-accounts`, phục vụ UC-33); ghi nhật ký như BR-PLT-03..06 | Quyết định 04/10 (mở rộng T51), sửa theo góp ý BA 05/10 | Chốt | |

## 2. Dữ liệu gốc (`master-data`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-MD-01 | Mỗi khu vực (tổ/ấp/thôn) tối đa 1 công ty trong cùng khoảng hiệu lực; đổi công ty tạo bản ghi mới, giữ lịch sử, backend tự đóng phân công cũ | SPEC §9.3 | Chốt | |
| BR-MD-02 | Đã bỏ (góp ý BA 05/10): không còn phân tổ người đi thu nên đổi công ty của khu vực không còn kết thúc phân tổ | DD G14, góp ý BA 05/10 | Đã bỏ | |
| BR-MD-03 | Công ty mã `DVnn` tự sinh; **chỉ quản trị thêm/sửa được** (ở `/admin/config`; cán bộ xã chỉ xem và phân công khu vực, từ 04/10 theo góp ý người dùng, thay QĐ-L1); vai trò khác 403; trạng thái **Đang hợp tác / Ngừng hợp tác** | DD T51, 29/09, QĐ-L1 04/10 | Chốt | |
| BR-MD-04 | Công ty Ngừng hợp tác không nhận phân công khu vực mới (`COMPANY_INACTIVE`) | DD T51 | Chốt | |
| BR-MD-05 | Công ty Ngừng hợp tác: khu vực đang phụ trách xử lý thế nào | DD T51 | **Chờ xã** (hiện giữ nguyên) | |
| BR-MD-06 | Đối tượng: hộ gia đình / hộ kinh doanh / doanh nghiệp. Địa chỉ tách số nhà + đường (đường theo danh mục), khu vực. Hộ gia đình bắt buộc số thành viên; nhóm giá HGĐ phải khớp số thành viên (≤2 / ≥3) | 28/09, V23, V31 | Chốt | |
| BR-MD-07 | Mỗi đối tượng tối đa 1 đăng ký hiệu lực tại một thời điểm; số đăng ký tự sinh `ĐK-{địa bàn}-{nnnn}`, không có "ngày ký" | SPEC §9.3, DD D10 | Chốt | |
| BR-MD-08 | Cảnh báo nghi trùng hộ khi tạo/sửa (cùng địa chỉ chuẩn hóa) — cảnh báo, không chặn | V31 | Chốt | |
| BR-MD-09 | Đổi số người của hộ áp **từ kỳ sau**: đăng ký cũ kết thúc ngày cuối kỳ đang chạy, đăng ký mới (nhóm giá mới) từ ngày đầu kỳ kế tiếp, giữ miễn giảm + định mức. Không có kỳ đang chạy / đăng ký chưa bắt đầu → đổi tại chỗ. Khoản đã phát hành giữ nhóm giá cũ, không truy thu/hoàn | 03/10 | Chốt | |
| BR-MD-10 | Có lịch sử số nhân khẩu của hộ | 03/10 | Chốt | |
| BR-MD-11 | Biểu giá theo phiên bản: soạn dự thảo (đủ đơn giá các nhóm) → sửa khi còn dự thảo → Ban hành; bản đã ban hành không sửa. Ban hành: bản đang áp dụng kết thúc ngay trước ngày hiệu lực mới; chặn khi đã mở kỳ bắt đầu từ ngày hiệu lực trở đi, khi bản cũ bị thay hết hoặc bị cắt đôi | 29/09 | Chốt | |
| BR-MD-12 | Biểu giá chỉ gồm **thu gom + vận chuyển**; không có phí xử lý, không VAT | DD G9, 03/10 | Chốt | |
| BR-MD-13 | Quản trị mở kỳ thủ công (tháng hoặc quý); mở là **Đang thu** luôn (không có trạng thái Đã mở). Kỳ tự tạo đi qua **Dự thảo** (BR-MD-20). Cán bộ xã khóa kỳ | DD G1, P1, P5 | Chốt | |
| BR-MD-14 | Kỳ gắn phiên bản biểu giá đang hiệu lực của kỳ | SPEC §9.3 | Chốt | |
| BR-MD-15 | Miễn giảm = cờ miễn 100% trên đăng ký + lý do; xã bật trực tiếp (xem BR-LD-04) | 28/09, 29/09 | Chốt | |
| BR-MD-16 | Thu theo hộ hay theo nhân khẩu | 03/10 | **Chờ xã** (hiện: theo hộ, số người chỉ chọn nhóm) | |
| BR-MD-17 | Hộ không khai đổi nhân khẩu: nhắc hay truy thu, mấy tháng | 03/10 | **Chờ xã** | |
| BR-MD-18 | Nhà vắng dài ngày: miễn, giảm hay vẫn tính | 03/10 | **Chờ xã** | |
| BR-MD-19 | Ai duyệt đổi nhân khẩu, rà soát định kỳ bao lâu | 03/10 | **Chờ xã** | |
| BR-MD-20 | Tự tạo kỳ: quản trị đặt quy tắc một lần (bật/tắt, tháng hoặc quý, ngày tạo kỳ 1–28, số ngày công ty nộp xã). Tác vụ 7h30 hằng ngày tạo kỳ kế tiếp ở trạng thái **Dự thảo** (không tạo trùng, mỗi lần một kỳ chờ mở), báo cán bộ xã. Dự thảo chưa có khoản, chưa ghi thu (422 `PERIOD_DRAFT`). Cán bộ xã xem trước rồi **Mở kỳ & phát hành** (hạn nộp của kỳ mặc định theo quy tắc, sửa được). Quản trị vẫn mở thủ công được | 04/10 (xã chốt), P5 | **Demo** (chờ leader duyệt, thêm migration V36) | |
| BR-MD-21 | Nhập hồ sơ hộ hàng loạt từ file Excel (.xlsx): xem trước từng dòng + lỗi, chỉ ghi khi mọi dòng hợp lệ (tất cả hoặc không gì). Cột đường khớp danh mục đường của xã (BR-MD-08); không khớp thì lưu tên đường "chờ xác minh". Hộ gia đình tạo kèm đăng ký theo số người, hộ kinh doanh / doanh nghiệp ở trạng thái Chờ hợp đồng | 04/10 | **Demo** (cần leader duyệt thư viện Apache POI) | |

## 3. Lập khoản thu (`billing`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-BIL-01 | Phiếu yêu cầu thu: kỳ, loại phí, phạm vi (toàn xã / chọn tổ / theo công ty), hạn đóng. Có xem trước rồi mới phát hành. Chỉ kỳ chưa khóa | SPEC §9.4 | Chốt | |
| BR-BIL-02 | Số tiền khoản = giá tháng của nhóm giá × (quý ? 3 : 1), chụp lại vào khoản khi sinh | SPEC §9.4 | Chốt | |
| BR-BIL-03 | Nhóm theo ký (`BY_VOLUME`): tiền = đơn giá đ/kg × định mức kg/tháng × số tháng; chưa có định mức → không lập được (`QUOTA_KG_REQUIRED`) | 03/10 | Chốt | |
| BR-BIL-04 | Ai cân kg, bao lâu cân lại để lấy định mức | 03/10 | **Chờ xã** | |
| BR-BIL-05 | Đăng ký miễn 100% → khoản 0 đ, trạng thái Miễn giảm | SPEC §9.4 | Chốt | |
| BR-BIL-06 | Bỏ qua (kèm cảnh báo ở màn xem trước): đối tượng không có đăng ký hiệu lực; khu vực chưa có công ty; đã có khoản cùng loại phí trùng/chồng kỳ. Phát hành lại cùng kỳ không sinh trùng | SPEC §9.4 | Chốt | |
| BR-BIL-07 | Chụp `company_id` lên khoản theo phân công hiệu lực tại **ngày phát hành**; đổi công ty sau đó không đổi khoản đã phát hành | DD G3 | Chốt | |
| BR-BIL-08 | Hạn của khoản hộ = hạn phiếu YCT; hạn YCT ≤ hạn kỳ; hạn kỳ chỉ dùng cho công ty nộp xã. "Quá hạn" tính từ hạn, không lưu | DD G16 | Chốt | |
| BR-BIL-09 | Phí giá cố định: đơn giá > 0 (`CHARGE_PRICE_INVALID`); tổng tràn số → `CHARGE_AMOUNT_TOO_LARGE`; không có trần | DD P3 | Chốt | |
| BR-BIL-10 | Trạng thái khoản: Chưa thu / Đã thu / Miễn giảm / Đã xóa nợ | SPEC §9.4, 29/09 | Chốt | |
| BR-BIL-11 | Rác cồng kềnh không phải loại phí, không vào phiếu YCT, không sinh khoản | DD G13, O5 | Chốt | |

## 4. Thu tiền (`collection`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-COL-01 | Đã bỏ (góp ý BA 05/10): không còn phân tổ cho người đi thu | DD O4, góp ý BA 05/10 | Đã bỏ | |
| BR-COL-02 | Người đi thu thu được mọi hộ có khoản của công ty mình; công ty chỉ thấy hộ/khoản của mình. Hệ thống ghi người nào đã thu khoản nào | SPEC §9.5, góp ý BA 05/10 | Chốt | |
| BR-COL-03 | Hộ chỉ có 2 trạng thái **Đã đóng / Chưa đóng**: chỉ 2 cách đóng: **tiền mặt** cho người đi thu, hoặc **chuyển khoản VietQR** (ngân hàng báo về tự ghi, không ai tự bấm "đã chuyển khoản"); mỗi lần thu phải đúng bằng số cần đóng, khoản chuyển Đã thu ngay; không thu một phần, sai số → 422. "Đã thu" = Σ `Payment.amount` | 04/10 (thay DD G4) | Chốt | |
| BR-COL-04 | Người đi thu chỉ có 2 nút: Đã thu tiền mặt / Đã thu chuyển khoản. Không ghi lượt ghé vắng / hẹn / từ chối: đã bỏ cả API và bảng `collection_visits` (V41, 04/10) | 03/10, 04/10 | Chốt | |
| BR-COL-05 | Gửi trùng (cùng mã yêu cầu) không tạo 2 thanh toán | SPEC §9.5 | Chốt | |
| BR-COL-06 | Hình thức: tiền mặt (API thu chỉ nhận `CASH`) / chuyển khoản (chỉ do ngân hàng báo về qua VietQR) / hoàn (chỉ qua duyệt). `APP_SIMULATED` đã bỏ 04/10, chỉ còn ở dữ liệu cũ. Mã xác nhận `TT-MMYY-nnnnnn`, gọi "Xác nhận thanh toán", không gọi biên lai pháp lý | DD D4, O1 | Chốt (O1 chờ kế toán xã) | |
| BR-COL-07 | Tiền mặt đang giữ của người đi thu = Σ thu tiền mặt − Σ đã bàn giao, tính trên mọi kỳ | DD D5 | Chốt | |
| BR-COL-08 | Bàn giao tiền mặt: quản lý công ty ghi khi nhận (một bên), 0 < số tiền ≤ đang giữ; người đi thu chỉ xem | DD G5 | Chốt | |
| BR-COL-09 | Khoản đã xóa nợ: người đi thu vẫn thấy, nhãn "Đã xóa nợ", không có nút cập nhật | 29/09 T57 | Chốt | |
| BR-COL-10 | Lịch sử hộ của người đi thu theo một kỳ, đổi kỳ bằng ô chọn kỳ | DD T53 | Chốt | |
| BR-COL-11 | Báo sai thông tin hộ: chỉ phát thông báo INFO cho xã + công ty | DD G7 | Chốt | |
| BR-COL-12 | Kỳ đã khóa: không sửa khoản, số liệu và phiếu thu của kỳ. Ngoại lệ: khoản hộ chưa đóng (công nợ của hộ, BR-REM-15) vẫn thu được, tiền ghi vào kỳ đang thu | SPEC §9.6, góp ý BA 05/10 | Chốt | |
| BR-COL-13 | Dân chuyển khoản qua mã VietQR trên app → tiền vào **tài khoản chung của xã** (quản trị khai báo), ngân hàng báo về, khoản Đã thu, công ty và xã thấy ngay. App không tự ghi thanh toán. Công ty không có tài khoản nhận | SPEC §9.9, 04/10, góp ý BA 05/10 | Chốt | |

## 5. Nộp về xã, đối soát, khóa kỳ (`remittance`)

Sổ công ty–kỳ là nguồn số duy nhất cho: Tiến độ, Đối soát, màn Công ty, Dashboard + Báo cáo lãnh đạo.

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-REM-01 | Phải thu (`due`) của công ty–kỳ = Σ khoản theo `company_id` chụp trên khoản, không tính khoản xóa nợ trong chính kỳ | DD G3, T57 | Chốt | |
| BR-REM-02 | **Công ty cầm lại phần thu gom, chỉ nộp phần vận chuyển.** `retained` = Σ từng khoản ĐÃ THU (cả chuyển khoản) `số đã thu của khoản × collection_fee / monthly_total` của nhóm giá, làm tròn đồng theo khoản rồi cộng lại; khoản phí cố định không có phần cầm lại | 03/10 (thay O2 "nộp toàn bộ") | Chốt | |
| BR-REM-03 | Phải nộp xã `payable = tiền mặt công ty đã thu − adjustment − retained`, trong đó `retained` tính trên **toàn bộ số đã thu** (cả chuyển khoản vào tài khoản xã), không tính trên phải thu. `payable` âm → xã trả lại công ty phần chênh. Còn phải nộp `remaining = payable − received`. Nợ kỳ trước và nhắc nộp theo `payable` | 03/10, góp ý BA 05/10 | Chốt | |
| BR-REM-04 | Phiếu thu xã lập khi công ty nộp: 1 phiếu 1 kỳ, 1 kỳ nhiều phiếu; 0 < số tiền ≤ còn phải nộp; mã `PT-CT-MMYY-nnn`; in có số tiền bằng chữ | SPEC §9.6 | Chốt | |
| BR-REM-05 | Phiếu sai: không sửa, không hủy; lập phiếu mới. Sai sót "Đã xử lý" = đóng kèm ghi chú. Kỳ đã khóa: chỉ đóng kèm ghi chú | DD G6, P2 | Demo | |
| BR-REM-06 | Nhắc nộp: chỉ công ty có nợ quá hạn; giữ lịch sử | SPEC §9.6, DD D6 | Chốt | |
| BR-REM-07 | Đối soát: chênh lệch = đã nộp − phải nộp xã (âm: còn nộp thiếu; dương: nộp dư hoặc xã trả lại công ty); đã thu gồm tiền mặt và chuyển khoản; trạng thái Khớp / Đang nộp / Lệch. Màn Đối soát tách tiền mặt và chuyển khoản (chuyển khoản = đã thu − tiền mặt; hoàn tiền trừ vào tiền mặt) và có cột phí thu gom, điều chỉnh, phải nộp xã; không còn cột nợ kỳ trước (công ty còn phải nộp của kỳ trước hiện ở cảnh báo đầu trang). Trạng thái đối soát không phải điều kiện khóa kỳ | SPEC §9.6, flows | Chốt | |
| BR-REM-08 | Khóa kỳ chỉ được khi **mọi công ty đã nộp đủ** số phải nộp xã (tính trên đã thu), **và** kỳ đã thu đủ mọi khoản (không còn khoản Chưa thu) **hoặc** đã đến hạn nộp (hôm nay ≥ ngày hạn nộp của kỳ; ⚠ đúng ngày hạn đã tính là đến hạn, cần xác nhận); không thì chặn, báo lý do rõ. Khoản hộ chưa đóng khi khóa thành **công nợ của hộ**: hộ nộp được ở kỳ sau, tiền tính vào kỳ đang thu | DD G15, flows, góp ý BA 05/10 | Chốt | |
| BR-REM-09 | Sau khóa: không sửa khoản, số liệu và phiếu thu của kỳ; điều chỉnh phát sinh sau đó ghi vào kỳ đang thu. Ngoại lệ: tiền hộ nộp công nợ (BR-REM-15) | SPEC §9.6, góp ý BA 05/10 | Chốt | |
| BR-REM-10 | Cờ dưới 45%: cấp công ty theo đã nộp / phải thu; cấp tổ theo đã thu / phải thu; so số nguyên. **Chưa chốt lại sau góp ý BA 05/10** (phải nộp xã nay tính trên đã thu); bản code giữ như BR-REM-13, chờ quyết định. Màn Tiến độ thu không còn tô đỏ theo cờ này (thanh tiến độ trơn; tỷ lệ nộp = đã nộp / phải nộp xã, `payable ≤ 0` hiện "—"); cờ vẫn ở dashboard lãnh đạo | DD P4 | Chốt, chờ rà lại | |
| BR-REM-11 | Vòng tỷ lệ thu ở Đối soát: < 25% đỏ, 25–< 50% vàng, 50–< 75% cam, ≥ 75% xanh lá; "Thu 3 tháng gần nhất" chỉ kỳ tháng | 29/09 | Chốt | |
| BR-REM-12 | Số liệu Tiến độ = Đối soát = màn Công ty = Dashboard/Báo cáo lãnh đạo cho cùng kỳ | SPEC §9.6, §9.10 | Chốt | |
| BR-REM-13 | Cờ 45% cấp công ty sau khi có phần cầm lại: so **đã nộp / phải nộp xã (`payable`)**; `payable = 0` thì không gắn cờ. Cấp tổ giữ đã thu / phải thu | QĐ-L2 04/10 | Chốt | |
| BR-REM-14 | Xã nộp phần vận chuyển về Sở, giữ ≤ 8% (QĐ 65) | QĐ 65 | Ngoài phạm vi demo | |
| BR-REM-15 | **Công nợ của hộ:** khoản `UNPAID` của kỳ đã khóa (không tạo bảng mới). Hộ nộp được ở kỳ sau; tiền ghi vào **kỳ đang thu mới nhất** (`payments.ledger_period_id`), số kỳ đã khóa giữ nguyên; không có kỳ đang thu thì chưa nhận được (`NO_COLLECTING_PERIOD`). Cũng áp cho chuyển khoản SePay khớp khoản đó | góp ý BA 05/10 | Chốt | |
| BR-REM-16 | **Hiển thị công nợ hộ** (Tiến độ thu, cán bộ xã và lãnh đạo): thẻ "Công nợ hộ" = số hộ (một hộ nợ nhiều kỳ đếm một lần) và tổng tiền các khoản `UNPAID` của kỳ đã khóa, mọi kỳ; danh sách theo khoản (hộ, địa chỉ, tổ, công ty, kỳ, số tiền, số kỳ nợ), lọc được theo công ty, tổ. Hộ nộp ở kỳ sau thì khoản thành Đã đóng và hết nợ. Cột "Hộ còn nợ kỳ cũ" của tổ đếm hộ của tổ (theo tổ chụp trên khoản). "Thu công nợ kỳ cũ" của một kỳ = Σ thanh toán (trừ hoàn) của khoản thuộc kỳ khác đã khóa có `ledger_period_id` là kỳ đó; chỉ hiển thị, là một phần của đã thu. Công ty không xem tổng hợp này | góp ý BA 05/10 | Chốt | |

## 6. Lãnh đạo và đề nghị về tiền (`leadership`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-LD-01 | Lãnh đạo chỉ xem + xuất báo cáo (CSV UTF-8 BOM), không xác nhận/ký báo cáo, không chốt kỳ | 29/09 | Chốt | |
| BR-LD-02 | Dashboard: phải thu / đã thu / đã nộp / còn nợ theo công ty và tổ; cảnh báo nộp chậm, nợ kỳ trước, tỷ lệ thu thấp, số đề nghị chờ duyệt — dùng cờ sẵn có | SPEC §9.10 | Chốt | |
| BR-LD-03 | Đề nghị `DN-MMYY-nnn`: Chờ duyệt → Đã duyệt / Từ chối; từ chối bắt buộc ý kiến (422); không duyệt 2 lần; audit + thông báo (đề nghị mới → lãnh đạo, kết quả → người đề nghị) | SPEC §9.10 | Chốt | |
| BR-LD-04 | Miễn giảm: xã bật cờ → tự tạo đề nghị; duyệt = ghi nhận; từ chối = bỏ cờ, khoản Miễn giảm kỳ đang mở về Chưa thu (tính lại số tiền), kỳ khóa giữ nguyên | O8 | Chốt | |
| BR-LD-05 | Hoàn: khoản đã thu, 0 < số tiền ≤ đã thu − đã hoàn; duyệt → bút toán âm `REFUND`, không gắn người đi thu (tiền mặt đang giữ không đổi); hoàn một phần giữ Đã thu, hoàn hết về Chưa thu; công ty trả hộ ngoài hệ thống | O9 | Chốt | |
| BR-LD-06 | Xóa nợ: khoản Chưa thu, chưa có thanh toán (có thanh toán → 422); duyệt → Đã xóa nợ, không tính vào phải thu / phải nộp | T57 | Chốt | |
| BR-LD-07 | Hoàn / xóa nợ khoản kỳ đã khóa: số kỳ khóa giữ nguyên, ghi ở kỳ đang thu (cột Điều chỉnh kỳ trước / Đã hoàn) | O10 | Chốt | |
| BR-LD-08 | Báo cáo kỳ: lọc công ty, tổ; cột Phải nộp xã, Hộ miễn 100%; dòng Tổng toàn xã | 03/10 | Chốt | |

## 7. Thông báo, nhắc nộp (`notifications`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-NTF-01 | Người nhận theo vai trò / công ty / người dùng / người dân; công ty không thấy thông báo công ty khác; đã đọc tính chung trên bản ghi | SPEC §9.7, DD D7 | Chốt | |
| BR-NTF-02 | Bấm thông báo mở đúng màn liên quan (web + app) | SPEC §9.7 | Chốt | |
| BR-NTF-03 | Nhắc hộ dân trong app: 3 mốc — vừa phát hành, trước hạn 3 ngày, sau hạn 1 ngày; chỉ khoản Chưa thu, hộ có app, mỗi mốc 1 lần; job 08:00; xã chạy tay được | 03/10 | Chốt | |
| BR-NTF-04 | SMS / Zalo | 03/10 | Chưa làm (cần nhà cung cấp) | |

## 8. Khiếu nại (`complaints`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-CMP-01 | Trạng thái Mới → Đang xử lý → Đã giải quyết; mã `KN-MMYY-nnn`; kênh app / điện thoại / trực tiếp | SPEC §9.8, DD D8 | Chốt | |
| BR-CMP-02 | Timeline lưu nối tiếp, không ghi đè | SPEC §9.8 | Chốt | |
| BR-CMP-03 | Xã xử lý hoặc chuyển công ty (hạn +3 ngày); công ty chỉ thấy khiếu nại đã chuyển cho mình và phản hồi; chỉ xã đóng | SPEC §9.8, DD G12 | Chốt | |
| BR-CMP-04 | Thông báo ở mỗi bước; dân xem timeline trên app. Khiếu nại xã nhập hộ (điện thoại/trực tiếp) không tự gắn tài khoản app | flows BF-03 | Chốt | |
| BR-CMP-05 | Thêm loại "cơ sở vật chất" và "đề nghị thu gom" | 03/10 | Chốt, **chưa làm** | |
| BR-CMP-06 | Thêm loại khiếu nại "đã đóng nhưng chưa được ghi nhận" (`PAID_NOT_RECORDED`, migration V35) để hộ báo khoản đã đóng mà xã chưa ghi | 04/10 (đánh giá prototype 8.3) | Demo | |

## 9. App người dân (`citizen-app`)

| Mã | Rule | Nguồn | Trạng thái | Kiểm |
|---|---|---|---|---|
| BR-CIT-01 | Đăng nhập SĐT + OTP cố định (mô phỏng); 1 SĐT ↔ 1 hộ, 1 hộ nhiều tài khoản | DD O7, D11 | Demo | |
| BR-CIT-02 | Dân chỉ thấy dữ liệu của hộ mình: thông tin hộ, khoản phải đóng + lịch sử, xác nhận thanh toán. Đã bỏ lịch thu gom (góp ý BA 05/10) | SPEC §9.9, góp ý BA 05/10 | Chốt | |
| BR-CIT-03 | ~~Thanh toán mô phỏng~~ → bỏ 04/10: app chỉ hiện mã VietQR cho khoản Chưa thu của hộ mình và chờ ngân hàng báo về; công ty chưa khai tài khoản thì báo đóng tiền mặt | SPEC §9.9, 04/10 | Chốt | |
| BR-CIT-04 | Rác cồng kềnh: Chờ xác nhận → Đã báo phí → Đã thu gom / Hủy; công ty phụ trách theo khu vực báo phí; phí không thành khoản thu | SPEC §9.9, O5 | Chốt | |
| BR-CIT-05 | Chợ đồ cũ v2: caption + 1–4 tag (Tìm/Bán/Cho tặng/Đổi) + danh mục + ≤ 5 ảnh (≤ 5 MB, JPEG/PNG/WebP, không bắt buộc), không có giá; đóng/mở lại, ẩn/hiện; bình luận + SĐT tự nguyện; lưu bài; chặn hai chiều; thông báo bình luận; không kiểm duyệt. Vai trò nội bộ chỉ đọc. Chi tiết: `docs/cho-do-cu-spec.md` (thay quy tắc T47 cũ) | 30/09 | Chốt | |

## 10. Chỗ tài liệu cũ đã bị thay — đừng làm theo

- `SPEC.md` §1 "công ty nộp **toàn bộ**" và DD O2 → thay bởi BR-REM-02 (03/10).
- `SPEC.md` §9.3 trạng thái kỳ "Đã mở → Đang thu" → thay bởi BR-MD-13 (P1).
- `SPEC.md` §9.5 lượt ghé vắng/hẹn/từ chối và DD G4 thu một phần → bỏ hẳn theo BR-COL-03/04 (04/10).
- DD T47 chợ đồ cũ "đóng không mở lại" → thay bởi BR-CIT-05.
- DD G9 gọi thành phần giá là "xử lý" → nay là "vận chuyển" (BR-MD-12).
