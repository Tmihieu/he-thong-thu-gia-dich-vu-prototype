package vn.dongthanh.vsmt.masterdata.api;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
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
import vn.dongthanh.vsmt.masterdata.service.SubjectService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.SubjectFilter;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: hồ sơ hộ (đối tượng + hợp đồng)")
@RestController
@RequestMapping("/api/masterdata")
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjects;

    @Operation(summary = "Tìm hồ sơ hộ (mã, tên, SĐT, địa chỉ); công ty chỉ thấy hộ thuộc khu vực của mình")
    @GetMapping("/subjects")
    public SubjectPageDto search(@RequestParam(required = false) Long districtId,
            @RequestParam(required = false) Long areaId, @RequestParam(required = false) SubjectStatus status,
            @RequestParam(required = false) String q, @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(200) int size, @AuthenticationPrincipal CurrentUser actor) {
        Page<ServiceSubject> result = subjects.search(new SubjectFilter(districtId, areaId, status, q),
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
