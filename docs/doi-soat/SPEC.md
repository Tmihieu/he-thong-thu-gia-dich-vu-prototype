# Màn hình Đối soát Xã – Công ty thu gom (PSFMS)

Gói bàn giao gồm 2 file đặt cùng thư mục:

- `SPEC.md` (file này): nghiệp vụ, công thức, dữ liệu cần có, tiêu chí nghiệm thu.
- `mockup.html`: bản mẫu giao diện chạy được. Mở bằng trình duyệt là xem được, bấm thử "Tạo phiếu" được. Đây chỉ là **tham chiếu bố cục và logic**, không phải code để chép.

---

## 0. Cách dùng gói này

1. Chép thư mục này vào repo, ví dụ `docs/doi-soat/` (gồm `SPEC.md` và `mockup.html`).
2. Mở `docs/doi-soat/mockup.html` bằng trình duyệt để xem trước giao diện.
3. Mở Claude (Claude Code) ở thư mục gốc của repo, dán nguyên prompt ở mục 1.
4. Claude sẽ khảo sát code hiện có, đưa ra kế hoạch sửa, rồi chờ bạn xác nhận. **Đọc kỹ kế hoạch trước khi đồng ý**, đặc biệt các thay đổi database.

---

## 1. Prompt dán vào Claude

```text
Đọc docs/doi-soat/SPEC.md và mở docs/doi-soat/mockup.html (mockup tham chiếu, có cả logic tính toán bằng JS).

Nhiệm vụ: sửa màn hình Đối soát hiện có trong dự án để khớp với SPEC (bố cục, cột, công thức, hành vi tạo phiếu).

Yêu cầu:
1. Trước khi sửa: tìm trang/component đối soát hiện tại ở frontend, các API, service, entity và bảng DB liên quan ở backend. Liệt kê cái gì đã có, cái gì thiếu, cái gì phải đổi (frontend / backend / DB migration). Dừng lại cho tôi duyệt kế hoạch.
2. Mọi phép tính tiền làm ở BACKEND như mục 3 và 5 của SPEC. Frontend chỉ hiển thị, không tự tính lại.
3. Dùng đúng convention, component, thư viện UI và cách gọi API đang có trong repo. Mockup chỉ để tham chiếu bố cục, màu và nội dung: KHÔNG chép inline style, KHÔNG chép dữ liệu mẫu, KHÔNG đưa thanh "Dữ liệu mẫu" vào UI thật.
4. Tiền là số nguyên VND (long/BigDecimal), không dùng float/double. Hiển thị dạng 1.234.567 (dấu chấm ngăn nghìn).
5. Viết test backend cho công thức đối soát theo các ca ở mục 8 của SPEC.
6. Mục 10 là các câu hỏi chưa chốt: KHÔNG tự quyết. Nếu đụng tới, hỏi tôi.
```

---

## 2. Bối cảnh nghiệp vụ

- Mỗi hộ đóng một khoản phí hằng kỳ (tháng). Khoản này gồm 2 phần:
  - **Vận chuyển (V)**: thuộc về **Xã**.
  - **Thu gom (G)**: thuộc về **Công ty thu gom** phụ trách hộ đó.
- Có **11 công ty**, mỗi ấp do đúng một công ty phụ trách.
- Hộ đóng theo 2 kênh, và tiền nằm ở 2 nơi khác nhau:
  - **QR**: tiền vào **tài khoản Xã**. Xã đang giữ hộ phần **thu gom** của công ty.
  - **Tiền mặt**: người thu tiền của **công ty** thu. Công ty đang giữ hộ phần **vận chuyển** của xã.
- Cuối kỳ, hai bên **bù trừ cho nhau**, chỉ chuyển **phần chênh lệch**. Mỗi công ty, mỗi kỳ có **một phiếu**:
  - Công ty nộp chênh lệch cho Xã: Xã lập **Phiếu thu**.
  - Xã trả chênh lệch cho công ty: Xã lập **Phiếu chi**.
  - Hai bên bằng nhau: **không cần phiếu**.
- Công ty chỉ nộp phần **đã thực thu**, không nộp theo khoán. Hộ chưa đóng **không** tạo nghĩa vụ giữa Xã và công ty (nợ vẫn là của hộ).
- Người dùng màn hình: **Cán bộ xã**.

---

## 3. Công thức

Ký hiệu cho **một công ty trong một kỳ**:

| Ký hiệu | Ý nghĩa | Nguồn |
|---|---|---|
| `qr.total`, `qr.transport`, `qr.collection` | Tổng / phần vận chuyển / phần thu gom của các khoản **QR đã khớp** với hộ thuộc công ty này | Giao dịch ngân hàng đã khớp với khoản thu |
| `cash.total`, `cash.transport`, `cash.collection` | Tổng / vận chuyển / thu gom của các khoản **tiền mặt** người thu của công ty đã ghi nhận | Bản ghi thu tiền từ app Người thu tiền |

Quy tắc:

- **R1. Tách V/G theo từng khoản thu.** Lấy phần vận chuyển và thu gom đã **chốt sẵn trên từng khoản thu lúc phát hành** (theo hợp đồng của công ty phụ trách). Không tính lại từ biểu giá hiện hành, và không giả định tỷ lệ cố định cho cả xã.
- **R2. Gán công ty.** Mỗi khoản thu gắn với công ty phụ trách hộ **tại thời điểm phát hành khoản thu**. Khoản QR thuộc công ty của khoản thu mà nó khớp.
- **R3. Kết quả bù trừ.**
  ```
  companyOwes  = cash.transport        // Cty phải nộp Xã
  communeOwes  = qr.collection         // Xã phải trả Cty
  net          = companyOwes - communeOwes
  net > 0  → direction = COMPANY_PAYS  → Phiếu thu, số tiền = net
  net < 0  → direction = COMMUNE_PAYS  → Phiếu chi, số tiền = |net|
  net = 0  → direction = NONE          → không cần phiếu, coi như Khớp
  ```
- **R4. Đối chiếu tiền xã theo từng công ty.**
  ```
  entitled = qr.transport + cash.transport                     // Xã được hưởng
  holding  = qr.total
           + (đã có phiếu thu ? số tiền phiếu : 0)
           - (đã có phiếu chi ? số tiền phiếu : 0)              // Xã đang giữ
  holding - entitled  > 0 → "Thừa …"   < 0 → "Thiếu …"   = 0 → "✓ Đủ"
  ```
  Kiểm tra: khi đã có phiếu (hoặc net = 0) thì luôn có `holding == entitled`.
- **R5. Tổng của kỳ.** Lấy tổng của 11 công ty:
  ```
  holding  = Σ qr.total + Σ phiếu thu đã tạo − Σ phiếu chi đã tạo
  entitled = Σ qr.transport + Σ cash.transport
  diff     = holding − entitled
  diff > 0 → "Xã đang THỪA"  (tiền thu gom của Cty xã đang giữ hộ, phải chi trả)
  diff < 0 → "Xã đang THIẾU" (Cty còn giữ tiền vận chuyển của xã, phải thu về)
  diff = 0 → "Đã cân"
  remainingToPay     = Σ |net| của các Cty COMMUNE_PAYS chưa có phiếu (kèm số Cty)
  remainingToCollect = Σ net   của các Cty COMPANY_PAYS chưa có phiếu (kèm số Cty)
  ```
  Kiểm tra: `diff == remainingToPay − remainingToCollect`.
- **R6. QR chưa xác định công ty.** Là giao dịch QR có trong sao kê nhưng chưa khớp được với hộ nào. Khoản này **không** cộng vào cột của công ty nào, và **không** cộng vào `holding`. Hiển thị riêng ở dải cảnh báo:
  `Sao kê QR = Σ qr.total + chưa xác định (số giao dịch, số tiền)`.

---

## 4. Bố cục màn hình

Xem `mockup.html`. Màn hình chia từ trên xuống dưới như sau.

**Đầu trang:** tiêu đề "Đối soát tháng MM/YYYY", mô tả ngắn, và ô chọn **Kỳ**.

**Khối 1: "Tiền xã đang giữ trong kỳ".** Một phép tính hiển thị ngang:
`[Xã đang giữ] − [Xã được hưởng · phí vận chuyển] = [Thừa / Thiếu / Đã cân]`

- Dưới mỗi số có dòng diễn giải công thức (QR đã nhận + đã thu từ Cty − đã chi cho Cty; vận chuyển trong QR + vận chuyển trong tiền mặt).
- Ô kết quả đổi màu: xanh dương khi thừa, cam khi thiếu, xanh lá khi đã cân.
- Chân khối: "Xã còn phải chi: X cho n Cty", "Xã còn phải thu: Y từ m Cty", và ghi chú phần QR chưa xác định.

**Khối 2: Dải cảnh báo QR chưa xác định công ty** (R6). Có link "Xử lý →" dẫn tới hàng chờ gán giao dịch. Màn hình hàng chờ **nằm ngoài phạm vi** lần sửa này, chỉ cần link.

**Khối 3: Bảng 11 công ty.**

- Tab lọc: **Tất cả / Chưa khớp / Đã khớp**, mỗi tab kèm số lượng.
- Cột, theo đúng thứ tự:

| # | Nhóm | Cột | Giá trị |
|---|---|---|---|
| 1 | | Công ty | tên công ty (chữ thường, **không** phải link) |
| 2 | Xã nhận qua QR (nền xanh dương) | Tổng | `qr.total` |
| 3 | | Vận chuyển · *Xã giữ* | `qr.transport` |
| 4 | | Thu gom · *→ Xã trả Cty* (đậm) | `qr.collection` |
| 5 | Cty thu tiền mặt (nền cam) | Tổng | `cash.total` |
| 6 | | Vận chuyển · *→ Cty nộp Xã* (đậm) | `cash.transport` |
| 7 | | Thu gom · *Cty giữ* | `cash.collection` |
| 8 | | Kết quả | Chưa khớp: "Cty nộp Xã {net}" (cam) hoặc "Xã trả Cty {\|net\|}" (xanh). Đã khớp: nhãn **✓ Khớp** (xanh lá), dòng nhỏ bên dưới giữ câu kết quả |
| 9 | Đối chiếu tiền xã (nền xanh lá) | Xã đang giữ · *QR ± phiếu đã tạo* | `holding`, dòng nhỏ: "✓ Đủ" / "Thừa …" / "Thiếu …" |
| 10 | | Xã được hưởng · *phí vận chuyển* | `entitled` |
| 11 | | Phiếu | Chưa khớp: nút **Tạo phiếu thu** (cam) hoặc **Tạo phiếu chi** (xanh). Đã khớp: link **Xem phiếu** + số phiếu. net = 0: "Không cần phiếu" |

- Bảng rộng: đặt trong vùng cuộn ngang, không làm vỡ layout trang.
- **Không có** trang chi tiết công ty. Bấm tên công ty không làm gì cả.

---

## 5. Dữ liệu backend cần cung cấp (gợi ý)

Tên endpoint và field chỉ là gợi ý. Hãy theo convention đang có trong repo.

**Lấy dữ liệu đối soát của một kỳ**

```http
GET /api/reconciliation/periods/{periodId}
```

```json
{
  "period": { "id": 10, "name": "Tháng 10/2026", "status": "OPEN" },
  "summary": {
    "qrTotal": 101400000,
    "collectedFromCompanies": 19040000,
    "paidToCompanies": 3400000,
    "holding": 117040000,
    "transportFromQr": 33800000,
    "transportFromCash": 109840000,
    "entitled": 143640000,
    "diff": -26600000,
    "remainingToPay":     { "amount": 400000,   "companyCount": 1 },
    "remainingToCollect": { "amount": 27000000, "companyCount": 5 }
  },
  "unidentifiedQr": { "count": 3, "amount": 180000, "statementTotal": 101580000 },
  "companies": [
    {
      "companyId": 1,
      "companyName": "Cty Thu gom A",
      "qr":   { "total": 15600000, "transport": 5200000,  "collection": 10400000 },
      "cash": { "total": 37200000, "transport": 12400000, "collection": 24800000 },
      "net": 2000000,
      "direction": "COMPANY_PAYS",
      "holding": 17600000,
      "entitled": 17600000,
      "status": "MATCHED",
      "voucher": { "id": 501, "code": "PT-2026-1012", "type": "RECEIPT", "amount": 2000000, "createdAt": "2026-10-31T09:00:00+07:00" }
    }
  ]
}
```

- `direction`: `COMPANY_PAYS` | `COMMUNE_PAYS` | `NONE`
- `status`: `OPEN` (chưa có phiếu và net ≠ 0) | `MATCHED` (đã có phiếu, hoặc net = 0)
- `voucher.type`: `RECEIPT` (phiếu thu) | `PAYMENT` (phiếu chi)

**Tạo phiếu cho một công ty**

```http
POST /api/reconciliation/periods/{periodId}/companies/{companyId}/voucher
```

```json
{ "transferDate": "2026-10-31", "bankReference": "FT2630412345", "note": "" }
```

- Client **không** gửi số tiền và loại phiếu. Server tự tính `net` theo R3, từ đó quyết định loại phiếu (thu/chi) và số tiền.
- Trả `409` nếu công ty đã có phiếu trong kỳ, hoặc `net = 0`.
- Sinh mã phiếu theo dạng `PT-YYYY-NNNN` (phiếu thu) và `PC-YYYY-NNNN` (phiếu chi). Nếu repo đã có quy tắc đánh số phiếu thì dùng quy tắc của repo.
- Sau khi tạo phiếu, frontend tải lại dữ liệu kỳ. Dòng đó thành **Khớp**, các số ở Khối 1 được cập nhật.

**Gợi ý lưu trữ:** một bảng phiếu đối soát, ví dụ `reconciliation_voucher` gồm `id, period_id, company_id, type, code, amount, transfer_date, bank_reference, note, created_by, created_at`, với ràng buộc **unique (`period_id`, `company_id`)**. Đồng thời lưu **snapshot** các số `qr.*`, `cash.*`, `net` tại thời điểm tạo phiếu (xem R7 ở mục 7).

---

## 6. Hành vi giao diện

- Bấm **Tạo phiếu thu/chi**: mở form (dialog) nhập **ngày chuyển tiền** và **mã giao dịch ngân hàng / chứng từ** (bắt buộc), ghi chú (tùy chọn). Form hiển thị sẵn loại phiếu và số tiền, chỉ đọc. Xác nhận thì gọi API tạo phiếu.
  - Lý do: phiếu thu/chi chỉ được lập khi tiền **đã thực sự chuyển**. "Khớp" nghĩa là tiền đã sang tay.
- **Xem phiếu**: mở phiếu đã tạo. Có thể dùng màn xem/in phiếu sẵn có nếu repo đã có, nếu chưa thì để link chờ.
- Đổi **Kỳ**: tải lại toàn bộ dữ liệu.
- Tab lọc chỉ lọc phía client. Số đếm trên tab tính theo `status`.
- Trạng thái loading và lỗi theo pattern đang có trong repo.

---

## 7. Trường hợp biên

- **R7. Khóa số sau khi tạo phiếu.** Sau khi một công ty đã có phiếu, các khoản QR/tiền mặt **mới phát sinh** cho công ty đó trong kỳ (QR về trễ, tiền mặt ghi muộn) **không được làm thay đổi** dòng đã khớp. Chúng được tính vào kỳ đối soát sau. Snapshot ở mục 5 dùng để hiển thị dòng đã khớp.
- **Thu nợ kỳ cũ:** khoản tiền thu trong kỳ này cho khoản nợ của kỳ trước được tính vào **kỳ đối soát lúc thu tiền**, không tính vào kỳ phát sinh nợ.
- **Thu trùng:** hộ vừa quét QR vừa nộp tiền mặt cho cùng một khoản. Không được tính 2 lần. Khoản thứ hai đưa vào hàng chờ xử lý (ngoài phạm vi màn này).
- **net = 0:** dòng tự là Khớp, cột Phiếu ghi "Không cần phiếu", không có nút.
- Công ty đang "ngừng hợp tác" nhưng có số liệu trong kỳ: vẫn hiện trong bảng của kỳ đó.

---

## 8. Kiểm thử chấp nhận

Dữ liệu mẫu (giống `mockup.html`): mỗi khoản 60.000 = vận chuyển 20.000 + thu gom 40.000.

**Ca 1: một công ty, phiếu thu (Cty A).** 620 khoản tiền mặt, 260 khoản QR.

| Trường | Giá trị |
|---|---|
| qr.total / transport / collection | 15.600.000 / 5.200.000 / 10.400.000 |
| cash.total / transport / collection | 37.200.000 / 12.400.000 / 24.800.000 |
| net, direction | 2.000.000, COMPANY_PAYS → Phiếu thu |
| entitled | 17.600.000 |
| holding trước khi tạo phiếu | 15.600.000 → "Thiếu 2.000.000" |
| holding sau khi tạo phiếu | 17.600.000 → "✓ Đủ" |

**Ca 2: phiếu chi (kịch bản "Cân bằng", Cty B).** 305 tiền mặt, 435 QR.
net = 6.100.000 − 17.400.000 = **−11.300.000**, nên tạo Phiếu chi 11.300.000.
holding chưa có phiếu = 26.100.000, entitled = 14.800.000, hiển thị "Thừa 11.300.000".

**Ca 3: net = 0.** 400 tiền mặt, 200 QR. net = 8.000.000 − 8.000.000 = 0, dòng tự là Khớp, "Không cần phiếu".

**Ca 4: tổng kỳ, kịch bản "Nhiều tiền mặt"** (dữ liệu đầy đủ trong `mockup.html`):

| | Giá trị |
|---|---|
| Xã đang giữ | 117.040.000 |
| Xã được hưởng | 143.640.000 |
| Kết quả | **Xã đang THIẾU 26.600.000** |
| Còn phải chi / thu | 400.000 cho 1 Cty / 27.000.000 từ 5 Cty |
| Sau khi tạo phiếu cho tất cả | **Đã cân, 0** |

**Ca 5: tổng kỳ, kịch bản "Cân bằng":** Xã đang giữ 149.300.000, được hưởng 140.320.000, **THỪA 8.980.000**. Còn phải chi 16.780.000 cho 4 Cty, còn phải thu 7.800.000 từ 2 Cty.

**Ca 6: không cho tạo phiếu 2 lần** cho cùng (kỳ, công ty): API trả 409.

---

## 9. Ngoài phạm vi (không làm lần này)

- Trang chi tiết từng công ty.
- Màn hàng chờ xử lý QR chưa xác định (chỉ cần link "Xử lý →").
- Thanh toán nhiều đợt trong kỳ, nộp theo khoán.
- Màn xác nhận số liệu phía công ty.
- Danh sách hộ chưa đóng / công nợ hộ.

---

## 10. Câu hỏi chưa chốt (Claude: hỏi lại, không tự quyết)

1. **Phiếu ghi số chênh lệch hay ghi đủ 2 chiều?** Hiện tại: 1 phiếu cho số chênh lệch. Kế toán xã có thể yêu cầu 1 phiếu thu (vận chuyển trong tiền mặt) và 1 phiếu chi (thu gom trong QR) rồi mới cấn trừ. Cần hỏi DTH hoặc kế toán xã.
2. **Có chặn chốt kỳ khi còn QR chưa xác định không?** Hai lựa chọn: chặn hẳn, hoặc cho chốt và chuyển các giao dịch đó sang kỳ sau.
3. **Tỷ lệ vận chuyển/thu gom có khác nhau giữa các công ty không?** Nếu có, R1 đã xử lý được vì tách theo từng khoản thu. Cần xác nhận dữ liệu hợp đồng đã có trong DB chưa.
4. **Ai được tạo phiếu?** Chỉ Cán bộ xã, hay cần thêm bước Lãnh đạo duyệt.
