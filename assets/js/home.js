(function(){
  document.addEventListener('DOMContentLoaded', async () => {
    const d=window.MT_DATA, s=window.MT_STORE, ui=window.MT_UI, api=window.MT_API;
    const stat=(id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
    const resources=await api.allResources();
    stat('mResources', resources.length);
    stat('mFree', resources.filter(r=>r.cost==='free').length);
    stat('mTasks', s.get('homeworks',[]).filter(t=>!t.done).length);
    stat('mProblems', s.get('problems',[]).length);
    stat('mSessions', s.get('study:sessions',[]).length);
    stat('mProfiles', s.getProfiles().length);
    const modules=[
      ['م','مهمة اليوم','اكتب مخرجاً واحداً قابلاً للقياس وحدد مصدرين كحد أقصى.','pages/workspace.html#mission','اكتب المهمة'],
      ['ت','جلسة التركيز','نفّذ المهمة بمؤقت واضح واحفظ جلسة حقيقية، لا مجرد نية.','pages/workspace.html#focus','ابدأ التركيز'],
      ['خ','دفتر الأخطاء','سجل سبب الخطأ وطريقة منعه حتى لا تعيد الغلطة نفسها.','pages/workspace.html#errors','سجل خطأ'],
      ['غ','إغلاق اليوم','راجع ما حدث واكتب قرار الغد قبل أن تنهي اليوم.','pages/workspace.html#review','أغلق اليوم']
    ];
    const grid=document.getElementById('moduleGrid');
    if(grid){ grid.innerHTML=modules.map(([icon,title,desc,href,cta],i)=>`<article class="card module-card"><div class="module-card__top"><span class="module-card__icon" aria-hidden="true">${ui.escapeHTML(icon.slice(0,1))}</span><span class="badge ${i%3===0?'teal':i%3===1?'blue':'gray'}">${String(i+1).padStart(2,'0')}</span></div><h3>${ui.escapeHTML(title)}</h3><p class="muted">${ui.escapeHTML(desc)}</p><a class="btn full" href="${ui.escapeAttr(ui.safeURL(href))}">${ui.escapeHTML(cta)}</a></article>`).join(''); }
    document.getElementById('quickDiagnostic')?.addEventListener('submit',(e)=>{ e.preventDefault(); const input=document.getElementById('quickPrompt'); const value=window.MT_SECURITY.cleanMultiline(input.value,900); if(!value){ui.toast('اكتب وضعك أولاً'); return;} s.set('advisor:quickPrompt',value); location.href='pages/advisor.html?from=quick'; });
    document.getElementById('homeDecisionForm')?.addEventListener('submit',(e)=>{
      e.preventDefault();
      const f=e.currentTarget;
      const purpose=window.MT_SECURITY.cleanMultiline(f.purpose.value,900).trim();
      if(!purpose){ ui.toast('اكتب قراراً حقيقياً. الدخول بدون قرار هو بداية التشتت.'); return; }
      const minutes=ui.clampNumber(f.minutes.value,10,180,30);
      const subject=window.MT_SECURITY.cleanText(f.subject.value,80);
      const sources=String(f.sources?.value || '').split(/[\n،,]+/).map(x=>window.MT_SECURITY.cleanText(x,120)).filter(Boolean).slice(0,2);
      s.set('dashboard:executionGuard',{purpose,minutes,sourceLimit:2,forbidden:'مصدر ثالث قبل إنهاء أول جلسة',blocker:'',updatedAt:new Date().toISOString()});
      window.BAWSALA_STUDY?.beginContext?.({kind:'home-decision',title:purpose,mission:purpose,subject,minutes,target:'focus',sources,rule:'مصدر ثالث قبل إنهاء أول جلسة',sourcePage:location.pathname});
      location.href='pages/workspace.html#focus';
    });
    const active=s.activeProfile(); const last=s.get('advisor:last',null); const recent=document.getElementById('recentActivity');
    if(recent){ recent.innerHTML=`<li>البروفايل النشط: <strong>${ui.escapeHTML(active.name)}</strong></li><li>آخر قرار: <strong>${last?ui.escapeHTML(last.title):'لا يوجد بعد'}</strong></li><li>واجبات مفتوحة: <strong>${s.get('homeworks',[]).filter(x=>!x.done).length}</strong></li><li>ملاحظات محفوظة: <strong>${s.get('notebook:notes',[]).length}</strong></li><li>جلسات تركيز: <strong>${s.get('study:sessions',[]).length}</strong></li>`; }
  });
})();
