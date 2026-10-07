import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, App, Button, Modal, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { api } from '../../../api/client';
import { errorText } from '../../../shared/errorText';
import { type StreetImportPreview, type StreetImportRow, useImportStreets, usePreviewStreetImport } from '../api';

/**
 * Nhập danh mục đường từ Excel: dùng file mẫu hoặc tải thẳng file nháp xã đã duyệt (dòng "Bỏ" và cầu bị bỏ qua,
 * có tên mới thì đổi tên và giữ tên cũ). Xem trước từng dòng; còn dòng lỗi thì không nhập gì.
 */
export function ImportStreetsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const preview = usePreviewStreetImport();
  const commit = useImportStreets();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<StreetImportPreview | null>(null);

  const close = () => {
    setFile(null);
    setResult(null);
    preview.reset();
    commit.reset();
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
      const url = URL.createObjectURL(await api.blob('/api/masterdata/streets/import-template'));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-danh-muc-duong.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      void message.error(errorText(err));
    }
  };

  const confirm = () => {
    if (!file) return;
    commit.mutate(file, {
      onSuccess: (r) => {
        void message.success(`Đã thêm ${r.added}, cập nhật ${r.updated} đường/hẻm.`);
        close();
      },
    });
  };

  const changes = result ? result.added + result.updated : 0;

  return (
    <Modal
      title="Nhập danh mục đường từ Excel"
      open={open}
      onCancel={close}
      width={1000}
      destroyOnHidden
      okText={result ? `Nhập (${result.added} thêm, ${result.updated} cập nhật)` : 'Nhập'}
      cancelText="Đóng"
      onOk={confirm}
      okButtonProps={{ disabled: !result || result.invalid > 0 || changes === 0, loading: commit.isPending }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Tải file mẫu, hoặc tải thẳng file nháp danh mục đường xã đã duyệt. Đường đã có thì chỉ bổ sung ấp và tên cũ.
        </Typography.Paragraph>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => void downloadTemplate()}>
            Tải file mẫu
          </Button>
          <Button icon={<UploadOutlined />} loading={preview.isPending} onClick={() => document.getElementById('streets-import-file')?.click()}>
            Chọn file .xlsx
          </Button>
          <input
            id="streets-import-file"
            data-testid="streets-import-file"
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

        {preview.error ? <Alert type="error" showIcon message={errorText(preview.error)} /> : null}
        {commit.error ? <Alert type="error" showIcon message={errorText(commit.error)} /> : null}

        {result ? (
          <>
            <Alert
              type={result.invalid === 0 ? 'success' : 'warning'}
              showIcon
              message={`${result.added} thêm mới, ${result.updated} cập nhật, ${result.skipped} bỏ qua, ${result.invalid} dòng lỗi`}
              description={result.invalid > 0 ? 'Sửa các dòng lỗi trong file rồi chọn lại file.' : undefined}
            />
            <Table<StreetImportRow>
              rowKey="rowNo"
              size="small"
              dataSource={result.rows}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              columns={[
                { title: 'Dòng', dataIndex: 'rowNo', width: 60 },
                { title: 'Tên', dataIndex: 'name' },
                { title: 'Loại', dataIndex: 'kind', width: 70 },
                { title: 'Ấp', dataIndex: 'areas' },
                { title: 'Tên cũ', dataIndex: 'oldName' },
                {
                  title: 'Kết quả',
                  render: (_, r) =>
                    r.errors.length === 0 ? (
                      <Tag color={r.action.startsWith('Bỏ qua') ? 'default' : 'success'}>{r.action}</Tag>
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
