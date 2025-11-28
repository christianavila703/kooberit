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
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { registerUser, clearError } from '@/store/slices/authSlice';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { IUserRole } from '@/types';
import notificationService from '@/services/notification';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<IUserRole>('homeowner');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Navigation is handled by AuthProvider

  // Show error notification
  React.useEffect(() => {
    if (error) {
      notificationService.error('Registration Failed', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateField = (name: string, value: string): boolean => {
    const newErrors = { ...errors };

    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          newErrors.firstName = 'First name is required';
        } else if (value.trim().length < 1) {
          newErrors.firstName = 'First name must be at least 1 character';
        } else {
          delete newErrors.firstName;
        }
        break;
      case 'lastName':
        if (!value.trim()) {
          newErrors.lastName = 'Last name is required';
        } else if (value.trim().length < 1) {
          newErrors.lastName = 'Last name must be at least 1 character';
        } else {
          delete newErrors.lastName;
        }
        break;
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!value) {
          newErrors.email = 'Email is required';
        } else if (!emailRegex.test(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (value.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        } else {
          delete newErrors.password;
        }
        // Re-validate confirm password if it exists
        if (confirmPassword && value !== confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else if (confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Please confirm your password';
        } else if (value !== password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
    }

    setErrors(newErrors);
    return !newErrors[name];
  };

  const handleSignUp = async () => {
    // Validate all fields
    const isFirstNameValid = validateField('firstName', firstName);
    const isLastNameValid = validateField('lastName', lastName);
    const isEmailValid = validateField('email', email);
    const isPasswordValid = validateField('password', password);
    const isConfirmPasswordValid = validateField('confirmPassword', confirmPassword);

    if (!isFirstNameValid || !isLastNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      await dispatch(
        registerUser({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          role,
        })
      ).unwrap();
      notificationService.success(
        'Account Created!',
        `Welcome ${firstName}! Your account has been created successfully.`
      );
      router.replace('/(tabs)' as any);
      // Navigation will be handled by AuthProvider
    } catch (err: any) {
      // Error is handled by the useEffect above
    }
  };

  const isDark = colorScheme === 'dark';

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
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              Join Kooberit to connect with contractors
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Role Selection */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>I am a</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'homeowner' && styles.roleButtonActive,
                    {
                      backgroundColor:
                        role === 'homeowner'
                          ? colors.tint
                          : isDark
                          ? '#1E1E1E'
                          : '#F5F5F5',
                      borderColor: role === 'homeowner' ? colors.tint : 'transparent',
                    },
                  ]}
                  onPress={() => setRole('homeowner' as IUserRole)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      {
                        color: role === 'homeowner' ? '#FFFFFF' : colors.text,
                        fontWeight: role === 'homeowner' ? '600' : '400',
                      },
                    ]}
                  >
                    Homeowner
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'contractor' && styles.roleButtonActive,
                    {
                      backgroundColor:
                        role === 'contractor'
                          ? colors.tint
                          : isDark
                          ? '#1E1E1E'
                          : '#F5F5F5',
                      borderColor: role === 'contractor' ? colors.tint : 'transparent',
                    },
                  ]}
                  onPress={() => setRole('contractor' as IUserRole)}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      {
                        color: role === 'contractor' ? '#FFFFFF' : colors.text,
                        fontWeight: role === 'contractor' ? '600' : '400',
                      },
                    ]}
                  >
                    Contractor
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* First Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>First Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                    borderColor: errors.firstName ? '#FF3B30' : 'transparent',
                    borderWidth: errors.firstName ? 1 : 0,
                  },
                ]}
                placeholder="Enter your first name"
                placeholderTextColor={colors.icon}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errors.firstName) validateField('firstName', text);
                }}
                onBlur={() => validateField('firstName', firstName)}
                autoCapitalize="words"
                editable={!isLoading}
              />
              {errors.firstName ? (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              ) : null}
            </View>

            {/* Last Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Last Name</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                    borderColor: errors.lastName ? '#FF3B30' : 'transparent',
                    borderWidth: errors.lastName ? 1 : 0,
                  },
                ]}
                placeholder="Enter your last name"
                placeholderTextColor={colors.icon}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  if (errors.lastName) validateField('lastName', text);
                }}
                onBlur={() => validateField('lastName', lastName)}
                autoCapitalize="words"
                editable={!isLoading}
              />
              {errors.lastName ? (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              ) : null}
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                    color: colors.text,
                    borderColor: errors.email ? '#FF3B30' : 'transparent',
                    borderWidth: errors.email ? 1 : 0,
                  },
                ]}
                placeholder="Enter your email"
                placeholderTextColor={colors.icon}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) validateField('email', text);
                }}
                onBlur={() => validateField('email', email)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              {errors.email ? (
                <Text style={styles.errorText}>{errors.email}</Text>
              ) : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5',
                      color: colors.text,
                      borderColor: errors.password ? '#FF3B30' : 'transparent',
                      borderWidth: errors.password ? 1 : 0,
                    },
                  ]}
                  placeholder="Enter your password (min. 8 characters)"
                  placeholderTextColor={colors.icon}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) validateField('password', text);
                    if (confirmPassword) validateField('confirmPassword', confirmPassword);
                  }}
                  onBlur={() => validateField('password', password)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={[styles.eyeIconText, { color: colors.icon }]}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text style={styles.errorText}>{errors.password}</Text>
              ) : null}
            </View>

            {/* Confirm Password Input */}
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
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.icon}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) validateField('confirmPassword', text);
                  }}
                  onBlur={() => validateField('confirmPassword', confirmPassword)}
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
              {errors.confirmPassword ? (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                isLoading && styles.buttonDisabled,
                { backgroundColor: colors.tint },
              ]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.icon }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/sign-in' as any)}
                disabled={isLoading}
              >
                <Text style={[styles.linkText, { color: colors.tint }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 60,
    paddingBottom: 40,
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
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  roleButtonActive: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roleButtonText: {
    fontSize: 15,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '400',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

