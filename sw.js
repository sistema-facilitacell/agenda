// Service Worker do Agenda Atlas
// Opcional: só precisa disso se quiser suporte total de "instalar app" em
// versões mais antigas de navegador. Não faz cache de nada de propósito —
// os dados do sistema são sempre ao vivo, vindos do Firestore.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Deixa passar direto pra rede — sem cache, sem modo offline.
  event.respondWith(fetch(event.request));
});
