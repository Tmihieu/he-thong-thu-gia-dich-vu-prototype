"use strict";

// Intake is a UI simulation. No Excel parser, upload, persistence or approval is implemented.
const INTAKE_COMPANY = "DV01";
const INTAKE_FIELDS = [
  ["sourceCode", "Mã hộ tại công ty", false], ["name", "Người đại diện / tên cơ sở", true],
  ["address", "Địa chỉ sử dụng dịch vụ", true], ["area", "Khu vực / tổ dân phố", false],
  ["type", "Loại đối tượng", false], ["phone", "Số điện thoại", false],
  ["service", "Tình trạng phục vụ khai báo", false], ["dates", "Ngày bắt đầu / ngừng", false], ["note", "Ghi chú", false]
];
const INTAKE_LAYOUTS = {
  DV01: ["STT", "Ma KH", "Chu ho", "Dia chi", "To", "Nhom ho", "Dien thoai", "Trang thai", "Ngay DV", "Ghi chu"],
  DV02: ["Mã khách", "Tên khách hàng", "Nơi thu gom", "Tổ dân phố", "Phân loại", "Liên hệ", "Đang thu gom", "Thời gian", "Thông tin thêm"]
};
const INTAKE_BATCHES = [
  { id: "TN-001", unit: "DV01", file: "Danh_sach_Dong_Thanh.xlsx", received: "15/09/2026", actor: "Cán bộ xã · tài khoản mẫu" },
  { id: "TN-002", unit: "DV02", file: "Khach_hang_An_Phu.xlsx", received: "15/09/2026", actor: "Cán bộ xã · tài khoản mẫu" }
];
const INTAKE_CASES = {
  clean: ["Chưa thấy lỗi cấu trúc", "Thông tin đủ để rà soát; chưa xác nhận là hộ chuẩn hoặc đã được phục vụ."],
  missing: ["Thiếu thông tin", "Thiếu địa chỉ sử dụng dịch vụ. Giữ dòng gốc, yêu cầu công ty bổ sung."],
  duplicate: ["Nghi trùng trong tệp", "Tên, địa chỉ và điện thoại gần giống một dòng cùng tệp. Chưa tự gộp."],
  cross: ["Nhiều công ty cùng khai", "Hai nguồn có thông tin gần giống. Chưa kết luận là cùng hộ hoặc công ty nào phục vụ."],
  sameName: ["Cùng tên, khác địa chỉ", "Không xác định trùng chỉ dựa vào tên người đại diện."],
  sameAddress: ["Cùng địa chỉ, nhiều hộ", "Có thể là nhiều hộ ở chung/thuê nhà. Giữ riêng và chờ làm rõ."],
  unknown: ["Chưa rõ đơn vị phục vụ", "Công ty cung cấp dữ liệu chưa đồng nghĩa là đơn vị đang phục vụ hộ này."],
  mismatch: ["Khác phân công khu vực", "Khai báo công ty khác đơn vị được giao khu vực trong mẫu. Giữ cả hai thông tin để xác minh."],
  change: ["Biến động cần xác minh", "Có khai báo ngừng dịch vụ/chuyển đi/đổi đại diện; chưa ghi đè lịch sử." ]
};
const INTAKE_ROWS = [
  { id: "R01", batch: "TN-001", line: 2, code: "DT001", name: "  Nguyễn   Văn An  ", address: "12 Đường số 1", area: "Tổ dân phố 01", type: "Hộ gia đình", phone: "0900000001", service: "Đang phục vụ", issue: "duplicate", peer: "R02" },
  { id: "R02", batch: "TN-001", line: 3, code: "DT001b", name: "Nguyễn Văn An", address: "12 Đường số 1", area: "Tổ dân phố 01", type: "Hộ gia đình", phone: "0900000001", service: "Đang phục vụ", issue: "duplicate", peer: "R01" },
  { id: "R03", batch: "TN-001", line: 4, code: "DT003", name: "Trần Thị Bình", address: "", area: "", type: "Chưa xác định", phone: "", service: "Chưa xác định", issue: "missing" },
  { id: "R04", batch: "TN-001", line: 5, code: "DT004", name: "Lê Minh Châu", address: "18 Đường số 2", area: "Tổ dân phố 02", type: "Hộ gia đình", phone: "0900000004", service: "Đang phục vụ", issue: "cross", peer: "R10" },
  { id: "R05", batch: "TN-001", line: 6, code: "DT005", name: "Phạm Văn Dũng", address: "20 Đường số 1", area: "Tổ dân phố 01", type: "Hộ gia đình", phone: "", service: "Đang phục vụ", issue: "sameName", peer: "R11" },
  { id: "R06", batch: "TN-001", line: 7, code: "DT006", name: "Võ Thị Hà", address: "30 Đường số 1", area: "Tổ dân phố 01", type: "Hộ gia đình", phone: "", service: "Đang phục vụ", issue: "sameAddress", peer: "R07" },
  { id: "R07", batch: "TN-001", line: 8, code: "DT007", name: "Nguyễn Thị Lan", address: "30 Đường số 1", area: "Tổ dân phố 01", type: "Hộ gia đình", phone: "", service: "Đang phục vụ", issue: "sameAddress", peer: "R06" },
  { id: "R08", batch: "TN-001", line: 9, code: "DT008", name: "Cơ sở Minh Anh", address: "40 Đường số 1", area: "Tổ dân phố 01", type: "Cơ sở", phone: "", service: "Chưa xác định", issue: "unknown" },
  { id: "R09", batch: "TN-001", line: 10, code: "DT009", name: "Lê Văn Nam", address: "42 Đường số 1", area: "Tổ dân phố 01", type: "Hộ gia đình", phone: "", service: "Khai đã ngừng", issue: "change", note: "Công ty khai chuyển đi, chưa có ngày/căn cứ xác minh" },
  { id: "R10", batch: "TN-002", line: 2, code: "AP004", name: "Lê Minh Châu", address: "18 Đường số 2", area: "Tổ dân phố 02", type: "Hộ gia đình", phone: "0900000004", service: "Đang phục vụ", issue: "cross", peer: "R04" },
  { id: "R11", batch: "TN-002", line: 3, code: "AP005", name: "Phạm Văn Dũng", address: "99 Đường số 2", area: "Tổ dân phố 02", type: "Hộ gia đình", phone: "", service: "Đang phục vụ", issue: "sameName", peer: "R05" },
  { id: "R12", batch: "TN-002", line: 4, code: "AP006", name: "Hộ kinh doanh Hoa Mai", address: "36 Đường số 2", area: "Tổ dân phố 02", type: "Hộ kinh doanh", phone: "", service: "Đang phục vụ", issue: "clean" },
  { id: "R13", batch: "TN-002", line: 5, code: "AP007", name: "Trần Văn Phúc", address: "45 Đường số 3", area: "Tổ dân phố 03", type: "Hộ gia đình", phone: "", service: "Đang phục vụ", issue: "mismatch", note: "Khu vực mẫu giao Công ty Dịch vụ Hóc Môn; nguồn AP khai đang phục vụ" }
];
const INTAKE_REQUESTS = [{ id: "BS-001", unit: "DV01", rowId: "R03", content: "Đề nghị bổ sung địa chỉ sử dụng dịch vụ và tổ dân phố cho dòng 4 trong TN-001.", status: "Chờ bổ sung", created: "15/09/2026" }];
let intakeDialog = null;
let intakeDraft = null;
let intakeFilter = { unit: "all", issue: "all", search: "" };
const intakeBatch = row => INTAKE_BATCHES.find(b => b.id === row.batch);
const intakeUnitName = id => managementUnit(id)?.name || "Chưa xác định";
const intakeClean = value => String(value || "").trim().replace(/\s+/g, " ");
const intakeAccessible = row => currentRole === "commune" || currentRole === "company" && intakeBatch(row).unit === INTAKE_COMPANY;
const intakeButton = (label, action, id = "", tone = "secondary") => `<button type="button" class="button button-${tone}" data-intake="${action}" data-id="${id}">${label}</button>`;
const intakeEmptyBase = () => `${rules(`Xã chưa có danh sách hộ chuẩn để đối chiếu`, [`Dữ liệu dưới đây là các khai báo nguồn, không phải số hộ chính thức. Chỉ phát hiện vấn đề giữa nguồn và kiểm tra thông tin; chưa thể kết luận công ty khai thiếu hộ. Người có quyền xác nhận danh sách chuẩn chưa được chốt.`], "warning")}`;
function intakeHome() {
  return `${pageHeader("Dữ liệu đầu vào", "Tiếp nhận dữ liệu hộ", "Xã nhận Excel do công ty gửi bên ngoài, ghép cột và kiểm tra trước khi rà soát.", intakeButton("Tiếp nhận Excel", "start", "", "primary") + actionButton("Đối chiếu danh sách", "go:data-comparison"))}
  ${intakeEmptyBase()}
  ${summaryStrip([["Lô đã tiếp nhận", String(INTAKE_BATCHES.length), "Lưu nguồn công ty và người nhập"], ["Dòng dữ liệu nguồn", String(INTAKE_ROWS.length), "Không đồng nghĩa số hộ duy nhất"], ["Cần rà soát", String(INTAKE_ROWS.filter(r => r.issue !== "clean").length), "Không tự gộp hoặc gán công ty"], ["Danh sách chuẩn", "Chưa có", "Chưa triển khai duyệt chính thức"]])}
  <div class="steps" style="margin-bottom:16px">${[["Nhận tệp từ công ty", "Excel gửi qua kênh ngoài, cán bộ xã tiếp nhận"], ["Ghép cột dữ liệu", "Ánh xạ cột của từng công ty về bộ trường chung"], ["Xem lỗi / thông tin sạch", "Không tự đoán trường thiếu"], ["Đối chiếu và bổ sung", "Yêu cầu công ty bổ sung, chờ xác minh"]].map(([t, d], i) => `<div class="step-card"><span class="step-number">${i + 1}</span><h4>${t}</h4><p>${d}</p></div>`).join("")}</div>
  ${panel("Bộ trường dữ liệu tiếp nhận", "Tên cột Excel của từng công ty có thể khác nhau; cán bộ ghép về các trường chung trước khi kiểm tra.", table(["Trường chung", "Mức yêu cầu", "Nguyên tắc"], INTAKE_FIELDS.map(([key, label, required]) => `<tr><td>${label}</td><td>${badge(required ? "Bắt buộc ghép cột" : "Có thể chưa cung cấp", required ? "info" : "neutral")}</td><td>${key === "sourceCode" ? "Giữ mã gốc để truy vết" : key === "address" ? "Giữ cả địa chỉ gốc và bản chuẩn hóa đề xuất" : key === "service" ? "Là khai báo nguồn, chưa phải kết luận" : "Không tự suy đoán giá trị còn thiếu"}</td></tr>`)))}
  ${panel("Lô dữ liệu công ty cung cấp", "Tệp gốc và dòng gốc được giữ để truy vết; dòng lỗi không bị loại âm thầm.", table(["Lô / tên tệp", "Công ty cung cấp", "Ngày / người nhập", "Số dòng", "Trạng thái", ""], INTAKE_BATCHES.map(b => `<tr><td><strong>${b.id}</strong><span class="cell-subtitle">${escapeHtml(b.file)}</span></td><td>${escapeHtml(intakeUnitName(b.unit))}</td><td>${b.received}<span class="cell-subtitle">${b.actor}</span></td><td>${INTAKE_ROWS.filter(r => r.batch === b.id).length}</td><td>${badge("Chờ rà soát")}</td><td>${intakeButton("Xem lô", "batch", b.id)}</td></tr>`)))}
  <p class="muted">Prototype sử dụng hai cấu trúc Excel mẫu để trình diễn ghép cột. Không đọc hoặc tải nội dung Excel thật, không tạo CSDL chính thức.</p>`;
}
function intakeRowsTable(rows, company = false) {
  return table(["Nguồn / dòng", "Hộ / địa chỉ", "Khu vực", "Vấn đề", "Xử lý"], rows.map(r => `<tr data-intake-row data-id="${r.id}"><td>${r.batch} · dòng ${r.line}<span class="cell-subtitle">${escapeHtml(r.code)}${company ? "" : " · " + escapeHtml(intakeUnitName(intakeBatch(r).unit))}</span></td><td><strong>${escapeHtml(intakeClean(r.name))}</strong><span class="cell-subtitle">${escapeHtml(r.address || "Thiếu địa chỉ")}</span></td><td>${escapeHtml(r.area || "Chưa có")}</td><td>${badge(INTAKE_CASES[r.issue][0])}<span class="cell-subtitle">${r.issue === "clean" ? "Chưa xác nhận danh sách chuẩn" : "Chờ xác minh"}</span></td><td>${intakeButton(company ? "Xem nguồn" : "So sánh / xem nguồn", "row", r.id)}</td></tr>`));
}
function intakeComparison() {
  const rows = INTAKE_ROWS.filter(r => (intakeFilter.unit === "all" || intakeBatch(r).unit === intakeFilter.unit) && (intakeFilter.issue === "all" || r.issue === intakeFilter.issue) && `${r.name} ${r.address} ${r.code}`.toLowerCase().includes(intakeFilter.search.toLowerCase()));
  return `${pageHeader("Đối chiếu dữ liệu", "Đối chiếu danh sách hộ", "Kiểm tra nguồn công ty, thông tin nghi trùng và dữ liệu cần xác minh. Đây không phải đối soát tiền.", actionButton("Tiếp nhận dữ liệu", "go:data-quality"))}${intakeEmptyBase()}
  <div class="filter-bar">${managementSelect("Công ty cung cấp", "data-intake-filter=unit", [["all", "Tất cả nguồn"], ...MANAGEMENT_UNITS.map(u => [u.id, u.name])], intakeFilter.unit)}${managementSelect("Nhóm cần kiểm tra", "data-intake-filter=issue", [["all", "Tất cả"], ...Object.entries(INTAKE_CASES).map(([key, v]) => [key, v[0]])], intakeFilter.issue)}<label class="toolbar-field grow">Tìm trong nguồn<input class="control" type="search" data-intake-search value="${escapeHtml(intakeFilter.search)}" placeholder="Tên, địa chỉ, mã nguồn"></label></div>
  ${panel(`${rows.length} dòng phù hợp`, "Các cờ là tình huống minh họa; không phải kết luận tự động về hộ hoặc bên phục vụ.", rows.length ? intakeRowsTable(rows) : '<p class="intake-pad">Không có dòng phù hợp. Thử đổi bộ lọc.</p>')}`;
}
function companyIntake() {
  const rows = INTAKE_ROWS.filter(r => intakeBatch(r).unit === INTAKE_COMPANY);
  return `${pageHeader("Dữ liệu công ty", "Danh sách đã cung cấp", `${intakeUnitName(INTAKE_COMPANY)} · Xem dữ liệu do xã tiếp nhận từ công ty.`)}
  ${rules(`Gửi tệp Excel cho cán bộ xã theo kênh đang sử dụng`, [`Công ty không tải tệp lên tại đây. Các yêu cầu bổ sung được xem tại mục bên dưới; kết quả xác minh chưa được quyết định trong prototype.`])}
  ${summaryStrip([["Dòng nguồn của công ty", String(rows.length), "Không gồm dữ liệu công ty khác"], ["Yêu cầu bổ sung", String(INTAKE_REQUESTS.filter(r => r.unit === INTAKE_COMPANY).length), "Trao đổi lại với cán bộ xã"], ["Trạng thái xác minh", "Đang chờ", "Chưa công nhận danh sách chuẩn"]])}
  ${panel("Dữ liệu nguồn của công ty", "Không thể mở dữ liệu nguồn của công ty khác trong màn hình này.", intakeRowsTable(rows, true), actionButton("Xem yêu cầu bổ sung", "go:data-requests"))}`;
}
function companyDataRequests() {
  const requests = INTAKE_REQUESTS.filter(r => r.unit === INTAKE_COMPANY);
  return `${pageHeader("Phối hợp dữ liệu", "Yêu cầu bổ sung", "Xem nội dung xã yêu cầu, chuẩn bị thông tin hoặc Excel bổ sung và gửi lại cán bộ xã.")}
  ${panel(`${requests.length} yêu cầu`, "Chưa triển khai nút xác minh, duyệt chính thức hoặc phản hồi trực tuyến khi quy trình chưa chốt.", requests.length ? table(["Mã / ngày", "Dòng liên quan", "Nội dung", "Trạng thái", ""], requests.map(r => `<tr><td>${r.id}<span class="cell-subtitle">${r.created}</span></td><td>${r.rowId}</td><td>${escapeHtml(r.content)}</td><td>${badge(r.status)}</td><td>${intakeButton("Xem dòng nguồn", "row", r.rowId)}</td></tr>`)) : '<p class="intake-pad">Chưa có yêu cầu bổ sung.</p>')}`;
}
Object.assign(VIEW_RENDERERS, { intakeHome, intakeComparison, companyIntake, companyDataRequests });
function intakeShell(title, kind, id = "") {
  intakeDialog = { kind, id };
  DIALOG_SPECS.intake = { title, description: "Dữ liệu minh họa · Không tải tệp thật, không duyệt thành hồ sơ chuẩn", fields: [] };
  openDemoModal("intake");
  return document.getElementById("dialogBody");
}
function openIntake(action, id) {
  if (!["commune", "company"].includes(currentRole)) return;
  if (["start", "batch", "request"].includes(action) && currentRole !== "commune") { showDemoNotice("Không có quyền thực hiện thao tác này."); return; }
  if (action === "start") {
    const body = intakeShell("1. Tiếp nhận Excel từ công ty", "start");
    body.innerHTML = `${rules(`Trình diễn bằng cấu trúc tệp mẫu`, [`Không có tệp thực tế đã được cung cấp. Bản này không đọc Excel thật; không cần chọn tệp trên máy.`])}${managementSelect("Công ty gửi dữ liệu", "id=intakeSource required", [["DV01", intakeUnitName("DV01")], ["DV02", intakeUnitName("DV02")]], "DV01")}<p>Hai công ty mẫu có tên cột khác nhau. Người nhập: cán bộ xã · Ngày tiếp nhận mẫu: 15/09/2026.</p><label class="toolbar-field">Ghi chú tiếp nhận<textarea class="control" id="intakeSourceNote" placeholder="Nguồn gửi, nội dung cần lưu ý"></textarea></label>`;
    document.getElementById("dialogConfirm").textContent = "Tiếp: ghép cột mẫu";
  }
  if (action === "batch") {
    const b = INTAKE_BATCHES.find(x => x.id === id); if (!b) return;
    const body = intakeShell(`Lô ${b.id} · ${intakeUnitName(b.unit)}`, "view");
    body.innerHTML = `<p>${escapeHtml(b.file)} · ${b.received} · ${b.actor}</p>${intakeRowsTable(INTAKE_ROWS.filter(r => r.batch === id))}`;
    document.getElementById("dialogConfirm").hidden = true;
  }
  if (action === "row") {
    const r = INTAKE_ROWS.find(x => x.id === id); if (!r || !intakeAccessible(r)) { showDemoNotice("Không có quyền xem dòng dữ liệu này."); return; }
    const b = intakeBatch(r), peer = INTAKE_ROWS.find(x => x.id === r.peer);
    const body = intakeShell(`${INTAKE_CASES[r.issue][0]} · ${r.id}`, "view", r.id);
    body.innerHTML = `${rules(`${r.issue === "clean" ? "Đủ thông tin để rà soát" : "Chờ xác minh"}`, [`${INTAKE_CASES[r.issue][1]}`], "warning")}<p>Nguồn: ${escapeHtml(intakeUnitName(b.unit))} · ${escapeHtml(b.file)} · dòng ${r.line} · ${b.received} · ${b.actor}</p>
      ${table(["Trường", "Dữ liệu gốc", "Chuẩn hóa đề xuất"], [["Mã hộ công ty", r.code], ["Người đại diện", r.name], ["Địa chỉ", r.address], ["Tổ dân phố", r.area], ["Loại", r.type], ["Điện thoại", r.phone], ["Phục vụ khai báo", r.service], ["Ngày bắt đầu/ngừng", ""], ["Ghi chú", r.note || ""]].map(([label, value]) => `<tr><td>${label}</td><td><span class="intake-raw">${escapeHtml(value || "Chưa có")}</span></td><td>${escapeHtml(intakeClean(value) || "Chưa có — cần bổ sung nếu cần xác minh")}</td></tr>`))}
      <p class="muted">Chỉ minh họa bỏ khoảng trắng thừa. Không tự đoán địa chỉ, số điện thoại, loại hộ, ngày phục vụ hoặc công ty phụ trách.</p>
      ${peer ? currentRole === "commune" || intakeAccessible(peer) ? `<h3>Nguồn cần đặt cạnh để đối chiếu</h3>${intakeRowsTable([peer], currentRole === "company")}` : '<p class="callout">Xã đang kiểm tra với nguồn khác. Công ty chỉ được xem dữ liệu mình đã cung cấp.</p>' : ""}
      ${r.issue === "mismatch" && currentRole === "commune" ? `<p>${escapeHtml(r.note)}</p>` : ""}
      ${currentRole === "commune" ? intakeButton("Lập yêu cầu bổ sung", "request", r.id, "primary") : ""}<p>Chưa xác định người có quyền duyệt: không có nút gộp hộ, xác nhận đơn vị hoặc chuyển thành danh sách chuẩn.</p>`;
    document.getElementById("dialogConfirm").hidden = true;
  }
  if (action === "request") {
    const r = INTAKE_ROWS.find(x => x.id === id); if (!r) return;
    const b = intakeBatch(r), body = intakeShell("Yêu cầu công ty bổ sung dữ liệu", "request", id);
    body.innerHTML = `<p>Gửi cho: <strong>${escapeHtml(intakeUnitName(b.unit))}</strong></p><p>${b.id} · dòng ${r.line} · mã nguồn ${escapeHtml(r.code)}</p><label class="toolbar-field">Nội dung yêu cầu<textarea class="control" id="intakeRequestContent" required rows="4">Đề nghị kiểm tra và bổ sung thông tin cho dòng ${r.line} của lô ${b.id}: ${INTAKE_CASES[r.issue][0]}. Gửi lại thông tin và căn cứ cho cán bộ xã.</textarea></label><p>Nội dung không kèm dữ liệu công ty khác. Yêu cầu chỉ xuất hiện trong phiên mẫu, không gửi ra ngoài. Trạng thái hồ sơ vẫn chờ xác minh.</p>`;
    document.getElementById("dialogConfirm").textContent = "Tạo yêu cầu trong phiên mẫu";
  }
}
function intakeMapping() {
  const headers = INTAKE_LAYOUTS[intakeDraft.unit];
  const body = intakeShell("2. Ghép cột Excel với trường dữ liệu", "mapping");
  body.innerHTML = `<p>Công ty: ${escapeHtml(intakeUnitName(intakeDraft.unit))} · Cấu trúc mẫu ${intakeDraft.unit === "DV01" ? "A" : "B"}</p><p>Gợi ý ghép cột được điền sẵn cho tệp mẫu. Kiểm tra từng cột trước khi tiếp tục; cột không có được giữ là “Chưa cung cấp”.</p>${table(["Trường hệ thống", "Cột trong tệp mẫu"], INTAKE_FIELDS.map(([key, label, required], i) => `<tr><td>${label}${required ? " *" : ""}</td><td>${managementSelect(label, `data-intake-map="${key}" aria-label="${label}"`, [["", "Chưa cung cấp"], ...headers.map(h => [h, h])], headers[i + (intakeDraft.unit === "DV01" ? 1 : 0)] || "")}</td></tr>`))}<p>* Cần ghép cột tên và địa chỉ để kiểm tra. Dòng thiếu giá trị vẫn được giữ và báo lỗi.</p><p id="intakeMapError" role="alert"></p>`;
  document.getElementById("dialogConfirm").textContent = "Kiểm tra dữ liệu mẫu";
}
function submitIntakeDialog() {
  if (currentRole !== "commune") { showDemoNotice("Không có quyền thực hiện thao tác này."); return true; }
  if (intakeDialog.kind === "start") {
    intakeDraft = { unit: document.getElementById("intakeSource").value, note: document.getElementById("intakeSourceNote").value, mapping: {} };
    intakeMapping(); return true;
  }
  if (intakeDialog.kind === "mapping") {
    const mappings = [...document.querySelectorAll("[data-intake-map]")].map(s => [s.dataset.intakeMap, s.value]);
    const used = mappings.map(m => m[1]).filter(Boolean);
    const error = mappings.some(([key, v]) => ["name", "address"].includes(key) && !v) ? "Cần ghép cột tên và địa chỉ. Không loại bỏ các dòng thiếu giá trị." : new Set(used).size !== used.length ? "Một cột nguồn đang ghép vào nhiều trường. Vui lòng kiểm tra lại." : "";
    if (error) { document.getElementById("intakeMapError").textContent = error; return true; }
    intakeDraft.mapping = Object.fromEntries(mappings);
    const body = intakeShell("3. Kết quả kiểm tra cấu trúc mẫu", "preview");
    body.innerHTML = `${rules(`Đã kiểm tra cấu hình ghép cột mẫu`, [`Không có tệp Excel thật được xử lý. Bảng dưới là cấu hình bạn vừa chọn; các tình huống dữ liệu minh họa đã có trong lô nguồn.`])}${table(["Trường hệ thống", "Cột nguồn đã chọn"], INTAKE_FIELDS.map(([key, label]) => `<tr><td>${label}</td><td>${escapeHtml(intakeDraft.mapping[key] || "Chưa cung cấp")}</td></tr>`))}<p>Ghi chú tiếp nhận: ${escapeHtml(intakeDraft.note || "Không có")}</p><p>Tiếp theo mở các dòng minh họa của công ty để xem thiếu dữ liệu/nghi trùng. Không tạo thêm lô, không tự gộp hay duyệt hộ.</p>`;
    document.getElementById("dialogConfirm").textContent = "Mở dữ liệu mẫu để rà soát"; return true;
  }
  if (intakeDialog.kind === "preview") { intakeFilter = { unit: intakeDraft.unit, issue: "all", search: "" }; closeDemoModal(); showScreen("data-comparison"); return true; }
  if (intakeDialog.kind === "request") {
    const r = INTAKE_ROWS.find(x => x.id === intakeDialog.id), content = document.getElementById("intakeRequestContent").value.trim();
    if (!content) { document.getElementById("intakeRequestContent").setCustomValidity("Nhập nội dung yêu cầu."); document.getElementById("dialogForm").reportValidity(); return true; }
    INTAKE_REQUESTS.push({ id: `BS-${String(INTAKE_REQUESTS.length + 1).padStart(3, "0")}`, unit: intakeBatch(r).unit, rowId: r.id, content, status: "Chờ bổ sung", created: "15/09/2026" });
    closeDemoModal(); showDemoNotice("Đã tạo yêu cầu trong phiên mẫu; không gửi ra ngoài và không thay đổi kết quả xác minh."); return true;
  }
  return true;
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-intake]"); if (!button) return;
  openIntake(button.dataset.intake, button.dataset.id);
});
document.addEventListener("change", event => { if (event.target.matches("[data-intake-filter]") && currentRole === "commune") { intakeFilter[event.target.dataset.intakeFilter] = event.target.value; renderCurrentView({ keepFocus: true }); } });
document.addEventListener("input", event => { if (event.target.matches("[data-intake-search]") && currentRole === "commune") { intakeFilter.search = event.target.value.trim(); renderCurrentView({ keepFocus: true }); } });
document.addEventListener("input", event => { if (event.target.id === "intakeRequestContent") event.target.setCustomValidity(""); });
