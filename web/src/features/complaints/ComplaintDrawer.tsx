import { Alert, Descriptions, Divider, Drawer, Spin, Tag } from 'antd';
import type { ReactNode } from 'react';

import { ApiError } from '../../api/client';
import { formatDate } from '../../shared/format';
import { type ComplaintDetail, useComplaint } from './api';
import { ComplaintTimeline } from './ComplaintTimeline';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_CHANNEL_LABELS, COMPLAINT_STATUS_COLORS, COMPLAINT_STATUS_LABELS } from './labels';

interface Props {
  id: number | null;
  onClose: () => void;
  /** Thao tác theo vai trò, hiện dưới timeline khi khiếu nại chưa giải quyết. */
  actions?: (detail: ComplaintDetail) => ReactNode;
}

/** Chi tiết khiếu nại: thông tin, hạn xử lý, timeline và thao tác của vai trò. */
export function ComplaintDrawer({ id, onClose, actions }: Props) {
  const detail = useComplaint(id);
  const c = detail.data?.complaint;

  return (
    <Drawer open={id !== null} onClose={onClose} width={560} title={c ? `Khiếu nại ${c.code}` : 'Khiếu nại'} destroyOnHidden>
      {detail.isLoading && <Spin />}
      {detail.error && (
        <Alert type="error" showIcon message={detail.error instanceof ApiError ? detail.error.message : 'Không tải được khiếu nại'} />
      )}
      {c && detail.data && (
        <>
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Trạng thái">
              <Tag color={COMPLAINT_STATUS_COLORS[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</Tag>
              {c.overdue && <Tag color="red">Quá hạn xử lý</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Người khiếu nại">
              {c.complainantName}
              {c.complainantPhone ? ` · ${c.complainantPhone}` : ''}
            </Descriptions.Item>
            {c.subjectCode && <Descriptions.Item label="Hộ liên quan">{`${c.subjectCode} · ${c.subjectName}`}</Descriptions.Item>}
            <Descriptions.Item label="Khu vực">{`${c.areaCode} · ${c.areaName}`}</Descriptions.Item>
            <Descriptions.Item label="Kênh · ngày">
              {COMPLAINT_CHANNEL_LABELS[c.channel]} · {formatDate(c.receivedDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Loại">{COMPLAINT_CATEGORY_LABELS[c.category]}</Descriptions.Item>
            <Descriptions.Item label="Tóm tắt">{c.summary}</Descriptions.Item>
            <Descriptions.Item label="Nội dung">
              <span style={{ whiteSpace: 'pre-line' }}>{c.content}</span>
            </Descriptions.Item>
            {c.forwardedCompanyCode && (
              <Descriptions.Item label="Công ty xử lý">
                {`${c.forwardedCompanyCode} · ${c.forwardedCompanyName}`} · hạn {formatDate(c.deadline)}
              </Descriptions.Item>
            )}
            {c.resolution && <Descriptions.Item label="Kết quả">{c.resolution}</Descriptions.Item>}
          </Descriptions>
          <Divider orientation="left">Diễn biến</Divider>
          <ComplaintTimeline events={detail.data.events} />
          {c.status !== 'RESOLVED' && actions?.(detail.data)}
        </>
      )}
    </Drawer>
  );
}
