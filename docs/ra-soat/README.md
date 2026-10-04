# Rà soát tổng 04/10/2026 — luật phối hợp 5 cửa sổ

Mục tiêu: đi từ giao diện, tìm và sửa hết sạn của dự án; soạn đủ bộ business rule và đưa code về đúng rule; web rà + làm đẹp lại; mobile làm lại giao diện, giữ logic.

Nhánh tích hợp: `feat/ra-soat-tong` (tách từ `feat/chuan-hoa-dia-chi-goong-ba`). Không ai đụng `main`.

## 1. Phân lane — mỗi file chỉ có MỘT chủ

| Cửa sổ | Thư mục làm việc | Nhánh | ĐƯỢC sửa |
|---|---|---|---|
| 1 Leader | `he-thong-thu-gia-dich-vu-prototype` | `feat/ra-soat-tong` | `docs/**` (trừ file lane của người khác), `SPEC.md`, `tasks/**`, `*/src/api/schema.d.ts` (chỉ sinh bằng `gen:api`), file gốc repo (`docker-compose.yml`, `.env.example`, `AGENTS.md`), `deploy/`, `jmix-admin/` |
| 2 Backend | `../vsmt-be` | `ra-soat/backend` | `backend/**` — là cửa sổ DUY NHẤT thêm migration (từ `V32__`) và seed |
| 3 Web xã | `../vsmt-web-xa` | `ra-soat/web-xa` | `web/src/app/**`, `web/src/shared/**`, `web/src/features/{masterdata,billing,platform,leadership}/**`, `web/public/**`, cấu hình web (`package.json`, `vite.config.ts`, eslint…) |
| 4 Web công ty | `../vsmt-web-cty` | `ra-soat/web-cty` | `web/src/features/{collection,remittance,complaints,notifications,market,citizen}/**` |

Ngoài ra mỗi lane có đúng một file báo cáo riêng: `docs/ra-soat/<lane>.md` (`backend.md`, `web-xa.md`, `web-cty.md`).

**Thấy sạn ở file không phải của mình: KHÔNG sửa.** Ghi vào mục "Yêu cầu sang lane khác" trong file báo cáo của mình, commit, làm việc khác. Leader đọc và chuyển.

## 2. Luật chung

1. Chỉ sửa file thuộc lane mình (bảng trên). Trước mỗi commit chạy `git status` và kiểm không có file ngoài lane.
2. Sửa xong một sạn là commit ngay (Conventional Commits: `fix(web): ...`, `feat(mobile): ...`), commit nhỏ, một việc. Xong một đợt thì `git push -u origin <nhánh mình>`. Không push nhánh khác, không force-push, không rebase.
3. Cần lấy thay đổi mới của lane khác: `git merge feat/ra-soat-tong` (chỉ merge, chỉ từ nhánh tích hợp). Không merge thẳng nhánh lane khác.
4. **Rule nghiệp vụ chưa rõ → không tự quyết.** Lỗi rõ ràng (crash, chữ sai, số hiển thị lệch nguồn, nút sai quyền, thiếu trạng thái trống/lỗi/đang tải, code lệch một rule ĐÃ CHỐT) thì sửa luôn. Chỗ nào đổi hành vi nghiệp vụ, đụng cách tính tiền, hay cần ngưỡng (ngày, số lượng, số tiền, %) mà tài liệu chưa chốt: ghi vào mục "Câu hỏi nghiệp vụ" kèm phương án đề xuất, không sửa. **Từ 04/10 người dùng giao leader tự quyết 100%:** lane nhắn câu hỏi kèm đề xuất cho leader, leader chốt và ghi vào `docs/ra-soat/quyet-dinh-leader.md`; lane làm theo quyết định đó, không tự quyết thay leader.
5. Nguồn chuẩn theo thứ tự ưu tiên: `docs/business-rules.md` (leader soạn, xem bằng `git show feat/ra-soat-tong:docs/business-rules.md`) → `docs/thay-doi-2026-10-03.md` → `SPEC.md` → `docs/main-business-flows.md` → `docs/data-dictionary.md`. Thấy tài liệu tự mâu thuẫn: ghi vào "Câu hỏi nghiệp vụ".
6. **Máy yếu (7,3 GB RAM): mỗi lúc chỉ một việc nặng trên toàn máy.** Chỉ leader chạy `mvnw verify`, `docker compose up --build`, `npm ci`. Lane được chạy:
   - Backend: `.\mvnw.cmd test -Dtest=<TenLop>` từng lớp một (là lane duy nhất chạy Maven). Không chạy `verify`.
   - Web: `npx vitest run <đường dẫn file test của mình>`, `npm run lint`, `npx tsc --noEmit -p .`. Không chạy `npm test` toàn bộ, không `npm run build`.
7. Không thêm thư viện mới. Thật sự cần thì ghi "Yêu cầu sang lane khác" gửi leader.
8. Không sửa tay `schema.d.ts`. Cần API/field mới: ghi yêu cầu cho lane Backend; leader gộp backend rồi chạy `gen:api`, lane kia `git merge feat/ra-soat-tong` để nhận.
9. Xem giao diện thật: leader chạy backend + CSDL demo ở cổng 8080 (một bản duy nhất, dùng chung). Web xã `npm run dev -- --port 5174`, Web công ty `npm run dev -- --port 5175`. Tài khoản ở `docs/demo-accounts.md`. Dữ liệu demo dùng chung nên **không khóa kỳ, không xóa/nạp lại dữ liệu ở màn Quản trị dữ liệu, không đổi mật khẩu tài khoản demo**; cần thì nhờ leader.
10. Có `.codegraph/` thì dùng CodeGraph trước; không có thì bỏ qua.
11. Giao diện: tiếng Việt có dấu, người dùng lớn tuổi (người đi thu) → chữ to, ít nút, nhãn theo `labels.ts`. Không viết "hợp đồng" cho hộ dân (gọi "Đăng ký thu phí").

## 3. File báo cáo của lane — `docs/ra-soat/<lane>.md`

```markdown
# <Lane> — rà soát 04/10/2026

## Đã rà (đánh dấu từng màn / module)
- [x] /commune/subjects — 3 sạn, đã sửa 3

## Sạn đã sửa
| # | Màn / file | Sạn | Rule (BR-xx nếu có) | Commit |

## Sạn chưa sửa (kèm lý do)

## Câu hỏi nghiệp vụ
| # | Tình huống | Code đang làm gì | Tài liệu nói gì | Đề xuất |

## Yêu cầu sang lane khác
| # | Gửi lane | Cần gì | Vì sao | Trạng thái |
```

## 4. Việc từng lane

### Cửa sổ 1 — Leader
- Soạn `docs/business-rules.md`: mỗi rule một mã `BR-<module>-nn`, nguồn (SPEC § / QĐ 65 / chốt ngày nào), nơi thực thi (backend / web / mobile), trạng thái (đúng / lệch / chờ xã).
- Đọc file báo cáo các lane qua `git show ra-soat/<lane>:docs/ra-soat/<lane>.md`, chuyển yêu cầu chéo, gom câu hỏi nghiệp vụ hỏi người dùng theo đợt.
- Gộp các nhánh lane vào `feat/ra-soat-tong` theo thứ tự backend → web-xa → web-cty → mobile; sau mỗi đợt gộp: `mvnw verify`, web `npm test` + `npm run build`, mobile typecheck + jest, `gen:api` nếu API đổi.

### Cửa sổ 2 — Backend
- Với từng module (`masterdata`, `billing`, `collection`, `remittance`, `leadership`, `complaint`, `notification`, `citizen`, `platform`): đối chiếu từng rule trong tài liệu với code — phân quyền từng endpoint theo vai trò, kiểm dữ liệu đầu vào, chuyển trạng thái, cách tính tiền (làm tròn, kỳ, miễn giảm, xóa nợ, hoàn, cầm lại phần thu gom), tranh chấp đồng thời, audit log, thông báo.
- Mỗi sạn sửa kèm một test (thêm vào `*Test` / `*IT` sẵn có của module).
- Sửa các test đang đỏ sẵn: `CompanyApiIT`, `LocationApiIT`.
- Nhận yêu cầu API từ các lane giao diện.

### Cửa sổ 3 — Web xã / quản trị / lãnh đạo + khung chung
- **Làm trước, commit + push sớm:** chỉnh `web/src/app/theme.ts`, layout, menu, component dùng chung (`shared/`) cho đồng bộ, đẹp, dễ đọc — để lane Web công ty kế thừa. Dùng skill `redesign-existing-projects`; giữ Ant Design, chỉ dùng token của theme.
- Rà từng màn theo vai trò Xã, Quản trị, Lãnh đạo (đăng nhập thật, bấm hết nút, hết tab, hết trạng thái): Đối tượng/hộ, Địa bàn, Công ty, Biểu giá, Kỳ thu, Cấu hình, Khoản thu, Lập phiếu, Tài khoản, Nhật ký, Dashboard/Báo cáo/Chờ duyệt.
- Sửa test web đang đỏ sẵn thuộc lane: `ChargesHubPage`, `AreasPage`, `CompaniesPage`, `LocationsSettings`.

### Cửa sổ 4 — Web công ty / người đi thu / đối soát / khiếu nại
- Rà từng màn theo vai trò Công ty, Người đi thu, và các màn xã thuộc thư mục mình (Tiến độ, Đối soát, Biên lai, Sai sót biên lai, Khiếu nại, Thông báo, Chợ đồ cũ, Đồ cồng kềnh).
- Trọng tâm: **số tiền trên các màn phải khớp nhau** (tiến độ = đối soát = màn công ty = báo cáo lãnh đạo), TM/CK, cầm lại phần thu gom, hoàn, xóa nợ, điều chỉnh kỳ trước.
- Làm đẹp bằng token/`shared` do lane Web xã đưa ra (merge `feat/ra-soat-tong` khi leader báo đã có); không tự đặt màu, cỡ chữ cứng. Cần component dùng chung mới → yêu cầu lane Web xã.

