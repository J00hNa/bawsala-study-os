(function(){
  'use strict';
  const doc=document;
  const body=doc.body;
  if(!body)return;
  const page=body.dataset.page||'home';
  const nested=location.pathname.includes('/pages/');
  const base=nested?'../':'./';
  const store=()=>window.MT_STORE;
  const security=()=>window.MT_SECURITY;
  const ui=()=>window.MT_UI;
  const DRAFT_KEY='bawsala:quick-capture:draft';
  const RAIL_KEY='bawsala:study-context:collapsed';
  const trackedKeys=new Set(['dashboard:mission','study:continuation','study:sourceBudget','study:sessions','notebook:flashcards','homeworks','errors','dailyReviews','study:calendar','user:preferences']);
  const captureExcludedPages=new Set(['login','signup','signup-success','reset-password','welcome','legal','company','services','admin']);
  const railExcludedPages=new Set([...captureExcludedPages,'legal','company','services','admin','account','billing','settings','profiles']);
  const copy={
    ar:{capture:'التقاط سريع',captureHint:'ملاحظة أو واجب أو خطأ بدون مغادرة الصفحة',openCapture:'فتح الالتقاط السريع',captureShortcut:'Alt N',note:'ملاحظة',task:'واجب',error:'خطأ',subject:'المادة',subjectPlaceholder:'مثلاً: رياضيات',content:'المحتوى',notePlaceholder:'اكتب الفكرة كما هي، ثم رتّبها لاحقًا.',taskPlaceholder:'ما الشيء المحدد الذي يجب إنجازه؟',errorPlaceholder:'ما الخطأ الذي حدث؟ اكتب الواقعة لا جلد الذات.',due:'الموعد',save:'حفظ',cancel:'إلغاء',close:'إغلاق',required:'اكتب محتوى حقيقيًا أولًا.',savedNote:'تم حفظ الملاحظة.',savedTask:'تم حفظ الواجب.',savedError:'تم حفظ الخطأ للمراجعة.',open:'فتح',undo:'تراجع',undone:'تم التراجع عن الحفظ.',draftRestored:'استعدنا المسودة غير المكتملة.',draftSaved:'المسودة محفوظة مؤقتًا في هذه الجلسة.',todayPulse:'نبض اليوم',noMission:'لا توجد مهمة واضحة لليوم.',setMission:'حدد مهمة واحدة',resumeMission:'تابع المهمة',reviewCards:'راجع البطاقات',openErrors:'سجّل الخطأ',openHomework:'نفّذ أقرب واجب',closeDay:'أغلق اليوم',resumeTimer:'استأنف المؤقت',saveTimer:'احفظ الجلسة',timerRunning:'المؤقت يعمل',timerPaused:'جلسة متوقفة',timerComplete:'انتهى وقت الجلسة',minutes:'دقيقة',dueCards:'بطاقات مستحقة',openTasks:'واجبات مفتوحة',collapse:'طي شريط اليوم',expand:'توسيع شريط اليوم',sections:'أقسام الصفحة',sectionMap:'خريطة الصفحة',sectionIntro:'انتقل مباشرة بدل التمرير العشوائي.',noSections:'لا توجد أقسام كافية لعرض الخريطة.',progress:'تقدم الصفحة',current:'الحالي',quickCapture:'التقاط',saved:'تم الحفظ',todayDone:'أنجزت هدف المهمة الحالي. لا تفتح شيئًا جديدًا بلا سبب.'},
    en:{capture:'Quick capture',captureHint:'Save a note, task, or mistake without leaving the page',openCapture:'Open quick capture',captureShortcut:'Alt N',note:'Note',task:'Task',error:'Mistake',subject:'Subject',subjectPlaceholder:'For example: Mathematics',content:'Content',notePlaceholder:'Write the idea now and organize it later.',taskPlaceholder:'What exactly needs to be completed?',errorPlaceholder:'What went wrong? Record the event, not self-criticism.',due:'Due date',save:'Save',cancel:'Cancel',close:'Close',required:'Write meaningful content first.',savedNote:'Note saved.',savedTask:'Task saved.',savedError:'Mistake saved for review.',open:'Open',undo:'Undo',undone:'Save undone.',draftRestored:'Your unfinished draft was restored.',draftSaved:'Draft is kept for this session.',todayPulse:'Today pulse',noMission:'No clear mission is set for today.',setMission:'Set one mission',resumeMission:'Resume mission',reviewCards:'Review cards',openErrors:'Record the mistake',openHomework:'Do next task',closeDay:'Close the day',resumeTimer:'Resume timer',saveTimer:'Save session',timerRunning:'Timer running',timerPaused:'Session paused',timerComplete:'Session time finished',minutes:'min',dueCards:'cards due',openTasks:'open tasks',collapse:'Collapse today bar',expand:'Expand today bar',sections:'Page sections',sectionMap:'Page map',sectionIntro:'Jump directly instead of scrolling without a plan.',noSections:'Not enough sections to build a map.',progress:'Page progress',current:'Current',quickCapture:'Capture',saved:'Saved',todayDone:'The current mission target is complete. Do not open something new without a reason.'}
  };
  const language=()=>store()?.get?.('language','ar')==='en'?'en':'ar';
  const t=key=>copy[language()][key]||copy.ar[key]||key;
  const escapeHTML=value=>ui()?.escapeHTML?.(String(value??''))??String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const escapeAttr=value=>ui()?.escapeAttr?.(String(value??''))??escapeHTML(value);
  const relative=path=>base+path.replace(/^\//,'');
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const localDate=()=>security()?.localDate?.()||new Date().toISOString().slice(0,10);
  let captureRoot=null;
  let capturePreviousFocus=null;
  let compassPreviousFocus=null;
  let captureType='note';
  let rail=null;
  let compassRoot=null;
  let sectionEntries=[];
  let activeSectionId='';
  let progressFrame=0;
  let captureDraftTimer=0;

  function safeSessionGet(key,fallback=''){
    try{return sessionStorage.getItem(key)??fallback;}catch(_){return fallback;}
  }
  function safeSessionSet(key,value){try{sessionStorage.setItem(key,value);}catch(_){/* session storage is optional */}}
  function safeSessionRemove(key){try{sessionStorage.removeItem(key);}catch(_){/* session storage is optional */}}
  function focusables(root){return [...root.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(node=>node.offsetParent!==null);}
  function trapDialog(event,root,close){
    if(event.key==='Escape'){event.preventDefault();close();return;}
    if(event.key!=='Tab')return;
    const list=focusables(root);if(!list.length)return;
    const first=list[0],last=list[list.length-1];
    if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
  }
  function capturePlaceholder(type){return t(type==='task'?'taskPlaceholder':type==='error'?'errorPlaceholder':'notePlaceholder');}
  function captureDestination(type){
    if(type==='note')return relative('pages/notebook.html#notes');
    return relative(type==='task'?'pages/workspace.html#homework':'pages/workspace.html#errors');
  }
  function readDraft(){
    try{const parsed=JSON.parse(safeSessionGet(DRAFT_KEY,'{}'));return parsed&&typeof parsed==='object'?parsed:{};}catch(_){return {};}
  }
  function writeDraft(){
    if(!captureRoot)return;
    const form=captureRoot.querySelector('form');
    const draft={type:captureType,subject:form.subject.value,content:form.content.value,due:form.due.value,updatedAt:new Date().toISOString()};
    if(!draft.subject&&!draft.content&&!draft.due){safeSessionRemove(DRAFT_KEY);return;}
    safeSessionSet(DRAFT_KEY,JSON.stringify(draft));
    captureRoot.querySelector('[data-capture-draft]').textContent=t('draftSaved');
  }
  function scheduleDraft(){clearTimeout(captureDraftTimer);captureDraftTimer=setTimeout(writeDraft,180);}
  function setCaptureType(type){
    captureType=['note','task','error'].includes(type)?type:'note';
    if(!captureRoot)return;
    captureRoot.querySelectorAll('[data-capture-type]').forEach(button=>{
      const active=button.dataset.captureType===captureType;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
      button.tabIndex=active?0:-1;
    });
    const dueField=captureRoot.querySelector('[data-capture-due]');
    dueField.hidden=captureType!=='task';
    const content=captureRoot.querySelector('[name="content"]');
    content.placeholder=capturePlaceholder(captureType);
    captureRoot.dataset.type=captureType;
    if(!captureRoot.hidden)scheduleDraft();
  }
  function renderCaptureLanguage(){
    if(!captureRoot)return;
    captureRoot.querySelectorAll('[data-v21-text]').forEach(node=>{node.textContent=t(node.dataset.v21Text);});
    captureRoot.querySelectorAll('[data-v21-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.v21Aria)));
    const content=captureRoot.querySelector('[name="content"]');if(content)content.placeholder=capturePlaceholder(captureType);
    const subject=captureRoot.querySelector('[name="subject"]');if(subject)subject.placeholder=t('subjectPlaceholder');
  }
  function mountQuickCapture(){
    if(captureRoot||captureExcludedPages.has(page))return;
    const root=doc.createElement('div');
    root.id='quickCapture';root.className='quick-capture';root.hidden=true;
    root.innerHTML=`<div class="quick-capture__backdrop" data-capture-close></div><section class="quick-capture__panel" role="dialog" aria-modal="true" aria-labelledby="quickCaptureTitle"><header><div><span class="kicker">// QUICK CAPTURE</span><h2 id="quickCaptureTitle" data-v21-text="capture">${escapeHTML(t('capture'))}</h2><p data-v21-text="captureHint">${escapeHTML(t('captureHint'))}</p></div><button class="icon-btn" type="button" data-capture-close data-v21-aria="close" aria-label="${escapeAttr(t('close'))}">×</button></header><div class="capture-type-tabs" role="tablist" aria-label="${escapeAttr(t('capture'))}"><button type="button" role="tab" data-capture-type="note" data-v21-text="note">${escapeHTML(t('note'))}</button><button type="button" role="tab" data-capture-type="task" data-v21-text="task">${escapeHTML(t('task'))}</button><button type="button" role="tab" data-capture-type="error" data-v21-text="error">${escapeHTML(t('error'))}</button></div><form class="quick-capture__form" novalidate><label class="field"><span data-v21-text="subject">${escapeHTML(t('subject'))}</span><input name="subject" maxlength="80" autocomplete="off" placeholder="${escapeAttr(t('subjectPlaceholder'))}"></label><label class="field quick-capture__content"><span data-v21-text="content">${escapeHTML(t('content'))}</span><textarea name="content" rows="7" maxlength="5000" required placeholder="${escapeAttr(capturePlaceholder('note'))}"></textarea><small class="capture-counter" aria-live="polite"><span data-capture-count>0</span>/5000</small></label><label class="field" data-capture-due hidden><span data-v21-text="due">${escapeHTML(t('due'))}</span><input name="due" type="date"></label><p class="quick-capture__draft" data-capture-draft role="status"></p><footer><button class="btn ghost" type="button" data-capture-close data-v21-text="cancel">${escapeHTML(t('cancel'))}</button><button class="btn primary" type="submit" data-v21-text="save">${escapeHTML(t('save'))}</button></footer></form></section>`;
    body.appendChild(root);captureRoot=root;
    root.querySelectorAll('[data-capture-close]').forEach(node=>node.addEventListener('click',closeQuickCapture));
    root.querySelectorAll('[data-capture-type]').forEach(button=>button.addEventListener('click',()=>setCaptureType(button.dataset.captureType)));
    const form=root.querySelector('form');
    form.addEventListener('input',event=>{
      if(event.target.name==='content')root.querySelector('[data-capture-count]').textContent=String(event.target.value.length);
      root.querySelector('[data-capture-draft]').textContent='';scheduleDraft();
    });
    form.addEventListener('submit',saveCapture);
    root.addEventListener('keydown',event=>trapDialog(event,root,closeQuickCapture));
    setCaptureType('note');
  }
  function openQuickCapture(type=''){
    mountQuickCapture();if(!captureRoot)return;
    capturePreviousFocus=doc.activeElement;
    const draft=readDraft();
    const form=captureRoot.querySelector('form');
    if(type)setCaptureType(type);else setCaptureType(draft.type||captureType);
    if(draft.subject||draft.content||draft.due){
      form.subject.value=draft.subject||'';form.content.value=draft.content||'';form.due.value=draft.due||'';
      captureRoot.querySelector('[data-capture-count]').textContent=String(form.content.value.length);
      captureRoot.querySelector('[data-capture-draft]').textContent=t('draftRestored');
    }
    captureRoot.hidden=false;body.classList.add('quick-capture-open');
    requestAnimationFrame(()=>form.content.focus());
  }
  function closeQuickCapture(){
    if(!captureRoot||captureRoot.hidden)return;
    writeDraft();captureRoot.hidden=true;body.classList.remove('quick-capture-open');
    if(capturePreviousFocus&&doc.contains(capturePreviousFocus))capturePreviousFocus.focus();
  }
  function captureRecord(type,subject,content,due){
    const source=(doc.querySelector('h1')?.textContent||document.title||page).trim().slice(0,120);
    if(type==='task')return {collection:'homeworks',record:{title:content.slice(0,160),subject:subject||'عام',due,priority:'متوسطة',done:false,source}};
    if(type==='error')return {collection:'errors',record:{subject:subject||'عام',lesson:source,category:'آخر',status:'جديد',error:content,fix:'',reviewAt:'',source,page:location.pathname}};
    const lines=content.split(/\n+/).map(line=>line.trim()).filter(Boolean);
    return {collection:'notebook:notes',record:{title:(lines[0]||t('note')).slice(0,140),subject:subject||'عام',body:content,tags:[language()==='en'?'quick capture':'التقاط سريع'],source,pinned:false,archived:false}};
  }
  function saveCapture(event){
    event.preventDefault();
    const form=event.currentTarget;
    const sec=security();const content=sec?.cleanMultiline?.(form.content.value,5000).trim()||'';
    const subject=sec?.cleanText?.(form.subject.value,80).trim()||'';
    const due=captureType==='task'?(sec?.cleanDate?.(form.due.value)||''):'';
    if(!content){
      const status=captureRoot.querySelector('[data-capture-draft]');status.textContent=t('required');
      form.content.setAttribute('aria-invalid','true');form.content.focus();return;
    }
    form.content.removeAttribute('aria-invalid');
    const payload=captureRecord(captureType,subject,content,due);
    const saved=store()?.addToCollection?.(payload.collection,payload.record);
    if(!saved){ui()?.toast?.(t('required'));return;}
    const savedType=captureType;
    form.reset();captureRoot.querySelector('[data-capture-count]').textContent='0';safeSessionRemove(DRAFT_KEY);
    closeQuickCapture();showCaptureToast(payload.collection,saved,savedType);
    window.dispatchEvent(new CustomEvent('bawsala:quick-capture',{detail:{type:savedType,id:saved.id,collection:payload.collection}}));
  }
  function showCaptureToast(collection,record,type){
    doc.querySelector('.capture-action-toast')?.remove();
    const node=doc.createElement('aside');node.className='capture-action-toast';node.setAttribute('role','status');node.setAttribute('aria-live','polite');
    const message=t(type==='task'?'savedTask':type==='error'?'savedError':'savedNote');
    node.innerHTML=`<div><strong>${escapeHTML(message)}</strong><small>${escapeHTML(record.title||record.error?.slice(0,80)||record.body?.slice(0,80)||'')}</small></div><div class="actions"><a class="btn sm" href="${escapeAttr(captureDestination(type))}" data-v21-text="open">${escapeHTML(t('open'))}</a><button class="btn sm secondary" type="button" data-capture-undo data-v21-text="undo">${escapeHTML(t('undo'))}</button></div><span class="capture-action-toast__timer" aria-hidden="true"></span>`;
    body.appendChild(node);
    const timer=setTimeout(()=>node.remove(),9000);
    node.querySelector('[data-capture-undo]').addEventListener('click',()=>{
      clearTimeout(timer);
      const current=store()?.get?.(collection,[])||[];
      store()?.deleteFromCollection?.(collection,record.id);
      node.remove();ui()?.toast?.(t('undone'));
      window.dispatchEvent(new CustomEvent('bawsala:quick-capture-undo',{detail:{type,id:record.id}}));
      if(current.some(item=>item.id===record.id))renderStudyRail();
    });
  }
  function ensureHeaderCapture(){
    if(captureExcludedPages.has(page))return;
    const actions=doc.querySelector('.header-actions');if(!actions||doc.getElementById('quickCaptureOpen'))return;
    const button=doc.createElement('button');button.id='quickCaptureOpen';button.className='icon-btn quick-capture-header';button.type='button';
    button.setAttribute('aria-label',t('openCapture'));button.dataset.v21Aria='openCapture';button.title=`${t('capture')} · ${t('captureShortcut')}`;
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';
    const search=actions.querySelector('#globalSearchOpen');actions.insertBefore(button,search||actions.firstChild);
    button.addEventListener('click',()=>openQuickCapture());
  }
  function todayMinutes(){
    const day=localDate();
    const engine=window.MT_STUDY_LOOP;const sessions=store()?.get?.('study:sessions',[])||[];
    return (engine?.validSessions?.(sessions,day)||sessions.filter(item=>String(item.finishedAt||item.createdAt||'').slice(0,10)===day)).reduce((sum,item)=>sum+(Number(item.minutes)||0),0);
  }
  function dueCount(){return (store()?.get?.('notebook:flashcards',[])||[]).filter(card=>!card?.archived&&!!card?.dueAt&&Date.parse(card.dueAt)<=Date.now()).length;}
  function openTaskCount(){return (store()?.get?.('homeworks',[])||[]).filter(item=>!item?.done).length;}
  function focusDraftSnapshot(){
    const engine=window.MT_FOCUS_TIMER;
    if(!engine)return null;
    try{
      const raw=JSON.parse(localStorage.getItem('bawsala:focus-timer:v15')||'null');
      const restored=engine.restore(raw,{day:localDate(),now:Date.now()});
      if(!restored)return null;
      const view=engine.view(restored,Date.now());
      if(view.elapsedSeconds<=0&&!view.running)return null;
      return {...view,missionText:restored.missionText||restored.note||'',durationSeconds:restored.durationSeconds};
    }catch(_){return null;}
  }
  function studySnapshot(){
    const activeStore=store();
    const engine=window.MT_STUDY_LOOP;
    const mission=activeStore?.get?.('dashboard:mission',null);
    const loop=engine?.fromStore?.(activeStore,localDate())||null;
    const missionText=loop?.mission||String(mission?.text||mission?.mission||'').trim();
    const minutes=loop?.minutes??todayMinutes();
    const prefs=activeStore?.get?.('user:preferences',{})||{};
    const target=missionText?clamp(mission?.minutes||25,10,180):clamp(prefs.dailyGoal||120,15,480);
    const due=dueCount();const tasks=openTaskCount();const focusDraft=focusDraftSnapshot();
    const coreNext=loop&&engine?.nextAction?engine.nextAction(loop):{key:'mission'};
    let action={label:t('setMission'),href:relative('pages/workspace.html#mission'),kind:'mission'};
    if(focusDraft)action={label:t(focusDraft.complete?'saveTimer':'resumeTimer'),href:relative('pages/workspace.html#focus'),kind:'focus'};
    else if(missionText&&minutes<target)action={label:t('resumeMission'),href:relative('pages/workspace.html#focus'),kind:'focus'};
    else if(coreNext.key==='errors')action={label:t('openErrors'),href:relative('pages/workspace.html#errors'),kind:'error'};
    else if(missionText&&due>0)action={label:t('reviewCards'),href:relative('pages/flashcards.html'),kind:'cards'};
    else if(missionText&&tasks>0)action={label:t('openHomework'),href:relative('pages/workspace.html#homework'),kind:'task'};
    else if(missionText)action={label:t('closeDay'),href:relative('pages/workspace.html#review'),kind:'review'};
    return {missionText,minutes,target,due,tasks,focusDraft,progress:clamp(Math.round(minutes/Math.max(1,target)*100),0,100),action};
  }
  function mountStudyRail(){
    if(railExcludedPages.has(page)||rail)return;
    rail=doc.createElement('aside');rail.id='studyContextRail';rail.className='study-context-rail';rail.setAttribute('aria-label',t('todayPulse'));
    const host=doc.getElementById('siteHeader');host?.insertAdjacentElement('afterend',rail);
    rail.addEventListener('click',event=>{
      const toggle=event.target.closest('[data-rail-toggle]');if(toggle){const next=rail.dataset.collapsed!=='1';rail.dataset.collapsed=next?'1':'0';safeSessionSet(RAIL_KEY,next?'1':'0');renderStudyRail();return;}
      if(event.target.closest('[data-page-compass]')){openPageCompass();return;}
      if(event.target.closest('[data-clear-study-context]')){window.BAWSALA_STUDY?.clearContinuation?.();renderStudyRail();ui()?.toast?.(language()==='en'?'Open study context cleared.':'تم إغلاق سياق الدراسة المفتوح.');}
    });
    rail.dataset.collapsed=safeSessionGet(RAIL_KEY,'0');
    renderStudyRail();measureHeader();
  }
  function journeySnapshot(){
    const service=window.BAWSALA_STUDY;
    const current=service?.overview?.();
    if(!current)return null;
    const api=window.BAWSALA_BACKEND;
    let sync={tone:'local',label:language()==='en'?'Local only':'محلي فقط'};
    if(api?.state?.authenticated){
      if(api.state.syncing)sync={tone:'busy',label:language()==='en'?'Syncing':'جارٍ الحفظ'};
      else if(api.state.pendingSync||service.state?.lastCommitError)sync={tone:'warn',label:language()==='en'?'Sync pending':'حفظ معلّق'};
      else sync={tone:'ok',label:language()==='en'?'Synced':'متزامن'};
    }
    const target=current.priority?.target||current.loop?.nextAction?.key||'flow';
    let href=service?.continueHref?.()||relative('pages/workspace.html#flow');
    if(target==='flashcards')href=relative('pages/flashcards.html#review');
    const label=current.loop?.nextAction?.label||(language()==='en'?'Continue':'تابع الآن');
    return {...current,sync,href,label};
  }
  function renderStudyRail(){
    if(!rail)return;
    const legacy=studySnapshot();const journey=journeySnapshot();const collapsed=rail.dataset.collapsed==='1';
    rail.setAttribute('aria-label',t('todayPulse'));
    const focusDraft=legacy.focusDraft;
    const title=focusDraft?.missionText||journey?.continuation?.title||journey?.mission?.text||legacy.missionText||t('noMission');
    const done=journey?.loop?.done??0,total=journey?.loop?.total??4;
    const progress=journey?.loop?.percent??legacy.progress;
    const minutes=journey?.focus?.minutes??legacy.minutes;
    const goal=journey?.focus?.goalMinutes??legacy.target;
    const due=journey?.counts?.dueCards??legacy.due;
    const tasks=journey?.counts?.openHomeworks??legacy.tasks;
    const timerSummary=focusDraft?`${t(focusDraft.complete?'timerComplete':focusDraft.running?'timerRunning':'timerPaused')} · ${Math.ceil(focusDraft.remainingSeconds/60)} ${t('minutes')}`:'';
    const loopSummary=language()==='en'?`${done}/${total} loop steps · ${minutes}/${goal} min · ${due} cards · ${tasks} tasks`:`${done}/${total} خطوات · ${minutes}/${goal} دقيقة · ${due} بطاقة · ${tasks} واجب`;
    const summary=timerSummary?`${timerSummary} · ${loopSummary}`:loopSummary;
    const sectionsAvailable=sectionEntries.length>=3;
    const continuation=journey?.continuation;
    const origin=continuation?`<span class="study-context-rail__origin"><b>${escapeHTML(continuation.kind||'study')}</b><span>${escapeHTML(language()==='en'?'Open context':'سياق مفتوح')}</span><button type="button" data-clear-study-context aria-label="${escapeAttr(language()==='en'?'Clear open study context':'إغلاق سياق الدراسة المفتوح')}">×</button></span>`:'';
    const warningCount=journey?.warnings?.length||0;
    const sync=journey?.sync||{tone:'local',label:language()==='en'?'Local only':'محلي فقط'};
    const nextReason=journey?.priority?.reason||journey?.loop?.nextAction?.reason||'';
    const actionHref=focusDraft?relative('pages/workspace.html#focus'):(journey?.href||legacy.action.href);
    const actionLabel=focusDraft?t(focusDraft.complete?'saveTimer':'resumeTimer'):(journey?.label||legacy.action.label);
    rail.innerHTML=`<div class="study-context-rail__inner ${collapsed?'is-collapsed':''}"><button class="study-context-rail__toggle" type="button" data-rail-toggle aria-expanded="${!collapsed}" aria-label="${escapeAttr(t(collapsed?'expand':'collapse'))}"><span aria-hidden="true">${collapsed?'▾':'▴'}</span></button><div class="study-context-rail__identity"><span class="study-context-rail__pulse" aria-hidden="true"></span><span><small>${escapeHTML(language()==='en'?'Current study path':'مسار الدراسة الحالي')}</small><strong title="${escapeAttr(title)}">${escapeHTML(title)}</strong></span>${origin}</div><div class="study-context-rail__metrics" ${collapsed?'hidden':''}><div class="study-context-rail__meta"><span>${escapeHTML(summary)}</span><span class="sync-state ${escapeAttr(sync.tone)}">${escapeHTML(sync.label)}</span>${warningCount?`<span class="study-warning-count">${warningCount} ${escapeHTML(language()==='en'?'warning':'تنبيه')}</span>`:''}</div><div class="study-context-rail__progress" role="progressbar" aria-label="${escapeAttr(t('todayPulse'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i data-study-progress></i></div>${nextReason?`<small class="study-context-rail__reason">${escapeHTML(nextReason)}</small>`:''}</div><div class="study-context-rail__actions" ${collapsed?'hidden':''}>${sectionsAvailable?`<button class="btn sm ghost" type="button" data-page-compass><span aria-hidden="true">☷</span><span>${escapeHTML(t('sections'))}</span></button>`:''}<a class="btn sm primary" href="${escapeAttr(actionHref)}" data-study-action="${escapeAttr(journey?.priority?.kind||legacy.action.kind)}">${escapeHTML(actionLabel)}</a></div></div>`;
    rail.querySelector('[data-study-progress]')?.style.setProperty('--study-progress',`${progress}%`);
    rail.title=progress>=100?t('todayDone'):nextReason;
  }

  function measureHeader(){
    const header=doc.querySelector('.site-header');if(!header)return;
    const apply=()=>doc.documentElement.style.setProperty('--ui-header-height',`${Math.ceil(header.getBoundingClientRect().height)}px`);
    apply();if(window.ResizeObserver)new ResizeObserver(apply).observe(header);else addEventListener('resize',apply,{passive:true});
  }
  function slug(value,index){
    const normalized=String(value||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'').slice(0,45);
    return `section-${index+1}-${normalized||'item'}`;
  }
  function collectSections(){
    if(['workspace','admin','login','signup','reset-password'].includes(page))return [];
    const main=doc.getElementById('main');if(!main)return [];
    const headings=[...main.querySelectorAll('h2')].filter(heading=>{
      if(!heading.textContent.trim()||heading.closest('[hidden],[aria-hidden="true"],dialog,.command-center,.display-preferences,.quick-capture'))return false;
      const section=heading.closest('section');
      if(!section)return heading.parentElement===main;
      const directHeadings=[...section.querySelectorAll('h2')].filter(item=>item.closest('section')===section);
      return directHeadings[0]===heading;
    }).slice(0,12);
    return headings.map((heading,index)=>{
      if(!heading.id)heading.id=slug(heading.textContent,index);
      heading.style.scrollMarginTop='calc(var(--ui-header-height, 84px) + 92px)';
      return {id:heading.id,title:heading.textContent.trim().replace(/\s+/g,' ').slice(0,90),heading};
    });
  }
  function mountPageCompass(){
    if(compassRoot)return;
    const root=doc.createElement('div');root.id='pageCompass';root.className='page-compass';root.hidden=true;
    root.innerHTML=`<div class="page-compass__backdrop" data-compass-close></div><section class="page-compass__panel" role="dialog" aria-modal="true" aria-labelledby="pageCompassTitle"><header><div><span class="kicker">// PAGE MAP</span><h2 id="pageCompassTitle" data-v21-text="sectionMap">${escapeHTML(t('sectionMap'))}</h2><p data-v21-text="sectionIntro">${escapeHTML(t('sectionIntro'))}</p></div><button class="icon-btn" type="button" data-compass-close data-v21-aria="close" aria-label="${escapeAttr(t('close'))}">×</button></header><nav data-compass-list aria-label="${escapeAttr(t('sections'))}"></nav></section>`;
    body.appendChild(root);compassRoot=root;
    root.querySelectorAll('[data-compass-close]').forEach(node=>node.addEventListener('click',closePageCompass));
    root.addEventListener('keydown',event=>trapDialog(event,root,closePageCompass));
  }
  function rebuildSections(){
    sectionEntries=collectSections();renderStudyRail();
    if(compassRoot&&!compassRoot.hidden)renderCompassList();
  }
  function renderCompassList(){
    if(!compassRoot)return;
    const list=compassRoot.querySelector('[data-compass-list]');
    if(!sectionEntries.length){list.innerHTML=`<div class="empty">${escapeHTML(t('noSections'))}</div>`;return;}
    list.innerHTML=sectionEntries.map((entry,index)=>`<a href="#${escapeAttr(entry.id)}" data-compass-id="${escapeAttr(entry.id)}" ${entry.id===activeSectionId?'aria-current="location"':''}><span>${String(index+1).padStart(2,'0')}</span><strong>${escapeHTML(entry.title)}</strong></a>`).join('');
    list.querySelectorAll('[data-compass-id]').forEach(link=>link.addEventListener('click',event=>{
      event.preventDefault();const target=doc.getElementById(link.dataset.compassId);closePageCompass();
      target?.scrollIntoView?.({behavior:body.classList.contains('reduced-motion-ui')?'auto':'smooth',block:'start'});
      try{history.replaceState(null,'',`#${link.dataset.compassId}`);}catch(_){/* optional */}
      target?.setAttribute('tabindex','-1');setTimeout(()=>target?.focus?.({preventScroll:true}),280);
    }));
  }
  function openPageCompass(){
    rebuildSections();mountPageCompass();if(!compassRoot)return;
    renderCompassList();compassPreviousFocus=doc.activeElement;compassRoot.hidden=false;body.classList.add('page-compass-open');
    requestAnimationFrame(()=>compassRoot.querySelector('a,button')?.focus());
  }
  function closePageCompass(){
    if(!compassRoot||compassRoot.hidden)return;
    compassRoot.hidden=true;body.classList.remove('page-compass-open');
    if(compassPreviousFocus&&doc.contains(compassPreviousFocus))compassPreviousFocus.focus();
  }
  function mountReadingProgress(){
    if(doc.getElementById('pageReadingProgress'))return;
    const node=doc.createElement('div');node.id='pageReadingProgress';node.className='page-reading-progress';node.setAttribute('role','progressbar');node.setAttribute('aria-label',t('progress'));node.setAttribute('aria-valuemin','0');node.setAttribute('aria-valuemax','100');node.innerHTML='<i></i>';
    body.appendChild(node);
    const update=()=>{
      progressFrame=0;
      const max=Math.max(1,doc.documentElement.scrollHeight-innerHeight);const pct=clamp(Math.round(scrollY/max*100),0,100);
      node.style.setProperty('--page-progress',`${pct}%`);node.setAttribute('aria-valuenow',String(pct));
      let nearest='';let nearestDistance=Infinity;
      sectionEntries.forEach(entry=>{const distance=Math.abs(entry.heading.getBoundingClientRect().top-(parseFloat(getComputedStyle(doc.documentElement).getPropertyValue('--ui-header-height'))||80)-100);if(distance<nearestDistance){nearestDistance=distance;nearest=entry.id;}});
      if(nearest&&nearest!==activeSectionId){activeSectionId=nearest;if(compassRoot&&!compassRoot.hidden)renderCompassList();}
    };
    const schedule=()=>{if(!progressFrame)progressFrame=requestAnimationFrame(update);};
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});update();
  }
  function bindKeys(){
    doc.addEventListener('keydown',event=>{
      const editing=/INPUT|TEXTAREA|SELECT/.test(event.target?.tagName||'')||event.target?.isContentEditable;
      if(event.altKey&&!event.ctrlKey&&!event.metaKey&&String(event.key).toLowerCase()==='n'){
        event.preventDefault();openQuickCapture();return;
      }
      if(event.key==='Escape'&&!editing&&compassRoot&&!compassRoot.hidden)closePageCompass();
    });
  }
  function refreshLanguage(){
    renderCaptureLanguage();ensureHeaderCapture();renderStudyRail();
    if(compassRoot){compassRoot.querySelectorAll('[data-v21-text]').forEach(node=>node.textContent=t(node.dataset.v21Text));compassRoot.querySelectorAll('[data-v21-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.v21Aria)));if(!compassRoot.hidden)renderCompassList();}
    doc.querySelectorAll('[data-v21-text]').forEach(node=>{if(!node.closest('#quickCapture,#pageCompass'))node.textContent=t(node.dataset.v21Text);});
    doc.querySelectorAll('[data-v21-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.v21Aria)));
  }
  function bindMobileCapture(){
    const button=doc.getElementById('mobileDockCapture');
    if(button&&!button.dataset.captureBound){button.dataset.captureBound='1';button.addEventListener('click',()=>openQuickCapture());}
  }
  function mount(){
    if(body.dataset.frontendV21==='1')return;
    body.dataset.frontendV21='1';mountQuickCapture();mountStudyRail();mountPageCompass();mountReadingProgress();ensureHeaderCapture();bindMobileCapture();bindKeys();rebuildSections();
    const shell=doc.getElementById('siteHeader');if(shell)new MutationObserver(()=>{ensureHeaderCapture();bindMobileCapture();measureHeader();}).observe(shell,{childList:true,subtree:true});
    let rebuildTimer=0;const main=doc.getElementById('main');if(main)new MutationObserver(()=>{clearTimeout(rebuildTimer);rebuildTimer=setTimeout(rebuildSections,240);}).observe(main,{childList:true,subtree:true});
    addEventListener('mt:storage',event=>{if(trackedKeys.has(event.detail?.name))renderStudyRail();});
    addEventListener('bawsala:focus-timer',renderStudyRail);addEventListener('bawsala:study-change',renderStudyRail);addEventListener('bawsala:study-remote',renderStudyRail);addEventListener('bawsala:study-overview',renderStudyRail);addEventListener('storage',event=>{if(event.key==='bawsala:focus-timer:v15')renderStudyRail();});
    addEventListener('mt:profile',renderStudyRail);addEventListener('bawsala:sync',renderStudyRail);addEventListener('mt:language',refreshLanguage);
    addEventListener('bawsala:frontend-ready',()=>{bindMobileCapture();ensureHeaderCapture();});
    window.BAWSALA_FRONTEND={...(window.BAWSALA_FRONTEND||{}),openQuickCapture,closeQuickCapture,openPageCompass,closePageCompass,renderStudyRail};
    window.dispatchEvent(new CustomEvent('bawsala:frontend-innovation-ready',{detail:{version:'21',features:['quick-capture','study-context-rail','page-compass','reading-progress']}}));
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
