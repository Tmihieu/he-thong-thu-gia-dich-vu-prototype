package vn.dongthanh.vsmt.masterdata.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CommuneBankAccount;
import vn.dongthanh.vsmt.masterdata.domain.CommuneBankAccountRepository;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Tài khoản nhận chuyển khoản của xã (UC-54): quản trị viên khai báo; VietQR và đối chiếu SePay đọc từ đây. */
@Service
@RequiredArgsConstructor
@Transactional
public class CommuneBankAccountService {

    private final CommuneBankAccountRepository accounts;
    private final AuditService audit;

    public record Command(String bankName, String accountNumber, String accountHolder) {
    }

    @Transactional(readOnly = true)
    public Optional<CommuneBankAccount> find() {
        return accounts.findFirstByOrderByIdAsc();
    }

    /** Cho VietQR: chưa khai thì 409, không đoán tài khoản. */
    @Transactional(readOnly = true)
    public CommuneBankAccount require() {
        return find().orElseThrow(() -> new ConflictException("COMMUNE_BANK_ACCOUNT_MISSING",
                "Xã chưa khai tài khoản nhận chuyển khoản. Quản trị viên cần khai báo trước."));
    }

    public CommuneBankAccount save(Command cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        CommuneBankAccount account = find().orElseGet(CommuneBankAccount::new);
        Map<String, Object> before = account.getId() == null ? null : snapshot(account);
        account.setBankName(cmd.bankName().trim());
        account.setAccountNumber(cmd.accountNumber().replaceAll("\\s", ""));
        account.setAccountHolder(cmd.accountHolder().trim());
        CommuneBankAccount saved = accounts.save(account);
        audit.record(actor, "SAVE_COMMUNE_BANK_ACCOUNT", "CommuneBankAccount", saved.getId(), before, snapshot(saved));
        return saved;
    }

    private static Map<String, Object> snapshot(CommuneBankAccount a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("bankName", a.getBankName());
        m.put("accountNumber", a.getAccountNumber());
        m.put("accountHolder", a.getAccountHolder());
        return m;
    }
}
