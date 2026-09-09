# ✅ MotionFit — To-Do List & Implementation Checklist

Gunakan checklist ini untuk melacak status pengerjaan fitur dan perbaikan bug secara bertahap.

---

## 📌 Status Legend
- 🔴 **Pending** : Belum dimulai
- 🟡 **In Progress** : Sedang dikerjakan
- 🟢 **Completed** : Selesai dan terverifikasi

---

## 🛠️ Checklist Tugas

### Phase 1: Bug Fixes & Input Refinement (Prioritas Tinggi)
- [ ] 🔴 **Perbaiki Sensor Pedometer (Step Counter)**
  - [ ] Implementasikan deteksi hardware Step Counter Android murni tanpa fallback accelerometer yang terlalu sensitif.
  - [ ] Pasang algoritma filter frekuensi langkah manusia (1.5 - 2.5 Hz).
  - [ ] Pastikan listener sensor 100% mati saat toggle step tracking dimatikan di Settings.
- [ ] 🔴 **Perbaiki Durasi Suara Custom Notifikasi & Test Audio di Settings**
  - [ ] Pasang batas waktu pemutaran (*auto-cutoff*) maksimal **10 detik** untuk file audio kustom agar tidak memutar seluruh durasi lagu.
  - [ ] Tambahkan efek *fade out* lembut di detik ke-8 hingga ke-10 sebelum audio otomatis berhenti.
  - [ ] Sediakan tombol toggle Play/Stop manual saat melakukan tes audio di menu Settings.
  - [ ] Pastikan pemutaran audio kustom saat timer istirahat selesai di latar belakang juga otomatis berhenti setelah 10 detik.
- [ ] 🔴 **Validasi Form Input Number Only**
  - [ ] Terapkan `keyboardType="number-pad"` pada input Sets, Reps, Weight, dan Rest Time di layar Buat/Edit Workout.
  - [ ] Tambahkan sanitasi regex (hanya menerima angka positif).
  - [ ] Pasang tombol stepper (+ / -) untuk memudahkan pengaturan angka.

---

### Phase 2: UI/UX Overhaul (Perombakan Tampilan)
- [ ] 🔴 **Rombak Tampilan Rest Timer**
  - [ ] Buat desain timer melingkar (*circular progress ring*) modern.
  - [ ] Tambahkan tombol pintas penyesuaian waktu (`+15s`, `+30s`, `-15s`).
  - [ ] Tambahkan animasi hitungan mundur dan audio/haptic cue pada 3 detik terakhir.
  - [ ] Fitur minimize timer ke Floating Mini-Bar di bagian bawah layar.
- [ ] 🔴 **Rombak Tampilan Preview Workout**
  - [ ] Desain ulang header preview dengan ringkasan target otot, estimasi durasi, dan total beban.
  - [ ] Rapikan kartu daftar gerakan latihan agar lebih estetik dan informatif.
  - [ ] Pastikan tombol "Mulai Latihan" sticky dan mudah dijangkau.
- [ ] 🔴 **Rombak Tampilan Create & Edit Workout**
  - [ ] Terapkan desain form modular berbasis kartu untuk setiap gerakan.
  - [ ] Tambahkan fitur reorder (ubah urutan) latihan.
  - [ ] Tambahkan tombol sekali sentuh untuk duplikasi set.

---

### Phase 3: Newbie-Friendly & Smart Features
- [ ] 🔴 **Exercise Library (Pustaka Gerakan Siap Pakai)**
  - [ ] Buat database lokal berisi daftar gerakan latihan terpopuler.
  - [ ] Kelompokkan gerakan berdasarkan otot: Dada, Punggung, Kaki, Bahu, Lengan, Core.
  - [ ] Buat komponen pemilihan gerakan dengan pencarian cepat (*instant search*) dan chip filter otot.
  - [ ] Hubungkan pustaka gerakan ini ke halaman Create & Edit Workout.
- [ ] 🔴 **Tutorial Gerakan: GIF / YouTube Video Preview**
  - [ ] Tambahkan modal interaktif saat nama latihan diklik pada sesi aktif atau preview.
  - [ ] Berikan dukungan media GIF animasi peraga gerakan.
  - [ ] Berikan opsi input link video YouTube (langsung memutar preview tutorial di dalam aplikasi).
  - [ ] Sediakan opsi bagi pengguna untuk mengaktifkan atau menonaktifkan tutorial ini.

---

### Phase 4: Performance & Cloud Synchronization
- [ ] 🔴 **Optimasi Performa & Animasi**
  - [ ] Pastikan semua animasi berjalan di native thread menggunakan React Native Reanimated.
  - [ ] Terapkan optimasi FlatList / FlashList pada riwayat sesi latihan yang panjang.
  - [ ] Bersihkan re-render berlebih menggunakan `useMemo` dan `useCallback`.
- [ ] 🔴 **Autentikasi Pengguna & Database Cloud**
  - [ ] Setup layanan Backend-as-a-Service (Supabase / Firebase).
  - [ ] Buat fitur autentikasi pengguna (Login Google / Email).
  - [ ] Implementasikan sinkronisasi data *offline-first* (data tetap aman di lokal dan otomatis backup ke cloud saat online).
  - [ ] Fitur pemulihan akun otomatis saat berganti HP.

---

## 📝 Catatan Tambahan & Ide Masa Depan
- Menjaga prinsip desain MotionFit: Modern Bionic Health theme, tanpa emoji mentah (gunakan Lucide/Ionicons), dan dukungan penuh dwibahasa (ID / EN).
