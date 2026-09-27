package vn.dongthanh.vsmt.citizen;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.collection.domain.PaymentMethod;
import vn.dongthanh.vsmt.collection.service.CollectionService;
import vn.dongthanh.vsmt.collection.service.CollectionService.PaymentCommand;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;
import vn.dongthanh.vsmt.support.MutableClock;

/** Hộ A = DTH-H000001 (KV07, DV01); hộ B = DTH-H000005 (KV12, DV07). */
@Transactional
@Import({FixedClockConfig.class, CollectionFixture.class})
class CitizenApiIT extends IntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired CollectionService collection;
    @Autowired JwtService jwt;
    @Autowired MutableClock clock;

    CitizenAccount citizenA;
    CitizenAccount citizenB;

    @BeforeEach
    void setUp() {
        fx.build();
        citizenA = accounts.save(CitizenAccount.create("0902000001",
                subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
        citizenB = accounts.save(CitizenAccount.create("0902000005",
                subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
    }

    @AfterEach
    void resetClock() {
        clock.reset();
    }

    @Test
    void meReturnsOwnHouseholdProfileWithContractAndServingCompany() throws Exception {
        mvc.perform(get("/api/citizen/me").header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountId").value(citizenA.getId()))
                .andExpect(jsonPath("$.displayName").value("Chủ hộ A"))
                .andExpect(jsonPath("$.subject.code").value("DTH-H000001"))
                .andExpect(jsonPath("$.subject.name").value("Hộ mẫu 1"))
                .andExpect(jsonPath("$.subject.subjectType").value("HOUSEHOLD"))
                .andExpect(jsonPath("$.subject.areaCode").value("KV07"))
                .andExpect(jsonPath("$.subject.districtCode").value("DTH"))
                .andExpect(jsonPath("$.contract.contractNo").value("ĐK-FX-1"))
                .andExpect(jsonPath("$.contract.tariffGroup").value("HH_3_PLUS"))
                .andExpect(jsonPath("$.contract.exempt").value(false))
                .andExpect(jsonPath("$.company.code").value("DV01"))
                .andExpect(jsonPath("$.company.contactPhone").value("0900000001"))
                .andExpect(jsonPath("$.subject.note").doesNotExist());
    }

    @Test
    void chargesListOnlyOwnHouseholdWithPaidAndRemainingAmounts() throws Exception {
        long chargeA = fx.chargeId("DTH-H000001");
        collection.recordPayment(new PaymentCommand(chargeA, 30_000, PaymentMethod.CASH, "req-citizen-1", null, null,
                null), fx.actor(fx.thu07));

        mvc.perform(get("/api/citizen/charges").header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(chargeA))
                .andExpect(jsonPath("$[0].periodCode").value(fx.october.getCode()))
                .andExpect(jsonPath("$[0].feeTypeName").value("Phí VSMT"))
                .andExpect(jsonPath("$[0].amount").value(80_000))
                .andExpect(jsonPath("$[0].paidAmount").value(30_000))
                .andExpect(jsonPath("$[0].remainingAmount").value(50_000))
                .andExpect(jsonPath("$[0].status").value("UNPAID"))
                .andExpect(jsonPath("$[0].dueDate").value("2026-10-25"))
                .andExpect(jsonPath("$[0].overdue").value(false));

        mvc.perform(get("/api/citizen/charges").header(HttpHeaders.AUTHORIZATION, bearer(citizenB)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(contains((int) fx.chargeId("DTH-H000005"))))
                .andExpect(jsonPath("$[0].paidAmount").value(0));
    }

    @Test
    void chargeIsOverdueAfterDueDateWhileUnpaid() throws Exception {
        clock.set(Instant.parse("2026-10-26T02:00:00Z"));

        mvc.perform(get("/api/citizen/charges").header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(jsonPath("$[0].overdue").value(true));
    }

    @Test
    void chargeDetailOfAnotherHouseholdReturns404() throws Exception {
        long chargeA = fx.chargeId("DTH-H000001");
        long chargeOfSameAreaNeighbour = fx.chargeId("DTH-H000002");
        long chargeB = fx.chargeId("DTH-H000005");

        mvc.perform(get("/api/citizen/charges/{id}", chargeA).header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").isNotEmpty());
        for (long other : new long[] {chargeOfSameAreaNeighbour, chargeB, 999_999L}) {
            mvc.perform(get("/api/citizen/charges/{id}", other).header(HttpHeaders.AUTHORIZATION, bearer(citizenA)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("CHARGE_NOT_FOUND"));
        }
    }

    @Test
    void lockedAccountTokenIsRejected() throws Exception {
        String token = bearer(citizenA);
        citizenA.lock();
        accounts.flush();

        mvc.perform(get("/api/citizen/me").header(HttpHeaders.AUTHORIZATION, token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    private String bearer(CitizenAccount a) {
        return "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value();
    }
}
