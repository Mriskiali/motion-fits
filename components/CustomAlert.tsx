import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ThemeColors } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function CustomAlert() {
  const { visible, title, message, buttons, hideAlert } = useAlertStore();
  const colors = useThemeColors();
  const styles = getStyles(colors);

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={hideAlert}>
      <TouchableWithoutFeedback onPress={hideAlert}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.alertBox}>
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              <View
                style={[
                  styles.buttonContainer,
                  buttons.length >= 3 && styles.buttonContainerVertical,
                ]}
              >
                {buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        buttons.length === 2 && styles.buttonHalf,
                        buttons.length >= 3 && styles.buttonFull,
                        isDestructive && styles.buttonDestructive,
                        isCancel && styles.buttonCancel,
                        !isDestructive && !isCancel && styles.buttonPrimary,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(
                          isDestructive
                            ? Haptics.ImpactFeedbackStyle.Medium
                            : Haptics.ImpactFeedbackStyle.Light
                        );
                        hideAlert();
                        if (btn.onPress) btn.onPress();
                      }}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isDestructive && styles.buttonTextDestructive,
                          isCancel && styles.buttonTextCancel,
                          !isDestructive && !isCancel && styles.buttonTextPrimary,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const getStyles = (c: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    alertBox: {
      backgroundColor: c.cardSurface,
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 380,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    title: {
      color: c.textPrimary,
      fontSize: 19,
      fontWeight: '800',
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    message: {
      color: c.textSecondary,
      fontSize: 14,
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 20,
      fontWeight: '500',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      flexWrap: 'wrap',
    },
    buttonContainerVertical: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    button: {
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 90,
      flex: 1,
    },
    buttonPrimary: {
      backgroundColor: c.primaryAction,
    },
    buttonHalf: {
      flex: 1,
    },
    buttonFull: {
      width: '100%',
      flex: 0,
    },
    buttonDestructive: {
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
    buttonCancel: {
      backgroundColor: c.surfaceHighlight,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '700',
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    buttonTextDestructive: {
      color: c.danger,
      fontWeight: '800',
    },
    buttonTextCancel: {
      color: c.textPrimary,
      fontWeight: '700',
    },
  });

