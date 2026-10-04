package vn.dongthanh.vsmt.masterdata.service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.ActiveStatus;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.CompanyRepository;
import vn.dongthanh.vsmt.masterdata.domain.CompanyType;
import vn.dongthanh.vsmt.platform.common.BusinessRuleException;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;

/** Cán bộ xã thêm / sửa công ty môi trường (màn Công ty). Mã tự sinh {@code DVnn}, không đổi sau khi tạo. */
@Service
@RequiredArgsConstructor
@Transactional
public class CompanyService {

    static final String ENTITY = "Company";

    private final CompanyRepository companies;
    private final AuditService audit;

    public record CompanyCommand(String name, String contactName, String contactPhone, ActiveStatus status,
            LocalDate validFrom, LocalDate validTo, CompanyType orgType, String taxCode, String address, String email,
            String communeContractNo, String bankAccount, String bankName) {
    }

    public Company create(CompanyCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        int next = companies.maxCodeNumber() + 1;
        if (next > 99) {
            throw new BusinessRuleException("COMPANY_CODE_EXHAUSTED", "Đã dùng hết mã công ty DV01–DV99.");
        }
        Company company = Company.create("DV%02d".formatted(next), cmd.name().trim(), cmd.contactName().trim(),
                cmd.contactPhone(), cmd.validFrom());
        apply(company, cmd);
        Company saved = companies.save(company);
        audit.record(actor, "CREATE_COMPANY", ENTITY, saved.getCode(), null, snapshot(saved));
        return saved;
    }

    public Company update(Long id, CompanyCommand cmd, CurrentUser actor) {
        actor.requireRole(Role.ADMIN);
        Company company = companies.findById(id)
                .orElseThrow(() -> new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty."));
        Map<String, Object> before = snapshot(company);
        company.setName(cmd.name().trim());
        company.setContactName(cmd.contactName().trim());
        company.setContactPhone(cmd.contactPhone());
        company.setValidFrom(cmd.validFrom());
        apply(company, cmd);
        audit.record(actor, "UPDATE_COMPANY", ENTITY, company.getCode(), before, snapshot(company));
        return company;
    }

    private static void apply(Company c, CompanyCommand cmd) {
        if (cmd.validTo() != null && cmd.validTo().isBefore(cmd.validFrom())) {
            throw new BusinessRuleException("COMPANY_VALIDITY", "Hiệu lực đến không được trước hiệu lực từ.");
        }
        if (cmd.status() != null) {
            c.setStatus(cmd.status());
        }
        c.setValidTo(cmd.validTo());
        c.setOrgType(cmd.orgType());
        c.setTaxCode(blankToNull(cmd.taxCode()));
        c.setAddress(blankToNull(cmd.address()));
        c.setEmail(blankToNull(cmd.email()));
        c.setCommuneContractNo(blankToNull(cmd.communeContractNo()));
        c.setBankAccount(blankToNull(cmd.bankAccount()));
        c.setBankName(blankToNull(cmd.bankName()));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Map<String, Object> snapshot(Company c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("code", c.getCode());
        m.put("name", c.getName());
        m.put("contactName", c.getContactName());
        m.put("contactPhone", c.getContactPhone());
        m.put("status", c.getStatus());
        m.put("validFrom", c.getValidFrom());
        m.put("validTo", c.getValidTo());
        m.put("orgType", c.getOrgType());
        m.put("taxCode", c.getTaxCode());
        m.put("address", c.getAddress());
        m.put("email", c.getEmail());
        m.put("communeContractNo", c.getCommuneContractNo());
        m.put("bankAccount", c.getBankAccount());
        m.put("bankName", c.getBankName());
        return m;
    }
}
