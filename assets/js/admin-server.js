(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    const backend=window.BAWSALA_BACKEND, ui=window.MT_UI;
    const main=document.querySelector('main');
    const mount=document.getElementById('serverAdminMount');
    if((!main&&!mount)||!backend||!ui) return;
    document.getElementById('localBackupOnly')?.addEventListener('click',()=>window.MT_STORE?.downloadBackup?.());

    const view={usersPage:1,usersLimit:24,userQuery:'',userRole:'',problemsPage:1,problemsLimit:30,problemQuery:'',problemStatus:'',autoRefresh:true};
    let rendering=false;
    const panel=document.createElement('section');
    panel.className='section-sm server-admin-panel';
    panel.innerHTML=`<article class="card focus-card"><span class="badge teal">Server Control</span><h2>لوحة إدارة الحسابات والسيرفر</h2><p class="muted">البيانات هنا من السيرفر الفعلي. البحث والتقسيم يمنعان تحميل القوائم كاملة عند نمو النظام.</p><div class="actions"><a class="btn" href="login.html">تسجيل دخول</a><button class="btn secondary" id="loadServerAdmin" type="button">تحديث لوحة السيرفر</button><button class="btn ghost" id="toggleAutoRefresh" type="button" aria-pressed="true">التحديث التلقائي: مفعّل</button><button class="btn" id="downloadServerBackup" type="button">تصدير نسخة سيرفر</button></div><p class="fine" id="serverAdminUpdated" role="status">لم يتم التحديث بعد.</p><div id="serverAdminBody" class="section-sm" aria-live="polite"></div></article>`;
    if(mount) mount.appendChild(panel); else main.insertBefore(panel,main.children[1]||null);
    const body=panel.querySelector('#serverAdminBody');

    function metric(label,value,detail=''){return `<article class="stat"><b>${ui.escapeHTML(String(value??'—'))}</b><span>${ui.escapeHTML(label)}</span>${detail?`<small>${ui.escapeHTML(detail)}</small>`:''}</article>`;}
    function pager(kind,pagination){
      if(!pagination) return '';
      return `<div class="admin-pager" data-pager="${kind}"><button class="btn sm secondary" type="button" data-page-prev="${kind}" ${pagination.hasPrevious?'':'disabled'}>السابق</button><span>صفحة ${pagination.page} من ${pagination.pageCount} · ${pagination.total} نتيجة</span><button class="btn sm secondary" type="button" data-page-next="${kind}" ${pagination.hasNext?'':'disabled'}>التالي</button></div>`;
    }
    function operationChecks(operations){
      const checks=Array.isArray(operations?.checks)?operations.checks:[];
      if(!checks.length)return '<div class="empty">لا توجد قراءة تشغيلية بعد.</div>';
      return `<div class="ops-check-grid">${checks.map(check=>`<article class="ops-check ${check.ok?'ok':check.degraded?'warn':'bad'}"><span aria-hidden="true">${check.ok?'✓':check.degraded?'!':'×'}</span><div><strong>${ui.escapeHTML(check.label||check.id)}</strong><small>${ui.escapeHTML(check.detail||'')}</small></div><b>${check.weight}</b></article>`).join('')}</div>`;
    }
    function routeRows(metrics){
      const rows=(metrics?.routes||[]).slice(0,8);
      if(!rows.length) return '<div class="empty">لا توجد طلبات مسجلة بعد.</div>';
      return `<div class="table-wrap"><table><thead><tr><th>Route</th><th>الطلبات</th><th>المتوسط</th><th>الأخطاء</th><th>البطيئة</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="ltr">${ui.escapeHTML(row.route)}</td><td>${row.count}</td><td>${row.averageMs}ms</td><td>${row.errors}</td><td>${row.slow}</td></tr>`).join('')}</tbody></table></div>`;
    }
    function userCards(users){
      if(!users.length) return '<div class="empty">لا توجد حسابات مطابقة للفلاتر.</div>';
      return users.map(user=>`<article class="card compact"><span class="badge ${user.role==='admin'?'red':user.role==='support'?'teal':'blue'}">${ui.escapeHTML(user.role)}</span><h3>${ui.escapeHTML(user.name)}</h3><p class="fine ltr">${ui.escapeHTML(user.email)}</p><p class="fine">${ui.escapeHTML(user.subscription?.plan||'free')} · ${ui.escapeHTML(user.subscription?.status||'free')}</p><div class="actions"><button class="btn sm" data-role="${ui.escapeAttr(user.id)}" data-next="${user.role==='admin'?'student':'admin'}" type="button">تحويل إلى ${user.role==='admin'?'طالب':'مدير'}</button><button class="btn sm secondary" data-revoke-sessions="${ui.escapeAttr(user.id)}" type="button">إلغاء الجلسات</button></div></article>`).join('');
    }
    function problemCards(problems){
      if(!problems.length) return '<div class="empty">لا توجد طلبات دعم أو مشاكل مطابقة للفلاتر.</div>';
      return problems.map(problem=>{
        const support=problem.source==='support-center';
        const priority=problem.priority==='high'?'مرتفعة':'عادية';
        return `<article class="card compact admin-support-card" data-problem-card><div class="support-ticket__head"><div><div class="support-ticket__meta"><span class="badge ${problem.status==='تم الحل'?'green':problem.status==='قيد المتابعة'?'blue':'red'}">${ui.escapeHTML(problem.status||'جديدة')}</span><span class="badge ${support?'teal':'gray'}">${support?'طلب دعم':'مشكلة طالب'}</span><span class="badge ${problem.priority==='high'?'red':'gray'}">${priority}</span></div><h3>${ui.escapeHTML(problem.title||'مشكلة')}</h3></div><small>${ui.escapeHTML(problem.createdAt?new Date(problem.createdAt).toLocaleString('ar-JO'):'')}</small></div><p class="fine">${ui.escapeHTML(problem.ownerName||'مستخدم')} · ${ui.escapeHTML(problem.contact||'لا يوجد بريد')} · ${ui.escapeHTML(problem.category||problem.subject||'عام')}</p><p class="muted">${ui.escapeHTML(problem.details||problem.message||'')}</p><label class="field"><span>رد داخلي يظهر للمستخدم</span><textarea rows="3" maxlength="500" data-admin-note>${ui.escapeHTML(problem.adminNote||'')}</textarea></label><div class="actions"><button class="btn sm" data-problem-action="status" data-owner="${ui.escapeAttr(problem.ownerUserId||'')}" data-problem-id="${ui.escapeAttr(problem.id||'')}" data-status="تم الحل" type="button">تم الحل</button><button class="btn sm secondary" data-problem-action="status" data-owner="${ui.escapeAttr(problem.ownerUserId||'')}" data-problem-id="${ui.escapeAttr(problem.id||'')}" data-status="قيد المتابعة" type="button">قيد المتابعة</button><button class="btn sm ghost" data-problem-action="note" data-owner="${ui.escapeAttr(problem.ownerUserId||'')}" data-problem-id="${ui.escapeAttr(problem.id||'')}" type="button">حفظ الرد</button></div></article>`;
      }).join('');
    }
    function bindPaging(){
      body.querySelectorAll('[data-page-prev]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.pagePrev;if(kind==='users')view.usersPage=Math.max(1,view.usersPage-1);else view.problemsPage=Math.max(1,view.problemsPage-1);render({preserveScroll:true});}));
      body.querySelectorAll('[data-page-next]').forEach(button=>button.addEventListener('click',()=>{const kind=button.dataset.pageNext;if(kind==='users')view.usersPage+=1;else view.problemsPage+=1;render({preserveScroll:true});}));
    }
    function bindActions(){
      body.querySelector('#serverSettingsForm')?.addEventListener('submit',async event=>{
        event.preventDefault(); const form=event.currentTarget;
        if(form.maintenance.checked){
          const approved=await ui.confirmAction({title:'تفعيل وضع الصيانة؟',message:'سيُمنع الطلاب من معظم عمليات السيرفر حتى إيقافه.',confirmText:'تفعيل الصيانة',danger:true});
          if(!approved)return;
        }
        try{await backend.updateAdminSettings({brandArabic:form.brandArabic.value,brandEnglish:form.brandEnglish.value,tagline:form.tagline.value,whatsapp:form.whatsapp.value,announcement:form.announcement.value,showAnnouncement:form.showAnnouncement.checked,maintenance:form.maintenance.checked});ui.toast('تم حفظ إعدادات السيرفر');await render({preserveScroll:true});}
        catch(err){ui.toast(err.userMessage||'تعذر حفظ الإعدادات');}
      });
      body.querySelector('#userFilters')?.addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;view.userQuery=form.q.value.trim();view.userRole=form.role.value;view.usersPage=1;render({preserveScroll:true});});
      body.querySelector('#problemFilters')?.addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;view.problemQuery=form.q.value.trim();view.problemStatus=form.status.value;view.problemsPage=1;render({preserveScroll:true});});
      body.querySelectorAll('[data-role]').forEach(button=>button.addEventListener('click',async()=>{
        const next=button.dataset.next;
        const approved=await ui.confirmAction({title:next==='admin'?'منح صلاحية مدير؟':'سحب صلاحية المدير؟',message:next==='admin'?'سيتمكن هذا الحساب من إدارة المستخدمين والإعدادات والنسخ الاحتياطية.':'سيفقد الحساب الوصول إلى لوحة الإدارة فوراً.',confirmText:next==='admin'?'منح الصلاحية':'سحب الصلاحية',danger:true});
        if(!approved)return;
        try{await backend.updateAdminUser(button.dataset.role,{role:next});ui.toast('تم تعديل الصلاحية');await render({preserveScroll:true});}catch(err){ui.toast(err.code==='LAST_ADMIN_REQUIRED'||err.message==='LAST_ADMIN_REQUIRED'?'لا يمكن إزالة آخر مدير.':(err.userMessage||'تعذر تعديل الصلاحية'));}
      }));
      body.querySelectorAll('[data-revoke-sessions]').forEach(button=>button.addEventListener('click',async()=>{
        const approved=await ui.confirmAction({title:'إلغاء جلسات المستخدم؟',message:'سيتم تسجيل خروج المستخدم من كل الأجهزة.',confirmText:'إلغاء الجلسات',danger:true});
        if(!approved)return;
        try{await backend.request('/api/admin/users/'+encodeURIComponent(button.dataset.revokeSessions)+'/sessions',{method:'DELETE'});ui.toast('تم إلغاء الجلسات');await render({preserveScroll:true});}catch(err){ui.toast(err.userMessage||'تعذر إلغاء الجلسات');}
      }));
      body.querySelectorAll('[data-problem-action]').forEach(button=>button.addEventListener('click',async()=>{try{const card=button.closest('[data-problem-card]');const note=card?.querySelector('[data-admin-note]')?.value||'';const patch=button.dataset.problemAction==='note'?{adminNote:note}:{status:button.dataset.status,adminNote:note};await backend.updateAdminProblem(button.dataset.owner,button.dataset.problemId,patch);ui.toast(button.dataset.problemAction==='note'?'تم حفظ رد الدعم':'تم تحديث حالة الطلب');await render({preserveScroll:true});}catch(err){ui.toast(err.userMessage||'تعذر تحديث الطلب');}}));
      bindPaging();
    }
    async function render({preserveScroll=false,silent=false}={}){
      if(rendering)return; rendering=true;
      const y=preserveScroll?window.scrollY:0;
      body.setAttribute('aria-busy','true');
      if(!silent) body.innerHTML='<div class="empty">جاري قراءة المؤشرات والقوائم…</div>';
      try{
        const [overview,metricsData,usersData,problemsData]=await Promise.all([
          backend.adminOverview(),backend.adminMetrics(),
          backend.adminUsers({page:view.usersPage,limit:view.usersLimit,q:view.userQuery,role:view.userRole}),
          backend.adminProblems({page:view.problemsPage,limit:view.problemsLimit,q:view.problemQuery,status:view.problemStatus})
        ]);
        const metrics=metricsData.metrics||{}; const latency=metrics.latencyMs||{}; const persistence=metricsData.persistence||{}; const operations=metricsData.operations||{};
        body.innerHTML=`
          <section class="operations-pulse ${ui.escapeAttr(operations.status||'degraded')}" aria-labelledby="operationsTitle"><div class="operations-score"><span>Production Pulse</span><strong>${Number(operations.score||0)}</strong><small>/100 · ${ui.escapeHTML(operations.status||'unknown')}</small></div><div class="operations-content"><div class="section-heading"><div><h3 id="operationsTitle">نبض الإنتاج</h3><p class="muted">تقييم لحظي مبني على سلامة التخزين، الأخطاء، P95، النسخ، الطوابير وتحذيرات الإعداد. ليس رقماً تسويقياً.</p></div><span class="badge ${operations.status==='healthy'?'green':operations.status==='critical'?'red':'teal'}">SLO ${Number(operations.slo?.observedAvailability||0).toFixed(2)}%</span></div>${operationChecks(operations)}${operations.recommendations?.length?`<div class="notice ${operations.status==='critical'?'danger':'info'}"><strong>الإجراء التالي:</strong> ${ui.escapeHTML(operations.recommendations[0].message||'راجع مؤشرات التشغيل.')}</div>`:''}</div></section>
          <section aria-labelledby="runtimeTitle"><h3 id="runtimeTitle">حالة التشغيل</h3><div class="metric-grid">
            ${metric('حسابات',overview.metrics.users)}${metric('جلسات',overview.metrics.sessions)}${metric('مشاكل',overview.metrics.problems)}${metric('التخزين',overview.storage?.engine==='sqlite'?'SQLite':'JSON')}
            ${metric('طلبات نشطة',metrics.activeRequests||0)}${metric('P50',latency.p50+'ms')}${metric('P95',latency.p95+'ms')}${metric('نسبة الخطأ',(metrics.errorRate||0)+'%')}
            ${metric('طلبات بطيئة',metrics.slowRequests||0)}${metric('الحفظ',persistence.lastError?'خطأ':persistence.pending?'قيد الانتظار':'سليم',persistence.lastPersistAt||'لم يسجل بعد')}
            ${metric('نمط التحديد',operations.rateLimiter?.mode||'—')}${metric('آخر كتابة',operations.persistence?.lastSaveStats?.changedRows??'—','صفوف متغيرة')}
            ${metric('نسخة خارجية',operations.backup?.offsite?.fresh?'حديثة':operations.backup?.offsite?.configured?'بانتظار الرفع':'غير مفعلة',operations.backup?.offsite?.latestSuccessAt||'')}${metric('السجل الأمني',operations.securityTrail?.chained?'مترابط':'بانتظار حدث',operations.securityTrail?.head?String(operations.securityTrail.head).slice(0,18)+'…':'')}
          </div></section>
          <section class="grid grid-2 section-sm"><article class="card"><h3>أكثر المسارات استخداماً</h3>${routeRows(metrics)}</article><aside class="card"><h3>إعدادات عامة</h3><form class="compact-form" id="serverSettingsForm"><input name="brandArabic" placeholder="الاسم العربي" value="${ui.escapeAttr(overview.settings.brandArabic||'')}"><input name="brandEnglish" placeholder="English name" value="${ui.escapeAttr(overview.settings.brandEnglish||'')}"><input name="tagline" placeholder="الشعار" value="${ui.escapeAttr(overview.settings.tagline||'')}"><input name="whatsapp" placeholder="واتساب" value="${ui.escapeAttr(overview.settings.whatsapp||'')}"><textarea name="announcement" rows="3" placeholder="إعلان">${ui.escapeHTML(overview.settings.announcement||'')}</textarea><label class="checkline"><input name="showAnnouncement" type="checkbox" ${overview.settings.showAnnouncement?'checked':''}><span>إظهار الإعلان</span></label><label class="checkline"><input name="maintenance" type="checkbox" ${overview.settings.maintenance?'checked':''}><span>وضع الصيانة</span></label><button class="btn primary full" type="submit">حفظ إعدادات السيرفر</button></form></aside></section>
          <section class="section-sm"><div class="section-heading"><div><h3>الحسابات</h3><p class="muted">ابحث بالاسم أو البريد، ثم غيّر الصلاحية أو ألغِ الجلسات.</p></div></div><form id="userFilters" class="admin-filter-bar"><label class="field"><span>بحث</span><input name="q" type="search" value="${ui.escapeAttr(view.userQuery)}" placeholder="اسم أو بريد"></label><label class="field"><span>الصلاحية</span><select name="role"><option value="">الكل</option><option value="student" ${view.userRole==='student'?'selected':''}>Student</option><option value="support" ${view.userRole==='support'?'selected':''}>Support</option><option value="admin" ${view.userRole==='admin'?'selected':''}>Admin</option></select></label><button class="btn secondary" type="submit">تطبيق</button></form><div class="grid grid-2" id="serverUsers">${userCards(usersData.users||[])}</div>${pager('users',usersData.pagination)}</section>
          <section class="section-sm"><div class="section-heading"><div><h3>الدعم ومشاكل الطلاب</h3><p class="muted">طلبات مركز الدعم والمشاكل الدراسية في قائمة واحدة قابلة للمتابعة والرد.</p></div></div><form id="problemFilters" class="admin-filter-bar"><label class="field"><span>بحث</span><input name="q" type="search" value="${ui.escapeAttr(view.problemQuery)}" placeholder="طلب أو مستخدم أو بريد"></label><label class="field"><span>الحالة</span><select name="status"><option value="">الكل</option><option value="جديدة" ${view.problemStatus==='جديدة'?'selected':''}>جديدة</option><option value="قيد المتابعة" ${view.problemStatus==='قيد المتابعة'?'selected':''}>قيد المتابعة</option><option value="تم الحل" ${view.problemStatus==='تم الحل'?'selected':''}>تم الحل</option></select></label><button class="btn secondary" type="submit">تطبيق</button></form><div class="grid grid-2" id="serverProblems">${problemCards(problemsData.problems||[])}</div>${pager('problems',problemsData.pagination)}</section>`;
        bindActions();
        const updated=panel.querySelector('#serverAdminUpdated'); if(updated) updated.textContent='آخر تحديث: '+new Intl.DateTimeFormat('ar-JO',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());
        if(preserveScroll)requestAnimationFrame(()=>scrollTo({top:y,behavior:'auto'}));
      }catch(err){body.innerHTML=`<div class="notice danger"><strong>تعذر تحميل لوحة السيرفر.</strong><p>${ui.escapeHTML(err.userMessage||'تأكد أن الحساب مدير وأن السيرفر متصل.')}</p>${err.requestId?`<p class="fine ltr">Request: ${ui.escapeHTML(err.requestId)}</p>`:''}</div>`;}
      finally{rendering=false;body.removeAttribute('aria-busy');}
    }
    panel.querySelector('#loadServerAdmin')?.addEventListener('click',()=>render());
    panel.querySelector('#toggleAutoRefresh')?.addEventListener('click',event=>{view.autoRefresh=!view.autoRefresh;event.currentTarget.setAttribute('aria-pressed',view.autoRefresh?'true':'false');event.currentTarget.textContent='التحديث التلقائي: '+(view.autoRefresh?'مفعّل':'متوقف');});
    panel.querySelector('#downloadServerBackup')?.addEventListener('click',async()=>{try{const data=await backend.adminBackup();const blob=new Blob([JSON.stringify(data.backup,null,2)],{type:'application/json'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='bawsala-server-backup-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}catch(err){ui.toast(err.userMessage||'تعذر تصدير نسخة السيرفر');}});
    window.addEventListener('bawsala:auth',()=>{if(backend.state.user?.role==='admin')render();});
    setInterval(()=>{
      const editing=body.contains(document.activeElement) && document.activeElement?.matches?.('input,textarea,select');
      if(view.autoRefresh && !document.hidden && !editing && backend.state.user?.role==='admin') render({preserveScroll:true,silent:true});
    },30000);
  });
})();
