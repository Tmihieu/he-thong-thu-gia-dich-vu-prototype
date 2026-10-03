import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { Company } from '../api';
import { CompanyFormModal } from './CompanyFormModal';

const company: Company = {
  id: 1, code: 'DV01', name: 'Công ty MTĐT Đông Thạnh', contactName: 'Trần Hoàng Phúc', contactPhone: '0900000001',
  status: 'ACTIVE', validFrom: '2026-01-01', validTo: null, orgType: null, taxCode: null, address: null, email: null,
  communeContractNo: null, bankAccount: null, bankName: null, retainedPercent: null,
};

describe('Form công ty: tỷ lệ công ty giữ lại', () => {
  it('để trống thì không gửi; nhập thì gửi đúng số', async () => {
    const onSubmit = vi.fn();
    render(<CompanyFormModal company={company} open onSubmit={onSubmit} onCancel={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]![0].retainedPercent).toBeUndefined();

    fireEvent.change(screen.getByLabelText('Tỷ lệ công ty giữ lại'), { target: { value: '12.5' } });
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]![0].retainedPercent).toBe(12.5);
  });

  it('hiện sẵn tỷ lệ đã cấu hình khi sửa', () => {
    render(<CompanyFormModal company={{ ...company, retainedPercent: 8 }} open onSubmit={vi.fn()} onCancel={() => {}} />);
    expect(screen.getByLabelText('Tỷ lệ công ty giữ lại')).toHaveValue('8.00');
  });
});
