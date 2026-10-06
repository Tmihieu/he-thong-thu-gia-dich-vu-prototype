package vn.dongthanh.vsmt.masterdata.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodAutoRule;
import vn.dongthanh.vsmt.masterdata.domain.PeriodAutoRuleRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.notification.domain.NotificationKind;
import vn.dongthanh.vsmt.notification.service.NotificationService;
import vn.dongthanh.vsmt.notification.service.NotificationService.NotificationCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Tự tạo kỳ thu kế tiếp ở dạng dự thảo (xã chốt 04/10/2026). Mỗi sáng hệ thống xem quy tắc: tới ngày tạo thì lập kỳ
 * dự thảo cho tháng (hoặc quý) sau, gắn biểu giá hiệu lực tại ngày đầu kỳ, rồi báo cán bộ xã. Dự thảo chưa có khoản
 * nào; cán bộ xã xem trước và bấm "Mở kỳ & phát hành" (PeriodPublishService). Chạy lại trong ngày không sinh trùng vì
 * kỳ đã có mã thì bỏ qua. Quản trị chỉ sửa quy tắc, không mở kỳ thay xã.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PeriodAutoService {

    static final String ENTITY = "CollectionPeriod";
    static final String RULE_ENTITY = "PeriodAutoRule";

    private final PeriodAutoRuleRepository rules;
    private final CollectionPeriodRepository periods;
    private final TariffService tariffs;
    private final AuditService audit;
    private final NotificationService notifications;
    private final Clock clock;

    public record RuleCommand(boolean enabled, PeriodType periodType, int createDay, int remitDueDays) {
    }

    /** Kết quả một lần chạy: {@code created} null kèm lý do khi chưa tạo kỳ nào. */
    public record DraftRun(CollectionPeriod created, String message) {
    }

    /** Kỳ cần có dự thảo. */
    public record Target(PeriodType type, int year, int number, LocalDate start, LocalDate end) {
    }

    @Transactional(readOnly = true)
    public PeriodAutoRule rule(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return loadRule();
    }

    /** Dành cho service khác trong cùng hệ thống (quy tắc hiện hành); không kiểm quyền. */
    @Transactional(readOnly = true)
    public PeriodAutoRule currentRule() {
        return loadRule();
    }

    public PeriodAutoRule updateRule(RuleCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        PeriodAutoRule rule = loadRule();
        Map<String, Object> before = snapshot(rule);
        rule.update(cmd.enabled(), cmd.periodType(), cmd.createDay(), cmd.remitDueDays(),
                OffsetDateTime.now(clock), actor.id());
        audit.record(actor, "UPDATE_PERIOD_RULE", RULE_ENTITY, PeriodAutoRule.ID, before, snapshot(rule));
        return rule;
    }

    /** Quản trị chạy ngay để thử quy tắc, không chờ 7:30 sáng. */
    public DraftRun runNow(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return createDraftIfDue(actor);
    }

    @Scheduled(cron = "0 30 7 * * *", zone = "Asia/Ho_Chi_Minh")
    public void runDaily() {
        // Tạm tắt tự tạo kỳ: quản trị tạo kỳ dự thảo bằng tay. Bỏ dòng return để bật lại lịch 7:30.
        if (true) {
            return;
        }
        try {
            DraftRun run = createDraftIfDue(null);
            if (run.created() != null) {
                log.info("Tự tạo kỳ thu: {}", run.message());
            } else {
                log.debug("Tự tạo kỳ thu: {}", run.message());
            }
        } catch (RuntimeException e) {
            // Một lần lỗi (vd. chưa có biểu giá) không được làm hỏng lịch chạy của các ngày sau.
            log.warn("Tự tạo kỳ thu không thành công: {}", e.getMessage());
        }
    }

    /**
     * @param actor người bấm chạy tay; null khi hệ thống tự chạy (nhật ký ghi là "system")
     */
    public DraftRun createDraftIfDue(CurrentUser actor) {
        PeriodAutoRule rule = loadRule();
        if (!rule.isEnabled()) {
            return new DraftRun(null, "Quy tắc tự tạo kỳ đang tắt.");
        }
        Optional<Target> due = targetOn(LocalDate.now(clock), rule);
        if (due.isEmpty()) {
            return new DraftRun(null, notDueMessage(rule));
        }
        Target t = due.get();
        // Dựng kỳ tạm để sinh mã trước khi tra biểu giá (cùng cách PeriodService.open).
        CollectionPeriod probe = CollectionPeriod.draft(t.type(), t.year(), t.number(), t.end(), null);
        if (periods.existsByCode(probe.getCode())) {
            return new DraftRun(null, "Kỳ " + probe.getCode() + " đã có, không tạo thêm.");
        }
        TariffVersion tariff;
        try {
            tariff = tariffs.activeVersionOn(t.start());
        } catch (BusinessRuleException e) {
            return new DraftRun(null, "Chưa tạo được " + probe.getLabel() + ": " + e.getMessage());
        }
        CollectionPeriod draft = saveDraft(t.type(), t.year(), t.number(), t.end(), rule, tariff, actor);
        return new DraftRun(draft, "Đã tạo kỳ dự thảo " + draft.getLabel() + ".");
    }

    /**
     * Quản trị tạo kỳ dự thảo bằng tay chỉ chọn loại kỳ, năm, tháng/quý; ngày mở và hạn công ty nộp xã do cán bộ xã
     * đặt khi mở kỳ (mặc định: ngày đầu kỳ, cuối kỳ cộng số ngày nộp xã theo quy tắc). Báo cán bộ xã như kỳ tự tạo.
     */
    public CollectionPeriod createDraft(PeriodType type, int year, int number, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        // Dựng kỳ tạm để kiểm tra số tháng/quý, sinh mã và ngày cuối kỳ trước khi tra biểu giá.
        CollectionPeriod probe = CollectionPeriod.draft(type, year, number, LocalDate.of(year, 12, 31), null);
        if (periods.existsByCode(probe.getCode())) {
            throw new ConflictException("PERIOD_ALREADY_EXISTS", "Kỳ " + probe.getCode() + " đã được tạo trước đó.");
        }
        TariffVersion tariff = tariffs.activeVersionOn(probe.getStartDate());
        return saveDraft(type, year, number, probe.getEndDate(), loadRule(), tariff, actor);
    }

    private CollectionPeriod saveDraft(PeriodType type, int year, int number, LocalDate periodEnd, PeriodAutoRule rule,
            TariffVersion tariff, CurrentUser actor) {
        CollectionPeriod draft = periods.save(CollectionPeriod.draft(type, year, number,
                periodEnd.withDayOfMonth(25), tariff));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("code", draft.getCode());
        after.put("type", draft.getPeriodType());
        after.put("startDate", draft.getStartDate());
        after.put("endDate", draft.getEndDate());
        after.put("dueDate", draft.getDueDate());
        after.put("tariffVersion", tariff.getCode());
        after.put("status", draft.getStatus());
        if (actor == null) {
            audit.recordSystem("CREATE_DRAFT_PERIOD", ENTITY, draft.getCode(), null, after);
        } else {
            audit.record(actor, "CREATE_DRAFT_PERIOD", ENTITY, draft.getCode(), null, after);
        }
        notifications.publish(NotificationCommand.toRole(Role.COMMUNE_OFFICER, NotificationKind.INFO,
                "Kỳ thu " + draft.getLabel() + " đã được tạo, chờ mở",
                "Hệ thống đã tạo " + draft.getLabel() + " ở dạng dự thảo. Vui lòng xem trước các khoản và bấm "
                        + "\"Mở kỳ & phát hành\" để hộ dân nhận khoản thu.",
                Map.of("screen", "commune.periodDrafts")), null);
        return draft;
    }

    /** Các kỳ dự thảo đang chờ cán bộ xã mở, kỳ sớm nhất trước. */
    @Transactional(readOnly = true)
    public List<CollectionPeriod> drafts(CurrentUser actor) {
        actor.requireRole(Role.ADMIN, Role.COMMUNE_OFFICER);
        return periods.findDraftsWithTariff();
    }

    /**
     * Kỳ cần có dự thảo vào ngày {@code today}, hoặc rỗng nếu chưa tới ngày tạo. Kỳ tháng: từ ngày tạo của tháng này
     * thì tạo tháng sau. Kỳ quý: chỉ trong tháng cuối quý (3, 6, 9, 12), tạo quý sau. Dùng "từ ngày" chứ không phải
     * "đúng ngày" để vẫn tạo bù khi hệ thống tắt vào đúng ngày đó.
     */
    public static Optional<Target> targetOn(LocalDate today, PeriodAutoRule rule) {
        if (today.getDayOfMonth() < rule.getCreateDay()) {
            return Optional.empty();
        }
        YearMonth next = YearMonth.from(today).plusMonths(1);
        if (rule.getPeriodType() == PeriodType.MONTH) {
            return Optional.of(new Target(PeriodType.MONTH, next.getYear(), next.getMonthValue(), next.atDay(1),
                    next.atEndOfMonth()));
        }
        if (today.getMonthValue() % 3 != 0) {
            return Optional.empty();
        }
        int quarter = (next.getMonthValue() - 1) / 3 + 1;
        return Optional.of(new Target(PeriodType.QUARTER, next.getYear(), quarter, next.atDay(1),
                next.plusMonths(2).atEndOfMonth()));
    }

    private static String notDueMessage(PeriodAutoRule rule) {
        return rule.getPeriodType() == PeriodType.MONTH
                ? "Chưa đến ngày tạo kỳ (từ ngày " + rule.getCreateDay() + " hằng tháng)."
                : "Chưa đến ngày tạo kỳ (từ ngày " + rule.getCreateDay() + " của tháng cuối quý).";
    }

    private PeriodAutoRule loadRule() {
        return rules.findById(PeriodAutoRule.ID).orElseThrow(() -> new BusinessRuleException("PERIOD_RULE_MISSING",
                "Chưa có quy tắc tự tạo kỳ thu trong cơ sở dữ liệu."));
    }

    private static Map<String, Object> snapshot(PeriodAutoRule r) {
        return Map.of("enabled", r.isEnabled(), "periodType", r.getPeriodType(), "createDay", r.getCreateDay(),
                "remitDueDays", r.getRemitDueDays());
    }
}
