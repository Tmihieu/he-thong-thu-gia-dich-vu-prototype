import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Modal, Space, Table } from 'antd';
import { useState } from 'react';

import { errorTextOrNull } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { DateText } from '../../../shared/DateText';
import { PERIOD_STATUS_LABELS, PERIOD_TYPE_LABELS, STATUS_COLORS } from '../../../shared/labels';
import { newestFirst, type Period, useDraftPeriods, useOpenPeriod, usePeriods, useTariffs } from '../api';
import { OpenPeriodForm } from './OpenPeriodForm';
import { PeriodRuleCard } from './PeriodRuleCard';
import { OpenDraftPanel } from '../../billing/PeriodDraftsPage/OpenDraftPanel';

/**
 * Quy tắc tự tạo kỳ, danh sách kỳ thu và mở kỳ thủ công (quản trị, §10 bước 1).
 * Kỳ do hệ thống tự tạo ở dạng Dự thảo cho cán bộ xã mở; mở thủ công ở đây vào thẳng Đang thu.
 */
export function PeriodsPage() {
  const { message } = App.useApp();
  const periods = usePeriods();
  const drafts = useDraftPeriods();
  const tariffs = useTariffs();
  const openPeriod = useOpenPeriod();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Period | null>(null);

  function closeForm() {
    setFormOpen(false);
    openPeriod.reset();
  }

  return (
    <>
      <PeriodRuleCard />
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          Tạo kỳ dự thảo
        </Button>
      </Space>
      <Table<Period>
        rowKey="id"
        loading={periods.isLoading || drafts.isLoading}
        dataSource={newestFirst(periods.data, drafts.data)}
        pagination={false}
        locale={{ emptyText: periods.error ? errorTextOrNull(periods.error) : 'Chưa có kỳ thu nào' }}
        columns={[
          { title: 'Kỳ', dataIndex: 'label', render: (label: string, p) => <span title={p.code}>{label}</span> },
          { title: 'Loại', dataIndex: 'periodType', render: (t: Period['periodType']) => PERIOD_TYPE_LABELS[t] },
          // Kỳ dự thảo chưa có ngày mở / hạn nộp: cán bộ xã đặt khi mở kỳ.
          { title: 'Ngày mở', dataIndex: 'openDate', render: (d: string, p) => (p.status === 'DRAFT' ? null : <DateText value={d} />) },
          { title: 'Hạn công ty nộp', dataIndex: 'dueDate', render: (d: string, p) => (p.status === 'DRAFT' ? null : <DateText value={d} />) },
          { title: 'Biểu giá', dataIndex: 'tariffVersionCode' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: Period['status']) => <StatusTag color={STATUS_COLORS[s]}>{PERIOD_STATUS_LABELS[s]}</StatusTag>,
          },
          {
            title: 'Thao tác',
            render: (_, period) => period.status === 'DRAFT' ? (
              <Button onClick={() => setSelected(period)}>Xem trước & mở kỳ</Button>
            ) : null,
          },
        ]}
      />
      <Drawer title={selected ? `Mở kỳ ${selected.label}` : 'Mở kỳ'} open={selected !== null}
        onClose={() => setSelected(null)} width={800} destroyOnHidden>
        {selected && <OpenDraftPanel period={selected} onClose={() => setSelected(null)} />}
      </Drawer>
      <Modal title="Tạo kỳ dự thảo" open={formOpen} onCancel={closeForm} footer={null} destroyOnHidden>
        <OpenPeriodForm
          tariffs={tariffs.data ?? []}
          submitting={openPeriod.isPending}
          error={errorTextOrNull(openPeriod.error)}
          onCancel={closeForm}
          onSubmit={(req) =>
            openPeriod.mutate(req, {
              onSuccess: (p) => {
                message.success(`Đã tạo kỳ dự thảo ${p.label}. Xem trước các khoản trước khi mở kỳ.`);
                closeForm();
                setSelected(p);
              },
            })
          }
        />
      </Modal>
    </>
  );
}
