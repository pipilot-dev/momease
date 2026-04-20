// MomEase Design Tokens
export const colors = {
  primary: {
    DEFAULT: "#F9A8D4",
    50: "#FFF5F9",
    100: "#FDE5EC",
    200: "#FBC8DC",
    300: "#F9A8D4",
    400: "#F472B6",
    500: "#EC4899",
    600: "#DB2777",
  },
  secondary: {
    DEFAULT: "#A7F3D0",
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
  },
  accent: {
    DEFAULT: "#C4B5FD",
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
  },
  bg: "#FDFCFB",
  surface: "#FFFFFF",
  text: {
    primary: "#1F2937",
    secondary: "#6B7280",
    muted: "#9CA3AF",
  },
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
} as const;

export const gradients = {
  warmMorning: ["#FDE5EC", "#FDF2F8", "#F9F5FF"],
  calmingEvening: ["#E0E7FF", "#F5F3FF", "#FCE7F3"],
  freshStart: ["#D1FAE5", "#ECFDF5", "#F0FDF4"],
  pinkSoft: ["#FDE5EC", "#FDF2F8"],
  mintSoft: ["#D1FAE5", "#ECFDF5"],
  lavenderSoft: ["#EDE9FE", "#F5F3FF"],
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const radius = {
  sm: 8,
  card: 12,
  modal: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const shadows = {
  soft: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  }),
} as const;

export const animation = {
  spring: { type: "spring" as const, stiffness: 180, damping: 20 },
  gentle: { type: "spring" as const, stiffness: 120, damping: 18 },
  snappy: { type: "spring" as const, stiffness: 250, damping: 22 },
} as const;
