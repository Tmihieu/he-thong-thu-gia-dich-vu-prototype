import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';

import { TOKEN_KEY } from '../../app/auth/authContext';
import { jsonResponse, mockApi, renderApp } from '../../test/renderApp';

const officer = { id: 2, username: 'canbo_xa', fullName: 'Nguyễn Thị Mẫu', role: 'COMMUNE_OFFICER', companyId: null };
const manager = { id: 11, username: 'dv01', fullName: 'Trần Văn Mẫu', role: 'COMPANY_MANAGER', companyId: 1 };

const base = {
  id: 40, code: 'KN-1026-001', receivedDate: '2026-10-14', complainantName: 'Nguyễn Văn Mẫu', complainantPhone: '0900000128',
  subjectId: 128, subjectCode: 'DTH-H000128', subjectName: 'Hộ Nguyễn Văn Mẫu', areaId: 7, areaCode: 'KV07',
  areaName: 'Tổ dân phố 07', channel: 'PHONE', category: 'LATE_COLLECTION', summary: 'Tổ 7 chưa được thu gom 2 ngày',
  content: 'Rác để trước nhà 2 ngày.', status: 'NEW', forwardedCompanyId: null, forwardedCompanyCode: null,
  forwardedCompanyName: null, deadline: null, overdue: false, resolution: null, resolvedAt: null,
};
const forwarded = { ...base, status: 'PROCESSING', forwardedCompanyId: 1, forwardedCompanyCode: 'DV01',
  forwardedCompanyName: 'Công ty MTĐT Đông Thạnh', deadline: '2026-10-17' };
const ev = (id: number, eventType: string, actorLabel: string, content: string) =>
  ({ id, eventType, occurredAt: '2026-10-14T02:40:00Z', actorLabel, content });
const received = ev(1, 'RECEIVED', 'Cán bộ xã', 'Xã tiếp nhận qua điện thoại');
const forwardEv = ev(2, 'FORWARDED', 'Cán bộ xã', 'Chuyển Công ty MTĐT Đông Thạnh xử lý, hạn 17/10/2026');
const replyEv = ev(3, 'COMPANY_REPLIED', 'Công ty MTĐT Đông Thạnh', 'Đã bổ sung chuyến thu gom');

type Detail = { complaint: Record<string, unknown>; events: unknown[] };

afterEach(() => vi.unstubAllGlobals());

function posts(fetchFn: ReturnType<typeof mockApi>, path: string) {
  return fetchFn.mock.calls
    .filter(([url, init]) => String(url) === path && (init as RequestInit | undefined)?.method === 'POST')
    .map(([, init]) => JSON.parse(String((init as RequestInit).body)) as Record<string, unknown>);
}

describe('Khiếu nại: màn xã', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-canbo');
  });

  it('lọc quá hạn; mở chi tiết thấy timeline; chuyển công ty mặc định theo khu vực rồi đóng', async () => {
    let detail: Detail = { complaint: base, events: [received] };
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, officer),
      'GET /api/complaints': () =>
        jsonResponse(200, [detail.complaint, { ...forwarded, id: 41, code: 'KN-1026-002', summary: 'Quá hạn', overdue: true }]),
      'GET /api/complaints/40': () => jsonResponse(200, detail),
      'GET /api/masterdata/companies': () => jsonResponse(200, []),
      'GET /api/masterdata/area-assignments': () =>
        jsonResponse(200, [{ id: 1, areaId: 7, areaCode: 'KV07', areaName: 'Tổ 07', companyId: 1, companyCode: 'DV01',
          companyName: 'Công ty MTĐT Đông Thạnh', validFrom: '2026-09-01', validTo: null, note: null, decisionNo: null }]),
      'POST /api/complaints/40/forward': () => {
        detail = { complaint: forwarded, events: [received, forwardEv] };
        return jsonResponse(200, detail);
      },
      'POST /api/complaints/40/close': () => {
        detail = { complaint: { ...forwarded, status: 'RESOLVED', resolution: 'Đã xong' },
          events: [received, forwardEv, ev(4, 'CLOSED', 'Cán bộ xã', 'Đã xong')] };
        return jsonResponse(200, detail);
      },
    });
    renderApp('/commune/complaints');

    await userEvent.click(await screen.findByText('Quá hạn (1)'));
    expect(screen.queryByText('Tổ 7 chưa được thu gom 2 ngày')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Tất cả (2)'));

    await userEvent.click(await screen.findByText('Tổ 7 chưa được thu gom 2 ngày'));
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Xã tiếp nhận qua điện thoại')).toBeInTheDocument();
    expect(await within(drawer).findByText('DV01 · phụ trách KV07 (mặc định)')).toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole('button', { name: 'Chuyển công ty' }));
    await waitFor(() => expect(posts(fetchFn, '/api/complaints/40/forward')).toEqual([{}]));
    expect(await within(drawer).findByText('Chuyển Công ty MTĐT Đông Thạnh xử lý, hạn 17/10/2026')).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Chuyển công ty' })).not.toBeInTheDocument();

    await userEvent.click(within(drawer).getByRole('button', { name: 'Đóng khiếu nại' }));
    expect(await within(drawer).findByText('Vui lòng ghi kết quả giải quyết')).toBeInTheDocument();
    await userEvent.type(within(drawer).getByLabelText('Kết quả giải quyết'), 'Đã xong');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Đóng khiếu nại' }));
    await waitFor(() => expect(posts(fetchFn, '/api/complaints/40/close')).toEqual([{ resolution: 'Đã xong' }]));
    expect(await within(drawer).findByText('Đã giải quyết', { selector: '.ant-timeline-item-content strong' })).toBeInTheDocument();
  });
});

describe('Khiếu nại: màn công ty', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(TOKEN_KEY, 'tok-dv01');
  });

  it('mở từ ?id= (liên kết thông báo), hiện quá hạn; gửi phản hồi về xã', async () => {
    let detail: Detail = { complaint: { ...forwarded, overdue: true }, events: [received, forwardEv] };
    const fetchFn = mockApi({
      'GET /api/platform/auth/me': () => jsonResponse(200, manager),
      'GET /api/complaints': () => jsonResponse(200, [detail.complaint]),
      'GET /api/complaints/40': () => jsonResponse(200, detail),
      'POST /api/complaints/40/reply': () => {
        detail = { ...detail, events: [received, forwardEv, replyEv] };
        return jsonResponse(200, detail);
      },
    });
    renderApp('/company/complaints?id=40');

    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Quá hạn xử lý')).toBeInTheDocument();
    await userEvent.type(within(drawer).getByLabelText('Kết quả xử lý của công ty'), 'Đã bổ sung chuyến thu gom');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Gửi phản hồi' }));

    await waitFor(() => expect(posts(fetchFn, '/api/complaints/40/reply')).toEqual([{ content: 'Đã bổ sung chuyến thu gom' }]));
    expect(await within(drawer).findByText('Công ty phản hồi')).toBeInTheDocument();
  });
});
