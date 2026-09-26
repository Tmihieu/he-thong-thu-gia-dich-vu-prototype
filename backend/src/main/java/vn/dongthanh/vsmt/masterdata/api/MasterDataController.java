package vn.dongthanh.vsmt.masterdata.api;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.AreaDto;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.CompanyDto;
import vn.dongthanh.vsmt.masterdata.api.MasterDataDtos.DistrictDto;
import vn.dongthanh.vsmt.masterdata.service.MasterDataQueryService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: địa bàn, khu vực, công ty")
@RestController
@RequestMapping("/api/masterdata")
@RequiredArgsConstructor
public class MasterDataController {

    private final MasterDataQueryService query;

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
}
