package vn.dongthanh.vsmt.masterdata.api;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.api.SubjectDtos.ContractDto;
import vn.dongthanh.vsmt.masterdata.api.SubjectDtos.ContractRequest;
import vn.dongthanh.vsmt.masterdata.api.SubjectDtos.EndSubjectRequest;
import vn.dongthanh.vsmt.masterdata.api.SubjectDtos.SubjectDto;
import vn.dongthanh.vsmt.masterdata.api.SubjectDtos.SubjectPageDto;
import vn.dongthanh.vsmt.masterdata.api.SubjectDtos.SubjectRequest;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.service.SubjectMemberHistory;
import vn.dongthanh.vsmt.masterdata.service.SubjectImportService;
import vn.dongthanh.vsmt.masterdata.service.SubjectImportService.ImportPreview;
import vn.dongthanh.vsmt.masterdata.service.SubjectService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.SubjectFilter;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: hồ sơ hộ (đối tượng + hợp đồng)")
@RestController
@RequestMapping("/api/masterdata")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjects;
    private final SubjectMemberHistory memberHistory;
    private final SubjectImportService importer;

    @Operation(summary = "Tìm hồ sơ hộ (mã, tên, SĐT, địa chỉ); công ty chỉ thấy hộ thuộc khu vực của mình")
    @GetMapping("/subjects")
    public SubjectPageDto search(@RequestParam(required = false) Long districtId,
            @RequestParam(required = false) Long areaId, @RequestParam(required = false) SubjectStatus status,
            @RequestParam(required = false) SubjectType subjectType,
            @RequestParam(required = false) String q, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(200) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<ServiceSubject> result = subjects.search(new SubjectFilter(districtId, areaId, status, subjectType, q),
                PageRequest.of(page, size, Sort.by("code")), actor);
        Map<Long, List<ServiceContract>> contracts = subjects.contractsOf(
                result.getContent().stream().map(ServiceSubject::getId).toList());
        return new SubjectPageDto(result.getContent().stream().map(s -> SubjectDto.of(s, contracts.get(s.getId())))
                .toList(), result.getTotalElements(), page, size);
    }

    @Operation(summary = "Chi tiết hồ sơ hộ")
    @GetMapping("/subjects/{id}")
    public SubjectDto get(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return toDto(subjects.get(id, actor));
    }

    public record MemberChangeDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime at,
            @Schema(requiredMode = RequiredMode.REQUIRED) String by,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true, description = "Số người trước đó; null khi tạo hồ sơ") Integer from,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Integer to) {
    }

    @Operation(summary = "Lịch sử thay đổi số nhân khẩu của hộ, mới nhất trước")
    @GetMapping("/subjects/{id}/member-history")
    public List<MemberChangeDto> memberHistory(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        ServiceSubject s = subjects.get(id, actor);
        return memberHistory.of(s.getCode()).stream().map(c -> new MemberChangeDto(c.at(), c.by(), c.from(), c.to())).toList();
    }

    public record ImportRowDto(
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số dòng trong file Excel") int rowNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) String type,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String houseNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) String street,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Integer memberCount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Rỗng khi dòng hợp lệ") List<String> errors) {
    }

    public record ImportPreviewDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) List<ImportRowDto> rows,
            @Schema(requiredMode = RequiredMode.REQUIRED) int valid,
            @Schema(requiredMode = RequiredMode.REQUIRED) int invalid) {

        static ImportPreviewDto of(ImportPreview p) {
            return new ImportPreviewDto(p.rows().stream().map(r -> new ImportRowDto(r.rowNo(), r.type(), r.name(),
                    r.houseNo(), r.street(), r.areaCode(), r.phone(), r.memberCount(), r.errors())).toList(),
                    p.valid(), p.invalid());
        }
    }

    public record ImportResultDto(@Schema(requiredMode = RequiredMode.REQUIRED) int created) {
    }

    @Operation(summary = "Tải file Excel mẫu để nhập hộ hàng loạt (cán bộ xã)")
    @GetMapping("/subjects/import-template")
    public ResponseEntity<byte[]> importTemplate(@AuthenticationPrincipal CurrentUser actor) {
        actor.requireRole(vn.dongthanh.vsmt.platform.domain.Role.COMMUNE_OFFICER);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("mau-nhap-ho.xlsx", StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(importer.template());
    }

    @Operation(summary = "Xem trước file Excel nhập hộ: từng dòng kèm lỗi, chưa ghi gì (cán bộ xã)")
    @PostMapping(value = "/subjects/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportPreviewDto previewImport(@RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CurrentUser actor) throws IOException {
        return ImportPreviewDto.of(importer.preview(file.getInputStream(), actor));
    }

    @Operation(summary = "Nhập hộ từ file Excel: ghi tất cả hoặc không gì; còn dòng lỗi thì từ chối (cán bộ xã)")
    @PostMapping(value = "/subjects/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImportResultDto importSubjects(@RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CurrentUser actor) throws IOException {
        return new ImportResultDto(importer.commit(file.getInputStream(), actor));
    }

    @Operation(summary = "Tạo hồ sơ hộ, kèm hợp đồng đầu tiên nếu có (cán bộ xã)")
    @PostMapping("/subjects")
    @ResponseStatus(HttpStatus.CREATED)
    public SubjectDto create(@Valid @RequestBody SubjectRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return toDto(subjects.create(req.toCommand(), req.contract() == null ? null : req.contract().toCommand(), actor));
    }

    @Operation(summary = "Sửa thông tin đối tượng (cán bộ xã); hợp đồng sửa qua /contracts/{id}")
    @PutMapping("/subjects/{id}")
    public SubjectDto update(@PathVariable Long id, @Valid @RequestBody SubjectRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return toDto(subjects.update(id, req.toCommand(), actor));
    }

    @Operation(summary = "Ngừng cung cấp dịch vụ: đối tượng Đã chấm dứt, hợp đồng đang hiệu lực kết thúc")
    @PostMapping("/subjects/{id}/end")
    public SubjectDto end(@PathVariable Long id, @Valid @RequestBody EndSubjectRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return toDto(subjects.end(id, req.endDate(), req.reason(), actor));
    }

    @Operation(summary = "Thêm hợp đồng cho đối tượng (không được chồng hiệu lực với hợp đồng khác)")
    @PostMapping("/subjects/{id}/contracts")
    @ResponseStatus(HttpStatus.CREATED)
    public ContractDto addContract(@PathVariable Long id, @Valid @RequestBody ContractRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return ContractDto.of(subjects.addContract(id, req.toCommand(), actor));
    }

    @Operation(summary = "Sửa hợp đồng: nhóm giá, hiệu lực, miễn 100%")
    @PutMapping("/contracts/{id}")
    public ContractDto updateContract(@PathVariable Long id, @Valid @RequestBody ContractRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return ContractDto.of(subjects.updateContract(id, req.toCommand(), actor));
    }

    private SubjectDto toDto(ServiceSubject s) {
        return SubjectDto.of(s, subjects.contractsOf(s.getId()));
    }
}
