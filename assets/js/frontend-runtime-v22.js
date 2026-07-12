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
