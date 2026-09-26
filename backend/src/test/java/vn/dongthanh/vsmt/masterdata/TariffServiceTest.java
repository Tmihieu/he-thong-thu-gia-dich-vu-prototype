package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;

import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

class TariffServiceTest {

    final TariffVersionRepository repo = mock(TariffVersionRepository.class);
    final TariffService service = new TariffService(repo, mock(FeeTypeRepository.class));

    final TariffVersion bg67 = version("BG-67-2025", "2025-06-01", "2026-08-31", TariffStatus.EXPIRED);
    final TariffVersion bg65 = version("BG-65-2026", "2026-09-01", "2027-06-30", TariffStatus.ACTIVE);

    {
        bg65.addRate(TariffGroup.HH_UP_TO_2, 29_000, 11_000, "đ/hộ/tháng");
        bg65.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        bg67.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
    }

    void published(TariffVersion... versions) {
        when(repo.findAllWithRatesByStatusNot(TariffStatus.DRAFT)).thenReturn(List.of(versions));
    }

    @Test
    void picksVersionByValidityIncludingExpiredForPastDates() {
        published(bg67, bg65);

        assertThat(service.activeVersionOn(LocalDate.of(2026, 8, 15))).isSameAs(bg67);
        assertThat(service.activeVersionOn(LocalDate.of(2026, 10, 1))).isSameAs(bg65);
    }

    @Test
    void validityBoundariesAreInclusive() {
        published(bg67, bg65);

        assertThat(service.activeVersionOn(LocalDate.of(2026, 8, 31))).isSameAs(bg67);
        assertThat(service.activeVersionOn(LocalDate.of(2026, 9, 1))).isSameAs(bg65);
        assertThat(service.activeVersionOn(LocalDate.of(2027, 6, 30))).isSameAs(bg65);
    }

    @Test
    void dateOutsideEveryVersionFailsWithClearMessage() {
        published(bg67, bg65);

        assertThatThrownBy(() -> service.activeVersionOn(LocalDate.of(2027, 7, 1)))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Không có biểu giá có hiệu lực vào ngày 01/07/2027.")
                .extracting("code").isEqualTo("TARIFF_NOT_FOUND");
        assertThatThrownBy(() -> service.activeVersionOn(LocalDate.of(2025, 5, 31)))
                .extracting("code").isEqualTo("TARIFF_NOT_FOUND");
    }

    @Test
    void openEndedVersionCoversFutureDates() {
        TariffVersion open = version("BG-OPEN", "2027-07-01", null, TariffStatus.ACTIVE);
        published(bg65, open);

        assertThat(service.activeVersionOn(LocalDate.of(2030, 1, 1))).isSameAs(open);
    }

    @Test
    void overlapBetweenActiveAndExpiredPrefersActive() {
        TariffVersion oldOverlapping = version("BG-OLD", "2026-01-01", "2026-12-31", TariffStatus.EXPIRED);
        published(oldOverlapping, bg65);

        assertThat(service.activeVersionOn(LocalDate.of(2026, 10, 1))).isSameAs(bg65);
    }

    @Test
    void overlapWithoutASingleActiveVersionIsAmbiguous() {
        TariffVersion a = version("BG-A", "2026-01-01", "2026-12-31", TariffStatus.EXPIRED);
        TariffVersion b = version("BG-B", "2026-06-01", "2026-12-31", TariffStatus.EXPIRED);
        published(a, b);

        assertThatThrownBy(() -> service.activeVersionOn(LocalDate.of(2026, 7, 1)))
                .extracting("code").isEqualTo("TARIFF_AMBIGUOUS");
    }

    @Test
    void rateOnReturnsGroupRateOfTheVersionInEffect() {
        published(bg67, bg65);

        assertThat(service.rateOn(LocalDate.of(2026, 10, 1), TariffGroup.HH_3_PLUS).getMonthlyTotal())
                .isEqualTo(80_000);
        assertThat(service.rateOn(LocalDate.of(2026, 10, 1), TariffGroup.HH_UP_TO_2).getMonthlyTotal())
                .isEqualTo(40_000);
        assertThatThrownBy(() -> service.rateOn(LocalDate.of(2026, 8, 1), TariffGroup.HH_UP_TO_2))
                .extracting("code").isEqualTo("TARIFF_RATE_NOT_FOUND");
    }

    @Test
    void rateTotalIsSumOfComponentsAndNegativeIsRejected() {
        TariffVersion v = version("BG-X", "2026-01-01", null, TariffStatus.DRAFT);

        assertThat(v.addRate(TariffGroup.SMALL_GENERATOR, 119_000, 0, "đ/tháng").getMonthlyTotal()).isEqualTo(119_000);
        assertThatThrownBy(() -> v.addRate(TariffGroup.BY_VOLUME, -1, 0, "đ/tháng"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static TariffVersion version(String code, String from, String to, TariffStatus status) {
        return TariffVersion.create(code, "QĐ thử", LocalDate.parse(from), to == null ? null : LocalDate.parse(to),
                status);
    }
}
