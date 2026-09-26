package vn.dongthanh.vsmt.complaint.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.complaint.domain.Complaint;
import vn.dongthanh.vsmt.complaint.domain.ComplaintCategory;
import vn.dongthanh.vsmt.complaint.domain.ComplaintChannel;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEvent;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEventRepository;
import vn.dongthanh.vsmt.complaint.domain.ComplaintEventType;
import vn.dongthanh.vsmt.complaint.domain.ComplaintRepository;
import vn.dongthanh.vsmt.complaint.domain.ComplaintStatus;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Khiếu nại (R24–R27): xã ghi nhận (điện thoại / trực tiếp) → chuyển công ty phụ trách khu vực, hạn +3 ngày → công ty
 * phản hồi → xã đóng kèm kết quả. Mỗi bước thêm một mốc timeline (không sửa mốc cũ) và phát thông báo tới xã, công ty
 * được chuyển, người dân nếu gửi từ app. Công ty chỉ thấy khiếu nại đã chuyển cho mình (G12).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class ComplaintService {

    static final int FORWARD_DAYS = 3;
    static final String OFFICER_LABEL = "Cán bộ xã";
    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final DateTimeFormatter CODE_TOKEN = DateTimeFormatter.ofPattern("MMyy");

    private final ComplaintRepository complaints;
    private final ComplaintEventRepository events;
    private final AreaRepository areas;
    private final ServiceSubjectRepository subjects;
    private final CompanyRepository companies;
    private final AreaAssignmentService assignments;
    private final NotificationService notifications;
    private final Clock clock;

    public record CreateComplaintCommand(String complainantName, String complainantPhone, Long subjectId, Long areaId,
            ComplaintChannel channel, ComplaintCategory category, String summary, String content,
            LocalDate receivedDate) {
    }

    /** Khiếu nại kèm timeline, để hiển thị chi tiết. */
    public record ComplaintDetail(Complaint complaint, List<ComplaintEvent> events) {
    }

    /** Xã ghi nhận khiếu nại nhận qua điện thoại hoặc trực tiếp. Khiếu nại từ app do người dân gửi (T43). */
    public Complaint create(CreateComplaintCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        if (cmd.channel() == ComplaintChannel.APP) {
            throw new BusinessRuleException("COMPLAINT_CHANNEL_INVALID",
                    "Khiếu nại qua ứng dụng do người dân tự gửi; xã chỉ ghi nhận qua điện thoại hoặc trực tiếp.");
        }
        LocalDate today = LocalDate.now(clock);
        LocalDate received = cmd.receivedDate() != null ? cmd.receivedDate() : today;
        if (received.isAfter(today)) {
            throw new BusinessRuleException("COMPLAINT_DATE_INVALID", "Ngày tiếp nhận không được sau hôm nay.");
        }
        ServiceSubject subject = cmd.subjectId() == null ? null : subjects.findByIdWithArea(cmd.subjectId())
                .orElseThrow(() -> new NotFoundException("SUBJECT_NOT_FOUND", "Không tìm thấy hộ / đối tượng."));
        Long areaId = cmd.areaId() != null ? cmd.areaId() : subject != null ? subject.getArea().getId() : null;
        if (areaId == null) {
            throw new BusinessRuleException("COMPLAINT_AREA_REQUIRED", "Phải chọn khu vực của khiếu nại.");
        }
        Area area = areas.findById(areaId)
                .orElseThrow(() -> new NotFoundException("AREA_NOT_FOUND", "Không tìm thấy khu vực."));

        String prefix = "KN-" + received.format(CODE_TOKEN) + "-";
        Complaint complaint = complaints.save(Complaint.builder()
                .code(prefix + "%03d".formatted(complaints.maxCodeNumber(prefix) + 1))
                .receivedDate(received).complainantName(cmd.complainantName().trim())
                .complainantPhone(blankToNull(cmd.complainantPhone())).subject(subject).area(area)
                .channel(cmd.channel()).category(cmd.category()).summary(cmd.summary().trim())
                .content(cmd.content().trim())
                .build());
        String via = cmd.channel() == ComplaintChannel.PHONE ? "điện thoại" : "trực tiếp tại xã";
        addEvent(complaint, ComplaintEventType.RECEIVED, actor, OFFICER_LABEL, null, "Xã tiếp nhận qua " + via);
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.COMPLAINT,
                "Khiếu nại mới " + complaint.getCode() + " · " + complaint.getComplainantName(), complaint.getSummary(),
                link("commune.complaints", complaint)), actor.id());
        return complaint;
    }

    /** Chuyển công ty xử lý; để trống công ty thì lấy công ty đang phụ trách khu vực. Hạn = hôm nay + 3 ngày. */
    public Complaint forward(Long id, Long companyId, String note, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Complaint complaint = find(id);
        LocalDate today = LocalDate.now(clock);
        Long target = companyId != null ? companyId
                : assignments.companyOf(complaint.getArea().getId(), today).orElseThrow(() -> new BusinessRuleException(
                        "COMPLAINT_NO_COMPANY", "Khu vực " + complaint.getArea().getCode() + " chưa có công ty phụ trách."));
        Company company = companies.findById(target)
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        LocalDate deadline = today.plusDays(FORWARD_DAYS);
        complaint.forwardTo(company, deadline);

        String text = "Chuyển " + company.getName() + " xử lý, hạn " + deadline.format(VN_DATE)
                + (note == null || note.isBlank() ? "" : ". " + note.trim());
        addEvent(complaint, ComplaintEventType.FORWARDED, actor, OFFICER_LABEL, company.getId(), text);
        notifications.publish(NotificationCommand.toCompany(company.getId(), Role.COMPANY_MANAGER,
                NotificationKind.COMPLAINT, "Xã chuyển khiếu nại " + complaint.getCode() + " · hạn "
                        + deadline.format(VN_DATE), complaint.getSummary(), link("company.complaints", complaint)),
                actor.id());
        notifyCitizen(complaint, "Cán bộ xã tiếp nhận, chuyển " + company.getName() + " xử lý, hạn "
                + deadline.format(VN_DATE), actor);
        return complaint;
    }

    /** Công ty được chuyển phản hồi kết quả; xã quyết định đóng. */
    public Complaint reply(Long id, String content, CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        Complaint complaint = find(id);
        if (!complaint.isForwardedTo(actor.companyId())) {
            throw notFound();
        }
        complaint.acceptCompanyReply();
        Company company = complaint.getForwardedCompany();
        addEvent(complaint, ComplaintEventType.COMPANY_REPLIED, actor, company.getName(), company.getId(), content.trim());
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.COMPLAINT,
                company.getCode() + " phản hồi khiếu nại " + complaint.getCode(), content.trim(),
                link("commune.complaints", complaint)), actor.id());
        notifyCitizen(complaint, company.getName() + " phản hồi: " + content.trim(), actor);
        return complaint;
    }

    /** Xã đóng khiếu nại kèm kết quả cuối (từ Mới hoặc Đang xử lý). */
    public Complaint close(Long id, String resolution, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        Complaint complaint = find(id);
        complaint.close(resolution, OffsetDateTime.now(clock));
        addEvent(complaint, ComplaintEventType.CLOSED, actor, OFFICER_LABEL, null, complaint.getResolution());
        if (complaint.getForwardedCompany() != null) {
            notifications.publish(NotificationCommand.toCompany(complaint.getForwardedCompany().getId(),
                    Role.COMPANY_MANAGER, NotificationKind.COMPLAINT, "Xã đã đóng khiếu nại " + complaint.getCode(),
                    complaint.getResolution(), link("company.complaints", complaint)), actor.id());
        }
        notifyCitizen(complaint, "Xã đã xử lý xong: " + complaint.getResolution(), actor);
        return complaint;
    }

    /** Xã và quản trị thấy tất cả; công ty chỉ thấy khiếu nại đã chuyển cho mình (G12). */
    @Transactional(readOnly = true)
    public List<Complaint> list(ComplaintStatus status, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER);
        return complaints.search(status, actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : null);
    }

    @Transactional(readOnly = true)
    public ComplaintDetail get(Long id, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER);
        Complaint complaint = find(id);
        if (actor.role() == Role.COMPANY_MANAGER && !complaint.isForwardedTo(actor.companyId())) {
            throw notFound();
        }
        return new ComplaintDetail(complaint, events.findByComplaintIdOrderByOccurredAtAscIdAsc(id));
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    private Complaint find(Long id) {
        return complaints.findByIdWithDetails(id).orElseThrow(ComplaintService::notFound);
    }

    private static NotFoundException notFound() {
        return new NotFoundException("COMPLAINT_NOT_FOUND", "Không tìm thấy khiếu nại.");
    }

    private void addEvent(Complaint complaint, ComplaintEventType type, CurrentUser actor, String label, Long companyId,
            String content) {
        events.save(ComplaintEvent.byUser(complaint, type, OffsetDateTime.now(clock), actor.id(), label, companyId,
                content));
    }

    private void notifyCitizen(Complaint complaint, String body, CurrentUser actor) {
        if (complaint.getCitizenAccountId() == null) {
            return;
        }
        notifications.publish(NotificationCommand.toCitizen(complaint.getCitizenAccountId(), NotificationKind.COMPLAINT,
                "Phản ánh " + complaint.getCode() + " · " + statusLabel(complaint.getStatus()), body,
                link("citizen.complaintDetail", complaint)), actor.id());
    }

    private static String statusLabel(ComplaintStatus status) {
        return switch (status) {
            case NEW -> "Mới";
            case PROCESSING -> "Đang xử lý";
            case RESOLVED -> "Đã giải quyết";
        };
    }

    private static Map<String, Object> link(String screen, Complaint complaint) {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("screen", screen);
        link.put("params", Map.of("complaintId", complaint.getId() == null ? 0 : complaint.getId()));
        return link;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
