package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.InstanceName;
import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** Bảng charges (sinh từ migration của backend). */
@JmixEntity
@Table(name = "charges")
@Entity(name = "vsmt_Charge")
public class Charge {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @InstanceName
    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_request_id", nullable = false)
    private ChargeRequest chargeRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subject_id", nullable = false)
    private ServiceSubject subject;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "contract_id", nullable = false)
    private ServiceContract contract;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "period_id", nullable = false)
    private CollectionPeriod period;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "fee_type_id", nullable = false)
    private FeeType feeType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "tariff_group", length = 30)
    private String tariffGroup;

    @Column(name = "unit_price", nullable = false)
    private Long unitPrice;

    @Column(name = "months", nullable = false)
    private Integer months;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "coverage_from", nullable = false)
    private LocalDate coverageFrom;

    @Column(name = "coverage_to", nullable = false)
    private LocalDate coverageTo;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "written_off_period_id")
    private CollectionPeriod writtenOffPeriod;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public ChargeRequest getChargeRequest() { return chargeRequest; }
    public void setChargeRequest(ChargeRequest chargeRequest) { this.chargeRequest = chargeRequest; }
    public ServiceSubject getSubject() { return subject; }
    public void setSubject(ServiceSubject subject) { this.subject = subject; }
    public ServiceContract getContract() { return contract; }
    public void setContract(ServiceContract contract) { this.contract = contract; }
    public CollectionPeriod getPeriod() { return period; }
    public void setPeriod(CollectionPeriod period) { this.period = period; }
    public FeeType getFeeType() { return feeType; }
    public void setFeeType(FeeType feeType) { this.feeType = feeType; }
    public Area getArea() { return area; }
    public void setArea(Area area) { this.area = area; }
    public Company getCompany() { return company; }
    public void setCompany(Company company) { this.company = company; }
    public String getTariffGroup() { return tariffGroup; }
    public void setTariffGroup(String tariffGroup) { this.tariffGroup = tariffGroup; }
    public Long getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Long unitPrice) { this.unitPrice = unitPrice; }
    public Integer getMonths() { return months; }
    public void setMonths(Integer months) { this.months = months; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public LocalDate getCoverageFrom() { return coverageFrom; }
    public void setCoverageFrom(LocalDate coverageFrom) { this.coverageFrom = coverageFrom; }
    public LocalDate getCoverageTo() { return coverageTo; }
    public void setCoverageTo(LocalDate coverageTo) { this.coverageTo = coverageTo; }
    public LocalDate getDueDate() { return dueDate; }
    public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(OffsetDateTime paidAt) { this.paidAt = paidAt; }
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
    public CollectionPeriod getWrittenOffPeriod() { return writtenOffPeriod; }
    public void setWrittenOffPeriod(CollectionPeriod writtenOffPeriod) { this.writtenOffPeriod = writtenOffPeriod; }

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
