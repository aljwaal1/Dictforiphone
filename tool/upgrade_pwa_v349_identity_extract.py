from pathlib import Path
import re

p=Path('jordan-pwa.js')
s=p.read_text(encoding='utf-8')

new_stop="const STOP=new Set(('about above across after against along among around at before behind below beneath beside besides between beyond by despite down during except for from in inside into like near of off on onto opposite outside over past since through throughout to toward towards under underneath until up upon via with within without and or but nor yet so although though because unless while whereas whether if than once unit lesson page pages').split(' '));"
s2,n=re.subn(r"const STOP=new Set\(\('.*?'\)\.split\(' '\)\);",new_stop,s,count=1)
if n!=1: raise SystemExit(f'STOP block replacements: {n}')
s=s2

replacements={
"[['home','🏠','الرئيسية'],['search','🔎','البحث'],['curriculum','📚','المنهاج'],['learn','🎯','التعلم'],['more','✨','المزيد']]":"[['home','🏠','الرئيسية'],['search','🔎','AI بحث'],['curriculum','📚','الصفوف'],['learn','🎯','تدريب'],['more','✨','المزيد']]",
'القاموس المدرسي الأردني 🇯🇴':'Easy English AI',
'يعمل على iPhone وWindows • قاموس + منهاج + مختبر كتاب':'تعلم الإنجليزية بسهولة • iPhone وWindows',
'مختبر الكتاب':'استوديو AI للكتاب',
'البحث الذكي':'AI بحث',
'المنهاج':'الصفوف',
'التعلم والمراجعة':'تدريب ومراجعة',
'أدوات القاموس':'أدوات Easy English AI',
"a.download='jordan-school-dictionary-backup.json'":"a.download='easy-english-ai-backup.json'",
}
for old,new in replacements.items():
    s=s.replace(old,new)

s2,n=re.subn(r"function validWord\(raw,mid\)\{const w=raw\.trim\(\),l=w\.toLowerCase\(\);if\(!/\^\[A-Za-z\]\[A-Za-z'\-\]\*\$/\.test\(w\)\|\|l\.length<\d+\|\|l\.length>\d+\|\|STOP\.has\(l\)\)return false;", "function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<2||l.length>32||STOP.has(l))return false;", s, count=1)
if n!=1:
    # Simpler exact prefix fallback for minified source variants.
    old_prefix="function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<3||l.length>28||STOP.has(l))return false;"
    if old_prefix not in s: raise SystemExit('validWord block not found')
    s=s.replace(old_prefix,"function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<2||l.length>32||STOP.has(l))return false;",1)
else:
    s=s2

p.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
for old,new in [
('jordan-pwa.js?v=18','jordan-pwa.js?v=349'),
('jordan-pwa.js?v=349','jordan-pwa.js?v=349'),
('easy-english-v345-patch.js?v=348','easy-english-v345-patch.js?v=349'),
('easy-english-v345-patch.css?v=348','easy-english-v345-patch.css?v=349'),
('manifest.webmanifest?v=348','manifest.webmanifest?v=349')]: h=h.replace(old,new)
idx.write_text(h,encoding='utf-8')

sw=Path('sw.js')
w=sw.read_text(encoding='utf-8')
for old,new in [
('easy-english-ai-pwa-v348-polish','easy-english-ai-pwa-v349-polish'),
('jordan-pwa.js?v=18','jordan-pwa.js?v=349'),
('easy-english-v345-patch.js?v=348','easy-english-v345-patch.js?v=349'),
('easy-english-v345-patch.css?v=348','easy-english-v345-patch.css?v=349'),
('manifest.webmanifest?v=348','manifest.webmanifest?v=349')]: w=w.replace(old,new)
sw.write_text(w,encoding='utf-8')
print('PWA v349 identity/extraction polish applied')
