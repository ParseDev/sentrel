import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { Avatar } from "../../../src/components/Avatar";
import { api, ApiError } from "../../../src/lib/api";
import { useAuth } from "../../../src/lib/auth";
import type { ConversationSummary } from "../../../src/lib/api";
import type { AgentSummary } from "../../../src/lib/types";
import { colors, fonts } from "../../../src/theme/colors";

function shortTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface Row extends AgentSummary {
  preview?: string;
  time?: string | null;
  ts: number;
}

export default function ChatTab() {
  const { token } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // Every agent is chattable; conversations supply the last-message preview.
      const [{ agents }, convResult] = await Promise.all([
        api.listAgents(token),
        api.listConversations(token).catch(() => ({ conversations: [] as ConversationSummary[] })),
      ]);
      const byAgent = new Map<string, ConversationSummary>();
      for (const c of convResult.conversations) byAgent.set(c.agent.id, c);

      const merged: Row[] = agents.map((a) => {
        const c = byAgent.get(a.id);
        const preview = c?.last_message
          ? (c.last_message.role === "assistant" ? "" : "You: ") + c.last_message.content.replace(/\s+/g, " ").trim()
          : "Tap to start a conversation";
        const time = c?.last_message_at ?? null;
        return { ...a, preview, time, ts: time ? Date.parse(time) : 0 };
      });
      merged.sort((x, y) => y.ts - x.ts || x.name.localeCompare(y.name));
      setRows(merged);
    } catch (e) {
      if (e instanceof ApiError) console.warn(e.message);
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
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.textMuted} />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fonts.label, fontSize: 12, letterSpacing: 1, textTransform: "uppercase" }}>Messages</Text>
            <Text style={{ color: colors.text, fontFamily: fonts.extrabold, fontSize: 26, marginTop: 2 }}>Chat with an agent</Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 24 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 18, marginBottom: 8 }}>No agents yet</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, textAlign: "center" }}>Create an agent to start chatting.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/agents/${item.id}/chat?name=${encodeURIComponent(item.name)}`)}
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
                  backgroundColor: colors.status[item.status] || colors.textMuted,
                  borderWidth: 2,
                  borderColor: colors.surfaceContainerLowest,
                }}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: colors.text, fontFamily: fonts.bold, fontSize: 16 }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: colors.textFaint, fontFamily: fonts.label, fontSize: 12 }}>{shortTime(item.time ?? null)}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, marginTop: 2 }} numberOfLines={1}>{item.preview}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
