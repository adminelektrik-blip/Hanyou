/* boot-inline.js */
/* HANYOU - pemuat data (v20: data dipisah ke folder data/, bukan lagi blok <script> di halaman).
   - Data inti (vocab, kalimat, game, contoh, indeks) dimuat lewat <script src="data/*.js"> -> window.HANYOU_RAW.
   - Paket soal (data/sets/<id>.js) dimuat malas (lazy) saat dibuka, jadi start tetap ringan.
   - Sengaja memakai <script src> (bukan fetch) agar tetap jalan saat dibuka dari file:// atau content:// (mode uji lokal). */
(function () {
  'use strict';
  /* string yang sama (teks bacaan, gambar, dsb.) disimpan sekali di blok d-str; "§<kode>" di data dikembalikan ke teks aslinya saat dibaca */
  const RAW = window.HANYOU_RAW, STR = RAW.str;
  const xp = o => {
    if (typeof o === 'string') return o.charCodeAt(0) === 167 ? STR[parseInt(o.slice(1), 36)] : o;
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = xp(o[i]); return o; }
    if (o && typeof o === 'object') { for (const k in o) o[k] = xp(o[k]); return o; }
    return o;
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const read = key => xp(clone(RAW[key]));
  const D = window.HANYOU_DATA = {
    vocab: read('vocab'), sentences: read('sentences'), gameSentences: read('game'), examples: read('examples')
  };
  const idx = read('index');
  D.latihanStubs = { mendengar: [], membaca: [], menulis: [] };
  idx.sets.forEach(s => ['mendengar', 'membaca', 'menulis'].forEach(c => D.latihanStubs[c].push({
    id: s.id, title: s.title, level: s.level, sub: s.sub, audioPath: s.audioPath,
    parts: null, count: s.cats[c].count, auto: s.cats[c].auto, nos: s.cats[c].nos
  })));
  const loading = {};
  const loadScript = id => loading[id] || (loading[id] = new Promise((ok, no) => {
    const el = document.createElement('script');
    el.src = 'data/sets/' + encodeURIComponent(id) + '.js';
    el.onload = () => ok(); el.onerror = () => { delete loading[id]; no(new Error('paket tidak ditemukan: ' + id)); };
    document.head.appendChild(el);
  }));
  D.loadSet = id => (RAW.sets[id] ? Promise.resolve() : loadScript(id)).then(() => {
    if (!RAW.sets[id]) throw new Error('paket tidak ditemukan: ' + id);
    return xp(clone(RAW.sets[id]));
  });
  window.hideSplash = () => { const s = document.getElementById('bootSplash'); if (s) { s.classList.add('done'); setTimeout(() => s.remove(), 400); } };
})();
