import { PlusOutlined } from '@ant-design/icons';
import { Alert, App, Button, DatePicker, Form, Input, Modal, Radio, Select, Space, Upload, type UploadFile } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import type { CreateComplaintRequest } from './api';
import { COMPLAINT_CATEGORY_LABELS } from './labels';

type Category = CreateComplaintRequest['category'];

export const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface AreaOption {
  id: number;
  code: string;
  name: string;
}

export interface SubjectOption {
  id: number;
  code: string;
  name: string;
  areaId: number;
}

interface CreateValues {
  complainantName: string;
  complainantPhone?: string;
  areaId?: number;
  subjectId?: number;
  channel: 'PHONE' | 'IN_PERSON';
  category?: Category;
  summary: string;
  content: string;
  receivedDate?: Dayjs | null;
  photos?: UploadFile<{ url: string }>[];
}

interface CreateProps {
  open: boolean;
  areas: AreaOption[];
  subjects: SubjectOption[];
  submitting?: boolean;
  error?: string | null;
  /** Tải một ảnh lên, trả URL để gắn vào khiếu nại. */
  onUploadPhoto: (file: File) => Promise<string>;
  onSubmit: (req: CreateComplaintRequest) => void;
  onCancel: () => void;
}

/** Xã ghi nhận khiếu nại nhận qua điện thoại / trực tiếp. Chọn hộ thì tự điền khu vực. */
export function CreateComplaintForm({ open, areas, subjects, submitting, error, onUploadPhoto, onSubmit, onCancel }: CreateProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<CreateValues>();
  const areaId = Form.useWatch('areaId', form);

  function finish(v: CreateValues) {
    const photoUrls = (v.photos ?? []).flatMap((f) => (f.status === 'done' && f.response ? [f.response.url] : []));
    onSubmit({
      complainantName: v.complainantName.trim(),
      complainantPhone: v.complainantPhone?.trim() || undefined,
      areaId: v.areaId,
      subjectId: v.subjectId,
      channel: v.channel,
      category: v.category!,
      summary: v.summary.trim(),
      content: v.content.trim(),
      receivedDate: v.receivedDate?.format('YYYY-MM-DD'),
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
  }

  return (
    <Modal
      title="Ghi nhận khiếu nại"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Ghi nhận"
      cancelText="Hủy"
      confirmLoading={submitting}
      width={640}
      destroyOnHidden
    >
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      <Form<CreateValues>
        form={form}
        layout="vertical"
        preserve={false}
        initialValues={{ channel: 'PHONE', receivedDate: dayjs() }}
        onFinish={finish}
      >
        <Space.Compact block style={{ gap: 12 }}>
          <Form.Item
            label="Người khiếu nại"
            name="complainantName"
            style={{ flex: 1 }}
            rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên người khiếu nại' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label="Số điện thoại"
            name="complainantPhone"
            style={{ flex: 1 }}
            rules={[{ pattern: /^0\d{9}$/, message: 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0' }]}
          >
            <Input maxLength={10} inputMode="tel" />
          </Form.Item>
        </Space.Compact>
        <Form.Item label="Hộ / đối tượng liên quan" name="subjectId" extra="Nếu biết; chọn hộ thì tự điền khu vực">
          <Select
            allowClear
            showSearch
            placeholder="Tìm theo mã hoặc tên hộ"
            optionFilterProp="label"
            options={subjects
              .filter((s) => areaId === undefined || s.areaId === areaId)
              .map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
            onChange={(id?: number) => {
              const s = subjects.find((x) => x.id === id);
              if (s) form.setFieldValue('areaId', s.areaId);
            }}
          />
        </Form.Item>
        <Form.Item label="Khu vực" name="areaId" rules={[{ required: true, message: 'Vui lòng chọn khu vực' }]}>
          <Select
            showSearch
            placeholder="Chọn khu vực"
            optionFilterProp="label"
            options={areas.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}` }))}
            onChange={() => {
              const s = subjects.find((x) => x.id === form.getFieldValue('subjectId'));
              if (s && s.areaId !== form.getFieldValue('areaId')) form.setFieldValue('subjectId', undefined);
            }}
          />
        </Form.Item>
        <Form.Item label="Kênh tiếp nhận" name="channel" rules={[{ required: true }]}>
          <Radio.Group
            optionType="button"
            options={[
              { value: 'PHONE', label: 'Điện thoại' },
              { value: 'IN_PERSON', label: 'Trực tiếp tại xã' },
            ]}
          />
        </Form.Item>
        <Form.Item label="Loại" name="category" rules={[{ required: true, message: 'Vui lòng chọn loại khiếu nại' }]}>
          <Select
            placeholder="Chọn loại"
            options={(Object.keys(COMPLAINT_CATEGORY_LABELS) as Category[]).map((k) => ({ value: k, label: COMPLAINT_CATEGORY_LABELS[k] }))}
          />
        </Form.Item>
        <Form.Item label="Tóm tắt" name="summary" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tóm tắt' }]}>
          <Input maxLength={200} showCount placeholder="Ví dụ: Tổ 7 chưa được thu gom 2 ngày" />
        </Form.Item>
        <Form.Item label="Nội dung" name="content" rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập nội dung' }]}>
          <Input.TextArea rows={4} maxLength={4000} />
        </Form.Item>
        <Form.Item label="Ngày tiếp nhận" name="receivedDate" rules={[{ required: true, message: 'Vui lòng chọn ngày tiếp nhận' }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} disabledDate={(d) => d.isAfter(dayjs(), 'day')} />
        </Form.Item>
        <Form.Item
          label="Ảnh đính kèm"
          name="photos"
          valuePropName="fileList"
          getValueFromEvent={(e: { fileList: UploadFile[] }) => e.fileList}
          extra={`Tối đa ${MAX_PHOTOS} ảnh JPEG, PNG hoặc WebP, mỗi ảnh không quá 5 MB`}
          rules={[
            {
              validator: (_, files?: UploadFile[]) =>
                files?.some((f) => f.status === 'uploading')
                  ? Promise.reject(new Error('Vui lòng chờ ảnh tải xong'))
                  : files?.some((f) => f.status === 'error')
                    ? Promise.reject(new Error('Có ảnh tải lên không thành công, vui lòng xóa ảnh đó hoặc thử lại'))
                    : Promise.resolve(),
            },
          ]}
        >
          <Upload
            listType="picture-card"
            accept={PHOTO_TYPES.join(',')}
            maxCount={MAX_PHOTOS}
            multiple
            beforeUpload={(file) => {
              if (!PHOTO_TYPES.includes(file.type)) {
                void message.error('Chỉ nhận ảnh JPEG, PNG hoặc WebP.');
                return Upload.LIST_IGNORE;
              }
              if (file.size > MAX_PHOTO_BYTES) {
                void message.error('Ảnh vượt quá 5 MB.');
                return Upload.LIST_IGNORE;
              }
              return true;
            }}
            customRequest={({ file, onSuccess, onError }) => {
              onUploadPhoto(file as File).then(
                (url) => onSuccess?.({ url }),
                (err: unknown) => onError?.(err instanceof Error ? err : new Error('Tải ảnh thất bại')),
              );
            }}
          >
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 4 }}>Thêm ảnh</div>
            </div>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
}

interface TextActionProps {
  /** Tên form: id các ô nhập không trùng khi một màn có nhiều form một ô chữ. */
  name?: string;
  label: string;
  okText: string;
  requiredMessage: string;
  maxLength: number;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (text: string) => void;
}

/** Form một ô chữ bắt buộc: công ty phản hồi, xã đóng khiếu nại. */
export function TextActionForm({ name, label, okText, requiredMessage, maxLength, submitting, error, onSubmit }: TextActionProps) {
  const [form] = Form.useForm<{ text: string }>();
  return (
    <Form name={name} form={form} layout="vertical" onFinish={(v) => onSubmit(v.text.trim())}>
      {error && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message={error} />}
      <Form.Item label={label} name="text" rules={[{ required: true, whitespace: true, message: requiredMessage }]}>
        <Input.TextArea rows={3} maxLength={maxLength} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={submitting}>
        {okText}
      </Button>
    </Form>
  );
}
