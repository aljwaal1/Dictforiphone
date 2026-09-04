from pathlib import Path

JS=Path('jordan/jordan-pwa.js')
INDEX=Path('jordan/index.html')
SW=Path('jordan/sw.js')

s=JS.read_text(encoding='utf-8')

# Safe no-op when already materialized.
if 'function paragraphList(text)' in s and "['words','sentences','paragraphs'].includes(mode)" in s and 'saveWorkSession' in s:
    raise SystemExit(0)

s=s.replace('كتاب عام بدون صف: كلمات ومعاني أو جمل ومعاني.','كتاب عام بدون صف: كلمات أو جمل أو فقرات مع الترجمة والحفظ التلقائي.')

anchor="function sentenceList(text){return String(text||'').replace(/\\s+/g,' ').split(/(?<=[.!?])\\s+/).map(x=>x.trim()).filter(x=>x.length>=12&&x.length<=500&&/[A-Za-z]{2}/.test(x))}\n"
extra=r'''function paragraphList(text){
  const raw=String(text||'').replace(/\r/g,'\n');
  let blocks=raw.split(/\n\s*\n+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x.length>=35&&/[A-Za-z]{2}/.test(x));
  if(blocks.length<=1){
    const sent=sentenceList(raw);blocks=[];let buf=[];
    for(const x of sent){buf.push(x);const joined=buf.join(' ');if(buf.length>=3||joined.length>=420){blocks.push(joined);buf=[]}}
    if(buf.length)blocks.push(buf.join(' '));
  }
  return blocks.filter(x=>x.length>=35&&x.length<=1200)
}
function workSessionKey(file,mode){return `bookwork:${mode}:${String(file?.name||'book')}:${Number(file?.size||0)}:${Number(file?.lastModified||0)}`}
async function saveWorkSession(file,mode,state){await enrichCacheSet(workSessionKey(file,mode),{...state,mode,fileName:file?.name||'',savedAt:Date.now()})}
async function loadWorkSession(file,mode){const x=await enrichCacheGet(workSessionKey(file,mode));return x&&x.mode===mode?x:null}
async function clearWorkSession(file,mode){try{const d=await openEnrichDb();await new Promise(resolve=>{const tx=d.transaction('kv','readwrite');tx.objectStore('kv').delete(workSessionKey(file,mode));tx.oncomplete=resolve;tx.onerror=resolve});d.close()}catch(_){}}
'''
if anchor not in s:
    raise SystemExit('sentenceList anchor missing')
s=s.replace(anchor,anchor+extra)

old="const tc=await p.getTextContent();const text=tc.items.map(x=>x.str).join(' ');await onPage?.(text,i,pdf.numPages);"
new="const tc=await p.getTextContent();let prevY=null,parts=[];for(const x of tc.items){const y=Number(x?.transform?.[5]??0);if(prevY!==null&&Math.abs(y-prevY)>8)parts.push('\\n');parts.push(String(x.str||''));prevY=y}const text=parts.join(' ').replace(/ *\\n */g,'\\n');await onPage?.(text,i,pdf.numPages);"
if old not in s:
    raise SystemExit('extractPdf anchor missing')
s=s.replace(old,new)

start=s.find('function bookTranslate(){')
end=s.find('\nfunction render(){',start)
if start<0 or end<0:
    raise SystemExit('bookTranslate block missing')
replacement=r'''function bookTranslate(){shell(`<div class="j-top"><div><h1 class="j-title">ترجمة كتاب</h1><p class="j-sub">بدون صف أو منهاج • حفظ تلقائي أثناء العمل</p></div></div><div class="j-panel"><div class="j-grid"><article class="j-card bt-mode" data-mode="words"><div class="ico">🔤</div><h3>الكلمات ومعانيها</h3><p>يستخرج الكلمات مرة واحدة داخل الكتاب ويجلب معناها العربي.</p></article><article class="j-card bt-mode" data-mode="sentences"><div class="ico">💬</div><h3>الجمل ومعانيها</h3><p>يعرض الجملة الإنجليزية وتحتها ترجمتها العربية مع النطق.</p></article><article class="j-card bt-mode" data-mode="paragraphs"><div class="ico">📄</div><h3>الفقرات ومعانيها</h3><p>يحافظ على الفقرة قدر الإمكان ويترجمها كوحدة واحدة لفهم السياق.</p></article></div><div class="j-toolbar" style="margin-top:14px"><input id="btf" type="file" accept="application/pdf" class="j-input"><button id="btrun" class="j-btn" disabled>ابدأ / أكمل الترجمة</button></div><div id="btchoice" class="j-note">اختر نوع الترجمة. يتم حفظ التقدم تلقائيًا بعد كل صفحة وكل دفعة ترجمة على هذا الجهاز.</div><div id="btp" style="margin-top:12px"></div><div id="btr" class="j-results" style="margin-top:14px"></div></div>`);let mode='';ROOT.querySelectorAll('.bt-mode').forEach(c=>c.onclick=()=>{mode=c.dataset.mode;ROOT.querySelectorAll('.bt-mode').forEach(x=>x.style.outline='');c.style.outline='3px solid var(--j-primary,#0ea5e9)';ROOT.querySelector('#btchoice').textContent=mode==='words'?'النظام: الكلمات ومعانيها':mode==='sentences'?'النظام: الجمل ومعانيها':'النظام: الفقرات ومعانيها';ROOT.querySelector('#btrun').disabled=false});ROOT.querySelector('#btrun').onclick=()=>translateBookRun(mode)}

async function translateBookRun(mode){const f=ROOT.querySelector('#btf')?.files?.[0],p=ROOT.querySelector('#btp'),r=ROOT.querySelector('#btr');if(!f){alert('اختر ملف PDF أولًا');return}if(!['words','sentences','paragraphs'].includes(mode)){alert('اختر نوع الترجمة أولًا');return}r.innerHTML='';let saved=await loadWorkSession(f,mode);const words=new Map(),items=[],seen=new Set();let pages=0,startPage=1;if(saved){pages=Number(saved.pages||0);startPage=Math.max(1,pages+1);for(const x of Array.isArray(saved.items)?saved.items:[]){if(mode==='words')words.set(x.word,x);else{items.push(x);seen.add(String(x.text||'').toLowerCase())}}p.innerHTML=`<div class="j-note">تم العثور على حفظ تلقائي سابق: ${pages} صفحة. سيتم الاستكمال من الصفحة ${startPage}.</div>`}
try{await extractPdf(f,async(text,pi,total)=>{if(pi<startPage)return;pages=pi;if(mode==='words'){for(const m of text.matchAll(/[A-Za-z][A-Za-z'-]*/g)){const raw=m[0];if(!validWord(raw,false))continue;const key=raw.toLowerCase();if(!words.has(key))words.set(key,{word:key,meaning:'',page:pi})}}else{const source=mode==='paragraphs'?paragraphList(text):sentenceList(text);for(const block of source){const key=block.toLowerCase();if(seen.has(key))continue;seen.add(key);items.push({text:block,translation:'',page:pi})}}const snapshot=mode==='words'?[...words.values()]:items;await saveWorkSession(f,mode,{pages:pi,totalPages:total,phase:'reading',items:snapshot});p.innerHTML=`<div class="j-progress"><div style="width:${Math.round(pi/total*45)}%"></div></div><p>قراءة الصفحة ${pi} من ${total} • تم الحفظ تلقائيًا</p>`});const list=mode==='words'?[...words.values()]:items;if(!list.length){p.innerHTML='<div class="j-note">لم يتم العثور على محتوى مناسب للترجمة.</div>';return}const pending=list.filter(x=>mode==='words'?!x.meaning:!x.translation);const doneBase=list.length-pending.length;await mapBatches(pending,async item=>{if(mode==='words'){const x=await enrichVocabulary(item.word);item.meaning=x.meaning}else item.translation=await translateEnAr(item.text)},async(done,total)=>{await saveWorkSession(f,mode,{pages,phase:'translating',items:list});const finished=doneBase+done;p.innerHTML=`<div class="j-progress"><div style="width:${45+Math.round(finished/Math.max(1,list.length)*55)}%"></div></div><p>الترجمة ${finished} من ${list.length} • تم الحفظ تلقائيًا</p>`});await saveWorkSession(f,mode,{pages,phase:'complete',items:list,complete:true});p.innerHTML=`<div class="j-stats"><div class="j-stat">${pages} صفحة</div><div class="j-stat">${list.length} ${mode==='words'?'كلمة':mode==='sentences'?'جملة':'فقرة'}</div><div class="j-stat">✓ محفوظ تلقائيًا</div></div>`;if(mode==='words'){r.innerHTML=list.map(x=>`<div class="j-word"><button class="j-btn light j-speak" data-speak="${esc(x.word)}">🔊</button><div><div class="j-word-en">${esc(x.word)}</div><div class="j-word-ar">${esc(x.meaning||'تعذر جلب المعنى')}</div><div class="j-meta">ص ${x.page}</div></div><span></span></div>`).join('')}else{r.innerHTML=list.map(x=>`<div class="j-word"><button class="j-btn light j-speak" data-speak="${esc(x.text)}">🔊</button><div><div class="j-example">${esc(x.text)}</div><div class="j-word-ar">${esc(x.translation||'تعذر جلب الترجمة')}</div><div class="j-meta">ص ${x.page} • ${mode==='paragraphs'?'فقرة':'جملة'}</div></div><span></span></div>`).join('')}bindSpeak()}catch(e){console.error(e);const list=mode==='words'?[...words.values()]:items;await saveWorkSession(f,mode,{pages,phase:'interrupted',items:list,error:String(e?.message||e)});p.innerHTML=`<div class="j-note">توقف العمل، لكن تم حفظ ما تم إنجازه حتى الصفحة ${pages}. افتح نفس الملف واختر نفس النوع ثم اضغط «ابدأ / أكمل الترجمة» للمتابعة.<br>${esc(e.message||e)}</div>`}}
'''
s=s[:start]+replacement+s[end:]
JS.write_text(s,encoding='utf-8')

idx=INDEX.read_text(encoding='utf-8')
idx=idx.replace('jordan-pwa.css?v=354','jordan-pwa.css?v=355').replace('easy-english-v345-patch.css?v=354','easy-english-v345-patch.css?v=355').replace('jordan-pwa.js?v=354','jordan-pwa.js?v=355').replace('manifest.webmanifest?v=354','manifest.webmanifest?v=355').replace('sw.js?v=354-book-translation-1','sw.js?v=355-paragraph-autosave-1')
INDEX.write_text(idx,encoding='utf-8')

sw=SW.read_text(encoding='utf-8')
sw=sw.replace('easy-english-ai-pwa-v354-book-translation','easy-english-ai-pwa-v355-paragraph-autosave').replace('jordan-pwa.css?v=354','jordan-pwa.css?v=355').replace('easy-english-v345-patch.css?v=354','easy-english-v345-patch.css?v=355').replace('jordan-pwa.js?v=354','jordan-pwa.js?v=355').replace('manifest.webmanifest?v=354','manifest.webmanifest?v=355')
SW.write_text(sw,encoding='utf-8')
