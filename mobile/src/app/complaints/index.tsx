import { router } from 'expo-router';

import { useComplaints } from '../../features/citizen/api';
import { ComplaintRow } from '../../features/complaints/ComplaintCard';
import { Button, EmptyState, ListGroup, ListScreen } from '../../shared/ui';

export default function ComplaintsScreen() {
  const list = useComplaints();

  return (
    <ListScreen
      data={list.data}
      keyOf={(c) => String(c.id)}
      render={(c) => (
        <ListGroup>
          <ComplaintRow c={c} />
        </ListGroup>
      )}
      isPending={list.isPending}
      error={list.error}
      fallbackError="Không tải được danh sách phản ánh."
      onRetry={() => void list.refetch()}
      refreshing={list.isFetching && !list.isPending}
      onRefresh={() => void list.refetch()}
      empty={<EmptyState icon="chatbubble-ellipses-outline" title="Bạn chưa gửi phản ánh nào" message="Thu gom chậm, thu sai mức phí, điểm tập kết ô nhiễm: gửi ngay để UBND xã xử lý." />}
      footer={<Button title="Gửi phản ánh mới" icon="add-circle-outline" onPress={() => router.push('/complaints/new')} />}
    />
  );
}
