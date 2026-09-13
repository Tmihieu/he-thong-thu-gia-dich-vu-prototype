"use strict";

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function badge(status) {
  const value = String(status || "");
  let tone = "neutral";
  if (/Đã khớp|Đã thu|Hoạt động|Đã nhập|Đã phát hành|Đã khóa|Tốt|Thành công|Đang áp dụng/.test(value)) tone = "success";
  else if (/Quá hạn|Cảnh báo|Sai|Lỗi|Từ chối|Chênh|bắt buộc|chấm dứt|ngoài hệ thống|Không khuyến nghị/i.test(value)) tone = "danger";
  else if (/Chờ|Theo dõi|Cần|Dự thảo|Vắng|Khiếu nại|Trong hạn/.test(value)) tone = "warning";
  else if (/Đang|100%|xác nhận|UAT/.test(value)) tone = "info";
  return `<span class="badge ${tone}">${escapeHtml(value)}</span>`;
}

function actionButton(label, action, tone = "secondary", icon = "") {
  return `<button type="button" class="button button-${tone}" data-action="${action}">${icon ? `<span class="button-icon">${icon}</span>` : ""}${label}</button>`;
}

function pageHeader(eyebrow, title, description, actions = "") {
  return `<header class="page-header"><div><span class="eyebrow">${eyebrow}</span><h1 class="page-title">${title}</h1><p class="page-description">${description}</p></div><div class="page-actions">${actions}</div></header>`;
}

function kpi(label, value, note, tone = "", icon = "•") {
  return `<article class="kpi-card ${tone}"><div class="kpi-top"><span>${label}</span><span class="kpi-icon">${icon}</span></div><strong class="kpi-value">${value}</strong><span class="kpi-note">${note}</span></article>`;
}

function kpiGrid(cards) { return `<section class="kpi-grid">${cards.join("")}</section>`; }

function panel(title, subtitle, body, action = "", extraClass = "") {
  return `<section class="panel ${extraClass}"><header class="panel-header"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</header><div class="panel-body ${body.includes("data-table") ? "flush" : ""}">${body}</div></section>`;
}

function table(headers, rows) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
}

function toolbar(searchPlaceholder = "Tìm theo mã hoặc tên...", extras = "") {
  return `<section class="toolbar"><div class="toolbar-field grow"><label>Tìm kiếm</label><input class="control" type="search" placeholder="${searchPlaceholder}"></div>${extras}<button class="button button-secondary" type="button" data-action="applyFilter">Lọc dữ liệu</button></section>`;
}

function progressBar(value, tone = "") { return `<div class="progress ${tone}"><span style="width:${Math.max(0, Math.min(100, value))}%"></span></div>`; }

function flowStrip(current = 4) {
  const labels = ["Hợp đồng", "Khoản phải thu", "Mã & QR", "Thu tiền", "Khớp sao kê", "Chứng từ", "Đối soát"];
  return `<section class="flow-strip">${labels.map((label, i) => `<div class="flow-step ${i < current ? "done" : i === current ? "current" : ""}"><small>Bước ${i + 1}</small><strong>${label}</strong></div>`).join("")}</section>`;
}

function areaBars() {
  return `<div class="bar-chart">${APP_DATA.areas.map((area, i) => `<div class="bar-row"><span class="bar-label">${area.name}</span><div class="bar-track"><div class="bar-fill ${i === 2 ? "warning" : i === 1 ? "navy" : ""}" style="width:${area.rate}%">${area.rate}%</div></div><span class="bar-value">${area.rate}%</span></div>`).join("")}</div>`;
}

function communeDashboard() {
  return `${pageHeader("Không gian cán bộ xã", "Tổng quan nghiệp vụ kỳ 09/2026", "Theo dõi chất lượng dữ liệu, phát hành khoản, phân tuyến và công nợ trên toàn xã.", actionButton("Kiểm tra kỳ", "precheckPeriod") + actionButton("Sinh đợt hóa đơn", "generateBatch", "primary", "+"))}
  ${flowStrip(3)}
  ${kpiGrid([
    kpi("Đối tượng đang quản lý", "50.284", "48.672 hợp đồng còn hiệu lực", "", "▦"),
    kpi("Khoản đã phát hành", "48.654", "18 khoản bị giữ do lỗi dữ liệu", "success", "✓"),
    kpi("Tiến độ thu", "73,0%", "2,792 / 3,824 tỷ đồng", "success", "↗"),
    kpi("Công nợ hiện tại", "1,032 tỷ", "428 hồ sơ quá hạn từ 30 ngày", "warning", "!")
  ])}
  <div class="content-grid">
    ${panel("Tỷ lệ thu theo địa bàn", "Số tiền đã khớp trên tổng khoản phát hành", areaBars(), actionButton("Xem tiến độ thu", "go:debts", "quiet"))}
    ${panel("Việc cần xử lý", "Ưu tiên theo ảnh hưởng đến kỳ", `<div class="task-list">
      <article class="task-item"><span class="task-icon">1</span><div><h4>18 khoản lỗi chưa phát hành</h4><p>Thiếu biểu giá hoặc hợp đồng chưa hợp lệ.</p></div><button class="button button-small" data-action="precheckPeriod">Kiểm tra</button></article>
      <article class="task-item"><span class="task-icon">2</span><div><h4>23 bản ghi import lỗi</h4><p>Lô IMP-2609-04 đang chờ chuẩn hóa.</p></div><button class="button button-small" data-action="resolveDuplicate">Xử lý</button></article>
      <article class="task-item"><span class="task-icon">3</span><div><h4>7 đề nghị tài chính</h4><p>Kiểm tra hồ sơ trước khi trình lãnh đạo.</p></div><button class="button button-small" data-action="go:requests">Mở</button></article>
    </div>`)}
  </div>`;
}

function subjects() {
  const rows = APP_DATA.subjects.map(s => `<tr><td><button class="link-button" data-action="genericDetail">${s.code}</button><span class="cell-subtitle">Attribute: ${s.type}</span></td><td><span class="cell-title">${s.name}</span><span class="cell-subtitle">${s.address}</span></td><td><span class="cell-title">${s.unit}</span><span class="cell-subtitle">Tuyến ${s.route}</span></td><td><span class="cell-title">${s.contract}</span><span class="cell-subtitle">${s.tariff}</span></td><td class="money">${formatMoney(s.amount)}</td><td>${badge(s.serviceStatus)}</td><td><button class="button button-small" data-action="classifyAssign">Phân loại</button></td></tr>`);
  return `${pageHeader("DM-01 · DM-10 · TH-01", "Đối tượng, phân loại và hợp đồng", "Xã tạo danh sách hộ trước; sau đó gán attribute type, đơn vị xử lý, tuyến, hợp đồng và trạng thái dịch vụ.", actionButton("Nhập dữ liệu", "importData") + actionButton("Thêm hộ/đối tượng", "addSubject", "primary", "+"))}
  <div class="callout"><span class="callout-icon">i</span><div><strong>Thứ tự dữ liệu bắt buộc</strong><p>Tạo mã hộ → phân loại attribute type → gán đơn vị/tuyến → lập hợp đồng → sinh khoản theo kỳ.</p></div></div>
  ${toolbar("Mã, tên, địa chỉ, số điện thoại...", `<div class="toolbar-field"><label>Loại đối tượng</label><select class="control"><option>Tất cả</option><option>Hộ gia đình</option><option>Hộ kinh doanh</option><option>Doanh nghiệp</option></select></div><div class="toolbar-field"><label>Trạng thái</label><select class="control"><option>Tất cả</option><option>Đang hoạt động</option><option>Chờ xác minh</option><option>Tạm ngưng</option></select></div>`)}
  ${panel("50.284 đối tượng", "Trạng thái dịch vụ và phân công có thời gian hiệu lực, không ghi đè lịch sử", table(["Mã / attribute", "Đối tượng", "Đơn vị / tuyến", "Hợp đồng / nhóm giá", "Mức kỳ này", "Dịch vụ", "Thao tác"], rows), "<span class='badge info'>Xã quản lý danh sách gốc</span>")}`;
}

function dataQuality() {
  const rows = APP_DATA.imports.map(x => `<tr><td><button class="link-button" data-action="genericDetail">${x.id}</button></td><td><span class="cell-title">${x.source}</span><span class="cell-subtitle">${x.area}</span></td><td>${x.total.toLocaleString("vi-VN")}</td><td>${x.valid.toLocaleString("vi-VN")}</td><td>${x.duplicate}</td><td>${x.errors}</td><td>${badge(x.status)}</td><td><button class="button button-small" data-action="resolveDuplicate">Xem lỗi</button></td></tr>`);
  return `${pageHeader("DM-02 · DM-03 · DM-04 · DM-05", "Nhập, chuẩn hóa và chống trùng dữ liệu", "Dữ liệu mới đi qua vùng tạm, kiểm tra cấu trúc, so trùng và xác nhận trước khi vào kho chính.", actionButton("Tải mẫu import", "downloadTemplate") + actionButton("Nhập tệp mới", "importData", "primary", "⇩"))}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Không gộp tự động dữ liệu tài chính</strong><p>Bản ghi trùng có công nợ hoặc lịch sử thanh toán phải được người có quyền xác nhận.</p></div></div>
  ${kpiGrid([kpi("Lô đang xử lý", "01", "IMP-2609-04", "", "⇩"), kpi("Bản ghi hợp lệ", "1.247", "Có thể chuyển vào kho chính", "success", "✓"), kpi("Nghi trùng", "10", "Cần so sánh hồ sơ", "warning", "≈"), kpi("Lỗi cấu trúc", "23", "Thiếu mã địa bàn/địa chỉ", "danger", "!")])}
  ${panel("Lịch sử nhập dữ liệu", "Theo dõi nguồn, kết quả và người xác nhận", table(["Mã lô", "Tệp / nguồn", "Tổng", "Hợp lệ", "Nghi trùng", "Lỗi", "Trạng thái", ""], rows))}`;
}

function periods() {
  const rows = APP_DATA.periods.map(p => `<tr><td><span class="cell-title">${p.code}</span><span class="cell-subtitle">${p.label}</span></td><td>${p.legal}</td><td>${p.contracts.toLocaleString("vi-VN")}</td><td>${p.charges.toLocaleString("vi-VN")}</td><td>${p.errors ? badge(`${p.errors} lỗi`) : badge("Không lỗi")}</td><td>${badge(p.status)}</td><td><button class="button button-small" data-action="precheckPeriod">Kiểm tra</button></td></tr>`);
  return `${pageHeader("BG-02 · QT-08", "Kỳ và đợt thu", "Mỗi kỳ chụp lại căn cứ giá và chỉ phát hành khi dữ liệu đầu vào vượt qua kiểm tra.", actionButton("Kiểm tra kỳ", "precheckPeriod") + actionButton("Tạo kỳ mới", "createPeriod", "primary", "+"))}
  <div class="callout"><span class="callout-icon">i</span><div><strong>Kỳ 09/2026 đang áp dụng phiên bản giá mới</strong><p>Quy tắc chuyển tiếp giữa QĐ 67/2025 và QĐ 65/2026 cần BA xác nhận trước vận hành thật.</p></div></div>
  ${panel("Danh sách kỳ", "Kỳ đã khóa không được sửa trực tiếp", table(["Kỳ", "Căn cứ giá", "Hợp đồng", "Khoản", "Kiểm tra", "Trạng thái", ""], rows))}`;
}

function billing() {
  const rows = APP_DATA.batches.map(b => `<tr><td><button class="link-button" data-action="genericDetail">${b.code}</button></td><td>${b.area}</td><td>${b.count.toLocaleString("vi-VN")}</td><td class="money">${b.value}</td><td>${b.errors ? badge(`${b.errors} lỗi`) : badge("Không lỗi")}</td><td>${b.issuedBy}</td><td>${badge(b.status)}</td><td>${b.status.includes("Chờ") ? `<button class="button button-small" data-action="issueBatch">Phát hành</button>` : `<button class="button button-small" data-action="genericDetail">Xem</button>`}</td></tr>`);
  const ledgerRows = APP_DATA.householdLedger.map(l => `<tr><td><span class="cell-title">${l.key}</span><span class="cell-subtitle">Khóa hộ | kỳ | dịch vụ</span></td><td>${badge(l.rowType)}</td><td>${l.reference}</td><td>${l.date}</td><td class="money">${l.debit ? formatMoney(l.debit) : "—"}</td><td class="money">${l.credit ? formatMoney(l.credit) : "—"}</td><td class="money">${formatMoney(l.balance)}</td><td>${badge(l.status)}</td></tr>`);
  return `${pageHeader("HD-01 → HD-06", "Khoản phải thu và hóa đơn", "Sinh hàng loạt từ hợp đồng, giữ khoản lỗi ở hàng chờ và cấp QR sau khi phát hành.", actionButton("Tạo khoản lẻ", "addAdHocCharge") + actionButton("Sinh đợt khoản", "generateBatch", "primary", "+"))}
  ${flowStrip(1)}
  ${kpiGrid([kpi("Đợt phát hành", "03", "2 đã phát hành · 1 đang chờ", "", "▤"), kpi("Khoản hợp lệ", "48.654", "Đã cấp mã thanh toán", "success", "✓"), kpi("Giá trị phát hành", "3,824 tỷ", "Theo snapshot biểu giá", "success", "₫"), kpi("Khoản bị giữ", "18", "Không đi vào danh sách thu", "danger", "!")])}
  ${panel("Các đợt của kỳ 09/2026", "Cán bộ chịu trách nhiệm phát hành một lần cho toàn đợt", table(["Mã đợt", "Địa bàn", "Số khoản", "Giá trị", "Kiểm tra", "Người phát hành", "Trạng thái", ""], rows))}
  <div style="height:16px"></div>
  ${panel("Ánh xạ hộ gia đình ↔ khoản thu", "Cùng khóa hộ–kỳ–dịch vụ có một dòng phải thu và các dòng đã thu/phân bổ liên quan", table(["Khóa liên kết", "Loại dòng", "Tham chiếu", "Ngày", "Phải thu", "Đã thu", "Còn lại", "Trạng thái"], ledgerRows), "<span class='badge info'>Không ghi đè dòng phải thu</span>")}`;
}

function routes() {
  const rows = APP_DATA.routes.map(r => `<tr><td><button class="link-button" data-action="genericDetail">${r.code}</button><span class="cell-subtitle">${r.name}</span></td><td>${r.area}</td><td><span class="cell-title">${r.unit}</span><span class="cell-subtitle">Quản lý: ${r.manager}</span></td><td><span class="cell-title">${r.collector}</span><span class="cell-subtitle">Tài khoản hiện trường do xã giao</span></td><td>${r.households.toLocaleString("vi-VN")}</td><td><div style="min-width:100px">${progressBar(r.progress, r.progress < 70 ? "warning" : "")}<span class="cell-subtitle">${r.progress}%</span></div></td><td><button class="button button-small" data-action="assignRoute">Phân công</button></td></tr>`);
  const map = `<div class="route-map" role="img" aria-label="Bản đồ giản lược các tuyến thu gom tại Đông Thạnh, Thới Tam Thôn và Nhị Bình">
    <div class="map-toolbar"><strong>Bản đồ tuyến hiện có</strong><span>Hiển thị 4 tuyến tiêu biểu / 11 công ty</span></div>
    <svg viewBox="0 0 760 330" aria-hidden="true">
      <rect width="760" height="330" class="map-ground"/>
      <path class="map-water" d="M0 270 C120 238 185 286 295 253 S500 214 760 257 L760 330 L0 330Z"/>
      <g class="map-roads"><path d="M20 72 L176 94 L315 74 L455 110 L735 77"/><path d="M86 18 L124 116 L98 229 L175 304"/><path d="M240 16 L260 105 L238 202 L322 310"/><path d="M472 12 L437 104 L512 188 L489 307"/><path d="M666 24 L622 121 L668 218 L625 300"/><path d="M32 190 L193 168 L346 199 L498 170 L724 199"/></g>
      <g class="map-route route-green"><path d="M53 73 L176 94 L267 81 L315 74"/><circle cx="53" cy="73" r="6"/><circle cx="315" cy="74" r="7"/></g>
      <g class="map-route route-blue"><path d="M240 24 L260 105 L238 202 L322 302"/><circle cx="240" cy="24" r="6"/><circle cx="322" cy="302" r="7"/></g>
      <g class="map-route route-amber"><path d="M455 110 L512 188 L668 218 L718 199"/><circle cx="455" cy="110" r="6"/><circle cx="718" cy="199" r="7"/></g>
      <g class="map-route route-red"><path d="M98 229 L175 304 L322 302"/><circle cx="98" cy="229" r="6"/><circle cx="322" cy="302" r="7"/></g>
      <g class="map-labels"><text x="42" y="55">DTH-T07</text><text x="266" y="47">DTH-T04</text><text x="535" y="176">TTT-T11</text><text x="111" y="271">NB-T03</text><text x="533" y="43" class="area">THỚI TAM THÔN</text><text x="74" y="145" class="area">ĐÔNG THẠNH</text><text x="356" y="287" class="area">NHỊ BÌNH</text></g>
    </svg>
    <div class="map-legend"><span><i class="green"></i>DTH-T07</span><span><i class="blue"></i>DTH-T04</span><span><i class="amber"></i>TTT-T11</span><span><i class="red"></i>NB-T03</span><small>Bản đồ minh họa, không dùng để dẫn đường</small></div>
  </div>`;
  const focusRoutes = APP_DATA.routes.slice(0, 4).map(r => `<article class="map-route-item"><div><strong>${r.code}</strong><span>${r.name}</span></div><span>${badge(r.status)}</span><p>${r.unit}<br><b>${r.collector}</b> · ${r.households} hộ</p><div>${progressBar(r.progress, r.progress < 70 ? "warning" : "")}</div></article>`).join("");
  return `${pageHeader("TH-01", "Bản đồ và phân tuyến thu gom", "Xã quản lý các tuyến đường đã có, gán mỗi tuyến cho một trong 11 công ty và giao trực tiếp người đi thu. Công ty là danh mục phối hợp, không bắt buộc đăng nhập hệ thống.", actionButton("Phân công tuyến", "assignRoute", "primary", "+"))}
  <div class="callout"><span class="callout-icon">i</span><div><strong>Ranh giới trách nhiệm rõ ràng</strong><p>Công ty và người quản lý dùng để liên hệ/đốc thúc; quyền xem hộ được cấp trực tiếp cho người đi thu theo tuyến và thời hạn.</p></div></div>
  ${kpiGrid([kpi("Công ty phối hợp", "11", "Không cần tài khoản hệ thống", "", "▦"), kpi("Tuyến đã có", "11", "Phủ 3 địa bàn", "success", "⌖"), kpi("Đã có người thu", "11/11", "Tài khoản do xã giao", "success", "✓"), kpi("Cần đôn đốc", "02", "Tiến độ dưới ngưỡng", "warning", "!")])}
  <div class="route-planning-layout">${map}<aside class="route-map-list"><div class="route-map-list-head"><strong>Tuyến đang theo dõi</strong><span>Chọn tuyến trong bảng để đổi phân công</span></div>${focusRoutes}</aside></div>
  <div style="height:16px"></div>
  ${toolbar("Mã tuyến, tên đường, công ty hoặc người thu...", `<div class="toolbar-field"><label>Địa bàn</label><select class="control"><option>Toàn xã</option><option>Đông Thạnh</option><option>Thới Tam Thôn</option><option>Nhị Bình</option></select></div><div class="toolbar-field"><label>Trạng thái</label><select class="control"><option>Tất cả</option><option>Đang thực hiện</option><option>Cần đôn đốc</option></select></div>`)}
  ${panel("Phân công 11 công ty theo tuyến", "Công ty không có quyền hệ thống; mỗi tuyến vẫn phải chỉ rõ người thu và quản lý liên hệ", table(["Tuyến / trục đường", "Địa bàn", "Công ty / quản lý", "Người đi thu", "Số hộ", "Tiến độ", ""], rows), "<span class='badge info'>11/11 đã phân công</span>")}`;
}

function debts() {
  const rows = APP_DATA.debts.map(d => `<tr><td><button class="link-button" data-action="genericDetail">${d.code}</button><span class="cell-subtitle">${d.area}</span></td><td><span class="cell-title">${d.name}</span><span class="cell-subtitle">${d.contact}</span></td><td>${d.periods} kỳ</td><td>${d.age} ngày</td><td class="money">${formatMoney(d.amount)}</td><td>${badge(d.status)}</td><td><button class="button button-small" data-action="sendReminder">Nhắc nợ</button></td></tr>`);
  return `${pageHeader("CN-01 · CN-03 · CN-05", "Công nợ và nhắc nợ", "Theo dõi số còn phải thu, tuổi nợ, nợ kế thừa và lịch sử liên hệ.", actionButton("Xuất danh sách", "exportData") + actionButton("Lập đợt nhắc nợ", "sendReminder", "primary", "+"))}
  ${kpiGrid([kpi("Tổng công nợ", "1,032 tỷ", "13.419 khoản chưa hoàn tất", "warning", "₫"), kpi("Trên 30 ngày", "428", "Cần lập kế hoạch nhắc", "warning", "30"), kpi("Trên 90 ngày", "97", "Ưu tiên xác minh tình trạng", "danger", "90"), kpi("Nợ kế thừa", "214,6 triệu", "Có nguồn gốc từ ba xã cũ", "", "↻")])}
  ${toolbar("Mã hộ, tên hoặc số điện thoại...", `<div class="toolbar-field"><label>Tuổi nợ</label><select class="control"><option>Tất cả</option><option>Trên 30 ngày</option><option>Trên 60 ngày</option><option>Trên 90 ngày</option></select></div>`)}
  ${panel("Danh sách cần xử lý", "Không xóa hoặc giảm nghĩa vụ trực tiếp tại danh sách", table(["Mã / địa bàn", "Đối tượng / liên hệ", "Số kỳ", "Tuổi nợ", "Còn nợ", "Tình trạng", ""], rows))}`;
}

function collectionProgress() {
  const rows = APP_DATA.collectionProgress.map(x => `<tr><td><span class="cell-title">${x.collector}</span><span class="cell-subtitle">Cập nhật ${x.updated}</span></td><td><button class="link-button" data-action="genericDetail">${x.route}</button><span class="cell-subtitle">${x.company}</span></td><td><span class="cell-title">${x.visited}/${x.assigned} hộ đã ghé</span><span class="cell-subtitle">${x.paid} hộ đã thu hợp lệ</span></td><td><div style="min-width:120px">${progressBar(x.progress, x.progress < 70 ? "danger" : x.progress < 76 ? "warning" : "")}<span class="cell-subtitle">${x.progress}% hoàn thành</span></div></td><td><strong class="money">${x.debt} hộ</strong><span class="cell-subtitle">còn phải theo dõi</span></td><td>${badge(x.status)}</td><td><span class="cell-title">${x.manager.split(" · ")[0]}</span><span class="cell-subtitle">${x.manager.split(" · ")[1]}</span></td><td><button class="button button-small" data-action="urgeRouteManager">Đốc thúc</button></td></tr>`);
  return `${pageHeader("CN-01 · TH-01", "Tiến độ thu theo người và tuyến", "Xã theo dõi người đi thu đã được giao tuyến nào, đã tiếp cận bao nhiêu hộ và còn bao nhiêu công nợ. Khi chậm, xã đốc thúc người quản lý để làm việc với hộ dân.", actionButton("Xuất tiến độ", "exportData") + actionButton("Đốc thúc tuyến chậm", "urgeRouteManager", "primary"))}
  ${kpiGrid([kpi("Người đang thực hiện", "11", "Tương ứng 11 tuyến", "", "♙"), kpi("Đã tiếp cận", "3.186 hộ", "78% danh sách đến hạn", "success", "✓"), kpi("Hộ còn công nợ", "664", "3 tuyến cần ưu tiên", "warning", "!"), kpi("Chậm cập nhật", "01", "Quá 1 ngày làm việc", "danger", "◷")])}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Ưu tiên liên hệ quản lý tuyến TTT-T08</strong><p>Tiến độ 56%, lần cập nhật gần nhất từ hôm qua. Xã không xử lý từng hộ tại màn này; người quản lý chịu trách nhiệm đôn đốc người thu và làm việc với hộ dân.</p></div></div>
  ${toolbar("Tên người thu, mã tuyến hoặc công ty...", `<div class="toolbar-field"><label>Tiến độ</label><select class="control"><option>Tất cả</option><option>Dưới 60%</option><option>60–75%</option><option>Trên 75%</option></select></div><div class="toolbar-field"><label>Trạng thái</label><select class="control"><option>Tất cả</option><option>Cần đôn đốc</option><option>Theo dõi</option><option>Đúng tiến độ</option></select></div>`)}
  ${panel("Người đi thu đang được xã giao", "Tổng hợp từ kết quả từng hộ; công ty chỉ là đầu mối phối hợp, không cần tham gia hệ thống", table(["Người đi thu", "Tuyến / công ty", "Tiếp cận", "Tiến độ", "Công nợ", "Tình trạng", "Quản lý liên hệ", ""], rows), "<span class='badge warning'>3 cần chú ý</span>")}`;
}

function requests() {
  const rows = APP_DATA.requests.map(r => `<tr><td><button class="link-button" data-action="genericDetail">${r.code}</button></td><td>${badge(r.type)}</td><td><span class="cell-title">${r.subject}</span><span class="cell-subtitle">${r.reason}</span></td><td class="money">${formatMoney(r.amount)}</td><td>${r.createdBy}</td><td>${r.age}</td><td>${badge(r.status)}</td><td><button class="button button-small" data-action="genericDetail">Xem hồ sơ</button></td></tr>`);
  return `${pageHeader("CN-04 · CN-06 · CN-07", "Đề nghị tài chính", "Cán bộ chỉ lập đề nghị; miễn giảm, hoàn, xóa nợ và hủy hóa đơn phải qua phê duyệt.", actionButton("Lập đề nghị", "createRequest", "primary", "+"))}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Tách người lập và người duyệt</strong><p>Hệ thống chặn tự phê duyệt kể cả khi một tài khoản được gán nhiều vai trò.</p></div></div>
  ${panel("Hồ sơ đã lập", "Mọi quyết định giữ đầy đủ căn cứ, bằng chứng và lịch sử", table(["Mã", "Loại", "Đối tượng / lý do", "Ảnh hưởng", "Người lập", "Thời gian", "Trạng thái", ""], rows))}`;
}

function collectorToday() {
  const c = APP_DATA.collector;
  return `${pageHeader("Không gian người đi thu", `Chào buổi sáng, ${c.name}`, `Tuyến ${c.route} · ${c.area}. Tài khoản được xã giao trực tiếp; kết quả có thể nhập từng hộ trên web hoặc nhập tệp Excel theo mẫu.`, actionButton("Cập nhật QR", "updateCollectorQr") + actionButton("Bắt đầu ca", "startShift", "primary", "▶"))}
  <div class="callout"><span class="callout-icon">i</span><div><strong>Danh sách đã đồng bộ lúc 07:10 · QR phiên bản QR-DTH-T07-v3</strong><p>QR kế thừa tài khoản nhận chính thức. Thông tin hộ, khóa khoản và số tiền không được tự sửa tại hiện trường.</p></div></div>
  ${kpiGrid([kpi("Hộ hôm nay", String(c.assigned), "17 hộ đã ghé", "", "⌖"), kpi("Đã thu", String(c.paid), "720.000đ chuyển khoản", "success", "✓"), kpi("Tiền mặt chờ nộp", formatMoney(c.cash), "3 khoản · hạn 17:00", "warning", "₫"), kpi("Cần quay lại", String(c.followup + c.absent), "3 vắng nhà · 2 đã hẹn", "danger", "↻")])}
  <div class="content-grid">
    ${panel("Tiến độ tuyến DTH-T07", "17/24 điểm đã ghé · 71% ca hôm nay", `<div style="margin-bottom:15px">${progressBar(71)}</div><div class="summary-strip"><div class="summary-item"><span>Đã thu</span><strong>12</strong></div><div class="summary-item"><span>Vắng nhà</span><strong>3</strong></div><div class="summary-item"><span>Hẹn lại</span><strong>2</strong></div><div class="summary-item"><span>Còn lại</span><strong>7</strong></div></div>${actionButton("Nhập kết quả", "go:collection-entry")}${actionButton("Mở điểm tiếp theo", "go:assigned-route", "primary", "→")}`)}
    ${panel("Điểm tiếp theo", "Thứ tự số 18 · cách vị trí hiện tại 120 m", `<div class="route-card current"><div class="route-card-head"><div><h4>Nguyễn Văn Minh</h4><p>12/5 Đặng Thúc Vịnh · 090•••3128</p></div>${badge("Chưa thu")}</div><div class="summary-strip"><div class="summary-item"><span>Kỳ</span><strong>09/2026</strong></div><div class="summary-item"><span>Phải thu</span><strong>80.000đ</strong></div></div><div class="route-actions">${actionButton("Thu khoản", "collectPayment", "primary", "₫")}${actionButton("Hiện QR", "showQr")}${actionButton("Vắng nhà", "absentNotice")}</div></div>`)}
  </div>`;
}

function collectorRoute() {
  const cards = APP_DATA.assignedHouseholds.map((h, i) => {
    const ended = h.result === "Đã chấm dứt";
    const paid = h.result.includes("Đã thu");
    const actions = ended
      ? `${actionButton("Khóa thu · xem ngoại lệ", "reviewOffSystem", "danger")}`
      : paid
        ? `${actionButton("Xem giao dịch", "genericDetail", "secondary")}`
        : `${actionButton("Thu khoản", "collectPayment", "primary")}${actionButton("QR", "showQr")}${actionButton("Vắng nhà", "absentNotice")}`;
    const searchable = `${h.code} ${h.name} ${h.address} ${h.phone}`.toLowerCase();
    return `<article class="route-card ${i === 0 ? "current" : ""}" data-collection-card data-category="${h.category}" data-search="${escapeHtml(searchable)}"><div class="route-card-head"><div><span class="route-order">${h.order}</span><span class="eyebrow">${h.code}</span><h4>${h.name}</h4></div>${badge(h.result)}</div><div class="route-address"><strong>${h.address}</strong><span>${h.phone} · ${h.note}</span></div><div class="compact-facts"><div><span>Kỳ</span><strong>${h.debt}</strong></div><div><span>Số tiền</span><strong>${formatMoney(h.amount)}</strong></div><div><span>Hạn / trạng thái</span><strong>${h.dueDate}</strong></div></div><div class="route-actions">${actions}${!ended && !paid ? actionButton("Chỉ đường", "openDirections") : ""}</div></article>`;
  }).join("");
  return `${pageHeader("TH-01 → TH-13", "Tuyến DTH-T07 · Đặng Thúc Vịnh", "Danh sách gọn theo thứ tự di chuyển, dùng được trên máy tính và điện thoại; hộ chấm dứt bị khóa thu và khóa QR.", actionButton("Nhập Excel", "importCollectionResults") + actionButton("Nhập trên web", "manualCollectionEntry") + actionButton("Chốt ca", "closeShift", "primary"))}
  <div class="callout danger"><span class="callout-icon">!</span><div><strong>1 hộ đã chấm dứt nhưng có dấu hiệu vẫn được thu bên ngoài</strong><p>Không cho ghi “đã thu”; hệ thống chuyển thành ngoại lệ để xã và đơn vị đối soát.</p></div></div>
  <section class="collection-workspace" data-collector-list>
    <div class="collection-list-head"><div><span>Đang thực hiện · đồng bộ 10:24</span><strong>17/24 điểm đã ghé</strong></div><div class="mini-progress">${progressBar(71)}<b>71%</b></div></div>
    <div class="collector-filterbar"><label class="collector-search"><span>Tìm hộ hoặc địa chỉ</span><input class="control" type="search" data-list-search placeholder="Tên, mã hộ, số nhà..."></label><label><span>Kết quả</span><select class="control" data-list-status><option value="all">Tất cả</option><option value="unpaid">Chưa thu</option><option value="overdue">Quá hạn</option><option value="absent">Vắng nhà</option><option value="paid">Đã thu</option><option value="ended">Đã chấm dứt</option></select></label><div class="segmented collection-chips"><button class="active" data-list-filter-status="all">Tất cả</button><button data-list-filter-status="unpaid">Chưa thu</button><button data-list-filter-status="overdue">Quá hạn</button><button data-list-filter-status="paid">Đã thu</button></div></div>
    <div class="list-result-line"><strong data-list-count>${APP_DATA.assignedHouseholds.length} hộ minh họa</strong><span>Sắp xếp theo thứ tự tuyến</span></div>
    <div class="collection-card-grid">${cards}</div>
    <div class="collection-empty" data-list-empty hidden>Không tìm thấy hộ phù hợp với bộ lọc.</div>
  </section>`;
}

function collectorEntry() {
  const rows = APP_DATA.collectionImports.map(x => `<tr><td><button class="link-button" data-action="genericDetail">${x.code}</button><span class="cell-subtitle">${x.createdAt}</span></td><td><span class="cell-title">${x.method}</span><span class="cell-subtitle">${x.source}</span></td><td>${x.rows}</td><td>${x.accepted}</td><td>${x.blocked ? badge(`${x.blocked} bị chặn`) : badge("0")}</td><td>${badge(x.status)}</td><td><button class="button button-small" data-action="genericDetail">Kết quả</button></td></tr>`);
  return `${pageHeader("Cập nhật kết quả thu", "Nhập kết quả bằng web hoặc Excel", "Mọi dữ liệu qua cùng bước kiểm tra khóa hộ–kỳ–dịch vụ, phạm vi tuyến, trạng thái dịch vụ và mã giao dịch trùng.", actionButton("Nhập Excel", "importCollectionResults") + actionButton("Nhập từng hộ", "manualCollectionEntry", "primary", "+"))}
  <div class="content-grid equal">
    ${panel("Nhập trực tiếp trên web", "Phù hợp cập nhật từng hộ hoặc xử lý ngay tại tuyến", `<div class="empty-state"><div class="empty-state-icon">⌨</div><h3>Nhập theo khóa hộ–kỳ–dịch vụ</h3><p>Tìm đúng khoản phải thu, chọn kết quả và nhập mã giao dịch nếu đã thu.</p>${actionButton("Mở form nhập", "manualCollectionEntry", "primary")}</div>`)}
    ${panel("Nhập tệp Excel", "Phù hợp đồng bộ kết quả nhiều hộ từ danh sách đi thu", `<div class="empty-state"><div class="empty-state-icon">⇩</div><h3>Tải tệp vào vùng kiểm tra</h3><p>Bản ghi lỗi, trùng hoặc hộ đã chấm dứt bị chặn; không ghi đè dữ liệu đang có.</p>${actionButton("Chọn tệp Excel", "importCollectionResults", "primary")}</div>`)}
  </div>
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Lô KQT-1209-04 có 3 bản ghi bị chặn</strong><p>1 hộ đã chấm dứt dịch vụ, 1 mã giao dịch trùng và 1 hộ không thuộc tuyến DTH-T07.</p></div></div>
  ${panel("Lịch sử cập nhật kết quả", "Mỗi lô có người nhập, nguồn, số hợp lệ và danh sách bị chặn", table(["Mã lô / thời gian", "Hình thức / nguồn", "Tổng dòng", "Chấp nhận", "Bị chặn", "Trạng thái", ""], rows))}`;
}

function cashPending() {
  const rows = APP_DATA.cashCollections.map(c => `<tr><td><span class="cell-title">${c.code}</span><span class="cell-subtitle">${c.charge}</span></td><td>${c.subject}</td><td>${c.collectedAt}</td><td class="money">${formatMoney(c.amount)}</td><td>${c.due}</td><td>${c.age}</td><td>${badge(c.status)}</td></tr>`);
  return `${pageHeader("TH-06", "Tiền mặt đã thu, chờ nộp", "Tiền mặt là trạng thái tạm và chỉ hoàn tất khi được nộp, xuất hiện trên sao kê và khớp đúng khoản.", actionButton("Nộp toàn bộ", "depositCash", "primary", "₫"))}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>240.000đ phải nộp trước 17:00 hôm nay</strong><p>Không dùng tiền mặt của nhiều khoản trong một chuyển khoản nếu ngân hàng không hỗ trợ bảng kê phân bổ.</p></div></div>
  ${kpiGrid([kpi("Số khoản", "03", "Đều trong ca CA-1209-NTL", "", "▤"), kpi("Tổng đã nhận", "240.000đ", "Có xác nhận người thu", "warning", "₫"), kpi("Đã nộp/chờ khớp", "0đ", "Chưa có giao dịch", "", "↔"), kpi("Quá hạn", "0đ", "Hạn gần nhất 17:00", "success", "✓")])}
  ${panel("Chi tiết tiền mặt", "Mỗi khoản gắn một nghĩa vụ và thời điểm nhận", table(["Mã tiền mặt / khoản", "Đối tượng", "Đã nhận", "Số tiền", "Hạn nộp", "Thời gian giữ", "Trạng thái"], rows))}`;
}

function shiftClose() {
  return `${pageHeader("TH-14", "Chốt ca và bàn giao tiền", "Kiểm tra số hộ đã ghé, thanh toán theo kênh, tiền mặt và giao dịch chưa đồng bộ trước khi kết thúc ca.", actionButton("Gửi chốt ca", "closeShift", "primary", "✓"))}
  ${kpiGrid([kpi("Điểm đã ghé", "17/24", "7 điểm chuyển ca tiếp theo", "", "⌖"), kpi("Chuyển khoản đã khớp", "720.000đ", "12 giao dịch", "success", "↔"), kpi("Tiền mặt đang giữ", "240.000đ", "3 khoản chờ nộp", "warning", "₫"), kpi("Chưa đồng bộ", "0", "Thiết bị đã đồng bộ đầy đủ", "success", "✓")])}
  <div class="content-grid equal">
    ${panel("Kiểm tra trước chốt ca", "Các điều kiện phải được xác nhận", `<div class="steps"><div class="step-card done"><span class="step-number">✓</span><h4>Danh sách thu</h4><p>17 kết quả hợp lệ</p></div><div class="step-card done"><span class="step-number">✓</span><h4>Đồng bộ</h4><p>Không còn bản ghi chờ</p></div><div class="step-card blocked"><span class="step-number">!</span><h4>Tiền mặt</h4><p>240.000đ chưa nộp</p></div><div class="step-card"><span class="step-number">4</span><h4>Bàn giao</h4><p>Chưa xác nhận</p></div></div>`)}
    ${panel("Tóm tắt kết quả", "Theo ca CA-1209-NTL", `<div class="summary-strip"><div class="summary-item"><span>Đã thu</span><strong>15</strong></div><div class="summary-item"><span>Vắng nhà</span><strong>3</strong></div><div class="summary-item"><span>Hẹn lại</span><strong>2</strong></div><div class="summary-item"><span>Chưa ghé</span><strong>4</strong></div></div><div class="callout warning" style="margin:0"><span class="callout-icon">!</span><div><strong>Ca có thể gửi nhưng chưa được xác nhận hoàn tất</strong><p>Kế toán/thủ quỹ cần đối soát 240.000đ tiền mặt.</p></div></div>`)}
  </div>`;
}

function collectorDebt() {
  const debtItems = APP_DATA.assignedHouseholds.filter(h => !h.result.includes("Đã thu") && h.result !== "Đã chấm dứt");
  const cards = debtItems.map(h => {
    const searchable = `${h.code} ${h.name} ${h.address} ${h.phone}`.toLowerCase();
    return `<article class="route-card debt-card" data-collection-card data-category="${h.category}" data-search="${escapeHtml(searchable)}"><div class="route-card-head"><div><span class="eyebrow">${h.code} · ${h.route}</span><h4>${h.name}</h4></div>${badge(h.debtState)}</div><div class="route-address"><strong>${h.address}</strong><span>${h.phone} · ${h.note}</span></div><div class="debt-highlight"><div><span>Còn nợ</span><strong>${formatMoney(h.amount)}</strong></div><div><span>Số kỳ</span><strong>${h.periods} kỳ</strong></div><div><span>Hạn / lần hẹn</span><strong>${h.dueDate}</strong></div></div><div class="route-actions">${actionButton("Thu khoản", "collectPayment", "primary")}${actionButton("Gọi", "callContact")}${actionButton("Hẹn lại", "absentNotice")}</div></article>`;
  }).join("");
  return `${pageHeader("CN-01 · CN-05", "Hộ còn công nợ · Tuyến DTH-T07", "Chỉ giữ thông tin cần để làm việc với hộ: địa chỉ, liên hệ, số kỳ, số tiền, hạn và lần xử lý gần nhất.", actionButton("Nhập kết quả", "go:collection-entry") + actionButton("In danh sách", "printList"))}
  <section class="collection-workspace debt-workspace" data-collector-list>
    <div class="collection-list-head"><div><span>Danh sách cần quay lại</span><strong>${debtItems.length} hộ · 800.000đ</strong></div><div class="debt-priority"><span>Ưu tiên</span><b>2 hộ quá hạn nhiều kỳ</b></div></div>
    <div class="collector-filterbar"><label class="collector-search"><span>Tìm trong công nợ</span><input class="control" type="search" data-list-search placeholder="Tên, mã hộ, địa chỉ..."></label><label><span>Tình trạng</span><select class="control" data-list-status><option value="all">Tất cả công nợ</option><option value="overdue">Quá hạn</option><option value="appointment">Đã hẹn</option><option value="absent">Vắng nhà</option><option value="unpaid">Chưa tiếp cận</option></select></label><div class="segmented collection-chips"><button class="active" data-list-filter-status="all">Tất cả</button><button data-list-filter-status="overdue">Quá hạn</button><button data-list-filter-status="appointment">Đã hẹn</button><button data-list-filter-status="absent">Vắng nhà</button></div></div>
    <div class="list-result-line"><strong data-list-count>${debtItems.length} hộ cần theo dõi</strong><span>Ưu tiên quá hạn nhiều kỳ trước</span></div>
    <div class="collection-card-grid">${cards}</div>
    <div class="collection-empty" data-list-empty hidden>Không có công nợ phù hợp với bộ lọc.</div>
  </section>`;
}

function accountingDashboard() {
  return `${pageHeader("Không gian kế toán", "Tổng quan kế toán kỳ 09/2026", "Khớp sao kê, xử lý dòng treo, chứng từ và đối soát tiền mặt.", actionButton("Đồng bộ sao kê", "syncStatement", "primary", "↻"))}
  ${flowStrip(4)}
  ${kpiGrid([kpi("Giao dịch hôm nay", "184", "172 đã khớp tự động", "success", "↔"), kpi("Dòng treo", "12", "3 dòng quá 24 giờ", "danger", "?"), kpi("Tiền mặt chờ nộp", "18,42 triệu", "4 người thu có chênh lệch", "warning", "₫"), kpi("Chứng từ chờ phát hành", "09", "7 biên lai · 2 HĐĐT", "", "▤")])}
  <div class="content-grid">
    ${panel("Tình trạng xử lý dòng tiền", "Theo số giao dịch kỳ 09/2026", `<div class="donut-wrap"><div class="donut"></div><div class="legend"><div class="legend-row"><span class="legend-dot"></span><span>Đã khớp</span><strong>73%</strong></div><div class="legend-row"><span class="legend-dot navy"></span><span>Thu một phần</span><strong>15%</strong></div><div class="legend-row"><span class="legend-dot warning"></span><span>Dòng treo</span><strong>8%</strong></div><div class="legend-row"><span class="legend-dot gray"></span><span>Chưa nộp</span><strong>4%</strong></div></div></div>`)}
    ${panel("Ưu tiên hôm nay", "Xử lý theo rủi ro và tuổi tồn", `<div class="alert-list"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>3 dòng treo quá 24 giờ</h4><p>Tổng 1.490.000đ chưa xác định khoản.</p></div><button class="button button-small" data-action="go:unmatched">Xử lý</button></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>320.000đ tiền mặt quá hạn</h4><p>Tuyến TTT-T11 · người thu Võ Thị Lan.</p></div><button class="button button-small" data-action="reconcileCash">Đối soát</button></article><article class="task-item"><span class="task-icon">✓</span><div><h4>9 chứng từ chờ phát hành</h4><p>Dòng tiền đã khớp và đủ điều kiện.</p></div><button class="button button-small" data-action="issueReceipt">Phát hành</button></article></div>`)}
  </div>`;
}

function statements() {
  const rows = APP_DATA.statements.map(s => `<tr><td><button class="link-button" data-action="genericDetail">${s.tx}</button><span class="cell-subtitle">${s.time}</span></td><td><span class="cell-title">${s.sender}</span><span class="cell-subtitle">${s.content}</span></td><td class="money">${formatMoney(s.amount)}</td><td>${s.match}</td><td>${badge(s.confidence)}</td><td>${badge(s.status)}</td><td>${s.status === "Dòng treo" ? `<button class="button button-small" data-action="resolveUnmatched">Xử lý</button>` : `<button class="button button-small" data-action="genericDetail">Chi tiết</button>`}</td></tr>`);
  return `${pageHeader("TH-07", "Sao kê ngân hàng", "Nhận giao dịch từ API hoặc tệp, chống nhập trùng và khớp theo mã thanh toán.", actionButton("Nhập tệp", "syncStatement") + actionButton("Đồng bộ ngay", "syncStatement", "primary", "↻"))}
  ${kpiGrid([kpi("Phiên gần nhất", "10:20", "31 giao dịch mới", "", "◷"), kpi("Khớp tự động", "27", "Tỷ lệ 87,1%", "success", "✓"), kpi("Chờ xác nhận", "01", "Một giao dịch cho hai khoản", "warning", "≈"), kpi("Dòng treo", "03", "Thiếu mã hoặc lệch tiền", "danger", "?")])}
  ${panel("Giao dịch mới nhất", "Tài khoản nhận được cấu hình theo cơ chế tổ chức thu", table(["Mã / thời gian", "Người gửi / nội dung", "Số tiền", "Khớp với", "Tin cậy", "Trạng thái", ""], rows))}`;
}

function unmatched() {
  const rows = APP_DATA.unmatched.map(u => `<tr><td><span class="cell-title">${u.tx}</span><span class="cell-subtitle">${u.time}</span></td><td><span class="cell-title">${u.sender}</span><span class="cell-subtitle">${u.content}</span></td><td class="money">${formatMoney(u.amount)}</td><td>${u.candidates}</td><td>${u.age}</td><td>${badge(u.reason)}</td><td><button class="button button-small" data-action="resolveUnmatched">Xử lý</button></td></tr>`);
  return `${pageHeader("TH-08", "Dòng treo chờ xử lý", "Không tự động ghi nhận nghĩa vụ khi mã thiếu, sai hoặc độ tin cậy chưa đạt ngưỡng.", actionButton("Tìm lại ứng viên", "rerunMatch") + actionButton("Xử lý dòng đã chọn", "resolveUnmatched", "primary"))}
  <div class="callout danger"><span class="callout-icon">!</span><div><strong>3 giao dịch đã tồn tại quá 24 giờ</strong><p>Gán tay cần căn cứ, người xử lý và audit; hoàn tiền cần hồ sơ phê duyệt.</p></div></div>
  ${panel("12 giao dịch chưa khớp", "Tổng giá trị 3.842.000đ", table(["Giao dịch", "Người gửi / nội dung", "Số tiền", "Ứng viên", "Tuổi", "Nguyên nhân", ""], rows))}`;
}

function receipts() {
  const rows = APP_DATA.receipts.map(r => `<tr><td><button class="link-button" data-action="genericDetail">${r.number}</button><span class="cell-subtitle">${r.issued}</span></td><td><span class="cell-title">${r.subject}</span><span class="cell-subtitle">${r.charge}</span></td><td class="money">${formatMoney(r.amount)}</td><td>${r.channel}</td><td>${badge(r.status)}</td><td><button class="button button-small" data-action="genericDetail">Xem chứng từ</button></td></tr>`);
  return `${pageHeader("TH-09 · TH-10", "Biên lai và hóa đơn điện tử", "Phát hành theo trạng thái thanh toán hợp lệ; điều chỉnh/hủy phải giữ liên kết chứng từ gốc.", actionButton("Phát hành chứng từ", "issueReceipt", "primary", "+"))}
  <div class="content-grid">
    ${panel("Chứng từ gần nhất", "Sổ phát hành kỳ 09/2026", table(["Số / thời gian", "Đối tượng / khoản", "Số tiền", "Kênh gửi", "Trạng thái", ""], rows))}
    ${panel("Bản xem trước", "Dữ liệu minh họa", `<div class="invoice-preview"><div class="invoice-brand"><div><h3>UBND XÃ ĐÔNG THẠNH</h3><p>Thành phố Hồ Chí Minh</p></div><div class="invoice-number"><strong>BL-2609-003942</strong><p>Ngày 12/09/2026</p></div></div><div class="invoice-title"><h2>Biên lai điện tử</h2><p>Giá dịch vụ thu gom, vận chuyển CTRSH</p></div><p><strong>Người nộp:</strong> Phạm Thị Lan<br><strong>Mã khoản:</strong> DTH-0926-H000142</p><table class="invoice-lines"><tr><th>Nội dung</th><th>Số tiền</th></tr><tr><td>Khoản kỳ 09/2026</td><td>40.000đ</td></tr><tr><th>Tổng cộng</th><th>40.000đ</th></tr></table><span class="badge success">Đã phát hành</span></div>`)}
  </div>`;
}

function cashReconciliation() {
  const rows = APP_DATA.cashReconciliations.map(r => `<tr><td><span class="cell-title">${r.collector}</span><span class="cell-subtitle">${r.route}</span></td><td class="money">${formatMoney(r.collected)}</td><td class="money">${formatMoney(r.deposited)}</td><td class="money">${formatMoney(r.difference)}</td><td>${r.oldest}</td><td>${badge(r.status)}</td><td>${r.difference ? `<button class="button button-small" data-action="reconcileCash">Xử lý</button>` : `<button class="button button-small" data-action="genericDetail">Xem</button>`}</td></tr>`);
  return `${pageHeader("BC-11", "Đối soát tiền mặt người thu", "So sánh tiền người thu đã nhận, tiền đã nộp và dòng sao kê đã khớp.", actionButton("Xuất bảng kê", "exportData") + actionButton("Chạy đối soát", "reconcileCash", "primary", "↔"))}
  ${kpiGrid([kpi("Đã ghi nhận thu", "6,00 triệu", "Theo các ca hiện trường", "", "₫"), kpi("Đã nộp/khớp", "5,36 triệu", "89,3% giá trị", "success", "✓"), kpi("Còn chờ nộp", "640.000đ", "4 người thu", "warning", "◷"), kpi("Quá hạn", "320.000đ", "Tuyến TTT-T11", "danger", "!")])}
  ${panel("Đối soát theo người thu", "Người đối soát phải khác người thu", table(["Người thu / tuyến", "Đã nhận", "Đã nộp", "Chênh", "Khoản lâu nhất", "Trạng thái", ""], rows))}`;
}

function unitReconciliation() {
  const rows = APP_DATA.unitReconciliations.map(r => `<tr><td><span class="cell-title">${r.unit}</span><span class="cell-subtitle">Kỳ ${r.period}</span></td><td>${r.assigned}</td><td>${r.serviceDone}</td><td>${r.charges}</td><td>${r.paid}</td><td>${r.difference}</td><td>${badge(r.status)}</td><td><button class="button button-small" data-action="reconcileUnit">Đối soát</button></td></tr>`);
  return `${pageHeader("BC-07", "Đối soát đơn vị cung cấp dịch vụ", "Đối chiếu phạm vi được giao, dịch vụ thực hiện, hợp đồng và khoản đã phát hành; không mặc định là đối soát “phần xử lý”.", actionButton("Tải bảng kê", "exportData") + actionButton("Chạy đối soát", "reconcileUnit", "primary", "↔"))}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Phạm vi tiền và đích nộp phải được cấu hình</strong><p>Không tự suy diễn đơn vị được giữ hoặc phải nộp thành phần giá nào khi chưa có văn bản/ủy quyền.</p></div></div>
  ${panel("Kết quả đối soát kỳ 09/2026", "Dữ liệu dịch vụ và thu tiền được truy vết độc lập", table(["Đơn vị / kỳ", "Được giao", "Đã phục vụ", "Khoản", "Đã thu", "Sai lệch", "Trạng thái", ""], rows))}`;
}

function accountingReports() {
  const rows = APP_DATA.reports.map(r => `<tr><td><button class="link-button" data-action="genericDetail">${r.code}</button></td><td><span class="cell-title">${r.name}</span><span class="cell-subtitle">Chủ trì: ${r.owner}</span></td><td>${r.period}</td><td>${r.updated}</td><td>${badge(r.status)}</td><td><button class="button button-small" data-action="genericDetail">Xem bản</button></td></tr>`);
  return `${pageHeader("BC-02 → BC-12", "Báo cáo thu và công nợ", "Mỗi báo cáo lưu phiên bản và có thể mở xuống khoản, giao dịch, chứng từ nguồn.", actionButton("Xuất danh mục", "exportData") + actionButton("Lập báo cáo", "createReport", "primary", "+"))}
  ${panel("Bộ báo cáo kỳ", "Số liệu thay đổi cho tới khi kỳ được khóa", table(["Mã", "Tên / người lập", "Kỳ", "Cập nhật", "Trạng thái", ""], rows))}`;
}

function leaderDashboard() {
  const unitRows = APP_DATA.unitPerformance.map(u => `<tr><td><span class="cell-title">${u.unit}</span><span class="cell-subtitle">${u.assigned.toLocaleString("vi-VN")} hộ được giao</span></td><td>${u.attempted.toLocaleString("vi-VN")}</td><td><div style="min-width:100px">${progressBar(u.success, u.success < 70 ? "danger" : u.success < 75 ? "warning" : "")}<span class="cell-subtitle">${u.success}% thành công</span></div></td><td>${u.bankMatch}%</td><td class="money">${formatMoney(u.debt)}</td><td>${badge(`${u.offSystem} ngoài hệ thống`)}</td><td>${badge(u.status)}</td></tr>`);
  const financeBars = `<div class="bar-chart">${APP_DATA.financeSummary.map((f, i) => `<div class="bar-row"><span class="bar-label">${f.label}</span><div class="bar-track"><div class="bar-fill ${i === 0 ? "navy" : i > 1 ? "warning" : ""}" style="width:${Math.max(f.ratio, 4)}%"></div></div><span class="bar-value">${(f.amount / 1000000000).toLocaleString("vi-VN", { maximumFractionDigits: 3 })} tỷ</span></div>`).join("")}</div>`;
  return `${pageHeader("Không gian lãnh đạo", "Dashboard điều hành toàn xã", "Báo cáo tổng hợp tài chính thu–chi, hiệu quả đơn vị thu, tỷ lệ thành công và cảnh báo thất thoát.", actionButton("Xem báo cáo", "go:executive-reports") + actionButton("Hàng chờ duyệt", "go:approval-queue", "primary"))}
  ${kpiGrid([kpi("Tổng phải thu", "3,824 tỷ", "48.654 khoản đã phát hành", "", "₫"), kpi("Đã thu/khớp", "2,792 tỷ", "73,0% · tăng 4,8 điểm", "success", "↗"), kpi("Nợ trên 90 ngày", "97 hồ sơ", "Giá trị 284,6 triệu", "danger", "!"), kpi("Hồ sơ chờ duyệt", "07", "Ảnh hưởng 838.000đ", "warning", "✓")])}
  <div class="content-grid equal">
    ${panel("Tổng hợp tài chính thu–chi", "Chi phí là dữ liệu minh họa, cần căn cứ phê duyệt", financeBars)}
    ${panel("Tỷ lệ thu theo địa bàn", "Ba địa bàn sau hợp nhất", areaBars())}
  </div>
  ${panel("Hiệu quả đơn vị thu", "Tỷ lệ thành công = số hộ đã thu hợp lệ / số hộ đến hạn trong phạm vi", table(["Đơn vị", "Đã tiếp cận", "Thành công", "Khớp ngân hàng", "Công nợ", "Ngoại lệ", "Đánh giá"], unitRows))}
  <div style="height:16px"></div>
  ${panel("Cảnh báo điều hành", "Ưu tiên theo mức rủi ro", `<div class="content-grid three" style="margin:0"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>6 trường hợp thu ngoài hệ thống</h4><p>Hộ đã chấm dứt nhưng đơn vị vẫn báo thu/cung cấp.</p></div><button class="button button-small" data-action="reviewOffSystem">Mở</button></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>12 dòng treo chưa xử lý</h4><p>Ba giao dịch đã quá 24 giờ.</p></div></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>Luồng tài khoản nhận chưa chốt</h4><p>Cần BA, kế toán và lãnh đạo thống nhất.</p></div></article></div>`)}
  <div style="height:16px"></div>
  ${panel("Diễn biến kỳ 09/2026", "Từ phát hành tới chốt kỳ", `<div class="timeline"><div class="timeline-item"><span class="timeline-dot">✓</span><div><h4>01/09 · Mở kỳ và phát hành đợt đầu</h4><p>32.667 khoản hợp lệ được cấp mã thanh toán.</p></div></div><div class="timeline-item"><span class="timeline-dot">✓</span><div><h4>05/09 · Hoàn tất phân tuyến</h4><p>100% tuyến có người thu và phạm vi dữ liệu.</p></div></div><div class="timeline-item pending"><span class="timeline-dot">3</span><div><h4>12/09 · Đang thu và đối soát</h4><p>Tỷ lệ thu hiện tại 73%; còn 12 dòng treo.</p></div></div><div class="timeline-item pending"><span class="timeline-dot">4</span><div><h4>30/09 · Dự kiến chốt kỳ</h4><p>Chỉ thực hiện khi điều kiện khóa đã đạt.</p></div></div></div>`)}`;
}

function leaderApprovals() {
  const rows = APP_DATA.requests.map(r => `<tr><td><button class="link-button" data-action="reviewApproval">${r.code}</button></td><td>${badge(r.type)}</td><td><span class="cell-title">${r.subject}</span><span class="cell-subtitle">${r.reason}</span></td><td class="money">${formatMoney(r.amount)}</td><td>${r.createdBy}</td><td>${r.age}</td><td>${badge(r.status)}</td><td><button class="button button-small" data-action="reviewApproval">Xem xét</button></td></tr>`);
  return `${pageHeader("Quyết định về tiền", "Hàng chờ phê duyệt", "Lãnh đạo duyệt hoặc từ chối miễn giảm, hoàn tiền, xóa nợ và hủy/điều chỉnh hóa đơn.", actionButton("Xem quy chế", "policyPreview"))}
  <div class="callout"><span class="callout-icon">i</span><div><strong>Hệ thống kiểm tra tách bạch trước khi duyệt</strong><p>Không cho người lập tự duyệt hoặc áp dụng hồ sơ thiếu căn cứ bắt buộc.</p></div></div>
  ${panel("7 hồ sơ đang chờ", "Xếp theo tuổi hồ sơ và mức ảnh hưởng", table(["Mã", "Loại", "Đối tượng / lý do", "Ảnh hưởng", "Người lập", "Tuổi", "Trạng thái", ""], rows))}`;
}

function leaderAlerts() {
  return `${pageHeader("BC-09", "Cảnh báo và sai lệch", "Tập trung các rủi ro dòng tiền, dữ liệu, công nợ và tích hợp có thể ảnh hưởng khóa kỳ.", actionButton("Xuất cảnh báo", "exportData"))}
  ${kpiGrid([kpi("Mức nghiêm trọng", "04", "Cần xử lý trong hôm nay", "danger", "!"), kpi("Mức cảnh báo", "15", "Đang trong SLA xử lý", "warning", "!"), kpi("Đã đóng kỳ này", "38", "Có kết luận và người chịu trách nhiệm", "success", "✓"), kpi("Quá SLA", "03", "Lâu nhất 47 giờ", "danger", "◷")])}
  <div class="content-grid equal">
    ${panel("Cảnh báo dòng tiền", "Sắp xếp theo ảnh hưởng", `<div class="alert-list"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Tiền mặt quá hạn 320.000đ</h4><p>Võ Thị Lan · tuyến TTT-T11 · quá 1 ngày.</p></div><button class="button button-small" data-action="genericDetail">Mở</button></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Dòng treo 1.250.000đ</h4><p>VCB2609109721 · lệch số tiền · 47 giờ.</p></div><button class="button button-small" data-action="genericDetail">Mở</button></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>Giao dịch có nguy cơ phân bổ trùng</h4><p>TTT0926H001092 · một lần nộp cho hai kỳ.</p></div></article></div>`)}
    ${panel("Cảnh báo dữ liệu & nợ", "Có thể mở xuống danh sách", `<div class="alert-list"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>97 hồ sơ nợ trên 90 ngày</h4><p>31 hồ sơ chưa có lần xác minh trong kỳ.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>6 hộ đã chấm dứt vẫn được báo thu</h4><p>Đã khóa cập nhật và chuyển sang đối soát ngoại lệ.</p></div><button class="button button-small" data-action="reviewOffSystem">Mở</button></article><article class="alert-item"><span class="alert-icon">!</span><div><h4>18 hợp đồng thiếu biểu giá hợp lệ</h4><p>Đã chặn phát hành khoản tương ứng.</p></div></article></div>`)}
  </div>`;
}

function leaderReports() {
  const rows = APP_DATA.reports.map(r => `<tr><td><span class="cell-title">${r.code}</span><span class="cell-subtitle">Phiên bản v1.3</span></td><td>${r.name}</td><td>${r.period}</td><td>${r.owner}</td><td>${r.updated}</td><td>${badge(r.status)}</td><td>${r.status.includes("Chờ xác nhận") ? `<button class="button button-small" data-action="confirmReport">Xác nhận</button>` : `<button class="button button-small" data-action="genericDetail">Xem</button>`}</td></tr>`);
  const financeRows = APP_DATA.financeSummary.map(f => `<tr><td><span class="cell-title">${f.label}</span><span class="cell-subtitle">${f.note}</span></td><td class="money">${formatMoney(f.amount)}</td><td>${f.ratio}%</td><td>${badge(f.label.includes("Chênh") ? "Cần xử lý" : "Đang tổng hợp")}</td></tr>`);
  const unitRows = APP_DATA.unitPerformance.map(u => `<tr><td>${u.unit}</td><td>${u.assigned.toLocaleString("vi-VN")}</td><td>${u.attempted.toLocaleString("vi-VN")}</td><td>${u.success}%</td><td>${u.bankMatch}%</td><td class="money">${formatMoney(u.debt)}</td><td>${badge(`${u.offSystem} ngoại lệ`)}</td></tr>`);
  return `${pageHeader("BC-01 → BC-12", "Báo cáo tổng hợp", "Ba lớp báo cáo: tài chính thu–chi, hiệu quả đơn vị thu và tỷ lệ thành công; mọi số liệu mở xuống dữ liệu nguồn.", actionButton("Xuất bộ báo cáo", "exportData"))}
  <div class="segmented" style="margin-bottom:14px"><button class="active" data-filter="finance">Tài chính thu–chi</button><button data-filter="unit">Đơn vị thu hộ</button><button data-filter="success">Tỷ lệ thành công</button></div>
  <div class="content-grid equal">
    ${panel("Tổng hợp tài chính", "Kỳ 09/2026 · chưa khóa", table(["Chỉ tiêu", "Giá trị", "Tỷ trọng", "Trạng thái"], financeRows))}
    ${panel("Đơn vị thu và tỷ lệ thành công", "Có chỉ số thu ngoài hệ thống để giám sát thất thoát", table(["Đơn vị", "Được giao", "Tiếp cận", "Thành công", "Khớp", "Công nợ", "Ngoại lệ"], unitRows))}
  </div>
  <div style="height:16px"></div>
  ${panel("Báo cáo trình lãnh đạo", "Kỳ 09/2026 · số liệu chưa khóa", table(["Mã / phiên bản", "Báo cáo", "Kỳ", "Người lập", "Cập nhật", "Trạng thái", ""], rows))}`;
}

function periodClose() {
  return `${pageHeader("BR-14", "Chốt và khóa kỳ 09/2026", "Khóa kỳ là quyết định nghiệp vụ cuối cùng; dữ liệu sau khóa chỉ điều chỉnh qua quy trình đặc biệt.", actionButton("Kiểm tra lại", "precheckPeriod") + actionButton("Khóa kỳ", "closePeriod", "danger", "▣"))}
  <div class="callout danger"><span class="callout-icon">!</span><div><strong>Chưa đủ điều kiện khóa kỳ</strong><p>Còn 12 dòng treo, trong đó 3 dòng quá 24 giờ cần được xử lý hoặc có quyết định ngoại lệ.</p></div></div>
  <div class="steps" style="margin-bottom:16px"><div class="step-card done"><span class="step-number">✓</span><h4>Phát hành khoản</h4><p>Khoản lỗi đã bị giữ riêng</p></div><div class="step-card done"><span class="step-number">✓</span><h4>Đối soát tiền mặt</h4><p>Đã lập danh sách ngoại lệ</p></div><div class="step-card blocked"><span class="step-number">!</span><h4>Dòng treo</h4><p>Còn 12 giao dịch</p></div><div class="step-card done"><span class="step-number">✓</span><h4>Báo cáo</h4><p>Đã có bản trình xác nhận</p></div></div>
  <div class="content-grid equal">
    ${panel("Điều kiện bắt buộc", "Kiểm tra tự động trước khi cho phép khóa", `<div class="task-list"><article class="task-item"><span class="task-icon">✓</span><div><h4>Không còn lỗi phát hành nghiêm trọng</h4><p>18 khoản lỗi đã tách khỏi đợt.</p></div></article><article class="task-item"><span class="task-icon">✓</span><div><h4>Đối soát tiền mặt có kết luận</h4><p>Các chênh lệch có hồ sơ xử lý.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Dòng treo bắt buộc chưa hoàn tất</h4><p>Điều kiện đang chặn khóa kỳ.</p></div></article></div>`)}
    ${panel("Hậu quả khi khóa", "Cần đọc trước khi xác nhận", `<ul class="muted" style="margin:0;padding-left:19px;font-size:12px"><li>Không sửa trực tiếp khoản, thanh toán và chứng từ.</li><li>Dashboard và báo cáo chuyển sang phiên bản chính thức.</li><li>Mở lại kỳ cần quyền đặc biệt, lý do và phê duyệt.</li><li>Mọi lần thử sửa sau khóa được ghi audit.</li></ul>`)}
  </div>`;
}

function adminDashboard() {
  return `${pageHeader("Không gian quản trị", "Tổng quan hệ thống", "Theo dõi tài khoản, tích hợp, sao lưu và nhật ký kỹ thuật; quản trị không có quyền duyệt tiền.", actionButton("Sao lưu ngay", "runBackup") + actionButton("Thêm người dùng", "addUser", "primary", "+"))}
  ${kpiGrid([kpi("Người dùng hoạt động", "86", "5 vai trò chức năng", "success", "♙"), kpi("Phiên đang đăng nhập", "24", "3 phiên mobile hiện trường", "", "●"), kpi("Kết nối cần cấu hình", "02", "VietQR và HĐĐT", "warning", "↔"), kpi("Sự kiện lỗi 24 giờ", "01", "Đồng bộ đã retry thành công", "danger", "!")])}
  <div class="content-grid equal">
    ${panel("Sức khỏe dịch vụ", "Trạng thái tại 10:30", `<div class="task-list"><article class="task-item"><span class="task-icon">✓</span><div><h4>Ứng dụng nghiệp vụ</h4><p>Hoạt động · phản hồi trung bình 320ms.</p></div>${badge("Hoạt động")}</article><article class="task-item"><span class="task-icon">✓</span><div><h4>Cơ sở dữ liệu</h4><p>Hoạt động · bản sao gần nhất 08:30.</p></div>${badge("Hoạt động")}</article><article class="task-item"><span class="task-icon">↻</span><div><h4>Ngân hàng UAT</h4><p>Đồng bộ gần nhất lúc 10:20.</p></div>${badge("Hoạt động")}</article></div>`)}
    ${panel("Kiểm soát quản trị", "Giới hạn quyền kỹ thuật", `<div class="callout" style="margin-bottom:9px"><span class="callout-icon">i</span><div><strong>Quản trị không duyệt tiền</strong><p>Không có nút miễn giảm, hoàn, xóa nợ hoặc khóa kỳ.</p></div></div><div class="callout warning" style="margin:0"><span class="callout-icon">!</span><div><strong>2 tài khoản cần hoàn tất 2FA</strong><p>Quyền kế toán và lãnh đạo bị giới hạn tới khi hoàn tất.</p></div></div>`)}
  </div>`;
}

function users() {
  const rows = APP_DATA.users.map(u => `<tr><td><span class="cell-title">${u.username}</span><span class="cell-subtitle">${u.name}</span></td><td>${u.organization}</td><td>${badge(u.roles)}</td><td>${u.lastLogin}</td><td>${badge(u.status)}</td><td><button class="button button-small" data-action="genericDetail">Quản lý</button></td></tr>`);
  return `${pageHeader("QT-01", "Người dùng và tài khoản", "Quản lý vòng đời tài khoản, đơn vị, vai trò, xác thực và thu hồi phiên.", actionButton("Xuất danh sách", "exportData") + actionButton("Thêm người dùng", "addUser", "primary", "+"))}
  ${toolbar("Tên, tài khoản hoặc đơn vị...", `<div class="toolbar-field"><label>Vai trò</label><select class="control"><option>Tất cả</option>${ROLE_ORDER.map(id => `<option>${ROLE_CONFIG[id].label}</option>`).join("")}</select></div>`)}
  ${panel("86 tài khoản", "2 tài khoản đang chờ hoàn tất xác thực hai lớp", table(["Tài khoản / họ tên", "Đơn vị", "Vai trò", "Đăng nhập gần nhất", "Trạng thái", ""], rows))}`;
}

function permissions() {
  const rows = [
    ["Cán bộ xã", "Đối tượng, hợp đồng, kỳ, khoản, phân tuyến, đề nghị", "Theo địa bàn được phân công", "Không duyệt tiền"],
    ["Người đi thu", "Danh sách tuyến, nhập web/Excel, QR, tiền mặt chờ nộp, chốt ca", "Chỉ tuyến/hộ do xã giao trực tiếp", "Không sửa hồ sơ/giá; không đổi tài khoản QR tùy ý"],
    ["Kế toán", "Sao kê, dòng treo, chứng từ, đối soát, báo cáo", "Toàn xã hoặc theo phân công", "Không quyết định miễn giảm"],
    ["Lãnh đạo", "Dashboard, duyệt quyết định, xác nhận báo cáo, khóa kỳ", "Toàn xã", "Không cấu hình kỹ thuật"],
    ["Quản trị", "Tài khoản, RBAC, cấu hình, tích hợp, audit", "Kỹ thuật toàn hệ thống", "Không thao tác nghiệp vụ tiền"]
  ].map(r => `<tr><td>${badge(r[0])}</td><td>${r[1]}</td><td><span class="cell-title">${r[2]}</span></td><td>${r[3]}</td><td><button class="button button-small" data-action="editPermissions">Cấu hình</button></td></tr>`);
  return `${pageHeader("QT-02", "Vai trò, quyền và phạm vi dữ liệu", "Phân quyền đồng thời ở trang, hành động, API và phạm vi địa bàn/tuyến.", actionButton("Kiểm tra xung đột", "permissionAudit") + actionButton("Cấu hình quyền", "editPermissions", "primary"))}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Cho phép kiêm nhiệm nhưng không bỏ kiểm soát tách bạch</strong><p>Một tài khoản có nhiều vai vẫn không được tự đề nghị–tự duyệt hoặc tự thu–tự đối soát.</p></div></div>
  ${panel("Ma trận vai trò mức cao", "Cấu hình chi tiết được quản lý theo mã chức năng QT/DM/BG/HD/TH/CN/BC", table(["Vai trò", "Nhóm chức năng", "Phạm vi", "Giới hạn", ""], rows))}`;
}

function areas() {
  const rows = APP_DATA.areas.map((a, i) => `<tr><td><span class="cell-title">${["DTH","TTT","NB"][i]} · ${a.name}</span><span class="cell-subtitle">Ánh xạ từ địa giới cũ</span></td><td>${a.subjects.toLocaleString("vi-VN")}</td><td>${APP_DATA.routes.filter(r => r.area.includes(a.name)).length}</td><td>${a.rate}%</td><td>${a.debt}</td><td>${badge(a.risk)}</td><td><button class="button button-small" data-action="genericDetail">Cấu hình</button></td></tr>`);
  return `${pageHeader("QT-03 · QT-04", "Địa bàn, đơn vị và đích nộp", "Cấu hình địa giới, tổ chức cung cấp/thu, tuyến và tài khoản nhận mà không sửa mã nguồn.", actionButton("Thêm đơn vị", "genericDetail") + actionButton("Thêm địa bàn", "genericDetail", "primary", "+"))}
  ${panel("Cấu trúc địa bàn", "Dữ liệu được phân vùng để thí điểm và nhân rộng", table(["Mã / địa bàn", "Đối tượng", "Tuyến mẫu", "Tỷ lệ thu", "Công nợ", "Tình trạng", ""], rows))}`;
}

function tariffs() {
  const rows = APP_DATA.tariffVersions.map(t => `<tr><td><span class="cell-title">${t.code}</span><span class="cell-subtitle">${t.legal}</span></td><td>${t.scope}</td><td>${t.collection}</td><td>${t.transport}</td><td>${t.processing}</td><td>${t.effective}</td><td>${badge(t.status)}</td><td><button class="button button-small" data-action="genericDetail">Xem</button></td></tr>`);
  return `${pageHeader("BG-01 → BG-06", "Biểu giá và định mức theo thời kỳ", "Quản lý giá theo căn cứ pháp lý, địa bàn, nhóm đối tượng, phương pháp và thời gian hiệu lực.", actionButton("Mô phỏng tính giá", "genericDetail") + actionButton("Tạo phiên bản", "addTariff", "primary", "+"))}
  <div class="callout warning"><span class="callout-icon">!</span><div><strong>Dữ liệu giá dưới đây chỉ để trực quan hóa</strong><p>Không sử dụng làm số thu thật trước khi BA xác nhận văn bản và cơ chế chuyển tiếp của xã.</p></div></div>
  ${panel("Phiên bản biểu giá", "Khoản đã phát hành giữ snapshot, không bị đổi theo cấu hình mới", table(["Mã / căn cứ", "Phạm vi", "Thu gom", "Vận chuyển", "Xử lý", "Hiệu lực", "Trạng thái", ""], rows))}`;
}

function moneyFlow() {
  const rows = APP_DATA.paymentFlows.map(f => `<tr><td><span class="cell-title">${f.code}</span><span class="cell-subtitle">${f.name}</span></td><td>${f.owner}</td><td>${f.traceability}</td><td>${f.reconciliation}</td><td>${f.risk}</td><td>${badge(f.status)}</td><td><button class="button button-small" data-action="configureMoneyFlow">Xem cấu hình</button></td></tr>`);
  return `${pageHeader("Quyết định mở sau họp 12/09", "Luồng tiền, tài khoản nhận và QR", "So sánh các phương án để tiền vào đúng chủ thể, mỗi khoản có mã truy vết và sổ sách không nhập nhằng.", actionButton("Cập nhật cấu hình", "configureMoneyFlow", "primary", "+"))}
  <div class="callout danger"><span class="callout-icon">!</span><div><strong>Không chọn tài khoản cá nhân làm mô hình mục tiêu</strong><p>Tài khoản của người quản lý làm khó phân định tiền cá nhân và tiền nghiệp vụ, tăng rủi ro khớp sổ và bàn giao.</p></div></div>
  ${kpiGrid([kpi("Phương án đang ưu tiên", "Tài khoản chính thức + mã/VA", "Cần xác nhận với ngân hàng và kế toán", "success", "✓"), kpi("QR đang dùng", "QR-DTH-T07-v3", "Do người đi thu hiển thị, kế thừa cấu hình", "", "⌘"), kpi("Dòng treo kỳ này", "12", "Thiếu/sai mã thanh toán", "warning", "?"), kpi("Quyết định chưa chốt", "01", "Chủ tài khoản và quy trình đối soát", "danger", "!")])}
  ${panel("So sánh phương án", "Cấu hình cuối cùng phải được BA, kế toán và lãnh đạo xác nhận", table(["Phương án", "Chủ tài khoản", "Truy vết", "Đối soát", "Rủi ro", "Đánh giá", ""], rows))}
  <div style="height:16px"></div>
  ${panel("Nguyên tắc QR của người đi thu", "Người đi thu có thể cập nhật phiên bản hiển thị nhưng không được tự đổi chủ tài khoản", `<div class="steps"><div class="step-card done"><span class="step-number">1</span><h4>Tài khoản chính thức</h4><p>Được cấu hình theo pháp nhân</p></div><div class="step-card done"><span class="step-number">2</span><h4>Mã từng khoản</h4><p>Khóa hộ–kỳ–dịch vụ</p></div><div class="step-card"><span class="step-number">3</span><h4>Người thu cập nhật</h4><p>Gửi thay đổi có audit</p></div><div class="step-card"><span class="step-number">4</span><h4>Khớp sao kê</h4><p>Không khớp thì đưa dòng treo</p></div></div>`)} `;
}

function integrations() {
  const rows = APP_DATA.integrations.map(i => `<tr><td><span class="cell-title">${i.name}</span><span class="cell-subtitle">${i.purpose}</span></td><td>${i.environment}</td><td>${i.lastSync}</td><td>${i.latency}</td><td>${badge(i.status)}</td><td><button class="button button-small" data-action="configureIntegration">Cấu hình</button></td></tr>`);
  return `${pageHeader("QT-06", "Kết nối tích hợp", "Quản lý VietQR, ngân hàng, HĐĐT và KBNN theo môi trường; bí mật không lưu ở trình duyệt.", actionButton("Xem nhật ký lỗi", "genericDetail") + actionButton("Thêm kết nối", "configureIntegration", "primary", "+"))}
  <div class="callout"><span class="callout-icon">i</span><div><strong>Mọi yêu cầu ghi phải có idempotency</strong><p>Tích hợp timeout hoặc retry không được làm phát sinh giao dịch/chứng từ trùng.</p></div></div>
  ${panel("Trạng thái kết nối", "KBNN thuộc giai đoạn mở rộng", table(["Tích hợp / mục đích", "Môi trường", "Đồng bộ gần nhất", "Độ trễ", "Trạng thái", ""], rows))}`;
}

function audit() {
  const rows = APP_DATA.audit.map(a => `<tr><td>${a.time}</td><td><span class="cell-title">${a.actor}</span><span class="cell-subtitle">${a.role}</span></td><td>${a.action}</td><td>${a.object}</td><td>${badge(a.result)}</td><td><button class="button button-small" data-action="genericDetail">Chi tiết</button></td></tr>`);
  return `${pageHeader("QT-09 · QT-10", "Nhật ký, giám sát và sao lưu", "Audit nghiệp vụ tài chính không cho người dùng sửa; bản sao lưu phải được kiểm thử phục hồi.", actionButton("Xuất audit", "exportData") + actionButton("Sao lưu ngay", "runBackup", "primary"))}
  ${kpiGrid([kpi("Sự kiện hôm nay", "12.486", "Theo người, vai trò và thiết bị", "", "◷"), kpi("Thao tác tài chính", "2.194", "Lưu dữ liệu trước/sau", "success", "₫"), kpi("Cảnh báo bảo mật", "01", "Đăng nhập thất bại liên tiếp", "danger", "!"), kpi("Sao lưu gần nhất", "08:30", "Kiểm tra checksum thành công", "success", "✓")])}
  ${panel("Nhật ký gần nhất", "Có thể lọc theo actor, đối tượng và loại sự kiện", table(["Thời gian", "Người / vai trò", "Hành động", "Đối tượng", "Kết quả", ""], rows))}`;
}

const VIEW_RENDERERS = {
  communeDashboard, subjects, dataQuality, periods, billing, routes, debts, collectionProgress, requests,
  collectorToday, collectorRoute, collectorEntry, cashPending, shiftClose, collectorDebt,
  accountingDashboard, statements, unmatched, receipts, cashReconciliation, unitReconciliation, accountingReports,
  leaderDashboard, leaderApprovals, leaderAlerts, leaderReports, periodClose,
  adminDashboard, users, permissions, areas, tariffs, moneyFlow, integrations, audit
};
