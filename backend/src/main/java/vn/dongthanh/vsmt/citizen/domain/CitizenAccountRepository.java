package vn.dongthanh.vsmt.citizen.domain;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** Tài khoản đang dùng của hộ, để báo hộ khi người thu ghi tiền. */
    @Query("select a.id from CitizenAccount a where a.subject.id = :subjectId and a.status = vn.dongthanh.vsmt.platform.domain.UserStatus.ACTIVE")
    List<Long> findActiveIdsBySubject(@Param("subjectId") Long subjectId);
}
