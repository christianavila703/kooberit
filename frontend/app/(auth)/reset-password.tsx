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
import api from '@/libs/api';
import endpoints from '@/constants/endpoints';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (errors.otp) {
      const newErrors = { ...errors };
      delete newErrors.otp;
      setErrors(newErrors);
    }

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      newErrors.otp = 'Please enter the complete 6-digit code';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleReset = async () => {
    if (!validateForm()) {
      return;
    }

    if (!email) {
      notification.error('Error', 'Email is required');
      return;
    }

    setIsLoading(true);
    const otpCode = otp.join('');

    try {
      const response = await api.post(endpoints.auth.resetPassword, {
        email,
        otpCode,
        newPassword,
      });

      if (response.data.success) {
        notification.success(
          'Password Reset!',
          'Your password has been successfully reset.'
        );
        router.replace('/sign-in' as any);
      } else {
        throw new Error(response.data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to reset password';
      
      if (errorMessage.includes('OTP') || errorMessage.includes('code')) {
        setErrors({ otp: errorMessage });
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        notification.error('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      notification.error('Error', 'Email is required');
      return;
    }

    setIsResending(true);
    try {
      const response = await api.post(endpoints.auth.forgotPassword, {
        email,
      });

      if (response.data.success) {
        notification.success(
          'Code Resent',
          'A new verification code has been sent to your email.'
        );
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        throw new Error(response.data.message || 'Failed to resend code');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to resend code';
      notification.error('Error', errorMessage);
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
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Enter the verification code sent to {email} and your new password.
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Verification Code</Text>
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
                      borderColor: errors.otp ? '#FF3B30' : digit ? colors.tint : 'transparent',
                      borderWidth: digit || errors.otp ? 2 : 0,
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
            {errors.otp ? <Text style={styles.errorText}>{errors.otp}</Text> : null}
            <TouchableOpacity
              onPress={handleResend}
              disabled={isResending || isLoading}
              style={styles.resendButton}>
              {isResending ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[styles.resendLink, { color: colors.tint }]}>Resend Code</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* New Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                    borderColor: errors.newPassword ? '#FF3B30' : 'transparent',
                    borderWidth: errors.newPassword ? 1 : 0,
                  },
                ]}
                placeholder="Enter new password (min. 8 characters)"
                placeholderTextColor={colors.icon}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) {
                    const newErrors = { ...errors };
                    delete newErrors.newPassword;
                    setErrors(newErrors);
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}>
                <Text style={[styles.eyeIconText, { color: colors.icon }]}>
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.newPassword ? (
              <Text style={styles.errorText}>{errors.newPassword}</Text>
            ) : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                    borderColor: errors.confirmPassword ? '#FF3B30' : 'transparent',
                    borderWidth: errors.confirmPassword ? 1 : 0,
                  },
                ]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.icon}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    const newErrors = { ...errors };
                    delete newErrors.confirmPassword;
                    setErrors(newErrors);
                  }
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}>
                <Text style={[styles.eyeIconText, { color: colors.icon }]}>
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (isLoading || otpCode.length !== 6 || !newPassword || !confirmPassword) &&
                styles.buttonDisabled,
              { backgroundColor: colors.tint },
            ]}
            onPress={handleReset}
            disabled={isLoading || otpCode.length !== 6 || !newPassword || !confirmPassword}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>

          {/* Back to Sign In */}
          <TouchableOpacity
            style={styles.backToSignIn}
            onPress={() => router.back()}
            disabled={isLoading}>
            <Text style={[styles.backToSignInText, { color: colors.icon }]}>
              Back to Sign In
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  otpContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendButton: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '400',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 10,
    padding: 4,
  },
  eyeIconText: {
    fontSize: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  backToSignIn: {
    alignItems: 'center',
  },
  backToSignInText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

