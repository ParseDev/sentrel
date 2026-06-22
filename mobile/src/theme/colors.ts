// "Central" Material 3 light theme — ported from the provided design system.
// Existing semantic keys (bg/surface/text/primary/…) are preserved so all
// components flip to the light theme automatically; the M3 token names below
// are added for the screens that reference them directly (chat bubbles, rows).
export const colors = {
  // legacy/semantic keys (now light)
  bg: "#f7f9fb", // surface / background
  surface: "#ffffff", // cards (surface-container-lowest)
  surfaceAlt: "#e6e8ea", // surface-container-high
  border: "#c6c6cd", // outline-variant
  text: "#191c1e", // on-surface
  textMuted: "#45464d", // on-surface-variant
  textFaint: "#76777d", // outline
  primary: "#2170e4", // action blue (secondary-container)
  primaryText: "#ffffff", // on-primary / on-secondary
  success: "#16a34a",
  warning: "#b45309",
  danger: "#ba1a1a", // error

  // Material 3 "Central" tokens
  secondary: "#0058be",
  secondaryContainer: "#2170e4",
  onSecondaryContainer: "#fefcff",
  secondaryFixed: "#d8e2ff",
  primaryContainer: "#131b2e",
  onPrimaryContainer: "#7c839b",
  surfaceBright: "#f7f9fb",
  surfaceDim: "#d8dadc",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  surfaceContainerHighest: "#e0e3e5",
  outline: "#76777d",
  outlineVariant: "#c6c6cd",
  errorContainer: "#ffdad6",
  onErrorContainer: "#93000a",

  // status dot colors per agent.status
  status: {
    running: "#16a34a",
    starting: "#b45309",
    pending: "#76777d",
    paused: "#b45309",
    stopped: "#ba1a1a",
  } as Record<string, string>,
};

// Material 3 radii (the design uses generous rounding; "full" = 12px pill-ish,
// plus extra named sizes the components use).
export const radius = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 };
export const space = (n: number) => n * 4;

// Font family keys registered in app/_layout via useFonts.
export const fonts = {
  // Hanken Grotesk — headlines + body
  body: "HankenGrotesk_400Regular",
  bodyMedium: "HankenGrotesk_500Medium",
  semibold: "HankenGrotesk_600SemiBold",
  bold: "HankenGrotesk_700Bold",
  extrabold: "HankenGrotesk_800ExtraBold",
  // Geist — labels (caps, tracking)
  label: "Geist_500Medium",
  labelSemibold: "Geist_600SemiBold",
};
