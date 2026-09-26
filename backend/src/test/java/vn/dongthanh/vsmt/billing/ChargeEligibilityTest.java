package vn.dongthanh.vsmt.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.billing.service.ChargeEligibility;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Coverage;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Decision;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Eligible;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.SkipReason;
import vn.dongthanh.vsmt.billing.service.ChargeEligibility.Skipped;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;

/** Viết trước (TDD) cho T17, quy tắc R2 (đối tượng được lập khoản) và chặn kỳ đã khóa. */
class ChargeEligibilityTest {

    final ChargeEligibility eligibility = new ChargeEligibility();
    final LocalDate issue = LocalDate.of(2026, 10, 1);
    final TariffVersion bg65 = TariffVersion.create("BG-65-2026", "QĐ 65/2026", LocalDate.of(2026, 9, 1), null,
            TariffStatus.ACTIVE);
    final CollectionPeriod october = CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg65);
    final CollectionPeriod q4 = CollectionPeriod.open(PeriodType.QUARTER, 2026, 4, null, LocalDate.of(2026, 12, 31), bg65);

    final ServiceSubject subject = ServiceSubject.create("DTH-H000128", SubjectType.HOUSEHOLD, "Mẫu", "Số 1",
            Area.create("KV07", "Tổ 07", District.create("DTH", "Đông Thạnh")));
    final ServiceContract contract = ServiceContract.create("ĐK-DTH-0001", subject, TariffGroup.HH_3_PLUS,
            LocalDate.of(2026, 1, 1), null, false, null, null);

    {
        subject.setStatus(SubjectStatus.ACTIVE);
    }

    Decision decide(List<ServiceContract> contracts, Long companyId, List<Coverage> existing, CollectionPeriod period) {
        return eligibility.decide(subject, contracts, companyId, existing, period, issue);
    }

    @Test
    void activeSubjectWithContractInAssignedAreaIsEligible() {
        assertThat(decide(List.of(contract), 1L, List.of(), october)).isEqualTo(new Eligible(contract, 1L));
    }

    @Test
    void subjectNotActiveIsSkipped() {
        subject.setStatus(SubjectStatus.PENDING);
        assertThat(decide(List.of(contract), 1L, List.of(), october))
                .isInstanceOfSatisfying(Skipped.class, s -> assertThat(s.reason()).isEqualTo(SkipReason.SUBJECT_NOT_ACTIVE));
        subject.setStatus(SubjectStatus.ENDED);
        assertThat(((Skipped) decide(List.of(contract), 1L, List.of(), october)).reason())
                .isEqualTo(SkipReason.SUBJECT_NOT_ACTIVE);
    }

    @Test
    void noContractInEffectOnIssueDateIsSkipped() {
        ServiceContract ended = ServiceContract.create("ĐK-DTH-0002", subject, TariffGroup.HH_3_PLUS,
                LocalDate.of(2026, 1, 1), LocalDate.of(2026, 9, 30), false, null, null);
        ServiceContract future = ServiceContract.create("ĐK-DTH-0003", subject, TariffGroup.HH_3_PLUS,
                LocalDate.of(2026, 11, 1), null, false, null, null);

        Decision d = decide(List.of(ended, future), 1L, List.of(), october);

        assertThat(d).isInstanceOfSatisfying(Skipped.class, s -> {
            assertThat(s.reason()).isEqualTo(SkipReason.NO_ACTIVE_CONTRACT);
            assertThat(s.message()).contains("01/10/2026");
        });
        assertThat(((Skipped) decide(List.of(), 1L, List.of(), october)).reason()).isEqualTo(SkipReason.NO_ACTIVE_CONTRACT);
    }

    @Test
    void areaWithoutCompanyIsSkippedAsWarning() {
        Skipped s = (Skipped) decide(List.of(contract), null, List.of(), october);

        assertThat(s.reason()).isEqualTo(SkipReason.AREA_WITHOUT_COMPANY);
        assertThat(s.reason().warning()).isTrue();
        assertThat(s.message()).contains("KV07");
    }

    @Test
    void monthInsideAnAlreadyChargedQuarterIsDuplicate() {
        Coverage q4Charged = new Coverage(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 12, 31));
        assertThat(((Skipped) decide(List.of(contract), 1L, List.of(q4Charged), october)).reason())
                .isEqualTo(SkipReason.DUPLICATE_CHARGE);
    }

    @Test
    void quarterContainingAnAlreadyChargedMonthIsDuplicate() {
        Coverage novemberCharged = new Coverage(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30));
        assertThat(((Skipped) decide(List.of(contract), 1L, List.of(novemberCharged), q4)).reason())
                .isEqualTo(SkipReason.DUPLICATE_CHARGE);
    }

    @Test
    void adjacentPeriodsAreNotDuplicates() {
        List<Coverage> existing = List.of(new Coverage(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 30)),
                new Coverage(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30)));
        assertThat(decide(List.of(contract), 1L, existing, october)).isInstanceOf(Eligible.class);
    }

    @Test
    void reasonsAreCheckedInOrderStatusContractCompanyDuplicate() {
        subject.setStatus(SubjectStatus.PENDING);
        Coverage dup = new Coverage(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 31));
        assertThat(((Skipped) decide(List.of(), null, List.of(dup), october)).reason())
                .isEqualTo(SkipReason.SUBJECT_NOT_ACTIVE);
        subject.setStatus(SubjectStatus.ACTIVE);
        assertThat(((Skipped) decide(List.of(), null, List.of(dup), october)).reason())
                .isEqualTo(SkipReason.NO_ACTIVE_CONTRACT);
        assertThat(((Skipped) decide(List.of(contract), null, List.of(dup), october)).reason())
                .isEqualTo(SkipReason.AREA_WITHOUT_COMPANY);
        assertThat(SkipReason.DUPLICATE_CHARGE.warning()).isFalse();
    }

    @Test
    void lockedPeriodCannotBeBilled() {
        assertThatCode(() -> ChargeEligibility.requireBillable(october)).doesNotThrowAnyException();
        october.startCollecting();
        assertThatCode(() -> ChargeEligibility.requireBillable(october)).doesNotThrowAnyException();

        ReflectionTestUtils.setField(october, "status", vn.dongthanh.vsmt.masterdata.domain.PeriodStatus.LOCKED);
        assertThatThrownBy(() -> ChargeEligibility.requireBillable(october))
                .extracting("code").isEqualTo("PERIOD_LOCKED");
    }
}
