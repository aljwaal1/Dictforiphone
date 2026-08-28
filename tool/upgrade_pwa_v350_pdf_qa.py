from pathlib import Path

p = Path('jordan-pwa.js')
s = p.read_text(encoding='utf-8')

old_loader = "async function ensurePdfJs(){if(window.pdfjsLib)return;await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';s.type='module';s.onload=res;s.onerror=rej;document.head.appendChild(s)}).catch(()=>{});if(!window.pdfjsLib){await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}}"
new_loader = "async function ensurePdfJs(){if(window.pdfjsLib)return;await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)});if(!window.pdfjsLib)throw new Error('PDF engine unavailable');window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}"

if old_loader in s:
    s = s.replace(old_loader, new_loader, 1)
elif new_loader not in s:
    raise SystemExit('PDF loader block not found')

p.write_text(s, encoding='utf-8')

idx = Path('index.html')
h = idx.read_text(encoding='utf-8')
for old, new in [
    ('manifest.webmanifest?v=349', 'manifest.webmanifest?v=350'),
    ('jordan-pwa.js?v=349', 'jordan-pwa.js?v=350'),
    ('easy-english-v345-patch.js?v=349', 'easy-english-v345-patch.js?v=350'),
    ('easy-english-v345-patch.css?v=349', 'easy-english-v345-patch.css?v=350'),
    ("serviceWorker.register('./sw.js?v=349'", "serviceWorker.register('./sw.js?v=350'")
]:
    h = h.replace(old, new)
idx.write_text(h, encoding='utf-8')

sw = Path('sw.js')
w = sw.read_text(encoding='utf-8')
for old, new in [
    ('easy-english-ai-pwa-v349-polish', 'easy-english-ai-pwa-v350-functional-qa'),
    ('manifest.webmanifest?v=349', 'manifest.webmanifest?v=350'),
    ('jordan-pwa.js?v=349', 'jordan-pwa.js?v=350'),
    ('easy-english-v345-patch.js?v=349', 'easy-english-v345-patch.js?v=350'),
    ('easy-english-v345-patch.css?v=349', 'easy-english-v345-patch.css?v=350')
]:
    w = w.replace(old, new)
sw.write_text(w, encoding='utf-8')

print('PWA v350 PDF loader QA polish applied')
