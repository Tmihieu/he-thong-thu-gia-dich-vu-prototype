import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { TariffVersion } from '../api';
import { OpenPeriodForm } from './OpenPeriodForm';

const tariffs: TariffVersion[] = [
  {
    id: 1, code: 'BG-65-2026', legalBasis: 'QĐ 65/2026/QĐ-UBND', issuedDate: null, validFrom: '2026-09-01',
    validTo: '2027-06-30', status: 'ACTIVE', scopeNote: null, note: null, rates: [],
  },
  {
    id: 2, code: 'BG-67-2025', legalBasis: 'QĐ 67/2025/QĐ-UBND', issuedDate: null, validFrom: '2025-06-01',
    validTo: '2026-08-31', status: 'EXPIRED', scopeNote: null, note: null, rates: [],
  },
];

async function pickOption(label: string, option: string) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  // Mỗi lựa chọn của AntD Select có thuộc tính title bằng nhãn.
  fireEvent.click(await screen.findByTitle(option));
}

async function typeDate(label: string, value: string) {
  const input = screen.getByLabelText(label);
  await userEvent.click(input);
  await userEvent.type(input, value);
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

function setYear(year: number) {
  const input = screen.getByLabelText('Năm');
  fireEvent.change(input, { target: { value: String(year) } });
}

describe('OpenPeriodForm', () => {
  it('thiếu tháng và hạn nộp thì báo lỗi, không gửi', async () => {
    const onSubmit = vi.fn();
    render(<OpenPeriodForm tariffs={tariffs} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Mở kỳ' }));

    expect(await screen.findByText('Vui lòng chọn tháng')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn hạn nộp')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('chọn tháng 10/2026 thì hiện biểu giá QĐ 65/2026 và gửi đúng dữ liệu', async () => {
    const onSubmit = vi.fn();
    render(<OpenPeriodForm tariffs={tariffs} onSubmit={onSubmit} />);

    setYear(2026);
    await pickOption('Tháng', 'Tháng 10');
    expect(await screen.findByText('BG-65-2026 · QĐ 65/2026/QĐ-UBND')).toBeInTheDocument();
    await typeDate('Hạn công ty nộp xã', '31/10/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Mở kỳ' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        type: 'MONTH', year: 2026, number: 10, openDate: undefined, dueDate: '2026-10-31', note: undefined,
      }),
    );
  });

  it('kỳ 08/2026 tự hiện biểu giá cũ QĐ 67/2025', async () => {
    render(<OpenPeriodForm tariffs={tariffs} onSubmit={vi.fn()} />);
    setYear(2026);
    await pickOption('Tháng', 'Tháng 8');
    expect(await screen.findByText('BG-67-2025 · QĐ 67/2025/QĐ-UBND')).toBeInTheDocument();
  });

  it('hạn nộp trước ngày mở thì báo lỗi', async () => {
    const onSubmit = vi.fn();
    render(<OpenPeriodForm tariffs={tariffs} onSubmit={onSubmit} />);

    setYear(2026);
    await pickOption('Tháng', 'Tháng 10');
    await typeDate('Ngày mở', '05/10/2026');
    await typeDate('Hạn công ty nộp xã', '04/10/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Mở kỳ' }));

    expect(await screen.findByText('Hạn nộp không được trước ngày mở kỳ')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hiện thông báo lỗi tiếng Việt từ máy chủ', () => {
    render(<OpenPeriodForm tariffs={tariffs} onSubmit={vi.fn()} error="Kỳ 2026-10 đã được mở trước đó." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Kỳ 2026-10 đã được mở trước đó.');
  });
});
