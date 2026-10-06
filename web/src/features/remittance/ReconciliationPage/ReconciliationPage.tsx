import { CheckOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, ConfigProvider, Segmented, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';

import { api } from '../../../api/client';
import { semantic } from '../../../app/theme';
import { useAuth } from '../../../app/auth/authContext';
import { errorText as apiErrorText } from '../../../shared/errorText';
import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { PageHeader } from '../../../shared/PageHeader';
import { ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, type Payout, type Receipt, useCompanyLedger } from '../api';
import { IssuePayoutForm, type IssuePayoutRequest } from '../PayoutsPage/IssuePayoutForm';
import { PayoutPrint } from '../PayoutsPage/PayoutPrint';
import { IssueReceiptForm, type IssueReceiptRequest } from '../ReceiptsPage/IssueReceiptForm';
import { ReceiptPrint } from '../ReceiptsPage/ReceiptPrint';
import { LockPeriodButton } from './LockPeriodButton';
import { VouchersModal } from './VouchersModal';

/** Viền đậm hơn viền mặc định để bảng nhiều cột dễ đọc. */
const BORDER = '#5b6878';

type Filter = 'all' | 'open' | 'settled';

const errorText = (e: unknown) => (e ? apiErrorText(e) : null);

const sum = (rows: LedgerRow[], pick: (r: LedgerRow) => number) => rows.reduce((t, r) => t + pick(r), 0);

/** Nhãn "Đủ / Thừa / Thiếu" của xã so với phần vận chuyển được hưởng: thừa là tiền thu gom của công ty xã giữ hộ. */
function Surplus({ diff }: { diff: number }) {
  if (diff === 0) return <span style={{ color: semantic.success.fg }}>✓ Đủ</span>;
  return diff > 0 ? <span style={{ color: semantic.info.fg }}>Thừa {formatDiff(diff)}</span> : <span style={{ color: semantic.warning.fg }}>Thiếu {formatDiff(-diff)}</span>;
}

const formatDiff = formatMoney;

/** Kết quả bù trừ của một công ty theo số còn lại: công ty còn nộp xã, xã còn trả công ty, hoặc đã khớp. */
function Result({ row }: { row: LedgerRow }) {
  if (row.remaining > 0) return <strong style={{ color: semantic.warning.fg }}>Cty nộp Xã {formatDiff(row.remaining)}</strong>;
  if (row.communeOwed > 0) return <strong style={{ color: semantic.info.fg }}>Xã trả Cty {formatDiff(row.communeOwed)}</strong>;
  const net = row.payable;
  return (
    <>
      <StatusTag tone="success">
        <CheckOutlined /> Khớp
      </StatusTag>
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {net > 0 ? `Cty nộp Xã ${formatDiff(net)}` : net < 0 ? `Xã trả Cty ${formatDiff(-net)}` : 'Hai bên bằng nhau'}
        </Typography.Text>
      </div>
    </>
  );
}

const group = (bg: string, children: ColumnsType<LedgerRow>, title: ReactNode) => ({
  title,
  onHeaderCell: () => ({ style: { background: bg, textAlign: 'center' as const } }),
  children: children.map((c) => ({ ...c, align: 'right' as const, onHeaderCell: () => ({ style: { background: bg } }) })),
});

const money = (pick: (r: LedgerRow) => number, strong = false) => (_: unknown, r: LedgerRow) => <MoneyText value={pick(r)} strong={strong} />;

/**
 * Đối soát xã – công ty (UC-38, mockup 07/10): tách tiền xã nhận qua QR và tiền công ty thu mặt thành vận chuyển / thu gom;
 * công ty nộp xã phần vận chuyển tiền mặt, xã trả công ty phần thu gom QR, chỉ bù trừ chênh lệch. Một kỳ có thể có nhiều phiếu
 * thu và nhiều phiếu chi (bấm Lập phiếu nhiều lần); dòng Khớp khi công ty hết phải nộp và xã hết phải trả. Số liệu do máy chủ
 * tính; trang chỉ cộng tổng kỳ. Khóa kỳ chặn khi còn giao dịch QR chưa xác định công ty.
 */
export function ReconciliationPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Lãnh đạo xem màn này chỉ đọc: không khóa kỳ, không lập phiếu (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const [periodId, setPeriodId] = useState<number>();
  const [filter, setFilter] = useState<Filter>('all');
  const [issuingReceipt, setIssuingReceipt] = useState<LedgerRow | null>(null);
  const [issuingPayout, setIssuingPayout] = useState<LedgerRow | null>(null);
  const [viewing, setViewing] = useState<LedgerRow | null>(null);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
  const [printPayout, setPrintPayout] = useState<Payout | null>(null);
  const ledger = useCompanyLedger(periodId);
  const period = usePeriods().data?.find((p) => p.id === periodId);
  const locked = period?.status === 'LOCKED';
  const unidentified = useQuery({
    queryKey: ['remittance', 'unidentified-qr'],
    queryFn: () => api.get<{ count: number; amount: number }>('/api/remittance/unidentified-qr'),
  });
  const rows = ledger.data ?? [];

  const issueReceipt = useMutation({
    mutationFn: (req: IssueReceiptRequest) => api.post<Receipt>('/api/remittance/receipts', req),
    onSuccess: (r) => {
      message.success(`Đã lập phiếu ${r.code} cho ${r.companyCode}`);
      void queryClient.invalidateQueries({ queryKey: ['remittance'] });
      setIssuingReceipt(null);
      setPrintReceipt(r);
    },
  });
  const issuePayout = useMutation({
    mutationFn: (req: IssuePayoutRequest) => api.post<Payout>('/api/remittance/payouts', req),
    onSuccess: (p) => {
      message.success(`Đã lập phiếu ${p.code} cho ${p.companyCode}`);
      void queryClient.invalidateQueries({ queryKey: ['remittance'] });
      setIssuingPayout(null);
      setPrintPayout(p);
    },
  });

  const holding = sum(rows, (r) => r.holding);
  const entitled = sum(rows, (r) => r.entitled);
  const diff = holding - entitled;
  const qrTotal = sum(rows, (r) => r.qrTotal);
  const counts = { all: rows.length, open: rows.filter((r) => !r.settled).length, settled: rows.filter((r) => r.settled).length };
  const shown = rows.filter((r) => filter === 'all' || (filter === 'settled') === r.settled);
  const diffTone = diff > 0 ? semantic.info : diff < 0 ? semantic.warning : semantic.success;
  const qr = unidentified.data;

  const voucherCell = (r: LedgerRow) => {
    if (!r.settled) {
      if (readOnly || locked) return <Typography.Text type="secondary">Chưa lập phiếu</Typography.Text>;
      return r.remaining > 0 ? (
        <Button type="primary" onClick={() => setIssuingReceipt(r)} aria-label={`Lập phiếu thu ${r.companyCode}`}>
          Lập phiếu thu
        </Button>
      ) : (
        <Button type="primary" onClick={() => setIssuingPayout(r)} aria-label={`Lập phiếu chi ${r.companyCode}`}>
          Lập phiếu chi
        </Button>
      );
    }
    return r.receiptCount > 0 || r.communePaid > 0 ? (
      <Button onClick={() => setViewing(r)} aria-label={`Xem phiếu ${r.companyCode}`}>
        Xem phiếu
      </Button>
    ) : (
      <Typography.Text type="secondary">Không cần phiếu</Typography.Text>
    );
  };

  const columns: ColumnsType<LedgerRow> = [
    { title: 'Công ty', dataIndex: 'companyName', fixed: 'left', width: 200, render: (v: string) => <strong style={{ fontWeight: 600 }}>{v}</strong> },
    group(
      semantic.info.bg,
      [
        { title: 'Tổng', key: 'qrTotal', width: 130, render: money((r) => r.qrTotal) },
        { title: 'Vận chuyển', key: 'qrTransport', width: 130, render: money((r) => r.qrTransport) },
        { title: 'Thu gom', key: 'qrCollection', width: 140, render: money((r) => r.qrCollection, true) },
      ],
      'Xã nhận qua QR',
    ),
    group(
      semantic.warning.bg,
      [
        { title: 'Tổng', key: 'cashTotal', width: 130, render: money((r) => r.cashCollected) },
        { title: 'Vận chuyển', key: 'cashTransport', width: 140, render: money((r) => r.cashTransport, true) },
        { title: 'Thu gom', key: 'cashCollection', width: 130, render: money((r) => r.cashCollection) },
      ],
      'Cty thu tiền mặt',
    ),
    { title: 'Kết quả', key: 'result', width: 170, render: (_, r) => <Result row={r} /> },
    group(
      semantic.success.bg,
      [
        {
          title: 'Xã đang giữ',
          key: 'holding',
          width: 160,
          render: (_, r) => (
            <>
              <MoneyText value={r.holding} strong />
              <div style={{ fontSize: 12, fontWeight: 600 }}>
                <Surplus diff={r.holding - r.entitled} />
              </div>
            </>
          ),
        },
        { title: 'Xã được hưởng', key: 'entitled', width: 150, render: money((r) => r.entitled) },
      ],
      'Đối chiếu tiền xã',
    ),
    { title: 'Phiếu', key: 'voucher', width: 170, render: (_, r) => voucherCell(r) },
  ];

  return (
    <ConfigProvider theme={{ token: { borderRadius: 0, borderRadiusLG: 0, borderRadiusSM: 0 }, components: { Table: { borderColor: BORDER } } }}>
      <PageHeader
        title={period ? `Đối soát ${period.label.toLowerCase()}` : 'Đối soát'}
        description={`${rows.length} công ty thu gom · Lập phiếu thu/chi đủ số còn lại thì công ty đó chuyển sang Khớp`}
        extra={
          <Space wrap>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
            {periodId !== undefined && !readOnly && <LockPeriodButton periodId={periodId} />}
          </Space>
        }
      />
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}

      <Card style={{ borderColor: BORDER }} styles={{ header: { borderBottomColor: BORDER }, body: { padding: 0 } }} title="Tiền xã đang giữ trong kỳ" extra={<Typography.Text type="secondary">So với phần phí vận chuyển xã được hưởng</Typography.Text>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <Cell label="Xã đang giữ" value={holding}>
            QR đã nhận <MoneyText value={qrTotal} />
            <br />+ đã thu từ Cty <MoneyText value={sum(rows, (r) => r.received)} />
            <br />− đã chi cho Cty <MoneyText value={sum(rows, (r) => r.communePaid)} />
          </Cell>
          <Operator>−</Operator>
          <Cell label="Xã được hưởng · phí vận chuyển" value={entitled}>
            vận chuyển trong QR <MoneyText value={sum(rows, (r) => r.qrTransport)} />
            <br />+ vận chuyển trong tiền mặt <MoneyText value={sum(rows, (r) => r.cashTransport)} />
          </Cell>
          <Operator>=</Operator>
          <div style={{ flex: '1 1 300px', padding: 20, background: diffTone.bg, color: diffTone.fg, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong>{diff > 0 ? 'Xã đang THỪA' : diff < 0 ? 'Xã đang THIẾU' : 'Đã cân'}</strong>
            <strong style={{ fontSize: 30 }}>
              <MoneyText value={Math.abs(diff)} />
            </strong>
            <span style={{ fontSize: 13 }}>
              {diff > 0
                ? 'Đây là tiền thu gom của Cty mà xã đang giữ hộ, phải chi trả.'
                : diff < 0
                  ? 'Cty còn giữ tiền vận chuyển của xã, phải thu về.'
                  : 'Xã giữ đúng bằng phần vận chuyển được hưởng.'}
            </span>
          </div>
        </div>
      </Card>

      {qr && qr.count > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginTop: 16 }}
          message={
            <>
              Sao kê QR <MoneyText value={qrTotal + qr.amount} /> = QR của {rows.length} Cty <MoneyText value={qrTotal} /> +{' '}
              <strong>
                {qr.count} giao dịch chưa xác định Cty (<MoneyText value={qr.amount} />)
              </strong>
              . Cần xử lý trước khi khóa kỳ.
            </>
          }
          action={readOnly ? undefined : <Link to="/transfers">Xử lý →</Link>}
        />
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ paddingBottom: 12 }}>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Tất cả ${counts.all}` },
              { value: 'open', label: `Chưa khớp ${counts.open}` },
              { value: 'settled', label: `Đã khớp ${counts.settled}` },
            ]}
          />
        </div>
        <Table<LedgerRow>
          bordered
          rowKey="companyId"
          loading={ledger.isLoading}
          dataSource={shown}
          pagination={false}
          locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
          tableLayout="fixed"
          scroll={{ x: 1650 }}
          columns={columns}
        />
      </div>

      <IssueReceiptForm
        row={issuingReceipt}
        periodLabel={period?.label}
        submitting={issueReceipt.isPending}
        error={errorText(issueReceipt.error)}
        onCancel={() => {
          setIssuingReceipt(null);
          issueReceipt.reset();
        }}
        onSubmit={(req) => issueReceipt.mutate(req)}
      />
      <IssuePayoutForm
        row={issuingPayout}
        periodLabel={period?.label}
        submitting={issuePayout.isPending}
        error={errorText(issuePayout.error)}
        onCancel={() => {
          setIssuingPayout(null);
          issuePayout.reset();
        }}
        onSubmit={(req) => issuePayout.mutate(req)}
      />
      <VouchersModal row={viewing} onClose={() => setViewing(null)} />
      <ReceiptPrint receipt={printReceipt} onClose={() => setPrintReceipt(null)} />
      <PayoutPrint payout={printPayout} onClose={() => setPrintPayout(null)} />
    </ConfigProvider>
  );
}

function Cell({ label, value, children }: { label: string; value: number; children: ReactNode }) {
  return (
    <div style={{ flex: '1 1 260px', padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <strong style={{ fontSize: 30 }}>
        <MoneyText value={value} />
      </strong>
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {children}
      </Typography.Text>
    </div>
  );
}

function Operator({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, flex: '0 0 48px', fontSize: 28, color: semantic.neutral.fg }}>{children}</div>;
}
