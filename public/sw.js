// Service worker for Posting Agent PWA
// Minimal — enables "Add to Home Screen" and offline shell

const CACHE_NAME = 'pa-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Let all requests pass through to the network
  // We don't need offline caching for this app
  event.respondWith(fetch(event.request))
})
