import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Modal, Space, Table, Tag } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { PERIOD_STATUS_LABELS, PERIOD_TYPE_LABELS, STATUS_COLORS } from '../../../shared/labels';
import { type Period, useOpenPeriod, usePeriods, useTariffs } from '../api';
import { OpenPeriodForm } from './OpenPeriodForm';
import { PeriodRuleCard } from './PeriodRuleCard';

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

/**
 * Quy tắc tự tạo kỳ, danh sách kỳ thu và mở kỳ thủ công (quản trị, §10 bước 1).
 * Kỳ do hệ thống tự tạo ở dạng Dự thảo cho cán bộ xã mở; mở thủ công ở đây vào thẳng Đang thu.
 */
export function PeriodsPage() {
  const { message } = App.useApp();
  const periods = usePeriods();
  const tariffs = useTariffs();
  const openPeriod = useOpenPeriod();
  const [formOpen, setFormOpen] = useState(false);

  function closeForm() {
    setFormOpen(false);
    openPeriod.reset();
  }

  return (
    <>
      <PeriodRuleCard />
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
          Mở kỳ thủ công
        </Button>
      </Space>
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
