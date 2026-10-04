import { Alert, Button, Drawer, Empty, Space, Spin, Table, Typography } from 'antd';
import { useState } from 'react';

import { DateText } from '../../../shared/DateText';
import { PERIOD_TYPE_LABELS } from '../../../shared/labels';
import { type Period, useDraftPeriods } from '../../masterdata/api';
import { OpenDraftPanel } from './OpenDraftPanel';

/**
 * Kỳ chờ mở (cán bộ xã, 04/10): hệ thống tự tạo kỳ kế tiếp ở dạng Dự thảo theo quy tắc của quản trị;
 * cán bộ xã xem trước các khoản rồi bấm "Mở kỳ & phát hành" để hộ nhận khoản thu.
 */
export function PeriodDraftsTab() {
  const drafts = useDraftPeriods();
  const [selected, setSelected] = useState<Period | null>(null);

  if (drafts.isLoading) return <Spin />;
  if (drafts.error) {
    return <Alert type="error" showIcon message="Không tải được danh sách kỳ chờ mở. Vui lòng thử lại." />;
  }

  const list = drafts.data ?? [];

  return (
    <>
      <Typography.Paragraph type="secondary">
        Hệ thống tự tạo kỳ thu kế tiếp theo quy tắc của quản trị. Xem trước các khoản rồi mở kỳ để hộ dân nhận khoản thu.
      </Typography.Paragraph>
      <Table<Period>
        rowKey="id"
        dataSource={list}
        pagination={false}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có kỳ nào chờ mở" /> }}
        columns={[
          { title: 'Kỳ', dataIndex: 'label', render: (label: string, p) => <span title={p.code}>{label}</span> },
          { title: 'Loại', dataIndex: 'periodType', render: (t: Period['periodType']) => PERIOD_TYPE_LABELS[t] },
          {
            title: 'Thời gian',
            render: (_, p) => (
              <>
                <DateText value={p.startDate} /> – <DateText value={p.endDate} />
              </>
            ),
          },
          { title: 'Hạn công ty nộp', dataIndex: 'dueDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Biểu giá', dataIndex: 'tariffVersionCode' },
          {
            title: '',
            align: 'right',
            render: (_, p) => (
              <Space>
                <Button type="primary" onClick={() => setSelected(p)}>
                  Xem trước & mở kỳ
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Drawer
        title={selected ? `Mở kỳ ${selected.label}` : 'Mở kỳ'}
        open={selected !== null}
        onClose={() => setSelected(null)}
        width={800}
        destroyOnHidden
      >
        {selected && <OpenDraftPanel period={selected} onClose={() => setSelected(null)} />}
      </Drawer>
    </>
  );
}
