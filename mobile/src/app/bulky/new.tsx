import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { ADDRESS_MAX, isoDate, nextDays, shortDayLabel, validateBulky, type BulkyErrors } from '../../features/bulky/validate';
import { useCreateBulky, useProfile } from '../../features/citizen/api';
import { PhotoPickerField } from '../../features/photos/PhotoPickerField';
import type { UploadedPhoto } from '../../features/photos/photos';
import { errorMessage } from '../../shared/errors';
import { BULKY_ITEM_LABELS, DAY_SLOT_LABELS, type BulkyItemType, type DaySlot } from '../../shared/labels';
import { Button, Callout, Card, CardTitle, Chip, ChoiceGroup, Field, InlineError, Muted, Screen } from '../../shared/ui';

const ITEM_TYPES = Object.keys(BULKY_ITEM_LABELS) as BulkyItemType[];
const SLOTS = Object.keys(DAY_SLOT_LABELS) as DaySlot[];

/** Form đăng ký như prototype `citizenBulkyNew`: loại, số lượng, địa chỉ (mặc định địa chỉ hộ), ngày, buổi, ảnh. */
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
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [errors, setErrors] = useState<BulkyErrors>({});

  const householdAddress = profile.data?.subject.address;
  useEffect(() => {
    if (householdAddress && !addressTouched) setAddress(householdAddress);
  }, [householdAddress, addressTouched]);

  const clear = (key: keyof BulkyErrors) => setErrors((e) => ({ ...e, [key]: undefined }));

  const onSubmit = () => {
    if (create.isPending) return;
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
        photoNames: photos.map((p) => p.name),
      },
      { onSuccess: (r) => router.replace({ pathname: '/bulky/[id]', params: { id: String(r.id), fresh: '1' } }) },
    );
  };

  return (
    <Screen
      footer={
        <>
          {create.error ? <InlineError message={errorMessage(create.error, 'Gửi không thành công. Vui lòng thử lại.')} /> : null}
          {photosBusy ? <Muted>Đang tải ảnh lên, chờ xong rồi gửi.</Muted> : null}
          <Button title="Gửi đăng ký" onPress={onSubmit} loading={create.isPending} disabled={photosBusy} />
        </>
      }
    >
      <Callout tone="info">
        Áp dụng cho nệm, tủ, sofa, thiết bị điện lớn, xà bần. {profile.data?.company?.name ?? 'Công ty thu gom'} báo phí trước khi đến; phí trả trực tiếp cho công ty khi thu gom.
      </Callout>

      <Card>
        <ChoiceGroup label="Loại vật dụng *" error={errors.itemType}>
          {ITEM_TYPES.map((t) => (
            <Chip
              key={t}
              label={BULKY_ITEM_LABELS[t]}
              selected={t === itemType}
              onPress={() => {
                setItemType(t);
                clear('itemType');
              }}
            />
          ))}
        </ChoiceGroup>
        <Field
          label="Mô tả vật dụng"
          value={description}
          onChangeText={setDescription}
          placeholder="Ví dụ: Nệm cũ 1m6 + 2 ghế hỏng"
          maxLength={255}
        />
        <Field
          label="Số lượng ước tính *"
          error={errors.quantity}
          value={quantity}
          onChangeText={(v) => {
            setQuantity(v);
            clear('quantity');
          }}
          keyboardType="number-pad"
          maxLength={2}
        />
      </Card>

      <Card>
        <Field
          label="Địa chỉ thu gom *"
          hint="Mặc định là địa chỉ hộ của bạn."
          error={errors.address}
          value={address}
          onChangeText={(v) => {
            setAddress(v);
            setAddressTouched(true);
            clear('address');
          }}
          maxLength={ADDRESS_MAX}
        />
        <ChoiceGroup label="Ngày mong muốn *" error={errors.preferredDate}>
          {days.map((d) => (
            <Chip
              key={d}
              label={shortDayLabel(d)}
              selected={d === preferredDate}
              onPress={() => {
                setPreferredDate(d);
                clear('preferredDate');
              }}
            />
          ))}
        </ChoiceGroup>
        <ChoiceGroup label="Buổi">
          {SLOTS.map((s) => (
            <Chip key={s} label={DAY_SLOT_LABELS[s]} selected={s === slot} onPress={() => setSlot(s === slot ? null : s)} />
          ))}
        </ChoiceGroup>
      </Card>

      <Card>
        <CardTitle>Ảnh vật dụng</CardTitle>
        <Muted>Tối đa 5 ảnh, giúp công ty báo phí chính xác.</Muted>
        <PhotoPickerField value={photos} onChange={setPhotos} max={5} onBusyChange={setPhotosBusy} />
      </Card>
    </Screen>
  );
}
