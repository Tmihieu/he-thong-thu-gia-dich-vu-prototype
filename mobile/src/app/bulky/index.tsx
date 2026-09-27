import { router } from 'expo-router';

import { ApiError } from '../../api/client';
import { BulkyCard } from '../../features/bulky/BulkyCard';
import { useBulkyRequests } from '../../features/citizen/api';
import { Button, Card, Empty, ErrorBox, Loading, Screen } from '../../shared/ui';

export default function BulkyListScreen() {
  const list = useBulkyRequests();

  return (
    <Screen refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
      <Button title="Đăng ký mới" onPress={() => router.push('/bulky/new')} />
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorBox
          message={list.error instanceof ApiError ? list.error.message : 'Không tải được danh sách yêu cầu.'}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data?.length === 0 ? (
        <Card>
          <Empty>Bạn chưa đăng ký thu gom rác cồng kềnh.</Empty>
        </Card>
      ) : null}
      {list.data?.map((r) => <BulkyCard key={r.id} r={r} />)}
    </Screen>
  );
}
