package vn.dongthanh.vsmt.citizen.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.ChargeProgress;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.MasterDataQueryService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService;
import vn.dongthanh.vsmt.platform.common.UnauthorizedException;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/**
 * Dữ liệu cho app người dân, luôn trong phạm vi hộ gắn với tài khoản đang đăng nhập. Mỗi lần gọi đọc lại
 * tài khoản: bị khóa sau khi đã phát token thì chặn ngay (401), không chờ token hết hạn.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CitizenQueryService {

    private final CitizenAccountRepository accounts;
    private final SubjectService subjects;
    private final AreaAssignmentService areaAssignments;
    private final MasterDataQueryService masterData;
    private final ChargeRequestService charges;
    private final CollectionService collection;
    private final Clock clock;

    public Profile me(CurrentCitizen citizen) {
        CitizenAccount account = requireActive(citizen);
        ServiceSubject subject = account.getSubject();
        LocalDate today = LocalDate.now(clock);
        ServiceContract contract = subjects.activeContract(subject.getId(), today).orElse(null);
        Company company = areaAssignments.companyOf(subject.getArea().getId(), today)
                .map(masterData::companyInfo).orElse(null);
        return new Profile(account, subject, contract, company);
    }

    public List<ChargeView> charges(CurrentCitizen citizen) {
        CitizenAccount account = requireActive(citizen);
        List<Charge> list = charges.chargesOfSubject(account.getSubject().getId());
        Map<Long, ChargeProgress> progress = collection.progressOf(list.stream().map(Charge::getId).toList());
        LocalDate today = LocalDate.now(clock);
        return list.stream().map(c -> view(c, progress.get(c.getId()).paidAmount(), today)).toList();
    }

    public ChargeView charge(CurrentCitizen citizen, Long chargeId) {
        CitizenAccount account = requireActive(citizen);
        Charge charge = charges.chargeOfSubject(chargeId, account.getSubject().getId());
        long paid = collection.progressOf(List.of(chargeId)).get(chargeId).paidAmount();
        return view(charge, paid, LocalDate.now(clock));
    }

    /** Tài khoản của token, còn hoạt động và vẫn gắn đúng hộ ghi trong token. */
    CitizenAccount requireActive(CurrentCitizen citizen) {
        CitizenAccount account = accounts.findById(citizen.accountId())
                .filter(a -> a.getSubject().getId().equals(citizen.subjectId()))
                .orElseThrow(() -> new UnauthorizedException("UNAUTHORIZED",
                        "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại."));
        if (!account.isActive()) {
            throw CitizenAuthService.accountLocked();
        }
        return account;
    }

    private static ChargeView view(Charge c, long paid, LocalDate today) {
        return new ChargeView(c, paid, Math.max(c.getAmount() - paid, 0), c.isOverdue(today));
    }

    public record Profile(CitizenAccount account, ServiceSubject subject, ServiceContract contract, Company company) {
    }

    public record ChargeView(Charge charge, long paidAmount, long remainingAmount, boolean overdue) {
    }
}
