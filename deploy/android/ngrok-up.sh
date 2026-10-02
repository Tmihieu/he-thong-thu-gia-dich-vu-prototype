#!/data/data/com.termux/files/usr/bin/bash
# Mở (hoặc mở lại) tunnel ngrok về nginx :8088. Dùng bởi start.sh và watch.sh.
cd "$(dirname "$0")"
set -a; . ./vsmt.env; set +a
mkdir -p logs run

# Một domain ngrok chỉ mở được một tunnel: tắt tunnel cũ (kể cả của Rice) rồi mở lại.
pkill -f "ngrok http" 2>/dev/null
sleep 1
nohup proot -b "$PREFIX/etc/resolv.conf:/etc/resolv.conf" \
    ngrok http --url="$NGROK_DOMAIN" 127.0.0.1:8088 --log=stdout > logs/ngrok.log 2>&1 &
echo $! > run/ngrok.pid
