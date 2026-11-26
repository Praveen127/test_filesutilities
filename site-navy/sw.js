const V='fileutilo-mwvvj30g';
const SHELL=['./','config.js','site.webmanifest','favicon.svg','favicon.ico','icon-192.png','icon-512.png'];
const CDN=/^https:\/\/(cdn\.jsdelivr\.net|unpkg\.com|esm\.sh|fonts\.googleapis\.com|fonts\.gstatic\.com|tessdata\.projectnaptha\.com)\//;
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('fileutilo-')&&k!==V&&k!=='fileutilo-libs').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function fresh(req){const c=await caches.open(V);try{const r=await fetch(req);if(r.ok)c.put(req,r.clone());return r}
  catch(e){return (await c.match(req,{ignoreSearch:true}))||(req.mode==='navigate'?await c.match('./'):null)||Response.error()}}
async function swr(req){const c=await caches.open(V);const hit=await c.match(req);const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit||Response.error());return hit||net}
async function lib(req){const c=await caches.open('fileutilo-libs');const hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req,r.clone()).catch(()=>{});return r}
self.addEventListener('fetch',e=>{const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
  if(u.origin===location.origin){
    if(req.mode==='navigate'||/\/config\.js$/.test(u.pathname))return e.respondWith(fresh(req));
    if(/\.(webm|mp4)$/.test(u.pathname))return;
    if(/\/(about|media)\/|\.(png|ico|svg|webp|webmanifest)$/.test(u.pathname))return e.respondWith(swr(req));
    return}
  if(CDN.test(req.url)&&!u.pathname.includes('@supabase'))e.respondWith(lib(req))});
