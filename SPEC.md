# Spec: Demo hệ thống thu giá dịch vụ vệ sinh môi trường — Spring Boot + React + Expo

**Phiên bản:** 1.0 (bản nháp chờ duyệt) · **Ngày:** 23/09/2026
**Intent đã xác nhận:** `docs/intent/demo-springboot.md`
**Tham chiếu hành vi hiện tại:** `docs/reference/prototype-inventory.md` (kiểm kê prototype v3.1) và thư mục `prototype/`
**Thay thế:** `SPEC-TONG-HOP.md` v2.9 (đã lỗi thời; chỉ dùng tra cứu lịch sử qua git `b7b857a`)

---

## 1. Mục tiêu

Dựng lại prototype HTML/JS v3.1 thành ứng dụng demo có backend và cơ sở dữ liệu thật, để trình diễn cho UBND xã Đông Thạnh trong **~4 tuần**. Khi xã duyệt, ứng dụng được nâng lên triển khai thật **mà không viết lại lõi**.

| Vai trò | Kênh | Việc chính |
|---|---|---|
| Cán bộ xã (gộp kế toán) | Web desktop | Đối tượng & hợp đồng, kỳ thu, phiếu yêu cầu thu, khu vực & phân công công ty, lập phiếu thu khi công ty nộp tiền, nhắc nộp, báo cáo tiến độ, đối soát, khóa kỳ, khiếu nại |
| Công ty môi trường | Web desktop | Hộ được giao, phân tổ cho người đi thu, nhận tiền mặt từ người đi thu, xem phiếu thu xã lập và báo sai sót, xử lý khiếu nại, nhận/báo phí rác cồng kềnh |
| Người đi thu | Web giao diện mobile | Danh sách hộ của tổ được giao, cập nhật kết quả thu (tiền mặt / chuyển khoản / vắng / hẹn / từ chối), tiền mặt đang giữ, báo sai thông tin hộ |
| Quản trị | Web desktop | Tài khoản & vai trò, địa bàn, biểu giá, mở kỳ thu (ai mở kỳ: xem G1), nhật ký. **Khóa kỳ do cán bộ xã** (quyết định 23/09) |
| Người dân | App Expo (cài qua store) | Thông tin hộ, khoản phải đóng, thanh toán **mô phỏng**, biên lai, lịch thu gom, khiếu nại, chợ đồ cũ, rác cồng kềnh, thông báo |

**Luồng tiền đã chốt (tạm):** hộ → công ty (người đi thu hoặc app dân) → công ty nộp **toàn bộ** tiền đã thu về xã → xã lập phiếu thu cho công ty → xã đối soát `phải thu / công ty đã thu / đã nộp về xã` → xã khóa kỳ.

**Không làm trong 4 tuần:** vai trò Lãnh đạo; miễn giảm / hoàn / xóa nợ (chỉ giữ cờ miễn 100% trên hợp đồng như prototype); thanh toán thật, VietQR, sao kê ngân hàng; HĐĐT; KBNN; import Excel thật; triển khai production.

---

## 2. Bản đồ module (đã duyệt 23/09/2026)

| Mã module | Trách nhiệm | Phụ thuộc |
|---|---|---|
| `data-dictionary` | Tài liệu trường của từng entity: kiểu, bắt buộc, nguồn (xã / công ty / hệ thống), ví dụ. Dùng xin dữ liệu và là nguồn duy nhất để viết entity + migration | — |
| `platform` | Monorepo, docker-compose, đăng nhập JWT, User/Role, phạm vi dữ liệu theo công ty, audit log, màn quản trị tài khoản | data-dictionary |
| `master-data` | Địa bàn, khu vực/tổ, công ty, phân công khu vực có hiệu lực, đối tượng + hợp đồng, biểu giá theo phiên bản, loại phí, kỳ thu tháng/quý, lịch thu gom | platform |
| `billing` | Phiếu yêu cầu thu → sinh khoản phải thu từng hộ–kỳ–loại phí | master-data |
| `collection` | Công ty phân tổ cho người đi thu; ghi nhận kết quả thu / lượt ghé; bàn giao tiền mặt; thanh toán mô phỏng từ app dân | billing |
| `remittance` | Phiếu thu xã lập khi công ty nộp, báo sai sót phiếu thu, nhắc nộp, báo cáo tiến độ, đối soát, khóa kỳ | collection |
| `notifications` | Thông báo theo vai trò / công ty / người dùng / người dân; đã đọc | platform |
| `complaints` | Khiếu nại liên thông: dân/xã ghi nhận → xã xử lý hoặc chuyển công ty → công ty phản hồi → xã đóng; timeline | master-data, notifications |
| `citizen-app` | App Expo + API cho người dân; chợ đồ cũ; đăng ký rác cồng kềnh | billing, collection, complaints, notifications |

**Thứ tự làm:** `data-dictionary` → `platform` → `master-data` → `billing` → `collection` → `remittance` → `notifications` → `complaints` → `citizen-app`.
`notifications` + `complaints` có thể làm song song với luồng tiền sau khi xong `master-data`.

Mỗi module là một package riêng trong backend và một thư mục `features/<module>` trong web. Module chỉ gọi module mình phụ thuộc, qua service public — không truy cập repository của module khác.

---

## 3. Công nghệ

| Lớp | Lựa chọn |
|---|---|
| Backend | Java 21, Spring Boot 3.x, Maven wrapper, Spring Web, Spring Data JPA (Hibernate), Spring Security + JWT (access token), Bean Validation, springdoc-openapi, Flyway |
| CSDL | PostgreSQL 16 (docker-compose) |
| Web | React 18, TypeScript (strict), Vite, React Router, TanStack Query, Ant Design 5 (locale `vi_VN`), dayjs |
| Mobile | Expo SDK (React Native) + TypeScript, Expo Router, TanStack Query |
| Kiểu API dùng chung | Sinh type TS từ OpenAPI của backend (`openapi-typescript`) cho `web` và `mobile` |
| Kiểm thử | JUnit 5, Spring Boot Test, Testcontainers (PostgreSQL); Vitest + Testing Library (web); Jest (mobile, mức tối thiểu) |

Tiền: số nguyên VND (`long` / `bigint`), không dùng số thực. Ngày: `LocalDate` / ISO `yyyy-MM-dd` trong API, hiển thị `dd/MM/yyyy`. Múi giờ `Asia/Ho_Chi_Minh`.

---

## 4. Lệnh

```bash
# CSDL
docker compose up -d db

# Backend (thư mục backend/)
./mvnw spring-boot:run                 # chạy API tại http://localhost:8080, seed dữ liệu demo (profile demo)
./mvnw test                            # unit + integration (Testcontainers cần Docker)
./mvnw verify                          # test + kiểm tra build
# OpenAPI: http://localhost:8080/v3/api-docs · Swagger UI: /swagger-ui.html

# Web (thư mục web/)
npm install
npm run dev                            # http://localhost:5173
npm run gen:api                        # sinh src/api/schema.d.ts từ OpenAPI
npm run lint
npm run test
npm run build

# Mobile (thư mục mobile/)
npm install
npx expo start                         # mở bằng Expo Go
npm run gen:api
npm test

# Toàn bộ (tùy chọn)
docker compose up --build              # db + backend + web
```

---

## 5. Cấu trúc dự án

```text
/
├── SPEC.md                     # tài liệu này
├── docker-compose.yml
├── docs/
│   ├── intent/                 # intent đã xác nhận
│   ├── reference/              # kiểm kê prototype
│   ├── data-dictionary.md      # đầu ra module data-dictionary
│   └── adr/                    # quyết định kiến trúc
├── tasks/                      # plan.md, todo.md
├── prototype/                  # prototype HTML/JS v3.1 chuyển vào đây, chỉ để tham chiếu UI
├── backend/
│   └── src/main/java/vn/dongthanh/vsmt/
│       ├── platform/           # auth, user, role, scope, audit, common (error, paging)
│       ├── masterdata/
│       ├── billing/
│       ├── collection/
│       ├── remittance/
│       ├── notification/
│       ├── complaint/
│       └── citizen/            # API riêng cho app dân, market, bulky
│       mỗi module: api/ (controller, DTO) · domain/ (entity, repository) · service/
│   └── src/main/resources/db/migration/   # Flyway V1__..., V2__...
│   └── src/main/resources/db/seed/         # seed demo (profile demo)
│   └── src/test/java/...                   # test theo cùng package
├── web/
│   └── src/
│       ├── api/                # client + schema.d.ts sinh tự động
│       ├── app/                # router, layout theo vai trò, auth
│       ├── features/<module>/  # màn hình theo module
│       └── shared/             # component dùng chung (MoneyText, PeriodSelect, StatusTag…)
└── mobile/
    └── app/                    # Expo Router
    └── src/{api,features,shared}
```

---

## 6. Phong cách code

**Quy ước:** tên trong code (entity, field, bảng, API) bằng **tiếng Anh**; nhãn giao diện, thông báo lỗi hiển thị cho người dùng và tài liệu bằng **tiếng Việt**. Bảng `snake_case` số nhiều, cột `snake_case`. REST: `/api/{module}/{resource}` danh từ số nhiều. Enum lưu dạng chuỗi (`@Enumerated(STRING)`), nhãn tiếng Việt nằm ở frontend.

```java
// backend/.../remittance/service/CompanyReceiptService.java
@Service
@RequiredArgsConstructor
public class CompanyReceiptService {
    private final CompanyReceiptRepository receipts;
    private final CompanyLedgerService ledger;      // tính phải thu / đã nộp theo công ty–kỳ
    private final AuditService audit;

    @Transactional
    public CompanyReceipt issue(IssueReceiptCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        long remaining = ledger.remaining(cmd.companyId(), cmd.periodId());
        if (cmd.amount() <= 0 || cmd.amount() > remaining) {
            throw new BusinessRuleException("RECEIPT_AMOUNT_OUT_OF_RANGE",
                "Số tiền phải lớn hơn 0 và không vượt số còn phải nộp (" + remaining + "đ)");
        }
        CompanyReceipt saved = receipts.save(CompanyReceipt.from(cmd, actor));
        audit.record(actor, "ISSUE_COMPANY_RECEIPT", saved.getId());
        return saved;
    }
}
```

```tsx
// web/src/features/remittance/useCompanyLedger.ts
export function useCompanyLedger(periodId: string) {
  return useQuery({
    queryKey: ['remittance', 'ledger', periodId],
    queryFn: () => api.get<CompanyLedgerRow[]>(`/api/remittance/ledger`, { params: { periodId } }),
  });
}
```

- Controller mỏng, quy tắc nghiệp vụ nằm trong service, lỗi nghiệp vụ trả `409`/`422` với `code` + `message` tiếng Việt.
- Không trả entity JPA ra API — dùng DTO `record`.
- Phạm vi dữ liệu (công ty chỉ thấy dữ liệu của mình, người đi thu chỉ thấy tổ được giao) lọc trong query ở service/repository, không dựa vào ẩn nút.
- Web: một thư mục mỗi màn hình trong `features/<module>`; server state bằng TanStack Query, không dùng Redux.

---

## 7. Chiến lược kiểm thử

| Mức | Công cụ | Phạm vi bắt buộc |
|---|---|---|
| Unit (backend) | JUnit 5 | Mọi công thức tiền và quy tắc chặn: tính số tiền khoản (tháng/quý, miễn), chống sinh trùng khoản theo kỳ chồng lấn, phiếu thu ≤ còn phải nộp, chặn khóa kỳ khi còn nợ, trạng thái đối soát, tiền mặt người thu đang giữ |
| Integration (backend) | Spring Boot Test + Testcontainers | Repository/Flyway chạy thật trên PostgreSQL; API chính mỗi module; **kiểm tra phạm vi**: công ty A gọi dữ liệu công ty B → 403/404; người đi thu gọi hộ ngoài tổ → 403/404 |
| Component (web) | Vitest + Testing Library | Form có validation (phiếu YCT, phiếu thu, phân công), hiển thị tiền/ngày |
| Demo E2E | Kịch bản thủ công ở §10 (có thể tự động bằng Playwright sau) | Chạy trước mỗi mốc demo |

Mục tiêu: service layer của `billing`, `collection`, `remittance` có coverage dòng ≥ 80%. Viết test trước cho quy tắc tiền (TDD theo `/agent-skills:test`).

---

## 8. Ranh giới

**Luôn làm**
- Mọi thay đổi schema qua migration Flyway mới; entity khớp `docs/data-dictionary.md`.
- Tiền là số nguyên VND; mọi thao tác tạo/sửa tiền ghi audit (ai, lúc nào, trước/sau).
- Kiểm tra vai trò + phạm vi dữ liệu ở backend.
- Chạy `./mvnw test` và `npm run test` của phần bị sửa trước khi commit; commit nhỏ theo từng task.
- Seed chỉ dùng dữ liệu giả (tên, SĐT, địa chỉ giả).

**Hỏi trước**
- Thêm dependency ngoài danh sách §3.
- Thay đổi entity/trường đã chốt trong data dictionary hoặc quy tắc tiền.
- Bất kỳ việc nào chạm vào **điểm còn mở** ở §11.
- Thêm vai trò, module, hoặc màn hình ngoài danh sách.

**Không bao giờ**
- Đưa dữ liệu cá nhân thật (dữ liệu xã/công ty cung cấp) vào repo hoặc seed.
- Commit secret (JWT secret, mật khẩu DB thật) — dùng biến môi trường, `.env` trong `.gitignore`.
- Sửa migration đã chạy; xóa hoặc skip test đang fail để qua build.
- Tự đặt quy tắc nghiệp vụ cho điểm còn mở.

---

## 9. Đặc tả theo module

> Mỗi module khi bắt đầu sẽ có file `SPEC-<module>.md` chi tiết hơn nếu cần. Dưới đây là phạm vi và tiêu chí nghiệm thu.

### 9.1 `data-dictionary`
- **Đầu ra:** `docs/data-dictionary.md` (+ bản `.xlsx` để gửi xã/công ty nếu bạn cần).
- Mỗi entity: bảng trường gồm *tên hiển thị (VI) · tên kỹ thuật · kiểu · bắt buộc · nguồn (Xã / Công ty / Hệ thống / Người dân) · ví dụ · ghi chú*.
- Tách 2 mức: **Phải có để chạy demo** và **Nên có khi triển khai thật**.
- Có một phần "Danh sách trường cần xin" gom theo nguồn (xin xã / xin công ty).
- **Nghiệm thu:** bao phủ mọi entity ở §9.3–9.9; mọi trường của prototype-inventory có mặt hoặc có lý do bỏ; bạn duyệt trước khi viết entity.

### 9.2 `platform`
- Monorepo, docker-compose, backend/web/mobile khởi tạo được; prototype cũ chuyển vào `prototype/`.
- `User` (username, họ tên, SĐT, vai trò, `companyId` nếu thuộc công ty, trạng thái), vai trò: `COMMUNE_OFFICER`, `COMPANY_MANAGER`, `COLLECTOR`, `ADMIN`, `CITIZEN`.
- Đăng nhập username/mật khẩu → JWT; tài khoản demo seed sẵn cho mỗi vai trò (và mỗi công ty).
- `AuditLog` (thời gian, người, vai trò, hành động, đối tượng, dữ liệu trước/sau).
- Web: layout + menu theo vai trò, trang đăng nhập, màn quản trị tài khoản.
- **Nghiệm thu:** đăng nhập 4 vai trò nội bộ ra đúng menu; API sai vai trò → 403; công ty A không đọc được dữ liệu công ty B.

### 9.3 `master-data`
- `District` (DTH/TTT/NB), `Area` (tổ, thuộc địa bàn), `Company` (tên, đầu mối, SĐT, trạng thái, hiệu lực).
- `AreaAssignment` (khu vực, công ty, từ ngày, đến ngày, ghi chú): **mỗi khu vực tối đa 1 công ty trong cùng khoảng hiệu lực; đổi công ty tạo bản ghi mới và giữ lịch sử**. UI: **popup phân công đơn giản** (chọn công ty + ngày bắt đầu; có thể chọn nhiều tổ), backend tự đóng phân công cũ.
- `ServiceSubject` (đối tượng: hộ gia đình / hộ kinh doanh / doanh nghiệp; tên, địa chỉ, SĐT, khu vực, trạng thái) và `ServiceContract` (số hợp đồng, nhóm giá, từ ngày, đến ngày, miễn 100% + lý do). **Hai bảng riêng, hiển thị gộp trên một form hồ sơ hộ**; mỗi đối tượng tối đa 1 hợp đồng hiệu lực tại một thời điểm.
- `TariffVersion` (căn cứ pháp lý, hiệu lực, trạng thái) + `TariffRate` (nhóm giá, thu gom, vận chuyển, xử lý, VAT, tổng/tháng). **Giá tính tiền lấy từ phiên bản biểu giá đang hiệu lực của kỳ** (mặc định QĐ 65/2026/QĐ-UBND); số tiền được chụp lại vào khoản khi sinh.
- `FeeType` (vệ sinh môi trường, rác cồng kềnh, phụ phí), `CollectionPeriod` (tháng hoặc quý, ngày mở, hạn nộp, phiên bản biểu giá, trạng thái Đã mở → Đang thu → Đã khóa).
- `CollectionSchedule` (khu vực, thứ, khung giờ, loại rác) cho màn lịch thu gom của dân.
- **Nghiệm thu:** CRUD đối tượng + hợp đồng; phân công chồng lấn bị chặn; đổi công ty giữ lịch sử và báo cáo kỳ cũ vẫn tính cho công ty cũ; mở kỳ tháng/quý.

### 9.4 `billing`
- `ChargeRequest` (phiếu yêu cầu thu: kỳ, loại phí, phạm vi toàn xã / chọn tổ / theo công ty — **lưu có cấu trúc**, hạn đóng, ghi chú) sinh `Charge` (đối tượng, hợp đồng, kỳ, loại phí, số tiền snapshot, hạn, trạng thái Chưa thu / Đã thu / Miễn giảm; "Quá hạn" tính từ hạn, không lưu).
- Quy tắc từ prototype R1–R4: số tiền = giá tháng × (quý ? 3 : 1); miễn → 0; bỏ qua đối tượng không hợp đồng hiệu lực, khu vực chưa có công ty (cảnh báo), hoặc đã có khoản cùng loại phí trùng kỳ; chỉ kỳ chưa khóa.
- Có màn xem trước trước khi phát hành.
- **Nghiệm thu:** unit test cho mọi quy tắc trên; phát hành lại cùng kỳ không sinh trùng.

### 9.5 `collection`
- `CollectorAssignment` (người đi thu, khu vực, từ ngày, đến ngày) do công ty lập — **cấu trúc cho phép nhiều tổ/người**; demo seed 1 người/tổ như prototype.
- `CollectionVisit` (khoản, kết quả: vắng / hẹn / từ chối, ngày hẹn lại, ghi chú, người ghi).
- `Payment` (khoản, số tiền, hình thức: tiền mặt / chuyển khoản / app người dân (mô phỏng), thời điểm, người xác nhận) — khoản chuyển "Đã thu" khi tổng thanh toán ≥ số tiền.
- `CashHandover` (người đi thu → công ty: số tiền ≤ tiền mặt đang giữ, ngày, ghi chú).
- Web người đi thu (mobile): danh sách hộ, lọc, bottom sheet cập nhật kết quả, lịch sử hộ, tiền đang giữ, báo sai thông tin hộ.
- Web công ty: vòng tiến độ, bảng người đi thu, danh sách hộ, cập nhật thay người thu, nhận tiền mặt, phân tổ.
- **Nghiệm thu:** người đi thu chỉ thấy hộ trong tổ được giao; ghi nhận trùng (gửi 2 lần) không tạo 2 thanh toán; tiền mặt đang giữ đúng sau bàn giao.

### 9.6 `remittance`
- `CompanyReceipt` (phiếu thu xã lập khi công ty nộp: công ty, kỳ, số tiền, hình thức, ngày, người nộp, số chứng từ, ghi chú; mã `PT-CT-MMYY-nnn`); 1 phiếu 1 kỳ, nhiều lần nộp; 0 < số tiền ≤ còn phải nộp. In phiếu có số tiền bằng chữ.
- `ReceiptIssue` (báo sai sót phiếu thu: loại, số đúng, mô tả, trạng thái Chờ xã kiểm tra / Đã xử lý) — **thêm màn xử lý cho xã** (prototype thiếu).
- `PaymentReminder` (nhắc nộp: công ty, các kỳ, số tiền, hạn, nội dung) — chỉ công ty có nợ quá hạn.
- Báo cáo tiến độ, đối soát (chênh lệch = đã nộp − công ty đã thu; Khớp / Đang nộp / Lệch), nợ kỳ trước — theo công thức R6–R14 của prototype, **nhưng phải thu tính theo công ty được phân công tại kỳ phát sinh**.
- Khóa kỳ: chặn khi còn công ty nợ; sau khóa không sửa khoản/thanh toán/phiếu thu của kỳ.
- **Nghiệm thu:** số liệu tiến độ = đối soát = màn công ty cho cùng kỳ; khóa kỳ bị chặn đúng; phiếu vượt số còn nộp bị từ chối.

### 9.7 `notifications`
- `Notification` (người nhận: vai trò / công ty / người dùng / người dân; loại: nhắc nộp, khiếu nại, phiếu thu, thông tin, giao dịch; tiêu đề, nội dung, liên kết, thời gian, đã đọc).
- Các sự kiện phát thông báo theo bảng trong prototype-inventory §2. Web: chuông + trung tâm thông báo; mobile: tab Thông báo (lấy bằng polling, không push thật).
- **Nghiệm thu:** mỗi sự kiện tạo đúng thông báo cho đúng người; công ty không thấy thông báo của công ty khác.

### 9.8 `complaints`
- `Complaint` (mã, ngày, người gửi, đối tượng liên quan, khu vực, kênh: app / điện thoại / trực tiếp, loại, nội dung, trạng thái Mới → Đang xử lý → Đã giải quyết, công ty được chuyển, hạn xử lý) + `ComplaintEvent` (timeline: tiếp nhận, chuyển công ty, công ty phản hồi, đóng — **lưu nối tiếp, không ghi đè**).
- Xã: ghi nhận, xử lý, chuyển công ty (hạn +3 ngày). Công ty: xem khiếu nại được chuyển hoặc thuộc khu vực mình, phản hồi. Dân: gửi từ app, xem timeline.
- **Nghiệm thu:** một khiếu nại đi hết dân → xã → công ty → xã → dân với timeline và thông báo ở mỗi bước.

### 9.9 `citizen-app`
- `CitizenAccount` gắn với một `ServiceSubject`; đăng nhập demo bằng SĐT + mã OTP cố định (mô phỏng).
- Màn: trang chủ, thông tin hộ, khoản phải đóng & lịch sử (từ `Charge`), thanh toán **mô phỏng** (tạo `Payment` hình thức app → khoản thành Đã thu, công ty và xã thấy ngay), biên lai, lịch thu gom, khiếu nại, thông báo, tài khoản.
- **Chợ đồ cũ:** `MarketPost` (tiêu đề, loại Cho tặng / Trao đổi, mô tả, ảnh, nơi nhận, trạng thái) + `MarketComment`.
- **Rác cồng kềnh:** `BulkyWasteRequest` (loại vật dụng, số lượng, địa chỉ, ngày mong muốn, ảnh, công ty phụ trách theo khu vực, phí công ty báo, trạng thái Chờ xác nhận → Đã báo phí → Đã thu gom / Hủy). Công ty có màn nhận và báo phí.
- **Nghiệm thu:** dân thanh toán mô phỏng → số liệu công ty/xã cập nhật; dân gửi khiếu nại và nhận thông báo khi được xử lý; đăng bài chợ đồ cũ, đăng ký rác cồng kềnh và thấy công ty báo phí.

---

## 10. Tiêu chí thành công — kịch bản demo

1. Quản trị mở kỳ 10/2026 (tháng) theo QĐ 65/2026.
2. Cán bộ xã phân công một tổ chưa có công ty bằng popup; tạo phiếu yêu cầu thu toàn xã → xem trước → phát hành.
3. Công ty DV01 phân tổ cho người đi thu; người đi thu (điện thoại) ghi nhận 2 hộ tiền mặt, 1 hộ vắng; bàn giao tiền mặt cho công ty.
4. Người dân hộ DTH-H000128 thanh toán mô phỏng trên app → công ty thấy "Đã thu".
5. Xã lập phiếu thu khi DV01 nộp một phần; báo cáo tiến độ và đối soát hiển thị "Đang nộp"; xã nhắc nộp → DV01 nhận thông báo; DV01 báo sai sót phiếu thu → xã xử lý.
6. Người dân gửi khiếu nại → xã chuyển DV01 → DV01 phản hồi → xã đóng → dân thấy timeline và thông báo.
7. Người dân đăng ký rác cồng kềnh → DV01 báo phí; đăng một bài chợ đồ cũ.
8. Xã thử khóa kỳ khi còn nợ → bị chặn với lý do rõ ràng.
9. Toàn bộ chạy bằng `docker compose up` + `npx expo start` trên dữ liệu seed, không lỗi console, không dữ liệu thật.

---

## 11. Quyết định và điểm còn mở

**Đã chốt:** xem `docs/intent/demo-springboot.md`. Bổ sung 23/09/2026: hợp đồng tách bảng nhưng hiển thị chung hồ sơ hộ; phân công khu vực làm popup đơn giản, lưu lịch sử; giá theo QĐ mới nhất (QĐ 65/2026) qua phiên bản biểu giá.

| # | Điểm mở | Cách xử lý trong demo cho đến khi có quyết định |
|---|---|---|
| O1 | Ai phát hành biên lai cho hộ (công ty hay hệ thống), mẫu biên lai | Hiển thị "Xác nhận thanh toán" từ bản ghi `Payment` với mã cố định; không gọi là biên lai pháp lý |
| O2 | Luồng tiền cuối cùng (toàn bộ hay phần xử lý) | Công ty nộp toàn bộ — đã tạm chốt |
| O3 | Dữ liệu thật về hộ: trường nào xã/công ty có | Chờ kết quả xin dữ liệu theo data dictionary |
| O4 | Một người đi thu phụ trách mấy tổ, một tổ mấy người | Schema cho phép nhiều–nhiều; seed 1 người/tổ |
| O5 | Phí rác cồng kềnh có thành khoản phải thu (`Charge`) và nộp về xã không | Chỉ lưu phí công ty báo trên yêu cầu; không sinh `Charge` |
| O6 | Ai kiểm duyệt bài chợ đồ cũ | Không kiểm duyệt trong demo |
| O7 | Đăng nhập người dân thật (VNeID / OTP SMS) | OTP cố định mô phỏng |
