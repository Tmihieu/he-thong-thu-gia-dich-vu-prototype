import { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type as t } from '../../shared/theme';
import { photoSource } from './photos';

/** Một ảnh đã lưu trên backend; tải lỗi (mất mạng, hết phiên, ảnh bị xóa) thì hiện ô báo thay vì ô trống. */
export function StoredPhoto({ url, size }: { url: string; size: { width: number; height: number } }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <View style={[styles.frame, styles.failed, size]}>
        <Text style={styles.failedText}>Không tải được ảnh</Text>
      </View>
    );
  }
  return (
    <Image
      source={photoSource(url)}
      style={[styles.frame, size]}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityLabel="Ảnh đính kèm"
    />
  );
}

/** Dải ảnh cuộn ngang cho ảnh đã lưu trên backend (URL tương đối, cần token người dân). */
export function PhotoStrip({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {urls.map((url) => (
        <StoredPhoto key={url} url={url} size={PHOTO_SIZE} />
      ))}
    </ScrollView>
  );
}

const PHOTO_SIZE = { width: 240, height: 180 };

const styles = StyleSheet.create({
  row: { gap: spacing.sm },
  frame: { borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  failed: { alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
  failedText: { ...t.caption, color: colors.textMuted, textAlign: 'center' },
});
