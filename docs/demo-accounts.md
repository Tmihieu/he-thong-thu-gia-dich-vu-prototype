# Tài khoản demo

> **Chỉ dùng cho dữ liệu giả của profile `demo`** (seed ở `backend/src/main/resources/db/seed/`).
> Không dùng các mật khẩu này cho bất kỳ môi trường có dữ liệu thật nào. CSDL chỉ lưu mã băm bcrypt.

Mật khẩu chung của mọi tài khoản demo: **`Demo@2026`**

Màn đăng nhập điền sẵn tài khoản demo để người trình diễn bấm là vào:

- Web: điền sẵn `admin`, kèm nút đăng nhập nhanh theo vai trò. Tắt bằng `VITE_DEMO_LOGIN=false` lúc build.
- Jmix (`/jmix`, mục *Quản trị dữ liệu*): điền sẵn `admin`. Tắt bằng `JMIX_DEMO_USERNAME=` (để trống).
- App người dân: điền sẵn SĐT `0902000128`; OTP demo là `123456`.

| Tên đăng nhập | Vai trò | Họ tên (giả) | Công ty | Seed ở |
|---|---|---|---|---|
| `admin` | Quản trị (`ADMIN`) | Quản trị hệ thống | — | T05 · `V1_1__seed_users.sql` |
| `canbo_xa` | Cán bộ xã (`COMMUNE_OFFICER`) | Nguyễn Thị Mẫu | — | T05 · `V1_1__seed_users.sql` |
| `lanhdao` | Lãnh đạo (`LEADER`) | Trần Văn Mẫu (lãnh đạo) | — | T54 · `V24_1__seed_leader.sql` |
| `dv01` … `dv11` | Công ty môi trường (`COMPANY_MANAGER`) | Người đầu mối của công ty (giả) | DV01 … DV11 | T09 · `V3_2__seed_company_users.sql` |
| `thu01` … `thu23` | Người đi thu (`COLLECTOR`) | Tên giả kèm "(người thu Ấp N)" | Công ty đang phụ trách ấp | T20 · `V9_1__seed_collectors.sql` — mỗi tổ cũ đã có công ty một người, số theo tổ cũ KV01–24 (vd. `thu07` ở Ấp 39 của DV01); `V40_1` đổi tên theo ấp |

## App người dân

Người dân không có tài khoản ở bảng `users` mà ở `citizen_accounts` (G8). App đăng nhập bằng số điện thoại + **OTP cố định mô phỏng `123456`** (O7, không gửi SMS; đổi bằng biến môi trường `CITIZEN_DEMO_OTP`). Seed ở T39 · `V18_1__seed_citizens.sql`.

| Số điện thoại | Hộ | Ấp · công ty | Ghi chú |
|---|---|---|---|
| `0902000128` | `DTH-H000128` | Ấp 39 · DV01 | Hộ của kịch bản demo §10 |
| `0903000128` | `DTH-H000128` | Ấp 39 · DV01 | Tài khoản thành viên thứ hai cùng hộ (D11) |
| `0902000161` | `TTT-H000161` | Ấp 2 · DV01 | Ấp khác của DV01 |
| `0902000221` | `TTT-H000221` | Ấp 9 · DV07 | Công ty khác |
| `0902000341` | `NB-H000341` | Ấp 49 · DV07 | Địa bàn Nhị Bình |
| `0902000149` | `DTH-H000149` | Ấp 42 · DV08 | Hộ miễn 100% |

Khu vực là 52 ấp thật của xã Đông Thạnh sau sáp nhập (ranh giới và số ấp từ OpenStreetMap, ODbL) — `V40_1__seed_dong_thanh_hamlets.sql` đổi 24 tổ giả KV01–24 sang mã `AP01`…`AP52`, giữ nguyên hộ/phân công đã seed. Địa bàn là xã cũ: Thới Tam Thôn = Ấp 1–23, Đông Thạnh = Ấp 24–47, Nhị Bình = Ấp 48–52.

Reset CSDL demo về seed ban đầu: `docker compose down -v && docker compose up -d db`, rồi chạy lại backend.
