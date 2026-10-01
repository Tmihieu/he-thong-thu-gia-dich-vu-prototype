#!/usr/bin/env bash
# Chạy trên laptop: build backend, Jmix, web rồi đóng gói vào deploy/android/out/vsmt-android.tar.gz.
#   ./pack.sh                 chỉ đóng gói
#   ./pack.sh <ip-điện-thoại>  đóng gói rồi gửi sang Termux qua SSH (cổng 8022, ví dụ IP Tailscale) vào ~/vsmt
# Đặt SKIP_BUILD=1 để dùng lại bản build có sẵn.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(cd "$HERE/../.." && pwd)
OUT=$HERE/out
STAGE=$OUT/vsmt

if [ "${SKIP_BUILD:-0}" != 1 ]; then
    (cd "$REPO/backend" && sh ./mvnw -B -ntp -q package -DskipTests)
    (cd "$REPO/jmix-admin" && sh ./gradlew -q -Pvaadin.productionMode=true bootJar -x test)
    (cd "$REPO/web" && npm run build)
fi

rm -rf "$STAGE" && mkdir -p "$STAGE"
cp "$(ls "$REPO"/backend/target/*.jar | grep -v original | head -1)" "$STAGE/backend.jar"
cp "$(ls "$REPO"/jmix-admin/build/libs/*.jar | grep -v plain | head -1)" "$STAGE/jmix-admin.jar"
cp -r "$REPO/web/dist" "$STAGE/web"
cp "$HERE"/{setup.sh,start.sh,stop.sh,status.sh,nginx.conf.template,vsmt.env.example,README.md} "$STAGE/"
tar -czf "$OUT/vsmt-android.tar.gz" -C "$OUT" vsmt
echo "Đã đóng gói: $OUT/vsmt-android.tar.gz"

if [ $# -ge 1 ]; then
    scp -P 8022 "$OUT/vsmt-android.tar.gz" "$1:vsmt-android.tar.gz"
    # Giữ lại vsmt.env, data/, logs/ của lần cài trước; chỉ thay jar, web và script.
    ssh -p 8022 "$1" 'rm -rf ~/vsmt/web && tar -xzf ~/vsmt-android.tar.gz -C ~ && rm ~/vsmt-android.tar.gz && chmod +x ~/vsmt/*.sh'
    echo "Đã gửi sang $1:~/vsmt. Lần đầu chạy ~/vsmt/setup.sh, sau đó ~/vsmt/start.sh"
fi
