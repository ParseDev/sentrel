import { MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pressable, Text, View } from "react-native";
import { colors, fonts } from "../theme/colors";

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Inline voice-note player for an audio attachment. Tap to play/pause.
export function AudioMessage({ uri, tint = colors.secondary, onTint = "#fff" }: { uri: string; tint?: string; onTint?: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const playing = status?.playing ?? false;
  const duration = status?.duration ?? 0;
  const current = status?.currentTime ?? 0;
  const pct = duration > 0 ? Math.min(1, current / duration) : 0;

  function toggle() {
    if (playing) {
      player.pause();
    } else {
      if (duration > 0 && current >= duration - 0.1) player.seekTo(0);
      player.play();
    }
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 160 }}>
      <Pressable onPress={toggle} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: onTint, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={playing ? "pause" : "play-arrow"} size={22} color={tint} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: onTint + "55", overflow: "hidden" }}>
          <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: onTint }} />
        </View>
        <Text style={{ color: onTint, fontFamily: fonts.label, fontSize: 11, marginTop: 4 }}>
          {fmt(playing || current > 0 ? current : duration)}
        </Text>
      </View>
    </View>
  );
}
