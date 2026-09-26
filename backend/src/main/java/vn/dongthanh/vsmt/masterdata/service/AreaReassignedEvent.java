package vn.dongthanh.vsmt.masterdata.service;

import java.time.LocalDate;

/**
 * Khu vực chuyển từ công ty cũ sang công ty mới từ ngày {@code fromDate}. Phát trong cùng transaction phân công;
 * phân tổ người đi thu (T20) nghe sự kiện này để tự kết thúc phân tổ của công ty cũ (G14).
 */
public record AreaReassignedEvent(Long areaId, Long oldCompanyId, Long newCompanyId, LocalDate fromDate) {
}
