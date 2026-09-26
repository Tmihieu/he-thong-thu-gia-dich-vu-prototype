package vn.dongthanh.vsmt.remittance.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReceiptIssueRepository extends JpaRepository<ReceiptIssue, Long> {

    @Query("select i from ReceiptIssue i join fetch i.receipt r join fetch r.company c join fetch r.period"
            + " where (:status is null or i.status = :status) and (:companyId is null or c.id = :companyId)"
            + " order by i.createdAt desc, i.id desc")
    List<ReceiptIssue> search(ReceiptIssueStatus status, Long companyId);

    @Query("select i from ReceiptIssue i join fetch i.receipt r join fetch r.company join fetch r.period where i.id = :id")
    Optional<ReceiptIssue> findByIdWithDetails(Long id);

    /** Id các phiếu có sai sót đang chờ xã kiểm tra (nhãn "Đã báo sai sót · chờ xã kiểm tra"). */
    @Query("select distinct i.receipt.id from ReceiptIssue i where i.status = 'PENDING' and i.receipt.id in :receiptIds")
    List<Long> findPendingReceiptIds(Collection<Long> receiptIds);
}
