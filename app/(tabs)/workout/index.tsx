import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { MoreVertical, Plus, Play, Calendar, X } from 'lucide-react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function WorkoutScreen() {
  const router = useRouter();
  const templates = useWorkoutStore((state) => state.templates);
  const scheduledWorkouts = useWorkoutStore((state) => state.scheduledWorkouts);
  const scheduleWorkout = useWorkoutStore((state) => state.scheduleWorkout);
  const startSession = useWorkoutStore((state) => state.startSession);
  const deleteTemplate = useWorkoutStore((state) => state.deleteTemplate);
  const { showAlert } = useAlertStore();
  const colors = useThemeColors();
  const styles = getStyles(colors);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAssigning, setIsAssigning] = useState(false);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const scheduledTemplateId = scheduledWorkouts[selectedDateStr];
  const scheduledTemplate = templates.find(t => t.id === scheduledTemplateId);

  const handleStartWorkout = (templateId: string) => {
    startSession(templateId);
    router.push('/workout/active');
  };

  const handleAssign = (templateId: string) => {
    scheduleWorkout(selectedDateStr, templateId);
    setIsAssigning(false);
  };

  const handleUnassign = () => {
    scheduleWorkout(selectedDateStr, null);
  };

  const renderWeeklyCalendar = () => {
    // Keep it centered around the current week or the week of the selected date
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

    return (
      <View style={styles.calendarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
          {days.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const dateStr = format(date, 'yyyy-MM-dd');
            const hasWorkout = !!scheduledWorkouts[dateStr];

            return (
              <TouchableOpacity 
                key={index} 
                style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {format(date, 'EEE')}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                  {format(date, 'd')}
                </Text>
                {hasWorkout && (
                  <View style={[styles.dot, isSelected && styles.dotSelected]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTodaysPlan = () => {
    const isToday = isSameDay(selectedDate, new Date());
    const titleText = isToday ? "Today's Plan" : `Plan for ${format(selectedDate, 'MMM do')}`;

    return (
      <View style={styles.assignedContainer}>
        <Text style={styles.sectionTitle}>{titleText}</Text>
        
        {scheduledTemplate ? (
          <View style={styles.assignedCard}>
            <View style={styles.assignedHeader}>
              <Text style={styles.assignedTitle}>{scheduledTemplate.name}</Text>
              <TouchableOpacity onPress={handleUnassign} style={styles.unassignButton}>
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>
            {scheduledTemplate.subtitle && (
              <Text style={styles.assignedSubtitle}>{scheduledTemplate.subtitle}</Text>
            )}
            <TouchableOpacity 
              style={styles.mainStartButton}
              onPress={() => handleStartWorkout(scheduledTemplate.id)}
            >
              <Text style={styles.mainStartButtonText}>START WORKOUT</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.assignedCard, styles.unassignedCard]}>
            <Text style={styles.unassignedText}>No workout scheduled.</Text>
            <TouchableOpacity 
              style={styles.assignButton}
              onPress={() => setIsAssigning(!isAssigning)}
            >
              <Calendar color="#fff" size={20} />
              <Text style={styles.assignButtonText}>
                {isAssigning ? "Cancel Assignment" : "Assign Workout"}
              </Text>
            </TouchableOpacity>

            {isAssigning && (
              <View style={styles.inlinePicker}>
                <Text style={styles.inlinePickerTitle}>Select a Template</Text>
                {templates.length === 0 ? (
                  <Text style={styles.unassignedText}>You have no templates yet.</Text>
                ) : (
                  templates.map(t => (
                    <TouchableOpacity 
                      key={t.id} 
                      style={styles.inlineTemplateItem}
                      onPress={() => handleAssign(t.id)}
                    >
                      <Text style={styles.inlineTemplateName}>{t.name}</Text>
                      <Plus color="#3b82f6" size={20} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderTemplates = () => {
    return (
      <View style={styles.templatesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Templates</Text>
          <TouchableOpacity onPress={() => router.push('/workout/create')} style={styles.addButton}>
            <Plus color="#3b82f6" size={20} />
            <Text style={styles.addButtonText}>Create</Text>
          </TouchableOpacity>
        </View>

        {templates.map((template) => (
          <TouchableOpacity 
            key={template.id} 
            style={styles.templateCard}
            onPress={() => router.push(`/workout/preview?id=${template.id}`)}
          >
            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{template.name}</Text>
              {template.subtitle && <Text style={styles.templateSubtitle}>{template.subtitle}</Text>}
              <Text style={styles.exerciseCount}>{template.exercises.length} exercises</Text>
            </View>
            
            <View style={styles.templateActions}>
              
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => {
                  showAlert(template.name, 'Manage this template', [
                    { text: 'Edit', onPress: () => router.push(`/workout/create?id=${template.id}`) },
                    { 
                      text: 'Delete', 
                      style: 'destructive', 
                      onPress: () => {
                        setTimeout(() => {
                          showAlert('Delete Template', `Are you sure you want to delete "${template.name}"? This cannot be undone.`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(template.id) }
                          ]);
                        }, 300);
                      }
                    },
                    { text: 'Cancel', style: 'cancel' }
                  ]);
                }}
              >
                <MoreVertical color="#94a3b8" size={20} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={{ height: 100 }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Workout</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderWeeklyCalendar()}
        {renderTodaysPlan()}
        {renderTemplates()}
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
  calendarContainer: {
    marginBottom: 24,
  },
  calendarScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dayCard: {
    width: 60,
    height: 80,
    backgroundColor: colors.card,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayTextSelected: {
    color: '#dbeafe',
  },
  dateText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateTextSelected: {
    color: '#fff',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginTop: 4,
  },
  dotSelected: {
    backgroundColor: '#fff',
  },
  assignedContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  assignedCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unassignedCard: {
    alignItems: 'center',
    paddingVertical: 32,
    borderStyle: 'dashed',
  },
  assignedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assignedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    flex: 1,
  },
  unassignButton: {
    padding: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 12,
  },
  assignedSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  unassignedText: {
    color: colors.textSecondary,
    marginBottom: 16,
    fontSize: 16,
  },
  assignButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inlinePicker: {
    marginTop: 24,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  inlinePickerTitle: {
    color: colors.textSecondary,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  inlineTemplateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  inlineTemplateName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  mainStartButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  mainStartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  templatesContainer: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  templateSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  exerciseCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
  },
});
