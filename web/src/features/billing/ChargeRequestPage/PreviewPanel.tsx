import { Alert, Button, Card, Descriptions, Space, Table, Tag } from 'antd';

import { MoneyText } from '../../../shared/MoneyText';
import type { IssueResult } from '../api';

type SkippedRow = IssueResult['skipped'][number];

interface Props {
  result: IssueResult;
  publishing?: boolean;
  error?: string | null;
  onPublish: () => void;
  onBack: () => void;
}

/** Kết quả xem trước: số khoản sẽ sinh, tổng tiền, danh sách bỏ qua kèm lý do; nút Phát hành. */
export function PreviewPanel({ result, publishing = false, error, onPublish, onBack }: Props) {
  return (
    <Card title="Xem trước phiếu yêu cầu thu" style={{ maxWidth: 960 }}>
      {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
      {result.warningCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`${result.warningCount} hộ ở tổ chưa có công ty phụ trách sẽ không được lập khoản. Hãy phân công khu vực rồi lập lại cho các tổ đó.`}
        />
      )}
      <Descriptions column={{ xs: 1, md: 3 }} bordered size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="Số khoản sẽ sinh">{result.chargeCount}</Descriptions.Item>
        <Descriptions.Item label="Trong đó miễn 100%">{result.exemptCount}</Descriptions.Item>
        <Descriptions.Item label="Tổng tiền">
          <MoneyText value={result.totalAmount} strong />
        </Descriptions.Item>
      </Descriptions>
      {result.skipped.length > 0 && (
        <Table<SkippedRow>
          size="small"
          rowKey="subjectId"
          title={() => `Bỏ qua ${result.skipped.length} hộ`}
          dataSource={result.skipped}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          columns={[
            { title: 'Mã', dataIndex: 'subjectCode' },
            { title: 'Tên', dataIndex: 'subjectName' },
            { title: 'Tổ', dataIndex: 'areaCode' },
            {
              title: 'Lý do',
              render: (_, s) => (s.warning ? <Tag color="orange">{s.message}</Tag> : s.message),
            },
          ]}
        />
      )}
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
