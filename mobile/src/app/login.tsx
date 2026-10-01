import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../api/client';
import { DEMO_OTP, DEMO_PHONE } from '../features/auth/demo';
import { useSession } from '../features/auth/SessionProvider';
import { validateOtp, validatePhone } from '../features/auth/validate';
import { citizenApi } from '../features/citizen/api';
import { colors, radius, spacing } from '../shared/theme';
import { Button } from '../shared/ui';

function describe(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Có lỗi xảy ra. Vui lòng thử lại.';
}

/** Đăng nhập người dân: SĐT → OTP (mô phỏng, không gửi SMS, O7). */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [otp, setOtp] = useState(DEMO_OTP);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const request = useMutation({
    mutationFn: () => citizenApi.requestOtp(phone),
    onSuccess: (res) => {
      setNotice(res.message);
      setStep('otp');
    },
  });
  const verify = useMutation({
    mutationFn: () => citizenApi.verifyOtp(phone, otp.trim()),
    onSuccess: (res) => signIn({ accessToken: res.accessToken, expiresAt: res.expiresAt, account: res.account }),
  });

  const submitPhone = () => {
    const error = validatePhone(phone);
    setFieldError(error);
    if (!error) request.mutate();
  };
  const submitOtp = () => {
    const error = validateOtp(otp);
    setFieldError(error);
    if (!error) verify.mutate();
  };
  const back = () => {
    setStep('phone');
    setOtp(DEMO_OTP);
    setFieldError(null);
    verify.reset();
  };

  const serverError = step === 'phone' ? request.error : verify.error;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Image source={require('../../assets/logo-dong-thanh.jpg')} style={styles.logo} accessibilityLabel="Logo xã Đông Thạnh" />
          <Text style={styles.brand}>Thu giá dịch vụ VSMT</Text>
          <Text style={styles.heroSub}>Xã Đông Thạnh · ứng dụng người dân</Text>
        </View>

        <View style={styles.card}>
          {step === 'phone' ? (
            <>
              <Text style={styles.title}>Đăng nhập</Text>
              <Text style={styles.help}>Nhập số điện thoại đã đăng ký với UBND xã.</Text>
              <TextInput
                accessibilityLabel="Số điện thoại"
                style={styles.input}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setFieldError(null);
                }}
                placeholder="Số điện thoại"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={submitPhone}
              />
            </>
          ) : (
            <>
              <Text style={styles.title}>Nhập mã OTP</Text>
              <Text style={styles.help}>{notice}</Text>
              <Text style={styles.phoneLine}>
                Số điện thoại: <Text style={styles.phoneValue}>{phone}</Text>
              </Text>
              <TextInput
                accessibilityLabel="Mã OTP"
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={(v) => {
                  setOtp(v);
                  setFieldError(null);
                }}
                placeholder="Mã OTP"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={8}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submitOtp}
              />
            </>
          )}

          {fieldError ? <Text style={styles.error}>{fieldError}</Text> : null}
          {serverError ? <Text style={styles.error}>{describe(serverError)}</Text> : null}

          {step === 'phone' ? (
            <Button title="Nhận mã OTP" onPress={submitPhone} loading={request.isPending} />
          ) : (
            <>
              <Button title="Đăng nhập" onPress={submitOtp} loading={verify.isPending} />
              <Pressable onPress={back} style={styles.linkButton} accessibilityRole="button">
                <Text style={styles.link}>Đổi số điện thoại</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable onPress={() => router.push('/connection')} style={styles.linkButton} accessibilityRole="button">
          <Text style={styles.link}>Kiểm tra kết nối máy chủ</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.chrome },
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.chrome },
  hero: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  logo: { width: 96, height: 96, borderRadius: radius.pill, marginBottom: spacing.sm },
  brand: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  heroSub: { color: colors.heroText, fontSize: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  help: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  phoneLine: { fontSize: 14, color: colors.textMuted },
  phoneValue: { color: colors.text, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.background,
  },
  otpInput: { letterSpacing: 6, textAlign: 'center', fontSize: 22, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 14 },
  linkButton: { alignItems: 'center', paddingVertical: spacing.sm },
  link: { color: colors.heroText, fontSize: 14, textDecorationLine: 'underline' },
});
