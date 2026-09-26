import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  it('khởi động được với AntD tiếng Việt, router và React Query', async () => {
    render(<App />);
    expect(await screen.findByText('Thu giá dịch vụ VSMT – xã Đông Thạnh')).toBeInTheDocument();
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
  });
});
