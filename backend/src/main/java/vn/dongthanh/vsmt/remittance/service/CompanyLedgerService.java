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
 * <li>Đã thu (R8, G4): Σ thanh toán ròng (tiền mặt và chuyển khoản) ghi nhận ở kỳ; thanh toán công nợ hộ của kỳ đã khóa
 * ghi vào kỳ đang thu. Đã nộp về xã (R7): Σ phiếu thu.</li>
 * <li>Phải nộp xã (góp ý BA 05/10) = tiền mặt công ty đã thu − điều chỉnh kỳ trước − phí thu gom của TOÀN BỘ số đã thu
 * (cả chuyển khoản vào tài khoản xã). Âm thì xã trả lại công ty phần chênh, không cắt về 0. Còn phải nộp = phải nộp xã −
 * đã nộp.</li>
 * <li>Thu công nợ kỳ cũ: phần của đã thu là thanh toán (trừ hoàn) cho khoản thuộc kỳ khác đã khóa, ghi vào kỳ này;
 * chỉ để hiển thị.</li>
 * <li>Điều chỉnh kỳ trước (O10): khoản của kỳ đã khóa được xóa nợ, ghi nhận ở kỳ này. Đã thu đã trừ tiền hoàn ghi nhận
 * ở kỳ này (T58); cột "đã hoàn" chỉ để hiển thị.</li>
 * <li>Nợ kỳ trước (R9–R11): Σ max(0, phải nộp xã − đã nộp) các kỳ khác đã hết hạn. Quá hạn: hạn kỳ &lt; hôm nay và còn nộp.</li>
 * <li>Bỏ QR của xã và phiếu chi trả công ty (08/10): hộ đóng tiền mặt hoặc chuyển khoản đều vào công ty, công ty nộp xã
 * vận chuyển + xử lý. {@code communePaid}, {@code communeOwed} chỉ còn để hiển thị (nộp dư), không chặn Khớp hay khóa kỳ.</li>
 * <li>Tiến độ (R13) và đối soát (R14, chênh lệch = đã nộp − phải nộp xã) như prototype.</li>
 * <li>Cờ dưới 45% ở cấp công ty (màn tiến độ của xã) tính theo đã nộp về xã / phải nộp xã như prototype; tỷ lệ đã thu
 * và cờ của nó vẫn giữ cho màn tổng quan của công ty. Cờ 45% chưa chốt lại sau góp ý BA 05/10, để nguyên.</li>
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
            long chargeCount, long adjustment, long refunded, long collected, long cashCollected, long received, long receiptCount, long remaining, long gap,
            long previousDebt, boolean overdue, double collectionRate, boolean lowCollectionRate, double remittedRate,
            boolean lowRemittedRate, Progress progress, Reconciliation reconciliation,
            long retained, long payable, long debtCollected, long communePaid, long communeOwed, long qrCollection, long lastPeriodDebt,
            long qrProcessing, long processing) {

        /** Chuyển khoản vào tài khoản xã (đã trừ hoàn). */
        public long qrTotal() {
            return collected - cashCollected;
        }

        public long qrTransport() {
            return qrTotal() - qrCollection - qrProcessing;
        }

        /** Phần thu gom công ty giữ trong tiền mặt (kể cả phần điều chỉnh kỳ trước). */
        public long cashCollection() {
            return retained - qrCollection;
        }

        /** Phí xử lý trong tiền mặt, công ty nộp xã cùng vận chuyển (kể cả phần điều chỉnh kỳ trước). */
        public long cashProcessing() {
            return processing - qrProcessing;
        }

        /**
         * Vận chuyển trong tiền mặt, công ty nộp xã, đã trừ điều chỉnh: phải nộp xã + xã trả công ty phần thu gom QR − phí
         * xử lý trong tiền mặt.
         */
        public long cashTransport() {
            return payable + qrCollection - cashProcessing();
        }

        /** Tiền xã đang giữ = chuyển khoản + đã nhận từ công ty − đã chi cho công ty. */
        public long holding() {
            return qrTotal() + received - communePaid;
        }

        /** Tiền xã được hưởng: vận chuyển và phí xử lý (QĐ 65/2026: xã nộp tiếp về Sở NN&MT). */
        public long entitled() {
            return qrTransport() + cashTransport() + processing;
        }

        /** Vận chuyển trong toàn bộ số đã thu (tiền mặt và chuyển khoản, đều vào công ty), đã trừ điều chỉnh: phải nộp xã − phí xử lý. */
        public long transport() {
            return payable - processing;
        }

        /** Đã khớp: công ty không còn phải nộp xã. */
        public boolean settled() {
            return remaining <= 0;
        }
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
        Map<Long, CompanyAmount> cash = byCompany(queries.cashCollectedByCompany(periodId));
        Map<Long, CompanyAmount> debtCollected = byCompany(queries.debtCollectedByCompany(periodId));
        Map<Long, LedgerQueries.QrAmount> qr = queries.qrByCompany(periodId).stream()
                .collect(Collectors.toMap(LedgerQueries.QrAmount::companyId, Function.identity()));
        Map<Long, CompanyAmount> processing = byCompany(queries.processingByCompany(periodId));
        Map<Long, Received> received = remitted.receivedByCompany(periodId);
        Map<Long, Long> paidBack = remitted.paidBackByCompany(periodId);
        Map<Long, Long> previousDebt = previousDebts(periodId, today);
        Map<Long, CompanyAmount> lastPeriodDebt = byCompany(queries.lastPeriodUnpaidByCompany(periodId));

        Set<Long> ids = new TreeSet<>();
        ids.addAll(due.keySet());
        ids.addAll(collected.keySet());
        ids.addAll(adjustment.keySet());
        ids.addAll(refunded.keySet());
        ids.addAll(received.keySet());
        ids.addAll(lastPeriodDebt.keySet());
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
                        retained.get(id), cash.get(id), collected.get(id), received.get(id),
                        previousDebt.getOrDefault(id, 0L), debtCollected.get(id), paidBack.getOrDefault(id, 0L),
                        qr.get(id), lastPeriodDebt.containsKey(id) ? lastPeriodDebt.get(id).amount() : 0L,
                        processing.containsKey(id) ? processing.get(id).amount() : 0L))
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
                    return build(c, period(periodId), LocalDate.now(clock), null, null, null, null, null, null, null, 0L, null, 0L, null, 0L, 0L);
                });
    }

    /** Giao dịch QR chưa khớp khoản nào (chặn khóa kỳ). */
    public LedgerQueries.UnidentifiedQr unidentifiedQr() {
        return queries.unidentifiedQr();
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

    /** Số khoản Chưa thu của kỳ (điều kiện "đã thu đủ mọi khoản" của khóa kỳ, UC-39). */
    public long unpaidChargeCount(Long periodId) {
        return queries.unpaidChargeCount(periodId);
    }

    public record PeriodDebt(CollectionPeriod period, long remaining) {
    }

    /** Các kỳ đã hết hạn công ty nộp xã mà công ty còn phải nộp &gt; 0, cũ trước (nhắc nộp R16, nợ kỳ trước). */
    public List<PeriodDebt> overdueDebtsOf(Long companyId) {
        LocalDate today = LocalDate.now(clock);
        Map<Long, Long> receivedByPeriod = new HashMap<>();
        remitted.receivedByCompanyAndPeriod().stream().filter(r -> r.companyId() == companyId)
                .forEach(r -> receivedByPeriod.merge(r.periodId(), r.amount(), Long::sum));
        Map<Long, Long> remainingByPeriod = new HashMap<>();
        queries.payableByCompanyAndPeriodBefore(today).stream().filter(d -> d.companyId() == companyId)
                .forEach(d -> remainingByPeriod.merge(d.periodId(),
                        d.amount() - receivedByPeriod.getOrDefault(d.periodId(), 0L), Long::sum));
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
            CompanyAmount adjustmentRow, CompanyAmount refundedRow, CompanyAmount retainedRow, CompanyAmount cashRow, CompanyAmount collectedRow,
            Received receivedRow, long previousDebt, CompanyAmount debtCollectedRow, long communePaid, LedgerQueries.QrAmount qr,
            long lastPeriodDebt, long processing) {
        long qrCollection = qr == null ? 0 : qr.collection();
        long qrProcessing = qr == null ? 0 : qr.processing();
        long due = dueRow == null ? 0 : dueRow.amount();
        long adjustment = adjustmentRow == null ? 0 : adjustmentRow.amount();
        long refunded = refundedRow == null ? 0 : refundedRow.amount();
        long chargeCount = dueRow == null ? 0 : dueRow.count();
        long collected = collectedRow == null ? 0 : collectedRow.amount();
        long cashCollected = cashRow == null ? 0 : cashRow.amount();
        long received = receivedRow == null ? 0 : receivedRow.amount();
        long receiptCount = receivedRow == null ? 0 : receivedRow.receiptCount();
        // Phải nộp xã = vận chuyển + phí xử lý = toàn bộ số đã thu (tiền mặt và chuyển khoản đều vào công ty, bỏ QR của xã
        // 08/10) − điều chỉnh kỳ trước − phí thu gom công ty giữ.
        long retained = retainedRow == null ? 0 : retainedRow.amount();
        long payable = collected - adjustment - retained;
        long remaining = payable - received;
        long gap = received - payable;
        // Xã còn phải trả lại công ty = số âm của còn phải nộp − tiền xã đã trả (phiếu chi trả công ty, UC-55).
        long communeOwed = Math.max(0, -remaining - communePaid);
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
        boolean outstanding = remaining > 0;
        if (previousDebt > 0 || (pastDue && outstanding)) {
            reconciliation = Reconciliation.MISMATCH;
        } else if (outstanding) {
            reconciliation = Reconciliation.PENDING;
        } else {
            reconciliation = Reconciliation.MATCHED;
        }

        // Phải thu 0 thì tỷ lệ 0% và không gắn cờ (không có gì để thu, BR-REM-10).
        return new LedgerRow(company.getId(), company.getCode(), company.getName(), period.getId(), due, chargeCount,
                adjustment, refunded, collected, cashCollected, received, receiptCount, remaining, gap, previousDebt, overdue, percent(collected, due),
                due > 0 && lowRate(collected, due), percent(received, payable), payable > 0 && lowRate(received, payable),
                progress, reconciliation, retained, payable, debtCollectedRow == null ? 0 : debtCollectedRow.amount(), communePaid,
                communeOwed, qrCollection, lastPeriodDebt, qrProcessing, processing);
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
        Map<String, Long> receivedByKey = new HashMap<>();
        remitted.receivedByCompanyAndPeriod()
                .forEach(r -> receivedByKey.merge(r.companyId() + ":" + r.periodId(), r.amount(), Long::sum));
        Map<Long, Long> debt = new HashMap<>();
        LocalDate currentStart = period(currentPeriodId).getStartDate();
        for (CompanyPeriodAmount d : queries.payableByCompanyAndPeriodBefore(today)) {
            // Nợ kỳ trước chỉ gồm kỳ CŨ hơn kỳ đang xem (kỳ mới hơn quá hạn không làm kỳ cũ thành "Lệch").
            boolean older = periods.findById(d.periodId()).map(p -> p.getStartDate().isBefore(currentStart)).orElse(false);
            if (!older) {
                continue;
            }
            long paid = receivedByKey.getOrDefault(d.companyId() + ":" + d.periodId(), 0L);
            debt.merge(d.companyId(), Math.max(0, d.amount() - paid), Long::sum);
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
