import { Alert, Button, DatePicker, Form, Input, InputNumber, Radio, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { formatMoney } from '../../../shared/format';
import { CHARGE_SCOPE_LABELS, type ChargeScope } from '../../../shared/labels';
import type { Area, Company, Period } from '../../masterdata/api';
import type { FeeType, IssueRequest } from '../api';

interface FormValues {
  periodId?: number;
  feeTypeId?: number;
  scopeType: ChargeScope;
  areaIds?: number[];
  companyId?: number;
  dueDate?: Dayjs | null;
  companyDueDate?: Dayjs | null;
  unitPrice?: number | null;
  note?: string;
}

interface Props {
  periods: Period[];
  feeTypes: FeeType[];
  areas: Area[];
  companies: Company[];
  loading?: boolean;
  error?: string | null;
  /** Giá trị đã nhập lần trước (bấm "Sửa lại" ở bước xem trước) để không phải nhập lại. */
  initial?: IssueRequest | null;
  /** {@code companyDueDate}: hạn công ty nộp xã do cán bộ xã chọn, chỉ có khi kỳ chưa bắt đầu (dự thảo). */
  onPreview: (req: IssueRequest, companyDueDate?: string) => void;
}

/** Form phiếu yêu cầu thu (§10 bước 2): kỳ, loại phí, phạm vi, hạn hộ đóng; bước tiếp theo là Xem trước. */
export function ChargeRequestForm({ periods, feeTypes, areas, companies, loading = false, error, initial, onPreview }: Props) {
  const [form] = Form.useForm<FormValues>();
  const scope = Form.useWatch('scopeType', form) ?? 'ALL';
  const periodId = Form.useWatch('periodId', form);
  const feeTypeId = Form.useWatch('feeTypeId', form);
  const period = periods.find((p) => p.id === periodId);
  const feeType = feeTypes.find((f) => f.id === feeTypeId);
  const isDraft = period?.status === 'DRAFT';
  const companyDue = Form.useWatch('companyDueDate', form);
  const dueLimit = isDraft && companyDue ? companyDue : period ? dayjs(period.dueDate) : undefined;
  const openPeriods = periods.filter((p) => p.status !== 'LOCKED');

  function finish(v: FormValues) {
    onPreview({
      periodId: v.periodId!,
      feeTypeId: v.feeTypeId!,
      scopeType: v.scopeType,
      areaIds: v.scopeType === 'AREAS' ? v.areaIds : undefined,
      companyId: v.scopeType === 'COMPANY' ? v.companyId : undefined,
      dueDate: v.dueDate!.format('YYYY-MM-DD'),
      unitPrice: feeType?.pricingMode === 'FIXED' && v.unitPrice != null ? v.unitPrice : undefined,
      note: v.note?.trim() || undefined,
    }, isDraft && v.companyDueDate ? v.companyDueDate.format('YYYY-MM-DD') : undefined);
  }

  return (
    <Form<FormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      disabled={loading}
      initialValues={
        initial
          ? { ...initial, dueDate: dayjs(initial.dueDate) }
          : { scopeType: 'ALL', feeTypeId: feeTypes.find((f) => f.code === 'ENV')?.id }
      }
      onValuesChange={(changed) => {
        if ('periodId' in changed) {
          // Kỳ chưa bắt đầu: gợi ý hạn công ty nộp xã (ngày 25) và hạn hộ đóng (ngày 20) của kỳ; cán bộ xã chọn lại được.
          const p = periods.find((x) => x.id === changed.periodId);
          form.setFieldsValue({
            companyDueDate: p ? dayjs(p.dueDate) : null,
            ...(p?.status === 'DRAFT' ? { dueDate: dayjs(p.endDate).date(20) } : {}),
          });
        }
      }}
      onFinish={finish}
      style={{ maxWidth: 720 }}
    >
      {error && <Alert type="error" showIcon message={error} role="alert" style={{ marginBottom: 16 }} />}
      <Space size="middle" wrap style={{ display: 'flex' }}>
        <Form.Item label="Kỳ thu" name="periodId" rules={[{ required: true, message: 'Vui lòng chọn kỳ' }]}>
          <Select
            aria-label="Kỳ thu"
            style={{ width: 220 }}
            placeholder="Chọn kỳ"
            options={openPeriods.map((p) => ({ value: p.id, label: `${p.label} (${p.tariffVersionCode})${p.status === 'DRAFT' ? ' · chưa bắt đầu' : ''}` }))}
          />
        </Form.Item>
        <Form.Item label="Loại phí" name="feeTypeId" rules={[{ required: true, message: 'Vui lòng chọn loại phí' }]}>
          <Select
            aria-label="Loại phí"
            style={{ width: 260 }}
            placeholder="Chọn loại phí"
            options={feeTypes.filter((f) => f.active).map((f) => ({ value: f.id, label: f.name }))}
          />
        </Form.Item>
      </Space>
      <Form.Item label="Phạm vi" name="scopeType">
        <Radio.Group
          optionType="button"
          options={(Object.keys(CHARGE_SCOPE_LABELS) as ChargeScope[]).map((value) => ({
            value,
            label: CHARGE_SCOPE_LABELS[value],
          }))}
        />
      </Form.Item>
      {scope === 'AREAS' && (
        <Form.Item label="Các tổ" name="areaIds" rules={[{ required: true, message: 'Vui lòng chọn ít nhất một tổ' }]}>
          <Select
            aria-label="Các tổ"
            mode="multiple"
            optionFilterProp="label"
            placeholder="Chọn tổ"
            options={areas.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
          />
        </Form.Item>
      )}
      {scope === 'COMPANY' && (
        <Form.Item label="Công ty" name="companyId" rules={[{ required: true, message: 'Vui lòng chọn công ty' }]}>
          <Select
            aria-label="Công ty"
            showSearch
            optionFilterProp="label"
            placeholder="Chọn công ty"
            options={companies.map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` }))}
          />
        </Form.Item>
      )}
      <Space size="middle" wrap style={{ display: 'flex' }}>
        <Form.Item
          label="Hạn hộ đóng"
          name="dueDate"
          dependencies={['periodId', 'companyDueDate']}
          rules={[
            { required: true, message: 'Vui lòng chọn hạn đóng' },
            {
              validator(_, value: Dayjs | null | undefined) {
                if (!value || !period) return Promise.resolve();
                if (value.isBefore(dayjs(period.openDate), 'day')) {
                  return Promise.reject(new Error('Hạn đóng không được trước ngày mở kỳ'));
                }
                if (dueLimit && value.isAfter(dueLimit, 'day')) {
                  return Promise.reject(new Error('Hạn đóng không được sau hạn công ty nộp xã'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <DatePicker format="DD/MM/YYYY" placeholder="dd/mm/yyyy" />
        </Form.Item>
        <Form.Item
          label="Hạn công ty nộp về xã"
          name="companyDueDate"
        >
          <DatePicker
            aria-label="Hạn công ty nộp về xã"
            format="DD/MM/YYYY"
            placeholder="dd/mm/yyyy"
            allowClear={false}
            disabled={!isDraft}
            disabledDate={(d) => (period ? d.isBefore(dayjs(period.openDate), 'day') : false)}
          />
        </Form.Item>
        {feeType?.pricingMode === 'FIXED' && (
          <Form.Item
            label="Đơn giá (đ)"
            name="unitPrice"
            extra={`Để trống thì dùng giá mặc định ${formatMoney(feeType.defaultPrice)}`}
            rules={[{ type: 'number', min: 1, message: 'Đơn giá phải lớn hơn 0' }]}
          >
            <InputNumber<number>
              aria-label="Đơn giá"
              min={1}
              step={1000}
              style={{ width: 200 }}
              formatter={(v) => (v === undefined || v === null || `${v}` === '' ? '' : Number(v).toLocaleString('vi-VN'))}
              parser={(v) => Number((v ?? '').replace(/\D/g, ''))}
            />
          </Form.Item>
        )}
      </Space>
      <Form.Item label="Ghi chú" name="note">
        <Input.TextArea rows={2} maxLength={2000} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Xem trước
      </Button>
    </Form>
  );
}
