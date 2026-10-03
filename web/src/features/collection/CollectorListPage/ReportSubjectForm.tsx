import { Alert, App, Button, Drawer, Form, Input, Radio, Typography } from 'antd';

import { ApiError } from '../../../api/client';
import { type CollectorCharge, type SubjectReportRequest, useReportSubject } from '../api';

type ReportType = SubjectReportRequest['reportType'];

/** 6 lý do chính người đi thu gặp khi đi thu (nhãn backend ở SubjectReportType). */
const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  MOVED_AWAY: 'Hộ đã chuyển đi',
  VACANT: 'Nhà bỏ trống, không có người ở',
  WRONG_INFO: 'Sai thông tin hộ (tên, địa chỉ, SĐT)',
  WRONG_MEMBERS: 'Sai số thành viên / nhóm giá',
  WRONG_AMOUNT: 'Sai số tiền khoản thu',
  DUPLICATE: 'Trùng hộ / trùng khoản thu',
};

interface Values {
  reportType?: ReportType;
  description?: string;
}

interface Props {
  item: CollectorCharge | null;
  onClose: () => void;
}

/** Báo về xã (và công ty) khi gặp hộ chuyển đi / sai thông tin hộ hoặc khoản thu: chọn lý do + ghi chú; không sửa hồ sơ hộ (G7). */
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
      title="Báo sai thông tin về xã"
      className="clm-sheet"
      destroyOnHidden
      styles={{ body: { paddingBottom: 24 } }}
    >
      {item && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          {item.charge.subjectName} · {item.charge.subjectCode} · {item.charge.subjectAddress}
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
        <Form.Item name="reportType" label="Lý do" rules={[{ required: true, message: 'Vui lòng chọn lý do' }]}>
          <Radio.Group className="clm-tiles clm-tiles-wide">
            {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((k) => (
              <Radio.Button key={k} value={k}>
                {REPORT_TYPE_LABELS[k]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item
          name="description"
          label="Ghi chú"
          rules={[{ required: true, whitespace: true, message: 'Vui lòng ghi rõ thông tin sai' }]}
        >
          <Input.TextArea rows={3} maxLength={1000} showCount placeholder="Ví dụ: hộ đã bán nhà, chuyển đi từ tháng 9; số đúng là 3 người" />
        </Form.Item>
        <p className="clm-tip">Xã và công ty nhận được thông báo để kiểm tra, sửa hồ sơ hộ hoặc khoản thu. Khoản thu hiện tại chưa thay đổi.</p>
        <div className="clm-sheet-actions">
          <Button size="large" onClick={close}>
            Hủy
          </Button>
          <Button size="large" type="primary" htmlType="submit" loading={report.isPending}>
            Gửi báo cáo
          </Button>
        </div>
      </Form>
    </Drawer>
  );
}
