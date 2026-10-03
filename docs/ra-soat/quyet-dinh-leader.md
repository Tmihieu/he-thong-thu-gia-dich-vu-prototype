# Quyết định của leader — đợt rà soát 04/10/2026

Người dùng giao leader tự quyết các câu hỏi nghiệp vụ trong đợt này ("bạn 100% quyết định, miễn là hoàn thành"). Mỗi quyết định ghi ở đây để người dùng / xã xem lại và đảo nếu cần. Nguyên tắc: chọn phương án ít đổi hành vi nhất, khớp quyết định mới nhất đã có; điểm thật sự thuộc về xã thì **giữ hiện trạng** và ghi rõ.

| Mã | Ngày | Câu hỏi | Quyết định | Lý do | Rule |
|---|---|---|---|---|---|
| QĐ-L1 | 04/10 | Ai được thêm / sửa công ty (DD 28/09 nói chỉ cán bộ xã; giao diện 29/09 đặt nút thêm ở màn quản trị; code: thêm chỉ quản trị, sửa cả hai) | Quản trị **và** cán bộ xã đều thêm + sửa được; vai trò khác 403. Sửa `CompanyService` + `CompanyApiIT` theo đó | Hai quyết định cũ đều còn hiệu lực trên giao diện; cho cả hai không làm hỏng màn nào | BR-MD-03 |
| QĐ-L2 | 04/10 | Cờ dưới 45% cấp công ty so với phải thu hay phải nộp xã | So đã nộp / **phải nộp xã**; phải nộp = 0 thì không gắn cờ | Công ty chỉ nộp phần vận chuyển nên so với tổng phải thu thì luôn dính cờ | BR-REM-13 |
| QĐ-L3 | 04/10 | Các điểm "Chờ xã" (BR-MD-05, 16–19, BR-BIL-04): thu theo hộ hay nhân khẩu, hộ không khai, nhà vắng, ai duyệt đổi nhân khẩu, cách cân kg, khu vực của công ty ngừng hợp tác | **Giữ nguyên hành vi hiện tại**, không thêm chức năng; vẫn ghi là chờ xã | Chỉ xã trả lời được; đổi bây giờ là đoán | — |
| QĐ-L4 | 04/10 | App người dân gọi trạng thái khoản là "Chưa thu / Đã thu" (nhãn nội bộ) hay "Chưa đóng / Đã đóng" | App dân: **Chưa đóng / Đã đóng** (Miễn giảm, Đã xóa nợ giữ nguyên). Web nội bộ giữ Chưa thu / Đã thu | Người dân là bên đóng, "chưa thu" là góc nhìn của bên thu | BR-BIL-10 |
| QĐ-L5 | 04/10 | Màn Thông tin hộ còn hiện "Số đăng ký" ĐK-… có trái BR-GEN-08 | **Giữ**: đó là số đăng ký thu phí, không phải số hợp đồng | BR-GEN-08 chỉ cấm chữ "hợp đồng" | BR-GEN-08 |
| QĐ-L6 | 04/10 | Đồ cồng kềnh trạng thái PENDING: "Chờ xác nhận" hay "Chờ công ty báo phí" | **Chờ công ty báo phí** trên app dân và web | Nói rõ đang chờ ai làm gì | BR-CIT-04 |
| QĐ-L7 | 04/10 | Biểu giá đã ban hành có sửa được đơn giá không (code vẫn cho ghi đè) | **Không.** Chỉ sửa khi còn dự thảo; bản đã ban hành → 422 `TARIFF_NOT_DRAFT`. Nhờ vậy phần cầm lại / phải nộp xã không đổi sau khi phát hành, không cần chụp thêm cột | BR-MD-11 đã chốt 29/09; sửa giá sau ban hành làm lệch sổ công ty–kỳ | BR-MD-11, BR-REM-02 |
| QĐ-L8 | 04/10 | Xóa nợ khoản từng thu rồi đã hoàn hết | **Cho phép** khi tổng thanh toán ròng = 0; rule ghi rõ "ròng" | Hoàn hết thì khoản về Chưa thu (O9), phải xóa nợ được | BR-LD-06 |
| QĐ-L9 | 04/10 | Hoàn cho khoản mới thu một phần (chưa Đã thu) | **Cho phép**, 0 < số hoàn ≤ đã thu − đã hoàn | Thu nhầm một phần vẫn cần trả lại | BR-LD-05 |
| QĐ-L10 | 04/10 | Khiếu nại / đồ cồng kềnh của hộ có nhiều tài khoản app | Lọc **theo hộ**: mọi tài khoản của hộ thấy chung | BR-CIT-02 "dữ liệu của hộ mình" | BR-CIT-02 |
| QĐ-L11 | 04/10 | Hộ ngừng dịch vụ giữa kỳ; ngưỡng hạn đóng trước ngày phát hành / hạn kỳ xa | **Giữ hiện trạng**, chờ xã | Cần ngưỡng và cách tính do xã chốt | — |
