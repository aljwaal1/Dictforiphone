(()=>{
'use strict';
const ROOT=document.getElementById('app');
if(!ROOT)return;
const MAP=[
  ['القاموس المدرسي الأردني','Easy English AI'],
  ['القاموس الأردني','Easy English AI'],
  ['البحث الذكي','AI بحث'],
  ['المنهاج','الصفوف'],
  ['التعلم والمراجعة','تدريب'],
  ['التعلم','تدريب'],
  ['مختبر الكتاب','استوديو AI للكتاب'],
  ['أدوات القاموس','أدوات Easy English AI'],
  ['قاموس + منهاج + مختبر كتاب','AI بحث + صفوف + تدريب + استوديو AI للكتاب']
];
function replaceText(t){
  let out=String(t||'');
  for(const [a,b] of MAP) out=out.replaceAll(a,b);
  out=out.replace(/🇯🇴/g,'').replace(/\bv25\b/gi,'AI');
  return out.replace(/\s{2,}/g,' ').trim();
}
function navLabels(){
  document.querySelectorAll('.j-nav button').forEach(b=>{
    const p=b.dataset.page;
    const map={home:['🏠','الرئيسية'],search:['🔎','AI بحث'],curriculum:['📚','الصفوف'],learn:['🎯','تدريب'],more:['✨','المزيد']};
    if(map[p]) b.innerHTML=`<span class="ee-nav-ico">${map[p][0]}</span><span>${map[p][1]}</span>`;
  });
}
function refineHome(){
  const title=document.querySelector('.j-title');
  if(title&&/Easy English AI|القاموس/.test(title.textContent||'')) title.textContent='Easy English AI';
  document.querySelectorAll('.j-badge').forEach(b=>{b.textContent='تعلم الإنجليزية بسهولة';});
  document.querySelectorAll('.j-card h3').forEach(h=>{h.textContent=replaceText(h.textContent);});
  document.querySelectorAll('.j-card p,.j-sub').forEach(p=>{p.textContent=replaceText(p.textContent);});
}
function polish(root=document){
  document.title='Easy English AI';
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content','Easy English AI');
  root.querySelectorAll?.('.j-title,h1,h2,h3,p,small,.j-badge').forEach(el=>{
    if(el.children.length)return;
    const t=replaceText(el.textContent);
    if(t!==el.textContent)el.textContent=t;
  });
  navLabels();
  refineHome();
  document.body.classList.add('easy-english-live');
}
let queued=false;
const schedule=()=>{
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;polish(document);});
};
const obs=new MutationObserver(muts=>{
  if(muts.some(m=>m.addedNodes&&m.addedNodes.length)) schedule();
});
obs.observe(ROOT,{childList:true,subtree:true});
window.addEventListener('load',schedule,{once:true});
polish(document);
})();
