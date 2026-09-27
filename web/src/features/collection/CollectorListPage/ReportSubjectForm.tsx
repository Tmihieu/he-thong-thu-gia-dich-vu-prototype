import { Alert, App, Button, Drawer, Form, Input, Radio, Space, Typography } from 'antd';

import { ApiError } from '../../../api/client';
import { type CollectorCharge, type SubjectReportRequest, useReportSubject } from '../api';

type ReportType = SubjectReportRequest['reportType'];

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  MOVED_AWAY: 'Hộ đã chuyển đi',
  WRONG_INFO: 'Sai thông tin hộ',
};

interface Values {
  reportType?: ReportType;
  description?: string;
}

interface Props {
  item: CollectorCharge | null;
  onClose: () => void;
}

/** Báo hộ chuyển đi / sai thông tin: gửi thông báo về công ty và xã, không sửa hồ sơ hộ (G7). */
export function ReportSubjectForm({ item, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const report = useReportSubject();

  function close() {
    report.reset();
    onClose();
  }

  function finish(v: Values) {
    if (report.isPending || !item) return;
    const { id: chargeId, subjectName } = item.charge;
    report.mutate(
      { chargeId, reportType: v.reportType!, description: v.description!.trim() },
      {
        onSuccess: () => {
          message.success(`Đã gửi báo cáo về công ty và xã · ${subjectName}`);
          close();
        },
      },
    );
  }

  return (
    <Drawer
      placement="bottom"
      height="auto"
      open={item !== null}
      onClose={close}
      title={item ? `Báo sai thông tin · ${item.charge.subjectName}` : 'Báo sai thông tin'}
      destroyOnHidden
      styles={{ body: { paddingBottom: 24 } }}
    >
      {item && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {item.charge.subjectCode} · {item.charge.subjectAddress}
        </Typography.Paragraph>
      )}
      {report.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginBottom: 12 }}
          message={report.error instanceof ApiError ? report.error.message : 'Không gửi được. Vui lòng thử lại.'}
        />
      )}
      <Form<Values> form={form} layout="vertical" preserve={false} onFinish={finish}>
        <Form.Item name="reportType" label="Loại" rules={[{ required: true, message: 'Vui lòng chọn loại' }]}>
          <Radio.Group buttonStyle="solid">
            {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((k) => (
              <Radio.Button key={k} value={k}>
                {REPORT_TYPE_LABELS[k]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="description"
          label="Mô tả"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng mô tả thông tin sai' }]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount placeholder="Ví dụ: hộ đã bán nhà, chuyển đi từ tháng 9" />
        </Form.Item>
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={close}>Hủy</Button>
          <Button type="primary" htmlType="submit" loading={report.isPending}>
            Gửi báo cáo
          </Button>
        </Space>
      </Form>
    </Drawer>
  );
}
