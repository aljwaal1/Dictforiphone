(() => {
  'use strict';

  const BACKUP_FORMAT = 'qamoosi-school-backup';
  const BACKUP_VERSION = 1;
  const APP_STORE = typeof STORE === 'string' ? STORE : 'qamoosi_school_pwa_v2';

  function timestamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }

  function collectStorage() {
    const storage = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) storage[key] = localStorage.getItem(key);
    }
    return storage;
  }

  function safeParse(value, fallback = null) {
    try { return JSON.parse(value); } catch (_) { return fallback; }
  }

  function currentSummary() {
    const raw = localStorage.getItem(APP_STORE);
    const saved = safeParse(raw, {});
    return {
      profiles: Array.isArray(saved.profiles) ? saved.profiles.length : 0,
      customWords: Array.isArray(saved.customWords) ? saved.customWords.length : 0,
      selectedProfile: Number.isInteger(saved.profile) ? saved.profile : 0
    };
  }

  function buildBackup() {
    return {
      format: BACKUP_FORMAT,
      backupVersion: BACKUP_VERSION,
      app: 'قاموسي المدرسي',
      createdAt: new Date().toISOString(),
      origin: location.origin,
      pathname: location.pathname,
      appStoreKey: APP_STORE,
      summary: currentSummary(),
      localStorage: collectStorage()
    };
  }

  async function deliverFile(blob, filename, title) {
    const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return true;
      }
    } catch (error) {
      if (error && error.name === 'AbortError') return false;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  async function exportBackup() {
    const payload = buildBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const ok = await deliverFile(blob, `qamoosi-backup_${timestamp()}.json`, 'نسخة احتياطية من قاموسي المدرسي');
    if (ok) notify('تم إنشاء النسخة الاحتياطية. احفظها في تطبيق الملفات.');
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  async function exportCsv() {
    const saved = safeParse(localStorage.getItem(APP_STORE), {});
    const profileIndex = Number.isInteger(saved.profile) ? saved.profile : 0;
    const profile = Array.isArray(saved.profiles) ? (saved.profiles[profileIndex] || saved.profiles[0] || {}) : {};
    const mastered = profile.mastered || {};
    const wrong = profile.wrong || {};
    const hard = profile.hard || {};
    const words = typeof allWords === 'function' ? allWords() : (Array.isArray(saved.customWords) ? saved.customWords : []);
    const rows = [
      ['id', 'grade', 'word_en', 'meaning_ar', 'mastered', 'wrong_count', 'hard', 'source'],
      ...words.map(w => [
        w.id,
        w.grade,
        w.word_en,
        w.meaning_ar,
        mastered[w.id] ? 'نعم' : 'لا',
        wrong[w.id] || 0,
        hard[w.id] ? 'نعم' : 'لا',
        w.source || ''
      ])
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const ok = await deliverFile(blob, `qamoosi-words_${timestamp()}.csv`, 'تصدير كلمات قاموسي المدرسي');
    if (ok) notify('تم إنشاء ملف الكلمات الذي يفتح في Excel.');
  }

  function validateBackup(payload) {
    if (!payload || payload.format !== BACKUP_FORMAT) throw new Error('هذا الملف ليس نسخة احتياطية صالحة من قاموسي المدرسي.');
    if (!payload.localStorage || typeof payload.localStorage !== 'object') throw new Error('ملف النسخة الاحتياطية ناقص أو تالف.');
    const key = payload.appStoreKey || APP_STORE;
    const appRaw = payload.localStorage[key];
    if (!appRaw || !safeParse(appRaw)) throw new Error('لم يتم العثور على بيانات التطبيق داخل الملف.');
    return key;
  }

  function mergeMaps(current = {}, incoming = {}) {
    return { ...current, ...incoming };
  }

  function wordKey(word) {
    return `${String(word.word_en || '').trim().toLowerCase()}|${String(word.grade || '').trim()}`;
  }

  function mergeAppState(current, incoming) {
    const result = { ...current, ...incoming };
    const currentWords = Array.isArray(current.customWords) ? current.customWords : [];
    const incomingWords = Array.isArray(incoming.customWords) ? incoming.customWords : [];
    const wordMap = new Map();
    [...currentWords, ...incomingWords].forEach(word => wordMap.set(wordKey(word), word));
    result.customWords = Array.from(wordMap.values());

    const currentProfiles = Array.isArray(current.profiles) ? current.profiles : [];
    const incomingProfiles = Array.isArray(incoming.profiles) ? incoming.profiles : [];
    const profileMap = new Map();
    currentProfiles.forEach(p => profileMap.set(p.name || `profile-${profileMap.size}`, { ...p }));
    incomingProfiles.forEach(p => {
      const name = p.name || `profile-${profileMap.size}`;
      const old = profileMap.get(name) || {};
      profileMap.set(name, {
        ...old,
        ...p,
        points: Math.max(Number(old.points || 0), Number(p.points || 0)),
        mastered: mergeMaps(old.mastered, p.mastered),
        wrong: mergeMaps(old.wrong, p.wrong),
        hard: mergeMaps(old.hard, p.hard)
      });
    });
    result.profiles = Array.from(profileMap.values()).slice(0, 3);
    result.profile = Math.min(Number(incoming.profile || 0), Math.max(0, result.profiles.length - 1));
    return result;
  }

  function restorePayload(payload, mode) {
    const importedKey = validateBackup(payload);
    const importedStorage = payload.localStorage;

    if (mode === 'replace') {
      Object.keys(importedStorage).forEach(key => localStorage.setItem(key, importedStorage[key]));
      if (importedKey !== APP_STORE && importedStorage[importedKey]) {
        localStorage.setItem(APP_STORE, importedStorage[importedKey]);
      }
    } else {
      const current = safeParse(localStorage.getItem(APP_STORE), {});
      const incoming = safeParse(importedStorage[importedKey], {});
      localStorage.setItem(APP_STORE, JSON.stringify(mergeAppState(current, incoming)));
    }
  }

  function chooseRestoreMode() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'backup-modal-overlay';
      overlay.innerHTML = `
        <div class="backup-modal" role="dialog" aria-modal="true" aria-labelledby="backup-title">
          <h3 id="backup-title">طريقة استعادة البيانات</h3>
          <p>اختر الدمج للحفاظ على البيانات الموجودة، أو الاستبدال لإرجاع النسخة كما كانت تماماً.</p>
          <button class="btn green" data-restore-mode="merge">دمج مع البيانات الحالية</button>
          <button class="btn backup-danger" data-restore-mode="replace">استبدال جميع البيانات</button>
          <button class="btn alt" data-restore-mode="cancel">إلغاء</button>
        </div>`;
      overlay.addEventListener('click', event => {
        const button = event.target.closest('[data-restore-mode]');
        if (!button) return;
        const mode = button.dataset.restoreMode;
        overlay.remove();
        resolve(mode === 'cancel' ? null : mode);
      });
      document.body.appendChild(overlay);
    });
  }

  async function importBackup(file) {
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      validateBackup(payload);
      const mode = await chooseRestoreMode();
      if (!mode) return;
      if (mode === 'replace' && !confirm('سيتم استبدال بيانات التطبيق الحالية. هل أنت متأكد؟')) return;
      restorePayload(payload, mode);
      alert('تمت استعادة البيانات بنجاح. سيُعاد تشغيل التطبيق الآن.');
      location.reload();
    } catch (error) {
      alert(error && error.message ? error.message : 'تعذر قراءة ملف النسخة الاحتياطية.');
    }
  }

  function notify(message) {
    if (typeof toast === 'function') toast(message);
    else alert(message);
  }

  function backupPanel() {
    const summary = currentSummary();
    return `
      <div class="card backup-card">
        <h3>النسخ الاحتياطي ونقل البيانات</h3>
        <p class="muted">احفظ نسخة كاملة قبل حذف التطبيق أو الانتقال إلى أندرويد.</p>
        <button class="btn green" data-export-backup>📦 إنشاء نسخة احتياطية كاملة</button>
        <button class="btn" data-import-backup>📥 استعادة نسخة احتياطية</button>
        <button class="btn alt" data-export-csv>📊 تصدير الكلمات إلى Excel</button>
        <input type="file" accept="application/json,.json" data-backup-file hidden>
        <div class="backup-summary">الملفات: ${summary.profiles} · الكلمات المضافة: ${summary.customWords}</div>
        <p class="backup-warning">لا تحذف أيقونة التطبيق من الآيفون قبل حفظ ملف النسخة الاحتياطية والتأكد من وجوده في «الملفات».</p>
      </div>`;
  }

  function injectPanel() {
    const app = document.getElementById('app');
    if (!app || app.querySelector('.backup-card')) return;
    const title = app.querySelector('.title');
    if (!title || !title.textContent.includes('الإعدادات')) return;
    const hostCard = app.querySelector('.card');
    if (hostCard) hostCard.insertAdjacentHTML('afterend', backupPanel());
    else app.insertAdjacentHTML('beforeend', backupPanel());
  }

  if (typeof window.settings === 'function') {
    const originalSettings = window.settings;
    window.settings = function patchedSettings(...args) {
      const result = originalSettings.apply(this, args);
      injectPanel();
      return result;
    };
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-export-backup]')) {
      event.preventDefault();
      exportBackup();
    } else if (event.target.closest('[data-import-backup]')) {
      event.preventDefault();
      document.querySelector('[data-backup-file]')?.click();
    } else if (event.target.closest('[data-export-csv]')) {
      event.preventDefault();
      exportCsv();
    }
  });

  document.addEventListener('change', event => {
    const input = event.target.closest('[data-backup-file]');
    if (!input || !input.files || !input.files[0]) return;
    importBackup(input.files[0]);
    input.value = '';
  });

  setTimeout(injectPanel, 0);
})();
