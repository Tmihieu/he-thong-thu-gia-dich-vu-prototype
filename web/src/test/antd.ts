import { fireEvent, screen } from '@testing-library/react';

/** Nhập ngày dd/MM/yyyy vào DatePicker của AntD: đặt giá trị một lần rồi Enter (nhanh hơn gõ từng phím). */
export function pickDate(input: HTMLElement, value: string) {
  fireEvent.mouseDown(input);
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

/** Chọn một lựa chọn của AntD Select theo nhãn (AntD gắn title = nhãn cho mỗi lựa chọn). */
export async function pickOption(combobox: HTMLElement, label: string) {
  fireEvent.mouseDown(combobox);
  fireEvent.click(await screen.findByTitle(label));
}
