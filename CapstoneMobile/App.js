import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToastProvider } from './components/ToastContext';
import { ThemeProvider } from './components/ThemeContext';
import { AlertProvider } from './components/AlertContext';
import ErrorBoundary from './components/ErrorBoundary';
import { registerPushToken, getToken } from './services/AuthService';

import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import StartScreen from './screens/StartScreen';
import SignupScreen from './screens/SignupScreen';
import LoginScreen from './screens/LoginScreen';
import VerifyOTPScreen from './screens/VerifyOTPScreen';
import VerificationSuccessScreen from './screens/VerificationSuccessScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ResetPasswordOTPScreen from './screens/ResetPasswordOTPScreen';
import NewPasswordScreen from './screens/NewPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import LoansScreen from './screens/LoansScreen';
import DonationsScreen from './screens/DonationsScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import BranchScreen from './screens/BranchScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import DevotionalScreen from './screens/DevotionalScreen';
import EventsScreen from './screens/EventsScreen';
import PrayerWallScreen from './screens/PrayerWallScreen';
import SavingsScreen from './screens/SavingsScreen';
import AnnouncementsScreen from './screens/AnnouncementsScreen';

// Safe push notification setup — won't crash if expo-notifications fails
let Notifications = null;
try {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('expo-notifications not available:', e.message);
}

async function registerForPushNotifications() {
  if (!Notifications) return;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

  } catch (err) {
    // Silently ignore push registration errors in local development
  }
}

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function navigateFromNotification(data) {
  if (!navigationRef.isReady()) return;

  // Map notification data.screen or data.category to a screen name
  const screen = data?.screen || (() => {
    switch (data?.category) {
      case 'transaction': return 'Donations';
      case 'loan': return 'Loans';
      default: return 'Notifications';
    }
  })();

  const params = data?.email ? { email: data.email } : {};
  navigationRef.navigate(screen, params);
}

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForPushNotifications();

    // Listen for notification taps (deep linking)
    if (Notifications) {
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data || {};
        navigateFromNotification(data);
      });
    }

    return () => {
      if (responseListener.current?.remove) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
    <ThemeProvider>
    <AlertProvider>
    <ToastProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ gestureEnabled: false, headerShown: false, animation: 'none' }}
        >
          {/* Auth Flow — smooth slide transitions */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="PUAC" component={StartScreen} options={{ animation: 'fade', animationDuration: 200 }} />
          <Stack.Screen name="SignUp" component={SignupScreen} options={{ animation: 'slide_from_right', animationDuration: 200 }} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right', animationDuration: 200 }} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} options={{ animation: 'slide_from_right', animationDuration: 200 }} />
          <Stack.Screen name="VerificationSuccess" component={VerificationSuccessScreen} options={{ animation: 'fade', animationDuration: 300 }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right', animationDuration: 200 }} />
          <Stack.Screen name="ResetPasswordOTP" component={ResetPasswordOTPScreen} options={{ animation: 'slide_from_right', animationDuration: 200 }} />
          <Stack.Screen name="NewPassword" component={NewPasswordScreen} options={{ animation: 'slide_from_right', animationDuration: 200 }} />

          {/* Main Tab Screens — smooth fade transition */}
          <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Loans" component={LoansScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Donations" component={DonationsScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Branches" component={BranchScreen} options={{ animation: 'fade', animationDuration: 100 }} />

          {/* Secondary Screens — smooth fade */}
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Devotional" component={DevotionalScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Events" component={EventsScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="PrayerWall" component={PrayerWallScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Savings" component={SavingsScreen} options={{ animation: 'fade', animationDuration: 100 }} />
          <Stack.Screen name="Announcements" component={AnnouncementsScreen} options={{ animation: 'fade', animationDuration: 100 }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ToastProvider>
    </AlertProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

