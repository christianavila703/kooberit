import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import notification from '@/services/notification';
import apiService from '@/services/auth';

export default function ChangePasswordScreen() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPasswordError, setOldPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const validateOldPassword = (password: string): boolean => {
    if (!password) {
      setOldPasswordError('Current password is required');
      return false;
    }
    setOldPasswordError('');
    return true;
  };

  const validateNewPassword = (password: string): boolean => {
    if (!password) {
      setNewPasswordError('New password is required');
      return false;
    }
    if (password.length < 8) {
      setNewPasswordError('Password must be at least 8 characters long');
      return false;
    }
    if (password === oldPassword) {
      setNewPasswordError('New password must be different from current password');
      return false;
    }
    setNewPasswordError('');
    return true;
  };

  const validateConfirmPassword = (password: string): boolean => {
    if (!password) {
      setConfirmPasswordError('Please confirm your new password');
      return false;
    }
    if (password !== newPassword) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };

  const handleChangePassword = async () => {
    const isOldPasswordValid = validateOldPassword(oldPassword);
    const isNewPasswordValid = validateNewPassword(newPassword);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isOldPasswordValid || !isNewPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    setIsLoading(true);
    try {
      await apiService.changePassword(oldPassword, newPassword);
      notification.success('Success', 'Password changed successfully');
      router.back();
    } catch (error: any) {
      notification.error('Error', error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Enter your current password and choose a new one
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Old Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                      color: colors.text,
                      borderColor: oldPasswordError ? '#FF3B30' : 'transparent',
                      borderWidth: oldPasswordError ? 1 : 0,
                    },
                  ]}
                  placeholder="Enter your current password"
                  placeholderTextColor={colors.icon}
                  value={oldPassword}
                  onChangeText={(text) => {
                    setOldPassword(text);
                    if (oldPasswordError) validateOldPassword(text);
                  }}
                  onBlur={() => validateOldPassword(oldPassword)}
                  secureTextEntry={!showOldPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowOldPassword(!showOldPassword)}
                  disabled={isLoading}
                >
                  <Text style={[styles.eyeIconText, { color: colors.icon }]}>
                    {showOldPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {oldPasswordError ? (
                <Text style={styles.errorText}>{oldPasswordError}</Text>
              ) : null}
            </View>

            {/* New Password Input */}
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
                      borderColor: newPasswordError ? '#FF3B30' : 'transparent',
                      borderWidth: newPasswordError ? 1 : 0,
                    },
                  ]}
                  placeholder="Enter your new password"
                  placeholderTextColor={colors.icon}
                  value={newPassword}
                  onChangeText={(text) => {
                    setNewPassword(text);
                    if (newPasswordError) validateNewPassword(text);
                    // Re-validate confirm password if it's already filled
                    if (confirmPassword) validateConfirmPassword(confirmPassword);
                  }}
                  onBlur={() => validateNewPassword(newPassword)}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  disabled={isLoading}
                >
                  <Text style={[styles.eyeIconText, { color: colors.icon }]}>
                    {showNewPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {newPasswordError ? (
                <Text style={styles.errorText}>{newPasswordError}</Text>
              ) : (
                <Text style={[styles.hintText, { color: colors.icon }]}>
                  Must be at least 8 characters long
                </Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                      color: colors.text,
                      borderColor: confirmPasswordError ? '#FF3B30' : 'transparent',
                      borderWidth: confirmPasswordError ? 1 : 0,
                    },
                  ]}
                  placeholder="Confirm your new password"
                  placeholderTextColor={colors.icon}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) validateConfirmPassword(text);
                  }}
                  onBlur={() => validateConfirmPassword(confirmPassword)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Text style={[styles.eyeIconText, { color: colors.icon }]}>
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {confirmPasswordError ? (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              ) : null}
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                isLoading && styles.buttonDisabled,
                { backgroundColor: colors.tint },
              ]}
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
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
    fontSize: 14,
    marginTop: 4,
  },
  hintText: {
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
});

