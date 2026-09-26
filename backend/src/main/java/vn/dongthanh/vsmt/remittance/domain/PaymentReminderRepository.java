package vn.dongthanh.vsmt.remittance.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PaymentReminderRepository extends JpaRepository<PaymentReminder, Long> {

    @Query("select distinct r from PaymentReminder r join fetch r.company c left join fetch r.periods"
            + " where (:companyId is null or c.id = :companyId) order by r.reminderDate desc, r.id desc")
    List<PaymentReminder> search(Long companyId);

    /** Số lớn nhất đang dùng của mã {@code NN-nnn}; 0 nếu chưa có. */
    @Query(value = "select coalesce(max(cast(substring(code, 4) as integer)), 0) from payment_reminders",
            nativeQuery = true)
    int maxCodeNumber();
}
