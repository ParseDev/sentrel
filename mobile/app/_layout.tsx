import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
} from "@expo-google-fonts/hanken-grotesk";
import { Geist_500Medium, Geist_600SemiBold } from "@expo-google-fonts/geist";
import { AuthProvider } from "../src/lib/auth";
import { colors, fonts } from "../src/theme/colors";

export default function RootLayout() {
  const router = useRouter();
  const lastHandled = useRef<string | null>(null);

  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    Geist_500Medium,
    Geist_600SemiBold,
  });

  // Tapping a push notification deep-links into the relevant agent. The data
  // payload is set by the backend (MobilePushJob): {type, agent_id, ...}.
  useEffect(() => {
    function handle(response: Notifications.NotificationResponse) {
      const id = response.notification.request.identifier;
      if (lastHandled.current === id) return;
      lastHandled.current = id;
      const data = response.notification.request.content.data as any;
      if (!data?.agent_id) return;
      if (data.type === "agent_reply") {
        router.push(`/agents/${data.agent_id}/chat`);
      } else {
        router.push(`/agents/${data.agent_id}`);
      }
    }

    // Cold start: app opened from a notification.
    Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) handle(r);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [router]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.secondary,
            headerTitleStyle: { color: colors.text, fontFamily: fonts.bold },
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
