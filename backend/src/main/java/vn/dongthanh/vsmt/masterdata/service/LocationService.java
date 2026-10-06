package vn.dongthanh.vsmt.masterdata.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

@Service
@RequiredArgsConstructor
@Transactional
public class LocationService {
    private final DistrictRepository districts;
    private final AreaRepository areas;
    private final AuditService audit;

    public District updateDistrict(Long id, String name, String note, Integer sortOrder, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        District district = districts.findById(id)
                .orElseThrow(() -> new NotFoundException("DISTRICT_NOT_FOUND", "Không tìm thấy địa bàn."));
        Map<String, Object> before = snapshot(district);
        district.setName(name.trim());
        district.setNote(note == null || note.isBlank() ? null : note.trim());
        district.setSortOrder(sortOrder);
        audit.record(actor, "UPDATE_DISTRICT", "District", district.getCode(), before, snapshot(district));
        return district;
    }

    public Area updateArea(Long id, String name, ActiveStatus status, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Area area = areas.findByIdWithDistrict(id)
                .orElseThrow(() -> new NotFoundException("AREA_NOT_FOUND", "Không tìm thấy khu vực."));
        Map<String, Object> before = Map.of("name", area.getName(), "status", area.getStatus());
        area.setName(name.trim());
        area.setStatus(status);
        audit.record(actor, "UPDATE_AREA", "Area", area.getCode(), before,
                Map.of("name", area.getName(), "status", area.getStatus()));
        return area;
    }

    private static Map<String, Object> snapshot(District district) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("name", district.getName());
        values.put("note", district.getNote());
        values.put("sortOrder", district.getSortOrder());
        return values;
    }
}
