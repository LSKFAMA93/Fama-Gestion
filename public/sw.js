const CACHE_NAME = 'fama-gestion-shell-v1'
const APP_ROOT = new URL('./', self.registration.scope)
const PRELOAD_URLS = [
  APP_ROOT.href,
  new URL('manifest.webmanifest', APP_ROOT).href,
  new URL('icon.svg', APP_ROOT).href,
]

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(APP_ROOT.href)
    if (!response.ok) throw new Error('Unable to fetch app shell')
    const html = await response.text()
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
      .map((match) => new URL(match[1], APP_ROOT).href)
    const cache = await caches.open(CACHE_NAME)
    await cache.put(APP_ROOT.href, new Response(html, { headers: response.headers, status: response.status }))
    await cache.addAll([...PRELOAD_URLS.slice(1), ...assets])
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('fama-gestion-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          return response
        })
        .catch(async () => (await caches.match(request)) ?? caches.match(APP_ROOT.href)),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
      return response
    })),
  )
})