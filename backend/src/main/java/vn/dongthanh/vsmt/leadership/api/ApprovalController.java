package vn.dongthanh.vsmt.leadership.api;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.leadership.domain.ApprovalRequest;
import vn.dongthanh.vsmt.leadership.domain.ApprovalStatus;
import vn.dongthanh.vsmt.leadership.domain.ApprovalType;
import vn.dongthanh.vsmt.leadership.service.ApprovalService;
import vn.dongthanh.vsmt.leadership.service.ApprovalService.CreateCommand;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Lãnh đạo: đề nghị miễn giảm / hoàn / xóa nợ")
@RestController
@RequestMapping("/api/leadership/approvals")
@RequiredArgsConstructor
public class ApprovalController {

    private final ApprovalService approvals;
    private final UserRepository users;

    @Operation(summary = "Đề nghị (xã, lãnh đạo, quản trị); lọc trạng thái / loại; mới nhất trước")
    @GetMapping
    public List<ApprovalDto> list(@RequestParam(required = false) ApprovalStatus status,
            @RequestParam(required = false) ApprovalType type, @AuthenticationPrincipal CurrentUser actor) {
        return toDtos(approvals.list(status, type, actor));
    }

    @Operation(summary = "Cán bộ xã lập đề nghị hoàn (khoản đã thu) hoặc xóa nợ (khoản chưa thu); thông báo lãnh đạo")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApprovalDto create(@Valid @RequestBody CreateApprovalRequest req, @AuthenticationPrincipal CurrentUser actor) {
        Long id = approvals.create(new CreateCommand(req.type(), req.chargeId(), req.amount(), req.reason(),
                req.decisionNo()), actor).getId();
        return one(id, actor);
    }

    @Operation(summary = "Lãnh đạo duyệt: xóa nợ / ghi hoàn ngay; miễn giảm chỉ ghi nhận")
    @PostMapping("/{id}/approve")
    public ApprovalDto approve(@PathVariable Long id, @Valid @RequestBody DecisionRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        approvals.approve(id, req.note(), actor);
        return one(id, actor);
    }

    @Operation(summary = "Lãnh đạo từ chối (bắt buộc ý kiến); miễn giảm bị từ chối thì bỏ cờ miễn (O8)")
    @PostMapping("/{id}/reject")
    public ApprovalDto reject(@PathVariable Long id, @Valid @RequestBody DecisionRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        approvals.reject(id, req.note(), actor);
        return one(id, actor);
    }

    private ApprovalDto one(Long id, CurrentUser actor) {
        return toDtos(List.of(approvals.get(id, actor))).get(0);
    }

    private List<ApprovalDto> toDtos(List<ApprovalRequest> list) {
        Set<Long> ids = new HashSet<>();
        list.forEach(r -> {
            ids.add(r.getRequestedBy());
            if (r.getDecidedBy() != null) {
                ids.add(r.getDecidedBy());
            }
        });
        Map<Long, String> names = users.findAllById(ids).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        return list.stream().map(r -> ApprovalDto.of(r, names::get)).toList();
    }

    public record CreateApprovalRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") ApprovalType type,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long chargeId,
            @Schema(description = "Bắt buộc khi hoàn") Long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống")
            @Size(max = 1000, message = "tối đa 1000 ký tự") String reason,
            @Size(max = 50, message = "tối đa 50 ký tự") String decisionNo) {
    }

    public record DecisionRequest(@Size(max = 1000, message = "tối đa 1000 ký tự") String note) {
    }

    public record ApprovalDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) ApprovalType type,
            @Schema(requiredMode = RequiredMode.REQUIRED) ApprovalStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String contractNo,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String chargeCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String companyCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Số tiền khoản") Long chargeAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Số tiền hoàn") Long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) String reason,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String decisionNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) String requestedByName,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime requestedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String decidedByName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime decidedAt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String decisionNote,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Kỳ ghi nhận hoàn / xóa nợ")
            String effectivePeriodCode) {

        static ApprovalDto of(ApprovalRequest r, Function<Long, String> name) {
            Charge c = r.getCharge();
            ServiceSubject s = c != null ? c.getSubject() : r.getContract().getSubject();
            return new ApprovalDto(r.getId(), r.getCode(), r.getType(), r.getStatus(), s.getCode(), s.getName(),
                    r.getContract() == null ? null : r.getContract().getContractNo(), c == null ? null : c.getId(),
                    c == null ? null : c.getCode(), c == null ? null : c.getPeriod().getCode(),
                    c == null ? null : c.getCompany().getCode(), c == null ? null : c.getAmount(), r.getAmount(),
                    r.getReason(), r.getDecisionNo(), name.apply(r.getRequestedBy()), r.getRequestedAt(),
                    r.getDecidedBy() == null ? null : name.apply(r.getDecidedBy()), r.getDecidedAt(), r.getDecisionNote(),
                    r.getEffectivePeriod() == null ? null : r.getEffectivePeriod().getCode());
        }
    }
}
