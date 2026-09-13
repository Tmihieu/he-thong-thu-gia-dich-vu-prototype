"use strict";

const COMMON_PERIOD_FIELD = { type: "select", label: "Kỳ thu", value: "09/2026", options: ["09/2026", "08/2026", "10/2026 (dự thảo)"], required: true };

const DIALOG_SPECS = {
  notifications: {
    eyebrow: "Trung tâm thông báo", title: "Thông báo cần chú ý", description: "Tổng hợp cảnh báo theo vai trò và phạm vi dữ liệu hiện tại.", confirm: "Đánh dấu đã đọc",
    content: "notifications"
  },
  profile: {
    eyebrow: "Tài khoản", title: "Thông tin phiên làm việc", description: "Phiên bản minh họa quyền và phạm vi dữ liệu.", confirm: "Đóng",
    fields: [
      { label: "Tài khoản", value: "nguyenthanhlong", readonly: true },
      { label: "Đơn vị", value: "Tổ thu 03 · Đông Thạnh", readonly: true },
      { label: "Xác thực hai lớp", value: "Đã bật", readonly: true },
      { label: "Thiết bị", value: "Chrome · Windows", readonly: true }
    ]
  },
  addSubject: {
    eyebrow: "DM-01", title: "Thêm đối tượng sử dụng dịch vụ", description: "Tạo hồ sơ trước khi lập hợp đồng và sinh khoản.", confirm: "Tạo hồ sơ mô phỏng",
    fields: [
      { type: "section", label: "Thông tin định danh" },
      { type: "select", label: "Loại đối tượng", options: ["Hộ gia đình", "Hộ kinh doanh", "Doanh nghiệp", "Cơ quan/đơn vị"], required: true },
      { label: "Tên chủ hộ/đơn vị", placeholder: "Nhập họ tên hoặc tên tổ chức", required: true },
      { label: "Mã hồ sơ cũ", placeholder: "Nếu kế thừa từ xã cũ" },
      { label: "Số điện thoại", placeholder: "09xx xxx xxx" },
      { type: "section", label: "Địa bàn và dịch vụ" },
      { type: "select", label: "Địa bàn", options: ["Đông Thạnh", "Thới Tam Thôn", "Nhị Bình"], required: true },
      { label: "Địa chỉ", placeholder: "Số nhà, đường, ấp", required: true },
      { type: "select", label: "Nhóm giá dự kiến", options: ["Hộ ≤ 2 người", "Hộ ≥ 3 người", "Chủ nguồn thải nhỏ", "Theo khối lượng"], required: true },
      { type: "number", label: "Số người", placeholder: "Chỉ dùng cho hộ gia đình", min: 1 },
      { type: "textarea", label: "Ghi chú xác minh", placeholder: "Nguồn dữ liệu và thông tin cần kiểm tra", full: true }
    ]
  },
  classifyAssign: {
    eyebrow: "DM-01 · TH-01", title: "Phân loại và gán tuyến xử lý rác", description: "Xã tạo hồ sơ hộ trước, sau đó mới phân loại, chọn đơn vị và tuyến có thời gian hiệu lực.", confirm: "Lưu phân công mô phỏng",
    fields: [
      { label: "Hộ gia đình", value: "DTH-H000128 · Nguyễn Văn Minh", readonly: true },
      { type: "select", label: "Attribute type", options: ["Hộ gia đình ≤ 2 người", "Hộ gia đình ≥ 3 người", "Hộ kinh doanh", "Chủ nguồn thải nhỏ", "Chủ nguồn thải lớn"], required: true },
      { type: "select", label: "Trạng thái dịch vụ", options: ["Đang cung cấp", "Chờ phân loại", "Tạm ngưng", "Đã chấm dứt"], required: true },
      { type: "select", label: "Đơn vị xử lý/thu", options: ["ĐV Đông Thạnh", "ĐV Thới Tam Thôn", "ĐV Nhị Bình"], required: true },
      { type: "select", label: "Tuyến", options: ["DTH-T07 · ấp 7", "DTH-T04 · ấp 4", "DTH-T06 · ấp 6"], required: true },
      { type: "date", label: "Hiệu lực từ", value: "2026-09-01", required: true },
      { type: "textarea", label: "Ghi chú phân loại", placeholder: "Nguồn xác minh và trường hợp ngoại lệ", full: true }
    ]
  },
  terminateService: {
    eyebrow: "Kiểm soát dịch vụ", title: "Tạm ngưng hoặc chấm dứt dịch vụ", description: "Sau ngày hiệu lực, hệ thống khóa thu/QR và đưa mọi khoản thu mới vào hàng chờ ngoại lệ.", confirm: "Gửi yêu cầu mô phỏng",
    fields: [
      { label: "Hộ gia đình", value: "DTH-H001152 · Lê Quốc Bảo", readonly: true },
      { type: "select", label: "Thao tác", options: ["Tạm ngưng", "Chấm dứt dịch vụ", "Khôi phục dịch vụ"], required: true },
      { type: "date", label: "Ngày hiệu lực", value: "2026-08-31", required: true },
      { type: "select", label: "Lý do", options: ["Hộ chuyển đi", "Nhà bỏ trống", "Chấm dứt hợp đồng", "Sai phân công đơn vị", "Khác"], required: true },
      { type: "file", label: "Căn cứ/minh chứng", required: true },
      { type: "checkbox", label: "Thu hồi khỏi tuyến, khóa QR và thông báo đơn vị thu", checked: true, required: true, full: true },
      { type: "textarea", label: "Ghi chú", full: true }
    ]
  },
  createContract: {
    eyebrow: "DM-10", title: "Tạo hợp đồng dịch vụ", description: "Liên kết đối tượng với dịch vụ, đơn vị cung cấp và phiên bản giá.", confirm: "Tạo hợp đồng mô phỏng",
    fields: [
      { label: "Đối tượng", value: "DTH-H000128 · Nguyễn Văn Minh", readonly: true },
      { label: "Mã hợp đồng", value: "Tự động khi lưu", readonly: true },
      { type: "select", label: "Đơn vị cung cấp", options: ["Đơn vị dịch vụ Đông Thạnh", "Đơn vị dịch vụ Thới Tam Thôn", "Đơn vị dịch vụ Nhị Bình"], required: true },
      { type: "select", label: "Phiên bản biểu giá", options: ["BG-65-G2-H3", "BG-65-G2-H2", "Cần xác minh"], required: true },
      { type: "date", label: "Ngày bắt đầu", value: "2026-09-01", required: true },
      { type: "date", label: "Ngày kết thúc" },
      { type: "textarea", label: "Phạm vi dịch vụ", value: "Thu gom 01 lần/ngày theo tuyến được phân công", full: true }
    ]
  },
  importData: {
    eyebrow: "DM-02", title: "Nhập dữ liệu theo lô", description: "Tệp chỉ được đưa vào dữ liệu chính thức sau khi kiểm tra cấu trúc và chống trùng.", confirm: "Kiểm tra tệp",
    fields: [
      { type: "file", label: "Tệp dữ liệu", required: true, help: "Chấp nhận .xlsx hoặc .csv theo mẫu" },
      { type: "select", label: "Nguồn dữ liệu", options: ["Đông Thạnh cũ", "Thới Tam Thôn cũ", "Nhị Bình cũ", "Bổ sung thực địa"], required: true },
      { type: "select", label: "Loại dữ liệu", options: ["Đối tượng & hợp đồng", "Công nợ kế thừa", "Danh sách tuyến"], required: true },
      { type: "select", label: "Cách xử lý bản ghi trùng", options: ["Đưa vào hàng chờ so sánh", "Bỏ qua, không ghi đè"], required: true },
      { type: "textarea", label: "Ghi chú lô nhập", placeholder: "Nguồn cung cấp, ngày chốt dữ liệu...", full: true }
    ]
  },
  resolveDuplicate: {
    eyebrow: "DM-04", title: "So sánh bản ghi nghi trùng", description: "Không tự động gộp dữ liệu tài chính hoặc công nợ.", confirm: "Gửi kết quả xử lý",
    summary: [["Bản ghi A", "DTH-H000128"], ["Bản ghi B", "DT-CU-00842"], ["Độ tương đồng", "94%"]],
    fields: [
      { type: "select", label: "Kết luận", options: ["Cùng một đối tượng", "Hai đối tượng khác nhau", "Cần xác minh thực địa"], required: true },
      { type: "select", label: "Hồ sơ chính", options: ["DTH-H000128", "DT-CU-00842"], required: true },
      { type: "textarea", label: "Lý do và căn cứ", placeholder: "Nêu trường dữ liệu đã đối chiếu", required: true, full: true }
    ]
  },
  createPeriod: {
    eyebrow: "BG-02", title: "Tạo kỳ thu mới", description: "Kỳ mới chỉ được phát hành khi dữ liệu và biểu giá đã sẵn sàng.", confirm: "Tạo kỳ dự thảo",
    fields: [
      { label: "Mã kỳ", value: "KT-2026-10", readonly: true },
      { label: "Tên kỳ", value: "Tháng 10/2026", required: true },
      { type: "date", label: "Ngày mở dự kiến", value: "2026-10-01", required: true },
      { type: "date", label: "Hạn nộp", value: "2026-10-31", required: true },
      { type: "select", label: "Căn cứ giá", options: ["Chưa xác định – cần BA xác nhận", "QĐ 65/2026/QĐ-UBND"], required: true },
      { type: "textarea", label: "Ghi chú", value: "Không phát hành nếu còn hợp đồng thiếu biểu giá.", full: true }
    ]
  },
  precheckPeriod: {
    eyebrow: "Kiểm tra tự động", title: "Kiểm tra điều kiện phát hành", description: "Hệ thống rà hợp đồng, biểu giá, dữ liệu trùng và công nợ liên kết.", confirm: "Chạy kiểm tra mô phỏng",
    summary: [["Hợp đồng hiệu lực", "48.672"], ["Sẵn sàng", "48.654"], ["Đang lỗi", "18"]],
    fields: [
      COMMON_PERIOD_FIELD,
      { type: "checkbox", label: "Kiểm tra hợp đồng thiếu biểu giá", checked: true, full: true },
      { type: "checkbox", label: "Kiểm tra đối tượng trùng hoặc chưa xác minh", checked: true, full: true },
      { type: "checkbox", label: "Kiểm tra khoản trùng trong cùng kỳ", checked: true, full: true }
    ]
  },
  generateBatch: {
    eyebrow: "HD-01", title: "Sinh khoản phải thu hàng loạt", description: "Khoản được tính từ snapshot hợp đồng và biểu giá tại kỳ.", confirm: "Sinh bản nháp",
    fields: [
      COMMON_PERIOD_FIELD,
      { type: "select", label: "Địa bàn", options: ["Toàn xã", "Đông Thạnh", "Thới Tam Thôn", "Nhị Bình"], required: true },
      { type: "select", label: "Loại đối tượng", options: ["Tất cả", "Hộ gia đình", "Hộ kinh doanh", "Doanh nghiệp/cơ quan"], required: true },
      { type: "checkbox", label: "Giữ khoản lỗi ở hàng chờ, không phát hành", checked: true, full: true },
      { type: "textarea", label: "Ghi chú đợt", value: "Đợt chính kỳ 09/2026", full: true }
    ]
  },
  issueBatch: {
    eyebrow: "HD-02", title: "Xác nhận phát hành đợt", description: "Sau khi phát hành, khoản nhận mã thanh toán và xuất hiện trên danh sách thu.", confirm: "Phát hành mô phỏng",
    summary: [["Mã đợt", "DOT-TTT-0926-01"], ["Khoản hợp lệ", "16.987"], ["Tổng giá trị", "1,337 tỷ"]],
    fields: [
      { type: "checkbox", label: "Tôi đã kiểm tra báo cáo lỗi và biểu giá", required: true, full: true },
      { type: "textarea", label: "Ý kiến người chịu trách nhiệm", placeholder: "Nhập ý kiến phát hành", required: true, full: true }
    ]
  },
  addAdHocCharge: {
    eyebrow: "HD-03", title: "Tạo khoản thu lẻ", description: "Khoản lẻ dùng chung kỳ, mã và quy tắc với đợt hàng loạt.", confirm: "Tạo khoản mô phỏng",
    fields: [
      { label: "Mã/tên đối tượng", placeholder: "Tìm theo mã, tên hoặc số điện thoại", required: true },
      COMMON_PERIOD_FIELD,
      { type: "select", label: "Loại dịch vụ", options: ["Thu gom & vận chuyển CTRSH", "Điều chỉnh kỳ"], required: true },
      { label: "Biểu giá áp dụng", value: "Tự lấy từ hợp đồng", readonly: true },
      { type: "textarea", label: "Lý do tạo ngoài đợt", placeholder: "Hộ mới, khôi phục dịch vụ...", required: true, full: true }
    ]
  },
  assignRoute: {
    eyebrow: "TH-01", title: "Phân công công ty và người đi thu", description: "Công ty là đầu mối phối hợp, không cần tài khoản hệ thống. Xã cấp quyền tuyến trực tiếp cho người đi thu trong thời gian hiệu lực.", confirm: "Lưu phân công mô phỏng",
    fields: [
      COMMON_PERIOD_FIELD,
      { type: "select", label: "Tuyến đường có sẵn", options: ["DTH-T07 · Đặng Thúc Vịnh – ấp 7", "DTH-T04 · Nguyễn Ảnh Thủ – ấp 4", "TTT-T11 · Trịnh Thị Miếng – ấp 3", "NB-T03 · Hà Huy Giáp – ấp 2"], required: true },
      { type: "select", label: "Công ty phụ trách", options: ["Công ty MTĐT Đông Thạnh", "HTX Môi trường An Phú", "Công ty Dịch vụ Hóc Môn", "HTX Xanh Nhị Bình", "Công ty Môi trường Tân Tiến"], required: true, help: "Chỉ lưu để quản lý trách nhiệm và liên hệ; không tạo tài khoản cho công ty" },
      { label: "Người quản lý công ty", placeholder: "Họ tên và số điện thoại liên hệ", required: true },
      { type: "select", label: "Người đi thu được xã giao", options: ["Nguyễn Thành Long", "Phạm Minh Tuấn", "Võ Thị Lan", "Trần Quốc Huy", "Lương Thị Ngọc"], required: true },
      { type: "date", label: "Hiệu lực từ", value: "2026-09-01", required: true },
      { type: "date", label: "Hiệu lực đến", value: "2026-09-30", required: true },
      { type: "textarea", label: "Phạm vi tuyến / điểm đầu–cuối", placeholder: "Mô tả đoạn đường, hẻm và điểm bàn giao", required: true, full: true }
    ]
  },
  urgeRouteManager: {
    eyebrow: "Theo dõi tiến độ", title: "Đốc thúc quản lý tuyến", description: "Xã gửi yêu cầu tới người quản lý phụ trách; người quản lý làm việc với người đi thu và các hộ còn công nợ.", confirm: "Gửi yêu cầu mô phỏng",
    summary: [["Tuyến", "TTT-T08"], ["Tiến độ", "56%"], ["Còn công nợ", "207 hộ"]],
    fields: [
      { label: "Người quản lý", value: "Nguyễn Quốc Dũng · 0938 447 202", readonly: true },
      { label: "Người đi thu", value: "Lương Thị Ngọc", readonly: true },
      { type: "select", label: "Mức ưu tiên", options: ["Cần xử lý trong ngày", "Theo dõi trong 2 ngày", "Nhắc thông thường"], required: true },
      { type: "date", label: "Hạn phản hồi", value: "2026-09-15", required: true },
      { type: "textarea", label: "Nội dung yêu cầu", value: "Kiểm tra tiến độ tuyến, liên hệ các hộ còn công nợ và phản hồi nguyên nhân chậm.", required: true, full: true },
      { type: "checkbox", label: "Ghi nhận yêu cầu vào lịch sử tuyến", checked: true, required: true, full: true }
    ]
  },
  sendReminder: {
    eyebrow: "CN-05", title: "Lập đợt nhắc nợ", description: "Chọn phạm vi và mẫu thông báo; không gửi thật trong prototype.", confirm: "Tạo đợt nhắc mô phỏng",
    fields: [
      { type: "select", label: "Nhóm tuổi nợ", options: ["Trên 30 ngày", "Trên 60 ngày", "Trên 90 ngày", "Tất cả quá hạn"], required: true },
      { type: "select", label: "Địa bàn", options: ["Toàn xã", "Đông Thạnh", "Thới Tam Thôn", "Nhị Bình"], required: true },
      { type: "select", label: "Kênh", options: ["SMS", "Zalo", "Danh sách gọi điện", "Giấy báo"], required: true },
      { type: "textarea", label: "Nội dung mẫu", value: "UBND xã Đông Thạnh thông báo khoản giá dịch vụ CTRSH đang quá hạn...", full: true }
    ]
  },
  createRequest: {
    eyebrow: "CN-04/06/07", title: "Lập đề nghị tài chính", description: "Người lập đề nghị không được tự phê duyệt hồ sơ này.", confirm: "Gửi lãnh đạo duyệt",
    fields: [
      { type: "select", label: "Loại đề nghị", options: ["Miễn giảm", "Hoàn tiền", "Xóa nợ", "Hủy/điều chỉnh hóa đơn"], required: true },
      { label: "Mã khoản/đối tượng", placeholder: "Nhập mã để tra cứu", required: true },
      { type: "number", label: "Số tiền ảnh hưởng", placeholder: "0", min: 0, required: true },
      { type: "select", label: "Căn cứ", options: ["Hộ chính sách", "Thu trùng/chuyển nhầm", "Đối tượng không còn tồn tại", "Sai dữ liệu/hợp đồng", "Khác"], required: true },
      { type: "file", label: "Minh chứng", required: true },
      { type: "textarea", label: "Nội dung đề nghị", placeholder: "Mô tả đầy đủ lý do và căn cứ", required: true, full: true }
    ]
  },
  startShift: {
    eyebrow: "Ca hiện trường", title: "Bắt đầu ca thu", description: "Tải danh sách được giao và ghi nhận thiết bị sử dụng.", confirm: "Bắt đầu ca mô phỏng",
    summary: [["Người thu", "Nguyễn Thành Long"], ["Tuyến", "DTH-T07"], ["Hộ hôm nay", "24"]],
    fields: [
      { type: "select", label: "Phạm vi hôm nay", options: ["Toàn bộ tuyến DTH-T07", "Đoạn 1 · số 1–24", "Đoạn 2 · số 25–48"], required: true },
      { type: "checkbox", label: "Đã kiểm tra kết nối và danh sách tuyến", checked: true, full: true },
      { type: "checkbox", label: "Đã nhận thiết bị/máy in theo bàn giao", full: true }
    ]
  },
  collectPayment: {
    eyebrow: "TH-03/04/05", title: "Thu khoản của hộ", description: "Thông tin hộ, kỳ và giá được khóa; người thu chỉ chọn cách nộp.", confirm: "Ghi nhận mô phỏng",
    summary: [["Hộ", "DTH-H000128"], ["Kỳ", "09/2026"], ["Còn phải nộp", "80.000đ"]],
    fields: [
      { label: "Chủ hộ", value: "Nguyễn Văn Minh", readonly: true },
      { label: "Địa chỉ", value: "12/5 Đặng Thúc Vịnh", readonly: true },
      { type: "select", label: "Hình thức", options: ["Đưa QR để dân chuyển", "Nhận tiền mặt → chuyển khoản thay", "Đã nhận tiền mặt, chờ nộp"], required: true },
      { label: "Số tiền", value: "80.000", readonly: true },
      { type: "checkbox", label: "Người nộp không phải chủ hộ", full: true },
      { label: "Tên người đóng thay", placeholder: "Chỉ nhập khi có người đóng thay" },
      { label: "SĐT người đóng thay", placeholder: "Thông tin tối thiểu để truy vết" },
      { type: "textarea", label: "Ghi chú", placeholder: "Thông tin cần lưu cho kế toán", full: true }
    ]
  },
  showQr: {
    eyebrow: "TH-04", title: "QR thanh toán đang hiệu lực", description: "QR do người đi thu hiển thị/cập nhật theo cấu hình được duyệt; mọi phiên bản phải gắn tài khoản chính thức và lưu audit.", confirm: "Đã hướng dẫn người dân",
    content: "qr"
  },
  updateCollectorQr: {
    eyebrow: "QR của người đi thu", title: "Cập nhật cấu hình QR đang sử dụng", description: "Người đi thu gửi thay đổi; hệ thống không cho tự ý đổi sang tài khoản cá nhân ngoài cấu hình chính thức.", confirm: "Gửi cập nhật mô phỏng",
    summary: [["Người đi thu", "Nguyễn Thành Long"], ["Đơn vị", "ĐV Đông Thạnh"], ["Phiên bản", "QR-DTH-T07-v3"]],
    fields: [
      { type: "select", label: "Tài khoản nhận được duyệt", options: ["UBND xã Đông Thạnh · ****6688", "ĐV Đông Thạnh · ****1820"], required: true },
      { label: "Tên chủ tài khoản", value: "UBND XÃ ĐÔNG THẠNH", readonly: true },
      { label: "Mẫu nội dung", value: "{MA_KHOAN}", readonly: true },
      { type: "date", label: "Hiệu lực từ", value: "2026-09-13", required: true },
      { type: "file", label: "Căn cứ thay đổi" },
      { type: "textarea", label: "Lý do cập nhật", placeholder: "Nêu nguyên nhân và phạm vi áp dụng", required: true, full: true }
    ]
  },
  manualCollectionEntry: {
    eyebrow: "Cập nhật qua web", title: "Nhập kết quả thu từng hộ", description: "Hệ thống kiểm tra khóa hộ–kỳ–dịch vụ và chặn hộ đã chấm dứt trước khi ghi nhận.", confirm: "Kiểm tra và ghi nhận",
    fields: [
      { label: "Khóa hộ–kỳ–dịch vụ", placeholder: "Ví dụ DTH-H000128|2026-09|CTRSH", required: true },
      { label: "Mã khoản phải thu", placeholder: "PT-0926-...", required: true },
      { type: "select", label: "Kết quả", options: ["Đã thu", "Đã thu tiền mặt, chờ nộp", "Vắng nhà", "Từ chối nộp", "Sai dữ liệu hộ"], required: true },
      { type: "number", label: "Số tiền", placeholder: "0", min: 0 },
      { label: "Mã giao dịch/biên nhận", placeholder: "Bắt buộc khi đã thu" },
      { type: "datetime-local", label: "Thời điểm", value: "2026-09-13T09:30", required: true },
      { type: "textarea", label: "Ghi chú", placeholder: "Thông tin cần đối chiếu", full: true }
    ]
  },
  importCollectionResults: {
    eyebrow: "Cập nhật qua Excel", title: "Nhập kết quả thu từ tệp Excel", description: "Tệp vào vùng tạm; bản ghi trùng, sai khóa hoặc hộ đã chấm dứt bị chặn và không cập nhật công nợ.", confirm: "Kiểm tra tệp",
    fields: [
      { type: "file", label: "Tệp kết quả thu", required: true, help: "Dùng đúng file mẫu có khóa hộ–kỳ–dịch vụ" },
      { type: "select", label: "Tuyến", options: ["DTH-T07", "DTH-T04", "TTT-T11", "NB-T03"], required: true },
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "checkbox", label: "Chặn bản ghi hộ đã tạm ngưng/chấm dứt", checked: true, required: true, full: true },
      { type: "checkbox", label: "Chặn mã giao dịch đã tồn tại", checked: true, required: true, full: true },
      { type: "checkbox", label: "Chỉ cho phép hộ thuộc đơn vị/tuyến hiện tại", checked: true, required: true, full: true },
      { type: "textarea", label: "Ghi chú lô nhập", full: true }
    ]
  },
  reviewOffSystem: {
    eyebrow: "Ngoại lệ thu ngoài hệ thống", title: "Xử lý trường hợp vẫn thu sau chấm dứt", description: "Khoản không tự ghi vào đã thu; cần xác minh dịch vụ thực tế, dòng tiền và trách nhiệm đơn vị.", confirm: "Tạo hồ sơ đối soát",
    summary: [["Hộ", "DTH-H001152"], ["Chấm dứt", "31/08/2026"], ["Đơn vị báo thu", "80.000đ"]],
    fields: [
      { type: "select", label: "Kết quả xác minh sơ bộ", options: ["Đơn vị vẫn cung cấp và thu ngoài hệ thống", "Dữ liệu chấm dứt sai", "Giao dịch thuộc hộ khác", "Cần kiểm tra thực địa"], required: true },
      { type: "select", label: "Xử lý khoản tiền", options: ["Giữ ở hàng chờ", "Lập đề nghị hoàn", "Khôi phục dịch vụ sau phê duyệt"], required: true },
      { type: "date", label: "Hạn đơn vị giải trình", value: "2026-09-15", required: true },
      { type: "file", label: "Bằng chứng" },
      { type: "textarea", label: "Nội dung yêu cầu giải trình", required: true, full: true }
    ]
  },
  absentNotice: {
    eyebrow: "TH-12", title: "Ghi nhận vắng nhà và in giấy báo", description: "Hộ được đưa vào danh sách quay lại; khoản không chuyển sang đã thu.", confirm: "Ghi nhận & in mô phỏng",
    fields: [
      { label: "Hộ", value: "DTH-H000136 · Lê Hoàng Nam", readonly: true },
      { type: "datetime-local", label: "Thời điểm ghé", value: "2026-09-12T09:15", required: true },
      { type: "date", label: "Ngày dự kiến quay lại", value: "2026-09-15", required: true },
      { type: "select", label: "Cách thông báo", options: ["Để lại giấy báo", "Gọi điện", "SMS/Zalo"], required: true },
      { type: "textarea", label: "Ghi chú", value: "Không có người ở nhà; đã để giấy báo tại cửa.", full: true }
    ]
  },
  depositCash: {
    eyebrow: "TH-06", title: "Nộp tiền mặt đã thu", description: "Giao dịch chỉ được khớp hoàn tất khi xuất hiện trên sao kê.", confirm: "Ghi nhận chờ khớp",
    summary: [["Số khoản", "3"], ["Tổng tiền", "240.000đ"], ["Hạn nộp", "17:00 hôm nay"]],
    fields: [
      { type: "select", label: "Cách nộp", options: ["Chuyển khoản theo từng mã", "Bàn giao thủ quỹ theo bảng kê"], required: true },
      { label: "Mã giao dịch/bảng kê", placeholder: "Nhập sau khi thực hiện", required: true },
      { type: "datetime-local", label: "Thời điểm nộp", value: "2026-09-12T10:30", required: true },
      { type: "file", label: "Ảnh/chứng từ nộp", required: true },
      { type: "textarea", label: "Ghi chú", full: true }
    ]
  },
  closeShift: {
    eyebrow: "TH-14", title: "Chốt ca và bàn giao", description: "Đối chiếu danh sách đã thu, tiền mặt, chuyển khoản và giao dịch chưa đồng bộ.", confirm: "Gửi chốt ca",
    summary: [["Đã thu", "15 khoản"], ["Chuyển khoản", "720.000đ"], ["Tiền mặt", "240.000đ"]],
    fields: [
      { label: "Mã ca", value: "CA-1209-NTL", readonly: true },
      { label: "Tuyến", value: "DTH-T07", readonly: true },
      { label: "Tiền mặt thực tế", value: "240.000", required: true },
      { label: "Chênh lệch", value: "0đ", readonly: true },
      { type: "select", label: "Người nhận bàn giao", options: ["Thủ quỹ Tổ thu 03", "Chuyển khoản toàn bộ theo mã"], required: true },
      { type: "checkbox", label: "Tôi xác nhận không còn giao dịch chưa đồng bộ", checked: true, required: true, full: true },
      { type: "textarea", label: "Ghi chú cuối ca", placeholder: "Hộ cần quay lại hoặc sự cố phát sinh", full: true }
    ]
  },
  syncStatement: {
    eyebrow: "TH-07", title: "Đồng bộ sao kê", description: "Mỗi lần đồng bộ có mã phiên và cơ chế chống tải trùng.", confirm: "Đồng bộ mô phỏng",
    fields: [
      { type: "select", label: "Nguồn", options: ["Vietcombank API · UAT", "Tải tệp sao kê .xlsx"], required: true },
      { type: "datetime-local", label: "Từ thời điểm", value: "2026-09-12T08:00", required: true },
      { type: "datetime-local", label: "Đến thời điểm", value: "2026-09-12T10:30", required: true },
      { type: "checkbox", label: "Chỉ lấy giao dịch chưa từng nhập", checked: true, full: true }
    ]
  },
  resolveUnmatched: {
    eyebrow: "TH-08", title: "Xử lý dòng treo", description: "Gán tay phải có căn cứ và được lưu audit đầy đủ.", confirm: "Gửi kết quả xử lý",
    summary: [["Giao dịch", "VCB2609128419"], ["Số tiền", "80.000đ"], ["Ứng viên", "3 hồ sơ"]],
    fields: [
      { type: "select", label: "Hướng xử lý", options: ["Gán vào khoản", "Yêu cầu xác minh", "Lập đề nghị hoàn"], required: true },
      { label: "Mã khoản được chọn", placeholder: "Tìm theo tên người gửi hoặc số tiền", required: true },
      { type: "select", label: "Độ tin cậy", options: ["Đã gọi xác nhận", "Khớp tên + số tiền", "Có chứng từ bổ sung"], required: true },
      { type: "textarea", label: "Căn cứ xử lý", placeholder: "Nêu lý do gán và thông tin đối chiếu", required: true, full: true }
    ]
  },
  issueReceipt: {
    eyebrow: "TH-09", title: "Phát hành biên lai/HĐĐT", description: "Chỉ phát hành khi phân bổ thanh toán hợp lệ.", confirm: "Phát hành mô phỏng",
    fields: [
      { label: "Khoản", value: "DTH-0926-H000128", readonly: true },
      { label: "Thanh toán đã khớp", value: "80.000đ", readonly: true },
      { type: "select", label: "Loại chứng từ", options: ["Biên lai điện tử", "Hóa đơn điện tử"], required: true },
      { type: "select", label: "Kênh gửi", options: ["SMS", "Zalo", "Email", "In tại quầy"], required: true },
      { label: "Thông tin nhận", placeholder: "Số điện thoại hoặc email", required: true },
      { type: "textarea", label: "Ghi chú phát hành", full: true }
    ]
  },
  reconcileCash: {
    eyebrow: "BC-11", title: "Xử lý đối soát tiền mặt", description: "So sánh tiền người thu ghi nhận với dòng tiền đã nộp và bằng chứng.", confirm: "Lưu kết luận mô phỏng",
    summary: [["Người thu", "Võ Thị Lan"], ["Đã nhận", "2.160.000đ"], ["Còn lệch", "320.000đ"]],
    fields: [
      { type: "select", label: "Kết luận", options: ["Chờ người thu nộp", "Đã nộp nhưng chưa khớp", "Thiếu tiền cần giải trình", "Sai ghi nhận"], required: true },
      { type: "date", label: "Hạn xử lý", value: "2026-09-13", required: true },
      { type: "file", label: "Chứng từ/bảng kê bổ sung" },
      { type: "textarea", label: "Ý kiến kế toán", placeholder: "Nêu số khoản và căn cứ đối chiếu", required: true, full: true }
    ]
  },
  reconcileUnit: {
    eyebrow: "BC-07", title: "Đối soát đơn vị cung cấp", description: "Đối chiếu đối tượng được giao, dịch vụ thực hiện và khoản đã phát hành.", confirm: "Gửi yêu cầu giải trình",
    summary: [["Đơn vị", "Tổ thu 03"], ["Được giao", "426"], ["Lệch", "7 hồ sơ"]],
    fields: [
      { type: "select", label: "Loại sai lệch", options: ["Có dịch vụ nhưng thiếu khoản", "Có khoản nhưng chưa xác nhận dịch vụ", "Sai đối tượng/tuyến", "Khác"], required: true },
      { type: "date", label: "Hạn phản hồi", value: "2026-09-15", required: true },
      { type: "file", label: "Bảng kê đối chiếu" },
      { type: "textarea", label: "Nội dung yêu cầu", placeholder: "Mô tả các hồ sơ sai lệch", required: true, full: true }
    ]
  },
  createReport: {
    eyebrow: "BC-02/03/10", title: "Lập báo cáo", description: "Báo cáo lưu phiên bản và truy nguyên được dữ liệu tại thời điểm lập.", confirm: "Tạo báo cáo mô phỏng",
    fields: [
      { type: "select", label: "Loại báo cáo", options: ["Thu theo kỳ/địa bàn", "Công nợ theo tuổi", "Đối soát tiền mặt", "Biên lai/HĐĐT", "Miễn giảm & xóa nợ"], required: true },
      COMMON_PERIOD_FIELD,
      { type: "select", label: "Phạm vi", options: ["Toàn xã", "Đông Thạnh", "Thới Tam Thôn", "Nhị Bình"], required: true },
      { type: "select", label: "Định dạng", options: ["Xem trên hệ thống", "Excel", "PDF"], required: true },
      { type: "textarea", label: "Ghi chú phiên bản", full: true }
    ]
  },
  reviewApproval: {
    eyebrow: "Phê duyệt bắt buộc", title: "Xem xét đề nghị tài chính", description: "Người duyệt chịu trách nhiệm về quyết định và không được là người lập hồ sơ.", confirm: "Phê duyệt mô phỏng",
    summary: [["Hồ sơ", "YC-2609-018"], ["Loại", "Miễn giảm"], ["Ảnh hưởng", "80.000đ"]],
    fields: [
      { type: "select", label: "Quyết định", options: ["Phê duyệt", "Từ chối", "Yêu cầu bổ sung"], required: true },
      { type: "textarea", label: "Ý kiến lãnh đạo", placeholder: "Nhập căn cứ và ý kiến xử lý", required: true, full: true },
      { type: "checkbox", label: "Tôi xác nhận đã kiểm tra hồ sơ và không phải người đề nghị", required: true, full: true }
    ]
  },
  confirmReport: {
    eyebrow: "Xác nhận báo cáo", title: "Xác nhận báo cáo kỳ", description: "Xác nhận báo cáo không tự động khóa kỳ.", confirm: "Xác nhận mô phỏng",
    summary: [["Báo cáo", "BC-DS-0926"], ["Phiên bản", "v1.3"], ["Cập nhật", "12/09 · 09:40"]],
    fields: [
      { type: "select", label: "Kết quả", options: ["Xác nhận", "Yêu cầu chỉnh sửa"], required: true },
      { type: "textarea", label: "Ý kiến", placeholder: "Nhập ý kiến xác nhận", required: true, full: true }
    ]
  },
  closePeriod: {
    eyebrow: "BR-14", title: "Chốt và khóa kỳ", description: "Kỳ chỉ được khóa khi toàn bộ điều kiện bắt buộc đạt yêu cầu.", confirm: "Khóa kỳ mô phỏng",
    summary: [["Kỳ", "09/2026"], ["Đạt", "3/4 điều kiện"], ["Đang chặn", "12 dòng treo"]],
    fields: [
      { type: "checkbox", label: "Các đợt đã phát hành và không còn lỗi nghiêm trọng", checked: true, full: true },
      { type: "checkbox", label: "Đối soát tiền mặt đã hoàn tất", checked: true, full: true },
      { type: "checkbox", label: "Báo cáo đã được lãnh đạo xác nhận", checked: true, full: true },
      { type: "checkbox", label: "Dòng treo bắt buộc đã được xử lý", full: true },
      { type: "textarea", label: "Ý kiến khóa kỳ", placeholder: "Không thể hoàn tất khi còn điều kiện chưa đạt", full: true }
    ]
  },
  addUser: {
    eyebrow: "QT-01", title: "Thêm người dùng", description: "Tạo tài khoản và gán quyền tối thiểu theo nhiệm vụ.", confirm: "Tạo tài khoản mô phỏng",
    fields: [
      { label: "Họ và tên", placeholder: "Nhập họ tên", required: true },
      { label: "Tên đăng nhập", placeholder: "Tự động gợi ý", required: true },
      { type: "select", label: "Đơn vị", options: ["Phòng Kinh tế", "UBND xã", "Tổ thu 03", "Đơn vị triển khai"], required: true },
      { type: "select", label: "Vai trò", options: ["Cán bộ xã", "Người thu hộ", "Kế toán", "Lãnh đạo", "Quản trị hệ thống"], required: true },
      { label: "Số điện thoại", placeholder: "Dùng xác thực/thu hồi tài khoản" },
      { type: "checkbox", label: "Bắt buộc đổi mật khẩu khi đăng nhập lần đầu", checked: true, full: true },
      { type: "checkbox", label: "Bắt buộc xác thực hai lớp", checked: true, full: true }
    ]
  },
  editPermissions: {
    eyebrow: "QT-02", title: "Cấu hình vai trò và phạm vi", description: "Quyền giao diện phải tương ứng với quyền API và truy vấn dữ liệu.", confirm: "Lưu cấu hình mô phỏng",
    fields: [
      { type: "select", label: "Vai trò", options: ["Cán bộ xã", "Người thu hộ", "Kế toán", "Lãnh đạo", "Quản trị hệ thống"], required: true },
      { type: "select", label: "Phạm vi dữ liệu", options: ["Toàn xã", "Theo địa bàn", "Theo tuyến được giao", "Chỉ bản ghi do mình tạo"], required: true },
      { type: "checkbox", label: "Cho phép xem", checked: true, full: true },
      { type: "checkbox", label: "Cho phép tạo/cập nhật", full: true },
      { type: "checkbox", label: "Cho phép xuất dữ liệu", full: true },
      { type: "textarea", label: "Ghi chú kiểm soát", full: true }
    ]
  },
  addTariff: {
    eyebrow: "BG-01/03", title: "Tạo phiên bản biểu giá", description: "Phiên bản mới không làm thay đổi khoản đã phát hành ở kỳ cũ.", confirm: "Lưu biểu giá dự thảo",
    fields: [
      { label: "Mã phiên bản", placeholder: "BG-...", required: true },
      { label: "Căn cứ pháp lý", placeholder: "Số, ngày văn bản", required: true },
      { type: "select", label: "Địa bàn/nhóm", options: ["Nhóm 2 · Đông Thạnh", "Toàn xã", "Phạm vi tùy chỉnh"], required: true },
      { type: "select", label: "Nhóm đối tượng", options: ["Hộ ≤ 2 người", "Hộ ≥ 3 người", "Chủ nguồn thải nhỏ", "Chủ nguồn thải lớn"], required: true },
      { type: "select", label: "Phương pháp", options: ["Cố định/tháng", "Theo kg", "Theo thể tích"], required: true },
      { type: "number", label: "Giá thu gom", placeholder: "0", min: 0, required: true },
      { type: "number", label: "Giá vận chuyển", placeholder: "0", min: 0, required: true },
      { type: "number", label: "Giá xử lý", placeholder: "0", min: 0 },
      { type: "date", label: "Hiệu lực từ", required: true },
      { type: "date", label: "Hiệu lực đến", required: true },
      { type: "textarea", label: "Ghi chú chuyển tiếp", full: true }
    ]
  },
  configureIntegration: {
    eyebrow: "QT-06", title: "Cấu hình kết nối", description: "Thông tin bí mật chỉ minh họa, không được lưu trực tiếp ở giao diện.", confirm: "Kiểm tra kết nối mô phỏng",
    fields: [
      { type: "select", label: "Hệ thống", options: ["Ngân hàng/sao kê", "VietQR", "Hóa đơn điện tử", "Kho bạc Nhà nước"], required: true },
      { type: "select", label: "Môi trường", options: ["UAT", "Production"], required: true },
      { label: "Endpoint", placeholder: "https://...", required: true },
      { type: "password", label: "Khóa truy cập", placeholder: "••••••••", required: true },
      { type: "number", label: "Timeout (giây)", value: "30", min: 1 },
      { type: "checkbox", label: "Bật retry có kiểm soát và idempotency", checked: true, full: true }
    ]
  },
  configureMoneyFlow: {
    eyebrow: "Quyết định mở · Luồng tiền", title: "Cấu hình tài khoản nhận và QR", description: "Chỉ chọn tài khoản chính thức; tài khoản cá nhân được hiển thị là rủi ro và không phải lựa chọn mục tiêu.", confirm: "Lưu dự thảo cấu hình",
    fields: [
      { type: "select", label: "Mô hình thu", options: ["Tài khoản xã + mã/virtual account", "Tài khoản chính thức của đơn vị thu", "Chưa chốt – chỉ mô phỏng"], required: true },
      { label: "Chủ tài khoản", placeholder: "Tên pháp nhân/chủ thể chính thức", required: true },
      { label: "Ngân hàng và số tài khoản", placeholder: "Không nhập tài khoản cá nhân", required: true },
      { type: "select", label: "Cách định danh", options: ["Virtual account theo khoản", "Nội dung chuyển khoản có mã", "Bảng kê phân bổ có mã"], required: true },
      { type: "select", label: "Tần suất sao kê", options: ["Gần thời gian thực", "Mỗi 15 phút", "Cuối ngày", "Import thủ công"], required: true },
      { type: "checkbox", label: "Mọi QR của người đi thu kế thừa cấu hình này", checked: true, required: true, full: true },
      { type: "checkbox", label: "Chặn thay tài khoản nhận nếu chưa được duyệt", checked: true, required: true, full: true },
      { type: "textarea", label: "Căn cứ và ghi chú đối soát", placeholder: "Cần BA, kế toán và lãnh đạo xác nhận trước áp dụng", full: true }
    ]
  },
  runBackup: {
    eyebrow: "QT-10", title: "Tạo bản sao lưu", description: "Bản sao lưu cần được kiểm thử phục hồi theo lịch.", confirm: "Sao lưu mô phỏng",
    fields: [
      { type: "select", label: "Phạm vi", options: ["Toàn bộ cơ sở dữ liệu", "Cấu hình hệ thống", "Dữ liệu kỳ 09/2026"], required: true },
      { type: "select", label: "Loại", options: ["Đầy đủ", "Gia tăng"], required: true },
      { type: "checkbox", label: "Mã hóa tệp sao lưu", checked: true, full: true },
      { type: "textarea", label: "Ghi chú vận hành", full: true }
    ]
  },
  genericDetail: {
    eyebrow: "Chi tiết bản ghi", title: "Thông tin nghiệp vụ", description: "Dữ liệu minh họa được tổng hợp từ chuỗi nghiệp vụ liên quan.", confirm: "Đóng",
    fields: [
      { label: "Mã bản ghi", value: "DTH-0926-H000128", readonly: true },
      { label: "Kỳ", value: "09/2026", readonly: true },
      { label: "Trạng thái", value: "Đang xử lý", readonly: true },
      { label: "Cập nhật gần nhất", value: "12/09/2026 · 10:24", readonly: true },
      { type: "textarea", label: "Lịch sử gần nhất", value: "Hệ thống lưu đầy đủ người thực hiện, thời gian và thay đổi trước/sau.", readonly: true, full: true }
    ]
  }
};

function renderField(field, index) {
  if (field.type === "section") return `<div class="form-section">${field.label}</div>`;
  const id = `dialog-field-${index}`;
  const classes = `form-field${field.full ? " full" : ""}`;
  const required = field.required ? " required" : "";
  const readonly = field.readonly ? " readonly" : "";
  const value = field.value != null ? ` value="${String(field.value).replace(/"/g, "&quot;")}"` : "";
  const placeholder = field.placeholder ? ` placeholder="${field.placeholder.replace(/"/g, "&quot;")}"` : "";
  const min = field.min != null ? ` min="${field.min}"` : "";
  let control = "";

  if (field.type === "select") {
    control = `<select class="control" id="${id}"${required}>${(field.options || []).map(option => `<option${option === field.value ? " selected" : ""}>${option}</option>`).join("")}</select>`;
  } else if (field.type === "textarea") {
    control = `<textarea class="control" id="${id}"${placeholder}${readonly}${required}>${field.value || ""}</textarea>`;
  } else if (field.type === "checkbox") {
    return `<label class="${classes}" for="${id}"><span style="display:flex;gap:9px;align-items:flex-start"><input id="${id}" type="checkbox"${field.checked ? " checked" : ""}${required}> <span>${field.label}${field.required ? " *" : ""}</span></span>${field.help ? `<small class="form-help">${field.help}</small>` : ""}</label>`;
  } else {
    control = `<input class="control" id="${id}" type="${field.type || "text"}"${value}${placeholder}${readonly}${required}${min}>`;
  }

  return `<div class="${classes}"><label for="${id}">${field.label}${field.required ? " <span>*</span>" : ""}</label>${control}${field.help ? `<small class="form-help">${field.help}</small>` : ""}</div>`;
}

function renderDialogContent(spec) {
  if (spec.content === "notifications") {
    return `<div class="alert-list">
      <article class="alert-item danger"><span class="alert-icon">!</span><div><h4>12 dòng sao kê chưa xác định khoản</h4><p>Kế toán cần xử lý trước khi khóa kỳ 09/2026.</p></div></article>
      <article class="alert-item"><span class="alert-icon">!</span><div><h4>320.000đ tiền mặt đã quá hạn nộp</h4><p>Phân công tuyến TTT-T11 · người thu Võ Thị Lan.</p></div></article>
      <article class="task-item"><span class="task-icon">✓</span><div><h4>7 hồ sơ đang chờ lãnh đạo duyệt</h4><p>Miễn giảm, hoàn tiền, xóa nợ và hủy hóa đơn.</p></div></article>
      <article class="task-item"><span class="task-icon">↻</span><div><h4>Sao kê cập nhật lúc 10:20</h4><p>31 giao dịch mới: 27 khớp tự động, 4 chuyển dòng treo.</p></div></article>
    </div>`;
  }
  if (spec.content === "qr") {
    const cells = Array.from({ length: 169 }, (_, i) => `<i class="${((i * 7 + i % 5 + Math.floor(i / 13) * 3) % 4 !== 0 || i < 18 || i > 150) ? "on" : ""}"></i>`).join("");
    return `<div class="qr-card"><div class="qr-visual"><div class="qr-grid">${cells}</div></div><div class="qr-details"><span class="badge success">Đúng khoản · 09/2026</span><strong>Nguyễn Văn Minh</strong><strong class="qr-amount">80.000đ</strong><span class="muted">Tài khoản nhận: UBND xã Đông Thạnh</span><div class="code-box">DTH0926H000128</div><small class="muted">Không sửa nội dung chuyển khoản. QR chỉ dùng cho khoản được hiển thị.</small></div></div>`;
  }
  const summary = spec.summary ? `<div class="dialog-summary">${spec.summary.map(item => `<div><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join("")}</div>` : "";
  return `${summary}<div class="form-grid">${(spec.fields || []).map(renderField).join("")}</div>`;
}
