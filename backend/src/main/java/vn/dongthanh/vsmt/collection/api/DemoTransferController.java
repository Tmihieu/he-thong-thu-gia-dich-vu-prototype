package vn.dongthanh.vsmt.collection.api;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import vn.dongthanh.vsmt.collection.service.BankTransferService;
import vn.dongthanh.vsmt.platform.security.CurrentUser;

/** Chỉ profile demo: nút "Mô phỏng chuyển khoản" trên màn QR, thay cho việc chạy scripts/simulate-bank-transfer.sh. */
@Tag(name = "Thu tiền: mô phỏng chuyển khoản (demo)")
@Profile("demo")
@RestController
@RequiredArgsConstructor
public class DemoTransferController {

    private final BankTransferService service;

    @Operation(summary = "Demo: giả lập ngân hàng báo hộ đã chuyển đúng số còn phải đóng của khoản")
    @PostMapping("/api/collection/charges/{id}/simulate-transfer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void simulate(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        service.simulate(id, actor);
    }
}
