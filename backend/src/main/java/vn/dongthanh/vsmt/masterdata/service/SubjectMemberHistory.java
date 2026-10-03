package vn.dongthanh.vsmt.masterdata.service;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/** Lịch sử thay đổi số nhân khẩu của hộ, đọc từ nhật ký thao tác (góp ý BA 03/10), không thêm bảng riêng. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SubjectMemberHistory {

    public record Change(OffsetDateTime at, String by, Integer from, Integer to) {
    }

    private final JdbcTemplate jdbc;

    /** Mới nhất trước; dòng tạo hồ sơ có {@code from} null. {@code subjectCode} là khóa nhật ký của hộ. */
    public List<Change> of(String subjectCode) {
        return jdbc.query("select occurred_at, actor_username, (before_data->>'memberCount')::int,"
                + " (after_data->>'memberCount')::int from audit_logs"
                + " where entity_type = 'ServiceSubject' and entity_id = ? and action in ('CREATE_SUBJECT', 'UPDATE_SUBJECT')"
                + " and (action = 'CREATE_SUBJECT' or before_data->>'memberCount' is distinct from after_data->>'memberCount')"
                + " order by occurred_at desc, id desc",
                (rs, i) -> new Change(rs.getObject(1, OffsetDateTime.class), rs.getString(2),
                        (Integer) rs.getObject(3), (Integer) rs.getObject(4)),
                subjectCode);
    }
}
