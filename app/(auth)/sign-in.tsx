import React, { useState, useCallback } from 'react';
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
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSSO } from '@clerk/expo';
import { useSignIn } from '@clerk/expo/legacy';
import { useThemeColors } from '../../hooks/useThemeColors';
import { AppFonts, AppFontSize } from '../../constants/theme';
import { useAlertStore } from '../../store/useAlertStore';
import { useTranslation } from '../../hooks/useTranslation';
import { Mail, Lock, Eye, EyeOff, Dumbbell, Sparkles, ArrowRight, UserCheck } from 'lucide-react-native';

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { t } = useTranslation();
  const showAlert = useAlertStore((s) => s.showAlert);

  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignIn = async () => {
    if (!isLoaded || !signIn) return;
    if (!email.trim() || !password) {
      showAlert(t('warning'), t('auth_enter_email_pass'), [{ text: 'OK' }]);
      return;
    }

    setIsLoading(true);
    try {
      const signInAttempt = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (signInAttempt.status === 'complete') {
        if (setActive) {
          await setActive({ session: signInAttempt.createdSessionId });
        }
        router.replace('/(tabs)');
      } else {
        console.log('Clerk sign in status:', signInAttempt.status);
        showAlert(t('information'), t('auth_signin_further_steps'), [{ text: 'OK' }]);
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || t('auth_signin_failed_desc');
      showAlert(t('auth_signin_failed'), msg, [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (isGoogleLoading) return;
    setIsGoogleLoading(true);
    try {
      const redirectUrl = AuthSession.makeRedirectUri();
      const { createdSessionId, setActive: setSSOActive } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl,
      });

      if (createdSessionId && setSSOActive) {
        await setSSOActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      const msg = err?.errors?.[0]?.message || t('auth_google_error');
      showAlert('Google Sign-In', msg, [{ text: 'OK' }]);
    } finally {
      setIsGoogleLoading(false);
    }
  }, [startSSOFlow, isGoogleLoading, router, showAlert, t]);

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
            {t('auth_signin_subtitle')}
          </Text>
        </View>

        {/* Input Form Card */}
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.borderSubtle }]}>
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

          {/* Submit Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primaryAction }]}
            onPress={handleSignIn}
            disabled={isLoading || !isLoaded}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={styles.primaryBtnText}>{t('btn_signin')}</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>{t('or_divider')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.borderSubtle }]} />
          </View>

          {/* Google OAuth Button */}
          <TouchableOpacity
            style={[styles.socialBtn, { backgroundColor: colors.inputSurface, borderColor: colors.borderSubtle }]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={colors.textPrimary} size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Text style={[styles.socialBtnText, { color: colors.textPrimary }]}>{t('continue_google')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer Navigation Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.switchAuthBtn}
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.7}
          >
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('no_account')}{' '}
              <Text style={[styles.footerLink, { color: colors.primaryAction }]}>{t('signup_now')}</Text>
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
    maxWidth: 280,
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: AppFonts.medium,
    fontSize: 12,
  },
  socialBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontFamily: AppFonts.semiBold,
    fontSize: AppFontSize.body,
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
