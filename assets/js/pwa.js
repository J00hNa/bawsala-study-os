(function(){
  'use strict';
  const BUILD_VERSION='16.0.1';
  const state={registration:null,waiting:null,reloadRequested:false};
  function emit(type,detail={}){window.dispatchEvent(new CustomEvent(type,{detail:{version:BUILD_VERSION,...detail}}));}
  function applyUpdate(){
    state.reloadRequested=true;
    try{sessionStorage.setItem('bawsala:pwa-reload','1');}catch(_){/* no-op */}
    const worker=state.waiting||state.registration?.waiting;
    if(worker)worker.postMessage({type:'SKIP_WAITING'});
    else location.reload();
  }
  async function clearCaches(){
    try{
      state.registration?.active?.postMessage({type:'CLEAR_CACHES'});
      if('caches'in window)await Promise.all((await caches.keys()).filter(key=>key.startsWith('bawsala-')).map(key=>caches.delete(key)));
    }catch(_){/* best effort */}
  }
  function watchRegistration(registration){
    state.registration=registration;
    if(registration.waiting){state.waiting=registration.waiting;emit('bawsala:pwa-update',{registration});}
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{
        if(worker.state==='installed'&&navigator.serviceWorker.controller){state.waiting=worker;emit('bawsala:pwa-update',{registration});}
      });
    });
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    if(!('serviceWorker'in navigator)||location.protocol==='file:')return;
    const root=location.pathname.includes('/pages/')?'../':'./';
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(!state.reloadRequested)return;
      state.reloadRequested=false;
      location.reload();
    });
    try{
      const registration=await navigator.serviceWorker.register(`${root}service-worker.js?v=${BUILD_VERSION}`,{updateViaCache:'none'});
      watchRegistration(registration);
      registration.update().catch(()=>{});
      registration.active?.postMessage({type:'CLIENT_VERSION',version:BUILD_VERSION});
    }catch(error){emit('bawsala:pwa-error',{message:String(error?.message||error).slice(0,180)});}
  });
  window.BAWSALA_PWA={version:BUILD_VERSION,state,applyUpdate,clearCaches};
})();
