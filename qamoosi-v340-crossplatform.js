// Qamoosi AI v3.4 cross-platform enhancements for iPhone + desktop PWA.
(function(){
  'use strict';

  const STUDIED_KEY='qamoosi_v340_studied_words';
  const WRONG_KEY='qamoosi_v340_wrong_words';
  let voicesReady=false;

  function clean(v){return String(v||'').replace(/🔊/g,'').replace(/\s+/g,' ').trim();}
  function load(key){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(_){return[]}}
  function save(key,v){localStorage.setItem(key,JSON.stringify(v));}

  function warmVoices(){
    if(!('speechSynthesis' in window)) return;
    const check=()=>{const vs=window.speechSynthesis.getVoices();if(vs&&vs.length)voicesReady=true;};
    check();
    window.speechSynthesis.addEventListener?.('voiceschanged',check,{once:false});
  }

  function speak(text){
    if(!('speechSynthesis' in window)||!text) return;
    const run=()=>{
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.lang=/[\u0600-\u06ff]/.test(text)?'ar-SA':'en-US';
      u.rate=.88;u.pitch=1;
      const voices=window.speechSynthesis.getVoices();
      const wanted=voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith(u.lang.slice(0,2).toLowerCase()));
      if(wanted)u.voice=wanted;
      window.speechSynthesis.speak(u);
    };
    if(voicesReady){run();return;}
    warmVoices();
    setTimeout(run,90);
  }

  function recordStudied(word){
    word=clean(word);if(!word||word.split(' ').length>5)return;
    const arr=load(STUDIED_KEY);
    const idx=arr.findIndex(x=>String(x.word).toLowerCase()===word.toLowerCase());
    const item={word,lastOpened:Date.now()};
    if(idx>=0){arr[idx]={...arr[idx],...item,count:(arr[idx].count||1)+1}}else arr.push({...item,count:1});
    save(STUDIED_KEY,arr.slice(-1000));
  }

  function recordWrong(el){
    if(!el||!el.dataset)return;
    const chosen=clean(el.dataset.answer||el.textContent);
    const real=clean(el.dataset.real||'');
    if(!real||chosen===real)return;
    const id=String(el.dataset.id||real);
    const arr=load(WRONG_KEY);
    const idx=arr.findIndex(x=>String(x.id)===id);
    if(idx>=0){arr[idx].count=(arr[idx].count||1)+1;arr[idx].last=Date.now();arr[idx].answer=real;}
    else arr.push({id,answer:real,count:1,last:Date.now()});
    save(WRONG_KEY,arr.slice(-500));
  }

  function isLearningPage(){
    const t=clean(document.querySelector('.title')?.textContent||document.title);
    return /البطاقات|بطاقات|التعل(?:ي|ّ)م/.test(t)&&!!document.querySelector('.card [data-speak],.card .word');
  }

  function applyPageClass(){document.body.classList.toggle('q340-learning-screen',isLearningPage());}

  function enhanceStudyBadge(){
    const card=document.querySelector('.card');
    if(!card||card.querySelector('[data-q340-studied]'))return;
    if(!isLearningPage())return;
    const n=load(STUDIED_KEY).length;
    const badge=document.createElement('span');
    badge.className='chip';badge.dataset.q340Studied='1';badge.textContent=`مدروسة على الجهاز: ${n}`;
    const row=card.querySelector('.row');
    if(row)row.insertAdjacentElement('beforeend',badge);
  }

  function addWrongReviewSummary(){
    const title=clean(document.querySelector('.title')?.textContent||'');
    if(!title.includes('نتيجة الاختبار'))return;
    const card=document.querySelector('.card');
    if(!card||card.querySelector('[data-q340-wrong-summary]'))return;
    const wrong=load(WRONG_KEY).sort((a,b)=>(b.count||0)-(a.count||0));
    if(!wrong.length)return;
    const box=document.createElement('div');
    box.dataset.q340WrongSummary='1';box.className='v2-quiz-review';
    const top=wrong.slice(0,8).map(x=>clean(x.answer)).filter(Boolean).join(' • ');
    box.innerHTML=`<p><b>كلمات تحتاج تدريب:</b> ${wrong.length}</p><p class="small muted">${top}</p><button class="btn amber" type="button" data-go="hard">تدرّب على أخطائي</button>`;
    card.appendChild(box);
  }

  function addQuizModeHint(){
    const title=clean(document.querySelector('.title')?.textContent||'');
    if(!title.includes('اختبار')||title.includes('نتيجة'))return;
    const card=document.querySelector('.card');
    if(!card||card.querySelector('[data-q340-quiz-note]'))return;
    const note=document.createElement('div');
    note.dataset.q340QuizNote='1';note.className='chip';
    note.style.cssText='display:block;margin-bottom:8px;text-align:center;white-space:normal';
    note.textContent='يمكنك الاختبار عشوائيًا أو حسب الصف/الوحدة، ومراجعة الكلمات التي أخطأت بها بعد الانتهاء.';
    card.insertAdjacentElement('afterbegin',note);
  }

  function enhance(){applyPageClass();enhanceStudyBadge();addWrongReviewSummary();addQuizModeHint();}

  document.addEventListener('click',function(e){
    const sp=e.target.closest?.('[data-speak]');
    if(sp){
      const text=clean(sp.dataset.speak||sp.textContent);
      if(text){
        e.preventDefault();e.stopImmediatePropagation();
        speak(text);
        const card=sp.closest('.card');
        const word=clean(card?.querySelector('.word')?.textContent||sp.dataset.speak||'');
        if(word)recordStudied(word);
        setTimeout(enhanceStudyBadge,50);
        return;
      }
    }
    const answer=e.target.closest?.('[data-answer]');
    if(answer)recordWrong(answer);
    const move=e.target.closest?.('[data-card],[data-master],[data-toggle-next]');
    if(move)setTimeout(()=>{const w=clean(document.querySelector('.card .word')?.textContent||'');if(w)recordStudied(w);},120);
  },true);

  const observer=new MutationObserver(()=>window.requestAnimationFrame(enhance));
  window.addEventListener('DOMContentLoaded',function(){warmVoices();const app=document.getElementById('app');if(app)observer.observe(app,{childList:true,subtree:true});enhance();});
  window.addEventListener('resize',applyPageClass,{passive:true});
})();
