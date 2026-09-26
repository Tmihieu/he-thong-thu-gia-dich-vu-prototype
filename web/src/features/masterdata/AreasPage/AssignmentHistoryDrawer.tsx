import { Drawer, Table } from 'antd';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { type Area, type AreaAssignment, useAreaHistory } from '../api';

/** Lịch sử phân công của một tổ, mới nhất trước. */
export function AssignmentHistoryDrawer({ area, onClose }: { area: Area | null; onClose: () => void }) {
  const history = useAreaHistory(area?.id ?? null);
  return (
    <Drawer title={area ? `Lịch sử phân công · ${area.code}` : ''} open={area !== null} onClose={onClose} width={560}>
      <Table<AreaAssignment>
        rowKey="id"
        size="small"
        pagination={false}
        loading={history.isLoading}
        dataSource={history.data ?? []}
        locale={{ emptyText: history.error instanceof ApiError ? history.error.message : 'Chưa từng phân công' }}
        columns={[
          { title: 'Công ty', render: (_, a) => `${a.companyCode} · ${a.companyName}` },
          { title: 'Từ ngày', dataIndex: 'validFrom', render: (d: string) => <DateText value={d} /> },
          {
            title: 'Đến ngày',
            dataIndex: 'validTo',
            render: (d: string | null) => (d ? <DateText value={d} /> : 'Đang hiệu lực'),
          },
          { title: 'Ghi chú', dataIndex: 'note', render: (n: string | null) => n ?? '' },
        ]}
      />
    </Drawer>
  );
}
