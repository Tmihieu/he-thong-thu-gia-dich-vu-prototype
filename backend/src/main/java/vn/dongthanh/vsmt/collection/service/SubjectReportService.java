package vn.dongthanh.vsmt.collection.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.collection.domain.SubjectReportType;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Người đi thu báo hộ trong tổ được giao đã chuyển đi hoặc sai thông tin (T53). Không lưu bản ghi riêng (G7): phát
 * thông báo INFO tới cán bộ xã và quản lý công ty của khoản, ghi nhật ký. Báo trên một khoản trong danh sách thu nên
 * phạm vi giống danh sách (tổ/công ty chụp trên khoản, G3): xã đổi tổ của hộ sau khi phát hành vẫn báo được.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class SubjectReportService {

    static final String ENTITY = "ServiceSubject";

    private final CollectorAssignmentService collectorAssignments;
    private final NotificationService notifications;
    private final AuditService audit;

    public void report(Long chargeId, SubjectReportType type, String description, CurrentUser actor) {
        Charge charge = collectorAssignments.myCharge(chargeId, actor);
        ServiceSubject subject = charge.getSubject();
        String text = description.trim();
        String areaCode = charge.getArea().getCode();
        String title = "Người đi thu báo hộ " + subject.getCode() + " " + type.label();
        String body = subject.getName() + " · " + subject.getAddress() + " (" + areaCode + "). Người báo: "
                + actor.username() + ". Nội dung: " + text;
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.INFO, title, body,
                link("commune.subjects", subject.getId())), actor.id());
        notifications.publish(NotificationCommand.toCompany(charge.getCompany().getId(), Role.COMPANY_MANAGER,
                NotificationKind.INFO, title, body, link("company.households", subject.getId())), actor.id());
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("type", type);
        after.put("area", areaCode);
        after.put("charge", charge.getCode());
        after.put("description", text);
        audit.record(actor, "REPORT_SUBJECT", ENTITY, subject.getCode(), null, after);
    }

    private static Map<String, Object> link(String screen, Long subjectId) {
        return Map.of("screen", screen, "params", Map.of("subjectId", subjectId));
    }
}
