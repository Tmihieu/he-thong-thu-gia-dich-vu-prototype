package vn.dongthanh.vsmt.masterdata.service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.AddressText;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Danh mục đường chuẩn theo xã/phường. Chỉ cán bộ xã tra cứu và bổ sung; mọi lần bổ sung đều có nhật ký. */
@Service
@RequiredArgsConstructor
@Transactional
public class StreetService {

    static final int CATALOG_LIMIT = 10;
    static final int GOONG_LIMIT = 5;
    /** Chỉ hỏi Goong khi danh mục nội bộ chưa đủ gợi ý, để tiết kiệm hạn mức. */
    private static final int GOONG_WHEN_FEWER_THAN = 3;

    private final StreetRepository streets;
    private final DistrictRepository districts;
    private final GoongClient goong;
    private final AuditService audit;

    public record Suggestions(List<Street> streets, List<GoongClient.Suggestion> external,
            GoongClient.Status goongStatus) {
    }

    @Transactional(readOnly = true)
    public Suggestions suggest(String q, Long districtId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        String raw = q == null ? "" : q.trim();
        // %, _ là ký tự đại diện của LIKE: bỏ khỏi từ khóa thay vì cho khớp mọi thứ.
        String key = AddressText.streetKey(raw).replaceAll("[%_\\\\]", "");
        if (key.length() < 2) {
            return new Suggestions(List.of(), List.of(), GoongClient.Status.OK);
        }
        List<Street> found = streets.search(key, districtId, PageRequest.of(0, CATALOG_LIMIT));
        if (raw.length() < 3 || found.size() >= GOONG_WHEN_FEWER_THAN) {
            return new Suggestions(found, List.of(), GoongClient.Status.OK);
        }
        String where = districtId == null ? "" : districts.findById(districtId).map(d -> " " + d.getName()).orElse("");
        GoongClient.Result r = goong.autocomplete(raw + where, GOONG_LIMIT);
        List<String> known = found.stream().map(Street::getNameKey).toList();
        // Chỉ nhận đường trong xã: địa chỉ phụ Goong phải nêu một trong các địa bàn (xã cũ đã gộp vào Đông Thạnh).
        List<String> communes = districts.findAll().stream().map(d -> d.getName().toLowerCase(Locale.ROOT)).toList();
        List<GoongClient.Suggestion> external = r.items().stream()
                .filter(s -> communes.stream().anyMatch(s.secondary().toLowerCase(Locale.ROOT)::contains))
                .filter(s -> !known.contains(AddressText.streetKey(s.name()))).toList();
        return new Suggestions(found, external, r.status());
    }

    public Street create(Long districtId, String name, String goongPlaceId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        District district = districts.findById(districtId)
                .orElseThrow(() -> new NotFoundException("DISTRICT_NOT_FOUND", "Không tìm thấy xã/phường."));
        String key = AddressText.streetKey(name);
        if (key.isEmpty()) {
            throw new BusinessRuleException("STREET_NAME_REQUIRED", "Tên đường không được để trống.");
        }
        if (streets.existsByDistrictIdAndNameKey(districtId, key)) {
            throw new ConflictException("STREET_EXISTS", "Đường này đã có trong danh mục của " + district.getName() + ".");
        }
        String place = goongPlaceId == null || goongPlaceId.isBlank() ? null : goongPlaceId.trim();
        Street saved = streets.save(Street.create(district, name, place));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("streetId", saved.getId());
        after.put("name", saved.getName());
        after.put("district", district.getCode());
        after.put("goongLinked", place != null);
        audit.record(actor, "CREATE_STREET", "Street", saved.getId(), null, after);
        return saved;
    }
}
