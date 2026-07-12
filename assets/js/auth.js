(function(){
  function mountAuth(){
    if(!document.body || document.body.dataset.authRuntime==='1') return;
    document.body.dataset.authRuntime='1';
    const ui=window.MT_UI, store=window.MT_STORE, backend=window.BAWSALA_BACKEND;
    const loginForm=document.getElementById('loginForm');
    const signupForm=document.getElementById('signupForm');
    const syncLocal=document.getElementById('syncLocalAfterAuth');
    const passwordResetRequestForm=document.getElementById('passwordResetRequestForm');
    const params=new URLSearchParams(location.search);
    let googleCompletion=false;
    const pullData=document.querySelector('input[name="pullData"]');
    pullData?.addEventListener('change',()=>{ if(pullData.checked && syncLocal) syncLocal.checked=false; });
    syncLocal?.addEventListener('change',()=>{ if(syncLocal.checked && pullData) pullData.checked=false; });
    function msg(text,type='info'){ const el=document.getElementById('authMessage'); if(el){ el.className='notice '+type; el.textContent=text; } else ui.toast(text); }
    const authState=params.get('auth');
    if(authState){
      const authMessages={google:'تم تسجيل الدخول باستخدام Google.',google_denied:'تم إلغاء تسجيل الدخول عبر Google.',google_state_failed:'فشل تحقق أمان Google OAuth. أعد المحاولة من نفس المتصفح.',google_profile_rejected:'رفضنا ملف Google لأنه لا يحتوي بريداً موثقاً صالحاً.',google_not_configured:'Google OAuth غير مكتمل الإعداد.',google_failed:'فشل تسجيل الدخول عبر Google.'};
      msg(authMessages[authState]||'تعذر إكمال Google Sign-In.','danger');
    }
    const academicSpecializations=[['medical-health','Medical / health sciences'],['law','Law'],['engineering','Engineering'],['business','Business'],['it','IT'],['arts-humanities','Arts / humanities'],['science','Science'],['other','Other']];
    const btecSpecializations=[['it','Information technology'],['business-admin','Business administration'],['engineering','Engineering'],['design-creative','Design / creative fields'],['hospitality','Hospitality'],['other','Other']];
    function fillSpecializations(){
      const track=document.getElementById('studentPath')?.value || 'academic';
      const select=document.getElementById('specializationSelect');
      if(!select) return;
      const rows=track==='btec'?btecSpecializations:academicSpecializations;
      select.innerHTML=rows.map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
    }
    document.getElementById('studentPath')?.addEventListener('change',fillSpecializations);
    fillSpecializations();
    const signupSubmit=signupForm?.querySelector('button[type="submit"]');
    function updateSignupConsent(){ if(signupSubmit && signupForm?.agree) signupSubmit.disabled=!(signupForm.agree.checked && signupForm.ageConfirmed?.checked); }
    signupForm?.agree?.addEventListener('change',updateSignupConsent);
    signupForm?.ageConfirmed?.addEventListener('change',updateSignupConsent);
    updateSignupConsent();
    async function initGoogleAuth(){
      const btn=document.getElementById('googleSignIn');
      const note=document.getElementById('googleAuthNote');
      if(!btn) return;
      try{
        const data=await backend.googleConfig?.();
        btn.disabled=!data?.enabled;
        if(note) note.textContent=data?.enabled?'سيتم تحويلك إلى Google، ثم نطلب منك إكمال الحقول التي لا يوفرها Google.':'Google Sign-In غير مفعّل لأن OAuth Client ID/Secret غير موجودين.';
        btn.addEventListener('click',async()=>{
          try{ const start=await backend.googleStart?.(); if(start?.authUrl) location.href=start.authUrl; else msg(start?.message||'Google غير مفعّل حالياً.','danger'); }
          catch(_){ msg('تعذر بدء Google Sign-In.','danger'); }
        });
      }catch(_){ btn.disabled=true; if(note) note.textContent='تعذر فحص إعداد Google Sign-In.'; }
    }
    initGoogleAuth();

    async function initGoogleCompletion(){
      if(!signupForm || params.get('google')!=='complete') return;
      try{
        const data=await backend.googlePending?.();
        if(!data?.pending){ msg('انتهت جلسة Google المؤقتة. ابدأ تسجيل الدخول من جديد.','danger'); return; }
        googleCompletion=true;
        signupForm.name.value=data.pending.name||'';
        signupForm.email.value=data.pending.email||'';
        signupForm.email.readOnly=true;
        const passInputs=[signupForm.password, signupForm.confirmPassword].filter(Boolean);
        passInputs.forEach(input=>{ input.required=false; input.removeAttribute('required'); input.value=''; const row=input.closest('.field-row'); if(row) row.classList.add('hide'); });
                const title=document.querySelector('.auth-card h1'); if(title) title.textContent='إكمال حساب Google';
        const submit=signupForm.querySelector('button[type="submit"]'); if(submit) submit.textContent='إكمال الحساب';
        msg('Google أعطانا الاسم والبريد فقط. أكمل المسار الدراسي والتخصص ثم أكد العمر وسياسة الخصوصية.','info');
      }catch(_){ msg('تعذر قراءة جلسة Google المؤقتة. ابدأ من زر Google مرة أخرى.','danger'); }
    }
    initGoogleCompletion();

    function safeNext(){
      const raw=new URLSearchParams(location.search).get('next') || 'dashboard.html';
      const allowed=new Set(['dashboard.html','workspace.html','account.html','settings.html','profiles.html','notebook.html','study.html','resources.html','calculators.html','community.html','calendar.html','billing.html']);
      if(!raw || raw.startsWith('//') || raw.includes(':') || raw.includes('\\')) return 'dashboard.html';
      const clean=raw.replace(/^\.\//,'').replace(/^pages\//,'');
      return allowed.has(clean) ? clean : 'dashboard.html';
    }
    function go(){ location.href=safeNext(); }
    if(loginForm) loginForm.dataset.authBound='1';
    loginForm?.addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.currentTarget; const btn=f?.querySelector('button[type="submit"]'); if(!btn) return; btn.disabled=true; msg('جاري تسجيل الدخول...');
      try{
        const emailInput=f.elements.namedItem('email'), passwordInput=f.elements.namedItem('password'), modeInput=f.elements.namedItem('syncMode');
        if(!emailInput||!passwordInput) throw new Error('LOGIN_FIELDS_MISSING');
        await backend.login(emailInput.value,passwordInput.value,f.elements.namedItem('mfaCode')?.value||'');
        const mode=String(modeInput?.value||'merge');
        if(mode==='replace'){
          const preview=await backend.previewSnapshot();
          const ok=await ui.confirmAction({title:'استبدال بيانات الجهاز؟',message:`نسخة الحساب تحتوي تقريباً ${preview.remote.recordCount} سجلاً، والجهاز ${preview.local.recordCount}. سيُنشأ restore point، لكن البيانات المحلية غير الموجودة بالحساب ستُحذف.`,confirmText:'استبدال بعد إنشاء نقطة رجوع',danger:true});
          if(!ok){msg('تم تسجيل الدخول دون تنفيذ الاستبدال.','info');setTimeout(go,500);return;}
          const result=await backend.pullSnapshot('replace'); msg(`تم الدخول واسترجاع ${result.count} مفتاح بيانات بعد إنشاء نقطة رجوع.`,'success');
        }else if(mode==='merge'){
          const result=await backend.pullSnapshot('merge'); msg(`تم الدخول ودمج ${result.count} مفتاح بيانات بأمان.`,'success');
        }else if(mode==='local'){
          await backend.saveSnapshot(null,'merge'); msg('تم تسجيل الدخول ورفع بيانات الجهاز إلى الحساب.','success');
        }else msg('تم تسجيل الدخول دون مزامنة.','success');
        setTimeout(go,700);
      }
      catch(err){ const errors={INVALID_LOGIN:'البريد أو كلمة المرور غير صحيحة.',MFA_REQUIRED:'هذا حساب إداري محمي. أدخل رمز تطبيق المصادقة.',INVALID_MFA_CODE:'رمز التحقق الإداري غير صحيح.'}; msg(errors[err.message]||'تعذر تسجيل الدخول.','danger'); }
      finally{ btn.disabled=false; }
    });
    passwordResetRequestForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const f=e.currentTarget;
      const btn=f.querySelector('button[type="submit"]');
      const note=document.getElementById('passwordResetRequestNote');
      btn.disabled=true;
      try{
        const data=await backend.requestPasswordReset(f.email.value);
        const reset=data.reset||{};
        if(note){
          note.replaceChildren();
          if(reset.devResetUrl){
            const url=new URL(reset.devResetUrl,location.origin);
            if(url.origin!==location.origin) throw new Error('UNSAFE_RESET_URL');
            note.append('تم إنشاء رابط تطوير فقط: ');
            const link=document.createElement('a'); link.href=url.pathname+url.search+url.hash; link.textContent='فتح صفحة التعيين'; link.rel='noopener'; note.append(link);
          }else note.textContent='إذا كان البريد مسجلاً، سيصل رابط إعادة التعيين. الرابط ينتهي خلال 15 دقيقة.';
        }
        msg('تم قبول طلب إعادة التعيين.','success');
      }catch(err){ msg(err.message==='INVALID_EMAIL'?'اكتب بريداً صحيحاً.':'تعذر طلب إعادة التعيين.','danger'); }
      finally{ btn.disabled=false; }
    });
    signupForm?.addEventListener('submit',async e=>{
      e.preventDefault(); const f=e.currentTarget; const btn=f.querySelector('button[type="submit"]'); btn.disabled=true;
      if(!googleCompletion && f.password.value!==f.confirmPassword.value){ msg('كلمتا المرور غير متطابقتين.','danger'); btn.disabled=false; return; }
      if(!f.agree.checked){ msg('يجب الموافقة على اتفاقية الاستخدام.','danger'); btn.disabled=false; return; }
      try{
        const payload={name:f.name.value,email:f.email.value,phone:f.phone?.value||'',password:f.password?.value||'',track:f.track.value,specialization:f.specialization?.value||'',grade:f.grade.value,goal:f.goal.value,ageConfirmed:!!f.ageConfirmed?.checked,privacyAccepted:!!f.agree.checked,language:store.get('language','ar'),theme:store.get('theme','dark')};
        const result = googleCompletion ? await backend.completeGoogleSignup(payload) : await backend.signup(payload);
        window.BAWSALA_ONBOARDING?.accept?.(result?.user?.currentLegalVersion || window.BAWSALA_ONBOARDING?.LEGAL_VERSION);
        if(googleCompletion){
          try{ await backend.saveSnapshot(null,'replace'); msg('تم إكمال حساب Google وحفظ بيانات هذا الجهاز.','success'); }
          catch(syncErr){ msg('تم إنشاء الحساب، لكن فشل رفع بيانات هذا الجهاز. ادخل للحساب ثم جرّب المزامنة من صفحة الحساب.','danger'); }
          setTimeout(go,900);
          return;
        }
        try{ sessionStorage.setItem('bawsala.signup.verification', JSON.stringify(result.verification || {})); }catch(_){/* ignore */}
        msg('تم إنشاء الحساب. الخطوة التالية: تأكيد البريد الإلكتروني.','success');
        setTimeout(()=>{ location.href='signup-success.html'; },700);
      }
      catch(err){ const map={GOOGLE_PROFILE_PENDING_NOT_FOUND:'جلسة Google المؤقتة انتهت. ابدأ من جديد.',ACCOUNT_NOT_AVAILABLE:'تعذر إنشاء الحساب بهذا البريد.',WEAK_PASSWORD:'كلمة المرور يجب أن تكون 12 حرفاً على الأقل وتحتوي حروفاً وأرقاماً.',INVALID_EMAIL:'البريد غير صالح.',PRIVACY_REQUIRED:'يجب الموافقة على سياسة الخصوصية قبل إنشاء الحساب.',AGE_CONFIRMATION_REQUIRED:'يجب تأكيد أن عمرك 13 سنة أو أكثر.',INVALID_PHONE:'رقم الهاتف غير صالح. اتركه فارغاً أو أدخله بشكل صحيح.',NATIONAL_ID_NOT_COLLECTED:'رقم الهوية الوطنية غير مطلوب ولن يتم جمعه.'}; msg(map[err.message] || 'تعذر إنشاء الحساب.','danger'); }
      finally{ btn.disabled=false; }
    });
  }
  window.BAWSALA_AUTH={mount:mountAuth};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAuth,{once:true});else mountAuth();
})();
