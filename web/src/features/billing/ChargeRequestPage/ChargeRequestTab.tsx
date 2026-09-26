import { Alert, Button, Result, Spin, Table, Typography } from 'antd';
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

/** Lập phiếu YCT: form → xem trước → phát hành; bên dưới là các phiếu đã phát hành. */
export function ChargeRequestTab() {
  const periods = usePeriods();
  const feeTypes = useFeeTypes();
  const areas = useAreas();
  const companies = useCompanies();
  const requests = useChargeRequests();
  const preview = usePreviewCharges();
  const publish = usePublishCharges();
  const [step, setStep] = useState<Step>({ kind: 'form' });

  if (periods.isLoading || feeTypes.isLoading) return <Spin />;

  return (
    <>
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
            extra={<Button onClick={() => setStep({ kind: 'form' })}>Lập phiếu khác</Button>}
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

      <Typography.Title level={5} style={{ marginTop: 32 }}>
        Phiếu đã phát hành
      </Typography.Title>
      <Table<ChargeRequestSummary>
        rowKey="id"
        size="small"
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
    </>
  );
}
