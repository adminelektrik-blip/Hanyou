// PENGONTROL: periksa dan gabungkan hasil kerja akun pekerja.
//   node tools/hasil.js cek    tugas/akun1/batch-01.txt hasil/akun1-batch-01.txt
//   node tools/hasil.js gabung tugas/akun1/batch-01.txt hasil/akun1-batch-01.txt   (hanya jika cek bersih)
const fs = require('fs'), path = require('path');
const { ROOT, loadRaw, mkXp, saveExamples } = require('./lib');
const [mode, inFile, outFile] = process.argv.slice(2);
if (!mode || !inFile || !outFile) { console.log('pakai: node tools/hasil.js cek|gabung <input.txt> <hasil.txt>'); process.exit(1); }
const R = loadRaw(), xp = mkXp(R.str), E = R.examples, V = Object.fromEntries(R.vocab.map(w => [w.id, w]));
const parse = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).map(l => l.replace(/^\s*(```.*|[-*•]\s+|\d+[.)]\s+)/, '').trim()).filter(l => l && !/^```/.test(l))
  .map(l => l.split(/\s+\|\s+/).map(s => s.trim()));
const input = parse(path.resolve(inFile)), result = parse(path.resolve(outFile));
const CJK = /[㐀-鿿]/, TONE = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const err = [], warn = [], seen = new Set(), ok = [];
const want = new Map(input.map(r => [r[0], r]));
result.forEach((r, n) => {
  const k = r[0], isNew = k.startsWith('NEW:'), at = 'baris ' + (n + 1) + ' (' + k + ')';
  if (!want.has(k)) return err.push(at + ': kunci tidak ada di tugas');
  if (seen.has(k)) return err.push(at + ': kunci ganda'); seen.add(k);
  if (isNew) {
    if (r.length !== 4) return err.push(at + ': format harus NEW:id | kalimat | pinyin | terjemahan');
    const [, zh, py, id] = r, w = V[k.slice(4)];
    if (!w || !zh.includes(w.hanzi.replace(/[…·\/（）()]/g, '').slice(0, 1))) err.push(at + ': kalimat tidak memuat kata ' + (w && w.hanzi));
    if (!CJK.test(zh)) err.push(at + ': kalimat bukan hanzi');
    if (!TONE.test(py)) warn.push(at + ': pinyin tanpa tanda nada');
    if (CJK.test(id) || id.length < 3) err.push(at + ': terjemahan tidak valid');
    return ok.push({ k, zh, py, id });
  }
  if (r.length !== 2) return err.push(at + ': format harus kunci | terjemahan (ada ' + r.length + ' kolom)');
  const t = r[1], zh = want.get(k)[1], gloss = want.get(k)[3] || '';
  if (/^\[PERIKSA/i.test(t)) return err.push(at + ': ditandai akun pekerja sebagai tidak jelas — perlu ditinjau pengontrol');
  if (!t || t.length < 3) return err.push(at + ': terjemahan kosong/terlalu pendek');
  if (CJK.test(t)) err.push(at + ': masih memuat hanzi');
  if (t.charCodeAt(0) === 167) err.push(at + ': diawali karakter terlarang');
  if (/ · |^Arti per kata/i.test(t)) err.push(at + ': masih berbentuk arti per kata');
  if (t.length > 240) err.push(at + ': terlalu panjang');
  if (t === gloss) err.push(at + ': sama dengan arti per kata');
  if (/\b(the|is|are|and|of|to)\b/.test(t)) warn.push(at + ': tampak bahasa Inggris: ' + t.slice(0, 50));
  if (t.length < zh.length * 0.4 || t.length > zh.length * 7) warn.push(at + ': panjang tidak wajar vs hanzi');
  if (!/[.!?"”)]$/.test(t)) warn.push(at + ': tanpa tanda baca akhir');
  ok.push({ k, t });
});
input.forEach(r => { if (!seen.has(r[0])) err.push('belum dikerjakan: ' + r[0]); });
console.log(`input ${input.length} | hasil ${result.length} | error ${err.length} | peringatan ${warn.length}`);
err.slice(0, 40).forEach(e => console.log('ERROR  ' + e)); warn.slice(0, 25).forEach(e => console.log('PERIKSA ' + e));
if (mode === 'cek' || err.length) { if (err.length) console.log('→ TOLAK / minta perbaikan'); else console.log('→ layak digabung'); process.exit(err.length ? 2 : 0); }
// gabung
let n = 0;
ok.forEach(o => {
  if (o.k.startsWith('NEW:')) { const id = o.k.slice(4); E[id] = [[o.zh, o.py, o.id]]; n++; return; }
  const [id, i] = o.k.split('#'), e = E[id][+i];
  if (!Array.isArray(e) || e[3] !== 'g') throw new Error('entri bukan bertanda g: ' + o.k);
  e[2] = o.t; e.length = 3; n++;
});
saveExamples(E); console.log('digabung:', n, 'entri → data/examples.js');
