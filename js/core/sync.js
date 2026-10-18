/* sync.js */
/* HANYOU - penyimpanan lokal aman + sinkron cloud per item.
   Aturan gabung (mergeStates): tiap item progres membawa cap waktu `u`; yang terbaru menang.
   Himpunan (soal selesai, badge) digabung sebagai gabungan; penghitung memakai nilai terbesar.
   Fungsi murni mergeStates tidak menyentuh DOM supaya bisa diuji terpisah. */
(function (root) {
  'use strict';

  const favTs = v => (v === true ? 1 : Number(v) || 0);
  const progTs = p => {
    if (!p) return -1;
    if (p.u) return p.u;
    const d = Date.parse(p.lastReview || '');
    return isNaN(d) ? 0 : d;
  };
  const maxObj = (a, b) => {
    const o = Object.assign({}, a || {});
    Object.keys(b || {}).forEach(k => { o[k] = Math.max(o[k] || 0, b[k] || 0); });
    return o;
  };

  function mergeStates(L, C, defaults) {
    L = L || {}; C = C || {}; defaults = defaults || {};
    // RESET AKUN: data (di sisi mana pun) yang terakhir diubah sebelum waktu reset dibuang, supaya tidak hidup lagi.
    const R = Math.max(L.resetAt || 0, C.resetAt || 0);
    if (R) {
      const blank = () => Object.assign({}, defaults, { resetAt: R, updatedAt: 0 });
      if (!L._keep && (L.updatedAt || 0) < R) L = blank();
      if (!C._keep && (C.updatedAt || 0) < R) C = blank();
    }
    const localNewer = (L.updatedAt || 0) >= (C.updatedAt || 0);
    const win = localNewer ? L : C, lose = localNewer ? C : L;
    const M = Object.assign({}, defaults, lose, win);

    M.settings = Object.assign({}, defaults.settings, lose.settings, win.settings);
    M.ui = Object.assign({}, defaults.ui, lose.ui, win.ui);

    M.progress = {};
    new Set([...Object.keys(L.progress || {}), ...Object.keys(C.progress || {})]).forEach(id => {
      const a = (L.progress || {})[id], b = (C.progress || {})[id];
      if (!a) M.progress[id] = b;
      else if (!b) M.progress[id] = a;
      else {
        const ta = progTs(a), tb = progTs(b);
        M.progress[id] = ta > tb ? a : tb > ta ? b : ((a.box || 0) >= (b.box || 0) ? a : b);
      }
    });

    M.tomb = maxObj(L.tomb, C.tomb);
    M.favorites = {};
    new Set([...Object.keys(L.favorites || {}), ...Object.keys(C.favorites || {})]).forEach(id => {
      const t = Math.max(favTs((L.favorites || {})[id]), favTs((C.favorites || {})[id]));
      if (t > (M.tomb['f:' + id] || 0)) M.favorites[id] = t;
    });

    const lm = L.meta || {}, cm = C.meta || {};
    M.meta = Object.assign({}, defaults.meta, cm, lm);
    ['totalAnswered', 'totalCorrect', 'xp'].forEach(k => { M.meta[k] = Math.max(lm[k] || 0, cm[k] || 0); });
    M.meta.dailyLog = {};
    new Set([...Object.keys(lm.dailyLog || {}), ...Object.keys(cm.dailyLog || {})]).forEach(day => {
      M.meta.dailyLog[day] = maxObj((lm.dailyLog || {})[day], (cm.dailyLog || {})[day]);
    });
    M.meta.weeklyDone = Object.assign({}, cm.weeklyDone, lm.weeklyDone);
    M.meta.badges = Object.assign({}, cm.badges, lm.badges);
    M.meta.gameBest = maxObj(lm.gameBest, cm.gameBest);
    M.meta.dirStats = {};
    new Set([...Object.keys(lm.dirStats || {}), ...Object.keys(cm.dirStats || {})]).forEach(k => { const a = (lm.dirStats || {})[k] || {}, b = (cm.dirStats || {})[k] || {}; M.meta.dirStats[k] = { n: Math.max(a.n || 0, b.n || 0), ok: Math.max(a.ok || 0, b.ok || 0) }; });
    const lmLast = lm.lastDate || '', cmLast = cm.lastDate || '';
    const sMeta = lmLast > cmLast ? lm : cmLast > lmLast ? cm : { streak: Math.max(lm.streak || 0, cm.streak || 0), lastDate: lmLast };
    M.meta.streak = sMeta.streak || 0; M.meta.lastDate = sMeta.lastDate || null;

    /* Progres latihan = gabungan dua sisi, kecuali paket yang di-reset ("Ulangi dari Awal"):
       salinan yang lebih tua dari waktu reset (tomb 'lp:<paket>|<bagian>') tidak boleh menghidupkan progres lama. */
    const resetAt = key => M.tomb['lp:' + key] || 0;
    const fresh = (side, key) => !resetAt(key) || (side.updatedAt || 0) >= resetAt(key);
    const keyOfDone = k => k.replace(/-\d+$/, '');
    M.latihanDone = {};
    [C, L].forEach(side => Object.keys(side.latihanDone || {}).forEach(k => { if (fresh(side, keyOfDone(k))) M.latihanDone[k] = side.latihanDone[k]; }));
    M.latihanProgress = {};
    new Set([...Object.keys(L.latihanProgress || {}), ...Object.keys(C.latihanProgress || {})]).forEach(k => {
      M.latihanProgress[k] = Object.assign({}, fresh(C, k) ? (C.latihanProgress || {})[k] : null, fresh(L, k) ? (L.latihanProgress || {})[k] : null);
    });

    const ex = {};
    [...(C.exams || []), ...(L.exams || [])].forEach(e => { if (e && e.ts) ex[e.ts] = e; });
    M.exams = Object.values(ex).sort((a, b) => b.ts - a.ts).slice(0, 50);

    M.hskBest = maxObj(L.hskBest, C.hskBest);
    M.schedule = { study: [], exam: [] };
    ['study', 'exam'].forEach(kind => {
      const byId = new Map();
      [C, L].forEach(side => ((side.schedule || {})[kind] || []).forEach(r => { if (r && r.id != null) byId.set(String(r.id), r); }));
      byId.forEach((r, id) => { if (!M.tomb['sc:' + kind + ':' + id]) M.schedule[kind].push(r); });
      M.schedule[kind].sort((a, b) => Number(a.id) - Number(b.id));
    });
    M.badges = Object.assign({}, C.badges, L.badges); // lencana: gabungan dua sisi, tidak ada yang hilang

    M.updatedAt = Math.max(L.updatedAt || 0, C.updatedAt || 0);
    if (R) M.resetAt = R;
    delete M._keep;
    return M;
  }
  root.mergeStates = mergeStates;
  if (typeof module !== 'undefined') module.exports = { mergeStates };
  if (typeof document === 'undefined') return; // lingkungan uji Node

  /* ---------------- status & UI ---------------- */
  const SYNC = root.HANYOU_SYNC = { state: 'local', last: 0 };
  const LABEL = { local: '', idle: 'Tersimpan di perangkat', pending: 'Menunggu sinkron…', syncing: 'Menyinkronkan…',
    ok: 'Tersinkron', memory: 'Progres sementara · ketuk', error: 'Gagal sinkron · ketuk untuk ulang', offline: 'Offline · disimpan di perangkat' };
  let chip, banner, bannerSnooze = 0, storageBlocked = false, blockedNotified = false, localFail = false, retryTimer = null, retryN = 0, cloudTimer = null, busy = false;
  const dirtyGet = () => { try { return localStorage.getItem(KEY+':dirty') === '1'; } catch (e) { return false; } };
  const dirtySet = v => { try { localStorage.setItem(KEY+':dirty', v ? '1' : '0'); } catch (e) {} };

  function ensureUI() {
    if (chip) return;
    chip = document.createElement('button');
    chip.type = 'button'; chip.id = 'syncChip'; chip.className = 'sync-chip';
    chip.setAttribute('role', 'status'); chip.setAttribute('aria-live', 'polite');
    chip.addEventListener('click', () => {
      if (SYNC.state === 'memory') toast('Penyimpanan browser diblokir (pratinjau/mode privat). Buka lewat browser biasa atau hosting agar progres tersimpan.');
      else if (SYNC.state === 'error' || SYNC.state === 'offline') flushNow();
    });
    document.body.appendChild(chip);
    banner = document.createElement('div');
    banner.id = 'saveBanner'; banner.className = 'save-banner'; banner.setAttribute('role', 'alert'); banner.hidden = true;
    banner.innerHTML = '<span></span><button type="button" class="sb-export">Ekspor cadangan</button><button type="button" class="sb-close" aria-label="Tutup peringatan">✕</button>';
    banner.querySelector('.sb-export').addEventListener('click', () => root.exportBackup());
    banner.querySelector('.sb-close').addEventListener('click', () => { banner.hidden = true; bannerSnooze = Date.now() + 600000; });
    document.body.appendChild(banner);
  }
  function setState(s) {
    SYNC.state = s;
    ensureUI();
    chip.dataset.state = s;
    const lbl = (LABEL[s] || '') + (s === 'error' && SYNC.err ? ' [' + SYNC.err + ' · ' + (SYNC.step || '?') + ']' : '');
    chip.textContent = lbl;
    chip.title = (s === 'error' && SYNC.errMsg) ? SYNC.errMsg : '';
    chip.hidden = !(s === 'error' || s === 'offline' || s === 'memory'); // status normal cukup di menu Profil
    const el = document.getElementById('acctSyncStatus');
    if (el) el.textContent = ((LABEL[s] || 'Mode lokal (tanpa akun)') + (s === 'error' && SYNC.err ? ' [' + SYNC.err + ' · ' + (SYNC.step || '?') + '] · UID: ' + (SYNC.uid || '?') + ' · ' + (SYNC.dbg || '') : '')) + (SYNC.last ? ' · terakhir ' + new Date(SYNC.last).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '');
  }
  root.hanyouSyncRefreshUI = () => setState(SYNC.state);

  /* ---------------- simpan lokal: kegagalan tidak lagi diam-diam ---------------- */
  // true jika browser mengizinkan penulisan (di pratinjau/iframe ber-sandbox localStorage bisa dilarang total)
  function storageWorks() {
    try { const k = '__hanyou_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
  }
  root.persistLocal = function (bumpStamp) {
    if (bumpStamp !== false) DB.updatedAt = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(DB));
      if (localFail) { localFail = false; if (banner) banner.hidden = true; }
      if (storageBlocked) { storageBlocked = false; setState(SYNC.state === 'memory' ? 'local' : SYNC.state); }
      return true;
    } catch (e) {
      ensureUI();
      if (!storageWorks()) {            // diblokir total: mode sementara, tanpa banner yang mengganggu
        storageBlocked = true; localFail = false; banner.hidden = true;
        if (SYNC.state === 'local' || SYNC.state === 'idle') setState('memory');
        if (!blockedNotified) { blockedNotified = true; toast('Penyimpanan browser diblokir (pratinjau/mode privat): progres hanya sementara. Buka lewat browser biasa agar tersimpan.'); }
        return false;
      }
      localFail = true;                 // diizinkan tapi gagal menulis: kemungkinan penuh
      banner.querySelector('span').textContent = 'Penyimpanan perangkat penuh: progres terbaru belum tersimpan.';
      if (Date.now() > bannerSnooze) banner.hidden = false;
      console.error('[HANYOU] gagal menyimpan lokal', e);
      return false;
    }
  };
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  /* ---------------- cloud ---------------- */
  const cloudUser = () => (root.MMPFirebase && root.MMPFirebase.db && root.MMPFirebase.auth && root.MMPFirebase.auth.currentUser) || null;

  root.scheduleCloudSave = function () {
    dirtySet(true);
    const u = cloudUser();
    if (!u || root.MMP_LOCAL_PREVIEW) { setState(storageBlocked ? 'memory' : 'local'); return; }
    if (!navigator.onLine) { setState('offline'); return; }
    setState('pending');
    clearTimeout(cloudTimer);
    cloudTimer = setTimeout(() => pushToCloud(u.uid), 1500);
  };

  async function pushToCloud(uid) {
    const u = cloudUser();
    if (!u || u.uid !== uid) return false;
    if (busy) { clearTimeout(cloudTimer); cloudTimer = setTimeout(() => pushToCloud(uid), 1500); return false; }
    busy = true; setState('syncing');
    let step = 'mulai';
    try {
      const db = root.MMPFirebase.db, ref = db.collection('users').doc(uid);
      const merged = await db.runTransaction(async tx => {
        if (!cloudUser() || cloudUser().uid !== uid) throw new Error('akun-berganti');
        step = 'baca';
        const snap = await tx.get(ref);
        const cd = snap.exists ? snap.data() : null;
        const m = mergeStates(DB, cd, defaultState());

        // KEAMANAN: status admin hanya boleh berasal dari Cloud Firestore.
        // LocalStorage/perangkat lain tidak boleh menaikkan hak menjadi admin.
        // Akun baru selalu dibuat sebagai non-admin.
        m.isAdmin = !!(cd && cd.isAdmin === true);

        m.updatedAt = Math.max(m.updatedAt || 0, Date.now());
        step = 'tulis';
        SYNC.dbg = 'dokumen cloud: ' + (cd ? 'ada' : 'belum ada') + ' · isAdmin cloud: ' + (cd && 'isAdmin' in cd ? String(cd.isAdmin) : '-') + ' · isAdmin dikirim: ' + ('isAdmin' in m ? String(m.isAdmin) : '-');

        // FIRESTORE GUARD: Firestore menolak nilai undefined dengan error
        // invalid-argument. Data lokal lama/hasil merge dapat memiliki field
        // undefined meskipun JSON/localStorage terlihat normal. Bersihkan
        // hanya nilai undefined; data valid lainnya tidak diubah. Array
        // undefined dibuat null agar indeks array tetap utuh.
        const cleanForFirestore = (value, seen) => {
          if (value === undefined) return null;
          if (value === null) return null;
          if (typeof value !== 'object') return value;
          seen = seen || new WeakSet();
          if (seen.has(value)) return null;
          if (value instanceof Date) return value;
          seen.add(value);
          if (Array.isArray(value)) return value.map(v => cleanForFirestore(v, seen));
          const o = {};
          Object.keys(value).forEach(k => {
            if (value[k] !== undefined) o[k] = cleanForFirestore(value[k], seen);
          });
          return o;
        };
        const safeM = cleanForFirestore(m);
        tx.set(ref, safeM);
        return safeM;
      });
      if (!cloudUser() || cloudUser().uid !== uid) return false; // akun berganti selama sinkron
      DB = mergeStates(DB, merged, defaultState()); // perubahan selama transaksi tidak hilang
      root.persistLocal(false);
      dirtySet(false); retryN = 0; SYNC.last = Date.now(); SYNC.err = ''; setState('ok');
      return true;
    } catch (e) {
      if (e && e.message === 'akun-berganti') return false;
      console.error('[HANYOU] sinkron gagal', e);
      SYNC.err = (e && (e.code || e.name)) || 'unknown'; SYNC.errMsg = (e && e.message) || ''; SYNC.step = step; SYNC.uid = uid;
      setState(navigator.onLine ? 'error' : 'offline');
      const wait = Math.min(300000, 5000 * Math.pow(2, retryN++));
      clearTimeout(retryTimer); retryTimer = setTimeout(flushNow, wait);
      return false;
    } finally { busy = false; }
  }
  function flushNow() {
    const u = cloudUser();
    if (u && !root.MMP_LOCAL_PREVIEW) pushToCloud(u.uid);
  }

  // Reset progres akun yang sedang aktif (lokal + cloud). Pengaturan & tampilan dipertahankan.
  root.resetAccountProgress = async function () {
    const u = cloudUser();
    const who = u ? (u.email || u.displayName || 'akun ini') : 'perangkat ini (mode lokal)';
    if (!confirm('Reset SEMUA progres untuk ' + who + '?\n\nKosakata, latihan soal, XP, streak, lencana, riwayat ujian, dan jadwal akan kembali ke nol. Ini tidak bisa dibatalkan.\n\nTips: unduh backup dulu bila perlu.')) return;
    if (!confirm('Yakin? Progres ' + who + ' akan dihapus permanen, juga dari cloud.')) return;
    const R = Date.now(), keep = { settings: DB.settings, ui: DB.ui };
    DB = Object.assign(defaultState(), keep, { resetAt: R, updatedAt: R });
    root.persistLocal(false);
    dirtySet(true);
    if (typeof init === 'function') init();
    if (u && !root.MMP_LOCAL_PREVIEW) {
      setState('syncing');
      const ok = await pushToCloud(u.uid);
      toast(ok ? 'Progres akun direset.' : 'Progres direset di perangkat. Cloud akan menyusul saat tersambung.');
    } else toast('Progres direset.');
    const m = document.getElementById('accountModal'); if (m) m.classList.remove('open');
  };

  // setelah login: gabung dua arah (tidak ada yang ditimpa)
  root.pullFromCloud = async function (uid) {
    const u = cloudUser();
    if (!u || u.uid !== uid) return;
    const sig = () => JSON.stringify([Object.keys(DB.progress).length, DB.meta.xp, ((DB.schedule || {}).study || []).map(r => r.id), ((DB.schedule || {}).exam || []).map(r => r.id), Object.keys(DB.latihanDone || {}).length, Object.keys(DB.favorites || {}).length, (DB.exams || []).length, Object.keys(DB.badges || {}).length]);
    const before = sig();
    const ok = await pushToCloud(uid);
    if (ok) {
      if (typeof init === 'function' && before !== sig()) init();
      toast('Progres tersinkron dengan cloud.');
    } else toast('Cloud belum terhubung. Progres aman di perangkat dan disinkron nanti.');
  };

  window.addEventListener('online', () => { if (dirtyGet()) flushNow(); else setState(cloudUser() ? 'ok' : 'local'); });
  window.addEventListener('offline', () => { if (cloudUser()) setState('offline'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && cloudUser() && dirtyGet() && navigator.onLine) flushNow(); });

  /* ---------------- cadangan (UI & sanitasi dari versi pengguna, digabung via mergeStates) ---------------- */
  const BAD = new Set(['__proto__', 'constructor', 'prototype']);
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const keysOf = o => Object.keys(o).filter(k => !BAD.has(k));
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

  function sanitizeBackup(d) {
    if (!isObj(d) || !isObj(d.progress)) throw new Error('format');
    const c = { progress: {}, favorites: {}, latihanDone: {}, latihanProgress: {}, meta: {}, exams: [], hskBest: {}, updatedAt: 0 };
    const STATUS = ['baru', 'belum', 'ragu', 'hafal'];
    keysOf(d.progress).forEach(k => {
      const v = d.progress[k]; if (!isObj(v)) return;
      const p = { status: STATUS.includes(v.status) ? v.status : 'baru', box: Math.max(0, Math.min(6, num(v.box))),
        due: v.due ? String(v.due) : null, lastReview: v.lastReview ? String(v.lastReview) : null };
      if (num(v.u) > 0) p.u = num(v.u);
      c.progress[k] = p;
    });
    ['favorites', 'latihanDone'].forEach(f => { if (isObj(d[f])) keysOf(d[f]).forEach(k => { if (d[f][k]) c[f][k] = f === 'favorites' ? (num(d[f][k]) || 1) : true; }); });
    if (isObj(d.latihanProgress)) keysOf(d.latihanProgress).forEach(k => {
      if (isObj(d.latihanProgress[k])) { c.latihanProgress[k] = {}; keysOf(d.latihanProgress[k]).forEach(n => { if (d.latihanProgress[k][n]) c.latihanProgress[k][n] = true; }); }
    });
    if (isObj(d.meta)) {
      const m = d.meta;
      ['totalAnswered', 'totalCorrect', 'xp', 'streak'].forEach(k => { c.meta[k] = Math.max(0, num(m[k])); });
      c.meta.lastDate = m.lastDate ? String(m.lastDate) : null;
      c.meta.dailyLog = {};
      if (isObj(m.dailyLog)) keysOf(m.dailyLog).forEach(day => { if (isObj(m.dailyLog[day])) { c.meta.dailyLog[day] = {}; keysOf(m.dailyLog[day]).forEach(f => { c.meta.dailyLog[day][f] = Math.max(0, num(m.dailyLog[day][f])); }); } });
      c.meta.gameBest = {}; if (isObj(m.gameBest)) keysOf(m.gameBest).forEach(k => { c.meta.gameBest[k] = Math.max(0, num(m.gameBest[k])); });
      ['weeklyDone', 'badges'].forEach(f => { c.meta[f] = {}; if (isObj(m[f])) keysOf(m[f]).forEach(k => { if (m[f][k]) c.meta[f][k] = m[f][k] === true ? true : num(m[f][k]) || true; }); });
    }
    if (Array.isArray(d.exams)) c.exams = d.exams.filter(e => isObj(e) && num(e.ts) > 0 && num(e.total) >= 0).slice(0, 50);
    c.schedule = { study: [], exam: [] };
    if (isObj(d.schedule)) ['study', 'exam'].forEach(kind => {
      if (!Array.isArray(d.schedule[kind])) return;
      d.schedule[kind].slice(0, 300).forEach(r => {
        if (!isObj(r) || !num(r.id) || !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date || ''))) return;
        const t = k => String(r[k] == null ? '' : r[k]).slice(0, 200);
        c.schedule[kind].push({ id: num(r.id), hsk: t('hsk'), title: t('title'), chapter: num(r.chapter), chapterTitle: t('chapterTitle'), date: t('date'), time: t('time').slice(0, 5), note: t('note') });
      });
    });
    c.badges = {}; if (isObj(d.badges)) keysOf(d.badges).forEach(k => { if (d.badges[k]) c.badges[k] = String(d.badges[k]).slice(0, 40); });
    if (isObj(d.hskBest)) keysOf(d.hskBest).forEach(k => { c.hskBest[k] = Math.max(0, Math.min(100, num(d.hskBest[k]))); });
    return c; // pengaturan & tampilan perangkat ini sengaja tidak ditimpa (updatedAt=0)
  }

  root.exportBackup = function () {
    try {
      const blob = new Blob([JSON.stringify({ app: 'hanyou', version: 1, exportedAt: new Date().toISOString(), data: DB })], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'hanyou-backup-' + today() + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast('Backup diunduh.');
    } catch (e) { console.error(e); toast('Backup gagal dibuat.'); }
  };
  root.importBackup = function (file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('File terlalu besar untuk backup HANYOU.'); return; }
    const r = new FileReader();
    r.onerror = () => toast('File tidak bisa dibaca.');
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result || ''));
        const clean = sanitizeBackup(isObj(obj) && (obj.data || obj.state) ? (obj.data || obj.state) : obj);
        clean._keep = true; // backup yang sengaja dipulihkan tidak boleh dibuang oleh penanda reset
        const n = Object.keys(clean.progress).length;
        if (!confirm('Gabungkan backup ini (' + n + ' kata) ke progres yang ada sekarang?')) return;
        DB = mergeStates(DB, clean, defaultState());
        save(); init();
        toast('Backup berhasil dipulihkan (' + n + ' kata).');
      } catch (e) { console.error(e); toast('File bukan backup HANYOU yang valid.'); }
    };
    r.readAsText(file);
  };
  const bindBackup = () => {
    const exp = document.getElementById('backupExportBtn'), btn = document.getElementById('backupImportBtn'), fileEl = document.getElementById('backupImportFile');
    if (exp) exp.addEventListener('click', () => root.exportBackup());
    const rst = document.getElementById('resetProgressBtn');
    if (rst) rst.addEventListener('click', () => root.resetAccountProgress());
    if (btn && fileEl) btn.addEventListener('click', () => fileEl.click());
    if (fileEl) fileEl.addEventListener('change', () => { root.importBackup(fileEl.files && fileEl.files[0]); fileEl.value = ''; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindBackup); else bindBackup();
})(typeof window !== 'undefined' ? window : globalThis);
