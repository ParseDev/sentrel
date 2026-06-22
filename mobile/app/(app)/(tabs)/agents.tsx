import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Avatar } from "../../../src/components/Avatar";
import { api, ApiError } from "../../../src/lib/api";
import { useAuth } from "../../../src/lib/auth";
import type { AgentSummary } from "../../../src/lib/types";
import { colors, fonts, radius } from "../../../src/theme/colors";

function statusTone(status: string) {
  const c = colors.status[status] || colors.textMuted;
  return c;
}

export default function AgentsTab() {
  const { token } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const { agents } = await api.listAgents(token);
      setAgents(agents);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load agents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceBright }}>
      <FlatList
        data={agents}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.textMuted}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>
              Your roster
            </Text>
            <Text style={{ color: colors.text, fontFamily: fonts.extrabold, fontSize: 26, marginTop: 2 }}>
              Agents on your team
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 24 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 18, marginBottom: 8 }}>
                {error ? "Couldn’t load agents" : "No agents yet"}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center", marginBottom: 20 }}>
                {error || "Create your first AI employee to get started."}
              </Text>
              <Pressable
                onPress={() => (error ? load() : router.push("/agents/new"))}
                style={{ backgroundColor: colors.secondaryContainer, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.md }}
              >
                <Text style={{ color: colors.onSecondaryContainer, fontFamily: fonts.bold }}>{error ? "Retry" : "Create agent"}</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const running = item.status === "running";
          return (
              <Pressable
                onPress={() => router.push(`/agents/${item.id}`)}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    backgroundColor: pressed ? colors.surfaceContainer : colors.surfaceContainerLowest,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.outlineVariant + "55",
                  },
                ]}
              >
                <View style={{ width: 48, height: 48 }}>
                  <Avatar name={item.name} size={48} />
                  <View
                    style={{
                      position: "absolute",
                      right: -1,
                      bottom: -1,
                      width: 13,
                      height: 13,
                      borderRadius: 7,
                      backgroundColor: statusTone(item.status),
                      borderWidth: 2,
                      borderColor: colors.surfaceContainerLowest,
                    }}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16, flexShrink: 1 }} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={{ color: running ? "#16794a" : colors.textFaint, fontFamily: fonts.labelSemibold, fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", marginLeft: 8 }}>
                      {item.status}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, marginTop: 1 }} numberOfLines={1}>
                    {item.role}
                  </Text>
                  {item.model_id ? (
                    <Text style={{ color: colors.textFaint, fontFamily: fonts.label, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                      {item.model_id}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
          );
        }}
      />

      {/* Compose FAB → new agent */}
      <Pressable
        onPress={() => router.push("/agents/new")}
        style={({ pressed }) => [
          {
            position: "absolute",
            right: 20,
            bottom: 24,
            height: 56,
            paddingHorizontal: 20,
            borderRadius: 18,
            backgroundColor: colors.primaryContainer,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          pressed && { opacity: 0.9 },
        ]}
      >
        <MaterialIcons name="add" size={22} color="#ffffff" />
        <Text style={{ color: "#ffffff", fontFamily: fonts.bold, fontSize: 15 }}>New agent</Text>
      </Pressable>
    </View>
  );
}
