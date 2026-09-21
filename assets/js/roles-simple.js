"use strict";

// v3.1 — Rút gọn ba không gian: Công ty (2 màn), Người đi thu (1 màn), Quản trị hệ thống (3 màn).
// Công ty không kê khai tiền nộp: xã lập phiếu thu mỗi lần công ty nộp, công ty chỉ xem và báo sai sót.
// Dùng chung csDialog / csField / csSelect từ commune-simple.js. Thao tác cập nhật trong phiên xem.

Object.assign(ROLE_CONFIG, {
  company: {
    label: "Công ty môi trường", initials: "CT", description: "Công ty MTĐT Đông Thạnh · thu tiền hộ và nộp về xã", defaultScreen: "assigned",
    screens: [
      { id: "assigned", group: "", label: "Hộ được giao", caption: "Phải thu, người thu, phiếu thu xã lập", icon: "households", view: "rsCompanyAssigned" },
      { id: "complaints", group: "", label: "Giải quyết khiếu nại", caption: "Khiếu nại xã chuyển công ty xử lý", icon: "message", view: "rsCompanyComplaints" }
    ]
  },
  collector: {
    label: "Người đi thu", initials: "NT", description: "Nguyễn Thành Long · Công ty MTĐT Đông Thạnh", defaultScreen: "households",
    screens: [{ id: "households", group: "", label: "Danh sách hộ đi thu", caption: "Cập nhật kết quả từng hộ", icon: "clipboard", view: "rsCollectorList" }]
  },
  administrator: {
    label: "Quản trị hệ thống", initials: "QT", description: "Tài khoản, cấu hình và nhật ký", defaultScreen: "accounts",
    screens: [
      { id: "accounts", group: "", label: "Tài khoản & phân quyền", caption: "Người dùng, vai trò, phạm vi", icon: "shield", view: "rsAccounts" },
      { id: "config", group: "", label: "Cấu hình nghiệp vụ", caption: "Địa bàn & đơn vị, biểu giá, kỳ thu", icon: "tag", view: "rsConfig" },
      { id: "logs", group: "", label: "Nhật ký & sao lưu", caption: "Audit và bản sao lưu", icon: "clock", view: "rsLogs" }
    ]
  }
});
["company", "collector", "administrator"].forEach(roleId => {
  Object.keys(SCREEN_INDEX).filter(key => key.startsWith(`${roleId}:`)).forEach(key => delete SCREEN_INDEX[key]);
  ROLE_CONFIG[roleId].screens.forEach(screen => { SCREEN_INDEX[`${roleId}:${screen.id}`] = { ...screen, roleId }; });
});
// Bỏ vai trò Kế toán và Lãnh đạo khỏi prototype hiện hành.
["accountant", "leader"].forEach(roleId => {
  delete ROLE_CONFIG[roleId];
  Object.keys(SCREEN_INDEX).filter(key => key.startsWith(`${roleId}:`)).forEach(key => delete SCREEN_INDEX[key]);
  const index = ROLE_ORDER.indexOf(roleId);
  if (index >= 0) ROLE_ORDER.splice(index, 1);
});

// ---------- Dữ liệu ----------
var rsCurrentCompanyId = "DV01";
var RS_COMPANY = MANAGEMENT_UNITS[0];
const RS_STATUS = { unpaid: ["Chưa thu", "warning"], overdue: ["Quá hạn", "danger"], appointment: ["Đã hẹn", "info"], absent: ["Vắng nhà", "warning"], paid: ["Đã thu", "success"] };
const rsSum = list => list.reduce((t, r) => t + r.amount, 0);
const rsDateKey = d => (d || "").split("/").reverse().join("");
const rsTag = period => `${period.slice(0, 2)}${period.slice(-2)}`;
// Tài khoản người đi thu của công ty; mỗi khu vực một tài khoản phụ trách.
var RS_COLLECTORS = [
  { username: "nguyenthanhlong", name: "Nguyễn Thành Long", area: "Tổ 07", phone: "0903 218 665" },
  { username: "levantai", name: "Lê Văn Tài", area: "Tổ 09", phone: "0908 331 774" }
];
var RS_COMPANY_ACCOUNT = { username: "congty.dongthanh", name: "Trần Hoàng Phúc" };
const rsCollector = username => RS_COLLECTORS.find(c => c.username === username) || (username === RS_COMPANY_ACCOUNT.username ? { ...RS_COMPANY_ACCOUNT, area: "Công ty" } : null);
const rsCollectorOf = area => RS_COLLECTORS.find(c => c.area === area) || RS_COLLECTORS[0];

function rsUpdateCollectorsForCompany(company) {
  const areas = csCompanyAreas(company.id);
  if (company.id === "DV01") {
    RS_COLLECTORS = [
      { username: "nguyenthanhlong", name: "Nguyễn Thành Long", area: "Tổ 07", phone: "0903 218 665" },
      { username: "levantai", name: "Lê Văn Tài", area: "Tổ 09", phone: "0908 331 774" }
    ];
    RS_ME = RS_COLLECTORS[0];
    return;
  }
  const collectorNames = ["Trần Văn Nam", "Nguyễn Văn Hùng", "Lê Thị Thảo", "Võ Minh Trí", "Phạm Quốc Dũng", "Hoàng Kim Ngân"];
  if (!areas.length) {
    RS_COLLECTORS = [{
      username: `nvthu_${company.id.toLowerCase()}_1`,
      name: `Nhân viên thu · ${company.contact?.split(" ").pop() || "Phụ trách"}`,
      area: "Chưa phân tổ",
      phone: company.phone || "0900 000 000"
    }];
  } else {
    RS_COLLECTORS = areas.map((a, idx) => ({
      username: `nvthu_${company.id.toLowerCase()}_${idx + 1}`,
      name: collectorNames[idx % collectorNames.length],
      area: csAreaName(a.id),
      phone: `090${String(company.id.slice(-2))}${String(idx + 1).padStart(2, "0")} 888`
    }));
  }
  RS_ME = RS_COLLECTORS[0];
}

function rsSetCompany(id) {
  const u = csUnit(id) || MANAGEMENT_UNITS.find(x => x.id === id) || MANAGEMENT_UNITS[0];
  rsCurrentCompanyId = u.id;
  RS_COMPANY = u;
  if (ROLE_CONFIG.company) {
    ROLE_CONFIG.company.description = `${u.name} · thu tiền hộ và nộp về xã`;
  }
  const userAcc = RS_USERS.find(x => x.roles === "Công ty môi trường" && x.organization === u.name);
  if (userAcc) {
    RS_COMPANY_ACCOUNT = { username: userAcc.username, name: userAcc.name };
  } else {
    RS_COMPANY_ACCOUNT = { username: `congty.${u.id.toLowerCase()}`, name: u.contact || "Đại diện công ty" };
  }
  rsUpdateCollectorsForCompany(u);
  if (ROLE_CONFIG.collector) {
    ROLE_CONFIG.collector.description = `${RS_ME.name} · ${u.name}`;
  }
  RS_ROW_CACHE.clear();
}
// Kết quả đã xác nhận thu: tài khoản nào xác nhận, hình thức, ngày — khóa theo mã hộ|kỳ.
const RS_CONFIRMED = {
  "DTH-H000142|09/2026": ["nguyenthanhlong", "Chuyển khoản", "12/09/2026"],
  "DTH-H000149|09/2026": ["nguyenthanhlong", "Tiền mặt", "12/09/2026"],
  "DTH-H000133|09/2026": ["nguyenthanhlong", "Tiền mặt", "14/09/2026"],
  "DTH-KD00077|09/2026": ["nguyenthanhlong", "Chuyển khoản", "12/09/2026"],
  "DTH-H000224|09/2026": ["levantai", "Chuyển khoản", "11/09/2026"],
  "DTH-H000216|09/2026": ["levantai", "Tiền mặt", "15/09/2026"],
  "DTH-H000221|09/2026": ["levantai", "Tiền mặt", "16/09/2026"],
  "DTH-H000142|08/2026": ["nguyenthanhlong", "Tiền mặt", "20/08/2026"],
  "DTH-H000149|08/2026": ["nguyenthanhlong", "Chuyển khoản", "22/08/2026"],
  "DTH-H000133|08/2026": ["nguyenthanhlong", "Tiền mặt", "20/08/2026"],
  "DTH-KD00077|08/2026": ["nguyenthanhlong", "Chuyển khoản", "18/08/2026"],
  "DTH-H000224|08/2026": ["levantai", "Tiền mặt", "21/08/2026"],
  "DTH-H000216|08/2026": ["levantai", "Chuyển khoản", "22/08/2026"],
  "DTH-H000221|08/2026": ["levantai", "Tiền mặt", "21/08/2026"],
  "DTH-H000229|08/2026": ["levantai", "Tiền mặt", "25/08/2026"],
  "DTH-H000152|09/2026": ["nguyenthanhlong", "Chuyển khoản", "13/09/2026"],
  "DTH-H000138|08/2026": ["nguyenthanhlong", "Tiền mặt", "19/08/2026"],
  "DTH-H000152|08/2026": ["nguyenthanhlong", "Chuyển khoản", "23/08/2026"]
};
// Biên lai điện tử xuất tự động khi người thu xác nhận đã thanh toán; không nhập số thủ công.
let rsReceiptSeq = 3901;
const rsNextReceipt = period => `BL-${rsTag(period)}-${String(rsReceiptSeq++).padStart(4, "0")}`;
// Kết quả ghé hộ chưa thu (kỳ hiện tại) — khóa theo mã hộ|kỳ.
const RS_VISITS = {
  "DTH-H000128|09/2026": ["", "Cách vị trí hiện tại 120 m"],
  "DTH-H000131|09/2026": ["", "Đã hẹn thu lại hôm nay"],
  "DTH-H000136|09/2026": ["absent", "Để giấy báo lúc 09:15 · quay lại 15/09"],
  "DTH-H000145|09/2026": ["appointment", "Hẹn 18/09 sau 18:00"],
  "DTH-H000157|09/2026": ["", "Gọi 2 lần chưa liên hệ được"],
  "DTH-H000163|09/2026": ["appointment", "Hộ đề nghị quay lại sau 18:00"],
  "DTH-H000171|09/2026": ["", "Điểm cuối tuyến · cách 1,2 km"],
  "DTH-H000218|09/2026": ["", "Gọi 1 lần chưa nghe máy"]
};
const rsPeriodTitle = p => p.startsWith("Q") ? `Quý ${p[1]}/${p.slice(3)}` : `Tháng ${p}`;
// Một dòng = một hộ – một kỳ, dựng từ khoản thu của xã (CS_CHARGES) cho các tổ công ty phụ trách:
// xã lập phiếu yêu cầu thu kỳ mới là công ty và người đi thu thấy ngay. Dòng được giữ trong phiên để lưu kết quả thu.
const RS_ROW_CACHE = new Map();
function rsRows() {
  const areas = MANAGEMENT_AREAS.filter(a => a.unit === RS_COMPANY.id).map(a => a.id);
  return CS_CHARGES.filter(c => c.status !== "exempt" && areas.includes(csSubject(c.subject)?.area)).map(c => {
    let r = RS_ROW_CACHE.get(c.id);
    if (!r) {
      const s = csSubject(c.subject);
      const period = csPeriodLabel(c.period);
      const area = csAreaName(s.area);
      const collector = rsCollectorOf(area).username;
      const paid = c.status === "paid";
      const [visit, note] = RS_VISITS[`${s.code}|${period}`] || ["", ""];
      const [confirmedBy] = RS_CONFIRMED[`${s.code}|${period}`] || [];
      r = { src: c, code: s.code, name: s.name, phone: s.phone, address: s.address, area, kind: s.type === "Hộ gia đình" ? "household" : "business", period, iso: c.period, dueDate: c.due, amount: c.amount, status: paid ? "paid" : visit || c.status, note: paid ? "" : note, charge: c.id, request: c.request, collector, confirmedBy: paid ? confirmedBy || collector : "", method: paid ? c.method || "Tiền mặt" : "", confirmedAt: paid ? c.paidAt || "12/09/2026" : "", receipt: paid ? rsNextReceipt(period) : "" };
      RS_ROW_CACHE.set(c.id, r);
    }
    return r;
  }).sort((a, b) => a.iso.localeCompare(b.iso) || a.code.localeCompare(b.code));
}
// Người thu xác nhận đã thu → khoản thu của xã chuyển Đã thu (cùng một nguồn dữ liệu).
const rsCommitPaid = r => Object.assign(r.src, { status: "paid", amount: r.amount, method: r.method, paidAt: r.confirmedAt });
const rsStreet = address => address.replace(/^[\d/]+\s*/, "").trim();
// Phiếu thu do xã lập mỗi lần công ty nộp tiền: dùng chung CS_COMPANY_RECEIPTS với không gian xã. Công ty chỉ xem; sai thì báo lại xã.
const RS_RECEIPT_ISSUES = {};
const rsReceipts = () => CS_COMPANY_RECEIPTS.filter(r => r.companyId === RS_COMPANY.id).map(r => ({ id: r.id, period: csPeriodLabel(r.period), date: r.date, method: r.method, ref: r.bankRef, amount: r.amount, by: "Nguyễn Thu Hà", status: RS_RECEIPT_ISSUES[r.id] ? "issue" : "recorded", issue: RS_RECEIPT_ISSUES[r.id] || "" }));
const RS_RECEIPT_STATUS = { recorded: ["Xã đã ghi nhận", "success"], issue: ["Đã báo sai sót · chờ xã kiểm tra", "warning"] };
// Tiền mặt người đi thu đã nộp về công ty. Chuyển khoản vào thẳng tài khoản công ty nên không cần bàn giao.
const RS_HANDOVERS = [
  { id: "BG-0826-01", collector: "nguyenthanhlong", period: "08/2026", date: "26/08/2026", amount: 200000, note: "Bàn giao cuối kỳ" },
  { id: "BG-0826-02", collector: "levantai", period: "08/2026", date: "27/08/2026", amount: 200000, note: "Bàn giao cuối kỳ" },
  { id: "BG-0926-01", collector: "nguyenthanhlong", period: "09/2026", date: "12/09/2026", amount: 80000, note: "Cuối ca 12/09" }
];
const rsCashHeld = (username, period) => rsSum(rsRows().filter(r => r.period === period && r.status === "paid" && r.confirmedBy === username && r.method === "Tiền mặt")) - rsSum(RS_HANDOVERS.filter(h => h.collector === username && h.period === period));
// Khiếu nại thuộc khu vực công ty phụ trách (KV12, KV23 → DV01) — dùng chung danh sách với xã.
const RS_COMPLAINT_STATUS = { new: ["Chờ tiếp nhận", "warning"], processing: ["Đang xử lý", "info"], done: ["Đã giải quyết", "success"] };
CS_COMPLAINTS.push(
  { id: "KN-2609-012", date: "15/09/2026", name: "Trần Thị Ánh", subject: "DTH-H000131", phone: "0937 550 131", area: "KV12", channel: "Điện thoại", content: "Bị báo nợ 2 kỳ nhưng đã nộp kỳ 08/2026 tiền mặt cho người đi thu.", status: "processing", result: "Chuyển Công ty MTĐT Đông Thạnh xử lý, hạn 19/09.", forwardedTo: "DV01", deadline: "19/09/2026" },
  { id: "KN-2609-010", date: "13/09/2026", name: "Đỗ Thị Hạnh", subject: "DTH-H000157", phone: "0968 220 034", area: "KV12", channel: "Ứng dụng người dân", content: "Xe thu gom bỏ tuyến Đặng Thúc Vịnh 2 ngày, rác ứ đọng trước nhà.", status: "processing", result: "Chuyển Công ty MTĐT Đông Thạnh xử lý, hạn 16/09.", forwardedTo: "DV01", deadline: "16/09/2026" },
  { id: "KN-2609-007", date: "10/09/2026", name: "Mai Thị Thu", subject: "DTH-H000218", phone: "0938 100 187", area: "KV23", channel: "Trực tiếp tại xã", content: "Hộ chỉ có 2 người nhưng bị thu mức 80.000đ/kỳ.", status: "new", result: "", deadline: "17/09/2026" },
  { id: "KN-2609-005", date: "08/09/2026", name: "Bùi Quang Vinh", subject: "DTH-H000224", phone: "0978 216 630", area: "KV23", channel: "Ứng dụng người dân", content: "Đã chuyển khoản nhưng ứng dụng vẫn hiển thị chưa thu.", status: "done", result: "Công ty: đã đối chiếu sao kê, xác nhận thu 11/09 và cập nhật ứng dụng.", forwardedTo: "DV01", deadline: "15/09/2026", reply: { by: "levantai", date: "11/09/2026" } }
);
CS_COMPLAINTS.sort((a, b) => rsDateKey(b.date).localeCompare(rsDateKey(a.date)) || b.id.localeCompare(a.id));
const rsCompanyComplaintList = () => CS_COMPLAINTS.filter(c => c.forwardedTo === RS_COMPANY.id || csArea(c.area)?.unit === RS_COMPANY.id);
var RS_ME = RS_COLLECTORS[0]; // Tài khoản người đi thu đang đăng nhập trong prototype.
const RS_USERS = [
  ...APP_DATA.users.map(u => ({ ...u })),
  { username: "levantai", name: "Lê Văn Tài", organization: "Công ty MTĐT Đông Thạnh", roles: "Người đi thu", lastLogin: "16/09 · 07:05", status: "Hoạt động" },
  { username: "congty.dongthanh", name: "Trần Hoàng Phúc", organization: "Công ty MTĐT Đông Thạnh", roles: "Công ty môi trường", lastLogin: "15/09 · 08:40", status: "Hoạt động" }
].map(u => ({ ...u, roles: u.roles === "Công ty thu gom" ? "Công ty môi trường" : u.roles === "Nhân viên thu của công ty" ? "Người đi thu" : u.roles === "Quản trị" ? "Quản trị hệ thống" : u.roles }));
const RS_ROLES = [
  { name: "Cán bộ xã", scope: "Toàn xã", functions: "Đối tượng, khoản thu, khu vực, công ty, tiến độ, đối soát, khiếu nại", perms: { view: true, edit: true, approve: false, export: true } },
  { name: "Công ty môi trường", scope: "Đúng một công ty", functions: "Hộ được giao, kết quả thu theo người thu, xem phiếu thu xã lập, giải quyết khiếu nại", perms: { view: true, edit: true, approve: false, export: true } },
  { name: "Người đi thu", scope: "Hộ công ty giao", functions: "Danh sách hộ đi thu, cập nhật kết quả", perms: { view: true, edit: true, approve: false, export: false } },
  { name: "Kế toán", scope: "Toàn xã", functions: "Sao kê, phiếu thu, đối soát, khóa sổ", perms: { view: true, edit: true, approve: false, export: true } },
  { name: "Lãnh đạo", scope: "Toàn xã", functions: "Dashboard, phê duyệt, xác nhận báo cáo", perms: { view: true, edit: false, approve: true, export: true } },
  { name: "Quản trị hệ thống", scope: "Hệ thống", functions: "Tài khoản, cấu hình, nhật ký", perms: { view: true, edit: true, approve: false, export: true } }
];
const RS_DISTRICTS = [
  { code: "DTH", name: "Đông Thạnh", groups: 8, subjects: 18942, note: "Ánh xạ từ xã Đông Thạnh cũ" },
  { code: "TTT", name: "Thới Tam Thôn", groups: 8, subjects: 17416, note: "Ánh xạ từ xã Thới Tam Thôn cũ" },
  { code: "NB", name: "Nhị Bình", groups: 8, subjects: 13926, note: "Ánh xạ từ xã Nhị Bình cũ" }
];
const RS_TARIFFS = APP_DATA.tariffVersions.map(t => ({ ...t }));
const RS_BACKUPS = [
  { id: "backup-20260917-0830", time: "17/09/2026 08:30", type: "Tự động · đầy đủ", size: "1,8 GB", check: "Checksum OK", status: "Thành công" },
  { id: "backup-20260916-0830", time: "16/09/2026 08:30", type: "Tự động · đầy đủ", size: "1,8 GB", check: "Checksum OK", status: "Thành công" },
  { id: "backup-20260915-1420", time: "15/09/2026 14:20", type: "Thủ công · cấu hình", size: "24 MB", check: "Đã kiểm tra phục hồi 15/09", status: "Thành công" }
];
const rsState = { period: "09/2026", seq: { handover: 2, user: 1, tariff: 1, backup: 1 } };
const rsBtn = (label, action, id = "", tone = "secondary", small = false) => `<button type="button" class="button button-${tone}${small ? " button-small" : ""}" data-rs="${action}"${id ? ` data-id="${id}"` : ""}>${label}</button>`;
const rsToday = "17/09/2026";

// ---------- Công ty: Hộ được giao ----------
function rsCompanyAssigned() {
  const periods = [...new Set(rsRows().map(r => r.period))].sort((a, b) => b.slice(3).localeCompare(a.slice(3)) || b.localeCompare(a));
  const current = rsRows().filter(r => r.period === rsState.period);
  const paid = current.filter(r => r.status === "paid");
  const receipts = rsReceipts().filter(r => r.period === rsState.period);
  // Phải thu / đã thu cấp công ty cùng nguồn với xã (số hộ × đơn giá theo tổ); danh sách hộ bên dưới là dữ liệu mẫu.
  const isoPeriod = `${rsState.period.slice(3)}-${rsState.period.slice(0, 2)}`;
  const companyAreas = csCompanyAreas(RS_COMPANY.id);
  const due = csCompanyDue(RS_COMPANY.id, isoPeriod), collected = companyAreas.reduce((t, a) => t + csAreaProgress(a.id, isoPeriod).paid, 0), remitted = rsSum(receipts);
  const areas = [...new Set(rsRows().map(r => r.area))].sort();
  const rows = current.map(r => {
    const [label, tone] = RS_STATUS[r.status];
    const who = rsCollector(r.confirmedBy || r.collector);
    return `<tr data-row data-group="${r.status}" data-area="${escapeHtml(r.area)}" data-collector="${r.confirmedBy || r.collector}" data-search="${escapeHtml(`${r.code} ${r.name} ${r.address} ${r.phone} ${r.charge} ${r.request} ${who?.name || ""} ${who?.username || ""}`.toLowerCase())}" class="${r.status === "overdue" ? "is-attention" : ""}">
      <td><span class="cell-title">${escapeHtml(r.name)}</span><span class="cell-subtitle">${r.code}${r.kind === "business" ? " · Hộ KD" : ""}</span></td>
      <td><span class="cell-title" style="font-weight:600">${escapeHtml(r.address)}</span><span class="cell-subtitle">${r.area} · ${r.phone}</span></td>
      <td><span class="cell-title">${r.charge}</span><span class="cell-subtitle">${r.request} · hạn ${r.dueDate}</span></td>
      <td class="money">${formatMoney(r.amount)}</td>
      <td>${badge(label, tone)}${r.status === "paid" ? `<span class="cell-subtitle">${r.method} · ${r.confirmedAt}</span>` : r.note ? `<span class="cell-subtitle">${escapeHtml(r.note)}</span>` : ""}</td>
      <td>${who ? `<span class="cell-title">${escapeHtml(who.name)}</span><span class="cell-subtitle">${who.username} · ${r.status === "paid" ? "đã xác nhận thu" : "phụ trách"}</span>` : "—"}</td>
      <td>${r.status === "paid" ? "" : rsBtn("Cập nhật", "coUpdate", r.charge, "primary", true)}</td></tr>`;
  });
  // Theo tài khoản người đi thu: hộ nào đã xác nhận thu, tiền mặt đã nộp về công ty hay còn giữ.
  const collectorRows = RS_COLLECTORS.map(c => {
    const mine = paid.filter(r => r.confirmedBy === c.username);
    const cash = mine.filter(r => r.method === "Tiền mặt"), transfer = mine.length - cash.length;
    const handed = rsSum(RS_HANDOVERS.filter(h => h.collector === c.username && h.period === rsState.period));
    const held = rsSum(cash) - handed;
    const [label, tone] = held <= 0 ? ["Đã nộp đủ", "success"] : handed ? ["Còn giữ tiền mặt", "warning"] : ["Chưa nộp về công ty", "danger"];
    return `<tr class="${held > 0 && !handed ? "is-attention" : ""}">
      <td><span class="cell-title">${escapeHtml(c.name)}</span><span class="cell-subtitle">${c.username} · ${c.area}</span></td>
      <td class="num">${mine.length}<span class="cell-subtitle">${cash.length} tiền mặt · ${transfer} chuyển khoản</span></td>
      <td class="money">${formatMoney(rsSum(mine))}<span class="cell-subtitle">tiền mặt ${formatMoney(rsSum(cash))}</span></td>
      <td class="money">${formatMoney(handed)}</td>
      <td class="money">${formatMoney(Math.max(held, 0))}</td>
      <td>${badge(label, tone)}${held > 0 && !handed ? `<span class="cell-subtitle">${cash.length} hộ đã xác nhận thu, chưa bàn giao</span>` : ""}</td>
      <td>${rsBtn("Xem hộ", "coFilterCollector", c.username, "secondary", true)}${held > 0 ? ` ${rsBtn("Xác nhận nhận tiền", "coHandover", c.username, "primary", true)}` : ""}</td></tr>`;
  });
  const receiptRows = receipts.map(r => {
    const [label, tone] = RS_RECEIPT_STATUS[r.status];
    return `<tr class="${r.status === "issue" ? "is-attention" : ""}"><td><span class="cell-title">${r.id}</span><span class="cell-subtitle">Xã lập ${r.date} · ${escapeHtml(r.by)}</span></td><td>${r.method}<span class="cell-subtitle">${escapeHtml(r.ref)}</span></td><td class="money">${formatMoney(r.amount)}</td><td>${badge(label, tone)}${r.issue ? `<span class="cell-subtitle">${escapeHtml(r.issue)}</span>` : ""}</td><td>${r.status === "recorded" ? rsBtn("Báo sai sót", "coReceiptIssue", r.id, "secondary", true) : ""}</td></tr>`;
  });
  const reminders = CS_REMINDERS.filter(n => n.companyId === RS_COMPANY.id);
  const debts = csCompanyDebts(RS_COMPANY.id);
  return `${csHeader("Hộ được giao", rsBtn("Xác nhận nhận tiền mặt", "coHandover") + rsBtn("Cập nhật kết quả thu", "coUpdate", "", "primary"), `${escapeHtml(RS_COMPANY.name)} · ${MANAGEMENT_AREAS.filter(a => a.unit === RS_COMPANY.id).length} khu vực được giao · ${RS_COLLECTORS.length} tài khoản người đi thu`)}
  ${debts.length ? `<div class="callout danger"><div><strong>Còn nợ xã ${formatMoney(debts.reduce((t, d) => t + d.remaining, 0))} · ${debts.map(d => d.label).join(", ")}</strong><p>${reminders.length ? `Xã đã nhắc ${reminders[0].date}, hạn nộp ${reminders[0].due}: ${escapeHtml(reminders[0].content)}` : "Kỳ đã hết hạn nộp; đề nghị nộp về ngân sách xã để xã lập phiếu thu."}</p></div></div>` : ""}
  <div class="filter-bar">${filterField("Kỳ thu", csSelect('data-rs-filter="period"', periods.map(p => [p, rsPeriodTitle(p)]), rsState.period))}</div>
  ${summaryStrip([["Phải thu kỳ này", formatMoney(due), `${companyAreas.length} tổ · ${companyAreas.reduce((t, a) => t + a.households, 0).toLocaleString("vi-VN")} hộ`], ["Đã thu", formatMoney(collected), `${due ? Math.round(collected / due * 100) : 0}% · người đi thu xác nhận`], ["Xã đã lập phiếu thu", formatMoney(remitted), `${receipts.length} phiếu thu`], ["Còn phải nộp về xã", formatMoney(Math.max(collected - remitted, 0)), collected - remitted > 0 ? "Đã thu chưa nộp" : "Đã nộp đủ"]])}
  <section data-table-filter data-chip-key="group" data-count-label="hộ">
    ${filterBar(filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(a => [a, a])])) + filterField("Người đi thu", filterSelect("collector", [["all", "Tất cả tài khoản"], ...RS_COLLECTORS.map(c => [c.username, `${c.name} · ${c.username}`])])), "Tên hộ, mã hộ, địa chỉ, SĐT, mã khoản, người thu...")}
    ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["appointment", "Đã hẹn"], ["absent", "Vắng nhà", "warning"], ["paid", "Đã thu", "success"]], "hộ")}
    ${panel(`Danh sách hộ · kỳ ${rsState.period}`, "Mã khoản / phiếu yêu cầu thu do xã lập; kết quả thu gắn với tài khoản người đi thu đã xác nhận.", table(["Hộ", "Địa chỉ", "Mã khoản / phiếu YC", { label: "Số tiền", num: true }, "Kết quả thu", "Người đi thu", ""], rows, { empty: "Không có hộ phù hợp." }))}
  </section>
  <div class="stack-gap"></div>
  ${panel(`Theo tài khoản người đi thu · kỳ ${rsState.period}`, "Tiền mặt người đi thu đã xác nhận thu phải bàn giao về công ty; chuyển khoản vào thẳng tài khoản công ty.", table(["Tài khoản", { label: "Hộ đã xác nhận thu", num: true }, { label: "Đã thu", num: true }, { label: "Đã nộp công ty", num: true }, { label: "Còn giữ", num: true }, "Trạng thái", ""], collectorRows, { static: true }))}
  <div class="stack-gap"></div>
  ${panel(`Phiếu thu xã đã lập cho công ty · kỳ ${rsState.period}`, "Xã lập phiếu thu mỗi lần công ty nộp tiền. Công ty chỉ xem, thấy sai thì báo lại xã.", receiptRows.length ? table(["Phiếu thu", "Hình thức / chứng từ", { label: "Số tiền", num: true }, "Trạng thái", ""], receiptRows, { static: true }) : '<p class="table-empty">Xã chưa lập phiếu thu nào cho công ty trong kỳ.</p>')}`;
}

// ---------- Công ty: Giải quyết khiếu nại ----------
function rsCompanyComplaints() {
  const list = rsCompanyComplaintList();
  const today = rsDateKey(rsToday);
  const isLate = c => c.status !== "done" && c.deadline && rsDateKey(c.deadline) < today;
  const open = list.filter(c => c.status !== "done");
  const rows = list.map(c => {
    const [label, tone] = RS_COMPLAINT_STATUS[c.status];
    const row = rsRows().find(r => r.code === c.subject);
    const who = row ? rsCollector(row.collector) : null;
    const late = isLate(c);
    const replier = c.reply ? rsCollector(c.reply.by) : null;
    return `<tr data-row data-group="${late ? "overdue" : c.status}" data-collector="${who?.username || "none"}" data-search="${escapeHtml(`${c.id} ${c.name} ${c.subject} ${c.phone} ${c.content} ${who?.name || ""} ${who?.username || ""}`.toLowerCase())}" class="${late || c.status === "new" ? "is-attention" : ""}">
      <td><span class="cell-title">${c.id}</span><span class="cell-subtitle">${c.date} · ${c.channel}</span></td>
      <td><span class="cell-title">${escapeHtml(c.name)}</span><span class="cell-subtitle">${c.subject} · ${escapeHtml(c.phone)}</span></td>
      <td><span class="cell-title" style="font-weight:600">${escapeHtml(c.content)}</span>${c.result ? `<span class="cell-subtitle">${escapeHtml(c.result)}</span>` : ""}</td>
      <td>${who ? `<span class="cell-title">${escapeHtml(who.name)}</span><span class="cell-subtitle">${who.username} · ${row.area}</span>` : `<span class="cell-title">${csAreaName(c.area)}</span><span class="cell-subtitle">Chưa gắn người thu</span>`}</td>
      <td>${c.deadline || "—"}</td>
      <td>${badge(late ? "Quá hạn xử lý" : label, late ? "danger" : tone)}${replier ? `<span class="cell-subtitle">Phản hồi ${c.reply.date} · ${escapeHtml(replier.name)}</span>` : ""}</td>
      <td>${rsBtn(c.status === "done" ? "Xem" : "Xử lý", "coComplaint", c.id, c.status === "done" ? "secondary" : "primary", true)}</td></tr>`;
  });
  return `${csHeader("Giải quyết khiếu nại", "", `${escapeHtml(RS_COMPANY.name)} · khiếu nại do xã chuyển hoặc thuộc khu vực công ty phụ trách · kết quả xử lý gửi về xã`)}
  ${summaryStrip([["Đang mở", String(open.length), `${list.filter(c => c.status === "new").length} chờ tiếp nhận`], ["Quá hạn xử lý", String(list.filter(isLate).length), "Theo hạn xã giao"], ["Đã giải quyết", String(list.filter(c => c.status === "done").length), "Xã đã ghi nhận kết quả"], ["Hạn phản hồi", "3 ngày làm việc", "Tính từ ngày xã chuyển"]])}
  <section data-table-filter data-chip-key="group" data-count-label="khiếu nại">
    ${filterBar(filterField("Người thu phụ trách", filterSelect("collector", [["all", "Tất cả tài khoản"], ...RS_COLLECTORS.map(c => [c.username, `${c.name} · ${c.username}`]), ["none", "Chưa gắn người thu"]])), "Mã, tên, mã hộ, nội dung, người thu...")}
    ${chipBar([["all", "Tất cả"], ["new", "Chờ tiếp nhận", "warning"], ["processing", "Đang xử lý"], ["overdue", "Quá hạn", "danger"], ["done", "Đã giải quyết", "success"]], "khiếu nại")}
    ${panel("Khiếu nại", "", table(["Mã / ngày", "Người khiếu nại", "Nội dung · ý kiến xã", "Người thu phụ trách", "Hạn xử lý", "Trạng thái", ""], rows, { empty: "Không có khiếu nại phù hợp." }))}
  </section>`;
}

// ---------- Người đi thu: Danh sách hộ ----------
// Cùng danh sách hộ với công ty, giới hạn theo tài khoản người thu phụ trách; lọc theo kỳ và theo đường.
function rsCollectorList() {
  const mine = rsRows().filter(r => r.collector === RS_ME.username);
  const periods = [...new Set(mine.map(r => r.period))].sort((a, b) => b.slice(3).localeCompare(a.slice(3)) || b.localeCompare(a));
  const current = mine.filter(r => r.period === rsState.period);
  const paid = current.filter(r => r.status === "paid");
  const streets = [...new Set(current.map(r => rsStreet(r.address)))].sort((a, b) => a.localeCompare(b, "vi"));
  const held = Math.max(rsCashHeld(RS_ME.username, rsState.period), 0);
  const rows = current.map(r => {
    const [label, tone] = RS_STATUS[r.status];
    const street = rsStreet(r.address);
    return `<tr data-row data-group="${r.status}" data-street="${escapeHtml(street)}" data-search="${escapeHtml(`${r.code} ${r.name} ${r.address} ${r.phone} ${r.charge} ${r.request} ${r.receipt} ${r.note}`.toLowerCase())}" class="${r.status === "overdue" ? "is-attention" : ""}">
      <td><span class="cell-title">${escapeHtml(r.name)}</span><span class="cell-subtitle">${r.code}${r.kind === "business" ? " · Hộ KD" : ""}</span></td>
      <td><span class="cell-title" style="font-weight:600">${escapeHtml(r.address)}</span><span class="cell-subtitle">${escapeHtml(street)} · ${r.phone}</span></td>
      <td><span class="cell-title">${r.charge}</span><span class="cell-subtitle">${r.request} · hạn ${r.dueDate}</span></td>
      <td class="money">${formatMoney(r.amount)}</td>
      <td>${badge(label, tone)}${r.status === "paid" ? `<span class="cell-subtitle">${r.method} · ${r.confirmedAt}</span>` : r.note ? `<span class="cell-subtitle">${escapeHtml(r.note)}</span>` : ""}</td>
      <td>${r.receipt ? `<button type="button" class="link-button" data-rs="clReceipt" data-id="${r.charge}">${r.receipt}</button><span class="cell-subtitle">Đã gửi hộ</span>` : "—"}</td>
      <td>${r.status === "paid" ? "" : rsBtn("Cập nhật", "clUpdate", r.charge, "primary", true)}</td></tr>`;
  });
  return `${csHeader("Danh sách hộ đi thu", rsBtn("Cập nhật kết quả", "clUpdate", "", "primary"), `${RS_ME.name} · ${RS_ME.username} · ${escapeHtml(RS_COMPANY.name)} · ${RS_ME.area} · hôm nay ${rsToday}`)}
  <div class="filter-bar">${filterField("Kỳ thu", csSelect('data-rs-filter="period"', periods.map(p => [p, rsPeriodTitle(p)]), rsState.period))}</div>
  ${summaryStrip([["Hộ được giao", String(current.length), `${streets.length} đường · kỳ ${rsState.period}`], ["Đã thu", String(paid.length), `${formatMoney(rsSum(paid))} · ${paid.length} biên lai`], ["Chưa thu", String(current.length - paid.length), `${current.filter(r => r.status === "overdue").length} quá hạn`], ["Tiền mặt đang giữ", formatMoney(held), held ? "Bàn giao về công ty cuối ca" : "Đã bàn giao đủ"]])}
  <section data-table-filter data-chip-key="group" data-count-label="hộ">
    ${filterBar(filterField("Đường", filterSelect("street", [["all", "Tất cả đường"], ...streets.map(s => [s, s])])), "Tên hộ, mã hộ, địa chỉ, mã khoản, biên lai...")}
    ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["absent", "Vắng nhà", "warning"], ["appointment", "Đã hẹn"], ["paid", "Đã thu", "success"]], "hộ")}
    ${panel(`Hộ được giao · kỳ ${rsState.period}`, "Theo phiếu yêu cầu thu của xã. Biên lai điện tử xuất tự động khi xác nhận đã thanh toán.", table(["Hộ", "Địa chỉ", "Mã khoản / phiếu YC", { label: "Số tiền", num: true }, "Kết quả thu", "Biên lai", ""], rows, { empty: "Không có hộ phù hợp." }))}
  </section>`;
}

// ---------- Quản trị: Tài khoản & phân quyền ----------
function rsAccounts() {
  const roleNames = [...new Set(RS_USERS.map(u => u.roles))];
  const rows = RS_USERS.map(u => `<tr data-row data-group="${u.status === "Hoạt động" ? "active" : "attention"}" data-role="${escapeHtml(u.roles)}" data-search="${escapeHtml(`${u.username} ${u.name} ${u.organization} ${u.roles}`.toLowerCase())}" class="${u.status === "Hoạt động" ? "" : "is-attention"}">
      <td><span class="cell-title">${escapeHtml(u.name)}</span><span class="cell-subtitle">${u.username}</span></td>
      <td>${escapeHtml(u.organization)}</td>
      <td>${badge(u.roles, "info")}</td>
      <td>${u.lastLogin}</td>
      <td>${badge(u.status, u.status === "Hoạt động" ? "success" : u.status === "Đã khóa" ? "neutral" : "warning")}</td>
      <td>${rsBtn("Sửa", "userEdit", u.username, "secondary", true)}</td></tr>`);
  const roleRows = RS_ROLES.map(r => `<tr><td><span class="cell-title">${r.name}</span></td><td>${r.scope}</td><td>${r.functions}</td><td>${["view", "edit", "approve", "export"].filter(k => r.perms[k]).map(k => ({ view: "Xem", edit: "Tạo/sửa", approve: "Duyệt", export: "Xuất" }[k])).join(" · ")}</td><td>${rsBtn("Sửa quyền", "roleEdit", r.name, "secondary", true)}</td></tr>`);
  return `${csHeader("Tài khoản & phân quyền", rsBtn("+ Thêm tài khoản", "userEdit", "", "primary"))}
  <section data-table-filter data-chip-key="group" data-count-label="tài khoản">
    ${filterBar(filterField("Vai trò", filterSelect("role", [["all", "Tất cả vai trò"], ...roleNames.map(r => [r, r])])), "Tên, tên đăng nhập, đơn vị...")}
    ${chipBar([["all", "Tất cả"], ["active", "Hoạt động", "success"], ["attention", "Cần xử lý", "warning"]], "tài khoản")}
    ${panel("Tài khoản", "", table(["Người dùng", "Đơn vị", "Vai trò", "Đăng nhập gần nhất", "Trạng thái", ""], rows, { empty: "Không có tài khoản phù hợp." }))}
  </section>
  <div class="stack-gap"></div>
  ${panel("Vai trò & phạm vi dữ liệu", "", table(["Vai trò", "Phạm vi", "Chức năng", "Quyền", ""], roleRows, { static: true }))}`;
}

// ---------- Quản trị: Cấu hình nghiệp vụ ----------
function rsConfig() {
  const districtRows = RS_DISTRICTS.map(d => `<tr><td><span class="cell-title">${d.name}</span><span class="cell-subtitle">${d.code} · ${d.note}</span></td><td class="num">${d.groups}</td><td>${rsBtn("Sửa", "districtEdit", d.code, "secondary", true)}</td></tr>`);
  const unitRows = MANAGEMENT_UNITS.map(u => `<tr><td><span class="cell-title">${escapeHtml(u.name)}</span><span class="cell-subtitle">${u.id} · ${escapeHtml(u.contact)} · ${escapeHtml(u.phone)}</span></td><td>${badge(u.status === "inactive" ? "Tạm ngưng" : "Hoạt động", u.status === "inactive" ? "neutral" : "success")}</td><td>${rsBtn("Sửa", "unitEdit", u.id, "secondary", true)}</td></tr>`);
  const tariffRows = RS_TARIFFS.map(t => `<tr><td><span class="cell-title">${t.code}</span><span class="cell-subtitle">${t.legal}</span></td><td>${t.scope}</td><td class="num">${t.collection}</td><td class="num">${t.transport}</td><td class="num">${t.processing}</td><td>${t.effective}</td><td>${badge(t.status, t.status === "Đang áp dụng" ? "success" : t.status === "Dự thảo" ? "info" : "neutral")}</td><td>${rsBtn("Sửa", "tariffEdit", t.code, "secondary", true)}</td></tr>`);
  const periodRows = CS_PERIODS.map(p => { const owing = p.status === "Đang thu" && csPeriodDue(p.id) < CS_TODAY ? MANAGEMENT_UNITS.filter(u => csCompanyDue(u.id, p.id) - csCompanyReceived(u.id, p.id) > 0).length : 0; return `<tr><td><span class="cell-title">${p.label}</span>${owing ? `<span class="cell-subtitle text-danger">Hết hạn nộp · ${owing} công ty chưa nộp đủ</span>` : ""}</td><td>${p.open} → ${p.due}</td><td>${p.legal}</td><td>${badge(p.status, p.status === "Đang thu" ? "success" : p.status === "Đã khóa" ? "neutral" : "info")}</td><td>${p.status === "Đã khóa" ? "" : rsBtn(p.status === "Đang thu" ? "Khóa kỳ" : "Bắt đầu thu", "periodStatus", p.id, "secondary", true)}</td></tr>`; });
  return `${csHeader("Cấu hình nghiệp vụ", "", "Địa bàn & đơn vị · Biểu giá · Kỳ thu")}
  ${panel("Địa bàn", "", table(["Địa bàn", { label: "Tổ dân phố", num: true }, ""], districtRows, { static: true }), rsBtn("+ Thêm địa bàn", "districtEdit", "", "secondary", true))}
  <div class="stack-gap"></div>
  ${panel("Đơn vị thu gom", "Phân công khu vực thực hiện tại không gian Cán bộ xã.", table(["Công ty", "Trạng thái", ""], unitRows, { static: true }), rsBtn("+ Thêm đơn vị", "unitEdit", "", "secondary", true))}
  <div class="stack-gap"></div>
  ${panel("Biểu giá", "Khoản đã phát hành giữ mức giá tại thời điểm phát hành, không đổi theo phiên bản mới.", table(["Phiên bản / căn cứ", "Phạm vi", { label: "Thu gom", num: true }, { label: "Vận chuyển", num: true }, { label: "Xử lý", num: true }, "Hiệu lực", "Trạng thái", ""], tariffRows, { static: true }), rsBtn("+ Thêm phiên bản", "tariffEdit", "", "secondary", true))}
  <div class="stack-gap"></div>
  ${panel("Kỳ thu", "Mở theo tháng hoặc theo quý. Chỉ một kỳ ở trạng thái Đang thu; cán bộ xã lập phiếu yêu cầu thu theo kỳ đã mở.", table(["Kỳ", "Thời gian thu", "Căn cứ giá", "Trạng thái", ""], periodRows, { static: true }), rsBtn("+ Mở kỳ thu", "periodCreate", "", "primary", true))}`;
}

// ---------- Quản trị: Nhật ký & sao lưu ----------
function rsLogs() {
  const roles = [...new Set(APP_DATA.audit.map(a => a.role))];
  const rows = APP_DATA.audit.map(a => `<tr data-row data-role="${escapeHtml(a.role)}" data-group="${/Thành công|khớp/.test(a.result) ? "ok" : "open"}" data-search="${escapeHtml(`${a.time} ${a.actor} ${a.role} ${a.action} ${a.object} ${a.result}`.toLowerCase())}"><td>${a.time}</td><td><span class="cell-title">${a.actor}</span><span class="cell-subtitle">${a.role}</span></td><td>${a.action}</td><td>${a.object}</td><td>${badge(a.result)}</td></tr>`);
  const backupRows = RS_BACKUPS.map(b => `<tr><td><span class="cell-title">${b.id}</span><span class="cell-subtitle">${b.time}</span></td><td>${b.type}</td><td class="num">${b.size}</td><td>${b.check}</td><td>${badge(b.status, b.status === "Thành công" ? "success" : "warning")}</td><td>${rsBtn("Kiểm tra phục hồi", "restoreTest", b.id, "secondary", true)}</td></tr>`);
  return `${csHeader("Nhật ký & sao lưu", actionButton("Xuất nhật ký", "exportData") + rsBtn("Sao lưu ngay", "backupNow", "", "primary"))}
  ${summaryStrip([["Sự kiện hôm nay", "12.486", "Theo người, vai trò, thiết bị"], ["Thao tác tài chính", "2.194", "Lưu dữ liệu trước / sau"], ["Cảnh báo bảo mật", "01", "Đăng nhập thất bại liên tiếp"], ["Sao lưu gần nhất", RS_BACKUPS[0].time.slice(11), `${RS_BACKUPS[0].check}`]])}
  <section data-table-filter data-chip-key="group" data-count-label="sự kiện">
    ${filterBar(filterField("Vai trò", filterSelect("role", [["all", "Tất cả vai trò"], ...roles.map(r => [r, r])])), "Người, hành động, đối tượng, mã giao dịch...")}
    ${chipBar([["all", "Tất cả"], ["open", "Còn treo", "warning"], ["ok", "Thành công", "success"]], "sự kiện")}
    ${panel("Nhật ký gần nhất", "", table(["Thời gian", "Người / vai trò", "Hành động", "Đối tượng", "Kết quả"], rows, { empty: "Không có sự kiện phù hợp." }))}
  </section>
  <div class="stack-gap"></div>
  ${panel("Bản sao lưu", "", table(["Bản sao lưu", "Loại", { label: "Dung lượng", num: true }, "Kiểm tra", "Trạng thái", ""], backupRows, { static: true }))}`;
}

Object.assign(VIEW_RENDERERS, { rsCompanyAssigned, rsCompanyComplaints, rsCollectorList, rsAccounts, rsConfig, rsLogs });

// Kỳ chưa mở kế tiếp: 6 tháng hoặc 4 quý tính từ kỳ mới nhất cùng loại (hoặc từ hôm nay).
function rsPeriodChoices(kind) {
  const existing = new Set(CS_PERIODS.map(p => p.id));
  // Bắt đầu sau kỳ mới nhất bất kể loại: tháng 09 đã mở thì quý kế tiếp là Q4.
  const lastMonth = CS_PERIODS.map(p => csIsQuarter(p.id) ? csQuarterMonths(p.id)[2] : p.id).sort().pop() || CS_TODAY.slice(0, 7);
  let y = Number(lastMonth.slice(0, 4));
  let n = kind === "quarter" ? Math.ceil(Number(lastMonth.slice(5, 7)) / 3) : Number(lastMonth.slice(5, 7));
  const max = kind === "quarter" ? 4 : 12;
  const list = [];
  while (list.length < (kind === "quarter" ? 4 : 6)) {
    n++; if (n > max) { n = 1; y++; }
    const id = kind === "quarter" ? `${y}-Q${n}` : `${y}-${String(n).padStart(2, "0")}`;
    if (!existing.has(id)) list.push([id, kind === "quarter" ? csQuarterLabel(id) : `Tháng ${csPeriodLabel(id)}`]);
  }
  return list;
}
// Tự điền ngày mở / hạn nộp theo kỳ chọn; người dùng vẫn sửa được.
function rsPeriodLive() {
  const id = csFormValue("rsPdPeriod");
  if (!id) return;
  document.getElementById("rsPdOpen").value = csIsQuarter(id) ? `${csQuarterMonths(id)[0]}-01` : `${id}-01`;
  document.getElementById("rsPdDue").value = csPeriodDue(id);
  const months = csIsQuarter(id) ? csQuarterMonths(id) : [id];
  const overlap = CS_PERIODS.filter(p => (csIsQuarter(p.id) ? csQuarterMonths(p.id) : [p.id]).some(m => months.includes(m)));
  document.getElementById("rsPdHint").innerHTML = overlap.length
    ? `<span class="text-warning">Kỳ này chồng lên ${overlap.map(p => p.label).join(", ")}: hộ đã có khoản ở kỳ đó sẽ được bỏ qua khi lập phiếu yêu cầu thu.</span>`
    : `Thu ${csIsQuarter(id) ? "3 tháng một lần, số tiền mỗi hộ gấp 3 mức tháng" : "hằng tháng theo nhóm giá"}.`;
}

// ---------- Hộp thoại ----------
const RS_DIALOGS = {
  coUpdate(chargeId) {
    const open = rsRows().filter(r => r.status !== "paid" && r.period === rsState.period);
    const selected = open.find(r => r.charge === chargeId) || open[0];
    if (!selected) { showDemoNotice("Không còn hộ nào chưa thu trong kỳ."); return; }
    const accounts = [...RS_COLLECTORS.map(c => [c.username, `${c.name} · ${c.username}`]), [RS_COMPANY_ACCOUNT.username, `${RS_COMPANY_ACCOUNT.name} · tài khoản công ty`]];
    csDialog("coUpdate", selected.charge, "Cập nhật kết quả thu", `<div class="form-grid">
      ${csField("Hộ *", csSelect('id="rsCoCharge"', open.map(r => [r.charge, `${r.name} · ${r.code} · ${formatMoney(r.amount)}`]), selected.charge), true)}
      ${csField("Mã khoản / phiếu yêu cầu thu", csInput("rsCoRef", `${selected.charge} · ${selected.request}`, "text", "readonly"), true)}
      ${csField("Kết quả *", csSelect('id="rsCoResult"', [["paid", "Đã thu"], ["absent", "Vắng nhà"], ["appointment", "Đã hẹn"], ["unpaid", "Chưa thu"]], "paid"))}
      ${csField("Hình thức", csSelect('id="rsCoMethod"', [["Tiền mặt", "Tiền mặt"], ["Chuyển khoản", "Chuyển khoản"], ["Ứng dụng người dân", "Ứng dụng người dân"]], "Tiền mặt"))}
      ${csField("Số tiền", csInput("rsCoAmount", String(selected.amount), "number", 'min="0"'))}
      ${csField("Tài khoản xác nhận thu *", csSelect('id="rsCoCollector"', accounts, selected.collector))}
      ${csField("Ngày", csInput("rsCoDate", CS_TODAY, "date", "required"))}
      ${csField("Ghi chú", csInput("rsCoNote", "", "text", 'placeholder="Hẹn lại, lý do vắng..."'))}
    </div>`, "Lưu kết quả", "Không cần số biên lai: kết quả thu gắn với mã khoản của phiếu yêu cầu thu do xã lập và tài khoản người đã xác nhận.");
  },
  coHandover(username) {
    const c = RS_COLLECTORS.find(x => x.username === username) || RS_COLLECTORS.find(x => rsCashHeld(x.username, rsState.period) > 0) || RS_COLLECTORS[0];
    const held = Math.max(rsCashHeld(c.username, rsState.period), 0);
    csDialog("coHandover", "", "Xác nhận nhận tiền mặt từ người đi thu", `<div class="form-grid">
      ${csField("Tài khoản người đi thu *", csSelect('id="rsHoCollector"', RS_COLLECTORS.map(x => [x.username, `${x.name} · ${x.username} · còn giữ ${formatMoney(Math.max(rsCashHeld(x.username, rsState.period), 0))}`]), c.username), true)}
      ${csField("Số tiền nhận *", csInput("rsHoAmount", String(held), "number", 'min="1" required'))}
      ${csField("Ngày nhận *", csInput("rsHoDate", CS_TODAY, "date", "required"))}
      ${csField("Ghi chú", csInput("rsHoNote", "", "text", 'placeholder="Cuối ca, bàn giao tại văn phòng..."'), true)}
    </div>`, "Xác nhận đã nhận", `Kỳ ${rsState.period}. Chỉ tính tiền mặt người đi thu đã xác nhận thu; chuyển khoản vào thẳng tài khoản công ty.`);
  },
  coReceiptIssue(id) {
    const r = rsReceipts().find(x => x.id === id);
    if (!r) return;
    csDialog("coReceiptIssue", id, `Báo sai sót · ${r.id}`, `<div class="dialog-summary"><div><span>Xã lập</span><strong>${r.date}</strong></div><div><span>Số tiền trên phiếu</span><strong>${formatMoney(r.amount)}</strong></div><div><span>Chứng từ</span><strong>${escapeHtml(r.ref)}</strong></div></div><div class="form-grid">
      ${csField("Loại sai sót *", csSelect('id="rsRiType"', [["Sai số tiền", "Sai số tiền"], ["Sai kỳ thu", "Sai kỳ thu"], ["Sai chứng từ / hình thức", "Sai chứng từ / hình thức"], ["Không phải khoản nộp của công ty", "Không phải khoản nộp của công ty"]], "Sai số tiền"))}
      ${csField("Số tiền đúng (nếu có)", csInput("rsRiAmount", String(r.amount), "number", 'min="0"'))}
      ${csField("Mô tả *", `<textarea class="control" id="rsRiNote" required placeholder="Ví dụ: công ty chuyển 239.000đ ngày 12/09, phiếu ghi 199.000đ"></textarea>`, true)}
    </div>`, "Gửi báo sai sót", "Công ty không tự sửa phiếu thu; xã kiểm tra chứng từ và điều chỉnh sau khi nhận phản ánh.");
  },
  coComplaint(id) {
    const c = CS_COMPLAINTS.find(x => x.id === id);
    if (!c) return;
    const done = c.status === "done";
    const row = rsRows().find(r => r.code === c.subject);
    const who = row ? rsCollector(row.collector) : null;
    const handlers = [[RS_COMPANY_ACCOUNT.username, `${RS_COMPANY_ACCOUNT.name} · tài khoản công ty`], ...RS_COLLECTORS.map(x => [x.username, `${x.name} · ${x.username}`])];
    csDialog("coComplaint", id, `${done ? "Khiếu nại" : "Xử lý khiếu nại"} ${c.id}`, `<div class="dialog-summary"><div><span>Người khiếu nại</span><strong>${escapeHtml(c.name)}</strong></div><div><span>Hộ · người thu phụ trách</span><strong>${c.subject}${who ? ` · ${escapeHtml(who.name)}` : ""}</strong></div><div><span>Hạn xử lý</span><strong>${c.deadline || "—"}</strong></div></div>
    <p><strong>Nội dung:</strong> ${escapeHtml(c.content)}<br><span class="muted">${c.channel} · xã tiếp nhận ${c.date}${c.result && !done ? ` · Ý kiến xã: ${escapeHtml(c.result)}` : ""}</span></p>
    ${done ? `<p><strong>Kết quả:</strong> ${escapeHtml(c.result)}${c.reply ? `<br><span class="muted">Phản hồi ${c.reply.date} · ${escapeHtml(rsCollector(c.reply.by)?.name || "Công ty")}</span>` : ""}</p>` : `<div class="form-grid">
      ${csField("Kết quả *", csSelect('id="rsCpStatus"', [["processing", "Đang xử lý · cập nhật tiến độ cho xã"], ["done", "Đã giải quyết · gửi kết quả về xã"]], "done"))}
      ${csField("Người xử lý *", csSelect('id="rsCpBy"', handlers, who?.username || RS_COMPANY_ACCOUNT.username))}
      ${csField("Nội dung phản hồi *", `<textarea class="control" id="rsCpReply" required placeholder="Kết quả kiểm tra, biện pháp khắc phục, đề nghị xã điều chỉnh (nếu có)..."></textarea>`, true)}
    </div>`}`, done ? "" : "Gửi phản hồi về xã");
  },
  clUpdate(chargeId) {
    const open = rsRows().filter(r => r.collector === RS_ME.username && r.period === rsState.period && r.status !== "paid");
    const selected = open.find(r => r.charge === chargeId) || open[0];
    if (!selected) { showDemoNotice("Đã cập nhật hết các hộ trong kỳ."); return; }
    csDialog("clUpdate", selected.charge, "Cập nhật kết quả", `<div class="form-grid">
      ${csField("Hộ *", csSelect('id="rsClCharge"', open.map(r => [r.charge, `${r.name} · ${r.address} · ${formatMoney(r.amount)}`]), selected.charge), true)}
      ${csField("Mã khoản / phiếu yêu cầu thu", csInput("rsClRef", `${selected.charge} · ${selected.request}`, "text", "readonly"), true)}
      ${csField("Kết quả *", csSelect('id="rsClResult"', [["cash", "Đã thu tiền mặt"], ["transfer", "Đã thu chuyển khoản"], ["absent", "Vắng nhà"], ["appointment", "Đã hẹn"], ["refused", "Từ chối nộp"]], "cash"))}
      ${csField("Số tiền", csInput("rsClAmount", String(selected.amount), "number", 'min="0"'))}
      ${csField("Ngày quay lại / hẹn", csInput("rsClNext", "", "date"))}
      ${csField("Ghi chú", csInput("rsClNote", "", "text"), true)}
    </div>`, "Lưu kết quả", "Chọn “Đã thu”: hệ thống xuất biên lai điện tử ngay và gửi cho hộ, không nhập số biên lai thủ công.");
  },
  clReceipt(chargeId) {
    const r = rsRows().find(x => x.charge === chargeId);
    if (!r || !r.receipt) return;
    const who = rsCollector(r.confirmedBy);
    csDialog("clReceipt", chargeId, `Biên lai ${r.receipt}`, `<div class="invoice-preview">
      <div class="invoice-brand"><div><h3>${escapeHtml(RS_COMPANY.name)}</h3><p>Thu hộ theo phiếu yêu cầu thu của UBND xã Đông Thạnh</p></div><div class="invoice-number"><h3>${r.receipt}</h3><p>Ngày ${r.confirmedAt}</p></div></div>
      <div class="invoice-title"><h2>Biên lai thu tiền</h2><p>Giá dịch vụ thu gom, vận chuyển, xử lý chất thải rắn sinh hoạt</p></div>
      <p><strong>Người nộp:</strong> ${escapeHtml(r.name)} · ${r.code}<br><strong>Địa chỉ:</strong> ${escapeHtml(r.address)} · ${r.area}<br><strong>Hình thức:</strong> ${r.method}</p>
      <table class="invoice-lines"><thead><tr><th>Nội dung</th><th>Kỳ</th><th style="text-align:right">Số tiền</th></tr></thead><tbody><tr><td>Khoản thu ${r.charge}<br><small class="muted">Phiếu yêu cầu thu ${r.request}</small></td><td>${r.period}</td><td style="text-align:right"><strong>${formatMoney(r.amount)}</strong></td></tr></tbody></table>
      <p class="muted">Người thu: ${escapeHtml(who?.name || r.confirmedBy)} · ${r.confirmedBy} · ${escapeHtml(RS_COMPANY.name)}</p>
    </div>`, "Gửi lại biên lai cho hộ");
  },
  userEdit(username) {
    const u = RS_USERS.find(x => x.username === username) || { username: "", name: "", organization: "Phòng Kinh tế", roles: "Cán bộ xã", status: "Hoạt động" };
    csDialog("userEdit", username, username ? `Sửa tài khoản ${username}` : "Thêm tài khoản", `<div class="form-grid">
      ${csField("Họ và tên *", csInput("rsUsName", u.name, "text", "required"))}
      ${csField("Tên đăng nhập *", csInput("rsUsUsername", u.username, "text", username ? "readonly" : "required"))}
      ${csField("Đơn vị *", csSelect('id="rsUsOrg"', [["Phòng Kinh tế", "Phòng Kinh tế"], ["UBND xã", "UBND xã"], ...MANAGEMENT_UNITS.map(m => [m.name, m.name]), ["Đơn vị triển khai", "Đơn vị triển khai"]], u.organization))}
      ${csField("Vai trò *", csSelect('id="rsUsRole"', RS_ROLES.map(r => [r.name, r.name]), u.roles))}
      ${csField("Trạng thái", csSelect('id="rsUsStatus"', [["Hoạt động", "Hoạt động"], ["Bắt buộc 2FA", "Bắt buộc 2FA"], ["Đã khóa", "Đã khóa"]], u.status))}
      ${csField("Điện thoại", csInput("rsUsPhone", "", "tel"))}
      ${username ? "" : csField("Bảo mật", `<label style="display:flex;gap:8px;align-items:center;min-height:36px"><input type="checkbox" checked> Đổi mật khẩu lần đầu và bật xác thực hai lớp</label>`, true)}
    </div>`, username ? "Lưu thay đổi" : "Tạo tài khoản");
  },
  roleEdit(name) {
    const r = RS_ROLES.find(x => x.name === name);
    if (!r) return;
    const box = (key, label) => `<label style="display:flex;gap:8px;align-items:center;min-height:32px"><input type="checkbox" data-rs-perm="${key}" ${r.perms[key] ? "checked" : ""}> ${label}</label>`;
    csDialog("roleEdit", name, `Quyền · ${name}`, `<div class="form-grid">
      ${csField("Phạm vi dữ liệu *", csSelect('id="rsRlScope"', [["Toàn xã", "Toàn xã"], ["Đúng một công ty", "Đúng một công ty"], ["Hộ công ty giao", "Hộ công ty giao"], ["Hệ thống", "Hệ thống"]], r.scope))}
      ${csField("Quyền", box("view", "Xem") + box("edit", "Tạo / sửa") + box("approve", "Phê duyệt") + box("export", "Xuất dữ liệu"))}
    </div><p class="muted">Giao diện ẩn menu chỉ là mô phỏng; hệ thống thật kiểm tra quyền ở API và truy vấn dữ liệu.</p>`, "Lưu quyền");
  },
  districtEdit(code) {
    const d = RS_DISTRICTS.find(x => x.code === code) || { code: "", name: "", groups: 0, subjects: 0, note: "" };
    csDialog("districtEdit", code, code ? `Sửa địa bàn ${d.name}` : "Thêm địa bàn", `<div class="form-grid">
      ${csField("Mã *", csInput("rsDtCode", d.code, "text", code ? "readonly" : "required"))}
      ${csField("Tên địa bàn *", csInput("rsDtName", d.name, "text", "required"))}
      ${csField("Số tổ dân phố", csInput("rsDtGroups", String(d.groups), "number", 'min="0"'))}
      ${csField("Ghi chú", csInput("rsDtNote", d.note))}
    </div>`, code ? "Lưu thay đổi" : "Thêm địa bàn");
  },
  unitEdit(id) { CS_DIALOGS.editCompany(id); },
  tariffEdit(code) {
    const t = RS_TARIFFS.find(x => x.code === code) || { code: `BG-MOI-${String(rsState.seq.tariff).padStart(2, "0")}`, legal: "", scope: "Toàn xã", collection: "", transport: "", processing: "0đ", effective: "", status: "Dự thảo" };
    const [from, to] = (t.effective || " – ").split(" – ");
    csDialog("tariffEdit", code, code ? `Sửa biểu giá ${code}` : "Thêm phiên bản biểu giá", `<div class="form-grid">
      ${csField("Mã phiên bản", csInput("rsTfCode", t.code, "text", "readonly"))}
      ${csField("Căn cứ pháp lý *", csInput("rsTfLegal", t.legal, "text", "required"))}
      ${csField("Phạm vi / nhóm *", csInput("rsTfScope", t.scope, "text", "required"), true)}
      ${csField("Giá thu gom *", csInput("rsTfCollection", t.collection.replace(/\D/g, ""), "number", 'min="0" required'))}
      ${csField("Giá vận chuyển *", csInput("rsTfTransport", t.transport.replace(/\D/g, ""), "number", 'min="0" required'))}
      ${csField("Giá xử lý", csInput("rsTfProcessing", t.processing.replace(/\D/g, ""), "number", 'min="0"'))}
      ${csField("Trạng thái", csSelect('id="rsTfStatus"', [["Dự thảo", "Dự thảo"], ["Đang áp dụng", "Đang áp dụng"], ["Hết hiệu lực", "Hết hiệu lực"]], t.status))}
      ${csField("Hiệu lực từ *", csInput("rsTfFrom", from.trim().split("/").reverse().join("-"), "date", "required"))}
      ${csField("Hiệu lực đến *", csInput("rsTfTo", to.trim().split("/").reverse().join("-"), "date", "required"))}
    </div>`, code ? "Lưu thay đổi" : "Thêm phiên bản");
  },
  periodCreate() {
    csDialog("periodCreate", "", "Mở kỳ thu", `<div class="form-grid">
      ${csField("Loại kỳ *", csSelect('id="rsPdKind"', [["month", "Theo tháng"], ["quarter", "Theo quý · nộp 1 lần cho 3 tháng"]], "month"))}
      ${csField("Kỳ thu *", csSelect('id="rsPdPeriod"', rsPeriodChoices("month"), rsPeriodChoices("month")[0]?.[0]))}
      ${csField("Căn cứ giá *", csSelect('id="rsPdLegal"', [...new Set(RS_TARIFFS.filter(t => t.status !== "Hết hiệu lực").map(t => t.legal))].map(l => [l, l]), RS_TARIFFS.find(t => t.status === "Đang áp dụng")?.legal))}
      ${csField("Ngày mở *", csInput("rsPdOpen", "", "date", "required"))}
      ${csField("Hạn nộp *", csInput("rsPdDue", "", "date", "required"))}
      ${csField("Ghi chú", `<textarea class="control" id="rsPdNote" placeholder="Không bắt buộc"></textarea>`, true)}
      <p class="form-help full" id="rsPdHint"></p>
    </div>`, "Mở kỳ", "Chỉ Quản trị hệ thống mở kỳ. Kỳ mở xong ở trạng thái Đã mở; bấm Bắt đầu thu để cán bộ xã lập phiếu yêu cầu thu, công ty đi thu.");
    rsPeriodLive();
  },
  periodStatus(id) {
    const p = CS_PERIODS.find(x => x.id === id);
    if (!p) return;
    const lock = p.status === "Đang thu";
    csDialog("periodStatus", id, lock ? `Khóa kỳ ${p.label}` : `Bắt đầu thu ${p.label}`, `<p>${lock ? "Sau khi khóa, không lập thêm khoản thu hay phiếu thu cho kỳ này; số liệu được giữ nguyên để đối soát." : "Kỳ chuyển sang trạng thái Đang thu và trở thành kỳ hiện tại của cán bộ xã và công ty."}</p><div class="form-grid">${csField("Ghi chú", `<textarea class="control" id="rsPdNote" placeholder="Không bắt buộc"></textarea>`, true)}</div>`, lock ? "Khóa kỳ" : "Bắt đầu thu");
  },
  backupNow() {
    csDialog("backupNow", "", "Sao lưu ngay", `<div class="form-grid">
      ${csField("Phạm vi *", csSelect('id="rsBkScope"', [["Toàn bộ cơ sở dữ liệu", "Toàn bộ cơ sở dữ liệu"], ["Cấu hình hệ thống", "Cấu hình hệ thống"], ["Dữ liệu kỳ 09/2026", "Dữ liệu kỳ 09/2026"]], "Toàn bộ cơ sở dữ liệu"))}
      ${csField("Loại *", csSelect('id="rsBkType"', [["Đầy đủ", "Đầy đủ"], ["Gia tăng", "Gia tăng"]], "Đầy đủ"))}
      ${csField("Bảo mật", `<label style="display:flex;gap:8px;align-items:center;min-height:36px"><input type="checkbox" checked> Mã hóa tệp sao lưu</label>`, true)}
    </div>`, "Bắt đầu sao lưu");
  },
  restoreTest(id) {
    csDialog("restoreTest", id, `Kiểm tra phục hồi · ${id}`, `<p>Phục hồi bản sao lưu vào môi trường kiểm thử và so khớp checksum. Không ảnh hưởng dữ liệu đang vận hành.</p>`, "Chạy kiểm tra");
  }
};

const RS_SUBMIT = {
  coUpdate() {
    const r = rsRows().find(x => x.charge === csFormValue("rsCoCharge"));
    if (!r) return "";
    const result = csFormValue("rsCoResult");
    const paid = result === "paid";
    const method = csFormValue("rsCoMethod") === "Chuyển khoản" || csFormValue("rsCoMethod") === "Ứng dụng người dân" ? "Chuyển khoản" : "Tiền mặt";
    Object.assign(r, { status: result, note: paid ? "" : csFormValue("rsCoNote") || RS_STATUS[result][0], amount: paid ? Number(csFormValue("rsCoAmount")) || r.amount : r.amount, confirmedBy: paid ? csFormValue("rsCoCollector") : "", method: paid ? method : "", confirmedAt: paid ? csIsoToVi(csFormValue("rsCoDate")) : "", receipt: paid ? r.receipt || rsNextReceipt(r.period) : "" });
    if (paid) rsCommitPaid(r); else r.src.note = r.note;
    return `Đã cập nhật ${r.name}: ${RS_STATUS[result][0].toLowerCase()}${paid ? ` · ${rsCollector(r.confirmedBy)?.name || r.confirmedBy} xác nhận` : ""}.`;
  },
  coHandover() {
    const collector = csFormValue("rsHoCollector");
    const amount = Number(csFormValue("rsHoAmount")) || 0;
    const held = rsCashHeld(collector, rsState.period);
    if (amount > held) { showDemoNotice(`${rsCollector(collector)?.name} chỉ còn giữ ${formatMoney(Math.max(held, 0))} tiền mặt trong kỳ.`); return null; }
    const id = `BG-${rsTag(rsState.period)}-${String(rsState.seq.handover++).padStart(2, "0")}`;
    RS_HANDOVERS.push({ id, collector, period: rsState.period, date: csIsoToVi(csFormValue("rsHoDate")), amount, note: csFormValue("rsHoNote") });
    return `Đã xác nhận nhận ${formatMoney(amount)} tiền mặt từ ${rsCollector(collector)?.name}.`;
  },
  coReceiptIssue(id) {
    const r = rsReceipts().find(x => x.id === id);
    if (!r) return "";
    const correct = Number(csFormValue("rsRiAmount"));
    RS_RECEIPT_ISSUES[r.id] = `${csFormValue("rsRiType")}${correct && correct !== r.amount ? ` · số đúng ${formatMoney(correct)}` : ""} · ${csFormValue("rsRiNote")}`;
    return `Đã gửi báo sai sót ${r.id} về xã.`;
  },
  coComplaint(id) {
    const c = CS_COMPLAINTS.find(x => x.id === id);
    if (!c || c.status === "done") return "";
    Object.assign(c, { status: csFormValue("rsCpStatus"), result: `Công ty: ${csFormValue("rsCpReply")}`, reply: { by: csFormValue("rsCpBy"), date: rsToday } });
    return `Đã gửi phản hồi ${c.id} về xã: ${RS_COMPLAINT_STATUS[c.status][0].toLowerCase()}.`;
  },
  clUpdate() {
    const r = rsRows().find(x => x.charge === csFormValue("rsClCharge"));
    if (!r) return "";
    const result = csFormValue("rsClResult");
    const next = csIsoToVi(csFormValue("rsClNext"));
    const note = csFormValue("rsClNote");
    if (result === "cash" || result === "transfer") {
      // Xác nhận đã thanh toán: xuất biên lai ngay, công ty thấy tài khoản nào đã xác nhận.
      Object.assign(r, { status: "paid", note: "", method: result === "cash" ? "Tiền mặt" : "Chuyển khoản", confirmedBy: RS_ME.username, confirmedAt: rsToday, amount: Number(csFormValue("rsClAmount")) || r.amount, receipt: rsNextReceipt(r.period) });
      rsCommitPaid(r);
      rsState.afterSubmit = () => RS_DIALOGS.clReceipt(r.charge);
      return `Đã thu ${r.name} · đã xuất biên lai ${r.receipt}.`;
    }
    const [status, text] = { absent: ["absent", `Đã ghé ${rsToday}${next ? ` · quay lại ${next}` : ""}`], appointment: ["appointment", next ? `Hẹn ${next}` : "Đã hẹn lại"], refused: ["unpaid", "Hộ từ chối nộp"] }[result];
    Object.assign(r, { status, note: note ? `${text} · ${note}` : text });
    r.src.note = r.note;
    return `Đã cập nhật ${r.name}: ${RS_STATUS[status][0].toLowerCase()}.`;
  },
  clReceipt(chargeId) { return `Đã mô phỏng gửi lại biên lai ${rsRows().find(x => x.charge === chargeId)?.receipt || ""} cho hộ qua Zalo/SMS.`; },
  userEdit(id) {
    const data = { name: csFormValue("rsUsName"), organization: csFormValue("rsUsOrg"), roles: csFormValue("rsUsRole"), status: csFormValue("rsUsStatus") };
    if (data.roles === "Công ty môi trường") {
      const comp = MANAGEMENT_UNITS.find(m => m.name === data.organization);
      if (comp) rsSetCompany(comp.id);
    }
    const u = RS_USERS.find(x => x.username === id);
    if (u) { Object.assign(u, data); return `Đã cập nhật tài khoản ${id}.`; }
    const username = csFormValue("rsUsUsername");
    if (RS_USERS.some(x => x.username === username)) { showDemoNotice("Tên đăng nhập đã tồn tại."); return null; }
    RS_USERS.unshift({ username, ...data, lastLogin: "Chưa đăng nhập" });
    return `Đã tạo tài khoản ${username}.`;
  },
  roleEdit(name) {
    const r = RS_ROLES.find(x => x.name === name);
    if (!r) return "";
    r.scope = csFormValue("rsRlScope");
    document.querySelectorAll("[data-rs-perm]").forEach(box => { r.perms[box.dataset.rsPerm] = box.checked; });
    return `Đã lưu quyền vai trò ${name}.`;
  },
  districtEdit(code) {
    const data = { name: csFormValue("rsDtName"), groups: Number(csFormValue("rsDtGroups")) || 0, note: csFormValue("rsDtNote") };
    const d = RS_DISTRICTS.find(x => x.code === code);
    if (d) { Object.assign(d, data); return `Đã cập nhật địa bàn ${d.name}.`; }
    RS_DISTRICTS.push({ code: csFormValue("rsDtCode").toUpperCase(), subjects: 0, ...data });
    return `Đã thêm địa bàn ${data.name}.`;
  },
  tariffEdit(code) {
    const money = key => `${(Number(csFormValue(key)) || 0).toLocaleString("vi-VN")}đ`;
    const data = { legal: csFormValue("rsTfLegal"), scope: csFormValue("rsTfScope"), collection: money("rsTfCollection"), transport: money("rsTfTransport"), processing: money("rsTfProcessing"), effective: `${csIsoToVi(csFormValue("rsTfFrom"))} – ${csIsoToVi(csFormValue("rsTfTo"))}`, status: csFormValue("rsTfStatus") };
    const t = RS_TARIFFS.find(x => x.code === code);
    if (t) { Object.assign(t, data); return `Đã cập nhật biểu giá ${code}.`; }
    RS_TARIFFS.unshift({ code: csFormValue("rsTfCode"), ...data }); rsState.seq.tariff++;
    return `Đã thêm phiên bản ${csFormValue("rsTfCode")}.`;
  },
  periodCreate() {
    const id = csFormValue("rsPdPeriod");
    if (!id || CS_PERIODS.some(p => p.id === id)) { showDemoNotice("Kỳ này đã tồn tại."); return null; }
    const quarter = csIsQuarter(id);
    CS_PERIODS.unshift({ id, label: quarter ? csQuarterLabel(id) : `Tháng ${csPeriodLabel(id)}`, open: csIsoToVi(csFormValue("rsPdOpen")), due: csIsoToVi(csFormValue("rsPdDue")), legal: csFormValue("rsPdLegal"), status: "Đã mở", note: csFormValue("rsPdNote") });
    return `Đã mở kỳ ${quarter ? csQuarterLabel(id) : csPeriodLabel(id)}. Bấm "Bắt đầu thu" khi sẵn sàng.`;
  },
  periodStatus(id) {
    const p = CS_PERIODS.find(x => x.id === id);
    if (!p) return "";
    if (p.status === "Đang thu") {
      const owing = MANAGEMENT_UNITS.filter(u => csCompanyDue(u.id, id) - csCompanyReceived(u.id, id) > 0);
      if (owing.length) { showDemoNotice(`Chưa khóa được ${p.label}: ${owing.length} công ty chưa nộp đủ (${owing.slice(0, 3).map(u => u.name).join(", ")}${owing.length > 3 ? "…" : ""}). Nhắc nộp tại Khoản thu.`); return null; }
      p.status = "Đã khóa"; return `Đã khóa kỳ ${p.label}.`;
    }
    // Kỳ cũ vẫn Đang thu cho tới khi công ty nộp đủ; chỉ đổi kỳ đang xem sang kỳ mới.
    p.status = "Đang thu"; csState.period = p.id; rsState.period = csPeriodLabel(p.id);
    return `${p.label} đã bắt đầu thu.`;
  },
  backupNow() {
    const id = `backup-20260917-${String(1030 + rsState.seq.backup++ * 5).padStart(4, "0")}`;
    RS_BACKUPS.unshift({ id, time: `17/09/2026 ${id.slice(-4, -2)}:${id.slice(-2)}`, type: `Thủ công · ${csFormValue("rsBkType").toLowerCase()} · ${csFormValue("rsBkScope").toLowerCase()}`, size: csFormValue("rsBkType") === "Đầy đủ" ? "1,8 GB" : "96 MB", check: "Checksum OK", status: "Thành công" });
    return `Đã tạo ${id}.`;
  },
  restoreTest(id) { return `Đã mô phỏng phục hồi ${id} vào môi trường kiểm thử: checksum khớp.`; },
  company(id) {
    const data = { name: csFormValue("csCoName"), contact: csFormValue("csCoContact"), phone: csFormValue("csCoPhone"), status: csFormValue("csCoStatus") };
    const u = csUnit(id);
    if (u) { Object.assign(u, data); return "Đã cập nhật đơn vị."; }
    MANAGEMENT_UNITS.push({ id: `DV${String(csState.seq.company++).padStart(2, "0")}`, ...data });
    return `Đã thêm đơn vị ${data.name}.`;
  }
};

const rsPreviousSubmit = handleCommuneSimpleSubmit;
handleCommuneSimpleSubmit = function () {
  const kind = csState.dialog?.kind;
  if (activeDialogAction !== "cs" || !RS_SUBMIT[kind] || currentRole === "commune") return rsPreviousSubmit();
  if (!document.getElementById("dialogForm").reportValidity()) return true;
  const message = RS_SUBMIT[kind](csState.dialog.id);
  if (message === null) return true;
  closeDemoModal();
  renderCurrentView();
  if (message) showDemoNotice(message);
  // Ví dụ: mở biên lai vừa xuất ngay sau khi người thu xác nhận đã thanh toán.
  const after = rsState.afterSubmit;
  rsState.afterSubmit = null;
  if (after) after();
  return true;
};

document.addEventListener("click", event => {
  const button = event.target.closest("[data-rs]");
  if (!button || !["company", "collector", "administrator"].includes(currentRole)) return;
  const { rs: action, id } = button.dataset;
  if (action === "coFilterCollector") {
    const select = document.querySelector('[data-table-key="collector"]');
    if (!select) return;
    select.value = id;
    applyTableFilter(select.closest("[data-table-filter]"));
    select.closest("[data-table-filter]").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (RS_DIALOGS[action]) RS_DIALOGS[action](id || "");
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-rs-filter]")) { rsState[event.target.dataset.rsFilter] = event.target.value; renderCurrentView({ keepFocus: true }); return; }
  if (csState.dialog?.kind === "coUpdate" && event.target.id === "rsCoCharge") {
    const r = rsRows().find(x => x.charge === event.target.value);
    if (r) { document.getElementById("rsCoAmount").value = r.amount; document.getElementById("rsCoRef").value = `${r.charge} · ${r.request}`; document.getElementById("rsCoCollector").value = r.collector; }
  }
  if (csState.dialog?.kind === "periodCreate" && event.target.id === "rsPdKind") {
    const select = document.getElementById("rsPdPeriod");
    select.innerHTML = rsPeriodChoices(event.target.value).map(([v, l]) => `<option value="${v}">${l}</option>`).join("");
    rsPeriodLive();
  }
  if (csState.dialog?.kind === "periodCreate" && event.target.id === "rsPdPeriod") rsPeriodLive();
  if (csState.dialog?.kind === "coHandover" && event.target.id === "rsHoCollector") document.getElementById("rsHoAmount").value = Math.max(rsCashHeld(event.target.value, rsState.period), 0);
  if (csState.dialog?.kind === "clUpdate" && event.target.id === "rsClCharge") {
    const r = rsRows().find(x => x.charge === event.target.value);
    if (r) { document.getElementById("rsClAmount").value = r.amount; document.getElementById("rsClRef").value = `${r.charge} · ${r.request}`; }
  }
});
