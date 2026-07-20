// sw.js — Service Worker de Pokédex TCG
//
// Objetivo: poder VER tu colección (últimos datos cargados) sin internet.
// Los cambios (marcar/desmarcar, importar, login) siempre necesitan conexión
// a propósito — no se intenta poner esos endpoints en cola offline, porque
// eso podría causar inconsistencias silenciosas entre dispositivos.
//
// Colócalo en la misma carpeta donde sirves index.html (normalmente "public/"),
// para que quede accesible en la raíz como "/sw.js".

const CACHE_VERSION = 'pokedex-tcg-v1';
const CACHE_SHELL    = `${CACHE_VERSION}-shell`;
const CACHE_LECTURAS = `${CACHE_VERSION}-lecturas`;

// Rutas de la app que no cambian seguido — se cachean al instalar.
const ARCHIVOS_SHELL = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_SHELL).then(cache => cache.addAll(ARCHIVOS_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(nombres =>
            Promise.all(
                nombres
                    .filter(n => n.startsWith('pokedex-tcg-') && n !== CACHE_SHELL && n !== CACHE_LECTURAS)
                    .map(n => caches.delete(n))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo interceptamos GET. Todo lo que escribe (POST /api/inventario,
    // /api/login, /api/importar, etc.) pasa directo a la red sin pasar por aquí,
    // así nunca hay riesgo de "cambios fantasma" guardados en caché.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Lecturas de la API (buscar/estadísticas): red primero, y si falla
    // (sin internet), usamos la última respuesta buena que hayamos guardado.
    if (url.pathname.startsWith('/api/buscar') || url.pathname.startsWith('/api/estadisticas')) {
        event.respondWith(
            fetch(request)
                .then(res => {
                    const copia = res.clone();
                    caches.open(CACHE_LECTURAS).then(cache => cache.put(request, copia));
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Todo lo demás (el shell de la app, imágenes, fuentes): caché primero,
    // red de respaldo, y si tampoco hay red, lo que haya en caché (o nada).
    event.respondWith(
        caches.match(request).then(cacheado => {
            if (cacheado) return cacheado;
            return fetch(request).then(res => {
                const copia = res.clone();
                caches.open(CACHE_SHELL).then(cache => cache.put(request, copia));
                return res;
            }).catch(() => cacheado);
        })
    );
});
