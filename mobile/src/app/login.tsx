import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DEMO_OTP, DEMO_PHONE } from '../features/auth/demo';
import { useSession } from '../features/auth/SessionProvider';
import { validateOtp, validatePhone } from '../features/auth/validate';
import { citizenApi } from '../features/citizen/api';
import { errorMessage } from '../shared/errors';
import { colors, radius, size, spacing, type as t } from '../shared/theme';
import { Button, Callout, Field, InlineError, Muted, OfflineBar } from '../shared/ui';

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
    if (request.isPending) return;
    const error = validatePhone(phone);
    setFieldError(error);
    if (!error) request.mutate();
  };
  const submitOtp = () => {
    if (verify.isPending) return;
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
      <OfflineBar />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image source={require('../../assets/logo-dong-thanh.jpg')} style={styles.logo} accessibilityLabel="Logo xã Đông Thạnh" />
          <View style={styles.brandText}>
            <Text accessibilityRole="header" style={styles.title}>
              Thu giá dịch vụ VSMT
            </Text>
            <Muted>Xã Đông Thạnh, ứng dụng dành cho người dân</Muted>
          </View>
        </View>

        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              <Text accessibilityRole="header" style={styles.formTitle}>
                Đăng nhập
              </Text>
              <Field
                label="Số điện thoại"
                hint="Số đã đăng ký với UBND xã"
                error={fieldError}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  setFieldError(null);
                }}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={submitPhone}
              />
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.formTitle}>
                Nhập mã OTP
              </Text>
              <Callout tone="info" title="Đăng nhập mô phỏng">
                {notice ?? 'Mã OTP là mã thử nghiệm cố định, không gửi tin nhắn SMS.'}
              </Callout>
              <Muted>
                Số điện thoại: <Text style={styles.phoneValue}>{phone}</Text>
              </Muted>
              <Field
                label="Mã OTP"
                error={fieldError}
                value={otp}
                onChangeText={(v) => {
                  setOtp(v);
                  setFieldError(null);
                }}
                style={styles.otpInput}
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

          {serverError ? <InlineError message={errorMessage(serverError, 'Có lỗi xảy ra. Vui lòng thử lại.')} /> : null}

          {step === 'phone' ? (
            <Button title="Nhận mã OTP" onPress={submitPhone} loading={request.isPending} />
          ) : (
            <>
              <Button title="Đăng nhập" onPress={submitOtp} loading={verify.isPending} />
              <Button title="Đổi số điện thoại" variant="quiet" onPress={back} />
            </>
          )}
        </View>

        <Button title="Kiểm tra kết nối máy chủ" variant="quiet" icon="wifi-outline" onPress={() => router.push('/connection')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.xl },
  brand: { gap: spacing.lg },
  logo: { width: size.logo, height: size.logo, borderRadius: radius.pill },
  brandText: { gap: spacing.xs },
  title: { ...t.brand, color: colors.text },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  formTitle: { ...t.heading, color: colors.text },
  phoneValue: { fontWeight: '700', color: colors.text },
  otpInput: { ...t.code, letterSpacing: 6, textAlign: 'center' },
});
