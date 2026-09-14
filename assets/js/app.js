"use strict";

let currentRole = "commune";
let currentScreen = "dashboard";
let toastTimer = null;
let activeDialogAction = null;

function getRouteFromHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [roleId, screenId] = raw.split("/");
  const role = ROLE_CONFIG[roleId];
  if (!role) return { roleId: "commune", screenId: ROLE_CONFIG.commune.defaultScreen };
  const allowed = role.screens.some(screen => screen.id === screenId);
  return { roleId, screenId: allowed ? screenId : role.defaultScreen };
}

function updateHash(roleId, screenId, replace = false) {
  const hash = `#${roleId}/${screenId}`;
  if (window.location.hash === hash) {
    renderApp();
    return;
  }
  if (replace) history.replaceState(null, "", hash);
  else window.location.hash = hash;
  if (replace) renderApp();
}

function selectRole(roleId) {
  const role = ROLE_CONFIG[roleId];
  if (!role) {
    showDemoNotice("Vai trò không tồn tại trong phạm vi prototype.");
    return false;
  }
  updateHash(roleId, role.defaultScreen);
  return true;
}

function showScreen(screenId) {
  const role = ROLE_CONFIG[currentRole];
  const allowed = role && role.screens.some(screen => screen.id === screenId);
  if (!allowed) {
    showDemoNotice("Không có quyền truy cập chức năng này trong vai trò hiện tại.");
    return false;
  }
  updateHash(currentRole, screenId);
  return true;
}

function renderRoleOptions() {
  const select = document.getElementById("roleSelect");
  select.innerHTML = ROLE_ORDER.map(id => `<option value="${id}">${ROLE_CONFIG[id].label}</option>`).join("");
  select.value = currentRole;
}

function renderNavigation() {
  const role = ROLE_CONFIG[currentRole];
  const currentConfig = role.screens.find(screen => screen.id === currentScreen);
  document.getElementById("roleName").textContent = role.label;
  document.getElementById("roleDescription").textContent = role.description;
  document.getElementById("avatarInitials").textContent = role.initials;
  let group = "";
  const html = [];
  role.screens.forEach(screen => {
    if (screen.hiddenInNav) return;
    if (screen.group !== group) {
      group = screen.group;
      html.push(`<div class="nav-group-label">${group}</div>`);
    }
    const active = screen.id === currentScreen || currentConfig?.parentScreen === screen.id;
    html.push(`<button type="button" class="nav-item ${active ? "active" : ""}" data-screen="${screen.id}" ${active ? 'aria-current="page"' : ""}>
      <span class="nav-icon" aria-hidden="true">${screen.icon}</span>
      <span class="nav-copy"><strong>${screen.label}</strong><small>${screen.caption}</small></span>
      ${screen.count ? `<span class="nav-count">${screen.count}</span>` : ""}
    </button>`);
  });
  document.getElementById("roleNav").innerHTML = html.join("");
}

function renderCurrentView() {
  const screen = SCREEN_INDEX[`${currentRole}:${currentScreen}`];
  const renderer = screen && VIEW_RENDERERS[screen.view];
  if (!renderer) {
    document.getElementById("mainContent").innerHTML = pageHeader("Không tìm thấy", "Màn hình chưa sẵn sàng", "Không có bộ dựng giao diện cho chức năng này.");
    return;
  }
  document.title = `${screen.label} · Hệ thống thu giá CTRSH`;
  document.getElementById("mainContent").innerHTML = renderer();
  document.getElementById("mainContent").focus({ preventScroll: true });
}

function renderApp() {
  const route = getRouteFromHash();
  currentRole = route.roleId;
  currentScreen = route.screenId;
  const canonical = `#${currentRole}/${currentScreen}`;
  if (window.location.hash !== canonical) history.replaceState(null, "", canonical);
  renderRoleOptions();
  renderNavigation();
  renderCurrentView();
  closeSidebar();
}

function openDemoModal(actionId) {
  const spec = DIALOG_SPECS[actionId];
  if (!spec) {
    showDemoNotice(actionId === "applyFilter" ? "Đã áp dụng bộ lọc minh họa." : "Chức năng đang được mô phỏng, không phát sinh thay đổi dữ liệu.");
    return false;
  }
  activeDialogAction = actionId;
  document.getElementById("dialogEyebrow").textContent = spec.eyebrow || "Biểu mẫu nghiệp vụ";
  document.getElementById("dialogTitle").textContent = spec.title;
  document.getElementById("dialogDescription").textContent = spec.description || "";
  document.getElementById("dialogBody").innerHTML = renderDialogContent(spec);
  document.getElementById("dialogConfirm").textContent = spec.confirm || "Xác nhận mô phỏng";
  const dialog = document.getElementById("appDialog");
  if (!dialog.open) dialog.showModal();
  if (spec.content === "qr") renderQrPattern();
  const firstInput = dialog.querySelector("input:not([readonly]), select, textarea:not([readonly])");
  if (firstInput) setTimeout(() => firstInput.focus(), 50);
  return true;
}

function closeDemoModal() {
  const dialog = document.getElementById("appDialog");
  if (dialog.open) dialog.close();
  activeDialogAction = null;
}

function showDemoNotice(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function renderQrPattern() {
  const host = document.getElementById("dialogBody");
  const pattern = [
    "1111111010111", "1000001011101", "1011101010101", "1011101001111", "1011101010001", "1000001011111", "1111111010101",
    "0001000101010", "1110111110111", "1011000101001", "1110111111101", "1000100010110", "1111101111101"
  ];
  host.innerHTML = `<div class="qr-card"><div class="qr-visual"><div class="qr-grid">${pattern.join("").split("").map(v => `<i class="${v === "1" ? "on" : ""}"></i>`).join("")}</div></div><div class="qr-details"><span class="eyebrow">Khoản DTH-0926-H000128 · QR-DTH-T07-v3</span><strong class="qr-amount">80.000đ</strong><div><span class="muted">Nội dung chuyển khoản</span><div class="code-box">DTH0926H000128</div></div><p class="muted">Tài khoản nhận chính thức đang ở trạng thái cấu hình thí điểm. Người đi thu chỉ hiển thị/cập nhật phiên bản QR, không tự thay chủ tài khoản. Không sửa nội dung chuyển khoản.</p></div></div>`;
}

function handleAction(action, target) {
  if (!action) return;
  if (action.startsWith("go:")) {
    showScreen(action.slice(3));
    return;
  }
  const simpleNotices = {
    downloadTemplate: "Đã mô phỏng tải tệp mẫu import.",
    mapPreview: "Bản đồ tuyến thuộc lớp trực quan hóa; prototype không gọi dịch vụ bản đồ.",
    exportData: "Đã mô phỏng tạo tệp xuất dữ liệu.",
    callContact: "Đã mô phỏng mở cuộc gọi tới số điện thoại được che.",
    openDirections: "Đã mô phỏng mở chỉ đường tới hộ tiếp theo trên ứng dụng bản đồ.",
    printList: "Đã mô phỏng gửi danh sách tới máy in.",
    rerunMatch: "Đã mô phỏng chạy lại bộ khớp giao dịch.",
    policyPreview: "Đã mở mô phỏng quy chế phê duyệt và hạn mức.",
    permissionAudit: "Không phát hiện quyền tự đề nghị–tự duyệt trong cấu hình mẫu.",
    applyFilter: "Đã áp dụng bộ lọc minh họa."
  };
  if (simpleNotices[action]) {
    showDemoNotice(simpleNotices[action]);
    return;
  }
  openDemoModal(action);
}

function applyCollectorListFilters(container) {
  if (!container) return;
  const query = (container.querySelector("[data-list-search]")?.value || "").trim().toLowerCase();
  const status = container.querySelector("[data-list-status]")?.value || "all";
  const cards = [...container.querySelectorAll("[data-collection-card]")];
  let visible = 0;
  cards.forEach(card => {
    const matchesText = !query || (card.dataset.search || "").includes(query);
    const matchesStatus = status === "all" || card.dataset.category === status;
    card.hidden = !(matchesText && matchesStatus);
    if (!card.hidden) visible++;
  });
  const count = container.querySelector("[data-list-count]");
  if (count) count.textContent = `${visible} hộ phù hợp`;
  const empty = container.querySelector("[data-list-empty]");
  if (empty) empty.hidden = visible !== 0;
}

function setCollectorStatusFilter(button) {
  const container = button.closest("[data-collector-list]");
  if (!container) return;
  const value = button.dataset.listFilterStatus || "all";
  container.querySelectorAll("[data-list-filter-status]").forEach(item => item.classList.toggle("active", item === button));
  const select = container.querySelector("[data-list-status]");
  if (select) select.value = value;
  applyCollectorListFilters(container);
}

function applyRouteListFilters() {
  const container = document.querySelector("[data-route-list]");
  if (!container) return;
  const query = (container.querySelector("[data-route-search]")?.value || "").trim().toLowerCase();
  const contractor = container.querySelector("[data-route-contractor]")?.value || "all";
  const routeType = container.querySelector("[data-route-type-filter]")?.value || "all";
  const status = container.querySelector("[data-route-status]")?.value || "all";
  const activeArea = document.querySelector("[data-route-area-filter].active")?.dataset.routeAreaFilter || "all";
  const rows = [...container.querySelectorAll("[data-route-row]")];
  let visible = 0;
  rows.forEach(row => {
    const matchesText = !query || (row.dataset.search || "").includes(query);
    const matchesContractor = contractor === "all" || row.dataset.contractor === contractor;
    const matchesRouteType = routeType === "all" || row.dataset.routeType === routeType;
    const matchesStatus = status === "all" || row.dataset.status === status;
    const matchesArea = activeArea === "all" || row.dataset.area === activeArea;
    row.hidden = !(matchesText && matchesContractor && matchesRouteType && matchesStatus && matchesArea);
    if (!row.hidden) visible++;
  });
  const count = container.querySelector("[data-route-count]");
  if (count) count.textContent = `${visible} tuyến phù hợp`;
  const empty = container.querySelector("[data-route-empty]");
  if (empty) empty.hidden = visible !== 0;
}

function openSidebar() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebarBackdrop").classList.add("show");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("show");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
}

function bindAppEvents() {
  document.getElementById("roleSelect").addEventListener("change", event => selectRole(event.target.value));
  document.getElementById("roleNav").addEventListener("click", event => {
    const button = event.target.closest("[data-screen]");
    if (button) showScreen(button.dataset.screen);
  });
  document.getElementById("mainContent").addEventListener("click", event => {
    const areaFilter = event.target.closest("[data-route-area-filter]");
    if (areaFilter) {
      document.querySelectorAll("[data-route-area-filter]").forEach(item => item.classList.toggle("active", item === areaFilter));
      applyRouteListFilters();
      return;
    }
    const collectorStatus = event.target.closest("[data-list-filter-status]");
    if (collectorStatus) {
      setCollectorStatusFilter(collectorStatus);
      return;
    }
    const filter = event.target.closest("[data-filter]");
    if (filter) {
      filter.parentElement.querySelectorAll("button").forEach(button => button.classList.toggle("active", button === filter));
      showDemoNotice(`Đang hiển thị nhóm “${filter.textContent.trim()}”.`);
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) handleAction(action.dataset.action, action);
  });
  document.getElementById("mainContent").addEventListener("input", event => {
    if (event.target.matches("[data-list-search]")) applyCollectorListFilters(event.target.closest("[data-collector-list]"));
    if (event.target.matches("[data-route-search]")) applyRouteListFilters();
  });
  document.getElementById("mainContent").addEventListener("change", event => {
    if (event.target.matches("[data-route-contractor], [data-route-type-filter], [data-route-status]")) {
      applyRouteListFilters();
      return;
    }
    if (!event.target.matches("[data-list-status]")) return;
    const container = event.target.closest("[data-collector-list]");
    container.querySelectorAll("[data-list-filter-status]").forEach(item => item.classList.toggle("active", item.dataset.listFilterStatus === event.target.value));
    applyCollectorListFilters(container);
  });
  document.querySelector(".top-actions").addEventListener("click", event => {
    const action = event.target.closest("[data-action]");
    if (action) handleAction(action.dataset.action, action);
  });
  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", closeDemoModal));
  document.getElementById("appDialog").addEventListener("click", event => {
    if (event.target === event.currentTarget) closeDemoModal();
  });
  document.getElementById("dialogForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const spec = DIALOG_SPECS[activeDialogAction] || {};
    closeDemoModal();
    showDemoNotice(`${spec.confirm || "Thao tác"} thành công ở chế độ mô phỏng; dữ liệu không được lưu.`);
  });
  document.getElementById("menuToggle").addEventListener("click", () => {
    if (document.getElementById("sidebar").classList.contains("open")) closeSidebar(); else openSidebar();
  });
  document.getElementById("sidebarBackdrop").addEventListener("click", closeSidebar);
  window.addEventListener("hashchange", renderApp);
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSidebar();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindAppEvents();
  renderApp();
});
