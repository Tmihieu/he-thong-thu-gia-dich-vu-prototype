# Backend — rà soát 04/10/2026

Trạng thái: **chưa xong**. Lane Backend không chạy Maven (quyền chạy `mvnw.cmd test` chưa được duyệt ở cửa sổ này; leader gộp và chạy `verify`). Mọi commit dưới đây ghi "chưa chạy test"; kết quả test thật do leader gửi lại. Các mục "agent rà" là kết quả ĐỌC source, chưa tái hiện bằng test.

## Đã rà (đánh dấu từng module)
- [x] masterdata, billing — đọc source đối chiếu BR-MD/BR-BIL (chưa sửa mục nào ngoài bên dưới)
- [x] collection, leadership, remittance — đọc source đối chiếu BR-COL/BR-LD/BR-REM
- [x] platform, citizen, notification, complaint — đọc source đối chiếu BR-PLT/BR-CIT/BR-NTF/BR-CMP
- Phân quyền theo vai trò, phạm vi công ty, duyệt 2 lần, khóa kỳ, thu quá số còn thiếu, bàn giao tiền mặt: đúng.

## Sạn đã sửa (chưa chạy test)
| # | Màn / file | Sạn | Rule | Commit | Test cần chạy |
|---|---|---|---|---|---|
| 1 | `complaint` | Thêm loại khiếu nại `FACILITY`, `COLLECTION_REQUEST` + migration V32 | BR-CMP-05 | 60d6cd9 | ComplaintFlowIT |
| 2 | `CompanyLedgerService` | Cờ nộp < 45% tính theo `payable`; `payable` ≤ 0 không cờ | BR-REM-13 (QĐ-L2) | d5114d0, 16b16b9 | CompanyLedgerServiceTest |
| 3 | `LocationApiIT` | Test đỏ: username `location_ADMIN` có chữ hoa, vi phạm `ck_users_username_format` | — | 2af11f5 | LocationApiIT |
| 4 | `HouseholdReminderService` | Thông báo nhắc nộp không có link → gắn `{screen:"citizen.charges"}` | BR-NTF-02 | 7342e4c | HouseholdReminderIT |
| 5 | `LedgerController` | Mô tả `@Schema` cũ của remaining/retained/remittedRate | — | 93d8331 | — |
| 6 | `LedgerQueries` | Số khoản "cần thu" loại khoản Miễn giảm và Đã xóa nợ | — | 7ed8269 | LedgerApiIT (ca mới giả định DV01 chỉ 1 tổ — có thể phải chỉnh) |

### Đợt 2 — theo quyết định leader (QĐ-L7…L16), tất cả chưa chạy test
| # | File | Sạn / việc | Rule | Commit | Test cần chạy |
|---|---|---|---|---|---|
| 7 | `CompanyLedgerService` | Nợ kỳ trước chỉ gồm kỳ cũ hơn kỳ đang xem (A4) | BR-REM-03 | 43b6665 | CompanyLedgerServiceTest |
| 8 | `HouseholdReminderService` | Nhắc nộp chỉ gửi khi insert `household_reminders` thành công (A6) | BR-NTF-03 | 561bf31 | HouseholdReminderIT |
| 9 | `CompanyReceiptService` | `remainingAfter` = phải nộp xã − lũy kế (A3) | BR-REM-03/04 | 5e1fe2f | CompanyReceiptIT |
| 10 | `NotificationService.publish` | Cắt body > 2000 ký tự thay vì ném lỗi, đóng/phản hồi khiếu nại không rollback (A5) | BR-CMP-04 | a223bde | NotificationServiceIT |
| 11 | `UserAdminController` | Mật khẩu > 72 ký tự → 422 `PASSWORD_TOO_LONG` (A8) | BR-PLT-03 | a13069c | UserAdminIT |
| 12 | 7 message lỗi | "hợp đồng" → "đăng ký thu phí" | BR-GEN-08 | b2adbe7 | — |
| 13 | `ChargeDto` | Thêm `refunded` (chỉ ở GET /api/billing/charges) | — | 14ffa8b | LeadershipIT |
| 14 | `ChargeCalculator`/`ChargeRequestService` | Hộ theo ký thiếu định mức → bỏ qua kèm cảnh báo `QUOTA_KG_REQUIRED`; miễn 100% không cần định mức; đơn giá 0 → 422 ngay; `IssueResultDto.skippedByReason` | QĐ-L14, BR-BIL-09 | f58cc86 | ChargeCalculatorTest, ChargeRequestServiceIT |
| 15 | `Charge` + V33 | Chụp `quota_kg`; bỏ miễn giảm khoản nhóm theo ký tính đ/kg × định mức × tháng (A1) | BR-BIL-03, BR-LD-04 | 45c4817 | ChargeTest, ChargeCalculatorTest, LeadershipIT |
| 16 | 4 repository | `lockCodePrefix` khi sinh mã thanh toán / bàn giao / nhắc nộp / khiếu nại (A7) | BR-GEN-06 | 15facc5 | không có test song song |
| 17 | `CollectionService` | `lockRequest(clientRequestId)`: gửi trùng đồng thời trả bản cũ (A9) | BR-COL-05 | 3a90aab | không có test song song |
| 18 | `SubjectService` | Người đi thu chỉ đọc hộ trong tổ được giao (A2); không đổi `/area-assignments` | BR-GEN-04 | 1c57787 | CollectorSubjectScopeIT, SubjectServiceTest |
| 19 | `LedgerQueries`/`CompanyLedgerService` | `gap` = đã nộp + điều chỉnh − (đã thu − phần thu gom của số đã thu) | QĐ-L15 | 8007dbb | CompanyLedgerServiceTest, LedgerApiIT |
| 20 | seed `V34_1` | Hạ phiếu thu mẫu DV01 kỳ 09/2026 về 200.000 đ; DemoSeedIT tính nợ kỳ trước theo payable | QĐ-L16, BR-REM-03 | 9dfbdbc, c01c16b | DemoSeedIT |
| 21 | `CompanyLedgerService` | Công ty phải thu 0 không gắn cờ thu thấp | BR-REM-10 | eb46968 | CompanyLedgerServiceTest |
| 22 | `ApprovalService` | Audit duyệt hoàn / xóa nợ có trạng thái + số đã thu ròng của khoản trước/sau | BR-GEN-03 | 0819593 | LeadershipIT |
| 23 | `HouseholdReminderService.runBy` | Chạy nhắc tay có audit `RUN_HOUSEHOLD_REMINDERS` | BR-GEN-03 | 61c6082 | HouseholdReminderIT |
| 24 | complaint + bulky (citizen) | Lọc theo HỘ, không theo tài khoản; khiếu nại nhập hộ qua điện thoại vẫn không hiện ở app | QĐ-L10, BR-CIT-02 | 612fd31 | CitizenComplaintIT |
| 25 | `TariffService.updateDraft` | Bản đã ban hành không sửa được đơn giá/ngày: 422 `TARIFF_NOT_DRAFT` (bỏ `TARIFF_VALIDITY_LOCKED` và action `UPDATE_TARIFF_VERSION`) | BR-MD-11, QĐ-L7 | 97bc2f1 | TariffDraftIT (đã đổi kỳ vọng) |

Ghi chú: audit entity của `CREATE_STREET` là `Street` (id = id đường), `StreetService:83`. Đề nghị hoàn "chờ" không cần trừ: đã chặn một đề nghị chờ / khoản / loại (`APPROVAL_PENDING_EXISTS`), nên không thể có nhiều đề nghị chờ cộng quá số đã thu.

## Việc giao nhưng chưa làm (bị chặn quyền)
- **QĐ-L1 / BR-MD-03**: `CompanyService.create` đang chỉ `ADMIN`, `update` cho `COMMUNE_OFFICER` + `ADMIN`; cần cả hai vai trò create + update, sửa `CompanyApiIT` (thêm ca ADMIN tạo được). `CompanyApiIT` đang đỏ vì test dùng `officer` tạo công ty và `admin` PUT → 403.
- **CORS** chỉ profile demo/dev, origin `http://localhost:*` và `http://127.0.0.1:*`, OPTIONS không cần token, kèm test preflight.
- `CompanyApiIT` đỏ 2 ca cho tới khi làm QĐ-L1 (ADMIN và COMMUNE_OFFICER đều create + update; sửa test thêm ca ADMIN tạo được, vai trò khác 403).

## Sạn chưa sửa (agent rà, kèm lý do)
Chắc (nên sửa kèm test khi có Maven):
| # | File | Sạn | Rule |
|---|---|---|---|
| A1 | `billing/domain/Charge.java` `revokeExemption` | Từ chối miễn giảm khoản nhóm theo ký: tiền = đơn giá × số tháng (thiếu định mức kg) → khoản về Chưa thu sai tiền. Cần cột `quota_kg` chụp lúc phát hành (V33) | BR-BIL-03, BR-LD-04 |
| A2 | `masterdata/service/SubjectService` `get`/`search`/`member-history`, `AreaAssignmentService` | Người đi thu đọc được hộ ngoài tổ mình (chỉ lọc theo công ty) | BR-GEN-04 |
| A3 | `remittance/service/CompanyReceiptService:59,120` | Phiếu thu in "còn phải nộp sau phiếu" = due − đã nộp, đúng ra payable − đã nộp (lệch thông báo) | BR-REM-03/04/12 |
| A4 | `remittance/service/CompanyLedgerService:206-220` | "Nợ kỳ trước" gồm cả kỳ mới hơn → kỳ cũ đã đủ bị "Lệch" | BR-REM-03/07 |
| A5 | `complaint/service/ComplaintService:201,216` | Đóng/phản hồi khiếu nại 2000 ký tự → body thông báo vượt ngưỡng → rollback lỗi | BR-CMP-04 |
| A6 | `HouseholdReminderService:75` | Chạy tay đúng lúc job 08:00 có thể gửi trùng; chỉ publish khi `jdbc.update(...) == 1` | BR-NTF-03 |
| A7 | `CollectionService:309`, `CashService:76`, `ReminderService:100`, `ComplaintService:94` | Sinh mã `max+1` không khóa theo tiền tố → trùng mã → 500/409 vô lý; dùng cơ chế như `lockCodePrefix`/`requests.lockCodes()` | BR-GEN-06 |
| A8 | `UserAdminController:94,121` | Mật khẩu > 72 ký tự trả 400 thay vì 422 `PASSWORD_TOO_LONG` | BR-PLT-03 |
| A9 | `CollectionService:212` `recordVisit`, `:88` | `clientRequestId` trùng đồng thời → 500 thay vì trả bản cũ / `REQUEST_ID_REUSED` | BR-COL-05 |

Nghi (cần tái hiện hoặc xác nhận trước khi sửa):
- `ChargeEligibility:598` chọn đăng ký theo ngày phát hành, không theo kỳ (đổi số người từ kỳ sau → khoản kỳ sau có thể tính nhóm cũ). BR-MD-09/BIL-02.
- `SubjectService.syncHouseholdGroup`/`requireGroupFits` bỏ sót đăng ký có `validTo != null`; đổi loại đối tượng khỏi hộ gia đình không xử lý nhóm giá; `end()` đặt ENDED ngay dù ngày tương lai.
- `ChargeCalculator:513-527` hộ theo ký miễn 100% vẫn bị `QUOTA_KG_REQUIRED`, và một hộ thiếu định mức làm hỏng cả lượt phát hành.
- `BillingController`/DTO `unitPrice` cho 0 qua validate (`@PositiveOrZero`), `CHARGE_PRICE_INVALID` chỉ ném khi có hộ đủ điều kiện (BR-BIL-09). Hạn đóng cho phép trước ngày phát hành.
- Chạy đua: phát hành YCT song song cùng kỳ; ban hành biểu giá với mở kỳ (BR-BIL-06, BR-MD-11/14).
- `ApprovalService:217`: xóa nợ khoản đã thu rồi hoàn hết (tổng ròng 0) vẫn được; hoàn khoản chưa Đã thu; không trừ đề nghị hoàn đang chờ; audit hoàn/xóa nợ thiếu before/after khoản (BR-LD-05/06, BR-GEN-03).
- `retained` tính từ `tariff_rates` hiện tại, không chụp theo khoản: sửa biểu giá đã ban hành làm đổi payable (xem câu hỏi Q3).
- `LedgerRow.gap` = đã nộp + điều chỉnh + giữ lại − đã thu, lệch chữ BR-REM-07 ("đã nộp − đã thu"): cập nhật rule hoặc mô tả DTO.
- `lowCollectionRate` cấp công ty vẫn gắn cờ khi `due == 0` (BR-REM-10).
- Citizen: khiếu nại/rác cồng kềnh lọc theo tài khoản dân, không theo hộ; `legacyPhotoReadable` rộng; ảnh tải qua `/api/citizen/photos` không hạn mức; gửi phản ánh/rác cồng kềnh không có `clientRequestId`.
- Platform: `companyId` người dùng không kiểm tồn tại trước DB; khóa tài khoản không hiệu lực ngay (BR-PLT-06 Demo); OTP cố định không giới hạn thử (BR-CIT-01 Demo); Swagger mở mọi profile; chạy nhắc hộ dân tay không audit.
- Hiệu năng: danh sách nhắc nộp và `row()` dựng lại cả sổ kỳ cho từng dòng.

## Câu hỏi nghiệp vụ
| # | Tình huống | Code đang làm gì | Tài liệu nói gì | Đề xuất |
|---|---|---|---|---|
| Q1 | Biểu giá đã ban hành có được sửa đơn giá | `updateDraft` vẫn ghi đè `rates` của bản ISSUED/ACTIVE (chỉ chặn đổi ngày hiệu lực); controller mô tả "giữ nguyên ngày hiệu lực" | BR-MD-11 "bản đã ban hành không sửa" | Chặn sửa `rates` khi không còn dự thảo (`TARIFF_NOT_DRAFT`); leader xác nhận trước khi sửa vì mô tả controller có vẻ cố ý |
| Q2 | Xóa nợ khoản đã thu rồi hoàn hết | Tính theo tổng ròng đã thu | BR-LD-06 "chưa có thanh toán" | Tính theo số dòng thanh toán, hoặc ghi rõ "ròng" vào rule |
| Q3 | Sửa biểu giá sau khi phát hành làm đổi `retained`/`payable` | `retained` tính từ `tariff_rates` hiện tại | BR-REM-02 "từng khoản amount × collection_fee / monthly_total" | Chụp `collection_fee` lên khoản khi phát hành (cần migration), hoặc chốt biểu giá bất biến sau phát hành |
| Q4 | Hộ ngừng dịch vụ giữa kỳ | `end(endDate)` đặt ENDED ngay; phát hành bỏ qua hộ `SUBJECT_NOT_ACTIVE` | Chưa có | Xã chốt cách tính khoản kỳ ngừng |
| Q5 | Hoàn khoản chưa Đã thu (thu một phần) | Cho phép nếu `0 < số ≤ đã thu` | BR-LD-05 "khoản đã thu" | Giữ cho phép, ghi rule |
| Q6 | Khiếu nại/rác cồng kềnh của hộ nhiều tài khoản | Lọc theo tài khoản | BR-CIT-02 "hộ mình" | Lọc theo hộ |
| Q7 | Hạn đóng khoản/kỳ trước ngày phát hành, hạn kỳ xa vô hạn | Chỉ chặn `< openDate` / `> hạn kỳ` | BR-BIL-08 | Xã chốt ngưỡng |

## Yêu cầu sang lane khác
| # | Gửi lane | Cần gì | Vì sao | Trạng thái |
|---|---|---|---|---|
| 1 | Leader | Duyệt quyền chạy `mvnw.cmd test`, QĐ-L1, CORS ở cửa sổ Backend | Bị classifier chặn; leader không cấp được | Chờ người dùng |
| 2 | Leader | Xác nhận API "người đi thu" nào có số đếm hộ đã thu/cần thu | Chỉ thấy `area-progress` và sổ công ty có `chargeCount`; đã sửa hai chỗ này | Chờ |
| 4 | Web (xã) | Màn Biểu giá: bản đã ban hành không còn sửa được (PUT trả 422 TARIFF_NOT_DRAFT); ẩn nút Sửa với bản ACTIVE/ISSUED, nhãn audit `UPDATE_TARIFF_VERSION` chỉ còn cho dòng cũ | QĐ-L7 | Chờ |
| 3 | Web (xã) | Nếu sửa A3, mô tả `remainingAfter` đổi nghĩa thành "còn phải nộp xã" | Phiếu in | Chờ |
