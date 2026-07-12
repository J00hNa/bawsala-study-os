(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE, ui=window.MT_UI, data=window.MT_DATA, loopEngine=window.MT_STUDY_LOOP;
    if(!store || !ui || !data || !loopEngine) return;
    const today=()=>window.MT_SECURITY.localDate();
    const fmtDate = new Intl.DateTimeFormat('ar-JO',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const mission=()=>store.get('dashboard:mission',null);
    const missionText=(m=mission())=>loopEngine.missionText(m);
    const sessions=()=>store.get('study:sessions',[]);
    const loopState=()=>loopEngine.fromStore(store,today());
    const todaySessions=()=>loopState().sessions;
    const homeworks=()=>store.get('homeworks',[]);
    const errors=()=>store.get('errors',[]);
    const cards=()=>store.get('notebook:flashcards',[]).filter(c=>!c.archived);
    const dueCards=()=>cards().filter(c=>new Date(c.dueAt || Date.now())<=new Date());
    const habits=()=>store.get('student:habits',[]);
    const plan=()=>store.get('dashboard:weeklyPlan',null);
    function pct(){ const p=plan(); return p?.items?.length?Math.round(p.items.filter(x=>x.done).length/p.items.length*100):0; }
    function profile(){ return store.activeProfile(); }
    function studiedMinutes(){ return sessions().reduce((a,s)=>a+(Number(s.minutes)||0),0); }
    function openTasks(){ return homeworks().filter(x=>!x.done); }
    function weakSubject(){ return profile().weakSubject || mission()?.subject || openTasks()[0]?.subject || 'أضعف مادة عندك'; }
    function smartSuggestion(){
      const p=profile(), open=openTasks(), due=dueCards(), err=errors().filter(e=>e.status!=='انتهى'), todayMin=todaySessions().reduce((a,s)=>a+(Number(s.minutes)||0),0);
      if(!missionText()) return {title:'ابدأ بتحديد مهمة واحدة فقط',why:'لأنك بدون مهمة واضحة ستتنقل بين المصادر وتخدع نفسك أنك تدرس.',action:`اكتب مهمة في ${weakSubject()} مدتها ${Math.max(25,Math.min(50,(p.dailyHours||2)*20))} دقيقة: شرح قصير + 15 سؤال + خطأ واحد.`};
      if(todayMin<20) return {title:'ابدأ جلسة تركيز قبل أي مصدر جديد',why:`لأنك سجلت اليوم ${todayMin} دقيقة فقط، وهذا لا يكفي ليظهر تقدم حقيقي.`,action:`نفذ المهمة الحالية لمدة ${mission()?.minutes||25} دقيقة ثم سجل العائق أو الخطأ.`};
      if(due.length>0) return {title:'راجع البطاقات المستحقة قبل إضافة محتوى جديد',why:`عندك ${due.length} بطاقة مستحقة. تراكم البطاقات يعني أنك تجمع معرفة ولا تثبتها.`,action:'افتح فلاش كاردز في غرفة الدراسة وراجع 10 بطاقات فقط.'};
      if(err.length>0) return {title:'اشتغل على خطأ سابق بدل درس جديد',why:`دفتر الأخطاء فيه ${err.length} خطأ غير منتهٍ. تكرار الخطأ أخطر من بطء التقدم.`,action:'اختر خطأ واحداً وحوله إلى مهمة اليوم أو فلاش كارد.'};
      if(open.length>0) return {title:'حوّل أقرب واجب إلى مهمة قابلة للإنجاز',why:`عندك ${open.length} واجبات مفتوحة. القائمة الطويلة لا تنجز نفسها.`,action:`ابدأ بـ: ${open[0].title} — مدة واحدة فقط ثم قيّم.`};
      return {title:'اليوم مناسب لمراجعة خفيفة لا إضافة مصادر',why:'لا توجد مؤشرات ضغط قوية الآن، فالأفضل تثبيت ما عندك.',action:'راجع دفتر الأخطاء 20 دقيقة واكتب قرار الغد.'};
    }
    function renderLaunchChecklist(){
      const el=document.getElementById('launchChecklist');
      if(!el) return;
      const notes=store.get('notebook:notes',[])||[];
      const auth=!!window.BAWSALA_BACKEND?.state?.authenticated;
      const steps=[
        {done:auth,title:'أنشئ حسابًا للمزامنة',text:'يحمي انتقالك بين الأجهزة ويفتح مركز الدعم.',href:'login.html'},
        {done:!!missionText(),title:'حدد مهمة اليوم',text:'مهمة واحدة بمدة ومخرج واضح.',href:'workspace.html#mission'},
        {done:sessions().some(item=>(Number(item.minutes)||0)>=5),title:'أنهِ أول جلسة تركيز',text:'خمس دقائق على الأقل تثبت أن النظام دخل مرحلة التنفيذ.',href:'workspace.html#focus'},
        {done:notes.length>0 || errors().length>0 || cards().length>0,title:'احفظ أول أثر تعلم',text:'ملاحظة أو خطأ أو بطاقة مراجعة.',href:'notebook.html'}
      ];
      const completed=steps.filter(item=>item.done).length;
      const percent=Math.round(completed/steps.length*100);
      el.innerHTML=`<article class="card activation-panel"><div class="activation-panel__head"><div><span class="badge ${completed===steps.length?'green':'teal'}">بدء الاستخدام ${completed}/${steps.length}</span><h2>${completed===steps.length?'أصبحت جاهزًا للاستخدام اليومي.':'أكمل إعداد بوصلة في دقائق.'}</h2><p class="muted">لا جولة طويلة. أربع إشارات فقط تثبت أن الحساب والأدوات يعملان معك.</p></div><div class="activation-ring" role="img" aria-label="اكتمل ${percent}%"><strong>${percent}%</strong></div></div><div class="activation-steps">${steps.map((item,index)=>`<a class="activation-step ${item.done?'done':''}" href="${ui.escapeAttr(item.href)}"><b>${item.done?'✓':index+1}</b><span><strong>${ui.escapeHTML(item.title)}</strong><small>${ui.escapeHTML(item.text)}</small></span></a>`).join('')}</div></article>`;
    }
    function renderSummary(){
      const el=document.getElementById('dashboardSummary');
      const p=profile();
      const items=[
        ['البروفايل',p.name||'طالب','المسار: '+(p.track||'غير محدد')],
        ['وقت الدراسة',Math.round(studiedMinutes()/60)+'س',`اليوم: ${todaySessions().reduce((a,s)=>a+(Number(s.minutes)||0),0)} دقيقة`],
        ['الواجبات',openTasks().length,'مفتوحة الآن'],
        ['الأخطاء',errors().filter(e=>e.status!=='انتهى').length,'تحتاج مراجعة'],
        ['البطاقات',dueCards().length,'مستحقة اليوم'],
        ['الخطة',pct()+'%','تقدم أسبوعي']
      ];
      el.innerHTML=items.map(x=>`<article class="stat dashboard-mini"><span>${ui.escapeHTML(x[0])}</span><b>${ui.escapeHTML(String(x[1]))}</b><small>${ui.escapeHTML(x[2])}</small></article>`).join('');
    }
    function executionGuard(){ return store.get('dashboard:executionGuard', null); }
    function sourceBudget(){ return store.get('study:sourceBudget', null); }
    function sourceLimit(){ return loopEngine.sourceLimit(sourceBudget()||{},executionGuard()||{}); }
    function selectedSources(){ return loopEngine.selectedSources(sourceBudget()||{},executionGuard()||{}); }
    function sourceText(){ return selectedSources().join('، '); }
    function cleanSourceLines(value){ return String(value||'').split(/[\n،,]+/).map(x=>window.MT_SECURITY.cleanText(x,120)).filter(Boolean).slice(0,3); }
    function riskSignals(){
      const list=[];
      const open=openTasks().length;
      const due=dueCards().length;
      const unfinishedErrors=errors().filter(e=>e.status!=='انتهى').length;
      const todayMin=todaySessions().reduce((a,s)=>a+(Number(s.minutes)||0),0);
      if(!missionText()) list.push(['red','لا توجد مهمة اليوم','أي أداة ستفتحها الآن ستزيد الفوضى.']);
      if(missionText() && selectedSources().length===0) list.push(['red','لا توجد مصادر محددة','بدون سقف مصادر سترجع لجمع الروابط بدل التنفيذ.']);
      if(todayMin===0) list.push(['red','صفر دقيقة دراسة اليوم','الواجهة لا تعني أنك درست.']);
      if(open>5) list.push(['orange',`${open} واجبات مفتوحة`,'القائمة صارت مخزن قلق، لا خطة.']);
      if(due>20) list.push(['orange',`${due} بطاقات مستحقة`,'أنت تضيف أكثر مما تراجع.']);
      if(unfinishedErrors>8) list.push(['orange',`${unfinishedErrors} أخطاء غير منتهية`,'الخطأ المتكرر أهم من درس جديد.']);
      if(list.length===0) list.push(['green','لا توجد إشارة خطر واضحة','لا تضف أدوات؛ أكمل حلقة واحدة فقط.']);
      return list.slice(0,4);
    }
    function nextExecutionHref(){ return `workspace.html#${loopEngine.nextAction(loopState()).key}`; }
    function renderExecutionGuard(){
      const el=document.getElementById('executionGuard');
      if(!el) return;
      const guard=executionGuard() || {};
      const risks=riskSignals();
      const suggested=smartSuggestion();
      el.innerHTML=`<article class="card execution-card">
        <div class="execution-head"><div><span class="badge red">Execution Guard</span><h2>عقد تنفيذ اليوم</h2><p class="muted">اكتب قراراً صغيراً. أي شيء لا يخدمه اليوم ممنوع. هذه ليست مساحة أحلام؛ هذه مساحة تنفيذ.</p></div><a class="btn primary" href="${ui.escapeAttr(nextExecutionHref())}">نفّذ الآن</a></div>
        <div class="risk-grid">${risks.map(r=>`<div class="risk-chip ${ui.escapeAttr(r[0])}"><strong>${ui.escapeHTML(r[1])}</strong><span>${ui.escapeHTML(r[2])}</span></div>`).join('')}</div>
        <form class="form-grid" id="executionGuardForm">
          <label class="field"><span>قرار اليوم الإجباري</span><textarea name="purpose" rows="3" placeholder="مثلاً: أنهي درس الاشتقاق + 20 سؤال + أسجل 3 أخطاء">${ui.escapeHTML(guard.purpose || missionText() || suggested.action)}</textarea></label>
          <div class="field-row"><label class="field"><span>سقف المصادر</span><input name="sourceLimit" type="number" min="1" max="3" value="${sourceLimit()}"></label><label class="field"><span>دقائق التنفيذ</span><input name="minutes" type="number" min="10" max="180" value="${ui.clampNumber(guard.minutes || mission()?.minutes,10,180,30)}"></label></div>
          <label class="field"><span>المصادر المسموحة اليوم فقط</span><textarea name="sources" rows="3" placeholder="اكتب مصدرين فقط، كل مصدر في سطر">${ui.escapeHTML(sourceText())}</textarea></label>
          <div class="field-row"><label class="field"><span>ممنوع اليوم</span><input name="forbidden" value="${ui.escapeAttr(guard.forbidden || 'فتح مصادر جديدة قبل أول جلسة')}"></label><label class="field"><span>العائق المتوقع</span><input name="blocker" value="${ui.escapeAttr(guard.blocker || '')}" placeholder="هاتف، فيديوهات كثيرة، واجب طويل..."></label></div>
          <div class="actions"><button class="btn primary" type="submit">ثبّت القرار كمهمة</button><button class="btn danger" id="resetExecutionGuard" type="button">امسح العقد</button></div>
        </form>
      </article>`;
      el.querySelector('#executionGuardForm').addEventListener('submit',e=>{
        e.preventDefault();
        const f=e.currentTarget;
        const purpose=f.purpose.value.trim();
        if(!purpose){ ui.toast('قرار فارغ يعني لا يوجد قرار. اكتب مهمة محددة.'); return; }
        const guardData={purpose,sourceLimit:ui.clampNumber(f.sourceLimit.value,1,3,2),minutes:ui.clampNumber(f.minutes.value,10,180,30),forbidden:f.forbidden.value,blocker:f.blocker.value,updatedAt:new Date().toISOString()};
        const sources=cleanSourceLines(f.sources.value).slice(0, guardData.sourceLimit);
        store.set('dashboard:executionGuard', guardData);
        store.set('study:sourceBudget',{date:today(),limit:guardData.sourceLimit,sources,rule:guardData.forbidden,updatedAt:new Date().toISOString()});
        setMission({text:purpose,subject:weakSubject(),minutes:guardData.minutes});
        renderAll();
        ui.toast('تم تثبيت قرار اليوم. الآن نفذ، لا تجمع أدوات.');
      });
      el.querySelector('#resetExecutionGuard').addEventListener('click',()=>{ store.remove('dashboard:executionGuard'); renderAll(); });
    }
    function renderSuggestion(){
      const s=smartSuggestion();
      const box=document.getElementById('smartSuggestion');
      box.innerHTML=`<span class="badge blue">اقتراح محلي ذكي</span><h2>اقتراح ذكي لليوم</h2><h3>${ui.escapeHTML(s.title)}</h3><p class="muted"><strong>لماذا؟</strong> ${ui.escapeHTML(s.why)}</p><div class="notice success"><strong>ماذا تعمل الآن؟</strong><br>${ui.escapeHTML(s.action)}</div><div class="actions"><a class="btn primary" href="workspace.html#flow">نفّذ في غرفة الدراسة</a><button class="btn secondary" id="useSuggestion" type="button">حوّله لمهمة</button></div>`;
      box.querySelector('#useSuggestion').addEventListener('click',()=>{ setMission({text:s.action,subject:weakSubject(),minutes:30}); renderAll(); ui.toast('تم تحويل الاقتراح إلى مهمة اليوم'); });
    }
    function scheduleItems(){
      const hours=Math.max(.5,Math.min(8,Number(profile().dailyHours)||2));
      const block=hours<1.5?20:hours<3?30:40;
      const m=missionText()||`تأسيس ${weakSubject()} + 15 سؤال`;
      const open=openTasks();
      const due=dueCards();
      return [
        {time:'0:00',title:'تهيئة سريعة',text:'افتح فقط غرفة الدراسة وحدد المهمة. ابدأ بالمهمة مباشرة، واترك المصادر المشتتة لما بعد تحديد المطلوب.'},
        {time:`0:05`,title:'جلسة تركيز أولى',text:m,minutes:block},
        {time:`0:${String(5+block).padStart(2,'0')}`,title:'تسجيل الخطأ',text:'اكتب خطأ واحداً وطريقة منعه. هذا يقلل احتمال تكرار الخطأ في الجلسة التالية.'},
        {time:`0:${String(15+block).padStart(2,'0')}`,title:due.length?'فلاش كاردز':'واجب/أسئلة',text:due.length?`راجع ${Math.min(10,due.length)} بطاقات مستحقة.`:(open[0]?.title || 'حل 15 سؤالاً من المصدر المختار.')},
        {time:'نهاية',title:'تقرير اليوم',text:'انسخ التقرير أو اكتب قرار الغد.'}
      ];
    }
    function renderSchedule(){
      const el=document.getElementById('dailySchedule');
      el.innerHTML=scheduleItems().map((x,i)=>`<div class="timeline-item"><b>${i+1}</b><div class="card compact"><span class="pill">${ui.escapeHTML(x.time)}</span><h3>${ui.escapeHTML(x.title)}</h3><p class="muted">${ui.escapeHTML(x.text)}</p></div></div>`).join('');
    }
    function createPlan(){
      const subject=weakSubject();
      const items=[
        `اليوم 1: اختر درساً واحداً في ${subject} وافهم فكرته الأساسية`,
        `اليوم 2: حل أسئلة سهلة وسجل 3 أخطاء`,
        `اليوم 3: حوّل أخطاء الأمس إلى فلاش كاردز`,
        `اليوم 4: جولة تدريب مؤقتة 30 دقيقة`,
        `اليوم 5: خريطة ذهنية للدرس أو الوحدة`,
        `اليوم 6: نموذج قصير أو واجب متراكم`,
        `اليوم 7: تقرير أسبوعي وقرار الأسبوع القادم`
      ].map((text,i)=>({id:store.cryptoId(),day:i+1,text,done:false}));
      store.set('dashboard:weeklyPlan',{createdAt:new Date().toISOString(),items});
    }
    function renderPlan(){
      const el=document.getElementById('weeklyPlan'); const p=plan();
      if(!p){ el.innerHTML='<div class="empty">لا توجد خطة أسبوعية. ولّد خطة مبنية على أضعف مادة عندك.</div>'; return; }
      el.innerHTML=p.items.map(item=>`<label class="checkline weekly-item"><input type="checkbox" data-week="${ui.escapeAttr(item.id)}" ${item.done?'checked':''}><span>اليوم ${item.day}: ${ui.escapeHTML(item.text)}</span></label>`).join('');
      el.querySelectorAll('[data-week]').forEach(ch=>ch.addEventListener('change',()=>{ const next=plan(); next.items=next.items.map(x=>x.id===ch.dataset.week?{...x,done:ch.checked}:x); store.set('dashboard:weeklyPlan',next); renderAll(); }));
    }
    function renderHabits(){
      const el=document.getElementById('habitsList');
      const list=habits();
      el.innerHTML=list.length?list.map(h=>`<article class="habit-row"><div><strong>${ui.escapeHTML(h.name||h.title)}</strong><small>سلسلة: ${h.streak||0} أيام · آخر إنجاز: ${ui.escapeHTML(h.lastDone||'لم يسجل')}</small></div><div class="actions"><button class="btn sm primary" data-habit-done="${ui.escapeAttr(h.id)}" type="button">أنجزت</button><button class="btn sm danger" data-habit-del="${ui.escapeAttr(h.id)}" type="button">حذف</button></div></article>`).join(''):'<div class="empty">أضف عادة واحدة فقط. ابدأ بعادة واحدة قابلة للتنفيذ، ثم أضف غيرها بعد أن تثبت الأولى.</div>';
      el.querySelectorAll('[data-habit-done]').forEach(b=>b.addEventListener('click',()=>{ store.updateCollection('student:habits',b.dataset.habitDone,h=>({...h,streak:(h.lastDone===today()?h.streak||0:(h.streak||0)+1),lastDone:today()})); renderAll(); }));
      el.querySelectorAll('[data-habit-del]').forEach(b=>b.addEventListener('click',()=>{ store.deleteFromCollection('student:habits',b.dataset.habitDel); renderAll(); }));
    }
    function setMission(payload){
      const text=String(payload.text || payload.mission || '').trim();
      if(!text) return null;
      const clean={...payload,text,mission:text,subject:payload.subject||'',minutes:ui.clampNumber(payload.minutes,5,180,25),status:'ready',date:today(),createdAt:payload.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      return window.BAWSALA_STUDY?.saveMission?.(clean) || store.set('dashboard:mission',clean);
    }
    function renderJourney(){
      const el=document.getElementById('dashboardJourney');
      if(!el) return;
      const journey=window.BAWSALA_STUDY?.overview?.();
      if(!journey){ el.innerHTML=''; return; }
      const priority=journey.priority;
      const steps=journey.loop?.steps||[];
      const syncState=window.BAWSALA_BACKEND?.state;
      const syncLabel=!syncState?.authenticated?'محلي على هذا الجهاز':syncState.syncing?'جارٍ الحفظ':syncState.pendingSync||window.BAWSALA_STUDY?.state?.lastCommitError?'الحفظ معلّق':'محفوظ على الحساب';
      const href=priority?.target==='flashcards'?'flashcards.html#review':window.BAWSALA_STUDY?.continueHref?.()||'workspace.html#flow';
      const warnings=journey.warnings||[];
      el.innerHTML=`<article class="card journey-control"><div class="journey-control__hero"><div><span class="badge teal">مسار واحد بين الصفحات</span><h2>${ui.escapeHTML(priority?.title||'حدد مهمة واحدة لليوم')}</h2><p>${ui.escapeHTML(priority?.reason||journey.loop?.nextAction?.reason||'لا تنتقل إلى أداة جديدة قبل تحديد الخطوة التالية.')}</p><div class="journey-origin-row"><span class="sync-state ${syncState?.pendingSync?'warn':syncState?.authenticated?'ok':'local'}">${ui.escapeHTML(syncLabel)}</span>${journey.continuation?`<span class="pill">قادمة من: ${ui.escapeHTML(journey.continuation.kind||'دراسة')}</span>`:''}</div></div><div class="journey-score" role="img" aria-label="اكتمل ${journey.loop?.percent||0}%"><strong>${journey.loop?.percent||0}%</strong><small>${journey.loop?.done||0}/${journey.loop?.total||4} خطوات</small></div></div><div class="journey-step-grid">${steps.map((step,index)=>`<div class="journey-step ${step.done?'done':'next'}"><b>${step.done?'✓':index+1}</b><span>${ui.escapeHTML(step.label||step.key||'خطوة')}</span></div>`).join('')}</div><div class="journey-metrics"><span><b>${journey.focus?.minutes||0}</b> دقيقة اليوم</span><span><b>${journey.counts?.openHomeworks||0}</b> واجب مفتوح</span><span><b>${journey.counts?.dueCards||0}</b> بطاقة مستحقة</span><span><b>${journey.counts?.todayErrors||0}</b> خطأ اليوم</span></div>${warnings.length?`<div class="journey-warnings">${warnings.map(item=>`<span>${ui.escapeHTML(item.message)}</span>`).join('')}</div>`:''}<div class="actions"><a class="btn primary" href="${ui.escapeAttr(href)}">${ui.escapeHTML(journey.loop?.nextAction?.label||'تابع المسار')}</a>${journey.continuation?'<button class="btn secondary" id="clearJourneyContext" type="button">إغلاق العمل المفتوح</button>':''}</div></article>`;
      el.querySelector('#clearJourneyContext')?.addEventListener('click',()=>{ window.BAWSALA_STUDY?.clearContinuation?.(); renderAll(); ui.toast('تم إغلاق سياق الدراسة المفتوح'); });
    }
    function renderMission(){
      const m=mission();
      const box=document.getElementById('missionPreview');
      const form=document.getElementById('missionForm');
      if(m){ box.innerHTML=`<strong>${ui.escapeHTML(missionText(m))}</strong><br><span class="fine">${m.minutes||25} دقيقة · ${ui.escapeHTML(m.subject||'بدون مادة')}</span>`; form.missionText.value=missionText(m); form.missionMinutes.value=m.minutes||25; form.missionSubject.value=m.subject||''; }
      else { box.textContent='لا توجد مهمة محفوظة بعد.'; }
    }
    function reportText(){
      const sug=smartSuggestion();
      return ['تقرير بوصلة المختصر',`التاريخ: ${fmtDate.format(new Date())}`,`الطالب: ${profile().name||'طالب'}`,`مهمة اليوم: ${missionText()||'غير محددة'}`,`مصادر اليوم: ${sourceText() || 'غير محددة'}`,`جلسات اليوم: ${todaySessions().length}`,`واجبات مفتوحة: ${openTasks().length}`,`بطاقات مستحقة: ${dueCards().length}`,`تقدم الأسبوع: ${pct()}%`,`اقتراح اليوم: ${sug.title}`,`الخطوة: ${sug.action}`].join('\n');
    }
    function renderReport(){ document.getElementById('studentReport').textContent=reportText(); }
    function renderAll(){ renderJourney(); renderLaunchChecklist(); renderSummary(); renderExecutionGuard(); renderSuggestion(); renderSchedule(); renderPlan(); renderHabits(); renderMission(); renderReport(); }
    document.getElementById('habitForm').addEventListener('submit',e=>{ e.preventDefault(); const f=e.currentTarget; const name=f.habitName.value.trim(); if(!name){ ui.toast('اكتب اسم عادة واضح'); return; } store.addToCollection('student:habits',{name,title:name,streak:0,lastDone:''}); f.reset(); renderAll(); });
    document.getElementById('generateSprint').addEventListener('click',()=>{ createPlan(); renderAll(); ui.toast('تم توليد خطة أسبوعية'); });
    document.getElementById('resetSprint').addEventListener('click',()=>{ store.remove('dashboard:weeklyPlan'); renderAll(); });
    document.getElementById('turnScheduleMission').addEventListener('click',()=>{ const first=scheduleItems()[1]; setMission({text:first.text,subject:weakSubject(),minutes:first.minutes||25}); renderAll(); ui.toast('تم تحويل أول جلسة إلى مهمة اليوم'); });
    document.getElementById('missionForm').addEventListener('submit',e=>{ e.preventDefault(); const f=e.currentTarget; if(!f.missionText.value.trim()){ ui.toast('اكتب مهمة واضحة'); return; } setMission({text:f.missionText.value,minutes:f.missionMinutes.value,subject:f.missionSubject.value}); renderAll(); ui.toast('تم حفظ مهمة اليوم'); });
    document.getElementById('copyStudentReport').addEventListener('click',()=>ui.copyText(reportText(),'تم نسخ التقرير'));
    document.getElementById('sendStudentReport').addEventListener('click',()=>ui.openWhatsApp(reportText()));
    renderAll();
    window.addEventListener('bawsala:auth',renderAll);
    window.addEventListener('mt:storage',()=>requestAnimationFrame(renderAll));
    window.addEventListener('bawsala:study-change',renderAll);
    window.addEventListener('bawsala:study-remote',renderAll);
    window.addEventListener('bawsala:sync',renderAll);
  });
})();
