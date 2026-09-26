import { LockOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Popconfirm, Tag } from 'antd';

import { api, ApiError } from '../../../api/client';
import { masterdataKeys, type Period, usePeriods } from '../../masterdata/api';

/** Khóa kỳ (cán bộ xã, G1): còn công ty chưa nộp đủ thì máy chủ trả lý do kèm danh sách công ty và số nợ. */
export function LockPeriodButton({ periodId }: { periodId: number }) {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const periods = usePeriods();
  const period = periods.data?.find((p) => p.id === periodId);
  const lock = useMutation({
    mutationFn: () => api.post<Period>(`/api/remittance/periods/${periodId}/lock`),
    onSuccess: (p) => {
      void qc.invalidateQueries({ queryKey: masterdataKeys.periods });
      message.success(`Đã khóa kỳ ${p.label}`);
    },
  });

  if (!period) return null;
  if (period.status === 'LOCKED') {
    return (
      <Tag icon={<LockOutlined />} color="default">
        Kỳ đã khóa
      </Tag>
    );
  }
  return (
    <>
      <Popconfirm
        title={`Khóa kỳ ${period.label}?`}
        description="Sau khi khóa không phát hành khoản, ghi thu hay lập phiếu thu cho kỳ này được nữa."
        okText="Khóa kỳ"
        cancelText="Hủy"
        onConfirm={() => lock.mutate()}
      >
        <Button icon={<LockOutlined />} loading={lock.isPending} disabled={period.status !== 'COLLECTING'}>
          Khóa kỳ
        </Button>
      </Popconfirm>
      {lock.error && (
        <Alert
          type="error"
          showIcon
          role="alert"
          style={{ marginTop: 8, width: '100%' }}
          message={lock.error instanceof ApiError ? lock.error.message : 'Không khóa được kỳ. Vui lòng thử lại.'}
          closable
          onClose={() => lock.reset()}
        />
      )}
    </>
  );
}
