package vn.dongthanh.vsmt.collection.service;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeRepository;
import vn.dongthanh.vsmt.collection.domain.BankTransfer;
import vn.dongthanh.vsmt.collection.domain.BankTransfer.Reason;
import vn.dongthanh.vsmt.collection.domain.BankTransfer.Status;
import vn.dongthanh.vsmt.collection.domain.BankTransferRepository;
import vn.dongthanh.vsmt.collection.domain.Payment;
import vn.dongthanh.vsmt.collection.service.CollectionService.Activity;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Chuyển khoản qua SePay (04/10). Tiền vào tài khoản của công ty thu gom; SePay gọi webhook cho mỗi giao dịch tiền vào.
 * Đúng mã khoản ({@code VSMT} + id khoản), đúng tài khoản công ty phụ trách và đúng số cần đóng thì tự ghi thanh toán
 * chuyển khoản; mọi trường hợp khác không đụng tới khoản thu, lưu lại cho công ty đối chiếu.
 *
 * <p>Không bọc cả lượt xử lý trong một transaction: ghi thanh toán thất bại (số tiền lệch, khoản đã thu...) phải rollback
 * riêng, sau đó vẫn lưu được dòng chờ đối chiếu.
 */
@Service
@RequiredArgsConstructor
public class BankTransferService {

    public static final String CODE_PREFIX = "VSMT";
    private static final Pattern CODE = Pattern.compile(CODE_PREFIX + "(\\d{1,18})", Pattern.CASE_INSENSITIVE);

    private final BankTransferRepository transfers;
    private final ChargeRepository charges;
    private final CompanyRepository companies;
    private final CollectionService collection;

    /** Giao dịch tiền vào SePay báo về. */
    public record Incoming(long sepayId, String gateway, String transactionDate, String accountNumber, String code,
            String content, long amount, String referenceCode) {
    }

    /** Thông tin để hiện mã QR chuyển khoản của một khoản. */
    public record TransferInfo(boolean configured, String bankName, String bankAccount, String accountHolder, long amount,
            String code) {
    }

    /** Mã ghi trong nội dung chuyển khoản: chỉ chữ và số vì ngân hàng bỏ dấu gạch. */
    public static String codeOf(Long chargeId) {
        return CODE_PREFIX + "%06d".formatted(chargeId);
    }

    /** Xử lý một giao dịch; gọi lại cùng {@code sepayId} (SePay gửi lại) không tạo bản ghi thứ hai. */
    public void handle(Incoming in) {
        if (transfers.existsBySepayId(in.sepayId())) {
            return;
        }
        BankTransfer.BankTransferBuilder row = BankTransfer.builder()
                .sepayId(in.sepayId()).gateway(cut(in.gateway(), 100)).accountNumber(cut(in.accountNumber(), 50))
                .transactionDate(cut(in.transactionDate(), 30)).amount(in.amount()).content(cut(in.content(), 1000))
                .code(cut(in.code(), 50)).referenceCode(cut(in.referenceCode(), 100));
        Optional<Company> owner = companyOfAccount(in.accountNumber());
        owner.ifPresent(c -> row.companyId(c.getId()));

        Optional<Long> chargeId = chargeIdIn(in.code()).or(() -> chargeIdIn(in.content()));
        Optional<Charge> charge = chargeId.flatMap(charges::findByIdWithDetails);
        Reason reason = null;
        Payment payment = null;
        if (chargeId.isEmpty()) {
            reason = Reason.NO_CODE;
        } else if (charge.isEmpty()) {
            reason = Reason.CHARGE_NOT_FOUND;
        } else {
            Charge c = charge.get();
            row.chargeId(c.getId());
            if (owner.isEmpty()) {
                row.companyId(c.getCompany().getId());
            }
            if (owner.isEmpty() || !owner.get().getId().equals(c.getCompany().getId())) {
                reason = Reason.WRONG_ACCOUNT;
            } else {
                try {
                    payment = collection.recordBankTransfer(c.getId(), in.amount(), cut(in.referenceCode(), 50),
                            "sepay:" + in.sepayId());
                } catch (BusinessRuleException e) {
                    reason = "TRANSFER_AMOUNT_MISMATCH".equals(e.getCode()) ? Reason.AMOUNT_MISMATCH
                            : Reason.CHARGE_NOT_COLLECTABLE;
                }
            }
        }
        row.status(payment != null ? Status.MATCHED : Status.UNMATCHED).reason(reason)
                .paymentId(payment != null ? payment.getId() : null);
        try {
            transfers.save(row.build());
        } catch (DataIntegrityViolationException e) {
            // Hai lần gọi cùng giao dịch chạy song song: lần kia đã lưu, thanh toán cũng không ghi trùng (cùng khóa yêu cầu).
        }
    }

    /** Thông tin QR của khoản; người đi thu / công ty chỉ xem được khoản trong phạm vi của mình. */
    public TransferInfo transferInfo(Long chargeId, CurrentUser actor) {
        Activity activity = collection.activity(chargeId, actor);
        return infoOf(activity.charge(), activity.paidAmount());
    }

    /** Thông tin QR cho app người dân: chỉ khoản của hộ mình, khoản hộ khác coi như không tồn tại. */
    public TransferInfo transferInfoOfSubject(Long chargeId, Long subjectId) {
        Charge charge = charges.findByIdWithDetails(chargeId)
                .filter(c -> c.getSubject().getId().equals(subjectId))
                .orElseThrow(() -> new NotFoundException("CHARGE_NOT_FOUND", "Không tìm thấy khoản thu."));
        return infoOf(charge, collection.paidOf(chargeId));
    }

    private static TransferInfo infoOf(Charge charge, long paid) {
        Company company = charge.getCompany();
        String account = normalize(company.getBankAccount());
        boolean configured = !account.isEmpty() && company.getBankName() != null && !company.getBankName().isBlank();
        return new TransferInfo(configured, company.getBankName(), configured ? account : null, company.getName(),
                charge.getAmount() - paid, codeOf(charge.getId()));
    }

    /** Chuyển khoản chờ đối chiếu: công ty thấy của mình, cán bộ xã / quản trị / lãnh đạo thấy tất cả. */
    public List<BankTransfer> unmatched(CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER, Role.COMMUNE_OFFICER, Role.ADMIN, Role.LEADER);
        return actor.role().belongsToCompany()
                ? transfers.findTop200ByCompanyIdAndStatusOrderByCreatedAtDesc(actor.companyId(), Status.UNMATCHED)
                : transfers.findTop200ByStatusOrderByCreatedAtDesc(Status.UNMATCHED);
    }

    private Optional<Company> companyOfAccount(String accountNumber) {
        String account = normalize(accountNumber);
        if (account.isEmpty()) {
            return Optional.empty();
        }
        // ponytail: quét cả danh mục công ty (vài chục dòng); nhiều công ty thì thêm cột chuẩn hóa + chỉ mục duy nhất.
        return companies.findAll().stream().filter(c -> account.equals(normalize(c.getBankAccount()))).findFirst();
    }

    private static Optional<Long> chargeIdIn(String text) {
        if (text == null) {
            return Optional.empty();
        }
        Matcher m = CODE.matcher(text);
        return m.find() ? Optional.of(Long.parseLong(m.group(1))) : Optional.empty();
    }

    private static String normalize(String account) {
        return account == null ? "" : account.replaceAll("\\s", "");
    }

    private static String cut(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
