package vn.dongthanh.vsmt.collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.District;
import vn.dongthanh.vsmt.masterdata.domain.DistrictRepository;
import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PeriodType;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContractRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService.AssignCommand;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import(FixedClockConfig.class)
class CollectorAssignmentIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired DistrictRepository districts;
    @Autowired AreaRepository areas;
    @Autowired CompanyRepository companies;
    @Autowired AreaAssignmentRepository areaAssignmentRepo;
    @Autowired AreaAssignmentService areaAssignments;
    @Autowired TariffVersionRepository tariffs;
    @Autowired CollectionPeriodRepository periods;
    @Autowired FeeTypeRepository feeTypes;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired ServiceContractRepository contracts;
    @Autowired ChargeRequestService chargeRequests;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired EntityManager em;

    Area kv07;
    Area kv09;
    Area kv12;
    Company dv01;
    Company dv07;
    User thu07;
    User thu09;
    User thu12;
    CollectionPeriod october;

    @BeforeEach
    void seed() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        kv07 = areas.save(Area.create("KV07", "Tổ 07", dth));
        kv09 = areas.save(Area.create("KV09", "Tổ 09", dth));
        kv12 = areas.save(Area.create("KV12", "Tổ 12", dth));
        dv01 = companies.save(Company.create("DV01", "Công ty Một", "A", "0900000001", LocalDate.of(2026, 1, 1)));
        dv07 = companies.save(Company.create("DV07", "Công ty Bảy", "B", "0900000007", LocalDate.of(2026, 1, 1)));
        areaAssignmentRepo.save(AreaAssignment.create(kv07, dv01, LocalDate.of(2026, 9, 1), null, null));
        areaAssignmentRepo.save(AreaAssignment.create(kv09, dv01, LocalDate.of(2026, 9, 1), null, null));
        areaAssignmentRepo.save(AreaAssignment.create(kv12, dv07, LocalDate.of(2026, 9, 1), null, null));
        thu07 = users.save(User.create("thu07", "Người thu 07", Role.COLLECTOR, dv01.getId(), "x"));
        thu09 = users.save(User.create("thu09", "Người thu 09", Role.COLLECTOR, dv01.getId(), "x"));
        thu12 = users.save(User.create("thu12", "Người thu 12", Role.COLLECTOR, dv07.getId(), "x"));

        TariffVersion bg = TariffVersion.create("BG-IT", "QĐ thử", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        bg.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        tariffs.save(bg);
        october = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg));
        FeeType env = feeTypes.save(FeeType.create("ENV", "Phí VSMT", PricingMode.TARIFF, null));
        for (Area area : List.of(kv07, kv09, kv12)) {
            ServiceSubject s = ServiceSubject.create("DTH-H0000" + area.getCode().substring(2), SubjectType.HOUSEHOLD,
                    "Hộ " + area.getCode(), "Số 1", area);
            s.setStatus(SubjectStatus.ACTIVE);
            subjects.save(s);
            contracts.save(ServiceContract.create("ĐK-" + area.getCode(), s, TariffGroup.HH_3_PLUS,
                    LocalDate.of(2026, 1, 1), null, false, null, null));
        }
        User officer = users.save(User.create("canbo_it", "Cán bộ", Role.COMMUNE_OFFICER, null, "x"));
        chargeRequests.publish(new IssueCommand(october.getId(), env.getId(), ChargeScope.ALL, null, null,
                LocalDate.of(2026, 10, 25), null, null), new CurrentUser(officer.getId(), "canbo_it", Role.COMMUNE_OFFICER, null));
    }

    @Test
    void collectorSeesOnlyChargesOfAssignedAreas() throws Exception {
        String dv01Token = token("dv01_it", Role.COMPANY_MANAGER, dv01.getId());
        assign(dv01Token, thu07, List.of(kv07), "2026-10-01").andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].areaCode").value("KV07"));

        String collector = bearer(thu07);
        mvc.perform(get("/api/collection/my-charges").header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].areaCode", contains("KV07")));

        long kv09Charge = chargeIdIn(kv09);
        mvc.perform(get("/api/collection/my-charges/" + kv09Charge).header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/collection/my-charges/" + chargeIdIn(kv07)).header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isOk());
        mvc.perform(get("/api/billing/charges").header(HttpHeaders.AUTHORIZATION, collector))
                .andExpect(status().isForbidden());
    }

    @Test
    void companyCannotAssignOtherCompanyAreasOrCollectors() throws Exception {
        String dv01Token = token("dv01_it", Role.COMPANY_MANAGER, dv01.getId());

        assign(dv01Token, thu07, List.of(kv12), "2026-10-01")
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        assign(dv01Token, thu12, List.of(kv07), "2026-10-01").andExpect(status().isForbidden());
        assign(bearer(thu07), thu07, List.of(kv07), "2026-10-01").andExpect(status().isForbidden());
    }

    @Test
    void schemaAllowsManyToManyAssignments() {
        jdbc.update("insert into collector_assignments (collector_id, area_id, company_id, valid_from) values (?, ?, ?, '2026-10-01')",
                thu07.getId(), kv07.getId(), dv01.getId());
        jdbc.update("insert into collector_assignments (collector_id, area_id, company_id, valid_from) values (?, ?, ?, '2026-10-01')",
                thu07.getId(), kv09.getId(), dv01.getId());
        jdbc.update("insert into collector_assignments (collector_id, area_id, company_id, valid_from) values (?, ?, ?, '2026-10-01')",
                thu09.getId(), kv07.getId(), dv01.getId());

        assertThat(jdbc.queryForObject("select count(*) from collector_assignments", Integer.class)).isEqualTo(3);
    }

    @Test
    void newCollectorForAnAreaEndsThePreviousOneAndIsAudited() throws Exception {
        String dv01Token = token("dv01_it", Role.COMPANY_MANAGER, dv01.getId());
        assign(dv01Token, thu07, List.of(kv07, kv09), "2026-09-15").andExpect(status().isCreated());

        assign(dv01Token, thu09, List.of(kv09), "2026-10-01").andExpect(status().isCreated());
        assign(dv01Token, thu09, List.of(kv09), "2026-10-05")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("COLLECTOR_ALREADY_ASSIGNED"));

        assertThat(jdbc.queryForList("""
                select u.username || ':' || a.code || ':' || coalesce(to_char(ca.valid_to, 'YYYY-MM-DD'), '-')
                from collector_assignments ca join users u on u.id = ca.collector_id join areas a on a.id = ca.area_id
                order by ca.id""", String.class))
                .containsExactly("thu07:KV07:-", "thu07:KV09:2026-09-30", "thu09:KV09:-");
        assertThat(jdbc.queryForObject("select count(*) from audit_logs where action = 'ASSIGN_COLLECTOR'", Integer.class))
                .isEqualTo(3);

        mvc.perform(get("/api/collection/collector-assignments").header(HttpHeaders.AUTHORIZATION, dv01Token))
                .andExpect(jsonPath("$[*].collectorUsername", contains("thu07", "thu09")));
    }

    @Test
    void areaMovingToAnotherCompanyEndsTheOldCompanyCollector() throws Exception {
        assign(token("dv01_it", Role.COMPANY_MANAGER, dv01.getId()), thu07, List.of(kv07), "2026-09-15");
        User officer = users.findByUsername("canbo_it").orElseThrow();

        areaAssignments.assign(new AssignCommand(List.of(kv07.getId()), dv07.getId(), LocalDate.of(2026, 11, 1), null,
                null), new CurrentUser(officer.getId(), "canbo_it", Role.COMMUNE_OFFICER, null));
        em.flush(); // đọc bằng JDBC nên đẩy thay đổi của listener xuống CSDL trước

        assertThat(jdbc.queryForObject("select valid_to from collector_assignments where collector_id = ?",
                LocalDate.class, thu07.getId())).isEqualTo(LocalDate.of(2026, 10, 31));
    }

    private long chargeIdIn(Area area) {
        return jdbc.queryForObject("select id from charges where area_id = ?", Long.class, area.getId());
    }

    private ResultActions assign(String token, User collector, List<Area> list, String from) throws Exception {
        String ids = list.stream().map(a -> a.getId().toString()).reduce((a, b) -> a + "," + b).orElse("");
        return mvc.perform(post("/api/collection/collector-assignments").header(HttpHeaders.AUTHORIZATION, token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"collectorId\":%d,\"areaIds\":[%s],\"fromDate\":\"%s\"}".formatted(collector.getId(), ids, from)));
    }

    private String bearer(User user) {
        return "Bearer " + jwt.issue(user).value();
    }

    private String token(String username, Role role, Long companyId) {
        User user = users.findByUsername(username)
                .orElseGet(() -> users.save(User.create(username, username, role, companyId, "x")));
        return bearer(user);
    }
}
