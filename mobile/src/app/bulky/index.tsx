import { router } from 'expo-router';

import { BulkyRow } from '../../features/bulky/BulkyCard';
import { useBulkyRequests } from '../../features/citizen/api';
import { Button, EmptyState, ListGroup, ListScreen } from '../../shared/ui';

export default function BulkyListScreen() {
  const list = useBulkyRequests();

  return (
    <ListScreen
      data={list.data}
      keyOf={(r) => String(r.id)}
      render={(r) => (
        <ListGroup>
          <BulkyRow r={r} />
        </ListGroup>
      )}
      isPending={list.isPending}
      error={list.error}
      fallbackError="Không tải được danh sách yêu cầu."
      onRetry={() => void list.refetch()}
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
      empty={<EmptyState icon="cube-outline" title="Bạn chưa đăng ký thu gom rác cồng kềnh" message="Nệm, tủ, sofa, thiết bị điện lớn, xà bần: công ty thu gom báo phí rồi hẹn ngày đến lấy." />}
      footer={<Button title="Đăng ký thu gom mới" icon="add-circle-outline" onPress={() => router.push('/bulky/new')} />}
    />
  );
}
