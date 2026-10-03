package vn.dongthanh.vsmt.masterdata.api;

import java.util.List;

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
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.AreaDto;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.AreaRequest;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.DistrictRequest;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.CollectionScheduleDto;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.CompanyDto;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.CompanyRequest;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.DistrictDto;
import vn.dongthanh.vsmt.masterdata.service.CompanyService;
import vn.dongthanh.vsmt.masterdata.service.LocationService;
import vn.dongthanh.vsmt.masterdata.service.MasterDataQueryService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: địa bàn, khu vực, công ty")
@RestController
@RequestMapping("/api/masterdata")
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterDataQueryService query;
    private final CompanyService companies;
    private final LocationService locations;

    @Operation(summary = "Sửa địa bàn (quản trị)")
    @PutMapping("/districts/{id}")
    public DistrictDto updateDistrict(@PathVariable Long id, @Valid @RequestBody DistrictRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return DistrictDto.of(locations.updateDistrict(id, req.name(), req.note(), req.sortOrder(), actor));
    }

    @Operation(summary = "Sửa tên và trạng thái khu vực (quản trị)")
    @PutMapping("/areas/{id}")
    public AreaDto updateArea(@PathVariable Long id, @Valid @RequestBody AreaRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        var area = locations.updateArea(id, req.name(), req.status(), actor);
        return AreaDto.of(area, query.subjectCountByArea().getOrDefault(id, 0L));
    }

    @Operation(summary = "Danh sách địa bàn")
    @GetMapping("/districts")
    public List<DistrictDto> districts() {
        return query.districts().stream().map(DistrictDto::of).toList();
    }

    @Operation(summary = "Danh sách khu vực / tổ dân phố, lọc theo địa bàn nếu có")
    @GetMapping("/areas")
    public List<AreaDto> areas(@RequestParam(required = false) Long districtId) {
        var counts = query.subjectCountByArea();
        return query.areas(districtId).stream().map(a -> AreaDto.of(a, counts.getOrDefault(a.getId(), 0L))).toList();
    }

    @Operation(summary = "Lịch thu gom của khu vực")
    @GetMapping("/areas/{id}/schedules")
    public List<CollectionScheduleDto> schedules(@PathVariable Long id) {
        return query.schedulesOf(id).stream().map(CollectionScheduleDto::of).toList();
    }

    @Operation(summary = "Danh sách công ty (công ty chỉ thấy công ty của mình)")
    @GetMapping("/companies")
    public List<CompanyDto> companies(@AuthenticationPrincipal CurrentUser actor) {
        return query.companies(actor).stream().map(CompanyDto::of).toList();
    }

    @Operation(summary = "Chi tiết công ty (công ty khác trả 404)")
    @GetMapping("/companies/{id}")
    public CompanyDto company(@AuthenticationPrincipal CurrentUser actor, @PathVariable Long id) {
        return CompanyDto.of(query.company(actor, id));
    }

    @Operation(summary = "Thêm công ty (quản trị); mã DVnn tự sinh")
    @PostMapping("/companies")
    @ResponseStatus(HttpStatus.CREATED)
    public CompanyDto createCompany(@Valid @RequestBody CompanyRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return CompanyDto.of(companies.create(req.toCommand(), actor));
    }

    @Operation(summary = "Sửa thông tin công ty (cán bộ xã, quản trị)")
    @PutMapping("/companies/{id}")
    public CompanyDto updateCompany(@PathVariable Long id, @Valid @RequestBody CompanyRequest req,
            @AuthenticationPrincipal CurrentUser actor) {
        return CompanyDto.of(companies.update(id, req.toCommand(), actor));
    }
}
