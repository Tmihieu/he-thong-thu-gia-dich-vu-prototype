# Phiếu quyết toán thay phiếu thu / phiếu chi (07/10)

Người dùng chốt 07/10/2026. Thay cho quyết định "giữ nhiều phiếu thu và nhiều phiếu chi trong một kỳ" ở `doi-soat-mockup-0710.md`.

## Căn cứ (QĐ 65/2026/QĐ-UBND TP.HCM, tra LuatVietnam 07/10)

- Đ8.10(e): xã tổng hợp và nộp về tài khoản Sở NN&MT **trước ngày 10 mỗi tháng** số thu của **tháng liền trước**, giữ lại tối đa 8% (Đ7.1).
- Đ6.2(c): đơn vị thu gom thu hộ phải chuyển nộp đầy đủ tiền vận chuyển, xử lý về xã. QĐ **không đặt hạn** công ty nộp xã, xã tự đặt.
- QĐ không có mẫu phiếu / biên bản quyết toán.

## Quyết định

| # | Nội dung |
|---|---|
| Q1 | Kỳ có **hai hạn**: hạn dân đóng (`due_date`) và hạn quyết toán (công ty đến quyết toán với xã). |
| Q2 | Hạn dân đóng mặc định **ngày 25 tháng cuối kỳ** (kỳ tháng: 25 hằng tháng; kỳ quý: 25 tháng thứ 3). Vẫn sửa được khi mở kỳ. |
| Q3 | Hạn quyết toán = **ngày 5 tháng sau kỳ**, cố định, không sửa theo từng kỳ, không lùi khi rơi vào ngày nghỉ (tính ra từ ngày cuối kỳ, không lưu cột). Hạn dân đóng phải trước hạn quyết toán. |
| Q4 | Xã nộp Sở chậm nhất **ngày 9** tháng sau ("trước ngày 10"). Demo không làm phần nộp Sở (BR-REM-14). |
| Q5 | Mỗi công ty, mỗi kỳ **một phiếu quyết toán**, lập một lần, không sửa, không hủy. Thay phiếu thu công ty (UC-35) và phiếu chi trả công ty (UC-55). |
| Q6 | Chênh lệch bằng 0 vẫn phải lập phiếu quyết toán (công ty vẫn đến nhận quyết toán). |
| Q7 | Công ty chỉ xem phiếu của mình. **Bỏ báo sai sót** phiếu thu và phiếu chi trả (UC-36, UC-37, UC-56, UC-57). |
| Q8 | Quá hạn quyết toán: xem mục dưới. |
| Q9 | Giữ kỳ quý. |
| Q10 | Chưa hỏi kế toán xã việc phiếu quyết toán thay phiếu thu/chi trong sổ của xã; vẫn làm. |

## Quy tắc phiếu quyết toán

- Chỉ **cán bộ xã** lập; kỳ đang thu; chỉ **sau hạn dân đóng** (hôm nay > `due_date`). Lập sau hạn quyết toán vẫn được (quyết toán trễ).
- Số tiền **hệ thống tự tính**, người lập không nhập: 
  - Công ty phải nộp xã = vận chuyển + xử lý trong tiền mặt công ty thu (đã trừ điều chỉnh kỳ trước) = `payable + qrCollection`.
  - Xã phải trả công ty = thu gom trong tiền QR vào tài khoản xã = `qrCollection`.
  - Chênh lệch = hai số trên trừ nhau = `payable`. Dương: công ty nộp xã. Âm: xã trả công ty. Bằng 0: không chuyển tiền.
- Người lập nhập: ngày quyết toán (không sau hôm nay), người đại diện công ty, hình thức (tiền mặt / chuyển khoản, bắt buộc khi chênh lệch khác 0), số chứng từ, ghi chú.
- Mã `QT-<kỳ>-nnn` (vd. `QT-0926-001`). Phiếu lưu cả ba số tại lúc lập.
- **Chốt số:** sau khi công ty đã quyết toán kỳ K, mọi tiền phát sinh sau đó cho khoản của công ty ở kỳ K (dân đóng trễ, chuyển khoản về trễ, hoàn tiền, xóa nợ) ghi vào **kỳ đang thu mới nhất khác K**, như công nợ của hộ ở kỳ đã khóa (BR-REM-15). Chưa có kỳ đang thu khác thì chưa ghi được (`NO_COLLECTING_PERIOD`).
- Khóa kỳ: mọi công ty có số liệu trong kỳ đã có phiếu quyết toán (`PERIOD_NOT_SETTLED`), không còn QR chưa xác định (`PERIOD_UNIDENTIFIED_QR`).
- Báo công ty (thông báo) khi xã lập phiếu; có nhật ký `ISSUE_SETTLEMENT`.

## Q8: quá hạn quyết toán (đề xuất, đã làm)

Tra thêm: QĐ 65 không có chế tài khi công ty nộp chậm; khoản này là nghĩa vụ trả tiền theo hợp đồng / văn bản giao thu hộ giữa xã và công ty. Bộ luật Dân sự 2015 Đ357: lãi chậm trả theo thỏa thuận, không quá 20%/năm (Đ468 k1); không thỏa thuận thì 10%/năm.

Cách xử lý trong hệ thống:
1. Qua hạn quyết toán (từ ngày 6) mà chưa có phiếu: dòng công ty ở Đối soát là **Lệch**, Tiến độ thu là **Quá hạn**; nhắc nộp làm được như hiện nay cho công ty còn phải nộp.
2. Vẫn lập phiếu quyết toán trễ được; số tiền vẫn là số của kỳ đó (đã chốt từ hạn dân đóng, tiền đến sau chưa quyết toán vẫn tính vào kỳ đó cho tới lúc lập phiếu).
3. Kỳ không khóa được tới khi mọi công ty quyết toán.
4. Ngày 9 xã nộp Sở phần đang có; phần công ty chưa nộp nộp tiếp tháng sau khi thu được (ngoài phạm vi demo).
5. Lãi chậm nộp: đưa vào hợp đồng xã – công ty (đề xuất), hệ thống chưa tính.
