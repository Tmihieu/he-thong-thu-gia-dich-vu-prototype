import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useCloseMarketPost, useCommentMarketPost, useMarketPost } from '../../features/citizen/api';
import { COMMENT_MAX } from '../../features/market/validate';
import { PhotoStrip } from '../../features/photos/PhotoStrip';
import { formatDate } from '../../shared/format';
import { MARKET_TYPE_LABELS } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, ErrorBox, Line, Loading, Muted, Screen, Tag } from '../../shared/ui';

/** Chi tiết bài như prototype `citizenMarketDetail`: ảnh, mô tả, nơi nhận, người đăng, bình luận; chủ bài đóng bài. */
export default function MarketPostScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const detail = useMarketPost(Number(id));
  const close = useCloseMarketPost(Number(id));
  const comment = useCommentMarketPost(Number(id));
  const [text, setText] = useState('');
  const [textError, setTextError] = useState<string | null>(null);
  const d = detail.data;
  const open = d?.post.status === 'OPEN';

  // Không có mở lại (quyết định 27/09/2026) nên hỏi lại trước khi đóng.
  const onClose = () =>
    Alert.alert('Đóng bài?', 'Bài sẽ rời khỏi chợ đồ cũ và không nhận bình luận mới. Bài đã đóng không mở lại được.', [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Đóng bài', style: 'destructive', onPress: () => close.mutate() },
    ]);

  const onSend = () => {
    if (!text.trim()) {
      setTextError('Nhập nội dung bình luận.');
      return;
    }
    comment.mutate(text.trim(), { onSuccess: () => setText('') });
  };

  // Ô bình luận nằm cuối màn: trên iOS bàn phím che mất nếu không đẩy nội dung lên (như màn đăng nhập).
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen refreshing={detail.isFetching && !detail.isPending} onRefresh={() => void detail.refetch()}>
        {detail.isPending ? <Loading /> : null}
        {detail.error ? (
          <ErrorBox
            message={detail.error instanceof ApiError ? detail.error.message : 'Không tải được bài đăng.'}
            onRetry={() => void detail.refetch()}
          />
        ) : null}
        {d ? (
          <>
            {fresh === '1' && open ? (
              <Card style={styles.success}>
                <Text style={styles.successTitle}>Đã đăng bài {d.post.code}</Text>
                <Muted>Bài đã hiện trong chợ đồ cũ; người trong xã có thể bình luận để hỏi bạn.</Muted>
              </Card>
            ) : null}

            <Card>
              <PhotoStrip urls={d.post.photoUrls} />
              <View style={styles.top}>
                <Text style={styles.title}>{d.post.title}</Text>
                <Tag tone={d.post.postType === 'GIVE' ? 'success' : 'info'}>{MARKET_TYPE_LABELS[d.post.postType]}</Tag>
              </View>
              {open ? null : <Tag>Đã cho/đổi xong</Tag>}
              <Text style={styles.text}>{d.post.description}</Text>
              {d.post.pickupLocation ? <Line label="Nơi nhận" value={d.post.pickupLocation} /> : null}
              <Line label="Người đăng" value={`${d.post.author.displayName} · ${d.post.author.areaName}`} />
              <Muted>
                {d.post.code} · đăng lúc {formatDate(d.post.createdAt, true)}
              </Muted>
            </Card>

            {d.post.mine && open ? (
              <Card>
                <Muted>Khi đã cho hoặc đổi xong, đóng bài để bài rời khỏi chợ.</Muted>
                {close.error ? (
                  <ErrorBox message={close.error instanceof ApiError ? close.error.message : 'Đóng bài không thành công.'} />
                ) : null}
                <Button title="Đóng bài" variant="danger" onPress={onClose} loading={close.isPending} />
              </Card>
            ) : null}

            <Card>
              <CardTitle>Bình luận ({d.comments.length})</CardTitle>
              {d.comments.length === 0 ? (
                <Muted>{open ? 'Chưa có bình luận. Hãy là người đầu tiên hỏi chủ bài.' : 'Chưa có bình luận.'}</Muted>
              ) : null}
              {d.comments.map((c) => (
                <View key={c.id} style={styles.comment}>
                  <Text style={styles.commentAuthor}>
                    {c.author.displayName}
                    {c.mine ? ' (bạn)' : ''} <Text style={styles.commentMeta}>· {c.author.areaName} · {formatDate(c.createdAt, true)}</Text>
                  </Text>
                  <Text style={styles.text}>{c.content}</Text>
                </View>
              ))}
              {open ? (
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
                  {comment.error ? (
                    <ErrorBox message={comment.error instanceof ApiError ? comment.error.message : 'Gửi bình luận không thành công.'} />
                  ) : null}
                  <Button title="Gửi" onPress={onSend} loading={comment.isPending} />
                </>
              ) : (
                <Muted>Bài đã đóng, không nhận bình luận mới.</Muted>
              )}
            </Card>
          </>
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  success: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  successTitle: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
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
