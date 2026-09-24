import React, { useState, useEffect, useMemo } from 'react';
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
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale/id';
import { MoreVertical, Plus, Calendar, X, Edit3, Trash2, Dumbbell, Play, ChevronRight } from 'lucide-react-native';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors, ThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import { triggerButtonVibration } from '@/utils/soundPlayer';
import { useUserStore } from '@/store/useUserStore';
import { useAuth } from '@clerk/expo';
import { deleteWorkoutTemplateFromCloud } from '@/services/syncService';
import { useRenderProfiler } from '@/hooks/useRenderProfiler';

export default function WorkoutScreen() {
  useRenderProfiler('WorkoutScreen', 8);
  const router = useRouter();
  const { userId } = useAuth();
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);
  const templates = useWorkoutStore((state) => state.templates);
  const sessions = useWorkoutStore((state) => state.sessions);
  const scheduledWorkouts = useWorkoutStore((state) => state.scheduledWorkouts);
  const scheduleWorkout = useWorkoutStore((state) => state.scheduleWorkout);
  const startSession = useWorkoutStore((state) => state.startSession);
  const deleteTemplate = useWorkoutStore((state) => state.deleteTemplate);
  const showAlert = useAlertStore((state) => state.showAlert);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { t, language } = useTranslation();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAssigning, setIsAssigning] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const scheduledTemplateId = scheduledWorkouts[selectedDateStr];
  const scheduledTemplate = templates.find((t) => t.id === scheduledTemplateId);

  // Precompute dates with a completed session once per sessions change, avoiding an
  // O(days x sessions) date-fns `format` sweep on every render of the weekly strip.
  const sessionDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      set.add(format(new Date(s.date), 'yyyy-MM-dd'));
    }
    return set;
  }, [sessions]);

  const activeSession = useWorkoutStore((state) => state.activeSession);

  const handleStartWorkout = (templateId: string) => {
    triggerButtonVibration(hapticsEnabled);

    // If there's already an active session for this template, just resume it
    if (activeSession && activeSession.templateId === templateId) {
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
              router.push('/workout/active');
            },
          },
          {
            text: t('start_new'),
            style: 'destructive',
            onPress: () => {
              startSession(templateId);
              router.push('/workout/active');
            },
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
    triggerButtonVibration(hapticsEnabled);
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
          onPress: () => {
            const templateId = activeTemplate?.id;
            if (templateId) {
              deleteTemplate(templateId);
              if (userId) {
                deleteWorkoutTemplateFromCloud(userId, templateId).catch((err) => {
                  console.warn('[AutoSync] Failed to delete template from cloud:', err);
                });
              }
            }
          },
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
          const isPastDay = isBefore(startOfDay(date), startOfDay(new Date()));
          const isSessionCompleted = sessionDateSet.has(dateStr);
          const hasWorkout = isPastDay
            ? isSessionCompleted
            : (isSessionCompleted || !!scheduledWorkouts[dateStr]);

          return (
            <Pressable
              key={index}
              style={styles.dayColumn}
              onPress={() => {
                setSelectedDate(date);
                triggerButtonVibration(hapticsEnabled);
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
                  isCurrentDay && styles.dayNumberBadgeToday,
                  isSelected && styles.dayNumberBadgeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    isCurrentDay && styles.dayNumberTextToday,
                    isSelected && styles.dayNumberTextSelected,
                  ]}
                >
                  {format(date, 'd')}
                </Text>
              </View>
              <View
                style={[
                  styles.dot,
                  hasWorkout && { backgroundColor: isSelected ? colors.textPrimaryOnVolt : colors.successBadge },
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
                <Dumbbell size={20} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.assignedTitle}>{scheduledTemplate.name}</Text>
                <Text style={styles.assignedSubtitle}>
                  {scheduledTemplate.subtitle
                    ? `${scheduledTemplate.subtitle} • ${scheduledTemplate.exercises.length} ${t('exercises_count')}`
                    : `${scheduledTemplate.exercises.length} ${t('exercises_count')}`}
                </Text>
              </View>
              <TouchableOpacity onPress={handleUnassign} style={styles.unassignButton}
                activeOpacity={0.7}>
                <X color={colors.textSecondary} size={16} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.mainStartButton}
              onPress={() => {
                handleStartWorkout(scheduledTemplate.id);
              }}
            
              activeOpacity={0.7}>
              <Play size={16} color={colors.textPrimaryOnVolt} fill={colors.textPrimaryOnVolt} />
              <Text style={styles.mainStartButtonText}>
                {activeSession?.templateId === scheduledTemplate.id
                  ? (t('resume_workout') || 'Lanjutkan Latihan')
                  : (t('start_workout') || 'Mulai Latihan')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.assignedCard, styles.unassignedCard]}>
            <View style={styles.emptyIconBox}>
              <Calendar color={colors.textMuted} size={24} />
            </View>
            <Text style={styles.unassignedText}>{t('no_workout_scheduled')}</Text>
            <TouchableOpacity
              style={styles.assignButton}
              onPress={() => setIsAssigning(!isAssigning)}
            
              activeOpacity={0.7}>
              <Plus color={colors.primaryAction} size={16} strokeWidth={2.4} />
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
                    
                      activeOpacity={0.7}>
                      <View>
                        <Text style={styles.inlineTemplateName}>{tmpl.name}</Text>
                        <Text style={styles.inlineTemplateSub}>
                          {tmpl.exercises.length} {t('exercises_count')}
                        </Text>
                      </View>
                      <View style={styles.inlineAddBadge}>
                        <Plus color={colors.primaryAction} size={15} />
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
          
            activeOpacity={0.7}>
            <Plus color={colors.primaryAction} size={14} strokeWidth={2.4} />
            <Text style={styles.addButtonText}>{t('create')}</Text>
          </TouchableOpacity>
        </View>

        {templates.length === 0 ? (
          <View style={styles.emptyTemplateCard}>
            <View style={styles.emptyTemplateIconBox}>
              <Dumbbell size={26} color={colors.textMuted} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTemplateTitle}>{t('no_templates_yet')}</Text>
            <Text style={styles.emptyTemplateSub}>
              {language === 'id'
                ? 'Buat rutinitas latihan pertama Anda untuk mulai berolahraga dengan mudah.'
                : 'Create your first workout routine to easily start training.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyTemplateButton}
              onPress={() => router.push('/workout/create')}
              activeOpacity={0.8}
            >
              <Plus color={colors.textPrimaryOnVolt} size={16} strokeWidth={2.4} />
              <Text style={styles.emptyTemplateButtonText}>{t('create_workout') || 'Buat Template'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => router.push(`/workout/preview?id=${template.id}`)}
            
              activeOpacity={0.7}>
              <View style={styles.templateIconWrapper}>
                <Dumbbell size={18} color={colors.primaryAction} />
              </View>

              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateSubtitle}>
                  {template.subtitle ? `${template.subtitle} • ` : ''}
                  {template.exercises.length} {t('exercises_count')}
                </Text>
              </View>

              <View style={styles.templateActions}>
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => openBottomSheet(template)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                
                  activeOpacity={0.7}>
                  <MoreVertical color={colors.textSecondary} size={18} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

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

      {/* Centered Popup Dialog for Template Actions */}
      <Modal visible={bottomSheetVisible} transparent animationType="fade" onRequestClose={closeBottomSheet}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={closeBottomSheet} />
          <View style={styles.popupCard}>
            <View style={styles.popupHeaderRow}>
              <View style={styles.sheetHeaderIconBox}>
                <Dumbbell size={18} color={colors.primaryAction} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle} numberOfLines={1}>
                  {activeTemplate?.name}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  {activeTemplate?.exercises?.length || 0} {t('exercises_count')}
                  {activeTemplate?.subtitle ? ` • ${activeTemplate.subtitle}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeBottomSheet}
                style={styles.popupCloseBtn}
                activeOpacity={0.7}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetActionsList}>
              <TouchableOpacity
                style={styles.sheetActionCard}
                onPress={handleEditTemplate}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.sheetIconBox,
                    { backgroundColor: colors.actionIconBg },
                  ]}
                >
                  <Edit3 color={colors.primaryAction} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetActionText}>{t('edit')}</Text>
                  <Text style={styles.sheetActionSub}>{t('edit_routine_sub')}</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sheetActionCard}
                onPress={handleDeleteTemplate}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.sheetIconBox,
                    { backgroundColor: colors.actionIconBg },
                  ]}
                >
                  <Trash2 color={colors.danger} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetActionText, { color: colors.danger }]}>
                    {t('delete')}
                  </Text>
                  <Text style={styles.sheetActionSub}>{t('delete_routine_sub')}</Text>
                </View>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={closeBottomSheet}
              activeOpacity={0.8}
            >
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
      fontFamily: AppFonts.extraBold,
      fontSize: 24,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontFamily: AppFonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      fontWeight: '500',
      marginTop: 2,
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
      fontFamily: AppFonts.semiBold,
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
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    dayNumberBadgeToday: {
      borderWidth: 1.5,
      borderColor: c.primaryAction,
      backgroundColor: c.actionIconBg,
    },
    dayNumberBadgeSelected: {
      backgroundColor: c.primaryAction,
      borderColor: c.primaryAction,
    },
    dayNumberText: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    dayNumberTextToday: {
      color: c.primaryAction,
      fontWeight: '800',
    },
    dayNumberTextSelected: {
      fontFamily: AppFonts.extraBold,
      fontWeight: '800',
      color: c.textPrimaryOnVolt,
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },

    // Assigned Plan Section
    assignedContainer: {
      marginBottom: 14,
    },
    sectionTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      letterSpacing: -0.3,
      marginBottom: 8,
    },
    assignedCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderLeftWidth: 4,
      borderLeftColor: c.primaryAction,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: c.shadowOpacity,
          shadowRadius: 3,
        },
        android: {
          elevation: c.elevation,
        },
      }),
    },
    unassignedCard: {
      alignItems: 'center',
      paddingVertical: 16,
      borderStyle: 'dashed',
      borderColor: '#334155',
      backgroundColor: 'transparent',
      borderLeftWidth: 1,
      borderLeftColor: '#334155',
    },
    emptyIconBox: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    assignedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    assignedIconBox: {
      width: 34,
      height: 34,
      borderRadius: 8,
      backgroundColor: c.actionIconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assignedTitle: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '800',
      color: c.textPrimary,
      marginBottom: 2,
    },
    unassignButton: {
      padding: 6,
      backgroundColor: c.surfaceHighlight,
      borderRadius: 8,
    },
    assignedSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textSecondary,
    },
    unassignedText: {
      fontFamily: AppFonts.medium,
      color: c.textMuted,
      marginBottom: 10,
      fontSize: 12,
    },
    assignButton: {
      backgroundColor: c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    assignButtonText: {
      fontFamily: AppFonts.bold,
      color: c.primaryAction,
      fontSize: 12,
      fontWeight: '800',
    },
    inlinePicker: {
      marginTop: 12,
      width: '100%',
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
      paddingTop: 10,
    },
    inlinePickerTitle: {
      fontFamily: AppFonts.bold,
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    inlineTemplateItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      padding: 10,
      borderRadius: 10,
      marginBottom: 6,
    },
    inlineTemplateName: {
      fontFamily: AppFonts.bold,
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 13,
    },
    inlineTemplateSub: {
      fontFamily: AppFonts.medium,
      color: c.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    inlineAddBadge: {
      width: 26,
      height: 26,
      borderRadius: 6,
      backgroundColor: c.cardSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mainStartButton: {
      backgroundColor: c.primaryAction,
      borderRadius: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    mainStartButtonText: {
      fontFamily: AppFonts.bold,
      color: c.textPrimaryOnVolt,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    mainStartButtonHighlight: {
      borderWidth: 2,
      borderColor: c.primaryAction,
    },
    tourButtonBadge: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tourButtonBadgeText: {
      fontFamily: AppFonts.bold,
      color: '#B45309',
      fontSize: 11,
      fontWeight: '800',
    },

    // Templates Section
    templatesContainer: {
      marginBottom: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceHighlight,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    addButtonText: {
      fontFamily: AppFonts.bold,
      color: c.primaryAction,
      fontSize: 11,
      fontWeight: '800',
    },
    templateCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 12,
      padding: 10,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 10,
    },
    templateIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    templateInfo: {
      flex: 1,
    },
    templateName: {
      fontFamily: AppFonts.bold,
      fontSize: 15,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 2,
    },
    templateSubtitle: {
      fontFamily: AppFonts.medium,
      fontSize: 12,
      color: c.textMuted,
    },
    templateActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    quickPlayBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: c.primaryAction,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuButton: {
      padding: 7,
      borderRadius: 8,
      backgroundColor: c.surfaceHighlight,
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
      fontFamily: AppFonts.semiBold,
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },

    // Centered Popup Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalBackdrop: {
      ...(StyleSheet.absoluteFill as any),
      backgroundColor: c.overlay,
    },
    popupCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 20,
      width: '100%',
      maxWidth: 350,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    popupHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.borderSubtle,
    },
    popupCloseBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceHighlight,
    },
    sheetHeaderIconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.actionIconBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTitle: {
      fontSize: 16,
      fontFamily: AppFonts.bold,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    sheetSubtitle: {
      fontSize: 12,
      fontFamily: AppFonts.medium,
      color: c.textSecondary,
      marginTop: 2,
    },
    sheetActionsList: {
      gap: 10,
    },
    sheetActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: c.elevatedSurface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      gap: 12,
    },
    sheetIconBox: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetActionText: {
      fontSize: 14,
      fontFamily: AppFonts.bold,
      color: c.textPrimary,
      fontWeight: '700',
    },
    sheetActionSub: {
      fontSize: 11,
      fontFamily: AppFonts.medium,
      color: c.textMuted,
      marginTop: 1,
    },
    sheetCancelBtn: {
      marginTop: 16,
      paddingVertical: 13,
      alignItems: 'center',
      backgroundColor: c.elevatedSurface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    sheetCancelText: {
      color: c.textSecondary,
      fontSize: 14,
      fontFamily: AppFonts.bold,
      fontWeight: '700',
    },
    emptyTemplateCard: {
      backgroundColor: c.cardSurface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      marginTop: 4,
    },
    emptyTemplateIconBox: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.surfaceHighlight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyTemplateTitle: {
      fontSize: 15,
      fontFamily: AppFonts.bold,
      color: c.textPrimary,
      marginBottom: 6,
      textAlign: 'center',
    },
    emptyTemplateSub: {
      fontSize: 12,
      fontFamily: AppFonts.medium,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 16,
      maxWidth: 260,
    },
    emptyTemplateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.primaryAction,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
    },
    emptyTemplateButtonText: {
      fontSize: 13,
      fontFamily: AppFonts.bold,
      color: c.textPrimaryOnVolt,
    },
  });

