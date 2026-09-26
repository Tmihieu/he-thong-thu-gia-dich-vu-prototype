package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService.AssignCommand;
import vn.dongthanh.vsmt.masterdata.service.AreaReassignedEvent;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Viết trước (TDD) cho T13: phân công mới, đổi công ty giữ lịch sử, chặn chồng lấn, nhiều tổ, ngày trước hiện tại. */
class AreaAssignmentServiceTest {

    final AreaAssignmentRepository assignments = mock(AreaAssignmentRepository.class);
    final AreaRepository areas = mock(AreaRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);
    final AuditService audit = mock(AuditService.class);
    final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    final AreaAssignmentService service = new AreaAssignmentService(assignments, areas, companies, audit, events);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final District dth = District.create("DTH", "Đông Thạnh");
    final Area kv07 = withId(Area.create("KV07", "Tổ dân phố 07", dth), 7L);
    final Area kv09 = withId(Area.create("KV09", "Tổ dân phố 09", dth), 9L);
    final Area kv24 = withId(Area.create("KV24", "Tổ dân phố 24", dth), 24L);
    final Company dv01 = withId(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)), 1L);
    final Company dv03 = withId(Company.create("DV03", "Công ty Ba", "B", "0900000003", LocalDate.of(2026, 1, 1)), 3L);

    /** Kho giả: lịch sử phân công theo khu vực, mới nhất trước. */
    final Map<Long, List<AreaAssignment>> store = new HashMap<>();

    @BeforeEach
    void setUp() {
        when(areas.findAllById(any())).thenAnswer(inv -> {
            List<Area> found = new ArrayList<>();
            for (Object id : (Iterable<?>) inv.getArgument(0)) {
                List.of(kv07, kv09, kv24).stream().filter(a -> a.getId().equals(id)).forEach(found::add);
            }
            return found;
        });
        when(companies.findById(1L)).thenReturn(Optional.of(dv01));
        when(companies.findById(3L)).thenReturn(Optional.of(dv03));
        when(assignments.findHistory(any())).thenAnswer(inv -> store.getOrDefault((Long) inv.getArgument(0), List.of())
                .stream().sorted(Comparator.comparing(AreaAssignment::getValidFrom).reversed()).toList());
        when(assignments.save(any(AreaAssignment.class))).thenAnswer(inv -> {
            AreaAssignment a = inv.getArgument(0);
            store.computeIfAbsent(a.getArea().getId(), k -> new ArrayList<>()).add(a);
            return a;
        });
    }

    @Test
    void newAssignmentForUnassignedArea() {
        List<AreaAssignment> created = service.assign(cmd(List.of(24L), 1L, "2026-10-01"), officer);

        assertThat(created).singleElement().satisfies(a -> {
            assertThat(a.getArea()).isSameAs(kv24);
            assertThat(a.getCompany()).isSameAs(dv01);
            assertThat(a.getValidFrom()).isEqualTo(LocalDate.of(2026, 10, 1));
            assertThat(a.getValidTo()).isNull();
        });
        assertThat(service.companyOf(24L, LocalDate.of(2026, 10, 1))).contains(1L);
        assertThat(service.companyOf(24L, LocalDate.of(2026, 9, 30))).isEmpty();
        verify(audit).record(eq(officer), eq("ASSIGN_AREA"), eq("AreaAssignment"), eq("KV24"), eq(null), any());
        verify(events, never()).publishEvent(any());
    }

    @Test
    void changingCompanyClosesOldAssignmentAndKeepsHistory() {
        service.assign(cmd(List.of(7L), 3L, "2026-09-01"), officer);

        service.assign(cmd(List.of(7L), 1L, "2026-10-15"), officer);

        List<AreaAssignment> history = service.history(7L);
        assertThat(history).hasSize(2);
        assertThat(history.get(1).getCompany()).isSameAs(dv03);
        assertThat(history.get(1).getValidTo()).isEqualTo(LocalDate.of(2026, 10, 14));
        assertThat(history.get(0).getCompany()).isSameAs(dv01);
        assertThat(service.companyOf(7L, LocalDate.of(2026, 10, 14))).contains(3L);
        assertThat(service.companyOf(7L, LocalDate.of(2026, 10, 15))).contains(1L);
        verify(events).publishEvent(new AreaReassignedEvent(7L, 3L, 1L, LocalDate.of(2026, 10, 15)));
    }

    @Test
    void overlappingAssignmentOnTheSameStartDayIsBlocked() {
        service.assign(cmd(List.of(7L), 3L, "2026-09-01"), officer);

        assertThatThrownBy(() -> service.assign(cmd(List.of(7L), 1L, "2026-09-01"), officer))
                .isInstanceOf(BusinessRuleException.class)
                .extracting("code").isEqualTo("ASSIGNMENT_OVERLAP");
        assertThat(service.history(7L)).hasSize(1);
    }

    @Test
    void assignsSeveralAreasAtOnce() {
        service.assign(cmd(List.of(7L), 3L, "2026-09-01"), officer);

        List<AreaAssignment> created = service.assign(cmd(List.of(7L, 9L, 24L), 1L, "2026-11-01"), officer);

        assertThat(created).extracting(a -> a.getArea().getCode()).containsExactly("KV07", "KV09", "KV24");
        assertThat(service.companyOf(9L, LocalDate.of(2026, 11, 1))).contains(1L);
        assertThat(service.companyOf(7L, LocalDate.of(2026, 10, 31))).contains(3L);
        verify(audit, times(4)).record(any(), eq("ASSIGN_AREA"), anyString(), any(), any(), any());
    }

    @Test
    void fromDateBeforeCurrentAssignmentIs422() {
        service.assign(cmd(List.of(7L), 3L, "2026-09-01"), officer);

        assertThatThrownBy(() -> service.assign(cmd(List.of(7L), 1L, "2026-08-15"), officer))
                .isExactlyInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("01/09/2026")
                .extracting("code").isEqualTo("ASSIGNMENT_BEFORE_CURRENT");
    }

    @Test
    void reassigningToTheSameCompanyIsRejected() {
        service.assign(cmd(List.of(7L), 3L, "2026-09-01"), officer);

        assertThatThrownBy(() -> service.assign(cmd(List.of(7L), 3L, "2026-10-01"), officer))
                .extracting("code").isEqualTo("ASSIGNMENT_SAME_COMPANY");
    }

    @Test
    void oldAssignmentAlreadyEndedBeforeNewOneIsLeftUntouched() {
        service.assign(cmd(List.of(7L), 3L, "2026-09-01"), officer);
        service.history(7L).get(0).closeOn(LocalDate.of(2026, 9, 30));

        service.assign(cmd(List.of(7L), 1L, "2026-11-01"), officer);

        assertThat(service.history(7L).get(1).getValidTo()).isEqualTo(LocalDate.of(2026, 9, 30));
        assertThat(service.companyOf(7L, LocalDate.of(2026, 10, 15))).isEmpty();
    }

    @Test
    void onlyCommuneOfficerAssignsAndUnknownIdsFail() {
        assertThatThrownBy(() -> service.assign(cmd(List.of(7L), 1L, "2026-10-01"),
                new CurrentUser(1L, "admin", Role.ADMIN, null))).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.assign(cmd(List.of(99L), 1L, "2026-10-01"), officer))
                .extracting("code").isEqualTo("AREA_NOT_FOUND");
        assertThatThrownBy(() -> service.assign(cmd(List.of(7L), 42L, "2026-10-01"), officer))
                .extracting("code").isEqualTo("COMPANY_NOT_FOUND");
    }

    private static AssignCommand cmd(List<Long> areaIds, Long companyId, String from) {
        return new AssignCommand(areaIds, companyId, LocalDate.parse(from), null, null);
    }

    private static <T> T withId(T entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
        return entity;
    }
}
