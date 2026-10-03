import { router } from 'expo-router';

import { BulkyRow } from '../../features/bulky/BulkyCard';
import { useBulkyRequests } from '../../features/citizen/api';
import { Button, EmptyState, ErrorState, ListGroup, Loading, Screen } from '../../shared/ui';

export default function BulkyListScreen() {
  const list = useBulkyRequests();

  return (
    <Screen
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
      footer={<Button title="Đăng ký thu gom mới" icon="add-circle-outline" onPress={() => router.push('/bulky/new')} />}
    >
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorState error={list.error} fallback="Không tải được danh sách yêu cầu." onRetry={() => void list.refetch()} compact={!!list.data} />
      ) : null}
      {list.data?.length === 0 ? (
        <EmptyState icon="cube-outline" title="Bạn chưa đăng ký thu gom rác cồng kềnh" message="Nệm, tủ, sofa, thiết bị điện lớn, xà bần: công ty thu gom báo phí rồi hẹn ngày đến lấy." />
      ) : null}
      {list.data && list.data.length > 0 ? (
        <ListGroup>
          {list.data.map((r) => (
            <BulkyRow key={r.id} r={r} />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}
