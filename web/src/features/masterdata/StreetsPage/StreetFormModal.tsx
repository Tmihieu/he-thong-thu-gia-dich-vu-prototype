import { Alert, Form, Input, Modal, Radio, Select } from 'antd';

import { errorTextOrNull } from '../../../shared/errorText';
import { type Area, type Street, useCreateStreet, useUpdateStreet } from '../api';

interface FormValues {
  kind: Street['kind'];
  name: string;
  parentId?: number;
  areaIds: number[];
  status: Street['status'];
  renameNote?: string;
}

/** Giá trị gợi sẵn khi thêm từ nhóm hồ sơ chờ xác minh. */
export interface StreetDraft {
  name: string;
  kind?: Street['kind'];
  parentId?: number;
  areaIds?: number[];
}

interface Props {
  open: boolean;
  /** Có thì sửa, không thì thêm mới. */
  street?: Street;
  draft?: StreetDraft;
  areas: Area[];
  catalog: Street[];
  onClose: () => void;
  onSaved?: (street: Street) => void;
}

/** Thêm/sửa đường hoặc hẻm. Đổi tên thì tên cũ được giữ (kèm văn bản) để tìm và đối chiếu địa chỉ cũ. */
export function StreetFormModal({ open, street, draft, areas, catalog, onClose, onSaved }: Props) {
  const [form] = Form.useForm<FormValues>();
  const create = useCreateStreet();
  const update = useUpdateStreet();
  const kind = Form.useWatch('kind', form);
  const name = Form.useWatch('name', form);
  const renaming = !!street && !!name && name.trim() !== street.name;
  const mutation = street ? update : create;

  const initialValues: Partial<FormValues> = street
    ? { kind: street.kind, name: street.name, parentId: street.parentId ?? undefined, areaIds: street.areaIds, status: street.status }
    : { kind: draft?.kind ?? 'STREET', name: draft?.name, parentId: draft?.parentId, areaIds: draft?.areaIds ?? [], status: 'ACTIVE' };

  const save = (v: FormValues) => {
    const done = { onSuccess: (s: Street) => { onSaved?.(s); onClose(); } };
    if (street) {
      update.mutate(
        { id: street.id, body: { name: v.name.trim(), areaIds: v.areaIds, status: v.status, renameNote: renaming ? v.renameNote?.trim() || undefined : undefined } },
        done,
      );
    } else {
      create.mutate({ name: v.name.trim(), kind: v.kind, parentId: v.kind === 'ALLEY' ? v.parentId : undefined, areaIds: v.areaIds }, done);
    }
  };

  const error = errorTextOrNull(mutation.error, 'Không lưu được. Vui lòng thử lại.');

  return (
    <Modal
      title={street ? `Sửa ${street.displayName}` : 'Thêm đường / hẻm'}
      open={open}
      destroyOnHidden
      onCancel={onClose}
      afterOpenChange={(o) => !o && mutation.reset()}
      onOk={() => form.submit()}
      okText="Lưu"
      cancelText="Hủy"
      confirmLoading={mutation.isPending}
    >
      <Form<FormValues> name="street" form={form} layout="vertical" preserve={false} initialValues={initialValues} onFinish={save}>
        {error && <Alert role="alert" type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {!street && (
          <Form.Item name="kind" label="Loại">
            <Radio.Group options={[{ value: 'STREET', label: 'Đường' }, { value: 'ALLEY', label: 'Hẻm' }]} optionType="button" />
          </Form.Item>
        )}
        {!street && kind === 'ALLEY' && (
          <Form.Item name="parentId" label="Thuộc đường" rules={[{ required: true, message: 'Vui lòng chọn đường mà hẻm nằm trên' }]}>
            <Select
              aria-label="Thuộc đường"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn đường"
              options={catalog.filter((s) => s.kind === 'STREET').map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
        )}
        <Form.Item
          name="name"
          label={(street?.kind ?? kind) === 'ALLEY' ? 'Tên hẻm' : 'Tên đường'}
          extra={(street?.kind ?? kind) === 'ALLEY' ? 'VD: Hẻm 19 (không cần ghi lại tên đường).' : undefined}
          rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên' }]}
        >
          <Input maxLength={200} aria-label="Tên" />
        </Form.Item>
        {renaming && (
          <Form.Item name="renameNote" label="Văn bản đổi tên" extra={`Tên cũ "${street?.name}" vẫn được giữ để tìm và đối chiếu địa chỉ cũ.`}>
            <Input maxLength={255} placeholder="VD: NQ 380/NQ-HĐND ngày 24/7/2025" />
          </Form.Item>
        )}
        <Form.Item name="areaIds" label="Ấp đi qua" extra="Đường dài chọn nhiều ấp. Hẻm có thể để trống (theo đường).">
          <Select
            aria-label="Ấp đi qua"
            mode="multiple"
            optionFilterProp="label"
            placeholder="Chọn ấp"
            options={areas.map((a) => ({ value: a.id, label: a.name }))}
          />
        </Form.Item>
        {street && (
          <Form.Item name="status" label="Trạng thái" extra="Ngừng dùng: không chọn được cho hồ sơ mới; hồ sơ đang dùng giữ nguyên.">
            <Select aria-label="Trạng thái" options={[{ value: 'ACTIVE', label: 'Đang dùng' }, { value: 'INACTIVE', label: 'Ngừng dùng' }]} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
