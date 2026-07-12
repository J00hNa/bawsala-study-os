(function(){
  const data = window.MT_DATA;
  const store = window.MT_STORE;
  const sec = window.MT_SECURITY;
  const isPage = location.pathname.includes('/pages/');
  const base = isPage ? '../' : '';
  const current = document.body.dataset.page || 'home';
  let shellKeyBound = false;
  let themeTransitioning = false;
  const shell = {
    ar: {
      home:'الرئيسية', dashboard:'لوحة الطالب', workspace:'غرفة الدراسة', settings:'الإعدادات', account:'الحساب', login:'دخول', signup:'حساب جديد', profiles:'البروفايلات', notebook:'الدفاتر', study:'الدراسة', resources:'المصادر', calculators:'المعدل', community:'مساحة محلية', services:'الخدمات', company:'عن بوصلة', advisor:'التشخيص', mindmaps:'خرائط ذهنية', flashcards:'فلاش كاردز', legal:'القانوني', admin:'لوحة التحكم', support:'الدعم', status:'حالة الخدمة', product:'المنتج', trust:'الثقة والدعم',
      mainNav:'التنقل الرئيسي', profileTitle:'البروفايل النشط', search:'بحث سريع', whatsapp:'واتساب', toggleTheme:'تبديل الوضع', themeToLight:'حوّل الموقع إلى الوضع الفاتح', themeToDark:'حوّل الموقع إلى الوضع الداكن', toggleLang:'English', openMenu:'فتح القائمة', homeAria:'الرئيسية',
      footerText:'نظام دراسة يومي يساعد الطالب على اتخاذ قرار واضح، تنفيذ جلسة تركيز، تسجيل الأخطاء، ومراجعة تقدمه بدون فوضى.', local:'بياناتك محفوظة على جهازك', quick:'ابدأ بسرعة', important:'مهم', legal:'قانوني وإدارة', export:'تصدير بياناتي', terms:'اتفاقية المستخدم', privacy:'الخصوصية', schoolmind:'SchoolMind AI', contact:'تواصل واتساب', defaultWa:'مرحبا، أريد التواصل مع بوصلة', footerStart:'لوحة الطالب', profilesText:'البروفايلات', notebooks:'الدفاتر', studyText:'الدراسة', resourcesText:'المصادر', problems:'مشاكل الطلاب', grades:'حاسبة المعدل', servicesText:'الخدمات', about:'من نحن', adminText:'لوحة التحكم', student:'طالب', copied:'تم النسخ', copyFail:'لم يتم النسخ تلقائياً', confirm:'تأكيد', cancel:'إلغاء', dangerousAction:'عملية خطرة', close:'إغلاق', closeAnnouncement:'إخفاء الإعلان', offline:'أنت الآن بدون اتصال. البيانات المحلية ستبقى محفوظة.', online:'عاد الاتصال.', mainReady:'تم الوصول إلى المحتوى الرئيسي', menuClosed:'تم إغلاق القائمة'
    },
    en: {
      home:'Home', dashboard:'Dashboard', workspace:'Study Room', settings:'Settings', account:'Account', login:'Login', signup:'Sign up', profiles:'Profiles', notebook:'Notebooks', study:'Study', resources:'Resources', calculators:'Grades', community:'Local space', services:'Services', company:'About', advisor:'Advisor', mindmaps:'Mind Maps', flashcards:'Flashcards', legal:'Legal', admin:'Admin', support:'Support', status:'Service status', product:'Product', trust:'Trust & support',
      mainNav:'Main navigation', profileTitle:'Active profile', search:'Quick search', whatsapp:'WhatsApp', toggleTheme:'Toggle theme', themeToLight:'Switch to light mode', themeToDark:'Switch to dark mode', toggleLang:'العربية', openMenu:'Open menu', homeAria:'Home',
      footerText:'A daily study system for choosing one clear task, completing a focus session, recording mistakes, and reviewing progress without clutter.', local:'Data is saved on this device', quick:'Start fast', important:'Important', legal:'Legal & Control', export:'Export my data', terms:'User Agreement', privacy:'Privacy', schoolmind:'SchoolMind AI', contact:'Contact on WhatsApp', defaultWa:'Hello, I want to contact Bawsala', footerStart:'Student Dashboard', profilesText:'Profiles', notebooks:'Notebooks', studyText:'Study', resourcesText:'Resources', problems:'Student Problems', grades:'Grade Calculator', servicesText:'Services', about:'About', adminText:'Control Panel', student:'Student', copied:'Copied', copyFail:'Could not copy automatically', confirm:'Confirm', cancel:'Cancel', dangerousAction:'Dangerous action', close:'Close', closeAnnouncement:'Dismiss announcement', offline:'You are offline. Local data remains saved.', online:'Connection restored.', mainReady:'Main content reached', menuClosed:'Menu closed'
    }
  };
  function lang(){ return store.get('language','ar') === 'en' ? 'en' : 'ar'; }
  function t(key){ return shell[lang()][key] || shell.ar[key] || key; }
  function applyLanguageMeta(){ const l=lang(); document.documentElement.dataset.lang=l; document.documentElement.lang=l==='en'?'en':'ar'; document.documentElement.dir=l==='en'?'ltr':'rtl'; }
  function settings(){ return store.get('site:settings', null) || {}; }
  function brandArabic(){ return settings().brandArabic || data.brand.arabic; }
  function brandEnglish(){ return settings().brandEnglish || data.brand.english; }
  function brandName(){ return lang()==='en' ? brandEnglish() : brandArabic(); }
  function tagline(){ return settings().tagline || data.brand.shortTagline; }
  function phone(){ return (settings().whatsapp || data.whatsapp).replace(/[^0-9]/g,''); }
  function url(path){ return base + sec.safeURL(path); }
  function extUrl(path){ return sec.safeURL(path); }
  function whatsappLink(text){ return `https://wa.me/${sec.cleanText(phone(), 20)}?text=${encodeURIComponent(sec.cleanMultiline(text || t('defaultWa'), 1200))}`; }
  function initTheme(){ document.documentElement.dataset.theme = store.get('theme', 'dark'); applyLanguageMeta(); }
  function updateThemeColor(theme){ const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content', theme==='dark'?'#1d0245':'#1d0245'); }
  function reduceMotionEnabled(){
    const prefs=store.get('user:preferences',{});
    return !!prefs.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function commitTheme(next){
    const root=document.documentElement;
    root.dataset.theme=next;
    store.set('theme',next);
    updateThemeColor(next);
    document.querySelectorAll('#themeToggle').forEach(btn=>{
      btn.setAttribute('aria-pressed', String(next==='light'));
      btn.setAttribute('title', t(next==='light'?'themeToDark':'themeToLight'));
      btn.setAttribute('aria-label', t(next==='light'?'themeToDark':'themeToLight'));
      btn.innerHTML=themeIcon(next);
    });
  }
  function pointFromOrigin(origin){
    if(Number.isFinite(origin?.clientX) && Number.isFinite(origin?.clientY)) return {x:origin.clientX,y:origin.clientY};
    const el=origin?.currentTarget || (origin?.getBoundingClientRect ? origin : null) || document.getElementById('themeToggle') || document.body;
    const box=el.getBoundingClientRect?.();
    return box ? {x:box.left+box.width/2,y:box.top+box.height/2} : {x:innerWidth/2,y:Math.min(100,innerHeight/3)};
  }
  function spawnThemeOrbit(x,y,next){
    if(reduceMotionEnabled()) return null;
    document.querySelectorAll('.theme-transition-orbit').forEach(node=>node.remove());
    const orbit=document.createElement('div');
    orbit.className='theme-transition-orbit';
    orbit.setAttribute('aria-hidden','true');
    orbit.innerHTML='<span class="theme-transition-orbit__ring"></span><span class="theme-transition-orbit__needle"></span><span class="theme-transition-orbit__core"></span><span class="theme-transition-orbit__spark s1"></span><span class="theme-transition-orbit__spark s2"></span><span class="theme-transition-orbit__spark s3"></span><span class="theme-transition-orbit__spark s4"></span>';
    orbit.style.setProperty('--theme-x', x+'px');
    orbit.style.setProperty('--theme-y', y+'px');
    orbit.dataset.nextTheme=next;
    document.body.appendChild(orbit);
    orbit.addEventListener('animationend',()=>orbit.remove(),{once:true});
    setTimeout(()=>orbit.remove(),1200);
    return orbit;
  }
  function setTheme(next, origin){
    const root=document.documentElement; const currentTheme=root.dataset.theme||'dark'; next=next==='light'?'light':'dark'; if(next===currentTheme || themeTransitioning) return;
    themeTransitioning=true;
    const {x,y}=pointFromOrigin(origin);
    const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y)));
    root.style.setProperty('--theme-x', x+'px'); root.style.setProperty('--theme-y', y+'px'); root.style.setProperty('--theme-radius', radius+'px');
    root.dataset.themeDirection = next==='light' ? 'sunrise' : 'nightfall';
    spawnThemeOrbit(x,y,next);
    if(document.startViewTransition && !reduceMotionEnabled()){
      try{
        const transition=document.startViewTransition(()=>commitTheme(next));
        document.documentElement.classList.add('theme-view-transitioning');
        transition.finished.finally(()=>{ document.documentElement.classList.remove('theme-view-transitioning'); themeTransitioning=false; });
      }catch(_){
        commitTheme(next); document.body.classList.add('theme-smooth'); setTimeout(()=>{ document.body.classList.remove('theme-smooth'); themeTransitioning=false; },420);
      }
    } else {
      commitTheme(next); document.body.classList.add('theme-smooth'); setTimeout(()=>{ document.body.classList.remove('theme-smooth'); themeTransitioning=false; },420);
    }
  }
  function logoMarkup(){ return `<span class="ascii-brand-mark" aria-hidden="true">BWS\nALA</span>`; }
  function iconMarkup(name){
    const icons={
      search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.2 4.2"></path></svg>',
      menu:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>',
      light:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"></path></svg>',
      dark:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.4A8.2 8.2 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"></path></svg>'
    };
    return icons[name]||'';
  }
  function themeIcon(theme){return iconMarkup(theme==='light'?'dark':'light');}
  function workspaceRouteHref(hash){
    const clean = String(hash || 'flow').replace(/[^a-z0-9_-]/gi,'') || 'flow';
    return current === 'workspace' ? `#${clean}` : url(`pages/workspace.html#${clean}`);
  }
  function shellRoutebar(){
    if(current === 'workspace') return '';
    const allowed = new Set(['home','dashboard','workspace','study','advisor','resources','calendar','notebook','flashcards','mindmaps','schoolmind','calculators','services']);
    if(!allowed.has(current)) return '';
    const routes=[['FLOW','flow'],['MISSION','mission'],['FOCUS','focus'],['ERRORS','errors'],['REPORT','review'],['HW','homework']];
    return `<nav class="shell-routebar" aria-label="${escapeAttr(lang()==='en'?'Study quick routes':'روابط دراسة سريعة')}">${routes.map(([label,hash])=>`<a href="${escapeAttr(workspaceRouteHref(hash))}" ${current==='workspace' && location.hash.slice(1)===hash?'aria-current="true"':''}>${escapeHTML(label)}</a>`).join('')}</nav>`;
  }
  function syncShellRoutebar(){
    const activeHash = (location.hash || '#flow').slice(1) || 'flow';
    document.querySelectorAll('.shell-routebar a').forEach(link=>{
      let hash='';
      try{ hash = new URL(link.getAttribute('href') || '', location.href).hash.slice(1); }catch(_){ hash=''; }
      if(current === 'workspace' && hash === activeHash) link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
    });
  }
  function navLabel(label,key){ return lang()==='en' ? (data.navEnglish?.[key] || label) : label; }
  function renderShell(){
    store.getProfiles();
    const profile = store.activeProfile();
    const header=document.getElementById('siteHeader');
    if(header){
      const links=data.nav.map(([label,path,key])=>`<a class="${current===key?'active':''}" href="${escapeAttr(url(path))}" ${current===key?'aria-current="page"':''}>${escapeHTML(navLabel(label,key))}</a>`).join('');
      const currentTheme=document.documentElement.dataset.theme||'dark';
      header.innerHTML=`<header class="site-header"><div class="header-inner"><a class="brand" href="${escapeAttr(url('index.html'))}" aria-label="${escapeAttr(brandName()+' '+t('homeAria'))}">${logoMarkup()}<span><strong>${escapeHTML(brandName())}</strong><small>STUDY OS</small></span></a><nav class="main-nav" id="mainNav" aria-label="${escapeAttr(t('mainNav'))}">${links}</nav><div class="header-actions"><a class="profile-chip" href="${escapeAttr(url('pages/profiles.html'))}" title="${escapeAttr(t('profileTitle'))}"><b>${escapeHTML(profile.avatar||'●')}</b><span>${escapeHTML(profile.name||t('student'))}</span></a><button class="icon-btn" id="globalSearchOpen" type="button" aria-label="${escapeAttr(t('search'))}" title="${escapeAttr(t('search'))}">${iconMarkup('search')}</button><button class="icon-btn lang-btn" id="languageToggle" type="button" aria-label="${escapeAttr(t('toggleLang'))}">${escapeHTML(t('toggleLang'))}</button><button class="icon-btn theme-toggle" id="themeToggle" type="button" title="${escapeAttr(t(currentTheme==='light'?'themeToDark':'themeToLight'))}" aria-label="${escapeAttr(t(currentTheme==='light'?'themeToDark':'themeToLight'))}" aria-pressed="${currentTheme==='light'}">${themeIcon(currentTheme)}</button><button class="icon-btn menu-btn" id="menuToggle" type="button" aria-label="${escapeAttr(t('openMenu'))}" aria-controls="mainNav" aria-expanded="false">${iconMarkup('menu')}</button></div></div>${shellRoutebar()}</header><div class="drawer-backdrop" id="drawerBackdrop"></div>`;
    }
    const footer=document.getElementById('siteFooter');
    if(footer){
      footer.innerHTML=`<footer class="site-footer launch-footer"><div class="container launch-footer__inner"><div class="launch-footer__brand"><a class="brand" href="${escapeAttr(url('index.html'))}">${logoMarkup()}<span><strong>${escapeHTML(brandName())}</strong><small>${escapeHTML(data.brand.product)}</small></span></a><p>${escapeHTML(t('footerText'))}</p><a class="backend-badge" href="${escapeAttr(url('pages/status.html'))}"><span class="status-dot online"></span> ${escapeHTML(t('status'))}</a></div><nav aria-label="${escapeAttr(t('product'))}"><h3>${escapeHTML(t('product'))}</h3><a href="${escapeAttr(url('pages/dashboard.html'))}">${escapeHTML(t('dashboard'))}</a><a href="${escapeAttr(url('pages/workspace.html#flow'))}">${escapeHTML(t('workspace'))}</a><a href="${escapeAttr(url('pages/resources.html'))}">${escapeHTML(t('resources'))}</a><a href="${escapeAttr(url('pages/calendar.html'))}">التقويم</a><a href="${escapeAttr(url('pages/billing.html'))}">الخطط</a></nav><nav aria-label="${escapeAttr(t('company'))}"><h3>${escapeHTML(t('company'))}</h3><a href="${escapeAttr(url('pages/company.html'))}">${escapeHTML(t('company'))}</a><a href="${escapeAttr(url('pages/services.html'))}">${escapeHTML(t('services'))}</a><a href="${escapeAttr(url('pages/legal.html'))}#terms">${escapeHTML(t('terms'))}</a><a href="${escapeAttr(url('pages/legal.html'))}#privacy">${escapeHTML(t('privacy'))}</a></nav><nav aria-label="${escapeAttr(t('trust'))}"><h3>${escapeHTML(t('trust'))}</h3><a href="${escapeAttr(url('pages/support.html'))}">${escapeHTML(t('support'))}</a><a href="${escapeAttr(url('pages/account.html'))}">${escapeHTML(t('account'))}</a><a href="${escapeAttr(url('pages/settings.html'))}">${escapeHTML(t('settings'))}</a><a href="${escapeAttr(whatsappLink(t('defaultWa')))}" target="_blank" rel="noopener noreferrer">واتساب</a><button class="btn sm" id="exportBackup" type="button">${escapeHTML(t('export'))}</button></nav></div><div class="container launch-footer__bottom"><span>${escapeHTML(data.brand.copyright)}</span><span>${escapeHTML(data.brand.developer)}</span></div></footer>`;
    }
    renderAnnouncement();
    syncShellRoutebar();
  }
  function renderAnnouncement(){
    document.querySelectorAll('.top-announcement').forEach(n=>n.remove());
    const st=settings();
    const msg=sec.cleanText(st.announcement,220);
    if(!st.showAnnouncement || !msg) return;
    const dismissed=sessionStorage.getItem('bawsala:announcement:dismissed')===msg;
    if(dismissed) return;
    const node=document.createElement('aside');
    node.className='top-announcement';
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    node.innerHTML=`<span>${escapeHTML(msg)}</span><button class="icon-btn top-announcement-close" type="button" aria-label="${escapeAttr(t('closeAnnouncement'))}">×</button>`;
    node.querySelector('button')?.addEventListener('click',()=>{ sessionStorage.setItem('bawsala:announcement:dismissed',msg); node.remove(); });
    document.body.appendChild(node);
  }
  function closeMenu(restoreFocus=false){
    const nav=document.getElementById('mainNav'), menu=document.getElementById('menuToggle'), backdrop=document.getElementById('drawerBackdrop');
    const wasOpen=nav?.classList.contains('open');
    nav?.classList.remove('open'); backdrop?.classList.remove('open'); menu?.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open');
    if(wasOpen && restoreFocus) menu?.focus();
  }
  function trapMenuTab(event){
    const nav=document.getElementById('mainNav');
    if(event.key!=='Tab' || !nav?.classList.contains('open')) return;
    const menu=document.getElementById('menuToggle');
    const focusables=[...nav.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && el.offsetParent!==null);
    if(menu && menu.offsetParent!==null) focusables.push(menu);
    if(!focusables.length) return;
    const first=focusables[0], last=focusables[focusables.length-1];
    if(event.shiftKey && document.activeElement===first){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement===last){ event.preventDefault(); first.focus(); }
  }
  function bindGlobalPolish(){
    if(document.body.dataset.polishBound) return;
    document.body.dataset.polishBound='true';
    document.addEventListener('click',event=>{
      const skip=event.target.closest?.('.skip-link');
      if(!skip) return;
      const main=document.getElementById('main');
      if(main){ requestAnimationFrame(()=>{ main.focus({preventScroll:true}); toast(t('mainReady')); }); }
    });
    const updateHeader=()=>document.body.classList.toggle('scrolled-shell', scrollY>8);
    updateHeader();
    addEventListener('scroll',updateHeader,{passive:true});
    addEventListener('offline',()=>toast(t('offline')));
    addEventListener('online',()=>toast(t('online')));
    addEventListener('hashchange', syncShellRoutebar);
    document.addEventListener('keydown',trapMenuTab);
  }
  function bindShell(){
    const themeToggle=document.getElementById('themeToggle');
    themeToggle?.addEventListener('click',(event)=>{ const next=(document.documentElement.dataset.theme||'dark')==='dark'?'light':'dark'; setTheme(next,event); });
    document.getElementById('languageToggle')?.addEventListener('click',()=>{ const next=lang()==='ar'?'en':'ar'; store.set('language',next); applyLanguageMeta(); renderShell(); bindShell(); window.BAWSALA_I18N?.apply(); window.dispatchEvent(new CustomEvent('mt:language',{detail:{language:next}})); });
    const nav=document.getElementById('mainNav'), menu=document.getElementById('menuToggle'), backdrop=document.getElementById('drawerBackdrop');
    menu?.addEventListener('click',()=>{ if(!nav) return; const open=!nav.classList.contains('open'); nav.classList.toggle('open',open); backdrop?.classList.toggle('open',open); menu.setAttribute('aria-expanded',String(open)); document.body.classList.toggle('menu-open',open); if(open) requestAnimationFrame(()=>nav.querySelector('a')?.focus()); });
    nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>closeMenu()));
    backdrop?.addEventListener('click',()=>closeMenu(true));
    if(!shellKeyBound){ document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(true); }); window.addEventListener('resize',()=>{ if(innerWidth>1120) closeMenu(); }); shellKeyBound=true; }
    document.getElementById('exportBackup')?.addEventListener('click',()=>store.downloadBackup());
    syncShellRoutebar();
  }

  function refreshShell(){
    renderShell();
    bindShell();
  }
  function cssEscape(value){ return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }
  function ensureControlNames(root=document){
    root.querySelectorAll?.('input,select,textarea').forEach(control=>{
      const type=String(control.getAttribute('type')||'').toLowerCase();
      if(['hidden','submit','button','reset'].includes(type)) return;
      if(control.closest('label') || control.hasAttribute('aria-label') || control.hasAttribute('aria-labelledby')) return;
      if(control.id && document.querySelector(`label[for="${cssEscape(control.id)}"]`)) return;
      const raw = control.getAttribute('placeholder') || control.getAttribute('name') || control.id || control.getAttribute('data-label') || '';
      const label = sec.cleanText(raw.replace(/[-_]/g,' '), 90).trim();
      if(label) control.setAttribute('aria-label', label);
    });
  }
  function watchControlNames(){
    ensureControlNames(document);
    let queued=false;
    const observer=new MutationObserver(()=>{
      if(queued) return;
      queued=true;
      requestAnimationFrame(()=>{ queued=false; ensureControlNames(document); });
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function confirmAction(options={}){
    const opts=typeof options==='string'?{message:options}:options;
    return new Promise(resolve=>{
      const last=document.activeElement;
      const id='confirm'+Date.now()+Math.random().toString(16).slice(2);
      const node=document.createElement('div');
      node.className='confirm-dialog';
      node.innerHTML=`<div class="confirm-backdrop" ${opts.danger?'':'data-confirm-cancel'}></div><section class="confirm-panel" role="${opts.danger?'alertdialog':'dialog'}" aria-modal="true" aria-labelledby="${escapeAttr(id)}Title" aria-describedby="${escapeAttr(id)}Message"><span class="badge ${opts.danger?'red':'blue'}">${escapeHTML(opts.kicker || (opts.danger?t('dangerousAction'):t('confirm')))}</span><h2 id="${escapeAttr(id)}Title">${escapeHTML(opts.title || t('confirm'))}</h2><p id="${escapeAttr(id)}Message" class="muted">${escapeHTML(opts.message || '')}</p><div class="actions confirm-actions"><button class="btn secondary" data-confirm-cancel type="button">${escapeHTML(opts.cancelText || t('cancel'))}</button><button class="btn ${opts.danger?'danger':'primary'}" data-confirm-ok type="button">${escapeHTML(opts.confirmText || t('confirm'))}</button></div></section>`;
      function focusables(){ return [...node.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && el.offsetParent!==null); }
      let settled=false;
      function close(value){
        if(settled) return;
        settled=true;
        document.removeEventListener('keydown',onKey);
        node.remove();
        document.body.classList.remove('modal-open');
        delete document.body.dataset.dialogOpen;
        if(last && document.contains(last)) last.focus();
        resolve(value);
      }
      function onKey(event){
        if(event.key==='Escape'){ event.preventDefault(); close(false); return; }
        if(event.key!=='Tab') return;
        const list=focusables(); if(!list.length) return;
        const first=list[0], lastItem=list[list.length-1];
        if(event.shiftKey && document.activeElement===first){ event.preventDefault(); lastItem.focus(); }
        else if(!event.shiftKey && document.activeElement===lastItem){ event.preventDefault(); first.focus(); }
      }
      node.querySelectorAll('[data-confirm-cancel]').forEach(el=>el.addEventListener('click',()=>close(false)));
      node.querySelector('[data-confirm-ok]')?.addEventListener('click',()=>close(true));
      document.body.appendChild(node);
      document.body.classList.add('modal-open');
      document.body.dataset.dialogOpen='true';
      document.addEventListener('keydown',onKey);
      requestAnimationFrame(()=>{
        const target=opts.danger?node.querySelector('[data-confirm-cancel]'):node.querySelector('[data-confirm-ok]');
        target?.focus();
      });
    });
  }
function setBusy(control, busy=true, label=''){
    if(!control) return;
    control.toggleAttribute('disabled', !!busy);
    control.setAttribute('aria-busy', String(!!busy));
    if(label){
      if(!control.dataset.originalText) control.dataset.originalText=control.textContent || '';
      control.textContent=busy ? label : control.dataset.originalText;
    } else if(!busy && control.dataset.originalText){ control.textContent=control.dataset.originalText; }
  }
  function toast(message){
    const stack=document.querySelector('.toast-stack') || document.body.appendChild(Object.assign(document.createElement('div'),{className:'toast-stack'}));
    const node=document.createElement('div');
    node.className='toast';
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    node.textContent=sec.cleanText(message,180);
    stack.appendChild(node);
    setTimeout(()=>{ node.classList.add('leaving'); setTimeout(()=>node.remove(),180); },2600);
  }
  function escapeHTML(value){return sec.escapeHTML(value);} function escapeAttr(value){return sec.escapeAttr(value);} function clampNumber(value,min,max,fallback){return sec.clampNumber(value,min,max,fallback);} function safeURL(value){return sec.safeURL(value);} function openWhatsApp(text){window.open(whatsappLink(text),'_blank','noopener,noreferrer');}
  function copyText(text, success){ const value=sec.cleanMultiline(text,6000); navigator.clipboard?.writeText(value).then(()=>toast(success||t('copied'))).catch(()=>toast(t('copyFail'))); }
  function downloadText(filename, text, type='text/plain'){
    const safeName=sec.cleanText(filename || 'bawsala-export.txt', 120).replace(/[^\w.\-؀-ۿ]+/g,'-') || 'bawsala-export.txt';
    const blob=new Blob([sec.cleanMultiline(text || '', 50000)],{type:`${type};charset=utf-8`});
    const href=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=href; a.download=safeName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(href),1200);
    toast(t('export'));
  }
  document.addEventListener('DOMContentLoaded',()=>{ initTheme(); updateThemeColor(store.get('theme','dark')); document.body.classList.toggle('reduced-motion-ui', !!store.get('user:preferences',{}).reduceMotion); document.getElementById('main')?.setAttribute('tabindex','-1'); renderShell(); bindShell(); watchControlNames(); bindGlobalPolish(); });
  window.MT_UI={url,extUrl,whatsappLink,openWhatsApp,toast,confirmAction,escapeHTML,escapeAttr,copyText,downloadText,setBusy,setTheme,clampNumber,safeURL,brandArabic,brandEnglish,brandName,tagline,lang,t,applyLanguageMeta,renderShell,refreshShell};
})();
