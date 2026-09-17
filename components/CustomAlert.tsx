import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { AlertCircle, AlertTriangle, Info, Trash2 } from 'lucide-react-native';
import { useAlertStore } from '@/store/useAlertStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ThemeColors, AppFonts } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

export default function CustomAlert() {
  const visible = useAlertStore((s) => s.visible);
  if (!visible) return null;
  return <CustomAlertModal />;
}

function CustomAlertModal() {
  const title = useAlertStore((s) => s.title);
  const message = useAlertStore((s) => s.message);
  const buttons = useAlertStore((s) => s.buttons);
  const hideAlert = useAlertStore((s) => s.hideAlert);
  const colors = useThemeColors();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const titleLower = title.toLowerCase();
  const isDelete =
    titleLower.includes('hapus') ||
    titleLower.includes('delete') ||
    buttons.some((b) => b.text.toLowerCase().includes('hapus') || b.text.toLowerCase().includes('delete'));
  const isError =
    titleLower.includes('error') ||
    titleLower.includes('gagal') ||
    titleLower.includes('failed');
  const hasDestructive = buttons.some((b) => b.style === 'destructive');
  const isCancelWorkout =
    titleLower.includes('batal') ||
    titleLower.includes('cancel') ||
    titleLower.includes('akhiri') ||
    titleLower.includes('keluar');

  return (
    <Modal transparent animationType="fade" visible={true} onRequestClose={hideAlert}>
      <TouchableWithoutFeedback onPress={hideAlert}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.alertBox}>
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isDelete || isError
                      ? 'rgba(239, 68, 68, 0.15)'
                      : hasDestructive || isCancelWorkout
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                  },
                ]}
              >
                {isDelete ? (
                  <Trash2 size={22} color={colors.danger} strokeWidth={2.4} />
                ) : isError ? (
                  <AlertCircle size={22} color={colors.danger} strokeWidth={2.4} />
                ) : hasDestructive || isCancelWorkout ? (
                  <AlertTriangle size={22} color={colors.primaryAction} strokeWidth={2.4} />
                ) : (
                  <Info size={22} color={colors.primaryAction} strokeWidth={2.4} />
                )}
              </View>

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
      padding: 22,
      width: '100%',
      maxWidth: 350,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 18,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    title: {
      color: c.textPrimary,
      fontFamily: AppFonts.bold,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    message: {
      color: c.textSecondary,
      fontFamily: AppFonts.medium,
      fontSize: 13,
      marginBottom: 20,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: 8,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
    },
    buttonContainerVertical: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    button: {
      paddingVertical: 13,
      paddingHorizontal: 16,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 80,
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
      backgroundColor: 'rgba(239, 68, 68, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.25)',
    },
    buttonCancel: {
      backgroundColor: c.elevatedSurface,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    buttonText: {
      fontFamily: AppFonts.bold,
      fontSize: 14,
      fontWeight: '700',
    },
    buttonTextPrimary: {
      color: '#000000',
      fontWeight: '800',
    },
    buttonTextDestructive: {
      color: c.danger,
      fontWeight: '800',
    },
    buttonTextCancel: {
      color: c.textSecondary,
      fontWeight: '700',
    },
  });

