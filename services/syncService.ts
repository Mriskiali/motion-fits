import { getTursoClient, initTursoTables, isTursoConfigured } from './turso';
import { useWorkoutStore, WorkoutSession, WorkoutTemplate, unloadWorkoutPartition } from '../store/useWorkoutStore';
import { useStepStore, unloadStepPartition } from '../store/useStepStore';
import { useUserStore, unloadUserPartition } from '../store/useUserStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncStatusResult {
  success: boolean;
  message?: string;
  syncedAt?: number;
}

let isSyncInProgress = false;
let hasPendingSync = false;
let userSyncDebounceTimer: any = null;

export const markPendingSync = () => {
  hasPendingSync = true;
};

export const getHasPendingSync = () => hasPendingSync;

/**
 * Triggers a non-blocking background user profile sync to Turso (debounced 500ms).
 * Safe to call on every settings change (language, theme, weeklyGoal, etc.).
 */
export const triggerBackgroundUserSync = (userId: string | null | undefined) => {
  if (!userId || !isTursoConfigured()) return;
  if (userSyncDebounceTimer) clearTimeout(userSyncDebounceTimer);
  userSyncDebounceTimer = setTimeout(() => {
    userSyncDebounceTimer = null;
    syncUserProfile(userId).catch(() => {
      markPendingSync();
    });
  }, 500);
};

const handleSyncError = (action: string, err: any) => {
  if (err?.message?.includes('401') || err?.status === 401) {
    console.warn(`[Sync] 401 Unauthorized (${action}). Token Turso di .env.local kedaluwarsa.`);
  } else {
    const errStr = String(err?.message || '').toLowerCase();
    const isNetwork =
      errStr.includes('network') ||
      errStr.includes('failed to fetch') ||
      errStr.includes('enotfound') ||
      errStr.includes('connection') ||
      errStr.includes('offline');
    if (isNetwork) {
      hasPendingSync = true;
      console.warn(`[Sync] Offline/Network error (${action}). Data tersimpan lokal, akan disinkron otomatis saat online.`);
    } else {
      console.error(`[Sync] Error ${action}:`, err);
    }
  }
};

/**
 * Checks if there is pending data from offline sessions and attempts full sync if online.
 */
export const checkAndRunPendingSync = async (userId: string | null | undefined): Promise<boolean> => {
  if (!userId || !isTursoConfigured() || isSyncInProgress) return false;
  try {
    const res = await performFullSync(userId);
    if (res.success) {
      hasPendingSync = false;
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Syncs user profile metadata to Turso
 */
export const syncUserProfile = async (
  userId: string,
  meta?: { email?: string; name?: string }
): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  const userState = useUserStore.getState();
  const userName = meta?.name || userState.name || 'Athlete';
  const userEmail = meta?.email || '';

  try {
    await client.execute({
      sql: `
        INSERT INTO users (id, email, name, weekly_goal, theme, language, streak, last_workout_date, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          email = CASE WHEN excluded.email != '' THEN excluded.email ELSE users.email END,
          name = CASE WHEN excluded.name != '' THEN excluded.name ELSE users.name END,
          weekly_goal = excluded.weekly_goal,
          theme = excluded.theme,
          language = excluded.language,
          streak = excluded.streak,
          last_workout_date = excluded.last_workout_date,
          updated_at = CURRENT_TIMESTAMP;
      `,
      args: [
        userId,
        userEmail,
        userName,
        userState.weeklyGoal || 3,
        userState.theme || 'system',
        userState.language || 'id',
        userState.streak || 0,
        userState.lastWorkoutDate || null,
      ],
    });
    return true;
  } catch (err) {
    handleSyncError('syncing user profile', err);
    return false;
  }
};

/**
 * Pushes a single completed workout session to Turso
 */
export const pushWorkoutSession = async (
  userId: string,
  session: WorkoutSession
): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  try {
    const workoutName = session.templateId || 'Workout Session';
    await client.execute({
      sql: `
        INSERT INTO workouts (id, user_id, name, date, duration, exercises, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          date = excluded.date,
          duration = excluded.duration,
          exercises = excluded.exercises,
          updated_at = CURRENT_TIMESTAMP;
      `,
      args: [
        session.id,
        userId,
        workoutName,
        session.date,
        session.duration,
        JSON.stringify(session.completedExercises || []),
      ],
    });
    return true;
  } catch (err) {
    handleSyncError('pushing workout session', err);
    return false;
  }
};

/**
 * Pushes a single created or updated workout template to Turso
 */
export const pushWorkoutTemplate = async (
  userId: string,
  template: WorkoutTemplate
): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  try {
    await client.execute({
      sql: `
        INSERT INTO workout_templates (id, user_id, title, category, exercises, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id, id) DO UPDATE SET
          title = excluded.title,
          category = excluded.category,
          exercises = excluded.exercises,
          updated_at = CURRENT_TIMESTAMP;
      `,
      args: [
        template.id,
        userId,
        template.name,
        template.subtitle || 'Custom',
        JSON.stringify(template.exercises || []),
      ],
    });
    return true;
  } catch (err) {
    handleSyncError('pushing workout template', err);
    return false;
  }
};

/**
 * Marks a workout template as deleted in Turso
 */
export const deleteWorkoutTemplateFromCloud = async (
  userId: string,
  templateId: string
): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  try {
    await client.execute({
      sql: `
        UPDATE workout_templates
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?;
      `,
      args: [templateId, userId],
    });
    useWorkoutStore.getState().clearDeletedTemplateId?.(templateId);
    return true;
  } catch (err) {
    handleSyncError('deleting workout template from cloud', err);
    return false;
  }
};

/**
 * Pushes all local workout sessions and templates to Turso
 */
export const pushAllLocalWorkouts = async (userId: string): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  const { sessions, templates } = useWorkoutStore.getState();

  try {
    const statements: any[] = [];

    // Sessions
    for (const s of sessions) {
      statements.push({
        sql: `
          INSERT INTO workouts (id, user_id, name, date, duration, exercises, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            date = excluded.date,
            duration = excluded.duration,
            exercises = excluded.exercises,
            updated_at = CURRENT_TIMESTAMP;
        `,
        args: [
          s.id,
          userId,
          s.templateId || 'Workout Session',
          s.date,
          s.duration,
          JSON.stringify(s.completedExercises || []),
        ],
      });
    }

    // Templates
    for (const t of templates) {
      statements.push({
        sql: `
          INSERT INTO workout_templates (id, user_id, title, category, exercises, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, id) DO UPDATE SET
            title = excluded.title,
            category = excluded.category,
            exercises = excluded.exercises,
            updated_at = CURRENT_TIMESTAMP;
        `,
        args: [
          t.id,
          userId,
          t.name,
          t.subtitle || 'Custom',
          JSON.stringify(t.exercises || []),
        ],
      });
    }

    if (statements.length > 0) {
      await client.batch(statements, 'write');
    }
    return true;
  } catch (err) {
    handleSyncError('pushing local workouts & templates', err);
    return false;
  }
};

/**
 * Pushes step history dictionary to Turso
 */
export const pushStepHistory = async (userId: string): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  const { stepHistory } = useStepStore.getState();
  const entries = Object.entries(stepHistory);
  if (entries.length === 0) return true;

  try {
    const statements = entries.map(([date, steps]) => ({
      sql: `
        INSERT INTO step_history (id, user_id, date, steps, synced_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          steps = excluded.steps,
          synced_at = CURRENT_TIMESTAMP;
      `,
      args: [`${userId}_${date}`, userId, date, steps],
    }));

    await client.batch(statements, 'write');
    return true;
  } catch (err) {
    handleSyncError('pushing step history', err);
    return false;
  }
};

/**
 * Safely saves the current user's local partition before signing out,
 * then cleanly switches active scope to 'guest' so no private data leaks on screen.
 */
export const clearLocalUserData = async (discardActiveSession: boolean = false): Promise<void> => {
  try {
    // Unload and securely persist all active user partitions
    await unloadWorkoutPartition(discardActiveSession);
    await unloadStepPartition();
    await unloadUserPartition();
    // Clear session-level sync keys
    await AsyncStorage.multiRemove(['lastActiveUserId', 'lastCloudSyncTime']);
    console.log('[Sync] Unloaded user partitions and cleared active session on sign-out.');
  } catch (err) {
    console.warn('[Sync] Error clearing local sync metadata:', err);
  }
};

/**
 * Pulls remote data from Turso and merges into local Zustand stores
 */
export const pullRemoteData = async (userId: string): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;

  try {
    // 1. Pull workouts for this specific user
    const workoutRes = await client.execute({
      sql: `SELECT id, name, date, duration, exercises FROM workouts WHERE user_id = ? AND deleted_at IS NULL ORDER BY date DESC`,
      args: [userId],
    });

    if (workoutRes.rows) {
      const remoteSessions: WorkoutSession[] = workoutRes.rows.map((row) => {
        const id = String(row.id);
        let completedExercises: any[] = [];
        try {
          completedExercises = JSON.parse(String(row.exercises || '[]'));
        } catch {}

        return {
          id,
          templateId: String(row.name || 'Workout Session'),
          date: String(row.date),
          duration: Number(row.duration) || 0,
          completedExercises,
        };
      });

      const currentSessions = useWorkoutStore.getState().sessions;
      const sessionMap = new Map<string, WorkoutSession>();

      // Remote sessions are the source of truth for this user account
      for (const s of remoteSessions) {
        sessionMap.set(s.id, s);
      }

      // Preserve any un-pushed local sessions if they aren't duplicates
      for (const s of currentSessions) {
        if (!sessionMap.has(s.id)) {
          sessionMap.set(s.id, s);
        }
      }

      const mergedSessions = Array.from(sessionMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      useWorkoutStore.setState({ sessions: mergedSessions });
    }

    // 2. Pull workout templates for this specific user
    const tmplRes = await client.execute({
      sql: `SELECT id, title, category, exercises FROM workout_templates WHERE user_id = ? AND deleted_at IS NULL`,
      args: [userId],
    });

    if (tmplRes.rows && tmplRes.rows.length > 0) {
      const remoteTemplates: WorkoutTemplate[] = tmplRes.rows.map((row) => {
        let exercises: any[] = [];
        try {
          exercises = JSON.parse(String(row.exercises || '[]'));
        } catch {}

        return {
          id: String(row.id),
          name: String(row.title),
          subtitle: String(row.category || ''),
          icon: 'dumbbell',
          color: '#F59E0B',
          defaultRestTime: 90,
          exercises,
        };
      });

      const currentTemplates = useWorkoutStore.getState().templates;
      const deletedTemplateIds = useWorkoutStore.getState().deletedTemplateIds || [];
      const templateMap = new Map<string, WorkoutTemplate>();

      // Remote templates from cloud (ignoring any locally deleted templates)
      for (const t of remoteTemplates) {
        if (!deletedTemplateIds.includes(t.id)) {
          templateMap.set(t.id, t);
        }
      }

      // Preserve local templates that haven't been pushed, but never include deleted ones
      for (const t of currentTemplates) {
        if (!templateMap.has(t.id) && !deletedTemplateIds.includes(t.id)) {
          templateMap.set(t.id, t);
        }
      }

      useWorkoutStore.setState({ templates: Array.from(templateMap.values()) });
    }

    // 3. Pull step history for this specific user
    const stepsRes = await client.execute({
      sql: `SELECT date, steps FROM step_history WHERE user_id = ?`,
      args: [userId],
    });

    if (stepsRes.rows) {
      const currentSteps = { ...useStepStore.getState().stepHistory };
      for (const row of stepsRes.rows) {
        const date = String(row.date);
        const steps = Number(row.steps) || 0;
        currentSteps[date] = Math.max(currentSteps[date] || 0, steps);
      }
      useStepStore.setState({ stepHistory: currentSteps });
    }

    // 4. Pull user metadata (weekly goal, streak, name)
    const userRes = await client.execute({
      sql: `SELECT name, weekly_goal, streak, last_workout_date FROM users WHERE id = ? LIMIT 1`,
      args: [userId],
    });

    if (userRes.rows && userRes.rows.length > 0) {
      const u = userRes.rows[0];
      const userState = useUserStore.getState();
      useUserStore.setState({
        name: String(u.name || userState.name || ''),
        weeklyGoal: Number(u.weekly_goal) || userState.weeklyGoal,
        streak: Number(u.streak) || userState.streak,
        lastWorkoutDate: u.last_workout_date ? String(u.last_workout_date) : userState.lastWorkoutDate,
      });
    }

    return true;
  } catch (err) {
    handleSyncError('pulling remote data', err);
    return false;
  }
};

/**
 * Performs a full two-way synchronization:
 * 1. Initializes tables on Turso if needed
 * 2. Syncs user profile
 * 3. Pushes local data (workouts, templates, steps) first so cloud gets latest local creations
 * 4. Pulls remote changes into local store (merging without deleting local data)
 */
export const performFullSync = async (
  userId: string,
  meta?: { email?: string; name?: string }
): Promise<SyncStatusResult> => {
  if (!isTursoConfigured()) {
    return {
      success: false,
      message: 'Turso database belum dikonfigurasi di .env.local',
    };
  }

  if (isSyncInProgress) {
    return { success: false, message: 'Sinkronisasi sedang berjalan...' };
  }

  isSyncInProgress = true;
  try {
    await initTursoTables();
    await syncUserProfile(userId, meta);

    // Sync any pending template deletions to cloud first!
    const pendingDeletes = useWorkoutStore.getState().deletedTemplateIds || [];
    for (const delId of pendingDeletes) {
      await deleteWorkoutTemplateFromCloud(userId, delId);
    }

    await pushAllLocalWorkouts(userId);
    await pushStepHistory(userId);
    await pullRemoteData(userId);

    const now = Date.now();
    hasPendingSync = false;
    return {
      success: true,
      message: 'Data berhasil disinkronkan ke cloud Turso.',
      syncedAt: now,
    };
  } catch (err: any) {
    handleSyncError('performing full sync', err);
    return {
      success: false,
      message: err?.message?.includes('401')
        ? 'Token autentikasi Turso kedaluwarsa. Silakan perbarui token di .env.local.'
        : err?.message || 'Gagal menyinkronkan data.',
    };
  } finally {
    isSyncInProgress = false;
  }
};
