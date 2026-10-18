/* practice.js */
/* HANYOU - latihan bebas: skor skala HSK setelah "Periksa semua" + timer opsional.
   (Dari versi pengguna, diintegrasikan langsung; simulasi ujian penuh ada di exam.js.) */
const PRACTICE = (function () {
  const MIN = { mendengar: 30, membaca: 40, menulis: 25 };
  let tId = null, left = 0, pill = null;
  const fmt = t => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');

  /* skor skala HSK: benar/total x 100 per bagian (perkiraan; skala resmi tidak dipublikasikan) */
  function scoreHtml(cat, correct, total) {
    if (!total) return '';
    const sc = Math.round(correct / total * 100);
    DB.hskBest = DB.hskBest || {};
    DB.hskBest[cat] = Math.max(DB.hskBest[cat] || 0, sc);
    save();
    const best = DB.hskBest, parts = ['mendengar', 'membaca'].filter(c => best[c] != null);
    const sum = parts.reduce((a, c) => a + best[c], 0);
    let h = '<span style="display:block;margin-top:8px"><b>Skala ' + ((typeof latihanSet !== 'undefined' && latihanSet && latihanSet.level) || 'HSK 4') + ': ' + sc + ' / 100</b> (' + LATIHAN_LABELS[cat] + ' ini) · terbaik: ' + best[cat] + '</span>';
    if (parts.length) h += '<span style="display:block;margin-top:4px">Total sementara ' + parts.map(c => LATIHAN_LABELS[c]).join(' + ') + ': <b>' + sum + ' / ' + parts.length * 100 + '</b> · batas lulus ' + ((typeof latihanSet !== 'undefined' && latihanSet && latihanSet.level) || 'HSK 4') + ' = 180 / 300 (60%)</span>';
    h += '<span style="display:block;margin-top:4px;font-size:12px;color:var(--muted)">Menulis dinilai manual. Skor ini perkiraan, bukan skor resmi.</span>';
    return h;
  }

  function ensurePill() {
    if (pill) return pill;
    pill = document.createElement('button'); pill.type = 'button'; pill.id = 'examTimerPill'; pill.hidden = true;
    pill.addEventListener('click', () => (tId ? stop(true) : start()));
    document.body.appendChild(pill); return pill;
  }
  function paint() {
    pill.textContent = tId ? '⏱ ' + fmt(left) + ' · berhenti' : '⏱ Timer latihan ' + (MIN[latihanCat] || 40) + ' mnt';
    pill.classList.toggle('urgent', !!tId && left <= 300);
  }
  function start() {
    left = (MIN[latihanCat] || 40) * 60; clearInterval(tId);
    tId = setInterval(() => {
      left--; paint();
      if (left <= 0) { stop(false); try { syncCurrentLatihanProgress(); } catch (e) {} toast('⏰ Waktu habis! Jawabanmu sudah tersimpan.'); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    }, 1000);
    paint(); toast('Timer latihan dimulai.');
  }
  function stop(manual) { clearInterval(tId); tId = null; if (pill) paint(); if (manual) toast('Timer dihentikan.'); }

  // dipanggil dari openLatihanSession / closeLatihanSession; saat Simulasi Ujian aktif, timer ujian yang dipakai
  function onOpen() { ensurePill(); stop(false); pill.hidden = (typeof EXAM !== 'undefined' && EXAM.active()); paint(); }
  function onClose() { if (pill) { stop(false); pill.hidden = true; } }
  return { scoreHtml, onOpen, onClose };
})();
