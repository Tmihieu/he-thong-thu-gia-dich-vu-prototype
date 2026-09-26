package vn.dongthanh.vsmt.platform;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.IllegalTransactionStateException;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityManager;
import vn.dongthanh.vsmt.platform.domain.AuditLog;
import vn.dongthanh.vsmt.platform.domain.Role;
import vn.dongthanh.vsmt.platform.domain.User;
import vn.dongthanh.vsmt.platform.domain.UserRepository;
import vn.dongthanh.vsmt.platform.security.CurrentUser;
import vn.dongthanh.vsmt.platform.service.AuditService;
import vn.dongthanh.vsmt.support.IntegrationTest;

class AuditServiceIT extends IntegrationTest {

    record ReceiptSnapshot(String code, long amount, LocalDate issuedOn) {
    }

    @Autowired
    AuditService audit;

    @Autowired
    UserRepository users;

    @Autowired
    EntityManager em;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    TransactionTemplate tx;

    @Test
    void recordsAllFieldsWithBeforeAndAfterAsJson() {
        // Toàn bộ chạy trong một transaction rồi rollback, để không để lại user/audit cho test khác.
        tx.executeWithoutResult(status -> {
            User officer = users.save(User.create("audit_canbo", "Cán bộ audit", Role.COMMUNE_OFFICER, null, "x"));
            CurrentUser actor = new CurrentUser(officer.getId(), "audit_canbo", Role.COMMUNE_OFFICER, null);

            AuditLog log = audit.record(actor, "ISSUE_COMPANY_RECEIPT", "CompanyReceipt", "PT-CT-1026-001",
                    Map.of("amount", 0),
                    new ReceiptSnapshot("PT-CT-1026-001", 4_200_000L, LocalDate.of(2026, 10, 31)));
            em.flush();

            Map<String, Object> row = jdbc.queryForMap("""
                    select occurred_at, actor_user_id, actor_username, actor_role, action, entity_type, entity_id,
                           jsonb_typeof(before_data) as before_type, before_data ->> 'amount' as before_amount,
                           after_data ->> 'amount' as after_amount, after_data ->> 'issuedOn' as after_date
                    from audit_logs where id = ?""", log.getId());

            assertThat(row.get("occurred_at")).isNotNull();
            assertThat(row.get("actor_user_id")).isEqualTo(officer.getId());
            assertThat(row.get("actor_username")).isEqualTo("audit_canbo");
            assertThat(row.get("actor_role")).isEqualTo("COMMUNE_OFFICER");
            assertThat(row.get("action")).isEqualTo("ISSUE_COMPANY_RECEIPT");
            assertThat(row.get("entity_type")).isEqualTo("CompanyReceipt");
            assertThat(row.get("entity_id")).isEqualTo("PT-CT-1026-001");
            assertThat(row.get("before_type")).isEqualTo("object");
            assertThat(row.get("before_amount")).isEqualTo("0");
            assertThat(row.get("after_amount")).isEqualTo("4200000");
            assertThat(row.get("after_date")).isEqualTo("2026-10-31");

            status.setRollbackOnly();
        });
    }

    @Test
    void createHasNullBeforeAndSystemActor() {
        String entityId = uniqueId();
        tx.executeWithoutResult(s -> audit.recordSystem("SEND_PAYMENT_REMINDER", "PaymentReminder", entityId,
                null, Map.of("companyId", 1)));

        Map<String, Object> row = jdbc.queryForMap(
                "select actor_user_id, actor_username, actor_role, before_data from audit_logs where entity_id = ?",
                entityId);
        assertThat(row.get("actor_user_id")).isNull();
        assertThat(row.get("actor_username")).isEqualTo("system");
        assertThat(row.get("actor_role")).isEqualTo("SYSTEM");
        assertThat(row.get("before_data")).isNull();
    }

    @Test
    void auditIsRolledBackWithTheBusinessTransaction() {
        String entityId = uniqueId();

        assertThatThrownBy(() -> tx.executeWithoutResult(s -> {
            audit.recordSystem("ISSUE_CHARGE_REQUEST", "ChargeRequest", entityId, null, Map.of("total", 80000));
            throw new IllegalStateException("thao tác nghiệp vụ lỗi sau khi đã ghi audit");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(countFor(entityId)).isZero();
    }

    @Test
    void committedBusinessTransactionKeepsAudit() {
        String entityId = uniqueId();
        tx.executeWithoutResult(s -> audit.recordSystem("ISSUE_CHARGE_REQUEST", "ChargeRequest", entityId, null,
                Map.of("total", 80000)));

        assertThat(countFor(entityId)).isEqualTo(1);
    }

    @Test
    void recordingOutsideATransactionIsRefused() {
        assertThatThrownBy(() -> audit.recordSystem("X", "Y", uniqueId(), null, null))
                .isInstanceOf(IllegalTransactionStateException.class);
    }

    @Test
    void auditRowsCannotBeUpdatedOrDeleted() {
        String entityId = uniqueId();
        tx.executeWithoutResult(s -> audit.recordSystem("LOCK_PERIOD", "CollectionPeriod", entityId, null, null));

        assertThatThrownBy(() -> jdbc.update("update audit_logs set action = 'SUA' where entity_id = ?", entityId))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("chỉ được thêm");
        assertThatThrownBy(() -> jdbc.update("delete from audit_logs where entity_id = ?", entityId))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("chỉ được thêm");
        assertThat(countFor(entityId)).isEqualTo(1);
    }

    private int countFor(String entityId) {
        return jdbc.queryForObject("select count(*) from audit_logs where entity_id = ?", Integer.class, entityId);
    }

    private static String uniqueId() {
        return "IT-" + UUID.randomUUID().toString().substring(0, 8);
    }
}
