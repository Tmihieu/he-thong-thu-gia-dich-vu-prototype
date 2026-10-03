package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

/** Bảng tariff_rates (sinh từ migration của backend). */
@JmixEntity
@Table(name = "tariff_rates")
@Entity(name = "vsmt_TariffRate")
public class TariffRate {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tariff_version_id", nullable = false)
    private TariffVersion tariffVersion;

    @Column(name = "tariff_group", nullable = false, length = 30)
    private String tariffGroup;

    @Column(name = "collection_fee", nullable = false)
    private Long collectionFee;

    @Column(name = "transport_fee", nullable = false)
    private Long transportFee;

    @Column(name = "monthly_total", nullable = false)
    private Long monthlyTotal;

    @Column(name = "unit_label", nullable = false, length = 30)
    private String unitLabel;

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
    public TariffVersion getTariffVersion() { return tariffVersion; }
    public void setTariffVersion(TariffVersion tariffVersion) { this.tariffVersion = tariffVersion; }
    public String getTariffGroup() { return tariffGroup; }
    public void setTariffGroup(String tariffGroup) { this.tariffGroup = tariffGroup; }
    public Long getCollectionFee() { return collectionFee; }
    public void setCollectionFee(Long collectionFee) { this.collectionFee = collectionFee; }
    public Long getTransportFee() { return transportFee; }
    public void setTransportFee(Long transportFee) { this.transportFee = transportFee; }
    public Long getMonthlyTotal() { return monthlyTotal; }
    public void setMonthlyTotal(Long monthlyTotal) { this.monthlyTotal = monthlyTotal; }
    public String getUnitLabel() { return unitLabel; }
    public void setUnitLabel(String unitLabel) { this.unitLabel = unitLabel; }
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
