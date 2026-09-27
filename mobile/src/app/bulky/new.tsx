import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ApiError } from '../../api/client';
import { ADDRESS_MAX, isoDate, nextDays, shortDayLabel, validateBulky, type BulkyErrors } from '../../features/bulky/validate';
import { useCreateBulky, useProfile } from '../../features/citizen/api';
import { BULKY_ITEM_LABELS, DAY_SLOT_LABELS, type BulkyItemType, type DaySlot } from '../../shared/labels';
import { colors, radius, spacing } from '../../shared/theme';
import { Button, Card, CardTitle, ErrorBox, Muted, Screen } from '../../shared/ui';

const ITEM_TYPES = Object.keys(BULKY_ITEM_LABELS) as BulkyItemType[];
const SLOTS = Object.keys(DAY_SLOT_LABELS) as DaySlot[];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/** Form đăng ký như prototype `citizenBulkyNew`: loại, số lượng, địa chỉ (mặc định địa chỉ hộ), ngày, buổi. */
export default function NewBulkyScreen() {
  const profile = useProfile();
  const create = useCreateBulky();
  const today = isoDate(new Date());
  const days = useMemo(() => nextDays(new Date(), 14), []);
  const [itemType, setItemType] = useState<BulkyItemType | null>(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [address, setAddress] = useState('');
  const [addressTouched, setAddressTouched] = useState(false);
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<DaySlot | null>(null);
  const [errors, setErrors] = useState<BulkyErrors>({});

  const householdAddress = profile.data?.subject.address;
  useEffect(() => {
    if (householdAddress && !addressTouched) setAddress(householdAddress);
  }, [householdAddress, addressTouched]);

  const clear = (key: keyof BulkyErrors) => setErrors((e) => ({ ...e, [key]: undefined }));

  const onSubmit = () => {
    const found = validateBulky({ itemType, quantity, address, preferredDate }, today);
    setErrors(found);
    if (Object.keys(found).length > 0 || !itemType || !preferredDate) return;
    create.mutate(
      {
        itemType,
        itemDescription: description.trim() || undefined,
        quantity: Number(quantity),
        address: address.trim(),
        preferredDate,
        preferredSlot: slot ?? undefined,
      },
      { onSuccess: (r) => router.replace({ pathname: '/bulky/[id]', params: { id: String(r.id), fresh: '1' } }) },
    );
  };

  return (
    <Screen>
      <Card style={styles.notice}>
        <Text style={styles.noticeText}>
          Áp dụng cho nệm, tủ, sofa, thiết bị điện lớn, xà bần. {profile.data?.company?.name ?? 'Công ty thu gom'} báo phí trước
          khi đến; phí trả trực tiếp cho công ty khi thu gom.
        </Text>
      </Card>

      <Card>
        <CardTitle>Loại vật dụng *</CardTitle>
        <View style={styles.chips}>
          {ITEM_TYPES.map((t) => (
            <Chip key={t} label={BULKY_ITEM_LABELS[t]} selected={t === itemType} onPress={() => { setItemType(t); clear('itemType'); }} />
          ))}
        </View>
        {errors.itemType ? <Text style={styles.error}>{errors.itemType}</Text> : null}
        <TextInput
          accessibilityLabel="Mô tả vật dụng"
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Ví dụ: Nệm cũ 1m6 + 2 ghế hỏng"
          placeholderTextColor={colors.textMuted}
          maxLength={255}
        />
      </Card>

      <Card>
        <CardTitle>Số lượng ước tính *</CardTitle>
        <TextInput
          accessibilityLabel="Số lượng"
          style={styles.input}
          value={quantity}
          onChangeText={(v) => { setQuantity(v); clear('quantity'); }}
          keyboardType="number-pad"
          maxLength={2}
        />
        {errors.quantity ? <Text style={styles.error}>{errors.quantity}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Địa chỉ thu gom *</CardTitle>
        <TextInput
          accessibilityLabel="Địa chỉ thu gom"
          style={styles.input}
          value={address}
          onChangeText={(v) => { setAddress(v); setAddressTouched(true); clear('address'); }}
          placeholderTextColor={colors.textMuted}
          maxLength={ADDRESS_MAX}
        />
        <Muted>Mặc định là địa chỉ hộ của bạn.</Muted>
        {errors.address ? <Text style={styles.error}>{errors.address}</Text> : null}
      </Card>

      <Card>
        <CardTitle>Ngày mong muốn *</CardTitle>
        <View style={styles.chips}>
          {days.map((d) => (
            <Chip key={d} label={shortDayLabel(d)} selected={d === preferredDate} onPress={() => { setPreferredDate(d); clear('preferredDate'); }} />
          ))}
        </View>
        {errors.preferredDate ? <Text style={styles.error}>{errors.preferredDate}</Text> : null}
        <CardTitle>Buổi</CardTitle>
        <View style={styles.chips}>
          {SLOTS.map((s) => (
            <Chip key={s} label={DAY_SLOT_LABELS[s]} selected={s === slot} onPress={() => setSlot(s === slot ? null : s)} />
          ))}
        </View>
      </Card>

      {create.error ? (
        <ErrorBox message={create.error instanceof ApiError ? create.error.message : 'Gửi không thành công. Vui lòng thử lại.'} />
      ) : null}
      <Button title="Gửi đăng ký" onPress={onSubmit} loading={create.isPending} />
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
  error: { color: colors.danger, fontSize: 13 },
  notice: { backgroundColor: colors.infoSoft, borderColor: colors.info },
  noticeText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
