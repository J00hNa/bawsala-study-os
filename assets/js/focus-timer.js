(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.MT_FOCUS_TIMER=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION=1;
  const clamp=(value,min,max,fallback=min)=>{const n=Number(value);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
  const safeText=(value,max=300)=>String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
  const epoch=value=>{const n=Number(value);return Number.isFinite(n)&&n>0?n:0;};
  const iso=ms=>new Date(ms).toISOString();
  function missionSignature(text='',sources=[]){
    const raw=[safeText(text,240),...sources.map(item=>safeText(item,120))].join('|').toLowerCase();
    let hash=2166136261;
    for(let i=0;i<raw.length;i++){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return `m_${(hash>>>0).toString(16)}`;
  }
  function create(options={}){
    const now=epoch(options.now)||Date.now();
    const durationSeconds=Math.round(clamp(options.durationMinutes,5,180,25)*60);
    return {
      version:VERSION,
      day:safeText(options.day,10),
      durationSeconds,
      accumulatedSeconds:0,
      runningStartedAt:0,
      sessionStartedAt:'',
      completedAt:'',
      distractions:clamp(options.distractions,0,999,0),
      note:safeText(options.note,240),
      blocker:safeText(options.blocker,300),
      focusScore:Math.round(clamp(options.focusScore,1,5,3)),
      missionSignature:safeText(options.missionSignature,80),
      missionText:safeText(options.missionText,240),
      sources:Array.isArray(options.sources)?options.sources.map(item=>safeText(item,120)).filter(Boolean).slice(0,3):[],
      createdAt:iso(now),
      updatedAt:iso(now)
    };
  }
  function restore(raw,options={}){
    if(!raw||typeof raw!=='object'||Number(raw.version)!==VERSION)return null;
    if(options.day&&String(raw.day||'')!==String(options.day))return null;
    const now=epoch(options.now)||Date.now();
    const state=create({
      now,
      day:raw.day,
      durationMinutes:clamp(raw.durationSeconds,300,10800,1500)/60,
      distractions:raw.distractions,
      note:raw.note,
      blocker:raw.blocker,
      focusScore:raw.focusScore,
      missionSignature:raw.missionSignature,
      missionText:raw.missionText,
      sources:raw.sources
    });
    state.accumulatedSeconds=Math.round(clamp(raw.accumulatedSeconds,0,state.durationSeconds,state.durationSeconds));
    state.runningStartedAt=epoch(raw.runningStartedAt);
    state.sessionStartedAt=safeText(raw.sessionStartedAt,40);
    state.completedAt=safeText(raw.completedAt,40);
    state.createdAt=safeText(raw.createdAt,40)||state.createdAt;
    state.updatedAt=safeText(raw.updatedAt,40)||state.updatedAt;
    if(state.runningStartedAt>now+60000)state.runningStartedAt=0;
    return settle(state,now);
  }
  function elapsed(state,now=Date.now()){
    if(!state)return 0;
    const base=clamp(state.accumulatedSeconds,0,state.durationSeconds,0);
    const live=state.runningStartedAt?Math.max(0,Math.floor((epoch(now)-epoch(state.runningStartedAt))/1000)):0;
    return Math.min(state.durationSeconds,base+live);
  }
  function remaining(state,now=Date.now()){return Math.max(0,(state?.durationSeconds||0)-elapsed(state,now));}
  function progress(state,now=Date.now()){return state?.durationSeconds?Math.round(elapsed(state,now)/state.durationSeconds*100):0;}
  function isRunning(state){return Boolean(state?.runningStartedAt);}
  function isComplete(state,now=Date.now()){return Boolean(state)&&elapsed(state,now)>=state.durationSeconds;}
  function settle(state,now=Date.now()){
    if(!state||!isComplete(state,now)||!state.runningStartedAt)return state;
    return {...state,accumulatedSeconds:state.durationSeconds,runningStartedAt:0,completedAt:state.completedAt||iso(now),updatedAt:iso(now)};
  }
  function start(state,now=Date.now()){
    if(!state||isRunning(state)||isComplete(state,now))return state;
    return {...state,runningStartedAt:epoch(now),sessionStartedAt:state.sessionStartedAt||iso(now),updatedAt:iso(now)};
  }
  function pause(state,now=Date.now()){
    if(!state)return state;
    const spent=elapsed(state,now);
    return {...state,accumulatedSeconds:spent,runningStartedAt:0,completedAt:spent>=state.durationSeconds?(state.completedAt||iso(now)):'',updatedAt:iso(now)};
  }
  function reset(state,options={}){
    return create({
      now:options.now,
      day:options.day??state?.day,
      durationMinutes:options.durationMinutes??((state?.durationSeconds||1500)/60),
      note:options.note??state?.note,
      focusScore:options.focusScore??state?.focusScore,
      missionSignature:options.missionSignature??state?.missionSignature,
      missionText:options.missionText??state?.missionText,
      sources:options.sources??state?.sources
    });
  }
  function setDuration(state,minutes,now=Date.now()){
    if(!state||isRunning(state))return state;
    const nextSeconds=Math.round(clamp(minutes,5,180,25)*60);
    return {...state,durationSeconds:nextSeconds,accumulatedSeconds:Math.min(state.accumulatedSeconds,nextSeconds),completedAt:'',updatedAt:iso(now)};
  }
  function patch(state,values={},now=Date.now()){
    if(!state)return state;
    return {...state,
      note:values.note===undefined?state.note:safeText(values.note,240),
      blocker:values.blocker===undefined?state.blocker:safeText(values.blocker,300),
      focusScore:values.focusScore===undefined?state.focusScore:Math.round(clamp(values.focusScore,1,5,3)),
      distractions:values.distractions===undefined?state.distractions:Math.round(clamp(values.distractions,0,999,0)),
      updatedAt:iso(now)
    };
  }
  function addDistraction(state,now=Date.now()){return patch(state,{distractions:(state?.distractions||0)+1},now);}
  function view(state,now=Date.now()){
    const settled=settle(state,now);
    return {state:settled,elapsedSeconds:elapsed(settled,now),remainingSeconds:remaining(settled,now),progress:progress(settled,now),running:isRunning(settled),complete:isComplete(settled,now)};
  }
  return {VERSION,missionSignature,create,restore,elapsed,remaining,progress,isRunning,isComplete,settle,start,pause,reset,setDuration,patch,addDistraction,view};
});
