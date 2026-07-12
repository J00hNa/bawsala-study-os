(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE;
    const ui=window.MT_UI;
    const data=window.MT_DATA;
    const loopEngine=window.MT_STUDY_LOOP;
    const focusTimerEngine=window.MT_FOCUS_TIMER;
    if(!store || !ui || !data || !loopEngine || !focusTimerEngine) return;

    const coreTools = [
      ['flow','تدفق اليوم','1',flowTool],
      ['mission','مهمة اليوم','◆',missionTool],
      ['focus','جلسة تركيز','◷',focusTool],
      ['errors','دفتر الأخطاء','!',errorsTool],
      ['review','تقرير اليوم','↳',reviewTool]
    ];
    const taskTools = [
      ['homework','الواجبات اليومية','✓',homeworkTool],
      ['rounds','جولات الدراسة','◴',roundsTool],
      ['habits','متتبع العادات','▦',habitsTool]
    ];
    const notebookTools = [
      ['notes','ملاحظات','✎',notesTool],
      ['journal','يوميات','☰',journalTool],
      ['flashcards','فلاش كاردز','▱',flashcardsTool],
      ['mindmap','خرائط ذهنية','◎',mindmapTool]
    ];
    const learningTools = [
      ['drill','تدريب امتحان','#',drillTool],
      ['lectures','محاضرات قصيرة','◈',lecturesTool]
    ];
    const btecAiTools = [
      ['btec','BTEC','B',btecTool],
      ['schoolmind','SchoolMind AI','AI',schoolmindTool]
    ];
    const libraryToolDef = ['library','مكتبة الأدوات','+',libraryTool];
    const allTools = [...coreTools, libraryToolDef, ...taskTools, ...notebookTools, ...learningTools, ...btecAiTools];
    const coreKeys = new Set([...coreTools.map(([key])=>key),'library']);
    const tools = Object.fromEntries(allTools.map(([key,title,icon,render])=>[key,{title,icon,render}]));
    let cleanupTool=()=>{};
    const nav=document.getElementById('workspaceNav');
    const panel=document.getElementById('workspacePanel');
    const profileName=document.getElementById('workspaceProfile');
    const statsBox=document.getElementById('workspaceMiniStats');
    const focusSummary=document.getElementById('workspaceFocusSummary');
    const nextAction=document.getElementById('workspaceNextAction');

    function today(){ return window.MT_SECURITY.localDate(); }
    function sourceBudget(){ return store.get('study:sourceBudget',null); }
    function sourceLimit(){ return loopEngine.sourceLimit(sourceBudget()||{},store.get('dashboard:executionGuard',null)||{}); }
    function selectedSources(){ return loopEngine.selectedSources(sourceBudget()||{},store.get('dashboard:executionGuard',null)||{}); }
    function sourceText(){ return selectedSources().join('، '); }
    function cleanInput(value,max=220){ return window.MT_SECURITY.cleanText(value,max); }
    function hasText(value){ return cleanInput(value,1000).length>0; }
    function sortByDue(list){ return [...list].sort((a,b)=>String(a.due||'9999-99-99').localeCompare(String(b.due||'9999-99-99')) || String(b.createdAt||'').localeCompare(String(a.createdAt||''))); }
    function dueMeta(due){
      if(!due) return {label:'بدون موعد',cls:'gray'};
      const diff=Math.ceil((new Date(`${due}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
      if(diff < 0) return {label:`متأخر ${Math.abs(diff)} يوم`,cls:'red'};
      if(diff === 0) return {label:'اليوم',cls:'red'};
      if(diff === 1) return {label:'غداً',cls:'orange'};
      return {label:`بعد ${diff} أيام`,cls:'blue'};
    }
    function focusFirstInvalid(form){ const target=form.querySelector(':invalid') || form.querySelector('input,textarea,select'); target?.focus(); }
    function setSourceBudget(payload={}){
      const limit=ui.clampNumber(payload.limit || sourceLimit(),1,3,2);
      const raw=Array.isArray(payload.sources) ? payload.sources : splitTags(payload.sourceText || payload.sourcesText || '');
      const sources=raw.map(x=>window.MT_SECURITY.cleanText(x,120)).filter(Boolean).slice(0,limit);
      const clean={date:today(),limit,sources,rule:payload.rule || store.get('dashboard:executionGuard',null)?.forbidden || 'لا مصدر ثالث قبل أول جلسة',updatedAt:new Date().toISOString()};
      return window.BAWSALA_STUDY?.saveSourceBudget?.(clean) || store.set('study:sourceBudget',clean);
    }
    const routeAliases={mindmaps:'mindmap',map:'mindmap',notebook:'notes',notebooks:'notes',note:'notes',cards:'flashcards',card:'flashcards',journaled:'journal',study:'homework',homeworks:'homework',hw:'homework',timer:'focus',pomodoro:'focus',report:'review',daily:'flow',today:'flow',planner:'flow',tools:'library',library:'library',ai:'schoolmind',schoolmindai:'schoolmind'};
    function rawActiveKey(){ return (location.hash||'#flow').slice(1).trim().toLowerCase().replace(/[^a-z0-9_-]/g,''); }
    function canonicalKey(key){ return tools[key] ? key : (routeAliases[key] && tools[routeAliases[key]] ? routeAliases[key] : 'flow'); }
    function activeKey(){ return canonicalKey(rawActiveKey()); }
    function normalizeHash(){ const raw=rawActiveKey(); const key=canonicalKey(raw); if(raw!==key) history.replaceState(null,'',`#${key}`); return key; }
    function routeStatus(){ let node=document.getElementById('workspaceRouteStatus'); if(!node && panel){ node=document.createElement('div'); node.id='workspaceRouteStatus'; node.className='sr-only'; node.setAttribute('role','status'); node.setAttribute('aria-live','polite'); panel.before(node); } return node; }
    function mission(){ return store.get('dashboard:mission',null); }
    function missionText(m=mission()){ return loopEngine.missionText(m); }
    function loopSnapshot(){ return loopEngine.fromStore(store,today()); }
    function todaySessions(){ return loopSnapshot().sessions; }
    function actionableErrors(){ return loopSnapshot().errors; }
    function todayReviews(){ return loopSnapshot().reviews; }
    function todayMinutes(){ return loopSnapshot().minutes; }
    function dailyGoalMinutes(){ return ui.clampNumber(store.get('user:preferences',{}).dailyGoal,10,600,120); }
    function dueCards(){ return store.get('notebook:flashcards',[]).filter(card=>new Date(card.dueAt || Date.now()) <= new Date()).length; }
    function openHomework(){ return store.get('homeworks',[]).filter(x=>!x.done).length; }
    function studyStreak(){
      const days=new Set(store.get('study:sessions',[]).filter(s=>ui.clampNumber(s.minutes,0,600,0)>=5).map(s=>loopEngine.localDateOf(s.finishedAt||s.createdAt)).filter(Boolean));
      let streak=0; const d=new Date(`${today()}T12:00:00`);
      while(days.has(window.MT_SECURITY.localDate(d))){ streak++; d.setDate(d.getDate()-1); }
      return streak;
    }
    function sessionQuality(){
      const sessions=todaySessions();
      if(!sessions.length) return 0;
      const weighted=sessions.reduce((sum,s)=>sum + ui.clampNumber(s.focusScore,1,5,3),0) / sessions.length;
      return Math.round(weighted*20);
    }
    function missionQuality(value){
      const text=cleanInput(value,900);
      let score=0;
      if(text.length>=24) score+=25;
      if(/\d|سؤال|تمرين|صفحة|دقيقة|اختبار|واجب/.test(text)) score+=25;
      if(/أحل|أراجع|أكتب|ألخص|أطبق|أختبر|أنجز|solve|review|write|practice/i.test(text)) score+=25;
      if(selectedSources().length || /\n|،|,/.test(sourceText())) score+=25;
      return Math.min(100,score);
    }
    function metricStrip(items){
      return `<div class="workspace-metric-strip">${items.map(item=>`<span class="workspace-metric ${item.cls||''}"><b>${ui.escapeHTML(item.value)}</b><small>${ui.escapeHTML(item.label)}</small></span>`).join('')}</div>`;
    }
    function qualityBar(score,label){ return `<div class="quality-meter ${score>=75?'good':score>=45?'warn':'bad'}"><span>${ui.escapeHTML(label)}</span><b>${ui.clampNumber(score,0,100,0)}%</b><i data-progress="${ui.clampNumber(score,0,100,0)}"></i></div>`; }
    function paintProgress(root=panel){ root.querySelectorAll('[data-progress]').forEach(node=>node.style.setProperty('width', `${ui.clampNumber(node.dataset.progress,0,100,0)}%`)); }
    function dateOnly(value){ return String(value||'').slice(0,10); }
    function todayIso(){ return new Date().toISOString(); }
    function ageLabel(value){ const d=dateOnly(value); return d || 'اليوم'; }
    function badgeForDue(due){ const meta=dueMeta(due); return `<span class="badge ${ui.escapeAttr(meta.cls)}">${ui.escapeHTML(meta.label)}</span>`; }
    function safeSourceList(){ return selectedSources().map(x=>`<span class="pill">${ui.escapeHTML(x)}</span>`).join('') || '<span class="pill danger">غير محددة</span>'; }
    function sevenDayWindow(){
      const days=[]; const base=new Date(`${today()}T12:00:00`);
      for(let i=6;i>=0;i--){ const d=new Date(base); d.setDate(base.getDate()-i); days.push(window.MT_SECURITY.localDate(d)); }
      return days;
    }
    function weekTrend(){
      const sessions=store.get('study:sessions',[]);
      const days=sevenDayWindow();
      const map=Object.fromEntries(days.map(d=>[d,{date:d,minutes:0,sessions:0,quality:0}]));
      sessions.forEach(s=>{ const d=loopEngine.localDateOf(s.finishedAt||s.createdAt); if(!map[d]) return; const minutes=ui.clampNumber(s.minutes,0,600,0); map[d].minutes+=minutes; map[d].sessions+=minutes>=5?1:0; map[d].quality+=ui.clampNumber(s.focusScore,1,5,3); });
      return days.map(d=>{ const item=map[d]; return {...item,quality:item.sessions?Math.round((item.quality/item.sessions)*20):0}; });
    }
    function weekMinutes(){ return weekTrend().reduce((sum,d)=>sum+d.minutes,0); }
    function loopStatus(){ return loopSnapshot(); }
    function loopLabel(status=loopStatus()){
      if(status.done===status.total) return {label:'مكتملة',cls:'good'};
      if(status.done>=2) return {label:`${status.done} من ${status.total}`,cls:'warn'};
      return {label:`${status.done} من ${status.total}`,cls:'bad'};
    }
    function riskFlags(){
      const flags=[];
      const overdue=store.get('homeworks',[]).filter(h=>!h.done && h.due && dueMeta(h.due).cls==='red').length;
      if(!missionText()) flags.push(['مهمة اليوم غير مكتوبة','ابدأ من مهمة قابلة للقياس','#mission','bad']);
      if(!selectedSources().length) flags.push(['مصادر اليوم غير محددة','حدد مصدرين فقط قبل أي أداة','#mission','bad']);
      if(todaySessions().length===0) flags.push(['لا يوجد دليل دراسة اليوم','شغّل جلسة تركيز واحفظها','#focus','warn']);
      if(overdue) flags.push([`${overdue} واجبات متأخرة`,'حوّل واجباً واحداً لمهمة الآن','#homework','bad']);
      if(dueCards()>12) flags.push([`${dueCards()} بطاقات متراكمة`,'راجع 10 بطاقات فقط ثم توقف','#flashcards','warn']);
      if(actionableErrors().length===0) flags.push(['دفتر الأخطاء فارغ','سجل خطأ واحد مع طريقة منع','#errors','warn']);
      if(todayReviews().length===0 && todayMinutes()>=15) flags.push(['لا يوجد تقرير إغلاق','اكتب قرار الغد قبل نهاية اليوم','#review','warn']);
      return flags.slice(0,5);
    }
    function riskPanel(){
      const flags=riskFlags();
      if(!flags.length) return '<div class="risk-panel success"><strong>لا توجد ثغرات حرجة اليوم.</strong><span>استمر بدون توسيع نطاق الأدوات.</span></div>';
      return `<div class="risk-panel">${flags.map(([title,hint,href,cls])=>`<a class="risk-flag ${ui.escapeAttr(cls)}" href="${ui.escapeAttr(href)}"><strong>${ui.escapeHTML(title)}</strong><span>${ui.escapeHTML(hint)}</span></a>`).join('')}</div>`;
    }
    function heatmap(){
      const days=weekTrend();
      return `<div class="week-heatmap" aria-label="نشاط آخر سبعة أيام">${days.map(day=>{ const level=day.minutes>=dailyGoalMinutes()?3:day.minutes>=30?2:day.minutes>0?1:0; return `<span data-level="${level}" title="${ui.escapeAttr(day.date)} · ${day.minutes} دقيقة"><b>${ui.escapeHTML(day.date.slice(5))}</b><i>${ui.escapeHTML(String(day.minutes))}</i></span>`; }).join('')}</div>`;
    }
    function buildDailyBrief(){
      const p=store.activeProfile();
      const status=loopStatus();
      const lines=[
        `Bawsala Daily Execution Brief — ${today()}`,
        `Student/Profile: ${p.name || 'Student'}`,
        `Daily loop: ${status.done}/${status.total} steps (${status.percent}%)`,
        `Mission: ${missionText() || 'Not set'}`,
        `Allowed sources: ${sourceText() || 'Not set'}`,
        `Today focus: ${todayMinutes()} minutes across ${todaySessions().length} valid sessions`,
        `Focus quality: ${sessionQuality()}%`,
        `Study streak: ${studyStreak()} days`,
        `Open homework: ${openHomework()}`,
        `Actionable errors: ${actionableErrors().length}`,
        `Due flashcards: ${dueCards()}`,
        `Risks: ${riskFlags().map(x=>x[0]).join(' | ') || 'No critical risk flags'}`,
        `Next action: ${nextStep().label}`
      ];
      return lines.join('\n');
    }
    function exportDailyJson(){
      const payload={date:today(),profile:store.activeProfile(),loop:loopStatus(),mission:mission(),sources:selectedSources(),sessions:todaySessions(),risks:riskFlags().map(([title,hint])=>({title,hint})),homeworks:store.get('homeworks',[]),errors:store.get('errors',[]).slice(0,20),reviews:todayReviews()};
      ui.downloadText(`bawsala-daily-${today()}.json`, JSON.stringify(payload,null,2), 'application/json');
    }
    function seedSampleStudyDay(){
      const now=new Date().toISOString();
      setSourceBudget({limit:2,sources:['كتاب الوزارة: الوحدة الثالثة','أسئلة سنوات 2022-2025'],rule:'لا مصدر ثالث قبل جلسة تركيز محفوظة'});
      setMission({text:'أحل 24 سؤال تفاضل من أسئلة السنوات وأسجل كل خطأ مع قاعدة منعه',subject:'رياضيات',minutes:45,status:'ready',createdAt:now});
      store.set('study:sessions',[
        {id:store.cryptoId(),minutes:42,mission:'تفاضل: 24 سؤال سنوات',subject:'رياضيات',focusScore:4,finishedAt:now,createdAt:now,blocker:'سؤال نهاية الدالة',sources:selectedSources()},
        {id:store.cryptoId(),minutes:25,mission:'مراجعة أخطاء التفاضل',subject:'رياضيات',focusScore:5,finishedAt:now,createdAt:now,sources:selectedSources()}
      ]);
      store.set('homeworks',[
        {id:store.cryptoId(),title:'تسليم ورقة تفاضل قصيرة',subject:'رياضيات',due:today(),priority:'عالية',done:false,createdAt:now},
        {id:store.cryptoId(),title:'تلخيص درس الوراثة',subject:'أحياء',due:dateOnly(datePlus(1)),priority:'متوسطة',done:false,createdAt:now}
      ]);
      store.set('errors',[
        {id:store.cryptoId(),subject:'رياضيات',lesson:'نهايات',category:'تسرع',error:'نسيت فحص إشارة المقام قبل التعويض المباشر.',fix:'قبل التعويض: أحدد المجال ثم أختبر الإشارة من اليمين واليسار.',status:'جديد',reviewAt:datePlus(1),createdAt:now},
        {id:store.cryptoId(),subject:'BTEC',lesson:'Evaluate',category:'صياغة',error:'كتبت رأياً بلا مقارنة بدائل.',fix:'أذكر بديلين، قوة وضعف كل بديل، ثم حكم مبرر.',status:'قيد المراجعة',reviewAt:today(),createdAt:now}
      ]);
      store.set('notebook:notes',[
        {id:store.cryptoId(),title:'قاعدة النهاية اليمنى واليسرى',subject:'رياضيات',body:'إذا اختلفت النهاية من اليمين واليسار فالنهاية غير موجودة.',tags:['قانون','نهايات'],pinned:true,createdAt:now},
        {id:store.cryptoId(),title:'BTEC Evaluate',subject:'BTEC',body:'لا يكفي الوصف؛ لازم مقارنة وحكم.',tags:['صياغة'],createdAt:now}
      ]);
      store.set('notebook:flashcards',[
        {id:store.cryptoId(),deck:'أخطاء الامتحانات',subject:'رياضيات',front:'متى تكون النهاية غير موجودة؟',back:'عندما تختلف النهاية اليمنى عن اليسرى أو لا تقترب الدالة من قيمة محددة.',level:2,intervalDays:1,reps:1,dueAt:now,createdAt:now},
        {id:store.cryptoId(),deck:'BTEC',subject:'BTEC',front:'ما شكل إجابة Evaluate؟',back:'بدائل + قوة/ضعف + حكم مبرر.',level:1,intervalDays:0,reps:0,dueAt:now,createdAt:now}
      ]);
      store.set('rounds',[
        {id:store.cryptoId(),subject:'رياضيات',goal:'حل 12 سؤال تفاضل متوسط',minutes:30,index:1,done:true,createdAt:now},
        {id:store.cryptoId(),subject:'رياضيات',goal:'تصحيح الأخطاء وتحويلها لبطاقات',minutes:20,index:2,done:false,createdAt:now}
      ]);
      store.set('mindmaps',[
        {id:store.cryptoId(),title:'خريطة التفاضل',center:'التفاضل',subject:'رياضيات',nodes:[{id:store.cryptoId(),text:'تعريف المشتقة',parentId:'center'},{id:store.cryptoId(),text:'قواعد الاشتقاق',parentId:'center'},{id:store.cryptoId(),text:'تطبيقات على السرعة',parentId:'center'}],createdAt:now}
      ]);
      store.set('dashboard:dailyReport', buildDailyBrief()+'\nDecision tomorrow: حل 15 سؤال من الأخطاء فقط.');
    }
    function clearTodayExecution(){
      store.remove('dashboard:mission');
      store.remove('study:sourceBudget');
      store.remove('dashboard:dailyReport');
      store.set('study:sessions', store.get('study:sessions',[]).filter(s=>loopEngine.localDateOf(s.finishedAt||s.createdAt)!==today()));
      store.set('dailyReviews', store.get('dailyReviews',[]).filter(r=>loopEngine.localDateOf(r.date||r.createdAt)!==today()));
    }
    function percent(){ return loopStatus().percent; }
    function nextStep(){ return loopEngine.nextAction(loopStatus()); }
    function renderNavGroup(title, items, forceOpen=false){
      const groupActive=items.some(([key])=>activeKey()===key);
      const open=forceOpen||groupActive;
      return `<details class="tool-group" ${open?'open':''}><summary><strong>${ui.escapeHTML(title)}</strong><small>${items.length} FILES</small></summary><div class="tool-group-links">${items.map(([key,t,icon])=>{ const active=activeKey()===key; return `<a class="study-tool-link ${active?'active':''}" href="#${ui.escapeAttr(key)}" ${active?'aria-current="page"':''} aria-label="${ui.escapeAttr(t)}"><b>${ui.escapeHTML(icon)}</b><span>${ui.escapeHTML(t)}</span><em>${active?'RUNNING':'READY'}</em></a>`; }).join('')}</div></details>`;
    }
    function renderNav(){
      if(!nav) return;
      nav.innerHTML = [
        renderNavGroup('حلقة اليوم', coreTools, true),
        renderNavGroup('مكتبة مساعدة', [libraryToolDef], activeKey()==='library'),
        renderNavGroup('مهام وتنظيم', taskTools),
        renderNavGroup('دفاتر ومراجعة', notebookTools),
        renderNavGroup('فهم وتدريب', learningTools),
        renderNavGroup('BTEC ومصادر خارجية', btecAiTools)
      ].join('');
    }
    function syncHeader(){
      const p=store.activeProfile();
      const sessions=todaySessions().length;
      const minutes=todayMinutes();
      const goal=dailyGoalMinutes();
      const errors=actionableErrors().length;
      const cards=dueCards();
      const guard=store.get('dashboard:executionGuard',null);
      const pcent=percent();
      const sourceCount=selectedSources().length;
      const loop=loopStatus();
      const loopMeta=loopLabel(loop);
      if(profileName) profileName.textContent=p.name||'طالب';
      if(statsBox){
        statsBox.innerHTML=metricStrip([
          {value:`${loop.done}/${loop.total}`,label:'خطوات اليوم',cls:loopMeta.cls},
          {value:`${loop.percent}%`,label:'اكتمال الحلقة',cls:loopMeta.cls},
          {value:`${minutes}/${goal}`,label:'دقائق الهدف',cls:minutes>=goal?'good':minutes?'warn':'bad'},
          {value:String(sessions),label:'جلسات صالحة'},
          {value:String(studyStreak()),label:'سلسلة أيام'},
          {value:String(errors),label:'أخطاء قابلة'},
          {value:String(cards),label:'بطاقات مستحقة'}
        ]);
      }
      if(focusSummary){
        const remaining=Math.max(0, goal-minutes);
        focusSummary.innerHTML=`<div class="execution-readiness-card ${ui.escapeAttr(loopMeta.cls)}"><div><span class="kicker">DAILY LOOP</span><b>${loop.done}/${loop.total}</b><small>${ui.escapeHTML(loopMeta.label)}</small></div><p>هذا عدّاد خطوات، لا تقييم ذكاء ولا ادعاء جاهزية. أغلق المهمة والتركيز والخطأ والتقرير.</p></div><div class="progress"><i data-progress="${loop.percent}"></i></div><p class="fine">المطلوب ليس استخدام كل الأدوات. المطلوب إغلاق حلقة دراسة واحدة نظيفة.</p><div class="workspace-health-grid"><span class="health-chip ${remaining?'warn':'good'}"><b>${remaining}</b><small>دقائق متبقية لهدفك</small></span><span class="health-chip ${sourceCount?'good':'bad'}"><b>${sourceCount}/${sourceLimit()}</b><small>مصادر مسموحة</small></span><span class="health-chip ${sessionQuality()>=60?'good':sessionQuality()?'warn':'bad'}"><b>${sessionQuality()}%</b><small>جودة تركيز اليوم</small></span><span class="health-chip ${openHomework()?'warn':'good'}"><b>${openHomework()}</b><small>واجبات مفتوحة</small></span></div>${heatmap()}<div class="focus-rule"><b>قاعدة صارمة</b><span>${ui.escapeHTML(guard?.forbidden || 'لا تفتح أداة ثانوية قبل تنفيذ الزر التالي.')}</span></div>${guard?.purpose?`<div class="focus-contract"><strong>عقد اليوم:</strong> ${ui.escapeHTML(guard.purpose)} <small>${ui.clampNumber(guard.minutes,10,180,30)} دقيقة · سقف المصادر ${sourceLimit()}</small></div>`:''}<div class="source-budget-strip ${sourceCount?'':'empty'}"><strong>مصادر اليوم:</strong> ${sourceCount?selectedSources().map(x=>`<span>${ui.escapeHTML(x)}</span>`).join(''):'<em>غير محددة — هذه ثغرة تشتت.</em>'}</div>${window.BAWSALA_STUDY?.overview?.().continuation?`<div class="workspace-continuation"><span class="badge teal">سياق مستمر</span><div><strong>${ui.escapeHTML(window.BAWSALA_STUDY.overview().continuation.title)}</strong><small>${ui.escapeHTML(window.BAWSALA_STUDY.overview().priority?.reason||'سيبقى هذا العمل مرتبطاً أثناء التنقل.')}</small></div><button class="btn sm secondary" id="workspaceClearContext" type="button">إغلاق السياق</button></div>`:''}${riskPanel()}`;
        paintProgress(focusSummary);
      }
      const next=nextStep();
      if(nextAction) nextAction.innerHTML=`<a class="btn primary" href="#${ui.escapeAttr(next.key)}">${ui.escapeHTML(next.label)}</a><small>${ui.escapeHTML(next.hint)}</small><span class="pill">Alt+1..4 للتنقل السريع</span><button class="btn sm secondary" id="copyDailySummary" type="button">نسخ Brief</button>`;
      document.getElementById('copyDailySummary')?.addEventListener('click',()=>ui.copyText(buildDailyBrief(),'تم نسخ ملخص اليوم'));
      document.getElementById('workspaceClearContext')?.addEventListener('click',()=>{window.BAWSALA_STUDY?.clearContinuation?.();syncHeader();ui.toast('تم إغلاق سياق الدراسة');});
    }

    function secondaryBlockReason(key){
      if(coreKeys.has(key)) return '';
      if(!missionText()) return 'اكتب مهمة اليوم أولاً. فتح الأدوات الثانوية قبل المهمة هو نفس الفوضى بشكل أجمل.';
      if(selectedSources().length===0) return 'حدد مصدرين فقط قبل فتح الأدوات الثانوية. بدون سقف مصادر أنت لا تدرس؛ أنت تجمع روابط.';
      if(todaySessions().length===0) return 'ابدأ جلسة تركيز حقيقية لا تقل عن 5 دقائق قبل الأدوات الثانوية. لا يوجد دليل أنك درست اليوم.';
      return '';
    }
    function renderSecondaryLock(el,key,reason){
      el.innerHTML=card('الأداة مقفلة مؤقتاً',`
        <div class="notice danger"><strong>ممنوع التشتت:</strong> ${ui.escapeHTML(reason)}</div>
        <p class="muted">الأداة المطلوبة: <strong>${ui.escapeHTML(tools[key]?.title || key)}</strong>. ستفتح بعد مهمة واضحة وجلسة تركيز محفوظة اليوم.</p>
        <div class="actions"><a class="btn primary" href="${missionText()?'#focus':'#mission'}">${missionText()?'ابدأ جلسة تركيز':'اكتب مهمة اليوم'}</a><a class="btn secondary" href="#flow">ارجع لتدفق اليوم</a></div>
      `,'Guarded');
    }
    function render(focusPanel=false){
      cleanupTool();
      cleanupTool=()=>{};
      const key=normalizeHash();
      renderNav();
      syncHeader();
      document.body.dataset.workspaceRoute=key;
      document.querySelectorAll('.route-anchor-tile').forEach(tile=>{
        const active=(tile.dataset.routeKey || tile.id)===key;
        tile.classList.toggle('active', active);
        if(active) tile.setAttribute('aria-current','page');
        else tile.removeAttribute('aria-current');
      });
      document.querySelectorAll('.shell-routebar a').forEach(link=>{
        const linkHash=(link.getAttribute('href') || '').split('#')[1] || '';
        const active=canonicalKey(linkHash)===key;
        if(active) link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      });
      if(!panel) return;
      panel.setAttribute('tabindex','-1');
      panel.setAttribute('aria-label', tools[key]?.title || 'غرفة الدراسة');
      document.title=`${tools[key]?.title || 'غرفة الدراسة'} | بوصلة`;
      panel.setAttribute('aria-busy','true');
      panel.innerHTML='';
      const block=secondaryBlockReason(key);
      if(block) renderSecondaryLock(panel,key,block);
      else tools[key].render(panel);
      panel.setAttribute('aria-busy','false');
      routeStatus().textContent=`تم فتح ${tools[key]?.title || 'غرفة الدراسة'}`;
      window.BAWSALA_I18N?.apply(panel);
      if(focusPanel) requestAnimationFrame(()=>{ panel.focus({preventScroll:true}); panel.scrollIntoView({block:'start',behavior:document.body.classList.contains('reduced-motion-ui')?'auto':'smooth'}); });
    }
    window.addEventListener('hashchange',()=>render(true));
    window.addEventListener('mt:storage',syncHeader);
    window.addEventListener('bawsala:study-change',syncHeader);
    window.addEventListener('bawsala:study-remote',syncHeader);
    window.addEventListener('beforeunload',()=>cleanupTool());
    document.addEventListener('keydown',event=>{
      if(event.altKey && !event.ctrlKey && !event.metaKey && ['1','2','3','4'].includes(event.key)){
        const target={1:'mission',2:'focus',3:'errors',4:'review'}[event.key];
        event.preventDefault();
        location.hash=target;
      }
      if(event.altKey && event.key.toLowerCase()==='f'){
        event.preventDefault();
        location.hash='flow';
      }
    });

    function card(title,inner,badge='Study Tool'){
      const frame=`+----------------------+\n| ${String(title || 'TOOL').slice(0,20).padEnd(20,' ')} |\n+----------------------+`;
      return `<article class="card workspace-card"><pre class="module-ascii workspace-ascii-title" aria-hidden="true">${ui.escapeHTML(frame)}</pre><span class="badge blue">${ui.escapeHTML(badge)}</span><h2>${ui.escapeHTML(title)}</h2>${inner}</article>`;
    }
    function empty(text,href,label){
      return `<div class="empty"><p>${ui.escapeHTML(text)}</p>${href?`<a class="btn sm primary" href="${ui.escapeAttr(href)}">${ui.escapeHTML(label||'ابدأ')}</a>`:''}</div>`;
    }
    function fmt(s){ const m=String(Math.floor(s/60)).padStart(2,'0'), ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`; }
    function splitTags(value){ return String(value||'').split(/[\n،,]+/).map(x=>x.trim()).filter(Boolean).slice(0,10); }
    function datePlus(days){ const d=new Date(); d.setDate(d.getDate()+Math.max(0,Number(days)||0)); return d.toISOString(); }
    function addFlashcard(payload){
      return store.addToCollection('notebook:flashcards',{deck:payload.deck||'عام',subject:payload.subject||'عام',front:payload.front||payload.question||'',back:payload.back||payload.answer||'',hint:payload.hint||'',tags:payload.tags||[],level:1,intervalDays:0,ease:2.3,reps:0,lapses:0,dueAt:new Date().toISOString(),correct:0,wrong:0});
    }
    function errorToCard(error){
      const card=addFlashcard({deck:'أخطاء الامتحانات',subject:error.subject||'عام',front:`ما الخطأ الذي يجب أن أتجنبه في ${error.lesson||error.subject||'الدراسة'}؟`,back:`الخطأ: ${error.error||error.message||''}
طريقة المنع: ${error.fix||''}`,hint:error.category||'',tags:['خطأ',error.category||'مراجعة'].filter(Boolean)});
      store.updateCollection('errors',error.id,e=>({...e,cardId:card.id,status:e.status==='جديد'?'قيد المراجعة':e.status}));
      return card;
    }
    function setMission(payload){
      const text=String(payload.text || payload.mission || '').trim();
      if(!text) return null;
      const clean={...payload,text,mission:text,subject:payload.subject||'',minutes:ui.clampNumber(payload.minutes,5,180,25),status:payload.status||'ready',date:today(),createdAt:payload.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      return window.BAWSALA_STUDY?.saveMission?.(clean) || store.set('dashboard:mission',clean);
    }
    function beginStudyContext(payload){
      return window.BAWSALA_STUDY?.beginContext?.({...payload,sourcePage:location.pathname+location.hash}) || setMission(payload);
    }
    function saveStudyError(payload){ return window.BAWSALA_STUDY?.saveError?.(payload) || store.addToCollection('errors',payload); }
    function saveStudySession(payload){ return window.BAWSALA_STUDY?.saveSession?.(payload) || store.addToCollection('study:sessions',payload); }
    function saveStudyReview(payload){ return window.BAWSALA_STUDY?.saveReview?.(payload) || store.addToCollection('dailyReviews',payload); }

    function libraryTool(el){
      const groups=[
        ['المهام والتنظيم',taskTools,'استخدمها عندما توجد مهمة أو موعد حقيقي.'],
        ['الملاحظات والمراجعة',notebookTools,'لا تكتب ملاحظات لمجرد الشعور بالإنتاج. اربطها بسؤال أو خطأ.'],
        ['الفهم والتدريب',learningTools,'افتح التدريب بعد تحديد درس ومخرج واضح.'],
        ['BTEC ومصادر خارجية',btecAiTools,'أدوات تخصصية وروابط خارجية؛ ليست جزءاً من النواة.']
      ];
      el.innerHTML=card('مكتبة الأدوات',`
        <div class="notice info"><strong>هذه ليست قائمة واجبات.</strong> اختر أداة واحدة فقط عندما تحل مشكلة محددة في مهمة اليوم.</div>
        <div class="grid grid-2">${groups.map(([title,items,note])=>`<section class="card compact"><h3>${ui.escapeHTML(title)}</h3><p class="fine">${ui.escapeHTML(note)}</p><div class="grid">${items.map(([key,label,icon])=>`<a class="study-tool-link" href="#${ui.escapeAttr(key)}"><b>${ui.escapeHTML(icon)}</b><span>${ui.escapeHTML(label)}</span><em>OPEN</em></a>`).join('')}</div></section>`).join('')}</div>
        <div class="actions"><a class="btn primary" href="#${ui.escapeAttr(nextStep().key)}">ارجع للخطوة التالية</a><a class="btn secondary" href="#flow">نظرة اليوم</a></div>
      `,'مكتبة مساعدة');
    }

    function flowTool(el){
      const m=mission();
      const loop=loopStatus();
      const loopMeta=loopLabel(loop);
      const steps=[
        {key:'mission',title:'1. مهمة + مصادر',done:Boolean(missionText(m)) && selectedSources().length>0,desc:missionText(m)?(selectedSources().length?sourceText():'مصادر غير محددة'):'غير محددة بعد'},
        {key:'focus',title:'2. جلسة تركيز حقيقية',done:todaySessions().length>0,desc:todaySessions().length?`${todaySessions().length} جلسة صالحة اليوم`:'لم تبدأ جلسة صالحة اليوم'},
        {key:'errors',title:'3. دفتر الأخطاء',done:actionableErrors().length>0,desc:actionableErrors().length?`${actionableErrors().length} أخطاء لها طريقة منع`:'سجل خطأ واحد على الأقل'},
        {key:'review',title:'4. تقرير اليوم',done:todayReviews().length>0,desc:todayReviews().length?'تم حفظ مراجعة اليوم':'لم تكتب مراجعة اليوم'}
      ];
      const next=nextStep();
      el.innerHTML=card('تدفق اليوم',`
        <div class="daily-flow-hero execution-grade">
          <div><b>${percent()}%</b><span>اكتمال حلقة اليوم</span></div>
          <p>هذه الصفحة ليست معرض أدوات. نفّذ المهمة، التركيز، الخطأ، ثم أغلق اليوم. المكتبة موجودة لخدمة المهمة فقط.</p>
        </div>
        <div class="execution-control-strip">
          <div class="execution-score ${ui.escapeAttr(loopMeta.cls)}"><span>خطوات الحلقة</span><b>${loop.done}/${loop.total}</b><small>${ui.escapeHTML(loopMeta.label)}</small></div>
          <div class="execution-actions"><button class="btn sm primary" id="loadDemoState" type="button">تحميل يوم دراسي نموذجي</button><button class="btn sm" id="copyDailyBrief" type="button">نسخ brief</button><button class="btn sm secondary" id="downloadDailyJson" type="button">تصدير JSON</button><button class="btn sm danger" id="clearTodayState" type="button">تصفير اليوم</button></div>
        </div>
        ${metricStrip([
          {value:`${todayMinutes()}د`,label:'دراسة اليوم',cls:todayMinutes()>=dailyGoalMinutes()?'good':todayMinutes()?'warn':'bad'},
          {value:`${Math.max(0,dailyGoalMinutes()-todayMinutes())}د`,label:'متبقي للهدف'},
          {value:String(selectedSources().length),label:'مصادر محددة',cls:selectedSources().length?'good':'bad'},
          {value:String(studyStreak()),label:'سلسلة أيام'},
          {value:`${weekMinutes()}د`,label:'آخر 7 أيام'}
        ])}
        ${heatmap()}
        ${riskPanel()}
        <div class="daily-flow-grid">${steps.map(s=>`<a class="flow-step ${s.done?'done':'todo'}" href="#${ui.escapeAttr(s.key)}" aria-label="${ui.escapeAttr(`${s.done?'مكتملة':'غير مكتملة'}: ${s.title}`)}"><b>${s.done?'✓':'•'}</b><span><strong>${ui.escapeHTML(s.title)}</strong><small>${ui.escapeHTML(s.desc)}</small></span></a>`).join('')}</div>
        <div class="notice success"><strong>الخطوة التالية:</strong> ${ui.escapeHTML(next.label)}<br><span class="fine">${ui.escapeHTML(next.hint)}</span></div>
        <div class="actions"><a class="btn primary" href="#${ui.escapeAttr(next.key)}">نفّذ الخطوة التالية</a><button class="btn" id="copyLoopState" type="button">نسخ حالة اليوم</button><a class="btn secondary" href="dashboard.html">لوحة الطالب المختصرة</a></div>
      `,'Start Here');
      el.querySelector('#copyLoopState')?.addEventListener('click',()=>ui.copyText(buildDailyBrief(),'تم نسخ حالة اليوم'));
      el.querySelector('#copyDailyBrief')?.addEventListener('click',()=>ui.copyText(buildDailyBrief(),'تم نسخ ملخص اليوم'));
      el.querySelector('#downloadDailyJson')?.addEventListener('click',exportDailyJson);
      el.querySelector('#loadDemoState')?.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'تحميل يوم دراسي نموذجي؟',message:'سيستبدل بيانات هذا البروفايل ببيانات دراسية نموذجية. لا تستخدمه فوق بيانات حقيقية تريد الاحتفاظ بها.',confirmText:'تحميل المثال'}); if(!ok) return; seedSampleStudyDay(); ui.toast('تم تحميل يوم دراسي نموذجي'); render(true); });
      el.querySelector('#clearTodayState')?.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'تصفير تنفيذ اليوم؟',message:'سيحذف مهمة اليوم وجلسات اليوم وتقرير اليوم فقط من هذا البروفايل.',confirmText:'تصفير اليوم',danger:true}); if(!ok) return; clearTodayExecution(); ui.toast('تم تصفير تنفيذ اليوم'); render(true); });
    }

    function missionTool(el){
      const m=mission()||{};
      const templates=[
        ['حل أسئلة','أحل 20 سؤال من درس محدد وأسجل كل خطأ مع سبب الخطأ وطريقة منعه.'],
        ['مراجعة خطأ','أراجع 3 أخطاء سابقة وأحوّل كل خطأ إلى قاعدة منع وفلاش كارد.'],
        ['BTEC','أكتب فقرة BTEC واحدة باستخدام Command Word محدد ثم أراجعها حسب قالب Pass/Merit/Distinction.']
      ];
      el.innerHTML=card('مهمة اليوم',`
        <div class="template-strip" aria-label="قوالب مهمة سريعة">${templates.map(([label,text])=>`<button class="btn sm secondary" data-template="${ui.escapeAttr(text)}" type="button">${ui.escapeHTML(label)}</button>`).join('')}</div>
        <form class="form-grid" id="missionForm">
          <label class="field"><span>ماذا ستنجز الآن؟</span><textarea name="mission" rows="4" placeholder="درس واحد + 20 سؤال + تسجيل الأخطاء" required>${ui.escapeHTML(missionText(m))}</textarea></label>
          <div class="field-row">
            <label class="field"><span>المدة بالدقائق</span><input name="minutes" type="number" min="5" max="180" value="${ui.clampNumber(m.minutes,5,180,35)}"></label>
            <label class="field"><span>المادة</span><input name="subject" value="${ui.escapeAttr(m.subject||'')}" placeholder="مثلاً: رياضيات"></label>
          </div>
          <label class="field"><span>مصادر اليوم المسموحة</span><textarea name="sources" rows="3" placeholder="كتاب الوزارة
أسئلة سنوات
مصدر شرح واحد كحد أقصى">${ui.escapeHTML(sourceText())}</textarea><small class="field-hint" id="sourceHint">اكتب كل مصدر في سطر أو افصله بفاصلة. الزيادة فوق السقف سيتم قصها.</small></label>
          <div class="field-row"><label class="field"><span>سقف المصادر</span><input name="sourceLimit" type="number" min="1" max="3" value="${sourceLimit()}"></label><div class="notice danger"><strong>قاعدة:</strong> المصدر غير المكتوب هنا ممنوع اليوم.</div></div>
          <div id="missionQualityBox">${qualityBar(missionQuality(missionText(m)),'جودة صياغة المهمة')}</div>
          <div class="mission-critique" id="missionCritique"></div>
          <div class="actions"><button class="btn primary" type="submit">حفظ المهمة والمصادر</button><button class="btn" id="copyMissionRule" type="button">نسخ قاعدة اليوم</button><button class="btn secondary" id="copyCalendarBlock" type="button">نسخ بلوك تقويم</button><a class="btn secondary" href="#focus">اذهب للمؤقت</a></div>
        </form>
        <div class="notice">المهمة الجيدة فيها فعل واحد قابل للقياس. لا تكتب “أدرس كيمياء”. اكتب “أحل 20 سؤال تفاعلات وأسجل أخطائي”.</div>
      `,'Core 1/4');
      const form=el.querySelector('form');
      const qualityBox=el.querySelector('#missionQualityBox');
      const sourceHint=el.querySelector('#sourceHint');
      const critique=el.querySelector('#missionCritique');
      function missionCritiqueItems(){
        const text=cleanInput(form.mission.value,900);
        const items=[];
        if(text.length<24) items.push('قصيرة أكثر من اللازم: أضف كمية أو نتيجة.');
        if(!/\d|سؤال|صفحة|دقيقة|تمرين|اختبار/.test(text)) items.push('لا يوجد رقم أو معيار قياس.');
        if(!/أحل|أراجع|أكتب|ألخص|أطبق|أختبر|أنجز|solve|review|write|practice/i.test(text)) items.push('لا يوجد فعل تنفيذ واضح.');
        const rawSources=splitTags(form.sources.value);
        const unique=[...new Set(rawSources.map(x=>x.toLowerCase()))];
        if(rawSources.length!==unique.length) items.push('فيه مصادر مكررة؛ التكرار علامة فوضى.');
        if(rawSources.length>ui.clampNumber(form.sourceLimit.value,1,3,sourceLimit())) items.push('مصادرك أكثر من السقف؛ سيتم قص الزائد.');
        if(!items.length) items.push('صياغة مقبولة: الآن نفّذ ولا تظل تعدّل النص.');
        return items;
      }
      function updateMissionHints(){
        const limit=ui.clampNumber(form.sourceLimit.value,1,3,sourceLimit());
        const draftSources=splitTags(form.sources.value).slice(0, limit);
        if(sourceHint) sourceHint.textContent=`المصادر المحسوبة الآن: ${draftSources.length}/${limit}`;
        if(qualityBox){ qualityBox.innerHTML=qualityBar(missionQuality(form.mission.value),'جودة صياغة المهمة'); paintProgress(qualityBox); }
        if(critique){ critique.innerHTML=`<ul>${missionCritiqueItems().map(x=>`<li>${ui.escapeHTML(x)}</li>`).join('')}</ul>`; }
      }
      el.querySelectorAll('[data-template]').forEach(btn=>btn.addEventListener('click',()=>{ form.mission.value=btn.dataset.template; updateMissionHints(); form.mission.focus(); }));
      form.mission.addEventListener('input',updateMissionHints);
      form.sources.addEventListener('input',updateMissionHints);
      form.sourceLimit.addEventListener('input',updateMissionHints);
      updateMissionHints();
      el.querySelector('#copyMissionRule')?.addEventListener('click',()=>{
        const sourceLines=splitTags(form.sources.value).join('\n- ') || sourceText() || 'غير محددة';
        ui.copyText(`مهمة اليوم: ${form.mission.value.trim()||missionText()||'غير محددة'}\nمصادر مسموحة فقط:\n- ${sourceLines}\nالقاعدة: لا مصدر خارج القائمة قبل جلسة تركيز محفوظة.`, 'تم نسخ قاعدة اليوم');
      });
      el.querySelector('#copyCalendarBlock')?.addEventListener('click',()=>{
        ui.copyText(`Study block — ${ui.clampNumber(form.minutes.value,5,180,35)} min\n${form.mission.value.trim()||missionText()||'مهمة غير محددة'}\nSources: ${splitTags(form.sources.value).join(' | ') || sourceText() || 'Not set'}`, 'تم نسخ بلوك التقويم');
      });
      form.addEventListener('submit',e=>{
        e.preventDefault();
        const f=e.currentTarget;
        const cleanMission=cleanInput(f.mission.value,900);
        if(cleanMission.length < 12){ ui.toast('المهمة قصيرة وغامضة. اكتب فعل + كمية + نتيجة.'); f.mission.focus(); return; }
        const budget=setSourceBudget({sourceText:f.sources.value,limit:f.sourceLimit.value});
        if(!budget.sources.length){ ui.toast('حدد مصدراً واحداً على الأقل. بدون مصدر محدد ستتشتت.'); f.sources.focus(); return; }
        setMission({text:cleanMission,minutes:f.minutes.value,subject:f.subject.value});
        ui.toast('تم حفظ مهمة اليوم ومصادرها');
        render();
        location.hash='focus';
      });
    }

    function focusTool(el){
      const TIMER_KEY='bawsala:focus-timer:v15';
      const prefs=store.get('user:preferences',{});
      const m=mission();
      const currentMission=missionText(m);
      const currentSources=selectedSources();
      const signature=focusTimerEngine.missionSignature(currentMission,currentSources);
      const defaultMinutes=ui.clampNumber(m?.minutes || prefs.defaultFocus,5,180,25);
      const readPersisted=()=>{try{return JSON.parse(localStorage.getItem(TIMER_KEY)||'null');}catch(_){return null;}};
      const emitTimer=detail=>window.dispatchEvent(new CustomEvent('bawsala:focus-timer',{detail}));
      const removePersisted=()=>{try{localStorage.removeItem(TIMER_KEY);}catch(_){/* optional storage */}emitTimer({active:false});};
      let timerState=focusTimerEngine.restore(readPersisted(),{day:today(),now:Date.now()});
      if(!timerState){
        removePersisted();
        timerState=focusTimerEngine.create({day:today(),durationMinutes:defaultMinutes,missionSignature:signature,missionText:currentMission,sources:currentSources,note:currentMission});
      }
      let ticker=0;
      let timerClosed=false;
      let finishAnnounced=Boolean(timerState.completedAt);
      const restoredElapsed=focusTimerEngine.elapsed(timerState,Date.now());
      const missionChanged=restoredElapsed>0&&timerState.missionSignature&&timerState.missionSignature!==signature;
      const persist=()=>{if(timerClosed){removePersisted();return;}try{localStorage.setItem(TIMER_KEY,JSON.stringify(timerState));}catch(_){/* timer remains usable in memory */}emitTimer({active:true,running:focusTimerEngine.isRunning(timerState),complete:focusTimerEngine.isComplete(timerState,Date.now())});};
      persist();
      el.innerHTML=card('جلسة تركيز',`
        <div class="notice"><strong>المهمة الحالية:</strong> ${ui.escapeHTML(currentMission||'لم تحدد مهمة بعد')} ${m?.subject?`<span class="pill">${ui.escapeHTML(m.subject)}</span>`:''}</div>
        ${missionChanged?`<div class="notice danger"><strong>تنبيه:</strong> الجلسة المستعادة مرتبطة بمهمة سابقة: ${ui.escapeHTML(timerState.missionText||'مهمة غير مسماة')}. احفظها أو أعد ضبطها قبل بدء المهمة الجديدة.</div>`:''}
        <div class="source-budget-card ${(timerState.sources.length||currentSources.length)?'':'danger'}"><strong>مصادر الجلسة المسموحة</strong><div>${(timerState.sources.length?timerState.sources:currentSources).map(x=>`<span class="pill">${ui.escapeHTML(x)}</span>`).join('')||'<span class="pill danger">غير محددة</span>'}</div><small>أي مصدر خارج هذه القائمة اليوم يعتبر تسويفاً، ليس دراسة.</small></div>
        ${metricStrip([{value:`${todayMinutes()}د`,label:'منجز اليوم',cls:todayMinutes()?'good':'bad'},{value:`${Math.max(0,dailyGoalMinutes()-todayMinutes())}د`,label:'متبقي للهدف'},{value:`${sessionQuality()}%`,label:'جودة التركيز',cls:sessionQuality()>=60?'good':sessionQuality()?'warn':'bad'}])}
        <div class="focus-timer-shell" id="focusTimerShell" data-state="idle">
          <div class="timer-display" id="wsTimer" role="timer" aria-live="off" aria-atomic="true">${fmt(focusTimerEngine.remaining(timerState))}</div>
          <div class="focus-timer-progress" id="focusTimerProgress" role="progressbar" aria-label="تقدم جلسة التركيز" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>
          <div class="focus-timer-meta"><span id="focusTimerState">جاهز</span><span id="focusTimerElapsed">0 دقيقة منفذة</span></div>
          <p class="fine">المؤقت يعتمد على الوقت الحقيقي؛ يستمر بدقة عند قفل الشاشة أو الانتقال لصفحة أخرى، وتُستعاد الجلسة على هذا الجهاز.</p>
          <div class="sr-only" id="focusTimerStatus" role="status" aria-live="polite" aria-atomic="true"></div>
        </div>
        <div class="timer-presets"><button class="btn sm" data-min="10" type="button">10</button><button class="btn sm" data-min="15" type="button">15</button><button class="btn sm" data-min="25" type="button">25</button><button class="btn sm" data-min="45" type="button">45</button><button class="btn sm" data-min="60" type="button">60</button><label class="field mini-field"><span>مخصص</span><input id="customFocusMinutes" type="number" min="5" max="180" value="${Math.round(timerState.durationSeconds/60)}"></label></div>
        <div class="actions"><button class="btn primary" id="startFocus" type="button">ابدأ</button><button class="btn" id="pauseFocus" type="button" disabled>إيقاف مؤقت</button><button class="btn danger" id="saveFocus" type="button" disabled>إنهاء وحفظ</button><button class="btn secondary" id="copyFocusRule" type="button">نسخ مصادر الجلسة</button><button class="btn secondary" id="resetFocus" type="button">إعادة ضبط</button></div>
        <div class="field-row"><label class="field"><span>ماذا درست فعلياً؟</span><input id="focusNote" value="${ui.escapeAttr(timerState.note||timerState.missionText||currentMission)}" placeholder="عنوان الجلسة" maxlength="240"></label><label class="field"><span>تقييم التركيز</span><select id="focusScore"><option value="1">1 / 5</option><option value="2">2 / 5</option><option value="3">3 / 5</option><option value="4">4 / 5</option><option value="5">5 / 5</option></select></label><label class="field"><span>سبب التوقف/التشتت</span><input id="focusBlocker" value="${ui.escapeAttr(timerState.blocker)}" placeholder="اختياري" maxlength="300"></label></div>
        <div class="distraction-meter"><button class="btn sm danger" id="addDistraction" type="button">+ تشتت</button><span id="distractionCount">${ui.clampNumber(timerState.distractions,0,999,0)} تشتت</span><button class="btn sm secondary" id="blockerToSessionError" type="button">حوّل السبب لخطأ</button></div>
        <div class="notice">لا تحفظ جلسة وهمية. أقل من خمس دقائق لا تُسجل كجلسة صالحة.</div>
        <div class="session-log"><h3>جلسات اليوم</h3>${todaySessions().length?todaySessions().slice(0,5).map(s=>`<article><b>${ui.escapeHTML(s.mission||'جلسة')}</b><span>${ui.clampNumber(s.minutes,0,600,0)} دقيقة · تركيز ${ui.clampNumber(s.focusScore,1,5,3)}/5${s.distractions?` · ${ui.clampNumber(s.distractions,0,99,0)} تشتت`:''}</span></article>`).join(''):'<p class="muted">لا توجد جلسات محفوظة اليوم.</p>'}</div>
      `,'Core 2/4');
      const d=el.querySelector('#wsTimer');
      const shell=el.querySelector('#focusTimerShell');
      const progress=el.querySelector('#focusTimerProgress');
      const progressFill=progress.querySelector('i');
      const stateLabel=el.querySelector('#focusTimerState');
      const elapsedLabel=el.querySelector('#focusTimerElapsed');
      const live=el.querySelector('#focusTimerStatus');
      const startBtn=el.querySelector('#startFocus'), pauseBtn=el.querySelector('#pauseFocus'), saveBtn=el.querySelector('#saveFocus');
      const custom=el.querySelector('#customFocusMinutes');
      const noteInput=el.querySelector('#focusNote');
      const scoreInput=el.querySelector('#focusScore');
      const blockerInput=el.querySelector('#focusBlocker');
      scoreInput.value=String(ui.clampNumber(timerState.focusScore,1,5,3));
      const announce=message=>{live.textContent='';requestAnimationFrame(()=>{live.textContent=message;});};
      function syncFields(){
        timerState=focusTimerEngine.patch(timerState,{note:noteInput.value,focusScore:scoreInput.value,blocker:blockerInput.value},Date.now());
        persist();
      }
      function paint({allowAnnouncement=true}={}){
        const previousComplete=Boolean(timerState.completedAt);
        const view=focusTimerEngine.view(timerState,Date.now());
        timerState=view.state;
        d.textContent=fmt(view.remainingSeconds);
        d.setAttribute('aria-label',`${d.textContent} متبقية`);
        progress.setAttribute('aria-valuenow',String(view.progress));
        progressFill.style.setProperty('width',`${view.progress}%`);
        shell.dataset.state=view.complete?'complete':view.running?'running':view.elapsedSeconds>0?'paused':'idle';
        stateLabel.textContent=view.complete?'انتهى الوقت':view.running?'يعمل الآن':view.elapsedSeconds>0?'متوقف مؤقتاً':'جاهز';
        elapsedLabel.textContent=`${Math.floor(view.elapsedSeconds/60)} دقيقة منفذة من ${Math.round(timerState.durationSeconds/60)}`;
        startBtn.disabled=view.running||view.complete;
        startBtn.textContent=view.elapsedSeconds>0?'استئناف':'ابدأ';
        pauseBtn.disabled=!view.running;
        saveBtn.disabled=view.elapsedSeconds<60;
        custom.disabled=view.running||view.elapsedSeconds>0;
        el.querySelectorAll('[data-min]').forEach(button=>{button.disabled=view.running||view.elapsedSeconds>0;button.setAttribute('aria-pressed',String(Number(button.dataset.min)===Math.round(timerState.durationSeconds/60)));});
        el.querySelector('#distractionCount').textContent=`${timerState.distractions} تشتت`;
        if(view.complete){stopTicker();}
        if(view.complete&&!previousComplete){persist();}
        if(view.complete&&!finishAnnounced&&allowAnnouncement){finishAnnounced=true;announce('انتهت جلسة التركيز. سجّلها أو اكتب الخطأ الذي ظهر.');ui.toast('انتهت الجولة. سجّلها أو اكتب الخطأ الذي ظهر.');}
      }
      function startTicker(){clearInterval(ticker);ticker=setInterval(()=>paint(),500);}
      function stopTicker(){clearInterval(ticker);ticker=0;}
      cleanupTool=()=>{stopTicker();persist();document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('pagehide',persist);window.removeEventListener('storage',onStorage);};
      function setMinutes(min){
        const view=focusTimerEngine.view(timerState,Date.now());
        if(view.running||view.elapsedSeconds>0){ui.toast('لا تغيّر مدة جلسة بدأت. احفظها أو أعد ضبطها.');custom.value=Math.round(timerState.durationSeconds/60);return;}
        timerState=focusTimerEngine.setDuration(timerState,min,Date.now());
        custom.value=Math.round(timerState.durationSeconds/60);finishAnnounced=false;persist();paint({allowAnnouncement:false});
      }
      el.querySelectorAll('[data-min]').forEach(button=>button.addEventListener('click',()=>setMinutes(button.dataset.min)));
      custom.addEventListener('change',()=>setMinutes(custom.value));
      startBtn.addEventListener('click',()=>{
        const view=focusTimerEngine.view(timerState,Date.now());
        if(view.elapsedSeconds===0&&(!currentMission||!currentSources.length)){ui.toast(!currentMission?'حدد مهمة اليوم قبل المؤقت':'حدد مصادر اليوم أولاً. بدون سقف مصادر ستتشتت.');location.hash='mission';return;}
        if(view.elapsedSeconds===0){timerState={...timerState,missionSignature:signature,missionText:currentMission,sources:currentSources,note:noteInput.value||currentMission};}
        syncFields();timerState=focusTimerEngine.start(timerState,Date.now());persist();paint({allowAnnouncement:false});startTicker();announce(view.elapsedSeconds>0?'تم استئناف جلسة التركيز.':'بدأت جلسة التركيز.');
      });
      pauseBtn.addEventListener('click',()=>{timerState=focusTimerEngine.pause(timerState,Date.now());persist();stopTicker();paint({allowAnnouncement:false});announce('تم إيقاف جلسة التركيز مؤقتاً.');});
      el.querySelector('#resetFocus').addEventListener('click',async()=>{
        const view=focusTimerEngine.view(timerState,Date.now());
        if(view.elapsedSeconds>0){const ok=await ui.confirmAction({title:'إعادة ضبط المؤقت؟',message:'سيُلغى الوقت المنفذ في هذه الجلسة دون حفظه.',confirmText:'إعادة ضبط',danger:true});if(!ok)return;}
        stopTicker();timerState=focusTimerEngine.reset(timerState,{day:today(),durationMinutes:Math.round(timerState.durationSeconds/60),missionSignature:signature,missionText:currentMission,sources:currentSources,note:currentMission,focusScore:3,now:Date.now()});
        noteInput.value=currentMission;scoreInput.value='3';blockerInput.value='';finishAnnounced=false;persist();paint({allowAnnouncement:false});announce('تمت إعادة ضبط المؤقت.');
      });
      el.querySelector('#addDistraction').addEventListener('click',()=>{timerState=focusTimerEngine.addDistraction(timerState,Date.now());if(!blockerInput.value)blockerInput.value='تشتت أثناء الجلسة';syncFields();paint({allowAnnouncement:false});});
      el.querySelector('#blockerToSessionError').addEventListener('click',()=>{const blocker=cleanInput(blockerInput.value,300);if(!blocker){ui.toast('اكتب سبب التشتت أولاً.');blockerInput.focus();return;}saveStudyError({subject:m?.subject||'عام',lesson:'جلسة تركيز',category:'وقت',error:blocker,fix:'أزيل السبب قبل بدء المؤقت أو أصغّر المهمة إلى 10 دقائق.',status:'جديد',reviewAt:datePlus(1)});ui.toast('تم تحويل سبب التشتت إلى خطأ');render();location.hash='errors';});
      el.querySelector('#copyFocusRule')?.addEventListener('click',()=>ui.copyText(`مصادر جلسة التركيز المسموحة فقط:\n- ${(timerState.sources.length?timerState.sources:currentSources).join('\n- ')||'غير محددة'}\nالمهمة: ${timerState.missionText||currentMission||'غير محددة'}`,'تم نسخ مصادر الجلسة'));
      [noteInput,blockerInput].forEach(input=>input.addEventListener('input',syncFields));scoreInput.addEventListener('change',syncFields);
      function onVisibility(){paint();}
      function onStorage(event){
        if(event.key!==TIMER_KEY)return;
        if(!event.newValue){stopTicker();announce('تم إنهاء جلسة التركيز من تبويب آخر.');return;}
        try{const next=focusTimerEngine.restore(JSON.parse(event.newValue),{day:today(),now:Date.now()});if(next){timerState=next;noteInput.value=timerState.note;scoreInput.value=String(timerState.focusScore);blockerInput.value=timerState.blocker;paint({allowAnnouncement:false});if(focusTimerEngine.isRunning(timerState))startTicker();else stopTicker();}}catch(_){/* ignore malformed cross-tab state */}
      }
      document.addEventListener('visibilitychange',onVisibility);
      window.addEventListener('pagehide',persist);
      window.addEventListener('storage',onStorage);
      paint({allowAnnouncement:false});
      if(focusTimerEngine.isRunning(timerState)){startTicker();announce('تم استعادة جلسة تركيز تعمل في الخلفية.');}
      else if(restoredElapsed>0)announce('تم استعادة جلسة تركيز غير محفوظة.');
      el.querySelector('#saveFocus').addEventListener('click',()=>{
        syncFields();timerState=focusTimerEngine.pause(timerState,Date.now());const view=focusTimerEngine.view(timerState,Date.now());const studied=Math.floor(view.elapsedSeconds/60);
        if(studied<5){persist();paint({allowAnnouncement:false});ui.toast('هذه ليست جلسة صالحة. أكمل خمس دقائق فعلية على الأقل.');return;}
        const sessionSources=timerState.sources.length?timerState.sources:currentSources;
        saveStudySession({minutes:studied,elapsedSeconds:view.elapsedSeconds,plannedMinutes:Math.round(timerState.durationSeconds/60),completionRatio:view.progress,mission:timerState.note||timerState.missionText||currentMission||'جلسة تركيز',subject:m?.subject||'',focusScore:timerState.focusScore,startedAt:timerState.sessionStartedAt||new Date(Date.now()-view.elapsedSeconds*1000).toISOString(),finishedAt:new Date().toISOString(),blocker:timerState.blocker,distractions:timerState.distractions,sources:sessionSources});
        if(timerState.distractions>=3&&timerState.blocker){saveStudyError({subject:m?.subject||'عام',lesson:'تركيز',category:'وقت',error:timerState.blocker,fix:'أبدأ الجلسة التالية بعد إزالة مصدر التشتت لا بعد مقاومته.',status:'جديد',reviewAt:datePlus(1)});}
        stopTicker();timerClosed=true;removePersisted();ui.toast('تم حفظ الجلسة بدقة');location.hash='errors';
      });
    }

    function errorsTool(el){
      const list=[...store.get('errors',[])].sort((a,b)=>String(a.reviewAt||'').localeCompare(String(b.reviewAt||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
      const todayDue=list.filter(e=>!e.reviewAt || new Date(e.reviewAt)<=new Date()).length;
      const byCategory=list.reduce((acc,e)=>{ const k=e.category||'آخر'; acc[k]=(acc[k]||0)+1; return acc; },{});
      const topCategory=Object.entries(byCategory).sort((a,b)=>b[1]-a[1])[0];
      const dueList=list.filter(e=>!e.reviewAt || new Date(e.reviewAt)<=new Date());
      el.innerHTML=card('دفتر الأخطاء',`
        ${metricStrip([{value:String(todayDue),label:'مراجعة الآن',cls:todayDue?'warn':'good'},{value:String(list.length),label:'كل الأخطاء'},{value:topCategory?String(topCategory[1]):'0',label:topCategory?topCategory[0]:'نوع متكرر'},{value:String(list.filter(e=>e.status==='تمت المراجعة'||e.status==='انتهى').length),label:'تمت مراجعتها'}])}
        <div class="category-strip">${Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([cat,count])=>`<span class="pill">${ui.escapeHTML(cat)} · ${ui.escapeHTML(String(count))}</span>`).join('')||'<span class="pill danger">لا توجد بيانات نمطية بعد</span>'}</div>
        <div class="notice"><strong>${todayDue}</strong> أخطاء تحتاج مراجعة. أكثر نوع يتكرر: <strong>${ui.escapeHTML(topCategory?`${topCategory[0]} (${topCategory[1]})`:'لا يوجد بعد')}</strong>.</div>
        <form class="form-grid" id="errForm">
          <div class="field-row"><input name="subject" placeholder="المادة"><input name="lesson" placeholder="الدرس/المهارة"></div>
          <div class="field-row"><select name="category"><option>فهم</option><option>حفظ</option><option>تسرع</option><option>قانون</option><option>وقت</option><option>صياغة</option><option>BTEC</option><option>آخر</option></select><select name="severity"><option value="2">أثر متوسط</option><option value="1">أثر خفيف</option><option value="3">أثر عالٍ</option></select><input name="reviewDays" type="number" min="0" max="30" value="1" placeholder="أراجعه بعد كم يوم؟"></div>
          <label class="field"><span>ما الخطأ؟</span><textarea name="error" rows="4" placeholder="اكتب الخطأ بوضوح: ماذا فعلت غلط؟" required></textarea></label>
          <label class="field"><span>كيف تمنعه في المرة القادمة؟</span><textarea name="fix" rows="3" placeholder="قاعدة، مثال، خطوة تحقق قبل التسليم..." required></textarea></label>
          <div class="actions"><button class="btn primary" type="submit">حفظ الخطأ</button><button class="btn secondary" id="copyErrorDeck" type="button">نسخ أخطاء المراجعة</button><button class="btn secondary" id="bulkDueCards" type="button">حوّل المستحق لبطاقات</button><a class="btn secondary" href="#review">اذهب للتقرير</a></div>
        </form>
        <div class="grid grid-2">${list.slice(0,8).map(e=>`<article class="card compact ${(!e.reviewAt || new Date(e.reviewAt)<=new Date())?'due-card':''}"><span class="pill">${ui.escapeHTML(e.subject||'عام')}</span><span class="badge ${e.status==='انتهى'?'green':e.status==='تمت المراجعة'?'blue':'gray'}">${ui.escapeHTML(e.status||'جديد')}</span><span class="badge ${ui.clampNumber(e.severity,1,3,2)>=3?'red':ui.clampNumber(e.severity,1,3,2)===2?'orange':'gray'}">أثر ${ui.clampNumber(e.severity,1,3,2)}</span><h3>${ui.escapeHTML(e.lesson||'خطأ')}</h3><p class="fine">${ui.escapeHTML(e.category||'آخر')} · مراجعة: ${ui.escapeHTML((e.reviewAt||'اليوم').slice(0,10))}</p><p class="preserve">${ui.escapeHTML(e.error||e.message||'')}</p><p class="muted preserve"><strong>المنع:</strong> ${ui.escapeHTML(e.fix||'غير محدد')}</p><div class="actions"><button class="btn sm" data-err-card="${ui.escapeAttr(e.id)}" type="button">حوّله لبطاقة</button><button class="btn sm" data-err-mission="${ui.escapeAttr(e.id)}" type="button">حوّله لمهمة</button><button class="btn sm secondary" data-err-copy="${ui.escapeAttr(e.id)}" type="button">نسخ المنع</button><button class="btn sm secondary" data-err-done="${ui.escapeAttr(e.id)}" type="button">راجعتُه</button><button class="btn sm danger" data-err-delete="${ui.escapeAttr(e.id)}" type="button">حذف</button></div></article>`).join('')||empty('لا توجد أخطاء. هذا غالباً يعني أنك لا تحل أسئلة كفاية، وليس أنك ممتاز.','#focus','ابدأ حل/تركيز')}</div>
      `,'Core 3/4');
      el.querySelector('#errForm').addEventListener('submit',e=>{
        e.preventDefault();
        const f=e.currentTarget;
        if(!f.error.value.trim() || !f.fix.value.trim()){ ui.toast('الخطأ بدون طريقة منع مجرد شكوى. اكتب الاثنين.'); return; }
        saveStudyError({subject:f.subject.value||'عام',lesson:f.lesson.value||'غير محدد',category:f.category.value,severity:f.severity.value,error:f.error.value,fix:f.fix.value,status:'جديد',reviewAt:datePlus(f.reviewDays.value)});
        f.reset();
        ui.toast('تم حفظ الخطأ وتحويله إلى مادة مراجعة');
        render();
      });
      el.querySelector('#copyErrorDeck')?.addEventListener('click',()=>ui.copyText(dueList.slice(0,12).map((e,i)=>`${i+1}. ${e.lesson||e.subject||'خطأ'}\nالخطأ: ${e.error||e.message||''}\nالمنع: ${e.fix||'غير محدد'}`).join('\n\n') || 'لا توجد أخطاء مستحقة','تم نسخ أخطاء المراجعة'));
      el.querySelector('#bulkDueCards')?.addEventListener('click',()=>{ dueList.slice(0,8).forEach(errorToCard); ui.toast('تم تحويل الأخطاء المستحقة إلى بطاقات'); render(); });
      el.querySelectorAll('[data-err-card]').forEach(b=>b.addEventListener('click',()=>{ const err=store.get('errors',[]).find(x=>x.id===b.dataset.errCard); if(err){ errorToCard(err); ui.toast('تم تحويل الخطأ إلى فلاش كارد'); render(); } }));
      el.querySelectorAll('[data-err-mission]').forEach(b=>b.addEventListener('click',()=>{ const err=store.get('errors',[]).find(x=>x.id===b.dataset.errMission); if(err){ beginStudyContext({kind:'error',entityId:err.id,title:err.lesson||'خطأ سابق',mission:`أراجع خطأ: ${err.lesson||err.error?.slice(0,80)||'خطأ سابق'} — أطبق طريقة المنع`,subject:err.subject,minutes:25,target:'focus'}); store.updateCollection('errors',err.id,e=>({...e,missionId:'dashboard:mission',status:'قيد المراجعة'})); ui.toast('تم تحويل الخطأ إلى مهمة اليوم'); location.hash='mission'; } }));
      el.querySelectorAll('[data-err-copy]').forEach(b=>b.addEventListener('click',()=>{ const err=store.get('errors',[]).find(x=>x.id===b.dataset.errCopy); if(err) ui.copyText(`الخطأ: ${err.error||err.message||''}\nطريقة المنع: ${err.fix||'غير محددة'}`,'تم نسخ طريقة المنع'); }));
      el.querySelectorAll('[data-err-done]').forEach(b=>b.addEventListener('click',()=>{ store.updateCollection('errors',b.dataset.errDone,e=>({...e,status:e.status==='تمت المراجعة'?'انتهى':'تمت المراجعة',reviewedAt:new Date().toISOString(),reviewAt:datePlus(7)})); render(); }));
      el.querySelectorAll('[data-err-delete]').forEach(b=>b.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'حذف الخطأ؟',message:'الحذف يزيل مادة مراجعة مهمة. احذف فقط لو كان مكرراً أو زائفاً.',confirmText:'حذف الخطأ',danger:true}); if(!ok) return; store.deleteFromCollection('errors',b.dataset.errDelete); ui.toast('تم حذف الخطأ'); render(); }));
    }

    function reviewTool(el){
      const m=mission();
      const sessions=todaySessions();
      const lastError=store.get('errors',[])[0];
      const loop=loopStatus();
      const seed=[
        'تقرير بوصلة اليومي',
        `حلقة اليوم: ${loop.done}/${loop.total} (${loop.percent}%)`,
        `مهمة اليوم: ${missionText(m)||'غير محددة'}`,
        `مصادر اليوم: ${sourceText() || 'غير محددة'}`,
        `جلسات اليوم: ${sessions.length} / ${todayMinutes()} دقيقة`,
        `جودة التركيز: ${sessionQuality()}%`,
        `آخر خطأ: ${lastError?.error || lastError?.message || 'غير مسجل'}`,
        `طريقة المنع: ${lastError?.fix || 'غير مسجلة'}`,
        `مخاطر متبقية: ${riskFlags().map(x=>x[0]).join(' | ') || 'لا يوجد خطر حرج'}`,
        'قرار الغد: '
      ].join('\n');
      el.innerHTML=card('تقرير اليوم',`
        ${metricStrip([{value:`${todayMinutes()}د`,label:'دراسة محفوظة'},{value:String(actionableErrors().length),label:'أخطاء قابلة'},{value:String(selectedSources().length),label:'مصادر اليوم'},{value:`${loop.done}/${loop.total}`,label:'خطوات مكتملة',cls:loopLabel(loop).cls}])}
        ${riskPanel()}
        <form class="form-grid" id="reviewForm">
          <div class="field-row"><label class="field"><span>الطاقة</span><select name="energy"><option>متوسطة</option><option>منخفضة</option><option>عالية</option></select></label><label class="field"><span>الالتزام</span><select name="commitment"><option>مقبول</option><option>ضعيف</option><option>جيد</option><option>ممتاز</option></select></label></div>
          <label class="field"><span>أكبر عائق اليوم</span><input name="blocker" placeholder="مصدر كثير؟ هاتف؟ سؤال صعب؟"></label>
          <label class="field"><span>تقرير قابل للنسخ</span><textarea id="dailyReviewText" rows="10">${ui.escapeHTML(store.get('dashboard:dailyReport','') || seed)}</textarea></label>
          <div id="reviewQualityBox">${qualityBar((store.get('dashboard:dailyReport','') || seed).length>180?80:45,'جودة التقرير')}</div>
          <div class="actions"><button class="btn primary" type="submit">حفظ المراجعة</button><button class="btn" id="copyReview" type="button">نسخ التقرير</button><button class="btn secondary" id="fillReview" type="button">إعادة بناء التقرير</button><button class="btn secondary" id="sendReview" type="button">واتساب</button><button class="btn secondary" id="downloadReview" type="button">تحميل TXT</button><button class="btn" id="tomorrowFromReview" type="button">قرار الغد كمهمة</button><button class="btn danger" id="reviewBlockerToError" type="button">العائق كخطأ</button></div>
        </form>
        <div class="notice">التقرير ليس إنشاء. هو قرار: ماذا أكرر غداً؟ وماذا أمنع؟</div>
      `,'إغلاق اليوم');
      const area=el.querySelector('#dailyReviewText');
      const quality=el.querySelector('#reviewQualityBox');
      function updateReviewQuality(){ const text=area.value.trim(); const score=Math.min(100,(text.length>120?35:0)+(text.includes('قرار الغد:')?35:0)+(riskFlags().length<3?15:0)+(todaySessions().length?15:0)); quality.innerHTML=qualityBar(score,'جودة التقرير'); paintProgress(quality); }
      area.addEventListener('input',()=>{ store.set('dashboard:dailyReport',area.value); updateReviewQuality(); });
      updateReviewQuality();
      el.querySelector('#reviewForm').addEventListener('submit',e=>{
        e.preventDefault();
        const f=e.currentTarget;
        const report=area.value.trim();
        const tomorrowMatch=report.match(/قرار الغد:\s*(.+)/);
        if(report.length < 120 || !f.blocker.value.trim() || !tomorrowMatch || !tomorrowMatch[1].trim()){ ui.toast('تقرير ضعيف: اكتب العائق وقرار الغد بوضوح قبل الحفظ.'); return; }
        store.set('dashboard:dailyReport',report);
        saveStudyReview({energy:f.energy.value,commitment:f.commitment.value,blocker:f.blocker.value,date:new Date().toISOString(),text:report,sources:selectedSources(),loopCompletion:loopStatus()});
        ui.toast('تم حفظ مراجعة اليوم');
        render();
      });
      el.querySelector('#copyReview').addEventListener('click',()=>ui.copyText(area.value||seed,'تم نسخ التقرير'));
      el.querySelector('#fillReview').addEventListener('click',()=>{ area.value=seed; store.set('dashboard:dailyReport',seed); updateReviewQuality(); ui.toast('تم إعادة بناء التقرير من بيانات اليوم'); });
      el.querySelector('#sendReview').addEventListener('click',()=>ui.openWhatsApp(area.value||seed));
      el.querySelector('#downloadReview').addEventListener('click',()=>ui.downloadText(`bawsala-review-${today()}.txt`, area.value||seed));
      el.querySelector('#tomorrowFromReview').addEventListener('click',()=>{ const match=(area.value||seed).match(/قرار الغد:\s*(.+)/); const val=match?.[1]?.trim(); if(!val){ ui.toast('اكتب قرار الغد أولاً.'); return; } setMission({text:val,subject:m?.subject||'',minutes:35}); ui.toast('تم تحويل قرار الغد إلى مهمة'); location.hash='mission'; });
      el.querySelector('#reviewBlockerToError').addEventListener('click',()=>{ const blocker=cleanInput(el.querySelector('[name="blocker"]').value,300); if(!blocker){ ui.toast('اكتب العائق أولاً.'); return; } saveStudyError({subject:m?.subject||'عام',lesson:'تقرير اليوم',category:'وقت',severity:2,error:blocker,fix:'أمنع هذا العائق قبل أول جلسة غداً.',status:'جديد',reviewAt:datePlus(1)}); ui.toast('تم تحويل العائق إلى خطأ'); location.hash='errors'; });
    }

    function homeworkTool(el){
      const list=sortByDue(store.get('homeworks',[]));
      const open=list.filter(h=>!h.done);
      const overdue=list.filter(h=>!h.done && h.due && dueMeta(h.due).cls==='red').length;
      const urgent=open.filter(h=>h.priority==='عالية' || (h.due && ['red','orange'].includes(dueMeta(h.due).cls))).length;
      el.innerHTML=card('الواجبات اليومية',`
        ${metricStrip([{value:String(open.length),label:'مفتوحة',cls:open.length?'warn':'good'},{value:String(overdue),label:'متأخرة',cls:overdue?'bad':'good'},{value:String(urgent),label:'عاجلة',cls:urgent?'warn':'good'},{value:String(list.filter(h=>h.done).length),label:'منجزة'}])}
        <div class="notice ${overdue?'danger':''}">${overdue?`عندك ${overdue} واجب متأخر. لا تفتح أدوات جديدة قبل تحويل واحد منها لمهمة.`:'الوضع مقبول. لا تضف واجبات بلا موعد أو مادة.'}</div>
        <form class="form-grid" id="hwForm"><input name="title" placeholder="عنوان الواجب" required><div class="field-row"><input name="subject" placeholder="المادة"><input name="due" type="date"></div><div class="field-row"><select name="priority"><option>متوسطة</option><option>عالية</option><option>خفيفة</option></select><button class="btn primary" type="submit">إضافة واجب</button></div></form>
        <div class="actions"><button class="btn sm secondary" id="copyOpenHomework" type="button">نسخ الواجبات المفتوحة</button><button class="btn sm" id="missionFromNextHomework" type="button">أقرب واجب كمهمة</button></div>
        <div class="grid" id="hwList">${list.length?list.map(h=>{ const due=dueMeta(h.due); return `<article class="card compact ${h.done?'is-done':''} ${!h.done&&due.cls==='red'?'due-card':''}"><span class="badge ${due.cls}">${ui.escapeHTML(due.label)}</span><span class="pill">${ui.escapeHTML(h.priority||'متوسطة')}</span><h3>${ui.escapeHTML(h.title)}</h3><p class="fine">${ui.escapeHTML(h.subject||'عام')} · ${ui.escapeHTML(h.due||'بدون موعد')}</p><div class="actions"><button class="btn sm ${h.done?'secondary':'primary'}" data-done="${ui.escapeAttr(h.id)}" type="button">${h.done?'إلغاء الإنجاز':'إنجاز'}</button><button class="btn sm" data-mission="${ui.escapeAttr(h.id)}" type="button">حوّله لمهمة</button><button class="btn sm secondary" data-copy-hw="${ui.escapeAttr(h.id)}" type="button">نسخ</button><button class="btn sm secondary" data-hw-round="${ui.escapeAttr(h.id)}" type="button">حوّله لجولة</button><button class="btn sm danger" data-del-hw="${ui.escapeAttr(h.id)}" type="button">حذف</button></div></article>`; }).join(''):empty('لا توجد واجبات. أضف الواجبات المهمة فقط، لا تحوّلها لمقبرة مهام.','','')}</div>
      `,'Support');
      el.querySelector('#hwForm').addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; if(!hasText(f.title.value)){ ui.toast('عنوان الواجب فارغ. لا تخزن نفايات.'); focusFirstInvalid(f); return; } store.addToCollection('homeworks',{title:f.title.value,subject:f.subject.value,due:f.due.value,priority:f.priority.value,done:false,createdAt:new Date().toISOString()}); f.reset(); render();});
      el.querySelector('#copyOpenHomework')?.addEventListener('click',()=>ui.copyText(open.map((h,i)=>`${i+1}. ${h.title} — ${h.subject||'عام'} — ${h.due||'بدون موعد'} — ${h.priority||'متوسطة'}`).join('\n') || 'لا توجد واجبات مفتوحة','تم نسخ الواجبات المفتوحة'));
      el.querySelector('#missionFromNextHomework')?.addEventListener('click',()=>{ const hw=open[0]; if(!hw){ ui.toast('لا توجد واجبات مفتوحة.'); return; } beginStudyContext({kind:'homework',entityId:hw.id,title:hw.title,mission:`أنجز واجب: ${hw.title}`,subject:hw.subject,minutes:35,target:'focus'}); ui.toast('تم فتح الواجب كمسار دراسة مستمر'); location.hash='focus'; });
      el.querySelectorAll('[data-done]').forEach(b=>b.addEventListener('click',()=>{const hw=store.get('homeworks',[]).find(x=>x.id===b.dataset.done); if(hw){window.BAWSALA_STUDY?.toggleHomework?.(hw.id,!hw.done) || store.updateCollection('homeworks',hw.id,x=>({...x,done:!x.done,doneAt:!x.done?new Date().toISOString():'',updatedAt:new Date().toISOString()}));} render();}));
      el.querySelectorAll('[data-copy-hw]').forEach(b=>b.addEventListener('click',()=>{const hw=store.get('homeworks',[]).find(x=>x.id===b.dataset.copyHw); if(hw) ui.copyText(`واجب: ${hw.title}\nالمادة: ${hw.subject||'عام'}\nالموعد: ${hw.due||'بدون موعد'}\nالأولوية: ${hw.priority||'متوسطة'}`,'تم نسخ الواجب');}));
      el.querySelectorAll('[data-hw-round]').forEach(b=>b.addEventListener('click',()=>{const hw=store.get('homeworks',[]).find(x=>x.id===b.dataset.hwRound); if(hw){ store.addToCollection('rounds',{subject:hw.subject||'عام',goal:hw.title,minutes:30,index:store.get('rounds',[]).length+1,done:false,createdAt:new Date().toISOString()}); ui.toast('تم تحويل الواجب إلى جولة دراسة'); location.hash='rounds'; }}));
      el.querySelectorAll('[data-del-hw]').forEach(b=>b.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'حذف الواجب؟',message:'احذف الواجب فقط إذا كان مكرراً أو لم يعد مطلوباً.',confirmText:'حذف',danger:true}); if(!ok) return; store.deleteFromCollection('homeworks',b.dataset.delHw); ui.toast('تم حذف الواجب'); render(); }));
      el.querySelectorAll('[data-mission]').forEach(b=>b.addEventListener('click',()=>{const hw=store.get('homeworks',[]).find(x=>x.id===b.dataset.mission); if(hw){beginStudyContext({kind:'homework',entityId:hw.id,title:hw.title,mission:`أنجز واجب: ${hw.title}`,subject:hw.subject,minutes:35,target:'focus'}); ui.toast('تم فتح الواجب كمسار دراسة مستمر'); location.hash='focus';}}));
    }

    function notesTool(el){
      const list=store.get('notebook:notes',[]).filter(n=>!n.archived).sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
      const subjects=[...new Set(list.map(n=>n.subject||'عام'))].slice(0,8);
      el.innerHTML=card('ملاحظات سريعة',`
        ${metricStrip([{value:String(list.length),label:'ملاحظات نشطة'},{value:String(list.filter(n=>n.pinned).length),label:'مثبتة'},{value:String(subjects.length),label:'مواد'}])}
        <div class="note-tool-strip"><input id="noteQuickFilter" type="search" placeholder="فلترة الملاحظات الحالية"><button class="btn sm secondary" id="copyPinnedNotes" type="button">نسخ المثبت</button></div>
        <form class="form-grid" id="noteForm"><div class="field-row"><input name="title" placeholder="عنوان الملاحظة"><input name="subject" placeholder="المادة"></div><input name="tags" placeholder="وسوم: قانون، تعريف، مهم"><textarea name="body" rows="6" placeholder="اكتب ملاحظتك... ثم حوّلها لقرار أو بطاقة"></textarea><div class="actions"><button class="btn primary" type="submit">حفظ</button><a class="btn secondary" href="notebook.html">افتح الدفتر الكامل</a></div></form>
        <div class="grid grid-2" id="notesList">${list.slice(0,8).map(n=>`<article class="card compact ${n.pinned?'pinned-card':''}" data-note-text="${ui.escapeAttr(`${n.title||''} ${n.subject||''} ${(n.tags||[]).join(' ')} ${n.body||n.text||''}`.toLowerCase())}"><span class="pill">${ui.escapeHTML(n.subject||'عام')}</span>${n.pinned?'<span class="badge orange">مثبتة</span>':''}<h3>${ui.escapeHTML(n.title||'ملاحظة')}</h3><p class="muted preserve">${ui.escapeHTML(n.body||n.text||'')}</p><div class="pill-row">${(n.tags||[]).map(t=>`<span class="pill">${ui.escapeHTML(t)}</span>`).join('')}</div><div class="actions"><button class="btn sm" data-note-mission="${ui.escapeAttr(n.id)}" type="button">حوّلها لمهمة</button><button class="btn sm secondary" data-note-card="${ui.escapeAttr(n.id)}" type="button">حوّلها لبطاقة</button><button class="btn sm secondary" data-note-review="${ui.escapeAttr(n.id)}" type="button">أضفها للتقرير</button><button class="btn sm" data-note-copy="${ui.escapeAttr(n.id)}" type="button">نسخ</button><button class="btn sm" data-note-pin="${ui.escapeAttr(n.id)}" type="button">${n.pinned?'إلغاء التثبيت':'تثبيت'}</button><button class="btn sm danger" data-note-archive="${ui.escapeAttr(n.id)}" type="button">أرشفة</button></div></article>`).join('')||empty('لا توجد ملاحظات. لا تكتب ملاحظات بلا قرار؛ اربطها بمهمة أو بطاقة.','','')}</div>
      `,'Support');
      const filter=el.querySelector('#noteQuickFilter');
      filter.addEventListener('input',()=>{ const q=filter.value.trim().toLowerCase(); el.querySelectorAll('#notesList article').forEach(card=>card.hidden=q && !card.dataset.noteText.includes(q)); });
      el.querySelector('#copyPinnedNotes')?.addEventListener('click',()=>ui.copyText(list.filter(n=>n.pinned).map(n=>`${n.title||'ملاحظة'}\n${n.body||n.text||''}`).join('\n\n') || 'لا توجد ملاحظات مثبتة','تم نسخ الملاحظات المثبتة'));
      el.querySelector('#noteForm').addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; if(!hasText(f.title.value) && !hasText(f.body.value)){ ui.toast('الملاحظة الفارغة لا قيمة لها. اكتب عنواناً أو نصاً.'); f.title.focus(); return; } const title=cleanInput(f.title.value||'ملاحظة',120); if(list.some(n=>String(n.title||'').trim().toLowerCase()===title.toLowerCase())){ ui.toast('عنوان الملاحظة مكرر. غيّره بدل تكرار نفس الفوضى.'); f.title.focus(); return; } store.addToCollection('notebook:notes',{title,subject:f.subject.value||'عام',body:f.body.value,tags:splitTags(f.tags.value),createdAt:new Date().toISOString()}); f.reset(); render();});
      el.querySelectorAll('[data-note-mission]').forEach(b=>b.addEventListener('click',()=>{const note=store.get('notebook:notes',[]).find(x=>x.id===b.dataset.noteMission); if(note){beginStudyContext({kind:'note',entityId:note.id,title:note.title||'ملاحظة',mission:note.title||note.body?.slice(0,120),subject:note.subject,minutes:25,target:'focus'}); ui.toast('تم فتح الملاحظة كمسار دراسة'); location.hash='focus';}}));
      el.querySelectorAll('[data-note-card]').forEach(b=>b.addEventListener('click',()=>{const note=store.get('notebook:notes',[]).find(x=>x.id===b.dataset.noteCard); if(note){addFlashcard({deck:'ملاحظات',subject:note.subject,front:note.title||'ماذا أتذكر من هذه الملاحظة؟',back:note.body||'',tags:['ملاحظة',...(note.tags||[])]}); ui.toast('تم تحويل الملاحظة إلى بطاقة'); render();}}));
      el.querySelectorAll('[data-note-review]').forEach(b=>b.addEventListener('click',()=>{const note=store.get('notebook:notes',[]).find(x=>x.id===b.dataset.noteReview); if(note){ const next=`${store.get('dashboard:dailyReport','') || buildDailyBrief()}\n\nملاحظة مهمة: ${note.title||''}\n${note.body||note.text||''}`; store.set('dashboard:dailyReport',next); ui.toast('تمت إضافة الملاحظة للتقرير'); location.hash='review'; }}));
      el.querySelectorAll('[data-note-copy]').forEach(b=>b.addEventListener('click',()=>{const note=store.get('notebook:notes',[]).find(x=>x.id===b.dataset.noteCopy); if(note) ui.copyText(`${note.title||'ملاحظة'}\n${note.body||note.text||''}`,'تم نسخ الملاحظة');}));
      el.querySelectorAll('[data-note-pin]').forEach(b=>b.addEventListener('click',()=>{store.updateCollection('notebook:notes',b.dataset.notePin,n=>({...n,pinned:!n.pinned})); render();}));
      el.querySelectorAll('[data-note-archive]').forEach(b=>b.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'أرشفة الملاحظة؟',message:'ستختفي من غرفة الدراسة لكنها تبقى في الدفتر.',confirmText:'أرشفة'}); if(!ok) return; store.updateCollection('notebook:notes',b.dataset.noteArchive,n=>({...n,archived:true})); render(); }));
    }

    function journalTool(el){
      const list=store.get('notebook:diary',[]);
      el.innerHTML=card('دفتر اليوميات',`
        ${metricStrip([{value:String(list.length),label:'إدخالات'},{value:String(list.filter(x=>dateOnly(x.createdAt)===today()).length),label:'اليوم'},{value:String(list.filter(x=>x.tomorrow).length),label:'قرارات غد'}])}
        <form class="form-grid" id="diaryForm"><div class="field-row"><select name="mood"><option>جيد</option><option>ممتاز</option><option>متعب</option><option>مضغوط</option></select><input name="tomorrow" placeholder="أول مهمة غداً"></div><textarea name="wins" rows="3" placeholder="ماذا أنجزت فعلياً؟"></textarea><textarea name="blockers" rows="3" placeholder="ما العائق؟ لا تكتب كلاماً عاماً."></textarea><div class="actions"><button class="btn primary" type="submit">حفظ اليومية</button><button class="btn secondary" id="tomorrowMission" type="button">حوّل مهمة الغد لمهمة اليوم</button><button class="btn" id="blockerToError" type="button">حوّل العائق لخطأ</button></div></form>
        <div class="grid">${list.slice(0,4).map(x=>`<article class="card compact"><span class="badge gray">${ui.escapeHTML(ageLabel(x.createdAt))}</span><span class="pill">${ui.escapeHTML(x.mood||'مزاج غير محدد')}</span><p><strong>إنجاز:</strong> ${ui.escapeHTML(x.wins||x.done||'—')}</p><p><strong>عائق:</strong> ${ui.escapeHTML(x.blockers||'—')}</p><p><strong>غداً:</strong> ${ui.escapeHTML(x.tomorrow||'—')}</p><button class="btn sm secondary" data-diary-copy="${ui.escapeAttr(x.id)}" type="button">نسخ</button></article>`).join('')||empty('لا توجد يوميات. اليومية الجيدة تختصر العائق وقرار الغد.','','')}</div>
      `,'Support');
      const form=el.querySelector('#diaryForm');
      form.addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; if(!hasText(f.wins.value) && !hasText(f.blockers.value) && !hasText(f.tomorrow.value)){ ui.toast('اليومية الفارغة خداع ذاتي. اكتب إنجازاً أو عائقاً أو مهمة الغد.'); f.wins.focus(); return; } store.addToCollection('notebook:diary',{mood:f.mood.value,wins:f.wins.value,blockers:f.blockers.value,done:f.wins.value,tomorrow:f.tomorrow.value}); f.reset(); render();});
      el.querySelector('#tomorrowMission').addEventListener('click',()=>{ const val=form.tomorrow.value.trim(); if(!val){ ui.toast('اكتب مهمة الغد أولاً'); return; } setMission({text:val,minutes:25,subject:''}); ui.toast('تم وضعها كمهمة اليوم'); location.hash='mission'; });
      el.querySelector('#blockerToError').addEventListener('click',()=>{ const val=cleanInput(form.blockers.value,500); if(!val){ ui.toast('اكتب العائق أولاً.'); form.blockers.focus(); return; } saveStudyError({subject:'عام',lesson:'عائق يومي',category:'وقت',error:val,fix:'أحدد خطوة منع واحدة قبل جلسة الغد',status:'جديد',reviewAt:datePlus(1)}); ui.toast('تم تحويل العائق إلى خطأ قابل للمراجعة'); location.hash='errors'; });
      el.querySelectorAll('[data-diary-copy]').forEach(b=>b.addEventListener('click',()=>{ const item=store.get('notebook:diary',[]).find(x=>x.id===b.dataset.diaryCopy); if(item) ui.copyText(`يومية ${dateOnly(item.createdAt)}
إنجاز: ${item.wins||item.done||'—'}
عائق: ${item.blockers||'—'}
غداً: ${item.tomorrow||'—'}`,'تم نسخ اليومية'); }));
    }

    function flashcardsTool(el){
      const now=new Date();
      const list=store.get('notebook:flashcards',[]).filter(c=>!c.archived);
      const due=list.filter(c=>new Date(c.dueAt || Date.now())<=now);
      function quickSchedule(card, rating){
        const level=Number(card.level)||1;
        if(rating==='again') return {...card,level:1,intervalDays:0,wrong:(card.wrong||0)+1,lapses:(card.lapses||0)+1,reps:(card.reps||0)+1,dueAt:new Date().toISOString(),lastReviewedAt:new Date().toISOString()};
        const inc=rating==='easy'?2:1;
        const nextLevel=Math.min(7,level+inc);
        const days=rating==='hard'?1:(rating==='easy'?Math.max(4,(card.intervalDays||1)*3):Math.max(2,(card.intervalDays||1)*2));
        return {...card,level:nextLevel,intervalDays:Math.round(days),correct:(card.correct||0)+1,reps:(card.reps||0)+1,dueAt:datePlus(days),lastReviewedAt:new Date().toISOString()};
      }
      const mature=list.filter(c=>ui.clampNumber(c.level,1,7,1)>=4).length;
      el.innerHTML=card('فلاش كاردز',`
        ${metricStrip([{value:String(due.length),label:'مستحقة الآن',cls:due.length?'warn':'good'},{value:String(list.length),label:'كل البطاقات'},{value:String(mature),label:'ناضجة'}])}
        <form class="form-grid" id="cardForm"><div class="field-row"><input name="deck" placeholder="المجموعة" value="عام"><input name="subject" placeholder="المادة"></div><input name="tags" placeholder="وسوم مفصولة بفواصل"><textarea name="front" rows="3" placeholder="السؤال" required></textarea><textarea name="back" rows="3" placeholder="الإجابة" required></textarea><input name="hint" placeholder="تلميح اختياري"><div class="actions"><button class="btn primary" type="submit">إضافة بطاقة</button><a class="btn secondary" href="#flashcards">مراجعة كاملة</a></div></form>
        <div class="notice"><strong>${due.length}</strong> بطاقة مستحقة الآن. لا تضف بطاقات أكثر مما تراجع.</div>
        <div class="grid grid-2">${due.slice(0,6).map(c=>`<article class="card flashcard"><span class="pill">${ui.escapeHTML(c.deck||'عام')}</span><span class="badge gray">Level ${ui.clampNumber(c.level,1,7,1)}</span><h3>${ui.escapeHTML(c.front||c.question||'بطاقة')}</h3>${c.hint?`<p class="fine">تلميح: ${ui.escapeHTML(c.hint)}</p>`:''}<details><summary class="btn sm">إظهار الإجابة</summary><p>${ui.escapeHTML(c.back||c.answer||'')}</p></details><div class="actions"><button class="btn danger sm" data-rate="again" data-card="${ui.escapeAttr(c.id)}" type="button">Again</button><button class="btn sm" data-rate="hard" data-card="${ui.escapeAttr(c.id)}" type="button">Hard</button><button class="btn primary sm" data-rate="good" data-card="${ui.escapeAttr(c.id)}" type="button">Good</button><button class="btn secondary sm" data-rate="easy" data-card="${ui.escapeAttr(c.id)}" type="button">Easy</button><button class="btn sm danger" data-card-archive="${ui.escapeAttr(c.id)}" type="button">أرشفة</button></div></article>`).join('')||empty('لا توجد بطاقات مستحقة. ممتاز؛ لا تفتح هذه الأداة بلا سبب.','','')}</div>
      `,'Support');
      el.querySelector('#cardForm').addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; if(!hasText(f.front.value) || !hasText(f.back.value)){ ui.toast('البطاقة تحتاج سؤالاً وإجابة.'); focusFirstInvalid(f); return; } addFlashcard({deck:f.deck.value,subject:f.subject.value,front:f.front.value,back:f.back.value,hint:f.hint.value,tags:splitTags(f.tags.value)}); f.reset(); render();});
      el.querySelectorAll('[data-rate]').forEach(b=>b.addEventListener('click',()=>{ store.set('notebook:flashcards',store.get('notebook:flashcards',[]).map(c=>c.id===b.dataset.card?quickSchedule(c,b.dataset.rate):c)); ui.toast('تمت جدولة البطاقة'); render(); }));
      el.querySelectorAll('[data-card-archive]').forEach(b=>b.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'أرشفة البطاقة؟',message:'ستختفي من مراجعة غرفة الدراسة.',confirmText:'أرشفة'}); if(!ok) return; store.updateCollection('notebook:flashcards',b.dataset.cardArchive,c=>({...c,archived:true})); render(); }));
    }

    function mindmapTool(el){
      const maps=store.get('mindmaps',[]);
      el.innerHTML=card('خرائط ذهنية',`
        ${metricStrip([{value:String(maps.length),label:'خرائط'},{value:String(maps.reduce((sum,m)=>sum+(m.nodes||[]).length,0)),label:'فروع'}])}
        <div class="notice">استخدم الخريطة عندما يكون الدرس متشابكاً. لا تستخدمها كديكور.</div>
        <form class="form-grid" id="mapForm"><input name="title" placeholder="عنوان الخريطة"><input name="center" placeholder="الفكرة المركزية"><input name="nodes" placeholder="فروع مبدئية: سبب، نتيجة، مثال"><button class="btn primary" type="submit">إنشاء خريطة</button></form>
        <div class="grid grid-2">${maps.slice(0,4).map(m=>`<article class="card compact"><h3>${ui.escapeHTML(m.title||m.center)}</h3><p class="muted">${(m.nodes||[]).length} فروع</p><div class="actions"><button class="btn sm secondary" data-map-copy="${ui.escapeAttr(m.id)}" type="button">نسخ مخطط</button><button class="btn sm danger" data-map-del="${ui.escapeAttr(m.id)}" type="button">حذف</button><a class="btn sm" href="#mindmap">فتح الخرائط</a></div></article>`).join('')||empty('لا توجد خرائط. ابدأ بها فقط إذا الدرس يحتاج علاقات لا حفظ نقاط.','','')}</div>
      `,'Advanced');
      el.querySelector('#mapForm').addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; if(!hasText(f.title.value) && !hasText(f.center.value)){ ui.toast('الخريطة تحتاج فكرة مركزية.'); f.center.focus(); return; } store.addToCollection('mindmaps',{title:f.title.value||f.center.value,center:f.center.value||f.title.value,nodes:splitTags(f.nodes.value).map(label=>({id:store.cryptoId(),label})),createdAt:new Date().toISOString()}); f.reset(); render();});
      el.querySelectorAll('[data-map-copy]').forEach(b=>b.addEventListener('click',()=>{
        const m=store.get('mindmaps',[]).find(x=>x.id===b.dataset.mapCopy);
        if(m){
          const branches=(m.nodes||[]).map(n=>n.label||n.title||n).filter(Boolean).join('\n- ');
          ui.copyText(`${m.title||m.center}\n- ${branches || 'لا توجد فروع بعد'}`,'تم نسخ مخطط الخريطة');
        }
      }));
      el.querySelectorAll('[data-map-del]').forEach(b=>b.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'حذف الخريطة؟',message:'لا تحذف الخريطة إذا كانت تلخص درساً متشابكاً.',confirmText:'حذف',danger:true}); if(!ok) return; store.deleteFromCollection('mindmaps',b.dataset.mapDel); render(); }));
    }

    function drillTool(el){
      el.innerHTML=card('تدريب امتحان سريع',`
        <form class="form-grid" id="drillForm"><div class="field-row"><input name="subject" placeholder="المادة"><input name="questions" type="number" min="5" max="80" value="20"></div><div class="field-row"><input name="minutes" type="number" min="10" max="180" value="30"><select name="mode"><option>أسئلة سنوات</option><option>نقاط ضعف</option><option>محاكاة قصيرة</option></select></div><div class="field-row"><input name="target" placeholder="درجة الهدف مثلاً 80%"><input name="mistakes" type="number" min="1" max="10" value="3" placeholder="عدد أخطاء مطلوب تسجيلها"></div><button class="btn primary" type="submit">أنشئ تدريب</button></form>
        <div id="drillOut" class="notice">اختر المادة وسيظهر تدريب واضح.</div>
      `,'Advanced');
      el.querySelector('#drillForm').addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; const questions=ui.clampNumber(f.questions.value,5,80,20); const minutes=ui.clampNumber(f.minutes.value,10,180,30); const mistakes=ui.clampNumber(f.mistakes.value,1,10,3); const subject=cleanInput(f.subject.value,80)||'مادة'; const target=cleanInput(f.target.value,40)||'تحسين واضح'; const text=`${subject}: ${questions} سؤال خلال ${minutes} دقيقة. الهدف: ${target}. القاعدة: حل أولاً بدون فتح الحل، ثم سجل ${mistakes} أخطاء على الأقل.`; el.querySelector('#drillOut').innerHTML=`<strong>${ui.escapeHTML(text)}</strong><ol><li>حل بدون فتح الإجابة.</li><li>صحح بالقلم لا بالنظر فقط.</li><li>حوّل أسوأ ${mistakes} أخطاء لدفتر الأخطاء.</li></ol><button class="btn sm secondary" id="copyDrill" type="button">نسخ التدريب</button>`; el.querySelector('#copyDrill')?.addEventListener('click',()=>ui.copyText(text,'تم نسخ التدريب')); setMission({text,subject,minutes}); ui.toast('تم تحويل التدريب إلى مهمة قابلة للتنفيذ');});
    }


    function roundsTool(el){
      const rounds=store.get('rounds',[]);
      const doneRounds=rounds.filter(r=>r.done).length;
      el.innerHTML=card('جولات الدراسة',`
        ${metricStrip([{value:`${doneRounds}/${rounds.length||0}`,label:'إنجاز الجولات',cls:rounds.length && doneRounds===rounds.length?'good':doneRounds?'warn':'bad'},{value:String(rounds.reduce((sum,r)=>sum+ui.clampNumber(r.minutes,5,180,30),0)),label:'دقائق مخططة'}])}
        <div class="notice">الجولة ليست جدولاً للزينة. الجولة وحدة تنفيذ: مادة، هدف، دقائق، ثم علامة إنجاز.</div>
        <form class="form-grid" id="roundsForm">
          <div class="field-row"><input name="subject" placeholder="المادة"><input name="count" type="number" min="1" max="8" value="3"></div>
          <div class="field-row"><input name="minutes" type="number" min="10" max="90" value="30"><input name="goal" placeholder="الهدف: فهم درس + 15 سؤال"></div>
          <button class="btn primary" type="submit">ولّد الجولات</button>
        </form>
        <div class="grid grid-2">${rounds.length?rounds.map(r=>`<article class="card compact round-card"><span class="badge blue">جولة ${ui.clampNumber(r.index,1,20,1)}</span><h3>${ui.escapeHTML(r.subject||'عام')}</h3><p class="muted">${ui.escapeHTML(r.goal||'مراجعة مركزة')}</p><div class="inline"><span class="pill">${ui.clampNumber(r.minutes,10,120,30)} دقيقة</span><button class="btn sm ${r.done?'secondary':'primary'}" data-round="${ui.escapeAttr(r.id)}" type="button">${r.done?'تمت':'أنجز الجولة'}</button><button class="btn sm" data-round-mission="${ui.escapeAttr(r.id)}" type="button">حوّل لمهمة</button><button class="btn sm secondary" data-round-copy="${ui.escapeAttr(r.id)}" type="button">نسخ</button></div></article>`).join(''):empty('لا توجد جولات. ولّد 2 أو 3 فقط؛ أكثر من ذلك غالباً كذب على النفس.','','')}</div>
      `,'Tasks');
      el.querySelector('#roundsForm').addEventListener('submit',e=>{
        e.preventDefault(); const f=e.currentTarget;
        const count=ui.clampNumber(f.count.value,1,8,3), minutes=ui.clampNumber(f.minutes.value,10,90,30);
        const subject=cleanInput(f.subject.value,80)||mission()?.subject||'مادة عامة';
        const goal=cleanInput(f.goal.value,200)||'مراجعة مركزة وحل أسئلة';
        const arr=Array.from({length:count},(_,i)=>({id:store.cryptoId(),subject,goal,minutes,index:i+1,done:false,createdAt:new Date().toISOString()}));
        store.set('rounds',arr); ui.toast('تم توليد الجولات'); render();
      });
      el.querySelectorAll('[data-round]').forEach(b=>b.addEventListener('click',()=>{ store.updateCollection('rounds',b.dataset.round,r=>({...r,done:!r.done})); render(); }));
      el.querySelectorAll('[data-round-copy]').forEach(b=>b.addEventListener('click',()=>{ const r=store.get('rounds',[]).find(x=>x.id===b.dataset.roundCopy); if(r) ui.copyText(`جولة ${r.index}: ${r.subject}
${r.goal}
${r.minutes} دقيقة`,'تم نسخ الجولة'); }));
      el.querySelectorAll('[data-round-mission]').forEach(b=>b.addEventListener('click',()=>{ const r=store.get('rounds',[]).find(x=>x.id===b.dataset.roundMission); if(r){ setMission({text:`جولة ${r.index}: ${r.goal}`,subject:r.subject,minutes:r.minutes}); ui.toast('تم تحويل الجولة إلى مهمة اليوم'); location.hash='mission'; } }));
    }

    function lecturesTool(el){
      const lectures=data.lectures||[];
      el.innerHTML=card('محاضرات قصيرة',`
        ${metricStrip([{value:String(lectures.length),label:'محاضرات'},{value:String(lectures.reduce((sum,l)=>sum+ui.clampNumber(l.duration,1,240,20),0)),label:'دقائق محتوى'}])}
        <div class="notice">هذه ليست مكتبة فيديو. هي أفكار محاضرات قصيرة قابلة للتحويل إلى مهمة أو محاور تدريب.</div>
        <div class="grid grid-3">${lectures.map(l=>`<article class="card lecture-card"><span class="badge blue">${ui.escapeHTML(l.area)}</span><h3>${ui.escapeHTML(l.title)}</h3><p class="muted">${ui.escapeHTML(l.takeaway)}</p><div class="mini-meta"><span>${ui.clampNumber(l.duration,1,240,20)} دقيقة</span><span>${ui.escapeHTML(l.level)}</span></div><div class="actions"><button class="btn sm" data-lecture-copy="${ui.escapeAttr(l.id)}" type="button">نسخ محاور</button><button class="btn sm secondary" data-lecture-mission="${ui.escapeAttr(l.id)}" type="button">حوّل لمهمة</button><button class="btn sm" data-lecture-source="${ui.escapeAttr(l.title)}" type="button">اجعله مصدر اليوم</button></div></article>`).join('')}</div>
      `,'Learning');
      el.querySelectorAll('[data-lecture-copy]').forEach(btn=>btn.addEventListener('click',()=>{ const l=lectures.find(x=>x.id===btn.dataset.lectureCopy); if(l) ui.copyText(`محاور: ${l.title}
1. المشكلة
2. مثال من واقع الطالب
3. خطوات عملية
4. تمرين قصير
5. تطبيق داخل بوصلة`, 'تم نسخ المحاور'); }));
      el.querySelectorAll('[data-lecture-source]').forEach(btn=>btn.addEventListener('click',()=>{ setSourceBudget({sources:[btn.dataset.lectureSource],limit:1}); ui.toast('تم تحديد المحاضرة كمصدر اليوم الوحيد'); syncHeader(); }));
      el.querySelectorAll('[data-lecture-mission]').forEach(btn=>btn.addEventListener('click',()=>{ const l=lectures.find(x=>x.id===btn.dataset.lectureMission); if(l){ setMission({text:`محاضرة/تطبيق: ${l.title} — اكتب 3 خطوات تطبقها اليوم`,subject:l.area,minutes:l.duration}); ui.toast('تم تحويل المحاضرة إلى مهمة اليوم'); location.hash='mission'; } }));
    }

    function schoolmindTool(el){
      const sm=data.schoolmind||{};
      el.innerHTML=card('SchoolMind AI',`
        <div class="schoolmind-inline">
          <img src="../assets/img/schoolmind-illustration.svg" alt="رسم SchoolMind AI" loading="lazy" decoding="async">
          <div><span class="badge gray">مصدر خارجي مستقل</span><h3>${ui.escapeHTML(sm.title||'SchoolMind AI')}</h3><p class="muted">${ui.escapeHTML(sm.summary||'رابط خارجي مستقل. لا توجد مزامنة بيانات أو تكامل مباشر مع بوصلة.')}</p><div class="actions"><a class="btn primary" href="${ui.escapeAttr(ui.safeURL(sm.url||data.schoolmindUrl))}" target="_blank" rel="noopener noreferrer">فتح الموقع الخارجي</a><a class="btn secondary" href="schoolmind.html">القسم الكامل</a></div></div>
        </div>
        <div class="grid grid-2">${(sm.pillars||[]).map(p=>`<article class="card compact"><h3>${ui.escapeHTML(p[0])}</h3><p class="muted">${ui.escapeHTML(p[1])}</p></article>`).join('')}</div>
        <div class="notice danger"><strong>قاعدة قاسية:</strong> استخدم AI ليشرح ويختبرك، لا ليكتب بدلاً عنك. النسخ الأعمى سيجعلك أضعف.</div>
      `,'AI');
    }

    function btecTool(el){
      const terms=data.btecTerms||[];
      const frames={
        PASS:'اكتب تعريفاً أو وصفاً واضحاً، ثم مثالاً قصيراً من الحالة.',
        MERIT:'اربط السبب بالنتيجة، ثم وضّح الأثر بمثال.',
        DISTINCTION:'اعرض بديلين أو أكثر، قيّم القوة والضعف، ثم أعطِ حكماً مبرراً.'
      };
      el.innerHTML=card('قاموس BTEC عملي',`<div class="notice">لا تحفظ كلمة الأمر فقط. المطلوب أن تعرف شكل الإجابة والدليل المطلوب.</div><input id="btecSearch" placeholder="ابحث عن Explain أو Evaluate"><div class="grid" id="btecList"></div>`,'Advanced');
      const list=el.querySelector('#btecList');
      function paint(q=''){
        const s=q.toLowerCase();
        list.innerHTML=terms.filter(t=>t.join(' ').toLowerCase().includes(s)).slice(0,10).map(t=>`<article class="card compact"><span class="badge ${t[2]==='DISTINCTION'?'red':t[2]==='MERIT'?'blue':'green'}">${ui.escapeHTML(t[2])}</span><h3>${ui.escapeHTML(t[0])} — ${ui.escapeHTML(t[1])}</h3><p class="muted">${ui.escapeHTML(t[3])}</p><p class="notice"><strong>قالب الإجابة:</strong> ${ui.escapeHTML(frames[t[2]]||frames.PASS)}</p><div class="actions"><button class="btn sm" data-btec-card="${ui.escapeAttr(t[0])}" type="button">حوّلها لبطاقة</button><button class="btn sm secondary" data-btec-mission="${ui.escapeAttr(t[0])}" type="button">تدرب عليها اليوم</button></div></article>`).join('')||empty('لا نتائج. جرّب كلمة أمر مثل Explain.','','');
        list.querySelectorAll('[data-btec-card]').forEach(b=>b.addEventListener('click',()=>{const term=terms.find(x=>x[0]===b.dataset.btecCard); if(term){addFlashcard({deck:'BTEC',subject:'BTEC',front:`ماذا يعني ${term[0]}؟`,back:`${term[1]}: ${term[3]}\nقالب: ${frames[term[2]]||frames.PASS}`,tags:['BTEC',term[2]]}); ui.toast('تمت إضافة بطاقة BTEC');}}));
        list.querySelectorAll('[data-btec-mission]').forEach(b=>b.addEventListener('click',()=>{const term=terms.find(x=>x[0]===b.dataset.btecMission); if(term){setMission({text:`تدريب BTEC: اكتب فقرة تستخدم ${term[0]} ثم راجعها حسب القالب`,subject:'BTEC',minutes:35}); ui.toast('تم تحويل أمر BTEC إلى مهمة اليوم'); location.hash='mission';}}));
      }
      paint();
      el.querySelector('#btecSearch').addEventListener('input',e=>paint(e.target.value));
    }

    function habitsTool(el){
      const habits=store.get('student:habits',[]);
      el.innerHTML=card('عادات الدراسة',`
        ${metricStrip([{value:String(habits.length),label:'عادات'},{value:String(habits.filter(h=>h.lastDone===today()).length),label:'منجزة اليوم'},{value:String(Math.max(0,...habits.map(h=>h.streak||0))),label:'أطول سلسلة'}])}
        <form id="habitForm" class="form-grid"><input name="name" placeholder="مثلاً: مراجعة 20 دقيقة"><button class="btn primary" type="submit">إضافة عادة</button></form>
        <div class="grid grid-2">${habits.map(h=>`<article class="card compact"><h3>${ui.escapeHTML(h.name||h.title)}</h3><p class="fine">سلسلة: ${h.streak||0} أيام</p><button class="btn sm" data-habit="${ui.escapeAttr(h.id)}" type="button">أنجزت اليوم</button></article>`).join('')||empty('لا توجد عادات. لا تضف عادات كثيرة؛ عادة واحدة ثابتة تكفي.','','')}</div>
      `,'Advanced');
      el.querySelector('#habitForm').addEventListener('submit',e=>{e.preventDefault(); const f=e.currentTarget; if(!hasText(f.name.value)){ ui.toast('لا تضف عادة بلا اسم.'); f.name.focus(); return; } store.addToCollection('student:habits',{name:f.name.value,title:f.name.value,streak:0,lastDone:''}); render();});
      el.querySelectorAll('[data-habit]').forEach(b=>b.addEventListener('click',()=>{let repeated=false; store.updateCollection('student:habits',b.dataset.habit,h=>{ repeated=h.lastDone===today(); return repeated?h:{...h,streak:(h.streak||0)+1,lastDone:today()}; }); ui.toast(repeated?'هذه العادة محسوبة اليوم بالفعل. لا تزوّر السلسلة.':'تم تسجيل العادة'); render();}));
    }

    render();
  });
})();
