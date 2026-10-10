import { CheckOutlined, MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, ConfigProvider, Segmented, Space, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { api } from '../../../api/client';
import { brand, semantic } from '../../../app/theme';
import { useAuth } from '../../../app/auth/authContext';
import { errorText as apiErrorText } from '../../../shared/errorText';
import { formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { PageHeader } from '../../../shared/PageHeader';
import { ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, type Receipt, useCompanyLedger } from '../api';
import { IssueReceiptForm, type IssueReceiptRequest } from '../ReceiptsPage/IssueReceiptForm';
import { ReceiptPrint } from '../ReceiptsPage/ReceiptPrint';
import { LockPeriodButton } from './LockPeriodButton';
import { VouchersModal } from './VouchersModal';

/** Viền đậm hơn viền mặc định để bảng nhiều cột dễ đọc. */
const BORDER = '#5b6878';

type Filter = 'all' | 'open' | 'settled';

const errorText = (e: unknown) => (e ? apiErrorText(e) : null);

const sum = (rows: LedgerRow[], pick: (r: LedgerRow) => number) => rows.reduce((t, r) => t + pick(r), 0);

/** Nền tiêu đề từng nhóm cột: đậm hơn nền ô để nhóm nổi bật. */
const HEAD = { cash: '#f8c77e', commune: '#9fdbb7' };

/** Kết quả của một công ty theo số còn lại: công ty còn phải nộp xã, hoặc đã khớp. */
function Result({ row }: { row: LedgerRow }) {
  if (row.remaining > 0) return <strong style={{ color: semantic.warning.fg }}>Cty nộp Xã {formatMoney(row.remaining)}</strong>;
  return (
    <StatusTag tone="success">
      <CheckOutlined /> Khớp
    </StatusTag>
  );
}

const centerHead = (bg?: string) => () => ({ style: { background: bg, textAlign: 'center' as const } });

const group = (bg: string, children: ColumnsType<LedgerRow>, title: ReactNode) => ({
  title,
  onHeaderCell: () => ({ style: { background: bg, textAlign: 'center' as const, position: 'relative' as const } }),
  children: children.map((c) => ({ ...c, align: 'right' as const, onHeaderCell: centerHead(bg) })),
});

/** Phí xử lý và vận chuyển trên toàn bộ số đã thu (tiền mặt và chuyển khoản đều vào công ty); thu gom là phần công ty giữ. */
const processing = (r: LedgerRow) => r.qrProcessing + r.cashProcessing;
const transport = (r: LedgerRow) => r.collected - r.adjustment - r.retained - processing(r);

const money = (pick: (r: LedgerRow) => number, strong = false) => (_: unknown, r: LedgerRow) => <MoneyText value={pick(r)} strong={strong} />;

/** Tiêu đề nhóm cột kèm nút nhỏ ở góc dưới phải: thu gọn về cột Tổng / mở ra Tổng, Vận chuyển, Thu gom, Xử lý. */
function GroupTitle({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  const action = `${open ? 'Thu gọn' : 'Xem chi tiết'} ${label}`;
  return (
    <>
      {label}
      <Tooltip title={action}>
        <Button
          type="text"
          size="small"
          icon={open ? <MinusSquareOutlined /> : <PlusSquareOutlined />}
          onClick={onToggle}
          aria-expanded={open}
          aria-label={action}
          style={{ position: 'absolute', right: 2, bottom: 2, width: 20, height: 20, minWidth: 20 }}
        />
      </Tooltip>
    </>
  );
}

/**
 * Đối soát xã – công ty (UC-38): hộ đóng tiền mặt hoặc chuyển khoản, đều vào công ty (bỏ QR của xã 08/10); công ty giữ phần
 * thu gom, nộp xã phần vận chuyển và phí xử lý. Một kỳ có thể có nhiều phiếu thu (bấm Lập phiếu nhiều lần); dòng Khớp khi
 * công ty hết phải nộp. Số liệu do máy chủ tính; trang chỉ cộng tổng kỳ.
 */
export function ReconciliationPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Lãnh đạo xem màn này chỉ đọc: không khóa kỳ, không lập phiếu (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const [periodId, setPeriodId] = useState<number>();
  const [filter, setFilter] = useState<Filter>('all');
  // Nhóm công ty đã thu mặc định chỉ hiện cột Tổng cho bảng gọn; bấm Chi tiết để tách Vận chuyển, Thu gom, Xử lý.
  const [cashOpen, setCashOpen] = useState(false);
  const [issuingReceipt, setIssuingReceipt] = useState<LedgerRow | null>(null);
  const [viewing, setViewing] = useState<LedgerRow | null>(null);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
  const ledger = useCompanyLedger(periodId);
  const period = usePeriods().data?.find((p) => p.id === periodId);
  const locked = period?.status === 'LOCKED';
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
  const payable = sum(rows, (r) => r.payable);
  const received = sum(rows, (r) => r.received);
  const diff = payable - received;
  const counts = { all: rows.length, open: rows.filter((r) => !r.settled).length, settled: rows.filter((r) => r.settled).length };
  const shown = rows.filter((r) => filter === 'all' || (filter === 'settled') === r.settled);

  const voucherCell = (r: LedgerRow) => {
    if (!r.settled) {
      if (readOnly || locked) return <Typography.Text type="secondary" style={{ fontSize: 12 }}>Chưa lập phiếu</Typography.Text>;
      return (
        <Button type="primary" size="small" onClick={() => setIssuingReceipt(r)} aria-label={`Lập phiếu thu ${r.companyCode}`}>
          Lập phiếu thu
        </Button>
      );
    }
    return r.receiptCount > 0 ? (
      <Button size="small" onClick={() => setViewing(r)} aria-label={`Xem phiếu ${r.companyCode}`}>
        Xem phiếu
      </Button>
    ) : (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Không cần phiếu</Typography.Text>
    );
  };

  const columns: ColumnsType<LedgerRow> = [
    { title: 'Công ty', dataIndex: 'companyName', fixed: 'left', width: 200, render: (v: string) => <strong style={{ fontWeight: 600 }}>{v}</strong> },
    group(
      HEAD.cash,
      [
        { title: 'Tổng', key: 'collected', width: 130, render: money((r) => r.collected, !cashOpen) },
        ...(cashOpen
          ? [
              { title: 'Thu gom', key: 'collection', width: 130, render: money((r) => r.retained) },
              { title: 'Vận chuyển', key: 'transport', width: 140, render: money(transport, true) },
              { title: 'Xử lý', key: 'processing', width: 120, render: money(processing, true) },
            ]
          : []),
      ],
      <GroupTitle label="Cty đã thu" open={cashOpen} onToggle={() => setCashOpen((v) => !v)} />,
    ),
    group(
      HEAD.commune,
      [
        { title: 'Phải nộp xã', key: 'payable', width: 150, render: money((r) => r.payable, true) },
        { title: 'Đã nộp', key: 'received', width: 150, render: money((r) => r.received) },
      ],
      'Cty nộp xã',
    ),
    { title: 'Kết quả', key: 'result', width: 170, align: 'center', onHeaderCell: centerHead(), render: (_, r) => <Result row={r} /> },
    { title: 'Phiếu', key: 'voucher', width: 120, align: 'center', onHeaderCell: centerHead(), render: (_, r) => voucherCell(r) },
  ];

  return (
    <ConfigProvider theme={{ token: { borderRadius: 0, borderRadiusLG: 0, borderRadiusSM: 0 }, components: { Table: { borderColor: BORDER } } }}>
      <PageHeader
        title={period ? `Đối soát ${period.label.toLowerCase()}` : 'Đối soát'}
        description={`${rows.length} công ty thu gom · Công ty phải nộp trước phần vận chuyển và xử lý theo khoản đã phát hành, dù chưa thu từ hộ.`}
        extra={
          <Space wrap>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
            {periodId !== undefined && !readOnly && <LockPeriodButton periodId={periodId} />}
          </Space>
        }
      />
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}

      <section aria-label="Tiền công ty nộp xã trong kỳ">
        <h2 style={{ margin: '0 0 12px', padding: '10px 16px', background: brand.chrome, color: '#fff', fontSize: 18, fontWeight: 700 }}>Tiền công ty nộp xã trong kỳ</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 12 }}>
          <Tile label="Cty phải nộp xã · vận chuyển + xử lý" value={payable}>
            <Line label="Vận chuyển" value={sum(rows, (row) => row.payableTransport ?? 0)} />
            <Line label="+ Xử lý" value={sum(rows, (row) => row.payableProcessing ?? 0)} />
          </Tile>
          <Operator>−</Operator>
          <Tile label="Đã nộp về xã" value={received}>
            <Line label="Theo phiếu thu đã lập" value={received} />
          </Tile>
          <Operator>=</Operator>
          <Tile label={diff > 0 ? 'Cty còn phải nộp' : 'Đã nộp đủ'} value={Math.max(diff, 0)}>
            <span style={{ fontSize: 13 }}>
              {diff > 0 ? 'Công ty phải nộp trước, không chờ thu đủ tiền từ hộ.' : 'Các công ty đã nộp đủ phần vận chuyển, xử lý.'}
            </span>
          </Tile>
        </div>
      </section>

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
          className="table-square"
          bordered
          rowKey="companyId"
          loading={ledger.isLoading}
          dataSource={shown}
          pagination={false}
          locale={{ emptyText: 'Kỳ này chưa có khoản phải thu' }}
          tableLayout="fixed"
          scroll={{ x: 'max-content' }}
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
      <VouchersModal row={viewing} onClose={() => setViewing(null)} />
      <ReceiptPrint receipt={printReceipt} onClose={() => setPrintReceipt(null)} />
    </ConfigProvider>
  );
}

/** Ô số lớn của phép tính: vạch màu trên đầu, nhãn, số, rồi các dòng diễn giải. */
function Tile({ label, value, children }: { label: string; value: number; children: ReactNode }) {
  return (
    <div
      style={{
        flex: '1 1 280px',
        minWidth: 0,
        padding: '16px 20px 18px',
        background: '#fff',
        border: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.02em', color: semantic.neutral.fg }}>{label}</span>
      <strong style={{ fontSize: 32, lineHeight: 1.2 }}>
        <MoneyText value={value} />
      </strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, paddingTop: 10, borderTop: `1px dashed ${BORDER}`, fontSize: 13 }}>{children}</div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: semantic.neutral.fg }}>
      <span>{label}</span>
      <MoneyText value={value} />
    </div>
  );
}

function Operator({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 32px', fontSize: 31, fontWeight: 700, color: '#000' }}>
      {children}
    </div>
  );
}
