import { MoneyText } from '../../shared/MoneyText';
import { StatusTag } from '../../shared/StatusTag';

/**
 * Còn phải nộp; số âm là xã phải trả lại công ty (phải nộp xã tính trên đã thu, góp ý BA 05/10), hiện
 * "Xã trả lại công ty X đ" thay vì số âm. Có phiếu chi trả (UC-55) thì thêm "đã trả Y, còn Z", trả đủ thì "xã đã trả đủ".
 */
export function RemainingText({ value, paid = 0, strong = false }: { value: number; paid?: number; strong?: boolean }) {
  if (value < 0) {
    const owed = Math.max(0, -value - paid);
    return (
      <StatusTag tone={paid > 0 && owed === 0 ? 'success' : 'warning'}>
        Xã trả lại công ty <MoneyText value={-value} />
        {paid > 0 && (
          <>
            {', đã trả '}
            <MoneyText value={paid} />
            {owed > 0 ? ', còn ' : ', xã đã trả đủ'}
            {owed > 0 && <MoneyText value={owed} />}
          </>
        )}
      </StatusTag>
    );
  }
  return <MoneyText value={value} strong={strong} />;
}
