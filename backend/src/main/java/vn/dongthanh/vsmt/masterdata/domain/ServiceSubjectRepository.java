package vn.dongthanh.vsmt.masterdata.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ServiceSubjectRepository extends JpaRepository<ServiceSubject, Long> {

    Optional<ServiceSubject> findByCode(String code);

    /** Số lớn nhất đang dùng sau tiền tố mã (vd. {@code DTH-H}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from service_subjects where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);

    /**
     * Tìm hồ sơ hộ. {@code q} rỗng thì bỏ qua; {@code scoped = true} thì chỉ trong {@code areaIds}
     * (phạm vi công ty). Chuỗi {@code q} đã chuẩn hóa dạng {@code %từ khóa%} chữ thường.
     */
    @Query(value = "select s from ServiceSubject s join fetch s.area a join fetch a.district d"
            + " where (:districtId is null or d.id = :districtId) and (:areaId is null or a.id = :areaId)"
            + " and (:status is null or s.status = :status) and (:scoped = false or a.id in :areaIds)"
            + " and (:q = '' or lower(s.code) like :q or lower(s.name) like :q or s.phone like :q"
            + " or lower(s.address) like :q)",
            countQuery = "select count(s) from ServiceSubject s join s.area a join a.district d"
            + " where (:districtId is null or d.id = :districtId) and (:areaId is null or a.id = :areaId)"
            + " and (:status is null or s.status = :status) and (:scoped = false or a.id in :areaIds)"
            + " and (:q = '' or lower(s.code) like :q or lower(s.name) like :q or s.phone like :q"
            + " or lower(s.address) like :q)")
    Page<ServiceSubject> search(Long districtId, Long areaId, SubjectStatus status, boolean scoped,
            Collection<Long> areaIds, String q, Pageable pageable);

    @Query("select s from ServiceSubject s join fetch s.area a join fetch a.district order by s.code")
    List<ServiceSubject> findAllWithArea();

    @Query("select s from ServiceSubject s join fetch s.area a join fetch a.district where a.id in :areaIds order by s.code")
    List<ServiceSubject> findAllWithAreaIn(Collection<Long> areaIds);

    @Query("select s from ServiceSubject s join fetch s.area a join fetch a.district where s.id = :id")
    Optional<ServiceSubject> findByIdWithArea(Long id);

    /** Số đối tượng theo khu vực (không tính đã chấm dứt), dùng cho màn khu vực. */
    @Query("select s.area.id, count(s) from ServiceSubject s where s.status <> 'ENDED' group by s.area.id")
    List<Object[]> countActiveByArea();
}
