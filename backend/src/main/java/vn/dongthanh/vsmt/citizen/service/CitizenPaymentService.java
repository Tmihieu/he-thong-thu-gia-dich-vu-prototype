package vn.dongthanh.vsmt.citizen.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/**
 * "Xác nhận thanh toán" của hộ (O1: không phải biên lai pháp lý). Hộ không tự ghi thanh toán trên app: chỉ chuyển
 * khoản qua mã VietQR của công ty, ngân hàng báo về thì collection ghi nhận.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CitizenPaymentService {

    private final CitizenQueryService citizens;
    private final CollectionService collection;

    @Transactional(readOnly = true)
    public List<Payment> confirmations(CurrentCitizen citizen) {
        return collection.paymentsOfSubject(citizens.requireActive(citizen).getSubject().getId());
    }

    @Transactional(readOnly = true)
    public Payment confirmation(CurrentCitizen citizen, Long paymentId) {
        return collection.paymentOfSubject(paymentId, citizens.requireActive(citizen).getSubject().getId());
    }
}
