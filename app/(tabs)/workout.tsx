import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { MoreVertical, Plus, Calendar, X, Edit3, Trash2, Dumbbell, Play } from 'lucide-react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { ThemeColors } from '@/constants/theme';
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
  const scheduledTemplate = templates.find((t) => t.id === scheduledTemplateId);

  const activeSession = useWorkoutStore((state) => state.activeSession);

  const handleStartWorkout = (templateId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If there's already an active session for this template, just resume it
    if (activeSession && activeSession.templateId === templateId) {
      scheduleWorkout(selectedDateStr, templateId);
      router.push('/workout/active');
      return;
    }

    // If there's an active session for a DIFFERENT template, ask the user
    if (activeSession) {
      showAlert(
        t('active_workout'),
        t('active_session_alert_msg'),
        [
          { text: t('cancel'), style: 'cancel' },
          {
            text: t('resume'),
            onPress: () => {
              if (activeSession.templateId) {
                scheduleWorkout(selectedDateStr, activeSession.templateId);
              }
              router.push('/workout/active');
            },
          },
          {
            text: t('start_new'),
            style: 'destructive',
            onPress: () => {
              scheduleWorkout(selectedDateStr, templateId);
              startSession(templateId);
              router.push('/workout/active');
            },
          },
        ]
      );
      return;
    }

    scheduleWorkout(selectedDateStr, templateId);
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
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => deleteTemplate(activeTemplate.id),
        },
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
      <View style={styles.dateScrollerRow}>
        {days.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isCurrentDay = isToday(date);
          const dateStr = format(date, 'yyyy-MM-dd');
          const hasWorkout = !!scheduledWorkouts[dateStr];

          return (
            <Pressable
              key={index}
              style={styles.dayColumn}
              onPress={() => {
                setSelectedDate(date);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.dayAbbr, isCurrentDay && styles.dayAbbrToday]}>
                {format(date, 'EEE', {
                  locale: language === 'id' ? idLocale : undefined,
                }).toUpperCase()}
              </Text>
              <View
                style={[
                  styles.dayNumberBadge,
                  isSelected && styles.dayNumberBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    isSelected && styles.dayNumberTextSelected,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  hasWorkout && { backgroundColor: isSelected ? colors.dateBadgeSelected : colors.primaryAction },
                  !hasWorkout && { backgroundColor: 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
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
              <View style={styles.assignedIconBox}>
                <Dumbbell size={22} color={colors.accentLime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignedTitle}>{scheduledTemplate.name}</Text>
                {scheduledTemplate.subtitle ? (
                  <Text style={styles.assignedSubtitle}>{scheduledTemplate.subtitle}</Text>
                ) : (
                  <Text style={styles.assignedSubtitle}>
                    {scheduledTemplate.exercises.length} {t('exercises_count')}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={handleUnassign} style={styles.unassignButton}>
                <X color={colors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.mainStartButton,
                activeSession?.templateId === scheduledTemplate.id && {
                  backgroundColor: colors.successBadge,
                },
              ]}
              onPress={() => handleStartWorkout(scheduledTemplate.id)}
            >
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.mainStartButtonText}>
                {activeSession?.templateId === scheduledTemplate.id
                  ? t('resume_workout')
                  : t('start_workout')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.assignedCard, styles.unassignedCard]}>
            <View style={styles.emptyIconBox}>
              <Calendar color={colors.textMuted} size={28} />
            </View>
            <Text style={styles.unassignedText}>{t('no_workout_scheduled')}</Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => setIsAssigning(!isAssigning)}
            >
              <Plus color="#FFFFFF" size={18} />
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
                  templates.map((tmpl) => (
                    <TouchableOpacity
                      key={tmpl.id}
                      style={styles.inlineTemplateItem}
                      onPress={() => handleAssign(tmpl.id)}
                    >
                      <View>
                        <Text style={styles.inlineTemplateName}>{tmpl.name}</Text>
                        <Text style={styles.inlineTemplateSub}>
                          {tmpl.exercises.length} {t('exercises_count')}
                        </Text>
                      </View>
                      <View style={styles.inlineAddBadge}>
                        <Plus color={colors.primaryAction} size={16} />
                      </View>
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
          <TouchableOpacity
            onPress={() => router.push('/workout/create')}
            style={styles.addButton}
          >
            <Plus color={colors.primaryAction} size={16} />
            <Text style={styles.addButtonText}>{t('create')}</Text>
          </TouchableOpacity>
        </View>

        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateCard}
            onPress={() => router.push(`/workout/preview?id=${template.id}`)}
          >
            <View style={styles.templateIconWrapper}>
              <Dumbbell size={20} color={colors.primaryAction} />
            </View>

            <View style={styles.templateInfo}>
              <Text style={styles.templateName}>{template.name}</Text>
              {template.subtitle ? (
                <Text style={styles.templateSubtitle}>{template.subtitle}</Text>
              ) : null}
              <View style={styles.exerciseBadge}>
                <Text style={styles.exerciseBadgeText}>
                  {template.exercises.length} {t('exercises_count')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => openBottomSheet(template)}
            >
              <MoreVertical color={colors.textSecondary} size={20} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={{ height: 120 }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>{t('workout')}</Text>
          <Text style={styles.headerSub}>{t('manage_routines_subtitle') || 'Plan & track your training'}</Text>
        </View>

        {renderWeeklyCalendar()}
        {renderTodaysPlan()}
        {renderTemplates()}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Bottom Sheet for Template Actions */}
      <Modal visible={bottomSheetVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeBottomSheet} />
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>{activeTemplate?.name}</Text>

            <TouchableOpacity style={styles.sheetAction} onPress={handleEditTemplate}>
              <View
                style={[
                  styles.sheetIconBox,
                  { backgroundColor: 'rgba(59, 130, 246, 0.12)' },
                ]}
              >
                <Edit3 color="#3b82f6" size={18} />
              </View>
              <Text style={styles.sheetActionText}>{t('edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetAction} onPress={handleDeleteTemplate}>
              <View
                style={[
                  styles.sheetIconBox,
                  { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
                ]}
              >
                <Trash2 color={colors.danger} size={18} />
              </View>
              <Text style={[styles.sheetActionText, { color: colors.danger }]}>
                {t('delete')}
              </Text>
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

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
      paddingHorizontal: 20,
      paddingBottom: 24,
    },
    headerBar: {
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.6,
    },
    headerSub: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 4,
    },

    // Date Scroller
    dateScrollerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      paddingVertical: 14,
      paddingHorizontal: 8,
      marginBottom: 24,
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
    dayColumn: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    dayAbbr: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
      letterSpacing: 0.3,
    },
    dayAbbrToday: {
      color: c.primaryAction,
      fontWeight: '700',
    },
    dayNumberBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    dayNumberBadgeSelected: {
      backgroundColor: c.dateBadgeSelected,
    },
    dayNumberText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
    },
    dayNumberTextSelected: {
      fontWeight: '800',
      color: c.dateTextSelected,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },

    // Assigned Plan Section
    assignedContainer: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 12,
    },
    assignedCard: {
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
    unassignedCard: {
      alignItems: 'center',
      paddingVertical: 28,
      borderStyle: 'dashed',
    },
    emptyIconBox: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    assignedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 18,
    },
    assignedIconBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assignedTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 2,
    },
    unassignButton: {
      padding: 6,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 10,
    },
    assignedSubtitle: {
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
    },
    unassignedText: {
      color: c.textSecondary,
      marginBottom: 16,
      fontSize: 14,
      fontWeight: '500',
    },
    assignButton: {
      backgroundColor: c.primaryAction,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    assignButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    inlinePicker: {
      marginTop: 20,
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
      paddingTop: 16,
    },
    inlinePickerTitle: {
      color: c.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    inlineTemplateItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      padding: 14,
      borderRadius: 14,
      marginBottom: 8,
    },
    inlineTemplateName: {
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    inlineTemplateSub: {
      color: c.textSecondary,
      fontSize: 12,
      marginTop: 2,
    },
    inlineAddBadge: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: c.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainStartButton: {
      backgroundColor: c.primaryAction,
      borderRadius: 18,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    mainStartButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.3,
    },

    // Templates Section
    templatesContainer: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      gap: 4,
    },
    addButtonText: {
      color: c.primaryAction,
      fontSize: 13,
      fontWeight: '700',
    },
    templateCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 14,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: c.shadowRadius,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    templateIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    templateSubtitle: {
      fontSize: 12,
      color: c.textSecondary,
      marginBottom: 4,
    },
    exerciseBadge: {
      alignSelf: 'flex-start',
      backgroundColor: c.surfaceHighlight,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      marginTop: 2,
    },
    exerciseBadgeText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },
    menuButton: {
      padding: 8,
    },

    // Bottom Sheet Modal
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...(StyleSheet.absoluteFill as any),
      backgroundColor: c.overlay,
    },
    bottomSheet: {
      backgroundColor: c.cardSurface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      paddingBottom: 48,
      borderTopWidth: 1,
      borderColor: c.borderSubtle,
    },
    dragHandle: {
      width: 36,
      height: 4,
      backgroundColor: c.borderSubtle,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 20,
      textAlign: 'center',
    },
    sheetAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
    },
    sheetIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    sheetActionText: {
      fontSize: 16,
      color: c.textPrimary,
      fontWeight: '600',
    },
    sheetCancelBtn: {
      marginTop: 20,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      borderRadius: 16,
    },
    sheetCancelText: {
      color: c.textSecondary,
      fontSize: 15,
      fontWeight: '700',
    },
  });

