(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MT_STUDY_LOOP=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const clamp=(value,min,max,fallback=min)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  const dateOnly=value=>String(value||'').slice(0,10);
  const localDateOf=value=>{
    const raw=String(value||'').trim();
    if(!raw)return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return dateOnly(raw);
    const year=date.getFullYear();const month=String(date.getMonth()+1).padStart(2,'0');const day=String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  };
  const missionText=mission=>String(mission?.text||mission?.mission||'').trim();
  const missionForDate=(mission,date)=>{
    if(!mission||!missionText(mission))return null;
    const missionDate=String(mission.date||'').slice(0,10)||localDateOf(mission.updatedAt||mission.createdAt);
    return missionDate===date?{...mission,date:missionDate}:null;
  };
  const sourceLimit=(budget={},guard={})=>clamp(budget?.limit||guard?.sourceLimit,1,3,2);
  const selectedSources=(budget={},guard={},date='')=>{
    if(date&&budget?.date&&String(budget.date).slice(0,10)!==date)return [];
    return Array.isArray(budget?.sources)?budget.sources.map(item=>String(item||'').trim()).filter(Boolean).slice(0,sourceLimit(budget,guard)):[];
  };
  const validSessions=(sessions=[],date='')=>sessions.filter(item=>localDateOf(item?.finishedAt||item?.createdAt)===date&&clamp(item?.minutes,0,600,0)>=5);
  const todayMinutes=sessions=>sessions.reduce((sum,item)=>sum+clamp(item?.minutes,0,600,0),0);
  const actionableErrors=(errors=[],date='')=>errors.filter(item=>String(item?.error||item?.message||'').trim()&&String(item?.fix||'').trim()&&(!date||localDateOf(item?.updatedAt||item?.createdAt)===date));
  const reviewsForDate=(reviews=[],date='')=>reviews.filter(item=>localDateOf(item?.date||item?.createdAt)===date);
  function evaluate(input={}){
    const date=String(input.date||'').slice(0,10);
    const missionObject=missionForDate(input.mission,date);
    const mission=missionText(missionObject);
    const sources=selectedSources(input.sourceBudget,input.executionGuard,date);
    const sessions=validSessions(input.sessions,date);
    const errors=actionableErrors(input.errors,date);
    const reviews=reviewsForDate(input.reviews,date);
    const steps=[
      {key:'mission',done:Boolean(mission)&&sources.length>0,label:'مهمة ومصادر'},
      {key:'focus',done:sessions.length>0,label:'جلسة تركيز'},
      {key:'errors',done:errors.length>0,label:'خطأ قابل للمراجعة'},
      {key:'review',done:reviews.length>0,label:'إغلاق اليوم'}
    ];
    const done=steps.filter(step=>step.done).length;
    return {date,missionObject,mission,sources,sessions,errors,reviews,steps,done,total:steps.length,percent:Math.round(done/steps.length*100),minutes:todayMinutes(sessions),staleMission:Boolean(input.mission&&!missionObject)};
  }
  function nextAction(status){
    const state=status?.steps?status:evaluate(status||{});
    if(!state.mission)return {key:'mission',label:'اكتب مهمة اليوم أولاً',hint:state.staleMission?'المهمة القديمة لا تُحسب لليوم.':'بدون مهمة واضحة ستتنقل بين الأدوات وتضيع.'};
    if(!state.sources.length)return {key:'mission',label:'حدد مصدرين فقط',hint:'بدون سقف مصادر ستجمع روابط بدل أن تدرس.'};
    if(!state.sessions.length)return {key:'focus',label:'ابدأ جلسة تركيز',hint:'لا تفتح مصادر جديدة قبل جلسة واحدة على الأقل.'};
    if(!state.errors.length)return {key:'errors',label:'سجّل خطأ اليوم مع طريقة منعه',hint:'خطأ قديم لا يغلق خطوة اليوم.'};
    if(!state.reviews.length)return {key:'review',label:'اكتب تقرير اليوم',hint:'اختم اليوم بقرار واضح للغد.'};
    return {key:'flow',label:'حلقة اليوم مكتملة',hint:'لا تضف أدوات. راجع أو توقف بذكاء.'};
  }
  function fromStore(store,date){
    if(!store||typeof store.get!=='function')return evaluate({date});
    return evaluate({
      date,
      mission:store.get('dashboard:mission',null),
      sourceBudget:store.get('study:sourceBudget',null),
      executionGuard:store.get('dashboard:executionGuard',null),
      sessions:store.get('study:sessions',[]),
      errors:store.get('errors',[]),
      reviews:store.get('dailyReviews',[])
    });
  }
  return {clamp,dateOnly,localDateOf,missionText,missionForDate,sourceLimit,selectedSources,validSessions,todayMinutes,actionableErrors,reviewsForDate,evaluate,nextAction,fromStore};
});
