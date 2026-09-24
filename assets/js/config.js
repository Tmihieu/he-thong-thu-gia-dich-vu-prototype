"use strict";

const ROLE_CONFIG = {
  commune: {
    label: "Cán bộ xã (Phòng Kinh tế)",
    initials: "CB",
    description: "Cán bộ Phòng Kinh tế: quản lý dữ liệu hộ, khu vực, công ty phụ trách, kỳ thu và giám sát tiến độ theo công ty.",
    defaultScreen: "dashboard",
    screens: [
      { id: "dashboard", group: "Điều hành", label: "Tổng quan nghiệp vụ", caption: "Công việc và tiến độ kỳ", icon: "home", view: "communeDashboard" },
      { id: "subjects", group: "Dữ liệu nền", label: "Đối tượng & hợp đồng", caption: "Hộ, cơ sở và hợp đồng", icon: "households", view: "subjects" },
      { id: "data-quality", group: "Dữ liệu nền", label: "Tiếp nhận dữ liệu hộ", caption: "Excel công ty, ghép cột, kiểm tra", icon: "upload", view: "intakeHome" },
      { id: "data-comparison", group: "Dữ liệu nền", label: "Đối chiếu danh sách hộ", caption: "Nghi trùng và chờ xác minh", icon: "compare", view: "intakeComparison" },
      { id: "periods", group: "Lập khoản", label: "Kỳ & đợt thu", caption: "Mở kỳ, kiểm tra đầu vào", icon: "calendar", view: "periods" },
      { id: "billing", group: "Lập khoản", label: "Khoản & hóa đơn", caption: "Sinh, phát hành, khoản lẻ", icon: "invoice", view: "billing", count: 18 },
      { id: "routes", group: "Tổ chức thu", label: "Quản lý khu vực", caption: "Tổ dân phố và phân công", icon: "map", view: "areaManagement" },
      { id: "route-detail", group: "Tổ chức thu", label: "Chi tiết khu vực", caption: "Hộ và công ty phụ trách", icon: "map", view: "areaManagementDetail", hiddenInNav: true, parentScreen: "routes" },
      { id: "collection-units", group: "Tổ chức thu", label: "Đơn vị thu gom & thu tiền", caption: "Công ty và khu vực phụ trách", icon: "building", view: "collectionUnits" },
      { id: "debts", group: "Tổ chức thu", label: "Báo cáo tiến độ thu tiền", caption: "Kết quả theo công ty", icon: "chart", view: "companyProgress" },
      { id: "requests", group: "Phê duyệt", label: "Đề nghị cần duyệt", caption: "Tạm ngưng, miễn giảm, hoàn", icon: "check", view: "requests", count: 5 }
    ]
  },
  company: {
    label: "Công ty thu gom",
    initials: "CT",
    description: "Tài khoản mẫu: Công ty MTĐT Đông Thạnh. Quản lý hộ được giao, kết quả thu và nghĩa vụ nộp phần xử lý; chỉ xem dữ liệu của công ty.",
    defaultScreen: "company-dashboard",
    screens: [
      { id: "company-dashboard", group: "Điều hành", label: "Tổng quan công ty", caption: "Khu vực, dữ liệu và nghĩa vụ", icon: "home", view: "companyOperationsDashboard" },
      { id: "assigned-households", group: "Thu tiền hộ", label: "Hộ được giao", caption: "Khoản phải thu xã đã xuất", icon: "households", view: "companyAssignedHouseholds" },
      { id: "route-assignment", group: "Thu tiền hộ", label: "Phân tuyến nhân viên", caption: "Gán tuyến, tổ cho nhân viên thu", icon: "map", view: "companyRouteAssignment" },
      { id: "processing-obligation", group: "Nộp phần xử lý", label: "Nghĩa vụ phải nộp", caption: "Số hộ × đơn giá xử lý", icon: "coins", view: "companyProcessingObligation" },
      { id: "processing-remittance", group: "Nộp phần xử lý", label: "Kê khai tiền đã nộp", caption: "Giao dịch nộp về xã", icon: "send", view: "companyProcessingRemittance" },
      { id: "submitted-data", group: "Dữ liệu công ty", label: "Danh sách đã cung cấp", caption: "Nguồn do xã tiếp nhận", icon: "list", view: "companyIntake" },
      { id: "data-requests", group: "Dữ liệu công ty", label: "Yêu cầu bổ sung", caption: "Xem nội dung xã yêu cầu", icon: "alert", view: "companyDataRequests" }
    ]
  },
  collector: {
    label: "Nhân viên thu của công ty",
    initials: "NT",
    description: "Thực hiện danh sách do công ty tổ chức nội bộ và cập nhật kết quả thu theo từng hộ. Xã làm việc với đầu mối công ty, không điều hành nhân viên thu.",
    defaultScreen: "today",
    screens: [
      { id: "today", group: "Ca làm việc", label: "Hôm nay", caption: "Danh sách, nhiệm vụ và tiến độ", icon: "home", view: "collectorToday" },
      { id: "assigned-route", group: "Ca làm việc", label: "Danh sách được giao", caption: "Phạm vi công ty phân nội bộ", icon: "clipboard", view: "collectorRoute", count: 18 },
      { id: "collection-entry", group: "Cập nhật dữ liệu", label: "Nhập kết quả thu", caption: "Nhập web hoặc tệp Excel", icon: "edit", view: "collectorEntry", count: 5 }
    ]
  },
  accountant: {
    label: "Kế toán",
    initials: "KT",
    description: "Sao kê tài khoản xã, dòng treo, phiếu thu, đối soát thu gom và tiền mặt với công ty, báo cáo và khóa sổ. Không quyết định miễn giảm, không cấu hình hệ thống.",
    defaultScreen: "accounting-dashboard",
    screens: [
      { id: "accounting-dashboard", group: "Điều hành", label: "Tổng quan kế toán", caption: "Sao kê, dòng treo, đối soát", icon: "home", view: "accountingProcessingDashboard" },
      { id: "statements", group: "Tiền về xã", label: "Sao kê tài khoản xã", caption: "Đồng bộ và khớp theo mã", icon: "bank", view: "processingStatements" },
      { id: "unmatched", group: "Tiền về xã", label: "Dòng treo chờ xử lý", caption: "Gán tay, xác minh, hoàn", icon: "help", view: "processingUnmatched", count: 2 },
      { id: "receipts", group: "Tiền về xã", label: "Phiếu thu & biên lai", caption: "Phiếu thu xã, biên lai công ty", icon: "receipt", view: "accountingReceipts" },
      { id: "unit-reconciliation", group: "Đối soát", label: "Đối soát thu gom", caption: "Phải nộp so với thực nộp", icon: "scale", view: "processingReconciliation" },
      { id: "cash-reconciliation", group: "Đối soát", label: "Đối soát tiền mặt", caption: "Kê khai so với chứng từ xã", icon: "cash", view: "cashReconciliation" },
      { id: "reports", group: "Báo cáo", label: "Báo cáo thu / nợ", caption: "Lập, kiểm tra và trình", icon: "chart", view: "accountingReports" },
      { id: "period-close", group: "Báo cáo", label: "Chốt & khóa sổ", caption: "Sau khi lãnh đạo xác nhận", icon: "lock", view: "accountingPeriodClose" }
    ]
  },
  leader: {
    label: "Lãnh đạo",
    initials: "LĐ",
    description: "Giám sát toàn hệ thống, duyệt quyết định về tiền và xác nhận báo cáo; không trực tiếp chốt sổ.",
    defaultScreen: "executive-dashboard",
    screens: [
      { id: "executive-dashboard", group: "Điều hành", label: "Dashboard điều hành", caption: "Thu, nợ và cảnh báo", icon: "home", view: "leaderDashboard" },
      { id: "approval-queue", group: "Quyết định", label: "Hàng chờ phê duyệt", caption: "Miễn giảm, hoàn, xóa nợ", icon: "check", view: "leaderApprovals", count: 5 },
      { id: "risk-alerts", group: "Kiểm soát", label: "Cảnh báo & sai lệch", caption: "Sao kê, dữ liệu, nợ", icon: "alert", view: "leaderAlerts", count: 19 },
      { id: "executive-reports", group: "Kiểm soát", label: "Báo cáo tổng hợp", caption: "Xem và xác nhận báo cáo", icon: "chart", view: "leaderReports" }
    ]
  },
  administrator: {
    label: "Quản trị hệ thống",
    initials: "QT",
    description: "Quản trị kỹ thuật, phân quyền, cấu hình, tích hợp và nhật ký; không duyệt tiền.",
    defaultScreen: "admin-dashboard",
    screens: [
      { id: "admin-dashboard", group: "Hệ thống", label: "Tổng quan hệ thống", caption: "Sức khỏe và hoạt động", icon: "home", view: "adminDashboard" },
      { id: "users", group: "Truy cập", label: "Người dùng", caption: "Tài khoản và trạng thái", icon: "user", view: "users" },
      { id: "permissions", group: "Truy cập", label: "Vai trò & quyền", caption: "RBAC và phạm vi dữ liệu", icon: "shield", view: "permissions" },
      { id: "areas", group: "Cấu hình nghiệp vụ", label: "Địa bàn & đơn vị", caption: "Địa giới, khu vực, công ty", icon: "map", view: "areas" },
      { id: "tariffs", group: "Cấu hình nghiệp vụ", label: "Biểu giá & định mức", caption: "Phiên bản theo hiệu lực", icon: "tag", view: "tariffs" },
      { id: "money-flow", group: "Cấu hình nghiệp vụ", label: "Luồng tiền & QR", caption: "Tiền hộ về công ty, phần xử lý về xã", icon: "flow", view: "moneyFlow" },
      { id: "integrations", group: "Kỹ thuật", label: "Kết nối tích hợp", caption: "Giai đoạn sau · chưa triển khai", icon: "link", view: "integrations", count: 1 },
      { id: "audit", group: "Kỹ thuật", label: "Nhật ký & sao lưu", caption: "Audit, giám sát, phục hồi", icon: "clock", view: "audit" }
    ]
  }
};

const SCREEN_INDEX = Object.fromEntries(
  Object.entries(ROLE_CONFIG).flatMap(([roleId, role]) =>
    role.screens.map(screen => [`${roleId}:${screen.id}`, { ...screen, roleId }])
  )
);

const ROLE_ORDER = ["commune", "company", "collector", "accountant", "leader", "administrator"];
