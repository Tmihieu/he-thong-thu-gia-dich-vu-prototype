package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.InstanceName;
import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Bảng complaints (sinh từ migration của backend). */
@JmixEntity
@Table(name = "complaints")
@Entity(name = "vsmt_Complaint")
public class Complaint {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @InstanceName
    @Column(name = "code", nullable = false, length = 20)
    private String code;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "complainant_name", nullable = false, length = 100)
    private String complainantName;

    @Column(name = "complainant_phone", length = 15)
    private String complainantPhone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_account_id")
    private CitizenAccount citizenAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private ServiceSubject subject;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @Column(name = "channel", nullable = false, length = 20)
    private String channel;

    @Column(name = "category", nullable = false, length = 30)
    private String category;

    @Column(name = "summary", nullable = false, length = 200)
    private String summary;

    @Column(name = "content", nullable = false, length = 4000)
    private String content;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "NEW";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forwarded_company_id")
    private Company forwardedCompany;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Column(name = "resolution", length = 2000)
    private String resolution;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    @Lob
    @Column(name = "photo_urls")
    private String photoUrls;

    @Column(name = "location", length = 100)
    private String location;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public LocalDate getReceivedDate() { return receivedDate; }
    public void setReceivedDate(LocalDate receivedDate) { this.receivedDate = receivedDate; }
    public String getComplainantName() { return complainantName; }
    public void setComplainantName(String complainantName) { this.complainantName = complainantName; }
    public String getComplainantPhone() { return complainantPhone; }
    public void setComplainantPhone(String complainantPhone) { this.complainantPhone = complainantPhone; }
    public CitizenAccount getCitizenAccount() { return citizenAccount; }
    public void setCitizenAccount(CitizenAccount citizenAccount) { this.citizenAccount = citizenAccount; }
    public ServiceSubject getSubject() { return subject; }
    public void setSubject(ServiceSubject subject) { this.subject = subject; }
    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }
    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Company getForwardedCompany() { return forwardedCompany; }
    public void setForwardedCompany(Company forwardedCompany) { this.forwardedCompany = forwardedCompany; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public String getResolution() { return resolution; }
    public void setResolution(String resolution) { this.resolution = resolution; }
    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
    public String getPhotoUrls() { return photoUrls; }
    public void setPhotoUrls(String photoUrls) { this.photoUrls = photoUrls; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
    public Long getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(Long updatedBy) { this.updatedBy = updatedBy; }
    public Integer getVersion() { return version; }
    public void setVersion(Integer version) { this.version = version; }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
