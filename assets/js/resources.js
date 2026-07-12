(function(){
  document.addEventListener('DOMContentLoaded', async ()=>{
    const store=window.MT_STORE, ui=window.MT_UI, api=window.MT_API;
    let resources=await api.allResources();
    let selected=new Set(store.get('compare',[]));
    const grid=document.getElementById('resourcesGrid'), compare=document.getElementById('compareTable');
    const controls=['resSearch','resCost','resTrack','resType','resSubject'].map(id=>document.getElementById(id));
    const countEl=document.getElementById('resourceCount'),loadMore=document.getElementById('loadMoreResources');
    const PAGE_SIZE=8; let visibleCount=PAGE_SIZE;
    function arr(x){ return Array.isArray(x)?x.filter(Boolean):[]; }
    function matches(r){
      const q=(document.getElementById('resSearch')?.value||'').toLowerCase().trim();
      const cost=document.getElementById('resCost')?.value||'all';
      const track=document.getElementById('resTrack')?.value||'all';
      const type=document.getElementById('resType')?.value||'all';
      const subject=document.getElementById('resSubject')?.value||'all';
      const hay=[r.name,r.fit,r.risk,r.subject,r.type,r.cost,r.bestFor,r.notFor,r.useRule,...arr(r.pros),...arr(r.cons)].join(' ').toLowerCase();
      return (!q || hay.includes(q)) && (cost==='all'||r.cost===cost) && (track==='all'||r.track===track||r.track==='all') && (type==='all'||r.type===type) && (subject==='all'||r.subject===subject||subject==='عام');
    }
    function points(title, list, fallback){
      const rows=arr(list).length?arr(list):[fallback];
      return `<div class="resource-points"><strong>${ui.escapeHTML(title)}</strong><ul>${rows.map(x=>`<li>${ui.escapeHTML(x)}</li>`).join('')}</ul></div>`;
    }
    function linkAttrs(r){
      const href = ui.safeURL(r.url || 'resources.html');
      const external = /^https?:/i.test(href);
      return `href="${ui.escapeAttr(href)}"${external?' target="_blank" rel="noopener noreferrer"':''}`;
    }
    function render(){
      const list=resources.filter(matches).sort((a,b)=>b.score-a.score);
      const visible=list.slice(0,visibleCount);
      if(countEl)countEl.textContent=`عرض ${visible.length} من ${list.length} مصدراً. استخدم الفلاتر بدل التمرير العشوائي.`;
      if(loadMore){loadMore.hidden=visible.length>=list.length;loadMore.textContent=`عرض المزيد (${Math.min(PAGE_SIZE,list.length-visible.length)})`;}
      grid.innerHTML=list.length?visible.map(r=>`<article class="card resource-card ${selected.has(r.id)?'selected':''}">
        <div class="inline"><span class="badge ${r.cost==='free'?'green':r.cost==='paid'?'red':'teal'}">${ui.escapeHTML(r.cost==='free'?'مجاني':r.cost==='paid'?'مدفوع':'مختلط')}</span><span class="badge gray">${ui.escapeHTML(r.type)}</span><span class="badge blue">${ui.clampNumber(r.score,0,100,0)}%</span></div>
        <h3>${ui.escapeHTML(r.name)}</h3>
        <p class="muted">${ui.escapeHTML(r.fit)}</p>
        <div class="resource-detail-grid">
          ${points('المزايا', r.pros, r.fit || 'مفيد عند استخدامه بشكل صحيح')}
          ${points('السلبيات', r.cons, r.risk || 'تحقق قبل الاعتماد عليه')}
        </div>
        <p class="fine"><strong>يناسب:</strong> ${ui.escapeHTML(r.bestFor||'طالب يعرف لماذا يستخدم هذا المصدر.')}</p>
        <p class="fine"><strong>لا يناسب:</strong> ${ui.escapeHTML(r.notFor||'الطالب الذي يفتح مصادر بلا خطة.')}</p>
        <div class="notice"><strong>قاعدة الاستخدام:</strong> ${ui.escapeHTML(r.useRule||'حوّل المصدر إلى مهمة واضحة داخل غرفة الدراسة.')}</div>
        <div class="pill-row"><span class="pill">${ui.escapeHTML(r.track)}</span><span class="pill">${ui.escapeHTML(r.subject)}</span></div>
        <div class="actions"><button class="btn sm" data-compare="${ui.escapeAttr(r.id)}" type="button">${selected.has(r.id)?'إزالة من المقارنة':'قارن'}</button><button class="btn sm secondary" data-source-mission="${ui.escapeAttr(r.id)}" type="button">ابدأ به الآن</button><a class="btn sm" ${linkAttrs(r)}>فتح</a></div>
      </article>`).join(''):'<div class="empty">لا توجد نتائج. قلل الفلاتر.</div>';
      grid.querySelectorAll('[data-compare]').forEach(btn=>btn.addEventListener('click',()=>{ const id=btn.dataset.compare; selected.has(id)?selected.delete(id):selected.add(id); if(selected.size>3){ selected.delete([...selected][0]); ui.toast('المقارنة محدودة بثلاثة مصادر حتى يبقى القرار واضحاً'); } store.set('compare',[...selected]); render(); renderCompare(); }));
      grid.querySelectorAll('[data-source-mission]').forEach(btn=>btn.addEventListener('click',()=>{ const r=resources.find(x=>x.id===btn.dataset.sourceMission); if(!r) return; const text=`استخدم ${r.name}: ${r.useRule||'افتحه لهدف واحد فقط ثم سجل نتيجة.'}`; window.BAWSALA_STUDY?.beginContext?.({kind:'resource',entityId:r.id,title:r.name,mission:text,subject:r.subject||'عام',minutes:30,target:'focus',sources:[r.name],rule:r.useRule||'لا أفتح مصدراً جديداً قبل إنهاء الجلسة.',sourcePage:location.pathname}); ui.toast('تم تثبيت المصدر كسياق للجلسة. لن يضيع عند انتقالك.'); location.href='workspace.html#focus'; }));
      renderCompare();
    }
    function renderCompare(){
      const rows=[...selected].map(id=>resources.find(r=>r.id===id)).filter(Boolean);
      if(!rows.length){ compare.innerHTML='<div class="empty">اختر حتى 3 مصادر للمقارنة.</div>'; return;}
      compare.innerHTML=`<div class="table-wrap"><table><thead><tr><th>المصدر</th><th>التكلفة</th><th>يناسب</th><th>لا يناسب</th><th>قاعدة الاستخدام</th><th>درجة</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${ui.escapeHTML(r.name)}</strong></td><td>${ui.escapeHTML(r.cost)}</td><td>${ui.escapeHTML(r.bestFor||r.fit)}</td><td>${ui.escapeHTML(r.notFor||r.risk)}</td><td>${ui.escapeHTML(r.useRule||'حوّله إلى مهمة')}</td><td>${ui.clampNumber(r.score,0,100,0)}%</td></tr>`).join('')}</tbody></table></div>`;
    }
    controls.forEach(c=>c?.addEventListener('input',()=>{visibleCount=PAGE_SIZE;render();}));
    loadMore?.addEventListener('click',()=>{visibleCount+=PAGE_SIZE;render();});
    render();
  });
})();
