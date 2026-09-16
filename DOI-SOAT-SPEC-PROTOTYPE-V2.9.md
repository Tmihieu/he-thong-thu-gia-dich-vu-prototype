# Đối soát đặc tả và prototype — phiên bản 2.9

**Ngày đối soát:** 15/09/2026  
**Prototype:** `outputs/prototype-v2/index.html`  
**Đặc tả chuẩn:** `outputs/prototype-v2/SPEC-TONG-HOP.md`  
**Nguồn nghiệp vụ kiểm tra chéo:** `Tai-lieu-mo-ta-quy-trinh-nghiep-vu-v4.1.docx.md`

## 1. Kết luận

Prototype 2.8 đã khớp tốt phần tiếp nhận/đối chiếu Excel và phần quản lý một công ty trên một khu vực. Tuy nhiên, luồng tài chính và quyền của công ty/kế toán/lãnh đạo chưa đúng với tài liệu nghiệp vụ. Phiên bản 2.9 đã sửa các thiếu sót có căn cứ rõ; các vấn đề chưa được chốt vẫn được giữ ở trạng thái mở, không tự suy diễn.

## 2. Thiếu sót đã phát hiện và đã sửa

| # | Thiếu hoặc lệch ở bản 2.8 | Ảnh hưởng | Sửa trong 2.9 |
|---:|---|---|---|
| 1 | Tài khoản công ty chỉ có hai màn dữ liệu Excel | Không thể hiện công ty là actor trực tiếp thu tiền hộ và nộp phần xử lý | Thêm tổng quan, hộ được giao, cập nhật kết quả, biên lai, nghĩa vụ phần xử lý và kê khai tiền đã nộp |
| 2 | Phạm vi hộ vận hành chưa phân biệt rõ với dòng Excel nguồn | Có nguy cơ lấy khai báo một phía làm danh sách chính thức | Màn “Hộ được giao” chỉ cho thao tác với hộ đã xác minh; hộ chờ xác minh bị khóa |
| 3 | “Đối soát đơn vị” chỉ so hồ sơ dịch vụ/khoản thu chung | Thiếu công thức lõi của tài liệu nghiệp vụ | Đổi thành đối soát phần xử lý: số hộ đủ điều kiện × đơn giá xử lý so với thực nộp về xã |
| 4 | Số công ty kê khai và tiền thực có trên sao kê chưa tách | Có thể xác nhận nhầm khoản chưa về | Thêm kê khai công ty; kế toán có sao kê tiền xử lý và khoản nộp chưa rõ; kê khai không tự xác nhận |
| 5 | Kế toán đang đối soát tiền mặt theo từng người thu với xã | Không đúng luồng hiện tại: công ty trực tiếp quản lý tiền dân | Chuyển màn kế toán sang tiền phần xử lý về xã; tiền mặt/chốt ca được ghi là nghiệp vụ nội bộ công ty |
| 6 | Lãnh đạo có màn “Chốt kỳ”; kế toán không có | Sai phân tách trách nhiệm trong tài liệu: lãnh đạo xác nhận, kế toán khóa sổ | Chuyển “Chốt & khóa sổ” sang kế toán; bỏ khỏi menu lãnh đạo |
| 7 | Dashboard lãnh đạo hiển thị nhiều số tiền minh họa như kết quả thật | Dễ tạo kết luận sai khi chưa có CSDL hộ, đơn giá và sao kê | Dashboard 2.9 hiển thị mức sẵn sàng và các nguồn còn thiếu, không kết luận chênh lệch |
| 8 | Cấu hình QR ngầm ưu tiên tài khoản xã | Mâu thuẫn với luồng tiền hiện tại | Đánh dấu QR thu online là giai đoạn sau; tách tiền hộ vào công ty với phần xử lý về xã |
| 9 | Spec tổng còn các đoạn tuyến thu gom/tuyến thu tiền độc lập và xã giao người thu | Mâu thuẫn với quyết định một công ty/khu vực và xã chỉ làm việc với công ty | Sửa TH-01, TH-06, TH-18, BR-19, BR-19A, luồng đầu-cuối, mô hình dữ liệu, phân quyền và phân bổ màn hình |
| 10 | Không có tiêu chí kiểm thử riêng cho luồng mới | Khó chứng minh prototype khớp đặc tả | Thêm TC-32 đến TC-37 và `work/test_spec_alignment.js` |
| 11 | Quản trị người dùng/quyền chưa có actor công ty | Không thể hiện cách giới hạn dữ liệu theo từng công ty | Thêm tài khoản công ty mẫu, vai trò công ty/nhân viên và phạm vi “đúng một công ty” vào màn quản trị |

## 3. Nội dung đã khớp, không cần sửa

- Một khu vực/tổ dân phố chỉ có một công ty thu gom và thu tiền trong cùng thời gian hiệu lực.
- Thay công ty tạo phân công mới, giữ lịch sử, kiểm tra giao trùng và yêu cầu bàn giao.
- Công ty có tài khoản; dữ liệu được giới hạn theo công ty.
- Công ty gửi Excel qua kênh bên ngoài, cán bộ xã import.
- Hai cấu trúc cột Excel có thể ánh xạ về bộ trường chung; không tự đoán trường thiếu.
- Không tự gộp hộ, tự chọn nguồn đúng, tự xác nhận công ty phục vụ hoặc tự duyệt danh sách chuẩn.
- Khu vực chưa rõ công ty giữ trạng thái chưa phân công; không tạo công ty giả.
- Xã theo dõi tiến độ theo công ty và liên hệ đầu mối; không điều hành nhân viên thu.
- CRUD công ty ở chế độ mô phỏng trong phiên; không xóa/tạm ngưng công ty còn phân công/lịch sử.

## 4. Điểm còn mở — chưa sửa vì chưa đủ thông tin

| Mức | Cần xác nhận | Lý do không tự triển khai |
|---|---|---|
| P0 | Danh sách hộ chuẩn do ai phê duyệt và quy trình biến dòng nguồn thành hồ sơ chính thức | Hiện chỉ có nhiều nguồn công ty, chưa có cơ sở hộ độc lập |
| P0 | Đơn giá “phần xử lý”, căn cứ pháp lý, ngày hiệu lực và đối tượng được tính | Không được tự đặt số tiền trong prototype |
| P0 | Tài khoản xã nhận phần xử lý, mẫu sao kê/API và quy tắc nhận diện công ty–kỳ | Chưa thể chạy đối soát thực nộp |
| P0 | Chu kỳ nộp, hạn nộp, nộp một phần/thừa và cách xử lý chênh lệch | Ảnh hưởng trạng thái và báo cáo |
| P0 | Chuẩn biên lai từng công ty và dữ liệu công ty phải gửi lại xã | Công ty là bên phát biên lai, không thể dùng mẫu xã khi chưa xác nhận |
| P1 | Vai trò và quyền của Trung tâm Cung ứng dịch vụ công | Tài liệu có actor này nhưng người dùng đã yêu cầu tạm bỏ qua phần chưa rõ |
| P1 | Công ty quản lý tài khoản nhân viên như thế nào | Prototype giữ không gian nhân viên riêng nhưng không giả định cơ cấu nội bộ |
| P1 | QR thu online và khả năng lấy sao kê tài khoản từng công ty | Được xác nhận là chưa tính trong giai đoạn hiện tại |

Tài liệu `THIET-KE-CSDL.md` vẫn chứa DDL của mô hình cũ. Đã gắn cảnh báo không dùng nguyên trạng; việc thiết kế lại schema/DDL là một đầu việc riêng sau khi các điểm P0 được BA, kế toán và lãnh đạo xác nhận.

## 5. Quy tắc dữ liệu tối thiểu sau đối soát

1. `sourceUnitId` chỉ nói công ty nào cung cấp dòng Excel.
2. `AreaAssignment.unitId` nói công ty nào được xã giao khu vực.
3. `ServiceAssignment` chỉ được tạo sau xác minh và là nguồn phạm vi hộ vận hành.
4. `ProcessingObligation` chỉ được tính khi có danh sách hộ đủ điều kiện và phiên bản đơn giá hợp lệ.
5. `ProcessingRemittance` do công ty kê khai không phải tiền đã xác nhận.
6. `BankTransaction` trên tài khoản xã là nguồn thực nộp; thiếu mã thì giữ hàng chờ.
7. `Reconciliation` chỉ có kết luận khi cả nghĩa vụ và thực nộp đều truy nguyên được.
8. Lãnh đạo xác nhận `Report`; kế toán thực hiện `PeriodLock` sau khi mọi điều kiện đạt.

## 6. Tệp đã thay đổi

- `assets/js/config.js`: menu, trách nhiệm và phân quyền 2.9.
- `assets/js/spec-alignment.js`: các màn công ty, đối soát phần xử lý, khóa sổ và dashboard đã căn chỉnh.
- `assets/js/dialogs.js`: điều kiện khóa sổ bắt buộc.
- `index.html`: nạp module 2.9 và cập nhật phiên bản.
- `SPEC-TONG-HOP.md`: thêm quyết định hiện hành 2.9 và sửa các đoạn mâu thuẫn chính.
- `README.md`: hướng dẫn và phạm vi 2.9.
- `work/test_spec_alignment.js`: kiểm tra tự động quyền/màn hình/form/không gọi mạng.

## 7. Giới hạn prototype

Prototype vẫn là HTML/CSS/JavaScript thuần, không backend, không đọc Excel thật, không gọi ngân hàng, không lưu dữ liệu bền vững và không phát hành chứng từ pháp lý. Các form chỉ mô phỏng cấu trúc dữ liệu và kiểm tra nghiệp vụ.
