package vn.dongthanh.vsmt.citizen.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.CitizenPaymentCommand;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentOutcome;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/**
 * Thanh toán mô phỏng từ app người dân (T40) và "Xác nhận thanh toán" (O1: không phải biên lai pháp lý).
 * Ghi thanh toán qua collection nên công ty và xã thấy ngay khoản Đã thu trên sổ công ty–kỳ.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class CitizenPaymentService {

    static final String CONFIRMATION_SCREEN = "citizen.paymentConfirmation";

    private final CitizenQueryService citizens;
    private final CollectionService collection;
    private final NotificationService notifications;

    public PaymentOutcome pay(CurrentCitizen citizen, Long chargeId, long amount, String clientRequestId) {
        CitizenAccount account = citizens.requireActive(citizen);
        PaymentOutcome outcome = collection.recordCitizenPayment(new CitizenPaymentCommand(chargeId,
                account.getSubject().getId(), account.getId(), account.getPhone(), amount, clientRequestId));
        if (!outcome.replayed()) {
            notifyPaid(account, outcome.payment(), outcome.charge());
        }
        return outcome;
    }

    @Transactional(readOnly = true)
    public List<Payment> confirmations(CurrentCitizen citizen) {
        return collection.paymentsOfSubject(citizens.requireActive(citizen).getSubject().getId());
    }

    @Transactional(readOnly = true)
    public Payment confirmation(CurrentCitizen citizen, Long paymentId) {
        return collection.paymentOfSubject(paymentId, citizens.requireActive(citizen).getSubject().getId());
    }

    private void notifyPaid(CitizenAccount account, Payment payment, Charge charge) {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("screen", CONFIRMATION_SCREEN);
        link.put("params", Map.of("paymentId", payment.getId()));
        notifications.publish(NotificationCommand.toCitizen(account.getId(), NotificationKind.TRANSACTION,
                "Thanh toán thành công",
                "Đã thanh toán " + Money.format(payment.getAmount()) + " cho " + charge.getFeeType().getName() + " "
                        + charge.getPeriod().getLabel() + ". Mã xác nhận " + payment.getCode() + ".",
                link), null);
    }
}
