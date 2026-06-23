import { MaterialIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AudioMessage } from "../../../../src/components/AudioMessage";
import { ThinkingEyes } from "../../../../src/components/ThinkingEyes";
import { api, ApiError } from "../../../../src/lib/api";
import { useAuth } from "../../../../src/lib/auth";
import type { Attachment, Message } from "../../../../src/lib/types";
import { colors, fonts, radius } from "../../../../src/theme/colors";

const QUICK = ["What can you do?", "Summarize today", "Any updates?"];

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

// Combine ActiveStorage attachments (user uploads) with engine-sent media
// (metadata.media) into one normalized list.
function mediaItems(m: Message): { url: string; type: string }[] {
  const out: { url: string; type: string }[] = [];
  (m.attachments || []).forEach((a: Attachment) => out.push({ url: a.url, type: a.content_type || "" }));
  const media = (m.metadata as any)?.media;
  if (Array.isArray(media)) {
    media.forEach((md: any) => {
      const url = md?.url;
      if (url) out.push({ url, type: md.content_type || md.contentType || "" });
    });
  }
  return out;
}

export default function Chat() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [recording, setRecording] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const lastSeen = useRef<string>("1970-01-01T00:00:00Z");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nearBottom = useRef(true);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  function ingest(incoming: Message[]) {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const merged = [...prev, ...incoming.filter((m) => !seen.has(m.id))];
      merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
      return merged;
    });
    for (const m of incoming) if (m.created_at > lastSeen.current) lastSeen.current = m.created_at;
  }

  useEffect(() => {
    if (!token || !id) return;
    api
      .listMessages(token, id)
      .then(({ messages }) => ingest(messages))
      .catch((e) => e instanceof ApiError && console.warn(e.message))
      .finally(() => {
        setLoading(false);
        api.markRead(token, id).catch(() => {});
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const poll = useCallback(async () => {
    if (!token || !id) return;
    try {
      const { messages } = await api.pollMessages(token, id, lastSeen.current);
      if (messages.length > 0) {
        ingest(messages);
        if (messages.some((m) => m.role === "assistant")) {
          setWaiting(false);
          api.markRead(token, id).catch(() => {});
        }
      }
    } catch {
      /* keep polling */
    }
  }, [token, id]);

  useEffect(() => {
    pollTimer.current = setInterval(poll, 2000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [poll]);

  // Auto-scroll only when the user is already near the bottom.
  useEffect(() => {
    if (messages.length > 0 && nearBottom.current) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const dist = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    nearBottom.current = dist < 120;
    setShowScrollDown(dist > 260);
  }

  function scrollToBottom() {
    listRef.current?.scrollToEnd({ animated: true });
    setShowScrollDown(false);
  }

  async function send(text?: string, signedIds: string[] = []) {
    const body = (text ?? input).trim();
    if ((!body && signedIds.length === 0) || !token || !id || sending) return;
    if (text === undefined) setInput("");
    setSending(true);
    try {
      const res = await api.sendMessage(token, id, body, signedIds);
      ingest([res.message]);
      nearBottom.current = true;
      setWaiting(true);
    } catch (e) {
      if (text === undefined) setInput(body);
      ingest([{ id: -Date.now(), role: "system", content: `⚠️ ${e instanceof ApiError ? e.message : "Failed to send"}`, created_at: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  }

  async function pickImage() {
    if (!token || !id) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow photo access to attach images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const up = await api.upload(token, {
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      await send(input || "", [up.signed_id]);
    } catch (e) {
      Alert.alert("Upload failed", e instanceof ApiError ? e.message : "Couldn’t attach the image.");
    } finally {
      setUploading(false);
    }
  }

  async function toggleRecording() {
    if (!token || !id) return;
    if (recording) {
      // stop + upload + send
      try {
        await recorder.stop();
        setRecording(false);
        const uri = recorder.uri;
        await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
        if (!uri) return;
        setUploading(true);
        const up = await api.upload(token, { uri, name: `voice-${Date.now()}.m4a`, type: "audio/m4a" });
        await send("", [up.signed_id]);
      } catch (e) {
        Alert.alert("Recording failed", e instanceof ApiError ? e.message : "Couldn’t send the voice note.");
      } finally {
        setUploading(false);
      }
      return;
    }
    // start recording
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Allow microphone access to record voice notes.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e) {
      Alert.alert("Mic error", e instanceof ApiError ? e.message : "Couldn’t start recording.");
    }
  }

  const busy = sending || uploading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surfaceBright }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: name || "Chat",
          headerRight: () => (
            <Pressable onPress={() => router.push(`/agents/${id}/edit`)} hitSlop={12} style={{ paddingHorizontal: 4 }}>
              <MaterialIcons name="tune" size={22} color={colors.secondary} />
            </Pressable>
          ),
        }}
      />
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.secondary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            onScroll={onScroll}
            scrollEventThrottle={32}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            ListHeaderComponent={
              <View style={{ alignItems: "center", marginBottom: 14 }}>
                <View style={{ backgroundColor: colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fonts.label, fontSize: 11 }}>Today</Text>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingTop: 60 }}>
                <Text style={{ color: colors.textMuted, fontFamily: fonts.body }}>Say hello to start the conversation.</Text>
              </View>
            }
            renderItem={({ item }) => <Bubble message={item} />}
            ListFooterComponent={
              waiting ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}>
                  <ThinkingEyes size={46} color={colors.textMuted} />
                  <Text style={{ color: colors.textFaint, fontFamily: fonts.body, fontSize: 13 }}>Working…</Text>
                </View>
              ) : null
            }
          />
          {showScrollDown ? (
            <Pressable
              onPress={scrollToBottom}
              style={{
                position: "absolute",
                right: 16,
                bottom: 12,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceContainerLowest,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOpacity: 0.15,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <MaterialIcons name="keyboard-arrow-down" size={26} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      )}

      {messages.length === 0 && !loading ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {QUICK.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={{ backgroundColor: colors.surfaceContainerHighest, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill }}>
              <Text style={{ color: colors.textMuted, fontFamily: fonts.labelSemibold, fontSize: 12 }}>{q}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Input bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant + "66",
          backgroundColor: colors.surfaceContainerLow,
        }}
      >
        {/* attach image */}
        <Pressable onPress={pickImage} disabled={busy || recording} style={iconBtn}>
          <MaterialIcons name="add-photo-alternate" size={24} color={busy || recording ? colors.textFaint : colors.textMuted} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surfaceContainerLowest,
            borderWidth: 1,
            borderColor: recording ? colors.danger : colors.outline,
            borderRadius: 22,
            paddingHorizontal: 6,
            minHeight: 44,
          }}
        >
          {recording ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 10, flex: 1 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.danger }} />
              <Text style={{ color: colors.danger, fontFamily: fonts.bodyMedium, fontSize: 15 }}>Recording… tap ◼ to send</Text>
            </View>
          ) : (
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={uploading ? "Uploading…" : "Message…"}
              placeholderTextColor={colors.textFaint}
              editable={!uploading}
              multiline
              style={{ flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 15, paddingHorizontal: 8, paddingTop: 10, paddingBottom: 10, maxHeight: 120 }}
            />
          )}
        </View>

        {/* mic / stop OR send */}
        {input.trim() && !recording ? (
          <Pressable onPress={() => send()} disabled={busy} style={[sendBtn, { backgroundColor: colors.secondary }]}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <MaterialIcons name="arrow-upward" size={22} color="#fff" />}
          </Pressable>
        ) : (
          <Pressable onPress={toggleRecording} disabled={uploading} style={[sendBtn, { backgroundColor: recording ? colors.danger : colors.surfaceContainerHighest }]}>
            {uploading ? (
              <ActivityIndicator color={colors.textMuted} size="small" />
            ) : (
              <MaterialIcons name={recording ? "stop" : "mic"} size={22} color={recording ? "#fff" : colors.textMuted} />
            )}
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const iconBtn = { width: 40, height: 44, alignItems: "center" as const, justifyContent: "center" as const };
const sendBtn = { width: 44, height: 44, borderRadius: 22, alignItems: "center" as const, justifyContent: "center" as const };

function Bubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  if (isSystem) {
    return (
      <View style={{ alignItems: "center", marginVertical: 6 }}>
        <Text style={{ color: colors.warning, fontFamily: fonts.body, fontSize: 12 }}>{message.content}</Text>
      </View>
    );
  }
  const media = mediaItems(message);
  const onTint = isUser ? colors.onSecondaryContainer : colors.text;
  return (
    <View style={{ flexDirection: "row", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 10 }}>
      {!isUser ? (
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryContainer, alignItems: "center", justifyContent: "center", marginRight: 8, marginTop: 2 }}>
          <MaterialIcons name="bolt" size={18} color="#fff" />
        </View>
      ) : null}
      <View
        style={{
          maxWidth: "78%",
          backgroundColor: isUser ? colors.secondaryContainer : colors.surfaceContainerHigh,
          paddingHorizontal: media.length ? 8 : 14,
          paddingVertical: media.length && !message.content ? 8 : 10,
          borderRadius: 18,
          borderTopRightRadius: isUser ? 4 : 18,
          borderTopLeftRadius: isUser ? 18 : 4,
        }}
      >
        {media.map((mi, i) => (
          <View key={i} style={{ marginBottom: i < media.length - 1 || message.content ? 8 : 0 }}>
            {mi.type.startsWith("image/") ? (
              <Image source={{ uri: mi.url }} style={{ width: 220, height: 220, borderRadius: 12, backgroundColor: colors.surfaceContainerHighest }} resizeMode="cover" />
            ) : mi.type.startsWith("audio/") ? (
              <View style={{ paddingHorizontal: 6, paddingVertical: 4, minWidth: 200 }}>
                <AudioMessage uri={mi.url} tint={isUser ? colors.secondaryContainer : colors.surfaceContainerHigh} onTint={isUser ? "#fff" : colors.secondary} />
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 6, paddingVertical: 6 }}>
                <MaterialIcons name="insert-drive-file" size={18} color={onTint} />
                <Text style={{ color: onTint, fontFamily: fonts.body, fontSize: 13 }}>Attachment</Text>
              </View>
            )}
          </View>
        ))}
        {message.content ? (
          <Text style={{ color: isUser ? colors.onSecondaryContainer : colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, paddingHorizontal: media.length ? 6 : 0 }}>
            {message.content}
          </Text>
        ) : null}
        <Text style={{ color: isUser ? "#ffffffaa" : colors.textFaint, fontFamily: fonts.label, fontSize: 10, marginTop: 4, textAlign: "right", paddingHorizontal: media.length ? 6 : 0 }}>
          {fmtTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}
