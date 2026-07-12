(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const data=window.MT_DATA, store=window.MT_STORE, api=window.MT_API, ui=window.MT_UI;
    const homeworkList=document.getElementById('homeworkList');
    async function renderHomework(){
      const list=store.get('homeworks',[]);
      document.getElementById('hwOpen').textContent=list.filter(x=>!x.done).length;
      document.getElementById('hwDone').textContent=list.filter(x=>x.done).length;
      homeworkList.innerHTML=list.length?list.map(t=>`<article class="card compact homework-row ${t.done?'done':''}"><label class="checkline"><input type="checkbox" data-done="${ui.escapeAttr(t.id)}" ${t.done?'checked':''}> منجز</label><div><strong>${ui.escapeHTML(t.title)}</strong><p class="fine">${ui.escapeHTML(t.subject)} · ${ui.escapeHTML(t.due||'بدون موعد')} · ${ui.escapeHTML(t.priority)}</p></div><button class="btn danger sm" data-del="${ui.escapeAttr(t.id)}" type="button">حذف</button></article>`).join(''):'<div class="empty">لا توجد واجبات. أضف واجباً صغيراً بدل خطة ضخمة.</div>';
      homeworkList.querySelectorAll('[data-done]').forEach(ch=>ch.addEventListener('change',()=>{ store.updateCollection('homeworks',ch.dataset.done,item=>({...item,done:ch.checked})); renderHomework(); }));
      homeworkList.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',()=>{ store.deleteFromCollection('homeworks',btn.dataset.del); renderHomework(); }));
    }
    document.getElementById('homeworkForm')?.addEventListener('submit',async(e)=>{ e.preventDefault(); const f=e.currentTarget; await api.saveHomework({title:f.hwTitle.value,subject:f.hwSubject.value,due:f.hwDue.value,priority:f.hwPriority.value,done:false}); f.reset(); ui.toast('تم حفظ الواجب'); renderHomework(); });
    document.getElementById('copyToday')?.addEventListener('click',()=>{ const open=store.get('homeworks',[]).filter(x=>!x.done).slice(0,6); ui.copyText(open.map(x=>`- ${x.title} (${x.subject})`).join('\n')||'لا توجد واجبات مفتوحة','تم نسخ واجبات اليوم'); });
    renderHomework();

    const roundsEl=document.getElementById('roundsList');
    document.getElementById('roundsForm')?.addEventListener('submit',(e)=>{ e.preventDefault(); const f=e.currentTarget; const count=ui.clampNumber(f.roundCount.value,1,8,3); const minutes=ui.clampNumber(f.roundMinutes.value,10,90,35); const arr=Array.from({length:count},(_,i)=>({id:store.cryptoId(),subject:window.MT_SECURITY.cleanText(f.roundSubject.value,80)||'مادة عامة',goal:window.MT_SECURITY.cleanText(f.roundGoal.value,180)||'مراجعة مركزة',minutes,index:i+1,done:false})); store.set('rounds',arr); renderRounds(); });
    function renderRounds(){
      const rounds=store.get('rounds',[]);
      roundsEl.innerHTML=rounds.length?rounds.map(r=>`<article class="card compact round-card"><strong>${ui.clampNumber(r.index,1,20,1)}</strong><div><h3>${ui.escapeHTML(r.subject)}</h3><p class="muted">${ui.escapeHTML(r.goal)}</p><div class="inline"><span class="pill">${ui.clampNumber(r.minutes,10,120,35)} دقيقة</span><button class="btn sm ${r.done?'secondary':''}" data-round="${ui.escapeAttr(r.id)}" type="button">${r.done?'تمت':'أنجز الجولة'}</button></div></div></article>`).join(''):'<div class="empty">ولّد جولات دراسة قصيرة. التركيز لا يأتي من جدول مزدحم.</div>';
      roundsEl.querySelectorAll('[data-round]').forEach(btn=>btn.addEventListener('click',()=>{ store.updateCollection('rounds',btn.dataset.round,x=>({...x,done:!x.done})); renderRounds(); }));
    }
    renderRounds();
    const lectures=document.getElementById('lecturesGrid');
    lectures.innerHTML=data.lectures.map(l=>`<article class="card lecture-card"><span class="badge blue">${ui.escapeHTML(l.area)}</span><h3>${ui.escapeHTML(l.title)}</h3><p class="muted">${ui.escapeHTML(l.takeaway)}</p><div class="mini-meta"><span>${ui.clampNumber(l.duration,1,240,20)} دقيقة</span><span>${ui.escapeHTML(l.level)}</span></div><button class="btn sm" type="button" data-topic="${ui.escapeAttr(l.title)}">اقترح محاور المحاضرة</button></article>`).join('');
    lectures.querySelectorAll('[data-topic]').forEach(btn=>btn.addEventListener('click',()=>ui.copyText(`محاور مقترحة لمحاضرة: ${btn.dataset.topic}\n1. المشكلة\n2. مثال من واقع الطالب\n3. خطوات عملية\n4. تمرين قصير\n5. ملخص قابل للتطبيق`,'تم نسخ محاور المحاضرة')));
  });
})();
