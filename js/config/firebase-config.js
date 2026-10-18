// >>> SATU-SATUNYA file yang diganti saat pindah akun/proyek Firebase <<<
// Firebase Console > Project settings (ikon roda gigi) > Your apps > Web app > "SDK setup and configuration" > Config.
// Tempel nilainya di bawah. (apiKey web Firebase memang publik; keamanan ada di firestore.rules dan storage.rules.)
const firebaseConfig = {
  apiKey: "ISI_DARI_FIREBASE_CONSOLE",
  authDomain: "ISI-PROJECT-ID.firebaseapp.com",
  projectId: "ISI-PROJECT-ID",
  storageBucket: "ISI-PROJECT-ID.firebasestorage.app",
  messagingSenderId: "ISI",
  appId: "ISI",
  measurementId: "ISI_JIKA_ADA"
};
