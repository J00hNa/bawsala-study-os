(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE, ui=window.MT_UI;
    const grid=document.getElementById('profilesGrid'), activeBox=document.getElementById('activeProfileBox');
    function render(){ const profiles=store.getProfiles(); const active=store.activeProfile(); if(activeBox){ activeBox.innerHTML=`<div class="profile-hero"><span class="avatar-big">${ui.escapeHTML(active.avatar||'◆')}</span><div><span class="badge green">البروفايل النشط</span><h2>${ui.escapeHTML(active.name)}</h2><p class="muted">${ui.escapeHTML(active.grade)} · ${ui.escapeHTML(active.track)} · هدف ${ui.clampNumber(active.goal,0,100,80)}%</p></div></div>`; }
      grid.innerHTML=profiles.map(p=>`<article class="card profile-card ${p.id===active.id?'selected':''}"><div class="profile-row"><span class="avatar">${ui.escapeHTML(p.avatar||'●')}</span><div><h3>${ui.escapeHTML(p.name)}</h3><p class="fine">${ui.escapeHTML(p.grade)} · ${ui.escapeHTML(p.track)} · ${ui.escapeHTML(p.status)}</p></div></div><div class="pill-row"><span class="pill">هدف: ${ui.clampNumber(p.goal,0,100,80)}%</span><span class="pill">ساعات: ${ui.clampNumber(p.dailyHours,0,14,2)}</span><span class="pill">ضعف: ${ui.escapeHTML(p.weakSubject||'غير محدد')}</span></div><div class="actions"><button class="btn sm primary" data-active="${ui.escapeAttr(p.id)}" type="button">تفعيل</button><button class="btn sm danger" data-delete="${ui.escapeAttr(p.id)}" type="button">حذف</button></div></article>`).join('');
      grid.querySelectorAll('[data-active]').forEach(btn=>btn.addEventListener('click',()=>{store.setActiveProfile(btn.dataset.active); render(); ui.toast('تم تغيير البروفايل');}));
      grid.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'حذف هذا البروفايل؟',message:'ستبقى النسخة الاحتياطية هي الحل الوحيد لاسترجاعه. لا تحذف بروفايل طالب بالخطأ.',confirmText:'حذف البروفايل',danger:true}); if(ok){ store.deleteProfile(btn.dataset.delete); render(); } }));
    }
    document.getElementById('profileForm')?.addEventListener('submit',(e)=>{ e.preventDefault(); const f=e.currentTarget; const profile={id:store.cryptoId(), name:f.profileName.value, track:f.profileTrack.value, grade:f.profileGrade.value, goal:f.profileGoal.value, weakSubject:f.weakSubject.value, dailyHours:f.dailyHours.value, avatar:f.avatar.value || '◆', status:'نشط', createdAt:new Date().toISOString()}; store.saveProfile(profile); f.reset(); render(); ui.toast('تم إنشاء البروفايل'); });
    render();
  });
})();
