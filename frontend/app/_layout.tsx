import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';
import { AuthProvider } from '@/components/auth-provider';
import { Colors } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="auto" />
          <Toast
            config={{
              success: (props) => (
                <BaseToast
                  {...props}
                  style={[
                    styles.toastBase,
                    {
                      borderLeftColor: '#4CAF50',
                      backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                    },
                  ]}
                  contentContainerStyle={styles.toastContent}
                  text1Style={[
                    styles.toastText1,
                    { color: colors.text },
                  ]}
                  text2Style={[
                    styles.toastText2,
                    { color: colors.icon },
                  ]}
                />
              ),
              error: (props) => (
                <ErrorToast
                  {...props}
                  style={[
                    styles.toastBase,
                    {
                      borderLeftColor: '#FF3B30',
                      backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                    },
                  ]}
                  contentContainerStyle={styles.toastContent}
                  text1Style={[
                    styles.toastText1,
                    { color: colors.text },
                  ]}
                  text2Style={[
                    styles.toastText2,
                    { color: colors.icon },
                  ]}
                />
              ),
              info: (props) => (
                <BaseToast
                  {...props}
                  style={[
                    styles.toastBase,
                    {
                      borderLeftColor: colors.tint,
                      backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
                    },
                  ]}
                  contentContainerStyle={styles.toastContent}
                  text1Style={[
                    styles.toastText1,
                    { color: colors.text },
                  ]}
                  text2Style={[
                    styles.toastText2,
                    { color: colors.icon },
                  ]}
                />
              ),
            }}
          />
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  toastBase: {
    height: 60,
    width: '90%',
    borderLeftWidth: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastContent: {
    paddingHorizontal: 15,
  },
  toastText1: {
    fontSize: 15,
    fontWeight: '600',
  },
  toastText2: {
    fontSize: 13,
  },
});
