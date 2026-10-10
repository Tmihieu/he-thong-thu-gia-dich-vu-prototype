package vn.dongthanh.vsmt.billing.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;

/** BR-BIL-03 / BR-LD-04: bỏ miễn giảm khoản nhóm theo ký phải tính lại đ/kg × định mức × tháng, không chỉ đơn giá một kg. */
class ChargeTest {

    private Charge exemptCharge(Long quotaKg) {
        ChargeRequest request = mock(ChargeRequest.class);
        CollectionPeriod period = mock(CollectionPeriod.class);
        when(period.getStartDate()).thenReturn(LocalDate.of(2026, 10, 1));
        when(period.getEndDate()).thenReturn(LocalDate.of(2026, 10, 31));
        when(request.getPeriod()).thenReturn(period);
        ServiceSubject subject = mock(ServiceSubject.class);
        when(subject.getArea()).thenReturn(mock(Area.class));
        return Charge.issue("KT-1026-X", request, subject, mock(ServiceContract.class), null,
                new ChargeAmount(TariffGroup.BY_VOLUME, 633L, 1, 0L, true, quotaKg));
    }

    @Test
    void revokingExemptionOfPerKgChargeMultipliesByQuota() {
        Charge c = exemptCharge(600L);
        c.revokeExemption(null);
        assertThat(c.getAmount()).isEqualTo(379_800L);
        assertThat(c.getStatus()).isEqualTo(ChargeStatus.UNPAID);
    }

    @Test
    void exemptChargeWithoutSnapshotUsesContractQuotaOrIsRejected() {
        Charge c = exemptCharge(null);
        assertThatThrownBy(() -> c.revokeExemption(null)).hasMessageContaining("định mức");
        c.revokeExemption(500);
        assertThat(c.getAmount()).isEqualTo(316_500L);
    }

    @Test
    void repricingUsesTariffRateAndQuantityOfChosenGroup() {
        Charge c = exemptCharge(600L);
        assertThatThrownBy(() -> c.reprice(TariffGroup.HH_3_PLUS, 50_000L, null, null)).hasMessageContaining("chưa thu");
        c.revokeExemption(null);
        assertThatThrownBy(() -> c.reprice(TariffGroup.BY_VOLUME, 633L, null, 600L)).hasMessageContaining("không thay đổi");
        assertThatThrownBy(() -> c.reprice(TariffGroup.HH_PER_CAPITA, 20_000L, null, null)).hasMessageContaining("nhân khẩu");
        assertThatThrownBy(() -> c.reprice(TariffGroup.FULL_COST_BY_KG, 900L, null, null)).hasMessageContaining("định mức");

        c.reprice(TariffGroup.HH_PER_CAPITA, 20_000L, 4, null);
        assertThat(c.getAmount()).isEqualTo(80_000L);
        assertThat(c.getMemberCount()).isEqualTo(4);
        assertThat(c.getQuotaKg()).isNull();

        c.reprice(TariffGroup.HH_3_PLUS, 50_000L, 4, null);
        assertThat(c.getAmount()).isEqualTo(50_000L);
        assertThat(c.getTariffGroup()).isEqualTo(TariffGroup.HH_3_PLUS);
        assertThat(c.getMemberCount()).isNull();
        assertThat(c.getStatus()).isEqualTo(ChargeStatus.UNPAID);
    }

    @Test
    void cancellingKeepsReasonAndBlocksFurtherCorrection() {
        Charge c = exemptCharge(600L);
        c.cancel("Lập nhầm nhóm giá", java.time.OffsetDateTime.parse("2026-10-10T08:00:00+07:00"));
        assertThat(c.getStatus()).isEqualTo(ChargeStatus.CANCELLED);
        assertThat(c.getCancelReason()).isEqualTo("Lập nhầm nhóm giá");
        assertThat(c.isCorrectable()).isFalse();
        assertThatThrownBy(() -> c.cancel("lần hai", null)).hasMessageContaining("Chỉ hủy");
    }
}
