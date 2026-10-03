import { Alert, App, Button, Form, Input, InputNumber, Modal, Select, Table, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../api/client';
import { StatusTag } from '../../shared/StatusTag';
import { errorText } from '../../shared/errorText';
import { type Area, type District, useAreas, useDistricts, useUpdateArea, useUpdateDistrict } from './api';

export function LocationsSettings() {
  const { message } = App.useApp();
  const districts = useDistricts();
  const areas = useAreas();
  const updateDistrict = useUpdateDistrict();
  const updateArea = useUpdateArea();
  const [district, setDistrict] = useState<District | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [districtId, setDistrictId] = useState<number>();
  const [districtForm] = Form.useForm<Pick<District, 'name' | 'note' | 'sortOrder'>>();
  const [areaForm] = Form.useForm<Pick<Area, 'name' | 'status'>>();
  const error = (e: unknown) => e instanceof ApiError ? e.message : 'Không thể lưu thay đổi. Vui lòng thử lại.';
  const nameRules = [{ required: true, whitespace: true, message: 'Vui lòng nhập tên' }];

  return <>
    {(districts.error || areas.error) && <Alert type="error" showIcon message={errorText(districts.error ?? areas.error, 'Không thể tải danh sách. Vui lòng thử lại.')} />}
    <Table<District>
      rowKey="id" dataSource={districts.data ?? []} loading={districts.isLoading} pagination={false}
      columns={[
        { title: 'Mã địa bàn', dataIndex: 'code' },
        { title: 'Tên địa bàn', dataIndex: 'name' },
        { title: 'Thứ tự', dataIndex: 'sortOrder' },
        { title: 'Thao tác', align: 'right', render: (_, d) => <Button size="small" aria-label={`Sửa địa bàn ${d.code}`} onClick={() => {
          updateDistrict.reset(); setDistrict(d);
        }}>Sửa</Button> },
      ]}
    />
    <Typography.Title level={5}>Khu vực / tổ dân phố</Typography.Title>
    <Select allowClear aria-label="Lọc địa bàn" placeholder="Tất cả địa bàn" value={districtId} onChange={setDistrictId}
      style={{ width: 240, marginBottom: 16 }} options={(districts.data ?? []).map(d => ({ value: d.id, label: d.name }))} />
    <Table<Area>
      rowKey="id" loading={areas.isLoading} pagination={{ pageSize: 12, hideOnSinglePage: true }}
      dataSource={(areas.data ?? []).filter(a => districtId === undefined || a.districtId === districtId)}
      columns={[
        { title: 'Mã khu vực', dataIndex: 'code' },
        { title: 'Tên khu vực', dataIndex: 'name' },
        { title: 'Địa bàn', render: (_, a) => districts.data?.find(d => d.id === a.districtId)?.name ?? a.districtCode },
        { title: 'Trạng thái', render: (_, a) => a.status === 'ACTIVE' ? <StatusTag color="green">Hoạt động</StatusTag> : <StatusTag>Tạm ngưng</StatusTag> },
        { title: 'Thao tác', align: 'right', render: (_, a) => <Button size="small" aria-label={`Sửa khu vực ${a.code}`} onClick={() => {
          updateArea.reset(); setArea(a);
        }}>Sửa</Button> },
      ]}
    />
    <Modal title={`Sửa địa bàn ${district?.code ?? ''}`} open={!!district} destroyOnHidden onCancel={() => setDistrict(null)}
      onOk={() => districtForm.submit()} okText="Lưu thay đổi" cancelText="Hủy" confirmLoading={updateDistrict.isPending}>
      <Form name="district" form={districtForm} layout="vertical" preserve={false} initialValues={district ?? {}} onFinish={values => {
        if (district) updateDistrict.mutate({ id: district.id, body: { name: values.name.trim(), note: values.note?.trim() || null, sortOrder: values.sortOrder ?? null } },
          { onSuccess: () => { setDistrict(null); message.success('Đã lưu địa bàn'); } });
      }}>
        {updateDistrict.error && <Alert role="alert" type="error" message={error(updateDistrict.error)} />}
        <Form.Item name="name" label="Tên địa bàn" rules={nameRules}><Input maxLength={100} /></Form.Item>
        <Form.Item name="sortOrder" label="Thứ tự hiển thị"><InputNumber min={0} precision={0} max={2147483647} /></Form.Item>
        <Form.Item name="note" label="Ghi chú"><Input.TextArea rows={2} maxLength={2000} /></Form.Item>
      </Form>
    </Modal>
    <Modal title={`Sửa khu vực ${area?.code ?? ''}`} open={!!area} destroyOnHidden onCancel={() => setArea(null)}
      onOk={() => areaForm.submit()} okText="Lưu thay đổi" cancelText="Hủy" confirmLoading={updateArea.isPending}>
      <Form name="area" form={areaForm} layout="vertical" preserve={false} initialValues={area ?? {}} onFinish={values => {
        if (area) updateArea.mutate({ id: area.id, body: { name: values.name.trim(), status: values.status } },
          { onSuccess: () => { setArea(null); message.success('Đã lưu khu vực'); } });
      }}>
        {updateArea.error && <Alert role="alert" type="error" message={error(updateArea.error)} />}
        <Form.Item name="name" label="Tên khu vực" rules={nameRules}><Input maxLength={100} /></Form.Item>
        <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}><Select options={[
          { value: 'ACTIVE', label: 'Hoạt động' }, { value: 'INACTIVE', label: 'Tạm ngưng' },
        ]} /></Form.Item>
      </Form>
    </Modal>
  </>;
}
