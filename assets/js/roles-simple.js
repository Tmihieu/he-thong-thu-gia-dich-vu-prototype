"use strict";

// v3.1 — Rút gọn ba không gian: Công ty (1 màn), Người đi thu (1 màn), Quản trị hệ thống (3 màn).
// Dùng chung csDialog / csField / csSelect từ commune-simple.js. Thao tác cập nhật trong phiên xem.

Object.assign(ROLE_CONFIG, {
  company: {
    label: "Công ty môi trường", initials: "CT", description: "Công ty MTĐT Đông Thạnh · thu tiền hộ và nộp về xã", defaultScreen: "assigned",
    screens: [{ id: "assigned", group: "", label: "Hộ được giao", caption: "Phải thu, đã thu, đã nộp", icon: "households", view: "rsCompanyAssigned" }]
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
const RS_COMPANY = MANAGEMENT_UNITS[0];
const RS_ROWS = companyReceivables().map(row => ({ ...row, receipt: row.status === "paid" ? `BL-${row.period.replace("/", "").slice(0, 2)}26-${row.code.split("-")[1].slice(-4)}` : "" }));
const RS_STATUS = { unpaid: ["Chưa thu", "warning"], overdue: ["Quá hạn", "danger"], appointment: ["Đã hẹn", "info"], absent: ["Vắng nhà", "warning"], paid: ["Đã thu", "success"] };
const rsSum = list => list.reduce((t, r) => t + r.amount, 0);
const RS_REMIT = [
  { id: "NT-0826-01", period: "08/2026", date: "28/08/2026", method: "Chuyển khoản", ref: "VCB2608100442", amount: rsSum(RS_ROWS.filter(r => r.period === "08/2026" && r.status === "paid")), status: "Xã đã xác nhận" },
  { id: "NT-0926-01", period: "09/2026", date: "12/09/2026", method: "Chuyển khoản", ref: "VCB2609109715", amount: 199000, status: "Xã đã xác nhận" }
];
const RS_COLLECTOR = APP_DATA.assignedHouseholds.map(h => ({ ...h }));
const RS_USERS = [
  ...APP_DATA.users.map(u => ({ ...u })),
  { username: "congty.dongthanh", name: "Trần Hoàng Phúc", organization: "Công ty MTĐT Đông Thạnh", roles: "Công ty môi trường", lastLogin: "15/09 · 08:40", status: "Hoạt động" }
].map(u => ({ ...u, roles: u.roles === "Công ty thu gom" ? "Công ty môi trường" : u.roles === "Nhân viên thu của công ty" ? "Người đi thu" : u.roles === "Quản trị" ? "Quản trị hệ thống" : u.roles }));
const RS_ROLES = [
  { name: "Cán bộ xã", scope: "Toàn xã", functions: "Đối tượng, khoản thu, khu vực, công ty, tiến độ, đối soát, khiếu nại", perms: { view: true, edit: true, approve: false, export: true } },
  { name: "Công ty môi trường", scope: "Đúng một công ty", functions: "Hộ được giao, kết quả thu, kê khai nộp", perms: { view: true, edit: true, approve: false, export: true } },
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
const rsState = { period: "09/2026", seq: { remit: 2, user: 1, tariff: 1, backup: 1 } };
const rsBtn = (label, action, id = "", tone = "secondary", small = false) => `<button type="button" class="button button-${tone}${small ? " button-small" : ""}" data-rs="${action}"${id ? ` data-id="${id}"` : ""}>${label}</button>`;
const rsToday = "17/09/2026";

// ---------- Công ty: Hộ được giao ----------
function rsCompanyAssigned() {
  const periods = [...new Set(RS_ROWS.map(r => r.period))].sort((a, b) => b.slice(3).localeCompare(a.slice(3)) || b.localeCompare(a));
  const current = RS_ROWS.filter(r => r.period === rsState.period);
  const paid = current.filter(r => r.status === "paid");
  const remitted = RS_REMIT.filter(r => r.period === rsState.period);
  const due = rsSum(current), collected = rsSum(paid), remittedSum = rsSum(remitted);
  const areas = [...new Set(RS_ROWS.map(r => r.area))].sort();
  const rows = RS_ROWS.filter(r => r.period === rsState.period).map(r => {
    const [label, tone] = RS_STATUS[r.status];
    return `<tr data-row data-group="${r.status}" data-area="${escapeHtml(r.area)}" data-search="${escapeHtml(`${r.code} ${r.name} ${r.address} ${r.phone} ${r.receipt}`.toLowerCase())}" class="${r.status === "overdue" ? "is-attention" : ""}">
      <td><span class="cell-title">${escapeHtml(r.name)}</span><span class="cell-subtitle">${r.code}${r.kind === "business" ? " · Hộ KD" : ""}</span></td>
      <td><span class="cell-title" style="font-weight:600">${escapeHtml(r.address)}</span><span class="cell-subtitle">${r.area} · ${r.phone}</span></td>
      <td>${r.dueDate}</td>
      <td class="money">${formatMoney(r.amount)}</td>
      <td>${badge(label, tone)}${r.note ? `<span class="cell-subtitle">${escapeHtml(r.note)}</span>` : ""}</td>
      <td>${r.receipt || "—"}</td>
      <td>${r.status === "paid" ? "" : rsBtn("Cập nhật", "coUpdate", r.charge, "primary", true)}</td></tr>`;
  });
  const remitRows = remitted.map(r => `<tr><td><span class="cell-title">${r.id}</span><span class="cell-subtitle">${r.date}</span></td><td>${r.method}<span class="cell-subtitle">${r.ref}</span></td><td class="money">${formatMoney(r.amount)}</td><td>${badge(r.status, r.status === "Xã đã xác nhận" ? "success" : "warning")}</td></tr>`);
  return `${csHeader("Hộ được giao", rsBtn("Kê khai tiền đã nộp", "coRemit") + rsBtn("Cập nhật kết quả thu", "coUpdate", "", "primary"), `${escapeHtml(RS_COMPANY.name)} · ${MANAGEMENT_AREAS.filter(a => a.unit === RS_COMPANY.id).length} khu vực được giao`)}
  <div class="filter-bar">${filterField("Kỳ thu", csSelect('data-rs-filter="period"', periods.map(p => [p, `Tháng ${p}`]), rsState.period))}</div>
  ${summaryStrip([["Phải thu kỳ này", formatMoney(due), `${current.length} hộ`], ["Đã thu", formatMoney(collected), `${paid.length} hộ · ${due ? Math.round(collected / due * 100) : 0}%`], ["Đã nộp về xã", formatMoney(remittedSum), `${remitted.length} lần nộp`], ["Còn phải nộp", formatMoney(collected - remittedSum), collected - remittedSum > 0 ? "Đã thu chưa nộp" : "Đã nộp đủ"]])}
  <section data-table-filter data-chip-key="group" data-count-label="hộ">
    ${filterBar(filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(a => [a, a])])), "Tên hộ, mã hộ, địa chỉ, SĐT, biên lai...")}
    ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["appointment", "Đã hẹn"], ["absent", "Vắng nhà", "warning"], ["paid", "Đã thu", "success"]], "hộ")}
    ${panel(`Danh sách hộ · kỳ ${rsState.period}`, "", table(["Hộ", "Địa chỉ", "Hạn nộp", { label: "Số tiền", num: true }, "Kết quả thu", "Biên lai", ""], rows, { empty: "Không có hộ phù hợp." }))}
  </section>
  <div class="stack-gap"></div>
  ${panel(`Tiền đã nộp về xã · kỳ ${rsState.period}`, "", remitRows.length ? table(["Lần nộp", "Hình thức / chứng từ", { label: "Số tiền", num: true }, "Trạng thái"], remitRows, { static: true }) : '<p class="table-empty">Chưa kê khai lần nộp nào trong kỳ.</p>')}`;
}

// ---------- Người đi thu: Danh sách hộ ----------
function rsCollectorList() {
  const c = APP_DATA.collector;
  const paidRows = RS_COLLECTOR.filter(h => h.category === "paid");
  const rows = RS_COLLECTOR.map(h => `<tr data-row data-group="${h.category}" data-search="${escapeHtml(`${h.code} ${h.name} ${h.address} ${h.note}`.toLowerCase())}" class="${h.category === "overdue" ? "is-attention" : ""}">
      <td class="num">${h.order}</td>
      <td><span class="cell-title">${escapeHtml(h.name)}</span><span class="cell-subtitle">${h.code}</span></td>
      <td><span class="cell-title" style="font-weight:600">${escapeHtml(h.address)}</span><span class="cell-subtitle">${h.phone}</span></td>
      <td>${h.debt}${h.periods > 1 ? `<span class="cell-subtitle">${h.periods} kỳ</span>` : ""}</td>
      <td class="money">${h.amount ? formatMoney(h.amount) : "—"}</td>
      <td>${badge(h.result, h.category === "paid" ? "success" : h.category === "overdue" || h.category === "ended" ? "danger" : h.category === "appointment" ? "info" : "warning")}<span class="cell-subtitle">${escapeHtml(h.note)}</span></td>
      <td>${h.category === "paid" || h.category === "ended" ? "" : rsBtn("Cập nhật", "clUpdate", h.code, "primary", true)}</td></tr>`);
  return `${csHeader("Danh sách hộ đi thu", rsBtn("Cập nhật kết quả", "clUpdate", "", "primary"), `${c.name} · ${escapeHtml(RS_COMPANY.name)} · ${c.area} · hôm nay ${rsToday}`)}
  ${summaryStrip([["Hộ được giao", String(RS_COLLECTOR.length), "Danh sách công ty giao"], ["Đã thu", String(paidRows.length), formatMoney(rsSum(paidRows))], ["Chưa thu", String(RS_COLLECTOR.filter(h => !["paid", "ended"].includes(h.category)).length), `${RS_COLLECTOR.filter(h => h.category === "overdue").length} quá hạn`], ["Tiền mặt đang giữ", formatMoney(rsSum(paidRows.filter(h => h.result.includes("tiền mặt")))), "Bàn giao cuối ca"]])}
  <section data-table-filter data-chip-key="group" data-count-label="hộ">
    ${filterBar("", "Tên hộ, mã hộ, địa chỉ...")}
    ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["absent", "Vắng nhà", "warning"], ["appointment", "Đã hẹn"], ["paid", "Đã thu", "success"]], "hộ")}
    ${panel("Hộ trong ca hôm nay", "", table(["#", "Hộ", "Địa chỉ", "Kỳ nợ", { label: "Số tiền", num: true }, "Kết quả", ""], rows, { empty: "Không có hộ phù hợp." }))}
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
  const districtRows = RS_DISTRICTS.map(d => `<tr><td><span class="cell-title">${d.name}</span><span class="cell-subtitle">${d.code} · ${d.note}</span></td><td class="num">${d.groups}</td><td class="num">${d.subjects.toLocaleString("vi-VN")}</td><td class="num">${MANAGEMENT_AREAS.filter((a, i) => Math.floor(i / 8) === RS_DISTRICTS.indexOf(d) && a.unit).map(a => a.unit).filter((v, i, arr) => arr.indexOf(v) === i).length}</td><td>${rsBtn("Sửa", "districtEdit", d.code, "secondary", true)}</td></tr>`);
  const unitRows = MANAGEMENT_UNITS.map(u => `<tr><td><span class="cell-title">${escapeHtml(u.name)}</span><span class="cell-subtitle">${u.id} · ${escapeHtml(u.contact)} · ${escapeHtml(u.phone)}</span></td><td class="num">${MANAGEMENT_AREAS.filter(a => a.unit === u.id).length}</td><td>${badge(u.status === "inactive" ? "Tạm ngưng" : "Hoạt động", u.status === "inactive" ? "neutral" : "success")}</td><td>${rsBtn("Sửa", "unitEdit", u.id, "secondary", true)}</td></tr>`);
  const tariffRows = RS_TARIFFS.map(t => `<tr><td><span class="cell-title">${t.code}</span><span class="cell-subtitle">${t.legal}</span></td><td>${t.scope}</td><td class="num">${t.collection}</td><td class="num">${t.transport}</td><td class="num">${t.processing}</td><td>${t.effective}</td><td>${badge(t.status, t.status === "Đang áp dụng" ? "success" : t.status === "Dự thảo" ? "info" : "neutral")}</td><td>${rsBtn("Sửa", "tariffEdit", t.code, "secondary", true)}</td></tr>`);
  const periodRows = CS_PERIODS.map(p => `<tr><td><span class="cell-title">${p.label}</span></td><td>${p.open} → ${p.due}</td><td>${p.legal}</td><td>${badge(p.status, p.status === "Đang thu" ? "success" : p.status === "Đã khóa" ? "neutral" : "info")}</td><td>${p.status === "Đã khóa" ? "" : rsBtn(p.status === "Đang thu" ? "Khóa kỳ" : "Bắt đầu thu", "periodStatus", p.id, "secondary", true)}</td></tr>`);
  return `${csHeader("Cấu hình nghiệp vụ", "", "Địa bàn & đơn vị · Biểu giá · Kỳ thu")}
  ${panel("Địa bàn", "", table(["Địa bàn", { label: "Tổ dân phố", num: true }, { label: "Đối tượng", num: true }, { label: "Công ty phụ trách", num: true }, ""], districtRows, { static: true }), rsBtn("+ Thêm địa bàn", "districtEdit", "", "secondary", true))}
  <div class="stack-gap"></div>
  ${panel("Đơn vị thu gom", "", table(["Công ty", { label: "Khu vực", num: true }, "Trạng thái", ""], unitRows, { static: true }), rsBtn("+ Thêm đơn vị", "unitEdit", "", "secondary", true))}
  <div class="stack-gap"></div>
  ${panel("Biểu giá", "Khoản đã phát hành giữ mức giá tại thời điểm phát hành, không đổi theo phiên bản mới.", table(["Phiên bản / căn cứ", "Phạm vi", { label: "Thu gom", num: true }, { label: "Vận chuyển", num: true }, { label: "Xử lý", num: true }, "Hiệu lực", "Trạng thái", ""], tariffRows, { static: true }), rsBtn("+ Thêm phiên bản", "tariffEdit", "", "secondary", true))}
  <div class="stack-gap"></div>
  ${panel("Kỳ thu", "", table(["Kỳ", "Thời gian thu", "Căn cứ giá", "Trạng thái", ""], periodRows, { static: true }), rsBtn("+ Tạo kỳ", "periodCreate", "", "secondary", true))}`;
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

Object.assign(VIEW_RENDERERS, { rsCompanyAssigned, rsCollectorList, rsAccounts, rsConfig, rsLogs });

// ---------- Hộp thoại ----------
const RS_DIALOGS = {
  coUpdate(chargeId) {
    const open = RS_ROWS.filter(r => r.status !== "paid" && r.period === rsState.period);
    const selected = open.find(r => r.charge === chargeId) || open[0];
    if (!selected) { showDemoNotice("Không còn hộ nào chưa thu trong kỳ."); return; }
    csDialog("coUpdate", selected.charge, "Cập nhật kết quả thu", `<div class="form-grid">
      ${csField("Hộ *", csSelect('id="rsCoCharge"', open.map(r => [r.charge, `${r.name} · ${r.code} · ${formatMoney(r.amount)}`]), selected.charge), true)}
      ${csField("Kết quả *", csSelect('id="rsCoResult"', [["paid", "Đã thu"], ["absent", "Vắng nhà"], ["appointment", "Đã hẹn"], ["unpaid", "Chưa thu"]], "paid"))}
      ${csField("Hình thức", csSelect('id="rsCoMethod"', [["Tiền mặt", "Tiền mặt"], ["Chuyển khoản", "Chuyển khoản"], ["Ứng dụng người dân", "Ứng dụng người dân"]], "Tiền mặt"))}
      ${csField("Số tiền", csInput("rsCoAmount", String(selected.amount), "number", 'min="0"'))}
      ${csField("Số biên lai", csInput("rsCoReceipt", "", "text", 'placeholder="Bắt buộc khi đã thu"'))}
      ${csField("Ngày", csInput("rsCoDate", CS_TODAY, "date", "required"))}
      ${csField("Ghi chú", csInput("rsCoNote", "", "text", 'placeholder="Hẹn lại, lý do vắng..."'))}
    </div>`, "Lưu kết quả");
  },
  coRemit() {
    const current = RS_ROWS.filter(r => r.period === rsState.period);
    const collected = rsSum(current.filter(r => r.status === "paid"));
    const remitted = rsSum(RS_REMIT.filter(r => r.period === rsState.period));
    csDialog("coRemit", "", "Kê khai tiền đã nộp về xã", `<div class="dialog-summary"><div><span>Kỳ</span><strong>${rsState.period}</strong></div><div><span>Đã thu</span><strong>${formatMoney(collected)}</strong></div><div><span>Còn phải nộp</span><strong>${formatMoney(collected - remitted)}</strong></div></div><div class="form-grid">
      ${csField("Số tiền nộp *", csInput("rsRmAmount", String(Math.max(collected - remitted, 0)), "number", 'min="1" required'))}
      ${csField("Hình thức *", csSelect('id="rsRmMethod"', [["Chuyển khoản", "Chuyển khoản vào tài khoản xã"], ["Tiền mặt tại xã", "Tiền mặt tại xã"]], "Chuyển khoản"))}
      ${csField("Ngày nộp *", csInput("rsRmDate", CS_TODAY, "date", "required"))}
      ${csField("Mã giao dịch / chứng từ *", csInput("rsRmRef", "", "text", "required"))}
      ${csField("Ghi chú", `<textarea class="control" id="rsRmNote" placeholder="Không bắt buộc"></textarea>`, true)}
    </div>`, "Gửi kê khai", "Xã xác nhận sau khi đối chiếu với sao kê hoặc phiếu thu.");
  },
  clUpdate(code) {
    const open = RS_COLLECTOR.filter(h => !["paid", "ended"].includes(h.category));
    const selected = open.find(h => h.code === code) || open[0];
    if (!selected) { showDemoNotice("Đã cập nhật hết các hộ trong ca."); return; }
    csDialog("clUpdate", selected.code, "Cập nhật kết quả", `<div class="form-grid">
      ${csField("Hộ *", csSelect('id="rsClCode"', open.map(h => [h.code, `${h.name} · ${h.address} · ${formatMoney(h.amount)}`]), selected.code), true)}
      ${csField("Kết quả *", csSelect('id="rsClResult"', [["cash", "Đã thu tiền mặt"], ["transfer", "Đã thu chuyển khoản"], ["absent", "Vắng nhà"], ["appointment", "Đã hẹn"], ["refused", "Từ chối nộp"]], "cash"))}
      ${csField("Số tiền", csInput("rsClAmount", String(selected.amount), "number", 'min="0"'))}
      ${csField("Số biên lai", csInput("rsClReceipt", "", "text", 'placeholder="Khi đã thu"'))}
      ${csField("Ngày quay lại / hẹn", csInput("rsClNext", "", "date"))}
      ${csField("Ghi chú", csInput("rsClNote", "", "text"), true)}
    </div>`, "Lưu kết quả");
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
  periodCreate() { CS_DIALOGS.openPeriod(); },
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
    const r = RS_ROWS.find(x => x.charge === csFormValue("rsCoCharge"));
    if (!r) return "";
    const result = csFormValue("rsCoResult");
    if (result === "paid" && !csFormValue("rsCoReceipt")) { showDemoNotice("Nhập số biên lai khi đã thu."); return null; }
    Object.assign(r, { status: result, receipt: result === "paid" ? csFormValue("rsCoReceipt") : "", note: result === "paid" ? `${csFormValue("rsCoMethod")} · ${csIsoToVi(csFormValue("rsCoDate"))}` : csFormValue("rsCoNote") || RS_STATUS[result][0], amount: result === "paid" ? Number(csFormValue("rsCoAmount")) || r.amount : r.amount });
    return `Đã cập nhật ${r.name}: ${RS_STATUS[result][0].toLowerCase()}.`;
  },
  coRemit() {
    const id = `NT-${rsState.period.replace("/", "").slice(0, 2)}26-${String(++rsState.seq.remit).padStart(2, "0")}`;
    RS_REMIT.push({ id, period: rsState.period, date: csIsoToVi(csFormValue("rsRmDate")), method: csFormValue("rsRmMethod"), ref: csFormValue("rsRmRef"), amount: Number(csFormValue("rsRmAmount")), status: "Chờ xã xác nhận" });
    return `Đã kê khai ${id} · ${formatMoney(Number(csFormValue("rsRmAmount")))}.`;
  },
  clUpdate() {
    const h = RS_COLLECTOR.find(x => x.code === csFormValue("rsClCode"));
    if (!h) return "";
    const result = csFormValue("rsClResult");
    const next = csIsoToVi(csFormValue("rsClNext"));
    const note = csFormValue("rsClNote");
    const map = {
      cash: { result: "Đã thu tiền mặt", category: "paid", note: `Nhận tiền mặt · ${rsToday}${csFormValue("rsClReceipt") ? ` · BL ${csFormValue("rsClReceipt")}` : ""}` },
      transfer: { result: "Đã thu", category: "paid", note: `Chuyển khoản · ${rsToday}${csFormValue("rsClReceipt") ? ` · BL ${csFormValue("rsClReceipt")}` : ""}` },
      absent: { result: "Vắng nhà", category: "absent", note: `Đã ghé ${rsToday}${next ? ` · quay lại ${next}` : ""}` },
      appointment: { result: "Đã hẹn", category: "appointment", note: next ? `Hẹn ${next}` : "Đã hẹn lại" },
      refused: { result: "Từ chối nộp", category: "unpaid", note: "Hộ từ chối nộp" }
    }[result];
    Object.assign(h, map, note ? { note: `${map.note} · ${note}` } : {}, map.category === "paid" ? { amount: Number(csFormValue("rsClAmount")) || h.amount, dueDate: "Đã hoàn tất", debtState: "Hết nợ", periods: 0 } : {});
    return `Đã cập nhật ${h.name}: ${map.result.toLowerCase()}.`;
  },
  userEdit(id) {
    const data = { name: csFormValue("rsUsName"), organization: csFormValue("rsUsOrg"), roles: csFormValue("rsUsRole"), status: csFormValue("rsUsStatus") };
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
  periodStatus(id) {
    const p = CS_PERIODS.find(x => x.id === id);
    if (!p) return "";
    if (p.status === "Đang thu") { p.status = "Đã khóa"; return `Đã khóa kỳ ${p.label}.`; }
    CS_PERIODS.forEach(x => { if (x.status === "Đang thu") x.status = "Đã khóa"; });
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
  },
  openPeriod(id) {
    CS_PERIODS.unshift({ id, label: `Tháng ${csPeriodLabel(id)}`, open: csIsoToVi(csFormValue("csPeriodOpen")), due: csIsoToVi(csFormValue("csPeriodDue")), legal: csFormValue("csPeriodLegal"), status: "Đã mở" });
    return `Đã tạo kỳ ${csPeriodLabel(id)}.`;
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
  return true;
};

document.addEventListener("click", event => {
  const button = event.target.closest("[data-rs]");
  if (!button || !["company", "collector", "administrator"].includes(currentRole)) return;
  const { rs: action, id } = button.dataset;
  if (RS_DIALOGS[action]) RS_DIALOGS[action](id || "");
});
document.addEventListener("change", event => {
  if (event.target.matches("[data-rs-filter]")) { rsState[event.target.dataset.rsFilter] = event.target.value; renderCurrentView({ keepFocus: true }); return; }
  if (csState.dialog?.kind === "coUpdate" && event.target.id === "rsCoCharge") { const r = RS_ROWS.find(x => x.charge === event.target.value); if (r) document.getElementById("rsCoAmount").value = r.amount; }
  if (csState.dialog?.kind === "clUpdate" && event.target.id === "rsClCode") { const h = RS_COLLECTOR.find(x => x.code === event.target.value); if (h) document.getElementById("rsClAmount").value = h.amount; }
});
