"use strict";

// Separate area assignments for waste collection and fee collection.
// All records and outcomes are illustrative; forms never persist changes.
const MANAGEMENT_UNITS = APP_DATA.contractors.map((name, i) => ({
  id: `DV${String(i + 1).padStart(2, "0")}`, name,
  contact: APP_DATA.routes[i * 2].manager, phone: `0900 000 ${String(i + 1).padStart(3, "0")}`
}));
const MANAGEMENT_AREAS = Array.from({ length: 24 }, (_, i) => ({
  id: `KV${String(i + 1).padStart(2, "0")}`, name: `Tổ dân phố ${String(i + 1).padStart(2, "0")}`,
  households: 420 + (i * 37 % 370),
  waste: i === 22 ? null : MANAGEMENT_UNITS[i % 11].id,
  payment: i === 23 ? null : MANAGEMENT_UNITS[(i + (i % 4 === 0 ? 1 : 0)) % 11].id,
  // Conflicting pending proposal, never two simultaneously effective assignments.
  conflict: i === 21, start: "2026-09-01", end: "2026-12-31"
}));
const MANAGEMENT_REPORT = MANAGEMENT_AREAS.filter(a => a.payment).flatMap((a, i) => ["2026-09", "2026-08"].map((period, p) => {
  const due = a.households * 80000;
  const rate = [82, 91, 56, 73, 88, 62, 79, 95, 68, 84, 76][i % 11] + p * 3;
  return { area: a.id, unit: a.payment, period, due, paid: Math.round(due * rate / 100) };
}));
let managementAreaId = "KV01";
let managementUnitFilter = "all";
let managementReportFilter = { unit: "all", area: "all", period: "2026-09" };
let managementDialog = null;
const managementMoney = n => `${n.toLocaleString("vi-VN")}đ`;
const managementUnit = id => MANAGEMENT_UNITS.find(u => u.id === id);
const managementArea = () => MANAGEMENT_AREAS.find(a => a.id === managementAreaId) || MANAGEMENT_AREAS[0];
const managementStatus = a => a.conflict ? "Cảnh báo giao trùng" : !a.waste ? "Chưa có đơn vị gom rác" : !a.payment ? "Chưa có đơn vị thu tiền" : "Đã phân công";
function managementSelect(label, attr, options, selected = "all") {
  return `<label class="toolbar-field">${label}<select class="control" ${attr}>${options.map(([v, t]) => `<option value="${v}" ${v === selected ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select></label>`;
}
function managementUnitLink(id) {
  const u = managementUnit(id);
  return u ? `<button class="link-button" data-management="unit" data-id="${id}">${escapeHtml(u.name)}</button>` : badge("Chưa phân công");
}
function areaManagement() {
  return `${pageHeader("Tổ chức thu", "Quản lý khu vực", "Phân công theo tổ dân phố. Mỗi nhiệm vụ có một đơn vị phụ trách trong cùng thời gian hiệu lực.", actionButton("Danh sách đơn vị", "go:collection-units"))}
  ${kpiGrid([kpi("Khu vực minh họa", "24", "Một khu vực gồm nhiều đường"), kpi("Đơn vị", "11", "Gom rác và/hoặc thu tiền"), kpi("Thiếu phân công", "2", "1 gom rác · 1 thu tiền", "warning"), kpi("Đề xuất bị trùng", "1", "Chưa được áp dụng", "danger")])}
  ${rules(`3 khu vực cần kiểm tra`, [`Tổ 22 có đề xuất giao đè; tổ 23 chưa có đơn vị gom rác; tổ 24 chưa có đơn vị thu tiền. Chọn “Cần xử lý” để xem.`], "warning")}
  <section data-management-list><div class="toolbar"><label class="toolbar-field grow">Tìm khu vực<input class="control" data-management-search placeholder="Mã hoặc tên tổ dân phố"></label>
  ${managementSelect("Đơn vị phụ trách", "data-management-unit", [["all", "Tất cả đơn vị"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], managementUnitFilter)}
  ${managementSelect("Phân công", "data-management-status", [["all", "Tất cả"], ["attention", "Cần xử lý"], ["ready", "Đã phân công đủ"]])}</div>
  ${panel("Danh sách khu vực", "Bấm tên tổ để xem hộ và lịch sử phân công. Tên công ty mở thông tin đầu mối.", table(["Khu vực", "Số hộ / nguồn thải", "Đơn vị gom rác", "Đơn vị thu tiền", "Trạng thái", ""], MANAGEMENT_AREAS.map(a => `<tr data-management-row data-id="${a.id}" ${managementUnitFilter !== "all" && ![a.waste, a.payment].includes(managementUnitFilter) ? "hidden" : ""}><td><button class="link-button" data-management="area" data-id="${a.id}">${a.name}</button><span class="cell-subtitle">${a.id}</span></td><td>${a.households}</td><td>${managementUnitLink(a.waste)}</td><td>${managementUnitLink(a.payment)}</td><td>${badge(managementStatus(a))}</td><td><button class="button button-small" data-management="assign" data-id="${a.id}">${a.conflict ? "Xử lý trùng" : !a.waste || !a.payment ? "Phân công" : "Sửa phân công"}</button></td></tr>`)))}<p class="muted" data-management-empty hidden>Không có khu vực phù hợp. Thử đổi bộ lọc.</p></section>`;
}
function areaManagementDetail() {
  const a = managementArea();
  const homes = Array.from({ length: 6 }, (_, i) => ({ code: `${a.id}-H${String(i + 1).padStart(4, "0")}`, name: ["Nguyễn Văn An", "Trần Thị Bình", "Lê Minh Châu", "Tạp hóa Minh Anh", "Phạm Văn Dũng", "Võ Thị Hà"][i], address: `${12 + i * 3} Đường ${Number(a.id.slice(2))}, ${a.name}` }));
  return `${pageHeader(a.id, a.name, `${a.households} hộ / chủ nguồn thải · Hiệu lực hiện tại: 01/09–31/12/2026`, actionButton("← Quản lý khu vực", "go:routes") + `<button class="button button-primary" data-management="assign" data-id="${a.id}">Sửa phân công</button>`)}
  ${a.conflict || !a.waste || !a.payment ? `${rules(`${managementStatus(a)}`, [`${a.conflict ? "Đề xuất thứ hai chưa có hiệu lực. Cần điều chỉnh ngày bàn giao hoặc hủy đề xuất trùng." : "Bổ sung đơn vị cho nhiệm vụ còn thiếu để xác định rõ trách nhiệm."}`], "warning")}` : ""}
  <div class="route-rule-panels">${panel("Đơn vị gom rác", "Phụ trách cung cấp dịch vụ", managementUnitLink(a.waste))}${panel("Đơn vị thu tiền", "Đầu mối báo cáo kết quả thu", managementUnitLink(a.payment), `<button class="button button-small" data-management="report" data-id="${a.id}">Xem tiến độ</button>`)}</div>
  ${panel("Phạm vi khu vực", "Sơ đồ vị trí minh họa — không phải ranh giới hành chính thực tế", `<svg viewBox="0 0 800 150" role="img" aria-label="Sơ đồ khu vực ${a.name}" style="width:100%;max-height:180px"><rect x="10" y="10" width="780" height="130" rx="12" fill="#EAF6EF"/><path d="M30 75H770M260 20V130M540 20V130" stroke="white" stroke-width="12"/><rect x="285" y="25" width="230" height="100" rx="8" fill="#16794A"/><text x="400" y="80" text-anchor="middle" fill="white" font-size="20">${a.name}</text></svg>`)}
  ${panel("Hộ / chủ nguồn thải trong khu vực", `Hiển thị 6 bản ghi minh họa trên tổng ${a.households}; không hiển thị nhân sự nội bộ công ty.`, table(["Mã hộ", "Tên hộ / cơ sở", "Địa chỉ", "Loại"], homes.map((h, i) => `<tr><td>${h.code}</td><td>${h.name}</td><td>${h.address}</td><td>${i === 3 ? "Hộ kinh doanh" : "Hộ gia đình"}</td></tr>`)))}
  ${panel("Lịch sử phân công", "Thay công ty: kết thúc phân công cũ và tạo phân công mới; giữ nguyên lịch sử.", table(["Nhiệm vụ", "Đơn vị", "Hiệu lực", "Trạng thái"], ["waste", "payment"].map(key => `<tr><td>${key === "waste" ? "Gom rác" : "Thu tiền"}</td><td>${managementUnitLink(a[key])}</td><td>${a[key] ? "01/09–31/12/2026" : "—"}</td><td>${badge(a[key] ? "Đang áp dụng" : "Chưa phân công")}</td></tr>`)), actionButton("Quy tắc hợp đồng", "contractDecision"))}`;
}
function collectionUnits() {
  return `${pageHeader("Tổ chức thu", "Đơn vị thu gom", "Đầu mối công ty và khu vực phụ trách. Đơn vị gom rác có thể khác đơn vị thu tiền.", actionButton("Quản lý khu vực", "go:routes"))}
  <section data-unit-list><div class="toolbar"><label class="toolbar-field grow">Tìm đơn vị<input class="control" data-unit-search placeholder="Tên công ty hoặc đầu mối"></label></div>
  ${panel("11 đơn vị", "Số khu vực được tính riêng theo nhiệm vụ; một khu vực có thể xuất hiện ở cả hai cột.", table(["Đơn vị", "Đầu mối công ty", "Gom rác", "Thu tiền", ""], MANAGEMENT_UNITS.map(u => `<tr data-unit-row data-search="${escapeHtml((u.name + " " + u.contact).toLowerCase())}"><td>${managementUnitLink(u.id)}<span class="cell-subtitle">${u.id} · Hoạt động</span></td><td>${u.contact}<span class="cell-subtitle">${u.phone} · số minh họa</span></td><td>${MANAGEMENT_AREAS.filter(a => a.waste === u.id).length} khu vực</td><td>${MANAGEMENT_AREAS.filter(a => a.payment === u.id).length} khu vực</td><td><button class="button button-small" data-management="unit-areas" data-id="${u.id}">Xem khu vực</button></td></tr>`)))}<p data-unit-empty hidden>Không tìm thấy đơn vị phù hợp.</p></section>`;
}
function companyProgress() {
  const f = managementReportFilter;
  const records = MANAGEMENT_REPORT.filter(r => r.period === f.period && (f.unit === "all" || r.unit === f.unit) && (f.area === "all" || r.area === f.area));
  const groups = MANAGEMENT_UNITS.map(u => ({ ...u, rows: records.filter(r => r.unit === u.id) })).filter(u => u.rows.length).map(u => ({ ...u, due: u.rows.reduce((s, r) => s + r.due, 0), paid: u.rows.reduce((s, r) => s + r.paid, 0) }));
  const due = groups.reduce((s, u) => s + u.due, 0), paid = groups.reduce((s, u) => s + u.paid, 0);
  return `${pageHeader("Giám sát cấp xã", "Báo cáo tiến độ thu tiền", "Theo đơn vị chịu trách nhiệm thu tiền. Công ty tự tổ chức nhân sự và đôn đốc hộ dân.", actionButton("Xuất báo cáo", "exportData"))}
  <div class="toolbar">${managementSelect("Kỳ báo cáo", "data-report-filter=period", [["2026-09", "Tháng 09/2026"], ["2026-08", "Tháng 08/2026"]], f.period)}${managementSelect("Công ty thu tiền", "data-report-filter=unit", [["all", "Tất cả công ty"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], f.unit)}${managementSelect("Khu vực", "data-report-filter=area", [["all", "Tất cả khu vực"], ...MANAGEMENT_AREAS.map(a => [a.id, a.name])], f.area)}</div>
  ${kpiGrid([kpi("Phải thu", managementMoney(due), "Tổng trong phạm vi lọc"), kpi("Đã thu", managementMoney(paid), "Theo báo cáo đơn vị", "success"), kpi("Còn phải thu", managementMoney(due - paid), "Không đồng nghĩa toàn bộ đã quá hạn", "warning"), kpi("Tỷ lệ thu tiền", due ? `${(paid / due * 100).toFixed(1)}%` : "—", "Đã thu / phải thu")])}
  <p class="muted">Dữ liệu minh họa riêng cho 24 tổ dân phố · Cập nhật cuối kỳ mẫu. Ngưỡng dưới 70% là giả định để trình diễn, cần BA xác nhận. Tổ 24 chưa có đơn vị thu tiền nên chưa đưa vào tổng theo công ty.</p>
  ${panel("Tiến độ theo công ty", "Thông báo gửi đầu mối công ty, không giao việc hay theo dõi từng người đi thu.", groups.length ? table(["Công ty thu tiền", "Khu vực", "Phải thu", "Đã thu", "Còn phải thu", "Tỷ lệ", ""], groups.map(u => `<tr><td>${managementUnitLink(u.id)}</td><td><button class="link-button" data-management="unit-areas" data-id="${u.id}">${u.rows.length} khu vực</button></td><td>${managementMoney(u.due)}</td><td>${managementMoney(u.paid)}</td><td>${managementMoney(u.due - u.paid)}</td><td>${progressBar(u.paid / u.due * 100)}${(u.paid / u.due * 100).toFixed(1)}% ${u.paid / u.due < .7 ? badge("Cần đôn đốc") : ""}</td><td><button class="button button-small" data-management="notify" data-id="${u.id}">Thông báo công ty</button></td></tr>`)) : `<p>Không có dữ liệu trong phạm vi đã chọn.</p>`)}`;
}
Object.assign(VIEW_RENDERERS, { areaManagement, areaManagementDetail, collectionUnits, companyProgress });

function filterManagementAreas() {
  const host = document.querySelector("[data-management-list]");
  if (!host) return;
  const query = host.querySelector("[data-management-search]").value.trim().toLowerCase();
  const unit = host.querySelector("[data-management-unit]").value;
  const status = host.querySelector("[data-management-status]").value;
  let count = 0;
  host.querySelectorAll("[data-management-row]").forEach(row => {
    const a = MANAGEMENT_AREAS.find(item => item.id === row.dataset.id);
    const attention = a.conflict || !a.waste || !a.payment;
    row.hidden = !((a.id + " " + a.name).toLowerCase().includes(query) && (unit === "all" || [a.waste, a.payment].includes(unit)) && (status === "all" || (status === "attention" ? attention : !attention)));
    if (!row.hidden) count++;
  });
  host.querySelector("[data-management-empty]").hidden = count !== 0;
}
function openManagementDialog(kind, id) {
  managementDialog = { kind, id };
  DIALOG_SPECS.management = { title: kind === "assign" ? "Phân công khu vực" : kind === "unit" ? "Thông tin đơn vị" : "Thông báo tiến độ thu tiền", description: "Dữ liệu minh họa · Biểu mẫu không lưu hoặc gửi ra ngoài.", fields: [] };
  openDemoModal("management");
  const body = document.getElementById("dialogBody"), confirm = document.getElementById("dialogConfirm");
  confirm.hidden = kind === "unit";
  confirm.disabled = false;
  if (kind === "assign") {
    const a = MANAGEMENT_AREAS.find(item => item.id === id);
    body.innerHTML = `<p><strong>${a.name}</strong> · ${a.id} · ${a.households} hộ</p>
    ${a.conflict ? `${rules(`Đề xuất PC-KV22-02 bị trùng`, [`Công ty MTĐT Đông Thạnh được đề xuất gom rác từ 15/09–31/12/2026, trùng với ${managementUnit(a.waste).name}. Đề xuất chưa áp dụng. Chọn thời gian mới hoặc xác nhận bàn giao để xử lý.`], "warning")}` : ""}
    <div class="form-grid">${managementSelect("Nhiệm vụ", "id=assignmentTask", [["waste", "Gom rác"], ["payment", "Thu tiền"]], !a.payment ? "payment" : "waste")}
    ${managementSelect("Đơn vị được giao", "id=assignmentUnit required", [["", "Chọn đơn vị"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], "")}
    <label class="toolbar-field">Hiệu lực từ<input class="control" id="assignmentStart" type="date" value="2026-09-15" required></label><label class="toolbar-field">Hiệu lực đến<input class="control" id="assignmentEnd" type="date" value="2026-12-31" required></label></div>
    <p id="assignmentCurrent"></p><label><input type="checkbox" id="assignmentReplace"> Bàn giao: kết thúc phân công hiện tại vào ngày trước ngày hiệu lực mới</label>
    <p id="assignmentValidation" role="status" aria-live="polite"></p><label class="toolbar-field">Lý do / căn cứ<textarea class="control" required placeholder="Quyết định phân công hoặc lý do bàn giao"></textarea></label>
    <p class="muted">Công ty chỉ thực hiện nhiệm vụ: giữ hợp đồng, đổi phân công. Nếu đổi bên ký hợp đồng: kết thúc hợp đồng cũ và lập hợp đồng mới. Không xóa lịch sử.</p>`;
    confirm.textContent = "Xác nhận phân công mẫu";
    validateManagementAssignment();
  } else {
    const u = managementUnit(id);
    body.innerHTML = `<p><strong>${u.name}</strong></p><p>Đầu mối: ${u.contact} · ${u.phone} (minh họa)</p>`;
    if (kind === "unit") body.innerHTML += `<h3>Khu vực phụ trách</h3>${MANAGEMENT_AREAS.filter(a => [a.waste, a.payment].includes(id)).map(a => `<p><button type="button" class="link-button" data-management="area" data-id="${a.id}">${a.name}</button> · ${[a.waste === id ? "Gom rác" : "", a.payment === id ? "Thu tiền" : ""].filter(Boolean).join(" và ")}</p>`).join("")}`;
    else {
      body.innerHTML += `<p>Kỳ ${managementReportFilter.period} · ${managementReportFilter.area === "all" ? "Tất cả khu vực của công ty" : MANAGEMENT_AREAS.find(a => a.id === managementReportFilter.area).name}</p><label class="toolbar-field">Nội dung<textarea class="control" rows="4" required>Đề nghị quý công ty rà soát tiến độ thu tiền, chủ động đôn đốc nội bộ và phản hồi kết quả về xã.</textarea></label><label class="toolbar-field">Hạn phản hồi<input class="control" type="date" required value="2026-09-18"></label>`;
      confirm.textContent = "Mô phỏng gửi thông báo";
    }
  }
}
function validateManagementAssignment() {
  if (!document.getElementById("assignmentTask")) return true;
  const a = MANAGEMENT_AREAS.find(item => item.id === managementDialog.id);
  const task = document.getElementById("assignmentTask").value, unit = document.getElementById("assignmentUnit").value;
  const start = document.getElementById("assignmentStart").value, end = document.getElementById("assignmentEnd").value;
  const replace = document.getElementById("assignmentReplace").checked;
  const existing = a[task], overlaps = existing && start <= a.end && end >= a.start;
  let error = !unit ? "Chưa chọn đơn vị phụ trách." : !start || !end || end < start ? "Ngày kết thúc phải từ ngày bắt đầu trở đi." : overlaps && !replace ? "Giao trùng thời gian với phân công đang có. Chọn bàn giao hoặc đổi thời gian hiệu lực." : overlaps && replace && start <= a.start ? "Ngày bàn giao phải sau ngày bắt đầu phân công hiện tại." : "";
  document.getElementById("assignmentCurrent").textContent = existing ? `Hiện tại: ${managementUnit(existing).name} · ${a.start} → ${a.end}` : "Nhiệm vụ này chưa có đơn vị phụ trách.";
  document.getElementById("assignmentValidation").textContent = error || "Hợp lệ trong dữ liệu mẫu. Phân công cũ được giữ trong lịch sử.";
  document.getElementById("assignmentValidation").style.color = error ? "#C62828" : "#16794A";
  document.getElementById("dialogConfirm").disabled = Boolean(error);
  return !error;
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-management]");
  if (!button || currentRole !== "commune") return;
  const { management: action, id } = button.dataset;
  if (["assign", "unit", "notify"].includes(action)) openManagementDialog(action, id);
  if (action === "area") { managementAreaId = id; closeDemoModal(); showScreen("route-detail"); }
  if (action === "unit-areas") { managementUnitFilter = id; showScreen("routes"); }
  if (action === "report") { managementReportFilter.area = id; managementReportFilter.unit = "all"; showScreen("debts"); }
});
document.addEventListener("input", event => {
  if (event.target.matches("[data-management-search]")) filterManagementAreas();
  if (event.target.matches("[data-unit-search]")) {
    const rows = [...document.querySelectorAll("[data-unit-row]")];
    rows.forEach(row => { row.hidden = !row.dataset.search.includes(event.target.value.trim().toLowerCase()); });
    document.querySelector("[data-unit-empty]").hidden = rows.some(row => !row.hidden);
  }
  if (event.target.closest("#dialogBody") && managementDialog?.kind === "assign") validateManagementAssignment();
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-management-unit], [data-management-status]")) { managementUnitFilter = document.querySelector("[data-management-unit]").value; filterManagementAreas(); }
  if (event.target.matches("[data-report-filter]")) { managementReportFilter[event.target.dataset.reportFilter] = event.target.value; renderCurrentView({ keepFocus: true }); }
  if (event.target.closest("#dialogBody") && managementDialog?.kind === "assign") validateManagementAssignment();
});
