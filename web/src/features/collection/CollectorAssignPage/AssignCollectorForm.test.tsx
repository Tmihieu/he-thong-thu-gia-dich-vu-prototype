import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import { pickOption } from '../../../test/antd';
import { AssignCollectorForm } from './AssignCollectorForm';

const areas = [
  { id: 7, code: 'KV07', name: 'Tổ dân phố 07' },
  { id: 9, code: 'KV09', name: 'Tổ dân phố 09' },
];
const collectors = [
  { id: 21, username: 'thu07', fullName: 'Nguyễn Thành Mẫu', phone: null, active: true },
  { id: 22, username: 'thu09', fullName: 'Lê Văn Mẫu', phone: null, active: true },
  { id: 23, username: 'thu99', fullName: 'Người Đã Nghỉ', phone: null, active: false },
];

function setup(initialAreaIds: number[] = []) {
  const onSubmit = vi.fn();
  render(
    <AntApp>
      <AssignCollectorForm open areas={areas} collectors={collectors} initialAreaIds={initialAreaIds} onSubmit={onSubmit}
        onCancel={() => {}} />
    </AntApp>,
  );
  return onSubmit;
}

describe('AssignCollectorForm', () => {
  it('bắt buộc chọn tổ và người đi thu', async () => {
    const onSubmit = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Phân tổ' }));

    expect(await screen.findByText('Vui lòng chọn ít nhất một tổ')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn người đi thu')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('gửi tổ đã chọn sẵn, người đi thu và ngày mặc định hôm nay; không liệt kê người đã nghỉ', async () => {
    const onSubmit = setup([7, 9]);
    const collector = screen.getByLabelText('Người đi thu');
    await pickOption(collector, 'Lê Văn Mẫu · thu09');
    expect(screen.queryByTitle('Người Đã Nghỉ · thu99')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Phân tổ' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ collectorId: 22, areaIds: [7, 9], fromDate: dayjs().format('YYYY-MM-DD'),
        note: undefined }),
    );
  });
});
