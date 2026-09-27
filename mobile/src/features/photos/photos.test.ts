import * as ImagePicker from 'expo-image-picker';

import { api, ApiError, configureApi, setTokenGetter } from '../../api/client';
import {
  addPhotos,
  PERMISSION_DENIED,
  PICK_FAILED,
  photoFormPart,
  photoSource,
  pickPhotos,
  uploadAll,
  uploadPhoto,
} from './photos';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  getMediaLibraryPermissionsAsync: jest.fn(),
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNDETERMINED: 'undetermined' },
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}));

const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const permission = jest.mocked(ImagePicker.getMediaLibraryPermissionsAsync);

function permissionStatus(status: ImagePicker.PermissionStatus) {
  permission.mockResolvedValue({ status, granted: status === ImagePicker.PermissionStatus.GRANTED, canAskAgain: false, expires: 'never' });
}

function asset(n: number): ImagePicker.ImagePickerAsset {
  return { uri: `file:///anh-${n}.jpg`, width: 100, height: 100, fileName: `anh-${n}.jpg`, mimeType: 'image/jpeg' };
}

const photoA = { name: 'a.jpg', url: '/api/citizen/photos/a.jpg' };

beforeEach(() => {
  jest.restoreAllMocks();
  launch.mockReset();
  permission.mockReset();
  configureApi({ baseUrl: 'http://192.168.1.10:8080' });
  setTokenGetter(() => 'tok');
});

describe('pickPhotos', () => {
  it('chỉ cho chọn số ảnh còn thiếu và cắt bớt nếu thư viện trả thừa', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [asset(1), asset(2), asset(3)] });

    const picked = await pickPhotos(2);

    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'], selectionLimit: 2, allowsMultipleSelection: true, quality: 0.7 }),
    );
    expect(picked.map((a) => a.uri)).toEqual(['file:///anh-1.jpg', 'file:///anh-2.jpg']);
  });

  it('đã đủ ảnh thì không mở thư viện; hủy chọn thì trả rỗng', async () => {
    await expect(pickPhotos(0)).resolves.toEqual([]);
    expect(launch).not.toHaveBeenCalled();

    launch.mockResolvedValue({ canceled: true, assets: null });
    await expect(pickPhotos(5)).resolves.toEqual([]);
  });

  it('mở lỗi do bị từ chối quyền thì hướng dẫn vào Cài đặt', async () => {
    launch.mockRejectedValue(new Error('Missing photo library permission'));
    permissionStatus(ImagePicker.PermissionStatus.DENIED);

    await expect(pickPhotos(5)).rejects.toThrow(PERMISSION_DENIED);
  });

  it('mở lỗi vì lý do khác (quyền chưa hỏi/đã cho, hoặc không đọc được quyền) thì báo câu chung', async () => {
    launch.mockRejectedValue(new Error('boom'));

    permissionStatus(ImagePicker.PermissionStatus.UNDETERMINED);
    await expect(pickPhotos(5)).rejects.toThrow(PICK_FAILED);
    permissionStatus(ImagePicker.PermissionStatus.GRANTED);
    await expect(pickPhotos(5)).rejects.toThrow(PICK_FAILED);
    permission.mockRejectedValue(new Error('no module'));
    await expect(pickPhotos(5)).rejects.toThrow(PICK_FAILED);
  });
});

describe('uploadPhoto', () => {
  it('gửi multipart trường file (dạng {uri, name, type}) tới /api/citizen/photos', async () => {
    const append = jest.spyOn(FormData.prototype, 'append');
    const upload = jest.spyOn(api, 'upload').mockResolvedValue(photoA);

    await expect(uploadPhoto(asset(1))).resolves.toEqual(photoA);

    expect(upload).toHaveBeenCalledWith('/api/citizen/photos', expect.any(FormData));
    expect(append).toHaveBeenCalledWith('file', { uri: 'file:///anh-1.jpg', name: 'anh-1.jpg', type: 'image/jpeg' });
  });

  it('thiếu tên/kiểu tệp thì dùng mặc định JPEG', () => {
    expect(photoFormPart({ uri: 'file:///x', fileName: null, mimeType: undefined })).toEqual({
      uri: 'file:///x',
      name: 'anh.jpg',
      type: 'image/jpeg',
    });
  });
});

describe('uploadAll', () => {
  it('giữ ảnh đã lên, báo lỗi ảnh quá 5 MB bằng câu dễ hiểu', async () => {
    jest
      .spyOn(api, 'upload')
      .mockResolvedValueOnce(photoA)
      .mockRejectedValueOnce(new ApiError(422, 'FILE_TOO_LARGE', 'Tệp tải lên vượt quá dung lượng cho phép.'));

    const { uploaded, error } = await uploadAll([asset(1), asset(2)]);

    expect(uploaded).toEqual([photoA]);
    expect(error).toBe('Ảnh vượt quá 5 MB. Vui lòng chọn ảnh khác.');
  });

  it('lỗi nghiệp vụ khác giữ nguyên thông báo của backend; lỗi lạ báo câu chung', async () => {
    jest
      .spyOn(api, 'upload')
      .mockRejectedValueOnce(new ApiError(422, 'PHOTO_TYPE_INVALID', 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.'))
      .mockRejectedValueOnce(new TypeError('boom'));

    await expect(uploadAll([asset(1)])).resolves.toEqual({ uploaded: [], error: 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.' });
    await expect(uploadAll([asset(2)])).resolves.toEqual({ uploaded: [], error: 'Không tải được ảnh lên. Vui lòng thử lại.' });
  });
});

describe('addPhotos', () => {
  it('chọn phần còn thiếu, báo bận đúng lúc đang tải rồi hết bận', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    let finish: (p: typeof photoA) => void = () => {};
    jest.spyOn(api, 'upload').mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const busy = jest.fn();

    const pending = addPhotos(3, 5, busy);
    await new Promise((r) => setTimeout(r, 0));
    expect(launch).toHaveBeenCalledWith(expect.objectContaining({ selectionLimit: 2 }));
    expect(busy.mock.calls).toEqual([[true]]);

    finish(photoA);
    await expect(pending).resolves.toEqual({ uploaded: [photoA], error: null });
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });

  it('hủy chọn hoặc không mở được thư viện thì không báo bận', async () => {
    const busy = jest.fn();
    launch.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(addPhotos(0, 5, busy)).resolves.toEqual({ uploaded: [], error: null });

    launch.mockRejectedValueOnce(new Error('denied'));
    await expect(addPhotos(0, 5, busy)).resolves.toEqual({ uploaded: [], error: PICK_FAILED });
    expect(busy).not.toHaveBeenCalled();
  });

  it('ảnh tải lỗi vẫn hết bận và trả lỗi tiếng Việt', async () => {
    launch.mockResolvedValue({ canceled: false, assets: [asset(1)] });
    jest.spyOn(api, 'upload').mockRejectedValue(new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ.'));
    const busy = jest.fn();

    await expect(addPhotos(0, 5, busy)).resolves.toEqual({ uploaded: [], error: 'Không kết nối được máy chủ.' });
    expect(busy.mock.calls).toEqual([[true], [false]]);
  });
});

describe('photoSource', () => {
  it('ghép địa chỉ máy chủ và gắn token', () => {
    expect(photoSource('/api/citizen/photos/a.jpg')).toEqual({
      uri: 'http://192.168.1.10:8080/api/citizen/photos/a.jpg',
      headers: { Authorization: 'Bearer tok' },
    });
  });
});
