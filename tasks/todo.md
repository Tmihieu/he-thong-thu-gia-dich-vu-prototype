# Danh sách task: Demo thu giá dịch vụ VSMT

> Kế hoạch tổng thể, đồ thị phụ thuộc, rủi ro và khoảng trống G1–G16: xem `tasks/plan.md`.
> Mỗi task chạy trong một phiên Claude: `/agent-skills:build Txx` (task gắn **[TDD]** thì chạy `/agent-skills:test Txx` trước).
> Chỉ tick `[x]` khi mọi tiêu chí nghiệm thu và mọi bước kiểm chứng đã đạt.

## Quy ước

**Viết tắt đường dẫn**
- `BE/` = `backend/src/main/java/vn/dongthanh/vsmt/` · `BT/` = `backend/src/test/java/vn/dongthanh/vsmt/`
- `MIG/` = `backend/src/main/resources/db/migration/` · `SEED/` = `backend/src/main/resources/db/seed/`
- `WEB/` = `web/src/` · `MOB/` = `mobile/`

**Lệnh (SPEC §4).** Trên PowerShell thay `./mvnw` bằng `.\mvnw.cmd`.
- Backend, test tập trung: `cd backend && ./mvnw test -Dtest=<TênTest>`
- Backend, đầy đủ: `cd backend && ./mvnw verify`
- Web: `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
- Mobile: `cd mobile && npm run gen:api && npm test`, thử tay bằng `npx expo start`

**Kích thước:** S = 1–2 đơn vị file · M = 3–5 · L = 5–8 (chỉ dành cho scaffold). Cặp entity + repository, file DTO `record` gom chung, migration + seed đi kèm, mỗi cặp tính 1 đơn vị.
**Ưu tiên:** P0 = cần cho kịch bản demo §10 · P1 = nghiệm thu §9 ngoài kịch bản · P2 = dự phòng.
**Nhãn:** **[TDD]** viết test trước (SPEC §7) · **[cần hỏi trước]** chạm điểm mở/khoảng trống, phải có câu trả lời trước khi build · **[NGƯỜI DÙNG]** việc của người dùng, Claude không làm thay.

**Tiêu chuẩn hoàn thành chung (áp cho mọi task):** tiêu chí nghiệm thu đạt; test mới đỏ khi chưa có code và xanh khi có code; không test nào bị xóa/skip; migration mới, không sửa migration cũ; thao tác tạo/sửa tiền có ghi audit; kiểm tra vai trò + phạm vi dữ liệu ở backend; controller mỏng, DTO `record`, lỗi nghiệp vụ 409/422 kèm `code` + `message` tiếng Việt; nhãn giao diện tiếng Việt; seed chỉ dữ liệu giả; một commit cho một task.

---

## Tuần 1 — Nền móng (23/09 – 29/09)

- [x] **T01 — Viết data dictionary** · `data-dictionary` · M · P0
  - **Mô tả:** Viết `docs/data-dictionary.md`, nguồn duy nhất để sau này viết entity và migration, đồng thời dùng để xin dữ liệu từ xã và công ty. Tài liệu bao phủ mọi entity SPEC §9.2–9.9: User, AuditLog, District, Area, Company, AreaAssignment, ServiceSubject, ServiceContract, TariffVersion, TariffRate, FeeType, CollectionPeriod, CollectionSchedule, ChargeRequest, Charge, CollectorAssignment, CollectionVisit, Payment, CashHandover, CompanyReceipt, ReceiptIssue, PaymentReminder, Notification, Complaint, ComplaintEvent, CitizenAccount, MarketPost, MarketComment, BulkyWasteRequest (29 entity). Mỗi entity có một bảng trường với các cột *tên hiển thị (VI) · tên kỹ thuật · kiểu · bắt buộc · nguồn (Xã / Công ty / Hệ thống / Người dân) · ví dụ · ghi chú*, kèm giá trị enum có nhãn tiếng Việt, khóa nghiệp vụ/ràng buộc duy nhất, và mức **Phải có để chạy demo** / **Nên có khi triển khai thật**. Chia tài liệu làm hai phần để duyệt cuốn chiếu: **Phần A** (platform, master-data trừ CollectionSchedule, billing, collection, remittance) và **Phần B** (notifications, complaints, citizen-app, CollectionSchedule). Có mục "Đối chiếu prototype" ghi từng trường ở prototype-inventory §1: đã có ở đâu, hoặc bỏ vì lý do gì. Có mục "Danh sách trường cần xin" gom theo nguồn (xin xã / xin công ty). Có mục "Câu hỏi cho người duyệt" liệt kê G1–G16 (plan.md §9) và O1–O7, mỗi câu kèm phương án mặc định để người dùng chọn. **Không tự quyết** câu nào.
  - **Tiêu chí nghiệm thu:**
    - [x] Đủ 29 entity, mỗi trường có đủ 7 cột, mỗi entity đánh dấu thuộc Phần A hay B
    - [x] Mọi trường trong `docs/reference/prototype-inventory.md` §1 đều có mặt hoặc có dòng "bỏ — lý do"
    - [x] Có mục "Danh sách trường cần xin" (theo nguồn) và mục "Câu hỏi cho người duyệt" (G1–G16, O1–O7)
  - **Kiểm chứng:**
    - [x] `grep -c "^### " docs/data-dictionary.md` ≥ 29 (mỗi entity một tiêu đề cấp 3)
    - [x] Thủ công: đối chiếu từng mục prototype-inventory §1.1–1.20 với mục "Đối chiếu prototype"
  - **Phụ thuộc:** Không
  - **File dự kiến:** `docs/data-dictionary.md`
  - **Kích thước:** M (1 file nhưng nội dung dài). Bản `.xlsx` để sau (plan.md C9). Chạm O3: đánh dấu trường nào cần xin.

- [ ] **T02 — Chuyển prototype vào `prototype/` và dựng docker-compose cho CSDL** · `platform` · S · P0
  - **Mô tả:** `git mv index.html assets prototype/` (giữ nguyên đường dẫn tương đối). Tạo `docker-compose.yml` có service `db` (postgres:16, volume có tên, healthcheck `pg_isready`, biến lấy từ `.env`). Tạo `.env.example` (POSTGRES_DB/USER/PASSWORD, JWT_SECRET, chỉ chứa giá trị giả). Bổ sung `.gitignore`: `.env`, `backend/target/`, `node_modules/`, `dist/`, `.expo/`.
  - **Tiêu chí nghiệm thu:**
    - [ ] Mở `prototype/index.html` trên trình duyệt thấy giao diện như trước khi chuyển
    - [x] `docker compose up -d db` chạy và healthcheck ra healthy (26/09/2026, Docker Desktop 29.8.0)
    - [x] Không có secret thật trong repo; `.env` bị git bỏ qua
  - **Kiểm chứng:**
    - [x] `docker compose up -d db && docker compose exec db pg_isready`
    - [ ] `git status` không hiện `.env` (đã đạt 24/09); thủ công mở `prototype/index.html` (chờ người dùng, đã kiểm tra 23 đường dẫn CSS/JS đều đúng)
  - **Phụ thuộc:** Không
  - **File dự kiến:** `prototype/**` (chỉ di chuyển), `docker-compose.yml`, `.env.example`, `.gitignore`
  - **Kích thước:** S

- [x] **T03 — Khung backend Spring Boot** · `platform` · L (scaffold) · P0 · **xong 26/09/2026**: Spring Boot 3.5.16 (bản 3.x cuối; start.spring.io chỉ còn 4.x), Lombok + JaCoCo theo G10
  - **Mô tả:** Khởi tạo `backend/`: Maven wrapper, Java 21, Spring Boot 3.x với đúng dependency SPEC §3 (Web, Data JPA, Security, Validation, springdoc-openapi, Flyway, PostgreSQL driver, Testcontainers). Tạo package gốc `vn.dongthanh.vsmt` và các package module rỗng theo SPEC §5. `application.yml`: datasource lấy từ biến môi trường; timezone `Asia/Ho_Chi_Minh`; profile `demo` là profile mặc định khi `spring-boot:run` và nạp thêm `db/seed`; profile `test` không nạp seed. Trong `platform/common`: `BusinessRuleException(code, message)`, `ApiError`, `GlobalExceptionHandler` (422 lỗi quy tắc, 409 xung đột, 403, 404, 400 validation, tất cả trả `{code, message}`). Lớp nền `IntegrationTest` dùng Testcontainers PostgreSQL 16. **Hỏi trước (G10), gộp một lần:** có thêm Lombok (mẫu code §6 dùng) và JaCoCo (đo coverage ≥ 80% §7) không? Chưa được đồng ý thì không thêm.
  - **Tiêu chí nghiệm thu:**
    - [x] `./mvnw verify` xanh: context khởi động và Flyway chạy trên Testcontainers (Docker Desktop trên Windows chạy được Testcontainers)
    - [x] `./mvnw spring-boot:run` lên cổng 8080; `/v3/api-docs` và `/swagger-ui.html` mở được
    - [x] Có test chứng minh `BusinessRuleException` trả 422 với JSON `{code, message}`
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw verify`
    - [x] `docker compose up -d db`, `cd backend && ./mvnw spring-boot:run`, rồi `curl http://localhost:8080/v3/api-docs`
  - **Phụ thuộc:** T02
  - **File dự kiến:** `backend/pom.xml`, `backend/mvnw*` + `.mvn/`, `BE/VsmtApplication.java`, `backend/src/main/resources/application.yml` (+ `application-test.yml`), `BE/platform/common/{BusinessRuleException,ApiError,GlobalExceptionHandler}.java`, `BT/support/IntegrationTest.java`, `BT/SmokeIT.java`
  - **Kích thước:** L. Scaffold, vượt 5 file là chấp nhận được.

- [x] **T04 — Khung web React** · `platform` · L (scaffold) · P0 · **xong 26/09/2026**: React 18.3, AntD 5.29 + icons (G10), React Router 7 (bản 8 đòi React 19), TypeScript 5.9, ESLint 10, Vite 8, Vitest 5
  - **Mô tả:** Khởi tạo `web/` bằng Vite React 18 + TypeScript strict. Cài AntD 5 (`ConfigProvider` locale `vi_VN`, dayjs locale `vi`), React Router, TanStack Query, Vitest + Testing Library, ESLint. `WEB/api/client.ts` là wrapper `fetch`: gắn Bearer token, đổi lỗi `{code, message}` thành `ApiError`. Script `gen:api` chạy `openapi-typescript http://localhost:8080/v3/api-docs -o src/api/schema.d.ts`. Vite proxy `/api` → `:8080`. Thành phần dùng chung: `MoneyText` (định dạng `1.234.567 đ`) và `DateText` (`dd/MM/yyyy`). **Hỏi trước (G10):** có dùng `@ant-design/icons` không? Client HTTP mặc định là `fetch`, không thêm dependency.
  - **Tiêu chí nghiệm thu:**
    - [x] `npm run lint && npm run test && npm run build` xanh
    - [x] `MoneyText` và `DateText` có test định dạng, gồm cả số 0, số lớn và ngày ISO
    - [x] Khi backend đang chạy, `npm run gen:api` sinh ra `src/api/schema.d.ts`
  - **Kiểm chứng:**
    - [x] `cd web && npm install && npm run lint && npm run test && npm run build`
    - [x] `cd web && npm run gen:api` (backend chạy từ T03); `npm run dev` mở http://localhost:5173
  - **Phụ thuộc:** T02, T03 (cần OpenAPI cho `gen:api`)
  - **File dự kiến:** `web/package.json`, `web/vite.config.ts`, `web/tsconfig.json`, `WEB/main.tsx`, `WEB/app/App.tsx`, `WEB/api/client.ts`, `WEB/shared/{MoneyText,DateText}.tsx` + test
  - **Kích thước:** L. Scaffold.

- [x] **H1 — [NGƯỜI DÙNG] Duyệt data dictionary Phần A và trả lời câu hỏi** · mục tiêu 25/09 · **đã duyệt 24/09/2026**, quyết định ở `docs/data-dictionary.md` §5.0
  - Đọc Phần A của `docs/data-dictionary.md`. Trả lời tối thiểu G1, G3, G4, G5, G8, G9, G10, G11, G14, G15, G16. Ghi "Đã duyệt Phần A — ngày" ở đầu file.
  - **Chặn:** mọi task tạo entity/migration của Phần A (T05 trở đi).
  - **Phụ thuộc:** T01

- [x] **T05 — Bảng users và seed tài khoản demo** · `platform` · M · P0 · **xong 26/09/2026**: `Role` 4 giá trị, không có `CITIZEN` (G8); thêm `BaseEntity` cho trường chung §1.3
  - **Mô tả:** Tạo `MIG/V1__platform_users.sql` và entity `User` (username duy nhất, fullName, phone, role, companyId có thể null, status, passwordHash bcrypt) theo data dictionary. Enum `Role`: `COMMUNE_OFFICER, COMPANY_MANAGER, COLLECTOR, ADMIN, CITIZEN`. Seed `SEED/V1_1__seed_users.sql` gồm `admin` và `canbo_xa`. Tài khoản công ty được seed ở T09, người đi thu ở T20, vì các bảng họ phụ thuộc chưa có. FK `users.company_id` được thêm ở V3. Mật khẩu demo ghi trong `docs/demo-accounts.md` (chỉ cho dữ liệu giả). Cách tổ chức `CITIZEN` theo câu trả lời G8.
  - **Tiêu chí nghiệm thu:**
    - [x] Migration chạy trên Testcontainers; tìm user theo username hoạt động (IT)
    - [x] Profile demo tạo được 2 tài khoản seed; mật khẩu lưu dạng băm (`DemoSeedIT` + kiểm tay trên CSDL docker)
    - [x] Trùng username bị chặn bởi ràng buộc duy nhất (IT)
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=UserRepositoryIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T03, H1
  - **File dự kiến:** `MIG/V1__platform_users.sql` + `SEED/V1_1__seed_users.sql`, `BE/platform/domain/User.java` (+ `UserRepository`), `BE/platform/domain/Role.java`, `BT/platform/UserRepositoryIT.java`, `docs/demo-accounts.md`
  - **Kích thước:** M

- [x] **T06 — Đăng nhập JWT, kiểm tra vai trò, CurrentUser** · `platform` · M · P0 · **xong 26/09/2026**: `oauth2-resource-server` HS256 (G10), token 8 giờ, controller nhận `@AuthenticationPrincipal CurrentUser`
  - **Mô tả:** `POST /api/platform/auth/login` nhận username + mật khẩu, trả access token có claim `sub, role, companyId`. `GET /api/platform/auth/me`. `SecurityConfig` stateless; lỗi 401/403 trả JSON tiếng Việt. `CurrentUser` (id, role, companyId) có `requireRole(...)` và `requireCompany(companyId)`, dùng cho mọi service về sau. JWT secret lấy từ biến môi trường. Đề xuất mặc định để hỏi: dùng `spring-boot-starter-oauth2-resource-server` (Nimbus, thuộc hệ Spring) thay cho thư viện JWT bên thứ ba.
  - **Tiêu chí nghiệm thu:**
    - [x] Sai mật khẩu → 401 kèm thông báo tiếng Việt; đúng → token; `/auth/me` trả đúng vai trò và companyId (IT)
    - [x] Token `COMPANY_MANAGER` gọi endpoint chỉ dành cho `COMMUNE_OFFICER` → 403 (IT, dùng một endpoint thử trong test)
    - [x] Không có secret trong mã nguồn; thiếu `JWT_SECRET` thì ứng dụng không khởi động
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=AuthIT`
    - [x] `cd backend && ./mvnw verify`; thủ công: đăng nhập qua API như Swagger gọi (login `admin` → `/me`); Swagger có nút Authorize (bearer)
  - **Phụ thuộc:** T05
  - **File dự kiến:** `BE/platform/security/{SecurityConfig,JwtService,CurrentUser}.java`, `BE/platform/api/AuthController.java` (+ DTO), `BT/platform/AuthIT.java`
  - **Kích thước:** M

- [x] **T07 — AuditLog và AuditService** · `platform` · M · P0 · **xong 26/09/2026**: `record` bắt buộc chạy trong transaction có sẵn (MANDATORY); trigger chặn UPDATE/DELETE; có `recordSystem` cho tác vụ tự động
  - **Mô tả:** Tạo `MIG/V2__audit_logs.sql` và entity `AuditLog` (thời gian, actorId, vai trò, hành động, loại đối tượng, id đối tượng, dữ liệu trước/sau dạng `jsonb`). `AuditService.record(actor, action, objectType, objectId, before, after)` ghi trong cùng transaction với thao tác nghiệp vụ. Từ task này trở đi, mọi service tạo/sửa tiền phải gọi nó. Chưa có màn xem (xem T52).
  - **Tiêu chí nghiệm thu:**
    - [x] Ghi đủ trường, trước/sau lưu dạng JSON (IT)
    - [x] Transaction nghiệp vụ rollback thì bản ghi audit cũng rollback (IT)
    - [x] Actor lấy từ `CurrentUser`, không lấy từ tham số client gửi lên
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=AuditServiceIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T06
  - **File dự kiến:** `MIG/V2__audit_logs.sql`, `BE/platform/domain/AuditLog.java` (+ repo), `BE/platform/service/AuditService.java`, `BT/platform/AuditServiceIT.java`
  - **Kích thước:** M

- [x] **T08 — Web: đăng nhập, layout và menu theo vai trò** · `platform` · M · P0 · **xong 26/09/2026** (tự động + kiểm qua proxy); còn kiểm bằng mắt trên trình duyệt, và `dv01` sau T09
  - **Mô tả:** Trang đăng nhập; `AuthProvider` lưu token (sessionStorage) và gọi `/auth/me`; `RequireRole` bảo vệ route; `RoleLayout` (AntD Layout) hiển thị menu theo vai trò, danh mục lấy từ prototype-inventory §3. Màn nào chưa làm thì trỏ tới trang "Đang xây dựng". Người đi thu dùng layout mobile, hoàn thiện ở T27. Gặp 401 thì quay về đăng nhập; vào route của vai trò khác thì ra trang 403.
  - **Tiêu chí nghiệm thu:**
    - [x] Đăng nhập lần lượt 4 vai trò nội bộ, mỗi vai trò thấy đúng menu (test `menuConfig` + kiểm tra tay; tay mới kiểm `admin`, `canbo_xa` qua API)
    - [x] Vào URL của vai trò khác → trang 403; token hết hạn/sai → về trang đăng nhập
    - [x] Form đăng nhập báo lỗi tiếng Việt khi sai mật khẩu (test component)
  - **Kiểm chứng:**
    - [x] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: `npm run dev`, đăng nhập `admin`, `canbo_xa` (và `dv01` sau T09) — chờ người dùng xem trên trình duyệt
  - **Phụ thuộc:** T04, T06
  - **File dự kiến:** `WEB/app/auth/{AuthProvider,LoginPage,RequireRole}.tsx`, `WEB/app/layout/{RoleLayout.tsx,menuConfig.ts}`, `WEB/app/layout/menuConfig.test.ts`
  - **Kích thước:** M

- [x] **T09 — Địa bàn, khu vực, công ty: seed, API đọc, phạm vi dữ liệu công ty** · `master-data` · M · P0 · **xong 26/09/2026**: công ty ngoài phạm vi trả 404 (không lộ tồn tại); khu vực đọc được với mọi vai trò nội bộ (lọc theo phân công ở T13)
  - **Mô tả:** Tạo `MIG/V3__masterdata_districts_areas_companies.sql` (thêm FK `users.company_id`) và các entity `District`, `Area` (thuộc District), `Company` (tên, đầu mối, SĐT, trạng thái, hiệu lực). Seed `V3_1`: 3 địa bàn DTH/TTT/NB, 24 tổ KV01–KV24, 11 công ty DV01–DV11 (tên theo prototype-inventory §0, SĐT giả). Seed `V3_2`: tài khoản `dv01`…`dv11` (COMPANY_MANAGER). API: `GET /api/masterdata/districts`, `/areas`, `/companies`, `/companies/{id}`. Quản lý công ty chỉ đọc được công ty của mình. Đây là nơi chứng minh tiêu chí "công ty A không đọc được dữ liệu công ty B" của SPEC §9.2.
  - **Tiêu chí nghiệm thu:**
    - [x] Profile demo có đủ 3 địa bàn, 24 tổ, 11 công ty, 11 tài khoản công ty (IT trên seed)
    - [x] `dv01` gọi `GET /companies/DV02` → 403 hoặc 404 (IT phạm vi)
    - [x] Cán bộ xã và quản trị đọc được tất cả
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=MasterDataScopeIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T06, H1
  - **File dự kiến:** `MIG/V3__…sql` + `SEED/V3_1__seed_areas_companies.sql` + `SEED/V3_2__seed_company_users.sql`, `BE/masterdata/domain/{District,Area,Company}.java` (+ repo), `BE/masterdata/api/MasterDataController.java` (+ DTO), `BE/masterdata/service/MasterDataQueryService.java`, `BT/masterdata/MasterDataScopeIT.java`
  - **Kích thước:** M (3 cặp entity + repo tính theo quy ước)

- [x] **T10 — Biểu giá theo phiên bản và loại phí** · `master-data` · M · P0 · **xong 26/09/2026**: 2 thành phần thu gom + xử lý (G9, giữ theo quyết định Q65), không có `BULKY` (G13); `activeVersionOn` chọn bản đã ban hành theo hiệu lực, có `rateOn(date, group)`
  - **Mô tả:** Tạo `MIG/V4__tariffs_fee_types.sql` và các entity `TariffVersion` (mã, căn cứ pháp lý, hiệu lực từ/đến, trạng thái), `TariffRate` (nhóm giá, thu gom, vận chuyển, xử lý, VAT, tổng/tháng; tổng phải bằng tổng các thành phần), `FeeType` (`ENV`, `BULKY`, `EXTRA`, có giá mặc định). Seed QĐ 65/2026/QĐ-UBND với 4 nhóm giá (tổng theo prototype 40.000 / 80.000 / 119.000 / 1.266.000). Thành phần giá lấy theo trả lời G9; chưa có trả lời thì dừng. `TariffService.activeVersionOn(date)`. API đọc (`GET /api/masterdata/tariffs`, `/fee-types`).
  - **Tiêu chí nghiệm thu:**
    - [x] `activeVersionOn(date)` trả đúng phiên bản theo hiệu lực, ngoài mọi hiệu lực thì báo lỗi rõ ràng (unit test)
    - [x] Seed QĐ 65/2026 có 4 nhóm, tổng khớp thành phần (IT)
    - [x] API đọc biểu giá + loại phí trả DTO, không trả entity
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=TariffServiceTest`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T07, H1
  - **File dự kiến:** `MIG/V4__…sql` + `SEED/V4_1__seed_tariff_qd65.sql`, `BE/masterdata/domain/{TariffVersion,TariffRate,FeeType}.java` (+ repo), `BE/masterdata/service/TariffService.java`, `BE/masterdata/api/TariffController.java`, `BT/masterdata/TariffServiceTest.java`
  - **Kích thước:** M

- [ ] **CP1 — Checkpoint cuối tuần 1 (29/09)**
  - [ ] `cd backend && ./mvnw verify` xanh; `cd web && npm run lint && npm run test && npm run build` xanh
  - [ ] `docker compose up -d db` + `./mvnw spring-boot:run` chạy trên seed; Swagger có auth, districts, areas, companies, tariffs
  - [ ] Web: đăng nhập `admin`, `canbo_xa`, `dv01` ra đúng menu; API sai vai trò → 403; `dv01` đọc DV02 → 403/404
  - [ ] Người dùng xem kết quả; xác nhận H2 sẽ xong trước 02/10

---

## Tuần 2 — Danh mục, lập khoản, bắt đầu thu (30/09 – 06/10)

- [x] **T11 — Kỳ thu tháng/quý và vòng đời trạng thái (backend)** · `master-data` · M · P0 · **[TDD]** · **xong 26/09/2026**: `ADMIN` mở kỳ và bắt đầu thu (G1); trùng kỳ 409, chuyển sai 422; ngày mở mặc định = ngày đầu kỳ
  - **Mô tả:** Tạo `MIG/V5__collection_periods.sql` và entity `CollectionPeriod` (mã `2026-10` hoặc `2026-Q4`, loại MONTH/QUARTER, ngày mở, hạn công ty nộp xã, phiên bản biểu giá, trạng thái `OPEN → COLLECTING → LOCKED`, lockedAt/lockedBy). `PeriodService`: `open(type, month|quarter, dueDate)` gắn phiên bản biểu giá đang hiệu lực (T10); `startCollecting`; truy vấn kỳ theo ngày. Chuyển sang `LOCKED` thuộc T32. Test viết trước: mở tháng; mở quý; mở trùng kỳ bị chặn; chuyển trạng thái sai (vd. COLLECTING → OPEN) → 422; phiên bản biểu giá gắn đúng. Mọi thao tác ghi audit. Ai được mở/khóa kỳ theo trả lời G1; mặc định để hỏi: `ADMIN` mở kỳ (§10 bước 1).
  - **Tiêu chí nghiệm thu:**
    - [x] Test đơn vị cho 5 trường hợp trên viết trước và xanh
    - [x] API `POST /api/masterdata/periods`, `POST /periods/{id}/start`, `GET /periods`; sai vai trò → 403 (IT)
    - [x] Mở kỳ có bản ghi audit
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=PeriodServiceTest,PeriodApiIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T10
  - **File dự kiến:** `MIG/V5__collection_periods.sql`, `BE/masterdata/domain/CollectionPeriod.java` (+ repo), `BE/masterdata/service/PeriodService.java`, `BE/masterdata/api/PeriodController.java` (+ DTO), `BT/masterdata/{PeriodServiceTest,PeriodApiIT}.java`
  - **Kích thước:** M

- [x] **T12 — Web quản trị: biểu giá và kỳ thu** · `master-data` · M · P0 (§10 bước 1) · **xong 26/09/2026** (test tự động; còn xem bằng mắt): màn `/admin/config` 2 tab Kỳ thu / Biểu giá
  - **Mô tả:** Màn cấu hình của quản trị: bảng phiên bản biểu giá (chỉ xem, có chi tiết 4 nhóm giá); danh sách kỳ thu; form "Mở kỳ" (chọn tháng/quý, hạn nộp; phiên bản biểu giá tự hiện); nút "Bắt đầu thu". Tham chiếu UI: `prototype/` màn quản trị config.
  - **Tiêu chí nghiệm thu:**
    - [x] Quản trị mở được kỳ 10/2026 (tháng) theo QĐ 65/2026 từ giao diện (test trang với API giả lập)
    - [x] Form validation (thiếu tháng/hạn nộp, hạn trước ngày mở) có test component
    - [x] Lỗi 422 từ backend (mở trùng kỳ) hiện đúng thông báo tiếng Việt (backend trả 409 cho trùng kỳ, xem T11)
  - **Kiểm chứng:**
    - [x] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: đăng nhập `admin`, mở kỳ 10/2026, bấm "Bắt đầu thu" — chờ người dùng
  - **Phụ thuộc:** T08, T11
  - **File dự kiến:** `WEB/features/masterdata/PeriodsPage/{PeriodsPage.tsx,OpenPeriodForm.tsx,OpenPeriodForm.test.tsx}`, `WEB/features/masterdata/TariffsPage/TariffsPage.tsx`, `WEB/features/masterdata/api.ts`
  - **Kích thước:** M

- [x] **T13 — Phân công khu vực có hiệu lực và lưu lịch sử (backend)** · `master-data` · M · P0 · **[TDD]** · **xong 26/09/2026**: exclusion constraint (btree_gist) + kiểm tra ở service; đổi công ty phát `AreaReassignedEvent` để T20 kết thúc phân tổ cũ (G14); thêm `GET /area-assignments?date` cho T14
  - **Mô tả:** Tạo `MIG/V6__area_assignments.sql` và entity `AreaAssignment` (khu vực, công ty, từ ngày, đến ngày có thể null, ghi chú). `AreaAssignmentService.assign(areaIds[], companyId, fromDate, note)`: tự đóng phân công cũ (đến ngày = fromDate − 1), tạo bản ghi mới, giữ lịch sử. Mỗi khu vực tối đa 1 công ty trong cùng khoảng hiệu lực. `companyOf(areaId, date)` dùng cho billing và remittance. Seed `V6_1` theo prototype-inventory §0 (KV24 chưa có công ty). Test viết trước: phân công mới; đổi công ty giữ lịch sử và `companyOf` ngày cũ vẫn trả công ty cũ; phân công chồng lấn bị chặn; phân công nhiều tổ một lần; fromDate trước phân công hiện tại → 422. Có ghi audit.
  - **Tiêu chí nghiệm thu:**
    - [x] 5 test đơn vị trên viết trước và xanh
    - [x] `POST /api/masterdata/area-assignments` (chỉ COMMUNE_OFFICER), `GET /areas/{id}/assignments` trả lịch sử (IT)
    - [x] Ràng buộc chống chồng lấn có ở cả service lẫn CSDL (exclusion constraint hoặc kiểm tra trong transaction), có IT
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=AreaAssignmentServiceTest,AreaAssignmentIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T09, T07
  - **File dự kiến:** `MIG/V6__area_assignments.sql` + `SEED/V6_1__seed_assignments.sql`, `BE/masterdata/domain/AreaAssignment.java` (+ repo), `BE/masterdata/service/AreaAssignmentService.java`, `BE/masterdata/api/AreaAssignmentController.java`, `BT/masterdata/{AreaAssignmentServiceTest,AreaAssignmentIT}.java`
  - **Kích thước:** M

- [x] **T14 — Web: danh sách khu vực và popup phân công** · `master-data` · M · P0 (§10 bước 2) · **xong 26/09/2026** (test tự động; còn xem bằng mắt). Cột số hộ thêm ở T16 khi có đối tượng
  - **Mô tả:** Màn khu vực của cán bộ xã: bảng 24 tổ (địa bàn, công ty hiện tại, từ ngày, số hộ), lọc "chưa có công ty". Popup phân công: chọn một hay nhiều tổ, chọn công ty, ngày bắt đầu, ghi chú. Xem lịch sử phân công của một tổ.
  - **Tiêu chí nghiệm thu:**
    - [x] Phân công KV24 cho một công ty bằng popup; bảng cập nhật; lịch sử KV24 có bản ghi mới
    - [x] Validation popup (chưa chọn tổ/công ty/ngày) có test component
    - [x] Lỗi chồng lấn từ backend hiện thông báo tiếng Việt
  - **Kiểm chứng:**
    - [x] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: đăng nhập `canbo_xa`, phân công KV24 — chờ người dùng
  - **Phụ thuộc:** T08, T13
  - **File dự kiến:** `WEB/features/masterdata/AreasPage/{AreasPage.tsx,AssignAreaModal.tsx,AssignAreaModal.test.tsx,AssignmentHistoryDrawer.tsx}`, `WEB/features/masterdata/api.ts`
  - **Kích thước:** M

- [x] **T15 — Đối tượng và hợp đồng (backend) kèm seed hộ giả** · `master-data` · M · P0 · **xong 26/09/2026**: 227 hộ giả; mã và số đăng ký tự sinh; không tạo cột số định danh (mức Thật, nhạy cảm); `AreaDto.subjectCount`
  - **Mô tả:** Tạo `MIG/V7__service_subjects_contracts.sql` và hai entity `ServiceSubject` (mã `DTH-H000128`, loại HGĐ/HKD/DN, tên, địa chỉ, SĐT, khu vực, trạng thái) và `ServiceContract` (số hợp đồng, đối tượng, nhóm giá → `TariffRate` group, từ ngày, đến ngày, miễn 100% + lý do). `SubjectService`: CRUD; mỗi đối tượng tối đa 1 hợp đồng hiệu lực tại một thời điểm; API trả DTO gộp "hồ sơ hộ". Seed `V7_1`: khoảng 150–300 hộ **giả** chia đều 24 tổ, có đủ các trường hợp (miễn, không hợp đồng, đã chấm dứt), trong đó có `DTH-H000128` ở KV07 (DV01). Có ghi audit. Chạm O3: chỉ dùng trường đã duyệt ở H1.
  - **Tiêu chí nghiệm thu:**
    - [x] Tạo/sửa/xem/ngừng đối tượng + hợp đồng qua API (IT)
    - [x] Tạo hợp đồng thứ hai chồng hiệu lực → 422 (unit test)
    - [x] Seed có `DTH-H000128`; không có tên/SĐT/địa chỉ thật
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=SubjectServiceTest,SubjectApiIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T09, T10, T07
  - **File dự kiến:** `MIG/V7__…sql` + `SEED/V7_1__seed_subjects.sql`, `BE/masterdata/domain/{ServiceSubject,ServiceContract}.java` (+ repo), `BE/masterdata/service/SubjectService.java`, `BE/masterdata/api/SubjectController.java` (+ DTO), `BT/masterdata/{SubjectServiceTest,SubjectApiIT}.java`
  - **Kích thước:** M

- [x] **T16 — Web: hồ sơ hộ (danh sách + form gộp đối tượng/hợp đồng)** · `master-data` · M · P1 · **xong 26/09/2026** (test tự động; còn xem bằng mắt). Thêm cột số hộ ở màn khu vực
  - **Mô tả:** Màn đối tượng của cán bộ xã: bảng có lọc theo tổ/loại/trạng thái, tìm theo mã/tên. Form hồ sơ hộ gồm hai khối "Thông tin hộ" và "Hợp đồng" trên cùng một form, ghi xuống hai API. Cờ miễn 100% chỉ hiển thị, giống prototype. Nếu người dùng chọn C6 thì bỏ lọc nâng cao.
  - **Tiêu chí nghiệm thu:**
    - [x] Tạo hộ mới kèm hợp đồng; sửa thông tin; ngừng cung cấp dịch vụ
    - [x] Validation form (SĐT, ngày hợp đồng, nhóm giá bắt buộc khi có hợp đồng) có test component
    - [x] Tiền và ngày dùng `MoneyText`, `DateText`
  - **Kiểm chứng:**
    - [x] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: tạo một hộ ở KV24, mở lại thấy đủ hai khối — chờ người dùng
  - **Phụ thuộc:** T08, T15
  - **File dự kiến:** `WEB/features/masterdata/SubjectsPage/{SubjectsPage.tsx,SubjectProfileForm.tsx,SubjectProfileForm.test.tsx}`, `WEB/features/masterdata/api.ts`
  - **Kích thước:** M

- [x] **T17 — Quy tắc tính khoản phải thu** · `billing` · S · P0 · **[TDD]** · **xong 26/09/2026**: hợp đồng và công ty xét tại ngày phát hành (G3); không có BULKY (G13); miễn 100% áp cho mọi loại phí như prototype R1
  - **Mô tả:** Lớp thuần `ChargeCalculator` + `ChargeEligibility` (không đụng CSDL). Quy tắc R1–R4: số tiền phí `ENV` = giá tháng của nhóm (theo phiên bản biểu giá của kỳ) × (quý ? 3 : 1); phí khác = giá nhập, nếu không nhập thì lấy giá mặc định; miễn 100% → 0. Bỏ qua (kèm lý do) các đối tượng: không active; không có hợp đồng hiệu lực; khu vực chưa có công ty (cảnh báo); đã có khoản cùng loại phí ở kỳ chồng lấn (tháng nằm trong quý và ngược lại). Chỉ lập khoản cho kỳ chưa khóa. Test viết trước cho **mỗi** quy tắc và mỗi lý do bỏ qua.
  - **Tiêu chí nghiệm thu:**
    - [x] Test đơn vị bao đủ R1–R4: tháng, quý, miễn, phí khác có/không giá nhập, 4 lý do bỏ qua, kỳ đã khóa
    - [x] Tiền là `long`, không có phép tính số thực
    - [x] Coverage dòng của 2 lớp này = 100% (cả nhánh)
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=ChargeCalculatorTest,ChargeEligibilityTest`
  - **Phụ thuộc:** T11, T13, T15
  - **File dự kiến:** `BE/billing/service/{ChargeCalculator,ChargeEligibility}.java`, `BT/billing/{ChargeCalculatorTest,ChargeEligibilityTest}.java`
  - **Kích thước:** S

- [x] **T18 — Phiếu yêu cầu thu: xem trước và phát hành (backend)** · `billing` · M · P0 · **[TDD]** · **xong 26/09/2026**: mã khoản giữ mã đối tượng đầy đủ `KT-1026-DTH-H000128` (tránh trùng giữa địa bàn); phát hành 0 khoản mới thì không lưu phiếu (HTTP 200); ngày phát hành lấy từ bean `Clock`
  - **Mô tả:** Tạo `MIG/V8__charge_requests_charges.sql` và hai entity: `ChargeRequest` (mã `YCT-…`, kỳ, loại phí, phạm vi **có cấu trúc**: toàn xã / danh sách tổ / theo công ty, hạn đóng, ghi chú, người lập) và `Charge` (đối tượng, hợp đồng, kỳ, loại phí, số tiền snapshot, hạn, trạng thái `UNPAID/PAID/EXEMPT`; "Quá hạn" tính khi đọc, không lưu; công ty snapshot theo trả lời G3). `ChargeRequestService.preview(cmd)` trả số khoản sẽ sinh, tổng tiền, danh sách bỏ qua kèm lý do. `publish(cmd)` sinh khoản trong một transaction, idempotent (ràng buộc duy nhất subject + loại phí + kỳ), ghi audit. API `POST /api/billing/charge-requests/preview`, `POST /api/billing/charge-requests`, `GET /api/billing/charges?periodId&areaId&status`.
  - **Tiêu chí nghiệm thu:**
    - [x] Xem trước và phát hành toàn xã kỳ 10/2026 cho cùng số khoản và cùng tổng tiền (IT)
    - [x] Phát hành lại cùng kỳ và loại phí không sinh khoản trùng; kết quả báo "0 khoản mới" (IT)
    - [x] Kỳ đã khóa → 422; không phải COMMUNE_OFFICER → 403 (IT)
  - **Kiểm chứng:**
    - [x] `cd backend && ./mvnw test -Dtest=ChargeRequestServiceIT`
    - [x] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T17
  - **File dự kiến:** `MIG/V8__…sql`, `BE/billing/domain/{ChargeRequest,Charge}.java` (+ repo), `BE/billing/service/ChargeRequestService.java`, `BE/billing/api/BillingController.java` (+ DTO), `BT/billing/ChargeRequestServiceIT.java`
  - **Kích thước:** M

- [ ] **T19 — Web: phiếu yêu cầu thu và danh sách khoản** · `billing` · M · P0 (§10 bước 2)
  - **Mô tả:** Màn khoản thu của cán bộ xã có 2 tab. Tab "Phiếu YCT": form (kỳ, loại phí, phạm vi toàn xã / chọn tổ / theo công ty, hạn đóng, ghi chú), bước **Xem trước** (số khoản, tổng tiền, bảng bỏ qua kèm lý do), rồi bước **Phát hành**. Tab "Khoản thu": bảng lọc theo kỳ/tổ/trạng thái, trạng thái "Quá hạn" tính theo hạn.
  - **Tiêu chí nghiệm thu:**
    - [ ] Lập phiếu YCT toàn xã → xem trước → phát hành; danh sách khoản hiện đúng số lượng
    - [ ] Validation form phiếu YCT (phạm vi rỗng, hạn trước ngày mở kỳ) có test component
    - [ ] Phát hành lần hai báo "không có khoản mới", không lỗi
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: §10 bước 2 trên web
  - **Phụ thuộc:** T08, T18
  - **File dự kiến:** `WEB/features/billing/ChargeRequestPage/{ChargeRequestForm.tsx,ChargeRequestForm.test.tsx,PreviewPanel.tsx}`, `WEB/features/billing/ChargesPage/ChargesPage.tsx`, `WEB/features/billing/api.ts`
  - **Kích thước:** M

- [ ] **T20 — Phân tổ cho người đi thu và danh sách hộ theo phạm vi (backend)** · `collection` · M · P0 · **[cần hỏi trước: G14]**
  - **Mô tả:** Tạo `MIG/V9__collector_assignments.sql` và entity `CollectorAssignment` (người đi thu, khu vực, từ ngày, đến ngày). Schema cho phép nhiều–nhiều (O4); seed `V9_1` có 1 người/tổ cho các tổ đã có công ty, gồm tài khoản COLLECTOR giả. Công ty chỉ phân tổ **thuộc mình** (dùng `companyOf` của T13) cho người đi thu **của mình**. `GET /api/collection/my-charges?periodId` cho người đi thu chỉ trả khoản của hộ thuộc tổ được giao; `GET /api/collection/company-charges` cho công ty. Có ghi audit.
  - **Tiêu chí nghiệm thu:**
    - [ ] Người đi thu chỉ thấy hộ trong tổ được giao; gọi hộ ngoài tổ → 403/404 (IT phạm vi, SPEC §7)
    - [ ] Công ty A phân tổ của công ty B hoặc dùng người đi thu của B → 403 (IT)
    - [ ] Schema nhiều–nhiều: một người hai tổ và một tổ hai người đều lưu được (IT)
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CollectorAssignmentIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T13, T18
  - **File dự kiến:** `MIG/V9__…sql` + `SEED/V9_1__seed_collectors.sql`, `BE/collection/domain/CollectorAssignment.java` (+ repo), `BE/collection/service/CollectorAssignmentService.java`, `BE/collection/api/CollectionController.java` (+ DTO), `BT/collection/CollectorAssignmentIT.java`
  - **Kích thước:** M

- [ ] **T21 — Ghi nhận kết quả thu: Payment, CollectionVisit, chống ghi trùng** · `collection` · M · P0 · **[TDD]** · **[cần hỏi trước: G4]**
  - **Mô tả:** Tạo `MIG/V10__payments_visits.sql` và hai entity: `Payment` (khoản, số tiền, hình thức `CASH/TRANSFER/CITIZEN_APP`, thời điểm, người xác nhận, `requestId` duy nhất để chống trùng) và `CollectionVisit` (khoản, kết quả `ABSENT/APPOINTMENT/REFUSED`, ngày hẹn lại, ghi chú, người ghi). `CollectionService.recordPayment(...)`: khoản chuyển `PAID` khi Σ thanh toán ≥ số tiền; gửi lại cùng `requestId` trả kết quả cũ, không tạo thanh toán thứ hai; chặn khi kỳ đã khóa hoặc khoản đã miễn; người đi thu chỉ ghi cho khoản trong tổ mình, công ty ghi thay cho hộ của mình. Test viết trước cho từng quy tắc. Thanh toán một phần/thu thừa theo trả lời G4. Có ghi audit. Phương thức `CITIZEN_APP` để sẵn cho T40.
  - **Tiêu chí nghiệm thu:**
    - [ ] Test đơn vị: đủ tiền → PAID; gửi trùng `requestId` → 1 Payment; kỳ khóa → 422; khoản miễn → 422; vắng/hẹn/từ chối không đổi trạng thái khoản
    - [ ] IT: ghi nhận qua API với token người đi thu; khoản ngoài tổ → 403/404
    - [ ] Bản ghi audit có trước/sau trạng thái khoản
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CollectionServiceTest,CollectionApiIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T20
  - **File dự kiến:** `MIG/V10__…sql`, `BE/collection/domain/{Payment,CollectionVisit}.java` (+ repo), `BE/collection/service/CollectionService.java`, `BE/collection/api/CollectionController.java`, `BT/collection/{CollectionServiceTest,CollectionApiIT}.java`
  - **Kích thước:** M

- [x] **H2 — [NGƯỜI DÙNG] Duyệt data dictionary Phần B** · mục tiêu 02/10 · **đã duyệt 24/09/2026**
  - Duyệt notifications, complaints, citizen-app, CollectionSchedule; trả lời G6, G7, G12, xác nhận mặc định O1, O5, O6, O7.
  - **Chặn:** T23, T36, T38, T39, T45, T47.
  - **Phụ thuộc:** T01

- [ ] **T22 — Khung mobile Expo gọi được API từ điện thoại** · `platform` · L (scaffold) · P0 · **[cần hỏi trước: G10 `expo-secure-store`]**
  - **Mô tả:** Khởi tạo `mobile/` bằng Expo SDK (ghim phiên bản) + TypeScript + Expo Router + TanStack Query. `MOB/src/api/client.ts` đọc base URL từ `EXPO_PUBLIC_API_URL` (IP LAN của laptop). Script `gen:api` (openapi-typescript). Jest tối thiểu. Một màn "Kiểm tra kết nối" gọi `GET /v3/api-docs` hoặc endpoint health. Task này nằm ở tuần 2 để phát hiện sớm rủi ro R6 (mạng LAN/SDK).
  - **Tiêu chí nghiệm thu:**
    - [ ] `npx expo start`, quét QR bằng Expo Go trên điện thoại thật, màn "Kiểm tra kết nối" báo thành công
    - [ ] `npm test` xanh với ít nhất 1 test cho client
    - [ ] Ghi cách chạy (IP LAN / `--tunnel`) vào `mobile/README.md`
  - **Kiểm chứng:**
    - [ ] `cd mobile && npm install && npm run gen:api && npm test`
    - [ ] Thủ công: `cd mobile && npx expo start` trên điện thoại
  - **Phụ thuộc:** T03 (T06 nếu muốn thử đăng nhập)
  - **File dự kiến:** `mobile/package.json`, `mobile/app.json`, `MOB/app/_layout.tsx`, `MOB/app/index.tsx`, `MOB/src/api/client.ts` + test, `mobile/README.md`
  - **Kích thước:** L. Scaffold.

- [ ] **T23 — Notifications backend: phát, đọc theo phạm vi, đánh dấu đã đọc** · `notifications` · M · P0
  - **Mô tả:** Tạo `MIG/V11__notifications.sql` và entity `Notification` (người nhận: vai trò / công ty / người dùng / người dân; loại `REMINDER/COMPLAINT/RECEIPT/INFO/TRANSACTION`; tiêu đề, nội dung, liên kết, thời gian, đã đọc). Chốt **hợp đồng** `NotificationService.publish(NotificationCommand)` để T34, T35, T36, T40, T45 gọi. `GET /api/notifications` (của người đang đăng nhập, theo vai trò + công ty + user), `GET /unread-count`, `POST /{id}/read`. Cách lưu "đã đọc" cho thông báo gửi theo vai trò (bảng đọc theo user) quyết định ở H2.
  - **Tiêu chí nghiệm thu:**
    - [ ] Thông báo gửi cho công ty DV01 thì `dv02` không thấy (IT phạm vi)
    - [ ] Thông báo gửi theo vai trò thì mọi user của vai trò thấy; mỗi user có trạng thái đã đọc riêng (IT)
    - [ ] `unread-count` đúng sau khi đánh dấu đọc
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=NotificationServiceIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T06, H2
  - **File dự kiến:** `MIG/V11__notifications.sql`, `BE/notification/domain/Notification.java` (+ repo), `BE/notification/service/NotificationService.java`, `BE/notification/api/NotificationController.java` (+ DTO), `BT/notification/NotificationServiceIT.java`
  - **Kích thước:** M

- [ ] **CP2 — Checkpoint cuối tuần 2 (06/10)**
  - [ ] `cd backend && ./mvnw verify` xanh; web lint/test/build xanh; `cd mobile && npm test` xanh
  - [ ] §10 bước 1–2 chạy trên web: `admin` mở kỳ 10/2026; `canbo_xa` phân công KV24 bằng popup; lập phiếu YCT toàn xã → xem trước → phát hành; phát hành lại không sinh trùng
  - [ ] §10 bước 3 (backend) chạy qua Swagger: DV01 phân tổ; người đi thu ghi 2 tiền mặt + 1 vắng; gửi trùng không tạo 2 thanh toán
  - [ ] Expo Go trên điện thoại gọi được API
  - [ ] **Go/no-go phạm vi:** nếu còn nợ từ 2 task P0 trở lên, người dùng chọn mục cắt trong plan.md §7

---

## Tuần 3 — Hoàn tất luồng tiền, thông báo, khiếu nại backend (07/10 – 13/10)

- [ ] **T24 — Sổ công ty–kỳ (CompanyLedgerService): nguồn số liệu duy nhất** · `remittance` · M · P0 · **[TDD]** · **[cần hỏi trước: G3, G4; O2 mặc định "công ty nộp toàn bộ"]**
  - **Mô tả:** Service chỉ đọc, tính cho mỗi (công ty, kỳ): **phải thu** (Σ khoản của các tổ công ty phụ trách **tại kỳ phát sinh**, không dùng phân công hiện tại, đây là sửa lỗi R6 của prototype); **công ty đã thu** (R8, theo G4); **đã nộp về xã** (Σ phiếu thu, R7, trả 0 cho tới khi T26 xong); **còn phải nộp**; **nợ kỳ trước**; **quá hạn** khi hạn kỳ < hôm nay (R9–R11). Có thêm trạng thái tiến độ (R13: Chưa có công ty / Đã nộp đủ / Quá hạn nộp / Nộp một phần / Chưa nộp; cờ < 45%) và trạng thái đối soát (R14: chênh lệch = đã nộp − đã thu; Khớp / Đang nộp / Lệch). "Hôm nay" lấy qua `Clock` inject để test được. Test viết trước, gồm ca **đổi công ty giữa các kỳ**: kỳ cũ vẫn tính cho công ty cũ.
  - **Tiêu chí nghiệm thu:**
    - [ ] Test đơn vị cho từng công thức R6–R14 và mỗi nhánh trạng thái, gồm ca đổi công ty
    - [ ] `GET /api/remittance/ledger?periodId` (xã: mọi công ty; công ty: chỉ dòng của mình) (IT phạm vi)
    - [ ] Tiền `long`; kết quả tính bằng truy vấn tổng hợp, không nạp toàn bộ khoản vào bộ nhớ
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CompanyLedgerServiceTest,LedgerApiIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T13, T18, T21
  - **File dự kiến:** `BE/remittance/service/{CompanyLedgerService,LedgerStatus}.java`, `BE/remittance/api/LedgerController.java` (+ DTO), `BT/remittance/{CompanyLedgerServiceTest,LedgerApiIT}.java`
  - **Kích thước:** M

- [ ] **T25 — Tiền mặt người đi thu đang giữ và bàn giao cho công ty** · `collection` · S · P0 · **[TDD]** · **[cần hỏi trước: G5]**
  - **Mô tả:** Tạo `MIG/V12__cash_handovers.sql` và entity `CashHandover` (người đi thu, kỳ, ngày, số tiền, ghi chú, người ghi). `CashService.held(collectorId)` = Σ thanh toán tiền mặt người đó xác nhận − Σ bàn giao (R21). `handover(...)`: 0 < số tiền ≤ đang giữ (R22). Bên ghi nhận (công ty "nhận tiền mặt" hay người đi thu "bàn giao") theo trả lời G5. Có ghi audit. Test viết trước.
  - **Tiêu chí nghiệm thu:**
    - [ ] Test đơn vị: đang giữ đúng sau 2 lần thu và 1 lần bàn giao; bàn giao vượt đang giữ → 422; số tiền ≤ 0 → 422
    - [ ] API `GET /api/collection/cash/held`, `POST /api/collection/cash/handovers`; công ty không bàn giao được cho người đi thu của công ty khác (IT)
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CashServiceTest,CashApiIT`
  - **Phụ thuộc:** T21
  - **File dự kiến:** `MIG/V12__cash_handovers.sql`, `BE/collection/domain/CashHandover.java` (+ repo), `BE/collection/service/CashService.java`, `BT/collection/{CashServiceTest,CashApiIT}.java`
  - **Kích thước:** S (API gắn vào `CollectionController` có sẵn)

- [ ] **T26 — Phiếu thu công ty do xã lập (backend)** · `remittance` · M · P0 · **[TDD]** · **[cần hỏi trước: G11]**
  - **Mô tả:** Tạo `MIG/V13__company_receipts.sql` và entity `CompanyReceipt` (mã `PT-CT-MMYY-nnn`, công ty, kỳ, số tiền, hình thức, ngày, người nộp, số chứng từ, ghi chú, người lập). `CompanyReceiptService.issue(...)` theo mẫu SPEC §6: chỉ COMMUNE_OFFICER; 1 phiếu 1 kỳ, một kỳ nộp nhiều lần; 0 < số tiền ≤ `ledger.remaining` (R15); sinh mã tuần tự không trùng khi gọi đồng thời; ghi audit; kỳ đã khóa → 422. `GET` danh sách phiếu theo kỳ/công ty (công ty chỉ thấy phiếu của mình) kèm lũy kế đã nộp tới từng phiếu (R30). Sau task này ledger (T24) đọc số đã nộp thật.
  - **Tiêu chí nghiệm thu:**
    - [ ] Test đơn vị: phiếu vượt số còn nộp → 422 `RECEIPT_AMOUNT_OUT_OF_RANGE`; số tiền 0 → 422; nộp 2 lần cộng dồn đúng
    - [ ] IT: sau khi lập phiếu, `ledger` đổi "đã nộp" và "còn nộp" tương ứng; dv02 không xem được phiếu của DV01
    - [ ] Mã phiếu không trùng khi 2 yêu cầu song song (IT)
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CompanyReceiptServiceTest,CompanyReceiptIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T24, T07
  - **File dự kiến:** `MIG/V13__company_receipts.sql`, `BE/remittance/domain/CompanyReceipt.java` (+ repo), `BE/remittance/service/CompanyReceiptService.java`, `BE/remittance/api/CompanyReceiptController.java` (+ DTO), `BT/remittance/{CompanyReceiptServiceTest,CompanyReceiptIT}.java`
  - **Kích thước:** M

- [ ] **T27 — Web người đi thu (giao diện mobile): danh sách hộ, cập nhật kết quả, tiền đang giữ** · `collection` · M · P0 (§10 bước 3)
  - **Mô tả:** Layout mobile cho vai trò COLLECTOR. Danh sách hộ của tổ được giao, lọc Chưa thu / Đã thu / Hẹn / Vắng, tìm theo tên/mã. Bottom sheet cập nhật kết quả: tiền mặt / chuyển khoản / vắng / hẹn (ngày hẹn) / từ chối. Mỗi lần gửi sinh `requestId` mới; bấm lại khi mạng chậm dùng lại `requestId` cũ. Thẻ "Tiền mặt đang giữ". Tham chiếu `prototype/` màn collector. Lịch sử hộ và báo sai thông tin hộ nằm ở T53 (P2).
  - **Tiêu chí nghiệm thu:**
    - [ ] Ghi 2 hộ tiền mặt + 1 hộ vắng trên màn hình rộng 375px; danh sách và tiền đang giữ cập nhật
    - [ ] Bấm "Xác nhận" hai lần nhanh không tạo 2 thanh toán (test component kiểm `requestId` + kiểm tra tay)
    - [ ] Validation bottom sheet (ngày hẹn bắt buộc khi chọn "Hẹn") có test component
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: DevTools chế độ điện thoại, đăng nhập tài khoản người đi thu KV07
  - **Phụ thuộc:** T08, T21, T25
  - **File dự kiến:** `WEB/app/layout/CollectorLayout.tsx`, `WEB/features/collection/CollectorListPage/{CollectorListPage.tsx,ResultSheet.tsx,ResultSheet.test.tsx}`, `WEB/features/collection/api.ts`
  - **Kích thước:** M

- [ ] **T28 — Web công ty: phân tổ cho người đi thu, danh sách hộ được giao** · `collection` · M · P0 (§10 bước 3)
  - **Mô tả:** Màn "Hộ được giao" của công ty: danh sách hộ các tổ mình phụ trách trong kỳ (lọc theo tổ, trạng thái, người đi thu); cập nhật kết quả thay người đi thu (dùng lại `ResultSheet` của T27). Màn "Phân tổ": bảng tổ → người đi thu, form gán/đổi người đi thu.
  - **Tiêu chí nghiệm thu:**
    - [ ] `dv01` phân KV07 cho một người đi thu; người đó đăng nhập thấy hộ KV07
    - [ ] `dv01` chỉ thấy tổ và hộ của DV01
    - [ ] Validation form phân tổ có test component
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: đăng nhập `dv01`
  - **Phụ thuộc:** T08, T20, T27
  - **File dự kiến:** `WEB/features/collection/CompanyHouseholdsPage/CompanyHouseholdsPage.tsx`, `WEB/features/collection/CollectorAssignPage/{CollectorAssignPage.tsx,AssignCollectorForm.tsx,AssignCollectorForm.test.tsx}`
  - **Kích thước:** M

- [ ] **T29 — Web công ty: tổng quan tiến độ, bảng người đi thu, nhận tiền mặt** · `collection` · M · P0 (§10 bước 3)
  - **Mô tả:** Màn tổng quan của công ty: vòng tiến độ (đã thu / phải thu) lấy **từ API ledger T24**, không tự tính lại; bảng người đi thu (đã thu, tiền mặt đang giữ); form "Nhận tiền mặt" (≤ đang giữ); lịch sử bàn giao.
  - **Tiêu chí nghiệm thu:**
    - [ ] Số trên vòng tiến độ bằng dòng DV01 trong API ledger cùng kỳ
    - [ ] Nhận tiền mặt xong, tiền đang giữ của người đi thu giảm tương ứng; vượt → thông báo lỗi tiếng Việt
    - [ ] Validation form nhận tiền mặt có test component
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: §10 bước 3 trọn vẹn trên web
  - **Phụ thuộc:** T24, T25, T28
  - **File dự kiến:** `WEB/features/collection/CompanyOverviewPage/{CompanyOverviewPage.tsx,CashReceiveForm.tsx,CashReceiveForm.test.tsx}`, `WEB/features/remittance/useCompanyLedger.ts`
  - **Kích thước:** M

- [ ] **T30 — Web xã: lập phiếu thu công ty và in phiếu** · `remittance` · M · P0 (§10 bước 5)
  - **Mô tả:** Màn phiếu thu của cán bộ xã: danh sách công ty – kỳ với số còn phải nộp; form lập phiếu (số tiền ≤ còn nộp, hình thức, ngày, người nộp, số chứng từ); lịch sử phiếu theo công ty; bản in phiếu có **số tiền bằng chữ tiếng Việt** (R29) và lũy kế đã nộp (R30). Viết hàm `amountInWords` riêng, không thêm thư viện.
  - **Tiêu chí nghiệm thu:**
    - [ ] Lập phiếu một phần cho DV01; bản in hiện số tiền bằng chữ đúng
    - [ ] `amountInWords` có test: 0, 1.005.000, 21.000.000, 1.266.000, số có "linh"/"mươi"/"mốt"/"lăm"
    - [ ] Validation form phiếu thu (vượt số còn nộp, ≤ 0) có test component
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
    - [ ] Thủ công: lập phiếu, bấm In, xem bản in
  - **Phụ thuộc:** T08, T26
  - **File dự kiến:** `WEB/features/remittance/ReceiptsPage/{ReceiptsPage.tsx,IssueReceiptForm.tsx,IssueReceiptForm.test.tsx,ReceiptPrint.tsx}`, `WEB/shared/amountInWords.ts` + test
  - **Kích thước:** M

- [ ] **T31 — Báo cáo tiến độ và đối soát (màn xã)** · `remittance` · M · P0 (§10 bước 5)
  - **Mô tả:** Hai màn của cán bộ xã dùng chung API ledger T24. **Tiến độ:** theo công ty và theo tổ, trạng thái R13, cờ < 45%, nợ kỳ trước. **Đối soát:** phải thu / công ty đã thu / đã nộp về xã / chênh lệch, trạng thái Khớp / Đang nộp / Lệch. Thêm một IT backend so dữ liệu 3 nơi (tiến độ, đối soát, dòng công ty) cho cùng kỳ.
  - **Tiêu chí nghiệm thu:**
    - [ ] Sau khi lập phiếu một phần cho DV01, cả hai màn hiện "Đang nộp" / "Nộp một phần" đúng
    - [ ] IT: tổng của tiến độ = đối soát = ledger phía công ty cho cùng kỳ (tiêu chí SPEC §9.6)
    - [ ] Màn hiển thị tiền bằng `MoneyText`, có lọc theo kỳ
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=LedgerConsistencyIT`
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
  - **Phụ thuộc:** T24, T26, T08
  - **File dự kiến:** `WEB/features/remittance/ProgressPage/ProgressPage.tsx`, `WEB/features/remittance/ReconciliationPage/ReconciliationPage.tsx`, `WEB/features/remittance/useCompanyLedger.ts`, `BT/remittance/LedgerConsistencyIT.java`
  - **Kích thước:** M

- [ ] **T32 — Khóa kỳ: chặn khi còn nợ, cấm sửa sau khóa** · `remittance` · M · P0 (§10 bước 8) · **[TDD]** · **[cần hỏi trước: G1, G15]**
  - **Mô tả:** `PeriodLockService.lock(periodId)`: dùng ledger để chặn khi còn công ty nợ, trả lỗi 422 liệt kê công ty và số nợ (R19); khóa thành công thì đặt `LOCKED` qua service public của master-data. Viết `PeriodGuard.requireOpen(periodId)` (master-data) và gọi trong billing publish, collection recordPayment/handover, remittance issue receipt: sau khóa không sửa được khoản, thanh toán, phiếu thu của kỳ. Thêm nút "Khóa kỳ" trên màn kỳ thu (vai trò theo G1). Test viết trước.
  - **Tiêu chí nghiệm thu:**
    - [ ] Test đơn vị: còn nợ → 422 kèm danh sách công ty; hết nợ → khóa được
    - [ ] IT: sau khóa, phát hành YCT, ghi thanh toán, lập phiếu thu cho kỳ đó đều → 422
    - [ ] Web: bấm khóa khi còn nợ hiện lý do rõ ràng bằng tiếng Việt
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=PeriodLockServiceTest,PeriodLockIT`
    - [ ] `cd backend && ./mvnw verify`; web lint/test/build
  - **Phụ thuộc:** T11, T24, T26, T12
  - **File dự kiến:** `BE/remittance/service/PeriodLockService.java`, `BE/masterdata/service/PeriodGuard.java`, `BE/remittance/api/PeriodLockController.java`, `BT/remittance/{PeriodLockServiceTest,PeriodLockIT}.java`, `WEB/features/masterdata/PeriodsPage/PeriodsPage.tsx`
  - **Kích thước:** M (có sửa nhỏ ở service T18/T21/T26 để gọi guard)

- [ ] **T33 — Web: chuông và trung tâm thông báo** · `notifications` · S · P0
  - **Mô tả:** Chuông trên header (số chưa đọc, polling 30 giây bằng TanStack Query `refetchInterval`), dropdown 5 thông báo mới nhất, trang "Trung tâm thông báo" (lọc theo loại, đánh dấu đã đọc, bấm vào liên kết thì đi tới màn tương ứng).
  - **Tiêu chí nghiệm thu:**
    - [ ] Đánh dấu đã đọc làm giảm số trên chuông
    - [ ] Bấm thông báo đi đúng route theo `link`
    - [ ] Có test component cho chuông (số chưa đọc, trạng thái rỗng)
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
  - **Phụ thuộc:** T08, T23
  - **File dự kiến:** `WEB/features/notifications/{NotificationBell.tsx,NotificationBell.test.tsx,NotificationCenterPage.tsx,api.ts}`
  - **Kích thước:** S

- [ ] **T34 — Nhắc nộp cho công ty có nợ quá hạn** · `remittance` · M · P0 (§10 bước 5)
  - **Mô tả:** Tạo `MIG/V14__payment_reminders.sql` và entity `PaymentReminder` (công ty, các kỳ, số tiền, hạn, nội dung, người lập). `ReminderService.create(companyId)`: chỉ cho công ty có nợ quá hạn theo ledger (R16), hạn mặc định +5 ngày, nội dung soạn sẵn có thể sửa; phát `Notification` loại `REMINDER` tới công ty. Web xã: nút "Nhắc nộp" trên màn tiến độ + popup xem trước nội dung. Test: công ty không nợ quá hạn → 422.
  - **Tiêu chí nghiệm thu:**
    - [ ] Nhắc nộp DV01 → `dv01` thấy thông báo trên chuông (IT + kiểm tra tay)
    - [ ] Công ty không có nợ quá hạn → 422 (unit test)
    - [ ] Có ghi audit
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=ReminderServiceTest`
    - [ ] Web lint/test/build; thủ công §10 bước 5 (nhắc nộp)
  - **Phụ thuộc:** T24, T23, T31
  - **File dự kiến:** `MIG/V14__payment_reminders.sql`, `BE/remittance/domain/PaymentReminder.java` (+ repo), `BE/remittance/service/ReminderService.java`, `BT/remittance/ReminderServiceTest.java`, `WEB/features/remittance/ProgressPage/ReminderModal.tsx`
  - **Kích thước:** M

- [ ] **T35 — Công ty xem phiếu thu, báo sai sót; xã xử lý** · `remittance` · M · P0 (§10 bước 5) · **[cần hỏi trước: G6]**
  - **Mô tả:** Tạo `MIG/V15__receipt_issues.sql` và entity `ReceiptIssue` (phiếu thu, loại: Sai số tiền / Sai kỳ thu / Sai chứng từ / Không phải khoản nộp của công ty; số đúng; mô tả; trạng thái `PENDING/RESOLVED`; kết quả xử lý; người xử lý). Công ty: màn "Phiếu thu xã lập" (chỉ phiếu của mình) + form báo sai sót → thông báo `RECEIPT` tới xã. Xã: **màn xử lý mới** (prototype chưa có): danh sách sai sót chờ, đánh dấu đã xử lý kèm ghi chú → thông báo về công ty. Khi lập phiếu (T26) phát thông báo `RECEIPT` tới công ty. "Xử lý" có sửa/hủy phiếu hay không theo trả lời G6; mặc định để hỏi: chỉ đóng kèm ghi chú.
  - **Tiêu chí nghiệm thu:**
    - [ ] DV01 báo sai sót → xã thấy thông báo và mục chờ; xã xử lý → DV01 thấy thông báo và trạng thái "Đã xử lý" (IT + tay)
    - [ ] dv02 không báo sai sót được trên phiếu của DV01 (IT)
    - [ ] Validation form báo sai sót có test component
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=ReceiptIssueIT`
    - [ ] Web lint/test/build; thủ công §10 bước 5 (sai sót)
  - **Phụ thuộc:** T26, T23, T30
  - **File dự kiến:** `MIG/V15__receipt_issues.sql`, `BE/remittance/domain/ReceiptIssue.java` (+ repo), `BE/remittance/service/ReceiptIssueService.java`, `BT/remittance/ReceiptIssueIT.java`, `WEB/features/remittance/{CompanyReceiptsPage/CompanyReceiptsPage.tsx,ReceiptIssuesPage/ReceiptIssuesPage.tsx}`
  - **Kích thước:** M

- [ ] **T36 — Khiếu nại backend: luồng trạng thái, timeline nối tiếp, thông báo** · `complaints` · M · P0 · **[TDD]** · **[cần hỏi trước: G12]**
  - **Mô tả:** Tạo `MIG/V16__complaints.sql` và hai entity: `Complaint` (mã `KN-…`, ngày, người gửi, đối tượng liên quan, khu vực, kênh APP/PHONE/IN_PERSON, loại, nội dung, trạng thái `NEW → PROCESSING → RESOLVED`, công ty được chuyển, hạn xử lý) và `ComplaintEvent` (append-only: RECEIVED, FORWARDED, COMPANY_REPLIED, CLOSED; người, thời gian, nội dung). `ComplaintService`: xã ghi nhận/xử lý; chuyển công ty (hạn = hôm nay + 3 ngày, công ty mặc định theo `companyOf(khu vực)`); công ty phản hồi; xã đóng. Mỗi bước phát thông báo (xã, công ty, người dân nếu người gửi là dân). Công ty chỉ thấy khiếu nại theo phạm vi G12. Test viết trước cho chuyển trạng thái hợp lệ/không hợp lệ và timeline không bị ghi đè.
  - **Tiêu chí nghiệm thu:**
    - [ ] Test đơn vị: chuyển trạng thái sai → 422; mỗi bước thêm một event, event cũ không đổi
    - [ ] IT: xã tạo → chuyển DV01 → DV01 phản hồi → xã đóng; mỗi bước có đúng thông báo; dv02 không thấy khiếu nại → 403/404
    - [ ] API `/api/complaints/**` đủ cho web (T37) và app dân (T43)
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=ComplaintServiceTest,ComplaintFlowIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T09, T13, T23, H2
  - **File dự kiến:** `MIG/V16__complaints.sql`, `BE/complaint/domain/{Complaint,ComplaintEvent}.java` (+ repo), `BE/complaint/service/ComplaintService.java`, `BE/complaint/api/ComplaintController.java` (+ DTO), `BT/complaint/{ComplaintServiceTest,ComplaintFlowIT}.java`
  - **Kích thước:** M

- [ ] **CP3 — Checkpoint cuối tuần 3 (13/10)**
  - [ ] `cd backend && ./mvnw verify` xanh; web lint/test/build xanh
  - [ ] §10 bước 3 trọn vẹn trên giao diện (DV01 phân tổ, người đi thu ghi 2 tiền mặt + 1 vắng, công ty nhận tiền mặt)
  - [ ] §10 bước 5: lập phiếu một phần, in phiếu; tiến độ và đối soát "Đang nộp"; ba màn cùng số; nhắc nộp → chuông DV01; DV01 báo sai sót → xã xử lý
  - [ ] §10 bước 8: khóa kỳ khi còn nợ bị chặn, có lý do
  - [ ] Coverage service `billing`/`collection`/`remittance` ≥ 80% (nếu có JaCoCo, G10)
  - [ ] `/agent-skills:review` trên toàn bộ luồng tiền; sửa các phát hiện mức Critical/Important trước khi sang tuần 4

---

## Tuần 4 — Khiếu nại liên thông, app người dân, đóng gói demo (14/10 – 21/10)

- [ ] **T37 — Web khiếu nại: màn xã và màn công ty** · `complaints` · M · P0 (§10 bước 6)
  - **Mô tả:** Xã: danh sách (lọc trạng thái/kênh/quá hạn), form ghi nhận (điện thoại/trực tiếp), chi tiết có timeline, nút "Chuyển công ty" (chọn công ty, mặc định theo khu vực), nút "Đóng". Công ty: danh sách khiếu nại được chuyển, "Quá hạn xử lý" tính từ hạn, form phản hồi. Dùng chung component `ComplaintTimeline`.
  - **Tiêu chí nghiệm thu:**
    - [ ] Chạy trên web: xã chuyển DV01 → DV01 phản hồi → xã đóng; timeline hiện đủ các bước
    - [ ] Validation form ghi nhận và form phản hồi có test component
    - [ ] Chuông của xã/công ty có thông báo ở mỗi bước
  - **Kiểm chứng:**
    - [ ] `cd web && npm run gen:api && npm run lint && npm run test && npm run build`
  - **Phụ thuộc:** T36, T08, T33
  - **File dự kiến:** `WEB/features/complaints/{CommuneComplaintsPage.tsx,CompanyComplaintsPage.tsx,ComplaintTimeline.tsx,ComplaintForms.tsx,ComplaintForms.test.tsx}`
  - **Kích thước:** M

- [ ] **T38 — Lịch thu gom theo khu vực** · `master-data` · S · P1
  - **Mô tả:** Tạo `MIG/V17__collection_schedules.sql` và entity `CollectionSchedule` (khu vực, thứ, khung giờ, loại rác). Seed `V17_1` cho 24 tổ. `GET /api/masterdata/areas/{id}/schedules`. Nếu người dùng chọn C8 thì bỏ task này, app dùng dữ liệu tĩnh.
  - **Tiêu chí nghiệm thu:**
    - [ ] Seed có lịch cho mọi tổ; API trả lịch đúng tổ (IT)
    - [ ] Thứ/khung giờ lưu có cấu trúc (không phải một chuỗi tự do)
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CollectionScheduleIT`
  - **Phụ thuộc:** T09, H2
  - **File dự kiến:** `MIG/V17__…sql` + `SEED/V17_1__seed_schedules.sql`, `BE/masterdata/domain/CollectionSchedule.java` (+ repo), `BE/masterdata/api/ScheduleController.java`, `BT/masterdata/CollectionScheduleIT.java`
  - **Kích thước:** S

- [ ] **T39 — Tài khoản người dân, đăng nhập OTP cố định, API hộ và khoản** · `citizen-app` · M · P0 · **[cần hỏi trước: G8; O7 mặc định OTP cố định]**
  - **Mô tả:** Tạo `MIG/V18__citizen_accounts.sql` và entity `CitizenAccount` (SĐT, gắn một `ServiceSubject`, trạng thái). Seed tài khoản cho `DTH-H000128` và vài hộ khác (SĐT giả). `POST /api/citizen/auth/otp/request` (mô phỏng, không gửi SMS) và `POST /api/citizen/auth/otp/verify` (mã cố định lấy từ cấu hình) → JWT vai trò CITIZEN gắn `subjectId`. `GET /api/citizen/me` (hồ sơ hộ); `GET /api/citizen/charges` (khoản chưa đóng + lịch sử, từ `Charge`). Người dân chỉ thấy hộ của mình.
  - **Tiêu chí nghiệm thu:**
    - [ ] Đăng nhập bằng SĐT + OTP cố định; sai OTP → 401 (IT)
    - [ ] Dân hộ A gọi dữ liệu hộ B → 403/404 (IT phạm vi)
    - [ ] Khoản trả về khớp khoản xã đã phát hành cho hộ đó
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CitizenAuthIT,CitizenApiIT`
    - [ ] `cd backend && ./mvnw verify`
  - **Phụ thuộc:** T06, T15, T18, H2
  - **File dự kiến:** `MIG/V18__…sql` + `SEED/V18_1__seed_citizens.sql`, `BE/citizen/domain/CitizenAccount.java` (+ repo), `BE/citizen/service/CitizenAuthService.java`, `BE/citizen/api/CitizenController.java` (+ DTO), `BT/citizen/{CitizenAuthIT,CitizenApiIT}.java`
  - **Kích thước:** M

- [ ] **T40 — Thanh toán mô phỏng từ app người dân (backend)** · `citizen-app` · S · P0 (§10 bước 4) · **O1 mặc định**
  - **Mô tả:** `POST /api/citizen/payments` gọi `CollectionService.recordPayment` (T21) với hình thức `CITIZEN_APP`, có `requestId` chống trùng. Khoản chuyển Đã thu; công ty và xã thấy ngay qua ledger. Phát thông báo `TRANSACTION` cho người dân. `GET /api/citizen/payments/{id}/confirmation` trả "Xác nhận thanh toán" (O1: **không** gọi là biên lai pháp lý; mã lấy từ Payment, ổn định).
  - **Tiêu chí nghiệm thu:**
    - [ ] IT: dân thanh toán → khoản PAID → API công ty và ledger thấy "Đã thu"
    - [ ] Gửi trùng `requestId` không tạo 2 thanh toán; thanh toán khoản của hộ khác → 403/404
    - [ ] Kỳ đã khóa → 422
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CitizenPaymentIT`
  - **Phụ thuộc:** T39, T21, T23
  - **File dự kiến:** `BE/citizen/service/CitizenPaymentService.java`, `BE/citizen/api/CitizenController.java`, `BT/citizen/CitizenPaymentIT.java`
  - **Kích thước:** S

- [ ] **T41 — Mobile: đăng nhập, trang chủ, thông tin hộ, khoản phải đóng** · `citizen-app` · M · P0
  - **Mô tả:** Màn đăng nhập (SĐT → OTP), token lưu bằng `expo-secure-store` (nếu được duyệt ở G10). Tab điều hướng. Trang chủ (tổng phải đóng, lối tắt). Thông tin hộ. Khoản phải đóng + lịch sử. Tham chiếu `prototype/` app người dân.
  - **Tiêu chí nghiệm thu:**
    - [ ] Đăng nhập hộ `DTH-H000128` trên Expo Go; thấy đúng hồ sơ và khoản xã đã phát hành
    - [ ] Tiền định dạng `1.234.567 đ`, ngày `dd/MM/yyyy` (test Jest cho hàm định dạng)
    - [ ] Hết phiên → quay về màn đăng nhập
  - **Kiểm chứng:**
    - [ ] `cd mobile && npm run gen:api && npm test`
    - [ ] Thủ công: `npx expo start` trên điện thoại
  - **Phụ thuộc:** T22, T39
  - **File dự kiến:** `MOB/app/(auth)/login.tsx`, `MOB/app/(tabs)/{_layout,index,household,charges}.tsx`, `MOB/src/shared/format.ts` + test
  - **Kích thước:** M

- [ ] **T42 — Mobile: thanh toán mô phỏng, xác nhận thanh toán, lịch thu gom** · `citizen-app` · M · P0 (§10 bước 4)
  - **Mô tả:** Màn thanh toán (chọn khoản → màn "cổng thanh toán mô phỏng", có ghi rõ là mô phỏng → xác nhận). Màn "Xác nhận thanh toán" và danh sách xác nhận đã có (O1). Màn lịch thu gom của tổ (từ T38, hoặc dữ liệu tĩnh nếu chọn C8).
  - **Tiêu chí nghiệm thu:**
    - [ ] Dân `DTH-H000128` thanh toán trên app → web DV01 thấy hộ này "Đã thu" (§10 bước 4)
    - [ ] Bấm thanh toán hai lần không tạo 2 thanh toán
    - [ ] Không có chữ "biên lai" trên màn xác nhận (O1)
  - **Kiểm chứng:**
    - [ ] `cd mobile && npm run gen:api && npm test`
    - [ ] Thủ công: §10 bước 4 trên điện thoại + web
  - **Phụ thuộc:** T41, T40, T38
  - **File dự kiến:** `MOB/app/pay/[chargeId].tsx`, `MOB/app/confirmations/{index,[id]}.tsx`, `MOB/app/(tabs)/schedule.tsx`
  - **Kích thước:** M

- [ ] **T43 — Mobile: gửi khiếu nại, danh sách, timeline** · `citizen-app` · M · P0 (§10 bước 6)
  - **Mô tả:** Backend: `POST/GET /api/citizen/complaints` trong package `citizen`, gọi service public của complaints (T36) với kênh APP, người gửi là hộ đang đăng nhập. Mobile: form gửi (loại, nội dung), danh sách, chi tiết có timeline (dữ liệu event thật, đồng bộ trạng thái xã/công ty).
  - **Tiêu chí nghiệm thu:**
    - [ ] Dân gửi khiếu nại → xuất hiện ở màn xã (T37); xã chuyển DV01, DV01 phản hồi, xã đóng → timeline trên app hiện đủ bước
    - [ ] Dân không xem được khiếu nại của hộ khác (IT)
    - [ ] Validation form (nội dung bắt buộc) có test Jest
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CitizenComplaintIT`
    - [ ] `cd mobile && npm run gen:api && npm test`
  - **Phụ thuộc:** T41, T36
  - **File dự kiến:** `BE/citizen/api/CitizenComplaintController.java`, `BT/citizen/CitizenComplaintIT.java`, `MOB/app/complaints/{index,new,[id]}.tsx`
  - **Kích thước:** M

- [ ] **T44 — Mobile: tab thông báo** · `citizen-app` · S · P0 (§10 bước 6)
  - **Mô tả:** `GET /api/citizen/notifications` + đánh dấu đã đọc (gọi service T23 với người nhận là người dân). Tab Thông báo trên mobile: nhóm Khiếu nại / Giao dịch, badge chưa đọc, polling bằng `refetchInterval` (không push thật).
  - **Tiêu chí nghiệm thu:**
    - [ ] Xã đóng khiếu nại → trong vòng một chu kỳ polling, tab Thông báo có mục mới
    - [ ] Thanh toán mô phỏng → có thông báo Giao dịch
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=CitizenNotificationIT`; `cd mobile && npm test`
  - **Phụ thuộc:** T41, T23
  - **File dự kiến:** `BE/citizen/api/CitizenNotificationController.java`, `BT/citizen/CitizenNotificationIT.java`, `MOB/app/(tabs)/notifications.tsx`
  - **Kích thước:** S

- [ ] **T45 — Rác cồng kềnh: backend và màn công ty báo phí** · `citizen-app` · M · P0 (§10 bước 7) · **O5 mặc định (không sinh Charge)** · **[cần hỏi trước: G13]**
  - **Mô tả:** Tạo `MIG/V19__bulky_waste_requests.sql` và entity `BulkyWasteRequest` (loại vật dụng, số lượng, địa chỉ, ngày mong muốn, ảnh (tùy C5), công ty phụ trách = `companyOf(khu vực)`, phí công ty báo, trạng thái `PENDING → QUOTED → COLLECTED / CANCELLED`). API cho dân (tạo, xem, hủy) và cho công ty (danh sách của mình, báo phí, đánh dấu đã thu gom). Mỗi lần đổi trạng thái phát thông báo cho dân. Web công ty: màn "Rác cồng kềnh" có form báo phí. Phí **không** sinh `Charge` (O5).
  - **Tiêu chí nghiệm thu:**
    - [ ] IT: dân tạo → yêu cầu gán DV01 → DV01 báo phí → dân thấy "Đã báo phí"; dv02 không thấy yêu cầu này
    - [ ] Không có `Charge` nào được tạo từ yêu cầu (IT)
    - [ ] Validation form báo phí (phí > 0) có test component
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=BulkyWasteIT`; web lint/test/build
  - **Phụ thuộc:** T13, T23, T39, T08
  - **File dự kiến:** `MIG/V19__…sql`, `BE/citizen/domain/BulkyWasteRequest.java` (+ repo), `BE/citizen/service/BulkyWasteService.java` + `api/BulkyWasteController.java`, `BT/citizen/BulkyWasteIT.java`, `WEB/features/citizen/BulkyRequestsPage/{BulkyRequestsPage.tsx,QuoteForm.test.tsx}`
  - **Kích thước:** M

- [ ] **T46 — Mobile: đăng ký rác cồng kềnh và theo dõi trạng thái** · `citizen-app` · S · P0 (§10 bước 7)
  - **Mô tả:** Form đăng ký (4 loại vật dụng, số lượng, địa chỉ mặc định theo hộ, ngày mong muốn, ảnh theo C5). Danh sách và chi tiết có trạng thái và phí công ty báo.
  - **Tiêu chí nghiệm thu:**
    - [ ] Dân đăng ký → DV01 báo phí trên web → app hiện "Đã báo phí" kèm số tiền
    - [ ] Validation form (ngày mong muốn ≥ hôm nay, số lượng > 0) có test Jest
  - **Kiểm chứng:**
    - [ ] `cd mobile && npm run gen:api && npm test`; thủ công §10 bước 7 (phần rác cồng kềnh)
  - **Phụ thuộc:** T45, T41
  - **File dự kiến:** `MOB/app/bulky/{new,index,[id]}.tsx`, `MOB/src/features/bulky/validate.ts` + test
  - **Kích thước:** S

- [ ] **T47 — Chợ đồ cũ: backend (bài đăng, bình luận)** · `citizen-app` · M · P0 (§10 bước 7) · **O6 mặc định (không kiểm duyệt)**
  - **Mô tả:** Tạo `MIG/V20__market.sql` và hai entity: `MarketPost` (tiêu đề, loại Cho tặng / Trao đổi, mô tả, ảnh (tùy C5), nơi nhận, trạng thái, người đăng) và `MarketComment` (bỏ nếu chọn C4). API: danh sách, chi tiết, đăng bài, đổi trạng thái (chỉ chủ bài), bình luận. Không kiểm duyệt (O6). Ảnh: nếu không chọn C5 thì dùng upload multipart lưu ổ đĩa local; **cần hỏi trước** nếu phải thêm dependency.
  - **Tiêu chí nghiệm thu:**
    - [ ] Đăng bài, xem danh sách/chi tiết, bình luận qua API (IT)
    - [ ] Chỉ chủ bài đổi được trạng thái bài (IT)
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw test -Dtest=MarketIT`
  - **Phụ thuộc:** T39, H2
  - **File dự kiến:** `MIG/V20__market.sql`, `BE/citizen/domain/{MarketPost,MarketComment}.java` (+ repo), `BE/citizen/service/MarketService.java`, `BE/citizen/api/MarketController.java`, `BT/citizen/MarketIT.java`
  - **Kích thước:** M

- [ ] **T48 — Mobile: chợ đồ cũ** · `citizen-app` · M · P0 (§10 bước 7)
  - **Mô tả:** Danh sách (lọc Cho tặng / Trao đổi), chi tiết có bình luận, form đăng bài.
  - **Tiêu chí nghiệm thu:**
    - [ ] Dân đăng một bài trên điện thoại, bài hiện trong danh sách (§10 bước 7)
    - [ ] Validation form đăng bài (tiêu đề, loại bắt buộc) có test Jest
  - **Kiểm chứng:**
    - [ ] `cd mobile && npm run gen:api && npm test`; thủ công trên Expo Go
  - **Phụ thuộc:** T47, T41
  - **File dự kiến:** `MOB/app/market/{index,new,[id]}.tsx`, `MOB/src/features/market/validate.ts` + test
  - **Kích thước:** M

- [ ] **T49 — `docker compose up --build` chạy db + backend + web; rà seed theo §10** · `platform` · M · P0 (§10 bước 9)
  - **Mô tả:** Viết `backend/Dockerfile` (multi-stage, JRE 21) và `web/Dockerfile` (build Vite + nginx proxy `/api`), thêm service `backend` và `web` vào `docker-compose.yml` (profile `demo`, biến từ `.env`). Rà seed khớp kịch bản §10: có kỳ 10/2026 chưa mở, KV24 chưa phân công, DV01 + người đi thu KV07/KV09, hộ `DTH-H000128` có tài khoản dân; không có dữ liệu thật. Ghi `docs/demo-runbook.md` (lệnh chạy, tài khoản, thứ tự §10). Nếu chọn C7 thì chỉ viết runbook chạy dev.
  - **Tiêu chí nghiệm thu:**
    - [ ] Máy sạch: `docker compose up --build` → web ở http://localhost:5173 (hoặc cổng đã ghi) đăng nhập được
    - [ ] Seed đủ điều kiện ban đầu của §10 bước 1–8
    - [ ] Không có secret thật trong Dockerfile/compose
  - **Kiểm chứng:**
    - [ ] `docker compose down -v && docker compose up --build`; thủ công đăng nhập 4 vai trò
  - **Phụ thuộc:** tất cả task P0/P1 trước đó (T02–T48), trừ những task người dùng đã chọn cắt
  - **File dự kiến:** `backend/Dockerfile`, `web/Dockerfile` (+ `web/nginx.conf`), `docker-compose.yml`, `docs/demo-runbook.md`
  - **Kích thước:** M

- [ ] **T50 — Diễn tập kịch bản demo §10 và sửa lỗi chặn** · `platform` · M · P0
  - **Mô tả:** Chạy §10 bước 1–9 hai lần từ CSDL sạch. Ghi lỗi vào `tasks/demo-issues.md`, phân loại chặn / không chặn. Lỗi chặn nào lớn hơn S thì tách thành task mới trong todo (dùng `/agent-skills:test` theo Prove-It). Kiểm tra console trình duyệt và log Expo không có lỗi.
  - **Tiêu chí nghiệm thu:**
    - [ ] Hai lần chạy liên tiếp §10 bước 1–9 không có lỗi chặn
    - [ ] Console web không lỗi; không có dữ liệu thật
    - [ ] Người dùng xác nhận danh sách lỗi không chặn còn lại
  - **Kiểm chứng:**
    - [ ] `cd backend && ./mvnw verify`; web lint/test/build; `cd mobile && npm test`
    - [ ] Thủ công: §10 theo `docs/demo-runbook.md`
  - **Phụ thuộc:** T49
  - **File dự kiến:** `tasks/demo-issues.md`, cộng các file cần sửa (mỗi bản sửa một commit)
  - **Kích thước:** M

- [ ] **CP4 — Checkpoint mốc demo (21/10)**
  - [ ] Toàn bộ test xanh ở backend, web, mobile
  - [ ] §10 bước 1–9 chạy trọn bằng `docker compose up` + `npx expo start` trên seed, không lỗi console, không dữ liệu thật
  - [ ] `/agent-skills:review` lần cuối; người dùng duyệt để demo

---

## Dự phòng P2 — chỉ làm khi còn thời gian hoặc khi người dùng quyết định giữ (xem plan.md §7)

- [ ] **T51 — Màn quản trị tài khoản** · `platform` · M · P2 (C1)
  - **Mô tả:** API quản trị user (`GET/POST/PUT /api/platform/users`, khóa/mở khóa, đặt lại mật khẩu, gán vai trò + công ty), chỉ ADMIN, ghi audit. Web: bảng tài khoản + form.
  - **Tiêu chí nghiệm thu:**
    - [ ] Quản trị tạo tài khoản COLLECTOR cho DV01; tài khoản đó đăng nhập được
    - [ ] Không phải ADMIN → 403 (IT); tài khoản bị khóa không đăng nhập được (IT)
    - [ ] Validation form (COMPANY_MANAGER/COLLECTOR bắt buộc có công ty) có test component
  - **Kiểm chứng:** `cd backend && ./mvnw test -Dtest=UserAdminIT`; web lint/test/build
  - **Phụ thuộc:** T06, T07, T08, T09
  - **File dự kiến:** `BE/platform/service/UserAdminService.java`, `BE/platform/api/UserAdminController.java`, `BT/platform/UserAdminIT.java`, `WEB/features/platform/AccountsPage/{AccountsPage.tsx,AccountForm.test.tsx}`
  - **Kích thước:** M

- [ ] **T52 — Màn nhật ký (xem audit log)** · `platform` · S · P2 (C2)
  - **Mô tả:** `GET /api/platform/audit-logs` (ADMIN, lọc theo thời gian/người/hành động, phân trang). Web: bảng nhật ký, xem trước/sau.
  - **Tiêu chí nghiệm thu:**
    - [ ] Lập phiếu thu xong thấy dòng `ISSUE_COMPANY_RECEIPT` kèm trước/sau
    - [ ] Không phải ADMIN → 403 (IT)
  - **Kiểm chứng:** `cd backend && ./mvnw test -Dtest=AuditLogApiIT`; web lint/test/build
  - **Phụ thuộc:** T07, T08
  - **File dự kiến:** `BE/platform/api/AuditLogController.java`, `BT/platform/AuditLogApiIT.java`, `WEB/features/platform/AuditLogPage/AuditLogPage.tsx`
  - **Kích thước:** S

- [ ] **T53 — Người đi thu: lịch sử hộ và báo sai thông tin hộ** · `collection` · M · P2 (C3) · **[cần hỏi trước: G7]**
  - **Mô tả:** `GET /api/collection/charges/{id}/history` (thanh toán + lượt ghé). `POST /api/collection/subject-reports`: báo hộ chuyển đi / sai thông tin → thông báo `INFO` tới xã + công ty (G2, G7; có lưu thành entity riêng hay không tùy trả lời G7). Web người đi thu: màn lịch sử hộ + form báo sai.
  - **Tiêu chí nghiệm thu:**
    - [ ] Lịch sử hộ hiện đủ thanh toán và lượt ghé theo thời gian
    - [ ] Báo sai thông tin → xã và công ty của tổ đó nhận thông báo; công ty khác không nhận (IT)
  - **Kiểm chứng:** `cd backend && ./mvnw test -Dtest=SubjectReportIT`; web lint/test/build
  - **Phụ thuộc:** T27, T23
  - **File dự kiến:** `BE/collection/service/SubjectReportService.java`, `BE/collection/api/CollectionController.java`, `BT/collection/SubjectReportIT.java`, `WEB/features/collection/CollectorListPage/{HouseholdHistory.tsx,ReportSubjectForm.tsx}`
  - **Kích thước:** M
