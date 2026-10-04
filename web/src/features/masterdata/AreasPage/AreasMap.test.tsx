import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { AppProviders } from '../../../app/AppProviders';
import { createQueryClient } from '../../../app/queryClient';
import { AreasMap, type MapArea } from './AreasMap';

const base = { districtId: 1, districtCode: 'DTH', status: 'ACTIVE', subjectCount: 20 } as const;
const ap39: MapArea = {
  ...base, id: 7, code: 'AP39', name: 'Ấp 39', latitude: 10.911775, longitude: 106.639976,
  assignment: {
    id: 100, areaId: 7, areaCode: 'AP39', areaName: 'Ấp 39', companyId: 1, companyCode: 'DV01',
    companyName: 'Công ty MTĐT Đông Thạnh', validFrom: '2026-09-01', validTo: null, note: null, decisionNo: null,
  },
};
// Chưa lưu vị trí: ghim đặt giữa ranh giới ấp.
const ap47: MapArea = { ...base, id: 24, code: 'AP47', name: 'Ấp 47', latitude: null, longitude: null };

function renderMap(onAssign = vi.fn(), onHistory = vi.fn()) {
  render(
    <AppProviders queryClient={createQueryClient()}>
      <AreasMap
        areas={[ap39, ap47]}
        districtNames={new Map([['DTH', 'Đông Thạnh']])}
        isDimmed={(a) => a.id === 7}
        onAssign={onAssign}
        onHistory={onHistory}
      />
    </AppProviders>,
  );
  return { onAssign, onHistory };
}

describe('Bản đồ khu vực', () => {
  it('ghim mọi ấp, chú thích công ty và ấp chưa có công ty, ghi nguồn OpenStreetMap', () => {
    renderMap();

    expect(screen.getByTitle('Ấp 39')).toHaveTextContent('39');
    expect(screen.getByTitle('Ấp 47')).toHaveTextContent('47');
    expect(screen.getByTitle('Ấp 39').querySelector('.vsmt-area-pin--dimmed')).not.toBeNull();
    expect(screen.getByTitle('Công ty MTĐT Đông Thạnh')).toHaveTextContent('DV01');
    expect(screen.getByText('Chưa có công ty')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  });

  it('bấm ghim ấp chưa có công ty mở popup để phân công và xem lịch sử', async () => {
    const { onAssign, onHistory } = renderMap();

    fireEvent.click(screen.getByTitle('Ấp 47'));
    expect(await screen.findByText('AP47 · Ấp 47')).toBeInTheDocument();
    expect(screen.getByText(/Địa bàn Đông Thạnh · 20 hộ/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Phân công' }));
    expect(onAssign).toHaveBeenCalledWith(24);
    await userEvent.click(screen.getByRole('button', { name: 'Lịch sử' }));
    expect(onHistory).toHaveBeenCalledWith(ap47);
  });

  it('bật chế độ sửa vị trí thì ghim kéo được', async () => {
    renderMap();

    expect(screen.getByTitle('Ấp 47')).not.toHaveClass('leaflet-marker-draggable');
    await userEvent.click(screen.getByRole('switch', { name: 'Sửa vị trí ấp' }));
    expect(screen.getByText('Kéo điểm ấp đến vị trí mới')).toBeInTheDocument();
    expect(screen.getByTitle('Ấp 47')).toHaveClass('leaflet-marker-draggable');
  });
});
