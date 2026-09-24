"use strict";

// Người đi thu dùng điện thoại: web app responsive dựng theo mẫu GRAC (header xanh, thẻ hợp đồng, tab bar).
// Trên màn hình rộng hiển thị trong khung điện thoại để xem trước; dưới 600px chiếm toàn màn hình như app thật.
// Dữ liệu và nghiệp vụ dùng chung với roles-simple.js (RS_ROWS, RS_SUBMIT.clUpdate, RS_HANDOVERS).

const clmState = { tab: "list", statsOpen: true, sheet: null, receipt: null, menu: null };
const CLM_RESULTS = [
  ["cash", "Đã thu tiền mặt", "cash"],
  ["transfer", "Đã thu chuyển khoản", "bank"],
  ["absent", "Vắng nhà", "home"],
  ["appointment", "Đã hẹn", "calendar"],
  ["refused", "Từ chối nộp", "alert"]
];
const clmMine = () => rsRows().filter(r => r.collector === RS_ME.username);
const clmCurrent = () => clmMine().filter(r => r.period === rsState.period);
const clmRow = charge => rsRows().find(r => r.charge === charge);
const clmBtn = (label, action, id = "", cls = "", iconName = "") => `<button type="button" class="gr-btn ${cls}" data-clm="${action}"${id ? ` data-id="${id}"` : ""}>${iconName ? icon(iconName) : ""}${label}</button>`;

// ---------- Màn danh sách hộ ----------
function clmCard(r) {
  const [label, tone] = RS_STATUS[r.status];
  const subject = csSubject(r.code);
  const paid = r.status === "paid";
  const title = subject?.contract && subject.contract !== "—" ? `Hợp đồng · ${subject.contract}` : `Khoản thu · ${r.charge}`;
  const result = paid
    ? `<div class="clm-result success">${icon("check")}<span>Đã thu ${r.method.toLowerCase()} · ${r.confirmedAt}<small>Biên lai ${r.receipt} đã gửi hộ</small></span></div>`
    : r.note && !rsIsRouteNote(r.note) ? `<div class="clm-result ${r.status === "overdue" ? "danger" : ""}">${icon(r.status === "appointment" ? "calendar" : "alert")}<span>${escapeHtml(r.note)}</span></div>` : "";
  return `<article class="clm-card" data-clm-card data-status="${r.status}" data-street="${escapeHtml(rsStreet(r.address))}" data-search="${escapeHtml(`${r.code} ${r.name} ${r.address} ${r.phone} ${r.charge} ${r.request} ${r.receipt} ${r.note}`.toLowerCase())}">
    <header class="clm-card-head"><strong>${escapeHtml(title)}</strong>${badge(label, tone)}</header>
    <div class="clm-card-body">
      <small class="clm-label">Thông tin khách hàng</small>
      <h3 class="clm-name">${escapeHtml(r.name)}</h3>
      <p><b>Mã KH:</b> ${r.code} · ${r.kind === "business" ? "Hộ kinh doanh" : "Hộ gia đình"}</p>
      <p><b>Địa chỉ:</b> ${escapeHtml(r.address)}, ${escapeHtml(r.area)}, xã Đông Thạnh</p>
      <p><b>Điện thoại:</b> ${escapeHtml(r.phone)}</p>
      <div class="clm-kv"><small>Phiếu yêu cầu thu</small><span>${r.request} · hạn ${r.dueDate}</span></div>
      <div class="clm-kv"><small>Nhân viên thu gom</small><span>${escapeHtml(rsCollector(r.confirmedBy || r.collector)?.name || "")}</span></div>
      <div class="clm-amount"><small>Số tiền phải thu · kỳ ${r.period}</small><strong>${formatMoney(r.amount)}</strong></div>
      ${result}
      <div class="clm-actions">
        ${paid ? clmBtn("Xem biên lai", "receipt", r.charge, "ghost", "receipt") : clmBtn("Cập nhật kết quả", "update", r.charge, "", "edit")}
        <button type="button" class="clm-iconbtn" data-clm="call" data-id="${r.charge}" aria-label="Gọi điện" title="Gọi điện">${icon("call")}</button>
        <button type="button" class="clm-iconbtn" data-clm="history" data-id="${r.charge}" aria-label="Lịch sử nộp các kỳ" title="Lịch sử nộp các kỳ">${icon("clock")}</button>
        <button type="button" class="clm-iconbtn warn" data-clm="moved" data-id="${r.charge}" aria-label="Báo sai thông tin / chuyển đi" title="Báo sai thông tin / chuyển đi">${icon("alert")}</button>
      </div>
    </div>
  </article>`;
}

function clmListScreen() {
  const current = clmCurrent();
  const periods = [...new Set(clmMine().map(r => r.period))].sort((a, b) => b.slice(3).localeCompare(a.slice(3)) || b.localeCompare(a));
  const paid = current.filter(r => r.status === "paid");
  const streets = [...new Set(current.map(r => rsStreet(r.address)))].sort((a, b) => a.localeCompare(b, "vi"));
  const held = Math.max(rsCashHeld(RS_ME.username, rsState.period), 0);
  const count = status => current.filter(r => r.status === status).length;
  const chips = [["all", "Tất cả", current.length], ["unpaid", "Chưa thu", count("unpaid")], ["overdue", "Quá hạn", count("overdue")], ["absent", "Vắng nhà", count("absent")], ["appointment", "Đã hẹn", count("appointment")], ["paid", "Đã thu", paid.length]];
  return `<div class="clm-hero">
      <div class="clm-brand"><strong>${icon("leaf")} Thu giá CTRSH</strong><button type="button" class="gr-chip" data-clm="tab" data-tab="account">${icon("user")} ${RS_ME.username}</button></div>
      <label class="gr-search clm-search">${icon("search")}<input type="search" id="clmSearch" placeholder="Tìm hộ, mã KH, địa chỉ, mã khoản..."></label>
      <button type="button" class="clm-stats-toggle" data-clm="stats">Thống kê kỳ ${rsState.period} ${icon("chevron")}</button>
      <div class="clm-stats"${clmState.statsOpen ? "" : " hidden"}>
        <div><small>Hộ được giao</small><strong>${current.length}</strong><span>${streets.length} đường</span></div>
        <div><small>Đã thu</small><strong>${paid.length}</strong><span>${formatMoney(rsSum(paid))}</span></div>
        <div><small>Chưa thu</small><strong>${current.length - paid.length}</strong><span>${count("overdue")} quá hạn</span></div>
        <div><small>Tiền mặt đang giữ</small><strong>${formatMoney(held)}</strong><span>${held ? "cần bàn giao" : "đã bàn giao đủ"}</span></div>
      </div>
      <div class="clm-filters">
        <label>Kỳ thanh toán<select class="clm-select" data-rs-filter="period">${periods.map(p => `<option value="${p}"${p === rsState.period ? " selected" : ""}>${rsPeriodTitle(p)}</option>`).join("")}</select></label>
        <label>Đường<select class="clm-select" id="clmStreet"><option value="all">Tất cả</option>${streets.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("")}</select></label>
      </div>
    </div>
    <div class="clm-chips">${chips.map(([v, l, n], i) => `<button type="button" class="clm-chip${i === 0 ? " active" : ""}" data-clm-chip="${v}">${l}<b>${n}</b></button>`).join("")}</div>
    <div class="gr-body clm-list">
      ${current.map(clmCard).join("")}
      <p class="gr-empty" data-clm-empty hidden>Không có hộ phù hợp.</p>
    </div>`;
}

// ---------- Màn tiền mặt & tài khoản ----------
function clmCashScreen() {
  const paidCash = clmCurrent().filter(r => r.status === "paid" && r.method === "Tiền mặt");
  const handed = RS_HANDOVERS.filter(h => h.collector === RS_ME.username && h.period === rsState.period);
  const held = Math.max(rsSum(paidCash) - rsSum(handed), 0);
  return `<div class="gr-topbar clm-topbar"><h1>Tiền mặt · kỳ ${rsState.period}</h1></div>
    <div class="gr-body">
      <div class="gr-card clm-cash-summary"><small>Còn giữ, phải bàn giao về công ty</small><div class="gr-amount">${formatMoney(held)}</div><p class="muted">Đã thu tiền mặt ${formatMoney(rsSum(paidCash))} (${paidCash.length} hộ) · đã bàn giao ${formatMoney(rsSum(handed))}. Chuyển khoản vào thẳng tài khoản công ty, không tính ở đây.</p></div>
      <div class="gr-card"><h3>Hộ đã thu tiền mặt</h3>${paidCash.length ? paidCash.map(r => `<div class="gr-row" data-clm="receipt" data-id="${r.charge}"><span class="gr-ico solid">${icon("cash")}</span><div><strong>${escapeHtml(r.name)}</strong><small>${r.confirmedAt} · ${r.receipt}</small></div><b class="clm-row-amount">${formatMoney(r.amount)}</b></div>`).join("") : '<p class="muted">Chưa thu tiền mặt hộ nào trong kỳ.</p>'}</div>
      <div class="gr-card"><h3>Đã bàn giao công ty</h3>${handed.length ? handed.map(h => `<div class="gr-row"><span class="gr-ico">${icon("check")}</span><div><strong>${h.id}</strong><small>${h.date} · ${escapeHtml(h.note)}</small></div><b class="clm-row-amount">${formatMoney(h.amount)}</b></div>`).join("") : '<p class="muted">Chưa có lần bàn giao nào trong kỳ.</p>'}</div>
      ${held ? clmBtn(`Xin xác nhận bàn giao ${formatMoney(held)}`, "handover", "", "", "send") : ""}
    </div>`;
}

function clmAccountScreen() {
  const rows = [["user", "Họ tên", RS_ME.name], ["shield", "Tài khoản", RS_ME.username], ["building", "Công ty", RS_COMPANY.name], ["map", "Khu vực phụ trách", RS_ME.area], ["phone", "Điện thoại", RS_ME.phone], ["calendar", "Kỳ đang thu", `Tháng ${rsState.period}`]];
  return `<div class="gr-topbar clm-topbar"><h1>Tài khoản</h1></div>
    <div class="gr-body">
      <div class="gr-card clm-profile"><span class="gr-avatar lg">${RS_ME.name.split(" ").slice(-2).map(w => w[0]).join("")}</span><h3>${escapeHtml(RS_ME.name)}</h3><p class="muted">Người đi thu · ${escapeHtml(RS_COMPANY.name)}</p></div>
      <div class="gr-card">${rows.map(([ic, l, v]) => `<div class="gr-row static"><span class="gr-ico">${icon(ic)}</span><div><small>${l}</small><strong>${escapeHtml(v)}</strong></div></div>`).join("")}</div>
      <div class="gr-card">
        <div class="gr-row" data-clm="notice" data-msg="Đã đồng bộ dữ liệu offline lên máy chủ."><span class="gr-ico solid">${icon("refresh")}</span><div><strong>Đồng bộ dữ liệu</strong><small>Lần cuối ${rsToday} 08:30 · hoạt động cả khi mất mạng</small></div>${icon("chevron", "gr-chev")}</div>
        <div class="gr-row" data-clm="notice" data-msg="Mở màn hình đổi mật khẩu (mô phỏng)."><span class="gr-ico solid">${icon("lock")}</span><div><strong>Đổi mật khẩu</strong></div>${icon("chevron", "gr-chev")}</div>
        <div class="gr-row" data-clm="notice" data-msg="Tổng đài hỗ trợ 1900 xxxx (mô phỏng)."><span class="gr-ico solid">${icon("headset")}</span><div><strong>Hỗ trợ</strong></div>${icon("chevron", "gr-chev")}</div>
      </div>
      ${clmBtn("Đăng xuất", "notice", "", "ghost")}
    </div>`;
}

// ---------- Biên lai trong máy ----------
function clmReceiptScreen(charge) {
  const r = clmRow(charge);
  if (!r || !r.receipt) return clmListScreen();
  return `<div class="gr-topbar clm-topbar"><button type="button" class="gr-back" data-clm="back">${icon("arrowLeft")}</button><h1>Biên lai ${r.receipt}</h1></div>
    <div class="gr-body">
      <div class="gr-success"><span class="gr-check">${icon("check")}</span><strong>Đã thu ${formatMoney(r.amount)}</strong><p class="muted">${r.method} · ${r.confirmedAt} · biên lai điện tử đã gửi hộ</p></div>
      <div class="gr-card">
        <h3>${escapeHtml(RS_COMPANY.name)}</h3><p class="muted">Thu hộ theo phiếu yêu cầu thu ${r.request} của UBND xã Đông Thạnh</p>
        <div class="gr-line"><span>Người nộp</span><strong>${escapeHtml(r.name)}</strong></div>
        <div class="gr-line"><span>Mã KH</span><strong>${r.code}</strong></div>
        <div class="gr-line"><span>Địa chỉ</span><strong>${escapeHtml(r.address)}</strong></div>
        <div class="gr-line"><span>Khoản thu</span><strong>${r.charge}</strong></div>
        <div class="gr-line"><span>Kỳ</span><strong>${r.period}</strong></div>
        <div class="gr-line"><span>Hình thức</span><strong>${r.method}</strong></div>
        <div class="gr-line"><span>Số tiền</span><strong>${formatMoney(r.amount)}</strong></div>
        <div class="gr-line"><span>Người thu</span><strong>${escapeHtml(rsCollector(r.confirmedBy)?.name || "")}</strong></div>
      </div>
      ${clmBtn("Gửi lại biên lai qua Zalo/SMS", "resend", r.charge, "", "send")}
      <div class="stack-gap"></div>
      ${clmBtn("Về danh sách hộ", "back", "", "ghost")}
    </div>`;
}

// ---------- Bảng cập nhật kết quả (bottom sheet) ----------
function clmSheet(charge) {
  const r = clmRow(charge);
  if (!r) return "";
  return `<div class="clm-sheet-backdrop" data-clm="closeSheet"><form class="clm-sheet" id="clmSheetForm" data-clm-form>
      <span class="clm-sheet-handle"></span>
      <h3>Cập nhật kết quả</h3>
      <p class="muted">${escapeHtml(r.name)} · ${escapeHtml(r.address)} · <b>${formatMoney(r.amount)}</b></p>
      <input type="hidden" id="rsClCharge" value="${r.charge}"><input type="hidden" id="rsClResult" value="cash">
      <div class="clm-result-grid">${CLM_RESULTS.map(([v, l, ic], i) => `<button type="button" class="clm-result-btn${i === 0 ? " active" : ""}" data-clm-result="${v}">${icon(ic)}<span>${l}</span></button>`).join("")}</div>
      <label class="gr-field" id="clmAmountField"><span>Số tiền thực thu <i>*</i></span><input class="gr-input" id="rsClAmount" type="number" min="0" step="1000" value="${r.amount}"></label>
      <label class="gr-field" id="clmNextField" hidden><span>Ngày quay lại / hẹn</span><input class="gr-input" id="rsClNext" type="date"></label>
      <label class="gr-field"><span>Ghi chú</span><input class="gr-input" id="rsClNote" type="text" placeholder="Ví dụ: hẹn sau 18:00, để giấy báo..."></label>
      <p class="gr-tip" id="clmSheetTip"><strong>Đã thu:</strong> hệ thống xuất biên lai điện tử và gửi cho hộ ngay, không nhập số biên lai.</p>
      <div class="clm-sheet-actions">${clmBtn("Hủy", "closeSheet", "", "ghost")}<button type="submit" class="gr-btn">Lưu kết quả</button></div>
    </form></div>`;
}

function clmSheetResult(value) {
  const paid = value === "cash" || value === "transfer";
  document.getElementById("rsClResult").value = value;
  document.querySelectorAll("[data-clm-result]").forEach(b => b.classList.toggle("active", b.dataset.clmResult === value));
  document.getElementById("clmAmountField").hidden = !paid;
  document.getElementById("clmNextField").hidden = paid || value === "refused";
  const tip = document.getElementById("clmSheetTip");
  tip.innerHTML = paid ? "<strong>Đã thu:</strong> hệ thống xuất biên lai điện tử và gửi cho hộ ngay, không nhập số biên lai."
    : value === "refused" ? "<strong>Từ chối nộp:</strong> ghi rõ lý do; công ty và xã sẽ thấy để xử lý."
    : "<strong>Chưa thu:</strong> hộ giữ trạng thái chưa thu, ghi ngày quay lại để nhắc lịch.";
}

// ---------- Lịch sử nộp các kỳ của một hộ (bottom sheet) ----------
function clmHistorySheet(charge) {
  const r = clmRow(charge);
  if (!r) return "";
  const rows = clmMine().filter(x => x.code === r.code).sort((a, b) => b.iso.localeCompare(a.iso));
  return `<div class="clm-sheet-backdrop" data-clm="closeSheet"><div class="clm-sheet">
      <span class="clm-sheet-handle"></span>
      <h3>Lịch sử nộp các kỳ</h3>
      <p class="muted">${escapeHtml(r.name)} · ${r.code}</p>
      <div class="clm-history">${rows.map(x => { const [label, tone] = RS_STATUS[x.status]; return `<div class="clm-history-row"><div><strong>Kỳ ${x.period}</strong><small>${x.status === "paid" ? `${x.method} · ${x.confirmedAt} · ${x.receipt}` : `hạn ${x.dueDate}`}</small></div><b>${formatMoney(x.amount)}</b>${badge(label, tone)}</div>`; }).join("")}</div>
      <div class="clm-sheet-actions">${clmBtn("Đóng", "closeSheet", "", "ghost")}</div>
    </div></div>`;
}

// ---------- Ghép màn hình ----------
function rsCollectorList() {
  const screen = clmState.receipt ? clmReceiptScreen(clmState.receipt) : clmState.tab === "cash" ? clmCashScreen() : clmState.tab === "account" ? clmAccountScreen() : clmListScreen();
  const tabs = [["list", "Hộ đi thu", "clipboard"], ["cash", "Tiền mặt", "wallet"], ["account", "Tài khoản", "user"]];
  const open = clmCurrent().filter(r => r.status !== "paid").length;
  return `<div class="clm-stage">
    <div class="phone-frame clm-frame"><div class="phone-screen">
      <div class="phone-notch" aria-hidden="true"></div>
      <div class="phone-statusbar"><span>05:23</span><span>▮▮▮ ▯</span></div>
      <main class="phone-content clm-content">${screen}</main>
      <nav class="phone-tabbar">${tabs.map(([id, label, ic]) => `<button type="button" class="phone-tab-item${clmState.tab === id && !clmState.receipt ? " active" : ""}" data-clm="tab" data-tab="${id}"><span class="phone-tab-icon">${icon(ic)}</span>${label}${id === "list" && open ? `<b class="dot">${open}</b>` : ""}</button>`).join("")}</nav>
      ${clmState.sheet ? clmSheet(clmState.sheet) : clmState.history ? clmHistorySheet(clmState.history) : ""}
    </div></div>
    <aside class="clm-side">
      <h2>Ứng dụng người đi thu</h2>
      <p>Web app responsive dùng trên điện thoại: mở trong trình duyệt hoặc cài lên màn hình chính. Thu nhỏ cửa sổ dưới 600px để xem ở chế độ toàn màn hình.</p>
      <ul>
        <li>Danh sách hộ theo phiếu yêu cầu thu của xã, lọc theo kỳ, đường, trạng thái.</li>
        <li>Mỗi thẻ hộ: cập nhật kết quả, gọi điện, lịch sử nộp các kỳ, báo sai thông tin / chuyển đi.</li>
        <li>Đã thu → biên lai điện tử xuất ngay, gửi hộ qua Zalo/SMS.</li>
        <li>Tab Tiền mặt: số tiền đang giữ phải bàn giao về công ty.</li>
      </ul>
      <p class="muted">${escapeHtml(RS_ME.name)} · ${escapeHtml(RS_COMPANY.name)} · ${RS_ME.area} · hôm nay ${rsToday}</p>
    </aside>
  </div>`;
}
VIEW_RENDERERS.rsCollectorList = rsCollectorList;

// Lọc trong máy (tìm kiếm, chip trạng thái, đường) không dựng lại DOM để giữ con trỏ nhập.
function clmApplyFilters() {
  const q = (document.getElementById("clmSearch")?.value || "").trim().toLowerCase();
  const chip = document.querySelector(".clm-chip.active")?.dataset.clmChip || "all";
  const street = document.getElementById("clmStreet")?.value || "all";
  let visible = 0;
  document.querySelectorAll("[data-clm-card]").forEach(card => {
    const ok = (!q || card.dataset.search.includes(q)) && (chip === "all" || card.dataset.status === chip) && (street === "all" || card.dataset.street === street);
    card.hidden = !ok;
    if (ok) visible++;
  });
  const empty = document.querySelector("[data-clm-empty]");
  if (empty) empty.hidden = visible !== 0;
}

function clmRender() { renderCurrentView({ keepFocus: true }); }

document.addEventListener("click", event => {
  if (currentRole !== "collector") return;
  const chip = event.target.closest("[data-clm-chip]");
  if (chip) { document.querySelectorAll(".clm-chip").forEach(c => c.classList.toggle("active", c === chip)); clmApplyFilters(); return; }
  const result = event.target.closest("[data-clm-result]");
  if (result) { clmSheetResult(result.dataset.clmResult); return; }
  const el = event.target.closest("[data-clm]");
  if (!el) return;
  if (el.dataset.clm === "closeSheet" && el !== event.target && !el.matches(".gr-btn")) return; // bấm trong sheet không đóng
  const { clm: action, id } = el.dataset;
  const r = id ? clmRow(id) : null;
  const actions = {
    tab() { Object.assign(clmState, { tab: el.dataset.tab, receipt: null, menu: null }); clmRender(); },
    stats() { clmState.statsOpen = !clmState.statsOpen; clmRender(); },
    update() { clmState.sheet = id; clmState.menu = null; clmRender(); setTimeout(() => document.getElementById("rsClAmount")?.focus(), 50); },
    closeSheet() { clmState.sheet = null; clmState.history = null; clmRender(); },
    receipt() { clmState.receipt = id; clmState.menu = null; clmRender(); },
    back() { clmState.receipt = null; clmRender(); },
    menu() { clmState.menu = clmState.menu === id ? null : id; clmRender(); },
    call() { showDemoNotice(`Gọi ${r?.name} · ${r?.phone} (mô phỏng mở ứng dụng điện thoại).`); },
    map() { showDemoNotice(`Mở bản đồ chỉ đường tới ${r?.address}, ${r?.area} (mô phỏng).`); },
    resend() { showDemoNotice(RS_SUBMIT.clReceipt(id)); },
    qr() { showDemoNotice(`Hiện mã QR chuyển khoản ${formatMoney(r?.amount || 0)} · nội dung ${id} (mô phỏng).`); },
    history() { clmState.history = id; clmRender(); },
    moved() {
      clmState.menu = null;
      // Báo về công ty và xã qua trung tâm thông báo.
      const note = { kind: "info", title: `Người đi thu báo hộ ${r?.name} (${r?.code}) sai thông tin / chuyển đi`, body: `${RS_ME.name} · ${r?.address}, ${r?.area}` };
      pushNotification({ ...note, roles: ["company"], companyId: RS_COMPANY.id, link: { role: "company", screen: "assigned", companyId: RS_COMPANY.id, label: "Hộ được giao" } });
      pushNotification({ ...note, roles: ["commune"], link: { role: "commune", screen: "subjects", label: "Đối tượng & hợp đồng" } });
      showDemoNotice(`Đã gửi báo cáo hộ ${r?.name} chuyển đi / sai thông tin về công ty và xã.`);
      clmRender();
    },
    handover() { showDemoNotice("Đã gửi yêu cầu xác nhận bàn giao tiền mặt tới công ty."); },
    notice() { showDemoNotice(el.dataset.msg || "Đã đăng xuất (mô phỏng)."); }
  };
  if (actions[action]) actions[action]();
});

document.addEventListener("submit", event => {
  if (currentRole !== "collector" || !event.target.matches("[data-clm-form]")) return;
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  const charge = csFormValue("rsClCharge");
  const message = RS_SUBMIT.clUpdate();
  rsState.afterSubmit = null;
  const r = clmRow(charge);
  Object.assign(clmState, { sheet: null, receipt: r?.status === "paid" ? charge : null });
  renderCurrentView();
  if (message) showDemoNotice(message);
});

document.addEventListener("input", event => {
  if (currentRole !== "collector") return;
  if (event.target.id === "clmSearch") clmApplyFilters();
});

document.addEventListener("change", event => {
  if (currentRole !== "collector") return;
  if (event.target.id === "clmStreet") { clmApplyFilters(); return; }
});
