import { Alert, Button, Card, Checkbox, Descriptions, Space, Table } from 'antd';
import { useState } from 'react';

import { MoneyText } from '../../../shared/MoneyText';
import { StatusTag } from '../../../shared/StatusTag';
import type { IssueResult } from '../api';

type SkippedRow = IssueResult['skipped'][number];

interface Props {
  result: IssueResult;
  publishing?: boolean;
  error?: string | null;
  onPublish: () => void;
  onBack: () => void;
}

/** Nhãn nhóm hộ bị bỏ qua khi lập khoản (BR-BIL-06, QĐ-L14); mã lạ giữ nguyên lý do backend trả. */
const SKIP_LABELS: Record<string, string> = {
  SUBJECT_NOT_ACTIVE: 'Hộ đã ngừng cung cấp dịch vụ',
  NO_ACTIVE_CONTRACT: 'Chưa có đăng ký thu phí hiệu lực',
  AREA_WITHOUT_COMPANY: 'Tổ chưa có công ty phụ trách',
  DUPLICATE_CHARGE: 'Đã có khoản cùng loại phí trùng kỳ',
  QUOTA_KG_REQUIRED: 'Hộ tính theo ký chưa có định mức kg/tháng',
};
const skipLabel = (reason: string) => SKIP_LABELS[reason] ?? reason;

/**
 * Các nhóm hộ bị bỏ qua: một dòng tiêu đề, mỗi loại lý do một dòng có ô chọn; tích loại nào thì bảng chỉ còn hộ loại đó
 * (không tích gì thì hiện tất cả).
 */
export function SkippedList({ skipped, byReason }: { skipped: SkippedRow[]; byReason: Record<string, number> }) {
  const [picked, setPicked] = useState<string[]>([]);
  const groups = Object.keys(byReason);
  const total = groups.reduce((t, g) => t + (byReason[g] ?? 0), 0);
  if (total === 0 && skipped.length === 0) return null;
  const shown = picked.length === 0 ? skipped : skipped.filter((s) => picked.includes(s.reason));
  return (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message={`Bỏ qua ${total} hộ, không lập khoản`}
        description={
          <Checkbox.Group value={picked} onChange={(v) => setPicked(v as string[])} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {groups.map((g) => (
              <Checkbox key={g} value={g}>
                {skipLabel(g)}: {byReason[g]} hộ
              </Checkbox>
            ))}
          </Checkbox.Group>
        }
      />
      <Table<SkippedRow>
        size="small"
        rowKey="subjectId"
        dataSource={shown}
        scroll={{ x: 640 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        columns={[
          { title: 'Mã', dataIndex: 'subjectCode' },
          { title: 'Tên', dataIndex: 'subjectName' },
          { title: 'Tổ', dataIndex: 'areaCode' },
          {
            title: 'Lý do',
            render: (_, s) => <StatusTag tone={s.warning ? 'warning' : 'neutral'}>{s.message || skipLabel(s.reason)}</StatusTag>,
          },
        ]}
      />
    </>
  );
}

/** Phần số liệu của xem trước: số khoản, tổng tiền, các nhóm hộ bị bỏ qua kèm lý do. Dùng chung cho phiếu YCT và mở kỳ dự thảo. */
export function PreviewSummary({ result }: { result: IssueResult }) {
  return (
    <>
      <Descriptions column={{ xs: 1, md: 3 }} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Số khoản sẽ sinh">{result.chargeCount}</Descriptions.Item>
        <Descriptions.Item label="Trong đó miễn 100%">{result.exemptCount}</Descriptions.Item>
        <Descriptions.Item label="Tổng tiền">
          <MoneyText value={result.totalAmount} strong />
        </Descriptions.Item>
      </Descriptions>
      {!!result.plannedCharges?.length && (
        <Table
          size="small"
          rowKey="subjectId"
          dataSource={result.plannedCharges}
          scroll={{ x: 700 }}
          pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (total) => `${total} khoản dự kiến` }}
          columns={[
            { title: 'Mã hộ', dataIndex: 'subjectCode' },
            { title: 'Đối tượng', dataIndex: 'subjectName', className: 'cell-left' },
            { title: 'Ấp', dataIndex: 'areaName' },
            { title: 'Công ty', dataIndex: 'companyCode' },
            { title: 'Số tiền', render: (_, charge) => <MoneyText value={charge.amount ?? 0} /> },
            { title: 'Miễn', render: (_, charge) => charge.exempt ? 'Miễn 100%' : '—' },
          ]}
        />
      )}
      <SkippedList skipped={result.skipped} byReason={result.skippedByReason} />
    </>
  );
}

/** Kết quả xem trước: số khoản sẽ sinh, tổng tiền, danh sách bỏ qua kèm lý do; nút Phát hành. */
export function PreviewPanel({ result, publishing = false, error, onPublish, onBack }: Props) {
  return (
    <Card title="Xem trước phiếu yêu cầu thu" style={{ maxWidth: 960 }}>
      {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
      <PreviewSummary result={result} />
      <Space style={{ marginTop: 16 }}>
        <Button type="primary" onClick={onPublish} loading={publishing} disabled={result.chargeCount === 0}>
          Phát hành {result.chargeCount} khoản
        </Button>
        <Button onClick={onBack} disabled={publishing}>
          Sửa lại
        </Button>
      </Space>
    </Card>
  );
}
