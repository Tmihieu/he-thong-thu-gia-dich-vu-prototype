const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUPS = ['', ' nghìn', ' triệu'];
const BILLION = 1_000_000_000;

function readGroup(n: number, full: boolean): string {
  const h = Math.floor(n / 100);
  const t = Math.floor(n / 10) % 10;
  const u = n % 10;
  const parts: string[] = [];
  if (full || h > 0) parts.push(`${DIGITS[h]} trăm`);
  if (t === 0 && u > 0 && (h > 0 || full)) parts.push('linh');
  else if (t === 1) parts.push('mười');
  else if (t > 1) parts.push(`${DIGITS[t]} mươi`);
  if (u > 0) {
    if (u === 1) parts.push(t > 1 ? 'mốt' : 'một');
    else if (u === 4) parts.push(t > 1 ? 'tư' : 'bốn');
    else if (u === 5) parts.push(t >= 1 ? 'lăm' : 'năm');
    else parts.push(DIGITS[u]!);
  }
  return parts.join(' ');
}

/** Số dưới một tỷ; `full` khi đứng sau một nhóm lớn hơn (phải đọc đủ ba chữ số: "không trăm", "linh"). */
function readBelowBillion(n: number, full: boolean): string {
  const out: string[] = [];
  let started = full;
  for (let g = 2; g >= 0; g--) {
    const group = Math.floor(n / 1000 ** g) % 1000;
    if (group === 0) continue;
    out.push(readGroup(group, started || out.length > 0) + GROUPS[g]);
    started = true;
  }
  return out.join(' ');
}

function readNumber(n: number, full: boolean): string {
  if (n >= BILLION) {
    const head = `${readNumber(Math.floor(n / BILLION), full)} tỷ`;
    const rest = n % BILLION;
    return rest === 0 ? head : `${head} ${readBelowBillion(rest, true)}`;
  }
  return readBelowBillion(n, full);
}

/**
 * Đọc số tiền VND bằng chữ cho bản in phiếu thu (R29), cùng quy tắc với backend `VietnameseMoneyWords`:
 * 4200000 → "Bốn triệu hai trăm nghìn đồng". Nhóm ba chữ số bằng 0 bỏ qua; nhóm khác 0 không đứng đầu đọc đủ.
 */
export function amountInWords(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Số tiền phải là số nguyên không âm');
  const words = amount === 0 ? 'không' : readNumber(amount, false);
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} đồng`;
}
