(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const data=window.MT_DATA, ui=window.MT_UI;
    const grid=document.getElementById('servicesGrid');
    grid.innerHTML=data.services.map(s=>`<article class="card service-card"><span class="badge teal">${ui.escapeHTML(s.icon)} ${ui.escapeHTML(s.name)}</span><h3>${ui.escapeHTML(s.title)}</h3><p class="muted">${ui.escapeHTML(s.desc)}</p><p class="fine"><strong>المخرج:</strong> ${ui.escapeHTML(s.deliverable)}</p><button class="btn secondary full" data-service="${ui.escapeAttr(s.cta)}" type="button">اطلب عبر واتساب</button></article>`).join('');
    grid.querySelectorAll('[data-service]').forEach(btn=>btn.addEventListener('click',()=>ui.openWhatsApp(`مرحبا، ${btn.dataset.service} عبر بوصلة`)));
  });
})();
