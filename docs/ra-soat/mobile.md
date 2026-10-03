# Mobile — rà soát 04/10/2026

Nhánh `ra-soat/mobile`. Làm lại toàn bộ giao diện app người dân, giữ route, API, logic và các hàm đã có test.

## Hệ thiết kế mới

- `src/shared/theme.ts`: màu ngữ nghĩa (thương hiệu xanh lá đậm cho hành động chính; đỏ / cam / xanh dương / xanh lá riêng cho trạng thái), thang chữ (thân 16, phụ 15, chú thích 14, nhãn trạng thái 13), khoảng cách, bo góc (một thang 8 / 12 / 16 / pill), kích thước chạm (≥ 44, nút 52, ô nhập 52, hàng 60). Không còn màu / cỡ chữ cứng trong màn.
- `src/shared/ui.tsx`: `Screen` (kéo để làm mới, tránh bàn phím, vùng an toàn, thanh hành động cố định ở đáy), `Card`, `ListGroup` + `ListRow` (thay "thẻ lồng thẻ"), `Line`, `Tag` (có biểu tượng), `Amount` (qua `formatMoney`, chữ số cùng bề rộng), `Callout`, `Button` (primary / secondary / danger / quiet, chặn bấm khi đang gửi, phản hồi chạm), `Chip` (đang chọn có dấu tích), `Field` (nhãn trên ô, gợi ý, lỗi dưới ô), `ChoiceGroup`, `EmptyState`, `ErrorState` (có "Thử lại", phân biệt mất mạng), `Loading`, `OfflineBar` (thanh mất mạng).
- Phụ trợ: `shared/errors.ts` (`errorMessage` hiện đúng `message` backend), `shared/connectionState.ts` (bật / tắt thanh mất mạng theo kết quả truy vấn, không cần NetInfo), `shared/confirm.ts` (hộp xác nhận chạy cả trên web), `shared/headerOptions.ts` (header sáng dùng chung Stack và Tabs).
- Hướng thiết kế: ứng dụng dịch vụ công, tin cậy, tương phản cao, nền sáng trung tính. Có đúng một khối nhấn màu xanh đậm trên trang chủ (khoản phải đóng). Không gradient, không emoji làm biểu tượng (dùng Ionicons), không đổ bóng nặng.

## Đã rà (đánh dấu từng màn)

Tất cả màn đã vẽ lại bố cục, không chỉ đổi màu.

- [x] Khung: header, tab bar (nhãn luôn hiện, badge chưa đọc), thanh mất mạng, trạng thái trống / lỗi / tải
- [x] `/login` đăng nhập OTP mô phỏng (có Callout "Đăng nhập mô phỏng", lỗi dưới ô, chặn gửi trùng)
- [x] `/(tabs)` Trang chủ: khoản phải đóng + hạn + nút là tiêu điểm; "Đang xử lý"; lưới dịch vụ; đơn vị thu gom
- [x] `/(tabs)/market`, `/market/[id]`, `/market/new`, `/market/mine`, `/market/saved`, `/market/blocks`
- [x] `/(tabs)/notifications`, `/(tabs)/account`
- [x] `/charges`, `/pay/[chargeId]`, `/confirmations`, `/confirmations/[id]`
- [x] `/household`, `/schedule`, `/connection`, `/coming-soon`
- [x] `/complaints` (danh sách, mới, chi tiết có timeline), `/bulky` (danh sách, mới, chi tiết)

Chưa làm lại: không có màn nào bỏ sót.

## Sạn đã sửa

| # | Màn / file | Sạn | Rule | Commit |
|---|---|---|---|---|
| 1 | `shared/labels.ts` | Nhãn trạng thái khoản là "Chưa đóng / Đã đóng / Miễn", lệch rule | BR-BIL-10 | 007d5f8 |
| 2 | Trang chủ | Nút trên cùng luôn thanh toán khoản đầu tiên trong khi số tiền hiện là tổng nhiều khoản. Nay: 1 khoản thì "Thanh toán", nhiều khoản thì "Xem N khoản cần đóng" | BR-CIT-03 | 18a1b91 |
| 3 | Trang chủ | Danh sách phản ánh chỉ vào được từ tab Tài khoản; lối tắt "Gửi phản ánh" mở thẳng form. Nay lối tắt mở danh sách (có nút gửi mới) | — | 18a1b91 |
| 4 | Thông báo | Nhắc nộp phí cho hộ (`REMINDER`) backend gửi `link = null` nên bấm không mở gì. Nay mở "Khoản phí của hộ" (`notificationTarget`, có test) | BR-NTF-02, BR-NTF-03 | 7f4f65e |
| 5 | `/pay/[chargeId]` | Chặn bấm đúp mới dựa vào state `isPending` (trễ một nhịp render). Thêm khóa bằng `ref`; chỉ khoản Chưa thu còn số tiền mới có nút xác nhận; ghi "mô phỏng" ở đầu màn, ở nút và ở chân màn | BR-CIT-03 | e65213f |
| 6 | Mọi hộp xác nhận (chặn, ẩn, hủy, bỏ chặn) | `Alert.alert` không làm gì trên web nên thao tác bị bỏ qua khi chạy `--web`. Nay dùng `confirmAction` | — | 99538d5 |
| 7 | Hủy yêu cầu cồng kềnh, đăng xuất | Hủy không hỏi lại; đăng xuất không hỏi lại. Thêm xác nhận | — | 99538d5, 18a1b91 |
| 8 | Form (phản ánh, cồng kềnh, đăng bài) | Placeholder dùng làm gợi ý nhãn, lỗi nằm rời trong thẻ, nút gửi cuộn mất khỏi màn, gửi lại được khi đang gửi. Nay nhãn trên ô, lỗi dưới ô, nút cố định ở đáy, khóa khi đang gửi | — | 99538d5 |
| 9 | Màn lỗi | Mỗi màn tự viết `err instanceof ApiError ? ...`. Gom về `ErrorState` / `errorMessage`; mất mạng nói rõ, lỗi khác hiện `message` backend | BR-GEN-05 | e65213f |
| 10 | Mọi màn | Chữ 12 – 14 trong thân, vùng chạm dưới 44 (chip, nút "Đánh dấu tất cả đã đọc", nút xóa ảnh 22px), màu cứng, tag chỉ phân biệt bằng màu, placeholder 3,7:1 | tiêu chí giao việc | 007d5f8, ba5cbf2 |
| 11 | Hết phiên | Đã đúng sẵn (401 → `signOut` → `Stack.Protected` về `/login`); giữ nguyên | — | — |

Đã kiểm, không có sạn: tiền / ngày đều qua `formatMoney` / `formatDate`; nhãn enum đều qua `labels.ts`; chỗ nào cũng gọi "Đăng ký thu phí", không còn chữ "hợp đồng" trong giao diện; "Xác nhận thanh toán", không gọi biên lai pháp lý.

## Kết quả kiểm tra

- `npm run typecheck`: xanh.
- `npm test -- --runInBand`: **không chạy được trên máy này**, lỗi có sẵn trước khi tôi sửa: `jest-expo` đòi gói `@react-native/jest-preset` chưa cài (lockfile lệch). Tôi không được cài gói.
- Thay vào đó chạy cùng bộ test bằng cấu hình jest tạm đặt ngoài repo (`@babel/preset-typescript`, môi trường node): **15 suite, 88 test đều xanh** (gồm 3 suite mới: `chargeStatus`, `errors`, thêm ca `notificationTarget`). Không xóa / skip test cũ. Cấu hình tạm chỉ chạy được test logic thuần, không chạy test render.
- **Chưa xem giao diện thật.** `react-native-web` chưa cài nên `expo start --web` không chạy được; không có giả lập / điện thoại trên máy này. Toàn bộ bố cục dựa vào đọc code + typecheck, chưa nhìn ảnh chụp. Cần leader (hoặc người dùng) xem trên máy thật trước khi chốt.
- Không chạy `expo lint`, `expo export`, không cài gói.

## Sạn chưa sửa (kèm lý do)

- Không xem được giao diện thật nên chưa chỉnh tinh về khoảng cách, ngắt dòng nhãn dài ("Số điện thoại đăng nhập" ở `Line`), cỡ chữ khi người dùng tăng cỡ chữ hệ thống.
- Không có chế độ tối (`app.json` đặt `userInterfaceStyle: light`); giữ nguyên.
- Màn "Chọn cách thanh toán" (QR / ví / ngân hàng) chỉ để chọn cho giống thật, không ảnh hưởng thanh toán; giữ nguyên.
- Thanh mất mạng dựa vào truy vấn lỗi mạng gần nhất, không phải dò mạng thật (không có NetInfo). Thao tác ghi (mutation) lỗi mạng chỉ hiện lỗi tại chỗ, không bật thanh.

## Đợt 2

Đã làm (sau khi merge `feat/ra-soat-tong`):

| # | Việc | Commit |
|---|---|---|
| 12 | QĐ-L4: app dân hiển thị "Chưa đóng / Đã đóng" (Miễn giảm, Đã xóa nợ giữ nguyên); đổi luôn các câu liên quan ("N khoản chưa đóng", "Đã đóng tại nhà", "Đã đóng đủ", "kỳ đã đóng", câu giải thích ở màn thanh toán); cập nhật test `chargeStatus` | a62b946 |
| 13 | Thêm nhãn khiếu nại `FACILITY` "Cơ sở vật chất" và `COLLECTION_REQUEST` "Đề nghị thu gom" (BR-CMP-05, backend 60d6cd9). Khai báo hợp nhất vào kiểu `ComplaintCategory` ở `labels.ts`, ép kiểu một chỗ ở form gửi; tự hết cần khi `gen:api` sinh lại schema. Form gửi phản ánh tự có hai loại mới | a4f21ab |
| 14 | Phê bình thiết kế (`design:design-critique`) và tự rà lại: kích thước cứng còn sót (ảnh đại diện, logo, chấm, ô tích, ảnh thu nhỏ, cỡ chữ tiêu đề đăng nhập / ô OTP / nhãn tab) gom vào `theme.ts` (`size`, `type.brand`, `type.code`, `type.tabLabel`) | da0ad7f |
| 15 | Danh sách dài chưa ảo hóa (thông báo tới 100 mục, phản ánh, xác nhận thanh toán, cồng kềnh): chuyển sang `ListScreen` (`FlatList`), tự chọn tải / lỗi / rỗng, kéo làm mới, footer cố định | da0ad7f |
| 16 | Chợ đồ cũ: đầu trang quá dài (3 hàng lọc đẩy danh sách bài xuống). Gập bộ lọc danh mục + khu vực sau nút "Lọc danh mục, khu vực" (có chữ báo "đang bật") | da0ad7f |

Kết quả đợt 2: `npm run typecheck` xanh; bộ test chạy bằng cấu hình tạm: 15 suite, 88 test xanh. `npm test` chính thức vẫn hỏng vì thiếu `@react-native/jest-preset` (leader xử lý ở thư mục gốc).

Rà lại toàn bộ màn, kết luận: không còn màu / cỡ chữ cứng ngoài theme (chỉ còn token); vùng chạm ≥ 44 (chip, nút, hàng, tab 48, nút xóa ảnh 32 + vùng mở rộng 6 mỗi cạnh); tên dài tự xuống dòng (không cắt) ở tiêu đề hàng, nhãn dòng, ô; chữ chợ cắt 3 dòng có chủ đích ở thẻ bài; mọi màn tải dữ liệu đều có trạng thái tải, lỗi (có Thử lại) và trống.

## Đợt 3

| # | Việc | Commit |
|---|---|---|
| 17 | Bỏ khai báo tạm `ComplaintCategory` và chỗ ép kiểu ở `complaints/new.tsx`; dùng type từ schema đã sinh lại. Không có cấu hình jest tạm nào trong repo (file tạm nằm ngoài repo) | 23265e8 |
| 18 | `links.ts` xử lý link mới `citizen.charges` của nhắc nộp; thông báo cũ `link=null` vẫn mở danh sách khoản phí; có test cả hai | 23265e8 |
| 19 | Rà UX: thứ tự tab (Trang chủ, Chợ đồ cũ, Thông báo, Tài khoản), nút quay lại và tiêu đề header từng màn, bàn phím số cho SĐT (`phone-pad`) / OTP, số lượng, SĐT liên hệ (`number-pad`), nhãn cho nút chỉ có icon (nút xóa ảnh, icon tab) đều đã đúng. Sửa: trạng thái trống chưa có việc làm tiếp. Nay: Chợ (xóa bộ lọc / đăng bài đầu tiên), Tin của tôi (đăng bài), Đã lưu (xem chợ), Xác nhận thanh toán (xem khoản phí) | thêm ở commit tiếp theo |

Kết quả đợt 3: `npm run typecheck` xanh; `npm test -- --runInBand` chính thức: 15 suite, 88 test xanh (đã chép `node_modules` mới từ thư mục gốc bằng `cp -rn`, không `npm install`).

## Câu hỏi nghiệp vụ

Đã chốt: QĐ-L4 (đã làm), QĐ-L5 giữ dòng "Số đăng ký", QĐ-L6 giữ "Chờ công ty báo phí". Không còn câu hỏi mở.

## Yêu cầu sang lane khác

| # | Gửi lane | Cần gì | Vì sao | Trạng thái |
|---|---|---|---|---|
| 1 | Backend | `HouseholdReminderService` gửi nhắc nộp kèm `link {screen: "citizen.charges"}` (hoặc chi tiết khoản) | Hiện `link = null`, app phải đoán đích theo loại thông báo | Leader đã chuyển lane Backend |
| 2 | Leader (cài đặt) | Cài `@react-native/jest-preset` (đúng phiên bản `jest-expo` đòi) để `npm test` chạy lại; cài `react-native-web` nếu muốn `expo start --web` | `npm test` hỏng sẵn; không thể xem giao diện trên web | Leader xử lý ở thư mục gốc |
| 3 | Leader | Sau khi chạy `gen:api` có hai loại khiếu nại mới, xóa phần khai báo tạm trong `labels.ts` (`| 'FACILITY' | 'COLLECTION_REQUEST'`) và dòng ép kiểu ở `complaints/new.tsx` | Dọn nợ kỹ thuật tạm | Chờ `gen:api` |
