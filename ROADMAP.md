# 🚀 MotionFit — Feature & Bugfix Roadmap

Dokumen ini merangkum rencana pengembangan, perbaikan bug, dan perombakan antarmuka (UI/UX) untuk versi MotionFit mendatang berdasarkan catatan pembaruan.

---

## 📋 Ringkasan Kategori Pembaruan

| Kategori | Deskripsi |
| :--- | :--- |
| 🐛 **Bug Fixes** | Memperbaiki sensor pedometer yang terus berhitung, sinkronisasi durasi notifikasi & tombol test audio di setting. |
| 🎨 **UI/UX Overhaul** | Redesain Rest Timer, Workout Preview, serta halaman Create/Edit Workout. |
| 🛡️ **Input Validation** | Restriksi keyboard number-pad pada input Sets dan Rest duration. |
| 💡 **Smart Features** | GIF animasi atau YouTube embed tutorial gerakan saat nama latihan diklik. |
| 📚 **Exercise Library** | Pustaka gerakan bawaan berdasarkan target otot (Newbie Friendly). |
| ⚡ **Performance** | Optimasi animasi reanimated, rendering list, dan performa aplikasi. |
| 🔐 **Cloud & Auth** | Integrasi Autentikasi Pengguna & Database Cloud (Supabase/Firebase) untuk backup progress aman. |

---

## 🔍 Detail Rencana Pengembangan

### 1. 🐛 Perbaikan Sensor Step Tracking (Pedometer)
- **Masalah:** Step counter terus bertambah meskipun pengguna tidak sedang bergerak / saat HP hanya sedikit digoyang.
- **Penyebab:** Penggunaan accelerometer mentah (raw motion) terlalu sensitif terhadap getaran kecil.
- **Rencana Solusi:**
  - Gunakan native Android Step Counter / Step Detector Hardware Sensor via Google Health Connect atau Expo Pedometer asli tanpa fallback getaran yang salah deteksi.
  - Tambahkan filter frekuensi langkah manusia (1.5 Hz – 2.5 Hz) dan threshold akselerasi yang presisi.
  - Pastikan sensor benar-benar berhenti (unsubscribe) saat toggle step tracking dimatikan di Settings.

### 2. 🎨 Rombak Tampilan Rest Timer
- **Masalah:** Tampilan rest timer saat ini perlu dibuat lebih modern, dinamis, dan mudah digunakan di tengah sesi latihan.
- **Rencana Solusi:**
  - Countdown visual berbentuk lingkaran besar (*circular progress bar*) dengan aksen warna neon.
  - Tombol penyesuaian cepat (+15d, +30d, -15d) saat timer sedang berjalan.
  - Fitur minimize ke Floating Mini-Bar agar pengguna tetap bisa melihat gerakan berikutnya tanpa menghentikan timer.
  - Efek suara dan getaran haptic saat hitungan tersisa 3, 2, 1 detik.

### 3. 🎨 Rombak Tampilan Preview Workout
- **Masalah:** Tampilan preview template latihan saat ini perlu dibuat lebih informatif dan menarik secara visual.
- **Rencana Solusi:**
  - Header dengan cover banner / tag otot sasaran (Dada, Bahu, Kaki, dll.).
  - Ringkasan total estimasi durasi dan estimasi volume angkatan.
  - Daftar gerakan dengan card detail yang menampilkan target set, repetisi, dan waktu istirahat.
  - Tombol CTA "Mulai Latihan" yang sticky di bagian bawah layar.

### 4. 🛡️ Validasi Form Input: Number Only
- **Masalah:** Input set dan durasi istirahat masih bisa menerima karakter non-angka atau bernilai negatif/kosong.
- **Rencana Solusi:**
  - Pasang properti keyboardType="number-pad" pada semua TextInput terkait Sets, Reps, Weight, dan Rest Time.
  - Tambahkan sanitasi regex untuk memblokir karakter khusus, simbol, atau desimal berlebih.
  - Sediakan tombol stepper (+ dan -) untuk kemudahan penambahan angka cepat di HP.

### 5. 🎨 Rombak Tampilan Create & Edit Workout
- **Masalah:** Alur pembuatan dan pengeditan latihan terasa panjang dan butuh tampilan kartu yang lebih terstruktur.
- **Rencana Solusi:**
  - Desain form modular berbasis kartu (*card-based exercise blocks*).
  - Fitur drag-and-drop untuk mengubah urutan latihan dengan fleksibel.
  - Tombol duplikasi set atau copy set sebelumnya dalam satu sentuhan.
  - Terhubung langsung dengan Exercise Library (Pilihan Gerakan Otomatis).

### 6. 🔔 Perbaikan Durasi Suara Custom Notifikasi & Test Audio di Settings
- **Masalah:** Saat memilih file audio kustom (lagu/musik) untuk notifikasi istirahat, saat di-test atau saat berbunyi, aplikasi memutar **seluruh durasi lagu secara penuh (*full length*, misal 3–4 menit)**, bukan potongan ringkas nada pengingat.
- **Penyebab:** Pemutar audio (`expo-audio`) memutar file suara dari awal hingga selesai tanpa adanya batasan waktu pemutaran (*playback timeout / cutoff duration*).
- **Rencana Solusi:**
  - Pasang batas durasi otomatis (*auto-cutoff*) untuk audio kustom (maksimal **10 detik**, lalu otomatis berhenti).
  - Tambahkan efek *fade out* lembut di detik ke-8 hingga ke-10 agar audio tidak terpotong kasar.
  - Sediakan tombol kontrol **Play / Stop** manual saat melakukan uji coba audio di menu Settings.
  - Pastikan saat rest timer selesai dan membunyikan audio di latar belakang, suara lagu kustom juga otomatis berhenti setelah 10 detik.

### 7. 🎬 Fitur GIF / YouTube Video Tutorial Gerakan
- **Masalah:** Pengguna pemula sering kali tidak mengetahui teknik gerakan yang benar.
- **Rencana Solusi:**
  - Modal pop-up / bottom sheet yang muncul saat nama latihan diklik.
  - Opsi menampilkan animasi GIF peraga gerakan.
  - Opsi memasukkan link / embed video tutorial YouTube agar langsung bisa diputar di dalam aplikasi.
  - Fleksibilitas: pengguna bisa memilih untuk menyertakan media tutorial atau tidak pada template kustom.

### 8. ⚡ Optimasi Animasi dan Performa Aplikasi
- **Rencana Solusi:**
  - Gunakan React Native Reanimated pada thread native untuk transisi layar dan animasi timer 60 FPS.
  - Terapkan FlashList atau memoization pada riwayat latihan panjang agar performa aplikasi tetap ringan dan hemat memori.
  - Optimasi pemuatan asset gambar dan ikon.

### 9. 🏋️ Exercise Library Bawaan (Newbie Friendly)
- **Masalah:** Mengetik manual nama gerakan satu per satu merepotkan bagi pengguna baru.
- **Rencana Solusi:**
  - Database lokal berisi puluhan latihan populer siap pilih.
  - Kategori berdasarkan kelompok otot:
    - **Dada (Chest):** Bench Press, Incline Dumbbell Press, Push Up, Cable Crossover.
    - **Punggung (Back):** Pull Up, Lat Pulldown, Barbell Row, Seated Cable Row.
    - **Kaki (Legs):** Barbell Squat, Leg Press, Romanian Deadlift, Calf Raise.
    - **Bahu (Shoulders):** Overhead Press, Lateral Raise, Face Pull, Rear Delt Fly.
    - **Lengan (Arms):** Bicep Curl, Hammer Curl, Tricep Pushdown, Skull Crusher.
    - **Core & Perut:** Plank, Hanging Knee Raise, Cable Crunch.
  - Dilengkapi fitur pencarian instan (*instant search*) dan filter chip kategori otot.

### 10. ☁️ Cloud Sync & Autentikasi Pengguna
- **Masalah:** Data hanya tersimpan di local storage HP (AsyncStorage), berisiko hilang jika aplikasi di-uninstall atau ganti perangkat.
- **Rencana Solusi:**
  - Integrasi login pengguna (Google Sign-In / Email Auth) menggunakan Supabase atau Firebase.
  - Arsitektur *offline-first*: aplikasi tetap dapat digunakan sepenuhnya tanpa internet, dan otomatis tersinkronisasi saat online.
  - Cloud backup otomatis untuk riwayat latihan, personal records (PR), dan template latihan.
