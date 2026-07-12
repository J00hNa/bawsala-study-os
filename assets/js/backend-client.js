(function(){
  const CLIENT_VERSION='16.0.1';
  const sec = () => window.MT_SECURITY;
  const state = { clientVersion:CLIENT_VERSION, serverVersion:null, versionMismatch:false, checked:false, authenticated:false, user:null, online:navigator.onLine, syncing:false, pendingSync:false, pendingSince:null, pendingReason:null, syncGeneration:0, lastSyncedGeneration:0, lastSync:null, lastRevision:null, lastConflict:null, csrfToken:null, activeRequests:0, lastRequest:null, lastError:null };
  const inflightGets=new Map();
  const DEFAULT_TIMEOUT_MS=12000;
  const PENDING_SYNC_KEY='bawsala:cloud-sync:pending';
  const ERROR_MESSAGES={
    UNAUTHORIZED:'سجل الدخول للمتابعة.', FORBIDDEN:'لا تملك صلاحية تنفيذ هذا الإجراء.', EMAIL_VERIFICATION_REQUIRED:'أكد بريدك الإلكتروني أولاً.',
    RATE_LIMITED:'طلبات كثيرة خلال وقت قصير. انتظر قليلاً ثم أعد المحاولة.', BAD_CSRF:'انتهت جلسة الحماية. أعد المحاولة.',
    MAINTENANCE_MODE:'الخدمة تحت الصيانة مؤقتاً.', SERVER_ERROR:'حدث خطأ داخلي. استخدم رقم الطلب عند التواصل مع الدعم.',
    REQUEST_TIMEOUT:'استغرق الطلب وقتاً أطول من اللازم.', NETWORK_ERROR:'تعذر الاتصال بالخادم. تحقق من الشبكة.',
    BAD_RESPONSE:'وصل رد غير صالح من الخادم.', METHOD_NOT_ALLOWED:'هذا الإجراء غير مدعوم.', NOT_FOUND:'المسار المطلوب غير موجود.'
  };
  function readCookie(name){
    return document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1) || '';
  }
  function emitRequest(detail){
    window.dispatchEvent(new CustomEvent('bawsala:request',{detail:{active:state.activeRequests,...detail}}));
  }
  function makeRequestId(){
    try{return 'web_'+crypto.randomUUID().replaceAll('-','').slice(0,24);}catch(_){return 'web_'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);}
  }
  function idempotencyKey(){
    try{return crypto.randomUUID();}catch(_){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
  }
  function userMessage(code,status){
    if(ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
    if(status>=500) return ERROR_MESSAGES.SERVER_ERROR;
    return 'تعذر إكمال العملية. حاول مرة أخرى.';
  }
  function emitSync(extra={}){ window.dispatchEvent(new CustomEvent('bawsala:sync',{detail:{syncing:state.syncing,pendingSync:state.pendingSync,pendingSince:state.pendingSince,pendingReason:state.pendingReason,syncGeneration:state.syncGeneration,lastSyncedGeneration:state.lastSyncedGeneration,lastSync:state.lastSync,lastRevision:state.lastRevision,lastConflict:state.lastConflict,...extra}})); }
  function persistPendingSync(status='pending'){
    try{localStorage.setItem(PENDING_SYNC_KEY,JSON.stringify({at:state.pendingSince,reason:state.pendingReason,generation:state.syncGeneration,status,conflict:state.lastConflict||null}));}catch(_){}
  }
  function markPendingSync(reason='offline',status='pending'){
    state.pendingSync=true;
    state.pendingSince=state.pendingSince || new Date().toISOString();
    state.pendingReason=String(reason||'offline').slice(0,80);
    persistPendingSync(status);
    emitSync({queued:true,reason:state.pendingReason,status});
  }
  function clearPendingSync(){
    state.pendingSync=false; state.pendingSince=null; state.pendingReason=null;
    try{localStorage.removeItem(PENDING_SYNC_KEY);}catch(_){}
  }
  function restorePendingSync(){
    try{const saved=JSON.parse(localStorage.getItem(PENDING_SYNC_KEY)||'null');if(saved?.at){state.pendingSync=true;state.pendingSince=saved.at;state.pendingReason=saved.reason||'pending';state.syncGeneration=Math.max(state.syncGeneration,Number(saved.generation||0));state.lastConflict=saved.conflict||null;}}catch(_){}
  }
  function composeSignal(externalSignal, timeoutMs){
    const controller=new AbortController();
    let timedOut=false;
    const timer=setTimeout(()=>{timedOut=true; controller.abort(new DOMException('Request timeout','TimeoutError'));},timeoutMs);
    const relay=()=>controller.abort(externalSignal.reason || new DOMException('Aborted','AbortError'));
    if(externalSignal){
      if(externalSignal.aborted) relay();
      else externalSignal.addEventListener('abort',relay,{once:true});
    }
    return {signal:controller.signal,timedOut:()=>timedOut,cleanup:()=>{clearTimeout(timer); externalSignal?.removeEventListener?.('abort',relay);}};
  }
  async function ensureCsrf(){
    if(state.csrfToken) return state.csrfToken;
    const cookieToken = decodeURIComponent(readCookie('bawsala_csrf') || '');
    if(/^[a-zA-Z0-9_-]{32,128}$/.test(cookieToken)){ state.csrfToken=cookieToken; return cookieToken; }
    const response = await fetch('/api/auth/csrf', { credentials:'same-origin', headers:{'Accept':'application/json','X-Request-Id':makeRequestId()} });
    const data = await response.json().catch(()=>({}));
    state.csrfToken = data.csrfToken || decodeURIComponent(readCookie('bawsala_csrf') || '');
    if(!state.csrfToken) throw new Error('CSRF_UNAVAILABLE');
    return state.csrfToken;
  }
  async function executeRequest(path, options={}, retryState={csrf:false,attempt:0}){
    const method=String(options.method || 'GET').toUpperCase();
    const safeMethod=['GET','HEAD','OPTIONS'].includes(method);
    const timeoutMs=Math.max(1000,Math.min(60000,Number(options.timeoutMs||DEFAULT_TIMEOUT_MS)));
    const requestId=options.requestId || makeRequestId();
    const headers={'Accept':'application/json','X-Request-Id':requestId,...(options.headers||{})};
    const composed=composeSignal(options.signal,timeoutMs);
    const init={method,headers,credentials:'same-origin',signal:composed.signal};
    if(!safeMethod){
      headers['X-Bawsala-Request']='1';
      headers['X-Bawsala-CSRF']=await ensureCsrf();
      if(options.idempotent || /^\/api\/billing\/(checkout|change-plan|portal|cancel)$/.test(path)) headers['Idempotency-Key']=options.idempotencyKey || idempotencyKey();
    }
    if(options.body !== undefined){ headers['Content-Type']='application/json'; init.body=JSON.stringify(options.body); }
    state.activeRequests+=1;
    state.lastRequest={path,method,requestId,startedAt:new Date().toISOString()};
    emitRequest({phase:'start',path,method,requestId});
    try{
      const response=await fetch(path,init);
      const serverVersion=String(response.headers.get('x-backend-version')||response.headers.get('x-app-version')||'');
      if(serverVersion){
        state.serverVersion=serverVersion;
        state.versionMismatch=serverVersion!==CLIENT_VERSION;
        if(state.versionMismatch) window.dispatchEvent(new CustomEvent('bawsala:version-mismatch',{detail:{clientVersion:CLIENT_VERSION,serverVersion}}));
      }
      const contentType=String(response.headers.get('content-type')||'');
      const data=contentType.includes('application/json') ? await response.json().catch(()=>({ok:false,error:'BAD_RESPONSE'})) : {ok:response.ok,error:response.ok?'':'BAD_RESPONSE'};
      if(data.csrfToken) state.csrfToken=data.csrfToken;
      if(response.status===403 && data.error==='BAD_CSRF' && !retryState.csrf){
        state.csrfToken=null;
        await ensureCsrf();
        return executeRequest(path,{...options,requestId}, {csrf:true,attempt:retryState.attempt});
      }
      if(response.status===401){
        state.authenticated=false; state.user=null;
        window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}}));
      }
      if(!response.ok || data.ok===false){
        const code=data.error || 'REQUEST_FAILED';
        const err=new Error(code);
        err.code=code; err.status=response.status; err.data=data; err.requestId=data.requestId || response.headers.get('x-request-id') || requestId;
        err.retryAfter=Number(response.headers.get('retry-after')||0); err.retryable=Boolean(data.retryable) || (safeMethod && (response.status===429 || response.status>=500));
        err.userMessage=sec().cleanText(data.message||'',300) || userMessage(code,response.status);
        if(err.retryable && retryState.attempt < Number(options.retries ?? 1)){
          const delay=Math.min(1800,250*Math.pow(2,retryState.attempt)+(Math.random()*120));
          await new Promise(resolve=>setTimeout(resolve,delay));
          return executeRequest(path,{...options,requestId}, {...retryState,attempt:retryState.attempt+1});
        }
        throw err;
      }
      state.online=true; state.lastError=null;
      state.lastRequest={...state.lastRequest,finishedAt:new Date().toISOString(),status:response.status};
      emitRequest({phase:'success',path,method,requestId,status:response.status});
      return data;
    }catch(rawErr){
      let err=rawErr;
      if(rawErr?.name==='AbortError' || rawErr?.name==='TimeoutError'){
        const code=composed.timedOut()?'REQUEST_TIMEOUT':'REQUEST_ABORTED';
        err=new Error(code); err.code=code; err.status=0; err.requestId=requestId; err.retryable=safeMethod; err.userMessage=userMessage(code,0);
      }else if(rawErr instanceof TypeError){
        err=new Error('NETWORK_ERROR'); err.code='NETWORK_ERROR'; err.status=0; err.requestId=requestId; err.retryable=safeMethod; err.userMessage=userMessage('NETWORK_ERROR',0);
      }
      if(err.code==='NETWORK_ERROR') state.online=false;
      state.lastError={code:err.code||err.message,status:err.status||0,requestId:err.requestId||requestId,at:new Date().toISOString()};
      emitRequest({phase:'error',path,method,requestId,error:state.lastError,userMessage:err.userMessage||userMessage(err.code||err.message,err.status||0)});
      throw err;
    }finally{
      composed.cleanup();
      state.activeRequests=Math.max(0,state.activeRequests-1);
      emitRequest({phase:'end',path,method,requestId});
    }
  }
  function request(path, options={}){
    const method=String(options.method||'GET').toUpperCase();
    const idempotent=options.idempotent || /^\/api\/billing\/(checkout|change-plan|portal|cancel)$/.test(path);
    const normalizedOptions=idempotent && !options.idempotencyKey ? {...options,idempotent:true,idempotencyKey:idempotencyKey()} : options;
    const shouldDedupe=method==='GET' && normalizedOptions.dedupe!==false;
    const key=method+' '+path;
    if(shouldDedupe && inflightGets.has(key)) return inflightGets.get(key);
    const promise=executeRequest(path,normalizedOptions).finally(()=>{if(inflightGets.get(key)===promise) inflightGets.delete(key);});
    if(shouldDedupe) inflightGets.set(key,promise);
    return promise;
  }
  async function health(){ try{ const data=await request('/api/health'); state.online=true; return data; }catch(err){ state.online=false; return null; } }
  async function me(){ try{ const data=await request('/api/auth/me'); state.checked=true; state.authenticated=!!data.authenticated; state.user=data.user||null; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return state.user; }catch(err){ state.checked=true; state.authenticated=false; state.user=null; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state,error:err.message}})); return null; } }
  async function signup(payload){ const clean={ name:sec().cleanText(payload.name,120), email:sec().cleanText(payload.email,240), phone:sec().cleanText(payload.phone,40), ageConfirmed:payload.ageConfirmed===true, password:String(payload.password||''), track:sec().cleanText(payload.track,40), specialization:sec().cleanText(payload.specialization,80), grade:sec().cleanText(payload.grade,40), goal:sec().clampNumber(payload.goal,0,100,85), language:payload.language==='en'?'en':'ar', theme:payload.theme==='light'?'light':'dark', privacyAccepted:payload.privacyAccepted===true }; const data=await request('/api/auth/signup',{method:'POST',body:clean}); state.authenticated=true; state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function login(email,password,mfaCode=''){ const data=await request('/api/auth/login',{method:'POST',body:{email:sec().cleanText(email,240),password:String(password||''),mfaCode:sec().cleanText(mfaCode,40)}}); state.authenticated=true; state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data.user; }
  async function requestPasswordReset(email){ return request('/api/auth/password-reset/request',{method:'POST',body:{email:sec().cleanText(email,240)}}); }
  async function confirmPasswordReset(token,newPassword){ const data=await request('/api/auth/password-reset/confirm',{method:'POST',body:{token:sec().cleanText(token,160),newPassword:String(newPassword||'')}}); return data; }
  async function logout(){ await request('/api/auth/logout',{method:'POST'}).catch(()=>null); state.authenticated=false; state.user=null; state.csrfToken=null; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); }
  async function emailVerificationStatus(){ const data=await request('/api/auth/verify-email/status'); state.user=data.user||state.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function requestEmailVerification(){ const data=await request('/api/auth/verify-email/request',{method:'POST'}); state.user=data.user||state.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function confirmEmailVerification(token){ const data=await request('/api/auth/verify-email/confirm',{method:'POST',body:{token:sec().cleanText(token,160)}}); state.user=data.user||state.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function googleConfig(){ return request('/api/auth/google/config'); }
  async function googleStart(){ return request('/api/auth/google/start'); }
  async function googlePending(){ return request('/api/auth/google/pending'); }
  async function completeGoogleSignup(payload){ const clean={ name:sec().cleanText(payload.name,120), phone:sec().cleanText(payload.phone,40), ageConfirmed:payload.ageConfirmed===true, track:sec().cleanText(payload.track,40), specialization:sec().cleanText(payload.specialization,80), grade:sec().cleanText(payload.grade,40), goal:sec().clampNumber(payload.goal,0,100,85), language:payload.language==='en'?'en':'ar', theme:payload.theme==='light'?'light':'dark', privacyAccepted:payload.privacyAccepted===true }; const data=await request('/api/auth/google/complete',{method:'POST',body:clean}); state.authenticated=true; state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data; }
  async function mfaStatus(){ return request('/api/account/mfa'); }
  async function startMfaSetup(){ return request('/api/account/mfa',{method:'POST'}); }
  async function confirmMfaSetup(code){ const data=await request('/api/account/mfa/confirm',{method:'POST',body:{code:sec().cleanText(code,20)}}); state.user=data.user||state.user; return data; }
  async function disableMfa(password,code){ const data=await request('/api/account/mfa',{method:'DELETE',body:{password:String(password||''),code:sec().cleanText(code,40)}}); state.user=data.user||state.user; return data; }
  async function legalConfig(){ return request('/api/legal/config'); }
  async function acceptLegalConsent(version){ const data=await request('/api/account/legal-consent',{method:'POST',body:{accepted:true,version}}); state.user=data.user; return data; }
  async function updateAccount(payload){ const data=await request('/api/account',{method:'PATCH',body:payload}); state.user=data.user; window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...state}})); return data.user; }
  async function changePassword(currentPassword,newPassword){ return request('/api/account/password',{method:'POST',body:{currentPassword,newPassword}}); }
  async function exportAccountData(){ return request('/api/account/export'); }
  async function deleteAccount(passwordOrOptions){ const payload=(passwordOrOptions && typeof passwordOrOptions==='object')?passwordOrOptions:{password:String(passwordOrOptions||'')}; return request('/api/account',{method:'DELETE',body:payload}); }
  async function getSessions(){ return request('/api/account/sessions'); }
  async function revokeSession(sessionId){ return request('/api/account/sessions/revoke',{method:'POST',body:{sessionId}}); }
  async function getSecurityLog(){ return request('/api/account/security-log'); }
  async function supportTickets(){ return request('/api/support/tickets'); }
  async function createSupportTicket(payload){ return request('/api/support/tickets',{method:'POST',body:{category:sec().cleanText(payload.category,40),priority:payload.priority==='high'?'high':'normal',title:sec().cleanText(payload.title,140),details:sec().cleanMultiline(payload.details,6000),consent:payload.consent===true}}); }
  async function updateSupportTicket(ticketId,payload){ return request(`/api/support/tickets/${encodeURIComponent(sec().cleanText(ticketId,90))}`,{method:'PATCH',body:{status:payload.status}}); }
  function localSnapshot(){ return window.MT_STORE?.snapshot?.() || {keys:{}}; }
  async function saveSnapshot(keys, mode='merge'){
    if(!state.authenticated) await me();
    if(!state.authenticated) throw new Error('NOT_AUTHENTICATED');
    if(!navigator.onLine){ markPendingSync('offline'); const err=new Error('SYNC_QUEUED_OFFLINE'); err.code='SYNC_QUEUED_OFFLINE'; err.queued=true; err.userMessage='تم حفظ التغييرات محلياً وستُرفع تلقائياً عند عودة الاتصال.'; throw err; }
    if(state.syncing){ markPendingSync('changed-during-sync'); const err=new Error('SYNC_ALREADY_RUNNING'); err.queued=true; throw err; }
    const generationAtStart=state.syncGeneration;
    state.syncing=true; emitSync({syncing:true,generation:generationAtStart});
    try{
      if(!state.lastRevision) await getSnapshot();
      const payload={keys: keys || localSnapshot().keys || {}, mode, baseRevision:state.lastRevision,clientGeneration:generationAtStart};
      const data=await request('/api/sync/snapshot',{method:'PUT',body:payload,headers:{'If-Match':`"${state.lastRevision}"`}});
      state.lastSync=data.snapshot?.updatedAt || new Date().toISOString();
      state.lastRevision=data.snapshot?.revision || state.lastRevision;
      state.lastSyncedGeneration=Math.max(state.lastSyncedGeneration,generationAtStart);
      state.lastConflict=null;
      if(state.syncGeneration<=generationAtStart) clearPendingSync(); else markPendingSync('changed-during-sync');
      return data.snapshot;
    }catch(err){
      if(err?.status===409 || err?.code==='SYNC_CONFLICT'){
        state.lastConflict={at:new Date().toISOString(),previousRevision:state.lastRevision||'',revision:err?.data?.currentRevision||'',localGeneration:state.syncGeneration,status:'blocked'};
        markPendingSync('conflict','blocked-conflict');
        err.userMessage='توجد نسخة أحدث على جهاز آخر. راجع النسختين واختر الدمج أو الاستبدال قبل الحفظ.';
        emitSync({conflict:true,status:'blocked-conflict'});
      }
      if(['NETWORK_ERROR','REQUEST_TIMEOUT','SERVER_OVERLOADED'].includes(err?.code) || Number(err?.status||0)>=500){ markPendingSync(err?.code||'retryable'); err.queued=true; }
      throw err;
    }finally{
      state.syncing=false; emitSync();
      if(state.authenticated && navigator.onLine && state.pendingSync && !state.lastConflict) setTimeout(()=>flushPendingSync(),250);
    }
  }
  async function getSnapshot(){ if(!state.authenticated) await me(); if(!state.authenticated) throw new Error('NOT_AUTHENTICATED'); const data=await request('/api/sync/snapshot'); state.lastSync=data.snapshot?.updatedAt || state.lastSync; state.lastRevision=data.snapshot?.revision || state.lastRevision; return data.snapshot || {keys:{}}; }
  function valueTime(item){ const raw=item?.deletedAt||item?.updatedAt||item?.reviewedAt||item?.finishedAt||item?.createdAt||item?.date||item?.dueAt; const value=raw?Date.parse(raw):NaN; return Number.isFinite(value)?value:0; }
  function mergeById(localValue, remoteValue){
    if(Array.isArray(localValue) && Array.isArray(remoteValue)){
      const map=new Map();
      localValue.forEach((item,i)=>{ if(item && typeof item==='object' && item.id) map.set(String(item.id),item); else map.set('_local_'+i,item); });
      remoteValue.forEach((item,i)=>{
        if(item && typeof item==='object' && item.id){
          const old=map.get(String(item.id));
          map.set(String(item.id), !old || valueTime(item) >= valueTime(old) ? item : old);
        } else map.set('_remote_'+i,item);
      });
      return Array.from(map.values()).slice(0,1000);
    }
    if(localValue && remoteValue && typeof localValue==='object' && typeof remoteValue==='object' && !Array.isArray(localValue) && !Array.isArray(remoteValue)){
      const localTime=valueTime(localValue), remoteTime=valueTime(remoteValue);
      if(localTime || remoteTime) return remoteTime >= localTime ? {...localValue,...remoteValue} : {...remoteValue,...localValue};
      return {...localValue,...remoteValue};
    }
    return remoteValue;
  }
  function snapshotSummary(snapshot){
    const keys=snapshot?.keys&&typeof snapshot.keys==='object'?snapshot.keys:{};
    let records=0;
    const groups=[];
    Object.entries(keys).forEach(([key,value])=>{const count=Array.isArray(value)?value.length:(value&&typeof value==='object'?1:0);records+=count;groups.push({key,count});});
    return {updatedAt:snapshot?.updatedAt||snapshot?.exportedAt||null,revision:snapshot?.revision||null,keyCount:Object.keys(keys).length,recordCount:records,groups:groups.sort((a,b)=>b.count-a.count).slice(0,12)};
  }
  function restoreSnapshot(snapshot, mode='merge'){
    if(!window.MT_STORE?.restoreSnapshot) throw new Error('LOCAL_RESTORE_UNAVAILABLE');
    const result=window.MT_STORE.restoreSnapshot({version:snapshot?.version||'v13',schemaVersion:snapshot?.schemaVersion||13,keys:snapshot?.keys||{}},mode,{label:'before-cloud-pull',merge:mergeById});
    return result.count;
  }
  async function previewSnapshot(){ const [remote,local]=await Promise.all([getSnapshot(),Promise.resolve(localSnapshot())]); return {remote:snapshotSummary(remote),local:snapshotSummary(local),remoteSnapshot:remote}; }
  async function pullSnapshot(mode='merge'){ const snap=await getSnapshot(); const count=restoreSnapshot(snap, mode); state.lastSync=snap.updatedAt || new Date().toISOString(); state.lastRevision=snap.revision || state.lastRevision; state.lastConflict=null; clearPendingSync(); window.dispatchEvent(new CustomEvent('bawsala:sync',{detail:{syncing:false,lastSync:state.lastSync,lastRevision:state.lastRevision,mode}})); return {snapshot:snap,count,summary:snapshotSummary(snap)}; }
  let syncTimer=null;
  function scheduleSync(){
    state.syncGeneration+=1;
    if(!state.authenticated) return;
    markPendingSync(state.syncing?'changed-during-sync':'local-change');
    if(state.syncing || state.lastConflict) return;
    clearTimeout(syncTimer);
    if(!navigator.onLine) return;
    syncTimer=setTimeout(()=>saveSnapshot().catch(()=>{}),1200);
  }
  async function flushPendingSync(){ if(!state.pendingSync || state.syncing || state.lastConflict || !navigator.onLine || !state.authenticated) return false; try{await saveSnapshot();return true;}catch(_){return false;} }
  function queryString(params={}){ const q=new URLSearchParams(); Object.entries(params||{}).forEach(([key,value])=>{if(value!==undefined&&value!==null&&value!=='')q.set(key,String(value));}); return q.toString()?'?'+q.toString():''; }
  async function adminOverview(){ return request('/api/admin/overview'); }
  async function adminMetrics(){ return request('/api/admin/metrics',{dedupe:false}); }
  async function adminSettings(){ return request('/api/admin/settings'); }
  async function updateAdminSettings(payload){ return request('/api/admin/settings',{method:'PATCH',body:payload}); }
  async function adminUsers(params={}){ return request('/api/admin/users'+queryString(params),{dedupe:false}); }
  async function updateAdminUser(id,payload){ return request('/api/admin/users/'+encodeURIComponent(id),{method:'PATCH',body:payload}); }
  async function adminProblems(params={}){ return request('/api/admin/problems'+queryString(params),{dedupe:false}); }
  async function updateAdminProblem(ownerId,problemId,payload){ return request('/api/admin/problems/'+encodeURIComponent(ownerId)+'/'+encodeURIComponent(problemId),{method:'PATCH',body:payload}); }
  async function studyOverview(params={}){ return request('/api/study/overview'+queryString(params),{dedupe:false}); }
  async function studyTransaction(actions,options={}){
    if(!state.lastRevision) await getSnapshot();
    const baseRevision=options.baseRevision||state.lastRevision||'';
    const payload={date:options.date,timezoneOffsetMinutes:options.timezoneOffsetMinutes,profileId:options.profileId,baseRevision,actions};
    const data=await request('/api/study/transactions',{method:'POST',body:payload,headers:{'If-Match':`"${baseRevision}"`},idempotent:true,retries:1,idempotencyKey:options.idempotencyKey});
    if(data.revision)state.lastRevision=data.revision;
    state.lastConflict=null;
    return data;
  }
  async function calendarEvents(params={}){ const q=new URLSearchParams(); Object.entries(params||{}).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') q.set(k,v); }); return request('/api/calendar/events'+(q.toString()?'?'+q.toString():'')); }
  async function calendarEvent(id){ return request('/api/calendar/events/'+encodeURIComponent(id)); }
  async function dispatchCalendarReminders(payload={}){ return request('/api/calendar/reminders/dispatch',{method:'POST',body:payload}); }
  async function googleCalendarStatus(){ return request('/api/integrations/google-calendar/status'); }
  async function googleCalendarConnect(){ return request('/api/integrations/google-calendar/connect'); }
  async function googleCalendarSync(direction='two-way'){ return request('/api/integrations/google-calendar/sync',{method:'POST',body:{direction}}); }
  async function googleCalendarDisconnect(){ return request('/api/integrations/google-calendar',{method:'DELETE'}); }
  async function createCalendarEvent(payload){ return request('/api/calendar/events',{method:'POST',body:payload}); }
  async function updateCalendarEvent(id,payload){ return request('/api/calendar/events/'+encodeURIComponent(id),{method:'PATCH',body:payload}); }
  async function deleteCalendarEvent(id){ return request('/api/calendar/events/'+encodeURIComponent(id),{method:'DELETE'}); }
  async function adminBackup(){ return request('/api/admin/backup'); }
  document.addEventListener('DOMContentLoaded',()=>{ restorePendingSync(); health().then(()=>me()).then(()=>flushPendingSync()); window.addEventListener('mt:storage', scheduleSync); window.addEventListener('mt:profile', scheduleSync); window.addEventListener('online',()=>{state.online=true;flushPendingSync();}); window.addEventListener('offline',()=>{state.online=false;if(state.authenticated)markPendingSync('offline');}); });
  window.BAWSALA_BACKEND={state,request,ensureCsrf,health,me,signup,login,requestPasswordReset,confirmPasswordReset,logout,emailVerificationStatus,requestEmailVerification,confirmEmailVerification,googleConfig,googleStart,googlePending,completeGoogleSignup,mfaStatus,startMfaSetup,confirmMfaSetup,disableMfa,legalConfig,acceptLegalConsent,updateAccount,changePassword,exportAccountData,deleteAccount,getSessions,revokeSession,getSecurityLog,supportTickets,createSupportTicket,updateSupportTicket,saveSnapshot,getSnapshot,previewSnapshot,restoreSnapshot,pullSnapshot,scheduleSync,adminOverview,adminMetrics,adminSettings,updateAdminSettings,adminUsers,updateAdminUser,adminProblems,updateAdminProblem,studyOverview,studyTransaction,calendarEvents,calendarEvent,createCalendarEvent,updateCalendarEvent,deleteCalendarEvent,dispatchCalendarReminders,googleCalendarStatus,googleCalendarConnect,googleCalendarSync,googleCalendarDisconnect,adminBackup,flushPendingSync};
})();
