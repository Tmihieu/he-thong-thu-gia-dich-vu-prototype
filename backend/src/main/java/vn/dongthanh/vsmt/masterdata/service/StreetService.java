package vn.dongthanh.vsmt.masterdata.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.AddressText;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetOldName;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.ConflictException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Danh mục đường/hẻm chuẩn của xã. Cán bộ xã tra cứu và chọn khi nhập hồ sơ; chỉ quản trị viên (người của xã) thêm,
 * sửa, đổi tên, ngừng dùng và gắn hồ sơ chờ xác minh vào đường. Mọi thay đổi đều có nhật ký.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StreetService {

    static final int CATALOG_LIMIT = 10;

    private final StreetRepository streets;
    private final AreaRepository areas;
    private final ServiceSubjectRepository subjects;
    private final AuditService audit;

    /** Thêm/sửa đường hoặc hẻm. {@code parentId} chỉ dùng khi thêm hẻm; {@code renameNote} là văn bản đổi tên. */
    public record StreetCommand(String name, Street.Kind kind, Long parentId, Set<Long> areaIds, ActiveStatus status,
            String renameNote) {
    }

    /** Một nhóm hồ sơ chưa gắn đường, gộp theo tên đường cán bộ đã ghi. */
    public record PendingGroup(String key, String name, int subjectCount, int pendingCount, List<String> areaNames,
            List<String> sampleCodes) {
    }

    public record MatchResult(int matched, int remaining) {
    }

    @Transactional(readOnly = true)
    public List<Street> catalog(CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN);
        return streets.findAllForCatalog().stream()
                .sorted(Comparator.comparing(Street::getKind).thenComparing(s -> AddressText.streetKey(s.getDisplayName())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<Street> suggest(String q, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        String raw = q == null ? "" : q.trim();
        // %, _ là ký tự đại diện của LIKE: bỏ khỏi từ khóa thay vì cho khớp mọi thứ.
        String key = AddressText.streetKey(raw).replaceAll("[%_\\\\]", "");
        if (key.length() < 2) {
            return List.of();
        }
        return streets.search(key, PageRequest.of(0, CATALOG_LIMIT));
    }

    public Street create(StreetCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Street.Kind kind = cmd.kind() == null ? Street.Kind.STREET : cmd.kind();
        Street parent = null;
        String name = requireName(cmd.name());
        if (kind == Street.Kind.ALLEY) {
            if (cmd.parentId() == null) {
                throw new BusinessRuleException("ALLEY_PARENT_REQUIRED", "Hẻm phải chọn đường mà hẻm nằm trên.");
            }
            parent = streets.findByIdWithParent(cmd.parentId())
                    .orElseThrow(() -> new NotFoundException("STREET_NOT_FOUND", "Không tìm thấy đường."));
            if (parent.getKind() != Street.Kind.STREET) {
                throw new BusinessRuleException("ALLEY_PARENT_NOT_STREET", "Hẻm phải nằm trên một đường, không nằm trên hẻm.");
            }
            name = shortAlleyName(name, parent);
        }
        Long parentId = parent == null ? null : parent.getId();
        if (streets.findByParentAndNameKey(parentId, AddressText.streetKey(name)).isPresent()) {
            throw new ConflictException("STREET_EXISTS", (parent == null ? "Đường " : "Hẻm ") + name + " đã có trong danh mục.");
        }
        rejectOldNameOfAnother(parentId, AddressText.streetKey(name), null);
        Street street = parent == null ? Street.street(name) : Street.alley(parent, name);
        street.setAreaIds(checkedAreas(cmd.areaIds()));
        Street saved = streets.save(street);
        audit.record(actor, "CREATE_STREET", "Street", saved.getId(), null, snapshot(saved));
        return saved;
    }

    public Street update(Long id, StreetCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Street street = streets.findByIdWithParent(id)
                .orElseThrow(() -> new NotFoundException("STREET_NOT_FOUND", "Không tìm thấy đường."));
        Map<String, Object> before = snapshot(street);
        String name = requireName(cmd.name());
        if (street.getParent() != null) {
            name = shortAlleyName(name, street.getParent());
        }
        String key = AddressText.streetKey(name);
        Long parentId = street.getParent() == null ? null : street.getParent().getId();
        streets.findByParentAndNameKey(parentId, key).filter(other -> !other.getId().equals(id)).ifPresent(other -> {
            throw new ConflictException("STREET_EXISTS", "Đã có " + other.getDisplayName() + " trong danh mục.");
        });
        rejectOldNameOfAnother(parentId, key, id);
        boolean renamed = !name.equals(street.getName());
        if (!key.equals(street.getNameKey())) {
            street.rename(name, cmd.renameNote());
        } else if (renamed) {
            street.rename(name, null); // chỉ sửa chữ hoa/khoảng trắng: tên cũ trùng khóa nên không lưu thành tên cũ
        }
        if (cmd.areaIds() != null) {
            street.setAreaIds(checkedAreas(cmd.areaIds()));
        }
        if (cmd.status() != null) {
            street.setStatus(cmd.status());
        }
        if (renamed) {
            // Hồ sơ của đường và các hẻm của nó hiển thị theo tên mới.
            subjects.findOnStreetsOrTheirAlleys(List.of(street.getId())).forEach(ServiceSubject::refreshStreetName);
        }
        audit.record(actor, "UPDATE_STREET", "Street", street.getId(), before, snapshot(street));
        return street;
    }

    /** Gắn mọi hồ sơ chưa chuẩn hóa có tên đường khớp đúng một đường/hẻm (theo tên, tên cũ, tên hiển thị). */
    public MatchResult autoMatch(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        CatalogIndex index = index();
        List<ServiceSubject> unlinked = subjects.findWithoutCatalogStreet();
        List<Map<String, Object>> linked = new ArrayList<>();
        for (ServiceSubject s : unlinked) {
            Optional<Street> street = index.match(s.getStreet());
            if (street.isPresent()) {
                linked.add(Map.of("code", s.getCode(), "street", s.getStreet(), "address", s.getAddress(), "streetId", street.get().getId()));
                s.linkStreet(street.get());
            }
        }
        int matched = linked.size();
        // Giữ chữ cán bộ đã ghi để đối chiếu/khôi phục nếu khớp nhầm.
        audit.record(actor, "AUTO_MATCH_STREETS", "Street", null, null,
                Map.of("matched", matched, "remaining", unlinked.size() - matched, "subjects", linked));
        return new MatchResult(matched, unlinked.size() - matched);
    }

    /** Hồ sơ chưa gắn đường, gộp theo tên đường đã ghi: nhóm có hồ sơ chờ xác minh trước, nhiều hộ trước. */
    @Transactional(readOnly = true)
    public List<PendingGroup> pendingGroups(CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Map<String, List<ServiceSubject>> byKey = subjects.findWithoutCatalogStreet().stream()
                .collect(Collectors.groupingBy(s -> matchKey(s.getStreet()), LinkedHashMap::new, Collectors.toList()));
        return byKey.entrySet().stream().map(e -> {
            List<ServiceSubject> list = e.getValue();
            String name = list.stream().collect(Collectors.groupingBy(ServiceSubject::getStreet, Collectors.counting()))
                    .entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("");
            int pending = (int) list.stream().filter(ServiceSubject::isStreetPending).count();
            List<String> areaNames = List.copyOf(list.stream().map(s -> s.getArea().getName())
                    .collect(Collectors.toCollection(TreeSet::new)));
            return new PendingGroup(e.getKey(), name, list.size(), pending, areaNames,
                    list.stream().map(ServiceSubject::getCode).limit(5).toList());
        }).sorted(Comparator.comparing((PendingGroup g) -> g.pendingCount() == 0)
                .thenComparing(Comparator.comparingInt(PendingGroup::subjectCount).reversed())
                .thenComparing(PendingGroup::name)).toList();
    }

    /** Gắn mọi hồ sơ chưa chuẩn hóa của một nhóm ({@link PendingGroup#key}) vào một đường/hẻm đang dùng. */
    public int linkGroup(String key, Long streetId, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Street street = streets.findByIdWithParent(streetId)
                .orElseThrow(() -> new NotFoundException("STREET_NOT_FOUND", "Không tìm thấy đường."));
        if (!usable(street)) {
            throw new BusinessRuleException("STREET_INACTIVE", street.getDisplayName() + " đã ngừng dùng trong danh mục.");
        }
        List<ServiceSubject> group = subjects.findWithoutCatalogStreet().stream()
                .filter(s -> matchKey(s.getStreet()).equals(key)).toList();
        List<Map<String, Object>> before = group.stream()
                .map(s -> Map.<String, Object>of("code", s.getCode(), "street", s.getStreet(), "address", s.getAddress())).toList();
        group.forEach(s -> s.linkStreet(street));
        audit.record(actor, "LINK_STREET_GROUP", "Street", street.getId(), Map.of("subjects", before),
                Map.of("street", street.getDisplayName()));
        return group.size();
    }

    /** Chỉ mục khớp tên của toàn bộ đường/hẻm đang dùng; dựng một lần cho cả lô (nhập file, tự khớp). */
    @Transactional(readOnly = true)
    public CatalogIndex index() {
        return new CatalogIndex(streets.findAllForCatalog().stream().filter(StreetService::usable).toList());
    }

    /** Đang dùng, và nếu là hẻm thì đường của nó cũng đang dùng. */
    static boolean usable(Street s) {
        return s.getStatus() == ActiveStatus.ACTIVE && (s.getParent() == null || s.getParent().getStatus() == ActiveStatus.ACTIVE);
    }

    /** Khớp tên đường tự do với danh mục: chỉ nhận khi đúng một đường/hẻm khớp. */
    public static final class CatalogIndex {
        private final Map<String, Set<Street>> byKey = new HashMap<>();

        public CatalogIndex(Collection<Street> catalog) {
            for (Street s : catalog) {
                for (String own : namesOf(s)) {
                    if (s.getParent() == null) {
                        put(own, s);
                    } else {
                        for (String parent : namesOf(s.getParent())) {
                            put(own + " " + parent, s);
                        }
                    }
                }
            }
        }

        public Optional<Street> match(String text) {
            Set<Street> found = byKey.getOrDefault(matchKey(text), Set.of());
            return found.size() == 1 ? Optional.of(found.iterator().next()) : Optional.empty();
        }

        private void put(String name, Street s) {
            byKey.computeIfAbsent(matchKey(name), k -> new HashSet<>()).add(s);
        }

        private static List<String> namesOf(Street s) {
            List<String> names = new ArrayList<>(List.of(s.getName()));
            s.getOldNames().stream().map(StreetOldName::getName).forEach(names::add);
            return names;
        }
    }

    /** Khóa so khớp: như {@link AddressText#streetKey} và bỏ chữ "đường" trước tên đường ("Hẻm 69 đường Nguyễn Thị Pha"). */
    static String matchKey(String text) {
        return AddressText.streetKey(text).replaceAll(" duong (?=\\S)", " ");
    }

    /** "Hẻm 19 Tô Ký" trên đường Tô Ký → "Hẻm 19"; tên không kết thúc bằng tên đường (kể cả tên cũ) giữ nguyên. */
    static String shortAlleyName(String name, Street parent) {
        Set<String> parentKeys = new HashSet<>();
        parentKeys.add(matchKey(parent.getName()));
        parent.getOldNames().forEach(o -> parentKeys.add(matchKey(o.getName())));
        return shortAlleyName(name, parentKeys);
    }

    /** Như trên, với tên đường cha cho sẵn dạng {@link #matchKey}. */
    static String shortAlleyName(String name, Set<String> parentKeys) {
        String[] words = name.trim().split("\\s+");
        for (int i = 1; i < words.length; i++) {
            String suffix = String.join(" ", Arrays.copyOfRange(words, i, words.length));
            if (parentKeys.contains(matchKey(suffix))) {
                // "Hẻm 69 đường Nguyễn Thị Pha": bỏ cả chữ "đường" thừa ở cuối phần còn lại.
                return String.join(" ", Arrays.copyOfRange(words, 0, i)).replaceAll("(?iu)\\s+(đường|duong)$", "");
            }
        }
        return name.trim();
    }

    /** Tên trùng tên cũ của một đường/hẻm khác cùng cấp thì tự khớp địa chỉ cũ không phân biệt được: chặn. */
    private void rejectOldNameOfAnother(Long parentId, String key, Long selfId) {
        streets.findAllForCatalog().stream()
                .filter(s -> !s.getId().equals(selfId) && java.util.Objects.equals(parentId, s.getParent() == null ? null : s.getParent().getId()))
                .filter(s -> s.getOldNames().stream().anyMatch(o -> o.getNameKey().equals(key)))
                .findFirst().ifPresent(s -> {
                    throw new ConflictException("STREET_OLD_NAME_TAKEN", "Đây là tên cũ của " + s.getDisplayName() + ".");
                });
    }

    private static String requireName(String name) {
        if (name == null || AddressText.streetKey(name).isEmpty()) {
            throw new BusinessRuleException("STREET_NAME_REQUIRED", "Tên đường/hẻm không được để trống.");
        }
        return name.trim().replaceAll("\\s+", " ");
    }

    private Set<Long> checkedAreas(Set<Long> ids) {
        Set<Long> wanted = ids == null ? Set.of() : ids;
        Set<Long> found = areas.findAllById(wanted).stream().map(Area::getId).collect(Collectors.toSet());
        if (!found.containsAll(wanted)) {
            throw new NotFoundException("AREA_NOT_FOUND", "Có ấp không tồn tại trong hệ thống.");
        }
        return wanted;
    }

    private static Map<String, Object> snapshot(Street s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", s.getDisplayName());
        m.put("kind", s.getKind());
        m.put("status", s.getStatus());
        m.put("areaIds", new TreeSet<>(s.getAreaIds()));
        m.put("oldNames", s.getOldNames().stream().map(StreetOldName::getName).toList());
        return m;
    }
}
