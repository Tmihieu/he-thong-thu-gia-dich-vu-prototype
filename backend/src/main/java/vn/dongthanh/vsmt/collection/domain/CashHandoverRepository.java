package vn.dongthanh.vsmt.collection.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CashHandoverRepository extends JpaRepository<CashHandover, Long> {

    @Query("select coalesce(sum(h.amount), 0) from CashHandover h where h.collector.id = :collectorId")
    long sumByCollector(Long collectorId);

    /** Khóa theo người đi thu tới hết transaction, để hai lần bàn giao song song không cùng vượt tiền đang giữ. */
    @Query(value = "select count(*) from pg_advisory_xact_lock("
            + "hashtext('cash-held-' || cast(:collectorId as text)))", nativeQuery = true)
    long lockCashOf(Long collectorId);

    @Query("select h from CashHandover h join fetch h.collector where h.company.id = :companyId"
            + " and (:collectorId is null or h.collector.id = :collectorId) order by h.handoverDate desc, h.id desc")
    List<CashHandover> findForCompany(Long companyId, Long collectorId);

    /** Số lớn nhất đang dùng sau tiền tố mã (vd. {@code BG-1026-}); 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, length(:prefix) + 1) as integer)), 0)"
            + " from cash_handovers where code like :prefix || '%'", nativeQuery = true)
    int maxCodeNumber(String prefix);
}
