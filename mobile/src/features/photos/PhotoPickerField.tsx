import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../shared/theme';
import { Button, Muted } from '../../shared/ui';
import { addPhotos, MAX_PHOTOS, type UploadedPhoto } from './photos';
import { StoredPhoto } from './PhotoStrip';

const THUMB_SIZE = { width: 72, height: 72 };

/**
 * Chọn ảnh từ thư viện, tải lên ngay và giữ danh sách ảnh đã lên. `onBusyChange` (tùy chọn) để form khóa nút gửi
 * khi ảnh còn đang tải, tránh gửi thiếu ảnh.
 */
export function PhotoPickerField({
  value,
  onChange,
  max = MAX_PHOTOS,
  onBusyChange,
}: {
  value: UploadedPhoto[];
  onChange: (v: UploadedPhoto[]) => void;
  max?: number;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chặn bấm "Thêm ảnh" lần hai khi thư viện còn đang mở / ảnh còn đang tải (state `busy` bật muộn hơn).
  const working = useRef(false);
  // Danh sách mới nhất để ghép khi tải xong (người dùng có thể xóa ảnh trong lúc chờ).
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);

  const add = async () => {
    if (working.current) return;
    working.current = true;
    setError(null);
    try {
      const result = await addPhotos(latest.current.length, max, (b) => {
        setBusy(b);
        onBusyChange?.(b);
      });
      if (result.uploaded.length > 0) onChange([...latest.current, ...result.uploaded]);
      setError(result.error);
    } finally {
      working.current = false;
    }
  };

  return (
    <View style={styles.wrap}>
      {value.length > 0 ? (
        <View style={styles.grid}>
          {value.map((p) => (
            <View key={p.name}>
              <StoredPhoto url={p.url} size={THUMB_SIZE} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa ảnh"
                hitSlop={8}
                onPress={() => onChange(value.filter((x) => x.name !== p.name))}
                style={styles.remove}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {value.length < max ? <Button title="Thêm ảnh" variant="ghost" onPress={() => void add()} loading={busy} /> : null}
      <Muted>
        {value.length}/{max} ảnh · JPEG, PNG hoặc WebP, tối đa 5 MB mỗi ảnh
      </Muted>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 15, fontWeight: '700', lineHeight: 17 },
  error: { color: colors.danger, fontSize: 13 },
});
