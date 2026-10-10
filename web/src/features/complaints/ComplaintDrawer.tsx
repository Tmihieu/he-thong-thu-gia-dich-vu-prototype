import { Descriptions, Divider, Drawer, Image, Steps } from 'antd';
import type { ReactNode } from 'react';

import { formatDate } from '../../shared/format';
import { ErrorBlock, LoadingBlock } from '../../shared/StateBlock';
import { StatusTag } from '../../shared/StatusTag';
import { type ComplaintDetail, useComplaint } from './api';
import { ComplaintTimeline } from './ComplaintTimeline';
import { COMPLAINT_CATEGORY_LABELS, COMPLAINT_CHANNEL_LABELS, COMPLAINT_STATUS_TONES, COMPLAINT_STATUS_LABELS } from './labels';

const STEPS: ComplaintDetail['complaint']['status'][] = ['NEW', 'PROCESSING', 'RESOLVED'];

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
      {detail.isLoading && <LoadingBlock rows={8} />}
      {detail.error && <ErrorBlock error={detail.error} onRetry={() => void detail.refetch()} />}
      {c && detail.data && (
        <>
          <Steps
            size="small"
            style={{ marginBottom: 20 }}
            current={STEPS.indexOf(c.status)}
            items={STEPS.map((s) => ({ title: COMPLAINT_STATUS_LABELS[s] }))}
          />
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Trạng thái">
              <StatusTag tone={COMPLAINT_STATUS_TONES[c.status]}>{COMPLAINT_STATUS_LABELS[c.status]}</StatusTag>
              {c.overdue && <StatusTag tone="danger">Quá hạn xử lý</StatusTag>}
            </Descriptions.Item>
            <Descriptions.Item label="Người khiếu nại">
              {c.complainantName}
              {c.complainantPhone ? ` · ${c.complainantPhone}` : ''}
            </Descriptions.Item>
            {c.subjectCode && <Descriptions.Item label="Hộ liên quan">{`${c.subjectCode} · ${c.subjectName}`}</Descriptions.Item>}
            <Descriptions.Item label="Khu vực">{`${c.areaCode} · ${c.areaName}`}</Descriptions.Item>
            {c.location && <Descriptions.Item label="Nơi xảy ra">{c.location}</Descriptions.Item>}
            <Descriptions.Item label="Kênh · ngày">
              {COMPLAINT_CHANNEL_LABELS[c.channel]} · {formatDate(c.receivedDate)}
            </Descriptions.Item>
            <Descriptions.Item label="Loại">{COMPLAINT_CATEGORY_LABELS[c.category]}</Descriptions.Item>
            <Descriptions.Item label="Tóm tắt">{c.summary}</Descriptions.Item>
            <Descriptions.Item label="Nội dung">
              <span style={{ whiteSpace: 'pre-line' }}>{c.content}</span>
            </Descriptions.Item>
            {c.photoUrls.length > 0 && (
              <Descriptions.Item label={`Ảnh đính kèm (${c.photoUrls.length})`}>
                <Image.PreviewGroup>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {c.photoUrls.map((url, i) => (
                      <Image key={url} src={url} alt={`Ảnh ${i + 1} của khiếu nại ${c.code}`} width={72} height={72}
                        style={{ objectFit: 'cover', borderRadius: 4 }} />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </Descriptions.Item>
            )}
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
