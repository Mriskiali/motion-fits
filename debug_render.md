# MotionFit — Debug & Fix Render Performance Plan

> Status: FASE 1, 2, 4 selesai (2026-09-24).
> Konteks: delay 1–5 detik saat ganti bahasa/tema berkurang signifikan.
> Dokumen ini berisi hasil analisis log profiler + rencana perbaikan bertahap.

---

## 1. Ringkasan Gejala

Dari laporan user:
- Ganti bahasa/tema di Settings → delay besar (1–5 detik).
- Pindah antar tab → delay besar.
- Login sudah lebih baik (delay turun), logout hampir instan. → Perbaikan auth flap **berhasil**.

## 2. Data Log Profiler (terbaru)

Diambil dari `useRenderProfiler` (`hooks/useRenderProfiler.ts`).

| Screen | First mount | Re-render biasa | Jumlah render |
|---|---|---|---|
| **DashboardScreen** | 3735ms → **2156ms** | 95–413ms | 1–4x / window |
| **SettingsScreen** | **858ms** | 234–773ms | 1–2x (sering) |
| **HistoryScreen** | **981ms** | **289–1177ms** ❗ | 1–2x |
| **WorkoutScreen** | **296ms** | 106–227ms | 3x |

### Kesimpulan dari data
1. Fix O(n²) sebelumnya **berhasil menurunkan** Dashboard mount 3.7s → 2.1s (−42%).
2. **Bukan render storm** — jumlah render rendah (1–4x). Masalahnya adalah **satu render individu yang sangat berat**.
3. `HistoryScreen` re-render mencapai **1177ms** = ada pekerjaan berat yang jalan **setiap render/commit**.
4. `SettingsScreen` hampir selalu 234–773ms saat di-render → komponen besar + re-render sering.

> Catatan: ini dev build (Metro, non-Hermes-optimized, debug). Production biasanya 3–5x lebih cepat. Tapi optimasi tetap wajib karena basisnya memang berat.

---

## 3. Akar Masalah (Root Causes)

### RC-1: Loop O(n) / O(n²) dengan `date-fns format()` yang mahal
`format()` dari date-fns adalah operasi string-parsing yang mahal. Banyak tempat memanggilnya **di dalam loop bersarang** atau **di dalam `.map()`/`.some()`/`.filter()`**.

**Titik yang sudah diperbaiki (sesi sebelumnya):**
- `app/(tabs)/index.tsx` — weekly strip: `sessions.some(s => format(...))` per hari → diganti `completedSessionDates` (Set, memoized).
- `app/(tabs)/history.tsx` — calendar grid: idem → diganti `sessionDateSet`.
- `app/(tabs)/workout.tsx` — weekly strip: idem → diganti `sessionDateSet`.

**Titik yang MASIH bermasalah (belum diperbaiki):**
- `app/(tabs)/history.tsx`:
  - `chartData` (line ~233): `last7Days.map` × `sessions.filter(format)` → 7 × N `format`.
  - `stepYearlyData` (line ~312): **loop 365 iterasi** × `format(d, 'yyyy-MM-dd')` → 365 `format` setiap `todaySteps` berubah ATAU tema berubah.
  - `barChartWeeks/barChartMonths` (line ~370): loop ~365 × beberapa `format` → ratusan `format`.
  - `selectedDaySessions` (line ~489): `sessions.filter(format)`.
  - `templateSessionCounts`, `filteredLogsSessions` (search): `format` di dalam filter.

### RC-2: `useMemo` yang depend pada `colors`/`styles`
`stepYearlyData` (line 367) depend pada `[..., colors.surfaceHighlight, colors.warning, colors.successBadge, colors.danger]`.
→ **Setiap ganti tema memaksa recompute loop 365 iterasi + rebuild objek.**

`listHeaderComponent` (line ~1063) depend pada `[..., colors, styles, t]` → ganti tema me-rebuild **seluruh header JSX besar**.

### RC-3: Komponen raksasa tanpa pemecahan (monolithic components)
- `history.tsx` = **2780 baris** dalam satu komponen.
- `settings.tsx` = **1669 baris**.
- `index.tsx` = **1220 baris**.
- `workout.tsx` = **1040 baris**.

Ketika re-render, React harus evaluasi ulang **semua** `React.createElement` (ratusan elemen + puluhan `lucide` icon yang tiap ikon = komponen `<Svg>` + beberapa `<Path>`).

### RC-4: `useTranslation().t` dan `useUser()` (Clerk) sebagai pemicu re-render
- `useTranslation` sudah distabilkan (`useCallback([language])`) — OK.
- `useUser()` (Clerk) di Dashboard & Settings mengembalikan object `user` baru → bisa memicu re-render tambahan.
- `getGreeting()` / `format(...)` dipanggil langsung di body render (bukan memo).

### RC-5: Store update berantai memicu beberapa render berturut-turut (dev)
- `checkStatus()` → `set(availability)` → `syncSteps()` → `set(todaySteps)` → `fetchHistory()` → `set(stepHistory)` = 3 render berturut-turut.
- Tiap render = 100–400ms karena RC-1 & RC-3.

### RC-6: Overhead profiler sendiri (dev, sementara)
`useRenderProfiler` jalan `useEffect` tanpa deps **setiap render** → menambah sedikit overhead (hanya di `__DEV__`). Akan dihapus/dinonaktifkan setelah investigasi selesai.

---

## 4. Rencana Perbaikan (bertahap, low-risk dulu)

### FASE 1 — Precompute `format` yang mahal (LOW RISK, HIGH IMPACT) ✅ SELESAI

- [x] **1.1 `history.tsx` → `chartData`**: buat `sessionDateSet` (sudah ada) dan pakai `sessionDateSet.has(dateStr)` daripada `sessions.filter(format).length`.
- [x] **1.2 `history.tsx` → `stepYearlyData`**: precompute array `dateKey` untuk 365 hari **sekali** (`useMemo` deps kosong / per-tanggal), pisahkan dari data step. Warna (`bgColor`) dihitung saat render/inline, **jangan** jadikan `colors.*` sebagai dependency loop. Target: loop 365 tidak lagi jalan saat ganti tema.
- [x] **1.3 `history.tsx` → `barChartWeeks/barChartMonths`**: kurangi `format` yang berulang; cache label dari `stepYearlyData`.
- [x] **1.4 `history.tsx` → `selectedDaySessions`**: pakai `sessionDateSet`/map date→sessions yang di-precompute.
- [x] **1.5 `index.tsx` & `workout.tsx`**: audit sisa `format(new Date(...))` di body render; pastikan semua di dalam `useMemo` dengan deps minimal.
- [x] **1.6 Buat util bersama** `utils/dateKey.ts` → `toDateKey(date)` dan `buildSessionDateMap(sessions)` agar konsisten di semua screen.

**Hasil:** `chartData` menggunakan `sessionDateSet`, `stepYearlyData` split jadi `stepYearlyBase` (365 dates, once) + overlay (map steps data), `selectedDaySessions` format 1x per session. `todayDateStr`, `formattedSelectedDate`, `greeting` di-memoize.

**Update 2026-09-24 16:38:** Split `stepYearlyData` → `stepYearlyBase` (365 iter once, deps `[]`) + `stepYearlyData` (map overlay, deps `[stepYearlyBase, stepHistory, todaySteps, dailyStepGoal]`). Target: step update tidak rebuild 365 Date objects.

**Update 2026-09-24 16:48:** Lazy-load Steps tab: `barChartWeeks`, `barChartMonths`, `stepPeriodStats` hanya compute saat `activeTab === 'steps'`. Early return empty jika tab lain. Target: Overview/Logs mount tidak bayar cost Steps computation.

**Update 2026-09-24 16:56:** Lazy-load `stepYearlyData` itself: return `[]` jika `activeTab !== 'steps'`. 365-item `.map()` sekarang skip di Overview/Logs tab. Target: HistoryScreen mount pada Overview/Logs < 300ms.

**Update 2026-09-24 17:00:** Lazy-render `stepActivityComponent`: return `null` jika `activeTab !== 'steps'`, skip entire JSX tree build. Target: Overview/Logs render tanpa Steps UI overhead.

### FASE 2 — Pisahkan memo dari dependency `colors` yang tidak perlu (LOW–MEDIUM RISK) ✅ SELESAI

- [x] **2.1** `stepYearlyData`: keluarkan `colors.*` dari dependency. Simpan data murni (steps, percent, isGoalMet). Pilih warna (`bgColor`) di langkah render berdasarkan `colors` — atau simpan "kategori" (met/target/miss) dan map ke warna saat render.
- [x] **2.2** `calendarComponent`, `barChartComponent`, `stepActivityComponent`, `stepInspectionCardComponent`: pastikan deps hanya data yang benar-benar berubah; `colors` memang perlu untuk warna, tapi **data harian** tidak boleh ikut recompute.
- [x] **2.3** Audit semua `useMemo` di `history.tsx` yang depend `[..., colors, styles, ...]` → pindahkan perhitungan data ke memo terpisah dari JSX.

**Hasil:** `stepYearlyData` dependency turun dari `[stepHistory, todaySteps, dailyStepGoal, colors.surfaceHighlight, colors.warning, colors.successBadge, colors.danger]` → `[stepHistory, todaySteps, dailyStepGoal]`. Ganti tema tidak lagi trigger 365-iter loop.

### FASE 3 — Pecah komponen raksasa jadi sub-komponen `React.memo` (MEDIUM RISK)
> Tujuan: re-render parsial, bukan seluruh layar.

- [ ] **3.1 `index.tsx`**: pecah jadi komponen terpisah:
  - `<DashboardHeader/>` (greeting, streak, avatar)
  - `<WeekStrip/>` (7 hari)
  - `<WeeklyTargetHero/>`
  - `<WeeklyBento/>`
  - `<RecentActivity/>`
  - `<StartWorkoutCTA/>`
  - Masing-masing `React.memo`, terima **props primitif** (bukan object baru).
- [ ] **3.2 `history.tsx`**: pecah `<CalendarSection/>`, `<BarChartSection/>`, `<StepsSection/>`, `<LogsSection/>`, `<AllTimeStats/>`.
- [ ] **3.3 `settings.tsx`**: pecah baris-baris setting jadi `<SettingRow/>`, `<SegmentedControl/>`, dsb. (settings dirender ulang setiap toggle).
- [ ] **3.4** untuk icon `lucide` yang berat: pertimbangkan wrap `React.memo`.

### FASE 4 — Kurangi jumlah render & trigger (MEDIUM RISK) ✅ SELESAI

- [x] **4.1** Batch update `useStepStore` (`checkStatus`/`syncSteps`/`fetchHistory`) agar tidak set state 3x berurutan (gabung ke sedikit `set()`).
- [x] **4.2** Audit `useUser()` (Clerk) di `index.tsx`/`settings.tsx`: ambil hanya field yang dipakai (`user.fullName`, `user.imageUrl`) atau memoize agar object baru tidak memicu re-render.
- [x] **4.3** `getGreeting()`, `format(date, ...)` di body render → `useMemo`.
- [x] **4.4** Pastikan `enableFreeze(true)` + `freezeOnBlur` benar-benar aktif (sudah dilakukan) dan ukur efeknya.

**Hasil:** `checkStatus()` batch `syncSteps` + `fetchHistory` jadi 1 `set()` (3 render → 1). `useUser()` di index & settings extract primitives (`userFullName`, `userImageUrl`). `greeting`, `todayDateStr`, `formattedSelectedDate` memoized.

### FASE 5 — Optimasi mount pertama (LOW PRIORITY, dev-only overhead)
- [ ] **5.1** Cek import berat top-level (`date-fns/locale`, `react-native-view-shot`, `expo-sharing`) — pastikan lazy-load di tempat yang jarang dipakai.
- [ ] **5.2** Verifikasi performa di **production build** (Hermes) — banyak “delay” dev tidak muncul di production.

### FASE 6 — Bersihkan tooling profiler (setelah selesai)
- [ ] **6.1** Hapus pemanggilan `useRenderProfiler(...)` dari semua screen.
- [ ] **6.2** Hapus `hooks/useRenderProfiler.ts` (atau simpan sebagai dev util non-aktif).
- [ ] **6.3** Pastikan `enableFreeze` tetap ada.

---

## 5. Metrik Keberhasilan (Target)

| Metric | Sekarang (dev) | Target (dev) |
|---|---|---|
| Dashboard mount | 2156ms | < 800ms |
| Dashboard re-render | 95–413ms | < 60ms |
| Settings re-render | 234–773ms | < 120ms |
| History re-render | 289–1177ms | < 150ms |
| Workout re-render | 106–227ms | < 60ms |
| Ganti tema/bahasa (rasa) | 1–5 detik | instan (< 300ms) |
| Pindah tab (rasa) | delay besar | instan |

---

## 6. Urutan Eksekusi yang Disarankan

1. **FASE 1** dulu (paling aman + dampak besar) → test → kirim log.
2. Kalau belum cukup → **FASE 4.1 + 4.2** (batch store + Clerk) → test.
3. Kalau masih → **FASE 3** bertahap per screen (mulai dari `history.tsx` karena terberat).
4. **FASE 2** bisa digabung dengan FASE 1/3.
5. **FASE 6** di paling akhir setelah semua stabil.

---

## 7. Risiko & Catatan

- **Risiko utama:** refactor komponen besar (FASE 3) bisa memutus koneksi prop/state. Mitigasi: kerjakan per-section, `tsc --noEmit` + `expo export` setiap selesai satu bagian, test device.
- **Jangan** ubah logika bisnis (sync, streak, session) saat refactor render.
- **Dev vs Production:** selalu validasi ulang angka di production build sebelum menyimpulkan.
- Tooling profil (`useRenderProfiler`) harus dilepas sebelum rilis.

---

## 8. Lampiran — Lokasi Kode Penting

| File | Masalah | Bagian |
|---|---|---|
| `app/(tabs)/history.tsx` | O(n²) format | `chartData` ~233, `stepYearlyData` ~312, `barChartWeeks` ~370, `selectedDaySessions` ~489 |
| `app/(tabs)/history.tsx` | memo depend colors | `listHeaderComponent` ~1063 |
| `app/(tabs)/index.tsx` | O(7×n) format (FIXED) | weekly strip ~268 |
| `app/(tabs)/index.tsx` | body render format | `getGreeting` ~189, `format(selectedDate)` ~231 |
| `app/(tabs)/workout.tsx` | O(7×n) format (FIXED) | weekly calendar ~148 |
| `app/(tabs)/settings.tsx` | komponen raksasa | seluruh file 1669 baris |
| `store/useStepStore.ts` | multi set beruntun | `checkStatus` ~61, `syncSteps` ~106 |
| `hooks/useRenderProfiler.ts` | overhead dev | seluruh file (hapus di FASE 6) |
| `app/_layout.tsx` | freeze | `enableFreeze(true)` ~33 |

---

_Dokumen ini dibuat sebagai panduan eksekusi bertahap. Update status checklist seiring progres._
