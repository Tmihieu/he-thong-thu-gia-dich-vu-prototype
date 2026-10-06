package vn.dongthanh.vsmt.masterdata.domain;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CommuneBankAccountRepository extends JpaRepository<CommuneBankAccount, Long> {

    Optional<CommuneBankAccount> findFirstByOrderByIdAsc();
}
