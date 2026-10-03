package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

/** Bảng complaint_events (sinh từ migration của backend). */
@JmixEntity
@Table(name = "complaint_events")
@Entity(name = "vsmt_ComplaintEvent")
public class ComplaintEvent {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "occurred_at", nullable = false)
    private OffsetDateTime occurredAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_citizen_id")
    private CitizenAccount actorCitizen;

    @Column(name = "actor_label", nullable = false, length = 100)
    private String actorLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(name = "content", nullable = false, length = 2000)
    private String content;

    @Column(name = "visible_to_citizen", nullable = false)
    private Boolean visibleToCitizen = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Complaint getComplaint() { return complaint; }
    public void setComplaint(Complaint complaint) { this.complaint = complaint; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public OffsetDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(OffsetDateTime occurredAt) { this.occurredAt = occurredAt; }
    public User getActorUser() { return actorUser; }
    public void setActorUser(User actorUser) { this.actorUser = actorUser; }
    public CitizenAccount getActorCitizen() { return actorCitizen; }
    public void setActorCitizen(CitizenAccount actorCitizen) { this.actorCitizen = actorCitizen; }
    public String getActorLabel() { return actorLabel; }
    public void setActorLabel(String actorLabel) { this.actorLabel = actorLabel; }
    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Boolean getVisibleToCitizen() { return visibleToCitizen; }
    public void setVisibleToCitizen(Boolean visibleToCitizen) { this.visibleToCitizen = visibleToCitizen; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
    }
}
