(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const store=window.MT_STORE, ui=window.MT_UI, data=window.MT_DATA;
    const $=id=>document.getElementById(id);
    const BASE_INTERVALS=[0,1,2,4,7,14,30,60];
    let editingId='';
    function now(){ return new Date(); }
    function datePlus(days){ const d=now(); d.setDate(d.getDate()+Math.max(0,Number(days)||0)); return d.toISOString(); }
    function cards(){ return store.get('notebook:flashcards',[]); }
    function save(list){ store.set('notebook:flashcards',list); render(); }
    function isDue(c){ return !c.archived && (!c.dueAt || new Date(c.dueAt) <= now()); }
    function isLate(c){ if(!c.dueAt || c.archived) return false; const diff=(now()-new Date(c.dueAt))/(1000*60*60*24); return diff>=2; }
    function deckValue(){ return $('deckFilter')?.value || 'all'; }
    function splitTags(value){ return String(value||'').split(/[\n،,]+/).map(x=>x.trim()).filter(Boolean).slice(0,10); }
    function allDecks(){ return [...new Set([...(data.flashcardDecks||['عام']),...cards().map(c=>c.deck||'عام')])].filter(Boolean); }
    function cardText(c){ return `${c.deck||''} ${c.subject||''} ${c.front||''} ${c.back||''} ${(c.tags||[]).join(' ')}`.toLowerCase(); }
    function fillDecks(){
      const opts=['all',...allDecks()];
      const currentFilter=$('deckFilter')?.value || 'all';
      const currentSelect=$('deckSelect')?.value || 'عام';
      if($('deckFilter')){ $('deckFilter').innerHTML=opts.map(d=>`<option value="${ui.escapeAttr(d)}">${ui.escapeHTML(d==='all'?'كل المجموعات':d)}</option>`).join(''); $('deckFilter').value=opts.includes(currentFilter)?currentFilter:'all'; }
      if($('deckSelect')){ const decks=allDecks(); $('deckSelect').innerHTML=decks.map(d=>`<option>${ui.escapeHTML(d)}</option>`).join(''); $('deckSelect').value=decks.includes(currentSelect)?currentSelect:(decks[0]||'عام'); }
    }
    function filtered(){
      const q=($('cardSearch')?.value||'').trim().toLowerCase();
      const lvl=$('levelFilter')?.value||'all';
      return cards().filter(c=>{
        if(c.archived && lvl!=='archived') return false;
        if(deckValue()!=='all' && (c.deck||'عام')!==deckValue()) return false;
        if(q && !cardText(c).includes(q)) return false;
        if(lvl==='due' && !isDue(c)) return false;
        if(lvl==='late' && !isLate(c)) return false;
        if(lvl==='weak' && (c.level||1)>2) return false;
        if(lvl==='strong' && (c.level||1)<5) return false;
        if(lvl==='archived' && !c.archived) return false;
        return true;
      });
    }
    function stats(){
      const all=cards();
      $('cardsTotal').textContent=all.filter(c=>!c.archived).length;
      $('cardsDue').textContent=all.filter(isDue).length;
      $('cardsStrong').textContent=all.filter(c=>!c.archived && (c.level||1)>=5).length;
      $('cardsWeak').textContent=all.filter(c=>!c.archived && (c.level||1)<=2).length;
    }
    function nextCard(){ return filtered().filter(isDue).sort((a,b)=>(a.level||1)-(b.level||1) || new Date(a.dueAt||0)-new Date(b.dueAt||0))[0]; }
    function renderReview(){
      const due=filtered().filter(isDue);
      const box=$('reviewBox');
      if(!box) return;
      if(!due.length){ box.innerHTML='<div class="empty">لا توجد بطاقات مستحقة الآن. لا تخترع شغل؛ انتقل لدفتر الأخطاء أو المهمة.</div>'; return; }
      const c=nextCard();
      box.innerHTML=`<article class="study-card"><span class="badge teal">${ui.escapeHTML(c.deck||'عام')} · مستوى ${ui.escapeHTML(c.level||1)} · ${ui.escapeHTML(c.reps||0)} مراجعات</span><h2>${ui.escapeHTML(c.front)}</h2>${c.hint?`<p class="fine">تلميح: ${ui.escapeHTML(c.hint)}</p>`:''}<details><summary class="btn secondary">إظهار الإجابة</summary><p class="preserve muted">${ui.escapeHTML(c.back)}</p></details><div class="actions"><button class="btn danger" data-rate="again" data-id="${ui.escapeAttr(c.id)}" type="button">Again</button><button class="btn" data-rate="hard" data-id="${ui.escapeAttr(c.id)}" type="button">Hard</button><button class="btn primary" data-rate="good" data-id="${ui.escapeAttr(c.id)}" type="button">Good</button><button class="btn secondary" data-rate="easy" data-id="${ui.escapeAttr(c.id)}" type="button">Easy</button></div><p class="fine">Again ترجعها لليوم، Hard غداً تقريباً، Good يرفعها طبيعياً، Easy يدفعها أبعد. لا تكذب على النظام.</p></article>`;
      box.querySelectorAll('[data-rate]').forEach(btn=>btn.addEventListener('click',()=>review(btn.dataset.id,btn.dataset.rate)));
    }
    function dueLabel(c){ if(c.archived) return 'مؤرشفة'; if(isDue(c)) return 'مستحقة'; const d=new Date(c.dueAt); return Number.isNaN(d.getTime())?'لاحقاً':d.toLocaleDateString('ar-JO'); }
    function renderList(){
      const list=filtered();
      const target=$('cardsList');
      if(!target) return;
      target.innerHTML=list.length?list.map(c=>`<article class="card compact flashcard"><span class="badge ${isDue(c)?'green':c.archived?'gray':'blue'}">${ui.escapeHTML(dueLabel(c))}</span><h3>${ui.escapeHTML(c.front)}</h3><p class="fine">${ui.escapeHTML(c.deck||'عام')} · ${ui.escapeHTML(c.subject||'عام')} · مستوى ${ui.escapeHTML(c.level||1)} · فاصل ${ui.escapeHTML(c.intervalDays||0)} يوم</p><p class="muted preserve">${ui.escapeHTML(c.back)}</p><div class="pill-row">${(c.tags||[]).map(t=>`<span class="pill">${ui.escapeHTML(t)}</span>`).join('')}</div><div class="actions"><button class="btn sm" data-edit="${ui.escapeAttr(c.id)}" type="button">تعديل</button><button class="btn sm" data-reset="${ui.escapeAttr(c.id)}" type="button">راجع اليوم</button><button class="btn sm secondary" data-archive="${ui.escapeAttr(c.id)}" type="button">${c.archived?'استرجاع':'أرشفة'}</button><button class="btn danger sm" data-del="${ui.escapeAttr(c.id)}" type="button">حذف</button></div></article>`).join(''):'<div class="empty">لا توجد بطاقات حسب هذا الفلتر.</div>';
      target.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',async()=>{ const ok=await ui.confirmAction({title:'حذف البطاقة نهائياً؟',message:'الأرشفة أذكى من الحذف إذا كنت غير متأكد. الحذف لا يرجع إلا من نسخة احتياطية.',confirmText:'حذف البطاقة',danger:true}); if(ok) save(cards().filter(c=>c.id!==b.dataset.del)); }));
      target.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>{ save(cards().map(c=>c.id===b.dataset.reset?{...c,dueAt:new Date().toISOString(),archived:false}:c)); }));
      target.querySelectorAll('[data-archive]').forEach(b=>b.addEventListener('click',()=>{ save(cards().map(c=>c.id===b.dataset.archive?{...c,archived:!c.archived}:c)); }));
      target.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editCard(b.dataset.edit)));
    }
    function render(){ fillDecks(); stats(); renderReview(); renderList(); window.BAWSALA_I18N?.apply(); }
    function schedule(card,rating){
      const currentInterval=Number(card.intervalDays)||0;
      const currentEase=Number(card.ease)||2.3;
      let level=Number(card.level)||1, interval=0, ease=currentEase, wrong=card.wrong||0, correct=card.correct||0, lapses=card.lapses||0;
      if(rating==='again'){
        level=1; interval=0; ease=Math.max(1.3,currentEase-0.2); wrong+=1; lapses+=1;
      }else if(rating==='hard'){
        level=Math.max(1,level); interval=Math.max(1,Math.round(Math.max(1,currentInterval)*1.2)); ease=Math.max(1.3,currentEase-0.1); correct+=1;
      }else if(rating==='easy'){
        level=Math.min(7,level+2); interval=Math.max(BASE_INTERVALS[level]||2,Math.round(Math.max(1,currentInterval)*Math.max(2.8,currentEase+0.25))); ease=Math.min(3.2,currentEase+0.15); correct+=1;
      }else{
        level=Math.min(7,level+1); interval=Math.max(BASE_INTERVALS[level]||1,Math.round(Math.max(1,currentInterval)*currentEase)); correct+=1;
      }
      return {...card,level,intervalDays:interval,ease,reps:(card.reps||0)+1,lapses,correct,wrong,lastReviewedAt:new Date().toISOString(),dueAt:datePlus(interval),archived:false};
    }
    function review(id,rating){
      save(cards().map(c=>c.id===id?schedule(c,rating):c));
      const remaining=cards().filter(isDue).length;
      const context=window.BAWSALA_STUDY?.overview?.().continuation;
      if(!remaining&&context?.kind==='flashcards')window.BAWSALA_STUDY?.clearContinuation?.();
      ui.toast(remaining?`${rating==='again'?'رجعت البطاقة لليوم.':'تمت الجدولة.'} بقي ${remaining} مستحقة.`:'انتهت البطاقات المستحقة وأغلق مسار المراجعة.');
    }
    function submitButton(){ return $('cardForm')?.querySelector('button[type="submit"]'); }
    function resetEditMode(){
      editingId='';
      $('cardForm')?.removeAttribute('data-editing');
      const submit=submitButton(); if(submit) submit.textContent='إضافة البطاقة';
      $('cancelCardEdit')?.classList.add('hide');
    }
    function ensureEditCancel(){
      const form=$('cardForm');
      if(!form || $('cancelCardEdit')) return;
      const btn=document.createElement('button');
      btn.className='btn secondary full hide';
      btn.id='cancelCardEdit';
      btn.type='button';
      btn.textContent='إلغاء التعديل';
      submitButton()?.insertAdjacentElement('afterend',btn);
      btn.addEventListener('click',()=>{ form.reset(); resetEditMode(); });
    }
    function editCard(id){
      const c=cards().find(x=>x.id===id); if(!c) return;
      const form=$('cardForm'); if(!form) return;
      fillDecks();
      editingId=id;
      form.dataset.editing=id;
      form.deck.value=c.deck||'عام';
      form.subject.value=c.subject||'عام';
      form.front.value=c.front||'';
      form.back.value=c.back||'';
      form.hint.value=c.hint||'';
      form.tags.value=(c.tags||[]).join('، ');
      const submit=submitButton(); if(submit) submit.textContent='حفظ التعديل';
      $('cancelCardEdit')?.classList.remove('hide');
      form.scrollIntoView({block:'center',behavior:'smooth'});
      requestAnimationFrame(()=>form.front?.focus());
    }
    function exportCSV(){
      const rows=[['deck','subject','front','back','hint','tags','level','dueAt'],...cards().filter(c=>!c.archived).map(c=>[c.deck||'عام',c.subject||'عام',c.front||'',c.back||'',c.hint||'',(c.tags||[]).join('|'),c.level||1,c.dueAt||''])];
      const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
      const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='bawsala-flashcards.csv'; a.rel='noopener'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),0);
    }
    function parseCSVLine(line){ const out=[]; let cur='',inQ=false; for(let i=0;i<line.length;i++){ const ch=line[i], next=line[i+1]; if(ch==='"' && inQ && next==='"'){cur+='"'; i++;} else if(ch==='"'){inQ=!inQ;} else if(ch===',' && !inQ){out.push(cur); cur='';} else cur+=ch; } out.push(cur); return out; }
    function importCSV(file){
      if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        const lines=String(reader.result||'').split(/\r?\n/).filter(Boolean);
        const imported=lines.slice(1).map(parseCSVLine).map(r=>({deck:r[0]||'عام',subject:r[1]||'عام',front:r[2]||'',back:r[3]||'',hint:r[4]||'',tags:String(r[5]||'').split('|').filter(Boolean),level:Number(r[6])||1,dueAt:r[7]||new Date().toISOString(),intervalDays:0,ease:2.3,reps:0,lapses:0,correct:0,wrong:0})).filter(c=>c.front && c.back).map(c=>({...c,id:store.cryptoId(),createdAt:new Date().toISOString()}));
        if(!imported.length){ ui.toast('لم أجد بطاقات صالحة في الملف'); return; }
        save([...imported,...cards()]); ui.toast(`تم استيراد ${imported.length} بطاقة`);
      };
      reader.readAsText(file);
    }
    fillDecks();
    ensureEditCancel();
    const aside=$('cardForm')?.closest('aside');
    if(aside && !$('exportCards')){
      const block=document.createElement('div'); block.className='actions';
      block.innerHTML='<button class="btn" id="exportCards" type="button">تصدير CSV</button><label class="btn secondary" for="importCards">استيراد CSV</label><input id="importCards" type="file" accept=".csv,text/csv" hidden>';
      aside.appendChild(block);
    }
    render();
    ['deckFilter','levelFilter','cardSearch'].forEach(id=>$(id)?.addEventListener('input',render));
    $('cardForm')?.addEventListener('submit',e=>{
      e.preventDefault(); const f=e.currentTarget;
      const tags=splitTags(f.tags.value);
      if(editingId){
        const id=editingId;
        save(cards().map(c=>c.id===id?{...c,deck:f.deck.value,subject:f.subject.value,front:f.front.value,back:f.back.value,hint:f.hint.value,tags,updatedAt:new Date().toISOString()}:c));
        f.reset(); resetEditMode(); ui.toast('تم حفظ تعديل البطاقة');
        return;
      }
      store.addToCollection('notebook:flashcards',{deck:f.deck.value,subject:f.subject.value,front:f.front.value,back:f.back.value,hint:f.hint.value,tags,level:1,intervalDays:0,ease:2.3,reps:0,lapses:0,dueAt:new Date().toISOString(),correct:0,wrong:0});
      f.reset(); resetEditMode(); render(); ui.toast('تمت إضافة البطاقة');
    });

    $('startDueReview')?.addEventListener('click',()=>{
      const due=filtered().filter(isDue); const first=nextCard();
      if(!due.length||!first){ui.toast('لا توجد بطاقات مستحقة. لا تخترع جلسة بلا حاجة.');return;}
      window.BAWSALA_STUDY?.beginContext?.({kind:'flashcards',entityId:first.id,title:`مراجعة ${Math.min(20,due.length)} بطاقة مستحقة`,mission:`أراجع ${Math.min(20,due.length)} بطاقة من ${first.deck||'عام'} وأقيّم نفسي بصدق`,subject:first.subject||'عام',minutes:20,target:'flashcards',sourcePage:location.pathname+location.hash});
      ui.toast('بدأ مسار مراجعة البطاقات. سيظهر في كل الصفحات.');
      $('reviewBox')?.scrollIntoView({behavior:document.body.classList.contains('reduced-motion-ui')?'auto':'smooth',block:'center'});
    });
    $('seedCards')?.addEventListener('click',()=>{
      const samples=[['تعريف','اكتب تعريف المصطلح الأساسي في الدرس','التعريف المختصر + مثال واحد'],['قانون','ما القانون الذي يتكرر في هذا الدرس؟','القانون + متى أستخدمه + خطأ شائع'],['خطأ','ما الخطأ الذي وقعت فيه اليوم؟','سبب الخطأ + طريقة منعه قبل الحل'],['BTEC','ماذا تعني Explain؟','سبب ونتيجة ومثال واضح'],['امتحان','ما السؤال المتوقع من هذا الجزء؟','صيغة سؤال + نقطة انتباه']].map(([deck,front,back])=>({id:store.cryptoId(),deck,subject:'عام',front,back,level:1,intervalDays:0,ease:2.3,reps:0,lapses:0,dueAt:new Date().toISOString(),createdAt:new Date().toISOString(),correct:0,wrong:0}));
      save([...samples,...cards()]); ui.toast('تمت إضافة قوالب بطاقات');
    });
    $('copyCards')?.addEventListener('click',()=>{ const text=cards().filter(c=>!c.archived).map(c=>`[${c.deck||'عام'}] ${c.front}\n${c.back}\nالمراجعة القادمة: ${c.dueAt||'اليوم'}`).join('\n\n---\n\n'); ui.copyText(text,'تم نسخ البطاقات'); });
    $('exportCards')?.addEventListener('click',exportCSV);
    $('importCards')?.addEventListener('change',e=>importCSV(e.target.files?.[0]));
  });
})();
