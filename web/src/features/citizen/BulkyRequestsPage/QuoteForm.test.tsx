import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../../test/renderApp';
import type { BulkyRequest } from '../api';
import { QuoteForm, RejectForm } from './QuoteForm';

const future = dayjs().add(10, 'day').format('YYYY-MM-DD');
const request: BulkyRequest = {
  id: 6, code: 'CK-1026-006', subjectId: 128, subjectCode: 'DTH-H000128', subjectName: 'Hộ Nguyễn Văn Mẫu',
  citizenName: 'Nguyễn Văn Mẫu', citizenPhone: '0902000128', areaCode: 'KV07', itemType: 'MATTRESS',
  itemDescription: 'Nệm cũ 1m6', quantity: 2, address: '12/5 đường Số 1', preferredDate: future, preferredSlot: 'MORNING',
  photoUrls: [], companyId: 1, companyName: 'Công ty Một', quotedFee: null, quotedAt: null, scheduledDate: null,
  status: 'PENDING', collectedAt: null, cancelReason: null, createdAt: '2026-10-01T02:00:00Z',
};

function setup(ui: 'quote' | 'reject') {
  const onSubmit = vi.fn();
  const props = { request, onSubmit, onCancel: () => {} };
  render(<AntApp>{ui === 'quote' ? <QuoteForm {...props} /> : <RejectForm {...props} />}</AntApp>);
  return onSubmit;
}

describe('QuoteForm', () => {
  it('phí bắt buộc và > 0; ngày hẹn mặc định là ngày hộ mong muốn', async () => {
    const onSubmit = setup('quote');
    const fee = screen.getByLabelText('Phí thu gom');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo phí' }));
    expect(await screen.findByText('Vui lòng nhập phí thu gom')).toBeInTheDocument();

    await userEvent.type(fee, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo phí' }));
    expect(await screen.findByText('Phí phải lớn hơn 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.clear(fee);
    await userEvent.type(fee, '200000');
    expect(fee).toHaveValue('200.000');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo phí' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ id: 6, fee: 200_000, scheduledDate: future }));
  });
});

describe('RejectForm', () => {
  it('lý do bắt buộc, không nhận toàn khoảng trắng', async () => {
    const onSubmit = setup('reject');
    await userEvent.type(screen.getByLabelText('Lý do'), '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Từ chối yêu cầu' }));
    expect(await screen.findByText('Vui lòng ghi lý do từ chối')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Lý do'), 'Xe không vào được hẻm');
    await userEvent.click(screen.getByRole('button', { name: 'Từ chối yêu cầu' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ id: 6, reason: 'Xe không vào được hẻm' }));
  });
});

describe('Rác cồng kềnh: màn công ty', () => {
  const manager = { id: 11, username: 'dv01', fullName: 'Trần Văn Mẫu', role: 'COMPANY_MANAGER', companyId: 1 };

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-dv01');
  });
  afterEach(() => vi.unstubAllGlobals());

  it('báo phí yêu cầu chờ xác nhận, danh sách chuyển sang "Đã báo phí"', async () => {
    let current: BulkyRequest = request;
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/bulky-requests': () => jsonResponse(200, [current]),
      'POST /api/bulky-requests/6/quote': () => {
        current = { ...request, status: 'QUOTED', quotedFee: 200_000, quotedAt: '2026-10-01T03:00:00Z', scheduledDate: future };
        return jsonResponse(200, current);
      },
    });
    renderApp('/company/bulky');

    expect(await screen.findByText('Chờ xác nhận (1)')).toBeInTheDocument();
    expect(screen.getByText('2 × Nệm, chăn ga khối lớn')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Báo phí' }));
    await userEvent.type(await screen.findByLabelText('Phí thu gom'), '200000');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo phí' }));

    await waitFor(() =>
      expect(fetchFn.mock.calls.some(([url, init]) => String(url) === '/api/bulky-requests/6/quote'
        && JSON.parse(String((init as RequestInit).body)).fee === 200_000)).toBe(true),
    );
    expect(await screen.findByText('Đã báo phí (1)')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Đã báo phí (1)'));
    expect(await screen.findByRole('button', { name: 'Đã thu gom' })).toBeInTheDocument();
  });

  it('mở từ thông báo (?id=) thì dòng đó hiện ở trang đầu dù nằm sau 20 dòng', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ ...request, id: 100 + i, code: `CK-1026-${100 + i}` }));
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/bulky-requests': () => jsonResponse(200, many),
    });
    renderApp('/company/bulky?id=124');
    expect(await screen.findByText('CK-1026-124')).toBeInTheDocument();
  });

  it('báo phí lỗi vì hộ vừa hủy thì tải lại danh sách, bỏ nút thao tác cũ', async () => {
    let current: BulkyRequest = request;
    mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/bulky-requests': () => jsonResponse(200, [current]),
      'POST /api/bulky-requests/6/quote': () => {
        current = { ...request, status: 'CANCELLED', cancelReason: 'Đã tự xử lý' };
        return jsonResponse(422, { code: 'BULKY_STATUS_INVALID',
          message: 'Yêu cầu CK-1026-006 đang ở trạng thái "Đã hủy", không báo phí được.' });
      },
    });
    renderApp('/company/bulky');
    await userEvent.click(await screen.findByRole('button', { name: 'Báo phí' }));
    await userEvent.type(await screen.findByLabelText('Phí thu gom'), '200000');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi báo phí' }));

    expect(await screen.findByText(/đang ở trạng thái "Đã hủy"/)).toBeInTheDocument();
    expect(await screen.findByText('Chờ xác nhận (0)')).toBeInTheDocument();
  });
});
