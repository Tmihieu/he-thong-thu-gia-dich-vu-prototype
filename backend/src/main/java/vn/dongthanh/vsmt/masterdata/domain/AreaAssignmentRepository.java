package vn.dongthanh.vsmt.masterdata.domain;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AreaAssignmentRepository extends JpaRepository<AreaAssignment, Long> {

    /** Lịch sử phân công của một khu vực, mới nhất trước. */
    @Query("select a from AreaAssignment a join fetch a.area join fetch a.company"
            + " where a.area.id = :areaId order by a.validFrom desc")
    List<AreaAssignment> findHistory(Long areaId);

    /** Phân công có hiệu lực vào ngày {@code date} (mỗi khu vực tối đa một), lọc theo công ty nếu có. */
    @Query("select a from AreaAssignment a join fetch a.area ar join fetch a.company c"
            + " where a.validFrom <= :date and (a.validTo is null or a.validTo >= :date)"
            + " and (:companyId is null or c.id = :companyId) order by ar.code")
    List<AreaAssignment> findActiveOn(LocalDate date, Long companyId);
}
