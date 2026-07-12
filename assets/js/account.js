(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const backend=window.BAWSALA_BACKEND, ui=window.MT_UI, store=window.MT_STORE;
    const gate=document.getElementById('accountGate'), app=document.getElementById('accountApp');
    const status=document.getElementById('accountStatus');
    const form=document.getElementById('accountForm'), passForm=document.getElementById('passwordForm');
    let currentAccountUser=null;
    function setStatus(text,type='info'){ if(status){status.className='notice '+type; status.textContent=text;} else ui.toast(text); }
    const academicSpecializations=[['medical-health','Medical / health sciences'],['law','Law'],['engineering','Engineering'],['business','Business'],['it','IT'],['arts / humanities','Arts / humanities'],['science','Science'],['other','Other']];
    const btecSpecializations=[['it','Information technology'],['business-admin','Business administration'],['engineering','Engineering'],['design-creative','Design / creative fields'],['hospitality','Hospitality'],['other','Other']];
    function fillSpecializations(value){
      const select=form?.specialization;
      if(!select) return;
      const rows=(form.track?.value==='btec'?btecSpecializations:academicSpecializations);
      select.innerHTML=rows.map(([id,label])=>`<option value="${id}">${label}</option>`).join('');
      if(value) select.value=value;
    }
    form?.track?.addEventListener('change',()=>fillSpecializations(form.specialization?.value));

    async function withBusy(button, label, task){ try{ ui.setBusy?.(button,true,label); return await task(); } finally{ ui.setBusy?.(button,false); } }
    function syncMeta(text){
      const conflict=backend.state.lastConflict;
      const revision=backend.state.lastRevision ? backend.state.lastRevision.replace('sha256:','').slice(0,8) : '—';
      const el=document.getElementById('syncMeta');
      if(el) el.textContent=(conflict?'تم دمج تعارض مزامنة. ':'')+'آخر مزامنة: '+(text||'—')+' · نسخة: '+revision;
      const state=document.getElementById('syncState');
      if(state) state.textContent=backend.state.syncing?'Syncing':(conflict?'Merged':(backend.state.lastSync?'Synced':'Cloud'));
      const warning=document.getElementById('syncConflictWarning');
      if(warning){ warning.classList.toggle('hide', !conflict); warning.textContent=conflict?'تنبيه: كانت نسخة الحساب قد تغيّرت على جهاز آخر، فتم الدمج بدل الاستبدال الصامت. راجع بياناتك المهمة.':''; }
    }
    async function render(){
      const user=await backend.me(); currentAccountUser=user;
      if(!user){gate.classList.remove('hide');app.classList.add('hide');return;}
      gate.classList.add('hide');app.classList.remove('hide');form.name.value=user.name||'';form.email.value=user.email||'';form.phone.value=user.phone||'';form.track.value=user.track||'academic';fillSpecializations(user.specialization||'other');form.grade.value=user.grade||'tawjihi';form.goal.value=user.goal||85;
      document.getElementById('accountRole').textContent=user.role==='admin'?'مدير':(user.role==='support'?'دعم':'طالب');document.getElementById('accountCreated').textContent=(user.createdAt||'').slice(0,10);
      const sub=document.getElementById('subscriptionState');if(sub)sub.textContent=user.subscription?.status==='active'?'مدفوع':'مجاني';const auth=document.getElementById('accountAuthProvider');if(auth)auth.textContent=user.authProvider==='google'?'Google':'كلمة مرور';
      renderEmailVerification(user);renderLegalConsent(user);await renderMfa(user);
      const current=passForm?.currentPassword;if(current&&user.hasPassword===false){current.required=false;current.placeholder='غير مطلوب لحساب Google عند تعيين أول كلمة مرور';const label=current.closest('label')?.querySelector('span');if(label)label.textContent='كلمة المرور الحالية — غير مطلوبة لحساب Google';}
      const deleteLabel=document.getElementById('deleteAccountPasswordLabel'),deleteInput=document.getElementById('deleteAccountPassword');if(deleteLabel&&deleteInput&&user.hasPassword===false){deleteLabel.textContent='اكتب بريدك الإلكتروني لتأكيد الحذف';deleteInput.type='email';deleteInput.autocomplete='email';deleteInput.placeholder=user.email||'';}
    }

    function renderLegalConsent(user){
      const panel=document.getElementById('legalConsentPanel');if(!panel)return;panel.classList.toggle('hide',!user?.legalConsentRequired);
    }
    async function renderMfa(user){
      const panel=document.getElementById('mfaPanel'),state=document.getElementById('mfaState'),start=document.getElementById('startMfaSetup');
      if(!panel||!state||!start)return;const admin=user?.role==='admin';panel.classList.toggle('hide',!admin);if(!admin)return;
      try{const data=await backend.mfaStatus();state.textContent=data.enabled?`مفعّل. رموز الاسترداد المتبقية: ${data.recoveryCodesRemaining}.`:'غير مفعّل. لوحة الإدارة ستبقى مقفلة حتى التفعيل.';start.classList.toggle('hide',data.enabled);}catch(err){state.textContent=err.message==='LEGAL_CONSENT_REQUIRED'?'اقبل الشروط الحالية أولاً.':'تعذر قراءة حالة MFA.';}
    }
    document.getElementById('acceptLegalConsent')?.addEventListener('click',async()=>{
      try{const config=await backend.legalConfig();const ok=await ui.confirmAction({title:'الموافقة على النسخة الحالية',message:'راجع صفحة الشروط والخصوصية أولاً. الضغط على موافق يسجل النسخة والتوقيت في الحساب.',confirmText:'أوافق على النسخة '+config.version,danger:false});if(!ok)return;const data=await backend.acceptLegalConsent(config.version);currentAccountUser=data.user;renderLegalConsent(data.user);await renderMfa(data.user);setStatus('تم تسجيل الموافقة القانونية الحالية.','success');}catch(_){setStatus('تعذر تسجيل الموافقة.','danger');}
    });
    document.getElementById('startMfaSetup')?.addEventListener('click',async()=>{
      try{const data=await backend.startMfaSetup();document.getElementById('mfaSecret').value=data.secret;document.getElementById('mfaSetupFields').classList.remove('hide');setStatus('أضف المفتاح إلى تطبيق المصادقة ثم أدخل الرمز. المفتاح ينتهي خلال 10 دقائق.','info');}catch(err){setStatus(err.message==='MFA_NOT_CONFIGURED'?'الخادم يفتقد BAWSALA_MFA_ENCRYPTION_KEY. الإدارة مقفلة حتى ضبطه.':'تعذر بدء إعداد MFA.','danger');}
    });
    document.getElementById('confirmMfaSetup')?.addEventListener('click',async()=>{
      try{
        const data=await backend.confirmMfaSetup(document.getElementById('mfaConfirmCode').value);
        const box=document.getElementById('mfaRecoveryCodes');
        box.textContent=`احفظ هذه الرموز مرة واحدة في مكان آمن:
${(data.recoveryCodes||[]).join('\n')}`;
        box.classList.remove('hide');
        document.getElementById('mfaSetupFields').classList.add('hide');
        currentAccountUser=data.user;
        await renderMfa(data.user);
        setStatus('تم تفعيل MFA. احفظ رموز الاسترداد الآن؛ لن نعرضها ثانية.','success');
      }catch(err){setStatus(err.message==='INVALID_MFA_CODE'?'الرمز غير صحيح أو خارج النافذة الزمنية.':'تعذر تفعيل MFA.','danger');}
    });


    form?.addEventListener('submit',async e=>{ e.preventDefault(); await withBusy(e.submitter,'جارٍ الحفظ...',async()=>{ try{ const user=await backend.updateAccount({name:form.name.value,phone:form.phone.value,track:form.track.value,specialization:form.specialization.value,grade:form.grade.value,goal:form.goal.value,language:store.get('language','ar'),theme:store.get('theme','dark')}); setStatus('تم حفظ إعدادات الحساب.','success'); window.dispatchEvent(new CustomEvent('bawsala:auth',{detail:{...backend.state,user}})); }catch(_){ setStatus('تعذر حفظ الحساب.','danger'); } }); });
    passForm?.addEventListener('submit',async e=>{ e.preventDefault(); if(passForm.newPassword.value!==passForm.confirmPassword.value){ setStatus('كلمة المرور الجديدة غير متطابقة.','danger'); return; } await withBusy(e.submitter,'جارٍ التغيير...',async()=>{ try{ await backend.changePassword(passForm.currentPassword.value,passForm.newPassword.value); passForm.reset(); setStatus('تم تغيير كلمة المرور.','success'); }catch(err){ setStatus(err.message==='INVALID_PASSWORD'?'كلمة المرور الحالية غير صحيحة.':err.message==='PASSWORD_REUSED'?'لا تستخدم كلمة مرور حالية أو قديمة.':'تعذر تغيير كلمة المرور.','danger'); } }); });

    function renderEmailVerification(user){
      const panel=document.getElementById('emailVerificationPanel');
      const state=document.getElementById('emailVerificationState');
      const note=document.getElementById('emailVerificationNote');
      const btn=document.getElementById('resendEmailVerification');
      if(!panel || !state || !note || !btn || !user) return;
      const verified=!!user.emailVerified;
      panel.className='notice '+(verified?'success':'danger');
      state.textContent=verified?'البريد مؤكد':'البريد غير مؤكد — بعض الميزات مقفلة';
      note.textContent=verified?'الحساب موثوق للميزات الحساسة مثل المزامنة والفوترة والتقويم.':'أكد بريدك قبل استخدام المزامنة، التقويم، التصدير، أو الدفع. هذا قفل حقيقي وليس نصيحة.';
      btn.classList.toggle('hide', verified);
    }
    document.getElementById('resendEmailVerification')?.addEventListener('click',async e=>{
      await withBusy(e.currentTarget,'جارٍ الإرسال...',async()=>{
        try{
          const data=await backend.requestEmailVerification();
          const dev=data.verification?.devVerificationUrl;
          setStatus(dev?'تم إنشاء رابط تأكيد تطوير: '+dev:'تم طلب رابط تأكيد جديد.','success');
        }catch(err){ setStatus(err.message==='EMAIL_VERIFY_RESEND_TOO_SOON'?'انتظر قبل طلب رابط جديد.':'تعذر طلب رابط التأكيد.','danger'); }
      });
    });
    function renderSecurityLog(events){
      const list=document.getElementById('securityLogList');
      if(!list) return;
      if(!events?.length){ list.innerHTML='<p class="muted">لا يوجد سجل أمان ظاهر بعد.</p>'; return; }
      const labels={
        'user-signup':'إنشاء حساب','email-verification-issued':'إرسال تأكيد بريد','email-verified':'تأكيد البريد','user-login':'تسجيل دخول','user-logout':'تسجيل خروج','login-failed':'محاولة دخول فاشلة','account-login-locked':'قفل مؤقت للحساب','password-changed':'تغيير كلمة المرور','password-reset-issued':'طلب إعادة تعيين','password-reset-completed':'إكمال إعادة تعيين','session-revoked':'إلغاء جلسة','account-updated':'تحديث الحساب','account-exported':'تصدير بيانات الحساب','billing-checkout-created':'إنشاء دفع','billing-cancel-requested':'طلب إلغاء اشتراك'
      };
      list.innerHTML=events.slice(0,12).map(ev=>`<article class="card compact"><b>${labels[ev.type]||ev.type}</b><p class="fine ltr">${ui.escapeHTML((ev.at||'').slice(0,19))}</p></article>`).join('');
    }
    async function loadSecurityLog(){
      try{ const data=await backend.getSecurityLog(); renderSecurityLog(data.events||[]); }
      catch(_){ renderSecurityLog([]); }
    }

    async function loadSessions(){
      const list=document.getElementById('sessionsList');
      if(!list || !backend.state.authenticated) return;
      try{
        const data=await backend.getSessions();
        const sessions=data.sessions||[];
        list.innerHTML=sessions.length?sessions.map(sess=>`<article class="card compact"><b>${sess.current?'الجلسة الحالية':'جلسة أخرى'}</b><p class="fine ltr">${ui.escapeHTML((sess.lastSeenAt||sess.createdAt||'').slice(0,19))}</p>${sess.current?'':`<button class="btn danger sm" data-revoke="${ui.escapeAttr(sess.id)}" type="button">إلغاء الجلسة</button>`}</article>`).join(''):'<p class="muted">لا توجد جلسات.</p>';
        list.querySelectorAll('[data-revoke]').forEach(btn=>btn.addEventListener('click',async()=>{ try{ await backend.revokeSession(btn.dataset.revoke); await loadSessions(); setStatus('تم إلغاء الجلسة.','success'); }catch(_){ setStatus('تعذر إلغاء الجلسة.','danger'); } }));
      }catch(_){ list.innerHTML='<p class="muted">تعذر تحميل الجلسات.</p>'; }
    }
    document.getElementById('refreshSessions')?.addEventListener('click',loadSessions);
    document.getElementById('refreshSecurityLog')?.addEventListener('click',loadSecurityLog);
    document.getElementById('deleteAccountBtn')?.addEventListener('click',async()=>{
      const input=document.getElementById('deleteAccountPassword');
      const password=input?.value||'';
      if(!password){ setStatus(currentAccountUser?.hasPassword===false?'اكتب بريدك الإلكتروني قبل حذف الحساب.':'اكتب كلمة المرور قبل حذف الحساب.','danger'); return; }
      const ok=await ui.confirmAction({title:'حذف الحساب نهائياً؟',message:'سيُحذف الحساب من السيرفر وتُمسح بيانات بوصلة المحلية على هذا الجهاز. لا يمكن التراجع.',confirmText:'حذف الحساب',danger:true});
      if(!ok) return;
      try{ await backend.deleteAccount(currentAccountUser?.hasPassword===false?{confirmEmail:password}:{password}); store.clearAll?.(); setStatus('تم حذف الحساب وبياناته المحلية.','success'); setTimeout(()=>{ location.href='signup.html'; },900); }
      catch(err){ setStatus(err.message==='INVALID_PASSWORD'?'كلمة المرور غير صحيحة.':err.message==='EMAIL_CONFIRMATION_REQUIRED'?'البريد غير مطابق.':err.message==='LAST_ADMIN_REQUIRED'?'لا يمكن حذف آخر مدير.':'تعذر حذف الحساب.','danger'); }
    });
    document.getElementById('backupAccountData')?.addEventListener('click',()=>{ store.downloadBackup(); setStatus('تم تنزيل نسخة احتياطية محلية.','success'); });
    document.getElementById('exportServerAccountData')?.addEventListener('click',async()=>{
      try{
        const data=await backend.exportAccountData();
        const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
        const a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download='bawsala-account-export-'+window.MT_SECURITY.localDate()+'.json';
        a.click();
        URL.revokeObjectURL(a.href);
        setStatus('تم تصدير بيانات الحساب من السيرفر.','success');
      }catch(err){ setStatus(err.message==='NOT_AUTHENTICATED'?'سجل الدخول أولاً.':'تعذر تصدير بيانات الحساب.','danger'); }
    });
    document.getElementById('mergeAccountData')?.addEventListener('click',async()=>{ try{ const r=await backend.pullSnapshot('merge'); syncMeta(backend.state.lastSync); setStatus(`تم دمج بيانات الحساب بدون استبدال الموجود: ${r.count} عنصر جديد. أعد تحميل الصفحة عند الحاجة.`,'success'); }catch(err){ setStatus(err.message==='NOT_AUTHENTICATED'?'سجل الدخول أولاً.':'تعذر دمج بيانات الحساب.','danger'); } });
    document.getElementById('pullAccountData')?.addEventListener('click',async()=>{ try{ const ok=await ui.confirmAction({title:'استبدال بيانات هذا الجهاز؟',message:'سيتم تحميل نسخة الحساب واستبدال بيانات بوصلة المحلية بعد حفظ نقطة استرجاع. الدمج أكثر أماناً إذا كنت غير متأكد.',confirmText:'استبدال البيانات',danger:true}); if(!ok) return; const r=await backend.pullSnapshot('replace'); syncMeta(backend.state.lastSync); setStatus(`تم استبدال بيانات الجهاز بنسخة الحساب: ${r.count} عنصر. أعد تحميل الصفحة عند الحاجة.`,'success'); }catch(err){ setStatus(err.message==='NOT_AUTHENTICATED'?'سجل الدخول أولاً.':'تعذر تحميل بيانات الحساب.','danger'); } });
    document.getElementById('pushAccountData')?.addEventListener('click',async()=>{ try{ await backend.saveSnapshot(); syncMeta(backend.state.lastSync); setStatus(backend.state.lastConflict?'تم رفع البيانات مع دمج تعارض نسخة أخرى. راجع العناصر المهمة.':'تم رفع بيانات هذا الجهاز إلى الحساب بدون قص الملاحظات الطويلة.','success'); }catch(err){ setStatus(err.message==='NOT_AUTHENTICATED'?'سجل الدخول أولاً.':'تعذر رفع بيانات هذا الجهاز.','danger'); } });
    document.getElementById('logoutBtn')?.addEventListener('click',async()=>{ await backend.logout(); location.href='login.html'; });
    window.addEventListener('bawsala:sync',e=>syncMeta(e.detail?.lastSync));
    syncMeta();
    render().then(()=>{ loadSessions(); loadSecurityLog(); });
  });
})();
