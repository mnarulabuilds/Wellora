import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { ToastProvider } from '@/components/Toast';
import { useColorScheme } from '@/components/useColorScheme';
import { isOnboardingComplete } from '@/lib/storage';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ToastProvider>
      <RootLayoutNav />
    </ToastProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const complete = await isOnboardingComplete();
      const inOnboarding = segments[0] === 'onboarding';
      if (!complete && !inOnboarding) {
        router.replace('/onboarding');
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [segments]);

  if (!checked) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
