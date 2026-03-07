const CACHE='mhk-pat-final-v1';
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))));
});
self.addEventListener('activate',event=>{
  event.waitUntil(self.clients.claim());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request, copy)).catch(()=>{});
      return response;
    }).catch(()=>caches.match(event.request))
  );
});
