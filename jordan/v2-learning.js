// V2 learning enhancements for Qamoosi School PWA
// Clean step-by-step learning flow + resume progress + quiz-driven review support.
(function () {
  'use strict';

  const PROGRESS_KEY = 'qamoosi_v2_last_progress';
  const QUIZ_REVIEW_KEY = 'qamoosi_v2_quiz_review_words';
  const ENHANCED_ATTR = 'data-v2-enhanced';

  function cleanText(value) {
    return String(value || '').replace(/🔊/g, '').replace(/\s+/g, ' ').trim();
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

    // Curated examples for common starter words. More can be added later in JSON as sentence_en/sentence_ar.
    const special = {
      apple: ['I put an apple in my lunch box.', 'أضع تفاحة في صندوق غذائي.'],
      banana: ['The monkey likes bananas.', 'القرد يحب الموز.'],
      orange: ['Orange juice is cold and fresh.', 'عصير البرتقال بارد وطازج.'],
      cat: ['The cat sleeps on the chair.', 'القطة تنام على الكرسي.'],
      dog: ['The dog runs in the garden.', 'الكلب يركض في الحديقة.'],
      bird: ['A bird is singing in the tree.', 'طائر يغني على الشجرة.'],
      fish: ['The fish swims in clean water.', 'السمكة تسبح في ماء نظيف.'],
      cow: ['The cow gives us milk.', 'البقرة تعطينا الحليب.'],
      horse: ['The horse runs very fast.', 'الحصان يركض بسرعة كبيرة.'],
      duck: ['The duck walks near the pond.', 'البطة تمشي قرب البركة.'],
      sun: ['The sun rises in the morning.', 'تشرق الشمس في الصباح.'],
      moon: ['The moon shines at night.', 'القمر يضيء في الليل.'],
      star: ['I can see a bright star.', 'أستطيع رؤية نجمة لامعة.'],
      sky: ['The sky is blue today.', 'السماء زرقاء اليوم.'],
      rain: ['The rain makes the garden green.', 'المطر يجعل الحديقة خضراء.'],
      water: ['Please drink enough water.', 'من فضلك اشرب كمية كافية من الماء.'],
      milk: ['I drink milk before school.', 'أشرب الحليب قبل المدرسة.'],
      bread: ['We buy fresh bread in the morning.', 'نشتري خبزاً طازجاً في الصباح.'],
      book: ['I read a story in my book.', 'أقرأ قصة في كتابي.'],
      pen: ['I write my name with a pen.', 'أكتب اسمي بقلم.'],
      pencil: ['I draw a flower with a pencil.', 'أرسم زهرة بقلم رصاص.'],
      school: ['I meet my friends at school.', 'أقابل أصدقائي في المدرسة.'],
      teacher: ['My teacher helps me understand the lesson.', 'معلمي يساعدني على فهم الدرس.'],
      friend: ['A good friend shares and helps.', 'الصديق الجيد يشارك ويساعد.'],
      car: ['The car stops at the red light.', 'السيارة تتوقف عند الإشارة الحمراء.'],
      bus: ['The bus takes students to school.', 'الحافلة تنقل الطلاب إلى المدرسة.'],
      family: ['My family eats dinner together.', 'عائلتي تتناول العشاء معاً.'],
      garden: ['Flowers grow in the garden.', 'تنمو الأزهار في الحديقة.'],
      classroom: ['We listen carefully in the classroom.', 'نستمع بانتباه في غرفة الصف.'],
      lesson: ['The lesson starts after the bell.', 'يبدأ الدرس بعد الجرس.'],
      question: ['I ask a question when I do not understand.', 'أسأل سؤالاً عندما لا أفهم.'],
      answer: ['The answer is written on the board.', 'الإجابة مكتوبة على اللوح.']
    };

    if (special[w]) return { sentence: special[w][0], translation: special[w][1] };
    if (w.includes(' ')) return { sentence: `I use the phrase "${w}" in class.`, translation: `أستخدم عبارة "${m}" في الصف.` };
    if (isVerb(m)) return { sentence: `I ${w} when I need to practice.`, translation: `أنا ${m} عندما أحتاج إلى التدريب.` };
    return { sentence: `I learned the word ${w} today.`, translation: `تعلمت كلمة ${m} اليوم.` };
  }

  function enhanceCard(card) {
    if (!card || card.getAttribute(ENHANCED_ATTR) === '1') return;
    const { word, meaning } = getWordFromCard(card);
    if (!word || !meaning) return;

    const isLearningCard = !!card.querySelector('[data-card], [data-master]');
    const toggleBtn = card.querySelector('[data-toggle-next]');
    const masterBtn = card.querySelector('[data-master]');
    const nextBtn = card.querySelector('[data-card="next"]');

    if (toggleBtn) toggleBtn.textContent = isLearningCard ? '👁 لا أعرفها / أظهر المعنى' : '👁 أظهر المعنى';
    if (masterBtn) {
      masterBtn.textContent = '✅ أعرفها — تخطّي';
      masterBtn.classList.add('green');
    }
    if (nextBtn) nextBtn.textContent = 'التالي';

    const ex = makeExample(word, meaning);
    const block = document.createElement('div');
    block.className = 'v2-example hidden';
    block.innerHTML = `
      <button class="btn alt v2-step-btn" data-v2-show="example" type="button">📝 أظهر المثال</button>
      <div class="v2-example-body hidden">
        <div class="v2-label">مثال</div>
        <div class="v2-sentence ltr">${escapeHtml(ex.sentence)}</div>
        <button class="btn alt v2-speak" data-speak="${escapeHtml(ex.sentence)}" type="button">🔊 استمع للجملة</button>
        <button class="btn alt v2-step-btn" data-v2-show="translation" type="button">🌍 أظهر ترجمة الجملة</button>
        <div class="v2-translation hidden">${escapeHtml(ex.translation)}</div>
      </div>
    `;

    const meaningEl = card.querySelector('.meaning');
    if (meaningEl) meaningEl.insertAdjacentElement('afterend', block);
    else card.appendChild(block);
    card.setAttribute(ENHANCED_ATTR, '1');
  }

  function revealLearningSteps(button) {
    const card = button.closest('.card');
    if (!card) return;
    setTimeout(function () {
      const meaning = card.querySelector('.meaning');
      const block = card.querySelector('.v2-example');
      if (meaning && !meaning.classList.contains('hidden') && block) block.classList.remove('hidden');
    }, 80);
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

  function rememberQuizWrong(id, label) {
    if (!id) return;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(QUIZ_REVIEW_KEY) || '[]'); } catch (_) { arr = []; }
    const now = Date.now();
    const existing = arr.find(x => String(x.id) === String(id));
    if (existing) { existing.count = (existing.count || 1) + 1; existing.last = now; existing.label = label || existing.label; }
    else arr.push({ id: String(id), label: label || '', count: 1, last: now });
    localStorage.setItem(QUIZ_REVIEW_KEY, JSON.stringify(arr.slice(-300)));
  }

  function enhanceQuizResult() {
    const title = cleanText(document.querySelector('.title')?.textContent || '');
    if (!title.includes('نتيجة الاختبار')) return;
    const card = document.querySelector('.card');
    if (!card || card.querySelector('[data-v2-review-wrong]')) return;
    const wrongs = (() => { try { return JSON.parse(localStorage.getItem(QUIZ_REVIEW_KEY) || '[]'); } catch (_) { return []; } })();
    if (!wrongs.length) return;
    const box = document.createElement('div');
    box.className = 'v2-quiz-review';
    box.innerHTML = `<p><b>الكلمات التي تحتاج مراجعة:</b> ${wrongs.length}</p><button class="btn amber" data-go="hard" data-v2-review-wrong>راجع أخطائي الآن</button>`;
    card.appendChild(box);
  }

  function enhancePage() {
    document.querySelectorAll('.card').forEach(enhanceCard);
    addResumeTile();
    enhanceQuizResult();
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

    const showBtn = event.target.closest('[data-v2-show]');
    if (showBtn) {
      const card = showBtn.closest('.card');
      if (showBtn.dataset.v2Show === 'example') {
        card?.querySelector('.v2-example-body')?.classList.remove('hidden');
        showBtn.classList.add('hidden');
      }
      if (showBtn.dataset.v2Show === 'translation') {
        card?.querySelector('.v2-translation')?.classList.remove('hidden');
        showBtn.classList.add('hidden');
      }
      return;
    }

    const meaningBtn = event.target.closest('[data-toggle-next]');
    if (meaningBtn) revealLearningSteps(meaningBtn);

    const answer = event.target.closest('[data-answer]');
    if (answer && answer.dataset.answer !== answer.dataset.real) {
      rememberQuizWrong(answer.dataset.id, answer.dataset.real || answer.textContent || '');
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
