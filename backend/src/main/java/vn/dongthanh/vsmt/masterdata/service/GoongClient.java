package vn.dongthanh.vsmt.masterdata.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Gọi Goong Place Autocomplete v2 ({@code GET /v2/place/autocomplete}, tham số {@code input, limit, more_compound})
 * từ backend; khóa lấy từ {@code GOONG_API_KEY}, không bao giờ xuống trình duyệt hay vào log.
 *
 * <p>Goong trả lẫn đường, địa danh, cửa hàng và đơn vị hành chính (đã kiểm chứng) nên kết quả chỉ là gợi ý tham
 * khảo, không phải danh mục đường. Không lưu/cache nội dung Goong trả về; điều khoản công khai chỉ nói dùng
 * {@code place_id} cho cache backend.
 */
@Component
public class GoongClient {

    private static final Logger log = LoggerFactory.getLogger(GoongClient.class);
    /** Loại địa điểm không phải đường: cửa hàng, địa danh, đơn vị hành chính, số nhà cụ thể. */
    private static final Set<String> NOT_STREET = Set.of("establishment", "point_of_interest", "political",
            "neighborhood", "street_address", "subpremise", "premise", "locality", "sublocality");

    public enum Status {
        OK, NOT_CONFIGURED,
        /** Goong từ chối (khóa sai hoặc hết hạn mức). */
        REJECTED,
        UNAVAILABLE
    }

    public record Suggestion(String placeId, String name, String secondary) {
    }

    public record Result(Status status, List<Suggestion> items) {
        static Result of(Status s) {
            return new Result(s, List.of());
        }
    }

    private final RestClient http;
    private final String apiKey;
    private final String location;
    private final int radiusKm;

    public GoongClient(String baseUrl, String apiKey, Duration timeout) {
        this(baseUrl, apiKey, timeout, "", 0);
    }

    /** {@code location} ("vĩ độ,kinh độ") + {@code radiusKm}: chỉ tìm quanh xã, không ra kết quả cả nước. */
    @Autowired
    public GoongClient(@Value("${vsmt.goong.base-url:https://rsapi.goong.io}") String baseUrl,
            @Value("${vsmt.goong.api-key:}") String apiKey,
            @Value("${vsmt.goong.timeout:3s}") Duration timeout,
            @Value("${vsmt.goong.location:}") String location,
            @Value("${vsmt.goong.radius-km:0}") int radiusKm) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeout);
        factory.setReadTimeout(timeout);
        this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.location = location == null ? "" : location.trim();
        this.radiusKm = radiusKm;
    }

    public boolean configured() {
        return !apiKey.isEmpty();
    }

    public Result autocomplete(String input, int limit) {
        if (!configured()) {
            return Result.of(Status.NOT_CONFIGURED);
        }
        try {
            // Lấy dư rồi lọc bỏ cửa hàng/địa danh.
            JsonNode body = http.get()
                    .uri(b -> {
                        b.path("/v2/place/autocomplete").queryParam("api_key", apiKey)
                                .queryParam("input", "{input}").queryParam("limit", limit * 2)
                                .queryParam("more_compound", true);
                        if (!location.isEmpty() && radiusKm > 0) {
                            b.queryParam("location", location).queryParam("radius", radiusKm);
                        }
                        return b.build(input);
                    })
                    .retrieve().body(JsonNode.class);
            return parse(body, limit);
        } catch (RestClientResponseException e) {
            // Không ghi e.getMessage(): thông điệp có thể chứa URL kèm api_key.
            int code = e.getStatusCode().value();
            log.warn("Goong trả HTTP {}", code);
            return Result.of(code == 401 || code == 403 || code == 429 ? Status.REJECTED : Status.UNAVAILABLE);
        } catch (RestClientException | IllegalArgumentException e) {
            log.warn("Không gọi được Goong: {}", e.getClass().getSimpleName());
            return Result.of(Status.UNAVAILABLE);
        }
    }

    static Result parse(JsonNode body, int limit) {
        String status = body == null ? "" : body.path("status").asText();
        if (!"OK".equals(status)) {
            return Result.of("ZERO_RESULTS".equals(status) ? Status.OK : Status.UNAVAILABLE);
        }
        List<Suggestion> out = new ArrayList<>();
        for (JsonNode p : body.path("predictions")) {
            String main = p.path("structured_formatting").path("main_text").asText("");
            String secondary = p.path("structured_formatting").path("secondary_text").asText("");
            // Đường chỉ kèm "phường, thành phố"; quán, trạm xe, chợ kèm thêm số nhà/tên đường
            // ("32/3 Lê Văn Khương, Thới An, Hồ Chí Minh"). Đã kiểm với Goong thật 07/10.
            boolean notStreet = main.isBlank() || Character.isDigit(main.charAt(0))
                    || secondary.split(",").length > 2;
            for (JsonNode t : p.path("types")) {
                notStreet |= NOT_STREET.contains(t.asText());
            }
            if (!notStreet && p.hasNonNull("place_id") && out.size() < limit) {
                out.add(new Suggestion(p.get("place_id").asText(), main, secondary));
            }
        }
        return new Result(Status.OK, out);
    }
}
