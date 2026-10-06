package vn.dongthanh.vsmt.citizen.api;

import java.util.List;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.CitizenAccountDto;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.CitizenChargeDto;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.CitizenLoginResponse;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.CitizenProfileDto;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.OtpRequest;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.OtpRequestResponse;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.OtpVerifyRequest;
import vn.dongthanh.vsmt.citizen.api.CitizenDtos.PaymentConfirmationDto;
import vn.dongthanh.vsmt.citizen.service.CitizenAuthService;
import vn.dongthanh.vsmt.citizen.service.CitizenAuthService.LoginResult;
import vn.dongthanh.vsmt.citizen.service.CitizenPaymentService;
import vn.dongthanh.vsmt.citizen.service.CitizenQueryService;
import vn.dongthanh.vsmt.collection.api.BankTransferController.TransferInfoDto;
import vn.dongthanh.vsmt.collection.service.BankTransferService;
import vn.dongthanh.vsmt.platform.security.CurrentCitizen;

@Tag(name = "App người dân: tài khoản, hộ, khoản phải đóng, chuyển khoản VietQR")
@RestController
@RequestMapping("/api/citizen")
@RequiredArgsConstructor
public class CitizenController {

    private final CitizenAuthService auth;
    private final CitizenQueryService query;
    private final CitizenPaymentService payments;
    private final BankTransferService transfers;

    @Operation(summary = "Yêu cầu mã OTP (mô phỏng, không gửi SMS)")
    @SecurityRequirements
    @PostMapping("/auth/otp/request")
    public OtpRequestResponse requestOtp(@Valid @RequestBody OtpRequest request) {
        auth.requestOtp(request.phone());
        return new OtpRequestResponse(true,
                "Đã gửi mã OTP (mô phỏng). Bản demo không gửi SMS, dùng mã OTP được cung cấp.",
                CitizenAuthService.OTP_TTL_SECONDS);
    }

    @Operation(summary = "Xác nhận SĐT + OTP, nhận access token người dân")
    @SecurityRequirements
    @PostMapping("/auth/otp/verify")
    public CitizenLoginResponse verifyOtp(@Valid @RequestBody OtpVerifyRequest request) {
        LoginResult result = auth.verifyOtp(request.phone(), request.otp());
        return new CitizenLoginResponse(result.token().value(), "Bearer", result.token().expiresAt(),
                CitizenAccountDto.of(result.account()));
    }

    @Operation(summary = "Hồ sơ hộ của tài khoản đang đăng nhập")
    @GetMapping("/me")
    public CitizenProfileDto me(@AuthenticationPrincipal CurrentCitizen citizen) {
        return CitizenProfileDto.of(query.me(citizen));
    }

    @Operation(summary = "Các khoản của hộ (chưa đóng và lịch sử), kỳ mới trước")
    @GetMapping("/charges")
    public List<CitizenChargeDto> charges(@AuthenticationPrincipal CurrentCitizen citizen) {
        return query.charges(citizen).stream().map(CitizenChargeDto::of).toList();
    }

    @Operation(summary = "Chi tiết một khoản của hộ (khoản của hộ khác trả 404)")
    @GetMapping("/charges/{id}")
    public CitizenChargeDto charge(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        return CitizenChargeDto.of(query.charge(citizen, id));
    }

    @Operation(summary = "Thông tin chuyển khoản (VietQR) cho một khoản của hộ: tài khoản công ty, số cần đóng, mã nội dung")
    @GetMapping("/charges/{id}/transfer-info")
    public TransferInfoDto transferInfo(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        return TransferInfoDto.of(transfers.transferInfoOfSubject(id, query.requireActive(citizen).getSubject().getId()));
    }

    @Operation(summary = "Các xác nhận thanh toán của hộ (mọi hình thức), mới nhất trước")
    @GetMapping("/payments")
    public List<PaymentConfirmationDto> confirmations(@AuthenticationPrincipal CurrentCitizen citizen) {
        return payments.confirmations(citizen).stream().map(PaymentConfirmationDto::of).toList();
    }

    @Operation(summary = "Xác nhận thanh toán (không phải biên lai pháp lý, O1)")
    @GetMapping("/payments/{id}/confirmation")
    public PaymentConfirmationDto confirmation(@AuthenticationPrincipal CurrentCitizen citizen, @PathVariable Long id) {
        return PaymentConfirmationDto.of(payments.confirmation(citizen, id));
    }
}
