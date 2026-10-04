package vn.dongthanh.vsmt.collection.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BankTransferRepository extends JpaRepository<BankTransfer, Long> {

    boolean existsBySepayId(long sepayId);

    List<BankTransfer> findTop200ByStatusOrderByCreatedAtDesc(BankTransfer.Status status);

    List<BankTransfer> findTop200ByCompanyIdAndStatusOrderByCreatedAtDesc(Long companyId, BankTransfer.Status status);
}
