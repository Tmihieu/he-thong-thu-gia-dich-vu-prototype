import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { AppProviders } from '../../../app/AppProviders';
import { createQueryClient } from '../../../app/queryClient';
import { jsonResponse, mockApi } from '../../../test/renderApp';
import type { CollectorCharge } from '../api';
import { ReportSubjectForm } from './ReportSubjectForm';

const item = {
  charge: { id: 5, subjectId: 42, subjectCode: 'DTH-H000121', subjectName: 'Hộ Nguyễn Văn An', subjectAddress: '1 Đường Mẫu' },
  paidAmount: 0,
  remainingAmount: 80_000,
  lastPaidAt: null,
  lastVisit: null,
} as unknown as CollectorCharge;

type Handler = Parameters<typeof mockApi>[0][string];

function setup(handler: Handler = () => new Response(null, { status: 204 })) {
  const fetchFn = mockApi({ 'POST /api/collection/subject-reports': handler });
  const onClose = vi.fn();
  render(
    <AppProviders queryClient={createQueryClient()}>
      <ReportSubjectForm item={item} onClose={onClose} />
    </AppProviders>,
  );
  const sent = () =>
    fetchFn.mock.calls
      .filter(([url]) => String(url) === '/api/collection/subject-reports')
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);
  return { onClose, sent };
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('ReportSubjectForm', () => {
  it('bắt buộc chọn loại và mô tả; mô tả chỉ có khoảng trắng không được gửi', async () => {
    const { sent } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(await screen.findByText('Vui lòng chọn lý do')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng ghi rõ thông tin sai')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Sai thông tin hộ (tên, địa chỉ, SĐT)'));
    await userEvent.type(screen.getByLabelText('Ghi chú'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));
    expect(await screen.findByText('Vui lòng ghi rõ thông tin sai')).toBeInTheDocument();
    expect(sent()).toHaveLength(0);
  });

  it('gửi đúng hộ, loại và mô tả đã bỏ khoảng trắng thừa; gửi xong thì đóng', async () => {
    const { sent, onClose } = setup();
    await userEvent.click(screen.getByText('Hộ đã chuyển đi'));
    await userEvent.type(screen.getByLabelText('Ghi chú'), '  Cả nhà chuyển về quê từ tháng 9  ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(sent()).toEqual([{ chargeId: 5, reportType: 'MOVED_AWAY', description: 'Cả nhà chuyển về quê từ tháng 9' }]);
    expect(await screen.findByText('Đã gửi báo cáo về công ty và xã · Hộ Nguyễn Văn An')).toBeInTheDocument();
  });

  it('máy chủ từ chối thì hiện lỗi tiếng Việt và giữ form mở', async () => {
    const { onClose } = setup(() =>
      jsonResponse(404, { code: 'CHARGE_NOT_FOUND', message: 'Không tìm thấy khoản thu trong tổ được giao.' }),
    );
    await userEvent.click(screen.getByText('Sai thông tin hộ (tên, địa chỉ, SĐT)'));
    await userEvent.type(screen.getByLabelText('Ghi chú'), 'Sai số nhà');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo cáo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tìm thấy khoản thu trong tổ được giao.');
    expect(onClose).not.toHaveBeenCalled();
  });
});
