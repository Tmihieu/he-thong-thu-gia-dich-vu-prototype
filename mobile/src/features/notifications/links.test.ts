import { notificationHref, notificationTarget } from './links';

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

  it('chợ đồ cũ → chi tiết bài theo postId; rác cồng kềnh đã bỏ nên không còn màn', () => {
    expect(notificationHref({ screen: 'citizen.bulkyDetail', params: { requestId: 6 } })).toBeNull();
    expect(notificationHref({ screen: 'citizen.marketDetail', params: { postId: 7 } })).toEqual({
      pathname: '/market/[id]',
      params: { id: '7' },
    });
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

describe('notificationTarget', () => {
  it('nhắc nộp: link mới citizen.charges và thông báo cũ link=null đều mở danh sách khoản phí', () => {
    expect(notificationTarget({ kind: 'REMINDER', link: { screen: 'citizen.charges' } })).toBe('/charges');
    expect(notificationTarget({ kind: 'REMINDER', link: { screen: 'citizen.charges', params: {} } })).toBe('/charges');
    expect(notificationTarget({ kind: 'REMINDER', link: null })).toBe('/charges');
    expect(notificationTarget({ kind: 'REMINDER', link: undefined })).toBe('/charges');
  });

  it('có link thì theo link, loại khác không link → null', () => {
    expect(notificationTarget({ kind: 'INFO', link: { screen: 'citizen.marketDetail', params: { postId: 7 } } })).toEqual({
      pathname: '/market/[id]',
      params: { id: '7' },
    });
    expect(notificationTarget({ kind: 'INFO', link: null })).toBeNull();
  });
});
