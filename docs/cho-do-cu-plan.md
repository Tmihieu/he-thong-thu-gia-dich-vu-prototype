# Plan riêng: Chợ đồ cũ trong xã

Ngày 29/09/2026 — dựa trên quyết định người dùng tại [spec](cho-do-cu-spec.md). Đây là kế hoạch mới, chưa thực hiện code. [Checklist nghiệm thu](cho-do-cu-checklist.md).

## 1. Mục tiêu và ranh giới

Nâng cấp chợ hiện có: caption + tối đa 5 ảnh, nhiều tag, tìm/lọc, liên hệ tự nguyện, quản lý bài, lưu/chặn/thông báo. Không trường giá; nội dung tự do có thể ghi giá. Người dân đăng là hiển thị; kiểm duyệt và báo cáo để nghiên cứu riêng.

Đăng nhập hệ thống mới xem, gồm 5 vai trò nội bộ chỉ đọc. Một hệ thống cho một xã. Không thay nghiệp vụ phí; không chat riêng, đơn hàng hay thanh toán chợ.

## 2. Tái sử dụng trước khi thêm mới

- Backend Spring Boot: MarketPost/Comment/Service/Repository/Controller, phân trang, PhotoStorage và luồng CitizenAccount.
- Web: layout/menu/React Query hiện tại, một màn chợ đọc dùng lại cho mọi vai trò.
- Không thêm search engine, Redis, realtime server, AI runtime, thư viện tag hay UI kit. Chỉ thêm dependency khi giải pháp hiện tại không đáp ứng và có lý do cụ thể.

## 3. Thứ tự công việc

| Task | Kết quả kiểm chứng được | Phụ thuộc |
|---|---|---|
| CD01 | Đối chiếu schema/thư viện, khóa hợp đồng API, quyền đọc nội bộ và fixture dữ liệu cũ; cấp số migration | Không |
| CD02 | Migration caption/multi-tags/category/area/visibility + saved/block/idempotency/image metadata, backfill an toàn | CD01 |
| CD03 | Query feed/detail/comments/metadata/mine phân trang, lọc OR tag + AND nhóm khác, kiểm quyền theo principal | CD02 |
| CD04 | Tạo/sửa/đóng/mở/ẩn/hiện, retry an toàn, giới hạn đăng/bình luận và liên hệ opt-in | CD03 |
| CD05 | Upload/attachment quyền sở hữu, ảnh theo post, chặn bypass route ảnh cũ, kiểm bulky không hồi quy | CD02–CD04 |
| CD06 | Lưu, chặn hai chiều, lọc comments/count/cache, liên kết và thông báo không rò thông tin | CD03–CD05 |
| CD07 | Mobile feed đa tag, tìm/lọc/tải tiếp, detail + comments phân trang | CD03; hoàn tất sau CD06 |
| CD08 | Mobile form caption/ảnh/multi-tags, liên hệ, Tin của tôi, Lưu, Chặn, notification links | CD04–CD06, CD07 |
| CD09 | Web chợ chỉ đọc cho 5 vai trò, ảnh đúng quyền, menu và deep link | CD03, CD05–CD06 |
| CD10 | Migration rehearsal trên dữ liệu cũ + tích hợp/API/schema generation + Android/iOS + tài liệu gốc | CD07–CD09 |

CD02 là task schema lớn: tách migration cốt lõi bài/tag và migration tương tác/ảnh nếu review quá rộng; không tách transaction nghiệp vụ chỉ để đạt số file. Không cấp số migration trùng giữa người thực hiện.

## 4. Cách phối hợp agent tiết kiệm

- Đã dùng 1 agent phản biện độc lập; coordinator đọc code và tổng hợp tài liệu. Chỉ gọi review lại trên phần thay đổi, không audit toàn repo lặp lại.
- Khi được yêu cầu triển khai: chốt CD01–CD06 theo thứ tự quyền và dữ liệu trước, sau đó có thể giao mobile CD07–CD08 và web CD09 cho hai agent với API/schema đã cố định.
- Một người sở hữu migrations, SecurityConfig, OpenAPI generation và tài liệu chung; agent UI không tự sửa các phần này. Không tạo worktree/worker mới chỉ cho từng chỉnh sửa nhỏ.
- Hoàn tất từng lát chức năng bằng kiểm chứng liên quan, không chạy toàn bộ 3 app ở mỗi dòng đổi. Agent review cuối tập trung privacy, migration và sai lệch spec.

## 5. Cổng kiểm chứng

**G1 — dữ liệu và API:** migration chạy trên DB mới và DB cũ; không mất caption/ảnh/comments; nhiều tag lưu thật; no-price contract; quyền nội bộ/citizen tách đúng; danh sách >100 bài vẫn đọc hết.

**G2 — tương tác và quyền:** chặn/ẩn áp dụng cả direct URL, ảnh cũ, count, SĐT và notification; idempotency/concurrency; liên hệ mặc định tắt; không mở quyền ảnh bulky.

**G3 — trải nghiệm:** mobile Android/iOS thao tác hoàn chỉnh, tải tiếp/đổi lọc/đổi tài khoản không dính cache; web 5 vai trò chỉ đọc; không có nút báo cáo/kiểm duyệt chưa được vận hành.

**G4 — tích hợp:** backend verify, web lint/test/build, mobile typecheck/test + lint theo AGENTS; sinh schema web/mobile từ OpenAPI mới; diễn tập nâng cấp + smoke nghiệp vụ phí và bulky. Không chạy benchmark/AI runtime hoặc suite không liên quan chỉ để tăng số check.

## 6. Rủi ro và quyết định kỹ thuật

| Rủi ro | Xử lý |
|---|---|
| Form caption làm mất title/mô tả cũ | Gộp có xuống dòng, giữ cột legacy, fixture max length |
| Nhiều tag vẫn lưu enum đơn | Bảng nối/ElementCollection, kiểm multi-tag sau reload và lọc không trùng dòng |
| Chặn chỉ trên UI | Một chính sách quyền dùng cho list/detail/comment/contact/images/saved/notifications |
| Ảnh shared có đường vòng | Metadata attachment và quyền route cũ; không coi biết UUID là quyền truy cập |
| Thêm quyền nội bộ làm lộ API citizen | Chỉ GET /api/market được allowlist; verify cả 5 role và request ghi bị từ chối |
| Đăng ngay nhưng UI giả có kiểm duyệt | Không dựng report inbox hay HIDDEN_BY_MODERATOR trong bản này; ghi backlog nghiên cứu riêng |
| Nhầm không giá với miễn pháp lý | Giữ ràng buộc dữ liệu, không đưa bảo đảm pháp lý vào sản phẩm |
| “Một xã” bị hiểu là đã có tenant isolation | Ghi rõ deployment dataset đơn xã; multi-tenant ngoài phạm vi |
| Restore làm mất dữ liệu phát sinh | Snapshot trước deploy; sau ghi mới ưu tiên sửa tiến, không rollback enum đơn tự động |

## 7. Tài liệu và bàn giao

- [Spec](cho-do-cu-spec.md) là nguồn hành vi của đợt phát triển này; checklist dùng D01–D10/CD01–CD10 để truy vết.
- Khi triển khai mới cập nhật SPEC §9.9/O6, data dictionary và tasks/todo.md bằng liên kết đến kế hoạch riêng, ghi rõ quy tắc cũ nào đã thay. Không sửa lịch sử task hoàn tất thành chưa làm.
- Bàn giao có migration version thực, lệnh chạy, kết quả check, dữ liệu mẫu có đủ 4 tag/nhiều tag, bài đóng/ẩn, hai tài khoản chặn nhau và một tài khoản thứ ba.
- Demo dùng tài khoản/OTP demo hiện có; vận hành thật cần đợt chuẩn bị riêng, không đánh đồng với hoàn tất tính năng.
