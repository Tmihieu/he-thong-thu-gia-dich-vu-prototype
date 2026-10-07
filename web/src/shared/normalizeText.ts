/** Chuẩn hóa để tìm không dấu: "Trần Thị" ~ "tran thi". */
export function normalizeText(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLowerCase();
}

/** `filterOption` của Select antd: gõ không dấu vẫn lọc được ("to ky" ra "Tô Ký"). */
export function filterNoMarks(input: string, option?: { label?: unknown }) {
  return normalizeText(String(option?.label ?? '')).includes(normalizeText(input));
}
