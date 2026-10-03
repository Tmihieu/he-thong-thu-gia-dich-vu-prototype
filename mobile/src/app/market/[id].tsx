import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

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
import { formatDate } from '../../shared/format';
import { MARKET_CATEGORY_LABELS } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, Empty, ErrorBox, Line, Loading, Muted, Screen } from '../../shared/ui';

const errText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const confirm = (title: string, message: string, ok: string, onPress: () => void) =>
  Alert.alert(title, message, [
    { text: 'Để sau', style: 'cancel' },
    { text: ok, style: 'destructive', onPress },
  ]);

/** Chi tiết bài (spec §5.3). 404 (đã ẩn, bị chặn, không tồn tại) → "Bài không còn khả dụng", không nói lý do. */
export default function MarketPostScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const detail = useMarketPost(id);
  const p = detail.data;

  const gone = detail.error instanceof ApiError && detail.error.status === 404;
  return (
    // Ô bình luận ở cuối màn: iOS cần đẩy nội dung lên để bàn phím không che (như màn đăng nhập).
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen refreshing={detail.isRefetching} onRefresh={() => void detail.refetch()}>
        {detail.isPending ? <Loading /> : null}
        {gone ? (
          <Card>
            <Empty>Bài không còn khả dụng.</Empty>
          </Card>
        ) : detail.error ? (
          <ErrorBox message={errText(detail.error, 'Không tải được bài đăng.')} onRetry={() => void detail.refetch()} />
        ) : null}
        {p && !gone ? <PostBody p={p} /> : null}
      </Screen>
    </KeyboardAvoidingView>
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
      setCallError(errText(e, 'Không lấy được số liên hệ.'));
      return;
    }
    // Mở trình quay số, không tự gọi. Máy không hỗ trợ (máy tính bảng, giả lập) thì hiện số để tự gọi.
    Linking.openURL(`tel:${phone}`).catch(() => setCallError(`Thiết bị không mở được trình gọi. Số liên hệ: ${phone}`));
  };

  const onBlock = () =>
    confirm(
      'Chặn người đăng?',
      'Hai bên sẽ không thấy bài, bình luận và số liên hệ của nhau trong chợ. Có thể bỏ chặn trong mục Đã chặn.',
      'Chặn',
      () => blockM.mutate(undefined, { onSuccess: () => router.back() }),
    );

  return (
    <>
      <Card>
        <PhotoStrip urls={p.photoUrls} />
        <PostTags p={p} />
        <Text style={styles.text} selectable>
          {p.caption}
        </Text>
        <Line label="Danh mục" value={MARKET_CATEGORY_LABELS[p.category]} />
        <Line label="Người đăng" value={`${p.author.displayName}${p.mine ? ' (bạn)' : ''} · ${p.area.name}`} />
        <Muted>
          {p.code} · đăng lúc {formatDate(p.createdAt, true)}
          {p.editedAt ? ' · Đã chỉnh sửa' : ''}
        </Muted>
        <View style={styles.actions}>
          <Button
            title={p.saved ? 'Bỏ lưu' : 'Lưu'}
            variant="ghost"
            onPress={() => saveM.mutate(!p.saved)}
            loading={saveM.isPending}
          />
          {p.canCall ? <Button title="Gọi" onPress={() => void call()} /> : null}
        </View>
        {callError ? <ErrorBox message={callError} /> : null}
        {saveM.error ? <ErrorBox message={errText(saveM.error, 'Không lưu được bài.')} /> : null}
      </Card>

      {p.mine ? (
        <Card>
          <View style={styles.actions}>
            <Button
              title="Sửa"
              variant="ghost"
              onPress={() => router.push({ pathname: '/market/new', params: { id: String(p.id) } })}
            />
            {p.hidden ? (
              <Button title="Hiện bài" variant="ghost" onPress={() => hideM.mutate(false)} loading={hideM.isPending} />
            ) : (
              <Button
                title="Ẩn bài"
                variant="ghost"
                loading={hideM.isPending}
                onPress={() =>
                  confirm('Ẩn bài?', 'Người khác sẽ không thấy bài này cho tới khi bạn hiện lại.', 'Ẩn', () =>
                    hideM.mutate(true),
                  )
                }
              />
            )}
            {p.status === 'OPEN' ? (
              <Button
                title="Đã xong"
                variant="danger"
                loading={statusM.isPending}
                onPress={() =>
                  confirm('Đánh dấu đã xong?', 'Bài rời khỏi chợ, không nhận bình luận và cuộc gọi mới. Có thể mở lại sau.', 'Đã xong', () =>
                    statusM.mutate('CLOSED'),
                  )
                }
              />
            ) : (
              <Button title="Mở lại" variant="ghost" onPress={() => statusM.mutate('OPEN')} loading={statusM.isPending} />
            )}
          </View>
          {ownerError ? (
            <ErrorBox
              message={
                ownerError instanceof ApiError && ownerError.status === 409
                  ? 'Bài vừa được thay đổi ở nơi khác; đã tải lại, vui lòng thử lại.'
                  : errText(ownerError, 'Thao tác không thành công.')
              }
            />
          ) : null}
        </Card>
      ) : (
        <Card>
          <Button title="Chặn người đăng" variant="danger" onPress={onBlock} loading={blockM.isPending} />
          {blockM.error ? <ErrorBox message={errText(blockM.error, 'Chặn không thành công.')} /> : null}
        </Card>
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
      {list.error ? <ErrorBox message={errText(list.error, 'Không tải được bình luận.')} onRetry={() => void list.refetch()} /> : null}
      {!list.isPending && items.length === 0 ? <Muted>Chưa có bình luận.</Muted> : null}
      {items.map((c) => (
        <View key={c.id} style={styles.comment}>
          <Text style={styles.commentAuthor}>
            {c.author.displayName}
            {c.mine ? ' (bạn)' : ''} <Text style={styles.commentMeta}>· {formatDate(c.createdAt, true)}</Text>
          </Text>
          <Text style={styles.text}>{c.content}</Text>
        </View>
      ))}
      {list.isPending || list.isFetchingNextPage ? <Loading /> : null}
      {list.hasNextPage && !list.isFetchingNextPage ? (
        <Button title="Xem thêm bình luận" variant="ghost" onPress={() => void list.fetchNextPage()} />
      ) : null}
      {p.canComment ? (
        <>
          <TextInput
            accessibilityLabel="Viết bình luận"
            style={styles.input}
            value={text}
            onChangeText={(v) => {
              setText(v);
              setTextError(null);
            }}
            placeholder="Viết bình luận…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={COMMENT_MAX}
          />
          {textError ? <Text style={styles.error}>{textError}</Text> : null}
          {send.error ? <ErrorBox message={errText(send.error, 'Gửi bình luận không thành công.')} /> : null}
          <Button title="Gửi" onPress={onSend} loading={send.isPending} />
        </>
      ) : (
        <Muted>Bài không nhận bình luận mới.</Muted>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  comment: { gap: 2, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  commentAuthor: { fontSize: 14, fontWeight: '700', color: colors.text },
  commentMeta: { fontWeight: '400', color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 60,
  },
  error: { color: colors.danger, fontSize: 13 },
});
