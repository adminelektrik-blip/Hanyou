// PENGONTROL: membuat paket tugas terjemahan per akun dari data saat ini.
// Pakai: node tools/build_tugas.js   → menulis tugas/akun1..4/batch-NN.txt
const fs = require('fs'), path = require('path');
const { ROOT, loadRaw, mkXp } = require('./lib');
const R = loadRaw(), xp = mkXp(R.str), V = R.vocab, E = R.examples;
const BATCH = 90, AKUN = 4;
const items = [];
V.slice().sort((a, b) => a.level - b.level).forEach(w => (E[w.id] || []).forEach((e, i) => {
  if (Array.isArray(e) && e[3] === 'g') { const x = xp(e); items.push({ key: w.id + '#' + i, level: w.level, zh: x[0], py: x[1], gloss: x[2] }); }
}));
const per = Math.ceil(items.length / AKUN);
const clean = s => String(s).replace(/\s*\|\s*/g, ' / ').replace(/\s+/g, ' ').trim();
const info = [];
for (let a = 0; a < AKUN; a++) {
  const part = items.slice(a * per, (a + 1) * per), dir = path.join(ROOT, 'tugas', 'akun' + (a + 1));
  fs.mkdirSync(dir, { recursive: true });
  const lv = [...new Set(part.map(p => p.level))];
  for (let b = 0; b * BATCH < part.length; b++) {
    const chunk = part.slice(b * BATCH, (b + 1) * BATCH);
    fs.writeFileSync(path.join(dir, 'batch-' + String(b + 1).padStart(2, '0') + '.txt'),
      chunk.map(c => [c.key, c.zh, clean(c.py), clean(c.gloss)].join(' | ')).join('\n') + '\n');
  }
  info.push({ akun: a + 1, jumlah: part.length, batch: Math.ceil(part.length / BATCH), level: lv });
}
// Akun 4 juga mendapat kata yang belum punya contoh sama sekali
const kosong = V.filter(w => !E[w.id] || !E[w.id].length);
fs.writeFileSync(path.join(ROOT, 'tugas', 'akun4', 'batch-baru.txt'),
  kosong.map(w => ['NEW:' + w.id, w.hanzi, w.pinyin, w.arti].join(' | ')).join('\n') + '\n');
console.log(JSON.stringify({ total: items.length, kataTanpaContoh: kosong.length, info }));
