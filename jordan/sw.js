const CACHE='easy-english-ai-pwa-v356-translation-resilience';
const OLD_CACHE_MARKERS=['easy-english-ai','qamoosi','jordan-school-dictionary','jordan-pwa'];
const ASSETS=['./','./index.html','./jordan-pwa.css?v=356','./easy-english-v345-patch.css?v=356','./jordan-pwa.js?v=356','./manifest.webmanifest?v=356','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
const STATIC_PATHS=new Set(ASSETS.map(x=>new URL(x,self.location.href).pathname));
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE&&OLD_CACHE_MARKERS.some(m=>k.includes(m))).map(k=>caches.delete(k)));await self.clients.claim();})())});
async function put(request,response){if(response&&response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}
async function freshNetwork(request,fallback){try{const fresh=new Request(request,{cache:'no-store'});return await put(request,await fetch(fresh));}catch(_){return await caches.match(request)||await caches.match(fallback)||Response.error();}}
async function networkFirst(request,fallback){try{return await put(request,await fetch(request));}catch(_){return await caches.match(request)||await caches.match(fallback)||Response.error();}}
async function cacheFirst(request){const cached=await caches.match(request);if(cached){fetch(new Request(request,{cache:'no-cache'})).then(r=>put(request,r)).catch(()=>{});return cached;}try{return await put(request,await fetch(request));}catch(_){return Response.error();}}
self.addEventListener('message',e=>{if(e.data==='CLEAR_OLD_CACHES'){e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&OLD_CACHE_MARKERS.some(m=>k.includes(m))).map(k=>caches.delete(k)))));}});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const url=new URL(e.request.url);if(url.origin!==self.location.origin){e.respondWith(fetch(e.request));return;}if(e.request.mode==='navigate'){e.respondWith(freshNetwork(e.request,'./index.html'));return;}if(STATIC_PATHS.has(url.pathname)){e.respondWith(cacheFirst(e.request));return;}e.respondWith(networkFirst(e.request,'./index.html'));});
