# Danh sách use case

Use case (UC) mô tả chuỗi tương tác giữa hệ thống và một tác nhân bên ngoài, kết thúc khi tác nhân đạt được một kết quả có giá trị. Tên UC luôn viết theo dạng **động từ + đối tượng**, chọn từ ngữ rõ nghĩa để chỉ đọc tên đã biết UC mang lại kết quả gì cho người dùng nào.

Khi xác định UC, nhóm đặt các câu hỏi sau cho từng tác nhân:

- Tác nhân dùng hệ thống để làm gì?
- Tác nhân có tạo, lưu, thay đổi, xóa hoặc đọc dữ liệu trong hệ thống không?
- Tác nhân có cần báo cho hệ thống về sự kiện hoặc thay đổi bên ngoài không?
- Tác nhân có cần được hệ thống báo khi có sự việc nhất định không?

Bảng dưới chỉ liệt kê các UC có luồng sử dụng trên web, ứng dụng người dân hoặc tác vụ tích hợp đang chạy trong mã nguồn hiện tại. Chức năng chỉ có API nhưng chưa có màn hình cho người dùng thực hiện không được tính là UC đã có. Cột **Actor** ghi tác nhân khởi tạo luồng; nếu một thao tác có thể được thực hiện thay bởi vai trò khác, cả hai vai trò được ghi trong cùng ô. Mô tả nêu thao tác chính và kết quả có thể quan sát được, không thay thế đặc tả quy tắc nghiệp vụ chi tiết.

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

| ID | Tên use case | Actor | Nhóm chức năng | Mô tả use case |
| --- | --- | --- | --- | --- |
| UC-01 | Đăng nhập hệ thống | Người dùng nội bộ; người dân | Tài khoản và xác thực | Người dùng nội bộ nhập tên đăng nhập và mật khẩu trên web; hệ thống xác thực và mở các màn hình theo vai trò. Người dân đăng nhập ứng dụng bằng số điện thoại gắn với hộ và OTP mô phỏng để truy cập dữ liệu của mình. |
| UC-02 | Đăng xuất hệ thống | Người dùng nội bộ; người dân | Tài khoản và xác thực | Người dùng chọn đăng xuất trên web hoặc ứng dụng. Hệ thống xóa phiên đăng nhập lưu trên thiết bị và đưa người dùng về màn hình đăng nhập; dữ liệu cần xác thực không còn được hiển thị trong phiên đó. |
| UC-03 | Cấp và cập nhật tài khoản người dùng | Quản trị viên | Tài khoản và xác thực | Quản trị viên tạo tài khoản nội bộ, nhập thông tin người dùng, chọn vai trò và gắn công ty khi vai trò yêu cầu. Từ danh sách tài khoản, quản trị viên có thể sửa thông tin, khóa/mở khóa hoặc đặt lại mật khẩu; trạng thái mới quyết định khả năng đăng nhập của tài khoản. |
| UC-04 | Cấp và cập nhật tài khoản người đi thu | Quản trị viên; công ty môi trường (xem) | Tài khoản và xác thực | Quản trị viên tạo và cập nhật tài khoản người đi thu, gắn tài khoản với công ty để giới hạn phạm vi làm việc. Công ty môi trường xem danh sách người đi thu của mình trên web; người đi thu dùng tài khoản được cấp để vào màn hình thu tiền. |
| UC-05 | Nhập danh sách hộ/cơ sở từ Excel | Cán bộ xã | Hồ sơ hộ/cơ sở | Cán bộ xã tải tệp mẫu, điền dữ liệu rồi tải tệp Excel lên màn hình nhập hộ. Hệ thống xem trước từng dòng, báo số dòng hợp lệ và lỗi; cán bộ sửa tệp nếu cần, sau đó xác nhận nhập khi toàn bộ dòng hợp lệ để tạo các hồ sơ. |
| UC-06 | Tạo hồ sơ hộ/cơ sở | Cán bộ xã | Hồ sơ hộ/cơ sở | Cán bộ xã nhập loại đối tượng, tên, ấp, địa chỉ, liên hệ và số nhân khẩu đối với hộ gia đình; có thể tạo kèm đăng ký thu phí, nhóm giá, thời gian hiệu lực và miễn giảm 100% cùng lý do. Đường/hẻm được chọn từ danh mục hoặc ghi chờ xác minh; khi địa chỉ nghi trùng, màn hình cho đối chiếu hồ sơ có sẵn hoặc ghi lý do xác nhận là hộ khác trước khi lưu. |
| UC-07 | Tra cứu hồ sơ hộ/cơ sở | Cán bộ xã | Hồ sơ hộ/cơ sở | Cán bộ xã tìm hồ sơ theo mã, tên, số điện thoại hoặc địa chỉ; lọc theo ấp, loại đối tượng, trạng thái và địa chỉ chưa chuẩn hóa. Danh sách cho biết cách tính thu và trạng thái; mở một hồ sơ để xem thông tin, đăng ký thu phí và lịch sử thay đổi số nhân khẩu. |
| UC-08 | Cập nhật thông tin hộ/cơ sở | Cán bộ xã | Hồ sơ hộ/cơ sở | Cán bộ xã mở hồ sơ hiện có để sửa tên, liên hệ, địa chỉ, loại đối tượng hoặc số nhân khẩu. Hệ thống kiểm tra dữ liệu và địa chỉ nghi trùng trước khi lưu; nếu số nhân khẩu làm thay đổi nhóm giá theo số người, đăng ký liên quan được điều chỉnh theo quy tắc kỳ thu. |
| UC-09 | Cập nhật đăng ký thu phí | Cán bộ xã | Hồ sơ hộ/cơ sở | Cán bộ xã thêm đăng ký cho hồ sơ chưa có hoặc sửa nhóm giá, định mức kg nếu tính theo cân, ngày hiệu lực và thông tin miễn giảm 100% của đăng ký đang hiển thị. Khi bật miễn giảm phải chọn lý do; khi lưu, hệ thống kiểm tra nhóm giá và khoảng hiệu lực, cập nhật đăng ký hoặc tạo đăng ký nối tiếp khi cách tính cần áp dụng từ kỳ sau. |
| UC-10 | Tạm ngừng và tiếp tục cung cấp dịch vụ | Cán bộ xã | Hồ sơ hộ/cơ sở | Cán bộ xã chọn tạm ngừng trên hồ sơ, nhập ngày cuối cùng còn cung cấp và có thể ghi lý do; hệ thống chuyển trạng thái hồ sơ và kết thúc hiệu lực đăng ký liên quan. Trên hồ sơ đã tạm ngừng, cán bộ chọn tiếp tục cung cấp; hệ thống đưa hồ sơ về trạng thái đang cung cấp và mở đăng ký mới từ ngày tiếp tục, giữ khoảng thời gian đã ngừng trong lịch sử. |
| UC-11 | Báo hộ chuyển đi hoặc sai thông tin | Người đi thu | Hồ sơ hộ/cơ sở | Người đi thu chọn hộ trong danh sách được phép thu, chọn loại vấn đề như hộ chuyển đi hoặc thông tin không đúng, rồi nhập nội dung báo cáo. Hệ thống lưu báo cáo gắn với hồ sơ để cán bộ xã kiểm tra và cập nhật hồ sơ khi cần. |
| UC-12 | Xem thông tin hộ | Người dân | Hồ sơ hộ/cơ sở | Người dân mở mục thông tin hộ trên ứng dụng sau khi đăng nhập. Ứng dụng hiển thị hồ sơ hộ liên kết với tài khoản, gồm thông tin nhận diện và địa chỉ để người dân đối chiếu với thực tế. |
| UC-13 | Cập nhật danh mục địa bàn | Quản trị viên | Khu vực và công ty | Quản trị viên mở màn Thiết lập địa bàn để xem danh sách địa bàn và các khu vực thuộc địa bàn. Tại đây quản trị viên sửa thông tin khu vực được màn hình hỗ trợ; thay đổi được lưu vào danh mục dùng khi lập hồ sơ và phân công công ty. |
| UC-15 | Cập nhật hồ sơ công ty môi trường | Quản trị viên | Khu vực và công ty | Quản trị viên thêm công ty môi trường hoặc mở hồ sơ công ty để sửa tên, loại hình, thông tin liên hệ, thời gian hiệu lực và trạng thái hợp tác. Danh sách công ty sau đó phản ánh thông tin mới để xã dùng khi phân công khu vực và đối soát. |
| UC-16 | Tra cứu thông tin công ty môi trường | Cán bộ xã | Khu vực và công ty | Cán bộ xã tìm và xem danh sách công ty môi trường, thông tin nhận diện và liên hệ của từng công ty. Các màn tiến độ và đối soát cho phép xem kết quả thu, nộp tiền của công ty theo kỳ để phục vụ theo dõi nghiệp vụ. |
| UC-17 | Phân công khu vực cho công ty môi trường | Cán bộ xã | Khu vực và công ty | Cán bộ xã chọn khu vực, công ty nhận thu gom và ngày bắt đầu hoặc kết thúc hiệu lực phân công. Hệ thống lưu lịch sử phân công để xác định công ty phụ trách khu vực theo thời điểm và giới hạn dữ liệu thu tiền của công ty. |
| UC-19 | Lập và ban hành biểu giá | Quản trị viên | Biểu giá và kỳ thu | Quản trị viên tạo dự thảo biểu giá, nhập thông tin quyết định, thời gian hiệu lực và các mức thu theo nhóm đối tượng; có thể cấu hình tính theo nhân khẩu cho phạm vi áp dụng trên màn hình biểu giá. Sau khi kiểm tra, quản trị viên ban hành biểu giá; hệ thống giữ các phiên bản để tra cứu và dùng phiên bản có hiệu lực khi lập kỳ thu. |
| UC-20 | Tạo kỳ thu | Quản trị viên | Biểu giá và kỳ thu | Quản trị viên chọn kỳ tháng hoặc quý và các thông tin của kỳ để tạo bản dự thảo. Hệ thống gắn biểu giá phù hợp với thời gian kỳ, hiển thị kỳ trong danh sách và để cán bộ xã sử dụng khi phát hành khoản phải thu. |
| UC-21 | Phát hành khoản phải thu | Cán bộ xã | Biểu giá và kỳ thu | Cán bộ xã chọn kỳ thu và phạm vi phát hành, xem trước các khoản dự kiến cho hộ/cơ sở và công ty phụ trách, rồi xác nhận phát hành phiếu yêu cầu thu. Hệ thống tạo các khoản phải thu theo đăng ký, biểu giá và số nhân khẩu/định mức tương ứng; với kỳ dự thảo, thao tác này đồng thời mở kỳ và đặt hạn nộp. |
| UC-22 | Tra cứu khoản phải thu | Cán bộ xã | Biểu giá và kỳ thu | Cán bộ xã xem danh sách khoản phải thu đã phát hành và lọc theo kỳ, công ty, khu vực, hộ hoặc trạng thái thanh toán. Mỗi dòng hiển thị đối tượng, số tiền, hạn đóng và tình trạng để cán bộ theo dõi khoản đã thu, chưa thu hoặc được miễn giảm. |
| UC-23 | Ghi nhận tiền mặt đã thu | Người đi thu; công ty môi trường | Thu tiền | Người đi thu mở khoản phải thu thuộc công ty mình và xác nhận đã nhận đủ tiền mặt của hộ. Công ty có thể ghi nhận thay, chỉ định người đi thu; hệ thống ghi thanh toán, cập nhật trạng thái khoản và cộng số tiền vào tiền mặt người đi thu đang giữ. |
| UC-24 | Hiển thị mã VietQR để hộ chuyển khoản | Người đi thu | Thu tiền | Người đi thu chọn khoản chưa đóng trong danh sách thu và mở mã VietQR của khoản đó cho hộ quét. Mã hiển thị tài khoản nhận và nội dung chuyển khoản gắn với khoản phải thu; việc mở mã chưa tự ghi nhận đã thanh toán. |
| UC-25 | Thanh toán khoản phải trả bằng VietQR | Người dân | Thu tiền | Người dân mở khoản phải trả trên ứng dụng và xem mã VietQR cùng thông tin chuyển khoản để thực hiện giao dịch bằng ứng dụng ngân hàng. Khoản trên hệ thống chỉ chuyển sang đã thanh toán khi giao dịch được đối chiếu hoặc được ghi nhận qua luồng thu hợp lệ. |
| UC-26 | Xác nhận thanh toán từ giao dịch ngân hàng | SePay | Thu tiền | SePay gửi thông tin giao dịch ngân hàng đến webhook tích hợp. Hệ thống kiểm tra yêu cầu, đối chiếu nội dung và số tiền với khoản phải thu, ghi nhận giao dịch khớp và cập nhật trạng thái khoản; giao dịch không khớp không được tự gán thành thanh toán của hộ. |
| UC-28 | Nhận bàn giao tiền mặt từ người đi thu | Công ty môi trường | Thu tiền | Công ty chọn người đi thu, kiểm tra số tiền mặt người đó đã thu và còn giữ, rồi ghi nhận số tiền thực nhận. Hệ thống lưu lần bàn giao, giảm số tiền người đi thu đang giữ và cho công ty xem lịch sử các lần nhận. |
| UC-29 | Theo dõi tiền mặt đang giữ | Người đi thu | Thu tiền | Người đi thu mở màn tiền mặt của mình để xem tổng đã thu, tổng đã bàn giao và số còn đang giữ. Danh sách giao dịch và bàn giao giúp đối chiếu số tiền cần giao lại cho công ty. |
| UC-30 | Xem lịch sử thu của hộ | Người đi thu | Thu tiền | Người đi thu chọn một hộ trong phạm vi công ty được giao và mở lịch sử thu. Màn hình hiển thị các khoản phải thu, kỳ tương ứng và thanh toán đã ghi nhận để người đi thu đối chiếu trước khi thu hoặc hướng dẫn hộ. |
| UC-31 | Tra cứu khoản phải trả và xác nhận thanh toán | Người dân | Thu tiền | Người dân xem danh sách khoản phải trả, lọc hoặc mở chi tiết để biết kỳ, số tiền, hạn đóng và trạng thái. Với khoản đã có thanh toán, ứng dụng cho xem/xác nhận thông tin thanh toán được hệ thống ghi nhận; thao tác này không thay thế việc đối chiếu giao dịch ngân hàng. |
| UC-32 | Theo dõi tiến độ thu và nộp tiền của xã | Cán bộ xã; lãnh đạo xã | Nộp tiền về xã và khóa kỳ | Cán bộ và lãnh đạo chọn kỳ để xem số phải thu, đã thu, chưa thu và tình hình công ty nộp tiền về xã theo công ty hoặc khu vực. Từ màn tiến độ, người dùng xem danh sách công nợ hộ để xác định các khoản còn tồn. |
| UC-33 | Theo dõi tiến độ thu của công ty | Công ty môi trường | Nộp tiền về xã và khóa kỳ | Công ty mở tổng quan kỳ thu của mình để xem số hộ/khoản được giao, tiền đã thu và phần còn lại. Màn hình cho xem kết quả theo người đi thu cùng danh sách hộ đã thu, giúp công ty kiểm tra tiến độ trong phạm vi được phân công. |
| UC-34 | Nhắc công ty nộp tiền | Cán bộ xã | Nộp tiền về xã và khóa kỳ | Cán bộ xã chọn công ty và kỳ có tiền cần nộp, nhập nội dung hoặc gửi lời nhắc từ màn tiến độ. Hệ thống lưu thông báo nhắc và lịch sử gửi để cán bộ theo dõi các lần đã liên hệ công ty. |
| UC-35 | Lập phiếu thu tiền công ty nộp về xã | Cán bộ xã | Nộp tiền về xã và khóa kỳ | Khi nhận tiền công ty nộp, cán bộ xã chọn công ty, kỳ, ngày, số tiền và hình thức nộp để lập phiếu thu. Hệ thống lưu phiếu, cập nhật số đã nộp trong đối soát và cho in chứng từ; một công ty có thể nộp nhiều lần trong cùng kỳ. |
| UC-36 | Báo sai sót phiếu thu | Công ty môi trường | Nộp tiền về xã và khóa kỳ | Công ty xem danh sách phiếu thu xã đã lập cho mình, mở phiếu có thông tin sai và gửi nội dung báo sai sót. Hệ thống gắn yêu cầu với đúng phiếu để xã tiếp nhận, đồng thời cho công ty theo dõi tình trạng xử lý. |
| UC-37 | Xử lý sai sót phiếu thu | Cán bộ xã | Nộp tiền về xã và khóa kỳ | Cán bộ xã mở danh sách báo sai sót, xem phiếu thu liên quan và nội dung công ty phản ánh. Sau khi kiểm tra, cán bộ ghi kết quả giải quyết và đánh dấu yêu cầu đã xử lý để công ty xem phản hồi. |
| UC-38 | Xem đối soát công ty theo kỳ | Cán bộ xã; lãnh đạo xã | Nộp tiền về xã và khóa kỳ | Người dùng chọn kỳ trên màn Đối soát để xem từng công ty đã thu từ hộ, số phải nộp xã, số đã nộp và phần chênh lệch/còn phải nộp. Có thể mở các phiếu thu liên quan để đối chiếu số liệu mà không sửa dữ liệu từ bảng tổng hợp. |
| UC-39 | Khóa kỳ thu | Cán bộ xã | Nộp tiền về xã và khóa kỳ | Cán bộ xã yêu cầu khóa kỳ tại màn Đối soát sau khi kiểm tra kết quả thu và nộp. Hệ thống kiểm tra điều kiện khóa, thông báo nếu còn vướng mắc; khi hợp lệ, kỳ chuyển sang đã khóa và khoản hộ chưa đóng được theo dõi như công nợ. |
| UC-40 | Gửi và theo dõi phản ánh | Người dân | Phản ánh và thông báo | Người dân nhập nội dung phản ánh trên ứng dụng, chọn thông tin cần thiết và gửi đến xã. Ứng dụng lưu phản ánh gắn với tài khoản/hộ, hiển thị trạng thái cùng phản hồi hoặc kết quả giải quyết để người dân theo dõi. |
| UC-41 | Ghi nhận phản ánh thay người dân | Cán bộ xã | Phản ánh và thông báo | Khi nhận thông tin qua điện thoại hoặc trực tiếp, cán bộ xã tạo phản ánh trên web thay người dân, nhập hộ liên quan và nội dung sự việc. Hệ thống đưa phản ánh vào cùng danh sách xử lý như phản ánh gửi từ ứng dụng. |
| UC-42 | Xử lý phản ánh | Cán bộ xã | Phản ánh và thông báo | Cán bộ xã xem nội dung và lịch sử xử lý của phản ánh, tiếp nhận rồi chọn tự giải quyết hoặc chuyển cho công ty phụ trách. Cán bộ ghi kết quả và cập nhật trạng thái; các bước được lưu để theo dõi tiến trình từ lúc gửi đến khi hoàn tất. |
| UC-43 | Phản hồi phản ánh được chuyển | Công ty môi trường | Phản ánh và thông báo | Công ty xem các phản ánh xã chuyển đến trong phạm vi công ty mình, kiểm tra thông tin hộ và sự việc, rồi gửi nội dung phản hồi xử lý. Phản hồi trở lại luồng phản ánh để cán bộ xã xem và quyết định bước tiếp theo. |
| UC-44 | Gửi nhắc thanh toán cho hộ | Bộ hẹn giờ | Phản ánh và thông báo | Tác vụ theo lịch xác định hộ còn khoản chưa đóng thuộc diện cần nhắc và tạo thông báo thanh toán cho tài khoản người dân tương ứng. Người dân nhận thông báo trong ứng dụng và có thể mở khoản cần đóng từ nội dung nhắc. |
| UC-45 | Xem thông báo | Người dùng web; người dân | Phản ánh và thông báo | Người dùng mở trung tâm thông báo trên web hoặc ứng dụng để xem nội dung mới và nội dung đã đọc. Có thể đánh dấu từng thông báo hoặc tất cả là đã đọc; hệ thống cập nhật số thông báo chưa đọc trên giao diện. |
| UC-46 | Xem dashboard điều hành | Lãnh đạo xã | Báo cáo | Lãnh đạo xã mở dashboard để xem tổng quan tiền phải thu, đã thu, còn nợ và tình hình nộp tiền của các công ty. Các chỉ số và cảnh báo được trình bày theo kỳ, công ty hoặc khu vực để nhận ra nơi có tiến độ thấp hay khoản tồn. |
| UC-47 | Xem và xuất báo cáo tổng hợp kỳ thu | Lãnh đạo xã | Báo cáo | Lãnh đạo xã chọn kỳ và phạm vi báo cáo để xem số liệu tổng hợp theo công ty, khu vực. Khi cần làm việc ngoài hệ thống, lãnh đạo xuất dữ liệu đang xem thành tệp CSV. |
| UC-48 | Đăng tin đồ cũ | Người dân | Chợ đồ cũ | Người dân tạo tin đồ cũ trên ứng dụng, nhập thông tin món đồ và hình ảnh theo biểu mẫu, sau đó gửi đăng. Trong danh sách tin của mình, người dân xem trạng thái kiểm duyệt và sửa hoặc quản lý tin đã tạo theo các thao tác màn hình cho phép. |
| UC-49 | Tìm kiếm và xem tin đồ cũ | Người dân | Chợ đồ cũ | Người dân duyệt bảng tin, tìm hoặc lọc tin phù hợp và mở chi tiết để xem mô tả, hình ảnh, thông tin người đăng. Ứng dụng còn cho lưu tin quan tâm hoặc chặn người đăng; danh sách hiển thị được cập nhật theo lựa chọn đó. |
| UC-50 | Báo cáo tin đăng vi phạm | Người dân | Chợ đồ cũ | Khi thấy tin không phù hợp, người dân mở tin và gửi báo cáo vi phạm kèm lý do. Hệ thống lưu báo cáo cho cán bộ xã kiểm tra trong màn kiểm duyệt; thao tác báo cáo không tự xóa tin ngay. |
| UC-51 | Kiểm duyệt tin đăng | Cán bộ xã | Chợ đồ cũ | Cán bộ xã xem tin chờ duyệt và các báo cáo vi phạm, kiểm tra nội dung rồi quyết định xử lý trên màn kiểm duyệt. Cán bộ cũng quản lý danh sách từ khóa lọc tin; trạng thái tin được cập nhật để người dân thấy tin nào được hiển thị hoặc bị xử lý. |
| UC-52 | Tra cứu nhật ký thao tác | Quản trị viên | Quản trị | Quản trị viên mở nhật ký thao tác trên web, lọc bản ghi theo thông tin được màn hình hỗ trợ và xem thời điểm, tài khoản, loại thao tác, đối tượng bị tác động. Nhật ký dùng để lần lại các thay đổi nghiệp vụ đã được hệ thống ghi nhận. |
| UC-54 | Khai báo tài khoản nhận chuyển khoản của xã | Quản trị viên | Thu tiền | Quản trị viên mở cấu hình tài khoản ngân hàng của xã và nhập hoặc cập nhật ngân hàng, số tài khoản, tên chủ tài khoản. Hệ thống dùng thông tin đang cấu hình khi tạo VietQR và đối chiếu giao dịch chuyển khoản gửi về. |
| UC-58 | Quản lý danh mục đường, hẻm | Quản trị viên | Quản trị | Quản trị viên thêm, sửa hoặc ngừng sử dụng đường/hẻm trong danh mục, khai báo ấp đi qua và tên cũ để hỗ trợ tìm kiếm địa chỉ. Có thể nhập danh mục từ Excel sau bước xem trước/kiểm tra; đường đã lưu được dùng khi cán bộ xã tạo hoặc chuẩn hóa hồ sơ hộ. |
| UC-59 | Xử lý địa chỉ chờ xác minh | Quản trị viên | Quản trị | Quản trị viên xem các tên đường tạm đang được hồ sơ sử dụng, tìm mục tương ứng trong danh mục hoặc tạo/ghép nhóm khi cần. Khi xác nhận một tên tạm khớp với đường/hẻm chuẩn, hệ thống cập nhật tham chiếu địa chỉ của các hồ sơ liên quan để giảm số địa chỉ chưa chuẩn hóa. |
