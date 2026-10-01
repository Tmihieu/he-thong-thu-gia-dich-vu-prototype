# 4 luồng nghiệp vụ chính (Main Business Flows)

Bản rút gọn ngày 30/09/2026, dùng để chỉnh sơ đồ swimlane. Mỗi dòng là một hành động trong làn tương ứng; chỉ giữ các nhánh làm thay đổi luồng nghiệp vụ. Đăng nhập, kiểm tra dữ liệu nhập và thông báo lỗi thông thường không đưa vào sơ đồ.

**Phạm vi:** Luồng 1–3 mô tả nghiệp vụ hiện tại; Luồng 4 là thiết kế mục tiêu (to-be) theo `docs/cho-do-cu-spec.md`.

**Các làn:** Quản trị, Cán bộ xã, Công ty môi trường, Người đi thu, Người dân, Lãnh đạo và Hệ thống. Chỉ dùng các làn có tham gia trong từng luồng.

---

## 1. Mở kỳ và phát hành khoản thu (BF-01)

**Trigger:** Cần tổ chức thu tiền dịch vụ cho kỳ mới.

**Điều kiện đầu vào:** Có hồ sơ đối tượng, hợp đồng và biểu giá áp dụng.

**End condition:** Khoản phải thu được phát hành; công ty xem được danh sách và tổng phải thu.

| Bước | Làn | Hành động | Nhánh / bước tiếp theo |
|---|---|---|---|
| A1 | Quản trị | Mở kỳ thu tháng hoặc quý | → A2 |
| A2 | Hệ thống | Tạo kỳ Đang thu và gắn biểu giá áp dụng | → A3 |
| A3 | Cán bộ xã | Xác định công ty phụ trách các khu vực cần thu; phân công nếu chưa có | → A4 |
| A4 | Cán bộ xã | Lập phiếu yêu cầu thu theo kỳ, loại phí và phạm vi | → A5 |
| A5 | Hệ thống | Tính khoản phải thu, hiển thị danh sách và tổng tiền để xem trước | → A6 |
| A6 | Cán bộ xã | Kiểm tra và xác nhận phát hành | Cần điều chỉnh → A3/A4; đồng ý → A7 |
| A7 | Hệ thống | Lưu phiếu và tạo khoản thu cho các đối tượng đủ điều kiện | → A8 |
| A8 | Công ty môi trường | Xem danh sách và tổng phải thu của kỳ | Kết thúc; chuyển BF-02 |

---

## 2. Thu tiền, nộp về xã và khóa kỳ (BF-02)

**Trigger:** Khoản phải thu đã được phát hành.

**End condition:** Cán bộ xã khóa kỳ sau khi không còn công ty có số còn phải nộp lớn hơn 0.

Thu trực tiếp và thanh toán app là hai cách thay thế cho một khoản. Thu, bàn giao và nộp tiền có thể lặp nhiều lần trong kỳ; không cần chờ thu hết các hộ mới nộp về xã.

| Bước | Làn | Hành động | Nhánh / bước tiếp theo |
|---|---|---|---|
| B1 | Công ty môi trường | Phân công khu vực cho người đi thu | Thu trực tiếp → B2; người dân tự thanh toán app → B5 |
| B2 | Người đi thu | Xem danh sách được giao và đến hộ thu tiền | Thu được → B3; chưa thu được → B4 |
| B3 | Người đi thu | Ghi nhận thanh toán tiền mặt hoặc chuyển khoản | → B6 |
| B4 | Người đi thu | Ghi nhận vắng, hẹn lại hoặc từ chối | Lần ghé sau → B2; người dân chuyển sang app → B5 |
| B5 | Người dân | Chọn khoản phải đóng và thanh toán trên app (mô phỏng) | → B6; nhánh này không cần chờ phân công người đi thu |
| B6 | Hệ thống | Ghi nhận thanh toán, cập nhật khoản thu và xác nhận thanh toán | Tiền mặt do người đi thu giữ → B7; chuyển khoản/app → B9 |
| B7 | Người đi thu | Bàn giao tiền mặt cho công ty | → B8 |
| B8 | Công ty môi trường | Ghi nhận tiền đã nhận từ người đi thu | → B9 |
| B9 | Công ty môi trường | Kiểm tra số phải nộp và nộp tiền về xã | → B10 |
| B10 | Cán bộ xã | Lập phiếu thu cho lần công ty nộp tiền | → B11 |
| B11 | Hệ thống | Cập nhật số đã nộp và số còn phải nộp | → B12 |
| B12 | Cán bộ xã | Đối soát số phải thu, công ty đã thu và đã nộp | Cần thu/nộp thêm → B2/B9; cần điều chỉnh tài chính → quy trình con F; đề nghị khóa kỳ → B13 |
| B13 | Cán bộ xã | Yêu cầu khóa kỳ | → B14 |
| B14 | Hệ thống | Kiểm tra nghĩa vụ còn phải nộp của các công ty | Còn công ty phải nộp > 0 → quay lại B12; không còn → khóa kỳ, kết thúc |

**Nhánh phụ chỉ vẽ khi cần:**

- **Nhắc nộp:** Cán bộ xã gửi nhắc công ty có nợ quá hạn → công ty nhận và tiếp tục nộp tại B9.
- **Sai phiếu thu:** Công ty báo sai → cán bộ xã kiểm tra, xử lý theo trạng thái kỳ → xem lại đối soát tại B12. Không sửa trực tiếp phiếu của kỳ đã khóa.

**Lưu ý nghiệp vụ:** Mỗi phiếu thuộc một kỳ; một kỳ có thể có nhiều phiếu. Số còn phải nộp = phải thu − điều chỉnh − đã nộp, gồm cả nghĩa vụ từ khoản hộ chưa đóng. Trạng thái đối soát không phải điều kiện kiểm tra khóa kỳ riêng.

### Quy trình con F: Xét duyệt điều chỉnh tài chính

Chỉ gọi khi có đề nghị miễn giảm, hoàn tiền hoặc xóa nợ, không phải bước bắt buộc của mỗi kỳ.

| Bước | Làn | Hành động | Nhánh / bước tiếp theo |
|---|---|---|---|
| F1 | Cán bộ xã | Lập đề nghị hoàn cho khoản đã thu hoặc xóa nợ cho khoản chưa thu; với miễn giảm, bật miễn trên hợp đồng | → F2 |
| F2 | Hệ thống | Lưu đề nghị và chuyển lãnh đạo xem xét; tự tạo đề nghị khi bật miễn | → F3 |
| F3 | Lãnh đạo | Duyệt hoặc từ chối đề nghị, ghi lý do nếu từ chối | → F4 |
| F4 | Hệ thống | Ghi quyết định, cập nhật số liệu theo kết quả và thông báo cho cán bộ xã | Quay lại nghiệp vụ đang xử lý; hoàn được duyệt → công ty trả tiền cho hộ ngoài hệ thống |

Miễn giảm được xã áp dụng trước, lãnh đạo duyệt sau; nếu từ chối thì bỏ miễn theo quy tắc. Hoàn/xóa nợ được áp dụng khi duyệt. Điều chỉnh liên quan kỳ đã khóa ghi nhận ở kỳ đang mở, giữ nguyên số liệu kỳ đã khóa.

---

## 3. Tiếp nhận và giải quyết khiếu nại (BF-03)

**Trigger:** Người dân phản ánh vấn đề về dịch vụ.

**End condition:** Cán bộ xã ghi kết quả và đóng khiếu nại; người dân gửi qua app xem được kết quả trên app.

| Bước | Làn | Hành động | Nhánh / bước tiếp theo |
|---|---|---|---|
| C1 | Người dân | Gửi khiếu nại qua app hoặc phản ánh điện thoại/trực tiếp | Qua app → C3; điện thoại/trực tiếp → C2 |
| C2 | Cán bộ xã | Ghi nhận khiếu nại vào hệ thống | → C3 |
| C3 | Hệ thống | Lưu khiếu nại Mới và thông báo cho cán bộ xã | → C4 |
| C4 | Cán bộ xã | Xem xét và xác định bên xử lý | Xã tự xử lý → C5; cần công ty xử lý → C6 |
| C5 | Cán bộ xã | Xử lý nội dung thuộc trách nhiệm xã | → C8; nếu cần điều chỉnh tài chính, gọi quy trình con F |
| C6 | Cán bộ xã | Chuyển khiếu nại cho công ty xử lý | → C7 |
| C7 | Công ty môi trường | Tiếp nhận, xử lý và gửi phản hồi | → C8 |
| C8 | Cán bộ xã | Xem kết quả, ghi nhận giải quyết và đóng khiếu nại | Cần xử lý thêm → C5; hoàn tất → C9 |
| C9 | Hệ thống | Lưu lịch sử, cập nhật Đã giải quyết và thông báo kết quả | Kết thúc |

Thông báo và tra cứu trên app áp dụng cho khiếu nại có tài khoản người dân liên kết. Khiếu nại do xã nhập qua điện thoại/trực tiếp không tự liên kết tài khoản app.

---

## 4. Chợ đồ cũ (BF-04 — To-be)

**Trigger:** Người dân muốn cho tặng, trao đổi, bán hoặc tìm đồ.

**End condition:** Chủ bài đóng bài khi không còn nhu cầu tiếp tục. Việc thỏa thuận và giao nhận diễn ra ngoài hệ thống.

| Bước | Làn | Hành động | Nhánh / bước tiếp theo |
|---|---|---|---|
| D1 | Người dân — Chủ bài | Đăng thông tin vật dụng và cách liên hệ | → D2 |
| D2 | Hệ thống | Lưu và hiển thị bài đăng | → D3 |
| D3 | Người dân — Người xem | Tìm kiếm và xem chi tiết bài quan tâm | Muốn liên hệ → D4; chưa phù hợp → tiếp tục D3 |
| D4 | Người dân — Người xem | Bình luận hoặc liên hệ qua số điện thoại chủ bài chia sẻ | → D5 |
| D5 | Người dân — Chủ bài | Phản hồi và thỏa thuận với người quan tâm | Chưa thống nhất → tiếp tục trao đổi tại D4; thống nhất → D6 |
| D6 | Người dân — Người xem | Thực hiện giao nhận với chủ bài ngoài hệ thống | → D7 |
| D7 | Người dân — Chủ bài | Đóng bài khi đã xong hoặc không muốn tiếp tục | → D8; có thể đóng trực tiếp từ lúc bài đang mở |
| D8 | Hệ thống | Cập nhật trạng thái bài đã đóng | Kết thúc |

Không đưa lưu bài, chặn người dùng, sửa/ẩn/mở lại bài và đăng ký rác cồng kềnh vào sơ đồ chính này. Đây là các chức năng phụ hoặc nghiệp vụ riêng, không bắt buộc để hoàn tất việc kết nối qua chợ.
