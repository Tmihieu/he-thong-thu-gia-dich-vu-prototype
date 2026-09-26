package vn.dongthanh.vsmt.platform.common;

import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

/** Swagger UI: nút "Authorize" nhận access token từ {@code POST /api/platform/auth/login}. */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "VSMT API", version = "0.1", description = "Demo thu giá dịch vụ VSMT xã Đông Thạnh"),
        security = @SecurityRequirement(name = OpenApiConfig.BEARER))
@SecurityScheme(name = OpenApiConfig.BEARER, type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {

    public static final String BEARER = "bearer";
}
