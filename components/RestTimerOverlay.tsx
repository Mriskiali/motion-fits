import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Animated, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Edit2, Check, X } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { scheduleRestTimerNotification, cancelNotification } from '@/utils/notifications';

interface RestTimerOverlayProps {
  visible: boolean;
  initialTime: number; // in seconds
  onClose: () => void;
  onCancelSet?: () => void;
}

export default function RestTimerOverlay({ visible, initialTime, onClose, onCancelSet }: RestTimerOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isEditing, setIsEditing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const notificationIdRef = useRef<string | null>(null);
  const setupNotificationIdRef = useRef<number>(0);
  const targetEndTimeRef = useRef<number | null>(null);
  const animationValue = useRef(new Animated.Value(1)).current;

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
      targetEndTimeRef.current = Date.now() + initialTime * 1000;
      setTimeLeft(initialTime);
      setMaxTime(initialTime);
      setIsEditing(false);
      startAnimation(initialTime);
      setupNotification(initialTime);
    } else {
      // Reset state when hiding to prevent race condition on next open
      targetEndTimeRef.current = null;
      setTimeLeft(initialTime);
      if (notificationIdRef.current) cancelNotification(notificationIdRef.current);
    }
  }, [visible, initialTime]);

  const startAnimation = (duration: number) => {
    animationValue.setValue(1);
    Animated.timing(animationValue, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false, 
    }).start();
  };

  useEffect(() => {
    if (!visible || isEditing) return;

    if (timeLeft <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (notificationIdRef.current) cancelNotification(notificationIdRef.current);
      onClose();
      return;
    }

    if (timeLeft <= 5 && timeLeft > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
          <Text style={styles.title}>Rest</Text>

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
                  <Edit2 color={colors.textSecondary} size={20} style={{ position: 'absolute', right: -30 }} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.editingContainer}>
              <Text style={styles.editingTitle}>Adjust Time</Text>
              
              <View style={styles.presetsGrid}>
                {[30, 60, 90, 120].map((preset) => (
                  <TouchableOpacity key={preset} style={styles.presetButton} onPress={() => handleApplyPreset(preset)}>
                    <Text style={styles.presetText}>{preset}s</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.orText}>OR ENTER SECONDS</Text>

              <View style={styles.manualInputContainer}>
                <TextInput
                  style={styles.manualInput}
                  keyboardType="numeric"
                  placeholder="e.g. 45"
                  placeholderTextColor="#475569"
                  value={manualInput}
                  onChangeText={setManualInput}
                  autoFocus
                />
                <TouchableOpacity style={[styles.applyButton, { backgroundColor: colors.danger, marginRight: 8 }]} onPress={() => setIsEditing(false)}>
                  <X color="#fff" size={24} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyButton} onPress={handleManualApply}>
                  <Check color="#fff" size={24} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!isEditing && (
            <View style={styles.controls}>
              <TouchableOpacity style={styles.adjustButton} onPress={() => adjustTime(-15)}>
                <Text style={styles.adjustText}>-15s</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adjustButton} onPress={() => adjustTime(15)}>
                <Text style={styles.adjustText}>+15s</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footerButtons}>
            {onCancelSet && (
              <TouchableOpacity style={styles.cancelSetButton} onPress={handleCancelSet}>
                <Text style={styles.cancelSetText}>Cancel Set</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip Rest</Text>
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
    backgroundColor: colors.overlay,
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
    fontSize: 64,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 40,
  },
  adjustButton: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  adjustText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
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
    backgroundColor: colors.danger,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  skipText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cancelSetButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
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
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editingTitle: {
    color: colors.text,
    fontSize: 20,
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
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  presetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 16,
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
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyButton: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
  },
});
