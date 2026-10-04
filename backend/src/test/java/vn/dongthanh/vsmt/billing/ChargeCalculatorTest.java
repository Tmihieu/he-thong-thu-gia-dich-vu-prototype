package vn.dongthanh.vsmt.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import vn.dongthanh.vsmt.billing.service.ChargeCalculator;
import vn.dongthanh.vsmt.billing.domain.ChargeAmount;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;

/** Viết trước (TDD) cho T17, quy tắc R1: số tiền khoản. */
class ChargeCalculatorTest {

    final ChargeCalculator calculator = new ChargeCalculator();

    final TariffVersion bg65 = TariffVersion.create("BG-65-2026", "QĐ 65/2026", LocalDate.of(2026, 9, 1), null,
            TariffStatus.ACTIVE);

    {
        bg65.addRate(TariffGroup.HH_UP_TO_2, 29_000, 11_000, "đ/hộ/tháng");
        bg65.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        bg65.addRate(TariffGroup.SMALL_250_TO_500, 170_000, 68_000, "đ/tháng");
        bg65.addRate(TariffGroup.BY_VOLUME, 453, 180, "đ/kg");
    }

    final CollectionPeriod october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg65);
    final CollectionPeriod q4 = CollectionPeriod.open(PeriodType.QUARTER, 2026, 4, null, LocalDate.of(2026, 12, 31), bg65);
    final FeeType env = FeeType.create("ENV", "Phí VSMT", PricingMode.TARIFF, null);
    final FeeType extra = FeeType.create("EXTRA", "Phụ phí", PricingMode.FIXED, 50_000L);
    final ServiceSubject subject = ServiceSubject.create("DTH-H000128", SubjectType.HOUSEHOLD, "Mẫu", null, "Số 1",
            Area.create("KV07", "Tổ 07", District.create("DTH", "Đông Thạnh")));

    ServiceContract contract(TariffGroup group, boolean exempt) {
        return ServiceContract.create("ĐK-DTH-0001", subject, group, LocalDate.of(2026, 1, 1), null, exempt,
                exempt ? "Hộ nghèo" : null, null);
    }

    @Test
    void envMonthIsGroupMonthlyPriceOfThePeriodTariff() {
        ChargeAmount a = calculator.calculate(env, october, contract(TariffGroup.HH_3_PLUS, false), null);

        assertThat(a).isEqualTo(new ChargeAmount(TariffGroup.HH_3_PLUS, 80_000L, 1, 80_000L, false, 57_000L));
    }

    @Test
    void envQuarterIsThreeMonths() {
        assertThat(calculator.calculate(env, q4, contract(TariffGroup.HH_UP_TO_2, false), null))
                .isEqualTo(new ChargeAmount(TariffGroup.HH_UP_TO_2, 40_000L, 3, 120_000L, false, 87_000L));
        assertThat(calculator.calculate(env, q4, contract(TariffGroup.SMALL_250_TO_500, false), null).amount())
                .isEqualTo(714_000L);
    }

    @Test
    void envIgnoresEnteredPrice() {
        assertThat(calculator.calculate(env, october, contract(TariffGroup.HH_3_PLUS, false), 1L).amount())
                .isEqualTo(80_000L);
    }

    @Test
    void exemptContractGivesZeroButKeepsUnitPrice() {
        assertThat(calculator.calculate(env, q4, contract(TariffGroup.HH_3_PLUS, true), null))
                .isEqualTo(new ChargeAmount(TariffGroup.HH_3_PLUS, 80_000L, 3, 0L, true, 171_000L));
        assertThat(calculator.calculate(extra, october, contract(TariffGroup.HH_3_PLUS, true), 150_000L))
                .isEqualTo(new ChargeAmount(null, 150_000L, 1, 0L, true, 0L));
    }

    @Test
    void fixedFeeUsesEnteredPriceElseDefaultAndAlwaysOneMonth() {
        assertThat(calculator.calculate(extra, q4, contract(TariffGroup.HH_3_PLUS, false), 150_000L))
                .isEqualTo(new ChargeAmount(null, 150_000L, 1, 150_000L, false, 0L));
        assertThat(calculator.calculate(extra, october, contract(TariffGroup.HH_3_PLUS, false), null))
                .isEqualTo(new ChargeAmount(null, 50_000L, 1, 50_000L, false, 0L));
    }

    @Test
    void zeroOrNegativeEnteredPriceIsRejected() {
        assertThatThrownBy(() -> calculator.calculate(extra, october, contract(TariffGroup.HH_3_PLUS, false), 0L))
                .hasMessage("Đơn giá phải lớn hơn 0.")
                .extracting("code").isEqualTo("CHARGE_PRICE_INVALID");
        assertThatThrownBy(() -> calculator.calculate(extra, october, contract(TariffGroup.HH_3_PLUS, false), -1L))
                .extracting("code").isEqualTo("CHARGE_PRICE_INVALID");
    }

    @Test
    void perKgGroupWithoutQuotaIsRejected() {
        assertThatThrownBy(() -> calculator.calculate(env, october, contract(TariffGroup.BY_VOLUME, false), null))
                .extracting("code").isEqualTo("QUOTA_KG_REQUIRED");
    }

    @Test
    void perKgGroupIsRatePerKgTimesQuotaTimesMonths() {
        ServiceContract c = contract(TariffGroup.BY_VOLUME, false);
        c.setQuotaKg(600);

        // 633 đ/kg (453 thu gom + 180 vận chuyển) × 600 kg × 1 tháng.
        assertThat(calculator.calculate(env, october, c, null))
                .isEqualTo(new ChargeAmount(TariffGroup.BY_VOLUME, 633L, 1, 379_800L, false, 271_800L));
        assertThat(calculator.calculate(env, q4, c, null).amount()).isEqualTo(1_139_400L);
        // Miễn 100% thì 0 đồng, vẫn chụp đơn giá.
        ServiceContract exempt = contract(TariffGroup.BY_VOLUME, true);
        exempt.setQuotaKg(600);
        assertThat(calculator.calculate(env, october, exempt, null).amount()).isZero();
        // Nhóm theo số người không bị định mức ảnh hưởng.
        ServiceContract household = contract(TariffGroup.HH_3_PLUS, false);
        household.setQuotaKg(600);
        assertThat(calculator.calculate(env, october, household, null).amount()).isEqualTo(80_000L);
    }

    @Test
    void groupWithoutRateInThePeriodTariffIsRejected() {
        assertThatThrownBy(() -> calculator.calculate(env, october, contract(TariffGroup.SMALL_UP_TO_126, false), null))
                .extracting("code").isEqualTo("TARIFF_RATE_NOT_FOUND");
    }

    @Test
    void overflowIsDetectedInsteadOfWrappingAround() {
        FeeType huge = FeeType.create("HUGE", "Thử tràn", PricingMode.FIXED, Long.MAX_VALUE);
        TariffVersion v = TariffVersion.create("BG-X", "x", LocalDate.of(2026, 1, 1), null, TariffStatus.ACTIVE);
        v.addRate(TariffGroup.HH_3_PLUS, Long.MAX_VALUE / 2, 0, "đ");
        CollectionPeriod q = CollectionPeriod.open(PeriodType.QUARTER, 2026, 1, null, LocalDate.of(2026, 3, 31), v);

        assertThat(calculator.calculate(huge, october, contract(TariffGroup.HH_3_PLUS, false), null).amount())
                .isEqualTo(Long.MAX_VALUE);
        assertThatThrownBy(() -> calculator.calculate(env, q, contract(TariffGroup.HH_3_PLUS, false), null))
                .isInstanceOf(ArithmeticException.class);
    }
}
