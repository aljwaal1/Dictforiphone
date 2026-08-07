// Imported sentence display fix for Qamoosi School PWA v15
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
    return words().find(w => clean(w.word_en).toLowerCase() === word && (!meaning || clean(w.meaning_ar) === meaning)) ||
           words().find(w => clean(w.word_en).toLowerCase() === word) || null;
  }

  function apply(card) {
    if (!card) return;
    const item = findWord(card);
    if (!item) return;
    const sentence = clean(item.sentence_en || item.example_en || item.example || item.sentence);
    const translation = clean(item.sentence_ar || item.example_ar || item.translation || item.sentence_translation);
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
        ${sentence ? `<div class="v2-label">الجملة الإنجليزية</div><div class="v2-sentence ltr" style="font-size:19px;font-weight:700;margin:8px 0">${escapeHtml(sentence)}</div><button class="btn alt v2-speak" data-speak="${escapeHtml(sentence)}" type="button">🔊 لفظ الجملة</button>` : ''}
        ${translation ? `<div class="v2-label" style="margin-top:14px">ترجمة الجملة</div><div class="v2-translation" style="margin-top:6px">${escapeHtml(translation)}</div>` : ''}
      </div>`;
    card.dataset.sentenceV15 = '1';
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
