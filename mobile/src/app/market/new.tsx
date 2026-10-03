import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useProfile } from '../../features/citizen/api';
import { marketApi, newUuid, useMarketEdit, useMarketMutation, type MarketEdit } from '../../features/market/api';
import { CAPTION_MAX, TAGS_MAX, validateMarketPost, type MarketErrors } from '../../features/market/validate';
import { PhotoPickerField } from '../../features/photos/PhotoPickerField';
import type { UploadedPhoto } from '../../features/photos/photos';
import { errorMessage } from '../../shared/errors';
import { MARKET_CATEGORY_LABELS, MARKET_TAG_LABELS, type MarketCategory, type MarketTag } from '../../shared/labels';
import { colors, spacing, type as t } from '../../shared/theme';
import { Button, Card, CardTitle, Chip, ChoiceGroup, ErrorState, Field, InlineError, Line, Loading, Muted, Screen } from '../../shared/ui';

const TAGS = Object.keys(MARKET_TAG_LABELS) as MarketTag[];
const CATEGORIES = Object.keys(MARKET_CATEGORY_LABELS) as MarketCategory[];

/** Đăng bài (không `id`) hoặc sửa bài (`?id=`) — spec §5.2. Lỗi giữ nguyên nội dung đang nhập. */
export default function MarketPostFormScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const editId = idParam ? Number(idParam) : null;
  const edit = useMarketEdit(editId);
  const profile = useProfile();

  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<MarketTag[]>([]);
  const [category, setCategory] = useState<MarketCategory>('OTHER');
  const [sharePhone, setSharePhone] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [version, setVersion] = useState(0);
  const [errors, setErrors] = useState<MarketErrors>({});
  // Một mã cho mỗi lần mở form: bấm lại sau lỗi mạng không tạo bài thứ hai.
  const requestId = useRef(newUuid()).current;

  const load = (d: MarketEdit) => {
    setPhotos(d.images.map((i) => ({ name: String(i.id), url: i.previewUrl })));
    setCaption(d.post.caption);
    setTags(d.post.tags);
    setCategory(d.post.category);
    setSharePhone(d.sharePhone);
    setContactPhone(d.contactPhone ?? '');
    setVersion(d.version);
  };
  // Nạp bản sửa một lần; về sau chỉ nạp lại khi người dùng bấm "Tải lại" (409).
  const loaded = useRef(false);
  useEffect(() => {
    if (edit.data && !loaded.current) {
      loaded.current = true;
      load(edit.data);
    }
  }, [edit.data]);

  const save = useMarketMutation(() => {
    const body = {
      caption: caption.trim(),
      tags,
      category,
      photoIds: photos.map((p) => Number(p.name)),
      sharePhone,
      contactPhone: sharePhone ? contactPhone.trim() : undefined,
    };
    return editId === null
      ? marketApi.create({ ...body, clientRequestId: requestId })
      : marketApi.update(editId, { ...body, version });
  });

  const onSubmit = () => {
    if (save.isPending) return;
    const found = validateMarketPost({ caption, tags, sharePhone, contactPhone });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate(undefined, {
      onSuccess: (p) =>
        editId === null ? router.replace({ pathname: '/market/[id]', params: { id: String(p.id) } }) : router.back(),
    });
  };

  const reload = async () => {
    const r = await edit.refetch();
    if (r.data) load(r.data);
    save.reset();
  };

  const toggleTag = (tag: MarketTag) => {
    setTags((cur) => (cur.includes(tag) ? cur.filter((x) => x !== tag) : cur.length < TAGS_MAX ? [...cur, tag] : cur));
    setErrors((e) => ({ ...e, tags: undefined }));
  };

  if (editId !== null && !loaded.current) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Sửa bài đăng' }} />
        {edit.error ? (
          <ErrorState error={edit.error} fallback="Không tải được bài." onRetry={() => void edit.refetch()} />
        ) : (
          <Loading />
        )}
      </Screen>
    );
  }

  const conflict = save.error instanceof ApiError && save.error.status === 409 && editId !== null;
  const area = edit.data?.post.area.name ?? profile.data?.subject.areaName;

  return (
    <Screen
      footer={
        <>
          {conflict ? (
            <>
              <InlineError message="Bài vừa được thay đổi ở nơi khác. Tải lại bản mới rồi sửa tiếp (nội dung đang nhập sẽ được thay)." />
              <Button title="Tải lại bài" variant="secondary" onPress={() => void reload()} />
            </>
          ) : save.error ? (
            <InlineError message={errorMessage(save.error, 'Lưu không thành công. Vui lòng thử lại.')} />
          ) : null}
          <Button
            title={uploading ? 'Đang tải ảnh…' : editId === null ? 'Đăng bài' : 'Lưu thay đổi'}
            onPress={onSubmit}
            disabled={uploading || conflict}
            loading={save.isPending}
          />
        </>
      }
    >
      <Stack.Screen options={{ title: editId === null ? 'Đăng bài mới' : 'Sửa bài đăng' }} />
      <Card>
        <Field
          label="Nội dung *"
          hint={`${caption.trim().length}/${CAPTION_MAX}. Mô tả món đồ, tình trạng, cách nhận. Không cần ghi địa chỉ nhà.`}
          error={errors.caption}
          value={caption}
          onChangeText={(v) => {
            setCaption(v);
            setErrors((e) => ({ ...e, caption: undefined }));
          }}
          multiline
          maxLength={CAPTION_MAX}
        />
      </Card>

      <Card>
        <CardTitle>Ảnh</CardTitle>
        <PhotoPickerField value={photos} onChange={setPhotos} onBusyChange={setUploading} send={marketApi.uploadImage} />
      </Card>

      <Card>
        <ChoiceGroup label={`Loại tin * (chọn 1 đến ${TAGS_MAX})`} error={errors.tags}>
          {TAGS.map((tag) => (
            <Chip key={tag} multi label={MARKET_TAG_LABELS[tag]} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Danh mục">
          {CATEGORIES.map((c) => (
            <Chip key={c} label={MARKET_CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ChoiceGroup>
        {area ? <Line label="Khu vực" value={area} /> : null}
      </Card>

      <Card>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Chia sẻ số điện thoại để người khác gọi</Text>
          <Switch
            accessibilityLabel="Chia sẻ số điện thoại"
            value={sharePhone}
            trackColor={{ true: colors.brand, false: colors.border }}
            onValueChange={(v) => {
              setSharePhone(v);
              setErrors((e) => ({ ...e, contactPhone: undefined }));
            }}
          />
        </View>
        {sharePhone ? (
          <Field
            label="Số điện thoại liên hệ"
            error={errors.contactPhone}
            value={contactPhone}
            onChangeText={(v) => {
              setContactPhone(v);
              setErrors((e) => ({ ...e, contactPhone: undefined }));
            }}
            keyboardType="phone-pad"
            maxLength={20}
          />
        ) : (
          <Muted>Đang tắt: không ai thấy số của bạn, người khác liên hệ qua bình luận.</Muted>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { ...t.bodyStrong, color: colors.text, flex: 1 },
});
