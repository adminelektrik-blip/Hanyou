# Setup Firebase baru (bisa dari tablet/HP lewat browser)

## 1. Buat proyek
1. console.firebase.google.com → **Add project** (nama bebas, mis. `hanyou-app`).
2. **Build → Authentication → Get started** → aktifkan **Email/Password** dan **Google**.
   Tab **Settings → Authorized domains**: pastikan `<project-id>.web.app` ada.
3. **Build → Firestore Database → Create database** (mode production, region terdekat, mis. `asia-southeast2`).
4. **Storage: LEWATI.** Firebase dapat meminta paket berbayar (Blaze) untuk Storage. Tidak perlu: audio ujian cukup diletakkan di folder `audio/` pada repo dan dilayani lewat Hosting (pemutar mencoba Hosting lebih dulu).
5. **Build → Hosting → Get started** (cukup sampai halaman pertama; deploy dilakukan GitHub).

## 2. Hubungkan aplikasi
1. Project settings → **Your apps → Web (`</>`)** → daftarkan → salin objek `firebaseConfig`.
2. Tempel ke `js/config/firebase-config.js` (hanya file ini yang diganti).

## 3. Pasang aturan keamanan
Firestore Database → **Rules** → tempel isi `firestore.rules` → Publish.
(Storage dilewati, jadi `storage.rules` tidak dipakai.)

## 4. Deploy otomatis (GitHub → Firebase)
1. Firebase Console → Project settings → **Service accounts → Generate new private key** → unduh JSON.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**
   Nama: `FIREBASE_SERVICE_ACCOUNT`, isi: seluruh isi file JSON tadi. Lalu hapus file JSON dari perangkat.
3. Ganti `ISI-PROJECT-ID` di kedua file `.github/workflows/*.yml` dengan project ID.
4. Alur harian: akun pekerja → cabang + Pull Request → GitHub membuat **link preview** → Anda cek → **Merge** → otomatis live di `https://<project-id>.web.app`.

## 5. Audio ujian
Unggah mp3 ke folder `audio/` di repo (mis. `audio/H41218.mp3`). Pemutar mencoba Hosting dulu. Catatan: jatah transfer Hosting gratis terbatas, jadi audio besar sebaiknya dicicil.

## 6. Menjadikan akun admin
Hanya lewat Console: Firestore → `users/<uid>` → set `isAdmin: true`. Aturan melarang klien mengubahnya.
