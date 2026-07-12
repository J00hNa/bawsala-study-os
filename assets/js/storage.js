(function(){
  const sec = () => window.MT_SECURITY;
  const PREFIX = 'bawsala.v12.';
  const SNAPSHOT_VERSION = 'v13';
  const SUPPORTED_SNAPSHOT_VERSIONS = new Set(['v12','v13']);
  const LEGACY_PREFIXES = ['bawsala.v11.','bawsala.v10.','siraaj.v10.','masar.v9.','masar.v8.','masar.v7.'];
  const PROFILE_SCOPED = new Set(['advisor:last','advisor:quickPrompt','homeworks','rounds','problems','errors','compare','academic:rows','study:sessions','study:sourceBudget','study:continuation','dashboard:mission','dashboard:executionGuard','dashboard:weeklyPlan','dashboard:notes','dashboard:dailyReport','dailyReviews','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks','mindmaps','student:goals','student:habits']);
  const TOMBSTONE_COLLECTIONS = new Set(['homeworks','rounds','groups','problems','errors','academic:rows','study:sessions','study:calendar','dailyReviews','notebook:notes','notebook:diary','notebook:flashcards','notebook:bookmarks','mindmaps','student:goals','student:habits','profiles']);
  const TOMBSTONE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
  const memory = new Map();
  let persistent = true;
  let persistenceFailure = null;
  function announcePersistenceFailure(operation, err){
    persistent=false;
    persistenceFailure={operation:String(operation||'storage').slice(0,80),message:String(err?.message||err||'STORAGE_UNAVAILABLE').slice(0,240),at:new Date().toISOString()};
    sec()?.recordSecurityEvent('storage-persistence-failed', `${persistenceFailure.operation}: ${persistenceFailure.message}`);
    window.dispatchEvent(new CustomEvent('mt:storage:persistence',{detail:{persistent:false,...persistenceFailure}}));
  }
  function rawGet(k){
    if(!persistent) return memory.has(k)?memory.get(k):null;
    try{return localStorage.getItem(k);}catch(err){announcePersistenceFailure('read',err); return memory.has(k)?memory.get(k):null;}
  }
  function rawSet(k,value,{strict=false}={}){
    let raw;
    try{raw=JSON.stringify(value);}catch(err){if(strict)throw err; sec()?.recordSecurityEvent('storage-serialize-failed',String(err?.message||err)); return false;}
    memory.set(k,raw);
    if(!persistent){ if(strict) throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false; }
    try{localStorage.setItem(k,raw); return true;}catch(err){announcePersistenceFailure('write',err); if(strict)throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false;}
  }
  function rawRemove(k,{strict=false}={}){
    memory.delete(k);
    if(!persistent){ if(strict)throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false; }
    try{localStorage.removeItem(k); return true;}catch(err){announcePersistenceFailure('remove',err); if(strict)throw new Error('PERSISTENT_STORAGE_UNAVAILABLE'); return false;}
  }
  function parse(raw, fallback){ try{return raw===null||raw===undefined?fallback:JSON.parse(raw);}catch(err){sec()?.recordSecurityEvent('storage-parse-failed', String(err?.message||err)); return fallback;} }
  function baseKey(name){ return PREFIX + name; }
  function activeProfileId(){
    const raw = rawGet(baseKey('activeProfileId'));
    const id = sec().sanitizeForKey('activeProfileId', parse(raw, 'guest'), 'guest');
    return id || 'guest';
  }
  function scopedKey(profileId, name){ return PREFIX + 'profile.' + sec().cleanId(profileId || activeProfileId()) + '.' + name; }
  function key(name){ return PROFILE_SCOPED.has(name) ? scopedKey(activeProfileId(), name) : baseKey(name); }
  function legacyKey(prefix, name){ return prefix + name; }
  function isTombstone(item){ return !!(item && typeof item === 'object' && item._deleted === true && item.deletedAt); }
  function tombstoneExpired(item){ const t=item?.deletedAt?Date.parse(item.deletedAt):NaN; return Number.isFinite(t) && t > 0 && Date.now() - t > TOMBSTONE_RETENTION_MS; }
  function hideTombstones(name, value){ return TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name)) && Array.isArray(value) ? value.filter(item=>!isTombstone(item)) : value; }
  function pruneExpiredTombstones(name, value){ return TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name)) && Array.isArray(value) ? value.filter(item=>!isTombstone(item) || !tombstoneExpired(item)) : value; }
  function readStored(name, fallback){
    const current = rawGet(key(name));
    if(current !== null) return pruneExpiredTombstones(name, sec().sanitizeForKey(sec().syncBaseKey(name), parse(current, fallback), fallback));
    for(const prefix of LEGACY_PREFIXES){
      const legacy = rawGet(legacyKey(prefix, name));
      if(legacy !== null){
        const migrated = pruneExpiredTombstones(name, sec().sanitizeForKey(sec().syncBaseKey(name), parse(legacy, fallback), fallback));
        rawSet(key(name), migrated);
        return migrated;
      }
    }
    return fallback;
  }
  function mergeHiddenTombstones(name, clean, existingValue=null){
    if(!TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name)) || !Array.isArray(clean)) return clean;
    const existing = existingValue ?? readStored(name, []);
    const visibleIds = new Set(clean.filter(item=>item && typeof item==='object').map(item=>String(item.id||'')));
    const hidden = (Array.isArray(existing)?existing:[]).filter(item=>isTombstone(item) && !tombstoneExpired(item) && !visibleIds.has(String(item.id||'')));
    return [...clean, ...hidden].slice(0, 1000);
  }
  function get(name, fallback){
    try{ return hideTombstones(name, readStored(name, fallback)); }
    catch(err){ sec()?.recordSecurityEvent('storage-read-failed', name); return fallback; }
  }
  function set(name, value){
    const base=sec().syncBaseKey(name);
    if(!sec().ALLOWED_KEYS.has(base)){ sec().recordSecurityEvent('storage-unknown-key', base); return value; }
    const clean = sec().sanitizeForKey(base, value, null);
    const stored = mergeHiddenTombstones(name, clean);
    rawSet(key(name), stored);
    const visible = hideTombstones(name, stored);
    window.dispatchEvent(new CustomEvent('mt:storage',{detail:{name,value:visible}}));
    return visible;
  }
  function remove(name){ const base=sec().syncBaseKey(name); if(!sec().ALLOWED_KEYS.has(base)){ sec().recordSecurityEvent('storage-remove-unknown-key', base); return; } rawRemove(key(name)); window.dispatchEvent(new CustomEvent('mt:storage',{detail:{name,value:null}})); }
  function getForProfile(profileId, name, fallback){
    const raw = rawGet(scopedKey(profileId, name));
    if(raw !== null){ const clean=pruneExpiredTombstones(name, sec().sanitizeForKey(sec().syncBaseKey(name), parse(raw, fallback), fallback)); return hideTombstones(name, clean); }
    return fallback;
  }
  function setForProfile(profileId, name, value){ const base=sec().syncBaseKey(name); if(!sec().ALLOWED_KEYS.has(base)){ sec().recordSecurityEvent('storage-profile-unknown-key', base); return value; } const clean=sec().sanitizeForKey(base,value,null); const raw = rawGet(scopedKey(profileId,name)); const existing = raw !== null ? pruneExpiredTombstones(name, sec().sanitizeForKey(base, parse(raw, []), [])) : []; const stored=mergeHiddenTombstones(name,clean,existing); rawSet(scopedKey(profileId,name), stored); return hideTombstones(name, stored); }
  function cryptoId(){ if(window.crypto && crypto.randomUUID) return 'sr_' + crypto.randomUUID().replaceAll('-',''); return 'sr_' + Math.random().toString(16).slice(2) + Date.now().toString(16); }
  function addToCollection(name, item){ const arr=get(name,[]); const entry={...item,id:item?.id||cryptoId(),createdAt:item?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}; const next=set(name,[entry,...arr]); return next[0]; }
  function updateCollection(name,id,updater){ const safeId=sec().cleanId(id); const next=get(name,[]).map(item=>item.id===safeId?{...updater(item),updatedAt:new Date().toISOString()}:item); return set(name,next); }
  function deleteFromCollection(name,id){
    const safeId=sec().cleanId(id);
    if(!TOMBSTONE_COLLECTIONS.has(sec().syncBaseKey(name))) return set(name,get(name,[]).filter(item=>item.id!==safeId));
    const now=new Date().toISOString();
    const raw=readStored(name,[]);
    let found=false;
    const next=(Array.isArray(raw)?raw:[]).map(item=>{
      if(item && String(item.id)===safeId){ found=true; return {...item,_deleted:true,deletedAt:now,updatedAt:now}; }
      return item;
    });
    if(!found) return hideTombstones(name, next);
    const clean=sec().sanitizeForKey(sec().syncBaseKey(name), next, next);
    rawSet(key(name), pruneExpiredTombstones(name, clean));
    const visible=hideTombstones(name, clean);
    window.dispatchEvent(new CustomEvent('mt:storage',{detail:{name,value:visible,deletedId:safeId}}));
    return visible;
  }
  function getProfiles(){
    let profiles = get('profiles', []);
    if(!profiles.length){ profiles = set('profiles', [{id:'guest',name:'طالب رئيسي',track:'غير محدد',grade:'التوجيهي',goal:85,weakSubject:'',dailyHours:2,avatar:'◆',status:'نشط',createdAt:new Date().toISOString()}]); rawSet(baseKey('activeProfileId'),'guest'); }
    const active=activeProfileId();
    if(!profiles.some(p=>p.id===active)) rawSet(baseKey('activeProfileId'), profiles[0].id);
    return profiles;
  }
  function activeProfile(){ const profiles=getProfiles(); return profiles.find(p=>p.id===activeProfileId()) || profiles[0]; }
  function setActiveProfile(id){ const safe=sec().cleanId(id); const profiles=getProfiles(); if(profiles.some(p=>p.id===safe)){ rawSet(baseKey('activeProfileId'), safe); window.dispatchEvent(new CustomEvent('mt:profile',{detail:{id:safe}})); return safe; } return activeProfileId(); }
  function saveProfile(profile){ const profiles=getProfiles(); const clean=sec().sanitizeForKey('profiles',[profile],[])[0]; const exists=profiles.some(p=>p.id===clean.id); const next=exists?profiles.map(p=>p.id===clean.id?{...p,...clean,updatedAt:new Date().toISOString()}:p):[{...clean,updatedAt:new Date().toISOString()},...profiles]; set('profiles', next); if(!exists) setActiveProfile(clean.id); return clean; }
  function deleteProfile(id){ const safe=sec().cleanId(id); const profiles=getProfiles(); if(profiles.length <= 1) return; deleteFromCollection('profiles', safe); if(activeProfileId()===safe){ const next=getProfiles()[0]; if(next) setActiveProfile(next.id); } }
  function listProfileScoped(name){ return getProfiles().map(profile=>({profile, items:getForProfile(profile.id,name,[])})); }
  function snapshot(){
    const out={version:SNAPSHOT_VERSION,schemaVersion:13,app:'Bawsala Study OS',exportedAt:new Date().toISOString(),profileId:activeProfileId(),keys:{}};
    const includeKey = k => k.startsWith(PREFIX) && k !== baseKey('backup:restorePoints') && sec().isSyncKeyAllowed(k.slice(PREFIX.length));
    try{ Object.keys(localStorage).filter(includeKey).forEach(k=>{ const short=k.slice(PREFIX.length); const base=sec().syncBaseKey(short); out.keys[short] = pruneExpiredTombstones(base, sec().sanitizeForKey(base, parse(localStorage.getItem(k), null), null)); }); }
    catch(_){ for(const [k,v] of memory.entries()) if(includeKey(k)){ const short=k.slice(PREFIX.length); const base=sec().syncBaseKey(short); out.keys[short] = pruneExpiredTombstones(base, sec().sanitizeForKey(base, parse(v,null), null)); } }
    return out;
  }
  function validateSnapshot(data){
    if(!data || typeof data!=='object' || Array.isArray(data) || !data.keys || typeof data.keys!=='object' || Array.isArray(data.keys)) throw new Error('INVALID_BACKUP');
    const version=String(data.version || (Number(data.schemaVersion)===13?'v13':'')).toLowerCase();
    if(!SUPPORTED_SNAPSHOT_VERSIONS.has(version)) throw new Error('UNSUPPORTED_BACKUP_VERSION');
    const staged=new Map();
    let totalBytes=0;
    for(const [shortKey,value] of Object.entries(data.keys)){
      const safe=String(shortKey||'').replace(/[^a-zA-Z0-9:_\-.]/g,'').slice(0,180);
      if(!safe || safe!==shortKey || !sec().isSyncKeyAllowed(safe)) continue;
      const base=sec().syncBaseKey(safe);
      const clean=pruneExpiredTombstones(base,sec().sanitizeForKey(base,value,null));
      if(clean===null || clean===undefined) continue;
      const raw=JSON.stringify(clean);
      totalBytes+=raw.length;
      if(totalBytes>8*1024*1024) throw new Error('BACKUP_TOO_LARGE');
      staged.set(PREFIX+safe,{shortKey:safe,value:clean,raw});
    }
    if(!staged.size) throw new Error('BACKUP_EMPTY');
    return {version,staged};
  }
  function createRestorePoint(label='restore-point'){
    const keyName = baseKey('backup:restorePoints');
    const points = parse(rawGet(keyName), []);
    const point = {id: cryptoId(), label: sec().cleanText(label, 120), createdAt: new Date().toISOString(), snapshot: snapshot()};
    rawSet(keyName, [point, ...points].slice(0, 10));
    return point;
  }
  function listRestorePoints(){
    return parse(rawGet(baseKey('backup:restorePoints')),[]).filter(point=>point&&point.id&&point.snapshot).slice(0,10).map(point=>({id:sec().cleanId(point.id),label:sec().cleanText(point.label,120),createdAt:point.createdAt,snapshot:point.snapshot}));
  }
  function deleteRestorePoint(id){
    const safe=sec().cleanId(id);
    const next=listRestorePoints().filter(point=>point.id!==safe);
    rawSet(baseKey('backup:restorePoints'),next);
    return next;
  }
  function restoreSnapshot(data,mode='replace',options={}){
    if(!persistent) throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');
    const {staged}=validateSnapshot(data);
    const normalizedMode=mode==='merge'?'merge':'replace';
    const merge=typeof options.merge==='function'?options.merge:((_,remote)=>remote);
    const currentKeys=[];
    try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith(PREFIX)&&k!==baseKey('backup:restorePoints')&&sec().isSyncKeyAllowed(k.slice(PREFIX.length))) currentKeys.push(k); } }
    catch(err){announcePersistenceFailure('enumerate',err); throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');}
    const affected=new Set([...currentKeys,...staged.keys()]);
    const before=new Map();
    for(const k of affected) before.set(k,localStorage.getItem(k));
    const point=options.skipRestorePoint?null:createRestorePoint(options.label||`before-${normalizedMode}-restore`);
    try{
      if(normalizedMode==='replace') for(const k of currentKeys) if(!staged.has(k)) rawRemove(k,{strict:true});
      let count=0;
      for(const [fullKey,item] of staged){
        let next=item.value;
        if(normalizedMode==='merge'){
          const existingRaw=localStorage.getItem(fullKey);
          if(existingRaw!==null) next=merge(parse(existingRaw,null),item.value,item.shortKey);
        }
        rawSet(fullKey,next,{strict:true});
        if(localStorage.getItem(fullKey)!==JSON.stringify(next)) throw new Error('RESTORE_VERIFY_FAILED');
        count++;
      }
      window.dispatchEvent(new CustomEvent('mt:storage:restored',{detail:{count,mode:normalizedMode,restorePointId:point?.id||null}}));
      return {count,mode:normalizedMode,restorePointId:point?.id||null};
    }catch(err){
      try{
        for(const [k,raw] of before){ if(raw===null)localStorage.removeItem(k); else localStorage.setItem(k,raw); }
      }catch(rollbackErr){announcePersistenceFailure('rollback',rollbackErr); throw new Error('RESTORE_ROLLBACK_FAILED');}
      throw err;
    }
  }
  function restorePoint(id){
    const point=listRestorePoints().find(item=>item.id===sec().cleanId(id));
    if(!point) throw new Error('RESTORE_POINT_NOT_FOUND');
    return restoreSnapshot(point.snapshot,'replace',{label:'before-restore-point'});
  }
  function downloadBackup(){ createRestorePoint('manual-backup'); const blob=new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='bawsala-backup-v13.json'; a.rel='noopener'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),0); }
  function importBackup(file){ return new Promise((resolve,reject)=>{ try{sec().assertBackupFile(file);}catch(err){reject(err);return;} const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); const result=restoreSnapshot(data,'replace',{label:'before-file-import'}); resolve({...data,importedKeys:result.count,restorePointId:result.restorePointId}); }catch(err){sec().recordSecurityEvent('backup-import-rejected', String(err?.message||err)); reject(err);} }; reader.onerror=reject; reader.readAsText(file); }); }
  function clearAll(){
    createRestorePoint('before-clear-all');
    try{ Object.keys(localStorage).filter(k=>(k.startsWith(PREFIX)&&k!==baseKey('backup:restorePoints')) || LEGACY_PREFIXES.some(prefix=>k.startsWith(prefix))).forEach(k=>localStorage.removeItem(k)); }catch(err){announcePersistenceFailure('clear-all',err); throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');}
    [...memory.keys()].filter(k=>k.startsWith(PREFIX)&&k!==baseKey('backup:restorePoints')).forEach(k=>memory.delete(k)); window.dispatchEvent(new CustomEvent('mt:storage:clear'));
  }
  function clearSyncData(){ const shouldClear=k=>k.startsWith(PREFIX) && sec().isSyncKeyAllowed(k.slice(PREFIX.length)); try{ Object.keys(localStorage).filter(shouldClear).forEach(k=>localStorage.removeItem(k)); }catch(err){announcePersistenceFailure('clear-sync',err); throw new Error('PERSISTENT_STORAGE_UNAVAILABLE');} [...memory.keys()].filter(shouldClear).forEach(k=>memory.delete(k)); window.dispatchEvent(new CustomEvent('mt:storage:clear-sync')); }
  function renderPersistenceWarning(){
    if(persistent || document.getElementById('storagePersistenceWarning')) return;
    const box=document.createElement('div'); box.id='storagePersistenceWarning'; box.className='notice danger storage-persistence-warning'; box.setAttribute('role','alert'); box.textContent='التخزين الدائم غير متاح. أي تغيير جديد قد يضيع عند إغلاق الصفحة. أصلح إعدادات المتصفح قبل المتابعة.';
    const main=document.querySelector('main'); (main||document.body).prepend(box);
  }
  window.addEventListener('mt:storage:persistence',renderPersistenceWarning);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderPersistenceWarning,{once:true});else renderPersistenceWarning();
  window.MT_STORE = {get,set,remove,getForProfile,setForProfile,addToCollection,updateCollection,deleteFromCollection,cryptoId,downloadBackup,importBackup,snapshot,validateSnapshot,restoreSnapshot,createRestorePoint,listRestorePoints,restorePoint,deleteRestorePoint,clearAll,getProfiles,activeProfile,setActiveProfile,saveProfile,deleteProfile,listProfileScoped,PREFIX,SNAPSHOT_VERSION,persistent:()=>persistent,persistenceFailure:()=>persistenceFailure,PROFILE_SCOPED,TOMBSTONE_COLLECTIONS,clearSyncData};
})();
