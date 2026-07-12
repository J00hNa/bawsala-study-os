(function(){
  const LEGAL_VERSION='2026-07-launch-v1';
  const ACCEPT_KEY='bawsala.v12.legalAccepted';
  const ACCEPT_AT_KEY='bawsala.v12.legalAcceptedAt';
  function read(){ try{return JSON.parse(localStorage.getItem(ACCEPT_KEY)||'null');}catch(_){return null;} }
  function accepted(){ const value=read(); return !!(value&&value.accepted===true&&value.version===LEGAL_VERSION); }
  function accept(version=LEGAL_VERSION){ try{const at=new Date().toISOString();localStorage.setItem(ACCEPT_KEY,JSON.stringify({accepted:true,version,at}));localStorage.setItem(ACCEPT_AT_KEY,at);return true;}catch(_){return false;} }
  function isAllowedPath(){ if(!location.pathname || location.protocol==='about:')return true; const p=location.pathname.replace(/\/+/g,'/'); return ['/welcome.html','/legal.html','/login.html','/signup.html','/signup-success.html'].some(path=>p.endsWith('/pages'+path)); }
  document.addEventListener('DOMContentLoaded',()=>{ if(accepted()||isAllowedPath())return; const target=location.pathname.includes('/pages/')?'welcome.html':'pages/welcome.html'; const next=encodeURIComponent(location.pathname.split('/').pop()||'index.html'); location.replace(target+'?next='+next); });
  window.BAWSALA_ONBOARDING={LEGAL_VERSION,ACCEPT_KEY,accepted,accept};
})();
