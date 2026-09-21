/* Agenda Atlas — service worker
   Coloque este arquivo na MESMA pasta do index/HTML do sistema
   (ex: https://agendaatlas.com.br/sw.js). O HTML já registra ele sozinho.

   Estratégia:
   - Páginas (navegação): rede primeiro, cache como reserva. Assim o usuário
     sempre pega a versão mais nova quando tem internet, e ainda abre offline.
   - Ícones e arquivos do próprio domínio: cache primeiro, atualizando em segundo plano.
   - Firebase/Firestore, Groq, WhatsApp e qualquer outro domínio: passa direto,
     sem cache (dado de agenda nunca deve ficar velho em cache).
*/

const CACHE = 'agenda-atlas-v1';
const ESSENCIAIS = [
  './',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', evento => {
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE).then(cache =>
      // addAll falha inteiro se um arquivo não existir, então cada um vai isolado
      Promise.all(ESSENCIAIS.map(url => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const mesmaOrigem = url.origin === self.location.origin;

  // Nada de cache para APIs e domínios externos (Firestore, Groq, CDNs de script)
  if (!mesmaOrigem) return;

  // Navegação: rede primeiro
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./')))
    );
    return;
  }

  // Demais arquivos do domínio: cache primeiro, revalidando em segundo plano
  evento.respondWith(
    caches.match(req).then(cacheado => {
      const rede = fetch(req)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
          return resp;
        })
        .catch(() => cacheado);
      return cacheado || rede;
    })
  );
});

// Permite que a página peça a limpeza do cache (botão "Atualizar" do sistema)
self.addEventListener('message', evento => {
  if (evento.data === 'limpar-cache') {
    caches.keys().then(chaves => Promise.all(chaves.map(k => caches.delete(k))));
  }
});
