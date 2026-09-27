package vn.dongthanh.vsmt.citizen.api;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.api.BulkyDtos.BulkyRequestDto;
import vn.dongthanh.vsmt.citizen.api.BulkyDtos.CancelBulkyRequest;
import vn.dongthanh.vsmt.citizen.api.BulkyDtos.QuoteBulkyRequest;
import vn.dongthanh.vsmt.citizen.domain.BulkyStatus;
import vn.dongthanh.vsmt.citizen.service.BulkyWasteService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/** Web công ty xử lý yêu cầu rác cồng kềnh (T45): báo phí, đánh dấu đã thu gom, từ chối. Xã và quản trị chỉ xem. */
@Tag(name = "Rác cồng kềnh (công ty)")
@RestController
@RequestMapping("/api/bulky-requests")
@RequiredArgsConstructor
public class BulkyWasteController {

    private final BulkyWasteService bulky;

    @Operation(summary = "Yêu cầu rác cồng kềnh (công ty: của mình; xã / quản trị: tất cả), lọc theo trạng thái")
    @GetMapping
    public List<BulkyRequestDto> list(@RequestParam(required = false) BulkyStatus status,
            @AuthenticationPrincipal CurrentUser actor) {
        return bulky.listForCompany(actor, status).stream().map(BulkyRequestDto::of).toList();
    }

    @Operation(summary = "Công ty báo phí và ngày hẹn thu gom (phí không sinh khoản phải thu, O5)")
    @PostMapping("/{id}/quote")
    public BulkyRequestDto quote(@PathVariable Long id, @Valid @RequestBody QuoteBulkyRequest request,
            @AuthenticationPrincipal CurrentUser actor) {
        return BulkyRequestDto.of(bulky.quote(id, request.fee(), request.scheduledDate(), actor));
    }

    @Operation(summary = "Công ty đánh dấu đã thu gom")
    @PostMapping("/{id}/collected")
    public BulkyRequestDto collected(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return BulkyRequestDto.of(bulky.markCollected(id, actor));
    }

    @Operation(summary = "Công ty từ chối / hủy yêu cầu, phải ghi lý do")
    @PostMapping("/{id}/cancel")
    public BulkyRequestDto cancel(@PathVariable Long id, @Valid @RequestBody CancelBulkyRequest request,
            @AuthenticationPrincipal CurrentUser actor) {
        return BulkyRequestDto.of(bulky.cancelByCompany(id, request.reason(), actor));
    }
}
