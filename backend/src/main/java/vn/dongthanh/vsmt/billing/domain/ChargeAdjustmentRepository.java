package vn.dongthanh.vsmt.billing.domain;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ChargeAdjustmentRepository extends JpaRepository<ChargeAdjustment, Long> {

    List<ChargeAdjustment> findByChargeIdOrderByCreatedAtDescIdDesc(Long chargeId);
}
