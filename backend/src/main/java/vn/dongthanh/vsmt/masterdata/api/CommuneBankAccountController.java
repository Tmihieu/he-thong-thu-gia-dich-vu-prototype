package vn.dongthanh.vsmt.masterdata.api;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.masterdata.domain.CommuneBankAccount;
import vn.dongthanh.vsmt.masterdata.service.CommuneBankAccountService;
import vn.dongthanh.vsmt.platform.common.NotFoundException;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Danh mục: tài khoản nhận chuyển khoản của xã")
@RestController
@RequestMapping("/api/masterdata/commune-bank-account")
@RequiredArgsConstructor
public class CommuneBankAccountController {

    private final CommuneBankAccountService service;

    public record CommuneBankAccountDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String bankName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String accountNumber,
            @Schema(requiredMode = RequiredMode.REQUIRED) String accountHolder) {

        static CommuneBankAccountDto of(CommuneBankAccount a) {
            return new CommuneBankAccountDto(a.getBankName(), a.getAccountNumber(), a.getAccountHolder());
        }
    }

    public record SaveRequest(
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 100) String bankName,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 50) String accountNumber,
            @Schema(requiredMode = RequiredMode.REQUIRED) @NotBlank(message = "không được để trống") @Size(max = 150) String accountHolder) {
    }

    @Operation(summary = "Xem tài khoản nhận chuyển khoản của xã (mọi vai trò nội bộ); 404 nếu chưa khai")
    @GetMapping
    public CommuneBankAccountDto get() {
        return service.find().map(CommuneBankAccountDto::of).orElseThrow(() -> new NotFoundException(
                "COMMUNE_BANK_ACCOUNT_MISSING", "Xã chưa khai tài khoản nhận chuyển khoản."));
    }

    @Operation(summary = "Khai báo / sửa tài khoản nhận chuyển khoản của xã (quản trị viên)")
    @PutMapping
    public CommuneBankAccountDto save(@Valid @RequestBody SaveRequest req, @AuthenticationPrincipal CurrentUser actor) {
        return CommuneBankAccountDto.of(service.save(
                new CommuneBankAccountService.Command(req.bankName(), req.accountNumber(), req.accountHolder()), actor));
    }
}
