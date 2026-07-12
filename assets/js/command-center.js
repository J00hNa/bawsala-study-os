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
