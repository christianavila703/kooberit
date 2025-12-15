import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { verifyEmailOTP, resendVerificationOTP, clearError } from '@/store/slices/authSlice';
import { IRootState } from '@/store';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isLoading, error, isAuthenticated } = useAppSelector((state: IRootState) => state.auth);

  // Show error notification
  React.useEffect(() => {
    if (error) {
      notification.error('Verification Failed', error);
      dispatch(clearError());
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [error, dispatch]);

  // Navigate on successful verification
  React.useEffect(() => {
    if (isAuthenticated) {
      notification.success(
        'Email Verified!',
        'Your account has been successfully verified.'
      );
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, router]);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take the last character
    setOtp(newOtp);
    setLocalError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setLocalError('Please enter the complete 6-digit code');
      return;
    }

    if (!email) {
      setLocalError('Email is required');
      return;
    }

    setLocalError('');
    await dispatch(verifyEmailOTP({ email, otpCode }));
  };

  const handleResend = async () => {
    if (!email) {
      notification.error('Error', 'Email is required');
      return;
    }

    setIsResending(true);
    try {
      await dispatch(resendVerificationOTP(email)).unwrap();
      notification.success(
        'Code Resent',
        'A new verification code has been sent to your email.'
      );
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      // Error is handled by Redux and shown in useEffect
    } finally {
      setIsResending(false);
    }
  };

  const isDark = colorScheme === 'dark';
  const otpCode = otp.join('');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <IconSymbol name="envelope.fill" size={64} color={colors.tint} />
            </View>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              We've sent a 6-digit verification code to
            </Text>
            <Text style={[styles.emailText, { color: colors.tint }]}>{email}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Enter Verification Code</Text>
            <View style={styles.otpInputs}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    {
                      backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                      color: colors.text,
                      borderColor: localError ? '#FF3B30' : digit ? colors.tint : 'transparent',
                      borderWidth: digit || localError ? 2 : 0,
                    },
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!isLoading}
                />
              ))}
            </View>
            {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (isLoading || otpCode.length !== 6) && styles.buttonDisabled,
              { backgroundColor: colors.tint },
            ]}
            onPress={handleVerify}
            disabled={isLoading || otpCode.length !== 6}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendText, { color: colors.icon }]}>
              Didn't receive the code?{' '}
            </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending || isLoading}>
              {isResending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[styles.resendLink, { color: colors.tint }]}>Resend</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.backToSignIn}
            onPress={() => router.back()}
            disabled={isLoading}>
            <Text style={[styles.backToSignInText, { color: colors.icon }]}>
              Back to Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  otpInput: {
    flex: 1,
    height: 64,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  backToSignIn: {
    alignItems: 'center',
  },
  backToSignInText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

