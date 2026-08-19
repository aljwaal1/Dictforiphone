const CACHE='jordan-school-dictionary-pwa-v23';
const PREFIX='jordan-school-dictionary-pwa-';
const ASSETS=['./','./index.html','./styles.css?v=23','./jordan-pwa.css?v=23','./jordan-pwa-v22.js?v=23','./jordan-fixes-v23.js?v=23','./manifest.webmanifest?v=23','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
