package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.ContractCommand;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.SubjectCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Viết trước cho T15: sinh mã, hợp đồng chồng hiệu lực bị chặn, miễn phải có lý do, ngừng đối tượng, phân quyền. */
class SubjectServiceTest {

    final ServiceSubjectRepository subjects = mock(ServiceSubjectRepository.class);
    final ServiceContractRepository contracts = mock(ServiceContractRepository.class);
    final AreaRepository areas = mock(AreaRepository.class);
    final AreaAssignmentService assignments = mock(AreaAssignmentService.class);
    final AuditService audit = mock(AuditService.class);
    final SubjectService service = new SubjectService(subjects, contracts, areas, assignments, audit);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final Area kv07 = withId(Area.create("KV07", "Tổ dân phố 07", District.create("DTH", "Đông Thạnh")), 7L);
    final List<ServiceContract> stored = new ArrayList<>();

    @BeforeEach
    void setUp() {
        when(areas.findByIdWithDistrict(7L)).thenReturn(Optional.of(kv07));
        when(subjects.maxCodeNumber("DTH-H")).thenReturn(127);
        when(subjects.maxCodeNumber("DTH-KD")).thenReturn(0);
        when(contracts.maxContractNumber("ĐK-DTH-")).thenReturn(41);
        when(subjects.save(any(ServiceSubject.class))).thenAnswer(inv -> withId(inv.getArgument(0), 500L));
        when(contracts.save(any(ServiceContract.class))).thenAnswer(inv -> {
            stored.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
        when(contracts.findBySubjectIdOrderByValidFromDesc(any())).thenAnswer(inv -> List.copyOf(stored));
    }

    @Test
    void createGeneratesSubjectCodeAndContractNumberPerDistrict() {
        ServiceSubject s = service.create(household(), contract("2026-01-01", null), officer);

        assertThat(s.getCode()).isEqualTo("DTH-H000128");
        assertThat(s.getStatus()).isEqualTo(SubjectStatus.ACTIVE);
        assertThat(stored).singleElement().satisfies(c -> {
            assertThat(c.getContractNo()).isEqualTo("ĐK-DTH-0042");
            assertThat(c.getTariffGroup()).isEqualTo(TariffGroup.HH_3_PLUS);
        });
        verify(audit).record(eq(officer), eq("CREATE_SUBJECT"), eq("ServiceSubject"), eq("DTH-H000128"), eq(null), any());
    }

    @Test
    void businessHouseholdCodeUsesKdPrefixWithFiveDigits() {
        SubjectCommand kd = new SubjectCommand(SubjectType.BUSINESS_HOUSEHOLD, "Cửa hàng Mẫu", "Số 1 đường Mẫu", 7L,
                null, null, "Người Mẫu", null, null);
        assertThat(service.create(kd, null, officer).getCode()).isEqualTo("DTH-KD00001");
    }

    @Test
    void subjectWithoutContractIsPending() {
        assertThat(service.create(household(), null, officer).getStatus()).isEqualTo(SubjectStatus.PENDING);
    }

    @Test
    void secondContractOverlappingTheCurrentOneIs422() {
        ServiceSubject s = service.create(household(), contract("2026-01-01", null), officer);
        when(subjects.findByIdWithArea(500L)).thenReturn(Optional.of(s));

        assertThatThrownBy(() -> service.addContract(500L, contract("2026-06-01", null), officer))
                .extracting("code").isEqualTo("CONTRACT_OVERLAP");
    }

    @Test
    void contractAfterThePreviousOneEndedIsAllowed() {
        ServiceSubject s = service.create(household(), contract("2026-01-01", "2026-06-30"), officer);
        when(subjects.findByIdWithArea(500L)).thenReturn(Optional.of(s));

        ServiceContract next = service.addContract(500L, contract("2026-07-01", null), officer);

        assertThat(next.getValidFrom()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(stored).hasSize(2);
    }

    @Test
    void exemptionRequiresReasonAndValidToMustNotPrecedeValidFrom() {
        ContractCommand exemptNoReason = new ContractCommand(TariffGroup.HH_3_PLUS, LocalDate.of(2026, 1, 1), null,
                true, " ", null, null);
        assertThatThrownBy(() -> service.create(household(), exemptNoReason, officer))
                .extracting("code").isEqualTo("EXEMPT_REASON_REQUIRED");
        assertThatThrownBy(() -> service.create(household(), contract("2026-05-01", "2026-04-30"), officer))
                .extracting("code").isEqualTo("CONTRACT_DATES_INVALID");
    }

    @Test
    void endingSubjectClosesItsActiveContract() {
        ServiceSubject s = service.create(household(), contract("2026-01-01", null), officer);
        when(subjects.findByIdWithArea(500L)).thenReturn(Optional.of(s));

        service.end(500L, LocalDate.of(2026, 9, 30), "Chuyển đi", officer);

        assertThat(s.getStatus()).isEqualTo(SubjectStatus.ENDED);
        assertThat(stored.get(0).getValidTo()).isEqualTo(LocalDate.of(2026, 9, 30));
        verify(audit).record(eq(officer), eq("END_SUBJECT"), eq("ServiceSubject"), eq("DTH-H000128"), any(), any());
    }

    @Test
    void updateKeepsCodeAndChangesFields() {
        ServiceSubject s = service.create(household(), null, officer);
        when(subjects.findByIdWithArea(500L)).thenReturn(Optional.of(s));

        service.update(500L, new SubjectCommand(SubjectType.HOUSEHOLD, "Tên Mới", "Số 9 đường Mẫu", 7L, "0902000999",
                4, null, null, "đổi chủ hộ"), officer);

        assertThat(s.getCode()).isEqualTo("DTH-H000128");
        assertThat(s.getName()).isEqualTo("Tên Mới");
        assertThat(s.getPhone()).isEqualTo("0902000999");
    }

    @Test
    void onlyCommuneOfficerWritesAndCompanySeesOnlyAssignedAreas() {
        CurrentUser dv02 = new CurrentUser(5L, "dv02", Role.COMPANY_MANAGER, 2L);
        assertThatThrownBy(() -> service.create(household(), null, dv02)).isInstanceOf(AccessDeniedException.class);

        ServiceSubject s = service.create(household(), null, officer);
        when(subjects.findByIdWithArea(500L)).thenReturn(Optional.of(s));
        when(assignments.companyOf(7L, LocalDate.now())).thenReturn(Optional.of(1L));

        assertThatThrownBy(() -> service.get(500L, dv02)).extracting("code").isEqualTo("SUBJECT_NOT_FOUND");
        assertThat(service.get(500L, new CurrentUser(6L, "dv01", Role.COMPANY_MANAGER, 1L))).isSameAs(s);
    }

    private static SubjectCommand household() {
        return new SubjectCommand(SubjectType.HOUSEHOLD, "Nguyễn Văn Mẫu", "Số 12 đường Mẫu", 7L, "0902000128", 4,
                null, null, null);
    }

    private static ContractCommand contract(String from, String to) {
        return new ContractCommand(TariffGroup.HH_3_PLUS, LocalDate.parse(from), to == null ? null : LocalDate.parse(to),
                false, null, null, null);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
