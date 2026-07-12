(function(){
  const data=window.MT_DATA;
  function analyze(form){
    const budget=form.budget.value;
    const level=form.level.value;
    const hours=Number(form.hours.value||0);
    const problem=form.problem.value;
    const exam=form.exam.value;
    const track=form.track.value;
    const studentCase=String(form.studentCase?.value||'').toLowerCase();
    let title='ابدأ بمسار مجاني مضبوط';
    let badge='green';
    let decisionLevel='خطة تأسيس';
    let plan=[];
    let filterCost='free';
    let filterType='official';

    const urgent=exam==='soon' || (exam==='month' && level==='lost') || hours<1;
    if(track==='btec'){
      title='مسار BTEC: افهم المعيار قبل أي مصدر'; badge='blue'; decisionLevel=urgent?'تدخل عاجل':'خطة معيار وتسليم'; filterType='btec'; filterCost='mixed';
      plan=['حدد كلمة الأمر في المعيار','حوّل المطلوب إلى قائمة تحقق','اكتب مسودة من عملك أنت','راجع الدليل المطلوب قبل التسليم'];
    }else if(problem==='practice' || /حل|أسئلة|نماذج|سنوات|practice|questions/.test(studentCase)){
      title='توقف عن جمع الشرح وابدأ التدريب'; badge='teal'; decisionLevel=urgent?'تدريب عاجل':'خطة تدريب'; filterType='practice'; filterCost='mixed';
      plan=['راجع قانوناً أو فكرة واحدة فقط','حل 20–25 سؤالاً بمؤقت','سجل سبب كل خطأ','أعد حل الأخطاء بعد 48 ساعة'];
    }else if(problem==='discipline'){
      title='مشكلتك نظام تنفيذ، لا نقص مصادر'; badge='gray'; decisionLevel='إعادة ضبط التنفيذ';
      plan=['مهمة واحدة يومياً لمدة سبعة أيام','جلسة أو جلستان فقط','أغلق اليوم بقرار الغد','لا تشترِ مصدراً جديداً قبل إتمام الأسبوع'];
    }else if(budget==='paid' && level!=='good'){
      title='شراء مصدر مسموح، لكن بعد اختبار حقيقي'; badge='red'; decisionLevel=urgent?'قرار شراء عالي المخاطرة':'قرار شراء مشروط'; filterCost='paid'; filterType='platform';
      plan=['جرّب درساً مجانياً','اطلب خطة أسبوعية واضحة','ادفع لمصدر واحد فقط','أوقف الاشتراك إذا لم تنفذ خلال أسبوعين'];
    }else{
      decisionLevel=urgent?'إنقاذ قصير المدى':'خطة تأسيس';
      plan=['ابدأ بمرجع رسمي أو مجاني','نفذ درساً واحداً ثم أسئلة','استخدم دفتر الأخطاء من أول جلسة','أجّل أي شراء 72 ساعة'];
    }

    if(urgent){ badge=badge==='gray'?'red':badge; plan.unshift('قلّص النطاق إلى درس واحد ومخرج واحد اليوم'); }
    const resources=data.resources.filter(r=>(track==='btec'?r.track==='btec'||r.track==='all':r.track!=='btec')&&(r.cost===filterCost||filterCost==='mixed'||r.cost==='mixed'||r.type===filterType)).slice(0,4);
    return {title,badge,decisionLevel,plan,resources,createdAt:new Date().toISOString(),raw:Object.fromEntries(new FormData(form))};
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE,ui=window.MT_UI;
    const form=document.getElementById('advisorForm');
    const result=document.getElementById('advisorResult');
    const quick=store.get('advisor:quickPrompt','');
    if(quick&&document.getElementById('studentCase'))document.getElementById('studentCase').value=quick;

    function render(res){
      res=window.MT_SECURITY.sanitizeForKey('advisor:last',res,null)||res;
      const cls=['red','blue','teal','gray','green'].includes(res.badge)?res.badge:'green';
      const decisionLevel=res.decisionLevel||'قرار عملي';
      result.innerHTML=`<span class="badge ${cls}">${ui.escapeHTML(decisionLevel)}</span><h2 class="recommendation-title">${ui.escapeHTML(res.title)}</h2><p class="muted">هذا قرار مبني على قواعد واضحة ومدخلاتك، وليس ذكاءً اصطناعياً ولا قياساً نفسياً. اختبره 72 ساعة ثم عدّله.</p><h3>الخطة المختصرة</h3><ul class="list">${res.plan.map(x=>`<li>${ui.escapeHTML(x)}</li>`).join('')}</ul><h3>مصادر مناسبة</h3><div class="grid">${res.resources.map(r=>`<article class="card compact"><strong>${ui.escapeHTML(r.name)}</strong><p class="fine">${ui.escapeHTML(r.fit)}</p><a class="btn sm" href="${ui.escapeAttr(ui.safeURL(r.url))}" target="_blank" rel="noopener noreferrer">افتح المصدر</a></article>`).join('')}</div><div class="actions"><button class="btn secondary" id="copyDecision" type="button">نسخ القرار</button><a class="btn primary" href="workspace.html#mission">حوّله إلى مهمة</a></div>`;
      document.getElementById('copyDecision')?.addEventListener('click',()=>ui.copyText(`${decisionLevel}: ${res.title}\n- ${res.plan.join('\n- ')}`,'تم نسخ القرار'));
    }

    const last=store.get('advisor:last',null);if(last)render(last);
    form?.addEventListener('submit',async event=>{event.preventDefault();const res=analyze(form);const saved=await window.MT_API.saveAdvisorResult(res);render(saved);ui.toast('تم حفظ القرار محلياً');});
  });
})();
