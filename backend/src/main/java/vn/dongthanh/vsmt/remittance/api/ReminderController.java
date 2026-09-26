package vn.dongthanh.vsmt.remittance.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.domain.PaymentReminder;
import vn.dongthanh.vsmt.remittance.service.CompanyLedgerService.PeriodDebt;
import vn.dongthanh.vsmt.remittance.service.ReminderService;
import vn.dongthanh.vsmt.remittance.service.ReminderService.CreateReminderCommand;
import vn.dongthanh.vsmt.remittance.service.ReminderService.ReminderDraft;
import vn.dongthanh.vsmt.remittance.service.ReminderService.ReminderView;

@Tag(name = "Nộp tiền về xã: nhắc nộp")
@RestController
@RequestMapping("/api/remittance/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminders;

    @Operation(summary = "Bản nháp nhắc nộp: các kỳ quá hạn còn nợ, tổng tiền, hạn mới (+5 ngày), nội dung soạn sẵn")
    @GetMapping("/draft")
    public DraftDto draft(@RequestParam Long companyId, @AuthenticationPrincipal CurrentUser actor) {
        return DraftDto.of(reminders.draft(companyId, actor));
    }

    @Operation(summary = "Gửi nhắc nộp (cán bộ xã); công ty không có nợ quá hạn → 422")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderDto create(@Valid @RequestBody CreateReminderRequest req, @AuthenticationPrincipal CurrentUser actor) {
        PaymentReminder r = reminders.create(new CreateReminderCommand(req.companyId(), req.periodIds(), req.dueDate(),
                req.content()), actor);
        return ReminderDto.of(new ReminderView(r, false));
    }

    @Operation(summary = "Lịch sử nhắc nộp; công ty chỉ thấy của mình; settled = đã hết nợ các kỳ được nhắc")
    @GetMapping
    public List<ReminderDto> list(@RequestParam(required = false) Long companyId,
            @AuthenticationPrincipal CurrentUser actor) {
        return reminders.list(companyId, actor).stream().map(ReminderDto::of).toList();
    }

    public record CreateReminderRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long companyId,
            @Schema(description = "Trống thì nhắc mọi kỳ quá hạn còn nợ") List<Long> periodIds,
            @Schema(description = "Trống thì ngày nhắc + 5") LocalDate dueDate,
            @Schema(description = "Trống thì dùng nội dung soạn sẵn") @Size(max = 2000) String content) {
    }

    public record DebtDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate periodDueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) long remaining) {

        static DebtDto of(PeriodDebt d) {
            return new DebtDto(d.period().getId(), d.period().getLabel(), d.period().getDueDate(), d.remaining());
        }
    }

    public record DraftDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<DebtDto> debts,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content) {

        static DraftDto of(ReminderDraft d) {
            return new DraftDto(d.company().getId(), d.company().getCode(), d.company().getName(),
                    d.debts().stream().map(DebtDto::of).toList(), d.amount(), d.dueDate(), d.content());
        }
    }

    public record ReminderDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "NN-001") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate reminderDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<String> periodLabels,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã hết nợ các kỳ được nhắc") boolean settled) {

        static ReminderDto of(ReminderView v) {
            PaymentReminder r = v.reminder();
            return new ReminderDto(r.getId(), r.getCode(), r.getCompany().getId(), r.getCompany().getCode(),
                    r.getReminderDate(), r.getDueDate(), r.getPeriods().stream().map(p -> p.getLabel()).toList(),
                    r.getAmount(), r.getContent(), v.settled());
        }
    }
}
