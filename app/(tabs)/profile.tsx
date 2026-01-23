
import React, { useState, useEffect } from "react";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Platform, Switch } from "react-native";
import { useTheme, useColorScheme } from "@react-navigation/native";
import { colors } from "@/styles/commonStyles";
import { Stack } from "expo-router";
import { useThemeContext } from "@/contexts/ThemeContext";
import { showSuccessToast, showErrorToast } from '@/utils/notifications';

export default function ProfileScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const { colorScheme: appColorScheme, toggleColorScheme } = useThemeContext();
  const [isDarkMode, setIsDarkMode] = useState(appColorScheme === 'dark');

  useEffect(() => {
    setIsDarkMode(appColorScheme === 'dark');
  }, [appColorScheme]);

  return (
    <>
      {Platform.OS === 'ios' && (
        <Stack.Screen
          options={{
            title: "Profile",
          }}
        />
      )}
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS !== 'ios' && styles.scrollContentWithTabBar
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <IconSymbol name="person.fill" size={60} color={colors.card} />
            </View>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john.doe@example.com</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fitness Stats</Text>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>68 kg</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>175 cm</Text>
                <Text style={styles.statLabel}>Height</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>22.2</Text>
                <Text style={styles.statLabel}>BMI</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { backgroundColor: colors.accent }]}>
                <IconSymbol name="trophy.fill" size={24} color={colors.card} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>7 Day Streak</Text>
                <Text style={styles.achievementSubtitle}>Keep up the great work!</Text>
              </View>
            </View>
            <View style={styles.achievementCard}>
              <View style={[styles.achievementIcon, { backgroundColor: colors.secondary }]}>
                <IconSymbol name="star.fill" size={24} color={colors.card} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>100 Workouts</Text>
                <Text style={styles.achievementSubtitle}>Milestone achieved!</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goals Progress</Text>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Weekly Goal</Text>
                <Text style={styles.progressValue}>4/7</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: '57%' }]} />
              </View>
              <Text style={styles.progressText}>2 workouts remaining</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.settingCard}>
              <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <View style={styles.settingCard}>
              <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Progress Reports</Text>
            </View>
            <View style={styles.settingCardWithSwitch}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconSymbol name="paintbrush" size={20} color={colors.primary} />
                <Text style={styles.settingText}>Theme</Text>
              </View>
              <Switch
                trackColor={{ false: "#767577", true: colors.primary }}
                thumbColor={isDarkMode ? colors.card : "#f4f3f4"}
                ios_backgroundColor="#3e3e3e"
                onValueChange={toggleColorScheme}
                value={isDarkMode}
              />
            </View>
            <View style={styles.settingCard}>
              <IconSymbol name="gear" size={20} color={colors.primary} />
              <Text style={styles.settingText}>App Settings</Text>
            </View>
          </View>

          {/* Motivational Section */}
          <View style={styles.motivationalSection}>
            <Text style={styles.motivationalTitle}>Keep Going!</Text>
            <Text style={styles.motivationalSubtitle}>Consistency is key to achieving your fitness goals</Text>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>View Workout Plan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  scrollContentWithTabBar: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  achievementSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  settingCardWithSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12,
  },
  // Progress section
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Motivational section
  motivationalSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  motivationalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  motivationalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: colors.card,
    fontWeight: '600',
    fontSize: 14,
  },
});
