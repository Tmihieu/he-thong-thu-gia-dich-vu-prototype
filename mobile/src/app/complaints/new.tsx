import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useProfile, useSubmitComplaint, type SubmitComplaintRequest } from '../../features/citizen/api';
import { CONTENT_MAX, validateComplaint, type ComplaintErrors } from '../../features/complaints/validate';
import { errorMessage } from '../../shared/errors';
import { COMPLAINT_CATEGORY_LABELS, type ComplaintCategory } from '../../shared/labels';
import { Button, Callout, Card, ChoiceGroup, Chip, Field, InlineError, Screen } from '../../shared/ui';

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
    if (submit.isPending) return;
    const found = validateComplaint({ category, content, location });
    setErrors(found);
    if (Object.keys(found).length > 0 || !category) return;
    submit.mutate(
      // Ép kiểu tới khi schema sinh lại có FACILITY / COLLECTION_REQUEST.
      { category: category as SubmitComplaintRequest['category'], content: content.trim(), location: location.trim() || undefined },
      { onSuccess: (d) => router.replace({ pathname: '/complaints/[id]', params: { id: String(d.complaint.id), fresh: '1' } }) },
    );
  };

  return (
    <Screen
      footer={
        <>
          {submit.error ? <InlineError message={errorMessage(submit.error, 'Gửi không thành công. Vui lòng thử lại.')} /> : null}
          <Button title="Gửi phản ánh" onPress={onSubmit} loading={submit.isPending} />
        </>
      }
    >
      <Card>
        <ChoiceGroup label="Loại phản ánh *" error={errors.category}>
          {CATEGORIES.map((key) => (
            <Chip
              key={key}
              label={COMPLAINT_CATEGORY_LABELS[key]}
              selected={key === category}
              onPress={() => {
                setCategory(key);
                setErrors((e) => ({ ...e, category: undefined }));
              }}
            />
          ))}
        </ChoiceGroup>
      </Card>

      <Card>
        <Field
          label="Địa điểm"
          hint="Mặc định là địa chỉ hộ của bạn. Sửa lại nếu sự việc xảy ra ở nơi khác."
          error={errors.location}
          value={location}
          onChangeText={(v) => {
            setLocation(v);
            setLocationTouched(true);
          }}
          placeholder="Nơi xảy ra sự việc"
          maxLength={100}
        />
        <Field
          label="Mô tả chi tiết *"
          hint="Thời điểm, tình trạng thực tế, số lần xảy ra."
          error={errors.content}
          value={content}
          onChangeText={(v) => {
            setContent(v);
            setErrors((e) => ({ ...e, content: undefined }));
          }}
          multiline
          maxLength={CONTENT_MAX}
        />
      </Card>

      <Callout tone="info" title="Phản ánh sẽ gửi tới">
        UBND xã tiếp nhận và chuyển cho {profile.data?.company?.name ?? 'công ty thu gom phụ trách'} nếu cần. Bạn nhận thông báo ở mỗi bước xử lý.
      </Callout>
    </Screen>
  );
}
