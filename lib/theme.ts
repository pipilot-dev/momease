// MomEase Design Tokens - Editorial, Warm Aesthetic
export const colors = {
  primary: {
    DEFAULT: "#FB923C", // Warm coral/orange
    50: "#FFF7ED",
    100: "#FFEDD5",
    200: "#FED7AA",
    300: "#FDBA74",
    400: "#FB923C",
    500: "#F97316",
    600: "#EA580C",
  },
  secondary: {
    DEFAULT: "#34D399", // Fresh mint
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
  },
  accent: {
    DEFAULT: "#8B5CF6", // Rich violet
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
  },
  bg: "#FDFBF7", // Warm cream
  surface: "#FFFFFF",
  text: {
    primary: "#1C1917", // Warm black
    secondary: "#57534E",
    muted: "#A8A29E",
  },
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
} as const;

export const gradients = {
  warmMorning: ["#FFF7ED", "#FEF3C7", "#FDFBF7"],
  calmingEvening: ["#F5F3FF", "#EDE9FE", "#FDFBF7"],
  freshStart: ["#ECFDF5", "#D1FAE5", "#FDFBF7"],
  coralSunset: ["#FFEDD5", "#FED7AA", "#FFF7ED"],
  violetDream: ["#EDE9FE", "#DDD6FE", "#F5F3FF"],
  mintGlow: ["#D1FAE5", "#A7F3D0", "#ECFDF5"],
  roseGlow: ["#FFF1F2", "#FFE4E6", "#FFF7ED"],
  goldenHour: ["#FEF3C7", "#FDE68A", "#FFF7ED"],
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
  // Stagger delays for load animations (in ms)
  stagger: {
    small: 50,
    medium: 100,
    large: 180,
  },
  // Durations
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
} as const;

// Task category configuration
export const taskCategories = {
  work: { icon: "Briefcase", color: colors.accent[500] },
  family: { icon: "Baby", color: colors.primary[500] },
  "self-care": { icon: "Heart", color: colors.secondary[500] },
  household: { icon: "Home", color: colors.warning },
  health: { icon: "Stethoscope", color: colors.error },
} as const;

export const taskPriorities = {
  low: colors.success,
  medium: colors.warning,
  high: "#F97316",
  urgent: colors.error,
} as const;

// Forum category configuration
export const forumCategories = {
  tips: { color: "#F59E0B" },
  support: { color: "#F472B6" },
  wins: { color: "#10B981" },
  questions: { color: "#8B5CF6" },
  resources: { color: "#3B82F6" },
} as const;

// Shared component styles
export const styles = {
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  // Text styles
  text: {
    h1: {
      fontFamily: "Quicksand-Bold",
      fontSize: 28,
      color: colors.text.primary,
      lineHeight: 34,
    },
    h2: {
      fontFamily: "Quicksand-Bold",
      fontSize: 22,
      color: colors.text.primary,
      lineHeight: 28,
    },
    h3: {
      fontFamily: "Quicksand-SemiBold",
      fontSize: 18,
      color: colors.text.primary,
      lineHeight: 24,
    },
    body: {
      fontFamily: "Quicksand-Medium",
      fontSize: 15,
      color: colors.text.primary,
      lineHeight: 22,
    },
    caption: {
      fontFamily: "Quicksand-Medium",
      fontSize: 13,
      color: colors.text.secondary,
      lineHeight: 18,
    },
    label: {
      fontFamily: "Quicksand-SemiBold",
      fontSize: 12,
      color: colors.text.secondary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
  },
} as const;
