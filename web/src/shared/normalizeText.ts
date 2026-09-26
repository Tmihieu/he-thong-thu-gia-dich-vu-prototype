/** Chuẩn hóa để tìm không dấu: "Trần Thị" ~ "tran thi". */
export function normalizeText(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/gi, 'd').toLowerCase();
}
