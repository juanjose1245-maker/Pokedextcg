// sw.js — Service Worker de Pokédex TCG
//
// Objetivo: poder VER tu colección (últimos datos cargados) sin internet.
// Los cambios (marcar/desmarcar, importar, login) siempre necesitan conexión
// a propósito — no se intenta poner esos endpoints en cola offline, porque
// eso podría causar inconsistencias silenciosas entre dispositivos.
//
// Colócalo en la misma carpeta donde sirves index.html (normalmente "public/"),
// para que quede accesible en la raíz como "/sw.js".

const CACHE_VERSION = 'pokedex-tcg-v19';
const CACHE_SHELL    = `${CACHE_VERSION}-shell`;
const CACHE_LECTURAS = `${CACHE_VERSION}-lecturas`;

// Rutas de la app que no cambian seguido — se cachean al instalar.
// Fuentes, íconos y el motor de OCR ahora se autohospedan (antes venían de
// Google Fonts / icons8 / jsdelivr y no se cacheaban, así que offline se
// veían rotos). Los archivos .wasm del OCR (~4MB cada uno) quedan afuera a
// propósito: se cachean solos la primera vez que se usa la cámara, vía el
// mismo cache-first de más abajo — no tiene sentido bajarlos en el install
// si la persona nunca abre el escáner.
const ARCHIVOS_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/app.js',
    '/styles.css',
    '/fonts/fonts.css',
    '/fonts/inter.woff2',
    '/fonts/rajdhani-500.woff2',
    '/fonts/rajdhani-700.woff2',
    '/icons/pokeball-96.png',
    '/icons/pokeball-120.png',
    '/icons/pokeball-152.png',
    '/icons/pokeball-180.png',
    '/icons/pokeball-192.png',
    '/icons/pokeball-512.png',
    '/vendor/tesseract/tesseract.min.js',
    '/vendor/tesseract/worker.min.js'
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
                    // Solo guardamos respuestas completas y exitosas — una respuesta
                    // cortada a medias (ej. el navegador mata el Service Worker en
                    // medio de la descarga) quedaría cacheada rota para siempre,
                    // ya que después nunca la volvemos a pedir a la red.
                    if (res.ok) {
                        const copia = res.clone();
                        caches.open(CACHE_LECTURAS).then(cache => cache.put(request, copia));
                    }
                    return res;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Cualquier otra lectura de la API (exportar, PDF de recortables, etc.):
    // siempre a la red, nunca cacheada — se generan al vuelo y no tiene
    // sentido servir una respuesta vieja guardada por error.
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(request));
        return;
    }

    // Todo lo demás (el shell de la app, imágenes, fuentes): caché primero,
    // red de respaldo, y si tampoco hay red, lo que haya en caché (o nada).
    //
    // El .catch() de más afuera es necesario aparte del de más abajo: si
    // Cache Storage no está disponible (ej. ventanas privadas de Safari, que
    // le dan cuota cero a propósito), "caches.match()" puede rechazar antes
    // de llegar siquiera a pedir la red — sin este catch, ese rechazo llega
    // tal cual a respondWith() y el navegador lo trata como error de red,
    // así que la imagen/recurso no carga aunque haya internet.
    event.respondWith(
        caches.match(request).then(cacheado => {
            if (cacheado) return cacheado;
            return fetch(request).then(res => {
                // Mismo cuidado que arriba: no cachear una respuesta rota/incompleta,
                // porque en cache-first eso se sirve para siempre sin volver a
                // intentar la red hasta el próximo bump de CACHE_VERSION.
                if (res.ok) {
                    const copia = res.clone();
                    caches.open(CACHE_SHELL).then(cache => cache.put(request, copia)).catch(() => {});
                }
                return res;
            }).catch(() => cacheado);
        }).catch(() => fetch(request))
    );
});
