import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Minus, Plus, Moon, Download, Bell, Clock } from 'lucide-react-native';
import { requestPermissionsAsync, scheduleDailyReminder, cancelAllReminders } from '@/utils/notifications';

export default function SettingsScreen() {
  const { name, weeklyGoal, theme, setWeeklyGoal, setTheme, remindersEnabled, reminderTime, setRemindersEnabled, setReminderTime } = useUserStore();
  const { showAlert } = useAlertStore();
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleIncrement = () => setWeeklyGoal(Math.min(7, weeklyGoal + 1));
  const handleDecrement = () => setWeeklyGoal(Math.max(1, weeklyGoal - 1));

  const toggleReminders = async (value: boolean) => {
    if (value) {
      const granted = await requestPermissionsAsync();
      if (granted) {
        setRemindersEnabled(true);
        await scheduleDailyReminder(reminderTime);
      } else {
        // Handle denied permission (e.g., alert the user)
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

  // Helper to parse "HH:mm" back to a Date object for the picker
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
        showAlert('Export Failed', 'Sharing is not available on this device.', [{ text: 'OK' }]);
      }
    } catch (error) {
      showAlert('Error', 'Failed to export data.', [{ text: 'OK', style: 'cancel' }]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Goals & Settings</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Goal</Text>
          <View style={styles.card}>
            <Text style={styles.cardDescription}>How many days per week do you want to train?</Text>
            
            <View style={styles.stepperContainer}>
              <TouchableOpacity onPress={handleDecrement} style={styles.stepperButton}>
                <Minus color="#fff" size={24} />
              </TouchableOpacity>
              
              <View style={styles.stepperValueContainer}>
                <Text style={styles.stepperValue}>{weeklyGoal}</Text>
                <Text style={styles.stepperLabel}>days / week</Text>
              </View>
              
              <TouchableOpacity onPress={handleIncrement} style={styles.stepperButton}>
                <Plus color="#fff" size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingsList}>
            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                  <Moon color="#3b82f6" size={20} />
                </View>
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch 
                value={theme === 'dark' || theme === 'system'} 
                onValueChange={(val) => setTheme(val ? 'dark' : 'light')} 
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingSeparator} />

            <View style={styles.settingItem}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <Bell color="#10b981" size={20} />
                </View>
                <Text style={styles.settingText}>Workout Reminders</Text>
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
                    <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                      <Clock color="#3b82f6" size={20} />
                    </View>
                    <Text style={styles.settingText}>Reminder Time</Text>
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
                <View style={[styles.iconBox, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                  <Download color="#f97316" size={20} />
                </View>
                <Text style={styles.settingText}>Export Data</Text>
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
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
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
  },
  settingsList: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
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
  },
  settingText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  settingSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  timeValueText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
