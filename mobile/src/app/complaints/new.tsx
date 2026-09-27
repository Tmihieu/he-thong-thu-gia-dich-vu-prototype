import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../api/client';
import { useProfile, useSubmitComplaint } from '../../features/citizen/api';
import { CONTENT_MAX, validateComplaint, type ComplaintErrors } from '../../features/complaints/validate';
import { COMPLAINT_CATEGORY_LABELS, type ComplaintCategory } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, ErrorBox, Muted, Screen } from '../../shared/ui';

const CATEGORIES = Object.keys(COMPLAINT_CATEGORY_LABELS) as ComplaintCategory[];

/** Form gửi phản ánh như prototype `citizenComplaintNew`: loại, địa điểm (mặc định địa chỉ hộ), mô tả. */
export default function NewComplaintScreen() {
  const profile = useProfile();
  const submit = useSubmitComplaint();
  const [category, setCategory] = useState<ComplaintCategory | null>(null);
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [locationTouched, setLocationTouched] = useState(false);
  const [errors, setErrors] = useState<ComplaintErrors>({});

  const address = profile.data?.subject.address;
  useEffect(() => {
    if (address && !locationTouched) setLocation(address);
  }, [address, locationTouched]);

  const onSubmit = () => {
    const found = validateComplaint({ category, content, location });
    setErrors(found);
    if (Object.keys(found).length > 0 || !category) return;
    submit.mutate(
      { category, content: content.trim(), location: location.trim() || undefined },
      { onSuccess: (d) => router.replace({ pathname: '/complaints/[id]', params: { id: String(d.complaint.id), fresh: '1' } }) },
    );
  };

  return (
    <Screen>
      <Card>
        <CardTitle>Loại phản ánh *</CardTitle>
        <View style={styles.chips}>
          {CATEGORIES.map((key) => {
            const selected = key === category;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => {
                  setCategory(key);
                  setErrors((e) => ({ ...e, category: undefined }));
                }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{COMPLAINT_CATEGORY_LABELS[key]}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Địa điểm</CardTitle>
        <TextInput
          accessibilityLabel="Địa điểm"
          style={styles.input}
          value={location}
          onChangeText={(v) => {
            setLocation(v);
            setLocationTouched(true);
          }}
          placeholder="Nơi xảy ra sự việc"
          placeholderTextColor={colors.textMuted}
          maxLength={100}
        />
        <Muted>Mặc định là địa chỉ hộ của bạn; sửa lại nếu sự việc xảy ra ở nơi khác.</Muted>
        {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Mô tả chi tiết *</CardTitle>
        <TextInput
          accessibilityLabel="Mô tả chi tiết"
          style={[styles.input, styles.textarea]}
          value={content}
          onChangeText={(v) => {
            setContent(v);
            setErrors((e) => ({ ...e, content: undefined }));
          }}
          placeholder="Thời điểm, tình trạng thực tế, số lần xảy ra…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          maxLength={CONTENT_MAX}
        />
        {errors.content ? <Text style={styles.error}>{errors.content}</Text> : null}
      </Card>

      <Card style={styles.notice}>
        <Text style={styles.noticeTitle}>Sẽ gửi tới</Text>
        <Text style={styles.noticeText}>
          UBND xã tiếp nhận và chuyển cho {profile.data?.company?.name ?? 'công ty thu gom phụ trách'} nếu cần. Bạn nhận thông báo
          ở mỗi bước xử lý.
        </Text>
      </Card>

      {submit.error ? (
        <ErrorBox message={submit.error instanceof ApiError ? submit.error.message : 'Gửi không thành công. Vui lòng thử lại.'} />
      ) : null}
      <Button title="Gửi phản ánh" onPress={onSubmit} loading={submit.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipText: { fontSize: 13, color: colors.text },
  chipTextSelected: { color: colors.primaryDark, fontWeight: '700' },
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
  notice: { backgroundColor: colors.infoSoft, borderColor: colors.info },
  noticeTitle: { fontSize: 13, color: colors.info, fontWeight: '700' },
  noticeText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
