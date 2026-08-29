const CACHE='easy-english-ai-pwa-v352-cache-refresh-1';
const OLD_CACHE_MARKERS=['easy-english-ai','qamoosi','jordan-school-dictionary','jordan-pwa'];
const ASSETS=['./','./index.html','./styles.css?v=18','./excel-import.css?v=18','./backup-tools.css?v=18','./jordan-pwa.css?v=18','./easy-english-v344.css?v=344','./easy-english-v345-patch.css?v=352','./app.js?v=18','./v2-learning.js?v=18','./excel-import-v14.js?v=18','./backup-tools.js?v=18','./import-refresh.js?v=18','./ios-fixes.js?v=18','./sentence-display-v15.js?v=18','./jordan-pwa.js?v=352','./easy-english-v344.js?v=344','./easy-english-v345-patch.js?v=352','./manifest.webmanifest?v=352','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
const STATIC_PATHS=new Set(ASSETS.map(x=>new URL(x,self.location.href).pathname));
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE&&OLD_CACHE_MARKERS.some(m=>k.includes(m))).map(k=>caches.delete(k)));await self.clients.claim();})())});
async function put(request,response){if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}
async function freshNetwork(request,fallback){
  try{
    const fresh=new Request(request,{cache:'no-store'});
    return await put(request,await fetch(fresh));
  }catch(_){return await caches.match(request)||await caches.match(fallback)||Response.error();}
}
async function networkFirst(request,fallback){
  try{return await put(request,await fetch(request));}catch(_){return await caches.match(request)||await caches.match(fallback)||Response.error();}
}
async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached){fetch(new Request(request,{cache:'no-cache'})).then(r=>put(request,r)).catch(()=>{});return cached;}
  try{return await put(request,await fetch(request));}catch(_){return Response.error();}
}
self.addEventListener('message',e=>{if(e.data==='CLEAR_OLD_CACHES'){e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&OLD_CACHE_MARKERS.some(m=>k.includes(m))).map(k=>caches.delete(k)))));}});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin){e.respondWith(fetch(e.request));return;}
  if(e.request.mode==='navigate'){
    e.respondWith(freshNetwork(e.request,'./index.html'));
    return;
  }
  if(STATIC_PATHS.has(url.pathname)){
    e.respondWith(cacheFirst(e.request));
    return;
  }
  e.respondWith(networkFirst(e.request,'./index.html'));
});
