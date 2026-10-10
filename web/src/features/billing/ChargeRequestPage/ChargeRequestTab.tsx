import { PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Drawer, Result, Space, Steps, Table, Typography } from 'antd';
import { useState } from 'react';


import { ErrorBlock, LoadingBlock } from '../../../shared/StateBlock';
import { errorTextOrNull } from '../../../shared/errorText';
import { DateText } from '../../../shared/DateText';
import { CHARGE_SCOPE_LABELS } from '../../../shared/labels';
import { MoneyText } from '../../../shared/MoneyText';
import { newestFirst, type Period, useAreas, useCompanies, useDraftPeriods, usePeriods } from '../../masterdata/api';
import { OpenDraftPanel } from '../PeriodDraftsPage/OpenDraftPanel';
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
import { PreviewPanel, SkippedList } from './PreviewPanel';

type Step = { kind: 'form' } | { kind: 'start'; period: Period; req: IssueRequest; companyDueDate?: string } | { kind: 'preview'; req: IssueRequest; result: IssueResult } | { kind: 'done'; result: IssueResult };

/** Phiếu YCT: danh sách phiếu đã phát hành; lập phiếu mới trong ngăn kéo theo bước form → xem trước → phát hành. */
export function ChargeRequestTab() {
  const periods = usePeriods();
  const drafts = useDraftPeriods();
  const feeTypes = useFeeTypes();
  const areas = useAreas();
  const companies = useCompanies();
  const requests = useChargeRequests();
  const preview = usePreviewCharges();
  const publish = usePublishCharges();
  const [step, setStep] = useState<Step>({ kind: 'form' });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<IssueRequest | null>(null);

  function startNew() {
    preview.reset();
    publish.reset();
    setDraft(null);
    setStep({ kind: 'form' });
    setOpen(true);
  }

  if (periods.isLoading || feeTypes.isLoading) return <LoadingBlock />;
  const loadError = periods.error ?? feeTypes.error;
  if (loadError) return <ErrorBlock error={loadError} onRetry={() => void Promise.all([periods.refetch(), feeTypes.refetch()])} />;

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
        locale={{ emptyText: requests.error ? errorTextOrNull(requests.error) : 'Chưa có phiếu nào' }}
        columns={[
          { title: 'Mã phiếu', dataIndex: 'code' },
          { title: 'Kỳ', dataIndex: 'periodCode', className: 'cell-nowrap', render: (code: string) => periods.data?.find((p) => p.code === code)?.label ?? code },
          { title: 'Loại phí', dataIndex: 'feeTypeName' },
          { title: 'Phạm vi', dataIndex: 'scopeType', render: (s: ChargeRequestSummary['scopeType']) => CHARGE_SCOPE_LABELS[s] },
          { title: 'Ngày lập', dataIndex: 'issueDate', render: (d: string) => <DateText value={d} /> },
          { title: 'Số khoản', dataIndex: 'chargeCount', align: 'right' },
          { title: 'Tổng tiền', dataIndex: 'totalAmount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
        ]}
      />

      <Drawer title="Lập phiếu yêu cầu thu" open={open} onClose={() => setOpen(false)} width={800} destroyOnHidden>
        <Steps
          size="small"
          style={{ marginBottom: 24 }}
          current={step.kind === 'form' ? 0 : step.kind === 'preview' || step.kind === 'start' ? 1 : 2}
          items={[{ title: 'Thông tin phiếu' }, { title: 'Xem trước' }, { title: 'Phát hành' }]}
        />
        {step.kind === 'form' && (
          <ChargeRequestForm
            periods={newestFirst(periods.data, drafts.data)}
            feeTypes={feeTypes.data ?? []}
            areas={areas.data ?? []}
            companies={companies.data ?? []}
            loading={preview.isPending}
            error={errorTextOrNull(preview.error)}
            initial={draft}
            onPreview={(req, companyDueDate) => {
              setDraft(req);
              // Kỳ do quản trị tạo, chưa bắt đầu: cán bộ xã đặt ngày, xem trước và bắt đầu kỳ (kèm phát hành phiếu theo phạm vi đã chọn).
              const toStart = drafts.data?.find((d) => d.id === req.periodId);
              if (toStart) {
                setStep({ kind: 'start', period: toStart, req, companyDueDate });
                return;
              }
              preview.mutate(req, { onSuccess: (result) => setStep({ kind: 'preview', req, result }) });
            }}
          />
        )}
        {step.kind === 'start' && (
          <>
            <Button style={{ marginBottom: 16 }} onClick={() => setStep({ kind: 'form' })}>
              Quay lại
            </Button>
            <OpenDraftPanel
              period={step.period}
              initial={{ companyDueDate: step.companyDueDate }}
              scope={{
                feeTypeId: step.req.feeTypeId,
                scopeType: step.req.scopeType,
                areaIds: step.req.areaIds,
                companyId: step.req.companyId,
                unitPrice: step.req.unitPrice,
              }}
              onClose={() => setOpen(false)}
            />
          </>
        )}
        {step.kind === 'preview' && (
          <PreviewPanel
            result={step.result}
            publishing={publish.isPending}
            error={errorTextOrNull(publish.error)}
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
        {step.kind === 'done' && (
          <div style={{ marginTop: 16 }}>
            <SkippedList skipped={step.result.skipped} byReason={step.result.skippedByReason} />
          </div>
        )}
      </Drawer>
    </>
  );
}
