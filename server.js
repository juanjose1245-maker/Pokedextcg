const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const app     = express();
const PORT    = 3000;

app.use(express.json({ limit: '2mb' })); // el respaldo importado puede pesar un poco
app.use(express.static(path.join(__dirname, 'public')));

const pokemonDB = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));

// ── INVENTARIO ──────────────────────────────────────────────────────
// Dos colecciones completamente independientes: "bulk" (cartas sueltas) y
// "carpetas" (organizadas en binders). Cada una es un mapa id -> { fecha }.
// inventario[modo][id] = { fecha: "2026-07-15T12:00:00.000Z" }
let inventario = { bulk: {}, carpetas: {} };
if (fs.existsSync('inventario.json')) {
    const raw = JSON.parse(fs.readFileSync('inventario.json', 'utf8'));
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
    fs.writeFileSync('inventario.json', JSON.stringify(inventario, null, 2));
}
function modoValido(modo) {
    return modo === 'bulk' || modo === 'carpetas';
}

// ── RESPALDO AUTOMÁTICO PERIÓDICO ───────────────────────────────────
// Guarda una copia del inventario cada 24h (y una al arrancar el servidor),
// quedándose solo con los últimos 14 respaldos para no llenar el disco.
const CARPETA_RESPALDOS = path.join(__dirname, 'backups');
if (!fs.existsSync(CARPETA_RESPALDOS)) fs.mkdirSync(CARPETA_RESPALDOS);

function respaldoAutomatico() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const ruta = path.join(CARPETA_RESPALDOS, `inventario-${timestamp}.json`);
        fs.writeFileSync(ruta, JSON.stringify(inventario, null, 2));
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
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success:false, error: 'Contraseña incorrecta.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    sesionesActivas.set(token, Date.now() + SESION_DURACION_MS);
    res.setHeader('Set-Cookie', `sesion=${token}; HttpOnly; Path=/; Max-Age=${SESION_DURACION_MS / 1000}; SameSite=Lax`);
    res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
    const cookies = parsearCookies(req);
    if (cookies.sesion) sesionesActivas.delete(cookies.sesion);
    res.setHeader('Set-Cookie', 'sesion=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
    res.json({ success: true });
});

app.get('/api/sesion', (req, res) => {
    res.json({ activa: sesionValida(req) });
});

// ── ENDPOINTS DE LECTURA (siempre abiertos, sin login) ─────────────
app.get('/api/buscar', (req, res) => {
    const q   = req.query.q ? req.query.q.toUpperCase().trim() : '';
    const gen = req.query.gen ? parseInt(req.query.gen) : null;
    if (gen) return res.json(pokemonDB.filter(p => p.gen == gen));
    if (!q)  return res.json([]);
    const resultados = pokemonDB.filter(p => p.name.startsWith(q) || p.name === q);
    res.json(resultados.slice(0, 5));
});

app.get('/api/estadisticas', (req, res) => {
    const modo = modoValido(req.query.modo) ? req.query.modo : 'carpetas';
    const inv  = inventario[modo];

    const stats = {};
    for (let g = 1; g <= 9; g++) {
        const totalGen       = pokemonDB.filter(p => p.gen == g).length;
        const conseguidosGen = pokemonDB.filter(p => p.gen == g && inv[p.id] !== undefined).length;
        stats[g] = { total: totalGen, conseguidos: conseguidosGen };
    }
    const totalGlobal       = pokemonDB.length;
    const conseguidosGlobal = Object.keys(inv).length;

    const listaIds = {};
    const fechas    = {};
    for (const [id, datos] of Object.entries(inv)) {
        listaIds[id] = true;
        if (datos && datos.fecha) fechas[id] = datos.fecha;
    }

    res.json({
        modo,
        global: { total: totalGlobal, conseguidos: conseguidosGlobal },
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

// ── ENDPOINTS DE ESCRITURA (requieren sesión iniciada) ─────────────
app.post('/api/inventario', requiereLogin, rateLimiter, (req, res) => {
    const { id, estado, fecha, modo } = req.body;
    if (!modoValido(modo)) {
        return res.status(400).json({ success:false, error: 'modo debe ser "bulk" o "carpetas"' });
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
    fs.writeFileSync(
        path.join(CARPETA_RESPALDOS, `antes-de-importar-${timestamp}.json`),
        JSON.stringify(inventario, null, 2)
    );

    const nuevo = {};
    const idsValidos = new Set(pokemonDB.map(p => p.id));
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

// ── SSE: endpoint de eventos en tiempo real ───────────────────────
app.get('/api/eventos', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ tipo: 'conectado' })}\n\n`);

    clientes.add(res);
    console.log(`📡 Cliente conectado. Total: ${clientes.size}`);

    req.on('close', () => {
        clientes.delete(res);
        console.log(`📴 Cliente desconectado. Total: ${clientes.size}`);
    });
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
