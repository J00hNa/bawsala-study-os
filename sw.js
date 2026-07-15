'use strict';

const VERSION = '4.0.0';
const CACHE_NAME = `bawsala-study-os-${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './backend.js',
  './storage.js',
  './app.js',
  './manifest.webmanifest',
  './assets/favicon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png'
];
const STATIC_PATHS = new Set(SHELL.map(item => new URL(item, self.location.href).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(SHELL.map(asset => cache.add(new Request(asset, { cache: 'reload' }))));
    const indexResult = results[SHELL.indexOf('./index.html')];
    if (indexResult?.status === 'rejected') throw indexResult.reason;
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('bawsala-study-os-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('./index.html', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('./index.html')) || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function configResponse(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staticResponse(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(configResponse(request));
    return;
  }
  if (STATIC_PATHS.has(url.pathname)) event.respondWith(staticResponse(request));
});
