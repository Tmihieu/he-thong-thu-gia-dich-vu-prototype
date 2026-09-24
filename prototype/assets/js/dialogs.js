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
    eyebrow: "DM-01 · TH-01", title: "Phân loại và gán khu vực, công ty phụ trách", description: "Xã tạo hồ sơ hộ trước, sau đó mới phân loại, gắn khu vực và công ty phụ trách có thời gian hiệu lực.", confirm: "Lưu phân công mô phỏng",
    fields: [
      { label: "Hộ gia đình", value: "DTH-H000128 · Nguyễn Văn Minh", readonly: true },
      { type: "select", label: "Attribute type", options: ["Hộ gia đình ≤ 2 người", "Hộ gia đình ≥ 3 người", "Hộ kinh doanh", "Chủ nguồn thải nhỏ", "Chủ nguồn thải lớn"], required: true },
      { type: "select", label: "Trạng thái dịch vụ", options: ["Đang cung cấp", "Chờ phân loại", "Tạm ngưng", "Đã chấm dứt"], required: true },
      { type: "select", label: "Khu vực / tổ dân phố", options: ["Tổ 7 · Đông Thạnh", "Tổ 4 · Đông Thạnh", "Tổ 6 · Đông Thạnh"], required: true },
      { type: "select", label: "Công ty phụ trách", options: APP_DATA.contractors, required: true, help: "Công ty đang được giao khu vực; thay công ty tạo phân công mới" },
      { type: "date", label: "Hiệu lực từ", value: "2026-09-01", required: true },
      { type: "textarea", label: "Ghi chú phân loại", placeholder: "Nguồn xác minh và trường hợp ngoại lệ", full: true }
    ]
  },
  requestServiceSuspension: {
    eyebrow: "Nợ → cảnh báo → phê duyệt", title: "Xem đề nghị tạm ngưng dịch vụ", description: "Nợ nhiều kỳ không làm dịch vụ tự động bị cắt. Chỉ tạm ngưng sau khi hồ sơ được phê duyệt và nhà thầu đã nhận thông báo.", confirm: "Gửi lãnh đạo duyệt",
    summary: [["Hộ", "DTH-H000662"], ["Công nợ", "3 kỳ · 240.000đ"], ["Dịch vụ", "Vẫn đang cung cấp"]],
    fields: [
      { label: "Người đề nghị", value: "Phan Văn Thắng · Chủ hộ", readonly: true },
      { type: "select", label: "Hướng xử lý", options: ["Đề nghị tạm ngưng có thời hạn", "Tiếp tục dịch vụ và lập lịch trả nợ", "Yêu cầu xác minh thực địa"], required: true },
      { type: "date", label: "Ngày hiệu lực dự kiến", value: "2026-10-01", required: true },
      { type: "date", label: "Ngày xem xét khôi phục", value: "2026-12-31" },
      { type: "checkbox", label: "Xác nhận hệ thống không tự động cắt dịch vụ chỉ vì phát sinh nợ", checked: true, required: true, full: true },
      { type: "checkbox", label: "Sau khi duyệt: khóa khoản mới/QR theo hiệu lực và thông báo nhà thầu", checked: true, required: true, full: true },
      { type: "file", label: "Đơn đề nghị hoặc minh chứng", required: true },
      { type: "textarea", label: "Ý kiến cán bộ xã", placeholder: "Kết quả rà soát công nợ, dịch vụ và đề xuất", required: true, full: true }
    ]
  },
  importData: {
    eyebrow: "DM-02", title: "Nhập dữ liệu theo lô", description: "Tệp chỉ được đưa vào dữ liệu chính thức sau khi kiểm tra cấu trúc và chống trùng.", confirm: "Kiểm tra tệp",
    fields: [
      { type: "file", label: "Tệp dữ liệu", required: true, help: "Chấp nhận .xlsx hoặc .csv theo mẫu" },
      { type: "select", label: "Nguồn dữ liệu", options: ["Đông Thạnh cũ", "Thới Tam Thôn cũ", "Nhị Bình cũ", "Bổ sung thực địa"], required: true },
      { type: "select", label: "Loại dữ liệu", options: ["Đối tượng & hợp đồng", "Công nợ kế thừa", "Danh sách khu vực"], required: true },
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
    eyebrow: "HD-01", title: "Sinh khoản phải thu hàng loạt", description: "Khoản được tính từ snapshot hợp đồng và biểu giá tại kỳ.", confirm: "Sinh bản nháp & Xuất Excel",
    fields: [
      COMMON_PERIOD_FIELD,
      { type: "select", label: "Địa bàn", options: ["Toàn xã", "Đông Thạnh", "Thới Tam Thôn", "Nhị Bình"], required: true },
      {
        type: "select",
        label: "Tổ dân phố",
        options: [
          "Tất cả tổ dân phố",
          "Tổ 1", "Tổ 2", "Tổ 3", "Tổ 4", "Tổ 5", "Tổ 6", "Tổ 7", "Tổ 8", "Tổ 9", "Tổ 10",
          "Tổ 11", "Tổ 12", "Tổ 13", "Tổ 14", "Tổ 15", "Tổ 16", "Tổ 17", "Tổ 18", "Tổ 19", "Tổ 20",
          "Tổ 21", "Tổ 22", "Tổ 23", "Tổ 24"
        ],
        required: true
      },
      { type: "select", label: "Loại đối tượng", options: ["Tất cả", "Hộ gia đình", "Hộ kinh doanh", "Doanh nghiệp/cơ quan"], required: true },
      { type: "checkbox", label: "Xuất file Excel bản nháp các hộ gia đình và khoản thu theo hộ", checked: true, full: true },
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
  contractDecision: {
    eyebrow: "Quy tắc hợp đồng", title: "Xác định cách xử lý hợp đồng", description: "Hợp đồng chỉ thay đổi khi nhà thầu mới là bên ký hợp đồng dịch vụ; việc giao thực hiện/thu chỉ thay assignment.", confirm: "Xác nhận phương án mô phỏng",
    fields: [
      { type: "select", label: "Vai trò nhà thầu mới", options: ["Chỉ được giao thực hiện/thu", "Là bên ký hợp đồng dịch vụ"], required: true },
      { label: "Hợp đồng hiện tại", value: "HĐ-DTH-0128 · còn hiệu lực", readonly: true },
      { type: "select", label: "Phương án", options: ["Giữ hợp đồng, tạo assignment mới", "Kết thúc hợp đồng cũ và tạo hợp đồng mới"], required: true },
      { type: "date", label: "Ngày áp dụng", value: "2026-10-01", required: true },
      { type: "checkbox", label: "Không sửa/xóa lịch sử hợp đồng hoặc phân công cũ", checked: true, required: true, full: true },
      { type: "textarea", label: "Căn cứ xác định vai trò pháp lý", placeholder: "Hợp đồng, quyết định giao nhiệm vụ hoặc văn bản liên quan", required: true, full: true }
    ]
  },
  createRequest: {
    eyebrow: "CN-04/06/07", title: "Lập đề nghị tài chính", description: "Người lập đề nghị không được tự phê duyệt hồ sơ này.", confirm: "Gửi lãnh đạo duyệt",
    fields: [
      { type: "select", label: "Loại đề nghị", options: ["Tạm ngưng dịch vụ", "Miễn giảm", "Hoàn tiền", "Xóa nợ", "Hủy/điều chỉnh hóa đơn"], required: true },
      { label: "Mã khoản/đối tượng", placeholder: "Nhập mã để tra cứu", required: true },
      { type: "number", label: "Số tiền ảnh hưởng", placeholder: "0", min: 0, required: true },
      { type: "select", label: "Căn cứ", options: ["Hộ chính sách", "Thu trùng/chuyển nhầm", "Đối tượng không còn tồn tại", "Sai dữ liệu/hợp đồng", "Khác"], required: true },
      { type: "file", label: "Minh chứng", required: true },
      { type: "textarea", label: "Nội dung đề nghị", placeholder: "Mô tả đầy đủ lý do và căn cứ", required: true, full: true }
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
      { type: "select", label: "Khu vực được giao", options: ["Tổ 7 · Đông Thạnh", "Tổ 4 · Đông Thạnh", "Tổ 6 · Đông Thạnh"], required: true },
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "checkbox", label: "Chặn bản ghi hộ đã tạm ngưng/chấm dứt", checked: true, required: true, full: true },
      { type: "checkbox", label: "Chặn mã giao dịch đã tồn tại", checked: true, required: true, full: true },
      { type: "checkbox", label: "Chỉ cho phép hộ đã xác minh thuộc công ty", checked: true, required: true, full: true },
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
  closeShift: {
    eyebrow: "TH-14", title: "Chốt ca và bàn giao", description: "Đối chiếu danh sách đã thu, tiền mặt, chuyển khoản và giao dịch chưa đồng bộ.", confirm: "Gửi chốt ca",
    summary: [["Đã thu", "15 khoản"], ["Chuyển khoản", "720.000đ"], ["Tiền mặt", "240.000đ"]],
    fields: [
      { label: "Mã ca", value: "CA-1209-NTL", readonly: true },
      { label: "Khu vực", value: "Tổ 7 · Đông Thạnh", readonly: true },
      { label: "Tiền mặt thực tế", value: "240.000", required: true },
      { label: "Chênh lệch", value: "0đ", readonly: true },
      { type: "select", label: "Người nhận bàn giao", options: ["Thủ quỹ công ty", "Chuyển khoản toàn bộ theo mã"], required: true },
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
  reviewApproval: {
    eyebrow: "Phê duyệt bắt buộc", title: "Xem xét đề nghị nghiệp vụ/tài chính", description: "Bao gồm tạm ngưng dịch vụ và các quyết định về tiền. Người duyệt chịu trách nhiệm và không được là người lập hồ sơ.", confirm: "Phê duyệt mô phỏng",
    summary: [["Hồ sơ", "YC-2609-021"], ["Loại", "Tạm ngưng dịch vụ"], ["Công nợ", "3 kỳ · 240.000đ"]],
    fields: [
      { type: "select", label: "Quyết định", options: ["Phê duyệt", "Từ chối", "Yêu cầu bổ sung"], required: true },
      { type: "textarea", label: "Ý kiến lãnh đạo", placeholder: "Nhập căn cứ và ý kiến xử lý", required: true, full: true },
      { type: "checkbox", label: "Tôi xác nhận đã kiểm tra hồ sơ và không phải người đề nghị", required: true, full: true }
    ]
  },
  closePeriod: {
    eyebrow: "BR-14", title: "Chốt và khóa kỳ", description: "Kỳ chỉ được khóa khi toàn bộ điều kiện bắt buộc đạt yêu cầu.", confirm: "Khóa kỳ mô phỏng",
    summary: [["Kỳ", "09/2026"], ["Đạt", "0/4 điều kiện"], ["Đang chặn", "Danh sách hộ · đơn giá · sao kê · xác nhận báo cáo"]],
    fields: [
      { type: "checkbox", label: "Danh sách hộ theo từng công ty đã được xác minh", full: true, required: true },
      { type: "checkbox", label: "Đơn giá xử lý có hiệu lực đã được cấu hình", full: true, required: true },
      { type: "checkbox", label: "Đối soát tiền công ty thực nộp đã hoàn tất", full: true, required: true },
      { type: "checkbox", label: "Báo cáo đã được lãnh đạo xác nhận", full: true, required: true },
      { type: "textarea", label: "Ý kiến khóa kỳ", placeholder: "Không thể hoàn tất khi còn điều kiện chưa đạt", full: true }
    ]
  },
  addUser: {
    eyebrow: "QT-01", title: "Thêm người dùng", description: "Tạo tài khoản và gán quyền tối thiểu theo nhiệm vụ.", confirm: "Tạo tài khoản mô phỏng",
    fields: [
      { label: "Họ và tên", placeholder: "Nhập họ tên", required: true },
      { label: "Tên đăng nhập", placeholder: "Tự động gợi ý", required: true },
      { type: "select", label: "Đơn vị", options: ["Phòng Kinh tế", "UBND xã", "Công ty MTĐT Đông Thạnh", "Đơn vị triển khai"], required: true },
      { type: "select", label: "Vai trò", options: ["Cán bộ xã", "Công ty thu gom", "Nhân viên thu công ty", "Kế toán", "Lãnh đạo", "Quản trị hệ thống"], required: true },
      { label: "Số điện thoại", placeholder: "Dùng xác thực/thu hồi tài khoản" },
      { type: "checkbox", label: "Bắt buộc đổi mật khẩu khi đăng nhập lần đầu", checked: true, full: true },
      { type: "checkbox", label: "Bắt buộc xác thực hai lớp", checked: true, full: true }
    ]
  },
  editPermissions: {
    eyebrow: "QT-02", title: "Cấu hình vai trò và phạm vi", description: "Quyền giao diện phải tương ứng với quyền API và truy vấn dữ liệu.", confirm: "Lưu cấu hình mô phỏng",
    fields: [
      { type: "select", label: "Vai trò", options: ["Cán bộ xã", "Công ty thu gom", "Nhân viên thu công ty", "Kế toán", "Lãnh đạo", "Quản trị hệ thống"], required: true },
      { type: "select", label: "Phạm vi dữ liệu", options: ["Toàn xã", "Theo công ty", "Theo khu vực", "Theo danh sách nội bộ", "Chỉ bản ghi do mình tạo"], required: true },
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
      <article class="alert-item danger"><span class="alert-icon">!</span><div><h4>4 khoản nộp chưa rõ công ty hoặc kỳ</h4><p>Kế toán cần xác minh trước khi khóa kỳ 09/2026.</p></div></article>
      <article class="alert-item"><span class="alert-icon">!</span><div><h4>Công ty MTĐT Đông Thạnh chưa kê khai phần xử lý</h4><p>Kỳ 09/2026 · quá hạn kê khai 1 ngày.</p></div></article>
      <article class="task-item"><span class="task-icon">✓</span><div><h4>5 hồ sơ đang chờ lãnh đạo duyệt</h4><p>Miễn giảm, hoàn tiền, xóa nợ và hủy hóa đơn.</p></div></article>
      <article class="task-item"><span class="task-icon">↻</span><div><h4>Sao kê cập nhật lúc 10:20</h4><p>31 giao dịch mới: 27 khớp tự động, 4 chờ xác minh.</p></div></article>
    </div>`;
  }
  if (spec.content === "qr") {
    const cells = Array.from({ length: 169 }, (_, i) => `<i class="${((i * 7 + i % 5 + Math.floor(i / 13) * 3) % 4 !== 0 || i < 18 || i > 150) ? "on" : ""}"></i>`).join("");
    return `<div class="qr-card"><div class="qr-visual"><div class="qr-grid">${cells}</div></div><div class="qr-details"><span class="badge success">Đúng khoản · 09/2026</span><strong>Nguyễn Văn Minh</strong><strong class="qr-amount">80.000đ</strong><span class="muted">Tài khoản nhận: UBND xã Đông Thạnh</span><div class="code-box">DTH0926H000128</div><small class="muted">Không sửa nội dung chuyển khoản. QR chỉ dùng cho khoản được hiển thị.</small></div></div>`;
  }
  const summary = spec.summary ? `<div class="dialog-summary">${spec.summary.map(item => `<div><span>${item[0]}</span><strong>${item[1]}</strong></div>`).join("")}</div>` : "";
  return `${summary}<div class="form-grid">${(spec.fields || []).map(renderField).join("")}</div>`;
}
