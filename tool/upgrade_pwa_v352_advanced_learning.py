from pathlib import Path
import re
p=Path('jordan/jordan-pwa.js')
s=p.read_text(encoding='utf-8')

# Collapse repeated helper definitions caused by repeated materialization.
for name in ['learningPool','learningHeader','progressSnapshot','applyProgress','ensureProfiles','persistActiveProgress','switchProfile']:
    # keep the last definition only
    matches=list(re.finditer(rf"function {name}\([^\n]*?\)\{{.*?\}}\n",s,re.S))
    if len(matches)>1:
        keep=matches[-1]
        chunks=[]; pos=0
        for m in matches[:-1]:
            chunks.append(s[pos:m.start()]); pos=m.end()
        chunks.append(s[pos:])
        s=''.join(chunks)

# Insert advanced helpers before quizSetup.
anchor='function quizSetup()'
idx=s.find(anchor)
if idx<0: raise SystemExit('quizSetup missing')
advanced=r'''function lessonOptions(grade,unit=''){return [...new Set(learningPool(grade).filter(w=>!unit||String(w.unit||'')===unit).map(w=>String(w.lesson||'').trim()).filter(Boolean))].sort()}
function wrongTotal(w){ensureProgress();return Number(db.wrongCounts[String(w.id)]||0)}
function notMasteredPool(grade){ensureProgress();const m=new Set(db.mastered.map(String));return learningPool(grade).filter(w=>!m.has(String(w.id)))}
function difficultPool(grade){ensureProgress();const d=new Set(db.difficult.map(String));return learningPool(grade).filter(w=>d.has(String(w.id))||wrongTotal(w)>0).sort((a,b)=>difficultyScore(b)-difficultyScore(a))}
function recentMistakesPool(grade){ensureProgress();const ids=Array.isArray(db.recentMistakes)?db.recentMistakes.map(String):[];const order=new Map(ids.map((id,i)=>[id,i]));return learningPool(grade).filter(w=>order.has(String(w.id))).sort((a,b)=>order.get(String(a.id))-order.get(String(b.id)))}
function smartMixedPool(grade){ensureProgress();const pool=learningPool(grade);const mastered=new Set(db.mastered.map(String)),studied=new Set(db.studied.map(String));const wrong=[...pool].filter(w=>wrongTotal(w)>0).sort((a,b)=>difficultyScore(b)-difficultyScore(a));const fresh=[...pool].filter(w=>!studied.has(String(w.id))).sort(()=>Math.random()-.5);const hard=[...pool].filter(w=>db.difficult.map(String).includes(String(w.id))).sort((a,b)=>difficultyScore(b)-difficultyScore(a));const stable=[...pool].filter(w=>mastered.has(String(w.id))).sort(()=>Math.random()-.5);const desired=Math.min(20,pool.length);const take=(a,n)=>a.slice(0,Math.ceil(desired*n));const merged=[...take(wrong,.4),...take(fresh,.3),...take(hard,.2),...take(stable,.1)];const seen=new Set(),out=[];for(const w of [...merged,...pool.sort(()=>Math.random()-.5)]){const id=String(w.id);if(!seen.has(id)){seen.add(id);out.push(w)}if(out.length>=desired)break}return out}
function progressByScope(grade,unit='',lesson=''){ensureProgress();const all=db.words.filter(w=>w.grade===grade&&(!unit||String(w.unit||'')===unit)&&(!lesson||String(w.lesson||'')===lesson));const m=new Set(db.mastered.map(String));return {total:all.length,done:all.filter(w=>m.has(String(w.id))).length}}
'''
s=s[:idx]+advanced+s[idx:]

# Expand quiz mode options.
s=s.replace("<option value=\"studied\">حسب الكلمات المدروسة على الجهاز</option><option value=\"comprehensive\">شامل - جميع الصفوف</option>","<option value=\"studied\">حسب الكلمات المدروسة على الجهاز</option><option value=\"lesson\">حسب الدرس</option><option value=\"difficult\">الكلمات الصعبة فقط</option><option value=\"mistakes\">أخطائي الأخيرة</option><option value=\"notmastered\">غير المتقنة فقط</option><option value=\"smartmix\">مختلط ذكي</option><option value=\"comprehensive\">شامل - جميع الصفوف</option>")
# Add lesson selector next to unit selector.
s=s.replace('<select id="quizUnit" class="j-select" style="display:none"></select><select id="quizCount"','<select id="quizUnit" class="j-select" style="display:none"></select><select id="quizLesson" class="j-select" style="display:none"></select><select id="quizCount"')
# enrich constants in setup
s=s.replace("unit=ROOT.querySelector('#quizUnit'),hint=ROOT.querySelector('#quizHint');const refresh=()=>{","unit=ROOT.querySelector('#quizUnit'),lesson=ROOT.querySelector('#quizLesson'),hint=ROOT.querySelector('#quizHint');const refresh=()=>{")
# Replace refresh body fragments for visibility/options/hints.
s=s.replace("unit.style.display=m==='unit'?'block':'none';if(m==='unit'){const u=unitOptions(grade.value);unit.innerHTML=u.length?u.map(x=>`<option value=\"${esc(x)}\">${esc(x)}</option>`).join(''):'<option value=\"\">لا توجد وحدات</option>'}","unit.style.display=(m==='unit'||m==='lesson')?'block':'none';lesson.style.display=m==='lesson'?'block':'none';if(m==='unit'||m==='lesson'){const u=unitOptions(grade.value);unit.innerHTML=u.length?u.map(x=>`<option value=\"${esc(x)}\">${esc(x)}</option>`).join(''):'<option value=\"\">لا توجد وحدات</option>';const l=lessonOptions(grade.value,unit.value);lesson.innerHTML=l.length?l.map(x=>`<option value=\"${esc(x)}\">${esc(x)}</option>`).join(''):'<option value=\"\">لا توجد دروس</option>'}")
s=s.replace("studied:'يختبر فقط الكلمات التي سبق أن درستها.',comprehensive:'اختبار شامل من جميع الصفوف.'","studied:'يختبر فقط الكلمات التي سبق أن درستها.',lesson:'يختبر كلمات درس واحد فقط.',difficult:'يركز على الكلمات الصعبة أو التي أخطأت بها.',mistakes:'يعيد أحدث الكلمات التي أخطأت بها.',notmastered:'يستبعد الكلمات المتقنة ويركز على الباقي.',smartmix:'40% أخطاء + 30% جديدة + 20% صعبة + 10% متقنة للتثبيت.',comprehensive:'اختبار شامل من جميع الصفوف.'")
s=s.replace("mode.onchange=refresh;grade.onchange=refresh;refresh();ROOT.querySelector('#beginQuiz').onclick=()=>{const m=mode.value,u=unit.value,c=Number(ROOT.querySelector('#quizCount').value),g=grade.value;if(m==='unit'&&!u)","mode.onchange=refresh;grade.onchange=refresh;unit.onchange=refresh;refresh();ROOT.querySelector('#beginQuiz').onclick=()=>{const m=mode.value,u=unit.value,l=lesson.value,c=Number(ROOT.querySelector('#quizCount').value),g=grade.value;if((m==='unit'||m==='lesson')&&!u)")
s=s.replace("{alert('اختر وحدة تحتوي كلمات أولًا');return}const q=buildQuizQuestions(g,m,u,c);","{alert('اختر وحدة تحتوي كلمات أولًا');return}if(m==='lesson'&&!l){alert('اختر درسًا يحتوي كلمات أولًا');return}const q=buildQuizQuestions(g,m,u,c,l);")
s=s.replace("runQuiz(g,m,u,c,0,0,q)","runQuiz(g,m,u,c,0,0,q,[],l)")

# Replace buildQuizQuestions with advanced version.
pat=re.compile(r"function buildQuizQuestions\(grade,mode,unit,count\)\{.*?\}\nfunction quizSetup",re.S)
m=pat.search(s)
if not m: raise SystemExit('buildQuizQuestions block missing')
new_build=r'''function buildQuizQuestions(grade,mode,unit,count,lesson=''){ensureProgress();let list=[];if(mode==='comprehensive'){list=[...db.words].filter(w=>w.word_en&&w.meaning_ar).sort((a,b)=>(Number(a.grade||99)-Number(b.grade||99))||(Number(a.id)-Number(b.id)))}else if(mode==='pdf'){list=learningPool(grade).filter(w=>String(w.source_page||'').trim()).sort((a,b)=>pageNum(a)-pageNum(b)||(Number(a.id)-Number(b.id)))}else if(mode==='unit'){list=learningPool(grade).filter(w=>String(w.unit||'')===unit)}else if(mode==='lesson'){list=learningPool(grade).filter(w=>String(w.unit||'')===unit&&String(w.lesson||'')===lesson)}else if(mode==='easy'){list=[...learningPool(grade)].sort((a,b)=>difficultyScore(a)-difficultyScore(b))}else if(mode==='studied'){list=learningPool(grade).filter(w=>db.studied.map(String).includes(String(w.id)))}else if(mode==='difficult'){list=difficultPool(grade)}else if(mode==='mistakes'){list=recentMistakesPool(grade)}else if(mode==='notmastered'){list=notMasteredPool(grade)}else if(mode==='smartmix'){list=smartMixedPool(grade)}else{list=[...learningPool(grade)].sort(()=>Math.random()-.5)}return count>0?list.slice(0,count):list}
function quizSetup'''
s=s[:m.start()]+new_build+s[m.end():]

# Extend runQuiz signature and tracking of wrong question ids/recent mistakes.
s=s.replace("function runQuiz(grade,mode,unit,count,i=0,score=0,questions=[]){","function runQuiz(grade,mode,unit,count,i=0,score=0,questions=[],wrongIds=[],lesson=''){")
s=s.replace("ROOT.querySelector('#again').onclick=()=>runQuiz(grade,mode,unit,count,0,0,buildQuizQuestions(grade,mode,unit,count));","ROOT.querySelector('#again').onclick=()=>runQuiz(grade,mode,unit,count,0,0,buildQuizQuestions(grade,mode,unit,count,lesson),[],lesson);")
# Add retry wrong button in result toolbar.
s=s.replace("<button id=\"newQuiz\" class=\"j-btn secondary\">اختبار جديد</button><button id=\"toReview\"","${wrongIds.length?'<button id=\"retryWrong\" class=\"j-btn secondary\">إعادة الأخطاء فقط</button>':''}<button id=\"newQuiz\" class=\"j-btn secondary\">اختبار جديد</button><button id=\"toReview\"")
s=s.replace("ROOT.querySelector('#newQuiz').onclick=quizSetup;ROOT.querySelector('#toReview')","const rw=ROOT.querySelector('#retryWrong');if(rw)rw.onclick=()=>{const q=wrongIds.map(id=>db.words.find(w=>String(w.id)===String(id))).filter(Boolean);runQuiz(grade,'mistakes','',0,0,0,q,[],lesson)};ROOT.querySelector('#newQuiz').onclick=quizSetup;ROOT.querySelector('#toReview')")
# Wrong answer bookkeeping and recursive call.
s=s.replace("if(!db.review.map(String).includes(id))db.review.push(w.id);db.mastered=db.mastered.filter(x=>String(x)!==id)}save();runQuiz(grade,mode,unit,count,i+1,score+(ok?1:0),questions)","if(!db.review.map(String).includes(id))db.review.push(w.id);db.mastered=db.mastered.filter(x=>String(x)!==id);if(!wrongIds.includes(id))wrongIds.push(id);db.recentMistakes=Array.isArray(db.recentMistakes)?db.recentMistakes:[];db.recentMistakes=[id,...db.recentMistakes.filter(x=>String(x)!==id)].slice(0,100)}persistActiveProgress();runQuiz(grade,mode,unit,count,i+1,score+(ok?1:0),questions,wrongIds,lesson)")

# Improve stats page with unit and lesson progress for active grade data.
old="<div class=\"j-results\">${G.map(g=>{const words=db.words.filter(w=>w.grade===g);const done=words.filter(w=>mastered.has(String(w.id))).length;const pct=words.length?Math.round(done/words.length*100):0;return `<div class=\"j-card\"><h3>الصف ${g}</h3><div class=\"j-progress\"><div style=\"width:${pct}%\"></div></div><p>${done} من ${words.length} • ${pct}%</p></div>`}).join('')}</div>"
new="<div class=\"j-results\">${G.map(g=>{const words=db.words.filter(w=>w.grade===g);const done=words.filter(w=>mastered.has(String(w.id))).length;const pct=words.length?Math.round(done/words.length*100):0;const units=[...new Set(words.map(w=>String(w.unit||'').trim()).filter(Boolean))];const details=units.slice(0,6).map(u=>{const p=progressByScope(g,u);return `<div class=\"j-meta\">${esc(u)}: ${p.done} من ${p.total}</div>`}).join('');return `<div class=\"j-card\"><h3>الصف ${g}</h3><div class=\"j-progress\"><div style=\"width:${pct}%\"></div></div><p>${done} من ${words.length} • ${pct}%</p>${details}</div>`}).join('')}</div>"
s=s.replace(old,new)

p.write_text(s,encoding='utf-8')
print('v352 advanced learning applied')
