#!/data/data/com.termux/files/usr/bin/bash
# Khởi động VSMT trên điện thoại: PostgreSQL → backend → Jmix → nginx (cổng 8088) → ngrok.
set -u
cd "$(dirname "$0")"
ROOT=$PWD
set -a; . ./vsmt.env; set +a
mkdir -p logs run/nginx-tmp data/uploads

command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

PGDATA="${PGDATA:-$PREFIX/var/lib/postgresql}"
pg_ctl -D "$PGDATA" status >/dev/null 2>&1 || { pg_ctl -D "$PGDATA" -l "$ROOT/logs/postgres.log" start; sleep 3; }

# RiceManagement dùng chung cổng 8080 và domain ngrok nên phải dừng (chạy lại ~/run.sh để quay về Rice).
if pgrep -f ricemgr-a50.jar >/dev/null; then
    echo "Dừng RiceManagement..."
    pkill -f ricemgr-a50.jar
    sleep 3
fi

# JIT cấp 1 + SerialGC: khởi động nhanh và tốn ít RAM hơn, đủ cho demo.
JAVA_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k -XX:ReservedCodeCacheSize=48m -Duser.timezone=Asia/Ho_Chi_Minh"

running() { [ -f "run/$1.pid" ] && kill -0 "$(cat "run/$1.pid")" 2>/dev/null; }

wait_http() { # tên, URL, số giây tối đa
    for _ in $(seq 1 "$3"); do
        code=$(curl -s -o /dev/null -w '%{http_code}' "$2")
        [ "$code" != "000" ] && { echo "  $1 đã sẵn sàng."; return 0; }
        sleep 1
    done
    echo "  $1 chưa lên sau $3 giây, xem logs/$1.log"
    return 1
}

if running backend; then
    echo "Backend đang chạy."
else
    echo "Khởi động backend (lần đầu tạo bảng + dữ liệu demo, mất vài phút)..."
    SPRING_PROFILES_ACTIVE=demo SERVER_PORT=8080 UPLOAD_DIR="$ROOT/data/uploads" TZ=Asia/Ho_Chi_Minh \
        nohup java -Xms64m -Xmx"$BACKEND_XMX" $JAVA_OPTS -jar backend.jar > logs/backend.log 2>&1 &
    echo $! > run/backend.pid
fi
wait_http backend http://127.0.0.1:8080/v3/api-docs 600

if running jmix; then
    echo "Jmix đang chạy."
else
    echo "Khởi động Jmix..."
    JMIX_PORT=8081 TZ=Asia/Ho_Chi_Minh \
        nohup java -Xms64m -Xmx"$JMIX_XMX" $JAVA_OPTS -jar jmix-admin.jar > logs/jmix.log 2>&1 &
    echo $! > run/jmix.pid
fi
wait_http jmix http://127.0.0.1:8081/jmix/login 300

NGINX="nginx -p $ROOT/run -e $ROOT/logs/nginx-error.log -c $ROOT/run/nginx.conf"
if [ -f run/nginx.pid ] && kill -0 "$(cat run/nginx.pid)" 2>/dev/null; then $NGINX -s reload; else $NGINX; fi

./ngrok-up.sh
sleep 5

# Giám sát tunnel: tự mở lại ngrok khi mất mạng làm đứt tunnel (log: logs/watch.log).
[ -f run/watch.pid ] && kill "$(cat run/watch.pid)" 2>/dev/null
nohup ./watch.sh > /dev/null 2>&1 &
echo $! > run/watch.pid

./status.sh
