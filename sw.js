// Basic Service Worker
const CACHE_NAME = 'si-siswa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple network first, fallback to cache (if implemented later) for now just network.
  event.respondWith(fetch(event.request));
});
