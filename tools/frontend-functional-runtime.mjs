import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const root=process.cwd();
const pages=['index.html','pages/dashboard.html','pages/workspace.html','pages/calendar.html','pages/signup.html','pages/community.html'];
function chromiumBinary(){
  for(const command of ['chromium','chromium-browser','google-chrome','google-chrome-stable']){
    const result=spawnSync('sh',['-lc',`command -v ${command}`],{encoding:'utf8'});
    if(result.status===0&&result.stdout.trim())return result.stdout.trim();
  }
  return '';
}
function freePort(){return new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const {port}=server.address();server.close(()=>resolve(port));});});}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class CDP{
  constructor(url){this.url=url;this.id=0;this.pending=new Map();this.listeners=new Map();}
  async connect(){this.ws=new WebSocket(this.url);await new Promise((resolve,reject)=>{this.ws.addEventListener('open',resolve,{once:true});this.ws.addEventListener('error',reject,{once:true});});this.ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const pending=this.pending.get(message.id);if(!pending)return;this.pending.delete(message.id);message.error?pending.reject(new Error(message.error.message)):pending.resolve(message.result||{});return;}for(const handler of this.listeners.get(message.method)||[])handler(message.params||{});});}
  send(method,params={}){const id=++this.id;this.ws.send(JSON.stringify({id,method,params}));return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP_TIMEOUT:${method}`));},10000);this.pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});});}
  on(method,handler){const list=this.listeners.get(method)||[];list.push(handler);this.listeners.set(method,list);}
  close(){this.ws?.close();}
}
const chromium=chromiumBinary();
if(!chromium)throw new Error('A real Chromium/Chrome binary is required for frontend functional runtime tests.');
const port=await freePort();
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'bawsala-functional-chrome-'));
const browser=spawn(chromium,[`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check','about:blank'],{stdio:['ignore','ignore','pipe']});
let browserError='';browser.stderr.on('data',chunk=>browserError+=chunk);
const watchdog=setTimeout(()=>{try{browser.kill('SIGKILL');}catch(_){}console.error('Frontend functional runtime exceeded 120 seconds.');process.exit(1);},120000);
watchdog.unref?.();
for(let i=0;i<120;i+=1){try{const response=await fetch(`http://127.0.0.1:${port}/json/version`);if(response.ok)break;}catch(_){}if(i===119)throw new Error(`Chromium CDP did not start: ${browserError.slice(-1000)}`);await sleep(100);}
const bootstrap=`(()=>{
  const makeStorage=()=>{const map=new Map([['bawsala.v12.legalAccepted','true'],['bawsala.v12.product:onboarding',JSON.stringify({done:true,role:'student'})]]);return {get length(){return map.size},key:index=>[...map.keys()][index]??null,getItem:key=>map.has(String(key))?map.get(String(key)):null,setItem:(key,value)=>map.set(String(key),String(value)),removeItem:key=>map.delete(String(key)),clear:()=>map.clear()};};
  Object.defineProperty(window,'localStorage',{value:makeStorage(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:makeStorage(),configurable:true});
  const cookieJar=new Map();Object.defineProperty(document,'cookie',{configurable:true,get(){return [...cookieJar].map(([key,value])=>key+'='+value).join('; ');},set(raw){const first=String(raw||'').split(';')[0];const index=first.indexOf('=');if(index>0){const key=first.slice(0,index).trim(),value=first.slice(index+1);if(/Max-Age=0/i.test(String(raw)))cookieJar.delete(key);else cookieJar.set(key,value);}}});
  Object.defineProperty(navigator,'onLine',{value:true,configurable:true});Object.defineProperty(navigator,'serviceWorker',{value:{register:async()=>({update:async()=>{},addEventListener(){},waiting:null,installing:null}),addEventListener(){},controller:null},configurable:true});
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{}},configurable:true});
  window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});window.requestIdleCallback=callback=>setTimeout(()=>callback({didTimeout:false,timeRemaining:()=>20}),0);window.cancelIdleCallback=clearTimeout;window.scrollTo=()=>{};window.open=()=>null;
  window.IntersectionObserver=class{constructor(callback){this.callback=callback}observe(element){this.callback([{target:element,isIntersecting:true,intersectionRatio:1}])}unobserve(){}disconnect(){}};
  window.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};Element.prototype.scrollIntoView=()=>{};Element.prototype.animate=()=>({cancel(){},finished:Promise.resolve()});
  window.__fetchCalls=[];window.__supportTickets=[];
  window.fetch=async(input,init={})=>{const url=String(input?.url||input),method=String(init.method||'GET').toUpperCase();let body=null;try{body=init.body?JSON.parse(init.body):null}catch(_){}window.__fetchCalls.push({url,method,body});const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{'content-type':'application/json','x-request-id':'mock_request_123456','x-backend-version':'16.0.1'}});
    if(url.includes('/api/auth/csrf'))return json({ok:true,csrfToken:'abcdefghijklmnopqrstuvwxyzABCDEF'});
    if(url.includes('/api/auth/login'))return json({ok:true,user:{id:'user_test',name:'Test Student',email:'student@example.com',role:'student',emailVerifiedAt:new Date().toISOString()}});
    if(url.includes('/api/auth/signup'))return json({ok:true,user:{id:'user_signup',name:body?.name||'Test Student',email:body?.email||'student@example.com',role:'student'},verification:{required:true}},201);
    if(url.includes('/api/auth/me'))return window.__authenticated?json({ok:true,authenticated:true,user:{id:'user_test',name:'Test Student',email:'student@example.com',role:'student',emailVerifiedAt:new Date().toISOString()}}):json({ok:true,authenticated:false,user:null});
    if(url.includes('/api/support/tickets/')&&method==='PATCH'){const id=decodeURIComponent(url.split('/').pop());const index=window.__supportTickets.findIndex(item=>item.id===id);if(index>=0)window.__supportTickets[index]={...window.__supportTickets[index],status:'تم الحل',updatedAt:new Date().toISOString()};return json({ok:true,ticket:window.__supportTickets[index]});}
    if(url.includes('/api/support/tickets')&&method==='POST'){const ticket={id:'ticket_mock_12345678',status:'جديدة',priority:body?.priority||'normal',category:body?.category||'technical',title:body?.title||'',details:body?.details||'',adminNote:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};window.__supportTickets.unshift(ticket);return json({ok:true,ticket},201);}
    if(url.includes('/api/support/tickets')&&method==='GET')return json({ok:true,tickets:window.__supportTickets});
    if(url.includes('/api/auth/google/config'))return json({ok:true,enabled:false});
    if(url.includes('/api/health'))return json({ok:true,status:'live',version:'16.0.1'});
    if(url.includes('/api/sync/snapshot'))return json({ok:true,snapshot:{keys:{},revision:'rev_test',updatedAt:new Date().toISOString()}});
    if(url.includes('/api/settings/public'))return json({ok:true,settings:{brandArabic:'بوصلة',brandEnglish:'Bawsala'}});
    if(url.includes('/api/calendar/events'))return json({ok:true,events:[]});
    if(url.includes('/api/integrations/google-calendar/status'))return json({ok:true,enabled:false,connected:false});
    if(url.includes('/api/billing'))return json({ok:true,subscription:{status:'free'},history:[],plans:[]});
    return json({ok:true,items:[],resources:[]});
  };
})();`;
async function newTarget(){return fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'}).then(response=>response.json());}
async function evaluate(cdp,expression,events){const result=await cdp.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(result.exceptionDetails)events.push({kind:'evaluation',text:result.exceptionDetails.text,description:result.exceptionDetails.exception?.description||''});return result.result?.value;}
async function loadPage(relative,{width=1280,height=900,mobile=false,withStyles=false}={}){
  const target=await newTarget();const cdp=new CDP(target.webSocketDebuggerUrl);await cdp.connect();await cdp.send('Runtime.enable');await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  const events=[];cdp.on('Runtime.exceptionThrown',event=>events.push({kind:'exception',text:event.exceptionDetails?.text||'',description:event.exceptionDetails?.exception?.description||'',url:event.exceptionDetails?.url||''}));cdp.on('Runtime.consoleAPICalled',event=>{if(event.type==='error')events.push({kind:'console',text:(event.args||[]).map(item=>item.value||item.description||'').join(' ')});});
  let html=fs.readFileSync(path.join(root,relative),'utf8');
  const mimeFor=file=>({'.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'}[path.extname(file).toLowerCase()]||'application/octet-stream');
  html=html.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,(full,prefix,source,suffix)=>{
    if(/^(?:data:|https?:|blob:)/i.test(source))return full;
    const clean=source.split('?')[0].split('#')[0];
    const absolute=path.resolve(path.dirname(path.join(root,relative)),clean);
    if(!absolute.startsWith(root)||!fs.existsSync(absolute)){events.push({kind:'missing-image',source});return full;}
    return `${prefix}data:${mimeFor(absolute)};base64,${fs.readFileSync(absolute).toString('base64')}${suffix}`;
  });
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/gi)].map(match=>match[1]);
  const stylesheetTags=[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(match=>match[0]);
  const styles=[];
  if(withStyles){
    for(const tag of stylesheetTags){
      const href=tag.match(/href=["']([^"']+)["']/i)?.[1];
      if(!href)continue;
      const clean=href.split('?')[0].split('#')[0];
      const absolute=path.resolve(path.dirname(path.join(root,relative)),clean);
      if(!absolute.startsWith(root)||!fs.existsSync(absolute)){events.push({kind:'missing-style',source:href});continue;}
      styles.push(fs.readFileSync(absolute,'utf8'));
    }
  }
  html=html
    .replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,'')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,'');
  if(withStyles)html=html.replace('</head>',`<style data-functional-css>${styles.join('\n').replace(/<\/style/gi,'<\\/style')}</style></head>`);
  await evaluate(cdp,bootstrap,events);await evaluate(cdp,`document.open();document.write(${JSON.stringify(html)});document.close();`,events);
  for(const source of scripts){const clean=source.split('?')[0].split('#')[0];const absolute=path.resolve(path.dirname(path.join(root,relative)),clean);if(!absolute.startsWith(root)||!fs.existsSync(absolute)){events.push({kind:'missing-script',source});continue;}await evaluate(cdp,`${fs.readFileSync(absolute,'utf8')}\n//# sourceURL=${clean}`,events);}
  await evaluate(cdp,`document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}));window.dispatchEvent(new Event('load'));`,events);await sleep(220);
  return {target,cdp,events,evaluate:expression=>evaluate(cdp,expression,events)};
}
async function closePage(page){page.cdp.close();await fetch(`http://127.0.0.1:${port}/json/close/${page.target.id}`,{method:'PUT'}).catch(()=>{});}
const failures=[];
try{
  const authPages=['pages/welcome.html','pages/login.html','pages/signup.html'];
  for(const relative of authPages){
    const page=await loadPage(relative,{width:1341,height:720,withStyles:true});
    const geometry=await page.evaluate(`(()=>{const shell=document.querySelector('.auth-shell');const children=[...shell.children].map(node=>{const rect=node.getBoundingClientRect();const style=getComputedStyle(node);return {tag:node.tagName,width:rect.width,height:rect.height,writingMode:style.writingMode,wordBreak:style.wordBreak,overflowWrap:style.overflowWrap}});const rect=shell.getBoundingClientRect();const style=getComputedStyle(shell);return {viewport:innerWidth,shellWidth:rect.width,columns:style.gridTemplateColumns,justifyItems:style.justifyItems,children,overflow:document.documentElement.scrollWidth-innerWidth};})()`);
    const narrow=geometry.children.filter(item=>item.width<280||item.writingMode!=='horizontal-tb');
    if(page.events.length||geometry.shellWidth<820||!['stretch','normal'].includes(geometry.justifyItems)||narrow.length||geometry.overflow>2)failures.push({relative:`${relative}-desktop-geometry`,geometry,events:page.events,narrow});
    await closePage(page);
  }
  const welcomeMobile=await loadPage('pages/welcome.html',{width:390,height:844,mobile:true,withStyles:true});
  const mobileGeometry=await welcomeMobile.evaluate(`(()=>{const shell=document.querySelector('.auth-shell');const children=[...shell.children].map(node=>node.getBoundingClientRect().width);const agree=document.getElementById('welcomeAgree');const button=document.getElementById('welcomeContinue');agree.click();return {columns:getComputedStyle(shell).gridTemplateColumns,children,overflow:document.documentElement.scrollWidth-innerWidth,buttonEnabled:!button.disabled};})()`);
  if(welcomeMobile.events.length||mobileGeometry.children.some(width=>width<320)||mobileGeometry.overflow>2||!mobileGeometry.buttonEnabled)failures.push({relative:'welcome-mobile-geometry',mobileGeometry,events:welcomeMobile.events});
  await closePage(welcomeMobile);

  const signupPage=await loadPage('pages/signup.html',{width:390,height:844,mobile:true,withStyles:true});
  const signupResult=await signupPage.evaluate(`(async()=>{
    const form=document.getElementById('signupForm');
    form.elements.namedItem('name').value='طالب اختبار';
    form.elements.namedItem('email').value='signup@example.test';
    form.elements.namedItem('password').value='ValidSignup123';
    form.elements.namedItem('confirmPassword').value='ValidSignup123';
    form.elements.namedItem('ageConfirmed').checked=true;
    form.elements.namedItem('agree').checked=true;
    form.elements.namedItem('ageConfirmed').dispatchEvent(new Event('change',{bubbles:true}));
    form.elements.namedItem('agree').dispatchEvent(new Event('change',{bubbles:true}));
    const enabled=!document.getElementById('signupSubmit').disabled;
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(resolve=>setTimeout(resolve,240));
    const call=window.__fetchCalls.find(item=>item.url.includes('/api/auth/signup'));
    return {enabled,call,overflow:document.documentElement.scrollWidth-innerWidth,hiddenOverlays:[...document.querySelectorAll('[hidden]')].filter(node=>getComputedStyle(node).display!=='none').length};
  })()`);
  if(signupPage.events.length||!signupResult.enabled||signupResult.call?.method!=='POST'||signupResult.call?.body?.ageConfirmed!==true||signupResult.call?.body?.privacyAccepted!==true||'dateOfBirth'in(signupResult.call?.body||{})||'setupToken'in(signupResult.call?.body||{})||signupResult.overflow>2||signupResult.hiddenOverlays)failures.push({relative:'signup-dom-functional',signupResult,events:signupPage.events});
  await closePage(signupPage);

  /* All-page geometry gate: the production CSS must not squeeze, clip, or overlap controls. */
  for(const relative of pages){
    const page=await loadPage(relative,{width:390,height:844,mobile:true,withStyles:true});
    const layout=await page.evaluate(`(()=>{
      const visible=node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>1&&rect.height>1;};
      const overlap=(a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();return Math.max(0,Math.min(ar.right,br.right)-Math.max(ar.left,br.left))*Math.max(0,Math.min(ar.bottom,br.bottom)-Math.max(ar.top,br.top));};
      const collisions=[];
      for(const selector of ['.header-actions','.auth-chip-wrap','.calendar-toolbar .actions','.study-context-rail__inner','.mobile-dock']){
        const parent=document.querySelector(selector);if(!parent||!visible(parent))continue;
        const children=[...parent.children].filter(visible);
        for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++){
          if(children[i].contains(children[j])||children[j].contains(children[i]))continue;
          if(overlap(children[i],children[j])>6)collisions.push(selector);
        }
      }
      const clipped=[...document.querySelectorAll('.btn:not(.icon-btn),button:not(.icon-btn):not(.mobile-dock__capture),.profile-chip')].filter(visible).filter(node=>node.scrollWidth>node.clientWidth+3||node.scrollHeight>node.clientHeight+3).map(node=>({tag:node.tagName,id:node.id||'',class:String(node.className||''),text:String(node.textContent||'').trim().slice(0,60),client:[node.clientWidth,node.clientHeight],scroll:[node.scrollWidth,node.scrollHeight]}));
      const iconOverflow=[...document.querySelectorAll('.icon-btn svg,.mobile-dock svg')].filter(visible).filter(svg=>{const host=svg.closest('button,a'),a=svg.getBoundingClientRect(),b=host?.getBoundingClientRect();return !b||a.left<b.left-1||a.right>b.right+1||a.top<b.top-1||a.bottom>b.bottom+1;}).length;
      const iconTextOverlap=[...document.querySelectorAll('.btn,.profile-chip,.mobile-dock a,.mobile-dock button,.study-tool-link')].filter(visible).reduce((total,host)=>{const icons=[...host.querySelectorAll('svg,img')].filter(visible);const labels=[...host.querySelectorAll('span,strong,em')].filter(node=>visible(node)&&String(node.textContent||'').trim());for(const icon of icons)for(const label of labels){if(icon.contains(label)||label.contains(icon))continue;if(overlap(icon,label)>2)total+=1;}return total;},0);
      const routeOverflow=[...document.querySelectorAll('.study-link-panel,.workspace-route-strip')].filter(visible).map(node=>node.scrollWidth-node.clientWidth).filter(value=>value>3);
      const calendar=document.querySelector('.calendar-board');
      const calendarOverflow=calendar&&visible(calendar)?Math.max(0,(document.querySelector('.calendar-month-grid')?.scrollWidth||0)-calendar.clientWidth):0;
      const rail=document.querySelector('.study-context-rail');const railTitle=rail?.querySelector('.study-context-rail__identity strong');const railAction=rail?.querySelector('.study-context-rail__actions');
      const railCollision=railTitle&&railAction&&visible(railTitle)&&visible(railAction)?overlap(railTitle,railAction):0;
      const railLanguage=document.documentElement.lang==='ar'&&rail?!['نبض اليوم','مسار الدراسة الحالي'].includes(rail.querySelector('.study-context-rail__identity small')?.textContent.trim()):false;
      const dockLabels=[...document.querySelectorAll('.mobile-dock a>span:last-child,.mobile-dock button>span:last-child')].filter(visible).filter(node=>node.scrollWidth>node.clientWidth+2).length;
      const brokenImages=[...document.images].filter(img=>visible(img)&&img.complete&&img.naturalWidth===0).length;
      const labelledBy=node=>(node.getAttribute('aria-labelledby')||'').split(/\\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim();
      const accessibleName=node=>(node.getAttribute('aria-label')||labelledBy(node)||[...(node.labels||[])].map(label=>label.textContent||'').join(' ')||node.getAttribute('alt')||node.textContent||node.getAttribute('title')||'').replace(/\\s+/g,' ').trim();
      const unlabeledFields=[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible).filter(node=>!accessibleName(node)).map(node=>({tag:node.tagName,type:node.type||'',id:node.id||'',name:node.getAttribute('name')||'',placeholder:node.getAttribute('placeholder')||''})).slice(0,16);
      const unnamedInteractive=[...document.querySelectorAll('button,a[href],[role="button"]')].filter(visible).filter(node=>!accessibleName(node)).map(node=>({tag:node.tagName,id:node.id||'',class:String(node.className||'')})).slice(0,16);
      const invalidProgress=[...document.querySelectorAll('[role="progressbar"]')].filter(visible).filter(node=>node.getAttribute('aria-valuemin')===null||node.getAttribute('aria-valuemax')===null||node.getAttribute('aria-valuenow')===null||!accessibleName(node)).map(node=>node.id||node.className||'progress').slice(0,12);
      const badLiveTimers=[...document.querySelectorAll('[role="timer"]')].filter(visible).filter(node=>['polite','assertive'].includes(node.getAttribute('aria-live'))).map(node=>node.id||node.className||'timer');
      const unsafeBlank=[...document.querySelectorAll('a[target="_blank"]')].filter(node=>!/(?:^|\\s)(?:noopener|noreferrer)(?:\\s|$)/.test(node.getAttribute('rel')||'')).map(node=>node.getAttribute('href')||'').slice(0,12);
      const unnamedDialogs=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"],dialog')].filter(visible).filter(node=>!accessibleName(node)&&!labelledBy(node)).map(node=>node.id||node.className||'dialog').slice(0,12);
      const header=document.querySelector('.header-inner');
      const ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
      const forms=[...document.forms].map(form=>({id:form.id||'(dynamic)',enhanced:form.dataset.runtimeV22||''}));
      const dockText=[...document.querySelectorAll('.mobile-dock a>span:last-child,.mobile-dock button>span:last-child')].map(node=>node.textContent.trim());
      const dockLanguage=document.documentElement.lang==='ar'&&dockText.some(text=>['Today','Study','Calendar','Capture','More'].includes(text));
      return {docOverflow:document.documentElement.scrollWidth-innerWidth,headerOverflow:header?header.scrollWidth-header.clientWidth:0,collisions:[...new Set(collisions)],clipped:clipped.slice(0,12),iconOverflow,iconTextOverlap,routeOverflow,calendarOverflow,railCollision,railLanguage,dockLabels,dockLanguage,brokenImages,unlabeledFields,unnamedInteractive,invalidProgress,badLiveTimers,unsafeBlank,unnamedDialogs,runtimeErrors:window.BAWSALA_RUNTIME?.state?.errorCount||0,runtime:document.body?.dataset.runtimeV22||'',appReady:document.body?.dataset.appReady||'',main:!!document.getElementById('main'),header:!!document.getElementById('siteHeader'),duplicateIds:ids.length-new Set(ids).size,forms,retiredRuntime:Boolean(window.BAWSALA_UX_RUNTIME||window.BAWSALA_UX_FLOW)};
    })()`);
    const unenhanced=layout.forms.filter(form=>form.enhanced!=='1');
    if(page.events.length||layout.docOverflow>2||layout.headerOverflow>2||layout.collisions.length||layout.clipped.length||layout.iconOverflow||layout.iconTextOverlap||layout.routeOverflow.length||layout.calendarOverflow>3||layout.railCollision>3||layout.railLanguage||layout.dockLabels||layout.dockLanguage||layout.unlabeledFields.length||layout.unnamedInteractive.length||layout.invalidProgress.length||layout.badLiveTimers.length||layout.unsafeBlank.length||layout.unnamedDialogs.length||layout.runtimeErrors||layout.runtime!=='1'||layout.appReady!=='1'||!layout.main||!layout.header||layout.duplicateIds||unenhanced.length||layout.retiredRuntime)failures.push({relative:`${relative}-mobile-layout`,layout,events:page.events,unenhanced});
    await closePage(page);
  }

  for(const relative of pages){
    const page=await loadPage(relative,{width:1365,height:900,withStyles:true});
    const layout=await page.evaluate(`(()=>{const visible=n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>1&&r.height>1};const nodes=[...document.querySelectorAll('.header-actions>*')].filter(visible);let overlap=0;for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();overlap+=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));}const header=document.querySelector('.header-inner');return {overflow:document.documentElement.scrollWidth-innerWidth,headerOverflow:header?header.scrollWidth-header.clientWidth:0,overlap};})()`);
    if(page.events.length||layout.overflow>2||layout.headerOverflow>2||layout.overlap>6)failures.push({relative:`${relative}-desktop-layout`,layout,events:page.events});
    await closePage(page);
  }

  const notebook=await loadPage('pages/notebook.html');
  const notebookResult=await notebook.evaluate(`(async()=>{const form=document.getElementById('noteForm');form.noteTitle.value='اختبار ملاحظة';form.noteSubject.value='رياضيات';form.noteBody.value='تفاصيل محفوظة';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,80));const before=(window.MT_STORE.get('notebook:notes',[])||[]).length;window.BAWSALA_FRONTEND.openQuickCapture('note');const capture=document.querySelector('#quickCapture form');capture.subject.value='فيزياء';capture.content.value='ملاحظة من الالتقاط السريع';capture.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,80));const notes=window.MT_STORE.get('notebook:notes',[])||[];return {before,after:notes.length,rendered:document.getElementById('notesList').textContent.includes('اختبار ملاحظة'),captureSaved:notes.some(note=>String(note.body||'').includes('الالتقاط السريع'))};})()`);
  if(notebook.events.length||notebookResult.before!==1||notebookResult.after!==2||!notebookResult.rendered||!notebookResult.captureSaved)failures.push({relative:'notebook-functional',notebookResult,events:notebook.events});
  await closePage(notebook);

  const dashboard=await loadPage('pages/dashboard.html');
  const dashboardResult=await dashboard.evaluate(`(async()=>{const habits=document.getElementById('habitForm');habits.elements.namedItem('habitName').value='مراجعة الأخطاء';habits.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));const mission=document.getElementById('missionForm');mission.elements.namedItem('missionText').value='حل عشرين سؤالاً';mission.elements.namedItem('missionMinutes').value='35';mission.elements.namedItem('missionSubject').value='رياضيات';mission.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,100));window.BAWSALA_COMMAND_CENTER?.open?.();await new Promise(resolve=>setTimeout(resolve,30));return {habits:(window.MT_STORE.get('student:habits',[])||[]).length,habitRendered:document.getElementById('habitsList')?.textContent.includes('مراجعة الأخطاء'),mission:window.MT_STORE.get('dashboard:mission',{}),missionRendered:document.getElementById('missionPreview')?.textContent.includes('حل عشرين سؤالاً'),commandOpen:document.getElementById('commandCenter')?.hidden===false,commandResults:document.querySelectorAll('#commandCenterResults [data-command-id]').length};})()`);
  if(dashboard.events.length||dashboardResult.habits!==1||!dashboardResult.habitRendered||dashboardResult.mission?.minutes!==35||!dashboardResult.missionRendered||!dashboardResult.commandOpen||dashboardResult.commandResults<3)failures.push({relative:'dashboard-functional',dashboardResult,events:dashboard.events});
  await closePage(dashboard);

  const workspace=await loadPage('pages/workspace.html');
  const focusResult=await workspace.evaluate(`(async()=>{
    const nativeNow=Date.now;let fakeNow=nativeNow();Date.now=()=>fakeNow;
    window.MT_STORE.set('dashboard:mission',{text:'حل عشرين سؤال تفاضل',mission:'حل عشرين سؤال تفاضل',subject:'رياضيات',minutes:25});
    window.MT_STORE.set('study:sourceBudget',{date:window.MT_SECURITY.localDate(),limit:2,sources:['كتاب الوزارة','أسئلة سنوات']});
    location.hash='focus';await new Promise(resolve=>setTimeout(resolve,100));
    document.getElementById('startFocus')?.click();await new Promise(resolve=>setTimeout(resolve,30));
    fakeNow+=120000;document.dispatchEvent(new Event('visibilitychange'));await new Promise(resolve=>setTimeout(resolve,30));
    location.hash='flow';await new Promise(resolve=>setTimeout(resolve,80));
    const railDuring={action:document.querySelector('[data-study-action]')?.textContent?.trim(),summary:document.querySelector('.study-context-rail__metrics span')?.textContent?.trim()};
    fakeNow+=240000;location.hash='focus';await new Promise(resolve=>setTimeout(resolve,120));
    const restored={display:document.getElementById('wsTimer')?.textContent,state:document.getElementById('focusTimerState')?.textContent,live:document.getElementById('wsTimer')?.getAttribute('aria-live'),progress:Number(document.getElementById('focusTimerProgress')?.getAttribute('aria-valuenow')||0)};
    document.getElementById('pauseFocus')?.click();document.getElementById('saveFocus')?.click();await new Promise(resolve=>setTimeout(resolve,120));
    const sessions=window.MT_STORE.get('study:sessions',[])||[];const saved=sessions[0]||null;const persisted=localStorage.getItem('bawsala:focus-timer:v15');
    const routeIssues=[];const routes=['flow','mission','focus','errors','review','library','homework','rounds','habits','notes','journal','flashcards','mindmap','drill','lectures','btec','schoolmind'];
    const visible=node=>{const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>1&&rect.height>1;};
    const nameOf=node=>(node.getAttribute('aria-label')||[...(node.labels||[])].map(label=>label.textContent||'').join(' ')||node.textContent||node.getAttribute('title')||'').replace(/\s+/g,' ').trim();
    for(const route of routes){location.hash=route;await new Promise(resolve=>setTimeout(resolve,45));const panel=document.getElementById('workspacePanel');const fields=[...panel.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(visible).filter(node=>!nameOf(node)).map(node=>({tag:node.tagName,name:node.name||'',id:node.id||'',placeholder:node.placeholder||''}));const controls=[...panel.querySelectorAll('button,a[href]')].filter(visible).filter(node=>!nameOf(node)).map(node=>({tag:node.tagName,id:node.id||''}));const timers=[...panel.querySelectorAll('[role="timer"]')].filter(node=>['polite','assertive'].includes(node.getAttribute('aria-live'))).map(node=>node.id||'timer');if(fields.length||controls.length||timers.length)routeIssues.push({route,fields,controls,timers});}
    Date.now=nativeNow;
    return {restored,railDuring,saved,persisted,count:sessions.length,route:location.hash,routeIssues};
  })()`);
  if(workspace.events.length||focusResult.restored?.display!=='19:00'||focusResult.restored?.state!=='يعمل الآن'||focusResult.restored?.live!=='off'||focusResult.restored?.progress!==24||focusResult.railDuring?.action!=='استأنف المؤقت'||!focusResult.railDuring?.summary?.includes('المؤقت يعمل')||focusResult.count!==1||focusResult.saved?.minutes!==6||focusResult.saved?.elapsedSeconds!==360||focusResult.saved?.plannedMinutes!==25||focusResult.saved?.completionRatio!==24||focusResult.persisted!==null||focusResult.routeIssues?.length)failures.push({relative:'workspace-focus-timer-functional',focusResult,events:workspace.events});
  await closePage(workspace);

  const flashcards=await loadPage('pages/flashcards.html');
  const flashcardResult=await flashcards.evaluate(`(async()=>{const form=document.getElementById('cardForm');form.elements.namedItem('subject').value='فيزياء';form.elements.namedItem('front').value='ما قانون السرعة؟';form.elements.namedItem('back').value='المسافة على الزمن';form.elements.namedItem('hint').value='مسافة';form.elements.namedItem('tags').value='قانون، مهم';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,100));const cards=window.MT_STORE.get('notebook:flashcards',[])||[];return {count:cards.length,stored:cards[0],rendered:document.getElementById('cardsList')?.textContent.includes('ما قانون السرعة؟'),due:document.getElementById('cardsDue')?.textContent};})()`);
  if(flashcards.events.length||flashcardResult.count!==1||flashcardResult.stored?.subject!=='فيزياء'||!flashcardResult.rendered)failures.push({relative:'flashcards-functional',flashcardResult,events:flashcards.events});
  await closePage(flashcards);

  const settings=await loadPage('pages/settings.html');
  const settingsResult=await settings.evaluate(`(async()=>{const form=document.getElementById('settingsForm');form.elements.namedItem('fontScale').value='large';form.elements.namedItem('contrast').value='high';form.elements.namedItem('compact').checked=true;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,120));const prefs=window.MT_STORE.get('user:preferences',{});return {prefs,fontScale:document.documentElement.dataset.fontScale||document.body.dataset.fontScale||'',contrast:document.documentElement.dataset.contrast||document.body.dataset.contrast||'',compact:document.documentElement.dataset.compact||document.body.dataset.compact||''};})()`);
  if(settings.events.length||settingsResult.prefs?.fontScale!=='large'||settingsResult.prefs?.contrast!=='high'||settingsResult.prefs?.compact!==true)failures.push({relative:'settings-functional',settingsResult,events:settings.events});
  await closePage(settings);

  const support=await loadPage('pages/support.html');
  const supportResult=await support.evaluate(`(async()=>{window.__authenticated=true;window.dispatchEvent(new CustomEvent('bawsala:auth'));await new Promise(resolve=>setTimeout(resolve,220));const form=document.getElementById('supportForm');form.elements.namedItem('category').value='technical';form.elements.namedItem('priority').value='high';form.elements.namedItem('subject').value='تعطل حفظ الملاحظات';form.elements.namedItem('message').value='عند حفظ ملاحظة دراسية واضحة لا تظهر داخل القائمة بعد الضغط على زر الحفظ.';form.elements.namedItem('consent').checked=true;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,260));const createCall=window.__fetchCalls.find(item=>item.url.includes('/api/support/tickets')&&item.method==='POST');const ticket=window.__supportTickets[0];return {count:window.__supportTickets.length,ticket,rendered:document.getElementById('supportTickets')?.textContent.includes('تعطل حفظ الملاحظات'),created:!!createCall,body:createCall?.body,gateHidden:document.getElementById('supportAuthGate')?.hidden};})()`);
  if(support.events.length||supportResult.count!==1||supportResult.ticket?.priority!=='high'||!supportResult.rendered||!supportResult.created||supportResult.body?.consent!==true||!supportResult.gateHidden)failures.push({relative:'support-functional',supportResult,events:support.events});
  await closePage(support);

  const statusPage=await loadPage('pages/status.html');
  const statusResult=await statusPage.evaluate(`(async()=>{await new Promise(resolve=>setTimeout(resolve,120));return {title:document.getElementById('statusTitle')?.textContent,badge:document.getElementById('statusBadge')?.textContent,state:document.querySelector('[data-status-orb]')?.dataset.state,healthCalls:window.__fetchCalls.filter(item=>item.url.includes('/api/health')).length};})()`);
  if(statusPage.events.length||statusResult.state!=='healthy'||statusResult.healthCalls<2)failures.push({relative:'status-functional',statusResult,events:statusPage.events});
  await closePage(statusPage);

  const login=await loadPage('pages/login.html');
  const loginResult=await login.evaluate(`(async()=>{const form=document.getElementById('loginForm');const button=form.querySelector('button[type=submit]');form.elements.namedItem('email').value='student@example.com';form.elements.namedItem('password').value='ValidPass123';form.elements.namedItem('syncMode').value='none';button.click();await new Promise(resolve=>setTimeout(resolve,420));const call=window.__fetchCalls.find(item=>item.url.includes('/api/auth/login'));return {called:!!call,method:call?.method,body:call?.body,authenticated:window.BAWSALA_BACKEND.state.authenticated,authRuntime:document.body.dataset.authRuntime||'',authBound:form.dataset.authBound||'',runtimeErrors:window.BAWSALA_RUNTIME?.state?.errorCount||0};})()`);
  if(login.events.length||!loginResult.called||loginResult.method!=='POST'||loginResult.body?.email!=='student@example.com'||!loginResult.authenticated)failures.push({relative:'login-functional',loginResult,events:login.events});
  await closePage(login);
}finally{
  clearTimeout(watchdog);
  if(browser.exitCode===null){
    browser.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),sleep(1000)]);
    if(browser.exitCode===null){browser.kill('SIGKILL');await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),sleep(1000)]);}
  }
  browser.stderr?.destroy?.();
  fs.rmSync(profile,{recursive:true,force:true});
}
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exit(1);}
console.log(`OK: real Chromium functional runtime passed (${pages.length} critical pages + auth desktop/mobile geometry + critical-page mobile/desktop layout geometry + local image loading + icon/text collision checks + notebook/dashboard/resumable-focus/flashcards/settings/support/status/login interactions; no SKIP path).`);
process.exit(0);
