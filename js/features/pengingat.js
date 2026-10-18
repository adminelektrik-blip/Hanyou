(function(){
const $=id=>document.getElementById(id);
const DEF={days:[1,2,3,4,5],time:'19:30',dur:20,limit:80,onlyTask:true,streak:true,theme:{1:'vocab',2:'soal',3:'vocab',4:'soal',5:'mix',6:'sim',0:'rest'}};
const THEMES={vocab:'Kosa kata',soal:'Latihan soal',mix:'Campuran',sim:'Simulasi',rest:'Santai'};
const OK=()=>'mmp.sx.off.'+today();
const raw=()=>{try{return localStorage.getItem(OK())||'';}catch(e){return '';}};
const off=()=>Number(raw())||0,skipped=()=>raw()==='S';
const themeNow=()=>(rh().theme||{})[new Date().getDay()]||'mix';
const rh=()=>Object.assign({},DEF,(DB.schedule&&DB.schedule.rhythm)||{});
const rhSave=o=>{DB.schedule=DB.schedule||{study:[],exam:[]};DB.schedule.rhythm=o;save();};
const lvlOf=r=>Number(String(r.hsk||'').replace(/\D/g,''))||4;
const dueN=()=>VOCAB.filter(isDue).length;
const logOf=d=>(DB.meta&&DB.meta.dailyLog||{})[d];
const newDone=()=>{const d=logOf(today());return d&&d.newWords||0;};
function avgNew(){let n=0,a=0;for(let i=0;i<14;i++){const d=logOf(addDays(today(),-i));if(d&&d.newWords>0){n+=d.newWords;a++;}}return a?n/a:0;}
function examPlan(){
  const ex=scheduleRead('exam').filter(r=>r.date&&scheduleDateDiff(r.date)>=0).sort((a,b)=>a.date.localeCompare(b.date))[0];
  if(!ex)return null;
  const lv=lvlOf(ex),days=scheduleDateDiff(ex.date),rem=wordsForLevel(lv).filter(w=>statusOf(w.id)==='baru').length;
  const learnDays=Math.max(0,Math.floor((days-7)*rh().days.length/7));
  const need=rem===0?0:(learnDays>0?Math.ceil(rem/learnDays):rem),avg=avgNew();
  const phase=days<=1?'Istirahat dan siapkan berkas ujian':days<=7?'Pemulihan: review dan simulasi':days<=14?'Review besar dan simulasi mingguan':'Fase belajar kata baru';
  const st=rem===0?'ok':avg===0?'unk':(avg>=need?'ok':'late');
  return {ex,lv,days,rem,need,avg,phase,st,learnDays};
}
function target(pl){return Math.max(5,(pl&&pl.days>7&&pl.learnDays>0)?pl.need:(Math.round(avgNew())||10));}
function sessions(){
  const r=rh(),due=dueN(),pl=examPlan(),th=themeNow(),t0=target(pl),dn=newDone();
  const tg=th==='vocab'?Math.round(t0*1.5):(th==='soal'||th==='sim')?Math.max(5,Math.round(t0/2)):t0;
  let t=Number(r.time.split(':')[0])*60+Number(r.time.split(':')[1])+off();
  const fmt=x=>String(Math.floor(x/60)%24).padStart(2,'0')+':'+String(x%60).padStart(2,'0');
  const out=[],add=(k,ic,ti,sub,min,done)=>{out.push({k,ic,ti,sub,at:fmt(t),done});t+=min+5;};
  const rm=Math.max(2,Math.ceil(due*.15));
  if(busy()){if(due>0)add('learn','🔁','Review ringan '+Math.min(due,30)+' kata','Mode hari sibuk · ±5 menit',5,false);add('learn','🆕','5 kata baru','Mode hari sibuk · ±3 menit',dn>=5);return out;}
  if(due>0)add('learn','🔁','Review '+due+' kata','Jatuh tempo hari ini · ±'+rm+' menit',rm,false);
  if(th!=='rest'){
    if(th==='soal')add('latihan','📝','Latihan soal','Fokus hari ini · bagian terlemah dulu · ±20 menit',20,false);
    add('learn','🆕',tg+' kata baru',dn+' dari '+tg+' sudah dipelajari · ±'+Math.ceil(tg*.5)+' menit',Math.ceil(tg*.5),dn>=tg);
    if(th==='sim')add('latihan','🧪','Simulasi 1 paket','Kerjakan satu paket penuh tanpa jeda · ±45 menit',45,false);
    else if(th!=='soal')add('latihan','📝','Latihan soal','Mulai dari bagian yang paling lemah · ±10 menit',10,false);
  }
  return out;
}
let calView=false,cm=0,selD=null,scrollDet=false;
function catchCard(){
  const r=rh(),t0=today();let missed=0;
  for(let i=1;i<=7;i++){const d=addDays(t0,-i);if(r.days.includes(new Date(d+'T12:00:00').getDay())&&!logOf(d))missed++;}
  const over=VOCAB.filter(w=>{const q=DB.progress[w.id];return q&&q.due&&q.due<t0&&q.status!=='baru';}).length;
  if(missed<2||!over)return '';
  return `<div class="sx-card" style="border-color:var(--red)"><b>Rencana pemulihan</b><p>Kamu melewatkan ${missed} hari belajar dan ${over} kartu tertunda. Sebar kartu itu ke hari-hari berikutnya, maksimal ${r.limit} per hari, supaya tidak menumpuk hari ini.</p><button class="an-btn" data-sx-bal>Sebar kartu tertunda</button></div>`;
}
const BK=()=>'mmp.sx.busy.'+today();
const busy=()=>{try{return localStorage.getItem(BK())==='1';}catch(e){return false;}};
function finish(){
  const lv=(DB.settings&&Number(DB.settings.level))||4,avg=avgNew(),f=rh().days.length/7,set=new Set();
  if(!avg||!f)return {has:()=>false,txt:''};
  const eta=n=>addDays(today(),Math.ceil(n/avg/f)),rem=wordsForLevel(lv).filter(w=>statusOf(w.id)==='baru').length;
  const ch=chaptersForLevel(lv).filter(c=>c>0).find(c=>wordsInChapter(lv,c).some(w=>statusOf(w.id)==='baru'));
  const cr=ch?wordsInChapter(lv,ch).filter(w=>statusOf(w.id)==='baru').length:0;let txt='';
  if(ch){set.add(eta(cr));txt+='Bab '+ch+' selesai ±'+formatSchedDate(eta(cr))+'. ';}
  if(rem){set.add(eta(rem));txt+='HSK '+lv+' selesai ±'+formatSchedDate(eta(rem))+'.';}
  return {has:k=>set.has(k),txt};
}
const segHtml=()=>`<div class="sx-seg"><button class="sx-chip${!calView?' on':''}" data-sx-view="list">Daftar</button><button class="sx-chip${calView?' on':''}" data-sx-view="cal">Kalender</button></div>`;
function calCard(){
  const r=rh(),t0=today(),now=new Date(),base=new Date(now.getFullYear(),now.getMonth()+cm,1),y=base.getFullYear(),m=base.getMonth();
  const dim=new Date(y,m+1,0).getDate(),o0=(base.getDay()+6)%7,pad=n=>String(n).padStart(2,'0'),key=d=>y+'-'+pad(m+1)+'-'+pad(d);
  const due={};VOCAB.forEach(w=>{const q=DB.progress[w.id];if(!q||!q.due||q.status==='baru')return;const k=q.due<t0?t0:q.due;due[k]=(due[k]||0)+1;});
  const ex=new Set(scheduleRead('exam').map(x=>x.date)),st=new Set(scheduleRead('study').map(x=>x.date)),fin=finish();
  let cells='';for(let i=0;i<o0;i++)cells+='<i></i>';
  for(let d=1;d<=dim;d++){
    const k=key(d),dt=new Date(y,m,d),n=k<=t0?(logOf(k)&&logOf(k).newWords||0):0,dn=due[k]||0;
    const dots=(ex.has(k)?'<u style="background:var(--green)"></u>':'')+(st.has(k)?'<u style="background:var(--purple)"></u>':'')+(k>=t0&&r.days.includes(dt.getDay())?'<u style="background:var(--orange)"></u>':'')+(dn>r.limit?'<u style="background:var(--red)"></u>':'');
    const mix=(c,q)=>'background:color-mix(in srgb,var(--'+c+') '+q+'%,var(--panel2));';
    const heat=ex.has(k)?mix('green',60):st.has(k)?mix('purple',50):dn>r.limit?mix('red',45):n>0?mix('accent',Math.min(45,12+n*3)):(k>=t0&&r.days.includes(dt.getDay()))?mix('orange',20):'';
    cells+=`<button type="button" class="sx-day${k===t0?' today':''}${k===selD?' sel':''}" style="${heat}" data-sx-date="${k}"><span>${d}${fin.has(k)?'🏁':''}</span><em>${dots}</em></button>`;
  }
  const nm=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  let h=`<div class="sx-card"><div class="sx-calhead"><button class="sx-chip" data-sx-cal="-1">‹</button><b>${new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(base)}</b><button class="sx-chip" data-sx-cal="1">›</button></div><div class="sx-cal">${nm.map(x=>'<small>'+x+'</small>').join('')}${cells}</div><small class="sx-leg">🟩 ujian · 🟪 target bab · 🟧 sesi belajar · 🟥 review melewati batas · 🟦 sudah belajar · 🏁 perkiraan selesai</small></div>`;
  if(fin.txt)h+=`<p class="cfg-note">${fin.txt}</p>`;
  if(selD){
    const l=logOf(selD),dt=new Date(selD+'T12:00:00'),act=r.days.includes(dt.getDay()),th=THEMES[(r.theme||{})[dt.getDay()]||'mix'];
    const exs=scheduleRead('exam').filter(x=>x.date===selD),sts=scheduleRead('study').filter(x=>x.date===selD),dn=due[selD]||0;
    const col=exs.length?'green':sts.length?'purple':dn>r.limit?'red':selD<t0?'accent':'orange';let b='';
    if(selD<=t0)b+=`<div class="sx-row"><span>🟦</span><div><b>Aktivitas belajar</b><small>${l&&l.newWords||0} kata baru dipelajari</small></div></div>`;
    if(selD>=t0&&act)b+=`<div class="sx-row"><span>🟧</span><div><b>Sesi belajar · ${r.time}</b><small>Tema ${th} · ${r.dur} menit</small></div></div>`;
    if(selD>=t0)b+=`<div class="sx-row"><span>${dn>r.limit?'🟥':'🔁'}</span><div><b>${dn} kartu jatuh tempo</b><small>${dn>r.limit?'Melewati':'Dalam'} batas ${r.limit} per hari</small></div></div>`;
    exs.forEach(x=>{b+=`<div class="sx-row"><span>🟩</span><div><b>Ujian ${escapeHtml(x.hsk||'')} · ${x.time||''}</b><small>${escapeHtml(x.note||'Jadwal ujian')}</small></div><button class="an-btn ghost" style="margin:0" data-del-exam="${x.id}">Hapus</button></div>`;});
    sts.forEach(x=>{b+=`<div class="sx-row"><span>🟪</span><div><b>Target ${escapeHtml(x.hsk||'')}${x.chapter?' · Bab '+x.chapter:''}</b><small>${x.time||''}${x.chapterTitle?' · '+escapeHtml(x.chapterTitle):''}</small></div><button class="an-btn ghost" style="margin:0" data-del-study="${x.id}">Hapus</button></div>`;});
    if(!b)b='<p class="cfg-note">Tidak ada jadwal di tanggal ini.</p>';
    h+=`<div class="sx-card sx-detail" style="border-color:var(--${col})"><b>${formatSchedDate(selD)}</b>${b}`+(selD>=t0?'<div class="sx-shift"><button class="an-btn ghost" data-sx-setexam>Pasang ujian</button><button class="an-btn ghost" data-sx-setstudy>Pasang target bab</button></div>':'')+'</div>';
  }
  return h;
}
function weekCard(){
  const wk=[...Array(7)].map((_,i)=>{const d=addDays(today(),i-6),l=logOf(d);return {d,n:l&&l.newWords||0};}),tot=wk.reduce((a,x)=>a+x.n,0),dys=wk.filter(x=>x.n>0).length,mx=Math.max(...wk.map(x=>x.n),1);
  return `<div class="sx-card"><b>Rekap 7 hari</b><span>${tot} kata baru · aktif ${dys} dari 7 hari</span><div class="sx-bars">${wk.map(x=>`<div><i style="height:${Math.max(3,x.n/mx*100)}%;background:var(--green)"></i><small>${x.n}</small><small>${x.d.slice(8)}</small></div>`).join('')}</div></div>`;
}
function refreshTabs(){
  const r=rh(),pl=examPlan(),TM={Today:['bolt','orange','Hari Ini',sessions().filter(s=>!s.done).length+' sesi'],study:['target','purple','Prioritas',scheduleRead('study').length+' rencana'],exam:['calendar','green','Ujian',pl?'H-'+pl.days:'Belum ada'],Rhythm:['clock','blue','Ritme',r.days.length+' hari']};
  document.querySelectorAll('#scheduleSheet .schedule-tab').forEach(b=>{const m=TM[b.dataset.stab||b.dataset.schedtab];if(!m)return;
    b.className=b.className.replace(/\bsx-t-\w+/g,'').trim();b.classList.add('sx-tab','sx-t-'+m[1]);
    b.innerHTML=`<span class="bc-icon bc-${m[1]}"><svg class="icon"><use href="#i-${m[0]}"/></svg></span><b>${m[2]}</b><small>${m[3]}</small>`;});
}
function load14(){
  const a=Array(14).fill(0),t0=new Date(today()+'T12:00:00');
  VOCAB.forEach(w=>{const p=DB.progress[w.id];if(!p||!p.due||p.status==='baru')return;let i=Math.round((new Date(p.due+'T12:00:00')-t0)/864e5);if(i<0)i=0;if(i<14)a[i]++;});
  return a;
}
function renderToday(){
  const el=$('scheduleTodayBody');if(!el)return;
  const r=rh(),act=r.days.includes(new Date().getDay()),ss=sessions(),pl=examPlan(),ld=load14(),mx=Math.max(r.limit,...ld,1);
  el.classList.toggle('sx-calmode',calView);
  let h=segHtml();
  if(calView){el.innerHTML=h+calCard();if(scrollDet){scrollDet=false;el.querySelector('.sx-detail')?.scrollIntoView({block:'nearest',behavior:'smooth'});}return;}
  const next=skipped()?null:ss.find(s=>!s.done);
  if(next){const [hh,mm]=next.at.split(':').map(Number),n=new Date(),diff=hh*60+mm-(n.getHours()*60+n.getMinutes());
    h+=`<div class="sx-hero"><span>Sesi berikutnya</span><b>${next.at}</b><small>${!act?'Hari istirahat di ritme kamu':diff>0?'dalam '+(diff>=60?Math.floor(diff/60)+' jam '+diff%60+' menit':diff+' menit'):'Sudah waktunya, mulai sekarang'}</small></div>`;}
  else h+=skipped()?'<div class="sx-hero"><span>Hari ini dilewati</span><b>Besok saja</b><small>Kartu jatuh tempo menunggu besok</small></div>':'<div class="sx-hero"><span>Target hari ini</span><b>Beres 🎉</b><small>Semua sesi selesai</small></div>';
  h+=`<div class="sx-shift"><small>Tema hari ini: <b>${busy()?'Mode hari sibuk':THEMES[themeNow()]}</b></small>${skipped()?'<button class="an-btn ghost" data-sx-shift="0">Batalkan</button>':next?'<button class="an-btn ghost" data-sx-shift="60">Geser +1 jam</button><button class="an-btn ghost" data-sx-shift="S">Besok saja</button>':''}<button class="an-btn ghost" data-sx-busy>${busy()?'Matikan mode sibuk':'Mode hari sibuk'}</button></div>`;
  h+=(skipped()?[]:ss).map(s=>`<div class="schedule-item"><span class="schedule-badge">${s.at}</span><div class="si-main"><b>${s.ic} ${s.ti}${s.done?' ✓':''}</b><span>${s.sub}</span></div>${s.done?'':`<button class="an-btn" style="margin:0" data-sx-go="${s.k}">Mulai</button>`}</div>`).join('');
  if(!dueN())h+='<p class="cfg-note">Tidak ada kata jatuh tempo hari ini, jadi sesi review tidak muncul.</p>';
  if(pl){const c={ok:'Sesuai jalur',late:'Terlambat, naikkan laju',unk:'Belum ada data laju'}[pl.st];
    h+=`<div class="sx-card"><b>Rencana menuju ujian · H-${pl.days}</b><span>${escapeHtml(pl.ex.hsk||'')} · ${formatSchedDate(pl.ex.date)}</span><p>${pl.phase}. Sisa ${pl.rem} kata baru, butuh ±${pl.need} kata per hari belajar (lajumu ${pl.avg?pl.avg.toFixed(1):'-'}).</p><em class="sx-${pl.st}">${c}</em><small>Checklist: H-7 mulai simulasi · H-3 review kata lemah · H-1 siapkan berkas dan istirahat</small></div>`;}
  else h+='<p class="cfg-note">Tambahkan tanggal di tab Jadwal Ujian, nanti rencana mundur muncul di sini.</p>';
  h+=`<div class="sx-card"><b>Beban review 14 hari</b><span>Batas ${r.limit} kartu per hari · merah berarti melewati batas</span><div class="sx-bars">${ld.map((n,i)=>`<div><i style="height:${Math.max(3,n/mx*100)}%;background:${n>r.limit?'var(--red)':'var(--accent)'}" title="${n}"></i><small>${n}</small><small>${addDays(today(),i).slice(8)}</small></div>`).join('')}</div>${ld.some(n=>n>r.limit)?'<button class="an-btn ghost" data-sx-bal>Sebar ulang kartu yang menumpuk</button>':''}</div>`;
  h+=catchCard();h+=weekCard();
  el.innerHTML=h;
}
function balance(){
  const L=rh().limit,t0=today(),cnt={};let moved=0;
  VOCAB.map(w=>DB.progress[w.id]).filter(p=>p&&p.due&&p.status!=='baru'&&p.due<=addDays(t0,13)).sort((a,b)=>a.due.localeCompare(b.due)).forEach(p=>{
    let d=p.due<t0?t0:p.due;while((cnt[d]||0)>=L)d=addDays(d,1);cnt[d]=(cnt[d]||0)+1;if(d!==p.due){p.due=d;moved++;}});
  save();toast(moved?moved+' kartu digeser agar beban merata.':'Beban sudah merata.');renderToday();
}
function renderRhythm(){
  const r=rh(),nm=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  $('sxDays').innerHTML=[1,2,3,4,5,6,0].map(d=>`<button type="button" class="sx-chip${r.days.includes(d)?' on':''}" data-sx-day="${d}">${nm[d]}</button>`).join('');
  $('sxThemes').innerHTML='<b style="grid-column:1/-1;font-size:12.5px">Tema per hari</b>'+[1,2,3,4,5,6,0].map(d=>`<label>${nm[d]}<select data-sx-th="${d}">${Object.keys(THEMES).map(k=>`<option value="${k}"${(r.theme||{})[d]===k?' selected':''}>${THEMES[k]}</option>`).join('')}</select></label>`).join('');$('sxTime').value=r.time;$('sxDur').value=String(r.dur);$('sxLimit').value=r.limit;$('sxOnly').checked=r.onlyTask;$('sxStreak').checked=r.streak;
}
function saveRhythm(){
  const days=[...document.querySelectorAll('[data-sx-day].on')].map(b=>Number(b.dataset.sxDay));
  if(!days.length){toast('Pilih minimal satu hari belajar.');return;}
  rhSave({days,theme:Object.fromEntries([...document.querySelectorAll('[data-sx-th]')].map(x=>[x.dataset.sxTh,x.value])),time:$('sxTime').value||'19:30',dur:Number($('sxDur').value)||20,limit:Math.max(10,Number($('sxLimit').value)||80),onlyTask:$('sxOnly').checked,streak:$('sxStreak').checked});
  toast('Ritme belajar tersimpan.');renderToday();
}
function exportIcs(){
  const r=rh(),p=n=>String(n).padStart(2,'0'),code=['SU','MO','TU','WE','TH','FR','SA'];
  const st=today().replace(/-/g,'')+'T'+r.time.replace(':','')+'00',[h,m]=r.time.split(':').map(Number),e=h*60+m+r.dur;
  const en=today().replace(/-/g,'')+'T'+p(Math.floor(e/60)%24)+p(e%60)+'00';
  let o=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//HANYOU//Jadwal//ID',
   'BEGIN:VEVENT','UID:hanyou-ritme@hanyou','DTSTAMP:'+st,'DTSTART:'+st,'DTEND:'+en,'RRULE:FREQ=WEEKLY;BYDAY='+r.days.map(d=>code[d]).join(','),'SUMMARY:Belajar HANYOU','END:VEVENT'];
  scheduleRead('exam').forEach((x,i)=>{if(!x.date)return;const d=x.date.replace(/-/g,'');o.push('BEGIN:VEVENT','UID:hanyou-ujian-'+i+'@hanyou','DTSTAMP:'+st,'DTSTART;VALUE=DATE:'+d,'SUMMARY:Ujian '+(x.hsk||'HSK')+(x.note?' - '+x.note:''),'END:VEVENT');});
  o.push('END:VCALENDAR');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([o.join('\r\n')],{type:'text/calendar'}));a.download='jadwal-hanyou.ics';document.body.appendChild(a);a.click();a.remove();
}
function build(){
  const tabs=document.querySelector('#scheduleSheet .schedule-tabs'),body=document.querySelector('#scheduleSheet .sheet-body');
  if(!tabs||!body||$('scheduleTodayPane'))return;
  tabs.insertAdjacentHTML('afterbegin','<button class="schedule-tab active" data-stab="Today">Hari Ini</button>');
  tabs.insertAdjacentHTML('beforeend','<button class="schedule-tab" data-stab="Rhythm">Ritme</button>');
  body.insertAdjacentHTML('afterbegin','<div class="schedule-pane active" id="scheduleTodayPane"><div id="scheduleTodayBody"></div></div>');
  body.insertAdjacentHTML('beforeend',`<div class="schedule-pane" id="scheduleRhythmPane"><p class="cfg-note" style="margin-top:0">Atur hari dan jam belajar. Sesi Hari Ini, pengingat, dan rencana ujian mengikuti ritme ini.</p><div id="sxDays" class="sx-days"></div><div id="sxThemes" class="sx-themes"></div><div class="schedule-form-grid"><label>Jam mulai<input id="sxTime" type="time"></label><label>Durasi sesi<select id="sxDur"><option value="10">10 menit</option><option value="20">20 menit</option><option value="40">40 menit</option></select></label><label>Batas review per hari<input id="sxLimit" type="number" min="10" step="5"></label></div><label class="sx-chk"><input type="checkbox" id="sxOnly"> Ingatkan hanya kalau ada tugas</label><label class="sx-chk"><input type="checkbox" id="sxStreak"> Peringatan malam jika streak terancam</label><button class="cfg-start" id="sxSave">Simpan ritme</button><button class="an-btn ghost" id="sxIcs" style="width:100%;margin:8px 0 0">Ekspor ke kalender (.ics)</button></div>`);
  document.querySelectorAll('#scheduleSheet .schedule-tab').forEach(b=>b.addEventListener('click',()=>{
    const k=b.dataset.stab;
    if(k){document.querySelectorAll('#scheduleSheet .schedule-tab').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('#scheduleSheet .schedule-pane').forEach(x=>x.classList.toggle('active',x.id==='schedule'+k+'Pane'));if(k==='Today')renderToday();else renderRhythm();}
    else document.querySelectorAll('[data-stab]').forEach(x=>x.classList.remove('active'));
  }));
  $('studyPlanList')?.insertAdjacentHTML('afterend','<button class="an-btn ghost" id="sxAuto" style="width:100%;margin:8px 0 0">Buat rencana otomatis</button>');
  $('sxAuto').onclick=()=>{
    const lv=(DB.settings&&Number(DB.settings.level))||4,ch=chaptersForLevel(lv).filter(c=>c>0).find(c=>wordsInChapter(lv,c).some(w=>statusOf(w.id)==='baru'));
    if(!ch){toast('Semua bab HSK '+lv+' sudah dimulai.');return;}
    const rows=scheduleRead('study');rows.push({id:Date.now()*1000+Math.floor(Math.random()*1000),hsk:'HSK '+lv,title:'HSK '+lv+' · Bab '+ch,chapter:ch,chapterTitle:chapterTitleFor(lv,ch),date:addDays(today(),7),time:rh().time});
    scheduleWrite('study',rows);renderStudyPlans();renderNotifications();toast('Rencana dibuat: HSK '+lv+' · Bab '+ch+' dalam 7 hari.');
  };
  $('sxSave').onclick=saveRhythm;$('sxIcs').onclick=exportIcs;
  $('scheduleSheet').addEventListener('click',()=>setTimeout(()=>{refreshTabs();if(calView)renderToday();},80));
  $('scheduleSheet').addEventListener('click',e=>{
    const g=e.target.closest('[data-sx-go]');
    if(g){closeSheet('scheduleSheet');if(g.dataset.sxGo==='latihan')document.querySelector('#belajarCategoryGrid [data-belajarmode="latihan"]')?.click();else $('startLearnBtn')?.click();}
    if(e.target.closest('[data-sx-bal]')&&confirm('Kartu yang menumpuk akan digeser ke hari berikutnya. Lanjutkan?'))balance();
    const d=e.target.closest('[data-sx-day]');if(d)d.classList.toggle('on');
    const sh=e.target.closest('[data-sx-shift]');if(sh){const v=sh.dataset.sxShift;try{if(v==='S')localStorage.setItem(OK(),'S');else if(v==='0')localStorage.removeItem(OK());else localStorage.setItem(OK(),String(off()+Number(v)));}catch(x){}renderToday();}
    const vw=e.target.closest('[data-sx-view]');if(vw){calView=vw.dataset.sxView==='cal';renderToday();const sb=document.querySelector('#scheduleSheet .sheet-body');if(sb)sb.scrollTop=0;}
    const cn=e.target.closest('[data-sx-cal]');if(cn){cm+=Number(cn.dataset.sxCal);renderToday();}
    const dd=e.target.closest('[data-sx-date]');if(dd){selD=dd.dataset.sxDate;scrollDet=true;renderToday();}
    const bz=e.target.closest('[data-sx-busy]');if(bz){try{busy()?localStorage.removeItem(BK()):localStorage.setItem(BK(),'1');}catch(x){}renderToday();refreshTabs();}
    const se=e.target.closest('[data-sx-setexam]');if(se){const ed=$('examDate');if(ed)ed.value=selD;document.querySelector('[data-schedtab="exam"]')?.click();toast('Tanggal ujian diisi '+formatSchedDate(selD)+'. Pilih HSK lalu simpan.');}
    const sy=e.target.closest('[data-sx-setstudy]');if(sy){const sd=$('studyPlanDate');if(sd)sd.value=selD;document.querySelector('[data-schedtab="study"]')?.click();toast('Tanggal target diisi '+formatSchedDate(selD)+'. Pilih HSK dan bab lalu simpan.');}
  });
}
function openToday(){
  build();
  document.querySelectorAll('#scheduleSheet .schedule-tab').forEach(x=>x.classList.toggle('active',x.dataset.stab==='Today'));
  document.querySelectorAll('#scheduleSheet .schedule-pane').forEach(x=>x.classList.toggle('active',x.id==='scheduleTodayPane'));
  const lv=DB.settings&&Number(DB.settings.level);if(lv>=1&&lv<=6){const s=$('studyPlanPackage');if(s){s.value=String(lv);chapterOptions('studyPlanChapter',lv);}}
  renderToday();refreshTabs();
}
$('aturJadwalMenu')?.addEventListener('click',openToday);
function smartRemind(){
  try{
    if(skipped())return;
    const r=rh(),n=new Date(),m0=Number(r.time.slice(0,2))*60+Number(r.time.slice(3,5))+off(),thr=String(Math.floor(m0/60)%24).padStart(2,'0')+':'+String(m0%60).padStart(2,'0'),hm=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'),k='mmp.sx.'+(typeof ACTIVE_UID!=='undefined'&&ACTIVE_UID||'anon')+'.'+today()+'.';
    const fire=(key,msg)=>{if(localStorage.getItem(k+key))return;localStorage.setItem(k+key,'1');toast(msg);if('Notification' in window&&Notification.permission==='granted'){try{new Notification('HANYOU',{body:msg});}catch(e){}}};
    const due=dueN(),dn=newDone();
    if(r.days.includes(n.getDay())&&hm>=thr&&(!r.onlyTask||due>0||dn<target(examPlan())))fire('t','Waktunya belajar: '+due+' review, '+Math.max(0,target(examPlan())-dn)+' kata baru menunggu.');
    if(r.streak&&hm>='21:00'&&!logOf(today()))fire('s','Streak kamu terancam. Satu sesi singkat malam ini cukup untuk menjaganya.');
  }catch(e){}
}
setInterval(smartRemind,60000);setTimeout(smartRemind,4000);
})();
