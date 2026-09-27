package vn.dongthanh.vsmt.citizen.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import vn.dongthanh.vsmt.billing.domain.Charge;
import vn.dongthanh.vsmt.billing.domain.ChargeStatus;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.service.CitizenQueryService.ChargeView;
import vn.dongthanh.vsmt.citizen.service.CitizenQueryService.Profile;
import vn.dongthanh.vsmt.masterdata.domain.Company;
import vn.dongthanh.vsmt.masterdata.domain.ServiceContract;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubject;
import vn.dongthanh.vsmt.masterdata.domain.SubjectStatus;
import vn.dongthanh.vsmt.masterdata.domain.SubjectType;
import vn.dongthanh.vsmt.masterdata.domain.TariffGroup;

public final class CitizenDtos {

    private static final String PHONE_INPUT = "^[+0-9 .()\\-]{9,20}$";
    private static final String PHONE_MESSAGE = "chỉ gồm chữ số, có thể bắt đầu bằng +84";

    private CitizenDtos() {
    }

    public record OtpRequest(
            @Schema(example = "0902000128")
            @NotBlank(message = "không được để trống") @Pattern(regexp = PHONE_INPUT, message = PHONE_MESSAGE)
            String phone) {
    }

    public record OtpRequestResponse(
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Luôn true: không gửi SMS thật (O7)")
            boolean simulated,
            @Schema(requiredMode = RequiredMode.REQUIRED) String message,
            @Schema(requiredMode = RequiredMode.REQUIRED) int expiresInSeconds) {
    }

    public record OtpVerifyRequest(
            @Schema(example = "0902000128")
            @NotBlank(message = "không được để trống") @Pattern(regexp = PHONE_INPUT, message = PHONE_MESSAGE)
            String phone,
            @NotBlank(message = "không được để trống") @Pattern(regexp = "^\\s*\\d{4,8}\\s*$", message = "gồm 4–8 chữ số")
            String otp) {

        @Override
        public String toString() {
            return "OtpVerifyRequest[phone=" + phone + ", otp=***]";
        }
    }

    public record CitizenAccountDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "0902000128") String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED) String displayName,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long subjectId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH-H000128") String subjectCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String subjectName) {

        static CitizenAccountDto of(CitizenAccount a) {
            ServiceSubject s = a.getSubject();
            return new CitizenAccountDto(a.getId(), a.getPhone(), a.getDisplayName(), s.getId(), s.getCode(),
                    s.getName());
        }
    }

    public record CitizenLoginResponse(
            @Schema(requiredMode = RequiredMode.REQUIRED) String accessToken,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "Bearer") String tokenType,
            @Schema(requiredMode = RequiredMode.REQUIRED) Instant expiresAt,
            @Schema(requiredMode = RequiredMode.REQUIRED) CitizenAccountDto account) {
    }

    public record HouseholdDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH-H000128") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) SubjectType subjectType,
            @Schema(requiredMode = RequiredMode.REQUIRED) String address,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED) SubjectStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Integer memberCount,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long areaId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KV07") String areaCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String areaName,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DTH") String districtCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String districtName) {

        static HouseholdDto of(ServiceSubject s) {
            return new HouseholdDto(s.getId(), s.getCode(), s.getName(), s.getSubjectType(), s.getAddress(),
                    s.getPhone(), s.getStatus(), s.getMemberCount(), s.getArea().getId(), s.getArea().getCode(),
                    s.getArea().getName(), s.getArea().getDistrict().getCode(), s.getArea().getDistrict().getName());
        }
    }

    public record HouseholdContractDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) String contractNo,
            @Schema(requiredMode = RequiredMode.REQUIRED) TariffGroup tariffGroup,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate validFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) LocalDate validTo,
            @Schema(requiredMode = RequiredMode.REQUIRED) boolean exempt,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String exemptReason) {

        static HouseholdContractDto of(ServiceContract c) {
            return c == null ? null : new HouseholdContractDto(c.getContractNo(), c.getTariffGroup(), c.getValidFrom(),
                    c.getValidTo(), c.isExempt(), c.getExemptReason());
        }
    }

    public record ServingCompanyDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "DV01") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) String name,
            @Schema(requiredMode = RequiredMode.REQUIRED) String contactName,
            @Schema(requiredMode = RequiredMode.REQUIRED) String contactPhone) {

        static ServingCompanyDto of(Company c) {
            return c == null ? null
                    : new ServingCompanyDto(c.getId(), c.getCode(), c.getName(), c.getContactName(), c.getContactPhone());
        }
    }

    public record CitizenProfileDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long accountId,
            @Schema(requiredMode = RequiredMode.REQUIRED) String phone,
            @Schema(requiredMode = RequiredMode.REQUIRED) String displayName,
            @Schema(requiredMode = RequiredMode.REQUIRED) HouseholdDto subject,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Hợp đồng hiệu lực hôm nay; null nếu chưa có") HouseholdContractDto contract,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true,
                    description = "Công ty đang phụ trách khu vực; null nếu khu vực chưa có công ty") ServingCompanyDto company) {

        static CitizenProfileDto of(Profile p) {
            return new CitizenProfileDto(p.account().getId(), p.account().getPhone(), p.account().getDisplayName(),
                    HouseholdDto.of(p.subject()), HouseholdContractDto.of(p.contract()), ServingCompanyDto.of(p.company()));
        }
    }

    public record CitizenChargeDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "KT-1026-DTH-H000128") String code,
            @Schema(requiredMode = RequiredMode.REQUIRED) Long periodId,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "2026-10") String periodCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "Tháng 10/2026") String periodLabel,
            @Schema(requiredMode = RequiredMode.REQUIRED, example = "ENV") String feeTypeCode,
            @Schema(requiredMode = RequiredMode.REQUIRED) String feeTypeName,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long paidAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) long remainingAmount,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate coverageFrom,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate coverageTo,
            @Schema(requiredMode = RequiredMode.REQUIRED) LocalDate dueDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) ChargeStatus status,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Chưa thu và đã qua hạn đóng") boolean overdue,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) OffsetDateTime paidAt) {

        static CitizenChargeDto of(ChargeView v) {
            Charge c = v.charge();
            return new CitizenChargeDto(c.getId(), c.getCode(), c.getPeriod().getId(), c.getPeriod().getCode(),
                    c.getPeriod().getLabel(), c.getFeeType().getCode(), c.getFeeType().getName(), c.getAmount(),
                    v.paidAmount(), v.remainingAmount(), c.getCoverageFrom(), c.getCoverageTo(), c.getDueDate(),
                    c.getStatus(), v.overdue(), c.getPaidAt());
        }
    }
}
