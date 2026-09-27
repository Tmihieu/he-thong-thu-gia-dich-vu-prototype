-- Seed demo (chỉ profile demo): bài chợ đồ cũ GIẢ theo prototype (CITIZEN_MARKET), không có ảnh.
-- Người đăng / bình luận là tài khoản người dân giả của V18_1 (chọn theo SĐT). Bài CDC-035 của hộ kịch bản
-- DTH-H000128 để thử đóng bài (D9); CDC-033 đã đóng nên không hiện trong danh sách mặc định.

insert into market_posts (code, author_id, title, post_type, description, pickup_location, status,
                          created_at, updated_at)
select v.code, a.id, v.title, v.post_type, v.description, v.pickup_location, v.status, now() - v.age, now() - v.age
from (values
    ('CDC-033', '0902000221', 'Xe đạp trẻ em 16 inch', 'GIVE',
     'Xe còn chạy tốt, đã thay lốp sau. Đã có người nhận.', 'Tổ dân phố 12', 'CLOSED', interval '5 days'),
    ('CDC-035', '0902000128', 'Bàn ăn 4 ghế, mặt kính', 'GIVE',
     'Mặt kính còn nguyên, 1 ghế gãy nan tựa. Ưu tiên hộ trong xã đến lấy sớm vì nhà chật.',
     'Tổ dân phố 07, Đông Thạnh', 'OPEN', interval '2 days'),
    ('CDC-039', '0902000161', 'Tủ quần áo gỗ ép 2 cánh', 'EXCHANGE',
     'Tủ cao 1m8, một bên bản lề hơi lỏng. Muốn đổi lấy kệ sách nhỏ hoặc bàn học cũ.', null, 'OPEN',
     interval '1 day'),
    ('CDC-041', '0902000149', 'Ghế sofa 3 chỗ còn dùng tốt', 'GIVE',
     'Sofa nỉ 3 chỗ, còn chắc, chỉ bạc màu nhẹ ở tay vịn. Do đổi nội thất nên cho lại. Người nhận tự vận chuyển, liên hệ buổi tối.',
     'Hẻm 12, Tổ dân phố 08', 'OPEN', interval '2 hours')
) as v(code, phone, title, post_type, description, pickup_location, status, age)
join citizen_accounts a on a.phone = v.phone;

insert into market_comments (post_id, author_id, content, created_at, updated_at)
select p.id, a.id, v.content, now() - v.age, now() - v.age
from (values
    ('CDC-041', '0902000128', 'Còn không chị? Chiều nay em qua lấy được không ạ?', interval '1 hour'),
    ('CDC-041', '0902000149', 'Còn em nhé, qua sau 18h giúp chị.', interval '40 minutes'),
    ('CDC-039', '0902000341', 'Nhà em có bàn học, để em gửi ảnh qua tin nhắn nhé.', interval '3 hours')
) as v(code, phone, content, age)
join market_posts p on p.code = v.code
join citizen_accounts a on a.phone = v.phone;
