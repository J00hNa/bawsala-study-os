(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE,api=window.MT_API,ui=window.MT_UI;
    const groupsEl=document.getElementById('groupsList'),problemsEl=document.getElementById('problemsList');

    async function renderGroups(){
      const groups=await api.listGroups();
      groupsEl.innerHTML=groups.length?groups.map(g=>`<article class="card group-card"><span class="badge gray">محلي على هذا الجهاز</span><h3>${ui.escapeHTML(g.name)}</h3><p class="muted">${ui.escapeHTML(g.goal||'لا يوجد هدف مكتوب')}</p><div class="mini-meta"><span>${ui.escapeHTML(g.subject||'عام')}</span><span>${ui.escapeHTML(g.track||'عام')}</span><span>سعة مخططة: ${ui.clampNumber(g.capacity,2,80,6)}</span></div><div class="actions"><button class="btn sm ${g.joined?'secondary':''}" data-plan-group="${ui.escapeAttr(g.id)}" type="button">${g.joined?'إزالة من خطتي':'إضافتها لخطتي'}</button><button class="btn danger sm" data-delete-group="${ui.escapeAttr(g.id)}" type="button">حذف</button></div></article>`).join(''):'<div class="empty">لا توجد خطط مجموعات محلية. أنشئ واحدة فقط عندما تعرف الأشخاص والهدف خارج بوصلة.</div>';
      groupsEl.querySelectorAll('[data-plan-group]').forEach(btn=>btn.addEventListener('click',()=>{store.updateCollection('groups',btn.dataset.planGroup,g=>({...g,joined:!g.joined}));renderGroups();ui.toast('تم تحديث خطتك المحلية');}));
      groupsEl.querySelectorAll('[data-delete-group]').forEach(btn=>btn.addEventListener('click',async()=>{const ok=await ui.confirmAction({title:'حذف خطة المجموعة؟',message:'سيتم حذفها من هذا الجهاز فقط.',confirmText:'حذف',danger:true});if(!ok)return;store.deleteFromCollection('groups',btn.dataset.deleteGroup);renderGroups();}));
    }

    document.getElementById('groupForm')?.addEventListener('submit',async event=>{
      event.preventDefault();const f=event.currentTarget;
      await api.saveGroup({name:f.groupName.value,subject:f.groupSubject.value,track:f.groupTrack.value,capacity:f.groupCapacity.value,goal:f.groupGoal.value,joined:true,localOnly:true});
      f.reset();renderGroups();ui.toast('تم حفظ خطة المجموعة على هذا الجهاز');
    });

    async function renderProblems(){
      const list=await api.listProblems();
      document.getElementById('problemCount').textContent=list.length;
      problemsEl.innerHTML=list.length?list.map(p=>`<article class="card compact problem-row"><span class="badge ${p.status==='تم الحل'?'green':p.privacy==='anonymous'?'gray':'blue'}">${ui.escapeHTML(p.status||'جديدة')}</span><div><strong>${ui.escapeHTML(p.title)}</strong><p class="fine">${ui.escapeHTML(p.category||'عام')} · ${p.privacy==='anonymous'?'بدون اسم':ui.escapeHTML(p.name||'بدون اسم')}</p><p class="muted">${ui.escapeHTML(p.details)}</p><p class="fine">محفوظة لهذا البروفايل، وليست منشوراً عاماً.</p></div><div class="actions"><button class="btn sm" data-wa="${ui.escapeAttr(p.id)}" type="button">إرسال للدعم عبر واتساب</button><button class="btn danger sm" data-del="${ui.escapeAttr(p.id)}" type="button">حذف</button></div></article>`).join(''):'<div class="empty">لا توجد ملاحظات خاصة محفوظة لهذا البروفايل.</div>';
      problemsEl.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',()=>{store.deleteFromCollection('problems',btn.dataset.del);renderProblems();}));
      problemsEl.querySelectorAll('[data-wa]').forEach(btn=>btn.addEventListener('click',()=>{const p=store.get('problems',[]).find(x=>x.id===btn.dataset.wa);if(p)ui.openWhatsApp(`طلب دعم من بوصلة\nالعنوان: ${p.title}\nالفئة: ${p.category}\nالتفاصيل: ${p.details}\nالاسم: ${p.name||'غير مذكور'}`);}));
    }

    document.getElementById('problemForm')?.addEventListener('submit',async event=>{
      event.preventDefault();const f=event.currentTarget;
      await api.saveProblem({privacy:f.privacy.value,visibility:'student-admin',title:f.problemTitle.value,category:f.problemCategory.value,name:f.studentName.value,contact:f.studentContact.value,details:f.problemDetails.value,status:'جديدة'});
      f.reset();renderProblems();ui.toast('تم حفظ الملاحظة بشكل خاص');
    });

    renderGroups();renderProblems();
  });
})();
