import { router } from 'expo-router';

import { useComplaints } from '../../features/citizen/api';
import { ComplaintRow } from '../../features/complaints/ComplaintCard';
import { Button, EmptyState, ErrorState, ListGroup, Loading, Screen } from '../../shared/ui';

export default function ComplaintsScreen() {
  const list = useComplaints();

  return (
    <Screen
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
      footer={<Button title="Gửi phản ánh mới" icon="add-circle-outline" onPress={() => router.push('/complaints/new')} />}
    >
      {list.isPending ? <Loading /> : null}
      {list.error ? (
        <ErrorState error={list.error} fallback="Không tải được danh sách phản ánh." onRetry={() => void list.refetch()} compact={!!list.data} />
      ) : null}
      {list.data?.length === 0 ? (
        <EmptyState icon="chatbubble-ellipses-outline" title="Bạn chưa gửi phản ánh nào" message="Thu gom chậm, thu sai mức phí, điểm tập kết ô nhiễm: gửi ngay để UBND xã xử lý." />
      ) : null}
      {list.data && list.data.length > 0 ? (
        <ListGroup>
          {list.data.map((c) => (
            <ComplaintRow key={c.id} c={c} />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}
