# Spec: Chợ đồ cũ trong xã

Phiên bản 1.0 — 29/09/2026. Phạm vi sản phẩm đã chốt qua hội thoại; các giá trị kỹ thuật dưới đây là thiết kế đề xuất để triển khai, không phải chức năng đã có. Chưa sửa code sản phẩm.

Tài liệu liên quan: [plan](cho-do-cu-plan.md), [checklist](cho-do-cu-checklist.md), [phản biện ban đầu](cho-do-cu-review.md).

## 1. Quyết định và phạm vi

| ID | Quyết định |
|---|---|
| D01 | Không có trường giá trong CSDL/entity/DTO/form; không lọc, sắp xếp hay thống kê theo giá. |
| D02 | Cho người dùng tự ghi giá trong caption, ảnh, bình luận; không OCR/trích xuất/chuyển thành dữ liệu giá. |
| D03 | Một ô caption thay tiêu đề + mô tả, tối đa 5 ảnh không bắt buộc. |
| D04 | Mỗi bài có nhiều tag. Dùng danh sách tag có sẵn, không buộc chọn một mục đích duy nhất. |
| D05 | Người dân đăng bài là hiển thị. Kiểm duyệt, báo cáo vi phạm, phân công người xử lý và khóa quyền chợ để nghiên cứu sau; chưa xây quy trình/bảng dữ liệu cho chúng. |
| D06 | Đăng nhập hệ thống mới xem được. Diễn giải triển khai: tài khoản người dân và cả 5 vai trò nội bộ được đọc chợ; chỉ người dân được tương tác. |
| D07 | Liên hệ bằng bình luận và số điện thoại do chủ bài chủ động cung cấp; chưa chat riêng, Zalo hay lịch hẹn riêng. |
| D08 | Chủ bài được sửa, ẩn/hiện, đóng/mở lại; không tự hết hạn. |
| D09 | Có lưu bài, chặn người dùng, thông báo bình luận; chưa có thông báo kiểm duyệt vì D05. |
| D10 | Phạm vi một xã trên một hệ thống/dataset. Tổ/ấp dùng danh mục Area sẵn có; chưa hỗ trợ hệ thống nhiều xã dùng chung dữ liệu. |

Mục tiêu: người dân tìm/đăng vật dụng, kết nối nhau trong xã. Không có giỏ hàng, đơn hàng, thanh toán chợ, vận chuyển, hoa hồng, đẩy tin trả phí hoặc đánh giá giao dịch. Không ảnh hưởng nghiệp vụ thu phí, hoàn tiền và các trường số tiền của hệ thống VSMT.

Không suy luận D01/D02 là miễn nghĩa vụ pháp lý. Việc phân loại mô hình vận hành cần đánh giá riêng trước vận hành công khai; xem nguồn và giới hạn trong tài liệu phản biện. AI phản biện lần này không phải tính năng AI tự duyệt bài trong app.

## 2. Hiện trạng và thay thế quy tắc cũ

- Tái sử dụng MarketPost, MarketComment, PhotoStorage, tài khoản dân, danh mục tổ, polling thông báo và các màn market.
- Hiện chưa có giá; không cần migration xóa giá.
- Thay quy định SPEC §9.9 và data dictionary MarketPost: title/description/postType được thay bằng caption/tags/category; giữ mã CDC và ID.
- Thay D9/T47 quyết định 27/09: bài đóng được mở lại. O6 không kiểm duyệt tiếp tục áp dụng trong phiên bản này.
- Mở rộng quyền đọc bằng endpoint chợ riêng; không mở toàn bộ `/api/citizen/**` cho tài khoản nội bộ.
- Các thay thế chỉ được đánh dấu đã triển khai trong SPEC gốc/data dictionary khi code và migration tương ứng hoàn tất; không sửa trạng thái task T47/T48 cũ trong giai đoạn viết tài liệu.

## 3. Vai trò, hiển thị và quyền riêng tư

| Thao tác | Chưa đăng nhập | Người dân ACTIVE | Nội bộ ACTIVE: ADMIN, COMMUNE_OFFICER, COMPANY_MANAGER, COLLECTOR, LEADER |
|---|---|---|---|
| Danh sách/tìm/chi tiết/bình luận cũ/ảnh bài công khai | Không | Có, áp dụng quan hệ chặn | Có, chỉ đọc |
| Đăng/sửa/trạng thái | Không | Bài của chính tài khoản | Không |
| Bình luận/lưu/chặn/đọc SĐT liên hệ được chia sẻ | Không | Có theo điều kiện bài | Không |
| Xem bài tự ẩn | Không | Chỉ chủ bài | Không |
| Duyệt/gỡ bài/khóa quyền chợ | Không | Không | Chưa có trong bản này |

- Kiểm tra tài khoản còn hoạt động ở server; token còn hạn không đủ nếu tài khoản đã bị khóa.
- Chủ bài xác định theo CitizenAccount, không theo hộ: hai thành viên cùng hộ không được sửa bài của nhau.
- Bài công khai hiện tên hiển thị + khu vực bài, không trả mã hộ, địa chỉ hồ sơ, SĐT đăng nhập hay dữ liệu phí.
- Tổ bài lấy từ hộ của tác giả khi đăng, lưu snapshot areaId; người dân không tự gán xã/tổ khác. Đổi tổ trong hồ sơ sau đó không sửa các bài cũ.
- Không có ô địa chỉ nhà/địa điểm nhận riêng trong form mới. Người dùng có thể tự viết trong caption; gợi ý ngắn tránh đưa thông tin nhạy cảm. Không tự đưa pickupLocation cũ vào caption công khai.
- SĐT liên hệ là trường tự nhập có lựa chọn bật chia sẻ, mặc định tắt và rỗng; tuyệt đối không tự điền từ SĐT đăng nhập. Tắt chia sẻ xóa contactPhone đã lưu. DTO danh sách/chi tiết không chứa số; lấy qua endpoint riêng sau khi kiểm tra quyền.
- Số chỉ được đọc bởi người dân ACTIVE khi bài OPEN, không ẩn, không bị chặn hai chiều; chủ bài đọc số của mình trong màn sửa kể cả đã đóng/ẩn. Không xác nhận số đã được OTP xác minh. Bấm Gọi mở trình quay số, không tự gọi.
- Chính sách chặn chỉ có hiệu lực với tài khoản người dân trong chợ, không phải đảm bảo ẩn danh trước toàn hệ thống hay thu hồi ảnh đã tải trước đó. Tài khoản nội bộ đọc theo D06 nhưng không thấy SĐT liên hệ.

## 4. Nội dung, tag và tìm kiếm

### 4.1 Form và dữ liệu hợp lệ

- Caption: trim, bắt buộc 1–2.500 ký tự; plain text, không HTML. Dữ liệu cũ tối đa 150 + 2 + 2.000 ký tự vẫn chuyển được.
- Ảnh: 0–5 ảnh; mỗi ảnh ≤5 MB, JPEG/PNG/WebP theo bộ kiểm tra hiện có, giữ thứ tự. Không video.
- Tag: 1–4 giá trị duy nhất từ `FIND` Tìm đồ, `SELL` Bán đồ, `GIVE` Cho tặng, `EXCHANGE` Đổi đồ. Cho phép kết hợp bất kỳ, kể cả FIND + SELL; caption giải thích ý định. Không tự suy luận tag từ nội dung.
- Danh mục: đúng một trong `HOUSEHOLD` Đồ gia dụng, `ELECTRONICS` Điện tử, `FURNITURE` Nội thất, `CHILDREN` Đồ trẻ em, `TOOLS_VEHICLES` Xe đạp và dụng cụ, `OTHER` Khác. Mặc định OTHER để form nhẹ; không làm màn CRUD danh mục trong bản này.
- SĐT chia sẻ: chuẩn hóa khoảng trắng/dấu phân cách; dùng bộ kiểm tra số điện thoại sẵn có nếu phù hợp, hỗ trợ định dạng 0 hoặc +84; sai →422. Không để endpoint trở thành cách tra SĐT tài khoản.
- Không nhận trường `price`, `amount`, `currency` vào model chợ. DTO tạo/sửa chợ phải từ chối thuộc tính không khai báo (không thay cấu hình JSON toàn app). Chuỗi số tiền trong caption hợp lệ theo D02.

### 4.2 Tìm và lọc

- Feed mặc định: OPEN, không ẩn, mới nhất trước. Có chips chọn nhiều tag; khớp **ít nhất một tag** được chọn (OR).
- Các nhóm điều kiện tag, danh mục, tổ, từ khóa kết hợp **AND**. Không chọn tag nghĩa là mọi tag.
- Tìm trên caption, không phân biệt hoa thường; `q` trim tối đa 100 ký tự. Bản đầu có phân biệt dấu tiếng Việt, không fuzzy/AI/search engine riêng. `%` và `_` được hiểu là ký tự người dùng, không wildcard SQL.
- Một danh mục và một tổ được chọn mỗi lần; danh mục tag/tổ lấy qua metadata có quyền đọc chợ.
- Phân trang server `page` từ 0, `size` mặc định 20, tối đa 50; sort `createdAt DESC, id DESC`. Mobile tải thêm, kéo làm mới; đổi bộ lọc reset page và kết quả. Khử trùng ID khi ghép trang; bài mới đồng thời có thể làm xê dịch offset, kéo làm mới để cập nhật.
- Trạng thái CLOSED chỉ xem trong Tin của tôi/Đã lưu/đường dẫn chi tiết, không ở feed chung. Kết quả lọc và tổng số phải loại bài không được xem trước khi phân trang.

## 5. Màn hình và luồng

1. **Tab Chợ đồ cũ:** ô tìm, chips nhiều tag, lọc danh mục/tổ, card caption rút gọn + ảnh đầu + toàn bộ tag + danh mục + tổ + thời gian + số bình luận được phép xem. Có Đăng bài, Tin của tôi, Đã lưu và đường dẫn quản lý chặn. Không badge/placeholder giá.
2. **Đăng/Sửa:** caption, ảnh, multi-select tag, danh mục, khu vực chỉ đọc, bật chia sẻ số và ô số khi bật. Nút lưu khóa khi đang upload/gửi; lỗi giữ nội dung đã nhập. Xóa ảnh trong bản sửa chưa lưu không làm mất ảnh bài hiện tại.
3. **Chi tiết:** ảnh, caption đầy đủ, tag, danh mục, tác giả, tổ, thời gian và dấu Đã chỉnh sửa; Lưu/Bỏ lưu, Gọi nếu đủ quyền, bình luận và Chặn tác giả. Chủ bài có Sửa/Ẩn hoặc Hiện/Đóng hoặc Mở lại.
4. **Tin của tôi:** tất cả bài của mình, bộ lọc Đang đăng/Đã xong/Đã ẩn. Bài ẩn vẫn giữ trạng thái OPEN hoặc CLOSED bên dưới. Xác nhận trước khi ẩn/đóng; hiển thị trạng thái sau khi server thành công.
5. **Đã lưu:** riêng từng tài khoản. Bài CLOSED vẫn xem được; bài đã ẩn/bị chặn không lộ caption/ảnh/tác giả, chỉ placeholder Bài không còn khả dụng và nút Bỏ lưu. Nội bộ không có chức năng này.
6. **Đã chặn:** danh sách tên hiển thị của tài khoản mình chặn, nút Bỏ chặn; đây là ngoại lệ hiển thị tối thiểu để quản lý chặn, không cho xem bài/hồ sơ của họ.
7. **Web nội bộ:** mục Chợ cộng đồng chỉ đọc, danh sách/tìm/lọc/tải tiếp/chi tiết/ảnh/bình luận, không nút thao tác dân, không màn kiểm duyệt. Cả 5 vai trò dùng cùng component và quyền đọc.
8. **Thông báo:** bấm mở bài; nếu bài đã ẩn/bị chặn thì hiện Không còn khả dụng, không khôi phục preview cache. Liên kết sang đăng ký rác cồng kềnh hiện có được giữ, không tự tạo yêu cầu thu gom.

Trạng thái mạng: có loading, rỗng, lỗi và thử lại; giữ bộ lọc khi từ chi tiết quay lại. Đổi tài khoản/đăng xuất phải xóa cache chợ và ảnh nhạy cảm của phiên trước.

## 6. Trạng thái, sửa bài và tương tác

### 6.1 Bài đăng

`status = OPEN | CLOSED`, `hidden = boolean` độc lập. Nhãn CLOSED trung tính **Đã xong** vì bài có thể nhiều mục đích.

| Thao tác | Điều kiện | Kết quả |
|---|---|---|
| Tạo | Người dân ACTIVE, hợp lệ | OPEN, hidden=false |
| Sửa | Chủ bài, bất kỳ trạng thái | Đổi caption/tag/danh mục/ảnh/liên hệ; không đổi tác giả/tổ/ngày đăng/trạng thái |
| Đóng | Chủ bài, OPEN | CLOSED; bình luận cũ còn đọc, không thêm bình luận/gọi mới |
| Mở lại | Chủ bài, CLOSED | OPEN; giữ hidden và ngày đăng, không đẩy đầu feed |
| Ẩn | Chủ bài | hidden=true, giữ OPEN/CLOSED; người khác không đọc được |
| Hiện | Chủ bài | hidden=false, giữ OPEN/CLOSED; CLOSED vẫn không trở lại feed |

Không xóa cứng bài, không tự hết hạn, không trạng thái Đã bán/Đã tặng riêng. Sau kiểm quyền, yêu cầu trạng thái/visibility đã đúng giá trị hiện tại trả thành công không ghi (kể cả version cũ); chỉ khi thực sự chuyển giá trị mới kiểm version, lệch →409. Sửa nội dung luôn yêu cầu version khớp, không ghi đè dữ liệu người dùng.

### 6.2 Bình luận, lưu và chặn

- Bình luận phẳng, plain text trim 1–1.000 ký tự. Chủ bài cũng được bình luận; chưa sửa/xóa/reply lồng nhau/mention. Chỉ bài OPEN không ẩn mới nhận bình luận.
- Bình luận phân trang riêng 20, tối đa 50, thứ tự `createdAt ASC, id ASC`; màn chi tiết không tải tất cả bình luận. Server kiểm bài và quan hệ chặn mỗi lần.
- Lưu/bỏ lưu idempotent, unique(citizenId, postId); không thông báo tác giả ai đã lưu. Cho lưu bài CLOSED nếu còn quyền đọc.
- A chặn B tạo bản ghi có hướng; **hiệu lực hai chiều**: A và B không thấy bài/bình luận của nhau, không xem SĐT, không bình luận bài nhau hoặc nhận thông báo mới từ nhau. Bỏ chặn của A chỉ gỡ quan hệ A→B; nếu B vẫn chặn A thì hiệu lực giữ nguyên.
- Trên bài của C, ẩn bình luận tác giả có quan hệ chặn với người xem; số bình luận hiển thị phải khớp tập được xem. Không tự xóa bình luận hay thông báo của C.
- Không được chặn chính mình. Danh sách người chặn mình không công khai. Tạo/bỏ chặn không thông báo người bị chặn. Sau chặn, client xóa/invalidate feed, chi tiết, ảnh, lưu và preview thông báo liên quan.
- Đọc trực tiếp bài/ảnh/SĐT bị chặn hoặc ẩn →404; không tiết lộ lý do bị chặn. Quyền sở hữu sai khi sửa bài đang xem được →403.

## 7. Thông báo và giới hạn

- Bình luận mới của người khác → chủ bài. Bình luận mới của chủ bài → các tài khoản khác từng bình luận bài, loại người bị chặn/khóa. Không gửi người tự bình luận, không gửi tất cả người lưu bài, không gửi nội bộ.
- Một thông báo/recipient/comment, unique dedup key; kiểm quan hệ chặn cả lúc tạo và lúc đọc. Nội dung cố định “Có bình luận mới trong bài đăng”, không chép caption/giá/SĐT/bình luận vào preview.
- Loại INFO, `link.screen = citizen.marketDetail`, `postId`; dùng hạ tầng thông báo/polling 30 giây hiện có. API danh sách/unread-count/read/read-all nhất quán với thông báo bị ẩn do block/post hidden; trạng thái lại đọc được không gửi thông báo mới trùng.
- Bình luận và bản ghi notification được ghi trong cùng transaction, rollback cùng nhau; polling chỉ đọc dữ liệu đã commit. Dedup vẫn áp dụng theo comment/recipient; không có thông báo cho bình luận rollback. Chưa thêm push thật, worker gửi tin hoặc message broker.
- Giá trị đề xuất cấu hình bản đầu: tối đa 10 bài mới/ngày/tài khoản, 30 bình luận/10 phút, 50 ảnh upload/ngày; múi giờ Asia/Ho_Chi_Minh cho hạn mức ngày. Server kiểm nguyên tử theo tài khoản, không chỉ khóa nút client. Vượt →429 và Retry-After. Không tính thao tác retry cùng clientRequestId lần nữa.
- Tạo bài/bình luận có UUID clientRequestId, unique(authorId, requestId) theo từng loại. Kiểm tài khoản và quyền đọc hiện tại trước khi trả kết quả retry, kể cả retry bình luận; bị chặn/ẩn không còn quyền →404. Retry payload chuẩn hóa giống nhau trả bản ghi cũ; cùng khóa khác payload →409. Bài đã CLOSED nhưng còn quyền đọc: retry bình luận cũ trả bản ghi cũ, không ghi thêm; khóa mới →422. Upload retry có thể tạo ảnh khác, vẫn tính dung lượng/hạn mức upload thực tế.

## 8. Dữ liệu đề xuất

Không tạo module/sàn mới. Mở rộng package citizen, giữ nghiệp vụ chợ trong MarketService hoặc tách service quyền/ảnh nhỏ khi trách nhiệm rõ.

| Bảng/entity | Trường/quan hệ chính |
|---|---|
| market_posts / MarketPost | Giữ id, code, author_id, timestamps, version, status; thêm caption varchar(2500), category varchar(30), area_id FK, hidden boolean default false, share_phone boolean default false, contact_phone nullable, client_request_id, request_fingerprint. Không price/amount/currency. |
| market_post_tags | post_id FK + tag varchar(20), PK(post_id,tag), CHECK tag thuộc 4 giá trị; mapping ElementCollection hoặc tương đương, không cần entity Tag động. |
| market_comments / MarketComment | Giữ dữ liệu cũ; thêm client_request_id, request_fingerprint để chống retry trùng. |
| market_saved_posts | citizen_id + post_id FK, created_at; composite PK. |
| market_user_blocks | blocker_id + blocked_id FK CitizenAccount, created_at; composite PK, CHECK khác nhau; index chiều ngược. |
| market_images | id, storage_name, uploader_id nullable cho legacy, post_id nullable khi chưa đính kèm, sort_order, created_at, legacy flag. Unique(post_id,storage_name) khi có post; upload mới một file một attachment. Đây là metadata quyền ảnh, vẫn lưu bytes bằng PhotoStorage. |

- Constraint và index: post status/category hợp lệ, caption không trắng, phone null khi share=false; index feed (hidden,status,created_at,id), tags(tag,post_id), author, area/category theo query cần thiết, saved/blocks theo người; không index trước mọi tổ hợp.
- JSON tags không trùng, tag không biết →422; nhận mảng trùng thì chuẩn hóa thành set, kiểm ít nhất 1. Không serialize thực thể JPA ra API.
- ID tài khoản tác giả dùng trong DTO chợ chỉ phục vụ chặn; không kèm khóa hộ/user nội bộ. Dùng `author.citizenId`, displayName, area; chủ bài có `version`, viewer flags/capabilities để UI biết quyền, server vẫn kiểm lại.

## 9. Ảnh và chống đi vòng quyền

- Giữ PhotoStorage xử lý định dạng, dung lượng, tên UUID; ảnh mới tải qua endpoint chợ tạo market_images thuộc uploader. Người khác không được gắn filename/ID upload của họ vào bài mình.
- Ảnh mới chưa gắn bài chỉ uploader đọc được; chủ bài chọn từ upload của mình hoặc attachment đang thuộc chính bài đang sửa. Không cho chuyển attachment sang bài khác; muốn đăng lại ảnh phải upload lại.
- Ảnh bài trả URL theo postId + imageId; mọi lượt đọc kiểm quyền bài và trạng thái tài khoản. Ảnh cũ bị loại khỏi bản sửa đã lưu không còn đọc qua bài đó; không xóa file dùng chung của bulky.
- **Bắt buộc xử lý đường cũ `/api/citizen/photos/{name}`:** file thuộc nguồn market hoặc đã từng gắn vào market không được trả chỉ vì biết tên. Giữ dấu nguồn/metadata kể cả sau tháo ảnh cuối cùng (không xóa market_images làm file thành ảnh vô chủ được mở). Nếu ảnh chỉ dùng trong chợ, kiểm ít nhất một bài tham chiếu được người xem phép đọc; không có →404. Ngoại lệ legacy có cả tham chiếu bulky được xác định ở thời điểm migration, áp dụng quyền bulky hiện hữu cho liên kết đó, không hứa thu hồi bản ảnh hợp lệ đã dùng ở nghiệp vụ khác.
- Endpoint tạo/sửa bulky không được nhận mới storageName đã đánh dấu market để đi vòng ngoại lệ trên; không chỉ bảo vệ route GET chợ. Liên kết bulky legacy đã tồn tại vẫn được giữ. Người dân muốn dùng cùng ảnh cho bulky tải lại qua luồng bulky như ảnh mới; không mở quyền đọc bytes của upload market cho người khác.
- Nội bộ không được mở `/api/citizen/photos/**` tổng quát; chỉ đọc ảnh qua route chợ sau kiểm bài. Không làm lộ ảnh rác cồng kềnh hoặc upload chưa đăng.
- Backfill market_images từ mỗi liên kết ảnh cũ, legacy=true, uploader_id=null vì chưa biết người upload thật; quyền sửa gắn lại giới hạn đúng post legacy ban đầu, không coi tác giả là uploader đã được xác minh. Không thay tên/xóa bytes và không nhận file legacy bất kỳ vào bài mới.
- Ảnh bỏ dở/đã tháo gắn không bị dọn trong giao dịch sửa bài. Tác vụ dọn file hết tham chiếu và lưu trữ production để giai đoạn sau; trước demo kiểm dung lượng, giữ ngưỡng trống hiện có.
- Response ảnh/SĐT dùng private,no-store; client clear cache khi chặn/ẩn/đăng xuất. Không có cơ chế thu hồi ảnh mà người dùng đã lưu ngoài app.

## 10. Hợp đồng API mục tiêu

`/api/market` chỉ mở các GET liệt kê dưới đây cho citizen ACTIVE hoặc user nội bộ ACTIVE. Kiểm principal đúng loại, không ép user nội bộ thành CurrentCitizen. Ghi và cá nhân hóa giữ `/api/citizen/market`. PUT/PATCH/DELETE qua `/api/market` không được chấp nhận.

| Method + route | Nội dung |
|---|---|
| GET /api/market/metadata | Tags, danh mục, tổ trong dataset xã |
| GET /api/market/posts?q=&tags=GIVE,SELL&category=&areaId=&page=&size= | Feed công khai OPEN; nội bộ đọc không có viewer save/block controls |
| GET /api/market/posts/{id} | Chi tiết được xem, không nhúng toàn bộ comments, không SĐT |
| GET /api/market/posts/{id}/comments?page=&size= | Bình luận có phân trang và lọc chặn |
| GET /api/market/posts/{id}/images/{imageId} | Bytes ảnh với quyền bài |
| GET /api/citizen/market/posts/mine?status=&hidden=&page=&size= | Bài của tôi, gồm bài ẩn |
| POST /api/citizen/market/posts | caption,tags,category (mặc định OTHER nếu bỏ qua),photoIds,sharePhone,contactPhone?,clientRequestId |
| PATCH /api/citizen/market/posts/{id} | Sửa các trường nội dung, kèm version; không patch tác giả/tổ/trạng thái |
| POST /api/citizen/market/posts/{id}/status | status OPEN/CLOSED, version |
| PUT /api/citizen/market/posts/{id}/visibility | hidden boolean, version |
| POST /api/citizen/market/posts/{id}/comments | content,clientRequestId |
| GET /api/citizen/market/posts/{id}/contact | phone khi đủ quyền; không chia sẻ →404 |
| GET /api/citizen/market/posts/{id}/edit | Chủ bài lấy payload sửa + contactPhone + version; không dùng detail để lộ số |
| POST /api/citizen/market/images | Multipart file; trả id và previewUrl riêng có quyền uploader |
| GET /api/citizen/market/images/{id}/preview | Chỉ uploader cho ảnh mới chưa gắn; ảnh gắn rồi áp dụng quyền bài |
| GET /api/citizen/market/saved?page=&size= | Bài đã lưu hoặc placeholder theo §5 |
| PUT /api/citizen/market/saved/{postId} | Lưu bài, 200 trạng thái saved=true |
| DELETE /api/citizen/market/saved/{postId} | Bỏ lưu kể cả bài không còn được xem; 204 |
| GET /api/citizen/market/blocks?page=&size= | Các quan hệ mình tạo, thông tin tối thiểu để bỏ chặn |
| PUT /api/citizen/market/blocks/{citizenId} | Chặn, 200; không cần còn xem được bài nếu retry quan hệ cũ |
| DELETE /api/citizen/market/blocks/{citizenId} | Bỏ quan hệ do mình tạo; 204 |

Post DTO: id,code,caption,tags[],category,area,photoUrls[],status,hidden (chỉ chủ bài cần),author,createdAt,updatedAt,version (chủ bài),commentCount,canComment,canCall,mine,saved. Không trả contactPhone/title/description/postType/pickupLocation ở contract mới. Page DTO: items,total,page,size,hasMore.

Lỗi: 401 token thiếu/hết hạn; 403 sai vai trò/tác giả; 404 MARKET_POST_NOT_FOUND cho nội dung không được xem; 422 dữ liệu sai/tag/ảnh/số điện thoại, MARKET_POST_CLOSED khi bình luận bài đóng; 409 MARKET_POST_CONFLICT hoặc IDEMPOTENCY_CONFLICT; 429 MARKET_RATE_LIMIT. Thông điệp tiếng Việt. Biểu hiện bài không khả dụng không phân biệt ẩn/chặn/không tồn tại.

Endpoint GET chợ cũ nếu còn giữ trong đợt chuyển phiên bản phải ủy quyền qua cùng kiểm tra quyền, không duy trì lối đọc bỏ qua chặn. Không cần hỗ trợ song song bản app cũ dài hạn cho demo; đồng bộ backend/web/mobile một lần và ghi nhận version triển khai.

## 11. Chuyển dữ liệu và triển khai

1. Cấp số Flyway mới theo danh sách thực tại lúc làm; hiện thấy tới V24 nhưng không đặt cứng V25 trong kế hoạch. Đăng ký số trong tasks/plan.md trước khi tạo. Không sửa V20 hoặc reset DB.
2. Thêm cột/bảng theo kiểu mở rộng. caption = title + hai xuống dòng + description; giữ nguyên nội dung, không cắt. GIVE/EXCHANGE cũ thành tag tương ứng; category=OTHER; hidden=false; areaId lấy tổ hiện tại của tác giả lúc migration (không giả lập tổ lịch sử); sharePhone=false/contactPhone=null.
3. Giữ id,code,author,timestamps,comments,status; bài CLOSED cũ vẫn CLOSED. clientRequestId/requestFingerprint của hàng cũ null, unique chỉ áp dụng dữ liệu có khóa.
4. Giữ title/description/post_type/pickup_location/photo_urls cũ làm dữ liệu legacy trong giai đoạn chuyển; bỏ NOT NULL của cột không còn được ghi, cập nhật CHECK cũ phù hợp, không để cấu trúc cũ làm INSERT mới thất bại. Không dùng các cột này trong DTO mới.
5. Backfill liên kết ảnh theo §9; đo tổng số liên kết và file thiếu, không làm migration tự xóa file. Ảnh thiếu hiển thị placeholder, ghi báo cáo sửa dữ liệu.
6. Deploy trong cửa sổ bảo trì bản demo, backend và frontend tương thích nhau; sao lưu DB/uploads. Sau có bài mới dùng nhiều tag không rollback bằng cách map tùy ý về enum đơn: sửa tiến hoặc restore backup có thông báo rõ phần phát sinh sau backup.
7. Kiểm trên bản sao DB có dữ liệu trước nâng cấp; không chỉ chạy seed sạch. Không thay lịch sử nghiệp vụ phí/hộ/rác cồng kềnh.

## 12. Tiêu chí hoàn tất

Hoàn tất khi checklist cùng phiên bản đạt, gồm API permissions, multi-tags thật trong DB, chuyển dữ liệu không mất nội dung, paging vượt 100 bài, chặn hai chiều kể cả ảnh/notification, liên hệ opt-in và thử mobile Android/iOS. Không tick hoàn tất chỉ vì build xanh.

Kiểm duyệt/báo cáo/pháp lý vận hành, người chịu trách nhiệm, chính sách hàng bị cấm, xác thực production thay OTP demo, đa xã, chat riêng, dọn storage và push thật là việc sau có hồ sơ riêng. Đây là giới hạn phiên bản, không phải các tính năng đã được bảo đảm.
