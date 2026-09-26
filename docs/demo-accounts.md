# Tài khoản demo

> **Chỉ dùng cho dữ liệu giả của profile `demo`** (seed ở `backend/src/main/resources/db/seed/`).
> Không dùng các mật khẩu này cho bất kỳ môi trường có dữ liệu thật nào. CSDL chỉ lưu mã băm bcrypt.

Mật khẩu chung của mọi tài khoản demo: **`Demo@2026`**

| Tên đăng nhập | Vai trò | Họ tên (giả) | Công ty | Seed ở |
|---|---|---|---|---|
| `admin` | Quản trị (`ADMIN`) | Quản trị hệ thống | — | T05 · `V1_1__seed_users.sql` |
| `canbo_xa` | Cán bộ xã (`COMMUNE_OFFICER`) | Nguyễn Thị Mẫu | — | T05 · `V1_1__seed_users.sql` |
| `dv01` … `dv11` | Công ty môi trường (`COMPANY_MANAGER`) | Người đầu mối của công ty (giả) | DV01 … DV11 | T09 · `V3_2__seed_company_users.sql` |
| người đi thu | Người đi thu (`COLLECTOR`) | | | T20 (chưa có) |

Người dân không có tài khoản ở bảng `users`; app người dân đăng nhập bằng số điện thoại + OTP cố định (T39, G8).

Reset CSDL demo về seed ban đầu: `docker compose down -v && docker compose up -d db`, rồi chạy lại backend.
