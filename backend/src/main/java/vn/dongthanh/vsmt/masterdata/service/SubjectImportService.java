package vn.dongthanh.vsmt.masterdata.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
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
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.AddressText;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.Street;
import vn.dongthanh.vsmt.masterdata.domain.StreetRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.ContractCommand;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.SubjectCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Nhập hồ sơ hộ hàng loạt từ Excel (.xlsx). Xã chưa có CSDL hộ; bên thứ ba thu thập rồi bàn giao dạng bảng tính.
 * Hai bước: xem trước (không ghi gì, trả từng dòng kèm lỗi) rồi xác nhận (chỉ ghi khi không dòng nào lỗi, tất cả
 * hoặc không gì). Hộ gia đình được tạo kèm hợp đồng theo số người; hộ kinh doanh và doanh nghiệp tạo ở trạng thái
 * Chờ hợp đồng để cán bộ xã chọn nhóm giá.
 * <p>Cột đường khớp danh mục đường của xã/phường (không phân biệt dấu, hoa thường, tiền tố "Đường"): khớp thì dùng đường
 * chuẩn và kiểm trùng địa chỉ như khi nhập tay (BR-MD-08); không khớp thì lưu tên đường "chờ xác minh".</p>
 */
@Service
@RequiredArgsConstructor
public class SubjectImportService {

    public static final int MAX_ROWS = 2000;
    static final String[] HEADERS = { "Loại đối tượng", "Họ tên / tên đơn vị", "Số nhà", "Đường / hẻm", "Mã khu vực",
            "Số điện thoại", "Số người" };
    private static final Pattern PHONE = Pattern.compile("^[0-9]{9,15}$");

    private final SubjectService subjects;
    private final ServiceSubjectRepository subjectRepo;
    private final AreaRepository areas;
    private final StreetRepository streets;
    private final Clock clock;

    public record ImportRow(int rowNo, String type, String name, String houseNo, String street, String areaCode,
            String phone, Integer memberCount, List<String> errors) {

        public boolean ok() {
            return errors.isEmpty();
        }
    }

    public record ImportPreview(List<ImportRow> rows, int valid, int invalid) {
    }

    @Transactional(readOnly = true)
    public ImportPreview preview(InputStream xlsx, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        return validate(parse(xlsx), actor);
    }

    /** Ghi toàn bộ nếu mọi dòng hợp lệ; ngược lại không ghi gì và báo số dòng lỗi. Trả số hồ sơ đã tạo. */
    @Transactional
    public int commit(InputStream xlsx, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER);
        ImportPreview preview = validate(parse(xlsx), actor);
        if (preview.invalid() > 0) {
            throw new BusinessRuleException("IMPORT_HAS_ERRORS",
                    "File còn " + preview.invalid() + " dòng lỗi, chưa nhập hồ sơ nào. Sửa file rồi tải lại.");
        }
        Map<String, Area> byCode = areaByCode();
        LocalDate today = LocalDate.now(clock);
        for (ImportRow r : preview.rows()) {
            SubjectType type = typeOf(r.type());
            Area area = byCode.get(r.areaCode().toUpperCase(Locale.ROOT));
            Street street = catalogStreet(area, r.street());
            SubjectCommand cmd = new SubjectCommand(type, r.name(), r.houseNo(), street != null ? street.getName() : r.street(),
                    area.getId(), r.phone(), r.memberCount(), null, null, null, street != null ? street.getId() : null,
                    street == null, null, null, null);
            ContractCommand contract = null;
            if (type == SubjectType.HOUSEHOLD) {
                TariffGroup group = r.memberCount() <= 2 ? TariffGroup.HH_UP_TO_2 : TariffGroup.HH_3_PLUS;
                contract = new ContractCommand(group, today, null, false, null, null, "Nhập từ file Excel");
            }
            subjects.create(cmd, contract, actor);
        }
        return preview.rows().size();
    }

    /** File mẫu: một dòng tiêu đề, một dòng ví dụ và trang hướng dẫn. */
    public byte[] template() {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Danh sách hộ");
            Row head = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                head.createCell(i).setCellValue(HEADERS[i]);
                sheet.setColumnWidth(i, 6000);
            }
            String[] sample = { "Hộ gia đình", "Nguyễn Văn A", "12", "Hẻm 45 Đường số 3", "KV07", "0901234567", "4" };
            Row ex = sheet.createRow(1);
            for (int i = 0; i < sample.length; i++) {
                ex.createCell(i).setCellValue(sample[i]);
            }
            Sheet help = wb.createSheet("Hướng dẫn");
            String[] lines = {
                "Mỗi dòng là một hộ / đơn vị. Xoá dòng ví dụ trước khi tải lên. Tối đa " + MAX_ROWS + " dòng.",
                "Loại đối tượng: Hộ gia đình, Hộ kinh doanh hoặc Doanh nghiệp (để trống = Hộ gia đình).",
                "Mã khu vực: mã khu vực đang có trong hệ thống (ví dụ KV07).",
                "Đường / hẻm: nên ghi đúng tên trong danh mục đường của xã; tên không có trong danh mục được lưu là 'chờ xác minh'.",
                "Số người: bắt buộc với hộ gia đình; quyết định nhóm giá (≤2 người hoặc từ 3 người).",
                "Số điện thoại: 9–15 chữ số, có thể để trống. Số nhà có thể để trống nếu nhà chưa có số.",
                "Hộ kinh doanh và doanh nghiệp được tạo ở trạng thái Chờ hợp đồng; cán bộ xã chọn nhóm giá sau.",
                "Nếu còn dòng lỗi, hệ thống không nhập hồ sơ nào; sửa file rồi tải lại." };
            for (int i = 0; i < lines.length; i++) {
                help.createRow(i).createCell(0).setCellValue(lines[i]);
            }
            help.setColumnWidth(0, 18000);
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Không tạo được file mẫu", e);
        }
    }

    List<ImportRow> parse(InputStream xlsx) {
        try (Workbook wb = new XSSFWorkbook(xlsx)) {
            Sheet sheet = wb.getSheetAt(0);
            DataFormatter fmt = new DataFormatter();
            List<ImportRow> rows = new ArrayList<>();
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }
                String[] c = new String[HEADERS.length];
                boolean blank = true;
                for (int j = 0; j < c.length; j++) {
                    Cell cell = row.getCell(j);
                    c[j] = cell == null ? "" : fmt.formatCellValue(cell).trim();
                    blank &= c[j].isEmpty();
                }
                if (blank) {
                    continue;
                }
                if (rows.size() >= MAX_ROWS) {
                    throw new BusinessRuleException("IMPORT_TOO_MANY_ROWS", "File vượt quá " + MAX_ROWS + " dòng.");
                }
                Integer members = null;
                List<String> errors = new ArrayList<>();
                if (!c[6].isEmpty()) {
                    try {
                        members = Integer.parseInt(c[6].replaceAll("\\.0+$", ""));
                    } catch (NumberFormatException e) {
                        errors.add("Số người phải là số nguyên");
                    }
                }
                rows.add(new ImportRow(i + 1, c[0], c[1], c[2].isEmpty() ? null : c[2], c[3], c[4],
                        c[5].replaceAll("[\\s.\\-]", ""), members, errors));
            }
            if (rows.isEmpty()) {
                throw new BusinessRuleException("IMPORT_EMPTY", "File không có dòng dữ liệu nào.");
            }
            return rows;
        } catch (IOException | RuntimeException e) {
            if (e instanceof BusinessRuleException b) {
                throw b;
            }
            throw new BusinessRuleException("IMPORT_BAD_FILE", "Không đọc được file. Hãy dùng file .xlsx theo mẫu.");
        }
    }

    ImportPreview validate(List<ImportRow> parsed, CurrentUser actor) {
        Map<String, Area> byCode = areaByCode();
        Set<String> seen = new HashSet<>();
        List<ImportRow> out = new ArrayList<>();
        int valid = 0;
        for (ImportRow r : parsed) {
            List<String> errors = new ArrayList<>(r.errors());
            SubjectType type = typeOf(r.type());
            if (type == null) {
                errors.add("Loại đối tượng phải là Hộ gia đình, Hộ kinh doanh hoặc Doanh nghiệp");
            }
            if (r.name().isEmpty()) {
                errors.add("Thiếu họ tên / tên đơn vị");
            } else if (r.name().length() > 200) {
                errors.add("Tên quá dài (tối đa 200 ký tự)");
            }
            if (r.street().isEmpty()) {
                errors.add("Thiếu đường / hẻm");
            }
            Area area = byCode.get(r.areaCode().toUpperCase(Locale.ROOT));
            if (r.areaCode().isEmpty()) {
                errors.add("Thiếu mã khu vực");
            } else if (area == null) {
                errors.add("Mã khu vực '" + r.areaCode() + "' không có trong hệ thống");
            }
            if (!r.phone().isEmpty() && !PHONE.matcher(r.phone()).matches()) {
                errors.add("Số điện thoại phải gồm 9–15 chữ số");
            }
            if (r.memberCount() != null && r.memberCount() <= 0) {
                errors.add("Số người phải lớn hơn 0");
            }
            if (type == SubjectType.HOUSEHOLD && r.memberCount() == null) {
                errors.add("Hộ gia đình phải có số người");
            }
            if (area != null && !r.name().isEmpty() && !r.street().isEmpty()) {
                Street street = catalogStreet(area, r.street());
                String house = AddressText.houseKey(r.houseNo());
                if (street != null && !house.isEmpty()) {
                    // Đường chuẩn + số nhà: trùng địa chỉ là dấu hiệu trùng hộ dù khác tên (BR-MD-08).
                    if (!seen.add(area.getId() + "|" + street.getId() + "|" + house)) {
                        errors.add("Trùng địa chỉ với một dòng khác trong file");
                    } else {
                        List<ServiceSubject> twins = subjects.findSuspectedDuplicates(area.getId(), street.getId(),
                                r.houseNo(), null, null, actor);
                        if (!twins.isEmpty()) {
                            errors.add("Địa chỉ trùng hồ sơ " + String.join(", ",
                                    twins.stream().map(ServiceSubject::getCode).toList()));
                        }
                    }
                } else {
                    String key = area.getId() + "|" + r.name().toLowerCase(Locale.ROOT) + "|"
                            + r.street().toLowerCase(Locale.ROOT) + "|" + (r.houseNo() == null ? "" : r.houseNo().toLowerCase(Locale.ROOT));
                    if (!seen.add(key)) {
                        errors.add("Trùng với một dòng khác trong file");
                    } else if (subjectRepo.countSameAddress(area.getId(), r.name(), r.street(),
                            r.houseNo() == null ? "" : r.houseNo()) > 0) {
                        errors.add("Đã có hồ sơ cùng tên và địa chỉ trong khu vực này");
                    }
                }
            }
            out.add(new ImportRow(r.rowNo(), r.type(), r.name(), r.houseNo(), r.street(), r.areaCode(), r.phone(),
                    r.memberCount(), errors));
            if (errors.isEmpty()) {
                valid++;
            }
        }
        return new ImportPreview(out, valid, out.size() - valid);
    }

    /** Đường đang hoạt động trong danh mục của xã/phường chứa tổ/ấp; null nếu không khớp (lưu tên chờ xác minh). */
    private Street catalogStreet(Area area, String name) {
        return streets.findByDistrictIdAndNameKey(area.getDistrict().getId(), AddressText.streetKey(name))
                .filter(s -> s.getStatus() == ActiveStatus.ACTIVE).orElse(null);
    }

    private Map<String, Area> areaByCode() {
        Map<String, Area> map = new HashMap<>();
        areas.findAllWithDistrict(null).forEach(a -> map.put(a.getCode().toUpperCase(Locale.ROOT), a));
        return map;
    }

    /** Nhãn tiếng Việt (không phân biệt hoa thường); để trống = hộ gia đình; không nhận ra = null. */
    static SubjectType typeOf(String label) {
        String l = label == null ? "" : label.trim().toLowerCase(Locale.ROOT);
        return switch (l) {
            case "", "hộ gia đình", "ho gia dinh", "household" -> SubjectType.HOUSEHOLD;
            case "hộ kinh doanh", "ho kinh doanh", "business_household" -> SubjectType.BUSINESS_HOUSEHOLD;
            case "doanh nghiệp", "doanh nghiep", "enterprise" -> SubjectType.ENTERPRISE;
            default -> null;
        };
    }
}
