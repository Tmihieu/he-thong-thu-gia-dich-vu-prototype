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
const CS_PERIODS = [
  { id: "2026-09", label: "Tháng 09/2026", open: "01/09/2026", due: "30/09/2026", legal: "QĐ 65/2026/QĐ-UBND", status: "Đang thu" },
  { id: "2026-08", label: "Tháng 08/2026", open: "01/08/2026", due: "31/08/2026", legal: "QĐ 67/2025/QĐ-UBND", status: "Đã khóa" }
];
const CS_SUBJECTS = [
  { code: "DTH-H000128", name: "Nguyễn Văn Minh", type: "Hộ gia đình", address: "12/5 Đặng Thúc Vịnh", phone: "0903 218 128", area: "KV07", contract: "HĐ-DTH-0128", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000131", name: "Trần Thị Ánh", type: "Hộ gia đình", address: "12/8 Đặng Thúc Vịnh", phone: "0937 550 131", area: "KV07", contract: "HĐ-DTH-0131", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000149", name: "Võ Quốc Khánh", type: "Hộ gia đình", address: "16/2 Đặng Thúc Vịnh", phone: "0906 771 149", area: "KV07", contract: "HĐ-DTH-0149", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "DTH-H000305", name: "Trần Thị Hồng", type: "Hộ gia đình", address: "41/2 Nguyễn Ảnh Thủ", phone: "0908 114 305", area: "KV04", contract: "HĐ-DTH-0305", contractFrom: "01/03/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "DTH-H000662", name: "Phan Văn Thắng", type: "Hộ gia đình", address: "22/9 Đặng Thúc Vịnh", phone: "0918 402 662", area: "KV07", contract: "HĐ-DTH-0662", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "pending", note: "Đề nghị tạm ngưng · nợ 3 kỳ" },
  { code: "DTH-KD00077", name: "Quán ăn Hương Việt", type: "Hộ kinh doanh", address: "21 Đặng Thúc Vịnh", phone: "0902 441 077", area: "KV07", contract: "HĐ-DTH-KD77", contractFrom: "01/06/2026", tariff: "Chủ nguồn thải nhỏ", status: "active" },
  { code: "DTH-H001152", name: "Lê Quốc Bảo", type: "Hộ gia đình", address: "7/11 Lê Văn Khương", phone: "0973 458 152", area: "KV06", contract: "HĐ-DTH-1152", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "ended", note: "Chấm dứt 31/08/2026" },
  { code: "TTT-H000215", name: "Bùi Thị Yến", type: "Hộ gia đình", address: "19/8 Tô Ký", phone: "0939 660 215", area: "KV02", contract: "HĐ-TTT-0215", contractFrom: "01/01/2026", tariff: "HGĐ ≤ 2 người", status: "active" },
  { code: "TTT-KD00142", name: "Tạp hóa Minh Châu", type: "Hộ kinh doanh", address: "96 Trịnh Thị Miếng", phone: "0917 602 142", area: "KV11", contract: "—", contractFrom: "", tariff: "Chủ nguồn thải nhỏ", status: "pending", note: "Chờ phân loại · chưa có hợp đồng" },
  { code: "TTT-H001921", name: "Nguyễn Thị Mai", type: "Hộ gia đình", address: "35 Song Hành", phone: "0938 447 921", area: "KV08", contract: "HĐ-TTT-1921", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" },
  { code: "NB-DN00038", name: "Công ty TNHH Nam An", type: "Doanh nghiệp", address: "18 Hà Huy Giáp", phone: "028 3891 0038", area: "KV03", contract: "HĐ-NB-0038", contractFrom: "01/01/2026", tariff: "Theo khối lượng", status: "active" },
  { code: "NB-H000482", name: "Trần Quốc Phúc", type: "Hộ gia đình", address: "120 Nguyễn Văn Bứa", phone: "0902 811 482", area: "KV09", contract: "HĐ-NB-0482", contractFrom: "01/01/2026", tariff: "HGĐ ≥ 3 người", status: "active" }
];
const CS_SUBJECT_STATUS = { active: ["Đang cung cấp", "success"], pending: ["Chờ xử lý", "warning"], ended: ["Đã chấm dứt", "neutral"] };
const CS_CHARGE_STATUS = { unpaid: ["Chưa thu", "warning"], overdue: ["Quá hạn", "danger"], paid: ["Đã thu", "success"] };
const CS_COMPLAINT_STATUS = { new: ["Mới tiếp nhận", "warning"], processing: ["Đang xử lý", "info"], done: ["Đã giải quyết", "success"] };

const CS_CHARGES = [];
(function seedCharges() {
  const overdue08 = ["DTH-H000131", "DTH-H000662", "TTT-H001921", "NB-H000482"];
  const paid09 = { "DTH-H000128": ["12/09/2026", "Chuyển khoản"], "DTH-H000305": ["13/09/2026", "Tiền mặt"], "DTH-KD00077": ["12/09/2026", "Chuyển khoản"], "DTH-H000149": ["15/09/2026", "Tiền mặt"] };
  let seq = 1;
  CS_SUBJECTS.filter(s => s.status !== "ended" && s.contract !== "—").forEach(s => {
    const amount = CS_TARIFFS[s.tariff];
    const suffix = s.code.split("-")[1];
    const paid08 = !overdue08.includes(s.code);
    CS_CHARGES.push({ id: `KT-0826-${suffix}`, request: "YCT-0826-01", subject: s.code, period: "2026-08", due: "31/08/2026", amount, status: paid08 ? "paid" : "overdue", receipt: paid08 ? `PT-0826-${String(seq++).padStart(4, "0")}` : "", paidAt: paid08 ? "20/08/2026" : "", method: paid08 ? "Tiền mặt" : "" });
    const p = paid09[s.code];
    CS_CHARGES.push({ id: `KT-0926-${suffix}`, request: "YCT-0926-01", subject: s.code, period: "2026-09", due: "30/09/2026", amount, status: p ? "paid" : "unpaid", receipt: p ? `PT-0926-${String(seq++).padStart(4, "0")}` : "", paidAt: p ? p[0] : "", method: p ? p[1] : "" });
  });
  CS_CHARGES.sort((a, b) => b.period.localeCompare(a.period) || a.subject.localeCompare(b.subject));
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

const csState = { period: "2026-09", company: "all", companyId: null, dialog: null, seq: { receipt: 30, request: 2, complaint: 15, company: MANAGEMENT_UNITS.length + 1, subject: 1 } };

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
const csIsQuarter = id => String(id).includes("-Q");
const csQuarterMonths = id => { const [y, q] = id.split("-Q").map(Number); return [0, 1, 2].map(i => `${y}-${String((q - 1) * 3 + 1 + i).padStart(2, "0")}`); };
const csQuarterLabel = id => { const [y, q] = id.split("-Q").map(Number); return `Quý ${q}/${y} · tháng ${(q - 1) * 3 + 1}–${q * 3}`; };
const csLastDay = (y, m) => `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
const csPeriodDue = id => csIsQuarter(id) ? csLastDay(Number(id.slice(0, 4)), Number(id.split("-Q")[1]) * 3) : csLastDay(Number(id.slice(0, 4)), Number(id.slice(5, 7)));
const csMonthPeriods = () => CS_PERIODS.filter(p => !csIsQuarter(p.id));
function csQuarterOptions() {
  let y = Number(csState.period.slice(0, 4));
  let q = csIsQuarter(csState.period) ? Number(csState.period.split("-Q")[1]) : Math.ceil(Number(csState.period.slice(5, 7)) / 3);
  return Array.from({ length: 5 }, () => { const id = `${y}-Q${q}`; if (q === 4) { q = 1; y++; } else q++; return [id, csQuarterLabel(id)]; });
}
const csScopeOptions = () => [["all", "Toàn xã"], ...MANAGEMENT_UNITS.map(u => [`unit:${u.id}`, `Công ty · ${u.name}`]), ...MANAGEMENT_AREAS.map(a => [`area:${a.id}`, `Khu vực · ${csAreaName(a.id)}`])];
const csScopeMatch = (subject, scope) => !scope || scope === "all" ? true : scope.startsWith("unit:") ? csArea(subject.area)?.unit === scope.slice(5) : subject.area === scope.replace("area:", "");
const csChargeAmount = (subject, period) => CS_TARIFFS[subject.tariff] * (csIsQuarter(period) ? 3 : 1);

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
  const periodRows = CS_PERIODS.map(p => `<tr><td><span class="cell-title">${p.label}</span></td><td>${p.open} → ${p.due}</td><td>${p.legal}</td><td>${badge(p.status, p.status === "Đang thu" ? "success" : p.status === "Đã khóa" ? "neutral" : "info")}</td><td>${p.status === "Đã khóa" ? "" : `<button type="button" class="button button-small" data-action="go:charges">Xem khoản thu</button>`}</td></tr>`);
  return `${csHeader("Đối tượng & hợp đồng", csBtn("Mở kỳ thu", "openPeriod") + csBtn("+ Thêm đối tượng", "addSubject", "", "primary"))}
  ${panel("Kỳ thu", "", table(["Kỳ", "Thời gian thu", "Căn cứ giá", "Trạng thái", ""], periodRows, { static: true }))}
  <div class="stack-gap"></div>
  <section data-table-filter data-chip-key="group" data-count-label="đối tượng">
    ${filterBar(filterField("Loại", filterSelect("type", [["all", "Tất cả loại"], ["Hộ gia đình", "Hộ gia đình"], ["Hộ kinh doanh", "Hộ kinh doanh"], ["Doanh nghiệp", "Doanh nghiệp"]])) + filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(a => [a, csAreaName(a)])])), "Mã, tên, địa chỉ, điện thoại, số hợp đồng...")}
    ${chipBar([["all", "Tất cả"], ["active", "Đang cung cấp", "success"], ["pending", "Chờ xử lý", "warning"], ["ended", "Đã chấm dứt"]], "đối tượng")}
    ${panel("Danh sách đối tượng", "", table(["Mã", "Đối tượng", "Khu vực · công ty", "Hợp đồng", { label: "Mức / kỳ", num: true }, "Trạng thái", ""], rows, { empty: "Không có đối tượng phù hợp." }))}
  </section>`;
}

// ---------- 2. Khoản thu ----------
function csCharges() {
  const current = CS_CHARGES.filter(c => c.period === csState.period);
  const sum = list => list.reduce((t, c) => t + c.amount, 0);
  const paid = current.filter(c => c.status === "paid");
  const overdue = CS_CHARGES.filter(c => c.status === "overdue");
  const areas = [...new Set(CS_CHARGES.map(c => csSubject(c.subject)?.area))].filter(Boolean).sort();
  const rows = CS_CHARGES.map(c => {
    const s = csSubject(c.subject) || { name: c.subject, address: "", area: "" };
    const [label, tone] = CS_CHARGE_STATUS[c.status];
    return `<tr data-row data-group="${c.status}" data-period="${c.period}" data-area="${s.area}" data-search="${escapeHtml(`${c.id} ${c.request} ${c.receipt} ${c.subject} ${s.name} ${s.address}`.toLowerCase())}" class="${c.status === "overdue" ? "is-attention" : ""}">
      <td><span class="cell-title">${c.id}</span><span class="cell-subtitle">${c.request}</span></td>
      <td><span class="cell-title">${escapeHtml(s.name)}</span><span class="cell-subtitle">${c.subject} · ${csAreaName(s.area)}</span></td>
      <td>${csPeriodLabel(c.period)}</td>
      <td>${c.due}</td>
      <td class="money">${formatMoney(c.amount)}</td>
      <td>${badge(label, tone)}</td>
      <td>${c.receipt ? `<span class="cell-title">${c.receipt}</span><span class="cell-subtitle">${c.paidAt} · ${c.method}</span>` : "—"}</td>
      <td>${c.status === "paid" ? csBtn("Xem phiếu thu", "viewReceipt", c.id, "secondary", true) : csBtn("Tạo phiếu thu", "receipt", c.id, "primary", true)}</td></tr>`;
  });
  return `${csHeader("Khoản thu", csBtn("Tạo phiếu yêu cầu thu", "chargeRequest") + csBtn("Tạo phiếu thu", "receipt", "", "primary"))}
  ${summaryStrip([[`Phải thu kỳ ${csPeriodLabel(csState.period)}`, formatMoney(sum(current)), `${current.length} khoản`], ["Đã thu", formatMoney(sum(paid)), `${paid.length} phiếu thu`], ["Còn phải thu", formatMoney(sum(current) - sum(paid)), `${current.length - paid.length} khoản`], ["Quá hạn kỳ trước", formatMoney(sum(overdue)), `${overdue.length} khoản`]])}
  <section data-table-filter data-chip-key="group" data-count-label="khoản">
    ${filterBar(filterField("Kỳ thu", filterSelect("period", [["all", "Tất cả kỳ"], ...CS_PERIODS.map(p => [p.id, p.label])], csState.period)) + filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(a => [a, csAreaName(a)])])), "Mã khoản, phiếu, tên, mã hộ...")}
    ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["paid", "Đã thu", "success"]], "khoản")}
    ${panel("Danh sách khoản thu", "", table(["Mã khoản / phiếu YC", "Đối tượng", "Kỳ", "Hạn nộp", { label: "Số tiền", num: true }, "Trạng thái", "Phiếu thu", ""], rows, { empty: "Không có khoản thu phù hợp." }))}
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
      <td>${unit ? `${csIsoToVi(a.start)} → ${csIsoToVi(a.end)}` : "—"}</td></tr>`;
  });
  const missing = MANAGEMENT_AREAS.filter(a => !a.unit).length;
  return `${csHeader("Danh sách khu vực", "", `${MANAGEMENT_AREAS.length} tổ dân phố · ${missing ? `${missing} tổ chưa có công ty phụ trách` : "đã phân công đủ"} · phân công tại trang Công ty môi trường`)}
  <section data-table-filter data-chip-key="group" data-count-label="khu vực">
    ${filterBar(filterField("Công ty phụ trách", filterSelect("unit", [["all", "Tất cả công ty"], ["none", "Chưa phân công"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])])), "Tên tổ, mã khu vực, tên công ty...")}
    ${chipBar([["all", "Tất cả"], ["assigned", "Đã phân công", "success"], ["unassigned", "Chưa phân công", "warning"]], "khu vực")}
    ${panel("Khu vực", "", table(["Khu vực", { label: "Số hộ", num: true }, "Công ty phụ trách", "Hiệu lực"], rows, { empty: "Không có khu vực phù hợp." }))}
  </section>`;
}

// ---------- 4. Công ty môi trường ----------
function csCompanies() {
  const rows = MANAGEMENT_UNITS.map(u => {
    const areas = MANAGEMENT_AREAS.filter(a => a.unit === u.id);
    const progress = areas.map(a => csAreaProgress(a.id, "2026-09"));
    const due = progress.reduce((t, r) => t + r.due, 0), paid = progress.reduce((t, r) => t + r.paid, 0);
    const rate = due ? paid / due * 100 : 0;
    return `<tr data-row data-group="${u.status === "inactive" ? "inactive" : "active"}" data-search="${escapeHtml(`${u.id} ${u.name} ${u.contact} ${u.phone}`.toLowerCase())}">
      <td>${csLink(u.name, "company", u.id)}<span class="cell-subtitle">${u.id}</span></td>
      <td><span class="cell-title">${escapeHtml(u.contact)}</span><span class="cell-subtitle">${escapeHtml(u.phone)}</span></td>
      <td class="num">${areas.length}</td>
      <td class="num">${areas.reduce((t, a) => t + a.households, 0).toLocaleString("vi-VN")}</td>
      <td>${areas.length ? `<div class="cell-progress">${progressBar(rate, rate < 45 ? "warning" : "")}<span class="num">${rate.toFixed(0)}%</span></div>` : "—"}</td>
      <td>${badge(u.status === "inactive" ? "Tạm ngưng" : "Hoạt động", u.status === "inactive" ? "neutral" : "success")}</td>
      <td>${csBtn("Chi tiết", "company", u.id, "secondary", true)}</td></tr>`;
  });
  return `${csHeader("Công ty môi trường", csBtn("+ Thêm công ty", "addCompany", "", "primary"))}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    ${filterBar("", "Tên công ty, đầu mối, điện thoại...")}
    ${chipBar([["all", "Tất cả"], ["active", "Hoạt động", "success"], ["inactive", "Tạm ngưng"]], "công ty")}
    ${panel("Danh sách công ty", "", table(["Công ty", "Đầu mối", { label: "Khu vực", num: true }, { label: "Số hộ", num: true }, "Tiến độ kỳ 09/2026", "Trạng thái", ""], rows, { empty: "Không có công ty phù hợp." }))}
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
  return `${csHeader(escapeHtml(u.name), csBtn("← Danh sách công ty", "back") + csBtn("Sửa thông tin", "editCompany", u.id) + csBtn("+ Phân công khu vực", "assignAreas", u.id, "primary"), `${u.id} · Đầu mối: ${escapeHtml(u.contact)} · ${escapeHtml(u.phone)} · ${u.status === "inactive" ? "Tạm ngưng" : "Hoạt động"}`)}
  ${summaryStrip([["Khu vực phụ trách", String(areas.length), `${areas.reduce((t, a) => t + a.households, 0).toLocaleString("vi-VN")} hộ`], ["Phải thu kỳ 09/2026", formatMoney(due), ""], ["Đã thu", formatMoney(paid), due ? `${(paid / due * 100).toFixed(0)}% phải thu` : ""], ["Khiếu nại đang mở", String(complaints), complaints ? "Xem tại Danh sách khiếu nại" : ""]])}
  ${panel("Khu vực phụ trách", areas.length ? "Một khu vực chỉ có một công ty phụ trách trong cùng thời gian hiệu lực." : "", areas.length ? table(["Khu vực", { label: "Số hộ", num: true }, "Hiệu lực", { label: "Phải thu 09/2026", num: true }, { label: "Đã thu", num: true }, "Tiến độ", ""], rows, { static: true }) : `<div class="empty-state"><strong>Chưa được giao khu vực</strong><p>Bấm “Phân công khu vực” để chọn tổ dân phố cho công ty này.</p></div>`)}`;
}

// ---------- 5. Báo cáo tiến độ thu tiền ----------
function csProgress() {
  const groups = csCompanyProgress(csState.period);
  const visible = csState.company === "all" ? groups : groups.filter(g => (g.unit.id || "none") === csState.company);
  const sum = key => visible.reduce((t, g) => t + g[key], 0);
  const due = sum("due"), paid = sum("paid");
  const progressCell = (p, d) => { const rate = d ? p / d * 100 : 0; return `<div class="cell-progress">${progressBar(rate, rate < 45 ? "warning" : "")}<span class="num">${rate.toFixed(1)}%</span></div>`; };
  const rows = csState.company === "all"
    ? visible.map(g => `<tr class="${g.unit.id ? "" : "is-attention"}"><td>${g.unit.id ? csLink(g.unit.name, "company", g.unit.id) : "<strong>Chưa phân công</strong>"}<span class="cell-subtitle">${g.rows.length} khu vực · ${g.households.toLocaleString("vi-VN")} hộ</span></td><td class="money">${formatMoney(g.due)}</td><td class="money">${formatMoney(g.paid)}</td><td class="money">${formatMoney(g.due - g.paid)}</td><td>${progressCell(g.paid, g.due)}</td><td>${g.unit.id ? csBtn("Nhắc công ty", "notify", g.unit.id, "secondary", true) : csBtn("Phân công", "goCompanies", "", "secondary", true)}</td></tr>`)
    : visible.flatMap(g => g.rows.map(r => `<tr><td><span class="cell-title">${csAreaName(r.area.id)}</span><span class="cell-subtitle">${r.area.households.toLocaleString("vi-VN")} hộ</span></td><td class="money">${formatMoney(r.due)}</td><td class="money">${formatMoney(r.paid)}</td><td class="money">${formatMoney(r.due - r.paid)}</td><td>${progressCell(r.paid, r.due)}</td><td></td></tr>`));
  return `${csHeader("Báo cáo tiến độ thu tiền", actionButton("Xuất Excel", "exportData"))}
  <div class="filter-bar">${filterField("Kỳ thu", csSelect('data-cs-filter="period"', CS_PERIODS.map(p => [p.id, p.label]), csState.period))}${filterField("Công ty", csSelect('data-cs-filter="company"', [["all", "Tất cả công ty"], ["none", "Chưa phân công"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], csState.company))}</div>
  ${summaryStrip([["Phải thu", formatMoney(due), `${visible.reduce((t, g) => t + g.households, 0).toLocaleString("vi-VN")} hộ`], ["Đã thu", formatMoney(paid), "Theo công ty báo cáo"], ["Còn phải thu", formatMoney(due - paid), ""], ["Tỷ lệ thu", due ? `${(paid / due * 100).toFixed(1)}%` : "—", `Hạn thu ${CS_PERIODS.find(p => p.id === csState.period)?.due || ""}`]])}
  ${panel(csState.company === "all" ? "Theo công ty" : `Theo khu vực · ${csState.company === "none" ? "Chưa phân công" : escapeHtml(csUnit(csState.company)?.name || "")}`, "", rows.length ? table([csState.company === "all" ? "Công ty" : "Khu vực", { label: "Phải thu", num: true }, { label: "Đã thu", num: true }, { label: "Còn phải thu", num: true }, "Tiến độ", ""], rows, { static: true }) : '<p class="table-empty">Không có dữ liệu trong phạm vi đã chọn.</p>')}`;
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
  DIALOG_SPECS.cs = { eyebrow: "Cán bộ xã", title, description, fields: [], confirm };
  openDemoModal("cs");
  const host = document.getElementById("dialogBody");
  host.innerHTML = body;
  const button = document.getElementById("dialogConfirm");
  button.hidden = !confirm;
  const first = host.querySelector("input:not([readonly]):not([type=checkbox]), select, textarea");
  if (first) setTimeout(() => first.focus(), 50);
}

const CS_DIALOGS = {
  openPeriod() {
    const last = csMonthPeriods().map(p => p.id).sort().pop();
    const [y, m] = last.split("-").map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
    const [ny, nm] = next.split("-").map(Number);
    const lastDay = new Date(ny, nm, 0).getDate();
    csDialog("openPeriod", next, "Mở kỳ thu", `<div class="form-grid">
      ${csField("Kỳ thu", csInput("csPeriodLabel", `Tháng ${csPeriodLabel(next)}`, "text", "readonly"))}
      ${csField("Căn cứ giá", csSelect('id="csPeriodLegal"', [["QĐ 65/2026/QĐ-UBND", "QĐ 65/2026/QĐ-UBND"], ["QĐ 67/2025/QĐ-UBND", "QĐ 67/2025/QĐ-UBND"]], "QĐ 65/2026/QĐ-UBND"))}
      ${csField("Ngày mở", csInput("csPeriodOpen", `${next}-01`, "date", "required"))}
      ${csField("Hạn nộp", csInput("csPeriodDue", `${next}-${lastDay}`, "date", "required"))}
      ${csField("Ghi chú", `<textarea class="control" id="csPeriodNote" placeholder="Không bắt buộc"></textarea>`, true)}
    </div>`, "Mở kỳ", `${CS_SUBJECTS.filter(s => s.status === "active").length} đối tượng đang cung cấp dịch vụ sẽ được lập khoản thu khi tạo phiếu yêu cầu thu.`);
  },
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
    const months = csMonthPeriods().filter(p => p.status !== "Đã khóa");
    const quarters = csQuarterOptions();
    const quarter = csIsQuarter(csState.period);
    const monthValue = quarter ? (months[0] && months[0].id) || "" : csState.period;
    // Mặc định chọn quý gần nhất còn đối tượng chưa được lập khoản.
    const openQuarter = quarter ? csState.period : (quarters.find(([id]) => csRequestTargets(id, "all", "").length) || quarters[0])[0];
    csState.reqDueFor = null;
    csDialog("chargeRequest", "", "Tạo phiếu yêu cầu thu", `<div class="form-grid">
      ${csField("Chu kỳ thu *", csSelect('id="csReqCycle"', [["month", "Theo tháng"], ["quarter", "Theo quý · nộp 1 lần cho 3 tháng"]], quarter ? "quarter" : "month"))}
      <div id="csReqMonthWrap"${quarter ? " hidden" : ""}>${csField("Kỳ thu *", csSelect('id="csReqPeriod"', months.map(p => [p.id, p.label]), monthValue))}</div>
      <div id="csReqQuarterWrap"${quarter ? "" : " hidden"}>${csField("Quý thu *", csSelect('id="csReqQuarter"', quarters, openQuarter))}</div>
      ${csField("Hạn nộp *", csInput("csReqDue", "", "date", "required"))}
      ${csField("Phạm vi *", csSelect('id="csReqScope"', csScopeOptions(), "all"), true)}
      ${csField("Hoặc một đối tượng", csSelect('id="csReqSubject"', [["", "— Theo phạm vi —"], ...CS_SUBJECTS.filter(s => s.status === "active").map(s => [s.code, `${s.code} · ${s.name}`])], ""), true)}
      ${csField("Ghi chú", `<textarea class="control" id="csReqNote" placeholder="Không bắt buộc"></textarea>`, true)}
    </div><p class="muted" id="csReqPreview"></p>`, "Lập phiếu yêu cầu thu", "Chọn toàn xã, một công ty phụ trách hoặc một khu vực. Thu theo quý gộp 3 tháng vào một khoản; đối tượng đã có khoản trong cùng khoảng thời gian không bị lập trùng.");
    csRequestPreview();
  },
  receipt(chargeId) {
    const open = CS_CHARGES.filter(c => c.status !== "paid");
    const selected = open.find(c => c.id === chargeId) || open[0];
    if (!selected) { showDemoNotice("Không còn khoản thu nào chưa thu."); return; }
    csDialog("receipt", selected.id, "Tạo phiếu thu", `<div class="form-grid">
      ${csField("Khoản thu *", csSelect('id="csRcChargeId"', open.map(c => [c.id, `${c.id} · ${csSubject(c.subject)?.name || c.subject} · ${csPeriodLabel(c.period)} · ${formatMoney(c.amount)}`]), selected.id), true)}
      ${csField("Số tiền *", csInput("csRcAmount", String(selected.amount), "number", 'min="1" required'))}
      ${csField("Hình thức *", csSelect('id="csRcMethod"', [["Tiền mặt", "Tiền mặt"], ["Chuyển khoản", "Chuyển khoản"]], "Tiền mặt"))}
      ${csField("Ngày thu *", csInput("csRcDate", CS_TODAY, "date", "required"))}
      ${csField("Người nộp", csInput("csRcPayer", csSubject(selected.subject)?.name || ""))}
      ${csField("Ghi chú", `<textarea class="control" id="csRcNote" placeholder="Không bắt buộc"></textarea>`, true)}
    </div>`, "Lập phiếu thu");
  },
  viewReceipt(chargeId) {
    const c = CS_CHARGES.find(x => x.id === chargeId);
    if (!c) return;
    const s = csSubject(c.subject) || { name: c.subject, address: "" };
    csDialog("viewReceipt", chargeId, `Phiếu thu ${c.receipt}`, `<div class="invoice-preview">
      <div class="invoice-brand"><div><h3>UBND xã Đông Thạnh</h3><p>Phòng Kinh tế</p></div><div class="invoice-number"><h3>${c.receipt}</h3><p>Ngày ${c.paidAt}</p></div></div>
      <div class="invoice-title"><h2>Phiếu thu</h2><p>Giá dịch vụ thu gom, vận chuyển, xử lý chất thải rắn sinh hoạt</p></div>
      <p><strong>Người nộp:</strong> ${escapeHtml(s.name)} · ${c.subject}<br><strong>Địa chỉ:</strong> ${escapeHtml(s.address)}<br><strong>Hình thức:</strong> ${c.method}</p>
      <table class="invoice-lines"><thead><tr><th>Nội dung</th><th>Kỳ</th><th style="text-align:right">Số tiền</th></tr></thead><tbody><tr><td>Khoản thu ${c.id}</td><td>${csPeriodLabel(c.period)}</td><td style="text-align:right"><strong>${formatMoney(c.amount)}</strong></td></tr></tbody></table>
      <p class="muted">Người lập: Nguyễn Thu Hà · Cán bộ Phòng Kinh tế</p>
    </div>`, "In phiếu thu");
  },
  addCompany() { CS_DIALOGS.editCompany(""); },
  editCompany(id) {
    const u = csUnit(id) || { id: `DV${String(csState.seq.company).padStart(2, "0")}`, name: "", contact: "", phone: "", status: "active" };
    csDialog("company", id, id ? "Sửa thông tin công ty" : "Thêm công ty", `<div class="form-grid">
      ${csField("Mã", csInput("csCoId", u.id, "text", "readonly"))}
      ${csField("Trạng thái", csSelect('id="csCoStatus"', [["active", "Hoạt động"], ["inactive", "Tạm ngưng"]], u.status || "active"))}
      ${csField("Tên công ty *", csInput("csCoName", u.name, "text", "required"), true)}
      ${csField("Đầu mối liên hệ *", csInput("csCoContact", u.contact, "text", "required"))}
      ${csField("Điện thoại *", csInput("csCoPhone", u.phone, "tel", "required"))}
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
    csDialog("unassign", areaId, "Bỏ phân công khu vực", `<p>Bỏ <strong>${csAreaName(a.id)}</strong> (${a.households} hộ) khỏi <strong>${escapeHtml(u.name)}</strong>?</p><p class="muted">Khu vực sẽ chuyển về trạng thái chưa phân công cho đến khi giao công ty khác. Lịch sử phân công được giữ lại.</p><div class="form-grid">${csField("Lý do", `<textarea class="control" id="csUnReason" placeholder="Không bắt buộc"></textarea>`, true)}</div>`, "Bỏ phân công");
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

function csRequestCycle() {
  const cycle = csFormValue("csReqCycle") || "month";
  const monthWrap = document.getElementById("csReqMonthWrap");
  const quarterWrap = document.getElementById("csReqQuarterWrap");
  if (monthWrap) monthWrap.hidden = cycle !== "month";
  if (quarterWrap) quarterWrap.hidden = cycle !== "quarter";
  return { cycle, period: cycle === "quarter" ? csFormValue("csReqQuarter") : csFormValue("csReqPeriod") };
}
function csRequestPreview() {
  const preview = document.getElementById("csReqPreview");
  if (!preview) return;
  const { cycle, period } = csRequestCycle();
  const due = document.getElementById("csReqDue");
  if (due && csState.reqDueFor !== period) { csState.reqDueFor = period; due.value = csPeriodDue(period); }
  const targets = csRequestTargets(period, csFormValue("csReqScope"), csFormValue("csReqSubject"));
  const total = targets.reduce((sum, s) => sum + csChargeAmount(s, period), 0);
  const label = cycle === "quarter" ? `quý ${csPeriodLabel(period)} · gộp 3 tháng mỗi khoản` : `kỳ ${csPeriodLabel(period)}`;
  preview.textContent = targets.length
    ? `${targets.length} đối tượng sẽ được lập khoản ${label} · tổng ${formatMoney(total)}.`
    : `Không có đối tượng nào cần lập khoản ${label}; các đối tượng trong phạm vi đã có khoản thu.`;
}
function csRequestTargets(period, scope, single) {
  const months = csIsQuarter(period) ? csQuarterMonths(period) : [period];
  const overlaps = charge => charge.period === period || months.includes(charge.period) || (csIsQuarter(charge.period) && csQuarterMonths(charge.period).some(month => months.includes(month)));
  const taken = new Set(CS_CHARGES.filter(overlaps).map(charge => charge.subject));
  return CS_SUBJECTS.filter(s => s.status === "active" && s.contract !== "—" && (single ? s.code === single : csScopeMatch(s, scope)) && !taken.has(s.code));
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
  if (kind === "openPeriod") {
    CS_PERIODS.unshift({ id, label: `Tháng ${csPeriodLabel(id)}`, open: csIsoToVi(csFormValue("csPeriodOpen")), due: csIsoToVi(csFormValue("csPeriodDue")), legal: csFormValue("csPeriodLegal"), status: "Đã mở" });
    message = `Đã mở kỳ thu ${csPeriodLabel(id)}. Lập phiếu yêu cầu thu tại Khoản thu.`;
  } else if (kind === "subject") {
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
    const targets = csRequestTargets(period, csFormValue("csReqScope"), csFormValue("csReqSubject"));
    if (!targets.length) { showDemoNotice("Không có đối tượng nào cần lập khoản trong phạm vi đã chọn."); return true; }
    const due = csIsoToVi(csFormValue("csReqDue"));
    const tag = csIsQuarter(period) ? `Q${period.split("-Q")[1]}${period.slice(2, 4)}` : `${period.slice(5)}${period.slice(2, 4)}`;
    const request = `YCT-${tag}-${String(csState.seq.request++).padStart(2, "0")}`;
    if (csIsQuarter(period) && !CS_PERIODS.some(p => p.id === period)) {
      CS_PERIODS.unshift({ id: period, label: csQuarterLabel(period), open: csIsoToVi(`${csQuarterMonths(period)[0]}-01`), due, legal: (csMonthPeriods()[0] || {}).legal || "QĐ 65/2026/QĐ-UBND", status: "Đang thu" });
    }
    targets.forEach(s => CS_CHARGES.unshift({ id: `KT-${tag}-${s.code.split("-")[1]}`, request, subject: s.code, period, due, amount: csChargeAmount(s, period), status: "unpaid", receipt: "", paidAt: "", method: "" }));
    csState.period = period;
    message = `Đã lập phiếu ${request} cho ${targets.length} đối tượng · ${csIsQuarter(period) ? "thu theo quý" : "thu theo tháng"} ${csPeriodLabel(period)}.`;
  } else if (kind === "receipt") {
    const c = CS_CHARGES.find(x => x.id === csFormValue("csRcChargeId"));
    if (!c) return true;
    Object.assign(c, { status: "paid", receipt: `PT-${c.period.slice(5)}${c.period.slice(2, 4)}-${String(csState.seq.receipt++).padStart(4, "0")}`, paidAt: csIsoToVi(csFormValue("csRcDate")), method: csFormValue("csRcMethod"), amount: Number(csFormValue("csRcAmount")) || c.amount });
    message = `Đã lập phiếu thu ${c.receipt} cho khoản ${c.id}.`;
  } else if (kind === "viewReceipt") {
    message = "Đã mô phỏng gửi phiếu thu tới máy in.";
  } else if (kind === "company") {
    const data = { name: csFormValue("csCoName"), contact: csFormValue("csCoContact"), phone: csFormValue("csCoPhone"), status: csFormValue("csCoStatus") };
    const existing = csUnit(id);
    if (existing) { Object.assign(existing, data); message = "Đã cập nhật thông tin công ty."; }
    else { const newId = `DV${String(csState.seq.company++).padStart(2, "0")}`; MANAGEMENT_UNITS.push({ id: newId, ...data }); csState.companyId = newId; message = `Đã thêm công ty ${data.name}.`; closeDemoModal(); showScreen("company-detail"); showDemoNotice(message); return true; }
  } else if (kind === "assignAreas") {
    const checked = [...document.querySelectorAll("[data-cs-area]:checked")].map(i => i.dataset.csArea);
    if (!checked.length) return true;
    const start = csFormValue("csAsStart"), end = csFormValue("csAsEnd");
    checked.forEach(areaId => Object.assign(csArea(areaId), { unit: id, waste: id, payment: id, start, end, conflict: false }));
    message = `Đã phân công ${checked.length} khu vực cho ${csUnit(id)?.name}.`;
  } else if (kind === "unassign") {
    Object.assign(csArea(id), { unit: null, waste: null, payment: null });
    message = `Đã bỏ phân công ${csAreaName(id)}.`;
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
      Object.assign(c, { status: csFormValue("csHcStatus"), result: `${forward ? `Chuyển ${csCompanyOf(c.area)?.name} xử lý. ` : ""}${csFormValue("csHcResult")}` });
      message = `Đã cập nhật ${c.id}: ${CS_COMPLAINT_STATUS[c.status][0].toLowerCase()}.`;
    }
  }
  closeDemoModal();
  renderCurrentView();
  if (message) showDemoNotice(message);
  return true;
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-cs]");
  if (!button || currentRole !== "commune") return;
  const { cs: action, id } = button.dataset;
  if (action === "company") { csState.companyId = id; closeDemoModal(); showScreen("company-detail"); return; }
  if (action === "back" || action === "goCompanies") { showScreen("companies"); return; }
  if (CS_DIALOGS[action]) CS_DIALOGS[action](id);
});
document.addEventListener("change", event => {
  if (currentRole !== "commune") return;
  if (event.target.matches("[data-cs-filter]")) { csState[event.target.dataset.csFilter] = event.target.value; renderCurrentView({ keepFocus: true }); return; }
  if (csState.dialog?.kind === "assignAreas" && event.target.closest("#dialogBody")) csAssignLive();
  if (csState.dialog?.kind === "chargeRequest" && event.target.closest("#dialogBody")) csRequestPreview();
  if (csState.dialog?.kind === "receipt" && event.target.id === "csRcChargeId") {
    const c = CS_CHARGES.find(x => x.id === event.target.value);
    if (c) { document.getElementById("csRcAmount").value = c.amount; document.getElementById("csRcPayer").value = csSubject(c.subject)?.name || ""; }
  }
});
