const express   = require('express');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');
const { exec }  = require('child_process');
const util      = require('util');
const execAsync = util.promisify(exec);
const PDFDocument = require('pdfkit');
const sharp     = require('sharp');
const app       = express();
const PORT      = 3000;

app.use(express.json({
    limit: '2mb', // el respaldo importado puede pesar un poco
    // Guardamos también el body crudo: el webhook de auto-deploy necesita
    // verificar la firma HMAC de GitHub sobre los bytes exactos recibidos,
    // no sobre el JSON ya parseado/re-serializado.
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(express.static(path.join(__dirname, 'public')));

const pokemonDB = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
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
const CARPETA_RESPALDOS = path.join(__dirname, 'backups');
if (!fs.existsSync(CARPETA_RESPALDOS)) fs.mkdirSync(CARPETA_RESPALDOS);

// ── INVENTARIO ──────────────────────────────────────────────────────
// Dos colecciones completamente independientes: "bulk" (cartas sueltas) y
// "carpetas" (organizadas en binders). Cada una es un mapa id -> { fecha }.
// inventario[modo][id] = { fecha: "2026-07-15T12:00:00.000Z" }
let inventario = { bulk: {}, carpetas: {} };
if (fs.existsSync('inventario.json')) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync('inventario.json', 'utf8'));
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
    escribirJSONAtomico('inventario.json', inventario);
}
function modoValido(modo) {
    return modo === 'bulk' || modo === 'carpetas';
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

// ── PDF DE RECORTABLES ──────────────────────────────────────────────
// Hojas carta imprimibles con los 1025 Pokémon en grilla 3x3 (9 por hoja),
// en orden de Pokédex — el mismo orden en que caen en las 4 carpetas
// físicas (cada una es un rango contiguo de generaciones/ids), para
// recortar e ir guiándose de qué casilla es cada uno. Incluye a todos,
// se tenga la carta o no. El contenido no depende del inventario (no
// cambia si marcás/desmarcás cartas), así que se cachea en disco y solo
// se regenera si pokemon_db.json es más nuevo que el PDF cacheado.
const CARPETA_CACHE = path.join(__dirname, 'cache');
if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE);
const RUTA_PDF_RECORTABLES = path.join(CARPETA_CACHE, 'pokedex-recortables.pdf');

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

async function generarPDFRecortables() {
    if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
    const pokemonOrdenados = [...pokemonDB].sort((a, b) => a.id - b.id);
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

    const temp = `${RUTA_PDF_RECORTABLES}.tmp-${process.pid}`;
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

    let primeraPagina = true;
    for (let gen = 1; gen <= 9; gen++) {
        const pokemonGen = pokemonOrdenados.filter(p => p.gen === gen);
        if (!pokemonGen.length) continue;
        if (!primeraPagina) doc.addPage();
        primeraPagina = false;

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

        // ── Hojas de recortables de esta generación (nunca se mezcla con otra) ──
        doc.addPage();
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
            const rTxt = `R#${String(numeroRegional(p)).padStart(3, '0')}`;
            const nTxt = `N#${String(p.id).padStart(4, '0')}`;
            doc.fontSize(10).fillColor('#000000')
               .text(`${rTxt}   ${nTxt}`, x + padding, textoY, { width: anchoCelda - padding * 2, align: 'center' });
            doc.fontSize(9)
               .text(p.name, x + padding, textoY + 13, { width: anchoCelda - padding * 2, align: 'center' });
        });
    }

    doc.end();
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });
    fs.renameSync(temp, RUTA_PDF_RECORTABLES);
}

app.get('/api/pdf-carpetas', async (req, res) => {
    try {
        const dbStat  = fs.statSync(path.join(__dirname, 'pokemon_db.json'));
        const cacheOk = fs.existsSync(RUTA_PDF_RECORTABLES) &&
            fs.statSync(RUTA_PDF_RECORTABLES).mtimeMs >= dbStat.mtimeMs;
        if (!cacheOk) await generarPDFRecortables();
        res.download(RUTA_PDF_RECORTABLES, 'pokedex-recortables.pdf');
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
