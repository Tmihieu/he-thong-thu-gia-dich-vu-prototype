import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi } from 'vitest';

import { pickDate, pickOption } from '../../../test/antd';
import { ApiError } from '../../../api/client';
import type { Area, DuplicateSubject, Street, StreetSuggestions, Subject } from '../api';
import { checkDuplicates, suggestStreets } from '../api';
import { SubjectProfileForm } from './SubjectProfileForm';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  suggestStreets: vi.fn(),
  checkDuplicates: vi.fn(),
  useStreets: () => ({ data: catalog, isLoading: false }),
}));

const areas: Area[] = [
  { id: 24, code: 'KV24', name: 'Tổ dân phố 24', districtId: 3, districtCode: 'NB', status: 'ACTIVE', subjectCount: 9 },
  { id: 25, code: 'KV25', name: 'Tổ dân phố 25', districtId: 4, districtCode: 'DTH', status: 'ACTIVE', subjectCount: 2 },
];
const existing: Subject = {
  id: 128, code: 'DTH-H000128', subjectType: 'HOUSEHOLD', name: 'Nguyễn Văn Mẫu', address: 'Số 12 đường Mẫu', houseNo: 'Số 12', street: 'đường Mẫu',
  streetId: null, streetPending: false, unitNo: null, locationNote: null,
  areaId: 24, areaCode: 'KV24', districtCode: 'NB', phone: '0902000128', status: 'ACTIVE', memberCount: 4,
  representativeName: null, taxCode: null, note: null,
  currentContract: {
    id: 62, contractNo: 'ĐK-DTH-0062', tariffGroup: 'HH_3_PLUS', validFrom: '2026-01-01', validTo: null,
    exempt: true, exemptReason: 'Hộ nghèo', exemptDecisionNo: null, note: null, quotaKg: null,
  },
  contracts: [],
};
const standardized: Subject = { ...existing, street: 'Đường Nguyễn Huệ', streetId: 9, houseNo: '12/5', address: '12/5 Đường Nguyễn Huệ' };

const street = (over: Partial<Street> & Pick<Street, 'id' | 'name'>): Street => ({
  displayName: over.name, kind: 'STREET', parentId: null, status: 'ACTIVE', areaIds: [24], oldNames: [], ...over,
});
// Danh mục: đường đi qua ấp (KV24/KV25), hẻm thuộc đường, tên cũ theo văn bản đổi tên.
const catalog: Street[] = [
  street({ id: 9, name: 'Đường Nguyễn Huệ' }),
  street({ id: 20, name: 'Nguyễn Thị Mực', areaIds: [24, 25], oldNames: [{ name: 'Đông Thạnh 8', note: 'NQ 380' }] }),
  street({ id: 21, name: 'Hẻm 12', displayName: 'Hẻm 12 Nguyễn Thị Mực', kind: 'ALLEY', parentId: 20, areaIds: [] }),
  street({ id: 22, name: 'Lê Văn Khương', areaIds: [25] }),
];
const hue = { id: 9, displayName: 'Đường Nguyễn Huệ', kind: 'STREET' as const };
const hueDth = { id: 10, displayName: 'Nguyễn Huệ', kind: 'STREET' as const };
const found = (over: Partial<StreetSuggestions> = {}): StreetSuggestions => ({ streets: [hue], external: [], goongStatus: 'OK', ...over });
const twin: DuplicateSubject = { id: 77, code: 'NB-H000077', name: 'Trần Thị Cũ', phone: '0903111222', status: 'ENDED', address: '12/5 Đường Nguyễn Huệ' };

const suggest = vi.mocked(suggestStreets);
const dupCheck = vi.mocked(checkDuplicates);

beforeEach(() => {
  suggest.mockReset().mockResolvedValue(found());
  dupCheck.mockReset().mockResolvedValue([]);
});

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Chuyển sang ô tìm cả xã (đường ấp khác, tên cũ, chờ xác minh). */
async function openSearch() {
  await userEvent.click(screen.getByRole('button', { name: /Tìm cả xã hoặc ghi nhận chờ xác minh/ }));
}

/** Gõ vào ô tìm cả xã; kết quả về sau debounce nên đợi rồi mới chọn. */
async function searchStreet(text: string) {
  if (!screen.queryByRole('combobox', { name: 'Đường / hẻm' })) await openSearch();
  fireEvent.change(screen.getByRole('combobox', { name: 'Đường / hẻm' }), { target: { value: text } });
  await waitFor(() => expect(suggest).toHaveBeenCalled());
}

/** Chọn đường đi qua ấp đã chọn (danh mục), hẻm nếu có. */
async function pickStreet(label: string, alley?: string) {
  await pickOption(screen.getByRole('combobox', { name: 'Đường' }), label);
  if (alley) await pickOption(screen.getByRole('combobox', { name: 'Hẻm' }), alley);
}

async function fillNewHousehold() {
  type('Tên chủ hộ', 'Lê Thị Mẫu');
  await userEvent.type(screen.getByLabelText('Số thành viên'), '3');
  await pickOption(screen.getByRole('combobox', { name: 'Ấp' }), 'KV24 · Tổ dân phố 24');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Đưa hộ này vào danh sách thu phí' }));
}

describe('SubjectProfileForm', () => {
  it('tạo mới: thiếu trường bắt buộc và SĐT sai thì báo lỗi, không gửi', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);

    type('Số điện thoại', '09ab');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    expect(await screen.findByText('Vui lòng nhập tên')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn ấp')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng chọn đường trong danh mục hoặc ghi nhận chờ xác minh')).toBeInTheDocument();
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

  it('tạo hộ ở KV24 kèm hợp đồng: chọn đường từ gợi ý, số nhà riêng, gửi streetId và đủ hai khối', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);

    type('Tên chủ hộ', 'Lê Thị Mẫu');
    type('Số nhà', ' 12/5B ');
    type('Số điện thoại', '0902999555');
    await userEvent.type(screen.getByLabelText('Số thành viên'), '3');
    await pickOption(screen.getByRole('combobox', { name: 'Ấp' }), 'KV24 · Tổ dân phố 24');
    await pickStreet('Đường Nguyễn Huệ');
    await pickOption(screen.getByRole('combobox', { name: 'Nhóm giá' }), 'HGĐ ≥ 3 người');
    pickDate(screen.getByLabelText('Hiệu lực từ'), '01/10/2026');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0]).toEqual({
      subject: {
        type: 'HOUSEHOLD', name: 'Lê Thị Mẫu', houseNo: '12/5B', unitNo: undefined, locationNote: undefined, streetId: 9, areaId: 24,
        phone: '0902999555', memberCount: 3, representativeName: undefined, taxCode: undefined, note: undefined,
      },
      contract: {
        tariffGroup: 'HH_3_PLUS', validFrom: '2026-10-01', validTo: undefined, exempt: false,
        exemptReason: undefined, exemptDecisionNo: undefined,
      },
      contractId: null,
    });
    // Đường chọn từ danh mục theo ấp: không cần gọi tìm kiếm.
    expect(suggest).not.toHaveBeenCalled();
  });

  it('bỏ chọn đăng ký dịch vụ thì không gửi hợp đồng', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);
    await fillNewHousehold();
    await pickStreet('Đường Nguyễn Huệ');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].contract).toBeNull();
  });

  it('tạo mới: đổi số thành viên thì nhóm giá đã chọn tự đổi theo; chọn tay nhóm không khớp thì báo lỗi, không gửi', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Số thành viên'), '4');
    await pickOption(screen.getByRole('combobox', { name: 'Nhóm giá' }), 'HGĐ ≥ 3 người');
    await userEvent.clear(screen.getByLabelText('Số thành viên'));
    await userEvent.type(screen.getByLabelText('Số thành viên'), '2');
    await waitFor(() => expect(document.querySelector('.ant-select-selection-item[title="HGĐ ≤ 2 người"]')).not.toBeNull());

    await pickOption(screen.getByRole('combobox', { name: 'Nhóm giá' }), 'HGĐ ≥ 3 người');
    await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
    expect(await screen.findByText('Hộ có 2 thành viên phải chọn nhóm "HGĐ ≤ 2 người"')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sửa hồ sơ đã có hợp đồng: đổi số thành viên không đổi nhóm giá trên form (máy chủ áp từ kỳ sau)', async () => {
    const onSubmit = vi.fn();
    render(<SubjectProfileForm subject={existing} areas={areas} onSubmit={onSubmit} />);
    expect(screen.getByText('Đổi số người thì nhóm giá mới áp dụng từ kỳ thu sau.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Số thành viên'));
    await userEvent.type(screen.getByLabelText('Số thành viên'), '2');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].subject.memberCount).toBe(2);
    expect(onSubmit.mock.calls[0]![0].contract).toMatchObject({ tariffGroup: 'HH_3_PLUS', validTo: undefined });
  });

  it('nhóm theo ký có ô định mức kg và gửi quotaKg; nhóm khác không gửi', async () => {
    const onSubmit = vi.fn();
    const enterprise: Subject = {
      ...existing, subjectType: 'SMALL_SOURCE', memberCount: null, representativeName: 'Giám Đốc Mẫu',
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

  describe('chọn đường', () => {
    it('hồ sơ cũ chưa chuẩn hóa: báo rõ, vẫn lưu được với tên đường cũ và không hỏi trùng', async () => {
      const onSubmit = vi.fn();
      render(<SubjectProfileForm subject={existing} areas={areas} onSubmit={onSubmit} />);

      expect(screen.getByText(/Địa chỉ cũ chưa chuẩn hóa: "đường Mẫu"/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].subject).toMatchObject({ street: 'đường Mẫu', streetId: undefined, streetPending: false, houseNo: 'Số 12' });
      expect(dupCheck).not.toHaveBeenCalled();
    });

    it('chỉ hiện đường đi qua ấp đã chọn; tên cũ lọc được; chọn hẻm thì gửi id hẻm', async () => {
      const onSubmit = vi.fn();
      render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);
      expect(screen.getByRole('combobox', { name: 'Đường' })).toBeDisabled();
      await fillNewHousehold(); // ấp KV24

      fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Đường' }));
      expect(await screen.findByTitle('Đường Nguyễn Huệ')).toBeInTheDocument();
      expect(screen.getByTitle('Nguyễn Thị Mực (tên cũ: Đông Thạnh 8)')).toBeInTheDocument();
      expect(screen.queryByTitle('Lê Văn Khương')).not.toBeInTheDocument(); // đường của ấp khác
      fireEvent.change(screen.getByRole('combobox', { name: 'Đường' }), { target: { value: 'Đông Thạnh 8' } });
      await waitFor(() => expect(screen.queryByTitle('Đường Nguyễn Huệ')).not.toBeInTheDocument());

      await pickStreet('Nguyễn Thị Mực (tên cũ: Đông Thạnh 8)', 'Hẻm 12');
      await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].subject).toMatchObject({ streetId: 21, street: undefined });
    });

    it('debounce: gõ nhanh chỉ gọi máy chủ một lần với từ khóa cuối; dưới 2 ký tự không gọi', async () => {
      render(<SubjectProfileForm areas={areas} onSubmit={vi.fn()} />);
      await openSearch();
      const box = screen.getByRole('combobox', { name: 'Đường / hẻm' });
      fireEvent.change(box, { target: { value: 'n' } });
      fireEvent.change(box, { target: { value: 'ng' } });
      fireEvent.change(box, { target: { value: 'ngu' } });
      fireEvent.change(box, { target: { value: 'nguy' } });
      await waitFor(() => expect(suggest).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 500));
      expect(suggest).toHaveBeenCalledTimes(1);
      expect(suggest.mock.calls[0]![0]).toBe('nguy');
    });

    it('phản hồi cũ về muộn không đè kết quả của từ khóa mới', async () => {
      let resolveOld!: (r: StreetSuggestions) => void;
      suggest.mockImplementationOnce(() => new Promise((r) => (resolveOld = r)));
      suggest.mockResolvedValueOnce(found({ streets: [hueDth] }));
      render(<SubjectProfileForm areas={areas} onSubmit={vi.fn()} />);
      await openSearch();
      const box = screen.getByRole('combobox', { name: 'Đường / hẻm' });

      fireEvent.change(box, { target: { value: 'le' } });
      await waitFor(() => expect(suggest).toHaveBeenCalledTimes(1));
      fireEvent.change(box, { target: { value: 'nguyen' } });
      await waitFor(() => expect(suggest).toHaveBeenCalledTimes(2));
      expect(await screen.findByTitle('Nguyễn Huệ')).toBeInTheDocument();

      resolveOld(found({ streets: [{ ...hue, id: 1, displayName: 'Đường Lê Lợi' }] }));
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByTitle('Đường Lê Lợi')).not.toBeInTheDocument();
      expect(screen.getByTitle('Nguyễn Huệ')).toBeInTheDocument();
    });

    it('Goong hết hạn mức: báo nhẹ, vẫn chọn được đường trong danh mục', async () => {
      suggest.mockResolvedValue(found({ goongStatus: 'REJECTED' }));
      render(<SubjectProfileForm areas={areas} onSubmit={vi.fn()} />);
      await searchStreet('nguyen hue');
      expect(await screen.findByText('Gợi ý từ Goong tạm thời không dùng được; vẫn tìm được trong danh mục nội bộ.')).toBeInTheDocument();
      expect(screen.getByTitle('Đường Nguyễn Huệ')).toBeInTheDocument();
    });

    it('chưa cấu hình khóa Goong: báo rõ, vẫn chọn được đường trong danh mục', async () => {
      suggest.mockResolvedValue(found({ goongStatus: 'NOT_CONFIGURED' }));
      render(<SubjectProfileForm areas={areas} onSubmit={vi.fn()} />);
      await searchStreet('nguyen hue');
      expect(await screen.findByText('Chưa cấu hình khóa Goong nên chỉ tìm trong danh mục nội bộ.')).toBeInTheDocument();
      expect(screen.getByTitle('Đường Nguyễn Huệ')).toBeInTheDocument();
    });

    it('Goong chỉ là gợi ý tham khảo: chọn thì ghi nhận chờ xác minh, không gửi streetId', async () => {
      suggest.mockResolvedValue(found({ streets: [], external: [{ placeId: 'pid1', name: 'Đường Lê Lợi', secondaryText: 'Hồ Chí Minh' }] }));
      const onSubmit = vi.fn();
      render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);
      await fillNewHousehold();
      await searchStreet('le loi');
      await pickOption(screen.getByRole('combobox', { name: 'Đường / hẻm' }), 'Đường Lê Lợi · Hồ Chí Minh');

      expect(screen.getByText(/Đường chưa có trong danh mục/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].subject).toMatchObject({ street: 'Đường Lê Lợi', streetPending: true, streetId: undefined });
      expect(dupCheck).not.toHaveBeenCalled();
    });

    it('máy chủ gợi ý lỗi: báo trong ô và vẫn ghi nhận chờ xác minh bằng tay', async () => {
      suggest.mockRejectedValue(new ApiError(500, 'HTTP_500', 'lỗi'));
      const onSubmit = vi.fn();
      render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} />);
      await fillNewHousehold();
      await searchStreet('hem 7');
      expect(await screen.findByText('Không tìm được đường lúc này. Thử lại, hoặc ghi nhận chờ xác minh.')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /Không tìm thấy đường\?/ }));
      fireEvent.change(screen.getByLabelText('Tên đường chờ xác minh'), { target: { value: 'Hẻm 7 mới mở' } });
      await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].subject).toMatchObject({ street: 'Hẻm 7 mới mở', streetPending: true, streetId: undefined });
    });

    it('đổi sang ấp mà đường không đi qua thì bỏ đường đã chọn; đường đi qua cả hai ấp thì giữ', async () => {
      render(<SubjectProfileForm areas={areas} onSubmit={vi.fn()} />);
      await pickOption(screen.getByRole('combobox', { name: 'Ấp' }), 'KV24 · Tổ dân phố 24');
      await pickStreet('Đường Nguyễn Huệ');
      expect(document.querySelector('.ant-select-selection-item[title="Đường Nguyễn Huệ"]')).not.toBeNull();

      await pickOption(screen.getByRole('combobox', { name: 'Ấp' }), 'KV25 · Tổ dân phố 25');
      await waitFor(() => expect(document.querySelector('.ant-select-selection-item[title="Đường Nguyễn Huệ"]')).toBeNull());

      await pickStreet('Nguyễn Thị Mực (tên cũ: Đông Thạnh 8)');
      await pickOption(screen.getByRole('combobox', { name: 'Ấp' }), 'KV24 · Tổ dân phố 24');
      expect(document.querySelector('.ant-select-selection-item[title="Nguyễn Thị Mực (tên cũ: Đông Thạnh 8)"]')).not.toBeNull();
    });
  });

  describe('cảnh báo nghi trùng', () => {
    async function submitNewAt(house: string | null) {
      const onSubmit = vi.fn();
      const onOpenExisting = vi.fn();
      render(<SubjectProfileForm areas={areas} onSubmit={onSubmit} onOpenExisting={onOpenExisting} />);
      await fillNewHousehold();
      if (house) type('Số nhà', house);
      await pickStreet('Đường Nguyễn Huệ');
      await userEvent.click(screen.getByRole('button', { name: 'Tạo hồ sơ' }));
      return { onSubmit, onOpenExisting };
    }

    it('trùng: hiện mã hồ sơ, chủ hộ, SĐT, trạng thái (kể cả đã ngừng) và chưa lưu', async () => {
      dupCheck.mockResolvedValue([twin]);
      const { onSubmit } = await submitNewAt('12/5');

      expect(await screen.findByText('Địa chỉ này có thể trùng hồ sơ đã có')).toBeInTheDocument();
      expect(screen.getByText('NB-H000077')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị Cũ')).toBeInTheDocument();
      expect(screen.getByText('0903111222')).toBeInTheDocument();
      expect(screen.getByText('Đã chấm dứt')).toBeInTheDocument();
      expect(dupCheck).toHaveBeenCalledWith({ areaId: 24, streetId: 9, houseNo: '12/5', unitNo: undefined, excludeSubjectId: undefined });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('"Mở hồ sơ đã có" chuyển sang hồ sơ nghi trùng', async () => {
      dupCheck.mockResolvedValue([twin]);
      const { onOpenExisting } = await submitNewAt('12/5');
      await userEvent.click(await screen.findByRole('button', { name: 'Mở hồ sơ đã có' }));
      expect(onOpenExisting).toHaveBeenCalledWith(77);
    });

    it('"Xác nhận là hộ khác" bắt buộc có lý do rồi mới lưu, lý do gửi lên máy chủ', async () => {
      dupCheck.mockResolvedValue([twin]);
      const { onSubmit } = await submitNewAt('12/5');
      await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận là hộ khác' }));

      const save = screen.getByRole('button', { name: 'Lưu với lý do này' });
      expect(save).toBeDisabled();
      fireEvent.change(screen.getByLabelText('Lý do là hộ khác'), { target: { value: '  Hai hộ thuê chung nhà ' } });
      await userEvent.click(screen.getByRole('button', { name: 'Lưu với lý do này' }));

      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].subject).toMatchObject({ streetId: 9, houseNo: '12/5', duplicateReason: 'Hai hộ thuê chung nhà' });
    });

    it('sửa địa chỉ sau khi có cảnh báo thì cảnh báo cũ biến mất', async () => {
      dupCheck.mockResolvedValue([twin]);
      await submitNewAt('12/5');
      await screen.findByText('Địa chỉ này có thể trùng hồ sơ đã có');
      type('Số nhà', '12/5B');
      await waitFor(() => expect(screen.queryByText('Địa chỉ này có thể trùng hồ sơ đã có')).not.toBeInTheDocument());
    });

    it('nhà chưa có số: không đối chiếu, lưu bình thường', async () => {
      const { onSubmit } = await submitNewAt(null);
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(dupCheck).not.toHaveBeenCalled();
    });

    it('không trùng thì lưu luôn; kiểm tra trùng lỗi mạng thì vẫn gửi để máy chủ quyết định', async () => {
      dupCheck.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'mạng'));
      const { onSubmit } = await submitNewAt('12A');
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      expect(onSubmit.mock.calls[0]![0].subject.duplicateReason).toBeUndefined();
    });

    it('sửa hồ sơ: loại chính hồ sơ đang sửa; chỉ kiểm khi địa chỉ đổi', async () => {
      const onSubmit = vi.fn();
      render(<SubjectProfileForm subject={standardized} areas={areas} onSubmit={onSubmit} />);

      // Chỉ đổi tên: địa chỉ giữ nguyên nên không kiểm trùng.
      type('Tên chủ hộ', 'Tên mới');
      await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
      expect(dupCheck).not.toHaveBeenCalled();

      // Đổi số nhà: kiểm trùng và gửi kèm id hồ sơ đang sửa để loại khỏi kết quả.
      type('Số nhà', '12/6');
      await userEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
      await waitFor(() => expect(dupCheck).toHaveBeenCalledWith({ areaId: 24, streetId: 9, houseNo: '12/6', unitNo: undefined, excludeSubjectId: 128 }));
    });
  });
});
