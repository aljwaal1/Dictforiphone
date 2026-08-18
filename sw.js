const CACHE='qamoosi-pwa-v18';
const PREFIX='qamoosi-pwa-';
const ASSETS=['./','./index.html','./styles.css?v=17','./excel-import.css?v=17','./backup-tools.css?v=17','./app.js?v=17','./v2-learning.js?v=17','./excel-import-v14.js?v=17','./backup-tools.js?v=17','./import-refresh.js?v=17','./ios-fixes.js?v=17','./sentence-display-v15.js?v=17','./manifest.webmanifest','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.pathname.includes('/Dictforiphone/jordan/')) return;
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});