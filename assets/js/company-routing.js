"use strict";

// Company-internal route assignment: the company splits its verified areas into
// collection routes and assigns them to its own staff per period. The commune never
// sees this screen. State lives in memory only and resets on reload.

const ROUTING_PERIODS = [["09/2026", "Tháng 09/2026"], ["08/2026", "Tháng 08/2026"], ["10/2026", "Tháng 10/2026 (dự thảo)"]];

const ROUTING_STAFF = [
  { id: "NV01", name: "Nguyễn Thành Long", phone: "090•••1120", role: "Nhân viên thu", status: "active" },
  { id: "NV02", name: "Võ Thị Lan", phone: "093•••4471", role: "Nhân viên thu", status: "active" },
  { id: "NV03", name: "Phạm Minh Tuấn", phone: "091•••8802", role: "Nhân viên thu", status: "active" },
  { id: "NV04", name: "Trần Quốc Huy", phone: "097•••2219", role: "Nhân viên thu", status: "active" },
  { id: "NV05", name: "Lê Thị Hồng Nhung", phone: "098•••6034", role: "Nhân viên thu", status: "leave", statusNote: "Nghỉ đột xuất từ 15/09" },
  { id: "NV06", name: "Đặng Văn Toàn", phone: "096•••7750", role: "Nhân viên thu · mới", status: "active" }
];

const ROUTING_ROUTES = [
  { code: "T03-01", name: "Đông Thạnh 2 – đoạn 1", group: "Tổ 3", households: 121 },
  { code: "T03-02", name: "Đông Thạnh 2 – đoạn 2", group: "Tổ 3", households: 94 },
  { code: "T04-01", name: "Nguyễn Ảnh Thủ 312–440", group: "Tổ 4", households: 118 },
  { code: "T04-02", name: "Nguyễn Ảnh Thủ 441–566 + hẻm 421", group: "Tổ 4", households: 103 },
  { code: "T06-01", name: "Lê Văn Khương 510–700", group: "Tổ 6", households: 156 },
  { code: "T06-02", name: "Lê Văn Khương 701–892", group: "Tổ 6", households: 88 },
  { code: "T07-01", name: "Đặng Thúc Vịnh 1–60", group: "Tổ 7", households: 128 },
  { code: "T07-02", name: "Đặng Thúc Vịnh 61–126 + hẻm", group: "Tổ 7", households: 114 },
  { code: "T09-01", name: "Tô Ký đoạn 1", group: "Tổ 9", households: 132 },
  { code: "T09-02", name: "Tô Ký đoạn 2 + hẻm 8", group: "Tổ 9", households: 97 },
  { code: "T12-01", name: "Đông Thạnh 3 – cầu Rạch Tra", group: "Tổ 12", households: 141 },
  { code: "T12-02", name: "Đông Thạnh 3 – UBND", group: "Tổ 12", households: 126 }
];

// period → route code → staff id (null = no one assigned)
const ROUTING_ASSIGNMENTS = {
  "09/2026": { "T07-01": "NV01", "T07-02": "NV01", "T09-01": "NV01", "T12-01": "NV02", "T12-02": "NV02", "T04-01": "NV03", "T04-02": "NV03", "T06-01": "NV03", "T03-01": "NV04", "T09-02": "NV05", "T06-02": "NV05", "T03-02": null },
  "08/2026": { "T07-01": "NV01", "T07-02": "NV01", "T09-01": "NV01", "T12-01": "NV02", "T12-02": "NV02", "T04-01": "NV03", "T04-02": "NV03", "T06-01": "NV03", "T03-01": "NV04", "T03-02": "NV04", "T09-02": "NV05", "T06-02": "NV05" },
  "10/2026": { "T07-01": "NV01", "T07-02": "NV01", "T12-01": "NV02", "T12-02": "NV02", "T09-01": null, "T09-02": null, "T04-01": null, "T04-02": null, "T06-01": null, "T06-02": null, "T03-01": null, "T03-02": null }
};

let routingPeriod = "09/2026";
let routingDialog = null;

const routingStaff = id => ROUTING_STAFF.find(s => s.id === id);
const routingRoute = code => ROUTING_ROUTES.find(r => r.code === code);
const routingMap = () => ROUTING_ASSIGNMENTS[routingPeriod];
const routingOwner = code => routingMap()[code] || null;
const routingRoutesOf = staffId => ROUTING_ROUTES.filter(r => routingOwner(r.code) === staffId);
const routingHouseholds = routes => routes.reduce((sum, r) => sum + r.households, 0);
const routingEmptyRoutes = () => ROUTING_ROUTES.filter(r => !routingOwner(r.code));
const routingAtRiskRoutes = () => ROUTING_ROUTES.filter(r => routingStaff(routingOwner(r.code) || "")?.status === "leave");
const routingStaffBadge = s => s.status === "leave" ? badge("Nghỉ đột xuất", "danger") : badge("Đang làm", "success");
const routeTag = (r, tone = "neutral") => `<span class="badge ${tone}" title="${escapeHtml(r.name)}">${r.code} · ${r.group}</span>`;

function routingStaffOptions(exclude = "", placeholder = "Chọn nhân viên") {
  return [["", placeholder], ...ROUTING_STAFF.filter(s => s.id !== exclude).map(s => [s.id, `${s.name}${s.status === "leave" ? " (đang nghỉ)" : ""} · ${routingRoutesOf(s.id).length} tuyến`])];
}

function companyRouteAssignment() {
  const empty = routingEmptyRoutes();
  const atRisk = routingAtRiskRoutes();
  const assigned = ROUTING_ROUTES.length - empty.length;
  const rows = ROUTING_STAFF.map(s => {
    const routes = routingRoutesOf(s.id);
    const group = s.status === "leave" ? "leave" : routes.length ? "loaded" : "none";
    return `<tr data-row data-group="${group}" data-search="${escapeHtml(`${s.id} ${s.name} ${s.phone} ${routes.map(r => `${r.code} ${r.group}`).join(" ")}`.toLowerCase())}" class="${s.status === "leave" && routes.length ? "is-blocked" : !routes.length && s.status === "active" ? "is-attention" : ""}">
      <td><span class="cell-title">${escapeHtml(s.name)}</span><span class="cell-subtitle">${s.id} · ${s.phone} · ${s.role}</span></td>
      <td>${routingStaffBadge(s)}${s.statusNote ? `<span class="cell-subtitle">${s.statusNote}</span>` : ""}</td>
      <td><span class="cell-title">${routes.length} tuyến</span>${routes.length ? `<div class="route-tags">${routes.map(r => routeTag(r, s.status === "leave" ? "danger" : "neutral")).join("")}</div>` : `<span class="cell-subtitle">Chưa được phân tuyến</span>`}</td>
      <td class="money">${routes.length ? routingHouseholds(routes).toLocaleString("vi-VN") : "0"}</td>
      <td><div class="table-actions">${actionButtonRouting("Phân tuyến", "assign", s.id, s.status === "leave" ? "" : "button-primary")}${routes.length ? actionButtonRouting("Chuyển tuyến", "transfer", s.id, s.status === "leave" ? "button-primary" : "") : ""}</div></td></tr>`;
  });
  const emptyChips = empty.map(r => `<button type="button" class="routing-empty-chip" data-routing="fill" data-id="${r.code}" title="Gán tuyến này cho nhân viên"><span class="badge danger">Trống</span><strong>${r.code}</strong><span>${escapeHtml(r.name)} · ${r.group} · ${r.households} hộ</span></button>`).join("");
  const riskChips = atRisk.map(r => `<button type="button" class="routing-empty-chip warning" data-routing="transfer" data-id="${routingOwner(r.code)}" title="Chuyển tuyến của nhân viên đang nghỉ"><span class="badge warning">Người nghỉ</span><strong>${r.code}</strong><span>${escapeHtml(r.name)} · ${r.group} · ${r.households} hộ · ${routingStaff(routingOwner(r.code)).name}</span></button>`).join("");
  return `${pageHeader("Tổ chức thu nội bộ", "Phân tuyến thu gom cho nhân viên", "Công ty chia khu vực đã được xã giao thành tuyến và gán cho nhân viên theo kỳ thu. Đây là phân công nội bộ của công ty; xã không điều hành nhân viên.", actionButton("Xuất bảng phân tuyến", "exportData") + `<button type="button" class="button button-primary" data-routing="transfer" data-id="">Chuyển tuyến nhanh</button>`)}
  ${summaryStrip([["Tổng số tuyến", String(ROUTING_ROUTES.length), `${routingHouseholds(ROUTING_ROUTES).toLocaleString("vi-VN")} hộ · ${new Set(ROUTING_ROUTES.map(r => r.group)).size} tổ`], ["Tuyến đã phân công", String(assigned), `${ROUTING_STAFF.filter(s => routingRoutesOf(s.id).length).length} nhân viên có tuyến`], ["Tuyến chưa có người nhận", String(empty.length), empty.length ? `${routingHouseholds(empty)} hộ chưa ai thu` : "Đã phủ hết tuyến"], ["Tuyến thuộc người đang nghỉ", String(atRisk.length), atRisk.length ? "Cần chuyển tuyến ngay" : "Không có"]])}
  ${empty.length || atRisk.length ? `<section class="panel routing-warning"><header class="panel-header"><div><h2>Tuyến cần xử lý · kỳ ${routingPeriod}</h2><p>Bấm vào tuyến để gán hoặc chuyển ngay. Tuyến trống không có ai đi thu trong kỳ.</p></div></header><div class="panel-body"><div class="routing-empty-list">${emptyChips}${riskChips}</div></div></section>` : ""}
  <section data-table-filter data-chip-key="group" data-count-label="nhân viên">
    <div class="filter-bar">${filterField("Kỳ thu", `<select class="control" data-routing-period>${ROUTING_PERIODS.map(([v, t]) => `<option value="${v}" ${v === routingPeriod ? "selected" : ""}>${t}</option>`).join("")}</select>`)}${filterField("Tìm nhân viên", `<input class="control" type="search" data-table-search placeholder="Tên, mã nhân viên, SĐT hoặc mã tuyến...">`, "grow")}</div>
    ${chipBar([["all", "Tất cả"], ["loaded", "Có tuyến", "success"], ["none", "Chưa có tuyến", "warning"], ["leave", "Đang nghỉ", "danger"]], "nhân viên")}
    ${panel("Danh sách nhân viên", `Kỳ ${routingPeriod} · Công ty MTĐT Đông Thạnh`, table(["Nhân viên", "Trạng thái", "Tuyến đang phụ trách", { label: "Tổng hộ cần thu", num: true }, "Thao tác"], rows, { empty: "Không có nhân viên phù hợp." }))}
  </section>`;
}

function actionButtonRouting(label, kind, id, extra = "") {
  return `<button type="button" class="button button-small ${extra}" data-routing="${kind}" data-id="${id}">${label}</button>`;
}

function routingPickTable(routes, checkedFn, ownerLabelFn) {
  const rows = routes.map(r => {
    const owner = routingOwner(r.code);
    return `<tr data-routing-pick-row data-empty="${owner ? "0" : "1"}"><td><input type="checkbox" data-routing-pick value="${r.code}" ${checkedFn(r) ? "checked" : ""} aria-label="Chọn ${r.code}"></td><td><span class="cell-title">${r.code}</span><span class="cell-subtitle">${escapeHtml(r.name)}</span></td><td>${r.group}</td><td class="money">${r.households}</td><td>${ownerLabelFn(r, owner)}</td></tr>`;
  });
  return `<div class="routing-pick">${table(["", "Tuyến", "Tổ", { label: "Số hộ", num: true }, "Đang phụ trách"], rows, { static: true })}</div>`;
}

function openRoutingDialog(kind, id) {
  routingDialog = { kind, id };
  const titles = { assign: "Phân tuyến cho nhân viên", transfer: "Chuyển tuyến nhanh giữa hai nhân viên", fill: "Gán tuyến trống" };
  DIALOG_SPECS.routing = { eyebrow: `Phân tuyến nội bộ · kỳ ${routingPeriod}`, title: titles[kind], description: "Phân công nội bộ của công ty. Dữ liệu minh họa, chỉ thay đổi trong phiên xem.", fields: [] };
  openDemoModal("routing");
  const body = document.getElementById("dialogBody"), confirm = document.getElementById("dialogConfirm");
  const empty = routingEmptyRoutes();
  if (kind === "assign") {
    const s = routingStaff(id);
    body.innerHTML = `<div class="dialog-summary"><div><span>Nhân viên</span><strong>${escapeHtml(s.name)}</strong></div><div><span>Trạng thái</span><strong>${s.status === "leave" ? "Nghỉ đột xuất" : "Đang làm"}</strong></div><div><span>Hiện phụ trách</span><strong>${routingRoutesOf(id).length} tuyến · ${routingHouseholds(routingRoutesOf(id))} hộ</strong></div></div>
      ${s.status === "leave" ? rules("Nhân viên đang nghỉ", ["Vẫn có thể phân tuyến trước cho kỳ sau, nhưng tuyến kỳ này nên chuyển cho người khác."], "warning") : ""}
      <div class="routing-pick-tools"><span class="muted">Tích chọn tuyến để gán. Tuyến đang thuộc người khác sẽ được chuyển sang ${escapeHtml(s.name)}.</span><label><input type="checkbox" data-routing-only-empty> Chỉ hiện tuyến trống (${empty.length})</label></div>
      ${routingPickTable(ROUTING_ROUTES, r => routingOwner(r.code) === id, (r, owner) => !owner ? badge("Trống", "danger") : owner === id ? badge("Đang giữ", "success") : `${badge(routingStaff(owner).name, routingStaff(owner).status === "leave" ? "warning" : "neutral")}`)}
      <div class="form-grid"><div class="form-field"><label>Hiệu lực từ</label><input class="control" type="date" value="2026-09-17" data-routing-date></div><div class="form-field"><label>Ghi chú</label><input class="control" placeholder="Lý do điều chỉnh (tùy chọn)"></div></div>
      <p class="routing-live" data-routing-live></p>`;
    confirm.textContent = "Lưu phân tuyến";
  } else if (kind === "transfer") {
    const from = id || ROUTING_STAFF.find(s => s.status === "leave" && routingRoutesOf(s.id).length)?.id || "";
    body.innerHTML = `${rules("Dùng khi có người nghỉ đột xuất", ["Toàn bộ tuyến đã chọn chuyển sang người nhận trong kỳ hiện tại; lịch sử phân công kỳ trước không đổi."])}
      <div class="form-grid"><div class="form-field"><label>Từ nhân viên <span>*</span></label><select class="control" data-routing-from required>${routingStaffOptions("", "Chọn người chuyển").map(([v, t]) => `<option value="${v}" ${v === from ? "selected" : ""}>${t}</option>`).join("")}</select></div><div class="form-field"><label>Đến nhân viên <span>*</span></label><select class="control" data-routing-to required>${routingStaffOptions("", "Chọn người nhận").map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div>
      <div class="form-field"><label>Lý do</label><select class="control"><option>Nghỉ đột xuất</option><option>Nghỉ phép</option><option>Cân đối khối lượng</option><option>Khác</option></select></div><div class="form-field"><label>Áp dụng từ</label><input class="control" type="date" value="2026-09-17"></div></div>
      <div data-routing-transfer-routes></div>
      <p class="routing-live" data-routing-live></p>`;
    confirm.textContent = "Chuyển tuyến";
    renderTransferRoutes();
  } else {
    const r = routingRoute(id);
    body.innerHTML = `<div class="dialog-summary"><div><span>Tuyến</span><strong>${r.code}</strong></div><div><span>Tổ</span><strong>${r.group}</strong></div><div><span>Số hộ</span><strong>${r.households} hộ</strong></div></div><p class="muted">${escapeHtml(r.name)} · chưa có người phụ trách trong kỳ ${routingPeriod}.</p>
      <div class="form-grid"><div class="form-field full"><label>Giao cho nhân viên <span>*</span></label><select class="control" data-routing-to required>${routingStaffOptions("", "Chọn nhân viên").map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select></div></div>
      <p class="routing-live" data-routing-live></p>`;
    confirm.textContent = "Gán tuyến";
  }
  updateRoutingLive();
}

function renderTransferRoutes() {
  const host = document.querySelector("[data-routing-transfer-routes]");
  if (!host) return;
  const from = document.querySelector("[data-routing-from]").value;
  const routes = from ? routingRoutesOf(from) : [];
  host.innerHTML = !from ? `<p class="muted">Chọn người chuyển để xem tuyến.</p>` : !routes.length ? `<p class="muted">Nhân viên này không có tuyến trong kỳ ${routingPeriod}.</p>` : `<div class="routing-pick-tools"><span class="muted">Tuyến sẽ chuyển (mặc định chọn toàn bộ)</span><label><input type="checkbox" data-routing-all checked> Chọn tất cả</label></div>${routingPickTable(routes, () => true, () => badge(routingStaff(from).name, "neutral"))}`;
}

function updateRoutingLive() {
  const live = document.querySelector("[data-routing-live]"), confirm = document.getElementById("dialogConfirm");
  if (!live || !routingDialog) return;
  const picked = [...document.querySelectorAll("#dialogBody [data-routing-pick]:checked")].map(i => routingRoute(i.value));
  let error = "", info = "";
  if (routingDialog.kind === "assign") {
    const s = routingStaff(routingDialog.id);
    const taken = picked.filter(r => routingOwner(r.code) && routingOwner(r.code) !== s.id);
    const dropped = routingRoutesOf(s.id).filter(r => !picked.includes(r));
    info = `Sau khi lưu: ${escapeHtml(s.name)} phụ trách ${picked.length} tuyến · ${routingHouseholds(picked)} hộ.${taken.length ? ` Chuyển từ người khác: ${taken.map(r => r.code).join(", ")}.` : ""}${dropped.length ? ` Bỏ khỏi nhân viên (tuyến sẽ trống): ${dropped.map(r => r.code).join(", ")}.` : ""}`;
  } else if (routingDialog.kind === "transfer") {
    const from = document.querySelector("[data-routing-from]")?.value, to = document.querySelector("[data-routing-to]")?.value;
    error = !from ? "Chưa chọn người chuyển." : !to ? "Chưa chọn người nhận." : from === to ? "Người nhận phải khác người chuyển." : !picked.length ? "Chưa chọn tuyến nào để chuyển." : "";
    if (!error) {
      const target = routingStaff(to), after = [...routingRoutesOf(to), ...picked];
      info = `Sau khi chuyển: ${escapeHtml(target.name)} phụ trách ${after.length} tuyến · ${routingHouseholds(after)} hộ.${target.status === "leave" ? " Lưu ý: người nhận đang nghỉ." : ""}`;
    }
  } else {
    const to = document.querySelector("[data-routing-to]")?.value;
    error = !to ? "Chưa chọn nhân viên nhận tuyến." : "";
    if (!error) { const target = routingStaff(to), after = [...routingRoutesOf(to), routingRoute(routingDialog.id)]; info = `Sau khi gán: ${escapeHtml(target.name)} phụ trách ${after.length} tuyến · ${routingHouseholds(after)} hộ.${target.status === "leave" ? " Lưu ý: nhân viên này đang nghỉ." : ""}`; }
  }
  live.textContent = error || info;
  live.classList.toggle("is-error", Boolean(error));
  confirm.disabled = Boolean(error);
  return !error;
}

function handleRoutingSubmit() {
  if (!routingDialog || activeDialogAction !== "routing") return false;
  if (!updateRoutingLive()) return true;
  const map = routingMap();
  const picked = [...document.querySelectorAll("#dialogBody [data-routing-pick]:checked")].map(i => i.value);
  let notice = "";
  if (routingDialog.kind === "assign") {
    const s = routingStaff(routingDialog.id);
    ROUTING_ROUTES.forEach(r => { if (map[r.code] === s.id && !picked.includes(r.code)) map[r.code] = null; });
    picked.forEach(code => { map[code] = s.id; });
    notice = `Đã cập nhật ${picked.length} tuyến cho ${s.name} (kỳ ${routingPeriod}).`;
  } else if (routingDialog.kind === "transfer") {
    const from = routingStaff(document.querySelector("[data-routing-from]").value), to = routingStaff(document.querySelector("[data-routing-to]").value);
    picked.forEach(code => { map[code] = to.id; });
    notice = `Đã chuyển ${picked.length} tuyến từ ${from.name} sang ${to.name}.`;
  } else {
    const to = routingStaff(document.querySelector("[data-routing-to]").value);
    map[routingDialog.id] = to.id;
    notice = `Đã gán tuyến ${routingDialog.id} cho ${to.name}.`;
  }
  routingDialog = null;
  closeDemoModal();
  renderCurrentView();
  showDemoNotice(`${notice} Dữ liệu minh họa, chỉ giữ trong phiên xem.`);
  return true;
}

Object.assign(VIEW_RENDERERS, { companyRouteAssignment });

document.addEventListener("click", event => {
  const button = event.target.closest("[data-routing]");
  if (!button || currentRole !== "company") return;
  openRoutingDialog(button.dataset.routing, button.dataset.id);
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-routing-period]")) { routingPeriod = event.target.value; renderCurrentView({ keepFocus: true }); return; }
  if (!event.target.closest("#dialogBody") || !routingDialog) return;
  if (event.target.matches("[data-routing-from]")) renderTransferRoutes();
  if (event.target.matches("[data-routing-all]")) document.querySelectorAll("#dialogBody [data-routing-pick]").forEach(i => { i.checked = event.target.checked; });
  if (event.target.matches("[data-routing-only-empty]")) document.querySelectorAll("#dialogBody [data-routing-pick-row]").forEach(row => { row.hidden = event.target.checked && row.dataset.empty !== "1"; });
  updateRoutingLive();
});
