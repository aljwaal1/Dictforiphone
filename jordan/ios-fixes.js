// iPhone PWA final fixes: louder/robust speech, explicit card controls, previous navigation, live refresh.
(function(){
  'use strict';
  const HISTORY_KEY='qamoosi_ios_card_history_v1';
  let voices=[];
  let currentWord='';

  function clean(v){return String(v||'').replace(/🔊/g,'').replace(/\s+/g,' ').trim();}
  function loadVoices(){voices=window.speechSynthesis?.getVoices?.()||[];}
  loadVoices();
  if(window.speechSynthesis) window.speechSynthesis.onvoiceschanged=loadVoices;

  function bestEnglishVoice(){
    loadVoices();
    return voices.find(v=>/^en-(US|GB)/i.test(v.lang)&&/Samantha|Daniel|Karen|Moira|Tessa|Google|Microsoft/i.test(v.name))
      || voices.find(v=>/^en-US/i.test(v.lang))
      || voices.find(v=>/^en/i.test(v.lang))
      || null;
  }

  function speak(text){
    const value=clean(text);
    if(!value||!window.speechSynthesis) return false;
    try{
      window.speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(value);
      u.lang='en-US';
      u.rate=0.82;
      u.pitch=1.0;
      u.volume=1.0;
      const voice=bestEnglishVoice();
      if(voice) u.voice=voice;
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(u);
      setTimeout(()=>window.speechSynthesis.resume(),120);
      return true;
    }catch(_){return false;}
  }

  function activeCard(){return Array.from(document.querySelectorAll('.card')).find(c=>c.querySelector('[data-speak]'));}
  function activeWord(){const c=activeCard(); const b=c?.querySelector('[data-speak]'); return clean(b?.dataset?.speak||b?.textContent||'');}
  function readHistory(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch(_){return []}}
  function saveHistory(list){localStorage.setItem(HISTORY_KEY,JSON.stringify(list.slice(-300)));}
  function rememberCurrent(){
    const word=activeWord();
    if(!word||word===currentWord) return;
    currentWord=word;
    const list=readHistory();
    if(list[list.length-1]!==word){list.push(word);saveHistory(list);}
  }

  function goPrevious(){
    const list=readHistory();
    const now=activeWord();
    while(list.length&&list[list.length-1]===now) list.pop();
    const target=list.pop();
    saveHistory(list);
    if(!target) return;
    const next=document.querySelector('[data-card="next"]');
    if(!next) return;
    let tries=0;
    const seek=()=>{
      if(clean(activeWord()).toLowerCase()===clean(target).toLowerCase()) return;
      if(tries++>250) return;
      next.click();
      setTimeout(seek,30);
    };
    seek();
  }

  function enhanceCard(){
    const card=activeCard();
    if(!card) return;
    rememberCurrent();
    const originalSpeak=card.querySelector('[data-speak]');
    if(originalSpeak&&!card.querySelector('[data-ios-pronounce]')){
      originalSpeak.setAttribute('data-ios-pronounce','1');
      if(!/لفظ|استمع/.test(originalSpeak.textContent||'')) originalSpeak.textContent='🔊 لفظ الكلمة';
    }
    const next=card.querySelector('[data-card="next"]');
    if(next&&!card.querySelector('[data-ios-prev]')){
      const prev=document.createElement('button');
      prev.type='button'; prev.className='btn alt'; prev.dataset.iosPrev='1'; prev.textContent='السابق';
      next.parentElement?.insertBefore(prev,next);
    }
    const toggle=card.querySelector('[data-toggle-next]');
    if(toggle) toggle.textContent='👁 إظهار المعنى';
  }

  document.addEventListener('click',e=>{
    const sp=e.target.closest('[data-speak]');
    if(sp){
      e.preventDefault(); e.stopImmediatePropagation();
      const ok=speak(sp.dataset.speak||sp.textContent);
      if(!ok) alert('تعذر تشغيل النطق. تأكد من رفع صوت الوسائط في الآيفون.');
      return;
    }
    if(e.target.closest('[data-ios-prev]')){e.preventDefault();goPrevious();return;}
    if(e.target.closest('[data-card="next"],[data-master]')) setTimeout(rememberCurrent,120);
  },true);

  window.addEventListener('qamoosi-data-imported',()=>location.reload());
  const observer=new MutationObserver(()=>requestAnimationFrame(enhanceCard));
  window.addEventListener('DOMContentLoaded',()=>{
    const app=document.getElementById('app');
    if(app) observer.observe(app,{childList:true,subtree:true});
    enhanceCard();
  });
})();
