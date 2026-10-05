import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Modal, Space, Table } from 'antd';
import { useState } from 'react';

import { errorTextOrNull } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { DateText } from '../../../shared/DateText';
import { PERIOD_STATUS_LABELS, PERIOD_TYPE_LABELS, STATUS_COLORS } from '../../../shared/labels';
import { newestFirst, type Period, useDraftPeriods, useOpenPeriod, usePeriods, useTariffs } from '../api';
import { OpenPeriodForm } from './OpenPeriodForm';

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

  function closeForm() {
    setFormOpen(false);
    openPeriod.reset();
  }

  return (
    <>
      {/* Tạm tắt tự tạo kỳ: <PeriodRuleCard /> */}
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
          {
            title: 'Thời gian',
            render: (_, p) => (
              <>
                <DateText value={p.startDate} /> – <DateText value={p.endDate} />
              </>
            ),
          },
          // Kỳ dự thảo chưa có ngày mở / hạn nộp: cán bộ xã đặt khi mở kỳ.
          { title: 'Ngày mở', dataIndex: 'openDate', render: (d: string, p) => (p.status === 'DRAFT' ? null : <DateText value={d} />) },
          { title: 'Hạn công ty nộp', dataIndex: 'dueDate', render: (d: string, p) => (p.status === 'DRAFT' ? null : <DateText value={d} />) },
          { title: 'Biểu giá', dataIndex: 'tariffVersionCode' },
          {
            title: 'Trạng thái',
            dataIndex: 'status',
            render: (s: Period['status']) => <StatusTag color={STATUS_COLORS[s]}>{PERIOD_STATUS_LABELS[s]}</StatusTag>,
          },
        ]}
      />
      <Modal title="Tạo kỳ dự thảo" open={formOpen} onCancel={closeForm} footer={null} destroyOnHidden>
        <OpenPeriodForm
          tariffs={tariffs.data ?? []}
          submitting={openPeriod.isPending}
          error={errorTextOrNull(openPeriod.error)}
          onCancel={closeForm}
          onSubmit={(req) =>
            openPeriod.mutate(req, {
              onSuccess: (p) => {
                message.success(`Đã tạo kỳ dự thảo ${p.label}, cán bộ xã sẽ đặt ngày và mở kỳ`);
                closeForm();
              },
            })
          }
        />
      </Modal>
    </>
  );
}
