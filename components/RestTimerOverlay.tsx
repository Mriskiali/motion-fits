import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
// dynamically require expo-av
let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('expo-av is not available in this environment');
}
import { useThemeColors } from '@/hooks/useThemeColors';
import { scheduleRestTimerNotification, cancelNotification } from '@/utils/notifications';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserStore } from '@/store/useUserStore';

interface RestTimerOverlayProps {
  visible: boolean;
  initialTime: number; // in seconds
  onClose: () => void;
  onCancelSet?: () => void;
}

export default function RestTimerOverlay({ visible, initialTime, onClose, onCancelSet }: RestTimerOverlayProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isEditing, setIsEditing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const notificationIdRef = useRef<string | null>(null);
  const setupNotificationIdRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const { audioNotification, hapticsEnabled } = useUserStore();
  const soundRef = useRef<any | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Track max time to correctly render the SVG progress ring
  const [maxTime, setMaxTime] = useState(initialTime);
  const colors = useThemeColors();
  const styles = getStyles(colors);

  const setupNotification = async (seconds: number) => {
    const currentSetupId = ++setupNotificationIdRef.current;
    
    if (notificationIdRef.current) {
      await cancelNotification(notificationIdRef.current);
      notificationIdRef.current = null;
    }
    
    if (seconds > 0) {
      const id = await scheduleRestTimerNotification(seconds);
      if (currentSetupId !== setupNotificationIdRef.current) {
        if (id) cancelNotification(id);
        return;
      }
      notificationIdRef.current = id;
    }
  };

  useEffect(() => {
    if (visible) {
      if (initialTime > 0) {
        targetEndTimeRef.current = Date.now() + initialTime * 1000;
        setTimeLeft(initialTime);
        setMaxTime(initialTime);
        setIsEditing(false);
        setupNotification(initialTime);
      } else {
        setTimeLeft(0);
        setMaxTime(1);
        setIsEditing(true);
      }
    } else {
      // Reset state when hiding to prevent race condition on next open
      targetEndTimeRef.current = null;
      setTimeLeft(initialTime);
      if (notificationIdRef.current) cancelNotification(notificationIdRef.current);
    }
  }, [visible, initialTime]);

  const playNotificationSound = async () => {
    if (!Audio) return;
    try {
      if (audioNotification === 'default_notification') {
        return;
      }
      
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (audioNotification === 'library_bell') {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/timerendsound.wav')
        );
        soundRef.current = sound;
        await sound.playAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioNotification }
        );
        soundRef.current = sound;
        await sound.playAsync();
      }
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  useEffect(() => {
    if (!visible || isEditing) return;

    if (timeLeft <= 0) {
      if (hapticsEnabled) {
        // Long vibration pattern: vibrate 500ms, pause 200ms, vibrate 500ms, pause 200ms, vibrate 1000ms
        Vibration.vibrate([0, 500, 200, 500, 200, 1000]);
      }
      playNotificationSound();
      if (notificationIdRef.current) cancelNotification(notificationIdRef.current);
      onClose();
      return;
    }

    if (timeLeft <= 5 && timeLeft > 0) {
      if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    const timerId = setInterval(() => {
      if (targetEndTimeRef.current) {
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, visible, isEditing]);

  const adjustTime = (amount: number) => {
    setTimeLeft((prev) => {
      const newTime = Math.max(0, prev + amount);
      targetEndTimeRef.current = Date.now() + newTime * 1000;
      setMaxTime((currentMax) => {
        return newTime > currentMax ? newTime : currentMax;
      });
      setTimeout(() => setupNotification(newTime), 0);
      return newTime;
    });
  };

  const handleApplyPreset = (seconds: number) => {
    targetEndTimeRef.current = Date.now() + seconds * 1000;
    setTimeLeft(seconds);
    setMaxTime(seconds);
    setIsEditing(false);
    setupNotification(seconds);
    Keyboard.dismiss();
  };

  const handleManualApply = () => {
    const parsed = parseInt(manualInput);
    if (!isNaN(parsed) && parsed > 0) {
      targetEndTimeRef.current = Date.now() + parsed * 1000;
      setTimeLeft(parsed);
      setMaxTime(parsed);
      setIsEditing(false);
      setupNotification(parsed);
    } else {
      setIsEditing(false);
    }
    Keyboard.dismiss();
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
    onClose();
  };

  const handleCancelSet = async () => {
    if (notificationIdRef.current) await cancelNotification(notificationIdRef.current);
    if (onCancelSet) onCancelSet();
  };

  const radius = 120;
  const strokeWidth = 15;
  const circumference = 2 * Math.PI * radius;
  
  // Compute progress directly from timeLeft/maxTime — works on all platforms
  const progress = maxTime > 0 ? timeLeft / maxTime : 0;
  const computedStrokeDashoffset = circumference * (1 - progress);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <Text style={styles.title}>{t('rest_timer')}</Text>

          {!isEditing ? (
            <View style={styles.timerContainer}>
              <Svg width={300} height={300} viewBox="0 0 300 300">
                <Circle
                  cx="150"
                  cy="150"
                  r={radius}
                  stroke={colors.surfaceHighlight}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <Circle
                  cx="150"
                  cy="150"
                  r={radius}
                  stroke={colors.primaryAction}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={`${computedStrokeDashoffset}`}
                  strokeLinecap="round"
                  transform="rotate(-90 150 150)"
                />
              </Svg>

              <View style={styles.timeTextContainer}>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editableTimeBox}>
                  <Text style={styles.timeText}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </Text>
                  <Ionicons
                    name="pencil-outline"
                    color={colors.textSecondary}
                    size={22}
                    style={{ position: 'absolute', right: -36 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.editingContainer}>
              <Text style={styles.editingTitle}>{t('edit')} {t('rest_timer')}</Text>

              <View style={styles.presetsGrid}>
                {[30, 60, 90, 120].map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={styles.presetButton}
                    onPress={() => handleApplyPreset(preset)}
                  >
                    <Text style={styles.presetText}>{preset}{t('seconds_short')}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.orText}>{t('or_enter_seconds')}</Text>

              <View style={styles.manualInputContainer}>
                <TextInput
                  style={styles.manualInput}
                  keyboardType="numeric"
                  placeholder={t('rest_timer_input_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={manualInput}
                  onChangeText={setManualInput}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.applyButton, { backgroundColor: 'rgba(239, 68, 68, 0.15)', marginRight: 8 }]}
                  onPress={() => setIsEditing(false)}
                >
                  <Ionicons name="close" color={colors.danger} size={22} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleManualApply}>
                  <Ionicons name="checkmark-outline" color="#FFFFFF" size={22} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isEditing && (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.adjustButton} onPress={() => adjustTime(-15)}>
                <Text style={styles.adjustText}>{t('minus_15s')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustButton} onPress={() => adjustTime(15)}>
                <Text style={styles.adjustText}>{t('plus_15s')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerButtons}>
            {onCancelSet && (
              <TouchableOpacity style={styles.cancelSetButton} onPress={handleCancelSet}>
                <Text style={styles.cancelSetText}>{t('cancel')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>{t('skip')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const getStyles = (c: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    title: {
      color: c.textSecondary,
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 36,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    timerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 36,
    },
    timeTextContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editableTimeBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    timeText: {
      color: c.textPrimary,
      fontSize: 72,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: -2,
    },
    controls: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 36,
    },
    adjustButton: {
      backgroundColor: c.cardSurface,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 20,
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
    adjustText: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '700',
    },
    footerButtons: {
      width: '100%',
      flexDirection: 'row',
      gap: 14,
      marginTop: 'auto',
      marginBottom: 20,
    },
    skipButton: {
      flex: 1,
      backgroundColor: c.primaryAction,
      paddingVertical: 16,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      ...Platform.select({
        ios: {
          shadowColor: c.primaryAction,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    skipText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    cancelSetButton: {
      flex: 1,
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 16,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelSetText: {
      color: c.danger,
      fontSize: 16,
      fontWeight: '800',
    },
    editingContainer: {
      width: '100%',
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      marginBottom: 36,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    editingTitle: {
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 20,
    },
    presetsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      marginBottom: 20,
    },
    presetButton: {
      backgroundColor: c.surfaceHighlight,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 14,
      minWidth: 70,
      alignItems: 'center',
    },
    presetText: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    orText: {
      color: c.textSecondary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 14,
      letterSpacing: 0.5,
    },
    manualInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    manualInput: {
      flex: 1,
      backgroundColor: c.surfaceHighlight,
      color: c.textPrimary,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
      borderRadius: 14,
      paddingVertical: 12,
    },
    applyButton: {
      backgroundColor: c.primaryAction,
      padding: 14,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

