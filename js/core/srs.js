/* srs.js */
/* HANYOU - penyempurnaan SRS (Leitner tetap, ditambah: batas kartu baru/hari,
   antrean ulang dalam sesi, dan statistik retensi). */
const SRS = (function () {
  const DEFAULT_NEW_PER_DAY = 15;
  const sessionSeen = new Set();   // id kartu yang sudah dinilai di sesi ini
  const retries = new Map();       // id -> berapa kali dimasukkan ulang

  const limit = () => {
    const v = DB.settings.newPerDay;
    return v === undefined || v === null ? DEFAULT_NEW_PER_DAY : Number(v); // 0 = tanpa batas
  };
  const newToday = () => ((DB.meta.dailyLog || {})[today()] || {}).newWords || 0;
  const remainingNew = () => (limit() === 0 ? Infinity : Math.max(0, limit() - newToday()));

  function capNew(list) {           // kartu baru dibatasi jatah harian; kartu lama tidak
    let r = remainingNew();
    return list.filter(w => {
      if (DB.progress[w.id]) return true;
      if (r > 0) { r--; return true; }
      return false;
    });
  }
  function resetSession() { sessionSeen.clear(); retries.clear(); }
  function beforeRate(w) { return { repeat: sessionSeen.has(w.id) }; }

  // "Belum" muncul lagi ~4 kartu kemudian, "Ragu" ~9 kartu kemudian (maks. 2x per kartu)
  function requeue(w, result) {
    sessionSeen.add(w.id);
    if (result === 'hafal') return false;
    const n = retries.get(w.id) || 0;
    if (n >= 2) return false;
    queue.splice(Math.min(queue.length, qIdx + 1 + (result === 'belum' ? 4 : 9)), 0, w);
    retries.set(w.id, n + 1);
    return true;
  }

  // retensi dihitung dari ulasan kartu lama yang bukan pengulangan dalam sesi
  function logReview(day, result, prevBox, wasNew, repeat) {
    const d = DB.meta.dailyLog[day];
    d[result] = (d[result] || 0) + 1;
    if (!wasNew && !repeat) {
      d.rev = (d.rev || 0) + 1;
      if (result === 'hafal') d.revOk = (d.revOk || 0) + 1;
      if ((prevBox || 0) >= 3) { d.mat = (d.mat || 0) + 1; if (result === 'hafal') d.matOk = (d.matOk || 0) + 1; }
    }
  }
  function retention(days) {
    let rev = 0, ok = 0, mat = 0, matOk = 0;
    for (let i = 0; i < days; i++) {
      const d = (DB.meta.dailyLog || {})[addDays(today(), -i)];
      if (!d) continue;
      rev += d.rev || 0; ok += d.revOk || 0; mat += d.mat || 0; matOk += d.matOk || 0;
    }
    return { rev, pct: rev ? Math.round(ok / rev * 100) : null, mat, matPct: mat ? Math.round(matOk / mat * 100) : null };
  }
  const dueCount = () => VOCAB.reduce((n, w) => n + (isDue(w) ? 1 : 0), 0);

  function renderCard() {
    const host = document.getElementById('progRingkasan');
    if (!host) return;
    let c = document.getElementById('srsStatsCard');
    if (!c) {
      c = document.createElement('div');
      c.id = 'srsStatsCard'; c.className = 'card srs-card';
      host.insertBefore(c, host.querySelector('.target-card') || null);
    }
    const r = retention(7), lim = limit(), nt = newToday();
    c.innerHTML =
      '<div class="target-head"><b>Ingatan jangka panjang</b><span>7 hari terakhir</span></div>' +
      '<div class="srs-grid">' +
      '<div><strong>' + (r.pct === null ? '–' : r.pct + '%') + '</strong><span>Retensi' + (r.rev ? ' (' + r.rev + ' ulasan)' : '') + '</span></div>' +
      '<div><strong>' + (r.matPct === null ? '–' : r.matPct + '%') + '</strong><span>Kartu matang (interval ≥4 hari)</span></div>' +
      '<div><strong>' + dueCount() + '</strong><span>Jatuh tempo hari ini</span></div>' +
      '<div><strong>' + nt + (lim ? ' / ' + lim : '') + '</strong><span>Kartu baru hari ini</span></div>' +
      '</div>' + (r.rev < 20 ? '<p class="srs-note">Angka retensi baru akurat setelah ±20 ulasan kartu lama.</p>' : '');
  }
  return { limit, remainingNew, capNew, resetSession, beforeRate, requeue, logReview, retention, renderCard };
})();
