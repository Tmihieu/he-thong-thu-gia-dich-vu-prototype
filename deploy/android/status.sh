#!/data/data/com.termux/files/usr/bin/bash
# Tình trạng các service VSMT trên điện thoại.
cd "$(dirname "$0")"
set -a; . ./vsmt.env; set +a

check() { # tên, URL
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 "$2")
    if [ "$code" = "000" ]; then echo "  ❌ $1"; else echo "  ✅ $1"; fi
}

echo "=== VSMT trên điện thoại ==="
check "Backend  :8080" http://127.0.0.1:8080/v3/api-docs
check "Jmix     :8081" http://127.0.0.1:8081/jmix/login
check "Web/nginx:8088" http://127.0.0.1:8088/
# Kiểm tra qua domain công khai: ngrok trả 404 khi tunnel đã đứt dù tiến trình vẫn sống.
code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 -H 'ngrok-skip-browser-warning: 1' "https://$NGROK_DOMAIN/")
if [ "$code" = "200" ]; then
    echo "  ✅ ngrok    https://$NGROK_DOMAIN"
else
    echo "  ❌ ngrok    (HTTP $code, xem logs/ngrok.log)"
fi
if [ -f run/watch.pid ] && kill -0 "$(cat run/watch.pid)" 2>/dev/null; then
    echo "  ✅ watch    tự mở lại ngrok khi đứt"
else
    echo "  ❌ watch    (chạy ./start.sh để bật)"
fi
free -m | awk 'NR==2 {printf "RAM còn trống: %s MB / %s MB\n", $7, $2}'
echo "Đăng nhập: bấm nút tài khoản demo ở trang đăng nhập (mật khẩu chung Demo@2026)."
