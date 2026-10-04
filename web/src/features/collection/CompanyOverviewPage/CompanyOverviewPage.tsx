import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Progress, Row, Space, Table, theme, Typography } from 'antd';
import { type ReactNode, useMemo, useState } from 'react';

import { api } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { errorText as apiErrorText } from '../../../shared/errorText';
import { PROGRESS_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { ErrorBlock, EmptyBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { useTabParam } from '../../../shared/useTabParam';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { remittanceKeys, useCompanyLedger } from '../../remittance/api';
import { LedgerStats } from '../../remittance/LedgerStats';
import { cappedRate, rateBand } from '../../remittance/rateBand';
import { PROGRESS_TONES } from '../../remittance/tones';
import { type CashHeld, collectionKeys, type Handover, useCashHeld, useCollectorAssignments, useCompanyWork, useHandovers } from '../api';
import { CompanyHouseholdsPage } from '../CompanyHouseholdsPage/CompanyHouseholdsPage';
import type { WorkChip } from '../workState';
import { CashReceiveForm, type CashReceiveRequest } from './CashReceiveForm';

type CollectorRow = CashHeld & { assigned: number; assignedAmount: number; paid: number; paidAmount: number; overdue: number };

const pct = (v: number | undefined) => (Math.round((v ?? 0) * 10) / 10).toLocaleString('vi-VN');
const Sub = ({ children }: { children: ReactNode }) => (
  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, whiteSpace: 'nowrap' }}>
    {children}
  </Typography.Text>
);

interface RingProps {
  loading: boolean;
  color: string;
  percent: number;
  hasData: boolean;
  label: string;
  value: ReactNode;
  note: ReactNode;
  /** Bấm thẻ để xem danh sách chi tiết. */
  onOpen: () => void;
}

/** Thẻ vòng tiến độ như prototype (rsRingCard): vòng % bên trái, nhãn / số / ghi chú bên phải; bấm để xem chi tiết. */
function RingCard({ loading, color, percent, hasData, label, value, note, onOpen }: RingProps) {
  return (
    <Card
      size="small"
      loading={loading}
      className="section-card"
      style={{ height: '100%', cursor: 'pointer' }}
      hoverable
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết ${label}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <Space size="middle" align="center">
        <Progress type="circle" size={88} strokeColor={color} percent={hasData ? percent : 0} format={(p) => (hasData ? `${pct(p)}%` : '—')} />
        <div>
          <Typography.Text type="secondary">{label}</Typography.Text>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.3 }}>{value}</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {note}
          </Typography.Text>
        </div>
      </Space>
    </Card>
  );
}

const errorText = (e: unknown) => (e ? apiErrorText(e) : null);

/**
 * Tổng quan của công ty (theo prototype rsCompanyAssigned): 3 vòng tiến độ (tiền lấy nguyên dòng sổ công ty–kỳ T24);
 * tiến độ theo tài khoản người đi thu + nhận tiền mặt (G5); danh sách hộ được giao; lịch sử bàn giao.
 */
export function CompanyOverviewPage() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const [periodId, setPeriodId] = useState<number>();
  const [receiving, setReceiving] = useState<CashHeld | null>(null);
  const [chip, setChip] = useState<WorkChip>('ALL');
  const [, setTab] = useTabParam(['overview', 'collectors', 'receipts'], 'overview');
  const showPaidHouseholds = () => {
    setChip('PAID');
    document.getElementById('company-households')?.scrollIntoView?.({ behavior: 'smooth' });
  };
  const ledger = useCompanyLedger(periodId);
  const cash = useCashHeld();
  const handovers = useHandovers();
  const receive = useMutation({
    mutationFn: (req: CashReceiveRequest) => api.post<Handover>('/api/collection/cash/handovers', req),
    onSuccess: (h) => {
      message.success(`Đã nhận ${h.code} từ ${h.collectorName}`);
      void queryClient.invalidateQueries({ queryKey: collectionKeys.all });
      void queryClient.invalidateQueries({ queryKey: remittanceKeys.ledger });
      setReceiving(null);
    },
  });
  const work = useCompanyWork(periodId);
  const assignments = useCollectorAssignments();
  const row = ledger.data?.[0];

  const items = useMemo(() => work.data ?? [], [work.data]);
  const households = useMemo(
    () => ({
      total: items.length,
      paid: items.filter((w) => w.charge.status === 'PAID').length,
      areas: new Set(items.map((w) => w.charge.areaId)).size,
    }),
    [items],
  );
  // ponytail: hộ tính cho người đang phụ trách tổ (không theo người đã xác nhận thu); tách theo người xác nhận cần API trả collectorId của khoản.
  const collectorRows = useMemo<CollectorRow[]>(() => {
    const byArea = new Map((assignments.data ?? []).map((a) => [a.areaId, a.collectorId]));
    return (cash.data ?? []).map((c) => {
      const mine = items.filter((w) => byArea.get(w.charge.areaId) === c.collectorId);
      const paid = mine.filter((w) => w.charge.status === 'PAID');
      return {
        ...c,
        assigned: mine.length,
        assignedAmount: mine.reduce((t, w) => t + w.charge.amount, 0),
        paid: paid.length,
        paidAmount: mine.reduce((t, w) => t + w.paidAmount, 0),
        overdue: mine.filter((w) => w.charge.status === 'UNPAID' && w.charge.overdue).length,
      };
    });
  }, [cash.data, assignments.data, items]);
  const loadError = ledger.error ?? cash.error ?? handovers.error ?? assignments.error;

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {loadError && <ErrorBlock error={loadError} />}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <RingCard
            loading={work.isLoading}
            color={token[rateBand(households.total ? (households.paid / households.total) * 100 : 0)]}
            percent={households.total ? (households.paid / households.total) * 100 : 0}
            hasData={households.total > 0}
            label="Số hộ đã thu"
            onOpen={showPaidHouseholds}
            value={`${households.paid}/${households.total} hộ`}
            note={
`${households.areas} tổ`
            }
          />
        </Col>
        <Col xs={24} md={8}>
          <RingCard
            loading={ledger.isLoading}
            color={token[rateBand(row?.collectionRate ?? 0)]}
            percent={row?.collectionRate ?? 0}
            hasData={!!row}
            label="Số tiền đã thu"
            onOpen={showPaidHouseholds}
            value={<MoneyText value={row?.collected ?? 0} />}
            note={
              <>
                trên <MoneyText value={row?.due ?? 0} /> phải thu
              </>
            }
          />
        </Col>
        <Col xs={24} md={8}>
          <RingCard
            loading={ledger.isLoading}
            color={token[rateBand(cappedRate(row?.remittedRate ?? 0))]}
            percent={cappedRate(row?.remittedRate ?? 0)}
            hasData={!!row}
            label="Số tiền đã nộp về xã"
            onOpen={() => setTab('receipts')}
            value={<MoneyText value={row?.received ?? 0} />}
            note={
              row ? (
                <Space size={4} wrap>
                  <span>{row.receiptCount} phiếu thu</span>
                  <StatusTag tone={PROGRESS_TONES[row.progress]}>{PROGRESS_LABELS[row.progress]}</StatusTag>
                </Space>
              ) : (
                'Kỳ này công ty chưa có khoản phải thu'
              )
            }
          />
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <LedgerStats rows={ledger.data ?? []} show={['retained', 'payable', 'remaining', 'previousDebt']} />
      </div>
      <Card size="small" className="section-card" title="Theo tài khoản người đi thu">
        <Table<CollectorRow>
          size="small"
          rowKey="collectorId"
          loading={cash.isLoading}
          dataSource={collectorRows}
          pagination={false}
          locale={{ emptyText: <EmptyBlock title="Công ty chưa có người đi thu" hint="Quản trị tạo tài khoản người đi thu, sau đó phân tổ ở tab Phân tổ." /> }}
          columns={[
            {
              title: 'Tài khoản',
              render: (_, c) => (
                <>
                  <div style={{ fontWeight: 600 }}>{c.collectorName}</div>
                  <Sub>{c.collectorUsername}</Sub>
                </>
              ),
            },
            {
              title: 'Hộ được giao',
              align: 'right',
              render: (_, c) => (
                <>
                  <div>{c.assigned}</div>
                  <Sub>
                    <MoneyText value={c.assignedAmount} />
                  </Sub>
                </>
              ),
            },
            {
              title: 'Tiến độ thu',
              width: 220,
              render: (_, c) => (
                <>
                  <Progress
                    size="small"
                    percent={c.assigned ? (c.paid / c.assigned) * 100 : 0}
                    format={(p) => `${pct(p)}%`}
                    style={{ marginBottom: 0 }}
                  />
                  <Sub>
                    {c.paid} đã thu · {c.assigned - c.paid} chưa thu
                    {c.overdue > 0 && <Typography.Text type="danger"> · {c.overdue} quá hạn</Typography.Text>}
                  </Sub>
                </>
              ),
            },
            {
              title: 'Đã thu',
              align: 'right',
              render: (_, c) => (
                <>
                  <MoneyText value={c.paidAmount} strong />
                  <Sub>
                    đang giữ <MoneyText value={c.held} /> tiền mặt
                  </Sub>
                </>
              ),
            },
            {
              title: 'Trạng thái',
              render: (_, c) =>
                c.held <= 0 ? (
                  <StatusTag tone="success">Đã bàn giao đủ</StatusTag>
                ) : (
                  <StatusTag tone="warning">
                    Đang giữ <MoneyText value={c.held} />
                  </StatusTag>
                ),
            },
            {
              title: '',
              render: (_, c) => (
                <Button size="small" disabled={c.held <= 0} onClick={() => setReceiving(c)} aria-label={`Nhận tiền mặt ${c.collectorName}`}>
                  Nhận tiền mặt
                </Button>
              ),
            },
          ]}
        />
      </Card>
      <div style={{ marginTop: 16 }}>
        <CompanyHouseholdsPage periodId={periodId} chip={chip} onChipChange={setChip} />
      </div>
      <Typography.Title level={5} style={{ marginTop: 24 }}>
        Lịch sử bàn giao
      </Typography.Title>
      <Table<Handover>
        size="small"
        rowKey="id"
        loading={handovers.isLoading}
        dataSource={handovers.data ?? []}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: <EmptyBlock title="Chưa nhận tiền mặt lần nào" hint="Khi người đi thu nộp tiền mặt, bấm Nhận tiền mặt ở bảng trên." /> }}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Ngày', dataIndex: 'handoverDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Người đi thu', dataIndex: 'collectorName' },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Ghi chú', dataIndex: 'note', render: (v: string | null) => v ?? '—' },
        ]}
      />
      <CashReceiveForm
        collector={receiving}
        submitting={receive.isPending}
        error={errorText(receive.error)}
        onCancel={() => {
          setReceiving(null);
          receive.reset();
        }}
        onSubmit={(req) => receive.mutate(req)}
      />
    </>
  );
}
