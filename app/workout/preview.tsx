import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

export default function PreviewWorkoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  
  const templates = useWorkoutStore((state) => state.templates);
  const template = templates.find(t => t.id === id);

  const colors = useThemeColors();
  const styles = getStyles(colors);

  if (!template) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: colors.text, marginTop: 100, textAlign: 'center' }}>{t('template_not_found')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('preview')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{template.name}</Text>
        {template.subtitle && <Text style={styles.subtitle}>{template.subtitle}</Text>}

        <View style={styles.exercisesHeader}>
          <Text style={styles.sectionTitle}>{t('exercises')} ({template.exercises.length})</Text>
        </View>

        {template.exercises.map((exercise, index) => {
          const isTimeBased = exercise.type === 'time';
          return (
            <View key={exercise.id || index.toString()} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name || t('unnamed_exercise')}</Text>
                {isTimeBased ? <Ionicons name="time-outline" color={colors.success} size={18} /> : <Ionicons name="repeat-outline" color={colors.primary} size={18} />}
              </View>
              
              <View style={styles.exerciseDetailsRow}>
                <View style={styles.detailBadge}>
                  <Text style={styles.detailLabel}>{isTimeBased ? t('intervals_sets') : t('sets')}</Text>
                  <Text style={styles.detailText}>{exercise.sets}</Text>
                </View>
                
                <View style={styles.detailBadge}>
                  <Text style={styles.detailLabel}>{isTimeBased ? t('duration') : t('reps')}</Text>
                  <Text style={styles.detailText}>
                    {isTimeBased ? `${exercise.duration}${t('seconds_short')}` : `${exercise.reps}`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  iconButton: {
    padding: 8,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  exercisesHeader: {
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailBadge: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  detailText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
