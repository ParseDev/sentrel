import { MaterialIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "../../../src/theme/colors";

// Material 3 "Central" bottom navigation: active destination gets a
// secondary-container pill behind the icon, label always shown in Geist.
type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View
      style={{
        width: 56,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.secondaryContainer : "transparent",
      }}
    >
      <MaterialIcons name={name} size={22} color={focused ? colors.onSecondaryContainer : colors.textMuted} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="agents"
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.secondary,
        headerTitleStyle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
        headerShadowVisible: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.labelSemibold, fontSize: 11 },
        tabBarIconStyle: { marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLow,
          borderTopColor: colors.outlineVariant,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 8,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen
        name="agents"
        options={{ title: "Agents", tabBarLabel: "Agents", tabBarIcon: ({ focused }) => <TabIcon name="smart-toy" focused={focused} /> }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: "Chat", tabBarLabel: "Chat", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "chat-bubble" : "chat-bubble-outline"} focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile", tabBarIcon: ({ focused }) => <TabIcon name={focused ? "person" : "person-outline"} focused={focused} /> }}
      />
    </Tabs>
  );
}
