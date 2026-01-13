MotionFit

Aplikasi fitness tracker yang dibangun pake Expo Router dan React Native. Fokusnya sih biar kamu bisa ngecatat latihan dengan simpel, ada timer istirahat pintar, target mingguan, sama analytics dasar aja.

Gambaran singkat repo

- Navigasi dan tab aplikasi: [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)
- Layar utama workout: [app/(tabs)/workout.tsx](app/(tabs)/workout.tsx)
- Riwayat & analitik: [app/(tabs)/history.ts](app/(tabs)/history.tsx)
- Goals & pengingat: [app/(tabs)/goals.tsx](app/(tabs)/goals.tsx)
- Bikin workout sendiri: [app/create-workout.tsx](app/create-workout.tsx)
- Helper notifikasi: [lib/notifications.ts](lib/notifications.ts)
- Config Expo: [app.json](app.json)
- Config EAS build: [eas.json](eas.json)

Fitur-fitur utama

- Bikin rencana latihan mingguan pake tab hari dan ring kemajuan
- Catet set cuma sekali tap, tiap latihan langsung ada timer istirahat otomatis
- Timer istirahat udah disetting (30/60/90/120detik) bisa dibatalkan pake tekan lama
- Ringkasin sesi latihan: kelar nggaknya, jumlah set, rekor pribadi, sama pake istirahat berapa lama
- Analitik riwayat latihan ama kemajuan (1RM)
- Halaman goals buat target mingguan ama jadwal pengingat
- Bikin rencana workout sendiri pake ikon ama warna kesukaan
- Panduan buat pemula pas buka halaman Workout ama History
- Aksesibilitas buat bantu orang-orang yang butuh

Update & perbaikan terbaru

- Kompatibilitas paket: Semua dependensi udah diupdate ke versi SDK 54
- Mapping ikon: Nambahin mapping lengkap dari SF Symbols ke Material Icons buat Android/web
- Navigasi: Hilangin header gak perlu di halaman bikin workout biar lebih rapi
- Haptic feedback: Nambahin pengecekan biar gak error kalo haptic gak ada
- Kompatibilitas lintas platform: Ikon-ikon dijadiin lebih seragam di semua OS

Mulai cepat (buat developer)

- Install dependensi: npm install
- Jalanin aplikasi: npx expo start
- Buka di hp: scan QR pake Expo Go atau pake emulator

Notifikasi dan pengingat

- Expo Go gak support notifikasi/push di SDK 53+. Tapi aplikasi ini udah diatur di [lib/notifications.ts](lib/notifications.ts) biar gak error.
- Buat nyoba pengingat, pake Development Build (EAS Dev Client):
  - Atur development build di [eas.json](eas.json)
  - Build ama install dev client: npx eas build -p android --profile development
  - Setelah install dev client, baru bisa jadwal pengingat dari tab Goals.

Build APK Android

Proyek ini udah disetting buat bikin APK lewat EAS.

- Login dulu: npx eas login
- Inisialisasi EAS (buat pertama kali): npx eas init
- Settingan build APK ada di [eas.json](eas.json) buat preview ama produksi.
- Pake Expo managed credentials pas build pertama. Nanti bakal disuruh bikin Android keystore baru.
- Build produksi: npx eas build -p android --profile production
- Download APK-nya dari dashboard EAS pas build selesai.

Settingan lingkungan

- Variabel lingkungan bisa diatur per profil di EAS. Aplikasi ini nyari EXPO_PUBLIC_SUPABASE_URL ama EXPO_PUBLIC_SUPABASE_KEY kalo ada.
- Di Expo, variabel yang pakenya awalan EXPO_PUBLIC_ bakal disisipin pas build dan bisa dipake di aplikasi.
- Buat development lokal, bisa jalanin tanpa variabel ini; fitur yang butuh bakal tetep jalan tapi dengan fungsi terbatas.

Cara pake aplikasi

- Di tab Workout:
  - Pilih hari trus tap "Assign" buat pilih rencana latihan.
  - Di modal rencana, tap + buat nambah set. Chip sebelah kanan nyalain timer istirahat.
  - Tekan lama chip timer buat batalkan kalo salah ketuk.
  - Ganti durasi istirahat pake chip-chip di atas daftar latihan.
  - Tap "Finish Workout" buat simpen sesi ke History.

- Di tab History:
  - Sesi terbaru nunjukin kelar nggaknya, jumlah set, latihan, ama pake istirahat berapa lama.
  - Bagian kemajuan latihan nunjukin peningkatan 1RM terbaru.

- Di tab Goals:
  - Atur target latihan mingguan ama hari favorit.
  - Aktifin pengingat ama pilih waktu; di Expo Go, pengingat emang sengaja dimatiin.

- Di Create Workout:
  - Bikin rencana workout sendiri pake nama, deskripsi, ikon, ama warna kesukaan
  - Tambahin latihan ama jumlah set, repetisi, durasi, ama catatan
  - Simpen rencana buat dipake lagi nanti

Struktur proyek (pilihan)

- [app/(tabs)/workout.tsx](app/(tabs)/workout.tsx) — UI mingguan, modal rencana, pencatatan ama timer istirahat
- [app/(tabs)/history.tsx](app/(tabs)/history.tsx) — analitik, sesi terbaru, kemajuan
- [app/(tabs)/goals.tsx](app/(tabs)/goals.tsx) — target mingguan, UI pengingat
- [app/create-workout.tsx](app/create-workout.tsx) — UI buat bikin workout sendiri
- [lib/notifications.ts](lib/notifications.ts) — impor notifikasi dinamis, helper jadwal
- [styles/commonStyles.ts](styles/commonStyles.ts) — warna tema
- [components/IconSymbol.tsx](components/IconSymbol.tsx) — abstraksi ikon sistem ama mapping lintas platform
- [eas.json](eas.json) — settingan build EAS ama buildType android apk

Catatan aksesibilitas

- Aksi utama udah dilengkapi accessibilityLabel ama accessibilityHint biar gampang ditemuin.
- Ukuran tap target ama teks nyaman buat dibaca; masih bakal disempurnain.
- Mapping ikon lengkap biar pengalaman seragam di iOS, Android, ama web.

Keamanan ama settingan

- Gak ada secret yang dihardcode. Pake variabel lingkungan EAS buat konfigurasi publik yang dibutuhin.
- Jangan nyimpen kredensial sensitif di hp; mending pake layanan yang dikelola.

Limitasi yang diketahui

- Pengingat: Expo Go gak bisa jadwal notifikasi; butuh dev build.
- Perhitungan rekor pribadi (1RM) pake rumus Epley dan cuman diupdate kalo berat ama repetisi bukan nol.

Versi ama rilis

- Android versionCode naik otomatis pas build produksi (liat [eas.json](eas.json)).
- Pake GitHub releases buat nyimpen APK dari build EAS.

Kontribusi

- Fork repo ini ama buat branch fitur.
- Jalanin lint check sebelum commit.
- Buka pull request ke main.


Terima kasih

- Dibikin pake Expo Router, React Native, ama EAS.
- Ikon dari SF Symbols kalo didukung, pake Material Icons buat Android/web.
- Kompatibilitas lintas platform dicapai lewat lapisan abstraksi IconSymbol.

<!-- Screenshot (opsional)

- Taruh screenshot aplikasi di [assets/images](assets/images) -->
