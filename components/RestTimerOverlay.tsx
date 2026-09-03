import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated, TextInput, KeyboardAvoidingView, Platform, Keyboard, Vibration } from 'react-native';
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
  const animationValue = useRef(new Animated.Value(1)).current;
  const { audioNotification, hapticsEnabled } = useUserStore();
  const soundRef = useRef<Audio.Sound | null>(null);

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
        
        // Reset and start animation
        animationValue.stopAnimation();
        animationValue.setValue(1);
        
        // Slight delay to ensure the modal is visible before animating
        setTimeout(() => {
          Animated.timing(animationValue, {
            toValue: 0,
            duration: initialTime * 1000,
            useNativeDriver: false, 
          }).start();
        }, 100);

        setupNotification(initialTime);
      } else {
        setTimeLeft(0);
        setMaxTime(1);
        setIsEditing(true);
        animationValue.stopAnimation();
        animationValue.setValue(0);
      }
    } else {
      // Reset state when hiding to prevent race condition on next open
      targetEndTimeRef.current = null;
      setTimeLeft(initialTime);
      animationValue.stopAnimation();
      if (notificationIdRef.current) cancelNotification(notificationIdRef.current);
    }
  }, [visible, initialTime]);

  const startAnimation = (duration: number) => {
    animationValue.stopAnimation();
    animationValue.setValue(1);
    Animated.timing(animationValue, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false, 
    }).start();
  };

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
        const newMax = newTime > currentMax ? newTime : currentMax;
        
        animationValue.stopAnimation();
        animationValue.setValue(newTime / newMax);
        Animated.timing(animationValue, {
          toValue: 0,
          duration: newTime * 1000,
          useNativeDriver: false,
        }).start();

        return newMax;
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
    startAnimation(seconds);
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
      startAnimation(parsed);
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
  
  const strokeDashoffset = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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
                <Circle cx="150" cy="150" r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
                <AnimatedCircle
                  cx="150" cy="150" r={radius} stroke={colors.primary} strokeWidth={strokeWidth}
                  fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" rotation="-90" origin="150, 150"
                />
              </Svg>
              
              <View style={styles.timeTextContainer}>
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editableTimeBox}>
                  <Text style={styles.timeText}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </Text>
                  <Ionicons name="pencil-outline" color={colors.textSecondary} size={24} style={{ position: 'absolute', right: -40 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.editingContainer}>
              <Text style={styles.editingTitle}>{t('edit')} {t('rest_timer')}</Text>
              
              <View style={styles.presetsGrid}>
                {[30, 60, 90, 120].map((preset) => (
                  <TouchableOpacity key={preset} style={styles.presetButton} onPress={() => handleApplyPreset(preset)}>
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
                  placeholderTextColor="#475569"
                  value={manualInput}
                  onChangeText={setManualInput}
                  autoFocus
                />
                <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.danger, marginRight: 8 }]} onPress={() => setIsEditing(false)}>
                  <Ionicons name="close" color="#fff" size={24} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleManualApply}>
                  <Ionicons name="checkmark-outline" color={colors.textPrimaryOnVolt || '#000'} size={24} />
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

const getStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.background, // Make it opaque instead of transparent overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
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
    color: colors.text,
    fontSize: 72,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  controls: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
  },
  adjustButton: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  adjustText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  footerButtons: {
    width: '100%',
    flexDirection: 'row',
    gap: 16,
    marginTop: 'auto',
    marginBottom: 20,
  },
  skipButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  skipText: {
    color: colors.textPrimaryOnVolt || '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cancelSetButton: {
    flex: 1,
    backgroundColor: colors.card,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelSetText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  editingContainer: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 32,
    alignItems: 'center',
    marginBottom: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  editingTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  presetButton: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  presetText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 1,
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualInput: {
    flex: 1,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    borderRadius: 16,
    paddingVertical: 16,
  },
  applyButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 16,
  },
});

