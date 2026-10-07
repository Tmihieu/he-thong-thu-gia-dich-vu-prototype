import { CheckOutlined, ExclamationCircleOutlined, MinusSquareOutlined, PlusSquareOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, ConfigProvider, Segmented, Space, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';

import { api } from '../../../api/client';
import { brand, semantic } from '../../../app/theme';
import { useAuth } from '../../../app/auth/authContext';
import { errorText as apiErrorText } from '../../../shared/errorText';
import { formatDate, formatMoney } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { PageHeader } from '../../../shared/PageHeader';
import { ErrorBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type LedgerRow, type Settlement, useCompanyLedger, useSettlements } from '../api';
import { type IssueSettlementRequest, SettlementForm } from '../SettlementsPage/SettlementForm';
import { SettlementPrint } from '../SettlementsPage/SettlementPrint';
import { LockPeriodButton } from './LockPeriodButton';

/** Viền đậm hơn viền mặc định để bảng nhiều cột dễ đọc. */
const BORDER = '#5b6878';

type Filter = 'all' | 'open' | 'settled';

const errorText = (e: unknown) => (e ? apiErrorText(e) : null);

const sum = (rows: LedgerRow[], pick: (r: LedgerRow) => number) => rows.reduce((t, r) => t + pick(r), 0);

/** Nền tiêu đề từng nhóm cột: đậm hơn nền ô để nhóm nổi bật. */
const HEAD = { qr: '#a9c9f5', cash: '#f8c77e', match: '#9fdbb7' };

/** Số xã phải trả công ty hiện là số âm, công ty nộp xã là số dương. */
const signed = (v: number) => (v < 0 ? `−${formatMoney(-v)}` : formatMoney(v));

/** Kết quả bù trừ của một công ty: chưa quyết toán thì công ty còn nộp xã / xã còn trả công ty (số âm), hoặc đã quyết toán. */
function Result({ row }: { row: LedgerRow }) {
  const overdue = row.progress === 'OVERDUE' && <StatusTag tone="danger">Quá hạn quyết toán</StatusTag>;
  if (row.remaining > 0)
    return (
      <>
        <strong style={{ color: semantic.warning.fg }}>Cty nộp Xã {formatMoney(row.remaining)}</strong>
        {overdue}
      </>
    );
  if (row.communeOwed > 0)
    return (
      <>
        <strong style={{ color: semantic.info.fg }}>{signed(-row.communeOwed)}</strong>
        {overdue}
      </>
    );
  const net = row.payable;
  return (
    <>
      {overdue ||
        (row.settled ? (
          <StatusTag tone="success">
            <CheckOutlined /> Đã quyết toán
          </StatusTag>
        ) : (
          <StatusTag tone="neutral">Chưa quyết toán</StatusTag>
        ))}
      <div>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {net > 0 ? `Cty nộp Xã ${formatMoney(net)}` : net < 0 ? signed(net) : 'Hai bên bằng nhau'}
        </Typography.Text>
      </div>
    </>
  );
}

const centerHead = (bg?: string) => () => ({ style: { background: bg, textAlign: 'center' as const } });

const group = (bg: string, children: ColumnsType<LedgerRow>, title: ReactNode) => ({
  title,
  onHeaderCell: () => ({ style: { background: bg, textAlign: 'center' as const, position: 'relative' as const } }),
  children: children.map((c) => ({ ...c, align: 'right' as const, onHeaderCell: centerHead(bg) })),
});

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
 * Đối soát xã – công ty (UC-38, quyet-toan-0710): tách tiền xã nhận qua QR và tiền công ty thu mặt thành vận chuyển / thu gom;
 * công ty nộp xã phần vận chuyển tiền mặt, xã trả công ty phần thu gom QR, chỉ bù trừ chênh lệch. Mỗi công ty mỗi kỳ lập một
 * phiếu quyết toán, chỉ sau hạn dân đóng. Số liệu do máy chủ tính; trang chỉ cộng tổng kỳ. Khóa kỳ chặn khi còn công ty chưa
 * quyết toán hoặc giao dịch QR chưa xác định công ty.
 */
export function ReconciliationPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  // Lãnh đạo xem màn này chỉ đọc: không khóa kỳ, không lập phiếu (SPEC §9.10).
  const readOnly = useAuth().user?.role === 'LEADER';
  const [periodId, setPeriodId] = useState<number>();
  const [filter, setFilter] = useState<Filter>('all');
  // Hai nhóm QR / tiền mặt mặc định chỉ hiện cột Tổng cho bảng gọn; bấm Chi tiết để tách 4 cột.
  const [qrOpen, setQrOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);
  const [issuing, setIssuing] = useState<LedgerRow | null>(null);
  const [printing, setPrinting] = useState<Settlement | null>(null);
  const ledger = useCompanyLedger(periodId);
  const settlements = useSettlements(periodId);
  const period = usePeriods().data?.find((p) => p.id === periodId);
  const locked = period?.status === 'LOCKED';
  // Chỉ lập phiếu quyết toán sau hạn dân đóng (máy chủ chặn SETTLEMENT_TOO_EARLY).
  const tooEarly = !!period && !dayjs().isAfter(period.dueDate, 'day');
  const unidentified = useQuery({
    queryKey: ['remittance', 'unidentified-qr'],
    queryFn: () => api.get<{ count: number; amount: number }>('/api/remittance/unidentified-qr'),
  });
  const rows = ledger.data ?? [];

  const issue = useMutation({
    mutationFn: (req: IssueSettlementRequest) => api.post<Settlement>('/api/remittance/settlements', req),
    onSuccess: (s) => {
      message.success(`Đã lập phiếu ${s.code} cho ${s.companyCode}`);
      void queryClient.invalidateQueries({ queryKey: ['remittance'] });
      setIssuing(null);
      setPrinting(s);
    },
  });

  const holding = sum(rows, (r) => r.holding);
  const entitled = sum(rows, (r) => r.entitled);
  const diff = holding - entitled;
  const qrTotal = sum(rows, (r) => r.qrTotal);
  const counts = { all: rows.length, open: rows.filter((r) => !r.settled).length, settled: rows.filter((r) => r.settled).length };
  const shown = rows.filter((r) => filter === 'all' || (filter === 'settled') === r.settled);
  const qr = unidentified.data;

  const voucherCell = (r: LedgerRow) => {
    const settlement = settlements.data?.find((s) => s.id === r.settlementId);
    if (settlement)
      return (
        <Button size="small" onClick={() => setPrinting(settlement)} aria-label={`Xem phiếu ${r.companyCode}`}>
          Xem phiếu {settlement.code}
        </Button>
      );
    if (!r.settled) {
      if (readOnly || locked) return <Typography.Text type="secondary" style={{ fontSize: 12 }}>Chưa quyết toán</Typography.Text>;
      return (
        <Tooltip title={tooEarly ? `Chỉ lập sau hạn dân đóng ${formatDate(period!.dueDate)}` : undefined}>
          <Button type="primary" size="small" disabled={tooEarly} onClick={() => setIssuing(r)} aria-label={`Lập phiếu quyết toán ${r.companyCode}`}>
            Lập phiếu quyết toán
          </Button>
        </Tooltip>
      );
    }
    return (
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>Không cần phiếu</Typography.Text>
    );
  };

  const columns: ColumnsType<LedgerRow> = [
    { title: 'Công ty', dataIndex: 'companyName', fixed: 'left', width: 200, render: (v: string) => <strong style={{ fontWeight: 600 }}>{v}</strong> },
    group(
      HEAD.qr,
      [
        { title: 'Tổng', key: 'qrTotal', width: 130, render: money((r) => r.qrTotal, !qrOpen) },
        ...(qrOpen
          ? [
              { title: 'Vận chuyển', key: 'qrTransport', width: 130, render: money((r) => r.qrTransport) },
              { title: 'Thu gom', key: 'qrCollection', width: 140, render: money((r) => r.qrCollection, true) },
              { title: 'Xử lý', key: 'qrProcessing', width: 120, render: money((r) => r.qrProcessing) },
            ]
          : []),
      ],
      <GroupTitle label="Xã nhận qua QR" open={qrOpen} onToggle={() => setQrOpen((v) => !v)} />,
    ),
    group(
      HEAD.cash,
      [
        { title: 'Tổng', key: 'cashTotal', width: 130, render: money((r) => r.cashCollected, !cashOpen) },
        ...(cashOpen
          ? [
              { title: 'Vận chuyển', key: 'cashTransport', width: 140, render: money((r) => r.cashTransport, true) },
              { title: 'Thu gom', key: 'cashCollection', width: 130, render: money((r) => r.cashCollection) },
              { title: 'Xử lý', key: 'cashProcessing', width: 120, render: money((r) => r.cashProcessing, true) },
            ]
          : []),
      ],
      <GroupTitle label="Cty thu tiền mặt" open={cashOpen} onToggle={() => setCashOpen((v) => !v)} />,
    ),
    { title: 'Kết quả', key: 'result', width: 170, align: 'center', onHeaderCell: centerHead(), render: (_, r) => <Result row={r} /> },
    group(
      HEAD.match,
      [
        { title: 'Xã đang giữ', key: 'holding', width: 150, render: money((r) => r.holding, true) },
        { title: 'Xã được hưởng', key: 'entitled', width: 150, render: money((r) => r.entitled) },
      ],
      'Đối chiếu tiền xã',
    ),
    { title: 'Phiếu quyết toán', key: 'voucher', width: 170, align: 'center', onHeaderCell: centerHead(), render: (_, r) => voucherCell(r) },
  ];

  return (
    <ConfigProvider theme={{ token: { borderRadius: 0, borderRadiusLG: 0, borderRadiusSM: 0 }, components: { Table: { borderColor: BORDER } } }}>
      <PageHeader
        title={period ? `Đối soát ${period.label.toLowerCase()}` : 'Đối soát'}
        description={
          period
            ? `${rows.length} công ty thu gom · Hạn dân đóng ${formatDate(period.dueDate)} · Hạn quyết toán ${formatDate(period.settlementDueDate)}`
            : `${rows.length} công ty thu gom`
        }
        extra={
          <Space wrap>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
            {periodId !== undefined && !readOnly && <LockPeriodButton periodId={periodId} />}
          </Space>
        }
      />
      {ledger.error && <ErrorBlock error={ledger.error} onRetry={() => void ledger.refetch()} />}

      <section aria-label="Tiền xã đang giữ trong kỳ">
        <h2 style={{ margin: '0 0 12px', padding: '10px 16px', background: brand.chrome, color: '#fff', fontSize: 18, fontWeight: 700 }}>Tiền xã đang giữ trong kỳ</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'stretch', gap: 12 }}>
          <Tile label="Xã đang giữ" value={holding}>
            <Line label="QR đã nhận" value={qrTotal} />
            <Line label="+ Đã thu từ Cty" value={sum(rows, (r) => r.received)} />
            <Line label="− Đã chi cho Cty" value={sum(rows, (r) => r.communePaid)} />
          </Tile>
          <Operator>−</Operator>
          <Tile label="Xã được hưởng · vận chuyển + xử lý" value={entitled}>
            <Line label="Vận chuyển trong QR" value={sum(rows, (r) => r.qrTransport)} />
            <Line label="+ Vận chuyển trong tiền mặt" value={sum(rows, (r) => r.cashTransport)} />
            <Line label="+ Xử lý trong QR" value={sum(rows, (r) => r.qrProcessing)} />
            <Line label="+ Xử lý trong tiền mặt" value={sum(rows, (r) => r.cashProcessing)} />
          </Tile>
          <Operator>=</Operator>
          <Tile label={diff > 0 ? 'Xã đang THỪA' : diff < 0 ? 'Xã đang THIẾU' : 'Đã cân'} value={Math.abs(diff)}>
            <span style={{ fontSize: 13 }}>
              {diff > 0
                ? 'Đây là tiền thu gom của Cty mà xã đang giữ hộ, phải chi trả.'
                : diff < 0
                  ? 'Cty còn giữ tiền vận chuyển, xử lý của xã, phải thu về.'
                  : 'Xã giữ đúng bằng phần vận chuyển, xử lý được hưởng.'}
            </span>
          </Tile>
        </div>
      </section>

      {qr && qr.count > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginTop: 16 }}
          message={
            <strong>
              Sao kê QR <MoneyText value={qrTotal + qr.amount} /> = QR của {rows.length} Cty <MoneyText value={qrTotal} /> +{' '}
              {qr.count} giao dịch chưa xác định Cty (<MoneyText value={qr.amount} />). Cần xử lý trước khi khóa kỳ.
            </strong>
          }
          action={
            readOnly ? undefined : (
              <Link to="/commune/transfers" style={{ fontWeight: 700 }}>
                Xử lý →
              </Link>
            )
          }
        />
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ paddingBottom: 12 }}>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Tất cả ${counts.all}` },
              { value: 'open', label: `Chưa quyết toán ${counts.open}` },
              { value: 'settled', label: `Đã quyết toán ${counts.settled}` },
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

      <SettlementForm
        row={issuing}
        periodLabel={period?.label}
        submitting={issue.isPending}
        error={errorText(issue.error)}
        onCancel={() => {
          setIssuing(null);
          issue.reset();
        }}
        onSubmit={(req) => issue.mutate(req)}
      />
      <SettlementPrint settlement={printing} onClose={() => setPrinting(null)} />
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
