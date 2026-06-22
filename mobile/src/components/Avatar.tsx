import { Text, View } from "react-native";
import { colors, fonts } from "../theme/colors";

// Tinted circle with initials, like the mailbox rows in the design. Color is
// derived from the name so each agent is visually stable.
const TINTS: { bg: string; fg: string }[] = [
  { bg: "#d8e2ff", fg: "#0058be" }, // secondary-fixed
  { bg: "#dcf3e6", fg: "#16794a" },
  { bg: "#ffe1cc", fg: "#9a4a16" },
  { bg: "#f3d8ff", fg: "#7a1fb0" },
  { bg: "#ffd9e0", fg: "#b01f47" },
  { bg: "#d8f0ff", fg: "#0a6285" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const t = tintFor(name || "?");
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: t.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: t.fg, fontFamily: fonts.bold, fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}
