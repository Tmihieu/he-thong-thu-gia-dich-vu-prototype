package vn.dongthanh.vsmt.masterdata;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;

import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * API đọc khu vực qua phân công đang hiệu lực, gọi như server thật (không có transaction của test bao ngoài): khu vực
 * nạp trước bởi {@code findActiveOn} là bản dùng chung của cả transaction, DTO còn đọc mã địa bàn sau khi transaction
 * đóng nên địa bàn phải được nạp sẵn.
 */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class AreaScopedApiNoTransactionIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;

    @BeforeEach
    void seed() {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> fx.build());
    }

    @AfterEach
    void clean() {
        cleaner.truncateAll();
    }

    @Test
    void areaProgressReadsDistrictOutsideTransaction() throws Exception {
        String path = "/api/remittance/area-progress?periodId=" + fx.october.getId();
        ok(path, fx.officer)
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[*].districtCode", everyItem(is("DTH"))));
        ok(path, fx.dv01Manager)
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].districtCode", everyItem(is("DTH"))));
    }

    @Test
    void companyStaffSubjectSearchReadsDistrictOutsideTransaction() throws Exception {
        // Quản lý công ty thấy hộ của mọi tổ công ty phụ trách; người đi thu chỉ thấy hộ trong tổ mình (BR-GEN-04).
        ok("/api/masterdata/subjects", fx.dv01Manager)
                .andExpect(jsonPath("$.total").value(4))
                .andExpect(jsonPath("$.items[*].districtCode", everyItem(is("DTH"))));
        ok("/api/masterdata/subjects", fx.thu07)
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[*].districtCode", everyItem(is("DTH"))));
    }

    private ResultActions ok(String path, User user) throws Exception {
        return mvc.perform(get(path).header(HttpHeaders.AUTHORIZATION, fx.bearer(user))).andExpect(status().isOk());
    }
}
