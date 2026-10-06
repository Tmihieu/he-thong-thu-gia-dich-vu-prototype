import { Modal, Table } from 'antd';
import { useState } from 'react';

import { MoneyText } from '../../../shared/MoneyText';
import { ErrorBlock } from '../../../shared/StateBlock';
import { type HouseholdDebt, useHouseholdDebts } from '../api';

const PAGE_SIZE = 10;

/**
 * Danh sách công nợ hộ (UC-32): khoản Chưa thu của kỳ liền trước kỳ đang xem; hộ nộp ở kỳ sau thì tự hết nợ. Lọc theo công ty, tổ khi
 * mở từ dòng tổ. Phân trang ở máy chủ.
 */
export function HouseholdDebtModal({
  open,
  onClose,
  previousOf,
  companyId,
  areaId,
}: {
  open: boolean;
  onClose: () => void;
  /** Kỳ đang xem; danh sách là nợ của kỳ liền trước nó. */
  previousOf?: number;
  companyId?: number;
  areaId?: number;
}) {
  const [page, setPage] = useState(0);
  const debts = useHouseholdDebts({ previousOf, companyId, areaId, page, size: PAGE_SIZE }, open && previousOf !== undefined);
  return (
    <Modal title="Công nợ tháng trước" open={open} onCancel={onClose} footer={null} width={1200} destroyOnHidden afterClose={() => setPage(0)}>
      {debts.error && <ErrorBlock error={debts.error} onRetry={() => void debts.refetch()} />}
      <Table<HouseholdDebt>
        size="small"
        rowKey="chargeId"
        loading={debts.isLoading}
        dataSource={debts.data?.items ?? []}
        // Mỗi ô một dòng, không rơi chữ; bảng rộng hơn khung thì cuộn ngang.
        scroll={{ x: 'max-content' }}
        onRow={() => ({ style: { whiteSpace: 'nowrap' } })}
        onHeaderRow={() => ({ style: { whiteSpace: 'nowrap' } })}
        locale={{ emptyText: debts.isLoading ? 'Đang tải…' : 'Không có hộ nào còn nợ' }}
        pagination={{
          current: page + 1,
          pageSize: PAGE_SIZE,
          total: debts.data?.total ?? 0,
          showSizeChanger: false,
          hideOnSinglePage: true,
          onChange: (p) => setPage(p - 1),
        }}
        title={() => (debts.data ? `${debts.data.householdCount} hộ, ${debts.data.total} khoản chưa thu của kỳ trước` : 'Hộ còn nợ')}
        columns={[
          { title: 'Hộ', render: (_, d) => `${d.subjectCode} · ${d.subjectName}` },
          { title: 'Địa chỉ', dataIndex: 'subjectAddress' },
          { title: 'Tổ', render: (_, d) => `${d.areaCode} · ${d.areaName}` },
          { title: 'Công ty', dataIndex: 'companyName' },
          { title: 'Kỳ', dataIndex: 'periodLabel' },
          { title: 'Số tiền', dataIndex: 'amount', align: 'right', render: (v: number) => <MoneyText value={v} /> },
          { title: 'Số kỳ nợ', dataIndex: 'debtPeriods', align: 'right' },
        ]}
      />
    </Modal>
  );
}
