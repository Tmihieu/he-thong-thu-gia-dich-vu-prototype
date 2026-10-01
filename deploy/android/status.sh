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
if grep -q "started tunnel" logs/ngrok.log 2>/dev/null && pgrep -f "ngrok http" >/dev/null; then
    echo "  ✅ ngrok    https://$NGROK_DOMAIN"
else
    echo "  ❌ ngrok    (xem logs/ngrok.log)"
fi
free -m | awk 'NR==2 {printf "RAM còn trống: %s MB / %s MB\n", $7, $2}'
echo "Đăng nhập: bấm nút tài khoản demo ở trang đăng nhập (mật khẩu chung Demo@2026)."
