import { Alert, Platform } from 'react-native';

/**
 * Hộp xác nhận trước thao tác khó hoàn tác. `Alert.alert` của React Native không làm gì trên web
 * (bản chạy thử `expo start --web`), nên web dùng hộp xác nhận của trình duyệt.
 */
export function confirmAction({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}): void {
  if (Platform.OS === 'web') {
    const ask = (globalThis as { confirm?: (text: string) => boolean }).confirm;
    if (ask?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Để sau', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
