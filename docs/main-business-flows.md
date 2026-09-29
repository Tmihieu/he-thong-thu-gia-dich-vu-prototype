# 4 luồng nghiệp vụ chính (Main Business Flows)

Phiên bản 1.0, ngày 29/09/2026. Nguồn: `SPEC.md` §9–§11, `docs/data-dictionary.md` (G1, G15, P1–P4, R15), `docs/cho-do-cu-spec.md`.
Mỗi luồng gồm: Trigger, Pre-condition, End condition và swimlane dạng bảng. Mỗi dòng là một bước, cột **Lane** là người hoặc hệ thống làm bước đó.

**Mức triển khai:** Luồng 1–3 mô tả **as-is**, khớp code hiện tại (đã review ngày 29/09/2026). Luồng 4 là **to-be**, theo `cho-do-cu-spec.md`, **chưa code**.

Tác nhân: **QT** là Quản trị (`ADMIN`), **CBX** là Cán bộ xã (`COMMUNE_OFFICER`, kiêm kế toán), **LĐ** là Lãnh đạo (`LEADER`), **CT** là Công ty môi trường (`COMPANY_MANAGER`), **NĐT** là Người đi thu (`COLLECTOR`), **ND** là Người dân (app), **HT** là Hệ thống.

---

## Luồng 1: Mở kỳ thu → phát hành phiếu yêu cầu thu → sinh khoản thu cho công ty

- **Trigger:** đến đầu tháng hoặc đầu quý, Quản trị mở kỳ thu mới.
- **Pre-condition:**
  - Có phiên bản biểu giá đang hiệu lực tại ngày đầu kỳ (mặc định QĐ 65/2026).
  - Hộ đã có hồ sơ đối tượng và hợp đồng.
  - Khu vực (tổ) đã có hoặc sẽ được phân công công ty.
- **End condition (thành công):**
  - Phiếu yêu cầu thu ở trạng thái đã phát hành.
  - Mỗi hộ hợp lệ có đúng một `Charge` (khoản thu) *Chưa thu* với số tiền được chụp lại (snapshot). Hộ miễn 100% có khoản *Miễn giảm* 0 đ.
  - Công ty phụ trách thấy danh sách hộ và tổng phải thu của kỳ. Hệ thống chưa gửi thông báo phát hành cho công ty.
- **End condition (thất bại hoặc thay thế):**
  - Không có biểu giá hiệu lực thì không mở được kỳ.
  - Kỳ đã khóa thì không phát hành được phiếu.
  - Phát hành lại cùng kỳ và cùng loại phí thì không sinh khoản trùng.
  - Không còn hộ hợp lệ thì hệ thống không tạo phiếu.

| # | Lane | Bước | Quy tắc / nhánh |
|---|---|---|---|
| 1 | QT | Chọn loại kỳ (tháng/quý), năm, số kỳ, ngày mở, hạn nộp → Mở kỳ | G1: chỉ QT được mở kỳ |
| 2 | HT | Kiểm tra trùng kỳ, gắn biểu giá hiệu lực tại ngày đầu kỳ, đặt trạng thái **Đang thu** | P1: mở kỳ là Đang thu luôn. Trùng kỳ hoặc không có biểu giá → lỗi |
| 3 | CBX | Kiểm tra tổ chưa có công ty → mở popup phân công (chọn công ty, ngày bắt đầu, nhiều tổ) | Mỗi tổ tối đa 1 công ty trong cùng thời gian hiệu lực. Đổi công ty thì HT tự đóng phân công cũ và giữ lịch sử |
| 4 | CBX | Tạo phiếu yêu cầu thu: chọn kỳ, loại phí, phạm vi (toàn xã / chọn tổ / theo công ty), hạn đóng, ghi chú. Loại phí đơn giá cố định (FIXED) thì nhập thêm đơn giá | Hạn đóng không trước ngày mở kỳ và không sau hạn nộp của kỳ. FIXED nhập đơn giá 0 → 422 (P3) |
| 5 | HT | Tính **xem trước**: số tiền = giá tháng × (quý ? 3 : 1); hộ miễn → 0. Loại phí FIXED thì lấy đơn giá đã nhập. Bỏ qua hộ không hoạt động, hộ không có hợp đồng hiệu lực, hộ đã có khoản trùng kỳ, và hộ ở tổ chưa có công ty (kèm cảnh báo) | R1–R4 |
| 6 | CBX | Xem danh sách, số hộ, tổng tiền, cảnh báo → quyết định | Nhánh: có cảnh báo tổ chưa có công ty thì quay lại bước 3 |
| 7 | CBX | Bấm **Phát hành** | |
| 8 | HT | Sinh `Charge` cho từng hộ (snapshot số tiền, hạn), lưu phiếu, ghi audit | Idempotent: không sinh trùng |
| 9 | CT | Xem danh sách hộ phải thu và tổng phải thu của kỳ | Chuyển sang Luồng 2 |

---

## Luồng 2: Công ty tổ chức thu → nộp về xã đủ → cán bộ xã khóa kỳ

- **Trigger:** công ty nhận được khoản thu của kỳ (kết thúc Luồng 1).
- **Pre-condition:**
  - Kỳ đang ở trạng thái Đang thu.
  - Công ty có tài khoản người đi thu.
- **End condition (thành công):** kỳ chuyển sang **Đã khóa**. Để khóa được, mọi công ty phải có *còn phải nộp = phải thu − điều chỉnh − đã nộp = 0*. Đối soát hiển thị **Khớp**. Sau khi khóa không sửa được khoản thu, thanh toán hay phiếu thu của kỳ.
- **End condition (bị chặn):** còn công ty có số còn phải nộp lớn hơn 0 thì khóa kỳ bị từ chối, kèm lý do và số tiền (G15). Hộ chưa thu vẫn tính vào số công ty phải nộp.

| # | Lane | Bước | Quy tắc / nhánh |
|---|---|---|---|
| 1 | CT | Phân tổ cho người đi thu (người, tổ, từ ngày) | Cho phép nhiều người/tổ; seed 1 người/tổ |
| 2 | NĐT | Mở danh sách hộ trong tổ được giao, lọc theo trạng thái | Chỉ thấy hộ thuộc tổ của mình |
| 3 | NĐT | Đến hộ và ghi kết quả. **3a** Thu được: tiền mặt hoặc chuyển khoản → HT tạo `Payment`. **3b** Vắng, hẹn lại (kèm ngày) hoặc từ chối → HT lưu `CollectionVisit` | Gửi 2 lần thì không tạo 2 thanh toán. Nhánh 3b quay lại bước 3 ở lần ghé sau |
| 3' | ND | (song song) Thanh toán **mô phỏng** trên app → HT tạo `Payment` loại app | Công ty và xã thấy *Đã thu* ngay |
| 4 | HT | Khi tổng thanh toán ≥ số tiền thì khoản chuyển **Đã thu**. Cộng tiền mặt đang giữ cho người đi thu. Tạo xác nhận thanh toán cho hộ | O1: không phải biên lai pháp lý |
| 5 | NĐT | Báo sai thông tin hộ (nếu có) | CT hoặc CBX xử lý hồ sơ |
| 6 | NĐT → CT | Bàn giao tiền mặt cho công ty | Số tiền ≤ tiền mặt đang giữ |
| 7 | CT | Theo dõi tiến độ theo tổ và người thu. Có thể cập nhật thay người thu | Cờ < 45% (P4) |
| 8 | CBX | Theo dõi tiến độ và đối soát. Nhắc nộp công ty có nợ quá hạn → HT thông báo cho CT | Chỉ nhắc được công ty có nợ quá hạn, không có thì báo lỗi 422. Bản nháp nhắc đặt hạn mới là +5 ngày |
| 9 | CT | Nộp tiền về xã (một hoặc nhiều lần) | O2: nộp toàn bộ số đã thu |
| 10 | CBX | Lập **phiếu thu** `PT-CT-MMYY-nnn` cho mỗi lần nộp | R15: 0 < số tiền ≤ còn phải nộp, vượt thì bị từ chối. Mỗi kỳ 1 phiếu, nhiều lần nộp |
| 11 | HT | Cập nhật đã nộp và trạng thái đối soát: **Đang nộp**, **Khớp** hoặc **Lệch**. Thông báo phiếu thu cho CT | Chênh lệch = đã nộp − công ty đã thu |
| 12 | CT | Xem phiếu thu. Nếu sai thì **báo sai sót** (loại, số đúng, mô tả) | |
| 13 | CBX | Xử lý sai sót: sửa hoặc đóng kèm ghi chú → *Đã xử lý* | P2: sai sót phát hiện sau khóa chỉ đóng kèm ghi chú |
| 14 | CBX | **Hộ không thu được** (chuyển đi, nhà bỏ trống, thu nhầm): lập đề nghị **xóa nợ** hoặc **hoàn** `DN-MMYY-nnn`. Bật cờ miễn 100% thì HT tự tạo đề nghị để LĐ xem lại | Công ty có thể đề nghị hoàn qua xã |
| 15 | LĐ | Duyệt hoặc Từ chối (từ chối bắt buộc ghi ý kiến) → HT thông báo cho người đề nghị | Xóa nợ duyệt: khoản chuyển *Đã xóa nợ*, giảm phải thu. Hoàn duyệt: giảm đã thu. Miễn giảm bị từ chối: bỏ cờ, khoản của kỳ đang mở về Chưa thu |
| 16 | CBX | Bấm **Khóa kỳ** | Chỉ CBX được khóa, LĐ không được. Chỉ khóa được kỳ đang ở trạng thái Đang thu |
| 17 | HT | Kiểm tra từng công ty: còn phải nộp > 0 thì **chặn** kèm lý do, quay lại bước 3, 9 hoặc 14. Tất cả bằng 0 thì chuyển **Đã khóa** và ghi người khóa | G15. Điều chỉnh cho kỳ đã khóa ghi ở kỳ đang mở (O10) |

---

## Luồng 3: Tiếp nhận và giải quyết khiếu nại

- **Trigger:**
  - Người dân gửi khiếu nại trên app, hoặc
  - Cán bộ xã ghi nhận khiếu nại nhận qua điện thoại hoặc trực tiếp.
- **Pre-condition:** người dân có tài khoản app gắn với hộ, hoặc cán bộ xã xác định được hộ hoặc khu vực liên quan.
- **End condition (thành công):**
  - Khiếu nại ở trạng thái **Đã giải quyết**.
  - Timeline đủ các bước (tiếp nhận, chuyển công ty nếu có, công ty phản hồi, đóng), lưu nối tiếp và không ghi đè.
  - Người dân nhận thông báo và xem được kết quả.
- **End condition (thay thế):** xã tự giải quyết, không chuyển công ty. Timeline khi đó không có bước chuyển và phản hồi.

| # | Lane | Bước | Quy tắc / nhánh |
|---|---|---|---|
| 1 | ND hoặc CBX | Gửi hoặc ghi nhận khiếu nại: loại, nội dung, ảnh (nếu có), kênh (app / điện thoại / trực tiếp) | |
| 2 | HT | Sinh mã, gắn hộ và khu vực, trạng thái **Mới**, ghi sự kiện *tiếp nhận* | Chỉ khiếu nại gửi từ app mới thông báo cho CBX. CBX không được ghi nhận kênh app |
| 3 | CBX | Mở và phân loại khiếu nại | Không có thao tác chuyển Đang xử lý riêng |
| 4 | CBX | **Nhánh A**, thuộc xã (hồ sơ, giá, miễn giảm): tự xử lý → sang bước 7. Trạng thái đi thẳng từ Mới sang Đã giải quyết | Liên quan tiền thì có thể dẫn tới đề nghị hoàn hoặc xóa nợ (Luồng 2, bước 14) |
| 5 | CBX | **Nhánh B**, thuộc công ty (bỏ sót thu gom, thái độ người thu): chuyển cho công ty phụ trách khu vực, hạn **+3 ngày** | Trạng thái sang **Đang xử lý**. HT ghi sự kiện *chuyển công ty*, thông báo cho CT và ND. Mỗi khiếu nại chỉ chuyển được **1 lần**. Tổ chưa có công ty thì không chuyển được (`COMPLAINT_NO_COMPANY`) |
| 6 | CT | Xem khiếu nại được chuyển cho mình → xử lý thực tế → gửi **phản hồi** | CT chỉ thấy khiếu nại đã chuyển cho mình (G12). HT ghi sự kiện *công ty phản hồi*, thông báo cho CBX và ND. HT chỉ lưu hạn xử lý, không có logic cảnh báo quá hạn |
| 7 | CBX | Xem phản hồi (nếu có), ghi kết quả → **Đóng** → trạng thái *Đã giải quyết* | Không chuyển lại được. Phản hồi chưa đạt thì CBX tự xử lý rồi đóng. HT ghi sự kiện *đóng* và thông báo cho ND, cùng CT nếu khiếu nại đã chuyển |
| 8 | ND | Xem timeline và kết quả trên app | LĐ chỉ xem |

---

## Luồng 4: Chợ đồ cũ (cho tặng / trao đổi): TO-BE, chưa code

> **As-is hiện tại:** bài có tiêu đề và mô tả, một loại bài (Cho tặng hoặc Đổi), có bình luận. Chủ bài chỉ đóng được bài. Chưa có tag, danh mục, chia sẻ SĐT, lưu bài, chặn, ẩn, sửa, mở lại, giới hạn số bài. Bảng dưới là thiết kế to-be.

- **Trigger:** người dân có đồ muốn cho, đổi, bán hoặc cần tìm, và đăng bài trên app.
- **Pre-condition:** người dân có tài khoản ở trạng thái ACTIVE. Phải đăng nhập mới xem được chợ.
- **End condition (thành công):**
  - Hai bên liên hệ được qua bình luận hoặc số điện thoại mà chủ bài chủ động chia sẻ.
  - Chủ bài **Đóng** bài, trạng thái *Đã xong*.
- **End condition (thay thế):** chủ bài ẩn bài, hoặc bài vẫn mở vì không tự hết hạn.
- **Ngoài phạm vi:** không có giao dịch, thanh toán hay vận chuyển trong hệ thống. Không có kiểm duyệt (D05, O6).

| # | Lane | Bước | Quy tắc / nhánh |
|---|---|---|---|
| 1 | ND (chủ bài) | Đăng bài: caption (1–2.500 ký tự), 0–5 ảnh, 1–4 tag (Tìm / Bán / Cho tặng / Đổi), danh mục. Tùy chọn bật chia sẻ SĐT | Không có trường giá (D01) |
| 2 | HT | Kiểm tra hợp lệ và giới hạn (10 bài/ngày), chống gửi trùng. Tổ của bài lấy theo hộ của tác giả. Đăng là hiển thị ngay (OPEN) | Vượt giới hạn → 429 |
| 3 | ND (người xem) | Xem feed, tìm theo từ khóa, lọc tag / danh mục / tổ → mở chi tiết | Nội bộ chỉ đọc |
| 4 | ND (người xem) | Bình luận, **lưu bài**, hoặc bấm **Gọi** nếu chủ bài chia sẻ SĐT | Chỉ bài OPEN và không bị chặn |
| 5 | HT | Gửi thông báo *"Có bình luận mới"* cho chủ bài, hoặc cho những người đã bình luận khi chủ bài trả lời | |
| 6 | ND (hai bên) | Thỏa thuận và gặp nhau **ngoài hệ thống** | |
| 7 | ND (chủ bài) | Sửa bài. Bài đã xong thì **Đóng**. Có thể **Mở lại** hoặc **Ẩn / Hiện** bài | Đóng thì không nhận bình luận mới |
| 8 | ND (bất kỳ) | Nhánh: **Chặn** người dùng → hai bên không còn thấy bài, bình luận và SĐT của nhau | |
| 9 | ND | (tùy chọn) Đồ không cho được thì đăng ký **rác cồng kềnh** → CT báo phí | Luồng phụ, không sinh khoản thu (O5) |
