import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { pickDate, pickOption } from '../../../test/antd';
import type { Area, Period } from '../../masterdata/api';
import type { FeeType } from '../api';
import { ChargeRequestForm } from './ChargeRequestForm';

const periods: Period[] = [
  {
    id: 5, code: '2026-10', periodType: 'MONTH', label: 'Tháng 10/2026', startDate: '2026-10-01', endDate: '2026-10-31',
    openDate: '2026-10-01', dueDate: '2026-10-31', tariffVersionId: 1, tariffVersionCode: 'BG-65-2026', status: 'OPEN',
    lockedAt: null, note: null,
  },
  {
    id: 4, code: '2026-08', periodType: 'MONTH', label: 'Tháng 08/2026', startDate: '2026-08-01', endDate: '2026-08-31',
    openDate: '2026-08-01', dueDate: '2026-08-31', tariffVersionId: 2, tariffVersionCode: 'BG-67-2025', status: 'LOCKED',
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
  it('thiếu kỳ và hạn đóng thì báo lỗi; kỳ đã khóa không có trong danh sách', async () => {
    const onPreview = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

    expect(await screen.findByText('Vui lòng chọn kỳ')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn hạn đóng')).toBeInTheDocument();
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

  it('hạn đóng trước ngày mở kỳ hoặc sau hạn công ty nộp xã thì báo lỗi', async () => {
    const onPreview = renderForm();
    await pickOption(screen.getByRole('combobox', { name: 'Kỳ thu' }), 'Tháng 10/2026 (BG-65-2026)');

    pickDate(screen.getByLabelText('Hạn hộ đóng'), '30/09/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(await screen.findByText('Hạn đóng không được trước ngày mở kỳ')).toBeInTheDocument();

    pickDate(screen.getByLabelText('Hạn hộ đóng'), '05/11/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));
    expect(await screen.findByText('Hạn đóng không được sau hạn công ty nộp xã')).toBeInTheDocument();
    expect(onPreview).not.toHaveBeenCalled();
  });

  it('toàn xã kỳ 10/2026 gửi đúng yêu cầu xem trước', async () => {
    const onPreview = renderForm();
    await pickOption(screen.getByRole('combobox', { name: 'Kỳ thu' }), 'Tháng 10/2026 (BG-65-2026)');
    pickDate(screen.getByLabelText('Hạn hộ đóng'), '25/10/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Xem trước' }));

    await waitFor(() =>
      expect(onPreview).toHaveBeenCalledWith({
        periodId: 5, feeTypeId: 1, scopeType: 'ALL', areaIds: undefined, companyId: undefined, dueDate: '2026-10-25',
        unitPrice: undefined, note: undefined,
      }),
    );
  });

  it('phí giá cố định hiện ô đơn giá', async () => {
    renderForm();
    await pickOption(screen.getByRole('combobox', { name: 'Loại phí' }), 'Phụ phí dịch vụ phát sinh');
    expect(await screen.findByLabelText('Đơn giá')).toBeInTheDocument();
    expect(screen.getByText(/giá mặc định 50\.000/)).toBeInTheDocument();
  });
});
