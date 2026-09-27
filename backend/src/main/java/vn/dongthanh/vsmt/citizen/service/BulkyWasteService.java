package vn.dongthanh.vsmt.citizen.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.domain.BulkyItemType;
import vn.dongthanh.vsmt.citizen.domain.BulkyStatus;
import vn.dongthanh.vsmt.citizen.domain.BulkyWasteRequest;
import vn.dongthanh.vsmt.citizen.domain.BulkyWasteRequestRepository;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.DaySlot;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.MasterDataQueryService;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.Money;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Rác cồng kềnh (T45, O5): người dân đăng ký, công ty phụ trách khu vực của hộ báo phí và đánh dấu đã thu gom.
 * Phí chỉ lưu trên yêu cầu, không sinh {@code Charge}, không vào sổ công ty–kỳ. Mỗi lần đổi trạng thái báo cho dân.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BulkyWasteService {

    static final String ENTITY = "BulkyWasteRequest";
    static final String CITIZEN_SCREEN = "citizen.bulkyDetail";
    static final String COMPANY_SCREEN = "company.bulky";
    static final DateTimeFormatter CODE_TOKEN = DateTimeFormatter.ofPattern("MMyy");
    static final DateTimeFormatter VN_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    static final int MAX_DAYS_AHEAD = 90;
    static final int MAX_OPEN_PER_HOUSEHOLD = 5;

    private final BulkyWasteRequestRepository requests;
    private final CitizenQueryService citizens;
    private final AreaAssignmentService assignments;
    private final MasterDataQueryService masterData;
    private final NotificationService notifications;
    private final AuditService audit;
    private final Clock clock;

    public record CreateCommand(BulkyItemType itemType, String itemDescription, int quantity, String address,
            LocalDate preferredDate, DaySlot preferredSlot, List<String> photoUrls) {
    }

    public BulkyWasteRequest create(CurrentCitizen citizen, CreateCommand cmd) {
        CitizenAccount account = citizens.requireActive(citizen);
        ServiceSubject subject = account.getSubject();
        LocalDate today = LocalDate.now(clock);
        requireDateWindow(cmd.preferredDate(), today, "Ngày mong muốn");
        String prefix = "CK-" + today.format(CODE_TOKEN) + "-";
        // Tuần tự hóa việc tạo trong tháng: không trùng số mã, không vượt giới hạn yêu cầu đang mở khi gửi dồn.
        requests.lockCodePrefix(prefix);
        if (requests.countBySubjectIdAndStatusIn(subject.getId(), List.of(BulkyStatus.PENDING, BulkyStatus.QUOTED))
                >= MAX_OPEN_PER_HOUSEHOLD) {
            throw new BusinessRuleException("BULKY_TOO_MANY_OPEN", "Hộ đang có " + MAX_OPEN_PER_HOUSEHOLD
                    + " yêu cầu chưa xong. Vui lòng chờ công ty xử lý hoặc hủy bớt trước khi đăng ký thêm.");
        }
        Company company = assignments.companyOf(subject.getArea().getId(), today).map(masterData::companyInfo)
                .orElseThrow(() -> new BusinessRuleException("BULKY_NO_COMPANY",
                        "Khu vực của hộ chưa có công ty thu gom phụ trách. Vui lòng liên hệ UBND xã."));
        String address = blankToNull(cmd.address());
        BulkyWasteRequest request = requests.save(BulkyWasteRequest.builder()
                .code(prefix + "%03d".formatted(requests.maxCodeNumber(prefix) + 1))
                .citizenAccount(account).subject(subject).itemType(cmd.itemType())
                .itemDescription(blankToNull(cmd.itemDescription())).quantity(cmd.quantity())
                .address(address != null ? address : subject.getAddress()).preferredDate(cmd.preferredDate())
                .preferredSlot(cmd.preferredSlot()).photoUrls(joinUrls(cmd.photoUrls())).company(company)
                .build());
        notifications.publish(NotificationCommand.toCompany(company.getId(), Role.COMPANY_MANAGER, NotificationKind.INFO,
                "Yêu cầu rác cồng kềnh mới " + request.getCode() + " · " + subject.getCode(),
                cmd.quantity() + " × " + itemLabel(cmd.itemType()) + " · mong muốn " + cmd.preferredDate().format(VN_DATE)
                        + " · " + request.getAddress(),
                link(COMPANY_SCREEN, request)), null);
        audit.recordCitizen(account.getPhone(), "CREATE_BULKY", ENTITY, request.getCode(), null, state(request));
        return request;
    }

    @Transactional(readOnly = true)
    public List<BulkyWasteRequest> listOfCitizen(CurrentCitizen citizen) {
        return requests.findByCitizen(citizens.requireActive(citizen).getId());
    }

    @Transactional(readOnly = true)
    public BulkyWasteRequest getOfCitizen(CurrentCitizen citizen, Long id) {
        Long accountId = citizens.requireActive(citizen).getId();
        return requests.findByIdWithDetails(id)
                .filter(r -> r.getCitizenAccount().getId().equals(accountId))
                .orElseThrow(BulkyWasteService::notFound);
    }

    public BulkyWasteRequest cancelByCitizen(CurrentCitizen citizen, Long id, String reason) {
        BulkyWasteRequest request = getOfCitizen(citizen, id);
        Map<String, Object> before = state(request);
        request.cancel(reason);
        audit.recordCitizen(request.getCitizenAccount().getPhone(), "CITIZEN_CANCEL_BULKY", ENTITY, request.getCode(),
                before, state(request));
        notifications.publish(NotificationCommand.toCompany(request.getCompany().getId(), Role.COMPANY_MANAGER, NotificationKind.INFO,
                "Hộ hủy yêu cầu rác cồng kềnh " + request.getCode(), "Lý do: " + request.getCancelReason(),
                link(COMPANY_SCREEN, request)), null);
        return request;
    }

    /** Công ty thấy yêu cầu của mình; cán bộ xã và quản trị thấy tất cả. */
    @Transactional(readOnly = true)
    public List<BulkyWasteRequest> listForCompany(CurrentUser actor, BulkyStatus status) {
        actor.requireRole(Role.COMPANY_MANAGER, Role.COMMUNE_OFFICER, Role.ADMIN);
        return requests.search(actor.role() == Role.COMPANY_MANAGER ? actor.companyId() : null, status);
    }

    public BulkyWasteRequest quote(Long id, long fee, LocalDate scheduledDate, CurrentUser actor) {
        BulkyWasteRequest request = loadForCompany(id, actor);
        request.requireStatus(BulkyStatus.PENDING, "báo phí");
        LocalDate scheduled = scheduledDate != null ? scheduledDate : request.getPreferredDate();
        requireDateWindow(scheduled, LocalDate.now(clock), "Ngày hẹn thu gom");
        Map<String, Object> before = state(request);
        request.quote(fee, scheduled, OffsetDateTime.now(clock));
        audit.record(actor, "QUOTE_BULKY_FEE", ENTITY, request.getCode(), before, state(request));
        notifyCitizen(request, "Đã báo phí", request.getCompany().getName() + " báo phí " + Money.format(fee)
                + ", hẹn thu gom " + scheduled.format(VN_DATE) + ". Phí thanh toán trực tiếp cho công ty khi thu gom.", actor);
        return request;
    }

    public BulkyWasteRequest markCollected(Long id, CurrentUser actor) {
        BulkyWasteRequest request = loadForCompany(id, actor);
        Map<String, Object> before = state(request);
        request.markCollected(OffsetDateTime.now(clock));
        audit.record(actor, "COLLECT_BULKY", ENTITY, request.getCode(), before, state(request));
        notifyCitizen(request, "Đã thu gom", request.getCompany().getName() + " đã thu gom "
                + request.getQuantity() + " × " + itemLabel(request.getItemType()) + ". Phí: "
                + Money.format(request.getQuotedFee()) + ".", actor);
        return request;
    }

    public BulkyWasteRequest cancelByCompany(Long id, String reason, CurrentUser actor) {
        BulkyWasteRequest request = loadForCompany(id, actor);
        Map<String, Object> before = state(request);
        request.cancel(reason);
        audit.record(actor, "CANCEL_BULKY", ENTITY, request.getCode(), before, state(request));
        notifyCitizen(request, "Công ty từ chối", request.getCompany().getName() + " không thu gom được: "
                + request.getCancelReason(), actor);
        return request;
    }

    private BulkyWasteRequest loadForCompany(Long id, CurrentUser actor) {
        actor.requireRole(Role.COMPANY_MANAGER);
        return requests.findByIdWithDetails(id)
                .filter(r -> r.getCompany().getId().equals(actor.companyId()))
                .orElseThrow(BulkyWasteService::notFound);
    }

    private void notifyCitizen(BulkyWasteRequest request, String statusLabel, String body, CurrentUser actor) {
        notifications.publish(NotificationCommand.toCitizen(request.getCitizenAccount().getId(), NotificationKind.INFO,
                "Rác cồng kềnh " + request.getCode() + " · " + statusLabel, body, link(CITIZEN_SCREEN, request)),
                actor.id());
    }

    private static Map<String, Object> state(BulkyWasteRequest r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("status", r.getStatus());
        m.put("quotedFee", r.getQuotedFee());
        m.put("scheduledDate", r.getScheduledDate());
        m.put("cancelReason", r.getCancelReason());
        return m;
    }

    private static Map<String, Object> link(String screen, BulkyWasteRequest r) {
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("screen", screen);
        link.put("params", Map.of("requestId", r.getId() == null ? 0 : r.getId()));
        return link;
    }

    /** Nhãn tiếng Việt trong thông báo (nhãn giao diện vẫn ở frontend). */
    static String itemLabel(BulkyItemType type) {
        return switch (type) {
            case MATTRESS -> "nệm, chăn ga khối lớn";
            case FURNITURE -> "tủ, bàn, ghế, sofa";
            case LARGE_APPLIANCE -> "thiết bị điện lớn";
            case DEBRIS -> "xà bần, cành cây lớn";
        };
    }

    private static String joinUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) {
            return null;
        }
        String joined = String.join("\n", urls.stream().map(String::trim).filter(s -> !s.isEmpty()).toList());
        return joined.isEmpty() ? null : joined;
    }

    private static void requireDateWindow(LocalDate date, LocalDate today, String label) {
        if (date.isBefore(today)) {
            throw new BusinessRuleException("BULKY_DATE_PAST", label + " không được trước hôm nay.");
        }
        if (date.isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
            throw new BusinessRuleException("BULKY_DATE_TOO_FAR", label + " không được quá " + MAX_DAYS_AHEAD + " ngày tới.");
        }
    }

    private static NotFoundException notFound() {
        return new NotFoundException("BULKY_REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu rác cồng kềnh.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
