import { Alert, StyleSheet, Text } from 'react-native';

import { marketApi, useBlocks, useMarketMutation } from '../../features/market/api';
import { PagedList } from '../../features/market/PostCard';
import { colors } from '../../shared/theme';
import { Button, Card, ErrorBox } from '../../shared/ui';

/** Đã chặn (spec §5.6): chỉ tên hiển thị + Bỏ chặn. */
export default function BlocksScreen() {
  const q = useBlocks();
  const unblock = useMarketMutation((citizenId: number) => marketApi.block(citizenId, false));
  const items = (q.data?.pages ?? []).flatMap((p) => p.items);
  return (
    <PagedList
      q={q}
      items={items}
      keyOf={(b) => String(b.citizenId)}
      header={unblock.error ? <ErrorBox message={unblock.error.message} /> : undefined}
      render={(b) => (
        <Card>
          <Text style={styles.name}>{b.displayName}</Text>
          <Button
            title="Bỏ chặn"
            variant="ghost"
            onPress={() =>
              Alert.alert('Bỏ chặn?', `Bạn sẽ lại thấy bài và bình luận của ${b.displayName} trong chợ.`, [
                { text: 'Để sau', style: 'cancel' },
                { text: 'Bỏ chặn', onPress: () => unblock.mutate(b.citizenId) },
              ])
            }
          />
        </Card>
      )}
      empty="Bạn chưa chặn ai."
    />
  );
}

const styles = StyleSheet.create({ name: { fontSize: 15, fontWeight: '700', color: colors.text } });
