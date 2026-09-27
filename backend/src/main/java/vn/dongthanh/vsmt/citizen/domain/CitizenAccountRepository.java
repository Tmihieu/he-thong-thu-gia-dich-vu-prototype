package vn.dongthanh.vsmt.citizen.domain;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Luôn nạp kèm hộ (và tổ, phường của hộ): controller người dân dựng DTO sau khi transaction đã đóng
 * ({@code open-in-view: false}), proxy lười lúc đó sẽ ném LazyInitializationException.
 */
public interface CitizenAccountRepository extends JpaRepository<CitizenAccount, Long> {

    @Override
    @EntityGraph(attributePaths = "subject.area.district")
    Optional<CitizenAccount> findById(Long id);

    @EntityGraph(attributePaths = "subject")
    Optional<CitizenAccount> findByPhone(String phone);
}
