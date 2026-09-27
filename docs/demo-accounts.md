# Tài khoản demo

> **Chỉ dùng cho dữ liệu giả của profile `demo`** (seed ở `backend/src/main/resources/db/seed/`).
> Không dùng các mật khẩu này cho bất kỳ môi trường có dữ liệu thật nào. CSDL chỉ lưu mã băm bcrypt.

Mật khẩu chung của mọi tài khoản demo: **`Demo@2026`**

| Tên đăng nhập | Vai trò | Họ tên (giả) | Công ty | Seed ở |
|---|---|---|---|---|
| `admin` | Quản trị (`ADMIN`) | Quản trị hệ thống | — | T05 · `V1_1__seed_users.sql` |
| `canbo_xa` | Cán bộ xã (`COMMUNE_OFFICER`) | Nguyễn Thị Mẫu | — | T05 · `V1_1__seed_users.sql` |
| `dv01` … `dv11` | Công ty môi trường (`COMPANY_MANAGER`) | Người đầu mối của công ty (giả) | DV01 … DV11 | T09 · `V3_2__seed_company_users.sql` |
| `thu01` … `thu23` | Người đi thu (`COLLECTOR`) | Tên giả kèm "(người thu KVxx)" | Công ty đang phụ trách tổ | T20 · `V9_1__seed_collectors.sql` — mỗi tổ đã có công ty một người, số theo tổ (vd. `thu07` ở KV07 của DV01); KV24 chưa có |

## App người dân

Người dân không có tài khoản ở bảng `users` mà ở `citizen_accounts` (G8). App đăng nhập bằng số điện thoại + **OTP cố định mô phỏng `123456`** (O7, không gửi SMS; đổi bằng biến môi trường `CITIZEN_DEMO_OTP`). Seed ở T39 · `V18_1__seed_citizens.sql`.

| Số điện thoại | Hộ | Tổ · công ty | Ghi chú |
|---|---|---|---|
| `0902000128` | `DTH-H000128` | KV07 · DV01 | Hộ của kịch bản demo §10 |
| `0903000128` | `DTH-H000128` | KV07 · DV01 | Tài khoản thành viên thứ hai cùng hộ (D11) |
| `0902000161` | `TTT-H000161` | KV09 · DV01 | Tổ khác của DV01 |
| `0902000221` | `TTT-H000221` | KV12 · DV07 | Công ty khác |
| `0902000341` | `NB-H000341` | KV18 · DV07 | Địa bàn Nhị Bình |
| `0902000149` | `DTH-H000149` | KV08 · DV08 | Hộ miễn 100% |

Reset CSDL demo về seed ban đầu: `docker compose down -v && docker compose up -d db`, rồi chạy lại backend.
