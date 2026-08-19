(()=>{
'use strict';
const BAD_SENTENCE=/[\uFFFD\u25A1\u25AF\u2610\u2611\u2612]/;
const VALID_UNIT=/^Unit\s+\d+[A-Za-z]?$/i;
const VALID_LESSON=/^Lesson\s+\d+[A-Za-z]?$/i;

function cleanSentence(value){
  let s=String(value||'').replace(/\s+/g,' ').trim();
  if(!s)return '';
  if(BAD_SENTENCE.test(s))return '';
  s=s.replace(/\s+([,.!?;:])/g,'$1').replace(/([,.!?;:])(?=[A-Za-z])/g,'$1 ');
  if(s.length<18||s.length>190)return '';
  const letters=(s.match(/[A-Za-z]/g)||[]).length;
  if(letters/Math.max(1,s.length)<0.62)return '';
  return s;
}
function cleanScope(c){
  if(c.unit&&!VALID_UNIT.test(String(c.unit).trim()))c.unit='';
  if(c.lesson&&!VALID_LESSON.test(String(c.lesson).trim()))c.lesson='';
  c.example_en=cleanSentence(c.example_en);
  if(!c.example_en)c.example_ar='';
}
function addEmptySentenceNote(card,english,arabic){
  if(card.querySelector('.j-no-sentence'))return;
  const note=document.createElement('button');
  note.type='button';
  note.className='j-no-sentence';
  note.textContent='لا توجد جملة موثوقة من الكتاب — اضغط لإضافتها يدويًا';
  note.onclick=()=>{
    note.remove();
    english.style.display='';
    arabic.style.display='';
    english.focus();
  };
  english.before(note);
}
function patchCandidates(){
  const list=window.__jCandidates;
  if(!Array.isArray(list)||!list.length)return;
  list.forEach(cleanScope);
  const result=document.querySelector('#br');
  if(!result)return;
  const cards=[...result.querySelectorAll('.j-word')];
  cards.forEach((card,i)=>{
    const c=list[i];
    if(!c)return;
    const en=card.querySelector('textarea.ce');
    const ar=card.querySelector('textarea.ca');
    const meta=card.querySelector('.j-meta');
    const sentenceSpeak=[...card.querySelectorAll('.j-speak')].at(-1);
    if(en){
      if(en.value!==c.example_en)en.value=c.example_en||'';
      en.oninput=()=>{c.example_en=cleanSentence(en.value)||en.value.trim();};
    }
    if(ar){
      if(!c.example_en){ar.value='';c.example_ar='';}
      ar.oninput=()=>{c.example_ar=ar.value.trim();};
    }
    if(!c.example_en&&en&&ar){
      en.style.display='none';
      ar.style.display='none';
      addEmptySentenceNote(card,en,ar);
      if(sentenceSpeak)sentenceSpeak.style.display='none';
    }else if(sentenceSpeak){
      sentenceSpeak.dataset.speak=c.example_en;
    }
    if(meta){
      meta.textContent=[c.unit,c.lesson,c.source_page&&`ص ${c.source_page}`,c.frequency&&`تكرار ${c.frequency}`].filter(Boolean).join(' • ');
    }
  });
}
let lastList=null;
const observer=new MutationObserver(()=>{
  if(window.__jCandidates!==lastList){lastList=window.__jCandidates;setTimeout(patchCandidates,0)}
  else if(Array.isArray(window.__jCandidates))setTimeout(patchCandidates,0);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(Array.isArray(window.__jCandidates))patchCandidates()},1200);
})();
