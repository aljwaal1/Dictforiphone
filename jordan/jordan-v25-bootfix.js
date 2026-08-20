(()=>{
'use strict';
const VERSION='v25';
function addBadge(){
  const title=document.querySelector('.j-title');
  if(title&&!document.getElementById('jv25badge')){
    const b=document.createElement('span');
    b.id='jv25badge';
    b.textContent=' v25';
    b.style.cssText='font-size:12px;background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:999px;margin-inline-start:8px;vertical-align:middle';
    title.appendChild(b);
  }
}
new MutationObserver(addBadge).observe(document.documentElement,{subtree:true,childList:true});
addBadge();

document.addEventListener('click',e=>{
  const oldSave=e.target.closest('#saveCand');
  if(oldSave&&Array.isArray(window.__jCandidates)){
    const list=window.__jCandidates;
    if(!list.some(x=>x.selected&&String(x.meaning||x.meaning_ar||'').trim())){
      list.forEach(x=>{if(String(x.meaning||x.meaning_ar||'').trim())x.selected=true});
      document.querySelectorAll('.cand').forEach((cb,i)=>{const x=list[i];if(x&&String(x.meaning||x.meaning_ar||'').trim())cb.checked=true});
    }
  }
},true);

window.__JORDAN_PWA_VERSION__=VERSION;
})();
