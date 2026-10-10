package vn.dongthanh.vsmt.remittance.api;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.CompanyReminderAutoService;
import vn.dongthanh.vsmt.remittance.service.CompanyReminderAutoService.Rule;
import vn.dongthanh.vsmt.remittance.service.CompanyReminderAutoService.Target;

@RestController
@RequestMapping("/api/remittance/reminder-rule")
@RequiredArgsConstructor
public class CompanyReminderRuleController {

    private final CompanyReminderAutoService service;

    @GetMapping
    public Rule get(@AuthenticationPrincipal CurrentUser actor) {
        return service.rule(actor);
    }

    @PutMapping
    public Rule update(@Valid @RequestBody RuleRequest request, @AuthenticationPrincipal CurrentUser actor) {
        return service.update(new Rule(request.enabled(), request.daysBeforeDue(), request.repeatEveryDays()), actor);
    }

    @GetMapping("/preview")
    public List<Target> preview(@AuthenticationPrincipal CurrentUser actor) {
        return service.preview(actor);
    }

    @PostMapping("/run")
    public RunResult run(@AuthenticationPrincipal CurrentUser actor) {
        return new RunResult(service.runNow(actor));
    }

    public record RuleRequest(@NotNull Boolean enabled, @NotNull @Min(0) @Max(365) Integer daysBeforeDue,
            @NotNull @Min(1) @Max(365) Integer repeatEveryDays) {
    }

    public record RunResult(int sent) {
    }
}
