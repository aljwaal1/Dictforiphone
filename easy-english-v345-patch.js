(()=>{
'use strict';
const DONE='data-ee346';
let scheduled=false;
function cleanText(s=''){return String(s).replace(/\s+/g,' ').trim();}
function renameUi(root=document){
  const map=new Map([
    ['البحث الذكي','AI بحث'],['المنهاج','الصفوف والمفردات'],['التعلم والمراجعة','تدريب'],['التعلم','تدريب'],
    ['مختبر الكتاب AI','استوديو AI للكتاب'],['مختبر الكتاب','استوديو AI للكتاب'],
    ['القاموس المدرسي الأردني','Easy English AI'],['القاموس الأردني','Easy English AI'],['قاموسي AI','Easy English AI']
  ]);
  root.querySelectorAll?.('.j-title,h1,h2,h3,p,small,button').forEach(el=>{
    if(el.matches('.ee-suggest-sentence'))return;
    if(el.children.length&&!el.matches('.j-nav button'))return;
    if(el.matches('.j-nav button')){
      const labels={home:'🏠<br>الرئيسية',search:'🔎<br>AI بحث',curriculum:'📚<br>الصفوف',learn:'🎯<br>تدريب',more:'✨<br>المزيد'};
      const label=labels[el.dataset.page]; if(label){el.innerHTML=label;return;}
    }
    let t=el.textContent||'';
    for(const [a,b] of map)t=t.replaceAll(a,b);
    if(t!==el.textContent)el.textContent=t;
  });
  document.title='Easy English AI';
  document.body.classList.add('ee-polished');
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content','Easy English AI');
}
async function fetchJson(url,timeout=5000){
  const c=new AbortController(),id=setTimeout(()=>c.abort(),timeout);
  try{const r=await fetch(url,{cache:'no-store',signal:c.signal});if(!r.ok)return null;return await r.json();}catch(e){return null;}finally{clearTimeout(id);}
}
async function tatoeba(word){
  const j=await fetchJson('https://tatoeba.org/en/api_v0/search?from=eng&query='+encodeURIComponent(word)+'&sort=relevance');
  const re=new RegExp('\\b'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  for(const x of j?.results||[]){const s=cleanText(x?.text||'');if(s.length>=18&&s.length<=180&&re.test(s))return s;}return'';
}
async function dictionaryExample(word){
  const j=await fetchJson('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(word));
  const re=new RegExp('\\b'+word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i');
  for(const e of j||[])for(const m of e.meanings||[])for(const d of m.definitions||[]){const s=cleanText(d.example||'');if(s.length>=12&&s.length<=180&&re.test(s))return s;}return'';
}
function generatedSentence(word){
  const w=cleanText(word).toLowerCase();
  const variants=[`We learned the word "${w}" in our English lesson today.`,`The teacher used "${w}" in a clear sentence during class.`,`I found the word "${w}" while reading my English book.`,`Can you use the word "${w}" in a new sentence?`];
  let h=0;for(const ch of w)h=(h*31+ch.charCodeAt(0))>>>0;return variants[h%variants.length];
}
async function suggestSentence(word){return await tatoeba(word)||await dictionaryExample(word)||generatedSentence(word);}
async function translate(text){
  if(!text)return'';const j=await fetchJson('https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair=en|ar',6000);const t=cleanText(j?.responseData?.translatedText||'');return /[\u0600-\u06ff]/.test(t)?t:'';
}
function setField(el,value){if(!el||!value)return;el.value=value;el.textContent=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
function cardWord(card){return cleanText(card.querySelector('b,.ee-word-en,.j-word-en')?.textContent||'').replace(/[^A-Za-z'-]/g,'');}
function fields(card){const areas=[...card.querySelectorAll('textarea')],inputs=[...card.querySelectorAll('input[type="text"]')];return{example:areas[0]||null,arabic:areas[1]||null,meaning:inputs[0]||null};}
async function fillCard(card,force=false){
  if(card.dataset.ee346Busy)return;const word=cardWord(card),f=fields(card);if(!word||!f.example||(!force&&cleanText(f.example.value)))return;
  card.dataset.ee346Busy='1';try{const s=await suggestSentence(word);if(s)setField(f.example,s);if(f.arabic&&!cleanText(f.arabic.value)&&s){const ar=await translate(s);if(ar)setField(f.arabic,ar);}}finally{delete card.dataset.ee346Busy;}
}
function enhanceCandidate(card){
  if(card.hasAttribute(DONE))return;card.setAttribute(DONE,'1');const f=fields(card);if(!f.example)return;
  const b=document.createElement('button');b.type='button';b.className='j-btn light ee-suggest-sentence';b.textContent='✨ اقترح جملة جديدة';
  b.onclick=async()=>{if(b.disabled)return;b.disabled=true;const old=b.textContent;b.textContent='جاري اقتراح جملة…';await fillCard(card,true);b.textContent=old;b.disabled=false;};card.appendChild(b);
  if(!cleanText(f.example.value))setTimeout(()=>fillCard(card,false),120);
}
function enhance(root=document){
  renameUi(root);root.querySelectorAll?.('.ee-candidate').forEach(enhanceCandidate);
  root.querySelectorAll?.('.j-word,.j-card,.ee-candidate').forEach(x=>x.classList.add('ee-surface'));
}
function schedule(root=document){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;enhance(root);});}
const obs=new MutationObserver(records=>{
  for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1){schedule(n);return;}}}
});
obs.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('load',()=>schedule(document),{once:true});
setTimeout(()=>schedule(document),120);
})();
