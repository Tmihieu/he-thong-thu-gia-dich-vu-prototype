package vn.dongthanh.vsmt.masterdata.service;

import vn.dongthanh.vsmt.platform.security.CurrentUser;

/**
 * Cán bộ xã vừa bật miễn 100% cho một hợp đồng (tạo mới hoặc sửa từ không miễn sang miễn). Phát trong cùng transaction;
 * module lãnh đạo tạo đề nghị miễn giảm để lãnh đạo duyệt sau (SPEC §9.10, T56).
 */
public record ContractExemptedEvent(Long contractId, String reason, String decisionNo, CurrentUser actor) {
}
