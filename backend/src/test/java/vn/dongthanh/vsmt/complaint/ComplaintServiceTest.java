package vn.dongthanh.vsmt.complaint;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import vn.dongthanh.vsmt.complaint.domain.Complaint;
import vn.dongthanh.vsmt.complaint.domain.ComplaintCategory;
import vn.dongthanh.vsmt.complaint.domain.ComplaintChannel;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEvent;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEventRepository;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEventType;
import vn.dongthanh.vsmt.complaint.domain.ComplaintRepository;
import vn.dongthanh.vsmt.complaint.domain.ComplaintStatus;
import vn.dongthanh.vsmt.complaint.service.ComplaintService;
import vn.dongthanh.vsmt.complaint.service.ComplaintService.CreateComplaintCommand;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.domain.RecipientType;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/** Viết trước (TDD) cho T36: luồng NEW → PROCESSING → RESOLVED, timeline chỉ thêm, công ty chỉ thấy khi được chuyển (G12). */
class ComplaintServiceTest {

    final ComplaintRepository complaints = mock(ComplaintRepository.class);
    final ComplaintEventRepository events = mock(ComplaintEventRepository.class);
    final AreaRepository areas = mock(AreaRepository.class);
    final ServiceSubjectRepository subjects = mock(ServiceSubjectRepository.class);
    final CompanyRepository companies = mock(CompanyRepository.class);
    final AreaAssignmentService assignments = mock(AreaAssignmentService.class);
    final NotificationService notifications = mock(NotificationService.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-14T02:40:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final ComplaintService service = new ComplaintService(complaints, events, areas, subjects, companies, assignments,
            notifications, clock);

    final CurrentUser officer = new CurrentUser(2L, "canbo_xa", Role.COMMUNE_OFFICER, null);
    final CurrentUser dv01Manager = new CurrentUser(11L, "dv01", Role.COMPANY_MANAGER, 1L);
    final CurrentUser dv02Manager = new CurrentUser(12L, "dv02", Role.COMPANY_MANAGER, 2L);
    final List<ComplaintEvent> saved = new ArrayList<>();
    Area kv07;
    Company dv01;

    @BeforeEach
    void setUp() {
        District dth = District.create("DTH", "Đông Thạnh");
        kv07 = Area.create("KV07", "Tổ dân phố 07", dth);
        ReflectionTestUtils.setField(kv07, "id", 7L);
        dv01 = Company.create("DV01", "Công ty MTĐT Đông Thạnh", "A", "0900000001", LocalDate.of(2026, 1, 1));
        ReflectionTestUtils.setField(dv01, "id", 1L);
        when(areas.findById(7L)).thenReturn(Optional.of(kv07));
        when(companies.findById(1L)).thenReturn(Optional.of(dv01));
        when(assignments.companyOf(7L, LocalDate.of(2026, 10, 14))).thenReturn(Optional.of(1L));
        when(complaints.maxCodeNumber("KN-1026-")).thenReturn(2);
        when(complaints.save(any(Complaint.class))).thenAnswer(inv -> {
            Complaint c = inv.getArgument(0);
            ReflectionTestUtils.setField(c, "id", 40L);
            when(complaints.findByIdWithDetails(40L)).thenReturn(Optional.of(c));
            return c;
        });
        when(events.save(any(ComplaintEvent.class))).thenAnswer(inv -> {
            saved.add(inv.getArgument(0));
            return inv.getArgument(0);
        });
    }

    @Test
    void officerRecordsPhoneComplaintAsNewWithReceivedEvent() {
        Complaint c = create();

        assertThat(c.getCode()).isEqualTo("KN-1026-003");
        assertThat(c.getStatus()).isEqualTo(ComplaintStatus.NEW);
        assertThat(c.getReceivedDate()).isEqualTo(LocalDate.of(2026, 10, 14));
        assertThat(saved).extracting(ComplaintEvent::getEventType).containsExactly(ComplaintEventType.RECEIVED);
        assertThat(saved.get(0).getActorLabel()).isEqualTo("Cán bộ xã");
        ArgumentCaptor<NotificationCommand> sent = ArgumentCaptor.forClass(NotificationCommand.class);
        verify(notifications).publish(sent.capture(), eq(2L));
        assertThat(sent.getValue().type()).isEqualTo(RecipientType.ROLE);
        assertThat(sent.getValue().role()).isEqualTo(Role.COMMUNE_OFFICER);
        assertThat(sent.getValue().kind()).isEqualTo(NotificationKind.COMPLAINT);
    }

    @Test
    void officerCannotRecordAnAppComplaint() {
        assertThatThrownBy(() -> service.create(command(ComplaintChannel.APP), officer))
                .extracting("code").isEqualTo("COMPLAINT_CHANNEL_INVALID");
    }

    @Test
    void forwardDefaultsToAreaCompanyWithThreeDayDeadlineAndNotifiesCompany() {
        Complaint c = create();

        service.forward(c.getId(), null, null, officer);

        assertThat(c.getStatus()).isEqualTo(ComplaintStatus.PROCESSING);
        assertThat(c.getForwardedCompany()).isSameAs(dv01);
        assertThat(c.getDeadline()).isEqualTo(LocalDate.of(2026, 10, 17));
        assertThat(saved).extracting(ComplaintEvent::getEventType)
                .containsExactly(ComplaintEventType.RECEIVED, ComplaintEventType.FORWARDED);
        assertThat(saved.get(1).getCompanyId()).isEqualTo(1L);
        assertThat(saved.get(1).getContent()).isEqualTo("Chuyển Công ty MTĐT Đông Thạnh xử lý, hạn 17/10/2026");
        ArgumentCaptor<NotificationCommand> sent = ArgumentCaptor.forClass(NotificationCommand.class);
        verify(notifications, times(2)).publish(sent.capture(), eq(2L));
        assertThat(sent.getValue().type()).isEqualTo(RecipientType.COMPANY);
        assertThat(sent.getValue().companyId()).isEqualTo(1L);
        assertThat(sent.getValue().title()).isEqualTo("Xã chuyển khiếu nại KN-1026-003 · hạn 17/10/2026");
    }

    @Test
    void forwardingTwiceOrWithoutCompanyIs422() {
        Complaint c = create();
        service.forward(c.getId(), null, null, officer);

        assertThatThrownBy(() -> service.forward(c.getId(), 1L, null, officer))
                .extracting("code").isEqualTo("COMPLAINT_ALREADY_FORWARDED");

        when(assignments.companyOf(7L, LocalDate.of(2026, 10, 14))).thenReturn(Optional.empty());
        Complaint other = create();
        ReflectionTestUtils.setField(other, "forwardedCompany", null);
        assertThatThrownBy(() -> service.forward(other.getId(), null, null, officer))
                .extracting("code").isEqualTo("COMPLAINT_NO_COMPANY");
    }

    @Test
    void onlyForwardedCompanyRepliesAndStatusStaysProcessing() {
        Complaint c = create();

        assertThatThrownBy(() -> service.reply(c.getId(), "Đã thu", dv01Manager))
                .isInstanceOf(NotFoundException.class);
        service.forward(c.getId(), null, null, officer);
        assertThatThrownBy(() -> service.reply(c.getId(), "Đã thu", dv02Manager))
                .isInstanceOf(NotFoundException.class);

        service.reply(c.getId(), "Đã bổ sung chuyến thu gom trong ngày", dv01Manager);

        assertThat(c.getStatus()).isEqualTo(ComplaintStatus.PROCESSING);
        ComplaintEvent reply = saved.get(2);
        assertThat(reply.getEventType()).isEqualTo(ComplaintEventType.COMPANY_REPLIED);
        assertThat(reply.getActorLabel()).isEqualTo("Công ty MTĐT Đông Thạnh");
        assertThat(reply.getCompanyId()).isEqualTo(1L);
        ArgumentCaptor<NotificationCommand> sent = ArgumentCaptor.forClass(NotificationCommand.class);
        verify(notifications).publish(sent.capture(), eq(11L));
        assertThat(sent.getValue().role()).isEqualTo(Role.COMMUNE_OFFICER);
        assertThat(sent.getValue().title()).isEqualTo("DV01 phản hồi khiếu nại KN-1026-003");
    }

    @Test
    void closeRequiresResolutionAndClosedComplaintRejectsEveryStep() {
        Complaint c = create();
        service.forward(c.getId(), null, null, officer);

        assertThatThrownBy(() -> service.close(c.getId(), " ", officer))
                .extracting("code").isEqualTo("COMPLAINT_RESOLUTION_REQUIRED");
        service.close(c.getId(), "Đã bổ sung chuyến thu gom", officer);

        assertThat(c.getStatus()).isEqualTo(ComplaintStatus.RESOLVED);
        assertThat(c.getResolvedAt()).isNotNull();
        assertThat(saved).extracting(ComplaintEvent::getEventType).containsExactly(ComplaintEventType.RECEIVED,
                ComplaintEventType.FORWARDED, ComplaintEventType.CLOSED);
        assertThatThrownBy(() -> service.close(c.getId(), "Lần hai", officer)).extracting("code").isEqualTo("COMPLAINT_CLOSED");
        assertThatThrownBy(() -> service.reply(c.getId(), "Muộn", dv01Manager)).extracting("code").isEqualTo("COMPLAINT_CLOSED");
        assertThat(saved).hasSize(3);
    }

    @Test
    void closingANewComplaintDirectlyIsAllowedAndDoesNotNotifyAnyCompany() {
        Complaint c = create();

        service.close(c.getId(), "Đã giải thích mức thu cho hộ", officer);

        assertThat(c.getStatus()).isEqualTo(ComplaintStatus.RESOLVED);
        ArgumentCaptor<NotificationCommand> sent = ArgumentCaptor.forClass(NotificationCommand.class);
        verify(notifications, times(1)).publish(sent.capture(), any());
        assertThat(sent.getAllValues()).noneMatch(n -> n.type() == RecipientType.COMPANY);
    }

    @Test
    void companyCannotCreateForwardOrClose() {
        assertThatThrownBy(() -> service.create(command(ComplaintChannel.PHONE), dv01Manager))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.forward(40L, null, null, dv01Manager)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.close(40L, "x", dv01Manager)).isInstanceOf(AccessDeniedException.class);
        verify(complaints, never()).save(any());
    }

    @Test
    void overdueIsComputedFromDeadline() {
        Complaint c = create();
        service.forward(c.getId(), null, null, officer);

        assertThat(c.isOverdue(LocalDate.of(2026, 10, 17))).isFalse();
        assertThat(c.isOverdue(LocalDate.of(2026, 10, 18))).isTrue();
    }

    private Complaint create() {
        return service.create(command(ComplaintChannel.PHONE), officer);
    }

    private static CreateComplaintCommand command(ComplaintChannel channel) {
        return new CreateComplaintCommand("Nguyễn Văn Mẫu", "0900000128", null, 7L, channel,
                ComplaintCategory.LATE_COLLECTION, "Tổ 7 chưa được thu gom 2 ngày", "Rác để trước nhà 2 ngày chưa ai lấy.",
                null);
    }
}
