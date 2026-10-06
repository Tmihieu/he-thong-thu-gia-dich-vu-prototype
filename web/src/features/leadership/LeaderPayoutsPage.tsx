import { PageHeader } from '../../shared/PageHeader';
import { PayoutsPage } from '../remittance/PayoutsPage/PayoutsPage';

/** Lãnh đạo xem phiếu chi trả công ty (UC-55): chỉ xem, không lập phiếu chi. */
export function LeaderPayoutsPage() {
  return (
    <>
      <PageHeader title="Phiếu chi trả công ty" description="Xã trả lại công ty bao nhiêu, đã trả và còn phải trả." />
      <PayoutsPage readOnly />
    </>
  );
}
