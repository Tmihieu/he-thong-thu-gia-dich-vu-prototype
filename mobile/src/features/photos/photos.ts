import * as ImagePicker from 'expo-image-picker';
import type { ImageURISource } from 'react-native';

import { api, ApiError, getAccessToken, getApiBaseUrl } from '../../api/client';

/** Ảnh đã tải lên `POST /api/citizen/photos`: `name` gửi kèm bài/yêu cầu, `url` tương đối để hiện ảnh. */
export type UploadedPhoto = { name: string; url: string };

/** Theo backend (`MarketService.MAX_PHOTOS`, form prototype "Thêm tối đa 5 ảnh"). */
export const MAX_PHOTOS = 5;

export const PICK_FAILED = 'Không mở được thư viện ảnh. Vui lòng thử lại.';
export const PERMISSION_DENIED = 'Ứng dụng chưa được phép truy cập ảnh. Hãy cho phép trong Cài đặt của điện thoại.';

/**
 * Chọn tối đa `max` ảnh từ thư viện; [] khi người dùng hủy. Theo tài liệu SDK 57 không cần xin quyền trước khi mở
 * thư viện; mở lỗi thì xem quyền để chỉ báo "cho phép trong Cài đặt" khi thật sự bị từ chối.
 */
export async function pickPhotos(max: number): Promise<ImagePicker.ImagePickerAsset[]> {
  if (max <= 0) return [];
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: max > 1,
      selectionLimit: max,
      quality: 0.7,
      // Backend chỉ nhận JPEG/PNG/WebP: iOS đổi ảnh HEIC sang dạng tương thích.
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
  } catch {
    let denied = false;
    try {
      denied = (await ImagePicker.getMediaLibraryPermissionsAsync()).status === ImagePicker.PermissionStatus.DENIED;
    } catch {
      // không đọc được quyền: báo câu chung
    }
    throw new Error(denied ? PERMISSION_DENIED : PICK_FAILED);
  }
  return result.canceled ? [] : result.assets.slice(0, max);
}

type PickedAsset = Pick<ImagePicker.ImagePickerAsset, 'uri' | 'fileName' | 'mimeType'>;

/** Phần tệp kiểu React Native (`{uri, name, type}`); backend nhận dạng ảnh theo nội dung nên tên/kiểu chỉ để tham khảo. */
export function photoFormPart(asset: PickedAsset) {
  return { uri: asset.uri, name: asset.fileName ?? 'anh.jpg', type: asset.mimeType ?? 'image/jpeg' };
}

/** Mặc định `POST /api/citizen/photos`; chợ đồ cũ truyền `send` riêng (`POST /api/citizen/market/images`). */
export type PhotoSender = (form: FormData) => Promise<UploadedPhoto>;
const defaultSend: PhotoSender = (form) => api.upload<UploadedPhoto>('/api/citizen/photos', form);

export async function uploadPhoto(asset: PickedAsset, send: PhotoSender = defaultSend): Promise<UploadedPhoto> {
  const form = new FormData();
  // Kiểu DOM của TypeScript không biết dạng `{uri, name, type}` mà FormData của React Native nhận.
  form.append('file', photoFormPart(asset) as unknown as Blob);
  return send(form);
}

export function photoErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.code === 'FILE_TOO_LARGE' ? 'Ảnh vượt quá 5 MB. Vui lòng chọn ảnh khác.' : err.message;
  }
  return 'Không tải được ảnh lên. Vui lòng thử lại.';
}

/** Tải song song; ảnh lỗi bị bỏ qua, giữ các ảnh đã lên và báo lỗi đầu tiên. */
export async function uploadAll(
  assets: PickedAsset[],
  send?: PhotoSender,
): Promise<{ uploaded: UploadedPhoto[]; error: string | null }> {
  const results = await Promise.allSettled(assets.map((a) => uploadPhoto(a, send)));
  const uploaded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
  const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
  return { uploaded, error: failed ? photoErrorMessage(failed.reason) : null };
}

/**
 * Luồng nút "Thêm ảnh": chọn số ảnh còn thiếu rồi tải lên. `onBusyChange(true)` chỉ khi có ảnh đang tải và luôn
 * `false` khi xong/lỗi, để form khóa nút gửi (tránh gửi thiếu ảnh).
 */
export async function addPhotos(
  current: number,
  max: number,
  onBusyChange: (busy: boolean) => void,
  send?: PhotoSender,
): Promise<{ uploaded: UploadedPhoto[]; error: string | null }> {
  let assets: ImagePicker.ImagePickerAsset[];
  try {
    assets = await pickPhotos(max - current);
  } catch (e) {
    // `pickPhotos` chỉ ném Error với câu tiếng Việt ở trên.
    return { uploaded: [], error: e instanceof Error ? e.message : PICK_FAILED };
  }
  if (assets.length === 0) return { uploaded: [], error: null };
  onBusyChange(true);
  try {
    return await uploadAll(assets, send);
  } finally {
    onBusyChange(false);
  }
}

/** Nguồn `<Image>` cho ảnh đã lưu: ghép địa chỉ máy chủ và gắn token người dân (backend chặn khi thiếu token). */
export function photoSource(url: string): ImageURISource {
  const token = getAccessToken();
  return { uri: getApiBaseUrl() + url, headers: token ? { Authorization: `Bearer ${token}` } : undefined };
}
