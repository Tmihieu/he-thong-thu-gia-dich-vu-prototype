import { DownloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';

import { ApiError } from '../../api/client';
import { PROGRESS_LABELS, RECONCILIATION_LABELS } from '../../shared/labels';
import { MoneyText } from '../../shared/MoneyText';
import { PeriodSelect } from '../masterdata/PeriodSelect';
import { usePeriods } from '../masterdata/api';
import { type AreaProgress, type LedgerRow, useAreaProgress, useCompanyLedger } from '../remittance/api';

/** Tải CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). */
function downloadCsv(fileName: string, header: string[], rows: (string | number)[][]) {
  const cell = (v: string | number) => (typeof v === 'number' ? String(v) : `"${v.replace(/"/g, '""')}"`);
  const text = [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Báo cáo tổng hợp kỳ cho lãnh đạo (T59): lấy nguyên sổ công ty–kỳ và tiến độ theo tổ, không tự tính lại; xem và xuất.
 * Không có bước xác nhận báo cáo, không chốt kỳ (quyết định 29/09/2026).
 */
export function LeaderReportPage() {
  const [periodId, setPeriodId] = useState<number>();
  const periods = usePeriods();
  const ledger = useCompanyLedger(periodId);
  const areas = useAreaProgress(periodId);
  const code = periods.data?.find((p) => p.id === periodId)?.code ?? '';
  const rows = ledger.data ?? [];
  const areaRows = areas.data ?? [];
  const error = ledger.error ?? areas.error;

  function exportCompanies() {
    downloadCsv(`bao-cao-cong-ty-${code}.csv`,
      ['Công ty', 'Tên công ty', 'Phải thu', 'Điều chỉnh kỳ trước', 'Đã thu', 'Đã hoàn', 'Đã nộp về xã', 'Còn phải nộp',
        'Nợ kỳ trước', 'Tỷ lệ thu (%)', 'Tỷ lệ nộp (%)', 'Tiến độ', 'Đối soát'],
      rows.map((r) => [r.companyCode, r.companyName, r.due, r.adjustment, r.collected, r.refunded, r.received, r.remaining,
        r.previousDebt, r.collectionRate, r.remittedRate, PROGRESS_LABELS[r.progress], RECONCILIATION_LABELS[r.reconciliation]]));
  }

  function exportAreas() {
    downloadCsv(`bao-cao-to-${code}.csv`,
      ['Tổ', 'Tên tổ', 'Địa bàn', 'Công ty', 'Số khoản', 'Đã thu đủ', 'Phải thu', 'Đã thu', 'Tỷ lệ thu (%)'],
      areaRows.map((a) => [a.areaCode, a.areaName, a.districtCode, a.companyCode ?? '', a.chargeCount, a.paidCount, a.due,
        a.collected, a.collectionRate]));
  }

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Báo cáo tổng hợp
      </Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <PeriodSelect value={periodId} onChange={setPeriodId} />
      </Space>
      {error && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={error instanceof ApiError ? error.message : 'Không tải được số liệu'} />}
      <Card
        size="small"
        className="section-card"
        title="Thu – nộp theo công ty"
        extra={
          <Button icon={<DownloadOutlined />} disabled={rows.length === 0} onClick={exportCompanies}>
            Xuất báo cáo
          </Button>
        }
      >
        <Table<LedgerRow>
          size="small"
          rowKey="companyId"
          loading={ledger.isLoading}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 1100 }}
          locale={{ emptyText: 'Kỳ này chưa có số liệu' }}
          summary={() =>
            rows.length > 0 && (
              <Table.Summary.Row style={{ fontWeight: 700 }}>
                <Table.Summary.Cell index={0}>Tổng</Table.Summary.Cell>
                {(['due', 'adjustment', 'collected', 'refunded', 'received', 'remaining', 'previousDebt'] as const).map((k, i) => (
                  <Table.Summary.Cell key={k} index={i + 1} align="right">
                    <MoneyText value={rows.reduce((t, r) => t + r[k], 0)} />
                  </Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={8} colSpan={2} />
              </Table.Summary.Row>
            )
          }
          columns={[
            { title: 'Công ty', render: (_, r) => <span title={r.companyName}>{r.companyCode}</span> },
            { title: 'Phải thu', align: 'right', render: (_, r) => <MoneyText value={r.due} /> },
            { title: 'Điều chỉnh kỳ trước', align: 'right', render: (_, r) => (r.adjustment ? <MoneyText value={r.adjustment} /> : '—') },
            { title: 'Đã thu', align: 'right', render: (_, r) => <MoneyText value={r.collected} /> },
            { title: 'Đã hoàn', align: 'right', render: (_, r) => (r.refunded ? <MoneyText value={r.refunded} /> : '—') },
            { title: 'Đã nộp về xã', align: 'right', render: (_, r) => <MoneyText value={r.received} /> },
            { title: 'Còn phải nộp', align: 'right', render: (_, r) => <MoneyText value={r.remaining} strong /> },
            { title: 'Nợ kỳ trước', align: 'right', render: (_, r) => (r.previousDebt ? <MoneyText value={r.previousDebt} /> : '—') },
            { title: 'Tiến độ', render: (_, r) => <Tag>{PROGRESS_LABELS[r.progress]}</Tag> },
            { title: 'Đối soát', render: (_, r) => RECONCILIATION_LABELS[r.reconciliation] },
          ]}
        />
      </Card>
      <Card
        size="small"
        className="section-card"
        style={{ marginTop: 16 }}
        title="Tiến độ thu theo tổ"
        extra={
          <Button icon={<DownloadOutlined />} disabled={areaRows.length === 0} onClick={exportAreas}>
            Xuất báo cáo
          </Button>
        }
      >
        <Table<AreaProgress>
          size="small"
          rowKey={(a) => `${a.areaId}-${a.companyId ?? 0}`}
          loading={areas.isLoading}
          dataSource={areaRows}
          pagination={{ pageSize: 30, hideOnSinglePage: true }}
          columns={[
            { title: 'Tổ', render: (_, a) => `${a.areaCode} · ${a.areaName}` },
            { title: 'Địa bàn', dataIndex: 'districtCode' },
            { title: 'Công ty', render: (_, a) => a.companyCode ?? <Tag color="orange">Chưa có công ty</Tag> },
            { title: 'Hộ đã thu', align: 'right', render: (_, a) => `${a.paidCount}/${a.chargeCount}` },
            { title: 'Phải thu', align: 'right', render: (_, a) => <MoneyText value={a.due} /> },
            { title: 'Đã thu', align: 'right', render: (_, a) => <MoneyText value={a.collected} /> },
            { title: 'Tỷ lệ thu', align: 'right', render: (_, a) => `${a.collectionRate.toLocaleString('vi-VN')}%` },
          ]}
        />
      </Card>
    </>
  );
}
