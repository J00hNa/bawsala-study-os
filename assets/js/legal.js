(function(){
  async function mountLegal(){
    const status=document.getElementById('commerceLegalStatus');
    if(!status)return;
    const operatorDetails=document.getElementById('legalOperatorDetails');
    const billingState=document.getElementById('legalBillingState');
    const refundTerms=document.getElementById('legalRefundTerms');
    const contact=document.getElementById('legalContact');
    try{
      const response=await fetch('/api/legal/config',{headers:{Accept:'application/json'},credentials:'same-origin'});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error('LEGAL_CONFIG_UNAVAILABLE');
      const operator=data.operator;
      if(!operator){
        status.className='notice danger';
        status.textContent='الفوترة والبيع التجاري مقفّلان: بيانات المشغّل القانونية أو سياسة الاسترداد غير مكتملة في إعداد الخادم.';
        return;
      }
      status.className=data.commerceEnabled?'notice success':'notice';
      status.textContent=data.commerceEnabled?'البيع التجاري مفعّل بعد اكتمال هوية المشغّل وإعداد مزود الدفع.':'هوية المشغّل مكتملة، لكن الفوترة ما زالت مقفّلة حتى يكتمل مزود الدفع.';
      operatorDetails.replaceChildren();
      const rows=[['الاسم القانوني',operator.name],['العنوان',operator.address],['الاختصاص',operator.jurisdiction],['المعرّف الضريبي',operator.taxId]];
      for(const [label,value] of rows){const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=`${label}: `;p.append(strong,document.createTextNode(String(value||'—')));operatorDetails.append(p);}
      billingState.textContent=data.commerceEnabled?'الفوترة مفعّلة. السعر والعملة والفترة النهائية تظهر في صفحة الفوترة قبل التأكيد.':'لا يمكن إنشاء checkout حالياً؛ الخادم يرفضه حتى تكتمل بوابة الدفع الموثوقة.';
      refundTerms.textContent=`نافذة الاسترداد المعلنة: ${Number(operator.refundWindowDays)} يوم. نسخة السياسة: ${operator.refundPolicyVersion}. تبقى الحقوق الإلزامية في ${operator.jurisdiction} نافذة حتى إن كانت أوسع.`;
      contact.replaceChildren(document.createTextNode('البريد القانوني: '));const link=document.createElement('a');link.href=`mailto:${operator.contactEmail}`;link.textContent=operator.contactEmail;contact.append(link);
    }catch(_){
      status.className='notice danger';
      status.textContent='تعذر التحقق من بيانات المشغّل من الخادم. اعتبر الفوترة غير مفعّلة ولا ترسل أي دفعة.';
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountLegal,{once:true});else mountLegal();
})();
