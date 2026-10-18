# Arsitektur HANYOU v20

## Urutan pemuatan (index.html) — jangan diubah sembarangan
1. CDN: hanzi-writer, Firebase compat (app, auth, firestore, storage)
2. `js/config/firebase-config.js` → `js/core/firebase-init.js` (membuat `window.MMPFirebase`)
3. `data/*.js` → mengisi `window.HANYOU_RAW`; `data/strings.js` = tabel string bersama (kode `§xx`)
4. `js/data/loader.js` → `window.HANYOU_DATA` + `HANYOU_DATA.loadSet(id)` (paket soal dimuat malas dari `data/sets/<id>.js`)
5. `core/practice.js`, `core/sync.js`, `core/srs.js`, `core/exam.js`
6. `js/app.js` (logika utama), lalu `core/shell.js`, `features/*`, `i18n/*`, `kalimat-zh` + `data/kz-tr.js`

Semua script klasik berbagi satu lingkup global; fungsi di satu file dipanggil file lain secara langsung.

## Data statis (di repo, bukan Firebase)
| File | Isi | Jumlah |
|---|---|---|
| data/vocab.js | kosakata: id, hanzi, pinyin, arti, level, chapter, no, chapterTitle | 2632 (HSK1 153, HSK2 155, HSK3 314, HSK4 621, HSK5 1389) |
| data/examples.js | kalimat contoh per id kosakata `[hanzi, pinyin, arti]` | 2628 |
| data/sentences.js | kalimat latihan bertopik | 60 |
| data/game.js | soal Susun Kalimat | 250 |
| data/index.js | indeks paket soal (id, judul, level, jumlah per kategori) | 50 paket (HSK4 25, HSK5 25) |
| data/sets/*.js | isi paket: `mendengar`, `membaca`, `menulis` | 50 file |
| data/strings.js | string/gambar yang dipakai berulang (dirujuk `§<kode base36>`) | 3810 |

ID kosakata berpola `h1_ai` (level+pinyin). ID paket berpola `h41218` (HSK 4, ujian H41218).

## Data pengguna
**localStorage** `mmp_v6_state[:uid]` = state lengkap (juga `mmp_last_uid`, `hanyou_lang`, `hanyou_sfx`, `hanyou_paket_view`, `hanyou_game_*`, `hanyou_kamus_mode`).

**Firestore** hanya 2 koleksi:
- `users/{uid}` → satu dokumen berisi state: `version, updatedAt, tomb, exams, hskBest, progress{id→{status,box,due,lastReview,u}}, favorites, meta{streak,xp,badges,dailyLog,…}, settings, ui, schedule{study,exam}, latihanDone, latihanProgress, isAdmin`
- `audioBank/{id}` → `{downloadUrl?, storagePath?}` untuk audio ujian (hanya dibaca klien)

Sinkron: `core/sync.js` — gabung per item dengan cap waktu `u` (terbaru menang), transaksi Firestore, antrean ulang saat offline.

## Risiko yang sudah dicatat
- **Batas 1 MB per dokumen Firestore.** Seluruh progres dalam satu dokumen. Perkiraan wajar 150–600 KB; aman sekarang, tetapi perlu dipecah (mis. `users/{uid}/data/progress`, `…/latihan`) bila pengguna aktif bertahun-tahun. Keputusan ditunda; tidak ada migrasi karena Firebase baru.
- `js/app.js` 3374 baris dalam satu file → rawan tabrakan antar akun. Pemecahan per fitur dijadwalkan sebagai tugas tersendiri (lihat TUGAS-AKUN.md), bukan dilakukan sekarang karena fungsi saling memanggil.
- Gambar base64 di `data/strings.js` (4 gambar) sebaiknya pindah ke file gambar.
