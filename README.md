# Prototype hệ thống thu giá dịch vụ vệ sinh môi trường — v3.0

Spec hiện hành: `SPEC-TONG-HOP.md`, phiên bản 2.9, cập nhật ngày 15/09/2026. Quyết định bổ sung ngày 16/09/2026: `DOI-SOAT-YEU-CAU-PHAN-MEM-2026-09-16.md` §5.

## Cập nhật 3.0 — đối soát yêu cầu mới, sửa mô hình và làm lại hệ thống thị giác

- Không gian công ty (17/09/2026): “Hộ được giao” đổi thành bảng khoản phải thu xã đã xuất (mỗi dòng = hộ × kỳ, có mã khoản và số hóa đơn; lọc theo kỳ thu, khu vực, loại hộ, số kỳ nợ và chip trạng thái). Bỏ hai trang “Cập nhật kết quả thu” và “Biên lai đã phát”. Thêm trang “Phân tuyến nhân viên” (`assets/js/company-routing.js`): chọn kỳ thu, tìm nhân viên, dải thống kê tổng tuyến / đã phân công / chưa có người nhận, bảng nhân viên với số tuyến và tổng hộ, modal chọn nhiều tuyến (kèm tổ, số hộ), thẻ cảnh báo tuyến trống và tuyến của người đang nghỉ, chuyển tuyến nhanh giữa hai nhân viên. Phân công chỉ đổi trong bộ nhớ phiên xem.
- Quyết định đã chốt (16/09/2026): Phòng Kinh tế chính là vai trò “Cán bộ xã”; Trung tâm Cung ứng dịch vụ công là một đơn vị thu gom trong danh mục; thanh toán trên ứng dụng người dân đưa vào phạm vi hiện tại, tiền vào tài khoản công ty hoặc mã nhân viên thu, công ty phát biên lai; CSDL hộ và nguồn số tiền hiển thị cho dân vẫn là P0 mở.
- Sửa lỗi so với spec 2.9: bỏ hết mô hình “tuyến”, tên đơn vị không có trong danh mục, cảnh báo xã đối soát tiền mặt từng nhân viên, cột “Kế toán xác nhận” trên tiền hộ (đổi thành “Đã có chứng từ”), số đề nghị/badge menu mâu thuẫn với màn hình, popup khóa sổ nói 3/4 trong khi màn nói 0/4; xóa 24 renderer và 19 dialog chết còn mang mô hình cũ.
- Bộ lọc thật thay cho nút “Lọc dữ liệu” giả: tìm kiếm + select + chip có số đếm trên Đối tượng, Đề nghị, Hàng chờ phê duyệt, Nhật ký, Báo cáo tiến độ thu tiền, Đối soát phần xử lý; lọc tại chỗ, giữ focus và vị trí cuộn, có empty state thống nhất.
- Màn đối soát: thêm cột chênh lệch có dấu ± (báo đã thu − đã có chứng từ; hộ đủ điều kiện − hộ nguồn), chip “Cần xử lý / Đã khớp”, dòng cần xử lý được đánh dấu mép trái; ngưỡng cảnh báo để “Chưa cấu hình” chờ BA.
- Hệ thống thị giác: bộ icon SVG theo chức năng (`assets/js/icons.js`) thay ký tự hình học; thang chữ/bo góc/màu thống nhất trong `tokens.css` (cỡ chữ nhỏ nhất 11px); số tiền căn phải, tabular; tiêu đề bảng dính khi cuộn, dòng xen kẽ; khối 4-KPI chỉ giữ ở dashboard, màn danh sách dùng dải tóm tắt; 25 callout gộp thành khối “Nguyên tắc” thu gọn; bỏ dải luồng 7 bước và biểu đồ tròn trang trí; focus rõ, label gắn với input.
- Con số minh họa (73%, 2.792 tỷ, 80.000đ) giữ nguyên theo yêu cầu, không gắn nhãn.
- Không gian kế toán (`assets/js/accounting.js`, dữ liệu mẫu kỳ 09/2026): sao kê tài khoản xã 6 giao dịch (4 khớp theo mã, 2 dòng treo), phiếu thu xã phát cho công ty, kiểm tra biên lai công ty, đối soát thu gom (phải nộp = hộ × đơn giá mẫu 12.000đ so với thực nộp) và đối soát tiền mặt với công ty (kê khai so với chứng từ), báo cáo thu/nợ. CTA: Đồng bộ sao kê, Khớp tự động, Xử lý dòng treo (gán tay/xác minh/hoàn), Phát hành/hủy phiếu thu, Yêu cầu công ty điều chỉnh biên lai, Đối soát thu gom, Đối soát tiền mặt, Lập/Xuất báo cáo. Kế toán không có nút miễn giảm hay cấu hình.

## Cập nhật 2.9 — khớp lại actor và luồng đối soát

- Công ty là bên trực tiếp thu tiền hộ và phát biên lai; thêm tổng quan công ty, hộ được giao, cập nhật kết quả, biên lai, nghĩa vụ phần xử lý và kê khai tiền đã nộp.
- File Excel danh sách hộ chỉ là nguồn đối chiếu. Hộ chưa được xã xác minh/phân công không được đưa vào phạm vi vận hành hoặc số hộ tính nghĩa vụ.
- Kế toán chỉ đối soát phần xử lý công ty nộp về xã: `số hộ đủ điều kiện × đơn giá xử lý` so với giao dịch thực có trên sao kê xã.
- Vì chưa có danh sách hộ chuẩn, đơn giá và sao kê thật, prototype hiện “Chưa tính/Bị chặn”, không tạo số tiền hoặc kết luận chênh lệch giả.
- Lãnh đạo xác nhận báo cáo; kế toán chốt/khóa sổ. Màn khóa sổ đã chuyển khỏi vai trò lãnh đạo.
- QR thu online được đánh dấu là giai đoạn sau. Tiền hộ và tiền phần xử lý là hai dòng tiền riêng.
- Báo cáo đối soát chi tiết: `DOI-SOAT-SPEC-PROTOTYPE-V2.9.md`. Kiểm tra: `node work/test_spec_alignment.js`.

## Cập nhật 2.8 — một công ty phụ trách khu vực

- Đối chiếu tài liệu nghiệp vụ: 11 công ty vừa thu gom dịch vụ vừa trực tiếp thu tiền của hộ. Phân công khu vực chỉ còn một công ty, không tách hai đơn vị.
- `#commune/routes` có một cột “Công ty thu gom và thu tiền”, một bộ lọc công ty và một trạng thái chưa phân công.
- Popup phân công chỉ chọn một công ty; đổi công ty trong thời gian hiệu lực phải bàn giao dữ liệu và công nợ hộ, giữ lịch sử cũ.
- Chi tiết khu vực chỉ có một thẻ công ty và một dòng lịch sử cho nhiệm vụ “Thu gom và thu tiền”.
- Trang đơn vị và báo cáo tiến độ đều dùng cùng mã công ty phụ trách khu vực.
- Hộ chưa rõ công ty vẫn giữ trạng thái chưa phân công; dữ liệu công ty gửi không tự động trở thành phân công chính thức.
- Module hiện hành: `assets/js/single-unit-area.js`. Kiểm tra: `node work/test_single_unit_area.js` và `node work/test_data_intake.js`.

## Cập nhật 2.7 — tiếp nhận và đối chiếu dữ liệu hộ

- Công ty có tài khoản; không tải Excel trực tiếp lên hệ thống ở luồng hiện tại. Công ty gửi tệp bên ngoài, cán bộ xã tiếp nhận và import.
- Thêm không gian `Công ty thu gom`: chỉ xem dữ liệu của Công ty MTĐT Đông Thạnh trong mẫu và các yêu cầu bổ sung liên quan; không xem nguồn công ty khác.
- Thay màn nhập cũ bằng `#commune/data-quality`: quy trình nhận tệp → ghép cột khác nhau về bộ trường chung → kiểm tra → mở đối chiếu.
- Thêm `#commune/data-comparison`: lọc theo nguồn/vấn đề; xem dữ liệu gốc cạnh bản chuẩn hóa đề xuất; đặt hai nguồn cạnh nhau khi nghi trùng.
- Bao phủ các tình huống: thiếu trường, nghi trùng trong tệp, nhiều công ty cùng khai, cùng tên khác địa chỉ, cùng địa chỉ nhiều hộ, chưa rõ đơn vị, lệch phân công khu vực và biến động hộ.
- Xã chưa có danh sách hộ chuẩn nên prototype không kết luận công ty khai thiếu hộ; không có nút tự gộp, tự gán công ty hay duyệt chính thức.
- Yêu cầu bổ sung được tạo trong phiên mẫu và hiển thị cho đúng công ty. Không gửi ra ngoài, không đọc Excel thật và không lưu bền vững.
- Mã kiểm tra hiện hành cho phần này: `node work/test_data_intake.js`.

## Lịch sử cập nhật 2.6 — tối ưu review và CRUD

- Chọn một/nhiều tổ và phân công ngay tại Quản lý khu vực. Form điền sẵn, có “Thu tiền giống gom rác”. Lọc danh sách sẽ bỏ các lựa chọn bị ẩn để tránh giao nhầm.
- Bảng kiểm tra trước xác nhận có công ty hiện tại, công ty dự kiến, ngày hiệu lực, xung đột từng nhiệm vụ. Bàn giao tiền bắt buộc xác định bên tiếp tục thu nợ cũ.
- Sơ đồ khu vực mặc định thu gọn; công ty chỉ quản lý thông tin, liên kết xem khu vực.
- Đơn vị: thêm/xem/sửa/xóa cập nhật tạm trong bộ nhớ phiên; không dùng localStorage/backend. Tải lại trang khôi phục dữ liệu ban đầu. Không xóa đơn vị đã có phân công/lịch sử; không tạm ngưng khi chưa bàn giao khu vực.
- Báo cáo gồm nhóm chưa phân công; tách công ty báo đã thu và kế toán xác nhận; so tiến độ với mục tiêu tại mốc báo cáo, không dùng ngưỡng cố định cho mọi ngày.
- Module mới: `assets/js/commune-review.js`. Phân công và thông báo vẫn là biểu mẫu mô phỏng không cập nhật dữ liệu; riêng CRUD đơn vị được cập nhật trong phiên theo yêu cầu mới.
- Kiểm tra phần tối ưu 2.6: `node work/test_commune_review.js`. Các bài kiểm tra quản lý tuyến/đơn vị v2.4–2.5 chứa kỳ vọng giao diện cũ.

## Lịch sử cập nhật 2.5

- Quản lý khu vực/tổ dân phố tại `#commune/routes`; phân công riêng gom rác và thu tiền.
- Cảnh báo thiếu đơn vị, chặn giao đè thời gian; popup hỗ trợ bàn giao và giữ lịch sử.
- Trang `#commune/collection-units` liên kết hai chiều công ty ↔ khu vực.
- `#commune/debts` tổng hợp tiến độ thu tiền theo công ty; lọc kỳ/khu vực/công ty, popup thông báo đầu mối.
- Module giao diện: `assets/js/commune-management.js`. Bộ dữ liệu 24 tổ là minh họa riêng của phần review mới.
- Kiểm tra cập nhật: `node work/test_commune_management.js` từ thư mục workspace.
- Các mô tả phân tuyến và xã đốc thúc người đi thu ở mục lịch sử 2.4 bên dưới đã được thay thế trên ba màn hình cán bộ xã nêu trên.

## Xem trước ứng dụng người dân (giai đoạn 2)

- Bấm “Ứng dụng người dân” trên thanh trên cùng để mở khung điện thoại mô phỏng gồm bốn nhóm chức năng: gửi phản ánh/kiến nghị, thanh toán phí (tiền vào tài khoản công ty hoặc mã nhân viên thu, công ty phát biên lai), Chợ đồ cũ và đăng ký thu gom rác cồng kềnh.
- Module giao diện: `assets/js/citizen-mobile.js`, kiểu dáng ở `assets/css/mobile-preview.css`. Phần này độc lập với `ROLE_CONFIG`/routing của bản desktop.
- Cấu trúc chức năng lấy cảm hứng từ ứng dụng GRAC (grac.vn) và mẫu hình app dịch vụ công trong nước; không sao chép nguyên bản giao diện GRAC.
- Toàn bộ dữ liệu, biên lai và thao tác đều là mô phỏng; chưa gắn biểu giá chính thức cho dịch vụ thu gom cồng kềnh.
- Phiên bản 17/09/2026 làm lại theo ngôn ngữ thị giác của ứng dụng GRAC do người dùng cung cấp (header xanh đậm, thẻ trắng bo tròn, lưới 6 icon tròn, tab bar Trang chủ · Chợ đồ cũ · Thông báo · Tài khoản, form có dấu * và nút xanh đậm dính đáy). 17 màn hình: trang chủ, thông báo (lọc Tất cả/Phản ánh/Giao dịch), tài khoản, thông tin hộ, lịch thu gom, biên lai, phản ánh (danh sách/gửi/chi tiết), thanh toán + biên lai, chợ đồ cũ (bảng tin/chi tiết/đăng bài), rác cồng kềnh (đăng ký/trạng thái).
- Chụp màn hình để soát: mở `index.html?citizen=<màn>` (ví dụ `?citizen=payment`) sẽ mở thẳng khung điện thoại; ảnh mẫu 16 màn lưu tại `screenshots/mobile/`.

## Chạy prototype

Mở trực tiếp `index.html` bằng Chrome hoặc Edge. Prototype không cần máy chủ, cài đặt thư viện hoặc kết nối mạng.

## Phạm vi

- HTML5, CSS3 và JavaScript thuần.
- Một ứng dụng responsive dùng chung cho sáu vai trò nội bộ trong prototype hiện hành.
- Người dân thuộc giai đoạn 2 nên không có vai trò đăng nhập trong bản này; nút “Ứng dụng người dân” trên thanh trên cùng chỉ mở bản xem trước giao diện di động để minh họa, không phải một không gian làm việc thật.
- Dữ liệu, QR, sao kê và chứng từ đều là minh họa.
- Các form mở trong modal và không lưu dữ liệu.

## Vai trò

1. Cán bộ xã.
2. Công ty thu gom.
3. Nhân viên thu do công ty phân công nội bộ.
4. Kế toán.
5. Lãnh đạo.
6. Quản trị hệ thống.

## Nội dung cập nhật 2.4

- Xã tạo hồ sơ hộ, phân loại `attributeType`, sau đó gán đơn vị và tuyến.
- Theo trạng thái lịch sử 2.4, 11 công ty từng chỉ là danh mục phối hợp; quyết định này đã được 2.7 thay thế bằng tài khoản công ty có phạm vi dữ liệu riêng.
- Xã giao trực tiếp tuyến và phạm vi dữ liệu cho người đi thu.
- Cấu trúc quản lý tuyến: khu vực → tuyến → nhà thầu → hộ/chủ nguồn thải.
- 11 nhà thầu phụ trách nhiều tuyến; dữ liệu minh họa dùng 82 tuyến, mỗi tuyến 400–800 hộ.
- Danh sách tuyến bỏ cột địa bàn và người đi thu, có bộ lọc nhà thầu và thao tác sửa.
- Bấm mã tuyến mở trang chi tiết có bản đồ tập trung một tuyến và danh sách hộ/chủ nguồn thải.
- Hộ nợ nhiều không bị tự động cắt dịch vụ; có hồ sơ cảnh báo, duyệt tạm ngưng và thông báo nhà thầu.
- Thay nhà thầu tạo assignment mới, kết thúc assignment cũ và giữ toàn bộ lịch sử.
- Nếu nhà thầu chỉ được giao thực hiện/thu thì giữ hợp đồng; nếu là bên ký hợp đồng thì tạo hợp đồng mới.
- Tuyến thu gom và tuyến thu tiền được quản lý độc lập, có bộ lọc loại tuyến và quan hệ liên kết.
- Người đi thu nhập kết quả từng hộ trên web hoặc theo lô Excel.
- Khóa hộ–kỳ–dịch vụ liên kết dòng phải thu với các dòng đã thu.
- Xã theo dõi công nợ qua tiến độ người/tuyến và đốc thúc đầu mối; người đi thu xử lý từng hộ.
- Hai màn hiện trường có tìm kiếm/lọc thật, lưới desktop và danh sách một cột trên mobile.
- Hộ đã chấm dứt bị khóa thu/QR; phát sinh mới chuyển thành ngoại lệ.
- Dashboard lãnh đạo có thu–chi, hiệu quả đơn vị và tỷ lệ thành công.
- Màn quản trị “Luồng tiền & QR” so sánh các mô hình tài khoản nhận.

## Cấu trúc

```text
prototype-v2/
├── index.html
├── README.md
└── assets/
    ├── css/
    │   ├── tokens.css
    │   ├── app.css
    │   └── responsive.css
    └── js/
        ├── config.js
        ├── data.js
        ├── dialogs.js
        ├── views.js
        ├── commune-management.js
        ├── commune-review.js
        ├── data-intake.js
        ├── single-unit-area.js
        ├── spec-alignment.js
        ├── company-routing.js
        └── app.js
```

## Lưu ý nghiệp vụ

Biểu giá và số liệu sử dụng trong prototype chỉ nhằm trực quan hóa luồng. Hệ thống thật phải cấu hình theo văn bản pháp lý, địa bàn, nhóm đối tượng và thời gian hiệu lực; không hard-code mức giá từ prototype.
