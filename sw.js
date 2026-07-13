'use strict';

const CACHE_NAME = 'bawsala-study-os-v4-shell';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './backend.js',
  './app.js',
  './manifest.webmanifest',
  './assets/favicon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept or cache Supabase/Auth/API traffic. This prevents private
  // responses and access-token-bound data from entering Cache Storage.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => response).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
        return response;
      });
      return cached || network;
    }).catch(() => caches.match('./index.html'))
  );
});
