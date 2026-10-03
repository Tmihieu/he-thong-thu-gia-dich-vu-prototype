package vn.dongthanh.vsmt.jmixadmin.entity;

import io.jmix.core.metamodel.annotation.InstanceName;
import io.jmix.core.metamodel.annotation.JmixEntity;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

/** Bảng payments (sinh từ migration của backend). */
@JmixEntity
@Table(name = "payments")
@Entity(name = "vsmt_Payment")
public class Payment {

    @Id
    @Column(name = "id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @InstanceName
    @Column(name = "code", nullable = false, length = 30)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "charge_id", nullable = false)
    private Charge charge;

    @Column(name = "amount", nullable = false)
    private Long amount;

    @Column(name = "method", nullable = false, length = 30)
    private String method;

    @Column(name = "paid_at", nullable = false)
    private OffsetDateTime paidAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collector_id")
    private User collector;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by")
    private User confirmedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "citizen_account_id")
    private CitizenAccount citizenAccount;

    @Column(name = "bank_ref", length = 50)
    private String bankRef;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "client_request_id", nullable = false, length = 40)
    private String clientRequestId;

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
    @JoinColumn(name = "ledger_period_id")
    private CollectionPeriod ledgerPeriod;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public Charge getCharge() { return charge; }
    public void setCharge(Charge charge) { this.charge = charge; }
    public Long getAmount() { return amount; }
    public void setAmount(Long amount) { this.amount = amount; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public OffsetDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(OffsetDateTime paidAt) { this.paidAt = paidAt; }
    public User getCollector() { return collector; }
    public void setCollector(User collector) { this.collector = collector; }
    public User getConfirmedBy() { return confirmedBy; }
    public void setConfirmedBy(User confirmedBy) { this.confirmedBy = confirmedBy; }
    public CitizenAccount getCitizenAccount() { return citizenAccount; }
    public void setCitizenAccount(CitizenAccount citizenAccount) { this.citizenAccount = citizenAccount; }
    public String getBankRef() { return bankRef; }
    public void setBankRef(String bankRef) { this.bankRef = bankRef; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getClientRequestId() { return clientRequestId; }
    public void setClientRequestId(String clientRequestId) { this.clientRequestId = clientRequestId; }
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
    public CollectionPeriod getLedgerPeriod() { return ledgerPeriod; }
    public void setLedgerPeriod(CollectionPeriod ledgerPeriod) { this.ledgerPeriod = ledgerPeriod; }

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
