package vn.dongthanh.vsmt.masterdata;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

import vn.dongthanh.vsmt.masterdata.service.GoongClient;
import vn.dongthanh.vsmt.masterdata.service.GoongClient.Status;

/** Goong thật được thay bằng máy chủ cục bộ: kiểm lọc kết quả, hết hạn mức, lỗi máy chủ, chậm, chưa cấu hình khóa. */
class GoongClientTest {

    static final String OK = """
            {"status":"OK","predictions":[
             {"place_id":"p1","types":[],"structured_formatting":{"main_text":"Đường Nguyễn Văn Bứa","secondary_text":"Xuân Thới Sơn, Hồ Chí Minh"}},
             {"place_id":"p2","types":["route"],"structured_formatting":{"main_text":"Hẻm 5","secondary_text":"Đông Thạnh"}},
             {"place_id":"p3","types":["establishment","store"],"structured_formatting":{"main_text":"Cửa hàng Sang","secondary_text":"Bà Điểm"}},
             {"place_id":"p4","types":[],"structured_formatting":{"main_text":"12/5 Đường Nguyễn Văn Bứa","secondary_text":"Bà Điểm"}},
             {"place_id":"p6","types":[],"structured_formatting":{"main_text":"Lẩu mắm 71","secondary_text":"32/3 Lê Văn Khương, Thới An, Hồ Chí Minh"}},
             {"place_id":"p7","types":[],"structured_formatting":{"main_text":"Chợ Tân An","secondary_text":"Quốc Lộ 279, Văn Lang, Thái Nguyên"}},
             {"place_id":"p5","types":["administrative_area_level_2","political"],"structured_formatting":{"main_text":"Ấp 4","secondary_text":"Đông Thạnh"}}]}""";

    HttpServer server;
    int code = 200;
    String body = OK;
    long delayMs = 0;
    final AtomicReference<String> lastQuery = new AtomicReference<>();

    @BeforeEach
    void start() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", ex -> {
            lastQuery.set(ex.getRequestURI().getRawQuery());
            try {
                Thread.sleep(delayMs);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            byte[] out = body.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("Content-Type", "application/json");
            ex.sendResponseHeaders(code, out.length);
            ex.getResponseBody().write(out);
            ex.close();
        });
        server.start();
    }

    @AfterEach
    void stop() {
        server.stop(0);
    }

    GoongClient client(String key) {
        return client(key, Duration.ofSeconds(5));
    }

    GoongClient client(String key, Duration timeout) {
        return new GoongClient("http://127.0.0.1:" + server.getAddress().getPort(), key, timeout);
    }

    @Test
    void keepsOnlyStreetLikeResultsAndSendsKeyOnlyToGoong() {
        GoongClient.Result r = client("k-test").autocomplete("nguyen van bua", 5);

        assertThat(r.status()).isEqualTo(Status.OK);
        assertThat(r.items()).extracting(GoongClient.Suggestion::name).containsExactly("Đường Nguyễn Văn Bứa", "Hẻm 5");
        assertThat(lastQuery.get()).contains("api_key=k-test", "more_compound=true", "limit=10")
                .doesNotContain("location", "radius");
    }

    @Test
    void searchesAroundCommuneWhenLocationConfigured() {
        new GoongClient("http://127.0.0.1:" + server.getAddress().getPort(), "k", Duration.ofSeconds(5),
                "10.8975,106.6315", 8).autocomplete("le van khuong", 5);

        assertThat(lastQuery.get()).contains("location=10.8975,106.6315", "radius=8");
    }

    @Test
    void notConfiguredWhenKeyBlankAndNoCallIsMade() {
        assertThat(client("  ").autocomplete("x", 5).status()).isEqualTo(Status.NOT_CONFIGURED);
        assertThat(lastQuery.get()).isNull();
    }

    @Test
    void quotaOrBadKeyIsRejectedAndServerErrorOrSlowIsUnavailable() {
        code = 429;
        assertThat(client("k").autocomplete("x", 5).status()).isEqualTo(Status.REJECTED);
        code = 403;
        assertThat(client("k").autocomplete("x", 5).status()).isEqualTo(Status.REJECTED);
        code = 500;
        assertThat(client("k").autocomplete("x", 5).status()).isEqualTo(Status.UNAVAILABLE);

        code = 200;
        delayMs = 1500;
        assertThat(client("k", Duration.ofMillis(300)).autocomplete("x", 5).status()).isEqualTo(Status.UNAVAILABLE);
    }

    @Test
    void zeroResultsIsOkAndGarbageIsUnavailable() {
        body = "{\"status\":\"ZERO_RESULTS\",\"predictions\":[]}";
        assertThat(client("k").autocomplete("x", 5)).satisfies(r -> {
            assertThat(r.status()).isEqualTo(Status.OK);
            assertThat(r.items()).isEmpty();
        });
        body = "{\"status\":\"INVALID_REQUEST\"}";
        assertThat(client("k").autocomplete("x", 5).status()).isEqualTo(Status.UNAVAILABLE);
    }
}
