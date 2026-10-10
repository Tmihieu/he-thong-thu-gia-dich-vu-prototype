import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { pickOption } from '../../../test/antd';
import type { Area, Period } from '../../masterdata/api';
import type { FeeType } from '../api';
import { ChargeRequestForm } from './ChargeRequestForm';

const periods: Period[] = [
  {
    id: 5, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', settlementDueDate: '2026-11-05', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'COLLECTING',
    lockedAt: null, note: null,
  },
  {
    id: 4, code: '2026-08', periodType: 'MONTH', label: 'Tháng 08/2026', startDate: '2026-08-01', endDate: '2026-08-31',
    openDate: '2026-08-01', dueDate: '2026-08-31', settlementDueDate: '2026-09-05', tariffVersionId: 2, tariffVersionCode: 'BG-67-2025', status: 'LOCKED',
    lockedAt: '2026-09-05T10:00:00Z', note: null,
  },
];
const feeTypes: FeeType[] = [
  { id: 1, code: 'ENV', name: 'Phí vệ sinh môi trường (CTRSH)', pricingMode: 'TARIFF', defaultPrice: null, active: true },
  { id: 2, code: 'EXTRA', name: 'Phụ phí dịch vụ phát sinh', pricingMode: 'FIXED', defaultPrice: 50000, active: true },
];
const areas: Area[] = [
  { id: 7, code: 'KV07', name: 'Tổ dân phố 07', districtId: 1, districtCode: 'DTH', status: 'ACTIVE', subjectCount: 9 },
];

function renderForm() {
  const onPreview = vi.fn();
  render(<ChargeRequestForm periods={periods} feeTypes={feeTypes} areas={areas} companies={[]} onPreview={onPreview} />);
  return onPreview;
}

describe('ChargeRequestForm', () => {
  it('thiếu kỳ thì báo lỗi; kỳ đã khóa không có trong danh sách', async () => {
    const onPreview = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

    expect(await screen.findByText('Vui lòng chọn kỳ')).toBeInTheDocument();
    expect(onPreview).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('combobox', { name: 'Kỳ thu' }));
    expect(await screen.findByTitle('Tháng 10/2026 (BG-65-2026)')).toBeInTheDocument();
    expect(screen.queryByTitle('Tháng 08/2026 (BG-67-2025)')).not.toBeInTheDocument();
  });

  it('phạm vi chọn tổ mà chưa chọn tổ thì báo lỗi', async () => {
    renderForm();
    await userEvent.click(screen.getByText('Chọn tổ'));
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(await screen.findByText('Vui lòng chọn ít nhất một tổ')).toBeInTheDocument();
  });

  it('toàn xã kỳ 10/2026 gửi đúng yêu cầu xem trước', async () => {
    const onPreview = renderForm();
    await pickOption(screen.getByRole('combobox', { name: 'Kỳ thu' }), 'Tháng 10/2026 (BG-65-2026)');
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith(
        { periodId: 5, feeTypeId: 1, scopeType: 'ALL', areaIds: undefined, companyId: undefined,
          unitPrice: undefined, note: undefined },
        undefined, // kỳ đã mở: hạn nộp không đổi được
      ),
    );
  });

  it('phí giá cố định hiện ô đơn giá', async () => {
    renderForm();
    await pickOption(screen.getByRole('combobox', { name: 'Loại phí' }), 'Phụ phí dịch vụ phát sinh');
    expect(await screen.findByLabelText('Đơn giá')).toBeInTheDocument();
    expect(screen.getByText(/giá mặc định 50\.000/)).toBeInTheDocument();
  });

  it('đơn giá nhập tay không bao giờ được gửi là 0', async () => {
    const onPreview = renderForm();
    await pickOption(screen.getByRole('combobox', { name: 'Kỳ thu' }), 'Tháng 10/2026 (BG-65-2026)');
    await pickOption(screen.getByRole('combobox', { name: 'Loại phí' }), 'Phụ phí dịch vụ phát sinh');
    await userEvent.type(await screen.findByLabelText('Đơn giá'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

    // Ô số (min 1) nâng 0 lên 1 khi rời ô, hoặc form báo lỗi: cách nào cũng không gửi đơn giá 0.
    await waitFor(() =>
      expect(onPreview.mock.calls.length > 0 || screen.queryByText('Đơn giá phải lớn hơn 0') !== null).toBe(true),
    );
    expect(onPreview).not.toHaveBeenCalledWith(expect.objectContaining({ unitPrice: 0 }));
  });
});
