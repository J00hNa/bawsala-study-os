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
