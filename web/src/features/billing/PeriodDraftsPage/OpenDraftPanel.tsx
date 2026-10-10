import { Alert, Button, DatePicker, Descriptions, Form, Popconfirm, Result, Space, Spin } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { MoneyText } from '../../../shared/MoneyText';
import type { Period } from '../../masterdata/api';
import { type DraftScope, type PublishPeriodResult, useDraftPreview, usePublishPeriod } from '../api';
import { PreviewSummary } from '../ChargeRequestPage/PreviewPanel';

const DATE_FORMAT = 'DD/MM/YYYY';
const ISO = 'YYYY-MM-DD';

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

interface Props {
  period: Period;
  /** Hạn đã chọn ở bước lập phiếu (ISO), dùng làm giá trị đầu. */
  initial?: { dueDate?: string };
  /** Phạm vi đã chọn ở bước lập phiếu; trống thì toàn xã. */
  scope?: DraftScope;
  onClose: () => void;
}

/** Xem trước khoản của một kỳ dự thảo, chọn hạn dân đóng rồi "Mở kỳ & phát hành" trong một bước. */
export function OpenDraftPanel({ period, initial, scope, onClose }: Props) {
  const [duePicked, setDuePicked] = useState<Dayjs | null>(initial?.dueDate ? dayjs(initial.dueDate) : null);
  const [done, setDone] = useState<PublishPeriodResult | null>(null);
  // Kỳ mở ngay khi cán bộ xã bấm: ngày mở là hôm nay.
  const openDate = dayjs();
  const schedule = { ...scope, openDate: openDate.format(ISO), dueDate: duePicked?.format(ISO) };
  const preview = useDraftPreview(period.id, schedule);
  const publish = usePublishPeriod();

  if (done) {
    return (
      <Result
        status="success"
        title={`Đã mở kỳ ${done.period.label}`}
        subTitle={
          done.result.requestCode ? (
            <>
              Phiếu {done.result.requestCode}: {done.result.chargeCount} khoản, tổng <MoneyText value={done.result.totalAmount} />
            </>
          ) : (
            'Không có khoản nào được lập.'
          )
        }
        extra={
          <Button type="primary" onClick={onClose}>
            Đóng
          </Button>
        }
      />
    );
  }

  if (preview.isLoading) return <Spin />;
  if (preview.error || !preview.data) {
    return <Alert type="error" showIcon message={errorMessage(preview.error) ?? 'Không xem trước được kỳ này.'} role="alert" />;
  }

  const { result } = preview.data;
  const due = duePicked ?? dayjs(preview.data.period.dueDate);
  const settlementDue = preview.data.period.settlementDueDate;
  const publishing = publish.isPending;

  function submit() {
    publish.mutate(
      { periodId: period.id, ...schedule },
      { onSuccess: (r) => setDone(r) },
    );
  }

  return (
    <>
      {errorMessage(publish.error) && (
        <Alert type="error" showIcon message={errorMessage(publish.error)} role="alert" style={{ marginBottom: 16 }} />
      )}
      <Descriptions column={{ xs: 1, md: 2 }} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Biểu giá áp dụng">{preview.data.period.tariffVersionCode}</Descriptions.Item>
        <Descriptions.Item label="Hạn quyết toán">
          <DateText value={settlementDue} />
        </Descriptions.Item>
      </Descriptions>
      <Form layout="vertical" requiredMark={false} disabled={publishing}>
        <Space size="middle" wrap align="start">
          <Form.Item label="Hạn dân đóng">
            <DatePicker
              aria-label="Hạn dân đóng"
              format={DATE_FORMAT}
              allowClear={false}
              value={due}
              disabledDate={(d) => d.isBefore(openDate, 'day') || !d.isBefore(settlementDue, 'day')}
              onChange={(d) => setDuePicked(d)}
            />
          </Form.Item>
        </Space>
      </Form>
      <PreviewSummary result={result} />
      <Space>
        <Popconfirm
          title={`Mở kỳ ${period.label}?`}
          description={`Phát hành ${result.chargeCount} khoản cho các hộ. Sau khi mở kỳ không đổi lại được.`}
          okText="Mở kỳ & phát hành"
          cancelText="Hủy"
          onConfirm={submit}
        >
          <Button type="primary" loading={publishing || preview.isFetching}>
            Mở kỳ & phát hành {result.chargeCount} khoản
          </Button>
        </Popconfirm>
      </Space>
    </>
  );
}
