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

  const compPicker = document.getElementById("companyPicker");
  const compSelect = document.getElementById("companySelect");
  if (compPicker && compSelect) {
    if (currentRole === "company" && typeof MANAGEMENT_UNITS !== "undefined") {
      compPicker.style.display = "grid";
      compSelect.innerHTML = MANAGEMENT_UNITS.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join("");
      compSelect.value = typeof rsCurrentCompanyId !== "undefined" ? rsCurrentCompanyId : (typeof RS_COMPANY !== "undefined" ? RS_COMPANY.id : MANAGEMENT_UNITS[0].id);
    } else {
      compPicker.style.display = "none";
    }
  }
}

function renderNavigation() {
  const role = ROLE_CONFIG[currentRole];
  const currentConfig = role.screens.find(screen => screen.id === currentScreen);
  document.getElementById("roleName").textContent = role.label;
  document.getElementById("roleDescription").textContent = role.description;
  document.getElementById("avatarInitials").textContent = role.initials;

  const roleCard = document.querySelector(".role-card");
  const existingSwitch = document.getElementById("sidebarCompanySwitch");
  if (currentRole === "company" && typeof MANAGEMENT_UNITS !== "undefined" && roleCard) {
    const activeCompId = typeof rsCurrentCompanyId !== "undefined" ? rsCurrentCompanyId : (typeof RS_COMPANY !== "undefined" ? RS_COMPANY.id : MANAGEMENT_UNITS[0].id);
    if (!existingSwitch) {
      const switchDiv = document.createElement("div");
      switchDiv.id = "sidebarCompanySwitch";
      switchDiv.style.marginTop = "8px";
      switchDiv.style.paddingTop = "8px";
      switchDiv.style.borderTop = "1px solid rgba(255,255,255,.15)";
      switchDiv.innerHTML = `
        <label style="font-size:11px;color:var(--navy-200,rgba(255,255,255,.7));display:block;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">Đổi công ty đang đóng vai:</label>
        <select class="control" style="font-size:12px;padding:4px 8px;height:32px;width:100%;border-radius:4px;background:#fff;color:#111;font-weight:600;">
          ${MANAGEMENT_UNITS.map(u => `<option value="${u.id}" ${u.id === activeCompId ? "selected" : ""}>${escapeHtml(u.name)}</option>`).join("")}
        </select>
      `;
      switchDiv.querySelector("select").addEventListener("change", e => {
        if (typeof rsSetCompany === "function") {
          rsSetCompany(e.target.value);
          renderApp();
          showDemoNotice(`Đã chuyển actor sang ${RS_COMPANY.name}`);
        }
      });
      roleCard.appendChild(switchDiv);
    } else {
      const sel = existingSwitch.querySelector("select");
      if (sel) sel.value = activeCompId;
    }
  } else if (existingSwitch) {
    existingSwitch.remove();
  }

  let group = "";
  const html = [];
  role.screens.forEach(screen => {
    if (screen.hiddenInNav) return;
    if (screen.group !== group) {
      group = screen.group;
      if (group) html.push(`<div class="nav-group-label">${group}</div>`);
    }
    const active = screen.id === currentScreen || currentConfig?.parentScreen === screen.id;
    html.push(`<button type="button" class="nav-item ${active ? "active" : ""}" data-screen="${screen.id}" ${active ? 'aria-current="page"' : ""}>
      <span class="nav-icon">${icon(screen.icon)}</span>
      <span class="nav-copy"><strong>${screen.label}</strong><small>${screen.caption}</small></span>
      ${screen.count ? `<span class="nav-count">${screen.count}</span>` : ""}
    </button>`);
  });
  document.getElementById("roleNav").innerHTML = html.join("");
}

function renderCurrentView(options = {}) {
  const screen = SCREEN_INDEX[`${currentRole}:${currentScreen}`];
  const renderer = screen && VIEW_RENDERERS[screen.view];
  const main = document.getElementById("mainContent");
  if (!renderer) {
    main.innerHTML = pageHeader("Không tìm thấy", "Màn hình chưa sẵn sàng", "Không có bộ dựng giao diện cho chức năng này.");
    return;
  }
  document.title = `${screen.label} · Hệ thống thu giá CTRSH`;
  const restore = options.keepFocus && document.activeElement && main.contains(document.activeElement)
    ? { selector: focusSelector(document.activeElement), scrollY: window.scrollY }
    : null;
  main.innerHTML = renderer();
  main.querySelectorAll("[data-table-filter]").forEach(applyTableFilter);
  if (restore) {
    const target = restore.selector && main.querySelector(restore.selector);
    if (target) target.focus({ preventScroll: true });
    window.scrollTo(0, restore.scrollY);
    return;
  }
  main.focus({ preventScroll: true });
}

function focusSelector(el) {
  if (el.id) return `#${el.id}`;
  const attr = [...el.attributes].find(a => a.name.startsWith("data-") && a.name !== "data-id");
  return attr ? `[${attr.name}="${attr.value}"]` : null;
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
  document.getElementById("dialogConfirm").hidden = false;
  document.getElementById("dialogConfirm").disabled = false;
  const spec = DIALOG_SPECS[actionId];
  if (!spec) {
    showDemoNotice("Chức năng đang được mô phỏng, không phát sinh thay đổi dữ liệu.");
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
  if (action === "importData" && currentRole === "commune") { showScreen("data-quality"); return; }
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
    permissionAudit: "Không phát hiện quyền tự đề nghị–tự duyệt trong cấu hình mẫu."
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

function applyTableFilter(container) {
  if (!container) return;
  const query = (container.querySelector("[data-table-search]")?.value || "").trim().toLowerCase();
  const selects = [...container.querySelectorAll("[data-table-key]")];
  const activeChip = container.querySelector("[data-table-chip].active");
  const chipKey = container.dataset.chipKey || "group";
  const chipValue = activeChip ? activeChip.dataset.tableChip : "all";
  const rows = [...container.querySelectorAll("[data-row]")];
  const counts = {};
  let visible = 0;
  rows.forEach(row => {
    const matchesText = !query || (row.dataset.search || "").toLowerCase().includes(query);
    const matchesSelects = selects.every(select => select.value === "all" || row.dataset[select.dataset.tableKey] === select.value);
    const group = row.dataset[chipKey] || "";
    if (matchesText && matchesSelects) counts[group] = (counts[group] || 0) + 1;
    const matchesChip = chipValue === "all" || group === chipValue;
    row.hidden = !(matchesText && matchesSelects && matchesChip);
    if (!row.hidden) visible++;
  });
  container.querySelectorAll("[data-table-chip]").forEach(chip => {
    const b = chip.querySelector("b");
    const value = chip.dataset.tableChip;
    if (b) b.textContent = value === "all" ? Object.values(counts).reduce((a, c) => a + c, 0) : counts[value] || 0;
  });
  const count = container.querySelector("[data-table-count]");
  if (count) count.textContent = `${visible} ${container.dataset.countLabel || "dòng"} phù hợp`;
  const empty = container.querySelector("[data-table-empty]");
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
  document.getElementById("companySelect")?.addEventListener("change", event => {
    if (typeof rsSetCompany === "function") {
      rsSetCompany(event.target.value);
      renderApp();
      showDemoNotice(`Đã chuyển actor sang ${RS_COMPANY.name}`);
    }
  });
  document.getElementById("roleNav").addEventListener("click", event => {
    const button = event.target.closest("[data-screen]");
    if (button) showScreen(button.dataset.screen);
  });
  document.getElementById("mainContent").addEventListener("click", event => {
    const chip = event.target.closest("[data-table-chip]");
    if (chip) {
      const container = chip.closest("[data-table-filter]");
      container.querySelectorAll("[data-table-chip]").forEach(item => item.classList.toggle("active", item === chip));
      applyTableFilter(container);
      return;
    }
    const collectorStatus = event.target.closest("[data-list-filter-status]");
    if (collectorStatus) {
      setCollectorStatusFilter(collectorStatus);
      return;
    }
    const action = event.target.closest("[data-action]");
    if (action) handleAction(action.dataset.action, action);
  });
  document.getElementById("mainContent").addEventListener("input", event => {
    if (event.target.matches("[data-list-search]")) applyCollectorListFilters(event.target.closest("[data-collector-list]"));
    if (event.target.matches("[data-table-search]")) applyTableFilter(event.target.closest("[data-table-filter]"));
  });
  document.getElementById("mainContent").addEventListener("change", event => {
    if (event.target.matches("[data-table-key]")) {
      applyTableFilter(event.target.closest("[data-table-filter]"));
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
function generateBatchDraftExcel() {
  const form = document.getElementById("dialogForm");
  let periodVal = "09/2026";
  let neighborhoodVal = "Tất cả tổ dân phố";

  form.querySelectorAll(".form-field").forEach(field => {
    const labelText = field.querySelector("label")?.textContent || "";
    const sel = field.querySelector("select");
    if (!sel) return;
    if (labelText.includes("Kỳ thu")) periodVal = sel.value;
    else if (labelText.includes("Tổ dân phố")) neighborhoodVal = sel.value;
  });

  const baseHouseholds = [
    { code: "DTH-H000128", name: "Nguyễn Văn Minh", address: "12/5 Đặng Thúc Vịnh", to: "Tổ 7", people: 4, type: "Hộ gia đình", contract: "HĐ-DTH-0128", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000131", name: "Trần Thị Ánh", address: "12/8 Đặng Thúc Vịnh", to: "Tổ 7", people: 2, type: "Hộ gia đình", contract: "HĐ-DTH-0131", tariff: "HGĐ ≤ 2 người", fee: 40000 },
    { code: "DTH-H000136", name: "Lê Hoàng Nam", address: "14/1 Đặng Thúc Vịnh", to: "Tổ 7", people: 3, type: "Hộ gia đình", contract: "HĐ-DTH-0136", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000142", name: "Phạm Thị Lan", address: "14/7 Đặng Thúc Vịnh", to: "Tổ 7", people: 2, type: "Hộ gia đình", contract: "HĐ-DTH-0142", tariff: "HGĐ ≤ 2 người", fee: 40000 },
    { code: "DTH-H000149", name: "Võ Quốc Khánh", address: "16/2 Đặng Thúc Vịnh", to: "Tổ 7", people: 4, type: "Hộ gia đình", contract: "HĐ-DTH-0149", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000157", name: "Đỗ Thị Hạnh", address: "18/3 Đặng Thúc Vịnh", to: "Tổ 7", people: 4, type: "Hộ gia đình", contract: "HĐ-DTH-0157", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000163", name: "Nguyễn Quốc Tuấn", address: "20 Đặng Thúc Vịnh", to: "Tổ 7", people: 4, type: "Hộ gia đình", contract: "HĐ-DTH-0163", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000171", name: "Trương Thị Kim", address: "22/6 Đặng Thúc Vịnh", to: "Tổ 7", people: 4, type: "Hộ gia đình", contract: "HĐ-DTH-0171", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000305", name: "Trần Thị Hồng", address: "41/2 Nguyễn Ảnh Thủ", to: "Tổ 4", people: 2, type: "Hộ gia đình", contract: "HĐ-DTH-0305", tariff: "HGĐ ≤ 2 người", fee: 40000 },
    { code: "DTH-H000312", name: "Lê Văn Cường", address: "45/3 Nguyễn Ảnh Thủ", to: "Tổ 4", people: 5, type: "Hộ gia đình", contract: "HĐ-DTH-0312", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000320", name: "Hoàng Thị Mai", address: "48/6 Nguyễn Ảnh Thủ", to: "Tổ 4", people: 3, type: "Hộ gia đình", contract: "HĐ-DTH-0320", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H000662", name: "Phan Văn Thắng", address: "22/9 Đặng Thúc Vịnh", to: "Tổ 7", people: 4, type: "Hộ gia đình", contract: "HĐ-DTH-0662", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "DTH-H001152", name: "Lê Quốc Bảo", address: "7/11 Lê Văn Khương", to: "Tổ 6", people: 5, type: "Hộ gia đình", contract: "HĐ-DTH-1152", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "TTT-H000210", name: "Vũ Đình Trọng", address: "15/3 Tô Ký", to: "Tổ 2", people: 3, type: "Hộ gia đình", contract: "HĐ-TTT-0210", tariff: "HGĐ ≥ 3 người", fee: 80000 },
    { code: "TTT-H000215", name: "Bùi Thị Yến", address: "19/8 Tô Ký", to: "Tổ 2", people: 2, type: "Hộ gia đình", contract: "HĐ-TTT-0215", tariff: "HGĐ ≤ 2 người", fee: 40000 },
    { code: "NB-H000108", name: "Nguyễn Công Định", address: "8 Hà Huy Giáp", to: "Tổ 3", people: 4, type: "Hộ gia đình", contract: "HĐ-NB-0108", tariff: "HGĐ ≥ 3 người", fee: 80000 }
  ];

  let filtered = baseHouseholds;
  if (neighborhoodVal !== "Tất cả tổ dân phố") {
    filtered = baseHouseholds.filter(h => h.to === neighborhoodVal);
    if (!filtered.length) {
      const num = neighborhoodVal.replace(/\D/g, "") || "1";
      filtered = [1, 2, 3, 4, 5, 6].map(idx => ({
        code: `DTH-H${num.padStart(2, "0")}${String(idx).padStart(3, "0")}`,
        name: `Chủ hộ ${neighborhoodVal} - Số ${idx}`,
        address: `${12 + idx}/3 Tuyến dân cư, ${neighborhoodVal}`,
        to: neighborhoodVal,
        people: idx % 2 === 0 ? 2 : 4,
        type: "Hộ gia đình",
        contract: `HĐ-T${num}-${String(idx).padStart(3, "0")}`,
        tariff: idx % 2 === 0 ? "HGĐ ≤ 2 người" : "HGĐ ≥ 3 người",
        fee: idx % 2 === 0 ? 40000 : 80000
      }));
    }
  }

  const headers = ["STT", "Mã hộ/đối tượng", "Tên chủ hộ", "Địa chỉ", "Tổ dân phố", "Số nhân khẩu", "Loại đối tượng", "Mã hợp đồng", "Biểu giá áp dụng", "Kỳ thu", "Khoản phải thu (VNĐ)", "Trạng thái"];
  const rows = filtered.map((h, i) => [
    i + 1,
    `"${h.code}"`,
    `"${h.name}"`,
    `"${h.address}"`,
    `"${h.to}"`,
    h.people,
    `"${h.type}"`,
    `"${h.contract}"`,
    `"${h.tariff}"`,
    `"${periodVal}"`,
    h.fee,
    `"Bản nháp dự thảo"`
  ]);

  const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = neighborhoodVal.toLowerCase().replace(/[^a-z0-9]/g, "-");
  a.href = url;
  a.download = `ban-nhap-khoan-thu-ho-gia-dinh-${safeName}-${periodVal.replace(/\//g, "-")}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", closeDemoModal));
  document.getElementById("appDialog").addEventListener("click", event => {
    if (event.target === event.currentTarget) closeDemoModal();
  });
  document.getElementById("dialogForm").addEventListener("submit", event => {
    event.preventDefault();
    if (typeof handleCommuneSimpleSubmit === "function" && handleCommuneSimpleSubmit()) return;
    if (activeDialogAction === "intake" && submitIntakeDialog()) return;
    if (activeDialogAction === "management" && handleReviewSubmit()) return;
    if (activeDialogAction === "routing" && handleRoutingSubmit()) return;
    if (activeDialogAction === "management" && managementDialog?.kind === "assign" && !validateManagementAssignment()) return;
    if (!event.currentTarget.reportValidity()) return;
    const spec = DIALOG_SPECS[activeDialogAction] || {};
    if (activeDialogAction === "generateBatch") {
      generateBatchDraftExcel();
      closeDemoModal();
      showDemoNotice("Đã sinh bản nháp đợt và xuất file Excel danh sách hộ gia đình & khoản thu thành công!");
      return;
    }
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
