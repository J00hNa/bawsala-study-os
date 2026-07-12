(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE, ui=window.MT_UI, data=window.MT_DATA, sec=window.MT_SECURITY;
    const $ = id => document.getElementById(id);
    const form=$('mapForm'), nodeForm=$('nodeForm'), active=$('activeMap'), nodeMap=$('nodeMapSelect'), parent=$('parentSelect'), canvas=$('mindmapCanvas'), outline=$('mapOutline');
    function maps(){ return store.get('mindmaps',[]); }
    function save(list){ store.set('mindmaps', list); render(); }
    function selectedId(){ return active?.value || maps()[0]?.id || ''; }
    function selectedMap(){ return maps().find(m=>m.id===selectedId()) || maps()[0] || null; }
    function fillTemplates(){ const select=$('mapTemplate'); if(!select) return; select.innerHTML=data.mindmapTemplates.map(t=>`<option value="${ui.escapeAttr(t.id)}">${ui.escapeHTML(t.title)}</option>`).join(''); }
    function fillSelects(){ const list=maps(); const options=list.map(m=>`<option value="${ui.escapeAttr(m.id)}">${ui.escapeHTML(m.title)} · ${ui.escapeHTML(m.subject)}</option>`).join(''); [active,nodeMap].forEach(sel=>{ if(!sel) return; const val=sel.value; sel.innerHTML=options || '<option value="">لا توجد خرائط</option>'; if(list.some(m=>m.id===val)) sel.value=val; }); const map=selectedMap(); parent.innerHTML = map ? [`<option value="center">${ui.escapeHTML(map.center)}</option>`,...map.nodes.map(n=>`<option value="${ui.escapeAttr(n.id)}">${ui.escapeHTML(n.text)}</option>`)].join('') : '<option value="center">الفكرة المركزية</option>'; }
    function radialPositions(nodes){
      const positions={center:{x:50,y:50}}; const roots=nodes.filter(n=>(n.parentId||'center')==='center');
      const count=Math.max(roots.length,1); roots.forEach((n,i)=>{ const a=(-90 + i*360/count)*Math.PI/180; positions[n.id]={x:50+33*Math.cos(a),y:50+33*Math.sin(a)}; });
      nodes.filter(n=>(n.parentId||'center')!=='center').forEach((n,i)=>{ const p=positions[n.parentId]||positions.center; const a=(-40 + i*53)*Math.PI/180; positions[n.id]={x:Math.max(7,Math.min(93,p.x+18*Math.cos(a))),y:Math.max(8,Math.min(92,p.y+18*Math.sin(a)))}; });
      return positions;
    }
    function renderCanvas(map){
      if(!map){ canvas.innerHTML='<div class="empty">ابدأ بإنشاء خريطة ذهنية.</div>'; outline.innerHTML='<div class="empty">لا توجد فروع بعد.</div>'; return; }
      const pos=radialPositions(map.nodes); const lines=map.nodes.map(n=>{ const p=pos[n.parentId]||pos.center, c=pos[n.id]; return `<line x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}"/>`; }).join('');
      const nodes=map.nodes.map(n=>`<button type="button" class="mind-node ${ui.escapeAttr(n.color||'brand')}" data-x="${ui.escapeAttr(pos[n.id].x)}" data-y="${ui.escapeAttr(pos[n.id].y)}" data-del-node="${ui.escapeAttr(n.id)}" title="انقر للحذف">${ui.escapeHTML(n.text)}</button>`).join('');
      canvas.innerHTML=`<div class="mind-board"><svg viewBox="0 0 100 100" aria-hidden="true">${lines}</svg><div class="mind-node center" data-x="50" data-y="50">${ui.escapeHTML(map.center)}</div>${nodes}</div><p class="fine">انقر على أي فرع لحذفه. استخدم نسخ الخريطة قبل الحذف إذا احتجت نسخة.</p>`;
      canvas.querySelectorAll('[data-x][data-y]').forEach(node=>{ node.style.setProperty('--x', `${ui.clampNumber(node.dataset.x,0,100,50)}%`); node.style.setProperty('--y', `${ui.clampNumber(node.dataset.y,0,100,50)}%`); });
      canvas.querySelectorAll('[data-del-node]').forEach(btn=>btn.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'حذف هذا الفرع؟',message:'سيتم حذف الفرع وأي فروع تابعة له من الخريطة الحالية.',confirmText:'حذف الفرع',danger:true}); if(!ok) return; const next=maps().map(m=>m.id===map.id?{...m,nodes:m.nodes.filter(n=>n.id!==btn.dataset.delNode && n.parentId!==btn.dataset.delNode)}:m); save(next); }));
      outline.innerHTML = map.nodes.length ? map.nodes.map(n=>`<article class="card compact"><span class="badge gray">${ui.escapeHTML(n.parentId==='center'?'فرع رئيسي':'فرع فرعي')}</span><strong>${ui.escapeHTML(n.text)}</strong></article>`).join('') : '<div class="empty">أضف أول فرع للخريطة.</div>';
    }
    function render(){ fillSelects(); renderCanvas(selectedMap()); window.BAWSALA_I18N?.apply(); }
    fillTemplates(); render();
    active?.addEventListener('change',()=>{ if(nodeMap) nodeMap.value=active.value; render(); }); nodeMap?.addEventListener('change',()=>{ if(active) active.value=nodeMap.value; render(); });
    form?.addEventListener('submit',e=>{ e.preventDefault(); const f=e.currentTarget; const tpl=data.mindmapTemplates.find(t=>t.id===f.template.value) || data.mindmapTemplates[0]; const map={id:store.cryptoId(),title:f.title.value,subject:f.subject.value||'عام',center:f.center.value,nodes:tpl.nodes.map(text=>({id:store.cryptoId(),parentId:'center',text,color:'brand'}))}; const clean=sec.sanitizeForKey('mindmaps',[map],[])[0]; store.set('mindmaps',[clean,...maps()]); f.reset(); render(); ui.toast('تم إنشاء الخريطة'); });
    nodeForm?.addEventListener('submit',e=>{ e.preventDefault(); const f=e.currentTarget; const id=f.mapId.value || selectedId(); const next=maps().map(m=>m.id===id?{...m,nodes:[...m.nodes,{id:store.cryptoId(),parentId:f.parentId.value || 'center',text:f.text.value,color:f.color.value}]}:m); store.set('mindmaps', next); f.reset(); render(); ui.toast('تمت إضافة الفرع'); });
    $('copyMap')?.addEventListener('click',()=>{ const m=selectedMap(); if(!m) return; const text=[`# ${m.title}`,`المادة: ${m.subject}`,`المركز: ${m.center}`,...m.nodes.map(n=>`- ${n.text}`)].join('\n'); ui.copyText(text,'تم نسخ الخريطة'); });
    $('deleteMap')?.addEventListener('click',async()=>{ const m=selectedMap(); if(!m) return; const ok=await ui.confirmAction({title:'حذف الخريطة كاملة؟',message:'سيتم حذف المركز والفروع دفعة واحدة. انسخ الخريطة قبل الحذف إذا كنت غير متأكد.',confirmText:'حذف الخريطة',danger:true}); if(!ok) return; save(maps().filter(x=>x.id!==m.id)); });
  });
})();
