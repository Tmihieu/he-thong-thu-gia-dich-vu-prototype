# Thu theo nhân khẩu, nguồn thải tự cân (họp công ty 05/10)

Trạng thái: **đã code (06/10)** backend (V48) + web + Flutter + tài liệu; câu 8 tạm chốt xã giữ hết; còn luồng phí xử lý (code tạm, xem mục 6). Trả lời BR-MD-16 (thu theo hộ hay theo nhân khẩu).

## 0. Tình hình (06/10, tối)

Đã làm (nhánh `feat/nhan-khau-tu-can`):
- Backend: loại `SMALL_SOURCE` / `LARGE_SOURCE` (mã mới `NN` / `NL`); nhóm `HH_PER_CAPITA`, `FULL_COST_BY_KG`; `processing_fee` trong biểu giá; biểu giá bật nhân khẩu toàn xã hoặc theo địa bàn; khoản chụp `member_count`; đổi nhóm giá của đăng ký đang chạy áp từ kỳ sau; chặn đổi loại khi đăng ký không hợp loại mới. V48 chuyển dữ liệu cũ và thêm `FULL_COST_BY_KG` (421 đ/kg xử lý) vào biểu giá có sẵn.
- Web: form biểu giá (cột Xử lý, ô theo nhân khẩu + Toàn xã / chọn địa bàn), form hồ sơ lọc nhóm theo loại, định mức kg cho cả hai nhóm cân, khoản thu hiện "· N người"; `schema.d.ts` sinh lại.
- Flutter: nhãn loại / nhóm mới.
- Tài liệu: SPEC §9.3–9.4, business-rules, data-dictionary, use-cases, kịch bản kiểm thử, runbook.
- Kiểm: `mvn verify` (255 test unit + IT) đạt, web `tsc` + `lint` + 163 test đạt, Flutter `analyze` + `test` đạt.

Còn hở:
- Câu 8 chưa có trả lời chính thức; tạm chốt 06/10: tiền theo nhân khẩu xã giữ hết (thu gom của `HH_PER_CAPITA` bắt buộc 0, máy chủ chặn `TARIFF_PER_CAPITA_COLLECTION`).
- Phí xử lý thuộc ai: chưa trả lời (code tạm: nộp xã cùng vận chuyển, LedgerQueries chia theo thu gom / tổng đơn giá).
- Chưa có BR cho lỗi `MEMBER_COUNT_REQUIRED` khi lập khoản theo nhân khẩu; `SPEC.md` §11 O2 lệch BR-REM-02 (có từ trước); `docs/phan-quyen.md:7`, `tasks/todo.md:796-797` chưa sửa.
- Đã có test web cho ô theo nhân khẩu và chạy thử giao diện thật (06/10).

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

## 3. Đã trả lời (06/10)

1. Đúng: từ 9.000 kg/tháng (300 kg/ngày) là nguồn thải lớn, dưới là nhỏ. `BY_VOLUME` là nguồn thải nhỏ, sửa nhãn.
2. Đúng bảng mục 2. Nguồn thải nhỏ đăng ký theo QĐ được hỗ trợ tiền xử lý (bậc 126/250/500, 633 đ/kg). Nguồn thải lớn và nguồn thải nhỏ đăng ký cân (= "như chủ nguồn thải lớn") **không** được hỗ trợ: 1.054 đ/kg gồm 421 phí xử lý. → Thêm phí xử lý vào biểu giá, sửa BR-MD-12.
3. Đúng: chủ nhà trọ lập hồ sơ nguồn thải nhỏ / lớn.
4. Đúng: hộ kinh doanh, doanh nghiệp dưới 9.000 kg → nhỏ; từ 9.000 kg → lớn.
5. Đúng: công tắc nhân khẩu + phạm vi (toàn xã / địa bàn) đặt trong biểu giá.
6. Có: khi biểu giá không bật cho địa bàn của hộ, cán bộ xã vẫn chọn được nhóm "theo nhân khẩu" cho từng hộ trong đăng ký thu phí.
7. Cán bộ xã nhập số kg **một lần** làm định mức kg/tháng, giống `BY_VOLUME` hiện nay.
8. **Chưa biết**: đơn giá một người có tách thu gom + vận chuyển không. Tạm để dòng biểu giá nhóm nhân khẩu có đủ ô thu gom / vận chuyển như nhóm khác, quản trị viên tự nhập.
9. Số nhân khẩu đổi thì **áp ngay** cho khoản chưa lập (lấy số hiện tại lúc lập khoản). Nhóm ≤2 / ≥3 theo QĐ giữ luật cũ (từ kỳ sau).
10. Mình chọn: hồ sơ cũ giữ mã `KD…` / `DN…`; hồ sơ mới nguồn thải nhỏ `NN` + 5 số, nguồn thải lớn `NL` + 5 số.

### Thiết kế dự kiến
- Nhóm giá mới: `HH_PER_CAPITA` (đ/người/tháng, hộ gia đình), `FULL_COST_BY_KG` (đ/kg có phí xử lý; nguồn thải nhỏ đăng ký cân và nguồn thải lớn). Nguồn thải lớn chỉ được chọn `FULL_COST_BY_KG`; nhỏ chọn `SMALL_*`, `BY_VOLUME` hoặc `FULL_COST_BY_KG`; hộ gia đình chọn `HH_*`.
- `TariffRate` thêm `processing_fee`; `monthly_total` = thu gom + vận chuyển + xử lý.
- `TariffVersion` thêm cờ nhân khẩu + phạm vi (toàn xã / danh sách địa bàn). Lúc lập khoản: hộ gia đình mà biểu giá của kỳ bật cho địa bàn của hộ thì tính `HH_PER_CAPITA` bất kể nhóm trên đăng ký; nhóm `HH_PER_CAPITA` trên đăng ký thì luôn theo nhân khẩu. Khoản chụp nhóm thực tính và số nhân khẩu.

### Chưa biết (ghi lại, code tạm)
- Câu 8: đơn giá một người có tách thu gom + vận chuyển không.
- Phí xử lý thu được thuộc về ai. Code tạm: công ty chỉ giữ phần thu gom (BR-REM-02), phí xử lý đi cùng vận chuyển nộp về xã.

### Chốt thêm
- Hộ tính theo nhóm ≤2 / ≥3 người đổi số người: nhóm mới vẫn áp từ kỳ sau (BR-MD-09 giữ nguyên). Chỉ hộ theo nhân khẩu lấy số mới ngay khi khoản chưa lập.

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

## 6. Use case và việc chưa làm (06/10)

**UC mới: không có.** Công tắc nhân khẩu nằm trong biểu giá (câu 5) nên gộp vào UC-19; cân một lần làm định mức (câu 7) nên nằm trong UC-09.

**UC phải sửa trong `docs/use-cases.md`**

| UC | Sửa gì |
|---|---|
| UC-05 Nhập hộ từ Excel | Cột loại nguồn thải nhỏ / lớn, nhóm giá mới, mã `NN` / `NL` |
| UC-06 Tạo hồ sơ | Loại mới; nguồn thải nhỏ chọn theo QĐ / cân; hộ gia đình chọn được theo nhân khẩu; chủ nhà trọ là nguồn thải |
| UC-07 Tra cứu hồ sơ | Lọc theo loại mới |
| UC-08 Cập nhật hồ sơ | Số nhân khẩu là căn cứ tính tiền khi theo nhân khẩu, áp ngay cho khoản chưa lập (câu 9) |
| UC-09 Đăng ký thu phí | Nhóm `HH_PER_CAPITA`, `FULL_COST_BY_KG`; nhóm được chọn theo loại; đổi cách tính từ kỳ sau |
| UC-11 Báo sai thông tin | Nhãn "sai số thành viên" giờ ảnh hưởng thẳng số tiền |
| UC-12 Người dân xem hộ | Nhãn loại / nhóm mới |
| UC-19 Biểu giá | Đơn giá một người, phí xử lý, ô theo nhân khẩu + toàn xã / chọn địa bàn |
| UC-21 Phát hành khoản | Tính theo nhân khẩu theo cờ biểu giá và địa bàn; chụp nhóm thực tính + số nhân khẩu; thiếu định mức kg cho nhóm cân mới |
| UC-22 Tra cứu khoản | Hiện cách tính (nhân khẩu × đơn giá, kg × đơn giá) |
| UC-31 Người dân xem khoản | Hiện cách tính như UC-22 (không bắt buộc) |

Thuật ngữ: "Hộ/cơ sở" → hộ gia đình / nguồn thải nhỏ / nguồn thải lớn; thêm "Tính theo nhân khẩu", "Đăng ký cân", "Phí xử lý". `phan-quyen.md` không thêm quyền mới.

**Việc chưa làm**
- [x] Câu 8: tạm chốt xã giữ hết (06/10), chờ xác nhận chính thức.
- [ ] Hỏi: phí xử lý thu được thuộc về ai (đang code tạm: nộp xã như vận chuyển).
- [x] Sửa tài liệu theo mục 4, 5, 6: `SPEC.md`, `business-rules.md`, `data-dictionary.md` (thay ghi chú tạm ở `BY_VOLUME`), `use-cases.md`, `kich-ban-kiem-thu.md`, `demo-runbook.md`.
- [x] Code: backend (V48) → web → Flutter, mỗi lát một commit.
