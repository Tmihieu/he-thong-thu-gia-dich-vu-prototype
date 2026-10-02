#!/data/data/com.termux/files/usr/bin/bash
# Dừng VSMT. PostgreSQL vẫn chạy vì dùng chung với ứng dụng khác trên máy.
cd "$(dirname "$0")"
ROOT=$PWD

[ -f run/watch.pid ] && kill "$(cat run/watch.pid)" 2>/dev/null
rm -f run/watch.pid
[ -f run/ngrok.pid ] && kill "$(cat run/ngrok.pid)" 2>/dev/null
pkill -f "ngrok http --url=.* 127.0.0.1:8088" 2>/dev/null
[ -f run/nginx.pid ] && nginx -p "$ROOT/run" -e "$ROOT/logs/nginx-error.log" -c "$ROOT/run/nginx.conf" -s stop 2>/dev/null
for name in jmix backend; do
    [ -f "run/$name.pid" ] && kill "$(cat "run/$name.pid")" 2>/dev/null
    rm -f "run/$name.pid"
done
rm -f run/ngrok.pid
command -v termux-wake-unlock >/dev/null 2>&1 && termux-wake-unlock
echo "Đã dừng VSMT."
