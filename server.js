const express = require('express');
const fs      = require('fs');
const path    = require('path');
const app     = express();
const PORT    = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pokemonDB = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
let inventario  = {};
if (fs.existsSync('inventario.json')) {
    inventario = JSON.parse(fs.readFileSync('inventario.json', 'utf8'));
}

// ── SSE: registro de clientes conectados ──────────────────────────
const clientes = new Set();

function broadcast(datos) {
    const payload = `data: ${JSON.stringify(datos)}\n\n`;
    for (const res of clientes) {
        try { res.write(payload); } catch(e) { clientes.delete(res); }
    }
}

// ── ENDPOINTS ORIGINALES (sin cambios) ───────────────────────────
app.get('/api/buscar', (req, res) => {
    const q   = req.query.q ? req.query.q.toUpperCase().trim() : '';
    const gen = req.query.gen ? parseInt(req.query.gen) : null;
    if (gen) return res.json(pokemonDB.filter(p => p.gen == gen));
    if (!q)  return res.json([]);
    const resultados = pokemonDB.filter(p => p.name.startsWith(q) || p.name === q);
    res.json(resultados.slice(0, 5));
});

app.get('/api/estadisticas', (req, res) => {
    const stats = {};
    for (let g = 1; g <= 9; g++) {
        const totalGen      = pokemonDB.filter(p => p.gen == g).length;
        const conseguidosGen = pokemonDB.filter(p => p.gen == g && inventario[p.id] === true).length;
        stats[g] = { total: totalGen, conseguidos: conseguidosGen };
    }
    const totalGlobal      = pokemonDB.length;
    const conseguidosGlobal = Object.values(inventario).filter(v => v === true).length;
    res.json({
        global: { total: totalGlobal, conseguidos: conseguidosGlobal },
        generaciones: stats,
        listaIds: inventario
    });
});

// ── INVENTARIO: guarda y notifica a todos los dispositivos ────────
app.post('/api/inventario', (req, res) => {
    const { id, estado } = req.body;
    if (estado) { inventario[id] = true; } else { delete inventario[id]; }
    fs.writeFileSync('inventario.json', JSON.stringify(inventario, null, 2));

    // Notificar a todos los clientes SSE conectados
    broadcast({ tipo: 'cambio', id: String(id), estado: !!estado });

    res.json({ success: true });
});

// ── SSE: endpoint de eventos en tiempo real ───────────────────────
app.get('/api/eventos', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Mensaje inicial: confirma conexión
    res.write(`data: ${JSON.stringify({ tipo: 'conectado' })}\n\n`);

    clientes.add(res);
    console.log(`📡 Cliente conectado. Total: ${clientes.size}`);

    // Limpiar cuando el cliente se desconecta
    req.on('close', () => {
        clientes.delete(res);
        console.log(`📴 Cliente desconectado. Total: ${clientes.size}`);
    });
});

app.listen(PORT, () => console.log(`🚀 Servidor activo en puerto ${PORT}`));
