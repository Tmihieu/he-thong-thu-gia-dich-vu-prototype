import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { pickDate, pickOption } from '../../../test/antd';
import type { Area, Subject } from '../api';
import { SubjectProfileForm } from './SubjectProfileForm';

const areas: Area[] = [
  { id: 24, code: 'KV24', name: 'Tổ dân phố 24', districtId: 3, districtCode: 'NB', status: 'ACTIVE', subjectCount: 9 },
];
const existing: Subject = {
  id: 128, code: 'DTH-H000128', subjectType: 'HOUSEHOLD', name: 'Nguyễn Văn Mẫu', address: 'Số 12 đường Mẫu', houseNo: 'Số 12', street: 'đường Mẫu',
  areaId: 24, areaCode: 'KV24', districtCode: 'NB', phone: '0902000128', status: 'ACTIVE', memberCount: 4,
  representativeName: null, taxCode: null, note: null,
  currentContract: {
    id: 62, contractNo: 'ĐK-DTH-0062', tariffGroup: 'HH_3_PLUS', validFrom: '2026-01-01', validTo: null,
    exempt: true, exemptReason: 'Hộ nghèo', exemptDecisionNo: null, note: null, quotaKg: null,
  },
  contracts: [],
};

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('SubjectProfileForm', () => {
  it('tạo mới: thiếu trường bắt buộc và SĐT sai thì báo lỗi, không gửi', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);

    type('Số điện thoại', '09ab');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    expect(await screen.findByText('Vui lòng nhập tên')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn tổ/ấp/thôn')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập đường / hẻm')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số thành viên')).toBeInTheDocument();
    expect(screen.getByText('Số điện thoại chỉ gồm 9–15 chữ số')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn nhóm giá')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn ngày bắt đầu')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ngày hết hiệu lực trước ngày bắt đầu thì báo lỗi', async () => {
    render(<SubjectProfileForm areas={areas} onSubmit={vi.fn()} />);
    pickDate(screen.getByLabelText('Hiệu lực từ'), '01/10/2026');
    pickDate(screen.getByLabelText('Hiệu lực đến'), '30/09/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(await screen.findByText('Ngày hết hiệu lực không được trước ngày bắt đầu')).toBeInTheDocument();
  });

  it('tạo hộ ở KV24 kèm hợp đồng: gửi đủ hai khối', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);

    type('Tên chủ hộ', 'Lê Thị Mẫu');
    type('Số nhà', 'Số 5');
    type('Đường / hẻm', 'đường Mẫu');
    type('Số điện thoại', '0902999555');
    await userEvent.type(screen.getByLabelText('Số thành viên'), '3');
    await pickOption(screen.getByRole('combobox', { name: 'Tổ/Ấp/Thôn' }), 'KV24 · Tổ dân phố 24');
    await pickOption(screen.getByRole('combobox', { name: 'Nhóm giá' }), 'HGĐ ≥ 3 người');
    pickDate(screen.getByLabelText('Hiệu lực từ'), '01/10/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      subject: {
        type: 'HOUSEHOLD', name: 'Lê Thị Mẫu', houseNo: 'Số 5', street: 'đường Mẫu', areaId: 24, phone: '0902999555',
        memberCount: 3, representativeName: undefined, taxCode: undefined, note: undefined,
      },
      contract: {
        tariffGroup: 'HH_3_PLUS', validFrom: '2026-10-01', validTo: undefined, exempt: false,
        exemptReason: undefined, exemptDecisionNo: undefined,
      },
      contractId: null,
    });
  });

  it('bỏ chọn đăng ký dịch vụ thì không gửi hợp đồng', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);
    type('Tên chủ hộ', 'Lê Thị Mẫu');
    type('Đường / hẻm', 'Hẻm 3 ấp Mẫu');
    await userEvent.type(screen.getByLabelText('Số thành viên'), '2');
    await pickOption(screen.getByRole('combobox', { name: 'Tổ/Ấp/Thôn' }), 'KV24 · Tổ dân phố 24');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Đưa hộ này vào danh sách thu phí' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].contract).toBeNull();
  });

  it('đổi số thành viên thì nhóm giá tự đổi theo; chọn tay nhóm không khớp thì báo lỗi, không gửi', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm subject={existing} areas={areas} onSubmit={onSubmit} />);
    await userEvent.clear(screen.getByLabelText('Số thành viên'));
    await userEvent.type(screen.getByLabelText('Số thành viên'), '2');
    await waitFor(() => expect(screen.getByTitle('HGĐ ≤ 2 người')).toBeInTheDocument());

    await pickOption(screen.getByRole('combobox', { name: 'Nhóm giá' }), 'HGĐ ≥ 3 người');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(await screen.findByText('Hộ có 2 thành viên phải chọn nhóm "HGĐ ≤ 2 người"')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('đổi số thành viên rồi lưu: gửi nhóm giá đã tự đổi', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm subject={existing} areas={areas} onSubmit={onSubmit} />);
    await userEvent.clear(screen.getByLabelText('Số thành viên'));
    await userEvent.type(screen.getByLabelText('Số thành viên'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].contract).toMatchObject({ tariffGroup: 'HH_UP_TO_2' });
  });

  it('nhóm nguồn thải lớn có ô định mức kg và gửi quotaKg; nhóm khác không gửi', async () => {
    const onSubmit = vi.fn();
    const enterprise: Subject = {
      ...existing, subjectType: 'ENTERPRISE', memberCount: null, representativeName: 'Giám Đốc Mẫu',
      currentContract: { ...existing.currentContract!, tariffGroup: 'BY_VOLUME', exempt: false, exemptReason: null, quotaKg: 600 },
    };
    render(<SubjectProfileForm subject={enterprise} areas={areas} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Định mức kg/tháng')).toHaveValue('600');
    fireEvent.change(screen.getByLabelText('Định mức kg/tháng'), { target: { value: '750' } });
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].contract).toMatchObject({ tariffGroup: 'BY_VOLUME', quotaKg: 750 });

    // Hộ gia đình không có ô định mức.
    onSubmit.mockClear();
    render(<SubjectProfileForm subject={existing} areas={areas} onSubmit={onSubmit} />);
    expect(screen.getAllByLabelText('Định mức kg/tháng')).toHaveLength(1);
  });

  it('sửa hồ sơ có hợp đồng miễn: hiển thị miễn, giữ nguyên cờ miễn khi lưu', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm subject={existing} areas={areas} onSubmit={onSubmit} />);

    expect(screen.getByText('DTH-H000128')).toBeInTheDocument();
    expect(screen.getByText('Miễn 100% · Hộ nghèo')).toBeInTheDocument();
    type('Tên chủ hộ', 'Nguyễn Văn Mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const submitted = onSubmit.mock.calls[0]![0];
    expect(submitted.subject.name).toBe('Nguyễn Văn Mới');
    expect(submitted.contractId).toBe(62);
    expect(submitted.contract).toMatchObject({ tariffGroup: 'HH_3_PLUS', validFrom: '2026-01-01', exempt: true, exemptReason: 'Hộ nghèo' });
  });
});
