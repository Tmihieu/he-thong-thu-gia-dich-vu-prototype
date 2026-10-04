import { StyleSheet, Text } from 'react-native';

import { marketApi, useBlocks, useMarketMutation } from '../../features/market/api';
import { PagedList } from '../../features/market/PostCard';
import { confirmAction } from '../../shared/confirm';
import { errorMessage } from '../../shared/errors';
import { colors, type as t } from '../../shared/theme';
import { Button, Card, InlineError } from '../../shared/ui';

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
      header={unblock.error ? <InlineError message={errorMessage(unblock.error, 'Bỏ chặn không thành công.')} /> : undefined}
      render={(b) => (
        <Card>
          <Text style={styles.name}>{b.displayName}</Text>
          <Button
            title="Bỏ chặn"
            variant="secondary"
            loading={unblock.isPending}
            onPress={() =>
              confirmAction({
                title: 'Bỏ chặn?',
                message: `Bạn sẽ lại thấy bài và bình luận của ${b.displayName} trong chợ.`,
                confirmLabel: 'Bỏ chặn',
                onConfirm: () => unblock.mutate(b.citizenId),
              })
            }
          />
        </Card>
      )}
      empty="Bạn chưa chặn ai"
      emptyIcon="ban-outline"
    />
  );
}

const styles = StyleSheet.create({ name: { ...t.heading, color: colors.text } });
