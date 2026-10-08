# Danh sách use case

Use case (UC) mô tả chuỗi tương tác giữa hệ thống và một tác nhân bên ngoài, kết thúc khi tác nhân đạt được một kết quả có giá trị. Tên UC luôn viết theo dạng **động từ + đối tượng**, chọn từ ngữ rõ nghĩa để chỉ đọc tên đã biết UC mang lại kết quả gì cho người dùng nào.

Khi xác định UC, nhóm đặt các câu hỏi sau cho từng tác nhân:

- Tác nhân dùng hệ thống để làm gì?
- Tác nhân có tạo, lưu, thay đổi, xóa hoặc đọc dữ liệu trong hệ thống không?
- Tác nhân có cần báo cho hệ thống về sự kiện hoặc thay đổi bên ngoài không?
- Tác nhân có cần được hệ thống báo khi có sự việc nhất định không?

Bảng dưới chỉ liệt kê các UC có luồng sử dụng trên web, ứng dụng người dân hoặc tác vụ tích hợp đang chạy trong mã nguồn hiện tại. Chức năng chỉ có API nhưng chưa có màn hình cho người dùng thực hiện không được tính là UC đã có.

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
- **Phí xử lý:** phần đơn giá thứ ba, chỉ có ở nhóm đăng ký cân; các nhóm khác được hỗ trợ nên không có.
- **Khu vực:** ấp hoặc tổ dân phố, là đơn vị phân công cho công ty.
- **Khoản phải thu:** số tiền một hộ/cơ sở phải đóng trong một kỳ. Với người dân, đây là khoản phải trả.
- **Phiếu yêu cầu thu (YCT):** đợt phát hành khoản phải thu của một kỳ cho công ty.
- **Phiếu thu:** chứng từ cán bộ xã lập khi nhận tiền công ty nộp về xã. Mỗi kỳ công ty có thể nộp nhiều lần.
- **Phải nộp xã:** số tiền công ty cần nộp cho xã theo sổ đối soát của kỳ.
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
| UC-01 | Đăng nhập hệ thống | Tài khoản và xác thực | Người dùng nội bộ đăng nhập web bằng tên đăng nhập và mật khẩu. Người dân đăng nhập ứng dụng bằng số điện thoại và OTP mô phỏng. |
| UC-02 | Đăng xuất hệ thống | Tài khoản và xác thực | Người dùng đăng xuất trên web hoặc ứng dụng; thiết bị xóa thông tin đăng nhập đã lưu và quay về màn đăng nhập. |
| UC-03 | Cấp và cập nhật tài khoản người dùng | Tài khoản và xác thực | Quản trị viên tạo và sửa tài khoản nội bộ, gán vai trò và công ty, khóa hoặc mở khóa tài khoản, đặt lại mật khẩu. |
| UC-04 | Cấp và cập nhật tài khoản người đi thu | Tài khoản và xác thực | Quản trị viên tạo và quản lý tài khoản người đi thu thuộc một công ty; công ty xem danh sách người đi thu của mình. |
| UC-05 | Nhập danh sách hộ/cơ sở từ Excel | Hồ sơ hộ/cơ sở | Cán bộ xã tải tệp mẫu Excel, tải danh sách hộ/cơ sở lên và xem kết quả kiểm tra từng dòng. Chỉ khi tệp không còn dòng lỗi, cán bộ mới xác nhận nhập hồ sơ. |
| UC-06 | Tạo hồ sơ hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã tạo hồ sơ hộ/cơ sở, nhập thông tin liên hệ, địa chỉ, số nhân khẩu và đăng ký thu phí. Đường/hẻm được chọn từ danh mục; tên chưa có được ghi chờ xác minh. |
| UC-07 | Tra cứu hồ sơ hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã tìm, lọc và xem chi tiết hồ sơ hộ/cơ sở, đăng ký thu phí cùng lịch sử thay đổi số nhân khẩu. |
| UC-08 | Cập nhật thông tin hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã sửa thông tin hồ sơ, địa chỉ, số điện thoại và số nhân khẩu của hộ/cơ sở. |
| UC-09 | Cập nhật đăng ký thu phí | Hồ sơ hộ/cơ sở | Cán bộ xã thêm, sửa hoặc kết thúc đăng ký thu phí của hộ/cơ sở, gồm nhóm giá và ngày hiệu lực. |
| UC-10 | Ngừng cung cấp dịch vụ cho hộ/cơ sở | Hồ sơ hộ/cơ sở | Cán bộ xã ghi nhận ngày và lý do ngừng cung cấp dịch vụ cho hộ/cơ sở. |
| UC-11 | Báo hộ chuyển đi hoặc sai thông tin | Hồ sơ hộ/cơ sở | Người đi thu chọn hộ trong danh sách thu, chọn loại vấn đề và gửi báo cáo để cán bộ xã kiểm tra. |
| UC-12 | Xem thông tin hộ | Hồ sơ hộ/cơ sở | Người dân xem thông tin hộ gắn với tài khoản trên ứng dụng. |
| UC-13 | Cập nhật danh mục địa bàn | Khu vực và công ty | Quản trị viên xem và sửa thông tin địa bàn, khu vực trong màn Thiết lập địa bàn. |
| UC-15 | Cập nhật hồ sơ công ty môi trường | Khu vực và công ty | Quản trị viên thêm và sửa hồ sơ công ty môi trường, thông tin liên hệ, hiệu lực và trạng thái hợp tác. |
| UC-16 | Tra cứu thông tin công ty môi trường | Khu vực và công ty | Cán bộ xã tra cứu danh sách công ty và xem thông tin, tiến độ thu tiền của công ty trong kỳ. |
| UC-17 | Phân công khu vực cho công ty môi trường | Khu vực và công ty | Cán bộ xã phân công khu vực cho công ty theo ngày hiệu lực và xem lịch sử phân công. |
| UC-19 | Lập và ban hành biểu giá | Biểu giá và kỳ thu | Quản trị viên tạo dự thảo biểu giá, nhập các mức thu, ban hành và tra cứu các phiên bản biểu giá. |
| UC-20 | Tạo kỳ thu | Biểu giá và kỳ thu | Quản trị viên tạo kỳ thu tháng hoặc quý ở trạng thái dự thảo; hệ thống gắn biểu giá có hiệu lực cho kỳ. |
| UC-21 | Phát hành khoản phải thu | Biểu giá và kỳ thu | Cán bộ xã chọn kỳ và phạm vi, xem trước khoản phải thu rồi phát hành phiếu yêu cầu thu. Với kỳ dự thảo, thao tác này đồng thời mở kỳ và đặt hạn nộp. |
| UC-22 | Tra cứu khoản phải thu | Biểu giá và kỳ thu | Cán bộ xã xem và lọc các khoản phải thu theo kỳ, công ty, khu vực và trạng thái. |
| UC-23 | Ghi nhận tiền mặt đã thu | Thu tiền | Người đi thu xác nhận đã thu đủ tiền mặt cho một khoản của hộ thuộc công ty mình. Công ty có thể ghi nhận thay và chọn người đi thu. |
| UC-24 | Hiển thị mã VietQR để hộ chuyển khoản | Thu tiền | Người đi thu mở mã VietQR của khoản phải thu để hộ quét và chuyển tiền vào tài khoản của xã. |
| UC-25 | Thanh toán khoản phải trả bằng VietQR | Thu tiền | Người dân mở khoản cần đóng trên ứng dụng để xem mã VietQR và thông tin chuyển khoản. |
| UC-26 | Xác nhận thanh toán từ giao dịch ngân hàng | Thu tiền | SePay gửi giao dịch ngân hàng đến webhook; hệ thống đối chiếu giao dịch với khoản phải thu và ghi nhận khoản khớp. |
| UC-28 | Nhận bàn giao tiền mặt từ người đi thu | Thu tiền | Công ty ghi nhận số tiền mặt đã nhận từ người đi thu và xem lịch sử bàn giao. |
| UC-29 | Theo dõi tiền mặt đang giữ | Thu tiền | Người đi thu xem tiền mặt đã thu, đã bàn giao và còn đang giữ. |
| UC-30 | Xem lịch sử thu của hộ | Thu tiền | Người đi thu xem lịch sử khoản phải thu và thanh toán của một hộ thuộc công ty mình. |
| UC-31 | Tra cứu khoản phải trả và xác nhận thanh toán | Thu tiền | Người dân xem khoản cần đóng, khoản đã thanh toán và xác nhận thanh toán trên ứng dụng. |
| UC-32 | Theo dõi tiến độ thu và nộp tiền của xã | Nộp tiền về xã và khóa kỳ | Cán bộ xã và lãnh đạo xã xem tiến độ thu, nộp tiền theo công ty và khu vực, cùng danh sách công nợ hộ. |
| UC-33 | Theo dõi tiến độ thu của công ty | Nộp tiền về xã và khóa kỳ | Công ty xem tổng quan thu tiền trong kỳ, tiến độ theo người đi thu và danh sách hộ người đó đã thu. |
| UC-34 | Nhắc công ty nộp tiền | Nộp tiền về xã và khóa kỳ | Cán bộ xã gửi lời nhắc nộp tiền cho công ty và xem lịch sử nhắc. |
| UC-35 | Lập phiếu thu tiền công ty nộp về xã | Nộp tiền về xã và khóa kỳ | Cán bộ xã lập và in phiếu thu khi nhận tiền công ty nộp về xã; một công ty có thể có nhiều phiếu trong kỳ. |
| UC-36 | Báo sai sót phiếu thu | Nộp tiền về xã và khóa kỳ | Công ty xem phiếu thu xã đã lập và gửi báo sai sót của một phiếu. |
| UC-37 | Xử lý sai sót phiếu thu | Nộp tiền về xã và khóa kỳ | Cán bộ xã xem báo sai sót phiếu thu, ghi kết quả xử lý và đánh dấu đã xử lý. |
| UC-38 | Xem đối soát công ty theo kỳ | Nộp tiền về xã và khóa kỳ | Cán bộ xã và lãnh đạo xã xem số liệu đối soát thu tiền, nộp tiền của từng công ty theo kỳ. |
| UC-39 | Khóa kỳ thu | Nộp tiền về xã và khóa kỳ | Cán bộ xã yêu cầu khóa kỳ từ màn Đối soát; hệ thống kiểm tra điều kiện và khóa kỳ khi hợp lệ. |
| UC-40 | Gửi và theo dõi phản ánh | Phản ánh và thông báo | Người dân gửi phản ánh trên ứng dụng và theo dõi trạng thái, kết quả xử lý. |
| UC-41 | Ghi nhận phản ánh thay người dân | Phản ánh và thông báo | Cán bộ xã nhập phản ánh nhận qua điện thoại hoặc trực tiếp vào hệ thống. |
| UC-42 | Xử lý phản ánh | Phản ánh và thông báo | Cán bộ xã tiếp nhận, chuyển phản ánh cho công ty khi cần và ghi kết quả giải quyết. |
| UC-43 | Phản hồi phản ánh được chuyển | Phản ánh và thông báo | Công ty xem phản ánh được xã chuyển và gửi phản hồi xử lý. |
| UC-44 | Gửi nhắc thanh toán cho hộ | Phản ánh và thông báo | Tác vụ hẹn giờ gửi thông báo nhắc thanh toán trong ứng dụng cho hộ còn khoản chưa đóng. |
| UC-45 | Xem thông báo | Phản ánh và thông báo | Người dùng web và ứng dụng xem thông báo, đánh dấu từng thông báo hoặc tất cả là đã đọc. |
| UC-46 | Xem dashboard điều hành | Báo cáo | Lãnh đạo xã xem dashboard thu, nộp tiền và các cảnh báo theo công ty, khu vực. |
| UC-47 | Xem và xuất báo cáo tổng hợp kỳ thu | Báo cáo | Lãnh đạo xã xem báo cáo kỳ thu theo công ty, khu vực và xuất dữ liệu ra CSV. |
| UC-48 | Đăng tin đồ cũ | Chợ đồ cũ | Người dân đăng, sửa và quản lý tin đồ cũ của mình trên ứng dụng. |
| UC-49 | Tìm kiếm và xem tin đồ cũ | Chợ đồ cũ | Người dân tìm, lọc và xem chi tiết tin đồ cũ; có thể lưu tin hoặc chặn người đăng. |
| UC-50 | Báo cáo tin đăng vi phạm | Chợ đồ cũ | Người dân gửi báo cáo vi phạm đối với một tin đồ cũ. |
| UC-51 | Kiểm duyệt tin đăng | Chợ đồ cũ | Cán bộ xã duyệt tin chờ, xử lý báo cáo vi phạm và quản lý từ khóa lọc tin. |
| UC-52 | Tra cứu nhật ký thao tác | Quản trị | Quản trị viên tra cứu nhật ký thao tác của hệ thống trên web. |
| UC-54 | Khai báo tài khoản nhận chuyển khoản của xã | Thu tiền | Quản trị viên khai báo tài khoản ngân hàng của xã dùng cho VietQR và đối chiếu chuyển khoản. |
| UC-58 | Quản lý danh mục đường, hẻm | Quản trị | Quản trị viên thêm, sửa, ngừng dùng và nhập danh mục đường/hẻm từ Excel; có thể quản lý ấp đi qua và tên cũ. |
| UC-59 | Xử lý địa chỉ chờ xác minh | Quản trị | Quản trị viên xem các địa chỉ đường chờ xác minh, tự khớp tên hoặc gắn nhóm hồ sơ vào đường/hẻm trong danh mục. |
