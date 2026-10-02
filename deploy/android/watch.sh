#!/data/data/com.termux/files/usr/bin/bash
# Giám sát tunnel: nếu domain ngrok không trả về trang web (mất mạng rồi ngrok không nối lại được) thì mở lại tunnel.
# start.sh tự chạy script này nền; log ở logs/watch.log.
cd "$(dirname "$0")"
set -a; . ./vsmt.env; set +a
INTERVAL=30   # giây giữa hai lần kiểm tra
FAILS=3       # số lần hỏng liên tiếp trước khi mở lại tunnel
bad=0

log() { echo "$(date '+%F %T') $*" >> logs/watch.log; }

while true; do
    sleep "$INTERVAL"
    # Chỉ xét khi nginx cục bộ còn sống; nếu web sập thì mở lại tunnel cũng vô ích.
    [ "$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://127.0.0.1:8088/)" = "200" ] || { bad=0; continue; }
    code=$(curl -s -o /dev/null -w '%{http_code}' -m 15 -H 'ngrok-skip-browser-warning: 1' "https://$NGROK_DOMAIN/")
    if [ "$code" = "200" ]; then
        bad=0
        continue
    fi
    bad=$((bad + 1))
    if [ "$bad" -ge "$FAILS" ]; then
        log "tunnel hỏng ($code) $bad lần liên tiếp, mở lại ngrok"
        ./ngrok-up.sh
        bad=0
        sleep 20
    fi
done
