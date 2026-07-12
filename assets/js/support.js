(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body.dataset.supportBound==='1')return;
    document.body.dataset.supportBound='1';
    const store=window.MT_STORE,ui=window.MT_UI,sec=window.MT_SECURITY,backend=window.BAWSALA_BACKEND;
    const form=document.getElementById('supportForm');
    const list=document.getElementById('supportTickets');
    const gate=document.getElementById('supportAuthGate');
    const status=document.getElementById('supportFormStatus');
    const CACHE_KEY='support:tickets-cache';
    const labels={technical:'عطل تقني',account:'الحساب والدخول',sync:'المزامنة والبيانات',billing:'الفوترة',privacy:'الخصوصية والحذف',suggestion:'اقتراح'};
    const priorities={normal:'عادية',high:'مرتفعة'};
    let user=null;
    let serverTickets=Array.isArray(store.get(CACHE_KEY,[]))?store.get(CACHE_KEY,[]):[];

    function tickets(){return [...serverTickets].sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));}
    function cacheTickets(){store.set(CACHE_KEY,tickets().slice(0,200));}
    function setStatus(message,type=''){if(!status)return;status.textContent=message;status.className='fine '+(type?`text-${type}`:'');}
    function ticketCard(item){
      const badge=item.status==='تم الحل'?'green':item.status==='قيد المتابعة'?'teal':'blue';
      const note=item.adminNote?`<div class="support-staff-note"><strong>رد فريق الدعم</strong><p>${ui.escapeHTML(item.adminNote)}</p></div>`:'';
      return `<article class="card support-ticket" data-ticket-id="${ui.escapeAttr(item.id)}"><header class="support-ticket__head"><div class="support-ticket__meta"><span class="badge ${badge}">${ui.escapeHTML(item.status||'جديدة')}</span><span class="badge ${item.priority==='high'?'red':'gray'}">${ui.escapeHTML(priorities[item.priority]||'عادية')}</span></div><time datetime="${ui.escapeAttr(item.createdAt||'')}">${ui.escapeHTML((item.createdAt||'').slice(0,10))}</time></header><h3>${ui.escapeHTML(item.title||'طلب دعم')}</h3><p class="fine">${ui.escapeHTML(labels[item.category]||item.category||'عام')}</p><p class="muted">${ui.escapeHTML(item.details||'')}</p>${note}<footer class="support-ticket__footer"><small>رقم الطلب: ${ui.escapeHTML(String(item.id||'').slice(-8))}</small>${item.status==='تم الحل'?'':`<button class="btn sm secondary" type="button" data-ticket-close="${ui.escapeAttr(item.id)}">اعتبار الطلب محلولًا</button>`}</footer></article>`;
    }
    function render(){
      if(!list)return;
      const items=tickets();
      list.innerHTML=items.length?items.map(ticketCard).join(''):'<div class="empty"><h3>لا توجد طلبات دعم بعد.</h3><p>استخدم النموذج أعلاه عند وجود عطل أو مشكلة حساب حقيقية.</p></div>';
      list.querySelectorAll('[data-ticket-close]').forEach(btn=>btn.addEventListener('click',async()=>{
        ui.setBusy(btn,true,'جارٍ الإغلاق…');
        try{
          const result=await backend.updateSupportTicket(btn.dataset.ticketClose,{status:'تم الحل'});
          serverTickets=serverTickets.map(item=>item.id===result.ticket.id?result.ticket:item);
          cacheTickets();render();ui.toast('تم إغلاق الطلب.');
        }catch(err){ui.toast(err?.userMessage||'تعذر إغلاق الطلب. أعد المحاولة بعد استقرار الاتصال.');}
        finally{ui.setBusy(btn,false);}
      }));
    }
    async function loadTickets(){
      try{
        const result=await backend.supportTickets();
        serverTickets=Array.isArray(result?.tickets)?result.tickets:[];
        cacheTickets();render();setStatus('تم تحديث الطلبات من الخادم.','success');
        return true;
      }catch(err){
        render();
        setStatus(navigator.onLine?'تعذر تحميل طلبات الدعم من الخادم.':'أنت دون اتصال؛ المعروض نسخة قراءة مخزنة فقط.','danger');
        return false;
      }
    }
    async function ensureAccount({refresh=false}={}){
      try{user=await backend.me();}catch(_){user=null;}
      const authenticated=!!backend.state.authenticated&&!!user;
      if(gate){
        gate.hidden=authenticated;
        gate.innerHTML=authenticated?'':'<strong>سجل الدخول لفتح طلب دعم مرتبط بحسابك.</strong><p>طلبات الدعم لا تُقبل بشكل مجهول حتى لا يتحول المركز إلى باب إساءة استخدام.</p><a class="btn primary" href="login.html?next=support.html">تسجيل الدخول</a>';
      }
      form?.querySelectorAll('input,select,textarea,button').forEach(el=>{el.disabled=!authenticated;});
      if(!authenticated){render();return false;}
      if(refresh)await loadTickets();else render();
      return true;
    }
    form?.addEventListener('submit',async event=>{
      event.preventDefault();
      const f=event.currentTarget;
      if(!await ensureAccount())return;
      const subject=sec.cleanText(f.elements.namedItem('subject')?.value,140);
      const message=sec.cleanMultiline(f.elements.namedItem('message')?.value,6000);
      const consent=!!f.elements.namedItem('consent')?.checked;
      if(subject.length<6||message.length<20){setStatus('اكتب عنوانًا واضحًا وتفاصيل لا تقل عن 20 حرفًا.','danger');return;}
      if(!consent){setStatus('يجب تأكيد أن الرسالة لا تحتوي كلمة مرور أو رمز تحقق أو بيانات بطاقة.','danger');return;}
      const submit=f.querySelector('button[type="submit"]');ui.setBusy(submit,true,'جارٍ الإرسال…');setStatus('جارٍ إرسال الطلب إلى الخادم…');
      try{
        const result=await backend.createSupportTicket({
          category:f.elements.namedItem('category')?.value,
          priority:f.elements.namedItem('priority')?.value,
          title:subject,details:message,consent:true
        });
        serverTickets=[result.ticket,...serverTickets.filter(item=>item.id!==result.ticket.id)];
        cacheTickets();render();f.reset();setStatus('تم إرسال الطلب إلى فريق الدعم.','success');ui.toast('تم إرسال طلب الدعم.');
      }catch(err){
        setStatus(err?.userMessage||'لم يُرسل الطلب. تحقق من الاتصال ثم أعد المحاولة؛ لم نسجله كطلب ناجح محليًا.','danger');
      }finally{ui.setBusy(submit,false);}
    });
    document.getElementById('refreshSupport')?.addEventListener('click',async event=>{
      ui.setBusy(event.currentTarget,true,'جارٍ التحديث…');
      try{if(await ensureAccount())await loadTickets();}
      finally{ui.setBusy(event.currentTarget,false);}
    });
    ensureAccount({refresh:true});
    window.addEventListener('bawsala:auth',()=>ensureAccount({refresh:true}));
  });
})();
