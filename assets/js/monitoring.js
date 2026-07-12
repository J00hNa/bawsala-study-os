(function(){
  'use strict';
  const MAX_ERRORS=40;
  const MAX_EVENTS=120;
  const store=()=>window.MT_STORE;
  const sec=()=>window.MT_SECURITY;
  function now(){return new Date().toISOString();}
  function clean(value,max=240){return sec()?.cleanText?.(value,max)||String(value||'').slice(0,max);}
  function logError(message,source='',stack=''){
    const s=store();if(!s)return null;
    const entry={id:s.cryptoId(),message:clean(message,300)||'Runtime error',source:clean(source,180),stack:sec()?.cleanMultiline?.(stack,1800)||'',page:location.pathname,createdAt:now()};
    const list=[entry,...(s.get('runtime:errors',[])||[])].slice(0,MAX_ERRORS);
    s.set('runtime:errors',list);
    return entry;
  }
  function recordProductEvent(type,label=''){
    const s=store();if(!s)return null;
    const prefs=s.get('user:preferences',{})||{};
    if(prefs.productAnalytics===false)return null;
    const entry={id:s.cryptoId(),event:clean(type,60),detail:clean(label,100),page:location.pathname,role:s.get('product:role','student')||'student',ts:now()};
    s.set('product:analytics',[entry,...(s.get('product:analytics',[])||[])].slice(0,MAX_EVENTS));
    return entry;
  }
  function buildLaunchSnapshot(){
    const s=store();
    const sessions=s?.get('study:sessions',[])||[];
    const notes=s?.get('notebook:notes',[])||[];
    const cards=s?.get('notebook:flashcards',[])||[];
    const tickets=(s?.get('problems',[])||[]).filter(item=>item?.source==='support-center');
    return {generatedAt:now(),version:sec()?.APP_VERSION||'16.0.1',localOnly:true,metrics:{profiles:s?.getProfiles?.().length||0,focusSessions:sessions.length,notes:notes.length,flashcards:cards.length,supportTickets:tickets.length,runtimeErrors:(s?.get('runtime:errors',[])||[]).length}};
  }
  function bind(){
    addEventListener('error',event=>logError(event.message,event.filename,event.error?.stack));
    addEventListener('unhandledrejection',event=>logError(event.reason?.message||String(event.reason),'unhandledrejection',event.reason?.stack));
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('[data-track],a.btn,button.btn');
      if(!target)return;
      recordProductEvent(target.dataset.track||'ui_action',(target.getAttribute('aria-label')||target.textContent||target.id||'').trim().slice(0,100));
    },{capture:true});
    recordProductEvent('page_view',document.body.dataset.page||'unknown');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.MT_MONITOR={logError,recordProductEvent,buildLaunchSnapshot};
  window.MT_PRODUCT_SUITE={recordProductEvent,buildTractionSnapshot:buildLaunchSnapshot,currentRole:()=>store()?.get('product:role','student')||'student',setRole:role=>{store()?.set('product:role',clean(role,20));return clean(role,20);}};
})();
