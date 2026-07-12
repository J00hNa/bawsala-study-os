(function(){
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.body.dataset.statusBound==='1')return;document.body.dataset.statusBound='1';
    const badge=document.getElementById('statusBadge');
    const title=document.getElementById('statusTitle');
    const message=document.getElementById('statusMessage');
    const version=document.getElementById('statusVersion');
    const latency=document.getElementById('statusLatency');
    const checkedAt=document.getElementById('statusCheckedAt');
    const overview=document.getElementById('statusOverview');
    const orb=document.querySelector('[data-status-orb]');
    const button=document.getElementById('refreshStatus');
    function component(name,state,label){
      const value=document.querySelector(`[data-component="${name}"]`);const dot=document.querySelector(`[data-component-dot="${name}"]`);
      if(value)value.textContent=label;if(dot){dot.className='status-dot '+(state==='ok'?'online':state==='warn'?'warn':'danger');}
    }
    async function probe(path){
      const started=performance.now();
      try{
        const response=await fetch(path,{headers:{Accept:'application/json'},cache:'no-store',credentials:'same-origin'});
        const data=await response.json().catch(()=>({}));
        return {ok:response.ok && data.ok!==false,status:response.status,data,ms:Math.round(performance.now()-started)};
      }catch(error){return {ok:false,status:0,data:{},ms:Math.round(performance.now()-started),error};}
    }
    let refreshing=false;
    async function refresh(){
      if(refreshing)return;refreshing=true;
      button.disabled=true;button.setAttribute('aria-busy','true');
      badge.className='badge gray';badge.textContent='جارٍ الفحص';title.textContent='نتحقق من الخدمة…';overview.dataset.state='checking';if(orb)orb.dataset.state='checking';
      const [live,ready]=await Promise.all([probe('/api/health/live'),probe('/api/health/ready')]);
      const total=Math.max(live.ms,ready.ms);const now=new Date();
      component('site',live.ok?'ok':'down',live.ok?'تعمل':'متعطلة');
      component('api',live.ok?'ok':'down',live.ok?'تستجيب':'لا تستجيب');
      component('storage',ready.ok?'ok':live.ok?'warn':'down',ready.ok?'جاهزة':live.ok?'محدودة':'متعطلة');
      version.textContent=live.data?.version||ready.data?.version||'غير معروف';latency.textContent=`${total} ms`;checkedAt.textContent=now.toLocaleString('ar-JO');
      if(live.ok && ready.ok){badge.className='badge green';badge.textContent='تعمل بشكل طبيعي';title.textContent='جميع الأنظمة الأساسية تعمل.';message.textContent='الموقع وواجهة API وجاهزية التخزين استجابت بنجاح.';overview.dataset.state='healthy';if(orb)orb.dataset.state='healthy';}
      else if(live.ok){badge.className='badge teal';badge.textContent='خدمة محدودة';title.textContent='الموقع متاح، لكن الجاهزية ليست كاملة.';message.textContent='قد تتأثر المزامنة أو العمليات التي تحتاج كتابة على الخادم. استخدم الأدوات المحلية مؤقتًا.';overview.dataset.state='degraded';if(orb)orb.dataset.state='degraded';}
      else{badge.className='badge red';badge.textContent='عطل حالي';title.textContent='الخدمة لا تستجيب الآن.';message.textContent='الأدوات المحلية قد تبقى متاحة. أعد الفحص بعد دقيقة أو افتح طلب دعم.';overview.dataset.state='down';if(orb)orb.dataset.state='down';}
      button.disabled=false;button.removeAttribute('aria-busy');refreshing=false;
    }
    button?.addEventListener('click',refresh);refresh();
  });
})();
