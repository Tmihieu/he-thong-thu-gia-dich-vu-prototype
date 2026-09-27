package vn.dongthanh.vsmt.masterdata.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CollectionScheduleRepository extends JpaRepository<CollectionSchedule, Long> {

    @Query("""
            select s from CollectionSchedule s where s.area.id = :areaId
            order by s.weekday, s.weekOfMonth nulls first, s.startTime""")
    List<CollectionSchedule> findByAreaIdOrdered(Long areaId);
}
