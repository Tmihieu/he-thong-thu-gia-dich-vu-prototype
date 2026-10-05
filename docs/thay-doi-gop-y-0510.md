# Thay đổi use case theo góp ý ngày 05/10/2026

Nhánh `fix/gop-y-ba-0510`. Đợt này chỉ sửa [use-cases.md](use-cases.md). Code demo và các tài liệu khác chưa sửa theo, xem hai mục cuối.

## Đã chốt

| Điểm | Quyết định |
|---|---|
| Tài khoản nhận chuyển khoản | Mọi khoản chuyển khoản/VietQR vào **một tài khoản chung của xã**, quản trị viên khai báo. Công ty không còn tài khoản nhận |
| Phải nộp xã | Tiền mặt công ty đã thu − điều chỉnh kỳ trước − phí thu gom của **toàn bộ số đã thu** (cả chuyển khoản). Âm thì xã trả lại công ty phần chênh |
| Hạn | Kỳ chỉ còn **một hạn nộp**: hạn công ty nộp về xã; hộ đóng trong hạn này. Bỏ hạn hộ đóng riêng |
| Khóa kỳ | Mọi công ty đã nộp đủ phải nộp xã (tính trên đã thu), **và** kỳ đã thu đủ mọi khoản **hoặc** đã đến hạn nộp |
| Hộ chưa đóng khi khóa | Thành **công nợ của hộ**, hộ nộp được ở kỳ sau; tiền tính vào kỳ đang thu |
| Người đi thu | Bỏ phân tổ. Người đi thu thu được mọi hộ có khoản của công ty; hệ thống ghi ai đã thu khoản nào |
| Đánh số UC | Giữ mã cũ, UC bị bỏ để trống số; UC mới lấy số tiếp theo |

## Thay đổi theo UC

| UC | Trước | Sau |
|---|---|---|
| UC-04 | Công ty tạo tài khoản người đi thu của mình | **Quản trị viên** tạo cho từng công ty |
| UC-05 | Chọn tệp .xlsx để nhập | Tải tệp mẫu, điền theo mẫu rồi tải lên |
| UC-12 | Xem thông tin hộ và lịch thu gom | Chỉ xem thông tin hộ (bỏ lịch thu gom) |
| UC-13 | Quản trị viên sửa danh mục, hệ thống dùng để nhóm, phân công | Quản trị viên vẫn sửa; ghi rõ **cán bộ xã** dùng danh mục để nhóm hộ và phân công công ty |
| UC-14 | Đặt vị trí khu vực trên bản đồ | **Bỏ**, không còn bản đồ khu vực |
| UC-15 | Hồ sơ công ty có tài khoản ngân hàng nhận chuyển khoản | Bỏ tài khoản ngân hàng khỏi hồ sơ công ty |
| UC-18 | Công ty phân tổ cho người đi thu | **Bỏ** |
| UC-20 | Kèm hạn nộp | Ghi rõ đó là hạn duy nhất của kỳ |
| UC-23 | Khoản trong tổ được giao | Khoản của hộ thuộc công ty; ghi lại người đã thu |
| UC-24, UC-25, UC-26 | VietQR và đối chiếu theo tài khoản công ty | Theo **tài khoản của xã** |
| UC-27 | Công ty xem giao dịch chờ đối chiếu | **Cán bộ xã** xem |
| UC-30 | Hộ trong tổ được giao | Hộ thuộc công ty |
| UC-32 | (bản sửa tay làm mất ý "Theo tổ") | Bỏ cờ dưới 45%, khôi phục "Theo tổ: đã thu so với phải thu" |
| UC-33 | Tiến độ từng người đi thu và hộ được giao | Lịch sử thu và danh sách hộ **từng người đi thu đã thu** |
| UC-38 | Phần thu gom công ty giữ lại | Đã thu gồm tiền mặt và chuyển khoản; phần phí thu gom công ty được hưởng |
| UC-39 | Khóa khi mọi công ty nộp đủ tiền của kỳ | Theo điều kiện khóa kỳ và công nợ hộ ở mục Đã chốt |
| UC-44 | Trước hạn 3 ngày, sau hạn 1 ngày | Giữ 3 mốc, tính theo hạn nộp duy nhất |
| UC-54 (mới) | — | Quản trị viên khai báo tài khoản nhận chuyển khoản của xã |

Phần thuật ngữ và luồng chính của use-cases.md sửa theo cho khớp: vai trò quản trị viên, công ty, người đi thu, khu vực; công thức phải nộp xã; thêm "Hạn nộp", "Công nợ của hộ".

## Bản demo chưa theo kịp

- Tài khoản người đi thu vẫn do công ty tạo (menu "Người đi thu" của công ty).
- Còn màn phân tổ (`collector_assignments`); người đi thu chỉ thấy và thu hộ trong tổ được giao.
- Còn bản đồ khu vực và thao tác kéo thả vị trí (`PUT /areas/{id}/location`).
- VietQR và đối chiếu SePay dùng tài khoản ngân hàng của công ty (`companies.bank_account`); chưa có chỗ khai báo tài khoản của xã.
- Giao dịch chờ đối chiếu đang hiện cho công ty.
- Phải nộp xã tính trên phải thu (`payable = due − adjustment − retained`), chưa tính trên đã thu.
- Khóa kỳ chưa xét hạn nộp; kỳ đã khóa thì chặn thu luôn, chưa có công nợ hộ chuyển sang kỳ sau.
- Còn hai hạn: hạn hộ đóng (phiếu YCT, khoản) và hạn công ty nộp xã (kỳ); nhắc hộ đang tính theo hạn hộ đóng.
- Tiến độ theo người đi thu ở màn công ty tính theo phân tổ, chưa theo người đã thu.
- App người dân còn màn lịch thu gom (`collection_schedules`).

## Tài liệu khác cần sửa sau

| Tệp | Chỗ cần sửa |
|---|---|
| `phan-quyen.md` | Dòng lịch thu gom (UC-12), vị trí khu vực trên bản đồ (UC-14), phân tổ (UC-18); UC-04 bỏ quyền công ty; UC-27 chuyển sang cán bộ xã; thêm UC-54; chú thích ² (tổ được giao) |
| `business-rules.md` | BR-PLT-05, BR-MD-02, BR-COL-01, BR-COL-02 (phân tổ); BR-COL-13; BR-REM-03 (công thức phải nộp); BR-REM-08 (khóa kỳ); BR-CIT-02 (lịch thu gom) |
| `main-business-flows.md` | A4 (hạn hộ đóng); BF-02 điều kiện kết thúc, B14 và lưu ý nghiệp vụ (khóa kỳ, còn phải nộp) |
| `data-dictionary.md` | `CollectorAssignment`, `CollectionSchedule`, `areas.latitude/longitude`, `companies.bank_account`, hạn hộ đóng của phiếu YCT/khoản, G14, G15, G16, O4, T51, C2, C4, C7, X12 |
| `kich-ban-kiem-thu.md` | 2.6, 3.1 (bản đồ), 3.4–3.5 (hạn hộ đóng), 4a (phân tổ), 4.14 (công ty xem chờ đối chiếu), 4.24 (công thức), 4f (khóa kỳ) |
| `demo-runbook.md` | Lịch thu gom (V17_1), tài khoản ngân hàng tạm của công ty, chờ đối chiếu ở màn công ty, bước 2 (hạn hộ đóng), bước 3 (phân tổ), bước 8 (khóa kỳ) |
| `demo-accounts.md` | Dòng 36 nhắc tài khoản ngân hàng (của công ty) |
| `intent/demo-springboot.md` | Công ty phân tổ cho người đi thu; công ty nộp toàn bộ về xã |
| `ra-soat/backend.md`, `ra-soat/web-cty.md` | Mục phân tổ, phạm vi người đi thu, phải nộp xã (ghi chú lịch sử, sửa nếu còn dùng) |
