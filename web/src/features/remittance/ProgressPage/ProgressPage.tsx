import { BellOutlined } from '@ant-design/icons';
import { Alert, Button, Progress, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { PROGRESS_LABELS, TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { DateText } from '../../../shared/DateText';
import { ErrorBlock } from '../../../shared/StateBlock';
import { PageHeader } from '../../../shared/PageHeader';
import { StatusTag } from '../../../shared/StatusTag';
import { MoneyText } from '../../../shared/MoneyText';
import { type Charge, useCharges } from '../../billing/api';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../api';
import { LedgerStats } from '../LedgerStats';
import { cappedRate } from '../rateBand';
import { RemainingText } from '../RemainingText';
import { PROGRESS_TONES } from '../tones';
import { ProgressCharts } from './ProgressCharts';
import { ReminderModal } from './ReminderModal';

function Rate({ rate, low }: { rate: number; low: boolean }) {
  return (
    <Space size={4} style={{ justifyContent: 'flex-end' }}>
      <Progress percent={cappedRate(rate)} size="small" showInfo={false} status={low ? 'exception' : 'normal'} style={{ width: 56 }} />
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{cappedRate(rate).toLocaleString('vi-VN')}%</span>
    </Space>
  );
}

/** Hộ còn phải thu của một tổ trong kỳ: hiện khi bấm "+" ở dòng tổ; chỉ lúc đó mới gọi API. */
// ponytail: mỗi tổ một lần gọi, tối đa 500 khoản (giới hạn API); tổ quá 500 hộ chưa thu thì thêm phân trang phía máy chủ.
function UnpaidHouseholds({ periodId, areaId, companyId }: { periodId: number; areaId: number; companyId: number }) {
  const charges = useCharges({ periodId, areaId, companyId, status: 'UNPAID', page: 0, size: 500 });
  if (charges.error) return <ErrorBlock error={charges.error} onRetry={() => void charges.refetch()} />;
  return (
    <Table<Charge>
      size="small"
      rowKey="id"
      loading={charges.isLoading}
      title={() => (charges.data ? `Hộ chưa thu (${charges.data.total})` : 'Hộ chưa thu')}
      dataSource={charges.data?.items ?? []}
      pagination={{ pageSize: 10, hideOnSinglePage: true, showSizeChanger: false }}
      locale={{ emptyText: charges.isLoading ? 'Đang tải…' : 'Tổ này đã thu hết' }}
      columns={[
        { title: 'Hộ', render: (_, c) => `${c.subjectCode} · ${c.subjectName}` },
        { title: 'Địa chỉ', dataIndex: 'subjectAddress' },
        { title: 'Số nhân khẩu', dataIndex: 'memberCount', align: 'right', render: (v: number | null) => v ?? '—' },
        { title: 'Nhóm giá', dataIndex: 'tariffGroup', render: (g: Charge['tariffGroup']) => (g ? TARIFF_GROUP_LABELS[g] : '—') },
        { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        {
          title: 'Hạn đóng',
          className: 'cell-nowrap',
          render: (_, c) => (
            <Space size={6}>
              <DateText value={c.dueDate} />
              {c.overdue && <StatusTag color="red">Quá hạn</StatusTag>}
            </Space>
          ),
        },
      ]}
    />
  );
}

/** Hạn công ty nộp về xã của kỳ đang xem, kèm còn / quá bao nhiêu ngày. */
function DueLine({ dueDate, locked }: { dueDate: string; locked: boolean }) {
  const days = dayjs(dueDate).startOf('day').diff(dayjs().startOf('day'), 'day');
  return (
    <Typography.Paragraph style={{ marginBottom: 12 }}>
      Hạn công ty nộp về xã: <strong><DateText value={dueDate} /></strong>
      {!locked && (
        <Typography.Text type={days < 0 ? 'danger' : 'secondary'}>
          {days < 0 ? ` · đã quá ${-days} ngày` : days === 0 ? ' · hết hạn hôm nay' : ` · còn ${days} ngày`}
        </Typography.Text>
      )}
    </Typography.Paragraph>
  );
}

/**
 * Tiến độ thu theo công ty và theo tổ (§10 bước 5, R13): trạng thái nộp, nợ kỳ trước, cờ dưới 45% như prototype —
 * công ty theo đã nộp về xã / phải nộp về xã, tổ theo đã thu / phải thu. Trên bảng có hai sơ đồ (công ty chậm nộp,
 * tổ thu chậm).
 */
export function ProgressPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [reminding, setReminding] = useState(false);
  // Lãnh đạo xem màn này chỉ đọc: không nhắc nộp (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const rows = ledger.data ?? [];
  const unassigned = (areas.data ?? []).filter((a) => a.noCompany && a.subjectCount > 0);
  const overdue = rows.filter((r) => r.progress === 'OVERDUE');
  const period = usePeriods().data?.find((p) => p.id === periodId);
  // Số hộ đã thu / phải thu của từng công ty, cộng từ các tổ công ty phụ trách.
  const households = new Map<number, { paid: number; total: number }>();
  for (const a of areas.data ?? []) {
    if (a.companyId === null) continue;
    const h = households.get(a.companyId) ?? { paid: 0, total: 0 };
    households.set(a.companyId, { paid: h.paid + a.paidCount, total: h.total + a.chargeCount });
  }

  return (
    <>
      <PageHeader
        title="Tiến độ thu"
        description="Công ty đã nộp về xã bao nhiêu, còn thiếu bao nhiêu và tổ nào thu chậm."
        extra={
          <Space wrap>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
            {overdue.length > 0 && !readOnly && (
              <Button danger icon={<BellOutlined />} onClick={() => setReminding(true)}>
                {`Nhắc công ty nộp (${overdue.length})`}
              </Button>
            )}
          </Space>
        }
      />
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}
      {period && <DueLine dueDate={period.dueDate} locked={period.status === 'LOCKED'} />}
      <LedgerStats rows={rows} show={['due', 'collected', 'payable', 'received', 'remaining']} />
      <ProgressCharts rows={rows} areas={areas.data ?? []} />
      {unassigned.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${unassigned.length} tổ chưa có công ty thu: ${unassigned.map((a) => a.areaCode).join(', ')}`}
        />
      )}
      <Table<LedgerRow>
        size="small"
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 1000 }}
        locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
        // Bấm "+" ở công ty để xem tổ, bấm "+" ở tổ để xem hộ chưa thu.
        expandable={{
          expandedRowRender: (r) => (
            <Table<AreaProgress>
              size="small"
              rowKey={(a) => `${a.areaId}-${a.companyId}`}
              pagination={false}
              dataSource={(areas.data ?? []).filter((a) => a.companyId === r.companyId)}
              expandable={{
                rowExpandable: (a) => a.paidCount < a.chargeCount,
                expandedRowRender: (a) => <UnpaidHouseholds periodId={r.periodId} areaId={a.areaId} companyId={r.companyId} />,
              }}
              columns={[
                { title: 'Tổ', render: (_, a) => `${a.areaCode} · ${a.areaName}` },
                { title: 'Số hộ', dataIndex: 'subjectCount', align: 'right' },
                { title: 'Hộ đã thu', render: (_, a) => `${a.paidCount}/${a.chargeCount}` },
                { title: 'Hộ miễn', dataIndex: 'exemptCount', align: 'right', render: (v: number) => v || '—' },
                { title: 'Phải thu của hộ', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Đã thu', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Còn phải thu', align: 'right', render: (_, a) => <MoneyText value={Math.max(0, a.due - a.collected)} /> },
                { title: 'Tỷ lệ thu', render: (_, a) => <Rate rate={a.collectionRate} low={a.lowCollectionRate} /> },
              ]}
            />
          ),
        }}
        columns={[
          {
            title: 'Công ty',
            width: 180,
            render: (_, r) => (
              <Typography.Text ellipsis={{ tooltip: `${r.companyCode} · ${r.companyName}` }} style={{ maxWidth: 160 }}>
                {r.companyName}
              </Typography.Text>
            ),
          },
          {
            title: 'Hộ đã thu',
            className: 'cell-nowrap',
            render: (_, r) => {
              const h = households.get(r.companyId);
              return h ? `${h.paid}/${h.total}` : '—';
            },
          },
          { title: 'Phải thu của hộ', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Công ty đã thu',
            dataIndex: 'collected',
            align: 'right',
            render: (v: number, r) => (
              <>
                <MoneyText value={v} />
                <div>
                  <Typography.Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{`${cappedRate(r.collectionRate).toLocaleString('vi-VN')}% đã thu`}</Typography.Text>
                </div>
              </>
            ),
          },
          { title: 'Phải nộp về xã', dataIndex: 'payable', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          {
            title: 'Đã nộp về xã',
            dataIndex: 'received',
            align: 'right',
            render: (v: number, r) => (
              <>
                <MoneyText value={v} />
                <div>
                  <Rate rate={r.remittedRate} low={r.lowRemittedRate} />
                </div>
              </>
            ),
          },
          { title: 'Còn phải nộp', dataIndex: 'remaining', align: 'right', render: (v: number) => <RemainingText value={v} strong /> },
          {
            title: 'Nợ kỳ trước',
            dataIndex: 'previousDebt',
            align: 'right',
            render: (v: number) => (v > 0 ? <Typography.Text type="danger"><MoneyText value={v} /></Typography.Text> : '—'),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'progress',
            render: (p: LedgerRow['progress']) => <StatusTag tone={PROGRESS_TONES[p]}>{PROGRESS_LABELS[p]}</StatusTag>,
          },
        ]}
      />
      <ReminderModal
        open={reminding}
        companies={overdue.map((r) => ({ id: r.companyId, name: r.companyName }))}
        onClose={() => setReminding(false)}
      />
    </>
  );
}
