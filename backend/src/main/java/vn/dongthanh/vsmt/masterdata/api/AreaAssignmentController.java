package vn.dongthanh.vsmt.masterdata.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService.AssignCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: phân công khu vực")
@RestController
@RequestMapping("/api/masterdata")
@RequiredArgsConstructor
public class AreaAssignmentController {

    private final AreaAssignmentService assignments;

    @Operation(summary = "Phân công một hoặc nhiều khu vực cho công ty (cán bộ xã); tự đóng phân công cũ")
    @PostMapping("/area-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public List<AreaAssignmentDto> assign(@Valid @RequestBody AssignRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return assignments.assign(new AssignCommand(req.areaIds(), req.companyId(), req.fromDate(), req.note(),
                req.decisionNo()), actor).stream().map(AreaAssignmentDto::of).toList();
    }

    @Operation(summary = "Phân công đang hiệu lực vào ngày (mặc định hôm nay); công ty chỉ thấy khu vực của mình")
    @GetMapping("/area-assignments")
    public List<AreaAssignmentDto> active(@RequestParam(required = false) LocalDate date,
            @AuthenticationPrincipal CurrentUser actor) {
        return assignments.activeOn(date != null ? date : LocalDate.now(), actor).stream()
                .map(AreaAssignmentDto::of).toList();
    }

    @Operation(summary = "Lịch sử phân công của một khu vực, mới nhất trước (cán bộ xã, quản trị)")
    @GetMapping("/areas/{areaId}/assignments")
    public List<AreaAssignmentDto> history(@PathVariable Long areaId, @AuthenticationPrincipal CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        return assignments.history(areaId).stream().map(AreaAssignmentDto::of).toList();
    }

    public record AssignRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotEmpty(message = "phải chọn ít nhất một khu vực")
            List<@NotNull Long> areaIds,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") LocalDate fromDate,
            @Size(max = 2000) String note,
            @Size(max = 50) String decisionNo) {
    }

    public record AreaAssignmentDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DV01") String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String companyName,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate validFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate validTo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String note,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String decisionNo) {

        static AreaAssignmentDto of(AreaAssignment a) {
            return new AreaAssignmentDto(a.getId(), a.getArea().getId(), a.getArea().getCode(), a.getArea().getName(),
                    a.getCompany().getId(), a.getCompany().getCode(), a.getCompany().getName(), a.getValidFrom(),
                    a.getValidTo(), a.getNote(), a.getDecisionNo());
        }
    }
}
