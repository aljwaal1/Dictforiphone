from pathlib import Path

JS=Path('jordan/jordan-pwa.js')
INDEX=Path('jordan/index.html')
SW=Path('jordan/sw.js')

s=JS.read_text(encoding='utf-8')

if 'ensureTesseract' in s and 'booklab_latest_v358' in s and 'bcam' in s and 'bimg' in s:
    raise SystemExit(0)

# Make async progress callbacks truly awaited so autosave completes before the next batch.
s=s.replace(
"async function mapBatches(list,fn,onProgress){let done=0;for(let i=0;i<list.length;i+=DEVICE_WORKERS){const batch=list.slice(i,i+DEVICE_WORKERS);await Promise.all(batch.map(fn));done+=batch.length;onProgress?.(Math.min(done,list.length),list.length);await idleYield()}}",
"async function mapBatches(list,fn,onProgress){let done=0;for(let i=0;i<list.length;i+=DEVICE_WORKERS){const batch=list.slice(i,i+DEVICE_WORKERS);await Promise.all(batch.map(fn));done+=batch.length;await onProgress?.(Math.min(done,list.length),list.length);await idleYield()}}"
)

anchor="async function extractPdf(file,onPage,onProgress){"
i=s.find(anchor)
if i<0:
    raise SystemExit('extractPdf anchor missing')
end=s.find("\\nfunction bookLab(){",i)
if end<0:
    raise SystemExit('bookLab anchor missing')
extra=r'''
const LAB_DRAFT_KEY='booklab_latest_v358';
async function saveLabDraft(state){await enrichCacheSet(LAB_DRAFT_KEY,{...state,savedAt:Date.now()});try{await navigator.storage?.persist?.()}catch(_){}}
async function loadLabDraft(){const x=await enrichCacheGet(LAB_DRAFT_KEY);return x&&typeof x==='object'?x:null}
async function clearLabDraft(){try{const d=await openEnrichDb();await new Promise(resolve=>{const tx=d.transaction('kv','readwrite');tx.objectStore('kv').delete(LAB_DRAFT_KEY);tx.oncomplete=resolve;tx.onerror=resolve});d.close()}catch(_){}}
async function ensureTesseract(){
  if(window.Tesseract)return;
  await new Promise((res,rej)=>{const x=document.createElement('script');x.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';x.onload=res;x.onerror=rej;document.head.appendChild(x)});
  if(!window.Tesseract)throw new Error('OCR engine unavailable');
}
async function ocrImage(file,onProgress){
  await ensureTesseract();
  const result=await Tesseract.recognize(file,'eng',{logger:m=>{if(m?.status==='recognizing text')onProgress?.(Number(m.progress||0))}});
  return String(result?.data?.text||'');
}
function labSourceKey(file,kind,g,s){return [kind,file?.name||'source',Number(file?.size||0),Number(file?.lastModified||0),g,s].join(':')}
function addLabText(text,pi,sourceName,g,s,state){
  const um=text.match(/\\bUnit\\s+([0-9]+|[A-Za-z]+)/i),lm=text.match(/\\bLesson\\s+([0-9]+|[A-Za-z]+)/i);
  if(um)state.unit='Unit '+um[1];
  if(lm)state.lesson='Lesson '+lm[1];
  const ms=[...text.matchAll(/[A-Za-z][A-Za-z'-]*/g)];
  ms.forEach((m,idx)=>{
    const raw=m[0],before=text.slice(Math.max(0,m.index-3),m.index),start=idx===0||/[.!?]\\s*$/.test(before);
    if(!validWord(raw,!start)||shouldSkipForGrade(raw,g))return;
    const key=raw.toLowerCase(),old=state.map.get(key);
    if(old){old.frequency++;if(!old.example_en)old.example_en=sentenceFor(text,raw)}
    else{const known=existingWord(raw);state.map.set(key,{grade:g,semester:s,unit:state.unit,lesson:state.lesson,word_en:key,meaning_ar:known?.meaning_ar||'',example_en:sentenceFor(text,raw)||known?.example_en||'',example_ar:known?.example_ar||'',source_page:String(pi),source_name:sourceName,frequency:1,selected:true})}
  });
}
function drawLabCandidates(list,pagesRead,p,r){
  window.__jCandidates=list;
  p.innerHTML='<div class="j-stats"><div class="j-stat">'+pagesRead+' صفحة/صورة</div><div class="j-stat">'+list.length+' كلمة مرشحة</div><div class="j-stat">✓ محفوظ تلقائيًا</div></div>';
  r.innerHTML='<div class="j-toolbar"><button id="saveCand" class="j-btn green">اعتماد الكلمات</button><button id="allCand" class="j-btn secondary">تحديد/إلغاء الكل</button></div>'+list.map((w,i)=>'<div class="j-word"><input class="j-check cand" data-i="'+i+'" type="checkbox" '+(w.selected===false?'':'checked')+'><div><div class="j-word-en">'+esc(w.word_en)+' <button class="j-btn light j-speak" data-speak="'+esc(w.word_en)+'">🔊</button></div><input class="j-input cm" data-i="'+i+'" placeholder="المعنى العربي" value="'+esc(w.meaning_ar)+'"><textarea class="j-textarea ce" data-i="'+i+'" placeholder="الجملة الإنجليزية">'+esc(w.example_en)+'</textarea><textarea class="j-textarea ca" data-i="'+i+'" placeholder="ترجمة الجملة">'+esc(w.example_ar)+'</textarea><div class="j-meta">'+esc([w.unit,w.lesson,'ص '+w.source_page,'تكرار '+w.frequency].filter(Boolean).join(' • '))+'</div></div><button class="j-btn light j-speak" data-speak="'+esc(w.example_en)+'">🎧</button></div>').join('');
  bindSpeak();
  const autosave=()=>saveLabDraft({kind:'restored',grade:ROOT.querySelector('#bg')?.value||'1',semester:ROOT.querySelector('#bs')?.value||'الفصل الأول',pages:pagesRead,items:list,phase:'editing'});
  r.querySelectorAll('.cm').forEach(x=>x.oninput=()=>{list[+x.dataset.i].meaning_ar=x.value;autosave()});
  r.querySelectorAll('.ce').forEach(x=>x.oninput=()=>{list[+x.dataset.i].example_en=x.value;autosave()});
  r.querySelectorAll('.ca').forEach(x=>x.oninput=()=>{list[+x.dataset.i].example_ar=x.value;autosave()});
  r.querySelectorAll('.cand').forEach(x=>x.onchange=()=>{list[+x.dataset.i].selected=x.checked;autosave()});
  r.querySelector('#allCand').onclick=()=>{const on=list.some(x=>!x.selected);list.forEach(x=>x.selected=on);r.querySelectorAll('.cand').forEach(x=>x.checked=on);autosave()};
  r.querySelector('#saveCand').onclick=()=>saveCandidates(list);
}
async function enrichLabCandidates(list,meta,p,r){
  if(!list.length)return;
  await mapBatches(list,async c=>{if(c.meaning_ar&&c.example_en&&c.example_ar)return;const x=await enrichVocabulary(c.word_en,c.example_en);if(!c.meaning_ar)c.meaning_ar=x.meaning;if(!c.example_en)c.example_en=x.example;if(!c.example_ar)c.example_ar=x.exampleAr},async(done,total)=>{
    await saveLabDraft({...meta,items:list,phase:'enriching'});
    p.innerHTML='<div class="j-progress"><div style="width:'+(60+Math.round(done/Math.max(1,total)*40))+'%"></div></div><p>إكمال المعاني والجمل '+done+' من '+total+' • تم الحفظ</p>';
  });
  await saveLabDraft({...meta,items:list,phase:'ready'});
  drawLabCandidates(list,meta.pages||1,p,r);
}
'''
s=s[:end]+extra+s[end:]

start=s.find("function bookLab(){")
end=s.find("\\nfunction saveCandidates",start)
if start<0 or end<0:
    raise SystemExit('booklab block missing')
replacement=r'''function bookLab(){shell('<div class="j-top"><div><h1 class="j-title">استوديو AI للكتاب</h1><p class="j-sub">PDF أو كاميرا أو صور • استخراج النص والكلمات مع حفظ تلقائي</p></div></div><div class="j-panel"><div class="j-row"><select id="bg" class="j-select">'+G.map(g=>'<option value="'+g+'">الصف '+g+'</option>').join('')+'</select><select id="bs" class="j-select"><option>الفصل الأول</option><option>الفصل الثاني</option></select></div><input id="bf" type="file" accept="application/pdf" hidden><input id="bimg" type="file" accept="image/*" multiple hidden><input id="bcam" type="file" accept="image/*" capture="environment" hidden><div class="j-toolbar"><button id="bpdf" class="j-btn">📄 PDF</button><button id="bcamera" class="j-btn secondary">📷 تصوير مباشر</button><button id="bimages" class="j-btn secondary">🖼️ تحميل صور</button><button id="brestore" class="j-btn light">↩️ استعادة آخر عمل</button></div><div class="j-note">يتم الحفظ تلقائيًا بعد كل صفحة أو صورة وبعد كل دفعة ترجمة. OCR للصور يعمل على الجهاز داخل المتصفح؛ أول استخدام قد يحتاج تنزيل محرك OCR.</div><div id="bp" style="margin-top:12px"></div><div id="br" class="j-results" style="margin-top:14px"></div></div>');const pdf=ROOT.querySelector('#bf'),img=ROOT.querySelector('#bimg'),cam=ROOT.querySelector('#bcam');ROOT.querySelector('#bpdf').onclick=()=>pdf.click();ROOT.querySelector('#bimages').onclick=()=>img.click();ROOT.querySelector('#bcamera').onclick=()=>cam.click();pdf.onchange=()=>analyzeBook('pdf',pdf.files);img.onchange=()=>analyzeBook('images',img.files);cam.onchange=()=>analyzeBook('camera',cam.files);ROOT.querySelector('#brestore').onclick=restoreLabDraft}
async function restoreLabDraft(){const p=ROOT.querySelector('#bp'),r=ROOT.querySelector('#br'),saved=await loadLabDraft();if(!saved){p.innerHTML='<div class="j-note">لا يوجد عمل محفوظ للاستعادة.</div>';return}const list=Array.isArray(saved.items)?saved.items:[];if(ROOT.querySelector('#bg')&&saved.grade)ROOT.querySelector('#bg').value=String(saved.grade);if(ROOT.querySelector('#bs')&&saved.semester)ROOT.querySelector('#bs').value=String(saved.semester);drawLabCandidates(list,Number(saved.pages||0),p,r);const pending=list.filter(x=>!x.meaning_ar||!x.example_en||!x.example_ar);if(pending.length){p.innerHTML='<div class="j-note">تمت الاستعادة. بقي '+pending.length+' عنصرًا يحتاج إكمالًا.</div><button id="labResumeEnrich" class="j-btn">أكمل المعاني والترجمة</button>';ROOT.querySelector('#labResumeEnrich').onclick=()=>enrichLabCandidates(list,{...saved,pages:Number(saved.pages||0)},p,r)}}
async function analyzeBook(kind,files){const g=ROOT.querySelector('#bg').value,s=ROOT.querySelector('#bs').value,p=ROOT.querySelector('#bp'),r=ROOT.querySelector('#br'),arr=[...(files||[])];if(!arr.length){alert('اختر ملفًا أولًا');return}r.innerHTML='';p.innerHTML='<div class="j-progress"><div style="width:5%"></div></div><p>جاري استخراج النص...</p>';try{const first=arr[0],key=kind==='pdf'?labSourceKey(first,kind,g,s):kind+':'+Date.now()+':'+g+':'+s,saved=kind==='pdf'?await loadLabDraft():null,state={map:new Map(),unit:'',lesson:''};let pagesRead=0,startPage=1;if(saved&&saved.sourceKey===key){for(const x of Array.isArray(saved.items)?saved.items:[])state.map.set(String(x.word_en||'').toLowerCase(),x);pagesRead=Number(saved.pages||0);startPage=pagesRead+1;p.innerHTML='<div class="j-note">تم العثور على تقدم سابق حتى الصفحة '+pagesRead+'. سيتم الاستكمال.</div>'}if(kind==='pdf'){await extractPdf(first,async(text,pi,total)=>{if(pi<startPage)return;addLabText(text,pi,first.name,g,s,state);pagesRead=pi;const list=[...state.map.values()];await saveLabDraft({sourceKey:key,kind,grade:g,semester:s,pages:pi,totalPages:total,items:list,phase:'reading'});p.innerHTML='<div class="j-progress"><div style="width:'+Math.round(pi/total*60)+'%"></div></div><p>قراءة الصفحة '+pi+' من '+total+' • '+list.length+' كلمة • تم الحفظ</p>'})}else{for(let i=0;i<arr.length;i++){const f=arr[i];const text=await ocrImage(f,progress=>{p.innerHTML='<div class="j-progress"><div style="width:'+Math.round(((i+progress)/arr.length)*60)+'%"></div></div><p>OCR للصورة '+(i+1)+' من '+arr.length+' • '+Math.round(progress*100)+'%</p>'});addLabText(text,i+1,f.name,g,s,state);pagesRead=i+1;const list=[...state.map.values()];await saveLabDraft({sourceKey:key,kind,grade:g,semester:s,pages:pagesRead,totalPages:arr.length,items:list,phase:'ocr'});p.innerHTML='<p>تمت قراءة الصورة '+pagesRead+' من '+arr.length+' • '+list.length+' كلمة • تم الحفظ</p>'}}const list=[...state.map.values()];if(!list.length){p.innerHTML='<div class="j-note">تمت القراءة لكن لم يتم العثور على كلمات مناسبة بعد التصفية.</div>';return}await enrichLabCandidates(list,{sourceKey:key,kind,grade:g,semester:s,pages:pagesRead,items:list},p,r)}catch(e){console.error(e);p.innerHTML='<div class="j-note">توقف العمل مؤقتًا، لكن ما تم إنجازه محفوظ ويمكن استعادته. '+esc(e.message||e)+'</div>'}}
'''
s=s[:start]+replacement+s[end:]

# Clear draft after successful adoption.
s=s.replace("function saveCandidates(list){const chosen=", "function saveCandidates(list){const chosen=",1)
s=s.replace("save();alert(\`تم الحفظ.", "save();clearLabDraft();alert(\`تم الحفظ.",1)

JS.write_text(s,encoding='utf-8')

idx=INDEX.read_text(encoding='utf-8')
idx=idx.replace('manifest.webmanifest?v=357','manifest.webmanifest?v=358').replace('jordan-pwa.css?v=357','jordan-pwa.css?v=358').replace('easy-english-v345-patch.css?v=357','easy-english-v345-patch.css?v=358').replace('jordan-pwa.js?v=357','jordan-pwa.js?v=358').replace('sw.js?v=357-book-library-1','sw.js?v=358-camera-ocr-autosave-1')
INDEX.write_text(idx,encoding='utf-8')

sw=SW.read_text(encoding='utf-8')
sw=sw.replace('easy-english-ai-pwa-v357-book-library','easy-english-ai-pwa-v358-camera-ocr-autosave').replace('jordan-pwa.css?v=357','jordan-pwa.css?v=358').replace('easy-english-v345-patch.css?v=357','easy-english-v345-patch.css?v=358').replace('jordan-pwa.js?v=357','jordan-pwa.js?v=358').replace('manifest.webmanifest?v=357','manifest.webmanifest?v=358')
SW.write_text(sw,encoding='utf-8')
