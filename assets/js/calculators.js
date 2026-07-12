(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const data=window.MT_DATA, store=window.MT_STORE, ui=window.MT_UI;
    function showPanel(id){
      const safe=['academic','btec','terms'].includes(id)?id:'academic';
      document.querySelectorAll('.calc-panel').forEach(panel=>{panel.hidden=panel.id!==safe;});
      document.querySelectorAll('.side-nav a[href^="#"]').forEach(link=>link.classList.toggle('active',link.getAttribute('href')==='#'+safe));
      history.replaceState(null,'','#'+safe);
    }
    document.querySelectorAll('.side-nav a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();showPanel(link.hash.slice(1));}));
    showPanel(location.hash.slice(1)||'academic');

    const trackSelect=document.getElementById('academicTrack'); const rowsEl=document.getElementById('academicRows');
    function defaultRows(track){ return (data.academicTracks[track]||data.academicTracks.custom).map(name=>({id:window.MT_STORE.cryptoId(),name,mark:80,weight:10})); }
    function getRows(){ return store.get('academic:rows', null) || defaultRows(trackSelect?.value||'scientific'); }
    function setRows(rows){ store.set('academic:rows', rows); }
    function renderAcademic(){
      const rows=getRows();
      rowsEl.innerHTML=rows.map(r=>{ const mark=ui.clampNumber(r.mark,0,100,0); const weight=ui.clampNumber(r.weight,0,100,0); return `<div class="subject-row" data-id="${ui.escapeAttr(r.id)}"><label class="field"><span>المادة</span><input data-k="name" value="${ui.escapeAttr(r.name)}" maxlength="90"></label><label class="field"><span>العلامة</span><input data-k="mark" type="number" min="0" max="100" value="${mark}"></label><label class="field"><span>الوزن</span><input data-k="weight" type="number" min="0" max="100" value="${weight}"></label><button class="btn danger sm" data-del type="button">حذف</button></div>`; }).join('');
      rowsEl.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{ const row=input.closest('.subject-row'); const id=row.dataset.id; const k=input.dataset.k; const next=getRows().map(r=>r.id===id?{...r,[k]:k==='name'?window.MT_SECURITY.cleanText(input.value,90):ui.clampNumber(input.value,0,100,0)}:r); setRows(next); updateAcademicScore(); }));
      rowsEl.querySelectorAll('[data-del]').forEach(btn=>btn.addEventListener('click',()=>{ setRows(getRows().filter(r=>r.id!==btn.closest('.subject-row').dataset.id)); renderAcademic(); }));
      updateAcademicScore();
    }
    function updateAcademicScore(){
      const rows=getRows(); const totalW=rows.reduce((a,r)=>a+ui.clampNumber(r.weight,0,100,0),0) || 1;
      const score=rows.reduce((a,r)=>a+ui.clampNumber(r.mark,0,100,0)*ui.clampNumber(r.weight,0,100,0),0)/totalW;
      document.getElementById('academicScore').textContent=score.toFixed(2)+'%';
      document.getElementById('academicBar').style.width=Math.max(0,Math.min(100,score))+'%';
    }
    trackSelect?.addEventListener('change',()=>{ setRows(defaultRows(trackSelect.value)); renderAcademic(); });
    document.getElementById('addSubject')?.addEventListener('click',()=>{ setRows([...getRows(),{id:store.cryptoId(),name:'مادة جديدة',mark:80,weight:10}]); renderAcademic(); });
    document.getElementById('resetAcademic')?.addEventListener('click',()=>{ store.remove('academic:rows'); renderAcademic(); });
    renderAcademic();

    const spec=document.getElementById('btecSpecialty'); if(spec){ spec.innerHTML=data.btecSpecialties.map(x=>`<option>${ui.escapeHTML(x)}</option>`).join(''); }
    function btecCalc(){
      const first=ui.clampNumber(document.getElementById('btecFirst').value,0,100,0);
      const final=ui.clampNumber(document.getElementById('btecFinal').value,0,100,0);
      const english=ui.clampNumber(document.getElementById('btecEnglish').value,0,100,0);
      const arabic=ui.clampNumber(document.getElementById('btecArabic').value,0,100,0);
      const islamic=ui.clampNumber(document.getElementById('btecIslamic').value,0,100,0);
      const history=ui.clampNumber(document.getElementById('btecHistory').value,0,100,0);
      const common=(english*.10)+(arabic*.10)+(islamic*.06)+(history*.04);
      const total=(first*.35)+(final*.35)+common;
      document.getElementById('btecFirstOut').textContent=(first*.35).toFixed(2)+' / 35';
      document.getElementById('btecFinalOut').textContent=(final*.35).toFixed(2)+' / 35';
      document.getElementById('btecCommonOut').textContent=common.toFixed(2)+' / 30';
      document.getElementById('btecTotal').textContent=total.toFixed(2)+'%';
      document.getElementById('btecBar').style.width=Math.max(0,Math.min(100,total))+'%';
    }
    document.querySelectorAll('[data-btec]').forEach(el=>el.addEventListener('input',btecCalc)); btecCalc();
    const termsGrid=document.getElementById('termsGrid'); const termSearch=document.getElementById('termSearch');
    function renderTerms(){
      const q=(termSearch?.value||'').toLowerCase();
      const list=data.btecTerms.filter(t=>t.join(' ').toLowerCase().includes(q));
      termsGrid.innerHTML=list.map(([en,ar,level,tip])=>`<article class="card compact term-card"><span class="badge ${level==='PASS'?'green':level==='MERIT'?'teal':'red'}">${level}</span><h3 class="ltr">${ui.escapeHTML(en)}</h3><p><strong>${ui.escapeHTML(ar)}</strong></p><p class="muted">${ui.escapeHTML(tip)}</p></article>`).join('');
    }
    termSearch?.addEventListener('input',renderTerms); renderTerms();
  });
})();
