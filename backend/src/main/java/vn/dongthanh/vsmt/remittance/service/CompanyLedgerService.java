package vn.dongthanh.vsmt.remittance.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriod;
import vn.dongthanh.vsmt.masterdata.domain.CollectionPeriodRepository;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyAmount;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Progress;
import vn.dongthanh.vsmt.remittance.service.LedgerStatus.Reconciliation;
import vn.dongthanh.vsmt.remittance.service.RemittedTotals.Received;

/**
 * Sổ công ty–kỳ, nguồn số liệu duy nhất cho tiến độ, đối soát, màn công ty, phiếu thu, nhắc nộp và khóa kỳ.
 * <ul>
 * <li>Phải thu (sửa R6): Σ khoản theo công ty chụp lúc phát hành (G3), không dùng phân công hiện tại.</li>
 * <li>Công ty đã thu (R8, G4): Σ thanh toán. Đã nộp về xã (R7): Σ phiếu thu. Còn phải nộp = phải thu − đã nộp.</li>
 * <li>Điều chỉnh kỳ trước (O10): khoản của kỳ đã khóa được xóa nợ, ghi nhận ở kỳ này; còn phải nộp = phải thu −
 * điều chỉnh − đã nộp. Đã thu đã trừ tiền hoàn ghi nhận ở kỳ này (T58); cột "đã hoàn" chỉ để hiển thị.</li>
 * <li>Nợ kỳ trước (R9–R11): Σ max(0, phải thu − đã nộp) các kỳ khác đã hết hạn. Quá hạn: hạn kỳ &lt; hôm nay và còn nộp.</li>
 * <li>Tiến độ (R13) và đối soát (R14, chênh lệch = đã nộp − đã thu) như prototype.</li>
 * <li>Cờ dưới 45% ở cấp công ty (màn tiến độ của xã) tính theo đã nộp về xã / phải thu như prototype; tỷ lệ đã thu
 * và cờ của nó vẫn giữ cho màn tổng quan của công ty.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyLedgerService {

    static final long LOW_RATE_PERCENT = 45;

    private final LedgerQueries queries;
    private final RemittedTotals remitted;
    private final CollectionPeriodRepository periods;
    private final CompanyRepository companies;
    private final Clock clock;

    public record LedgerRow(Long companyId, String companyCode, String companyName, Long periodId, long due,
            long chargeCount, long adjustment, long refunded, long collected, long received, long receiptCount, long remaining, long gap,
            long previousDebt, boolean overdue, double collectionRate, boolean lowCollectionRate, double remittedRate,
            boolean lowRemittedRate, Progress progress, Reconciliation reconciliation,
            long retained, long payable) {
    }

    /** Mọi công ty có khoản, thanh toán, phiếu thu trong kỳ hoặc còn nợ kỳ trước; sắp theo mã công ty. */
    public List<LedgerRow> ledger(Long periodId) {
        CollectionPeriod period = period(periodId);
        LocalDate today = LocalDate.now(clock);
        Map<Long, CompanyAmount> due = byCompany(queries.dueByCompany(periodId));
        Map<Long, CompanyAmount> collected = byCompany(queries.collectedByCompany(periodId));
        Map<Long, CompanyAmount> adjustment = byCompany(queries.writeOffAdjustmentByCompany(periodId));
        Map<Long, CompanyAmount> refunded = byCompany(queries.refundedByCompany(periodId));
        Map<Long, CompanyAmount> retained = byCompany(queries.retainedByCompany(periodId));
        Map<Long, CompanyAmount> retainedOfCollected = byCompany(queries.retainedOfCollectedByCompany(periodId));
        Map<Long, Received> received = remitted.receivedByCompany(periodId);
        Map<Long, Long> previousDebt = previousDebts(periodId, today);

        Set<Long> ids = new TreeSet<>();
        ids.addAll(due.keySet());
        ids.addAll(collected.keySet());
        ids.addAll(adjustment.keySet());
        ids.addAll(refunded.keySet());
        ids.addAll(received.keySet());
        previousDebt.forEach((id, debt) -> {
            if (debt > 0) {
                ids.add(id);
            }
        });
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<Long, Company> companyById = companies.findAllById(ids).stream()
                .collect(Collectors.toMap(Company::getId, Function.identity()));
        return ids.stream()
                .filter(companyById::containsKey)
                .map(id -> build(companyById.get(id), period, today, due.get(id), adjustment.get(id), refunded.get(id),
                        retained.get(id), retainedOfCollected.get(id), collected.get(id), received.get(id),
                        previousDebt.getOrDefault(id, 0L)))
                .sorted(Comparator.comparing(LedgerRow::companyCode))
                .toList();
    }

    /** Dòng sổ của một công ty ở một kỳ; công ty không có số liệu thì trả dòng toàn 0. */
    public LedgerRow row(Long companyId, Long periodId) {
        return ledger(periodId).stream().filter(r -> r.companyId().equals(companyId)).findFirst()
                .orElseGet(() -> {
                    Company c = companies.findAllById(List.of(companyId)).stream()
                            .filter(x -> x.getId().equals(companyId)).findFirst()
                            .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
                    return build(c, period(periodId), LocalDate.now(clock), null, null, null, null, null, null, null, 0L);
                });
    }

    /** Còn phải nộp của công ty cho kỳ (dùng chặn số tiền phiếu thu, R15). */
    public long remaining(Long companyId, Long periodId) {
        return ledger(periodId).stream().filter(r -> r.companyId().equals(companyId)).mapToLong(LedgerRow::remaining)
                .findFirst().orElse(0L);
    }

    /** Công ty còn phải nộp &gt; 0 cho kỳ (chặn khóa kỳ, G15; nhắc nộp). */
    public List<LedgerRow> companiesWithDebt(Long periodId) {
        return ledger(periodId).stream().filter(r -> r.remaining() > 0).toList();
    }

    public record PeriodDebt(CollectionPeriod period, long remaining) {
    }

    /** Các kỳ đã hết hạn công ty nộp xã mà công ty còn phải nộp &gt; 0, cũ trước (nhắc nộp R16, nợ kỳ trước). */
    public List<PeriodDebt> overdueDebtsOf(Long companyId) {
        LocalDate today = LocalDate.now(clock);
        Map<Long, Long> retainedByPeriod = new HashMap<>();
        queries.retainedByCompanyAndPeriodBefore(today).stream().filter(r -> r.companyId() == companyId)
                .forEach(r -> retainedByPeriod.merge(r.periodId(), r.amount(), Long::sum));
        Map<Long, Long> receivedByPeriod = new HashMap<>();
        remitted.receivedByCompanyAndPeriod().stream().filter(r -> r.companyId() == companyId)
                .forEach(r -> receivedByPeriod.merge(r.periodId(), r.amount(), Long::sum));
        Map<Long, Long> remainingByPeriod = new HashMap<>();
        queries.dueByCompanyAndPeriodBefore(today).stream().filter(d -> d.companyId() == companyId)
                .forEach(d -> remainingByPeriod.merge(d.periodId(),
                        d.amount() - retainedByPeriod.getOrDefault(d.periodId(), 0L) - receivedByPeriod.getOrDefault(d.periodId(), 0L),
                        Long::sum));
        List<Long> owing = remainingByPeriod.entrySet().stream().filter(e -> e.getValue() > 0).map(Map.Entry::getKey)
                .toList();
        if (owing.isEmpty()) {
            return List.of();
        }
        return periods.findAllById(owing).stream()
                .sorted(Comparator.comparing(CollectionPeriod::getStartDate))
                .map(p -> new PeriodDebt(p, remainingByPeriod.get(p.getId())))
                .toList();
    }

    private LedgerRow build(Company company, CollectionPeriod period, LocalDate today, CompanyAmount dueRow,
            CompanyAmount adjustmentRow, CompanyAmount refundedRow, CompanyAmount retainedRow, CompanyAmount retainedOfCollectedRow, CompanyAmount collectedRow,
            Received receivedRow, long previousDebt) {
        long due = dueRow == null ? 0 : dueRow.amount();
        long adjustment = adjustmentRow == null ? 0 : adjustmentRow.amount();
        long refunded = refundedRow == null ? 0 : refundedRow.amount();
        long chargeCount = dueRow == null ? 0 : dueRow.count();
        long collected = collectedRow == null ? 0 : collectedRow.amount();
        long received = receivedRow == null ? 0 : receivedRow.amount();
        long receiptCount = receivedRow == null ? 0 : receivedRow.receiptCount();
        // Phải nộp xã = phải thu − điều chỉnh − phần thu gom công ty cầm lại (tính từ biểu giá, xã chốt 03/10).
        long retained = retainedRow == null ? 0 : retainedRow.amount();
        long payable = due - adjustment - retained;
        long remaining = payable - received;
        // QĐ-L15: công ty chỉ phải nộp phần vận chuyển của số tiền ĐÃ THU (không phải của cả phải thu). Điều chỉnh kỳ trước
        // là phần đã nộp thừa ở kỳ khóa nên cộng vào vế đã nộp để đối soát khớp được.
        long retainedOfCollected = retainedOfCollectedRow == null ? 0 : retainedOfCollectedRow.amount();
        long gap = received + adjustment - (collected - retainedOfCollected);
        boolean pastDue = period.getDueDate().isBefore(today);
        boolean overdue = pastDue && remaining > 0;

        Progress progress;
        if (remaining <= 0) {
            progress = Progress.PAID_IN_FULL;
        } else if (overdue || previousDebt > 0) {
            progress = Progress.OVERDUE;
        } else if (received > 0) {
            progress = Progress.PARTIAL;
        } else {
            progress = Progress.NOT_PAID;
        }

        Reconciliation reconciliation;
        boolean outstanding = gap < 0 || remaining > 0;
        if (previousDebt > 0 || (pastDue && outstanding)) {
            reconciliation = Reconciliation.MISMATCH;
        } else if (outstanding) {
            reconciliation = Reconciliation.PENDING;
        } else {
            reconciliation = Reconciliation.MATCHED;
        }

        // Phải thu 0 thì tỷ lệ 0% và vẫn gắn cờ, như prototype.
        return new LedgerRow(company.getId(), company.getCode(), company.getName(), period.getId(), due, chargeCount,
                adjustment, refunded, collected, received, receiptCount, remaining, gap, previousDebt, overdue, percent(collected, due),
                due == 0 || lowRate(collected, due), percent(received, payable), payable > 0 && lowRate(received, payable),
                progress, reconciliation, retained, payable);
    }

    /** Phần trăm làm tròn 1 chữ số để hiển thị; 0 khi phải thu 0. */
    static double percent(long part, long due) {
        return due <= 0 ? 0.0 : Math.round(part * 1000.0 / due) / 10.0;
    }

    /** Dưới 45%, so bằng số nguyên (không so số đã làm tròn: 44,96% hiện "45,0" nhưng vẫn thấp). */
    static boolean lowRate(long part, long due) {
        return part * 100 < LOW_RATE_PERCENT * due;
    }

    private Map<Long, Long> previousDebts(Long currentPeriodId, LocalDate today) {
        Map<String, Long> retainedByKey = new HashMap<>();
        queries.retainedByCompanyAndPeriodBefore(today)
                .forEach(r -> retainedByKey.merge(r.companyId() + ":" + r.periodId(), r.amount(), Long::sum));
        Map<String, Long> receivedByKey = new HashMap<>();
        remitted.receivedByCompanyAndPeriod()
                .forEach(r -> receivedByKey.merge(r.companyId() + ":" + r.periodId(), r.amount(), Long::sum));
        Map<Long, Long> debt = new HashMap<>();
        LocalDate currentStart = period(currentPeriodId).getStartDate();
        for (CompanyPeriodAmount d : queries.dueByCompanyAndPeriodBefore(today)) {
            // Nợ kỳ trước chỉ gồm kỳ CŨ hơn kỳ đang xem (kỳ mới hơn quá hạn không làm kỳ cũ thành "Lệch").
            boolean older = periods.findById(d.periodId()).map(p -> p.getStartDate().isBefore(currentStart)).orElse(false);
            if (!older) {
                continue;
            }
            long paid = receivedByKey.getOrDefault(d.companyId() + ":" + d.periodId(), 0L);
            debt.merge(d.companyId(), Math.max(0, d.amount() - retainedByKey.getOrDefault(d.companyId() + ":" + d.periodId(), 0L) - paid), Long::sum);
        }
        return debt;
    }

    private CollectionPeriod period(Long periodId) {
        return periods.findById(periodId)
                .orElseThrow(() -> new NotFoundException("PERIOD_NOT_FOUND", "Không tìm thấy kỳ thu."));
    }

    private static Map<Long, CompanyAmount> byCompany(List<CompanyAmount> rows) {
        return rows.stream().collect(Collectors.toMap(CompanyAmount::companyId, Function.identity()));
    }
}
