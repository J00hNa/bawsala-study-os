(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const backend=window.BAWSALA_BACKEND, ui=window.MT_UI;
    const status=document.getElementById('billingStatus');
    const plans=document.getElementById('planGrid');
    const summary=document.getElementById('billingSummary');
    const gatesBox=document.getElementById('featureGateList');
    const invoiceList=document.getElementById('invoiceList');
    const configBox=document.getElementById('paymentConfigStatus');
    const savingsBox=document.getElementById('yearlySavings');
    function setStatus(text,type='info'){ if(status){ status.className='notice '+type; status.textContent=text; } }
    function money(minor,currency='JOD',minorUnit=3){ const divisor=10**Math.max(0,Math.min(4,Number(minorUnit??3))); try{return new Intl.NumberFormat('ar-JO',{style:'currency',currency:String(currency||'JOD').toUpperCase(),minimumFractionDigits:minorUnit,maximumFractionDigits:minorUnit}).format(Number(minor||0)/divisor);}catch(_){return (Number(minor||0)/divisor).toFixed(minorUnit)+' '+String(currency||'JOD');} }
    function fmtDate(value){ if(!value) return '—'; try{ return new Date(value).toLocaleDateString('ar-JO',{year:'numeric',month:'short',day:'numeric'}); }catch(_){ return '—'; } }
    function gateLabel(key){ return ({adsEnabled:'إعلانات للخطة المجانية',premiumResources:'مصادر مدفوعة',advancedReports:'تقارير متقدمة',expandedReminders:'تنبيهات موسعة',prioritySupport:'أولوية دعم'})[key]||key; }
    function renderSummary(billing){
      const sub=billing.subscription||{};
      if(summary) summary.innerHTML=`<article class="card"><span class="badge ${sub.status==='active'||sub.status==='canceling'?'green':'blue'}">${ui.escapeHTML(sub.status||'free')}</span><h2>${ui.escapeHTML(sub.planName||sub.plan||'Free')}</h2><p class="muted">الخطة الحالية: ${ui.escapeHTML(sub.plan||'free')} · التجديد/نهاية الفترة: ${fmtDate(sub.renewal||sub.currentPeriodEnd)}</p><p class="muted">فشل الدفع: ${Number(sub.paymentFailureCount||0)} · الإلغاء عند نهاية الفترة: ${sub.cancelAtPeriodEnd?'نعم':'لا'}</p></article>`;
      const provider=billing.provider||{};
      if(configBox) configBox.innerHTML=`<article class="card"><h2>حالة مزود الدفع</h2><p class="muted">Provider: ${ui.escapeHTML(provider.provider||'none')} · Mode: ${ui.escapeHTML(provider.mode||'stubbed-foundation')}</p><ul class="list"><li>Checkout: ${provider.checkoutConfigured?'معد':'غير معد'}</li><li>Webhook: ${provider.webhookConfigured?'معد':'غير معد'}</li><li>Portal: ${provider.portalConfigured?'معد':'غير معد'}</li></ul>${provider.warning?`<p class="notice danger">${ui.escapeHTML(provider.warning)}</p>`:''}</article>`;
      const gates=billing.gates||{};
      if(gatesBox){
        const rows=['adsEnabled','premiumResources','advancedReports','expandedReminders','prioritySupport'].map(k=>`<li><strong>${gateLabel(k)}:</strong> ${gates[k]?'مفتوح':'مغلق'}</li>`).join('');
        gatesBox.innerHTML=`<article class="card"><h2>Feature gates</h2><ul class="list">${rows}</ul></article>`;
      }
      const invoices=(billing.history&&billing.history.invoices)||[];
      if(invoiceList){
        invoiceList.innerHTML=invoices.length?`<div class="table-wrap"><table><thead><tr><th>الفاتورة</th><th>الخطة</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>${invoices.map(inv=>`<tr><td>${ui.escapeHTML(inv.number||inv.id)}</td><td>${ui.escapeHTML(inv.planId)}</td><td>${money(inv.amountMinor??inv.amountCents,inv.currency,inv.minorUnit??3)}</td><td>${ui.escapeHTML(inv.status)}</td><td>${fmtDate(inv.createdAt)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">لا توجد فواتير بعد. هذا طبيعي قبل تفعيل webhook حقيقي.</p>';
      }
    }
    function renderSavings(pricing){
      if(!savingsBox||!pricing) return;
      savingsBox.textContent=`السعر السنوي ${money(pricing.yearlyMinor??pricing.yearlyCents,pricing.currency,pricing.minorUnit??3)} بدل ${money(pricing.annualizedMonthlyMinor??pricing.annualizedMonthlyCents,pricing.currency,pricing.minorUnit??3)} عند الدفع الشهري سنة كاملة. الخصم: ${pricing.yearlyDiscountPercent}%.`;
    }
    async function render(){
      try{
        const [planData, billing]=await Promise.all([backend.request('/api/billing/plans'), backend.request('/api/billing/status').catch(err=>({authenticated:false,error:err.message}))]);
        const current=billing.subscription?.plan||'free';
        const state=billing.subscription?.status||'free';
        renderSavings(planData.pricing);
        if(billing.authenticated===false){
          setStatus('سجل الدخول لإدارة الاشتراك.','danger');
        }else{
          setStatus('حالة الاشتراك: '+state+' · الخطة: '+current, ['active','canceling'].includes(state)?'success':'info');
          renderSummary(billing);
        }
        if(plans) plans.innerHTML=planData.plans.map(plan=>`<article class="card pricing-card ${plan.id===current?'focus-card':''}"><span class="badge ${plan.paid?'blue':'green'}">${plan.badge}</span><h2>${ui.escapeHTML(plan.name)}</h2><p class="muted">${ui.escapeHTML(plan.summary)}</p><p class="price">${plan.paid?money(plan.priceMinor??plan.priceCents,plan.currency,plan.minorUnit??3):'0 JOD'} <span>${ui.escapeHTML(plan.intervalLabel)}</span></p><ul class="list">${plan.features.map(x=>`<li>${ui.escapeHTML(x)}</li>`).join('')}</ul><button class="btn ${plan.paid?'primary':'secondary'} full" data-plan="${ui.escapeAttr(plan.id)}" type="button">${plan.id===current?'الخطة الحالية':(plan.paid?'اختيار الخطة':'البقاء مجاناً')}</button></article>`).join('');
        plans?.querySelectorAll('[data-plan]').forEach(btn=>btn.addEventListener('click',async()=>{
          const planId=btn.dataset.plan;
          if(planId==='free'){ setStatus('الخطة المجانية مفعّلة افتراضياً.','info'); return; }
          try{
            const data=await backend.request('/api/billing/checkout',{method:'POST',body:{planId}});
            if(data.checkoutUrl){ location.href=data.checkoutUrl; return; }
            setStatus(data.message||'الدفع غير مفعّل بعد. أضف مفاتيح مزوّد الدفع وwebhook أولاً.','danger');
          }catch(err){ setStatus(err.message==='UNAUTHORIZED'?'سجل الدخول أولاً.':err.message==='EMAIL_VERIFICATION_REQUIRED'?'أكد بريدك أولاً قبل الدفع.':'تعذر بدء الدفع.','danger'); }
        }));
      }catch(_){ setStatus('تعذر تحميل خطط الاشتراك.','danger'); }
    }
    document.getElementById('cancelSubscription')?.addEventListener('click',async()=>{ try{ const ok=await ui.confirmAction({title:'إلغاء التجديد؟',message:'سيتم إلغاء التجديد من مزود الدفع، وليس حذف الحساب.',confirmText:'إلغاء التجديد',danger:true}); if(!ok) return; const data=await backend.request('/api/billing/cancel',{method:'POST'}); if(data.portalUrl){ location.href=data.portalUrl; return; } setStatus(data.message||'تم تسجيل طلب الإلغاء.','success'); await render(); }catch(err){ setStatus(err.message==='NO_PAID_SUBSCRIPTION'?'لا يوجد اشتراك مدفوع لإلغائه.':err.message==='BILLING_CUSTOMER_NOT_FOUND'?'لا يوجد عميل فوترة مرتبط بهذا الحساب.':'تعذر إلغاء التجديد.','danger'); } });
    document.getElementById('billingPortal')?.addEventListener('click',async()=>{ try{ const data=await backend.request('/api/billing/portal',{method:'POST'}); if(data.portalUrl){ location.href=data.portalUrl; return; } setStatus(data.message||'بوابة الفوترة غير معدة.','danger'); }catch(_){ setStatus('تعذر فتح بوابة الفوترة.','danger'); } });
    render();
  });
})();
