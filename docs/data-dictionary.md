# Data dictionary — Demo thu giá dịch vụ VSMT

**Phiên bản:** 0.2 · **Ngày:** 24/09/2026 · **Task:** T01 (`tasks/todo.md`)
**Trạng thái duyệt:**

- Phần A (platform, master-data, billing, collection, remittance): **Đã duyệt Phần A — 24/09/2026** (H1)
- Phần B (notifications, complaints, citizen-app, CollectionSchedule): **Đã duyệt Phần B — 24/09/2026** (H2, người dùng xác nhận trong phiên làm việc)

> Khi duyệt, ghi ở đây: `Đã duyệt Phần A — dd/mm/yyyy` / `Đã duyệt Phần B — dd/mm/yyyy`.
> Chưa duyệt phần nào thì không task nào được tạo entity/migration của phần đó (SPEC §8, plan H1/H2).

Tài liệu này là **nguồn duy nhất** để viết entity + migration Flyway, và là danh sách để xin dữ liệu từ xã và công ty. Căn cứ: `SPEC.md` §9, `docs/reference/prototype-inventory.md`, `docs/intent/demo-springboot.md`, `tasks/plan.md` §9.

Câu trả lời của người duyệt ngày 24/09/2026 được tóm tắt ở mục 5.0 và **đã áp vào các bảng** (ghi chú dạng `(G3)`, `(D5)`). Chỗ **còn mở** vẫn đánh dấu `⚠` (hiện còn: O1 biên lai, đơn vị tính nhóm `BY_VOLUME`, số giá chính thức QĐ 65/2026).

---

## Mục lục

1. [Cách đọc](#1-cách-đọc)
2. [Phần A — platform, master-data, billing, collection, remittance](#2-phần-a) (21 entity)
3. [Phần B — notifications, complaints, citizen-app, CollectionSchedule](#3-phần-b) (8 entity)
4. [Đối chiếu prototype](#4-đối-chiếu-prototype)
5. [Câu hỏi cho người duyệt](#5-câu-hỏi-cho-người-duyệt)
6. [Danh sách trường cần xin](#6-danh-sách-trường-cần-xin)

---

## 1. Cách đọc

### 1.1 Cột của bảng trường


| Cột               | Ý nghĩa                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Tên hiển thị (VI) | Nhãn trên giao diện, biểu mẫu xin dữ liệu                                                                    |
| Tên kỹ thuật      | Tên cột CSDL `snake_case` (field Java/TS là `camelCase` tương ứng)                                           |
| Kiểu              | Xem 1.2                                                                                                      |
| Bắt buộc          | `Có` / `Không` / `Có điều kiện` (điều kiện ghi ở ghi chú)                                                    |
| Nguồn             | **Xã** / **Công ty** / **Hệ thống** (sinh tự động hoặc do quản trị cấu hình) / **Người dân**                 |
| Ví dụ             | Giá trị giả, không phải dữ liệu thật                                                                         |
| Mức               | **Demo** = phải có để chạy demo · **Thật** = nên có khi triển khai thật (demo có thể để trống/không tạo cột) |
| Ghi chú           | Ràng buộc, quy tắc, điểm còn mở                                                                              |


### 1.2 Kiểu dữ liệu


| Kiểu trong tài liệu | PostgreSQL                           | Java                           | Ghi chú                                                |
| ------------------- | ------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `id` | `bigint` identity | `Long` | Khóa kỹ thuật; mã nghiệp vụ là cột `code` duy nhất (D1) |
| `FK→X`              | `bigint` + khóa ngoại tới bảng của X | `Long` / quan hệ JPA           |                                                        |
| `text(n)`           | `varchar(n)`                         | `String`                       | `text` không giới hạn khi không ghi `n`                |
| `money`             | `bigint`                             | `long`                         | Số nguyên VND, không số thực (SPEC §3)                 |
| `int`               | `integer`                            | `int`                          |                                                        |
| `bool`              | `boolean`                            | `boolean`                      |                                                        |
| `date`              | `date`                               | `LocalDate`                    | API `yyyy-MM-dd`, hiển thị `dd/MM/yyyy`                |
| `time`              | `time`                               | `LocalTime`                    |                                                        |
| `timestamp`         | `timestamptz`                        | `OffsetDateTime`               | Múi giờ `Asia/Ho_Chi_Minh`                             |
| `enum X`            | `varchar(30)`                        | `enum` + `@Enumerated(STRING)` | Giá trị kỹ thuật tiếng Anh, nhãn tiếng Việt ở frontend |
| `json`              | `jsonb`                              | `String`/`JsonNode`            | Chỉ dùng cho audit và liên kết thông báo               |
| `list FK→X`         | bảng nối                             | `Set<Long>`                    | Tên bảng nối ghi ở ghi chú                             |


### 1.3 Trường hệ thống chung (không lặp lại trong từng bảng)

Mọi bảng có các cột dưới, trừ khi entity ghi "không có trường chung".


| Tên hiển thị (VI)       | Tên kỹ thuật | Kiểu        | Bắt buộc | Nguồn    | Ví dụ                     | Mức  | Ghi chú                                      |
| ----------------------- | ------------ | ----------- | -------- | -------- | ------------------------- | ---- | -------------------------------------------- |
| Khóa | `id` | `id` | Có | Hệ thống | 1024 | Demo | D1 |
| Tạo lúc                 | `created_at` | `timestamp` | Có       | Hệ thống | 2026-10-01T08:30:00+07:00 | Demo |                                              |
| Người tạo               | `created_by` | `FK→User`   | Không    | Hệ thống | 3                         | Demo | Null khi do seed/hệ thống hoặc người dân tạo |
| Sửa lúc                 | `updated_at` | `timestamp` | Có       | Hệ thống | 2026-10-02T09:00:00+07:00 | Demo |                                              |
| Người sửa               | `updated_by` | `FK→User`   | Không    | Hệ thống | 3                         | Demo |                                              |
| Phiên bản khóa lạc quan | `version`    | `int`       | Có       | Hệ thống | 0                         | Demo | `@Version`, chống hai người sửa đè nhau      |


Lịch sử trước/sau của thao tác tạo/sửa tiền **không** nằm ở cột chung mà ở `AuditLog`.

### 1.4 Tổng quan entity


| #   | Entity              | Bảng                    | Module        | Phần |
| --- | ------------------- | ----------------------- | ------------- | ---- |
| 1   | User                | `users`                 | platform      | A    |
| 2   | AuditLog            | `audit_logs`            | platform      | A    |
| 3   | District            | `districts`             | master-data   | A    |
| 4   | Area                | `areas`                 | master-data   | A    |
| 5   | Company             | `companies`             | master-data   | A    |
| 6   | AreaAssignment      | `area_assignments`      | master-data   | A    |
| 7   | ServiceSubject      | `service_subjects`      | master-data   | A    |
| 8   | ServiceContract     | `service_contracts`     | master-data   | A    |
| 9   | TariffVersion       | `tariff_versions`       | master-data   | A    |
| 10  | TariffRate          | `tariff_rates`          | master-data   | A    |
| 11  | FeeType             | `fee_types`             | master-data   | A    |
| 12  | CollectionPeriod    | `collection_periods`    | master-data   | A    |
| 13  | ChargeRequest       | `charge_requests`       | billing       | A    |
| 14  | Charge              | `charges`               | billing       | A    |
| 15  | CollectorAssignment | `collector_assignments` | collection    | A    |
| 16  | CollectionVisit     | `collection_visits`     | collection    | A    |
| 17  | Payment             | `payments`              | collection    | A    |
| 18  | CashHandover        | `cash_handovers`        | collection    | A    |
| 19  | CompanyReceipt      | `company_receipts`      | remittance    | A    |
| 20  | ReceiptIssue        | `receipt_issues`        | remittance    | A    |
| 21  | PaymentReminder     | `payment_reminders`     | remittance    | A    |
| 22  | Notification        | `notifications`         | notifications | B    |
| 23  | Complaint           | `complaints`            | complaints    | B    |
| 24  | ComplaintEvent      | `complaint_events`      | complaints    | B    |
| 25  | CollectionSchedule  | `collection_schedules`  | master-data   | B    |
| 26  | CitizenAccount      | `citizen_accounts`      | citizen-app   | B    |
| 27  | MarketPost          | `market_posts`          | citizen-app   | B    |
| 28  | MarketComment       | `market_comments`       | citizen-app   | B    |
| 29  | BulkyWasteRequest   | `bulky_waste_requests`  | citizen-app   | B    |


---

## 2. Phần A

## 2.1 platform

### User — Tài khoản người dùng · `users` · Phần A

Tài khoản đăng nhập web của 4 vai trò nội bộ. Người dân **không** có dòng trong bảng này, mà dùng `CitizenAccount` với token riêng (G8).


| Tên hiển thị (VI)  | Tên kỹ thuật    | Kiểu              | Bắt buộc     | Nguồn        | Ví dụ                                       | Mức  | Ghi chú                                                                                |
| ------------------ | --------------- | ----------------- | ------------ | ------------ | ------------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| Tên đăng nhập      | `username`      | `text(50)`        | Có           | Hệ thống     | `canbo_xa`                                  | Demo | Duy nhất, chữ thường, không dấu                                                        |
| Họ tên             | `full_name`     | `text(100)`       | Có           | Xã / Công ty | Nguyễn Thị Mẫu                              | Demo | Cán bộ xã do xã cung cấp; nhân sự công ty do công ty cung cấp                          |
| Số điện thoại      | `phone`         | `text(15)`        | Không        | Xã / Công ty | 0900000101                                  | Demo | Lưu chỉ chữ số; hiển thị `0900 000 101`                                                |
| Email              | `email`         | `text(100)`       | Không        | Xã / Công ty | [canbo@example.vn](mailto:canbo@example.vn) | Thật | Dùng khi có quên mật khẩu                                                              |
| Đơn vị công tác    | `organization`  | `text(100)`       | Không        | Xã / Công ty | Phòng Kinh tế                               | Thật | Chỉ hiển thị; phạm vi dữ liệu dựa vào `company_id`, không dựa vào cột này              |
| Vai trò            | `role`          | `enum Role`       | Có           | Hệ thống     | `COMMUNE_OFFICER`                           | Demo | Một vai trò/tài khoản                                                                  |
| Công ty            | `company_id`    | `FK→Company`      | Có điều kiện | Hệ thống     | 1 (DV01)                                    | Demo | Bắt buộc khi `COMPANY_MANAGER`, `COLLECTOR`; null với vai trò khác. FK thêm ở V3 (T05) |
| Mật khẩu (băm)     | `password_hash` | `text(100)`       | Có           | Hệ thống     | `$2a$10$…`                                  | Demo | bcrypt; không bao giờ trả ra API                                                       |
| Trạng thái         | `status`        | `enum UserStatus` | Có           | Hệ thống     | `ACTIVE`                                    | Demo |                                                                                        |
| Đăng nhập lần cuối | `last_login_at` | `timestamp`       | Không        | Hệ thống     | 2026-10-01T07:05:00+07:00                   | Thật |                                                                                        |


**Enum `Role`**


| Giá trị           | Nhãn                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| `COMMUNE_OFFICER` | Cán bộ xã                                                                   |
| `COMPANY_MANAGER` | Công ty môi trường                                                          |
| `COLLECTOR`       | Người đi thu                                                                |
| `ADMIN`           | Quản trị                                                                    |


**Enum `UserStatus`:** `ACTIVE` Hoạt động · `LOCKED` Đã khóa

**Khóa/ràng buộc:** `username` duy nhất; `CHECK` `company_id` khác null khi và chỉ khi `role IN (COMPANY_MANAGER, COLLECTOR)`.

### AuditLog — Nhật ký thao tác · `audit_logs` · Phần A

Ghi mọi thao tác tạo/sửa tiền và thao tác quản trị (SPEC §8). Chỉ thêm, không sửa, không xóa. **Không có trường chung** ngoài `id`.


| Tên hiển thị (VI)    | Tên kỹ thuật     | Kiểu        | Bắt buộc | Nguồn    | Ví dụ                     | Mức  | Ghi chú                                                                                                            |
| -------------------- | ---------------- | ----------- | -------- | -------- | ------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| Khóa                 | `id`             | `id`        | Có       | Hệ thống | 88                        | Demo |                                                                                                                    |
| Thời điểm            | `occurred_at`    | `timestamp` | Có       | Hệ thống | 2026-10-05T10:24:18+07:00 | Demo |                                                                                                                    |
| Người thao tác       | `actor_user_id`  | `FK→User`   | Không    | Hệ thống | 3                         | Demo | Null khi hệ thống/người dân                                                                                        |
| Tên đăng nhập (chụp) | `actor_username` | `text(50)`  | Có       | Hệ thống | `canbo_xa`                | Demo | Chụp lại để nhật ký còn đọc được khi tài khoản đổi tên; `system` khi tác vụ tự động; `citizen:<sđt>` khi người dân |
| Vai trò (chụp)       | `actor_role`     | `text(30)`  | Có       | Hệ thống | `COMMUNE_OFFICER`         | Demo |                                                                                                                    |
| Hành động            | `action`         | `text(60)`  | Có       | Hệ thống | `ISSUE_COMPANY_RECEIPT`   | Demo | Mã hành động, nhãn tiếng Việt ở frontend                                                                           |
| Loại đối tượng       | `entity_type`    | `text(40)`  | Có       | Hệ thống | `CompanyReceipt`          | Demo |                                                                                                                    |
| Khóa đối tượng       | `entity_id`      | `text(40)`  | Có       | Hệ thống | `PT-CT-1026-001`          | Demo | Lưu mã nghiệp vụ nếu có, không thì `id`                                                                            |
| Dữ liệu trước        | `before_data`    | `json`      | Không    | Hệ thống | `{"amount":0}`            | Demo | Null khi tạo mới                                                                                                   |
| Dữ liệu sau          | `after_data`     | `json`      | Không    | Hệ thống | `{"amount":4200000}`      | Demo | Null khi xóa                                                                                                       |
| Địa chỉ IP           | `ip_address`     | `text(45)`  | Không    | Hệ thống | 10.0.0.12                 | Thật |                                                                                                                    |


**Khóa/ràng buộc:** chỉ INSERT; chỉ mục `(entity_type, entity_id)` và `occurred_at`. Ghi trong cùng transaction nghiệp vụ, rollback cùng nhau (T07).

## 2.2 master-data

### District — Địa bàn · `districts` · Phần A

Ba địa bàn sau sáp nhập của xã Đông Thạnh.


| Tên hiển thị (VI) | Tên kỹ thuật | Kiểu        | Bắt buộc | Nguồn    | Ví dụ                      | Mức  | Ghi chú                                 |
| ----------------- | ------------ | ----------- | -------- | -------- | -------------------------- | ---- | --------------------------------------- |
| Mã địa bàn        | `code`       | `text(10)`  | Có       | Xã       | `DTH`                      | Demo | Duy nhất; dùng làm tiền tố mã đối tượng |
| Tên địa bàn       | `name`       | `text(100)` | Có       | Xã       | Đông Thạnh                 | Demo |                                         |
| Ghi chú           | `note`       | `text`      | Không    | Xã       | Ánh xạ từ xã Đông Thạnh cũ | Demo |                                         |
| Thứ tự hiển thị   | `sort_order` | `int`       | Không    | Hệ thống | 1                          | Thật |                                         |


**Khóa/ràng buộc:** `code` duy nhất. Seed demo: `DTH` Đông Thạnh · `TTT` Thới Tam Thôn · `NB` Nhị Bình.

### Area — Khu vực / Tổ dân phố · `areas` · Phần A


| Tên hiển thị (VI) | Tên kỹ thuật  | Kiểu                | Bắt buộc | Nguồn    | Ví dụ         | Mức  | Ghi chú                              |
| ----------------- | ------------- | ------------------- | -------- | -------- | ------------- | ---- | ------------------------------------ |
| Mã khu vực        | `code`        | `text(10)`          | Có       | Xã       | `KV07`        | Demo | Duy nhất                             |
| Tên khu vực       | `name`        | `text(100)`         | Có       | Xã       | Tổ dân phố 07 | Demo |                                      |
| Địa bàn | `district_id` | `FK→District` | Có | Xã | 1 (DTH) | Demo | Prototype không có liên kết. Seed tạm: KV01–08 → DTH, KV09–16 → TTT, KV17–24 → NB, mã hộ seed sinh lại cho khớp tiền tố địa bàn (D2). Dữ liệu thật xin xã (X2) |
| Trạng thái        | `status`      | `enum ActiveStatus` | Có       | Hệ thống | `ACTIVE`      | Thật | Demo mặc định `ACTIVE`               |
| Ghi chú           | `note`        | `text`              | Không    | Xã       |               | Thật |                                      |


**Enum `ActiveStatus`** (dùng chung): `ACTIVE` Hoạt động · `INACTIVE` Tạm ngưng

**Khóa/ràng buộc:** `code` duy nhất. Số hộ **không lưu**, tính khi truy vấn. Công ty phụ trách **không lưu ở đây**, lấy từ `AreaAssignment`.

### Company — Công ty môi trường · `companies` · Phần A


| Tên hiển thị (VI)   | Tên kỹ thuật          | Kiểu                | Bắt buộc | Nguồn    | Ví dụ            | Mức  | Ghi chú                                   |
| ------------------- | --------------------- | ------------------- | -------- | -------- | ---------------- | ---- | ----------------------------------------- |
| Mã công ty          | `code`                | `text(10)`          | Có       | Hệ thống | `DV01`           | Demo | Duy nhất; `DV` + 2 số                     |
| Tên công ty         | `name`                | `text(200)`         | Có       | Công ty  | Công ty MTĐT Mẫu | Demo | Seed dùng tên giả                         |
| Người đầu mối       | `contact_name`        | `text(100)`         | Có       | Công ty  | Trần Văn Mẫu     | Demo | Mặc định là người nộp tiền trên phiếu thu |
| SĐT đầu mối         | `contact_phone`       | `text(15)`          | Có       | Công ty  | 0900000001       | Demo |                                           |
| Trạng thái          | `status`              | `enum ActiveStatus` | Có       | Xã       | `ACTIVE`         | Demo |                                           |
| Hiệu lực từ         | `valid_from`          | `date`              | Có       | Xã       | 2026-01-01       | Demo | Hiệu lực hợp đồng giữa xã và công ty      |
| Hiệu lực đến        | `valid_to`            | `date`              | Không    | Xã       | 2026-12-31       | Demo | Null = chưa xác định                      |
| Loại hình           | `org_type`            | `enum CompanyType`  | Không    | Công ty  | `COMPANY`        | Thật |                                           |
| Mã số thuế          | `tax_code`            | `text(14)`          | Không    | Công ty  | 0312345678       | Thật |                                           |
| Địa chỉ             | `address`             | `text(255)`         | Không    | Công ty  |                  | Thật |                                           |
| Email               | `email`               | `text(100)`         | Không    | Công ty  |                  | Thật |                                           |
| Số hợp đồng với xã  | `commune_contract_no` | `text(50)`          | Không    | Xã       | 12/2026/HĐ-UBND  | Thật |                                           |
| Tài khoản ngân hàng | `bank_account`        | `text(50)`          | Không    | Công ty  |                  | Thật | Dùng đối chiếu tiền chuyển khoản về xã    |
| Ngân hàng           | `bank_name`           | `text(100)`         | Không    | Công ty  |                  | Thật |                                           |


**Enum `CompanyType`:** `COMPANY` Công ty · `COOPERATIVE` Hợp tác xã · `PUBLIC_UNIT` Đơn vị sự nghiệp công

**Khóa/ràng buộc:** `code` duy nhất; `valid_to ≥ valid_from`.

### AreaAssignment — Phân công khu vực cho công ty · `area_assignments` · Phần A

Mỗi khu vực tối đa 1 công ty trong cùng khoảng hiệu lực; đổi công ty tạo bản ghi mới, backend tự đóng bản ghi cũ (SPEC §9.3).


| Tên hiển thị (VI)    | Tên kỹ thuật  | Kiểu         | Bắt buộc | Nguồn         | Ví dụ                | Mức  | Ghi chú                                                                                                      |
| -------------------- | ------------- | ------------ | -------- | ------------- | -------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| Khu vực              | `area_id`     | `FK→Area`    | Có       | Xã            | 7 (KV07)             | Demo |                                                                                                              |
| Công ty              | `company_id`  | `FK→Company` | Có       | Xã            | 1 (DV01)             | Demo |                                                                                                              |
| Từ ngày              | `valid_from`  | `date`       | Có       | Xã            | 2026-09-01           | Demo |                                                                                                              |
| Đến ngày             | `valid_to`    | `date`       | Không    | Hệ thống / Xã | 2026-12-31           | Demo | Null = đang hiệu lực không thời hạn. Khi phân công mới, bản cũ được gán `valid_to = valid_from mới − 1 ngày` |
| Ghi chú              | `note`        | `text`       | Không    | Xã            | Chuyển do DV03 ngưng | Demo |                                                                                                              |
| Số văn bản phân công | `decision_no` | `text(50)`   | Không    | Xã            |                      | Thật |                                                                                                              |


**Khóa/ràng buộc:** không chồng lấn hiệu lực trên cùng `area_id` — exclusion constraint `EXCLUDE USING gist (area_id WITH =, daterange(valid_from, valid_to, '[]') WITH &&)` hoặc kiểm tra trong transaction (T13). Không xóa bản ghi cũ.
**Ảnh hưởng:** công ty của một khoản chụp theo phân công tại ngày phát hành (G3); khi đổi công ty, phân tổ người đi thu của công ty cũ tự kết thúc (G14).

### ServiceSubject — Đối tượng sử dụng dịch vụ · `service_subjects` · Phần A

Hộ gia đình / hộ kinh doanh / doanh nghiệp. Hiển thị chung form "Hồ sơ hộ" với `ServiceContract`.


| Tên hiển thị (VI)   | Tên kỹ thuật          | Kiểu                 | Bắt buộc | Nguồn         | Ví dụ           | Mức  | Ghi chú                                                                                                                                                            |
| ------------------- | --------------------- | -------------------- | -------- | ------------- | --------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mã đối tượng        | `code`                | `text(20)`           | Có       | Hệ thống / Xã | `DTH-H000128`   | Demo | Duy nhất. Dạng `{mã địa bàn}-{H|KD|DN}{số}` như prototype, tổng 7 ký tự sau dấu gạch (`H000128`, `KD00077`). Nếu xã đã có mã hộ riêng thì dùng mã xã (xin ở mục 6) |
| Loại đối tượng      | `subject_type`        | `enum SubjectType`   | Có       | Xã            | `HOUSEHOLD`     | Demo |                                                                                                                                                                    |
| Tên chủ hộ / cơ sở  | `name`                | `text(200)`          | Có       | Xã            | Nguyễn Văn Mẫu  | Demo | Seed dùng tên giả                                                                                                                                                  |
| Địa chỉ             | `address`             | `text(255)`          | Có       | Xã            | 12/5 đường Số 1 | Demo | Số nhà, hẻm, đường; tổ/địa bàn lấy từ `area_id`                                                                                                                    |
| Khu vực             | `area_id`             | `FK→Area`            | Có       | Xã            | 7 (KV07)        | Demo | Địa bàn suy ra từ khu vực                                                                                                                                          |
| Số điện thoại       | `phone`               | `text(15)`           | Không    | Xã / Công ty  | 0900000128      | Demo | Dùng để gắn tài khoản app người dân                                                                                                                                |
| Trạng thái          | `status`              | `enum SubjectStatus` | Có       | Xã            | `ACTIVE`        | Demo |                                                                                                                                                                    |
| Số nhân khẩu        | `member_count`        | `int`                | Không    | Xã            | 4               | Thật | Căn cứ chọn nhóm giá HGĐ ≤ 2 / ≥ 3 người; chỉ với `HOUSEHOLD`                                                                                                      |
| Người đại diện      | `representative_name` | `text(100)`          | Không    | Xã            |                 | Thật | Với hộ kinh doanh / doanh nghiệp                                                                                                                                   |
| Mã số thuế          | `tax_code`            | `text(14)`           | Không    | Xã            |                 | Thật | Với hộ kinh doanh / doanh nghiệp                                                                                                                                   |
| Số định danh chủ hộ | `national_id`         | `text(12)`           | Không    | Xã            |                 | Thật | Dữ liệu cá nhân nhạy cảm; chỉ xin nếu xã yêu cầu định danh (xem mục 6.3)                                                                                           |
| Ghi chú             | `note`                | `text`               | Không    | Xã            |                 | Demo |                                                                                                                                                                    |


**Enum `SubjectType`:** `HOUSEHOLD` Hộ gia đình · `BUSINESS_HOUSEHOLD` Hộ kinh doanh · `ENTERPRISE` Doanh nghiệp
**Enum `SubjectStatus`:** `ACTIVE` Đang cung cấp · `PENDING` Chờ xử lý · `ENDED` Đã chấm dứt

**Khóa/ràng buộc:** `code` duy nhất.

### ServiceContract — Đăng ký dịch vụ (hợp đồng) · `service_contracts` · Phần A


| Tên hiển thị (VI) | Tên kỹ thuật         | Kiểu                | Bắt buộc     | Nguồn              | Ví dụ         | Mức  | Ghi chú                                                             |
| ----------------- | -------------------- | ------------------- | ------------ | ------------------ | ------------- | ---- | ------------------------------------------------------------------- |
| Số đăng ký | `contract_no` | `text(30)` | Có | Hệ thống | `ĐK-DTH-0128` | Demo | Duy nhất; hệ thống tự sinh `ĐK-{mã địa bàn}-{số 4 chữ số}`, đếm theo địa bàn (D10). Tên cột giữ `contract_no` để khớp tên entity |
| Đối tượng         | `subject_id`         | `FK→ServiceSubject` | Có           | Hệ thống           | 128           | Demo |                                                                     |
| Nhóm giá | `tariff_group` | `enum TariffGroup` | Có | Xã | `HH_3_PLUS` | Demo | Enum cố định (D3). Giá lấy từ `TariffRate` của phiên bản biểu giá gắn với kỳ |
| Hiệu lực từ | `valid_from` | `date` | Có | Xã | 2026-01-01 | Demo | Ngày bắt đầu sử dụng dịch vụ |
| Hiệu lực đến | `valid_to` | `date` | Không | Xã |  | Demo | Null = không thời hạn |
| Miễn 100%         | `exempt`             | `bool`              | Có           | Xã                 | false         | Demo | Mặc định false. Miễn giảm một phần ngoài phạm vi                    |
| Lý do miễn        | `exempt_reason`      | `text(255)`         | Có điều kiện | Xã                 | Hộ nghèo      | Demo | Bắt buộc khi `exempt = true`                                        |
| Số văn bản miễn   | `exempt_decision_no` | `text(50)`          | Không        | Xã                 |               | Thật |                                                                     |
| Ghi chú           | `note`               | `text`              | Không        | Xã                 |               | Demo |                                                                     |


**Enum `TariffGroup`** (cố định, D3; giá dưới đây là số tạm, G9)


| Giá trị           | Nhãn               | Giá prototype (đ/tháng)      |
| ----------------- | ------------------ | ---------------------------- |
| `HH_UP_TO_2`      | HGĐ ≤ 2 người      | 40.000                       |
| `HH_3_PLUS`       | HGĐ ≥ 3 người      | 80.000                       |
| `SMALL_GENERATOR` | Chủ nguồn thải nhỏ | 119.000                      |
| `BY_VOLUME` | Theo khối lượng | 1.266.000 (số tạm; đơn vị tính chờ QĐ 65/2026) |


**Khóa/ràng buộc:** `contract_no` duy nhất; mỗi `subject_id` tối đa 1 hợp đồng hiệu lực tại một thời điểm (exclusion constraint theo `daterange(valid_from, valid_to)`); `valid_to ≥ valid_from`.

### TariffVersion — Phiên bản biểu giá · `tariff_versions` · Phần A


| Tên hiển thị (VI) | Tên kỹ thuật  | Kiểu                | Bắt buộc | Nguồn    | Ví dụ              | Mức  | Ghi chú                             |
| ----------------- | ------------- | ------------------- | -------- | -------- | ------------------ | ---- | ----------------------------------- |
| Mã phiên bản      | `code`        | `text(20)`          | Có       | Hệ thống | `BG-65-2026`       | Demo | Duy nhất                            |
| Căn cứ pháp lý    | `legal_basis` | `text(100)`         | Có       | Xã       | QĐ 65/2026/QĐ-UBND | Demo |                                     |
| Ngày ban hành     | `issued_date` | `date`              | Không    | Xã       |                    | Thật |                                     |
| Hiệu lực từ       | `valid_from`  | `date`              | Có       | Xã       | 2026-09-01         | Demo |                                     |
| Hiệu lực đến      | `valid_to`    | `date`              | Không    | Xã       | 2027-06-30         | Demo |                                     |
| Trạng thái        | `status`      | `enum TariffStatus` | Có       | Hệ thống | `ACTIVE`           | Demo |                                     |
| Phạm vi áp dụng | `scope_note` | `text(255)` | Không | Xã | Nhóm 2 | Demo | Mô tả tự do |
| Ghi chú           | `note`        | `text`              | Không    | Xã       |                    | Demo |                                     |


**Enum `TariffStatus`:** `DRAFT` Dự thảo · `ACTIVE` Đang áp dụng · `EXPIRED` Hết hiệu lực

**Khóa/ràng buộc:** `code` duy nhất; các phiên bản `ACTIVE` không chồng lấn hiệu lực. Seed: `BG-65-2026` (QĐ 65/2026, `ACTIVE`) và `BG-67-2025` (QĐ 67/2025, `EXPIRED`, cho kỳ 08/2026).

### TariffRate — Đơn giá theo nhóm · `tariff_rates` · Phần A


| Tên hiển thị (VI)  | Tên kỹ thuật        | Kiểu               | Bắt buộc | Nguồn    | Ví dụ       | Mức  | Ghi chú                                       |
| ------------------ | ------------------- | ------------------ | -------- | -------- | ----------- | ---- | --------------------------------------------- |
| Phiên bản biểu giá | `tariff_version_id` | `FK→TariffVersion` | Có       | Hệ thống | 1           | Demo |                                               |
| Nhóm giá           | `tariff_group`      | `enum TariffGroup` | Có       | Xã       | `HH_3_PLUS` | Demo |                                               |
| Thu gom | `collection_fee` | `money` | Có | Xã | 57000 | Demo | Số tạm cho tới khi có QĐ 65/2026 (G9) |
| Xử lý | `processing_fee` | `money` | Có | Xã | 23000 | Demo | Số tạm (G9) |
| Tổng mỗi tháng | `monthly_total` | `money` | Có | Hệ thống | 80000 | Demo | = thu gom + xử lý (CHECK) |
| Đơn vị tính | `unit_label` | `text(30)` | Có | Xã | đ/hộ/tháng | Demo | ⚠ Đơn vị của nhóm `BY_VOLUME` chưa rõ; tạm `đ/tháng` như prototype |


**Khóa/ràng buộc:** duy nhất `(tariff_version_id, tariff_group)`; `CHECK monthly_total = collection_fee + processing_fee`. Biểu giá chỉ gồm **2 thành phần** thu gom + xử lý, không tách vận chuyển và VAT (G9, trả lời 24/09/2026).

**Seed tạm (số tạm, thay khi có QĐ 65/2026):** `HH_UP_TO_2` 29.000 + 11.000 = 40.000 · `HH_3_PLUS` 57.000 + 23.000 = 80.000 · `SMALL_GENERATOR` 119.000 + 0 · `BY_VOLUME` 1.266.000 + 0.

### FeeType — Loại phí · `fee_types` · Phần A


| Tên hiển thị (VI) | Tên kỹ thuật    | Kiểu               | Bắt buộc     | Nguồn    | Ví dụ                          | Mức  | Ghi chú                                                 |
| ----------------- | --------------- | ------------------ | ------------ | -------- | ------------------------------ | ---- | ------------------------------------------------------- |
| Mã loại phí       | `code`          | `text(20)`         | Có           | Hệ thống | `ENV`                          | Demo | Duy nhất                                                |
| Tên loại phí      | `name`          | `text(100)`        | Có           | Xã       | Phí vệ sinh môi trường (CTRSH) | Demo |                                                         |
| Cách tính giá     | `pricing_mode`  | `enum PricingMode` | Có           | Hệ thống | `TARIFF`                       | Demo |                                                         |
| Giá mặc định | `default_price` | `money` | Có điều kiện | Xã | 50000 | Demo | Bắt buộc khi `FIXED`; phiếu YCT được nhập giá khác (R1) |
| Đang dùng         | `active`        | `bool`             | Có           | Hệ thống | true                           | Demo |                                                         |


**Enum `PricingMode`:** `TARIFF` Theo biểu giá · `FIXED` Giá cố định
**Seed:** `ENV` (TARIFF) · `EXTRA` Phụ phí dịch vụ phát sinh 50.000 (FIXED). **Không có `BULKY`**: rác cồng kềnh chỉ là `BulkyWasteRequest` có phí công ty báo, không lập qua phiếu YCT (G13, O5).

### CollectionPeriod — Kỳ thu · `collection_periods` · Phần A


| Tên hiển thị (VI)  | Tên kỹ thuật        | Kiểu                | Bắt buộc | Nguồn    | Ví dụ                 | Mức  | Ghi chú                                           |
| ------------------ | ------------------- | ------------------- | -------- | -------- | --------------------- | ---- | ------------------------------------------------- |
| Mã kỳ              | `code`              | `text(10)`          | Có       | Hệ thống | `2026-10` / `2026-Q4` | Demo | Duy nhất                                          |
| Loại kỳ            | `period_type`       | `enum PeriodType`   | Có       | Xã       | `MONTH`               | Demo |                                                   |
| Tên kỳ             | `label`             | `text(50)`          | Có       | Hệ thống | Tháng 10/2026         | Demo | Sinh từ mã                                        |
| Ngày đầu kỳ        | `start_date`        | `date`              | Có       | Hệ thống | 2026-10-01            | Demo | Sinh từ mã; dùng kiểm tra trùng kỳ tháng–quý (R2) |
| Ngày cuối kỳ       | `end_date`          | `date`              | Có       | Hệ thống | 2026-10-31            | Demo |                                                   |
| Ngày mở            | `open_date`         | `date`              | Có       | Xã       | 2026-10-01            | Demo |                                                   |
| Hạn công ty nộp xã | `due_date` | `date` | Có | Xã | 2026-10-31 | Demo | `≥ open_date`. Chỉ dùng cho công ty nộp xã; hạn hộ đóng nằm ở phiếu YCT (G16) |
| Biểu giá áp dụng   | `tariff_version_id` | `FK→TariffVersion`  | Có       | Hệ thống | 1                     | Demo | Mặc định phiên bản `ACTIVE` tại `start_date`      |
| Trạng thái | `status` | `enum PeriodStatus` | Có | Hệ thống | `OPEN` | Demo | Quản trị mở kỳ và bắt đầu thu; cán bộ xã khóa kỳ (G1) |
| Khóa lúc           | `locked_at`         | `timestamp`         | Không    | Hệ thống |                       | Demo |                                                   |
| Người khóa         | `locked_by`         | `FK→User`           | Không    | Hệ thống |                       | Demo |                                                   |
| Ghi chú            | `note`              | `text`              | Không    | Xã       |                       | Demo |                                                   |


**Enum `PeriodType`:** `MONTH` Tháng · `QUARTER` Quý
**Enum `PeriodStatus`:** `OPEN` Đã mở → `COLLECTING` Đang thu → `LOCKED` Đã khóa (không quay lại)

**Khóa/ràng buộc:** `code` duy nhất. Kỳ tháng và kỳ quý có thể cùng tồn tại; chống thu trùng xử lý ở `Charge`.

## 2.3 billing

### ChargeRequest — Phiếu yêu cầu thu · `charge_requests` · Phần A

Chỉ lưu khi phát hành; bước xem trước không ghi CSDL.


| Tên hiển thị (VI) | Tên kỹ thuật       | Kiểu                  | Bắt buộc     | Nguồn    | Ví dụ         | Mức  | Ghi chú                                                                           |
| ----------------- | ------------------ | --------------------- | ------------ | -------- | ------------- | ---- | --------------------------------------------------------------------------------- |
| Mã phiếu | `code` | `text(20)` | Có | Hệ thống | `YCT-1026-01` | Demo | Duy nhất. Kỳ tháng `YCT-MMYY-nn`; kỳ quý `YCT-Q{quý}{YY}-nn`, vd. `YCT-Q426-01` (G11) |
| Kỳ thu            | `period_id`        | `FK→CollectionPeriod` | Có           | Xã       | 5             | Demo | Kỳ chưa khóa                                                                      |
| Loại phí          | `fee_type_id`      | `FK→FeeType`          | Có           | Xã       | 1 (ENV)       | Demo |                                                                                   |
| Phạm vi           | `scope_type`       | `enum ChargeScope`    | Có           | Xã       | `ALL`         | Demo | Lưu có cấu trúc (SPEC §9.4)                                                       |
| Các tổ được chọn  | `scope_areas`      | `list FK→Area`        | Có điều kiện | Xã       | KV07, KV09    | Demo | Bắt buộc khi `AREAS`; bảng nối `charge_request_areas(charge_request_id, area_id)` |
| Công ty | `scope_company_id` | `FK→Company` | Có điều kiện | Xã | 1 (DV01) | Demo | Bắt buộc khi `COMPANY`. Các tổ của công ty lấy theo phân công hiệu lực tại ngày phát hành (G3) |
| Ngày lập          | `issue_date`       | `date`                | Có           | Hệ thống | 2026-10-01    | Demo |                                                                                   |
| Hạn hộ đóng | `due_date` | `date` | Có | Xã | 2026-10-25 | Demo | Không được sau `CollectionPeriod.due_date` (G16) |
| Đơn giá nhập      | `unit_price`       | `money`               | Không        | Xã       | 150000        | Demo | Chỉ với loại phí `FIXED`; null thì dùng `default_price` (R1)                      |
| Ghi chú           | `note`             | `text`                | Không        | Xã       |               | Demo |                                                                                   |


**Enum `ChargeScope`:** `ALL` Toàn xã · `AREAS` Chọn tổ · `COMPANY` Theo công ty

**Không lưu (tính từ `Charge`):** số khoản, số khoản miễn, tổng tiền. Kết quả bỏ qua (không hợp đồng, khu vực chưa có công ty, đã có khoản trùng kỳ) chỉ trả về khi xem trước/phát hành, không lưu.

### Charge — Khoản phải thu của hộ · `charges` · Phần A

Nguồn duy nhất cho "phải thu" của hộ.


| Tên hiển thị (VI)    | Tên kỹ thuật        | Kiểu                  | Bắt buộc     | Nguồn    | Ví dụ             | Mức  | Ghi chú                                                                  |
| -------------------- | ------------------- | --------------------- | ------------ | -------- | ----------------- | ---- | ------------------------------------------------------------------------ |
| Mã khoản | `code` | `text(30)` | Có | Hệ thống | `KT-1026-H000128` | Demo | Duy nhất; hậu tố `-EX` (phụ phí) như prototype. Kỳ quý `KT-Q426-H000128` (G11) |
| Phiếu yêu cầu thu    | `charge_request_id` | `FK→ChargeRequest`    | Có           | Hệ thống | 12                | Demo |                                                                          |
| Đối tượng            | `subject_id`        | `FK→ServiceSubject`   | Có           | Hệ thống | 128               | Demo |                                                                          |
| Hợp đồng             | `contract_id`       | `FK→ServiceContract`  | Có           | Hệ thống | 128               | Demo | Hợp đồng hiệu lực lúc phát hành                                          |
| Kỳ thu               | `period_id`         | `FK→CollectionPeriod` | Có           | Hệ thống | 5                 | Demo |                                                                          |
| Loại phí             | `fee_type_id`       | `FK→FeeType`          | Có           | Hệ thống | 1                 | Demo |                                                                          |
| Khu vực (chụp)       | `area_id`           | `FK→Area`             | Có           | Hệ thống | 7                 | Demo | Khu vực của hộ lúc phát hành; hộ chuyển tổ sau đó không làm đổi khoản    |
| Công ty (chụp) | `company_id` | `FK→Company` | Có | Hệ thống | 1 | Demo | Công ty được phân công khu vực tại **ngày phát hành**; đổi công ty sau đó không đổi khoản đã phát hành (G3). Sổ công ty–kỳ tính theo cột này |
| Nhóm giá (chụp)      | `tariff_group`      | `enum TariffGroup`    | Có điều kiện | Hệ thống | `HH_3_PLUS`       | Demo | Có khi loại phí `TARIFF`                                                 |
| Đơn giá tháng (chụp) | `unit_price`        | `money`               | Có           | Hệ thống | 80000             | Demo |                                                                          |
| Số tháng             | `months`            | `int`                 | Có           | Hệ thống | 1                 | Demo | 1 (tháng) hoặc 3 (quý) với `ENV`; 1 với phí khác                         |
| Số tiền | `amount` | `money` | Có | Hệ thống | 80000 | Demo | = đơn giá × số tháng; 0 nếu miễn (R1). Không sửa sau khi phát hành; số thực thu nằm ở `Payment` (G4) |
| Tháng bắt đầu        | `coverage_from`     | `date`                | Có           | Hệ thống | 2026-10-01        | Demo | = `start_date` của kỳ; dùng chặn trùng tháng/quý                         |
| Tháng kết thúc       | `coverage_to`       | `date`                | Có           | Hệ thống | 2026-10-31        | Demo | = `end_date` của kỳ                                                      |
| Hạn đóng | `due_date` | `date` | Có | Hệ thống | 2026-10-25 | Demo | Chép từ phiếu YCT (G16) |
| Trạng thái | `status` | `enum ChargeStatus` | Có | Hệ thống | `UNPAID` | Demo | Còn `UNPAID` khi mới thu một phần (G4). "Quá hạn" không lưu: `UNPAID` và `due_date < hôm nay` |
| Đã thu lúc           | `paid_at`           | `timestamp`           | Không        | Hệ thống |                   | Demo | Gán khi chuyển `PAID`                                                    |


**Enum `ChargeStatus`:** `UNPAID` Chưa thu · `PAID` Đã thu · `EXEMPT` Miễn giảm (hiển thị thêm "Quá hạn" tính từ hạn)

**Khóa/ràng buộc:** `code` duy nhất; không chồng lấn `(subject_id, fee_type_id, daterange(coverage_from, coverage_to))` — exclusion constraint, chặn phát hành trùng kỳ tháng/quý (R2). Kỳ đã khóa thì không sửa.

## 2.4 collection

### CollectorAssignment — Phân tổ cho người đi thu · `collector_assignments` · Phần A

Do công ty lập. Schema nhiều–nhiều: một người đi thu được phụ trách nhiều tổ (O4). **Tạm thời mỗi tổ tối đa 1 người đi thu đang hiệu lực**; quy tắc này kiểm tra ở service, không đặt ràng buộc CSDL, để sau này bỏ dễ.


| Tên hiển thị (VI) | Tên kỹ thuật   | Kiểu         | Bắt buộc | Nguồn    | Ví dụ      | Mức  | Ghi chú                                            |
| ----------------- | -------------- | ------------ | -------- | -------- | ---------- | ---- | -------------------------------------------------- |
| Người đi thu      | `collector_id` | `FK→User`    | Có       | Công ty  | 21         | Demo | User vai trò `COLLECTOR` cùng công ty              |
| Khu vực           | `area_id`      | `FK→Area`    | Có       | Công ty  | 7          | Demo | Phải đang được phân công cho công ty này           |
| Công ty           | `company_id`   | `FK→Company` | Có       | Hệ thống | 1          | Demo | Lấy từ công ty của người lập, không nhận từ client |
| Từ ngày           | `valid_from`   | `date`       | Có       | Công ty  | 2026-10-01 | Demo |                                                    |
| Đến ngày | `valid_to` | `date` | Không | Công ty / Hệ thống |  | Demo | Khi khu vực đổi công ty, backend tự gán bằng ngày kết thúc phân công khu vực của công ty cũ (G14) |
| Ghi chú           | `note`         | `text`       | Không    | Công ty  |            | Demo |                                                    |


**Khóa/ràng buộc:** không trùng lặp cùng `(collector_id, area_id)` chồng hiệu lực. Seed demo 1 người/tổ.

### CollectionVisit — Lượt ghé hộ không thu được · `collection_visits` · Phần A

Kết quả "vắng / hẹn / từ chối". Kết quả "đã thu" là `Payment`, không nằm ở đây.


| Tên hiển thị (VI)    | Tên kỹ thuật        | Kiểu               | Bắt buộc     | Nguồn    | Ví dụ                     | Mức  | Ghi chú                                           |
| -------------------- | ------------------- | ------------------ | ------------ | -------- | ------------------------- | ---- | ------------------------------------------------- |
| Khoản                | `charge_id`         | `FK→Charge`        | Có           | Hệ thống | 900                       | Demo |                                                   |
| Kết quả              | `result`            | `enum VisitResult` | Có           | Công ty  | `ABSENT`                  | Demo |                                                   |
| Thời điểm ghé        | `visited_at`        | `timestamp`        | Có           | Hệ thống | 2026-10-12T17:30:00+07:00 | Demo |                                                   |
| Ngày hẹn lại         | `revisit_date`      | `date`             | Có điều kiện | Công ty  | 2026-10-15                | Demo | Bắt buộc khi `APPOINTMENT`; tùy chọn khi `ABSENT` |
| Ghi chú              | `note`              | `text(500)`        | Không        | Công ty  | Nhà khóa cửa              | Demo |                                                   |
| Người ghi            | `recorded_by`       | `FK→User`          | Có           | Hệ thống | 21                        | Demo | Người đi thu hoặc quản lý công ty ghi thay        |
| Khóa chống gửi trùng | `client_request_id` | `text(40)`         | Có           | Hệ thống | uuid từ client            | Demo | Duy nhất; gửi lại cùng khóa trả về bản ghi cũ     |


**Enum `VisitResult`:** `ABSENT` Vắng nhà · `APPOINTMENT` Đã hẹn · `REFUSED` Từ chối nộp

### Payment — Thanh toán · `payments` · Phần A


| Tên hiển thị (VI)          | Tên kỹ thuật         | Kiểu                 | Bắt buộc     | Nguồn               | Ví dụ                     | Mức  | Ghi chú                                                                                      |
| -------------------------- | -------------------- | -------------------- | ------------ | ------------------- | ------------------------- | ---- | -------------------------------------------------------------------------------------------- |
| Mã xác nhận thanh toán | `code` | `text(30)` | Có | Hệ thống | `TT-1026-000123` | Demo | Duy nhất, **ổn định**. `TT-MMYY-nnnnnn` đếm theo kỳ; kỳ quý `TT-Q426-nnnnnn` (D4, G11). Không gọi là biên lai pháp lý ⚠ O1 |
| Khoản                      | `charge_id`          | `FK→Charge`          | Có           | Hệ thống            | 900                       | Demo |                                                                                              |
| Số tiền | `amount` | `money` | Có | Công ty / Người dân | 80000 | Demo | 0 < số tiền ≤ số còn thiếu của khoản (`Charge.amount` − Σ thanh toán trước); vượt thì 422. Được thu nhiều lần (G4) |
| Hình thức                  | `method`             | `enum PaymentMethod` | Có           | Công ty / Người dân | `CASH`                    | Demo |                                                                                              |
| Thời điểm thu              | `paid_at`            | `timestamp`          | Có           | Hệ thống            | 2026-10-12T17:40:00+07:00 | Demo |                                                                                              |
| Người thu                  | `collector_id`       | `FK→User`            | Có điều kiện | Hệ thống            | 21                        | Demo | Bắt buộc với `CASH`, `TRANSFER`; null với `APP_SIMULATED`. Dùng tính tiền mặt đang giữ (R21) |
| Người xác nhận             | `confirmed_by`       | `FK→User`            | Không        | Hệ thống            | 21                        | Demo | Người bấm ghi nhận (có thể là quản lý công ty ghi thay)                                      |
| Tài khoản người dân        | `citizen_account_id` | `FK→CitizenAccount`  | Có điều kiện | Hệ thống            | 1                         | Demo | Có khi `APP_SIMULATED`. FK thêm ở V18 (Phần B)                                               |
| Số tham chiếu chuyển khoản | `bank_ref`           | `text(50)`           | Không        | Công ty             |                           | Thật |                                                                                              |
| Ghi chú                    | `note`               | `text(500)`          | Không        | Công ty             |                           | Demo |                                                                                              |
| Khóa chống gửi trùng       | `client_request_id`  | `text(40)`           | Có           | Hệ thống            | uuid từ client            | Demo | Duy nhất; gửi 2 lần không tạo 2 thanh toán (SPEC §9.5)                                       |


**Enum `PaymentMethod`:** `CASH` Tiền mặt · `TRANSFER` Chuyển khoản · `APP_SIMULATED` App người dân (mô phỏng)

**Quy tắc:** khoản chuyển `PAID` khi tổng thanh toán = `Charge.amount` (không thể vượt vì bị chặn). "Công ty đã thu" = Σ `Payment.amount` (G4). Hoàn/hủy thanh toán ngoài phạm vi.

### CashHandover — Bàn giao tiền mặt · `cash_handovers` · Phần A

Người đi thu nộp tiền mặt cho công ty. Chuyển khoản vào thẳng tài khoản công ty nên không bàn giao. Không gắn kỳ thu: tiền mặt đang giữ = Σ `Payment` tiền mặt của người đó − Σ đã bàn giao, tính trên mọi kỳ (D5).


| Tên hiển thị (VI) | Tên kỹ thuật    | Kiểu                  | Bắt buộc | Nguồn    | Ví dụ         | Mức  | Ghi chú                                  |
| ----------------- | --------------- | --------------------- | -------- | -------- | ------------- | ---- | ---------------------------------------- |
| Mã bàn giao | `code` | `text(20)` | Có | Hệ thống | `BG-1026-01` | Demo | Duy nhất; `BG-MMYY-nn` theo tháng của ngày bàn giao |
| Người đi thu      | `collector_id`  | `FK→User`             | Có       | Công ty  | 21            | Demo |                                          |
| Công ty           | `company_id`    | `FK→Company`          | Có       | Hệ thống | 1             | Demo |                                          |
| Ngày bàn giao     | `handover_date` | `date`                | Có       | Công ty  | 2026-10-12    | Demo |                                          |
| Số tiền           | `amount`        | `money`               | Có       | Công ty  | 160000        | Demo | 0 &lt; số tiền ≤ tiền mặt đang giữ (R22) |
| Ghi chú           | `note`          | `text(500)`           | Không    | Công ty  | Cuối ca 12/10 | Demo |                                          |
| Người nhận | `received_by` | `FK→User` | Có | Hệ thống | 11 | Demo | Quản lý công ty ghi khi nhận tiền; người đi thu chỉ xem (G5) |


## 2.5 remittance

### CompanyReceipt — Phiếu thu xã lập cho công ty · `company_receipts` · Phần A


| Tên hiển thị (VI) | Tên kỹ thuật   | Kiểu                  | Bắt buộc | Nguồn    | Ví dụ                | Mức  | Ghi chú                                       |
| ----------------- | -------------- | --------------------- | -------- | -------- | -------------------- | ---- | --------------------------------------------- |
| Số phiếu thu | `code` | `text(20)` | Có | Hệ thống | `PT-CT-1026-001` | Demo | Duy nhất; `nnn` đếm theo kỳ. Kỳ quý `PT-CT-Q426-001` (G11) |
| Công ty           | `company_id`   | `FK→Company`          | Có       | Xã       | 1                    | Demo |                                               |
| Kỳ thu            | `period_id`    | `FK→CollectionPeriod` | Có       | Xã       | 5                    | Demo | 1 phiếu 1 kỳ; 1 kỳ nhiều phiếu (R15)          |
| Số tiền           | `amount`       | `money`               | Có       | Xã       | 4200000              | Demo | 0 &lt; số tiền ≤ còn phải nộp (R15)           |
| Hình thức nộp     | `method`       | `enum ReceiptMethod`  | Có       | Xã       | `TRANSFER`           | Demo |                                               |
| Ngày nộp          | `receipt_date` | `date`                | Có       | Xã       | 2026-10-15           | Demo |                                               |
| Người nộp         | `payer_name`   | `text(100)`           | Có       | Công ty  | Trần Văn Mẫu         | Demo | Mặc định đầu mối công ty                      |
| Số chứng từ       | `document_ref` | `text(50)`            | Không    | Xã       | VCB-8839210          | Demo | Mã giao dịch ngân hàng hoặc số phiếu tiền mặt |
| Ghi chú           | `note`         | `text(500)`           | Không    | Xã       | Nộp đợt 1 kỳ 10/2026 | Demo |                                               |
| Trạng thái | `status` | `enum ReceiptStatus` | Có | Hệ thống | `RECORDED` | Demo | Phiếu không sửa, không hủy; phiếu sai thì xã lập phiếu mới, phiếu cũ giữ nguyên (G6) |


**Enum `ReceiptMethod`:** `CASH` Tiền mặt · `TRANSFER` Chuyển khoản
**Enum `ReceiptStatus`:** `RECORDED` Xã đã ghi nhận (giá trị duy nhất trong demo, G6). Nhãn "Đã báo sai sót · chờ xã kiểm tra" tính từ `ReceiptIssue` đang `PENDING`, không lưu.

**Không lưu:** số tiền bằng chữ và lũy kế đã nộp đến phiếu — tính khi in (R29–R30).

### ReceiptIssue — Báo sai sót phiếu thu · `receipt_issues` · Phần A


| Tên hiển thị (VI) | Tên kỹ thuật      | Kiểu                      | Bắt buộc     | Nguồn    | Ví dụ                                 | Mức  | Ghi chú                              |
| ----------------- | ----------------- | ------------------------- | ------------ | -------- | ------------------------------------- | ---- | ------------------------------------ |
| Phiếu thu         | `receipt_id`      | `FK→CompanyReceipt`       | Có           | Công ty  | 30                                    | Demo | Chỉ phiếu của công ty mình           |
| Loại sai sót      | `issue_type`      | `enum ReceiptIssueType`   | Có           | Công ty  | `WRONG_AMOUNT`                        | Demo |                                      |
| Số tiền đúng      | `correct_amount`  | `money`                   | Không        | Công ty  | 4500000                               | Demo | Nên nhập khi `WRONG_AMOUNT`          |
| Mô tả             | `description`     | `text(1000)`              | Có           | Công ty  | Chuyển 4,5 triệu, phiếu ghi 4,2 triệu | Demo |                                      |
| Trạng thái        | `status`          | `enum ReceiptIssueStatus` | Có           | Hệ thống | `PENDING`                             | Demo |                                      |
| Người báo         | `reported_by`     | `FK→User`                 | Có           | Hệ thống | 11                                    | Demo |                                      |
| Người xử lý       | `resolved_by`     | `FK→User`                 | Không        | Hệ thống | 3                                     | Demo |                                      |
| Xử lý lúc         | `resolved_at`     | `timestamp`               | Không        | Hệ thống |                                       | Demo |                                      |
| Kết quả xử lý | `resolution_note` | `text(1000)` | Có điều kiện | Xã | Đã kiểm tra sao kê, phiếu đúng | Demo | Bắt buộc khi chuyển `RESOLVED`. "Đã xử lý" = đóng kèm ghi chú, không sửa phiếu (G6) |


**Enum `ReceiptIssueType`:** `WRONG_AMOUNT` Sai số tiền · `WRONG_PERIOD` Sai kỳ thu · `WRONG_DOCUMENT` Sai chứng từ · `NOT_OURS` Không phải khoản nộp của công ty
**Enum `ReceiptIssueStatus`:** `PENDING` Chờ xã kiểm tra · `RESOLVED` Đã xử lý

### PaymentReminder — Nhắc nộp · `payment_reminders` · Phần A

Chỉ lập cho công ty có nợ quá hạn (R16).


| Tên hiển thị (VI)   | Tên kỹ thuật    | Kiểu                       | Bắt buộc | Nguồn    | Ví dụ                             | Mức  | Ghi chú                                                     |
| ------------------- | --------------- | -------------------------- | -------- | -------- | --------------------------------- | ---- | ----------------------------------------------------------- |
| Mã nhắc nộp         | `code`          | `text(20)`                 | Có       | Hệ thống | `NN-001`                          | Demo | Duy nhất                                                    |
| Công ty             | `company_id`    | `FK→Company`               | Có       | Xã       | 1                                 | Demo |                                                             |
| Ngày nhắc           | `reminder_date` | `date`                     | Có       | Hệ thống | 2026-11-03                        | Demo |                                                             |
| Hạn nộp mới         | `due_date`      | `date`                     | Có       | Xã       | 2026-11-08                        | Demo | Mặc định ngày nhắc + 5 (R16)                                |
| Các kỳ nợ           | `periods`       | `list FK→CollectionPeriod` | Có       | Xã       | 2026-09, 2026-10                  | Demo | Bảng nối `payment_reminder_periods(reminder_id, period_id)` |
| Số tiền nhắc (chụp) | `amount`        | `money`                    | Có       | Hệ thống | 12500000                          | Demo | Tổng còn phải nộp các kỳ chọn tại lúc nhắc                  |
| Nội dung            | `content`       | `text(2000)`               | Có       | Xã       | Đề nghị công ty nộp số còn thiếu… | Demo |                                                             |


**Khóa/ràng buộc:** `code` duy nhất. Không xóa khi công ty hết nợ (prototype xóa); màn hình hiển thị "Đã hết nợ" tính từ sổ công ty–kỳ (D6).

---

## 3. Phần B

## 3.1 notifications

### Notification — Thông báo · `notifications` · Phần B


| Tên hiển thị (VI) | Tên kỹ thuật           | Kiểu                    | Bắt buộc     | Nguồn    | Ví dụ                                                      | Mức  | Ghi chú                                   |
| ----------------- | ---------------------- | ----------------------- | ------------ | -------- | ---------------------------------------------------------- | ---- | ----------------------------------------- |
| Kiểu người nhận   | `recipient_type`       | `enum RecipientType`    | Có           | Hệ thống | `COMPANY`                                                  | Demo |                                           |
| Vai trò nhận      | `recipient_role`       | `enum Role`             | Có điều kiện | Hệ thống | `COMPANY_MANAGER`                                          | Demo | Có khi `ROLE` hoặc `COMPANY`              |
| Công ty nhận      | `recipient_company_id` | `FK→Company`            | Có điều kiện | Hệ thống | 1                                                          | Demo | Có khi `COMPANY`; công ty khác không thấy |
| Người dùng nhận   | `recipient_user_id`    | `FK→User`               | Có điều kiện | Hệ thống | 21                                                         | Demo | Có khi `USER`                             |
| Người dân nhận    | `recipient_citizen_id` | `FK→CitizenAccount`     | Có điều kiện | Hệ thống | 1                                                          | Demo | Có khi `CITIZEN`                          |
| Loại              | `kind`                 | `enum NotificationKind` | Có           | Hệ thống | `REMINDER`                                                 | Demo |                                           |
| Tiêu đề           | `title`                | `text(200)`             | Có           | Hệ thống | Nhắc nộp tiền kỳ 10/2026                                   | Demo |                                           |
| Nội dung          | `body`                 | `text(2000)`            | Có           | Hệ thống |                                                            | Demo |                                           |
| Liên kết          | `link`                 | `json`                  | Không        | Hệ thống | `{"screen":"remittance.receipts","params":{"periodId":5}}` | Demo | Đích điều hướng; không chứa URL tuyệt đối |
| Đọc lúc | `read_at` | `timestamp` | Không | Hệ thống |  | Demo | Null = chưa đọc. Đọc chung trên bản ghi: một người đọc thì cả nhóm nhận thấy đã đọc (D7) |


**Enum `RecipientType`:** `ROLE` Theo vai trò · `COMPANY` Theo công ty · `USER` Một người dùng · `CITIZEN` Một người dân
**Enum `NotificationKind`:** `REMINDER` Nhắc nộp · `COMPLAINT` Khiếu nại · `RECEIPT` Phiếu thu · `INFO` Thông tin · `TRANSACTION` Giao dịch

Không có `updated_by`, `version` (bản ghi chỉ đổi `read_at`).

## 3.2 complaints

### Complaint — Khiếu nại / phản ánh · `complaints` · Phần B


| Tên hiển thị (VI)   | Tên kỹ thuật           | Kiểu                     | Bắt buộc     | Nguồn          | Ví dụ                         | Mức  | Ghi chú                                                            |
| ------------------- | ---------------------- | ------------------------ | ------------ | -------------- | ----------------------------- | ---- | ------------------------------------------------------------------ |
| Mã khiếu nại | `code` | `text(20)` | Có | Hệ thống | `KN-1026-001` | Demo | Duy nhất; `KN-MMYY-nnn`, một mã chung cho web và app (D8) |
| Ngày tiếp nhận      | `received_date`        | `date`                   | Có           | Hệ thống       | 2026-10-14                    | Demo |                                                                    |
| Người gửi           | `complainant_name`     | `text(100)`              | Có           | Người dân / Xã | Nguyễn Văn Mẫu                | Demo | Xã nhập khi nhận qua điện thoại/trực tiếp                          |
| SĐT người gửi       | `complainant_phone`    | `text(15)`               | Không        | Người dân / Xã | 0900000128                    | Demo |                                                                    |
| Tài khoản người dân | `citizen_account_id`   | `FK→CitizenAccount`      | Có điều kiện | Hệ thống       | 1                             | Demo | Có khi kênh `APP`                                                  |
| Đối tượng liên quan | `subject_id`           | `FK→ServiceSubject`      | Không        | Xã / Hệ thống  | 128                           | Demo | Liên kết mềm: người gửi có thể không phải hộ đã đăng ký            |
| Khu vực | `area_id` | `FK→Area` | Có | Người dân / Xã | 7 | Demo | Công ty chỉ thấy khiếu nại đã được chuyển cho mình, không thấy theo khu vực (G12) |
| Kênh                | `channel`              | `enum ComplaintChannel`  | Có           | Hệ thống / Xã  | `APP`                         | Demo |                                                                    |
| Loại                | `category`             | `enum ComplaintCategory` | Có           | Người dân / Xã | `LATE_COLLECTION`             | Demo |                                                                    |
| Tóm tắt             | `summary`              | `text(200)`              | Có           | Người dân / Xã | Tổ 5 chưa được thu gom 2 ngày | Demo |                                                                    |
| Nội dung            | `content`              | `text(4000)`             | Có           | Người dân / Xã |                               | Demo |                                                                    |
| Trạng thái          | `status`               | `enum ComplaintStatus`   | Có           | Hệ thống       | `NEW`                         | Demo | "Quá hạn xử lý" không lưu: chưa `RESOLVED` và `deadline < hôm nay` |
| Công ty được chuyển | `forwarded_company_id` | `FK→Company`             | Không        | Xã             | 1                             | Demo |                                                                    |
| Hạn xử lý           | `deadline`             | `date`                   | Không        | Hệ thống       | 2026-10-17                    | Demo | Ngày chuyển công ty + 3 ngày (R24–R27)                             |
| Kết quả cuối        | `resolution`           | `text(2000)`             | Có điều kiện | Xã             | Đã bổ sung chuyến thu gom     | Demo | Bắt buộc khi `RESOLVED`; nội dung đầy đủ ở `ComplaintEvent`        |
| Đóng lúc            | `resolved_at`          | `timestamp`              | Không        | Hệ thống       |                               | Demo |                                                                    |
| Ảnh đính kèm        | `photo_urls`           | `text` (danh sách)       | Không        | Người dân      |                               | Thật |                                                                    |
| Vị trí              | `location`             | `text(100)`              | Không        | Người dân      | 10.8712,106.6401              | Thật | App prototype có "vị trí tự động"                                  |


**Enum `ComplaintChannel`:** `APP` Ứng dụng người dân · `PHONE` Điện thoại · `IN_PERSON` Trực tiếp tại xã
**Enum `ComplaintCategory`:** `LATE_COLLECTION` Thu gom chậm hoặc không đúng lịch · `OVERCHARGE` Thu phí cao hơn định mức · `POLLUTION_POINT` Điểm tập kết gây ô nhiễm · `STAFF_ATTITUDE` Thái độ nhân viên thu gom · `OTHER` Vấn đề khác
**Enum `ComplaintStatus`:** `NEW` Mới → `PROCESSING` Đang xử lý → `RESOLVED` Đã giải quyết

### ComplaintEvent — Mốc xử lý khiếu nại · `complaint_events` · Phần B

Timeline lưu nối tiếp, không ghi đè. Không có `updated_at`, `updated_by`, `version`.


| Tên hiển thị (VI)            | Tên kỹ thuật         | Kiểu                      | Bắt buộc     | Nguồn                    | Ví dụ                                      | Mức  | Ghi chú                               |
| ---------------------------- | -------------------- | ------------------------- | ------------ | ------------------------ | ------------------------------------------ | ---- | ------------------------------------- |
| Khiếu nại                    | `complaint_id`       | `FK→Complaint`            | Có           | Hệ thống                 | 40                                         | Demo |                                       |
| Loại mốc                     | `event_type`         | `enum ComplaintEventType` | Có           | Hệ thống                 | `FORWARDED`                                | Demo |                                       |
| Thời điểm                    | `occurred_at`        | `timestamp`               | Có           | Hệ thống                 | 2026-10-14T09:40:00+07:00                  | Demo |                                       |
| Người thực hiện              | `actor_user_id`      | `FK→User`                 | Không        | Hệ thống                 | 3                                          | Demo | Null khi người dân gửi                |
| Người dân thực hiện          | `actor_citizen_id`   | `FK→CitizenAccount`       | Không        | Hệ thống                 | 1                                          | Demo |                                       |
| Tên hiển thị người thực hiện | `actor_label`        | `text(100)`               | Có           | Hệ thống                 | Cán bộ xã                                  | Demo | Chụp lại cho timeline app             |
| Công ty liên quan            | `company_id`         | `FK→Company`              | Có điều kiện | Hệ thống                 | 1                                          | Demo | Có khi `FORWARDED`, `COMPANY_REPLIED` |
| Nội dung                     | `content`            | `text(2000)`              | Có           | Xã / Công ty / Người dân | Công ty xác nhận bổ sung chuyến trong ngày | Demo |                                       |
| Người dân được xem           | `visible_to_citizen` | `bool`                    | Có           | Hệ thống                 | true                                       | Thật | Demo mặc định true                    |


**Enum `ComplaintEventType`:** `SUBMITTED` Gửi khiếu nại · `RECEIVED` Xã tiếp nhận · `FORWARDED` Chuyển công ty · `COMPANY_REPLIED` Công ty phản hồi · `CLOSED` Đã giải quyết

## 3.3 master-data (lịch)

### CollectionSchedule — Lịch thu gom · `collection_schedules` · Phần B


| Tên hiển thị (VI) | Tên kỹ thuật    | Kiểu             | Bắt buộc | Nguồn   | Ví dụ             | Mức  | Ghi chú                                                     |
| ----------------- | --------------- | ---------------- | -------- | ------- | ----------------- | ---- | ----------------------------------------------------------- |
| Khu vực           | `area_id`       | `FK→Area`        | Có       | Công ty | 7                 | Demo | Công ty thực hiện lấy từ `AreaAssignment`                   |
| Thứ               | `weekday`       | `int`            | Có       | Công ty | 7                 | Demo | 1 = Thứ 2 … 7 = Chủ nhật (ISO)                              |
| Tuần trong tháng  | `week_of_month` | `int`            | Không    | Công ty | 1                 | Demo | Null = hằng tuần; 1 = tuần đầu tháng ("Chủ nhật đầu tháng") |
| Giờ bắt đầu       | `start_time`    | `time`           | Có       | Công ty | 17:00             | Demo |                                                             |
| Giờ kết thúc      | `end_time`      | `time`           | Có       | Công ty | 19:00             | Demo | `> start_time`                                              |
| Loại rác          | `waste_type`    | `enum WasteType` | Có       | Công ty | `HOUSEHOLD`       | Demo |                                                             |
| Ghi chú           | `note`          | `text(255)`      | Không    | Công ty | Chỉ hộ đã đăng ký | Demo |                                                             |


**Enum `WasteType`:** `HOUSEHOLD` Rác sinh hoạt · `HOUSEHOLD_RECYCLABLE` Rác sinh hoạt + tái chế · `BULKY` Rác cồng kềnh (đã đăng ký)

## 3.4 citizen-app

### CitizenAccount — Tài khoản người dân · `citizen_accounts` · Phần B


| Tên hiển thị (VI)  | Tên kỹ thuật    | Kiểu                | Bắt buộc | Nguồn     | Ví dụ          | Mức  | Ghi chú                                                 |
| ------------------ | --------------- | ------------------- | -------- | --------- | -------------- | ---- | ------------------------------------------------------- |
| Số điện thoại      | `phone`         | `text(15)`          | Có       | Người dân | 0900000128     | Demo | Duy nhất; đăng nhập bằng SĐT + OTP cố định (O7)       |
| Đối tượng | `subject_id` | `FK→ServiceSubject` | Có | Hệ thống | 128 | Demo | Một SĐT ↔ một hộ; một hộ có thể có nhiều tài khoản (nhiều thành viên) (D11) |
| Tên hiển thị       | `display_name`  | `text(100)`         | Có       | Người dân | Nguyễn Văn Mẫu | Demo |                                                         |
| Trạng thái         | `status`        | `enum UserStatus`   | Có       | Hệ thống  | `ACTIVE`       | Demo |                                                         |
| Đăng nhập lần cuối | `last_login_at` | `timestamp`         | Không    | Hệ thống  |                | Thật |                                                         |


### MarketPost — Bài đăng chợ đồ cũ · `market_posts` · Phần B


| Tên hiển thị (VI) | Tên kỹ thuật      | Kiểu                    | Bắt buộc | Nguồn     | Ví dụ                       | Mức  | Ghi chú                            |
| ----------------- | ----------------- | ----------------------- | -------- | --------- | --------------------------- | ---- | ---------------------------------- |
| Mã bài            | `code`            | `text(20)`              | Có       | Hệ thống  | `CDC-041`                   | Demo | Duy nhất                           |
| Người đăng        | `author_id`       | `FK→CitizenAccount`     | Có       | Hệ thống  | 1                           | Demo | Hiển thị "tên · tổ"                |
| Tiêu đề           | `title`           | `text(150)`             | Có       | Người dân | Ghế sofa 3 chỗ còn dùng tốt | Demo |                                    |
| Hình thức         | `post_type`       | `enum MarketPostType`   | Có       | Người dân | `GIVE`                      | Demo |                                    |
| Mô tả             | `description`     | `text(2000)`            | Có       | Người dân |                             | Demo |                                    |
| Ảnh               | `photo_urls`      | `text` (danh sách)      | Không    | Người dân |                             | Demo | Có thể dùng ảnh mẫu tĩnh (plan C5) |
| Nơi nhận          | `pickup_location` | `text(255)`             | Không    | Người dân | Hẻm 12, Tổ 5                | Demo |                                    |
| Trạng thái | `status` | `enum MarketPostStatus` | Có | Hệ thống | `OPEN` | Demo | Người đăng tự đóng; không kiểm duyệt (D9, O6) |


**Enum `MarketPostType`:** `GIVE` Cho tặng · `EXCHANGE` Trao đổi
**Enum `MarketPostStatus`** (D9): `OPEN` Đang đăng · `CLOSED` Đã cho/đổi xong

### MarketComment — Bình luận chợ đồ cũ · `market_comments` · Phần B


| Tên hiển thị (VI) | Tên kỹ thuật | Kiểu                | Bắt buộc | Nguồn     | Ví dụ          | Mức  | Ghi chú                        |
| ----------------- | ------------ | ------------------- | -------- | --------- | -------------- | ---- | ------------------------------ |
| Bài đăng          | `post_id`    | `FK→MarketPost`     | Có       | Hệ thống  | 41             | Demo |                                |
| Người bình luận   | `author_id`  | `FK→CitizenAccount` | Có       | Hệ thống  | 2              | Demo |                                |
| Nội dung          | `content`    | `text(1000)`        | Có       | Người dân | Còn không chị? | Demo | Có thể cắt khỏi demo (plan C4) |


### BulkyWasteRequest — Đăng ký thu gom rác cồng kềnh · `bulky_waste_requests` · Phần B


| Tên hiển thị (VI)   | Tên kỹ thuật         | Kiểu                 | Bắt buộc     | Nguồn               | Ví dụ                   | Mức  | Ghi chú                                              |
| ------------------- | -------------------- | -------------------- | ------------ | ------------------- | ----------------------- | ---- | ---------------------------------------------------- |
| Mã yêu cầu          | `code`               | `text(20)`           | Có           | Hệ thống            | `CK-1026-006`           | Demo | Duy nhất                                             |
| Tài khoản người dân | `citizen_account_id` | `FK→CitizenAccount`  | Có           | Hệ thống            | 1                       | Demo |                                                      |
| Đối tượng           | `subject_id`         | `FK→ServiceSubject`  | Có           | Hệ thống            | 128                     | Demo | Lấy từ tài khoản                                     |
| Loại vật dụng       | `item_type`          | `enum BulkyItemType` | Có           | Người dân           | `FURNITURE`             | Demo |                                                      |
| Mô tả vật dụng      | `item_description`   | `text(255)`          | Không        | Người dân           | Nệm cũ 1m6 + 2 ghế hỏng | Demo |                                                      |
| Số lượng            | `quantity`           | `int`                | Có           | Người dân           | 2                       | Demo | ≥ 1                                                  |
| Địa chỉ thu gom     | `address`            | `text(255)`          | Có           | Người dân           | 12/5 đường Số 1         | Demo | Mặc định địa chỉ hộ                                  |
| Ngày mong muốn      | `preferred_date`     | `date`               | Có           | Người dân           | 2026-10-18              | Demo |                                                      |
| Buổi mong muốn      | `preferred_slot`     | `enum DaySlot`       | Không        | Người dân           | `MORNING`               | Thật |                                                      |
| Ảnh                 | `photo_urls`         | `text` (danh sách)   | Không        | Người dân           |                         | Demo | Có thể dùng ảnh mẫu (plan C5)                        |
| Công ty phụ trách   | `company_id`         | `FK→Company`         | Có           | Hệ thống            | 1                       | Demo | Theo phân công khu vực của hộ tại ngày đăng ký       |
| Phí công ty báo | `quoted_fee` | `money` | Có điều kiện | Công ty | 200000 | Demo | Bắt buộc khi `QUOTED`. Không sinh `Charge`, không nộp về xã (O5, G13) |
| Báo phí lúc         | `quoted_at`          | `timestamp`          | Không        | Hệ thống            |                         | Demo |                                                      |
| Ngày hẹn thu gom    | `scheduled_date`     | `date`               | Không        | Công ty             | 2026-10-18              | Demo |                                                      |
| Trạng thái          | `status`             | `enum BulkyStatus`   | Có           | Hệ thống            | `PENDING`               | Demo |                                                      |
| Thu gom lúc         | `collected_at`       | `timestamp`          | Không        | Hệ thống            |                         | Demo |                                                      |
| Lý do hủy           | `cancel_reason`      | `text(255)`          | Có điều kiện | Người dân / Công ty |                         | Demo | Bắt buộc khi `CANCELLED`                             |


**Enum `BulkyItemType`:** `MATTRESS` Nệm, chăn ga khối lớn · `FURNITURE` Tủ, bàn, ghế, sofa · `LARGE_APPLIANCE` Thiết bị điện lớn (tủ lạnh, máy giặt) · `DEBRIS` Xà bần, cành cây lớn
**Enum `DaySlot`:** `MORNING` Buổi sáng · `AFTERNOON` Buổi chiều
**Enum `BulkyStatus`:** `PENDING` Chờ xác nhận → `QUOTED` Đã báo phí → `COLLECTED` Đã thu gom; `CANCELLED` Hủy (từ `PENDING` hoặc `QUOTED`)

---

## 4. Đối chiếu prototype

Đối chiếu từng mục của `docs/reference/prototype-inventory.md` §0–§1. "→" là nơi trường nằm trong data dictionary; "bỏ" kèm lý do.

### 4.0 Dữ liệu cũ (inventory §0)


| Prototype                               | Đối chiếu                                                                                                                    |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `MANAGEMENT_UNITS` (11 công ty)         | → `Company`; seed dùng mã DV01–DV11, **tên giả** thay tên trong prototype nếu tên đó là tên thật (⚠ kiểm tra khi seed ở T09) |
| `MANAGEMENT_AREAS` KV01–KV24, start/end | → `Area` + `AreaAssignment.valid_from/valid_to`                                                                              |
| `area.unit` (KV24 chưa phân công)       | → không có `AreaAssignment` cho KV24 trong seed                                                                              |
| `data.js` users, tariffVersions, audit  | → `User`, `TariffVersion`/`TariffRate`, `AuditLog` (xem 4.5, 4.18)                                                           |
| Phân công sau khi nạp (DV01→KV07,KV09…) | → seed `AreaAssignment` giữ nguyên danh sách này                                                                             |


### 4.1 Công ty — `MANAGEMENT_UNITS`


| Trường prototype | Đối chiếu                                |
| ---------------- | ---------------------------------------- |
| id               | → `Company.code`                         |
| name             | → `Company.name`                         |
| contact          | → `Company.contact_name`                 |
| phone            | → `Company.contact_phone`                |
| status           | → `Company.status` (`ACTIVE`/`INACTIVE`) |
| start, end       | → `Company.valid_from`, `valid_to`       |


### 4.2 Khu vực — `MANAGEMENT_AREAS`


| Trường prototype                    | Đối chiếu                                                       |
| ----------------------------------- | --------------------------------------------------------------- |
| id                                  | → `Area.code`                                                   |
| name                                | → `Area.name`                                                   |
| households                          | bỏ — dẫn xuất, tính bằng truy vấn đếm `ServiceSubject` `ACTIVE` |
| unit                                | → `AreaAssignment.company_id` (không lưu trên `Area`)           |
| start, end                          | → `AreaAssignment.valid_from`, `valid_to`, có lịch sử           |
| Địa bàn suy từ tiền tố mã đối tượng | → `Area.district_id` (D2) |


### 4.3 Đối tượng — `CS_SUBJECTS`


| Trường prototype     | Đối chiếu                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| code                 | → `ServiceSubject.code`                                                                                         |
| name                 | → `ServiceSubject.name`                                                                                         |
| type                 | → `ServiceSubject.subject_type`                                                                                 |
| address              | → `ServiceSubject.address`                                                                                      |
| phone                | → `ServiceSubject.phone`                                                                                        |
| area                 | → `ServiceSubject.area_id`                                                                                      |
| contract | → `ServiceContract.contract_no` (tách bảng, hệ thống tự sinh số đăng ký `ĐK-…`, D10); "—" = không có đăng ký |
| contractFrom         | → `ServiceContract.valid_from`                                                                                  |
| tariff               | → `ServiceContract.tariff_group`                                                                                |
| status               | → `ServiceSubject.status`                                                                                       |
| exempt, exemptReason | → `ServiceContract.exempt`, `exempt_reason` (chuyển sang hợp đồng vì miễn gắn với hợp đồng/kỳ; UI hiển thị gộp) |
| note                 | → `ServiceSubject.note`                                                                                         |


### 4.4 Nhóm giá — `CS_TARIFFS`


| Trường prototype   | Đối chiếu                                                                   |
| ------------------ | --------------------------------------------------------------------------- |
| 4 nhóm + giá/tháng | → `enum TariffGroup` (D3) + `TariffRate.monthly_total` theo phiên bản |


### 4.5 Phiên bản biểu giá — `RS_TARIFFS`


| Trường prototype                    | Đối chiếu                                                                                                       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| code (BG-65-G2-H3, mỗi nhóm một mã) | → `TariffVersion.code` (một mã cho cả phiên bản) + `TariffRate` (mỗi nhóm một dòng)                             |
| legal                               | → `TariffVersion.legal_basis`                                                                                   |
| scope                               | → `TariffVersion.scope_note` + `TariffRate.tariff_group`                                                        |
| collection / transport / processing | → `TariffRate.collection_fee` / `processing_fee` (tiền số); vận chuyển bỏ — biểu giá chỉ 2 thành phần (G9); "Theo định mức" bỏ |
| effective                           | → `TariffVersion.valid_from`, `valid_to`                                                                        |
| status                              | → `TariffVersion.status`                                                                                        |
| Không liên kết với giá tính tiền    | bỏ hành vi — giá tính tiền lấy từ `TariffRate` của phiên bản gắn kỳ                                             |


### 4.6 Loại phí — `CS_FEE_TYPES`


| Trường prototype              | Đối chiếu                                  |
| ----------------------------- | ------------------------------------------ |
| id (env/bulky/extra)          | → `FeeType.code` (`ENV`/`EXTRA`); `bulky` bỏ (G13)   |
| name                          | → `FeeType.name`                           |
| price (null / 150000 / 50000) | → `FeeType.pricing_mode` + `default_price` |


### 4.7 Kỳ thu — `CS_PERIODS`


| Trường prototype | Đối chiếu                                                                |
| ---------------- | ------------------------------------------------------------------------ |
| id               | → `CollectionPeriod.code`                                                |
| label            | → `CollectionPeriod.label`                                               |
| open             | → `CollectionPeriod.open_date`                                           |
| due              | → `CollectionPeriod.due_date`                                            |
| legal            | → qua `CollectionPeriod.tariff_version_id` → `TariffVersion.legal_basis` |
| status           | → `CollectionPeriod.status`                                              |
| note             | → `CollectionPeriod.note`                                                |


### 4.8 Phiếu yêu cầu thu — `CS_REQUESTS`


| Trường prototype        | Đối chiếu                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| id                      | → `ChargeRequest.code`                                            |
| period                  | → `ChargeRequest.period_id`                                       |
| feeType                 | → `ChargeRequest.fee_type_id`                                     |
| scope (chuỗi tự do)     | → `scope_type` + `scope_areas` + `scope_company_id` (có cấu trúc) |
| date                    | → `ChargeRequest.issue_date`                                      |
| due                     | → `ChargeRequest.due_date`                                        |
| count, exempt, total    | bỏ — dẫn xuất, tính từ `Charge`                                   |
| note                    | → `ChargeRequest.note`                                            |
| (giá nhập của phí khác) | → `ChargeRequest.unit_price`                                      |


### 4.9 Khoản phải thu — `CS_CHARGES`


| Trường prototype                 | Đối chiếu                                                            |
| -------------------------------- | -------------------------------------------------------------------- |
| id                               | → `Charge.code`                                                      |
| request                          | → `Charge.charge_request_id`                                         |
| feeType                          | → `Charge.fee_type_id`                                               |
| subject                          | → `Charge.subject_id` (+ `contract_id`, `area_id` chụp)              |
| period                           | → `Charge.period_id` (+ `coverage_from/to`)                          |
| due                              | → `Charge.due_date`                                                  |
| amount (người thu có thể ghi đè) | → `Charge.amount` cố định; số thực thu (được thu một phần) nằm ở `Payment.amount` (G4) |
| status unpaid/paid/exempt        | → `Charge.status`                                                    |
| status overdue                   | bỏ — không lưu, tính từ `due_date`                                   |
| paidAt                           | → `Charge.paid_at` (+ `Payment.paid_at`)                             |
| method                           | → `Payment.method`                                                   |
| note                             | → `Payment.note` / `CollectionVisit.note`                            |


### 4.10 Phiếu thu xã lập — `CS_COMPANY_RECEIPTS`


| Trường prototype   | Đối chiếu                            |
| ------------------ | ------------------------------------ |
| id                 | → `CompanyReceipt.code`              |
| companyId          | → `CompanyReceipt.company_id`        |
| period             | → `CompanyReceipt.period_id`         |
| amount             | → `CompanyReceipt.amount`            |
| method             | → `CompanyReceipt.method`            |
| date               | → `CompanyReceipt.receipt_date`      |
| payer              | → `CompanyReceipt.payer_name`        |
| bankRef            | → `CompanyReceipt.document_ref`      |
| note               | → `CompanyReceipt.note`              |
| status (completed) | → `CompanyReceipt.status` `RECORDED` |


### 4.11 Báo sai sót phiếu thu — `RS_RECEIPT_ISSUES`


| Trường prototype     | Đối chiếu                                                        |
| -------------------- | ---------------------------------------------------------------- |
| receiptId (khóa map) | → `ReceiptIssue.receipt_id`                                      |
| text: loại           | → `ReceiptIssue.issue_type`                                      |
| text: số đúng        | → `ReceiptIssue.correct_amount`                                  |
| text: ghi chú        | → `ReceiptIssue.description`                                     |
| (không có màn xử lý) | → thêm `status`, `resolved_by`, `resolved_at`, `resolution_note` |


### 4.12 Nhắc nộp — `CS_REMINDERS`


| Trường prototype    | Đối chiếu                                 |
| ------------------- | ----------------------------------------- |
| id                  | → `PaymentReminder.code`                  |
| companyId           | → `PaymentReminder.company_id`            |
| date                | → `PaymentReminder.reminder_date`         |
| due                 | → `PaymentReminder.due_date`              |
| periods (mảng nhãn) | → `PaymentReminder.periods` (bảng nối FK) |
| amount              | → `PaymentReminder.amount`                |
| content             | → `PaymentReminder.content`               |
| Xóa khi hết nợ | bỏ — giữ lịch sử, hiển thị "Đã hết nợ" (D6) |


### 4.13 Khiếu nại — `CS_COMPLAINTS`


| Trường prototype           | Đối chiếu                                                                        |
| -------------------------- | -------------------------------------------------------------------------------- |
| id | → `Complaint.code` `KN-MMYY-nnn` (D8) |
| date                       | → `Complaint.received_date`                                                      |
| name                       | → `Complaint.complainant_name`                                                   |
| subject (FK mềm)           | → `Complaint.subject_id` (không bắt buộc)                                        |
| phone                      | → `Complaint.complainant_phone`                                                  |
| area                       | → `Complaint.area_id`                                                            |
| channel                    | → `Complaint.channel`                                                            |
| content                    | → `Complaint.content` (+ `summary`, `category` từ app)                           |
| status new/processing/done | → `Complaint.status` `NEW`/`PROCESSING`/`RESOLVED`                               |
| "Quá hạn xử lý"            | bỏ — dẫn xuất từ `deadline`                                                      |
| result (ghi đè)            | → `Complaint.resolution` (kết quả cuối) + mỗi bước là một `ComplaintEvent`       |
| forwardedTo                | → `Complaint.forwarded_company_id` + `ComplaintEvent` `FORWARDED`                |
| deadline                   | → `Complaint.deadline`                                                           |
| reply {by, date}           | → `ComplaintEvent` `COMPANY_REPLIED` (`actor_user_id`, `occurred_at`, `content`) |


### 4.14 Dòng hộ–kỳ phía công ty — `rsRows()`


| Trường prototype                         | Đối chiếu                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| (phép chiếu của `CS_CHARGES`)            | bỏ — không phải entity; API trả view tính từ `Charge` + `Payment` + `CollectionVisit` |
| status thăm hộ (appointment/absent)      | → `CollectionVisit.result` (lượt gần nhất)                                            |
| collector                                | → `CollectorAssignment` (người được phân) / `Payment.collector_id` (người đã thu)     |
| confirmedBy                              | → `Payment.confirmed_by`                                                              |
| receipt `BL-MMYY-nnnn` (sinh khi render) | → `Payment.code` ổn định `TT-MMYY-nnnnnn` (D4); tính pháp lý ⚠ O1 |


### 4.15 Người đi thu — `RS_COLLECTORS`


| Trường prototype                | Đối chiếu                                           |
| ------------------------------- | --------------------------------------------------- |
| username                        | → `User.username` (vai trò `COLLECTOR`)             |
| name                            | → `User.full_name`                                  |
| area (chuỗi tên tổ, 1 người/tổ) | → `CollectorAssignment.area_id` (nhiều–nhiều; tạm 1 người/tổ, O4) |
| phone                           | → `User.phone`                                      |


### 4.16 Bàn giao tiền mặt — `RS_HANDOVERS`


| Trường prototype | Đối chiếu                         |
| ---------------- | --------------------------------- |
| id               | → `CashHandover.code`             |
| collector        | → `CashHandover.collector_id`     |
| period | bỏ — tiền mặt đang giữ tính trên mọi kỳ (D5) |
| date             | → `CashHandover.handover_date`    |
| amount           | → `CashHandover.amount`           |
| note             | → `CashHandover.note`             |


### 4.17 Thông báo web — `APP_NOTIFICATIONS`


| Trường prototype                      | Đối chiếu                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| id                                    | → `Notification.id`                                                                                                              |
| roles\[\]                             | → `recipient_type` `ROLE` + `recipient_role`; nhiều vai trò = nhiều bản ghi                                                      |
| companyId                             | → `recipient_type` `COMPANY` + `recipient_company_id`                                                                            |
| kind                                  | → `Notification.kind`                                                                                                            |
| title                                 | → `Notification.title`                                                                                                           |
| body                                  | → `Notification.body`                                                                                                            |
| link {role, screen, companyId, label} | → `Notification.link` (json: `screen`, `params`); `role` bỏ — suy từ người nhận; `label` bỏ — frontend tự đặt nhãn theo `screen` |
| time                                  | → `Notification.created_at`                                                                                                      |
| read | → `Notification.read_at` (đọc chung, D7) |


### 4.18 Quản trị


| Trường prototype                                   | Đối chiếu                                                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RS_USERS.username`                                | → `User.username`                                                                                                                                             |
| `RS_USERS.name`                                    | → `User.full_name`                                                                                                                                            |
| `RS_USERS.organization` (chuỗi)                    | → `User.organization` (hiển thị) + `User.company_id` (phạm vi)                                                                                                |
| `RS_USERS.roles` (1 chuỗi)                         | → `User.role`                                                                                                                                                 |
| `RS_USERS.lastLogin`                               | → `User.last_login_at`                                                                                                                                        |
| `RS_USERS.status` Hoạt động / Đã khóa              | → `User.status`                                                                                                                                               |
| `RS_USERS.status` Bắt buộc 2FA                     | bỏ — 2FA ngoài phạm vi 4 tuần                                                                                                                                 |
| `RS_ROLES` (name, scope, functions, perms) | bỏ — vai trò cố định bằng enum `Role` (4 vai trò nội bộ; người dân dùng `CitizenAccount`, G8), quyền cài trong code backend; màn vai trò (nếu có) chỉ hiển thị tĩnh. Vai trò Kế toán và Lãnh đạo bỏ theo intent 23/09 |
| `RS_DISTRICTS.code`, `name`, `note`                | → `District.code`, `name`, `note`                                                                                                                             |
| `RS_DISTRICTS.groups`, `subjects`                  | bỏ — dẫn xuất, đếm `Area` và `ServiceSubject`                                                                                                                 |
| `RS_BACKUPS`                                       | bỏ — sao lưu là việc vận hành CSDL, không phải dữ liệu nghiệp vụ                                                                                              |
| `APP_DATA.audit` time, actor, role, action, object | → `AuditLog.occurred_at`, `actor_username`, `actor_role`, `action`, `entity_type`/`entity_id`                                                                 |
| `APP_DATA.audit` result                            | bỏ — chỉ ghi thao tác thành công (audit rollback cùng transaction, T07)                                                                                       |
| `APP_DATA.paymentFlows`, `integrations` (data.js)  | bỏ — VietQR, ngân hàng, HĐĐT, KBNN ngoài phạm vi (SPEC §1)                                                                                                    |


### 4.19 (không có mục 1.19 trong inventory)

### 4.20 App người dân — `citizen-mobile.js`


| Trường prototype                                                     | Đối chiếu                                                                             |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `CITIZEN_PROFILE.name`                                               | → `CitizenAccount.display_name` / `ServiceSubject.name`                               |
| `CITIZEN_PROFILE.initials`                                           | bỏ — frontend tự tính từ tên                                                          |
| `CITIZEN_PROFILE.code` (HO-DTH-000128, lệch mã xã)                   | → `ServiceSubject.code` (dùng đúng `DTH-H000128`)                                     |
| `CITIZEN_PROFILE.phone`                                              | → `CitizenAccount.phone`                                                              |
| `CITIZEN_PROFILE.address`                                            | → `ServiceSubject.address` + `Area.name` + `District.name`                            |
| `CITIZEN_PROFILE.company`                                            | → dẫn xuất từ `AreaAssignment` hiện hành của khu vực hộ                               |
| `CITIZEN_BILL.period`, `due`, `total`                                | → `Charge` (`period_id`, `due_date`, `amount`)                                        |
| `CITIZEN_BILL.lines` (45k/20k/12k/3k) | → 2 dòng thu gom + xử lý từ `TariffRate` (G9) |
| `CITIZEN_BILL.history`                                               | → danh sách `Charge` các kỳ trước + `Payment`                                         |
| `CITIZEN_SCHEDULE` \[thứ, khung giờ, loại rác\]                      | → `CollectionSchedule.weekday`/`week_of_month`, `start_time`/`end_time`, `waste_type` |
| `CITIZEN_COMPLAINTS.id` (PA-…) | → `Complaint.code` (một mã chung `KN-MMYY-nnn`, D8) |
| `CITIZEN_COMPLAINTS.csId`                                            | bỏ — app và web dùng chung bản ghi `Complaint`                                        |
| `CITIZEN_COMPLAINTS.type` (5 loại)                                   | → `Complaint.category`                                                                |
| `CITIZEN_COMPLAINTS.summary`                                         | → `Complaint.summary`                                                                 |
| `CITIZEN_COMPLAINTS.date`                                            | → `Complaint.received_date`                                                           |
| `CITIZEN_COMPLAINTS.status`                                          | → `Complaint.status` (nhãn app có thể khác nhãn web)                                  |
| `CITIZEN_COMPLAINTS.tone`                                            | bỏ — màu hiển thị do frontend tính từ trạng thái                                      |
| `CITIZEN_COMPLAINTS.detail`                                          | → `Complaint.content`                                                                 |
| `CITIZEN_COMPLAINTS.timeline[]`                                      | → `ComplaintEvent`                                                                    |
| `CITIZEN_MARKET.id`                                                  | → `MarketPost.code`                                                                   |
| `CITIZEN_MARKET.title`                                               | → `MarketPost.title`                                                                  |
| `CITIZEN_MARKET.tag`                                                 | → `MarketPost.post_type`                                                              |
| `CITIZEN_MARKET.owner` ("Chị Hạnh · Tổ 5")                           | → `MarketPost.author_id` → `CitizenAccount.display_name` + khu vực của hộ             |
| `CITIZEN_MARKET.time`                                                | → `MarketPost.created_at`                                                             |
| `CITIZEN_MARKET.description`                                         | → `MarketPost.description`                                                            |
| `CITIZEN_MARKET.comments[]` \[tên, nội dung, thời gian\]             | → `MarketComment` (`author_id`, `content`, `created_at`)                              |
| (form chợ đồ cũ: ảnh, nơi nhận)                                      | → `MarketPost.photo_urls`, `pickup_location`                                          |
| `CITIZEN_BULKY.id`                                                   | → `BulkyWasteRequest.code`                                                            |
| `CITIZEN_BULKY.item`                                                 | → `BulkyWasteRequest.item_description` (+ `item_type` từ form)                        |
| `CITIZEN_BULKY.date` ("Hẹn 18/09, buổi sáng" / "Đã thu 22/08")       | → `preferred_date`, `preferred_slot`, `scheduled_date`, `collected_at`                |
| `CITIZEN_BULKY.fee` (chuỗi)                                          | → `BulkyWasteRequest.quoted_fee` (tiền số; null = "Chờ công ty báo phí")              |
| `CITIZEN_BULKY.status`                                               | → `BulkyWasteRequest.status`                                                          |
| `CITIZEN_BULKY.tone`                                                 | bỏ — frontend tính từ trạng thái                                                      |
| Form rác cồng kềnh: loại (4), số lượng, địa chỉ, ngày mong muốn, ảnh | → `item_type`, `quantity`, `address`, `preferred_date`, `photo_urls`                  |
| `CITIZEN_NOTIFICATIONS.group` (complaint/transaction)                | → `Notification.kind` `COMPLAINT` / `TRANSACTION`                                     |
| `CITIZEN_NOTIFICATIONS.icon`                                         | bỏ — frontend chọn icon theo `kind`                                                   |
| `CITIZEN_NOTIFICATIONS.title`, `text`, `time`, `unread`              | → `title`, `body`, `created_at`, `read_at`                                            |


---

## 5. Câu hỏi cho người duyệt

Cách trả lời: ghi chữ cái phương án (hoặc câu trả lời riêng) vào dòng **Trả lời**. Phương án ghi "(đề xuất)" chỉ là gợi ý để bạn chọn nhanh, **chưa được áp dụng**. Cột "Phần" cho biết câu hỏi chặn H1 (Phần A) hay H2 (Phần B).

### 5.0 Quyết định đã chốt (24/09/2026)

Người duyệt trả lời trực tiếp trong mục 5.1–5.3; ba chỗ trả lời chưa rõ đã được hỏi lại trong phiên Claude cùng ngày (ghi "hỏi lại").

| # | Quyết định | Áp vào |
|---|---|---|
| G1 | Quản trị mở kỳ, cán bộ xã khóa kỳ | `CollectionPeriod.status` |
| G2 | Làm notifications core (T23) trước T34/T35 | thứ tự task |
| G3 | Chụp `company_id` lên `Charge` theo phân công hiệu lực tại **ngày phát hành** | `Charge.company_id`, `ChargeRequest.scope_company_id` |
| G4 | Cho thu một phần; khoản còn `UNPAID` tới khi đủ; "đã thu" = Σ `Payment.amount`. **Hỏi lại:** thu vượt số còn thiếu → chặn (422) | `Payment.amount`, `Charge.status` |
| G5 | Quản lý công ty ghi bàn giao khi nhận tiền (một bên) | `CashHandover.received_by` |
| G6 | "Đã xử lý" = đóng kèm ghi chú; phiếu sai thì lập phiếu mới, không sửa/hủy | `ReceiptIssue`, `CompanyReceipt.status` |
| G7 | Báo sai thông tin hộ chỉ phát thông báo `INFO`, không có entity | T53 |
| G8 | Người dân chỉ ở `CitizenAccount`; bỏ `CITIZEN` khỏi enum `Role` | `User.role`, `CitizenAccount` |
| G9 | Biểu giá gồm **thu gom + xử lý** (không tách vận chuyển, VAT). **Hỏi lại:** dùng số tạm, thay khi có QĐ | `TariffRate` |
| G10 | Duyệt dependency: Lombok, JaCoCo, `spring-boot-starter-oauth2-resource-server`, `@ant-design/icons`, `fetch` tự bọc (không axios), `expo-secure-store`, `expo-image-picker` | T03, T04, T06, T22, T47 |
| G11 | Kỳ quý dùng `Q{quý}{YY}` thay MMYY, vd. `YCT-Q426-01` | các cột `code` |
| G12 | Công ty chỉ thấy khiếu nại đã được chuyển cho mình | `Complaint` |
| G13 | Bỏ `BULKY` khỏi `FeeType`; rác cồng kềnh không vào phiếu YCT | `FeeType` seed |
| G14 | Khu vực đổi công ty → tự kết thúc phân tổ người đi thu của công ty cũ | `CollectorAssignment.valid_to` |
| G15 | Khóa kỳ bị chặn khi bất kỳ công ty có phải thu − đã nộp > 0 cho kỳ, không cần quá hạn | T32 |
| G16 | Khoản hộ dùng hạn của phiếu YCT; hạn kỳ chỉ cho công ty nộp xã; hạn YCT ≤ hạn kỳ | `Charge.due_date`, `ChargeRequest.due_date` |
| O1 | **Còn mở.** Người duyệt hỏi thực tế ai phát biên lai: tùy bên bán dịch vụ theo pháp lý (công ty xuất hóa đơn nếu thu dưới tên mình; xã/đơn vị của xã phát nếu công ty chỉ thu hộ). Cần kế toán xã xác nhận. Demo giữ "Xác nhận thanh toán" | `Payment.code` |
| O2 | Công ty nộp **toàn bộ** tiền đã thu về xã | sổ công ty–kỳ |
| O3 | Chờ kết quả xin dữ liệu (mục 6) | — |
| O4 | Một người thu được nhiều tổ; tạm mỗi tổ 1 người (kiểm tra ở service) | `CollectorAssignment` |
| O5 | Phí rác cồng kềnh không thành khoản phải thu, không nộp về xã | `BulkyWasteRequest.quoted_fee` |
| O6 | Chưa có vai trò kiểm duyệt; bỏ qua | `MarketPost.status` |
| O7 | Giữ OTP cố định mô phỏng | `CitizenAccount` |
| D1 | `id bigint` làm khóa; mã nghiệp vụ là cột `code` duy nhất | mọi bảng |
| D2 | Seed tạm 8 tổ/địa bàn (KV01–08 DTH, KV09–16 TTT, KV17–24 NB); xin xã dữ liệu thật | `Area.district_id` |
| D3 | Nhóm giá là enum cố định 4 nhóm | `TariffGroup` |
| D4 | Mã xác nhận thanh toán `TT-MMYY-nnnnnn` | `Payment.code` |
| D5 | Bàn giao không gắn kỳ; tiền đang giữ tính trên mọi kỳ | `CashHandover` |
| D6 | Giữ lịch sử nhắc nộp, không xóa | `PaymentReminder` |
| D7 | Đã đọc thông báo tính chung trên bản ghi | `Notification.read_at` |
| D8 | Mã khiếu nại chung `KN-MMYY-nnn` | `Complaint.code` |
| D9 | Bài chợ đồ cũ `OPEN` / `CLOSED`, người đăng tự đóng | `MarketPost.status` |
| D10 | Không có hợp đồng giấy; bản ghi đăng ký dịch vụ do xã lập. **Hỏi lại:** số đăng ký hệ thống tự sinh `ĐK-{địa bàn}-{nnnn}`, bỏ "Ngày ký" | `ServiceContract` |
| D11 | Một SĐT ↔ một hộ; một hộ nhiều tài khoản | `CitizenAccount` |

### 5.1 Khoảng trống trong SPEC (G1–G16, từ `tasks/plan.md` §9)

**G1 — Ai mở và ai khóa kỳ thu?** · Phần A · chạm `CollectionPeriod.status`, `locked_by`; T11, T12, T32

- a) Quản trị mở kỳ, cán bộ xã khóa kỳ (khớp SPEC §1 dòng Quản trị ghi "khóa kỳ do cán bộ xã" và §10 bước 1, 8) (đề xuất)
- b) Cả mở và khóa đều do cán bộ xã; quản trị chỉ cấu hình
- c) Cả hai vai trò đều được mở và khóa
- **Trả lời:** \_\_a\_\_

**G2 — Làm `notifications` core (T23) trước `remittance`?** · Phần B · chỉ đổi thứ tự task, không đổi dữ liệu

- a) Đồng ý làm T23 trước T34/T35 (đề xuất)
- b) Giữ đúng thứ tự SPEC §2, nhắc nộp/báo sai sót tạm chưa phát thông báo
- **Trả lời:** \_\_a\_\_

**G3 — "Phải thu tính theo công ty được phân công tại kỳ phát sinh": lấy mốc ngày nào, có chụp công ty lên khoản không?** · Phần A · chạm `Charge.company_id`, `ChargeRequest.scope_company_id`; T13, T17, T18, T24

- a) Chụp `company_id` lên `Charge` lúc phát hành, theo phân công hiệu lực tại **ngày phát hành**; đổi công ty sau đó không đổi khoản đã phát hành (đề xuất)
- b) Chụp theo phân công hiệu lực tại **ngày đầu kỳ**
- c) Không chụp; khi báo cáo thì tra phân công hiệu lực tại **hạn nộp kỳ**
- **Trả lời:** \_\_\_a\_

**G4 — Thanh toán một phần / thu thừa; "công ty đã thu" tính thế nào?** · Phần A · chạm `Payment.amount`, `Charge.amount`; T21, T24

- a) Demo chỉ cho thu đúng bằng số tiền khoản (không một phần, không thừa); "đã thu" = Σ `Payment.amount` (bằng Σ khoản `PAID`) (đề xuất)
- b) Cho thu một phần (khoản vẫn `UNPAID` tới khi đủ); "đã thu" = Σ `Payment.amount`
- c) Như prototype: người thu ghi đè số thực thu vào khoản; "đã thu" = Σ số tiền khoản `PAID`
- **Trả lời:** \_\_b\_\_

**G5 — Ai ghi bàn giao tiền mặt, có xác nhận hai phía không?** · Phần A · chạm `CashHandover.received_by`, `confirmed_at`; T25, T27, T29

- a) Quản lý công ty ghi khi nhận tiền (một bên), người đi thu chỉ xem (đề xuất)
- b) Người đi thu ghi, quản lý công ty bấm xác nhận (hai phía; thêm trạng thái Chờ xác nhận / Đã nhận)
- c) Người đi thu ghi một bên
- **Trả lời:** \_\_a\_\_

**G6 — Báo sai sót phiếu thu "Đã xử lý" nghĩa là gì?** · Phần A · chạm `ReceiptIssue.resolution_note`, `CompanyReceipt.status`; T35

- a) Chỉ đóng kèm ghi chú kết quả; nếu phiếu sai thì xã lập phiếu mới, phiếu cũ giữ nguyên (đề xuất)
- b) Xã được **hủy** phiếu sai (thêm `CANCELLED`, phiếu hủy không tính vào đã nộp) rồi lập phiếu mới
- c) Xã được sửa trực tiếp phiếu (ghi audit trước/sau) khi kỳ chưa khóa
- **Trả lời:** \_\_a\_\_

**G7 — "Báo sai thông tin hộ" của người đi thu lưu ở đâu?** · Phần A · T53 (P2)

- a) Chỉ phát `Notification` loại `INFO` cho xã + công ty, không có entity riêng (như prototype) (đề xuất)
- b) Thêm entity `SubjectCorrectionRequest` (hộ, loại sai, mô tả, trạng thái) — phải thêm vào data dictionary
- **Trả lời:** \_\_\_a\_

**G8 — Người dân: một bảng hay hai?** · Phần A (T05) và B (T39) · chạm `Role.CITIZEN`, `CitizenAccount.user_id`

- a) Chỉ `CitizenAccount` (bảng riêng, token riêng); bỏ `CITIZEN` khỏi enum `Role` của `User` (đề xuất)
- b) Người dân là một `User` vai trò `CITIZEN`; `CitizenAccount` chỉ nối `user_id` ↔ `subject_id`
- **Trả lời:** \_\_a\_\_

**G9 — Thành phần giá QĐ 65/2026 cho 4 nhóm giá** · Phần A · chạm `TariffRate`; T10
Prototype có 3 bộ số lệch nhau: nhóm 80.000đ là 57k/23k/0 (màn quản trị) hoặc 45k/20k/12k/3k (app người dân); nhóm 40.000đ là 29k/11k/0; hai nhóm "Chủ nguồn thải nhỏ" 119.000đ và "Theo khối lượng" 1.266.000đ không có thành phần. Mã "BG-65-G2" gợi ý QĐ chia theo nhóm khu vực ("Nhóm 2").

- a) Bạn cung cấp số chính thức từ QĐ 65/2026 (gồm: đơn vị tính của nhóm theo khối lượng, VAT là tiền hay %, xã thuộc nhóm khu vực nào)
- b) Seed demo dùng 57k/23k/0/0 và 29k/11k/0/0; hai nhóm còn lại để toàn bộ vào "thu gom", đánh dấu "số tạm" (đề xuất cho demo nếu chưa có QĐ)
- **Trả lời:** \_giá hiện tại gồm tiền xử lý và tiền thu gom\_\_\_

**G10 — Dependency ngoài SPEC §3** · Phần A · T03, T04, T06, T22, T47
Cần duyệt từng mục: Lombok · JaCoCo (đo coverage 80%) · thư viện JWT (`spring-boot-starter-oauth2-resource-server` dùng Nimbus, hoặc `jjwt`) · `@ant-design/icons` · HTTP client web (`fetch` tự bọc hoặc `axios`) · `expo-secure-store` · `expo-image-picker`

- a) Duyệt tất cả; JWT dùng `spring-boot-starter-oauth2-resource-server`; web dùng `fetch` tự bọc (không thêm axios) (đề xuất)
- b) Duyệt từng mục (ghi danh sách)
- **Trả lời:** \_\_\_a\_

**G11 — Mã chứng từ cho kỳ quý** · Phần A · chạm `ChargeRequest.code`, `Charge.code`, `CompanyReceipt.code`, `CashHandover.code`; T18, T26

- a) Kỳ quý dùng `Q` + số quý + 2 số năm thay cho MMYY: `YCT-Q426-01`, `KT-Q426-H000128`, `PT-CT-Q426-001` (đề xuất)
- b) Lấy tháng đầu quý: `YCT-1026-01` (có thể trùng dạng với kỳ tháng 10)
- c) Lấy tháng phát hành/lập phiếu
- **Trả lời:** \_\_a\_\_

**G12 — Công ty thấy khiếu nại nào?** · Phần B · chạm `Complaint.forwarded_company_id`, `area_id`; T36

- a) Chỉ khiếu nại xã đã chuyển cho công ty (đề xuất)
- b) Cả khiếu nại thuộc khu vực mình chưa chuyển: xem được nhưng chỉ phản hồi khi đã chuyển
- c) Như b và được phản hồi luôn
- **Trả lời:** \_\_a\_\_

**G13 — Loại phí `BULKY` 150.000đ trong phiếu YCT và phí rác cồng kềnh của app** · Phần A + B · chạm `FeeType` seed, `BulkyWasteRequest.quoted_fee`; T10, T17, T45

- a) Bỏ `BULKY` khỏi `FeeType` cho demo; rác cồng kềnh chỉ là yêu cầu có phí báo, không vào phiếu YCT (đề xuất)
- b) Giữ `BULKY` trong `FeeType` (khoản cố định lập qua phiếu YCT) tách biệt hoàn toàn với phí báo của yêu cầu rác cồng kềnh; đổi tên để khỏi lẫn
- **Trả lời:** \_\_a\_\_

**G14 — Khu vực đổi công ty: phân tổ người đi thu của công ty cũ?** · Phần A · chạm `CollectorAssignment.valid_to`; T13, T20

- a) Backend tự gán `valid_to` cho các phân tổ của công ty cũ bằng ngày kết thúc phân công khu vực (đề xuất)
- b) Không tự động; công ty cũ tự kết thúc; hệ thống chỉ ẩn khoản không còn thuộc công ty
- **Trả lời:** \_\_\_\_a

**G15 — Khóa kỳ chặn "khi còn công ty nợ" tính thế nào?** · Phần A · T32

- a) Chặn khi **bất kỳ** công ty có phải thu − đã nộp &gt; 0 cho kỳ đó, không cần quá hạn; khoản hộ chưa thu vẫn tính là phần công ty còn phải nộp (như prototype R9–R11, đề xuất)
- b) "Phải thu" của công ty chỉ tính khoản hộ đã thu (công ty nộp đủ số đã thu là được khóa)
- c) Như a nhưng chỉ chặn khi đã quá hạn nộp
- **Trả lời:** \_\_\_\_a

**G16 — Hai loại hạn: "quá hạn" của khoản hộ dùng hạn nào?** · Phần A · chạm `Charge.due_date`, `ChargeRequest.due_date`, `CollectionPeriod.due_date`; T17, T18

- a) Khoản hộ dùng hạn của phiếu YCT sinh ra nó (chép vào `Charge.due_date`); hạn kỳ chỉ dùng cho công ty nộp xã; phiếu YCT hạn không được sau hạn kỳ (đề xuất)
- b) Mọi khoản trong kỳ dùng chung hạn của kỳ; phiếu YCT không có hạn riêng
- **Trả lời:** \_\_\_\_a

### 5.2 Điểm mở chính thức (O1–O7, SPEC §11)

Demo đang theo mặc định ở cột "Mặc định demo". Chỉ cần trả lời nếu muốn đổi.


| #   | Điểm mở                                                      | Mặc định demo                                                                    | Trường bị chạm                 | Trả lời                                                               |
| --- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| O1  | Ai phát hành biên lai cho hộ, mẫu biên lai                   | "Xác nhận thanh toán" từ `Payment` với mã cố định, không gọi là biên lai pháp lý | `Payment.code`                 | \_\_\_\_thông thường ai là người phát hành biên lại trong thực tế     |
| O2  | Luồng tiền: nộp toàn bộ hay phần xử lý                       | Công ty nộp toàn bộ (tạm chốt)                                                   | `CompanyReceipt`, ledger       | \_\_\_\_ toàn bộ                                                      |
| O3  | Trường nào xã/công ty có dữ liệu thật                        | Chờ kết quả xin dữ liệu theo mục 6                                               | Cột "Nguồn", mục 6             | \_\_\_\_                                                              |
| O4  | Một người thu mấy tổ, một tổ mấy người                       | Schema nhiều–nhiều; seed 1 người/tổ                                              | `CollectorAssignment`          | \_\_\_một người có thể thu nhiều tổ, và để phần 1 tổ tạm là 1 người\_ |
| O5  | Phí rác cồng kềnh có thành khoản phải thu và nộp về xã không | Chỉ lưu `quoted_fee`, không sinh `Charge`                                        | `BulkyWasteRequest.quoted_fee` | \_\_\_\_khồn                                                          |
| O6  | Ai kiểm duyệt bài chợ đồ cũ                                  | Không kiểm duyệt                                                                 | `MarketPost.status`            | \_\_\_\_ hiện chưa có actor này tạm bỏ qua                            |
| O7  | Đăng nhập người dân thật (VNeID / OTP SMS)                   | OTP cố định mô phỏng                                                             | `CitizenAccount.phone`         | \_\_\_\_                                                              |


### 5.3 Câu hỏi phát sinh khi viết data dictionary (D1–D11)

**D1 — Khóa chính** · Phần A + B · mọi bảng

- a) Mọi bảng có `id bigint` tự tăng làm khóa; mã nghiệp vụ (`DV01`, `KV07`, `DTH-H000128`…) là cột `code` duy nhất; API nhận/trả `code` ở chỗ người dùng nhìn thấy (đề xuất)
- b) Dùng mã nghiệp vụ làm khóa chính luôn
- c) Dùng UUID làm khóa
- **Trả lời:** \_\_\_\_a

**D2 — Tổ nào thuộc địa bàn nào?** · Phần A · `Area.district_id`
Prototype không có liên kết; seed trộn tiền tố mã hộ (vd. KV02 có hộ TTT, KV03 có hộ NB).

- a) Xin xã danh sách thật (mục 6); tạm seed 8 tổ/địa bàn: KV01–08 DTH, KV09–16 TTT, KV17–24 NB, và sinh lại mã hộ seed cho khớp tiền tố địa bàn (đề xuất)
- b) Bạn cung cấp cách phân bổ khác
- **Trả lời:** \_\_\_\_a

**D3 — Nhóm giá là enum cố định hay bảng danh mục?** · Phần A · `ServiceContract.tariff_group`, `TariffRate.tariff_group`

- a) Enum cố định 4 nhóm (đề xuất; thêm nhóm = thêm migration + sửa code)
- b) Bảng danh mục `tariff_groups` (quản trị thêm được; thêm 1 entity vào data dictionary)
- **Trả lời:** \_\_\_\_a

**D4 — Mã "Xác nhận thanh toán" (`Payment.code`)** · Phần A

- a) `TT-MMYY-nnnnnn`, đếm theo kỳ (kỳ quý theo G11) (đề xuất)
- b) Giữ dạng prototype `BL-MMYY-nnnn` (dễ hiểu nhầm là biên lai pháp lý, xem O1)
- **Trả lời:** \_\_\_\_ a

**D5 — Bàn giao tiền mặt có gắn kỳ thu?** · Phần A · `CashHandover.period_id`

- a) Không gắn kỳ; tiền mặt đang giữ = Σ tiền mặt đã thu − Σ đã bàn giao, tính trên mọi kỳ (đề xuất)
- b) Gắn kỳ bắt buộc như prototype; tiền mặt đang giữ tính riêng từng kỳ
- **Trả lời:** \_\_\_\_a

**D6 — Nhắc nộp khi công ty đã hết nợ** · Phần A · `PaymentReminder`

- a) Giữ lại làm lịch sử; màn hình hiển thị "Đã hết nợ" tính từ sổ công ty–kỳ (đề xuất)
- b) Xóa như prototype
- **Trả lời:** \_\_\_\_a

**D7 — Trạng thái đã đọc thông báo gửi theo vai trò/công ty** · Phần B · `Notification.read_at`

- a) Đọc chung trên bản ghi: một người đọc là cả nhóm thấy đã đọc (như prototype, đơn giản) (đề xuất cho demo)
- b) Đọc theo từng người: thêm bảng `notification_reads(notification_id, user_id, read_at)`
- **Trả lời:** \_\_\_\_a

**D8 — Mã khiếu nại** · Phần B · `Complaint.code`
Prototype có hai dạng: web `KN-2609-nnn` (YYMM) và app `PA-0926-nnn` (MMYY).

- a) Một mã chung `KN-MMYY-nnn` (MMYY như các chứng từ khác) (đề xuất)
- b) Một mã chung `PA-MMYY-nnn` ("phản ánh", như app)
- **Trả lời:** \_\_\_\_a

**D9 — Trạng thái bài chợ đồ cũ** · Phần B · `MarketPost.status`

- a) `OPEN` Đang đăng / `CLOSED` Đã cho/đổi xong, người đăng tự đóng (đề xuất)
- b) Thêm `HIDDEN` Đã ẩn cho xã gỡ bài (liên quan O6)
- **Trả lời:** \_\_\_\_a

**D10 — Hợp đồng dịch vụ của hộ ký với ai?** · Phần A · nguồn của `ServiceContract.*`

- a) Ký với công ty; công ty cung cấp số hợp đồng, ngày ký, nhóm giá
- b) Ký với xã (UBND); xã cung cấp
- c) Chưa có hợp đồng giấy; "hợp đồng" trong hệ thống chỉ là bản ghi đăng ký sử dụng dịch vụ do xã lập
- **Trả lời:** \_\_\_\_c

**D11 — Một hộ có mấy tài khoản app?** · Phần B · `CitizenAccount.subject_id`

- a) Một SĐT ↔ một hộ; một hộ có thể nhiều SĐT (nhiều thành viên) (đề xuất)
- b) Đúng một tài khoản cho một hộ
- **Trả lời:** \_\_\_\_a

---

## 6. Danh sách trường cần xin

> **Dữ liệu thật không bao giờ đưa vào repo hoặc seed** (SPEC §8). Demo chạy trên dữ liệu giả; danh sách dưới đây phục vụ **triển khai thật** và để biết trường nào xã/công ty thực sự có (O3).
> Cột "Ưu tiên": **1** = thiếu thì không lập khoản được · **2** = cần cho vận hành · **3** = nên có.
> Khi gửi xin, đề nghị xã/công ty đánh dấu từng trường: *Có sẵn / Có nhưng chưa số hóa / Không có*.

### 6.1 Xin xã (UBND xã Đông Thạnh)


| #   | Nhóm dữ liệu     | Trường                                                                                                                     | Entity → cột                                                    | Ưu tiên | Ghi chú                                                |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------- | ------------------------------------------------------ |
| X1  | Địa bàn          | Mã, tên 3 địa bàn                                                                                                          | `District.code`, `name`                                         | 1       |                                                        |
| X2  | Khu vực / tổ     | Mã tổ, tên tổ, thuộc địa bàn nào                                                                                           | `Area.code`, `name`, `district_id`                              | 1       | D2                                                     |
| X3  | Công ty          | Danh sách công ty/HTX được giao thu gom, mã (nếu xã có), tên, loại hình                                                    | `Company.code`, `name`, `org_type`                              | 1       |                                                        |
| X4  | Công ty          | Hiệu lực hợp đồng xã – công ty, số hợp đồng                                                                                | `Company.valid_from`, `valid_to`, `commune_contract_no`         | 2       |                                                        |
| X5  | Phân công        | Tổ nào giao công ty nào, từ ngày – đến ngày, số văn bản giao                                                               | `AreaAssignment.*`                                              | 1       | Kể cả lịch sử nếu đã đổi công ty trong năm             |
| X6  | Hộ / đối tượng   | Mã hộ (nếu xã đã có), loại (HGĐ/HKD/DN), tên chủ hộ hoặc cơ sở, địa chỉ, tổ, SĐT, trạng thái                               | `ServiceSubject.*`                                              | 1       | Hỏi xã có mã hộ sẵn không; nếu không, hệ thống sinh mã |
| X7  | Hộ / đối tượng   | Số nhân khẩu (hộ gia đình)                                                                                                 | `ServiceSubject.member_count`                                   | 1       | Để xếp nhóm ≤ 2 / ≥ 3 người                            |
| X8  | Hộ / đối tượng   | Người đại diện, mã số thuế (HKD/DN)                                                                                        | `representative_name`, `tax_code`                               | 3       |                                                        |
| X9  | Miễn giảm        | Danh sách hộ được miễn 100%, lý do, số văn bản                                                                             | `ServiceContract.exempt`, `exempt_reason`, `exempt_decision_no` | 1       | Hộ nghèo, gia đình chính sách…                         |
| X10 | Đăng ký dịch vụ | Hộ nào đang dùng dịch vụ, từ ngày nào, nhóm giá | `ServiceContract.valid_from`, `tariff_group` | 1 | Không có hợp đồng giấy; số đăng ký do hệ thống sinh (D10) |
| X11 | Biểu giá | Toàn văn QĐ 65/2026/QĐ-UBND: nhóm giá, tiền thu gom và tiền xử lý từng nhóm, đơn vị tính nhóm theo khối lượng, hiệu lực | `TariffVersion.*`, `TariffRate.*` | 1 | G9 — thay số tạm |
| X12 | Kỳ thu           | Kỳ thu theo tháng hay quý, hạn công ty nộp về xã, hạn hộ đóng                                                              | `CollectionPeriod.due_date`, `ChargeRequest.due_date`           | 1       | G16                                                    |
| X13 | Phiếu thu        | Mẫu phiếu thu xã lập cho công ty, quy tắc đánh số                                                                          | `CompanyReceipt.code`                                           | 2       | G11                                                    |
| X14 | Tài khoản        | Danh sách cán bộ xã dùng hệ thống: họ tên, SĐT, email, đơn vị                                                              | `User.full_name`, `phone`, `email`, `organization`              | 2       |                                                        |
| X15 | Khiếu nại        | Mẫu sổ tiếp nhận khiếu nại hiện tại (nếu có), các loại khiếu nại thường gặp                                                | `Complaint.category`                                            | 3       |                                                        |


### 6.2 Xin công ty (mỗi công ty/HTX)


| #   | Nhóm dữ liệu          | Trường                                                          | Entity → cột                                | Ưu tiên | Ghi chú                                                      |
| --- | --------------------- | --------------------------------------------------------------- | ------------------------------------------- | ------- | ------------------------------------------------------------ |
| C1  | Thông tin công ty     | Tên đầy đủ, người đầu mối, SĐT, MST, địa chỉ, email             | `Company.*`                                 | 1       |                                                              |
| C2  | Thông tin công ty     | Tài khoản ngân hàng dùng nộp tiền về xã                         | `Company.bank_account`, `bank_name`         | 2       |                                                              |
| C3  | Người đi thu          | Họ tên, SĐT từng người đi thu                                   | `User.full_name`, `phone`                   | 1       |                                                              |
| C4  | Phân tổ               | Người đi thu nào phụ trách tổ nào, từ ngày nào                  | `CollectorAssignment.*`                     | 1       | O4                                                           |
| C5  | Danh sách hộ đang thu | Danh sách hộ công ty đang thu (tên, địa chỉ, SĐT, mức đang thu) | đối chiếu với X6/X10                        | 1       | Dùng đối chiếu với danh sách của xã, phát hiện hộ thiếu/lệch |
| C7  | Lịch thu gom          | Theo từng tổ: thứ, tuần trong tháng, khung giờ, loại rác        | `CollectionSchedule.*`                      | 2       |                                                              |
| C8  | Rác cồng kềnh         | Loại vật dụng nhận thu gom, bảng giá tham khảo                  | `BulkyWasteRequest.item_type`, `quoted_fee` | 3       | O5                                                           |
| C9  | Tài khoản             | Người quản lý dùng hệ thống: họ tên, SĐT, email                 | `User.*` (`COMPANY_MANAGER`)                | 2       |                                                              |


### 6.3 Lưu ý khi xin dữ liệu cá nhân

- Tên, SĐT, địa chỉ, số nhân khẩu, số định danh của hộ là **dữ liệu cá nhân** (Nghị định 13/2023/NĐ-CP). Chỉ xin trường ở mức ưu tiên cần thiết; `national_id` chỉ xin nếu xã yêu cầu định danh.
- Nhận file qua kênh xã chỉ định; không lưu vào repo, không gửi qua dịch vụ công cộng; không dùng làm seed.
- Khi triển khai thật, import qua công cụ riêng (ngoài phạm vi 4 tuần), không qua migration.

