# Code theo góp ý BA 05/10

Nguồn chuẩn: [use-cases.md](../docs/use-cases.md). Danh sách chỗ demo chưa theo kịp: mục "Bản demo chưa theo kịp" trong [thay-doi-gop-y-0510.md](../docs/thay-doi-gop-y-0510.md).

Làm tuần tự từng lát, mỗi lát một commit, chỉ một việc nặng (`mvnw verify`, docker build) một lúc. Backend trước, rồi web, rồi Flutter.

| Lát | Việc | UC | Trạng thái |
|---|---|---|---|
| S1 | Chỉ một hạn nộp: bỏ hạn hộ đóng riêng của phiếu YCT/khoản; quá hạn và nhắc hộ tính theo hạn của kỳ | UC-20, UC-44 | xong backend (IT chưa chạy: Docker tắt); web ở S6 |
| S2 | Tài khoản nhận chuyển khoản của xã: khai báo (quản trị viên), VietQR và đối chiếu SePay dùng tài khoản này, bỏ `companies.bank_account`, giao dịch chờ đối chiếu chuyển sang cán bộ xã | UC-15, UC-24..27, UC-54 | xong backend (IT chưa chạy: Docker tắt); web ở S6 (màn khai tài khoản xã, bỏ ô ngân hàng ở Công ty, đổi quyền UC-27, DTO transfer-info mất `configured`), Flutter ở S7 (xử lý 409) |
| S3 | Bỏ phân tổ (`collector_assignments`), lịch thu gom (`collection_schedules`), vị trí khu vực (`areas.latitude/longitude`); người đi thu thu mọi hộ có khoản của công ty, ghi ai đã thu | UC-12, UC-14, UC-18, UC-23, UC-30, UC-33 | xong backend (migration V44; IT chưa chạy: Docker tắt); web ở S6 (bỏ màn phân tổ, lịch thu gom, bản đồ khu vực; `/my-work`, `/company-work` không còn theo tổ; thêm `company-work?collectorId=` và `GET /collection/collectors/{id}/payments` cho UC-33), Flutter ở S7 (bỏ lịch thu gom `GET /citizen/schedule`) |
| S4 | Quản trị viên tạo tài khoản người đi thu (công ty không còn tạo) | UC-04 | xong backend (IT chưa chạy: Docker tắt; CollectorAccountIT đã sửa); web ở S6 (bỏ nút tạo/sửa/khóa/đặt lại mật khẩu ở menu "Người đi thu" của công ty, chỉ còn xem; thêm màn quản trị tạo người đi thu có chọn công ty qua `/api/platform/users`; `POST/PUT/lock/unlock/password` của `/api/platform/collector-accounts` đã bỏ, chỉ còn GET) |
| S5 | Phải nộp xã tính trên đã thu; khóa kỳ theo điều kiện mới; công nợ hộ sang kỳ sau | UC-22, UC-23, UC-26, UC-31, UC-32, UC-35, UC-38, UC-39 | xong backend (đã chạy `mvnw verify`: 226 unit + 246 IT xanh) và web (màn đối soát, tiến độ, khóa kỳ, ghi thu công nợ). Công nợ hộ không tạo bảng: khoản Chưa thu của kỳ đã khóa, tiền ghi vào kỳ đang thu qua `payments.ledger_period_id`. Phí thu gom tính theo từng khoản đã thu (cả chuyển khoản). Còn hở: cờ 45% chưa chốt (để nguyên); điều chỉnh xóa nợ kỳ trước và hoàn tiền trong công thức phải nộp xã, ranh giới "đã đến hạn" (≥ ngày hạn), seed demo không còn công ty nợ, xem báo cáo |
| S6 | Web theo các lát trên | | xong |
| S7 | Flutter theo các lát trên (bỏ lịch thu gom) | | chưa |
| S8 | Trang Tiến độ thu và Đối soát theo thiết kế đã duyệt: bỏ cột Nợ kỳ trước (cảnh báo đầu trang), thêm phải nộp xã, tỷ lệ nộp trơn (không cờ đỏ 45%), thẻ và danh sách công nợ hộ, cột hộ còn nợ kỳ cũ theo tổ, đối soát tách tiền mặt/chuyển khoản | UC-32, UC-38, UC-39, UC-22 | xong backend (`GET /api/remittance/household-debts`, `LedgerRowDto.debtCollected`, `AreaProgressDto.debtHouseholds`) và web; cờ 45% ở dashboard lãnh đạo (UC-46) và `lowCollectionRate` backend để nguyên |
| S9 | Phiếu chi trả công ty: xã trả lại tiền khi phải nộp xã của công ty âm; sổ công ty–kỳ thêm `communePaid`, `communeOwed`; Tiến độ thu, Đối soát hiện đã trả/còn phải trả; tab "Phiếu chi trả công ty" ở Khoản thu của cán bộ xã, công ty xem ở mục Phiếu xã trả lại. S9b: hình thức trả và số chứng từ (V47); khóa kỳ chặn khi xã còn phải trả (`PERIOD_COMMUNE_OWES`); báo và xử lý sai sót phiếu chi dùng chung `receipt_issues` (`/api/remittance/payout-issues`, tab "Sai sót phiếu chi trả"); màn lãnh đạo "Phiếu chi trả" chỉ xem | UC-39, UC-55, UC-56, UC-57 | xong backend (V46, V47) và web |
| S10 | Làm lại trang Đối soát theo mockup (`docs/doi-soat/`): tách QR / tiền mặt thành vận chuyển, thu gom; xã đang giữ so với được hưởng; dải QR chưa xác định; tab Chưa khớp / Đã khớp; giữ nhiều phiếu thu / chi, Xem phiếu; khóa kỳ chặn khi còn QR chưa xác định | UC-38, UC-39 | xong backend (IT liên quan xanh) và web; ghi chú ở `docs/doi-soat-mockup-0710.md` |

## Còn sót (ghi 06/10, cập nhật theo từng lượt)

### Chưa làm
- **S7 Flutter:** bỏ màn lịch thu gom (`GET /api/citizen/schedule` đã xóa); xử lý 409 `COMMUNE_BANK_ACCOUNT_MISSING` khi lấy VietQR; bỏ đọc `configured`.
- **Màn công ty** (`CompanyOverviewPage`, `LedgerStats`) còn thẻ "Nợ kỳ trước"; chưa quyết có bỏ như hai trang xã không.
- **Màn sai sót phiếu chi cho lãnh đạo:** API cho phép, web chưa có; chưa quyết có thêm không.
- **Chưa ai bấm thử trên trình duyệt thật:** CSS căn giữa mọi bảng, Tiến độ thu, Đối soát, phiếu chi trả (S8, S9), mới kiểm bằng test.

### Chờ quyết nghiệp vụ
1. "Đã đến hạn nộp" hiện hiểu là hôm nay ≥ ngày hạn; đúng ngày hạn có tính không?
2. Xóa nợ một khoản chưa thu vẫn làm giảm phải nộp xã của kỳ đang thu; có bỏ khỏi "điều chỉnh" không?
3. Cờ 45%: UC-32 đã bỏ, dashboard lãnh đạo (UC-46), BR-REM-10/13 và backend `lowCollectionRate` còn dùng.
4. Seed demo: 10/11 công ty "xã trả lại", kỳ 09 không khóa được tới khi lập phiếu chi cho DV01 (175.788 đ); có thêm seed kịch bản công ty còn nợ không?
5. Xã chưa khai tài khoản nhận chuyển khoản: hiện 409 khi tạo VietQR, giao dịch SePay vào `WRONG_ACCOUNT`; đúng ý chưa?
6. Quản trị viên và lãnh đạo bị chặn xem giao dịch chờ đối chiếu (UC-27) theo `phan-quyen.md`; đúng chưa?
7. Chỗ đặt màn mới: UC-54 là tab trong Cấu hình của quản trị viên, UC-27 là menu riêng cán bộ xã; duyệt chưa?
8. Hoàn tiền luôn trừ vào cột tiền mặt, kể cả hoàn cho khoản chuyển khoản; có chia theo phương thức gốc không?
9. Thẻ Công nợ hộ tính trên mọi kỳ đã khóa, kể cả kỳ đang xem; có loại kỳ đang xem không?
10. Khoản chuyển khoản không có người thu nên không hiện trong tiến độ theo người đi thu (UC-33); hỏi chị BA.
11. Cột Điều chỉnh ở trang Đối soát: giữ hay bỏ (người dùng nói cả hai).

### Dọn dẹp / hạ tầng
- Chưa push. Các file docs đã xóa từ trước (`docs/cho-do-cu-*`, `docs/ra-soat/*`, `docs/thay-doi-2026-10-03.md`) vẫn nằm ngoài commit; quyết giữ hay xóa.
- Jmix build lỗi (gradle exit 2), container web trong Docker cần Jmix nên chưa dựng được; đang chạy web bằng Vite dev.
- Seed cũ (`V9_1`, `V17_1`, `V40_*`) còn dữ liệu phân tổ, lịch, vị trí (không lỗi, không sửa được vì checksum Flyway).
- `AreaReassignedEvent` còn được phát nhưng không còn ai nghe.
- Comment cũ `PeriodPublishServiceTest.java:54` nhắc "hạn hộ đóng mặc định"; `docs/demo-runbook.md` ~dòng 110 còn câu "demo hiện còn ô hạn hộ đóng".
- Khóa tài khoản chỉ có hiệu lực từ lần đăng nhập sau, token đang dùng còn sống tới 8 giờ.
