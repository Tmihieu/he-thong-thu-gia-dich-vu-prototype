"use strict";

// Trung tâm thông báo trong web: mỗi thông báo gắn với vai trò nhận (xã / công ty / người đi thu) và công ty cụ thể nếu có.
// Phát sinh từ nghiệp vụ: xã nhắc nộp → công ty; khiếu nại mới / chuyển xử lý / phản hồi → xã và công ty; phiếu thu, báo sai sót.
// Dữ liệu giữ trong phiên xem; tải lại trang sẽ khôi phục.

const APP_NOTIFICATIONS = [];
let notifSeq = 1;
const NOTIF_KINDS = {
  reminder: { icon: "coins", tone: "danger" },
  complaint: { icon: "message", tone: "warning" },
  receipt: { icon: "receipt", tone: "success" },
  info: { icon: "bell", tone: "" }
};
const notifNow = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} · ${csIsoToVi(CS_TODAY)}`; };

function pushNotification({ roles, companyId = null, kind = "info", title, body = "", link = null, time = null, read = false }) {
  APP_NOTIFICATIONS.unshift({ id: `TB-${String(notifSeq++).padStart(4, "0")}`, roles, companyId, kind, title, body, link, time: time || notifNow(), read });
  if (typeof currentRole !== "undefined") renderNotificationBadge();
}
// Thông báo dành cho vai trò đang xem; vai Công ty / Người đi thu chỉ thấy thông báo của công ty đang đóng vai.
function notificationsFor(role) {
  const companyId = typeof rsCurrentCompanyId !== "undefined" ? rsCurrentCompanyId : null;
  return APP_NOTIFICATIONS.filter(n => n.roles.includes(role) && (!n.companyId || role === "commune" || n.companyId === companyId));
}

function renderNotificationBadge() {
  const button = document.querySelector('[data-action="notifications"]');
  if (!button) return;
  const unread = notificationsFor(currentRole).filter(n => !n.read).length;
  button.innerHTML = `${icon("bell")}<b ${unread ? "" : "hidden"}>${unread}</b>`;
  button.setAttribute("aria-label", unread ? `Có ${unread} thông báo chưa đọc` : "Không có thông báo mới");
  button.title = button.getAttribute("aria-label");
}

function openNotificationCenter() {
  const list = notificationsFor(currentRole);
  const unread = list.filter(n => !n.read).length;
  DIALOG_SPECS.notifications = {
    eyebrow: ROLE_CONFIG[currentRole]?.label || "Thông báo", title: "Thông báo", content: "notifications",
    description: unread ? `${unread} chưa đọc · ${list.length} thông báo` : list.length ? `Đã đọc hết ${list.length} thông báo` : "Chưa có thông báo nào.",
    confirm: unread ? "Đánh dấu tất cả đã đọc" : ""
  };
  openDemoModal("notifications");
  const host = document.getElementById("dialogBody");
  host.innerHTML = list.length ? `<div class="alert-list notif-list">${list.map(n => {
    const meta = NOTIF_KINDS[n.kind] || NOTIF_KINDS.info;
    return `<article class="alert-item notif-item ${meta.tone} ${n.read ? "" : "unread"}" data-notif-open="${n.id}" role="button" tabindex="0">
      <span class="alert-icon">${icon(meta.icon)}</span>
      <div><h4>${escapeHtml(n.title)}<small>${escapeHtml(n.time)}</small></h4>${n.body ? `<p>${escapeHtml(n.body)}</p>` : ""}${n.link ? `<span class="notif-link">Mở ${escapeHtml(n.link.label || "chi tiết")} →</span>` : ""}</div>
    </article>`;
  }).join("")}</div>` : '<div class="empty-state"><strong>Chưa có thông báo</strong><p>Nhắc nộp, khiếu nại và phiếu thu liên quan sẽ hiện ở đây.</p></div>';
  document.getElementById("dialogConfirm").hidden = !unread;
}

function markAllNotificationsRead() {
  notificationsFor(currentRole).forEach(n => { n.read = true; });
  renderNotificationBadge();
  closeDemoModal();
  showDemoNotice("Đã đánh dấu tất cả thông báo là đã đọc.");
  return true;
}

document.addEventListener("click", event => {
  const item = event.target.closest("[data-notif-open]");
  if (!item) return;
  const n = APP_NOTIFICATIONS.find(x => x.id === item.dataset.notifOpen);
  if (!n) return;
  n.read = true;
  renderNotificationBadge();
  if (!n.link) { item.classList.remove("unread"); return; }
  closeDemoModal();
  if (n.link.companyId && typeof rsSetCompany === "function" && n.link.role !== "commune") rsSetCompany(n.link.companyId);
  if (n.link.role && n.link.role !== currentRole) { window.location.hash = `#${n.link.role}/${n.link.screen}`; return; }
  showScreen(n.link.screen);
});

// ---------- Dữ liệu mẫu: dựng từ khiếu nại và phiếu thu đã có ----------
(function seedNotifications() {
  const companyLink = (companyId, screen, label) => ({ role: "company", screen, companyId, label });
  const communeLink = (screen, label) => ({ role: "commune", screen, label });
  [...CS_COMPLAINTS].reverse().forEach(c => {
    // Khiếu nại đã chuyển thì báo cho công ty được chuyển, còn lại báo công ty phụ trách khu vực.
    const company = csUnit(c.forwardedTo) || csCompanyOf(c.area);
    const done = c.status === "done";
    pushNotification({ roles: ["commune"], kind: "complaint", title: `Khiếu nại mới ${c.id} · ${c.name}`, body: c.content, link: communeLink("complaints", "Danh sách khiếu nại"), time: `08:30 · ${c.date}`, read: c.status !== "new" });
    if (company) pushNotification({ roles: ["company"], companyId: company.id, kind: "complaint", title: c.forwardedTo ? `Xã chuyển khiếu nại ${c.id} · hạn ${c.deadline || "3 ngày"}` : `Khiếu nại ${c.id} trong khu vực công ty`, body: c.content, link: companyLink(company.id, "complaints", "Giải quyết khiếu nại"), time: `09:00 · ${c.date}`, read: done });
    if (c.reply) pushNotification({ roles: ["commune"], kind: "complaint", title: `${company?.name || "Công ty"} phản hồi ${c.id}`, body: c.result, link: communeLink("complaints", "Danh sách khiếu nại"), time: `16:10 · ${c.reply.date}`, read: done });
  });
  CS_COMPANY_RECEIPTS.filter(r => r.period === "2026-09").forEach(r => pushNotification({ roles: ["company"], companyId: r.companyId, kind: "receipt", title: `Xã đã lập phiếu thu ${r.id} · ${formatMoney(r.amount)}`, body: `${r.method} · ${r.note}`, link: companyLink(r.companyId, "assigned", "Hộ được giao"), time: `10:20 · ${r.date}` }));
})();
