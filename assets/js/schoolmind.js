(function(){
  document.addEventListener('DOMContentLoaded',()=>{
    const data=window.MT_DATA, ui=window.MT_UI;
    const sm=data.schoolmind||{};
    const open=document.getElementById('schoolmindOpen');
    if(open) open.href=ui.safeURL(sm.url||data.schoolmindUrl);
    document.getElementById('schoolmindSummary').textContent=sm.summary||'';
    document.getElementById('schoolmindPillars').innerHTML=(sm.pillars||[]).map(p=>`<article class="card compact"><h3>${ui.escapeHTML(p[0])}</h3><p class="muted">${ui.escapeHTML(p[1])}</p></article>`).join('');
    document.getElementById('schoolmindRules').innerHTML=(sm.rules||[]).map(r=>`<li>${ui.escapeHTML(r)}</li>`).join('');
  });
})();
