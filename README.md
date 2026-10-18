# HANYOU 汉友 — Teman Belajar Mandarin (v20, struktur modular)

Dasar kode: HANYOU v19 (fitur dan data identik, hanya dipecah ke banyak file).
Firebase: akun/proyek baru (isi `js/config/firebase-config.js`).

## Struktur

```
index.html                 kerangka halaman (markup saja) + urutan pemuatan script
css/app.css                seluruh gaya
js/config/firebase-config.js   ← SATU-SATUNYA file yang diganti saat pindah proyek Firebase
js/core/                   firebase-init, sync (cloud+lokal), srs, exam, practice, shell, boot-splash
js/data/loader.js          pemuat data → window.HANYOU_DATA
js/app.js                  logika utama (Beranda, Belajar, Latihan, Game, Progres, Library) — masih 1 file
js/features/               akun, tampilan (tema/ukuran teks), pengingat, kalimat-zh
js/i18n/                   engine + tambahan terjemahan (id / zh / en)
data/                      vocab, sentences, game, examples, index, strings, kz-tr
data/sets/<id>.js          1 paket soal per file (dimuat malas saat dibuka)
firebase.json, firestore.rules
.github/workflows/deploy.yml  preview di PR, live saat merge ke main
docs/                      ARSITEKTUR, SETUP-FIREBASE-BARU
tugas/akun1..4/            PERINTAH.txt + batch kerja untuk tiap akun pekerja
tools/                     alat pengontrol (periksa & gabung hasil, bangun paket tugas)
PANDUAN-ANDA.md            urutan langkah untuk pemilik proyek
ATURAN-TIM.md              aturan wajib semua akun pekerja
HANDOFF.md                 status + papan batch
```

## Aturan penting
- Semua file memakai `<script src>` biasa (bukan `fetch`/module) agar tetap jalan saat dibuka langsung dari `file://` atau `content://` (mode uji lokal tanpa login).
- Urutan `<script>` di `index.html` menentukan hasil. Jangan diubah tanpa menguji.
- Akun pekerja hanya mengerjakan batch teks; repo diubah oleh pengontrol (lihat `ATURAN-TIM.md`).

## Aset yang belum ada di repo (tidak termuat dalam file v19)
`manifest.webmanifest`, `icons/` (192, apple-touch-icon), `sw.js`, `audio/` (mp3 ujian, contoh `audio/H41218.mp3`).
Tanpa file ini aplikasi tetap jalan; hanya PWA/instal dan audio latihan mendengar yang tidak aktif.
