import { Alert, Button, Card, Descriptions, Space, Table } from 'antd';

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

/** Các nhóm bị bỏ qua kèm số hộ + danh sách chi tiết, lọc được theo nhóm. */
export function SkippedList({ skipped }: { skipped: SkippedRow[] }) {
  if (skipped.length === 0) return null;
  const groups = [...new Set(skipped.map((s) => s.reason as string))];
  return (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message={`Bỏ qua ${skipped.length} hộ, không lập khoản`}
        description={
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {groups.map((g) => (
              <li key={g}>
                {skipLabel(g)}: {skipped.filter((s) => s.reason === g).length} hộ
              </li>
            ))}
          </ul>
        }
      />
      <Table<SkippedRow>
        size="small"
        rowKey="subjectId"
        dataSource={skipped}
        scroll={{ x: 640 }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        columns={[
          { title: 'Mã', dataIndex: 'subjectCode' },
          { title: 'Tên', dataIndex: 'subjectName' },
          { title: 'Tổ', dataIndex: 'areaCode' },
          {
            title: 'Lý do',
            filters: groups.map((g) => ({ text: skipLabel(g), value: g })),
            onFilter: (v, s) => s.reason === v,
            render: (_, s) => <StatusTag tone={s.warning ? 'warning' : 'neutral'}>{s.message || skipLabel(s.reason)}</StatusTag>,
          },
        ]}
      />
    </>
  );
}

/** Kết quả xem trước: số khoản sẽ sinh, tổng tiền, danh sách bỏ qua kèm lý do; nút Phát hành. */
export function PreviewPanel({ result, publishing = false, error, onPublish, onBack }: Props) {
  return (
    <Card title="Xem trước phiếu yêu cầu thu" style={{ maxWidth: 960 }}>
      {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
      <Descriptions column={{ xs: 1, md: 3 }} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Số khoản sẽ sinh">{result.chargeCount}</Descriptions.Item>
        <Descriptions.Item label="Trong đó miễn 100%">{result.exemptCount}</Descriptions.Item>
        <Descriptions.Item label="Tổng tiền">
          <MoneyText value={result.totalAmount} strong />
        </Descriptions.Item>
      </Descriptions>
      <SkippedList skipped={result.skipped} />
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
