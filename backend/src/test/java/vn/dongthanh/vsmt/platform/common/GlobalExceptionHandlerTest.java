package vn.dongthanh.vsmt.platform.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;

class GlobalExceptionHandlerTest {

    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void businessRuleReturns422WithCodeAndMessage() throws Exception {
        mvc.perform(get("/rule"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("RECEIPT_AMOUNT_OUT_OF_RANGE"))
                .andExpect(jsonPath("$.message").value("Số tiền phải lớn hơn 0"));
    }

    @Test
    void conflictReturns409() throws Exception {
        mvc.perform(get("/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CHARGE_DUPLICATED"));
    }

    @Test
    void notFoundReturns404() throws Exception {
        mvc.perform(get("/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("COMPANY_NOT_FOUND"));
    }

    @Test
    void accessDeniedReturns403() throws Exception {
        mvc.perform(get("/denied"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(GlobalExceptionHandler.FORBIDDEN));
    }

    @Test
    void invalidBodyReturns400() throws Exception {
        mvc.perform(post("/validate").contentType(MediaType.APPLICATION_JSON).content("{\"amount\": -1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(GlobalExceptionHandler.VALIDATION_ERROR))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("amount")));
    }

    @Test
    void malformedJsonReturns400() throws Exception {
        mvc.perform(post("/validate").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(GlobalExceptionHandler.VALIDATION_ERROR));
    }

    @Test
    void unknownPathReturns404() throws Exception {
        mvc.perform(get("/khong-co"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(GlobalExceptionHandler.NOT_FOUND));
    }

    @Test
    void unexpectedErrorReturns500WithoutLeakingDetails() throws Exception {
        mvc.perform(get("/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(GlobalExceptionHandler.INTERNAL_ERROR))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("secret"))));
    }

    record AmountRequest(@Positive long amount) {
    }

    // Lớp lồng trong lớp test nên Spring Boot không quét nó vào context của integration test.
    @RestController
    static class ThrowingController {

        @GetMapping("/rule")
        String rule() {
            throw new BusinessRuleException("RECEIPT_AMOUNT_OUT_OF_RANGE", "Số tiền phải lớn hơn 0");
        }

        @GetMapping("/conflict")
        String conflict() {
            throw new ConflictException("CHARGE_DUPLICATED", "Khoản thu đã tồn tại");
        }

        @GetMapping("/missing")
        String missing() {
            throw new NotFoundException("COMPANY_NOT_FOUND", "Không tìm thấy công ty");
        }

        @GetMapping("/denied")
        String denied() {
            throw new AccessDeniedException("x");
        }

        @PostMapping("/validate")
        String validate(@Valid @RequestBody AmountRequest body) {
            return "ok";
        }

        @GetMapping("/boom")
        String boom() {
            throw new IllegalStateException("secret stack detail");
        }
    }
}
