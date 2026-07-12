(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    const s=window.MT_STORE, ui=window.MT_UI, sec=window.MT_SECURITY, backend=window.BAWSALA_BACKEND;
    const form=document.getElementById('calendarForm');
    const list=document.getElementById('calendarList');
    const empty=document.getElementById('calendarEmpty');
    const filter=document.getElementById('calendarFilter');
    const status=document.getElementById('calendarStatus');
    const google=document.getElementById('googleCalendarNotice');
    const googleConnect=document.getElementById('googleCalendarConnect');
    const googleSync=document.getElementById('googleCalendarSync');
    const googleDisconnect=document.getElementById('googleCalendarDisconnect');
    const googleDirection=document.getElementById('googleCalendarDirection');
    const monthGrid=document.getElementById('calendarMonthGrid');
    const monthLabel=document.getElementById('calendarMonthLabel');
    const prevBtn=document.getElementById('calendarPrev');
    const nextBtn=document.getElementById('calendarNext');
    const todayBtn=document.getElementById('calendarToday');
    let currentEvents=[];
    let remoteCalendar=false;
    let googleState=null;
    let viewDate=new Date();
    viewDate.setDate(1);

    function setStatus(text,type='info'){
      if(!status) return;
      status.className='notice '+type;
      status.textContent=text;
      status.setAttribute('role',type==='danger'?'alert':'status');
    }
    function errorMessage(err,fallback){
      const requestId=String(err?.requestId||'').trim();
      return `${fallback}${requestId?` (مرجع: ${requestId})`:''}`;
    }
    async function withBusy(button,label,task){
      try{ ui.setBusy?.(button,true,label); return await task(); }
      finally{ ui.setBusy?.(button,false); }
    }
    function pad(n){ return String(n).padStart(2,'0'); }
    function isoDate(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function monthRange(){ const start=new Date(viewDate.getFullYear(),viewDate.getMonth(),1); const end=new Date(viewDate.getFullYear(),viewDate.getMonth()+1,0); return {start:isoDate(start),end:isoDate(end)}; }
    function eventStart(ev){ return ev?.startTime || (ev?.date?`${ev.date}T${ev.time||'00:00'}:00.000Z`:''); }
    function sortEvents(rows){ return [...(Array.isArray(rows)?rows:[])].sort((a,b)=>String(eventStart(a)||'').localeCompare(String(eventStart(b)||''))||String(a.title||'').localeCompare(String(b.title||''))); }
    function localEvents(){ return sortEvents(s.get('study:calendar',[]).filter(ev=>!ev?._deleted)); }
    function normalizeProfileTrack(profile){ const raw=String(profile?.track||'').toLowerCase(); if(raw.includes('btec')||raw.includes('مهني')) return 'btec'; if(raw.includes('academic')||raw.includes('علمي')||raw.includes('أدبي')) return 'academic'; return ''; }
    function visibleEvents(){ const f=filter?.value||'all'; const profileTrack=normalizeProfileTrack(s.activeProfile?.()||{}); return sortEvents(currentEvents).filter(ev=>(f==='all'||ev.type===f)&&(ev.track==='all'||!profileTrack||ev.track===profileTrack)); }
    function badge(type){ return ({deadline:'red',exam:'red',session:'blue',task:'green',reminder:'teal'}[type]||'blue'); }
    function typeLabel(type){ return ({deadline:'موعد تسليم',exam:'امتحان',session:'جلسة',task:'مهمة',reminder:'تذكير'}[type]||'مهمة'); }
    function reminderLabel(ev){ return ({none:'بدون تذكير','same-day':'تذكير وقت الحدث','day-before':'تذكير قبل يوم','week-before':'تذكير قبل أسبوع'}[ev.reminder]||'تذكير'); }
    function mergeLocalCache(events){
      const incoming=Array.isArray(events)?events:[];
      const byId=new Map(localEvents().map(event=>[event.id,event]));
      incoming.forEach(event=>{ if(event?.id) byId.set(event.id,event); });
      s.set('study:calendar',sortEvents([...byId.values()]));
    }
    function rememberRemote(events,{cache=true}={}){
      currentEvents=sortEvents(events||[]);
      if(cache) mergeLocalCache(currentEvents);
      remoteCalendar=true;
      setStatus('التقويم محفوظ على الحساب ومتاح للمزامنة بين الأجهزة.','success');
    }
    function renderLoading(){
      list?.setAttribute('aria-busy','true');
      if(list) list.innerHTML='<article class="card compact calendar-event ux-skeleton" aria-hidden="true"></article><article class="card compact calendar-event ux-skeleton" aria-hidden="true"></article>';
      if(empty) empty.classList.add('hide');
    }
    function updateGoogleControls(data){
      googleState=data||{};
      if(google) google.textContent=data?.message||'تعذر تحديد حالة Google Calendar.';
      if(googleConnect){
        googleConnect.hidden=!data?.configured;
        googleConnect.disabled=!data?.configured||!data?.authenticated;
        googleConnect.textContent=data?.connected?'إعادة ربط Google Calendar':'ربط Google Calendar';
      }
      if(googleSync){ googleSync.hidden=!data?.connected; googleSync.disabled=!data?.connected; }
      if(googleDirection){ googleDirection.hidden=!data?.connected; googleDirection.disabled=!data?.connected; }
      if(googleDisconnect){ googleDisconnect.hidden=!data?.connected; googleDisconnect.disabled=!data?.connected; }
    }
    async function refreshGoogleStatus(){
      if(!backend?.googleCalendarStatus) return;
      try{ updateGoogleControls(await backend.googleCalendarStatus()); }
      catch(err){ if(google) google.textContent=errorMessage(err,'تعذر تحميل حالة Google Calendar.'); }
    }
    async function loadEvents(){
      currentEvents=localEvents();
      renderLoading();
      try{
        if(!backend){ render(); return; }
        if(!backend.state.authenticated) await backend.me();
        if(!backend.state.authenticated){ remoteCalendar=false; currentEvents=localEvents(); render(); setStatus('التقويم يعمل محلياً. سجّل الدخول لحفظه على الحساب.','info'); await refreshGoogleStatus(); return; }
        const data=await backend.calendarEvents(monthRange());
        rememberRemote(data.events||[]);
        if(data.sync) updateGoogleControls(data.sync);
        render();
      }catch(err){
        remoteCalendar=false; currentEvents=localEvents(); render();
        setStatus(err?.message==='EMAIL_VERIFICATION_REQUIRED'?'أكد بريدك قبل حفظ التقويم على الحساب.':errorMessage(err,'تعذر تحميل تقويم الحساب. يتم استخدام النسخة المحلية مؤقتاً.'),'danger');
      }finally{ list?.removeAttribute('aria-busy'); await refreshGoogleStatus(); }
    }
    async function persistEvent(clean){
      if(remoteCalendar&&backend?.state?.authenticated){
        const data=clean.id?await backend.updateCalendarEvent(clean.id,clean):await backend.createCalendarEvent(clean);
        rememberRemote(data.events||[data.event]);
        return data.event;
      }
      if(clean.id){ s.updateCollection('study:calendar',clean.id,old=>({...old,...clean,id:clean.id})); currentEvents=localEvents(); return clean; }
      const created=s.addToCollection('study:calendar',clean); currentEvents=localEvents(); backend?.scheduleSync?.(); return created;
    }
    async function deleteEvent(id){
      if(remoteCalendar&&backend?.state?.authenticated){ const data=await backend.deleteCalendarEvent(id); rememberRemote(data.events||[]); return; }
      s.deleteFromCollection('study:calendar',id); currentEvents=localEvents(); backend?.scheduleSync?.();
    }
    function renderMonth(){
      if(!monthGrid) return;
      const start=new Date(viewDate.getFullYear(),viewDate.getMonth(),1);
      const cursor=new Date(start); cursor.setDate(1-start.getDay());
      const today=sec.localDate();
      if(monthLabel) monthLabel.textContent=viewDate.toLocaleDateString('ar-JO',{month:'long',year:'numeric'});
      const visible=visibleEvents();
      const rows=[];
      for(let i=0;i<42;i++){
        const d=isoDate(cursor), inMonth=cursor.getMonth()===viewDate.getMonth();
        const dayEvents=visible.filter(ev=>ev.date===d);
        rows.push(`<button class="calendar-day ${inMonth?'':'muted-day'} ${d===today?'today':''}" type="button" data-date="${ui.escapeAttr(d)}" aria-label="${ui.escapeAttr(d)}"><span class="calendar-day-number">${cursor.getDate()}</span>${dayEvents.slice(0,3).map(ev=>`<span class="calendar-chip ${badge(ev.type)}">${ui.escapeHTML(ev.title)}</span>`).join('')}${dayEvents.length>3?'<span class="fine">+ المزيد</span>':''}</button>`);
        cursor.setDate(cursor.getDate()+1);
      }
      monthGrid.innerHTML=rows.join('');
      monthGrid.querySelectorAll('[data-date]').forEach(btn=>btn.addEventListener('click',()=>{ if(form?.date) form.date.value=btn.dataset.date; form?.scrollIntoView({block:'start',behavior:'smooth'}); }));
    }
    function render(){
      const rows=visibleEvents();
      list?.removeAttribute('aria-busy');
      if(empty) empty.classList.toggle('hide',rows.length>0);
      if(list){
        list.innerHTML=rows.map(ev=>`<article class="card compact calendar-event"><span class="badge ${badge(ev.type)}">${ui.escapeHTML(typeLabel(ev.type))}</span><h3>${ui.escapeHTML(ev.title)}</h3><p class="fine">${ui.escapeHTML(ev.date)} ${ui.escapeHTML(ev.time||'')} · ${ui.escapeHTML(ev.subject||'عام')} · ${ui.escapeHTML(reminderLabel(ev))}</p><p class="muted">${ui.escapeHTML(ev.notes||ev.description||'')}</p><div class="actions"><button class="btn sm primary" data-start-study="${ui.escapeAttr(ev.id)}" type="button">ابدأ كجلسة</button><button class="btn sm secondary" data-edit="${ui.escapeAttr(ev.id)}" type="button">تعديل</button><button class="btn sm danger" data-delete="${ui.escapeAttr(ev.id)}" type="button">حذف</button></div></article>`).join('');
        list.querySelectorAll('[data-start-study]').forEach(btn=>btn.addEventListener('click',()=>{
          const ev=currentEvents.find(x=>x.id===btn.dataset.startStudy); if(!ev) return;
          window.BAWSALA_STUDY?.beginContext?.({kind:'calendar',entityId:ev.id,title:ev.title,mission:`أعمل على ${ev.title}${ev.notes?`: ${ev.notes}`:''}`,subject:ev.subject||'عام',minutes:Number(ev.duration)||35,target:'focus',sourcePage:location.pathname});
          setStatus('تم ربط الحدث بجلسة دراسة. سيبقى السياق معك عند الانتقال.','success');
          location.href='workspace.html#focus';
        }));
        list.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',async()=>{
          const ok=await ui.confirmAction({title:'حذف الحدث؟',message:'سيُحذف الحدث من تقويم بوصلة، ومن Google Calendar في المزامنة التالية إذا كان مربوطاً.',confirmText:'حذف',danger:true});
          if(!ok) return;
          try{ await withBusy(btn,'جارٍ الحذف…',()=>deleteEvent(btn.dataset.delete)); render(); setStatus('تم حذف الحدث.','success'); }
          catch(err){ setStatus(errorMessage(err,'تعذر حذف الحدث.'),'danger'); }
        }));
        list.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{
          const ev=currentEvents.find(x=>x.id===btn.dataset.edit); if(!ev||!form) return;
          form.eventId.value=ev.id; form.title.value=ev.title; form.type.value=ev.type; form.date.value=ev.date; form.time.value=ev.time||''; form.duration.value=ev.duration||60; form.track.value=ev.track||'all'; form.subject.value=ev.subject||''; form.reminder.value=ev.reminder||'none'; form.timezone.value=ev.timezone||'Asia/Amman'; form.notes.value=ev.notes||ev.description||'';
          form.querySelector('button[type="submit"]').textContent='حفظ التعديل'; form.scrollIntoView({block:'start',behavior:'smooth'}); form.title.focus({preventScroll:true});
        }));
      }
      renderMonth();
    }

    form?.addEventListener('submit',async event=>{
      event.preventDefault();
      const f=event.currentTarget, submit=f.querySelector('button[type="submit"]');
      const payload={id:f.eventId.value||undefined,title:f.title.value,type:f.type.value,date:f.date.value,time:f.time.value,duration:f.duration.value,track:f.track.value,subject:f.subject.value,reminder:f.reminder.value,timezone:f.timezone.value||'Asia/Amman',notes:f.notes.value,description:f.notes.value};
      const clean=sec.sanitizeForKey('study:calendar',[payload],[])[0];
      if(!clean?.title||!clean?.date){ setStatus('العنوان والتاريخ مطلوبان.','danger'); return; }
      try{
        const editing=!!f.eventId.value;
        await withBusy(submit,editing?'جارٍ حفظ التعديل…':'جارٍ إضافة الحدث…',()=>persistEvent(clean));
        setStatus(editing?'تم تعديل الحدث.':'تمت إضافة الحدث.','success');
        f.reset(); f.eventId.value=''; f.date.value=sec.localDate(); f.track.value='all'; f.type.value='task'; f.duration.value='60'; f.reminder.value='none'; f.timezone.value='Asia/Amman'; submit.textContent='إضافة الحدث'; render();
      }catch(err){ setStatus(err?.message==='UNAUTHORIZED'?'سجل الدخول لحفظ التقويم على الحساب.':errorMessage(err,'تعذر حفظ الحدث.'),'danger'); }
    });
    filter?.addEventListener('change',render);
    prevBtn?.addEventListener('click',()=>{ viewDate.setMonth(viewDate.getMonth()-1); loadEvents(); });
    nextBtn?.addEventListener('click',()=>{ viewDate.setMonth(viewDate.getMonth()+1); loadEvents(); });
    todayBtn?.addEventListener('click',()=>{ viewDate=new Date(); viewDate.setDate(1); loadEvents(); });
    window.addEventListener('mt:profile',render);
    document.getElementById('calendarExport')?.addEventListener('click',()=>ui.downloadText('bawsala-calendar.json',JSON.stringify(localEvents(),null,2),'application/json'));
    document.getElementById('calendarReminderDispatch')?.addEventListener('click',async event=>{
      try{ const data=await withBusy(event.currentTarget,'جارٍ فحص التذكيرات…',()=>backend.dispatchCalendarReminders({now:new Date().toISOString()})); setStatus(data.dispatched?`تم تجهيز ${data.dispatched} تذكير للإرسال.`:'لا توجد تذكيرات مستحقة الآن.','info'); await loadEvents(); }
      catch(err){ setStatus(errorMessage(err,'تعذر تشغيل التذكيرات. تأكد من تسجيل الدخول وتأكيد البريد.'),'danger'); }
    });
    googleConnect?.addEventListener('click',async()=>{
      try{ const data=await withBusy(googleConnect,'جارٍ فتح Google…',()=>backend.googleCalendarConnect()); if(!data.authUrl) throw new Error('GOOGLE_AUTH_URL_MISSING'); location.assign(data.authUrl); }
      catch(err){ setStatus(errorMessage(err,'تعذر بدء ربط Google Calendar.'),'danger'); await refreshGoogleStatus(); }
    });
    googleSync?.addEventListener('click',async()=>{
      try{
        const data=await withBusy(googleSync,'جارٍ المزامنة…',()=>backend.googleCalendarSync(googleDirection?.value||'two-way'));
        rememberRemote(data.events||[]); render(); updateGoogleControls(data.status||googleState);
        const stats=data.stats||{};
        setStatus(`اكتملت المزامنة: رُفع ${stats.pushed||0}، سُحب ${stats.pulled||0}، وحُذف ${stats.deleted||0}.`,'success');
      }catch(err){ setStatus(errorMessage(err,err?.message==='GOOGLE_CALENDAR_RECONNECT_REQUIRED'?'انتهت صلاحية الربط. أعد ربط Google Calendar.':'تعذرت مزامنة Google Calendar.'),'danger'); await refreshGoogleStatus(); }
    });
    googleDisconnect?.addEventListener('click',async()=>{
      const ok=await ui.confirmAction({title:'فصل Google Calendar؟',message:'لن تُحذف أحداثك، لكن ستتوقف المزامنة حتى تعيد الربط.',confirmText:'فصل الربط',danger:true});
      if(!ok) return;
      try{ const data=await withBusy(googleDisconnect,'جارٍ الفصل…',()=>backend.googleCalendarDisconnect()); updateGoogleControls(data.status); setStatus('تم فصل Google Calendar.','success'); }
      catch(err){ setStatus(errorMessage(err,'تعذر فصل Google Calendar.'),'danger'); }
    });

    const googleResult=new URLSearchParams(location.search).get('google');
    if(googleResult){
      const messages={connected:['تم ربط Google Calendar بنجاح.','success'],google_denied:['ألغيت موافقة Google. لم يتغير شيء.','info'],email_mismatch:['حساب Google المختار لا يطابق بريد حساب بوصلة.','danger'],session_required:['انتهت الجلسة قبل اكتمال الربط. سجّل الدخول وأعد المحاولة.','danger'],provider_mismatch:['حساب Google مختلف عن الحساب المرتبط بهويتك.','danger']};
      const [message,type]=messages[googleResult]||['فشل ربط Google Calendar. أعد المحاولة وراجع إعدادات OAuth.','danger'];
      setStatus(message,type);
      history.replaceState({},'',location.pathname+location.hash);
    }
    if(form?.date) form.date.value=sec.localDate();
    if(form?.timezone) form.timezone.value='Asia/Amman';
    updateGoogleControls({configured:false,connected:false,authenticated:false,message:'جارٍ فحص إعدادات Google Calendar…'});
    loadEvents();
  });
})();
