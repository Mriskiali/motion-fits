import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface OnboardingModalProps {
  visible: boolean;
  onStartTour: () => void;
  onSkipTour: () => void;
}

export default function OnboardingModal({
  visible,
  onStartTour,
  onSkipTour,
}: OnboardingModalProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();
  const isDark = colors.background === '#0B0C0E';

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardSurface,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Mascot Image */}
            <View style={styles.imageContainer}>
              <View
                style={[
                  styles.imageAmbientGlow,
                  { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.08)' },
                ]}
              />
              <Image
                source={require('@/assets/images/onboarding.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>

            {/* Pill Header */}
            <View
              style={[
                styles.welcomeBadge,
                { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' },
              ]}
            >
              <Text style={[styles.welcomeBadgeText, { color: colors.primaryAction }]}>
                {t('onboarding_welcome_badge') || 'PANDUAN INTERAKTIF'}
              </Text>
            </View>

            {/* Title & Description */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('onboarding_welcome_title') || 'Selamat Datang di MotionFit!'}
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {t('onboarding_welcome_desc') ||
                'Yuk ikuti tur praktek singkat ini untuk mencoba langsung cara memulai latihan, mencatat repetisi, dan timer istirahat otomatis.'}
            </Text>

            {/* Practical feature highlight rows */}
            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                  <Ionicons name="play" size={16} color={colors.primaryAction} />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {t('onboarding_feature_1') || 'Mulai sesi latihan secara langsung'}
                </Text>
              </View>

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.12)' }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {t('onboarding_feature_2') || 'Centang set setelah selesai repetisi'}
                </Text>
              </View>

              <View style={styles.featureRow}>
                <View style={[styles.featureIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                  <Ionicons name="timer" size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  {t('onboarding_feature_3') || 'Timer istirahat otomatis menghitung'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primaryAction }]}
              onPress={onStartTour}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>
                {t('onboarding_start_cta') || 'Mulai Praktek Latihan 🚀'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkipTour}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
                {t('skip') || 'Lewati Tutorial'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  imageContainer: {
    width: 220,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  imageAmbientGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  welcomeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginBottom: 12,
  },
  welcomeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
