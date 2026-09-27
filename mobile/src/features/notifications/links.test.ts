import { notificationHref } from './links';

describe('notificationHref', () => {
  it('phản ánh → chi tiết phản ánh theo complaintId', () => {
    expect(notificationHref({ screen: 'citizen.complaintDetail', params: { complaintId: 42 } })).toEqual({
      pathname: '/complaints/[id]',
      params: { id: '42' },
    });
  });

  it('thanh toán → xác nhận thanh toán theo paymentId', () => {
    expect(notificationHref({ screen: 'citizen.paymentConfirmation', params: { paymentId: 9 } })).toEqual({
      pathname: '/confirmations/[id]',
      params: { id: '9' },
    });
  });

  it('rác cồng kềnh → chi tiết yêu cầu theo requestId', () => {
    expect(notificationHref({ screen: 'citizen.bulkyDetail', params: { requestId: 6 } })).toEqual({
      pathname: '/bulky/[id]',
      params: { id: '6' },
    });
    expect(notificationHref({ screen: 'citizen.bulkyDetail', params: {} })).toBe('/bulky');
  });

  it('thiếu hoặc sai id thì về danh sách', () => {
    expect(notificationHref({ screen: 'citizen.complaintDetail', params: { complaintId: 0 } })).toBe('/complaints');
    expect(notificationHref({ screen: 'citizen.paymentConfirmation', params: null })).toBe('/confirmations');
  });

  it('màn của vai trò khác hoặc không có liên kết → null', () => {
    expect(notificationHref({ screen: 'commune.complaints', params: { complaintId: 1 } })).toBeNull();
    expect(notificationHref(null)).toBeNull();
    expect(notificationHref(undefined)).toBeNull();
  });
});
