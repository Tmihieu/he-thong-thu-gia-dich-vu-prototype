# Thu theo nhân khẩu, nguồn thải tự cân (họp công ty 05/10)

Trạng thái: **chưa code**, đang chờ xác nhận các câu ở mục 3. Trả lời BR-MD-16 (thu theo hộ hay theo nhân khẩu).

## 1. Đã chốt (06/10)

**Hộ gia đình**: 2 cách tính.
- Theo QĐ: nhóm ≤2 / ≥3 người (như hiện tại).
- Theo nhân khẩu: đơn giá một người × số nhân khẩu × số tháng. Quản trị viên cài đơn giá một người.
- Quản trị viên bật "theo nhân khẩu" bằng ô chọn: **toàn đơn vị (cả xã)** hoặc **chọn một hay nhiều địa bàn** (DTH / TTT / NB).
- Trong phạm vi đã bật, **mọi hộ gia đình** tính theo nhân khẩu, không để riêng hộ nào theo QĐ.
- Số nhân khẩu chụp lại trên khoản thu lúc lập khoản.

**Chủ nguồn thải**
- Loại đối tượng trong hồ sơ đổi thành **Nguồn thải nhỏ / Nguồn thải lớn** (thay hộ kinh doanh / doanh nghiệp).
- Nguồn thải nhỏ: theo QĐ (bậc 126 / 250 / 500 kg) **hoặc tự cân**; cán bộ xã chọn trong hồ sơ.
- Nguồn thải lớn: chỉ cân.

**Chung**: đổi cách tính áp dụng **từ kỳ sau**; tạm bỏ VAT; Đông Thạnh là **Nhóm 2** của QĐ.

## 2. Căn cứ trong QĐ

- Điều 3: nguồn thải nhỏ / lớn theo khoản 1 / 2 Điều 58 NĐ 08/2022/NĐ-CP. Chủ nhà trọ (kể cả hộ gia đình cho thuê phòng) cũng xếp nhỏ / lớn theo khối lượng.
- Bảng mục 3 (nguồn thải lớn và nguồn thải nhỏ chọn hình thức như nguồn thải lớn), nhóm 2: thu gom 453 + vận chuyển 180 + xử lý 421 = **1.054 đ/kg**.
- Bảng b (phân loại tại nguồn đúng quy định), nhóm 2: 453 + 180 = **633 đ/kg**; ghi chú: chưa thu phí xử lý với cá nhân, hộ gia đình, nguồn thải nhỏ chọn hình thức như hộ gia đình.

Cách hiểu (chờ xác nhận):

| Đối tượng | Cách tính | Đơn giá nhóm 2 |
|---|---|---|
| Nguồn thải nhỏ chọn như hộ gia đình, ≤500 kg/tháng | Bậc đ/tháng (126 / 250 / 500) | như hiện tại |
| Nguồn thải nhỏ chọn như hộ gia đình, 500 đến dưới 9.000 kg/tháng | đ/kg, bảng b | 633 đ/kg |
| Nguồn thải nhỏ chọn như nguồn thải lớn (= "tự cân") | đ/kg, bảng mục 3 | 1.054 đ/kg |
| Nguồn thải lớn (từ 9.000 kg/tháng) | đ/kg, bảng mục 3 | 1.054 đ/kg |

## 3. Còn hỏi

1. Ngưỡng Điều 58 NĐ 08 có đúng **300 kg/ngày (≈ 9.000 kg/tháng)** không? (nhớ từ văn bản, chưa đối chiếu). Nếu đúng thì nhóm `BY_VOLUME` 500 đến dưới 9.000 kg là **nguồn thải nhỏ**, nhãn "chủ nguồn thải lớn" trong data-dictionary là sai.
2. Bảng đơn giá ở mục 2 có đúng không? Nếu đúng thì phải thêm **phí xử lý** vào biểu giá, trái với BR-MD-12 (chốt 03/10: không có phí xử lý).
3. Chủ nhà trọ lập hồ sơ loại nguồn thải nhỏ / lớn (không phải hộ gia đình)?
4. Hồ sơ cũ chuyển loại: hộ kinh doanh, doanh nghiệp dưới 9.000 kg → nguồn thải nhỏ; từ 9.000 kg → nguồn thải lớn?
5. Công tắc nhân khẩu đặt trong **biểu giá** (áp từ kỳ dùng biểu giá đó, khớp "từ kỳ sau")?
6. Khi không bật nhân khẩu, cán bộ xã còn được chọn theo nhân khẩu cho từng hộ trong đăng ký thu phí không?
7. "Tự cân" là **cân thực tế mỗi kỳ** hay **cân một lần lấy định mức kg/tháng** (như hiện nay, góp ý BA 03/10)? Nếu cân mỗi kỳ: ai nhập kg (người đi thu / công ty), ai duyệt, lập khoản có phải chờ số cân không.

## 3b. Use case

UC có thể thêm mới (tùy câu 5 và 7):
- **UC-56 Cài đặt thu theo nhân khẩu** (quản trị viên: bật toàn xã / chọn địa bàn, đơn giá một người): chỉ thêm nếu công tắc nằm ngoài biểu giá; đặt trong biểu giá thì gộp vào UC-19.
- **UC-57 Ghi nhận khối lượng cân theo kỳ**: chỉ thêm nếu tự cân là cân mỗi kỳ; cân một lần thì nằm trong UC-09.

UC đang có phải sửa trong `docs/use-cases.md`:

| UC | Sửa gì |
|---|---|
| UC-05 Nhập hộ từ Excel | Cột loại nguồn thải nhỏ / lớn; nguồn thải nhỏ có cột theo QĐ hay tự cân |
| UC-06 Tạo hồ sơ | Loại mới; nguồn thải nhỏ chọn theo QĐ / tự cân; chủ nhà trọ xếp theo khối lượng |
| UC-07 Tra cứu hồ sơ | Lọc theo loại mới |
| UC-08 Cập nhật hồ sơ | Số nhân khẩu là căn cứ tính tiền khi tính theo nhân khẩu; đổi áp từ kỳ sau |
| UC-09 Đăng ký thu phí | Nhóm cân theo bảng mục 3; đổi cách tính áp từ kỳ sau |
| UC-19 Biểu giá | Đơn giá một người, ô theo nhân khẩu + phạm vi toàn xã / địa bàn, phí xử lý (nếu chốt) |
| UC-21 Phát hành khoản | Tính theo nhân khẩu với hộ trong phạm vi bật; lưu số nhân khẩu trên khoản |
| UC-22 Tra cứu khoản | Hiện cách tính (nhân khẩu × đơn giá, kg × đơn giá) |
| UC-31 Người dân xem khoản | Hiện cách tính như UC-22 (không bắt buộc) |

Phần thuật ngữ đầu `docs/use-cases.md`: "Hộ/cơ sở" đổi thành hộ gia đình / nguồn thải nhỏ / nguồn thải lớn; thêm "Tính theo nhân khẩu", "Tự cân". Nếu thêm UC-56 / UC-57 thì sửa cả `docs/phan-quyen.md`.

## 3c. Việc chưa làm

- [ ] Người dùng trả lời 7 câu ở mục 3.
- [ ] Sửa `docs/use-cases.md`, `docs/phan-quyen.md`, `docs/kich-ban-kiem-thu.md` theo mục 3b.
- [ ] Sửa data-dictionary chính thức (nhóm giá, loại đối tượng, biểu giá) thay cho ghi chú tạm ở dòng `BY_VOLUME`.
- [ ] Code theo mục 4: backend → web → Flutter, mỗi lát một commit.

## 4. File cần sửa

**Backend** (`backend/src/main/java/vn/dongthanh/vsmt/`)
- `masterdata/domain/SubjectType.java`: hộ gia đình / nguồn thải nhỏ / nguồn thải lớn.
- `masterdata/domain/TariffGroup.java`: thêm nhóm hộ gia đình theo nhân khẩu, nhóm cân theo bảng mục 3; sửa chú thích `BY_VOLUME`.
- `masterdata/domain/TariffRate.java`: phí xử lý (nếu chốt câu 2).
- `masterdata/domain/TariffVersion.java`, `masterdata/service/TariffService.java`, `masterdata/api/TariffController.java`: đơn giá một người, cờ nhân khẩu, phạm vi toàn xã / danh sách địa bàn.
- `masterdata/domain/ServiceContract.java`: định mức kg cho nhóm cân mới.
- `masterdata/service/SubjectService.java`: BR-MD-06 (nhóm giá ↔ số người, loại ↔ nhóm giá), BR-MD-09 (đổi từ kỳ sau).
- `masterdata/service/SubjectImportService.java`: cột loại đối tượng mới.
- `masterdata/api/SubjectDtos.java`, `masterdata/api/SubjectController.java`, `masterdata/domain/ServiceSubjectRepository.java`: lọc / trả loại mới.
- `billing/service/ChargeCalculator.java`: tính theo nhân khẩu (theo địa bàn của hộ và cờ của biểu giá), nhóm cân mới.
- `billing/domain/Charge.java`, `billing/domain/ChargeAmount.java`: chụp số nhân khẩu.
- `billing/api/BillingController.java`, `citizen/api/CitizenDtos.java`: trả số nhân khẩu, nhãn nhóm.
- `resources/db/migration/V47__...sql` (mới): đổi `subject_type`, thêm cột biểu giá, phạm vi địa bàn, số nhân khẩu trên khoản. Seed `V7_1`, `V26_1`, `V40_3` theo loại / nhóm mới.
- Test: `ChargeCalculator`, `SubjectService`, `SubjectImportService`, `TariffService` và các IT liên quan.

**Web** (`web/src/`)
- `shared/labels.ts`: nhãn loại và nhóm giá.
- `features/masterdata/TariffsPage/TariffFormModal.tsx`, `TariffsPage.tsx`: đơn giá một người, ô "theo nhân khẩu" + toàn xã / chọn nhiều địa bàn, phí xử lý.
- `features/masterdata/SubjectsPage/SubjectProfileForm.tsx`, `SubjectsPage.tsx`: loại nguồn thải nhỏ / lớn, chọn theo QĐ / tự cân.
- `features/billing/ChargesPage/ChargesPage.tsx`: hiện số nhân khẩu trên khoản.
- `features/collection/CollectorListPage/CollectorListPage.tsx`, `features/remittance/ProgressPage/ProgressPage.tsx`, `features/platform/AuditLogPage/auditFormat.ts`: nhãn nhóm mới.
- `api/schema.d.ts`: sinh lại bằng `npm run gen:api`.
- Test đi kèm các màn trên.

**Flutter** (`mobile-flutter/lib/`): `shared/labels.dart`, `api/models.dart`, `features/account/household_screen.dart`.

**Tài liệu**: `docs/business-rules.md` (BR-MD-06, 12, 16, 22, 23), `docs/data-dictionary.md` (nhóm giá, loại đối tượng, biểu giá), `docs/use-cases.md` (UC-06, UC-08, UC-09, UC-19), `docs/kich-ban-kiem-thu.md`.
