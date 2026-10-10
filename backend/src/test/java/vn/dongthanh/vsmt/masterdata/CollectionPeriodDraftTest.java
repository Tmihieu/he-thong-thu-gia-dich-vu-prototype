package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;

import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.PeriodStatus;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/** Vòng đời kỳ thu có thêm Dự thảo: Dự thảo → Đang thu → Đã khóa, không nhảy cóc. */
class CollectionPeriodDraftTest {

    final TariffVersion bg65 = TariffVersion.create("BG-65-2026", "QĐ", LocalDate.of(2026, 9, 1),
            LocalDate.of(2027, 6, 30), TariffStatus.ACTIVE);
    final TariffVersion bg70 = TariffVersion.create("BG-70-2026", "QĐ", LocalDate.of(2026, 10, 1),
            LocalDate.of(2027, 6, 30), TariffStatus.ACTIVE);

    CollectionPeriod draft() {
        return CollectionPeriod.draft(PeriodType.MONTH, 2026, 11, LocalDate.of(2026, 11, 25), bg65);
    }

    @Test
    void draftStartsAsDraftOnTheFirstDayOfThePeriod() {
        CollectionPeriod p = draft();

        assertThat(p.getStatus()).isEqualTo(PeriodStatus.DRAFT);
        assertThat(p.getOpenDate()).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(p.getEndDate()).isEqualTo(LocalDate.of(2026, 11, 30));
    }

    @Test
    void publishMovesDraftToCollectingOnlyOnce() {
        CollectionPeriod p = draft();

        p.publish();

        assertThat(p.getStatus()).isEqualTo(PeriodStatus.COLLECTING);
        assertThatThrownBy(p::publish).isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void draftCannotBeLockedBeforeItIsOpened() {
        CollectionPeriod p = draft();

        assertThatThrownBy(() -> p.lock(OffsetDateTime.now(), 2L)).isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("PERIOD_INVALID_TRANSITION");
        assertThat(p.getStatus()).isEqualTo(PeriodStatus.DRAFT);
    }

    @Test
    void lockedPeriodCannotBePublished() {
        CollectionPeriod p = draft();
        p.publish();
        p.lock(OffsetDateTime.now(), 2L);

        assertThatThrownBy(p::publish).isInstanceOf(BusinessRuleException.class);
        assertThat(p.getStatus()).isEqualTo(PeriodStatus.LOCKED);
    }

    @Test
    void tariffCanBeSwappedWhileDraftButNotAfterOpening() {
        CollectionPeriod p = draft();

        p.useTariff(bg70);
        assertThat(p.getTariffVersion()).isSameAs(bg70);

        p.publish();
        assertThatThrownBy(() -> p.useTariff(bg65)).isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("PERIOD_TARIFF_LOCKED");
        assertThat(p.getTariffVersion()).isSameAs(bg70);
    }

    @Test
    void manualOpenStillGoesStraightToCollecting() {
        CollectionPeriod p = CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null, LocalDate.of(2026, 11, 25), bg65);

        assertThat(p.getStatus()).isEqualTo(PeriodStatus.COLLECTING);
    }

    @Test
    void householdDueDefaultsToThe25thAndMustBeBeforeTheSettlementDue() {
        // Kỳ tháng 11: hạn dân đóng mặc định 25/11, hạn quyết toán 05/12; kỳ quý 4: 25/12 và 05/01 năm sau.
        CollectionPeriod nov = CollectionPeriod.draft(PeriodType.MONTH, 2026, 11, null, bg65);
        assertThat(nov.getDueDate()).isEqualTo(LocalDate.of(2026, 11, 25));
        assertThat(nov.getSettlementDueDate()).isEqualTo(LocalDate.of(2026, 12, 5));
        CollectionPeriod q4 = CollectionPeriod.draft(PeriodType.QUARTER, 2026, 4, null, bg65);
        assertThat(q4.getDueDate()).isEqualTo(LocalDate.of(2026, 12, 25));
        assertThat(q4.getSettlementDueDate()).isEqualTo(LocalDate.of(2027, 1, 5));

        assertThat(CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null, LocalDate.of(2026, 12, 4), bg65).getDueDate())
                .isEqualTo(LocalDate.of(2026, 12, 4));
        assertThatThrownBy(() -> CollectionPeriod.open(PeriodType.MONTH, 2026, 11, null, LocalDate.of(2026, 12, 5), bg65))
                .extracting("code").isEqualTo("PERIOD_DUE_AFTER_SETTLEMENT");
        assertThatThrownBy(() -> nov.schedule(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 12, 6)))
                .hasMessage("Hạn dân đóng phải trước hạn quyết toán (05/12/2026).");
    }
}
