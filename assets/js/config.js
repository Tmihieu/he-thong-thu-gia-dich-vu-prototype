"use strict";

const ROLE_CONFIG = {
  commune: {
    label: "Cán bộ xã",
    initials: "CB",
    description: "Quản lý đối tượng, hợp đồng, kỳ thu, khoản phải thu và phân công hiện trường.",
    defaultScreen: "dashboard",
    screens: [
      { id: "dashboard", group: "Điều hành", label: "Tổng quan nghiệp vụ", caption: "Công việc và tiến độ kỳ", icon: "⌂", view: "communeDashboard" },
      { id: "subjects", group: "Dữ liệu nền", label: "Đối tượng & hợp đồng", caption: "Hộ, cơ sở và hợp đồng", icon: "▦", view: "subjects" },
      { id: "data-quality", group: "Dữ liệu nền", label: "Nhập & chuẩn hóa", caption: "Import, chống trùng, ánh xạ", icon: "⇩", view: "dataQuality", count: 23 },
      { id: "periods", group: "Lập khoản", label: "Kỳ & đợt thu", caption: "Mở kỳ, kiểm tra đầu vào", icon: "◫", view: "periods" },
      { id: "billing", group: "Lập khoản", label: "Khoản & hóa đơn", caption: "Sinh, phát hành, khoản lẻ", icon: "₫", view: "billing", count: 18 },
      { id: "routes", group: "Tổ chức thu", label: "Quản lý tuyến", caption: "Khu vực, tuyến và nhà thầu", icon: "⌖", view: "routes" },
      { id: "route-detail", group: "Tổ chức thu", label: "Chi tiết tuyến", caption: "Hộ và chủ nguồn thải", icon: "▦", view: "routeDetail", hiddenInNav: true, parentScreen: "routes" },
      { id: "debts", group: "Tổ chức thu", label: "Tiến độ người đi thu", caption: "Theo người, tuyến và công nợ hộ", icon: "!", view: "collectionProgress", count: 3 },
      { id: "requests", group: "Phê duyệt", label: "Đề nghị cần duyệt", caption: "Tạm ngưng, miễn giảm, hoàn", icon: "✓", view: "requests", count: 8 }
    ]
  },
  collector: {
    label: "Người đi thu",
    initials: "NT",
    description: "Thực hiện tuyến do xã giao, cập nhật kết quả từng hộ bằng web hoặc Excel và theo dõi công nợ cần quay lại.",
    defaultScreen: "today",
    screens: [
      { id: "today", group: "Ca làm việc", label: "Hôm nay", caption: "Tuyến, nhiệm vụ và tiến độ", icon: "⌂", view: "collectorToday" },
      { id: "assigned-route", group: "Ca làm việc", label: "Tuyến được giao", caption: "Danh sách hộ cần thu", icon: "⌖", view: "collectorRoute", count: 18 },
      { id: "collection-entry", group: "Cập nhật dữ liệu", label: "Nhập kết quả thu", caption: "Nhập web hoặc tệp Excel", icon: "⇩", view: "collectorEntry", count: 5 },
      { id: "cash-pending", group: "Tiền & chứng từ", label: "Tiền mặt chờ nộp", caption: "Khoản đã nhận chưa khớp", icon: "₫", view: "cashPending", count: 3 },
      { id: "shift-close", group: "Tiền & chứng từ", label: "Chốt ca", caption: "Đối chiếu và bàn giao", icon: "▣", view: "shiftClose" },
      { id: "collector-debt", group: "Theo dõi", label: "Hộ cần quay lại", caption: "Vắng nhà và quá hạn", icon: "↻", view: "collectorDebt", count: 6 }
    ]
  },
  accountant: {
    label: "Kế toán",
    initials: "KT",
    description: "Khớp sao kê, xử lý dòng treo, chứng từ, đối soát và lập báo cáo.",
    defaultScreen: "accounting-dashboard",
    screens: [
      { id: "accounting-dashboard", group: "Điều hành", label: "Tổng quan kế toán", caption: "Việc cần xử lý trong kỳ", icon: "⌂", view: "accountingDashboard" },
      { id: "statements", group: "Dòng tiền", label: "Sao kê ngân hàng", caption: "Đồng bộ và khớp theo mã", icon: "⇩", view: "statements", count: 31 },
      { id: "unmatched", group: "Dòng tiền", label: "Dòng treo", caption: "Gán tay, xác minh, hoàn", icon: "?", view: "unmatched", count: 12 },
      { id: "receipts", group: "Chứng từ", label: "Biên lai & HĐĐT", caption: "Phát hành và điều chỉnh", icon: "▤", view: "receipts", count: 9 },
      { id: "cash-reconciliation", group: "Đối soát", label: "Đối soát tiền mặt", caption: "Đã thu so với đã nộp", icon: "↔", view: "cashReconciliation", count: 4 },
      { id: "unit-reconciliation", group: "Đối soát", label: "Đối soát đơn vị", caption: "Dịch vụ và khoản thu", icon: "◎", view: "unitReconciliation", count: 3 },
      { id: "reports", group: "Báo cáo", label: "Báo cáo thu & nợ", caption: "Lập, kiểm tra và trình", icon: "▥", view: "accountingReports" }
    ]
  },
  leader: {
    label: "Lãnh đạo",
    initials: "LĐ",
    description: "Giám sát toàn hệ thống, duyệt quyết định về tiền và chốt kỳ.",
    defaultScreen: "executive-dashboard",
    screens: [
      { id: "executive-dashboard", group: "Điều hành", label: "Dashboard điều hành", caption: "Thu, nợ và cảnh báo", icon: "⌂", view: "leaderDashboard" },
      { id: "approval-queue", group: "Quyết định", label: "Hàng chờ phê duyệt", caption: "Miễn giảm, hoàn, xóa nợ", icon: "✓", view: "leaderApprovals", count: 7 },
      { id: "risk-alerts", group: "Kiểm soát", label: "Cảnh báo & sai lệch", caption: "Tiền mặt, dòng treo, nợ", icon: "!", view: "leaderAlerts", count: 19 },
      { id: "executive-reports", group: "Kiểm soát", label: "Báo cáo tổng hợp", caption: "Báo cáo trình xác nhận", icon: "▥", view: "leaderReports", count: 3 },
      { id: "period-close", group: "Quyết định", label: "Chốt kỳ", caption: "Kiểm tra điều kiện khóa", icon: "▣", view: "periodClose" }
    ]
  },
  administrator: {
    label: "Quản trị hệ thống",
    initials: "QT",
    description: "Quản trị kỹ thuật, phân quyền, cấu hình, tích hợp và nhật ký; không duyệt tiền.",
    defaultScreen: "admin-dashboard",
    screens: [
      { id: "admin-dashboard", group: "Hệ thống", label: "Tổng quan hệ thống", caption: "Sức khỏe và hoạt động", icon: "⌂", view: "adminDashboard" },
      { id: "users", group: "Truy cập", label: "Người dùng", caption: "Tài khoản và trạng thái", icon: "♙", view: "users" },
      { id: "permissions", group: "Truy cập", label: "Vai trò & quyền", caption: "RBAC và phạm vi dữ liệu", icon: "▦", view: "permissions" },
      { id: "areas", group: "Cấu hình nghiệp vụ", label: "Địa bàn & đơn vị", caption: "Địa giới, tuyến, đơn vị", icon: "⌖", view: "areas" },
      { id: "tariffs", group: "Cấu hình nghiệp vụ", label: "Biểu giá & định mức", caption: "Phiên bản theo hiệu lực", icon: "₫", view: "tariffs" },
      { id: "money-flow", group: "Cấu hình nghiệp vụ", label: "Luồng tiền & QR", caption: "Tài khoản nhận và mã truy vết", icon: "⌘", view: "moneyFlow", count: 1 },
      { id: "integrations", group: "Kỹ thuật", label: "Kết nối tích hợp", caption: "Ngân hàng, QR, HĐĐT", icon: "↔", view: "integrations", count: 1 },
      { id: "audit", group: "Kỹ thuật", label: "Nhật ký & sao lưu", caption: "Audit, giám sát, phục hồi", icon: "◷", view: "audit" }
    ]
  }
};

const SCREEN_INDEX = Object.fromEntries(
  Object.entries(ROLE_CONFIG).flatMap(([roleId, role]) =>
    role.screens.map(screen => [`${roleId}:${screen.id}`, { ...screen, roleId }])
  )
);

const ROLE_ORDER = ["commune", "collector", "accountant", "leader", "administrator"];
