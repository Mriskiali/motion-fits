Project Overview: FitTrack Pro (Expo Workout Tracker V2)

1. Project Goal & Philosophy

Rebuild an existing React Native (Expo) workout tracking application from scratch to vastly improve UI/UX, state management, and user flow. The app allows users to create custom workout routines, assign them to days of the week, track active workouts, and view historical analytics.

Key V2 Improvements:

UI/UX Overhaul: Transition from a basic, flat card-based UI to a modern, high-contrast, premium fitness app aesthetic.

Floating Transparent Navbar: A sleek, pill-shaped bottom navigation bar that floats above the content with a translucent "glass" effect, rather than a full-width solid bar.

Dedicated Rest Timer: A highly visible, immersive rest timer that takes over the screen/overlay when a set is completed.

Seamless Editing: A frictionless "Edit Workout" flow for existing routines.

Robust Architecture: Clear separation of concerns using modern React Native patterns.

2. Tech Stack & Dependencies

Framework: React Native + Expo (managed workflow)

Navigation: expo-router (file-based routing)

State Management: zustand (with zustand/middleware for persist using AsyncStorage)

Styling: NativeWind (Tailwind CSS for React Native) OR standard StyleSheet.

Icons: @expo/vector-icons (Lucide or Feather).

Animations/Blur: react-native-reanimated and expo-blur (for the transparent navbar effect).

Storage: @react-native-async-storage/async-storage (via Zustand persist).

3. Data Architecture (Zustand Store Models)

useWorkoutStore

type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: number | string; // e.g., '10' or '8-12'
  weight?: number; 
};

type WorkoutTemplate = {
  id: string;
  name: string;
  subtitle?: string;
  icon: string;
  color: string;
  exercises: Exercise[];
  defaultRestTime: number; // in seconds
};

type WorkoutSession = {
  id: string;
  templateId: string;
  date: string; // ISO string
  duration: number; // in seconds
  completedExercises: {
    exerciseId: string;
    completedSets: number[]; // Array of completed reps per set
  }[];
};


useUserStore

Manages weekly goals, preferred training days, streaks, and app preferences (dark/light mode).

4. UI/UX Design System Rules

Color Palette:

Background: slate-50 (Light mode) / slate-900 (Dark mode)

Cards: white / slate-800

Primary Accent: blue-500 (Vibrant, used for main CTAs)

Success: emerald-500

Text: slate-900 (Primary), slate-500 (Secondary)

Bottom Navigation (The "Island"):

NOT full-width. Must be a floating pill shape.

Styling constraints: Absolute positioning (bottom: 24, left: 24, right: 24), heavy border radius (rounded-full or borderRadius: 40), and a transparent/translucent background (e.g., rgba(255,255,255,0.75) using expo-blur's <BlurView> for a glassmorphism effect).

Hide the tab bar completely on the Active Workout and Rest Timer screens to maintain focus.

Typography: Bold headers, highly readable sans-serif for numbers/timers.

Components: Generous padding, rounded corners, subtle drop shadows for floating elements.

5. Screen Specifications & Features

Tab 1: Dashboard (Home)

Hero Section: "Hello, [User]" with a visually engaging summary.

This Week / This Month: Consolidate into a cleaner, unified stats row.

Recent Activity: If empty, show an illustrated empty state. If active, show the last completed workout card.

Quick Action: Prominent floating action button (FAB) to "Start Quick Workout" (Ensure it sits above the floating navbar).

Tab 2: Workout (Planning & Execution)

Top Section - Weekly Calendar: Horizontal scrollable weekly calendar.

Middle Section - Assigned Workout: If a workout is assigned, show a large "START WORKOUT" button.

Bottom Section - My Templates: List of available workouts.

Edit Workout Feature: Each card has a 3-dot menu (⋮). Options: Edit, Duplicate, Delete.

Tapping Edit routes to a prepopulated /workout/create?id=[id] screen.

Tab 3: History & Analytics

Calendar View: Month calendar with dots under days with workouts.

Stats: Weekly Trends, Total Volume, Average Duration.

Tab 4: Goals & Settings

Weekly Goal: Stepper UI.

Preferences: Dark mode toggle, export data, reminders.

6. Highlight Feature: Active Workout & Dedicated Rest Timer

A. Active Workout View (/workout/active)

Header: Workout Name + Live Elapsed Timer.

Next to each set is a "Log" button.

Interaction: Tapping "Log" automatically triggers the Rest Timer overlay. (Tab bar is hidden here).

B. Dedicated Rest Timer (Overlay / Modal)

Trigger: Automatic upon set completion.

UI: A full-screen modal or high-coverage Bottom Sheet.

Visuals: Massive countdown timer + circular SVG progress bar.

Controls: +15s, -15s, and a large "Skip Rest" button.

Audio/Haptic: Chime/vibrate when 3 seconds remain, and at 0.

7. Execution Plan for AI Agents

Phase 1: Foundation & Setup

Initialize Expo project with expo-router.

Install dependencies: zustand, @react-native-async-storage/async-storage, nativewind, lucide-react-native, react-native-reanimated, expo-blur.

Phase 2: State Management

Implement useWorkoutStore.ts (mock data, addTemplate, updateTemplate, logSession).

Implement useUserStore.ts.

Phase 3: Navigation & Shell

Create root layout (/app/_layout.tsx).

Create Bottom Tabs layout (/app/(tabs)/_layout.tsx).

CRITICAL: Implement the custom floating, transparent, pill-shaped tab bar here using <BlurView>. Ensure screen content has enough bottom padding (contentContainerStyle) so the last items aren't hidden behind the floating bar.

Phase 4: Feature Implementation - Workout Management

Build Workout tab UI (Calendar picker, Template List).

Implement the Create/Edit Workout flow.

Phase 5: Feature Implementation - Active Workout & Rest Timer

Build Active Workout screen.

Build RestTimerOverlay. Wire the trigger: onSetComplete -> startTimer -> showOverlay.

Phase 6: Dashboard & Analytics

Build Home dashboard and History tab.

Phase 7: Polish & UI/UX Review

Ensure the floating tab bar behaves correctly (hides when typing, hides during active workouts).

Standardize padding and Reanimated transitions.