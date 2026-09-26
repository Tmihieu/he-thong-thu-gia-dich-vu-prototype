package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;

import vn.dongthanh.vsmt.masterdata.domain.FeeType;
import vn.dongthanh.vsmt.masterdata.domain.FeeTypeRepository;
import vn.dongthanh.vsmt.masterdata.domain.PricingMode;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;
import vn.dongthanh.vsmt.masterdata.domain.TariffStatus;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersion;
import vn.dongthanh.vsmt.masterdata.domain.TariffVersionRepository;
import vn.dongthanh.vsmt.masterdata.service.TariffService;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
class TariffIT extends IntegrationTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    TariffVersionRepository versions;

    @Autowired
    FeeTypeRepository feeTypes;

    @Autowired
    TariffService tariffs;

    @Autowired
    UserRepository users;

    @Autowired
    JwtService jwt;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    EntityManager em;

    @BeforeEach
    void seed() {
        TariffVersion bg65 = TariffVersion.create("BG-65-2026", "QĐ 65/2026/QĐ-UBND", LocalDate.of(2026, 9, 1),
                LocalDate.of(2027, 6, 30), TariffStatus.ACTIVE);
        bg65.addRate(TariffGroup.HH_3_PLUS, 57_000, 23_000, "đ/hộ/tháng");
        bg65.addRate(TariffGroup.HH_UP_TO_2, 29_000, 11_000, "đ/hộ/tháng");
        versions.save(bg65);
        versions.save(TariffVersion.create("BG-DRAFT", "Dự thảo", LocalDate.of(2026, 9, 1), null, TariffStatus.DRAFT));
        feeTypes.save(FeeType.create("ENV", "Phí vệ sinh môi trường (CTRSH)", PricingMode.TARIFF, null));
        feeTypes.save(FeeType.create("EXTRA", "Phụ phí dịch vụ phát sinh", PricingMode.FIXED, 50_000L));
        versions.flush();
        em.clear(); // đọc lại từ CSDL để thấy thứ tự @OrderBy như khi chạy thật
    }

    @Test
    void tariffApiReturnsVersionsWithRatesAsDto() throws Exception {
        mvc.perform(get("/api/masterdata/tariffs").header(HttpHeaders.AUTHORIZATION, token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'BG-65-2026')].status").value(contains("ACTIVE")))
                .andExpect(jsonPath("$[?(@.code == 'BG-65-2026')].rates[*].tariffGroup")
                        .value(contains("HH_UP_TO_2", "HH_3_PLUS")))
                .andExpect(jsonPath("$[?(@.code == 'BG-65-2026')].rates[0].monthlyTotal").value(contains(40000)))
                .andExpect(jsonPath("$[0].tariffVersion").doesNotExist())
                .andExpect(jsonPath("$[0].createdAt").doesNotExist());
    }

    @Test
    void feeTypeApiReturnsDto() throws Exception {
        mvc.perform(get("/api/masterdata/fee-types").header(HttpHeaders.AUTHORIZATION, token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].code").value(contains("ENV", "EXTRA")))
                .andExpect(jsonPath("$[1].pricingMode").value("FIXED"))
                .andExpect(jsonPath("$[1].defaultPrice").value(50000));
    }

    @Test
    void draftVersionIsIgnoredWhenLookingUpByDate() {
        assertThat(tariffs.activeVersionOn(LocalDate.of(2026, 10, 1)).getCode()).isEqualTo("BG-65-2026");
        assertThat(tariffs.activeVersionOn(LocalDate.of(2027, 6, 30)).getCode()).isEqualTo("BG-65-2026");
    }

    @Test
    void overlappingActiveVersionsAreRejectedByTheDatabase() {
        assertThatThrownBy(() -> versions.saveAndFlush(TariffVersion.create("BG-CHONG", "QĐ chồng lấn",
                LocalDate.of(2027, 1, 1), null, TariffStatus.ACTIVE)))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ex_tariff_versions_active_overlap");
    }

    @Test
    void totalMustEqualComponentsInTheDatabase() {
        Long versionId = versions.findByCode("BG-65-2026").orElseThrow().getId();
        assertThatThrownBy(() -> jdbc.update("""
                insert into tariff_rates (tariff_version_id, tariff_group, collection_fee, processing_fee,
                                          monthly_total, unit_label)
                values (?, 'SMALL_GENERATOR', 100000, 0, 119000, 'đ/tháng')""", versionId))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_tariff_rates_total");
    }

    @Test
    void fixedFeeTypeWithoutPriceIsRejected() {
        assertThatThrownBy(() -> jdbc.update(
                "insert into fee_types (code, name, pricing_mode) values ('X', 'Thiếu giá', 'FIXED')"))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining("ck_fee_types_fixed_price");
    }

    private String token() {
        User user = users.save(User.create("canbo_bg", "Cán bộ", Role.COMMUNE_OFFICER, null, "x"));
        return "Bearer " + jwt.issue(user).value();
    }
}
