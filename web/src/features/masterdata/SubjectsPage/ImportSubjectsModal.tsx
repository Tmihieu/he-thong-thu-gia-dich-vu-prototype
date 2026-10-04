import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Modal, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError, api } from '../../../api/client';
import { type ImportPreview, type ImportRow, useImportSubjects, usePreviewSubjectImport } from '../api';

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Thao tác không thành công. Vui lòng thử lại.';
}

/** Nhập hồ sơ hộ hàng loạt: chọn file .xlsx, xem trước từng dòng kèm lỗi, xác nhận khi không còn dòng lỗi. */
export function ImportSubjectsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const preview = usePreviewSubjectImport();
  const commit = useImportSubjects();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    preview.reset();
    commit.reset();
  };
  const close = () => {
    reset();
    onClose();
  };

  const choose = (f: File | undefined) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    commit.reset();
    preview.mutate(f, { onSuccess: setResult });
  };

  const downloadTemplate = async () => {
    try {
      const blob = await api.blob('/api/masterdata/subjects/import-template');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-nhap-ho.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      void message.error(errorMessage(err));
    }
  };

  const confirm = () => {
    if (!file) return;
    commit.mutate(file, {
      onSuccess: (res) => {
        void message.success(`Đã nhập ${res.created} hồ sơ.`);
        close();
      },
    });
  };

  const canConfirm = !!result && result.invalid === 0 && result.valid > 0;

  return (
    <Modal
      title="Nhập hộ từ file Excel"
      open={open}
      onCancel={close}
      width={900}
      destroyOnClose
      okText={result ? `Nhập ${result.valid} hồ sơ` : 'Nhập'}
      cancelText="Đóng"
      onOk={confirm}
      okButtonProps={{ disabled: !canConfirm, loading: commit.isPending }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Tải file mẫu, điền danh sách hộ rồi tải lên. Hệ thống kiểm tra từng dòng trước; còn dòng lỗi thì không nhập hồ
          sơ nào.
        </Typography.Paragraph>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>
            Tải file mẫu
          </Button>
          <Button icon={<UploadOutlined />} loading={preview.isPending} onClick={() => document.getElementById('subjects-import-file')?.click()}>
            Chọn file .xlsx
          </Button>
          <input
            id="subjects-import-file"
            data-testid="import-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {file ? <Typography.Text>{file.name}</Typography.Text> : null}
        </Space>

        {preview.error ? <Alert type="error" showIcon message={errorMessage(preview.error)} /> : null}
        {commit.error ? <Alert type="error" showIcon message={errorMessage(commit.error)} /> : null}

        {result ? (
          <>
            <Alert
              type={result.invalid === 0 ? 'success' : 'warning'}
              showIcon
              message={`${result.valid} dòng hợp lệ, ${result.invalid} dòng lỗi`}
              description={result.invalid > 0 ? 'Sửa các dòng lỗi trong file rồi chọn lại file.' : undefined}
            />
            <Table<ImportRow>
              rowKey="rowNo"
              size="small"
              dataSource={result.rows}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              columns={[
                { title: 'Dòng', dataIndex: 'rowNo', width: 70 },
                { title: 'Họ tên / đơn vị', dataIndex: 'name' },
                { title: 'Địa chỉ', render: (_, r) => [r.houseNo, r.street].filter(Boolean).join(' ') },
                { title: 'Khu vực', dataIndex: 'areaCode', width: 90 },
                { title: 'Số người', dataIndex: 'memberCount', width: 90 },
                {
                  title: 'Kiểm tra',
                  render: (_, r) =>
                    r.errors.length === 0 ? (
                      <Tag color="success">Hợp lệ</Tag>
                    ) : (
                      <Space direction="vertical" size={0}>
                        {r.errors.map((e) => (
                          <Typography.Text key={e} type="danger">
                            {e}
                          </Typography.Text>
                        ))}
                      </Space>
                    ),
                },
              ]}
            />
          </>
        ) : null}
      </Space>
    </Modal>
  );
}
