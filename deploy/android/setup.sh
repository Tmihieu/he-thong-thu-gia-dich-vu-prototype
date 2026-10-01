#!/data/data/com.termux/files/usr/bin/bash
# Cài lần đầu trên Termux: gói cần thiết, CSDL vsmt, vsmt.env và cấu hình nginx. Chạy lại nhiều lần không sao.
set -eu
cd "$(dirname "$0")"
ROOT=$PWD

for cmd in java pg_ctl psql nginx ngrok proot curl; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        echo "Thiếu $cmd, đang cài gói..."
        pkg install -y openjdk-21 postgresql nginx proot curl
        break
    fi
done
command -v ngrok >/dev/null 2>&1 || { echo "Chưa có ngrok: cài ngrok (linux-arm64) rồi chạy lại."; exit 1; }

[ -f vsmt.env ] || cp vsmt.env.example vsmt.env
if ! grep -q '^JWT_SECRET=.\+' vsmt.env; then
    secret=$(head -c 48 /dev/urandom | base64 | tr -d '\n/+=')
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$secret|" vsmt.env
fi
set -a; . ./vsmt.env; set +a

PGDATA="${PGDATA:-$PREFIX/var/lib/postgresql}"
mkdir -p logs run/nginx-tmp data/uploads
[ -d "$PGDATA" ] || initdb -D "$PGDATA"
pg_ctl -D "$PGDATA" status >/dev/null 2>&1 || { pg_ctl -D "$PGDATA" -l "$ROOT/logs/postgres.log" start; sleep 3; }

export PGPASSWORD="$POSTGRES_PASSWORD"
if ! psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d postgres -Atc "select 1 from pg_database where datname='$POSTGRES_DB'" | grep -q 1; then
    createdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_DB"
fi
# Migration của backend cần btree_gist (cần quyền superuser nên tạo sẵn ở đây).
psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -qc "create extension if not exists btree_gist"

sed -e "s|@ROOT@|$ROOT|g" -e "s|@PREFIX@|$PREFIX|g" nginx.conf.template > run/nginx.conf
nginx -t -p "$ROOT/run" -e "$ROOT/logs/nginx-error.log" -c "$ROOT/run/nginx.conf"
chmod +x start.sh stop.sh status.sh

echo "Đã cài xong. Kiểm tra NGROK_DOMAIN trong vsmt.env rồi chạy ./start.sh"
