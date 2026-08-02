// Robust Excel import for Qamoosi School PWA v14
(function () {
  'use strict';
  const STORE = 'qamoosi_school_pwa_v2';
  let parsedRows = [];

  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const esc = value => clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

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
    window.dispatchEvent(new CustomEvent('qamoosi-data-updated', { detail: { source: 'excel' } }));
  }

  function normalizeHeader(value) {
    return clean(value)
      .replace(/[ـ:：]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .toLowerCase();
  }

  function getValue(row, candidates) {
    const keys = Object.keys(row || {});
    for (const wanted of candidates) {
      const wantedNorm = normalizeHeader(wanted);
      const exact = keys.find(k => normalizeHeader(k) === wantedNorm);
      if (exact && clean(row[exact])) return clean(row[exact]);
    }
    for (const wanted of candidates) {
      const wantedNorm = normalizeHeader(wanted);
      const partial = keys.find(k => normalizeHeader(k).includes(wantedNorm) || wantedNorm.includes(normalizeHeader(k)));
      if (partial && clean(row[partial])) return clean(row[partial]);
    }
    return '';
  }

  function normalizeGrade(value) {
    const v = clean(value);
    if (!v) return '';
    if (/kg|روضة|الروضة/i.test(v)) return 'KG';
    const arabic = [['الأول','1'],['الاول','1'],['الثاني','2'],['الثالث','3'],['الرابع','4'],['الخامس','5'],['السادس','6'],['السابع','7'],['الثامن','8']];
    for (const [label, grade] of arabic) if (v.includes(label)) return grade;
    const n = v.match(/\d+/)?.[0];
    return n || v;
  }

  const gradeName = g => String(g) === 'KG' ? 'الروضة' : `الصف ${g}`;

  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('تعذر تحميل قارئ Excel. تحقق من الاتصال بالإنترنت ثم حاول مجددًا.'));
      document.head.appendChild(script);
    });
  }

  function addImportTile() {
    const grid = document.querySelector('.grid');
    if (!grid || grid.querySelector('[data-excel-import]')) return;
    const btn = document.createElement('button');
    btn.className = 'tile excel-import-tile';
    btn.type = 'button';
    btn.dataset.excelImport = '1';
    btn.innerHTML = '<div class="ico">📥</div><b>استيراد Excel</b><span>إضافة كلمات من ملف</span>';
    grid.appendChild(btn);
  }

  function renderImportPage(message = '') {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="wrap">
        <div class="top"><div class="ad">مساحة إعلان علوية مستقبلية</div></div>
        <button class="back" data-go="home">رجوع</button>
        <h2 class="title">استيراد ملف Excel</h2>
        <div class="card">
          <p class="muted">يدعم التطبيق العناوين التالية كما هي في ملفك:</p>
          <div class="excel-format">الصف<br>الكلمة<br>المعنى العربي<br>جملة مثال<br>ترجمة الجملة</div>
          <input id="excelFileInput" type="file" accept=".xlsx,.xls,.csv" />
          <p class="muted">كل كلمة تكون في صف مستقل، ويمكن للملف أن يحتوي على آلاف الصفوف.</p>
          ${message ? `<div class="excel-message">${esc(message)}</div>` : ''}
        </div>
        <div id="excelPreview"></div>
      </div>`;
  }

  async function parseFile(file) {
    await ensureXlsx();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, raw: false });
    const allRows = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
      rows.forEach(row => allRows.push({ row, sheetName }));
    }

    const stamp = Date.now();
    const normalized = allRows.map(({ row, sheetName }, index) => {
      const gradeRaw = getValue(row, ['الصف', 'الصف الدراسي', 'grade', 'grade level', 'class']);
      const word = getValue(row, ['الكلمة', 'الكلمة الإنجليزية', 'الكلمة الانجليزية', 'english word', 'word_en', 'word']);
      const meaning = getValue(row, ['المعنى العربي', 'المعنى بالعربية', 'المعنى', 'meaning_ar', 'meaning']);
      const sentence = getValue(row, ['جملة مثال', 'مثال من الكتاب', 'الجملة الإنجليزية', 'الجملة الانجليزية', 'sentence_en', 'example sentence', 'example']);
      const translation = getValue(row, ['ترجمة الجملة', 'ترجمة المثال إلى العربية', 'ترجمة المثال الى العربية', 'sentence_ar', 'translation']);
      return {
        id: `excel_${stamp}_${index}`,
        grade: normalizeGrade(gradeRaw),
        word_en: clean(word),
        meaning_ar: clean(meaning),
        sentence_en: clean(sentence),
        sentence_ar: clean(translation),
        source: `excel-import:${sheetName}`
      };
    }).filter(item => item.word_en && item.meaning_ar && item.grade);

    parsedRows = normalized;
    renderPreview(normalized, allRows.length);
  }

  function renderPreview(items, totalRows) {
    const box = document.getElementById('excelPreview');
    if (!box) return;
    const state = readState();
    const current = state.customWords || [];
    const duplicateCount = items.filter(item => current.some(w => String(w.grade) === String(item.grade) && clean(w.word_en).toLowerCase() === clean(item.word_en).toLowerCase())).length;
    const grades = [...new Set(items.map(x => gradeName(x.grade)))].join('، ');
    const rows = items.slice(0, 10).map(item => `<div class="excel-preview-row"><b class="ltr">${esc(item.word_en)}</b><span>${esc(item.meaning_ar)}</span><small>${esc(gradeName(item.grade))}</small></div>`).join('');
    box.innerHTML = `
      <div class="card excel-preview-card">
        <h3>معاينة قبل الحفظ</h3>
        <p>إجمالي صفوف الملف: <b>${totalRows}</b></p>
        <p>الكلمات الصالحة: <b>${items.length}</b></p>
        <p>المكررة داخل التطبيق: <b>${duplicateCount}</b></p>
        <p>الصفوف: <b>${esc(grades || '-')}</b></p>
        <div class="excel-preview-list">${rows || '<div class="empty">لم يتم التعرف على كلمات صالحة. تأكد من وجود الصف والكلمة والمعنى العربي في الصف الأول.</div>'}</div>
        <button class="btn green" data-excel-save="merge" ${items.length ? '' : 'disabled'}>حفظ / تحديث الكلمات</button>
        <button class="btn red" style="margin-top:10px" data-excel-save="replace-grade" ${items.length ? '' : 'disabled'}>استبدال كلمات نفس الصف</button>
      </div>`;
  }

  function cleanProgressForExistingWords(state) {
    const validIds = new Set((state.customWords || []).map(w => String(w.id)));
    for (const profile of state.profiles || []) {
      for (const key of ['mastered', 'wrong', 'hard']) {
        const map = profile[key];
        if (!map || typeof map !== 'object') profile[key] = {};
        else Object.keys(map).forEach(id => {
          if (String(id).startsWith('excel_') && !validIds.has(String(id))) delete map[id];
        });
      }
    }
  }

  function saveImported(mode) {
    if (!parsedRows.length) return alert('لا توجد كلمات صالحة للحفظ');
    const state = readState();
    const incomingGrades = new Set(parsedRows.map(x => String(x.grade)));
    let list = Array.isArray(state.customWords) ? state.customWords.slice() : [];
    if (mode === 'replace-grade') list = list.filter(w => !incomingGrades.has(String(w.grade)));

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
    cleanProgressForExistingWords(state);
    saveState(state);
    localStorage.setItem('qamoosi_last_import', JSON.stringify({ added, updated, total: parsedRows.length, at: Date.now() }));
    renderImportPage(`تم الحفظ بنجاح: أضيفت ${added} كلمة وتم تحديث ${updated} كلمة. ستتحدث جميع الأقسام الآن.`);
    const preview = document.getElementById('excelPreview');
    if (preview) preview.innerHTML = '<div class="card"><button class="btn green" onclick="location.reload()">فتح التطبيق بالبيانات الجديدة</button></div>';
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
    if (saveBtn) saveImported(saveBtn.dataset.excelSave);
  }, true);

  document.addEventListener('change', event => {
    if (event.target?.id !== 'excelFileInput') return;
    const file = event.target.files?.[0];
    if (!file) return;
    parseFile(file).catch(err => renderImportPage(err?.message || 'تعذر قراءة الملف'));
  }, true);

  const observer = new MutationObserver(() => requestAnimationFrame(addImportTile));
  window.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (app) observer.observe(app, { childList: true, subtree: true });
    addImportTile();
  });
})();
