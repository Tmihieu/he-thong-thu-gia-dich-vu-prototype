# App người dân (Expo)

Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router (màn hình trong `src/app/`) · TanStack Query · Jest (`jest-expo`).

## Chạy thử trên điện thoại (Expo Go)

1. Bật CSDL và backend (từ thư mục gốc repo):
   ```sh
   docker compose up -d db
   cd backend && ./mvnw spring-boot:run      # PowerShell: .\mvnw.cmd spring-boot:run
   ```
2. Lấy IP LAN của laptop: `ipconfig` → dòng **IPv4 Address** của card Wi-Fi (ví dụ `192.168.1.66`).
3. Tạo `mobile/.env.local` (git bỏ qua) từ `.env.example`, sửa IP:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.66:8080
   ```
   Đổi mạng Wi-Fi thì IP đổi, phải sửa lại file này rồi chạy lại `npx expo start --clear` (biến `EXPO_PUBLIC_` được gắn cứng lúc đóng gói).
4. Cài **Expo Go** bản hỗ trợ SDK 57 trên điện thoại. Điện thoại và laptop **cùng một mạng Wi-Fi**.
5. ```sh
   cd mobile
   npm install
   npx expo start
   ```
   Quét mã QR (Android: trong Expo Go; iPhone: bằng app Camera). Màn đầu tiên là **Đăng nhập**; bấm "Kiểm tra kết nối máy chủ" ở cuối màn để chắc điện thoại gọi được backend ("Kết nối thành công").
6. Đăng nhập bằng số điện thoại của một hộ demo và **OTP cố định `123456`** (không gửi SMS): danh sách ở `docs/demo-accounts.md`, hộ của kịch bản demo là `0902000128` (DTH-H000128). Phiên lưu trong SecureStore 7 ngày; hết hạn hoặc tài khoản bị khóa thì app tự về màn đăng nhập.

### Khi không kết nối được

- **Màn báo "Không kết nối được máy chủ"**: kiểm tra backend đang chạy (`http://localhost:8080/v3/api-docs` mở được trên laptop), IP trong `.env.local` đúng, hai máy cùng Wi-Fi. Mạng Wi-Fi công cộng/khách thường chặn các máy nói chuyện với nhau: dùng điểm phát Wi-Fi từ điện thoại.
- **Tường lửa Windows**: lần đầu chạy Java/Node, Windows hỏi cho phép truy cập mạng → chọn cho phép. Wi-Fi đang ở chế độ *Public* thì luật phải bật cho *Public*.
- **Không quét được QR / không tải được bundle** (mạng chặn cổng 8081): chạy `npx expo start --tunnel`. Tunnel chỉ chuyển bundle của Expo; backend vẫn phải tới được qua IP LAN ở bước 3.

## Lệnh

```sh
npm test            # Jest
npm run typecheck   # tsc --noEmit
npm run gen:api     # sinh src/api/schema.d.ts từ http://localhost:8080/v3/api-docs (backend phải đang chạy)
npx expo-doctor     # kiểm tra phiên bản phụ thuộc so với SDK
```

- Cài thêm thư viện bằng `npx expo install <gói>` để lấy đúng bản tương thích SDK 57.
- Đóng gói thử không cần điện thoại: `NODE_OPTIONS=--max-old-space-size=8192 npx expo export --platform android --output-dir <thư mục tạm>` (Metro cần heap lớn hơn mặc định của Node, nếu không sẽ báo "out of memory").
- Màn hình: `src/app/login.tsx` (SĐT → OTP) · `src/app/(tabs)/` bốn tab như prototype (Trang chủ, Chợ đồ cũ, Thông báo, Tài khoản) · `src/app/charges.tsx` khoản phí · `src/app/household.tsx` thông tin hộ · `src/app/connection.tsx` kiểm tra kết nối. Phiên đăng nhập: `src/features/auth/`.
- `gen:api` gọi `npx openapi-typescript@7.13.0` (cùng bản với web) thay vì cài vào `devDependencies`, vì openapi-typescript 7 chỉ nhận TypeScript 5 còn SDK 57 dùng TypeScript 6.
