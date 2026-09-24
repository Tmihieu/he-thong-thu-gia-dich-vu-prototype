"use strict";

// v2.9 — align the demonstrator with the confirmed business document:
// companies collect from households; the commune reconciles only the processing
// component remitted by each company. Unknown rates/data remain visibly blocked.

const COMPANY_SCOPE_ID = "DV01";

function companyScopeAreas() {
  return MANAGEMENT_AREAS.filter(area => area.unit === COMPANY_SCOPE_ID);
}

function companyScopeHouseholds() {
  return APP_DATA.assignedHouseholds.slice(0, 6);
}

function companyOperationsDashboard() {
  const areas = companyScopeAreas();
  const sourceRows = INTAKE_ROWS.filter(row => intakeBatch(row).unit === COMPANY_SCOPE_ID);
  const issueRows = sourceRows.filter(row => row.issue !== "clean");
  return `${pageHeader("Không gian công ty", "Tổng quan Công ty MTĐT Đông Thạnh", "Công ty trực tiếp thu tiền hộ, phát biên lai và nộp phần xử lý về xã. Xã chỉ giám sát và đối soát.", actionButton("Hộ được giao", "go:assigned-households") + actionButton("Kê khai tiền đã nộp", "go:processing-remittance", "primary"))}
  ${kpiGrid([
    kpi("Khu vực đang phụ trách", String(areas.length), "Thu gom và thu tiền", "success", "⌖"),
    kpi("Dòng dữ liệu đã cung cấp", String(sourceRows.length), `${issueRows.length} dòng cần làm rõ`, issueRows.length ? "warning" : "success", "▦"),
    kpi("Danh sách hộ chính thức", "Chưa chốt", "Chờ xã xác minh nguồn", "warning", "!"),
    kpi("Nghĩa vụ phần xử lý", "Chưa tính", "Thiếu đơn giá được duyệt", "danger", "₫")
  ])}
  ${rules(`Không lấy file công ty làm danh sách hộ chính thức`, [`Dữ liệu công ty gửi là một nguồn đối chiếu. Chỉ hộ đã được xã xác minh và gắn phân công khu vực còn hiệu lực mới đi vào số hộ tính nghĩa vụ.`], "warning")}
  <div class="content-grid equal">
    ${panel("Việc cần làm", "Theo đúng phạm vi của công ty", `<div class="task-list"><article class="task-item"><span class="task-icon">1</span><div><h4>Bổ sung ${issueRows.length} dòng dữ liệu</h4><p>Xem yêu cầu của xã, không thấy nguồn của công ty khác.</p></div>${actionButton("Mở yêu cầu", "go:data-requests", "small")}</article><article class="task-item"><span class="task-icon">2</span><div><h4>Phân tuyến cho nhân viên</h4><p>Gán tuyến, tổ cho nhân viên thu; xử lý tuyến trống khi có người nghỉ.</p></div>${actionButton("Mở phân tuyến", "go:route-assignment", "small")}</article><article class="task-item"><span class="task-icon">3</span><div><h4>Kê khai khoản nộp về xã</h4><p>Nhập mã giao dịch, kỳ và chứng từ để kế toán đối soát.</p></div>${actionButton("Tạo kê khai", "submitProcessingRemittance", "small")}</article></div>`)}
    ${panel("Ranh giới trách nhiệm", "Tránh nhập nhằng dòng tiền", `<div class="alert-list"><article class="task-item"><span class="task-icon">✓</span><div><h4>Tiền của hộ</h4><p>Vào tài khoản pháp nhân công ty hoặc được công ty quản lý; xã không nhận trực tiếp trong quy trình hiện tại.</p></div></article><article class="task-item"><span class="task-icon">✓</span><div><h4>Tiền phần xử lý</h4><p>Công ty nộp về tài khoản xã và kế toán xã đối soát theo kỳ.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Không dùng tài khoản cá nhân</h4><p>Kê khai chỉ chấp nhận tài khoản pháp nhân/cấu hình được duyệt trong hệ thống thật.</p></div></article></div>`)}
  </div>`;
}

// Receivables the commune has issued (khoản phải thu + hóa đơn) for households in the
// company's scope. One row per household–period so the company can filter by kỳ thu.
const RECEIVABLE_STATUS = {
  unpaid: ["Chưa thu", "neutral"], overdue: ["Quá hạn", "danger"], appointment: ["Đã hẹn", "info"], absent: ["Vắng nhà", "warning"], paid: ["Đã thu", "success"]
};

function companyReceivables() {
  const extra = [
    { code: "DTH-H000212", name: "Huỳnh Văn Đức", phone: "090•••5521", address: "3/2 Tô Ký", route: "Tổ 9 · Đông Thạnh", debt: "09/2026", amount: 80000, category: "unpaid", note: "" },
    { code: "DTH-H000218", name: "Mai Thị Thu", phone: "093•••0187", address: "3/9 Tô Ký", route: "Tổ 9 · Đông Thạnh", debt: "08–09/2026", amount: 160000, category: "overdue", note: "Gọi 1 lần chưa nghe máy" },
    { code: "DTH-H000224", name: "Bùi Quang Vinh", phone: "097•••6630", address: "5/1 Tô Ký", route: "Tổ 9 · Đông Thạnh", debt: "09/2026", amount: 80000, category: "paid", note: "Chuyển khoản · 11/09" },
    { code: "DTH-KD00077", name: "Quán ăn Hương Việt", phone: "090•••4410", address: "21 Đặng Thúc Vịnh", route: "Tổ 7 · Đông Thạnh", debt: "09/2026", amount: 119000, category: "paid", kind: "business", note: "Chuyển khoản · 12/09" },
    { code: "DTH-KD00081", name: "Tiệm tạp hóa Ngọc Hà", phone: "091•••2276", address: "8 Tô Ký", route: "Tổ 9 · Đông Thạnh", debt: "09/2026", amount: 119000, category: "unpaid", kind: "business", note: "" }
  ];
  const homes = [...APP_DATA.assignedHouseholds.filter(home => home.category !== "ended"), ...extra];
  const rows = [];
  homes.forEach((home, homeIndex) => {
    const [first, last] = home.debt.replace("–", "-").split("-").map(part => part.trim());
    const year = (last || first).slice(-4);
    const startMonth = Number(first.slice(0, 2));
    const endMonth = Number((last || first).slice(0, 2));
    const monthCount = endMonth - startMonth + 1;
    const perPeriod = Math.round(home.amount / monthCount);
    for (let month = startMonth; month <= endMonth; month++) {
      const mm = String(month).padStart(2, "0");
      const period = `${mm}/${year}`;
      const dueDate = `${new Date(Number(year), month, 0).getDate()}/${mm}/${year}`;
      const isPast = month < 9;
      const status = home.category === "paid" ? "paid" : ["appointment", "absent"].includes(home.category) ? home.category : isPast ? "overdue" : "unpaid";
      rows.push({
        code: home.code, name: home.name, phone: home.phone, address: home.address,
        area: home.route.split(" · ")[0], kind: home.kind || "household",
        period, dueDate, amount: perPeriod, status, note: home.note,
        debtPeriods: monthCount >= 2 ? "2plus" : "1",
        charge: `DTH-${mm}${year.slice(-2)}-${home.code.split("-")[1]}`,
        invoice: `HĐ-${mm}${year.slice(-2)}-${String(homeIndex * 3 + month).padStart(6, "0")}`
      });
    }
  });
  return rows;
}

function companyAssignedHouseholds() {
  const rows = companyReceivables();
  const periods = [...new Set(rows.map(row => row.period))].sort((a, b) => b.localeCompare(a));
  const areas = [...new Set(rows.map(row => row.area))].sort();
  const open = rows.filter(row => row.status !== "paid");
  const overdue = rows.filter(row => row.status === "overdue");
  const paid = rows.filter(row => row.status === "paid");
  const sum = list => list.reduce((total, row) => total + row.amount, 0);
  const tableRows = rows.map(row => `<tr data-row data-group="${row.status}" data-period="${row.period}" data-area="${escapeHtml(row.area)}" data-kind="${row.kind}" data-debt="${row.debtPeriods}" data-search="${escapeHtml(`${row.code} ${row.charge} ${row.invoice} ${row.name} ${row.phone} ${row.address} ${row.area}`.toLowerCase())}" class="${row.status === "overdue" ? "is-attention" : ""}">
    <td><span class="cell-title">${row.code}</span><span class="cell-subtitle">${row.charge}</span></td>
    <td><span class="cell-title">${escapeHtml(row.name)}</span><span class="cell-subtitle">${escapeHtml(row.address)} · ${escapeHtml(row.area)}${row.kind === "business" ? " · Hộ KD" : ""}</span></td>
    <td>${row.phone}</td>
    <td><span class="cell-title">${row.period}</span><span class="cell-subtitle">${row.invoice}</span></td>
    <td>${row.dueDate}</td>
    <td class="money">${formatMoney(row.amount)}</td>
    <td>${badge(...RECEIVABLE_STATUS[row.status])}${row.note ? `<span class="cell-subtitle">${escapeHtml(row.note)}</span>` : ""}</td>
    <td><div class="table-actions">${row.status === "paid" ? actionButton("Xem biên lai", "genericDetail", "small") : actionButton("Cập nhật kết quả", "manualCollectionEntry", "small button-primary")}${actionButton("Chi tiết", "genericDetail", "small")}</div></td></tr>`);
  return `${pageHeader("Phạm vi công ty", "Khoản cần thu của hộ được giao", "Danh sách khoản phải thu và hóa đơn xã đã xuất cho các hộ thuộc phạm vi công ty. Mỗi dòng là một hộ trong một kỳ thu; công ty cập nhật kết quả thu trên chính dòng đó.", actionButton("Xuất Excel", "exportData") + actionButton("Nhập kết quả theo lô", "importCollectionResults") + actionButton("Cập nhật kết quả", "manualCollectionEntry", "primary"))}
  ${summaryStrip([["Khoản cần thu", String(open.length), `${formatMoney(sum(open))} · ${new Set(open.map(row => row.code)).size} hộ`], ["Quá hạn", String(overdue.length), `${formatMoney(sum(overdue))} · kỳ trước 09/2026`], ["Đã thu", String(paid.length), `${formatMoney(sum(paid))} · công ty khai`], ["Kỳ hiện tại", "09/2026", `Hạn nộp 30/09/2026 · ${rows.filter(row => row.period === "09/2026").length} khoản`]])}
  ${rules(`Chỉ hiển thị khoản xã đã xuất`, [`Hộ chưa được xã xác minh phạm vi hoặc chưa có khoản phải thu trong kỳ sẽ không xuất hiện ở đây. Kết quả công ty cập nhật là dữ liệu công ty khai, không phải xác nhận tiền đã về xã.`])}
  <section data-table-filter data-chip-key="group" data-count-label="khoản">
    ${filterBar(filterField("Kỳ thu", filterSelect("period", [["all", "Tất cả kỳ"], ...periods.map(period => [period, `Kỳ ${period}`])])) + filterField("Khu vực", filterSelect("area", [["all", "Tất cả khu vực"], ...areas.map(area => [area, area])])) + filterField("Loại hộ", filterSelect("kind", [["all", "Tất cả"], ["household", "Hộ gia đình"], ["business", "Hộ kinh doanh"]])) + filterField("Số kỳ còn nợ", filterSelect("debt", [["all", "Tất cả"], ["1", "1 kỳ"], ["2plus", "Từ 2 kỳ"]])), "Mã hộ, mã khoản, số hóa đơn, tên, SĐT, địa chỉ...")}
    ${chipBar([["all", "Tất cả"], ["unpaid", "Chưa thu", "warning"], ["overdue", "Quá hạn", "danger"], ["appointment", "Đã hẹn", "warning"], ["absent", "Vắng nhà", "warning"], ["paid", "Đã thu", "success"]], "khoản")}
    ${panel("Danh sách khoản phải thu", "Dữ liệu minh họa · Công ty MTĐT Đông Thạnh", table(["Mã hộ / Mã khoản", "Tên hộ / Địa chỉ", "SĐT", "Kỳ thu / Hóa đơn", "Hạn nộp", { label: "Số tiền", num: true }, "Trạng thái", "Thao tác"], tableRows, { empty: "Không có khoản phù hợp với bộ lọc." }))}
  </section>`;
}

// Kept for the collector role (collectorEntry); no longer a company screen.
function companyCollectionEntry() {
  return `${pageHeader("Cập nhật của công ty", "Ghi nhận kết quả thu tiền hộ", "Công ty cập nhật theo từng hộ trên web hoặc theo lô Excel. Đây là kết quả công ty khai, không phải bằng chứng tiền đã về tài khoản xã.", actionButton("Tải mẫu", "downloadTemplate") + actionButton("Nhập Excel", "importCollectionResults", "primary"))}
  ${rules(`Chỉ nhận hộ đã được giao`, [`Khóa hộ–kỳ–dịch vụ phải tồn tại trong danh sách đã xác minh. Hộ chờ xác minh hoặc đã chấm dứt bị chặn và chuyển thành ngoại lệ.`])}
  <div class="content-grid equal">
    ${panel("Nhập trên web", "Phù hợp cập nhật từng hộ", `<p>Chọn hộ trong phạm vi, trạng thái thu, số tiền và mã biên lai của công ty.</p>${actionButton("Mở form nhập", "manualCollectionEntry", "primary")}`)}
    ${panel("Nhập theo lô Excel", "Phù hợp dữ liệu nhiều hộ", `<p>Tệp đi qua vùng kiểm tra; dòng sai mã, trùng hoặc ngoài phạm vi không được ghi nhận.</p>${actionButton("Mở form import", "importCollectionResults", "primary")}`)}
  </div>
  ${panel("Lô cập nhật gần đây", "Dữ liệu minh họa", table(["Mã lô", "Hình thức", "Số dòng", "Hợp lệ", "Bị chặn", "Trạng thái"], APP_DATA.collectionImports.map(row => `<tr><td>${row.code}</td><td>${row.method}</td><td>${row.rows}</td><td>${row.accepted}</td><td>${row.blocked}</td><td>${badge(row.status)}</td></tr>`)))}`;
}

function companyProcessingObligation() {
  const areas = companyScopeAreas();
  const rows = areas.map((area, index) => `<tr><td>${area.name}<span class="cell-subtitle">${area.id}</span></td><td>${area.households}</td><td>${Math.max(area.households - (index + 1) * 2, 0)}</td><td>${badge("Chờ chốt danh sách")}</td><td>Chưa cấu hình</td><td class="money">Chưa tính</td></tr>`);
  return `${pageHeader("Nghĩa vụ công ty", "Phần xử lý phải nộp", "Công thức theo tài liệu: số hộ thuộc phạm vi đã xác minh × đơn giá xử lý có hiệu lực.", actionButton("Tải bảng căn cứ", "exportData"))}
  ${rules(`Chưa đủ dữ liệu để tính số chính thức`, [`Xã chưa có danh sách hộ chuẩn và chưa cấu hình đơn giá xử lý được phê duyệt. Hệ thống không tự lấy số hộ trong file công ty hoặc tự đặt đơn giá.`], "danger")}
  ${panel("Căn cứ tính theo khu vực", "Chỉ hình thành nghĩa vụ khi danh sách và đơn giá đều đã được xác nhận", table(["Khu vực", "Hộ nguồn", "Hộ đủ điều kiện", "Tình trạng dữ liệu", "Đơn giá xử lý", "Phải nộp"], rows))}
  <p class="muted">Khi triển khai thật, mỗi con số phải mở được xuống danh sách hộ, phiên bản đơn giá và khoảng hiệu lực đã dùng.</p>`;
}

function companyProcessingRemittance() {
  return `${pageHeader("Tiền nộp về xã", "Kê khai phần xử lý đã nộp", "Kê khai giao dịch để kế toán xã tìm trên sao kê và đối soát. Kê khai không tự đồng nghĩa tiền đã được xác nhận.", actionButton("Kê khai giao dịch", "submitProcessingRemittance", "primary"))}
  ${summaryStrip([["Giao dịch đã kê khai", "0", "Chưa có dữ liệu thật"], ["Đã khớp sao kê xã", "0", "Kế toán xác nhận"], ["Chưa rõ / chênh lệch", "0", "Không tự tạo số liệu"]])}
  ${panel("Lịch sử kê khai", "Chưa có chứng từ thật trong prototype", '<div class="empty-state"><strong>Chưa có giao dịch</strong><p>Bấm “Kê khai giao dịch” để xem form gồm kỳ, tài khoản nguồn, số tiền, mã giao dịch và chứng từ.</p></div>')}`;
}

function companyStaffToday() {
  return `${pageHeader("Nhân viên công ty", "Công việc hôm nay", "Danh sách do Công ty MTĐT Đông Thạnh phân công nội bộ. Xã chỉ theo dõi tổng hợp theo công ty và không giao việc trực tiếp cho nhân viên.", actionButton("Mở danh sách", "go:assigned-route", "primary"))}
  ${kpiGrid([kpi("Hộ được phân", "24", "Danh sách nội bộ ca"), kpi("Đã cập nhật", "15", "Kết quả công ty khai", "success"), kpi("Chưa cập nhật", "9", "Cần tiếp cận", "warning")])}
  ${rules(`Phạm vi nhân viên nằm trong phạm vi công ty`, [`Không được mở hộ ngoài danh sách công ty đang phụ trách. Việc điều phối do công ty kiểm soát nội bộ, không phải kế toán xã.`])}`;
}

function companyStaffRoute() {
  const items = companyScopeHouseholds().filter((home, index) => index < 3);
  const cards = items.map(home => `<article class="route-card" data-collection-card data-category="${home.category}" data-search="${escapeHtml(`${home.code} ${home.name} ${home.address}`.toLowerCase())}"><div class="route-card-head"><div><span class="eyebrow">${home.code}</span><h4>${home.name}</h4></div>${badge(home.result)}</div><div class="route-address"><strong>${home.address}</strong><span>${home.phone} · ${home.note}</span></div><div class="route-actions">${actionButton("Cập nhật kết quả", "manualCollectionEntry", "primary")}${actionButton("Vắng nhà / hẹn lại", "absentNotice")}</div></article>`).join("");
  return `${pageHeader("Phân công nội bộ", "Danh sách hộ hôm nay", "Chỉ hiển thị các hộ đã được xã xác minh, thuộc khu vực công ty phụ trách và được công ty giao cho nhân viên.", actionButton("Nhập theo Excel", "importCollectionResults"))}
  <section class="collection-workspace" data-collector-list><div class="collector-filterbar"><label class="collector-search"><span>Tìm hộ</span><input class="control" data-list-search placeholder="Tên, mã hoặc địa chỉ"></label><label><span>Trạng thái</span><select class="control" data-list-status><option value="all">Tất cả</option><option value="unpaid">Chưa thu</option><option value="absent">Vắng nhà</option><option value="appointment">Đã hẹn</option><option value="paid">Đã thu</option></select></label></div><div class="list-result-line"><strong data-list-count>${items.length} hộ phù hợp</strong><span>Dữ liệu minh họa</span></div><div class="collection-card-grid">${cards}</div><div class="collection-empty" data-list-empty hidden>Không có hộ phù hợp.</div></section>`;
}

function companyStaffCash() {
  return `${pageHeader("Nghiệp vụ nội bộ công ty", "Tiền mặt chờ bàn giao", "Theo dõi tiền nhân viên đã nhận để bàn giao cho công ty. Màn này không ghi nhận tiền đã nộp về xã.", actionButton("Mở chốt ca", "go:shift-close", "primary"))}
  ${rules(`Không thuộc đối soát của kế toán xã`, [`Kế toán xã chỉ đối soát phần xử lý do công ty nộp về tài khoản xã theo kỳ.`], "warning")}
  ${panel("Các khoản trong ca", "Dữ liệu minh họa thuộc công ty", table(["Mã hộ", "Mã ghi nhận", "Số tiền", "Thời điểm", "Trạng thái"], APP_DATA.cashCollections.map(row => `<tr><td>${row.charge}</td><td>${row.code}</td><td class="money">${formatMoney(row.amount)}</td><td>${row.collectedAt}</td><td>${badge("Chờ bàn giao nội bộ")}</td></tr>`)))}`;
}

function companyStaffShiftClose() {
  return `${pageHeader("Nghiệp vụ nội bộ công ty", "Chốt ca và bàn giao", "Nhân viên đối chiếu kết quả thu và tiền mặt với đầu mối công ty. Xã không xác nhận chốt ca này.", actionButton("Gửi chốt ca", "closeShift", "primary"))}
  ${panel("Tóm tắt ca", "Dữ liệu minh họa", `<div class="summary-strip"><div class="summary-item"><span>Đã thu</span><strong>15</strong></div><div class="summary-item"><span>Vắng nhà</span><strong>3</strong></div><div class="summary-item"><span>Hẹn lại</span><strong>2</strong></div><div class="summary-item"><span>Tiền mặt nội bộ</span><strong>3 khoản</strong></div></div>${rules(`Người nhận bàn giao thuộc công ty`, [`Số liệu sau chốt ca vẫn là dữ liệu công ty khai; không tự trở thành tiền phần xử lý đã nộp về xã.`])}`)}`;
}

function companyStaffDebt() {
  const items = APP_DATA.assignedHouseholds.filter(home => !home.result.includes("Đã thu") && home.result !== "Đã chấm dứt");
  const cards = items.map(home => `<article class="route-card debt-card" data-collection-card data-category="${home.category}" data-search="${escapeHtml(`${home.code} ${home.name} ${home.address}`.toLowerCase())}"><div class="route-card-head"><div><span class="eyebrow">${home.code}</span><h4>${home.name}</h4></div>${badge(home.debtState)}</div><div class="route-address"><strong>${home.address}</strong><span>${home.phone} · ${home.note}</span></div><div class="debt-highlight"><div><span>Số kỳ</span><strong>${home.periods} kỳ</strong></div><div><span>Hạn / lần hẹn</span><strong>${home.dueDate}</strong></div></div><div class="route-actions">${actionButton("Cập nhật kết quả", "manualCollectionEntry", "primary")}${actionButton("Hẹn lại", "absentNotice")}</div></article>`).join("");
  return `${pageHeader("Theo dõi nội bộ", "Hộ cần quay lại", "Công ty và nhân viên xử lý chi tiết từng hộ trong phạm vi; xã chỉ nhận báo cáo tổng hợp theo công ty.")}
  <section class="collection-workspace debt-workspace" data-collector-list><div class="collector-filterbar"><label class="collector-search"><span>Tìm hộ</span><input class="control" data-list-search placeholder="Tên, mã hoặc địa chỉ"></label><label><span>Tình trạng</span><select class="control" data-list-status><option value="all">Tất cả</option><option value="overdue">Quá hạn</option><option value="appointment">Đã hẹn</option><option value="absent">Vắng nhà</option><option value="unpaid">Chưa tiếp cận</option></select></label></div><div class="list-result-line"><strong data-list-count>${items.length} hộ cần theo dõi</strong><span>Ưu tiên nhiều kỳ</span></div><div class="collection-card-grid">${cards}</div><div class="collection-empty" data-list-empty hidden>Không có hộ phù hợp.</div></section>`;
}

function processingRows() {
  return MANAGEMENT_UNITS.slice(0, 4).map((unit, index) => {
    const areas = MANAGEMENT_AREAS.filter(area => area.unit === unit.id);
    const sourceCount = areas.reduce((sum, area) => sum + area.households, 0);
    const verifiedCount = Math.max(sourceCount - (index + 1) * 7, 0);
    return { unit, areas: areas.length, sourceCount, verifiedCount };
  });
}

function accountingProcessingDashboard() {
  const blocked = processingRows().filter(row => row.sourceCount !== row.verifiedCount).length;
  return `${pageHeader("Không gian kế toán", "Tổng quan đối soát phần xử lý", "Theo dõi nghĩa vụ công ty phải nộp và tiền thực nộp về tài khoản xã; không đối soát tiền dân trả trực tiếp cho công ty.", actionButton("Mở đối soát", "go:unit-reconciliation", "primary"))}
  ${kpiGrid([kpi("Công ty trong danh mục", String(MANAGEMENT_UNITS.length), "Phạm vi toàn xã"), kpi("Công ty chưa đủ căn cứ", String(blocked), "Danh sách hộ còn chờ xác minh", "danger"), kpi("Đơn giá xử lý", "Chưa cấu hình", "Cần văn bản có hiệu lực", "warning"), kpi("Kỳ 09/2026", "Chưa thể chốt", "Thiếu điều kiện đối soát", "danger")])}
  ${rules(`Ba nguồn cần truy vết riêng`, [`(1) danh sách hộ được xã xác minh theo công ty; (2) đơn giá xử lý có hiệu lực; (3) giao dịch công ty thực nộp trên sao kê tài khoản xã.`])}
  ${panel("Trình tự đối soát", "Không tự suy diễn khi thiếu nguồn", `<div class="steps"><div class="step-card blocked"><span class="step-number">1</span><h4>Chốt danh sách hộ</h4><p>Còn dữ liệu cần xác minh</p></div><div class="step-card blocked"><span class="step-number">2</span><h4>Áp đơn giá xử lý</h4><p>Chưa có cấu hình duyệt</p></div><div class="step-card"><span class="step-number">3</span><h4>Khớp tiền thực nộp</h4><p>Chờ sao kê tài khoản xã</p></div><div class="step-card"><span class="step-number">4</span><h4>Trình báo cáo</h4><p>Chưa đủ điều kiện</p></div></div>`)}`;
}

function processingStatements() {
  return `${pageHeader("Tiền xử lý về xã", "Sao kê khoản công ty nộp", "Chỉ hiển thị giao dịch vào tài khoản xã dùng cho phần xử lý; không trộn với tiền hộ trả vào tài khoản công ty.", actionButton("Nhập sao kê", "syncStatement", "primary"))}
  ${rules(`Prototype chưa có sao kê thật`, [`Cần chốt tài khoản xã, mẫu nội dung chuyển khoản và mẫu file/API ngân hàng. Không tạo số tiền hoặc kết quả khớp giả.`], "warning")}
  ${panel("Giao dịch đã nhận", "Kỳ 09/2026", table(["Ngày", "Công ty khai", "Mã giao dịch", "Kỳ", "Số tiền", "Trạng thái"], ['<tr><td colspan="6"><div class="empty-state"><strong>Chưa có dữ liệu sao kê</strong><p>Nhập tệp mẫu đã ẩn dữ liệu nhạy cảm để kiểm thử quy tắc khớp.</p></div></td></tr>']))}`;
}

function processingUnmatched() {
  return `${pageHeader("Ngoại lệ kế toán", "Khoản nộp chưa rõ công ty hoặc kỳ", "Không tự gán giao dịch thiếu mã; kế toán cần đối chiếu pháp nhân nguồn, kỳ và chứng từ công ty kê khai.", actionButton("Tải danh sách", "exportData"))}
  ${panel("Hàng chờ xác minh", "Chưa có sao kê thật nên không tạo ngoại lệ giả", '<div class="empty-state"><strong>Chưa có dữ liệu</strong><p>Khi có giao dịch thiếu hoặc sai mã, hệ thống giữ nguyên dòng sao kê và mở hồ sơ xác minh; không tự ghi nhận đã nộp.</p></div>')}`;
}

function processingReconciliation() {
  const rows = processingRows().map(row => {
    const blocked = row.verifiedCount !== row.sourceCount;
    return `<tr data-row data-group="${blocked ? "blocked" : "ready"}" data-unit="${row.unit.id}" data-search="${escapeHtml(row.unit.name)}" class="${blocked ? "is-blocked" : ""}">
      <td>${managementUnitLink(row.unit.id)}<span class="cell-subtitle">${row.areas} khu vực</span></td>
      <td class="num">${row.verifiedCount} / ${row.sourceCount}</td>
      <td>${delta(row.verifiedCount - row.sourceCount, "hộ chờ xác minh", n => `${n} hộ`)}</td>
      <td class="num">Chưa cấu hình</td>
      <td class="money">Chưa tính</td>
      <td class="money">Chưa có sao kê</td>
      <td>${badge(blocked ? "Bị chặn" : "Chờ đơn giá", blocked ? "danger" : "warning")}</td>
      <td><button class="button button-small" data-action="reviewProcessingReconciliation">Xem điều kiện</button></td></tr>`;
  });
  return `${pageHeader("Đối soát", "Đối soát phần xử lý theo công ty", "Phải nộp = số hộ đủ điều kiện × đơn giá xử lý, so với số thực nộp về tài khoản xã. Chênh lệch chỉ được kết luận khi cả ba nguồn đều truy nguyên được.", actionButton("Xuất bảng đối soát", "exportData"))}
  ${rules("Không được kết luận thiếu tiền ở thời điểm này", ["Danh sách hộ, đơn giá và sao kê đều chưa đủ; trạng thái “Bị chặn” tránh biến dữ liệu minh họa thành kết luận nghiệp vụ.", "Ngưỡng cảnh báo chênh lệch chưa được cấu hình, cần BA xác nhận công thức và ngưỡng trước khi bật cảnh báo tự động."], "danger", "Ngưỡng: chưa cấu hình")}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    ${filterBar(filterField("Công ty", filterSelect("unit", [["all", "Tất cả công ty"], ...processingRows().map(row => [row.unit.id, row.unit.name])])), "Tên công ty...")}
    ${chipBar([["all", "Tất cả"], ["blocked", "Cần xử lý", "warning"], ["ready", "Đủ danh sách hộ", "success"]], "công ty")}
    ${panel("Đối soát kỳ 09/2026", "Mỗi chỉ tiêu phải mở xuống nguồn hình thành", table(["Công ty", { label: "Hộ đủ điều kiện / nguồn", num: true }, { label: "Chênh lệch hộ", num: true }, { label: "Đơn giá", num: true }, { label: "Phải nộp", num: true }, { label: "Thực nộp", num: true }, "Trạng thái", ""], rows, { empty: "Không có công ty phù hợp." }))}
  </section>`;
}

function alignedAccountingReports() {
  return `${pageHeader("Báo cáo kế toán", "Báo cáo đối soát phần xử lý", "Kế toán lập báo cáo theo công ty và kỳ; lãnh đạo xác nhận báo cáo trước khi kế toán khóa sổ.", actionButton("Lập báo cáo", "createProcessingReport", "primary"))}
  ${panel("Báo cáo kỳ", "Chưa có báo cáo đủ điều kiện xác nhận", table(["Mã", "Nội dung", "Kỳ", "Người lập", "Trạng thái"], ['<tr><td>BC-XL-0926</td><td>Đối soát phần xử lý theo công ty</td><td>09/2026</td><td>Kế toán xã</td><td><span class="badge danger">Bị chặn bởi dữ liệu đầu vào</span></td></tr>']))}`;
}

function accountingPeriodClose() {
  return `${pageHeader("BR-14", "Chốt và khóa sổ kỳ 09/2026", "Kế toán thực hiện khóa sổ sau khi đối soát hoàn tất và báo cáo đã được lãnh đạo xác nhận.", actionButton("Kiểm tra lại", "precheckPeriod") + actionButton("Khóa sổ", "closePeriod", "danger", "▣"))}
  ${rules(`Chưa đủ điều kiện khóa sổ`, [`Danh sách hộ chưa chốt, đơn giá xử lý chưa cấu hình, chưa có sao kê và báo cáo chưa được lãnh đạo xác nhận.`], "danger")}
  ${panel("Điều kiện bắt buộc", "Hệ thống thật phải kiểm tra lại ở backend ngay trước khi khóa", `<div class="task-list"><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Danh sách hộ theo công ty</h4><p>Chưa xác minh xong.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Đơn giá xử lý</h4><p>Đang dùng đơn giá mẫu, chưa có phiên bản được duyệt.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Đối soát tiền thực nộp</h4><p>Còn 2 dòng treo và 1 công ty nộp thiếu.</p></div></article><article class="alert-item danger"><span class="alert-icon">!</span><div><h4>Xác nhận báo cáo</h4><p>Lãnh đạo chưa xác nhận báo cáo kỳ.</p></div></article></div>`)}`;
}

function alignedLeaderDashboard() {
  return `${pageHeader("Không gian lãnh đạo", "Dashboard giám sát toàn xã", "Theo dõi công ty, tiến độ thu và tình trạng đối soát phần xử lý. Lãnh đạo xác nhận báo cáo, kế toán khóa sổ.", actionButton("Xem báo cáo", "go:executive-reports", "primary"))}
  ${kpiGrid([kpi("Công ty phối hợp", String(MANAGEMENT_UNITS.length), "Thu gom và trực tiếp thu tiền hộ"), kpi("Khu vực chưa phân công", String(MANAGEMENT_AREAS.filter(area => !area.unit).length), "Không tự gán từ file nguồn", "warning"), kpi("Đối soát phần xử lý", "Chưa đủ dữ liệu", "Chưa kết luận chênh lệch", "danger"), kpi("Báo cáo chờ xác nhận", "0", "Chưa đủ điều kiện trình")])}
  ${rules(`Giới hạn can thiệp của xã`, [`Xã theo dõi theo công ty và liên hệ đầu mối khi tiến độ thấp. Công ty tự tổ chức nhân viên, thu tiền hộ và phát biên lai.`])}
  ${panel("Tình trạng sẵn sàng", "Không hiển thị số tiền giả khi nguồn chưa có", `<div class="steps"><div class="step-card blocked"><span class="step-number">1</span><h4>Dữ liệu hộ</h4><p>Đang đối chiếu</p></div><div class="step-card blocked"><span class="step-number">2</span><h4>Đơn giá xử lý</h4><p>Chưa cấu hình</p></div><div class="step-card"><span class="step-number">3</span><h4>Tiền công ty nộp</h4><p>Sao kê đã đồng bộ · 2 dòng treo</p></div><div class="step-card"><span class="step-number">4</span><h4>Xác nhận báo cáo</h4><p>2 báo cáo dự thảo, chưa trình</p></div></div>`)}`;
}

function alignedLeaderReports() {
  return `${pageHeader("Xác nhận của lãnh đạo", "Báo cáo tổng hợp và đối soát", "Lãnh đạo xem căn cứ, xác nhận hoặc yêu cầu chỉnh sửa; thao tác này không khóa sổ.")}
  ${rules(`Chưa có báo cáo đủ điều kiện trình`, [`Phải hoàn tất danh sách hộ, đơn giá và đối soát tiền công ty thực nộp trước.`], "warning")}
  ${panel("Hàng chờ xác nhận", "Kế toán là người lập; lãnh đạo không sửa số nguồn", '<div class="empty-state"><strong>Chưa có báo cáo</strong><p>Khi có bản trình, màn hình sẽ hiển thị số phải nộp, thực nộp, chênh lệch và liên kết xuống từng công ty.</p></div>')}`;
}

function alignedMoneyFlow() {
  return `${pageHeader("Cấu hình nghiệp vụ", "Luồng tiền và thanh toán", "Tiền hộ do công ty trực tiếp thu (tiền mặt hoặc thanh toán trên ứng dụng người dân); xã chỉ nhận phần xử lý công ty nộp về. Hai dòng tiền không trộn trong đối soát.")}
  ${rules("Quyết định 16/09/2026 về thanh toán trên ứng dụng", ["Thanh toán trên ứng dụng người dân thuộc phạm vi hiện tại; tiền vào tài khoản pháp nhân công ty thu gom hoặc theo mã của nhân viên thu do công ty quản lý, không vào tài khoản xã.", "Biên lai cho giao dịch online do công ty phát hành; ứng dụng chỉ hiển thị lại.", "Nguồn số tiền phải đóng hiển thị cho người dân chưa chốt (P0) vì xã chưa có CSDL hộ chuẩn.", "Không dùng tài khoản cá nhân người quản lý; mã nhân viên thu phải gắn với pháp nhân công ty."], "", "P0 còn mở: CSDL hộ")}
  ${panel("Hai dòng tiền phải tách", "Không trộn trong đối soát", table(["Dòng tiền", "Kênh", "Nơi nhận", "Bên chịu trách nhiệm", "Trạng thái"], [
    '<tr><td>Hộ dân → tiền dịch vụ</td><td>Tiền mặt tại nhà</td><td>Nhân viên thu → công ty</td><td>Công ty thu gom · phát biên lai</td><td>' + badge("Đang áp dụng", "success") + '</td></tr>',
    '<tr><td>Hộ dân → tiền dịch vụ</td><td>Ứng dụng người dân (QR, ví, ngân hàng)</td><td>Tài khoản công ty hoặc mã nhân viên thu</td><td>Công ty thu gom · phát biên lai</td><td>' + badge("Đưa vào phạm vi hiện tại", "info") + '</td></tr>',
    '<tr><td>Công ty → phần xử lý</td><td>Chuyển khoản</td><td>Tài khoản xã</td><td>Kế toán xã đối soát</td><td>' + badge("Cần chốt tài khoản / mẫu sao kê", "warning") + '</td></tr>'
  ], { static: true }))}`;
}

function alignedUsers() {
  const users = [
    ...APP_DATA.users,
    { username: "congty.dongthanh", name: "Trần Hoàng Phúc", organization: "Công ty MTĐT Đông Thạnh", roles: "Công ty thu gom", lastLogin: "15/09 · 08:40", status: "Hoạt động" }
  ];
  const rows = users.map(user => `<tr><td><span class="cell-title">${user.username}</span><span class="cell-subtitle">${user.name}</span></td><td>${user.organization}</td><td>${badge(user.roles)}</td><td>${user.lastLogin}</td><td>${badge(user.status)}</td><td><button class="button button-small" data-action="genericDetail">Quản lý</button></td></tr>`);
  return `${pageHeader("QT-01", "Người dùng và tài khoản", "Tài khoản công ty được gắn đúng một đơn vị; mọi truy vấn dữ liệu phải lọc theo phạm vi này ở backend.", actionButton("Thêm người dùng", "addUser", "primary", "+"))}
  ${panel("Tài khoản minh họa", "Có tài khoản đại diện công ty trong danh sách", table(["Tên đăng nhập", "Đơn vị", "Vai trò", "Đăng nhập gần nhất", "Trạng thái", ""], rows))}`;
}

function alignedPermissions() {
  const roles = [
    ["Cán bộ xã", "Dữ liệu hộ, khu vực, công ty và tiến độ", "Toàn xã", "Không điều hành nhân viên công ty"],
    ["Công ty thu gom", "Hộ được giao, kết quả thu, biên lai, nghĩa vụ và kê khai", "Đúng một công ty", "Không xem nguồn/phạm vi công ty khác"],
    ["Nhân viên thu công ty", "Danh sách và kết quả thu nội bộ", "Hộ công ty giao", "Không sửa dữ liệu gốc/đơn giá"],
    ["Kế toán", "Sao kê xã, đối soát phần xử lý, báo cáo, khóa sổ", "Toàn xã", "Không tự duyệt báo cáo"],
    ["Lãnh đạo", "Dashboard, duyệt quyết định, xác nhận báo cáo", "Toàn xã", "Không khóa sổ thay kế toán"],
    ["Quản trị", "Tài khoản, quyền, cấu hình và audit", "Hệ thống", "Không quyết định tiền"]
  ];
  return `${pageHeader("QT-02", "Vai trò và phạm vi dữ liệu", "Ẩn menu chỉ là mô phỏng; hệ thống thật phải kiểm tra quyền hành động và unitId ở API/truy vấn.", actionButton("Kiểm tra xung đột quyền", "permissionAudit"))}
  ${panel("Ma trận vai trò 2.9", "Phân tách công ty – kế toán – lãnh đạo", table(["Vai trò", "Chức năng", "Phạm vi", "Giới hạn", ""], roles.map(row => `<tr><td>${badge(row[0])}</td><td>${row[1]}</td><td><strong>${row[2]}</strong></td><td>${row[3]}</td><td><button class="button button-small" data-action="editPermissions">Cấu hình</button></td></tr>`)))}`;
}

Object.assign(DIALOG_SPECS, {
  submitProcessingRemittance: {
    eyebrow: "Công ty kê khai", title: "Kê khai tiền phần xử lý đã nộp", description: "Kế toán chỉ xác nhận sau khi tìm thấy giao dịch tương ứng trên sao kê tài khoản xã.", confirm: "Gửi kê khai mô phỏng",
    fields: [
      { type: "select", label: "Kỳ đối soát", options: ["09/2026", "08/2026"], required: true },
      { label: "Công ty", value: "Công ty MTĐT Đông Thạnh", readonly: true },
      { label: "Tài khoản nguồn pháp nhân", placeholder: "Số tài khoản đứng tên công ty", required: true },
      { type: "number", label: "Số tiền đã nộp", placeholder: "Nhập theo chứng từ", min: 1, required: true },
      { label: "Mã giao dịch", placeholder: "Mã duy nhất trên chứng từ ngân hàng", required: true },
      { type: "date", label: "Ngày nộp", value: "2026-09-15", required: true },
      { type: "file", label: "Chứng từ nộp", required: true },
      { type: "textarea", label: "Ghi chú", full: true }
    ]
  },
  companyIssueReceipt: {
    eyebrow: "Bảng kê công ty", title: "Ghi nhận biên lai công ty đã phát", description: "Chỉ lưu dữ liệu tham chiếu; prototype không phát hành chứng từ pháp lý.", confirm: "Ghi nhận mô phỏng",
    fields: [
      { label: "Mã hộ / khoản", required: true }, { label: "Số biên lai", required: true },
      { type: "number", label: "Số tiền", min: 1, required: true }, { type: "date", label: "Ngày phát", value: "2026-09-15", required: true },
      { type: "file", label: "Bản chụp/đối chứng" }
    ]
  },
  reviewProcessingReconciliation: {
    eyebrow: "Điều kiện đối soát", title: "Kiểm tra căn cứ theo công ty", description: "Không cho kết luận chênh lệch khi thiếu bất kỳ nguồn bắt buộc nào.", confirm: "Đã hiểu",
    summary: [["Danh sách hộ", "Chưa chốt"], ["Đơn giá xử lý", "Chưa cấu hình"], ["Sao kê xã", "Chưa có dữ liệu"]],
    fields: [{ type: "textarea", label: "Ghi chú theo dõi", placeholder: "Nội dung cần đơn vị/cán bộ bổ sung", full: true }]
  },
  createProcessingReport: {
    eyebrow: "Báo cáo kế toán", title: "Lập báo cáo đối soát phần xử lý", description: "Chỉ cho trình lãnh đạo khi đủ dữ liệu nguồn và không còn chênh lệch bắt buộc chưa xử lý.", confirm: "Tạo bản nháp mô phỏng",
    fields: [{ type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true }, { type: "select", label: "Phạm vi", options: ["Toàn xã", "Theo công ty"], required: true }, { type: "textarea", label: "Ghi chú", full: true }]
  }
});

Object.assign(VIEW_RENDERERS, {
  companyOperationsDashboard,
  companyAssignedHouseholds,
  companyProcessingObligation,
  companyProcessingRemittance,
  collectorToday: companyStaffToday,
  collectorRoute: companyStaffRoute,
  collectorEntry: companyCollectionEntry,
  cashPending: companyStaffCash,
  shiftClose: companyStaffShiftClose,
  collectorDebt: companyStaffDebt,
  accountingProcessingDashboard,
  processingStatements,
  processingUnmatched,
  processingReconciliation,
  accountingReports: alignedAccountingReports,
  accountingPeriodClose,
  leaderDashboard: alignedLeaderDashboard,
  leaderReports: alignedLeaderReports,
  moneyFlow: alignedMoneyFlow,
  users: alignedUsers,
  permissions: alignedPermissions
});
