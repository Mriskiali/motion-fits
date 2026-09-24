# MotionFit - Hybrid Sync Fix Plan

## 1. Konteks Arsitektur Hybrid DB

### 1.1 Store (Zustand + AsyncStorage)
- **`store/useWorkoutStore.ts`** — State: `templates`, `sessions`, `activeSession`, `scheduledWorkouts`, `deletedTemplateIds`.
  - Subscriber otomatis menulis seluruh state ke `AsyncStorage` key `workout_partition_${userId}`.
  - Fungsi partisi: `loadWorkoutPartition(userId)` (migrasi legacy juga), `unloadWorkoutPartition(discardActiveSession?)`.
  - Kunci: `logSession`, `deleteSession` (soft di local, tapi tidak soft delete di cloud), `deleteTemplate` (push `deleted_at` ke cloud di `performFullSync`).

- **`store/useUserStore.ts`** — State profil: `name`, `weeklyGoal`, `streak`, `lastWorkoutDate`, `theme`, `language`, audio/notifications.
  - Subscriber menulis ke `user_partition_${userId}`.
  - Fungsi: `loadUserPartition`, `unloadUserPartition`.
  - Kunci: `recalculateStreak` dipanggil dari `deleteSession`.

- **`store/useStepStore.ts`** — State langkah: `todaySteps`, `stepHistory`, `dailyStepGoal`, `lastSyncTime`.
  - Subscriber menulis ke `step_partition_${userId}`.
  - Kunci: `syncSteps` (fetch dari Health Connect), `fetchHistory`, `recordDailyStep`.
  - `recordDailyStep` hanya update local; **tidak ada push ke Turso**.

### 1.2 Services
- **`services/turso.ts`**:
  - Singleton client `@libsql/client/web`.
  - `isTursoConfigured()` memeriksa URL, token, dan **token expiry via JWT decode**.
  - `getTursoClient()` mengembalikan `null` jika tidak configured/expired.
  - `initTursoTables()` membuat semua tabel/index jika belum ada.

- **`services/syncService.ts`**:
  - `performFullSync(userId)` — urutan: init tables → sync user profile → delete pending templates → push all local workouts/steps → pull remote.
  - `push*` — single ops: `pushWorkoutSession`, `pushWorkoutTemplate`, `pushStepHistory`.
  - `pullRemoteData(userId)` — merge remote ke local; remote = source of truth.
  - `checkAndRunPendingSync(userId)` — cek `hasPendingSync`, retry. `markPendingSync` untuk menandai gagal.

### 1.3 Integrasi di App Lifecycle
- **`app/_layout.tsx` (`handleAuthTransition`)**:
  - On sign-in: load partitions → `performFullSync` (fire-and-forget).
  - On sign-out: `unload*` partitions → clear AsyncStorage keys.
  - AppState listener: `checkAndRunPendingSync` saat foreground.

- **`app/(tabs)/settings.tsx`**:
  - `handleManualCloudSync` → `performFullSync`. `handleSignOut` → `clearLocalUserData` → `signOut`.

- **`app/workout/active.tsx`** (`handleFinishWorkout`):
  - `logSession` (ke store/local) → `pushWorkoutSession` (ke cloud, fire-and-forget). `triggerBackgroundUserSync` untuk streak/name update.

- **`app/workout/create.tsx`** (`handleSave`):
  - `addTemplate`/`updateTemplate` (ke store/local) → `pushWorkoutTemplate` (ke cloud, fire-and-forget).

---

## 2. Skema Sync (Urutan Eksekusi)

### 2.1 Full Sync (`performFullSync`)
1. `initTursoTables`
2. `syncUserProfile` (upsert users)
3. Loop `deletedTemplateIds` → `deleteWorkoutTemplateFromCloud` (UPDATE deleted_at)
4. `pushAllLocalWorkouts` (upsert sessions + templates)
5. `pushStepHistory` (upsert step_history)
6. `pullRemoteData` (merge ke store, remote = truth)

### 2.2 Conflict Resolution (saat ini)
- Local yang tidak ada `id`-nya di remote dipertahatkan (`sessionMap.set(s.id, s)`).
- Local templates tidak dihapus oleh remote (dikecualikan via `deletedTemplateIds`).
- Remote `step_history` values digabung dengan `Math.max` local values.

---

## 3. Daftar Isu & Solusi

### I1. Race Condition on Logout — `settings.tsx:165-170` vs `_layout.tsx:158-162`
**Masalah:** `clearLocalUserData` dipanggil dari dua tempat (settings `handleSignOut` dan `_layout` auth transition), sekaligus `unload*` juga dipanggil di `_layout`.
- Bisa menyebabkan partisi tidak selesai ditulis sebelum di-unload lagi oleh listener lain.
- `_layout` listener tidak membedakan "user-initiated signout" vs "session expired/removed", sehingga bisa double-clear.

**Solusi (P0):**
- Pusatkan semua logika sign-out di satu fungsi. Hapus pemanggilan `unload*` langsung di `_layout`. Biarkan `_layout` hanya menangani sync on resume dan `clearLocalUserData` (yang sudah memanggil semua `unload*` secara berurutan).
- Di `settings.tsx`, hapus pemanggilan manual `unload*`, cukup panggil `clearLocalUserData`.
- Pastikan `clearLocalUserData` adalah satu-satunya entry point untuk logout.

**Kode yang perlu diubah:**
- **settings.tsx** (hapus baris 168-169 manual unload sebelum `clearLocalUserData(false)` dan `clearLocalUserData(true)`):
```ts
// HAPUS:
await clearLocalUserData(true); // sudah memanggil unloadWorkoutPartition di dalamnya
```

- **_layout.tsx** — simpan flag agar auth transition tidak double-fire:
```ts
const isManualSigningOut = useRef(false);
// Di signOut handler, set isManualSigningOut.current = true
// Pada auth transition, cek flag.
```

---

### I2. Delete Session Tidak Sync ke Cloud — `history.tsx:200-201`
**Masalah:** `deleteSession(id)` hanya menghapus di local store saja. Tidak ada soft-delete (set `deleted_at`) ke Turso.
- Saat user login kembali / pindah device, workout yang dihapus akan kembali muncul dari cloud (karena `pullRemoteData` tidak filter `deleted_at` untuk `workouts`).

**Solusi (P0):**
1. Tambahkan `deleted_at DATETIME` handling: ubah `deleteSession` di store atau buat fungsi baru di syncService untuk soft-delete session ke cloud.
2. `pullRemoteData` query workouts harus filter `WHERE deleted_at IS NULL` (sudah ada, cek:1).

**Kode yang perlu ditambah:**
- **`syncService.ts`** — tambahkan:
```ts
export const deleteWorkoutSessionFromCloud = async (
  userId: string, sessionId: string
): Promise<boolean> => {
  const client = getTursoClient();
  if (!client) return false;
  try {
    await client.execute({
      sql: `UPDATE workouts SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
      args: [sessionId, userId],
    });
    return true;
  } catch (err) {
    handleSyncError('deleting workout session from cloud', err);
    return false;
  }
};
```
- **`history.tsx`** (`handleDelete` callback), setelah `deleteSession(id)`:
```ts
import { deleteWorkoutSessionFromCloud, markPendingSync } from '@/services/syncService';
// ...
onPress: () => {
  deleteSession(id);
  if (userId) {
    deleteWorkoutSessionFromCloud(userId, id).catch(() => {
      markPendingSync();
    });
  }
}
```

---

### I3. Token Expiry Check Timing — `turso.ts:57-59`
**Masalahan:** `isTursoConfigured()` memeriksa expiry sekali di awal. Jika `getTursoClient()` sudah menghasilkan `clientInstance`, maka client yang sama digunakan di seluruh calls — tetapi tidak ada re-check expiry setelah itu.
- Jika token expired, client yang lama akan memberi 401. `handleSyncError` men-set `hasPendingSync`, tetapi tidak me-reset `clientInstance`.

**Solusi (P1):**
- Reset `clientInstance = null` setelah token expired terdeteksi, sehingga `getTursoClient` akan mencoba lagi (dan gagal karena not configured, lalu fallback ke local).
- Letakkan pemeriksaan expiry di dalam `getTursoClient` (setelah singleton logic).

**Kode perubahan di `turso.ts`:**
```ts
export const getTursoClient = (): Client | null => {
  if (!isTursoConfigured()) {
    if (clientInstance) {
      clientInstance = null;
    }
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient({ url: url!, authToken: authToken! });
  }
  return clientInstance;
};
```

---

### I4. Step History Tidak Sync Saat `recordDailyStep` — `useStepStore.ts:175-182`
**Masalah:** `recordDailyStep` dan `setTodayStepsManual` tidak trigger sync ke cloud.
- Manual step entries tidak akan pernah turun ke Turso kecuali `performFullSync` berjalan.
- `syncSteps` dipanggil otomatis hanya bila `isConnected` (Health Connect).

**Solusi (P1):**
- Di `useStepStore.ts` (atau file terpisah `hooks/useStepSync`), setelah `recordDailyStep`/`setTodayStepsManual`, trigger `markPendingSync()` jika terhubung ke cloud.

**Kode tambahan di store atau wrapper:**
```ts
import { markPendingSync } from '@/services/syncService';

recordDailyStep: (dateStr, steps) => {
  set((state) => ({
    stepHistory: { ...state.stepHistory, [dateStr]: steps },
  }));
  if (isTursoConfigured()) {
    markPendingSync();
  }
},
```

---

### I5. Auto-Sync Template/Session Tidak Ada Retry — `create.tsx:398-406`, `active.tsx:405-407`
**Masalahan:** `pushWorkoutSession` / `pushWorkoutTemplate` dipanggil sebagai fire-and-forget.
- Jika gagal (offline / 401), tidak ada retry otomatis sampai `performFullSync` berikutnya (bisa jauh kem later).

**Solusi (P2):**
- Tambahkan flag `markPendingSync()` di catch block, supaya `checkAndRunPendingSync` (yang sudah ada di background) men-trigger ulang.
- Tambahkan retry logic sederhana (misal, 1 retry dengan delay) untuk push single ops.

**Contoh modifikasi pada `active.tsx`:**
```ts
if (userId) {
  pushWorkoutSession(userId, sessionToLog).catch((err) => {
    console.warn('[AutoSync] Failed to push completed workout:', err);
    markPendingSync();
  });
}
```

---

### I6. Conflict Resolution Lemah — `syncService.ts:344-477` (pullRemoteData)
**Masalahan:** Push local dulu, baru pull remote. Jika local push gagal, maka pull akan overwrite local dengan remote yang tidak mengandung pending local changes.

**Solusi (P0):**
- Di `performFullSync`, pastikan `pushAllLocalWorkouts` + `pushStepHistory` **return false** akan menghentikan alur dan tidak melanjutkan ke `pullRemoteData`.
- Tambahkan logika untuk merge lokal yang belum terpush sebelum pull (misal, tandai dirty flag di store).

**Kode perubahan di `performFullSync`:**
```ts
const pushOk = await pushAllLocalWorkouts(userId);
const stepOk = await pushStepHistory(userId);

if (!pushOk || !stepOk) {
  return { success: false, message: 'Gagal push local data. Sync dibatalkan.' };
}

await pullRemoteData(userId); // hanya dilanjutkan bila push berhasil
```

---

### I7. Schema Migration Versioning — turso.ts:83-151
**Masalah:** `initTursoTables()` hanya pakai `CREATE TABLE IF NOT EXISTS`, tanpa tracking versi schema.
- Bila schema berubah (kolom baru), tidak ada otomatisasi migrasi ALTER table.

**Solusi (P2):**
- Buat tabel `schema_migrations` dengan kolom `version`, `applied_at`.
- Tambahkan fungsi `applyMigrations()` yang membandingkan versi, dan menambahkan kolom/index baru via ALTER TABLE bila belum ada.
- Panggil `applyMigrations()` sebelum `initTursoTables` di `performFullSync`.

**Contoh skeleton:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP);
```
```ts
const MIGRATIONS = {
  1: `ALTER TABLE workouts ADD COLUMN notes TEXT;`,
  // ...
};
```

---

## 4. Urutan Prioritas Fix

| Prior. | Isu | Alasan |
|--------|-----|--------|
| **P0** | I1: Race condition logout | Bisa menyebabkan crash / data korup saat logout. |
| **P0** | I2: Delete session tidak sync | Data loss cloud — workout yang dihapus user akan kembali muncul. |
| **P0** | I6: Conflict resolution lemah | Bisa kehilangan pending local changes saat offline → online. |
| **P1** | I3: Token check timing | Token expired tidak diproteksi secara dinamis. |
| **P1** | I4: Step history tidak sync | Data langkah manual tidak pernah turun ke cloud. |
| **P2** | I5: Auto-sync tanpa retry | Data bisa tertahan lama di local tanpa sync. |
| **P2** | I7: Schema migration versioning | Penting untuk evolusi jangka panjang. |

---

## 5. Catatan Implementasi / Pendekatan Fix per Isu

### Pendekatan Umum
1. Semua perubahan harus tetap kompatibel dengan offline mode (local-first).
2. Sertakan try/catch + `markPendingSync()` bila sync gagal.
3. Gunakan `fire-and-forget` untuk sync UI tidak-blocking, tapi pekerjakan retry via `checkAndRunPendingSync` interval (30 detik, sudah ada di `_layout.tsx`).
4. Hindari mem-blok UI saat full sync berlangsung di background.

### Catatan Tambahan
- `triggerBackgroundUserSync` sudah ada untuk profil saja (debounced 500ms) — tidak ada versi untuk sessions/steps. Boleh pertimbangkan `triggerBackgroundWorkoutSync`/`triggerBackgroundStepSync` jika perlu push real-time.
- `clearLocalUserData` sudah meng-handle penyimpanan partisi + remove keys `lastActiveUserId` dan `lastCloudSyncTime`.

---

## 6. Referensi File

| File | Peran |
|------|-------|
| `store/useWorkoutStore.ts` | State workout, subscriber AsyncStorage |
| `store/useUserStore.ts` | State profil, subscriber AsyncStorage |
| `store/useStepStore.ts` | State langkah, subscriber AsyncStorage |
| `services/syncService.ts` | Push/pull data ke Turso |
| `services/turso.ts` | Client Turso, token check |
| `app/_layout.tsx` | Auth lifecycle, sync trigger |
| `app/(tabs)/settings.tsx` | Sign out, manual sync |
| `app/(tabs)/history.tsx` | Delete session/ui |
| `app/workout/create.tsx` | Create template |
| `app/workout/active.tsx` | Log session |
| `utils/healthConnect.ts` | Langkah via Health Connect |
