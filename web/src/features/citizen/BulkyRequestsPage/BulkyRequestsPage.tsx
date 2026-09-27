import { Alert, App, Button, Popconfirm, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { MoneyText } from '../../../shared/MoneyText';
import {
  BULKY_ITEM_LABELS,
  BULKY_STATUS_COLORS,
  BULKY_STATUS_LABELS,
  type BulkyRequest,
  type BulkyStatus,
  DAY_SLOT_LABELS,
  useBulkyRequests,
  useCancelBulky,
  useCollectBulky,
  useQuoteBulky,
} from '../api';
import { QuoteForm, RejectForm } from './QuoteForm';

type Filter = BulkyStatus | 'ALL';

const FILTERS: Filter[] = ['PENDING', 'QUOTED', 'COLLECTED', 'CANCELLED', 'ALL'];

function errorText(e: unknown) {
  return e ? (e instanceof ApiError ? e.message : 'Không thực hiện được. Vui lòng thử lại.') : null;
}

/** "Rác cồng kềnh" của công ty (T45): yêu cầu của hộ trong khu vực mình, báo phí, đánh dấu đã thu gom, từ chối. */
export function BulkyRequestsPage() {
  const { message } = App.useApp();
  const [params] = useSearchParams();
  const focusId = Number(params.get('id')) || null;
  const [filter, setFilter] = useState<Filter>(focusId ? 'ALL' : 'PENDING');
  // Bấm thông báo khi màn đang mở (đổi ?id=) cũng chuyển sang "Tất cả" để thấy dòng được mở.
  const [seenFocusId, setSeenFocusId] = useState(focusId);
  if (focusId !== seenFocusId) {
    setSeenFocusId(focusId);
    if (focusId) setFilter('ALL');
  }
  const [quoting, setQuoting] = useState<BulkyRequest | null>(null);
  const [rejecting, setRejecting] = useState<BulkyRequest | null>(null);
  const requests = useBulkyRequests();
  const quote = useQuoteBulky();
  const collect = useCollectBulky();
  const cancel = useCancelBulky();
  const items = useMemo(() => requests.data ?? [], [requests.data]);
  const visible = useMemo(() => {
    const list = items.filter((r) => filter === 'ALL' || r.status === filter);
    // Dòng mở từ thông báo đưa lên đầu, không bị lọt sang trang 2.
    const focused = list.find((r) => r.id === focusId);
    return focused ? [focused, ...list.filter((r) => r !== focused)] : list;
  }, [items, filter, focusId]);
  const count = (f: Filter) => items.filter((r) => f === 'ALL' || r.status === f).length;
  const label = (f: Filter) => (f === 'ALL' ? 'Tất cả' : BULKY_STATUS_LABELS[f]);

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Rác cồng kềnh
      </Typography.Title>
      <Segmented<Filter>
        style={{ marginBottom: 12 }}
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f, label: `${label(f)} (${count(f)})` }))}
      />
      {(requests.error || collect.error) && (
        <Alert type="error" showIcon message={errorText(requests.error ?? collect.error)} style={{ marginBottom: 12 }} />
      )}
      <Table<BulkyRequest>
        rowKey="id"
        loading={requests.isLoading}
        dataSource={visible}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        locale={{ emptyText: 'Không có yêu cầu' }}
        onRow={(r) => (r.id === focusId ? { style: { background: '#e6f4ff' } } : {})}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Mã', dataIndex: 'code' },
          {
            title: 'Hộ',
            render: (_, r) => (
              <>
                <div>{r.subjectCode} · {r.subjectName}</div>
                <Typography.Text type="secondary">
                  {r.citizenName} · {r.citizenPhone} · {r.areaCode}
                </Typography.Text>
              </>
            ),
          },
          {
            title: 'Vật dụng',
            render: (_, r) => (
              <>
                <div>{r.quantity} × {BULKY_ITEM_LABELS[r.itemType]}</div>
                {r.itemDescription && <Typography.Text type="secondary">{r.itemDescription}</Typography.Text>}
              </>
            ),
          },
          { title: 'Địa chỉ', dataIndex: 'address' },
          {
            title: 'Mong muốn',
            render: (_, r) => (
              <>
                <DateText value={r.preferredDate} />
                {r.preferredSlot && <div>{DAY_SLOT_LABELS[r.preferredSlot]}</div>}
              </>
            ),
          },
          { title: 'Phí', render: (_, r) => <MoneyText value={r.quotedFee} /> },
          { title: 'Ngày hẹn', render: (_, r) => <DateText value={r.scheduledDate} /> },
          {
            title: 'Trạng thái',
            render: (_, r) => (
              <>
                <Tag color={BULKY_STATUS_COLORS[r.status]}>{BULKY_STATUS_LABELS[r.status]}</Tag>
                {r.cancelReason && <div><Typography.Text type="secondary">{r.cancelReason}</Typography.Text></div>}
              </>
            ),
          },
          {
            title: 'Thao tác',
            render: (_, r) =>
              r.status === 'PENDING' || r.status === 'QUOTED' ? (
                <Space size={4} wrap>
                  {r.status === 'PENDING' ? (
                    <Button size="small" type="primary" onClick={() => { quote.reset(); collect.reset(); setQuoting(r); }}>
                      Báo phí
                    </Button>
                  ) : (
                    <Popconfirm
                      title={`Xác nhận đã thu gom ${r.code}?`}
                      okText="Đã thu gom"
                      cancelText="Hủy"
                      onConfirm={() =>
                        collect.mutate(r.id, { onSuccess: () => message.success(`Đã đánh dấu thu gom ${r.code}`) })
                      }
                    >
                      <Button size="small" type="primary">Đã thu gom</Button>
                    </Popconfirm>
                  )}
                  <Button size="small" danger onClick={() => { cancel.reset(); collect.reset(); setRejecting(r); }}>
                    Từ chối
                  </Button>
                </Space>
              ) : null,
          },
        ]}
      />
      <QuoteForm
        request={quoting}
        submitting={quote.isPending}
        error={errorText(quote.error)}
        onCancel={() => setQuoting(null)}
        onSubmit={(req) =>
          quote.mutate(req, {
            onSuccess: (r) => {
              setQuoting(null);
              message.success(`Đã báo phí ${r.code}, hộ sẽ nhận thông báo`);
            },
          })
        }
      />
      <RejectForm
        request={rejecting}
        submitting={cancel.isPending}
        error={errorText(cancel.error)}
        onCancel={() => setRejecting(null)}
        onSubmit={(req) =>
          cancel.mutate(req, {
            onSuccess: (r) => {
              setRejecting(null);
              message.success(`Đã từ chối ${r.code}`);
            },
          })
        }
      />
    </>
  );
}
