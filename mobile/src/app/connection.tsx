import { useQuery } from '@tanstack/react-query';

import { getApiBaseUrl } from '../api/client';
import { checkConnection } from '../features/connection/checkConnection';
import { Button, Callout, Card, Line, Loading, Muted, Screen } from '../shared/ui';

export default function ConnectionCheckScreen() {
  const baseUrl = getApiBaseUrl();
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['connection-check'],
    queryFn: () => checkConnection(),
    retry: false,
    staleTime: 0,
  });

  return (
    <Screen footer={<Button title="Kiểm tra lại" icon="refresh-outline" onPress={() => void refetch()} loading={isFetching} />}>
      <Card>
        <Muted>Địa chỉ máy chủ</Muted>
        <Line label="Máy chủ" value={baseUrl || '(chưa cấu hình EXPO_PUBLIC_API_URL)'} />
      </Card>

      {isFetching ? <Loading label="Đang kiểm tra…" /> : null}
      {!isFetching && error ? (
        <Callout tone="danger" title="Không kết nối được">
          {error.message}
          {'\n\n'}
          Kiểm tra: điện thoại và máy chủ cùng mạng Wi-Fi; backend đang chạy; tường lửa Windows mở cổng 8080.
        </Callout>
      ) : null}
      {!isFetching && data ? (
        <Callout tone="success" title="Kết nối thành công">
          {`${data.title}, phiên bản ${data.version}\n${data.pathCount} endpoint, phản hồi sau ${data.elapsedMs} ms`}
        </Callout>
      ) : null}
    </Screen>
  );
}
