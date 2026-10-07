# Danh sách use case

Use case (UC) mô tả chuỗi tương tác giữa hệ thống và một tác nhân bên ngoài, kết thúc khi tác nhân đạt được một kết quả có giá trị. Tên UC luôn viết theo dạng **động từ + đối tượng**, chọn từ ngữ rõ nghĩa để chỉ đọc tên đã biết UC mang lại kết quả gì cho người dùng nào.

Khi xác định UC, nhóm đặt các câu hỏi sau cho từng tác nhân:

- Tác nhân dùng hệ thống để làm gì?
- Tác nhân có tạo, lưu, thay đổi, xóa hoặc đọc dữ liệu trong hệ thống không?
- Tác nhân có cần báo cho hệ thống về sự kiện hoặc thay đổi bên ngoài không?
- Tác nhân có cần được hệ thống báo khi có sự việc nhất định không?

Bảng dưới liệt kê các UC theo góp ý ngày 05/10/2026. Một số UC bản demo chưa làm theo, xem [thay-doi-gop-y-0510.md](thay-doi-gop-y-0510.md).

## Tác nhân và thuật ngữ

- **Quản trị viên:** quản lý tài khoản (kể cả tài khoản người đi thu), biểu giá, kỳ thu, danh mục địa bàn, hồ sơ công ty và tài khoản ngân hàng nhận chuyển khoản của xã.
- **Cán bộ xã:** quản lý hồ sơ hộ/cơ sở, phát hành khoản phải thu, thu tiền công ty nộp về xã, xử lý phản ánh, kiểm duyệt chợ đồ cũ.
- **Lãnh đạo xã:** xem tiến độ, đối soát, dashboard và báo cáo. Không ghi nghiệp vụ.
- **Công ty môi trường:** đơn vị thu gom được xã giao khu vực. Theo dõi người đi thu và nhận tiền mặt từ họ.
- **Người đi thu:** nhân viên của công ty, thu tiền tại mọi hộ có khoản phải thu của công ty.
- **Người dân:** dùng ứng dụng di động bằng tài khoản gắn với hộ.
- **SePay:** dịch vụ báo giao dịch ngân hàng. **Bộ hẹn giờ:** tác vụ tự chạy theo lịch của hệ thống.
- **Hộ/cơ sở:** hộ gia đình, nguồn thải nhỏ hoặc nguồn thải lớn có đăng ký thu phí. Nguồn thải lớn thải từ 9.000 kg/tháng (300 kg/ngày), dưới mức này là nguồn thải nhỏ; chủ nhà trọ cũng lập hồ sơ nguồn thải.
- **Tính theo nhân khẩu:** hộ gia đình đóng đơn giá một người × số nhân khẩu. Quản trị viên bật trong biểu giá cho toàn xã hoặc một số địa bàn.
- **Đăng ký cân:** cách tính theo kg cho nguồn thải lớn và nguồn thải nhỏ chọn như nguồn thải lớn. Cán bộ xã nhập định mức kg/tháng một lần.
- **Phí xử lý:** phần đơn giá thứ ba, chỉ có ở nhóm đăng ký cân; các nhóm khác được hỗ trợ nên không có. Tiền phí xử lý thu được đi cùng tiền vận chuyển về xã (xã nộp tiếp về Sở Nông nghiệp và Môi trường theo QĐ 65/2026); công ty chỉ giữ phần thu gom.
- **Khu vực:** ấp hoặc tổ dân phố, là đơn vị phân công cho công ty.
- **Khoản phải thu:** số tiền một hộ/cơ sở phải đóng trong một kỳ. Với người dân, đây là khoản phải trả.
- **Phiếu yêu cầu thu (YCT):** đợt phát hành khoản phải thu của một kỳ cho công ty.
- **Phiếu thu:** chứng từ cán bộ xã lập khi nhận tiền công ty nộp về xã. Mỗi kỳ công ty có thể nộp nhiều lần.
- **Phiếu chi trả công ty:** chứng từ cán bộ xã lập khi xã trả lại tiền cho công ty, vì phải nộp xã của công ty trong kỳ âm (phí thu gom của số đã thu, kể cả chuyển khoản, lớn hơn tiền mặt công ty đã thu). Mỗi kỳ xã có thể trả nhiều lần.
- **Phải nộp xã** = tiền mặt công ty đã thu − điều chỉnh kỳ trước − phần phí thu gom của toàn bộ số đã thu, gồm cả tiền hộ chuyển khoản vào tài khoản của xã (phí thu gom tính theo biểu giá). Phí vận chuyển và phí xử lý không được trừ, công ty nộp về xã. Nếu kết quả âm, xã trả lại công ty phần chênh.
- **Hạn nộp:** hạn duy nhất của kỳ, là hạn công ty nộp tiền về xã. Hộ cũng phải đóng trong hạn này.
- **Công nợ của hộ:** khoản hộ chưa đóng khi kỳ đã khóa. Hộ nộp được ở kỳ sau; tiền đó tính vào kỳ đang thu.

Luồng nghiệp vụ chính gồm các bước:

1. Lập biểu giá và tạo kỳ thu.
2. Cập nhật hồ sơ hộ và đăng ký thu phí.
3. Phân công khu vực cho công ty.
4. Phát hành khoản phải thu.
5. Thu tiền mặt, hoặc chuyển khoản VietQR vào tài khoản của xã.
6. Công ty nộp tiền về xã, xã lập phiếu thu.
7. Xem đối soát.
8. Khóa kỳ; khoản chưa đóng thành công nợ của hộ.

## Bảng use case

| ID | Tên use case | Nhóm chức năng | Mô tả use case |
| --- | --- | --- | --- |
| UC-01 | Đăng nhập hệ thống | Tài khoản và xác thực | Quản trị viên, cán bộ xã, lãnh đạo xã, công ty môi trường và người đi thu đăng nhập trang web bằng tên đăng nhập và mật khẩu. Người dân đăng nhập ứng dụng bằng số điện thoại đã đăng ký của hộ và mã OTP (bản demo dùng mã OTP mô phỏng). Hệ thống xác thực rồi mở các màn hình theo vai trò của người dùng. |
| UC-02 | Đăng xuất hệ thống | Tài khoản và xác thực | Người dùng kết thúc phiên làm việc trên thiết bị đang dùng. Hệ thống xóa phiên đăng nhập trên thiết bị, các màn hình cần xác thực không mở được cho đến khi đăng nhập lại. |
| UC-03 | Cấp và cập nhật tài khoản người dùng | Tài khoản và xác thực | Quản trị viên tạo tài khoản nội bộ, gán vai trò và công ty, sửa thông tin, khóa hoặc mở khóa và đặt lại mật khẩu. Hệ thống áp dụng thay đổi ngay; tài khoản bị khóa không đăng nhập được. |
| UC-04 | Cấp và cập nhật tài khoản người đi thu | Tài khoản và xác thực | Quản trị viên tạo tài khoản người đi thu cho từng công ty, sửa thông tin, khóa hoặc mở khóa và đặt lại mật khẩu. Mỗi tài khoản người đi thu thuộc một công ty. |
| UC-05 | Nhập danh sách hộ/cơ sở từ Excel | Hồ sơ hộ/cơ sở | Cán bộ xã tải tệp mẫu .xlsx, điền danh sách hộ/cơ sở theo mẫu (loại: hộ gia đình, nguồn thải nhỏ hoặc nguồn thải lớn) rồi tải tệp lên. Hệ thống kiểm tra từng dòng và hiện bản xem trước kèm lỗi, kể cả hồ sơ nghi trùng với hồ sơ đã có. Cán bộ sửa tệp cho hết lỗi rồi xác nhận, hệ thống tạo các hồ sơ mới: hộ gia đình kèm đăng ký theo số người, nguồn thải nhỏ / lớn ở trạng thái chờ đăng ký (mã `NN` / `NL`). |
| UC-06 | Tạo hồ sơ hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã nhập loại đối tượng (hộ gia đình, nguồn thải nhỏ hoặc nguồn thải lớn), chủ hộ hoặc người đại diện, số điện thoại, địa chỉ chọn từ tổng quát đến chi tiết (ấp, đường đi qua ấp, hẻm của đường, số nhà), số nhân khẩu và đăng ký thu phí ban đầu. Nhóm giá chỉ chọn trong các nhóm hợp loại: hộ gia đình theo số người hoặc theo nhân khẩu; nguồn thải nhỏ theo QĐ hoặc đăng ký cân; nguồn thải lớn chỉ đăng ký cân. Nhà giáp ranh ở đường của ấp khác thì tìm cả xã (cả tên cũ); đường, hẻm chưa có trong danh mục thì ghi nhận "chờ xác minh" (Goong chỉ gợi ý tham khảo, chỉ đường trong xã). Cán bộ xã không thêm đường vào danh mục. Hệ thống cảnh báo hồ sơ nghi trùng rồi lưu hồ sơ. |
| UC-07 | Tra cứu hồ sơ hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã tìm kiếm và lọc hồ sơ hộ/cơ sở (theo loại hộ gia đình, nguồn thải nhỏ, nguồn thải lớn), rồi xem chi tiết thông tin hộ, đăng ký thu phí và lịch sử số nhân khẩu. Kết quả dùng để kiểm tra trước khi cập nhật hoặc phát hành khoản thu. |
| UC-08 | Cập nhật thông tin hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã sửa thông tin hộ, địa chỉ, số điện thoại và số nhân khẩu. Hệ thống lưu thay đổi. Riêng số nhân khẩu được ghi lịch sử (ngày đổi, người sửa) để tra cứu căn cứ tính tiền. Hộ tính theo nhân khẩu: số mới áp ngay cho khoản chưa lập. Hộ tính theo nhóm ≤2 / ≥3 người: nhóm mới áp từ kỳ sau. Đổi loại đối tượng bị chặn nếu đăng ký đang hiệu lực dùng nhóm giá không hợp loại mới. |
| UC-09 | Cập nhật đăng ký thu phí | Hồ sơ hộ/cơ sở | Cán bộ xã thêm, sửa hoặc kết thúc đăng ký thu phí của hộ/cơ sở. Đăng ký gồm nhóm giá và ngày hiệu lực; nhóm tính theo kg (nguồn thải nhỏ 500 đến dưới 9.000 kg, đăng ký cân) có thêm định mức kg/tháng, cán bộ nhập một lần. Hộ gia đình chọn theo số người hoặc theo nhân khẩu (hộ đang theo số người chỉ chuyển được sang theo nhân khẩu); nguồn thải nhỏ chọn theo QĐ hoặc đăng ký cân; nguồn thải lớn chỉ đăng ký cân. Đổi nhóm giá của đăng ký đang chạy áp từ kỳ sau: đăng ký cũ kết thúc ngày cuối kỳ đang thu, đăng ký mới bắt đầu ngày đầu kỳ sau. Hệ thống dùng đăng ký đang hiệu lực làm căn cứ tính tiền. Cờ miễn 100% chỉ hiển thị, không sửa trên màn này. |
| UC-10 | Ngừng cung cấp dịch vụ cho hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã chọn ngày ngừng và nhập lý do khi hộ/cơ sở thôi dùng dịch vụ. Hệ thống chuyển hồ sơ sang Đã chấm dứt và kết thúc đăng ký thu phí đang hiệu lực; hộ không còn được lập khoản phải thu ở các kỳ sau. |
| UC-11 | Báo hộ chuyển đi hoặc sai thông tin | Hồ sơ hộ/cơ sở | Người đi thu chọn một hộ trong danh sách thu, chọn loại vấn đề (đã chuyển đi, sai số nhà, sai số thành viên hoặc nhóm giá, sai số tiền) và mô tả. Với hộ tính theo nhân khẩu, sai số thành viên làm sai thẳng số tiền. Hệ thống gửi thông báo cho cán bộ xã và công ty để kiểm tra, cập nhật hồ sơ. |
| UC-12 | Xem thông tin hộ | Hồ sơ hộ/cơ sở | Người dân xem thông tin hộ gắn với tài khoản, gồm loại đối tượng và nhóm giá (kể cả theo nhân khẩu, đăng ký cân). |
| UC-13 | Cập nhật danh mục địa bàn | Khu vực và công ty | Quản trị viên sửa thông tin địa bàn và khu vực (ấp, tổ dân phố). Cán bộ xã dùng danh mục này để nhóm hộ/cơ sở và phân công khu vực cho công ty. Hệ thống dùng danh mục để lập báo cáo. |
| UC-15 | Cập nhật hồ sơ công ty môi trường | Khu vực và công ty | Quản trị viên thêm hoặc sửa công ty: tên, loại, số hợp đồng và thời hạn, trạng thái Đang hoặc Ngừng hợp tác. Khi công ty chuyển sang Ngừng hợp tác, hệ thống kết thúc mọi phân công khu vực của công ty đó. |
| UC-16 | Tra cứu thông tin công ty môi trường | Khu vực và công ty | Cán bộ xã xem danh sách công ty theo trạng thái hợp tác, xem thông tin chi tiết và tiến độ thu, nộp tiền trong kỳ của từng công ty. |
| UC-17 | Phân công khu vực cho công ty môi trường | Khu vực và công ty | Cán bộ xã chọn khu vực, công ty phụ trách và ngày hiệu lực. Hệ thống lưu phân công cùng lịch sử. Khoản phải thu của hộ trong khu vực được giao cho công ty đang phụ trách. |
| UC-19 | Lập và ban hành biểu giá | Biểu giá và kỳ thu | Quản trị viên lập dự thảo biểu giá gồm căn cứ pháp lý, ngày hiệu lực, đơn giá thu gom, vận chuyển và xử lý cho từng nhóm giá (hộ có từ 2 người trở xuống, hộ từ 3 người, hộ theo nhân khẩu, nguồn thải nhỏ theo bậc, nguồn thải nhỏ theo kg, đăng ký cân; chỉ đăng ký cân có phí xử lý), rồi ban hành. Ô "Thu hộ gia đình theo nhân khẩu" bật cho toàn xã hoặc chọn một hay nhiều địa bàn; khi bật thì bắt buộc nhập đơn giá một người. Bản trước tự kết thúc khi bản mới có hiệu lực. Các phiên bản cũ được giữ để tra cứu mức thu đã áp dụng. Loại phí là danh mục có sẵn. |
| UC-20 | Tạo kỳ thu | Biểu giá và kỳ thu | Quản trị viên tạo kỳ thu tháng ở trạng thái dự thảo, kèm hạn nộp (hạn duy nhất của kỳ: công ty nộp về xã, hộ đóng trong hạn này) và biểu giá áp dụng, hoặc đặt quy tắc tự tạo kỳ kế tiếp. Kỳ dự thảo chờ cán bộ xã mở tại UC-21. |
| UC-21 | Phát hành khoản phải thu | Biểu giá và kỳ thu | Cán bộ xã lập phiếu yêu cầu thu cho kỳ, rồi xem trước danh sách khoản phải thu theo công ty. Hệ thống liệt kê hộ bị bỏ qua kèm lý do: hộ không hoạt động, không có đăng ký, khu vực chưa giao công ty, đã có khoản trong kỳ, thiếu định mức kg. Hộ gia đình ở địa bàn mà biểu giá của kỳ bật nhân khẩu, hoặc có đăng ký theo nhân khẩu, được tính đơn giá một người × số nhân khẩu hiện tại; khoản ghi lại nhóm thực tính và số nhân khẩu. Cán bộ sửa dữ liệu nếu cần rồi phát hành. Lần phát hành đầu tiên cũng mở kỳ sang Đang thu. Cán bộ có thể lập phiếu bổ sung cho hộ chưa có khoản trong kỳ. |
| UC-22 | Tra cứu khoản phải thu | Biểu giá và kỳ thu | Cán bộ xã xem danh sách khoản phải thu, lọc theo kỳ, công ty, khu vực và trạng thái (chưa thu, đã thu, miễn, đã xóa nợ). Khoản chưa thu đã qua hạn được hiển thị là quá hạn. Mỗi khoản hiện nhóm giá thực tính, khoản theo nhân khẩu hiện thêm số người. |
| UC-23 | Ghi nhận tiền mặt đã thu | Thu tiền | Người đi thu chọn khoản phải thu của hộ thuộc công ty mình và xác nhận đã thu đủ tiền mặt. Công ty có thể ghi thay, khi đó phải chọn người đi thu. Hệ thống không ghi nhận thu một phần. Hệ thống lưu thanh toán, tạo mã thanh toán, ghi lại người đi thu đã thu khoản đó và gửi xác nhận đến ứng dụng của người dân. |
| UC-24 | Hiển thị mã VietQR để hộ chuyển khoản | Thu tiền | Người đi thu mở mã VietQR của khoản phải thu cho hộ quét tại nhà. Mã có tài khoản của xã, số tiền và mã tham chiếu. Kết quả chuyển khoản được xác nhận tại UC-26. |
| UC-25 | Thanh toán khoản phải trả bằng VietQR | Thu tiền | Người dân chọn khoản cần đóng trên ứng dụng để nhận mã VietQR và thông tin chuyển khoản, rồi chuyển khoản vào tài khoản của xã qua ứng dụng ngân hàng. Kết quả giao dịch được xác nhận tại UC-26. |
| UC-26 | Xác nhận thanh toán từ giao dịch ngân hàng | Thu tiền | SePay gửi thông tin giao dịch đến hệ thống. Hệ thống loại giao dịch trùng, rồi đối chiếu mã tham chiếu, đúng tài khoản của xã và số tiền với khoản phải thu. Giao dịch khớp thì khoản được ghi đã thu và người dân được báo. Giao dịch không khớp được lưu kèm lý do để chờ đối chiếu. |
| UC-27 | Xem giao dịch chuyển khoản chờ đối chiếu | Thu tiền | Cán bộ xã xem các giao dịch chuyển khoản vào tài khoản của xã mà hệ thống chưa khớp được với khoản phải thu (thời gian, số tiền, nội dung chuyển khoản, ngân hàng, mã giao dịch, lý do chưa ghi nhận), để liên hệ hộ xử lý. Màn này mở từ menu hoặc từ cảnh báo sao kê QR ở màn Đối soát (UC-38). Còn giao dịch chưa xác định công ty thì chưa khóa được kỳ (UC-39). |
| UC-28 | Nhận bàn giao tiền mặt từ người đi thu | Thu tiền | Công ty môi trường ghi nhận số tiền mặt nhận từ người đi thu. Số tiền không được vượt số người đó đang giữ, ngày không được sau hôm nay. Hệ thống cập nhật tiền mặt đang giữ và lưu lịch sử bàn giao. |
| UC-29 | Theo dõi tiền mặt đang giữ | Thu tiền | Người đi thu xem tổng tiền mặt đã thu, đã bàn giao cho công ty và còn đang giữ, cùng lịch sử bàn giao. |
| UC-30 | Xem lịch sử thu của hộ | Thu tiền | Người đi thu xem các khoản phải thu và thanh toán qua các kỳ của một hộ thuộc công ty mình, để trả lời hộ khi có thắc mắc. |
| UC-31 | Tra cứu khoản phải trả và xác nhận thanh toán | Thu tiền | Người dân xem các khoản cần đóng và tiền còn nợ của hộ, cùng các khoản đã thanh toán. Mỗi khoản đã thanh toán có xác nhận thanh toán; đây không phải biên lai pháp lý. |
| UC-32 | Theo dõi tiến độ thu và nộp tiền của xã | Nộp tiền về xã và khóa kỳ | Cán bộ xã và lãnh đạo xã xem tiến độ theo công ty và theo tổ. Số tổng: phải thu, đã thu (tiền mặt và chuyển khoản, nêu riêng phần thu công nợ kỳ cũ), phải nộp xã, đã nộp, còn phải nộp và công nợ hộ (số hộ và tổng tiền các khoản chưa thu của kỳ đã khóa; mở được danh sách hộ nợ). Theo công ty: phải thu, đã thu, phải nộp xã, đã nộp, còn phải nộp, tỷ lệ nộp (đã nộp so với phải nộp xã) và đã nộp đủ hay chưa; công ty nào còn phải nộp của kỳ trước thì hiện ở cảnh báo đầu trang. Theo tổ: số hộ, khoản đã thu, phải thu, đã thu, tỷ lệ thu và số hộ còn nợ kỳ cũ. Có thể mở danh sách hộ còn phải thu của từng tổ. Chỉ cán bộ xã gửi nhắc nộp (UC-34); lãnh đạo chỉ xem. |
| UC-33 | Theo dõi tiến độ thu của công ty | Nộp tiền về xã và khóa kỳ | Công ty môi trường xem tổng quan kỳ của mình gồm phải thu, đã thu, đã nộp và còn phải nộp xã. Với từng người đi thu, công ty xem lịch sử thu và danh sách hộ người đó đã thu, có thể lọc theo tình trạng thu. |
| UC-34 | Nhắc công ty nộp tiền | Nộp tiền về xã và khóa kỳ | Cán bộ xã soạn lời nhắc nộp tiền cho công ty còn phải nộp. Hệ thống gửi thông báo đến công ty và lưu lịch sử nhắc. |
| UC-35 | Lập phiếu thu tiền công ty nộp về xã | Nộp tiền về xã và khóa kỳ | Khi nhận tiền, cán bộ xã lập phiếu thu từ màn Đối soát (UC-38) hoặc tab Phiếu thu công ty: chọn công ty, kỳ, số tiền, hình thức và ngày nộp, rồi in phiếu. Số tiền điền sẵn bằng số công ty còn phải nộp của kỳ; cán bộ sửa được nhưng không được vượt số đó. Công ty có thể nộp nhiều lần trong một kỳ. Hệ thống cập nhật lũy kế đã nộp, số còn phải nộp và báo cho công ty. |
| UC-36 | Báo sai sót phiếu thu | Nộp tiền về xã và khóa kỳ | Công ty môi trường xem các phiếu thu xã lập cho mình, kèm lũy kế đã nộp. Khi phát hiện phiếu sai, công ty gửi báo sai sót trên phiếu đó và theo dõi kết quả xã xử lý. |
| UC-37 | Xử lý sai sót phiếu thu | Nộp tiền về xã và khóa kỳ | Cán bộ xã xem các báo sai sót của công ty, kiểm tra rồi đánh dấu đã xử lý kèm ghi chú. Hệ thống không sửa phiếu đã lập và báo kết quả cho công ty. |
| UC-38 | Xem đối soát công ty theo kỳ | Nộp tiền về xã và khóa kỳ | Cán bộ xã và lãnh đạo xã xem đối soát tiền giữa xã và từng công ty trong kỳ. Đầu trang có ba ô tổng của kỳ: xã đang giữ (QR đã nhận + đã thu từ công ty − đã chi cho công ty) trừ xã được hưởng (phí vận chuyển và phí xử lý trong QR và trong tiền mặt) ra số xã đang thừa hoặc thiếu. Bảng theo công ty có nhóm Xã nhận qua QR và nhóm Cty thu tiền mặt, mặc định chỉ hiện cột Tổng; bấm biểu tượng ở góc tiêu đề nhóm để xem chi tiết vận chuyển, thu gom, xử lý. Cột Kết quả ghi số công ty còn phải nộp xã, số âm khi xã còn phải trả lại công ty, hoặc Khớp khi hai bên đã bù trừ xong; lọc được Chưa khớp, Đã khớp. Cột Phiếu cho cán bộ xã lập phiếu thu (UC-35) hoặc phiếu chi trả (UC-55) ngay trên dòng, hoặc xem phiếu đã lập. Khi sao kê QR còn giao dịch chưa xác định công ty, đầu bảng hiện cảnh báo kèm số giao dịch, số tiền và nút sang UC-27. Cán bộ xã khóa kỳ từ màn này (UC-39); lãnh đạo chỉ xem. |
| UC-39 | Khóa kỳ thu | Nộp tiền về xã và khóa kỳ | Cán bộ xã yêu cầu khóa kỳ đang thu. Hệ thống chỉ cho khóa khi mọi công ty đã nộp đủ số phải nộp xã (tính trên tiền đã thu), xã đã trả đủ mọi khoản phải trả lại công ty (UC-55), không còn giao dịch chuyển khoản chưa xác định công ty (UC-27), đồng thời kỳ đã thu đủ mọi khoản hoặc đã đến hạn nộp. Không khóa được thì hệ thống nêu lý do bằng thông báo. Khoản hộ chưa đóng khi khóa thành công nợ của hộ; hộ nộp được ở kỳ sau và tiền đó tính vào kỳ đang thu. Sau khi khóa, số liệu của kỳ được giữ nguyên; điều chỉnh phát sinh sau đó được ghi vào kỳ đang thu. |
| UC-40 | Gửi và theo dõi phản ánh | Phản ánh và thông báo | Người dân chọn loại phản ánh, nhập nội dung và nơi xảy ra sự việc. Mặc định nơi xảy ra là địa chỉ hộ. Hệ thống ghi nhận và báo cán bộ xã; người dân theo dõi trạng thái và kết quả xử lý của các phản ánh của hộ. |
| UC-41 | Ghi nhận phản ánh thay người dân | Phản ánh và thông báo | Cán bộ xã ghi vào hệ thống các phản ánh nhận qua điện thoại hoặc trực tiếp tại xã. Phản ánh được xử lý theo cùng quy trình với phản ánh gửi từ ứng dụng. |
| UC-42 | Xử lý phản ánh | Phản ánh và thông báo | Cán bộ xã tiếp nhận phản ánh và chuyển cho công ty phụ trách khi cần. Khi có kết quả, cán bộ đóng phản ánh kèm kết quả giải quyết. Trạng thái đi theo thứ tự Mới → Đang xử lý → Đã giải quyết. Hệ thống báo kết quả cho người dân. |
| UC-43 | Phản hồi phản ánh được chuyển | Phản ánh và thông báo | Công ty môi trường xem các phản ánh xã chuyển cho mình và gửi phản hồi về cách xử lý. Hệ thống báo cán bộ xã để đóng phản ánh tại UC-42. |
| UC-44 | Gửi nhắc thanh toán cho hộ | Phản ánh và thông báo | Bộ hẹn giờ chạy lúc 08:00 hằng ngày và gửi thông báo trong ứng dụng ở 3 mốc: khi mở kỳ, trước hạn nộp 3 ngày và sau hạn nộp 1 ngày. Hạn nộp là hạn duy nhất của kỳ (hạn công ty nộp về xã); hộ cần đóng trong hạn này. Thông báo chỉ gửi đến hộ có tài khoản ứng dụng và còn khoản chưa thanh toán. |
| UC-45 | Xem thông báo | Phản ánh và thông báo | Người dùng web và người dân trên ứng dụng xem các thông báo gửi đến mình, như nhắc nộp tiền, phản ánh, phiếu thu, xác nhận thanh toán. Người dùng đánh dấu từng thông báo hoặc tất cả là đã đọc. |
| UC-46 | Xem dashboard điều hành | Báo cáo | Lãnh đạo xã xem tổng thu, nộp và nợ của kỳ, tỷ lệ thu và nộp theo công ty, theo tổ. Dashboard có các cảnh báo nộp chậm, nợ kỳ trước, tỷ lệ thu thấp để chỉ đạo kịp thời. |
| UC-47 | Xem và xuất báo cáo tổng hợp kỳ thu | Báo cáo | Lãnh đạo xã xem báo cáo tổng hợp kỳ thu, lọc theo công ty và tổ. Báo cáo gồm số hộ đã thu, số hộ miễn 100%, phải thu, đã thu, phải nộp và đã nộp xã. Lãnh đạo có thể xuất báo cáo ra tệp CSV. |
| UC-48 | Đăng tin đồ cũ | Chợ đồ cũ | Người dân đăng tin cho, tặng hoặc trao đổi đồ cũ, kèm ảnh, danh mục, nhãn và khu vực. Người đăng có thể sửa, đóng hoặc mở lại, ẩn hoặc hiện tin của mình. Tin chứa từ khóa trong bộ lọc phải chờ cán bộ xã duyệt mới hiển thị. |
| UC-49 | Tìm kiếm và xem tin đồ cũ | Chợ đồ cũ | Người dân tìm và lọc tin theo từ khóa, danh mục, nhãn, khu vực, rồi xem chi tiết tin, bình luận và xem thông tin liên hệ. Người dân có thể lưu tin quan tâm và chặn người đăng không muốn thấy. |
| UC-50 | Báo cáo tin đăng vi phạm | Chợ đồ cũ | Người dân chọn tin không phù hợp và gửi báo cáo kèm lý do. Hệ thống ghi nhận cho cán bộ xã xem xét. Tin bị 3 báo cáo được tạm gỡ để chờ xử lý. |
| UC-51 | Kiểm duyệt tin đăng | Chợ đồ cũ | Cán bộ xã duyệt hoặc từ chối tin đang chờ, xem các báo cáo vi phạm rồi giữ bài, gỡ bài hoặc cho bài hiển thị lại, và quản lý danh sách từ khóa lọc. Hệ thống báo kết quả cho người đăng. |
| UC-52 | Tra cứu nhật ký thao tác | Quản trị | Quản trị viên tra cứu nhật ký thao tác, gồm người thực hiện, thời điểm và dữ liệu trước, sau khi thay đổi, để kiểm tra diễn biến và tìm nguyên nhân sai sót. |
| UC-53 | Quản trị dữ liệu nền | Quản trị | Quản trị viên mở công cụ quản trị dữ liệu (Jmix) để xem và sửa trực tiếp dữ liệu nền như danh mục địa bàn, công ty, loại phí. |
| UC-54 | Khai báo tài khoản nhận chuyển khoản của xã | Thu tiền | Quản trị viên nhập ngân hàng, số tài khoản và tên chủ tài khoản của xã. Hệ thống dùng tài khoản này để tạo mã VietQR cho mọi khoản phải thu và để đối chiếu giao dịch SePay báo về. |
| UC-58 | Quản lý danh mục đường, hẻm | Quản trị | Quản trị viên (người của xã) thêm đường hoặc hẻm (hẻm thuộc một đường), chọn các ấp đường đi qua; sửa, đổi tên kèm văn bản đổi tên (tên cũ vẫn tìm được, địa chỉ các hộ trên đường và hẻm của nó đổi theo), ngừng dùng; nhập danh mục từ Excel, kể cả file nháp xã đã duyệt (xem trước từng dòng, chỉ ghi khi mọi dòng hợp lệ). Mọi thay đổi có nhật ký. |
| UC-59 | Xử lý địa chỉ chờ xác minh | Quản trị | Quản trị viên xem hồ sơ chưa gắn đường trong danh mục (địa chỉ cũ, hồ sơ cán bộ ghi chờ xác minh) gộp theo tên đường đã ghi; bấm tự khớp để gắn các hồ sơ có tên khớp đúng một đường, hẻm (kể cả tên cũ); với từng nhóm còn lại, kiểm tra rồi gắn vào đường có sẵn hoặc thêm vào danh mục và gắn cả nhóm một lần. |
| UC-55 | Lập phiếu chi trả công ty khi xã trả lại tiền | Nộp tiền về xã và khóa kỳ | Khi phải nộp xã của công ty trong kỳ âm, xã phải trả lại công ty phần chênh. Khi trả tiền, cán bộ xã lập phiếu chi trả từ màn Đối soát (UC-38) hoặc tab Phiếu chi trả công ty: chọn công ty, kỳ, số tiền, hình thức (tiền mặt hoặc chuyển khoản), ngày trả, số chứng từ và ghi chú, rồi in phiếu. Số tiền điền sẵn bằng số xã còn phải trả công ty đó; cán bộ sửa được nhưng không được vượt số đó, ngày trả không sau hôm nay. Xã có thể trả nhiều lần trong một kỳ; chỉ lập được khi kỳ còn mở. Hệ thống cập nhật số xã đã trả và số còn phải trả (hiện ở Tiến độ thu, Đối soát) và báo cho công ty. Công ty xem phiếu của mình, lãnh đạo xã chỉ xem danh sách. Phiếu không sửa, không hủy; phiếu sai thì báo sai sót (UC-56). |
| UC-56 | Báo sai sót phiếu chi trả | Nộp tiền về xã và khóa kỳ | Công ty môi trường xem các phiếu chi trả xã lập cho mình, kèm lũy kế xã đã trả. Khi phát hiện phiếu sai (sai số tiền, sai kỳ, sai chứng từ, không phải của công ty), công ty chọn phiếu, chọn loại sai sót, ghi mô tả và gửi. Hệ thống báo cho cán bộ xã. Phiếu không bị sửa. |
| UC-57 | Xử lý sai sót phiếu chi trả | Nộp tiền về xã và khóa kỳ | Cán bộ xã xem các báo sai sót phiếu chi trả của công ty, kiểm tra rồi đánh dấu đã xử lý kèm ghi chú kết quả. Hệ thống báo kết quả cho công ty. Phiếu đã lập không sửa, không hủy; nếu xã trả thiếu thì lập thêm phiếu chi mới. |

## Có ở backend, chưa có màn hình

Các chức năng dưới đây đã có API và kiểm thử, nhưng bản demo chưa có màn hình nên không đưa vào bảng UC:

- **Đề nghị miễn giảm, hoàn tiền, xóa nợ:** cán bộ xã lập đề nghị, lãnh đạo xã duyệt hoặc từ chối. Đề nghị miễn giảm được tạo tự động khi bật cờ miễn 100% trên đăng ký thu phí; nếu lãnh đạo từ chối, hệ thống gỡ miễn.
- **Chạy nhắc thanh toán ngay:** cán bộ xã hoặc quản trị viên chạy UC-44 ngay, không cần chờ lịch 08:00.

## Chưa có trong demo

Danh sách UC trước đây có các mục sau, nhưng bản demo chưa làm:

- Tài khoản: tự đổi mật khẩu, lấy lại mật khẩu khi quên, tự khóa khi đăng nhập sai. Người dân chưa tự liên kết tài khoản với hộ; tài khoản người dân được nạp sẵn.
- Bản đồ: vị trí từng hộ, ghi GPS và bản đồ tình trạng thu tiền.
- Kết quả thu: nhập từ Excel hoặc nhận qua API từ phần mềm của công ty.
- Biên nhận cho hộ: in và hủy biên nhận.
- Giao dịch chưa khớp: gán thủ công vào khoản phải thu.
- Khoản phải thu: sửa hoặc hủy từng khoản.
- Đối soát: phiên đối soát, chốt, mở lại và phân bổ tiền nộp.
- Thông báo: gửi qua Zalo hoặc SMS, in thông báo giấy, gửi lại, lựa chọn đồng ý nhận thông báo.
- Phản ánh: đính kèm ảnh, yêu cầu bổ sung thông tin, từ chối, mở lại.
- Báo cáo: báo cáo cho cán bộ xã và công ty, xuất ra Excel hoặc PDF.
- Hệ thống: cấu hình tích hợp, theo dõi kết nối dịch vụ ngoài.

## Lịch sử sửa

**07/10/2026** (PR #14: đối soát tách phí xử lý, màn đối soát gọn lại):

- Thuật ngữ **Phí xử lý**: thêm "đi cùng tiền vận chuyển về xã, công ty chỉ giữ phần thu gom" (QĐ 65/2026).
- Thuật ngữ **Phải nộp xã**: ghi rõ phí vận chuyển và phí xử lý không được trừ.
- **UC-27**: thêm các cột của màn, đường vào từ cảnh báo sao kê QR ở UC-38, liên hệ với khóa kỳ.
- **UC-35**: lập từ màn Đối soát; số tiền điền sẵn bằng số còn phải nộp.
- **UC-38**: viết lại theo màn hiện tại (ba ô tổng xã đang giữ / được hưởng, nhóm QR và tiền mặt thu gọn hoặc chi tiết có cột xử lý, kết quả số âm khi xã trả, lọc Chưa khớp / Đã khớp, lập phiếu trên dòng, cảnh báo sao kê QR). Bỏ mô tả cũ Khớp / Đang nộp / Lệch.
- **UC-39**: thêm điều kiện không còn giao dịch chuyển khoản chưa xác định công ty; lý do chặn hiện bằng thông báo.
- **UC-55**: lập từ màn Đối soát; số tiền điền sẵn bằng số xã còn phải trả.
