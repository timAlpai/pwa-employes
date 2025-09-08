// service-worker.js (Version 1.1 - Corrigée)

const CACHE_NAME = 'eecie-employe-app-v1';
const urlsToCache = [
    '/pwa-employes/',
    '/pwa-employes/index.html',
    '/pwa-employes/style.css',
    '/pwa-employes/app.js',
    '/pwa-employes/manifest.json',
    '/pwa-employes/icons/icon-192x192.png', // Assurez-vous que ce fichier existe !
    '/pwa-employes/icons/icon-512x512.png', // Assurez-vous que ce fichier existe !
    'https://eecie.ca/logo.svg'
];

// Installation : Mettre en cache les ressources de base
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Mise en cache des fichiers de l\'application');
            return cache.addAll(urlsToCache);
        })
    );
});

// Activation : Nettoyer les anciens caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // CORRECTION : J'ai remplacé CACHE_GNAME par CACHE_NAME
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Suppression de l\'ancien cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch : Servir depuis le cache en priorité (stratégie "Cache First")
self.addEventListener('fetch', event => {
    // On ignore les requêtes non-GET et les requêtes vers l'API WP pour qu'elles passent toujours par le réseau
    if (event.request.method !== 'GET' || event.request.url.includes('/wp-json/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then(response => {
            // Si la ressource est dans le cache, on la sert. Sinon, on la récupère du réseau.
            return response || fetch(event.request);
        })
    );
});