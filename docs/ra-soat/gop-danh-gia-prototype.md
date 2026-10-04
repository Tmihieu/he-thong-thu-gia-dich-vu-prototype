# Gộp nhánh `fix/danh-gia-prototype-0410` vào `feat/ra-soat-tong` — ghi chú cho leader

Nhánh gộp: `merge/danh-gia-va-ra-soat-tong`. Mô hình tiền, danh mục đường, đổi tên phiếu thu/sai sót, menu và mobile lấy **nguyên theo `feat/ra-soat-tong`**; chỉ giữ lại bốn tính năng của nhánh đánh giá.

## 1. Đã giữ (cần leader duyệt)

| Tính năng | Nơi làm | Cần duyệt |
|---|---|---|
| Nhập hộ hàng loạt từ file Excel (xem trước, xác nhận tất cả hoặc không gì) — dùng danh mục đường, kiểm trùng bằng `findSuspectedDuplicates` | `SubjectImportService`, `ImportSubjectsModal` | **Thư viện `org.apache.poi:poi-ooxml:5.3.0`** (luật 7: không thêm thư viện khi chưa duyệt) |
| Tự tạo kỳ thu ở dạng DỰ THẢO theo quy tắc của quản trị; cán bộ xã xem trước rồi "Mở kỳ & phát hành" | `PeriodAutoService`, `PeriodPublishService`, tab "Kỳ chờ mở" | Migration **V36** `period_auto_open`; BR-MD-20 (đang ghi "Demo, chờ leader duyệt") |
| Nhóm khiếu nại "Đã đóng nhưng chưa được ghi nhận" | `ComplaintCategory.PAID_NOT_RECORDED` | Migration **V35**; BR-CMP-06 |
| Thông báo cho hộ khi công ty ghi nhận khoản thu | `CollectionService.recordPayment` | — |

Số migration V35/V36 được đánh sau V31–V34 của `feat/ra-soat-tong` để Flyway không báo "out of order".

## 2. Đã bỏ (nhánh đánh giá làm khác `feat/ra-soat-tong`)

- Mô hình tiền theo **số đã thu** (cột `charges.collection_amount`, migration V31 cũ), thu muộn vào kỳ đang mở, "biên nhận" thay "phiếu thu", đổi tỷ lệ phải nộp trên dashboard lãnh đạo, các thay đổi menu/app công dân.

## 3. Cần xác nhận với xã

File đánh giá prototype (mục 2.5) coi mô hình **theo số đã phát hành** (BR-REM-02/03: `phải nộp = phải thu − điều chỉnh − phần giữ lại`, hộ chưa đóng vẫn nằm trong phải nộp) là "Lệch — nghiêm trọng". Nhánh này theo QĐ-L7/L12/L15/L16 của leader nên giữ nguyên mô hình đó; nếu xã chốt khác thì phải sửa lại BR-REM-02/03/08/13.

## 4. Việc sau khi gộp

- CSDL demo cũ đã chạy V31–V33 của nhánh đánh giá phải **tạo lại** (`docker compose down -v` hoặc xóa và tạo lại CSDL `vsmt`), vì số migration đã đổi.
- Backend đang chạy ở cổng 8080 là bản cũ, cần khởi động lại.
