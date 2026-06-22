const STORE = 'qamoosi_school_pwa_v2';
const JSON_URL = 'assets/data/words.json';
const grades = ['KG','1','2','3','4','5','6','7','8'];
const gradeName = g => g === 'KG' ? 'الروضة' : `الصف ${g}`;
let data = { version: 0, words: [] };
let route = 'home';
let selectedGrade = 'KG';
let cardIndex = 0;
let quiz = null;
let state = loadState();

function baseState(){
  return { profile: 0, sound: true, profiles: [{ name: 'طالب 1', points: 0, mastered: {}, wrong: {}, hard: {} }], customWords: [] };
}
function loadState(){ try { return JSON.parse(localStorage.getItem(STORE)) || baseState(); } catch(e){ return baseState(); } }
function saveState(){ localStorage.setItem(STORE, JSON.stringify(state)); }
function currentProfile(){ return state.profiles[state.profile] || state.profiles[0]; }
function allWords(){ return [...(data.words || []), ...(state.customWords || [])]; }
function wordsForGrade(g){ return allWords().filter(w => String(w.grade) === String(g)); }
function difficulty(w){ const l = String(w.word_en || '').length; return l <= 5 ? 'سهل' : l <= 8 ? 'متوسط' : 'صعب'; }
function escHtml(v){ return String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
function shuffle(arr){ return [...arr].sort(() => Math.random() - 0.5); }

function play(type='tap'){
  if(!state.sound) return;
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    const c = new AC();
    const o = c.createOscillator();
    const g = c.createGain();
    const freq = {tap:520,pop:720,good:880,bad:240,win:1040}[type] || 520;
    o.type = 'sine'; o.frequency.value = freq; g.gain.value = type === 'bad' ? 0.025 : 0.035;
    o.connect(g); g.connect(c.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + (type === 'win' ? 0.28 : 0.09));
    o.stop(c.currentTime + (type === 'win' ? 0.30 : 0.10));
  }catch(e){}
}
function speak(text, lang='en-US'){
  play('tap');
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang; u.rate = 0.82; u.volume = 0.9;
    window.speechSynthesis.speak(u);
  }catch(e){ toast('النطق غير مدعوم في هذا المتصفح'); }
}
function toast(msg){
  const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg;
  document.body.appendChild(d); setTimeout(() => d.remove(), 2200);
}
async function init(){
  try { if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js'); } catch(e){}
  await loadWords(); render();
}
async function loadWords(){
  try { const r = await fetch(JSON_URL, {cache:'no-store'}); data = await r.json(); }
  catch(e){ data = {version:0, words:[]}; }
}
async function updateWords(){
  try { const r = await fetch(JSON_URL + '?t=' + Date.now()); data = await r.json(); toast('تم تحديث القاموس'); render(); }
  catch(e){ toast('تعذر التحديث، تأكد من الإنترنت'); }
}

function shell(content){
  document.getElementById('app').innerHTML = `
    <div class="wrap">
      <div class="top"><div class="ad">مساحة إعلان علوية مستقبلية</div></div>
      ${content}
    </div>
    <div class="footerAd ad">مساحة إعلان سفلية مستقبلية</div>
    <div class="nav">
      <button data-go="home" class="${route==='home'?'on':''}">الرئيسية</button>
      <button data-go="dict" class="${route==='dict'?'on':''}">القاموس</button>
      <button data-go="cards" class="${route==='cards'?'on':''}">البطاقات</button>
      <button data-go="quiz" class="${route==='quiz'?'on':''}">اختبار</button>
      <button data-go="profile" class="${route==='profile'?'on':''}">الملف</button>
    </div>`;
}
function go(next){ route = next; quiz = null; play(); render(); }
function render(){
  const pages = {home, dict, cards, quiz: quizPage, hard, stats, profile: profilePage, addWord, settings, contact};
  (pages[route] || home)();
}
function gradeSelect(){ return `<select id="gradeSelect">${grades.map(g => `<option value="${g}" ${g===selectedGrade?'selected':''}>${gradeName(g)}</option>`).join('')}</select>`; }

function home(){
  const p = currentProfile();
  shell(`<div class="hero"><h1>قاموسي المدرسي</h1><p>مرحباً ${escHtml(p.name)} — المنهاج الأردني</p></div>
  <div class="grid">
    ${tile('dict','🔎','القاموس','بحث ونطق ومعنى')}
    ${tile('cards','🃏','البطاقات','تعلم كلمة كلمة')}
    ${tile('quiz','✅','اختبار','اختيار من متعدد')}
    ${tile('hard','🔥','الكلمات الصعبة','أخطاء تحتاج مراجعة')}
    ${tile('stats','📊','الإحصائيات','تقدم ونقاط')}
    ${tile('addWord','➕','إضافة كلمة','كلمة جديدة يدوياً')}
    ${tile('settings','⚙️','الإعدادات','الأصوات والتحديث')}
    ${tile('contact','✉️','المطور','مراسلة بالبريد')}
  </div>`);
}
function tile(goTo, icon, title, sub){ return `<button class="tile" data-go="${goTo}"><div class="ico">${icon}</div><b>${title}</b><span>${sub}</span></button>`; }
function dict(){
  shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">القاموس</h2>${gradeSelect()}<input id="search" placeholder="اكتب كلمة إنجليزية أو معنى عربي"><div id="dictList" class="list">${dictItems(wordsForGrade(selectedGrade).slice(0,50))}</div>`);
}
function dictItems(list){
  if(!list.length) return `<div class="empty">لا توجد نتائج</div>`;
  return list.map(w => `<div class="card">
    <div class="row space"><button class="btn alt ltr" data-speak="${escHtml(w.word_en)}">${escHtml(w.word_en)} 🔊</button><span class="chip">${difficulty(w)}</span></div>
    <button class="btn" style="margin-top:10px" data-toggle-next>إظهار المعنى</button>
    <div class="meaning hidden">${escHtml(w.meaning_ar)}</div>
  </div>`).join('');
}
function filterDict(value){
  const s = value.toLowerCase().trim();
  const arr = wordsForGrade(selectedGrade).filter(w => String(w.word_en).toLowerCase().includes(s) || String(w.meaning_ar).includes(value)).slice(0,70);
  document.getElementById('dictList').innerHTML = dictItems(arr);
}
function cards(){
  const arr = wordsForGrade(selectedGrade);
  const w = arr.length ? arr[cardIndex % arr.length] : null;
  shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">البطاقات التعليمية</h2>${gradeSelect()}
  ${w ? `<div class="card"><div class="chip">${cardIndex + 1} / ${arr.length}</div>
    <button class="btn alt word ltr" style="width:100%;margin:18px 0" data-speak="${escHtml(w.word_en)}">${escHtml(w.word_en)} 🔊</button>
    <button class="btn" data-toggle-next>إظهار المعنى</button><div class="meaning hidden">${escHtml(w.meaning_ar)}</div>
    <div class="row" style="margin-top:14px"><button class="btn alt" data-card="prev">السابق</button><button class="btn green" data-master="${escHtml(w.id)}">أتقنتها</button><button class="btn" data-card="next">التالي</button></div>
  </div>` : `<div class="empty">لا توجد كلمات</div>`}`);
}
function markMastered(id){ currentProfile().mastered[id] = true; saveState(); play('good'); }
function startQuiz(){ const items = shuffle(wordsForGrade(selectedGrade)).slice(0,20); quiz = {items, i:0, correct:0, wrong:0, dir:Math.random() > .5 ? 'en-ar':'ar-en', done:items.length===0}; }
function quizPage(){
  if(!quiz) startQuiz();
  if(quiz.done) return quizResult();
  const w = quiz.items[quiz.i]; const dir = quiz.dir;
  const question = dir === 'en-ar' ? w.word_en : w.meaning_ar;
  const answer = dir === 'en-ar' ? w.meaning_ar : w.word_en;
  const opts = makeOptions(w, dir);
  shell(`<button class="back" data-go="home">إنهاء</button><h2 class="title">اختبار ${gradeName(selectedGrade)}</h2>
    <div class="card"><div class="row space"><span class="chip">${quiz.i+1} / ${quiz.items.length}</span><span class="chip">${dir==='en-ar'?'إنجليزي ← عربي':'عربي ← إنجليزي'}</span></div>
    <div class="word ${dir==='en-ar'?'ltr':''}" ${dir==='en-ar'?`data-speak="${escHtml(w.word_en)}"`:''}>${escHtml(question)}</div>
    ${opts.map(o => `<button class="btn qopt" data-answer="${escHtml(o)}" data-real="${escHtml(answer)}" data-id="${escHtml(w.id)}">${escHtml(o)}</button>`).join('')}
    </div>`);
}
function makeOptions(w, dir){
  const correct = dir === 'en-ar' ? w.meaning_ar : w.word_en;
  const pool = wordsForGrade(selectedGrade).filter(x => x.id !== w.id).map(x => dir === 'en-ar' ? x.meaning_ar : x.word_en);
  return shuffle([correct, ...shuffle(pool).slice(0,3)]);
}
function answerQuestion(given, real, id){
  const p = currentProfile();
  if(given === real){ quiz.correct++; p.points = (p.points || 0) + 0.5; p.mastered[id] = true; play('good'); }
  else { quiz.wrong++; p.wrong[id] = (p.wrong[id] || 0) + 1; p.hard[id] = true; play('bad'); }
  quiz.i++; quiz.dir = quiz.dir === 'en-ar' ? 'ar-en' : 'en-ar'; if(quiz.i >= quiz.items.length) quiz.done = true; saveState(); setTimeout(render, 150);
}
function quizResult(){
  const total = quiz.correct + quiz.wrong; const pct = total ? Math.round(quiz.correct / total * 100) : 0;
  shell(`<h2 class="title">نتيجة الاختبار</h2><div class="card"><p>الأسئلة: <b>${total}</b></p><p>الصحيح: <b style="color:var(--green)">${quiz.correct}</b></p><p>الخطأ: <b style="color:var(--red)">${quiz.wrong}</b></p><p>النقاط: <b>${(quiz.correct * .5).toFixed(1)}</b></p><p>نسبة النجاح: <b>${pct}%</b></p><button class="btn" data-quiz-new>اختبار جديد</button></div>`);
}
function hard(){ const ids = Object.keys(currentProfile().hard || {}); const arr = allWords().filter(w => ids.includes(String(w.id))); shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">الكلمات الصعبة</h2><div class="list">${dictItems(arr)}</div>`); }
function stats(){
  const p = currentProfile();
  const rows = grades.map(g => { const arr = wordsForGrade(g); const m = arr.filter(w => p.mastered[w.id]).length; const pct = arr.length ? Math.round(m / arr.length * 100) : 0; const stars = m >= 100 ? '🏆' : m >= 75 ? '⭐⭐⭐' : m >= 50 ? '⭐⭐' : m >= 25 ? '⭐' : '-'; return `<div class="card"><div class="row space"><b>${gradeName(g)}</b><span>${stars}</span></div><div class="muted">${m} / ${arr.length} متقنة</div><div class="bar"><i style="width:${pct}%"></i></div></div>`; }).join('');
  shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">الإحصائيات</h2><div class="card">النقاط الكلية: <b>${(p.points || 0).toFixed(1)}</b></div><div class="list">${rows}</div>`);
}
function profilePage(){
  shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">الملفات الشخصية</h2><div class="list">${state.profiles.map((p,i) => `<div class="card"><div class="row space"><b>${escHtml(p.name)}</b><span class="chip">${(p.points||0).toFixed(1)} نقطة</span></div><div class="row" style="margin-top:10px"><button class="btn ${state.profile===i?'green':'alt'}" data-profile-select="${i}">اختيار</button><button class="btn alt" data-profile-rename="${i}">تعديل</button><button class="btn red" data-profile-delete="${i}">حذف</button></div></div>`).join('')}</div><button class="btn" style="margin-top:14px" data-profile-add>إضافة ملف</button>`);
}
function addProfile(){ if(state.profiles.length >= 3) return toast('الحد الأعلى 3 ملفات'); const n = prompt('اسم الطالب'); if(n){ state.profiles.push({name:n, points:0, mastered:{}, wrong:{}, hard:{}}); saveState(); render(); } }
function renameProfile(i){ const n = prompt('الاسم الجديد', state.profiles[i].name); if(n){ state.profiles[i].name = n; saveState(); render(); } }
function deleteProfile(i){ if(state.profiles.length === 1) return toast('يجب أن يبقى ملف واحد'); if(confirm('حذف الملف؟')){ state.profiles.splice(i,1); state.profile = 0; saveState(); render(); } }
function addWord(){ shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">إضافة كلمة</h2><div class="card">${gradeSelect()}<input id="en" placeholder="English word" class="ltr"><input id="ar" placeholder="المعنى العربي"><button class="btn green" data-save-word>حفظ الكلمة</button></div>`); }
function saveWord(){ const en = document.getElementById('en').value.trim(); const ar = document.getElementById('ar').value.trim(); if(!en || !ar) return toast('أدخل الكلمة والمعنى'); const id = 'c' + Date.now(); state.customWords.push({id, grade:selectedGrade, word_en:en, meaning_ar:ar, source:'user'}); saveState(); play('good'); toast('تمت إضافة الكلمة'); document.getElementById('en').value=''; document.getElementById('ar').value=''; }
function settings(){ shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">الإعدادات</h2><div class="card"><button class="btn alt" data-toggle-sound>الأصوات: ${state.sound ? 'مفعلة' : 'متوقفة'}</button><button class="btn" style="margin-top:10px" data-update-json>تحديث القاموس من JSON</button><p class="muted">الإصدار الحالي: ${data.version || 0}</p></div>`); }
function contact(){ shell(`<button class="back" data-go="home">رجوع</button><h2 class="title">مراسلة المطور</h2><div class="card"><p>للاقتراحات أو الإبلاغ عن خطأ في كلمة:</p><a class="btn" style="display:block;text-align:center;text-decoration:none" href="mailto:yaya15112016@gmail.com?subject=قاموسي المدرسي">إرسال بريد إلكتروني</a></div>`); }

document.addEventListener('click', e => {
  const el = e.target.closest('button,[data-speak],[data-go],a'); if(!el) return;
  if(el.dataset.go){ go(el.dataset.go); return; }
  if(el.dataset.speak){ speak(el.dataset.speak); return; }
  if(el.hasAttribute('data-toggle-next')){ play('pop'); const n = el.nextElementSibling; if(n) n.classList.toggle('hidden'); return; }
  if(el.dataset.card === 'prev'){ cardIndex = Math.max(0, cardIndex - 1); play(); render(); return; }
  if(el.dataset.card === 'next'){ cardIndex++; play(); render(); return; }
  if(el.dataset.master){ markMastered(el.dataset.master); cardIndex++; render(); return; }
  if(el.dataset.answer){ answerQuestion(el.dataset.answer, el.dataset.real, el.dataset.id); return; }
  if(el.hasAttribute('data-quiz-new')){ quiz = null; play(); render(); return; }
  if(el.hasAttribute('data-profile-add')){ addProfile(); return; }
  if(el.dataset.profileSelect){ state.profile = Number(el.dataset.profileSelect); saveState(); play('good'); render(); return; }
  if(el.dataset.profileRename){ renameProfile(Number(el.dataset.profileRename)); return; }
  if(el.dataset.profileDelete){ deleteProfile(Number(el.dataset.profileDelete)); return; }
  if(el.hasAttribute('data-save-word')){ saveWord(); return; }
  if(el.hasAttribute('data-toggle-sound')){ state.sound = !state.sound; saveState(); play(); render(); return; }
  if(el.hasAttribute('data-update-json')){ updateWords(); return; }
});
document.addEventListener('input', e => { if(e.target.id === 'search') filterDict(e.target.value); });
document.addEventListener('change', e => { if(e.target.id === 'gradeSelect'){ selectedGrade = e.target.value; cardIndex = 0; quiz = null; play(); render(); } });

init();
