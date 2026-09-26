import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import dayjs from 'dayjs';
import { vi } from 'vitest';

import { pickOption } from '../../test/antd';
import { CreateComplaintForm, TextActionForm } from './ComplaintForms';

const areas = [
  { id: 7, code: 'KV07', name: 'Tổ dân phố 07' },
  { id: 9, code: 'KV09', name: 'Tổ dân phố 09' },
];
const subjects = [
  { id: 128, code: 'DTH-H000128', name: 'Hộ Nguyễn Văn Mẫu', areaId: 7 },
  { id: 130, code: 'DTH-H000130', name: 'Hộ Lê Thị Mẫu', areaId: 9 },
];

function setupCreate() {
  const onSubmit = vi.fn();
  render(
    <AntApp>
      <CreateComplaintForm open areas={areas} subjects={subjects} onSubmit={onSubmit} onCancel={() => {}} />
    </AntApp>,
  );
  return onSubmit;
}

describe('CreateComplaintForm', () => {
  it('bắt buộc người khiếu nại, khu vực, loại, tóm tắt, nội dung; kiểm tra số điện thoại', async () => {
    const onSubmit = setupCreate();
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '12345');
    await userEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));

    expect(await screen.findByText('Vui lòng nhập tên người khiếu nại')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn khu vực')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn loại khiếu nại')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập tóm tắt')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập nội dung')).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại gồm 10 chữ số, bắt đầu bằng 0')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('chọn hộ thì tự điền khu vực; gửi đủ trường, kênh mặc định điện thoại, ngày hôm nay', async () => {
    const onSubmit = setupCreate();
    await userEvent.type(screen.getByLabelText('Người khiếu nại'), 'Nguyễn Văn Mẫu');
    await userEvent.type(screen.getByLabelText('Số điện thoại'), '0900000128');
    await pickOption(screen.getByLabelText('Hộ / đối tượng liên quan'), 'DTH-H000128 · Hộ Nguyễn Văn Mẫu');
    await pickOption(screen.getByLabelText('Loại'), 'Thu gom chậm hoặc không đúng lịch');
    await userEvent.type(screen.getByLabelText('Tóm tắt'), 'Tổ 7 chưa được thu gom 2 ngày');
    await userEvent.type(screen.getByLabelText('Nội dung'), 'Rác để trước nhà.');
    await userEvent.click(screen.getByRole('button', { name: 'Ghi nhận' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        complainantName: 'Nguyễn Văn Mẫu', complainantPhone: '0900000128', areaId: 7, subjectId: 128, channel: 'PHONE',
        category: 'LATE_COLLECTION', summary: 'Tổ 7 chưa được thu gom 2 ngày', content: 'Rác để trước nhà.',
        receivedDate: dayjs().format('YYYY-MM-DD'),
      }),
    );
  });
});

describe('TextActionForm (phản hồi / đóng)', () => {
  it('nội dung bắt buộc, không nhận toàn khoảng trắng; gửi đã cắt khoảng trắng', async () => {
    const onSubmit = vi.fn();
    render(
      <AntApp>
        <TextActionForm label="Kết quả xử lý của công ty" okText="Gửi phản hồi" requiredMessage="Vui lòng nhập nội dung phản hồi"
          maxLength={2000} onSubmit={onSubmit} />
      </AntApp>,
    );
    const box = screen.getByLabelText('Kết quả xử lý của công ty');
    await userEvent.type(box, '   ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    expect(await screen.findByText('Vui lòng nhập nội dung phản hồi')).toBeInTheDocument();

    await userEvent.type(box, 'Đã bổ sung chuyến  ');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Đã bổ sung chuyến'));
  });
});
