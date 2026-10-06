package vn.dongthanh.vsmt.masterdata.service;

import java.time.LocalDate;

/**
 * Khu vực chuyển từ công ty cũ sang công ty mới từ ngày {@code fromDate}. Phát trong cùng transaction phân công;
 * hiện chưa có nơi nghe (phân tổ người đi thu đã bỏ, UC-12).
 */
public record AreaReassignedEvent(Long areaId, Long oldCompanyId, Long newCompanyId, LocalDate fromDate) {
}
