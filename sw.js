/* BlockFlow · service worker — a app abre sem rede.
   - Ficheiros da app: tenta a rede (máx. 3 s); se falhar, usa a cópia guardada. Assim as atualizações chegam quando há rede.
   - Biblioteca do Supabase (jsdelivr): cópia guardada primeiro.
   - Pedidos ao Supabase (dados e login): NÃO são interceptados. */
const V = 'blockflow-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const doFetch = fetch(req).then(r => { if (r && r.ok) { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); } return r; });
    const limite = new Promise((_, rej) => setTimeout(rej, 3000));
    e.respondWith(Promise.race([doFetch, limite]).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('./index.html')).then(m => m || doFetch)));
    return;
  }
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); return r; })));
  }
});
