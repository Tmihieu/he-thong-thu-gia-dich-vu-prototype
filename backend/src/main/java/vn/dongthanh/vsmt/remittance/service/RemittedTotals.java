package vn.dongthanh.vsmt.remittance.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.remittance.domain.CompanyReceiptRepository;
import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;

/** Tiền công ty đã nộp về xã = Σ biên nhận công ty (R7), đọc từ bảng company_receipts. */
@Component
@RequiredArgsConstructor
public class RemittedTotals {

    public record Received(long amount, long receiptCount) {
    }

    private final CompanyReceiptRepository receipts;

    public Map<Long, Received> receivedByCompany(long periodId) {
        Map<Long, Received> m = new HashMap<>();
        receipts.totalsByCompany(periodId).forEach(r -> m.put((Long) r[0],
                new Received(((Number) r[1]).longValue(), ((Number) r[2]).longValue())));
        return m;
    }

    public List<CompanyPeriodAmount> receivedByCompanyAndPeriod() {
        return receipts.totalsByCompanyAndPeriod().stream()
                .map(r -> new CompanyPeriodAmount((Long) r[0], (Long) r[1], ((Number) r[2]).longValue()))
                .toList();
    }
}
