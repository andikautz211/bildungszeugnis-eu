// Service Worker: hält die Seiten für schnelles Laden vor. Zahlen und Meldungen
// gehen immer direkt an die Datenbank (werden nie zwischengespeichert).
var VERSION = 'fehlstunden-v2';
var DATEIEN = ['./', 'index.html', 'melden.html', 'datenschutz.html', 'style.css', 'config.js', 'api.js',
               'melden.js', 'dashboard.js', 'icon.svg', 'icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(DATEIEN); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Netz zuerst (immer aktuelle Version), Zwischenspeicher nur ohne Verbindung
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) {
      var kopie = r.clone();
      caches.open(VERSION).then(function (c) { c.put(e.request, kopie); });
    }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true });
  }));
});
