// V2 learning enhancements for Qamoosi School PWA
// Adds example sentences, sentence pronunciation, sentence translation, and resume progress without rewriting the original app.
(function () {
  'use strict';

  const PROGRESS_KEY = 'qamoosi_v2_last_progress';
  const ENHANCED_ATTR = 'data-v2-enhanced';

  function cleanText(value) {
    return String(value || '')
      .replace(/🔊/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function gradeLabel() {
    const select = document.getElementById('gradeSelect');
    if (!select) return '';
    return select.options[select.selectedIndex]?.textContent || select.value || '';
  }

  function getWordFromCard(card) {
    const speakBtn = card.querySelector('[data-speak]');
    const word = cleanText(speakBtn?.dataset?.speak || speakBtn?.textContent || '');
    const meaning = cleanText(card.querySelector('.meaning')?.textContent || '');
    return { word, meaning };
  }

  function getActiveWord() {
    const activeCard = Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('[data-speak]'));
    return activeCard ? getWordFromCard(activeCard) : { word: '', meaning: '' };
  }

  function isVerb(ar) {
    return /^(ي|ت|أ|ن)/.test(String(ar || '').trim());
  }

  function makeExample(word, meaning) {
    const w = cleanText(word).toLowerCase();
    const m = cleanText(meaning);
    const startsWithVowel = /^[aeiou]/i.test(w);
    const article = startsWithVowel ? 'an' : 'a';

    const special = {
      apple: ['I eat an apple.', 'أنا آكل تفاحة.'],
      banana: ['I eat a banana.', 'أنا آكل موزة.'],
      orange: ['I eat an orange.', 'أنا آكل برتقالة.'],
      cat: ['The cat is small.', 'القطة صغيرة.'],
      dog: ['The dog is happy.', 'الكلب سعيد.'],
      bird: ['The bird can fly.', 'الطائر يستطيع الطيران.'],
      fish: ['The fish is in the water.', 'السمكة في الماء.'],
      sun: ['The sun is bright.', 'الشمس ساطعة.'],
      moon: ['The moon is in the sky.', 'القمر في السماء.'],
      book: ['This is my book.', 'هذا كتابي.'],
      pen: ['I have a pen.', 'لدي قلم.'],
      school: ['I go to school.', 'أنا أذهب إلى المدرسة.'],
      teacher: ['The teacher is kind.', 'المعلم لطيف.'],
      friend: ['My friend is here.', 'صديقي هنا.'],
      water: ['I drink water.', 'أنا أشرب الماء.'],
      milk: ['I drink milk.', 'أنا أشرب الحليب.'],
      car: ['The car is fast.', 'السيارة سريعة.'],
      bus: ['The bus is big.', 'الحافلة كبيرة.'],
      pencil: ['I write with a pencil.', 'أنا أكتب بقلم رصاص.'],
      notebook: ['My notebook is in my bag.', 'دفتري في حقيبتي.']
    };

    if (special[w]) return { sentence: special[w][0], translation: special[w][1] };
    if (w.includes(' ')) return { sentence: `I can say: ${w}.`, translation: `أستطيع أن أقول: ${m}.` };
    if (isVerb(m)) return { sentence: `I can ${w}.`, translation: `أنا أستطيع أن ${m}.` };
    return { sentence: `This is ${article} ${w}.`, translation: `هذا/هذه ${m}.` };
  }

  function enhanceCard(card) {
    if (!card || card.getAttribute(ENHANCED_ATTR) === '1') return;
    const { word, meaning } = getWordFromCard(card);
    if (!word || !meaning) return;

    const ex = makeExample(word, meaning);
    const block = document.createElement('div');
    block.className = 'v2-example';
    block.innerHTML = `
      <div class="v2-label">مثال</div>
      <div class="v2-sentence ltr">${escapeHtml(ex.sentence)}</div>
      <button class="btn alt v2-speak" data-speak="${escapeHtml(ex.sentence)}" type="button">🔊 استمع للجملة</button>
      <div class="v2-translation">${escapeHtml(ex.translation)}</div>
    `;

    const meaningEl = card.querySelector('.meaning');
    if (meaningEl) meaningEl.insertAdjacentElement('afterend', block);
    else card.appendChild(block);
    card.setAttribute(ENHANCED_ATTR, '1');
  }

  function saveProgress() {
    const title = cleanText(document.querySelector('.title')?.textContent || '');
    const select = document.getElementById('gradeSelect');
    const { word, meaning } = getActiveWord();
    if (!word) return;
    const activeCard = Array.from(document.querySelectorAll('.card')).find(card => card.querySelector('[data-speak]'));
    const chip = cleanText(activeCard?.querySelector('.chip')?.textContent || '');
    const progress = { title, grade: select?.value || '', gradeText: gradeLabel(), word, meaning, chip, savedAt: Date.now() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || 'null'); }
    catch (_) { return null; }
  }

  function addResumeTile() {
    const grid = document.querySelector('.grid');
    if (!grid || grid.querySelector('[data-v2-resume]')) return;
    const progress = readProgress();
    if (!progress?.word) return;
    const btn = document.createElement('button');
    btn.className = 'tile v2-resume-tile';
    btn.type = 'button';
    btn.setAttribute('data-v2-resume', '1');
    btn.innerHTML = `<div class="ico">▶️</div><b>تابع من آخر مكان</b><span>${escapeHtml(progress.word)} — ${escapeHtml(progress.meaning)}</span>`;
    grid.insertBefore(btn, grid.firstChild);
  }

  function trySetGrade(progress) {
    const select = document.getElementById('gradeSelect');
    if (!select || !progress?.grade) return;
    if (select.value !== progress.grade) {
      select.value = progress.grade;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function seekSavedWord(progress, triesLeft) {
    if (!progress?.word || triesLeft <= 0) return;
    const current = getActiveWord();
    if (cleanText(current.word).toLowerCase() === cleanText(progress.word).toLowerCase()) {
      saveProgress();
      return;
    }
    const next = document.querySelector('[data-card="next"]');
    if (!next) return;
    next.click();
    setTimeout(function () { seekSavedWord(progress, triesLeft - 1); }, 45);
  }

  function resumeProgress() {
    const progress = readProgress();
    const cardsBtn = document.querySelector('[data-go="cards"]');
    if (cardsBtn) cardsBtn.click();
    setTimeout(function () {
      trySetGrade(progress);
      setTimeout(function () { seekSavedWord(progress, 180); }, 120);
    }, 120);
  }

  function enhancePage() {
    document.querySelectorAll('.card').forEach(enhanceCard);
    addResumeTile();
    saveProgress();
  }

  document.addEventListener('click', function (event) {
    const resume = event.target.closest('[data-v2-resume]');
    if (resume) {
      event.preventDefault();
      event.stopPropagation();
      resumeProgress();
      return;
    }
    const cardMove = event.target.closest('[data-card], [data-master], [data-answer]');
    if (cardMove) setTimeout(saveProgress, 250);
  }, true);

  document.addEventListener('change', function (event) {
    if (event.target && event.target.id === 'gradeSelect') setTimeout(saveProgress, 250);
  }, true);

  const observer = new MutationObserver(function () {
    window.requestAnimationFrame(enhancePage);
  });

  window.addEventListener('DOMContentLoaded', function () {
    const app = document.getElementById('app');
    if (app) observer.observe(app, { childList: true, subtree: true });
    enhancePage();
  });
})();
