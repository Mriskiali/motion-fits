// This file is a fallback for using MaterialIcons on Android and web.

import React from "react";
import { SymbolWeight } from "expo-symbols";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.

  // Navigation & Home
  "house.fill": "home",
  "house": "home",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  "arrow.up": "arrow-upward",
  "arrow.down": "arrow-downward",
  "chevron.left": "chevron-left",
  "chevron.right": "chevron-right",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "arrow.clockwise": "refresh",
  "arrow.counterclockwise": "refresh",

  // Communication & Social
  "paperplane.fill": "send",
  "paperplane": "send",
  "envelope.fill": "mail",
  "envelope": "mail-outline",
  "phone.fill": "phone",
  "phone": "phone",
  "message.fill": "chat",
  "message": "chat-bubble-outline",
  "bell.fill": "notifications",
  "bell": "notifications-none",
  "heart.fill": "favorite",
  "heart": "favorite-border",

  // Actions & Controls
  "plus": "add",
  "minus": "remove",
  "plus.circle.fill": "add-circle",
  "minus.circle.fill": "remove-circle",
  "xmark": "close",
  "xmark.circle.fill": "highlight-off",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "checkmark.circle": "check-circle-outline",
  "checkmark.square.fill": "check-box",
  "checkmark.square": "check-box-outline-blank",
  "multiply": "clear",
  "trash.fill": "delete",
  "trash": "delete-outline",

  // Editing & Creation
  "pencil": "edit",
  "pencil.and.list.clipboard": "edit-note",
  "square.and.pencil": "edit",
  "doc.text.fill": "description",
  "doc.text": "description",
  "folder.fill": "folder",
  "folder": "folder-open",
  "doc.fill": "insert-drive-file",
  "doc": "insert-drive-file",

  // Media & Content
  "photo.fill": "image",
  "photo": "image",
  "camera.fill": "camera-alt",
  "camera": "camera-alt",
  "video.fill": "videocam",
  "video": "videocam-off",
  "music.note": "music-note",
  "speaker.wave.2.fill": "volume-up",
  "speaker.slash.fill": "volume-off",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  "stop.fill": "stop",

  // System & Settings
  "gear": "settings",
  "gearshape.fill": "settings",
  "slider.horizontal.3": "tune",
  "info.circle.fill": "info",
  "info.circle": "info-outline",
  "exclamationmark.triangle.fill": "warning",
  "exclamationmark.triangle": "warning-amber",
  "questionmark.circle.fill": "help",
  "questionmark.circle": "help-outline",

  // Shapes & Symbols
  "square": "square",
  "square.grid.3x3": "apps",
  "circle": "circle",
  "triangle.fill": "change-history",
  "star.fill": "star",
  "star": "star-border",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-border",

  // Technology & Code
  "chevron.left.forwardslash.chevron.right": "code",
  "qrcode.viewfinder": "qr-code",
  "wifi": "wifi",
  "antenna.radiowaves.left.and.right": "signal-cellular-alt",
  "battery.100": "battery-full",
  "battery.25": "battery-2-bar",
  "lock.fill": "lock",
  "lock.open.fill": "lock-open",

  // Shopping & Commerce
  "cart.fill": "shopping-cart",
  "cart": "shopping-cart",
  "creditcard.fill": "credit-card",
  "creditcard": "credit-card",
  "dollarsign.circle.fill": "monetization-on",
  "bag.fill": "shopping-bag",
  "bag": "shopping-bag",

  // Location & Maps
  "location.fill": "location-on",
  "location": "location-on",
  "map.fill": "map",
  "map": "map",
  "compass.drawing": "explore",

  // Time & Calendar
  "clock.fill": "access-time",
  "clock": "access-time",
  "calendar": "event",
  "timer": "timer",

  // User & Profile
  "person": "person",
  "person.fill": "person",
  "person.2.fill": "group",
  "person.2": "group",
  "person.circle.fill": "account-circle",
  "person.circle": "account-circle",
  "person.crop.circle.fill": "account-circle",
  "person.crop.circle": "account-circle",

  // Sharing & Export
  "square.and.arrow.up": "share",
  "square.and.arrow.down": "download",
  "arrow.up.doc.fill": "upload-file",
  "link": "link",

  // Search & Discovery
  "magnifyingglass": "search",
  "line.3.horizontal.decrease": "filter-list",
  "arrow.up.arrow.down": "sort",

  // Visibility & Display
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "lightbulb.fill": "lightbulb",
  "moon.fill": "dark-mode",
  "sun.max.fill": "light-mode",

  // Additional icons
  "calendar.badge.clock": "event-available",
  "calendar.badge.exclamationmark": "event-note",
  "calendar.badge.plus": "add-alarm",
  "figure.run": "directions-run",
  "hand.point.up.left.fill": "help-center",
  "number": "tag",
  "repeat": "loop",
  "trophy.fill": "emoji-events",
  "paintbrush": "brush",
  "flame.fill": "local-fire-department",
  "crown.fill": "military-tech",
  "list.number": "format-list-numbered",
  "timer": "timer",
  "figure.walk": "directions-walk",
  "figure.strengthtraining.traditional": "fitness-center",
  "figure.strengthtraining.functional": "sports-gymnastics",
  "figure.core.training": "sports-motorsports",
  "figure.flexibility": "sports-kabaddi",
  "figure.dance": "sports-handball",
  "figure.yoga": "sports-martial-arts",
  "figure.cooldown": "sports-esports",
  "figure.cardio": "directions-run",
  "figure.cross.training": "sports-cricket",
  "figure.highintensity": "flash-on",
  "figure.balance": "sports-tennis",
  "figure.endurance": "sports-soccer",
  "figure.power": "bolt",
  "figure.agility": "sports-basketball",
  "figure.plyometric": "sports-volleyball",
  "figure.olympic.lift": "sports-football",
  "figure.bodyweight": "fitness-center",
  "figure.machine": "fitness-center",
  "figure.free.weights": "fitness-center",
  "figure.functional": "sports-gymnastics",
  "figure.strength": "fitness-center",
  "figure.conditioning": "sports-baseball",
  "figure.mobility": "sports-kabaddi",
  "figure.recovery": "healing",
  "figure.warmup": "whatshot",
  "figure.circuit": "autorenew",
  "figure.superset": "swap-calls",
  "figure.dropset": "trending-down",
  "figure.failure": "priority-high",
  "figure.rest": "bedtime",
  "figure.timer": "timer",
  "figure.stopwatch": "timer",
  "figure.metcon": "speed",
  "figure.piyo": "sports-martial-arts",
  "figure.boxing": "sports-mma",
  "figure.mma": "sports-mma",
  "figure.judo": "sports-mma",
  "figure.karate": "sports-mma",
  "figure.taichi": "sports-martial-arts",
  "figure.qigong": "spa",
  "figure.pilates": "sports-kabaddi",
  "figure.dance.fitness": "sports-handball",
  "figure.zumba": "sports-handball",
  "figure.aqua": "pool",
  "figure.swim": "pool",
  "figure.cycle": "pedal-bike",
  "figure.run.walk": "directions-run",
  "figure.hiking": "hiking",
  "figure.outdoor": "nature",
  "figure.indoor": "location-city",
  "figure.home": "home",
  "figure.gym": "fitness-center",
  "figure.competition": "emoji-events",
  "figure.powerlifting": "fitness-center",
  "figure.strongman": "fitness-center",
  "figure.crossfit": "fitness-center",
  "figure.calisthenics": "fitness-center",
  "figure.street.workout": "fitness-center",
  "figure.adaptive": "accessible",
  "figure.progress": "show-chart",
  "figure.performance": "trending-up",
  "figure.metrics": "bar-chart",
  "chart.bar.fill": "bar-chart",
  "chart.bar": "bar-chart-outline",
  "figure.walk": "directions-walk",
  "figure.core.training": "sports-motorsports",
  "figure.targets": "flag",
  "figure.goals": "flag",
  "figure.milestones": "flag",
  "figure.achievements": "emoji-events",
  "figure.rewards": "emoji-events",
  "figure.trophies": "emoji-events",
  "figure.medals": "emoji-events",
  "figure.badges": "verified",
  "figure.ranks": "grade",
  "figure.leaderboard": "leaderboard",
  "figure.compete": "emoji-events",
  "figure.challenge": "sports",
  "figure.social": "groups",
  "figure.community": "groups",
  "figure.support": "support",
  "figure.motivation": "psychology",
  "figure.mindset": "psychology",
  "figure.focus": "psychology",
  "figure.mood": "sentiment-very-satisfied",
  "figure.energy": "bolt",
  "figure.vitality": "bolt",
  "figure.vigor": "bolt",
  "figure.vital": "bolt",
  "figure.lively": "bolt",
  "figure.energetic": "bolt",
  "figure.pep": "bolt",
  "figure.verve": "bolt",
  "figure.vivacity": "bolt",
  "figure.animation": "bolt",
  "figure.vivacious": "bolt",
  "figure.zest": "bolt",
  "figure.ardor": "bolt",
  "figure.keenness": "bolt",
  "figure.enthusiasm": "bolt",
  "figure.passion": "favorite",
  "figure.drive": "rocket-launch",
  "figure.motivate": "psychology",
  "figure.inspire": "auto-awesome",
  "figure.encourage": "thumb-up",
  "figure.uplift": "sentiment-very-satisfied",
  "figure.cheer": "sentiment-very-satisfied",
  "figure.celebrate": "celebration",
  "figure.fun": "mood",
  "figure.enjoy": "mood",
  "figure.like": "thumb-up",
  "figure.love": "favorite",
  "figure.adore": "favorite",
  "figure.honor": "grade",
  "figure.respect": "sentiment-very-satisfied",
  "figure.appreciate": "sentiment-very-satisfied",
  "figure.value": "sentiment-very-satisfied",
  "figure.praise": "sentiment-very-satisfied",
  "figure.compliment": "sentiment-very-satisfied",
  "figure.admire": "sentiment-very-satisfied",
  "figure.embrace": "sentiment-very-satisfied",
  "figure.welcome": "sentiment-very-satisfied",
  "figure.accept": "sentiment-very-satisfied",
  "figure.receive": "sentiment-very-satisfied",
  "figure.greet": "sentiment-very-satisfied",
  "figure.meet": "groups",
  "figure.encounter": "groups",
  "figure.face": "face",
  "figure.exercise": "fitness-center",
  "figure.training": "school",
  "figure.practice": "school",
  "figure.skill": "sports",
  "figure.technique": "sports",
  "figure.form": "sports",
  "figure.posture": "sports",
  "figure.alignment": "sports",
  "figure.stability": "sports",
  "figure.balance": "sports",
} as unknown as Partial<
  Record<
    import("expo-symbols").SymbolViewProps["name"],
    React.ComponentProps<typeof MaterialIcons>["name"]
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name] || 'help'} // Fallback to help icon if not found
      style={style as StyleProp<TextStyle>}
    />
  );
}
