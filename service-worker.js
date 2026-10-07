const CACHE='avfc-hub-v17';
const APP_SHELL=[
  './manifest.webmanifest',
  './avfc-logo.jpg',
  './icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  event.respondWith(
    fetch(event.request,event.request.mode==='navigate'?{cache:'no-store'}:undefined)
      .then(response=>{
        if(response && response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached || (event.request.mode==='navigate'?caches.match('./index.html'):undefined)))
  );
});

self.addEventListener('push',event=>{
  let data={title:'Afon Valley FC',body:'You have a new club notification.',url:'./'};
  try{data={...data,...event.data.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:'avfc-logo.jpg',
    badge:'avfc-logo.jpg',
    data:{url:data.url||'./'},
    tag:data.tag||('avfc-'+(data.type||'general')),
    renotify:true
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client){
        if('navigate' in client) client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow?self.clients.openWindow(target):undefined;
  }));
});
