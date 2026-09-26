package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.Area;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignment;
import vn.dongthanh.vsmt.masterdata.domain.AreaAssignmentRepository;
import vn.dongthanh.vsmt.masterdata.domain.AreaRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.AreaProgressRow;

/**
 * Tiến độ thu theo tổ trong một kỳ (R5): phải thu = Σ khoản, đã thu = Σ thanh toán; công ty lấy theo khoản đã phát
 * hành (G3). Tổ chưa có khoản thì lấy công ty đang phụ trách; không có thì là "Chưa có công ty".
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AreaProgressService {

    private final LedgerQueries queries;
    private final AreaRepository areas;
    private final AreaAssignmentRepository assignments;
    private final CompanyRepository companies;
    private final ServiceSubjectRepository subjects;
    private final Clock clock;

    public record AreaProgress(Area area, Company company, long due, long collected, long chargeCount, long paidCount,
            long subjectCount) {

        public double collectionRate() {
            return due == 0 ? 0.0 : Math.round(collected * 1000.0 / due) / 10.0;
        }

        public boolean lowCollectionRate() {
            return due > 0 && collectionRate() < CompanyLedgerService.LOW_RATE_PERCENT;
        }
    }

    public List<AreaProgress> progress(Long periodId, CurrentUser actor) {
        actor.requireRole(Role.COMMUNE_OFFICER, Role.ADMIN, Role.COMPANY_MANAGER);
        Map<Long, List<AreaProgressRow>> byArea = new HashMap<>();
        queries.progressByArea(periodId).forEach(r -> byArea.computeIfAbsent(r.areaId(), k -> new ArrayList<>()).add(r));
        Map<Long, Company> current = new HashMap<>();
        for (AreaAssignment a : assignments.findActiveOn(LocalDate.now(clock), null)) {
            current.put(a.getArea().getId(), a.getCompany());
        }
        Map<Long, Company> companyById = new HashMap<>();
        companies.findAll().forEach(c -> companyById.put(c.getId(), c));
        Map<Long, Long> subjectCounts = new HashMap<>();
        subjects.countActiveByArea().forEach(r -> subjectCounts.put((Long) r[0], (Long) r[1]));

        List<AreaProgress> result = new ArrayList<>();
        for (Area area : areas.findAllWithDistrict(null)) {
            long subjectsInArea = subjectCounts.getOrDefault(area.getId(), 0L);
            List<AreaProgressRow> rows = byArea.get(area.getId());
            if (rows == null) {
                result.add(new AreaProgress(area, current.get(area.getId()), 0, 0, 0, 0, subjectsInArea));
            } else {
                // Thường một dòng; nhiều dòng khi tổ đổi công ty giữa hai lần phát hành trong cùng kỳ.
                for (AreaProgressRow r : rows) {
                    result.add(new AreaProgress(area, companyById.get(r.companyId()), r.due(), r.collected(),
                            r.chargeCount(), r.paidCount(), subjectsInArea));
                }
            }
        }
        if (actor.role() == Role.COMPANY_MANAGER) {
            return result.stream()
                    .filter(p -> p.company() != null && Objects.equals(p.company().getId(), actor.companyId()))
                    .toList();
        }
        return result;
    }
}
