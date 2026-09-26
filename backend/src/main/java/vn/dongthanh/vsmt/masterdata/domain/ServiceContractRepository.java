package vn.dongthanh.vsmt.masterdata.domain;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceContractRepository extends JpaRepository<ServiceContract, Long> {

    List<ServiceContract> findBySubjectIdOrderByValidFromDesc(Long subjectId);

    List<ServiceContract> findBySubjectIdIn(Collection<Long> subjectIds);

    /** Số lớn nhất đang dùng sau tiền tố số đăng ký (vd. {@code ĐK-DTH-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(contract_no, length(:prefix) + 1) as integer)), 0)"
            + " from service_contracts where contract_no like :prefix || '%'", nativeQuery = true)
    int maxContractNumber(String prefix);
}
