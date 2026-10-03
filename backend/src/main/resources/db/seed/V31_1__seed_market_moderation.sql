-- Seed demo (chỉ profile demo): thêm bài chợ đồ cũ cho feed dạng lưới, một bài chờ duyệt vì bộ lọc từ khóa và một
-- bài bị nhiều người báo cáo (đã tạm gỡ) để thử màn kiểm duyệt của cán bộ xã. Không có ảnh.

insert into market_posts (code, author_id, caption, category, area_id, status, moderation, moderation_note,
                          created_at, updated_at)
select v.code, a.id, v.caption, v.category, s.area_id, 'OPEN', v.moderation, v.note, now() - v.age, now() - v.age
from (values
    ('CDC-042', '0902000161', E'Nồi cơm điện Sharp 1.8L\n\nCòn nấu tốt, lòng nồi hơi trầy. Cho lại ai cần, qua lấy giúp mình.',
     'HOUSEHOLD', 'PUBLISHED', null, interval '50 minutes'),
    ('CDC-043', '0902000221', E'Tìm xe đạp cũ cho bé lớp 3\n\nNhà mình cần xe 20 inch, cũ cũng được miễn còn chạy. Ai có nhắn giúp.',
     'CHILDREN', 'PUBLISHED', null, interval '3 hours'),
    ('CDC-044', '0902000341', E'Quạt đứng Senko còn chạy êm\n\nĐổi lấy nồi lẩu điện hoặc ấm siêu tốc.',
     'ELECTRONICS', 'PUBLISHED', null, interval '6 hours'),
    ('CDC-045', '0902000128', E'Sách giáo khoa lớp 6 đủ bộ\n\nCon học xong, sách còn mới 90%, tặng bé nào cần.',
     'CHILDREN', 'PUBLISHED', null, interval '1 day 2 hours'),
    ('CDC-046', '0902000149', E'Bộ cờ lê, mỏ lết\n\nĐồ nghề dư, bán rẻ cho anh em sửa xe trong xóm.',
     'TOOLS_VEHICLES', 'PUBLISHED', null, interval '1 day 5 hours'),
    ('CDC-047', '0902000221', E'Kệ dép gỗ 4 tầng\n\nKệ còn chắc, chuyển nhà không mang theo được.',
     'FURNITURE', 'PUBLISHED', null, interval '2 days 4 hours'),
    ('CDC-048', '0902000341', E'Bán thuốc lá điện tử, vape pod còn mới\n\nAi cần inbox.',
     'OTHER', 'PENDING_REVIEW', 'Chứa từ khóa cần duyệt: thuốc lá điện tử, vape', interval '30 minutes'),
    ('CDC-049', '0902000161', E'Thanh lý tivi 32 inch giá rẻ\n\nLiên hệ chuyển khoản cọc trước 500k rồi giao tận nhà.',
     'ELECTRONICS', 'PENDING_REVIEW', 'Bị 3 người báo cáo, tạm gỡ chờ cán bộ xã xem lại.', interval '4 hours')
) as v(code, phone, caption, category, moderation, note, age)
join citizen_accounts a on a.phone = v.phone
join service_subjects s on s.id = a.subject_id;

insert into market_post_tags (post_id, tag)
select p.id, v.tag
from (values
    ('CDC-042', 'GIVE'), ('CDC-043', 'FIND'), ('CDC-044', 'EXCHANGE'), ('CDC-045', 'GIVE'),
    ('CDC-046', 'SELL'), ('CDC-047', 'GIVE'), ('CDC-047', 'SELL'), ('CDC-048', 'SELL'), ('CDC-049', 'SELL')
) as v(code, tag)
join market_posts p on p.code = v.code;

-- Bài CDC-049 bị 3 người báo cáo; CDC-041 có 1 báo cáo (vẫn hiển thị, chờ cán bộ xã xem).
insert into market_post_reports (post_id, reporter_id, reason, note, created_at)
select p.id, a.id, v.reason, v.note, now() - v.age
from (values
    ('CDC-049', '0902000128', 'SCAM', 'Đòi chuyển cọc trước, nghi lừa đảo.', interval '3 hours'),
    ('CDC-049', '0902000221', 'SCAM', null, interval '2 hours'),
    ('CDC-049', '0902000341', 'SPAM', 'Đăng nhiều lần.', interval '1 hour'),
    ('CDC-041', '0902000341', 'OTHER', 'Bài này đã cho rồi mà chưa đóng.', interval '20 minutes')
) as v(code, phone, reason, note, age)
join market_posts p on p.code = v.code
join citizen_accounts a on a.phone = v.phone;
