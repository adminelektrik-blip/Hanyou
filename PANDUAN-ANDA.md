# PANDUAN ANDA — urutan yang dijalankan satu per satu

Cara "menghubungkan" 4 akun: akun Claude tidak bisa saling terhubung, jadi tidak dipaksakan. Yang menyatukan mereka adalah
(1) perintah dan aturan yang sama (`ATURAN-TIM.md`), (2) batch yang berbeda-beda sehingga tidak mungkin tumpang tindih,
(3) satu pengontrol (Claude di chat utama) yang memeriksa dan menggabungkan, (4) satu repo GitHub sebagai sumber kebenaran.
Akun pekerja tidak pernah menyentuh repo.

## BAGIAN A — Firebase baru (sekali, sekitar 15 menit, dari browser tablet)
- [ ] A1. Buka console.firebase.google.com, masuk dengan akun Google yang dipakai khusus untuk Hanyou.
- [ ] A2. Add project → nama `hanyou-app` (atau bebas) → matikan Google Analytics jika ditanya → Create.
- [ ] A3. Build → **Authentication** → Get started → aktifkan **Email/Password** dan **Google**.
- [ ] A4. Build → **Firestore Database** → Create database → mode **production** → region `asia-southeast2` (Jakarta).
- [ ] A5. Tab **Rules** → hapus isi → tempel isi file `firestore.rules` → **Publish**.
- [ ] A6. Build → **Hosting** → Get started → klik Next sampai selesai (jangan jalankan perintah apa pun).
- [ ] A7. Lewati **Storage** (bisa meminta paket berbayar; audio memakai Hosting).
- [ ] A8. Project settings (ikon roda gigi) → Your apps → ikon web `</>` → beri nama → Register app → **salin blok `firebaseConfig`**.
- [ ] A9. Project settings → **Service accounts** → **Generate new private key** → simpan file JSON (jangan dikirim ke siapa pun, termasuk ke saya).
- [ ] A10. **Kirim ke saya di chat utama:** Project ID + blok `firebaseConfig` dari A8 (aman, memang publik). Saya kembalikan paket final yang sudah terisi.

## BAGIAN B — GitHub (sekali; tanpa komputer)
- [ ] B1. Repo `Hanyou` → **Add file → Create new file** → nama: `.github/workflows/impor-paket.yml` → tempel isi file `impor-paket.yml` → Commit.
- [ ] B2. **Add file → Upload files** → unggah `hanyou-v20.zip` (paket final dari saya) ke akar repo → Commit.
- [ ] B3. Tab **Actions → Impor paket → Run workflow**. Tunggu hijau; semua folder muncul di repo.
- [ ] B4. **Add file → Create new file** → nama: `.github/workflows/deploy.yml` → tempel isi `deploy.yml` (project ID sudah saya isi) → Commit.
- [ ] B5. Repo **Settings → Secrets and variables → Actions → New repository secret**
      Nama `FIREBASE_SERVICE_ACCOUNT`, isi: seluruh isi file JSON dari A9. Setelah tersimpan, hapus file JSON dari perangkat.
- [ ] B6. Tab Actions → **Deploy Firebase Hosting** → Re-run (atau commit kecil apa pun). Hijau = web live di `https://<project-id>.web.app`.
- [ ] B7. Firebase Console → Authentication → Settings → **Authorized domains**: pastikan `<project-id>.web.app` ada.
Jika deploy gagal "permission denied": Google Cloud Console → IAM → akun `firebase-adminsdk-…` → tambah peran **Firebase Hosting Admin**.

## BAGIAN C — Menjalankan 4 akun (satu per satu)
Setiap akun punya 4 batch (±90 kalimat per batch). Satu batch = satu chat baru.

| Akun | Cakupan | Batch |
|---|---|---|
| 1 | HSK 1–2 | batch-01 … batch-04 |
| 2 | HSK 2 dan HSK 4 awal | batch-01 … batch-04 |
| 3 | HSK 4 tengah | batch-01 … batch-04 |
| 4 | HSK 4 akhir dan HSK 5 | batch-01 … batch-04, plus `batch-baru.txt` (4 kalimat baru) |

Langkah tiap batch:
1. Masuk ke akun Claude ke-N → **chat baru**.
2. Tempel isi `tugas/akunN/PERINTAH.txt`, lalu di pesan yang sama tempel isi `batch-0X.txt` → kirim.
3. Jika jawaban terpotong, ketik `lanjut`.
4. Salin seluruh jawaban. Kirim ke saya di chat utama dengan label, mis.: `akun1 batch-01` lalu hasilnya.
5. Lanjut batch berikutnya di chat baru. Jangan mengerjakan batch yang sama di dua akun.

## BAGIAN D — Pemeriksaan dan penayangan (saya yang kerjakan, Anda yang menentukan)
1. Saya periksa tiap batch dengan alat otomatis (kunci lengkap, tidak ada hanzi/arti-per-kata, format) dan membaca contoh acak.
2. Batch lolos saya gabung ke `data/examples.js`; yang ditolak saya kembalikan dengan daftar perbaikan untuk akun yang sama.
3. Saya kirim file `data/examples.js` terbaru. Anda unggah ke repo: buka folder `data` → Add file → Upload files → pilih
   **Create a new branch and start a pull request**.
4. GitHub Actions membuat link **preview**. Anda cek di tablet. Jika setuju (ACC) → **Merge pull request** → otomatis tayang.
