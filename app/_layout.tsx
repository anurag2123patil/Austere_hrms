// app/_layout.tsx

import { useEffect, useState } from "react";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import SplashScreen from "@/components/SplashScreen";
import { verifyTokenWithAPI } from "@/api/Api";
import * as SplashScreenNative from "expo-splash-screen";

// Prevent native splash screen from auto-hiding
SplashScreenNative.preventAutoHideAsync();

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<null | boolean>(null);

  // --- Splash minimum time (2s) ---
  useEffect(() => {
    const splashTimer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(splashTimer);
  }, []);

  // --- Verify token with API ---
  useEffect(() => {
    const checkToken = async () => {
      try {
        const isValid = await Promise.race([
          verifyTokenWithAPI(),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 5000)
          ),
        ]);
        setIsAuthenticated(isValid);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkToken();
  }, []);

  // --- Hide splash only after auth check is done ---
  useEffect(() => {
    if (isAuthenticated !== null && !isLoading) {
      SplashScreenNative.hideAsync();

      // Navigation logic happens ONCE after auth is ready
      if (isAuthenticated) {
        router.replace("/(tabs)");
      } else {
        router.replace("/auth/login");
      }
    }
  }, [isAuthenticated, isLoading]);

  // --- While waiting, show splash screen ---
  if (isAuthenticated === null || isLoading) {
    return <SplashScreen />;
  }

  // --- After navigation, render stack (user won't see wrong screen) ---
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Auth Screens */}
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/forgot-password" />
      <Stack.Screen name="auth/reset-password" />
      <Stack.Screen name="auth/otp-verification" />

      {/* Protected Screens */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile/index" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="timesheet/weekly" />
      <Stack.Screen name="attendance/report" />
      <Stack.Screen name="attendance/records" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <Provider store={store}>
      <AppContent />
      <StatusBar style="auto" />
    </Provider>
  );
}