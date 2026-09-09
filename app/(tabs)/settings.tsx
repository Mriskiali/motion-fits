import { ThemeColors } from "@/constants/theme";
import { useThemeColors } from "@/hooks/useThemeColors";
import { useTranslation } from "@/hooks/useTranslation";
import { useAlertStore } from "@/store/useAlertStore";
import { useUserStore } from "@/store/useUserStore";
import { useWorkoutStore } from "@/store/useWorkoutStore";
import {
  cancelAllReminders,
  requestPermissionsAsync,
  scheduleDailyReminder,
} from "@/utils/notifications";
import { playTimerSound, triggerButtonVibration } from "@/utils/soundPlayer";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import {
  Activity,
  Bell,
  Clock,
  Download,
  Globe,
  Info,
  Minus,
  Moon,
  Music,
  Play,
  Plus,
  Smartphone,
  Sun,
  Target,
  Timer,
  Upload,
  Volume2,
} from "lucide-react-native";
import { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
let DocumentPicker: any = null;
try {
  DocumentPicker = require("expo-document-picker");
} catch (e) {
  console.warn("expo-document-picker is not available");
}

export default function SettingsScreen() {
  const {
    weeklyGoal,
    theme,
    setWeeklyGoal,
    setTheme,
    remindersEnabled,
    reminderTime,
    setRemindersEnabled,
    setReminderTime,
    language,
    setLanguage,
    defaultRestTimer,
    setDefaultRestTimer,
    autoStartTimer,
    setAutoStartTimer,
    hapticsEnabled,
    setHapticsEnabled,
    keepScreenAwake,
    setKeepScreenAwake,
    audioNotification,
    setAudioNotification,
    customAudioName,
  } = useUserStore();
  const { showAlert } = useAlertStore();
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t } = useTranslation();

  const [showTimePicker, setShowTimePicker] = useState(false);

  const triggerHaptic = (duration: number = 70) => {
    triggerButtonVibration(hapticsEnabled, duration);
  };

  const playPreview = (soundOption: string) => {
    playTimerSound(soundOption);
  };

  const handleIncrementGoal = () => {
    triggerHaptic();
    setWeeklyGoal(Math.min(7, weeklyGoal + 1));
  };
  const handleDecrementGoal = () => {
    triggerHaptic();
    setWeeklyGoal(Math.max(1, weeklyGoal - 1));
  };

  const toggleReminders = async (value: boolean) => {
    triggerHaptic();
    if (value) {
      const granted = await requestPermissionsAsync();
      if (granted) {
        setRemindersEnabled(true);
        await scheduleDailyReminder(reminderTime);
      } else {
        setRemindersEnabled(false);
        showAlert(
          t("error"),
          "Please grant notification permission in system settings to enable reminders.",
          [{ text: t("ok") }],
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
        await scheduleDailyReminder(timeString);
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
        user: useUserStore.getState(),
        workout: useWorkoutStore.getState(),
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

        if (!parsed || (!parsed.user && !parsed.workout)) {
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
                useWorkoutStore.setState(parsed.workout);
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

        // Copy to permanent app documents folder to prevent cache purging
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
          console.warn(
            "Failed to copy audio to documents, using cache URI:",
            copyErr,
          );
        }

        setAudioNotification(persistentUri, pickedAsset.name || "Custom Sound");
        playPreview(persistentUri);
        showAlert(
          t("completed"),
          `${pickedAsset.name}\n\n${t("sound_mode_reminder")}`,
          [{ text: t("ok") }],
        );
      }
    } catch (error) {
      console.warn("Pick audio error:", error);
      showAlert(t("error"), t("pick_audio_error"), [{ text: t("ok") }]);
    }
  };

  const handlePlayCustomPreview = () => {
    triggerHaptic(50);
    playPreview(audioNotification);
  };

  const isDarkMode = theme === "dark";

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{t("settings")}</Text>
          <Text style={styles.headerSub}>
            {t("settings_subtitle") || "Preferences & app configuration"}
          </Text>
        </View>

        {/* 1. Weekly Goal Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("weekly_goal")}</Text>
          <View style={styles.goalCard}>
            <View style={styles.goalTopRow}>
              <View style={styles.goalIconBox}>
                <Target size={20} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalCardTitle}>{t("weekly_goal")}</Text>
                <Text style={styles.cardDescription}>
                  {t("weekly_goal_desc")}
                </Text>
              </View>
            </View>

            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={handleDecrementGoal}
                style={styles.stepperButton}
                activeOpacity={0.7}
              >
                <Minus color={colors.textPrimary} size={20} />
              </TouchableOpacity>

              <View style={styles.stepperValueContainer}>
                <Text style={styles.stepperValue}>{weeklyGoal}</Text>
                <Text style={styles.stepperLabel}>{t("days_per_week")}</Text>
              </View>

              <TouchableOpacity
                onPress={handleIncrementGoal}
                style={styles.stepperButton}
                activeOpacity={0.7}
              >
                <Plus color={colors.textPrimary} size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. Preferences & Options List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("preferences") || "Preferences"}
          </Text>

          <View style={styles.settingsGroup}>
            {/* Language */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Globe color={colors.primaryAction} size={18} />
                </View>
                <Text style={styles.settingText}>{t("language")}</Text>
              </View>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    language === "id" && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    if (hapticsEnabled)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage("id");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      language === "id" && styles.segmentTextActive,
                    ]}
                  >
                    ID
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    language === "en" && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    if (hapticsEnabled)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage("en");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      language === "en" && styles.segmentTextActive,
                    ]}
                  >
                    EN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingSeparator} />

            {/* Theme Selector */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  {isDarkMode ? (
                    <Moon color="#3b82f6" size={18} />
                  ) : (
                    <Sun color="#f59e0b" size={18} />
                  )}
                </View>
                <Text style={styles.settingText}>{t("theme")}</Text>
              </View>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    !isDarkMode && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    if (hapticsEnabled)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTheme("light");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      !isDarkMode && styles.segmentTextActive,
                    ]}
                  >
                    Light
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    isDarkMode && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    if (hapticsEnabled)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setTheme("dark");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      isDarkMode && styles.segmentTextActive,
                    ]}
                  >
                    Dark
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingSeparator} />

            {/* Haptics */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Activity color={colors.warning} size={18} />
                </View>
                <Text style={styles.settingText}>{t("haptics")}</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={(val) => {
                  if (val) triggerButtonVibration(true, 150);
                  setHapticsEnabled(val);
                }}
                trackColor={{
                  false: colors.borderSubtle,
                  true: colors.primaryAction,
                }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingSeparator} />

            {/* Default Rest Timer */}
            <View style={styles.settingItemCol}>
              <View style={styles.settingRowBetween}>
                <View style={styles.settingItemLeft}>
                  <View style={styles.iconBox}>
                    <Timer color={colors.successBadge} size={18} />
                  </View>
                  <Text style={styles.settingText}>
                    {t("default_prefix")} {t("rest_timer")}
                  </Text>
                </View>
                <Switch
                  value={autoStartTimer}
                  onValueChange={(val) => {
                    if (hapticsEnabled)
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAutoStartTimer(val);
                  }}
                  trackColor={{
                    false: colors.borderSubtle,
                    true: colors.primaryAction,
                  }}
                  thumbColor="#fff"
                />
              </View>

              {autoStartTimer && (
                <View style={styles.manualInputContainer}>
                  <TextInput
                    style={styles.manualInput}
                    keyboardType="numeric"
                    placeholder="e.g. 90"
                    placeholderTextColor={colors.textMuted}
                    value={String(defaultRestTimer)}
                    onChangeText={(val) => {
                      const parsed = parseInt(val);
                      if (!isNaN(parsed) && parsed > 0) {
                        setDefaultRestTimer(parsed);
                      } else if (val === "") {
                        setDefaultRestTimer(0);
                      }
                    }}
                  />
                  <Text style={styles.unitText}>{t("seconds")}</Text>
                </View>
              )}
            </View>

            <View style={styles.settingSeparator} />

            {/* Audio Notification */}
            <View style={styles.settingItemCol}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Volume2 color={colors.accent} size={18} />
                </View>
                <Text style={styles.settingText}>
                  {t("audio_notification")}
                </Text>
              </View>

              <View style={styles.audioSegmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    audioNotification === "default_notification" &&
                      styles.segmentBtnActive,
                    { flex: 1, alignItems: "center" },
                  ]}
                  onPress={() => {
                    triggerHaptic(70);
                    setAudioNotification("default_notification");
                    playPreview("default_notification");
                  }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      audioNotification === "default_notification" &&
                        styles.segmentTextActive,
                    ]}
                  >
                    {t("default")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    audioNotification !== "default_notification" &&
                      styles.segmentBtnActive,
                    { flex: 1, alignItems: "center" },
                  ]}
                  onPress={handlePickAudio}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      audioNotification !== "default_notification" &&
                        styles.segmentTextActive,
                    ]}
                  >
                    {t("custom")}
                  </Text>
                </TouchableOpacity>
              </View>

              {audioNotification !== "default_notification" && (
                <View style={styles.customAudioCard}>
                  {/* File Name Info Row */}
                  <View style={styles.customAudioFileRow}>
                    <View style={styles.customAudioIconBox}>
                      <Music size={13} color={colors.primaryAction} />
                    </View>
                    <Text
                      style={styles.customAudioFileName}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {customAudioName || "Custom Sound"}
                    </Text>
                  </View>

                  {/* Action Buttons Row */}
                  <View style={styles.customAudioActions}>
                    <TouchableOpacity
                      style={styles.customAudioActionBtn}
                      onPress={handlePlayCustomPreview}
                    >
                      <Play size={13} color={colors.primaryAction} />
                      <Text
                        style={[
                          styles.customAudioActionText,
                          { color: colors.primaryAction },
                        ]}
                      >
                        {t("play_preview")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.customAudioActionBtn}
                      onPress={handlePickAudio}
                    >
                      <Text style={styles.customAudioActionText}>
                        {t("change_file")}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.customAudioHintRow}>
                    <Info size={12} color={colors.textSecondary} />
                    <Text style={styles.customAudioHintText}>
                      {t("sound_mode_reminder_short")}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.settingSeparator} />

            {/* Reminders */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Bell color={colors.primaryAction} size={18} />
                </View>
                <Text style={styles.settingText}>{t("workout_reminders")}</Text>
              </View>
              <Switch
                value={remindersEnabled}
                onValueChange={toggleReminders}
                trackColor={{
                  false: colors.borderSubtle,
                  true: colors.primaryAction,
                }}
                thumbColor="#fff"
              />
            </View>

            {remindersEnabled && (
              <>
                <View style={styles.settingSeparator} />
                <TouchableOpacity
                  style={styles.settingItem}
                  onPress={() => setShowTimePicker(true)}
                >
                  <View style={styles.settingItemLeft}>
                    <View style={styles.iconBox}>
                      <Clock color="#3b82f6" size={18} />
                    </View>
                    <Text style={styles.settingText}>{t("reminder_time")}</Text>
                  </View>
                  <Text style={styles.timeValueText}>{reminderTime}</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={getReminderDate()}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onValueChange={handleTimeChange}
                  />
                )}
              </>
            )}

            <View style={styles.settingSeparator} />

            {/* Keep Screen Awake */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Smartphone color="#8B5CF6" size={18} />
                </View>
                <Text style={styles.settingText}>{t("keep_screen_awake")}</Text>
              </View>
              <Switch
                value={keepScreenAwake}
                onValueChange={(val) => {
                  triggerHaptic();
                  setKeepScreenAwake(val);
                }}
                trackColor={{
                  false: colors.borderSubtle,
                  true: colors.primaryAction,
                }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingSeparator} />

            {/* Export Data */}
            <TouchableOpacity style={styles.settingItem} onPress={handleExport}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Download color="#f97316" size={18} />
                </View>
                <Text style={styles.settingText}>{t("export_data")}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.settingSeparator} />

            {/* Import Data */}
            <TouchableOpacity style={styles.settingItem} onPress={handleImport}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Upload color="#10B981" size={18} />
                </View>
                <Text style={styles.settingText}>{t("import_data")}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === "ios" ? 60 : 44,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerBar: {
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    headerSub: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: "500",
      marginTop: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 12,
    },

    // Goal Card
    goalCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    goalTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
    },
    goalIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.surfaceHighlight,
      alignItems: "center",
      justifyContent: "center",
    },
    goalCardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: c.textPrimary,
      marginBottom: 2,
    },
    cardDescription: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    stepperContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    stepperButton: {
      backgroundColor: c.cardSurface,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    stepperValueContainer: {
      alignItems: "center",
      minWidth: 110,
    },
    stepperValue: {
      fontSize: 32,
      fontWeight: "800",
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    stepperLabel: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 2,
    },

    // Settings Group
    settingsGroup: {
      backgroundColor: c.cardSurface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    settingItemCol: {
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
    settingRowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    settingItemLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.surfaceHighlight,
    },
    settingText: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: "600",
    },
    settingSeparator: {
      height: 1,
      backgroundColor: c.borderSubtle,
      marginLeft: 66,
    },
    timeValueText: {
      color: c.primaryAction,
      fontSize: 15,
      fontWeight: "700",
    },

    // Segmented Controls
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: c.surfaceHighlight,
      borderRadius: 12,
      padding: 3,
    },
    audioSegmentedControl: {
      flexDirection: "row",
      backgroundColor: c.surfaceHighlight,
      borderRadius: 12,
      padding: 3,
      marginTop: 14,
    },
    segmentBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 9,
    },
    segmentBtnActive: {
      backgroundColor: c.cardSurface,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    segmentText: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: "700",
    },
    segmentTextActive: {
      color: c.textPrimary,
      fontWeight: "800",
    },

    // Manual input for rest timer
    manualInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginTop: 14,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 14,
    },
    manualInput: {
      width: 90,
      height: 40,
      backgroundColor: c.cardSurface,
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    unitText: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: "600",
    },

    // Custom Audio Card
    customAudioCard: {
      marginTop: 12,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    customAudioFileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
      marginBottom: 8,
    },
    customAudioIconBox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: c.cardSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    customAudioFileName: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: c.textPrimary,
    },
    customAudioActions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    customAudioActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    customAudioActionText: {
      fontSize: 12,
      fontWeight: "700",
      color: c.textSecondary,
    },
    customAudioHintRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    customAudioHintText: {
      flex: 1,
      fontSize: 11,
      fontWeight: "600",
      color: c.textSecondary,
      opacity: 0.85,
    },
  });
