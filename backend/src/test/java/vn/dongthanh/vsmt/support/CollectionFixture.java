package vn.dongthanh.vsmt.support;

import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;

import vn.dongthanh.vsmt.billing.domain.ChargeScope;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService;
import vn.dongthanh.vsmt.billing.service.ChargeRequestService.IssueCommand;
import vn.dongthanh.vsmt.collection.domain.CollectorAssignment;
import vn.dongthanh.vsmt.collection.domain.CollectorAssignmentRepository;
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
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.security.JwtService;

/**
 * Kịch bản thu dùng chung cho IT của collection/remittance (chạy trong transaction của test, dùng
 * {@link FixedClockConfig}): KV07, KV09 của DV01; KV12 của DV07; mỗi tổ 2 hộ HGĐ ≥ 3 người (80.000 đ/tháng);
 * người thu thu07 (KV07), thu09 (KV09) của DV01, thu12 (KV12) của DV07; kỳ 10/2026 đã phát hành phí ENV.
 */
@TestComponent
public class CollectionFixture {

    @Autowired DistrictRepository districts;
    @Autowired AreaRepository areas;
    @Autowired CompanyRepository companies;
    @Autowired AreaAssignmentRepository areaAssignments;
    @Autowired TariffVersionRepository tariffs;
    @Autowired CollectionPeriodRepository periods;
    @Autowired FeeTypeRepository feeTypes;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired ServiceContractRepository contracts;
    @Autowired CollectorAssignmentRepository collectorAssignments;
    @Autowired ChargeRequestService chargeRequests;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;

    public Area kv07;
    public Area kv09;
    public Area kv12;
    public Company dv01;
    public Company dv07;
    public User officer;
    public User admin;
    public User dv01Manager;
    public User dv07Manager;
    public User thu07;
    public User thu09;
    public User thu12;
    public CollectionPeriod october;
    public FeeType env;

    public CollectionFixture build() {
        District dth = districts.save(District.create("DTH", "Đông Thạnh"));
        kv07 = areas.save(Area.create("KV07", "Tổ 07", dth));
        kv09 = areas.save(Area.create("KV09", "Tổ 09", dth));
        kv12 = areas.save(Area.create("KV12", "Tổ 12", dth));
        dv01 = companies.save(Company.create("DV01", "Công ty Một", "Người Mẫu A", "0900000001", LocalDate.of(2026, 1, 1)));
        dv07 = companies.save(Company.create("DV07", "Công ty Bảy", "Người Mẫu B", "0900000007", LocalDate.of(2026, 1, 1)));
        areaAssignments.save(AreaAssignment.create(kv07, dv01, LocalDate.of(2026, 9, 1), null, null));
        areaAssignments.save(AreaAssignment.create(kv09, dv01, LocalDate.of(2026, 9, 1), null, null));
        areaAssignments.save(AreaAssignment.create(kv12, dv07, LocalDate.of(2026, 9, 1), null, null));

        officer = users.save(User.create("canbo_fx", "Cán bộ xã", Role.COMMUNE_OFFICER, null, "x"));
        admin = users.save(User.create("admin_fx", "Quản trị", Role.ADMIN, null, "x"));
        dv01Manager = users.save(User.create("dv01_fx", "Quản lý DV01", Role.COMPANY_MANAGER, dv01.getId(), "x"));
        dv07Manager = users.save(User.create("dv07_fx", "Quản lý DV07", Role.COMPANY_MANAGER, dv07.getId(), "x"));
        thu07 = users.save(User.create("thu07_fx", "Người thu 07", Role.COLLECTOR, dv01.getId(), "x"));
        thu09 = users.save(User.create("thu09_fx", "Người thu 09", Role.COLLECTOR, dv01.getId(), "x"));
        thu12 = users.save(User.create("thu12_fx", "Người thu 12", Role.COLLECTOR, dv07.getId(), "x"));
        collectorAssignments.save(CollectorAssignment.create(thu07, kv07, dv01, LocalDate.of(2026, 9, 1), null, null));
        collectorAssignments.save(CollectorAssignment.create(thu09, kv09, dv01, LocalDate.of(2026, 9, 1), null, null));
        collectorAssignments.save(CollectorAssignment.create(thu12, kv12, dv07, LocalDate.of(2026, 9, 1), null, null));

        TariffVersion bg = TariffVersion.create("BG-FX", "QĐ thử", LocalDate.of(2026, 9, 1), null, TariffStatus.ACTIVE);
        bg.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        tariffs.save(bg);
        october = periods.save(CollectionPeriod.open(PeriodType.MONTH, 2026, 10, null, LocalDate.of(2026, 10, 31), bg));
        env = feeTypes.save(FeeType.create("ENV", "Phí VSMT", PricingMode.TARIFF, null));
        int n = 1;
        for (Area area : List.of(kv07, kv09, kv12)) {
            for (int i = 0; i < 2; i++, n++) {
                ServiceSubject s = ServiceSubject.create("DTH-H%06d".formatted(n), SubjectType.HOUSEHOLD,
                        "Hộ mẫu " + n, "Số " + n, area);
                s.setStatus(SubjectStatus.ACTIVE);
                subjects.save(s);
                contracts.save(ServiceContract.create("ĐK-FX-" + n, s, TariffGroup.HH_3_PLUS, LocalDate.of(2026, 1, 1),
                        null, false, null, null));
            }
        }
        chargeRequests.publish(new IssueCommand(october.getId(), env.getId(), ChargeScope.ALL, null, null,
                LocalDate.of(2026, 10, 25), null, null), actor(officer));
        return this;
    }

    public long chargeId(String subjectCode) {
        return jdbc.queryForObject("select c.id from charges c join service_subjects s on s.id = c.subject_id"
                + " where s.code = ?", Long.class, subjectCode);
    }

    public CurrentUser actor(User u) {
        return new CurrentUser(u.getId(), u.getUsername(), u.getRole(), u.getCompanyId());
    }

    public String bearer(User u) {
        return "Bearer " + jwt.issue(u).value();
    }
}
