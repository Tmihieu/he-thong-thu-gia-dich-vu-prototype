package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.InstanceName;
import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Bảng service_contracts (sinh từ migration của backend). */
@JmixEntity
@Table(name = "service_contracts")
@Entity(name = "vsmt_ServiceContract")
public class ServiceContract {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @InstanceName
    @Column(name = "contract_no", nullable = false, length = 30)
    private String contractNo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private ServiceSubject subject;

    @Column(name = "tariff_group", nullable = false, length = 30)
    private String tariffGroup;

    @Column(name = "valid_from", nullable = false)
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "exempt", nullable = false)
    private Boolean exempt = false;

    @Column(name = "exempt_reason", length = 255)
    private String exemptReason;

    @Column(name = "exempt_decision_no", length = 50)
    private String exemptDecisionNo;

    @Lob
    @Column(name = "note")
    private String note;

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
    public String getContractNo() { return contractNo; }
    public void setContractNo(String contractNo) { this.contractNo = contractNo; }
    public ServiceSubject getSubject() { return subject; }
    public void setSubject(ServiceSubject subject) { this.subject = subject; }
    public String getTariffGroup() { return tariffGroup; }
    public void setTariffGroup(String tariffGroup) { this.tariffGroup = tariffGroup; }
    public LocalDate getValidFrom() { return validFrom; }
    public void setValidFrom(LocalDate validFrom) { this.validFrom = validFrom; }
    public LocalDate getValidTo() { return validTo; }
    public void setValidTo(LocalDate validTo) { this.validTo = validTo; }
    public Boolean getExempt() { return exempt; }
    public void setExempt(Boolean exempt) { this.exempt = exempt; }
    public String getExemptReason() { return exemptReason; }
    public void setExemptReason(String exemptReason) { this.exemptReason = exemptReason; }
    public String getExemptDecisionNo() { return exemptDecisionNo; }
    public void setExemptDecisionNo(String exemptDecisionNo) { this.exemptDecisionNo = exemptDecisionNo; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
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
