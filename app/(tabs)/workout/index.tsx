import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { MoreVertical, Plus, Calendar, X, Edit, Trash2 } from 'lucide-react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import * as Haptics from 'expo-haptics';

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
  const { t, language } = useTranslation();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const scheduledTemplateId = scheduledWorkouts[selectedDateStr];
  const scheduledTemplate = templates.find(t => t.id === scheduledTemplateId);

  const activeSession = useWorkoutStore((state) => state.activeSession);

  const handleStartWorkout = (templateId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If there's already an active session for this template, just resume it
    if (activeSession && activeSession.templateId === templateId) {
      router.push('/workout/active');
      return;
    }
    
    // If there's an active session for a DIFFERENT template, ask the user
    if (activeSession) {
      const activeTemplateName = templates.find(tmpl => tmpl.id === activeSession.templateId)?.name || t('workout');
      showAlert(
        t('active_workout'),
        t('active_session_alert_msg'),
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('resume'), onPress: () => router.push('/workout/active') },
          { 
            text: t('start_new'), 
            style: 'destructive', 
            onPress: () => {
              startSession(templateId);
              router.push('/workout/active');
            }
          },
        ]
      );
      return;
    }

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

  const openBottomSheet = (template: any) => {
    setActiveTemplate(template);
    setBottomSheetVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeBottomSheet = () => {
    setBottomSheetVisible(false);
    setActiveTemplate(null);
  };

  const handleDeleteTemplate = () => {
    closeBottomSheet();
    setTimeout(() => {
      showAlert(t('delete'), `${t('delete_confirm')} "${activeTemplate?.name}"?`, [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteTemplate(activeTemplate.id) }
      ]);
    }, 300);
  };

  const handleEditTemplate = () => {
    closeBottomSheet();
    router.push(`/workout/create?id=${activeTemplate?.id}`);
  };

  const renderWeeklyCalendar = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

    return (
      <View style={styles.calendarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarScroll}>
          {days.map((date, index) => {
            const isSelected = isSameDay(date, selectedDate);
            const isCurrentDay = isToday(date);
            const dateStr = format(date, 'yyyy-MM-dd');
            const hasWorkout = !!scheduledWorkouts[dateStr];

            return (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.dayCard, 
                  isSelected && styles.dayCardSelected,
                  isCurrentDay && !isSelected && styles.dayCardToday
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {format(date, 'EEE', { locale: language === 'id' ? idLocale : undefined })}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                  {format(date, 'd')}
                </Text>
                <View style={[
                  styles.dot,
                  hasWorkout ? { backgroundColor: colors.primary } : { backgroundColor: 'transparent' },
                  isSelected && hasWorkout && styles.dotSelected
                ]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderTodaysPlan = () => {
    const isCurrentDay = isSameDay(selectedDate, new Date());
    const loc = language === 'id' ? idLocale : undefined;
    const dateFormatted = format(selectedDate, 'd MMM', { locale: loc });
    const titleText = isCurrentDay ? t('today_plan') : `${t('plan_for')} ${dateFormatted}`;

    return (
      <View style={styles.assignedContainer}>
        <Text style={styles.sectionTitle}>{titleText}</Text>
        
        {scheduledTemplate ? (
          <View style={styles.assignedCard}>
            <View style={styles.assignedHeader}>
              <Text style={styles.assignedTitle}>{scheduledTemplate.name}</Text>
              <TouchableOpacity onPress={handleUnassign} style={styles.unassignButton}>
                <X color={colors.textSecondary} size={20} />
              </TouchableOpacity>
            </View>
            {scheduledTemplate.subtitle && (
              <Text style={styles.assignedSubtitle}>{scheduledTemplate.subtitle}</Text>
            )}
            <TouchableOpacity 
              style={[styles.mainStartButton, activeSession?.templateId === scheduledTemplate.id && { backgroundColor: colors.success || '#10b981' }]}
              onPress={() => handleStartWorkout(scheduledTemplate.id)}
            >
              <Text style={styles.mainStartButtonText}>
                {activeSession?.templateId === scheduledTemplate.id ? t('resume_workout') : t('start_workout')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.assignedCard, styles.unassignedCard]}>
            <Text style={styles.unassignedText}>{t('no_workout_scheduled')}</Text>
            <TouchableOpacity 
              style={styles.assignButton}
              onPress={() => setIsAssigning(!isAssigning)}
            >
              <Calendar color={colors.textPrimaryOnVolt || "#000"} size={20} />
              <Text style={styles.assignButtonText}>
                {isAssigning ? t('cancel') : t('assign_workout')}
              </Text>
            </TouchableOpacity>

            {isAssigning && (
              <View style={styles.inlinePicker}>
                <Text style={styles.inlinePickerTitle}>{t('select_template')}</Text>
                {templates.length === 0 ? (
                  <Text style={styles.unassignedText}>{t('no_templates_yet')}</Text>
                ) : (
                  templates.map(tmpl => (
                    <TouchableOpacity 
                      key={tmpl.id} 
                      style={styles.inlineTemplateItem}
                      onPress={() => handleAssign(tmpl.id)}
                    >
                      <Text style={styles.inlineTemplateName}>{tmpl.name}</Text>
                      <Plus color={colors.primary} size={20} />
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
          <Text style={styles.sectionTitle}>{t('templates')}</Text>
          <TouchableOpacity onPress={() => router.push('/workout/create')} style={styles.addButton}>
            <Plus color={colors.primary} size={20} />
            <Text style={styles.addButtonText}>{t('create')}</Text>
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
              <Text style={styles.exerciseCount}>{template.exercises.length} {t('exercises_count')}</Text>
            </View>
            
            <View style={styles.templateActions}>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => openBottomSheet(template)}
              >
                <MoreVertical color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={{ height: 120 }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>{t('workout')}</Text>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderWeeklyCalendar()}
        {renderTodaysPlan()}
        {renderTemplates()}
      </ScrollView>

      {/* Bottom Sheet for Template Actions */}
      <Modal visible={bottomSheetVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeBottomSheet} />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>{activeTemplate?.name}</Text>
            
            <TouchableOpacity style={styles.sheetAction} onPress={handleEditTemplate}>
              <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                <Edit color="#3b82f6" size={20} />
              </View>
              <Text style={styles.sheetActionText}>{t('edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetAction} onPress={handleDeleteTemplate}>
              <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Trash2 color={colors.danger} size={20} />
              </View>
              <Text style={[styles.sheetActionText, { color: colors.danger }]}>{t('delete')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetCancelBtn} onPress={closeBottomSheet}>
              <Text style={styles.sheetCancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  dayCardToday: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  dayText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayTextSelected: {
    color: colors.textPrimaryOnVolt || '#000',
  },
  dateText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateTextSelected: {
    color: colors.textPrimaryOnVolt || '#000',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  dotSelected: {
    backgroundColor: colors.textPrimaryOnVolt || '#000',
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
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    backgroundColor: colors.background,
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
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignButtonText: {
    color: colors.textPrimaryOnVolt || '#000',
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
    borderWidth: 1,
    borderColor: colors.border,
  },
  inlineTemplateName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  mainStartButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  mainStartButtonText: {
    color: colors.textPrimaryOnVolt || '#000',
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
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.2)',
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
    color: colors.accent,
    fontWeight: '600',
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...(StyleSheet.absoluteFill as any),
    backgroundColor: colors.overlay,
  },
  bottomSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sheetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sheetActionText: {
    fontSize: 18,
    color: colors.text,
    fontWeight: '600',
  },
  sheetCancelBtn: {
    marginTop: 24,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  sheetCancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
