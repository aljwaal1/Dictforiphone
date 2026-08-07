const CACHE='qamoosi-pwa-v15';
const ASSETS=['./','./index.html','./styles.css?v=15','./excel-import.css?v=15','./backup-tools.css?v=15','./app.js?v=15','./v2-learning.js?v=15','./excel-import-v14.js?v=15','./backup-tools.js?v=15','./import-refresh.js?v=15','./ios-fixes.js?v=15','./sentence-display-v15.js?v=15','./manifest.webmanifest','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});
