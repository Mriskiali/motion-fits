
import React from "react";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { useTheme } from "@react-navigation/native";
import { colors } from "@/styles/commonStyles";
import { Stack } from "expo-router";

export default function ProfileScreen() {
  const theme = useTheme();

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
            <Text style={styles.sectionTitle}>Settings</Text>
            <View style={styles.settingCard}>
              <IconSymbol name="bell.fill" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <View style={styles.settingCard}>
              <IconSymbol name="chart.bar.fill" size={20} color={colors.primary} />
              <Text style={styles.settingText}>Progress Reports</Text>
            </View>
            <View style={styles.settingCard}>
              <IconSymbol name="gear" size={20} color={colors.primary} />
              <Text style={styles.settingText}>App Settings</Text>
            </View>
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
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: 12,
  },
});
