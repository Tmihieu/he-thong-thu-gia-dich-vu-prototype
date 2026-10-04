import { Alert, Button, DatePicker, Descriptions, Form, Popconfirm, Result, Space, Spin } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { MoneyText } from '../../../shared/MoneyText';
import type { Period } from '../../masterdata/api';
import { type PublishPeriodResult, useDraftPreview, usePublishPeriod } from '../api';
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
  initial?: { householdDueDate?: string; companyDueDate?: string };
  onClose: () => void;
}

/** Xem trước khoản của một kỳ dự thảo, chọn hạn hộ đóng rồi "Mở kỳ & phát hành" trong một bước. */
export function OpenDraftPanel({ period, initial, onClose }: Props) {
  const [picked, setPicked] = useState<Dayjs | null>(initial?.householdDueDate ? dayjs(initial.householdDueDate) : null);
  const [openPicked, setOpenPicked] = useState<Dayjs | null>(null);
  const [duePicked, setDuePicked] = useState<Dayjs | null>(initial?.companyDueDate ? dayjs(initial.companyDueDate) : null);
  const [done, setDone] = useState<PublishPeriodResult | null>(null);
  const schedule = { openDate: openPicked?.format(ISO), companyDueDate: duePicked?.format(ISO) };
  const preview = useDraftPreview(period.id, { ...schedule, householdDueDate: picked?.format(ISO) });
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
  const dueDate = picked ?? dayjs(preview.data.dueDate);
  const openDate = openPicked ?? dayjs(preview.data.period.openDate);
  const companyDue = duePicked ?? dayjs(preview.data.period.dueDate);
  const publishing = publish.isPending;

  function submit() {
    publish.mutate(
      { periodId: period.id, ...schedule, householdDueDate: dueDate.format(ISO) },
      { onSuccess: (r) => setDone(r) },
    );
  }

  return (
    <>
      {errorMessage(publish.error) && (
        <Alert type="error" showIcon message={errorMessage(publish.error)} role="alert" style={{ marginBottom: 16 }} />
      )}
      <Descriptions column={{ xs: 1, md: 2 }} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Thời gian">
          <DateText value={period.startDate} /> – <DateText value={period.endDate} />
        </Descriptions.Item>
        <Descriptions.Item label="Biểu giá áp dụng">{preview.data.period.tariffVersionCode}</Descriptions.Item>
      </Descriptions>
      <Form layout="vertical" requiredMark={false} disabled={publishing}>
        <Space size="middle" wrap align="start">
          <Form.Item label="Ngày mở">
            <DatePicker
              aria-label="Ngày mở"
              format={DATE_FORMAT}
              allowClear={false}
              value={openDate}
              onChange={(d) => {
                setOpenPicked(d);
                setPicked(null);
              }}
            />
          </Form.Item>
          <Form.Item label="Hạn công ty nộp xã">
            <DatePicker
              aria-label="Hạn công ty nộp xã"
              format={DATE_FORMAT}
              allowClear={false}
              value={companyDue}
              disabledDate={(d) => d.isBefore(openDate, 'day')}
              onChange={(d) => {
                setDuePicked(d);
                setPicked(null);
              }}
            />
          </Form.Item>
        </Space>
        <Form.Item label="Hạn hộ đóng">
          <DatePicker
            aria-label="Hạn hộ đóng"
            format={DATE_FORMAT}
            allowClear={false}
            value={dueDate}
            disabledDate={(d) => d.isBefore(openDate, 'day') || d.isAfter(companyDue, 'day')}
            onChange={(d) => setPicked(d)}
          />
        </Form.Item>
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
        <Button onClick={onClose} disabled={publishing}>
          Để sau
        </Button>
      </Space>
    </>
  );
}
