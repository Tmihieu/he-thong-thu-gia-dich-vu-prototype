package vn.dongthanh.vsmt.citizen.domain;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CitizenAccountRepository extends JpaRepository<CitizenAccount, Long> {

    Optional<CitizenAccount> findByPhone(String phone);
}
