import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('khởi động được và chưa đăng nhập thì mở trang đăng nhập', async () => {
    sessionStorage.clear();
    render(<App />);
    expect(await screen.findByRole('button', { name: /Đăng nhập/ })).toBeInTheDocument();
    expect(screen.getByText('Thu giá dịch vụ VSMT')).toBeInTheDocument();
  });
});
