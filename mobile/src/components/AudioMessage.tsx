import { MaterialIcons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Waveform, genBars } from "./Waveform";
import { colors, fonts } from "../theme/colors";

function fmt(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Inline voice-note player: play/pause + a waveform that fills as it plays.
export function AudioMessage({ uri, tint = colors.secondary, onTint = "#fff" }: { uri: string; tint?: string; onTint?: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const bars = useMemo(() => genBars(uri, 30), [uri]);

  const playing = status?.playing ?? false;
  const duration = status?.duration ?? 0;
  const current = status?.currentTime ?? 0;
  const progress = duration > 0 ? Math.min(1, current / duration) : 0;

  function toggle() {
    if (playing) {
      player.pause();
    } else {
      if (duration > 0 && current >= duration - 0.1) player.seekTo(0);
      player.play();
    }
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 180 }}>
      <Pressable onPress={toggle} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: onTint, alignItems: "center", justifyContent: "center" }}>
        <MaterialIcons name={playing ? "pause" : "play-arrow"} size={24} color={tint} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Waveform bars={bars} progress={progress} filled={onTint} track={onTint + "55"} height={28} />
        <Text style={{ color: onTint, fontFamily: fonts.label, fontSize: 11, marginTop: 4 }}>
          {fmt(playing || current > 0 ? current : duration)}
        </Text>
      </View>
    </View>
  );
}
