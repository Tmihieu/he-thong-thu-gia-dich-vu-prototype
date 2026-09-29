import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Result, Space, Spin, Steps, Table, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../../api/client';
import { DateText } from '../../../shared/DateText';
import { CHARGE_SCOPE_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { useAreas, useCompanies, usePeriods } from '../../masterdata/api';
import {
  type ChargeRequestSummary,
  type IssueRequest,
  type IssueResult,
  useChargeRequests,
  useFeeTypes,
  usePreviewCharges,
  usePublishCharges,
} from '../api';
import { ChargeRequestForm } from './ChargeRequestForm';
import { PreviewPanel } from './PreviewPanel';

function errorMessage(err: unknown): string | null {
  if (!err) return null;
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

type Step = { kind: 'form' } | { kind: 'preview'; req: IssueRequest; result: IssueResult } | { kind: 'done'; result: IssueResult };

/** Phiếu YCT: danh sách phiếu đã phát hành; lập phiếu mới trong ngăn kéo theo bước form → xem trước → phát hành. */
export function ChargeRequestTab() {
  const periods = usePeriods();
  const feeTypes = useFeeTypes();
  const areas = useAreas();
  const companies = useCompanies();
  const requests = useChargeRequests();
  const preview = usePreviewCharges();
  const publish = usePublishCharges();
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [open, setOpen] = useState(false);

  function startNew() {
    preview.reset();
    publish.reset();
    setStep({ kind: 'form' });
    setOpen(true);
  }

  if (periods.isLoading || feeTypes.isLoading) return <Spin />;

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="center">
        <Typography.Text type="secondary">
          Mỗi phiếu lập khoản thu cho các hộ trong phạm vi chưa có khoản cùng kỳ, cùng loại phí.
        </Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={startNew}>
          Lập phiếu YCT
        </Button>
      </Space>
      <Table<ChargeRequestSummary>
        rowKey="id"
        loading={requests.isLoading}
        dataSource={requests.data ?? []}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: 'Chưa có phiếu nào' }}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Kỳ', dataIndex: 'periodCode' },
          { title: 'Loại phí', dataIndex: 'feeTypeName' },
          { title: 'Phạm vi', dataIndex: 'scopeType', render: (s: ChargeRequestSummary['scopeType']) => CHARGE_SCOPE_LABELS[s] },
          { title: 'Ngày lập', dataIndex: 'issueDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Hạn đóng', dataIndex: 'dueDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Số khoản', dataIndex: 'chargeCount', align: 'right' },
          { title: 'Tổng tiền', dataIndex: 'totalAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        ]}
      />

      <Drawer title="Lập phiếu yêu cầu thu" open={open} onClose={() => setOpen(false)} width={800} destroyOnHidden>
        <Steps
          size="small"
          style={{ marginBottom: 24 }}
          current={step.kind === 'form' ? 0 : step.kind === 'preview' ? 1 : 2}
          items={[{ title: 'Thông tin phiếu' }, { title: 'Xem trước' }, { title: 'Phát hành' }]}
        />
        {step.kind === 'form' && (
          <ChargeRequestForm
            periods={periods.data ?? []}
            feeTypes={feeTypes.data ?? []}
            areas={areas.data ?? []}
            companies={companies.data ?? []}
            loading={preview.isPending}
            error={errorMessage(preview.error)}
            onPreview={(req) => preview.mutate(req, { onSuccess: (result) => setStep({ kind: 'preview', req, result }) })}
          />
        )}
        {step.kind === 'preview' && (
          <PreviewPanel
            result={step.result}
            publishing={publish.isPending}
            error={errorMessage(publish.error)}
            onBack={() => {
              publish.reset();
              setStep({ kind: 'form' });
            }}
            onPublish={() => publish.mutate(step.req, { onSuccess: (result) => setStep({ kind: 'done', result }) })}
          />
        )}
        {step.kind === 'done' &&
          (step.result.requestCode ? (
            <Result
              status="success"
              title={`Đã phát hành phiếu ${step.result.requestCode}`}
              subTitle={
                <>
                  {step.result.chargeCount} khoản, tổng <MoneyText value={step.result.totalAmount} />
                </>
              }
              extra={
                <Space>
                  <Button onClick={() => setStep({ kind: 'form' })}>Lập phiếu khác</Button>
                  <Button type="primary" onClick={() => setOpen(false)}>
                    Đóng
                  </Button>
                </Space>
              }
            />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Không có khoản mới"
              description="Các hộ trong phạm vi đã có khoản cùng loại phí cho kỳ này hoặc không đủ điều kiện lập khoản. Không lưu phiếu mới."
              action={<Button onClick={() => setStep({ kind: 'form' })}>Quay lại</Button>}
            />
          ))}
      </Drawer>
    </>
  );
}
