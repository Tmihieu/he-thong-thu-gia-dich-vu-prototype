import {
  BankOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleFilled,
  FilterOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, DatePicker, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';

import { useAuth } from '../../../app/auth/authContext';
import { formatDate } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../../shared/StateBlock';
import { StatusTag } from '../../../shared/StatusTag';
import { normalizeText } from '../../../shared/normalizeText';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type CollectorCharge, useCashHeld, useMyWork, useMyWorkAllPeriods } from '../api';
import { byChipOrder, countChips, matchesChip, WORK_CHIPS, type WorkChip, workState } from '../workState';
import '../collector.css';
import { HouseholdHistory } from './HouseholdHistory';
import { ReportSubjectForm } from './ReportSubjectForm';
import { type Method, ResultSheet } from './ResultSheet';

/** "2026-09" → "09/2026". */
const periodLabel = (code: string) => code.split('-').reverse().join('/');

/** Tên đường lấy từ địa chỉ: đoạn trước dấu phẩy đầu, bỏ số nhà. */
// ponytail: tách bằng chuỗi địa chỉ; khi ChargeDto có trường đường riêng (hồ sơ hộ đã tách) thì dùng trường đó.
function streetOf(address: string) {
  return (address.split(',')[0] ?? '').replace(/^\s*\S*\d\S*\s+/, '').trim() || address;
}

const isBusiness = (w: CollectorCharge) => w.charge.tariffGroup?.startsWith('HH_') === false;

/** Danh sách thu của người đi thu (giao diện điện thoại, theo prototype collector-mobile: thẻ hợp đồng, nút lọc, bottom sheet). */
export function CollectorListPage() {
  const { user } = useAuth();
  const [periodId, setPeriodId] = useState<number>();
  const [chip, setChip] = useState<WorkChip>('ALL');
  const [street, setStreet] = useState<string>();
  const [q, setQ] = useState('');
  const [paidOn, setPaidOn] = useState<Dayjs | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<{ item: CollectorCharge; method: Method } | null>(null);
  const [viewing, setViewing] = useState<CollectorCharge | null>(null);
  const [reporting, setReporting] = useState<CollectorCharge | null>(null);
  const work = useMyWork(periodId);
  const all = useMyWorkAllPeriods();
  const cash = useCashHeld();
  // Khoản Chưa thu của kỳ đã khóa là công nợ của hộ (góp ý BA 05/10): vẫn ghi thu được, tiền tính vào kỳ đang thu.
  const items = useMemo(() => work.data ?? [], [work.data]);

  const streets = useMemo(
    () => [...new Set(items.map((w) => streetOf(w.charge.subjectAddress)))].sort((a, b) => a.localeCompare(b, 'vi')),
    [items],
  );

  // Khoản các kỳ trước của cùng hộ (mới nhất trước) để đánh dấu đã nộp / còn nợ trên thẻ.
  const previousOf = useMemo(() => {
    const m = new Map<number, CollectorCharge[]>();
    (all.data ?? []).forEach((w) => m.set(w.charge.subjectId, [...(m.get(w.charge.subjectId) ?? []), w]));
    return (w: CollectorCharge) =>
      (m.get(w.charge.subjectId) ?? [])
        .filter((x) => x.charge.periodCode < w.charge.periodCode)
        .sort((a, b) => b.charge.periodCode.localeCompare(a.charge.periodCode));
  }, [all.data]);

  const scoped = useMemo(() => {
    const needle = normalizeText(q.trim());
    return items.filter((w) => {
      if (street && streetOf(w.charge.subjectAddress) !== street) return false;
      if (paidOn && !(w.lastPaidAt && dayjs(w.lastPaidAt).isSame(paidOn, 'day'))) return false;
      return (
        !needle ||
        normalizeText(`${w.charge.subjectName} ${w.charge.subjectCode} ${w.charge.subjectAddress} ${w.charge.code} ${w.charge.requestCode}`).includes(needle)
      );
    });
  }, [items, street, q, paidOn]);
  const counts = useMemo(() => countChips(items), [items]);
  const visible = useMemo(() => scoped.filter((w) => matchesChip(w, chip)).sort(byChipOrder), [scoped, chip]);

  const paid = counts.PAID ?? 0;
  const held = cash.data?.[0]?.held ?? 0;
  const period = items[0] ? periodLabel(items[0].charge.periodCode) : '';

  const activeFilters = (street ? 1 : 0) + (paidOn ? 1 : 0);

  return (
    <div className="clm-page">
      <section className="clm-filters">
        <Input.Search
          allowClear
          size="large"
          placeholder="Tìm hộ, mã KH, địa chỉ, mã khoản..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Tìm hộ"
        />
        <div className="clm-held" role="status">
          <WalletOutlined aria-hidden />
          <div>
            <small>Tiền mặt đang giữ</small>
            <strong>
              <MoneyText value={held} />
            </strong>
          </div>
        </div>
        <p className="clm-statline">
          Kỳ {period} · Đã thu <strong>{`${paid}/${items.length} hộ`}</strong> · Chưa thu <strong>{counts.UNPAID ?? 0}</strong>
          {(counts.OVERDUE ?? 0) > 0 && <em>{` (${counts.OVERDUE} quá hạn)`}</em>}
        </p>
        <button type="button" className="clm-stats-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
          <FilterOutlined /> Lọc{activeFilters > 0 ? ` (${activeFilters})` : ''}
        </button>
        <div className="clm-filter-row" hidden={!filtersOpen}>
          <label>
            <span>Kỳ thanh toán</span>
            <PeriodSelect value={periodId} onChange={setPeriodId} />
          </label>
          <label>
            <span>Đường</span>
            <Select
              allowClear
              aria-label="Đường"
              placeholder="Tất cả"
              value={street}
              onChange={setStreet}
              options={streets.map((s) => ({ value: s, label: s }))}
            />
          </label>
          <label>
            <span>Ngày đã thu</span>
            <DatePicker aria-label="Ngày đã thu" placeholder="Tất cả" format="DD/MM/YYYY" value={paidOn} onChange={setPaidOn} style={{ width: '100%' }} />
          </label>
        </div>
      </section>

      <div className="clm-chips" role="group" aria-label="Lọc theo kết quả">
        {WORK_CHIPS.map((c) => (
          <button key={c.value} type="button" className={`clm-chip${chip === c.value ? ' active' : ''}`} aria-pressed={chip === c.value} onClick={() => setChip(c.value)}>
            {c.label} <b>{counts[c.value] ?? 0}</b>
          </button>
        ))}
      </div>

      {work.error && <ErrorBlock error={work.error} onRetry={() => void work.refetch()} />}
      {work.isLoading ? (
        <LoadingBlock rows={6} />
      ) : visible.length === 0 ? (
        <EmptyBlock
          title={items.length === 0 ? 'Chưa có hộ nào của công ty' : 'Không có hộ phù hợp'}
          hint={items.length === 0 ? 'Kỳ này công ty chưa có khoản thu.' : 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm.'}
        />
      ) : (
        <ul className="clm-cards">
          {visible.map((w) => {
            const s = workState(w);
            const unpaid = w.charge.status === 'UNPAID';
            const previous = previousOf(w).filter((x) => x.charge.status === 'UNPAID');
            return (
              <li key={w.charge.id} className="clm-card" aria-label={w.charge.subjectName}>
                <header className="clm-card-head">
                  <strong>Kỳ {periodLabel(w.charge.periodCode)}</strong>
                  <StatusTag tone={s.tone}>{s.label}</StatusTag>
                </header>
                <div className="clm-card-body">
                  <h3 className="clm-name">{w.charge.subjectName}</h3>
                  <p>
                    {w.charge.subjectAddress} ({w.charge.areaCode})
                  </p>
                  <div className="clm-amount">
                    <small>Số tiền phải thu</small>
                    <strong>
                      <MoneyText value={unpaid ? w.remainingAmount : w.charge.amount} />
                    </strong>
                  </div>
                  {previous.length > 0 && (
                    <div className="clm-previous">
                      <small>Kỳ trước còn nợ</small>
                      <div>
                        {previous.map((x) => (
                          <span key={x.charge.id} className="clm-prev debt">
                            <ExclamationCircleFilled /> {periodLabel(x.charge.periodCode)} · còn <MoneyText value={x.remainingAmount} />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="clm-actions">
                    {unpaid ? (
                      <div className="clm-pay">
                        <Button
                          type="primary"
                          size="large"
                          icon={<WalletOutlined />}
                          aria-label="Đã thu tiền mặt"
                          onClick={() => setEditing({ item: w, method: 'CASH' })}
                        >
                          Đã thu tiền mặt
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          className="clm-pay-transfer"
                          icon={<BankOutlined />}
                          aria-label="Chuyển khoản (QR)"
                          onClick={() => setEditing({ item: w, method: 'TRANSFER' })}
                        >
                          Chuyển khoản (QR)
                        </Button>
                      </div>
                    ) : (
                      <span className="clm-done">
                        <CheckCircleFilled /> {s.label}
                      </span>
                    )}
                    <Button size="large" icon={<ClockCircleOutlined />} aria-label="Lịch sử" title="Lịch sử nộp các kỳ" onClick={() => setViewing(w)}>
                      Lịch sử
                    </Button>
                    <Button
                      size="large"
                      className="clm-warn"
                      icon={<WarningOutlined />}
                      aria-label="Báo sai thông tin"
                      title="Báo sai thông tin về xã"
                      onClick={() => setReporting(w)}
                    >
                      Báo sai
                    </Button>
                  </div>
                  <details className="clm-details">
                    <summary>Chi tiết</summary>
                    <div className="clm-kv">
                      <small>Mã khách hàng</small>
                      <span>
                        {w.charge.subjectCode} · {isBusiness(w) ? 'Nguồn thải' : 'Hộ gia đình'}
                      </span>
                    </div>
                    <div className="clm-kv">
                      <small>Mã khoản</small>
                      <span>{w.charge.code}</span>
                    </div>
                    <div className="clm-kv">
                      <small>Phiếu yêu cầu thu</small>
                      <span>
                        {w.charge.requestCode} · hạn {formatDate(w.charge.dueDate)}
                      </span>
                    </div>
                    <div className="clm-kv">
                      <small>Nhân viên thu gom</small>
                      <span>{user?.fullName}</span>
                    </div>
                    {w.lastPaidAt && (
                      <div className="clm-kv">
                        <small>Nhật ký đi thu</small>
                        <span>Đã thu lúc {formatDate(w.lastPaidAt, true)}</span>
                      </div>
                    )}
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ResultSheet item={editing?.item ?? null} initialMethod={editing?.method} onClose={() => setEditing(null)} />
      <HouseholdHistory
        item={viewing}
        periods={viewing ? (all.data ?? []).filter((x) => x.charge.subjectId === viewing.charge.subjectId) : []}
        onClose={() => setViewing(null)}
      />
      <ReportSubjectForm item={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
