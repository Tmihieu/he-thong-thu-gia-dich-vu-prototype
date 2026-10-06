import { Alert } from 'antd';

import { MoneyText } from '../../shared/MoneyText';
import type { LedgerRow } from './api';

/** Cảnh báo đầu trang: công ty còn phải nộp của kỳ trước đã hết hạn (thay cột "Nợ kỳ trước"). Mỗi công ty một dòng. */
export function PreviousDebtAlert({ rows }: { rows: LedgerRow[] }) {
  return (
    <>
      {rows
        .filter((r) => r.previousDebt > 0)
        .map((r) => (
          <Alert
            key={r.companyId}
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={
              <>
                Kỳ trước chưa khóa: {r.companyName} còn phải nộp <MoneyText value={r.previousDebt} />
              </>
            }
          />
        ))}
    </>
  );
}
