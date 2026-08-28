from pathlib import Path

p=Path('jordan-pwa.js')
s=p.read_text(encoding='utf-8')

old_stop="const STOP=new Set(('the and for with this that these those from into onto than then when where what which who whom whose why how you your yours they their theirs them there here have has had having does did done doing are was were been being can could will would shall should may might must not yes no very more most some any many much few each every both about above after again against along among around before below between during inside outside over under through without within lesson unit page pages student students teacher teachers book workbook exercise exercises activity activities read write listen look answer answers question questions complete match choose circle check tick work pair pairs group groups english arabic example examples').split(' '));"
new_stop="const STOP=new Set(('about above across after against along among around at before behind below beneath beside besides between beyond by despite down during except for from in inside into like near of off on onto opposite outside over past since through throughout to toward towards under underneath until up upon via with within without and or but nor yet so although though because unless while whereas whether if than once unit lesson page pages').split(' '));"
if old_stop not in s: raise SystemExit('STOP block not found')
s=s.replace(old_stop,new_stop)

s=s.replace("[['home','🏠','الرئيسية'],['search','🔎','البحث'],['curriculum','📚','المنهاج'],['learn','🎯','التعلم'],['more','✨','المزيد']]", "[['home','🏠','الرئيسية'],['search','🔎','AI بحث'],['curriculum','📚','الصفوف'],['learn','🎯','تدريب'],['more','✨','المزيد']]")
s=s.replace('القاموس المدرسي الأردني 🇯🇴','Easy English AI')
s=s.replace('يعمل على iPhone وWindows • قاموس + منهاج + مختبر كتاب','تعلم الإنجليزية بسهولة • iPhone وWindows')
s=s.replace('مختبر الكتاب','استوديو AI للكتاب')
s=s.replace('البحث الذكي','AI بحث')
s=s.replace('المنهاج','الصفوف')
s=s.replace('التعلم والمراجعة','تدريب ومراجعة')
s=s.replace('أدوات القاموس','أدوات Easy English AI')
s=s.replace("a.download='jordan-school-dictionary-backup.json'", "a.download='easy-english-ai-backup.json'")
s=s.replace("function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<3||l.length>28||STOP.has(l))return false;", "function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<2||l.length>32||STOP.has(l))return false;")

p.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
h=h.replace('jordan-pwa.js?v=18','jordan-pwa.js?v=349')
h=h.replace('easy-english-v345-patch.js?v=348','easy-english-v345-patch.js?v=349')
h=h.replace('easy-english-v345-patch.css?v=348','easy-english-v345-patch.css?v=349')
h=h.replace('manifest.webmanifest?v=348','manifest.webmanifest?v=349')
idx.write_text(h,encoding='utf-8')

sw=Path('sw.js')
w=sw.read_text(encoding='utf-8')
w=w.replace('easy-english-ai-pwa-v348-polish','easy-english-ai-pwa-v349-polish')
w=w.replace('jordan-pwa.js?v=18','jordan-pwa.js?v=349')
w=w.replace('easy-english-v345-patch.js?v=348','easy-english-v345-patch.js?v=349')
w=w.replace('easy-english-v345-patch.css?v=348','easy-english-v345-patch.css?v=349')
w=w.replace('manifest.webmanifest?v=348','manifest.webmanifest?v=349')
sw.write_text(w,encoding='utf-8')
print('PWA v349 identity/extraction polish applied')
