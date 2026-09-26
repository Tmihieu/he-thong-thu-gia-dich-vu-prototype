package vn.dongthanh.vsmt.remittance;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService;
import vn.dongthanh.vsmt.masterdata.service.AreaAssignmentService.AssignCommand;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class LedgerApiIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CollectionService collection;
    @Autowired AreaAssignmentService areaAssignments;

    @BeforeEach
    void seed() {
        fx.build();
        collection.recordPayment(new PaymentCommand(fx.chargeId("DTH-H000001"), 80_000, PaymentMethod.CASH, "p-1", null,
                null, null), fx.actor(fx.thu07));
    }

    @Test
    void communeSeesEveryCompanyWithAggregatedFigures() throws Exception {
        ledger(fx.officer)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].companyCode", contains("DV01", "DV07")))
                .andExpect(jsonPath("$[0].due").value(320_000))
                .andExpect(jsonPath("$[0].chargeCount").value(4))
                .andExpect(jsonPath("$[0].collected").value(80_000))
                .andExpect(jsonPath("$[0].received").value(0))
                .andExpect(jsonPath("$[0].remaining").value(320_000))
                .andExpect(jsonPath("$[0].gap").value(-80_000))
                .andExpect(jsonPath("$[0].collectionRate").value(25.0))
                .andExpect(jsonPath("$[0].lowCollectionRate").value(true))
                .andExpect(jsonPath("$[0].progress").value("NOT_PAID"))
                .andExpect(jsonPath("$[0].reconciliation").value("PENDING"))
                .andExpect(jsonPath("$[1].due").value(160_000));
        ledger(fx.admin).andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void companySeesOnlyItsOwnRowAndCollectorIsDenied() throws Exception {
        ledger(fx.dv07Manager)
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].companyCode").value("DV07"))
                .andExpect(jsonPath("$[0].due").value(160_000));
        ledger(fx.thu07).andExpect(status().isForbidden());
    }

    @Test
    void movingAnAreaToAnotherCompanyAfterIssueKeepsThePeriodOnTheOldCompany() throws Exception {
        areaAssignments.assign(new AssignCommand(List.of(fx.kv12.getId()), fx.dv01.getId(), LocalDate.of(2026, 11, 1),
                null, null), fx.actor(fx.officer));

        ledger(fx.officer)
                .andExpect(jsonPath("$[?(@.companyCode == 'DV07')].due").value(contains(160_000)))
                .andExpect(jsonPath("$[?(@.companyCode == 'DV01')].due").value(contains(320_000)));
    }

    private ResultActions ledger(User user) throws Exception {
        return mvc.perform(get("/api/remittance/ledger").param("periodId", fx.october.getId().toString())
                .header(HttpHeaders.AUTHORIZATION, fx.bearer(user)));
    }
}
