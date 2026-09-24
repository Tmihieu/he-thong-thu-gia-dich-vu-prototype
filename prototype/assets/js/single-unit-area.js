"use strict";

// v2.8: one company is responsible for both service collection and fee collection in an area.
MANAGEMENT_AREAS.forEach((area, index) => {
  area.unit = index === 23 ? null : (area.payment || area.waste);
  // Keep compatibility with older prototype helpers and CRUD dependency checks.
  area.waste = area.unit;
  area.payment = area.unit;
});

const SINGLE_AREA_REPORT = MANAGEMENT_AREAS.flatMap((area, index) => ["2026-09", "2026-08"].map(period => {
  const due = area.households * 80000;
  const rate = period === "2026-09" ? [58, 64, 29, 51, 62, 34, 49, 68, 32, 57, 46][index % 11] : [95, 100, 86, 92, 98, 80, 96, 100, 90, 97, 94][index % 11];
  const paid = area.unit ? Math.round(due * rate / 100) : 0;
  return { area: area.id, unit: area.unit || "unassigned", period, due, paid, confirmed: Math.round(paid * .94) };
}));

function singleAreaStatus(area) {
  return area.conflict ? "Cảnh báo giao trùng" : area.unit ? "Đã phân công" : "Chưa có đơn vị phụ trách";
}

function singleAreaManagement() {
  reviewSelected = new Set();
  const missing = MANAGEMENT_AREAS.filter(area => !area.unit).length;
  const conflicts = MANAGEMENT_AREAS.filter(area => area.conflict).length;
  const rows = MANAGEMENT_AREAS.map(area => `<tr data-management-row data-id="${area.id}">
    <td><label class="review-row-select"><input type="checkbox" data-review-select="${area.id}" aria-label="Chọn khu vực ${area.id}"></label><button class="link-button" data-management="area" data-id="${area.id}">${area.name}</button><span class="cell-subtitle">${area.id}</span></td>
    <td>${area.households}</td><td>${managementUnitLink(area.unit)}</td><td>${area.unit ? `${area.start} → ${area.end}` : "—"}</td><td>${badge(singleAreaStatus(area))}</td>
    <td><button class="button button-small" data-management="assign" data-id="${area.id}">${area.conflict ? "Xử lý trùng" : area.unit ? "Sửa phân công" : "Phân công"}</button></td></tr>`);
  return `${pageHeader("Tổ chức thu", "Quản lý khu vực", "Mỗi tổ dân phố có một công ty chịu trách nhiệm thu gom dịch vụ và trực tiếp thu tiền của hộ.", actionButton("Danh sách đơn vị", "go:collection-units"))}
  ${summaryStrip([["Khu vực (tổ dân phố)", String(MANAGEMENT_AREAS.length), "Dữ liệu minh họa"], ["Công ty phụ trách", String(MANAGEMENT_UNITS.length), "Thu gom và thu tiền"], ["Chưa phân công", String(missing), "Cần xác minh và giao công ty"], ["Đề xuất bị trùng", String(conflicts), "Chưa được áp dụng"]])}
  ${rules("Một khu vực · một công ty phụ trách", ["Công ty thu gom trực tiếp thu tiền của dân; không tách “đơn vị gom rác” và “đơn vị thu tiền” trên phân công khu vực.", "Thay công ty tạo phân công mới, giữ lịch sử và yêu cầu bàn giao."])}
  <section data-management-list>
    <div class="review-bulkbar"><label><input type="checkbox" id="reviewSelectAll"> Chọn tất cả kết quả đang hiện</label><span id="reviewSelectedCount">Đã chọn 0 khu vực</span><button class="button button-primary" data-management="bulk-assign" disabled id="reviewBulkAssign">Phân công khu vực đã chọn</button></div>
    <div class="filter-bar"><label class="toolbar-field grow">Tìm khu vực<input class="control" type="search" data-management-search placeholder="Mã hoặc tên tổ dân phố"></label>
      ${managementSelect("Công ty phụ trách", "data-management-unit", [["all", "Tất cả công ty"], ...MANAGEMENT_UNITS.map(unit => [unit.id, unit.name])], managementUnitFilter)}
      ${managementSelect("Trạng thái", "data-management-status", [["all", "Tất cả"], ["attention", "Cần xử lý"], ["ready", "Đã phân công"]])}
    </div>
    ${panel("Danh sách khu vực", "Chọn một hoặc nhiều tổ để phân công ngay. Bấm tên công ty để xem đầu mối.", table(["Khu vực", "Số hộ / nguồn thải", "Công ty thu gom và thu tiền", "Hiệu lực", "Trạng thái", ""], rows))}
    <p class="table-empty" data-management-empty hidden>Không có khu vực phù hợp. Thử đổi bộ lọc.</p>
  </section>`;
}

filterManagementAreas = function () {
  const host = document.querySelector("[data-management-list]");
  if (!host) return;
  const query = (host.querySelector("[data-management-search]")?.value || "").trim().toLowerCase();
  const unit = host.querySelector("[data-management-unit]")?.value || "all";
  const status = host.querySelector("[data-management-status]")?.value || "all";
  let count = 0;
  host.querySelectorAll("[data-management-row]").forEach(row => {
    const area = MANAGEMENT_AREAS.find(item => item.id === row.dataset.id);
    const attention = area.conflict || !area.unit;
    row.hidden = !(`${area.id} ${area.name}`.toLowerCase().includes(query) && (unit === "all" || area.unit === unit) && (status === "all" || (status === "attention" ? attention : !attention)));
    if (!row.hidden) count++;
  });
  const empty = host.querySelector("[data-management-empty]");
  if (empty) empty.hidden = count !== 0;
};

function singleAreaDetail() {
  const area = managementArea();
  const homes = Array.from({ length: 6 }, (_, index) => ({
    code: `${area.id}-H${String(index + 1).padStart(4, "0")}`,
    name: ["Nguyễn Văn An", "Trần Thị Bình", "Lê Minh Châu", "Tạp hóa Minh Anh", "Phạm Văn Dũng", "Võ Thị Hà"][index],
    address: `${12 + index * 3} Đường ${Number(area.id.slice(2))}, ${area.name}`
  }));
  return `${pageHeader(area.id, area.name, `${area.households} hộ / chủ nguồn thải · ${area.unit ? `Hiệu lực ${area.start}–${area.end}` : "Chưa có công ty phụ trách"}`, actionButton("← Quản lý khu vực", "go:routes") + `<button class="button button-primary" data-management="assign" data-id="${area.id}">${area.unit ? "Sửa phân công" : "Phân công công ty"}</button>`)}
  ${area.conflict || !area.unit ? `${rules(`${singleAreaStatus(area)}`, [`${area.conflict ? "Đề xuất thứ hai chưa có hiệu lực. Cần điều chỉnh ngày hoặc thực hiện bàn giao." : "Chưa có căn cứ về công ty đang phục vụ. Giữ trạng thái chờ xác minh, không tự gán."}`], "warning")}` : ""}
  ${panel("Công ty phụ trách thu gom và thu tiền", "Một đầu mối chịu trách nhiệm với xã trên khu vực trong cùng thời gian hiệu lực.", area.unit ? `<p>${managementUnitLink(area.unit)}</p><p>Đầu mối: ${escapeHtml(managementUnit(area.unit).contact)} · ${escapeHtml(managementUnit(area.unit).phone)}</p>` : `<p>${badge("Chưa phân công")}</p>`, area.unit ? `<button class="button button-small" data-management="report" data-id="${area.id}">Xem tiến độ thu tiền</button>` : "")}
  <details class="panel review-map"><summary>Xem sơ đồ khu vực (minh họa)</summary><div class="panel-body"><svg viewBox="0 0 800 150" role="img" aria-label="Sơ đồ khu vực ${area.name}" style="width:100%;max-height:180px"><rect x="10" y="10" width="780" height="130" rx="12" fill="#EAF6EF"/><path d="M30 75H770M260 20V130M540 20V130" stroke="white" stroke-width="12"/><rect x="285" y="25" width="230" height="100" rx="8" fill="#16794A"/><text x="400" y="80" text-anchor="middle" fill="white" font-size="20">${area.name}</text></svg></div></details>
  ${panel("Hộ / chủ nguồn thải trong khu vực", `6 bản ghi minh họa trên tổng ${area.households}. Danh sách hộ chuẩn và đơn vị thực tế vẫn cần quy trình xác minh dữ liệu.`, table(["Mã hộ", "Tên hộ / cơ sở", "Địa chỉ", "Loại"], homes.map((home, index) => `<tr><td>${home.code}</td><td>${home.name}</td><td>${home.address}</td><td>${index === 3 ? "Hộ kinh doanh" : "Hộ gia đình"}</td></tr>`)))}
  ${panel("Lịch sử phân công", "Đổi công ty phải tạo phân công mới và bàn giao; không sửa hoặc xóa lịch sử cũ.", table(["Nhiệm vụ", "Công ty", "Hiệu lực", "Trạng thái"], [`<tr><td>Thu gom và thu tiền</td><td>${managementUnitLink(area.unit)}</td><td>${area.unit ? `${area.start} → ${area.end}` : "—"}</td><td>${badge(area.unit ? "Đang áp dụng" : "Chưa phân công")}</td></tr>`]))}`;
}

function singleCollectionUnits() {
  return `${pageHeader("Danh mục phối hợp", "Đơn vị thu gom và thu tiền", "Mỗi công ty phụ trách cả cung cấp dịch vụ và thu tiền tại các khu vực được giao.", actionButton("Quản lý khu vực", "go:routes") + '<button class="button button-primary" data-management="unit-create">+ Thêm đơn vị</button>')}
  ${rules("Danh mục công ty", ["Thông tin công ty cập nhật tạm trong phiên để trình diễn; việc phân công thực hiện tại Quản lý khu vực.", "Không xóa hoặc tạm ngưng công ty còn khu vực hay lịch sử dữ liệu.", "Trung tâm Cung ứng dịch vụ công của xã là một đơn vị thu gom trong danh mục, dùng chung vai trò và màn hình với các công ty."])}
  <section data-unit-list><div class="filter-bar"><label class="toolbar-field grow">Tìm đơn vị<input class="control" data-unit-search placeholder="Tên công ty hoặc đầu mối"></label></div>
  ${panel(`${MANAGEMENT_UNITS.length} đơn vị`, "Không xóa hoặc tạm ngưng công ty còn khu vực hay lịch sử dữ liệu.", table(["Công ty", "Đầu mối", "Khu vực phụ trách", "Trạng thái", "Thao tác"], MANAGEMENT_UNITS.map(unit => `<tr data-unit-row data-search="${escapeHtml((unit.name + " " + unit.contact).toLowerCase())}"><td>${managementUnitLink(unit.id)}<span class="cell-subtitle">${unit.id}</span></td><td>${escapeHtml(unit.contact)}<span class="cell-subtitle">${escapeHtml(unit.phone)}</span></td><td>${MANAGEMENT_AREAS.filter(area => area.unit === unit.id).length} khu vực<br><button class="link-button" data-management="unit-areas" data-id="${unit.id}">Xem khu vực</button></td><td>${badge(unit.status === "active" ? "Hoạt động" : "Tạm ngưng")}</td><td><div class="table-actions"><button class="button button-small" data-management="unit-edit" data-id="${unit.id}">Sửa</button><button class="button button-small" data-management="unit-delete" data-id="${unit.id}">Xóa</button></div></td></tr>`)))}<p data-unit-empty hidden>Không tìm thấy đơn vị phù hợp.</p></section>`;
}

function singleCompanyProgress() {
  const filter = managementReportFilter;
  const checkpoint = REVIEW_CHECKPOINTS[filter.period];
  const records = SINGLE_AREA_REPORT.filter(row => row.period === filter.period && (filter.unit === "all" || row.unit === filter.unit) && (filter.area === "all" || row.area === filter.area));
  const groups = [...MANAGEMENT_UNITS, { id: "unassigned", name: "Chưa phân công" }].map(unit => {
    const rows = records.filter(row => row.unit === unit.id);
    return { ...unit, rows, due: rows.reduce((sum, row) => sum + row.due, 0), paid: rows.reduce((sum, row) => sum + row.paid, 0), confirmed: rows.reduce((sum, row) => sum + row.confirmed, 0) };
  }).filter(group => group.rows.length);
  const due = records.reduce((sum, row) => sum + row.due, 0);
  const paid = records.reduce((sum, row) => sum + row.paid, 0);
  const confirmed = records.reduce((sum, row) => sum + row.confirmed, 0);
  const missing = records.filter(row => row.unit === "unassigned");
  const groupState = group => group.id === "unassigned" ? "attention" : group.paid - group.confirmed !== 0 ? "attention" : "matched";
  const rows = groups.map(group => {
    const rate = group.due ? group.paid / group.due * 100 : 0;
    const gap = group.paid - group.confirmed;
    const state = groupState(group);
    return `<tr data-row data-group="${state}" data-search="${escapeHtml(group.name)}" class="${state === "attention" ? "is-attention" : ""}">
      <td>${group.id === "unassigned" ? "<strong>Chưa phân công</strong>" : managementUnitLink(group.id)}<span class="cell-subtitle">${group.rows.length} khu vực</span></td>
      <td class="money">${managementMoney(group.due)}</td>
      <td class="money">${managementMoney(group.paid)}</td>
      <td class="money">${managementMoney(group.confirmed)}</td>
      <td>${delta(gap, gap ? "báo thu chưa khớp thực nhận" : "đã khớp thực nhận", managementMoney)}</td>
      <td class="money">${managementMoney(group.due - group.paid)}</td>
      <td><div class="cell-progress">${progressBar(rate, rate < checkpoint.target ? "warning" : "")}<span class="num">${rate.toFixed(1)}%</span></div></td>
      <td>${group.id === "unassigned" ? badge("Cần phân công", "warning") : gap ? badge("Chờ thực nhận", "warning") : badge("Đã khớp", "success")}</td>
      <td>${group.id === "unassigned" ? `<button class="button button-small" data-management="area" data-id="${group.rows[0].area}">Phân công</button>` : `<button class="button button-small" data-management="notify" data-id="${group.id}">Thông báo</button>`}</td></tr>`;
  });
  return `${pageHeader("Giám sát cấp xã", "Báo cáo tiến độ thu tiền", "Tổng hợp theo công ty được giao khu vực. Xã theo dõi số công ty báo đã thu và số tiền thực nhận; tiền hộ do công ty trực tiếp quản lý.", actionButton("Xuất báo cáo", "exportData"))}
  ${summaryStrip([["Phải thu", managementMoney(due), "Theo danh sách khu vực phụ trách"], ["Công ty báo đã thu", managementMoney(paid), "Dữ liệu công ty cập nhật"], ["Số tiền thực nhận", managementMoney(confirmed), "Số tiền xã thực nhận từ công ty"], ["Chênh lệch chờ thực nhận", managementMoney(paid - confirmed), "Báo đã thu − số tiền thực nhận"], ["Còn phải thu", managementMoney(due - paid), "Phải thu − báo đã thu"]])}
  ${rules(`Mốc ${checkpoint.asOf} · mục tiêu mẫu ${checkpoint.target}% · hạn thu ${checkpoint.deadline}`, ["Chênh lệch = số công ty báo đã thu − số tiền thực nhận; ngưỡng cảnh báo chênh lệch chưa được cấu hình, cần BA xác nhận.", "Công ty phụ trách thu gom cũng là công ty thu tiền tại khu vực; xã thông báo đầu mối công ty, không điều hành nhân viên thu.", missing.length ? `${missing.length} khu vực chưa có công ty (${managementMoney(missing.reduce((sum, row) => sum + row.due, 0))} phải thu dự kiến) chỉ là số minh họa, chưa phải nghĩa vụ chính thức.` : "Mọi khu vực trong phạm vi lọc đã có công ty phụ trách."], missing.length ? "warning" : "", "Ngưỡng: chưa cấu hình")}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    <div class="filter-bar">${managementSelect("Kỳ báo cáo", "data-report-filter=period", [["2026-09", "Tháng 09/2026"], ["2026-08", "Tháng 08/2026"]], filter.period)}${managementSelect("Công ty phụ trách", "data-report-filter=unit", [["all", "Tất cả, gồm chưa phân công"], ["unassigned", "Chưa phân công"], ...MANAGEMENT_UNITS.map(unit => [unit.id, unit.name])], filter.unit)}${managementSelect("Khu vực", "data-report-filter=area", [["all", "Tất cả khu vực"], ...MANAGEMENT_AREAS.map(area => [area.id, area.name])], filter.area)}</div>
    ${chipBar([["all", "Tất cả"], ["attention", "Cần xử lý", "warning"], ["matched", "Đã khớp", "success"]], "công ty")}
    ${panel("Kết quả theo công ty", "", groups.length ? table(["Công ty / khu vực", { label: "Phải thu", num: true }, { label: "Báo đã thu", num: true }, { label: "Số tiền thực nhận", num: true }, { label: "Chênh lệch", num: true }, { label: "Còn phải thu", num: true }, "Tiến độ", "Trạng thái", ""], rows, { empty: "Không có công ty phù hợp với bộ lọc." }) : '<p class="table-empty">Không có dữ liệu trong phạm vi đã chọn.</p>')}
  </section>`;
}

function singleAssignment(ids) {
  const areas = MANAGEMENT_AREAS.filter(area => ids.includes(area.id));
  if (!areas.length) return;
  const body = reviewDialogShell(areas.length === 1 ? `Phân công · ${areas[0].name}` : `Phân công ${areas.length} khu vực`, "assign", ids[0]);
  managementDialog.ids = areas.map(area => area.id);
  const commonUnit = areas.every(area => area.unit === areas[0].unit) ? areas[0].unit || "" : "";
  const options = [["", "Chọn công ty"], ...MANAGEMENT_UNITS.filter(unit => unit.status === "active").map(unit => [unit.id, unit.name])];
  body.innerHTML = `<p>Một công ty phụ trách cả thu gom và thu tiền tại mỗi khu vực. ${areas.length > 1 ? "Lựa chọn áp dụng cho toàn bộ khu vực; lô không tự bỏ qua dòng lỗi." : "Công ty hiện tại được điền sẵn."}</p>
    <div class="form-grid">${managementSelect("Công ty thu gom và thu tiền", "id=singleUnit required", options, commonUnit)}${reviewField("Hiệu lực từ", "assignmentStart", "2026-09-15", "date")}${reviewField("Hiệu lực đến", "assignmentEnd", "2026-12-31", "date")}</div>
    <p><label><input type="checkbox" id="assignmentReplace"> Bàn giao: kết thúc phân công cũ vào ngày trước ngày hiệu lực mới</label></p>
    <div id="reviewAssignmentChecks" aria-live="polite"></div>
    ${areas.some(area => area.conflict) ? '<p class="callout warning">Đề xuất PC-KV22-02 đang trùng phân công hiện tại và chưa được áp dụng.</p><label><input type="checkbox" id="reviewResolveProposal"> Ghi nhận hủy đề xuất trùng PC-KV22-02 trong lần xác nhận mẫu này</label>' : ""}
    <section id="reviewHandover" hidden><h3>Bàn giao dữ liệu và công nợ hộ</h3><div id="reviewHandoverAmounts"></div>
      ${managementSelect("Trách nhiệm thu khoản nợ cũ", "id=reviewDebtOwner required", [["", "Chọn trách nhiệm"], ["old", "Công ty cũ tiếp tục thu nợ cũ"], ["new", "Bàn giao danh sách nợ cho công ty mới"]], "")}
      <p>Công ty cũ chịu trách nhiệm tiền đã nhận và số phải nộp còn thiếu. Công ty mới chịu dữ liệu phát sinh từ ngày hiệu lực; không chuyển doanh thu lịch sử.</p>
      <label><input id="reviewHandoverAgreed" type="checkbox"> Đã đối chiếu và thống nhất biên bản bàn giao với hai công ty</label></section>
    <label class="toolbar-field">Lý do / căn cứ<textarea class="control" id="reviewAssignmentReason" required placeholder="Số quyết định hoặc lý do điều chỉnh"></textarea></label><p id="assignmentValidation" role="status"></p>`;
  document.getElementById("dialogConfirm").textContent = "Xác nhận phân công mẫu";
  validateManagementAssignment();
}

reviewAssignment = singleAssignment;
validateManagementAssignment = function () {
  const control = document.getElementById("singleUnit");
  if (!control) return true;
  const areas = MANAGEMENT_AREAS.filter(area => managementDialog.ids.includes(area.id));
  const unit = control.value;
  const start = document.getElementById("assignmentStart").value;
  const end = document.getElementById("assignmentEnd").value;
  const replace = document.getElementById("assignmentReplace").checked;
  const handovers = areas.filter(area => area.unit && area.unit !== unit);
  let invalid = !unit || !start || !end || end < start;
  const rows = areas.map(area => {
    const changed = area.unit !== unit;
    const overlaps = area.unit && start <= area.end && end >= area.start;
    const conflict = changed && overlaps && (!replace || start <= area.start);
    invalid ||= Boolean(conflict);
    const status = !unit ? "Chưa chọn công ty" : !changed ? "Giữ nguyên phân công và hiệu lực cũ" : conflict ? "Trùng hiệu lực — cần bàn giao hoặc đổi ngày" : overlaps ? "Bàn giao hợp lệ; giữ lịch sử cũ" : "Tạo phân công mới";
    return `<tr><td>${area.name}</td><td>${escapeHtml(reviewUnitName(area.unit))}<span class="cell-subtitle">${area.unit ? `${area.start} → ${area.end}` : "Chưa có"}</span></td><td>${escapeHtml(reviewUnitName(unit))}<span class="cell-subtitle">${changed ? `${start || "—"} → ${end || "—"}` : "Không thay đổi"}</span></td><td>${status}</td></tr>`;
  });
  document.getElementById("reviewAssignmentChecks").innerHTML = table(["Khu vực", "Công ty hiện tại", "Công ty dự kiến", "Kiểm tra"], rows);
  const handover = document.getElementById("reviewHandover");
  handover.hidden = !handovers.length;
  const debtOwner = document.getElementById("reviewDebtOwner");
  const agreed = document.getElementById("reviewHandoverAgreed");
  debtOwner.required = Boolean(handovers.length);
  agreed.required = Boolean(handovers.length);
  document.getElementById("reviewHandoverAmounts").innerHTML = handovers.length ? table(["Khu vực / công ty cũ", "Nợ chưa thu", "Đã thu chờ xác nhận"], handovers.map(area => {
    const row = SINGLE_AREA_REPORT.find(item => item.area === area.id && item.period === "2026-09");
    return `<tr><td>${area.name}<br>${escapeHtml(reviewUnitName(area.unit))}</td><td>${managementMoney(row.due - row.paid)}</td><td>${managementMoney(row.paid - row.confirmed)}</td></tr>`;
  })) : "";
  if (handovers.length && (!debtOwner.value || !agreed.checked)) invalid = true;
  const pendingConflict = areas.some(area => area.conflict);
  const resolve = Boolean(document.getElementById("reviewResolveProposal")?.checked);
  if (pendingConflict && !resolve) invalid = true;
  const changed = areas.some(area => area.unit !== unit);
  const allowed = !invalid && (changed || resolve);
  document.getElementById("assignmentValidation").textContent = !unit ? "Chưa chọn công ty phụ trách." : end < start ? "Ngày kết thúc phải từ ngày bắt đầu trở đi." : !changed && !pendingConflict ? "Chưa có thay đổi công ty." : invalid ? "Chưa thể xác nhận: xử lý trùng hiệu lực, đề xuất cũ và thông tin bàn giao." : "Đã kiểm tra. Xác nhận chỉ mô phỏng, không lưu phân công.";
  document.getElementById("dialogConfirm").disabled = !allowed;
  return allowed;
};

Object.assign(VIEW_RENDERERS, {
  areaManagement: singleAreaManagement,
  areaManagementDetail: singleAreaDetail,
  collectionUnits: singleCollectionUnits,
  companyProgress: singleCompanyProgress
});
