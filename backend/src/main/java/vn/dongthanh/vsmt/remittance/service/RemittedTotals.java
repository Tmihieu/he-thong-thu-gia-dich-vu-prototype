package vn.dongthanh.vsmt.remittance.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.remittance.domain.CommunePayoutRepository;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceiptRepository;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;

/** Tiền công ty đã nộp về xã = Σ phiếu thu công ty (R7), đọc từ bảng company_receipts. */
@Component
@RequiredArgsConstructor
public class RemittedTotals {

    public record Received(long amount, long receiptCount) {
    }

    private final CompanyReceiptRepository receipts;
    private final CommunePayoutRepository payouts;

    public Map<Long, Received> receivedByCompany(long periodId) {
        Map<Long, Received> m = new HashMap<>();
        receipts.totalsByCompany(periodId).forEach(r -> m.put((Long) r[0],
                new Received(((Number) r[1]).longValue(), ((Number) r[2]).longValue())));
        return m;
    }

    /** Tiền xã đã trả lại công ty của kỳ = Σ phiếu chi trả công ty (UC-55), theo công ty. */
    public Map<Long, Long> paidBackByCompany(long periodId) {
        Map<Long, Long> m = new HashMap<>();
        payouts.totalsByCompany(periodId).forEach(r -> m.put((Long) r[0], ((Number) r[1]).longValue()));
        return m;
    }

    public List<CompanyPeriodAmount> receivedByCompanyAndPeriod() {
        return receipts.totalsByCompanyAndPeriod().stream()
                .map(r -> new CompanyPeriodAmount((Long) r[0], (Long) r[1], ((Number) r[2]).longValue()))
                .toList();
    }
}
