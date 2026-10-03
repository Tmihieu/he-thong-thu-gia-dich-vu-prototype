import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import {
  flattenUnique,
  marketApi,
  newUuid,
  useMarketComments,
  useMarketMutation,
  useMarketPost,
  type MarketPost,
} from '../../features/market/api';
import { PostTags } from '../../features/market/PostCard';
import { COMMENT_MAX } from '../../features/market/validate';
import { PhotoStrip } from '../../features/photos/PhotoStrip';
import { confirmAction } from '../../shared/confirm';
import { errorMessage } from '../../shared/errors';
import { formatDate } from '../../shared/format';
import { MARKET_CATEGORY_LABELS } from '../../shared/labels';
import { colors, spacing, type as t } from '../../shared/theme';
import { Button, Callout, Card, CardTitle, Divider, EmptyState, ErrorState, Field, InlineError, Line, Loading, Muted, Screen } from '../../shared/ui';

/** Chi tiết bài (spec §5.3). 404 (đã ẩn, bị chặn, không tồn tại) → "Bài không còn khả dụng", không nói lý do. */
export default function MarketPostScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const detail = useMarketPost(id);
  const p = detail.data;

  const gone = detail.error instanceof ApiError && detail.error.status === 404;
  return (
    <Screen refreshing={detail.isRefetching} onRefresh={() => void detail.refetch()}>
      {detail.isPending ? <Loading /> : null}
      {gone ? (
        <EmptyState icon="eye-off-outline" title="Bài không còn khả dụng" />
      ) : detail.error ? (
        <ErrorState error={detail.error} fallback="Không tải được bài đăng." onRetry={() => void detail.refetch()} compact={!!p} />
      ) : null}
      {p && !gone ? <PostBody p={p} /> : null}
    </Screen>
  );
}

function PostBody({ p }: { p: MarketPost }) {
  const [callError, setCallError] = useState<string | null>(null);
  const saveM = useMarketMutation((on: boolean) => marketApi.save(p.id, on));
  const blockM = useMarketMutation(() => marketApi.block(p.author.citizenId, true));
  const statusM = useMarketMutation((s: 'OPEN' | 'CLOSED') => marketApi.setStatus(p.id, s, p.version ?? 0));
  const hideM = useMarketMutation((h: boolean) => marketApi.setHidden(p.id, h, p.version ?? 0));
  const ownerError = statusM.error ?? hideM.error;

  const call = async () => {
    setCallError(null);
    let phone: string;
    try {
      phone = (await marketApi.contact(p.id)).phone;
    } catch (e) {
      setCallError(errorMessage(e, 'Không lấy được số liên hệ.'));
      return;
    }
    // Mở trình quay số, không tự gọi. Máy không hỗ trợ (máy tính bảng, giả lập) thì hiện số để tự gọi.
    Linking.openURL(`tel:${phone}`).catch(() => setCallError(`Thiết bị không mở được trình gọi. Số liên hệ: ${phone}`));
  };

  const onBlock = () =>
    confirmAction({
      title: 'Chặn người đăng?',
      message: 'Hai bên sẽ không thấy bài, bình luận và số liên hệ của nhau trong chợ. Có thể bỏ chặn trong mục Đã chặn.',
      confirmLabel: 'Chặn',
      destructive: true,
      onConfirm: () => blockM.mutate(undefined, { onSuccess: () => router.back() }),
    });

  return (
    <>
      <Card>
        <PhotoStrip urls={p.photoUrls} />
        <PostTags p={p} />
        <Text style={styles.caption} selectable>
          {p.caption}
        </Text>
        <Divider />
        <Line label="Danh mục" value={MARKET_CATEGORY_LABELS[p.category]} />
        <Line label="Người đăng" value={`${p.author.displayName}${p.mine ? ' (bạn)' : ''}`} />
        <Line label="Khu vực" value={p.area.name} />
        <Muted>
          {p.code}, đăng lúc {formatDate(p.createdAt, true)}
          {p.editedAt ? ', đã chỉnh sửa' : ''}
        </Muted>
      </Card>

      <View style={styles.actions}>
        {p.canCall ? <Button title="Gọi người đăng" icon="call-outline" onPress={() => void call()} /> : null}
        <Button
          title={p.saved ? 'Bỏ lưu bài' : 'Lưu bài'}
          icon={p.saved ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          onPress={() => saveM.mutate(!p.saved)}
          loading={saveM.isPending}
        />
      </View>
      {callError ? <InlineError message={callError} /> : null}
      {saveM.error ? <InlineError message={errorMessage(saveM.error, 'Không lưu được bài.')} /> : null}

      {p.mine ? (
        <Card>
          <CardTitle>Quản lý bài của bạn</CardTitle>
          <Button
            title="Sửa bài"
            icon="create-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: '/market/new', params: { id: String(p.id) } })}
          />
          {p.hidden ? (
            <Button title="Hiện bài" variant="secondary" onPress={() => hideM.mutate(false)} loading={hideM.isPending} />
          ) : (
            <Button
              title="Ẩn bài"
              variant="secondary"
              loading={hideM.isPending}
              onPress={() =>
                confirmAction({
                  title: 'Ẩn bài?',
                  message: 'Người khác sẽ không thấy bài này cho tới khi bạn hiện lại.',
                  confirmLabel: 'Ẩn',
                  onConfirm: () => hideM.mutate(true),
                })
              }
            />
          )}
          {p.status === 'OPEN' ? (
            <Button
              title="Đánh dấu đã xong"
              variant="danger"
              loading={statusM.isPending}
              onPress={() =>
                confirmAction({
                  title: 'Đánh dấu đã xong?',
                  message: 'Bài rời khỏi chợ, không nhận bình luận và cuộc gọi mới. Có thể mở lại sau.',
                  confirmLabel: 'Đã xong',
                  onConfirm: () => statusM.mutate('CLOSED'),
                })
              }
            />
          ) : (
            <Button title="Mở lại bài" variant="secondary" onPress={() => statusM.mutate('OPEN')} loading={statusM.isPending} />
          )}
          {ownerError ? (
            <InlineError
              message={
                ownerError instanceof ApiError && ownerError.status === 409
                  ? 'Bài vừa được thay đổi ở nơi khác; đã tải lại, vui lòng thử lại.'
                  : errorMessage(ownerError, 'Thao tác không thành công.')
              }
            />
          ) : null}
        </Card>
      ) : (
        <>
          <Button title="Chặn người đăng" icon="ban-outline" variant="danger" onPress={onBlock} loading={blockM.isPending} />
          {blockM.error ? <InlineError message={errorMessage(blockM.error, 'Chặn không thành công.')} /> : null}
        </>
      )}

      <Comments p={p} />
    </>
  );
}

function Comments({ p }: { p: MarketPost }) {
  const list = useMarketComments(p.id);
  const items = flattenUnique(list.data?.pages);
  const [text, setText] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  // Giữ mã tới khi gửi thành công: bấm lại sau lỗi mạng không tạo bình luận trùng.
  const requestId = useRef(newUuid());
  const send = useMarketMutation((content: string) => marketApi.comment(p.id, content, requestId.current));

  const onSend = () => {
    if (send.isPending) return;
    if (!text.trim()) {
      setTextError('Nhập nội dung bình luận.');
      return;
    }
    send.mutate(text.trim(), {
      onSuccess: () => {
        setText('');
        requestId.current = newUuid();
      },
    });
  };

  return (
    <Card>
      <CardTitle>Bình luận ({p.commentCount})</CardTitle>
      {list.error ? <ErrorState compact error={list.error} fallback="Không tải được bình luận." onRetry={() => void list.refetch()} /> : null}
      {!list.isPending && items.length === 0 ? <Muted>Chưa có bình luận.</Muted> : null}
      {items.map((c) => (
        <View key={c.id} style={styles.comment}>
          <Text style={styles.commentAuthor}>
            {c.author.displayName}
            {c.mine ? ' (bạn)' : ''}
          </Text>
          <Text style={styles.commentText}>{c.content}</Text>
          <Text style={styles.commentMeta}>{formatDate(c.createdAt, true)}</Text>
        </View>
      ))}
      {list.isPending || list.isFetchingNextPage ? <Loading /> : null}
      {list.hasNextPage && !list.isFetchingNextPage ? (
        <Button title="Xem thêm bình luận" variant="secondary" onPress={() => void list.fetchNextPage()} />
      ) : null}
      {p.canComment ? (
        <>
          <Field
            label="Viết bình luận"
            error={textError}
            value={text}
            onChangeText={(v) => {
              setText(v);
              setTextError(null);
            }}
            multiline
            style={styles.commentInput}
            maxLength={COMMENT_MAX}
          />
          {send.error ? <InlineError message={errorMessage(send.error, 'Gửi bình luận không thành công.')} /> : null}
          <Button title="Gửi bình luận" onPress={onSend} loading={send.isPending} />
        </>
      ) : (
        <Callout tone="neutral">Bài không nhận bình luận mới.</Callout>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  caption: { ...t.body, color: colors.text },
  actions: { gap: spacing.sm },
  comment: { gap: spacing.xs, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  commentAuthor: { ...t.bodyStrong, color: colors.text },
  commentText: { ...t.body, color: colors.text },
  commentMeta: { ...t.caption, color: colors.textMuted },
  commentInput: { minHeight: 96 },
});
