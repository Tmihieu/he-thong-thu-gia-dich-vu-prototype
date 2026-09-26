package vn.dongthanh.vsmt.collection.api;

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
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.collection.domain.CashHandover;
import vn.dongthanh.vsmt.collection.service.CashService;
import vn.dongthanh.vsmt.collection.service.CashService.CashHeld;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thu tiền: tiền mặt đang giữ và bàn giao")
@RestController
@RequestMapping("/api/collection/cash")
@RequiredArgsConstructor
public class CashController {

    private final CashService cash;

    @Operation(summary = "Tiền mặt đang giữ. Người đi thu: của mình; quản lý công ty: một người (collectorId) hoặc cả công ty")
    @GetMapping("/held")
    public List<CashHeldDto> held(@RequestParam(required = false) Long collectorId,
            @AuthenticationPrincipal CurrentUser actor) {
        if (actor.role() == Role.COLLECTOR) {
            return List.of(CashHeldDto.of(cash.held(actor.id(), actor)));
        }
        if (collectorId != null) {
            return List.of(CashHeldDto.of(cash.held(collectorId, actor)));
        }
        return cash.heldForCompany(actor).stream().map(CashHeldDto::of).toList();
    }

    @Operation(summary = "Ghi nhận tiền mặt nhận từ người đi thu (quản lý công ty, G5)")
    @PostMapping("/handovers")
    @ResponseStatus(HttpStatus.CREATED)
    public HandoverDto handover(@Valid @RequestBody HandoverRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return HandoverDto.of(cash.handover(req.collectorId(), req.amount(), req.handoverDate(), req.note(), actor));
    }

    @Operation(summary = "Lịch sử bàn giao: người đi thu xem của mình, quản lý công ty xem của công ty")
    @GetMapping("/handovers")
    public List<HandoverDto> handovers(@RequestParam(required = false) Long collectorId,
            @AuthenticationPrincipal CurrentUser actor) {
        return cash.list(collectorId, actor).stream().map(HandoverDto::of).toList();
    }

    public record HandoverRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long collectorId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @Positive(message = "phải lớn hơn 0") long amount,
            @Schema(description = "Để trống thì lấy hôm nay") LocalDate handoverDate,
            @Size(max = 500) String note) {
    }

    public record CashHeldDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long collectorId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String collectorUsername,
            @Schema(requiredMode = RequiredMode.REQUIRED) String collectorName,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tiền mặt đã thu (mọi kỳ)") long collectedCash,
            @Schema(requiredMode = RequiredMode.REQUIRED) long handedOver,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đang giữ") long held) {

        static CashHeldDto of(CashHeld h) {
            return new CashHeldDto(h.collector().getId(), h.collector().getUsername(), h.collector().getFullName(),
                    h.collectedCash(), h.handedOver(), h.held());
        }
    }

    public record HandoverDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "BG-1026-01") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long collectorId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String collectorName,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate handoverDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note) {

        static HandoverDto of(CashHandover h) {
            return new HandoverDto(h.getId(), h.getCode(), h.getCollector().getId(), h.getCollector().getFullName(),
                    h.getHandoverDate(), h.getAmount(), h.getNote());
        }
    }
}
