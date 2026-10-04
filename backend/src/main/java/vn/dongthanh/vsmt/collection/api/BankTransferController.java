package vn.dongthanh.vsmt.collection.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.media.Schema.RequiredMode;
import io.swagger.v3.oas.annotations.tags.Tag;
import vn.dongthanh.vsmt.collection.domain.BankTransfer;
import vn.dongthanh.vsmt.collection.service.BankTransferService;
import vn.dongthanh.vsmt.collection.service.BankTransferService.Incoming;
import vn.dongthanh.vsmt.collection.service.BankTransferService.TransferInfo;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

@Tag(name = "Thu tiền: chuyển khoản qua SePay")
@RestController
public class BankTransferController {

    /** Đường dẫn SePay gọi tới; mở công khai ở SecurityConfig, xác thực bằng khóa trong header. */
    public static final String WEBHOOK_PATH = "/api/payments/sepay/webhook";

    private final BankTransferService service;
    private final byte[] expectedAuthorization;

    public BankTransferController(BankTransferService service, @Value("${vsmt.sepay.webhook-api-key:}") String apiKey) {
        this.service = service;
        this.expectedAuthorization = apiKey.isBlank() ? null : ("Apikey " + apiKey.trim()).getBytes(StandardCharsets.UTF_8);
    }

    /** Giao dịch SePay gửi (https://docs.sepay.vn/tich-hop-webhooks.html); trường lạ bỏ qua. */
    public record SepayTransaction(Long id, String gateway, String transactionDate, String accountNumber, String code,
            String content, String transferType, Long transferAmount, String referenceCode) {
    }

    @Operation(summary = "Webhook SePay: giao dịch tiền vào tài khoản công ty; header Authorization: Apikey <khóa>")
    @PostMapping(WEBHOOK_PATH)
    public ResponseEntity<Map<String, Object>> webhook(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody SepayTransaction tx) {
        if (expectedAuthorization == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("success", false, "message", "Chưa cấu hình SEPAY_WEBHOOK_API_KEY."));
        }
        // So sánh thời gian cố định để không lộ khóa qua thời gian trả lời.
        if (authorization == null
                || !MessageDigest.isEqual(expectedAuthorization, authorization.trim().getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false));
        }
        if (tx.id() == null || tx.transferAmount() == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Thiếu id hoặc transferAmount."));
        }
        // Chỉ xử lý tiền vào; tiền ra trả thành công để SePay không gửi lại.
        if ("in".equalsIgnoreCase(tx.transferType()) && tx.transferAmount() > 0) {
            service.handle(new Incoming(tx.id(), tx.gateway(), tx.transactionDate(), tx.accountNumber(), tx.code(),
                    tx.content(), tx.transferAmount(), tx.referenceCode()));
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    public record TransferInfoDto(
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Công ty đã khai tài khoản ngân hàng") boolean configured,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String bankName,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String bankAccount,
            @Schema(requiredMode = RequiredMode.REQUIRED) String accountHolder,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Số còn thiếu của khoản") long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, description = "Mã ghi trong nội dung chuyển khoản") String code) {

        public static TransferInfoDto of(TransferInfo i) {
            return new TransferInfoDto(i.configured(), i.bankName(), i.bankAccount(), i.accountHolder(), i.amount(), i.code());
        }
    }

    @Operation(summary = "Thông tin chuyển khoản của một khoản: tài khoản công ty, số tiền còn thiếu, mã nội dung")
    @GetMapping("/api/collection/charges/{id}/transfer-info")
    public TransferInfoDto transferInfo(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return TransferInfoDto.of(service.transferInfo(id, actor));
    }

    public record BankTransferDto(
            @Schema(requiredMode = RequiredMode.REQUIRED) Long id,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String gateway,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String accountNumber,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String transactionDate,
            @Schema(requiredMode = RequiredMode.REQUIRED) long amount,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String content,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) String referenceCode,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) BankTransfer.Reason reason,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long chargeId,
            @Schema(requiredMode = RequiredMode.REQUIRED, nullable = true) Long companyId,
            @Schema(requiredMode = RequiredMode.REQUIRED) OffsetDateTime createdAt) {

        static BankTransferDto of(BankTransfer t) {
            return new BankTransferDto(t.getId(), t.getGateway(), t.getAccountNumber(), t.getTransactionDate(), t.getAmount(),
                    t.getContent(), t.getReferenceCode(), t.getReason(), t.getChargeId(), t.getCompanyId(), t.getCreatedAt());
        }
    }

    @Operation(summary = "Chuyển khoản chờ đối chiếu (không tự khớp được với khoản thu); công ty chỉ thấy của mình")
    @GetMapping("/api/collection/bank-transfers/unmatched")
    public List<BankTransferDto> unmatched(@AuthenticationPrincipal CurrentUser actor) {
        return service.unmatched(actor).stream().map(BankTransferDto::of).toList();
    }
}
