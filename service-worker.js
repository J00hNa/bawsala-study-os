const BUILD_VERSION='16.0.1';
const CACHE_NAME=`bawsala-v${BUILD_VERSION}-static-v2`;
const VERSION_QUERY=`v=${BUILD_VERSION}`;
const CORE_ASSETS=[
  `./?${VERSION_QUERY}`,
  `./index.html?${VERSION_QUERY}`,
  `./manifest.webmanifest?${VERSION_QUERY}`,
  `./assets/dist/bawsala-pixel.css?${VERSION_QUERY}`,
  `./assets/dist/bawsala-core.js?${VERSION_QUERY}`,
  `./assets/dist/bawsala-enhancements.js?${VERSION_QUERY}`,
  `./assets/js/theme-boot.js?${VERSION_QUERY}`,
  `./pages/workspace.html?${VERSION_QUERY}`,
  `./assets/js/workspace.js?${VERSION_QUERY}`,
  `./pages/dashboard.html?${VERSION_QUERY}`,
  `./assets/js/dashboard.js?${VERSION_QUERY}`,
  `./pages/calendar.html?${VERSION_QUERY}`,
  `./assets/js/calendar.js?${VERSION_QUERY}`,
  `./pages/resources.html?${VERSION_QUERY}`,
  `./assets/js/resources.js?${VERSION_QUERY}`,
  `./pages/calculators.html?${VERSION_QUERY}`,
  `./assets/js/calculators.js?${VERSION_QUERY}`,
  `./pages/notebook.html?${VERSION_QUERY}`,
  `./assets/js/notebook.js?${VERSION_QUERY}`,
  `./pages/flashcards.html?${VERSION_QUERY}`,
  `./assets/js/flashcards.js?${VERSION_QUERY}`,
  './assets/img/logo.svg?v=16.0.1','./assets/img/icon-192.png?v=16.0.1','./assets/img/icon-512.png?v=16.0.1'
];
const PRIVATE_PATHS=["/pages/account.html","/pages/settings.html","/pages/billing.html","/pages/support.html","/pages/admin.html"];
const isPrivatePath=pathname=>PRIVATE_PATHS.some(path=>pathname.endsWith(path));

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const results=await Promise.allSettled(CORE_ASSETS.map(async asset=>{
      const request=new Request(asset,{cache:'reload'});
      const response=await fetch(request);
      if(!response.ok)throw new Error(`PRECACHE_${response.status}:${asset}`);
      await cache.put(request,response);
    }));
    const cached=results.filter(result=>result.status==='fulfilled').length;
    if(cached<6)throw new Error('PRECACHE_CORE_FAILED');
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('bawsala-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    if(self.registration.navigationPreload)await self.registration.navigationPreload.enable().catch(()=>{});
    await self.clients.claim();
  })());
});
self.addEventListener('message',event=>{
  const type=event.data?.type;
  if(type==='SKIP_WAITING')self.skipWaiting();
  if(type==='CLEAR_CACHES')event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('bawsala-')).map(key=>caches.delete(key)))));
  if(type==='CLIENT_VERSION'&&event.source)event.source.postMessage({type:'CACHE_VERSION',version:BUILD_VERSION});
});
function offlinePage(){
  const html='<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بوصلة غير متصلة</title><style>body{font-family:system-ui;background:#0b1020;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}main{max-width:520px;border:1px solid #6658c8;border-radius:16px;padding:24px;background:#111936}a{color:#7ff0ff}</style><main><h1>الاتصال غير متاح</h1><p>الصفحة المطلوبة لم تُحفظ بعد على هذا الجهاز. تحقق من الشبكة ثم أعد المحاولة.</p><a href="/">العودة للرئيسية</a></main></html>';
  return new Response(html,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
async function cachePut(request,response){
  const url=new URL(request.url);
  const control=response.headers.get('Cache-Control')||'';
  const hasCookie=response.headers.has('Set-Cookie');
  if(isPrivatePath(url.pathname)||!response.ok||/(?:no-store|private)/i.test(control)||hasCookie)return response;
  const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());return response;
}
async function navigationResponse(event){
  const request=event.request;const url=new URL(request.url);
  if(isPrivatePath(url.pathname)){
    try{return await fetch(request,{cache:'no-store',credentials:'same-origin'});}
    catch(_){return offlinePage();}
  }
  try{
    const preload=await event.preloadResponse;if(preload)return cachePut(request,preload);
    return await cachePut(request,await fetch(request,{cache:'no-cache'}));
  }catch(_){return (await caches.match(request))||(await caches.match(new Request(`${url.origin}${url.pathname}?${VERSION_QUERY}`)))||offlinePage();}
}
async function networkFirst(request){
  try{return await cachePut(request,await fetch(request,{cache:'no-cache'}));}
  catch(_){return (await caches.match(request))||new Response('Offline resource unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
}
async function cacheFirst(request){
  const cached=await caches.match(request);if(cached)return cached;
  try{return await cachePut(request,await fetch(request));}
  catch(_){return new Response('Offline resource unavailable',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
}
self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  if(request.mode==='navigate'){event.respondWith(navigationResponse(event));return;}
  if(isPrivatePath(url.pathname)){event.respondWith(fetch(request,{cache:'no-store',credentials:'same-origin'}).catch(()=>offlinePage()));return;}
  if(/\.(?:html|css|js|json|webmanifest)$/i.test(url.pathname)){event.respondWith(networkFirst(request));return;}
  event.respondWith(cacheFirst(request));
});
