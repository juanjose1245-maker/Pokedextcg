const express = require('express');
const fs      = require('fs');
const path    = require('path');
const app     = express();
const PORT    = 3000;

app.use(express.json());
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
        // Ya está en el formato nuevo (dos inventarios).
        inventario = { bulk: raw.bulk || {}, carpetas: raw.carpetas || {} };
    } else {
        // Formato viejo (un solo inventario plano, id->true o id->{fecha}):
        // lo migramos completo a "carpetas", que es el que ya existía antes.
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

// ── SSE: registro de clientes conectados ──────────────────────────
const clientes = new Set();

function broadcast(datos) {
    const payload = `data: ${JSON.stringify(datos)}\n\n`;
    for (const res of clientes) {
        try { res.write(payload); } catch(e) { clientes.delete(res); }
    }
}

// ── ENDPOINTS ───────────────────────────────────────────────────────
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

// ── INVENTARIO: guarda, guarda fecha, y notifica a todos los dispositivos ──
app.post('/api/inventario', (req, res) => {
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
