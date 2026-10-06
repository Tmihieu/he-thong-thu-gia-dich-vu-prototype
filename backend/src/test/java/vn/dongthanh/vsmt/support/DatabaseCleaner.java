package vn.dongthanh.vsmt.support;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Xóa sạch dữ liệu các bảng nghiệp vụ (giữ lịch sử Flyway) cho IT buộc phải commit thật, vd. kiểm tra song song.
 * TRUNCATE không kích hoạt trigger chặn sửa/xóa theo dòng của audit_logs.
 */
@TestComponent
public class DatabaseCleaner {

    @Autowired
    JdbcTemplate jdbc;

    public void truncateAll() {
        List<String> tables = jdbc.queryForList("select tablename from pg_tables where schemaname = 'public'"
                + " and tablename <> 'flyway_schema_history'", String.class);
        if (!tables.isEmpty()) {
            jdbc.execute("truncate table " + String.join(", ", tables) + " restart identity cascade");
        }
        // Dòng quy tắc tự tạo kỳ duy nhất do migration V36 gieo; bị TRUNCATE thì IT chạy sau không tạo được kỳ.
        jdbc.update("insert into period_auto_rule (id) values (1) on conflict do nothing");
    }
}
