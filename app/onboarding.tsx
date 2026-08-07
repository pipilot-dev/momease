// Personalized onboarding — the "WOW" first-5-minutes journey.
//
// Steps: 0 Welcome -> 1 Life stage -> 2 Primary challenge -> 3 Goals ->
// 4 Notification preference -> 5 Generating plan -> 6 Ready.
// Each answer is written to the auth store immediately so a mid-flow crash
// doesn't lose the user's context.
import { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  Heart,
  ChevronRight,
  ChevronLeft,
  Waves,
  Moon,
  Brain,
  Briefcase,
  Users,
  Sparkles,
  MessageCircle,
  Wind,
  Sun,
  Shield,
  Bell,
  BellOff,
  Check,
} from "lucide-react-native";
import { useAuthStore } from "../lib/stores/auth-store";
import { useTheme } from "../lib/theme-context";
import {
  LIFE_STAGE_META,
  CHALLENGE_META,
  GOAL_META,
  buildWeeklyPlan,
} from "../lib/personalization";
import type {
  LifeStage,
  PrimaryChallenge,
  WellnessGoal,
  Personalization,
} from "../lib/types";

/** Icon lookup — kept in this file to avoid a runtime map in personalization.ts. */
const CHALLENGE_ICON: Record<PrimaryChallenge, any> = {
  overwhelm: Waves,
  sleep: Moon,
  "mental-load": Brain,
  guilt: Heart,
  "career-balance": Briefcase,
  loneliness: Users,
  "postpartum-recovery": Sparkles,
  "co-parenting": MessageCircle,
};

const GOAL_ICON: Record<WellnessGoal, any> = {
  "reduce-stress": Wind,
  "better-sleep": Moon,
  "more-me-time": Heart,
  "connect-community": Users,
  "healthier-habits": Sun,
  "stronger-boundaries": Shield,
  "mindful-parenting": Sparkles,
};

const STAGES: LifeStage[] = ["trying", "pregnant", "postpartum", "baby", "toddler", "school-age", "teen"];
const CHALLENGES: PrimaryChallenge[] = [
  "overwhelm",
  "sleep",
  "mental-load",
  "guilt",
  "career-balance",
  "loneliness",
  "postpartum-recovery",
  "co-parenting",
];
const GOALS: WellnessGoal[] = [
  "reduce-stress",
  "better-sleep",
  "more-me-time",
  "connect-community",
  "healthier-habits",
  "stronger-boundaries",
  "mindful-parenting",
];

type Answers = {
  lifeStage?: LifeStage;
  primaryChallenge?: PrimaryChallenge;
  goals: WellnessGoal[];
  notificationsEnabled?: boolean;
};

export default function Onboarding() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user, updateUser, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    goals: user?.personalization?.goals ?? [],
    lifeStage: user?.personalization?.lifeStage,
    primaryChallenge: user?.personalization?.primaryChallenge,
    notificationsEnabled: user?.personalization?.notificationsEnabled,
  });

  const TOTAL = 7;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const genAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / (TOTAL - 1),
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    if (step === 5) {
      genAnim.setValue(0);
      Animated.loop(
        Animated.timing(genAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ).start();
      // Simulate plan generation, then advance.
      const t = setTimeout(() => savePlanAndAdvance(), 2200);
      return () => clearTimeout(t);
    }
  }, [step]);

  const savePlanAndAdvance = () => {
    const personalization: Personalization = {
      lifeStage: answers.lifeStage,
      primaryChallenge: answers.primaryChallenge,
      goals: answers.goals,
      notificationsEnabled: answers.notificationsEnabled ?? true,
      preferredCheckinTime: "08:00",
      updatedAt: new Date().toISOString(),
    };
    updateUser({ personalization });
    setStep(6);
  };

  const finish = () => {
    completeOnboarding();
    router.replace("/(tabs)/home");
  };

  const canAdvance = () => {
    if (step === 1) return !!answers.lifeStage;
    if (step === 2) return !!answers.primaryChallenge;
    if (step === 3) return answers.goals.length > 0;
    if (step === 4) return answers.notificationsEnabled !== undefined;
    return true;
  };

  const next = () => {
    if (!canAdvance()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (step === 4) setStep(5);
    else if (step === 6) finish();
    else setStep((s) => s + 1);
  };

  const back = () => {
    if (step === 0 || step === 5 || step === 6) return;
    Haptics.selectionAsync().catch(() => {});
    setStep((s) => s - 1);
  };

  const toggleGoal = (g: WellnessGoal) => {
    Haptics.selectionAsync().catch(() => {});
    setAnswers((a) => ({
      ...a,
      goals: a.goals.includes(g) ? a.goals.filter((x) => x !== g) : [...a.goals, g],
    }));
  };

  const stepStyle = {
    opacity: stepAnim,
    transform: [{ translateY: stepAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  const gradient: [string, string, string] = isDark
    ? [theme.gradients.violetDream[0], theme.gradients.violetDream[1], theme.bg]
    : ["#FFF1F2", "#FDF2F8", "#FDFBF7"];

  return (
    <LinearGradient colors={gradient} style={{ flex: 1 }}>
      {/* Top bar: back + progress + skip */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity
          onPress={back}
          disabled={step === 0 || step === 5 || step === 6}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? theme.surfaceAlt : "rgba(255,255,255,0.7)",
            opacity: step === 0 || step === 5 || step === 6 ? 0 : 1,
          }}
        >
          <ChevronLeft size={20} color={theme.text.primary} />
        </TouchableOpacity>

        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: isDark ? theme.surfaceAlt : "rgba(255,255,255,0.6)", overflow: "hidden" }}>
          <Animated.View
            style={{
              height: "100%",
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
              backgroundColor: "#F472B6",
              borderRadius: 3,
            }}
          />
        </View>

        {step >= 1 && step <= 4 && (
          <TouchableOpacity onPress={() => setStep(5)}>
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: theme.text.secondary }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={stepStyle}>
          {step === 0 && <WelcomeStep name={user?.name ?? "Mama"} theme={theme} />}
          {step === 1 && (
            <LifeStageStep
              value={answers.lifeStage}
              onChange={(v) => {
                Haptics.selectionAsync().catch(() => {});
                setAnswers((a) => ({ ...a, lifeStage: v }));
              }}
              theme={theme}
              isDark={isDark}
            />
          )}
          {step === 2 && (
            <ChallengeStep
              value={answers.primaryChallenge}
              onChange={(v) => {
                Haptics.selectionAsync().catch(() => {});
                setAnswers((a) => ({ ...a, primaryChallenge: v }));
              }}
              theme={theme}
              isDark={isDark}
            />
          )}
          {step === 3 && (
            <GoalsStep goals={answers.goals} onToggle={toggleGoal} theme={theme} isDark={isDark} />
          )}
          {step === 4 && (
            <NotificationsStep
              value={answers.notificationsEnabled}
              onChange={(v) => {
                Haptics.selectionAsync().catch(() => {});
                setAnswers((a) => ({ ...a, notificationsEnabled: v }));
              }}
              theme={theme}
              isDark={isDark}
            />
          )}
          {step === 5 && <GeneratingStep genAnim={genAnim} theme={theme} />}
          {step === 6 && <ReadyStep answers={answers} theme={theme} isDark={isDark} name={user?.name ?? "Mama"} />}
        </Animated.View>
      </ScrollView>

      {/* CTA — hidden on the auto-advancing generating step */}
      {step !== 5 && (
        <View style={{ position: "absolute", left: 24, right: 24, bottom: 40 }}>
          <TouchableOpacity onPress={next} disabled={!canAdvance()} activeOpacity={0.85}>
            <LinearGradient
              colors={canAdvance() ? ["#F472B6", "#EC4899"] : ["#E5D6DA", "#D9C4C9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 18,
                paddingVertical: 18,
                alignItems: "center",
                shadowColor: "#F472B6",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: canAdvance() ? 0.35 : 0,
                shadowRadius: 14,
                elevation: canAdvance() ? 6 : 0,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 17, color: "#FFFFFF" }}>
                {step === 0 && "Let's personalize your space"}
                {step === 1 && "Continue"}
                {step === 2 && "Continue"}
                {step === 3 && (answers.goals.length ? `Continue with ${answers.goals.length} goal${answers.goals.length > 1 ? "s" : ""}` : "Pick at least one")}
                {step === 4 && (answers.notificationsEnabled === undefined ? "Choose one" : "Almost there")}
                {step === 6 && "Show me my dashboard"}
              </Text>
              {canAdvance() && <ChevronRight size={20} color="#FFFFFF" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

/* ------------------------------- Steps -------------------------------- */

function WelcomeStep({ name, theme }: { name: string; theme: any }) {
  return (
    <View style={{ alignItems: "center", paddingTop: 24 }}>
      <View
        style={{
          width: 104,
          height: 104,
          borderRadius: 52,
          backgroundColor: "#F9A8D4",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          shadowColor: "#F9A8D4",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 10,
        }}
      >
        <Heart size={52} color="#FFFFFF" fill="#FFFFFF" />
      </View>
      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 30, color: theme.text.primary, textAlign: "center", marginBottom: 12 }}>
        Welcome, {name.split(" ")[0]}
      </Text>
      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 16, color: theme.text.secondary, textAlign: "center", lineHeight: 24, maxWidth: 340 }}>
        Let's take 60 seconds to make MomEase feel like it was built just for you.
      </Text>
      <View
        style={{
          marginTop: 36,
          padding: 20,
          borderRadius: 20,
          backgroundColor: theme.isDark ? theme.surface : "#FFFFFF",
          borderWidth: 1,
          borderColor: theme.border,
          gap: 14,
          maxWidth: 380,
        }}
      >
        {[
          "Answer 3 quick questions",
          "Get a personalized weekly action plan",
          "Track your wellbeing your way",
        ].map((s, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#FDF2F8", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 13, color: "#EC4899" }}>{i + 1}</Text>
            </View>
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.primary, flex: 1 }}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function StepHeader({ eyebrow, title, subtitle, theme }: { eyebrow: string; title: string; subtitle: string; theme: any }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 12, color: "#EC4899", letterSpacing: 1.4, marginBottom: 8 }}>{eyebrow}</Text>
      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 26, color: theme.text.primary, lineHeight: 32 }}>{title}</Text>
      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.secondary, marginTop: 6, lineHeight: 22 }}>{subtitle}</Text>
    </View>
  );
}

function Pill({ selected, onPress, children, theme, isDark }: any) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View
        style={{
          borderRadius: 16,
          padding: 16,
          backgroundColor: selected ? "#FFF1F5" : isDark ? theme.surface : "#FFFFFF",
          borderWidth: 2,
          borderColor: selected ? "#F472B6" : theme.border,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        {children}
      </View>
    </TouchableOpacity>
  );
}

function LifeStageStep({ value, onChange, theme, isDark }: { value?: LifeStage; onChange: (v: LifeStage) => void; theme: any; isDark: boolean }) {
  return (
    <View>
      <StepHeader eyebrow="STEP 1 OF 4" title="Where are you in your journey?" subtitle="This shapes the content, milestones, and support we surface for you." theme={theme} />
      {STAGES.map((s) => {
        const selected = value === s;
        return (
          <Pill key={s} selected={selected} onPress={() => onChange(s)} theme={theme} isDark={isDark}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.text.primary }}>{LIFE_STAGE_META[s].label}</Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>
                {LIFE_STAGE_META[s].blurb}
              </Text>
            </View>
            {selected && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#F472B6", alignItems: "center", justifyContent: "center" }}>
                <Check size={16} color="#FFFFFF" />
              </View>
            )}
          </Pill>
        );
      })}
    </View>
  );
}

function ChallengeStep({ value, onChange, theme, isDark }: { value?: PrimaryChallenge; onChange: (v: PrimaryChallenge) => void; theme: any; isDark: boolean }) {
  return (
    <View>
      <StepHeader eyebrow="STEP 2 OF 4" title="What's the heaviest thing on your plate right now?" subtitle="Just pick the one that hits hardest today. You can change it any time." theme={theme} />
      {CHALLENGES.map((c) => {
        const selected = value === c;
        const Icon = CHALLENGE_ICON[c];
        return (
          <Pill key={c} selected={selected} onPress={() => onChange(c)} theme={theme} isDark={isDark}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: selected ? "#F472B620" : isDark ? theme.surfaceAlt : "#FDF2F8", alignItems: "center", justifyContent: "center" }}>
              <Icon size={20} color={selected ? "#EC4899" : "#F472B6"} />
            </View>
            <Text style={{ flex: 1, fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.primary }}>{CHALLENGE_META[c].label}</Text>
            {selected && (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#F472B6", alignItems: "center", justifyContent: "center" }}>
                <Check size={14} color="#FFFFFF" />
              </View>
            )}
          </Pill>
        );
      })}
    </View>
  );
}

function GoalsStep({ goals, onToggle, theme, isDark }: { goals: WellnessGoal[]; onToggle: (g: WellnessGoal) => void; theme: any; isDark: boolean }) {
  return (
    <View>
      <StepHeader eyebrow="STEP 3 OF 4" title="What would feel like a win?" subtitle="Pick as many as you like — these become the focus of your action plan." theme={theme} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {GOALS.map((g) => {
          const selected = goals.includes(g);
          const Icon = GOAL_ICON[g];
          return (
            <TouchableOpacity key={g} onPress={() => onToggle(g)} activeOpacity={0.9}>
              <View
                style={{
                  borderRadius: 999,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: selected ? "#F472B6" : isDark ? theme.surface : "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: selected ? "#F472B6" : theme.border,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Icon size={16} color={selected ? "#FFFFFF" : "#EC4899"} />
                <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 14, color: selected ? "#FFFFFF" : theme.text.primary }}>
                  {GOAL_META[g].label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function NotificationsStep({ value, onChange, theme, isDark }: { value?: boolean; onChange: (v: boolean) => void; theme: any; isDark: boolean }) {
  const opts = [
    {
      v: true,
      title: "Yes, gently nudge me",
      detail: "One calm reminder per day for your check-in — never noisy.",
      Icon: Bell,
    },
    {
      v: false,
      title: "Not right now",
      detail: "You'll open the app on your own terms.",
      Icon: BellOff,
    },
  ];
  return (
    <View>
      <StepHeader eyebrow="STEP 4 OF 4" title="Want a daily check-in reminder?" subtitle="A daily rhythm is the fastest path to feeling better. We won't spam you." theme={theme} />
      {opts.map((o) => {
        const selected = value === o.v;
        const Icon = o.Icon;
        return (
          <Pill key={String(o.v)} selected={selected} onPress={() => onChange(o.v)} theme={theme} isDark={isDark}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: selected ? "#F472B620" : isDark ? theme.surfaceAlt : "#FDF2F8", alignItems: "center", justifyContent: "center" }}>
              <Icon size={22} color={selected ? "#EC4899" : "#F472B6"} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 16, color: theme.text.primary }}>{o.title}</Text>
              <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 13, color: theme.text.secondary, marginTop: 2 }}>{o.detail}</Text>
            </View>
            {selected && (
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#F472B6", alignItems: "center", justifyContent: "center" }}>
                <Check size={16} color="#FFFFFF" />
              </View>
            )}
          </Pill>
        );
      })}
    </View>
  );
}

function GeneratingStep({ genAnim, theme }: { genAnim: Animated.Value; theme: any }) {
  const rotate = genAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={{ alignItems: "center", paddingTop: 60 }}>
      <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#FDF2F8", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Sparkles size={64} color="#EC4899" />
        </Animated.View>
      </View>
      <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: theme.text.primary, textAlign: "center", marginBottom: 10 }}>
        Building your action plan…
      </Text>
      <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 15, color: theme.text.secondary, textAlign: "center", lineHeight: 22, maxWidth: 320 }}>
        Matching your answers to the rituals that other moms found most helpful.
      </Text>
      <ActivityIndicator color="#F472B6" style={{ marginTop: 24 }} />
    </View>
  );
}

function ReadyStep({ answers, theme, isDark, name }: { answers: Answers; theme: any; isDark: boolean; name: string }) {
  const plan = useMemo(
    () =>
      buildWeeklyPlan({
        lifeStage: answers.lifeStage,
        primaryChallenge: answers.primaryChallenge,
        goals: answers.goals,
        notificationsEnabled: answers.notificationsEnabled,
      }),
    [answers]
  );

  return (
    <View>
      <View style={{ alignItems: "center", marginBottom: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Check size={36} color="#10B981" />
        </View>
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 24, color: theme.text.primary, textAlign: "center" }}>
          Your plan is ready, {name.split(" ")[0]}
        </Text>
      </View>

      <View
        style={{
          borderRadius: 20,
          padding: 20,
          backgroundColor: isDark ? theme.surface : "#FFFFFF",
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 12, color: "#EC4899", letterSpacing: 1.2, marginBottom: 8 }}>
          THIS WEEK'S FOCUS
        </Text>
        <Text style={{ fontFamily: "Quicksand-Bold", fontSize: 20, color: theme.text.primary, marginBottom: 8, lineHeight: 26 }}>
          {plan.headline}
        </Text>
        <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 14, color: theme.text.secondary, lineHeight: 20 }}>{plan.intro}</Text>
      </View>

      {plan.items.slice(0, 4).map((it) => (
        <View
          key={it.id}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: isDark ? theme.surfaceAlt : "#FFFFFF",
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 8,
          }}
        >
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FDF2F8", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={18} color="#EC4899" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Quicksand-SemiBold", fontSize: 15, color: theme.text.primary }}>{it.title}</Text>
            <Text style={{ fontFamily: "Quicksand-Medium", fontSize: 12, color: theme.text.muted, marginTop: 2 }}>{it.minutes} min · tap on home to start</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
