(function(){
  let palette = null;
  let input = null;
  let results = null;
  let lastActive = null;
  let items = [];
  let visibleItems = [];
  let activeIndex = 0;
  const RECENT_KEY = 'bawsala:quickSearch:recent';
  const WORKSPACE_TOOLS = [
    ['flow','تدفق اليوم','Daily flow'],['mission','مهمة اليوم','Today mission'],['focus','جلسة تركيز','Focus session'],['errors','دفتر الأخطاء','Error log'],['review','تقرير اليوم','Daily review'],['homework','الواجبات اليومية','Homework'],['rounds','جولات الدراسة','Study rounds'],['notes','ملاحظات','Notes'],['journal','يوميات','Journal'],['flashcards','فلاش كاردز','Flashcards'],['mindmap','خرائط ذهنية','Mind maps'],['drill','تدريب امتحان','Exam drill'],['lectures','محاضرات قصيرة','Short lectures'],['btec','BTEC','BTEC'],['schoolmind','SchoolMind AI','SchoolMind AI']
  ];

  function isEnglish(){ return window.MT_UI?.lang && window.MT_UI.lang()==='en'; }
  function normalize(value){ return String(value||'').toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g,'').replace(/[إأآا]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}\s#:_-]/gu,' ').replace(/\s+/g,' ').trim(); }
  function recent(){ try{ return JSON.parse(localStorage.getItem(RECENT_KEY)||'[]').slice(0,5); }catch(_){ return []; } }
  function clearRecent(){ try{ localStorage.removeItem(RECENT_KEY); }catch(_){/* ignore */} }
  function aliasPack(ar='',en=''){ return [ar,en].join(' '); }
  function remember(item){
    if(!item || !item.url) return;
    const next=[{title:item.title,kind:item.kind,desc:item.desc,url:item.url,external:!!item.external}, ...recent().filter(x=>x.url!==item.url)].slice(0,5);
    try{ localStorage.setItem(RECENT_KEY, JSON.stringify(next)); }catch(_){/* ignore */}
  }

  function text(){
    const en = isEnglish();
    return {
      dialog: en ? 'Quick search' : 'بحث سريع',
      title: en ? 'Quick search in Bawsala' : 'بحث سريع داخل بوصلة',
      close: en ? 'Close search' : 'إغلاق البحث',
      input: en ? 'Search pages, resources, services, or BTEC commands' : 'ابحث عن صفحة، مصدر، خدمة، أو أمر BTEC',
      placeholder: en ? 'Search: grades, BTEC, homework, privacy...' : 'ابحث: معدل، BTEC، واجبات، خصوصية...',
      hint: en ? 'Shortcut: Ctrl/⌘ + K. Use ↑/↓ and Enter.' : 'اختصار: Ctrl/⌘ + K. استخدم ↑/↓ ثم Enter.',
      results: en ? 'Search results' : 'نتائج البحث',
      noResults: en ? 'No results. Try a shorter word.' : 'لا توجد نتيجة. جرّب كلمة أقصر.',
      recent: en ? 'Recent' : 'آخر استخدام',
      open: en ? 'Open result' : 'فتح النتيجة',
      resultCount: en ? 'results' : 'نتائج',
      clearRecent: en ? 'Clear recent' : 'مسح الأخيرة',
      recentCleared: en ? 'Recent searches cleared' : 'تم مسح آخر البحث',
      filterHint: en ? 'Showing strongest matches first.' : 'تظهر أقوى النتائج أولاً.',
      page: en ? 'Page' : 'صفحة',
      account: en ? 'Account' : 'حساب',
      legal: en ? 'Legal' : 'قانوني',
      company: en ? 'Company' : 'شركة',
      external: en ? 'External' : 'خارجي',
      resource: en ? 'Resource' : 'مصدر',
      service: en ? 'Service' : 'خدمة',
      lecture: en ? 'Lecture' : 'محاضرة',
      mindmap: en ? 'Mind Map' : 'خريطة',
      flashcards: en ? 'Flashcards' : 'بطاقات'
    };
  }

  function buildItems(){
    const d = window.MT_DATA, ui = window.MT_UI, tx = text();
    if(!d || !ui) return [];
    const local = (path) => ui.url(path);
    const en = isEnglish();
    const list = [];
    d.nav.forEach(([title,path,key])=>list.push({
      title: en ? (d.navEnglish?.[key] || title) : title,
      kind: tx.page,
      desc: en ? 'Move inside the platform' : 'انتقال داخل المنصة',
      url: local(path),
      external: false,
      key
    }));
    list.push(
      {title: en?'Settings':'الإعدادات',kind:tx.page,desc:en?'Language, theme, sync and backup':'لغة، مظهر، مزامنة ونسخ احتياطي',url:local('pages/settings.html'),aliases:aliasPack('ثيم لون لغة نسخ احتياطي مزامنة','theme language backup sync')},
      {title: en?'Account Settings':'إعدادات الحساب',kind:tx.account,desc:en?'Login, password and sync':'الدخول، كلمة المرور والمزامنة',url:local('pages/account.html'),aliases:aliasPack('حساب كلمة مرور جلسات رفع بيانات','account password sessions data')},
      {title: en?'Login':'تسجيل الدخول',kind:tx.account,desc:en?'Sign in to sync data':'الدخول لحفظ البيانات',url:local('pages/login.html'),aliases:aliasPack('دخول تسجيل حساب','signin auth')},
      {title: en?'User Agreement':'اتفاقية المستخدم',kind:tx.legal,desc:en?'Terms and responsibility limits':'شروط الاستخدام وحدود المسؤولية',url:local('pages/legal.html#terms')},
      {title: en?'Privacy Policy':'سياسة الخصوصية',kind:tx.legal,desc:en?'How student data is saved locally':'كيف تُحفظ بيانات الطالب داخل المتصفح',url:local('pages/legal.html#privacy')},
      {title: en?'About':'من نحن',kind:tx.company,desc:en?'Bawsala mission and principles':'مهمة بوصلة ومبادئها',url:local('pages/company.html')},
      {title: en?'Sample study day':'يوم دراسي نموذجي',kind:en?'Guide':'دليل',desc:en?'Open the daily loop and load safe sample data':'افتح حلقة اليوم وحمّل بيانات دراسية نموذجية',url:local('pages/workspace.html#flow'),aliases:aliasPack('مثال يوم دراسة تجريبي جاهزية','sample study day guide readiness')},
      {title:'SchoolMind AI',kind:tx.external,desc:en?'Open SchoolMind AI':'انتقال مباشر إلى SchoolMind AI',url:ui.safeURL(d.schoolmindUrl),external:true}
    );
    WORKSPACE_TOOLS.forEach(([key,arTitle,enTitle])=>list.push({
      title: en ? enTitle : arTitle,
      kind: en ? 'Study room tool' : 'أداة غرفة الدراسة',
      desc: en ? 'Jump directly to the tool inside the daily loop' : 'انتقال مباشر داخل حلقة الدراسة اليومية',
      url: local(`pages/workspace.html#${key}`),
      key:`workspace:${key}`,
      aliases:aliasPack(`${arTitle} دراسة واجب تركيز مؤقت مراجعة`,`${enTitle} study homework focus timer review`)
    }));
    d.resources.forEach(r=>list.push({title:r.name,kind:tx.resource,desc:`${r.fit} · ${r.cost}`,url:ui.safeURL(r.url),external:ui.safeURL(r.url).startsWith('http')}));
    d.services.forEach(s=>list.push({title:s.title,kind:tx.service,desc:s.desc,url:local('pages/services.html')}));
    d.lectures.forEach(l=>list.push({title:l.title,kind:tx.lecture,desc:l.takeaway,url:local('pages/workspace.html#lectures')}));
    d.mindmapTemplates?.forEach(m=>list.push({title:m.title,kind:tx.mindmap,desc:m.nodes.join(' · '),url:local('pages/workspace.html#mindmap')}));
    d.flashcardDecks?.forEach(deck=>list.push({title:deck,kind:tx.flashcards,desc:en?'Review deck':'مجموعة مراجعة',url:local('pages/workspace.html#flashcards')}));
    d.btecTerms.forEach(([term,ar,level,tip])=>list.push({title:`${term} - ${ar}`,kind:`BTEC ${level}`,desc:tip,url:local('pages/calculators.html#terms')}));
    return list;
  }

  function createPalette(){
    const tx = text();
    const node = document.createElement('div');
    node.className = 'command-palette';
    node.id = 'commandPalette';
    node.setAttribute('aria-hidden','true');
    node.innerHTML = `
      <div class="command-backdrop" data-close></div>
      <section class="command-panel" role="dialog" aria-modal="true" aria-labelledby="commandTitle">
        <div class="command-head">
          <strong id="commandTitle">${window.MT_UI.escapeHTML(tx.title)}</strong>
          <button class="icon-btn" data-close type="button" aria-label="${window.MT_UI.escapeAttr(tx.close)}">×</button>
        </div>
        <label class="sr-only" for="commandInput">${window.MT_UI.escapeHTML(tx.input)}</label>
        <input id="commandInput" class="command-input" type="search" role="combobox" placeholder="${window.MT_UI.escapeAttr(tx.placeholder)}" autocomplete="off" autocapitalize="none" spellcheck="false" aria-describedby="commandHint" aria-controls="commandResults" aria-autocomplete="list" aria-expanded="false">
        <div class="command-toolbar"><div class="fine" id="commandHint">${window.MT_UI.escapeHTML(tx.hint)} · ${window.MT_UI.escapeHTML(tx.filterHint)}</div><button class="btn sm secondary" id="clearRecentSearch" type="button">${window.MT_UI.escapeHTML(tx.clearRecent)}</button></div>
        <div class="sr-only" id="commandLive" role="status" aria-live="polite"></div>
        <div id="commandResults" class="command-results" role="listbox" aria-label="${window.MT_UI.escapeAttr(tx.results)}"></div>
      </section>`;
    document.body.appendChild(node);
    return node;
  }

  function refreshPaletteMarkup(){
    const wasOpen = palette?.classList.contains('open');
    if(palette) palette.remove();
    if(wasOpen) document.body.classList.remove('command-open');
    palette = createPalette();
    input = palette.querySelector('#commandInput');
    results = palette.querySelector('#commandResults');
    items = buildItems();
    activeIndex = 0;
    bindPaletteControls();
  }

  function close(){
    if(!palette) return;
    palette.classList.remove('open');
    palette.setAttribute('aria-hidden','true');
    document.body.classList.remove('command-open');
    input?.setAttribute('aria-activedescendant','');
    input?.setAttribute('aria-expanded','false');
    if(lastActive && document.contains(lastActive)) lastActive.focus();
  }

  function open(){
    if(!palette) refreshPaletteMarkup();
    lastActive = document.activeElement;
    palette.classList.add('open');
    palette.setAttribute('aria-hidden','false');
    document.body.classList.add('command-open');
    input?.setAttribute('aria-expanded','true');
    render('');
    requestAnimationFrame(()=>input?.focus());
  }

  function score(item, q){
    const nq=normalize(q);
    const hay = normalize(`${item.title} ${item.kind} ${item.desc} ${item.aliases || ''}`);
    if(!nq) return item.recent ? 3 : 1;
    const title=normalize(item.title);
    const words = nq.split(/\s+/).filter(Boolean);
    return words.reduce((n,w)=> n + (hay.includes(w) ? 2 : 0) + (title.startsWith(w) ? 3 : 0) + (title===w ? 4 : 0), 0);
  }
  function highlight(value, q){
    const ui=window.MT_UI;
    const safe=ui.escapeHTML(value);
    const words=normalize(q).split(/\s+/).filter(w=>w.length>1).slice(0,4);
    if(!words.length) return safe;
    let out=safe;
    words.forEach(word=>{
      const escaped=word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      out=out.replace(new RegExp(`(${escaped})`,'ig'),'<mark>$1</mark>');
    });
    return out;
  }

  function setActive(index){
    if(!visibleItems.length){
      activeIndex = 0;
      input?.setAttribute('aria-activedescendant','');
      input?.setAttribute('aria-expanded','false');
      return;
    }
    activeIndex = (index + visibleItems.length) % visibleItems.length;
    results.querySelectorAll('.command-item').forEach((item,i)=>{
      const selected = i === activeIndex;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-selected', String(selected));
      if(selected) item.scrollIntoView({block:'nearest'});
    });
    input?.setAttribute('aria-activedescendant', `commandResult${activeIndex}`);
  }

  function render(q){
    const ui = window.MT_UI, tx = text();
    const qClean=normalize(q);
    const savedRecent=recent();
    const source=qClean ? items : [...savedRecent.map(x=>({...x,recent:true,kind:`${tx.recent} · ${x.kind||tx.page}`})), ...items];
    const seen=new Set();
    visibleItems = source.map(item=>({...item,_score:score(item,q)})).filter(x=>x._score>0 && !seen.has(x.url) && seen.add(x.url)).sort((a,b)=>b._score-a._score || String(a.title).localeCompare(String(b.title))).slice(0,10);
    const clearBtn=palette?.querySelector('#clearRecentSearch');
    if(clearBtn) clearBtn.hidden=Boolean(qClean || !savedRecent.length);
    input?.setAttribute('aria-expanded', String(visibleItems.length>0));
    const live=palette?.querySelector('#commandLive');
    if(live) live.textContent=`${visibleItems.length} ${tx.resultCount}`;
    results.innerHTML = visibleItems.length ? visibleItems.map((item,index)=>`<a class="command-item" role="option" id="commandResult${index}" aria-selected="false" href="${ui.escapeAttr(ui.safeURL(item.url))}" data-result-index="${index}" aria-label="${ui.escapeAttr(`${tx.open}: ${item.title}`)}" ${item.external?'target="_blank" rel="noopener noreferrer"':''}><span class="badge gray">${ui.escapeHTML(item.kind)}</span><strong>${highlight(item.title,q)}</strong><small>${highlight(item.desc,q)}</small></a>`).join('') : `<div class="empty"><p>${ui.escapeHTML(tx.noResults)}</p><div class="actions"><a class="btn sm" href="${ui.escapeAttr(ui.url('pages/workspace.html#flow'))}">${isEnglish()?'Daily loop':'حلقة اليوم'}</a><a class="btn sm secondary" href="${ui.escapeAttr(ui.url('pages/resources.html'))}">${isEnglish()?'Resources':'المصادر'}</a></div></div>`;
    setActive(0);
  }

  function trapTab(event){
    if(event.key !== 'Tab' || !palette?.classList.contains('open')) return;
    const focusables = [...palette.querySelectorAll('a[href],button,input,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled && el.offsetParent !== null);
    if(!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if(event.shiftKey && document.activeElement === first){ event.preventDefault(); last.focus(); }
    else if(!event.shiftKey && document.activeElement === last){ event.preventDefault(); first.focus(); }
  }

  function openActiveResult(){
    const selected = results.querySelector('.command-item.active') || results.querySelector('.command-item');
    if(selected){
      const item=visibleItems[Number(selected.dataset.resultIndex || activeIndex)];
      remember(item);
      selected.click();
    }
  }

  function bindPaletteControls(){
    palette.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click', close));
    input.addEventListener('input',()=>render(input.value.trim()));
    input.addEventListener('keydown',(event)=>{
      if(event.key==='Escape'){ event.stopPropagation(); if(input.value){ input.value=''; render(''); } else close(); }
      if(event.key==='ArrowDown'){
        event.preventDefault();
        setActive(activeIndex + 1);
      }
      if(event.key==='ArrowUp'){
        event.preventDefault();
        setActive(activeIndex - 1);
      }
      if(event.key==='Home'){
        event.preventDefault();
        setActive(0);
      }
      if(event.key==='End'){
        event.preventDefault();
        setActive(visibleItems.length - 1);
      }
      if(event.key==='PageDown'){
        event.preventDefault();
        setActive(activeIndex + 5);
      }
      if(event.key==='PageUp'){
        event.preventDefault();
        setActive(activeIndex - 5);
      }
      if(event.key==='Enter'){
        event.preventDefault();
        openActiveResult();
      }
    });
    results.addEventListener('mousemove',event=>{
      const item = event.target.closest('.command-item');
      if(!item) return;
      const next = Number(item.id.replace('commandResult',''));
      if(Number.isFinite(next)) setActive(next);
    });
    palette.querySelector('#clearRecentSearch')?.addEventListener('click',()=>{ clearRecent(); window.MT_UI?.toast?.(text().recentCleared); render(input.value.trim()); });
    results.addEventListener('click',event=>{
      const item = event.target.closest('.command-item');
      if(item){ remember(visibleItems[Number(item.dataset.resultIndex || 0)]); close(); return; }
      if(event.target.closest('a[href]')) close();
    });
    palette.addEventListener('keydown', trapTab);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    refreshPaletteMarkup();
    document.addEventListener('click',(event)=>{
      if(event.target.closest('#globalSearchOpen')) open();
    });
    document.addEventListener('keydown',(event)=>{
      const typing=event.target && /^(input|textarea|select)$/i.test(event.target.tagName);
      if((event.ctrlKey||event.metaKey) && event.key.toLowerCase()==='k'){
        event.preventDefault();
        open();
      }
      if(!typing && !event.ctrlKey && !event.metaKey && event.key==='/'){
        event.preventDefault();
        open();
      }
      if(event.key==='Escape' && palette?.classList.contains('open')) close();
    });
    window.addEventListener('mt:language',()=>{ close(); refreshPaletteMarkup(); });
  });
})();
