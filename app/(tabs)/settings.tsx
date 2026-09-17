import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AppState,
  AppStateStatus,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { AppFonts } from "@/constants/theme";
import { useThemeColors, ThemeColors } from "@/hooks/useThemeColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAlertStore } from "@/store/useAlertStore";
import { useUserStore } from "@/store/useUserStore";
import { useWorkoutStore } from "@/store/useWorkoutStore";
import { useStepStore } from "@/store/useStepStore";
import {
  openHealthConnectStore,
  openHealthConnectSettingsSafe,
} from "@/utils/healthConnect";
import {
  cancelAllReminders,
  requestPermissionsAsync,
  scheduleDailyReminder,
} from "@/utils/notifications";
import {
  playPreviewSound,
  stopTimerSound,
  subscribeAudioPlayback,
  triggerButtonVibration,
} from "@/utils/soundPlayer";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import AudioTrimmerCard from "@/components/AudioTrimmerCard";
import {
  Activity,
  Bell,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Footprints,
  Globe,
  Minus,
  Moon,
  Play,
  Plus,
  RotateCw,
  Smartphone,
  Sparkles,
  Square,
  Sun,
  Target,
  Timer,
  Upload,
  User,
  Volume2,
} from "lucide-react-native";

let DocumentPicker: any = null;
try {
  DocumentPicker = require("expo-document-picker");
} catch (e) {
  console.warn("expo-document-picker is not available");
}

export default function SettingsScreen() {
  const name = useUserStore((s) => s.name);
  const weeklyGoal = useUserStore((s) => s.weeklyGoal);
  const theme = useUserStore((s) => s.theme);
  const remindersEnabled = useUserStore((s) => s.remindersEnabled);
  const reminderTime = useUserStore((s) => s.reminderTime);
  const language = useUserStore((s) => s.language);
  const defaultRestTimer = useUserStore((s) => s.defaultRestTimer);
  const autoStartTimer = useUserStore((s) => s.autoStartTimer);
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const keepScreenAwake = useUserStore((s) => s.keepScreenAwake);
  const audioNotification = useUserStore((s) => s.audioNotification);
  const customAudioName = useUserStore((s) => s.customAudioName);
  const streak = useUserStore((s) => s.streak);

  const setWeeklyGoal = useUserStore((s) => s.setWeeklyGoal);
  const setTheme = useUserStore((s) => s.setTheme);
  const setRemindersEnabled = useUserStore((s) => s.setRemindersEnabled);
  const setReminderTime = useUserStore((s) => s.setReminderTime);
  const setLanguage = useUserStore((s) => s.setLanguage);
  const setDefaultRestTimer = useUserStore((s) => s.setDefaultRestTimer);
  const setAutoStartTimer = useUserStore((s) => s.setAutoStartTimer);
  const setHapticsEnabled = useUserStore((s) => s.setHapticsEnabled);
  const setKeepScreenAwake = useUserStore((s) => s.setKeepScreenAwake);
  const setAudioNotification = useUserStore((s) => s.setAudioNotification);
  const setName = useUserStore((s) => s.setName);
  const displayName = name && name !== "Athlete" ? name : "";

  const router = useRouter();
  const showAlert = useAlertStore((s) => s.showAlert);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t } = useTranslation();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

  // Subscribe to playback state
  useEffect(() => {
    return subscribeAudioPlayback((playing) => {
      setIsPlayingAudio(playing);
      if (!playing) {
        setCountdownRemaining(null);
      }
    });
  }, []);

  // Audio preview countdown timer
  useEffect(() => {
    let interval: any = null;
    if (isPlayingAudio) {
      const dur = useUserStore.getState().customAudioDuration || 5;
      setCountdownRemaining(dur);
      interval = setInterval(() => {
        setCountdownRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdownRemaining(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlayingAudio]);

  // CRITICAL FIX: Stop preview sound when app is minimized or navigated away!
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active") {
        stopTimerSound();
      }
    });

    return () => {
      sub.remove();
      stopTimerSound();
    };
  }, []);

  const triggerHaptic = (duration: number = 70) => {
    triggerButtonVibration(hapticsEnabled, duration);
  };

  const playPreview = (soundOption: string) => {
    const dur = useUserStore.getState().customAudioDuration || 5;
    const off = useUserStore.getState().customAudioStartOffset || 0;
    playPreviewSound(soundOption, dur, off);
  };

  const handleIncrementGoal = () => {
    triggerHaptic();
    setWeeklyGoal(Math.min(7, weeklyGoal + 1));
  };
  const handleDecrementGoal = () => {
    triggerHaptic();
    setWeeklyGoal(Math.max(1, weeklyGoal - 1));
  };

  const dailyStepGoal = useStepStore((s) => s.dailyStepGoal);
  const setDailyStepGoal = useStepStore((s) => s.setDailyStepGoal);
  const isStepConnected = useStepStore((s) => s.isConnected);
  const isStepAvailable = useStepStore((s) => s.isAvailable);
  const stepAvailabilityStatus = useStepStore((s) => s.availabilityStatus);
  const isStepSyncing = useStepStore((s) => s.isSyncing);
  const connectSteps = useStepStore((s) => s.connect);
  const disconnectSteps = useStepStore((s) => s.disconnect);
  const syncSteps = useStepStore((s) => s.syncSteps);

  const handleIncrementStepGoal = () => {
    triggerHaptic();
    setDailyStepGoal(Math.min(50000, dailyStepGoal + 1000));
  };
  const handleDecrementStepGoal = () => {
    triggerHaptic();
    setDailyStepGoal(Math.max(1000, dailyStepGoal - 1000));
  };

  const handleToggleHealthConnect = async () => {
    triggerHaptic();
    if (isStepConnected) {
      disconnectSteps();
    } else {
      if (stepAvailabilityStatus === "update_required") {
        openHealthConnectStore();
      } else {
        const success = await connectSteps();
        if (!success && stepAvailabilityStatus === "not_installed_or_unlinked") {
          showAlert(
            t("health_connect"),
            t("health_connect_unavailable"),
            [
              { text: t("install_health_connect"), onPress: () => openHealthConnectStore() },
              { text: t("ok") },
            ]
          );
        }
      }
    }
  };

  const toggleReminders = async (value: boolean) => {
    triggerHaptic();
    if (value) {
      const granted = await requestPermissionsAsync();
      if (granted) {
        setRemindersEnabled(true);
        await scheduleDailyReminder(reminderTime, language);
      } else {
        setRemindersEnabled(false);
        showAlert(
          t("error"),
          t("grant_notification_permission"),
          [{ text: t("ok") }]
        );
      }
    } else {
      setRemindersEnabled(false);
      await cancelAllReminders();
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${minutes}`;
      setReminderTime(timeString);
      if (remindersEnabled) {
        await scheduleDailyReminder(timeString, language);
      }
    }
  };

  const getReminderDate = () => {
    const d = new Date();
    const [h, m] = reminderTime.split(":").map(Number);
    d.setHours(h || 9, m || 0, 0, 0);
    return d;
  };

  const handleExport = async () => {
    triggerHaptic();
    try {
      const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        user: useUserStore.getState(),
        workout: {
          templates: useWorkoutStore.getState().templates,
          sessions: useWorkoutStore.getState().sessions,
          scheduledWorkouts: useWorkoutStore.getState().scheduledWorkouts,
        },
        steps: {
          dailyStepGoal: useStepStore.getState().dailyStepGoal,
          todaySteps: useStepStore.getState().todaySteps,
          stepHistory: useStepStore.getState().stepHistory,
          lastSyncTime: useStepStore.getState().lastSyncTime,
        },
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const fileUri = `${FileSystem.documentDirectory}MotionFit_Export.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        showAlert(t("export_failed"), t("sharing_not_available"), [
          { text: t("ok") },
        ]);
      }
    } catch (error) {
      showAlert(t("error"), t("export_error"), [
        { text: t("ok"), style: "cancel" },
      ]);
    }
  };

  const handleImport = async () => {
    triggerHaptic();
    if (!DocumentPicker) {
      showAlert(t("error"), t("doc_picker_not_supported"), [{ text: t("ok") }]);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const parsed = JSON.parse(fileContent);

        if (!parsed || (!parsed.user && !parsed.workout && !parsed.steps)) {
          showAlert(t("error"), t("invalid_backup_file"), [{ text: t("ok") }]);
          return;
        }

        showAlert(t("import_confirm_title"), t("import_confirm_desc"), [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("import_data"),
            style: "destructive",
            onPress: () => {
              if (parsed.user) {
                useUserStore.setState(parsed.user);
              }
              if (parsed.workout) {
                useWorkoutStore.setState({
                  ...parsed.workout,
                  activeSession: null,
                });
              }
              if (parsed.steps) {
                useStepStore.setState({
                  dailyStepGoal: parsed.steps.dailyStepGoal ?? useStepStore.getState().dailyStepGoal,
                  todaySteps: parsed.steps.todaySteps ?? useStepStore.getState().todaySteps,
                  stepHistory: parsed.steps.stepHistory ?? useStepStore.getState().stepHistory,
                  lastSyncTime: parsed.steps.lastSyncTime ?? useStepStore.getState().lastSyncTime,
                });
              }
              triggerHaptic();
              showAlert(t("completed"), t("import_success"), [
                { text: t("ok") },
              ]);
            },
          },
        ]);
      }
    } catch (error) {
      showAlert(t("error"), t("invalid_backup_file"), [{ text: t("ok") }]);
    }
  };

  const handlePickAudio = async () => {
    triggerHaptic();
    if (!DocumentPicker) {
      showAlert(t("error"), t("doc_picker_not_supported"), [{ text: t("ok") }]);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "audio/*",
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/ogg",
          "audio/aac",
          "audio/m4a",
          "audio/x-m4a",
          "audio/flac",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedAsset = result.assets[0];
        let persistentUri = pickedAsset.uri;

        try {
          if (FileSystem.documentDirectory) {
            const rawExt = pickedAsset.name?.split(".").pop() || "mp3";
            const cleanExt =
              rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "mp3";
            const destUri = `${FileSystem.documentDirectory}custom_timer_${Date.now()}.${cleanExt}`;
            await FileSystem.copyAsync({ from: pickedAsset.uri, to: destUri });
            persistentUri = destUri;
          }
        } catch (copyErr) {
          console.warn("Failed to copy audio to documents, using cache URI:", copyErr);
        }

        setAudioNotification(persistentUri, pickedAsset.name || "Custom Audio");
        playPreview(persistentUri);
        showAlert(
          t("completed"),
          `${pickedAsset.name}\n\n${t("sound_mode_reminder")}`,
          [{ text: t("ok") }]
        );
      }
    } catch (error) {
      console.warn("Pick audio error:", error);
      showAlert(t("error"), t("pick_audio_error"), [{ text: t("ok") }]);
    }
  };

  const handlePlayCustomPreview = useCallback((offset?: number, duration?: number) => {
    triggerHaptic(50);
    const dur = duration !== undefined ? duration : (useUserStore.getState().customAudioDuration || 5);
    const off = offset !== undefined ? offset : (useUserStore.getState().customAudioStartOffset || 0);
    playPreviewSound(audioNotification, dur, off);
  }, [audioNotification, hapticsEnabled]);

  const handleStopCustomPreview = useCallback(() => {
    stopTimerSound();
  }, []);

  const handleSliderDragStart = useCallback(() => {
    setIsSliderDragging(true);
  }, []);

  const handleSliderDragEnd = useCallback(() => {
    setIsSliderDragging(false);
  }, []);

  const isDarkMode = theme === "dark";

  return (
    <View style={styles.container}>
      <ScrollView
        scrollEnabled={!isSliderDragging}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{t("settings")}</Text>
          <Text style={styles.headerSub}>
            {t("settings_subtitle") || "Preferences & app configuration"}
          </Text>
        </View>

        {/* Compact Profile Row */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            {displayName ? (
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            ) : (
              <User size={18} color={colors.primaryAction} strokeWidth={2.2} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TextInput
                style={styles.profileNameInput}
                value={displayName}
                placeholder={language === "id" ? "Nama Pengguna" : "User Name"}
                placeholderTextColor={colors.textMuted}
                onChangeText={(val) => setName(val)}
                maxLength={20}
              />
              <View style={styles.proBadge}>
                <Sparkles size={9} color="#F59E0B" />
                <Text style={styles.proBadgeText}>MOTIONFIT</Text>
              </View>
            </View>
            <Text style={styles.profileMeta}>
              {streak} {t("day_streak")} • {weeklyGoal} {t("days_per_week")}
            </Text>
          </View>
        </View>

        {/* 1. LANGKAH & KESEHATAN */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>
            {language === "id" ? "Langkah & Kesehatan" : "Steps & Health"}
          </Text>
          <View style={styles.groupCard}>
            {/* Target Langkah */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Footprints size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("daily_step_goal")}</Text>
                <Text style={styles.rowSubLabel}>{t("daily_step_goal_desc")}</Text>
              </View>
              <View style={styles.inlineStepper}>
                <TouchableOpacity onPress={handleDecrementStepGoal} style={styles.inlineStepperBtn} activeOpacity={0.7}>
                  <Minus size={13} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.inlineStepperValue}>{dailyStepGoal.toLocaleString()}</Text>
                <TouchableOpacity onPress={handleIncrementStepGoal} style={styles.inlineStepperBtn} activeOpacity={0.7}>
                  <Plus size={13} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Health Connect */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Activity size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("health_connect")}</Text>
                <Text style={styles.rowSubLabel}>
                  {isStepConnected
                    ? t("health_connect_connected")
                    : stepAvailabilityStatus === "update_required"
                    ? t("health_connect_unavailable")
                    : t("health_connect_not_connected")}
                </Text>
              </View>
              <Switch
                value={isStepConnected}
                onValueChange={handleToggleHealthConnect}
                trackColor={{ false: colors.borderSubtle, true: colors.primaryAction }}
                thumbColor="#fff"
              />
            </View>

            {isStepConnected && (
              <View style={styles.subActionRowCompact}>
                <TouchableOpacity
                  style={styles.subActionChip}
                  onPress={() => {
                    triggerHaptic();
                    syncSteps();
                  }}
                  disabled={isStepSyncing}
                >
                  <RotateCw color={colors.primaryAction} size={12} />
                  <Text style={styles.subActionChipText}>
                    {isStepSyncing ? t("syncing") : t("sync_steps")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subActionChip}
                  onPress={() => {
                    triggerHaptic();
                    openHealthConnectSettingsSafe();
                  }}
                >
                  <ExternalLink color={colors.textSecondary} size={12} />
                  <Text style={styles.subActionChipText}>Pengaturan</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isStepConnected && stepAvailabilityStatus === "update_required" && (
              <View style={styles.subActionContainer}>
                <TouchableOpacity
                  style={styles.subActionChip}
                  onPress={() => {
                    triggerHaptic();
                    openHealthConnectStore();
                  }}
                >
                  <ExternalLink color={colors.primaryAction} size={12} />
                  <Text style={[styles.subActionChipText, { color: colors.primaryAction }]}>
                    {t("install_health_connect")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* 2. LATIHAN & TARGET */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>{t("workout") || "Latihan & Istirahat"}</Text>
          <View style={styles.groupCard}>
            {/* Target Mingguan */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Target size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("weekly_goal")}</Text>
                <Text style={styles.rowSubLabel}>{t("weekly_goal_desc")}</Text>
              </View>
              <View style={styles.inlineStepper}>
                <TouchableOpacity onPress={handleDecrementGoal} style={styles.inlineStepperBtn} activeOpacity={0.7}>
                  <Minus size={13} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.inlineStepperValue}>{weeklyGoal} hr</Text>
                <TouchableOpacity onPress={handleIncrementGoal} style={styles.inlineStepperBtn} activeOpacity={0.7}>
                  <Plus size={13} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Timer Istirahat Otomatis */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Timer size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("default_rest_timer")}</Text>
                <Text style={styles.rowSubLabel}>{t("default_rest_timer_desc")}</Text>
              </View>
              <Switch
                value={autoStartTimer}
                onValueChange={(val) => {
                  triggerHaptic();
                  setAutoStartTimer(val);
                }}
                trackColor={{ false: colors.borderSubtle, true: colors.primaryAction }}
                thumbColor="#fff"
              />
            </View>

            {/* Durasi Detik Istirahat (Muncul hanya jika Timer Otomatis Aktif) */}
            {autoStartTimer && (
              <>
                <View style={styles.rowDivider} />
                <View style={[styles.compactRow, { paddingLeft: 42 }]}>
                  <View style={styles.rowLabelWrap}>
                    <Text style={styles.rowLabel}>{t("rest_duration")}</Text>
                    <Text style={styles.rowSubLabel}>{t("rest_duration_desc")}</Text>
                  </View>
                  <View style={styles.inlineStepper}>
                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setDefaultRestTimer(Math.max(5, (defaultRestTimer || 90) - 15));
                      }}
                      style={styles.inlineStepperBtn}
                      activeOpacity={0.7}
                    >
                      <Minus size={13} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.inlineStepperInput}
                      keyboardType="number-pad"
                      value={String(defaultRestTimer || "")}
                      placeholder="90"
                      placeholderTextColor={colors.textMuted}
                      maxLength={3}
                      selectTextOnFocus
                      onChangeText={(val) => {
                        const clean = val.replace(/[^0-9]/g, "");
                        if (clean === "") {
                          setDefaultRestTimer(0);
                        } else {
                          const parsed = parseInt(clean, 10);
                          if (!isNaN(parsed)) {
                            setDefaultRestTimer(Math.min(600, parsed));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (!defaultRestTimer || defaultRestTimer < 5) {
                          setDefaultRestTimer(5);
                        }
                      }}
                    />
                    <Text style={styles.inlineUnitText}>{t("seconds_short")}</Text>

                    <TouchableOpacity
                      onPress={() => {
                        triggerHaptic();
                        setDefaultRestTimer(Math.min(600, (defaultRestTimer || 90) + 15));
                      }}
                      style={styles.inlineStepperBtn}
                      activeOpacity={0.7}
                    >
                      <Plus size={13} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 2. PREFERENSI SISTEM */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>{t("preferences")}</Text>
          <View style={styles.groupCard}>
            {/* Bahasa */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Globe size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("language")}</Text>
              </View>
              <View style={styles.compactSegmented}>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, language === "id" && styles.compactSegmentBtnActive]}
                  onPress={() => {
                    triggerHaptic(50);
                    setLanguage("id");
                    if (remindersEnabled) scheduleDailyReminder(reminderTime, "id");
                  }}
                >
                  <Text style={[styles.compactSegmentText, language === "id" && styles.compactSegmentTextActive]}>ID</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, language === "en" && styles.compactSegmentBtnActive]}
                  onPress={() => {
                    triggerHaptic(50);
                    setLanguage("en");
                    if (remindersEnabled) scheduleDailyReminder(reminderTime, "en");
                  }}
                >
                  <Text style={[styles.compactSegmentText, language === "en" && styles.compactSegmentTextActive]}>EN</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Tema */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                {isDarkMode ? <Moon size={15} color={colors.primaryAction} /> : <Sun size={15} color={colors.primaryAction} />}
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("theme")}</Text>
              </View>
              <View style={styles.compactSegmented}>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, !isDarkMode && styles.compactSegmentBtnActive]}
                  onPress={() => {
                    triggerHaptic(50);
                    setTheme("light");
                  }}
                >
                  <Text style={[styles.compactSegmentText, !isDarkMode && styles.compactSegmentTextActive]}>Light</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, isDarkMode && styles.compactSegmentBtnActive]}
                  onPress={() => {
                    triggerHaptic(50);
                    setTheme("dark");
                  }}
                >
                  <Text style={[styles.compactSegmentText, isDarkMode && styles.compactSegmentTextActive]}>Dark</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.rowDivider} />

            {/* Haptik */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Activity size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("haptics")}</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={(val) => {
                  if (val) triggerButtonVibration(true, 120);
                  setHapticsEnabled(val);
                }}
                trackColor={{ false: colors.borderSubtle, true: colors.primaryAction }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.rowDivider} />

            {/* Layar Tetap Menyala */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Smartphone size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("keep_screen_awake")}</Text>
                <Text style={styles.rowSubLabel}>{t("keep_screen_awake_desc")}</Text>
              </View>
              <Switch
                value={keepScreenAwake}
                onValueChange={(val) => {
                  triggerHaptic();
                  setKeepScreenAwake(val);
                }}
                trackColor={{ false: colors.borderSubtle, true: colors.primaryAction }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* 3. SUARA & PENGINGAT */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>{t("audio_notification")}</Text>
          <View style={styles.groupCard}>
            {/* Mode Suara Alarm */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Volume2 size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("audio_notification")}</Text>
              </View>
              <View style={styles.compactSegmented}>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, audioNotification === "default_notification" && styles.compactSegmentBtnActive]}
                  onPress={() => {
                    triggerHaptic(60);
                    setAudioNotification("default_notification");
                    playPreview("default_notification");
                  }}
                >
                  <Text style={[styles.compactSegmentText, audioNotification === "default_notification" && styles.compactSegmentTextActive]}>
                    {t("default")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, audioNotification !== "default_notification" && audioNotification !== "none" && styles.compactSegmentBtnActive]}
                  onPress={handlePickAudio}
                >
                  <Text style={[styles.compactSegmentText, audioNotification !== "default_notification" && audioNotification !== "none" && styles.compactSegmentTextActive]}>
                    {t("custom")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.compactSegmentBtn, audioNotification === "none" && styles.compactSegmentBtnActive]}
                  onPress={() => {
                    triggerHaptic(60);
                    stopTimerSound();
                    setAudioNotification("none");
                  }}
                >
                  <Text style={[styles.compactSegmentText, audioNotification === "none" && styles.compactSegmentTextActive]}>
                    {t("silent")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Custom Audio Trimmer Card */}
            {audioNotification !== "default_notification" && audioNotification !== "none" && (
              <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                <AudioTrimmerCard
                  isPlayingAudio={isPlayingAudio}
                  countdownRemaining={countdownRemaining}
                  onPlayPreview={handlePlayCustomPreview}
                  onStopPreview={handleStopCustomPreview}
                  onPickAudio={handlePickAudio}
                  onSliderDragStart={handleSliderDragStart}
                  onSliderDragEnd={handleSliderDragEnd}
                />
              </View>
            )}

            {/* Default Audio Preview Action */}
            {audioNotification === "default_notification" && (
              <View style={styles.subActionContainer}>
                <TouchableOpacity
                  style={[styles.compactPreviewBtn, isPlayingAudio && styles.compactPreviewBtnStop]}
                  onPress={() => handlePlayCustomPreview()}
                  activeOpacity={0.85}
                >
                  {isPlayingAudio ? (
                    <>
                      <Square size={12} color="#FFFFFF" fill="#FFFFFF" />
                      <Text style={[styles.compactPreviewBtnText, { color: "#FFFFFF" }]}>
                        {t("stop_audio")} ({countdownRemaining ?? 5}s)
                      </Text>
                    </>
                  ) : (
                    <>
                      <Play size={12} color="#000000" fill="#000000" />
                      <Text style={styles.compactPreviewBtnText}>
                        {t("preview_audio")} (5s)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.rowDivider} />

            {/* Pengingat Harian */}
            <View style={styles.compactRow}>
              <View style={styles.rowIconBox}>
                <Bell size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("workout_reminders")}</Text>
                <Text style={styles.rowSubLabel}>
                  {remindersEnabled ? `${t("reminder_time")}: ${reminderTime}` : (language === "id" ? "Pengingat latihan harian" : "Daily workout reminders")}
                </Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={toggleReminders}
                trackColor={{ false: colors.borderSubtle, true: colors.primaryAction }}
                thumbColor="#fff"
              />
            </View>

            {remindersEnabled && (
              <View style={styles.subActionContainer}>
                <TouchableOpacity
                  style={styles.timePickerCompactBtn}
                  onPress={() => setShowTimePicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Clock size={13} color={colors.primaryAction} />
                    <Text style={styles.timePickerCompactLabel}>{t("reminder_time")}</Text>
                  </View>
                  <Text style={styles.timePickerCompactValue}>{reminderTime}</Text>
                </TouchableOpacity>
              </View>
            )}

            {showTimePicker && (
              <DateTimePicker
                value={getReminderDate()}
                mode="time"
                is24Hour={true}
                display="default"
                onValueChange={handleTimeChange}
              />
            )}
          </View>
        </View>


        {/* 5. DATA & CADANGAN */}
        <View style={styles.groupSection}>
          <Text style={styles.groupHeader}>Data & Cadangan</Text>
          <View style={styles.groupCard}>
            <TouchableOpacity style={styles.compactActionRow} onPress={handleExport} activeOpacity={0.7}>
              <View style={styles.rowIconBox}>
                <Download size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("export_data")}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.rowDivider} />

            <TouchableOpacity style={styles.compactActionRow} onPress={handleImport} activeOpacity={0.7}>
              <View style={styles.rowIconBox}>
                <Upload size={15} color={colors.primaryAction} />
              </View>
              <View style={styles.rowLabelWrap}>
                <Text style={styles.rowLabel}>{t("import_data")}</Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>
            MotionFit v1.0.0 (Build 12) • Athletic Performance Engine
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (c: ThemeColors) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === "ios" ? 56 : 40,
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    headerBar: {
      marginBottom: 16,
    },
    headerTitle: {
      fontFamily: AppFonts.extraBold,
      fontSize: 24,
      fontWeight: "800",
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontFamily: AppFonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: "500",
      marginTop: 2,
    },

    // Profile Card (Compact Apple Health style)
    profileCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    profileAvatar: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: c.surfaceHighlight,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    profileNameInput: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: "700",
      color: c.textPrimary,
      letterSpacing: -0.2,
      padding: 0,
      minWidth: 100,
    },
    avatarText: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: "800",
      color: c.primaryAction,
    },
    proBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: "rgba(245, 158, 11, 0.12)",
      paddingHorizontal: 5,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    proBadgeText: {
      fontFamily: AppFonts.bold,
      fontSize: 10,
      fontWeight: "800",
      color: "#F59E0B",
      letterSpacing: 0.5,
    },
    profileMeta: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    // Group Sections (iOS Grouped List)
    groupSection: {
      marginBottom: 16,
    },
    groupHeader: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: c.textMuted,
      marginBottom: 6,
      marginLeft: 4,
    },
    groupCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      overflow: "hidden",
    },

    // Compact Row
    compactRow: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    compactActionRow: {
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    rowIconBox: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: c.surfaceHighlight,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabelWrap: {
      flex: 1,
    },
    rowLabel: {
      fontFamily: AppFonts.semiBold,
      fontSize: 13.5,
      fontWeight: "600",
      color: c.textPrimary,
    },
    rowSubLabel: {
      fontFamily: AppFonts.regular,
      fontSize: 12,
      color: c.textMuted,
      marginTop: 1,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderSubtle,
      marginLeft: 50,
    },

    // Inline Stepper
    inlineStepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 3,
    },
    inlineStepperBtn: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: c.cardSurface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    inlineStepperValue: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: "700",
      color: c.textPrimary,
      paddingHorizontal: 4,
      fontVariant: ["tabular-nums"],
      minWidth: 28,
      textAlign: "center",
    },
    inlineStepperInput: {
      fontFamily: AppFonts.bold,
      fontSize: 13,
      fontWeight: "700",
      color: c.textPrimary,
      paddingVertical: 0,
      paddingHorizontal: 2,
      minWidth: 26,
      textAlign: "center",
      fontVariant: ["tabular-nums"],
    },
    inlineUnitText: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textSecondary,
      marginRight: 2,
    },

    // Compact Segmented Controls
    compactSegmented: {
      flexDirection: "row",
      backgroundColor: c.surfaceHighlight,
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    compactSegmentBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    compactSegmentBtnActive: {
      backgroundColor: c.primaryAction,
    },
    compactSegmentText: {
      fontFamily: AppFonts.bold,
      fontSize: 11.5,
      fontWeight: "600",
      color: c.textSecondary,
    },
    compactSegmentTextActive: {
      color: "#000000",
      fontWeight: "800",
    },

    // Sub Actions
    subActionContainer: {
      paddingHorizontal: 12,
      paddingBottom: 10,
      paddingTop: 2,
    },
    subActionRowCompact: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingBottom: 10,
      paddingTop: 2,
      marginLeft: 38,
    },
    subActionChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 7,
    },
    subActionChipText: {
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      fontWeight: "600",
      color: c.textPrimary,
    },
    compactPreviewBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.primaryAction,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
      marginTop: 2,
    },
    compactPreviewBtnStop: {
      backgroundColor: c.danger,
    },
    compactPreviewBtnText: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: "700",
      color: "#000000",
    },
    timePickerCompactBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: c.surfaceHighlight,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      marginLeft: 38,
    },
    timePickerCompactLabel: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
    timePickerCompactValue: {
      fontFamily: AppFonts.bold,
      fontSize: 12,
      fontWeight: "700",
      color: c.primaryAction,
      fontVariant: ["tabular-nums"],
    },

    // Footer
    versionFooter: {
      alignItems: "center",
      marginTop: 12,
      marginBottom: 8,
    },
    versionText: {
      fontFamily: AppFonts.medium,
      fontSize: 11,
      color: c.textMuted,
      fontWeight: "500",
    },
  });
};
