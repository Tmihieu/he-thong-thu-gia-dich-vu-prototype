package vn.dongthanh.vsmt.citizen;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.support.TransactionTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import vn.dongthanh.vsmt.citizen.domain.CitizenAccount;
import vn.dongthanh.vsmt.citizen.domain.CitizenAccountRepository;
import vn.dongthanh.vsmt.citizen.service.MarketService;
import vn.dongthanh.vsmt.masterdata.domain.ServiceSubjectRepository;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.JwtService;
import vn.dongthanh.vsmt.support.CollectionFixture;
import vn.dongthanh.vsmt.support.DatabaseCleaner;
import vn.dongthanh.vsmt.support.FixedClockConfig;
import vn.dongthanh.vsmt.support.IntegrationTest;

/**
 * Chợ đồ cũ v2 (docs/cho-do-cu-spec.md) và ảnh người dân. Hộ A = DTH-H000001 (KV07), hộ B = DTH-H000005 (KV12).
 * Không bọc {@code @Transactional}: dữ liệu commit thật như app gọi, để lộ lỗi đọc proxy lười khi controller dựng DTO
 * sau khi transaction của service đóng (server thật {@code open-in-view: false} trả 500).
 */
@Import({FixedClockConfig.class, CollectionFixture.class, DatabaseCleaner.class})
class MarketIT extends IntegrationTest {

    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};
    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D, 'I', 'H', 'D', 'R'};
    static final byte[] WEBP = {'R', 'I', 'F', 'F', 0x24, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '};
    static final int FIVE_MB = 5 * 1024 * 1024;

    @Autowired MockMvc mvc;
    @Autowired CollectionFixture fx;
    @Autowired CitizenAccountRepository accounts;
    @Autowired ServiceSubjectRepository subjects;
    @Autowired JwtService jwt;
    @Autowired ObjectMapper json;
    @Autowired DatabaseCleaner cleaner;
    @Autowired TransactionTemplate tx;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository users;
    @Value("${vsmt.upload-dir}") String uploadDir;

    CitizenAccount citizenA;
    CitizenAccount citizenB;
    /** Cùng hộ A, khác tài khoản. */
    CitizenAccount citizenA2;
    User leader;

    @BeforeEach
    void setUp() {
        cleaner.truncateAll();
        tx.executeWithoutResult(s -> {
            fx.build();
            citizenA = accounts.save(CitizenAccount.create("0902000001",
                    subjects.findByCode("DTH-H000001").orElseThrow(), "Chủ hộ A"));
            citizenB = accounts.save(CitizenAccount.create("0902000005",
                    subjects.findByCode("DTH-H000005").orElseThrow(), "Chủ hộ B"));
            citizenA2 = accounts.save(CitizenAccount.create("0902000011",
                    subjects.findByCode("DTH-H000001").orElseThrow(), "Con hộ A"));
            leader = users.save(User.create("lanhdao_fx", "Lãnh đạo", Role.LEADER, null, "x"));
        });
    }

    /** Xóa dữ liệu đã commit và ảnh đã tải (thư mục tạm của test) để không dồn sang test/lần chạy sau. */
    @AfterEach
    void clean() throws Exception {
        cleaner.truncateAll();
        try (Stream<Path> files = Files.list(Path.of(uploadDir))) {
            for (Path f : files.toList()) {
                Files.deleteIfExists(f);
            }
        }
    }

    @Test
    void createsMultiTagPostVisibleImmediatelyAndFeedFiltersTagOrOthersAnd() throws Exception {
        String body = createBody(citizenA, """
                {"caption": " Ghế sofa 3 chỗ\\nGiá 500k ", "tags": ["SELL", "GIVE", "SELL"], "category": "FURNITURE"}""");
        assertThat(json.readTree(body).get("caption").asText()).isEqualTo("Ghế sofa 3 chỗ\nGiá 500k");
        assertThat(body).doesNotContain("contactPhone", "price", "title", "pickupLocation");
        long sofa = json.readTree(body).get("id").asLong();
        long find = create(citizenB, "Cần tìm nồi 100%_x", "[\"FIND\"]");
        long give = create(citizenB, "Cho tặng sách cũ", "[\"GIVE\", \"EXCHANGE\"]");

        citizen(citizenB, get("/api/market/posts/{id}", sofa), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags").value(contains("SELL", "GIVE")))
                .andExpect(jsonPath("$.category").value("FURNITURE"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.area.code").value("KV07"))
                .andExpect(jsonPath("$.author.displayName").value("Chủ hộ A"))
                .andExpect(jsonPath("$.mine").value(false))
                .andExpect(jsonPath("$.version").isEmpty())
                .andExpect(jsonPath("$.canComment").value(true))
                .andExpect(jsonPath("$.canCall").value(false));
        citizen(citizenA, get("/api/market/posts"), null)
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[*].id").value(contains((int) give, (int) find, (int) sofa)))
                .andExpect(jsonPath("$.hasMore").value(false));
        // Tag OR; tag + danh mục AND; bài nhiều tag không bị trùng dòng.
        citizen(citizenA, get("/api/market/posts").param("tags", "GIVE,FIND,SELL"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) give, (int) find, (int) sofa)));
        citizen(citizenA, get("/api/market/posts").param("tags", "GIVE").param("category", "FURNITURE"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) sofa)));
        citizen(citizenA, get("/api/market/posts").param("areaId", areaIdOf(citizenB).toString()), null)
                .andExpect(jsonPath("$.total").value(2));
        // Tìm không phân biệt hoa thường; % và _ là ký tự thường.
        citizen(citizenA, get("/api/market/posts").param("q", "  SOFA "), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) sofa)));
        citizen(citizenA, get("/api/market/posts").param("q", "100%_"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) find)));
        citizen(citizenA, get("/api/market/posts").param("q", "%"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) find)));
        citizen(citizenA, get("/api/market/posts").param("size", "51"), null).andExpect(status().isBadRequest());
    }

    @Test
    void createRejectsPriceFieldsAndInvalidDataButCaptionMayMentionPrice() throws Exception {
        String key = "\"clientRequestId\": \"" + UUID.randomUUID() + "\"";
        citizen(citizenA, post("/api/citizen/market/posts"),
                "{\"caption\": \"x\", \"tags\": [\"SELL\"], \"price\": 100000, " + key + "}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_FIELD_UNKNOWN"));
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"caption\": \"x\", \"tags\": [], " + key + "}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"caption\": \"x\", \"tags\": [\"BUY\"], " + key + "}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"caption\": \"  \", \"tags\": [\"SELL\"], " + key + "}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), "{\"caption\": \"x\", \"tags\": [\"SELL\"]}")
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"caption": "x", "tags": ["SELL"], "sharePhone": true, "contactPhone": "12ab", %s}""".formatted(key))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_PHONE_INVALID"));
        createBody(citizenA, "{\"caption\": \"Bán 200.000đ\", \"tags\": [\"SELL\"]}");
        assertThat(jdbc.queryForObject("select category from market_posts", String.class)).isEqualTo("OTHER");
    }

    @Test
    void createRetryWithSameKeyReturnsSamePostAndDifferentPayloadConflicts() throws Exception {
        String req = "{\"caption\": \"Bàn học\", \"tags\": [\"GIVE\"], \"clientRequestId\": \"%s\"}"
                .formatted(UUID.randomUUID());
        long id = json.readTree(citizen(citizenA, post("/api/citizen/market/posts"), req)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        citizen(citizenA, post("/api/citizen/market/posts"), req)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(id));
        citizen(citizenA, post("/api/citizen/market/posts"), req.replace("Bàn học", "Bàn ăn"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        assertThat(jdbc.queryForObject("select count(*) from market_posts", Integer.class)).isEqualTo(1);
    }

    @Test
    void pagingReads125PostsNewestFirst() throws Exception {
        for (int i = 1; i <= 125; i++) {
            String code = "CDC-%03d".formatted(i);
            jdbc.update("""
                    insert into market_posts (code, author_id, caption, area_id, status)
                    values (?, ?, ?, ?, 'OPEN')""", code, citizenA.getId(), "Bài " + i, areaIdOf(citizenA));
            jdbc.update("insert into market_post_tags select id, 'GIVE' from market_posts where code = ?", code);
        }
        Set<Long> seen = new HashSet<>();
        for (int page = 0; page < 3; page++) {
            var res = json.readTree(citizen(citizenB, get("/api/market/posts").param("page", "" + page)
                    .param("size", "50"), null).andReturn().getResponse().getContentAsString());
            assertThat(res.get("total").asInt()).isEqualTo(125);
            assertThat(res.get("hasMore").asBoolean()).isEqualTo(page < 2);
            res.get("items").forEach(n -> seen.add(n.get("id").asLong()));
        }
        assertThat(seen).hasSize(125);
    }

    @Test
    void internalRolesReadOnlyAndAnonymousOrLockedAreRejected() throws Exception {
        long img = uploadMarket(citizenA);
        long id = json.readTree(createBody(citizenA, "{\"caption\": \"Ghế nhựa\", \"tags\": [\"GIVE\"], \"photoIds\": [%d]}"
                .formatted(img))).get("id").asLong();
        comment(citizenB, id, "Còn không?").andExpect(status().isCreated());

        for (User u : List.of(fx.officer, fx.admin, fx.dv01Manager, fx.thu07, leader)) {
            String bearer = fx.bearer(u);
            mvc.perform(get("/api/market/posts").header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.items[0].canComment").value(false))
                    .andExpect(jsonPath("$.items[0].saved").value(false));
            mvc.perform(get("/api/market/metadata").header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.tags").value(contains("FIND", "SELL", "GIVE", "EXCHANGE")));
            mvc.perform(get("/api/market/posts/{id}/comments", id).header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(jsonPath("$.total").value(1));
            mvc.perform(get("/api/market/posts/{id}/images/{img}", id, img).header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isOk())
                    .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")));
            mvc.perform(post("/api/market/posts").header(HttpHeaders.AUTHORIZATION, bearer)
                    .contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());
            mvc.perform(get("/api/citizen/market/posts/{id}/contact", id).header(HttpHeaders.AUTHORIZATION, bearer))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/market/posts")).andExpect(status().isUnauthorized());
        tx.executeWithoutResult(s -> accounts.findById(citizenB.getId()).orElseThrow().lock());
        citizen(citizenB, get("/api/market/posts"), null).andExpect(status().isUnauthorized());
    }

    @Test
    void authorClosesReopensHidesShowsWithVersionRules() throws Exception {
        long id = create(citizenA, "Xe đạp", "[\"GIVE\"]");
        int v0 = version(citizenA, id);
        String created = json.readTree(citizen(citizenA, get("/api/market/posts/{id}", id), null)
                .andReturn().getResponse().getContentAsString()).get("createdAt").asText();

        // Cùng hộ nhưng khác tài khoản: không phải chủ bài.
        citizen(citizenA2, post("/api/citizen/market/posts/{id}/status", id), statusBody("CLOSED", v0))
                .andExpect(status().isForbidden());
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), statusBody("CLOSED", v0))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.canComment").value(false));
        // Đã đạt đích: thành công không ghi, kể cả version cũ; đổi thật với version cũ → 409.
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), statusBody("CLOSED", v0))
                .andExpect(status().isOk());
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), statusBody("OPEN", v0))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("MARKET_POST_CONFLICT"));
        citizen(citizenB, get("/api/market/posts"), null).andExpect(jsonPath("$.total").value(0));
        citizen(citizenB, get("/api/market/posts/{id}", id), null).andExpect(status().isOk());
        comment(citizenB, id, "Còn không?").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_POST_CLOSED"));

        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), statusBody("OPEN", version(citizenA, id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdAt").value(created));

        citizen(citizenA, put("/api/citizen/market/posts/{id}/visibility", id), hiddenBody(true, version(citizenA, id)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hidden").value(true))
                .andExpect(jsonPath("$.status").value("OPEN"));
        citizen(citizenB, get("/api/market/posts/{id}", id), null).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MARKET_POST_NOT_FOUND"));
        citizen(citizenB, post("/api/citizen/market/posts/{id}/status", id), statusBody("CLOSED", 0))
                .andExpect(status().isNotFound());
        citizen(citizenB, get("/api/market/posts"), null).andExpect(jsonPath("$.total").value(0));
        citizen(citizenA, get("/api/citizen/market/posts/mine").param("hidden", "true"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) id)));
        citizen(citizenA, put("/api/citizen/market/posts/{id}/visibility", id), hiddenBody(false, version(citizenA, id)))
                .andExpect(status().isOk());
        citizen(citizenB, get("/api/market/posts"), null).andExpect(jsonPath("$.total").value(1));
    }

    @Test
    void editKeepsAuthorAreaStatusAndRequiresCurrentVersion() throws Exception {
        long id = create(citizenA, "Tủ", "[\"GIVE\"]");
        int v0 = version(citizenA, id);
        citizen(citizenA, patch("/api/citizen/market/posts/{id}", id), """
                {"caption": "Tủ gỗ 2 cánh", "tags": ["SELL", "EXCHANGE"], "category": "FURNITURE", "version": %d}"""
                .formatted(v0))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tags").value(contains("SELL", "EXCHANGE")))
                .andExpect(jsonPath("$.editedAt").isNotEmpty())
                .andExpect(jsonPath("$.area.code").value("KV07"));
        citizen(citizenA, patch("/api/citizen/market/posts/{id}", id),
                "{\"caption\": \"cũ\", \"tags\": [\"GIVE\"], \"version\": %d}".formatted(v0))
                .andExpect(status().isConflict());
        citizen(citizenA, patch("/api/citizen/market/posts/{id}", id),
                "{\"caption\": \"x\", \"tags\": [\"GIVE\"], \"amount\": 1, \"version\": 9}")
                .andExpect(status().isUnprocessableEntity());
        citizen(citizenB, patch("/api/citizen/market/posts/{id}", id),
                "{\"caption\": \"x\", \"tags\": [\"GIVE\"], \"version\": %d}".formatted(v0 + 1))
                .andExpect(status().isForbidden());
        citizen(citizenB, get("/api/market/posts/{id}", id), null)
                .andExpect(jsonPath("$.caption").value("Tủ gỗ 2 cánh"))
                .andExpect(jsonPath("$.tags").value(contains("SELL", "EXCHANGE")));
    }

    @Test
    void contactPhoneIsOptInAndOnlyForCitizensOnOpenVisiblePosts() throws Exception {
        long off = create(citizenA, "Không chia sẻ", "[\"GIVE\"]");
        citizen(citizenB, get("/api/citizen/market/posts/{id}/contact", off), null).andExpect(status().isNotFound());

        long on = json.readTree(createBody(citizenA, """
                {"caption": "Có số", "tags": ["SELL"], "sharePhone": true, "contactPhone": "+84 912 345 678"}"""))
                .get("id").asLong();
        String detail = citizen(citizenB, get("/api/market/posts/{id}", on), null)
                .andExpect(jsonPath("$.canCall").value(true)).andReturn().getResponse().getContentAsString();
        assertThat(detail).doesNotContain("0912345678");
        citizen(citizenB, get("/api/citizen/market/posts/{id}/contact", on), null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phone").value("0912345678"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")));
        citizen(citizenA, get("/api/citizen/market/posts/{id}/edit", on), null)
                .andExpect(jsonPath("$.contactPhone").value("0912345678"));

        // Tắt chia sẻ xóa số đã lưu.
        citizen(citizenA, patch("/api/citizen/market/posts/{id}", on), """
                {"caption": "Có số", "tags": ["SELL"], "sharePhone": false, "contactPhone": "0912345678", "version": %d}"""
                .formatted(version(citizenA, on))).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select contact_phone from market_posts where id = ?", String.class, on)).isNull();
        citizen(citizenB, get("/api/citizen/market/posts/{id}/contact", on), null).andExpect(status().isNotFound());
    }

    @Test
    void commentsPageRetryIdempotentAndNotifyAuthorOrPastCommenters() throws Exception {
        long id = create(citizenA, "Nồi cơm", "[\"GIVE\"]");
        String req = "{\"content\": \" Còn không chị? \", \"clientRequestId\": \"%s\"}".formatted(UUID.randomUUID());
        long cid = json.readTree(citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), req)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Còn không chị?"))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), req)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(cid));
        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), req.replace("Còn", "Hết"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        assertThat(notificationsOf(citizenA)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select body from notifications where recipient_citizen_id = ?", String.class,
                citizenA.getId())).isEqualTo("Có bình luận mới trong bài đăng");
        assertThat(jdbc.queryForObject("select link->>'screen' from notifications where recipient_citizen_id = ?",
                String.class, citizenA.getId())).isEqualTo("citizen.marketDetail");

        comment(citizenA, id, "Còn em nhé").andExpect(status().isCreated());
        assertThat(notificationsOf(citizenB)).isEqualTo(1);
        assertThat(notificationsOf(citizenA)).isEqualTo(1);
        comment(citizenA2, id, "Cho em với").andExpect(status().isCreated());

        citizen(citizenB, get("/api/market/posts/{id}/comments", id).param("size", "2"), null)
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.items[*].content").value(contains("Còn không chị?", "Còn em nhé")));
        citizen(citizenB, get("/api/market/posts/{id}", id), null).andExpect(jsonPath("$.commentCount").value(3));

        // Bài đóng: retry khóa cũ trả bản cũ, khóa mới → 422.
        citizen(citizenA, post("/api/citizen/market/posts/{id}/status", id), statusBody("CLOSED", version(citizenA, id)))
                .andExpect(status().isOk());
        citizen(citizenB, post("/api/citizen/market/posts/{id}/comments", id), req)
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(cid));
        comment(citizenB, id, "Nữa").andExpect(status().isUnprocessableEntity());
    }

    @Test
    void blockIsTwoWayForPostsCommentsCountsContactAndNotifications() throws Exception {
        long aPost = json.readTree(createBody(citizenA, """
                {"caption": "Bài A", "tags": ["SELL"], "sharePhone": true, "contactPhone": "0912345678"}"""))
                .get("id").asLong();
        long cPost = create(citizenA2, "Bài của C", "[\"GIVE\"]");
        comment(citizenB, cPost, "B bình luận").andExpect(status().isCreated());
        comment(citizenA, cPost, "A bình luận").andExpect(status().isCreated());

        citizen(citizenA, put("/api/citizen/market/blocks/{id}", citizenA.getId()), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("MARKET_BLOCK_SELF"));
        citizen(citizenA, put("/api/citizen/market/blocks/{id}", citizenB.getId()), null).andExpect(status().isOk());
        citizen(citizenA, put("/api/citizen/market/blocks/{id}", citizenB.getId()), null).andExpect(status().isOk());

        // B không còn thấy bài/SĐT của A; không bình luận được.
        citizen(citizenB, get("/api/market/posts/{id}", aPost), null).andExpect(status().isNotFound());
        citizen(citizenB, get("/api/citizen/market/posts/{id}/contact", aPost), null).andExpect(status().isNotFound());
        comment(citizenB, aPost, "x").andExpect(status().isNotFound());
        citizen(citizenB, get("/api/market/posts"), null)
                .andExpect(jsonPath("$.items[*].id").value(contains((int) cPost)));
        // Trên bài của C: không thấy bình luận của bên kia, số đếm khớp; C vẫn thấy đủ.
        citizen(citizenB, get("/api/market/posts/{id}/comments", cPost), null)
                .andExpect(jsonPath("$.items[*].content").value(contains("B bình luận")));
        citizen(citizenB, get("/api/market/posts/{id}", cPost), null).andExpect(jsonPath("$.commentCount").value(1));
        citizen(citizenA2, get("/api/market/posts/{id}/comments", cPost), null).andExpect(jsonPath("$.total").value(2));

        // A bình luận bài của B? Không thấy → 404; B bình luận bài C không thông báo cho A.
        long aBefore = notificationsOf(citizenA);
        long bBefore = notificationsOf(citizenB);
        comment(citizenA2, cPost, "C trả lời").andExpect(status().isCreated());
        assertThat(notificationsOf(citizenA)).isEqualTo(aBefore + 1);
        assertThat(notificationsOf(citizenB)).isEqualTo(bBefore + 1);

        // B cũng chặn A; A bỏ chặn thì hiệu lực vẫn giữ.
        citizen(citizenB, put("/api/citizen/market/blocks/{id}", citizenA.getId()), null).andExpect(status().isOk());
        citizen(citizenA, delete("/api/citizen/market/blocks/{id}", citizenB.getId()), null)
                .andExpect(status().isNoContent());
        citizen(citizenB, get("/api/market/posts/{id}", aPost), null).andExpect(status().isNotFound());
        citizen(citizenB, get("/api/citizen/market/blocks"), null)
                .andExpect(jsonPath("$.items[*].displayName").value(contains("Chủ hộ A")));
    }

    @Test
    void imagesFollowPostPermissionAndOldRouteCannotBypass() throws Exception {
        long mine = uploadMarket(citizenA);
        long theirs = uploadMarket(citizenB);
        citizen(citizenB, get("/api/citizen/market/images/{id}/preview", mine), null).andExpect(status().isNotFound());
        citizen(citizenA, get("/api/citizen/market/images/{id}/preview", mine), null).andExpect(status().isOk());
        // Không gắn ảnh của người khác.
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"caption": "x", "tags": ["GIVE"], "photoIds": [%d], "clientRequestId": "%s"}"""
                .formatted(theirs, UUID.randomUUID()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));
        long id = json.readTree(createBody(citizenA, "{\"caption\": \"Có ảnh\", \"tags\": [\"GIVE\"], \"photoIds\": [%d]}"
                .formatted(mine))).get("id").asLong();
        // Ảnh đã gắn bài này không chuyển sang bài khác.
        citizen(citizenA, post("/api/citizen/market/posts"), """
                {"caption": "y", "tags": ["GIVE"], "photoIds": [%d], "clientRequestId": "%s"}"""
                .formatted(mine, UUID.randomUUID()))
                .andExpect(status().isUnprocessableEntity());
        String name = jdbc.queryForObject("select storage_name from market_images where id = ?", String.class, mine);

        citizen(citizenB, get("/api/market/posts/{id}/images/{img}", id, mine), null)
                .andExpect(status().isOk()).andExpect(content().bytes(JPEG));
        citizen(citizenB, get("/api/market/posts/{id}/images/{img}", id, theirs), null).andExpect(status().isNotFound());
        citizen(citizenB, get("/api/citizen/photos/{name}", name), null).andExpect(status().isOk());
        // Rác cồng kềnh không nhận file chợ.
        citizen(citizenB, post("/api/citizen/bulky-requests"), """
                {"itemType": "MATTRESS", "quantity": 1, "preferredDate": "2026-10-18", "photoNames": ["%s"]}"""
                .formatted(name))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));

        citizen(citizenA, put("/api/citizen/market/posts/{id}/visibility", id), hiddenBody(true, version(citizenA, id)))
                .andExpect(status().isOk());
        citizen(citizenB, get("/api/citizen/photos/{name}", name), null).andExpect(status().isNotFound());
        citizen(citizenB, get("/api/market/posts/{id}/images/{img}", id, mine), null).andExpect(status().isNotFound());
        citizen(citizenA, put("/api/citizen/market/posts/{id}/visibility", id), hiddenBody(false, version(citizenA, id)))
                .andExpect(status().isOk());

        // Tháo ảnh cuối: không còn đọc qua bài, route cũ vẫn biết là ảnh chợ.
        citizen(citizenA, patch("/api/citizen/market/posts/{id}", id),
                "{\"caption\": \"Có ảnh\", \"tags\": [\"GIVE\"], \"photoIds\": [], \"version\": %d}"
                        .formatted(version(citizenA, id)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.photoUrls").isEmpty());
        citizen(citizenB, get("/api/market/posts/{id}/images/{img}", id, mine), null).andExpect(status().isNotFound());
        citizen(citizenB, get("/api/citizen/photos/{name}", name), null).andExpect(status().isNotFound());
    }

    @Test
    void savedPostsShowPlaceholderWhenUnavailableAndCanBeUnsaved() throws Exception {
        long id = create(citizenA, "Đèn bàn", "[\"GIVE\"]");
        citizen(citizenB, put("/api/citizen/market/saved/{id}", id), null).andExpect(status().isOk());
        citizen(citizenB, put("/api/citizen/market/saved/{id}", id), null).andExpect(status().isOk());
        citizen(citizenB, get("/api/market/posts/{id}", id), null).andExpect(jsonPath("$.saved").value(true));
        citizen(citizenA, get("/api/market/posts/{id}", id), null).andExpect(jsonPath("$.saved").value(false));
        citizen(citizenB, get("/api/citizen/market/saved"), null)
                .andExpect(jsonPath("$.items[0].post.caption").value("Đèn bàn"));

        citizen(citizenA, put("/api/citizen/market/posts/{id}/visibility", id), hiddenBody(true, version(citizenA, id)))
                .andExpect(status().isOk());
        String saved = citizen(citizenB, get("/api/citizen/market/saved"), null)
                .andExpect(jsonPath("$.items[0].postId").value(id))
                .andExpect(jsonPath("$.items[0].post").isEmpty())
                .andReturn().getResponse().getContentAsString();
        assertThat(saved).doesNotContain("Đèn bàn");
        citizen(citizenB, delete("/api/citizen/market/saved/{id}", id), null).andExpect(status().isNoContent());
        citizen(citizenB, get("/api/citizen/market/saved"), null).andExpect(jsonPath("$.total").value(0));
    }

    @Test
    void eleventhPostOfTheDayIsRateLimited() throws Exception {
        for (int i = 0; i < MarketService.MAX_POSTS_PER_DAY; i++) {
            create(citizenA, "Bài " + i, "[\"GIVE\"]");
        }
        citizen(citizenA, post("/api/citizen/market/posts"),
                "{\"caption\": \"x\", \"tags\": [\"GIVE\"], \"clientRequestId\": \"%s\"}".formatted(UUID.randomUUID()))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("MARKET_RATE_LIMIT"))
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER));
    }

    @Test
    void uploadsJpegPngWebpAndAnyCitizenCanViewThem() throws Exception {
        assertUploadedAndServed(JPEG, "jpg", "image/jpeg");
        assertUploadedAndServed(PNG, "png", "image/png");
        assertUploadedAndServed(WEBP, "webp", "image/webp");
    }

    @Test
    void uploadRejectsWrongTypeOversizeAndMissingFile() throws Exception {
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile("xin chào".getBytes())), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_TYPE_INVALID"));
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile("GIF89a......".getBytes())), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("PHOTO_TYPE_INVALID"));
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile(new byte[0])), null)
                .andExpect(status().isUnprocessableEntity());
        citizen(citizenA, multipart("/api/citizen/photos"), null)
                .andExpect(status().isBadRequest());
        citizen(citizenA, post("/api/citizen/photos"), "{}")
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Cùng mã với giới hạn multipart của Tomcat trên server thật (GlobalExceptionHandlerTest).
        upload(citizenA, jpegOfSize(FIVE_MB));
        citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile(jpegOfSize(FIVE_MB + 1))), null)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
    }

    @Test
    void photoNamesAreValidatedAndFilesOutsideUploadDirCannotBeRead() throws Exception {
        citizen(citizenA, get("/api/citizen/photos/{name}", "evil.txt"), null)
                .andExpect(status().isBadRequest());
        citizen(citizenA, get("/api/citizen/photos/{name}", "anh-cua-toi.jpg"), null)
                .andExpect(status().isBadRequest());
        citizen(citizenA, get("/api/citizen/photos/{name}", UUID.randomUUID() + ".jpg"), null)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PHOTO_NOT_FOUND"));

        String name = UUID.randomUUID() + ".jpg";
        Path outside = Path.of(uploadDir).toAbsolutePath().normalize().getParent().resolve(name);
        Files.write(outside, JPEG);
        try {
            citizen(citizenA, get("/api/citizen/photos/../" + name), null)
                    .andExpect(status().is4xxClientError());
            citizen(citizenA, get(URI.create("/api/citizen/photos/..%2F" + name)), null)
                    .andExpect(status().is4xxClientError());
            citizen(citizenA, get(URI.create("/api/citizen/photos/..%5C" + name)), null)
                    .andExpect(status().is4xxClientError());
        } finally {
            Files.deleteIfExists(outside);
        }
    }

    private void assertUploadedAndServed(byte[] bytes, String ext, String contentType) throws Exception {
        String body = citizen(citizenA, multipart("/api/citizen/photos").file(jpegFile(bytes)), null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(matchesPattern("^[0-9a-f-]{36}\\." + ext + "$")))
                .andReturn().getResponse().getContentAsString();
        String name = json.readTree(body).get("name").asText();
        assertThat(json.readTree(body).get("url").asText()).isEqualTo("/api/citizen/photos/" + name);

        citizen(citizenB, get("/api/citizen/photos/{name}", name), null)
                .andExpect(status().isOk())
                .andExpect(content().contentType(contentType))
                .andExpect(content().bytes(bytes));
    }

    private long create(CitizenAccount citizen, String caption, String tagsJson) throws Exception {
        return json.readTree(createBody(citizen, "{\"caption\": \"%s\", \"tags\": %s}".formatted(caption, tagsJson)))
                .get("id").asLong();
    }

    /** Thêm clientRequestId mới vào body JSON rồi đăng. */
    private String createBody(CitizenAccount citizen, String body) throws Exception {
        String withKey = "{\"clientRequestId\": \"" + UUID.randomUUID() + "\", " + body.strip().substring(1);
        return citizen(citizen, post("/api/citizen/market/posts"), withKey)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
    }

    private ResultActions comment(CitizenAccount a, long postId, String content) throws Exception {
        return citizen(a, post("/api/citizen/market/posts/{id}/comments", postId),
                "{\"content\": \"%s\", \"clientRequestId\": \"%s\"}".formatted(content, UUID.randomUUID()));
    }

    private long uploadMarket(CitizenAccount a) throws Exception {
        String body = citizen(a, multipart("/api/citizen/market/images").file(jpegFile(JPEG)), null)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    private int version(CitizenAccount a, long id) throws Exception {
        return json.readTree(citizen(a, get("/api/citizen/market/posts/{id}/edit", id), null)
                .andReturn().getResponse().getContentAsString()).get("version").asInt();
    }

    private static String statusBody(String status, int version) {
        return "{\"status\": \"%s\", \"version\": %d}".formatted(status, version);
    }

    private static String hiddenBody(boolean hidden, int version) {
        return "{\"hidden\": %s, \"version\": %d}".formatted(hidden, version);
    }

    private long notificationsOf(CitizenAccount a) {
        return jdbc.queryForObject("select count(*) from notifications where recipient_citizen_id = ?", Long.class,
                a.getId());
    }

    private Long areaIdOf(CitizenAccount a) {
        return jdbc.queryForObject("select s.area_id from citizen_accounts c join service_subjects s"
                + " on s.id = c.subject_id where c.id = ?", Long.class, a.getId());
    }

    private String upload(CitizenAccount citizen, byte[] bytes) throws Exception {
        String body = citizen(citizen, multipart("/api/citizen/photos").file(jpegFile(bytes)), null)
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("name").asText();
    }

    /** Tên và Content-Type phía client luôn là JPEG: server nhận dạng theo nội dung file. */
    private static MockMultipartFile jpegFile(byte[] bytes) {
        return new MockMultipartFile("file", "anh.jpg", MediaType.IMAGE_JPEG_VALUE, bytes);
    }

    private static byte[] jpegOfSize(int size) {
        return Arrays.copyOf(JPEG, size);
    }

    private ResultActions citizen(CitizenAccount a, MockHttpServletRequestBuilder req, String body) throws Exception {
        req.header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt.issueCitizen(a.getId(), a.getSubject().getId()).value());
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }
}
