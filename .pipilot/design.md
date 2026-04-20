# MomEase — Design System

## 1. Philosophy

**Aesthetic Direction:** Soft, warm, empowering — a blend of pastel femininity and modern clarity.
**Tone:** Calming, supportive, and nurturing — like a warm hug in app form.
**Vibe:** Mobile-first, gentle gradients, rounded corners, generous whitespace.
**What makes it memorable:** The warm pink-to-mint palette feels distinctly "mom-care" without being childish. Every screen feels like a safe space.

## 2. Color Tokens

```
primary:       #F9A8D4   // soft pink
secondary:     #A7F3D0   // pastel mint
accent:        #C4B5FD   // lavender
bg:            #FDFCFB   // off-white
surface:       #FFFFFF   // white cards
textPrimary:   #1F2937   // dark gray
textSecondary: #6B7280   // medium gray
success:       #10B981   // emerald
error:         #EF4444   // red
warning:       #F59E0B   // amber
```

### Gradients
- **Warm Morning:** #FDE5EC → #FDF2F8 → #F9F5FF
- **Calming Evening:** #E0E7FF → #F5F3FF → #FCE7F3
- **Fresh Start:** #D1FAE5 → #ECFDF5 → #F0FDF4

## 3. Typography

- **Headers:** Quicksand (Google Fonts) — rounded, friendly, distinctive
- **Body:** Inter — clean readability for long-form content
- **Scale:** 12 / 14 / 16 / 18 / 20 / 24 / 28 / 32 / 40

## 4. Spacing & Layout

- **Grid:** 4pt system (4, 8, 12, 16, 24, 32, 48)
- **Border Radius:** 12 (cards), 16 (modals), 999 (pills/badges)
- **Shadows:** Soft, layered — no harsh drop shadows

## 5. Motion

- **Spring config:** { type: 'spring', stiffness: 180, damping: 20 }
- **Staggered reveals** on lists and cards
- **Smooth transitions** between screens
- **Gentle pulse/breathe** animations for wellness features

## 6. Iconography

- **Library:** Lucide React Native
- **Style:** Outline, 24px default, stroke-width 1.5-2
- **No emojis** as icons

## 7. Images

- **API:** https://api.a0.dev/assets/image?text={description}&aspect={ratio}
- **Ratios:** 16:9, 1:1, 9:16
- **Usage:** Avatars, hero images, empty states, onboarding illustrations

---
*Last Updated: 2026-04-16*