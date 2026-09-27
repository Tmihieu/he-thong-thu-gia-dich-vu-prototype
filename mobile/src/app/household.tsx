import { ApiError } from '../api/client';
import { useProfile } from '../features/citizen/api';
import { formatDate } from '../shared/format';
import { SUBJECT_STATUS_LABELS, SUBJECT_TYPE_LABELS, TARIFF_GROUP_LABELS } from '../shared/labels';
import { Card, CardTitle, ErrorBox, Line, Loading, Muted, Screen, Tag } from '../shared/ui';

/** Thông tin hộ như prototype `citizenHousehold`, dữ liệu thật từ `/api/citizen/me`. */
export default function HouseholdScreen() {
  const profile = useProfile();
  const p = profile.data;

  return (
    <Screen refreshing={profile.isFetching && !profile.isPending} onRefresh={() => void profile.refetch()}>
      {profile.isPending ? <Loading /> : null}
      {profile.error ? (
        <ErrorBox
          message={profile.error instanceof ApiError ? profile.error.message : 'Không tải được thông tin hộ.'}
          onRetry={() => void profile.refetch()}
        />
      ) : null}
      {p ? (
        <>
          <Card>
            <CardTitle>Hộ</CardTitle>
            <Line label="Mã hộ" value={p.subject.code} />
            <Line label="Tên hộ" value={p.subject.name} />
            <Line label="Loại" value={SUBJECT_TYPE_LABELS[p.subject.subjectType]} />
            <Line label="Địa chỉ" value={p.subject.address} />
            <Line label="Tổ" value={`${p.subject.areaName} (${p.subject.areaCode}) · ${p.subject.districtName}`} />
            {p.subject.memberCount != null ? <Line label="Số nhân khẩu" value={String(p.subject.memberCount)} /> : null}
            <Line label="SĐT của hộ" value={p.subject.phone ?? '—'} />
            <Line
              label="Tình trạng"
              value={<Tag tone={p.subject.status === 'ACTIVE' ? 'success' : p.subject.status === 'PENDING' ? 'warning' : 'default'}>{SUBJECT_STATUS_LABELS[p.subject.status]}</Tag>}
            />
          </Card>

          <Card>
            <CardTitle>Đăng ký dịch vụ</CardTitle>
            {p.contract ? (
              <>
                <Line label="Số đăng ký" value={p.contract.contractNo} />
                <Line label="Nhóm giá" value={TARIFF_GROUP_LABELS[p.contract.tariffGroup]} />
                <Line label="Hiệu lực từ" value={formatDate(p.contract.validFrom)} />
                {p.contract.validTo ? <Line label="Đến" value={formatDate(p.contract.validTo)} /> : null}
                {p.contract.exempt ? (
                  <Line label="Miễn 100%" value={<Tag tone="info">{p.contract.exemptReason ?? 'Được miễn'}</Tag>} />
                ) : null}
              </>
            ) : (
              <Muted>Hộ chưa có đăng ký dịch vụ đang hiệu lực. Liên hệ UBND xã để được hướng dẫn.</Muted>
            )}
          </Card>

          <Card>
            <CardTitle>Đơn vị thu gom</CardTitle>
            {p.company ? (
              <>
                <Line label="Công ty" value={p.company.name} />
                <Line label="Đầu mối" value={p.company.contactName} />
                <Line label="Điện thoại" value={p.company.contactPhone} />
              </>
            ) : (
              <Muted>Khu vực của hộ chưa được phân công công ty thu gom.</Muted>
            )}
          </Card>

          <Card>
            <CardTitle>Tài khoản ứng dụng</CardTitle>
            <Line label="Tên hiển thị" value={p.displayName} />
            <Line label="Số điện thoại đăng nhập" value={p.phone} />
            <Muted>Thông tin chưa đúng? Liên hệ UBND xã; cán bộ xã xác minh trước khi thay đổi.</Muted>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
