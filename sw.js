const CACHE='easy-english-ai-pwa-v346-polish';
const ASSETS=['./','./index.html','./styles.css?v=18','./excel-import.css?v=18','./backup-tools.css?v=18','./jordan-pwa.css?v=18','./easy-english-v344.css?v=344','./easy-english-v345-patch.css?v=346','./app.js?v=18','./v2-learning.js?v=18','./excel-import-v14.js?v=18','./backup-tools.js?v=18','./import-refresh.js?v=18','./ios-fixes.js?v=18','./sentence-display-v15.js?v=18','./jordan-pwa.js?v=18','./easy-english-v344.js?v=344','./easy-english-v345-patch.js?v=346','./manifest.webmanifest?v=346','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin){e.respondWith(fetch(e.request));return;}
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r;}).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    const refresh=fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>null);
    return cached||refresh;
  }));
});
