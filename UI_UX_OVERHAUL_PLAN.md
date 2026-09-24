# UI/UX Overhaul Plan — MotionFit

> **Status**: Approved for Execution
> **Mode**: Build (non-emoji, icon-based mascot using lucide-react-native)
> **Scope**: 3 bug fixes (completed) + full UI/UX overhaul

---

## 1. Cat Mascot (Icon-based, No Emoji)

Library: `lucide-react-native` — `Cat`, `PawPrint`, `Gift`, `TrendingUp`.

| File | Action |
|------|--------|
| `components/StepMilestoneModal.tsx` | Replace `Trophy`/`Flame` celebration icon with `Cat`. Dynamic theme border colors. |
| `app/(tabs)/index.tsx` | Watermark `Cat` icon `opacity: 0.08` on hero/step cards. Add `PawPrint` to streak badge. |
| `app/(auth)/sign-in.tsx` & `sign-up.tsx` | Watermark `Cat` + `PawPrint` icons alongside existing `Sparkles`. |
| `components/SplashScreenOverlay.tsx` | Replace text-only header with `Cat` icon + progress indicator (fade in/out). |

---

## 2. Auth Flow Optimization (Delay Eliminated)

**File**: `app/_layout.tsx`

Replace sequential partition loads (lines 139-141) with parallel, then defer sync:

```ts
// BEFORE:
await loadWorkoutPartition(userId);
await loadStepPartition(userId);
await loadUserPartition(userId);

// AFTER:
await Promise.all([
  loadWorkoutPartition(userId),
  loadStepPartition(userId),
  loadUserPartition(userId),
]);
// Then defer performFullSync into InteractionManager.runAfterInteractions()
```

---

## 3. Button Responsiveness (All TouchableOpacity)

Pattern (add to every actionable button):

```tsx
<TouchableOpacity
  activeOpacity={0.7}
  onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
>
```

Files: `index.tsx`, `history.tsx`, `settings.tsx`, `workout/`, `auth/`.

---

## 4. History Tab Redesign

### Overview Tab
- **Sorting**: already correct (`allReversedSessions` is new-to-old).
- **Visual**: add date badge (`format(date, 'dd MMM')`) to each `renderSessionCard`.
- **Stats**: add 3-column grid: Total Workouts / Total Reps / Total Volume.

### Log Book Tab
- Sorting OK (new-first).
- Add dropdown sort: Newest / Oldest / By Volume.

### Steps Tab
File: `app/(tabs)/history.tsx`

- **Heatmap** (lines 372-380): replace hardcoded `#22C55E`, `rgba(249,115,22,...)` → `colors.successBadge`, `colors.warning`, `colors.danger`.
- **Heatmap -> Bar Chart**: Use `react-native-svg` (`Rect` height proportional to steps). Hover shows date/steps tooltip.
- **Stat cards** (lines 408-430): daily avg / goals reached / distance / calories → use `colors.*`.

---

## 5. Hardcoded Color Audit (Refactors)

| File | Lines | From | To |
|------|-------|------|----|
| `app/(tabs)/index.tsx` | 240,311,338,422,450,817,1178 | `#F59E0B`,`#000000`,`#10B981`,`#EF4444`,`rgba(249,115,22,...)` | `colors.primaryAction`,`colors.textPrimaryOnVolt`,`colors.successBadge`,`colors.danger`,`colors.accentSecondary` |
| `history.tsx` | 375,377,379,605,616,644,... | `#22C55E`,`rgba(249,115,22,...)` | `colors.successBadge`,`colors.warning`,`colors.danger` |
| `StepMilestoneModal.tsx` | 76,94,158,172,333 | `rgba(...)`,`#10B981`,`#000000` | `colors.accentLime`,`colors.successBadge`,`colors.textPrimaryOnVolt`, `colors.borderSubtle` |
| `components/WorkoutSummaryModal.tsx` | 338+ | `#12131A`,`#0D0E15`,`#161722`,etc | ✔️ ALREADY FIXED via `getStyles(colors)` + `useMemo` |
| `components/AudioTrimmerCard.tsx` | 573,577 | `#fff`,`#000000` | ✔️ ALREADY FIXED → `colors.textPrimary`, `colors.textPrimaryOnVolt` |

---

## 6. File Checklist

**Already Fixed (Bug 1 & 3):**
- ✅ `components/AudioTrimmerCard.tsx` — `handleAdjustmentEnd()` added to all +/- handlers
- ✅ `components/WorkoutSummaryModal.tsx` — theme dynamic via `getStyles` + `useMemo`

**Pending Execution (this overhaul):**
- [ ] `app/_layout.tsx` — Promise.all + defer sync
- [x] `app/(tabs)/index.tsx` — button responsiveness + watermark cat + stat grid
- [x] `app/(tabs)/history.tsx` — bar chart refactor, heatmap theme, sorting UI, stat cards
- [x] `app/(auth)/sign-in.tsx` / `sign-up.tsx` — watermark cat
- [x] `components/StepMilestoneModal.tsx` — cat icon + theme refactor
- [x] `components/SplashScreenOverlay.tsx` — cat icon header
- [x] Global hardcode color replacements (audit list above)
