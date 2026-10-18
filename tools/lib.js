// Pustaka bersama alat pengontrol: memuat data/*.js ke Node dan membaca/menulis examples.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
function loadRaw() {
  const ctx = { HANYOU_RAW: { sets: {} } }; ctx.window = ctx; vm.createContext(ctx);
  ['vocab', 'sentences', 'game', 'examples', 'index', 'strings'].forEach(k =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'data', k + '.js'), 'utf8'), ctx, { filename: k }));
  return ctx.HANYOU_RAW;
}
const mkXp = STR => { const xp = o => typeof o === 'string' ? (o.charCodeAt(0) === 167 ? STR[parseInt(o.slice(1), 36)] : o)
  : Array.isArray(o) ? o.map(xp) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, xp(v)])) : o; return xp; };
const saveExamples = ex => fs.writeFileSync(path.join(ROOT, 'data', 'examples.js'), 'HANYOU_RAW.examples=' + JSON.stringify(ex) + ';\n');
module.exports = { ROOT, loadRaw, mkXp, saveExamples };
