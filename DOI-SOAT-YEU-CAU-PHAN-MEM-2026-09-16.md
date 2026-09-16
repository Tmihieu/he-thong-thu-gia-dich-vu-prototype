# Đối soát tài liệu "Ghi nhận yêu cầu phần mềm quản lý thu gom rác" — 16/09/2026

**Ngày đối soát:** 16/09/2026
**Tài liệu đối chiếu:** "GHI NHẬN YÊU CẦU PHẦN MỀM QUẢN LÝ THU GOM RÁC" (người dùng cung cấp trực tiếp trong hội thoại, chưa có file riêng trong repo)
**Đặc tả chuẩn:** `SPEC-TONG-HOP.md` (v2.9)
**Đối soát trước đó:** `DOI-SOAT-SPEC-PROTOTYPE-V2.9.md` (đối soát prototype với đặc tả, không phải đối soát tài liệu yêu cầu này)

## 1. Kết luận

Tài liệu yêu cầu mới không mâu thuẫn với các quyết định đã chốt trong SPEC-TONG-HOP.md v2.9. Phần lớn nội dung (tính năng người dân, vấn đề CSDL hộ gia đình) đã được đặc tả hiện tại dự liệu từ trước, ở dạng loại trừ phạm vi hoặc ghi nhận P0/P1 còn mở — tài liệu mới chủ yếu bổ sung **chi tiết chức năng cụ thể hơn**, không phải yêu cầu hoàn toàn mới. Có 1 điểm thực sự mới (Phòng Kinh tế như một actor riêng) và 2 điểm cần khách hàng làm rõ thêm (mốc thời gian triển khai thanh toán; quan hệ Trung tâm Cung ứng dịch vụ công với Công ty thu gom hiện có).

## 2. Nội dung đã có trong đặc tả, nay được xác nhận thêm chi tiết

| # | Nội dung trong tài liệu mới | Đối chiếu với SPEC-TONG-HOP.md | Kết luận |
|---:|---|---|---|
| 1 | Gửi phản ánh, kiến nghị (thu chậm/sai lịch, thu phí cao hơn định mức, vấn đề khác) | §2.4 dòng 279: "Phản ánh hiện trường, đăng ký rác cồng kềnh và trao đổi đồ cũ" — đã liệt kê là ngoài phạm vi lõi ban đầu | Không phải gap mới; nay có thêm phân loại lý do phản ánh cụ thể — đưa vào backlog thiết kế giai đoạn 2 |
| 2 | Đăng ký thu gom rác/vật dụng quá khổ, chi phí bổ sung theo quy định | Cùng dòng 279 (§2.4) | Không phải gap mới; nay có thêm chi tiết "chi phí thu gom bổ sung theo quy định" — cần một biểu giá riêng cho dịch vụ này ở giai đoạn thiết kế sau |
| 3 | "Chợ đồ cũ" — đăng bài, xem bài, bình luận/trao đổi | Cùng dòng 279, cụm "trao đổi đồ cũ" | Không phải gap mới; tài liệu mới đặt tên tính năng cụ thể ("Chợ đồ cũ") và mô tả 3 thao tác lõi (đăng/xem/bình luận) — nay đủ chi tiết để phác thảo màn hình minh họa |
| 4 | CSDL hộ gia đình chưa đầy đủ; dữ liệu Công an theo cá nhân, không theo hộ; thiếu địa chỉ, người đại diện hộ, mức phí, tình trạng đóng phí | §2.7 dòng 69: "xã chưa có CSDL hộ nền; hiện chỉ đối chiếu danh sách hộ giữa các nguồn, chưa đối soát tiền"; đã là P0 trong `DOI-SOAT-SPEC-PROTOTYPE-V2.9.md` §4 | Không phải gap mới, nhưng tài liệu mới cung cấp **nguyên nhân gốc** (dữ liệu Công an không tổ chức theo hộ) và **danh sách trường bắt buộc** chưa từng liệt kê rõ trước đây — khuyến nghị cập nhật dòng P0 hiện tại bằng nội dung này thay vì tạo dòng trùng lặp |
| 5 | Lãnh đạo đơn vị: theo dõi tình hình, xem báo cáo, chỉ đạo, phê duyệt nội dung thuộc thẩm quyền | Khớp với vai trò "Lãnh đạo" hiện có (`ROLE_CONFIG.leader`): Dashboard điều hành, Hàng chờ phê duyệt, Cảnh báo & sai lệch, Báo cáo tổng hợp | Đã khớp, không cần sửa |

## 3. Điểm cần khách hàng làm rõ thêm (không tự suy diễn)

| Mức | Cần xác nhận | Lý do chưa tự triển khai |
|---|---|---|
| P1 | Thanh toán phí "trực tiếp trên ứng dụng" — tài liệu mới không nêu mốc thời gian, trong khi SPEC-TONG-HOP.md (TH-03/TH-04, §2.4 dòng 282, mục lộ trình dòng 1024) xếp thanh toán/QR thu online vào "giai đoạn sau" | Cần xác nhận khách hàng có muốn đẩy tính năng này sớm hơn giai đoạn 2 hay giữ nguyên lộ trình đã thống nhất |
| P1 | Quan hệ giữa "Trung tâm Cung ứng dịch vụ công" (tài liệu mới: "trực tiếp tổ chức và thực hiện việc thu gom") với actor "Công ty thu gom" hiện có (đã xác định là bên trực tiếp thu tiền hộ theo quyết định 2.9) | Đã là P1 mở từ `DOI-SOAT-SPEC-PROTOTYPE-V2.9.md` §4 ("người dùng đã yêu cầu tạm bỏ qua phần chưa rõ"); tài liệu mới làm rõ chức năng nhưng chưa làm rõ Trung tâm có phải là một trong các công ty thu gom hay là đơn vị điều phối riêng |

## 4. Gap mới — chưa từng được phân tích trong đặc tả hiện tại

| # | Nội dung | Mô tả gap |
|---:|---|---|
| 1 | Phòng Kinh tế — "thực hiện chức năng quản lý, theo dõi và giám sát chung" | SPEC-TONG-HOP.md hiện chỉ nhắc Phòng Kinh tế như phòng ban chủ quản của vai trò "Cán bộ xã" (dòng 341), chưa từng phân tích như một actor/vai trò giám sát riêng biệt. Cần làm rõ: Phòng Kinh tế có là một vai trò đăng nhập riêng (giám sát, không thao tác nghiệp vụ trực tiếp) hay chính là vai trò "Cán bộ xã" hiện có đang đại diện cho phòng này |

## 5. Quyết định đã chốt cùng ngày (16/09/2026, người dùng xác nhận trực tiếp)

| # | Điểm mở | Quyết định | Tác động đã thực hiện trên prototype |
|---:|---|---|---|
| 1 | Phòng Kinh tế | **Chính là vai trò "Cán bộ xã" hiện có**, không thêm vai trò mới | Đổi nhãn vai trò thành "Cán bộ xã (Phòng Kinh tế)" và mô tả vai trò trong `config.js`; gap mới ở mục 4 đóng lại |
| 2 | Trung tâm Cung ứng dịch vụ công | **Là một đơn vị thu gom**, dùng chung vai trò/màn hình "Công ty thu gom" | Đưa "Trung tâm Cung ứng dịch vụ công xã" vào danh mục 11 đơn vị thu gom (`data.js`); ghi rõ trong màn Đơn vị thu gom; P1 đóng lại |
| 3 | Thanh toán trên ứng dụng | **Đưa vào phạm vi hiện tại** | Màn "Luồng tiền & QR" (quản trị) và màn thanh toán trong bản xem trước ứng dụng người dân cập nhật theo quyết định này |
| 3a | Tiền thanh toán online vào đâu | **Tài khoản công ty thu gom hoặc theo mã của nhân viên thu** (do công ty quản lý), không vào tài khoản xã | Giữ nguyên luồng 2.9: công ty thu tiền hộ, nộp phần xử lý về xã; không phải viết lại đối soát |
| 3b | Ai phát hành biên lai online | **Công ty phát hành**, ứng dụng chỉ hiển thị lại | Màn biên lai trong bản xem trước ghi "Đơn vị phát hành: Công ty" |
| 3c | Nguồn số tiền phải đóng hiển thị cho người dân | **Chưa chốt — giữ P0** | Bản xem trước chỉ dùng số minh họa; ghi rõ trong màn "Luồng tiền & QR" |
| 4 | CSDL hộ gia đình | **Chưa chốt — giữ P0** | Prototype tiếp tục chỉ đối chiếu danh sách giữa các nguồn, không khẳng định danh sách chuẩn |
| 5 | Các con số minh họa (73%, 2.792 tỷ, đơn giá 80.000đ) | **Giữ nguyên, không gắn nhãn** | Không thay đổi số liệu trình diễn trên dashboard và báo cáo tiến độ |
| 6 | Kế toán "đối soát tiền mặt (đã thu vs đã nộp)" | **Đối soát với công ty**: kê khai đã nộp (tiền mặt tại xã + chuyển khoản) so với phiếu thu/sao kê của xã; không đối soát nhân viên thu | Màn mới "Đối soát tiền mặt" trong `assets/js/accounting.js` |
| 7 | Kế toán "phát hành/hủy biên lai & HĐĐT" | **Xã phát phiếu thu cho công ty** (khoản phần xử lý) **và kiểm tra biên lai công ty phát cho hộ**, yêu cầu công ty hủy/điều chỉnh; kế toán không phát biên lai cho hộ | Màn mới "Phiếu thu & biên lai" |
| 8 | Đơn giá xử lý cho dữ liệu mẫu | **Dùng đơn giá minh họa** 12.000đ/hộ/kỳ (`DG-XL-0926-MAU`, trạng thái "Mẫu · chờ duyệt") để bảng đối soát có số phải nộp/thực nộp/chênh lệch | Áp dụng cho màn kế toán và màn nghĩa vụ/kê khai của công ty; P0 đơn giá vẫn mở |

## 6. Điểm còn mở sau quyết định

| Mức | Cần xác nhận | Ghi chú |
|---|---|---|
| P0 | Nguồn dữ liệu và người phê duyệt danh sách hộ chuẩn | Không đổi so với `DOI-SOAT-SPEC-PROTOTYPE-V2.9.md` §4; tài liệu mới bổ sung nguyên nhân gốc (dữ liệu Công an theo cá nhân) và các trường bắt buộc (người đại diện hộ, mức phí, tình trạng đóng phí) |
| P0 | Nguồn số tiền phải đóng hiển thị cho người dân khi chưa có CSDL hộ | Phát sinh từ việc đưa thanh toán vào phạm vi hiện tại |
| P1 | Ngưỡng cảnh báo chênh lệch trên màn đối soát/báo cáo tiến độ | Prototype đã có cột chênh lệch và chip lọc "Cần xử lý / Đã khớp", ngưỡng để "Chưa cấu hình" chờ BA |
| P1 | Cơ chế mã nhân viên thu gắn với pháp nhân công ty khi nhận tiền online | Cần công ty xác nhận cách quản lý mã và đối chiếu nội bộ |

## 7. Giới hạn của đối soát này

Đối soát này chỉ so sánh nội dung tài liệu yêu cầu mới với SPEC-TONG-HOP.md v2.9 và `DOI-SOAT-SPEC-PROTOTYPE-V2.9.md`; không đọc lại toàn bộ `THIET-KE-CSDL.md` (tài liệu này đã được gắn cảnh báo là dựa trên mô hình cũ, cần thiết kế lại sau khi các điểm P0 được xác nhận). Đối soát không tự đề xuất đơn giá, quy trình phê duyệt, hoặc cấu trúc vai trò mới — các điểm ở mục 3 và 4 cần khách hàng xác nhận trước khi đưa vào đặc tả chính thức.
