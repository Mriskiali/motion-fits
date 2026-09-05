import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useThemeStyles } from '@/hooks/useThemeColors';
import { ThemeColors } from '@/constants/theme';

interface ExerciseItem {
  id: string;
  setNumber: number;
  prevWeight: string;
  weight: string;
  reps: string;
  isCompleted: boolean;
}

export default function WorkoutComponentShowcase() {
  const theme = useThemeColors();
  const styles = useThemeStyles(createStyles);

  const [activeDay, setActiveDay] = useState<number>(3); // Wednesday
  const [sets, setSets] = useState<ExerciseItem[]>([
    { id: '1', setNumber: 1, prevWeight: '80kg x 10', weight: '82.5', reps: '10', isCompleted: true },
    { id: '2', setNumber: 2, prevWeight: '80kg x 10', weight: '82.5', reps: '10', isCompleted: false },
    { id: '3', setNumber: 3, prevWeight: '80kg x 8', weight: '82.5', reps: '8', isCompleted: false },
  ]);

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const toggleSetComplete = (id: string) => {
    setSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isCompleted: !s.isCompleted } : s))
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. Day / Streak Tracker */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weekly Activity</Text>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={16} color={theme.warning} />
            <Text style={styles.streakText}>4 Days Streak</Text>
          </View>
        </View>

        <View style={styles.trackerRow}>
          {days.map((day, index) => {
            const isSelected = activeDay === index;
            return (
              <Pressable
                key={index}
                onPress={() => setActiveDay(index)}
                style={({ pressed }) => [
                  styles.dayBadge,
                  isSelected ? styles.dayBadgeActive : styles.dayBadgeInactive,
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isSelected ? styles.dayTextActive : styles.dayTextInactive,
                  ]}
                >
                  {day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 2. Exercise Card with Input Sets & Checkmark Toggle */}
      <View style={styles.card}>
        <View style={styles.exerciseTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exerciseName}>Barbell Bench Press</Text>
            <Text style={styles.exerciseSubtitle}>Chest, Triceps • 3 Sets</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.actionIconButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        {/* Set Table Header */}
        <View style={styles.setTableHeader}>
          <Text style={[styles.headerCell, { flex: 0.8 }]}>SET</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>PREVIOUS</Text>
          <Text style={[styles.headerCell, { flex: 1.3 }]}>KG</Text>
          <Text style={[styles.headerCell, { flex: 1.3 }]}>REPS</Text>
          <Text style={[styles.headerCell, { flex: 1, textAlign: 'center' }]}>DONE</Text>
        </View>

        {/* Set Rows */}
        <View style={styles.setRowsContainer}>
          {sets.map((item) => (
            <View
              key={item.id}
              style={[
                styles.setRow,
                item.isCompleted && styles.setRowCompleted,
              ]}
            >
              <Text style={[styles.setNumberText, { flex: 0.8 }]}>{item.setNumber}</Text>
              <Text style={[styles.prevWeightText, { flex: 1.5 }]}>{item.prevWeight}</Text>

              {/* Input: Weight */}
              <View style={{ flex: 1.3 }}>
                <TextInput
                  style={styles.setInputBox}
                  value={item.weight}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              {/* Input: Reps */}
              <View style={{ flex: 1.3 }}>
                <TextInput
                  style={styles.setInputBox}
                  value={item.reps}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                />
              </View>

              {/* Checkmark Toggle */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Pressable
                  onPress={() => toggleSetComplete(item.id)}
                  style={({ pressed }) => [
                    styles.checkToggle,
                    item.isCompleted ? styles.checkToggleCompleted : styles.checkToggleIncomplete,
                    pressed && { transform: [{ scale: 0.92 }] },
                  ]}
                >
                  {item.isCompleted && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Secondary / Ghost Button: Add Set */}
        <Pressable
          style={({ pressed }) => [
            styles.ghostButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => {
            setSets((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                setNumber: prev.length + 1,
                prevWeight: '-',
                weight: '',
                reps: '',
                isCompleted: false,
              },
            ]);
          }}
        >
          <Ionicons name="add" size={18} color={theme.primaryAction} />
          <Text style={styles.ghostButtonText}>Add Set</Text>
        </Pressable>
      </View>

      {/* 3. Primary CTA Button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 },
        ]}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color={theme.textPrimaryOnVolt} />
        <Text style={styles.primaryButtonText}>Finish Workout</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (t: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.background,
    },
    content: {
      padding: 16,
      gap: 16,
    },

    // Card Component
    card: {
      backgroundColor: t.cardSurface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: t.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: t.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: t.shadowOpacity,
          shadowRadius: 12,
        },
        android: {
          elevation: t.shadowOpacity > 0 ? 2 : 0,
        },
      }),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: t.textPrimary,
      letterSpacing: -0.3,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: t.surfaceHighlight,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
    },
    streakText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textPrimary,
    },

    // Day / Streak Tracker
    trackerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    dayBadge: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    dayBadgeActive: {
      backgroundColor: t.primaryAction,
      borderColor: t.primaryAction,
    },
    dayBadgeInactive: {
      backgroundColor: t.surfaceHighlight,
      borderColor: t.borderSubtle,
    },
    dayText: {
      fontSize: 14,
      fontWeight: '700',
    },
    dayTextActive: {
      color: t.textPrimaryOnVolt,
    },
    dayTextInactive: {
      color: t.textMuted,
    },

    // Exercise Card Details
    exerciseTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    exerciseName: {
      fontSize: 17,
      fontWeight: '700',
      color: t.textPrimary,
      letterSpacing: -0.2,
    },
    exerciseSubtitle: {
      fontSize: 13,
      color: t.textSecondary,
      marginTop: 2,
    },
    actionIconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.actionIconBg,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Set Table & Inputs
    setTableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 4,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: t.borderSubtle,
      marginBottom: 8,
    },
    headerCell: {
      fontSize: 11,
      fontWeight: '700',
      color: t.textMuted,
      letterSpacing: 0.5,
    },
    setRowsContainer: {
      gap: 8,
      marginBottom: 12,
    },
    setRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    setRowCompleted: {
      opacity: 0.85,
    },
    setNumberText: {
      fontSize: 14,
      fontWeight: '700',
      color: t.textPrimary,
    },
    prevWeightText: {
      fontSize: 13,
      color: t.textMuted,
      fontWeight: '500',
    },
    setInputBox: {
      backgroundColor: t.inputSurface,
      borderWidth: 1,
      borderColor: t.borderSubtle,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontSize: 15,
      fontWeight: '600',
      color: t.textPrimary,
      textAlign: 'center',
    },

    // Checkmark Toggle
    checkToggle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkToggleIncomplete: {
      borderWidth: 1.5,
      borderColor: t.borderSubtle,
      backgroundColor: t.surfaceHighlight,
    },
    checkToggleCompleted: {
      backgroundColor: t.successBadge,
      borderWidth: 0,
    },

    // Buttons
    primaryButton: {
      backgroundColor: t.primaryAction,
      borderRadius: 14,
      height: 52,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: t.primaryAction,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    primaryButtonText: {
      color: t.textPrimaryOnVolt,
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    ghostButton: {
      backgroundColor: t.surfaceHighlight,
      borderWidth: 1,
      borderColor: t.borderSubtle,
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    ghostButtonText: {
      color: t.primaryAction,
      fontSize: 14,
      fontWeight: '600',
    },
  });
