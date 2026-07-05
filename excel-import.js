// Excel import tool for Qamoosi School PWA
// Reads Excel files with Arabic headers and stores imported words in the app local database.
(function () {
  'use strict';

  const STORE = 'qamoosi_school_pwa_v2';
  let parsedRows = [];

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clean(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function readState() {
    try {
      const state = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (!Array.isArray(state.customWords)) state.customWords = [];
      if (!Array.isArray(state.profiles)) state.profiles = [{ name: 'طالب 1', points: 0, mastered: {}, wrong: {}, hard: {} }];
      if (typeof state.profile !== 'number') state.profile = 0;
      if (typeof state.sound !== 'boolean') state.sound = true;
      return state;
    } catch (_) {
      return { profile: 0, sound: true, profiles: [{ name: 'طالب 1', points: 0, mastered: {}, wrong: {}, hard: {} }], customWords: [] };
    }
  }

  function saveState(state) {
    localStorage.setItem(STORE, JSON.stringify(state));
  }

  function normalizeHeader(value) {
    return clean(value).replace(/[ـ:：]/g, '').toLowerCase();
  }

  function getValue(row, candidates) {
    const keys = Object.keys(row || {});
    for (const wanted of candidates) {
      const wantedNorm = normalizeHeader(wanted);
      const key = keys.find(k => normalizeHeader(k) === wantedNorm || normalizeHeader(k).includes(wantedNorm));
      if (key && clean(row[key])) return clean(row[key]);
    }
    return '';
  }

  function normalizeGrade(value) {
    const v = clean(value);
    if (!v) return '8';
    if (/kg|روضة|الروضة/i.test(v)) return 'KG';
    const map = [
      ['الأول', '1'], ['الاول', '1'], ['اول', '1'],
      ['الثاني', '2'], ['ثاني', '2'],
      ['الثالث', '3'], ['ثالث', '3'],
      ['الرابع', '4'], ['رابع', '4'],
      ['الخامس', '5'], ['خامس', '5'],
      ['السادس', '6'], ['سادس', '6'],
      ['السابع', '7'], ['سابع', '7'],
      ['الثامن', '8'], ['ثامن', '8']
    ];
    for (const [word, grade] of map) if (v.includes(word)) return grade;
    const n = v.match(/\d+/)?.[0];
    if (n) return n;
    return v;
  }

  function gradeName(g) {
    return String(g) === 'KG' ? 'الروضة' : `الصف ${g}`;
  }

  function addImportTile() {
    const grid = document.querySelector('.grid');
    if (!grid || grid.querySelector('[data-excel-import]')) return;
    const btn = document.createElement('button');
    btn.className = 'tile excel-import-tile';
    btn.type = 'button';
    btn.setAttribute('data-excel-import', '1');
    btn.innerHTML = '<div class="ico">📥</div><b>استيراد Excel</b><span>إضافة كلمات من ملف</span>';
    grid.appendChild(btn);
  }

  function renderImportPage(message) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="wrap">
        <div class="top"><div class="ad">مساحة إعلان علوية مستقبلية</div></div>
        <button class="back" data-go="home">رجوع</button>
        <h2 class="title">استيراد ملف Excel</h2>
        <div class="card">
          <p class="muted">ارفع ملف Excel بنفس التنسيق:</p>
          <div class="excel-format">
            الصف الدراسي<br>
            الكلمة الإنجليزية<br>
            المعنى بالعربية<br>
            مثال من الكتاب<br>
            ترجمة المثال إلى العربية
          </div>
          <input id="excelFileInput" type="file" accept=".xlsx,.xls" />
          <p class="muted">سيتم حفظ الكلمات داخل هذا الجهاز، ثم تظهر في البطاقات والاختبار بعد إعادة تحميل التطبيق.</p>
          ${message ? `<div class="excel-message">${esc(message)}</div>` : ''}
        </div>
        <div id="excelPreview"></div>
      </div>
    `;
  }

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('تعذر تحميل مكتبة قراءة Excel'));
      document.head.appendChild(s);
    });
  }

  async function parseExcelFile(file) {
    await ensureXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const normalized = rows.map((row, index) => {
      const gradeRaw = getValue(row, ['الصف الدراسي', 'الصف', 'grade']);
      const word = getValue(row, ['الكلمة الإنجليزية', 'الكلمة الانجليزية', 'English word', 'word_en', 'word']);
      const meaning = getValue(row, ['المعنى بالعربية', 'المعنى العربي', 'meaning_ar', 'meaning']);
      const sentence = getValue(row, ['مثال من الكتاب', 'الجملة الإنجليزية', 'الجملة الانجليزية', 'sentence_en', 'example']);
      const translation = getValue(row, ['ترجمة المثال إلى العربية', 'ترجمة المثال الى العربية', 'ترجمة الجملة', 'sentence_ar', 'translation']);
      return {
        id: 'excel_' + Date.now() + '_' + index,
        grade: normalizeGrade(gradeRaw),
        word_en: word,
        meaning_ar: meaning,
        sentence_en: sentence,
        sentence_ar: translation,
        source: 'excel-import'
      };
    }).filter(x => x.word_en && x.meaning_ar);

    parsedRows = normalized;
    renderPreview(normalized, rows.length);
  }

  function renderPreview(items, totalRows) {
    const box = document.getElementById('excelPreview');
    if (!box) return;
    const state = readState();
    const current = state.customWords || [];
    const duplicateCount = items.filter(item => current.some(w => String(w.grade) === String(item.grade) && clean(w.word_en).toLowerCase() === clean(item.word_en).toLowerCase())).length;
    const grades = [...new Set(items.map(x => gradeName(x.grade)))].join('، ');
    const previewRows = items.slice(0, 10).map(item => `
      <div class="excel-preview-row">
        <b class="ltr">${esc(item.word_en)}</b>
        <span>${esc(item.meaning_ar)}</span>
        <small>${esc(gradeName(item.grade))}</small>
      </div>
    `).join('');

    box.innerHTML = `
      <div class="card excel-preview-card">
        <h3>معاينة قبل الحفظ</h3>
        <p>إجمالي صفوف الملف: <b>${totalRows}</b></p>
        <p>الكلمات الصالحة: <b>${items.length}</b></p>
        <p>المكررة داخل التطبيق: <b>${duplicateCount}</b></p>
        <p>الصفوف: <b>${esc(grades || '-')}</b></p>
        <div class="excel-preview-list">${previewRows || '<div class="empty">لا توجد كلمات صالحة</div>'}</div>
        <button class="btn green" data-excel-save="merge">حفظ / تحديث الكلمات</button>
        <button class="btn red" style="margin-top:10px" data-excel-save="replace-grade">استبدال كلمات نفس الصف</button>
      </div>
    `;
  }

  function saveImported(mode) {
    if (!parsedRows.length) return alert('لا توجد كلمات للحفظ');
    const state = readState();
    const incomingGrades = new Set(parsedRows.map(x => String(x.grade)));
    let list = Array.isArray(state.customWords) ? state.customWords : [];

    if (mode === 'replace-grade') {
      list = list.filter(w => !incomingGrades.has(String(w.grade)));
    }

    let added = 0;
    let updated = 0;
    for (const item of parsedRows) {
      const idx = list.findIndex(w => String(w.grade) === String(item.grade) && clean(w.word_en).toLowerCase() === clean(item.word_en).toLowerCase());
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...item, id: list[idx].id || item.id };
        updated++;
      } else {
        list.push(item);
        added++;
      }
    }

    state.customWords = list;
    saveState(state);
    renderImportPage(`تم الحفظ بنجاح. أضيفت ${added} كلمة، وتم تحديث ${updated} كلمة.`);
    const preview = document.getElementById('excelPreview');
    if (preview) preview.innerHTML = '<div class="card"><button class="btn green" onclick="location.reload()">تحديث التطبيق الآن</button></div>';
  }

  function findImportedWord(word, meaning) {
    const state = readState();
    const w = clean(word).toLowerCase();
    const m = clean(meaning);
    return (state.customWords || []).find(x => clean(x.word_en).toLowerCase() === w && (!m || clean(x.meaning_ar) === m));
  }

  function applyImportedSentences() {
    document.querySelectorAll('.card[data-v2-enhanced="1"]').forEach(card => {
      if (card.getAttribute('data-excel-sentence-applied') === '1') return;
      const speakBtn = card.querySelector('[data-speak]');
      const word = clean(speakBtn?.dataset?.speak || speakBtn?.textContent || '');
      const meaning = clean(card.querySelector('.meaning')?.textContent || '');
      const match = findImportedWord(word, meaning);
      if (!match || !match.sentence_en) return;
      const sentence = card.querySelector('.v2-sentence');
      const speak = card.querySelector('.v2-speak');
      const translation = card.querySelector('.v2-translation');
      if (sentence) sentence.textContent = match.sentence_en;
      if (speak) speak.dataset.speak = match.sentence_en;
      if (translation && match.sentence_ar) translation.textContent = match.sentence_ar;
      card.setAttribute('data-excel-sentence-applied', '1');
    });
  }

  document.addEventListener('click', event => {
    const importBtn = event.target.closest('[data-excel-import]');
    if (importBtn) {
      event.preventDefault();
      event.stopPropagation();
      renderImportPage();
      return;
    }

    const saveBtn = event.target.closest('[data-excel-save]');
    if (saveBtn) {
      saveImported(saveBtn.dataset.excelSave);
    }
  }, true);

  document.addEventListener('change', event => {
    if (event.target && event.target.id === 'excelFileInput') {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      parseExcelFile(file).catch(err => renderImportPage(err.message || 'تعذر قراءة الملف'));
    }
  }, true);

  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => {
      addImportTile();
      applyImportedSentences();
    });
  });

  window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (app) observer.observe(app, { childList: true, subtree: true });
    addImportTile();
    applyImportedSentences();
  });
})();
