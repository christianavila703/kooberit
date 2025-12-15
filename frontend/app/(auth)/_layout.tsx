import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="sign-in"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="verify-email"
        options={{ headerShown: true, title: 'Verify Email' }}
        />
      <Stack.Screen
        name="resend-verification-otp"
        options={{ headerShown: true, title: 'Resend Verification OTP' }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{ headerShown: true, title: 'Forgot Password' }}
      />
      <Stack.Screen
        name="reset-password"
        options={{ headerShown: true, title: 'Reset Password' }}
      />
    </Stack>
  );
}

