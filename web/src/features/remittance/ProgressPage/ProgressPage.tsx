import { BellOutlined } from '@ant-design/icons';
import { Alert, Button, Popover, Progress, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { PROGRESS_LABELS, TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { ErrorBlock } from '../../../shared/StateBlock';
import { PageHeader } from '../../../shared/PageHeader';
import { StatusTag } from '../../../shared/StatusTag';
import { MoneyText } from '../../../shared/MoneyText';
import { type Charge, useCharges } from '../../billing/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../api';
import { LedgerStats } from '../LedgerStats';
import { cappedRate } from '../rateBand';
import { RemainingText } from '../RemainingText';
import { PROGRESS_TONES } from '../tones';
import { ReminderModal } from './ReminderModal';

function Rate({ rate, low }: { rate: number; low: boolean }) {
  return (
    <Space size={4} style={{ minWidth: 120 }}>
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
        { title: '', width: 90, render: (_, c) => c.overdue && <StatusTag color="red">Quá hạn</StatusTag> },
      ]}
    />
  );
}

/**
 * Tiến độ thu theo công ty và theo tổ (§10 bước 5, R13): trạng thái nộp, nợ kỳ trước, cờ dưới 45% như prototype —
 * công ty theo đã nộp về xã / phải thu, tổ theo đã thu / phải thu.
 */
export function ProgressPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [reminding, setReminding] = useState<number | null>(null);
  // Lãnh đạo xem màn này chỉ đọc: không nhắc nộp (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const rows = ledger.data ?? [];
  const unassigned = (areas.data ?? []).filter((a) => a.noCompany && a.subjectCount > 0);
  const overdue = rows.filter((r) => r.progress === 'OVERDUE');

  return (
    <>
      <PageHeader
        title="Tiến độ thu"
        description="Công ty đã nộp về xã bao nhiêu, còn thiếu bao nhiêu và tổ nào thu chậm."
        extra={
          <Space wrap>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
            {overdue.length > 0 && !readOnly && (
              <Popover
                trigger="click"
                title={`${overdue.length} công ty quá hạn nộp`}
                content={
                  <Space direction="vertical">
                    {overdue.map((r) => (
                      <Button key={r.companyId} size="small" danger block onClick={() => setReminding(r.companyId)}>
                        {`Nhắc nộp ${r.companyCode} · ${r.companyName}`}
                      </Button>
                    ))}
                  </Space>
                }
              >
                <Button danger icon={<BellOutlined />}>{`Nhắc công ty nộp (${overdue.length})`}</Button>
              </Popover>
            )}
          </Space>
        }
      />
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}
      <LedgerStats rows={rows} show={['due', 'payable', 'received', 'remaining']} />
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
        scroll={{ x: 900 }}
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
                { title: 'Khoản đã thu', render: (_, a) => `${a.paidCount}/${a.chargeCount}` },
                { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Đã thu', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
                { title: 'Tỷ lệ', render: (_, a) => <Rate rate={a.collectionRate} low={a.lowCollectionRate} /> },
              ]}
            />
          ),
        }}
        columns={[
          {
            title: 'Công ty',
            width: 180,
            render: (_, r) => (
              <Typography.Text ellipsis={{ tooltip: true }} style={{ maxWidth: 160 }}>{`${r.companyCode} · ${r.companyName}`}</Typography.Text>
            ),
          },
          {
            title: 'Phải thu',
            dataIndex: 'due',
            align: 'right',
            render: (v: number) => (
              <>
                <MoneyText value={v} />
              </>
            ),
          },
          {
            title: 'Đã thu',
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
          { title: 'Đã nộp về xã', dataIndex: 'received', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Tỷ lệ nộp', render: (_, r) => <Rate rate={r.remittedRate} low={r.lowRemittedRate} /> },
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
            render: (p: LedgerRow['progress'], r) => (
              <Space size={4} wrap>
                <StatusTag tone={PROGRESS_TONES[p]}>{PROGRESS_LABELS[p]}</StatusTag>
                {p === 'OVERDUE' && !readOnly && (
                  <Button size="small" danger onClick={() => setReminding(r.companyId)} aria-label={`Nhắc nộp ${r.companyCode}`}>
                    Nhắc nộp
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <ReminderModal companyId={reminding} onClose={() => setReminding(null)} />
    </>
  );
}
