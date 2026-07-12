(function(){
  function base(){ return location.pathname.includes('/pages/') ? '../' : ''; }
  function href(path){ return base()+path; }
  function label(ar,en){ return window.MT_UI?.lang?.()==='en' ? en : ar; }
  function makeLink(className,url,text,ariaLabel=''){
    const link=document.createElement('a');link.className=className;link.href=url;link.textContent=text;if(ariaLabel)link.setAttribute('aria-label',ariaLabel);return link;
  }
  function renderAuthChip(){
    const actions=document.querySelector('.header-actions');
    if(!actions || document.getElementById('authChip')) return;
    const user=window.BAWSALA_BACKEND?.state?.user;
    const node=document.createElement('span');node.id='authChip';node.className='auth-chip-wrap';
    if(user){
      node.append(makeLink('btn sm',href('pages/account.html'),String(user.name||label('حسابي','Account')).slice(0,120)));
      node.append(makeLink('icon-btn',href('pages/settings.html'),'⚙',label('الإعدادات','Settings')));
    }else{
      node.append(makeLink('btn sm',href('pages/login.html'),label('دخول','Login')));
      node.append(makeLink('btn sm primary',href('pages/signup.html'),label('حساب جديد','Sign up')));
    }
    actions.insertBefore(node,document.getElementById('menuToggle')||null);
  }
  function updateBackendBadge(){
    const badge=document.querySelector('.backend-badge'),st=window.BAWSALA_BACKEND?.state;if(!badge||!st)return;
    const text=st.authenticated?label('متصل بالحساب والمزامنة جاهزة','Signed in and sync-ready'):(st.online?label('يمكنك إنشاء حساب للمزامنة','Account sync available'):label('وضع محلي على هذا الجهاز','Local mode on this device'));
    badge.replaceChildren();const dot=document.createElement('span');dot.className='status-dot '+(st.authenticated?'online':(st.online?'warn':''));badge.append(dot,document.createTextNode(' '+text));
  }
  function boot(){renderAuthChip();updateBackendBadge();}
  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80));
  window.addEventListener('bawsala:auth',()=>{document.getElementById('authChip')?.remove();setTimeout(boot,0);});
  window.addEventListener('mt:language',()=>{document.getElementById('authChip')?.remove();setTimeout(boot,0);});
})();
