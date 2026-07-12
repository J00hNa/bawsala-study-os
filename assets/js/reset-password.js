(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const backend=window.BAWSALA_BACKEND, ui=window.MT_UI;
    const form=document.getElementById('passwordResetConfirmForm');
    const message=document.getElementById('resetMessage');
    function setMessage(text,type='info'){ if(message){ message.className='notice '+type; message.textContent=text; } else ui?.toast?.(text); }
    const token=new URLSearchParams(location.search).get('token')||'';
    if(form?.token) form.token.value=token;
    if(!token) setMessage('الرابط ناقص أو غير صالح. اطلب رابطاً جديداً من صفحة الدخول.','danger');
    form?.addEventListener('submit',async e=>{
      e.preventDefault();
      const f=e.currentTarget;
      const btn=f.querySelector('button[type="submit"]');
      if(!f.token.value){ setMessage('الرابط ناقص. اطلب رابطاً جديداً.','danger'); return; }
      if(f.newPassword.value!==f.confirmPassword.value){ setMessage('كلمتا المرور غير متطابقتين.','danger'); return; }
      btn.disabled=true;
      try{
        await backend.confirmPasswordReset(f.token.value,f.newPassword.value);
        f.reset();
        setMessage('تم تغيير كلمة المرور وإلغاء الجلسات القديمة. سجل الدخول من جديد.','success');
        setTimeout(()=>{ location.href='login.html?reset=success'; },900);
      }catch(err){
        const map={WEAK_PASSWORD:'كلمة المرور ضعيفة. استخدم 10 أحرف على الأقل مع حروف وأرقام.',PASSWORD_REUSED:'لا تستخدم كلمة مرور حالية أو قديمة.',INVALID_PASSWORD_RESET_TOKEN:'الرابط غير صالح.',PASSWORD_RESET_EXPIRED:'انتهت صلاحية الرابط. اطلب رابطاً جديداً.'};
        setMessage(map[err.message]||'تعذر تعيين كلمة المرور.','danger');
      }finally{ btn.disabled=false; }
    });
  });
})();
