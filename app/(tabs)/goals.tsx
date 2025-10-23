import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import {
  GoalsSettings,
  DEFAULT_GOALS_SETTINGS,
  ensurePermissions,
  scheduleWeeklyReminders,
  cancelScheduled,
  getNextReminderSummary,
} from '@/lib/notifications';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STORAGE_KEY = 'goalsSettings_v1';

// Validate "HH:mm" 24h
const isValidTime = (t: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(t).trim());

export default function GoalsScreen() {
  const [settings, setSettings] = useState<GoalsSettings>(DEFAULT_GOALS_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [dirty, setDirty] = useState(false); // track unsaved changes

  const preferredSet = useMemo(() => new Set(settings.preferredDays || []), [settings.preferredDays]);

  const load = async () => {
    try {
      const str = await AsyncStorage.getItem(STORAGE_KEY);
      if (str) {
        const parsed = JSON.parse(str);
        // merge defaults to be safe on future expansions
        setSettings((prev) => ({ ...DEFAULT_GOALS_SETTINGS, ...parsed }));
      } else {
        setSettings(DEFAULT_GOALS_SETTINGS);
      }
    } catch (e) {
      console.log('goals load error', e);
      setSettings(DEFAULT_GOALS_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const saveOnly = async (next: GoalsSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('goals save error', e);
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  // Load on focus
  useFocusEffect(
    React.useCallback(() => {
      load();
      // Check permission status for display
      (async () => {
        const granted = await ensurePermissions();
        // Do not enable scheduling automatically; we only cache status for UI
        setPermissionGranted(granted);
      })();
      return () => {};
    }, [])
  );

  const update = (partial: Partial<GoalsSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  };

  const bumpWeekly = (delta: number) => {
    const next = Math.max(0, Math.min(7, (settings.weeklyTarget || 0) + delta));
    if (next !== settings.weeklyTarget) {
      if (Platform.OS !== 'web') Haptics.selectionAsync();
      update({ weeklyTarget: next });
    }
  };

  const toggleDay = (idx: number) => {
    const set = new Set(settings.preferredDays || []);
    if (set.has(idx)) {
      set.delete(idx);
    } else {
      set.add(idx);
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    update({ preferredDays: Array.from(set).sort((a, b) => a - b) });
  };

  const toggleReminders = async () => {
    const nextValue = !settings.remindersEnabled;
    if (Platform.OS !== 'web') Haptics.selectionAsync();

    if (nextValue) {
      // Check permission now
      const granted = await ensurePermissions();
      setPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          'Notifications disabled',
          'Please enable notification permissions in system settings to get reminders.'
        );
        update({ remindersEnabled: false });
        return;
      }
      update({ remindersEnabled: true });
    } else {
      update({ remindersEnabled: false });
    }
  };

  const onApply = async () => {
    // Validate time
    if (settings.remindersEnabled) {
      if (!isValidTime(settings.reminderTime || '')) {
        Alert.alert('Invalid time', 'Please enter a valid time in HH:mm (24-hour) format.');
        return;
      }
      if (!settings.preferredDays || settings.preferredDays.length === 0) {
        Alert.alert('No days selected', 'Select at least one preferred training day to schedule reminders.');
        return;
      }
    }

    const base: GoalsSettings = {
      ...settings,
      updatedAt: Date.now(),
    };

    try {
      // Cancel any existing
      if (base.scheduledNotificationIds?.length) {
        await cancelScheduled(base.scheduledNotificationIds);
      }

      let newIds: string[] = [];
      if (base.remindersEnabled && permissionGranted) {
        newIds = await scheduleWeeklyReminders(base);
      }

      const finalSettings = { ...base, scheduledNotificationIds: newIds };
      await saveOnly(finalSettings);
      setSettings(finalSettings);
      setDirty(false);

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.log('apply schedule error', e);
      Alert.alert('Error', 'Failed to schedule reminders.');
    }
  };

  const nextReminderText = useMemo(() => {
    if (!settings.remindersEnabled) return 'Reminders off';
    const next = getNextReminderSummary(settings);
    if (!next) return 'No upcoming reminder';
    const now = new Date();
    const isToday =
      next.getFullYear() === now.getFullYear() &&
      next.getMonth() === now.getMonth() &&
      next.getDate() === now.getDate();
    const isTomorrow = (() => {
      const t = new Date(now);
      t.setDate(now.getDate() + 1);
      return (
        next.getFullYear() === t.getFullYear() &&
        next.getMonth() === t.getMonth() &&
        next.getDate() === t.getDate()
      );
    })();
    const hh = String(next.getHours()).padStart(2, '0');
    const mm = String(next.getMinutes()).padStart(2, '0');
    const weekday = DAYS_OF_WEEK[next.getDay()];
    if (isToday) return `Next reminder: Today ${hh}:${mm}`;
    if (isTomorrow) return `Next reminder: Tomorrow ${hh}:${mm}`;
    return `Next reminder: ${weekday} ${hh}:${mm}`;
  }, [settings]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Goals & Schedule</Text>
          <TouchableOpacity style={styles.applyButton} onPress={onApply}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.card} />
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        {/* Weekly Target */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Weekly Goal</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity style={styles.counterBtn} onPress={() => bumpWeekly(-1)}>
              <IconSymbol name="minus.circle.fill" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{settings.weeklyTarget}</Text>
            <TouchableOpacity style={styles.counterBtn} onPress={() => bumpWeekly(1)}>
              <IconSymbol name="plus.circle.fill" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.helpText}>Target number of workouts per week (0–7).</Text>
        </View>

        {/* Preferred Days */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferred Training Days</Text>
          <View style={styles.chipsRow}>
            {DAYS_OF_WEEK.map((d, i) => {
              const selected = preferredSet.has(i);
              return (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.helpText}>Pick the days you prefer to train.</Text>
        </View>

        {/* Reminders */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <IconSymbol name="bell.fill" size={18} color={settings.remindersEnabled ? colors.primary : colors.textSecondary} />
              <Text style={styles.label}>Enable reminders</Text>
            </View>
            <TouchableOpacity style={styles.toggle} onPress={toggleReminders}>
              <View style={[styles.toggleKnob, settings.remindersEnabled && styles.toggleOn]} />
            </TouchableOpacity>
          </View>

          <View style={[styles.timeRow, !settings.remindersEnabled && { opacity: 0.5 }]}>
            <IconSymbol name="clock.fill" size={18} color={colors.textSecondary} />
            <Text style={styles.label}>Time</Text>
            <TextInput
              style={[
                styles.timeInput,
                settings.remindersEnabled && !isValidTime(settings.reminderTime) && styles.timeInputInvalid,
              ]}
              editable={settings.remindersEnabled}
              keyboardType="numeric"
              placeholder="HH:mm"
              placeholderTextColor={colors.textSecondary}
              value={settings.reminderTime}
              onChangeText={(t) => update({ reminderTime: t })}
              maxLength={5}
            />
          </View>

          <View style={styles.statusRow}>
            <IconSymbol name="info.circle" size={16} color={colors.textSecondary} />
            <Text style={styles.statusText}>
              Permission: {permissionGranted === null ? 'Checking…' : permissionGranted ? 'Granted' : 'Not granted'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <IconSymbol name="calendar" size={16} color={colors.textSecondary} />
            <Text style={styles.statusText}>{nextReminderText}</Text>
          </View>
        </View>

        {dirty ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>You have unsaved changes. Tap Apply to save and (re)schedule reminders.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingVertical: 20, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  applyText: {
    color: colors.card,
    fontWeight: '700',
    marginLeft: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: { padding: 6 },
  counterValue: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  helpText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipSelected: {
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  chipTextSelected: {
    color: colors.card,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: { color: colors.text, fontWeight: '700', marginLeft: 6 },
  toggle: {
    width: 46,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textSecondary,
    transform: [{ translateX: 0 }],
  },
  toggleOn: {
    backgroundColor: colors.primary,
    transform: [{ translateX: 18 }],
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    marginLeft: 'auto',
    width: 80,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.background,
    paddingHorizontal: 10,
    color: colors.text,
    backgroundColor: colors.card,
    fontWeight: '700',
  },
  timeInputInvalid: {
    borderColor: '#ef5350',
  },
  statusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  notice: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 10,
  },
  noticeText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});