import { View } from "react-native";

// Deterministic pseudo-waveform bars from a seed (e.g. the audio URL), so a
// given voice note always renders the same shape. We don't have real PCM
// samples for arbitrary/remote audio, but this matches the familiar look.
export function genBars(seed: string, count = 28): number[] {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  x = x || 1;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    x = (x * 1664525 + 1013904223) >>> 0;
    out.push(0.18 + ((x % 1000) / 1000) * 0.82);
  }
  return out;
}

// A row of vertical bars. `progress` (0..1) fills bars left→right in `filled`,
// the rest in `track`. Used for both playback (static bars + progress) and
// live recording (rolling levels).
export function Waveform({
  bars,
  progress = 0,
  filled,
  track,
  height = 26,
  barWidth = 3,
  gap = 2,
  alignRight = false,
}: {
  bars: number[];
  progress?: number;
  filled: string;
  track: string;
  height?: number;
  barWidth?: number;
  gap?: number;
  alignRight?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", height, justifyContent: alignRight ? "flex-end" : "flex-start" }}>
      {bars.map((b, i) => {
        const pos = (i + 0.5) / bars.length;
        const on = pos <= progress;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: Math.max(3, b * height),
              borderRadius: barWidth,
              marginRight: i === bars.length - 1 ? 0 : gap,
              backgroundColor: on ? filled : track,
            }}
          />
        );
      })}
    </View>
  );
}
