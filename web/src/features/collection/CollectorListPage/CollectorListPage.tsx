import {
  BankOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  DownOutlined,
  ExclamationCircleFilled,
  UpOutlined,
  WalletOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, DatePicker, Empty, Input, Select, Skeleton, Tag } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState } from 'react';

import { ApiError } from '../../../api/client';
import { useAuth } from '../../../app/auth/authContext';
import { formatDate } from '../../../shared/format';
import { MoneyText } from '../../../shared/MoneyText';
import { normalizeText } from '../../../shared/normalizeText';
import { usePeriods } from '../../masterdata/api';
import { PeriodSelect } from '../../masterdata/PeriodSelect';
import { type CollectorCharge, useCashHeld, useMyWork, useMyWorkAllPeriods } from '../api';
import { byChipOrder, COLLECTOR_CHIPS, countChips, RESULT_LABELS, type WorkChip, workChip, workState } from '../workState';
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
  const [statsOpen, setStatsOpen] = useState(true);
  const [editing, setEditing] = useState<{ item: CollectorCharge; method: Method } | null>(null);
  const [viewing, setViewing] = useState<CollectorCharge | null>(null);
  const [reporting, setReporting] = useState<CollectorCharge | null>(null);
  const work = useMyWork(periodId);
  const all = useMyWorkAllPeriods();
  const cash = useCashHeld();
  // BR-COL-12: kỳ đã khóa không ghi thu nữa.
  const locked = usePeriods().data?.find((p) => p.id === periodId)?.status === 'LOCKED';
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
  const visible = useMemo(() => scoped.filter((w) => chip === 'ALL' || workChip(w) === chip).sort(byChipOrder), [scoped, chip]);

  const paid = counts.PAID ?? 0;
  // Miễn giảm / đã xóa nợ không phải "chưa thu".
  const unpaidCount = items.filter((w) => w.charge.status === 'UNPAID').length;
  const held = cash.data?.[0]?.held ?? 0;
  const period = items[0] ? periodLabel(items[0].charge.periodCode) : '';

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
        <button type="button" className="clm-stats-toggle" aria-expanded={statsOpen} onClick={() => setStatsOpen((o) => !o)}>
          Thống kê kỳ {period} {statsOpen ? <UpOutlined /> : <DownOutlined />}
        </button>
        {statsOpen && (
          <div className="clm-stats">
            <div>
              <small>Đã thu</small>
              <strong>{`${paid}/${items.length} hộ`}</strong>
            </div>
            <div>
              <small>Chưa thu</small>
              <strong>{unpaidCount}</strong>
              {(counts.OVERDUE ?? 0) > 0 && <em>{counts.OVERDUE} quá hạn</em>}
            </div>
          </div>
        )}
        <div className="clm-filter-row">
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
        {COLLECTOR_CHIPS.map((c) => (
          <button key={c.value} type="button" className={`clm-chip${chip === c.value ? ' active' : ''}`} aria-pressed={chip === c.value} onClick={() => setChip(c.value)}>
            {c.label} <b>{counts[c.value] ?? 0}</b>
          </button>
        ))}
      </div>

      {work.error && <Alert type="error" showIcon message={work.error instanceof ApiError ? work.error.message : 'Không tải được danh sách thu'} />}
      {work.isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : visible.length === 0 ? (
        <Empty description={items.length === 0 ? 'Chưa có hộ nào trong tổ được giao' : 'Không có hộ phù hợp'} />
      ) : (
        <ul className="clm-cards">
          {visible.map((w) => {
            const s = workState(w);
            const unpaid = w.charge.status === 'UNPAID';
            const previous = previousOf(w);
            return (
              <li key={w.charge.id} className="clm-card" aria-label={w.charge.subjectName}>
                <header className="clm-card-head">
                  <strong>Khoản thu · {w.charge.code}</strong>
                  <Tag color={s.color}>{s.label}</Tag>
                </header>
                <div className="clm-card-body">
                  <small className="clm-label">Thông tin khách hàng</small>
                  <h3 className="clm-name">{w.charge.subjectName}</h3>
                  <p>
                    <b>Mã KH:</b> {w.charge.subjectCode} · {isBusiness(w) ? 'Hộ kinh doanh' : 'Hộ gia đình'}
                  </p>
                  <p>
                    <b>Địa chỉ:</b> {w.charge.subjectAddress} ({w.charge.areaCode})
                  </p>
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
                  <div className="clm-amount">
                    <small>Số tiền phải thu · kỳ {periodLabel(w.charge.periodCode)}</small>
                    <strong>
                      <MoneyText value={w.charge.amount} />
                    </strong>
                  </div>
                  {unpaid && w.paidAmount > 0 && (
                    <p className="clm-partial">
                      Đã thu <MoneyText value={w.paidAmount} /> · còn thiếu <MoneyText value={w.remainingAmount} />
                    </p>
                  )}
                  {(w.lastPaidAt || w.lastVisit) && (
                    <div className="clm-kv">
                      <small>Nhật ký đi thu</small>
                      <span>
                        {w.lastPaidAt && <div>Đã thu lúc {formatDate(w.lastPaidAt, true)}</div>}
                        {w.lastVisit && (
                          <div>
                            {RESULT_LABELS[w.lastVisit.result]} lúc {formatDate(w.lastVisit.visitedAt, true)}
                          </div>
                        )}
                      </span>
                    </div>
                  )}
                  {previous.length > 0 && (
                    <div className="clm-previous">
                      <small>Các kỳ trước</small>
                      <div>
                        {previous.map((x) =>
                          x.charge.status === 'UNPAID' ? (
                            <span key={x.charge.id} className="clm-prev debt">
                              <ExclamationCircleFilled /> {periodLabel(x.charge.periodCode)} · còn <MoneyText value={x.remainingAmount} />
                            </span>
                          ) : (
                            <span key={x.charge.id} className="clm-prev ok">
                              <CheckCircleFilled /> {periodLabel(x.charge.periodCode)}
                              {x.charge.status === 'EXEMPT' ? ' · miễn giảm' : x.charge.status === 'WRITTEN_OFF' ? ' · đã xóa nợ' : ''}
                            </span>
                          ),
                        )}
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
                          disabled={locked}
                          title={locked ? 'Kỳ đã khóa' : undefined}
                          onClick={() => setEditing({ item: w, method: 'CASH' })}
                        >
                          Đã thu tiền mặt
                        </Button>
                        <Button
                          type="primary"
                          size="large"
                          className="clm-pay-transfer"
                          icon={<BankOutlined />}
                          aria-label="Đã thu chuyển khoản"
                          disabled={locked}
                          title={locked ? 'Kỳ đã khóa' : undefined}
                          onClick={() => setEditing({ item: w, method: 'TRANSFER' })}
                        >
                          Đã thu chuyển khoản
                        </Button>
                      </div>
                    ) : (
                      <span className="clm-done">
                        <CheckCircleFilled /> {s.label}
                      </span>
                    )}
                    <Button size="large" icon={<ClockCircleOutlined />} aria-label="Lịch sử" title="Lịch sử nộp các kỳ" onClick={() => setViewing(w)} />
                    <Button
                      size="large"
                      className="clm-warn"
                      icon={<WarningOutlined />}
                      aria-label="Báo sai thông tin"
                      title="Báo sai thông tin về xã"
                      onClick={() => setReporting(w)}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ResultSheet item={editing?.item ?? null} initialMethod={editing?.method} onClose={() => setEditing(null)} />
      <HouseholdHistory item={viewing} onClose={() => setViewing(null)} />
      <ReportSubjectForm item={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
