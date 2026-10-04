package vn.dongthanh.vsmt.masterdata.api;

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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.service.GoongClient;
import vn.dongthanh.vsmt.masterdata.service.StreetService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: đường chuẩn hóa địa chỉ")
@RestController
@RequestMapping("/api/masterdata/streets")
@RequiredArgsConstructor
public class StreetController {

    private final StreetService streets;

    public record StreetDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long districtId,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Xã/phường, để phân biệt đường trùng tên") String districtName,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Đã đối chiếu với Goong") boolean goongLinked) {

        static StreetDto of(Street s) {
            return new StreetDto(s.getId(), s.getName(), s.getDistrict().getId(), s.getDistrict().getName(),
                    s.getGoongPlaceId() != null);
        }
    }

    public record ExternalStreetDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String placeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) String secondaryText) {
    }

    public record SuggestDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<StreetDto> streets,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Gợi ý tham khảo từ Goong, CHƯA có trong danh mục") List<ExternalStreetDto> external,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "OK | NOT_CONFIGURED | REJECTED | UNAVAILABLE") GoongClient.Status goongStatus) {
    }

    public record CreateStreetRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long districtId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 200) String name,
            @Size(max = 600) String goongPlaceId) {
    }

    @Operation(summary = "Gợi ý đường theo từ khóa: danh mục nội bộ trước, Goong chỉ bổ sung tham khảo (cán bộ xã)")
    @GetMapping("/suggest")
    public SuggestDto suggest(@RequestParam String q, @RequestParam(required = false) Long districtId,
            @AuthenticationPrincipal CurrentUser actor) {
        StreetService.Suggestions r = streets.suggest(q, districtId, actor);
        return new SuggestDto(r.streets().stream().map(StreetDto::of).toList(),
                r.external().stream().map(e -> new ExternalStreetDto(e.placeId(), e.name(), e.secondary())).toList(),
                r.goongStatus());
    }

    @Operation(summary = "Bổ sung đường vào danh mục (cán bộ xã, có nhật ký)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StreetDto create(@Valid @RequestBody CreateStreetRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return StreetDto.of(streets.create(req.districtId(), req.name(), req.goongPlaceId(), actor));
    }
}
