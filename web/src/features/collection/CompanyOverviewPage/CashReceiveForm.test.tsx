import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import { CashReceiveForm } from './CashReceiveForm';

const collector = { collectorId: 21, collectorUsername: 'thu07', collectorName: 'Nguyễn Thành Mẫu', collectedCash: 240_000,
  handedOver: 80_000, held: 160_000 };
const norm = { normalizer: (s: string) => s.replace(/\s+/g, ' ').trim() };

function setup() {
  const onSubmit = vi.fn();
  render(
    <AntApp>
      <CashReceiveForm collector={collector} onSubmit={onSubmit} onCancel={() => {}} />
    </AntApp>,
  );
  return onSubmit;
}

describe('CashReceiveForm', () => {
  it('mặc định nhận hết số đang giữ, ngày hôm nay', async () => {
    const onSubmit = setup();
    expect(screen.getByLabelText('Số tiền nhận')).toHaveValue('160.000');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đã nhận' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ collectorId: 21, amount: 160_000, handoverDate: dayjs().format('YYYY-MM-DD'),
        note: undefined }),
    );
  });

  it('vượt số đang giữ hoặc xóa trắng (= 0) thì báo lỗi tiếng Việt, không gửi', async () => {
    const onSubmit = setup();
    const amount = screen.getByLabelText('Số tiền nhận');
    await userEvent.clear(amount);
    await userEvent.type(amount, '200000');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đã nhận' }));
    expect(await screen.findByText('Không vượt số đang giữ (160.000 đ)', norm)).toBeInTheDocument();

    await userEvent.clear(amount);
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đã nhận' }));
    expect(await screen.findByText('Số tiền phải lớn hơn 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
