package vn.dongthanh.vsmt.remittance.service;

import java.util.List;
import java.util.Map;

import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;

/** Tiền công ty đã nộp về xã (Σ phiếu thu, R7). Cài đặt bằng bảng phiếu thu ở T26. */
public interface RemittedTotals {

    record Received(long amount, long receiptCount) {
    }

    Map<Long, Received> receivedByCompany(long periodId);

    List<CompanyPeriodAmount> receivedByCompanyAndPeriod();
}
