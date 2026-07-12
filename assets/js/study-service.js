(function(){
  'use strict';
  const store=()=>window.MT_STORE;
  const sec=()=>window.MT_SECURITY;
  const loop=()=>window.MT_STUDY_LOOP;
  const backend=()=>window.BAWSALA_BACKEND;
  const state={remoteOverview:null,lastRemoteAt:null,lastCommitAt:null,lastCommitError:null};
  const contextPages=new Set(['home','dashboard','workspace','study','resources','calendar','notebook','flashcards','mindmaps','advisor']);
  const page=()=>document.body?.dataset?.page||'home';
  const date=()=>sec()?.localDate?.()||new Date().toISOString().slice(0,10);
  const nowIso=()=>new Date().toISOString();
  const id=()=>store()?.cryptoId?.()||('sr_'+Date.now().toString(36)+Math.random().toString(36).slice(2));
  const clean=(value,max=220)=>sec()?.cleanText?.(value,max)||String(value||'').trim().slice(0,max);
  const cleanId=value=>sec()?.cleanId?.(value)||String(value||'').replace(/[^a-zA-Z0-9:_-]/g,'').slice(0,140);
  const clamp=(value,min,max,fallback=min)=>sec()?.clampNumber?.(value,min,max,fallback)??fallback;
  const visible=list=>(Array.isArray(list)?list:[]).filter(item=>!(item&&item._deleted===true));
  const localDateOf=value=>loop()?.localDateOf?.(value)||String(value||'').slice(0,10);
  function validContinuation(value){
    if(!value||typeof value!=='object'||!clean(value.title,180))return null;
    const expires=value.expiresAt?Date.parse(value.expiresAt):NaN;
    if(Number.isFinite(expires)&&expires<=Date.now())return null;
    return ['done','cancelled'].includes(value.status)?null:value;
  }
  function dueCards(){return visible(store()?.get?.('notebook:flashcards',[])||[]).filter(card=>!card.archived&&(!card.dueAt||Date.parse(card.dueAt)<=Date.now()));}
  function openHomeworks(){return visible(store()?.get?.('homeworks',[])||[]).filter(item=>!item.done).sort((a,b)=>String(a.due||'9999-12-31').localeCompare(String(b.due||'9999-12-31')));}
  function upcomingEvents(){return visible(store()?.get?.('study:calendar',[])||[]).filter(item=>item.date&&item.date>=date()).sort((a,b)=>`${a.date} ${a.time||''}`.localeCompare(`${b.date} ${b.time||''}`));}
  function daysUntil(value){if(!value)return Infinity;const a=Date.parse(value+'T00:00:00Z'),b=Date.parse(date()+'T00:00:00Z');return Number.isFinite(a)&&Number.isFinite(b)?Math.ceil((a-b)/86400000):Infinity;}
  function timeline(status){
    const items=[];
    const mission=status.missionObject;
    if(mission)items.push({type:'mission',at:mission.updatedAt||mission.createdAt,title:status.mission,meta:`${mission.minutes||25} دقيقة`});
    status.sessions.forEach(item=>items.push({type:'session',at:item.finishedAt||item.createdAt,title:item.mission||'جلسة تركيز',meta:`${item.minutes||0} دقيقة`}));
    status.errors.forEach(item=>items.push({type:'error',at:item.updatedAt||item.createdAt,title:item.lesson||item.subject||'خطأ',meta:item.fix||''}));
    status.reviews.forEach(item=>items.push({type:'review',at:item.createdAt||item.date,title:'إغلاق اليوم',meta:item.tomorrow||item.commitment||''}));
    return items.sort((a,b)=>(b.at?Date.parse(b.at):0)-(a.at?Date.parse(a.at):0)).slice(0,10);
  }
  function overview(){
    const activeStore=store();
    const status=loop()?.fromStore?.(activeStore,date())||{mission:'',missionObject:null,sources:[],sessions:[],errors:[],reviews:[],steps:[],done:0,total:4,percent:0,minutes:0,staleMission:false};
    const profile=activeStore?.activeProfile?.()||{id:'guest',name:'طالب',dailyHours:2};
    const continuation=validContinuation(activeStore?.get?.('study:continuation',null));
    const tasks=openHomeworks();const cards=dueCards();const events=upcomingEvents();
    let priority=null;
    const urgent=tasks.find(item=>daysUntil(item.due)<=2);
    if(continuation)priority={kind:continuation.kind||'continuation',id:continuation.entityId||'',title:continuation.title,subject:continuation.subject||'',target:continuation.target||'focus',reason:'هذا هو العمل الذي تركته مفتوحاً.'};
    else if(urgent)priority={kind:'homework',id:urgent.id,title:urgent.title,subject:urgent.subject||'',target:'focus',reason:urgent.due?`موعده خلال ${Math.max(0,daysUntil(urgent.due))} يوم.`:'واجب مفتوح.'};
    else if(events[0]&&daysUntil(events[0].date)<=2)priority={kind:'calendar',id:events[0].id,title:events[0].title,subject:events[0].subject||'',target:'focus',reason:'موعد قريب في التقويم.'};
    else if(cards.length)priority={kind:'flashcards',id:cards[0].id,title:`مراجعة ${Math.min(20,cards.length)} بطاقة مستحقة`,subject:cards[0].subject||'',target:'flashcards',reason:'بطاقات تجاوزت موعد المراجعة.'};
    else if(status.mission)priority={kind:'mission',id:status.missionObject?.id||'',title:status.mission,subject:status.missionObject?.subject||'',target:loop()?.nextAction?.(status)?.key==='mission'?'mission':'focus',reason:'مهمة اليوم الحالية.'};
    const warnings=[];
    if(status.staleMission)warnings.push({code:'STALE_MISSION',message:'المهمة المحفوظة تخص يوماً سابقاً ولن تُحسب اليوم.'});
    if(status.mission&&!status.sources.length)warnings.push({code:'NO_SOURCES',message:'مهمة اليوم بلا مصادر محددة.'});
    if(tasks.some(item=>item.due&&item.due<date()))warnings.push({code:'OVERDUE_HOMEWORK',message:'توجد واجبات متأخرة.'});
    return {
      date:date(),profile:{id:profile.id,name:profile.name||'طالب',dailyHours:Number(profile.dailyHours)||2},mission:status.missionObject,
      sourceBudget:activeStore?.get?.('study:sourceBudget',null),continuation,loop:{...status,nextAction:loop()?.nextAction?.(status)||{key:'mission',label:'حدد مهمة اليوم'}},
      focus:{minutes:status.minutes,goalMinutes:Math.round((Number(profile.dailyHours)||2)*60),sessions:status.sessions.length},
      counts:{openHomeworks:tasks.length,overdueHomeworks:tasks.filter(item=>item.due&&item.due<date()).length,dueCards:cards.length,todayErrors:status.errors.length,upcomingEvents:events.length},
      priority,timeline:timeline(status),warnings,remote:state.remoteOverview,generatedAt:nowIso()
    };
  }
  function normalizeAction(action){
    const type=clean(action?.type,60);const payload={...(action?.payload||{})};
    if(['session.complete','error.save','review.save','continuation.set'].includes(type)&&!payload.id)payload.id=id();
    if(type==='mission.save'){
      payload.id=payload.id||id();payload.date=payload.date||date();payload.createdAt=payload.createdAt||nowIso();payload.updatedAt=nowIso();
    }
    if(type==='source-budget.save')payload.date=payload.date||date();
    return {type,payload};
  }
  function upsert(collection,record){
    const list=visible(store().get(collection,[]));
    const existing=list.some(item=>item.id===record.id);
    if(existing){store().set(collection,list.map(item=>item.id===record.id?{...item,...record,updatedAt:record.updatedAt||nowIso()}:item));return store().get(collection,[]).find(item=>item.id===record.id);}
    return store().addToCollection(collection,record);
  }
  function applyLocal(action){
    const {type,payload}=action;
    if(type==='mission.save'){
      const text=clean(payload.text||payload.mission,220);if(!text)throw new Error('MISSION_REQUIRED');
      return store().set('dashboard:mission',{...payload,text,mission:text,date:payload.date||date(),status:payload.status||'ready',minutes:clamp(payload.minutes,5,180,25),createdAt:payload.createdAt||nowIso(),updatedAt:nowIso()});
    }
    if(type==='source-budget.save')return store().set('study:sourceBudget',{...payload,date:payload.date||date(),limit:clamp(payload.limit,1,3,2),sources:(payload.sources||[]).map(item=>clean(item,120)).filter(Boolean).slice(0,3),updatedAt:nowIso()});
    if(type==='session.complete')return upsert('study:sessions',{...payload,createdAt:payload.createdAt||nowIso(),finishedAt:payload.finishedAt||nowIso(),updatedAt:nowIso()});
    if(type==='error.save')return upsert('errors',{...payload,createdAt:payload.createdAt||nowIso(),updatedAt:nowIso(),status:payload.status||'جديد'});
    if(type==='review.save')return upsert('dailyReviews',{...payload,date:payload.date||nowIso(),createdAt:payload.createdAt||nowIso(),updatedAt:nowIso()});
    if(type==='homework.toggle'){
      let result=null;store().updateCollection('homeworks',payload.id,item=>{result={...item,done:payload.done===undefined?!item.done:!!payload.done};return result;});return result;
    }
    if(type==='continuation.set')return store().set('study:continuation',{...payload,status:'active',createdAt:payload.createdAt||nowIso(),updatedAt:nowIso(),expiresAt:payload.expiresAt||new Date(Date.now()+7*86400000).toISOString()});
    if(type==='continuation.clear'){store().remove('study:continuation');return null;}
    throw new Error('UNSUPPORTED_STUDY_ACTION');
  }
  async function sendRemote(actions){
    const api=backend();
    if(!api?.state?.authenticated||api.state.user?.emailVerificationRequired||!navigator.onLine)return null;
    const payload={date:date(),timezoneOffsetMinutes:new Date().getTimezoneOffset(),profileId:store()?.activeProfile?.()?.id||'',baseRevision:api.state.lastRevision||'',actions};
    try{
      const data=api.studyTransaction?await api.studyTransaction(actions,payload):await api.request('/api/study/transactions',{method:'POST',body:payload,idempotent:true,retries:1});
      state.remoteOverview=data.overview||null;state.lastRemoteAt=nowIso();state.lastCommitError=null;
      if(data.revision)api.state.lastRevision=data.revision;
      window.dispatchEvent(new CustomEvent('bawsala:study-remote',{detail:{ok:true,data}}));
      return data;
    }catch(error){
      state.lastCommitError={code:error?.code||error?.message||'REMOTE_FAILED',at:nowIso(),requestId:error?.requestId||''};
      window.dispatchEvent(new CustomEvent('bawsala:study-remote',{detail:{ok:false,error:state.lastCommitError}}));
      return null;
    }
  }
  function commit(rawActions,{remote=true}={}){
    const actions=(Array.isArray(rawActions)?rawActions:[rawActions]).map(normalizeAction);
    const results=actions.map(applyLocal);state.lastCommitAt=nowIso();
    const current=overview();
    window.dispatchEvent(new CustomEvent('bawsala:study-change',{detail:{actions,overview:current}}));
    const remotePromise=remote?sendRemote(actions):Promise.resolve(null);
    return {actions,results,overview:current,remote:remotePromise};
  }
  function saveMission(payload){const result=commit({type:'mission.save',payload});return result.results[0];}
  function saveSourceBudget(payload){const result=commit({type:'source-budget.save',payload});return result.results[0];}
  function saveSession(payload){const result=commit({type:'session.complete',payload});return result.results[0];}
  function saveError(payload){const result=commit({type:'error.save',payload});return result.results[0];}
  function saveReview(payload,{closeContinuation=true}={}){const actions=[{type:'review.save',payload}];if(closeContinuation)actions.push({type:'continuation.clear',payload:{}});const result=commit(actions);return result.results[0];}
  function toggleHomework(idValue,done){const result=commit({type:'homework.toggle',payload:{id:cleanId(idValue),done}});return result.results[0];}
  function setContinuation(payload){const result=commit({type:'continuation.set',payload});return result.results[0];}
  function clearContinuation(){commit({type:'continuation.clear',payload:{}});}
  function beginContext(payload={}){
    const title=clean(payload.title||payload.mission,180);if(!title)return null;
    const target=clean(payload.target,40)||'focus';
    const continuation={id:id(),kind:clean(payload.kind,40)||'study',entityId:cleanId(payload.entityId||payload.id),title,subject:clean(payload.subject,80),target,sourcePage:clean(payload.sourcePage||location.pathname,160)};
    const missionText=clean(payload.mission||title,220);
    const actions=[{type:'continuation.set',payload:continuation},{type:'mission.save',payload:{id:id(),text:missionText,mission:missionText,subject:continuation.subject,minutes:clamp(payload.minutes,5,180,25),date:date(),originType:continuation.kind,originId:continuation.entityId,originLabel:title}}];
    const sources=(payload.sources||[]).map(item=>clean(item,120)).filter(Boolean).slice(0,3);
    if(sources.length)actions.push({type:'source-budget.save',payload:{date:date(),limit:Math.min(3,Math.max(1,sources.length)),sources,rule:clean(payload.rule,220)||'لا أفتح مصدراً جديداً قبل إنهاء الجلسة.'}});
    commit(actions);return continuation;
  }
  function relativeWorkspace(target='flow'){
    const safe=String(target||'flow').replace(/[^a-z0-9_-]/gi,'')||'flow';
    return location.pathname.includes('/pages/')?`workspace.html#${safe}`:`pages/workspace.html#${safe}`;
  }
  function continueHref(){
    const current=overview();const target=current.priority?.target||current.loop.nextAction?.key||'flow';
    if(target==='flashcards')return location.pathname.includes('/pages/')?'flashcards.html#review':'pages/flashcards.html#review';
    return relativeWorkspace(target);
  }
  async function refreshRemote(){
    const api=backend();if(!api?.state?.authenticated||api.state.user?.emailVerificationRequired||!navigator.onLine)return null;
    try{const params={date:date(),timezoneOffsetMinutes:String(new Date().getTimezoneOffset()),profileId:store()?.activeProfile?.()?.id||''};const data=api.studyOverview?await api.studyOverview(params):await api.request('/api/study/overview?'+new URLSearchParams(params).toString(),{dedupe:false});state.remoteOverview=data.overview||null;state.lastRemoteAt=nowIso();window.dispatchEvent(new CustomEvent('bawsala:study-overview',{detail:{overview:state.remoteOverview}}));return state.remoteOverview;}catch(_){return null;}
  }
  function bind(){
    window.addEventListener('bawsala:auth',()=>refreshRemote());
    window.addEventListener('online',()=>refreshRemote());
    window.addEventListener('mt:profile',()=>{state.remoteOverview=null;refreshRemote();});
    window.addEventListener('mt:storage',event=>{if(['dashboard:mission','study:continuation','study:sessions','errors','dailyReviews','homeworks','notebook:flashcards','study:calendar'].includes(event.detail?.name))window.dispatchEvent(new CustomEvent('bawsala:study-overview',{detail:{overview:overview()}}));});
    if(contextPages.has(page()))setTimeout(refreshRemote,300);
  }
  document.addEventListener('DOMContentLoaded',bind,{once:true});
  window.BAWSALA_STUDY={state,overview,commit,saveMission,saveSourceBudget,saveSession,saveError,saveReview,toggleHomework,setContinuation,clearContinuation,beginContext,continueHref,relativeWorkspace,refreshRemote};
})();
