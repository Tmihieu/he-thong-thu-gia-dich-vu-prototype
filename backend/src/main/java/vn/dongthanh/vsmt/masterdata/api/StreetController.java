package vn.dongthanh.vsmt.masterdata.api;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.service.GoongClient;
import vn.dongthanh.vsmt.masterdata.service.StreetImportService;
import vn.dongthanh.vsmt.masterdata.service.StreetService;
import vn.dongthanh.vsmt.masterdata.service.StreetService.StreetCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: đường/hẻm chuẩn hóa địa chỉ")
@RestController
@RequestMapping("/api/masterdata/streets")
@RequiredArgsConstructor
public class StreetController {

    private final StreetService streets;
    private final StreetImportService importer;

    public record OldNameDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Văn bản đổi tên") String note) {
    }

    public record StreetDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tên; với hẻm là tên ngắn (\"Hẻm 19\")") String name,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tên hiển thị; hẻm kèm tên đường") String displayName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Street.Kind kind,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Đường của hẻm") Long parentId,
            @Schema(requiredMode = RequiredMode.REQUIRED) ActiveStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Ấp đường đi qua") List<Long> areaIds,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<OldNameDto> oldNames) {

        static StreetDto of(Street s) {
            return new StreetDto(s.getId(), s.getName(), s.getDisplayName(), s.getKind(),
                    s.getParent() == null ? null : s.getParent().getId(), s.getStatus(), s.getAreaIds().stream().sorted().toList(),
                    s.getOldNames().stream().map(o -> new OldNameDto(o.getName(), o.getNote())).toList());
        }
    }

    public record StreetRefDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED) String displayName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Street.Kind kind) {
    }

    public record ExternalStreetDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String placeId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) String secondaryText) {
    }

    public record SuggestDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<StreetRefDto> streets,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Gợi ý tham khảo từ Goong, CHƯA có trong danh mục") List<ExternalStreetDto> external,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "OK | NOT_CONFIGURED | REJECTED | UNAVAILABLE") GoongClient.Status goongStatus) {
    }

    public record CreateStreetRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 200) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Street.Kind kind,
            @Schema(description = "Bắt buộc với hẻm") Long parentId,
            Set<Long> areaIds) {
    }

    public record UpdateStreetRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 200) String name,
            Set<Long> areaIds,
            ActiveStatus status,
            @Schema(description = "Văn bản đổi tên (khi đổi tên)") @Size(max = 255) String renameNote) {
    }

    public record PendingGroupDto(
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Khóa nhóm, gửi lại khi gắn") String key,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Tên đường cán bộ đã ghi") String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) int subjectCount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số hồ sơ cán bộ ghi chờ xác minh") int pendingCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<String> areaNames,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<String> sampleCodes) {
    }

    public record LinkGroupRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") String key,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotNull(message = "không được để trống") Long streetId) {
    }

    public record CountDto(@Schema(requiredMode = RequiredMode.REQUIRED) int count) {
    }

    public record MatchResultDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) int matched,
            @Schema(requiredMode = RequiredMode.REQUIRED) int remaining) {
    }

    public record ImportRowDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) int rowNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) String kind,
            @Schema(requiredMode = RequiredMode.REQUIRED) String parent,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areas,
            @Schema(requiredMode = RequiredMode.REQUIRED) String oldName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String action,
            @Schema(requiredMode = RequiredMode.REQUIRED) List<String> errors) {
    }

    public record ImportPreviewDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ImportRowDto> rows,
            @Schema(requiredMode = RequiredMode.REQUIRED) int added,
            @Schema(requiredMode = RequiredMode.REQUIRED) int updated,
            @Schema(requiredMode = RequiredMode.REQUIRED) int skipped,
            @Schema(requiredMode = RequiredMode.REQUIRED) int invalid) {

        static ImportPreviewDto of(StreetImportService.ImportPreview p) {
            return new ImportPreviewDto(p.rows().stream().map(r -> new ImportRowDto(r.rowNo(), r.name(), r.kind(), r.parent(),
                    r.areas(), r.oldName(), r.action(), r.errors())).toList(), p.added(), p.updated(), p.skipped(), p.invalid());
        }
    }

    @Operation(summary = "Toàn bộ danh mục đường/hẻm kèm ấp và tên cũ (cán bộ xã chọn khi nhập hồ sơ; quản trị viên quản lý)")
    @GetMapping
    public List<StreetDto> catalog(@AuthenticationPrincipal CurrentUser actor) {
        return streets.catalog(actor).stream().map(StreetDto::of).toList();
    }

    @Operation(summary = "Gợi ý đường theo từ khóa (cả tên cũ): danh mục trước, Goong chỉ bổ sung tham khảo (cán bộ xã)")
    @GetMapping("/suggest")
    public SuggestDto suggest(@RequestParam String q, @AuthenticationPrincipal CurrentUser actor) {
        StreetService.Suggestions r = streets.suggest(q, actor);
        return new SuggestDto(r.streets().stream().map(s -> new StreetRefDto(s.getId(), s.getDisplayName(), s.getKind())).toList(),
                r.external().stream().map(e -> new ExternalStreetDto(e.placeId(), e.name(), e.secondary())).toList(),
                r.goongStatus());
    }

    @Operation(summary = "Thêm đường hoặc hẻm vào danh mục (quản trị viên, có nhật ký)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StreetDto create(@Valid @RequestBody CreateStreetRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return StreetDto.of(streets.create(new StreetCommand(req.name(), req.kind(), req.parentId(), req.areaIds(), null, null), actor));
    }

    @Operation(summary = "Sửa/đổi tên (giữ tên cũ kèm văn bản), đổi ấp, ngừng dùng đường/hẻm (quản trị viên, có nhật ký)")
    @PutMapping("/{id}")
    public StreetDto update(@PathVariable Long id, @Valid @RequestBody UpdateStreetRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return StreetDto.of(streets.update(id,
                new StreetCommand(req.name(), null, null, req.areaIds(), req.status(), req.renameNote()), actor));
    }

    @Operation(summary = "Hồ sơ chưa gắn đường (địa chỉ cũ, chờ xác minh), gộp theo tên đường đã ghi (quản trị viên)")
    @GetMapping("/pending")
    public List<PendingGroupDto> pending(@AuthenticationPrincipal CurrentUser actor) {
        return streets.pendingGroups(actor).stream().map(g -> new PendingGroupDto(g.key(), g.name(), g.subjectCount(),
                g.pendingCount(), g.areaNames(), g.sampleCodes())).toList();
    }

    @Operation(summary = "Gắn mọi hồ sơ của một nhóm chờ vào một đường/hẻm trong danh mục (quản trị viên)")
    @PostMapping("/pending/link")
    public CountDto linkGroup(@Valid @RequestBody LinkGroupRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return new CountDto(streets.linkGroup(req.key(), req.streetId(), actor));
    }

    @Operation(summary = "Tự gắn hồ sơ có tên đường khớp đúng một đường/hẻm trong danh mục (quản trị viên)")
    @PostMapping("/auto-match")
    public MatchResultDto autoMatch(@AuthenticationPrincipal CurrentUser actor) {
        StreetService.MatchResult r = streets.autoMatch(actor);
        return new MatchResultDto(r.matched(), r.remaining());
    }

    @Operation(summary = "Tải file Excel mẫu nhập danh mục đường (quản trị viên)")
    @GetMapping("/import-template")
    public ResponseEntity<byte[]> importTemplate(@AuthenticationPrincipal CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("mau-danh-muc-duong.xlsx", StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(importer.template());
    }

    @Operation(summary = "Xem trước file nhập danh mục đường: từng dòng kèm việc sẽ làm và lỗi, chưa ghi gì (quản trị viên)")
    @PostMapping(value = "/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportPreviewDto previewImport(@RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CurrentUser actor) throws IOException {
        return ImportPreviewDto.of(importer.preview(file.getInputStream(), actor));
    }

    @Operation(summary = "Nhập danh mục đường từ Excel: ghi tất cả hoặc không gì (quản trị viên)")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportPreviewDto importStreets(@RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CurrentUser actor) throws IOException {
        return ImportPreviewDto.of(importer.commit(file.getInputStream(), actor));
    }
}
