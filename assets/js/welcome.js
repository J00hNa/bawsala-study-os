(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const form=document.getElementById('welcomeConsentForm');
    const agree=document.getElementById('welcomeAgree');
    const continueBtn=document.getElementById('welcomeContinue');
    const next=new URLSearchParams(location.search).get('next') || 'login.html';
    function update(){ if(continueBtn) continueBtn.disabled=!agree?.checked; }
    agree?.addEventListener('change',update);
    update();
    form?.addEventListener('submit',event=>{
      event.preventDefault();
      if(!agree?.checked) return;
      window.BAWSALA_ONBOARDING?.accept?.();
      const clean=String(next).replace(/^pages\//,'').replace(/[^a-zA-Z0-9_.-]/g,'');
      location.href=clean && clean !== 'welcome.html' ? clean : 'login.html';
    });
  });
})();
