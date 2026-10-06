import { BellOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { Alert, Button, Progress, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { TARIFF_GROUP_LABELS } from '../../../shared/labels';
import { ErrorBlock } from '../../../shared/StateBlock';
import { PageHeader } from '../../../shared/PageHeader';
import { StatusTag } from '../../../shared/StatusTag';
import { MoneyText } from '../../../shared/MoneyText';
import { StatCard, StatGrid } from '../../../shared/StatCard';
import { type Charge, useCharges } from '../../billing/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger, useHouseholdDebts } from '../api';
import { PreviousDebtAlert } from '../PreviousDebtAlert';
import { cappedRate } from '../rateBand';
import { HouseholdDebtModal } from './HouseholdDebtModal';
import { ReminderModal } from './ReminderModal';

/** Thanh tiến độ trơn: không tô đỏ theo ngưỡng (cờ 45% không còn ở màn này). */
function Rate({ rate }: { rate: number }) {
  return (
    <Space size={4} style={{ minWidth: 120 }}>
      <Progress percent={cappedRate(rate)} size="small" showInfo={false} style={{ width: 56 }} />
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
 * Tiến độ thu theo công ty và theo tổ (UC-32, R13): phải thu, đã thu, tỷ lệ đã thu của kỳ; số nộp xã xem ở Đối soát
 * (góp ý 06/10 bỏ thẻ và cột phải nộp xã, đã nộp, xã trả lại). Tổ theo đã thu / phải thu. Có thẻ công nợ hộ (khoản chưa thu của kỳ đã khóa). Kỳ trước chưa khóa hiện ở
 * cảnh báo đầu trang, không còn cột riêng.
 */
export function ProgressPage() {
  const [periodId, setPeriodId] = useState<number>();
  const [reminding, setReminding] = useState(false);
  // Danh sách công nợ hộ: mở từ thẻ (toàn xã) hoặc từ dòng tổ (lọc theo tổ, công ty).
  const [debtFilter, setDebtFilter] = useState<{ companyId?: number; areaId?: number }>();
  // Lãnh đạo xem màn này chỉ đọc: không nhắc nộp (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const debts = useHouseholdDebts({ page: 0, size: 1 });
  const rows = ledger.data ?? [];
  const unassigned = (areas.data ?? []).filter((a) => a.noCompany && a.subjectCount > 0);
  const overdue = rows.filter((r) => r.progress === 'OVERDUE');
  const sum = (key: 'due' | 'collected' | 'debtCollected') => rows.reduce((t, r) => t + r[key], 0);
  const due = sum('due');
  const thisPeriod = sum('collected') - sum('debtCollected');

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
      <PreviousDebtAlert rows={rows} />
      <StatGrid>
        <StatCard label="Phải thu" value={<MoneyText value={due} />} />
        <StatCard
          label="Đã thu (tiền mặt, chuyển khoản)"
          tone="info"
          value={<MoneyText value={sum('collected')} />}
          hint={sum('debtCollected') > 0 && <>trong đó thu công nợ kỳ cũ: <MoneyText value={sum('debtCollected')} /></>}
        />
        <StatCard
          label="Tỷ lệ đã thu"
          tone="info"
          value={due > 0 ? `${cappedRate(Math.round((thisPeriod / due) * 1000) / 10).toLocaleString('vi-VN')}%` : '—'}
          hint="đã thu của kỳ / phải thu (không tính thu công nợ kỳ cũ)"
        />
        <StatCard
          label="Công nợ hộ"
          tone={debts.data && debts.data.householdCount > 0 ? 'danger' : 'neutral'}
          value={debts.data ? `${debts.data.householdCount} hộ` : '—'}
          hint={
            debts.data && (
              <>
                <MoneyText value={debts.data.totalAmount} /> chưa thu của kỳ đã khóa{' '}
                {debts.data.householdCount > 0 && (
                  <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDebtFilter({})}>
                    Xem danh sách
                  </Button>
                )}
              </>
            )
          }
        />
      </StatGrid>
      {unassigned.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${unassigned.length} tổ chưa có công ty thu: ${unassigned.map((a) => a.areaCode).join(', ')}`}
        />
      )}
      <Table<LedgerRow>
        size="middle"
        rowKey="companyId"
        loading={ledger.isLoading}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 960 }}
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
                { title: 'Tỷ lệ thu', render: (_, a) => <Rate rate={a.collectionRate} /> },
                {
                  title: 'Hộ còn nợ kỳ cũ',
                  dataIndex: 'debtHouseholds',
                  align: 'right',
                  render: (v: number, a) =>
                    v > 0 ? (
                      <Button
                        type="link"
                        size="small"
                        aria-label={`Xem ${v} hộ còn nợ kỳ cũ của ${a.areaCode}`}
                        onClick={() => setDebtFilter({ areaId: a.areaId, companyId: r.companyId })}
                      >
                        {v}
                      </Button>
                    ) : (
                      0
                    ),
                },
              ]}
            />
          ),
        }}
        columns={[
          {
            title: 'Công ty',
            width: 200,
            render: (_, r) => (
              <Typography.Text ellipsis={{ tooltip: `${r.companyCode} · ${r.companyName}` }} style={{ maxWidth: 160 }}>
                {r.companyName}
              </Typography.Text>
            ),
          },
          { title: 'Phải thu', dataIndex: 'due', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Đã thu', dataIndex: 'collected', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          // Phải nộp xã <= 0 thì chưa có gì để nộp: không chia cho 0 hay số âm.
          { title: 'Tỷ lệ nộp', render: (_, r) => (r.payable > 0 ? <Rate rate={r.remittedRate} /> : '—') },
          {
            title: 'Đã nộp đủ',
            align: 'center',
            width: 110,
            render: (_, r) =>
              r.remaining <= 0 ? (
                <CheckCircleFilled aria-label="Đã nộp đủ" style={{ color: '#16a34a', fontSize: 18 }} />
              ) : (
                <CloseCircleFilled aria-label="Chưa nộp đủ" style={{ color: '#dc2626', fontSize: 18 }} />
              ),
          },
        ]}
      />
      <HouseholdDebtModal
        open={debtFilter !== undefined}
        onClose={() => setDebtFilter(undefined)}
        companyId={debtFilter?.companyId}
        areaId={debtFilter?.areaId}
      />
      <ReminderModal
        open={reminding}
        companies={overdue.map((r) => ({ id: r.companyId, name: r.companyName }))}
        onClose={() => setReminding(false)}
      />
    </>
  );
}
