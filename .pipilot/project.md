# MomEase Care Hub

## Summary
MomEase is a cross-platform mobile app (iOS + Android) for working mothers, built with Expo SDK 54, TypeScript (strict), and Expo Router. It provides AI-powered wellness support, smart task management, meal planning, community forums, and calming sounds. The AI features use the a0 LLM API (no key required). All external services (auth, db, notifications, subscriptions, analytics) are mocked with clean interfaces for easy future replacement.

**Client:** Dr. Bessem (Lush Digital)
**Developer:** Pixelways Solutions Inc.

## Tech Stack
- **Framework:** Expo SDK 54 with TypeScript (strict)
- **Navigation:** Expo Router (file-based routing)
- **Styling:** NativeWind (Tailwind for RN) + Custom design tokens
- **State:** Zustand + React Query
- **Storage:** AsyncStorage + MMKV
- **Animation:** React Native Animated API
- **Icons:** Lucide React Native
- **Audio:** expo-av
- **AI:** a0 LLM API (real, no key required)
- **Forms:** React Hook Form + Zod
- **Fonts:** Quicksand (Google Fonts)

## Features
- [x] Auth flow (sign-in, sign-up) with mock backend
- [x] Onboarding carousel (4 animated steps)
- [x] Home Dashboard with AI greeting & daily mantra
- [x] Smart Task Organizer with categories, priorities, and CRUD
- [x] AI Chat Assistant (24/7 wellness companion with real AI)
- [x] Calming Sounds Library (6 sounds with play/pause)
- [x] Guided Meditation sessions (5 sessions)
- [x] Meal Prep Assistant (4 recipes with full instructions)
- [x] Community Forum (4 categories, search, trending)
- [x] Profile & Settings (stats, toggles, sign out)
- [x] Mock services with clean interfaces for easy replacement

## Architecture
```
app/                    # Expo Router file-based routing
  _layout.tsx           # Root layout with fonts + splash
  index.tsx             # Animated splash entry
  onboarding.tsx        # 4-step onboarding carousel
  meals.tsx             # Meal prep assistant
  community.tsx         # Community forum
  (auth)/               # Auth group
    sign-in.tsx
    sign-up.tsx
  (tabs)/               # Main tab navigation
    home.tsx            # Dashboard with AI greeting
    tasks.tsx           # Smart task organizer
    chat.tsx            # AI chat assistant
    sounds.tsx          # Calming sounds + meditation
    profile.tsx         # Profile & settings

lib/                    # Business logic (swap one file per service)
  mock-auth.ts          # Mock auth (→ Supabase)
  mock-ai.ts            # AI service (a0 API + fallback)
  mock-data.ts          # All mock data + helpers
  mock-notifications.ts # Mock push notifications
  mock-analytics.ts     # Mock analytics
  theme.ts              # Design tokens
  types.ts              # TypeScript types
  stores/
    auth-store.ts       # Zustand auth state
    task-store.ts       # Zustand task state
    chat-store.ts       # Zustand chat state
```

## Design System
- **Aesthetic:** Soft, warm, empowering — pastel femininity + modern clarity
- **Colors:** Pink (#F9A8D4), Mint (#A7F3D0), Lavender (#C4B5FD)
- **Font:** Quicksand (display + body)
- **Gradients:** Warm Morning, Calming Evening, Fresh Start

---
*Last Updated: 2026-04-16*