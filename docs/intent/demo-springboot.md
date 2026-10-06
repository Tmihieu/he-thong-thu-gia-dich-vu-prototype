# Intent: Demo Spring Boot + React cho hệ thống thu giá dịch vụ VSMT

**Xác nhận:** 23/09/2026 (người dùng trả lời "đúng rồi")

| Mục | Nội dung |
|---|---|
| Kết quả | Kế hoạch chuyển prototype HTML/JS hiện tại thành ứng dụng demo **Spring Boot + React (web) + Flutter (người dân)** trong **1 monorepo**. Cán bộ xã duyệt demo xong thì nâng lên triển khai thật tại xã Đông Thạnh. |
| Người dùng | Cán bộ xã (gộp chức năng kế toán: đối soát, khóa sổ); Công ty môi trường (theo dõi người đi thu, nhận tiền mặt, nộp về xã, xử lý khiếu nại); Người đi thu (web app giao diện mobile); Quản trị; Người dân (app cài qua store). |
| Vì sao bây giờ | Demo cho xã trong khoảng 4 tuần; một người làm, phần lớn nhờ Claude code. |
| Thứ tự | (1) Data dictionary — trường từng entity, kiểu, bắt buộc, nguồn (xã/công ty) → dùng để xin dữ liệu và sinh entity; (2) dựng monorepo; (3) luồng tiền chính: xã lập khoản thu theo kỳ tháng/quý → người đi thu ghi nhận → công ty nộp về xã tiền mặt đã thu, trừ điều chỉnh kỳ trước và phí thu gom của toàn bộ số đã thu (cả chuyển khoản) → xã lập phiếu thu, đối soát; (4) khiếu nại liên thông + thông báo + app người dân. |
| Quy tắc đã chốt | Một khu vực có một công ty phụ trách trong cùng hiệu lực; căn cứ giá mới nhất (QĐ 65/2026/QĐ-UBND); kỳ thu chọn tháng hoặc quý; công ty nộp về xã tiền mặt đã thu trừ điều chỉnh kỳ trước và phí thu gom của toàn bộ số đã thu, chuyển khoản vào tài khoản chung của xã (góp ý BA 05/10). |
| Kỹ thuật mặc định | PostgreSQL + Flyway; JWT + RBAC ở backend, tài khoản demo sẵn cho mỗi vai trò; docker-compose chạy local; prototype cũ giữ trong repo làm tham chiếu UI. |
| Thành công | Demo chạy đầu–cuối luồng tiền và luồng khiếu nại trên dữ liệu mẫu với 4 vai trò nội bộ + app người dân (thanh toán mô phỏng, chợ đồ cũ, rác cồng kềnh); kiến trúc đủ sạch để nâng production mà không viết lại. |
| Ngoài phạm vi (1 tháng) | Vai trò Lãnh đạo; miễn giảm/hoàn/xóa nợ; thanh toán thật, VietQR, sao kê ngân hàng; HĐĐT; KBNN; import Excel thật; chốt quy tắc biên lai (còn mở); production deploy. |

## Điểm còn mở

- Ai phát hành biên lai cho hộ (công ty hay hệ thống).
- Luồng tiền cuối cùng (đã chốt theo góp ý BA 05/10: công ty nộp tiền mặt đã thu trừ phí thu gom và điều chỉnh).
- CSDL hộ chuẩn: đang xin dữ liệu từ xã và công ty; data dictionary là đầu vào.
