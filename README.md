MotionFit

A mobile fitness logging app built with Expo Router and React Native. Focused on minimal logging with smart rest timers, weekly goals, and simple analytics.

Repository overview

- App navigation and tabs: [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)
- Workout main screen: [app/(tabs)/workout.tsx](app/(tabs)/workout.tsx)
- History & analytics: [app/(tabs)/history.tsx](app/(tabs)/history.tsx)
- Goals & reminders: [app/(tabs)/goals.tsx](app/(tabs)/goals.tsx)
- Notifications helpers: [lib/notifications.ts](lib/notifications.ts)
- Expo config: [app.json](app.json)
- EAS build config: [eas.json](eas.json)

Key features

- Weekly plan assignment with day tabs and progress ring
- One-tap set logging with automatic rest timer per exercise
- Rest presets with persistence (30/60/90/120s) and long-press cancel
- Session summary with completion, total sets, personal bests, rest usage
- History analytics, exercise progress (1RM) overview
- Goals screen for weekly targets and reminder scheduling
- First-time onboarding cards on Workout and History to guide new users
- Accessibility labels on primary actions for improved clarity

Quick start (development)

- Install dependencies: npm install
- Start the app: npx expo start
- Open on device: scan QR with Expo Go or run with an emulator

Notifications and reminders

- Expo Go does not support push/notification scheduling in SDK 53+. This app gates notifications usage in [lib/notifications.ts](lib/notifications.ts) so Expo Go will not error.
- To test local reminders, use a Development Build (EAS Dev Client):
  - Configure development build in [eas.json](eas.json)
  - Build and install dev client: npx eas build -p android --profile development
  - After installing the dev client, reminders can be scheduled from the Goals tab.

Building an Android APK

This project is configured to produce an APK via EAS.

- Ensure you are logged in: npx eas login
- Initialize EAS (if first time): npx eas init
- APK build profiles are set in [eas.json](eas.json) for preview and production.
- Use Expo managed credentials on first build. When prompted, choose to generate a new Android keystore.
- Run a production build: npx eas build -p android --profile production
- Download the resulting APK from the EAS dashboard when the build completes.

Environment configuration

- Remote environment variables can be configured per profile in EAS. This app expects EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY when present.
- In Expo, variables prefixed EXPO_PUBLIC_ are embedded at build time and available in the app.
- For local development, you can run without these variables; features depending on them should degrade gracefully.

App usage walkthrough

- On Workout tab:
  - Select a day and tap Assign to pick a workout plan.
  - Inside the plan modal, tap + to increment sets. The right chip starts a rest timer.
  - Long-press the timer chip to cancel if tapped by mistake.
  - Adjust rest presets using the chips above the exercise list.
  - Tap Finish Workout to save a session to History.

- On History tab:
  - Recent sessions show completion, sets, exercises, and rest usage where available.
  - Exercise progress section visualizes recent 1RM improvements.

- On Goals tab:
  - Set weekly workout target and preferred days.
  - Enable reminders and choose a time; in Expo Go, reminders are disabled by design.

Project structure (selected)

- [app/(tabs)/workout.tsx](app/(tabs)/workout.tsx) — weekly UI, plan modal, logging and rest timers
- [app/(tabs)/history.tsx](app/(tabs)/history.tsx) — analytics, recent sessions, progress
- [app/(tabs)/goals.tsx](app/(tabs)/goals.tsx) — weekly targets, reminders UI
- [lib/notifications.ts](lib/notifications.ts) — dynamic import of notifications, scheduling helpers
- [styles/commonStyles.ts](styles/commonStyles.ts) — theme colors
- [components/IconSymbol.tsx](components/IconSymbol.tsx) — system icons abstraction
- [eas.json](eas.json) — EAS build profiles and android buildType apk

Accessibility notes

- Primary actions include accessibilityLabel and accessibilityHint to aid discoverability.
- Tap targets and text sizes follow comfortable defaults; further tuning is planned.

Security and configuration

- No secrets are hard-coded. Use EAS environment variables for any required public configuration.
- Avoid storing sensitive credentials on-device; prefer managed services.

Known limitations

- Reminders: Expo Go cannot schedule notifications; requires a dev build.
- Personal best (1RM) calculations use Epley formula and only update when weight and reps are non-zero.

Versioning and releases

- Android versionCode increments automatically on production builds (see [eas.json](eas.json)).
- Use GitHub releases to track APK artifacts from EAS builds.

Contributing

- Fork the repository and create feature branches.
- Run lint checks before committing.
- Open a pull request against main.

License

- Specify your license here (e.g., MIT).

Acknowledgements

- Built with Expo Router, React Native, and EAS.
- Icons courtesy of SF Symbols where supported.

Screenshots (optional)

- Place app screenshots under [assets/images](assets/images)
- Reference them in your GitHub README as needed.

Support

- Open an issue on GitHub with detailed steps and logs to reproduce any problems.