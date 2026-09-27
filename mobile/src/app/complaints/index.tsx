import { router } from 'expo-router';

import { ApiError } from '../../api/client';
import { useComplaints } from '../../features/citizen/api';
import { ComplaintCard } from '../../features/complaints/ComplaintCard';
import { Button, Card, Empty, ErrorBox, Loading, Screen } from '../../shared/ui';

export default function ComplaintsScreen() {
  const list = useComplaints();

  return (
    <Screen refreshing={list.isFetching && !list.isPending} onRefresh={() => void list.refetch()}>
      <Button title="Gửi phản ánh mới" onPress={() => router.push('/complaints/new')} />
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorBox
          message={list.error instanceof ApiError ? list.error.message : 'Không tải được danh sách phản ánh.'}
          onRetry={() => void list.refetch()}
        />
      ) : null}
      {list.data?.length === 0 ? (
        <Card>
          <Empty>Bạn chưa gửi phản ánh nào.</Empty>
        </Card>
      ) : null}
      {list.data?.map((c) => <ComplaintCard key={c.id} c={c} />)}
    </Screen>
  );
}
