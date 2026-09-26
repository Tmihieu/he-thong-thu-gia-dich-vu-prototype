package vn.dongthanh.vsmt.complaint.domain;

import java.time.OffsetDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Một mốc trên timeline khiếu nại. Chỉ thêm (bảng có trigger chặn sửa/xóa), không có updated_at/version. */
@Getter
@Entity
@Immutable
@Table(name = "complaint_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ComplaintEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false, updatable = false)
    private Complaint complaint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComplaintEventType eventType;

    @Column(nullable = false)
    private OffsetDateTime occurredAt;

    private Long actorUserId;

    private Long actorCitizenId;

    @Column(nullable = false, length = 100)
    private String actorLabel;

    private Long companyId;

    @Column(nullable = false, length = 2000)
    private String content;

    @Column(nullable = false)
    private boolean visibleToCitizen;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public static ComplaintEvent byUser(Complaint complaint, ComplaintEventType type, OffsetDateTime at, Long userId,
            String actorLabel, Long companyId, String content) {
        ComplaintEvent e = new ComplaintEvent();
        e.complaint = complaint;
        e.eventType = type;
        e.occurredAt = at;
        e.actorUserId = userId;
        e.actorLabel = actorLabel;
        e.companyId = companyId;
        e.content = content;
        e.visibleToCitizen = true;
        return e;
    }

    public static ComplaintEvent byCitizen(Complaint complaint, OffsetDateTime at, Long citizenId, String actorLabel,
            String content) {
        ComplaintEvent e = byUser(complaint, ComplaintEventType.SUBMITTED, at, null, actorLabel, null, content);
        e.actorCitizenId = citizenId;
        return e;
    }
}
