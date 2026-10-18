// Inisialisasi Firebase (memakai firebaseConfig dari js/config/firebase-config.js).
// Local test mode: opening this HTML directly from a downloaded file (file:// / content://)
// bypasses Firebase login so the UI/features can be tested before any Hosting deploy. Cloud sync remains off.
const MMP_LOCAL_PREVIEW = (location.protocol === 'file:' || location.protocol === 'content:' || location.protocol === 'blob:');
window.MMP_LOCAL_PREVIEW = MMP_LOCAL_PREVIEW;

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDB = null;

try {
  firebaseApp = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
  firebaseAuth = firebase.auth();
  firebaseDB = firebase.firestore();
  let firebaseStorage = null;
  try{ firebaseStorage = firebase.storage(); }catch(e){ console.error('[MMP Storage] gagal init', e); }
  window.MMPFirebase = { app: firebaseApp, auth: firebaseAuth, db: firebaseDB, storage: firebaseStorage, config: firebaseConfig, connected: true };
  console.info('[Mandarin Mastery Pro] Firebase initialized:', firebaseApp.options.projectId);
} catch (error) {
  window.MMPFirebase = { app: null, auth: null, db: null, storage: null, config: firebaseConfig, connected: false, error };
  console.error('[Mandarin Mastery Pro] Firebase initialization failed:', error);
}
