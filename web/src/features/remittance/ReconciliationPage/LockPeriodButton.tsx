import { LockOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Popconfirm } from 'antd';

import { api } from '../../../api/client';
import { errorText } from '../../../shared/errorText';
import { StatusTag } from '../../../shared/StatusTag';
import { masterdataKeys, type Period, usePeriods } from '../../masterdata/api';

/**
 * Khóa kỳ (cán bộ xã, G1; UC-39): máy chủ chặn và nêu lý do khi còn công ty chưa nộp đủ phải nộp xã (kèm danh sách công ty
 * và số nợ) hoặc kỳ còn khoản hộ chưa đóng mà chưa đến hạn nộp. Khoản hộ chưa đóng khi khóa thành công nợ của hộ.
 * Lý do chặn hiện thông báo nổi tự ẩn (không chen vào thanh tiêu đề, không phải bấm tắt).
 */
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
    onError: (e) => {
      message.error({ content: errorText(e, 'Không khóa được kỳ. Vui lòng thử lại.'), duration: 8 });
    },
  });

  if (!period) return null;
  if (period.status === 'LOCKED') {
    return (
      <StatusTag tone="neutral">
        <LockOutlined /> Kỳ đã khóa
      </StatusTag>
    );
  }
  return (
    <Popconfirm
      title={`Khóa kỳ ${period.label}?`}
      description="Sau khi khóa không phát hành khoản hay lập phiếu thu cho kỳ này được nữa. Khoản hộ chưa đóng thành công nợ của hộ: hộ nộp ở kỳ sau, tiền tính vào kỳ đang thu."
      okText="Khóa kỳ"
      cancelText="Hủy"
      onConfirm={() => lock.mutate()}
      >
      <Button icon={<LockOutlined />} loading={lock.isPending} disabled={period.status !== 'COLLECTING'}>
        Khóa kỳ
      </Button>
    </Popconfirm>
  );
}
