"use strict";

// v3.1 — Không gian cán bộ xã rút gọn: 7 chức năng, menu một cấp, không chia nhỏ.
// Dữ liệu minh họa; thao tác cập nhật trong bộ nhớ phiên, tải lại trang sẽ khôi phục.

ROLE_CONFIG.commune = {
  label: "Cán bộ xã",
  initials: "CX",
  description: "Phòng Kinh tế · UBND xã Đông Thạnh",
  defaultScreen: "subjects",
  screens: [
    { id: "subjects", group: "", label: "Đối tượng & hợp đồng", caption: "Hộ, cơ sở, hợp đồng, mở kỳ thu", icon: "households", view: "csSubjects" },
    { id: "charges", group: "", label: "Khoản thu", caption: "Phiếu yêu cầu thu, phiếu thu", icon: "invoice", view: "csCharges" },
    { id: "areas", group: "", label: "Danh sách khu vực", caption: "Tổ dân phố, công ty phụ trách", icon: "map", view: "csAreas" },
    { id: "companies", group: "", label: "Công ty môi trường", caption: "Đầu mối, phân công khu vực", icon: "building", view: "csCompanies" },
    { id: "company-detail", group: "", label: "Chi tiết công ty", caption: "", icon: "building", view: "csCompanyDetail", hiddenInNav: true, parentScreen: "companies" },
    { id: "progress", group: "", label: "Báo cáo tiến độ thu tiền", caption: "Theo công ty và khu vực", icon: "chart", view: "csProgress" },
    { id: "reconciliation", group: "", label: "Đối soát tổng thể", caption: "Phải thu, báo thu, chứng từ", icon: "scale", view: "csReconciliation" },
    { id: "complaints", group: "", label: "Danh sách khiếu nại", caption: "Tiếp nhận và xử lý", icon: "message", view: "csComplaints" }
  ]
};
Object.keys(SCREEN_INDEX).filter(key => key.startsWith("commune:")).forEach(key => delete SCREEN_INDEX[key]);
ROLE_CONFIG.commune.screens.forEach(screen => { SCREEN_INDEX[`commune:${screen.id}`] = { ...screen, roleId: "commune" }; });

// ---------- Dữ liệu ----------
const CS_TODAY = "2026-09-17";
const CS_TARIFFS = { "HGĐ ≤ 2 người": 40000, "HGĐ ≥ 3 người": 80000, "Chủ nguồn thải nhỏ": 119000, "Theo khối lượng": 1266000 };
// Khởi tạo hiệu lực mặc định cho các công ty môi trường
MANAGEMENT_UNITS.forEach(u => {
  if (!u.status) u.status = "active";
  if (!u.start) u.start = "2026-01-01";
  if (!u.end) u.end = "2026-12-31";
});
// Công ty MTĐT Đông Thạnh (DV01) phụ trách Tổ 07 và Tổ 09: cùng hộ, cùng người đi thu với không gian Công ty / Người đi thu.
[["KV07", "DV01"], ["KV09", "DV01"], ["KV12", "DV07"], ["KV23", "DV10"]].forEach(([areaId, unitId]) => {
  const a = MANAGEMENT_AREAS.find(x => x.id === areaId);
  if (a) Object.assign(a, { unit: unitId, waste: unitId, payment: unitId, conflict: false });
});

const CS_PERIODS = [
  { id: "2026-09", label: "Tháng 09/2026", open: "01/09/2026", due: "30/09/2026", legal: "QĐ 65/2026/QĐ-UBND", status: "Đang thu" },
  // Hết hạn nộp nhưng còn công ty chưa nộp đủ nên chưa khóa được.
  { id: "2026-08", label: "Tháng 08/2026", open: "01/08/2026", due: "31/08/2026", legal: "QĐ 67/2025/QĐ-UBND", status: "Đang thu" }
];
const CS_SUBJECTS = [
  { code: "DTH-H000128", name: "Nguyễn Văn Minh", type: "Hộ gia đình", address: "12/5 Đặng Thúc Vịnh", phone: "0903 218 128", area: "KV07", contract: "HĐ-DTH-0128", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000131", name: "Trần Thị Ánh", type: "Hộ gia đình", address: "12/8 Đặng Thúc Vịnh", phone: "0937 550 131", area: "KV07", contract: "HĐ-DTH-0131", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000149", name: "Võ Quốc Khánh", type: "Hộ gia đình", address: "16/2 Đặng Thúc Vịnh", phone: "0906 771 149", area: "KV07", contract: "HĐ-DTH-0149", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000305", name: "Trần Thị Hồng", type: "Hộ gia đình", address: "41/2 Nguyễn Ảnh Thủ", phone: "0908 114 305", area: "KV04", contract: "HĐ-DTH-0305", contractFrom: "01/03/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "DTH-H000662", name: "Phan Văn Thắng", type: "Hộ gia đình", address: "22/9 Đặng Thúc Vịnh", phone: "0918 402 662", area: "KV07", contract: "HĐ-DTH-0662", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active", exempt: true, exemptReason: "Hộ nghèo", note: "Diện chính sách miễn giảm 100%" },
  { code: "DTH-KD00077", name: "Quán ăn Hương Việt", type: "Hộ kinh doanh", address: "21 Đặng Thúc Vịnh", phone: "0902 441 077", area: "KV07", contract: "HĐ-DTH-KD77", contractFrom: "01/06/2026", tariff: "Chủ nguồn thải nhỏ", status: "active" },
  { code: "DTH-H001152", name: "Lê Quốc Bảo", type: "Hộ gia đình", address: "7/11 Lê Văn Khương", phone: "0973 458 152", area: "KV06", contract: "HĐ-DTH-1152", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "ended", note: "Chấm dứt 31/08/2026" },
  { code: "TTT-H000215", name: "Bùi Thị Yến", type: "Hộ gia đình", address: "19/8 Tô Ký", phone: "0939 660 215", area: "KV02", contract: "HĐ-TTT-0215", contractFrom: "01/01/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "TTT-KD00142", name: "Tạp hóa Minh Châu", type: "Hộ kinh doanh", address: "96 Trịnh Thị Miếng", phone: "0917 602 142", area: "KV11", contract: "—", contractFrom: "", tariff: "Chủ nguồn thải nhỏ", status: "pending", note: "Chờ phân loại · chưa có hợp đồng" },
  { code: "TTT-H001921", name: "Nguyễn Thị Mai", type: "Hộ gia đình", address: "35 Song Hành", phone: "0938 447 921", area: "KV08", contract: "HĐ-TTT-1921", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "NB-DN00038", name: "Công ty TNHH Nam An", type: "Doanh nghiệp", address: "18 Hà Huy Giáp", phone: "028 3891 0038", area: "KV03", contract: "HĐ-NB-0038", contractFrom: "01/01/2026", tariff: "Theo khối lượng", status: "active" },
  { code: "NB-H000482", name: "Trần Quốc Phúc", type: "Hộ gia đình", address: "120 Nguyễn Văn Bứa", phone: "0902 811 482", area: "KV09", contract: "HĐ-NB-0482", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  // Khởi tạo đối tượng cho các tổ còn lại để luôn có dữ liệu khi lọc từ Báo cáo tiến độ
  { code: "DTH-H000015", name: "Đặng Văn Hùng", type: "Hộ gia đình", address: "04 Tô Ký", phone: "0903 111 015", area: "KV01", contract: "HĐ-DTH-0015", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000502", name: "Hoàng Minh Tuấn", type: "Hộ gia đình", address: "88 Hương Lộ 80B", phone: "0908 555 502", area: "KV05", contract: "HĐ-DTH-0502", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H001021", name: "Phạm Hồng Sơn", type: "Hộ gia đình", address: "14/2 Lê Văn Khương", phone: "0909 333 021", area: "KV10", contract: "HĐ-DTH-1021", contractFrom: "01/01/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "TTT-H001205", name: "Nguyễn Thị Lành", type: "Hộ gia đình", address: "55 Trịnh Thị Miếng", phone: "0918 222 205", area: "KV12", contract: "HĐ-TTT-1205", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "TTT-H001340", name: "Vũ Đình Trọng", type: "Hộ gia đình", address: "29 Song Hành", phone: "0934 666 340", area: "KV13", contract: "HĐ-TTT-1340", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "TTT-H001412", name: "Lý Cẩm Tú", type: "Hộ gia đình", address: "102 Nguyễn Ảnh Thủ", phone: "0945 777 412", area: "KV14", contract: "HĐ-TTT-1412", contractFrom: "01/01/2026", tariff: "HGĐ ≤ 2 người", status: "active", exempt: true, exemptReason: "Gia đình chính sách", note: "Diện chính sách miễn giảm 100%" },
  { code: "DTH-H001509", name: "Dương Minh Trí", type: "Hộ gia đình", address: "31 Đặng Thúc Vịnh", phone: "0978 888 509", area: "KV15", contract: "HĐ-DTH-1509", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H001618", name: "Ngô Bá Khang", type: "Hộ gia đình", address: "64 Lê Văn Khương", phone: "0967 999 618", area: "KV16", contract: "HĐ-DTH-1618", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "NB-H001720", name: "Trịnh Thị Nga", type: "Hộ gia đình", address: "15 Hà Huy Giáp", phone: "0902 444 720", area: "KV17", contract: "HĐ-NB-1720", contractFrom: "01/01/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "NB-H001833", name: "Đỗ Thành Đạt", type: "Hộ gia đình", address: "83 Nguyễn Văn Bứa", phone: "0913 555 833", area: "KV18", contract: "HĐ-NB-1833", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "NB-H001944", name: "Bùi Văn Nam", type: "Hộ gia đình", address: "40 Tô Ký", phone: "0924 666 944", area: "KV19", contract: "HĐ-NB-1944", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "NB-H002055", name: "Hồ Xuân Hương", type: "Hộ gia đình", address: "19 Hương Lộ 80B", phone: "0935 777 055", area: "KV20", contract: "HĐ-NB-2055", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H002166", name: "Mai Văn Kiên", type: "Hộ gia đình", address: "50 Đặng Thúc Vịnh", phone: "0946 888 166", area: "KV21", contract: "HĐ-DTH-2166", contractFrom: "01/01/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "DTH-H002277", name: "Đào Thị Loan", type: "Hộ gia đình", address: "77 Nguyễn Ảnh Thủ", phone: "0957 999 277", area: "KV22", contract: "HĐ-DTH-2277", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "TTT-H002388", name: "Phan Đình Giót", type: "Hộ gia đình", address: "12 Trịnh Thị Miếng", phone: "0968 111 388", area: "KV23", contract: "HĐ-TTT-2388", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "NB-H002499", name: "Lâm Hoài An", type: "Hộ gia đình", address: "91 Hà Huy Giáp", phone: "0979 222 499", area: "KV24", contract: "HĐ-NB-2499", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  // Hộ Tổ 07 / Tổ 09 do Công ty MTĐT Đông Thạnh thu: cùng danh sách với không gian Công ty và Người đi thu.
  ...[
    ["DTH-H000133", "Ngô Văn Sáu", "0903 004 471", "13/4 Đặng Thúc Vịnh", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000136", "Lê Hoàng Nam", "0912 006 784", "14/1 Đặng Thúc Vịnh", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000138", "Trần Văn Bình", "0913 002 038", "9/3 Lê Văn Khương", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000142", "Phạm Thị Lan", "0981 001 136", "14/7 Đặng Thúc Vịnh", "KV07", "HGĐ ≤ 2 người"],
    ["DTH-H000145", "Nguyễn Thị Hòa", "0972 007 145", "11 Lê Văn Khương", "KV07", "HGĐ ≤ 2 người"],
    ["DTH-H000152", "Lê Thị Thu Hà", "0936 006 152", "27 Hương Lộ 80B", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000157", "Đỗ Thị Hạnh", "0968 002 034", "18/3 Đặng Thúc Vịnh", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000163", "Nguyễn Quốc Tuấn", "0913 008 840", "20 Đặng Thúc Vịnh", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000171", "Trương Thị Kim", "0987 007 319", "22/6 Đặng Thúc Vịnh", "KV07", "HGĐ ≥ 3 người"],
    ["DTH-H000212", "Huỳnh Văn Đức", "0906 005 521", "3/2 Tô Ký", "KV09", "HGĐ ≥ 3 người"],
    ["DTH-H000216", "Lý Thị Bích", "0938 008 102", "4/6 Tô Ký", "KV09", "HGĐ ≥ 3 người"],
    ["DTH-H000218", "Mai Thị Thu", "0938 000 187", "3/9 Tô Ký", "KV09", "HGĐ ≥ 3 người"],
    ["DTH-H000221", "Hồ Văn Lộc", "0975 005 519", "5/8 Tô Ký", "KV09", "HGĐ ≤ 2 người"],
    ["DTH-H000224", "Bùi Quang Vinh", "0978 006 630", "5/1 Tô Ký", "KV09", "HGĐ ≥ 3 người"],
    ["DTH-H000229", "Đinh Thị Hoa", "0989 002 260", "6/3 Tô Ký", "KV09", "HGĐ ≥ 3 người"],
    ["DTH-KD00081", "Tiệm tạp hóa Ngọc Hà", "0912 002 276", "8 Tô Ký", "KV09", "Chủ nguồn thải nhỏ"]
  ].map(([code, name, phone, address, area, tariff]) => ({ code, name, type: code.includes("-KD") ? "Hộ kinh doanh" : "Hộ gia đình", address, phone, area, contract: `HĐ-DTH-${code.slice(-4)}`, contractFrom: "01/01/2026", tariff, status: "active" }))
];
const CS_SUBJECT_STATUS = { active: ["Đang cung cấp", "success"], pending: ["Chờ xử lý", "warning"], ended: ["Đã chấm dứt", "neutral"] };
const CS_CHARGE_STATUS = { unpaid: ["Chưa thu", "warning"], overdue: ["Quá hạn", "danger"], paid: ["Đã thu", "success"], exempt: ["Miễn giảm (0đ)", "neutral"] };
const CS_COMPLAINT_STATUS = { new: ["Mới tiếp nhận", "warning"], processing: ["Đang xử lý", "info"], done: ["Đã giải quyết", "success"] };

// Loại phí: phí môi trường tính theo nhóm giá của đối tượng; loại khác dùng đơn giá cố định, sửa được khi lập phiếu.
const CS_FEE_TYPES = [
  { id: "env", name: "Phí vệ sinh môi trường (CTRSH)", price: null },
  { id: "bulky", name: "Phí thu gom rác cồng kềnh", price: 150000 },
  { id: "extra", name: "Phụ phí dịch vụ phát sinh", price: 50000 }
];
const csFeeType = id => CS_FEE_TYPES.find(f => f.id === id) || CS_FEE_TYPES[0];
const csFeeTypeName = id => csFeeType(id).name;

// Phiếu yêu cầu thu xã đã phát hành; mỗi phiếu sinh ra khoản thu cho từng hộ trong phạm vi.
const CS_REQUESTS = [
  { id: "YCT-0926-01", period: "2026-09", feeType: "env", scope: "Toàn xã · 24 tổ", date: "01/09/2026", due: "30/09/2026", count: 0, exempt: 0, total: 0, note: "" },
  { id: "YCT-0826-01", period: "2026-08", feeType: "env", scope: "Toàn xã · 24 tổ", date: "01/08/2026", due: "31/08/2026", count: 0, exempt: 0, total: 0, note: "" }
];

const CS_CHARGES = [];
(function seedCharges() {
  const overdue08 = ["DTH-H000131", "TTT-H001921", "NB-H000482", "DTH-H001021", "NB-H001833", "TTT-H002388", "DTH-H000218", "DTH-H000157", "DTH-H000163"];
  const paid09 = {
    "DTH-H000142": ["12/09/2026", "Chuyển khoản"],
    "DTH-H000133": ["14/09/2026", "Tiền mặt"],
    "DTH-H000152": ["13/09/2026", "Chuyển khoản"],
    "DTH-H000224": ["11/09/2026", "Chuyển khoản"],
    "DTH-H000216": ["15/09/2026", "Tiền mặt"],
    "DTH-H000221": ["16/09/2026", "Tiền mặt"],
    "DTH-H000305": ["13/09/2026", "Tiền mặt"],
    "DTH-KD00077": ["12/09/2026", "Chuyển khoản"],
    "DTH-H000149": ["15/09/2026", "Tiền mặt"],
    "DTH-H000015": ["14/09/2026", "Chuyển khoản"],
    "DTH-H000502": ["16/09/2026", "Tiền mặt"],
    "TTT-H001205": ["11/09/2026", "Chuyển khoản"],
    "TTT-H001340": ["15/09/2026", "Tiền mặt"],
    "DTH-H001509": ["10/09/2026", "Chuyển khoản"],
    "NB-H001720": ["14/09/2026", "Tiền mặt"],
    "NB-H002055": ["12/09/2026", "Chuyển khoản"],
    "DTH-H002277": ["16/09/2026", "Tiền mặt"]
  };
  CS_SUBJECTS.filter(s => s.status !== "ended" && s.contract !== "—").forEach(s => {
    const isExempt = Boolean(s.exempt);
    const amount = isExempt ? 0 : CS_TARIFFS[s.tariff];
    const suffix = s.code.split("-")[1];
    const paid08 = !overdue08.includes(s.code);
    CS_CHARGES.push({
      id: `KT-0826-${suffix}`,
      request: "YCT-0826-01",
      feeType: "env",
      subject: s.code,
      period: "2026-08",
      due: "31/08/2026",
      amount,
      status: isExempt ? "exempt" : (paid08 ? "paid" : "overdue"),
      ...(paid08 && !isExempt ? { paidAt: "20/08/2026", method: "Tiền mặt" } : {})
    });
    const p = paid09[s.code];
    CS_CHARGES.push({
      id: `KT-0926-${suffix}`,
      request: "YCT-0926-01",
      feeType: "env",
      subject: s.code,
      period: "2026-09",
      due: "30/09/2026",
      amount,
      status: isExempt ? "exempt" : (p ? "paid" : "unpaid"),
      ...(p && !isExempt ? { paidAt: p[0], method: p[1] } : {})
    });
  });
  CS_CHARGES.sort((a, b) => b.period.localeCompare(a.period) || a.subject.localeCompare(b.subject));
  CS_REQUESTS.forEach(r => {
    const list = CS_CHARGES.filter(c => c.request === r.id);
    Object.assign(r, { count: list.length, exempt: list.filter(c => c.status === "exempt").length, total: list.reduce((t, c) => t + c.amount, 0) });
  });
})();

const CS_COMPLAINTS = [
  { id: "KN-2609-014", date: "16/09/2026", name: "Quán ăn Hương Việt", subject: "DTH-KD00077", phone: "0902 441 077", area: "KV07", channel: "Ứng dụng người dân", content: "Mức thu 119.000đ không đúng nhóm giá hộ kinh doanh nhỏ.", status: "new", result: "" },
  { id: "KN-2609-013", date: "15/09/2026", name: "Nguyễn Thị Mai", subject: "TTT-H001921", phone: "0938 447 921", area: "KV08", channel: "Điện thoại", content: "Đã nộp tiền kỳ 08/2026 cho nhân viên thu nhưng vẫn bị báo nợ.", status: "processing", result: "Đã yêu cầu công ty đối chiếu biên lai." },
  { id: "KN-2609-011", date: "14/09/2026", name: "Trần Văn Hải", subject: "TTT-H001092", phone: "0919 220 092", area: "KV11", channel: "Ứng dụng người dân", content: "Xe thu gom bỏ tuyến 3 ngày liên tiếp.", status: "processing", result: "Chuyển công ty phụ trách xử lý, hạn 18/09." },
  { id: "KN-2609-009", date: "12/09/2026", name: "Lê Thị Mỹ", subject: "DTH-H000419", phone: "0905 337 419", area: "KV04", channel: "Ứng dụng người dân", content: "Không nhận được biên lai sau khi chuyển khoản.", status: "done", result: "Công ty đã phát lại biên lai BL-2609-003918." },
  { id: "KN-2609-008", date: "11/09/2026", name: "Phạm Văn Dũng", subject: "DTH-H000877", phone: "0977 118 877", area: "KV15", channel: "Trực tiếp tại xã", content: "Nhân viên thu tiền không có thẻ hoặc giấy giới thiệu.", status: "new", result: "" },
  { id: "KN-2609-006", date: "09/09/2026", name: "Võ Thị Hà", subject: "NB-H000233", phone: "0909 664 233", area: "KV20", channel: "Điện thoại", content: "Hộ đã chuyển đi từ 06/2026 vẫn nhận thông báo thu.", status: "done", result: "Đã chấm dứt hợp đồng, khóa khoản thu từ kỳ 09/2026." },
  { id: "KN-2609-004", date: "08/09/2026", name: "Tiệm tạp hóa Ngọc Hà", subject: "NB-KD00081", phone: "0912 276 081", area: "KV09", channel: "Ứng dụng người dân", content: "Bị thu 2 lần cho cùng kỳ 08/2026.", status: "processing", result: "Đã lập đề nghị hoàn tiền, chờ lãnh đạo duyệt." }
];

// Nhắc nhở xã gửi công ty khi hết kỳ mà chưa nộp đủ; công ty thấy ở "Hộ được giao".
const CS_REMINDERS = [];
const csState = { period: "2026-09", company: "all", companyId: null, dialog: null, chargePeriod: "2026-09", chargeFilterUnit: "all", chargeFilterArea: "all", chargesTab: "receivables", chargeFrom: null, seq: { complaint: 15, company: MANAGEMENT_UNITS.length + 1, subject: 1 } };

// ---------- Tiện ích ----------
const csArea = id => MANAGEMENT_AREAS.find(a => a.id === id);
const csUnit = id => MANAGEMENT_UNITS.find(u => u.id === id);
const csSubject = code => CS_SUBJECTS.find(s => s.code === code);
const csPeriodLabel = id => `${id.slice(5)}/${id.slice(0, 4)}`;
const csAreaName = id => csArea(id)?.name.replace("Tổ dân phố", "Tổ") || "—";
const csCompanyOf = areaId => csUnit(csArea(areaId)?.unit);
const csLink = (label, action, id) => `<button type="button" class="link-button" data-cs="${action}" data-id="${id}">${escapeHtml(label)}</button>`;
const csBtn = (label, action, id = "", tone = "secondary", small = false) => `<button type="button" class="button button-${tone}${small ? " button-small" : ""}" data-cs="${action}"${id ? ` data-id="${id}"` : ""}>${label}</button>`;
const csHeader = (title, actions = "", meta = "") => `<header class="page-header"><div><h1 class="page-title">${title}</h1>${meta ? `<p class="page-description">${meta}</p>` : ""}</div><div class="page-actions">${actions}</div></header>`;
const csSelect = (attr, options, selected) => `<select class="control" ${attr}>${options.map(([v, t]) => `<option value="${v}"${v === selected ? " selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select>`;
const csField = (label, control, full = false) => `<div class="form-field${full ? " full" : ""}"><label>${label}</label>${control}</div>`;
const csInput = (id, value = "", type = "text", extra = "") => `<input class="control" id="${id}" type="${type}" value="${escapeHtml(value)}" ${extra}>`;
const csFormValue = id => document.getElementById(id)?.value?.trim() || "";
const csCompanyOptions = () => MANAGEMENT_UNITS.filter(u => u.status !== "inactive").map(u => [u.id, u.name]);
const csAreaOptions = () => MANAGEMENT_AREAS.map(a => [a.id, csAreaName(a.id)]);
const csIsoToVi = iso => iso ? iso.split("-").reverse().join("/") : "";
const csDaysAfter = (iso, days) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + days); return csIsoToVi(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); };
const csIsQuarter = id => String(id).includes("-Q");
const csQuarterMonths = id => { const [y, q] = id.split("-Q").map(Number); return [0, 1, 2].map(i => `${y}-${String((q - 1) * 3 + 1 + i).padStart(2, "0")}`); };
const csQuarterLabel = id => { const [y, q] = id.split("-Q").map(Number); return `Quý ${q}/${y} · tháng ${(q - 1) * 3 + 1}–${q * 3}`; };
const csLastDay = (y, m) => `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
const csPeriodDue = id => csIsQuarter(id) ? csLastDay(Number(id.slice(0, 4)), Number(id.split("-Q")[1]) * 3) : csLastDay(Number(id.slice(0, 4)), Number(id.slice(5, 7)));
const csMonthPeriods = () => CS_PERIODS.filter(p => !csIsQuarter(p.id));
const csScopeOptions = () => [["all", "Toàn xã"], ...MANAGEMENT_UNITS.map(u => [`unit:${u.id}`, `Công ty · ${u.name}`]), ...MANAGEMENT_AREAS.map(a => [`area:${a.id}`, `Khu vực · ${csAreaName(a.id)}`])];
const csScopeMatch = (subject, scope) => !scope || scope === "all" ? true : scope.startsWith("unit:") ? csArea(subject.area)?.unit === scope.slice(5) : subject.area === scope.replace("area:", "");
// Số tiền một khoản: phí môi trường theo nhóm giá × số tháng của kỳ; loại phí khác theo đơn giá nhập khi lập phiếu.
const csChargeAmount = (subject, period, feeType = "env", price = null) => feeType === "env" ? CS_TARIFFS[subject.tariff] * (csIsQuarter(period) ? 3 : 1) : Number(price ?? csFeeType(feeType).price) || 0;

// Tiến độ thu theo khu vực (tỷ lệ minh họa cố định theo thứ tự tổ).
function csAreaProgress(areaId, period) {
  const area = csArea(areaId);
  const index = MANAGEMENT_AREAS.indexOf(area);
  const rate = period === "2026-08" ? [95, 100, 86, 92, 98, 80, 96, 100, 90, 97, 94][index % 11] : [58, 64, 29, 51, 62, 34, 49, 68, 32, 57, 46][index % 11];
  // Kỳ quý gộp ba tháng nên phải thu gấp ba.
  const due = area.households * 80000 * (csIsQuarter(period) ? 3 : 1);
  const paid = area.unit ? Math.round(due * rate / 100) : 0;
  const unitIndex = MANAGEMENT_UNITS.findIndex(u => u.id === area.unit);
  const confirmedRate = [1, .94, 1, .9, 1, .97, 1, 1, .92, 1, 1][Math.max(unitIndex, 0) % 11];
  return { area, due, paid, confirmed: Math.round(paid * confirmedRate) };
}
function csCompanyProgress(period) {
  const groups = [...MANAGEMENT_UNITS, { id: null, name: "Chưa phân công" }].map(unit => {
    const rows = MANAGEMENT_AREAS.filter(a => a.unit === unit.id).map(a => csAreaProgress(a.id, period));
    const sum = key => rows.reduce((t, r) => t + r[key], 0);
    return { unit, rows, households: rows.reduce((t, r) => t + r.area.households, 0), due: sum("due"), paid: sum("paid"), confirmed: sum("confirmed") };
  });
  return groups.filter(g => g.rows.length);
}

// ---------- Công nợ công ty ----------
// Một nguồn "phải thu" cấp công ty dùng chung cho Khoản thu, Tiến độ, Đối soát: số hộ của tổ × đơn giá.
// Danh sách khoản thu của hộ (CS_SUBJECTS / CS_CHARGES) là dữ liệu mẫu để xem chi tiết, không cộng thành tổng.
const csCompanyAreas = companyId => MANAGEMENT_AREAS.filter(a => (a.unit || null) === companyId);
const csCompanyDue = (companyId, period) => csCompanyAreas(companyId).reduce((t, a) => t + csAreaProgress(a.id, period).due, 0);
const csCompanyReceipts = (companyId, period) => CS_COMPANY_RECEIPTS.filter(r => r.companyId === companyId && r.period === period);
const csCompanyReceived = (companyId, period) => csCompanyReceipts(companyId, period).reduce((t, r) => t + r.amount, 0);
// Kỳ đã qua hạn nộp so với hôm nay, không tính kỳ đang xem.
const csClosedPeriods = period => CS_PERIODS.filter(p => p.id !== period && csPeriodDue(p.id) < CS_TODAY).map(p => p.id);
// Các kỳ công ty còn nợ (đã hết hạn nộp, hoặc kỳ đang xem): dùng cho nhắc nhở và khóa kỳ.
function csCompanyDebts(companyId, includePeriod = null) {
  return CS_PERIODS.filter(p => p.status !== "Đã khóa" && (csPeriodDue(p.id) < CS_TODAY || p.id === includePeriod)).map(p => {
    const dueAmount = csCompanyDue(companyId, p.id), received = csCompanyReceived(companyId, p.id);
    return { period: p.id, label: p.label, due: p.due, dueAmount, received, remaining: dueAmount - received };
  }).filter(d => d.remaining > 0);
}
function csCompanyLedger(period) {
  return [...MANAGEMENT_UNITS, { id: null, name: "Chưa phân công" }].map(unit => {
    const areas = csCompanyAreas(unit.id);
    const due = csCompanyDue(unit.id, period);
    const received = unit.id ? csCompanyReceived(unit.id, period) : 0;
    const overdue = unit.id ? csClosedPeriods(period).reduce((t, p) => t + Math.max(0, csCompanyDue(unit.id, p) - csCompanyReceived(unit.id, p)), 0) : 0;
    return { unit, areas, households: areas.reduce((t, a) => t + a.households, 0), due, received, remaining: due - received, overdue, receipts: unit.id ? csCompanyReceipts(unit.id, period).length : 0 };
  }).filter(g => g.areas.length);
}

// Phiếu thu xã lập mỗi lần công ty nộp tiền về ngân sách. Kỳ 08 đã nộp gần đủ (DV01, DV06 còn thiếu); kỳ 09 mới nộp đợt 1.
const CS_COMPANY_RECEIPTS = [];
(function seedReceipts() {
  const banks = ["VCB", "BIDV", "CTG", "AGR"];
  const push = (companyId, period, amount, day, method, note, i) => {
    const seq = CS_COMPANY_RECEIPTS.filter(r => r.period === period).length + 1;
    CS_COMPANY_RECEIPTS.push({
      id: `PT-CT-${period.slice(5)}${period.slice(2, 4)}-${String(seq).padStart(3, "0")}`, companyId, period, amount, method,
      date: `${String(day).padStart(2, "0")}/${period.slice(5)}/${period.slice(0, 4)}`, payer: csUnit(companyId)?.contact || "Đại diện công ty",
      bankRef: method === "Tiền mặt" ? `TM-${period.slice(5)}${period.slice(2, 4)}-${String(seq).padStart(2, "0")}` : `${banks[i % banks.length]}-${8839210 + i * 61913}`,
      note, status: "completed"
    });
  };
  MANAGEMENT_UNITS.forEach((u, i) => {
    const due = csCompanyDue(u.id, "2026-08");
    if (!due) return;
    const amount = u.id === "DV01" ? 65000000 : u.id === "DV06" ? Math.round(due * 0.9 / 1000) * 1000 : due;
    push(u.id, "2026-08", amount, 25 + (i % 4), i % 3 === 2 ? "Tiền mặt" : "Chuyển khoản", `Nộp tiền thu gom rác kỳ 08/2026${amount < due ? " · đợt 1" : ""}`, i);
  });
  push("DV01", "2026-09", 35000000, 15, "Chuyển khoản", "Nộp đợt 1 kỳ thu 09/2026", 20);
  push("DV03", "2026-09", 28000000, 16, "Chuyển khoản", "Nộp đợt 1 kỳ thu 09/2026", 21);
  push("DV04", "2026-09", 20000000, 17, "Tiền mặt", "Nộp trực tiếp tại thủ quỹ xã · đợt 1", 22);
})();

// Đọc số tiền bằng chữ cho phiếu thu.
function csNumberToWords(n) {
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const readGroup = (num, full) => {
    const h = Math.floor(num / 100), t = Math.floor(num % 100 / 10), u = num % 10;
    const parts = [];
    if (h || full) parts.push(`${digits[h]} trăm`);
    if (t === 0) { if (u && (h || full)) parts.push("lẻ"); }
    else if (t === 1) parts.push("mười");
    else parts.push(`${digits[t]} mươi`);
    if (u) parts.push(t >= 2 && u === 1 ? "mốt" : t >= 1 && u === 5 ? "lăm" : t >= 2 && u === 4 ? "tư" : digits[u]);
    return parts.join(" ");
  };
  if (!n) return "Không đồng";
  const units = ["", "nghìn", "triệu", "tỷ"];
  const groups = [];
  let rest = Math.round(n);
  while (rest > 0) { groups.push(rest % 1000); rest = Math.floor(rest / 1000); }
  const words = groups.map((g, i) => g ? `${readGroup(g, i < groups.length - 1)} ${units[i]}`.trim() : "").reverse().filter(Boolean).join(" ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} đồng`;
}

// ---------- 1. Đối tượng & hợp đồng ----------
function csSubjects() {
  const areas = [...new Set(CS_SUBJECTS.map(s => s.area))].sort();
  const rows = CS_SUBJECTS.map(s => {
    const company = csCompanyOf(s.area);
    const [label, tone] = CS_SUBJECT_STATUS[s.status];
    return `<tr data-row data-group="${s.status}" data-type="${escapeHtml(s.type)}" data-area="${s.area}" data-search="${escapeHtml(`${s.code} ${s.name} ${s.address} ${s.phone} ${s.contract}`.toLowerCase())}" class="${s.status === "pending" ? "is-attention" : ""}">
      <td><span class="cell-title">${s.code}</span><span class="cell-subtitle">${s.type}</span></td>
      <td><span class="cell-title">${escapeHtml(s.name)}</span><span class="cell-subtitle">${escapeHtml(s.address)} · ${escapeHtml(s.phone)}</span></td>
      <td><span class="cell-title">${csAreaName(s.area)}</span><span class="cell-subtitle">${company ? escapeHtml(company.name) : "Chưa có công ty"}</span></td>
      <td><span class="cell-title">${s.contract}</span><span class="cell-subtitle">${s.contract === "—" ? "Chưa lập hợp đồng" : `${s.tariff} · từ ${s.contractFrom}`}</span></td>
      <td class="money">${formatMoney(CS_TARIFFS[s.tariff])}</td>
      <td>${badge(label, tone)}${s.note ? `<span class="cell-subtitle">${escapeHtml(s.note)}</span>` : ""}</td>
      <td>${csBtn("Sửa", "editSubject", s.code, "secondary", true)}</td></tr>`;
  });
  return `${csHeader("Đối tượng & hợp đồng", csBtn("+ Thêm đối tượng", "addSubject", "", "primary"))}
  <section data-table-filter data-chip-key="group" data-count-label="đối tượng">
    ${filterBar(filterField("Loại", filterSelect("type", [["all", "Tất cả loại"], ["Hộ gia đình", "Hộ gia đình"], ["Hộ kinh doanh", "Hộ kinh doanh"], ["Doanh nghiệp", "Doanh nghiệp"]])) + filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(a => [a, csAreaName(a)])])), "Mã, tên, địa chỉ, điện thoại, số hợp đồng...")}
    ${chipBar([["all", "Tất cả"], ["active", "Đang cung cấp", "success"], ["pending", "Chờ xử lý", "warning"], ["ended", "Đã chấm dứt"]], "đối tượng")}
    ${panel("Danh sách đối tượng", "", table(["Mã", "Đối tượng", "Khu vực · công ty", "Hợp đồng", { label: "Mức / kỳ", num: true }, "Trạng thái", ""], rows, { empty: "Không có đối tượng phù hợp." }))}
  </section>`;
}

// ---------- 2. Khoản thu ----------
// Ba lớp: phiếu yêu cầu thu (xã phát hành) → khoản phải thu của từng hộ → phiếu thu khi công ty nộp tiền về xã.
// KPI và công nợ tính theo công ty (phiếu thu lập theo công ty, không theo hộ); lọc theo tổ thì lấy công ty phụ trách tổ đó.
function csCharges() {
  const unitFilter = csState.chargeFilterUnit || "all";
  const areaFilter = csState.chargeFilterArea || "all";
  const periodFilter = csState.chargePeriod || "all";
  const period = periodFilter === "all" ? csState.period : periodFilter;
  const tab = csState.chargesTab || "receivables";
  const filterArea = csArea(areaFilter);
  const kpiUnitId = unitFilter !== "all" ? unitFilter : filterArea ? (filterArea.unit || "none") : "all";
  const ledger = csCompanyLedger(period);
  const kpiRows = kpiUnitId === "all" ? ledger : ledger.filter(g => (g.unit.id || "none") === kpiUnitId);
  const sumBy = key => kpiRows.reduce((t, g) => t + g[key], 0);
  const due = sumBy("due"), received = sumBy("received"), remaining = due - received, overdue = sumBy("overdue");
  const scopeLabel = kpiUnitId === "all" ? "Toàn xã" : kpiUnitId === "none" ? "Tổ chưa phân công" : csUnit(kpiUnitId)?.name || kpiUnitId;
  const hasFilter = unitFilter !== "all" || areaFilter !== "all";

  const inPeriod = p => periodFilter === "all" || p === periodFilter;
  const charges = CS_CHARGES.filter(c => {
    const s = csSubject(c.subject);
    const companyId = csCompanyOf(s?.area)?.id || "none";
    return inPeriod(c.period) && (unitFilter === "all" || companyId === unitFilter) && (areaFilter === "all" || s?.area === areaFilter);
  });
  const requests = CS_REQUESTS.filter(r => inPeriod(r.period));
  const receipts = CS_COMPANY_RECEIPTS.filter(r => inPeriod(r.period) && (kpiUnitId === "all" || r.companyId === kpiUnitId));

  const chargeRows = charges.map(c => {
    const s = csSubject(c.subject) || { name: c.subject, address: "", area: "" };
    const company = csCompanyOf(s.area);
    const [label, tone] = CS_CHARGE_STATUS[c.status] || CS_CHARGE_STATUS.unpaid;
    return `<tr data-row data-group="${c.status}" data-search="${escapeHtml(`${c.id} ${c.request} ${c.subject} ${s.name} ${s.address} ${csAreaName(s.area)} ${company?.name || ""}`.toLowerCase())}" class="${c.status === "overdue" ? "is-attention" : ""}">
      <td><span class="cell-title">${c.id}</span><span class="cell-subtitle">${c.request} · ${csFeeTypeName(c.feeType)}</span></td>
      <td><span class="cell-title">${escapeHtml(s.name)}</span><span class="cell-subtitle">${c.subject} · ${csAreaName(s.area)}</span></td>
      <td>${csPeriodLabel(c.period)}<span class="cell-subtitle">hạn ${c.due}</span></td>
      <td class="money">${c.status === "exempt" ? `0đ<span class="cell-subtitle">${escapeHtml(s.exemptReason || "Miễn giảm")}</span>` : formatMoney(c.amount)}</td>
      <td>${company ? `<span class="cell-title">${escapeHtml(company.name)}</span><span class="cell-subtitle">${company.id} · ${escapeHtml(company.contact || "")}</span>` : badge("Chưa phân công", "danger")}</td>
      <td>${badge(label, tone)}</td></tr>`;
  });

  const requestRows = requests.map(r => `<tr data-row data-search="${escapeHtml(`${r.id} ${r.scope} ${csFeeTypeName(r.feeType)} ${r.note}`.toLowerCase())}">
      <td><span class="cell-title">${r.id}</span><span class="cell-subtitle">Lập ${r.date}</span></td>
      <td>${csPeriodLabel(r.period)}<span class="cell-subtitle">hạn ${r.due}</span></td>
      <td>${csFeeTypeName(r.feeType)}</td>
      <td>${escapeHtml(r.scope)}</td>
      <td class="num">${r.count}<span class="cell-subtitle">${r.exempt} miễn giảm</span></td>
      <td class="money">${formatMoney(r.total)}</td>
      <td>${r.note ? escapeHtml(r.note) : '<span class="muted">—</span>'}</td></tr>`);

  const ledgerRows = kpiRows.map(g => {
    const [label, tone] = !g.unit.id ? ["Chưa có công ty thu", "danger"] : g.remaining <= 0 ? ["Đã nộp đủ", "success"] : g.received ? ["Nộp một phần", "warning"] : ["Chưa nộp", "danger"];
    const reminder = g.unit.id ? CS_REMINDERS.find(r => r.companyId === g.unit.id) : null;
    return `<tr class="${!g.unit.id || g.overdue ? "is-attention" : ""}">
      <td>${g.unit.id ? csLink(g.unit.name, "company", g.unit.id) : "<strong>Chưa phân công</strong>"}<span class="cell-subtitle">${g.areas.length} tổ · ${g.households.toLocaleString("vi-VN")} hộ</span></td>
      <td class="money">${formatMoney(g.due)}</td>
      <td class="money">${formatMoney(g.received)}<span class="cell-subtitle">${g.receipts} phiếu thu</span></td>
      <td class="money">${g.remaining < 0 ? `<span class="text-info">nộp vượt ${formatMoney(-g.remaining)}</span>` : formatMoney(g.remaining)}</td>
      <td class="money">${g.overdue ? `<span class="text-danger">${formatMoney(g.overdue)}</span>` : '<span class="muted">—</span>'}</td>
      <td>${badge(label, tone)}${reminder ? `<span class="cell-subtitle">Đã nhắc ${reminder.date} · hạn ${reminder.due}</span>` : ""}</td>
      <td class="table-actions">${g.unit.id ? csBtn("Lập phiếu thu", "receipt", g.unit.id, g.remaining > 0 ? "primary" : "secondary", true) : csBtn("Phân công", "goCompanies", "", "secondary", true)}</td></tr>`;
  });

  const receiptRows = receipts.map(r => {
    const u = csUnit(r.companyId);
    return `<tr data-row data-search="${escapeHtml(`${r.id} ${r.companyId} ${u?.name || ""} ${r.payer} ${r.bankRef} ${r.note}`.toLowerCase())}">
      <td><span class="cell-title">${r.id}</span><span class="cell-subtitle">Lập ${r.date}</span></td>
      <td><span class="cell-title">${escapeHtml(u?.name || r.companyId)}</span><span class="cell-subtitle">${r.companyId} · ${escapeHtml(r.payer)}</span></td>
      <td>${csPeriodLabel(r.period)}</td>
      <td class="money">${formatMoney(r.amount)}</td>
      <td>${r.method}<span class="cell-subtitle">${escapeHtml(r.bankRef)}</span></td>
      <td>${escapeHtml(r.note || "—")}</td>
      <td>${csBtn("Xem / In", "viewCompanyReceipt", r.id, "secondary", true)}</td></tr>`;
  });

  const tabs = [["receivables", "Khoản phải thu của hộ", charges.length], ["requests", "Phiếu yêu cầu thu", requests.length], ["receipts", "Phiếu thu công ty", receipts.length]];
  const content = tab === "requests"
    ? `${filterBar("", "Mã phiếu, phạm vi, loại phí...")}
      ${panel("Phiếu yêu cầu thu đã phát hành", "Mỗi phiếu lập khoản thu cho các hộ trong phạm vi chưa có khoản cùng kỳ, cùng loại phí.", table(["Mã phiếu", "Kỳ thu", "Loại phí", "Phạm vi", { label: "Đối tượng", num: true }, { label: "Tổng tiền", num: true }, "Ghi chú"], requestRows, { empty: "Chưa có phiếu yêu cầu thu trong kỳ đã chọn." }), csBtn("Tạo phiếu yêu cầu thu", "chargeRequest", "", "primary", true))}`
    : tab === "receipts"
    ? `${panel(`Công nợ theo công ty · kỳ ${csPeriodLabel(period)}`, "Phải thu = số hộ × đơn giá theo tổ được giao. Quá hạn = phần chưa nộp của các kỳ đã hết hạn.", table(["Công ty", { label: "Phải thu", num: true }, { label: "Đã nhận", num: true }, { label: "Còn phải thu", num: true }, { label: "Quá hạn kỳ trước", num: true }, "Trạng thái", ""], ledgerRows, { static: true }))}
      <div class="stack-gap"></div>
      ${filterBar("", "Mã phiếu thu, công ty, người nộp, chứng từ...")}
      ${panel("Phiếu thu đã lập", "Xã lập phiếu thu mỗi lần công ty nộp tiền; công ty xem được phiếu và báo sai sót nếu có.", table(["Mã phiếu thu", "Công ty nộp", "Kỳ", { label: "Số tiền", num: true }, "Hình thức / chứng từ", "Nội dung", ""], receiptRows, { empty: "Chưa có phiếu thu trong phạm vi đã chọn." }))}`
    : `${filterBar("", "Mã khoản, phiếu YC, tên, mã hộ, tổ, công ty...")}
      ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["paid", "Đã thu", "success"], ["exempt", "Miễn giảm", "neutral"]], "khoản")}
      ${panel("Khoản phải thu của hộ", "Sinh từ phiếu yêu cầu thu; công ty phụ trách tổ đi thu và nộp về xã. Danh sách hộ là dữ liệu mẫu.", table(["Mã khoản / phiếu YC", "Đối tượng", "Kỳ · hạn nộp", { label: "Số tiền", num: true }, "Công ty phụ trách", "Trạng thái"], chargeRows, { empty: "Không có khoản thu phù hợp với bộ lọc." }))}`;

  return `${csHeader("Khoản thu", csBtn("Tạo phiếu yêu cầu thu", "chargeRequest") + csBtn("Lập phiếu thu cho công ty", "receipt", "", "primary"), "Phiếu yêu cầu thu → khoản phải thu của hộ → phiếu thu khi công ty nộp tiền về xã")}
  <div class="filter-bar">
    ${filterField("Kỳ thu", csSelect('data-cs-filter="chargePeriod"', [["all", "Tất cả kỳ"], ...CS_PERIODS.map(p => [p.id, p.label])], periodFilter))}
    ${filterField("Công ty", csSelect('data-cs-filter="chargeFilterUnit"', [["all", "Tất cả công ty"], ["none", "Chưa phân công"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], unitFilter))}
    ${filterField("Tổ dân phố", csSelect('data-cs-filter="chargeFilterArea"', [["all", "Tất cả tổ"], ...csAreaOptions()], areaFilter))}
    ${hasFilter ? `<div class="filter-actions">${csBtn("Bỏ lọc", "clearChargeFilters", "", "quiet", true)}${csState.chargeFrom === "progress" ? csBtn("← Báo cáo tiến độ", "backToProgress", "", "secondary", true) : ""}</div>` : ""}
  </div>
  ${summaryStrip([
    [`Phải thu kỳ ${csPeriodLabel(period)}`, formatMoney(due), `${scopeLabel} · ${sumBy("households").toLocaleString("vi-VN")} hộ`],
    ["Đã nhận từ công ty", formatMoney(received), `${sumBy("receipts")} phiếu thu`],
    ["Còn phải thu", remaining < 0 ? `+${formatMoney(-remaining)}` : formatMoney(remaining), remaining < 0 ? "Công ty nộp vượt" : remaining === 0 ? "Đã nộp đủ" : `${kpiRows.filter(g => g.unit.id && g.remaining > 0).length} công ty chưa nộp đủ`],
    ["Quá hạn các kỳ trước", formatMoney(overdue), overdue ? `${kpiRows.filter(g => g.overdue > 0).length} công ty còn nợ kỳ đã hết hạn` : "Không có nợ kỳ trước"]
  ])}
  <section data-table-filter data-chip-key="group" data-count-label="${tab === "requests" ? "phiếu" : tab === "receipts" ? "phiếu thu" : "khoản"}">
    <nav class="tab-nav">${tabs.map(([id, label, n]) => `<button type="button" class="${tab === id ? "active" : ""}" data-cs="switchChargesTab" data-tab="${id}">${label}<b>${n}</b></button>`).join("")}</nav>
    ${content}
  </section>`;
}

// ---------- 3. Danh sách khu vực ----------
function csAreas() {
  const rows = MANAGEMENT_AREAS.map(a => {
    const unit = csUnit(a.unit);
    return `<tr data-row data-group="${unit ? "assigned" : "unassigned"}" data-unit="${a.unit || "none"}" data-search="${escapeHtml(`${a.id} ${a.name} ${unit?.name || ""}`.toLowerCase())}" class="${unit ? "" : "is-attention"}">
      <td><span class="cell-title">${csAreaName(a.id)}</span><span class="cell-subtitle">${a.id}</span></td>
      <td class="num">${a.households.toLocaleString("vi-VN")}</td>
      <td>${unit ? `${csLink(unit.name, "company", unit.id)}<span class="cell-subtitle">${escapeHtml(unit.contact)} · ${escapeHtml(unit.phone)}</span>` : badge("Chưa phân công", "warning")}</td>
      <td>${unit ? `${csIsoToVi(a.start)} → ${csIsoToVi(a.end)}` : "—"}</td>
      <td>${!unit ? csBtn("Phân công", "assignSingleArea", a.id, "primary", true) : ""}</td></tr>`;
  });
  const missing = MANAGEMENT_AREAS.filter(a => !a.unit).length;
  return `${csHeader("Danh sách khu vực", "", `${MANAGEMENT_AREAS.length} tổ dân phố · ${missing ? `${missing} tổ chưa có công ty phụ trách` : "đã phân công đủ"}`)}
  <section data-table-filter data-chip-key="group" data-count-label="khu vực">
    ${filterBar(filterField("Công ty phụ trách", filterSelect("unit", [["all", "Tất cả công ty"], ["none", "Chưa phân công"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])])), "Tên tổ, mã khu vực, tên công ty...")}
    ${chipBar([["all", "Tất cả"], ["assigned", "Đã phân công", "success"], ["unassigned", "Chưa phân công", "warning"]], "khu vực")}
    ${panel("Khu vực", "", table(["Khu vực", { label: "Số hộ", num: true }, "Công ty phụ trách", "Hiệu lực", ""], rows, { empty: "Không có khu vực phù hợp." }))}
  </section>`;
}

// ---------- 4. Công ty môi trường ----------
function csCompanies() {
  const rows = MANAGEMENT_UNITS.map(u => {
    return `<tr data-row data-group="${u.status === "inactive" ? "inactive" : "active"}" data-search="${escapeHtml(`${u.id} ${u.name} ${u.contact} ${u.phone}`.toLowerCase())}">
      <td>${csLink(u.name, "company", u.id)}<span class="cell-subtitle">${u.id}</span></td>
      <td><span class="cell-title">${escapeHtml(u.contact)}</span><span class="cell-subtitle">${escapeHtml(u.phone)}</span></td>
      <td>${csIsoToVi(u.start || "2026-01-01")} → ${csIsoToVi(u.end || "2026-12-31")}</td>
      <td>${badge(u.status === "inactive" ? "Tạm ngưng" : "Hoạt động", u.status === "inactive" ? "neutral" : "success")}</td>
      <td>${csBtn("Chi tiết", "company", u.id, "secondary", true)}</td></tr>`;
  });
  return `${csHeader("Công ty môi trường", csBtn("+ Thêm công ty", "addCompany", "", "primary"))}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    ${filterBar("", "Tên công ty, đầu mối, điện thoại...")}
    ${chipBar([["all", "Tất cả"], ["active", "Hoạt động", "success"], ["inactive", "Tạm ngưng"]], "công ty")}
    ${panel("Danh sách công ty", "", table(["Công ty", "Đầu mối", "Hiệu lực", "Trạng thái", ""], rows, { empty: "Không có công ty phù hợp." }))}
  </section>`;
}

function csCompanyDetail() {
  const u = csUnit(csState.companyId) || MANAGEMENT_UNITS[0];
  csState.companyId = u.id;
  const areas = MANAGEMENT_AREAS.filter(a => a.unit === u.id);
  const progress = areas.map(a => csAreaProgress(a.id, "2026-09"));
  const due = progress.reduce((t, r) => t + r.due, 0), paid = progress.reduce((t, r) => t + r.paid, 0);
  const rows = progress.map(({ area, due, paid }) => {
    const rate = due ? paid / due * 100 : 0;
    return `<tr><td><span class="cell-title">${csAreaName(area.id)}</span><span class="cell-subtitle">${area.id}</span></td><td class="num">${area.households.toLocaleString("vi-VN")}</td><td>${csIsoToVi(area.start)} → ${csIsoToVi(area.end)}</td><td class="money">${formatMoney(due)}</td><td class="money">${formatMoney(paid)}</td><td><div class="cell-progress">${progressBar(rate, rate < 45 ? "warning" : "")}<span class="num">${rate.toFixed(0)}%</span></div></td><td>${csBtn("Bỏ phân công", "unassign", area.id, "secondary", true)}</td></tr>`;
  });
  const complaints = CS_COMPLAINTS.filter(c => csArea(c.area)?.unit === u.id && c.status !== "done").length;
  return `${csHeader(escapeHtml(u.name), csBtn("← Danh sách công ty", "back") + csBtn("Sửa thông tin", "editCompany", u.id) + csBtn("+ Phân công khu vực", "assignAreas", u.id, "primary"), `${u.id} · Đầu mối: ${escapeHtml(u.contact)} · ${escapeHtml(u.phone)} · Hiệu lực: ${csIsoToVi(u.start || "2026-01-01")} → ${csIsoToVi(u.end || "2026-12-31")} · ${u.status === "inactive" ? "Tạm ngưng" : "Hoạt động"}`)}
  ${summaryStrip([["Khu vực phụ trách", String(areas.length), `${areas.reduce((t, a) => t + a.households, 0).toLocaleString("vi-VN")} hộ`], ["Phải thu kỳ 09/2026", formatMoney(due), ""], ["Đã thu", formatMoney(paid), due ? `${(paid / due * 100).toFixed(0)}% phải thu` : ""], ["Khiếu nại đang mở", String(complaints), complaints ? "Xem tại Danh sách khiếu nại" : ""]])}
  ${panel("Khu vực phụ trách", areas.length ? "Một khu vực chỉ có một công ty phụ trách trong cùng thời gian hiệu lực." : "", areas.length ? table(["Khu vực", { label: "Số hộ", num: true }, "Hiệu lực", { label: "Phải thu 09/2026", num: true }, { label: "Đã thu", num: true }, "Tiến độ", ""], rows, { static: true }) : `<div class="empty-state"><strong>Chưa được giao khu vực</strong><p>Bấm “Phân công khu vực” để chọn tổ dân phố cho công ty này.</p></div>`)}`;
}

// ---------- 5. Báo cáo tiến độ thu tiền ----------
function csProgress() {
  const period = csState.period;
  const isDrilldown = csState.company !== "all";
  const ledger = csCompanyLedger(period);
  const visible = !isDrilldown ? ledger : ledger.filter(g => (g.unit.id || "none") === csState.company);
  const sumBy = key => visible.reduce((t, g) => t + g[key], 0);
  // Công ty báo đã thu (theo tiến độ từng tổ) đặt cạnh số đã nộp về xã (phiếu thu) để thấy phần thu rồi chưa nộp.
  const reported = g => g.areas.reduce((t, a) => t + csAreaProgress(a.id, period).paid, 0);
  const due = sumBy("due"), received = sumBy("received"), collected = visible.reduce((t, g) => t + reported(g), 0);
  const selectedUnit = isDrilldown ? (csUnit(csState.company) || { name: csState.company === "none" ? "Chưa phân công" : "Công ty" }) : null;
  const progressCell = (p, d) => { const rate = d ? p / d * 100 : 0; return `<div class="cell-progress">${progressBar(rate, rate < 45 ? "warning" : "")}<span class="num">${rate.toFixed(1)}%</span></div>`; };
  const pastDue = csPeriodDue(period) < CS_TODAY;

  // Công ty còn nợ kỳ đã hết hạn nộp: nhắc ngay đầu trang.
  const debtors = MANAGEMENT_UNITS.map(unit => ({ unit, debts: csCompanyDebts(unit.id), reminder: CS_REMINDERS.find(r => r.companyId === unit.id) })).filter(d => d.debts.length);
  const debtTotal = debtors.reduce((t, d) => t + d.debts.reduce((x, y) => x + y.remaining, 0), 0);

  const rows = !isDrilldown
    ? visible.map(g => {
        const paid = reported(g);
        const debt = g.unit.id && ((g.remaining > 0 && pastDue) || g.overdue > 0);
        const reminder = g.unit.id ? CS_REMINDERS.find(r => r.companyId === g.unit.id) : null;
        const [label, tone] = !g.unit.id ? ["Chưa có công ty thu", "danger"] : g.remaining <= 0 ? ["Đã nộp đủ", "success"] : debt ? ["Quá hạn nộp", "danger"] : g.received ? ["Nộp một phần", "warning"] : ["Chưa nộp", "neutral"];
        return `<tr class="${!g.unit.id || debt ? "is-attention" : ""}">
        <td>${g.unit.id ? csLink(g.unit.name, "progressCompany", g.unit.id) : "<strong>Chưa phân công</strong>"}<span class="cell-subtitle">${g.areas.length} tổ · ${g.households.toLocaleString("vi-VN")} hộ</span></td>
        <td class="money">${formatMoney(g.due)}</td>
        <td class="money">${formatMoney(paid)}<span class="cell-subtitle">${g.due ? (paid / g.due * 100).toFixed(0) : 0}% · công ty báo</span></td>
        <td class="money">${formatMoney(g.received)}<span class="cell-subtitle">${g.receipts} phiếu thu</span></td>
        <td class="money">${g.remaining < 0 ? `<span class="text-info">nộp vượt ${formatMoney(-g.remaining)}</span>` : formatMoney(g.remaining)}${g.overdue ? `<span class="cell-subtitle text-danger">+ ${formatMoney(g.overdue)} kỳ trước</span>` : ""}</td>
        <td>${progressCell(g.received, g.due)}</td>
        <td>${badge(label, tone)}${reminder ? `<span class="cell-subtitle">Đã nhắc ${reminder.date} · hạn ${reminder.due}</span>` : ""}</td>
        <td class="table-actions">${g.unit.id ? `${csBtn("Xem các tổ", "progressCompany", g.unit.id, "secondary", true)}${debt ? csBtn(reminder ? "Nhắc lại" : "Nhắc nộp", "remindDebt", g.unit.id, "danger", true) : ""}` : csBtn("Phân công", "goCompanies", "", "secondary", true)}</td>
      </tr>`;
      })
    : visible.flatMap(g => g.areas.map(a => {
        const r = csAreaProgress(a.id, period);
        const charges = CS_CHARGES.filter(c => c.period === period && csSubject(c.subject)?.area === a.id && c.status !== "exempt");
        const paidCharges = charges.filter(c => c.status === "paid").length;
        return `<tr>
        <td>${csLink(csAreaName(a.id), "progressAreaCharges", `${g.unit.id || "none"}:${a.id}`)}<span class="cell-subtitle">${a.id} · ${a.households.toLocaleString("vi-VN")} hộ</span></td>
        <td class="money">${formatMoney(r.due)}</td>
        <td class="money">${formatMoney(r.paid)}</td>
        <td class="money">${formatMoney(r.due - r.paid)}</td>
        <td>${progressCell(r.paid, r.due)}</td>
        <td class="num">${charges.length ? `${paidCharges}/${charges.length}<span class="cell-subtitle">khoản hộ mẫu đã thu</span>` : '<span class="muted">—</span>'}</td>
        <td>${csBtn("Xem khoản thu", "progressAreaCharges", `${g.unit.id || "none"}:${a.id}`, "primary", true)}</td>
      </tr>`;
      }));

  return `${csHeader(
    "Báo cáo tiến độ thu tiền",
    (isDrilldown ? csBtn("← Tất cả công ty", "progressResetCompany") : "") + actionButton("Xuất Excel", "exportData"),
    isDrilldown ? `Tiến độ theo từng tổ của: <strong>${escapeHtml(selectedUnit?.name || "")}</strong>` : "Phải thu theo tổ được giao · công ty báo đã thu · đã nộp về xã theo phiếu thu"
  )}
  <div class="filter-bar">
    ${filterField("Kỳ thu", csSelect('data-cs-filter="period"', CS_PERIODS.map(p => [p.id, p.label]), period))}
    ${filterField("Công ty", csSelect('data-cs-filter="company"', [["all", "Tất cả công ty"], ["none", "Chưa phân công"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], csState.company))}
  </div>
  ${debtors.length && !isDrilldown ? `<div class="callout danger debt-callout">
    <div>
      <strong>${debtors.length} công ty chưa nộp đủ kỳ đã hết hạn · còn ${formatMoney(debtTotal)}</strong>
      <p>Kỳ mới đã mở nhưng kỳ cũ chưa khóa được cho tới khi công ty nộp đủ. Nhắc nộp để công ty thấy ngay trong không gian của mình.</p>
      <ul class="debt-list">${debtors.map(d => `<li><span>${escapeHtml(d.unit.name)}</span><small>${d.debts.map(x => `${x.label}: ${formatMoney(x.remaining)}`).join(" · ")}${d.reminder ? ` · đã nhắc ${d.reminder.date}` : ""}</small>${csBtn(d.reminder ? "Nhắc lại" : "Nhắc nộp", "remindDebt", d.unit.id, "danger", true)}</li>`).join("")}</ul>
    </div>
    <div class="debt-actions">${csBtn("Nhắc tất cả", "remindAll", "", "danger", true)}</div>
  </div>` : ""}
  ${summaryStrip([
    ["Phải thu", formatMoney(due), `${sumBy("households").toLocaleString("vi-VN")} hộ · ${visible.reduce((t, g) => t + g.areas.length, 0)} tổ`],
    ["Công ty báo đã thu", formatMoney(collected), due ? `${(collected / due * 100).toFixed(1)}% · theo báo cáo` : ""],
    ["Đã nộp về xã", formatMoney(received), `${sumBy("receipts")} phiếu thu · ${due ? (received / due * 100).toFixed(1) : 0}%`],
    ["Còn phải nộp", formatMoney(Math.max(due - received, 0)), `Hạn nộp ${CS_PERIODS.find(p => p.id === period)?.due || ""}${pastDue ? " · đã hết hạn" : ""}`]
  ])}
  ${panel(
    !isDrilldown ? "Theo công ty" : `Theo tổ · ${escapeHtml(selectedUnit?.name || "")}`,
    !isDrilldown ? "Tiến độ = đã nộp về xã / phải thu. Bấm tên công ty để xem từng tổ." : "Bấm tên tổ hoặc “Xem khoản thu” để mở danh sách khoản thu của tổ.",
    rows.length ? table(!isDrilldown
      ? ["Công ty", { label: "Phải thu", num: true }, { label: "Công ty báo đã thu", num: true }, { label: "Đã nộp về xã", num: true }, { label: "Còn phải nộp", num: true }, "Tiến độ nộp", "Trạng thái", ""]
      : ["Tổ / Khu vực", { label: "Phải thu", num: true }, { label: "Công ty báo đã thu", num: true }, { label: "Còn phải thu", num: true }, "Tiến độ", { label: "Hộ mẫu", num: true }, ""], rows, { static: true }) : '<p class="table-empty">Không có dữ liệu trong phạm vi đã chọn.</p>'
  )}`;
}

// ---------- 6. Đối soát tổng thể ----------
function csReconciliation() {
  const groups = csCompanyProgress(csState.period).filter(g => g.unit.id);
  const sum = key => groups.reduce((t, g) => t + g[key], 0);
  const rows = groups.map(g => {
    const gap = g.paid - g.confirmed;
    const complaints = CS_COMPLAINTS.filter(c => csArea(c.area)?.unit === g.unit.id && c.status !== "done").length;
    const state = gap ? "mismatch" : "matched";
    return `<tr data-row data-group="${state}" data-search="${escapeHtml(g.unit.name.toLowerCase())}" class="${gap ? "is-attention" : ""}">
      <td>${csLink(g.unit.name, "company", g.unit.id)}<span class="cell-subtitle">${g.rows.length} khu vực · ${g.households.toLocaleString("vi-VN")} hộ</span></td>
      <td class="money">${formatMoney(g.due)}</td><td class="money">${formatMoney(g.paid)}</td><td class="money">${formatMoney(g.confirmed)}</td>
      <td>${delta(g.confirmed - g.paid, gap ? "chứng từ thiếu so với báo thu" : "", formatMoney)}</td>
      <td class="num">${complaints || "—"}</td>
      <td>${badge(gap ? "Lệch" : "Khớp", gap ? "danger" : "success")}</td>
      <td>${csBtn("Chi tiết", "reconDetail", g.unit.id, "secondary", true)}</td></tr>`;
  });
  return `${csHeader("Đối soát tổng thể", actionButton("Xuất bảng đối soát", "exportData"))}
  <div class="filter-bar">${filterField("Kỳ thu", csSelect('data-cs-filter="period"', CS_PERIODS.map(p => [p.id, p.label]), csState.period))}</div>
  ${summaryStrip([["Phải thu", formatMoney(sum("due")), `${groups.length} công ty`], ["Công ty báo đã thu", formatMoney(sum("paid")), ""], ["Đã có chứng từ", formatMoney(sum("confirmed")), "Phiếu thu, biên lai, sao kê"], ["Chênh lệch", formatMoney(sum("paid") - sum("confirmed")), `${groups.filter(g => g.paid !== g.confirmed).length} công ty lệch`]])}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    ${filterBar("", "Tên công ty...")}
    ${chipBar([["all", "Tất cả"], ["mismatch", "Lệch", "danger"], ["matched", "Khớp", "success"]], "công ty")}
    ${panel("Đối soát theo công ty", "Chênh lệch = số đã có chứng từ − công ty báo đã thu; âm là phần báo thu chưa có chứng từ.", table(["Công ty", { label: "Phải thu", num: true }, { label: "Báo đã thu", num: true }, { label: "Đã có chứng từ", num: true }, { label: "Chênh lệch", num: true }, { label: "Khiếu nại mở", num: true }, "Kết quả", ""], rows, { empty: "Không có công ty phù hợp." }))}
  </section>`;
}

// ---------- 7. Danh sách khiếu nại ----------
function csComplaints() {
  const areas = [...new Set(CS_COMPLAINTS.map(c => c.area))].sort();
  const rows = CS_COMPLAINTS.map(c => {
    const company = csCompanyOf(c.area);
    const [label, tone] = CS_COMPLAINT_STATUS[c.status];
    return `<tr data-row data-group="${c.status}" data-area="${c.area}" data-search="${escapeHtml(`${c.id} ${c.name} ${c.subject} ${c.phone} ${c.content} ${company?.name || ""}`.toLowerCase())}" class="${c.status === "new" ? "is-attention" : ""}">
      <td><span class="cell-title">${c.id}</span><span class="cell-subtitle">${c.date}</span></td>
      <td><span class="cell-title">${escapeHtml(c.name)}</span><span class="cell-subtitle">${c.subject} · ${escapeHtml(c.phone)}</span></td>
      <td><span class="cell-title" style="font-weight:600">${escapeHtml(c.content)}</span><span class="cell-subtitle">${c.channel}${c.result ? ` · ${escapeHtml(c.result)}` : ""}</span></td>
      <td><span class="cell-title">${csAreaName(c.area)}</span><span class="cell-subtitle">${company ? escapeHtml(company.name) : "Chưa có công ty"}</span></td>
      <td>${badge(label, tone)}</td>
      <td>${csBtn(c.status === "done" ? "Xem" : "Xử lý", "handleComplaint", c.id, c.status === "done" ? "secondary" : "primary", true)}</td></tr>`;
  });
  return `${csHeader("Danh sách khiếu nại", csBtn("+ Ghi nhận khiếu nại", "addComplaint", "", "primary"))}
  <section data-table-filter data-chip-key="group" data-count-label="khiếu nại">
    ${filterBar(filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(a => [a, csAreaName(a)])])), "Mã, tên, mã hộ, nội dung, công ty...")}
    ${chipBar([["all", "Tất cả"], ["new", "Mới tiếp nhận", "warning"], ["processing", "Đang xử lý"], ["done", "Đã giải quyết", "success"]], "khiếu nại")}
    ${panel("Khiếu nại", "", table(["Mã / ngày", "Người khiếu nại", "Nội dung", "Khu vực · công ty", "Trạng thái", ""], rows, { empty: "Không có khiếu nại phù hợp." }))}
  </section>`;
}

Object.assign(VIEW_RENDERERS, { csSubjects, csCharges, csAreas, csCompanies, csCompanyDetail, csProgress, csReconciliation, csComplaints });

// ---------- Hộp thoại ----------
function csDialog(kind, id, title, body, confirm = "Lưu", description = "") {
  csState.dialog = { kind, id };
  DIALOG_SPECS.cs = { eyebrow: ROLE_CONFIG[currentRole]?.label || "Cán bộ xã", title, description, fields: [], confirm };
  openDemoModal("cs");
  const host = document.getElementById("dialogBody");
  host.innerHTML = body;
  const button = document.getElementById("dialogConfirm");
  button.hidden = !confirm;
  const first = host.querySelector("input:not([readonly]):not([type=checkbox]), select, textarea");
  if (first) setTimeout(() => first.focus(), 50);
}

const CS_DIALOGS = {
  addSubject() { CS_DIALOGS.editSubject(""); },
  editSubject(code) {
    const s = csSubject(code) || { code: "", name: "", type: "Hộ gia đình", address: "", phone: "", area: "KV01", contract: "", contractFrom: "", tariff: "HGĐ ≥ 3 người", status: "active" };
    csDialog("subject", code, code ? `Sửa đối tượng ${code}` : "Thêm đối tượng", `<div class="form-grid">
      ${csField("Loại đối tượng", csSelect('id="csSubType"', [["Hộ gia đình", "Hộ gia đình"], ["Hộ kinh doanh", "Hộ kinh doanh"], ["Doanh nghiệp", "Doanh nghiệp"]], s.type))}
      ${csField("Tên chủ hộ / đơn vị *", csInput("csSubName", s.name, "text", "required"))}
      ${csField("Địa chỉ *", csInput("csSubAddress", s.address, "text", "required"))}
      ${csField("Điện thoại", csInput("csSubPhone", s.phone))}
      ${csField("Khu vực *", csSelect('id="csSubArea"', csAreaOptions(), s.area))}
      ${csField("Nhóm giá *", csSelect('id="csSubTariff"', Object.keys(CS_TARIFFS).map(k => [k, `${k} · ${formatMoney(CS_TARIFFS[k])}/kỳ`]), s.tariff))}
      <div class="form-section">Hợp đồng</div>
      ${csField("Số hợp đồng", csInput("csSubContract", s.contract === "—" ? "" : s.contract, "text", `placeholder="Để trống nếu chưa lập"`))}
      ${csField("Hiệu lực từ", csInput("csSubFrom", s.contractFrom ? s.contractFrom.split("/").reverse().join("-") : CS_TODAY, "date"))}
      ${csField("Trạng thái dịch vụ", csSelect('id="csSubStatus"', Object.entries(CS_SUBJECT_STATUS).map(([k, v]) => [k, v[0]]), s.status))}
    </div>`, code ? "Lưu thay đổi" : "Thêm đối tượng");
  },
  chargeRequest() {
    // Chỉ lập phiếu cho kỳ Quản trị đã mở (tháng hoặc quý), chưa khóa.
    const openPeriods = CS_PERIODS.filter(p => p.status !== "Đã khóa");
    if (!openPeriods.length) { showDemoNotice("Chưa có kỳ thu nào đang mở. Đề nghị Quản trị hệ thống mở kỳ tại Cấu hình nghiệp vụ."); return; }
    const periodValue = openPeriods.some(p => p.id === csState.period) ? csState.period : openPeriods[0].id;
    csState.reqDueFor = null;
    const areaBoxes = MANAGEMENT_AREAS.map(a => {
      const u = csUnit(a.unit);
      return `<label class="area-pick${u ? "" : " is-free"}"><input type="checkbox" name="csReqAreaCheck" value="${a.id}" checked><span><b>${csAreaName(a.id)}</b><small>${a.households.toLocaleString("vi-VN")} hộ · ${u ? escapeHtml(u.name) : "chưa phân công"}</small></span></label>`;
    }).join("");
    csDialog("chargeRequest", "", "Tạo phiếu yêu cầu thu", `<div class="form-grid">
      ${csField("Kỳ thu *", csSelect('id="csReqPeriod"', openPeriods.map(p => [p.id, p.label]), periodValue))}
      ${csField("Hạn nộp *", csInput("csReqDue", "", "date", "required"))}
      ${csField("Loại phí *", csSelect('id="csReqFeeType"', CS_FEE_TYPES.map(f => [f.id, f.name]), "env"))}
      <div class="form-field" id="csReqPriceWrap" hidden><label>Đơn giá / đối tượng *</label>${csInput("csReqPrice", "", "number", 'min="0" step="1000"')}</div>
      ${csField("Phạm vi *", csSelect('id="csReqScopeType"', [["all", "Toàn xã"], ["area", "Theo khu vực · chọn tổ dân phố"], ["company", "Theo công ty phụ trách"]], "all"), true)}
      <div class="full" id="csReqAreaWrap" hidden>
        <div class="area-pick-bar"><span id="csReqAreaCounter"></span><button type="button" class="button button-quiet button-small" id="csReqSelectAllAreas">Chọn tất cả</button><button type="button" class="button button-quiet button-small" id="csReqDeselectAllAreas">Bỏ chọn</button></div>
        <div class="area-pick-grid">${areaBoxes}</div>
      </div>
      <div class="full" id="csReqCompanyWrap" hidden><div class="form-grid">
        ${csField("Công ty phụ trách *", csSelect('id="csReqCompanySelect"', csCompanyOptions(), MANAGEMENT_UNITS[0]?.id))}
        <div class="form-field"><label>Tổ được giao</label><p class="form-help" id="csReqCompanyAreasInfo"></p></div>
      </div></div>
      ${csField("Ghi chú", `<textarea class="control" id="csReqNote" placeholder="Không bắt buộc"></textarea>`, true)}
    </div><div id="csReqPreview"></div>`, "Lập phiếu yêu cầu thu", "Kỳ quý lập một khoản cho 3 tháng. Bỏ qua hộ đã có khoản cùng kỳ (kể cả tháng/quý chồng nhau), cùng loại phí; hộ diện miễn giảm lập 0đ; tổ chưa có công ty phụ trách không được lập.");
    csRequestPreview();
  },
  receipt(companyId) {
    const defaultId = csUnit(companyId) ? companyId : MANAGEMENT_UNITS.find(u => u.status !== "inactive")?.id || "DV01";
    csDialog("receipt", "", "Lập phiếu thu cho công ty môi trường", `<div class="form-grid">
      ${csField("Công ty nộp tiền *", csSelect('id="csRcCompanyId"', csCompanyOptions(), defaultId))}
      ${csField("Kỳ thu *", csSelect('id="csRcPeriod"', CS_PERIODS.map(p => [p.id, p.label]), csState.chargePeriod && csState.chargePeriod !== "all" ? csState.chargePeriod : csState.period))}
      <div class="full" id="csRcBalanceBox"></div>
      ${csField("Số tiền nộp đợt này (đ) *", csInput("csRcAmount", "", "number", 'min="1000" step="1000" required'))}
      ${csField("Ngày lập phiếu *", csInput("csRcDate", CS_TODAY, "date", "required"))}
      ${csField("Hình thức *", csSelect('id="csRcMethod"', [["Chuyển khoản", "Chuyển khoản · ngân hàng / kho bạc"], ["Tiền mặt", "Tiền mặt · thủ quỹ xã"]], "Chuyển khoản"))}
      ${csField("Người nộp (đại diện công ty) *", csInput("csRcPayer", "", "text", "required"))}
      ${csField("Số chứng từ / mã giao dịch", csInput("csRcBankRef", "", "text", 'placeholder="VCB-1029348, số giấy nộp tiền..."'), true)}
      ${csField("Nội dung", `<textarea class="control" id="csRcNote" placeholder="Nộp tiền thu gom rác sinh hoạt đợt 1 kỳ 09/2026"></textarea>`, true)}
    </div>`, "Lập phiếu thu", "Phiếu thu ghi nhận tiền công ty nộp về ngân sách xã. Có thể nộp nhiều đợt; mỗi đợt không vượt số còn phải nộp của kỳ.");
    csRcUpdateBalance();
  },
  viewCompanyReceipt(receiptId) {
    const r = CS_COMPANY_RECEIPTS.find(x => x.id === receiptId);
    if (!r) return;
    const u = csUnit(r.companyId);
    const due = csCompanyDue(r.companyId, r.period);
    const upTo = csCompanyReceipts(r.companyId, r.period).filter(x => x.id <= r.id).reduce((t, x) => t + x.amount, 0);
    csDialog("viewReceipt", receiptId, `Phiếu thu ${r.id}`, `<div class="invoice-preview">
      <div class="invoice-brand"><div><h3>UBND xã Đông Thạnh</h3><p>Phòng Kinh tế · Bộ phận Tài chính – Thu</p></div><div class="invoice-number"><h3>${r.id}</h3><p>Ngày ${r.date}</p></div></div>
      <div class="invoice-title"><h2>Phiếu thu</h2><p>Tiền dịch vụ thu gom, vận chuyển chất thải rắn sinh hoạt công ty nộp ngân sách xã</p></div>
      <p><strong>Đơn vị nộp:</strong> ${escapeHtml(u?.name || r.companyId)} (${r.companyId})<br><strong>Người nộp:</strong> ${escapeHtml(r.payer)}<br><strong>Hình thức:</strong> ${escapeHtml(r.method)}${r.bankRef && r.bankRef !== "—" ? ` · chứng từ ${escapeHtml(r.bankRef)}` : ""}<br><strong>Nội dung:</strong> ${escapeHtml(r.note || "Nộp tiền thu gom rác sinh hoạt")}</p>
      <table class="invoice-lines"><thead><tr><th>Nội dung</th><th>Kỳ</th><th class="num">Số tiền</th></tr></thead><tbody>
        <tr><td>Tiền thu gom rác sinh hoạt nộp ngân sách xã</td><td>${csPeriodLabel(r.period)}</td><td class="num"><strong>${formatMoney(r.amount)}</strong></td></tr>
      </tbody></table>
      <p><em>Bằng chữ: ${csNumberToWords(r.amount)}.</em></p>
      <p class="muted">Phải thu kỳ ${csPeriodLabel(r.period)}: ${formatMoney(due)} · đã nộp đến phiếu này: ${formatMoney(upTo)} · còn phải nộp: ${formatMoney(Math.max(due - upTo, 0))}</p>
      <div class="invoice-sign"><div><strong>Người nộp tiền</strong><span>${escapeHtml(r.payer)}</span></div><div><strong>Người lập phiếu</strong><span>Nguyễn Thu Hà</span></div><div><strong>Thủ quỹ</strong><span>Lê Thị Mai</span></div></div>
    </div>`, "In phiếu thu");
  },
  addCompany() { CS_DIALOGS.editCompany(""); },
  editCompany(id) {
    const u = csUnit(id) || { id: `DV${String(csState.seq.company).padStart(2, "0")}`, name: "", contact: "", phone: "", status: "active", start: "2026-01-01", end: "2026-12-31" };
    csDialog("company", id, id ? "Sửa thông tin công ty" : "Thêm công ty", `<div class="form-grid">
      ${csField("Mã", csInput("csCoId", u.id, "text", "readonly"))}
      ${csField("Trạng thái", csSelect('id="csCoStatus"', [["active", "Hoạt động"], ["inactive", "Tạm ngưng"]], u.status || "active"))}
      ${csField("Tên công ty *", csInput("csCoName", u.name, "text", "required"), true)}
      ${csField("Đầu mối liên hệ *", csInput("csCoContact", u.contact, "text", "required"))}
      ${csField("Điện thoại *", csInput("csCoPhone", u.phone, "tel", "required"))}
      ${csField("Hiệu lực từ *", csInput("csCoStart", u.start || "2026-01-01", "date", "required"))}
      ${csField("Hiệu lực đến *", csInput("csCoEnd", u.end || "2026-12-31", "date", "required"))}
    </div>`, id ? "Lưu thay đổi" : "Thêm công ty");
  },
  assignAreas(id) {
    const u = csUnit(id);
    if (!u) return;
    const candidates = MANAGEMENT_AREAS.filter(a => a.unit !== id).sort((a, b) => (a.unit ? 1 : 0) - (b.unit ? 1 : 0) || a.id.localeCompare(b.id));
    const rows = candidates.map(a => `<tr><td><input type="checkbox" data-cs-area="${a.id}" aria-label="Chọn ${a.name}"></td><td><span class="cell-title">${csAreaName(a.id)}</span><span class="cell-subtitle">${a.id} · ${a.households} hộ</span></td><td>${a.unit ? `${badge("Đang: " + (csUnit(a.unit)?.name || ""), "warning")}<span class="cell-subtitle">Chọn sẽ bàn giao sang ${escapeHtml(u.name)}</span>` : badge("Chưa phân công", "neutral")}</td></tr>`);
    csDialog("assignAreas", id, `Phân công khu vực · ${u.name}`, `<div class="form-grid">
      ${csField("Hiệu lực từ *", csInput("csAsStart", CS_TODAY, "date", "required"))}
      ${csField("Hiệu lực đến *", csInput("csAsEnd", "2026-12-31", "date", "required"))}
    </div>
    <div class="routing-pick"><div class="table-wrap"><table class="data-table"><thead><tr><th></th><th>Khu vực</th><th>Hiện tại</th></tr></thead><tbody>${rows.join("")}</tbody></table></div></div>
    <div class="routing-pick-tools"><label><input type="checkbox" id="csAsOnlyFree"> Chỉ hiện khu vực chưa phân công</label><span id="csAsCount">Đã chọn 0 khu vực</span></div>
    <p class="routing-live" id="csAsLive">Chọn ít nhất một khu vực.</p>`, "Xác nhận phân công");
    csAssignLive();
  },
  unassign(areaId) {
    const a = csArea(areaId), u = csUnit(a?.unit);
    if (!a || !u) return;
    const otherUnits = MANAGEMENT_UNITS.filter(other => other.id !== u.id && other.status !== "inactive");
    csDialog("unassign", areaId, `Bỏ phân công & Bàn giao ${csAreaName(a.id)}`, `
      <p>Bỏ <strong>${csAreaName(a.id)}</strong> (${a.households.toLocaleString("vi-VN")} hộ) khỏi công ty <strong>${escapeHtml(u.name)}</strong>.</p>
      <div class="alert alert-info" style="background:#e0f2fe;color:#0369a1;padding:10px 14px;border-radius:6px;font-size:13px;margin:10px 0 16px 0;">
        ⚠️ <strong>Yêu cầu phân công:</strong> Khu vực thu gom rác và thu tiền không được để trống đơn vị phụ trách. Bạn bắt buộc phải chọn một công ty khác để bàn giao khu vực này.
      </div>
      <div class="form-grid">
        ${csField("Công ty tiếp nhận thay thế *", csSelect('id="csUnTargetUnit" required', [["", "— Bắt buộc chọn công ty tiếp nhận —"], ...otherUnits.map(o => [o.id, `${o.name} (hiện có ${MANAGEMENT_AREAS.filter(x => x.unit === o.id).length} khu vực)`])], ""), true)}
        ${csField("Hiệu lực từ *", csInput("csUnStart", CS_TODAY, "date", "required"))}
        ${csField("Hiệu lực đến *", csInput("csUnEnd", a.end || "2026-12-31", "date", "required"))}
        ${csField("Lý do bàn giao / thay đổi", `<textarea class="control" id="csUnReason" placeholder="Ví dụ: Điều chuyển đơn vị theo quyết định giao địa bàn của UBND xã..."></textarea>`, true)}
      </div>
    `, "Xác nhận chuyển công ty");
  },
  assignSingleArea(areaId) {
    const a = csArea(areaId);
    if (!a) return;
    const activeUnits = MANAGEMENT_UNITS.filter(u => u.status !== "inactive");
    csDialog("assignSingleArea", areaId, `Phân công công ty phụ trách · ${csAreaName(a.id)}`, `
      <div style="background:#f8fafc;padding:10px 14px;border-radius:6px;border:1px solid #e2e8f0;margin-bottom:14px;font-size:13px;">
        📍 <strong>Khu vực:</strong> ${csAreaName(a.id)} (${a.id}) · <strong>${a.households.toLocaleString("vi-VN")} hộ dân</strong>
      </div>
      <div class="form-grid">
        ${csField("Công ty môi trường phụ trách *", csSelect('id="csAsUnit" required', [["", "— Chọn công ty môi trường phụ trách —"], ...activeUnits.map(u => [u.id, `${u.name} (Đầu mối: ${u.contact} · ${u.phone})`])], activeUnits[0]?.id || ""), true)}
        ${csField("Hiệu lực từ *", csInput("csAsStart", CS_TODAY, "date", "required"))}
        ${csField("Hiệu lực đến *", csInput("csAsEnd", "2026-12-31", "date", "required"))}
        ${csField("Ghi chú / Quyết định giao", `<textarea class="control" id="csAsNote" placeholder="Ví dụ: Phân công địa bàn theo quyết định giao nhiệm vụ của UBND xã..."></textarea>`, true)}
      </div>
    `, "Xác nhận phân công", "Chỉ định công ty môi trường chịu trách nhiệm thu gom rác và thu tiền cho khu vực này.");
  },
  remindDebt(id) {
    const u = csUnit(id);
    if (!u) return;
    const debts = csCompanyDebts(id);
    const total = debts.reduce((t, d) => t + d.remaining, 0);
    csDialog("remindDebt", id, `Nhắc nộp tiền · ${u.name}`, `<div class="dialog-summary">
        <div><span>Kỳ còn nợ</span><strong>${debts.length}</strong></div>
        <div><span>Còn phải nộp</span><strong class="text-danger">${formatMoney(total)}</strong></div>
        <div><span>Đã nhắc</span><strong>${CS_REMINDERS.filter(r => r.companyId === id).length} lần</strong></div>
      </div>
      ${table(["Kỳ", "Hạn nộp", { label: "Phải thu", num: true }, { label: "Đã nộp", num: true }, { label: "Còn nợ", num: true }], debts.map(d => `<tr><td>${d.label}</td><td>${d.due}</td><td class="money">${formatMoney(d.dueAmount)}</td><td class="money">${formatMoney(d.received)}</td><td class="money text-danger">${formatMoney(d.remaining)}</td></tr>`), { static: true })}
      <div class="form-grid" style="margin-top:14px">
      ${csField("Gửi tới", csInput("csRdTo", `${u.contact} · ${u.phone}`, "text", "readonly"), true)}
      ${csField("Nội dung *", `<textarea class="control" id="csRdContent" required>UBND xã đề nghị ${u.name} nộp số tiền thu gom rác còn nợ ${formatMoney(total)} (${debts.map(d => d.label).join(", ")}) về ngân sách xã trước ngày ${csDaysAfter(CS_TODAY, 5)}.</textarea>`, true)}
      ${csField("Hạn nộp *", csInput("csRdDue", csDaysAfter(CS_TODAY, 5).split("/").reverse().join("-"), "date", "required"))}
    </div>`, "Gửi nhắc nhở", "Nhắc nhở hiện ở không gian Công ty và được ghi vào nhật ký đối soát.");
  },
  notify(id) {
    const u = csUnit(id);
    if (!u) return;
    const g = csCompanyProgress(csState.period).find(x => x.unit.id === id);
    const rate = g && g.due ? (g.paid / g.due * 100).toFixed(1) : "0";
    csDialog("notify", id, `Nhắc tiến độ · ${u.name}`, `<div class="dialog-summary"><div><span>Kỳ</span><strong>${csPeriodLabel(csState.period)}</strong></div><div><span>Tỷ lệ thu</span><strong>${rate}%</strong></div><div><span>Còn phải thu</span><strong>${g ? formatMoney(g.due - g.paid) : "—"}</strong></div></div><div class="form-grid">
      ${csField("Gửi tới", csInput("csNtTo", `${u.contact} · ${u.phone}`, "text", "readonly"), true)}
      ${csField("Nội dung *", `<textarea class="control" id="csNtContent" required>Đề nghị công ty rà soát tiến độ thu kỳ ${csPeriodLabel(csState.period)} (hiện ${rate}%), đôn đốc nội bộ và phản hồi kết quả về xã.</textarea>`, true)}
      ${csField("Hạn phản hồi *", csInput("csNtDue", "2026-09-22", "date", "required"))}
    </div>`, "Gửi nhắc");
  },
  reconDetail(id) {
    const g = csCompanyProgress(csState.period).find(x => x.unit.id === id);
    if (!g) return;
    const gap = g.paid - g.confirmed;
    const rows = g.rows.map(r => `<tr><td>${csAreaName(r.area.id)}</td><td class="money">${formatMoney(r.due)}</td><td class="money">${formatMoney(r.paid)}</td><td class="money">${formatMoney(r.confirmed)}</td><td>${delta(r.confirmed - r.paid, "", formatMoney)}</td></tr>`);
    csDialog("reconDetail", id, `Đối soát · ${g.unit.name}`, `<div class="dialog-summary"><div><span>Kỳ</span><strong>${csPeriodLabel(csState.period)}</strong></div><div><span>Chênh lệch</span><strong>${formatMoney(gap)}</strong></div><div><span>Kết quả</span><strong>${gap ? "Lệch" : "Khớp"}</strong></div></div>
    ${table(["Khu vực", { label: "Phải thu", num: true }, { label: "Báo đã thu", num: true }, { label: "Đã có chứng từ", num: true }, { label: "Chênh lệch", num: true }], rows, { static: true })}
    ${gap ? `<div class="form-grid" style="margin-top:14px">${csField("Yêu cầu giải trình *", `<textarea class="control" id="csRdContent" required>Đề nghị công ty bổ sung chứng từ cho số tiền báo đã thu chưa có phiếu thu/biên lai (${formatMoney(gap)}) kỳ ${csPeriodLabel(csState.period)}.</textarea>`, true)}${csField("Hạn phản hồi *", csInput("csRdDue", "2026-09-24", "date", "required"))}</div>` : ""}`, gap ? "Gửi yêu cầu giải trình" : "");
  },
  addComplaint() {
    csDialog("addComplaint", "", "Ghi nhận khiếu nại", `<div class="form-grid">
      ${csField("Người khiếu nại *", csInput("csCpName", "", "text", "required"))}
      ${csField("Điện thoại", csInput("csCpPhone", ""))}
      ${csField("Mã hộ / đối tượng", csInput("csCpSubject", "", "text", 'placeholder="Nếu có"'))}
      ${csField("Khu vực *", csSelect('id="csCpArea"', csAreaOptions(), "KV01"))}
      ${csField("Kênh tiếp nhận", csSelect('id="csCpChannel"', [["Trực tiếp tại xã", "Trực tiếp tại xã"], ["Điện thoại", "Điện thoại"], ["Ứng dụng người dân", "Ứng dụng người dân"]], "Trực tiếp tại xã"))}
      ${csField("Ngày tiếp nhận", csInput("csCpDate", CS_TODAY, "date"))}
      ${csField("Nội dung *", `<textarea class="control" id="csCpContent" required></textarea>`, true)}
    </div>`, "Ghi nhận");
  },
  handleComplaint(id) {
    const c = CS_COMPLAINTS.find(x => x.id === id);
    if (!c) return;
    const company = csCompanyOf(c.area);
    const done = c.status === "done";
    csDialog("handleComplaint", id, `${done ? "Khiếu nại" : "Xử lý khiếu nại"} ${c.id}`, `<div class="dialog-summary"><div><span>Người khiếu nại</span><strong>${escapeHtml(c.name)}</strong></div><div><span>Khu vực</span><strong>${csAreaName(c.area)}</strong></div><div><span>Công ty phụ trách</span><strong>${company ? escapeHtml(company.name) : "—"}</strong></div></div>
    <p><strong>Nội dung:</strong> ${escapeHtml(c.content)}<br><span class="muted">${c.channel} · ${c.date}${c.subject ? ` · ${c.subject}` : ""}</span></p>
    ${done ? `<p><strong>Kết quả:</strong> ${escapeHtml(c.result)}</p>` : `<div class="form-grid">
      ${csField("Trạng thái *", csSelect('id="csHcStatus"', [["processing", "Đang xử lý"], ["done", "Đã giải quyết"]], c.status === "new" ? "processing" : c.status))}
      ${csField("Chuyển công ty xử lý", `<label style="display:flex;gap:8px;align-items:center;min-height:36px"><input type="checkbox" id="csHcForward" ${company ? "" : "disabled"}> ${company ? escapeHtml(company.name) : "Khu vực chưa có công ty"}</label>`)}
      ${csField("Kết quả / ghi chú xử lý *", `<textarea class="control" id="csHcResult" required>${escapeHtml(c.result)}</textarea>`, true)}
    </div>`}`, done ? "" : "Cập nhật");
  }
};

function csRequestCycle() { return { period: csFormValue("csReqPeriod") || csState.period }; }

// Đối tượng sẽ được lập khoản: đang cung cấp dịch vụ, có hợp đồng, thuộc tổ đã có công ty phụ trách,
// và chưa có khoản cùng loại phí trong kỳ (kỳ tháng/quý chồng nhau cũng tính là trùng).
function csRequestTargets(period, feeType, scopeType, checkedAreas, companyId) {
  const months = csIsQuarter(period) ? csQuarterMonths(period) : [period];
  const picked = scopeType === "all" ? MANAGEMENT_AREAS.map(a => a.id) : scopeType === "area" ? checkedAreas || [] : MANAGEMENT_AREAS.filter(a => a.unit === companyId).map(a => a.id);
  const unassignedAreas = picked.filter(id => !csArea(id)?.unit);
  const areaIds = picked.filter(id => csArea(id)?.unit);
  const candidates = CS_SUBJECTS.filter(s => s.status === "active" && s.contract !== "—" && areaIds.includes(s.area));
  const overlaps = c => (c.feeType || "env") === feeType && (c.period === period || months.includes(c.period) || (csIsQuarter(c.period) && csQuarterMonths(c.period).some(m => months.includes(m))));
  const taken = new Map();
  CS_CHARGES.filter(overlaps).forEach(c => { if (!taken.has(c.subject)) taken.set(c.subject, c.request); });
  return {
    areaIds, unassignedAreas, candidates,
    alreadyBilled: candidates.filter(s => taken.has(s.code)).map(s => ({ subject: s, request: taken.get(s.code) })),
    newTargets: candidates.filter(s => !taken.has(s.code))
  };
}

function csRequestPreview() {
  const preview = document.getElementById("csReqPreview");
  if (!preview) return;
  const { period } = csRequestCycle();
  const feeType = csFormValue("csReqFeeType") || "env";
  const fee = csFeeType(feeType);
  const scopeType = csFormValue("csReqScopeType") || "all";
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.hidden = !on; };
  show("csReqAreaWrap", scopeType === "area");
  show("csReqCompanyWrap", scopeType === "company");
  show("csReqPriceWrap", feeType !== "env");
  const priceInput = document.getElementById("csReqPrice");
  if (priceInput && priceInput.dataset.feeType !== feeType) { priceInput.dataset.feeType = feeType; priceInput.value = fee.price ?? ""; }
  const price = Number(csFormValue("csReqPrice")) || 0;
  const due = document.getElementById("csReqDue");
  if (due && csState.reqDueFor !== period) { csState.reqDueFor = period; due.value = csPeriodDue(period); }

  const checkedAreas = [...document.querySelectorAll('input[name="csReqAreaCheck"]:checked')].map(cb => cb.value);
  const counter = document.getElementById("csReqAreaCounter");
  if (counter) counter.textContent = `Đã chọn ${checkedAreas.length}/${MANAGEMENT_AREAS.length} tổ`;
  const companyId = csFormValue("csReqCompanySelect");
  const info = document.getElementById("csReqCompanyAreasInfo");
  if (info) { const list = MANAGEMENT_AREAS.filter(a => a.unit === companyId); info.textContent = list.length ? `${list.length} tổ · ${list.map(a => csAreaName(a.id)).join(", ")}` : "Công ty chưa được giao tổ nào."; }

  const { unassignedAreas, candidates, alreadyBilled, newTargets } = csRequestTargets(period, feeType, scopeType, checkedAreas, companyId);
  const exempt = newTargets.filter(s => s.exempt);
  const payable = newTargets.filter(s => !s.exempt);
  const amountOf = s => s.exempt ? 0 : csChargeAmount(s, period, feeType, price);
  const total = payable.reduce((t, s) => t + amountOf(s), 0);
  const noArea = scopeType === "area" && !checkedAreas.length;
  const noPrice = feeType !== "env" && price <= 0;
  const confirm = document.getElementById("dialogConfirm");
  if (confirm) {
    confirm.disabled = noArea || noPrice || !newTargets.length;
    confirm.textContent = noArea ? "Chọn tổ dân phố" : noPrice ? "Nhập đơn giá" : newTargets.length ? `Lập phiếu · ${newTargets.length} đối tượng` : "Không còn đối tượng";
  }
  const item = (s, extra) => `<li><span>${escapeHtml(s.name)}</span><small>${s.code} · ${csAreaName(s.area)} · ${extra}</small></li>`;
  preview.innerHTML = `<div class="req-preview">
    <div class="dialog-summary">
      <div><span>Trong phạm vi</span><strong>${candidates.length} đối tượng</strong></div>
      <div><span>Đã có khoản kỳ ${csPeriodLabel(period)}</span><strong class="${alreadyBilled.length ? "text-warning" : ""}">${alreadyBilled.length} bỏ qua</strong></div>
      <div><span>Sẽ lập mới</span><strong class="text-brand">${newTargets.length} · ${formatMoney(total)}</strong></div>
    </div>
    <p class="form-help">${escapeHtml(fee.name)} · ${payable.length} hộ/cơ sở cần thu · ${exempt.length} hộ miễn giảm lập 0đ${feeType !== "env" ? ` · đơn giá ${formatMoney(price)}` : ""}.</p>
    ${unassignedAreas.length ? `<p class="callout warning">${unassignedAreas.length} tổ chưa có công ty phụ trách (${unassignedAreas.map(csAreaName).join(", ")}) bị bỏ qua. Phân công tại Công ty môi trường trước khi lập.</p>` : ""}
    ${noArea ? '<p class="callout warning">Chọn ít nhất một tổ dân phố.</p>' : !newTargets.length && candidates.length ? `<p class="callout danger">Toàn bộ ${candidates.length} đối tượng đã có khoản ${escapeHtml(fee.name)} kỳ ${csPeriodLabel(period)}. Không phát hành trùng.</p>` : ""}
    ${newTargets.length ? `<details class="req-list"><summary>Danh sách sẽ lập (${newTargets.length})</summary><ul>${newTargets.map(s => item(s, s.exempt ? "miễn giảm 0đ" : formatMoney(amountOf(s)))).join("")}</ul></details>` : ""}
    ${alreadyBilled.length ? `<details class="req-list"><summary>Bỏ qua vì đã có khoản (${alreadyBilled.length})</summary><ul>${alreadyBilled.map(({ subject, request }) => item(subject, `đã lập tại ${request}`)).join("")}</ul></details>` : ""}
  </div>`;
}

function csRcUpdateBalance() {
  const companyId = csFormValue("csRcCompanyId");
  const period = csFormValue("csRcPeriod") || csState.period;
  const company = csUnit(companyId);
  const payer = document.getElementById("csRcPayer");
  if (payer && !payer.dataset.userEdited && company) payer.value = company.contact || "";
  const areas = csCompanyAreas(companyId);
  const due = csCompanyDue(companyId, period);
  const received = csCompanyReceived(companyId, period);
  const remaining = due - received;
  const amountInput = document.getElementById("csRcAmount");
  if (amountInput && !amountInput.dataset.userEdited) { amountInput.value = remaining > 0 ? remaining : ""; amountInput.max = Math.max(remaining, 0); }
  const amount = Number(amountInput?.value) || 0;
  const error = remaining <= 0 ? "Công ty đã nộp đủ kỳ này. Chọn kỳ khác hoặc kiểm tra lại phiếu thu đã lập."
    : amount > remaining ? `Vượt số còn phải nộp ${formatMoney(amount - remaining)}. Nhập tối đa ${formatMoney(remaining)}.` : "";
  const confirm = document.getElementById("dialogConfirm");
  if (confirm) confirm.disabled = Boolean(error) || amount <= 0;
  const note = error ? `<p class="callout danger">${error}</p>`
    : amount && amount < remaining ? `<p class="callout warning">Nộp một phần: sau đợt này còn phải nộp ${formatMoney(remaining - amount)}.</p>`
    : amount ? `<p class="callout">Nộp đủ số còn lại của kỳ ${csPeriodLabel(period)}.</p>` : "";
  const box = document.getElementById("csRcBalanceBox");
  if (box) box.innerHTML = `<div class="dialog-summary">
      <div><span>Phải thu kỳ ${csPeriodLabel(period)}</span><strong>${formatMoney(due)}</strong><small>${areas.length} tổ · ${areas.reduce((t, a) => t + a.households, 0).toLocaleString("vi-VN")} hộ</small></div>
      <div><span>Đã nộp</span><strong class="text-success">${formatMoney(received)}</strong><small>${csCompanyReceipts(companyId, period).length} phiếu thu</small></div>
      <div><span>Còn phải nộp</span><strong class="${remaining > 0 ? "text-warning" : ""}">${formatMoney(Math.max(remaining, 0))}</strong></div>
    </div>${note}`;
}

function csAssignLive() {
  const checked = [...document.querySelectorAll("[data-cs-area]:checked")].map(i => i.dataset.csArea);
  const onlyFree = document.getElementById("csAsOnlyFree")?.checked;
  document.querySelectorAll("[data-cs-area]").forEach(input => { input.closest("tr").hidden = Boolean(onlyFree && csArea(input.dataset.csArea)?.unit); });
  const start = csFormValue("csAsStart"), end = csFormValue("csAsEnd");
  const handover = checked.filter(id => csArea(id)?.unit).length;
  const error = !checked.length ? "Chọn ít nhất một khu vực." : !start || !end || end < start ? "Ngày kết thúc phải sau ngày bắt đầu." : "";
  const count = document.getElementById("csAsCount");
  if (count) count.textContent = `Đã chọn ${checked.length} khu vực · ${checked.reduce((t, id) => t + (csArea(id)?.households || 0), 0)} hộ`;
  const live = document.getElementById("csAsLive");
  if (live) { live.textContent = error || `${checked.length} khu vực sẽ thuộc công ty này từ ${csIsoToVi(start)} đến ${csIsoToVi(end)}${handover ? ` · ${handover} khu vực bàn giao từ công ty khác` : ""}.`; live.classList.toggle("is-error", Boolean(error)); }
  document.getElementById("dialogConfirm").disabled = Boolean(error);
}

// ---------- Ghi nhận thao tác ----------
function handleCommuneSimpleSubmit() {
  if (activeDialogAction !== "cs" || !csState.dialog) return false;
  const form = document.getElementById("dialogForm");
  if (!form.reportValidity()) return true;
  const { kind, id } = csState.dialog;
  let message = "";
  if (kind === "subject") {
    const data = { name: csFormValue("csSubName"), type: csFormValue("csSubType"), address: csFormValue("csSubAddress"), phone: csFormValue("csSubPhone"), area: csFormValue("csSubArea"), tariff: csFormValue("csSubTariff"), contract: csFormValue("csSubContract") || "—", contractFrom: csIsoToVi(csFormValue("csSubFrom")), status: csFormValue("csSubStatus") };
    const existing = csSubject(id);
    if (existing) { Object.assign(existing, data); message = `Đã cập nhật ${id}.`; }
    else {
      const prefix = data.type === "Hộ gia đình" ? "H" : data.type === "Hộ kinh doanh" ? "KD" : "DN";
      const code = `DTH-${prefix}9${String(csState.seq.subject++).padStart(4, "0")}`;
      CS_SUBJECTS.unshift({ code, ...data, note: data.contract === "—" ? "Chưa có hợp đồng" : "" });
      message = `Đã thêm đối tượng ${code}.`;
    }
  } else if (kind === "chargeRequest") {
    const { period } = csRequestCycle();
    const feeType = csFormValue("csReqFeeType") || "env";
    const price = Number(csFormValue("csReqPrice")) || 0;
    const scopeType = csFormValue("csReqScopeType") || "all";
    const checkedAreas = [...document.querySelectorAll('input[name="csReqAreaCheck"]:checked')].map(cb => cb.value);
    const companyId = csFormValue("csReqCompanySelect");
    const { areaIds, alreadyBilled, newTargets } = csRequestTargets(period, feeType, scopeType, checkedAreas, companyId);
    if (!newTargets.length) { showDemoNotice("Không có đối tượng mới để lập: tất cả đã có khoản thu cùng loại phí trong kỳ."); return true; }
    const due = csIsoToVi(csFormValue("csReqDue"));
    const tag = csIsQuarter(period) ? `Q${period.split("-Q")[1]}${period.slice(2, 4)}` : `${period.slice(5)}${period.slice(2, 4)}`;
    const request = `YCT-${tag}-${String(CS_REQUESTS.filter(r => r.period === period).length + 1).padStart(2, "0")}`;
    let exemptCount = 0, total = 0;
    newTargets.forEach(s => {
      const amount = s.exempt ? 0 : csChargeAmount(s, period, feeType, price);
      if (s.exempt) exemptCount++;
      total += amount;
      CS_CHARGES.unshift({ id: `KT-${tag}-${s.code.split("-")[1]}${feeType === "env" ? "" : `-${feeType.slice(0, 2).toUpperCase()}`}`, request, feeType, subject: s.code, period, due, amount, status: s.exempt ? "exempt" : "unpaid" });
    });
    const areaList = areaIds.length > 6 ? `${areaIds.slice(0, 5).map(csAreaName).join(", ")} +${areaIds.length - 5} tổ` : areaIds.map(csAreaName).join(", ");
    const scope = scopeType === "all" ? `Toàn xã · ${areaIds.length} tổ` : scopeType === "area" ? `${areaIds.length} tổ · ${areaList}` : `${csUnit(companyId)?.name || companyId} · ${areaIds.length} tổ`;
    CS_REQUESTS.unshift({ id: request, period, feeType, scope, date: csIsoToVi(CS_TODAY), due, count: newTargets.length, exempt: exemptCount, total, note: csFormValue("csReqNote") });
    Object.assign(csState, { period, chargePeriod: period, chargesTab: "requests" });
    message = `Đã lập ${request}: ${newTargets.length} đối tượng, ${formatMoney(total)} (${exemptCount} miễn giảm; bỏ qua ${alreadyBilled.length} đã có khoản).`;
  } else if (kind === "receipt") {
    const companyId = csFormValue("csRcCompanyId");
    const period = csFormValue("csRcPeriod") || csState.period;
    const amount = Number(csFormValue("csRcAmount")) || 0;
    const remaining = csCompanyDue(companyId, period) - csCompanyReceived(companyId, period);
    if (amount <= 0 || amount > remaining) { showDemoNotice(`Số tiền phải lớn hơn 0 và không vượt ${formatMoney(Math.max(remaining, 0))} còn phải nộp của kỳ.`); return true; }
    const receipt = {
      id: `PT-CT-${period.slice(5)}${period.slice(2, 4)}-${String(CS_COMPANY_RECEIPTS.filter(r => r.period === period).length + 1).padStart(3, "0")}`,
      companyId, period, amount,
      method: csFormValue("csRcMethod") || "Chuyển khoản",
      date: csIsoToVi(csFormValue("csRcDate")) || csIsoToVi(CS_TODAY),
      payer: csFormValue("csRcPayer") || csUnit(companyId)?.contact || "Đại diện công ty",
      bankRef: csFormValue("csRcBankRef") || "—",
      note: csFormValue("csRcNote") || `Nộp tiền thu gom rác kỳ ${csPeriodLabel(period)}`,
      status: "completed"
    };
    CS_COMPANY_RECEIPTS.unshift(receipt);
    Object.assign(csState, { chargePeriod: period, chargesTab: "receipts" });
    const left = remaining - amount;
    message = `Đã lập ${receipt.id}: ${csUnit(companyId)?.name || companyId} nộp ${formatMoney(amount)} kỳ ${csPeriodLabel(period)}${left > 0 ? `, còn phải nộp ${formatMoney(left)}` : ", đã nộp đủ"}.`;
  } else if (kind === "viewReceipt") {
    message = "Đã mô phỏng gửi phiếu thu tới máy in.";
  } else if (kind === "company") {
    const data = {
      name: csFormValue("csCoName"),
      contact: csFormValue("csCoContact"),
      phone: csFormValue("csCoPhone"),
      status: csFormValue("csCoStatus"),
      start: csFormValue("csCoStart") || "2026-01-01",
      end: csFormValue("csCoEnd") || "2026-12-31"
    };
    const existing = csUnit(id);
    if (existing) { Object.assign(existing, data); message = "Đã cập nhật thông tin công ty."; }
    else { const newId = `DV${String(csState.seq.company++).padStart(2, "0")}`; MANAGEMENT_UNITS.push({ id: newId, ...data }); csState.companyId = newId; message = `Đã thêm công ty ${data.name} (Hiệu lực: ${csIsoToVi(data.start)} → ${csIsoToVi(data.end)}).`; closeDemoModal(); showScreen("company-detail"); showDemoNotice(message); return true; }
  } else if (kind === "assignAreas") {
    const checked = [...document.querySelectorAll("[data-cs-area]:checked")].map(i => i.dataset.csArea);
    if (!checked.length) return true;
    const start = csFormValue("csAsStart"), end = csFormValue("csAsEnd");
    checked.forEach(areaId => Object.assign(csArea(areaId), { unit: id, waste: id, payment: id, start, end, conflict: false }));
    message = `Đã phân công ${checked.length} khu vực cho ${csUnit(id)?.name}.`;
  } else if (kind === "assignSingleArea") {
    const unitId = csFormValue("csAsUnit");
    if (!unitId) { showDemoNotice("Bắt buộc phải chọn một công ty môi trường phụ trách!"); return true; }
    const start = csFormValue("csAsStart") || CS_TODAY;
    const end = csFormValue("csAsEnd") || "2026-12-31";
    const a = csArea(id);
    if (a) {
      Object.assign(a, { unit: unitId, waste: unitId, payment: unitId, start, end, conflict: false });
      const u = csUnit(unitId);
      message = `Đã phân công ${csAreaName(id)} cho ${u?.name || unitId}.`;
    }
  } else if (kind === "unassign") {
    const newUnitId = csFormValue("csUnTargetUnit");
    if (!newUnitId) { showDemoNotice("Bắt buộc phải chọn một công ty khác để tiếp nhận khu vực!"); return true; }
    const start = csFormValue("csUnStart") || CS_TODAY;
    const end = csFormValue("csUnEnd") || "2026-12-31";
    const oldUnit = csUnit(csArea(id)?.unit);
    const newUnit = csUnit(newUnitId);
    Object.assign(csArea(id), { unit: newUnitId, waste: newUnitId, payment: newUnitId, start, end, conflict: false });
    message = `Đã bàn giao ${csAreaName(id)} (${csArea(id)?.households.toLocaleString("vi-VN")} hộ) từ ${oldUnit?.name || ""} sang ${newUnit?.name}.`;
  } else if (kind === "remindDebt") {
    const debts = csCompanyDebts(id);
    CS_REMINDERS.unshift({ id: `NN-${String(CS_REMINDERS.length + 1).padStart(3, "0")}`, companyId: id, date: csIsoToVi(CS_TODAY), due: csIsoToVi(csFormValue("csRdDue")), periods: debts.map(d => d.label), amount: debts.reduce((t, d) => t + d.remaining, 0), content: csFormValue("csRdContent") });
    message = `Đã gửi nhắc nộp ${formatMoney(debts.reduce((t, d) => t + d.remaining, 0))} tới ${csUnit(id)?.name}.`;
  } else if (kind === "notify") {
    message = `Đã gửi nhắc tiến độ tới ${csUnit(id)?.name}.`;
  } else if (kind === "reconDetail") {
    message = `Đã gửi yêu cầu giải trình tới ${csUnit(id)?.name}.`;
  } else if (kind === "addComplaint") {
    const newId = `KN-2609-${String(csState.seq.complaint++).padStart(3, "0")}`;
    CS_COMPLAINTS.unshift({ id: newId, date: csIsoToVi(csFormValue("csCpDate")) || "17/09/2026", name: csFormValue("csCpName"), subject: csFormValue("csCpSubject") || "—", phone: csFormValue("csCpPhone"), area: csFormValue("csCpArea"), channel: csFormValue("csCpChannel"), content: csFormValue("csCpContent"), status: "new", result: "" });
    message = `Đã ghi nhận khiếu nại ${newId}.`;
  } else if (kind === "handleComplaint") {
    const c = CS_COMPLAINTS.find(x => x.id === id);
    if (c && c.status !== "done") {
      const forward = document.getElementById("csHcForward")?.checked;
      const company = csCompanyOf(c.area);
      // Chuyển công ty: gắn công ty tiếp nhận và hạn 3 ngày để trang Giải quyết khiếu nại của công ty nhận được.
      Object.assign(c, { status: csFormValue("csHcStatus"), result: `${forward ? `Chuyển ${company?.name} xử lý, hạn ${csDaysAfter(CS_TODAY, 3)}. ` : ""}${csFormValue("csHcResult")}` }, forward && company ? { forwardedTo: company.id, deadline: c.deadline || csDaysAfter(CS_TODAY, 3) } : {});
      message = `Đã cập nhật ${c.id}: ${CS_COMPLAINT_STATUS[c.status][0].toLowerCase()}.`;
    }
  }
  closeDemoModal();
  renderCurrentView();
  if (message) showDemoNotice(message);
  return true;
}

document.addEventListener("click", event => {
  if (currentRole !== "commune") return;
  const button = event.target.closest("[data-cs]");
  if (button) {
    const { cs: action, id } = button.dataset;
    if (action === "switchChargesTab") { csState.chargesTab = button.dataset.tab; renderCurrentView(); return; }
    if (action === "company") { csState.companyId = id; closeDemoModal(); showScreen("company-detail"); return; }
    if (action === "back" || action === "goCompanies") { closeDemoModal(); showScreen("companies"); return; }
    if (action === "progressCompany") { csState.company = id; renderCurrentView(); return; }
    if (action === "progressResetCompany") { csState.company = "all"; renderCurrentView(); return; }
    if (action === "progressAreaCharges") {
      // Từ Báo cáo tiến độ sang Khoản thu, giữ đúng kỳ, công ty và tổ đang xem.
      const [unitId, areaId] = (id || "").split(":");
      Object.assign(csState, { chargeFilterUnit: unitId || "all", chargeFilterArea: areaId || "all", chargePeriod: csState.period, chargesTab: "receivables", chargeFrom: "progress" });
      showScreen("charges");
      return;
    }
    if (action === "remindAll") {
      const list = MANAGEMENT_UNITS.map(u => ({ u, debts: csCompanyDebts(u.id) })).filter(d => d.debts.length);
      list.forEach(({ u, debts }) => CS_REMINDERS.unshift({ id: `NN-${String(CS_REMINDERS.length + 1).padStart(3, "0")}`, companyId: u.id, date: csIsoToVi(CS_TODAY), due: csDaysAfter(CS_TODAY, 5), periods: debts.map(d => d.label), amount: debts.reduce((t, d) => t + d.remaining, 0), content: `UBND xã đề nghị ${u.name} nộp số tiền thu gom rác còn nợ ${formatMoney(debts.reduce((t, d) => t + d.remaining, 0))} (${debts.map(d => d.label).join(", ")}) về ngân sách xã trước ngày ${csDaysAfter(CS_TODAY, 5)}.` }));
      renderCurrentView();
      showDemoNotice(`Đã gửi nhắc nộp tới ${list.length} công ty còn nợ kỳ đã hết hạn.`);
      return;
    }
    if (action === "clearChargeFilters") { Object.assign(csState, { chargeFilterUnit: "all", chargeFilterArea: "all", chargeFrom: null }); renderCurrentView(); return; }
    if (action === "backToProgress") { showScreen("progress"); return; }
    if (CS_DIALOGS[action]) CS_DIALOGS[action](id);
    return;
  }
  if (event.target.id === "csReqSelectAllAreas" || event.target.id === "csReqDeselectAllAreas") {
    const on = event.target.id === "csReqSelectAllAreas";
    document.querySelectorAll('input[name="csReqAreaCheck"]').forEach(cb => { cb.checked = on; });
    csRequestPreview();
  }
});

document.addEventListener("change", event => {
  if (currentRole !== "commune") return;
  if (event.target.matches("[data-cs-filter]")) {
    const key = event.target.dataset.csFilter;
    csState[key] = event.target.value;
    // Kỳ chọn ở Khoản thu cũng là kỳ đang xem của các trang khác.
    if (key === "chargePeriod" && event.target.value !== "all") csState.period = event.target.value;
    renderCurrentView({ keepFocus: true });
    return;
  }
  if (!event.target.closest("#dialogBody")) return;
  const kind = csState.dialog?.kind;
  if (kind === "assignAreas") csAssignLive();
  if (kind === "chargeRequest") csRequestPreview();
  if (kind === "receipt") {
    if (event.target.id === "csRcCompanyId" || event.target.id === "csRcPeriod") {
      ["csRcAmount", "csRcPayer"].forEach(id => { const el = document.getElementById(id); if (el) delete el.dataset.userEdited; });
    }
    csRcUpdateBalance();
  }
});

document.addEventListener("input", event => {
  if (currentRole !== "commune") return;
  const kind = csState.dialog?.kind;
  if (kind === "receipt" && (event.target.id === "csRcAmount" || event.target.id === "csRcPayer")) {
    event.target.dataset.userEdited = "true";
    if (event.target.id === "csRcAmount") csRcUpdateBalance();
  }
  if (kind === "chargeRequest" && event.target.id === "csReqPrice") csRequestPreview();
});
