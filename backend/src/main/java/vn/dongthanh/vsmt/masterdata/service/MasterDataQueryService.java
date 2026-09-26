package vn.dongthanh.vsmt.masterdata.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Đọc danh mục địa bàn, khu vực, công ty. Quản lý công ty và người đi thu chỉ thấy công ty của mình;
 * công ty khác trả 404 để không lộ sự tồn tại. Cán bộ xã và quản trị thấy tất cả.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MasterDataQueryService {

    private final DistrictRepository districts;
    private final AreaRepository areas;
    private final CompanyRepository companies;
    private final ServiceSubjectRepository subjects;

    public List<District> districts() {
        return districts.findAllByOrderBySortOrderAscCodeAsc();
    }

    public List<Area> areas(Long districtId) {
        return areas.findAllWithDistrict(districtId);
    }

    /** Số đối tượng chưa chấm dứt theo khu vực. */
    public Map<Long, Long> subjectCountByArea() {
        Map<Long, Long> counts = new HashMap<>();
        subjects.countActiveByArea().forEach(row -> counts.put((Long) row[0], (Long) row[1]));
        return counts;
    }

    public List<Company> companies(CurrentUser actor) {
        if (actor.role().belongsToCompany()) {
            return companies.findById(actor.companyId()).map(List::of).orElse(List.of());
        }
        return companies.findAllByOrderByCodeAsc();
    }

    public Company company(CurrentUser actor, Long id) {
        if (actor.role().belongsToCompany() && !Objects.equals(actor.companyId(), id)) {
            throw companyNotFound();
        }
        return companies.findById(id).orElseThrow(MasterDataQueryService::companyNotFound);
    }

    private static NotFoundException companyNotFound() {
        return new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty.");
    }
}
