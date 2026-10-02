# Chạy demo trên điện thoại Android (Termux + ngrok)

Toàn bộ hệ thống (PostgreSQL, backend, Jmix, web qua nginx) chạy trên điện thoại, mở ra Internet bằng domain tĩnh
miễn phí của ngrok. Đã chạy trên Galaxy A50 (3,5 GB RAM). Không cần root, không cần Docker.

```
Internet → ngrok (https://<domain>.ngrok-free.dev) → nginx :8088 ─┬─ /       web (file tĩnh)
                                                                  ├─ /api/  backend :8080
                                                                  └─ /jmix/ Jmix    :8081
```

## Chuẩn bị trên điện thoại (một lần)

1. Cài Termux (F-Droid/GitHub), bật SSH: `pkg install openssh && passwd && sshd` (cổng 8022).
2. Cài ngrok bản linux-arm64 vào `$PREFIX/bin`, rồi `ngrok config add-authtoken <token>`.
3. Lấy domain tĩnh miễn phí ở dashboard ngrok → Domains.
4. Tắt tối ưu pin cho Termux; nên cắm sạc và bật giới hạn sạc 85% khi chạy lâu.

## Cài và cập nhật từ laptop

```bash
deploy/android/pack.sh <ip-điện-thoại>
```

Script build backend, Jmix (production) và web, đóng gói rồi gửi sang `~/vsmt` trên điện thoại qua SSH (dùng được IP
Tailscale). Cập nhật lần sau chạy lại lệnh này; `vsmt.env`, ảnh tải lên và log được giữ nguyên.

## Trên điện thoại

```bash
~/vsmt/setup.sh    # lần đầu: CSDL vsmt, vsmt.env, cấu hình nginx — sau đó sửa NGROK_DOMAIN, POSTGRES_PASSWORD trong vsmt.env
~/vsmt/start.sh    # khởi động tất cả và in link
~/vsmt/status.sh   # xem tình trạng
~/vsmt/stop.sh     # dừng (PostgreSQL vẫn chạy)
```

Lần đầu backend tạo bảng và nạp dữ liệu demo nên mất vài phút. Log ở `~/vsmt/logs/`.

`start.sh` cũng bật `watch.sh` chạy nền: cứ 30 giây kiểm tra domain ngrok, hỏng 3 lần liên tiếp (ví dụ mất mạng rồi ngrok không nối lại được) thì tự mở lại tunnel, ghi vào `logs/watch.log`. Sau khi mạng có lại, tunnel trở lại trong khoảng 1–2 phút.

`start.sh` dừng RiceManagement nếu đang chạy, vì hai bên dùng chung cổng 8080 và domain ngrok. Muốn quay về Rice:
`~/vsmt/stop.sh && ~/run.sh`.

## Lưu ý

- Lần đầu mở link, ngrok miễn phí hiện trang cảnh báo, bấm **Visit Site**.
- Tài khoản demo: xem [docs/demo-accounts.md](../../docs/demo-accounts.md); trang đăng nhập có sẵn nút đăng nhập nhanh.
