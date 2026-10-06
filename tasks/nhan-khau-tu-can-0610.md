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
7. "Tự cân" là **cân một lần lấy định mức kg/tháng** (như `BY_VOLUME` hiện nay, cân tháng đầu) hay **cân mỗi kỳ, nhập số kg thực tế**? Ai nhập số kg (BR-BIL-04)?
8. Đơn giá một người có tách **thu gom + vận chuyển** không? Phần công ty giữ lại (BR-REM-02, `LedgerQueries`) đang tính theo tỷ lệ thu gom / tổng của từng nhóm.
9. Hộ đổi số nhân khẩu giữa kỳ: số mới áp **từ kỳ sau** như BR-MD-09, hay áp ngay cho khoản chưa lập của kỳ đang chạy?
10. Mã đối tượng: hồ sơ cũ giữ mã `KD…` / `DN…`, hồ sơ mới dùng tiền tố gì cho nguồn thải nhỏ / lớn?

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
- `resources/db/migration/V48__...sql` (mới, V47 đã dùng cho phiếu chi trả): đổi `subject_type`, thêm cột biểu giá, phạm vi địa bàn, số nhân khẩu trên khoản. Seed nằm ở `resources/db/seed/` (chỉ chạy profile demo, trước V48): `V4_1`, `V7_1`, `V22_1`, `V26_1`, `V40_3`. V48 tự đổi dữ liệu seed nên chỉ sửa seed nếu muốn hiện loại mới ngay trong file.
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

## 5. Rà lại với code (06/10): chỗ danh sách trên còn thiếu

**Ràng buộc CSDL** (V48 phải bỏ và tạo lại): `V7` `ck_service_subjects_code_format` (cứng `KD`/`DN`), `ck_service_subjects_type`; `V23` `ck_service_subjects_household_members`; `V26` `ck_tariff_rates_group`, `ck_service_contracts_group` (liệt kê 6 nhóm). `tariff_rates` có CHECK `monthly_total = collection_fee + transport_fee` (đổi nếu thêm phí xử lý).

**Backend**
- `masterdata/domain/ServiceSubject.java`: Javadoc loại cũ; `memberCount` chỉ bắt buộc với `HOUSEHOLD`.
- `billing/service/ChargeRequestService.java:224-244`: nơi duy nhất gọi `calculate`; truyền hồ sơ (địa bàn, số nhân khẩu) vào đây. Bắt `QUOTA_KG_REQUIRED` cho nhóm cân mới.
- `billing/service/ChargeEligibility.java:34`: lý do bỏ qua thiếu định mức.
- `billing/domain/Charge.java:153-169` `revokeExemption`: chỉ xử lý `BY_VOLUME`; phải tính lại cho nhóm nhân khẩu và nhóm cân mới.
- `remittance/service/LedgerQueries.java:85-91`: SQL tách phần công ty giữ theo `collection_fee / monthly_total` của nhóm; nhóm nhân khẩu / phí xử lý làm đổi phép chia (câu 8).
- `masterdata/service/SubjectService.java:313-327` `requireGroupFits` chỉ chặn một chiều (hộ gia đình vẫn chọn được `SMALL_*`, `BY_VOLUME`); `updateContract` (207-224) và đổi loại (129) chưa áp "từ kỳ sau".
- `masterdata/service/SubjectMemberHistory.java`: đọc khóa `memberCount` trong nhật ký, giữ nguyên tên khóa.
- `collection/domain/SubjectReportType.java:8`: nhãn `WRONG_MEMBERS`.
- Test thêm: `ChargeEligibilityTest`, `ChargeRequestServiceIT`, `ChargeTest`, `CitizenApiIT`, `CollectionServiceTest`, `LeadershipIT`, `PeriodApiIT`, `StreetAddressIT`, `SubjectApiIT`, `TariffDraftIT`, `TariffIT`, `DemoSeedIT`, `CommunePayoutIT`, `CompanyReceiptIT`, `LedgerApiIT`, `PeriodLockIT`, `support/CollectionFixture`.

**Web**
- `CollectorListPage.tsx:37`: đoán loại từ nhóm giá (`!startsWith('HH_')` → "Hộ kinh doanh"); nhóm nhân khẩu / loại mới sẽ ra nhãn sai.
- `TariffFormModal.tsx:10-11` `unitOf()`: thêm đơn vị đ/người/tháng.
- `SubjectProfileForm.tsx`: chọn nhóm giá chưa lọc theo loại; `groupFitsMembers` (49-60), tự đổi nhóm theo số người (204-209), khóa nhóm khi sửa (88).
- `SubjectsPage/ImportSubjectsModal.tsx:124`, `masterdata/api.ts:169,273`, `billing/ChargeRequestPage/PreviewPanel.tsx:24`, `CollectorListPage/ReportSubjectForm.tsx:13`.
- `ProgressPage.tsx:48` cột "Số nhân khẩu" nên lấy số chụp trên khoản.
- Test: `ConfigPage.test.tsx`, `SubjectProfileForm.test.tsx`, `SubjectsPage.test.tsx`, `ChargesHubPage.test.tsx`, `remittancePages.test.tsx`, fixture `companyPages.test.tsx`, `collectorPages.test.tsx`.

**Tài liệu**
- `SPEC.md` §9.3, §9.4 (loại cũ, 6 nhóm, công thức tiền).
- `business-rules.md`: BR-MD-09, 10, 21; BR-BIL-02, 03, 04; BR-REM-02.
- `data-dictionary.md`: 273-292 loại, 285-287, 310, 320-327 nhóm, 360-365 biểu giá, 446 khoản (thêm số nhân khẩu), 1424 (trái câu 2).
- `use-cases.md`: thuật ngữ dòng 23, UC-05, 07, 11, 12, 21.
- `kich-ban-kiem-thu.md` 2.1, 2.2, 9.1, 9.4; `demo-runbook.md:72,99` (tổng 1.319.000 đổi nếu đổi seed); `phan-quyen.md:7`; `tasks/todo.md:796-797`.
