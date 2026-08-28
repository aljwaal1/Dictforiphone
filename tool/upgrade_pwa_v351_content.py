from pathlib import Path
import json,re

root=Path('jordan')
words_path=root/'assets/data/words.json'
app_path=root/'app.js'
pwa_path=root/'jordan-pwa.js'
index_path=root/'index.html'
sw_path=root/'sw.js'

data=json.loads(words_path.read_text(encoding='utf-8'))
data['version']=4
data['app']='Easy English AI'
words=data.get('words',[])
for w in words:
    if str(w.get('grade','')).upper()=='KG':
        w['grade']='1'
        if not str(w.get('semester','')).strip(): w['semester']='تمهيدي'
    if w.get('source')=='Jordanian curriculum starter set': w['source']='Easy English AI core vocabulary'
    if w.get('source_name')=='Jordanian curriculum starter set': w['source_name']='Easy English AI core vocabulary'
words_path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
compact=json.dumps(data,ensure_ascii=False,separators=(',',':'))

app=app_path.read_text(encoding='utf-8')
app=app.replace("const STORE = 'qamoosi_school_pwa_v2';", "const STORE = 'easy_english_ai_pwa_v3';\nconst LEGACY_STORE = 'qamoosi_school_pwa_v2';")
app=re.sub(r"const FALLBACK_DATA = .*?;\n", 'const FALLBACK_DATA = '+compact+';\n', app, count=1, flags=re.S)
old="function loadState(){ try { return JSON.parse(localStorage.getItem(STORE)) || baseState(); } catch(e){ return baseState(); } }"
new="function loadState(){ try { const current=localStorage.getItem(STORE); const legacy=localStorage.getItem(LEGACY_STORE); const parsed=JSON.parse(current||legacy||'null')||baseState(); if(!current&&legacy) localStorage.setItem(STORE,JSON.stringify(parsed)); return parsed; } catch(e){ return baseState(); } }"
if old in app: app=app.replace(old,new)
elif 'const LEGACY_STORE' not in app: raise SystemExit('app.js loadState signature not found')
app=app.replace('قاموسي المدرسي','Easy English AI').replace('المنهاج الأردني','تعلم الإنجليزية بسهولة')
app=app.replace('subject=Easy English AI','subject=Easy%20English%20AI')
app_path.write_text(app,encoding='utf-8')

pwa=pwa_path.read_text(encoding='utf-8')
if "const KEY='jordan_school_dictionary_pwa_v1';" in pwa:
    pwa=pwa.replace("const KEY='jordan_school_dictionary_pwa_v1';", "const KEY='easy_english_ai_pwa_v3';const LEGACY_KEYS=['jordan_school_dictionary_pwa_v1','qamoosi_school_pwa_v2'];")
old_load=re.search(r"function load\(\)\{.*?\}\nfunction speak",pwa,re.S)
if old_load:
    new_load="""async function load(){
  const normalize=(list)=>list.map((w,i)=>({id:w.id||i+1,grade:String(String(w.grade||'')==='KG'?'1':(w.grade||'')),semester:String(w.grade||'')==='KG'?(w.semester||'تمهيدي'):(w.semester||''),unit:w.unit||'',lesson:w.lesson||'',word_en:w.word_en||w.en||w.word||'',meaning_ar:w.meaning_ar||w.ar||w.meaning||'',example_en:w.example_en||w.sentence_en||w.exampleEn||'',example_ar:w.example_ar||w.sentence_ar||w.exampleAr||'',source_page:w.source_page||'',source_name:w.source_name||w.source||''})).filter(w=>w.word_en);
  try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&Array.isArray(x.words))db=x}catch(e){}
  if(!db.words.length){for(const k of LEGACY_KEYS){try{const old=JSON.parse(localStorage.getItem(k)||'null');const list=old?.words||old?.data?.words;if(Array.isArray(list)&&list.length){db.words=normalize(list);save();break}}catch(e){}}}
  if(!db.words.length){try{const r=await fetch('assets/data/words.json?v=351',{cache:'no-cache'});if(!r.ok)throw new Error('content load failed');const bundled=await r.json();const list=Array.isArray(bundled?.words)?bundled.words:[];db={...db,version:bundled.version||4,words:normalize(list)};save()}catch(e){console.error('Easy English AI bundled content unavailable',e)}}
}
function speak"""
    pwa=pwa[:old_load.start()]+new_load+pwa[old_load.end():]
elif "async function load()" not in pwa: raise SystemExit('jordan-pwa load() block not found')
if 'load();setTimeout(render,0);' in pwa: pwa=pwa.replace('load();setTimeout(render,0);',"load().then(render).catch(()=>render());",1)
elif 'load();render();' in pwa: pwa=pwa.replace('load();render();',"load().then(render).catch(()=>render());",1)
elif 'load().then(render)' not in pwa: raise SystemExit('PWA startup load/render signature not found')
pwa_path.write_text(pwa,encoding='utf-8')

index=index_path.read_text(encoding='utf-8').replace('?v=350','?v=351')
index_path.write_text(index,encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')
sw=re.sub(r"const CACHE='easy-english-ai-pwa-v350[^']*';", "const CACHE='easy-english-ai-pwa-v351-content';", sw, count=1)
sw=sw.replace('?v=350','?v=351')
sw_path.write_text(sw,encoding='utf-8')

print('v351 content cleanup applied:',len(words),'bundled words')