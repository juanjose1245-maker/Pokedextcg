const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const { exec, execSync } = require('child_process');
const util      = require('util');
const execAsync = util.promisify(exec);
const PDFDocument = require('pdfkit');
const sharp     = require('sharp');
const app       = express();
const PORT      = 3000;

// Dónde vive el estado escribible del usuario (inventario, config de
// carpetas/variantes, respaldos, caché de PDFs). Default = __dirname para
// que el deploy actual (systemd, WorkingDirectory == directorio del repo)
// siga leyendo/escribiendo exactamente donde lo hace hoy sin tocar nada;
// en Docker la imagen fija DATA_DIR=/app/data vía ENV.
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const RUTA_INVENTARIO       = path.join(DATA_DIR, 'inventario.json');
const RUTA_CARPETAS_CONFIG  = path.join(DATA_DIR, 'carpetas.json');
const RUTA_VARIANTES_CONFIG = path.join(DATA_DIR, 'variantes-config.json');

// Commit corriendo ahora mismo, para que el cliente pueda mostrarlo y
// compararlo contra lo que espera — útil para distinguir "no llegó el
// deploy todavía" de "el caché del navegador está viejo" cuando algo no
// se ve como debería. Se lee una sola vez al arrancar (no cambia en
// caliente); si no hay git disponible (ej. un despliegue sin carpeta
// .git) queda en null y el cliente simplemente no muestra nada.
let VERSION_COMMIT = null;
try {
    VERSION_COMMIT = execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
} catch (err) {
    console.warn('⚠️  No se pudo leer el commit actual (git rev-parse):', err.message);
}

// Corre detrás de un único proxy inverso (nginx) que termina TLS — sin esto,
// Express ignora X-Forwarded-For y req.ip siempre da la IP del proxy, con lo
// que el rate limiter por IP (ver más abajo) termina compartiendo un solo
// balde entre todos los clientes en vez de uno por IP real.
app.set('trust proxy', 1);

app.use(express.json({
    limit: '2mb', // el respaldo importado puede pesar un poco
    // Guardamos también el body crudo: el webhook de auto-deploy necesita
    // verificar la firma HMAC de GitHub sobre los bytes exactos recibidos,
    // no sobre el JSON ya parseado/re-serializado.
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.static(path.join(__dirname, 'public')));

const pokemonDB = JSON.parse(fs.readFileSync(path.join(__dirname, 'pokemon_db.json'), 'utf8'));
const idsValidos = new Set(pokemonDB.map(p => p.id));

// Mismo corte por generación que usa el frontend (public/app.js) para
// calcular el "número regional" (posición dentro de su propia región/Pokédex
// regional), separado del "número nacional" (su id global). Índice = gen.
const CORTES_GEN = [0, 0, 151, 251, 386, 493, 649, 721, 809, 905];
function numeroRegional(p) {
    if (p.id >= 899 && p.id <= 905) return p.id - 809; // formas de Hisui
    return p.id - CORTES_GEN[p.gen];
}

// Escritura atómica: escribe a un archivo temporal y recién después lo
// renombra, para que un crash a mitad de escritura nunca deje el archivo
// final truncado/corrupto (rename es atómico a nivel de sistema de archivos).
function escribirJSONAtomico(ruta, datos) {
    const temp = `${ruta}.tmp-${process.pid}`;
    fs.writeFileSync(temp, JSON.stringify(datos, null, 2));
    fs.renameSync(temp, ruta);
}

// ── RESPALDO AUTOMÁTICO PERIÓDICO ───────────────────────────────────
// Guarda una copia del inventario cada 24h (y una al arrancar el servidor),
// quedándose solo con los últimos 14 respaldos para no llenar el disco.
const CARPETA_RESPALDOS = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(CARPETA_RESPALDOS)) fs.mkdirSync(CARPETA_RESPALDOS, { recursive: true });

// ── INVENTARIO ──────────────────────────────────────────────────────
// Dos colecciones completamente independientes: "bulk" (cartas sueltas) y
// "carpetas" (organizadas en binders). Cada una es un mapa id -> { fecha }.
// inventario[modo][id] = { fecha: "2026-07-15T12:00:00.000Z" }
let inventario = { bulk: {}, carpetas: {} };
if (fs.existsSync(RUTA_INVENTARIO)) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(RUTA_INVENTARIO, 'utf8'));
    } catch (err) {
        // inventario.json corrupto (ej. crash a mitad de escritura): en vez de
        // tirar el server abajo, caemos al respaldo automático más reciente.
        console.error('⚠️  inventario.json está corrupto:', err.message);
        const respaldos = fs.existsSync(CARPETA_RESPALDOS)
            ? fs.readdirSync(CARPETA_RESPALDOS).filter(f => f.startsWith('inventario-')).sort()
            : [];
        const ultimo = respaldos[respaldos.length - 1];
        if (ultimo) {
            console.warn(`⚠️  Restaurando desde el respaldo más reciente: ${ultimo}`);
            raw = JSON.parse(fs.readFileSync(path.join(CARPETA_RESPALDOS, ultimo), 'utf8'));
        } else {
            console.warn('⚠️  No hay respaldos disponibles, arrancando con inventario vacío.');
            raw = {};
        }
    }
    if (raw.bulk || raw.carpetas) {
        inventario = { bulk: raw.bulk || {}, carpetas: raw.carpetas || {} };
    } else {
        const migrado = {};
        for (const [id, val] of Object.entries(raw)) {
            if (val === true) migrado[id] = { fecha: new Date().toISOString() };
            else if (val && typeof val === 'object') migrado[id] = val;
        }
        inventario = { bulk: {}, carpetas: migrado };
    }
}
function guardarInventario() {
    escribirJSONAtomico(RUTA_INVENTARIO, inventario);
}
function modoValido(modo) {
    return modo === 'bulk' || modo === 'carpetas';
}

// ── CONFIGURACIÓN DE VARIANTES (Ajustes → Variantes) ────────────────
// Qué categorías de variantes (formas regionales, Mega, Regresión Primigenia,
// Gigamax, alternativas) cuentan como cartas propias — configuración global,
// afecta tanto bulk como carpetas por igual. Todas arrancan en `false`: cero
// cambio de comportamiento para quien no toca nada en Ajustes.
const CATEGORIAS_VARIANTES = ['regional', 'mega', 'primigenia', 'gigamax', 'alternativa'];

function variantesConfigValida(candidato) {
    if (!candidato || typeof candidato !== 'object' || Array.isArray(candidato)) return false;
    const claves = Object.keys(candidato);
    if (claves.length !== CATEGORIAS_VARIANTES.length) return false;
    return CATEGORIAS_VARIANTES.every(cat => typeof candidato[cat] === 'boolean');
}

let variantesConfig = Object.fromEntries(CATEGORIAS_VARIANTES.map(c => [c, false]));
if (fs.existsSync(RUTA_VARIANTES_CONFIG)) {
    try {
        const raw = JSON.parse(fs.readFileSync(RUTA_VARIANTES_CONFIG, 'utf8'));
        if (variantesConfigValida(raw)) variantesConfig = raw;
        else console.warn('⚠️  variantes-config.json inválido, usando todas las categorías desactivadas.');
    } catch (err) {
        console.error('⚠️  variantes-config.json corrupto, usando todas las categorías desactivadas:', err.message);
    }
}
function guardarVariantesConfig() {
    escribirJSONAtomico(RUTA_VARIANTES_CONFIG, variantesConfig);
}

// especieBase (1–1025) -> variantes[], en el mismo orden en que aparecen en
// pokemon_db.json. Se calcula una sola vez: pokemonDB no cambia en caliente.
const variantesPorBase = new Map();
for (const p of pokemonDB) {
    if (p.id <= 1025) continue;
    if (!variantesPorBase.has(p.especieBase)) variantesPorBase.set(p.especieBase, []);
    variantesPorBase.get(p.especieBase).push(p);
}

// Ancla de un Pokémon a un id de especie base (1–1025): el suyo propio si ya
// es base, o el de su especie base si es una variante (id siempre >= 1026).
// Sirve para decidir a qué carpeta/rango pertenece una variante en modo
// "seguidas", donde los rangos se definen sobre 1–1025.
function anclaId(p) {
    return p.id <= 1025 ? p.id : p.especieBase;
}

// Base (1025) + solo las variantes de categorías activas, cada una
// intercalada justo después de su especie base — así el orden de
// galería/carpeta/búsqueda las agrupa junto a su base sin que el cliente
// tenga que reordenar nada.
function pokemonEfectivo() {
    const activas = new Set(CATEGORIAS_VARIANTES.filter(cat => variantesConfig[cat]));
    const resultado = [];
    for (const p of pokemonDB) {
        if (p.id > 1025) continue;
        resultado.push(p);
        for (const v of variantesPorBase.get(p.id) || []) {
            if (activas.has(v.categoria)) resultado.push(v);
        }
    }
    return resultado;
}

// ── CONFIGURACIÓN DE CARPETAS (wizard) ──────────────────────────────
// Antes eran 4 carpetas fijas hardcodeadas (Azul/Morada/Rosa/Roja); ahora
// vive en disco y es configurable desde la app (Ajustes → Configurar
// carpetas), para que cualquier dispositivo vea la misma agrupación.
function pokemonPorGens(gens) {
    // Cuenta SIEMPRE solo la base (1025), sin mirar variantesConfig: se usa como
    // piso estructural (validación de carpetas.json y seed de CARPETAS_DEFAULT),
    // no debe cambiar cuando el usuario activa/desactiva una categoría de
    // variantes (ver Hallazgo 1 de la revisión final de variantes-fase2).
    return pokemonDB.filter(p => p.id <= 1025 && gens.includes(p.gen)).length;
}
const CARPETAS_DEFAULT = [
    { nombre: 'Azul',   color: '#3b5bdb', gens: [1, 2],    espacios: pokemonPorGens([1, 2]) },
    { nombre: 'Morada', color: '#7c3aed', gens: [3, 4],    espacios: pokemonPorGens([3, 4]) },
    { nombre: 'Rosa',   color: '#db2777', gens: [5, 6, 7], espacios: pokemonPorGens([5, 6, 7]) },
    { nombre: 'Roja',   color: '#dc2626', gens: [8, 9],    espacios: pokemonPorGens([8, 9]) }
];

// candidato = { modo: 'separadas'|'seguidas', carpetas: [...] }
// - separadas: cada carpeta tiene generaciones completas (gens: number[]); entre
//   todas, las 9 generaciones aparecen exactamente una vez.
// - seguidas: cada carpeta tiene un rango de nº de Pokédex nacional (desde/hasta);
//   los rangos son contiguos, sin huecos ni superposición, y cubren 1 a 1025 entero.
function nombresUnicos(carpetas) {
    // Se usa el nombre (case-insensitive) para identificar carpetas en
    // /api/pdf-carpetas, así que dos carpetas con el mismo nombre son
    // indistinguibles ahí y romperían la selección.
    const vistos = new Set();
    for (const c of carpetas) {
        if (!c || typeof c !== 'object' || typeof c.nombre !== 'string') return false;
        const clave = c.nombre.trim().toLowerCase();
        if (!clave || vistos.has(clave)) return false;
        vistos.add(clave);
    }
    return true;
}

function carpetasConfigValida(candidato) {
    if (!candidato || typeof candidato !== 'object' || Array.isArray(candidato)) return false;
    const { modo, carpetas } = candidato;
    if (!Array.isArray(carpetas) || !carpetas.length) return false;
    if (!nombresUnicos(carpetas)) return false;

    if (modo === 'seguidas') {
        // Validar que todos los elementos sean objetos válidos antes de ordenar
        // (prevenir TypeError al acceder a .desde)
        for (const c of carpetas) {
            if (!c || typeof c !== 'object') return false;
        }
        const ordenadas = [...carpetas].sort((a, b) => a.desde - b.desde);
        let siguienteDesde = 1;
        for (const c of ordenadas) {
            if (typeof c.nombre !== 'string' || !c.nombre.trim()) return false;
            if (typeof c.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c.color)) return false;
            if (!Number.isInteger(c.desde) || !Number.isInteger(c.hasta)) return false;
            if (c.desde !== siguienteDesde || c.hasta < c.desde) return false;
            if (!Number.isInteger(c.espacios) || c.espacios < (c.hasta - c.desde + 1)) return false;
            siguienteDesde = c.hasta + 1;
        }
        return siguienteDesde === 1026; // la última carpeta terminó justo en el Pokémon #1025
    }

    if (modo === 'separadas') {
        const vistos = new Set();
        for (const c of carpetas) {
            if (!c || typeof c.nombre !== 'string' || !c.nombre.trim()) return false;
            if (typeof c.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(c.color)) return false;
            if (!Array.isArray(c.gens) || !c.gens.length) return false;
            for (const g of c.gens) {
                if (!Number.isInteger(g) || g < 1 || g > 9 || vistos.has(g)) return false;
                vistos.add(g);
            }
            if (!Number.isInteger(c.espacios) || c.espacios < pokemonPorGens(c.gens)) return false;
        }
        return vistos.size === 9; // las 9 generaciones, cada una en exactamente una carpeta
    }

    return false;
}

let carpetasConfig = { modo: 'separadas', carpetas: CARPETAS_DEFAULT };
if (fs.existsSync(RUTA_CARPETAS_CONFIG)) {
    try {
        let raw = JSON.parse(fs.readFileSync(RUTA_CARPETAS_CONFIG, 'utf8'));
        if (Array.isArray(raw)) raw = { modo: 'separadas', carpetas: raw }; // formato viejo, antes de este cambio
        if (carpetasConfigValida(raw)) carpetasConfig = raw;
        else console.warn('⚠️  carpetas.json inválido, usando la configuración por defecto.');
    } catch (err) {
        console.error('⚠️  carpetas.json corrupto, usando la configuración por defecto:', err.message);
    }
}
function guardarCarpetasConfig() {
    escribirJSONAtomico(RUTA_CARPETAS_CONFIG, carpetasConfig);
}

function respaldoAutomatico() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ruta = path.join(CARPETA_RESPALDOS, `inventario-${timestamp}.json`);
        escribirJSONAtomico(ruta, inventario);
        const archivos = fs.readdirSync(CARPETA_RESPALDOS)
            .filter(f => f.startsWith('inventario-'))
            .sort();
        while (archivos.length > 14) {
            fs.unlinkSync(path.join(CARPETA_RESPALDOS, archivos.shift()));
        }
        console.log(`🗂️  Respaldo automático guardado: ${path.basename(ruta)}`);
    } catch (err) {
        console.error('⚠️  No se pudo generar el respaldo automático:', err.message);
    }
}
respaldoAutomatico();
setInterval(respaldoAutomatico, 24 * 60 * 60 * 1000);

// ── LOGIN: solo protege escrituras, la lectura queda siempre abierta ──
// Sistema mínimo sin dependencias nuevas: contraseña única (variable de
// entorno ADMIN_PASSWORD) + token de sesión aleatorio guardado en memoria,
// mandado al cliente como cookie httpOnly. No usa cookie-parser: se
// parsea el header Cookie a mano porque el formato es muy simple.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pokedex123';
if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Estás usando la contraseña por defecto ("pokedex123"). Configura la variable de entorno ADMIN_PASSWORD antes de exponer este servidor a internet.');
}
const SESION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const sesionesActivas = new Map(); // token -> expiraEn

// Comparación en tiempo constante para no filtrar por timing cuánto de la
// contraseña coincidió (crypto.timingSafeEqual exige buffers del mismo
// largo, así que un largo distinto ya alcanza para descartarla).
function passwordValida(candidata) {
    const bufA = Buffer.from(String(candidata || ''), 'utf8');
    const bufB = Buffer.from(ADMIN_PASSWORD, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// La app puede correr detrás de un proxy que termina TLS (ej. nginx) y le
// habla al server en HTTP plano, así que además de req.secure miramos el
// header que ese proxy agrega.
function esHttps(req) {
    return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function parsearCookies(req) {
    const header = req.headers.cookie;
    const cookies = {};
    if (!header) return cookies;
    header.split(';').forEach(par => {
        const idx = par.indexOf('=');
        if (idx === -1) return;
        const nombre = par.slice(0, idx).trim();
        const valor  = decodeURIComponent(par.slice(idx + 1).trim());
        cookies[nombre] = valor;
    });
    return cookies;
}

function sesionValida(req) {
    const cookies = parsearCookies(req);
    const token = cookies.sesion;
    if (!token) return false;
    const expiraEn = sesionesActivas.get(token);
    if (!expiraEn) return false;
    if (Date.now() > expiraEn) {
        sesionesActivas.delete(token);
        return false;
    }
    return true;
}

function requiereLogin(req, res, next) {
    if (sesionValida(req)) return next();
    return res.status(401).json({ success:false, error: 'Necesitas iniciar sesión para hacer cambios.' });
}

// Limpieza periódica de sesiones vencidas.
setInterval(() => {
    const ahora = Date.now();
    for (const [token, expiraEn] of sesionesActivas.entries()) {
        if (ahora > expiraEn) sesionesActivas.delete(token);
    }
}, 60 * 60 * 1000);

// ── RATE LIMITING BÁSICO ────────────────────────────────────────────
const RATE_LIMIT_VENTANA_MS = 60 * 1000;
const RATE_LIMIT_MAX        = 60;
const rateLimitMapa = new Map();

function rateLimiter(req, res, next) {
    const ip    = req.ip || req.socket.remoteAddress || 'desconocida';
    const ahora = Date.now();
    const entrada = rateLimitMapa.get(ip) || { count: 0, inicio: ahora };
    if (ahora - entrada.inicio > RATE_LIMIT_VENTANA_MS) {
        entrada.count = 0;
        entrada.inicio = ahora;
    }
    entrada.count++;
    rateLimitMapa.set(ip, entrada);
    if (entrada.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ success:false, error: 'Demasiadas solicitudes seguidas, espera un momento.' });
    }
    next();
}
setInterval(() => {
    const ahora = Date.now();
    for (const [ip, entrada] of rateLimitMapa.entries()) {
        if (ahora - entrada.inicio > RATE_LIMIT_VENTANA_MS) rateLimitMapa.delete(ip);
    }
}, 5 * 60 * 1000);

// ── SSE: registro de clientes conectados ──────────────────────────
const clientes = new Set();

function broadcast(datos) {
    const payload = `data: ${JSON.stringify(datos)}\n\n`;
    for (const res of clientes) {
        try { res.write(payload); } catch(e) { clientes.delete(res); }
    }
}

// ── LOGIN / LOGOUT ───────────────────────────────────────────────────
app.post('/api/login', rateLimiter, (req, res) => {
    const { password } = req.body;
    if (!passwordValida(password)) {
        return res.status(401).json({ success:false, error: 'Contraseña incorrecta.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    sesionesActivas.set(token, Date.now() + SESION_DURACION_MS);
    const secure = esHttps(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `sesion=${token}; HttpOnly; Path=/; Max-Age=${SESION_DURACION_MS / 1000}; SameSite=Lax${secure}`);
    res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
    const cookies = parsearCookies(req);
    if (cookies.sesion) sesionesActivas.delete(cookies.sesion);
    const secure = esHttps(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `sesion=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`);
    res.json({ success: true });
});

app.get('/api/sesion', (req, res) => {
    res.json({ activa: sesionValida(req) });
});

// ── ENDPOINTS DE LECTURA (siempre abiertos, sin login) ─────────────
app.get('/api/buscar', (req, res) => {
    const q     = req.query.q ? req.query.q.toUpperCase().trim() : '';
    const gen   = req.query.gen ? parseInt(req.query.gen) : null;
    const desde = req.query.desde ? parseInt(req.query.desde) : null;
    const hasta = req.query.hasta ? parseInt(req.query.hasta) : null;
    const efectivo = pokemonEfectivo();
    if (gen) return res.json(efectivo.filter(p => p.gen == gen));
    // El rango se compara contra la especie base de cada entrada (anclaId), no
    // contra su propio id — así una variante cae en el rango de su base aunque
    // su id propio sea >= 1026, fuera de cualquier rango literal 1–1025.
    if (desde && hasta) return res.json(efectivo.filter(p => { const a = anclaId(p); return a >= desde && a <= hasta; }));
    if (!q)  return res.json([]);
    const resultados = efectivo.filter(p => p.name.startsWith(q) || p.name === q);
    res.json(resultados.slice(0, 5));
});

app.get('/api/estadisticas', (req, res) => {
    const modo = modoValido(req.query.modo) ? req.query.modo : 'carpetas';
    const inv  = inventario[modo];
    const efectivo = pokemonEfectivo();
    const idsEfectivos = new Set(efectivo.map(p => p.id));

    // listaIds/fechas se filtran contra idsEfectivos primero: si una variante
    // quedó marcada mientras su categoría estaba activa y después se
    // desactivó, deja de contar acá (pero el dato sigue intacto en
    // inventario.json — reaparece si se reactiva la categoría).
    const listaIds = {};
    const fechas    = {};
    for (const [id, datos] of Object.entries(inv)) {
        if (!idsEfectivos.has(Number(id))) continue;
        listaIds[id] = true;
        if (datos && datos.fecha) fechas[id] = datos.fecha;
    }

    const stats = {};
    for (let g = 1; g <= 9; g++) {
        const pkmsGen = efectivo.filter(p => p.gen == g);
        stats[g] = {
            total: pkmsGen.length,
            conseguidos: pkmsGen.filter(p => listaIds[p.id] !== undefined).length
        };
    }

    res.json({
        modo,
        global: { total: efectivo.length, conseguidos: Object.keys(listaIds).length },
        generaciones: stats,
        listaIds,
        fechas
    });
});

app.get('/api/exportar', (req, res) => {
    const idToName = new Map(pokemonDB.map(p => [p.id, p.name]));
    function formatear(inv) {
        return Object.entries(inv)
            .map(([id, datos]) => ({
                id: Number(id),
                nombre: idToName.get(Number(id)) || null,
                fecha: datos && datos.fecha ? datos.fecha : null
            }))
            .sort((a, b) => a.id - b.id);
    }
    res.json({
        exportadoEl: new Date().toISOString(),
        bulk: formatear(inventario.bulk),
        carpetas: formatear(inventario.carpetas)
    });
});

app.get('/api/carpetas-config', (req, res) => {
    res.json(carpetasConfig);
});

app.get('/api/variantes-config', (req, res) => {
    res.json(variantesConfig);
});

app.get('/api/version', (req, res) => {
    res.json({ commit: VERSION_COMMIT });
});

// ── RESPALDOS: listar (la restauración está en la sección de escritura) ──
// Un mismo listado sirve tanto para mostrarlo en Ajustes como para validar,
// al restaurar, que el archivo pedido es realmente uno de los que existen en
// disco — así /api/backups/restaurar nunca abre una ruta arbitraria.
function listarRespaldos() {
    if (!fs.existsSync(CARPETA_RESPALDOS)) return [];
    return fs.readdirSync(CARPETA_RESPALDOS)
        .filter(f => /^(inventario|antes-de-importar|antes-de-restaurar)-.+\.json$/.test(f))
        .map(f => {
            const stat = fs.statSync(path.join(CARPETA_RESPALDOS, f));
            return {
                archivo: f,
                fecha: stat.mtime.toISOString(),
                tamano: stat.size,
                tipo: f.startsWith('antes-de-importar-') ? 'pre-importacion'
                    : f.startsWith('antes-de-restaurar-') ? 'pre-restauracion'
                    : 'automatico'
            };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

app.get('/api/backups', (req, res) => {
    res.json(listarRespaldos());
});

// ── PDF DE RECORTABLES ──────────────────────────────────────────────
// Hojas carta imprimibles con los 1025 Pokémon en grilla 3x3 (9 por hoja),
// en orden de Pokédex — el mismo orden en que caen en las 4 carpetas
// físicas (cada una es un rango contiguo de generaciones/ids), para
// recortar e ir guiándose de qué casilla es cada uno. Incluye a todos,
// se tenga la carta o no. El contenido no depende del inventario (no
// cambia si marcás/desmarcás cartas), así que se cachea en disco y solo
// se regenera si pokemon_db.json es más nuevo que el PDF cacheado.
const CARPETA_CACHE = path.join(DATA_DIR, 'cache');
if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
const RUTA_PDF_RECORTABLES = path.join(CARPETA_CACHE, 'pokedex-recortables.pdf');
// Caché gemela para el modo "seguidas" con todas las carpetas seleccionadas:
// cuando se eligen todas, la unión de los rangos siempre cubre el 1 al 1025
// completo (invariante de carpetasConfigValida), así que el PDF resultante
// es siempre el mismo listado de los 1025 en orden nacional, sin portadas —
// se puede cachear igual que el default de "separadas".
const RUTA_PDF_RECORTABLES_SEGUIDAS = path.join(CARPETA_CACHE, 'pokedex-recortables-seguidas.pdf');

async function descargarImagen(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const original = Buffer.from(await res.arrayBuffer());
        // Las artworks oficiales vienen en resolución mucho mayor a la que
        // necesita un recortable de ~2.5in — las reducimos y pasamos a JPEG
        // (aplanando la transparencia sobre blanco, igual que el fondo de la
        // hoja) para que el PDF de 1025 imágenes no pese cientos de MB.
        return await sharp(original)
            .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 82 })
            .toBuffer();
    } catch {
        return null;
    }
}

// Descarga las imágenes con concurrencia limitada: en paralelo pero sin
// disparar las 1025 de una, para no saturar la red ni pegarle un pico a GitHub.
async function mapConcurrencia(items, limite, fn) {
    const resultados = new Array(items.length);
    let indice = 0;
    async function trabajador() {
        while (indice < items.length) {
            const i = indice++;
            resultados[i] = await fn(items[i]);
        }
    }
    await Promise.all(Array.from({ length: limite }, trabajador));
    return resultados;
}

const REGIONES = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar', 'Paldea'];

// opciones = { modo: 'separadas'|'seguidas', gens?: Set<number>, rangos?: {desde,hasta}[],
//              portadas: boolean, numeros: 'ambos'|'regional'|'nacional' }
async function generarPDFRecortables(rutaSalida, opciones) {
    if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
    // pokemonEfectivo() ya entrega cada variante activa justo después de su
    // especie base — NO se vuelve a ordenar por id acá, porque eso agruparía
    // todas las variantes (id >= 1026) al final, rompiendo el intercalado.
    const pokemonOrdenados = pokemonEfectivo()
        .filter(p => opciones.modo === 'seguidas'
            ? opciones.rangos.some(r => { const a = anclaId(p); return a >= r.desde && a <= r.hasta; })
            : opciones.gens.has(p.gen));
    const imagenes = await mapConcurrencia(pokemonOrdenados, 12, p => descargarImagen(p.image));
    const imagenPorId = new Map(pokemonOrdenados.map((p, i) => [p.id, imagenes[i]]));
    const pokemonPorId = new Map(pokemonOrdenados.map(p => [p.id, p]));

    const COLS = 3, FILAS = 3, POR_HOJA = COLS * FILAS;
    const margen = 20;

    const doc = new PDFDocument({ size: 'letter', margin: margen });
    const anchoUtil  = doc.page.width  - margen * 2;
    const altoUtil   = doc.page.height - margen * 2;
    const anchoCelda = anchoUtil / COLS;
    const altoCelda  = altoUtil  / FILAS;

    const temp = `${rutaSalida}.tmp-${process.pid}-${Date.now()}`;
    const stream = fs.createWriteStream(temp);
    doc.pipe(stream);

    function dibujarImagenSegura(imgBuf, x, y, ancho, alto) {
        if (!imgBuf) return;
        try {
            doc.image(imgBuf, x, y, { fit: [ancho, alto], align: 'center', valign: 'center' });
        } catch {
            // Imagen corrupta o formato no soportado: seguimos sin ella.
        }
    }

    function textoNumeros(p) {
        const ancla = anclaId(p);
        const rTxt = `R#${String(numeroRegional({ id: ancla, gen: p.gen })).padStart(3, '0')}`;
        const nTxt = `N#${String(ancla).padStart(4, '0')}`;
        const catTxt = p.categoria ? ` (${p.categoria.toUpperCase()})` : '';
        if (opciones.numeros === 'regional') return rTxt + catTxt;
        if (opciones.numeros === 'nacional') return nTxt + catTxt;
        return `${rTxt}   ${nTxt}${catTxt}`;
    }

    if (opciones.modo === 'seguidas') {
        // Sin portadas y sin cortes por generación: una sola tira continua de
        // hojas en orden de Pokédex, exactamente lo que "todas seguidas" significa.
        pokemonOrdenados.forEach((p, i) => {
            const posEnHoja = i % POR_HOJA;
            if (i > 0 && posEnHoja === 0) doc.addPage();
            const col = posEnHoja % COLS;
            const fila = Math.floor(posEnHoja / COLS);
            const x = margen + col * anchoCelda;
            const y = margen + fila * altoCelda;
            const padding = 8;
            doc.lineWidth(0.5).rect(x, y, anchoCelda, altoCelda).stroke('#cccccc');
            const areaImagenAlto = altoCelda * 0.72;
            dibujarImagenSegura(imagenPorId.get(p.id), x + padding, y + padding, anchoCelda - padding * 2, areaImagenAlto - padding);
            const textoY = y + areaImagenAlto + 2;
            doc.fontSize(10).fillColor('#000000')
               .text(textoNumeros(p), x + padding, textoY, { width: anchoCelda - padding * 2, align: 'center' });
            doc.fontSize(9)
               .text(p.name, x + padding, textoY + 13, { width: anchoCelda - padding * 2, align: 'center' });
        });
    } else {
        let primeraPagina = true;
        for (let gen = 1; gen <= 9; gen++) {
        if (!opciones.gens.has(gen)) continue;
        const pokemonGen = pokemonOrdenados.filter(p => p.gen === gen);
        if (!pokemonGen.length) continue;
        if (!primeraPagina) doc.addPage();
        primeraPagina = false;

        if (opciones.portadas) {
            // ── Portada de la región: nombre + los 3 iniciales ──
            // Los iniciales de cada juego siempre caen en las posiciones 1, 4 y 7
            // de la Pokédex regional (planta, fuego, agua), así que se calculan
            // con el mismo corte de generación que el número regional, en vez de
            // tener que mantener una lista aparte a mano.
            doc.fontSize(34).fillColor('#000000')
               .text(REGIONES[gen - 1], margen, 130, { width: anchoUtil, align: 'center' });
            doc.fontSize(14).fillColor('#666666')
               .text(`Generación ${gen}`, margen, 175, { width: anchoUtil, align: 'center' });

            const idsIniciales = [CORTES_GEN[gen] + 1, CORTES_GEN[gen] + 4, CORTES_GEN[gen] + 7];
            const anchoIni = anchoUtil / 3;
            idsIniciales.forEach((id, i) => {
                const pIni = pokemonPorId.get(id);
                if (!pIni) return;
                const xIni = margen + i * anchoIni;
                dibujarImagenSegura(imagenPorId.get(id), xIni + 15, 260, anchoIni - 30, 170);
                doc.fontSize(11).fillColor('#000000')
                   .text(pIni.name, xIni, 435, { width: anchoIni, align: 'center' });
            });

            doc.addPage();
        }

        // ── Hojas de recortables de esta generación (nunca se mezcla con otra) ──
        pokemonGen.forEach((p, i) => {
            const posEnHoja = i % POR_HOJA;
            if (i > 0 && posEnHoja === 0) doc.addPage();

            const col   = posEnHoja % COLS;
            const fila  = Math.floor(posEnHoja / COLS);
            const x     = margen + col  * anchoCelda;
            const y     = margen + fila * altoCelda;
            const padding = 8;

            // Línea de corte guía.
            doc.lineWidth(0.5).rect(x, y, anchoCelda, altoCelda).stroke('#cccccc');

            const areaImagenAlto = altoCelda * 0.72;
            dibujarImagenSegura(imagenPorId.get(p.id), x + padding, y + padding, anchoCelda - padding * 2, areaImagenAlto - padding);

            const textoY = y + areaImagenAlto + 2;
            doc.fontSize(10).fillColor('#000000')
               .text(textoNumeros(p), x + padding, textoY, { width: anchoCelda - padding * 2, align: 'center' });
            doc.fontSize(9)
               .text(p.name, x + padding, textoY + 13, { width: anchoCelda - padding * 2, align: 'center' });
        });
        } // cierra el for (gen) del modo separadas
    } // cierra el else (modo separadas)

    doc.end();
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
    fs.renameSync(temp, rutaSalida);
}

app.get('/api/pdf-carpetas', async (req, res) => {
    try {
        const nombresValidos = new Set(carpetasConfig.carpetas.map(c => c.nombre.toLowerCase()));
        const carpetasParam = (req.query.carpetas || '').trim();
        const nombresPedidos = carpetasParam
            ? carpetasParam.split(',').map(s => s.trim().toLowerCase()).filter(n => nombresValidos.has(n))
            : [...nombresValidos];
        if (!nombresPedidos.length) {
            return res.status(400).json({ success:false, error: 'No se seleccionó ninguna carpeta válida' });
        }
        const seleccionadas = carpetasConfig.carpetas.filter(c => nombresPedidos.includes(c.nombre.toLowerCase()));
        const numeros = ['ambos', 'regional', 'nacional'].includes(req.query.numeros) ? req.query.numeros : 'ambos';

        let opciones;
        if (carpetasConfig.modo === 'seguidas') {
            opciones = {
                modo: 'seguidas',
                rangos: seleccionadas.map(c => ({ desde: c.desde, hasta: c.hasta })),
                portadas: false,
                numeros
            };
        } else {
            const gens = new Set(seleccionadas.flatMap(c => c.gens));
            const portadas = req.query.portadas !== '0' && req.query.portadas !== 'false';
            opciones = { modo: 'separadas', gens, portadas, numeros };
        }

        // "Default" = todas las carpetas seleccionadas, con el formato de números
        // por defecto (y, en separadas, con portadas) — la combinación que sirve
        // la app de entrada y la única que vale la pena cachear en disco.
        const todasSeleccionadas = seleccionadas.length === carpetasConfig.carpetas.length;
        const esDefault = numeros === 'ambos' && todasSeleccionadas &&
            (opciones.modo === 'seguidas' || opciones.portadas);

        if (esDefault) {
            const rutaCache = opciones.modo === 'seguidas' ? RUTA_PDF_RECORTABLES_SEGUIDAS : RUTA_PDF_RECORTABLES;
            const dbStat = fs.statSync(path.join(__dirname, 'pokemon_db.json'));
            // variantes-config.json puede no existir todavía (nadie tocó Ajustes
            // → Variantes) — en ese caso la referencia sigue siendo solo pokemon_db.json.
            const variantesStat = fs.existsSync(RUTA_VARIANTES_CONFIG) ? fs.statSync(RUTA_VARIANTES_CONFIG) : null;
            const referenciaMasNueva = variantesStat ? Math.max(dbStat.mtimeMs, variantesStat.mtimeMs) : dbStat.mtimeMs;
            const cacheOk = fs.existsSync(rutaCache) &&
                fs.statSync(rutaCache).mtimeMs >= referenciaMasNueva;
            if (!cacheOk) await generarPDFRecortables(rutaCache, opciones);
            return res.download(rutaCache, 'pokedex-recortables.pdf');
        }

        // Combinación personalizada: se genera al vuelo, sin tocar la caché
        // (que solo vale para la combinación default de todas las carpetas).
        if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
        const rutaTemp = path.join(CARPETA_CACHE, `recortables-personalizado-${process.pid}-${Date.now()}.pdf`);
        await generarPDFRecortables(rutaTemp, opciones);
        res.download(rutaTemp, 'pokedex-recortables.pdf', () => {
            fs.unlink(rutaTemp, () => {});
        });
    } catch (err) {
        console.error('⚠️  Error generando el PDF de recortables:', err.message);
        res.status(500).json({ success:false, error: 'No se pudo generar el PDF.' });
    }
});

// ── ENDPOINTS DE ESCRITURA (requieren sesión iniciada) ─────────────
app.post('/api/inventario', requiereLogin, rateLimiter, (req, res) => {
    const { id, estado, fecha, modo } = req.body;
    if (!modoValido(modo)) {
        return res.status(400).json({ success:false, error: 'modo debe ser "bulk" o "carpetas"' });
    }
    if (!idsValidos.has(Number(id))) {
        return res.status(400).json({ success:false, error: 'id de Pokémon inválido' });
    }
    const inv = inventario[modo];
    if (estado) {
        const fechaFinal = inv[id]?.fecha || fecha || new Date().toISOString();
        inv[id] = { fecha: fechaFinal };
    } else {
        delete inv[id];
    }
    guardarInventario();

    const fechaGuardada = estado ? inv[id].fecha : null;
    broadcast({ tipo: 'cambio', modo, id: String(id), estado: !!estado, fecha: fechaGuardada });

    res.json({ success: true, fecha: fechaGuardada });
});

// ── CONFIGURAR CARPETAS (wizard) ────────────────────────────────────
app.post('/api/carpetas-config', requiereLogin, rateLimiter, (req, res) => {
    const nueva = req.body;
    if (!carpetasConfigValida(nueva)) {
        return res.status(400).json({
            success: false,
            error: nueva && nueva.modo === 'seguidas'
                ? 'Configuración inválida: cada carpeta necesita nombre único, color (#rrggbb) y un rango de nº de Pokédex — y los rangos deben cubrir del 1 al 1025 sin huecos ni superposición.'
                : 'Configuración inválida: cada carpeta necesita nombre único, color (#rrggbb), al menos una generación, y espacios suficientes para todos sus Pokémon — y las 9 generaciones deben repartirse sin faltar ni repetirse.'
        });
    }
    carpetasConfig = nueva.modo === 'seguidas'
        ? {
            modo: 'seguidas',
            carpetas: [...nueva.carpetas].sort((a, b) => a.desde - b.desde).map(c => ({
                nombre: c.nombre.trim(), color: c.color, desde: c.desde, hasta: c.hasta, espacios: c.espacios
            }))
        }
        : {
            modo: 'separadas',
            carpetas: nueva.carpetas.map(c => ({
                nombre: c.nombre.trim(), color: c.color, gens: [...c.gens].sort((a, b) => a - b), espacios: c.espacios
            }))
        };
    guardarCarpetasConfig();
    broadcast({ tipo: 'config' }); // mismo evento que usa /api/importar para avisar "recargá todo"
    res.json({ success: true, carpetas: carpetasConfig });
});

// ── CONFIGURAR VARIANTES (Ajustes) ──────────────────────────────────
app.post('/api/variantes-config', requiereLogin, rateLimiter, (req, res) => {
    if (!variantesConfigValida(req.body)) {
        return res.status(400).json({ success: false, error: 'Configuración de variantes inválida.' });
    }
    variantesConfig = req.body;
    guardarVariantesConfig();
    broadcast({ tipo: 'config' }); // mismo evento que ya usan /api/importar y /api/carpetas-config
    res.json({ success: true, variantesConfig });
});

// ── IMPORTAR: restaura un respaldo generado por /api/exportar ─────
// Reemplaza el inventario actual del modo indicado. Guarda un respaldo del
// estado previo antes de tocar nada, por seguridad.
app.post('/api/importar', requiereLogin, rateLimiter, (req, res) => {
    const { modo, registros } = req.body;
    if (!modoValido(modo)) {
        return res.status(400).json({ success:false, error: 'modo debe ser "bulk" o "carpetas"' });
    }
    if (!Array.isArray(registros)) {
        return res.status(400).json({ success:false, error: 'Formato de archivo inválido: falta la lista de registros.' });
    }

    // Respaldo del estado justo antes de importar, por si algo sale mal.
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    escribirJSONAtomico(
        path.join(CARPETA_RESPALDOS, `antes-de-importar-${timestamp}.json`),
        inventario
    );

    const nuevo = {};
    let ignorados = 0;
    registros.forEach(r => {
        const id = Number(r.id);
        if (!idsValidos.has(id)) { ignorados++; return; }
        nuevo[id] = { fecha: r.fecha || new Date().toISOString() };
    });

    inventario[modo] = nuevo;
    guardarInventario();
    broadcast({ tipo: 'config' }); // reutilizamos este tipo para decir "recarga todo"

    res.json({ success: true, importados: Object.keys(nuevo).length, ignorados });
});

// ── RESTAURAR DESDE RESPALDO ─────────────────────────────────────────
// Reemplaza bulk y carpetas enteros (el respaldo guarda ambos juntos, a
// diferencia de /api/importar que solo toca el modo actual). Igual que ahí,
// primero se guarda un respaldo del estado justo antes de pisarlo.
app.post('/api/backups/restaurar', requiereLogin, rateLimiter, (req, res) => {
    const { archivo } = req.body;
    const disponibles = new Set(listarRespaldos().map(r => r.archivo));
    if (typeof archivo !== 'string' || !disponibles.has(archivo)) {
        return res.status(400).json({ success:false, error: 'Ese respaldo no existe.' });
    }

    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(path.join(CARPETA_RESPALDOS, archivo), 'utf8'));
    } catch (err) {
        return res.status(500).json({ success:false, error: 'El archivo de respaldo está corrupto.' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    escribirJSONAtomico(
        path.join(CARPETA_RESPALDOS, `antes-de-restaurar-${timestamp}.json`),
        inventario
    );

    inventario = { bulk: raw.bulk || {}, carpetas: raw.carpetas || {} };
    guardarInventario();
    broadcast({ tipo: 'config' }); // mismo evento que usan /api/importar y /api/carpetas-config para "recargá todo"

    res.json({ success: true });
});

// ── SSE: endpoint de eventos en tiempo real ───────────────────────
app.get('/api/eventos', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ tipo: 'conectado' })}\n\n`);

    clientes.add(res);
    console.log(`📡 Cliente conectado. Total: ${clientes.size}`);

    req.on('close', () => {
        clientes.delete(res);
        console.log(`📴 Cliente desconectado. Total: ${clientes.size}`);
    });
});

// ── AUTO-DEPLOY: webhook de GitHub ──────────────────────────────────
// Cada push a main hace que GitHub llame a este endpoint. Verificamos la
// firma HMAC-SHA256 (header X-Hub-Signature-256) contra DEPLOY_WEBHOOK_SECRET
// antes de tocar nada, así nadie más puede disparar un deploy. Después de
// actualizar el código, el proceso termina con código de error a propósito
// — el unit de systemd tiene Restart=on-failure, así que lo vuelve a
// levantar solo, ya con el código nuevo, sin que este proceso necesite
// permisos para llamar a systemctl.
const DEPLOY_WEBHOOK_SECRET = process.env.DEPLOY_WEBHOOK_SECRET || null;
if (!DEPLOY_WEBHOOK_SECRET) {
    console.warn('⚠️  DEPLOY_WEBHOOK_SECRET no configurado — el auto-deploy por webhook queda deshabilitado.');
} else {
    console.log('🔗 Auto-deploy por webhook activo.');
}

function firmaValida(req) {
    const firma = req.headers['x-hub-signature-256'];
    if (!firma || !req.rawBody) return false;
    const esperada = 'sha256=' + crypto.createHmac('sha256', DEPLOY_WEBHOOK_SECRET).update(req.rawBody).digest('hex');
    const bufFirma = Buffer.from(firma);
    const bufEsperada = Buffer.from(esperada);
    if (bufFirma.length !== bufEsperada.length) return false;
    return crypto.timingSafeEqual(bufFirma, bufEsperada);
}

app.post('/api/webhook-deploy', (req, res) => {
    if (!DEPLOY_WEBHOOK_SECRET) return res.status(503).json({ success:false, error: 'Auto-deploy no configurado' });
    if (!firmaValida(req)) return res.status(401).json({ success:false, error: 'Firma inválida' });
    if (req.body.ref !== 'refs/heads/main') {
        return res.json({ success:true, ignorado: true, motivo: 'no es push a main' });
    }

    res.json({ success:true, mensaje: 'Deploy en curso' });

    (async () => {
        try {
            console.log('🚀 Webhook de GitHub: actualizando desde main...');
            await execAsync('git fetch origin main && git reset --hard origin/main', { cwd: __dirname });
            await execAsync('npm install', { cwd: __dirname });
            console.log('✅ Deploy actualizado, reiniciando proceso...');
            process.exit(1);
        } catch (err) {
            console.error('⚠️  Error en el auto-deploy:', err.message);
        }
    })();
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
