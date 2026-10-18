/* i18n.js — bahasa antarmuka: Indonesia (id), Mandarin (zh), Inggris (en).
   Tambah terjemahan baru: HANYOU_I18N.add({"Teks Indonesia":["中文","English"]}) */
(function(){
'use strict';
var KEY='hanyou_lang',LANGS={id:'id',zh:'zh-CN',en:'en'};
var GZ={pagi:'早上好',siang:'中午好',sore:'下午好',malam:'晚上好'};
var GE={pagi:'Good morning',siang:'Good afternoon',sore:'Good afternoon',malam:'Good evening'};
var D={
/* Menu Akun */
"Akun":["账户","Account"],
"Mode Uji Lokal":["本地测试模式","Local Test Mode"],
"Data hanya tersimpan di perangkat ini":["数据仅保存在此设备上","Data is stored only on this device"],
"Mode uji lokal: tidak ada akun yang login. Data belajar hanya tersimpan di perangkat ini.":["本地测试模式：未登录任何账户。学习数据仅保存在此设备上。","Local test mode: no account is signed in. Study data is stored only on this device."],
"Tema":["主题","Theme"],"Gelap":["深色","Dark"],"Terang":["浅色","Light"],
"Ukuran teks":["字体大小","Text size"],"Kecil":["小","Small"],"Normal":["标准","Normal"],"Besar":["大","Large"],"Sangat besar":["特大","Extra large"],
"Bahasa":["语言","Language"],
"Kata baru/hari":["每日新词","New words/day"],"Tanpa batas":["不限","No limit"],
"Unduh backup":["下载备份","Download backup"],
"Pulihkan dari backup":["从备份恢复","Restore from backup"],
"Reset progres akun ini":["重置此账户的进度","Reset this account's progress"],
"Sinkron":["同步","Sync"],
"Mode lokal (tanpa akun)":["本地模式（无账户）","Local mode (no account)"],
"Keluar dari akun":["退出账户","Log out"],
"Metode":["登录方式","Method"],"Akun dibuat":["账户创建时间","Account created"],"Login terakhir":["上次登录","Last login"],
"Apakah Anda yakin ingin keluar?":["确定要退出吗？","Are you sure you want to log out?"],
"Sesi akun akan ditutup. Data belajar yang sudah tersimpan tidak dihapus.":["账户会话将被关闭，已保存的学习数据不会被删除。","Your session will be closed. Saved study data will not be deleted."],
"Batal":["取消","Cancel"],"Keluar":["退出","Log out"],
/* Navigasi & header */
"Beranda":["首页","Home"],"Belajar":["学习","Study"],"Progres":["进度","Progress"],"Library":["词库","Library"],
"Profil Saya":["我的资料","My Profile"],"Akun & pengaturan":["账户与设置","Account & settings"],
"TEMAN BELAJAR MANDARIN":["汉语学习伙伴","MANDARIN STUDY COMPANION"],
"Teman Belajar Mandarin":["汉语学习伙伴","Mandarin Study Companion"],
"Teman Belajar":["学习伙伴","Study Companion"],
"Uji lokal":["本地测试","Local test"],
/* Beranda */
"hari streak":["连续天数","day streak"],
"Mulai Belajar":["开始学习","Start Learning"],"Lanjutkan sesi terakhir":["继续上次的学习","Continue your last session"],
"Review":["复习","Review"],"kata perlu diulang":["个词需要复习","words to review"],
"Lihat semua kosakata":["查看全部词汇","Browse all vocabulary"],
"Statistik Detail":["详细统计","Detailed Statistics"],"Analisis perkembangan":["进步分析","Progress analysis"],
"Terus belajar hari ini. Sedikit, tapi konsisten.":["今天继续学习，少一点，但要坚持。","Keep learning today. A little, but consistent."],
"Konsistensi adalah kunci kemajuan.":["坚持是进步的关键。","Consistency is the key to progress."],
"Terus belajar! 💪":["继续加油！💪","Keep going! 💪"],
/* Latihan Soal */
"LATIHAN SOAL":["习题练习","PRACTICE QUESTIONS"],"Latihan Soal":["习题练习","Practice Questions"],
"Soal Diselesaikan":["已完成习题","Questions Completed"],
"Progress latihan yang sudah kamu kerjakan.":["你已完成的练习进度。","Your practice progress so far."],
"Mendengar":["听力","Listening"],"Membaca":["阅读","Reading"],"Menulis":["书写","Writing"],
"Buka Latihan":["打开练习","Open Practice"],
"dari":["共","of"],"soal yang tersedia":["道题可用","questions available"],
/* Belajar, Progres, Library */
"Kosa Kata":["词汇","Vocabulary"],"Kosakata":["词汇","Vocabulary"],"Semua Kosakata":["全部词汇","All Vocabulary"],
"Mode Menjawab":["作答模式","Answer Mode"],"Lihat":["查看","View"],"Ketik":["输入","Type"],"Tulis":["书写","Write"],"Ucapkan":["朗读","Speak"],
"Ringkasan":["概览","Summary"],"Analisis":["分析","Analysis"],"Skill Matrix":["技能矩阵","Skill Matrix"]
};
var P=[
[/^(\d+) soal selesai$/,"已完成 $1 题","$1 questions done"],
[/^Level (\d+)$/,"等级 $1","Level $1"],
[/^Progress HSK (\d+)$/,"HSK $1 进度","HSK $1 Progress"],
[/^Bab (\d+) \/ (\d+)$/,"第 $1 / $2 章","Chapter $1 / $2"],
[/^(\d+) kata perlu diulang$/,"$1 个词需要复习","$1 words to review"],
[/^Semua paket HSK (.+)$/,"全部 HSK $1 题包","All HSK $1 packs"],
[/^Selamat (pagi|siang|sore|malam)([!,.])? ?Terus belajar hari ini, sedikit tapi konsisten\.$/,function(r){return GZ[r[1]]+'！今天继续学习，少一点，但要坚持。';},function(r){return GE[r[1]]+'! Keep learning today, a little but consistently.';}],
[/^Selamat (pagi|siang|sore|malam), (.+)\. Terus belajar hari ini\.$/,function(r){return GZ[r[1]]+'，'+r[2]+'。今天继续学习吧。';},function(r){return GE[r[1]]+', '+r[2]+'. Keep learning today.';}],
[/^Selamat (pagi|siang|sore|malam)([!,.])?$/,function(r){return GZ[r[1]]+'！';},function(r){return GE[r[1]]+'!';}]
];
var lang='id';
try{var sv=localStorage.getItem(KEY);if(sv&&LANGS[sv])lang=sv;}catch(e){}
var ix=function(){return lang==='zh'?1:2;};
function tr(str){
  if(lang==='id'||!str)return null;
  var m=str.match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];
  if(!core)return null;
  var qm=core.match(/^(["\u201c])([\s\S]+)(["\u201d])$/);
  if(qm){var qr=tr(qm[2]);if(qr!==null)return m[1]+qm[1]+qr+qm[3]+m[3];}
  var out=null,e=Object.prototype.hasOwnProperty.call(D,core)?D[core]:null;
  if(e)out=e[ix()-1];
  else for(var i=0;i<P.length;i++){
    var r=P[i][0].exec(core);
    if(r){var t=P[i][ix()];out=typeof t==='function'?t(r):t.replace(/\$(\d)/g,function(_,n){return r[n];});break;}
  }
  if(out===null){var sp=core.match(/^([^A-Za-z0-9\u00C0-\u024F\u4e00-\u9fff{(\[\"]+\s+)([\s\S]+)$/);if(sp){var rr=tr(sp[2]);if(rr!==null)out=sp[1]+rr.replace(/^\s+/,'');}}
  return out===null?null:m[1]+out+m[3];
}
function ctxTr(n,s){if(lang==='id'||s.trim()!=='Daftar')return null;var p=n.parentNode;if(p&&p.hasAttribute&&p.hasAttribute('data-sx-view'))return s.replace('Daftar',lang==='zh'?'列表':'List');return null;}
function trLines(s){return s.split('\n').map(function(l){var t=tr(l);return t===null?l:t;}).join('\n');}

var LOC={zh:'zh-CN',en:'en-US'};
function mapLoc(l){return(l==='id-ID'&&lang!=='id')?LOC[lang]:l;}
['toLocaleDateString','toLocaleTimeString','toLocaleString'].forEach(function(m){
  [Date.prototype,Number.prototype].forEach(function(pr){var o=pr[m];if(!o)return;pr[m]=function(l,op){return o.call(this,mapLoc(l),op);};});
});
if(window.Intl&&Intl.DateTimeFormat){var _D=Intl.DateTimeFormat;Intl.DateTimeFormat=function(l,o){return new _D(mapLoc(l),o);};Intl.DateTimeFormat.prototype=_D.prototype;Intl.DateTimeFormat.supportedLocalesOf=_D.supportedLocalesOf;}
var tNodes=new WeakMap(),tAttrs=new WeakMap(),ATTR=['placeholder','title','aria-label','alt'];
function skip(el){return !!(el&&el.closest&&el.closest('script,style,textarea,[data-no-i18n]'));}
function procText(n){
  var cur=n.nodeValue,rec=tNodes.get(n),t;
  if(rec&&cur===rec.out){
    t=lang==='id'?null:(ctxTr(n,rec.src)||tr(rec.src));
    if(t===null){n.nodeValue=rec.src;tNodes.delete(n);}
    else if(t!==rec.out){n.nodeValue=t;rec.out=t;}
    return;
  }
  if(rec)tNodes.delete(n);
  if(lang==='id')return;
  t=ctxTr(n,cur)||tr(cur);
  if(t!==null&&t!==cur){tNodes.set(n,{src:cur,out:t});n.nodeValue=t;}
}
function procAttr(el,a){
  var v=el.getAttribute&&el.getAttribute(a);
  if(v==null)return;
  var rec=tAttrs.get(el);if(!rec){rec={};tAttrs.set(el,rec);}
  var r=rec[a],t;
  if(r&&v===r.out){
    t=lang==='id'?null:tr(r.src);
    if(t===null){el.setAttribute(a,r.src);delete rec[a];}
    else if(t!==r.out){el.setAttribute(a,t);r.out=t;}
    return;
  }
  if(r)delete rec[a];
  if(lang==='id')return;
  t=tr(v);
  if(t!==null&&t!==v){rec[a]={src:v,out:t};el.setAttribute(a,t);}
}
function walk(root){
  if(!root)return;
  if(root.nodeType===3){if(!skip(root.parentNode))procText(root);return;}
  if(root.nodeType!==1||skip(root))return;
  ATTR.forEach(function(a){procAttr(root,a);});
  root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(function(el){if(!skip(el))ATTR.forEach(function(a){procAttr(el,a);});});
  var tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),n,list=[];
  while((n=tw.nextNode()))list.push(n);
  list.forEach(function(x){if(!skip(x.parentNode))procText(x);});
}
var obs=new MutationObserver(function(muts){
  if(lang==='id')return;
  obs.disconnect();
  muts.forEach(function(m){
    if(m.type==='childList')m.addedNodes.forEach(walk);
    else if(m.type==='characterData'){if(!skip(m.target.parentNode))procText(m.target);}
    else if(m.type==='attributes')procAttr(m.target,m.attributeName);
  });
  hook();
});
function hook(){obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTR});}
['alert','confirm','prompt'].forEach(function(k){
  var o=window[k];
  window[k]=function(){var a=[].slice.call(arguments);if(lang!=='id'&&typeof a[0]==='string')a[0]=trLines(a[0]);return o.apply(window,a);};
});
function syncBtns(){document.querySelectorAll('[data-acc-lang]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.accLang===lang));});}
var NAME={id:'Bahasa: Indonesia',zh:'语言：中文',en:'Language: English'};
function setLang(l,silent){
  if(!LANGS[l])return;
  lang=l;
  try{localStorage.setItem(KEY,l);}catch(e){}
  document.documentElement.setAttribute('lang',LANGS[l]);
  obs.disconnect();walk(document.body);hook();
  syncBtns();
  if(!silent&&typeof toast==='function')toast(NAME[l]);
}
document.querySelectorAll('[data-acc-lang]').forEach(function(b){b.addEventListener('click',function(){setLang(b.dataset.accLang);});});
window.HANYOU_I18N={addTpl:function(o){Object.keys(o).forEach(function(k){if(k.indexOf('{}')<0){D[k]=o[k];return;}var re=new RegExp('^'+k.replace(/[.*+?^$()|[\]\\]/g,'\\$&').replace(/\{\}/g,/^\{\} [a-zA-Z\/]/.test(k)?'([\u00b1+\u2212-]?\\d[\\d.,:\/%]*)':'(.+?)')+'$');var mk=function(t){return function(r){return t.replace(/\{(\d)\}/g,function(_,n){return r[n];});};};P.push([re,mk(o[k][0]),mk(o[k][1])]);});if(lang!=='id')setLang(lang,true);},addPatterns:function(a){a.forEach(function(x){P.unshift(x);});if(lang!=='id')setLang(lang,true);},add:function(o){for(var k in o)D[k]=o[k];if(lang!=='id')setLang(lang,true);},set:setLang,get:function(){return lang;}};
setLang(lang,true);
})();
