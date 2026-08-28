const CACHE='easy-english-ai-live-v26';
const PREFIX='easy-english-ai-live-';
const ASSETS=['./','./index.html','./styles.css?v=25','./jordan-pwa.css?v=25','./easy-english-live-v26.css?v=26','./jordan-pwa-v22.js?v=25','./jordan-fixes-v23.js?v=25','./jordan-booklab-v24.js?v=25','./jordan-v25-bootfix.js?v=25','./easy-english-live-v26.js?v=26','./manifest.webmanifest?v=26','./assets/data/words.json','./icons/icon-192.svg','./icons/icon-512.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith(PREFIX)||k.startsWith('jordan-school-dictionary-pwa-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const sameOrigin=url.origin===self.location.origin;
  const staticAsset=sameOrigin&&(/\.(css|js|json|svg|png|jpg|jpeg|webp)$/i.test(url.pathname));
  if(staticAsset){
    e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})));
    return;
  }
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')||caches.match('./'))));
});
