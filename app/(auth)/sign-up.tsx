import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSignUp } from '@clerk/expo/legacy';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AppFonts, AppFontSize } from '../../constants/theme';
import { useAlertStore } from '../../store/useAlertStore';
import { useUserStore } from '../../store/useUserStore';
import { useTranslation } from '../../hooks/useTranslation';
import { syncUserProfile } from '../../services/syncService';
import { Mail, Lock, User, Eye, EyeOff, Dumbbell, Sparkles, ArrowRight, KeyRound, ChevronLeft, UserCheck } from 'lucide-react-native';

export default function SignUpScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { t } = useTranslation();
  const showAlert = useAlertStore((s) => s.showAlert);
  const setNameLocal = useUserStore((s) => s.setName);

  const { signUp, setActive, isLoaded } = useSignUp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Submit user registration
  const handleSignUp = async () => {
    if (!isLoaded || !signUp) return;
    if (!name.trim()) {
      showAlert(t('warning'), t('auth_enter_name'), [{ text: 'OK' }]);
      return;
    }
    if (!email.trim() || !password) {
      showAlert(t('warning'), t('auth_enter_email_pass_complete'), [{ text: 'OK' }]);
      return;
    }
    if (password.length < 8) {
      showAlert(t('warning'), t('auth_pass_min_length'), [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    try {
      await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: name.trim(),
      });

      // Send verification code to email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
      showAlert(
        t('auth_code_sent'),
        t('auth_code_sent_desc').replace('{email}', email.trim()),
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      console.error('Sign up error:', err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || t('auth_signup_failed');
      showAlert(t('auth_signup_failed'), msg, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify email code
  const handleVerifyCode = async () => {
    if (!isLoaded || !signUp || !verificationCode.trim()) {
      showAlert(t('warning'), t('auth_enter_verify_code'), [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        if (setActive) {
          await setActive({ session: completeSignUp.createdSessionId });
        }

        // Save name locally & sync user to cloud
        setNameLocal(name.trim());
        if (completeSignUp.createdUserId) {
          syncUserProfile(completeSignUp.createdUserId, {
            email: email.trim(),
            name: name.trim(),
          }).catch(() => {});
        }

        showAlert(
          t('auth_account_created'),
          t('auth_welcome_msg'),
          [
            {
              text: t('auth_start_workout'),
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        console.log('Clerk verification status:', completeSignUp.status);
        showAlert(t('auth_verify_incomplete'), 'Status verifikasi: ' + completeSignUp.status, [{ text: 'OK' }]);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || t('auth_invalid_code');
      showAlert(t('auth_verify_failed'), msg, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {pendingVerification
              ? t('auth_verify_subtitle')
              : t('auth_signup_subtitle')}
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.borderSubtle }]}>
          {!pendingVerification ? (
            <>
              {/* Name Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('full_name')}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputSurface, borderColor: colors.borderSubtle }]}>
                  <User size={18} color={colors.textMuted} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder={t('full_name_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputSurface, borderColor: colors.borderSubtle }]}>
                  <Mail size={18} color={colors.textMuted} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="example@email.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('password_min')}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputSurface, borderColor: colors.borderSubtle }]}>
                  <Lock size={18} color={colors.textMuted} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="*******"
                    placeholderTextColor={colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textMuted} />
                    ) : (
                      <Eye size={18} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Registration Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primaryAction }]}
                onPress={handleSignUp}
                disabled={isLoading || !isLoaded}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnRow}>
                    <Text style={styles.primaryBtnText}>{t('btn_signup_continue')}</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Verification Code Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('email_verification_code')}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputSurface, borderColor: colors.borderSubtle }]}>
                  <KeyRound size={18} color={colors.textMuted} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary, letterSpacing: 4, fontFamily: AppFonts.bold }]}
                    placeholder="123456"
                    placeholderTextColor={colors.textMuted}
                    value={verificationCode}
                    onChangeText={setVerificationCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primaryAction }]}
                onPress={handleVerifyCode}
                disabled={isLoading || !isLoaded}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <View style={styles.btnRow}>
                    <Text style={styles.primaryBtnText}>{t('btn_verify_confirm')}</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backStepBtn}
                onPress={() => setPendingVerification(false)}
                activeOpacity={0.7}
              >
                <ChevronLeft size={16} color={colors.textSecondary} />
                <Text style={[styles.backStepText, { color: colors.textSecondary }]}>{t('change_email_password')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.switchAuthBtn}
            onPress={() => router.push('/(auth)/sign-in')}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('have_account')}{' '}
              <Text style={[styles.footerLink, { color: colors.primaryAction }]}>{t('signin_here')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  appLogo: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 18,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  brandTitle: {
    fontFamily: AppFonts.black,
    fontSize: 26,
    letterSpacing: 1.2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 6,
  },
  badgeText: {
    fontFamily: AppFonts.bold,
    fontSize: 10,
    color: '#F59E0B',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontFamily: AppFonts.regular,
    fontSize: AppFontSize.caption,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 18,
  },
  card: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: AppFonts.medium,
    fontSize: AppFontSize.caption,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: AppFonts.regular,
    fontSize: AppFontSize.body,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: AppFonts.bold,
    fontSize: AppFontSize.body,
    color: '#FFFFFF',
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    padding: 6,
  },
  backStepText: {
    fontFamily: AppFonts.medium,
    fontSize: AppFontSize.caption,
  },
  footer: {
    alignItems: 'center',
    gap: 14,
  },
  switchAuthBtn: {
    padding: 6,
  },
  footerText: {
    fontFamily: AppFonts.regular,
    fontSize: AppFontSize.caption,
  },
  footerLink: {
    fontFamily: AppFonts.bold,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  guestBtnText: {
    fontFamily: AppFonts.medium,
    fontSize: 12,
  },
});
