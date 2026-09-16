"use strict";

// Review v2.6: area-led assignment; contractor CRUD lives in this browser session only.
MANAGEMENT_UNITS.forEach(u => { u.status = "active"; });
const REVIEW_REPORT = MANAGEMENT_AREAS.flatMap((a, i) => ["2026-09", "2026-08"].map(period => {
  const due = a.households * 80000;
  const rate = period === "2026-09" ? [58, 64, 29, 51, 62, 34, 49, 68, 32, 57, 46][i % 11] : [95, 100, 86, 92, 98, 80, 96, 100, 90, 97, 94][i % 11];
  const paid = a.payment ? Math.round(due * rate / 100) : 0;
  const confirmed = Math.round(paid * .94);
  return { area: a.id, unit: a.payment || "unassigned", period, due, paid, confirmed };
}));
const REVIEW_CHECKPOINTS = {
  "2026-09": { asOf: "14/09/2026", target: 45, deadline: "30/09/2026" },
  "2026-08": { asOf: "31/08/2026", target: 100, deadline: "31/08/2026" }
};
let reviewNextUnit = 12;
let reviewSelected = new Set();
const reviewOldArea = VIEW_RENDERERS.areaManagement;
const reviewOldDetail = VIEW_RENDERERS.areaManagementDetail;
const reviewOldDialog = openManagementDialog;
const reviewUnitName = id => managementUnit(id)?.name || "Chưa phân công";
const reviewField = (label, id, value = "", type = "text", extra = "required") => `<label class="toolbar-field">${label}<input class="control" id="${id}" type="${type}" value="${escapeHtml(value)}" ${extra}></label>`;
function reviewAreas() {
  reviewSelected = new Set();
  const html = reviewOldArea().replace(kpi("Đơn vị", "11", "Gom rác và/hoặc thu tiền"), kpi("Đơn vị", String(MANAGEMENT_UNITS.length), "Gom rác và/hoặc thu tiền"));
  return html.replace('<section data-management-list>', `<section data-management-list><div class="review-bulkbar"><label><input type="checkbox" id="reviewSelectAll"> Chọn tất cả kết quả đang hiện</label><span id="reviewSelectedCount">Đã chọn 0 khu vực</span><button class="button button-primary" data-management="bulk-assign" disabled id="reviewBulkAssign">Phân công khu vực đã chọn</button></div>`)
    .replace(/<tr data-management-row data-id="([^"]+)"/g, '<tr data-management-row data-id="$1"')
    .replace(/<td><button class="link-button" data-management="area" data-id="([^"]+)">/g, '<td><label class="review-row-select"><input type="checkbox" data-review-select="$1" aria-label="Chọn khu vực $1"></label><button class="link-button" data-management="area" data-id="$1">');
}
function reviewAreaDetail() {
  const host = document.createElement("div");
  host.innerHTML = reviewOldDetail();
  const map = [...host.querySelectorAll("section.panel")].find(p => p.querySelector("h2")?.textContent === "Phạm vi khu vực");
  if (map) {
    const details = document.createElement("details");
    details.className = "panel review-map";
    const summary = document.createElement("summary");
    summary.textContent = "Xem sơ đồ khu vực (minh họa)";
    details.append(summary, map.querySelector(".panel-body"));
    map.replaceWith(details);
  }
  return host.innerHTML;
}
function reviewUnits() {
  return `${pageHeader("Danh mục phối hợp", "Đơn vị thu gom", "Quản lý thông tin và đầu mối công ty. Phân công được thực hiện tại Quản lý khu vực.", actionButton("Quản lý khu vực", "go:routes") + '<button class="button button-primary" data-management="unit-create">+ Thêm đơn vị</button>')}
  ${rules(`CRUD mô phỏng trong phiên trình duyệt`, [`Thêm, sửa và xóa có cập nhật danh sách để trình diễn; tải lại trang sẽ khôi phục dữ liệu mẫu. Không lưu hoặc gửi dữ liệu thật.`])}
  <section data-unit-list><div class="toolbar"><label class="toolbar-field grow">Tìm đơn vị<input class="control" data-unit-search placeholder="Tên công ty hoặc đầu mối"></label></div>
  ${panel(`${MANAGEMENT_UNITS.length} đơn vị`, "Đơn vị đã có phân công hoặc lịch sử thu được giữ lại; không xóa để tránh mất liên kết.", table(["Đơn vị", "Đầu mối", "Khu vực phụ trách", "Trạng thái", "Thao tác"], MANAGEMENT_UNITS.map(u => `<tr data-unit-row data-search="${escapeHtml((u.name + " " + u.contact).toLowerCase())}"><td>${managementUnitLink(u.id)}<span class="cell-subtitle">${u.id}</span></td><td>${escapeHtml(u.contact)}<span class="cell-subtitle">${escapeHtml(u.phone)}</span></td><td>Gom rác: ${MANAGEMENT_AREAS.filter(a => a.waste === u.id).length} · Thu tiền: ${MANAGEMENT_AREAS.filter(a => a.payment === u.id).length}<br><button class="link-button" data-management="unit-areas" data-id="${u.id}">Xem khu vực</button></td><td>${badge(u.status === "active" ? "Hoạt động" : "Tạm ngưng")}</td><td><div class="table-actions"><button class="button button-small" data-management="unit-edit" data-id="${u.id}">Sửa</button><button class="button button-small" data-management="unit-delete" data-id="${u.id}">Xóa</button></div></td></tr>`)))}<p data-unit-empty hidden>Không tìm thấy đơn vị phù hợp.</p></section>`;
}
function reviewProgress() {
  const f = managementReportFilter, checkpoint = REVIEW_CHECKPOINTS[f.period];
  const records = REVIEW_REPORT.filter(r => r.period === f.period && (f.unit === "all" || r.unit === f.unit) && (f.area === "all" || r.area === f.area));
  const groups = [...MANAGEMENT_UNITS, { id: "unassigned", name: "Chưa phân công" }].map(u => {
    const rows = records.filter(r => r.unit === u.id);
    return { ...u, rows, due: rows.reduce((s, r) => s + r.due, 0), paid: rows.reduce((s, r) => s + r.paid, 0), confirmed: rows.reduce((s, r) => s + r.confirmed, 0) };
  }).filter(g => g.rows.length);
  const due = records.reduce((s, r) => s + r.due, 0), paid = records.reduce((s, r) => s + r.paid, 0), confirmed = records.reduce((s, r) => s + r.confirmed, 0);
  const missing = records.filter(r => r.unit === "unassigned");
  return `${pageHeader("Giám sát cấp xã", "Báo cáo tiến độ thu tiền", "Xem kết quả công ty báo cáo và số đã được kế toán xác nhận; công ty tự tổ chức đôn đốc nội bộ.", actionButton("Xuất báo cáo", "exportData"))}
  <div class="toolbar">${managementSelect("Kỳ báo cáo", "data-report-filter=period", [["2026-09", "Tháng 09/2026"], ["2026-08", "Tháng 08/2026"]], f.period)}${managementSelect("Đơn vị thu tiền", "data-report-filter=unit", [["all", "Tất cả, gồm chưa phân công"], ["unassigned", "Chưa phân công"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], f.unit)}${managementSelect("Khu vực", "data-report-filter=area", [["all", "Tất cả khu vực"], ...MANAGEMENT_AREAS.map(a => [a.id, a.name])], f.area)}</div>
  ${kpiGrid([kpi("Phải thu", managementMoney(due), "Bao gồm khu vực chưa phân công"), kpi("Công ty báo đã thu", managementMoney(paid), "Chưa đồng nghĩa đã nộp đủ", "success"), kpi("Kế toán xác nhận", managementMoney(confirmed), `Chờ xác nhận: ${managementMoney(paid - confirmed)}`), kpi("Còn phải thu", managementMoney(due - paid), "Phải thu − công ty báo đã thu", "warning")])}
  ${rules(`Mốc báo cáo ${checkpoint.asOf} · Mục tiêu kế hoạch ${checkpoint.target}% · Hạn thu ${checkpoint.deadline}`, [`So sánh tỷ lệ thu với mục tiêu tại đúng mốc báo cáo. Kế hoạch, số liệu và thời điểm xác nhận là minh họa cho 24 tổ; cần BA xác nhận. Chờ xác nhận không đồng nghĩa tiền chưa nộp hoặc thất thoát.`])}
  ${missing.length ? `<div class="callout warning"><div><strong>${missing.length} khu vực chưa có đơn vị thu tiền · ${managementMoney(missing.reduce((s, r) => s + r.due, 0))} phải thu</strong><p>Đã tính vào tổng phải thu. Phân công ngay tại Quản lý khu vực.</p>${missing.map(r => `<button class="button button-small" data-management="area" data-id="${r.area}">${MANAGEMENT_AREAS.find(a => a.id === r.area).name}</button>`).join(" ")}</div></div>` : ""}
  ${panel("Kết quả theo công ty", "Tỷ lệ = công ty báo đã thu / phải thu. Xã thông báo đầu mối công ty, không giao việc cho người đi thu.", groups.length ? table(["Đơn vị / khu vực", "Phải thu", "Báo đã thu", "Đã xác nhận", "Còn phải thu", "Tiến độ", ""], groups.map(u => {
    const rate = u.paid / u.due * 100;
    return `<tr><td>${u.id === "unassigned" ? '<strong>Chưa phân công</strong>' : managementUnitLink(u.id)}<span class="cell-subtitle">${u.rows.length} khu vực</span></td><td>${managementMoney(u.due)}</td><td>${managementMoney(u.paid)}</td><td>${managementMoney(u.confirmed)}</td><td>${managementMoney(u.due - u.paid)}</td><td>${progressBar(rate)}${rate.toFixed(1)}%<br>${badge(u.id === "unassigned" ? "Cần phân công" : rate < checkpoint.target ? `Chậm ${ (checkpoint.target - rate).toFixed(1)} điểm %` : "Đạt mốc kế hoạch")}</td><td>${u.id === "unassigned" ? `<button class="button button-small" data-management="area" data-id="${u.rows[0].area}">Phân công</button>` : `<button class="button button-small" data-management="notify" data-id="${u.id}">Thông báo</button>`}</td></tr>`;
  })) : '<p>Không có dữ liệu trong phạm vi đã chọn.</p>')}`;
}
Object.assign(VIEW_RENDERERS, { areaManagement: reviewAreas, areaManagementDetail: reviewAreaDetail, collectionUnits: reviewUnits, companyProgress: reviewProgress });

function reviewSelection() {
  const rows = [...document.querySelectorAll('[data-management-row]:not([hidden])')];
  const visible = new Set(rows.map(r => r.dataset.id));
  reviewSelected = new Set([...reviewSelected].filter(id => visible.has(id)));
  document.querySelectorAll('[data-review-select]').forEach(c => { c.checked = reviewSelected.has(c.dataset.reviewSelect); });
  const total = document.getElementById('reviewSelectedCount');
  if (total) total.textContent = `Đã chọn ${reviewSelected.size} khu vực đang hiện`;
  const button = document.getElementById('reviewBulkAssign');
  if (button) button.disabled = !reviewSelected.size;
  const all = document.getElementById('reviewSelectAll');
  if (all) { all.checked = visible.size > 0 && reviewSelected.size === visible.size; all.indeterminate = reviewSelected.size > 0 && reviewSelected.size < visible.size; }
}
function reviewDialogShell(title, kind, id) {
  managementDialog = { kind, id };
  DIALOG_SPECS.management = { title, description: "Prototype · Dữ liệu minh họa", fields: [] };
  openDemoModal("management");
  document.getElementById("dialogConfirm").textContent = "Xác nhận mô phỏng";
  return document.getElementById("dialogBody");
}
function reviewAssignment(ids) {
  const list = MANAGEMENT_AREAS.filter(a => ids.includes(a.id));
  if (!list.length) return;
  const body = reviewDialogShell(list.length === 1 ? `Phân công · ${list[0].name}` : `Phân công ${list.length} khu vực`, "assign", ids[0]);
  managementDialog.ids = list.map(a => a.id);
  const waste = list.every(a => a.waste === list[0].waste) ? list[0].waste || "" : "";
  const payment = list.every(a => a.payment === list[0].payment) ? list[0].payment || "" : "";
  const options = [["", "Chọn đơn vị"], ...MANAGEMENT_UNITS.filter(u => u.status === "active").map(u => [u.id, u.name])];
  body.innerHTML = `<p>Phân công tại khu vực, không cần chuyển sang danh mục công ty. ${list.length > 1 ? "Lựa chọn sẽ áp dụng cho toàn bộ khu vực dưới đây; không tự bỏ qua dòng xung đột." : "Thông tin được điền sẵn từ phân công hiện tại."}</p>
    <div class="form-grid">${managementSelect("Đơn vị gom rác", "id=reviewWaste required", options, waste)}<label class="toolbar-field review-same"><span>Đơn vị thu tiền</span><span><input type="checkbox" id="reviewSame" ${waste && waste === payment ? "checked" : ""}> Giống đơn vị gom rác</span></label><div id="reviewPaymentField">${managementSelect("Đơn vị thu tiền", "id=reviewPayment required", options, payment)}</div>${reviewField("Hiệu lực từ", "assignmentStart", "2026-09-15", "date")}${reviewField("Hiệu lực đến", "assignmentEnd", "2026-12-31", "date")}</div>
    <p><label><input type="checkbox" id="assignmentReplace"> Bàn giao các phân công thay đổi; kết thúc đơn vị cũ vào ngày trước ngày hiệu lực mới</label></p>
    <div id="reviewAssignmentChecks" aria-live="polite"></div>
    ${list.some(a => a.conflict) ? '<p class="callout warning">Đề xuất PC-KV22-02: Công ty MTĐT Đông Thạnh gom rác tại Tổ 22 từ 15/09–31/12/2026, trùng Công ty Công ích Gia Định đang phụ trách. Đề xuất chưa áp dụng.</p><label><input type="checkbox" id="reviewResolveProposal"> Ghi nhận hủy đề xuất trùng PC-KV22-02 trong lần xác nhận mẫu này</label>' : ''}
    <section id="reviewHandover" hidden><h3>Bàn giao trách nhiệm thu tiền</h3><p>Ảnh chụp số liệu minh họa tại mốc bàn giao 15/09/2026; phải chốt lại theo ngày thực tế trước khi triển khai.</p><div id="reviewHandoverAmounts"></div>
      ${managementSelect("Ai tiếp tục thu khoản nợ cũ chưa thu?", "id=reviewDebtOwner required", [["", "Chọn trách nhiệm"], ["old", "Công ty cũ tiếp tục thu khoản nợ cũ"], ["new", "Bàn giao danh sách nợ cho công ty mới"]], "")}
      <p>Khoản đã thu: công ty cũ tiếp tục chịu trách nhiệm chứng minh và nộp phần còn thiếu. Khoản mới từ ngày hiệu lực thuộc công ty mới. Không chuyển doanh thu quá khứ.</p>
      <label><input id="reviewHandoverAgreed" type="checkbox"> Đã đối chiếu và thống nhất biên bản bàn giao với hai bên</label></section>
    ${managementSelect("Vai trò công ty trong hợp đồng", "id=reviewContract", [["executor", "Chỉ thực hiện nhiệm vụ — giữ hợp đồng, đổi phân công"], ["signer", "Thay bên ký — kết thúc hợp đồng cũ, lập hợp đồng mới"]], "executor")}
    <label class="toolbar-field">Lý do / căn cứ<textarea class="control" id="reviewAssignmentReason" required placeholder="Số quyết định hoặc lý do điều chỉnh"></textarea></label><p id="assignmentValidation" role="status"></p>`;
  validateManagementAssignment();
}
validateManagementAssignment = function () {
  if (!document.getElementById("reviewWaste")) return true;
  const list = MANAGEMENT_AREAS.filter(a => managementDialog.ids.includes(a.id));
  const waste = document.getElementById("reviewWaste").value;
  const same = document.getElementById("reviewSame").checked;
  const payControl = document.getElementById("reviewPayment");
  document.getElementById("reviewPaymentField").hidden = same;
  payControl.required = !same;
  if (same) payControl.value = waste;
  const payment = same ? waste : payControl.value;
  const start = document.getElementById("assignmentStart").value, end = document.getElementById("assignmentEnd").value;
  const replace = document.getElementById("assignmentReplace").checked;
  let invalid = !waste || !payment || !start || !end || end < start;
  let changed = false;
  const handovers = [];
  const checks = list.flatMap(a => ["waste", "payment"].map(task => {
    const next = task === "waste" ? waste : payment, old = a[task];
    const change = next !== old;
    changed ||= change;
    const overlaps = old && start <= a.end && end >= a.start;
    const conflict = change && overlaps && (!replace || start <= a.start);
    const missing = !next;
    invalid ||= Boolean(conflict || missing);
    if (task === "payment" && change && old) handovers.push(a);
    let status = missing ? "Chưa chọn công ty" : !change ? "Giữ nguyên phân công" : conflict ? "Trùng hiệu lực — cần bàn giao hoặc đổi ngày" : change && overlaps ? "Bàn giao, giữ lịch sử cũ" : "Hợp lệ — phân công mới";
    if (a.conflict && task === "waste") status += " · Đề xuất cũ PC-KV22-02 chưa áp dụng; cần xử lý riêng";
    return `<tr><td>${a.name}<br>${task === "waste" ? "Gom rác" : "Thu tiền"}</td><td>${escapeHtml(reviewUnitName(old))}<span class="cell-subtitle">${old ? `${a.start} → ${a.end}` : "Chưa có hiệu lực"}</span></td><td>${escapeHtml(reviewUnitName(next))}<span class="cell-subtitle">${change ? `${start || "—"} → ${end || "—"}` : "Không đổi thời gian hiện tại"}</span></td><td>${escapeHtml(status)}</td></tr>`;
  }));
  const pendingConflict = list.some(a => a.conflict);
  managementDialog.resolveProposal = Boolean(document.getElementById("reviewResolveProposal")?.checked);
  document.getElementById("reviewAssignmentChecks").innerHTML = table(["Khu vực / nhiệm vụ", "Hiện tại", "Dự kiến", "Kiểm tra"], checks);
  const handover = document.getElementById("reviewHandover");
  handover.hidden = !handovers.length;
  document.getElementById("reviewDebtOwner").required = Boolean(handovers.length);
  document.getElementById("reviewHandoverAgreed").required = Boolean(handovers.length);
  document.getElementById("reviewHandoverAmounts").innerHTML = table(["Khu vực / công ty cũ", "Nợ chưa thu", "Đã thu chờ xác nhận", "Phải nộp còn thiếu"], handovers.map(a => {
    const r = REVIEW_REPORT.find(r => r.area === a.id && r.period === "2026-09");
    return `<tr><td>${a.name}<br>${escapeHtml(reviewUnitName(a.payment))}</td><td>${managementMoney(r.due - r.paid)}</td><td>${managementMoney(r.paid - r.confirmed)}</td><td>${managementMoney(Math.round(r.paid * .02))}<span class="cell-subtitle">Số đối soát mẫu riêng, không suy từ chờ xác nhận</span></td></tr>`;
  }));
  if (pendingConflict && !managementDialog.resolveProposal) invalid = true;
  if (handovers.length && (!document.getElementById("reviewDebtOwner").value || !document.getElementById("reviewHandoverAgreed").checked)) invalid = true;
  const allowed = !invalid && (changed || managementDialog.resolveProposal);
  const message = !start || !end || end < start ? "Ngày kết thúc phải từ ngày bắt đầu trở đi." : !changed && !pendingConflict ? "Chưa có thay đổi đơn vị. Đóng để giữ nguyên phân công." : invalid ? "Chưa thể xác nhận: kiểm tra dòng xung đột, đơn vị còn thiếu và trách nhiệm bàn giao." : "Đã kiểm tra tất cả khu vực. Xác nhận chỉ trình diễn kết quả, không lưu phân công.";
  document.getElementById("assignmentValidation").textContent = message;
  document.getElementById("dialogConfirm").disabled = !allowed;
  return allowed;
};
function reviewUnitDialog(kind, id) {
  const u = managementUnit(id);
  if (kind !== "unit-create" && !u) return;
  const labels = { "unit-create": "Thêm đơn vị", "unit-edit": "Sửa đơn vị", "unit-delete": "Xóa đơn vị", unit: "Thông tin đơn vị" };
  const body = reviewDialogShell(labels[kind], kind, id);
  const assigned = u ? MANAGEMENT_AREAS.filter(a => [a.waste, a.payment].includes(id)) : [];
  if (kind === "unit") {
    document.getElementById("dialogConfirm").hidden = true;
    body.innerHTML = `<h3>${escapeHtml(u.name)}</h3><p>${u.id} · ${badge(u.status === "active" ? "Hoạt động" : "Tạm ngưng")}</p><p>Đầu mối: ${escapeHtml(u.contact)} · ${escapeHtml(u.phone)}</p><h3>Khu vực phụ trách</h3>${assigned.length ? assigned.map(a => `<p><button type="button" class="link-button" data-management="area" data-id="${a.id}">${a.name}</button> · ${[a.waste === id ? "Gom rác" : "", a.payment === id ? "Thu tiền" : ""].filter(Boolean).join(" / ")}</p>`).join("") : '<p>Chưa được giao khu vực. Phân công tại Quản lý khu vực.</p>'}<button type="button" class="button" data-management="unit-edit" data-id="${u.id}">Sửa thông tin</button>`;
  } else if (kind === "unit-delete") {
    const linked = assigned.length || REVIEW_REPORT.some(r => r.unit === id);
    managementDialog.blocked = Boolean(linked);
    body.innerHTML = `<p>Xóa đơn vị <strong>${escapeHtml(u.name)}</strong> (${u.id})?</p>${linked ? '<div class="callout warning">Không thể xóa: đơn vị có phân công hoặc lịch sử thu. Cần giữ hồ sơ để truy vết. Bàn giao khu vực trước khi tạm ngưng hoạt động.</div>' : '<p>Đơn vị chưa có phân công hoặc lịch sử thu. Xóa chỉ áp dụng trong phiên trình diễn; tải lại trang khôi phục dữ liệu ban đầu.</p>'}`;
    document.getElementById("dialogConfirm").disabled = Boolean(linked);
    document.getElementById("dialogConfirm").textContent = "Xóa khỏi phiên mẫu";
  } else {
    body.innerHTML = `<div class="form-grid">${reviewField("Mã đơn vị", "reviewUnitCode", u?.id || `DV${String(reviewNextUnit).padStart(2, "0")}`, "text", "readonly")}${reviewField("Tên đơn vị", "reviewUnitName", u?.name || "")}${reviewField("Đầu mối liên hệ", "reviewUnitContact", u?.contact || "")}${reviewField("Số điện thoại", "reviewUnitPhone", u?.phone || "", "tel", 'required pattern="[0-9+() .-]{9,20}"')}${managementSelect("Trạng thái", "id=reviewUnitStatus", [["active", "Hoạt động"], ["inactive", "Tạm ngưng"]], u?.status || "active")}</div><p class="muted">Chỉ cần thông tin đầu mối. Đơn vị tạm ngưng không xuất hiện trong lựa chọn phân công mới.</p><p id="reviewUnitError" role="alert"></p>`;
    document.getElementById("dialogConfirm").textContent = kind === "unit-create" ? "Thêm vào phiên mẫu" : "Cập nhật phiên mẫu";
  }
}
openManagementDialog = function(kind, id) {
  if (kind === "assign") return reviewAssignment([id]);
  if (kind === "unit" || kind.startsWith("unit-")) return reviewUnitDialog(kind, id);
  if (kind === "notify") {
    const u = managementUnit(id);
    if (!u) return;
    const body = reviewDialogShell("Thông báo tiến độ thu tiền", kind, id);
    body.innerHTML = `<h3>${escapeHtml(u.name)}</h3><p>Đầu mối: ${escapeHtml(u.contact)} · ${escapeHtml(u.phone)}</p><p>Kỳ ${managementReportFilter.period} · ${managementReportFilter.area === "all" ? "Tất cả khu vực công ty phụ trách trong báo cáo" : MANAGEMENT_AREAS.find(a => a.id === managementReportFilter.area).name}</p><label class="toolbar-field">Nội dung<textarea class="control" required rows="4">Đề nghị quý công ty rà soát tiến độ thu tiền so với mốc kế hoạch, chủ động đôn đốc nội bộ và phản hồi kết quả về xã.</textarea></label>${reviewField("Hạn phản hồi", "reviewReplyDate", "2026-09-18", "date")}<p class="muted">Thông báo chỉ mô phỏng, không gửi ra ngoài.</p>`;
    document.getElementById("dialogConfirm").textContent = "Mô phỏng gửi thông báo";
    return;
  }
  reviewOldDialog(kind, id);
};
function handleReviewSubmit() {
  const kind = managementDialog?.kind;
  if (!["unit-create", "unit-edit", "unit-delete", "unit"].includes(kind)) return false;
  if (kind === "unit") return true;
  const u = managementUnit(managementDialog.id);
  if (kind === "unit-delete") {
    if (!u || MANAGEMENT_AREAS.some(a => [a.waste, a.payment].includes(u.id)) || REVIEW_REPORT.some(r => r.unit === u.id)) return true;
    MANAGEMENT_UNITS.splice(MANAGEMENT_UNITS.indexOf(u), 1);
  } else {
    if (!document.getElementById("dialogForm").reportValidity()) return true;
    const name = document.getElementById("reviewUnitName").value.trim(), contact = document.getElementById("reviewUnitContact").value.trim(), phone = document.getElementById("reviewUnitPhone").value.trim(), status = document.getElementById("reviewUnitStatus").value;
    let error = !name || !contact ? "Tên và đầu mối không được để trống." : MANAGEMENT_UNITS.some(item => item.id !== u?.id && item.name.toLocaleLowerCase("vi") === name.toLocaleLowerCase("vi")) ? "Tên đơn vị đã tồn tại." : status === "inactive" && u && MANAGEMENT_AREAS.some(a => [a.waste, a.payment].includes(u.id)) ? "Đơn vị còn khu vực phụ trách. Cần bàn giao trước khi tạm ngưng." : "";
    if (error) { document.getElementById("reviewUnitError").textContent = error; return true; }
    if (u) Object.assign(u, { name, contact, phone, status });
    else MANAGEMENT_UNITS.push({ id: `DV${String(reviewNextUnit++).padStart(2, "0")}`, name, contact, phone, status });
  }
  closeDemoModal(); renderCurrentView();
  showDemoNotice(kind === "unit-delete" ? "Đã xóa đơn vị khỏi phiên mẫu; tải lại trang sẽ khôi phục bộ dữ liệu ban đầu." : "Đã cập nhật đơn vị trong phiên mẫu. Tải lại trang để khôi phục dữ liệu ban đầu.");
  return true;
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-management]");
  if (!button || currentRole !== "commune") return;
  const { management: action, id } = button.dataset;
  if (action === "bulk-assign") reviewAssignment([...reviewSelected]);
  if (["unit-create", "unit-edit", "unit-delete"].includes(action)) reviewUnitDialog(action, id);
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-review-select]")) { const id = event.target.dataset.reviewSelect; if (event.target.checked) reviewSelected.add(id); else reviewSelected.delete(id); reviewSelection(); }
  if (event.target.id === "reviewSelectAll") { reviewSelected = new Set(event.target.checked ? [...document.querySelectorAll('[data-management-row]:not([hidden])')].map(r => r.dataset.id) : []); reviewSelection(); }
  if (event.target.matches("[data-management-unit], [data-management-status]")) reviewSelection();
  if (event.target.id === "reviewResolveProposal") { managementDialog.resolveProposal = event.target.checked; validateManagementAssignment(); }
});
document.addEventListener("input", event => { if (event.target.matches("[data-management-search]")) reviewSelection(); });
