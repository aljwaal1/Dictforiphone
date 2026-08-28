from pathlib import Path
import re

p=Path('jordan-pwa.js')
s=p.read_text(encoding='utf-8')

new_stop="const STOP=new Set(('about above across after against along among around at before behind below beneath beside besides between beyond by despite down during except for from in inside into like near of off on onto opposite outside over past since through throughout to toward towards under underneath until up upon via with within without and or but nor yet so although though because unless while whereas whether if than once unit lesson page pages').split(' '));"
s2,n=re.subn(r"const STOP=new Set\(\('.*?'\)\.split\(' '\)\);",new_stop,s,count=1)
if n!=1: raise SystemExit(f'STOP block replacements: {n}')
s=s2

proper="const PROPER=new Set(('adam ahmed ali amal amina anna ben david emma fatima george hassan helen ibrahim jack james jane john joseph khaled layla linda lisa maria mary michael mohamed mohammad mohammed mona nancy nora omar peter rasha sally sara sarah sam sami samer susan tom yousef yusuf zaid zeinab zainab amman aqaba athens australia austria baghdad bahrain beijing berlin brazil britain cairo canada china damascus denmark dubai egypt england europe finland france germany greece india iraq ireland istanbul italy japan jerusalem jordan kuwait london madrid morocco moscow newyork norway oman paris poland qatar riyadh rome russia saudi scotland spain stockholm sweden switzerland syria tokyo turkey uae ukraine yemen').split(' '));"
if 'const PROPER=' not in s:
    s=s.replace(new_stop,new_stop+'\n'+proper,1)

replacements={
"[['home','🏠','الرئيسية'],['search','🔎','البحث'],['curriculum','📚','المنهاج'],['learn','🎯','التعلم'],['more','✨','المزيد']]":"[['home','🏠','الرئيسية'],['search','🔎','AI بحث'],['curriculum','📚','الصفوف'],['learn','🎯','تدريب'],['more','✨','المزيد']]",
'القاموس المدرسي الأردني 🇯🇴':'Easy English AI',
'يعمل على iPhone وWindows • قاموس + منهاج + مختبر كتاب':'تعلم الإنجليزية بسهولة • iPhone وWindows',
'مختبر الكتاب':'استوديو AI للكتاب',
'البحث الذكي':'AI بحث',
'المنهاج':'الصفوف',
'التعلم والمراجعة':'تدريب ومراجعة',
'<h1 class="j-title">التعلم</h1>':'<h1 class="j-title">تدريب</h1>',
'أدوات القاموس':'أدوات Easy English AI',
"a.download='jordan-school-dictionary-backup.json'":"a.download='easy-english-ai-backup.json'",
'يتم استبعاد الأسماء الظاهرة وسط الجمل، أسماء التعليمات الشائعة، الأرقام، الرموز والأحرف المفردة. لا يوجد تصنيف نحوي للكلمات.':'يتم استبعاد حروف الجر والعطف والأسماء والأماكن والأرقام والرموز والأحرف المفردة، مع إبقاء بقية الكلمات بترتيب أول ظهور.',
"const key=`${unit}|${lesson}|${raw.toLowerCase()}`;":"const key=raw.toLowerCase();",
"const list=[...map.values()].filter(x=>x.frequency>=2||x.example_en).sort((a,b)=>b.frequency-a.frequency||a.word_en.localeCompare(b.word_en));":"const list=[...map.values()];",
}
for old,new in replacements.items():
    s=s.replace(old,new)

pattern=r"function validWord\(raw,mid\)\{const w=raw\.trim\(\),l=w\.toLowerCase\(\);if\(!/\^\[A-Za-z\]\[A-Za-z'\-\]\*\$/\.test\(w\)\|\|l\.length<\d+\|\|l\.length>\d+\|\|STOP\.has\(l\)(?:\|\|PROPER\.has\(l\.replace\(/\[-'\]/g,''\)\))?\)return false;"
new_valid="function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<2||l.length>32||STOP.has(l)||PROPER.has(l.replace(/[-']/g,'')))return false;"
s2,n=re.subn(pattern,new_valid,s,count=1)
if n!=1:
    old1="function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<2||l.length>32||STOP.has(l))return false;"
    old2="function validWord(raw,mid){const w=raw.trim(),l=w.toLowerCase();if(!/^[A-Za-z][A-Za-z'-]*$/.test(w)||l.length<3||l.length>28||STOP.has(l))return false;"
    if old1 in s: s=s.replace(old1,new_valid,1)
    elif old2 in s: s=s.replace(old2,new_valid,1)
    elif new_valid not in s: raise SystemExit('validWord block not found')
else:
    s=s2

p.write_text(s,encoding='utf-8')

idx=Path('index.html')
h=idx.read_text(encoding='utf-8')
for old,new in [
('jordan-pwa.js?v=18','jordan-pwa.js?v=349'),
('easy-english-v345-patch.js?v=348','easy-english-v345-patch.js?v=349'),
('easy-english-v345-patch.css?v=348','easy-english-v345-patch.css?v=349'),
('manifest.webmanifest?v=348','manifest.webmanifest?v=349'),
('sw.js?v=348','sw.js?v=349')]: h=h.replace(old,new)
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
