package vn.dongthanh.vsmt.complaint.domain;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.platform.common.BaseEntity;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;

/**
 * Khiếu nại / phản ánh (data dictionary §3.2). Trạng thái NEW → PROCESSING → RESOLVED; chuyển công ty đặt hạn xử lý;
 * diễn biến chi tiết nằm ở {@link ComplaintEvent}.
 */
@Getter
@Entity
@Table(name = "complaints")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Complaint extends BaseEntity {

    @Column(nullable = false, updatable = false, length = 20)
    private String code;

    @Column(nullable = false, updatable = false)
    private LocalDate receivedDate;

    @Column(nullable = false, length = 100)
    private String complainantName;

    @Column(length = 15)
    private String complainantPhone;

    @Column(updatable = false)
    private Long citizenAccountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private ServiceSubject subject;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "area_id", nullable = false)
    private Area area;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private ComplaintChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComplaintCategory category;

    @Column(nullable = false, length = 200)
    private String summary;

    @Column(nullable = false, length = 4000)
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ComplaintStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "forwarded_company_id")
    private Company forwardedCompany;

    private LocalDate deadline;

    @Column(length = 2000)
    private String resolution;

    private OffsetDateTime resolvedAt;

    private String photoUrls;

    @Column(length = 100)
    private String location;

    @Builder
    private Complaint(String code, LocalDate receivedDate, String complainantName, String complainantPhone,
            Long citizenAccountId, ServiceSubject subject, Area area, ComplaintChannel channel,
            ComplaintCategory category, String summary, String content, String photoUrls, String location) {
        this.code = code;
        this.receivedDate = receivedDate;
        this.complainantName = complainantName;
        this.complainantPhone = complainantPhone;
        this.citizenAccountId = citizenAccountId;
        this.subject = subject;
        this.area = area;
        this.channel = channel;
        this.category = category;
        this.summary = summary;
        this.content = content;
        this.photoUrls = photoUrls;
        this.location = location;
        this.status = ComplaintStatus.NEW;
    }

    /** Chuyển một công ty xử lý (chỉ một lần), hạn xử lý = {@code deadline}. */
    public void forwardTo(Company company, LocalDate deadline) {
        requireOpen();
        if (forwardedCompany != null) {
            throw new BusinessRuleException("COMPLAINT_ALREADY_FORWARDED",
                    "Khiếu nại " + code + " đã chuyển " + forwardedCompany.getName() + " xử lý.");
        }
        this.forwardedCompany = company;
        this.deadline = deadline;
        this.status = ComplaintStatus.PROCESSING;
    }

    /** Công ty được chuyển phản hồi; trạng thái vẫn "Đang xử lý" cho tới khi xã đóng. */
    public void acceptCompanyReply() {
        requireOpen();
    }

    public void close(String resolution, OffsetDateTime at) {
        requireOpen();
        if (resolution == null || resolution.isBlank()) {
            throw new BusinessRuleException("COMPLAINT_RESOLUTION_REQUIRED", "Phải ghi kết quả giải quyết.");
        }
        this.resolution = resolution.trim();
        this.resolvedAt = at;
        this.status = ComplaintStatus.RESOLVED;
    }

    public boolean isForwardedTo(Long companyId) {
        return forwardedCompany != null && forwardedCompany.getId().equals(companyId);
    }

    /** Quá hạn xử lý: chưa giải quyết và đã qua hạn (không lưu, R24–R27). */
    public boolean isOverdue(LocalDate today) {
        return status != ComplaintStatus.RESOLVED && deadline != null && deadline.isBefore(today);
    }

    private void requireOpen() {
        if (status == ComplaintStatus.RESOLVED) {
            throw new BusinessRuleException("COMPLAINT_CLOSED", "Khiếu nại " + code + " đã giải quyết xong.");
        }
    }
}
