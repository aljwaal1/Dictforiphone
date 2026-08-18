// Imported sentence display fix for Qamoosi School PWA v17
(function () {
  'use strict';
  const STORE = 'qamoosi_school_pwa_v2';
  const clean = v => String(v || '').replace(/🔊/g, '').replace(/\s+/g, ' ').trim();

  function words() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE) || '{}');
      return Array.isArray(state.customWords) ? state.customWords : [];
    } catch (_) { return []; }
  }

  function findWord(card) {
    const speak = card.querySelector('[data-speak]');
    const word = clean(speak?.dataset?.speak || speak?.textContent || '').toLowerCase();
    const meaning = clean(card.querySelector('.meaning')?.textContent || '');
    if (!word) return null;
    return words().find(w => clean(w.word_en || w.word || w.english).toLowerCase() === word && (!meaning || clean(w.meaning_ar || w.meaning || w.arabic) === meaning)) ||
           words().find(w => clean(w.word_en || w.word || w.english).toLowerCase() === word) || null;
  }

  function first(item, keys) {
    for (const key of keys) {
      const value = clean(item?.[key]);
      if (value) return value;
    }
    return '';
  }

  function apply(card) {
    if (!card) return;
    const item = findWord(card);
    if (!item) return;
    const sentence = first(item, ['sentence_en','example_en','exampleEnglish','example_english','sentenceEnglish','sentence_english','exampleSentence','example_sentence','book_example','example','sentence','جملة مثال','مثال من الكتاب','الجملة الإنجليزية']);
    const translation = first(item, ['sentence_ar','example_ar','exampleArabic','example_arabic','sentenceArabic','sentence_arabic','sentenceTranslation','sentence_translation','translation','ترجمة الجملة','ترجمة المثال','ترجمة المثال إلى العربية']);
    if (!sentence && !translation) return;

    let block = card.querySelector('.v2-example');
    if (!block) {
      block = document.createElement('div');
      block.className = 'v2-example';
      const meaningEl = card.querySelector('.meaning');
      if (meaningEl) meaningEl.insertAdjacentElement('afterend', block);
      else card.appendChild(block);
    }
    block.classList.remove('hidden');
    block.innerHTML = `
      <button class="btn alt v15-show-sentence" type="button">📝 إظهار الجملة</button>
      <div class="v15-sentence-body hidden" style="margin-top:12px">
        ${sentence ? `<div class="v2-label">الجملة الإنجليزية</div><div class="v2-sentence ltr" style="font-size:19px;font-weight:700;margin:8px 0">${escapeHtml(sentence)}</div><button class="btn alt v2-speak" data-speak="${escapeHtml(sentence)}" type="button">🔊 لفظ الجملة</button>` : `<div class="v2-label">الجملة الإنجليزية غير محفوظة لهذه الكلمة</div><div class="muted" style="margin:8px 0">أعد استيراد ملف Excel نفسه مرة واحدة لتحديث الجملة دون تكرار الكلمة.</div>`}
        ${translation ? `<div class="v2-label" style="margin-top:14px">ترجمة الجملة</div><div class="v2-translation" style="margin-top:6px">${escapeHtml(translation)}</div>` : ''}
      </div>`;
    card.dataset.sentenceV17 = '1';
  }

  function escapeHtml(value) {
    return String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function applyAll() {
    document.querySelectorAll('.card').forEach(card => {
      const speak = card.querySelector('[data-speak]');
      if (speak) apply(card);
    });
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest('.v15-show-sentence');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const body = btn.parentElement?.querySelector('.v15-sentence-body');
    if (!body) return;
    const hidden = body.classList.toggle('hidden');
    btn.textContent = hidden ? '📝 إظهار الجملة' : '📝 إخفاء الجملة';
  }, true);

  window.addEventListener('qamoosi-data-updated', () => setTimeout(applyAll, 50));
  window.addEventListener('qamoosi-data-imported', () => setTimeout(applyAll, 50));
  const observer = new MutationObserver(() => requestAnimationFrame(applyAll));
  window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (app) observer.observe(app, { childList: true, subtree: true });
    applyAll();
  });
})();