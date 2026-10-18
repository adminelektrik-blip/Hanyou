/* exam.js */
/* HANYOU - Simulasi Ujian HSK 4: 3 bagian berurutan, berpewaktu, tanpa koreksi sampai selesai.
   Skor per bagian = benar/total x 100 (estimasi; skala konversi resmi HSK tidak dipublikasikan). */
const EXAM = (function () {
  const SECTIONS = [
    { cat: 'mendengar', min: 30, label: 'Mendengar' },
    { cat: 'membaca', min: 40, label: 'Membaca' },
    { cat: 'menulis', min: 25, label: 'Menulis' }
  ];
  const PASS = 180;

  /* Pengaturan durasi per bagian (menit). Nilai standar = SECTIONS[].min; pilihan pengguna disimpan di perangkat. */
  const DUR_MIN = 1, DUR_MAX = 180;
  const acct = () => (typeof ACTIVE_UID !== 'undefined' && ACTIVE_UID) || 'anon';
  const durKey = () => 'mmp.examDur.v1:' + acct();
  let durs = null, dursUid = null;
  function loadDurs() {
    let saved = {}; const o = {};
    try { saved = JSON.parse(localStorage.getItem(durKey()) || '{}') || {}; } catch (e) {}
    SECTIONS.forEach(s => { const v = Math.round(Number(saved[s.cat])); o[s.cat] = v >= DUR_MIN && v <= DUR_MAX ? v : s.min; });
    return o;
  }
  function saveDurs() { try { localStorage.setItem(durKey(), JSON.stringify(durs)); } catch (e) {} }
  const minsOf = s => ((durs && dursUid === acct()) ? durs : (dursUid = acct(), durs = loadDurs()))[s.cat];
  const totalMins = () => SECTIONS.reduce((n, s) => n + minsOf(s), 0);
  let st = null, timer = null, overlay = null, practice = null;

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const btn = (text, cls, fn) => { const b = h('button', cls || 'exam-btn', text); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const row = (...b) => { const r = h('div', 'exam-actions'); b.forEach(x => r.appendChild(x)); return r; };
  const stack = r => { r.classList.add('stack'); return r; };

  function openOverlay(title, nodes, headExtra) {
    closeOverlay();
    overlay = h('div', 'exam-overlay');
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    const box = h('div', 'exam-box');
    if (headExtra) { const hd = h('div', 'exam-head'); hd.append(h('h3', '', title), headExtra); box.appendChild(hd); }
    else box.appendChild(h('h3', '', title));
    nodes.forEach(n => box.appendChild(n));
    overlay.appendChild(box); document.body.appendChild(overlay);
    const f = box.querySelector('button'); if (f) f.focus();
  }
  function closeOverlay() { if (overlay) { overlay.remove(); overlay = null; } }

  function scoreSection(cat, set, ans) {
    const parts = []; let c = 0, t = 0, un = 0;
    set.parts.forEach(part => {
      if (part.type === 'write') return; // dinilai manual
      let pc = 0;
      part.items.forEach(it => {
        const key = cat + '-' + it.no, a = ans[key];
        let ok = false, empty = a === undefined || a === null || a === '';
        if (part.type === 'tf') ok = !empty && (a === 'true') === it.answer;
        else if (part.type === 'mc') ok = !empty && Number(a) === it.answer;
        else if (part.type === 'arrange') { const sq = ans[key + '-seq'] || []; empty = !sq.length; ok = !empty && [it.answer].concat(it.alts || []).some(x => normalizeCn(sq.join('')) === normalizeCn(x)); }
        else ok = !empty && a === it.answer;
        if (empty) un++;
        if (ok) pc++;
      });
      parts.push({ title: part.title, c: pc, t: part.items.length }); c += pc; t += part.items.length;
    });
    return { cat, c, t, pct: t ? Math.round(c / t * 100) : 0, un, parts };
  }

  const lastResult = id => (DB.exams || []).find(e => e.paket === id) || null;

  function renderEntry(paketId) {
    const box = document.getElementById('latihanPaketExamBox');
    if (!box) return;
    box.textContent = '';
    const last = lastResult(paketId);
    const b = h('button', 'menu-row exam-entry'); b.type = 'button';
    const mi = h('div', 'mi'); mi.style.cssText = 'background:var(--redSoft);color:var(--red)';
    mi.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-clock"/></svg>';
    const mt = h('div', 'mt');
    mt.appendChild(h('b', '', 'Simulasi Ujian'));
    mt.appendChild(h('span', '', last ? 'Terakhir ' + last.total + ' / 300 · ' + new Date(last.ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Mendengar · Membaca · Menulis · atur durasi di pengaturan'));
    const ch = h('div', 'mchev'); ch.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-chevron-right"/></svg>';
    b.append(mi, mt, ch);
    b.addEventListener('click', () => intro(paketId));
    box.appendChild(b);
  }

  function durRow(s, refresh, inputs) {
    const row = h('div', 'exam-dur-row'), ctl = h('div', 'exam-dur-ctl');
    const input = h('input'); input.type = 'number'; input.min = DUR_MIN; input.max = DUR_MAX; input.inputMode = 'numeric';
    input.value = minsOf(s); input.setAttribute('aria-label', 'Durasi ' + s.label + ' (menit)');
    const set = v => {
      v = Math.min(DUR_MAX, Math.max(DUR_MIN, Math.round(Number(v)) || minsOf(s)));
      durs[s.cat] = v; input.value = v; saveDurs(); refresh();
    };
    const mk = (txt, d, lab) => { const b = h('button', '', txt); b.type = 'button'; b.setAttribute('aria-label', lab); b.addEventListener('click', () => set(Number(input.value || minsOf(s)) + d)); return b; };
    input.addEventListener('change', () => set(input.value));
    inputs.push(() => set(input.value));
    ctl.append(mk('−', -5, 'Kurangi 5 menit ' + s.label), input, mk('+', 5, 'Tambah 5 menit ' + s.label), h('small', '', 'menit'));
    row.append(h('span', '', s.label), ctl);
    return row;
  }

  const ICON_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>';
  const SEC_INFO = {
    mendengar: { zh: '听力', desc: 'Dengarkan rekaman lalu jawab soal' },
    membaca: { zh: '阅读', desc: 'Baca teks dan pilih jawaban' },
    menulis: { zh: '书写', desc: 'Susun kalimat dan tulis kalimat' }
  };

  /* Halaman awal Simulasi Ujian: pilih Mendengar / Membaca / Menulis (atau ujian lengkap). Ikon pengaturan di pojok atas = atur durasi. */
  function intro(paketId) {
    durs = loadDurs();
    const p = getAllPaket().find(x => x.id === paketId);
    const gear = h('button', 'exam-gear'); gear.type = 'button';
    gear.setAttribute('aria-label', 'Pengaturan durasi ujian'); gear.title = 'Atur durasi ujian';
    gear.innerHTML = ICON_GEAR;
    gear.addEventListener('click', () => settings(paketId));
    const list = h('div', 'exam-picks');
    SECTIONS.forEach(sec => {
      const info = SEC_INFO[sec.cat];
      const b = h('button', 'exam-pick'); b.type = 'button';
      b.append(h('span', 'exam-pick-zh', info.zh));
      const t = h('span', 'exam-pick-t'); t.append(h('b', '', sec.label + ' ' + info.zh), h('small', '', info.desc + ' · ' + minsOf(sec) + ' menit'));
      const c = h('span', 'exam-pick-go'); c.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      b.append(t, c);
      b.addEventListener('click', () => start(paketId, sec.cat));
      list.appendChild(b);
    });
    openOverlay('Simulasi ' + (p ? p.title : 'Ujian HSK 4'), [
      h('p', '', 'Pilih bagian yang ingin dikerjakan. Jawaban tidak diperiksa sampai bagian selesai, dan waktu tidak bisa dijeda.'),
      list,
      h('p', 'exam-note', 'Mendengar memerlukan audio dan koneksi internet — pakai headphone dan tempat yang tenang. Durasi bisa diubah lewat ikon pengaturan di pojok atas.'),
      row(btn('Tutup', 'exam-btn ghost', closeOverlay), btn('Ujian lengkap · ' + totalMins() + ' menit', 'exam-btn', () => start(paketId)))
    ], gear);
  }

  /* Pengaturan durasi tiap bagian */
  function settings(paketId) {
    durs = loadDurs();
    const inputs = [], box = h('div', 'exam-dur'), foot = h('div', 'exam-dur-foot');
    const totalB = h('b'), reset = h('button', '', 'Atur ulang');
    reset.type = 'button';
    const refresh = () => { totalB.textContent = totalMins(); };
    const draw = () => { box.textContent = ''; inputs.length = 0; SECTIONS.forEach(s => box.appendChild(durRow(s, refresh, inputs))); refresh(); box.appendChild(foot); };
    const total = h('span'); total.append('Total ', totalB, ' menit');
    foot.append(total, reset);
    reset.addEventListener('click', () => { durs = {}; SECTIONS.forEach(s => { durs[s.cat] = s.min; }); saveDurs(); draw(); });
    draw();
    openOverlay('Durasi ujian', [
      h('p', 'exam-note', 'Atur durasi tiap bagian (menit). Standar HSK 4: ' + SECTIONS.map(s => s.min).join(' / ') + ' menit. Pilihan tersimpan di perangkat ini.'),
      box,
      row(btn('Simpan', 'exam-btn', () => { inputs.forEach(f => f()); intro(paketId); }))
    ]);
  }

  async function start(paketId, onlyCat) {
    closeOverlay();
    try { await loadSetParts(paketId); }
    catch (e) { toast('Soal belum bisa dimuat. Periksa koneksi lalu coba lagi.'); return; }
    const single = onlyCat ? SECTIONS.findIndex(x => x.cat === onlyCat) : -1;
    st = { paketId, idx: single >= 0 ? single : 0, single: single >= 0, res: {}, t0: Date.now(), warned: false };
    document.body.classList.add('exam-mode');
    runSection();
  }

  async function runSection() {
    const sec = SECTIONS[st.idx];
    await openLatihanSession(sec.cat, st.paketId, 'exam');
    if (!latihanSet || latihanCat !== sec.cat) { abortNow(); return; }
    st.total = minsOf(sec) * 60000; st.endsAt = Date.now() + st.total; st.warned = false;
    buildShell(sec);
    if (typeof READMODE !== 'undefined') READMODE.apply();
    tick(); clearInterval(timer); timer = setInterval(tick, 1000);
  }
  function tick() {
    if (!st) return;
    const left = st.endsAt - Date.now(), thr = Math.min(300000, st.total * 0.25), warn = left < thr;
    if (shell) {
      const t = mmss(left), frac = Math.max(0, Math.min(1, left / st.total));
      shell.querySelectorAll('[data-time]').forEach(e => { e.textContent = t; e.classList.toggle('warn', warn); });
      shell.querySelectorAll('[data-bar]').forEach(e => { e.style.width = (frac * 100) + '%'; e.classList.toggle('warn', warn); });
    }
    if (warn && !st.warned) { st.warned = true; toast('Sisa waktu ' + Math.max(1, Math.ceil(thr / 60000)) + ' menit.'); }
    if (left <= 0) finishSection(true);
  }
  function confirmFinish() {
    const un = scoreSection(latihanCat, latihanSet, latihanAnswers).un;
    openOverlay('Selesaikan bagian ini?', [
      h('p', '', (un ? un + ' soal belum dijawab. ' : 'Semua soal terjawab. ') + 'Bagian yang sudah diselesaikan tidak bisa dibuka lagi.'),
      row(btn('Kembali', 'exam-btn ghost', closeOverlay), btn('Selesaikan', 'exam-btn', () => { closeOverlay(); finishSection(false); }))
    ]);
  }

  function finishSection(timeout) {
    if (!st) return;
    clearInterval(timer);
    const sec = SECTIONS[st.idx];
    st.res[sec.cat] = scoreSection(sec.cat, latihanSet, latihanAnswers);
    closeOverlay();
    closeLatihanSession();
    teardownShell();
    if (st.single) {
      const paketId = st.paketId, r = st.res[sec.cat];
      st = null; document.body.classList.remove('exam-mode');
      showSingleResult(sec, r, paketId, timeout);
      return;
    }
    if (st.idx < SECTIONS.length - 1) {
      const next = SECTIONS[st.idx + 1];
      openOverlay(sec.label + ' selesai' + (timeout ? ' (waktu habis)' : ''), [
        h('p', '', 'Berikutnya: ' + next.label + ', ' + minsOf(next) + ' menit. Waktu mulai berjalan saat kamu menekan tombol di bawah.'),
        row(btn('Mulai ' + next.label, 'exam-btn', () => { closeOverlay(); st.idx++; runSection(); }))
      ]);
    } else finishExam();
  }

  function finishExam() {
    const total = SECTIONS.reduce((n, s) => n + st.res[s.cat].pct, 0);
    const rec = {
      ts: Date.now(), paket: st.paketId, total,
      scores: { mendengar: st.res.mendengar.pct, membaca: st.res.membaca.pct, menulis: st.res.menulis.pct },
      parts: SECTIONS.flatMap(s => st.res[s.cat].parts.map(p => [s.cat, p.title, p.c, p.t])),
      minutes: Math.round((Date.now() - st.t0) / 60000)
    };
    DB.exams = [rec].concat(DB.exams || []).slice(0, 50);
    DB.meta.xp = (DB.meta.xp || 0) + 30;
    save();
    const paketId = st.paketId, res = st.res;
    st = null; document.body.classList.remove('exam-mode');
    showResult(rec, res, paketId);
  }

  function showSingleResult(sec, r, paketId, timeout) {
    const nodes = [];
    const hero = h('div', 'exam-hero');
    hero.appendChild(h('strong', '', r.pct + ' / 100'));
    hero.appendChild(h('span', r.pct >= 60 ? 'ok' : 'no', r.c + ' dari ' + r.t + ' benar' + (r.un ? ' · ' + r.un + ' kosong' : '') + (timeout ? ' · waktu habis' : '')));
    nodes.push(hero);
    r.parts.forEach(pt => {
      const line = h('div', 'exam-sec'), pc = pt.t ? Math.round(pt.c / pt.t * 100) : 0;
      line.appendChild(h('b', '', pt.title));
      line.appendChild(h('span', '', pt.c + '/' + pt.t + ' benar'));
      const bar = h('div', 'exam-meter'), i = h('i'); i.style.width = pc + '%'; bar.appendChild(i); line.appendChild(bar);
      nodes.push(line);
    });
    if (sec.cat === 'menulis') nodes.push(h('p', 'exam-note', 'Hanya soal susun kalimat yang dinilai otomatis; soal menulis kalimat tidak dinilai.'));
    nodes.push(h('p', 'exam-note', 'Latihan satu bagian tidak dimasukkan ke riwayat skor ujian lengkap.'));
    nodes.push(stack(row(
      btn('Pilih bagian lain', 'exam-btn', () => { closeOverlay(); document.getElementById('latihanMenuStage').style.display = 'block'; openPaketDetail(paketId); intro(paketId); }),
      btn('Tutup', 'exam-btn ghost', () => { closeOverlay(); document.getElementById('latihanMenuStage').style.display = 'block'; openPaketDetail(paketId); })
    )));
    openOverlay('Hasil ' + sec.label + ' ' + HANZI[sec.cat], nodes);
  }

  function showResult(rec, res, paketId) {
    const nodes = [];
    const hero = h('div', 'exam-hero');
    hero.appendChild(h('strong', '', rec.total + ' / 300'));
    hero.appendChild(h('span', rec.total >= PASS ? 'ok' : 'no', rec.total >= PASS ? 'Di atas garis lulus (' + PASS + ')' : 'Di bawah garis lulus (' + PASS + ')'));
    nodes.push(hero);
    SECTIONS.forEach(s => {
      const r = res[s.cat], line = h('div', 'exam-sec');
      line.appendChild(h('b', '', s.label));
      line.appendChild(h('span', '', r.c + '/' + r.t + ' benar · skor ' + r.pct + (r.un ? ' · ' + r.un + ' kosong' : '')));
      const bar = h('div', 'exam-meter'), i = h('i'); i.style.width = r.pct + '%'; bar.appendChild(i); line.appendChild(bar);
      nodes.push(line);
    });
    const weak = rec.parts.filter(p => p[3]).map(p => ({ cat: p[0], title: p[1], pct: p[2] / p[3], c: p[2], t: p[3] }))
      .sort((a, b) => a.pct - b.pct).slice(0, 2).filter(w => w.pct < 0.8);
    if (weak.length) {
      const wb = h('div', 'exam-weak'); wb.appendChild(h('b', '', 'Perlu diperkuat'));
      weak.forEach(w => wb.appendChild(h('p', '', w.cat.charAt(0).toUpperCase() + w.cat.slice(1) + ' · ' + w.title + ': ' + w.c + '/' + w.t + ' (' + Math.round(w.pct * 100) + '%)')));
      nodes.push(wb);
    } else nodes.push(h('p', 'exam-note', 'Semua bagian ≥80%. Pertahankan dengan simulasi paket lain.'));
    nodes.push(h('p', 'exam-note', 'Skor adalah estimasi (benar ÷ total × 100 per bagian); konversi resmi HSK tidak dipublikasikan. Menulis dinilai dari 10 soal susun kalimat — 5 soal menulis kalimat tidak dinilai otomatis.'));
    nodes.push(row(btn('Tutup', 'exam-btn', () => { closeOverlay(); document.getElementById('latihanMenuStage').style.display = 'block'; openPaketDetail(paketId); })));
    openOverlay('Hasil simulasi', nodes);
  }

  function abortNow() {
    clearInterval(timer); teardownShell(); closeOverlay();
    st = null; document.body.classList.remove('exam-mode');
  }
  function confirmAbort() {
    openOverlay('Keluar dari simulasi?', [
      h('p', '', 'Hasil simulasi ini tidak akan disimpan.'),
      stack(row(btn('Lanjutkan ujian', 'exam-btn', closeOverlay), btn('Keluar', 'exam-btn ghost', () => { abortNow(); closeLatihanSession(); })))
    ]);
  }
  document.getElementById('latihanBackBtn')?.addEventListener('click', e => {
    if (st) { e.stopImmediatePropagation(); e.preventDefault(); confirmAbort(); }
  }, true);

  /* ================= LAYOUT UJIAN (HP / tablet / laptop) ================= */
  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>',
    head: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Zm16 0h-3v6h2a1 1 0 0 0 1-1v-5Z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>',
    vol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>'
  };
  const HANZI = { mendengar: '听力', membaca: '阅读', menulis: '书写' };
  let shell = null, bodyL = [], obs = null, io = null, curNo = null, rafId = 0, audioEl = null, audioAuto = false;

  function itemsOf() {
    const out = [];
    latihanSet.parts.forEach(pt => pt.items.forEach(it => out.push({ no: it.no, type: pt.type, key: latihanCat + '-' + it.no })));
    return out;
  }
  function isAnswered(it) {
    const a = latihanAnswers[it.key];
    if (it.type === 'arrange') return (latihanAnswers[it.key + '-idxseq'] || []).length > 0;
    if (it.type === 'write') return !!document.querySelector('#latihanSessionBody .quiz-item[data-qkey="' + it.key + '"] .write-textarea')?.value.trim();
    return a !== undefined && a !== null && String(a) !== '';
  }
  const fmtAudio = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function buildGrid(box, nos) {
    nos.forEach(no => {
      const b = h('button', 'xs-n', String(no)); b.type = 'button'; b.dataset.no = no;
      b.addEventListener('click', () => { goTo(no); });
      box.appendChild(b);
    });
  }
  function goTo(no) {
    if (!shell) return;
    shell.classList.remove('nav-open');
    const el = document.querySelector('#latihanSessionBody .quiz-item[data-qkey="' + latihanCat + '-' + no + '"]');
    curNo = no; paint();
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  function buildShell(sec) {
    teardownShell();
    const pr = !st && practice;
    const p = getAllPaket().find(x => x.id === (pr ? practice.paketId : st.paketId)) || {};
    const stage = document.getElementById('latihanSessionStage');
    const body = document.getElementById('latihanSessionBody');
    const items = itemsOf(), nos = items.map(i => i.no);
    const lv = (String(p.level || 'HSK 4').match(/\d+/) || ['4'])[0];
    const rng = nos.length ? nos[0] + '–' + nos[nos.length - 1] : '';
    shell = h('div', 'xs' + (pr ? ' xs-practice' : '')); shell.id = 'examShell'; shell.dataset.cat = sec.cat;
    shell.innerHTML =
      '<header class="xs-top">' +
        '<button type="button" class="xs-exit" aria-label="Keluar dari simulasi">' + ICON.back + '<span>Keluar</span></button>' +
        '<div class="xs-level"></div>' +
        '<div class="xs-code"><b></b><small></small></div>' +
        '<span class="xs-grow"></span>' +
        '<span class="xs-secinfo"><b></b><i></i></span>' +
        '<button type="button" class="xs-finish">Selesai<span class="lg"> bagian ini</span></button>' +
      '</header>' +
      '<div class="xs-mbar">' +
        '<b class="xs-time" data-time>00:00</b>' +
        '<span class="xs-seclabel"></span>' +
        '<span class="xs-track"><i data-bar></i></span>' +
        '<span class="xs-count"><em data-done>0</em>/<em data-total>0</em></span>' +
        '<button type="button" class="xs-gridbtn" aria-label="Navigasi soal">' + ICON.grid + '<span data-cur></span></button>' +
      '</div>' +
      (pr ? '<nav class="xs-tabs" aria-label="Pilih bagian"></nav>' : '') +
      '<div class="xs-body">' +
        '<aside class="xs-side">' +
          '<section class="xs-card">' +
            '<div class="xs-cap"><span>Sisa waktu</span><span class="xs-seclabel2"></span></div>' +
            '<div class="xs-big" data-time>00:00</div>' +
            '<span class="xs-track"><i data-bar></i></span>' +
            '<div class="xs-rule"></div>' +
            '<div class="xs-cap"><span>Terjawab</span><b data-donetotal>0/0</b></div>' +
            '<span class="xs-track thin"><i data-donebar></i></span>' +
          '</section>' +
          '<div class="xs-secmenu"></div>' +
          '<section class="xs-card xs-navcard"><div class="xs-cap"><span class="xs-navtitle"></span></div><div class="xs-grid" data-grid></div>' +
            '<div class="xs-legend"><span><i class="d"></i>Sudah dijawab</span><span><i></i>Belum</span></div></section>' +
        '</aside>' +
        '<main class="xs-main" id="xsMain"><div class="xs-inner">' +
          (sec.cat === 'mendengar' ? audioHtml() : '') +
          '<div class="xs-content">' +
            '<div class="xs-sechead"><div class="xs-seclogo"></div><div><h2></h2><p></p></div><span class="xs-range"></span></div>' +
            '<div class="xs-slot"></div>' +
          '</div>' +
          '<section class="xs-navpanel">' +
            '<div class="xs-secpill"><i></i><span class="xs-pilltxt"></span><em></em></div>' +
            '<div class="xs-grid" data-grid></div>' +
            '<div class="xs-legend"><span><i class="d"></i>Sudah dijawab</span><span><i></i>Belum</span></div>' +
          '</section>' +
        '</div></main>' +
      '</div>' +
      (sec.cat === 'mendengar' ? dockHtml() : '');

    const q = s => shell.querySelector(s), qa = s => shell.querySelectorAll(s);
    q('.xs-level').textContent = lv;
    q('.xs-code b').textContent = p.examCode || '';
    q('.xs-code small').textContent = (p.level || 'HSK 4') + ' — ' + String(p.title || '').replace(/^Paket Soal\s*/, 'Paket ').replace(/\s+H\d+\w*$/, '');
    q('.xs-secinfo b').textContent = HANZI[sec.cat];
    q('.xs-secinfo i').textContent = pr ? 'latihan · tanpa batas waktu' : st.single ? 'satu bagian' : 'bagian ' + (st.idx + 1) + '/' + SECTIONS.length;
    const label = sec.cat === 'mendengar' ? 'Menyimak · ikut rekaman' : sec.label;
    qa('.xs-seclabel').forEach(e => { e.textContent = label; });
    q('.xs-seclabel2').textContent = sec.label;
    q('.xs-seclogo').textContent = HANZI[sec.cat];
    q('.xs-sechead h2').textContent = sec.cat === 'mendengar' ? 'Menyimak' : sec.label;
    q('.xs-sechead p').textContent = pr ? 'Latihan · tanpa batas waktu' : st.single ? 'Simulasi satu bagian' : 'Bagian ' + (st.idx + 1) + ' dari ' + SECTIONS.length;
    q('.xs-range').textContent = rng;
    q('.xs-navtitle').textContent = 'Navigasi soal · ' + sec.label;
    qa('.xs-secpill i').forEach(e => { e.textContent = HANZI[sec.cat]; });
    qa('.xs-pilltxt').forEach(e => { e.textContent = sec.label; });
    qa('.xs-secpill em').forEach(e => { e.textContent = items.length; });
    qa('[data-total]').forEach(e => { e.textContent = items.length; });
    qa('[data-grid]').forEach(g => buildGrid(g, nos));
    q('.xs-secmenu').replaceWith(secMenu(sec, p, pr, false));
    if (pr) q('.xs-tabs').replaceWith(secMenu(sec, p, pr, true));
    if (pr) {
      /* mode latihan: tanpa timer & tanpa tombol selesai; keluar langsung menutup sesi */
      qa('.xs-mbar > [data-time], .xs-mbar > .xs-track, .xs-finish, .xs-side .xs-card:first-child > :nth-child(-n+4)').forEach(e => e.remove());
      q('.xs-exit').addEventListener('click', () => closeLatihanSession());
    } else {
      q('.xs-exit').addEventListener('click', confirmAbort);
      q('.xs-finish').addEventListener('click', confirmFinish);
    }
    q('.xs-gridbtn').addEventListener('click', () => { shell.classList.toggle('nav-open'); if (!shell.classList.contains('nav-open')) goTo(curNo || nos[0]); else paint(); syncDock(); });

    q('.xs-slot').appendChild(body);
    document.body.appendChild(shell);
    postProcess(body);
    curNo = nos[0];
    const main = q('#xsMain');
    main.addEventListener('scroll', () => { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; trackCurrent(); }); }, { passive: true });
    bodyL = [['click', () => setTimeout(paint, 0), false], ['input', () => setTimeout(paint, 0), false], ['click', onCaptureToggle, true]];
    bodyL.forEach(l => body.addEventListener(l[0], l[1], l[2]));
    if (sec.cat === 'mendengar') { bindAudioUi(); bindAudio(); obs = new MutationObserver(() => { bindAudio(); syncStatus(); }); obs.observe(body, { childList: true, subtree: true, characterData: true }); }
    paint();
    return stage;
  }

  /* menu 3 bagian: 听力 Mendengar · 阅读 Membaca · 书写 Menulis */
  function secMenu(cur, p, pr, tabs) {
    const box = h(tabs ? 'nav' : 'div', tabs ? 'xs-tabs' : 'xs-secmenu');
    if (tabs) box.setAttribute('aria-label', 'Pilih bagian');
    SECTIONS.forEach((sec, i) => {
      const on = sec.cat === cur.cat;
      const cnt = on ? itemsOf().length : ((p.skills || []).find(k => k.cat === sec.cat) || {}).count;
      const b = h('button', 'xs-sm' + (on ? ' on' : '')); b.type = 'button';
      b.append(h('i', '', HANZI[sec.cat]), h('span', '', sec.label));
      let note = cnt || '';
      if (!pr) {
        if (st.single ? !on : i < st.idx) { b.classList.add('lock'); note = on ? note : (st.single ? '' : 'selesai'); }
        b.disabled = true;
      } else if (!on) b.addEventListener('click', () => switchPractice(sec.cat));
      else b.setAttribute('aria-current', 'true');
      if (note !== '') b.appendChild(h('em', '', String(note)));
      box.appendChild(b);
    });
    return box;
  }
  function switchPractice(cat) {
    if (!practice || cat === practice.cat) return;
    const pid = practice.paketId;
    closeLatihanSession();
    latihanActivePaketId = pid;
    openLatihanSession(cat, pid, 'paket');
  }

  function teardownShell() {
    if (obs) { obs.disconnect(); obs = null; }
    if (io) { io.disconnect(); io = null; }
    if (audioEl) { try { audioEl.pause(); } catch (e) {} audioEl = null; }
    audioAuto = false;
    if (!shell) return;
    const body = document.getElementById('latihanSessionBody'), stage = document.getElementById('latihanSessionStage');
    if (body) bodyL.forEach(l => body.removeEventListener(l[0], l[1], l[2]));
    bodyL = [];
    if (body && stage && shell.contains(body)) stage.appendChild(body);
    shell.remove(); shell = null;
  }

  /* menata ulang markup soal (hanya data tampilan) supaya sesuai layout ujian */
  function postProcess(body) {
    const sub = body.querySelector('#quizSubmitBtn'), rst = body.querySelector('#quizResetBtn');
    if (sub && rst && !sub.parentElement.classList.contains('xs-pactions')) {
      const wrap = h('div', 'xs-pactions');
      sub.before(wrap); wrap.append(sub, rst);
      sub.textContent = 'Periksa Semua Jawaban'; rst.textContent = 'Ulangi dari Awal';
    }
    body.querySelectorAll('.quiz-part').forEach(part => {
      const hb = part.querySelector('.quiz-part-head b');
      if (hb) {
        const m = hb.textContent.match(/Bagian\s+(\d+)\s*(?:\(([^)]*)\))?/i);
        if (m) { hb.textContent = '第' + m[1] + '部分'; if (m[2]) hb.appendChild(h('small', '', 'no. ' + m[2].replace('-', '–'))); }
      }
    });
    body.querySelectorAll('.quiz-item').forEach(item => {
      const key = item.dataset.qkey, ent = latihanItemIndex[key];
      const type = ent ? ent.part.type : '';
      item.classList.add('xq', 'xq-' + (type === 'arrange' ? 'arr' : type));
      const nos = item.querySelectorAll(':scope > .qi-no');
      const no = nos[0];
      if (no) {
        const rs = no.querySelector('button');
        no.textContent = ent ? ent.item.no : no.textContent.replace(/\D+/g, '');
        no.classList.add('xq-chip');
        if (rs) { rs.classList.add('xq-reset'); rs.textContent = 'Ulangi'; item.appendChild(rs); }
      }
      if (nos[1]) { nos[1].classList.remove('qi-no'); nos[1].classList.add('xq-hint'); nos[1].removeAttribute('style'); }
      if (item.querySelector(':scope > .qi-passage')) item.classList.add('xq-pass');
      if (type === 'tf') {
        const t = item.querySelector('.qi-text');
        if (t) t.innerHTML = t.innerHTML.replace(/^[\s★]+/, '').replace(/[（(][\s ]*[）)]\s*$/, '').trim();
        item.querySelectorAll('.qi-letter').forEach(l => { l.textContent = l.textContent === '对' ? '√' : '×'; });
      }
      if (type === 'order' || type === 'arrange') {
        const hint = h('div', 'xq-hint', type === 'order' ? 'Ketuk kalimat sesuai urutan yang benar:' : 'Ketuk kepingan kata sesuai urutan yang benar:');
        no.after(hint);
      }
      if (type === 'order') {
        item.querySelectorAll('.order-frag').forEach(f => { f.appendChild(h('span', 'xq-badge')); });
      }
    });
  }

  /* status pilihan (tanpa mengubah model jawaban latihanAnswers) */
  function paint() {
    if (!shell || !latihanSet) return;
    const items = itemsOf(), body = document.getElementById('latihanSessionBody');
    let done = 0;
    items.forEach(it => {
      const ok = isAnswered(it); if (ok) done++;
      const el = body.querySelector('.quiz-item[data-qkey="' + it.key + '"]');
      if (!el) return;
      el.classList.toggle('xq-done', ok);
      const a = latihanAnswers[it.key];
      if (it.type === 'tf' || it.type === 'mc') el.querySelectorAll('.qi-opt').forEach(o => o.classList.toggle('exam-sel', a !== undefined && a !== null && o.dataset.val === String(a)));
      else if (it.type === 'cloze') el.querySelectorAll('.cloze-chip').forEach(c => c.classList.toggle('exam-sel', !!a && c.dataset.clozeVal === a));
      else if (it.type === 'order') {
        const seq = String(a || '').split('').filter(Boolean);
        el.querySelectorAll('.order-frag').forEach(f => {
          const i = seq.indexOf(f.dataset.letter), bd = f.querySelector('.xq-badge');
          f.classList.toggle('exam-sel', i >= 0);
          if (bd) { bd.textContent = i + 1; bd.classList.toggle('on', i >= 0); }
        });
      }
    });
    const doneSet = new Set(items.filter(isAnswered).map(i => String(i.no)));
    shell.querySelectorAll('.xs-n').forEach(n => { n.classList.toggle('done', doneSet.has(n.dataset.no)); n.classList.toggle('cur', String(curNo) === n.dataset.no); });
    shell.querySelectorAll('[data-done]').forEach(e => { e.textContent = done; });
    shell.querySelector('[data-donetotal]').textContent = done + '/' + items.length;
    const pct = items.length ? done / items.length * 100 : 0;
    shell.querySelector('[data-donebar]').style.width = pct + '%';
    shell.querySelectorAll('[data-cur]').forEach(e => { e.textContent = curNo == null ? '' : curNo; });
  }

  /* ketuk pilihan yang sedang aktif = batalkan pilihan (opsi, kata rumpang, urutan) */
  function onCaptureToggle(e) {
    const opt = e.target.closest('.qi-opt.exam-sel, .qi-opt.selected');
    if (opt) { const pk = opt.closest('.quiz-item')?.querySelector('[data-picked]'); if (pk) { e.stopPropagation(); e.preventDefault(); pk.click(); setTimeout(paint, 0); } return; }
    const chip = e.target.closest('.cloze-chip.exam-sel');
    if (chip) { const pick = chip.closest('.quiz-item')?.querySelector('[data-pick]'); if (pick) { e.stopPropagation(); e.preventDefault(); pick.click(); setTimeout(paint, 0); } return; }
    const frag = e.target.closest('.order-frag');
    if (frag) {
      const key = frag.closest('.quiz-item')?.dataset.qkey, seq = String(latihanAnswers[key] || '');
      if (key && seq.includes(frag.dataset.letter)) {
        e.stopPropagation(); e.preventDefault();
        latihanAnswers[key] = seq.replace(frag.dataset.letter, '');
        setTimeout(paint, 0);
      }
    }
  }

  function trackCurrent() {
    if (!shell || shell.classList.contains('nav-open')) return;
    const main = shell.querySelector('#xsMain'), top = main.getBoundingClientRect().top + 24;
    const els = document.querySelectorAll('#latihanSessionBody .quiz-item');
    let found = null;
    for (const el of els) { if (el.getBoundingClientRect().bottom > top) { found = el; break; } }
    if (found) { const n = Number(found.dataset.qkey.split('-').pop()); if (n !== curNo) { curNo = n; paint(); } }
  }

  /* ---- pemutar audio (mengendalikan elemen <audio> bawaan yang disembunyikan) ---- */
  function audioHtml() {
    return '<section class="xs-audio" id="xsAudio">' +
      '<div class="xs-audio-top"><b>' + ICON.head + 'Rekaman Menyimak</b><small>Kecepatan</small>' +
      '<button type="button" class="xs-spd on" data-spd="1">1×</button><button type="button" class="xs-spd" data-spd="0.85">0.85×</button></div>' +
      '<div class="xs-audio-bar"><button type="button" class="xs-play" data-play aria-label="Putar / jeda" disabled>' + ICON.play + '</button>' +
      '<input type="range" class="xs-seek" data-seek min="0" max="1000" value="0" aria-label="Posisi rekaman" disabled>' +
      '<span class="xs-atime" data-atime>0:00 / 0:00</span>' +
      '<button type="button" class="xs-vol" data-vol aria-label="Suara">' + ICON.vol + '</button></div>' +
      '<p class="xs-astatus" data-astatus></p></section>';
  }
  function dockHtml() {
    return '<div class="xs-dock" id="xsDock"><button type="button" class="xs-play" data-play aria-label="Putar / jeda" disabled>' + ICON.play + '</button>' +
      '<input type="range" class="xs-seek" data-seek min="0" max="1000" value="0" aria-label="Posisi rekaman" disabled><span class="xs-atime" data-atime>0:00 / 0:00</span></div>';
  }
  function bindAudioUi() {
    shell.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => {
      if (!audioEl) return;
      if (audioEl.paused) audioEl.play().catch(() => {}); else audioEl.pause();
    }));
    shell.querySelectorAll('[data-seek]').forEach(r => r.addEventListener('input', () => {
      if (audioEl && Number.isFinite(audioEl.duration)) audioEl.currentTime = r.value / 1000 * audioEl.duration;
    }));
    shell.querySelectorAll('[data-spd]').forEach(b => b.addEventListener('click', () => {
      const v = Number(b.dataset.spd);
      shell.querySelectorAll('[data-spd]').forEach(x => x.classList.toggle('on', x === b));
      if (audioEl) { audioEl.defaultPlaybackRate = v; audioEl.playbackRate = v; }
    }));
    const vol = shell.querySelector('[data-vol]');
    if (vol) vol.addEventListener('click', () => { if (!audioEl) return; audioEl.muted = !audioEl.muted; vol.innerHTML = audioEl.muted ? ICON.mute : ICON.vol; });
    const card = shell.querySelector('#xsAudio'), main = shell.querySelector('#xsMain');
    if ('IntersectionObserver' in window && card) {
      io = new IntersectionObserver(es => { shell.dataset.audioVisible = es[0].isIntersecting ? '1' : '0'; syncDock(); }, { root: main, threshold: 0 });
      io.observe(card);
    }
  }
  function syncDock() {
    const dock = shell && shell.querySelector('#xsDock'); if (!dock) return;
    dock.classList.toggle('show', shell.dataset.audioVisible === '0' || shell.classList.contains('nav-open'));
  }
  function syncStatus() {
    if (!shell) return;
    const st2 = shell.querySelector('[data-astatus]'); if (!st2) return;
    const src = document.getElementById('quizAudioStatus');
    st2.textContent = src ? src.textContent : '';
  }
  function bindAudio() {
    const a = document.querySelector('#latihanSessionBody audio');
    if (!a || a === audioEl || !shell) return;
    if (audioEl && audioEl !== a) { try { audioEl.pause(); } catch (e) {} }
    audioEl = a; audioAuto = false;
    const on = shell.querySelector('[data-spd].on');
    const rate = on ? Number(on.dataset.spd) : 1;
    const ui = () => {
      const d = Number.isFinite(a.duration) ? a.duration : 0;
      shell.querySelectorAll('[data-play]').forEach(b => { b.disabled = !d; b.innerHTML = a.paused ? ICON.play : ICON.pause; });
      shell.querySelectorAll('[data-seek]').forEach(r => { r.disabled = !d; if (document.activeElement !== r) r.value = d ? a.currentTime / d * 1000 : 0; });
      shell.querySelectorAll('[data-atime]').forEach(t => { t.textContent = fmtAudio(a.currentTime) + ' / ' + fmtAudio(d); });
    };
    ['timeupdate', 'loadedmetadata', 'durationchange', 'play', 'pause', 'ended', 'canplay'].forEach(ev => a.addEventListener(ev, ui));
    a.addEventListener('canplay', () => {
      // tidak ada autoplay: audio hanya diputar saat tombol putar ditekan
      if (audioAuto || !Number.isFinite(a.duration) || a.duration <= 0) return;
      audioAuto = true; a.defaultPlaybackRate = rate; a.playbackRate = rate;
    });
    a.defaultPlaybackRate = rate; a.playbackRate = rate;
    syncStatus(); ui();
  }

  /* ===== Mode latihan: tampilan sama dengan simulasi, tanpa timer; tombol Periksa per soal tetap ada ===== */
  function openPractice(cat, paketId) {
    if (st || !SECTIONS.some(x => x.cat === cat)) return;
    practice = { cat, paketId };
    document.body.classList.add('practice-mode');
    buildShell(SECTIONS.find(x => x.cat === cat));
    const m = shell && shell.querySelector('#xsMain'); if (m) m.scrollTop = 0;
  }
  function closePractice() {
    if (!practice) return;
    practice = null;
    teardownShell();
    document.body.classList.remove('practice-mode');
  }
  /* dipanggil setiap soal dirender ulang (mis. "Ulangi dari Awal") */
  function afterRender() {
    if (!practice || !shell) return;
    postProcess(document.getElementById('latihanSessionBody'));
    curNo = itemsOf()[0]?.no; paint();
    const m = shell.querySelector('#xsMain'); if (m) m.scrollTop = 0;
  }
  return { renderEntry, scoreSection, active: () => !!st, openPractice, closePractice, afterRender };
})();
