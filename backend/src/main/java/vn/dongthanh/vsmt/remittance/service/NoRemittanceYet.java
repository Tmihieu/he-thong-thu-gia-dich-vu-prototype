package vn.dongthanh.vsmt.remittance.service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import vn.dongthanh.vsmt.remittance.service.LedgerQueries.CompanyPeriodAmount;

/** Chưa có phiếu thu công ty (T26 thay bằng tổng từ bảng company_receipts). */
@Component
public class NoRemittanceYet implements RemittedTotals {

    @Override
    public Map<Long, Received> receivedByCompany(long periodId) {
        return Map.of();
    }

    @Override
    public List<CompanyPeriodAmount> receivedByCompanyAndPeriod() {
        return List.of();
    }
}
