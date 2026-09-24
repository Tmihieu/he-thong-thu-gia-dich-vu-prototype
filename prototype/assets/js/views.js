"use strict";

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function badgeTone(value) {
  if (/Đã khớp|Đã thu|Đã phân công|Hoạt động|Đã nhập|Đã phát hành|Đã khóa|Tốt|Thành công|Đang áp dụng|Đạt mốc|Đã xác minh|Đã xử lý|Đã duyệt|Không lỗi|Đang cung cấp/.test(value)) return "success";
  if (/Chờ|Chậm|Theo dõi|Cần|Đề nghị|Tạm ngưng|Dự thảo|Vắng|Khiếu nại|Trong hạn|Nghi|Thiếu|Nhiều công ty|Cùng địa chỉ|Cùng tên|Chưa rõ|Khác phân công|Biến động|Chưa phân công|Chưa có đơn vị|Chưa thấy lỗi|Có thể chưa/.test(value)) return "warning";
  if (/Quá hạn|Cảnh báo|Sai|Lỗi|Từ chối|Chênh|Bị chặn|chấm dứt|Khóa thu|ngoài hệ thống|Không khuyến nghị|Đã chấm dứt/i.test(value)) return "danger";
  if (/Đang|100%|xác nhận|UAT|Bắt buộc/.test(value)) return "info";
  return "neutral";
}

function badge(status, tone) {
  const value = String(status || "");
  return `<span class="badge ${tone || badgeTone(value)}">${escapeHtml(value)}</span>`;
}

function actionButton(label, action, tone = "secondary", icon = "") {
  return `<button type="button" class="button button-${tone}" data-action="${action}">${icon ? `<span class="button-icon">${icon}</span>` : ""}${label}</button>`;
}

function pageHeader(eyebrow, title, description, actions = "") {
  return `<header class="page-header"><div><span class="eyebrow">${eyebrow}</span><h1 class="page-title">${title}</h1><p class="page-description">${description}</p></div><div class="page-actions">${actions}</div></header>`;
}

function kpi(label, value, note, tone = "") {
  return `<article class="kpi-card ${tone}"><div class="kpi-top"><span>${label}</span></div><strong class="kpi-value">${value}</strong><span class="kpi-note">${note}</span></article>`;
}

function kpiGrid(cards) { return `<section class="kpi-grid">${cards.join("")}</section>`; }

function summaryStrip(items) {
  return `<section class="summary-strip">${items.map(([label, value, note]) => `<div class="summary-item"><span>${label}</span><strong>${value}</strong>${note ? `<span>${note}</span>` : ""}</div>`).join("")}</section>`;
}

function panel(title, subtitle, body, action = "", extraClass = "") {
  return `<section class="panel ${extraClass}"><header class="panel-header"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</header><div class="panel-body ${body.includes("data-table") ? "flush" : ""}">${body}</div></section>`;
}

function table(headers, rows, options = {}) {
  const head = headers.map(h => typeof h === "string" ? `<th scope="col">${h}</th>` : `<th scope="col" class="${h.num ? "num" : ""}">${h.label}</th>`).join("");
  return `<div class="table-wrap ${options.static ? "static" : ""}"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows.join("")}</tbody></table>${options.empty ? `<p class="table-empty" data-table-empty hidden>${options.empty}</p>` : ""}</div>`;
}

function filterField(label, control, extraClass = "") {
  return `<label class="toolbar-field ${extraClass}"><span>${label}</span>${control}</label>`;
}

function filterSelect(key, options, selected = "all") {
  return `<select class="control" data-table-key="${key}">${options.map(([value, label]) => `<option value="${value}" ${value === selected ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function filterBar(fields, placeholder = "Tìm theo mã, tên, địa chỉ...") {
  return `<div class="filter-bar">${filterField("Tìm kiếm", `<input class="control" type="search" data-table-search placeholder="${placeholder}">`, "grow")}${fields}</div>`;
}

function chipBar(chips, countLabel = "dòng") {
  return `<div class="chip-bar">${chips.map(([value, label, tone = ""], i) => `<button type="button" class="chip ${tone} ${i === 0 ? "active" : ""}" data-table-chip="${value}">${label}<b>0</b></button>`).join("")}<span class="result-line" data-table-count></span></div>`;
}

function rules(title, items, tone = "", note = "") {
  return `<details class="rules ${tone}"><summary>${title}${note ? `<small>${note}</small>` : ""}</summary><ul>${items.map(item => `<li>${item}</li>`).join("")}</ul></details>`;
}

function progressBar(value, tone = "") { return `<div class="progress ${tone}"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`; }

function delta(value, note = "", format = formatMoney) {
  const tone = value === 0 ? "zero" : value > 0 ? "pos" : "neg";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `<span class="delta ${tone}">${sign}${format(Math.abs(value))}${note ? `<small>${note}</small>` : ""}</span>`;
}

function areaBars() {
  return `<div class="bar-chart">${APP_DATA.areas.map((area, i) => `<div class="bar-row"><span class="bar-label">${area.name}</span><div class="bar-track"><div class="bar-fill ${i === 2 ? "warning" : i === 1 ? "navy" : ""}" style="width:${area.rate}%">${area.rate}%</div></div><span class="bar-value">${area.rate}%</span></div>`).join("")}</div>`;
}

function communeDashboard() {
  const pending = APP_DATA.requests.filter(r => r.status !== "Đã duyệt").length;
  return `${pageHeader("Không gian cán bộ xã", "Tổng quan nghiệp vụ kỳ 09/2026", "Chất lượng dữ liệu hộ, phát hành khoản, phân công công ty theo khu vực và công nợ trên toàn xã.", actionButton("Kiểm tra kỳ", "precheckPeriod") + actionButton("Sinh đợt hóa đơn", "generateBatch", "primary", "+"))}
  ${kpiGrid([
    kpi("Đối tượng đang quản lý", "50.284", "48.672 hợp đồng còn hiệu lực"),
    kpi("Khoản đã phát hành", "48.654", "18 khoản bị giữ do lỗi dữ liệu", "success"),
    kpi("Tiến độ thu", "73,0%", "2,792 / 3,824 tỷ đồng", "success"),
    kpi("Công nợ hiện tại", "1,032 tỷ", "428 hồ sơ quá hạn từ 30 ngày", "warning")
  ])}
  <div class="content-grid">
    ${panel("Tỷ lệ thu theo địa bàn", "Số tiền công ty báo đã thu trên tổng khoản phát hành", areaBars(), actionButton("Xem tiến độ thu", "go:debts", "quiet"))}
    ${panel("Việc cần xử lý", "Ưu tiên theo ảnh hưởng đến kỳ", `<div class="task-list">
      <article class="task-item"><span class="task-icon">1</span><div><h4>18 khoản lỗi chưa phát hành</h4><p>Thiếu biểu giá hoặc hợp đồng chưa hợp lệ.</p></div><button class="button button-small" data-action="precheckPeriod">Kiểm tra</button></article>
      <article class="task-item"><span class="task-icon">2</span><div><h4>23 bản ghi import lỗi</h4><p>Lô IMP-2609-04 đang chờ chuẩn hóa.</p></div><button class="button button-small" data-action="resolveDuplicate">Xử lý</button></article>
      <article class="task-item"><span class="task-icon">3</span><div><h4>${pending} đề nghị chờ xử lý</h4><p>Kiểm tra hồ sơ trước khi trình lãnh đạo.</p></div><button class="button button-small" data-action="go:requests">Mở</button></article>
    </div>`)}
  </div>`;
}

function subjects() {
  const serviceGroup = s => /Đề nghị|Chờ/.test(s.serviceStatus) ? "pending" : /chấm dứt/.test(s.serviceStatus) ? "ended" : "active";
  const rows = APP_DATA.subjects.map(s => `<tr data-row data-search="${escapeHtml(`${s.code} ${s.name} ${s.address} ${s.unit} ${s.area}`)}" data-type="${escapeHtml(s.type)}" data-group="${serviceGroup(s)}" class="${serviceGroup(s) === "pending" ? "is-attention" : ""}">
    <td><button class="link-button" data-action="genericDetail">${s.code}</button><span class="cell-subtitle">${s.type}</span></td>
    <td><span class="cell-title">${escapeHtml(s.name)}</span><span class="cell-subtitle">${escapeHtml(s.address)}</span></td>
    <td><span class="cell-title">${escapeHtml(s.area)}</span><span class="cell-subtitle">${escapeHtml(s.unit)}</span></td>
    <td><span class="cell-title">${s.contract}</span><span class="cell-subtitle">${s.tariff}</span></td>
    <td class="money">${formatMoney(s.amount)}</td>
    <td>${badge(s.serviceStatus)}${s.suspensionRequest ? `<span class="cell-subtitle">Không tự động cắt dịch vụ</span>` : ""}</td>
    <td><div class="table-actions">${s.suspensionRequest ? `<button class="button button-small button-primary" data-action="requestServiceSuspension">Xem yêu cầu</button>` : `<button class="button button-small" data-action="classifyAssign">Phân loại</button>`}</div></td></tr>`);
  return `${pageHeader("Dữ liệu nền", "Đối tượng, phân loại và hợp đồng", "Xã giữ danh sách gốc; mỗi đối tượng gắn loại, khu vực, công ty phụ trách, hợp đồng và trạng thái dịch vụ có hiệu lực theo thời gian.", actionButton("Nhập dữ liệu", "importData") + actionButton("Thêm hộ/đối tượng", "addSubject", "primary", "+"))}
  ${rules("Nguyên tắc dữ liệu đối tượng", [
    "Thứ tự bắt buộc: tạo mã hộ → phân loại → gán khu vực và công ty phụ trách → lập hợp đồng → sinh khoản theo kỳ.",
    "Hộ đang nợ không bị tự động cắt dịch vụ; đi theo luồng ghi nhận nợ → cảnh báo → lập đề nghị → lãnh đạo duyệt tạm ngưng → thông báo nhà thầu.",
    "Phân công có thời gian hiệu lực, không ghi đè lịch sử."
  ], "", "3 quy tắc")}
  <section data-table-filter data-chip-key="group" data-count-label="đối tượng">
    ${filterBar(filterField("Loại đối tượng", filterSelect("type", [["all", "Tất cả loại"], ["Hộ gia đình", "Hộ gia đình"], ["Hộ kinh doanh", "Hộ kinh doanh"], ["Doanh nghiệp", "Doanh nghiệp"]])), "Mã, tên, địa chỉ, khu vực, công ty...")}
    ${chipBar([["all", "Tất cả"], ["active", "Đang cung cấp", "success"], ["pending", "Chờ xử lý", "warning"], ["ended", "Đã chấm dứt"]])}
    ${panel("Danh sách đối tượng", "50.284 đối tượng toàn xã · bảng dưới là mẫu minh họa", table(["Mã / loại", "Đối tượng", "Khu vực / công ty phụ trách", "Hợp đồng / nhóm giá", { label: "Mức kỳ này", num: true }, "Dịch vụ", ""], rows, { empty: "Không có đối tượng phù hợp với bộ lọc." }))}
  </section>`;
}

function periods() {
  const rows = APP_DATA.periods.map(p => `<tr><td><span class="cell-title">${p.code}</span><span class="cell-subtitle">${p.label}</span></td><td>${p.legal}</td><td class="num">${p.contracts.toLocaleString("vi-VN")}</td><td class="num">${p.charges.toLocaleString("vi-VN")}</td><td>${p.errors ? badge(`${p.errors} lỗi`, "danger") : badge("Không lỗi", "success")}</td><td>${badge(p.status)}</td><td><button class="button button-small" data-action="precheckPeriod">Kiểm tra</button></td></tr>`);
  return `${pageHeader("Lập khoản", "Kỳ và đợt thu", "Mỗi kỳ chụp lại căn cứ giá và chỉ phát hành khi dữ liệu đầu vào vượt qua kiểm tra.", actionButton("Kiểm tra kỳ", "precheckPeriod") + actionButton("Tạo kỳ mới", "createPeriod", "primary", "+"))}
  ${rules("Kỳ 09/2026 đang áp dụng phiên bản giá mới", ["Quy tắc chuyển tiếp giữa QĐ 67/2025 và QĐ 65/2026 cần BA xác nhận trước vận hành thật.", "Kỳ đã khóa không được sửa trực tiếp."], "warning")}
  ${panel("Danh sách kỳ", "", table(["Kỳ", "Căn cứ giá", { label: "Hợp đồng", num: true }, { label: "Khoản", num: true }, "Kiểm tra", "Trạng thái", ""], rows, { static: true }))}`;
}

function billing() {
  const rows = APP_DATA.batches.map(b => `<tr><td><button class="link-button" data-action="genericDetail">${b.code}</button></td><td>${b.area}</td><td class="num">${b.count.toLocaleString("vi-VN")}</td><td class="money">${b.value}</td><td>${b.errors ? badge(`${b.errors} lỗi`, "danger") : badge("Không lỗi", "success")}</td><td>${b.issuedBy}</td><td>${badge(b.status)}</td><td>${b.status.includes("Chờ") ? `<button class="button button-small" data-action="issueBatch">Phát hành</button>` : `<button class="button button-small" data-action="genericDetail">Xem</button>`}</td></tr>`);
  return `${pageHeader("Lập khoản", "Khoản phải thu và hóa đơn", "Sinh hàng loạt từ hợp đồng, giữ khoản lỗi ở hàng chờ và cấp mã thanh toán sau khi phát hành.", actionButton("Tạo khoản lẻ", "addAdHocCharge") + actionButton("Sinh đợt khoản", "generateBatch", "primary", "+"))}
  ${summaryStrip([["Đợt phát hành", "03", "2 đã phát hành · 1 đang chờ"], ["Khoản hợp lệ", "48.654", "Đã cấp mã thanh toán"], ["Giá trị phát hành", "3,824 tỷ", "Theo snapshot biểu giá"], ["Khoản bị giữ", "18", "Không đi vào danh sách thu"]])}
  ${panel("Các đợt của kỳ 09/2026", "Cán bộ chịu trách nhiệm phát hành một lần cho toàn đợt", table(["Mã đợt", "Địa bàn", { label: "Số khoản", num: true }, { label: "Giá trị", num: true }, "Kiểm tra", "Người phát hành", "Trạng thái", ""], rows, { static: true }))}`;
}

function requestRows(action) {
  return APP_DATA.requests.map(r => {
    const act = typeof action === "function" ? action(r) : action;
    const group = r.status === "Chờ duyệt" ? "waiting" : r.status === "Cần bổ sung" ? "incomplete" : "done";
    return `<tr data-row data-search="${escapeHtml(`${r.code} ${r.type} ${r.subject} ${r.reason} ${r.createdBy}`)}" data-type="${escapeHtml(r.type)}" data-group="${group}" class="${group === "incomplete" ? "is-attention" : ""}"><td><button class="link-button" data-action="${act}">${r.code}</button></td><td>${badge(r.type, "info")}</td><td><span class="cell-title">${r.subject}</span><span class="cell-subtitle">${r.reason}</span></td><td class="money">${r.amount ? formatMoney(r.amount) : "—"}</td><td>${r.createdBy}</td><td>${r.age}</td><td>${badge(r.status)}</td><td><button class="button button-small" data-action="${act}">${act === "reviewApproval" ? "Xem xét" : "Xem hồ sơ"}</button></td></tr>`;
  });
}

function requestFilters() {
  const types = [...new Set(APP_DATA.requests.map(r => r.type))];
  return `${filterBar(filterField("Loại đề nghị", filterSelect("type", [["all", "Tất cả loại"], ...types.map(t => [t, t])])), "Mã, đối tượng, lý do, người lập...")}
  ${chipBar([["all", "Tất cả"], ["waiting", "Chờ duyệt", "warning"], ["incomplete", "Cần bổ sung", "warning"], ["done", "Đã có kết luận", "success"]], "hồ sơ")}`;
}

function requests() {
  return `${pageHeader("Phê duyệt", "Đề nghị cần phê duyệt", "Tạm ngưng dịch vụ, miễn giảm, hoàn, xóa nợ và hủy hóa đơn đều phải có hồ sơ và người có thẩm quyền duyệt.", actionButton("Lập đề nghị", "createRequest", "primary", "+"))}
  ${rules("Tách người lập và người duyệt", ["Hệ thống chặn tự phê duyệt kể cả khi một tài khoản được gán nhiều vai trò.", "Mọi quyết định giữ đầy đủ căn cứ, bằng chứng và lịch sử."], "warning")}
  <section data-table-filter data-chip-key="group" data-count-label="hồ sơ">
    ${requestFilters()}
    ${panel("Hồ sơ đã lập", "", table(["Mã", "Loại", "Đối tượng / lý do", { label: "Ảnh hưởng", num: true }, "Người lập", "Thời gian", "Trạng thái", ""], requestRows(r => r.type === "Tạm ngưng DV" ? "requestServiceSuspension" : "genericDetail"), { empty: "Không có hồ sơ phù hợp." }))}
  </section>`;
}

function leaderApprovals() {
  return `${pageHeader("Quyết định nghiệp vụ và tài chính", "Hàng chờ phê duyệt", "Lãnh đạo duyệt hoặc từ chối tạm ngưng dịch vụ, miễn giảm, hoàn tiền, xóa nợ và hủy/điều chỉnh hóa đơn.", actionButton("Xem quy chế", "policyPreview"))}
  ${rules("Kiểm tra tách bạch trước khi duyệt", ["Không cho người lập tự duyệt hoặc áp dụng hồ sơ thiếu căn cứ bắt buộc.", "Hồ sơ xếp theo tuổi và mức ảnh hưởng."], "", "2 quy tắc")}
  <section data-table-filter data-chip-key="group" data-count-label="hồ sơ">
    ${requestFilters()}
    ${panel("Hồ sơ chờ quyết định", "", table(["Mã", "Loại", "Đối tượng / lý do", { label: "Ảnh hưởng", num: true }, "Người lập", "Tuổi", "Trạng thái", ""], requestRows("reviewApproval"), { empty: "Không có hồ sơ phù hợp." }))}
  </section>`;
}

function leaderAlerts() {
  return `${pageHeader("Kiểm soát", "Cảnh báo và sai lệch", "Rủi ro về tiền phần xử lý, dữ liệu hộ, công nợ và tích hợp có thể ảnh hưởng đến việc xác nhận báo cáo và khóa sổ.", actionButton("Xuất cảnh báo", "exportData"))}
  ${summaryStrip([["Mức nghiêm trọng", "04", "Cần xử lý trong hôm nay"], ["Mức cảnh báo", "15", "Đang trong SLA xử lý"], ["Đã đóng kỳ này", "38", "Có kết luận và người chịu trách nhiệm"], ["Quá SLA", "03", "Lâu nhất 47 giờ"]])}
  <div class="content-grid equal">
    ${panel("Cảnh báo tiền phần xử lý", "Chỉ theo dõi khoản công ty nộp về xã", `<div class="alert-list"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Công ty MTĐT Đông Thạnh chưa kê khai phần xử lý</h4><p>Kỳ 09/2026 · quá hạn kê khai 1 ngày.</p></div><button class="button button-small" data-action="genericDetail">Mở</button></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Khoản nộp chưa rõ 1.250.000đ</h4><p>VCB2609109721 · thiếu mã công ty–kỳ · 47 giờ.</p></div><button class="button button-small" data-action="genericDetail">Mở</button></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>Kê khai có nguy cơ ghi trùng kỳ</h4><p>HTX Môi trường An Phú · một lần nộp kê cho hai kỳ.</p></div></article></div>`)}
    ${panel("Cảnh báo dữ liệu & nợ", "Có thể mở xuống danh sách", `<div class="alert-list"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>97 hồ sơ nợ trên 90 ngày</h4><p>31 hồ sơ chưa có lần xác minh trong kỳ.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>6 hộ đã chấm dứt vẫn được báo thu</h4><p>Đã khóa cập nhật và chuyển sang đối soát ngoại lệ.</p></div><button class="button button-small" data-action="reviewOffSystem">Mở</button></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>18 hợp đồng thiếu biểu giá hợp lệ</h4><p>Đã chặn phát hành khoản tương ứng.</p></div></article></div>`)}
  </div>`;
}

function adminDashboard() {
  return `${pageHeader("Không gian quản trị", "Tổng quan hệ thống", "Theo dõi tài khoản, tích hợp, sao lưu và nhật ký kỹ thuật; quản trị không có quyền duyệt tiền.", actionButton("Sao lưu ngay", "runBackup") + actionButton("Thêm người dùng", "addUser", "primary", "+"))}
  ${kpiGrid([kpi("Người dùng hoạt động", "86", "6 không gian vai trò", "success"), kpi("Phiên đang đăng nhập", "24", "3 phiên mobile hiện trường"), kpi("Kết nối cần cấu hình", "02", "VietQR và HĐĐT", "warning"), kpi("Sự kiện lỗi 24 giờ", "01", "Đồng bộ đã retry thành công", "danger")])}
  <div class="content-grid equal">
    ${panel("Sức khỏe dịch vụ", "Trạng thái tại 10:30", `<div class="task-list"><article class="task-item"><span class="task-icon">✓</span><div><h4>Ứng dụng nghiệp vụ</h4><p>Hoạt động · phản hồi trung bình 320ms.</p></div>${badge("Hoạt động")}</article><article class="task-item"><span class="task-icon">✓</span><div><h4>Cơ sở dữ liệu</h4><p>Hoạt động · bản sao gần nhất 08:30.</p></div>${badge("Hoạt động")}</article><article class="task-item"><span class="task-icon">↻</span><div><h4>Ngân hàng UAT</h4><p>Đồng bộ gần nhất lúc 10:20.</p></div>${badge("Hoạt động")}</article></div>`)}
    ${panel("Kiểm soát quản trị", "Giới hạn quyền kỹ thuật", `<div class="task-list"><article class="task-item"><span class="task-icon">✓</span><div><h4>Quản trị không duyệt tiền</h4><p>Không có nút miễn giảm, hoàn, xóa nợ hoặc khóa kỳ.</p></div></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>2 tài khoản cần hoàn tất 2FA</h4><p>Quyền kế toán và lãnh đạo bị giới hạn tới khi hoàn tất.</p></div></article></div>`)}
  </div>`;
}

function areas() {
  const rows = APP_DATA.areas.map((a, i) => `<tr><td><span class="cell-title">${["DTH", "TTT", "NB"][i]} · ${a.name}</span><span class="cell-subtitle">Ánh xạ từ địa giới cũ</span></td><td class="num">${a.subjects.toLocaleString("vi-VN")}</td><td class="num">${a.rate}%</td><td class="money">${a.debt}</td><td>${badge(a.risk)}</td><td><button class="button button-small" data-action="genericDetail">Cấu hình</button></td></tr>`);
  return `${pageHeader("Cấu hình nghiệp vụ", "Địa bàn, đơn vị và đích nộp", "Cấu hình địa giới, khu vực, công ty phụ trách và tài khoản nhận phần xử lý mà không sửa mã nguồn.", actionButton("Thêm đơn vị", "genericDetail") + actionButton("Thêm địa bàn", "genericDetail", "primary", "+"))}
  ${panel("Cấu trúc địa bàn", "Dữ liệu được phân vùng để thí điểm và nhân rộng", table(["Mã / địa bàn", { label: "Đối tượng", num: true }, { label: "Tỷ lệ thu", num: true }, { label: "Công nợ", num: true }, "Tình trạng", ""], rows, { static: true }))}`;
}

function tariffs() {
  const rows = APP_DATA.tariffVersions.map(t => `<tr><td><span class="cell-title">${t.code}</span><span class="cell-subtitle">${t.legal}</span></td><td>${t.scope}</td><td class="num">${t.collection}</td><td class="num">${t.transport}</td><td class="num">${t.processing}</td><td>${t.effective}</td><td>${badge(t.status)}</td><td><button class="button button-small" data-action="genericDetail">Xem</button></td></tr>`);
  return `${pageHeader("Cấu hình nghiệp vụ", "Biểu giá và định mức theo thời kỳ", "Quản lý giá theo căn cứ pháp lý, địa bàn, nhóm đối tượng, phương pháp và thời gian hiệu lực.", actionButton("Mô phỏng tính giá", "genericDetail") + actionButton("Tạo phiên bản", "addTariff", "primary", "+"))}
  ${rules("Dữ liệu giá dưới đây chỉ để trực quan hóa", ["Không sử dụng làm số thu thật trước khi BA xác nhận văn bản và cơ chế chuyển tiếp của xã.", "Khoản đã phát hành giữ snapshot, không bị đổi theo cấu hình mới."], "warning")}
  ${panel("Phiên bản biểu giá", "", table(["Mã / căn cứ", "Phạm vi", { label: "Thu gom", num: true }, { label: "Vận chuyển", num: true }, { label: "Xử lý", num: true }, "Hiệu lực", "Trạng thái", ""], rows, { static: true }))}`;
}

function integrations() {
  const rows = APP_DATA.integrations.map(i => `<tr><td><span class="cell-title">${i.name}</span><span class="cell-subtitle">${i.purpose}</span></td><td>${i.environment}</td><td>${i.lastSync}</td><td class="num">${i.latency}</td><td>${badge(i.status)}</td><td><button class="button button-small" data-action="configureIntegration">Cấu hình</button></td></tr>`);
  return `${pageHeader("Kỹ thuật", "Kết nối tích hợp", "Quản lý VietQR, ngân hàng, HĐĐT và KBNN theo môi trường; bí mật không lưu ở trình duyệt.", actionButton("Xem nhật ký lỗi", "genericDetail") + actionButton("Thêm kết nối", "configureIntegration", "primary", "+"))}
  ${rules("Mọi yêu cầu ghi phải có idempotency", ["Tích hợp timeout hoặc retry không được làm phát sinh giao dịch/chứng từ trùng.", "KBNN thuộc giai đoạn mở rộng."])}
  ${panel("Trạng thái kết nối", "", table(["Tích hợp / mục đích", "Môi trường", "Đồng bộ gần nhất", { label: "Độ trễ", num: true }, "Trạng thái", ""], rows, { static: true }))}`;
}

function audit() {
  const roles = [...new Set(APP_DATA.audit.map(a => a.role))];
  const rows = APP_DATA.audit.map(a => `<tr data-row data-search="${escapeHtml(`${a.time} ${a.actor} ${a.role} ${a.action} ${a.object} ${a.result}`)}" data-role="${escapeHtml(a.role)}" data-group="${/Thành công|khớp/.test(a.result) ? "ok" : "open"}"><td>${a.time}</td><td><span class="cell-title">${a.actor}</span><span class="cell-subtitle">${a.role}</span></td><td>${a.action}</td><td>${a.object}</td><td>${badge(a.result)}</td><td><button class="button button-small" data-action="genericDetail">Chi tiết</button></td></tr>`);
  return `${pageHeader("Kỹ thuật", "Nhật ký, giám sát và sao lưu", "Audit nghiệp vụ tài chính không cho người dùng sửa; bản sao lưu phải được kiểm thử phục hồi.", actionButton("Xuất audit", "exportData") + actionButton("Sao lưu ngay", "runBackup", "primary"))}
  ${summaryStrip([["Sự kiện hôm nay", "12.486", "Theo người, vai trò và thiết bị"], ["Thao tác tài chính", "2.194", "Lưu dữ liệu trước/sau"], ["Cảnh báo bảo mật", "01", "Đăng nhập thất bại liên tiếp"], ["Sao lưu gần nhất", "08:30", "Kiểm tra checksum thành công"]])}
  <section data-table-filter data-chip-key="group" data-count-label="sự kiện">
    ${filterBar(filterField("Vai trò", filterSelect("role", [["all", "Tất cả vai trò"], ...roles.map(r => [r, r])])), "Người, hành động, đối tượng, mã giao dịch...")}
    ${chipBar([["all", "Tất cả"], ["open", "Còn treo", "warning"], ["ok", "Thành công", "success"]], "sự kiện")}
    ${panel("Nhật ký gần nhất", "", table(["Thời gian", "Người / vai trò", "Hành động", "Đối tượng", "Kết quả", ""], rows, { empty: "Không có sự kiện phù hợp." }))}
  </section>`;
}

const VIEW_RENDERERS = {
  communeDashboard, subjects, periods, billing, requests,
  leaderApprovals, leaderAlerts,
  adminDashboard, areas, tariffs, integrations, audit
};
