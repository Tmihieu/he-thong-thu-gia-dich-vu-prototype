import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Modal, Space, Table, Tag } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { PERIOD_STATUS_LABELS, PERIOD_TYPE_LABELS, STATUS_COLORS } from '../../../shared/labels';
import { type Period, useOpenPeriod, usePeriods, useStartCollecting, useTariffs } from '../api';
import { OpenPeriodForm } from './OpenPeriodForm';

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

/** Danh sách kỳ thu, mở kỳ, bắt đầu thu (quản trị, §10 bước 1). */
export function PeriodsPage() {
  const { message } = App.useApp();
  const periods = usePeriods();
  const tariffs = useTariffs();
  const openPeriod = useOpenPeriod();
  const start = useStartCollecting();
  const [formOpen, setFormOpen] = useState(false);

  function closeForm() {
    setFormOpen(false);
    openPeriod.reset();
  }

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          Mở kỳ
        </Button>
      </Space>
      {start.error && (
        <div role="alert" style={{ color: '#cf1322', marginBottom: 12 }}>
          {errorMessage(start.error)}
        </div>
      )}
      <Table<Period>
        rowKey="id"
        loading={periods.isLoading}
        dataSource={periods.data ?? []}
        pagination={false}
        locale={{ emptyText: periods.error ? errorMessage(periods.error) : 'Chưa có kỳ thu nào' }}
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
          { title: 'Ngày mở', dataIndex: 'openDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Hạn công ty nộp', dataIndex: 'dueDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Biểu giá', dataIndex: 'tariffVersionCode' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: Period['status']) => <Tag color={STATUS_COLORS[s]}>{PERIOD_STATUS_LABELS[s]}</Tag>,
          },
          {
            title: '',
            render: (_, p) =>
              p.status === 'OPEN' ? (
                <Button
                  size="small"
                  loading={start.isPending && start.variables === p.id}
                  onClick={() =>
                    start.mutate(p.id, { onSuccess: () => message.success(`Kỳ ${p.label} đã bắt đầu thu`) })
                  }
                >
                  Bắt đầu thu
                </Button>
              ) : null,
          },
        ]}
      />
      <Modal title="Mở kỳ thu" open={formOpen} onCancel={closeForm} footer={null} destroyOnHidden>
        <OpenPeriodForm
          tariffs={tariffs.data ?? []}
          submitting={openPeriod.isPending}
          error={errorMessage(openPeriod.error)}
          onCancel={closeForm}
          onSubmit={(req) =>
            openPeriod.mutate(req, {
              onSuccess: (p) => {
                message.success(`Đã mở kỳ ${p.label}`);
                closeForm();
              },
            })
          }
        />
      </Modal>
    </>
  );
}
