/* ===== assets/js/command-center.js ===== */
(function(){
  'use strict';
  const KEY='bawsala:command-center:recent';
  const PAGE_KEY='bawsala:command-center:pages';
  const MAX_RECENT=6;
  const normalize=value=>String(value||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[إأآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  const escapeHTML=value=>window.MT_UI?.escapeHTML?.(String(value??'')) ?? String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const escapeAttr=value=>window.MT_UI?.escapeAttr?.(String(value??'')) ?? escapeHTML(value);
  const nav=(id,title,subtitle,path,keywords='')=>({id,title,subtitle,path,keywords,group:'تنقل',run(){location.href=path;}});
  function staticCommands(){
    const commands=[
      nav('dashboard','لوحة الطالب','الخطة اليومية، العادات، والتقرير','/pages/dashboard.html','الرئيسية يومي خطة'),
      nav('workspace','مساحة الدراسة','الواجبات والجلسات والتنفيذ','/pages/workspace.html','واجب جلسه مهام'),
      nav('calendar','التقويم الذكي','الأحداث والتذكيرات وGoogle Calendar','/pages/calendar.html','موعد امتحان تقويم جوجل'),
      nav('notebook','الدفتر','الملاحظات المنظمة','/pages/notebook.html','ملاحظات كتابة'),
      nav('flashcards','الفلاش كاردز','مراجعة البطاقات المستحقة','/pages/flashcards.html','بطاقات مراجعه'),
      nav('mindmaps','الخرائط الذهنية','تنظيم الأفكار بصرياً','/pages/mindmaps.html','خريطه افكار'),
      nav('resources','المصادر','مصادر الدراسة والأدوات','/pages/resources.html','كتب روابط'),
      nav('advisor','المستشار','تحليل وضعك الدراسي','/pages/advisor.html','نصيحه تحليل'),
      nav('calculators','الحاسبات','المعدل والدرجات','/pages/calculators.html','معدل حساب درجات'),
      nav('profiles','الملفات','إدارة ملفات الطلاب','/pages/profiles.html','طلاب حسابات'),
      nav('account','الحساب','الأمان والجلسات والبيانات','/pages/account.html','كلمه مرور جلسات تصدير'),
      nav('settings','الإعدادات','المظهر والخصوصية','/pages/settings.html','ثيم خصوصيه'),
      nav('billing','الفوترة','الخطة والفواتير','/pages/billing.html','دفع اشتراك'),
      {id:'theme',title:'تبديل المظهر',subtitle:'فاتح أو داكن',keywords:'ليل نهار theme',group:'إجراء',run(){document.getElementById('themeToggle')?.click();}},
      {id:'display-preferences',title:'راحة القراءة',subtitle:'حجم النص، التباين، والكثافة',keywords:'وصول خط تكبير تباين accessibility',group:'إجراء',run(){window.BAWSALA_FRONTEND?.openPreferences?.();}},
      {id:'quick-capture',title:'التقاط سريع',subtitle:'احفظ ملاحظة أو واجبًا أو خطأ من أي صفحة',keywords:'ملاحظه واجب خطأ اضافه سريع alt n',group:'إجراء',run(){window.BAWSALA_FRONTEND?.openQuickCapture?.();}},
      {id:'page-compass',title:'خريطة الصفحة',subtitle:'انتقل مباشرة إلى القسم المطلوب',keywords:'اقسام فهرس تنقل صفحه',group:'إجراء',run(){window.BAWSALA_FRONTEND?.openPageCompass?.();}},
      {id:'export',title:'تصدير نسخة محلية',subtitle:'تنزيل بيانات المتصفح الآن',keywords:'backup نسخه احتياطية تنزيل',group:'إجراء',run(){window.MT_STORE?.downloadBackup?.();}},
      {id:'new-calendar',title:'إضافة حدث سريع',subtitle:'فتح نموذج حدث جديد في التقويم',keywords:'موعد مهمه امتحان',group:'إجراء',run(){location.href='/pages/calendar.html#calendarForm';}},
      {id:'focus-main',title:'انتقل إلى المحتوى',subtitle:'تجاوز عناصر التنقل',keywords:'accessibility وصول محتوى',group:'إجراء',run(){const main=document.getElementById('main');main?.focus?.({preventScroll:false});main?.scrollIntoView?.({behavior:'smooth',block:'start'});}}
    ];
    return commands.filter(command=>{
      if(command.id==='quick-capture')return !!document.getElementById('quickCapture');
      if(command.id==='page-compass')return !['workspace','admin'].includes(document.body?.dataset?.page||'')&&document.querySelectorAll('#main h2').length>=3;
      return true;
    });
  }
  function roleCommands(){
    const role=window.BAWSALA_BACKEND?.state?.user?.role;
    return role==='admin'?[nav('admin','مركز العمليات','المستخدمون، SLO، النسخ، والأمان','/pages/admin.html','اداره سيرفر production')]:[];
  }
  function safeStored(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch(_){return fallback;}}
  function rememberPage(){
    if(!location.pathname.endsWith('.html') && location.pathname!=='/')return;
    const title=(document.querySelector('h1')?.textContent||document.title||location.pathname).trim().slice(0,90);
    const current={path:location.pathname+location.hash,title,at:new Date().toISOString()};
    const next=[current,...safeStored(PAGE_KEY,[]).filter(item=>item?.path&&item.path!==current.path)].slice(0,5);
    try{localStorage.setItem(PAGE_KEY,JSON.stringify(next));}catch(_){}
  }
  function recentPageCommands(){
    return safeStored(PAGE_KEY,[]).filter(item=>item?.path&&item.path!==location.pathname+location.hash).slice(0,3).map((item,index)=>nav(`recent-page-${index}`,`العودة: ${item.title}`,'آخر مسار عمل فتحته',item.path,'رجوع اكمل تابع')).map(item=>({...item,group:'استئناف'}));
  }
  function contextCommands(){
    const store=window.MT_STORE;
    if(!store)return [];
    const commands=[];
    const mission=store.get?.('dashboard:mission',null);
    const missionText=String(mission?.text||mission?.mission||'').trim();
    if(missionText)commands.push({id:'resume-mission',title:`أكمل: ${missionText.slice(0,55)}`,subtitle:`جلسة ${Number(mission?.minutes)||25} دقيقة بدل فتح مسار جديد`,keywords:'اكمل مهمه تركيز الان',group:'الخطوة التالية',run(){location.href='/pages/workspace.html#focus';}});
    const due=(store.get?.('notebook:flashcards',[])||[]).filter(card=>!card?.archived&&!!card?.dueAt&&Date.parse(card.dueAt)<=Date.now()).length;
    if(due)commands.push({id:'review-due',title:`راجع ${due} بطاقة مستحقة`,subtitle:'أغلق التراكم قبل إضافة بطاقات جديدة',keywords:'فلاش بطاقات مراجعه مستحقه',group:'الخطوة التالية',run(){location.href='/pages/flashcards.html';}});
    const open=(store.get?.('homeworks',[])||[]).filter(item=>!item?.done).length;
    if(open)commands.push({id:'open-homework',title:`نفّذ أقرب واجب من ${open}`,subtitle:'انتقل مباشرة لقائمة التنفيذ',keywords:'واجب مهام تنفيذ',group:'الخطوة التالية',run(){location.href='/pages/workspace.html#homework';}});
    if(window.BAWSALA_BACKEND?.state?.pendingSync)commands.unshift({id:'flush-sync',title:'ارفع التغييرات المعلقة الآن',subtitle:'الاتصال عاد وهناك بيانات لم تُرفع بعد',keywords:'مزامنه offline رفع',group:'الخطوة التالية',async run(){await window.BAWSALA_BACKEND?.flushPendingSync?.();}});
    if(document.body?.dataset?.page==='workspace')commands.unshift({id:'focus-mode',title:'وضع التركيز',subtitle:'إخفاء عناصر التنقل والتشتيت مؤقتًا',keywords:'تركيز ملء شاشه هدوء',group:'الخطوة التالية',run(){window.BAWSALA_FRONTEND?.setFocusMode?.(!document.body.classList.contains('workspace-focus-mode'));}});
    return commands.slice(0,4);
  }
  function recentIds(){
    try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>typeof x==='string').slice(0,MAX_RECENT);}catch(_){return [];}
  }
  function remember(id){
    const next=[id,...recentIds().filter(item=>item!==id)].slice(0,MAX_RECENT);
    try{localStorage.setItem(KEY,JSON.stringify(next));}catch(_){}
  }
  function score(command,query){
    if(!query)return recentIds().includes(command.id)?100:10;
    const hay=normalize([command.title,command.subtitle,command.keywords,command.group].join(' '));
    if(hay===query)return 120;
    if(normalize(command.title).startsWith(query))return 100;
    if(hay.includes(query))return 70;
    const terms=query.split(' ').filter(Boolean);
    const matched=terms.filter(term=>hay.includes(term)).length;
    return matched===terms.length?50+matched:0;
  }
  function mount(){
    if(document.getElementById('commandCenter'))return;
    rememberPage();
    const trigger=document.createElement('button');
    trigger.id='commandCenterTrigger';
    trigger.className='command-center-trigger';
    trigger.type='button';
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-controls','commandCenter');
    trigger.innerHTML='<span aria-hidden="true">⌘</span><span>الأوامر</span><kbd>Ctrl K</kbd>';
    document.body.appendChild(trigger);

    const root=document.createElement('div');
    root.id='commandCenter';
    root.className='command-center';
    root.hidden=true;
    root.innerHTML=`<div class="command-center-backdrop" data-command-close></div><section class="command-center-panel" role="dialog" aria-modal="true" aria-labelledby="commandCenterTitle"><header><div><span class="kicker">// QUICK COMMANDS</span><h2 id="commandCenterTitle">مركز الأوامر</h2></div><button class="icon-btn" type="button" data-command-close aria-label="إغلاق">×</button></header><label class="command-center-search"><span class="sr-only">ابحث عن أمر أو صفحة</span><span aria-hidden="true">⌕</span><input id="commandCenterInput" type="search" autocomplete="off" spellcheck="false" placeholder="اكتب: تقويم، جلسة، إعدادات…" aria-controls="commandCenterResults" aria-autocomplete="list"><kbd>ESC</kbd></label><div class="command-center-hint"><span>↑↓ للتنقل</span><span>Enter للتنفيذ</span><span>Ctrl K للفتح</span></div><div id="commandCenterResults" class="command-center-results" role="listbox" aria-live="polite"></div></section>`;
    document.body.appendChild(root);
    const input=root.querySelector('#commandCenterInput');
    const results=root.querySelector('#commandCenterResults');
    let selected=0;
    let visible=[];
    let previousFocus=null;

    function commands(){return [...contextCommands(),...recentPageCommands(),...staticCommands(),...roleCommands()];}
    function render(){
      const query=normalize(input.value);
      visible=commands().map(command=>({command,rank:score(command,query)})).filter(item=>item.rank>0).sort((a,b)=>b.rank-a.rank||a.command.title.localeCompare(b.command.title,'ar')).slice(0,12).map(item=>item.command);
      selected=Math.max(0,Math.min(selected,visible.length-1));
      if(!visible.length){results.innerHTML='<div class="empty">لا يوجد أمر مطابق. اكتب كلمة أبسط بدل جملة طويلة.</div>';return;}
      results.innerHTML=visible.map((command,index)=>`<button type="button" role="option" aria-selected="${index===selected}" class="command-result ${index===selected?'selected':''}" data-command-id="${escapeAttr(command.id)}"><span class="command-result-icon" aria-hidden="true">${command.group==='تنقل'?'↗':'⚡'}</span><span><strong>${escapeHTML(command.title)}</strong><small>${escapeHTML(command.subtitle)}</small></span><em>${escapeHTML(command.group)}</em></button>`).join('');
      results.querySelectorAll('[data-command-id]').forEach(button=>button.addEventListener('click',()=>execute(button.dataset.commandId)));
      results.querySelector('.selected')?.scrollIntoView?.({block:'nearest'});
    }
    async function execute(id){
      const command=commands().find(item=>item.id===id);
      if(!command)return;
      remember(command.id);
      close(false);
      try{await Promise.resolve(command.run());window.dispatchEvent(new CustomEvent('bawsala:command',{detail:{id:command.id}}));}catch(error){window.MT_UI?.toast?.(error?.userMessage||'تعذر تنفيذ الأمر.');console.error(error);}
    }
    function open(){
      previousFocus=document.activeElement;
      root.hidden=false;
      document.body.classList.add('command-center-open');
      trigger.setAttribute('aria-expanded','true');
      input.value='';selected=0;render();
      requestAnimationFrame(()=>input.focus());
    }
    function close(restore=true){
      if(root.hidden)return;
      root.hidden=true;
      document.body.classList.remove('command-center-open');
      trigger.setAttribute('aria-expanded','false');
      if(restore&&previousFocus&&document.contains(previousFocus))previousFocus.focus();
    }
    trigger.addEventListener('click',open);
    root.querySelectorAll('[data-command-close]').forEach(node=>node.addEventListener('click',()=>close()));
    input.addEventListener('input',()=>{selected=0;render();});
    input.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'){event.preventDefault();selected=Math.min(visible.length-1,selected+1);render();}
      else if(event.key==='ArrowUp'){event.preventDefault();selected=Math.max(0,selected-1);render();}
      else if(event.key==='Enter'){event.preventDefault();if(visible[selected])execute(visible[selected].id);}
      else if(event.key==='Escape'){event.preventDefault();close();}
      else if(event.key==='Tab'){
        const focusables=[...root.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(el=>el.offsetParent!==null);
        if(!focusables.length)return;
        const first=focusables[0],last=focusables[focusables.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    document.addEventListener('keydown',event=>{
      const shortcut=(event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='k';
      if(shortcut){event.preventDefault();root.hidden?open():close();}
      else if(event.key==='Escape'&&!root.hidden){event.preventDefault();close();}
    });
    window.addEventListener('bawsala:auth',()=>{if(!root.hidden)render();});
    window.BAWSALA_COMMAND_CENTER={open,close};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

;
/* ===== assets/js/frontend-v20.js ===== */
(function(){
  'use strict';
  const doc=document;
  const body=doc.body;
  const page=body?.dataset?.page||'home';
  const isNested=location.pathname.includes('/pages/');
  const base=isNested?'../':'./';
  const PREF_KEY='user:preferences';
  const FOCUS_KEY='bawsala:workspace:focus-mode';
  const safe=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const copy={
    ar:{today:'اليوم',study:'الدراسة',calendar:'التقويم',resources:'المصادر',capture:'التقاط',more:'المزيد',mobileNav:'تنقل سريع للموبايل',openCommands:'فتح جميع الأوامر',readingComfort:'راحة القراءة',openReading:'فتح إعدادات راحة القراءة',displayKicker:'// DISPLAY',displayTitle:'راحة القراءة',displayIntro:'غيّر العرض بدون إعادة تحميل الصفحة.',fontSize:'حجم النص',normal:'عادي',large:'كبير',xlarge:'كبير جدًا',contrast:'التباين',standard:'قياسي',high:'مرتفع',density:'كثافة الواجهة',comfortable:'مريح',compact:'مدمج',motion:'الحركة',natural:'طبيعية',reduced:'مخففة',reset:'استعادة الافتراضي',done:'تم',close:'إغلاق',focusMode:'وضع التركيز',exitFocus:'إنهاء التركيز',focusOn:'تم إخفاء عناصر التشتيت. اضغط Escape للخروج.',focusOff:'تم إنهاء وضع التركيز.'},
    en:{today:'Today',study:'Study',calendar:'Calendar',resources:'Resources',capture:'Capture',more:'More',mobileNav:'Quick mobile navigation',openCommands:'Open all commands',readingComfort:'Reading comfort',openReading:'Open reading comfort settings',displayKicker:'// DISPLAY',displayTitle:'Reading comfort',displayIntro:'Adjust the interface without reloading the page.',fontSize:'Text size',normal:'Normal',large:'Large',xlarge:'Extra large',contrast:'Contrast',standard:'Standard',high:'High',density:'Interface density',comfortable:'Comfortable',compact:'Compact',motion:'Motion',natural:'Standard',reduced:'Reduced',reset:'Reset defaults',done:'Done',close:'Close',focusMode:'Focus mode',exitFocus:'Exit focus',focusOn:'Distractions hidden. Press Escape to exit.',focusOff:'Focus mode ended.'}
  };
  const language=()=>window.MT_STORE?.get?.('language','ar')==='en'?'en':'ar';
  const t=key=>copy[language()][key]||copy.ar[key]||key;
  const routes=[
    {id:'dashboard',labelKey:'today',href:'pages/dashboard.html',icon:'home'},
    {id:'workspace',labelKey:'study',href:'pages/workspace.html#flow',icon:'focus'},
    {id:'calendar',labelKey:'calendar',href:'pages/calendar.html',icon:'calendar'}
  ];
  const icons={
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    focus:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 8v4l3 2M4 4l3 3M20 4l-3 3"/></svg>',
    calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M8 14h2M14 14h2M8 18h2"/></svg>',
    book:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22z"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    plus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    eye:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.7"/></svg>',
    expand:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>'
  };
  let preferencesRoot=null;
  let previousFocus=null;

  function store(){return window.MT_STORE;}
  function currentPreferences(){
    const value=store()?.get?.(PREF_KEY,{})||{};
    return {
      startPage:value.startPage||'dashboard.html',
      defaultFocus:Number(value.defaultFocus)||25,
      dailyGoal:Number(value.dailyGoal)||120,
      compact:!!value.compact,
      reduceMotion:!!value.reduceMotion,
      autoSync:value.autoSync!==false,
      notifications:!!value.notifications,
      fontScale:['normal','large','xlarge'].includes(value.fontScale)?value.fontScale:'normal',
      contrast:['standard','high'].includes(value.contrast)?value.contrast:'standard'
    };
  }
  function savePreferences(next){
    const prefs={...currentPreferences(),...next};
    store()?.set?.(PREF_KEY,prefs);
    applyPreferences(prefs);
    window.dispatchEvent(new CustomEvent('bawsala:display-preferences',{detail:prefs}));
    return prefs;
  }
  function applyPreferences(input=currentPreferences()){
    const prefs={...currentPreferences(),...input};
    doc.documentElement.dataset.fontScale=prefs.fontScale;
    doc.documentElement.dataset.contrast=prefs.contrast;
    body.classList.toggle('compact-ui',!!prefs.compact);
    body.classList.toggle('reduced-motion-ui',!!prefs.reduceMotion);
    body.dataset.motion=prefs.reduceMotion?'reduced':'standard';
    preferencesRoot?.querySelectorAll('[data-pref-group]').forEach(group=>{
      const key=group.dataset.prefGroup;
      group.querySelectorAll('[data-pref-value]').forEach(button=>{
        const active=String(prefs[key])===button.dataset.prefValue;
        button.classList.toggle('active',active);
        button.setAttribute('aria-pressed',String(active));
      });
    });
  }
  function relative(path){return base+path;}
  function ensureMainFocus(){
    const main=doc.getElementById('main');
    if(main&&!main.hasAttribute('tabindex'))main.setAttribute('tabindex','-1');
  }
  function mountMobileDock(){
    if(['login','signup','signup-success','reset-password','welcome','legal','company','services','admin'].includes(page)||doc.getElementById('mobileDock'))return;
    const dock=doc.createElement('nav');
    dock.id='mobileDock';
    dock.className='mobile-dock';
    dock.setAttribute('aria-label',t('mobileNav'));
    dock.dataset.uiAria='mobileNav';
    const links=routes.map(route=>{
      const active=page===route.id;
      return `<a href="${safe(relative(route.href))}" ${active?'aria-current="page"':''}><span class="mobile-dock__icon">${icons[route.icon]}</span><span data-ui-text="${safe(route.labelKey)}">${safe(t(route.labelKey))}</span></a>`;
    }).join('');
    const parts=links.split('</a>');
    const firstTwo=parts.slice(0,2).filter(Boolean).map(item=>item+'</a>').join('');
    const remaining=parts.slice(2).filter(Boolean).map(item=>item+'</a>').join('');
    dock.innerHTML=`${firstTwo}<button type="button" id="mobileDockCapture" class="mobile-dock__capture" aria-label="${safe(t('capture'))}"><span class="mobile-dock__icon">${icons.plus}</span><span data-ui-text="capture">${safe(t('capture'))}</span></button>${remaining}<button type="button" id="mobileDockMore" aria-label="${safe(t('openCommands'))}" data-ui-aria="openCommands"><span class="mobile-dock__icon">${icons.more}</span><span data-ui-text="more">${safe(t('more'))}</span></button>`;
    body.appendChild(dock);
    const captureButton=dock.querySelector('#mobileDockCapture');
    if(captureButton){captureButton.dataset.captureBound='1';captureButton.addEventListener('click',()=>window.BAWSALA_FRONTEND?.openQuickCapture?.());}
    dock.querySelector('#mobileDockMore')?.addEventListener('click',()=>window.BAWSALA_COMMAND_CENTER?.open?.());
  }
  function preferenceButton(labelKey,value){return `<button type="button" data-pref-value="${safe(value)}" aria-pressed="false" data-ui-text="${safe(labelKey)}">${safe(t(labelKey))}</button>`;}
  function mountPreferences(){
    if(doc.getElementById('displayPreferences'))return;
    const root=doc.createElement('div');
    root.id='displayPreferences';
    root.className='display-preferences';
    root.hidden=true;
    root.innerHTML=`<div class="display-preferences__backdrop" data-display-close></div><section class="display-preferences__panel" role="dialog" aria-modal="true" aria-labelledby="displayPreferencesTitle"><header><div><span class="kicker" data-ui-text="displayKicker">${safe(t('displayKicker'))}</span><h2 id="displayPreferencesTitle" data-ui-text="displayTitle">${safe(t('displayTitle'))}</h2><p data-ui-text="displayIntro">${safe(t('displayIntro'))}</p></div><button class="icon-btn" type="button" data-display-close aria-label="${safe(t('close'))}" data-ui-aria="close">×</button></header><div class="display-preferences__body"><fieldset data-pref-group="fontScale"><legend data-ui-text="fontSize">${safe(t('fontSize'))}</legend><div class="segmented-control">${preferenceButton('normal','normal')}${preferenceButton('large','large')}${preferenceButton('xlarge','xlarge')}</div></fieldset><fieldset data-pref-group="contrast"><legend data-ui-text="contrast">${safe(t('contrast'))}</legend><div class="segmented-control">${preferenceButton('standard','standard')}${preferenceButton('high','high')}</div></fieldset><fieldset data-pref-group="compact"><legend data-ui-text="density">${safe(t('density'))}</legend><div class="segmented-control">${preferenceButton('comfortable','false')}${preferenceButton('compact','true')}</div></fieldset><fieldset data-pref-group="reduceMotion"><legend data-ui-text="motion">${safe(t('motion'))}</legend><div class="segmented-control">${preferenceButton('natural','false')}${preferenceButton('reduced','true')}</div></fieldset></div><footer><button class="btn ghost" type="button" id="displayPreferencesReset" data-ui-text="reset">${safe(t('reset'))}</button><button class="btn primary" type="button" data-display-close data-ui-text="done">${safe(t('done'))}</button></footer></section>`;
    body.appendChild(root);
    preferencesRoot=root;
    root.querySelectorAll('[data-display-close]').forEach(node=>node.addEventListener('click',()=>closePreferences()));
    root.querySelectorAll('[data-pref-value]').forEach(button=>button.addEventListener('click',()=>{
      const group=button.closest('[data-pref-group]')?.dataset.prefGroup;
      if(!group)return;
      let value=button.dataset.prefValue;
      if(value==='true'||value==='false')value=value==='true';
      savePreferences({[group]:value});
    }));
    root.querySelector('#displayPreferencesReset')?.addEventListener('click',()=>savePreferences({fontScale:'normal',contrast:'standard',compact:false,reduceMotion:false}));
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();closePreferences();return;}
      if(event.key!=='Tab')return;
      const focusables=[...root.querySelectorAll('button:not([disabled])')].filter(el=>el.offsetParent!==null);
      if(!focusables.length)return;
      const first=focusables[0],last=focusables[focusables.length-1];
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
    });
    applyPreferences();
  }
  function openPreferences(){
    mountPreferences();
    previousFocus=doc.activeElement;
    preferencesRoot.hidden=false;
    body.classList.add('display-preferences-open');
    requestAnimationFrame(()=>preferencesRoot.querySelector('button')?.focus());
  }
  function closePreferences(){
    if(!preferencesRoot||preferencesRoot.hidden)return;
    preferencesRoot.hidden=true;
    body.classList.remove('display-preferences-open');
    if(previousFocus&&doc.contains(previousFocus))previousFocus.focus();
  }
  function ensureHeaderTrigger(){
    const actions=doc.querySelector('.header-actions');
    if(!actions||doc.getElementById('displayPreferencesOpen'))return;
    const button=doc.createElement('button');
    button.id='displayPreferencesOpen';
    button.className='icon-btn display-preferences-trigger';
    button.type='button';
    button.title=t('readingComfort');
    button.dataset.uiTitle='readingComfort';
    button.setAttribute('aria-label',t('openReading'));
    button.dataset.uiAria='openReading';
    button.innerHTML=`<span aria-hidden="true">${icons.eye}</span>`;
    const language=actions.querySelector('#languageToggle');
    actions.insertBefore(button,language||actions.firstChild);
    button.addEventListener('click',openPreferences);
  }
  function setFocusMode(enabled,announce=true){
    if(page!=='workspace')return;
    body.classList.toggle('workspace-focus-mode',enabled);
    body.dataset.focusMode=enabled?'on':'off';
    const layout=doc.querySelector('.study-room-layout');
    const main=doc.getElementById('main');
    if(enabled){
      layout?.style.setProperty('grid-template-columns','1fr','important');
      main?.style.setProperty('padding-top','1rem','important');
    }else{
      layout?.style.removeProperty('grid-template-columns');
      main?.style.removeProperty('padding-top');
    }
    try{sessionStorage.setItem(FOCUS_KEY,enabled?'1':'0');}catch(_){/* no-op */}
    doc.querySelectorAll('[data-focus-mode-toggle]').forEach(button=>{
      button.setAttribute('aria-pressed',String(enabled));
      button.querySelector('[data-focus-label]')?.replaceChildren(doc.createTextNode(enabled?t('exitFocus'):t('focusMode')));
    });
    if(announce)window.MT_UI?.toast?.(enabled?t('focusOn'):t('focusOff'));
  }
  function mountFocusMode(){
    if(page!=='workspace'||doc.getElementById('workspaceFocusModeToggle'))return;
    const host=doc.querySelector('.workspace-profile-strip')||doc.querySelector('.workspace-title');
    if(!host)return;
    const button=doc.createElement('button');
    button.id='workspaceFocusModeToggle';
    button.className='btn sm workspace-focus-toggle';
    button.type='button';
    button.dataset.focusModeToggle='1';
    button.setAttribute('aria-pressed','false');
    button.innerHTML=`<span aria-hidden="true">${icons.expand}</span><span data-focus-label data-ui-text="focusMode">${safe(t('focusMode'))}</span>`;
    host.appendChild(button);
    const exit=doc.createElement('button');
    exit.className='workspace-focus-exit';
    exit.type='button';
    exit.dataset.focusModeToggle='1';
    exit.setAttribute('aria-pressed','false');
    exit.innerHTML=`<span data-focus-label data-ui-text="exitFocus">${safe(t('exitFocus'))}</span><kbd>ESC</kbd>`;
    body.appendChild(exit);
    [button,exit].forEach(node=>node.addEventListener('click',()=>setFocusMode(!body.classList.contains('workspace-focus-mode'))));
    let saved=false;try{saved=sessionStorage.getItem(FOCUS_KEY)==='1';}catch(_){saved=false;}
    setFocusMode(saved,false);
  }
  function bindNavigationFeedback(){
    doc.addEventListener('click',event=>{
      const link=event.target.closest?.('a[href]');
      if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      if(link.target==='_blank'||link.hasAttribute('download'))return;
      let target;try{target=new URL(link.href,location.href);}catch(_){return;}
      if(target.origin!==location.origin||target.pathname===location.pathname&&target.search===location.search&&target.hash)return;
      body.classList.add('is-navigating');
    });
    addEventListener('pageshow',()=>body.classList.remove('is-navigating'));
  }
  function refreshLanguage(){
    doc.querySelectorAll('[data-ui-text]').forEach(node=>{node.textContent=t(node.dataset.uiText);});
    doc.querySelectorAll('[data-ui-aria]').forEach(node=>node.setAttribute('aria-label',t(node.dataset.uiAria)));
    doc.querySelectorAll('[data-ui-title]').forEach(node=>node.setAttribute('title',t(node.dataset.uiTitle)));
    const dock=doc.getElementById('mobileDock');
    if(dock)dock.setAttribute('aria-label',t('mobileNav'));
    if(page==='workspace')setFocusMode(body.classList.contains('workspace-focus-mode'),false);
  }
  function bindGlobalKeys(){
    doc.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&body.classList.contains('workspace-focus-mode'))setFocusMode(false);
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&String(event.key).toLowerCase()==='a'){
        event.preventDefault();openPreferences();
      }
    });
  }
  function mount(){
    if(!body||body.dataset.frontendV20==='1')return;
    body.dataset.frontendV20='1';
    ensureMainFocus();
    mountMobileDock();
    mountPreferences();
    ensureHeaderTrigger();
    mountFocusMode();
    bindNavigationFeedback();
    bindGlobalKeys();
    const shell=doc.getElementById('siteHeader');
    if(shell)new MutationObserver(ensureHeaderTrigger).observe(shell,{childList:true,subtree:true});
    addEventListener('mt:language',()=>{ensureHeaderTrigger();refreshLanguage();});
    addEventListener('mt:storage',event=>{if(event.detail?.name===PREF_KEY)applyPreferences(event.detail.value||{});});
    refreshLanguage();
    window.BAWSALA_FRONTEND={openPreferences,closePreferences,applyPreferences,savePreferences,setFocusMode};
    window.dispatchEvent(new CustomEvent('bawsala:frontend-ready',{detail:{version:'20'}}));
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

;
/* ===== assets/js/i18n.js ===== */
(function(){
  const MAP = {
    'تجاوز إلى المحتوى':'Skip to content','الرئيسية':'Home','لوحة الطالب':'Dashboard','البروفايلات':'Profiles','الدفاتر':'Notebooks','الدراسة':'Study','المصادر':'Resources','المعدل':'Grades','المجتمع':'Community','الخدمات':'Services','من نحن':'About','التشخيص':'Advisor','خرائط ذهنية':'Mind Maps','فلاش كاردز':'Flashcards','القانوني والخصوصية':'Legal & Privacy','واتساب':'WhatsApp',
    'بوصلة: طريق الدراسة يصبح واضحاً من أول قرار.':'Bawsala: your study path becomes clear from the first decision.','بوصلة: طريق الدراسة واضح من أول ضغطة.':'Bawsala: your study path is clear from the first click.','طريقك الدراسي واضح. مجاني أولاً. منظم دائماً.':'Your study path is clear. Free first. Always organized.','منصة مجانية تنظّم يوم الطالب: بروفايلات، مهمة اليوم، مؤقت تركيز، دفاتر ملاحظات ويوميات، مصادر مجانية، حاسبة معدل، ومكان آمن لتسجيل المشاكل الدراسية.':'A free platform that organizes the student day: profiles, daily mission, focus timer, notes, diary, free resources, grade calculators, and a private place for study problems.',
    'حلّل حالتي':'Analyze my case','ابدأ الدراسة الآن':'Start studying now','أنشئ بروفايل':'Create profile','مصادر مجانية':'Free resources','كل شيء مهم للدراسة بدون ازدحام.':'Everything important for studying, without clutter.','آخر نشاط لهذا الطالب':'Latest activity for this student','ابدأ خلال دقيقتين':'Start in two minutes','مهمة اليوم':'Today mission','ملاحظة جديدة':'New note','واجب يومي':'Daily homework','مشكلة طالب':'Student problem','بروفايلات':'Profiles','مصدر مفهرس':'Indexed resources','خيارات مجانية':'Free options','واجبات مفتوحة':'Open homework','جلسات تركيز':'Focus sessions','مشاكل محفوظة':'Saved problems',
    'لوحة الطالب اليومية.':'Daily student dashboard.','لا تبدأ يومك بسؤال: ماذا أدرس؟ ابدأ بمهمة واحدة، مؤقت، واجب، ودفتر أخطاء.':'Do not start your day asking what to study. Start with one mission, a timer, homework, and an error log.','كل الأرقام مرتبطة بالبروفايل النشط فقط.':'All numbers belong to the active profile only.','اليوم':'Today','واجبات منجزة':'Done homework','تقدم أسبوعي':'Weekly progress','قالب سريع':'Quick template','المهمة':'Mission','الدقائق':'Minutes','حفظ المهمة':'Save mission','لا توجد مهمة محفوظة بعد.':'No saved mission yet.','نسخ المهمة':'Copy mission','مؤقت التركيز':'Focus timer','ابدأ':'Start','إيقاف':'Pause','إعادة':'Reset','خطة أسبوعية':'Weekly plan','توليد خطة':'Generate plan','مسح الخطة':'Clear plan','ملاحظات سريعة':'Quick notes','حفظ':'Save','نسخ':'Copy','افتح الدفتر':'Open notebook','مراجعة اليوم':'Daily review','الطاقة':'Energy','الالتزام':'Commitment','أكبر عائق اليوم':'Biggest blocker today','حفظ المراجعة':'Save review','تقرير مختصر':'Short report','نسخ التقرير':'Copy report','إرسال واتساب':'Send WhatsApp','روابط سريعة':'Quick links',
    'تشخيص ذكي قبل اختيار المصدر.':'Smart diagnosis before choosing a resource.','اكتب وضعك كما هو. بوصلة يترجم المشكلة إلى قرار عملي: مصدر مجاني، تدريب، خطة ضبط، أو دعم محدد.':'Write your situation honestly. Bawsala turns it into a practical decision: free resource, practice, discipline plan, or targeted support.','اشرح وضعك بجملة':'Explain your situation in one sentence','المسار':'Track','توجيهي أكاديمي':'Academic Tawjihi','المستوى الحالي':'Current level','الميزانية':'Budget','لا أريد الدفع الآن':'I do not want to pay now','ميزانية قليلة':'Low budget','مستعد أدفع إذا في سبب':'I may pay if there is a real reason','ساعات يومية واقعية':'Real daily hours','نوع المشكلة':'Problem type','اختيار مصدر':'Choosing a resource','فهم الدروس':'Understanding lessons','حل أسئلة':'Solving questions','التزام وتنظيم':'Commitment and organization','ضغط وخوف':'Stress and fear','قرب الامتحان':'Exam timing','بعيد':'Far','خلال شهر':'Within a month','قريب جداً':'Very soon','أعطني قراراً واضحاً':'Give me a clear decision','املأ التشخيص':'Fill the diagnosis','القرار سيظهر هنا مع خطة مختصرة ومصادر مناسبة.':'Your decision will appear here with a short plan and suitable resources.',
    'مصادر دراسة تقلل الفوضى.':'Study resources that reduce chaos.','اختر مصدرين أو ثلاثة فقط. الهدف أن تدرس، لا أن تجمع روابط.':'Choose only two or three resources. The goal is to study, not collect links.','كل التكاليف':'All costs','مجاني':'Free','مدفوع':'Paid','مختلط':'Mixed','كل المسارات':'All tracks','أكاديمي':'Academic','كل الأنواع':'All types','رسمي':'Official','منصة':'Platform','بنك أسئلة':'Question bank','قنوات':'Channels','معلم':'Teacher','أداة':'Tool','كل المواد':'All subjects','عام':'General',
    'حاسبة معدل تقديرية.':'Estimated grade calculator.','غيّر الأوزان حسب تعليمات المدرسة أو الجهة الرسمية. الرقم هنا للتخطيط لا للاعتماد النهائي.':'Adjust weights according to official instructions. This is for planning, not final certification.','حاسبة التوجيهي الأكاديمي':'Academic Tawjihi calculator','اختر المسار':'Choose track','المعدل التقديري':'Estimated average','إضافة مادة':'Add subject','إعادة ضبط':'Reset','حاسبة معدل BTEC':'BTEC grade calculator','تقسيم تقديري: السنة الأولى من 35، التوجيهي من 35، والمواد المشتركة من 30.':'Estimated split: first year 35, final year 35, shared academic subjects 30.','التخصص':'Specialty','معدل السنة الأولى':'First-year average','معدل التوجيهي BTEC':'BTEC final-year average','المعدل النهائي المقدر':'Estimated final average','المواد الأكاديمية المشتركة':'Shared academic subjects','السنة الأولى':'First year','اللغة الإنجليزية':'English','اللغة العربية':'Arabic','التربية الإسلامية':'Islamic Education','تاريخ الأردن':'Jordan History','قاموس أوامر BTEC':'BTEC command-word dictionary',
    'واجبات يومية وجولات دراسة.':'Daily homework and study rounds.','اعرف ماذا تفعل الآن: واجب صغير، جولة واضحة، ومحاضرة قصيرة تفيدك فعلاً.':'Know what to do now: small homework, clear round, and a useful short lecture.','الواجبات اليومية':'Daily homework','عنوان الواجب':'Homework title','المادة':'Subject','الموعد':'Due date','الأولوية':'Priority','إضافة واجب':'Add homework','مفتوحة':'Open','منجزة':'Done','نسخ واجبات اليوم':'Copy today homework','الجولات الدراسية':'Study rounds','عدد الجولات':'Number of rounds','مدة الجولة بالدقائق':'Round minutes','الهدف':'Goal','ولّد الجولات':'Generate rounds','قائمة الواجبات':'Homework list','جولات اليوم':'Today rounds','محاضرات تثقيفية وتعليمية':'Educational lectures',
    'دفاتر الطالب.':'Student notebooks.','دفتر ملاحظات ويوميات وبطاقات مراجعة مرتبطة بالبروفايل النشط.':'Notes, diary, and review cards linked to the active profile.','إضافة ملاحظة':'Add note','العنوان':'Title','النص':'Text','تثبيت':'Pin','حفظ الملاحظة':'Save note','دفتر يوميات':'Diary','المزاج':'Mood','ما الذي أنجزته؟':'What did you finish?','ما العائق؟':'What blocked you?','أول مهمة غداً':'First task tomorrow','حفظ اليومية':'Save diary','نسخ ملخص الدفتر':'Copy notebook summary','الملاحظات':'Notes','بطاقة مراجعة':'Review card','السؤال':'Question','الإجابة':'Answer','إضافة بطاقة':'Add card','بطاقات المراجعة':'Review cards','اليوميات':'Diary entries',
    'مجتمع وخصوصية الطالب.':'Student voice and privacy.','مشاكل الطلاب لا تظهر كمنشورات عامة. كل مشكلة مرتبطة بالبروفايل النشط، وتظهر لصاحبها ولوحة التحكم فقط.':'Student problems are not public posts. Each problem belongs to the active profile and is visible only to that profile and the control panel.','اكتب مشكلة':'Write a problem','خصوصية المشكلة':'Problem privacy','العنوان المختصر':'Short title','الفئة':'Category','التفاصيل':'Details','إرسال المشكلة':'Save problem','مشاكلي المحفوظة':'My saved problems','مجموعات دراسية داخل الموقع':'Study groups inside the site','اسم المجموعة':'Group name','السعة':'Capacity','إنشاء مجموعة':'Create group','المجموعات':'Groups',
    'خدمات مساندة عند الحاجة فقط.':'Support services only when needed.','الخدمات ليست محور المنصة. الأصل أن يدرس الطالب مجاناً، والخدمة تستخدم فقط عندما تختصر مشكلة عملية في تقرير أو BTEC أو عرض.':'Services are not the core of the platform. The student should study for free first; services are used only when they solve a practical need.','لا ندفع الطالب للدفع.':'We do not push students to pay.','اكتب مشكلتك':'Write your problem','افحص حاجتك أولاً':'Check your need first',
    'من نحن.':'About us.','بوصلة منصة دراسة مجانية تساعد الطالب الأردني على تقليل الفوضى وبناء يوم دراسي واضح.':'Bawsala is a free study platform that helps Jordanian students reduce chaos and build a clear study day.','مهمتنا':'Our mission','مبادئ بوصلة':'Bawsala principles','المجاني أولاً.':'Free first.','مصدر واحد واضح أفضل من عشرة روابط.':'One clear resource is better than ten links.','لا قرار شراء بدون تشخيص وتجربة.':'No purchase decision without diagnosis and trial.','مشاكل الطلاب ليست محتوى عاماً.':'Student problems are not public content.','كل طالب له بروفايله ودفاتره.':'Every student has a profile and notebooks.','الاستقلالية':'Independence','بوصلة لا تدّعي أنه جهة رسمية ولا يمثل وزارة أو منصة تعليمية أخرى. الدليل يوجهك إلى المصادر بوضوح، والقرار يبقى للطالب وولي الأمر.':'Bawsala does not claim to be an official authority and does not represent a ministry or another platform. The directory points to resources clearly, and the decision stays with the student and guardian.',

    'خرائط ذهنية للدراسة.':'Mind maps for studying.','حوّل الدرس من كلام طويل إلى مركز وفروع: تعريفات، قوانين، أمثلة، أخطاء، وأسئلة متوقعة.':'Turn a long lesson into a center and branches: definitions, rules, examples, mistakes, and expected questions.','إنشاء خريطة':'Create map','قالب':'Template','عنوان الخريطة':'Map title','الفكرة المركزية':'Central idea','إنشاء الخريطة':'Create map','إضافة فرع':'Add branch','الخريطة':'Map','يتبع إلى':'Belongs to','نص الفرع':'Branch text','لون':'Color','أصفر':'Yellow','أزرق':'Blue','أخضر':'Green','بنفسجي':'Purple','رمادي':'Gray','نسخ الخريطة كنقاط':'Copy map as bullets','حذف الخريطة':'Delete map','الخريطة النشطة':'Active map','ملخص الفروع':'Branch summary','فرع رئيسي':'Main branch','فرع فرعي':'Sub-branch','ابدأ بإنشاء خريطة ذهنية.':'Start by creating a mind map.','لا توجد فروع بعد.':'No branches yet.',
    'فلاش كاردز بتكرار متباعد.':'Spaced-repetition flashcards.','لا تراجع كل شيء كل يوم. راجع البطاقة عندما يحين وقتها، وخلّي النظام يرفع أو يخفض مستوى الحفظ.':'Do not review everything every day. Review each card when it is due, and let the system raise or lower its memory level.','بطاقات':'Cards','مستحقة اليوم':'Due today','قوية':'Strong','ضعيفة':'Weak','المجموعة':'Deck','وجه البطاقة / السؤال':'Card front / question','تلميح اختياري':'Optional hint','وسوم':'Tags','إضافة البطاقة':'Add card','إضافة قوالب سريعة':'Add quick templates','نسخ البطاقات':'Copy cards','جلسة مراجعة':'Review session','كل المجموعات':'All decks','كل المستويات':'All levels','مستحقة':'Due','لاحقاً':'Later','راجع اليوم':'Review today','حذف':'Delete','إظهار الإجابة':'Show answer','لم أعرف':'I missed it','عرفتها':'I knew it','لا توجد بطاقات مستحقة الآن. أضف بطاقة أو غيّر الفلتر.':'No cards are due now. Add a card or change the filter.','لا توجد بطاقات حسب هذا الفلتر.':'No cards match this filter.',
    'اتفاقية المستخدم':'User Agreement','الخصوصية':'Privacy','حقوق الطبع والنشر':'Copyright','إخلاء مسؤولية':'Disclaimer','صياغة واضحة للمستخدم، بدون تعقيد.':'Clear wording for users, without complexity.'
  };
  const PLACEHOLDERS = {
    'مثلاً: قوانين الحركة':'Example: Laws of motion','عنوان الدرس أو المعيار':'Lesson title or standard','مثلاً: القانون / مثال / خطأ':'Example: rule / example / mistake','ما تعريف...؟':'What is the definition of...?','الإجابة المختصرة مع مثال':'Short answer with an example','كلمة تساعدك قبل إظهار الجواب':'A word that helps before showing the answer','قانون، خطأ، مهم':'rule, mistake, important','ابحث داخل البطاقات':'Search cards',
    'مثلاً: ضعيف بالرياضيات، وقتي قليل، وبدي أدرس بدون دفع':'Example: weak in math, little time, and I want to study without paying','اكتب المشكلة كما هي بدون تزيين':'Write the problem as it is','ابحث عن منصة، مادة، خطر، أو فائدة':'Search platform, subject, risk, or benefit','درس واحد + 20 سؤال + تسجيل الأخطاء':'One lesson + 20 questions + error log','اكتب أي شيء تريد تذكره اليوم...':'Write anything you need to remember today...','رياضيات / إنجليزي / BTEC...':'Math / English / BTEC...','حل أسئلة درس الاشتقاق مثلاً':'Solve derivative lesson questions, for example','رياضيات':'Math','فيزياء':'Physics','فهم درس + 15 سؤال':'Understand lesson + 15 questions','ابحث عن صفحة، مصدر، خدمة، أو أمر BTEC...':'Search page, resource, service, or BTEC command...'
  };
  function lang(){ return window.MT_STORE?.get('language','ar') === 'en' ? 'en' : 'ar'; }
  function shouldSkip(node){ return node.closest('script,style,code,pre,.ltr,.preserve,.no-i18n'); }
  function translateTextNode(node){
    if(!node.nodeValue || !node.nodeValue.trim()) return;
    const original = node.parentElement?.dataset?.i18nSourceText || node.nodeValue;
    if(node.parentElement && !node.parentElement.dataset.i18nSourceText) node.parentElement.dataset.i18nSourceText = original;
    node.nodeValue = lang()==='en' ? (MAP[original.trim()] || original) : original;
  }
  function translateElement(el){
    ['placeholder','aria-label','title'].forEach(attr=>{
      if(!el.hasAttribute(attr)) return;
      const key='i18nSource'+attr.replace(/(^|-)(\w)/g,(_,a,b)=>b.toUpperCase());
      if(!el.dataset[key]) el.dataset[key]=el.getAttribute(attr);
      const original=el.dataset[key];
      el.setAttribute(attr, lang()==='en' ? (PLACEHOLDERS[original] || MAP[original] || original) : original);
    });
    if(el.tagName === 'OPTION'){
      if(!el.dataset.i18nSourceOption) el.dataset.i18nSourceOption = el.textContent;
      const original = el.dataset.i18nSourceOption;
      el.textContent = lang()==='en' ? (MAP[original] || original) : original;
    }
  }
  function apply(root=document.body){
    if(!root) return;
    document.documentElement.dataset.lang=lang(); document.documentElement.lang=lang()==='en'?'en':'ar'; document.documentElement.dir=lang()==='en'?'ltr':'rtl';
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){return shouldSkip(node.parentElement)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode); nodes.forEach(translateTextNode);
    root.querySelectorAll('input,textarea,button,a,option,[aria-label],[title]').forEach(translateElement);
  }
  let timer=null;
  document.addEventListener('DOMContentLoaded',()=>{
    apply();
    const observer=new MutationObserver(()=>{ clearTimeout(timer); timer=setTimeout(()=>apply(),60); });
    observer.observe(document.body,{childList:true,subtree:true});
  });
  window.addEventListener('mt:language',()=>apply());
  window.BAWSALA_I18N = {apply, MAP};
})();

;
/* ===== assets/js/frontend-v21.js ===== */
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

;
/* ===== assets/js/frontend-runtime-v22.js ===== */
(function(){
  'use strict';
  const doc=document;
  const body=doc.body;
  if(!body || body.dataset.runtimeV22==='1') return;
  body.dataset.runtimeV22='1';

  const lang=()=>doc.documentElement.lang==='en'?'en':'ar';
  const copy={
    ar:{offline:'لا يوجد اتصال بالخادم. الأدوات المحلية ما زالت تعمل.',online:'عاد الاتصال بالخادم.',retry:'إعادة المحاولة',close:'إغلاق',reload:'إعادة تحميل آمنة',clearCache:'تحديث ملفات الموقع',runtimeTitle:'تعذر تشغيل جزء من الموقع',runtimeBody:'حدث خطأ في الواجهة. لم نحذف بياناتك المحلية. أعد تحميل الصفحة، وإن استمر الخطأ حدّث ملفات الموقع.',updateTitle:'يتوفر تحديث جديد',updateBody:'تم تنزيل نسخة أحدث من بوصلة. طبّقها الآن لتجنب تعارض الملفات القديمة مع الجديدة.',applyUpdate:'تطبيق التحديث',required:'هذا الحقل مطلوب.',invalid:'راجع القيمة المدخلة.',working:'جارٍ التنفيذ…',table:'جدول قابل للتمرير',mainReady:'تم الانتقال إلى المحتوى الرئيسي'},
    en:{offline:'The server is unavailable. Local study tools still work.',online:'Connection restored.',retry:'Retry',close:'Close',reload:'Safe reload',clearCache:'Refresh site files',runtimeTitle:'Part of the app failed to start',runtimeBody:'A frontend error occurred. Your local data was not deleted. Reload the page, or refresh cached site files if the problem continues.',updateTitle:'A new update is ready',updateBody:'A newer Bawsala build has been downloaded. Apply it now to prevent old and new files from being mixed.',applyUpdate:'Apply update',required:'This field is required.',invalid:'Review this value.',working:'Working…',table:'Scrollable data table',mainReady:'Main content reached'}
  };
  const t=key=>(copy[lang()]||copy.ar)[key]||key;
  const state={activeRequests:0,lastSubmittedForm:null,online:navigator.onLine,mutationQueued:false,bootComplete:false,errorCount:0};
  const pendingEnhancementRoots=new Set();

  function create(tag,className,text){
    const node=doc.createElement(tag);
    if(className) node.className=className;
    if(text!==undefined) node.textContent=text;
    return node;
  }
  function liveRegion(){
    let node=doc.getElementById('appLiveRegion');
    if(node) return node;
    node=create('div','sr-only');node.id='appLiveRegion';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');body.appendChild(node);return node;
  }
  function announce(message){
    const node=liveRegion();node.textContent='';requestAnimationFrame(()=>{node.textContent=String(message||'').slice(0,300);});
  }
  function requestBar(){
    let node=doc.getElementById('appRequestBar');
    if(node) return node;
    node=create('div','app-request-bar');node.id='appRequestBar';node.setAttribute('aria-hidden','true');node.appendChild(create('i'));body.prepend(node);return node;
  }
  function setRequestState(detail={}){
    state.activeRequests=Math.max(0,Number(detail.active??state.activeRequests)||0);
    const bar=requestBar();bar.dataset.active=state.activeRequests>0?'1':'0';
    doc.documentElement.dataset.requestBusy=state.activeRequests>0?'1':'0';
    const form=state.lastSubmittedForm;
    if(form){
      form.setAttribute('aria-busy',state.activeRequests>0?'true':'false');
      form.querySelectorAll('[data-runtime-submit]').forEach(button=>{
        const busy=state.activeRequests>0;
        button.disabled=busy || button.dataset.runtimeOriginalDisabled==='1';
        if(busy && !button.dataset.runtimeOriginalLabel){button.dataset.runtimeOriginalLabel=button.textContent||'';button.textContent=t('working');}
        if(!busy && button.dataset.runtimeOriginalLabel){button.textContent=button.dataset.runtimeOriginalLabel;delete button.dataset.runtimeOriginalLabel;delete button.dataset.runtimeOriginalDisabled;}
      });
      if(state.activeRequests===0){form.removeAttribute('aria-busy');state.lastSubmittedForm=null;}
    }
  }
  function connectionBanner(){
    let node=doc.getElementById('appConnectionBanner');
    if(node) return node;
    node=create('aside','app-connection-banner');node.id='appConnectionBanner';node.setAttribute('role','status');node.setAttribute('aria-live','polite');
    const message=create('span','app-connection-banner__message');
    const retry=create('button','btn sm secondary',t('retry'));retry.type='button';retry.dataset.connectionRetry='1';
    const close=create('button','icon-btn app-connection-banner__close','×');close.type='button';close.setAttribute('aria-label',t('close'));
    close.addEventListener('click',()=>{node.hidden=true;});
    retry.addEventListener('click',()=>window.BAWSALA_BACKEND?.health?.().catch(()=>{}));
    node.append(message,retry,close);node.hidden=true;body.prepend(node);return node;
  }
  function setOnline(next,message=''){
    const changed=state.online!==next;state.online=next;
    const banner=connectionBanner();banner.hidden=false;banner.dataset.state=next?'online':'offline';
    banner.querySelector('.app-connection-banner__message').textContent=message||(next?t('online'):t('offline'));
    banner.querySelector('[data-connection-retry]').hidden=next;
    if(changed) announce(banner.querySelector('.app-connection-banner__message').textContent);
    if(next) setTimeout(()=>{if(banner.dataset.state==='online')banner.hidden=true;},2600);
  }
  function errorMessage(field){return field.validity?.valueMissing?t('required'):(field.validationMessage||t('invalid'));}
  function clearFieldError(field){
    field.removeAttribute('aria-invalid');
    const id=field.dataset.runtimeErrorId;if(!id)return;
    doc.getElementById(id)?.remove();
    const described=(field.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).filter(item=>item!==id);
    if(described.length)field.setAttribute('aria-describedby',described.join(' '));else field.removeAttribute('aria-describedby');
  }
  function showFieldError(field){
    clearFieldError(field);
    if(!field.id)field.id='field_'+Math.random().toString(36).slice(2,10);
    const id=field.id+'_error';field.dataset.runtimeErrorId=id;
    const note=create('small','field-error',errorMessage(field));note.id=id;
    field.setAttribute('aria-invalid','true');
    field.setAttribute('aria-describedby',[field.getAttribute('aria-describedby'),id].filter(Boolean).join(' '));
    (field.closest('.field')||field.parentElement)?.appendChild(note);
  }
  function enhanceForm(form){
    if(form.dataset.runtimeV22==='1')return;
    form.dataset.runtimeV22='1';
    form.querySelectorAll('button[type="submit"],input[type="submit"]').forEach(button=>button.dataset.runtimeSubmit='1');
    form.addEventListener('input',event=>{if(event.target?.matches?.('input,select,textarea'))clearFieldError(event.target);});
    form.addEventListener('invalid',event=>showFieldError(event.target),true);
    form.addEventListener('submit',event=>{
      const invalid=form.querySelector(':invalid');
      if(invalid){event.preventDefault();showFieldError(invalid);invalid.focus({preventScroll:true});invalid.scrollIntoView({block:'center',behavior:body.classList.contains('reduced-motion-ui')?'auto':'smooth'});announce(errorMessage(invalid));return;}
      state.lastSubmittedForm=form;
      form.querySelectorAll('[data-runtime-submit]').forEach(button=>{button.dataset.runtimeOriginalDisabled=button.disabled?'1':'0';});
      setTimeout(()=>{if(state.activeRequests===0 && state.lastSubmittedForm===form){form.removeAttribute('aria-busy');state.lastSubmittedForm=null;}},1200);
    },true);
  }
  function enhanceTable(table){
    if(table.dataset.runtimeV22==='1')return;
    table.dataset.runtimeV22='1';
    if(!table.hasAttribute('aria-label'))table.setAttribute('aria-label',t('table'));
    if(!table.closest('.table-scroll')){
      const wrap=create('div','table-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',table.getAttribute('aria-label'));
      table.parentNode?.insertBefore(wrap,table);wrap.appendChild(table);
    }
    const headers=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row=>[...row.children].forEach((cell,index)=>{if(headers[index]&&!cell.dataset.label)cell.dataset.label=headers[index];}));
  }
  function enhanceLinks(root=doc){
    root.querySelectorAll?.('a[target="_blank"]').forEach(link=>{
      const rel=new Set((link.getAttribute('rel')||'').split(/\s+/).filter(Boolean));rel.add('noopener');rel.add('noreferrer');link.setAttribute('rel',[...rel].join(' '));
    });
  }
  function markCurrentNavigation(){
    let current;try{current=new URL(location.href);}catch(_){return;}
    const clean=value=>String(value||'').replace(/\/index\.html$/,'/').replace(/\/$/,'/');
    doc.querySelectorAll('.main-nav a[href],.mobile-dock a[href]').forEach(link=>{
      let target;try{target=new URL(link.getAttribute('href'),location.href);}catch(_){return;}
      const active=target.origin===current.origin&&clean(target.pathname)===clean(current.pathname);
      if(active)link.setAttribute('aria-current','page');else if(link.getAttribute('aria-current')==='page')link.removeAttribute('aria-current');
    });
  }
  function bindHashLinks(root=doc){
    root.querySelectorAll?.('a[href^="#"]').forEach(link=>{
      if(link.dataset.runtimeHash==='1')return;link.dataset.runtimeHash='1';
      link.addEventListener('click',event=>{
        if(body.dataset.page==='workspace')return;
        const id=decodeURIComponent((link.getAttribute('href')||'').slice(1));if(!id)return;
        const target=doc.getElementById(id);if(!target)return;
        event.preventDefault();try{history.pushState(null,'','#'+encodeURIComponent(id));}catch(_){/* no-op */}
        target.scrollIntoView({block:'start',behavior:body.classList.contains('reduced-motion-ui')?'auto':'smooth'});
        if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');setTimeout(()=>target.focus({preventScroll:true}),220);
      });
    });
  }
  function enhanceRoot(root=doc){
    if(root.matches?.('form'))enhanceForm(root);
    if(root.matches?.('table'))enhanceTable(root);
    if(root.matches?.('a[target="_blank"]'))enhanceLinks(root.parentElement||doc);
    if(root.matches?.('a[href^="#"]'))bindHashLinks(root.parentElement||doc);
    root.querySelectorAll?.('form').forEach(enhanceForm);
    root.querySelectorAll?.('table').forEach(enhanceTable);
    enhanceLinks(root);bindHashLinks(root);markCurrentNavigation();
  }
  function queueEnhance(root){
    if(root?.nodeType===1)pendingEnhancementRoots.add(root);
    if(state.mutationQueued)return;state.mutationQueued=true;
    requestAnimationFrame(()=>{
      state.mutationQueued=false;
      const roots=[...pendingEnhancementRoots];pendingEnhancementRoots.clear();
      if(!roots.length)enhanceRoot(doc);else roots.forEach(enhanceRoot);
    });
  }
  function recoveryPanel({title,bodyText,update=false}={}){
    let node=doc.getElementById('appRecoveryPanel');
    if(!node){
      node=create('aside','app-recovery-panel');node.id='appRecoveryPanel';node.setAttribute('role','alert');
      const text=create('div','app-recovery-panel__text');text.append(create('strong','app-recovery-panel__title'),create('p','app-recovery-panel__body'));
      const actions=create('div','app-recovery-panel__actions');
      const primary=create('button','btn sm primary');primary.type='button';primary.dataset.recoveryPrimary='1';
      const clear=create('button','btn sm secondary',t('clearCache'));clear.type='button';clear.dataset.recoveryClear='1';
      const close=create('button','icon-btn','×');close.type='button';close.setAttribute('aria-label',t('close'));close.addEventListener('click',()=>node.remove());
      actions.append(primary,clear,close);node.append(text,actions);body.appendChild(node);
      clear.addEventListener('click',async()=>{
        try{if('serviceWorker'in navigator)navigator.serviceWorker.controller?.postMessage({type:'CLEAR_CACHES'});if('caches'in window)await Promise.all((await caches.keys()).map(key=>caches.delete(key)));}catch(_){/* best effort */}
        location.reload();
      });
    }
    node.querySelector('.app-recovery-panel__title').textContent=title||t(update?'updateTitle':'runtimeTitle');
    node.querySelector('.app-recovery-panel__body').textContent=bodyText||t(update?'updateBody':'runtimeBody');
    const primary=node.querySelector('[data-recovery-primary]');primary.textContent=t(update?'applyUpdate':'reload');
    primary.onclick=()=>{if(update){sessionStorage.setItem('bawsala:pwa-reload','1');if(window.BAWSALA_PWA?.applyUpdate) window.BAWSALA_PWA.applyUpdate(); else {navigator.serviceWorker?.controller?.postMessage({type:'SKIP_WAITING'});setTimeout(()=>location.reload(),450);}}else location.reload();};
    return node;
  }
  function reportRuntimeError(error,source='runtime'){
    state.errorCount+=1;
    const message=String(error?.message||error||'Unknown runtime error').slice(0,240);
    console.error('Bawsala frontend runtime error:',source,message);
    try{window.MT_SECURITY?.recordSecurityEvent?.('frontend-runtime-error',`${source}: ${message}`);}catch(_){/* no-op */}
    if(state.errorCount<=2)recoveryPanel({});
  }
  function bindErrors(){
    addEventListener('error',event=>{
      const target=event.target;
      if(target&&target!==window&&['SCRIPT','LINK'].includes(target.tagName))reportRuntimeError(new Error(`Failed to load ${target.src||target.href||target.tagName}`),'asset');
      else if(event.error)reportRuntimeError(event.error,'error');
    },true);
    addEventListener('unhandledrejection',event=>reportRuntimeError(event.reason||new Error('Unhandled promise rejection'),'promise'));
  }
  function bootWatchdog(attempt=0){
    const missing=[];
    if(!window.MT_SECURITY)missing.push('security');
    if(!window.MT_STORE)missing.push('storage');
    if(!window.MT_UI)missing.push('ui');
    if(!window.BAWSALA_BACKEND)missing.push('backend-client');
    if(!missing.length){state.bootComplete=true;body.dataset.appReady='1';window.dispatchEvent(new CustomEvent('bawsala:app-ready',{detail:{version:'22'}}));return;}
    if(attempt<6){setTimeout(()=>bootWatchdog(attempt+1),200);return;}
    reportRuntimeError(new Error(`Missing modules: ${missing.join(', ')}`),'boot');
  }
  function bindPwa(){
    addEventListener('bawsala:pwa-update',()=>recoveryPanel({update:true}));
    addEventListener('bawsala:version-mismatch',()=>recoveryPanel({update:true}));
    if(sessionStorage.getItem('bawsala:pwa-reload')==='1')sessionStorage.removeItem('bawsala:pwa-reload');
  }
  function bindGlobal(){
    addEventListener('online',()=>setOnline(true));addEventListener('offline',()=>setOnline(false));
    addEventListener('bawsala:request',event=>setRequestState(event.detail||{}));
    addEventListener('bawsala:sync',event=>{const detail=event.detail||{};if(detail.pendingSync)setOnline(false,lang()==='en'?'Changes are queued locally and will sync automatically.':'التغييرات محفوظة محليًا وستتم مزامنتها تلقائيًا.');});
    addEventListener('hashchange',markCurrentNavigation);
    doc.addEventListener('click',event=>{
      const skip=event.target.closest?.('.skip-link');if(skip){const main=doc.getElementById('main');if(main){requestAnimationFrame(()=>{main.focus({preventScroll:true});announce(t('mainReady'));});}}
    });
  }
  function mount(){
    requestBar();liveRegion();enhanceRoot(doc);bindErrors();bindGlobal();bindPwa();bootWatchdog();
    const observer=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1)queueEnhance(node);
    });
    observer.observe(body,{childList:true,subtree:true});
    window.BAWSALA_RUNTIME={version:'22',enhance:enhanceRoot,recover:recoveryPanel,state};
  }
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();

