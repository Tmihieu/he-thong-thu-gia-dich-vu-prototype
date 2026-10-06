/// Nhãn tiếng Việt cho enum của backend (giữ nguyên chữ của app Expo cũ).
library;

String label(Map<String, String> map, String? key) => map[key] ?? key ?? '—';

const subjectTypeLabels = {
  'HOUSEHOLD': 'Hộ gia đình',
  'SMALL_SOURCE': 'Nguồn thải nhỏ',
  'LARGE_SOURCE': 'Nguồn thải lớn',
};

const subjectStatusLabels = {
  'ACTIVE': 'Đang cung cấp dịch vụ',
  'PENDING': 'Chờ xử lý',
  'ENDED': 'Đã chấm dứt',
};

const tariffGroupLabels = {
  'HH_UP_TO_2': 'Hộ gia đình ≤ 2 người',
  'HH_3_PLUS': 'Hộ gia đình ≥ 3 người',
  'HH_PER_CAPITA': 'Hộ gia đình theo nhân khẩu',
  'SMALL_UP_TO_126': 'Chủ nguồn thải nhỏ ≤ 126 kg/tháng',
  'SMALL_126_TO_250': 'Chủ nguồn thải nhỏ 126–250 kg/tháng',
  'SMALL_250_TO_500': 'Chủ nguồn thải nhỏ 250–500 kg/tháng',
  'BY_VOLUME': 'Chủ nguồn thải nhỏ 500–9.000 kg/tháng',
  'FULL_COST_BY_KG': 'Đăng ký cân, có phí xử lý',
};

const chargeStatusLabels = {
  'UNPAID': 'Chưa đóng',
  'PAID': 'Đã đóng',
  'EXEMPT': 'Miễn',
  'WRITTEN_OFF': 'Đã xóa nợ',
};

const paymentMethodLabels = {
  'CASH': 'Tiền mặt',
  'TRANSFER': 'Chuyển khoản',
  'APP_SIMULATED': 'Ứng dụng (mô phỏng)',
  'REFUND': 'Hoàn tiền',
};

const wasteTypeLabels = {
  'HOUSEHOLD': 'Rác sinh hoạt',
  'HOUSEHOLD_RECYCLABLE': 'Rác sinh hoạt + tái chế',
  'BULKY': 'Rác cồng kềnh (đã đăng ký)',
};

const weekdayLabels = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ nhật',
};

const weekOfMonthLabels = {
  1: 'đầu tháng',
  2: 'thứ hai của tháng',
  3: 'thứ ba của tháng',
  4: 'thứ tư của tháng',
  5: 'cuối tháng',
};

const complaintCategoryLabels = {
  'LATE_COLLECTION': 'Thu gom chậm hoặc không đúng lịch',
  'OVERCHARGE': 'Thu phí cao hơn định mức',
  'POLLUTION_POINT': 'Điểm tập kết gây ô nhiễm',
  'STAFF_ATTITUDE': 'Thái độ nhân viên thu gom',
  'OTHER': 'Vấn đề khác',
};

const complaintStatusLabels = {
  'NEW': 'Đã gửi',
  'PROCESSING': 'Đang xử lý',
  'RESOLVED': 'Đã giải quyết',
};

const complaintEventLabels = {
  'SUBMITTED': 'Bạn gửi phản ánh',
  'RECEIVED': 'Xã tiếp nhận',
  'FORWARDED': 'Xã chuyển công ty xử lý',
  'COMPANY_REPLIED': 'Công ty phản hồi',
  'CLOSED': 'Xã đóng phản ánh',
};

const marketTagLabels = {
  'FIND': 'Tìm đồ',
  'SELL': 'Bán đồ',
  'GIVE': 'Cho tặng',
  'EXCHANGE': 'Đổi đồ',
};

const marketCategoryLabels = {
  'HOUSEHOLD': 'Đồ gia dụng',
  'ELECTRONICS': 'Điện tử',
  'FURNITURE': 'Nội thất',
  'CHILDREN': 'Đồ trẻ em',
  'TOOLS_VEHICLES': 'Xe đạp và dụng cụ',
  'OTHER': 'Khác',
};

const reportReasonLabels = {
  'SPAM': 'Spam, đăng lặp',
  'PROHIBITED': 'Hàng cấm',
  'SCAM': 'Nghi lừa đảo',
  'OFFENSIVE': 'Nội dung xúc phạm',
  'OTHER': 'Lý do khác',
};

const moderationLabels = {
  'PENDING_REVIEW': 'Chờ duyệt',
  'REJECTED': 'Đã gỡ',
};
