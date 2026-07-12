(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE, ui=window.MT_UI, backend=window.BAWSALA_BACKEND;
    const form=document.getElementById('settingsForm');
    const msg=document.getElementById('settingsMessage');
    if(!form || !store || !ui) return;
    function note(text,type='info'){ if(msg){msg.className='notice '+type; msg.textContent=text;} else ui.toast(text); }
    async function withBusy(button,label,task){ try{ ui.setBusy?.(button,true,label); return await task(); } finally{ ui.setBusy?.(button,false); } }
    function applyPreferenceClasses(prefs){
      document.body.classList.toggle('compact-ui',!!prefs.compact);
      document.body.classList.toggle('reduced-motion-ui',!!prefs.reduceMotion);
      document.documentElement.dataset.fontScale=['normal','large','xlarge'].includes(prefs.fontScale)?prefs.fontScale:'normal';
      document.documentElement.dataset.contrast=['standard','high'].includes(prefs.contrast)?prefs.contrast:'standard';
    }

    function renderRestorePoints(){
      const box=document.getElementById('restorePointList'); if(!box)return;
      const points=store.listRestorePoints?.()||[];
      box.replaceChildren();
      if(!points.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='لا توجد نقاط رجوع بعد.';box.append(empty);return;}
      points.forEach(point=>{
        const row=document.createElement('article');row.className='restore-point-row';
        const info=document.createElement('div');const title=document.createElement('strong');title.textContent=point.label||'نقطة رجوع';const date=document.createElement('p');date.className='fine';date.textContent=new Date(point.createdAt).toLocaleString('ar-JO');info.append(title,date);
        const actions=document.createElement('div');actions.className='actions';
        const restore=document.createElement('button');restore.type='button';restore.className='btn secondary sm';restore.textContent='استرجاع';restore.addEventListener('click',async()=>{const ok=await ui.confirmAction({title:'استرجاع هذه النقطة؟',message:'سيتم إنشاء نقطة رجوع جديدة أولاً، ثم استبدال بيانات الجهاز.',confirmText:'استرجاع',danger:true});if(!ok)return;try{store.restorePoint(point.id);note('تم الاسترجاع بنجاح.','success');renderRestorePoints();load();}catch(err){note(err.message==='PERSISTENT_STORAGE_UNAVAILABLE'?'التخزين الدائم غير متاح؛ لم ننفذ الاسترجاع.':'فشل الاسترجاع وتمت إعادة الحالة السابقة.','danger');}});
        const remove=document.createElement('button');remove.type='button';remove.className='btn danger sm';remove.textContent='حذف';remove.addEventListener('click',()=>{store.deleteRestorePoint(point.id);renderRestorePoints();});
        actions.append(restore,remove);row.append(info,actions);box.append(row);
      });
    }

    function load(){
      const s=store.get('user:preferences',{});
      form.language.value=store.get('language','ar');
      form.theme.value=store.get('theme','dark');
      form.startPage.value=s.startPage||'dashboard.html';
      form.defaultFocus.value=s.defaultFocus||25;
      form.dailyGoal.value=s.dailyGoal||120;
      form.fontScale.value=['normal','large','xlarge'].includes(s.fontScale)?s.fontScale:'normal';
      form.contrast.value=['standard','high'].includes(s.contrast)?s.contrast:'standard';
      form.compact.checked=!!s.compact;
      form.reduceMotion.checked=!!s.reduceMotion;
      form.autoSync.checked=s.autoSync!==false;
      form.notifications.checked=!!s.notifications;
      applyPreferenceClasses(s);
    }
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      await withBusy(e.submitter, ui.lang()==='en'?'Saving...':'جارٍ الحفظ...', async()=>{
      const oldLanguage=store.get('language','ar');
      const oldTheme=store.get('theme','dark');
      const prefs={
        startPage:form.startPage.value,
        defaultFocus:ui.clampNumber(form.defaultFocus.value,5,120,25),
        dailyGoal:ui.clampNumber(form.dailyGoal.value,10,600,120),
        fontScale:form.fontScale.value,
        contrast:form.contrast.value,
        compact:form.compact.checked,
        reduceMotion:form.reduceMotion.checked,
        autoSync:form.autoSync.checked,
        notifications:form.notifications.checked
      };
      store.set('user:preferences',prefs);
      applyPreferenceClasses(prefs);
      window.BAWSALA_FRONTEND?.applyPreferences?.(prefs);
      if(form.language.value!==oldLanguage){
        store.set('language',form.language.value);
        ui.applyLanguageMeta();
        ui.refreshShell?.();
        window.BAWSALA_I18N?.apply();
        window.dispatchEvent(new CustomEvent('mt:language',{detail:{language:form.language.value}}));
      }
      if(form.theme.value!==oldTheme) ui.setTheme(form.theme.value,e.submitter || form.theme);
      else store.set('theme',form.theme.value);
      if(backend?.state?.authenticated){
        try{
          await backend.updateAccount({language:form.language.value,theme:form.theme.value});
          if(prefs.autoSync) await backend.saveSnapshot();
        }catch(_){/* local settings stay saved even when account sync fails */}
      }
      note(ui.lang()==='en'?'Settings saved without reloading the page.':'تم حفظ الإعدادات بدون إعادة تحميل الصفحة.','success');
      });
    });
    form.reduceMotion?.addEventListener('change',()=>{
      document.body.classList.toggle('reduced-motion-ui',form.reduceMotion.checked);
    });
    document.getElementById('exportSettings')?.addEventListener('click',()=>{store.downloadBackup();renderRestorePoints();});
    document.getElementById('importSettings')?.addEventListener('change',async e=>{ const file=e.target.files?.[0]; if(!file) return; try{ await store.importBackup(file); note('تم استيراد النسخة الاحتياطية ذرياً مع نقطة رجوع.','success'); load(); renderRestorePoints(); }catch(err){ const messages={UNSUPPORTED_BACKUP_VERSION:'إصدار النسخة غير مدعوم.',PERSISTENT_STORAGE_UNAVAILABLE:'التخزين الدائم غير متاح؛ لم نغيّر البيانات.',RESTORE_ROLLBACK_FAILED:'فشل الاستيراد وفشل rollback. توقف عن استخدام الصفحة وصدّر ما يمكن فوراً.'}; note(messages[err.message]||'ملف النسخة غير صالح أو فشل الاستيراد، وتم الحفاظ على الحالة السابقة.','danger'); } });
    document.getElementById('clearLocalBtn')?.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'مسح بيانات هذا المتصفح؟',message:'هذا يمسح بيانات بوصلة المحلية على هذا الجهاز. النسخة الاحتياطية هي طريق الرجوع الوحيد.',confirmText:'امسح البيانات',danger:true}); if(ok){ store.clearAll(); location.href='../index.html'; } });
    document.getElementById('syncNow')?.addEventListener('click',async()=>{ try{ await backend.saveSnapshot(); note('تمت المزامنة مع الحساب.','success'); }catch(_){ note('سجل الدخول لاستخدام المزامنة.','danger'); } });
    form.fontScale?.addEventListener('change',()=>window.BAWSALA_FRONTEND?.applyPreferences?.({...store.get('user:preferences',{}),fontScale:form.fontScale.value,contrast:form.contrast.value,compact:form.compact.checked,reduceMotion:form.reduceMotion.checked}));
    form.contrast?.addEventListener('change',()=>window.BAWSALA_FRONTEND?.applyPreferences?.({...store.get('user:preferences',{}),fontScale:form.fontScale.value,contrast:form.contrast.value,compact:form.compact.checked,reduceMotion:form.reduceMotion.checked}));
    load();
    renderRestorePoints();
  });
})();
