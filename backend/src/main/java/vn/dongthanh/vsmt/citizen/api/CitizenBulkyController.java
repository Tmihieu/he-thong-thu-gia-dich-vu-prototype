package vn.dongthanh.vsmt.citizen.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.api.BulkyDtos.BulkyRequestDto;
import vn.dongthanh.vsmt.citizen.api.BulkyDtos.CancelBulkyRequest;
import vn.dongthanh.vsmt.citizen.api.BulkyDtos.CreateBulkyRequest;
import vn.dongthanh.vsmt.citizen.service.BulkyWasteService;
import vn.dongthanh.vsmt.citizen.service.BulkyWasteService.CreateCommand;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

/** Đăng ký rác cồng kềnh từ app người dân (T45/T46). */
@Tag(name = "App người dân: rác cồng kềnh")
@RestController
@RequestMapping("/api/citizen/bulky-requests")
@RequiredArgsConstructor
public class CitizenBulkyController {

    private final BulkyWasteService bulky;

    @Operation(summary = "Đăng ký thu gom rác cồng kềnh; công ty phụ trách khu vực của hộ nhận yêu cầu;"
            + " ảnh là tên trả về từ POST /api/citizen/photos")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BulkyRequestDto create(@AuthenticationPrincipal CurrentCitizen citizen,
            @Valid @RequestBody CreateBulkyRequest request) {
        return BulkyRequestDto.forCitizen(bulky.create(citizen, new CreateCommand(request.itemType(),
                request.itemDescription(), request.quantity(), request.address(), request.preferredDate(),
                request.preferredSlot(), request.photoNames())));
    }

    @Operation(summary = "Yêu cầu của hộ, mới nhất trước")
    @GetMapping
    public List<BulkyRequestDto> list(@AuthenticationPrincipal CurrentCitizen citizen) {
        return bulky.listOfCitizen(citizen).stream().map(BulkyRequestDto::forCitizen).toList();
    }

    @Operation(summary = "Chi tiết yêu cầu (của hộ khác trả 404)")
    @GetMapping("/{id}")
    public BulkyRequestDto get(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        return BulkyRequestDto.forCitizen(bulky.getOfCitizen(citizen, id));
    }

    @Operation(summary = "Hủy yêu cầu (khi chờ xác nhận hoặc đã báo phí), phải ghi lý do")
    @PostMapping("/{id}/cancel")
    public BulkyRequestDto cancel(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id,
            @Valid @RequestBody CancelBulkyRequest request) {
        return BulkyRequestDto.forCitizen(bulky.cancelByCitizen(citizen, id, request.reason()));
    }
}
