import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Platform, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserStore, Language } from '@/store/useUserStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
let DocumentPicker: any = null;
try {
  DocumentPicker = require('expo-document-picker');
} catch (e) {
  console.warn('expo-document-picker is not available');
}
import { Minus, Plus, Moon, Download, Bell, Clock, Globe, Timer, Activity, Vibrate, Volume2 } from 'lucide-react-native';
import { requestPermissionsAsync, scheduleDailyReminder, cancelAllReminders } from '@/utils/notifications';
import { useTranslation } from '@/hooks/useTranslation';

export default function SettingsScreen() {
  const { 
    name, weeklyGoal, theme, setWeeklyGoal, setTheme, 
    remindersEnabled, reminderTime, setRemindersEnabled, setReminderTime,
    language, setLanguage, defaultRestTimer, setDefaultRestTimer,
    autoStartTimer, setAutoStartTimer, hapticsEnabled, setHapticsEnabled,
    audioNotification, setAudioNotification
  } = useUserStore();
  const { showAlert } = useAlertStore();
  const colors = useThemeColors();
  const styles = getStyles(colors);
  const { t } = useTranslation();

  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleIncrementGoal = () => setWeeklyGoal(Math.min(7, weeklyGoal + 1));
  const handleDecrementGoal = () => setWeeklyGoal(Math.max(1, weeklyGoal - 1));

  const handleIncrementTimer = () => setDefaultRestTimer(Math.min(300, defaultRestTimer + 15));
  const handleDecrementTimer = () => setDefaultRestTimer(Math.max(15, defaultRestTimer - 15));

  const toggleReminders = async (value: boolean) => {
    if (value) {
      const granted = await requestPermissionsAsync();
      if (granted) {
        setRemindersEnabled(true);
        await scheduleDailyReminder(reminderTime);
      } else {
        setRemindersEnabled(false);
      }
    } else {
      setRemindersEnabled(false);
      await cancelAllReminders();
    }
  };

  const handleTimeChange = async (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      setReminderTime(timeString);
      if (remindersEnabled) {
        await scheduleDailyReminder(timeString);
      }
    }
  };

  const getReminderDate = () => {
    const d = new Date();
    const [h, m] = reminderTime.split(':').map(Number);
    d.setHours(h || 9, m || 0, 0, 0);
    return d;
  };

  const handleExport = async () => {
    try {
      const data = {
        user: useUserStore.getState(),
        workout: useWorkoutStore.getState(),
      };
      const jsonStr = JSON.stringify(data, null, 2);
      const fileUri = `${FileSystem.documentDirectory}FitTrackPro_Export.json`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        showAlert(t('export_failed'), t('sharing_not_available'), [{ text: t('ok') }]);
      }
    } catch (error) {
      showAlert(t('error'), t('export_error'), [{ text: t('ok'), style: 'cancel' }]);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePickAudio = async () => {
    if (!DocumentPicker) {
      showAlert(t('error'), t('doc_picker_not_supported'), [{ text: t('ok') }]);
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAudioNotification(result.assets[0].uri);
      } else {
        // If they cancel, revert to default if they had nothing selected before
        // or just do nothing and let them click another button.
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      showAlert(t('error'), t('pick_audio_error'), [{ text: t('ok') }]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{t('settings')}</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('weekly_goal')}</Text>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>{t('weekly_goal_desc')}</Text>
            
            <View style={styles.stepperContainer}>
              <TouchableOpacity onPress={handleDecrementGoal} style={styles.stepperButton}>
                <Minus color={colors.textPrimaryOnVolt || "#000"} size={24} />
              </TouchableOpacity>
              
              <View style={styles.stepperValueContainer}>
                <Text style={styles.stepperValue}>{weeklyGoal}</Text>
                <Text style={styles.stepperLabel}>{t('days_per_week')}</Text>
              </View>
              
              <TouchableOpacity onPress={handleIncrementGoal} style={styles.stepperButton}>
                <Plus color={colors.textPrimaryOnVolt || "#000"} size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings')}</Text>
          
          <View style={styles.settingsList}>

            {/* Language */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Globe color={colors.primary} size={20} />
                </View>
                <Text style={styles.settingText}>{t('language')}</Text>
              </View>
              <View style={styles.segmentedControl}>
                <TouchableOpacity 
                  style={[styles.segmentBtn, language === 'id' && styles.segmentBtnActive]}
                  onPress={() => setLanguage('id')}
                >
                  <Text style={[styles.segmentText, language === 'id' && styles.segmentTextActive]}>ID</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.segmentBtn, language === 'en' && styles.segmentBtnActive]}
                  onPress={() => setLanguage('en')}
                >
                  <Text style={[styles.segmentText, language === 'en' && styles.segmentTextActive]}>EN</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingSeparator} />

            {/* Theme */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Moon color="#3b82f6" size={20} />
                </View>
                <Text style={styles.settingText}>{t('theme')}</Text>
              </View>
              <Switch 
                value={theme === 'dark' || theme === 'system'} 
                onValueChange={(val) => setTheme(val ? 'dark' : 'light')} 
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingSeparator} />

            {/* Haptics */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Activity color={colors.warning} size={20} />
                </View>
                <Text style={styles.settingText}>{t('haptics')}</Text>
              </View>
              <Switch 
                value={hapticsEnabled} 
                onValueChange={setHapticsEnabled} 
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingSeparator} />

            {/* Default Rest Timer */}
            <View style={styles.settingItemCol}>
              <View style={[styles.settingItemLeft, { justifyContent: 'space-between', flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.iconBox}>
                    <Timer color={colors.success} size={20} />
                  </View>
                  <Text style={styles.settingText}>{t('default_prefix')} {t('rest_timer')}</Text>
                </View>
                <Switch 
                  value={autoStartTimer} 
                  onValueChange={setAutoStartTimer} 
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
              
              {autoStartTimer && (
                <View style={[styles.manualInputContainer, { marginTop: 16, paddingHorizontal: 16 }]}>
                  <TextInput
                    style={[styles.manualInput, { height: 48, backgroundColor: colors.background }]}
                    keyboardType="numeric"
                    placeholder="e.g. 90"
                    placeholderTextColor={colors.textSecondary}
                    value={String(defaultRestTimer)}
                    onChangeText={(val) => {
                      const parsed = parseInt(val);
                      if (!isNaN(parsed) && parsed > 0) {
                        setDefaultRestTimer(parsed);
                      } else if (val === '') {
                        setDefaultRestTimer(0);
                      }
                    }}
                  />
                  <Text style={styles.settingText}>{t('seconds')}</Text>
                </View>
              )}
            </View>

            <View style={styles.settingSeparator} />

            {/* Audio Notification */}
            <View style={styles.settingItemCol}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Volume2 color={colors.accent} size={20} />
                </View>
                <Text style={styles.settingText}>{t('audio_notification')}</Text>
              </View>
              
              <View style={[styles.segmentedControl, { marginTop: 16, alignSelf: 'stretch', justifyContent: 'center' }]}>
                <TouchableOpacity 
                  style={[styles.segmentBtn, audioNotification === 'default_notification' && styles.segmentBtnActive, { flex: 1, alignItems: 'center' }]}
                  onPress={() => setAudioNotification('default_notification')}
                >
                  <Text style={[styles.segmentText, audioNotification === 'default_notification' && styles.segmentTextActive]}>{t('default')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.segmentBtn, audioNotification === 'library_bell' && styles.segmentBtnActive, { flex: 1, alignItems: 'center' }]}
                  onPress={() => setAudioNotification('library_bell')}
                >
                  <Text style={[styles.segmentText, audioNotification === 'library_bell' && styles.segmentTextActive]}>{t('bell')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.segmentBtn, (audioNotification !== 'default_notification' && audioNotification !== 'library_bell') && styles.segmentBtnActive, { flex: 1, alignItems: 'center' }]}
                  onPress={handlePickAudio}
                >
                  <Text style={[styles.segmentText, (audioNotification !== 'default_notification' && audioNotification !== 'library_bell') && styles.segmentTextActive]}>{t('custom')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingSeparator} />

            {/* Reminders */}
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Bell color={colors.primary} size={20} />
                </View>
                <Text style={styles.settingText}>{t('workout_reminders')}</Text>
              </View>
              <Switch 
                value={remindersEnabled} 
                onValueChange={toggleReminders} 
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {remindersEnabled && (
              <>
                <View style={styles.settingSeparator} />
                <TouchableOpacity style={styles.settingItem} onPress={() => setShowTimePicker(true)}>
                  <View style={styles.settingItemLeft}>
                    <View style={styles.iconBox}>
                      <Clock color="#3b82f6" size={20} />
                    </View>
                    <Text style={styles.settingText}>{t('reminder_time')}</Text>
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

            <TouchableOpacity style={styles.settingItem} onPress={handleExport}>
              <View style={styles.settingItemLeft}>
                <View style={styles.iconBox}>
                  <Download color="#f97316" size={20} />
                </View>
                <Text style={styles.settingText}>{t('export_data')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginHorizontal: 24,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  stepperButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueContainer: {
    alignItems: 'center',
    minWidth: 100,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  stepperLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  settingsList: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingVertical: 20,
  },
  settingItemCol: {
    padding: 16,
    paddingVertical: 20,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: colors.background,
  },
  settingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  settingSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  timeValueText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 4,
  },
  segmentBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  segmentTextActive: {
    color: colors.textPrimaryOnVolt || '#000',
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  manualInput: {
    width: 150,
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
