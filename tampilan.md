🏋️ UI/UX Revamp & Modernization Plan: Workout Tracker

Dokumen ini berisi panduan komprehensif untuk merombak antarmuka (UI) dan pengalaman pengguna (UX) aplikasi Workout Tracker dari tampilan statis/kaku menjadi modern, dinamis, dan ergonomis untuk penggunaan saat latihan di gym.

1. Audit Masalah UI/UX Saat Ini

Berdasarkan rekaman video walkthrough aplikasi:

Palet Warna Monoton & Kurang Energi:

Dominasi warna navy gelap dipadu biru flat (#2563EB) memberi kesan seperti aplikasi admin dashboard atau tool enterprise, bukan aplikasi fitness yang butuh aksen berenergi.

Komponen Terlalu Statis & Hardcoded:

Card "No workouts yet" dan "No workout scheduled" hanya kotak kosong dengan garis putus-putus (dashed border) tanpa visual interest atau CTA kontekstual.

Header kalender horizontal kaku dan tidak memberi indikasi visual status progres hari tersebut.

Modal & Navigasi Kaku:

Menu aksi template (Edit/Delete) muncul sebagai modal melayang di tengah layar (center dialog), yang sulit dijangkau jempol saat memakai HP satu tangan.

Input Reps/Sets Kurang Ergonomis:

Di menu edit dan preview, form set/reps masih memakai input text box standar yang memicu keyboard numerik penuh, rentan typo saat tangan berkeringat.

Rest Timer Hardcoded & Statis:

Durasi waktu istirahat terkunci di default 01:30 (90 detik) tanpa opsi langsung bagi atlet untuk menyesuaikan ritme istirahat berdasarkan jenis latihan (misal: heavy compound butuh 2-3 menit, isolation/superset cukup 45-60 detik).

Tidak ada dialog penentu preferensi otomatis saat pengguna menekan tombol selesai set (set complete).

Ketiadaan Lokalisasi (Hardcoded English Strings):

Semua label dan greeting ditulis hardcoded dalam bahasa Inggris, belum ada mekanisme pemilihan bahasa lokal (Bahasa Indonesia) yang ramah pengguna lokal.

2. Design System Baru (The "Electric Gym" Theme)

2.1 Color Palette

Ganti skema warna flat corporate menjadi skema kontras tinggi dengan aksen neon berenergi (inspirasi: Hevy, Strava, Apple Fitness+).

Token

Nama Hex

Penggunaan

Background

#0B0F17 (Deep Obsidian)

Latar belakang layar utama

Surface Card

#161D2A (Charcoal Slate)

Kontainer card modul & item list

Card Border

#243042 (1px subtle border)

Pemisah card (beri efek crisp tanpa bayangan berat)

Primary Accent

#CCFF00 (Electric Volt Lime)

Tombol CTA utama (Start Workout), streak aktif, checklist

Primary Text

#000000 (saat di atas Volt) / #F8FAFC

Kontras teks maksimal

Secondary Accent

#00E5FF (Cyber Cyan)

Ikon metrik volume, durasi, progress bar timer

Timer Warning

#FFB800 (Amber Yellow)

Status timer saat sisa < 15 detik

Warning/Delete

#FF4B4B (Soft Crimson)

Tombol delete, batal, reset, skip timer

Muted Text

#94A3B8

Subtitle, satuan (kg, reps, set)

2.2 Tipografi & Hirarki Visual

Title/Header: Font sans-serif tebal (Inter / Plus Jakarta Sans / SF Pro Display) dengan letter-spacing agak rapat.

Numbers/Metrics/Timer: Gunakan font tabular (font-variant-numeric: tabular-nums) untuk angka durasi, repetisi, dan hitungan mundur agar angka tidak bergeser atau berkedut saat berganti.

3. Peningkatan UX Menjadi Lebih Dinamis

3.1 Dynamic Contextual Header & Dashboard

Waktu Nyata & Bilingual: Greeting berubah dinamis mengikuti jam dan bahasa aktif:

Pagi: "Siap untuk latihan pagi, Atlet?" / "Ready for morning gains, Athlete?"

Siang/Sore: "Waktunya gas latihan!" / "Afternoon grind time!"

Malam: "Siap sesi malam ini?" / "Evening session ready?"

Smart Action Card: Jika hari ini ada jadwal (misal: "Push Day"), card utama langsung menampilkan tombol cepat:

[⚡ Mulai Jadwal: Push Day] lengkap dengan perkiraan durasi (misal: ~45 mnt) daripada sekadar "Start Quick Workout".

3.2 Dynamic Calendar Ribbon

Ganti strip tanggal kaku dengan status cincin interaktif:

Dot Hijau/Volt: Hari sudah ada workout tercatat.

Dot Abu/Garis: Rest day.

Border Volt/Pulse: Hari ini (aktif).

Swipe horizontal bebas antar-minggu dengan transisi animasi halus (spring animation).

3.3 Transisi Bottom Sheet (Mengganti Modal Dialog)

Hilangkan modal tengah untuk opsi template (Edit/Delete).

Ganti dengan Swipe-down Bottom Sheet:

Opsi muncul dari bawah layar dalam jangkauan ibu jari (thumb-zone).

Sertakan drag handle bar di atas sheet.

Aksi Delete diberikan proteksi ganda (slide-to-delete atau modal konfirmasi merah lembut).

3.4 Ergonomic Set & Rep Input

Ubah box input statis menjadi komponen Quick Stepper / Bottom Dial:

Tombol [-] dan [+] ukuran besar di sisi kanan-kiri angka.

Fitur Long press untuk mempercepat penambahan angka per 5 reps/kg.

Dukungan Haptic Feedback (getaran ringan) di setiap tap tombol stepper.

3.5 Dynamic & Configurable Rest Timer

Alih-alih terkunci di waktu statis 1:30 menit, timer dibuat adaptif dan dapat diatur langsung saat latihan berlangsung:

Quick Timer Selector saat "Set Complete":

Saat user mencentang set (✓ Set 1), tampilkan mini popover / floating banner dengan pill preset cepat:

[ 0:45 ] · [ 01:00 ] · [ 01:30 ] · [ 02:00 ] · [ 03:00 ] · [ ⚙️ Kustom / Custom ]

Ada toggle checkbox kecil: "Simpan sebagai default latihan ini" (Save as default for this exercise), sehingga Bench Press otomatis tersetting 2 menit, sedangkan Bicep Curl otomatis 1 menit.

Interactive Active Timer Widget:

Ditampilkan sebagai Floating Mini-Bar (Sticky Bottom) atau Dynamic Island Pill di atas navigasi bawah, sehingga user tetap bisa melihat daftar gerakan selanjutnya selagi waktu istirahat berjalan.

Visual Ring / Progress Bar: Progress bar melingkar atau linear berefek gradien Cyber Cyan (#00E5FF) yang berkurang mulus (smooth 60fps countdown).

Kontrol Cepat di Layar:

Tombol +15s / +30s untuk menambah waktu instan tanpa membuka menu setting.

Tombol [Lewati ⏭] / [Skip ⏭] untuk langsung ke set berikutnya.

Alert & Micro-interactions:

3 detik terakhir: getaran haptic berirama per detik (pulse).

Waktu habis (00:00): getaran ganda (double strong vibration) + aksen warna berubah ke Electric Volt Flash.

4. Fitur Switch Bahasa (Bilingual: ID & EN)

Agar aplikasi fleksibel untuk pengguna lokal maupun global tanpa merusak UI yang ringkas:

4.1 Penempatan & Komponen UI Language Switcher

Di Tab Settings (Goals & Settings):

Tambahkan row di bawah grup Preferences:

Label: 🌐 Bahasa / Language

Input: Segmented Pill Selector berdesain compact:

+---------------------------------------------+
| 🌐 Bahasa / Language [ ID | • EN ] |
+---------------------------------------------+

Akses Cepat di Header (Opsional Modal Quick Switch):

Ikon globe mini di pojok kanan atas layar Settings/Profil untuk toggle 1-tap antara ID 🇮🇩 dan EN 🇬🇧.

4.2 Glosarium & Standarisasi Istilah (Penting untuk Fitness App)

Istilah fitness tidak boleh diterjemahkan terlalu kaku (letterlijk) agar tidak aneh bagi komunitas gym di Indonesia:

Key Dictionary

English (EN)

Bahasa Indonesia (ID)

Catatan UX

start_workout

Start Workout

Mulai Latihan

Hindari terjemahan kaku seperti "Mulai Olahraga"

quick_workout

Quick Workout

Latihan Kilat

-

rest_timer

Rest Timer

Waktu Istirahat

Jelas dan umum

sets_reps

Sets & Reps

Set & Repetisi

Tetap pakai istilah umum gym

today_plan

Today's Plan

Rencana Hari Ini

-

templates

My Templates

Templat Saya / Rutinitas

Lebih natural pakai "Rutinitas" atau "Templat"

day_streak

Day Streak

Hari Beruntun

Bisa pakai ikon 🔥 + "Hari Berturut"

this_week

This Week

Minggu Ini

-

no_workouts_yet

No workouts yet

Belum ada latihan

-

recent_activity

Recent Activity

Aktivitas Terkini

-

cancel

Cancel

Batal

-

save_default

Set as default

Simpan sbg default

Ringkas untuk ukuran layar HP

4.3 Arsitektur State Management Bahasa

Simpan preferensi bahasa pengguna di localStorage (app_language: 'id' | 'en').

Gunakan context/store sederhana (misal LanguageContext di React) agar perubahan bahasa langsung merender ulang seluruh label secara instan tanpa perlu memuat ulang (reload) halaman.

5. Rincian Layout & Perubahan Komponen

5.1 Dashboard & Settings Menu

[SEBELUM (Statis & EN Saja)] [SESUDAH (Dinamis & Bilingual Support)]
+---------------------------+ +---------------------------+
| Hello, Athlete | | 🔥 4 Hari Berturut! |
| Ready to crush your goals?| | Selamat Pagi, Atlet |
| [ 0 ] [ 0 ] [ 0 ] | | [⚡ 3 Latihan] [⏱ 1.8 jam] |
+---------------------------+ +---------------------------+
| Recent Activity | | Target Hari Ini: Push Day |
| (Empty Dashed Card) | | 3 Gerakan · ~40 Menit |
| | | [ MULAI LATIHAN SEKARANG ] |
+---------------------------+ +---------------------------+
| [ Start Quick Workout ] | | Sen Sel Rab KAM Jum Sab |
| (Blue flat button) | | ✓ ✓ - (•) - - |
+---------------------------+ +---------------------------+
| Preferences (Pengaturan) |
| 🌐 Bahasa [• ID | EN] |
+---------------------------+

5.2 Rest Timer Workflow

[Pemicu Set Selesai]
User tap: [ ✓ Selesai Set 2 ]
│
▼
[Rest Timer Prompt / Floating Pill]
+-------------------------------------------------------------+
| ⏱ ISTIRAHAT: 02:00 [ +30d ] |
| [ 0:45 ] [ 1:00 ] [ 1:30 ] [ *02:00* ] [ 03:00 ] |
| ☑ Simpan sebagai default untuk Bench Press |
+-------------------------------------------------------------+
│
▼ (Timer Berjalan - Non-intrusive Sticky Bar)
+-------------------------------------------------------------+
| 🟢 Sisa 01:42 ||||||||||||||.......... [ Lewati ⏭ ] |
+-------------------------------------------------------------+

6. Konfigurasi Setting Global Rest Timer

Di tab Goals & Settings, tambahkan menu preferensi khusus timer & bahasa:

Language Switcher: Segmented control instan antara Bahasa Indonesia (ID) dan English (EN).

Default Rest Timer: Slider interaktif dari 30 detik hingga 5 menit (interval 15 detik).

Auto-Start Timer on Set Finish: Toggle switch (Aktif/Nonaktif).

Audio & Haptic Cue: Toggle nada bunyi gym bell / getaran di 3 detik terakhir.

Per-Exercise Customization: Tombol untuk reset atau me-manage default timer per gerakan.

7. Checklist Tahapan Eksekusi

[ ] Fase 1: Token Warna & Tailwind/CSS Variables

Definisikan palet #0B0F17, #161D2A, #CCFF00, #00E5FF, dan #FFB800.

Berikan efek border 1px transparan (border border-slate-800) ke seluruh card.

[ ] Fase 2: Redesain Action Modals

Refactor dialog tengah menjadi swipeable bottom modal sheet.

[ ] Fase 3: Smart Calendar Strip

Buat komponen kalender membaca status workout dari state/database lokal dan merender progress dot status.

[ ] Fase 4: Dynamic Rest Timer Engine

Buat custom hook / state manager untuk useRestTimer(duration, onComplete).

Implementasikan chip preset waktu cepat (45s, 1m, 1m30s, 2m, 3m, +30s).

Tambahkan opsi penyimpanan default timer per latihan (local storage/state).

[ ] Fase 5: Sistem Bilingual (i18n Context)

Siapkan kamus translasi locale/id.json dan locale/en.json.

Buat LanguageContext dan hook useTranslation() dengan penyimpanan localStorage.

Pasang komponen Segmented Control bahasa di menu pengaturan.

[ ] Fase 6: Micro-interactions & Haptics

Pasang scale bounce (scale(0.96) active) pada seluruh button utama.

Tambahkan getaran haptic (navigator.vibrate) pada hitungan mundur timer dan tombol stepper.
