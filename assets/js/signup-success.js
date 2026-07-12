(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const backend=window.BAWSALA_BACKEND;
    const msg=document.getElementById('verifyMessage');
    const resend=document.getElementById('resendVerify');
    const devBox=document.getElementById('devVerifyBox');
    const devLink=document.getElementById('devVerifyLink');
    const continueBtn=document.getElementById('continueDashboard');
    const params=new URLSearchParams(location.search);
    function setMsg(text,type='info'){ if(msg){ msg.className='notice '+type; msg.textContent=text; } }
    function renderDevLink(url){ if(!url || !devBox || !devLink) return; devLink.href=url; devLink.textContent=url; devBox.classList.remove('hide'); }
    function stashVerification(){ try{ return JSON.parse(sessionStorage.getItem('bawsala.signup.verification')||'{}'); }catch(_){ return {}; } }
    const stashed=stashVerification();
    renderDevLink(stashed.devVerificationUrl);
    if(params.get('verified')==='1') setMsg('تم تأكيد البريد بنجاح. الآن الحساب موثوق أكثر.','success');
    if(params.get('verified')==='0') setMsg('فشل تأكيد البريد أو انتهت صلاحيته. اطلب رابطاً جديداً من هذا الجهاز بعد تسجيل الدخول.','danger');
    async function refresh(){
      try{
        const data=await backend.emailVerificationStatus();
        if(data.user?.emailVerified){ setMsg('البريد مؤكد. يمكنك استخدام الحساب الآن.','success'); if(continueBtn) continueBtn.classList.remove('disabled'); return; }
        setMsg('البريد غير مؤكد بعد. افحص بريدك أو أعد إرسال الرابط.','warning');
      }catch(_){
        if(params.get('verified')==='1') return;
        setMsg('لا توجد جلسة دخول حالية. سجّل الدخول ثم اطلب رابط تأكيد جديد إذا احتجت.','warning');
        if(resend) resend.disabled=true;
      }
    }
    resend?.addEventListener('click',async()=>{
      resend.disabled=true;
      try{ const data=await backend.requestEmailVerification(); renderDevLink(data.verification?.devVerificationUrl); setMsg('تم إصدار رابط تأكيد جديد.','success'); }
      catch(err){ setMsg(err.message==='EMAIL_VERIFY_RESEND_TOO_SOON'?'انتظر قليلاً قبل طلب رابط جديد.':'تعذر إعادة إرسال رابط التأكيد.','danger'); }
      finally{ setTimeout(()=>{ resend.disabled=false; },1200); }
    });
    refresh();
  });
})();
