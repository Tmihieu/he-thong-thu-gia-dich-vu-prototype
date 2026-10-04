#!/usr/bin/env bash
# Giả lập SePay báo "có tiền vào tài khoản" để xem hộ chuyển khoản qua mã QR được ghi Đã đóng ngay trên app và web.
# Chỉ dùng cho demo trên máy cục bộ: tiền không có thật.
#
# Cách dùng: scripts/simulate-bank-transfer.sh <nội dung CK> <số tiền> <số tài khoản công ty>
# Cả ba giá trị đều hiện ngay dưới mã QR trong app người dân, ví dụ:
#   scripts/simulate-bank-transfer.sh VSMT000123 80000 9999000007
#
# Biến môi trường: API_URL (mặc định http://localhost:8080); SEPAY_WEBHOOK_API_KEY (không đặt thì đọc từ .env ở gốc repo,
# phải trùng giá trị backend đã nạp).
set -euo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "${SEPAY_WEBHOOK_API_KEY:-}" ] && [ -f "$root/.env" ]; then
  SEPAY_WEBHOOK_API_KEY="$(grep -E '^SEPAY_WEBHOOK_API_KEY=' "$root/.env" | head -1 | cut -d= -f2- | tr -d '\r')"
fi
if [ -z "${SEPAY_WEBHOOK_API_KEY:-}" ]; then
  echo "Chưa có SEPAY_WEBHOOK_API_KEY (đặt trong .env rồi khởi động lại backend)." >&2
  exit 1
fi

content="$1"
amount="$2"
account="$3"

echo "Chuyển $amount đ vào tài khoản $account, nội dung $content"
curl -sS -X POST "${API_URL:-http://localhost:8080}/api/payments/sepay/webhook" \
  -H "Authorization: Apikey $SEPAY_WEBHOOK_API_KEY" -H 'Content-Type: application/json' \
  -d "{\"id\": $(date +%s%N | cut -c1-15), \"gateway\": \"MBBank\", \"transactionDate\": \"$(date '+%Y-%m-%d %H:%M:%S')\",
       \"accountNumber\": \"$account\", \"code\": \"$content\", \"content\": \"$content\", \"transferType\": \"in\",
       \"transferAmount\": $amount, \"referenceCode\": \"SIM$(date +%s)\"}"
echo
