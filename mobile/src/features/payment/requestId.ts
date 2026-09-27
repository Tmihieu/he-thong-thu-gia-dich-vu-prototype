/**
 * Khóa chống gửi trùng cho thanh toán mô phỏng: mỗi khoản giữ một `clientRequestId` cho tới khi backend
 * xác nhận thành công (như web T27). Bấm hai lần, mạng chậm hay gửi lại sau lỗi mạng đều dùng lại cùng mã
 * nên backend chỉ tạo một thanh toán; đổi mã chỉ sau khi thành công (để lần thanh toán sau là yêu cầu mới).
 */

const pending = new Map<number, string>();

function random(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** ≤ 40 ký tự (giới hạn `client_request_id`). */
export function newRequestId(now: () => number = Date.now): string {
  return `app-${now().toString(36)}-${random()}${random()}`.slice(0, 40);
}

export function requestIdFor(chargeId: number): string {
  let id = pending.get(chargeId);
  if (!id) {
    id = newRequestId();
    pending.set(chargeId, id);
  }
  return id;
}

export function completeRequest(chargeId: number): void {
  pending.delete(chargeId);
}

/** Chỉ dùng trong test. */
export function resetRequestIds(): void {
  pending.clear();
}
