package vn.dongthanh.vsmt.masterdata.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.AddressText;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetOldName;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/**
 * Nhập danh mục đường/hẻm từ Excel (quản trị viên): xem trước từng dòng, ghi tất cả hoặc không gì.
 * Nhận cả file nháp xã đã duyệt (scripts/osm_duong_dong_thanh.py): cột nhận theo tiêu đề, dòng xã ghi "Bỏ" và dòng
 * cầu bị bỏ qua, có "Tên mới" thì dùng tên mới và giữ tên kia làm tên cũ. Dòng trùng tên được gộp (vd. hai đường
 * cũ cùng đổi thành một tên mới). Đường đã có thì bổ sung ấp và tên cũ; trùng tên cũ thì đổi tên đường đó.
 */
@Service
@RequiredArgsConstructor
public class StreetImportService {

    public static final int MAX_ROWS = 5000;
    private static final Pattern NUMBER = Pattern.compile("\\d+");

    static final String ADD = "Thêm";
    static final String UPDATE = "Cập nhật";
    static final String RENAME = "Đổi tên";
    static final String MERGE = "Gộp";
    static final String SKIP = "Bỏ qua";

    private final StreetRepository streets;
    private final AreaRepository areas;
    private final ServiceSubjectRepository subjects;
    private final AuditService audit;

    /** Một dòng file sau khi đọc: {@code name} là tên sẽ dùng, {@code oldName} là tên cũ sẽ giữ lại. */
    public record ImportRow(int rowNo, String name, String kind, String parent, String areas, String oldName,
            String note, String action, List<String> errors) {

        public boolean ok() {
            return errors.isEmpty();
        }
    }

    public record ImportPreview(List<ImportRow> rows, int added, int updated, int skipped, int invalid) {
    }

    record RawRow(int rowNo, String name, String newName, String oldName, String kind, String parent, String areas,
            String decision, String note) {
    }

    @Transactional(readOnly = true)
    public ImportPreview preview(InputStream xlsx, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        return plan(parse(xlsx)).preview();
    }

    /** Ghi toàn bộ nếu mọi dòng hợp lệ; ngược lại không ghi gì. */
    @Transactional
    public ImportPreview commit(InputStream xlsx, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Plan plan = plan(parse(xlsx));
        ImportPreview preview = plan.preview();
        if (preview.invalid() > 0) {
            throw new BusinessRuleException("IMPORT_HAS_ERRORS",
                    "File còn " + preview.invalid() + " dòng lỗi, chưa nhập đường nào. Sửa file rồi tải lại.");
        }
        Set<Long> renamed = new HashSet<>();
        for (Planned p : plan.streets.values()) {
            p.entity = apply(p, null, renamed);
        }
        for (Planned p : plan.alleys.values()) {
            apply(p, p.parent.entity, renamed);
        }
        if (!renamed.isEmpty()) {
            // Đường đổi tên: hồ sơ của đường và các hẻm của nó hiển thị theo tên mới.
            Set<Long> ids = new HashSet<>(renamed);
            plan.alleys.values().stream().filter(a -> a.entity != null && renamed.contains(a.parent.entity.getId()))
                    .forEach(a -> ids.add(a.entity.getId()));
            subjects.findByStreetIds(ids).forEach(ServiceSubject::refreshStreetName);
        }
        audit.record(actor, "IMPORT_STREETS", "Street", null, null,
                Map.of("added", preview.added(), "updated", preview.updated(), "skipped", preview.skipped()));
        return preview;
    }

    private Street apply(Planned p, Street parent, Set<Long> renamed) {
        Street s = p.existing;
        if (s == null) {
            s = streets.save(parent == null ? Street.street(p.name) : Street.alley(parent, p.name));
        } else if (!AddressText.streetKey(p.name).equals(s.getNameKey())) {
            s.rename(p.name, p.note);
            renamed.add(s.getId());
        }
        Set<Long> ids = new HashSet<>(s.getAreaIds());
        p.areas.forEach(a -> ids.add(a.getId()));
        s.setAreaIds(ids);
        for (String[] old : p.oldNames) {
            s.addOldName(old[0], old[1]);
        }
        p.entity = s;
        return s;
    }

    /** File mẫu: dòng tiêu đề, hai dòng ví dụ và trang hướng dẫn. */
    public byte[] template() {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Danh sách đường");
            String[] head = { "Tên đường / hẻm", "Loại", "Thuộc đường (với hẻm)", "Ấp đi qua", "Tên mới", "Tên cũ",
                "Văn bản đổi tên", "Xã xác nhận (Đúng/Sửa/Bỏ)" };
            String[][] samples = {
                { "Đông Thạnh 8", "Đường", "", "Ấp 36, Ấp 44", "Nguyễn Thị Mực", "", "NQ 380/NQ-HĐND 24/7/2025", "Sửa" },
                { "Hẻm 19 Tô Ký", "Hẻm", "Tô Ký", "Ấp 1", "", "", "", "Đúng" } };
            Row h = sheet.createRow(0);
            for (int i = 0; i < head.length; i++) {
                h.createCell(i).setCellValue(head[i]);
                sheet.setColumnWidth(i, 7000);
            }
            for (int r = 0; r < samples.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int i = 0; i < samples[r].length; i++) {
                    row.createCell(i).setCellValue(samples[r][i]);
                }
            }
            Sheet help = wb.createSheet("Hướng dẫn");
            String[] lines = {
                "Mỗi dòng một đường hoặc hẻm. Xoá dòng ví dụ trước khi tải lên. Tối đa " + MAX_ROWS + " dòng.",
                "Loại: Đường hoặc Hẻm (dòng Cầu được bỏ qua). Hẻm phải ghi đường mà hẻm nằm trên ở cột 'Thuộc đường'.",
                "Ấp đi qua: các ấp cách nhau bằng dấu phẩy, vd. 'Ấp 1, Ấp 2'.",
                "Tên mới: điền khi đường đã đổi tên; tên ở cột đầu được giữ làm tên cũ (vẫn tìm được). Văn bản đổi tên ghi số văn bản.",
                "Xã xác nhận = Bỏ: dòng không nhập. Có thể tải lên trực tiếp file nháp danh mục đường xã đã duyệt.",
                "Đường đã có trong danh mục: bổ sung ấp và tên cũ, không tạo trùng.",
                "Nếu còn dòng lỗi, hệ thống không nhập đường nào; sửa file rồi tải lại." };
            for (int i = 0; i < lines.length; i++) {
                help.createRow(i).createCell(0).setCellValue(lines[i]);
            }
            help.setColumnWidth(0, 22000);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không tạo được file mẫu", e);
        }
    }

    List<RawRow> parse(InputStream xlsx) {
        try (Workbook wb = new XSSFWorkbook(xlsx)) {
            DataFormatter fmt = new DataFormatter();
            for (Sheet sheet : wb) {
                Map<String, Integer> cols = columns(sheet.getRow(0), fmt);
                if (!cols.containsKey("name") || !cols.containsKey("kind")) {
                    continue;
                }
                List<RawRow> rows = new ArrayList<>();
                for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row == null) {
                        continue;
                    }
                    Map<String, String> c = new HashMap<>();
                    cols.forEach((k, j) -> {
                        Cell cell = row.getCell(j);
                        c.put(k, cell == null ? "" : fmt.formatCellValue(cell).trim());
                    });
                    if (c.values().stream().allMatch(String::isEmpty)) {
                        continue;
                    }
                    if (rows.size() >= MAX_ROWS) {
                        throw new BusinessRuleException("IMPORT_TOO_MANY_ROWS", "File vượt quá " + MAX_ROWS + " dòng.");
                    }
                    rows.add(new RawRow(i + 1, c.get("name"), c.getOrDefault("newName", ""), c.getOrDefault("oldName", ""),
                            c.get("kind"), c.getOrDefault("parent", ""), c.getOrDefault("areas", ""),
                            c.getOrDefault("decision", ""), c.getOrDefault("note", "")));
                }
                if (rows.isEmpty()) {
                    throw new BusinessRuleException("IMPORT_EMPTY", "File không có dòng dữ liệu nào.");
                }
                return rows;
            }
            throw new BusinessRuleException("IMPORT_BAD_FILE", "Không thấy cột 'Tên đường / hẻm' và 'Loại'. Hãy dùng file theo mẫu.");
        } catch (IOException | RuntimeException e) {
            if (e instanceof BusinessRuleException b) {
                throw b;
            }
            throw new BusinessRuleException("IMPORT_BAD_FILE", "Không đọc được file. Hãy dùng file .xlsx theo mẫu.");
        }
    }

    /** Nhận cột theo tiêu đề (không phân biệt hoa thường), nên đọc được cả file mẫu lẫn file nháp có thêm cột. */
    private static Map<String, Integer> columns(Row head, DataFormatter fmt) {
        Map<String, Integer> cols = new HashMap<>();
        if (head == null) {
            return cols;
        }
        for (Cell cell : head) {
            String h = fmt.formatCellValue(cell).trim().toLowerCase(Locale.ROOT);
            String key = h.contains("tên mới") ? "newName"
                    : h.contains("tên cũ") ? "oldName"
                    : h.startsWith("tên") ? "name"
                    : h.equals("loại") ? "kind"
                    : h.startsWith("thuộc đường") ? "parent"
                    : h.startsWith("ấp") ? "areas"
                    : h.startsWith("xã xác nhận") ? "decision"
                    : h.startsWith("văn bản") ? "note"
                    : null;
            if (key != null) {
                cols.putIfAbsent(key, cell.getColumnIndex());
            }
        }
        return cols;
    }

    // ---- lập kế hoạch: gộp dòng trùng, tìm đường đã có, kiểm lỗi

    /** Một đường/hẻm sẽ ghi (gộp mọi dòng cùng tên). */
    static final class Planned {
        String name;
        Planned parent;
        Street existing;
        Street entity;
        final Set<Area> areas = new LinkedHashSet<>();
        /** {tên cũ, văn bản}. */
        final List<String[]> oldNames = new ArrayList<>();
        String note;

        Set<String> keys() {
            Set<String> keys = new HashSet<>(List.of(StreetService.matchKey(name)));
            oldNames.forEach(o -> keys.add(StreetService.matchKey(o[0])));
            if (existing != null) {
                keys.add(StreetService.matchKey(existing.getName()));
                existing.getOldNames().forEach(o -> keys.add(StreetService.matchKey(o.getName())));
            }
            return keys;
        }
    }

    final class Plan {
        final Map<String, Planned> streets = new LinkedHashMap<>();
        final Map<String, Planned> alleys = new LinkedHashMap<>();
        /** Đường cha đã có trong danh mục (chỉ làm cha, không ghi lại), theo id. */
        final Map<Long, Planned> catalogParents = new HashMap<>();
        final List<ImportRow> rows = new ArrayList<>();
        int added;
        int updated;

        ImportPreview preview() {
            int invalid = (int) rows.stream().filter(r -> !r.ok()).count();
            int skipped = (int) rows.stream().filter(r -> r.ok() && r.action().startsWith(SKIP)).count();
            return new ImportPreview(rows, added, updated, skipped, invalid);
        }
    }

    Plan plan(List<RawRow> raw) {
        Plan plan = new Plan();
        Map<String, Area> areaByKey = new HashMap<>();
        for (Area a : areas.findAll()) {
            areaByKey.put(StreetService.matchKey(a.getName()), a);
            areaByKey.put(StreetService.matchKey(a.getCode()), a);
        }
        List<Street> catalog = streets.findAllForCatalog();
        // Đường trước, hẻm sau (hẻm cần biết đường cha, kể cả đường mới trong cùng file).
        List<RawRow> alleyRows = new ArrayList<>();
        Map<Integer, ImportRow> byRow = new HashMap<>();
        for (RawRow r : raw) {
            String kind = r.kind().toLowerCase(Locale.ROOT);
            if (r.decision().toLowerCase(Locale.ROOT).startsWith("bỏ")) {
                byRow.put(r.rowNo(), row(r, SKIP + " (xã ghi Bỏ)", List.of()));
            } else if (kind.startsWith("cầu")) {
                byRow.put(r.rowNo(), row(r, SKIP + " (cầu)", List.of()));
            } else if (kind.startsWith("hẻm") || kind.startsWith("hem")) {
                alleyRows.add(r);
            } else if (kind.startsWith("đường") || kind.startsWith("duong")) {
                byRow.put(r.rowNo(), planRow(plan, r, null, catalog, areaByKey));
            } else {
                byRow.put(r.rowNo(), row(r, "", List.of("Loại phải là Đường hoặc Hẻm")));
            }
        }
        for (RawRow r : alleyRows) {
            Optional<Planned> parent = findParent(plan, r.parent(), catalog);
            byRow.put(r.rowNo(), parent.isPresent() ? planRow(plan, r, parent.get(), catalog, areaByKey)
                    : row(r, "", List.of(r.parent().isEmpty() ? "Hẻm phải ghi 'Thuộc đường'"
                            : "Không thấy đường '" + r.parent() + "' trong file hay danh mục")));
        }
        raw.forEach(r -> plan.rows.add(byRow.get(r.rowNo())));
        return plan;
    }

    private ImportRow planRow(Plan plan, RawRow r, Planned parent, List<Street> catalog, Map<String, Area> areaByKey) {
        List<String> errors = new ArrayList<>();
        boolean renamed = !r.newName().isEmpty() && !StreetService.matchKey(r.newName()).equals(StreetService.matchKey(r.name()));
        String name = r.newName().isEmpty() ? r.name() : r.newName();
        String old = renamed ? r.name() : r.oldName();
        if (parent != null) {
            Set<String> parentKeys = parent.keys();
            name = StreetService.shortAlleyName(name, parentKeys);
            old = old.isEmpty() ? old : StreetService.shortAlleyName(old, parentKeys);
        }
        if (AddressText.streetKey(name).isEmpty()) {
            errors.add("Thiếu tên đường / hẻm");
        } else if (name.length() > 200) {
            errors.add("Tên quá dài (tối đa 200 ký tự)");
        }
        Set<Area> rowAreas = new LinkedHashSet<>();
        for (String token : r.areas().split("[,;]")) {
            if (token.isBlank()) {
                continue;
            }
            Area a = areaByKey.get(StreetService.matchKey(token));
            Matcher n = NUMBER.matcher(token);
            if (a == null && n.find()) {
                a = areaByKey.get(StreetService.matchKey("Ấp " + Integer.parseInt(n.group())));
            }
            if (a == null) {
                errors.add("Không có '" + token.trim() + "' trong danh sách ấp");
            } else {
                rowAreas.add(a);
            }
        }
        String shownParent = parent == null ? "" : parent.name;
        if (!errors.isEmpty()) {
            return new ImportRow(r.rowNo(), name, r.kind(), shownParent, r.areas(), old, r.note(), "", errors);
        }
        Map<String, Planned> group = parent == null ? plan.streets : plan.alleys;
        String groupKey = (parent == null ? "" : StreetService.matchKey(parent.name) + "|") + StreetService.matchKey(name);
        Planned p = group.get(groupKey);
        String action;
        if (p != null) {
            action = MERGE + " với dòng trên";
        } else {
            p = new Planned();
            p.name = name.trim().replaceAll("\\s+", " ");
            p.parent = parent;
            p.existing = existing(name, renamed ? old : "", parent, catalog);
            group.put(groupKey, p);
            if (p.existing == null) {
                action = ADD;
                plan.added++;
            } else {
                action = AddressText.streetKey(name).equals(p.existing.getNameKey()) ? UPDATE : RENAME + " từ " + p.existing.getName();
                plan.updated++;
            }
        }
        p.areas.addAll(rowAreas);
        if (!old.isEmpty()) {
            p.oldNames.add(new String[] { old, r.note() });
        }
        if (renamed && p.note == null && !r.note().isBlank()) {
            p.note = r.note();
        }
        return new ImportRow(r.rowNo(), parent == null ? p.name : p.name + " " + parent.name, r.kind(), shownParent,
                r.areas(), old, r.note(), action, List.of());
    }

    /** Đường/hẻm đã có: cùng tên, hoặc tên cũ trong file đang là tên hiện tại trong danh mục (đổi tên). */
    private static Street existing(String name, String oldName, Planned parent, List<Street> catalog) {
        Long parentId = parent == null ? null : parent.existing == null ? -1L : parent.existing.getId();
        List<Street> siblings = catalog.stream().filter(s -> parentId == null ? s.getParent() == null
                : s.getParent() != null && s.getParent().getId().equals(parentId)).toList();
        String key = AddressText.streetKey(name);
        Optional<Street> same = siblings.stream().filter(s -> s.getNameKey().equals(key)).findFirst();
        if (same.isPresent() || oldName.isEmpty()) {
            return same.orElse(null);
        }
        String oldKey = AddressText.streetKey(oldName);
        return siblings.stream().filter(s -> s.getNameKey().equals(oldKey)).findFirst().orElse(null);
    }

    /** Đường cha của hẻm: tìm trong file (tên, tên mới, tên cũ) rồi trong danh mục (tên, tên cũ). */
    private static Optional<Planned> findParent(Plan plan, String text, List<Street> catalog) {
        if (text.isBlank()) {
            return Optional.empty();
        }
        String key = StreetService.matchKey(text);
        Optional<Planned> inFile = plan.streets.values().stream().filter(p -> p.keys().contains(key)).findFirst();
        if (inFile.isPresent()) {
            return inFile;
        }
        return catalog.stream().filter(s -> s.getParent() == null)
                .filter(s -> StreetService.matchKey(s.getName()).equals(key)
                        || s.getOldNames().stream().map(StreetOldName::getName).map(StreetService::matchKey).anyMatch(key::equals))
                .findFirst().map(s -> plan.catalogParents.computeIfAbsent(s.getId(), id -> {
                    Planned p = new Planned();
                    p.name = s.getName();
                    p.existing = s;
                    p.entity = s;
                    return p;
                }));
    }

    private static ImportRow row(RawRow r, String action, List<String> errors) {
        return new ImportRow(r.rowNo(), r.newName().isEmpty() ? r.name() : r.newName(), r.kind(), r.parent(), r.areas(),
                "", r.note(), action, errors);
    }
}
