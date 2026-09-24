"use strict";

/* v3.0 — không gian kế toán xã theo quyết định 16/09/2026:
   kế toán chỉ đối soát phần xử lý với CÔNG TY (không đối soát nhân viên thu), xã phát phiếu thu cho công ty,
   kiểm tra biên lai công ty phát cho hộ. Đơn giá xử lý là số MINH HỌA, chưa có văn bản duyệt. */

const PROCESSING_PERIOD = "09/2026";
const PROCESSING_TARIFF = { code: "DG-XL-0926-MAU", amount: 12000, status: "Mẫu · chờ duyệt", note: "Đơn giá minh họa để trình diễn, chưa có văn bản có hiệu lực" };

function processingObligations() {
  return processingRows().map(row => ({ ...row, obligation: row.verifiedCount * PROCESSING_TARIFF.amount }));
}

const PROCESSING_OB = Object.fromEntries(processingObligations().map(row => [row.unit.id, row.obligation]));

const COMMUNE_STATEMENT = [
  { id: "VCB2609109715", date: "10/09/2026 09:12", content: "DV01 XL 092026 MTDT DONG THANH", amount: PROCESSING_OB.DV01 - 1250000, unit: "DV01", period: "09/2026", status: "Đã khớp", matchedBy: "Khớp tự động theo mã" },
  { id: "VCB2609109721", date: "10/09/2026 14:40", content: "NOP TIEN RAC T9", amount: 1250000, unit: null, period: null, status: "Chưa rõ", matchedBy: "Thiếu mã công ty–kỳ" },
  { id: "VCB2609110034", date: "11/09/2026 08:05", content: "DV02 XL 092026 HTX AN PHU", amount: PROCESSING_OB.DV02, unit: "DV02", period: "09/2026", status: "Đã khớp", matchedBy: "Khớp tự động theo mã" },
  { id: "VCB2609110877", date: "12/09/2026 10:20", content: "DV04 XL 092026 HTX XANH NHI BINH", amount: PROCESSING_OB.DV04 + 200000, unit: "DV04", period: "09/2026", status: "Đã khớp", matchedBy: "Khớp tự động · nộp thừa 200.000đ" },
  { id: "VCB2609111202", date: "12/09/2026 10:21", content: "HTX AN PHU NOP LAI", amount: 500000, unit: null, period: null, status: "Chờ xác minh", matchedBy: "Công ty kê khai cho hai kỳ" },
  { id: "VCB2609111390", date: "13/09/2026 15:02", content: "DV02 XL 082026 HTX AN PHU BO SUNG", amount: 240000, unit: "DV02", period: "08/2026", status: "Đã khớp", matchedBy: "Gán tay · kỳ 08/2026 đã khóa, ghi nhận bổ sung" }
];

const COMMUNE_RECEIPTS = [
  { id: "PT-0926-001", unit: "DV01", period: "09/2026", date: "10/09/2026", method: "Chuyển khoản", ref: "VCB2609109715", amount: PROCESSING_OB.DV01 - 1250000, status: "Đã phát hành" },
  { id: "PT-0926-002", unit: "DV02", period: "09/2026", date: "11/09/2026", method: "Chuyển khoản", ref: "VCB2609110034", amount: PROCESSING_OB.DV02, status: "Đã phát hành" },
  { id: "PT-0926-003", unit: "DV04", period: "09/2026", date: "12/09/2026", method: "Chuyển khoản", ref: "VCB2609110877", amount: PROCESSING_OB.DV04 + 200000, status: "Đã phát hành" },
  { id: "PT-0926-004", unit: "DV03", period: "09/2026", date: "13/09/2026", method: "Tiền mặt tại xã", ref: "Thủ quỹ xã", amount: 3000000, status: "Đã phát hành" },
  { id: "PT-0826-011", unit: "DV01", period: "08/2026", date: "29/08/2026", method: "Chuyển khoản", ref: "VCB2608100442", amount: 1800000, status: "Đã hủy", note: "Phát nhầm kỳ, đã thay bằng PT-0826-012" }
];

const COMPANY_REMITTANCES = [
  { id: "KK-0926-DV01-1", unit: "DV01", period: "09/2026", date: "10/09/2026", method: "Chuyển khoản", ref: "VCB2609109715", amount: PROCESSING_OB.DV01 - 1250000, status: "Đã khớp" },
  { id: "KK-0926-DV01-2", unit: "DV01", period: "09/2026", date: "10/09/2026", method: "Chuyển khoản", ref: "VCB2609109721", amount: 1250000, status: "Chưa khớp", note: "Nội dung chuyển khoản thiếu mã; đang ở dòng treo" },
  { id: "KK-0926-DV02-1", unit: "DV02", period: "09/2026", date: "11/09/2026", method: "Chuyển khoản", ref: "VCB2609110034", amount: PROCESSING_OB.DV02, status: "Đã khớp" },
  { id: "KK-0926-DV03-1", unit: "DV03", period: "09/2026", date: "13/09/2026", method: "Tiền mặt tại xã", ref: "PT-0926-004", amount: 3000000, status: "Đã có phiếu thu" },
  { id: "KK-0926-DV03-2", unit: "DV03", period: "09/2026", date: "15/09/2026", method: "Tiền mặt tại xã", ref: "—", amount: 5000000, status: "Chưa có phiếu thu", note: "Công ty kê khai đã nộp, thủ quỹ xã chưa ghi nhận" },
  { id: "KK-0926-DV04-1", unit: "DV04", period: "09/2026", date: "12/09/2026", method: "Chuyển khoản", ref: "VCB2609110877", amount: PROCESSING_OB.DV04 + 200000, status: "Đã khớp", note: "Nộp thừa 200.000đ, chờ quyết định bù trừ kỳ sau" }
];

const COMPANY_RECEIPT_CHECKS = [
  { batch: "BL-0926-DV01-01", unit: "DV01", count: 1240, amount: 99200000, sent: "12/09/2026", issues: "3 biên lai trùng số", status: "Cần điều chỉnh" },
  { batch: "BL-0926-DV02-01", unit: "DV02", count: 980, amount: 78400000, sent: "11/09/2026", issues: "Không phát hiện", status: "Đã kiểm tra" },
  { batch: "BL-0926-DV04-01", unit: "DV04", count: 1102, amount: 88160000, sent: "13/09/2026", issues: "2 biên lai cho hộ đã chấm dứt", status: "Yêu cầu hủy" },
  { batch: "—", unit: "DV03", count: 0, amount: 0, sent: "Chưa gửi", issues: "Công ty chưa gửi danh sách biên lai kỳ 09/2026", status: "Chưa gửi" }
];

const ACCOUNTING_REPORTS = [
  { id: "BC-XL-0926", title: "Đối soát phần xử lý theo công ty", period: "09/2026", author: "Trần Mỹ Duyên", updated: "15/09/2026", status: "Dự thảo", note: "Còn 1 dòng treo và 1 công ty chưa nộp đủ" },
  { id: "BC-NO-0926", title: "Công nợ phần xử lý chưa nộp", period: "09/2026", author: "Trần Mỹ Duyên", updated: "15/09/2026", status: "Dự thảo", note: "Công ty Dịch vụ Hóc Môn còn thiếu" },
  { id: "BC-XL-0826", title: "Đối soát phần xử lý theo công ty", period: "08/2026", author: "Trần Mỹ Duyên", updated: "05/09/2026", status: "Lãnh đạo đã xác nhận", note: "Đã khóa sổ 06/09/2026" }
];

const accMoney = n => managementMoney(n);
const accUnitName = id => managementUnit(id)?.name || "Chưa rõ";

function processingActuals(unitId) {
  const transfer = COMMUNE_STATEMENT.filter(row => row.unit === unitId && row.period === PROCESSING_PERIOD).reduce((sum, row) => sum + row.amount, 0);
  const cash = COMMUNE_RECEIPTS.filter(row => row.unit === unitId && row.period === PROCESSING_PERIOD && row.method === "Tiền mặt tại xã" && row.status === "Đã phát hành").reduce((sum, row) => sum + row.amount, 0);
  return { transfer, cash, total: transfer + cash };
}

function statementRow(row) {
  const group = row.status === "Đã khớp" ? "matched" : "open";
  return `<tr data-row data-group="${group}" data-unit="${row.unit || "none"}" data-search="${escapeHtml(`${row.id} ${row.content} ${row.unit ? accUnitName(row.unit) : ""}`)}" class="${group === "open" ? "is-attention" : ""}">
    <td><span class="cell-title">${row.id}</span><span class="cell-subtitle">${row.date}</span></td>
    <td><span class="cell-title">${escapeHtml(row.content)}</span><span class="cell-subtitle">${escapeHtml(row.matchedBy)}</span></td>
    <td>${row.unit ? managementUnitLink(row.unit) : '<span class="muted">Chưa xác định</span>'}</td>
    <td>${row.period || "—"}</td>
    <td class="money">${accMoney(row.amount)}</td>
    <td>${badge(row.status)}</td>
    <td>${row.unit ? `<button class="button button-small" data-action="genericDetail">Xem</button>` : `<button class="button button-small button-primary" data-action="matchStatement">Khớp theo mã</button>`}</td></tr>`;
}

function accountingProcessingDashboard() {
  const open = COMMUNE_STATEMENT.filter(row => row.status !== "Đã khớp");
  const shortfall = processingObligations().filter(row => processingActuals(row.unit.id).total < row.obligation);
  const receiptsMonth = COMMUNE_RECEIPTS.filter(row => row.period === PROCESSING_PERIOD && row.status === "Đã phát hành");
  return `${pageHeader("Không gian kế toán", "Tổng quan đối soát phần xử lý", "Sao kê tài khoản xã, dòng treo, phiếu thu và đối soát với từng công ty. Kế toán không quyết định miễn giảm và không cấu hình hệ thống.", actionButton("Đồng bộ sao kê", "syncStatement") + actionButton("Khớp tự động", "autoMatchStatement", "primary"))}
  ${kpiGrid([
    kpi("Giao dịch sao kê kỳ này", String(COMMUNE_STATEMENT.length), `${COMMUNE_STATEMENT.length - open.length} đã khớp theo mã`, "success"),
    kpi("Dòng treo chờ xử lý", String(open.length), accMoney(open.reduce((sum, row) => sum + row.amount, 0)), "warning"),
    kpi("Công ty chưa nộp đủ", String(shortfall.length), shortfall.map(row => row.unit.name.replace("Công ty ", "")).join(" · ") || "Không có", shortfall.length ? "danger" : "success"),
    kpi("Phiếu thu đã phát", String(receiptsMonth.length), accMoney(receiptsMonth.reduce((sum, row) => sum + row.amount, 0)))
  ])}
  ${rules("Căn cứ đối soát kỳ " + PROCESSING_PERIOD, [`Phải nộp = số hộ đủ điều kiện × ${accMoney(PROCESSING_TARIFF.amount)}/hộ (${PROCESSING_TARIFF.code}, ${PROCESSING_TARIFF.status.toLowerCase()}).`, "Thực nộp = giao dịch đã khớp trên sao kê tài khoản xã + phiếu thu tiền mặt xã đã phát cho công ty.", "Tiền hộ trả cho công ty và tiền mặt nhân viên thu là nghiệp vụ nội bộ công ty, không đối soát ở đây."], "", "Đơn giá mẫu")}
  <div class="content-grid equal">
    ${panel("Việc cần làm", "Theo thứ tự chốt kỳ", `<div class="task-list">
      <article class="task-item"><span class="task-icon">1</span><div><h4>${open.length} dòng treo chưa rõ công ty/kỳ</h4><p>Gán tay, hoàn hoặc xác minh với công ty kê khai.</p></div><button class="button button-small" data-action="go:unmatched">Xử lý dòng treo</button></article>
      <article class="task-item"><span class="task-icon">2</span><div><h4>Đối soát thu gom với ${processingObligations().length} công ty</h4><p>Phải nộp so với thực nộp, ${shortfall.length} công ty còn thiếu.</p></div><button class="button button-small" data-action="go:unit-reconciliation">Đối soát thu gom</button></article>
      <article class="task-item"><span class="task-icon">3</span><div><h4>Đối soát tiền mặt với công ty</h4><p>Kê khai đã nộp so với phiếu thu xã đã phát.</p></div><button class="button button-small" data-action="go:cash-reconciliation">Đối soát tiền mặt</button></article>
      <article class="task-item"><span class="task-icon">4</span><div><h4>Lập báo cáo thu / nợ kỳ ${PROCESSING_PERIOD}</h4><p>2 báo cáo đang ở trạng thái dự thảo.</p></div><button class="button button-small" data-action="go:reports">Xuất báo cáo</button></article>
    </div>`)}
    ${panel("Điều kiện khóa sổ", "Hệ thống thật kiểm tra lại ở backend trước khi khóa", `<div class="steps"><div class="step-card blocked"><span class="step-number">1</span><h4>Danh sách hộ</h4><p>Còn hộ chờ xác minh (P0)</p></div><div class="step-card blocked"><span class="step-number">2</span><h4>Đơn giá xử lý</h4><p>Đang dùng đơn giá mẫu</p></div><div class="step-card"><span class="step-number">3</span><h4>Khớp tiền thực nộp</h4><p>${open.length} dòng treo, ${shortfall.length} công ty thiếu</p></div><div class="step-card"><span class="step-number">4</span><h4>Xác nhận báo cáo</h4><p>Dự thảo, chưa trình</p></div></div>`)}
  </div>`;
}

function processingStatements() {
  const units = [...new Set(COMMUNE_STATEMENT.filter(row => row.unit).map(row => row.unit))];
  return `${pageHeader("Tiền về xã", "Sao kê tài khoản xã · phần xử lý", "Chỉ hiển thị giao dịch vào tài khoản xã dùng cho phần xử lý; không trộn với tiền hộ trả vào tài khoản công ty.", actionButton("Đồng bộ sao kê", "syncStatement") + actionButton("Khớp tự động", "autoMatchStatement", "primary"))}
  ${summaryStrip([["Giao dịch", String(COMMUNE_STATEMENT.length), "Đồng bộ gần nhất 13/09/2026 15:10"], ["Đã khớp theo mã", String(COMMUNE_STATEMENT.filter(r => r.status === "Đã khớp").length), "Nội dung có mã công ty–kỳ"], ["Chưa rõ / chờ xác minh", String(COMMUNE_STATEMENT.filter(r => r.status !== "Đã khớp").length), "Chuyển sang dòng treo"], ["Tổng tiền đã khớp", accMoney(COMMUNE_STATEMENT.filter(r => r.status === "Đã khớp").reduce((s, r) => s + r.amount, 0)), "Kỳ 09/2026 và bổ sung 08/2026"]])}
  ${rules("Quy tắc khớp sao kê", ["Khớp tự động chỉ khi nội dung chuyển khoản có đủ mã công ty và kỳ (ví dụ DV01 XL 092026).", "Giao dịch thiếu mã giữ nguyên trên sao kê và đi vào dòng treo; không tự ghi nhận đã nộp.", "Nguồn sao kê: Vietcombank API (UAT) hoặc tệp .xlsx; mỗi lần đồng bộ có mã phiên chống tải trùng."])}
  <section data-table-filter data-chip-key="group" data-count-label="giao dịch">
    ${filterBar(filterField("Công ty", filterSelect("unit", [["all", "Tất cả"], ["none", "Chưa xác định"], ...units.map(id => [id, accUnitName(id)])])), "Mã giao dịch, nội dung chuyển khoản, công ty...")}
    ${chipBar([["all", "Tất cả"], ["open", "Chưa rõ / chờ xác minh", "warning"], ["matched", "Đã khớp", "success"]], "giao dịch")}
    ${panel("Giao dịch đã nhận", "", table(["Giao dịch", "Nội dung chuyển khoản", "Công ty", "Kỳ", { label: "Số tiền", num: true }, "Trạng thái", ""], COMMUNE_STATEMENT.map(statementRow), { empty: "Không có giao dịch phù hợp." }))}
  </section>`;
}

function processingUnmatched() {
  const rows = COMMUNE_STATEMENT.filter(row => row.status !== "Đã khớp").map(row => `<tr data-row data-group="${row.status === "Chưa rõ" ? "unknown" : "verify"}" data-search="${escapeHtml(`${row.id} ${row.content}`)}" class="is-attention">
    <td><span class="cell-title">${row.id}</span><span class="cell-subtitle">${row.date}</span></td>
    <td><span class="cell-title">${escapeHtml(row.content)}</span><span class="cell-subtitle">${escapeHtml(row.matchedBy)}</span></td>
    <td class="money">${accMoney(row.amount)}</td>
    <td>${row.id === "VCB2609109721" ? `${managementUnitLink("DV01")}<span class="cell-subtitle">KK-0926-DV01-2 · 1.250.000đ</span>` : `${managementUnitLink("DV02")}<span class="cell-subtitle">Kê khai cho 08 và 09/2026</span>`}</td>
    <td>${badge(row.status)}</td>
    <td><div class="table-actions"><button class="button button-small button-primary" data-action="assignUnmatched">Gán tay</button><button class="button button-small" data-action="verifyUnmatched">Xác minh</button><button class="button button-small" data-action="refundUnmatched">Hoàn</button></div></td></tr>`);
  return `${pageHeader("Ngoại lệ kế toán", "Dòng treo chờ xử lý", "Giao dịch thiếu mã hoặc lệch số tiền được giữ nguyên trên sao kê; kế toán gán tay theo kê khai công ty, xác minh hoặc hoàn lại.", actionButton("Tải danh sách", "exportData") + actionButton("Xử lý dòng treo", "assignUnmatched", "primary"))}
  ${summaryStrip([["Dòng treo", String(rows.length), "Kỳ 09/2026"], ["Tổng tiền treo", accMoney(COMMUNE_STATEMENT.filter(r => r.status !== "Đã khớp").reduce((s, r) => s + r.amount, 0)), "Chưa tính vào thực nộp"], ["Lâu nhất", "47 giờ", "VCB2609109721"], ["Kê khai khớp được", "2", "Cả hai dòng có công ty kê khai"]])}
  ${rules("Nguyên tắc xử lý dòng treo", ["Gán tay chỉ khi công ty đã kê khai đúng số tiền và kỳ; ghi người gán và căn cứ.", "Hoàn tiền phải qua đề nghị và lãnh đạo duyệt; kế toán không tự quyết định.", "Chưa xác minh xong thì không đưa vào thực nộp của công ty."], "warning")}
  <section data-table-filter data-chip-key="group" data-count-label="dòng">
    ${chipBar([["all", "Tất cả"], ["unknown", "Chưa rõ công ty/kỳ", "warning"], ["verify", "Chờ xác minh", "warning"]], "dòng")}
    ${panel("Hàng chờ xác minh", "", table(["Giao dịch", "Nội dung", { label: "Số tiền", num: true }, "Kê khai liên quan", "Trạng thái", ""], rows, { empty: "Không còn dòng treo." }))}
  </section>`;
}

function accountingReceipts() {
  const receiptRows = COMMUNE_RECEIPTS.map(row => `<tr data-row data-group="${row.status === "Đã hủy" ? "cancelled" : "issued"}" data-unit="${row.unit}" data-search="${escapeHtml(`${row.id} ${accUnitName(row.unit)} ${row.ref}`)}">
    <td><span class="cell-title">${row.id}</span><span class="cell-subtitle">${row.date} · kỳ ${row.period}</span></td>
    <td>${managementUnitLink(row.unit)}</td>
    <td>${row.method}<span class="cell-subtitle">${escapeHtml(row.ref)}</span></td>
    <td class="money">${accMoney(row.amount)}</td>
    <td>${badge(row.status, row.status === "Đã hủy" ? "danger" : "success")}${row.note ? `<span class="cell-subtitle">${escapeHtml(row.note)}</span>` : ""}</td>
    <td><div class="table-actions"><button class="button button-small" data-action="genericDetail">Xem</button>${row.status === "Đã hủy" ? "" : `<button class="button button-small button-danger" data-action="cancelCommuneReceipt">Hủy</button>`}</div></td></tr>`);
  const checkRows = COMPANY_RECEIPT_CHECKS.map(row => `<tr class="${/Cần|Yêu cầu|Chưa/.test(row.status) ? "is-attention" : ""}">
    <td>${managementUnitLink(row.unit)}<span class="cell-subtitle">${row.batch}</span></td>
    <td class="num">${row.count ? row.count.toLocaleString("vi-VN") : "—"}</td>
    <td class="money">${row.amount ? accMoney(row.amount) : "—"}</td>
    <td>${row.sent}</td>
    <td>${escapeHtml(row.issues)}</td>
    <td>${badge(row.status, row.status === "Đã kiểm tra" ? "success" : row.status === "Chưa gửi" ? "neutral" : "warning")}</td>
    <td>${row.status === "Đã kiểm tra" ? `<button class="button button-small" data-action="genericDetail">Xem</button>` : row.status === "Chưa gửi" ? `<button class="button button-small" data-action="requestReceiptFix">Nhắc gửi</button>` : `<button class="button button-small button-primary" data-action="requestReceiptFix">Yêu cầu điều chỉnh</button>`}</td></tr>`);
  return `${pageHeader("Chứng từ", "Phiếu thu của xã và biên lai công ty", "Xã phát phiếu thu cho khoản phần xử lý công ty nộp về; biên lai/HĐĐT cho hộ do công ty phát hành, kế toán kiểm tra và yêu cầu điều chỉnh khi sai.", actionButton("Phát hành phiếu thu", "issueCommuneReceipt", "primary"))}
  ${summaryStrip([["Phiếu thu đã phát", String(COMMUNE_RECEIPTS.filter(r => r.status === "Đã phát hành").length), "Kỳ 09/2026 và bổ sung"], ["Đã hủy", String(COMMUNE_RECEIPTS.filter(r => r.status === "Đã hủy").length), "Giữ số, không xóa"], ["Lô biên lai công ty gửi", String(COMPANY_RECEIPT_CHECKS.filter(r => r.count).length), "Trên 4 công ty"], ["Cần công ty điều chỉnh", String(COMPANY_RECEIPT_CHECKS.filter(r => /Cần|Yêu cầu/.test(r.status)).length), "Trùng số, hộ đã chấm dứt"]])}
  <section data-table-filter data-chip-key="group" data-count-label="phiếu">
    ${filterBar(filterField("Công ty", filterSelect("unit", [["all", "Tất cả"], ...MANAGEMENT_UNITS.slice(0, 4).map(u => [u.id, u.name])])), "Số phiếu, công ty, mã giao dịch...")}
    ${chipBar([["all", "Tất cả"], ["issued", "Đã phát hành", "success"], ["cancelled", "Đã hủy"]], "phiếu")}
    ${panel("Phiếu thu xã phát cho công ty", "Mỗi phiếu gắn với một giao dịch sao kê hoặc lần nộp tiền mặt tại xã", table(["Phiếu thu", "Công ty", "Hình thức / tham chiếu", { label: "Số tiền", num: true }, "Trạng thái", ""], receiptRows, { empty: "Không có phiếu thu phù hợp." }))}
  </section>
  <div class="stack-gap"></div>
  ${panel("Kiểm tra biên lai công ty phát cho hộ", "Kế toán không phát hành thay công ty; chỉ đối chiếu danh sách biên lai với kết quả thu công ty đã báo", table(["Công ty / lô", { label: "Số biên lai", num: true }, { label: "Tổng tiền", num: true }, "Ngày gửi", "Phát hiện", "Trạng thái", ""], checkRows, { static: true }))}`;
}

function processingReconciliation() {
  const rows = processingObligations().map(row => {
    const actual = processingActuals(row.unit.id);
    const gap = actual.total - row.obligation;
    const blocked = row.verifiedCount !== row.sourceCount;
    const state = gap === 0 ? "matched" : "attention";
    const status = gap === 0 ? "Đã khớp" : gap > 0 ? "Nộp thừa" : actual.total === 0 ? "Chưa nộp" : "Nộp thiếu";
    return `<tr data-row data-group="${state}" data-unit="${row.unit.id}" data-search="${escapeHtml(row.unit.name)}" class="${state === "attention" ? "is-attention" : ""}">
      <td>${managementUnitLink(row.unit.id)}<span class="cell-subtitle">${row.areas} khu vực${blocked ? " · còn hộ chờ xác minh" : ""}</span></td>
      <td class="num">${row.verifiedCount.toLocaleString("vi-VN")} / ${row.sourceCount.toLocaleString("vi-VN")}</td>
      <td class="num">${accMoney(PROCESSING_TARIFF.amount)}</td>
      <td class="money">${accMoney(row.obligation)}</td>
      <td class="money">${accMoney(actual.total)}<span class="cell-subtitle">CK ${accMoney(actual.transfer)}${actual.cash ? ` · TM ${accMoney(actual.cash)}` : ""}</span></td>
      <td>${delta(gap, gap === 0 ? "khớp" : gap > 0 ? "chờ bù trừ kỳ sau" : "còn phải nộp", accMoney)}</td>
      <td>${badge(status, gap === 0 ? "success" : gap > 0 ? "info" : "danger")}</td>
      <td><button class="button button-small" data-action="reviewProcessingReconciliation">Chi tiết</button></td></tr>`;
  });
  const totals = processingObligations().reduce((acc, row) => { const a = processingActuals(row.unit.id); acc.ob += row.obligation; acc.actual += a.total; return acc; }, { ob: 0, actual: 0 });
  return `${pageHeader("Đối soát", "Đối soát thu gom theo công ty", "Phải nộp = số hộ đủ điều kiện × đơn giá xử lý; thực nộp = sao kê đã khớp + phiếu thu tiền mặt. Chênh lệch được kết luận theo từng công ty, không theo nhân viên thu.", actionButton("Xuất bảng đối soát", "exportData") + actionButton("Đối soát thu gom", "reviewProcessingReconciliation", "primary"))}
  ${summaryStrip([["Phải nộp kỳ 09/2026", accMoney(totals.ob), `${processingObligations().length} công ty · đơn giá mẫu`], ["Thực nộp đã ghi nhận", accMoney(totals.actual), "Sao kê khớp + phiếu thu tiền mặt"], ["Chênh lệch", accMoney(totals.actual - totals.ob), totals.actual < totals.ob ? "Còn phải nộp" : "Nộp thừa"], ["Dòng treo chưa tính", accMoney(COMMUNE_STATEMENT.filter(r => r.status !== "Đã khớp").reduce((s, r) => s + r.amount, 0)), "Sẽ cập nhật sau khi gán"]])}
  ${rules(`Đơn giá ${PROCESSING_TARIFF.code}: ${accMoney(PROCESSING_TARIFF.amount)}/hộ/kỳ — ${PROCESSING_TARIFF.status}`, [PROCESSING_TARIFF.note + ".", "Số hộ đủ điều kiện vẫn còn hộ chờ xác minh (P0 danh sách hộ); số phải nộp sẽ thay đổi khi chốt danh sách.", "Ngưỡng cảnh báo chênh lệch chưa cấu hình; mọi chênh lệch khác 0 đều hiện ở nhóm Cần xử lý."], "warning", "Đơn giá mẫu")}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    ${filterBar(filterField("Công ty", filterSelect("unit", [["all", "Tất cả công ty"], ...processingObligations().map(row => [row.unit.id, row.unit.name])])), "Tên công ty...")}
    ${chipBar([["all", "Tất cả"], ["attention", "Cần xử lý", "warning"], ["matched", "Đã khớp", "success"]], "công ty")}
    ${panel("Đối soát kỳ 09/2026", "Mỗi chỉ tiêu mở được xuống danh sách hộ, phiên bản đơn giá và giao dịch đã dùng", table(["Công ty", { label: "Hộ đủ ĐK / nguồn", num: true }, { label: "Đơn giá", num: true }, { label: "Phải nộp", num: true }, { label: "Thực nộp", num: true }, { label: "Chênh lệch", num: true }, "Trạng thái", ""], rows, { empty: "Không có công ty phù hợp." }))}
  </section>`;
}

function cashReconciliation() {
  const rows = processingObligations().map(row => {
    const declared = COMPANY_REMITTANCES.filter(r => r.unit === row.unit.id && r.period === PROCESSING_PERIOD);
    const declaredTotal = declared.reduce((s, r) => s + r.amount, 0);
    const declaredCash = declared.filter(r => r.method === "Tiền mặt tại xã").reduce((s, r) => s + r.amount, 0);
    const received = processingActuals(row.unit.id);
    const gap = received.total - declaredTotal;
    const cashGap = received.cash - declaredCash;
    const state = gap === 0 ? "matched" : "attention";
    return `<tr data-row data-group="${state}" data-search="${escapeHtml(row.unit.name)}" class="${state === "attention" ? "is-attention" : ""}">
      <td>${managementUnitLink(row.unit.id)}<span class="cell-subtitle">${declared.length} lần kê khai</span></td>
      <td class="money">${accMoney(declaredTotal)}<span class="cell-subtitle">TM ${accMoney(declaredCash)}</span></td>
      <td class="money">${accMoney(received.total)}<span class="cell-subtitle">TM ${accMoney(received.cash)}</span></td>
      <td>${delta(gap, gap === 0 ? "khớp kê khai" : gap < 0 ? "kê khai chưa có chứng từ" : "nhận nhiều hơn kê khai", accMoney)}</td>
      <td>${delta(cashGap, cashGap === 0 ? "tiền mặt khớp" : "tiền mặt chưa có phiếu thu", accMoney)}</td>
      <td>${badge(gap === 0 ? "Đã khớp" : "Chênh lệch", gap === 0 ? "success" : "danger")}</td>
      <td><button class="button button-small ${gap ? "button-primary" : ""}" data-action="cashReconcile">${gap ? "Đối soát tiền mặt" : "Xem"}</button></td></tr>`;
  });
  const declaredRows = COMPANY_REMITTANCES.map(r => `<tr><td><span class="cell-title">${r.id}</span><span class="cell-subtitle">${r.date}</span></td><td>${managementUnitLink(r.unit)}</td><td>${r.method}<span class="cell-subtitle">${escapeHtml(r.ref)}</span></td><td class="money">${accMoney(r.amount)}</td><td>${badge(r.status, /Đã/.test(r.status) ? "success" : "warning")}${r.note ? `<span class="cell-subtitle">${escapeHtml(r.note)}</span>` : ""}</td></tr>`);
  return `${pageHeader("Đối soát", "Đối soát tiền mặt với công ty", "So số công ty kê khai đã nộp (tiền mặt tại xã và chuyển khoản) với số xã đã nhận có chứng từ. Tiền mặt của nhân viên thu do công ty tự đối soát nội bộ.", actionButton("Xuất báo cáo", "exportData") + actionButton("Đối soát tiền mặt", "cashReconcile", "primary"))}
  ${summaryStrip([["Công ty kê khai đã nộp", accMoney(COMPANY_REMITTANCES.filter(r => r.period === PROCESSING_PERIOD).reduce((s, r) => s + r.amount, 0)), "6 lần kê khai"], ["Xã đã nhận có chứng từ", accMoney(processingObligations().reduce((s, row) => s + processingActuals(row.unit.id).total, 0)), "Sao kê khớp + phiếu thu"], ["Kê khai chưa có chứng từ", accMoney(COMPANY_REMITTANCES.filter(r => /Chưa/.test(r.status)).reduce((s, r) => s + r.amount, 0)), "2 lần kê khai"], ["Tiền mặt tại xã", accMoney(COMMUNE_RECEIPTS.filter(r => r.method === "Tiền mặt tại xã" && r.status === "Đã phát hành").reduce((s, r) => s + r.amount, 0)), "Đã có phiếu thu"]])}
  ${rules("Phạm vi đối soát tiền mặt", ["Chỉ đối soát giữa công ty và xã: kê khai của công ty so với phiếu thu/sao kê của xã.", "Kê khai chưa có phiếu thu phải được thủ quỹ xã xác nhận trước khi tính là thực nộp.", "Tiền mặt nhân viên thu nộp cho công ty là quy trình nội bộ của công ty, xã không xác nhận."])}
  <section data-table-filter data-chip-key="group" data-count-label="công ty">
    ${chipBar([["all", "Tất cả"], ["attention", "Chênh lệch", "warning"], ["matched", "Đã khớp", "success"]], "công ty")}
    ${panel("Kê khai so với chứng từ theo công ty", "", table(["Công ty", { label: "Kê khai đã nộp", num: true }, { label: "Xã đã nhận", num: true }, { label: "Chênh lệch", num: true }, { label: "Riêng tiền mặt", num: true }, "Trạng thái", ""], rows, { empty: "Không có công ty phù hợp." }))}
  </section>
  <div class="stack-gap"></div>
  ${panel("Các lần công ty kê khai", "Kê khai không tự đồng nghĩa tiền đã được xác nhận", table(["Kê khai", "Công ty", "Hình thức / tham chiếu", { label: "Số tiền", num: true }, "Trạng thái"], declaredRows, { static: true }))}`;
}

function alignedAccountingReports() {
  const rows = ACCOUNTING_REPORTS.map(r => `<tr data-row data-group="${r.status === "Dự thảo" ? "draft" : "done"}" data-search="${escapeHtml(`${r.id} ${r.title} ${r.period}`)}"><td><span class="cell-title">${r.id}</span><span class="cell-subtitle">${escapeHtml(r.title)}</span></td><td>${r.period}</td><td>${r.author}<span class="cell-subtitle">${r.updated}</span></td><td>${badge(r.status, r.status === "Dự thảo" ? "warning" : "success")}<span class="cell-subtitle">${escapeHtml(r.note)}</span></td><td><div class="table-actions">${r.status === "Dự thảo" ? `<button class="button button-small button-primary" data-action="createProcessingReport">Trình lãnh đạo</button>` : ""}<button class="button button-small" data-action="exportData">Xuất</button></div></td></tr>`);
  return `${pageHeader("Báo cáo kế toán", "Báo cáo thu và công nợ phần xử lý", "Kế toán lập báo cáo theo công ty và kỳ; lãnh đạo xác nhận báo cáo trước khi kế toán khóa sổ.", actionButton("Xuất báo cáo", "exportData") + actionButton("Lập báo cáo", "createProcessingReport", "primary"))}
  ${summaryStrip([["Báo cáo kỳ 09/2026", "2", "Đang dự thảo"], ["Đã xác nhận", "1", "Kỳ 08/2026, đã khóa sổ"], ["Công ty còn nợ phần xử lý", String(processingObligations().filter(row => processingActuals(row.unit.id).total < row.obligation).length), "Theo bảng đối soát"], ["Dòng treo chưa tính", String(COMMUNE_STATEMENT.filter(r => r.status !== "Đã khớp").length), "Cần xử lý trước khi trình"]])}
  <section data-table-filter data-chip-key="group" data-count-label="báo cáo">
    ${chipBar([["all", "Tất cả"], ["draft", "Dự thảo", "warning"], ["done", "Đã xác nhận", "success"]], "báo cáo")}
    ${panel("Danh sách báo cáo", "", table(["Báo cáo", "Kỳ", "Người lập", "Trạng thái", ""], rows, { empty: "Không có báo cáo phù hợp." }))}
  </section>`;
}

function companyProcessingObligation() {
  const areas = companyScopeAreas();
  const row = processingObligations().find(r => r.unit.id === COMPANY_SCOPE_ID);
  const actual = processingActuals(COMPANY_SCOPE_ID);
  const rows = areas.map((area, index) => { const verified = Math.max(area.households - (index + 1) * 2, 0); return `<tr><td>${area.name}<span class="cell-subtitle">${area.id}</span></td><td class="num">${area.households}</td><td class="num">${verified}</td><td>${badge("Chờ chốt danh sách", "warning")}</td><td class="num">${accMoney(PROCESSING_TARIFF.amount)}</td><td class="money">${accMoney(verified * PROCESSING_TARIFF.amount)}</td></tr>`; });
  return `${pageHeader("Nghĩa vụ công ty", "Phần xử lý phải nộp", "Phải nộp = số hộ thuộc phạm vi đã xác minh × đơn giá xử lý. Đơn giá hiện là số mẫu, số phải nộp sẽ chốt lại khi có danh sách hộ và đơn giá chính thức.", actionButton("Tải bảng căn cứ", "exportData") + actionButton("Kê khai tiền đã nộp", "go:processing-remittance", "primary"))}
  ${summaryStrip([["Hộ đủ điều kiện", `${row.verifiedCount.toLocaleString("vi-VN")} / ${row.sourceCount.toLocaleString("vi-VN")}`, "Còn hộ chờ xã xác minh"], ["Đơn giá xử lý", `${accMoney(PROCESSING_TARIFF.amount)}/hộ`, PROCESSING_TARIFF.status], ["Phải nộp kỳ 09/2026", accMoney(row.obligation), "Theo đơn giá mẫu"], ["Xã đã ghi nhận", accMoney(actual.total), `Còn ${accMoney(row.obligation - actual.total)}`]])}
  ${rules("Đơn giá đang dùng là số minh họa", [PROCESSING_TARIFF.note + ".", "Hệ thống không tự lấy số hộ trong file công ty làm số hộ đủ điều kiện."], "warning")}
  ${panel("Căn cứ tính theo khu vực", "Chỉ hình thành nghĩa vụ chính thức khi danh sách và đơn giá đều đã được xác nhận", table(["Khu vực", { label: "Hộ nguồn", num: true }, { label: "Hộ đủ điều kiện", num: true }, "Tình trạng dữ liệu", { label: "Đơn giá", num: true }, { label: "Phải nộp", num: true }], rows, { static: true }))}`;
}

function companyProcessingRemittance() {
  const rows = COMPANY_REMITTANCES.filter(r => r.unit === COMPANY_SCOPE_ID).map(r => `<tr><td><span class="cell-title">${r.id}</span><span class="cell-subtitle">${r.date} · kỳ ${r.period}</span></td><td>${r.method}<span class="cell-subtitle">${escapeHtml(r.ref)}</span></td><td class="money">${accMoney(r.amount)}</td><td>${badge(r.status, /Đã/.test(r.status) ? "success" : "warning")}${r.note ? `<span class="cell-subtitle">${escapeHtml(r.note)}</span>` : ""}</td><td><button class="button button-small" data-action="genericDetail">Xem</button></td></tr>`);
  const total = COMPANY_REMITTANCES.filter(r => r.unit === COMPANY_SCOPE_ID).reduce((s, r) => s + r.amount, 0);
  return `${pageHeader("Tiền nộp về xã", "Kê khai phần xử lý đã nộp", "Kê khai giao dịch để kế toán xã tìm trên sao kê và phát phiếu thu. Kê khai không tự đồng nghĩa tiền đã được xác nhận.", actionButton("Kê khai giao dịch", "submitProcessingRemittance", "primary"))}
  ${summaryStrip([["Đã kê khai kỳ 09/2026", accMoney(total), "2 giao dịch"], ["Xã đã khớp", accMoney(processingActuals(COMPANY_SCOPE_ID).total), "Có phiếu thu PT-0926-001"], ["Chưa khớp", accMoney(1250000), "VCB2609109721 thiếu mã"], ["Còn phải nộp", accMoney(PROCESSING_OB.DV01 - processingActuals(COMPANY_SCOPE_ID).total), "Theo đơn giá mẫu"]])}
  ${rules("Cách kê khai để được khớp tự động", ["Nội dung chuyển khoản ghi: mã công ty + XL + kỳ, ví dụ “DV01 XL 092026”.", "Nộp tiền mặt tại xã thì kê khai số phiếu thu do thủ quỹ xã cấp."])}
  ${panel("Lịch sử kê khai", "", table(["Kê khai", "Hình thức / tham chiếu", { label: "Số tiền", num: true }, "Trạng thái", ""], rows, { static: true }))}`;
}

Object.assign(VIEW_RENDERERS, {
  accountingProcessingDashboard,
  processingStatements,
  processingUnmatched,
  accountingReceipts,
  processingReconciliation,
  cashReconciliation,
  accountingReports: alignedAccountingReports,
  companyProcessingObligation,
  companyProcessingRemittance
});

Object.assign(DIALOG_SPECS, {
  autoMatchStatement: {
    eyebrow: "Khớp sao kê", title: "Khớp tự động theo mã công ty–kỳ", description: "Chỉ khớp giao dịch có nội dung đủ mã; giao dịch thiếu mã vẫn nằm ở dòng treo.", confirm: "Chạy khớp mô phỏng",
    summary: [["Giao dịch chưa khớp", "2"], ["Có mã hợp lệ", "0"], ["Sẽ vào dòng treo", "2"]],
    fields: [
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "checkbox", label: "Chỉ khớp khi số tiền bằng đúng số công ty kê khai", checked: true, full: true },
      { type: "checkbox", label: "Tự phát phiếu thu cho giao dịch khớp thành công", checked: true, full: true }
    ]
  },
  matchStatement: {
    eyebrow: "Khớp sao kê", title: "Khớp giao dịch theo mã kê khai", description: "Chọn kê khai của công ty có cùng số tiền và kỳ; ghi căn cứ khớp.", confirm: "Khớp mô phỏng",
    summary: [["Giao dịch", "VCB2609109721"], ["Số tiền", "1.250.000đ"], ["Nội dung", "NOP TIEN RAC T9"]],
    fields: [
      { type: "select", label: "Kê khai của công ty", options: ["KK-0926-DV01-2 · Công ty MTĐT Đông Thạnh · 1.250.000đ", "Không có kê khai phù hợp"], required: true },
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "textarea", label: "Căn cứ khớp", placeholder: "Ví dụ: công ty xác nhận bằng văn bản ngày 15/09", required: true, full: true }
    ]
  },
  assignUnmatched: {
    eyebrow: "Dòng treo", title: "Gán tay giao dịch cho công ty và kỳ", description: "Kế toán gán theo kê khai công ty; hệ thống ghi người gán và căn cứ, không xóa dòng sao kê gốc.", confirm: "Gán mô phỏng",
    summary: [["Giao dịch", "VCB2609109721"], ["Số tiền", "1.250.000đ"], ["Treo", "47 giờ"]],
    fields: [
      { type: "select", label: "Công ty", options: ["Công ty MTĐT Đông Thạnh (kê khai KK-0926-DV01-2)", "HTX Môi trường An Phú", "Khác"], required: true },
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "checkbox", label: "Phát phiếu thu sau khi gán", checked: true, full: true },
      { type: "textarea", label: "Căn cứ", placeholder: "Văn bản/email công ty xác nhận nội dung chuyển khoản", required: true, full: true }
    ]
  },
  verifyUnmatched: {
    eyebrow: "Dòng treo", title: "Gửi xác minh tới công ty", description: "Yêu cầu công ty xác nhận giao dịch thuộc kỳ nào; dòng treo giữ trạng thái chờ xác minh.", confirm: "Gửi xác minh mô phỏng",
    fields: [
      { type: "select", label: "Công ty", options: ["HTX Môi trường An Phú", "Công ty MTĐT Đông Thạnh"], required: true },
      { type: "textarea", label: "Nội dung xác minh", value: "Giao dịch VCB2609111202 · 500.000đ ngày 12/09 được kê khai cho hai kỳ. Đề nghị xác nhận kỳ áp dụng.", required: true, full: true },
      { type: "date", label: "Hạn phản hồi", value: "2026-09-20", required: true }
    ]
  },
  refundUnmatched: {
    eyebrow: "Dòng treo", title: "Lập đề nghị hoàn giao dịch", description: "Kế toán không tự hoàn; đề nghị hoàn phải được lãnh đạo duyệt trước khi chuyển tiền.", confirm: "Lập đề nghị mô phỏng",
    fields: [
      { label: "Giao dịch", value: "VCB2609109721 · 1.250.000đ", readonly: true },
      { type: "select", label: "Lý do hoàn", options: ["Chuyển nhầm tài khoản xã", "Chuyển trùng", "Không xác định được công ty sau xác minh"], required: true },
      { label: "Tài khoản nhận hoàn", placeholder: "Số tài khoản pháp nhân công ty", required: true },
      { type: "textarea", label: "Căn cứ", required: true, full: true }
    ]
  },
  issueCommuneReceipt: {
    eyebrow: "Chứng từ của xã", title: "Phát hành phiếu thu cho công ty", description: "Phiếu thu gắn với một giao dịch sao kê đã khớp hoặc một lần nộp tiền mặt tại xã.", confirm: "Phát hành mô phỏng",
    fields: [
      { type: "select", label: "Công ty", options: APP_DATA.contractors.slice(0, 4), required: true },
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "select", label: "Hình thức", options: ["Tiền mặt tại xã", "Chuyển khoản (giao dịch đã khớp)"], required: true },
      { label: "Số tiền", placeholder: "Đúng bằng số nhận", required: true },
      { label: "Tham chiếu", placeholder: "Mã giao dịch sao kê hoặc số phiếu thủ quỹ", required: true },
      { type: "textarea", label: "Nội dung", value: "Thu phần xử lý chất thải rắn sinh hoạt kỳ 09/2026", full: true }
    ]
  },
  cancelCommuneReceipt: {
    eyebrow: "Chứng từ của xã", title: "Hủy phiếu thu", description: "Phiếu bị hủy giữ nguyên số, ghi lý do và phiếu thay thế; không xóa khỏi hệ thống.", confirm: "Hủy mô phỏng",
    fields: [
      { label: "Phiếu thu", value: "PT-0926-003 · HTX Xanh Nhị Bình", readonly: true },
      { type: "select", label: "Lý do hủy", options: ["Sai số tiền", "Sai công ty/kỳ", "Giao dịch bị ngân hàng hoàn lại"], required: true },
      { type: "checkbox", label: "Phát phiếu thay thế ngay sau khi hủy", checked: true, full: true },
      { type: "textarea", label: "Ghi chú", required: true, full: true }
    ]
  },
  requestReceiptFix: {
    eyebrow: "Biên lai công ty", title: "Yêu cầu công ty điều chỉnh biên lai", description: "Kế toán không hủy thay công ty; gửi yêu cầu kèm danh sách biên lai sai để công ty hủy/phát lại.", confirm: "Gửi yêu cầu mô phỏng",
    fields: [
      { type: "select", label: "Công ty", options: ["Công ty MTĐT Đông Thạnh · BL-0926-DV01-01", "HTX Xanh Nhị Bình · BL-0926-DV04-01", "Công ty Dịch vụ Hóc Môn · chưa gửi"], required: true },
      { type: "select", label: "Loại yêu cầu", options: ["Hủy biên lai trùng số", "Hủy biên lai hộ đã chấm dứt", "Gửi danh sách biên lai kỳ này"], required: true },
      { type: "textarea", label: "Danh sách biên lai liên quan", value: "BL-0926-000418, BL-0926-000418 (trùng), BL-0926-000731", full: true },
      { type: "date", label: "Hạn xử lý", value: "2026-09-22", required: true }
    ]
  },
  reviewProcessingReconciliation: {
    eyebrow: "Đối soát thu gom", title: "Chi tiết đối soát theo công ty", description: "Mỗi chỉ tiêu truy nguyên được: danh sách hộ, phiên bản đơn giá, giao dịch và phiếu thu đã dùng.", confirm: "Ghi nhận kết quả mô phỏng",
    summary: [["Công ty", "Công ty Dịch vụ Hóc Môn"], ["Phải nộp", "Theo đơn giá mẫu"], ["Thực nộp", "3.000.000đ tiền mặt"]],
    fields: [
      { type: "select", label: "Kết luận", options: ["Nộp thiếu · gửi thông báo công ty", "Nộp thừa · bù trừ kỳ sau", "Đã khớp"], required: true },
      { type: "date", label: "Hạn nộp bổ sung", value: "2026-09-25" },
      { type: "textarea", label: "Ghi chú đối soát", placeholder: "Căn cứ và trao đổi với đầu mối công ty", full: true },
      { type: "checkbox", label: "Số hộ và đơn giá đang là số mẫu, chưa phải kết luận chính thức", checked: true, required: true, full: true }
    ]
  },
  cashReconcile: {
    eyebrow: "Đối soát tiền mặt", title: "Đối soát tiền mặt với công ty", description: "So kê khai nộp tiền mặt của công ty với phiếu thu thủ quỹ xã đã phát; chênh lệch phải có biên bản.", confirm: "Lập biên bản mô phỏng",
    summary: [["Công ty", "Công ty Dịch vụ Hóc Môn"], ["Kê khai tiền mặt", "8.000.000đ"], ["Phiếu thu đã phát", "3.000.000đ"]],
    fields: [
      { type: "select", label: "Kết quả", options: ["Chênh lệch · công ty chưa nộp 5.000.000đ", "Chênh lệch · xã chưa cấp phiếu thu", "Đã khớp"], required: true },
      { type: "select", label: "Xác nhận của thủ quỹ xã", options: ["Chưa nhận tiền", "Đã nhận, chưa cấp phiếu"], required: true },
      { type: "textarea", label: "Nội dung biên bản", placeholder: "Người đại diện hai bên, thời điểm, số tiền", required: true, full: true }
    ]
  },
  createProcessingReport: {
    eyebrow: "Báo cáo kế toán", title: "Lập và trình báo cáo đối soát", description: "Báo cáo lấy số từ bảng đối soát tại thời điểm lập; lãnh đạo xác nhận, kế toán khóa sổ sau.", confirm: "Trình mô phỏng",
    fields: [
      { type: "select", label: "Loại báo cáo", options: ["Đối soát phần xử lý theo công ty", "Công nợ phần xử lý chưa nộp", "Tổng hợp thu kỳ"], required: true },
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "checkbox", label: "Kèm bảng dòng treo chưa xử lý", checked: true, full: true },
      { type: "checkbox", label: "Ghi rõ đơn giá và danh sách hộ đang là số mẫu", checked: true, required: true, full: true },
      { type: "textarea", label: "Ý kiến kế toán", full: true }
    ]
  },
  submitProcessingRemittance: {
    eyebrow: "Công ty kê khai", title: "Kê khai giao dịch nộp phần xử lý", description: "Kế toán xã sẽ tìm giao dịch trên sao kê hoặc phiếu thu; kê khai chưa phải xác nhận đã nộp.", confirm: "Gửi kê khai mô phỏng",
    fields: [
      { type: "select", label: "Kỳ", options: ["09/2026", "08/2026"], required: true },
      { type: "select", label: "Hình thức", options: ["Chuyển khoản vào tài khoản xã", "Tiền mặt tại xã"], required: true },
      { label: "Số tiền", placeholder: "VND", required: true },
      { label: "Mã giao dịch / số phiếu thu", placeholder: "VCB... hoặc PT-...", required: true },
      { type: "date", label: "Ngày nộp", value: "2026-09-16", required: true },
      { type: "file", label: "Chứng từ đính kèm", help: "Ủy nhiệm chi hoặc phiếu thu của thủ quỹ xã" }
    ]
  }
});
