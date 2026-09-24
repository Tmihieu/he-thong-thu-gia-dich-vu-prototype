"use strict";

/* Xem trước ứng dụng người dân (giai đoạn 2). Ngôn ngữ thị giác theo mẫu ứng dụng GRAC (header xanh, thẻ trắng, lưới icon tròn,
   tab bar 4 mục) nhưng chức năng là của dự án: thanh toán phí, phản ánh, chợ đồ cũ, rác cồng kềnh, lịch thu gom, biên lai.
   Độc lập với ROLE_CONFIG/VIEW_RENDERERS của bản desktop; mọi thao tác đều mô phỏng. */

const CITIZEN_PROFILE = {
  name: "Nguyễn Văn Bình",
  initials: "NB",
  code: "HO-DTH-000128",
  phone: "+84 903 218 665",
  address: "12/4 Đặng Thúc Vịnh, Tổ 5, xã Đông Thạnh",
  company: "Công ty MTĐT Đông Thạnh"
};

const CITIZEN_BILL = {
  period: "Tháng 09/2026",
  due: "Hạn đóng 25/09/2026",
  total: "80.000đ",
  lines: [["Thu gom tại nguồn", "45.000đ"], ["Vận chuyển", "20.000đ"], ["Xử lý", "12.000đ"], ["Thuế GTGT", "3.000đ"]],
  history: [["Tháng 08/2026", "80.000đ", "Đã thu"], ["Tháng 07/2026", "80.000đ", "Đã thu"], ["Tháng 06/2026", "80.000đ", "Đã thu"]]
};

const CITIZEN_SCHEDULE = [
  ["Thứ 3", "17:00 – 19:00", "Rác sinh hoạt"],
  ["Thứ 5", "17:00 – 19:00", "Rác sinh hoạt"],
  ["Thứ 7", "17:00 – 19:00", "Rác sinh hoạt + tái chế"],
  ["Chủ nhật đầu tháng", "08:00 – 11:00", "Rác cồng kềnh (đã đăng ký)"]
];

const CITIZEN_COMPLAINTS = [
  { id: "PA-0926-014", type: "Thu gom chậm hoặc không đúng lịch", summary: "Tổ 5 chưa được thu gom 2 ngày liên tiếp", date: "14/09/2026", status: "Đang xử lý", tone: "info",
    detail: "Lịch thu gom là thứ 3 – 5 – 7 nhưng tuần này chưa thấy xe đến. Rác đã tồn 2 ngày trước hẻm 12/4.",
    timeline: [["14/09 08:12", "Bạn gửi phản ánh kèm vị trí tự động"], ["14/09 09:40", "Cán bộ xã tiếp nhận, chuyển Công ty MTĐT Đông Thạnh"], ["15/09 07:05", "Công ty xác nhận bổ sung chuyến trong ngày"]] },
  { id: "PA-0926-009", type: "Thu phí cao hơn định mức", summary: "Nhân viên thu 100.000đ trong khi thông báo là 80.000đ", date: "09/09/2026", status: "Đã xử lý", tone: "success",
    detail: "Đề nghị xã kiểm tra lại mức phí áp dụng cho hộ gia đình và hoàn phần chênh lệch.",
    timeline: [["09/09 17:20", "Bạn gửi phản ánh"], ["10/09 10:15", "Xã đối chiếu biểu giá, xác nhận mức đúng là 80.000đ"], ["11/09 15:00", "Công ty hoàn 20.000đ và phát biên lai điều chỉnh"]] }
];

const CITIZEN_MARKET = [
  { id: "CDC-041", title: "Ghế sofa 3 chỗ còn dùng tốt", tag: "Cho tặng", owner: "Chị Hạnh · Tổ 5", time: "2 giờ trước", description: "Sofa nỉ 3 chỗ, còn chắc, chỉ bạc màu nhẹ ở tay vịn. Do đổi nội thất nên cho lại. Người nhận tự vận chuyển, liên hệ buổi tối.",
    comments: [["Anh Tuấn", "Còn không chị? Chiều nay em qua lấy được không ạ?", "1 giờ trước"], ["Chị Hạnh", "Còn em nhé, qua sau 18h giúp chị.", "40 phút trước"]] },
  { id: "CDC-039", title: "Tủ quần áo gỗ ép 2 cánh", tag: "Trao đổi", owner: "Anh Dũng · Tổ 3", time: "Hôm qua", description: "Tủ cao 1m8, một bên bản lề hơi lỏng. Muốn đổi lấy kệ sách nhỏ hoặc bàn học cũ.",
    comments: [["Chị Mai", "Nhà em có bàn học, để em gửi ảnh qua tin nhắn nhé.", "3 giờ trước"]] },
  { id: "CDC-035", title: "Bàn ăn 4 ghế, mặt kính", tag: "Cho tặng", owner: "Cô Bảy · Tổ 7", time: "2 ngày trước", description: "Mặt kính còn nguyên, 1 ghế gãy nan tựa. Ưu tiên hộ trong xã đến lấy sớm vì nhà chật.", comments: [] }
];

const CITIZEN_BULKY = [
  { id: "CK-0926-006", item: "Nệm cũ 1m6 + 2 ghế hỏng", date: "Hẹn 18/09/2026, buổi sáng", fee: "Chờ công ty báo phí", status: "Chờ xác nhận", tone: "warn" },
  { id: "CK-0826-021", item: "Tủ lạnh hỏng", date: "Đã thu 22/08/2026", fee: "200.000đ", status: "Đã thu", tone: "" }
];

const CITIZEN_NOTIFICATIONS = [
  { group: "complaint", icon: "message", title: "Phản ánh đã được chuyển xử lý", text: "Phản ánh PA-0926-014 đã được chuyển cho Công ty MTĐT Đông Thạnh, dự kiến bổ sung chuyến trong ngày.", time: "09:40 · 14/09/2026", unread: true },
  { group: "transaction", icon: "wallet", title: "Nhắc đóng phí kỳ 09/2026", text: "Phí dịch vụ 80.000đ đến hạn 25/09/2026. Bạn có thể thanh toán ngay trên ứng dụng hoặc tại nhà.", time: "08:00 · 14/09/2026", unread: true },
  { group: "transaction", icon: "receipt", title: "Biên lai điều chỉnh đã phát", text: "Công ty MTĐT Đông Thạnh phát biên lai điều chỉnh 20.000đ cho phản ánh PA-0926-009.", time: "15:02 · 11/09/2026", unread: false },
  { group: "complaint", icon: "check", title: "Phản ánh PA-0926-009 đã xử lý xong", text: "Xã xác nhận mức phí đúng là 80.000đ; phần chênh lệch đã được hoàn.", time: "15:00 · 11/09/2026", unread: false },
  { group: "transaction", icon: "truck", title: "Lịch thu gom rác cồng kềnh", text: "Yêu cầu CK-0926-006 được xếp lịch sáng 18/09/2026. Vui lòng để vật dụng trước hẻm.", time: "10:30 · 16/09/2026", unread: true }
];

const CITIZEN_TABS = [
  { id: "home", label: "Trang chủ", icon: "home" },
  { id: "market", label: "Chợ đồ cũ", icon: "refresh" },
  { id: "notifications", label: "Thông báo", icon: "bell", dot: () => CITIZEN_NOTIFICATIONS.filter(n => n.unread).length },
  { id: "account", label: "Tài khoản", icon: "user" }
];

let citizenNotifSeg = "all";

const grTag = (label, tone = "") => `<span class="gr-tag ${tone}">${escapeHtml(label)}</span>`;
const grChevron = () => icon("chevron", "gr-chev");

function grTopbar(title, back = "home") {
  return `<div class="gr-topbar"><button type="button" class="gr-back" data-citizen-go="${back}" aria-label="Quay lại">${icon("arrowLeft")}</button><h1>${escapeHtml(title)}</h1></div>`;
}

function grRow(iconName, title, subtitle, go, extra = "", solid = false) {
  return `<div class="gr-row" data-citizen-go="${go}"><span class="gr-ico ${solid ? "solid" : ""}">${icon(iconName)}</span><div><strong>${escapeHtml(title)}</strong>${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ""}</div>${extra}${grChevron()}</div>`;
}

function citizenHome() {
  const unread = CITIZEN_NOTIFICATIONS.filter(n => n.unread).length;
  return `<section class="gr-hero">
    <div class="gr-hero-top">
      <span class="gr-avatar">${CITIZEN_PROFILE.initials}</span>
      <div><small>Xin chào</small><strong>${escapeHtml(CITIZEN_PROFILE.name)}</strong><small>${escapeHtml(CITIZEN_PROFILE.code)} · Tổ 5, Đông Thạnh</small></div>
      <button type="button" class="gr-chip" data-citizen-notice="Bản xem trước chỉ có tiếng Việt.">VN ▾</button>
    </div>
    <div class="gr-search" data-citizen-notice="Tra cứu theo mã hộ hoặc địa chỉ là chức năng mô phỏng.">${icon("search")}<span>Tra cứu mã hộ, địa chỉ, biên lai...</span></div>
    <button type="button" class="gr-cta" data-citizen-go="payment">${icon("wallet")}<span>Phí ${escapeHtml(CITIZEN_BILL.period)} · <b>${escapeHtml(CITIZEN_BILL.total)}</b></span><em>Thanh toán ›</em></button>
  </section>
  <div class="gr-body">
    <div class="gr-grid6">
      <button type="button" data-citizen-go="payment"><span class="gr-circle">${icon("wallet")}</span>Thanh toán<br>trực tuyến</button>
      <button type="button" data-citizen-go="complaintNew"><span class="gr-circle">${icon("message")}</span>Gửi phản ánh<br>kiến nghị</button>
      <button type="button" data-citizen-go="bulkyNew"><span class="gr-circle">${icon("truck")}</span>Đăng ký<br>rác cồng kềnh</button>
      <button type="button" data-citizen-go="market"><span class="gr-circle">${icon("refresh")}</span>Chợ<br>đồ cũ</button>
      <button type="button" data-citizen-go="schedule"><span class="gr-circle">${icon("calendar")}</span>Lịch<br>thu gom</button>
      <button type="button" data-citizen-go="receipts"><span class="gr-circle">${icon("receipt")}</span>Biên lai<br>của tôi</button>
    </div>
    <div class="gr-section"><span>Việc của bạn</span></div>
    <div class="gr-card clickable" data-citizen-go="complaints">
      <div class="gr-card-top"><strong>Phản ánh gần nhất</strong>${grTag(CITIZEN_COMPLAINTS[0].status, CITIZEN_COMPLAINTS[0].tone === "info" ? "info" : "")}</div>
      <p>${escapeHtml(CITIZEN_COMPLAINTS[0].summary)}</p>
      <span class="muted">${CITIZEN_COMPLAINTS[0].id} · ${CITIZEN_COMPLAINTS[0].date}</span>
    </div>
    <div class="gr-card clickable" data-citizen-go="bulkyStatus">
      <div class="gr-card-top"><strong>Rác cồng kềnh đã đăng ký</strong>${grTag("Hẹn 18/09", "alt")}</div>
      <p>${escapeHtml(CITIZEN_BULKY[0].item)}</p>
      <span class="muted">${CITIZEN_BULKY[0].id} · ${escapeHtml(CITIZEN_BULKY[0].fee)}</span>
    </div>
    <div class="gr-section"><span>Tin từ xã, đơn vị thu gom</span>${grChevron()}</div>
    <div class="gr-news">
      <article><div class="gr-img"></div><div class="gr-news-body"><small><i></i>UBND xã Đông Thạnh</small><strong>Lịch thu gom rác cồng kềnh tháng 10/2026</strong></div></article>
      <article><div class="gr-img"></div><div class="gr-news-body"><small><i></i>Công ty MTĐT Đông Thạnh</small><strong>Điều chỉnh giờ thu gom tổ 5–7 từ 01/10</strong></div></article>
      <article><div class="gr-img"></div><div class="gr-news-body"><small><i></i>UBND xã Đông Thạnh</small><strong>Ngày hội đổi đồ cũ ấp 7</strong></div></article>
    </div>
    ${unread ? `<div class="gr-card clickable" data-citizen-go="notifications" style="margin-top:14px"><div class="gr-card-top"><strong>${unread} thông báo chưa đọc</strong>${grChevron()}</div><p>${escapeHtml(CITIZEN_NOTIFICATIONS[0].title)}</p></div>` : ""}
  </div>`;
}

function citizenNotifications() {
  const list = CITIZEN_NOTIFICATIONS.filter(n => citizenNotifSeg === "all" || n.group === citizenNotifSeg);
  const items = list.map((n, i) => `<div class="gr-notif ${n.unread ? "unread" : ""}" data-citizen-go="${n.go || (n.group === "complaint" ? "complaints" : "payment")}"${n.id ? ` data-citizen-id="${n.id}"` : ""} data-citizen-notif="${CITIZEN_NOTIFICATIONS.indexOf(n)}"><span class="gr-ico">${icon(n.icon)}</span><div><strong>${escapeHtml(n.title)}<span>${escapeHtml(n.time)}</span></strong><p>${escapeHtml(n.text)}</p></div></div>`).join("");
  return `<div class="gr-topbar" style="padding-bottom:10px"><h1>Thông báo</h1></div>
  <div class="gr-seg">${[["all", "Tất cả"], ["complaint", "Phản ánh"], ["transaction", "Giao dịch"]].map(([v, l]) => `<button type="button" class="${citizenNotifSeg === v ? "active" : ""}" data-citizen-seg="${v}">${l}</button>`).join("")}</div>
  <div class="gr-body flush">
    <div class="gr-list-head"><span>${citizenNotifSeg === "all" ? "Tất cả thông báo" : citizenNotifSeg === "complaint" ? "Phản ánh, kiến nghị" : "Phí và giao dịch"}</span><button type="button" data-citizen-read-all>${icon("check")} Đánh dấu đã đọc</button></div>
    <div class="gr-month">Tháng 09/2026</div>
    ${items || '<div class="gr-empty">Chưa có thông báo trong mục này.</div>'}
  </div>`;
}

function citizenAccount() {
  return `<section class="gr-hero" style="text-align:center;padding-bottom:26px">
    <span class="gr-avatar lg">${CITIZEN_PROFILE.initials}</span>
    <strong style="font-size:18px">${escapeHtml(CITIZEN_PROFILE.name)} <span style="font-weight:400;opacity:.85">${icon("edit2")}</span></strong>
    <div style="font-size:13px;color:#d9efe2;margin-top:2px">${escapeHtml(CITIZEN_PROFILE.phone)}</div>
  </section>
  <div class="gr-body">
    <div class="gr-card">
      <h3>Hộ gia đình</h3>
      ${grRow("households", CITIZEN_PROFILE.code, CITIZEN_PROFILE.address, "household", "", true)}
      ${grRow("building", "Đơn vị thu gom phụ trách", CITIZEN_PROFILE.company, "schedule", "", true)}
      ${grRow("receipt", "Biên lai của tôi", "3 biên lai kỳ gần nhất", "receipts", "", true)}
    </div>
    <div class="gr-card">
      <h3>Cài đặt chung</h3>
      ${grRow("globe", "Ngôn ngữ", "Tiếng Việt", "settings")}
      ${grRow("shield", "Bảo mật", "Quản lý mật khẩu, PIN, vân tay", "settings")}
      ${grRow("bell", "Thông báo", "Nhắc đóng phí, lịch thu gom", "settings")}
      ${grRow("link", "Liên kết tài khoản", "VNeID, Google", "settings")}
    </div>
    <div class="gr-card">
      <h3>Hỗ trợ</h3>
      ${grRow("doc", "Điều khoản và chính sách", "Chi tiết điều khoản sử dụng", "settings")}
      ${grRow("headset", "Trung tâm hỗ trợ", "Gửi yêu cầu tới bộ phận CSKH", "settings")}
      ${grRow("message", "Gửi phản ánh, kiến nghị", "Thu chậm, sai mức phí, vấn đề khác", "complaintNew")}
      ${grRow("help", "Thông tin chung", "Thông tin cơ bản, phiên bản", "settings")}
    </div>
    <div class="gr-banner"><div style="flex:1"><strong>Bạn có hài lòng với ứng dụng chứ?</strong><small>Phản hồi của bạn giúp xã cải thiện dịch vụ thu gom.</small></div><span class="gr-mascot">${icon("leaf")}</span></div>
  </div>`;
}

function citizenSettings() {
  return `${grTopbar("Cài đặt", "account")}<div class="gr-body"><div class="gr-card"><h3>Chưa mở trong bản xem trước</h3><p>Mục cài đặt, bảo mật và liên kết tài khoản sẽ được thiết kế cùng phần định danh ở giai đoạn 2.</p></div></div>`;
}

function citizenHousehold() {
  return `${grTopbar("Thông tin hộ", "account")}<div class="gr-body">
    <div class="gr-card">
      <div class="gr-line"><span>Mã hộ</span><strong>${CITIZEN_PROFILE.code}</strong></div>
      <div class="gr-line"><span>Người đại diện</span><strong>${escapeHtml(CITIZEN_PROFILE.name)}</strong></div>
      <div class="gr-line"><span>Địa chỉ</span><strong style="text-align:right;max-width:60%">${escapeHtml(CITIZEN_PROFILE.address)}</strong></div>
      <div class="gr-line"><span>Nhóm giá</span><strong>Hộ gia đình ≥ 3 người</strong></div>
      <div class="gr-line"><span>Đơn vị thu gom</span><strong>${escapeHtml(CITIZEN_PROFILE.company)}</strong></div>
      <div class="gr-line"><span>Tình trạng</span><strong>${grTag("Đã xác minh")}</strong></div>
    </div>
    <div class="gr-tip"><strong>Thông tin chưa đúng?</strong> Gửi đề nghị cập nhật, cán bộ xã sẽ xác minh trước khi thay đổi mức phí.</div>
    <button type="button" class="gr-btn ghost" data-citizen-notice="Đã mô phỏng gửi đề nghị cập nhật thông tin hộ.">Đề nghị cập nhật thông tin</button>
  </div>`;
}

function citizenSchedule() {
  return `${grTopbar("Lịch thu gom")}<div class="gr-body">
    <div class="gr-card"><div class="gr-card-top"><strong>Tổ 5 · Đông Thạnh</strong>${grTag("Đang áp dụng")}</div><p>${escapeHtml(CITIZEN_PROFILE.company)} · Đầu mối: Trần Hoàng Phúc</p></div>
    <div class="gr-card">${CITIZEN_SCHEDULE.map(([day, time, kind]) => `<div class="gr-line"><span><strong style="display:block">${day}</strong><small style="color:var(--gr-muted)">${kind}</small></span><strong>${time}</strong></div>`).join("")}</div>
    <button type="button" class="gr-btn soft" data-citizen-go="complaintNew">Báo thu gom sai lịch</button>
  </div>`;
}

function citizenReceipts() {
  return `${grTopbar("Biên lai của tôi")}<div class="gr-body">
    <div class="gr-tip">Biên lai do <strong>${escapeHtml(CITIZEN_PROFILE.company)}</strong> phát hành. Xã chỉ đối chiếu, không phát biên lai thay công ty.</div>
    ${CITIZEN_BILL.history.map(([period, amount, status], i) => `<div class="gr-card clickable" data-citizen-go="paymentReceipt"><div class="gr-card-top"><strong>${period}</strong>${grTag(status)}</div><div class="gr-line"><span>Số biên lai</span><strong>BL-0${8 - i}26-000128</strong></div><div class="gr-line"><span>Số tiền</span><strong>${amount}</strong></div></div>`).join("")}
  </div>`;
}

function citizenComplaints() {
  return `${grTopbar("Phản ánh, kiến nghị")}<div class="gr-body">
    <button type="button" class="gr-btn" data-citizen-go="complaintNew" style="margin-bottom:14px">${icon("plus")} Gửi phản ánh mới</button>
    ${CITIZEN_COMPLAINTS.map(item => `<div class="gr-card clickable" data-citizen-go="complaintDetail" data-citizen-id="${item.id}"><div class="gr-card-top"><strong>${escapeHtml(item.type)}</strong>${grTag(item.status, item.tone === "info" ? "info" : "")}</div><p>${escapeHtml(item.summary)}</p><span class="muted">${item.id} · ${item.date}</span></div>`).join("")}
  </div>`;
}

function citizenComplaintNew() {
  return `${grTopbar("Gửi phản ánh")}<div class="gr-body">
    <form data-citizen-form="complaint">
      <label class="gr-field"><span>Nội dung phản ánh <i>*</i></span><select class="gr-input" required><option value="">Chọn loại phản ánh</option><option>Thu gom chậm hoặc không đúng lịch</option><option>Thu phí cao hơn định mức</option><option>Điểm tập kết gây ô nhiễm</option><option>Thái độ nhân viên thu gom</option><option>Vấn đề khác</option></select></label>
      <label class="gr-field"><span>Địa điểm <i>*</i></span><input class="gr-input" value="${escapeHtml(CITIZEN_PROFILE.address)}" required></label>
      <div class="gr-tip"><strong>Mẹo:</strong> vị trí được lấy tự động từ hộ của bạn; sửa lại nếu sự việc xảy ra ở nơi khác.</div>
      <label class="gr-field"><span>Mô tả chi tiết <i>*</i></span><textarea class="gr-input" required placeholder="Thời điểm, tình trạng thực tế, số lần xảy ra..."></textarea></label>
      <div class="gr-field"><span>Ảnh hiện trường</span><div class="gr-upload" data-citizen-notice="Bản xem trước không mở camera hoặc thư viện ảnh.">${icon("camera")} Chụp ảnh hoặc chọn từ thư viện</div></div>
      <div class="gr-summary"><small>Sẽ gửi tới</small>UBND xã Đông Thạnh và ${escapeHtml(CITIZEN_PROFILE.company)}. Bạn nhận thông báo khi được tiếp nhận và khi có kết quả.</div>
      <div class="gr-sticky"><button type="submit" class="gr-btn">Gửi phản ánh</button></div>
    </form>
  </div>`;
}

// Phản ánh của người dân đi vào danh sách khiếu nại của xã (hộ DTH-H000128, Tổ 07) và báo cho xã lẫn công ty phụ trách.
function citizenSubmitComplaint(form) {
  const type = form.querySelector("select")?.value || "Phản ánh";
  const detail = form.querySelector("textarea")?.value.trim() || "";
  const subject = csSubject("DTH-H000128");
  const id = `KN-2609-${String(csState.seq.complaint++).padStart(3, "0")}`;
  const complaint = { id, date: csIsoToVi(CS_TODAY), name: CITIZEN_PROFILE.name, subject: subject?.code || "—", phone: CITIZEN_PROFILE.phone, area: subject?.area || "KV07", channel: "Ứng dụng người dân", content: `${type}: ${detail}`, status: "new", result: "" };
  CS_COMPLAINTS.unshift(complaint);
  csNotifyComplaint(complaint);
  const paId = id.replace("KN", "PA");
  CITIZEN_COMPLAINTS.unshift({ id: paId, csId: id, type, summary: detail.slice(0, 60), date: csIsoToVi(CS_TODAY), status: "Đã gửi", tone: "info", detail, timeline: [[citizenStamp().replace(" · ", " "), "Bạn gửi phản ánh kèm vị trí tự động"]] });
  citizenNotify({ title: `Đã gửi phản ánh ${paId}`, text: `UBND xã Đông Thạnh và ${CITIZEN_PROFILE.company} đã nhận. Bạn sẽ được báo khi xã tiếp nhận và khi có kết quả.`, go: "complaintDetail", id: paId });
}

function citizenComplaintDetail(id) {
  const item = CITIZEN_COMPLAINTS.find(row => row.id === id) || CITIZEN_COMPLAINTS[0];
  return `${grTopbar("Chi tiết phản ánh", "complaints")}<div class="gr-body">
    <div class="gr-card"><div class="gr-card-top"><strong>${escapeHtml(item.type)}</strong>${grTag(item.status, item.tone === "info" ? "info" : "")}</div><p>${escapeHtml(item.detail)}</p><span class="muted">${item.id} · Gửi ngày ${item.date} · ${escapeHtml(CITIZEN_PROFILE.address)}</span></div>
    <div class="gr-card"><h3>Tiến trình xử lý</h3><ul class="gr-timeline">${item.timeline.map(([time, text]) => `<li>${escapeHtml(text)}<small>${time}</small></li>`).join("")}</ul></div>
    ${item.status === "Đã xử lý" ? `<button type="button" class="gr-btn soft" data-citizen-notice="Cảm ơn bạn đã đánh giá (mô phỏng).">${icon("star")} Đánh giá kết quả xử lý</button>` : `<button type="button" class="gr-btn ghost" data-citizen-notice="Đã mô phỏng gửi bổ sung thông tin.">Bổ sung thông tin</button>`}
  </div>`;
}

function citizenPayment() {
  return `${grTopbar("Thanh toán phí")}<div class="gr-body">
    <div class="gr-card">
      <div class="gr-card-top"><strong>Kỳ ${escapeHtml(CITIZEN_BILL.period)}</strong>${grTag("Chưa thu", "alt")}</div>
      <div class="gr-amount">${escapeHtml(CITIZEN_BILL.total)}</div>
      <span class="muted">${escapeHtml(CITIZEN_BILL.due)} · ${escapeHtml(CITIZEN_PROFILE.code)}</span>
      <div style="margin-top:10px">${CITIZEN_BILL.lines.map(([l, v]) => `<div class="gr-line"><span>${l}</span><strong>${v}</strong></div>`).join("")}<div class="gr-line total"><span>Tổng cộng</span><strong>${escapeHtml(CITIZEN_BILL.total)}</strong></div></div>
    </div>
    <div class="gr-card">
      <h3>Phương thức thanh toán</h3>
      <div class="gr-method selected" data-citizen-go="paymentReceipt"><span class="gr-ico">${icon("qr")}</span><div><strong>Quét QR chuyển khoản</strong><small>Vào tài khoản ${escapeHtml(CITIZEN_PROFILE.company)}</small></div><span class="gr-radio"></span></div>
      <div class="gr-method" data-citizen-go="paymentReceipt"><span class="gr-ico">${icon("wallet")}</span><div><strong>Ví điện tử</strong><small>MoMo, Viettel Money, ZaloPay</small></div><span class="gr-radio"></span></div>
      <div class="gr-method" data-citizen-go="paymentReceipt"><span class="gr-ico">${icon("bank")}</span><div><strong>Ngân hàng liên kết</strong><small>Thẻ nội địa, Internet Banking</small></div><span class="gr-radio"></span></div>
      <div class="gr-method" data-citizen-notice="Thanh toán tiền mặt tại nhà, nhân viên thu phát biên lai của công ty."><span class="gr-ico">${icon("cash")}</span><div><strong>Tiền mặt tại nhà</strong><small>Nhân viên thu của công ty phát biên lai</small></div><span class="gr-radio"></span></div>
    </div>
    <div class="gr-tip">Tiền chuyển vào tài khoản của công ty thu gom hoặc theo mã nhân viên thu do công ty quản lý; <strong>biên lai do công ty phát hành</strong> và hiển thị lại trong ứng dụng.</div>
    <div class="gr-section"><span>Lịch sử đóng phí</span></div>
    <div class="gr-card">${CITIZEN_BILL.history.map(([p, a, s]) => `<div class="gr-line"><span>${p}</span><strong>${a} &nbsp;${grTag(s)}</strong></div>`).join("")}</div>
    <div class="gr-sticky"><button type="button" class="gr-btn" data-citizen-go="paymentReceipt">Thanh toán ${escapeHtml(CITIZEN_BILL.total)}</button></div>
  </div>`;
}

function citizenPaymentReceipt() {
  return `${grTopbar("Biên lai", "payment")}<div class="gr-body">
    <div class="gr-card"><div class="gr-success"><span class="gr-check">${icon("check")}</span><strong>Thanh toán thành công</strong><p>Phí ${escapeHtml(CITIZEN_BILL.period)} · ${escapeHtml(CITIZEN_BILL.total)}</p><span class="muted">Mã giao dịch mô phỏng TT-0926-000128</span></div></div>
    <div class="gr-card">
      <h3>Biên lai điện tử</h3>
      <div class="gr-line"><span>Số biên lai</span><strong>BL-0926-000128</strong></div>
      <div class="gr-line"><span>Hộ nộp</span><strong>${escapeHtml(CITIZEN_PROFILE.name)} · ${CITIZEN_PROFILE.code}</strong></div>
      <div class="gr-line"><span>Đơn vị phát hành</span><strong>${escapeHtml(CITIZEN_PROFILE.company)}</strong></div>
      <div class="gr-line"><span>Thời điểm</span><strong>17/09/2026 09:41</strong></div>
      <div class="gr-line"><span>Hình thức</span><strong>QR chuyển khoản</strong></div>
    </div>
    <div class="gr-fab-row"><button type="button" class="gr-btn ghost" data-citizen-notice="Bản xem trước không phát hành chứng từ pháp lý.">Tải biên lai</button><button type="button" class="gr-btn" data-citizen-go="home">Về trang chủ</button></div>
  </div>`;
}

function citizenMarket() {
  return `<div class="gr-topbar" style="padding-bottom:12px"><h1>Chợ đồ cũ</h1><button type="button" class="gr-chip" data-citizen-go="marketNew">${icon("plus")} Đăng bài</button></div>
  <div class="gr-body">
    <div class="gr-tip">Cho tặng hoặc trao đổi đồ không còn dùng trong xã để giảm rác cồng kềnh. Vật dụng không ai nhận thì <span data-citizen-go="bulkyNew" style="color:var(--gr-800);font-weight:800;cursor:pointer">đăng ký thu gom cồng kềnh</span>.</div>
    ${CITIZEN_MARKET.map(post => `<div class="gr-card clickable" data-citizen-go="marketDetail" data-citizen-id="${post.id}"><div class="gr-post"><div class="gr-post-img sm">Ảnh</div><div><div class="gr-card-top"><strong>${escapeHtml(post.title)}</strong>${grTag(post.tag, post.tag === "Cho tặng" ? "" : "alt")}</div><p>${escapeHtml(post.description.slice(0, 70))}…</p><span class="muted">${escapeHtml(post.owner)} · ${post.time} · ${post.comments.length} bình luận</span></div></div></div>`).join("")}
  </div>`;
}

function citizenMarketDetail(id) {
  const post = CITIZEN_MARKET.find(row => row.id === id) || CITIZEN_MARKET[0];
  const comments = post.comments.length ? post.comments.map(([user, text, time]) => `<div class="gr-comment"><span class="gr-avatar">${user.split(" ").pop().slice(0, 1)}</span><div><strong>${escapeHtml(user)} <small>· ${time}</small></strong><p>${escapeHtml(text)}</p></div></div>`).join("") : `<div class="gr-empty" style="padding:16px">Chưa có bình luận. Hãy là người đầu tiên hỏi chủ bài.</div>`;
  return `${grTopbar("Chi tiết bài đăng", "market")}<div class="gr-body">
    <div class="gr-card"><div class="gr-post-img">Ảnh vật dụng</div><div class="gr-card-top"><strong style="font-size:15px">${escapeHtml(post.title)}</strong>${grTag(post.tag, post.tag === "Cho tặng" ? "" : "alt")}</div><p>${escapeHtml(post.description)}</p><span class="muted">${escapeHtml(post.owner)} · ${post.time}</span></div>
    <div class="gr-fab-row"><button type="button" class="gr-btn" data-citizen-notice="Đã mô phỏng gửi tin nhắn cho chủ bài.">${icon("message")} Nhắn cho chủ bài</button><button type="button" class="gr-btn ghost iconbtn" data-citizen-notice="Đã lưu bài (mô phỏng)." aria-label="Lưu bài">${icon("star")}</button></div>
    <div class="gr-card"><h3>Bình luận (${post.comments.length})</h3>${comments}<form class="gr-inline-form" data-citizen-form="comment"><input class="gr-input" placeholder="Viết bình luận..." required><button type="submit" class="gr-btn">Gửi</button></form></div>
  </div>`;
}

function citizenMarketNew() {
  return `${grTopbar("Đăng bài mới", "market")}<div class="gr-body">
    <form data-citizen-form="market">
      <div class="gr-field"><span>Ảnh vật dụng <i>*</i></span><div class="gr-upload" data-citizen-notice="Bản xem trước không tải ảnh thật.">${icon("camera")} Thêm tối đa 5 ảnh</div></div>
      <label class="gr-field"><span>Tên vật dụng <i>*</i></span><input class="gr-input" required placeholder="Ví dụ: Ghế sofa 3 chỗ"></label>
      <label class="gr-field"><span>Hình thức <i>*</i></span><select class="gr-input" required><option>Cho tặng</option><option>Trao đổi</option></select></label>
      <label class="gr-field"><span>Mô tả tình trạng <i>*</i></span><textarea class="gr-input" required placeholder="Kích thước, tình trạng, giờ có thể đến lấy..."></textarea></label>
      <label class="gr-field"><span>Địa điểm nhận</span><input class="gr-input" value="Tổ 5, Đông Thạnh"></label>
      <div class="gr-sticky"><button type="submit" class="gr-btn">Đăng bài</button></div>
    </form>
  </div>`;
}

function citizenBulkyNew() {
  return `${grTopbar("Đăng ký rác cồng kềnh")}<div class="gr-body">
    <div class="gr-tip"><strong>Áp dụng cho</strong> nệm, tủ, sofa, thiết bị điện lớn, xà bần. Chi phí thu gom bổ sung tính theo quy định; ${escapeHtml(CITIZEN_PROFILE.company)} báo phí trước khi đến.</div>
    <form data-citizen-form="bulky">
      <label class="gr-field"><span>Loại vật dụng <i>*</i></span><select class="gr-input" required><option value="">Chọn loại vật dụng</option><option>Nệm, chăn ga khối lớn</option><option>Tủ, bàn, ghế, sofa</option><option>Thiết bị điện lớn (tủ lạnh, máy giặt)</option><option>Xà bần, cành cây lớn</option></select></label>
      <label class="gr-field"><span>Số lượng ước tính <i>*</i></span><input class="gr-input" type="number" min="1" value="1" required></label>
      <label class="gr-field"><span>Địa chỉ thu gom <i>*</i></span><input class="gr-input" value="${escapeHtml(CITIZEN_PROFILE.address)}" required></label>
      <label class="gr-field"><span>Ngày mong muốn <i>*</i></span><input class="gr-input" type="date" required></label>
      <div class="gr-field"><span>Ảnh vật dụng</span><div class="gr-upload" data-citizen-notice="Bản xem trước không tải ảnh thật.">${icon("camera")} Chụp ảnh để công ty báo phí chính xác</div></div>
      <div class="gr-summary"><small>Chi phí dự kiến</small>Công ty xác nhận mức phí theo biểu giá của xã sau khi tiếp nhận; bản xem trước chưa gắn biểu giá chính thức.</div>
      <div class="gr-sticky"><button type="submit" class="gr-btn">Gửi đăng ký</button></div>
    </form>
  </div>`;
}

function citizenBulkyStatus() {
  return `${grTopbar("Yêu cầu thu gom cồng kềnh")}<div class="gr-body">
    <button type="button" class="gr-btn" data-citizen-go="bulkyNew" style="margin-bottom:14px">${icon("plus")} Đăng ký mới</button>
    ${CITIZEN_BULKY.map(item => `<div class="gr-card"><div class="gr-card-top"><strong>${escapeHtml(item.item)}</strong>${grTag(item.status, item.tone)}</div><p>${escapeHtml(item.date)}</p><span class="muted">${item.id} · Phí: ${escapeHtml(item.fee)}</span></div>`).join("")}
  </div>`;
}

const CITIZEN_SCREENS = {
  home: { tab: "home", render: citizenHome },
  notifications: { tab: "notifications", render: citizenNotifications },
  account: { tab: "account", render: citizenAccount },
  settings: { tab: "account", render: citizenSettings },
  household: { tab: "account", render: citizenHousehold },
  schedule: { tab: "home", render: citizenSchedule },
  receipts: { tab: "home", render: citizenReceipts },
  complaints: { tab: "home", render: citizenComplaints },
  complaintNew: { tab: "home", render: citizenComplaintNew },
  complaintDetail: { tab: "home", render: citizenComplaintDetail },
  payment: { tab: "home", render: citizenPayment },
  paymentReceipt: { tab: "home", render: citizenPaymentReceipt },
  market: { tab: "market", render: citizenMarket },
  marketDetail: { tab: "market", render: citizenMarketDetail },
  marketNew: { tab: "market", render: citizenMarketNew },
  bulkyNew: { tab: "home", render: citizenBulkyNew },
  bulkyStatus: { tab: "home", render: citizenBulkyStatus }
};

const CITIZEN_FORM_NOTICES = {
  complaint: "Đã gửi phản ánh tới UBND xã và công ty thu gom. Xã và công ty nhận được thông báo ngay.",
  market: "Đã đăng bài lên Chợ đồ cũ (mô phỏng, dữ liệu không được lưu).",
  comment: "Đã gửi bình luận (mô phỏng).",
  bulky: "Đã gửi đăng ký thu gom cồng kềnh; chờ công ty xác nhận phí (mô phỏng)."
};

function renderCitizenTabbar(activeTab) {
  document.getElementById("citizenTabbar").innerHTML = CITIZEN_TABS.map(tab => `<button type="button" class="phone-tab-item ${tab.id === activeTab ? "active" : ""}" data-citizen-go="${tab.id}"><span class="phone-tab-icon">${icon(tab.icon)}</span>${tab.label}${typeof tab.dot === "function" && tab.dot() ? `<b class="dot">${tab.dot()}</b>` : ""}</button>`).join("");
  citizenUpdateTriggerBadge();
}

// Số thông báo chưa đọc của người dân hiện trên nút mở ứng dụng để cán bộ xem prototype thấy ngay phản hồi đã tới dân.
function citizenUpdateTriggerBadge() {
  const trigger = document.getElementById("citizenPreviewTrigger");
  if (!trigger) return;
  const unread = CITIZEN_NOTIFICATIONS.filter(n => n.unread).length;
  let b = trigger.querySelector("b");
  if (!b) { b = document.createElement("b"); trigger.appendChild(b); }
  b.textContent = unread;
  b.hidden = !unread;
}

// Thông báo tới người dân; bấm vào mở đúng phản ánh (go/id) nếu có.
function citizenNotify({ group = "complaint", icon: ic = "message", title, text, go = "notifications", id = null }) {
  CITIZEN_NOTIFICATIONS.unshift({ group, icon: ic, title, text, time: citizenStamp(), unread: true, go, id });
  citizenUpdateTriggerBadge();
}
const citizenStamp = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} · ${csIsoToVi(CS_TODAY)}`; };
const citizenComplaintStatus = c => c.status === "done" ? ["Đã xử lý", "success"] : c.status === "processing" ? ["Đang xử lý", "info"] : ["Đã gửi", "info"];

// Xã / công ty cập nhật khiếu nại → phản ánh của người dân đổi trạng thái, thêm bước tiến trình và gửi thông báo.
function citizenSyncComplaint(c, text) {
  const item = CITIZEN_COMPLAINTS.find(x => x.csId === c.id);
  if (!item) return;
  const [status, tone] = citizenComplaintStatus(c);
  Object.assign(item, { status, tone });
  item.timeline.push([citizenStamp().replace(" · ", " "), text]);
  citizenNotify({ icon: c.status === "done" ? "check" : "message", title: `Phản ánh ${item.id} · ${status}`, text, go: "complaintDetail", id: item.id });
}

function renderCitizenScreen(screenId, detailId) {
  const screen = CITIZEN_SCREENS[screenId] ? screenId : "home";
  const content = document.getElementById("citizenPhoneContent");
  content.innerHTML = CITIZEN_SCREENS[screen].render(detailId);
  content.scrollTop = 0;
  renderCitizenTabbar(CITIZEN_SCREENS[screen].tab);
}

function openCitizenPreview(screenId = "home") {
  const backdrop = document.getElementById("citizenPreviewBackdrop");
  backdrop.classList.add("show");
  backdrop.setAttribute("aria-hidden", "false");
  renderCitizenScreen(screenId);
  document.getElementById("citizenPhoneContent").focus({ preventScroll: true });
}

function closeCitizenPreview() {
  const backdrop = document.getElementById("citizenPreviewBackdrop");
  backdrop.classList.remove("show");
  backdrop.setAttribute("aria-hidden", "true");
}

function bindCitizenPreview() {
  const backdrop = document.getElementById("citizenPreviewBackdrop");
  if (!backdrop) return;
  const trigger = document.getElementById("citizenPreviewTrigger");
  trigger.innerHTML = `${icon("phone")} Ứng dụng người dân`;
  trigger.addEventListener("click", () => openCitizenPreview("home"));
  document.getElementById("citizenPreviewClose").addEventListener("click", closeCitizenPreview);
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeCitizenPreview();
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && backdrop.classList.contains("show")) closeCitizenPreview();
  });
  backdrop.addEventListener("click", event => {
    const seg = event.target.closest("[data-citizen-seg]");
    if (seg) { citizenNotifSeg = seg.dataset.citizenSeg; renderCitizenScreen("notifications"); return; }
    const notice = event.target.closest("[data-citizen-notice]");
    if (notice) { showDemoNotice(notice.dataset.citizenNotice); return; }
    if (event.target.closest("[data-citizen-read-all]")) { CITIZEN_NOTIFICATIONS.forEach(n => { n.unread = false; }); renderCitizenScreen("notifications"); showDemoNotice("Đã đánh dấu tất cả thông báo là đã đọc."); return; }
    const notif = event.target.closest("[data-citizen-notif]");
    if (notif && CITIZEN_NOTIFICATIONS[Number(notif.dataset.citizenNotif)]) CITIZEN_NOTIFICATIONS[Number(notif.dataset.citizenNotif)].unread = false;
    const target = event.target.closest("[data-citizen-go]");
    if (target) renderCitizenScreen(target.dataset.citizenGo, target.dataset.citizenId);
  });
  backdrop.addEventListener("submit", event => {
    const form = event.target.closest("[data-citizen-form]");
    if (!form) return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const kind = form.dataset.citizenForm;
    if (kind === "complaint") citizenSubmitComplaint(form);
    showDemoNotice(CITIZEN_FORM_NOTICES[kind] || "Thao tác đã được mô phỏng.");
    if (kind === "complaint") renderCitizenScreen("complaints");
    else if (kind === "market") renderCitizenScreen("market");
    else if (kind === "bulky") renderCitizenScreen("bulkyStatus");
    else form.reset();
  });
  const params = new URLSearchParams(window.location.search);
  if (params.has("citizen")) {
    document.body.classList.add("citizen-shot");
    openCitizenPreview(params.get("citizen") || "home");
  }
}

document.addEventListener("DOMContentLoaded", () => { bindCitizenPreview(); citizenUpdateTriggerBadge(); });
