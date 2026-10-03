import { ApiError } from '../api/client';
import { errorMessage, isNetworkError } from './errors';

describe('errors', () => {
  it('hiện đúng message backend, lỗi lạ thì dùng câu dự phòng', () => {
    expect(errorMessage(new ApiError(422, 'X', 'Khoản đã thu.'), 'dự phòng')).toBe('Khoản đã thu.');
    expect(errorMessage(new Error('boom'), 'dự phòng')).toBe('dự phòng');
  });

  it('nhận ra lỗi mạng', () => {
    expect(isNetworkError(new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(true);
    expect(isNetworkError(new ApiError(409, 'CONFLICT', 'x'))).toBe(false);
    expect(isNetworkError(new Error('x'))).toBe(false);
  });
});
