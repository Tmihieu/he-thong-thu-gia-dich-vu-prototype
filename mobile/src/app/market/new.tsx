import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useCreateMarketPost } from '../../features/citizen/api';
import {
  DESCRIPTION_MAX,
  PICKUP_MAX,
  TITLE_MAX,
  validateMarketPost,
  type MarketErrors,
} from '../../features/market/validate';
import { PhotoPickerField } from '../../features/photos/PhotoPickerField';
import type { UploadedPhoto } from '../../features/photos/photos';
import { MARKET_TYPE_LABELS, type MarketPostType } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, Chip, ErrorBox, Screen } from '../../shared/ui';

const TYPES = Object.keys(MARKET_TYPE_LABELS) as MarketPostType[];

/** Form đăng bài như prototype `citizenMarketNew`: ảnh (không bắt buộc, tối đa 5), tên, hình thức, mô tả, nơi nhận. */
export default function NewMarketPostScreen() {
  const create = useCreateMarketPost();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [postType, setPostType] = useState<MarketPostType | null>(null);
  const [description, setDescription] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [errors, setErrors] = useState<MarketErrors>({});

  const clear = (key: keyof MarketErrors) => setErrors((e) => ({ ...e, [key]: undefined }));

  const onSubmit = () => {
    const found = validateMarketPost({ title, postType, description, pickupLocation });
    setErrors(found);
    if (Object.keys(found).length > 0 || !postType) return;
    create.mutate(
      {
        title: title.trim(),
        postType,
        description: description.trim(),
        pickupLocation: pickupLocation.trim() || undefined,
        photoNames: photos.map((p) => p.name),
      },
      { onSuccess: (p) => router.replace({ pathname: '/market/[id]', params: { id: String(p.id), fresh: '1' } }) },
    );
  };

  return (
    <Screen>
      <Card>
        <CardTitle>Ảnh vật dụng</CardTitle>
        <PhotoPickerField value={photos} onChange={setPhotos} onBusyChange={setUploading} />
      </Card>

      <Card>
        <CardTitle>Tên vật dụng *</CardTitle>
        <TextInput
          accessibilityLabel="Tên vật dụng"
          style={styles.input}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            clear('title');
          }}
          placeholder="Ví dụ: Ghế sofa 3 chỗ"
          placeholderTextColor={colors.textMuted}
          maxLength={TITLE_MAX}
        />
        {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Hình thức *</CardTitle>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Chip
              key={t}
              label={MARKET_TYPE_LABELS[t]}
              selected={t === postType}
              onPress={() => {
                setPostType(t);
                clear('postType');
              }}
            />
          ))}
        </View>
        {errors.postType ? <Text style={styles.error}>{errors.postType}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Mô tả tình trạng *</CardTitle>
        <TextInput
          accessibilityLabel="Mô tả tình trạng"
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={(v) => {
            setDescription(v);
            clear('description');
          }}
          placeholder="Kích thước, tình trạng, giờ có thể đến lấy…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={DESCRIPTION_MAX}
        />
        {errors.description ? <Text style={styles.error}>{errors.description}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Địa điểm nhận</CardTitle>
        <TextInput
          accessibilityLabel="Địa điểm nhận"
          style={styles.input}
          value={pickupLocation}
          onChangeText={(v) => {
            setPickupLocation(v);
            clear('pickupLocation');
          }}
          placeholder="Ví dụ: Hẻm 12, Tổ dân phố 08"
          placeholderTextColor={colors.textMuted}
          maxLength={PICKUP_MAX}
        />
        {errors.pickupLocation ? <Text style={styles.error}>{errors.pickupLocation}</Text> : null}
      </Card>

      {create.error ? (
        <ErrorBox message={create.error instanceof ApiError ? create.error.message : 'Đăng bài không thành công. Vui lòng thử lại.'} />
      ) : null}
      <Button title={uploading ? 'Đang tải ảnh…' : 'Đăng bài'} onPress={onSubmit} disabled={uploading} loading={create.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textarea: { minHeight: 120 },
  error: { color: colors.danger, fontSize: 13 },
});
