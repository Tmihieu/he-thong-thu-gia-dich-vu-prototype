import { Modal, Table } from 'antd';
import { useState } from 'react';

import { MoneyText } from '../../../shared/MoneyText';
import { ErrorBlock } from '../../../shared/StateBlock';
import { type HouseholdDebt, useHouseholdDebts } from '../api';

const PAGE_SIZE = 10;

/**
 * Danh sách công nợ hộ (UC-32): khoản Chưa thu của kỳ đã khóa; hộ nộp ở kỳ sau thì tự hết nợ. Lọc theo công ty, tổ khi
 * mở từ dòng tổ. Phân trang ở máy chủ.
 */
export function HouseholdDebtModal({
  open,
  onClose,
  companyId,
  areaId,
}: {
  open: boolean;
  onClose: () => void;
  companyId?: number;
  areaId?: number;
}) {
  const [page, setPage] = useState(0);
  const debts = useHouseholdDebts({ companyId, areaId, page, size: PAGE_SIZE }, open);
  return (
    <Modal title="Công nợ hộ" open={open} onCancel={onClose} footer={null} width={960} destroyOnHidden afterClose={() => setPage(0)}>
      {debts.error && <ErrorBlock error={debts.error} onRetry={() => void debts.refetch()} />}
      <Table<HouseholdDebt>
        size="small"
        rowKey="chargeId"
        loading={debts.isLoading}
        dataSource={debts.data?.items ?? []}
        scroll={{ x: 760 }}
        locale={{ emptyText: debts.isLoading ? 'Đang tải…' : 'Không có hộ nào còn nợ' }}
        pagination={{
          current: page + 1,
          pageSize: PAGE_SIZE,
          total: debts.data?.total ?? 0,
          showSizeChanger: false,
          hideOnSinglePage: true,
          onChange: (p) => setPage(p - 1),
        }}
        title={() => (debts.data ? `${debts.data.householdCount} hộ, ${debts.data.total} khoản chưa thu của kỳ đã khóa` : 'Hộ còn nợ')}
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
