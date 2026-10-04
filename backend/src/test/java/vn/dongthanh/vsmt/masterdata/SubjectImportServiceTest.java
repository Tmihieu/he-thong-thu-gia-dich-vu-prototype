package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.access.AccessDeniedException;

import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.service.SubjectImportService;
import vn.dongthanh.vsmt.masterdata.service.SubjectImportService.ImportPreview;
import vn.dongthanh.vsmt.masterdata.service.SubjectService;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.ContractCommand;
import vn.dongthanh.vsmt.masterdata.service.SubjectService.SubjectCommand;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

class SubjectImportServiceTest {

    final SubjectService subjects = mock(SubjectService.class);
    final ServiceSubjectRepository repo = mock(ServiceSubjectRepository.class);
    final AreaRepository areas = mock(AreaRepository.class);
    final Clock clock = Clock.fixed(Instant.parse("2026-10-04T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
    final CurrentUser officer = new CurrentUser(3L, "canbo", Role.COMMUNE_OFFICER, null);
    SubjectImportService service;

    @BeforeEach
    void setUp() {
        Area kv07 = mock(Area.class);
        when(kv07.getId()).thenReturn(7L);
        when(kv07.getCode()).thenReturn("KV07");
        when(areas.findAllWithDistrict(null)).thenReturn(List.of(kv07));
        service = new SubjectImportService(subjects, repo, areas, clock);
    }

    static byte[] sheet(String[]... rows) throws IOException {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet s = wb.createSheet();
            Row head = s.createRow(0);
            head.createCell(0).setCellValue("Loại");
            for (int i = 0; i < rows.length; i++) {
                Row r = s.createRow(i + 1);
                for (int j = 0; j < rows[i].length; j++) {
                    r.createCell(j).setCellValue(rows[i][j]);
                }
            }
            wb.write(out);
            return out.toByteArray();
        }
    }

    static ByteArrayInputStream in(byte[] b) {
        return new ByteArrayInputStream(b);
    }

    @Test
    void validRowsPassPreview() throws IOException {
        byte[] file = sheet(
                new String[] { "Hộ gia đình", "Nguyễn Văn A", "12", "Hẻm 45", "kv07", "0901 234 567", "4" },
                new String[] { "", "Trần Thị B", "", "Hẻm 46", "KV07", "", "2" },
                new String[] { "Doanh nghiệp", "Cty C", "5", "Đường 3", "KV07", "", "" });

        ImportPreview p = service.preview(in(file), officer);

        assertThat(p.invalid()).isZero();
        assertThat(p.valid()).isEqualTo(3);
        assertThat(p.rows().get(0).phone()).isEqualTo("0901234567");
        assertThat(p.rows().get(1).houseNo()).isNull();
        assertThat(p.rows().get(0).rowNo()).isEqualTo(2);
    }

    @Test
    void reportsEachProblemWithItsRowNumber() throws IOException {
        when(repo.countSameAddress(eq(7L), eq("Có rồi"), eq("Hẻm 1"), eq("9"))).thenReturn(1L);
        byte[] file = sheet(
                new String[] { "Hộ gia đình", "", "1", "Hẻm 1", "KV07", "", "3" },
                new String[] { "Hộ lạ", "X", "1", "Hẻm 1", "KV07", "", "3" },
                new String[] { "Hộ gia đình", "Y", "1", "Hẻm 1", "KV99", "12ab", "3" },
                new String[] { "Hộ gia đình", "Z", "1", "Hẻm 1", "KV07", "", "" },
                new String[] { "Hộ gia đình", "Có rồi", "9", "Hẻm 1", "KV07", "", "3" },
                new String[] { "Hộ gia đình", "Lặp", "2", "Hẻm 2", "KV07", "", "3" },
                new String[] { "Hộ gia đình", "Lặp", "2", "Hẻm 2", "KV07", "", "3" });

        ImportPreview p = service.preview(in(file), officer);

        assertThat(p.valid()).isEqualTo(1);
        assertThat(p.invalid()).isEqualTo(6);
        assertThat(p.rows().get(0).errors()).containsExactly("Thiếu họ tên / tên đơn vị");
        assertThat(p.rows().get(1).errors()).anyMatch(e -> e.startsWith("Loại đối tượng"));
        assertThat(p.rows().get(2).errors()).anyMatch(e -> e.contains("KV99")).anyMatch(e -> e.contains("điện thoại"));
        assertThat(p.rows().get(3).errors()).containsExactly("Hộ gia đình phải có số người");
        assertThat(p.rows().get(4).errors()).containsExactly("Đã có hồ sơ cùng tên và địa chỉ trong khu vực này");
        assertThat(p.rows().get(6).errors()).containsExactly("Trùng với một dòng khác trong file");
    }

    @Test
    void commitCreatesHouseholdWithContractByMemberCount() throws IOException {
        byte[] file = sheet(
                new String[] { "Hộ gia đình", "A", "1", "Hẻm 1", "KV07", "", "2" },
                new String[] { "Hộ gia đình", "B", "2", "Hẻm 1", "KV07", "", "3" },
                new String[] { "Hộ kinh doanh", "C", "3", "Hẻm 1", "KV07", "", "" });

        assertThat(service.commit(in(file), officer)).isEqualTo(3);

        ArgumentCaptor<SubjectCommand> cmd = ArgumentCaptor.forClass(SubjectCommand.class);
        ArgumentCaptor<ContractCommand> contract = ArgumentCaptor.forClass(ContractCommand.class);
        verify(subjects, times(3)).create(cmd.capture(), contract.capture(), any());
        assertThat(contract.getAllValues().get(0).tariffGroup()).isEqualTo(TariffGroup.HH_UP_TO_2);
        assertThat(contract.getAllValues().get(1).tariffGroup()).isEqualTo(TariffGroup.HH_3_PLUS);
        assertThat(contract.getAllValues().get(1).validFrom()).hasToString("2026-10-04");
        assertThat(contract.getAllValues().get(2)).isNull();
        assertThat(cmd.getAllValues().get(2).type()).isEqualTo(SubjectType.BUSINESS_HOUSEHOLD);
        assertThat(cmd.getAllValues().get(0).areaId()).isEqualTo(7L);
    }

    @Test
    void commitWritesNothingWhenAnyRowIsInvalid() throws IOException {
        byte[] file = sheet(
                new String[] { "Hộ gia đình", "A", "1", "Hẻm 1", "KV07", "", "2" },
                new String[] { "Hộ gia đình", "", "2", "Hẻm 1", "KV07", "", "3" });

        assertThatThrownBy(() -> service.commit(in(file), officer))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("1 dòng lỗi");
        verify(subjects, never()).create(any(), any(), any());
    }

    @Test
    void rejectsNonXlsxAndEmptyFiles() throws IOException {
        assertThatThrownBy(() -> service.preview(in("không phải excel".getBytes()), officer))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("xlsx");
        assertThatThrownBy(() -> service.preview(in(sheet()), officer))
                .isInstanceOf(BusinessRuleException.class).hasMessageContaining("không có dòng dữ liệu");
    }

    @Test
    void onlyCommuneOfficerMayImport() {
        CurrentUser collector = new CurrentUser(21L, "thu07", Role.COLLECTOR, 1L);
        assertThatThrownBy(() -> service.preview(in(new byte[0]), collector)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.commit(in(new byte[0]), collector)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void templateIsReadableByTheImporter() throws IOException {
        byte[] t = service.template();
        // Dòng ví dụ trong mẫu phải qua kiểm tra, để người dùng thấy đúng định dạng.
        ImportPreview p = service.preview(in(t), officer);
        assertThat(p.rows()).hasSize(1);
        assertThat(p.invalid()).isZero();
        verify(repo, times(1)).countSameAddress(anyLong(), anyString(), anyString(), anyString());
    }
}
