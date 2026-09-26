package vn.dongthanh.vsmt.remittance.api;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.api.PeriodController.PeriodDto;
import vn.dongthanh.vsmt.masterdata.service.PeriodService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.PeriodLockService;

@Tag(name = "Nộp tiền về xã: khóa kỳ")
@RestController
@RequestMapping("/api/remittance/periods")
@RequiredArgsConstructor
public class PeriodLockController {

    private final PeriodLockService lock;
    private final PeriodService periods;

    @Operation(summary = "Khóa kỳ (cán bộ xã); còn công ty chưa nộp đủ thì 422 kèm danh sách công ty và số nợ")
    @PostMapping("/{id}/lock")
    public PeriodDto lock(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        lock.lock(id, actor);
        return PeriodDto.of(periods.get(id));
    }
}
