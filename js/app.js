/* app.js */
/* HANYOU - logika aplikasi inti. Data (kosakata, soal, contoh) dimuat dari /data oleh boot.js. */
const VOCAB=window.HANYOU_DATA.vocab;
const SENTENCES=window.HANYOU_DATA.sentences;

/* ================= STATE & PERSISTENCE ================= */
const KEY_BASE='mmp_v6_state';
/* PROGRES PER AKUN: data lokal disimpan di kunci terpisah untuk tiap UID, jadi akun berbeda
   di perangkat yang sama tidak lagi saling berbagi/menimpa progres. */
let ACTIVE_UID=(function(){ try{ return localStorage.getItem('mmp_last_uid')||null; }catch(e){ return null; } })();
let KEY=ACTIVE_UID ? KEY_BASE+':'+ACTIVE_UID : (MMP_LOCAL_PREVIEW ? KEY_BASE : KEY_BASE+':anon');
const CH_COLORS=['#3b82f6','#22c55e','#f59e0b','#a855f7','#f43f5e','#06b6d4','#f97316','#8b5cf6'];
const QUOTES=[
  "Perjalanan seribu mil berawal dari satu langkah.",
  "Konsistensi mengalahkan intensitas.",
  "Kemajuan kecil setiap hari, hasil besar di masa depan.",
  "Setiap kata baru adalah pintu menuju budaya baru.",
  "Jangan takut lambat, takutlah berhenti."
];
function defaultState(){
  return {
    version:6, updatedAt:0, tomb:{}, exams:[], hskBest:{},
    progress:{}, // id -> {status,box,due,lastReview}
    favorites:{}, // id -> true
    meta:{streak:0,lastDate:null,dailyLog:{}, totalAnswered:0, totalCorrect:0, weeklyDone:{}, xp:0, badges:{}},
    settings:{level:4,chapter:'all',count:20,direction:'smart',method:'none',status:'all',shuffle:false,newPerDay:15},
    ui:{theme:'dark', lastQueueLevel:4, lastQueueChapter:'all'},
    schedule:{study:[],exam:[]}, // jadwal belajar & ujian milik akun ini (ikut sinkron cloud)
    latihanDone:{}, // key ("paketId|cat-no") -> true, soal latihan yang sudah dijawab benar minimal 1x
    latihanProgress:{} // key ("paketId|cat") -> {no:true}, soal yang sudah dicoba/dikerjakan
  };
}
let DB=load();
function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||'null');
    if(x&&x.progress) return Object.assign(defaultState(),x,{
      settings:Object.assign(defaultState().settings,x.settings||{}),
      meta:Object.assign(defaultState().meta,x.meta||{}),
      ui:Object.assign(defaultState().ui,x.ui||{}),
      latihanDone:Object.assign({},x.latihanDone||{}), latihanProgress:Object.assign({},x.latihanProgress||{}),
      schedule:{study:Array.isArray(x.schedule&&x.schedule.study)?x.schedule.study:[], exam:Array.isArray(x.schedule&&x.schedule.exam)?x.schedule.exam:[]}
    });
  }catch(e){}
  return defaultState();
}
function save(){ persistLocal(); scheduleCloudSave(); }
// Pindah ke data milik akun lain (login/logout). true jika data berganti.
function switchAccount(uid){
  uid=uid||null;
  if(uid===ACTIVE_UID) return false;
  ACTIVE_UID=uid;
  try{ if(uid) localStorage.setItem('mmp_last_uid',uid); else localStorage.removeItem('mmp_last_uid'); }catch(e){}
  KEY=uid ? KEY_BASE+':'+uid : (MMP_LOCAL_PREVIEW ? KEY_BASE : KEY_BASE+':anon');
  DB=load();
  try{ if(typeof gamePrefGet==='function'){ gamePinyin=gamePrefGet('pinyin','1')==='1'; gameFxOn=gamePrefGet('fx','1')==='1'; gameLevel=gamePrefGet('level','all'); } }catch(e){}
  return true;
}

function today(){ const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function addDays(ds,n){ const d=new Date(ds+'T12:00:00'); d.setDate(d.getDate()+n); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function yesterday(){ return addDays(today(),-1); }
// streak yang ditampilkan: 0 jika sudah putus (terakhir belajar sebelum kemarin)
function currentStreak(){ const l=DB.meta.lastDate; return (l===today()||l===yesterday())?(DB.meta.streak||0):0; }
function ensureP(w){
  let p=DB.progress[w.id];
  if(!p){ p={status:'baru',box:0,due:today(),lastReview:null}; }
  return p;
}
const INTERVALS=[0,1,2,4,7,14,30];
// total menit belajar: pakai detik aktual (dailyLog.secs); hari lama tanpa data detik diperkirakan 0,35 mnt/kartu
function studyMinutes(){
  let m=0;
  Object.values(DB.meta.dailyLog||{}).forEach(d=>{ m += (d&&d.secs!=null) ? (d.secs||0)/60 : ((d&&d.answered)||0)*0.35; });
  return Math.max(0,Math.round(m));
}
let _lastRateMs=0;

/* ================= DERIVED DATA ================= */
const LEVELS=[1,2,3,4,5];
function wordsForLevel(level){ return level==='all'?VOCAB:VOCAB.filter(w=>String(w.level)===String(level)); }
function chaptersForLevel(level){
  const set=new Set(wordsForLevel(level).map(w=>Number(w.chapter||0)));
  return [...set].sort((a,b)=>a-b);
}
function chapterTitle(level,ch){
  const w=VOCAB.find(x=>String(x.level)===String(level)&&Number(x.chapter||0)===Number(ch));
  return w?w.chapterTitle:'';
}
function wordsInChapter(level,ch){ return VOCAB.filter(w=>String(w.level)===String(level)&&Number(w.chapter||0)===Number(ch)); }
function statusOf(id){ const p=DB.progress[id]; return p?p.status:'baru'; }
function isDue(w){ const p=DB.progress[w.id]; return p && p.due && p.due<=today() && p.status!=='baru'; }

function levelStats(level){
  const words=wordsForLevel(level);
  let hafal=0,ragu=0,belum=0,baru=0;
  words.forEach(w=>{
    const s=statusOf(w.id);
    if(s==='hafal')hafal++; else if(s==='ragu')ragu++; else if(s==='belum')belum++; else baru++;
  });
  return {total:words.length,hafal,ragu,belum,baru};
}
function overallStats(){ return levelStats('all'); }

/* ================= SESSION QUEUE ================= */
let queue=[], qIdx=0, revealed=false, currentDir='hanzi-meaning', answerMethod='none', starredThis=false;
let writeQuizWriters=[], writeQuizDone=[], writeQuizMistakes=0;
let voiceStream=null, mediaRecorder=null, voiceChunks=[], voiceUrl=null, isRecording=false;
let voiceRecognizer=null, voiceTranscript='';

function priority(w){
  const p=DB.progress[w.id];
  if(!p) return 100;
  let x=0;
  x += p.status==='belum'?70:p.status==='ragu'?45:5;
  if(p.due && p.due<=today()) x+=30;
  return x;
}
let queueRank=new Map(); // id -> urutan prioritas normal (untuk mematikan acak di tengah sesi)
const STATUS_LABEL={hafal:'Hafal',ragu:'Ragu',belum:'Belum',baru:'Belum dipelajari'};
function shuffled(arr){
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; }
  return a;
}
function uniqueWords(list){ const seen=new Set(); return list.filter(w=>{ if(seen.has(w.id)) return false; seen.add(w.id); return true; }); }
function poolFor(lvl,ch){
  let pool = lvl==='all'?[...VOCAB]:VOCAB.filter(w=>String(w.level)===String(lvl));
  if(ch!=='all') pool=pool.filter(w=>String(w.chapter||0)===String(ch));
  return pool;
}
// baseOrder = urutan prioritas normal, pickOrder = urutan pemilihan kata (diacak per kelompok bila shuffle aktif)
function makeQueue(baseOrder,pickOrder,limit){
  queueRank=new Map(baseOrder.map((w,i)=>[w.id,i]));
  let picked=pickOrder.slice(0,limit);
  if(DB.settings.shuffle) picked=shuffled(picked);
  queue=picked; qIdx=0;
}
// acak / kembalikan urutan untuk kartu yang belum dijawab saja
function buildQueue(){
  const lvl=DB.settings.level, ch=DB.settings.chapter, count=DB.settings.count;
  let status=DB.settings.status||'all';
  const base=poolFor(lvl,ch);
  let pool=status==='all'?base:base.filter(w=>statusOf(w.id)===status);
  if(!pool.length && status!=='all'){ status='all'; DB.settings.status='all'; pool=base; } // filter lama sudah kosong
  const due=pool.filter(w=>isDue(w)).sort((a,b)=>priority(b)-priority(a));
  const weak=pool.filter(w=>!isDue(w)&&statusOf(w.id)==='ragu').sort((a,b)=>priority(b)-priority(a));
  const fresh=status==='baru'?pool.filter(w=>statusOf(w.id)==='baru'):SRS.capNew(pool.filter(w=>statusOf(w.id)==='baru'));
  const mastered=pool.filter(w=>!isDue(w)&&statusOf(w.id)==='hafal');
  const groups=[due,weak,fresh,mastered,status==='baru'?pool:SRS.capNew(pool)];
  const baseOrder=uniqueWords(groups.flat());
  const pickOrder=DB.settings.shuffle?uniqueWords(groups.map(g=>shuffled(g)).flat()):baseOrder;
  const limit = count==='all'?baseOrder.length:Number(count)||20;
  SRS.resetSession();
  makeQueue(baseOrder,pickOrder,limit);
  DB.ui.lastQueueLevel=lvl; DB.ui.lastQueueChapter=ch;
  save();
}

/* ================= SPEECH ================= */
// Pilih suara Mandarin TERBAIK yang tersedia di perangkat user secara otomatis.
// Browser modern (Chrome, Edge, Safari terbaru) biasanya punya beberapa suara zh-CN;
// selama ini app selalu pakai suara default (seringnya robotic). Sekarang kita cari
// suara "Natural"/neural/online kalau ada, baru fallback ke suara zh-CN biasa.
let _zhVoice=null;
function pickZhVoice(){
  const voices=window.speechSynthesis.getVoices()||[];
  const zh=voices.filter(v=>/zh|chinese/i.test(v.lang+' '+v.name));
  if(!zh.length) return null;
  const PREFERRED=[/Xiaoxiao/i,/Yunxi/i,/Yunyang/i,/Xiaoyi/i,/Natural/i,/Online/i,/Google.*(普通话|Mandarin)/i];
  for(const pat of PREFERRED){ const hit=zh.find(v=>pat.test(v.name)); if(hit) return hit; }
  return zh.find(v=>/zh-CN/i.test(v.lang)) || zh[0];
}
if('speechSynthesis' in window){
  _zhVoice=pickZhVoice();
  window.speechSynthesis.onvoiceschanged=()=>{ _zhVoice=pickZhVoice(); };
}
function speak(text){
  if(!('speechSynthesis' in window)||!text) return;
  try{
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang='zh-CN'; u.rate=0.85;
    if(!_zhVoice) _zhVoice=pickZhVoice();
    if(_zhVoice) u.voice=_zhVoice;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
function normalize(v){ return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[，。！？、,.!?;:()[\]{}"']/g,' ').replace(/\s+/g,' ').trim(); }

/* ================= EXAMPLE SENTENCE LOOKUP ================= */
function findExample(w){
  const list=(window.HANYOU_DATA.examples||{})[w.id]||[];
  const cur=list.find(e=>Array.isArray(e));           // contoh curated: hanzi, pinyin, arti
  if(cur) return {hanzi:cur[0],pinyin:cur[1],arti:cur[2]};
  const hit=SENTENCES.find(s=>s.hanzi.includes(w.hanzi));
  if(hit) return hit;
  const mined=list.filter(e=>typeof e==='string');     // ditambang dari soal ujian HSK (tanpa pinyin/terjemahan)
  if(mined.length) return {hanzi:mined[(DB.meta.totalAnswered||0)%mined.length],pinyin:'',arti:'Contoh dari soal ujian HSK',mined:true};
  return null;
}

/* ================= NAVIGATION ================= */
const VIEWS=['berandaView','belajarView','progresView','libraryView'];
const TOPBARS={berandaView:'topBeranda',belajarView:'topBelajar',progresView:'topProgres',libraryView:'topLibrary'};
function showView(id){
  VIEWS.forEach(v=>{
    document.getElementById(v).classList.toggle('active',v===id);
    document.getElementById(TOPBARS[v]).style.display=(v===id)?'':'none';
  });
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.nav===id));
  if(id==='berandaView') renderBeranda();
  if(id==='belajarView'){ showBelajarHome(); }
  if(id==='progresView') renderProgres();
  if(id==='libraryView') renderLibrary();
  window.scrollTo(0,0);
}
document.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.nav)));

/* ---- Sidebar V3: click-to-open, workspace benar-benar bergeser ---- */
(function initCollapsibleSidebar(){
  const app=document.getElementById('app');
  const sidebar=document.getElementById('mainSidebar');
  const toggle=document.getElementById('sidebarToggle');
  if(!app || !sidebar || !toggle) return;
  const key='mmp_sidebar_open_v3';
  const isDesktop=()=>window.matchMedia('(min-width:640px)').matches;
  function setSidebar(open,persist=true){
    const active=!!open && isDesktop();
    app.classList.toggle('sidebar-open',active);
    toggle.setAttribute('aria-expanded',active?'true':'false');
    toggle.setAttribute('aria-label',active?'Tutup menu':'Buka menu');
    toggle.title=active?'Tutup menu':'Buka menu';
    const use=toggle.querySelector('use');
    if(use) use.setAttribute('href',active?'#i-chevron-left':'#i-chevron-right');
    if(persist) try{localStorage.setItem(key,active?'1':'0')}catch(e){}
  }
  let saved=false;
  try{saved=localStorage.getItem(key)==='1'}catch(e){}
  setSidebar(saved,false);
  toggle.addEventListener('click',()=>setSidebar(!app.classList.contains('sidebar-open')));
  window.addEventListener('resize',()=>{
    if(!isDesktop()) setSidebar(false,false);
    else setSidebar(tryGetSidebarState(),false);
  });
  function tryGetSidebarState(){try{return localStorage.getItem(key)==='1'}catch(e){return false}}
  document.getElementById('profileNav')?.addEventListener('click',()=>{
    document.getElementById('accountModal')?.classList.add('open');
  });
})();
/* Notifikasi jadwal dihubungkan setelah modul Atur Jadwal dimuat. */

/* ---- Belajar sub-mode: 4 menu utama -> Kosa Kata / Latihan Soal / Atur Jadwal / Games ---- */
let belajarMode='home';
const BELAJAR_ORDER={home:0,menghafal:0,latihan:1,games:2};
function refreshBelajarBadges(){
  const set=(sel,txt)=>{ const card=document.querySelector(sel); if(!card) return; let e=card.querySelector('.bc-badge'); if(!e){ e=document.createElement('em'); e.className='bc-badge'; card.appendChild(e); } e.textContent=txt; };
  try{ const due=VOCAB.filter(w=>isDue(w)).length; set('#belajarCategoryGrid [data-belajarmode="menghafal"]', due>0?due+' review':'Semua beres'); }catch(e){ set('#belajarCategoryGrid [data-belajarmode="menghafal"]','Flashcard'); }
  try{ let d=0,t=0; getAllPaket().forEach(pk=>pk.skills.forEach(sk=>{ const r=latihanSkillProgress(pk.id,sk.cat); d+=r.done; t+=r.total; })); set('#belajarCategoryGrid [data-belajarmode="latihan"]', t?Math.round(d/t*100)+'% selesai':'Soal HSK'); }catch(e){ set('#belajarCategoryGrid [data-belajarmode="latihan"]','Soal HSK'); }
  try{ const td=today(); const all=[].concat(scheduleRead('study'),scheduleRead('exam')); const n=all.filter(r=>r.date===td).length; const up=all.filter(r=>r.date>td).length; set('#aturJadwalMenu', n>0?'Hari ini: '+n:(up>0?up+' jadwal':'Belum ada')); }catch(e){ set('#aturJadwalMenu','Rencana'); }
  set('#belajarCategoryGrid [data-belajarmode="games"]','Mini game');
}
function applyBelajarTheme(mode){
  refreshBelajarBadges();
  const m=(mode==='home')?'menghafal':mode; // halaman awal menampilkan kartu Kosa Kata
  ['belajarView','topBelajar'].forEach(id=>{ const el=document.getElementById(id); if(el) el.setAttribute('data-bmode',m); });
  const lgUse=document.querySelector('#belajarLogo use'); if(lgUse) lgUse.setAttribute('href',({menghafal:'#i-book',latihan:'#i-file',games:'#i-gamepad'})[m]||'#i-book');
  const grid=document.getElementById('belajarCategoryGrid');
  if(grid){ grid.classList.add('has-active'); grid.querySelectorAll('[data-belajarmode]').forEach(b=>b.classList.toggle('active',b.dataset.belajarmode===m)); }
}
function bAnimatePane(el,dir){
  if(!el) return;
  el.classList.remove('bslide-r','bslide-l'); void el.offsetWidth;
  el.classList.add(dir==='l'?'bslide-l':'bslide-r');
  el.addEventListener('animationend',()=>el.classList.remove('bslide-r','bslide-l'),{once:true});
}
const BELAJAR_PANES={menghafal:'belajarMenghafalPane',latihan:'belajarLatihanPane',games:'belajarGamesPane'};
const BELAJAR_TITLES={menghafal:'Kosa Kata',latihan:'Latihan Soal',games:'Games'};
function showBelajarHome(){
  // Halaman awal Belajar: 4 menu tetap tampil, dan kartu swipe Kosa Kata
  // juga tetap tampil tepat di bawahnya. Kartu akan disembunyikan hanya
  // ketika user masuk ke lembar aktivitas lain melalui switchBelajarMode().
  const prevMode=belajarMode;
  belajarMode='home';
  applyBelajarTheme('home');
  const grid=document.getElementById('belajarCategoryGrid');
  if(grid) grid.style.display='grid';

  Object.values(BELAJAR_PANES).forEach(p=>{
    const el=document.getElementById(p);
    if(el) el.classList.remove('active');
  });

  const vocabPane=document.getElementById('belajarMenghafalPane');
  if(vocabPane) vocabPane.classList.add('active');
  if(prevMode==='latihan'||prevMode==='games') bAnimatePane(vocabPane,'l');

  document.getElementById('belajarTitle').textContent='Belajar';
  document.getElementById('belajarSubtitle').textContent='Pilih aktivitas';
  document.getElementById('belajarToolsEnd').style.display='';
  document.getElementById('belajarProgressWrap').style.display='';

  if(!queue.length) buildQueue();
  renderCard();
  window.scrollTo(0,0);
}
function switchBelajarMode(mode){
  const prevMode=belajarMode;
  belajarMode=mode;
  const grid=document.getElementById('belajarCategoryGrid');
  // Empat tab menu tetap tampil di atas saat berada di dalam menu (disembunyikan hanya saat sesi soal/game berjalan, lihat CSS).
  if(grid) grid.style.display='grid';
  Object.values(BELAJAR_PANES).forEach(p=>{
    const el=document.getElementById(p);
    if(el) el.classList.remove('active');
  });
  const selectedPane=document.getElementById(BELAJAR_PANES[mode]);
  if(selectedPane){ selectedPane.classList.add('active'); bAnimatePane(selectedPane,(BELAJAR_ORDER[mode]>=BELAJAR_ORDER[prevMode])?'r':'l'); }
  document.querySelectorAll('#belajarCategoryGrid [data-belajarmode]').forEach(b=>b.classList.toggle('active',b.dataset.belajarmode===mode));
  applyBelajarTheme(mode);
  document.getElementById('belajarTitle').textContent=BELAJAR_TITLES[mode];
  const toolsEnd=document.getElementById('belajarToolsEnd');
  const progWrap=document.getElementById('belajarProgressWrap');
  const subtitle=document.getElementById('belajarSubtitle');
  if(mode==='menghafal'){
    toolsEnd.style.display='';
    progWrap.style.display='';
    subtitle.textContent='HSK Campuran';
    if(!queue.length) buildQueue();
    renderCard();
  }else{
    toolsEnd.style.display='none';
    progWrap.style.display='none';
    subtitle.textContent = mode==='latihan' ? 'Pilih paket soal' : 'Pilih permainan';
  }
  window.scrollTo(0,0);
}
document.getElementById('belajarBackBtn')?.addEventListener('click',()=>{
  if(belajarMode==='home') showView('berandaView'); else showBelajarHome();
});
document.querySelectorAll('#belajarCategoryGrid [data-belajarmode]').forEach(b=>b.addEventListener('click',()=>switchBelajarMode(b.dataset.belajarmode)));
/* ================= ATUR JADWAL: PRIORITAS BELAJAR + UJIAN ================= */
const SCHEDULE_KEYS={study:'study',exam:'exam'};
function scheduleRead(kind){ const a=DB.schedule&&DB.schedule[kind]; return Array.isArray(a)?a.slice():[]; }
function scheduleWrite(kind,val){ DB.schedule=DB.schedule||{study:[],exam:[]}; DB.schedule[kind]=val; save(); }
function scheduleDelete(kind,id){ DB.tomb=DB.tomb||{}; DB.tomb['sc:'+kind+':'+id]=Date.now(); scheduleWrite(kind,scheduleRead(kind).filter(r=>String(r.id)!==String(id))); }
function packageOptions(selectId,selectedValue){
  const sel=document.getElementById(selectId); if(!sel) return;
  const levels=[1,2,3,4,5,6];
  sel.innerHTML=levels.map(level=>`<option value="${level}">HSK ${level}</option>`).join('');
  if(selectedValue!=null && levels.includes(Number(selectedValue))) sel.value=String(selectedValue);
}
function chapterOptions(selectId,level,selectedChapter){
  const sel=document.getElementById(selectId); if(!sel) return;
  const lvl=Number(level)||1;
  const rows=Array.from(new Map(VOCAB.filter(w=>Number(w.level)===lvl && Number(w.chapter)>0).map(w=>[Number(w.chapter),w.chapterTitle||''])).entries()).sort((a,b)=>a[0]-b[0]);
  if(!rows.length){sel.innerHTML='<option value="">Belum tersedia</option>';sel.disabled=true;return;}
  sel.disabled=false;
  sel.innerHTML=rows.map(([ch,title])=>{
    const cleanTitle=String(title||'').replace(/^HSK\s*\d+\s*[·•-]?\s*Bab\s*\d+\s*[-–:]?\s*/i,'').trim();
    const label=cleanTitle?`Bab ${ch} · ${cleanTitle}`:`Bab ${ch}`;
    return `<option value="${ch}">${label}</option>`;
  }).join('');
  if(selectedChapter!=null && rows.some(x=>x[0]===Number(selectedChapter))) sel.value=String(selectedChapter);
}
function chapterTitleFor(level,chapter){
  const w=VOCAB.find(x=>Number(x.level)===Number(level)&&Number(x.chapter)===Number(chapter)&&x.chapterTitle);
  if(!w) return '';
  return String(w.chapterTitle).replace(/^HSK\s*\d+\s*[·•-]?\s*Bab\s*\d+\s*[-–:]?\s*/i,'').trim();
}
function formatSchedDate(v){if(!v)return '-';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(v+'T00:00:00'))}catch(e){return v}}
function renderStudyPlans(){
  const el=document.getElementById('studyPlanList'); if(!el)return;
  const rows=scheduleRead(SCHEDULE_KEYS.study).sort((a,b)=>{const ah=Number(String(a.hsk||'').replace(/\D/g,''))||99,bh=Number(String(b.hsk||'').replace(/\D/g,''))||99,ac=Number(a.chapter)||Number(a.priority)||99,bc=Number(b.chapter)||Number(b.priority)||99;return ah-bh||ac-bc||String(a.date||'').localeCompare(String(b.date||''))});
  el.innerHTML=rows.length?rows.map((r,i)=>{const hsk=r.hsk||r.title||'', chapter=r.chapter?`Bab ${r.chapter}`:(r.priority?`Prioritas ${r.priority}`:''); const title=r.chapterTitle||''; return `<div class="schedule-item"><span class="schedule-badge">${escapeHtml(chapter||hsk)}</span><div class="si-main"><b>${escapeHtml(hsk)}${title?' · '+escapeHtml(title):''}</b><span>${escapeHtml(formatSchedDate(r.date))} · ${escapeHtml(r.time||'')}</span></div><button class="schedule-delete" data-del-study="${r.id}">×</button></div>`}).join(''):'<p class="cfg-note">Belum ada prioritas belajar.</p>';
}
function renderExamSchedules(){
  const el=document.getElementById('examScheduleList'); if(!el)return; const rows=scheduleRead(SCHEDULE_KEYS.exam).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),now=new Date();
  el.innerHTML=rows.length?rows.map((r,i)=>{const exam=new Date(`${r.date}T${r.time||'00:00'}:00`),days=Math.ceil((exam-now)/86400000),badge=days<0?'Selesai':days===0?'Hari ini':`H-${days}`;return `<div class="schedule-item"><span class="schedule-badge">${badge}</span><div class="si-main"><b>${escapeHtml(r.hsk||r.title)}</b><span>${escapeHtml(formatSchedDate(r.date))} · ${escapeHtml(r.time||'')}${r.note?' · '+escapeHtml(r.note):''}</span></div><button class="schedule-delete" data-del-exam="${r.id}">×</button></div>`}).join(''):'<p class="cfg-note">Belum ada jadwal ujian.</p>';
}
function scheduleDateDiff(dateStr){
  if(!dateStr)return Infinity;
  const target=new Date(`${dateStr}T00:00:00`);
  const today=new Date(); today.setHours(0,0,0,0);
  return Math.round((target-today)/86400000);
}
function allScheduleNotifications(){
  const study=scheduleRead(SCHEDULE_KEYS.study).map(r=>({...r,type:'study',label:'Belajar'}));
  const exam=scheduleRead(SCHEDULE_KEYS.exam).map(r=>({...r,type:'exam',label:'Ujian'}));
  return study.concat(exam).filter(r=>r.date).sort((a,b)=>{
    const ad=`${a.date}T${a.time||'23:59'}`,bd=`${b.date}T${b.time||'23:59'}`;
    return ad.localeCompare(bd);
  });
}
function scheduleDisplayTitle(r){
  if(r.type==='study'){
    const hsk=r.hsk||r.title||'Jadwal belajar';
    const chapter=r.chapter?`Bab ${r.chapter}`:'';
    const title=r.chapterTitle||'';
    return `${hsk}${chapter?' · '+chapter:''}${title?' · '+title:''}`;
  }
  return r.hsk||r.title||'Jadwal ujian';
}
function scheduleStatus(r){
  const days=scheduleDateDiff(r.date);
  if(days<0)return {days,label:'Lewat',reminder:false};
  if(days===0)return {days,label:'Hari ini',reminder:true};
  return {days,label:`H-${days}`,reminder:days<=3};
}
function renderNotifications(){
  const el=document.getElementById('notificationList');
  const countEl=document.getElementById('notificationCount');
  const summary=document.getElementById('notificationSummary');
  if(!el)return;
  const rows=allScheduleNotifications();
  const upcoming=rows.filter(r=>scheduleDateDiff(r.date)>=0);
  const reminders=upcoming.filter(r=>scheduleDateDiff(r.date)<=3);
  if(countEl){
    countEl.textContent=reminders.length>99?'99+':String(reminders.length);
    countEl.style.display=reminders.length?'inline-flex':'none';
  }
  if(summary){
    summary.textContent=reminders.length
      ? `${reminders.length} jadwal masuk periode pengingat H-3. Jadwal lain tetap tersimpan di sini.`
      : 'Jadwal belajar dan ujian yang tersimpan akan tampil di sini. Pengingat batas jadwal aktif mulai H-3.';
  }
  if(!rows.length){
    el.innerHTML='<div class="notification-empty">Belum ada jadwal tersimpan. Buat jadwal melalui <b>Atur Jadwal</b>.</div>';
    return;
  }
  el.innerHTML=rows.map(r=>{
    const st=scheduleStatus(r);
    const title=scheduleDisplayTitle(r);
    const icon=r.type==='exam'?'📝':'📚';
    const detail=`${r.label} · ${formatSchedDate(r.date)}${r.time?' · '+r.time:''}${r.note?' · '+r.note:''}`;
    const message=st.days<0?'Jadwal sudah lewat.':st.days===0?'Batas jadwal hari ini.':st.days<=3?'⚠️ Mendekati batas jadwal. Selesaikan sesuai target.':'Jadwal tersimpan.';
    return `<div class="notification-item${st.reminder?' reminder':''}">
      <div class="notification-icon">${icon}</div>
      <div class="notification-copy"><b>${escapeHtml(title)}</b><span>${escapeHtml(detail)}</span><span>${escapeHtml(message)}</span></div>
      <span class="notification-badge">${escapeHtml(st.label)}</span>
    </div>`;
  }).join('');
}
function checkScheduleReminders(){
  const rows=allScheduleNotifications(),reminders=rows.filter(r=>{const d=scheduleDateDiff(r.date);return d>=0&&d<=3;});
  if(!reminders.length){renderNotifications();return false;}
  let notified=false;
  reminders.forEach(r=>{
    const d=scheduleDateDiff(r.date);
    const key=`mmp.scheduleNotified.${ACTIVE_UID||'anon'}.${r.type}.${r.id}.${r.date}`;
    let seen=null; try{ seen=localStorage.getItem(key); }catch(e){}
    if(!seen){
      try{ localStorage.setItem(key,'1'); }catch(e){} notified=true;
      const title=scheduleDisplayTitle(r);
      const label=d===0?'Hari ini':`H-${d}`;
      toast(`Pengingat ${r.label.toLowerCase()}: ${title} · ${label}`);
      if('Notification' in window&&Notification.permission==='granted'){
        try{new Notification('HANYOU · Pengingat Jadwal',{body:`${title} · ${formatSchedDate(r.date)} · ${label}`});}catch(e){}
      }
    }
  });
  renderNotifications();
  return notified;
}
function requestNotificationPermission(){if('Notification' in window&&Notification.permission==='default'){Notification.requestPermission().catch(()=>{})}}

document.getElementById('notificationBtn')?.addEventListener('click',()=>{
  renderNotifications();
  openSheet('notificationSheet');
  requestNotificationPermission();
});
document.getElementById('notificationClose')?.addEventListener('click',()=>closeSheet('notificationSheet'));
document.getElementById('notificationSheetBackdrop')?.addEventListener('click',()=>closeSheet('notificationSheet'));

document.getElementById('aturJadwalMenu')?.addEventListener('click',()=>{
  packageOptions('studyPlanPackage'); packageOptions('examPackage');
  chapterOptions('studyPlanChapter',document.getElementById('studyPlanPackage')?.value||1);
  renderStudyPlans(); renderExamSchedules(); renderNotifications(); openSheet('scheduleSheet'); requestNotificationPermission();
});
document.getElementById('studyPlanPackage')?.addEventListener('change',e=>chapterOptions('studyPlanChapter',e.target.value));
document.getElementById('scheduleClose')?.addEventListener('click',()=>closeSheet('scheduleSheet'));
document.querySelectorAll('[data-schedtab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-schedtab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.schedule-pane').forEach(x=>x.classList.toggle('active',x.id===`schedule${b.dataset.schedtab==='study'?'Study':'Exam'}Pane`))}));
document.getElementById('saveStudyPlan')?.addEventListener('click',()=>{
  const hskSel=document.getElementById('studyPlanPackage'),chapterSel=document.getElementById('studyPlanChapter'),date=document.getElementById('studyPlanDate');
  if(!hskSel?.value||!chapterSel?.value||!date?.value){toast('Pilih HSK, bab, dan tanggal belajar.');return}
  const level=Number(hskSel.value),chapter=Number(chapterSel.value),hsk=`HSK ${level}`,chapterTitle=chapterTitleFor(level,chapter),rows=scheduleRead(SCHEDULE_KEYS.study);
  rows.push({id:Date.now()*1000+Math.floor(Math.random()*1000),hsk,title:`${hsk} · Bab ${chapter}`,chapter,chapterTitle,date:date.value,time:document.getElementById('studyPlanTime').value});
  scheduleWrite(SCHEDULE_KEYS.study,rows);renderStudyPlans();renderNotifications();toast(`Prioritas ${hsk} · Bab ${chapter} tersimpan.`);
});
document.getElementById('saveExamSchedule')?.addEventListener('click',()=>{const sel=document.getElementById('examPackage'),date=document.getElementById('examDate');if(!sel?.value||!date?.value){toast('Pilih HSK dan tanggal ujian.');return}const hsk=`HSK ${sel.value}`,rows=scheduleRead(SCHEDULE_KEYS.exam);rows.push({id:Date.now()*1000+Math.floor(Math.random()*1000),hsk,title:hsk,date:date.value,time:document.getElementById('examTime').value,note:document.getElementById('examNote').value.trim()});scheduleWrite(SCHEDULE_KEYS.exam,rows);renderExamSchedules();renderNotifications();toast('Jadwal ujian tersimpan. Pengingat H-3 aktif.');requestNotificationPermission();});

document.addEventListener('click',e=>{
  const ds=e.target.closest('[data-del-study]'); if(ds){scheduleDelete('study',ds.dataset.delStudy);renderStudyPlans();renderNotifications();}
  const de=e.target.closest('[data-del-exam]'); if(de){scheduleDelete('exam',de.dataset.delExam);renderExamSchedules();renderNotifications();}
});
setTimeout(checkScheduleReminders,1200);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkScheduleReminders();});
window.addEventListener('focus',()=>checkScheduleReminders());

/* ================= GAMES ================= */
const GAME_STATE={type:null,questions:[],index:0,score:0,answered:false,selectedOrder:[],combo:0,bestCombo:0,wrong:[],tries:0,timerId:null,fbTimer:null,over:false};
const GAME_WORD_LEVELS=[1,2,3,4,5];
const GAME_XP_DAILY_CAP=60;
const GAME_DEFS={
  'kilat-kata':{title:'Kilat Kata',icon:'i-bolt',tone:'orange',desc:'60 detik, tebak arti sebanyak mungkin',fmt:v=>v+' kata'},
  'cocok-pasangan':{title:'Cocokkan Pasangan',icon:'i-cards',tone:'purple',desc:'Kartu memori hanzi dan artinya',fmt:v=>v+' poin'},
  'dengar-pilih':{title:'Dengar & Pilih',icon:'i-headphones',tone:'accent',desc:'Dengar suaranya, pilih hanzi yang benar',fmt:v=>v+'/10'},
  'tebak-kata':{title:'Tebak Kata',icon:'i-target',tone:'green',desc:'Lihat arti, pilih hanzi yang tepat',fmt:v=>v+'/10'},
  'susun-kalimat':{title:'Susun Kalimat',icon:'i-shuffle',tone:'yellow',desc:'Susun potongan menjadi kalimat yang benar',fmt:v=>v+'/10'}
};
const GAME_ORDER=['kilat-kata','cocok-pasangan','dengar-pilih','tebak-kata','susun-kalimat'];

/* ---- preferensi perangkat ---- */
function gamePrefGet(k,d){ try{ const v=localStorage.getItem('hanyou_game_'+(ACTIVE_UID||'anon')+'_'+k); return v===null?d:v; }catch(e){ return d; } }
function gamePrefSet(k,v){ try{ localStorage.setItem('hanyou_game_'+(ACTIVE_UID||'anon')+'_'+k,String(v)); }catch(e){} }
let gamePinyin=gamePrefGet('pinyin','1')==='1';
let gameFxOn=gamePrefGet('fx','1')==='1';
let gameLevel=gamePrefGet('level','all');
if(gameLevel!=='all' && !GAME_WORD_LEVELS.includes(Number(gameLevel))) gameLevel='all';

/* ---- rekor & XP (disimpan di DB.meta.gameBest / dailyLog, ikut sinkron) ---- */
function gameBestGet(k){ return Number((DB.meta.gameBest||{})[k])||0; }
function gameBestSet(k,v){ DB.meta.gameBest=DB.meta.gameBest||{}; DB.meta.gameBest[k]=v; }
function gameXpToday(){ const dl=(DB.meta.dailyLog||{})[today()]; return (dl&&dl.gameXp)||0; }
function gameAwardXP(want){
  const day=today();
  DB.meta.dailyLog=DB.meta.dailyLog||{};
  const dl=DB.meta.dailyLog[day]=DB.meta.dailyLog[day]||{answered:0,newWords:0};
  const used=dl.gameXp||0;
  const gain=Math.max(0,Math.min(want,GAME_XP_DAILY_CAP-used));
  const lv0=computeLevel(DB.meta.xp||0).level;
  dl.gameXp=used+gain;
  DB.meta.xp=(DB.meta.xp||0)+gain;
  if(DB.meta.lastDate!==day){ DB.meta.streak = DB.meta.lastDate===yesterday() ? (DB.meta.streak||0)+1 : 1; DB.meta.lastDate=day; }
  DB.meta.weeklyDone=DB.meta.weeklyDone||{}; DB.meta.weeklyDone[day]=true;
  const lv1=computeLevel(DB.meta.xp).level;
  return {gain,capped:gain<want,levelUp:lv1>lv0?lv1:0};
}
/* kata yang salah masuk antrean Review (jatuh satu kotak, jatuh tempo hari ini) */
function gameMarkWeak(words){
  const now=today(); let n=0;
  words.forEach(w=>{
    if(!w||!w.id||!w.hanzi) return;
    const p=DB.progress[w.id];
    if(!p||p.status==='baru'){ DB.progress[w.id]={status:'belum',box:0,due:now,lastReview:now,u:Date.now()}; }
    else{ p.box=Math.max(0,(p.box||0)-1); p.due=now; if(p.status==='hafal') p.status='ragu'; p.u=Date.now(); }
    n++;
  });
  return n;
}
let _gameBadgesReady=false;
function gameEnsureBadges(){
  if(_gameBadgesReady||typeof BADGES==='undefined') return; _gameBadgesReady=true;
  BADGES.push(
    {id:'game10',icon:'🎮',title:'10 Game Selesai',check:()=>gameBestGet('plays')>=10},
    {id:'game50',icon:'🎮',title:'50 Game Selesai',check:()=>gameBestGet('plays')>=50},
    {id:'kilat25',icon:'⚡',title:'Kilat 25 Kata',check:()=>gameBestGet('kilat-kata')>=25},
    {id:'combo10',icon:'🔥',title:'Combo 10 Jawaban',check:()=>gameBestGet('combo')>=10}
  );
}
setTimeout(gameEnsureBadges,0); // BADGES didefinisikan setelah blok ini, jadi daftarkan sesudah skrip selesai dimuat

/* ---- efek: suara, getar, animasi ---- */
let _gameCtx=null;
function gameBeep(ok){
  if(!gameFxOn) return;
  try{
    _gameCtx=_gameCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=_gameCtx.createOscillator(), g=_gameCtx.createGain(), t=_gameCtx.currentTime;
    o.connect(g); g.connect(_gameCtx.destination); o.type='sine';
    if(ok){ o.frequency.setValueAtTime(660,t); o.frequency.setValueAtTime(880,t+.09); }
    else { o.frequency.setValueAtTime(230,t); o.frequency.setValueAtTime(165,t+.1); }
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.12,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+(ok?.22:.3));
    o.start(t); o.stop(t+.32);
  }catch(e){}
}
function gameFx(ok){
  gameBeep(ok);
  if(gameFxOn && navigator.vibrate){ try{ navigator.vibrate(ok?18:[30,40,30]); }catch(e){} }
}
function gameSpeak(text,rate){
  if(!('speechSynthesis' in window)||!text) return false;
  try{
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang='zh-CN'; u.rate=rate||0.85;
    if(!_zhVoice) _zhVoice=pickZhVoice();
    if(_zhVoice) u.voice=_zhVoice;
    window.speechSynthesis.speak(u);
    return true;
  }catch(e){ return false; }
}

/* ---- data soal ---- */
function gameCleanMeaning(w){ return String(w?.arti || w?.meaning || '').trim(); }
function gameShortMeaning(w,max){
  max=max||36;
  const raw=gameCleanMeaning(w).replace(/\s+/g,' ');
  const parts=raw.split(/\s*[,;，；]\s*/).filter(Boolean);
  let out=parts.slice(0,2).join(', ');
  if(out.length>max) out=parts[0]||raw;
  if(out.length>max) out=out.slice(0,max-1)+'…';
  return out;
}
function gameWordPool(){
  const seen=new Set();
  return VOCAB.filter(w=>{
    const L=Number(w.level);
    if(!GAME_WORD_LEVELS.includes(L)||!w.hanzi||!gameCleanMeaning(w)) return false;
    if(gameLevel!=='all' && L!==Number(gameLevel)) return false;
    return true;
  }).filter(w=>{ const k=String(w.hanzi); if(seen.has(k)) return false; seen.add(k); return true; });
}
function gameSentencePool(){ return (window.HANYOU_DATA.gameSentences||[]).slice(); }
function gameDistractors(q,pool,n,keyFn){
  const seen=new Set([keyFn(q)]), out=[];
  for(const w of shuffled(pool)){
    if(w.hanzi===q.hanzi) continue;
    const k=keyFn(w); if(seen.has(k)) continue;
    seen.add(k); out.push(w); if(out.length>=n) break;
  }
  return out;
}
function gameSentenceText(q){ return q.answer.split('').map(l=>q.frag[l]).join(''); }

/* ---- kerangka sesi ---- */
function gameStop(){
  clearInterval(GAME_STATE.timerId); GAME_STATE.timerId=null;
  clearTimeout(GAME_STATE.fbTimer); GAME_STATE.fbTimer=null;
  try{ if('speechSynthesis' in window) window.speechSynthesis.cancel(); }catch(e){}
}
function gameReset(type){
  gameStop();
  Object.assign(GAME_STATE,{type,questions:[],index:0,score:0,answered:false,selectedOrder:[],combo:0,bestCombo:0,wrong:[],tries:0,over:false});
}
function gameShowStage(show){
  const stage=document.getElementById('gameStage'), menu=document.getElementById('gameMenu');
  if(stage){ stage.style.display=show?'block':'none'; stage.classList.toggle('show-py',gamePinyin); }
  if(menu) menu.style.display=show?'none':'';
  const pb=document.getElementById('gamePinyinBtn'); if(pb) pb.setAttribute('aria-pressed',String(gamePinyin));
}
function gameSetHead(title,progress,pill){
  const t=document.getElementById('gameSessionTitle'), p=document.getElementById('gameSessionProgress'), s=document.getElementById('gameScorePill');
  if(t) t.textContent=title; if(p) p.textContent=progress; if(s) s.textContent=pill;
}
function gameStart(type){
  if(!GAME_DEFS[type]) return;
  gameReset(type);
  const body=document.getElementById('gameBody'); if(!body) return;
  if(type==='susun-kalimat'){
    const pool=gameSentencePool();
    GAME_STATE.questions=shuffled(pool).slice(0,Math.min(10,pool.length));
    if(!GAME_STATE.questions.length){ toast('Soal susun kalimat HSK belum tersedia.'); return; }
  }else{
    const pool=gameWordPool();
    if(pool.length<(type==='cocok-pasangan'?12:8)){ toast('Kosakata untuk tingkat ini belum cukup. Ubah tingkat soal di menu game.'); return; }
    if(type==='tebak-kata'||type==='dengar-pilih') GAME_STATE.questions=shuffled(pool).slice(0,10);
  }
  gameShowStage(true);
  window.scrollTo(0,0);
  if(type==='kilat-kata') return renderGameIntro(body,type);
  if(type==='cocok-pasangan') return renderGameIntro(body,type);
  renderGameQuestion();
}
function gameBack(){
  gameStop();
  GAME_STATE.type=null; GAME_STATE.questions=[]; GAME_STATE.over=true;
  gameShowStage(false);
  renderGameMenu();
  window.scrollTo(0,0);
}
function gameCardTop(){
  const total=GAME_STATE.questions.length||1;
  return `<div class="game-top"><div class="game-bar"><i style="width:${Math.round(GAME_STATE.index/total*100)}%"></i></div><span class="game-combo" id="gameCombo" hidden></span></div>`;
}
function gameUpdateCombo(){
  const el=document.getElementById('gameCombo'); if(!el) return;
  if(GAME_STATE.combo>=2){
    el.hidden=false; el.innerHTML=`<svg class="icon icon-fill"><use href="#i-flame"/></svg>×${GAME_STATE.combo}`;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }else el.hidden=true;
}
function gameRegister(ok,q){
  GAME_STATE.tries++;
  if(ok){ GAME_STATE.score++; GAME_STATE.combo++; if(GAME_STATE.combo>GAME_STATE.bestCombo) GAME_STATE.bestCombo=GAME_STATE.combo; }
  else{ GAME_STATE.combo=0; if(q && !GAME_STATE.wrong.some(x=>x.id===q.id)) GAME_STATE.wrong.push(q); }
  gameFx(ok); gameUpdateCombo();
}
function gameNextBtn(){
  const last=GAME_STATE.index>=GAME_STATE.questions.length-1;
  return `<button type="button" class="game-next" id="gameNext" style="display:none">${last?'Lihat hasil':'Soal berikutnya'} <svg class="icon"><use href="#i-chevron-right"/></svg></button>`;
}
function gameRevealNext(){
  const n=document.getElementById('gameNext'); if(n){ n.style.display='flex'; n.addEventListener('click',gameNext); setTimeout(()=>{ try{ n.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} },60); }
}
function renderGameQuestion(){
  const body=document.getElementById('gameBody'); if(!body) return;
  const q=GAME_STATE.questions[GAME_STATE.index], total=GAME_STATE.questions.length;
  gameSetHead(GAME_DEFS[GAME_STATE.type].title,`Soal ${GAME_STATE.index+1}/${total}`,`${GAME_STATE.score} benar`);
  GAME_STATE.answered=false; GAME_STATE.selectedOrder=[];
  if(GAME_STATE.type==='tebak-kata') renderTebakKata(q,body);
  else if(GAME_STATE.type==='dengar-pilih') renderDengar(q,body);
  else renderSusunKalimat(q,body);
  gameUpdateCombo();
}
function gameNext(){
  if(GAME_STATE.index>=GAME_STATE.questions.length-1){ gameFinishRounds(); return; }
  GAME_STATE.index++; renderGameQuestion(); window.scrollTo(0,0);
}
function gameWordOption(o,i,late){
  return `<button type="button" class="game-option" data-game-answer="${escapeHtml(o.hanzi)}"><span class="game-option-letter">${String.fromCharCode(65+i)}</span><span class="game-opt-main"><b>${escapeHtml(o.hanzi)}</b><small class="game-py${late?' game-py-late':''}">${escapeHtml(o.pinyin||'')}</small></span></button>`;
}
function gameMarkOptions(body,q){
  body.querySelectorAll('[data-game-answer]').forEach(b=>{ b.disabled=true; if(b.dataset.gameAnswer===q.hanzi) b.classList.add('correct'); });
}
function gameWordInfo(q){ return `<b>${escapeHtml(q.hanzi)}</b> · ${escapeHtml(q.pinyin||'')} · ${escapeHtml(gameShortMeaning(q,60))}`; }

/* ---- 1. Tebak Kata ---- */
function renderTebakKata(q,body){
  const opts=shuffled([q,...gameDistractors(q,gameWordPool(),3,w=>w.hanzi)]);
  body.innerHTML=`
    <div class="game-card game-word-card">
      ${gameCardTop()}
      <div class="game-kicker">HSK ${Number(q.level)} · Pilih hanzi yang benar</div>
      <div class="game-meaning">${escapeHtml(gameCleanMeaning(q))}</div>
      <div class="game-prompt">Manakah hanzi yang sesuai dengan arti di atas?</div>
      <div class="game-options">${opts.map((o,i)=>gameWordOption(o,i,false)).join('')}</div>
      <div class="game-result" id="gameResult" aria-live="polite"></div>
      ${gameNextBtn()}
    </div>`;
  body.querySelectorAll('[data-game-answer]').forEach(btn=>btn.addEventListener('click',()=>{
    if(GAME_STATE.answered) return; GAME_STATE.answered=true;
    const ok=btn.dataset.gameAnswer===q.hanzi;
    gameRegister(ok,q); gameMarkOptions(body,q); btn.classList.add(ok?'correct':'wrong');
    document.getElementById('gameResult').innerHTML=(ok?`<span class="game-ok"><svg class="icon"><use href="#i-check"/></svg> Benar</span> `:`<span class="game-bad"><svg class="icon"><use href="#i-x"/></svg> Belum tepat.</span> Jawaban: `)+gameWordInfo(q)+` <button type="button" class="game-say" data-say="${escapeHtml(q.hanzi)}" aria-label="Dengar"><svg class="icon"><use href="#i-volume"/></svg></button>`;
    document.getElementById('gameScorePill').textContent=`${GAME_STATE.score} benar`;
    gameRevealNext();
  }));
}

/* ---- 2. Dengar & Pilih ---- */
function renderDengar(q,body){
  const canSpeak='speechSynthesis' in window;
  const opts=shuffled([q,...gameDistractors(q,gameWordPool(),3,w=>w.hanzi)]);
  body.innerHTML=`
    <div class="game-card game-word-card">
      ${gameCardTop()}
      <div class="game-kicker">HSK ${Number(q.level)} · Dengarkan lalu pilih</div>
      <div class="game-listen">
        <button type="button" class="game-play" id="gamePlay" aria-label="Putar suara" ${canSpeak?'':'disabled'}><svg class="icon"><use href="#i-volume"/></svg></button>
        <button type="button" class="game-slow" id="gameSlow" ${canSpeak?'':'disabled'}>Putar pelan</button>
      </div>
      <div class="game-prompt">${canSpeak?'Hanzi mana yang kamu dengar?':'Perangkat ini tidak mendukung suara. Coba browser lain.'}</div>
      <div class="game-options" id="gameOpts">${opts.map((o,i)=>gameWordOption(o,i,true)).join('')}</div>
      <div class="game-result" id="gameResult" aria-live="polite"></div>
      ${gameNextBtn()}
    </div>`;
  const stage=body.querySelector('.game-word-card');
  document.getElementById('gamePlay')?.addEventListener('click',()=>gameSpeak(q.hanzi,.85));
  document.getElementById('gameSlow')?.addEventListener('click',()=>gameSpeak(q.hanzi,.55));
  GAME_STATE.fbTimer=setTimeout(()=>{ if(!GAME_STATE.answered) gameSpeak(q.hanzi,.85); },280);
  body.querySelectorAll('[data-game-answer]').forEach(btn=>btn.addEventListener('click',()=>{
    if(GAME_STATE.answered) return; GAME_STATE.answered=true;
    const ok=btn.dataset.gameAnswer===q.hanzi;
    gameRegister(ok,q); gameMarkOptions(body,q); btn.classList.add(ok?'correct':'wrong');
    stage.classList.add('is-answered');
    document.getElementById('gameResult').innerHTML=(ok?`<span class="game-ok"><svg class="icon"><use href="#i-check"/></svg> Benar</span> `:`<span class="game-bad"><svg class="icon"><use href="#i-x"/></svg> Belum tepat.</span> Jawaban: `)+gameWordInfo(q);
    document.getElementById('gameScorePill').textContent=`${GAME_STATE.score} benar`;
    gameRevealNext();
  }));
}

/* ---- 3. Susun Kalimat ---- */
function renderSusunKalimat(q,body){
  const letters=shuffled(Object.keys(q.frag));
  body.innerHTML=`
    <div class="game-card game-sentence-card">
      ${gameCardTop()}
      <div class="game-kicker">${escapeHtml(q.level||'HSK')} · Susun kalimat</div>
      <div class="game-sentence-instruction">Ketuk potongan kata sesuai urutan kalimat yang benar.</div>
      <div class="game-order-answer is-empty" id="gameOrderAnswer"></div>
      <div class="game-order-frags" id="gameOrderFrags">${letters.map(l=>`<button type="button" class="game-frag" data-frag="${l}">${escapeHtml(q.frag[l])}</button>`).join('')}</div>
      <div class="game-result" id="gameResult" aria-live="polite"></div>
      <div class="game-action-row"><button type="button" class="game-reset" id="gameOrderReset">Reset</button><button type="button" class="game-check" id="gameOrderCheck">Periksa</button></div>
      ${gameNextBtn()}
    </div>`;
  renderGameOrderAnswer(q);
  body.querySelectorAll('[data-frag]').forEach(btn=>btn.addEventListener('click',()=>{
    if(GAME_STATE.answered) return;
    const l=btn.dataset.frag; if(GAME_STATE.selectedOrder.includes(l)) return;
    GAME_STATE.selectedOrder.push(l); btn.classList.add('selected'); renderGameOrderAnswer(q);
  }));
  body.querySelector('#gameOrderReset')?.addEventListener('click',()=>{ if(GAME_STATE.answered) return; GAME_STATE.selectedOrder=[]; body.querySelectorAll('[data-frag]').forEach(b=>b.classList.remove('selected')); renderGameOrderAnswer(q); });
  body.querySelector('#gameOrderCheck')?.addEventListener('click',()=>{
    if(GAME_STATE.answered) return;
    if(GAME_STATE.selectedOrder.length!==Object.keys(q.frag).length){ toast('Pilih semua potongan kalimat terlebih dahulu.'); return; }
    GAME_STATE.answered=true;
    const ok=GAME_STATE.selectedOrder.join('')===q.answer;
    gameRegister(ok,q);
    document.getElementById('gameResult').innerHTML=(ok?`<span class="game-ok"><svg class="icon"><use href="#i-check"/></svg> Benar</span>`:`<span class="game-bad"><svg class="icon"><use href="#i-x"/></svg> Urutan belum tepat.</span><br>Jawaban: <b>${escapeHtml(gameSentenceText(q))}</b>`)+` <button type="button" class="game-say" data-say="${escapeHtml(gameSentenceText(q))}" aria-label="Dengar"><svg class="icon"><use href="#i-volume"/></svg></button>`;
    body.querySelectorAll('[data-frag]').forEach(b=>b.disabled=true);
    const check=document.getElementById('gameOrderCheck'); if(check) check.disabled=true;
    body.querySelector('.game-action-row')?.classList.add('is-done');
    document.getElementById('gameScorePill').textContent=`${GAME_STATE.score} benar`;
    gameRevealNext();
  });
}
function renderGameOrderAnswer(q){
  const el=document.getElementById('gameOrderAnswer'); if(!el) return;
  const sel=GAME_STATE.selectedOrder, total=Object.keys(q.frag).length;
  if(!sel.length){
    el.classList.add('is-empty');
    el.innerHTML='<div class="game-order-hint">Ketuk potongan di bawah untuk mulai menyusun</div><div class="game-order-slots">'+Array.from({length:total},(_,i)=>`<b>${i+1}</b>`).join('')+'</div>';
    return;
  }
  el.classList.remove('is-empty');
  el.innerHTML=sel.map(l=>`<span data-l="${l}">${escapeHtml(q.frag[l])}</span>`).join('<i>→</i>');
  el.querySelectorAll('span[data-l]').forEach(sp=>sp.addEventListener('click',()=>{
    if(GAME_STATE.answered) return;
    const l=sp.dataset.l; GAME_STATE.selectedOrder=GAME_STATE.selectedOrder.filter(x=>x!==l);
    document.querySelector('#gameOrderFrags [data-frag="'+l+'"]')?.classList.remove('selected');
    renderGameOrderAnswer(q);
  }));
}

/* ---- intro untuk game berwaktu ---- */
function renderGameIntro(body,type){
  const d=GAME_DEFS[type], best=gameBestGet(type);
  const txt=type==='kilat-kata'
    ?'Tebak arti hanzi sebanyak mungkin dalam 60 detik. Jawaban salah mengurangi 3 detik, setiap combo 5 jawaban menambah 2 detik.'
    :'Buka dua kartu untuk mencari pasangan hanzi dan artinya. Ada 6 pasang. Waktu dihitung sejak kartu pertama dibuka, makin sedikit salah makin tinggi poinnya.';
  gameSetHead(d.title,type==='kilat-kata'?'Siap?':'6 pasang','');
  body.innerHTML=`<div class="game-card game-intro">
    <div class="game-intro-ic ${d.tone}"><svg class="icon"><use href="#${d.icon}"/></svg></div>
    <h3>${d.title}</h3><p>${txt}</p>
    <div class="game-intro-rec">${best?'Rekor: '+d.fmt(best):'Belum ada rekor'}</div>
    <button type="button" class="game-check" id="gameGo">Mulai</button></div>`;
  document.getElementById('gameScorePill').textContent='';
  document.getElementById('gameGo').addEventListener('click',()=>type==='kilat-kata'?kilatStart():cocokStart());
}

/* ---- 4. Kilat Kata ---- */
function kilatStart(){
  const body=document.getElementById('gameBody'); const G=GAME_STATE;
  G.pool=shuffled(gameWordPool()); G.pi=0; G.endAt=Date.now()+60000; G.over=false; G.locked=false;
  G.timerId=setInterval(kilatTick,100);
  kilatQuestion(body);
}
function kilatLeft(){ return Math.max(0,GAME_STATE.endAt-Date.now()); }
function kilatTick(){
  const G=GAME_STATE; if(G.over) return;
  const stage=document.getElementById('gameStage');
  if(!stage||stage.style.display==='none'){ gameStop(); return; }
  const left=kilatLeft();
  const bar=document.getElementById('kilatBar'), clock=document.getElementById('kilatClock');
  if(bar){ bar.style.width=Math.min(100,left/600)+'%'; bar.parentNode.classList.toggle('low',left<10000); }
  if(clock) clock.textContent=Math.ceil(left/1000)+' dtk';
  if(left<=0) kilatEnd();
}
function kilatQuestion(body){
  const G=GAME_STATE; if(G.over) return;
  if(G.pi>=G.pool.length){ G.pool=shuffled(gameWordPool()); G.pi=0; }
  const q=G.pool[G.pi++]; G.cur=q; G.locked=false;
  const opts=shuffled([q,...gameDistractors(q,G.pool,3,w=>gameShortMeaning(w))]);
  gameSetHead('Kilat Kata',`${G.score} kata`,`${Math.max(0,G.tries-G.score)} salah`);
  body.innerHTML=`<div class="game-card game-kilat">
    <div class="game-timebar"><i id="kilatBar" style="width:${Math.min(100,kilatLeft()/600)}%"></i></div>
    <div class="game-kilat-meta"><span id="kilatClock">${Math.ceil(kilatLeft()/1000)} dtk</span><span class="game-combo" id="gameCombo" hidden></span><span class="game-float" id="kilatFloat"></span></div>
    <div class="game-kicker">HSK ${Number(q.level)} · Pilih arti yang benar</div>
    <div class="game-kilat-hanzi">${escapeHtml(q.hanzi)}</div>
    <small class="game-py game-kilat-py">${escapeHtml(q.pinyin||'')}</small>
    <div class="game-options game-options-text">${opts.map(o=>`<button type="button" class="game-option game-option-text" data-kid="${escapeHtml(o.id)}"><span>${escapeHtml(gameShortMeaning(o))}</span></button>`).join('')}</div>
  </div>`;
  gameUpdateCombo();
  body.querySelectorAll('[data-kid]').forEach(btn=>btn.addEventListener('click',()=>{
    if(G.locked||G.over) return; G.locked=true;
    const ok=btn.dataset.kid===String(q.id);
    gameRegister(ok,q);
    body.querySelectorAll('[data-kid]').forEach(b=>{ b.disabled=true; if(b.dataset.kid===String(q.id)) b.classList.add('correct'); });
    if(!ok) btn.classList.add('wrong');
    const fl=document.getElementById('kilatFloat');
    if(ok && G.combo>0 && G.combo%5===0){ G.endAt+=2000; if(fl){ fl.textContent='+2 dtk'; fl.className='game-float up'; } }
    else if(!ok){ G.endAt-=3000; if(fl){ fl.textContent='−3 dtk'; fl.className='game-float down'; } }
    gameSetHead('Kilat Kata',`${G.score} kata`,`${Math.max(0,G.tries-G.score)} salah`);
    G.fbTimer=setTimeout(()=>{ if(!G.over) kilatQuestion(body); },ok?260:620);
  }));
}
function kilatEnd(){
  const G=GAME_STATE; if(G.over) return; G.over=true; gameStop();
  const acc=G.tries?Math.round(G.score/G.tries*100):0;
  const stars=G.score>=25?3:G.score>=15?2:G.score>=8?1:0;
  gameFinish({
    big:String(G.score), unit:'kata benar', sub:`${acc}% akurat`, stars, best:G.score,
    xp:Math.min(30,G.score+stars*2+(G.bestCombo>=10?3:0)),
    stats:[['Jawaban',G.tries],['Salah',Math.max(0,G.tries-G.score)],['Combo terbaik',G.bestCombo]],
    weak:G.wrong
  });
}

/* ---- 5. Cocokkan Pasangan ---- */
function cocokStart(){
  const G=GAME_STATE, body=document.getElementById('gameBody');
  const short=w=>gameShortMeaning(w,16);
  const seen=new Set();
  const cands=shuffled(gameWordPool()).filter(w=>{ const k=short(w); if(k.endsWith('…')||seen.has(k)) return false; seen.add(k); return true; });
  const picks=cands.slice(0,6);
  if(picks.length<6){ toast('Kosakata belum cukup untuk game ini.'); gameBack(); return; }
  G.cards=shuffled(picks.flatMap(w=>[{k:'h',w},{k:'a',w}])).map((c,i)=>({...c,i,done:false}));
  G.open=[]; G.lock=false; G.mistakes=0; G.found=0; G.miss={}; G.startedAt=0; G.over=false; G.combo=0; G.bestCombo=0;
  gameSetHead('Cocokkan Pasangan','0/6 pasang','0 salah');
  body.innerHTML=`<div class="game-card game-cocok">
    <div class="game-kilat-meta"><span id="cocokClock">0:00</span><span class="game-combo" id="gameCombo" hidden></span></div>
    <div class="mem-grid">${G.cards.map(c=>`<button type="button" class="mem-card" data-ci="${c.i}" aria-label="Kartu ${c.i+1}"><span class="mem-in">
      <span class="mem-face mem-back"><svg class="icon"><use href="#i-sparkle"/></svg></span>
      <span class="mem-face mem-front ${c.k==='h'?'mem-hanzi':'mem-arti'}">${c.k==='h'?`<b>${escapeHtml(c.w.hanzi)}</b><small class="game-py">${escapeHtml(c.w.pinyin||'')}</small>`:`<span>${escapeHtml(short(c.w))}</span>`}</span>
    </span></button>`).join('')}</div>
    <div class="game-result" id="gameResult" aria-live="polite">Ketuk kartu untuk mulai.</div></div>`;
  body.querySelectorAll('[data-ci]').forEach(el=>el.addEventListener('click',()=>cocokTap(el)));
}
function cocokClockText(){ const s=Math.floor((Date.now()-GAME_STATE.startedAt)/1000); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function cocokTap(el){
  const G=GAME_STATE; if(G.lock||G.over) return;
  const c=G.cards[Number(el.dataset.ci)];
  if(c.done||G.open.includes(c)) return;
  if(!G.startedAt){
    G.startedAt=Date.now();
    G.timerId=setInterval(()=>{
      const stage=document.getElementById('gameStage');
      if(!stage||stage.style.display==='none'){ gameStop(); return; }
      const ck=document.getElementById('cocokClock'); if(ck) ck.textContent=cocokClockText();
    },250);
    const r=document.getElementById('gameResult'); if(r) r.textContent='';
  }
  el.classList.add('open'); G.open.push(c);
  if(c.k==='h') gameSpeak(c.w.hanzi,.85);
  if(G.open.length<2) return;
  G.lock=true;
  const [a,b]=G.open, ea=document.querySelector(`[data-ci="${a.i}"]`), eb=document.querySelector(`[data-ci="${b.i}"]`);
  if(a.w.id===b.w.id && a.k!==b.k){
    a.done=b.done=true; G.found++; G.combo++; if(G.combo>G.bestCombo) G.bestCombo=G.combo;
    [ea,eb].forEach(x=>{ x.classList.remove('open'); x.classList.add('matched'); });
    gameFx(true); gameUpdateCombo(); G.open=[]; G.lock=false;
    gameSetHead('Cocokkan Pasangan',`${G.found}/6 pasang`,`${G.mistakes} salah`);
    if(G.found>=6) G.fbTimer=setTimeout(cocokEnd,650);
  }else{
    G.mistakes++; G.combo=0; G.miss[a.w.id]=(G.miss[a.w.id]||0)+1; G.miss[b.w.id]=(G.miss[b.w.id]||0)+1;
    gameFx(false); gameUpdateCombo();
    [ea,eb].forEach(x=>x.classList.add('bad'));
    gameSetHead('Cocokkan Pasangan',`${G.found}/6 pasang`,`${G.mistakes} salah`);
    G.fbTimer=setTimeout(()=>{ [ea,eb].forEach(x=>x&&x.classList.remove('open','bad')); G.open=[]; G.lock=false; },850);
  }
}
function cocokEnd(){
  const G=GAME_STATE; if(G.over) return; G.over=true; gameStop();
  const sec=Math.round((Date.now()-G.startedAt)/1000);
  const points=Math.max(10,Math.min(100,100-G.mistakes*7-Math.max(0,sec-45)));
  const stars=points>=85?3:points>=60?2:1;
  const ids=Object.keys(G.miss).filter(id=>G.miss[id]>=2);
  const weak=[]; G.cards.forEach(c=>{ if(c.k==='h' && ids.includes(String(c.w.id))) weak.push(c.w); });
  gameFinish({
    big:String(points), unit:'poin', sub:`${G.mistakes} salah · ${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`, stars, best:points,
    xp:Math.min(30,12+stars*3+(G.mistakes===0?3:0)),
    stats:[['Pasangan',6],['Salah',G.mistakes],['Combo terbaik',G.bestCombo]],
    weak
  });
}

/* ---- hasil sesi ---- */
function gameFinishRounds(){
  const G=GAME_STATE, total=G.questions.length, pct=Math.round(G.score/total*100);
  const stars=pct>=90?3:pct>=70?2:pct>=40?1:0;
  const per=G.type==='tebak-kata'?2:3;
  gameFinish({
    big:`${G.score}/${total}`, unit:'', sub:`${pct}% benar`, stars, best:G.score,
    xp:Math.min(30,G.score*per+(stars===3?5:0)+(G.bestCombo>=5?3:0)),
    stats:[['Benar',G.score],['Salah',total-G.score],['Combo terbaik',G.bestCombo]],
    weak:G.wrong
  });
}
function gameFinish(o){
  const G=GAME_STATE, d=GAME_DEFS[G.type], body=document.getElementById('gameBody'); if(!body) return;
  const prev=gameBestGet(G.type), isRecord=o.best>prev;
  if(isRecord) gameBestSet(G.type,o.best);
  DB.meta.gameBest=DB.meta.gameBest||{};
  DB.meta.gameBest.plays=(DB.meta.gameBest.plays||0)+1;
  if(G.bestCombo>(DB.meta.gameBest.combo||0)) DB.meta.gameBest.combo=G.bestCombo;
  const xp=gameAwardXP(o.xp);
  const wordsWeak=o.weak.filter(x=>x&&x.hanzi);
  const sentWeak=o.weak.filter(x=>x&&x.frag);
  const nWeak=gameMarkWeak(wordsWeak);
  gameEnsureBadges(); checkBadges(); save();
  try{ if(typeof renderXP==='function') renderXP(); }catch(e){}
  if(xp.levelUp) setTimeout(()=>toast(`Naik ke Level ${xp.levelUp}!`),400);
  const starHtml=[1,2,3].map(i=>`<svg class="icon ${i<=o.stars?'icon-fill on':''}" style="--d:${i*120}ms"><use href="#${i<=o.stars?'i-star':'i-star-o'}"/></svg>`).join('');
  const weakHtml=wordsWeak.length?`<div class="game-weak"><div class="game-weak-title">Perlu diulang (${wordsWeak.length})</div>${wordsWeak.slice(0,8).map(w=>`<div class="game-weak-row"><b>${escapeHtml(w.hanzi)}</b><span>${escapeHtml(w.pinyin||'')} · ${escapeHtml(gameShortMeaning(w,40))}</span><button type="button" class="game-say" data-say="${escapeHtml(w.hanzi)}" aria-label="Dengar"><svg class="icon"><use href="#i-volume"/></svg></button></div>`).join('')}</div>`
    :sentWeak.length?`<div class="game-weak"><div class="game-weak-title">Kalimat yang perlu diulang (${sentWeak.length})</div>${sentWeak.slice(0,5).map(q=>`<div class="game-weak-row"><span class="game-weak-sent">${escapeHtml(gameSentenceText(q))}</span><button type="button" class="game-say" data-say="${escapeHtml(gameSentenceText(q))}" aria-label="Dengar"><svg class="icon"><use href="#i-volume"/></svg></button></div>`).join('')}</div>`:'';
  gameSetHead(d.title,'Selesai',o.big+(o.unit?' '+o.unit:''));
  body.innerHTML=`<div class="game-card game-finish">
    <div class="game-kicker">Sesi selesai</div>
    <div class="game-stars">${starHtml}</div>
    <div class="game-finish-score">${escapeHtml(o.big)}</div>
    ${o.unit?`<div class="game-finish-unit">${escapeHtml(o.unit)}</div>`:''}
    <div class="game-finish-pct">${escapeHtml(o.sub)}</div>
    ${isRecord&&prev>0?'<div class="game-record">Rekor baru!</div>':''}
    <div class="game-xp-line"><svg class="icon icon-fill"><use href="#i-bolt"/></svg>+${xp.gain} XP${xp.capped?' (batas XP game hari ini tercapai)':''}</div>
    <div class="game-stat-row">${o.stats.map(s=>`<div><b>${s[1]}</b><span>${s[0]}</span></div>`).join('')}</div>
    ${weakHtml}
    ${nWeak?`<div class="game-review-note">${nWeak} kata masuk antrean Review.<button type="button" class="game-link" id="gameGoReview">Buka Review</button></div>`:''}
    <div class="game-action-row"><button type="button" class="game-reset" id="gameMenuBtn">Menu game</button><button type="button" class="game-check" id="gameAgain">Main lagi</button></div>
  </div>`;
  document.getElementById('gameAgain')?.addEventListener('click',()=>gameStart(G.type));
  document.getElementById('gameMenuBtn')?.addEventListener('click',gameBack);
  document.getElementById('gameGoReview')?.addEventListener('click',()=>{ gameBack(); showView('berandaView'); setTimeout(()=>document.getElementById('reviewCard')?.click(),60); });
  window.scrollTo(0,0);
}

/* ---- menu game ---- */
function renderGameMenu(){
  const menu=document.getElementById('gameMenu'); if(!menu) return;
  const plays=gameBestGet('plays'), combo=gameBestGet('combo'), xpT=Math.min(GAME_XP_DAILY_CAP,gameXpToday());
  const levels=['all',1,2,3,4,5];
  menu.innerHTML=`
    <div class="game-summary">
      <div><b>${plays}</b><span>game dimainkan</span></div>
      <div><b>${xpT}/${GAME_XP_DAILY_CAP}</b><span>XP game hari ini</span></div>
      <div><b>${combo}</b><span>combo terbaik</span></div>
    </div>
    <div class="section-head" style="margin-top:6px"><h2>Pilih Game</h2></div>
    ${GAME_ORDER.map(k=>{ const d=GAME_DEFS[k], best=gameBestGet(k); return `
    <button type="button" class="menu-row" data-game="${k}">
      <div class="mi" style="background:var(--${d.tone}Soft);color:var(--${d.tone})"><svg class="icon"><use href="#${d.icon}"/></svg></div>
      <div class="mt"><b>${d.title}</b><span>${d.desc}</span></div>
      <span class="game-rec${best?'':' none'}">${best?d.fmt(best):'Baru'}</span>
      <div class="mchev"><svg class="icon"><use href="#i-chevron-right"/></svg></div>
    </button>`; }).join('')}
    <div class="game-set">
      <div class="game-set-title">Tingkat soal</div>
      <div class="game-chips" role="group" aria-label="Tingkat soal">${levels.map(l=>`<button type="button" class="game-chip-lv" data-glevel="${l}" aria-pressed="${String(gameLevel)===String(l)}">${l==='all'?'Semua':'HSK '+l}</button>`).join('')}</div>
      <div class="game-set-row"><span>Tampilkan pinyin</span><button type="button" class="game-switch" role="switch" id="gameSwPinyin" aria-checked="${gamePinyin}"><i></i></button></div>
      <div class="game-set-row"><span>Efek suara &amp; getar</span><button type="button" class="game-switch" role="switch" id="gameSwFx" aria-checked="${gameFxOn}"><i></i></button></div>
    </div>`;
}
function gameSetPinyin(v){
  gamePinyin=v; gamePrefSet('pinyin',v?'1':'0');
  document.getElementById('gameStage')?.classList.toggle('show-py',v);
  document.getElementById('gamePinyinBtn')?.setAttribute('aria-pressed',String(v));
  document.getElementById('gameSwPinyin')?.setAttribute('aria-checked',String(v));
}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
/* ===== WARNA NADA: membungkus tiap suku kata pinyin dengan kelas t1-t5 (hanya untuk tampilan) ===== */
const PY_VOW='aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';
const PY_SYL=new RegExp('(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?['+PY_VOW+']+(?:ng(?!['+PY_VOW+'])|n(?!['+PY_VOW+'])|r(?!['+PY_VOW+']))?','gi');
function pyToneOf(syl){
  const m=syl.toLowerCase();
  if(/[āēīōūǖ]/.test(m)) return 1;
  if(/[áéíóúǘ]/.test(m)) return 2;
  if(/[ǎěǐǒǔǚ]/.test(m)) return 3;
  if(/[àèìòùǜ]/.test(m)) return 4;
  return 5;
}
function toneHtml(py){
  const str=String(py==null?'':py); let out='', last=0, m;
  PY_SYL.lastIndex=0;
  while((m=PY_SYL.exec(str))){
    if(!m[0]){ PY_SYL.lastIndex++; continue; }
    out+=escapeHtml(str.slice(last,m.index))+'<span class="tn t'+pyToneOf(m[0])+'">'+escapeHtml(m[0])+'</span>';
    last=m.index+m[0].length;
  }
  return out+escapeHtml(str.slice(last));
}
document.getElementById('gameMenu')?.addEventListener('click',e=>{
  const g=e.target.closest('[data-game]'); if(g){ gameStart(g.dataset.game); return; }
  const lv=e.target.closest('[data-glevel]'); if(lv){ gameLevel=lv.dataset.glevel; gamePrefSet('level',gameLevel); renderGameMenu(); return; }
  if(e.target.closest('#gameSwPinyin')){ gameSetPinyin(!gamePinyin); return; }
  if(e.target.closest('#gameSwFx')){ gameFxOn=!gameFxOn; gamePrefSet('fx',gameFxOn?'1':'0'); document.getElementById('gameSwFx')?.setAttribute('aria-checked',String(gameFxOn)); if(gameFxOn) gameFx(true); }
});
document.getElementById('gameStage')?.addEventListener('click',e=>{
  const s=e.target.closest('[data-say]'); if(s) gameSpeak(s.dataset.say,.85);
});
document.getElementById('gameBackBtn')?.addEventListener('click',gameBack);
document.getElementById('gamePinyinBtn')?.addEventListener('click',()=>gameSetPinyin(!gamePinyin));
document.querySelector('#belajarCategoryGrid [data-belajarmode="games"]')?.addEventListener('click',()=>{ gameShowStage(false); renderGameMenu(); });
renderGameMenu();

/* ================= LATIHAN SOAL (bank soal HSK) ================= */
const LATIHAN_SETS=window.HANYOU_DATA.latihanStubs; // metadata saja; isi soal dimuat saat paket dibuka
const _setLoads={};
function loadSetParts(id){
  if(_setLoads[id]) return _setLoads[id];
  return _setLoads[id]=window.HANYOU_DATA.loadSet(id).then(d=>{
    ['mendengar','membaca','menulis'].forEach(c=>{ const s=LATIHAN_SETS[c].find(x=>x.id===id); if(s&&d[c]) s.parts=d[c]; });
  }).catch(e=>{ delete _setLoads[id]; throw e; });
}
const LATIHAN_LABELS={mendengar:'Mendengar',membaca:'Membaca',menulis:'Menulis'};
let latihanCat=null, latihanSet=null, latihanAnswers={};
let latihanLevel='HSK 4';
let latihanEntry='menu'; // 'menu' | 'paket' — untuk tombol kembali dari sesi
let latihanActivePaketId=null;

function setsForLevel(cat,level){
  const sets=LATIHAN_SETS[cat]||[];
  if(level==='Semua') return sets;
  return sets.filter(s=>s.level===level);
}
function refreshLatihanMenuSubs(){
  renderPaketList();
}
function getAllPaket(){
  const map={};
  ['mendengar','membaca','menulis'].forEach(cat=>{
    (LATIHAN_SETS[cat]||[]).forEach(s=>{
      if(!map[s.id]) map[s.id]={id:s.id,title:s.title,level:s.level,sub:s.sub,skills:[]};
      map[s.id].skills.push({cat,count:s.count});
    });
  });

  /* Urutan resmi paket: nomor ujian terkecil -> terbesar.
     Nomor paket display dibuat ulang 1,2,3... setelah sorting. */
  const paket=Object.values(map).sort((a,b)=>{
    const na=Number((a.id.match(/\d+/)||['0'])[0]);
    const nb=Number((b.id.match(/\d+/)||['0'])[0]);
    return na-nb;
  });

  const lvCount={};
  paket.forEach((p)=>{
    const exam=(p.sub.match(/H\d+[A-Z]?/)||[p.id.toUpperCase()])[0];
    const lv=p.level||'HSK 4';
    lvCount[lv]=(lvCount[lv]||0)+1;
    p.displayNo=lvCount[lv];
    p.examCode=exam;
    p.title='Paket Soal '+lvCount[lv]+' '+exam;
    p.sub='Ujian '+lv;
  });
  return paket;
}
function getPaketView(){ try{ return localStorage.getItem('hanyou_paket_view')==='grid'?'grid':'list'; }catch(e){ return window.__paketView||'list'; } }
function setPaketView(v){ window.__paketView=v; try{ localStorage.setItem('hanyou_paket_view',v); }catch(e){} renderPaketList(); }
document.querySelectorAll('#paketViewToggle [data-pkview]').forEach(b=>b.addEventListener('click',()=>setPaketView(b.dataset.pkview)));
function renderPaketList(){
  const list=getAllPaket().filter(p=>latihanLevel==='Semua'||p.level===latihanLevel);
  const box=document.getElementById('latihanPaketList');
  if(!list.length){ box.innerHTML='<p class="belajar-empty-note">Belum ada paket soal untuk level ini.</p>'; return; }
  const view=getPaketView();
  box.classList.toggle('pk-grid',view==='grid');
  document.querySelectorAll('#paketViewToggle [data-pkview]').forEach(b=>b.classList.toggle('active',b.dataset.pkview===view));
  box.innerHTML=list.map((p,i)=>{
    let done=0,total=0;
    p.skills.forEach(sk=>{ const r=latihanSkillProgress(p.id,sk.cat); done+=r.done; total+=r.total; });
    const pct=total?Math.round(done/total*100):0;
    const color=CH_COLORS[i%CH_COLORS.length];
    if(view==='grid'){
      return '<button type="button" class="pk-box" data-paket="'+p.id+'">'
        +'<div class="pk-box-top"><div class="chapter-num" style="background:'+color+'">'+p.displayNo+'</div><div class="chapter-pct">'+pct+'%</div></div>'
        +'<div><b>'+(p.level||'HSK 4')+' '+p.examCode+'</b><small>'+done+' / '+total+' soal selesai</small></div>'
        +'<div class="bar"><i style="width:'+pct+'%;background:'+color+'"></i></div>'
        +'</button>';
    }
    return '<button type="button" class="chapter-row paket-row" data-paket="'+p.id+'">'
      +'<div class="chapter-num" style="background:'+color+'">'+p.displayNo+'</div>'
      +'<div class="chapter-info"><b>'+(p.level||'HSK 4')+' '+p.examCode+'</b><div class="bar"><i style="width:'+pct+'%;background:'+color+'"></i></div></div>'
      +'<div class="chapter-pct">'+pct+'%</div>'
      +'<div class="chapter-chev"><svg class="icon"><use href="#i-chevron-right"/></svg></div>'
      +'</button>';
  }).join('');
  box.querySelectorAll('[data-paket]').forEach(b=>b.addEventListener('click',()=>openPaketDetail(b.dataset.paket)));
}
document.querySelectorAll('#latihanLevelChips [data-level]').forEach(chip=>{
  chip.addEventListener('click',()=>{
    latihanLevel=chip.dataset.level;
    document.querySelectorAll('#latihanLevelChips [data-level]').forEach(c=>c.classList.toggle('active',c===chip));
    refreshLatihanMenuSubs();
  });
});

function latihanSkillProgress(setId,cat){
  const set=(LATIHAN_SETS[cat]||[]).find(s=>s.id===setId);
  if(!set) return {done:0,total:0,pct:0};
  const total=set.count;
  const valid=new Set(set.nos.map(String));
  const bucket=DB.latihanProgress?.[setId+'|'+cat]||{};
  const attempted=new Set(Object.keys(bucket).filter(no=>valid.has(String(no))));

  // Compatibility with progress recorded by older V20 builds.
  // Old builds stored completed/correct questions in latihanDone as
  // "setId|category-question". Those entries must also appear in the
  // package progress counter so an update never makes existing progress vanish.
  Object.keys(DB.latihanDone||{}).forEach(k=>{
    const prefix=setId+'|'+cat+'-';
    if(k.startsWith(prefix)){
      const no=k.slice(prefix.length);
      if(valid.has(String(no))) attempted.add(String(no));
    }
  });
  const done=attempted.size;
  return {done,total,pct:total?Math.round(done/total*100):0};
}

function syncCurrentLatihanProgress(){
  if(!latihanSet||!latihanCat) return;
  const body=document.getElementById('latihanSessionBody');
  if(!body) return;
  latihanSet.parts.forEach(part=>part.items.forEach(item=>{
    const key=latihanCat+'-'+item.no;
    const el=body.querySelector('.quiz-item[data-qkey="'+key+'"]');
    if(!el) return;
    let attempted=false;
    if(part.type==='write') attempted=!!el.querySelector('.write-textarea')?.value.trim();
    else if(part.type==='arrange') attempted=((latihanAnswers[key+'-idxseq']||[]).length>0);
    else if(part.type==='order') attempted=!!(latihanAnswers[key]||'');
    else if(part.type==='cloze') attempted=!!latihanAnswers[key];
    else attempted=latihanAnswers[key]!==undefined && latihanAnswers[key]!==null && String(latihanAnswers[key])!=='';
    if(attempted) markLatihanAttempt(key,false);
  }));
  save();
}
/* "Ulangi dari Awal": progres bagian ini (paket + Mendengar/Membaca/Menulis) kembali 0% */
function resetLatihanProgress(setId,cat){
  const bucketKey=setId+'|'+cat;
  if(DB.latihanProgress) delete DB.latihanProgress[bucketKey];
  Object.keys(DB.latihanDone||{}).forEach(k=>{ if(k.startsWith(bucketKey+'-')) delete DB.latihanDone[k]; });
  DB.tomb=DB.tomb||{};
  DB.tomb['lp:'+bucketKey]=Date.now();
  save();
}
function markLatihanAttempt(key,doSave=true){
  if(!latihanSet||!latihanCat||!key) return;
  DB.latihanProgress=DB.latihanProgress||{};
  const bucketKey=latihanSet.id+'|'+latihanCat;
  DB.latihanProgress[bucketKey]=DB.latihanProgress[bucketKey]||{};
  const m=String(key).match(/(\d+)$/);
  if(!m) return;
  const no=m[1];
  DB.latihanProgress[bucketKey][no]=true;
  if(doSave) save();
}
function refreshActivePaketProgress(){
  if(!latihanActivePaketId) return;
  const paket=getAllPaket().find(p=>p.id===latihanActivePaketId);
  const box=document.getElementById('latihanPaketSkillList');
  if(!paket||!box) return;
  box.innerHTML=paket.skills.map(sk=>renderPaketSkillProgress(sk)).join('');
  box.querySelectorAll('[data-paket-skill]').forEach(b=>{
    b.addEventListener('click',()=>openLatihanSession(b.dataset.paketSkill,latihanActivePaketId,'paket'));
  });
}
function renderPaketSkillProgress(sk){
  const p=latihanSkillProgress(latihanActivePaketId,sk.cat);
  const cfg={mendengar:['#i-volume','var(--accentSoft)','var(--accent)'],membaca:['#i-book','var(--greenSoft)','var(--green)'],menulis:['#i-pencil','var(--purpleSoft)','var(--purple)']}[sk.cat];
  return '<button type="button" class="menu-row skill-progress-row" data-paket-skill="'+sk.cat+'">'
    +'<div class="mi" style="background:'+cfg[1]+';color:'+cfg[2]+'"><svg class="icon"><use href="'+cfg[0]+'"/></svg></div>'
    +'<div class="mt"><b>'+LATIHAN_LABELS[sk.cat]+'</b>'
    +'<div class="skill-progress-wrap"><div class="skill-progress-meta"><span>'+p.done+' / '+p.total+' pertanyaan</span><span class="skill-progress-pct">'+p.pct+'%</span></div><div class="skill-progress-track"><i style="width:'+p.pct+'%"></i></div></div></div>'
    +'<div class="mchev"><svg class="icon"><use href="#i-chevron-right"/></svg></div></button>';
}

function openPaketDetail(paketId){
  const paket=getAllPaket().find(p=>p.id===paketId);
  if(!paket) return;
  latihanActivePaketId=paketId;
  document.getElementById('latihanMenuStage').style.display='none';
  document.getElementById('latihanPaketStage').style.display='block';
  document.getElementById('latihanPaketTitle').textContent=paket.title;
  const icons={mendengar:['#i-volume','var(--accentSoft)','var(--accent)'],membaca:['#i-book','var(--greenSoft)','var(--green)'],menulis:['#i-pencil','var(--purpleSoft)','var(--purple)']};
  document.getElementById('latihanPaketSkillList').innerHTML=paket.skills.map(sk=>renderPaketSkillProgress(sk)).join('');
  refreshActivePaketProgress(); EXAM.renderEntry(paketId);
  document.querySelectorAll('#latihanPaketSkillList [data-paket-skill]').forEach(b=>{
    b.addEventListener('click',()=>openLatihanSession(b.dataset.paketSkill,latihanActivePaketId,'paket'));
  });
  window.scrollTo(0,0);
}
function closePaketDetail(){
  document.getElementById('latihanPaketStage').style.display='none';
  document.getElementById('latihanMenuStage').style.display='block';
  latihanActivePaketId=null;
}
document.getElementById('latihanPaketBackBtn').addEventListener('click',closePaketDetail);

async function openLatihanSession(cat,setId,entry){
  const sets=LATIHAN_SETS[cat];
  if(!sets||!sets.length){ toast('Segera hadir — soal belum ditambahkan'); return; }
  const chosen = setId ? sets.find(s=>s.id===setId) : sets[0];
  if(!chosen){ toast('Segera hadir — soal belum ditambahkan'); return; }
  if(!chosen.parts){
    toast('Memuat soal…');
    try{ await loadSetParts(chosen.id); }
    catch(e){ toast('Soal belum bisa dimuat. Periksa koneksi internet lalu coba lagi.'); return; }
  }
  latihanCat=cat; latihanSet=chosen; latihanAnswers={};
  latihanEntry = entry||'menu';
  PRACTICE.onOpen();
  document.getElementById('latihanMenuStage').style.display='none';
  document.getElementById('latihanPaketStage').style.display='none';
  document.getElementById('latihanSessionStage').style.display='block'; document.querySelector('main')?.classList.add('latihan-wide');
  document.getElementById('app')?.classList.add('sb-collapsed');
  document.getElementById('latihanSessionTitle').textContent=LATIHAN_LABELS[cat]+' · '+latihanSet.title;
  renderLatihanSession();
  if(entry!=='exam') EXAM.openPractice(cat, entry==='paket' ? setId : chosen.id);
  if(typeof READMODE!=='undefined') READMODE.apply();
  window.scrollTo(0,0);
}
function closeLatihanSession(){
  PRACTICE.onClose();
  // Persist every attempted question before leaving the session, including
  // manual Writing answers which have no automatic grading button.
  syncCurrentLatihanProgress();
  document.getElementById('latihanSessionStage').style.display='none'; document.querySelector('main')?.classList.remove('latihan-wide');
  document.getElementById('app')?.classList.remove('sb-collapsed');
  if(latihanEntry==='paket'){ document.getElementById('latihanPaketStage').style.display='block'; openPaketDetail(latihanActivePaketId); }
  else{ document.getElementById('latihanMenuStage').style.display='block'; }
  EXAM.closePractice();
  latihanCat=null; latihanSet=null;
}
document.getElementById('latihanBackBtn').addEventListener('click',closeLatihanSession);

function letterOf(i){ return String.fromCharCode(65+i); }

const CHECK_BTN='<button type="button" class="qi-check-btn" data-check>Periksa</button>';
function renderQuizItem(item,type,part){
  const key=latihanCat+'-'+item.no;
  if(type==='tf'){
    return '<div class="quiz-item" data-qkey="'+key+'"><div class="qi-no">No. '+item.no+'</div>'
      +'<div class="qi-text">★ '+item.text+'</div>'
      +'<div class="qi-tf-row">'
        +'<button type="button" class="qi-opt" data-val="true"><span class="qi-letter">对</span>Benar</button>'
        +'<button type="button" class="qi-opt" data-val="false"><span class="qi-letter">错</span>Salah</button>'
      +'</div>'+CHECK_BTN+'<div class="qi-result-tag"></div></div>';
  }
  if(type==='mc'){
    const pImg = (part && part.passageImages) ? part.passageImages.find(g=>Number(item.no)>=g.from && Number(item.no)<=g.to) : null;
    const passageHtml = item.passage
      ? '<div class="qi-passage">'+item.passage+(pImg?'<div class="qi-passage-img"><img src="'+pImg.src+'" alt="Gambar bacaan nomor '+pImg.from+'–'+pImg.to+'" loading="lazy"></div>':'')+'</div>'
      : (part && /Baca teks/.test(part.instruction||'')
          ? '<div class="qi-passage qi-passage-missing">⚠ Teks bacaan untuk soal ini belum dimasukkan ke data aplikasi (hilang dari sumber asal). Soal & pilihan jawaban tetap bisa dicoba, tapi tanpa konteks bacaannya dulu.</div>'
          : '');
    const qHtml = item.question ? '<div class="qi-text">'+item.question+'</div>' : '<div class="qi-no" style="margin-bottom:8px">Pilih jawaban yang tepat</div>';
    return '<div class="quiz-item" data-qkey="'+key+'"><div class="qi-no">No. '+item.no+'</div>'+passageHtml+qHtml
      +'<div class="qi-opts">'+item.options.map((o,i)=>'<button type="button" class="qi-opt" data-val="'+i+'"><span class="qi-letter">'+letterOf(i)+'</span>'+o+'</button>').join('')+'</div>'
      +CHECK_BTN+'<div class="qi-result-tag"></div></div>';
  }
  if(type==='order'){
    const letters=Object.keys(item.frag);
    return '<div class="quiz-item" data-qkey="'+key+'" data-order="">'
      +'<div class="qi-no">No. '+item.no+' <button type="button" class="order-reset" data-reset-order>reset</button></div>'
      +'<div class="order-answer"></div>'
      +'<div class="order-frags">'+letters.map(l=>'<button type="button" class="order-frag" data-letter="'+l+'"><span class="qi-letter">'+l+'</span>'+item.frag[l]+'</button>').join('')+'</div>'
      +CHECK_BTN+'<div class="qi-result-tag"></div></div>';
  }
  if(type==='arrange'){
    return '<div class="quiz-item" data-qkey="'+key+'" data-arrange="">'
      +'<div class="qi-no">No. '+item.no+' <button type="button" class="order-reset" data-reset-arrange>reset</button></div>'
      +'<div class="arrange-answer">&nbsp;</div>'
      +'<div class="arrange-tiles">'+item.tiles.map((t,i)=>'<button type="button" class="arrange-tile" data-idx="'+i+'">'+t+'</button>').join('')+'</div>'
      +CHECK_BTN
      +'<button type="button" class="order-reset show-arrange-answer" data-show-arrange-answer style="margin-left:8px">Lihat jawaban</button>'
      +'<div class="arrange-sample-answer" style="display:none;margin-top:8px"></div>'
      +'<div class="qi-result-tag"></div></div>';
  }
  if(type==='write'){
    return '<div class="quiz-item" data-qkey="'+key+'"><div class="qi-no">No. '+item.no+'</div>'
      +(item.image?'<div class="write-question-image official-write-question-image"><img src="'+item.image+'" alt="Gambar soal nomor '+item.no+'" loading="lazy"></div>':'')
      +'<div class="qi-text">'+item.word+'</div>'
      +'<textarea class="write-textarea" placeholder="Tulis kalimatmu di sini…"></textarea>'
      +'<button type="button" class="order-reset" data-show-sample style="margin-top:8px">Lihat contoh jawaban</button>'
      +'<div class="write-sample">'+item.sample+'</div></div>';
  }
  return '';
}
function renderClozePart(part){
  const itemsHtml=part.items.map(item=>{
    const key=latihanCat+'-'+item.no;
    const bankHtml='<div class="cloze-bank cloze-bank-per-question">'+part.bank.map(([l,w])=>'<button type="button" class="cloze-chip" data-cloze-val="'+l+'"><b>'+l+'</b>'+w+'</button>').join('')+'</div>';
    return '<div class="quiz-item" data-qkey="'+key+'" data-cloze-bank=\''+JSON.stringify(part.bank)+'\'>'
      +'<div class="qi-no">No. '+item.no+'</div>'
      +bankHtml
      +'<div class="cloze-sentence">'+item.before+'<button type="button" class="cloze-select" data-pick>?</button>'+item.after+'</div>'
      +CHECK_BTN+'<div class="qi-result-tag"></div></div>';
  }).join('');
  return itemsHtml;
}
function partExampleHtml(type){
  const ex={
    tf:{stem:'★ 他今天很忙，没有时间吃午饭。',opts:'对 Benar &nbsp;&nbsp; 错 Salah',ans:'对 Benar — karena kalimatnya memang bercerita bahwa dia sibuk dan tidak sempat makan siang.'},
    mc:{stem:'你觉得他为什么迟到了？',opts:'A 堵车了&nbsp;&nbsp;&nbsp;B 忘记时间&nbsp;&nbsp;&nbsp;C 生病了&nbsp;&nbsp;&nbsp;D 不想来',ans:'A — sesuai konteks/rekaman, alasan yang paling masuk akal adalah terjebak macet.'},
    cloze:{stem:'他每天都（ ? ）去公司上班。',opts:'A 学校&nbsp;&nbsp;&nbsp;B 开车&nbsp;&nbsp;&nbsp;C 桌子&nbsp;&nbsp;&nbsp;D 天气',ans:'B 开车 — kata yang paling pas untuk mengisi kalimat rumpang tentang cara pergi ke kantor.'},
    order:{stem:'Potongan: A 我们 　 B 去公园 　 C 明天',ans:'Susun jadi: C → A → B (明天我们去公园), ketuk tiap potongan sesuai urutannya.'},
    arrange:{stem:'Susun kepingan kata di bawah menjadi satu kalimat yang benar',ans:'Ketuk kepingan kata satu per satu sesuai urutan, sampai membentuk kalimat lengkap.'}
  };
  const e=ex[type]; if(!e) return '';
  return '<div class="qi-example-card"><b>Contoh</b>'+e.stem+(e.opts?'<br>'+e.opts:'')+'<div class="qi-example-ans">→ '+e.ans+'</div></div>';
}
/* ================= MODE BACA: Standar / Paket Asli (khusus HSK 5 · Membaca) =================
   - Hanya menambah elemen tampilan (kelompok teks, nomor, pilihan mode); model jawaban,
     penilaian, progres, dan data soal TIDAK diubah.
   - Pindah mode = ganti atribut data-readmode (CSS saja), jadi jawaban & hasil "Periksa" tetap. */
const READMODE=(function(){
  const KEY='hanyou_readmode';
  const ZH=['选词填空。','请选出与试题内容一致的一项。','请选出正确答案。'];
  function get(){ try{ return localStorage.getItem(KEY)==='paper'?'paper':'std'; }catch(e){ return window.__readMode==='paper'?'paper':'std'; } }
  function put(v){ window.__readMode=v; try{ localStorage.setItem(KEY,v); }catch(e){} }
  function bodyEl(){ return document.getElementById('latihanSessionBody'); }
  /* Mode baca tersedia di semua paket (HSK 1-5, semua bagian). Tata letak lembar penuh hanya untuk HSK 5 Membaca (semua pilihan ganda); lainnya memakai lembar datar umum (pm-gen). */
  function eligible(){ return !!latihanSet && Array.isArray(latihanSet.parts) && latihanSet.parts.length>0; }
  function rich(){
    return latihanCat==='membaca' && !!latihanSet && /HSK\s*5/i.test(latihanSet.level||'')
      && latihanSet.parts.every(p=>p.type==='mc');
  }
  const plain=html=>String(html||'').replace(/<[^>]*>/g,'').replace(/\s+/g,'');
  const rangeLabel=(a,b)=>a===b?a+'.':a+'–'+b+'.';

  /* kelompok = soal berurutan yang memakai teks (dan gambar) bacaan yang sama */
  function groupsOf(part){
    const runs=[]; let prev=null;
    part.items.forEach(item=>{
      let key=null;
      if(item.passage){
        key=plain(item.passage);
        const g=part.passageImages&&part.passageImages.find(x=>Number(item.no)>=x.from&&Number(item.no)<=x.to);
        key+='|'+(g?g.from:'-');
      }
      if(key!==null && key===prev) runs[runs.length-1].push(item);
      else runs.push([item]);
      prev=key;
    });
    return runs;
  }

  function build(){
    const body=bodyEl(); if(!body) return false;
    body.querySelectorAll('.pm-toolbar,.pm-group,.pm-zh').forEach(e=>e.remove());
    document.querySelectorAll('.pm-btn').forEach(e=>e.remove());
    if(!eligible()){ body.removeAttribute('data-readmode'); return false; }
    const partEls=body.querySelectorAll('.quiz-part');
    if(partEls.length!==latihanSet.parts.length){ body.removeAttribute('data-readmode'); return false; }
    if(!rich()){
      partEls.forEach(p=>p.classList.add('pm-gen'));
      body.querySelectorAll('.quiz-item').forEach(e=>e.classList.add('pm-gen'));
      return true;
    }

    latihanSet.parts.forEach((part,pi)=>{
      const partEl=partEls[pi];
      const nos=part.items.map(x=>Number(x.no));
      const cloze=part.items.some(x=>/rumpang/i.test(x.question||''));
      /* judul gaya lembar soal: 第 71-90 题：请选出正确答案。 */
      if(latihanSet.parts.length===3 && nos.length){
        const zh=document.createElement('div');
        zh.className='pm-zh qi-text';
        zh.textContent='第 '+Math.min(...nos)+'-'+Math.max(...nos)+' 题：'+ZH[pi];
        const head=partEl.querySelector('.quiz-part-head');
        if(head) head.after(zh); else partEl.prepend(zh);
      }
      groupsOf(part).forEach((run,gi)=>{
        const first=run[0], last=run[run.length-1];
        const firstEl=partEl.querySelector('.quiz-item[data-qkey="'+latihanCat+'-'+first.no+'"]');
        if(!firstEl) return;
        const single=run.length===1 && !cloze;
        /* nomor di depan kalimat soal, teks soal asli dibungkus supaya bisa disembunyikan (isian) */
        run.forEach(item=>{
          const el=partEl.querySelector('.quiz-item[data-qkey="'+latihanCat+'-'+item.no+'"]');
          if(!el) return;
          el.classList.toggle('pm-single',single);
          el.classList.toggle('pm-cloze',cloze);
          const qt=el.querySelector(':scope > .qi-text');
          if(qt){
            qt.setAttribute('data-pmno',item.no);
            if(!qt.querySelector(':scope > .pm-qtext')){
              const w=document.createElement('span'); w.className='pm-qtext';
              while(qt.firstChild) w.appendChild(qt.firstChild);
              qt.appendChild(w);
            }
          }
        });
        /* blok teks bacaan sekali per kelompok (gambar di kanan, teks mengalir di sampingnya) */
        const srcPass=firstEl.querySelector(':scope > .qi-passage:not(.qi-passage-missing)');
        if(!srcPass) return;
        const g=document.createElement('div'); g.className='pm-group'+(gi===0?' pm-first':'');
        const no=document.createElement('div'); no.className='pm-gno qi-text';
        no.textContent=rangeLabel(first.no,last.no);
        const pass=srcPass.cloneNode(true);
        pass.classList.add('pm-passage');
        const imgWrap=pass.querySelector('.qi-passage-img');
        let imgEl=null;
        if(imgWrap){ imgEl=imgWrap.querySelector('img'); imgWrap.remove(); }
        if(cloze) pass.querySelectorAll('b').forEach(b=>b.replaceWith(...b.childNodes));
        g.append(no);
        if(imgEl){
          const box=document.createElement('div'); box.className='pm-gimg';
          imgEl.removeAttribute('loading');
          box.appendChild(imgEl); pass.prepend(box);
        }
        g.append(pass);
        firstEl.before(g);
      });
    });

    return true;
  }

  const ICON_PM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>';
  /* tombol Mode Baca kini ada di dalam satu tombol pengaturan (DOCK) */
  function ensureButtons(){
    document.querySelectorAll('.pm-btn').forEach(e=>e.remove());
    if(window.DOCK) window.DOCK.mount();
    syncToolbar();
  }
  function syncToolbar(){ if(window.DOCK) window.DOCK.sync(); }
  function toggle(){
    const body=bodyEl(); if(!body||!body.hasAttribute('data-readmode')) return;
    const next=body.getAttribute('data-readmode')==='paper'?'std':'paper';
    setMode(next);
    if(typeof toast==='function') toast(next==='paper'?'Mode Baca aktif':'Mode Baca mati');
  }

  /* 2 kolom bila semua pilihan muat setengah lebar, selain itu 1 kolom (diukur, bukan ditebak) */
  function fitCols(){
    const body=bodyEl(); if(!body) return;
    const boxes=body.querySelectorAll('.quiz-item .qi-opts');
    if(body.getAttribute('data-readmode')!=='paper'){ boxes.forEach(b=>b.classList.remove('pm-two')); return; }
    boxes.forEach(box=>{
      box.classList.remove('pm-two');
      const W=box.clientWidth; if(!W) return;
      const gap=parseFloat(getComputedStyle(box).columnGap)||14;
      let m=0; box.querySelectorAll('.qi-opt').forEach(o=>{ m=Math.max(m,o.getBoundingClientRect().width); });
      if(m>0 && m*2+gap<=W+0.5) box.classList.add('pm-two');
    });
  }

  function topItem(){
    const body=bodyEl(); if(!body) return null;
    const main=document.getElementById('xsMain');
    const top=main?main.getBoundingClientRect().top:0;
    const items=body.querySelectorAll('.quiz-item');
    for(const it of items){ if(it.getBoundingClientRect().bottom>top+48) return it; }
    return null;
  }

  function setMode(m){
    const body=bodyEl(); if(!body||!body.hasAttribute('data-readmode')) return;
    m=(m==='paper')?'paper':'std';
    const anchor=topItem();
    put(m);
    body.setAttribute('data-readmode',m);
    syncToolbar(); fitCols();
    if(anchor) requestAnimationFrame(()=>{
      try{
        /* kalau soal itu pembuka kelompok, tampilkan juga teks bacaan di atasnya */
        const g=anchor.previousElementSibling;
        (m==='paper' && g && g.classList.contains('pm-group') ? g : anchor).scrollIntoView({block:'start'});
      }catch(e){}
    });
  }

  function apply(){
    try{
      const ok=build();
      const body=bodyEl(); if(!body||!ok) return;
      body.setAttribute('data-readmode',get());
      ensureButtons();
      fitCols();
      requestAnimationFrame(fitCols);
      if(document.fonts&&document.fonts.ready) document.fonts.ready.then(fitCols).catch(()=>{});
    }catch(e){ try{ console.warn('READMODE',e); }catch(_){} }
  }

  let rz=0;
  window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(fitCols,120); });
  return { apply, setMode, toggle, get, fitCols, eligible, ICON_PM };
})();

let latihanItemIndex={};
function renderLatihanSession(){
  const body=document.getElementById('latihanSessionBody');
  let html='';
  latihanItemIndex={};
  if(latihanCat==='mendengar'){
    if(latihanSet.audio){
      html+='<div class="quiz-audio-card"><b>🎧 Audio Latihan Mendengar</b><audio controls preload="metadata" src="'+latihanSet.audio+'"></audio></div>';
    }else if(latihanSet.audioPath){
      html+='<div class="quiz-audio-card" id="quizAudioCard"><b>🎧 Audio Latihan Mendengar</b><p style="font-size:calc(12px * var(--fs,1));color:var(--muted);margin:6px 0 0" id="quizAudioStatus">Memuat audio dari cloud…</p></div>';
    }else{
      html+='<div class="quiz-audio-card"><b>🎧 Audio belum tersedia</b><span style="display:block;color:var(--muted);font-size:calc(12px * var(--fs,1));margin-top:6px">PDF soal yang diberikan tidak menyertakan file audio. Soal dan kunci sudah dimasukkan, tetapi bagian Mendengar membutuhkan audio sumber agar dapat dikerjakan seperti ujian asli.</span></div>';
    }
  }
  latihanSet.parts.forEach(part=>{
    html+='<div class="quiz-part"><div class="quiz-part-head"><b>'+part.title+'</b><span>'+(part.instruction||'')+'</span></div>';
    html+=partExampleHtml(part.type);
    if(part.type==='cloze'){ html+=renderClozePart(part); }
    else{ html+=part.items.map(item=>renderQuizItem(item,part.type,part)).join(''); }
    part.items.forEach(item=>{ latihanItemIndex[latihanCat+'-'+item.no]={part,item}; });
    html+='</div>';
  });
  html+='<div class="quiz-score-card" id="quizScoreCard" style="display:none"></div>'
    +'<button type="button" class="quiz-submit-btn" id="quizSubmitBtn">Periksa Semua Jawaban</button>'
    +'<button type="button" class="quiz-reset-btn" id="quizResetBtn">Ulangi dari Awal</button>';
  body.setAttribute('data-latihan-cat', latihanCat);
  body.querySelectorAll('audio').forEach(x=>{ try{ x.pause(); x.removeAttribute('src'); x.load(); }catch(e){} });
  body.innerHTML=html;
  bindLatihanEvents();
  if(latihanCat==='mendengar' && !latihanSet.audio && latihanSet.audioPath) loadLatihanAudioFromCloud(latihanSet);
  EXAM.afterRender();
  if(typeof READMODE!=='undefined') READMODE.apply();
  if(typeof KAMUS!=='undefined') KAMUS.apply();
}
/* Ambil audio latihan mendengar dari Firebase Storage hanya saat paketnya dibuka —
   bukan ditanam di kode, supaya file aplikasi tetap kecil dan cepat dimuat. */
async function loadLatihanAudioFromCloud(set){
  const statusEl=document.getElementById('quizAudioStatus');
  if(MMP_LOCAL_PREVIEW){
    if(statusEl) statusEl.textContent='Mode uji lokal: audio cloud belum dihubungkan. Paket/fitur lain tetap bisa diuji.';
    return;
  }

  const card=document.getElementById('quizAudioCard');
  if(!card) return;
  card.querySelectorAll('audio').forEach(x=>{ try{ x.pause(); x.removeAttribute('src'); x.load(); }catch(e){} });

  // AUDIO ONLY PATCH: player dibuat langsung, Hosting menjadi jalur utama.
  card.innerHTML='<b>🎧 Audio Latihan Mendengar</b><audio controls preload="metadata"></audio><p style="font-size:12px;color:var(--muted);margin:6px 0 0" id="quizAudioStatus">Menghubungkan audio...</p>';

  const audio=card.querySelector('audio');
  const status=card.querySelector('#quizAudioStatus')||statusEl;

  try{
    const db=window.MMPFirebase?.db;
    const storage=window.MMPFirebase?.storage;
    const hostingCandidates=[];
    const directUrls=[];
    const storagePaths=[];
    const addUnique=(arr,v)=>{if(v && !arr.includes(v)) arr.push(v);};

    let examCode='';

    if(set.sub){
      const m=String(set.sub).match(/H[0-9]+[A-Z]?/i);
      if(m) examCode=m[0].toUpperCase();
    }

    if(!examCode && set.id){
      const x=String(set.id).replace(/^h/i,'').toUpperCase();
      if(/^H[0-9]+[A-Z]?$/.test(x)) examCode=x;
    }

    if(examCode){
      addUnique(hostingCandidates,location.origin+'/audio/'+examCode+'.mp3');
    }

    if(set.audioPath){
      const raw=String(set.audioPath);
      const path=raw.replace(/^\/+/,'');
      if(/^https?:\/\//i.test(raw)){
        addUnique(directUrls,raw);
      }else{
        addUnique(hostingCandidates,location.origin+'/'+path);
        addUnique(storagePaths,path);
      }
    }

    const firstUrl=hostingCandidates[0]||directUrls[0];

    if(!firstUrl){
      if(status) status.textContent='Audio tidak memiliki jalur Hosting yang valid.';
      return;
    }

    let settled=false;
    let fallbackStarted=false;

    audio.src=firstUrl;
    audio.load();

    const markReady=()=>{
      if(Number.isFinite(audio.duration) && audio.duration>0){
        settled=true;
        set.audio=audio.src;
        if(status) status.textContent='Audio siap digunakan.';
      }
    };

    audio.addEventListener('loadedmetadata',markReady);
    audio.addEventListener('canplay',markReady);

    const fallback=async()=>{
      if(settled || fallbackStarted) return;
      fallbackStarted=true;

      if(db){
        const ids=[];
        if(set.id) ids.push(set.id);

        if(set.sub){
          const m=String(set.sub).match(/H[0-9]+[A-Z]?/i);
          if(m) ids.push(m[0].toLowerCase());
        }

        for(const id of [...new Set(ids)]){
          try{
            const snap=await db.collection('audioBank').doc(id).get();
            if(!snap.exists) continue;

            const meta=snap.data()||{};

            if(meta.downloadUrl) addUnique(directUrls,meta.downloadUrl);
            if(meta.storagePath){
              addUnique(storagePaths,String(meta.storagePath).replace(/^\/+/,''));
            }
          }catch(e){
            console.warn('[MMP Cloud Audio] audioBank fallback gagal:',e);
          }
        }
      }

      if(examCode){
        addUnique(storagePaths,'audio/'+examCode+'.mp3');
        addUnique(storagePaths,'audio/mendengar/'+examCode.toLowerCase()+'.mp3');
        addUnique(hostingCandidates,location.origin+'/audio/mendengar/'+examCode.toLowerCase()+'.mp3');
      }

      if(storage){
        for(const path of storagePaths){
          try{
            const u=await storage.ref(path).getDownloadURL();
            if(u) addUnique(directUrls,u);
          }catch(e){}
        }
      }

      const candidates=[
        ...hostingCandidates.slice(1),
        ...directUrls
      ];

      for(const u of candidates){
        if(settled) return;

        await new Promise(resolve=>{
          const ready=()=>{
            cleanup();

            if(Number.isFinite(audio.duration) && audio.duration>0){
              settled=true;
              set.audio=audio.src;
              if(status) status.textContent='Audio siap digunakan.';
            }

            resolve();
          };

          const error=()=>{
            cleanup();
            resolve();
          };

          const cleanup=()=>{
            audio.removeEventListener('loadedmetadata',ready);
            audio.removeEventListener('canplay',ready);
            audio.removeEventListener('error',error);
          };

          audio.addEventListener('loadedmetadata',ready);
          audio.addEventListener('canplay',ready);
          audio.addEventListener('error',error);
          audio.src=u;
          audio.load();
        });
      }

      if(!settled && status){
        status.textContent='Audio gagal terhubung. Jalur Hosting dan Storage sudah dicoba.';
      }
    };

    audio.addEventListener('error',fallback,{once:true});

    if(status) status.textContent='Audio menghubungkan...';

  }catch(e){
    console.error('[MMP Cloud Audio] gagal memuat audio latihan',e);
    if(statusEl) statusEl.textContent='Audio gagal terhubung.';
  }
}
function bindLatihanEvents(){
  const body=document.getElementById('latihanSessionBody');
  body.querySelectorAll('.quiz-item .qi-opts .qi-opt, .quiz-item .qi-tf-row .qi-opt').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const item=btn.closest('.quiz-item'); const key=item.dataset.qkey;
      latihanAnswers[key]=btn.dataset.val; markLatihanAttempt(key);
      item.querySelectorAll('.qi-opt').forEach(o=>{o.classList.remove('selected');o.classList.remove('v31-hidden');});
      btn.classList.add('selected');
      item.querySelectorAll('.qi-opt').forEach(o=>{ if(o!==btn) o.classList.remove('v31-hidden'); });
      btn.classList.add('v31-hidden');
      let picked=item.querySelector('[data-picked]');
      if(!picked){
        picked=document.createElement('button'); picked.type='button'; picked.className='qi-picked'; picked.dataset.picked='';
        const opts=item.querySelector('.qi-opts, .qi-tf-row');
        if(opts) opts.parentNode.insertBefore(picked,opts);
      }
      const letter=btn.querySelector('.qi-letter')?.textContent||'';
      const label=(btn.textContent||'').replace(letter,'').trim();
      picked.innerHTML='<span>'+letter+' '+label+'</span><small>ketuk untuk ganti</small>';
      picked.onclick=()=>{
        latihanAnswers[key]=undefined;
        btn.classList.remove('selected','v31-hidden');
        item.querySelectorAll('.qi-opt').forEach(o=>o.classList.remove('v31-hidden','selected'));
        picked.remove();
      };
    });
  });
  body.querySelectorAll('[data-pick]').forEach(sel=>{
    sel.addEventListener('click',()=>{
      const item=sel.closest('.quiz-item'); const key=item.dataset.qkey;
      const bank=JSON.parse(item.dataset.clozeBank);
      const cur=latihanAnswers[key];
      if(cur){
        latihanAnswers[key]=undefined;
        sel.textContent='?';
        item.querySelectorAll('[data-cloze-val]').forEach(ch=>ch.classList.remove('v31-hidden'));
      }
    });
  });
  body.querySelectorAll('[data-cloze-val]').forEach(chip=>{
    chip.addEventListener('click',()=>{
      const item=chip.closest('.quiz-item'); const key=item.dataset.qkey;
      latihanAnswers[key]=chip.dataset.clozeVal; markLatihanAttempt(key);
      item.querySelectorAll('[data-cloze-val]').forEach(ch=>ch.classList.remove('v31-hidden'));
      chip.classList.add('v31-hidden');
      const sel=item.querySelector('[data-pick]');
      sel.textContent=chip.dataset.clozeVal;
    });
  });
  body.querySelectorAll('[data-order]').forEach(itemEl=>{
    const answerBox=itemEl.querySelector('.order-answer');
    const key=itemEl.dataset.qkey;
    function refresh(){
      const seq=(latihanAnswers[key]||'').split('').filter(Boolean);
      answerBox.innerHTML=seq.map(l=>'<span data-answer-letter="'+l+'">'+l+'</span>').join('')||'&nbsp;';
      itemEl.querySelectorAll('.order-frag').forEach(f=>f.classList.toggle('used',seq.includes(f.dataset.letter)));
      answerBox.querySelectorAll('[data-answer-letter]').forEach(token=>token.addEventListener('click',()=>{
        const letter=token.dataset.answerLetter;
        latihanAnswers[key]=(latihanAnswers[key]||'').replace(letter,'');
        refresh();
      }));
    }
    itemEl.querySelectorAll('.order-frag').forEach(f=>f.addEventListener('click',()=>{
      let seq=(latihanAnswers[key]||'');
      if(seq.includes(f.dataset.letter)) return;
      if(seq.length>=3) return;
      seq+=f.dataset.letter; latihanAnswers[key]=seq; markLatihanAttempt(key); refresh();
    }));
    itemEl.querySelector('[data-reset-order]').addEventListener('click',()=>{ latihanAnswers[key]=''; refresh(); });
    refresh();
  });
  body.querySelectorAll('[data-arrange]').forEach(itemEl=>{
    const answerBox=itemEl.querySelector('.arrange-answer');
    const key=itemEl.dataset.qkey;
    function refresh(){
      const seq=latihanAnswers[key+'-seq']||[];
      const seqIdx=latihanAnswers[key+'-idxseq']||[];
      answerBox.innerHTML=seq.length?seq.map((txt,i)=>'<span class="arrange-answer-token" data-remove-idx="'+seqIdx[i]+'">'+txt+'</span>').join(''):'&nbsp;';
      itemEl.querySelectorAll('.arrange-tile').forEach(t=>t.classList.toggle('used',seqIdx.includes(Number(t.dataset.idx)) ));
      answerBox.querySelectorAll('[data-remove-idx]').forEach(token=>token.addEventListener('click',()=>{
        const remove=Number(token.dataset.removeIdx);
        const ids=latihanAnswers[key+'-idxseq']||[];
        const vals=latihanAnswers[key+'-seq']||[];
        const pos=ids.indexOf(remove);
        if(pos>=0){ ids.splice(pos,1); vals.splice(pos,1); }
        latihanAnswers[key+'-idxseq']=ids; latihanAnswers[key+'-seq']=vals; latihanAnswers[key]=vals.join(''); markLatihanAttempt(key); refresh();
      }));
    }
    itemEl.querySelectorAll('.arrange-tile').forEach(t=>t.addEventListener('click',()=>{
      const idx=Number(t.dataset.idx);
      let seqIdx=latihanAnswers[key+'-idxseq']||[];
      let seq=latihanAnswers[key+'-seq']||[];
      if(seqIdx.includes(idx)) return;
      seqIdx=seqIdx.concat([idx]); seq=seq.concat([t.textContent]);
      latihanAnswers[key+'-idxseq']=seqIdx; latihanAnswers[key+'-seq']=seq;
      latihanAnswers[key]=seq.join('');
      markLatihanAttempt(key); refresh();
    }));
    itemEl.querySelector('[data-reset-arrange]').addEventListener('click',()=>{
      latihanAnswers[key]=''; latihanAnswers[key+'-seq']=[]; latihanAnswers[key+'-idxseq']=[]; refresh();
    });
    refresh();
  });
  body.querySelectorAll('[data-show-sample]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const wrap=btn.closest('.quiz-item').querySelector('.write-sample');
      wrap.classList.toggle('show');
      btn.textContent=wrap.classList.contains('show')?'Sembunyikan contoh jawaban':'Lihat contoh jawaban';
    });
  });
  body.querySelectorAll('.write-textarea').forEach(area=>{
    area.addEventListener('input',()=>{ if(area.value.trim()) markLatihanAttempt(area.closest('.quiz-item')?.dataset.qkey); });
  });
  body.querySelectorAll('[data-show-arrange-answer]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const itemEl=btn.closest('.quiz-item');
      const key=itemEl.dataset.qkey;
      const entry=latihanItemIndex[key];
      const box=itemEl.querySelector('.arrange-sample-answer');
      const show=box.style.display==='none' || !box.style.display;
      box.style.display=show?'block':'none';
      box.textContent=show ? ('Jawaban: '+(entry?.item?.answer||'')) : '';
      btn.textContent=show?'Sembunyikan jawaban':'Lihat jawaban';
    });
  });
  body.querySelectorAll('[data-check]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const itemEl=btn.closest('.quiz-item');
      const key=itemEl.dataset.qkey;
      const entry=latihanItemIndex[key];
      if(!entry) return;
      gradeOneItem(entry.part,entry.item,itemEl);
    });
  });
  document.getElementById('quizSubmitBtn').addEventListener('click',gradeLatihanSession);
  document.getElementById('quizResetBtn').addEventListener('click',()=>{
    latihanAnswers={};
    resetLatihanProgress(latihanSet.id,latihanCat);
    renderLatihanSession();
    refreshActivePaketProgress();
    if(typeof renderPaketList==='function') renderPaketList();
  });
}
function normalizeCn(s){ return (s||'').replace(/[。！？，、\s]/g,''); }
function gradeOneItem(part,item,itemEl){
  const key=latihanCat+'-'+item.no;
  if(!itemEl) itemEl=document.querySelector('.quiz-item[data-qkey="'+key+'"]');
  if(!itemEl) return false;
  let ok=false;
  if(part.type==='tf'){
    const given=latihanAnswers[key];
    ok = given!==undefined && (given==='true')===item.answer;
    itemEl.querySelectorAll('.qi-opt').forEach(o=>{
      const isCorrectOpt=(o.dataset.val==='true')===item.answer;
      o.classList.remove('correct','wrong');
      if(isCorrectOpt) o.classList.add('correct');
      else if(o.classList.contains('selected')) o.classList.add('wrong');
      o.classList.remove('v31-hidden');
    });
    itemEl.querySelector('[data-picked]')?.remove();
  }else if(part.type==='mc'){
    const given=latihanAnswers[key];
    ok = given!==undefined && Number(given)===item.answer;
    itemEl.querySelectorAll('.qi-opt').forEach((o,i)=>{
      o.classList.remove('correct','wrong');
      if(i===item.answer) o.classList.add('correct');
      else if(o.classList.contains('selected')) o.classList.add('wrong');
      o.classList.remove('v31-hidden');
    });
    itemEl.querySelector('[data-picked]')?.remove();
  }else if(part.type==='cloze'){
    const given=latihanAnswers[key];
    ok = given===item.answer;
    const sel=itemEl.querySelector('[data-pick]');
    sel.classList.remove('correct','wrong');
    sel.classList.add(ok?'correct':'wrong');
    if(!ok) sel.textContent=(given||'?')+' → '+item.answer;
  }else if(part.type==='order'){
    const given=latihanAnswers[key];
    ok = given===item.answer;
    itemEl.querySelector('.order-answer').style.borderColor = ok?'var(--green)':'var(--red)';
  }else if(part.type==='arrange'){
    const given=normalizeCn((latihanAnswers[key+'-seq']||[]).join(''));
    ok = [item.answer].concat(item.alts||[]).some(x=>given===normalizeCn(x));
    itemEl.querySelector('.arrange-answer').style.borderColor = ok?'var(--green)':'var(--red)';
  }
  const tag=itemEl.querySelector('.qi-result-tag');
  if(tag){
    tag.textContent = ok?'✓ Benar':'✗ Salah'+(part.type==='order'||part.type==='cloze'?' (jawaban: '+item.answer+')':(part.type==='mc'?' (jawaban: '+letterOf(item.answer)+')':''));
    tag.classList.remove('ok','no'); tag.classList.add(ok?'ok':'no');
  }
  if(ok){
    const doneKey=(latihanSet&&latihanSet.id||'')+'|'+key;
    if(!DB.latihanDone[doneKey]){ DB.latihanDone[doneKey]=true; save(); }
  }
  return ok;
}
function latihanOverall(){
  const out={done:0,total:0,by:{}};
  ['mendengar','membaca','menulis'].forEach(cat=>{
    let d=0,t=0;
    (LATIHAN_SETS[cat]||[]).forEach(set=>{ const r=latihanSkillProgress(set.id,cat); d+=r.done; t+=r.total; });
    out.by[cat]={done:d,total:t}; out.done+=d; out.total+=t;
  });
  return out;
}
function latihanTotalStats(){ const o=latihanOverall(); return {done:o.done,total:o.total}; }
function gradeLatihanSession(){
  let correct=0,total=0;
  latihanSet.parts.forEach(part=>{
    part.items.forEach(item=>{
      const key=latihanCat+'-'+item.no;
      const itemEl=document.querySelector('.quiz-item[data-qkey="'+key+'"]');
      if(!itemEl) return;

      // Progress means the question has actually been attempted.
      // Writing (96-100) is manual and is intentionally not auto-graded,
      // but it must still count toward progress when the user has typed an answer.
      if(part.type==='write'){
        const area=itemEl.querySelector('.write-textarea');
        if(area && area.value.trim()) markLatihanAttempt(key);
        return;
      }

      total++;
      if(gradeOneItem(part,item,itemEl)) correct++;
    });
  });
  const pct=total?Math.round(correct/total*100):0;
  const card=document.getElementById('quizScoreCard');
  card.style.display='block';
  card.innerHTML='<b>'+correct+' / '+total+' benar ('+pct+'%)</b><span>Skor untuk latihan '+LATIHAN_LABELS[latihanCat]+' · '+latihanSet.title+'</span>'+PRACTICE.scoreHtml(latihanCat,correct,total);
  syncCurrentLatihanProgress();
  refreshActivePaketProgress();
  card.scrollIntoView({behavior:'smooth',block:'center'});
}
refreshLatihanMenuSubs();

function toast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toast._t);
  toast._t=setTimeout(()=>t.classList.remove('show'),1800);
}

/* ================= THEME ================= */
function applyTheme(){
  document.documentElement.setAttribute('data-theme', DB.ui.theme);
  document.getElementById('themeBtn').innerHTML = DB.ui.theme==='dark' ? '<svg class="icon"><use href="#i-sun"/></svg>' : '<svg class="icon"><use href="#i-moon"/></svg>';
}
document.getElementById('themeBtn').addEventListener('click',()=>{
  DB.ui.theme = DB.ui.theme==='dark'?'light':'dark'; save(); applyTheme();
});
document.getElementById('settingsBtn').addEventListener('click',()=>{
  const u=window.MMPFirebase?.auth?.currentUser;
  if(MMP_LOCAL_PREVIEW){
    document.getElementById('accountName').textContent='Mode Uji Lokal';
    document.getElementById('sidebarProfileName').textContent='Profil Saya';
    document.getElementById('sidebarProfileSub').textContent='Mode Uji Lokal';
    document.getElementById('sidebarProfileAvatar').textContent='A';
    document.getElementById('accountEmail').textContent='Data hanya tersimpan di perangkat ini';
    document.getElementById('accountModal').classList.add('open');
    return;
  }
  if(!u){ toast('Silakan masuk terlebih dahulu'); return; }
  document.getElementById('accountName').textContent=u.displayName||'Pengguna';
  document.getElementById('accountEmail').textContent=u.email||'-';
  const sideName=(u.displayName||u.email||'Pengguna').trim();
  document.getElementById('sidebarProfileName').textContent=sideName;
  document.getElementById('sidebarProfileSub').textContent=u.email||'Akun & pengaturan';
  document.getElementById('sidebarProfileAvatar').textContent=(sideName[0]||'A').toUpperCase();
  document.getElementById('accountModal').classList.add('open');
});

/* ================= FIREBASE AUTH V17 ================= */
(function initFirebaseAuthUI(){
  const gate=document.getElementById('authGate'), msg=document.getElementById('authMsg');
  const auth=window.MMPFirebase?.auth;
  const setMsg=(text,type='')=>{msg.textContent=text; msg.className='auth-msg'+(type?' '+type:'');};
  /* Jika Firebase tidak tersedia (mis. sedang dibuka di preview tanpa akses ke
     CDN Firebase, sebelum deploy) ATAU memang sedang mode uji lokal, lewati
     layar login sepenuhnya — jangan mengunci UI di belakang login yang tidak
     mungkin berhasil. Ini juga otomatis mengaktifkan badge "MODE UJI LOKAL". */
  if(MMP_LOCAL_PREVIEW || !auth){
    if(!auth){
      window.MMP_LOCAL_PREVIEW = true;
      const badge=document.getElementById('localPreviewBadge');
      if(badge) badge.style.display='block';
    }
    gate.classList.add('hidden');
    setMsg(auth ? 'Mode Uji Lokal — login Firebase dilewati. Data belajar tersimpan di perangkat ini.' : 'Firebase tidak tersedia di preview ini (tanpa akses internet ke CDN) — melanjutkan dalam Mode Uji Lokal. Data belajar tersimpan di perangkat ini.', 'ok');
    console.info('[MMP Preview] Local preview mode active. No Firebase login/cloud sync required.');
    return;
  }
  const setBusy=(form,busy)=>{const b=form.querySelector('.auth-submit'); if(b){b.disabled=busy; b.textContent=busy?'Memproses...':(form.id==='loginForm'?'Masuk':'Buat Akun');}};
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({prompt:'select_account'});
  const setGoogleBusy=(busy)=>document.querySelectorAll('.google-btn').forEach(b=>{b.disabled=busy;b.querySelector('span').textContent=busy?'Menghubungkan ke Google...':'Lanjutkan dengan Google';});
  const signInWithGoogle=async()=>{
    setGoogleBusy(true);
    setMsg('Menghubungkan ke Google...');
    try{
      const result = await auth.signInWithPopup(googleProvider);
      if(result?.user){
        console.info('[MMP Google Popup] signed in:', result.user.uid, result.user.email);
        setMsg('Login Google berhasil.','ok');
      } else {
        setMsg('Login Google belum menghasilkan akun.','error');
      }
    }catch(err){
      console.error('[MMP Google Popup]', err);
      setMsg(authFriendlyError(err),'error');
    }finally{
      setGoogleBusy(false);
    }
  };
  document.getElementById('googleLoginBtn').addEventListener('click',signInWithGoogle);
  document.getElementById('googleRegisterBtn').addEventListener('click',signInWithGoogle);
  document.querySelectorAll('[data-auth-tab]').forEach(tab=>tab.addEventListener('click',()=>{
    const mode=tab.dataset.authTab;
    document.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===tab));
    document.querySelectorAll('.auth-form').forEach(f=>f.classList.toggle('active',f.id===mode+'Form'));
    setMsg('');
  }));
  document.getElementById('loginForm').addEventListener('submit',async e=>{
    e.preventDefault(); const f=e.currentTarget; setBusy(f,true);
    try{ await auth.signInWithEmailAndPassword(document.getElementById('loginEmail').value.trim(),document.getElementById('loginPassword').value); setMsg('Login berhasil.','ok'); }
    catch(err){ setMsg(authFriendlyError(err),'error'); } finally{setBusy(f,false);}
  });
  document.getElementById('registerForm').addEventListener('submit',async e=>{
    e.preventDefault(); const f=e.currentTarget; const name=document.getElementById('registerName').value.trim(); const email=document.getElementById('registerEmail').value.trim(); const p1=document.getElementById('registerPassword').value; const p2=document.getElementById('registerPassword2').value;
    if(p1!==p2){setMsg('Konfirmasi password tidak sama.','error');return;} if(p1.length<6){setMsg('Password minimal 6 karakter.','error');return;} setBusy(f,true);
    try{ const cred=await auth.createUserWithEmailAndPassword(email,p1); if(name) await cred.user.updateProfile({displayName:name}); setMsg('Akun berhasil dibuat.','ok'); }
    catch(err){ setMsg(authFriendlyError(err),'error'); } finally{setBusy(f,false);}
  });
  document.getElementById('forgotPassword').addEventListener('click',async()=>{
    const email=document.getElementById('loginEmail').value.trim(); if(!email){setMsg('Masukkan email terlebih dahulu.');return;}
    try{await auth.sendPasswordResetEmail(email);setMsg('Link reset password sudah dikirim ke email.','ok');}catch(err){setMsg(authFriendlyError(err),'error');}
  });
  const logoutConfirmModal=document.getElementById('logoutConfirmModal');
  const closeLogoutConfirm=()=>logoutConfirmModal?.classList.remove('open');
  const openLogoutConfirm=()=>logoutConfirmModal?.classList.add('open');
  const performLogout=async()=>{
    closeLogoutConfirm();
    try{
      if(MMP_LOCAL_PREVIEW){
        toast('Mode uji lokal: tidak ada sesi akun untuk dikeluarkan.');
        return;
      }
      await auth.signOut();
      document.getElementById('accountModal')?.classList.remove('open');
      toast('Anda sudah keluar.');
    }catch(err){ toast(authFriendlyError(err)); }
  };
  document.getElementById('logoutBtn').addEventListener('click',openLogoutConfirm);
  document.getElementById('sidebarLogoutBtn')?.addEventListener('click',openLogoutConfirm);
  document.getElementById('logoutCancelBtn')?.addEventListener('click',closeLogoutConfirm);
  document.getElementById('logoutConfirmBtn')?.addEventListener('click',performLogout);
  logoutConfirmModal?.addEventListener('click',e=>{if(e.target===logoutConfirmModal) closeLogoutConfirm();});
  document.getElementById('accountClose').addEventListener('click',()=>document.getElementById('accountModal').classList.remove('open'));
  document.getElementById('accountModal').addEventListener('click',e=>{if(e.target.id==='accountModal')e.currentTarget.classList.remove('open');});
  auth.onAuthStateChanged(user=>{
    if(user){
      gate.classList.add('hidden'); setMsg(''); console.info('[MMP Auth] signed in:',user.uid);
      if(switchAccount(user.uid)) init(); // muat progres milik akun ini saja
      pullFromCloud(user.uid); // begitu login, tarik & sinkronkan progres dari cloud (multi-device)
    }
    else{ if(switchAccount(null)) init(); gate.classList.remove('hidden'); document.querySelector('[data-auth-tab="login"]').click(); document.getElementById('loginEmail').focus(); setMsg('Silakan masuk atau buat akun.'); }
  });
})();
function authFriendlyError(err){
  const c=err?.code||'';
  const map={'auth/invalid-email':'Format email tidak valid.','auth/user-not-found':'Akun dengan email tersebut belum terdaftar.','auth/wrong-password':'Password salah.','auth/invalid-credential':'Email atau password salah.','auth/email-already-in-use':'Email tersebut sudah terdaftar.','auth/weak-password':'Password terlalu lemah. Gunakan minimal 6 karakter.','auth/too-many-requests':'Terlalu banyak percobaan. Coba lagi beberapa saat.','auth/network-request-failed':'Koneksi internet bermasalah.','auth/popup-closed-by-user':'Login Google dibatalkan.','auth/operation-not-allowed':'Login Google belum diaktifkan di Firebase Authentication.','auth/unauthorized-domain':'Domain aplikasi belum diizinkan di Firebase Authentication.','auth/account-exists-with-different-credential':'Email ini sudah memiliki metode login lain. Masuk dengan metode yang sudah ada lalu tautkan Google.','auth/redirect-cancelled-by-user':'Login Google dibatalkan.','auth/popup-blocked':'Browser memblokir jendela Google. Izinkan popup untuk situs ini lalu coba lagi.','auth/popup-closed-by-user':'Jendela Google ditutup sebelum login selesai.','auth/cancelled-popup-request':'Permintaan login Google sebelumnya masih berjalan. Tunggu sebentar lalu coba lagi.','auth/unauthorized-domain':'Domain aplikasi belum diizinkan di Firebase Authentication.'};
  return map[c]||('Terjadi kesalahan Firebase: '+(err?.message||'coba lagi.'));
}


/* ================= BERANDA ================= */
function greetingByTime(){
  // Sapaan Mandarin yang bervariasi sesuai jam, biar tidak monoton tiap buka app.
  const h=new Date().getHours();
  let pool;
  if(h<11) pool=['早上好','你好'];
  else if(h<15) pool=['中午好','你好'];
  else if(h<18) pool=['下午好','你好'];
  else pool=['晚上好','你好'];
  if(Math.random()<0.2) pool=['欢迎回来']; // sesekali diselingi sapaan lain
  return pool[Math.floor(Math.random()*pool.length)];
}
function greetingSubByTime(){
  const h=new Date().getHours();
  if(h<11) return 'Selamat pagi';
  if(h<15) return 'Selamat siang';
  if(h<18) return 'Selamat sore';
  return 'Selamat malam';
}

function renderHomeQuizStats(){
  const ids={
    mendengar:['homeListenStat','homeListenBar'],
    membaca:['homeReadStat','homeReadBar'],
    menulis:['homeWriteStat','homeWriteBar']
  };
  const o=latihanOverall(); // sama persis dengan angka di halaman paket
  Object.keys(ids).forEach(cat=>{
    const r=o.by[cat];
    const stat=document.getElementById(ids[cat][0]), bar=document.getElementById(ids[cat][1]);
    if(stat) stat.textContent=r.done+' / '+r.total;
    if(bar) bar.style.width=(r.total?Math.min(100,r.done/r.total*100):0)+'%';
  });
  const doneEl=document.getElementById('homeQuizDone'), totalEl=document.getElementById('homeQuizTotal');
  if(doneEl) doneEl.textContent=o.done;
  if(totalEl) totalEl.textContent=o.total;
}
function renderBeranda(){
  document.getElementById('streakNumTop').textContent=currentStreak();
  document.getElementById('statStreak').textContent=currentStreak();
  renderXP();
  document.getElementById('greetingText').textContent=greetingByTime()+'! 👋';
  const currentUser=window.MMPFirebase?.auth?.currentUser;
  document.getElementById('greetingSub').textContent = currentUser?.displayName
    ? (greetingSubByTime()+', '+currentUser.displayName+'. Terus belajar hari ini.')
    : (greetingSubByTime()+'! Terus belajar hari ini, sedikit tapi konsisten.');
  const dayIdx=new Date().getDate()%QUOTES.length;
  const quoteEl=document.getElementById('quoteText'); if(quoteEl) quoteEl.textContent='"'+QUOTES[dayIdx]+'"';

  const overall=overallStats();
  document.getElementById('statMastered').textContent=overall.hafal+' / '+overall.total;
  document.getElementById('statMinutes').textContent=studyMinutes();

  const lvl=DB.settings.level==='all'?4:DB.settings.level;
  const chapters=chaptersForLevel(lvl).filter(c=>c>0);
  document.getElementById('progressLevelLabel').textContent='Progress HSK '+lvl;
  let curCh=Number(DB.settings.chapter)||chapters[0]||0;
  if(DB.settings.chapter==='all') curCh=chapters[0]||0;
  const chWords=wordsInChapter(lvl,curCh);
  const chMastered=chWords.filter(w=>statusOf(w.id)==='hafal').length;
  const chPct=chWords.length?Math.round(chMastered/chWords.length*100):0;
  document.getElementById('progressChapterLabel').textContent = chapters.length ? ('Bab '+(chapters.indexOf(curCh)+1)+' / '+chapters.length) : '—';
  document.getElementById('progressLevelBar').style.width=chPct+'%';
  const dotRow=document.getElementById('progressDotRow');
  dotRow.innerHTML=chapters.slice(0,20).map(c=>{
    const cw=wordsInChapter(lvl,c);
    const done=cw.length && cw.every(w=>statusOf(w.id)==='hafal');
    const cls= c===curCh?'now':(done?'done':'');
    return '<span class="dot '+cls+'"></span>';
  }).join('');

  const due=VOCAB.filter(w=>isDue(w)).length;
  document.getElementById('reviewSub').textContent=due+' kata perlu diulang';
  const hasProgress=Object.keys(DB.progress).length>0;
  document.getElementById('startLearnSub').textContent = hasProgress?'Lanjutkan sesi terakhir':'Mulai sesi pertamamu';
  renderHomeQuizStats();
}

document.getElementById('homeQuizOpen')?.addEventListener('click',()=>{
  showView('belajarView');
  document.querySelectorAll('.study-tab').forEach(()=>{});
  const tab=document.querySelector('[data-belajar-mode="latihan"]');
  if(tab) tab.click();
});

document.getElementById('startLearnBtn').addEventListener('click',()=>{ belajarMode='menghafal'; buildQueue(); showView('belajarView'); });
document.getElementById('reviewCard').addEventListener('click',()=>{
  DB.settings.level='all'; DB.settings.chapter='all'; DB.settings.status='all';
  const dueWords=VOCAB.filter(w=>isDue(w));
  if(!dueWords.length){ toast('Tidak ada kata yang perlu direview sekarang'); return; }
  dueWords.sort((a,b)=>priority(b)-priority(a));
  makeQueue(dueWords,dueWords,30);
  save();
  belajarMode='menghafal';
  showView('belajarView');
});

/* ================= BELAJAR / STUDY CARD ================= */
/* ---- Efek suara (WebAudio, tanpa file) + konfeti ---- */
const SFX={ctx:null,on:(function(){ try{ return localStorage.getItem('hanyou_sfx')!=='off'; }catch(e){ return true; } })()};
function sfxCtx(){ if(!SFX.ctx){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; SFX.ctx=new C(); } if(SFX.ctx.state==='suspended') SFX.ctx.resume(); return SFX.ctx; }
function sfxNote(f0,f1,t,dur,type,vol){
  const c=SFX.ctx, o=c.createOscillator(), g=c.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f0,t); if(f1&&f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(vol||0.08,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+0.02);
}
function sfx(kind){
  if(!SFX.on) return;
  try{
    const c=sfxCtx(); if(!c) return; const t=c.currentTime;
    if(kind==='flip') sfxNote(520,820,t,0.09,'sine',0.06);
    else if(kind==='hafal'){ [523.25,659.25,783.99].forEach((f,i)=>sfxNote(f,0,t+i*0.07,0.16,'triangle',0.09)); }
    else if(kind==='ragu'){ sfxNote(392,0,t,0.12,'triangle',0.08); sfxNote(392,0,t+0.14,0.12,'triangle',0.06); }
    else if(kind==='belum') sfxNote(240,150,t,0.22,'sine',0.10);
    else if(kind==='done'){ [523.25,659.25,783.99,1046.5].forEach((f,i)=>sfxNote(f,0,t+i*0.11,0.28,'triangle',0.10)); }
  }catch(e){}
}
function sfxRefreshBtn(){
  const b=document.getElementById('sfxToggle'); if(!b) return;
  b.classList.toggle('on',SFX.on); b.setAttribute('aria-pressed',String(SFX.on));
  b.innerHTML=SFX.on
    ? '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 6 6M22 9l-6 6"/></svg>';
}
document.getElementById('sfxToggle')?.addEventListener('click',()=>{
  SFX.on=!SFX.on; try{ localStorage.setItem('hanyou_sfx',SFX.on?'on':'off'); }catch(e){}
  sfxRefreshBtn(); if(SFX.on) sfx('flip');
});
sfxRefreshBtn();
function confetti(){
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const old=document.getElementById('confettiCanvas'); if(old) old.remove();
  const cv=document.createElement('canvas'); cv.id='confettiCanvas'; document.body.appendChild(cv);
  const dpr=window.devicePixelRatio||1, W=cv.width=innerWidth*dpr, H=cv.height=innerHeight*dpr, ctx=cv.getContext('2d');
  const cols=['#1677FF','#8B5CF6','#22B573','#FFD166','#FF9142','#F43F5E'];
  const ps=Array.from({length:110},()=>({x:W/2+(Math.random()-.5)*W*0.25,y:H*0.45,vx:(Math.random()-.5)*14*dpr,vy:(-Math.random()*13-4)*dpr,s:(5+Math.random()*6)*dpr,r:Math.random()*6.28,vr:(Math.random()-.5)*.4,c:cols[Math.floor(Math.random()*cols.length)]}));
  const t0=performance.now();
  (function frame(t){
    const el=t-t0; ctx.clearRect(0,0,W,H);
    ps.forEach(p=>{ p.vy+=0.45*dpr; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.globalAlpha=Math.max(0,1-el/2200); ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/3,p.s,p.s*0.6); ctx.restore(); });
    if(el<2200) requestAnimationFrame(frame); else cv.remove();
  })(t0);
}
const CHEER=['Mantap! Sesi selesai 🎉','Keren, terus semangat! 💪','Satu langkah lebih dekat ke HSK! 🌟','Hebat, konsisten itu kuncinya! 🔥'];
function currentWord(){ return queue[qIdx]; }
function chooseDirection(w){
  if(DB.settings.direction!=='smart') return DB.settings.direction;
  const dirs=['hanzi-meaning','meaning-hanzi','pinyin-hanzi'];
  return dirs[w.id.length%dirs.length];
}
function renderDailySummary(){
  const sEl=document.getElementById('dsStreak'); if(!sEl) return;
  const log=((DB.meta&&DB.meta.dailyLog)||{})[today()]||{};
  sEl.textContent=currentStreak()+' hari';
  { const ds=document.getElementById('dailySummary'); if(ds) ds.classList.toggle('streak-on',currentStreak()>0); }
  const lim=SRS.limit(), done=log.newWords||0, answered=log.answered||0;
  const ring=document.getElementById('dsRing'), wrap=document.getElementById('dsRingWrap');
  const txt=document.getElementById('dsTargetText'), lab=document.getElementById('dsTargetLabel');
  if(lim>0){
    const pct=Math.min(100,Math.round(done/lim*100));
    txt.textContent=done+'/'+lim; lab.textContent='kata baru hari ini';
    wrap.style.display=''; ring.style.strokeDashoffset=String(100-pct); ring.style.opacity=pct>0?'1':'0'; ring.classList.toggle('done',pct>=100);
  }else{
    txt.textContent=String(answered); lab.textContent='kartu dijawab hari ini';
    wrap.style.display='none';
  }
}
function renderCard(){
  revealed=false;
  const _fin=!!window.__justRated; window.__justRated=false;
  renderDailySummary();
  const w=currentWord();
  document.getElementById('belajarProgressBar').style.width = queue.length? Math.round((qIdx)/queue.length*100)+'%':'0%';
  document.getElementById('belajarSubtitle').textContent = 'HSK '+(DB.settings.level==='all'?'Campuran':DB.settings.level)+(DB.settings.chapter!=='all'?(' · Bab '+DB.settings.chapter):'')+((DB.settings.status&&DB.settings.status!=='all')?(' · '+STATUS_LABEL[DB.settings.status]):'');
  if(!w){
    document.getElementById('studyHanzi').textContent='🎉';
    document.getElementById('studyPinyin').textContent='';
    document.getElementById('studyMeaning').style.display='block';
    document.getElementById('studyMeaning').textContent='Sesi selesai! Progresmu sudah tersimpan.'+(SRS.limit()>0&&SRS.remainingNew()===0?' Jatah kata baru hari ini ('+SRS.limit()+') sudah habis. Ubah di Pengaturan atau pilih filter Baru.':'');
    document.getElementById('studyHint').textContent='Kembali ke Beranda atau mulai sesi baru.';
    if(_fin && queue.length){ confetti(); sfx('done'); try{ toast(CHEER[Math.floor(Math.random()*CHEER.length)]); }catch(e){} }
    ['rateBelum','rateRagu','rateHafal'].forEach(id=>document.getElementById(id).disabled=true);
    document.getElementById('exampleCard').style.display='none';
    document.getElementById('toolListen').disabled=true; document.getElementById('toolStroke').disabled=true;
    return;
  }
  currentDir=chooseDirection(w);
  // kartu baru: penilaian baru aktif setelah kartu dibuka; tombol alat aktif lagi setelah sesi selesai
  ['rateBelum','rateRagu','rateHafal'].forEach(id=>document.getElementById(id).disabled=true);
  document.getElementById('toolListen').disabled=false; document.getElementById('toolStroke').disabled=false;
  const p=ensureP(w);
  document.getElementById('studyLevelBadge').textContent='HSK '+w.level+(w.chapter?(' · Bab '+w.chapter):'');
  document.getElementById('starBtn').classList.toggle('active', !!DB.favorites[w.id]);
  document.getElementById('starBtn').innerHTML = DB.favorites[w.id] ? '<svg class="icon"><use href="#i-star"/></svg>' : '<svg class="icon"><use href="#i-star-o"/></svg>';

  const hanziEl=document.getElementById('studyHanzi'), pinyinRow=document.querySelector('.study-pinyin-row'),
        pinyinEl=document.getElementById('studyPinyin'), meaningEl=document.getElementById('studyMeaning');
  meaningEl.classList.remove('as-prompt'); pinyinEl.classList.remove('as-prompt');

  // Only the element matching the chosen direction is shown up front; everything
  // else stays hidden until reveal so the card is an actual recall quiz, not a
  // giveaway. See revealCard() for what appears once the person taps the card.
  if(currentDir==='meaning-hanzi'){
    hanziEl.style.display='none'; hanziEl.textContent='';
    pinyinRow.style.display='none';
    meaningEl.style.display='block'; meaningEl.textContent=w.arti; meaningEl.classList.add('as-prompt');
  }else if(currentDir==='pinyin-hanzi'){
    hanziEl.style.display='none'; hanziEl.textContent='';
    pinyinRow.style.display='flex'; pinyinEl.innerHTML=toneHtml(w.pinyin); pinyinEl.classList.add('as-prompt');
    meaningEl.style.display='none';
  }else{
    hanziEl.style.display='block'; hanziEl.textContent=w.hanzi;
    pinyinRow.style.display='none';
    meaningEl.style.display='none';
  }
  document.getElementById('studyHint').textContent='Ketuk kartu untuk membuka jawaban';

  document.getElementById('exampleCard').style.display='none';

  resetAnswerUI();
}
function revealCard(){
  if(revealed) return;
  const w=currentWord(); if(!w) return;
  revealed=true;
  const hanziEl=document.getElementById('studyHanzi'), pinyinRow=document.querySelector('.study-pinyin-row'),
        pinyinEl=document.getElementById('studyPinyin'), meaningEl=document.getElementById('studyMeaning');
  hanziEl.style.display='block'; hanziEl.textContent=w.hanzi;
  pinyinRow.style.display='flex'; pinyinEl.innerHTML=toneHtml(w.pinyin); pinyinEl.classList.remove('as-prompt');
  meaningEl.style.display='block'; meaningEl.textContent=w.arti; meaningEl.classList.remove('as-prompt');
  sfx('flip');
  if(!window.matchMedia('(prefers-reduced-motion:reduce)').matches){
    const sc=document.getElementById('studyCard');
    [sc].forEach(el=>{ el.classList.remove('reveal-tilt'); void el.offsetWidth; el.classList.add('reveal-tilt'); el.addEventListener('animationend',()=>el.classList.remove('reveal-tilt'),{once:true}); });
    [pinyinRow,meaningEl].forEach(el=>{ el.classList.remove('reveal-in'); void el.offsetWidth; el.classList.add('reveal-in'); el.addEventListener('animationend',()=>el.classList.remove('reveal-in'),{once:true}); });
  }
  document.getElementById('studyHint').textContent='Geser ← Belum · ↑ Ragu · → Hafal';
  ['rateBelum','rateRagu','rateHafal'].forEach(id=>document.getElementById(id).disabled=false);
  const ex=findExample(w);
  if(ex){
    document.getElementById('exampleCard').style.display='block';
    document.getElementById('exampleHanzi').textContent=ex.hanzi;
    document.getElementById('examplePinyin').innerHTML=toneHtml(ex.pinyin);
    document.getElementById('exampleArti').textContent=ex.arti;
  }
}
let lastSwipeAt=0;
document.getElementById('studyCard').addEventListener('click',(e)=>{
  if(e.target.closest('.star-btn')||e.target.closest('.mini-speak')||e.target.closest('.tool-btn'))return;
  if(performance.now()-lastSwipeAt<400) return; // klik susulan setelah geser jangan membuka kartu
  revealCard();
});

/* ---- swipe kartu: kiri = Belum, atas = Ragu, kanan = Hafal ----
   Kartu belum dibuka: geser = membuka jawaban. Kartu sudah dibuka: geser = menilai. */
(function(){
  const card=document.getElementById('studyCard'), tag=document.getElementById('swipeTag');
  const MIN=70, SLOP=8, LABEL={hafal:'Hafal',ragu:'Ragu',belum:'Belum',open:'Buka jawaban'};
  const reduce=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let sx=0,sy=0,dx=0,dy=0,pid=null,tracking=false,moved=false,busy=false;

  function decide(){
    const ax=Math.abs(dx), ay=Math.abs(dy);
    if(ax>=ay && ax>=MIN) return dx>0?'hafal':'belum';
    if(ay>ax && dy<=-MIN) return 'ragu';
    return null;
  }
  function paint(){
    const r=decide();
    const key=r?(revealed?r:'open'):'';
    if(key){ card.setAttribute('data-swipe',key); tag.textContent=LABEL[key]; tag.className='swipe-tag show '+key; }
    else { card.removeAttribute('data-swipe'); tag.className='swipe-tag'; }
  }
  function snapBack(){
    card.style.transition=reduce?'none':'transform .18s ease';
    card.style.transform='';
    card.removeAttribute('data-swipe'); tag.className='swipe-tag';
  }
  function commit(result){
    busy=true;
    ['rateBelum','rateRagu','rateHafal'].forEach(id=>document.getElementById(id).disabled=true);
    const W=window.innerWidth, H=window.innerHeight;
    const tx=result==='hafal'?W:(result==='belum'?-W:0);
    const ty=result==='ragu'?-H*0.6:0;
    const done=()=>{
      card.style.transition='none'; card.style.transform=''; card.style.opacity='';
      card.removeAttribute('data-swipe'); tag.className='swipe-tag';
      busy=false;
      rate(result);
      if(!reduce){ card.classList.remove('card-in'); void card.offsetWidth; card.classList.add('card-in'); }
    };
    if(reduce){ done(); return; }
    card.style.transition='transform .22s ease-in,opacity .22s ease-in';
    card.style.transform='translate('+tx+'px,'+ty+'px) rotate('+(tx/30)+'deg)';
    card.style.opacity='0';
    setTimeout(done,220);
  }

  card.addEventListener('pointerdown',(e)=>{
    if(busy||!currentWord()) return;
    if(e.target.closest('button')) return;
    if(e.pointerType==='mouse'&&e.button!==0) return;
    tracking=true; moved=false; sx=e.clientX; sy=e.clientY; dx=0; dy=0; pid=e.pointerId;
    try{ card.setPointerCapture(pid); }catch(_){}
  });
  card.addEventListener('pointermove',(e)=>{
    if(!tracking||e.pointerId!==pid) return;
    dx=e.clientX-sx; dy=e.clientY-sy;
    if(!moved){ if(Math.hypot(dx,dy)<SLOP) return; moved=true; }
    const ty=dy<0?dy:dy*0.2;
    card.style.transition='none';
    card.style.transform='translate('+dx+'px,'+ty+'px) rotate('+(dx/25)+'deg)';
    paint();
  });
  function finish(e,cancelled){
    if(!tracking||e.pointerId!==pid) return;
    tracking=false;
    try{ card.releasePointerCapture(pid); }catch(_){}
    if(!moved) return; // ketukan biasa: ditangani handler klik (buka kartu)
    lastSwipeAt=performance.now();
    const r=cancelled?null:decide();
    if(!r){ snapBack(); return; }
    if(!revealed){ snapBack(); revealCard(); toast('Kartu dibuka. Geser lagi untuk menilai.'); return; }
    commit(r);
  }
  card.addEventListener('pointerup',(e)=>finish(e,false));
  card.addEventListener('pointercancel',(e)=>finish(e,true));
  card.addEventListener('animationend',()=>card.classList.remove('card-in'));
})();
document.getElementById('pinyinSpeak').addEventListener('click',(e)=>{ e.stopPropagation(); const w=currentWord(); if(w) speak(w.hanzi); });
document.getElementById('exampleSpeak').addEventListener('click',(e)=>{ e.stopPropagation(); const ex=findExample(currentWord()); if(ex) speak(ex.hanzi); });
document.getElementById('starBtn').addEventListener('click',(e)=>{
  e.stopPropagation(); const w=currentWord(); if(!w) return;
  if(DB.favorites[w.id]){ delete DB.favorites[w.id]; DB.tomb=DB.tomb||{}; DB.tomb['f:'+w.id]=Date.now(); } else { DB.favorites[w.id]=Date.now(); }
  save(); renderCard();
});
document.getElementById('toolListen').addEventListener('click',()=>{ const w=currentWord(); if(w) speak(w.hanzi); });
document.getElementById('toolWrite').addEventListener('click',()=>{
  setMethod('write');
  document.querySelector('.answer-area').scrollIntoView({behavior:'smooth',block:'center'});
});
/* ---- urutan goresan: tampilkan SEMUA karakter dalam kata, satu per satu ---- */
function hanziChars(str){ return Array.from(String(str||'')).filter(c=>/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(c)); }
let strokeKeyHandler=null, strokeToken=0;
function closeStrokeOrder(){
  strokeToken++;
  const ov=document.getElementById('strokeOverlay'); if(ov) ov.remove();
  if(strokeKeyHandler){ document.removeEventListener('keydown',strokeKeyHandler); strokeKeyHandler=null; }
}
function openStrokeOrder(w){
  const chars=hanziChars(w.hanzi);
  if(!chars.length){ toast('Urutan goresan tidak tersedia untuk kata ini'); return; }
  if(typeof HanziWriter==='undefined'){ toast('Butuh koneksi internet untuk memuat urutan goresan'); return; }
  closeStrokeOrder();
  const n=chars.length, cols=n<=3?n:(n===4?2:3);
  const avail=Math.min(window.innerWidth*0.92,460)-40;
  const size=Math.max(84,Math.min(200,Math.floor((avail-(cols-1)*10)/cols)));

  const ov=document.createElement('div'); ov.className='stroke-overlay'; ov.id='strokeOverlay';
  const box=document.createElement('div'); box.className='stroke-box'; box.setAttribute('role','dialog'); box.setAttribute('aria-label','Urutan goresan');
  const title=document.createElement('div'); title.className='stroke-title';
  const tb=document.createElement('b'); tb.textContent=w.hanzi;
  const tp=document.createElement('span'); tp.textContent=w.pinyin||'';
  title.append(tb,tp);
  const grid=document.createElement('div'); grid.className='stroke-grid'; grid.style.gridTemplateColumns='repeat('+cols+','+size+'px)';
  const note=document.createElement('p'); note.className='stroke-note';
  note.textContent = n>1 ? 'Ketuk satu karakter untuk mengulang karakter itu saja.' : '';
  const act=document.createElement('div'); act.className='stroke-actions';
  const bReplay=document.createElement('button'); bReplay.type='button'; bReplay.className='ghost'; bReplay.textContent='Ulangi';
  const bClose=document.createElement('button'); bClose.type='button'; bClose.textContent='Tutup';
  act.append(bReplay,bClose);
  box.append(title,grid,note,act); ov.appendChild(box); document.body.appendChild(ov);

  const cells=[], writers=[], ready=[];
  let pending=n, failed=0;
  const setActive=(idx)=>cells.forEach((c,i)=>c.classList.toggle('active',i===idx));

  // putar animasi berurutan mulai dari karakter ke-start
  function playFrom(start){
    const my=++strokeToken;
    writers.forEach((wr,i)=>{ if(ready[i]) wr.hideCharacter(); });
    let k=start;
    const step=()=>{
      if(my!==strokeToken) return;
      while(k<n && !ready[k]) k++;
      if(k>=n){ setActive(-1); return; }
      const idx=k; setActive(idx);
      writers[idx].animateCharacter({onComplete:()=>{ if(my!==strokeToken) return; k=idx+1; setTimeout(step,350); }});
    };
    step();
  }
  // ulang satu karakter saja; karakter lain ditampilkan utuh
  function playOne(i){
    const my=++strokeToken;
    writers.forEach((wr,j)=>{ if(j!==i && ready[j]) wr.showCharacter(); });
    setActive(i);
    writers[i].animateCharacter({onComplete:()=>{ if(my===strokeToken) setActive(-1); }});
  }

  chars.forEach((ch,i)=>{
    const cell=document.createElement('div'); cell.className='stroke-cell';
    cell.style.width=size+'px'; cell.style.height=size+'px';
    grid.appendChild(cell); cells.push(cell); ready[i]=false;
    const settle=()=>{
      if(--pending>0) return;
      if(failed) note.textContent = failed===n ? 'Data goresan tidak bisa dimuat. Periksa koneksi internet.' : 'Sebagian karakter tidak punya data goresan.';
      playFrom(0);
    };
    const fail=()=>{ failed++; cell.classList.add('err'); cell.textContent=ch; settle(); };
    try{
      writers[i]=HanziWriter.create(cell,ch,{
        width:size,height:size,padding:Math.round(size*0.07),
        showCharacter:false,strokeAnimationSpeed:1,delayBetweenStrokes:250,
        onLoadCharDataSuccess:()=>{ ready[i]=true; settle(); },
        onLoadCharDataError:fail
      });
    }catch(err){ fail(); }
    cell.addEventListener('click',()=>{ if(ready[i]) playOne(i); });
  });

  bReplay.onclick=()=>playFrom(0);
  bClose.onclick=closeStrokeOrder;
  ov.addEventListener('click',(e)=>{ if(e.target===ov) closeStrokeOrder(); });
  strokeKeyHandler=(e)=>{ if(e.key==='Escape') closeStrokeOrder(); };
  document.addEventListener('keydown',strokeKeyHandler);
}
document.getElementById('toolStroke').addEventListener('click',()=>{
  const w=currentWord(); if(!w) return;
  revealCard();
  openStrokeOrder(w);
});

/* ---- answer methods ---- */
function setMethod(m){
  answerMethod=m; DB.settings.method=m; save();
  document.querySelectorAll('.method-tab').forEach(b=>b.classList.toggle('active',b.dataset.method===m));
  resetAnswerUI();
}
document.querySelectorAll('.method-tab').forEach(b=>b.addEventListener('click',()=>setMethod(b.dataset.method)));
function resetAnswerUI(){
  document.getElementById('noCheckNote').style.display = answerMethod==='none'?'block':'none';
  document.getElementById('typeRow').style.display = answerMethod==='type'?'flex':'none';
  document.getElementById('typeResult').textContent='';
  document.getElementById('typeInput').value='';
  document.getElementById('writeArea').style.display = answerMethod==='write'?'flex':'none';
  document.getElementById('voiceArea').style.display = answerMethod==='voice'?'flex':'none';
  if(answerMethod==='write') setTimeout(setupWriteQuiz,20);
  if(answerMethod==='voice') resetVoiceUI();
}
document.getElementById('typeCheckBtn').addEventListener('click',()=>{
  const w=currentWord(); if(!w) return;
  const got=normalize(document.getElementById('typeInput').value);
  const exp = currentDir==='meaning-hanzi'? normalize(w.hanzi) : currentDir==='pinyin-hanzi'? normalize(w.hanzi) : normalize(w.arti);
  if(!got) return;
  let ok;
  if(currentDir==='hanzi-meaning'){ const terms=exp.split(/[;,\/]/).map(normalize).filter(Boolean); ok=terms.some(t=>got===t||got.includes(t)||t.includes(got)); }
  else ok = got===exp;
  const el=document.getElementById('typeResult');
  el.textContent = ok?'✓ Benar!':'✕ Coba lagi / lihat jawaban';
  el.className='type-result '+(ok?'ok':'bad');
  revealCard();
});
document.getElementById('typeInput').addEventListener('keydown',e=>{ if(e.key==='Enter') document.getElementById('typeCheckBtn').click(); });

/* write quiz — koreksi goresan sungguhan pakai hanzi-writer, bukan cuma canvas gambar bebas */
function setupWriteQuiz(){
  const grid=document.getElementById('writeQuizGrid'); if(!grid) return;
  grid.innerHTML='';
  const resultEl=document.getElementById('writeResult'); resultEl.textContent=''; resultEl.className='type-result';
  const w=currentWord(); if(!w) return;
  const chars=hanziChars(w.hanzi);
  if(!chars.length){ resultEl.textContent='Kata ini tidak punya karakter hanzi untuk dilatih.'; return; }
  if(typeof HanziWriter==='undefined'){ resultEl.textContent='Butuh koneksi internet untuk memuat data goresan.'; return; }
  const n=chars.length, cols=n<=3?n:(n===4?2:3);
  const avail=Math.min(window.innerWidth*0.92,420)-40;
  const size=Math.max(72,Math.min(160,Math.floor((avail-(cols-1)*10)/cols)));
  grid.style.gridTemplateColumns='repeat('+cols+','+size+'px)';
  writeQuizWriters=[]; writeQuizDone=new Array(n).fill(false); writeQuizMistakes=0;
  chars.forEach((ch,i)=>{
    const cell=document.createElement('div'); cell.className='stroke-cell';
    cell.style.width=size+'px'; cell.style.height=size+'px';
    grid.appendChild(cell);
    try{
      const writer=HanziWriter.create(cell,ch,{
        width:size, height:size, padding:Math.round(size*0.07),
        showCharacter:false, showOutline:true, highlightOnComplete:true,
        onLoadCharDataError:()=>{ cell.classList.add('err'); cell.textContent=ch; }
      });
      writeQuizWriters[i]=writer;
      writer.quiz({
        onMistake:()=>{ writeQuizMistakes++; },
        onComplete:()=>{
          writeQuizDone[i]=true;
          if(writeQuizDone.every(Boolean)){
            resultEl.textContent = writeQuizMistakes===0 ? '✓ Semua goresan benar, tanpa koreksi!' : ('✓ Selesai — '+writeQuizMistakes+' goresan perlu dikoreksi.');
            resultEl.className='type-result ok';
            revealCard();
          }
        }
      });
    }catch(err){ cell.classList.add('err'); cell.textContent=ch; }
  });
}
document.getElementById('writeClearBtn').addEventListener('click',setupWriteQuiz);

/* voice recording */
function resetVoiceUI(){
  document.getElementById('voiceStatusText').textContent='Ketuk untuk mulai rekam';
  document.getElementById('voicePlayback').style.display='none';
  document.getElementById('voiceRecordBtn').classList.remove('recording');
  document.getElementById('voiceRecordBtn').innerHTML='<svg class="icon"><use href="#i-mic"/></svg>';
  const vr=document.getElementById('voiceResult'); if(vr){ vr.textContent=''; vr.className='type-result'; }
  isRecording=false; voiceTranscript='';
  if(voiceRecognizer){ try{ voiceRecognizer.abort(); }catch(e){} voiceRecognizer=null; }
}
function checkVoiceAnswer(){
  const w=currentWord(); const vr=document.getElementById('voiceResult'); if(!w||!vr) return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){
    vr.textContent='Deteksi ucapan otomatis tidak didukung browser ini — dengarkan rekamanmu sendiri lalu nilai di bawah.';
    vr.className='type-result';
    revealCard();
    return;
  }
  if(!voiceTranscript){
    vr.textContent='Tidak ada ucapan yang terdengar jelas. Coba rekam lagi, lebih dekat ke mikrofon.';
    vr.className='type-result bad';
    revealCard();
    return;
  }
  const got=normalize(voiceTranscript);
  const exp=normalize(w.hanzi);
  const ok = got===exp || got.includes(exp) || exp.includes(got);
  vr.textContent = ok ? ('✓ Benar! Terdengar: "'+voiceTranscript+'"') : ('✕ Terdengar: "'+voiceTranscript+'" — beda dengan jawaban, coba lagi atau lihat jawaban.');
  vr.className='type-result '+(ok?'ok':'bad');
  revealCard();
}
document.getElementById('voiceRecordBtn').addEventListener('click', async ()=>{
  if(!isRecording){
    // Mikrofon browser HANYA jalan di HTTPS (atau localhost). Kalau file dibuka langsung
    // (file://) atau lewat http:// biasa, browser otomatis menolak izin tanpa pernah
    // menampilkan dialog izin sama sekali — ini penyebab paling umum masalah "izin ditolak".
    const isSecure = location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1';
    if(!isSecure){
      toast('Mikrofon butuh HTTPS. Buka lewat link web.app Anda, bukan file lokal.');
      return;
    }
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      toast('Browser ini tidak mendukung akses mikrofon.');
      return;
    }
    try{
      voiceStream = await navigator.mediaDevices.getUserMedia({audio:true});
      mediaRecorder = new MediaRecorder(voiceStream);
      voiceChunks=[]; voiceTranscript='';
      mediaRecorder.ondataavailable=(e)=>voiceChunks.push(e.data);
      mediaRecorder.onstop=()=>{
        const blob=new Blob(voiceChunks,{type:'audio/webm'});
        if(voiceUrl) URL.revokeObjectURL(voiceUrl);
        voiceUrl=URL.createObjectURL(blob);
        const audio=document.getElementById('voicePlayback');
        audio.src=voiceUrl; audio.style.display='block';
        document.getElementById('voiceStatusText').textContent='Rekaman selesai. Dengarkan & bandingkan.';
        voiceStream.getTracks().forEach(t=>t.stop());
        if(voiceRecognizer){ try{ voiceRecognizer.stop(); }catch(e){} }
        setTimeout(checkVoiceAnswer,300); // beri jeda supaya hasil recognition (onresult) sempat masuk
      };
      mediaRecorder.start();
      isRecording=true;
      document.getElementById('voiceRecordBtn').classList.add('recording');
      document.getElementById('voiceRecordBtn').innerHTML='<svg class="icon"><use href="#i-stop"/></svg>';
      document.getElementById('voiceStatusText').textContent='Merekam… ketuk untuk berhenti';
      document.getElementById('voiceResult').textContent='';
      // Koreksi otomatis: jalankan speech recognition (kalau didukung) paralel dengan rekaman audio.
      const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(SR){
        try{
          voiceRecognizer=new SR();
          voiceRecognizer.lang='zh-CN'; voiceRecognizer.interimResults=false; voiceRecognizer.maxAlternatives=1;
          voiceRecognizer.onresult=(ev)=>{ voiceTranscript=ev.results[0][0].transcript||''; };
          voiceRecognizer.onerror=()=>{};
          voiceRecognizer.start();
        }catch(e){ voiceRecognizer=null; }
      }
    }catch(err){
      // Pesan spesifik sesuai jenis errornya, bukan cuma "tidak bisa akses mikrofon" yang generik.
      let msg='Tidak bisa mengakses mikrofon.';
      if(err && err.name==='NotAllowedError'){
        msg='Izin mikrofon ditolak. Buka pengaturan situs di browser (ikon gembok/info di address bar) → izinkan Mikrofon, lalu muat ulang halaman.';
      } else if(err && err.name==='NotFoundError'){
        msg='Tidak ada mikrofon terdeteksi di perangkat ini.';
      } else if(err && err.name==='NotReadableError'){
        msg='Mikrofon sedang dipakai aplikasi lain. Tutup aplikasi lain lalu coba lagi.';
      } else if(err && err.name==='SecurityError'){
        msg='Akses mikrofon diblokir karena halaman tidak dibuka lewat HTTPS.';
      }
      document.getElementById('voiceStatusText').textContent=msg;
      toast(msg);
    }
  }else{
    if(mediaRecorder && mediaRecorder.state!=='inactive') mediaRecorder.stop();
    isRecording=false;
    document.getElementById('voiceRecordBtn').classList.remove('recording');
    document.getElementById('voiceRecordBtn').innerHTML='<svg class="icon"><use href="#i-mic"/></svg>';
  }
});

/* ---- rating ---- */
function rate(result){
  const w=currentWord(); if(!w) return;
  window.__justRated=true; sfx(result);
  const wasNew=!DB.progress[w.id]; // cek SEBELUM ditulis, supaya statistik "kata baru" akurat
  const prevBox=wasNew?0:(DB.progress[w.id].box||0), {repeat}=SRS.beforeRate(w);
  const p=ensureP(w);
  const now=today();
  p.status=result;
  p.lastReview=now;
  p.u=Date.now(); // cap waktu per kartu untuk sinkron antar perangkat
  if(result==='hafal'){
    // Benar: naik satu kotak Leitner, interval review makin panjang.
    if(repeat){ p.box=Math.max(1,p.box||0); p.due=addDays(now,1); } // diulang di sesi yang sama: belum naik kotak
    else { p.box=Math.min(INTERVALS.length-1,(p.box||0)+1); p.due=addDays(now,INTERVALS[p.box]); }
  } else if(result==='ragu'){
    // Ragu-ragu: TURUN satu kotak (bukan tetap di kotak lama), supaya kata yang
    // mulai goyah benar-benar direview lebih sering, bukan cuma ditunda 1 hari
    // lalu lompat balik ke interval panjang begitu dijawab benar sekali.
    p.box=Math.max(1,(p.box||1)-1);
    p.due=addDays(now,1);
  } else {
    // Belum tahu / salah: reset total ke kotak awal, review lagi hari ini.
    p.box=0;
    p.due=now;
  }
  DB.progress[w.id]=p;
  DB.meta.totalAnswered=(DB.meta.totalAnswered||0)+1;
  if(result==='hafal') DB.meta.totalCorrect=(DB.meta.totalCorrect||0)+1;
  { const dk=currentDir||'hanzi-meaning'; DB.meta.dirStats=DB.meta.dirStats||{}; const ds=(DB.meta.dirStats[dk]=DB.meta.dirStats[dk]||{n:0,ok:0}); ds.n++; if(result==='hafal') ds.ok++; }
  DB.meta.dailyLog=DB.meta.dailyLog||{};
  DB.meta.dailyLog[now]=DB.meta.dailyLog[now]||{answered:0,newWords:0};
  DB.meta.dailyLog[now].answered++;
  { const t=Date.now(), gap=_lastRateMs?(t-_lastRateMs)/1000:Infinity; _lastRateMs=t;
    DB.meta.dailyLog[now].secs=(DB.meta.dailyLog[now].secs||0)+(gap<=120?Math.round(gap):15); } // jeda >2 mnt = sesi baru
  if(wasNew) DB.meta.dailyLog[now].newWords++;
  SRS.logReview(now,result,prevBox,wasNew,repeat);
  if(DB.meta.lastDate!==now){ DB.meta.streak = DB.meta.lastDate===yesterday() ? (DB.meta.streak||0)+1 : 1; DB.meta.lastDate=now; }
  DB.meta.weeklyDone=DB.meta.weeklyDone||{}; DB.meta.weeklyDone[now]=true;
  // XP: hafal paling besar (jawaban benar & tersimpan lama), ragu sedang, belum tetap dihargai usahanya.
  const xpGain = repeat?0 : result==='hafal'?8 : result==='ragu'?3 : 1;
  DB.meta.xp=(DB.meta.xp||0)+xpGain;
  checkBadges();
  SRS.requeue(w,result);
  save();
  qIdx++;
  renderCard();
}

/* ================= XP, LEVEL & BADGE ================= */
function computeLevel(xp){
  xp=xp||0;
  let level=1, remaining=xp, need=80;
  while(remaining>=need){ remaining-=need; level++; need=80+(level-1)*20; }
  return {level, xpIntoLevel:remaining, xpNeeded:need};
}
const BADGES=[
  {id:'streak3',  icon:'🔥', title:'Streak 3 Hari',        check:()=>(DB.meta.streak||0)>=3},
  {id:'streak7',  icon:'🔥', title:'Streak 7 Hari',        check:()=>(DB.meta.streak||0)>=7},
  {id:'streak30', icon:'🔥', title:'Streak 30 Hari',       check:()=>(DB.meta.streak||0)>=30},
  {id:'words50',  icon:'📚', title:'50 Kata Dikuasai',     check:()=>overallStats().hafal>=50},
  {id:'words100', icon:'📚', title:'100 Kata Dikuasai',    check:()=>overallStats().hafal>=100},
  {id:'words300', icon:'📚', title:'300 Kata Dikuasai',    check:()=>overallStats().hafal>=300},
  {id:'level5',   icon:'⭐', title:'Mencapai Level 5',     check:()=>computeLevel(DB.meta.xp).level>=5},
  {id:'level10',  icon:'🌟', title:'Mencapai Level 10',    check:()=>computeLevel(DB.meta.xp).level>=10},
  {id:'answers100',icon:'🎯', title:'100 Kali Latihan',    check:()=>(DB.meta.totalAnswered||0)>=100},
];
function checkBadges(){
  DB.badges=DB.badges||{};
  BADGES.forEach(b=>{
    if(!DB.badges[b.id] && b.check()){
      DB.badges[b.id]=today();
      toast('🏅 Lencana baru: '+b.title+'!');
    }
  });
}
function renderXP(){
  const {level,xpIntoLevel,xpNeeded}=computeLevel(DB.meta.xp||0);
  const lvlBadge=document.getElementById('xpLevelBadge');
  const lvlLabel=document.getElementById('xpLevelLabel');
  const ptsLabel=document.getElementById('xpPointsLabel');
  const bar=document.getElementById('xpBar');
  if(lvlBadge) lvlBadge.textContent='Lv '+level;
  if(lvlLabel) lvlLabel.textContent='Level '+level;
  if(ptsLabel) ptsLabel.textContent=xpIntoLevel+' / '+xpNeeded+' XP';
  if(bar) bar.style.width=Math.min(100,Math.round(xpIntoLevel/xpNeeded*100))+'%';
  const strip=document.getElementById('badgesStrip');
  if(strip){
    DB.badges=DB.badges||{};
    strip.innerHTML=BADGES.map(b=>{
      const earned=!!DB.badges[b.id];
      return '<div class="badge-chip'+(earned?' earned':' locked')+'" title="'+b.title+(earned?'':' (belum diraih)')+'">'+
        '<span class="badge-emoji">'+(earned?b.icon:'🔒')+'</span></div>';
    }).join('');
  }
}
document.getElementById('rateBelum').addEventListener('click',()=>rate('belum'));
document.getElementById('rateRagu').addEventListener('click',()=>rate('ragu'));
document.getElementById('rateHafal').addEventListener('click',()=>rate('hafal'));

/* ================= STUDY CONFIG SHEET ================= */
function openSheet(id){ document.getElementById(id).classList.add('open'); document.getElementById(id+'Backdrop').classList.add('open'); }
function closeSheet(id){ document.getElementById(id).classList.remove('open'); document.getElementById(id+'Backdrop').classList.remove('open'); }
document.getElementById('belajarGear').addEventListener('click',()=>{ populateCfg(); openSheet('cfgSheet'); });
document.getElementById('cfgClose').addEventListener('click',()=>closeSheet('cfgSheet'));
document.getElementById('cfgSheetBackdrop').addEventListener('click',()=>closeSheet('cfgSheet'));
let cfgStatus='all', cfgShuffle=false;
function populateCfg(){
  const lvlSel=document.getElementById('cfgLevel');
  lvlSel.innerHTML='<option value="all">Semua Level</option>'+LEVELS.map(l=>`<option value="${l}">HSK ${l}</option>`).join('');
  lvlSel.value=DB.settings.level;
  cfgStatus=DB.settings.status||'all'; cfgShuffle=!!DB.settings.shuffle;
  refreshCfgChapters();
  document.getElementById('cfgCount').value=DB.settings.count;
  document.getElementById('cfgDirection').value=DB.settings.direction;
  paintCfgShuffle();
}
function refreshCfgChapters(){
  const lvl=document.getElementById('cfgLevel').value;
  const chSel=document.getElementById('cfgChapter');
  const chapters=lvl==='all'?[]:chaptersForLevel(lvl).filter(c=>c>0);
  if(!chapters.length){
    chSel.innerHTML='<option value="all">Semua Bab</option>';
  }else{
    chSel.innerHTML='<option value="all">Semua Bab</option>'+chapters.map(c=>`<option value="${c}">Bab ${c}</option>`).join('');
  }
  chSel.value = DB.settings.chapter && chSel.querySelector(`option[value="${DB.settings.chapter}"]`) ? DB.settings.chapter : 'all';
  refreshCfgStatus();
}
// hitung jumlah kata per status untuk level & bab yang dipilih; status kosong dinonaktifkan
function refreshCfgStatus(){
  const pool=poolFor(document.getElementById('cfgLevel').value, document.getElementById('cfgChapter').value);
  const c={all:pool.length,hafal:0,ragu:0,belum:0,baru:0};
  pool.forEach(w=>{ c[statusOf(w.id)]++; });
  if(cfgStatus!=='all' && !c[cfgStatus]) cfgStatus='all';
  document.querySelectorAll('#cfgStatus .chip').forEach(b=>{
    const k=b.dataset.status, on=k===cfgStatus;
    b.querySelector('small').textContent=c[k];
    b.disabled = k!=='all' && c[k]===0;
    b.classList.toggle('active',on); b.setAttribute('aria-checked',on?'true':'false');
  });
}
function paintCfgShuffle(){
  const b=document.getElementById('cfgShuffle');
  b.classList.toggle('on',cfgShuffle); b.setAttribute('aria-pressed',cfgShuffle?'true':'false');
  document.getElementById('cfgNote').textContent = cfgShuffle
    ? 'Acak aktif: kata dipilih dan diurutkan secara acak.'
    : 'Urutan prioritas: kata yang perlu diulang muncul lebih dulu.';
}
document.getElementById('cfgLevel').addEventListener('change',refreshCfgChapters);
document.getElementById('cfgChapter').addEventListener('change',refreshCfgStatus);
document.getElementById('cfgStatus').addEventListener('click',(e)=>{
  const b=e.target.closest('.chip'); if(!b||b.disabled) return;
  cfgStatus=b.dataset.status; refreshCfgStatus();
});
document.getElementById('cfgShuffle').addEventListener('click',()=>{ cfgShuffle=!cfgShuffle; paintCfgShuffle(); });
document.getElementById('cfgStartBtn').addEventListener('click',()=>{
  const lvl=document.getElementById('cfgLevel').value, ch=document.getElementById('cfgChapter').value;
  const pool=poolFor(lvl,ch).filter(w=>cfgStatus==='all'||statusOf(w.id)===cfgStatus);
  if(!pool.length){ toast('Tidak ada kata dengan filter ini'); return; }
  DB.settings.level=lvl;
  DB.settings.chapter=ch;
  DB.settings.count=document.getElementById('cfgCount').value;
  DB.settings.direction=document.getElementById('cfgDirection').value;
  DB.settings.status=cfgStatus;
  DB.settings.shuffle=cfgShuffle;
  save();
  buildQueue();
  closeSheet('cfgSheet');
  renderCard();
  toast('Sesi baru dimulai: '+queue.length+' kata');
});

/* (tombol acak di header Belajar sudah dihapus; opsi acak tetap tersedia di panel pengaturan sesi) */

/* ================= PROGRES ================= */
const WEEKDAY_LABELS=new Proxy(['M','S','S','R','K','J','S'],{get:function(t,k){var L=(window.HANYOU_I18N&&window.HANYOU_I18N.get&&window.HANYOU_I18N.get())||'id';var X={zh:['日','一','二','三','四','五','六'],en:['S','M','T','W','T','F','S']};return(L!=='id'&&/^\d+$/.test(String(k)))?X[L][k]:t[k];}});
function renderProgres(){
  SRS.renderCard();
  const st=overallStats();
  const circumference=2*Math.PI*72;
  const hafalLen = st.total? (st.hafal/st.total)*circumference : 0;
  const raguLen = st.total? (st.ragu/st.total)*circumference : 0;
  const belumLen = st.total? (st.belum/st.total)*circumference : 0;
  const ringHafal=document.getElementById('ringHafal'), ringRagu=document.getElementById('ringRagu'), ringBelum=document.getElementById('ringBelum');
  ringHafal.setAttribute('stroke-dasharray', hafalLen+' '+circumference);
  ringHafal.setAttribute('stroke-dashoffset','0');
  ringRagu.setAttribute('stroke-dasharray', raguLen+' '+circumference);
  ringRagu.setAttribute('stroke-dashoffset', -hafalLen);
  ringBelum.setAttribute('stroke-dasharray', belumLen+' '+circumference);
  ringBelum.setAttribute('stroke-dashoffset', -(hafalLen+raguLen));
  const learnedPct = st.total? Math.round(((st.hafal+st.ragu+st.belum)/st.total)*100):0;
  document.getElementById('ringPct').textContent=learnedPct+'%';
  document.getElementById('ringCount').textContent=(st.hafal+st.ragu+st.belum)+'/'+st.total;

  const lt=latihanTotalStats();
  const ringLatihan=document.getElementById('ringLatihan');
  const latihanLen = lt.total? (lt.done/lt.total)*circumference : 0;
  ringLatihan.setAttribute('stroke-dasharray', latihanLen+' '+circumference);
  ringLatihan.setAttribute('stroke-dashoffset','0');
  const latihanPct = lt.total? Math.round((lt.done/lt.total)*100):0;
  document.getElementById('ringLatihanPct').textContent=latihanPct+'%';
  document.getElementById('ringLatihanCount').textContent=lt.done+'/'+lt.total;

  const pct=(n)=> st.total? Math.round(n/st.total*100):0;
  document.getElementById('cHafal').textContent=st.hafal;
  document.getElementById('cHafalPct').textContent='Hafal ('+pct(st.hafal)+'%)';
  document.getElementById('cRagu').textContent=st.ragu;
  document.getElementById('cRaguPct').textContent='Ragu ('+pct(st.ragu)+'%)';
  document.getElementById('cBelum').textContent=st.belum;
  document.getElementById('cBelumPct').textContent='Belum ('+pct(st.belum)+'%)';
  document.getElementById('cBaru').textContent=st.baru;
  document.getElementById('cBaruPct').textContent='Belum Dipelajari ('+pct(st.baru)+'%)';

  const bars=document.getElementById('barsRow');
  const days=[]; for(let i=6;i>=0;i--) days.push(addDays(today(),-i));
  const maxVal=Math.max(1,...days.map(d=>(DB.meta.dailyLog[d]||{}).answered||0));
  bars.innerHTML=days.map(d=>{
    const val=(DB.meta.dailyLog[d]||{}).answered||0;
    const h=Math.max(4,Math.round(val/maxVal*88));
    const dow=new Date(d+'T12:00:00').getDay();
    return `<div class="bars-col"><span class="val">${val||''}</span><div class="bar-el" style="height:${h}px"></div><span class="lab">${WEEKDAY_LABELS[dow]}</span></div>`;
  }).join('');

  document.getElementById('mMinutes').textContent=studyMinutes();
  const newWords=Object.values(DB.meta.dailyLog||{}).reduce((a,b)=>a+(b.newWords||0),0);
  document.getElementById('mNewWords').textContent=newWords;
  const acc= DB.meta.totalAnswered? Math.round((DB.meta.totalCorrect/DB.meta.totalAnswered)*100):0;
  document.getElementById('mAccuracy').textContent=acc+'%';
  document.getElementById('mStreakDays').textContent=currentStreak();

  const weekDates=[]; const dow0=new Date().getDay();
  for(let i=0;i<7;i++) weekDates.push(addDays(today(), i-dow0));
  const doneCount=weekDates.filter(d=>DB.meta.weeklyDone && DB.meta.weeklyDone[d]).length;
  document.getElementById('targetSub').textContent=doneCount+' / 7 hari';
  document.getElementById('targetBar').style.width=Math.round(doneCount/7*100)+'%';
  const weekRow=document.getElementById('weekRow');
  weekRow.innerHTML=weekDates.map((d,i)=>{
    const done = DB.meta.weeklyDone && DB.meta.weeklyDone[d];
    const isToday = d===today();
    const cls = done?'done':(isToday?'today':'');
    return `<span class="week-day ${cls}">${done?'<svg class=\"icon\" style=\"width:13px;height:13px\"><use href=\"#i-check\"/></svg>':WEEKDAY_LABELS[i]}</span>`;
  }).join('');

  const qi=new Date().getDate()%QUOTES.length;
  document.getElementById('insightQuote').textContent='"'+QUOTES[(qi+2)%QUOTES.length]+'"';

  renderAnalisis();
  renderSkillMatrix();
  renderCapaian();
}
function anSec(t,why,body){ return '<section class="an-sec"><div class="an-head"><h3>'+t+'</h3><p>'+why+'</p></div>'+body+'</section>'; }
function anStack(h,r,b,t){ const q=n=>t?(n/t*100):0; return '<div class="an-stack"><i style="width:'+q(h)+'%;background:var(--green)"></i><i style="width:'+q(r)+'%;background:var(--yellow)"></i><i style="width:'+q(b)+'%;background:var(--red)"></i></div>'; }
function renderAnalisis(){
  const box=document.getElementById('analisisBody'); if(!box) return;
  const lvl=DB.settings.level==='all'?4:DB.settings.level;
  const learned=VOCAB.filter(w=>DB.progress[w.id]);
  const wire=()=>{ box.querySelectorAll('[data-an-list]').forEach(b=>b.onclick=()=>openStatusList(b.dataset.anList)); box.querySelectorAll('[data-an-start]').forEach(b=>b.onclick=()=>document.getElementById('startLearnBtn').click()); };
  if(!learned.length){ box.innerHTML='<div class="an-empty"><b>Belum ada data untuk dianalisis</b>Pelajari beberapa kartu dulu. Setelah itu halaman ini menunjukkan kata yang lemah, bab tertinggal, dan tren ingatanmu.<br><button type="button" class="an-btn" data-an-start>Mulai belajar</button></div>'; wire(); return; }
  const due=VOCAB.filter(isDue).length, ret=SRS.retention(7);
  const chs=chaptersForLevel(lvl).filter(c=>c>0).map(c=>{ const ws=wordsInChapter(lvl,c); let h=0,r=0,b=0; ws.forEach(w=>{ const t=statusOf(w.id); if(t==='hafal')h++; else if(t==='ragu')r++; else if(t==='belum')b++; }); return {c,t:ws.length,h,r,b}; });
  const weak=chs.filter(x=>x.r+x.b>0).sort((a,b)=>(b.r+b.b)-(a.r+a.b))[0];
  let nw=0,act=0; for(let i=0;i<14;i++){ const d=(DB.meta.dailyLog||{})[addDays(today(),-i)]; if(d&&d.newWords>0){ nw+=d.newWords; act++; } }
  const rem=wordsForLevel(lvl).filter(w=>statusOf(w.id)==='baru').length, avg=act?nw/act:0;
  const ins=[];
  ins.push(due>0?'<b>'+due+' kata jatuh tempo</b> hari ini. Mengulangnya sekarang menjaga ingatan sebelum terlupa.<br><button type="button" class="an-btn" data-an-start>Mulai review</button>':'Tidak ada kata jatuh tempo hari ini. Ingatanmu terjaga, lanjutkan dengan kata baru.');
  ins.push(ret.pct!==null&&ret.rev>=20?'Retensi 7 hari <b>'+ret.pct+'%</b>. '+(ret.pct>=85?'Sangat baik, kamu boleh menambah kata baru.':ret.pct>=70?'Cukup baik, pertahankan review harian.':'Masih rendah. Kurangi kata baru dan perbanyak review.'):'Retensi belum bisa dihitung, butuh sekitar 20 ulasan kartu lama.');
  if(weak) ins.push('<b>Bab '+weak.c+'</b> (HSK '+lvl+') paling butuh perhatian: '+(weak.r+weak.b)+' kata masih ragu atau belum hafal.');
  if(avg>0&&rem>0) ins.push('Lajumu '+avg.toFixed(1).replace('.0','')+' kata baru per hari belajar. Sisa '+rem+' kata HSK '+lvl+' selesai sekitar <b>'+Math.ceil(rem/avg)+' hari belajar</b> lagi.');
  let html='<div class="an-insight"><h3>Kesimpulan untukmu</h3><ul>'+ins.map(x=>'<li><i></i><div>'+x+'</div></li>').join('')+'</ul></div>';
  const rk={belum:0,ragu:1};
  const weakW=learned.filter(w=>rk[statusOf(w.id)]!==undefined).sort((a,b)=>rk[statusOf(a.id)]-rk[statusOf(b.id)]||(DB.progress[a.id].box||0)-(DB.progress[b.id].box||0)||String(DB.progress[a.id].lastReview||'').localeCompare(String(DB.progress[b.id].lastReview||'')));
  const nR=learned.filter(w=>statusOf(w.id)==='ragu').length, nB=learned.filter(w=>statusOf(w.id)==='belum').length;
  html+=anSec('Fokus perbaikan','Kata yang paling sering salah atau ragu. Kuasai ini dulu supaya hasil belajar naik paling cepat.',
    (weakW.length?weakW.slice(0,8).map(w=>'<div class="an-word"><span class="wz">'+escapeHtml(w.hanzi)+'</span><div><b>'+escapeHtml(w.pinyin)+'</b><span class="m">'+escapeHtml(w.arti)+'</span></div><em class="'+statusOf(w.id)+'">'+STATUS_LABEL[statusOf(w.id)]+'</em></div>').join(''):'<p class="an-note">Tidak ada kata ragu atau belum hafal. Mantap!</p>')+
    '<div style="margin-top:10px">'+(nR?'<button type="button" class="an-btn ghost" data-an-list="ragu">Semua ragu ('+nR+')</button>':'')+(nB?'<button type="button" class="an-btn ghost" data-an-list="belum">Semua belum ('+nB+')</button>':'')+'</div>');
  const G=[['Rapuh','diulang tiap ≤1 hari','var(--red)',b=>b<=1],['Berkembang','diulang 2–4 hari','var(--yellow)',b=>b>=2&&b<=3],['Kuat','diulang 7–14 hari','var(--accent)',b=>b>=4&&b<=5],['Matang','diulang 30 hari','var(--green)',b=>b>=6]];
  html+=anSec('Kematangan ingatan','Seberapa kuat kata tertanam. Semakin ke Matang, semakin jarang perlu diulang.',G.map(([n,d,col,f])=>{ const k=learned.filter(w=>f(DB.progress[w.id].box||0)).length; return '<div class="an-row"><div class="an-meta"><span><b style="color:var(--text)">'+n+'</b> <small>'+d+'</small></span><b>'+k+'</b></div><div class="an-stack"><i style="width:'+(k/learned.length*100)+'%;background:'+col+'"></i></div></div>'; }).join(''));
  const days=[]; for(let i=6;i>=0;i--) days.push(addDays(today(),-i));
  html+=anSec('Akurasi 7 hari','Persentase jawaban "Hafal" tiap hari. Tren naik berarti caramu belajar sudah efektif.','<div class="an-cols">'+days.map(d=>{ const l=(DB.meta.dailyLog||{})[d]||{}, a=l.answered||0, p=a?Math.round((l.hafal||0)/a*100):null; return '<div class="an-col"><span>'+(p===null?'–':p+'%')+'</span><div class="b" style="height:'+(p===null?4:Math.max(6,p*0.7))+'px;background:'+(p===null?'var(--line)':p>=75?'var(--green)':p>=50?'var(--yellow)':'var(--red)')+'"></div><span>'+WEEKDAY_LABELS[new Date(d+'T12:00:00').getDay()]+'</span></div>'; }).join('')+'</div>');
  const ds=DB.meta.dirStats||{}, dirs=[['hanzi-meaning','汉字 → Arti','mengenali hanzi'],['meaning-hanzi','Arti → 汉字','mengingat hanzi dari arti'],['pinyin-hanzi','Pinyin → 汉字','menulis hanzi dari bunyi']];
  const dd=dirs.map(([k,l,d])=>{ const x=ds[k]||{n:0,ok:0}; return {l,d,n:x.n,p:x.n?Math.round(x.ok/x.n*100):null}; });
  const dw=dd.filter(x=>x.n>=5).sort((a,b)=>a.p-b.p)[0];
  html+=anSec('Akurasi per arah latihan','Menunjukkan kamu lebih kuat di mengenali, mengingat, atau menulis hanzi.',dd.some(x=>x.n)?dd.map(x=>'<div class="an-row"><div class="an-meta"><span><b style="color:var(--text)">'+x.l+'</b> <small>'+x.d+'</small></span><b>'+(x.p===null?'–':x.p+'%')+' <small>'+x.n+' jawaban</small></b></div><div class="an-stack"><i style="width:'+(x.p||0)+'%;background:var(--accent)"></i></div></div>').join('')+(dw?'<p class="an-note">Arah paling lemah: <b>'+dw.l+'</b>. Perbanyak latihan arah ini.</p>':''):'<p class="an-note">Data arah mulai terkumpul dari sesi belajar berikutnya.</p>');
  html+=anSec('Penguasaan per level','Hijau hafal, kuning ragu, merah belum. Lihat level mana yang paling tertinggal.',LEVELS.map(l=>{ const t=levelStats(l); return '<div class="an-row"><div class="an-meta"><span><b style="color:var(--text)">HSK '+l+'</b></span><span>'+t.hafal+'/'+t.total+'</span></div>'+anStack(t.hafal,t.ragu,t.belum,t.total)+'</div>'; }).join(''));
  html+=anSec('Progress per bab · HSK '+lvl,'Temukan bab yang masih banyak ragu atau belum hafal.',chs.map(x=>'<div class="an-row"><div class="an-meta"><span>Bab '+x.c+(weak&&weak.c===x.c?'<em class="an-tag" style="font-style:normal">Perlu perhatian</em>':'')+'</span><span>'+x.h+'/'+x.t+'</span></div>'+anStack(x.h,x.r,x.b,x.t)+'</div>').join('')||'<p class="an-note">Tidak ada data bab.</p>');
  box.innerHTML=html; wire();
}
function renderCapaian(){
  const box=document.getElementById('capaianBody'); if(!box) return;
  const L=computeLevel(DB.meta.xp||0); DB.badges=DB.badges||{};
  const earned=BADGES.filter(b=>DB.badges[b.id]).length, st=overallStats();
  const pn=id=>{ try{ for(const k in LATIHAN_SETS){ const f=(LATIHAN_SETS[k]||[]).find(x=>x.id===id); if(f) return f.title||f.name||id; } }catch(e){} return id; };
  const ex=(DB.exams||[]).slice(0,5).map(e=>{ const sc=e.scores||{}; return '<div class="cp-exam"><div><b>'+escapeHtml(pn(e.paket))+'</b><small>'+new Date(e.ts).toLocaleDateString('id-ID',{day:'numeric',month:'short'})+' · '+(e.minutes||0)+' mnt · Dengar '+(sc.mendengar??'–')+' · Baca '+(sc.membaca??'–')+' · Tulis '+(sc.menulis??'–')+'</small></div><strong>'+e.total+'</strong></div>'; }).join('')||'<p class="an-note">Belum ada ujian simulasi. Coba dari menu Latihan Soal.</p>';
  box.innerHTML='<div class="cp-card cp-xp"><b>Level '+L.level+'</b><span>'+L.xpIntoLevel+' / '+L.xpNeeded+' XP</span><div class="an-stack"><i style="width:'+Math.min(100,L.xpIntoLevel/L.xpNeeded*100)+'%;background:var(--accent)"></i></div><div class="cp-stats"><div><b>'+(DB.meta.xp||0)+'</b><span>total XP</span></div><div><b>'+st.hafal+'</b><span>kata hafal</span></div><div><b>'+(DB.meta.totalAnswered||0)+'</b><span>total jawaban</span></div></div></div>'+
   anSec('Lencana · '+earned+'/'+BADGES.length,'Target kecil yang membuat belajar konsisten terasa menyenangkan.','<div class="cp-badges">'+BADGES.map(b=>{ const d=DB.badges[b.id]; return '<div class="cp-badge'+(d?' on':'')+'"><span>'+(d?b.icon:'🔒')+'</span><b>'+escapeHtml(b.title)+'</b><small>'+(d?escapeHtml(String(d)):'Belum diraih')+'</small></div>'; }).join('')+'</div>')+
   anSec('Riwayat ujian simulasi','Pantau skor ujianmu dari waktu ke waktu.',ex);
}
function renderSkillMatrix(){
  const box=document.getElementById('skillMatrixBody');
  box.innerHTML = LEVELS.map(lvl=>{
    const chapters=chaptersForLevel(lvl).filter(c=>c>=0);
    const cells = (chapters.length?chapters:[0]).map(c=>{
      const words=wordsInChapter(lvl,c);
      const done=words.filter(w=>statusOf(w.id)==='hafal').length;
      const pct=words.length?done/words.length:0;
      let bg='var(--line)';
      if(pct>0.75) bg='var(--green)'; else if(pct>0.4) bg='var(--yellow)'; else if(pct>0) bg='var(--red)';
      return `<span class="sm-cell" style="background:${bg}" title="Bab ${c}: ${done}/${words.length}"></span>`;
    }).join('');
    return `<div class="sm-row"><span class="sm-lvl">HSK ${lvl}</span><div class="sm-cells">${cells}</div></div>`;
  }).join('');
}
document.querySelectorAll('#topProgres [data-progtab]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('#topProgres [data-progtab]').forEach(x=>x.classList.toggle('active',x===b));
  const map={ringkasan:'progRingkasan',analisis:'progAnalisis',matrix:'progMatrix',capaian:'progCapaian'};
  document.querySelectorAll('.prog-tabpane').forEach(p=>p.classList.remove('active'));
  document.getElementById(map[b.dataset.progtab]).classList.add('active');
}));

/* ================= LIBRARY ================= */
let libLevel='all', libSearchTerm='', libF={status:'all',fav:false,len:'all'};
function statusBadge(status){
  if(status==='hafal') return '<span class="wbadge" style="background:var(--greenSoft);color:var(--green)">Hafal</span>';
  if(status==='ragu') return '<span class="wbadge" style="background:var(--yellowSoft);color:var(--yellow)">Ragu</span>';
  if(status==='belum') return '<span class="wbadge" style="background:var(--redSoft);color:var(--red)">Belum</span>';
  return '';
}
function wordTileHTML(w,opts){
  const st=statusOf(w.id);
  const fav=!!DB.favorites[w.id];
  const meta=(opts&&typeof opts==='object'&&opts.tag)
    ? '<div class="wtag"><span>HSK '+w.level+'</span>'+(w.chapter?'<span>Bab '+w.chapter+'</span>':'')+'</div>'
    : statusBadge(st);
  return `<div class="word-tile" data-id="${w.id}">
    <div class="wz">${w.hanzi}</div>
    <div class="wm"><b>${toneHtml(w.pinyin)}</b><span>${w.arti}</span></div>
    ${meta}
    <button class="wstar ${fav?'active':''}" data-fav="${w.id}" aria-label="Favorit"><svg class="icon"><use href="#${fav?'i-star':'i-star-o'}"/></svg></button>
  </div>`;
}
// Library home: 6 items per list on grid layouts (desktop/tablet), 5 on single-column phone view.
const libHomeCount=()=>window.matchMedia('(min-width:640px)').matches?6:5;
(function(){ const mq=window.matchMedia('(min-width:640px)'); const h=()=>{ if(typeof renderLibrary==='function'&&document.getElementById('chapterList')) renderLibrary(); }; if(mq.addEventListener) mq.addEventListener('change',h); else if(mq.addListener) mq.addListener(h); })();
function renderLibrary(){
  document.getElementById('libCountTop').textContent = VOCAB.length+' kosakata Mandarin';
  { const n=libFActive(), b=document.getElementById('libFilterCount'); b.textContent=n; b.hidden=!n; }
  document.querySelectorAll('.level-tab').forEach(b=>b.classList.toggle('active', b.dataset.level===libLevel));
  const hasSearch = libSearchTerm.trim().length>0 || libF.status!=='all' || libF.fav || libF.len!=='all';
  document.getElementById('libraryDefaultView').style.display = hasSearch?'none':'block';
  document.getElementById('librarySearchResults').style.display = hasSearch?'block':'none';
  if(hasSearch){ renderLibrarySearch(); return; }

  const lvl = libLevel==='all'?4:libLevel;
  const chapters=chaptersForLevel(lvl).filter(c=>c>0);
  const chapterList=document.getElementById('chapterList');
  if(!chapters.length){
    chapterList.innerHTML='<p class="empty-note">Level ini tidak memiliki pembagian bab.</p>';
  }else{
    chapterList.innerHTML=chapters.slice(0,libHomeCount()).map((c,i)=>{
      const words=wordsInChapter(lvl,c);
      const done=words.filter(w=>statusOf(w.id)==='hafal').length;
      const pct=words.length?Math.round(done/words.length*100):0;
      const color=CH_COLORS[i%CH_COLORS.length];
      return `<div class="chapter-row" data-open-chapter="${lvl}:${c}">
        <div class="chapter-num" style="background:${color}">${c}</div>
        <div class="chapter-info"><b>Bab ${c}</b><span>${words.length} kata</span><div class="bar"><i style="width:${pct}%;background:${color}"></i></div></div>
        <div class="chapter-pct">${pct}%</div>
        <div class="chapter-chev"><svg class="icon"><use href="#i-chevron-right"/></svg></div>
      </div>`;
    }).join('');
  }

  const recentIds=Object.keys(DB.progress).sort((a,b)=>{
    const pa=DB.progress[a].lastReview||'', pb=DB.progress[b].lastReview||'';
    return pb.localeCompare(pa);
  }).slice(0,libHomeCount());
  const recentWords = recentIds.map(id=>VOCAB.find(w=>w.id===id)).filter(Boolean);
  const fallback = recentWords.length? recentWords : VOCAB.filter(w=>String(w.level)===String(lvl)).slice(0,libHomeCount());
  document.getElementById('recentList').innerHTML = fallback.map(wordTileHTML).join('') || '<p class="empty-note">Belum ada kosakata.</p>';
}
const libFActive=()=>(libLevel!=='all')+(libF.status!=='all')+(libF.fav?1:0)+(libF.len!=='all'?1:0);
function libPool(){
  return VOCAB.filter(w=>(libLevel==='all'||String(w.level)===String(libLevel))&&(libF.status==='all'||statusOf(w.id)===libF.status)&&(!libF.fav||DB.favorites[w.id])&&(libF.len==='all'||(libF.len==='1'?[...w.hanzi].length===1:[...w.hanzi].length>1)));
}
// kamus: hasil diurutkan dari kecocokan paling tepat (hanzi persis, pinyin persis, awalan, lalu mengandung)
function renderLibrarySearch(){
  const raw=libSearchTerm.trim(), term=normalize(raw), tp=term.replace(/ /g,'');
  let res=libPool();
  if(term){
    const sc=w=>{ const p=normalize(w.pinyin).replace(/ /g,''), a=normalize(w.arti);
      if(w.hanzi===raw) return 0; if(p===tp) return 1; if(w.hanzi.startsWith(raw)) return 2; if(p.startsWith(tp)) return 3;
      if(w.hanzi.includes(raw)) return 4; if((' '+a+' ').includes(' '+term+' ')) return 5; if(p.includes(tp)) return 6; if(a.includes(term)) return 7; return 9; };
    res=res.map(w=>[sc(w),w]).filter(x=>x[0]<9).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  }
  const total=res.length;
  document.getElementById('librarySearchResults').innerHTML = total
    ? '<p class="lib-count">'+total+' hasil'+(total>80?' · menampilkan 80 teratas, persempit pencarian':'')+'. Ketuk kata untuk detail lengkap.</p>'+res.slice(0,80).map(w=>wordTileHTML(w,{tag:true})).join('')
    : '<p class="empty-note">Tidak ditemukan kosakata yang cocok. Coba hanzi, pinyin tanpa nada, atau arti dalam bahasa Indonesia.</p>';
}
document.getElementById('librarySearch').addEventListener('input',(e)=>{ libSearchTerm=e.target.value; renderLibrary(); });
document.querySelectorAll('.level-tab').forEach(b=>b.addEventListener('click',()=>{ libLevel=b.dataset.level; renderLibrary(); }));
function renderLibFilter(){
  const cur={level:libLevel,status:libF.status,len:libF.len,fav:libF.fav?'1':'0'};
  const g=(t,k,o)=>'<div class="wd-sec"><h4>'+t+'</h4><div class="lf-row">'+o.map(([v,l])=>'<button type="button" class="chip'+(String(cur[k])===String(v)?' active':'')+'" data-lf="'+k+'" data-v="'+v+'">'+l+'</button>').join('')+'</div></div>';
  document.getElementById('libFilterBody').innerHTML=
    g('Level HSK','level',[['all','Semua'],['1','HSK 1'],['2','HSK 2'],['3','HSK 3'],['4','HSK 4'],['5','HSK 5']])+
    g('Status hafalan','status',[['all','Semua'],['hafal','Hafal'],['ragu','Ragu'],['belum','Belum'],['baru','Belum dipelajari']])+
    g('Jenis','len',[['all','Semua'],['1','Satu karakter'],['2','Dua karakter atau lebih']])+
    g('Favorit','fav',[['0','Semua kata'],['1','Hanya favorit']])+
    '<div class="lf-foot"><button type="button" class="an-btn ghost" id="lfReset">Atur ulang</button><button type="button" class="an-btn" id="lfApply">Lihat '+libPool().length+' kata</button></div>';
}
document.getElementById('libraryFilterBtn').addEventListener('click',()=>{ renderLibFilter(); openSheet('libFilterSheet'); });
document.getElementById('libFilterClose').addEventListener('click',()=>closeSheet('libFilterSheet'));
document.getElementById('libFilterSheetBackdrop').addEventListener('click',()=>closeSheet('libFilterSheet'));
document.getElementById('libFilterBody').addEventListener('click',e=>{
  const b=e.target.closest('[data-lf]');
  if(b){ const k=b.dataset.lf, v=b.dataset.v; if(k==='level') libLevel=v; else if(k==='fav') libF.fav=v==='1'; else libF[k]=v; renderLibFilter(); renderLibrary(); return; }
  if(e.target.closest('#lfReset')){ libLevel='all'; libF={status:'all',fav:false,len:'all'}; renderLibFilter(); renderLibrary(); return; }
  if(e.target.closest('#lfApply')) closeSheet('libFilterSheet');
});

/* ===== Detail kata (kamus) ===== */
const GRAM={
 '的':['Partikel struktural','Menghubungkan pewatas dan kata benda: 我的书 (bukuku).'],
 '了':['Partikel aspek','Setelah kata kerja menandai tindakan selesai (我吃了). Di akhir kalimat menandai keadaan baru (下雨了).'],
 '过':['Partikel aspek','Setelah kata kerja menandai pernah mengalami: 我去过北京. Negatifnya 没…过.'],
 '着':['Partikel aspek','Setelah kata kerja menandai keadaan yang berlangsung: 门开着.'],
 '吗':['Partikel tanya','Di akhir kalimat untuk pertanyaan ya/tidak: 你好吗？'],
 '吧':['Partikel modal','Di akhir kalimat untuk ajakan, saran, atau dugaan: 我们走吧。'],
 '呢':['Partikel modal','Pertanyaan balik (你呢？) atau menandai tindakan yang sedang berlangsung.'],
 '把':['Kata depan','Pola 把 + objek + kata kerja + hasil: 我把书放在桌子上。Objeknya harus yang sudah tertentu.'],
 '被':['Kata depan (pasif)','Pola objek + 被 + pelaku + kata kerja: 书被他拿走了。'],
 '比':['Kata depan perbandingan','A 比 B + sifat: 他比我高。Sifatnya tidak memakai 很.'],
 '在':['Kata depan / kata kerja','Sebelum tempat: 我在家. Sebelum kata kerja menandai sedang berlangsung: 我在吃饭.'],
 '会':['Kata kerja bantu','Bisa karena dipelajari (我会游泳) atau akan/mungkin (明天会下雨).'],
 '能':['Kata kerja bantu','Mampu atau boleh karena keadaan: 我今天能来。'],
 '可以':['Kata kerja bantu','Boleh atau bisa (izin): 这里可以坐吗？'],
 '要':['Kata kerja bantu','Ingin atau akan: 我要喝水。'],
 '想':['Kata kerja','Ingin (+ kata kerja) atau merindukan/memikirkan (+ kata benda).'],
 '都':['Kata keterangan','Semua. Diletakkan setelah subjek dan sebelum kata kerja: 我们都去。'],
 '也':['Kata keterangan','Juga. Sebelum kata kerja: 我也是学生。'],
 '就':['Kata keterangan','Segera atau sudah, menekankan terjadi cepat: 他八点就来了。'],
 '才':['Kata keterangan','Baru. Kebalikan 就, menandai terlambat atau sulit: 他十点才来。'],
 '还':['Kata keterangan','Masih atau juga. 还是 dipakai untuk pilihan dalam pertanyaan.'],
 '和':['Kata sambung','Menghubungkan kata benda saja: 我和你。Tidak untuk menyambung kalimat.'],
 '给':['Kata kerja / kata depan','Memberi (给他书) atau untuk/kepada (给你打电话).'],
 '对':['Kata depan / sifat','Terhadap: 对我很好。Sebagai sifat berarti benar.'],
 '不':['Kata keterangan negasi','Meniadakan kata kerja atau sifat untuk masa kini atau kebiasaan. Menjadi bú sebelum nada 4.'],
 '没':['Kata keterangan negasi','Meniadakan 有 dan tindakan lampau: 我没去。'],
 '个':['Kata bantu bilangan','Penggolong umum: 一个人, 三个苹果.'],
 '得':['Partikel struktural','Setelah kata kerja menghubungkan hasil atau derajat: 跑得很快。'],
 '地':['Partikel struktural','Setelah kata sifat menjadikannya keterangan cara: 慢慢地走。']
};
let wdId=null, _cm=null;
const charInfo=c=>{ if(!_cm){ _cm={}; VOCAB.forEach(x=>{ if([...x.hanzi].length===1&&!_cm[x.hanzi]) _cm[x.hanzi]=x; }); } return _cm[c]; };
function renderWordDetail(){
  const w=VOCAB.find(x=>x.id===wdId); if(!w) return;
  const h=w.hanzi, E=escapeHtml, st=statusOf(w.id), fav=!!DB.favorites[w.id];
  const same=VOCAB.filter(x=>x.hanzi===h), lv=[...new Set(same.map(x=>x.level))].sort();
  const hl=t=>E(t).split(E(h)).join('<mark>'+E(h)+'</mark>');
  const say=t=>'<button type="button" class="wd-say" data-say="'+E(t)+'" aria-label="Dengarkan"><svg class="icon"><use href="#i-volume"/></svg></button>';
  const sec=(t,b)=>'<div class="wd-sec"><h4>'+t+'</h4>'+b+'</div>';
  const exAll=window.HANYOU_DATA.examples||{}, exs=[]; same.forEach(x=>(exAll[x.id]||[]).forEach(e=>exs.push(e)));
  const cur=exs.filter(Array.isArray).map(e=>({h:e[0],p:e[1],a:e[2],g:e[3]==='g'}));
  SENTENCES.forEach(x=>{ if(x.hanzi.includes(h)&&!cur.some(c=>c.h===x.hanzi)) cur.push({h:x.hanzi,p:x.pinyin,a:x.arti}); });
  cur.sort((a,b)=>(a.g?1:0)-(b.g?1:0)); // terjemahan asli lebih dulu
  const mined=exs.filter(e=>typeof e==='string').slice(0,2);
  const row=(z,p,a,g)=>'<div class="wd-ex"><div class="t"><div class="z">'+hl(z)+'</div>'+(p?'<div class="p">'+toneHtml(p)+'</div>':'')+(a?'<div class="a'+(g?' g':'')+'">'+(g?'Arti per kata: ':'')+E(a)+'</div>':'')+'</div>'+say(z)+'</div>';
  const g=GRAM[h];
  const chars=[...h];
  const rel=[], seen={}; VOCAB.forEach(x=>{ if(x.hanzi!==h&&x.hanzi.includes(h)&&!seen[x.hanzi]&&rel.length<8){ seen[x.hanzi]=1; rel.push(x); } });
  let html='<div class="wd-top"><div class="wd-hz">'+E(h)+'</div><div style="flex:1;min-width:0"><div class="wd-py">'+toneHtml(w.pinyin)+'</div></div>'+say(h)+'<button type="button" class="wstar'+(fav?' active':'')+'" data-fav="'+E(w.id)+'" aria-label="Favorit"><svg class="icon"><use href="#'+(fav?'i-star':'i-star-o')+'"/></svg></button></div>'+
    '<div class="wd-arti">'+E(w.arti)+'</div>'+
    '<div class="wd-chips">'+lv.map(l=>'<span class="wd-chip">HSK '+l+'</span>').join('')+(st==='baru'?'<span class="wbadge" style="background:var(--panel2);color:var(--muted)">Belum dipelajari</span>':statusBadge(st))+'<span class="wd-chip" style="background:var(--panel2);color:var(--muted)">'+(chars.length===1?'Satu karakter':chars.length+' karakter')+'</span></div>';
  html+=sec('Daftar HSK',same.map(x=>'<p><b>HSK '+x.level+'</b>'+(x.chapter>0?' · Bab '+x.chapter:'')+(same.length>1?' · '+E(x.pinyin)+' · '+E(x.arti):'')+'</p>').join('')+(same.length>1?'<p style="margin-top:6px;color:var(--muted)">Kata ini muncul di lebih dari satu level HSK.</p>':''));
  html+=sec('Tata bahasa',g?'<p><b>'+g[0]+'</b></p><p style="margin-top:4px">'+g[1]+'</p>':'<p style="color:var(--muted)">Belum ada catatan tata bahasa untuk kata ini. Perhatikan posisi kata pada contoh kalimat di bawah.</p>');
  html+=sec('Contoh kalimat',(cur.slice(0,3).map(c=>row(c.h,c.p,c.a,c.g)).join('')+mined.map(m=>row(m,'','Cuplikan dari soal ujian HSK')).join(''))||'<p style="color:var(--muted)">Belum ada contoh kalimat untuk kata ini.</p>');
  if(chars.length>1&&chars.some(c=>charInfo(c))) html+=sec('Karakter penyusun',chars.map(c=>{ const i=charInfo(c); return i?'<button type="button" class="wd-char" data-wd="'+E(i.id)+'"><span class="c">'+E(c)+'</span><div><b>'+E(i.pinyin)+'</b><small>'+E(i.arti)+'</small></div></button>':'<div class="wd-char"><span class="c">'+E(c)+'</span></div>'; }).join(''));
  if(rel.length) html+=sec('Kata yang memuat '+E(h),'<div class="wd-rel">'+rel.map(x=>'<button type="button" class="chip" data-wd="'+E(x.id)+'">'+E(x.hanzi)+' <small>'+E(x.arti.split(/[,;]/)[0])+'</small></button>').join('')+'</div>');
  document.getElementById('wordDetailBody').innerHTML=html;
}
function openWordDetail(id){ wdId=id; renderWordDetail(); openSheet('wordDetailSheet'); document.getElementById('wordDetailBody').scrollTop=0; }
document.getElementById('wordDetailClose').addEventListener('click',()=>closeSheet('wordDetailSheet'));
document.getElementById('wordDetailSheetBackdrop').addEventListener('click',()=>closeSheet('wordDetailSheet'));
document.addEventListener('click',e=>{
  if(e.target.closest('[data-fav]')){ if(document.getElementById('wordDetailSheet').classList.contains('open')) renderWordDetail(); return; }
  const sp=e.target.closest('[data-say]'); if(sp){ speak(sp.dataset.say); return; }
  const t=e.target.closest('[data-wd], .word-tile[data-id]'); if(t) openWordDetail(t.dataset.wd||t.dataset.id);
});

/* delegate clicks: favorite star + chapter open */
document.addEventListener('click',(e)=>{
  const favBtn=e.target.closest('[data-fav]');
  if(favBtn){
    const id=favBtn.dataset.fav;
    if(DB.favorites[id]){ delete DB.favorites[id]; DB.tomb=DB.tomb||{}; DB.tomb['f:'+id]=Date.now(); } else { DB.favorites[id]=Date.now(); }
    save();
    if(document.getElementById('libraryView').classList.contains('active')) renderLibrary();
    if(document.getElementById('wordListSheet').classList.contains('open')) renderWordList(true);
    return;
  }
  const chRow=e.target.closest('[data-open-chapter]');
  if(chRow){
    const [lvl,ch]=chRow.dataset.openChapter.split(':');
    openWordList('Bab '+ch+' · HSK '+lvl, wordsInChapter(lvl,ch));
    return;
  }
});
const WL_PAGE=100;
let wordListCtx=null; // {kind:'static',title,words} | {kind:'status',status,level,limit}
function openWordList(title, words, tag){
  wordListCtx={kind:'static',title,words,tag:!!tag,limit:WL_PAGE};
  renderWordList(); openSheet('wordListSheet');
  document.getElementById('wordListBody').scrollTop=0;
}
// daftar kata berdasarkan status (dibuka dari kartu Hafal / Ragu / Belum / Belum Dipelajari di Progres)
function openStatusList(status){
  wordListCtx={kind:'status',status,level:'all',limit:WL_PAGE};
  renderWordList(); openSheet('wordListSheet');
  document.getElementById('wordListBody').scrollTop=0;
}
function renderWordList(keepScroll){
  const ctx=wordListCtx; if(!ctx) return;
  const body=document.getElementById('wordListBody'), filt=document.getElementById('wordListFilters');
  const prev=keepScroll?body.scrollTop:0;
  let words,title,limit,tile,empty;
  if(ctx.kind==='status'){
    const all=VOCAB.filter(w=>statusOf(w.id)===ctx.status);
    const cnt={all:all.length}; LEVELS.forEach(l=>{ cnt[l]=all.filter(w=>String(w.level)===String(l)).length; });
    words=ctx.level==='all'?all:all.filter(w=>String(w.level)===String(ctx.level));
    title=STATUS_LABEL[ctx.status]+(ctx.level==='all'?'':' · HSK '+ctx.level);
    limit=ctx.limit;
    filt.style.display='flex';
    filt.innerHTML=['all'].concat(LEVELS).map(l=>'<button type="button" class="chip'+(String(l)===String(ctx.level)?' active':'')+'" data-wl-level="'+l+'"'+(cnt[l]?'':' disabled')+'>'+(l==='all'?'Semua':'HSK '+l)+' <small>'+cnt[l]+'</small></button>').join('');
    tile=(w)=>wordTileHTML(w,{tag:true});
    empty = ctx.status==='baru' ? 'Semua kata di pilihan ini sudah pernah dipelajari.' : 'Belum ada kata berstatus '+STATUS_LABEL[ctx.status].toLowerCase()+(ctx.level==='all'?'':' di HSK '+ctx.level)+'.';
  }else{
    words=ctx.words; title=ctx.title; limit=ctx.limit||words.length;
    filt.style.display='none'; filt.innerHTML='';
    tile=ctx.tag?(w)=>wordTileHTML(w,{tag:true}):(w)=>wordTileHTML(w);
    empty='Tidak ada kata.';
  }
  document.getElementById('wordListTitle').textContent=title+' ('+words.length+' kata)';
  const shown=words.slice(0,limit);
  let html=shown.map(tile).join('');
  if(!shown.length) html='<p class="empty-note">'+empty+'</p>';
  if(words.length>shown.length){
    const left=words.length-shown.length;
    html+='<button type="button" class="more-btn" id="wordListMore">Tampilkan '+Math.min(WL_PAGE,left)+' lagi ('+left+' tersisa)</button>';
  }
  body.innerHTML=html;
  body.scrollTop=prev;
}
document.getElementById('wordListFilters').addEventListener('click',(e)=>{
  const b=e.target.closest('[data-wl-level]');
  if(!b||b.disabled||!wordListCtx||wordListCtx.kind!=='status') return;
  wordListCtx.level=b.dataset.wlLevel; wordListCtx.limit=WL_PAGE;
  renderWordList(); document.getElementById('wordListBody').scrollTop=0;
});
document.getElementById('wordListBody').addEventListener('click',(e)=>{
  if(!e.target.closest('#wordListMore')||!wordListCtx) return;
  wordListCtx.limit+=WL_PAGE; renderWordList(true);
});
document.querySelectorAll('[data-status-list]').forEach(b=>b.addEventListener('click',()=>openStatusList(b.dataset.statusList)));
document.getElementById('wordListClose').addEventListener('click',()=>closeSheet('wordListSheet'));
document.getElementById('wordListSheetBackdrop').addEventListener('click',()=>closeSheet('wordListSheet'));
document.getElementById('seeAllChapters').addEventListener('click',()=>{
  const lvl = libLevel==='all'?4:libLevel;
  const chapters=chaptersForLevel(lvl).filter(c=>c>0);
  const listHTML=chapters.map((c,i)=>{
    const words=wordsInChapter(lvl,c);
    const done=words.filter(w=>statusOf(w.id)==='hafal').length;
    const pct=words.length?Math.round(done/words.length*100):0;
    const color=CH_COLORS[i%CH_COLORS.length];
    return `<div class="chapter-row" data-open-chapter="${lvl}:${c}">
      <div class="chapter-num" style="background:${color}">${c}</div>
      <div class="chapter-info"><b>Bab ${c}</b><span>${words.length} kata${chapterTitle(lvl,c)?(' · '+chapterTitle(lvl,c)):''}</span><div class="bar"><i style="width:${pct}%;background:${color}"></i></div></div>
      <div class="chapter-pct">${pct}%</div>
      <div class="chapter-chev"><svg class="icon"><use href="#i-chevron-right"/></svg></div>
    </div>`;
  }).join('');
  wordListCtx=null;
  document.getElementById('wordListFilters').style.display='none';
  document.getElementById('wordListTitle').textContent='Semua Bab · HSK '+lvl;
  document.getElementById('wordListBody').innerHTML=listHTML;
  openSheet('wordListSheet');
});
document.getElementById('seeAllRecent').addEventListener('click',()=>{
  // ikut filter Library: level (Semua = HSK 1–5), status, jenis, favorit
  const extra=libF.status!=='all'||libF.fav||libF.len!=='all';
  openWordList('Semua Kosakata · '+(libLevel==='all'?'HSK 1–5':'HSK '+libLevel)+(extra?' · terfilter':''), libPool(), libLevel==='all');
});

/* ================= INIT ================= */
function init(){
  if(MMP_LOCAL_PREVIEW){
    const badge=document.getElementById('localPreviewBadge');
    if(badge) badge.style.display='block';
  }
  applyTheme();
  buildQueue();
  renderBeranda();
  try{ if(typeof checkScheduleReminders==='function') checkScheduleReminders(); }catch(e){}
  showView('berandaView');
  if(window.hideSplash) window.hideSplash();
}
init();
