# Modo "Todas Seguidas" para Carpetas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Todas seguidas" option in the carpetas wizard actually work — collections split into contiguous national-dex-number ranges instead of whole-generation blocks — end to end (server storage, API, gallery, sidebar, PDF export, wizard UI).

**Architecture:** Extend the existing `carpetas.json` shape from a bare array to `{modo, carpetas}`, where `modo` is `'separadas'` (existing, gens-based) or `'seguidas'` (new, `desde`/`hasta` dex-id range based). Every consumer (`carpetaDe`, sidebar, gallery-open, PDF generator, wizard) branches on `modo`. Per-carpeta progress for "seguidas" is computed **entirely client-side** from data already in `dataGlobalCache.listaIds` — no new stats endpoint needed.

**Tech Stack:** Node/Express (`server.js`, single file), vanilla JS/HTML/CSS (`public/app.js`, `public/index.html`, `public/styles.css`). No test framework (`npm test` is a placeholder — CLAUDE.md). No bundler, no build step.

## Global Constraints

- Spanish comments/UI strings only (project convention).
- `server.js` and `index.html`/`app.js` are intentionally monolithic — don't split into modules.
- `bulk` and `carpetas` inventories stay independent — this feature only touches the `carpetas`-mode organizational metadata (`carpetas.json`), never `inventario.json`.
- Any edit to `public/index.html`, `public/app.js`, or `public/styles.css` requires bumping `CACHE_VERSION` in `public/sw.js` in the **same commit** (documented "gotcha" in CLAUDE.md — browsers won't pick up shell changes otherwise).
- No placeholders/TODOs — every task below has complete, runnable code.
- Verification in this repo means manual `curl`/`node -e` checks and browser walkthroughs, not an automated test suite (none exists, and CLAUDE.md says not to add one implicitly).

---

### Task 1: Server — data model, migration, validation

**Files:**
- Modify: `server.js:99-134` (`CARPETAS_DEFAULT`, `carpetasConfigValida`, load logic)

**Interfaces:**
- Produces: `carpetasConfig` global now shaped `{ modo: 'separadas'|'seguidas', carpetas: Array }` (was: bare array). `carpetasConfigValida(candidato)` now takes/validates the whole `{modo, carpetas}` object.
- Consumes: existing `pokemonPorGens(gens)` (unchanged, server.js:96-98).

- [ ] **Step 1: Replace `CARPETAS_DEFAULT` initialization and `carpetasConfigValida`**

Replace this block (server.js:99-131):
```js
const CARPETAS_DEFAULT = [
    { nombre: 'Azul',   color: '#3b5bdb', gens: [1, 2],    espacios: pokemonPorGens([1, 2]) },
    { nombre: 'Morada', color: '#7c3aed', gens: [3, 4],    espacios: pokemonPorGens([3, 4]) },
    { nombre: 'Rosa',   color: '#db2777', gens: [5, 6, 7], espacios: pokemonPorGens([5, 6, 7]) },
    { nombre: 'Roja',   color: '#dc2626', gens: [8, 9],    espacios: pokemonPorGens([8, 9]) }
];

function carpetasConfigValida(candidato) {
    if (!Array.isArray(candidato) || !candidato.length) return false;
    const vistos = new Set();
    for (const c of candidato) {
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

let carpetasConfig = CARPETAS_DEFAULT;
if (fs.existsSync('carpetas.json')) {
    try {
        const raw = JSON.parse(fs.readFileSync('carpetas.json', 'utf8'));
        if (carpetasConfigValida(raw)) carpetasConfig = raw;
        else console.warn('⚠️  carpetas.json inválido, usando la configuración por defecto.');
    } catch (err) {
        console.error('⚠️  carpetas.json corrupto, usando la configuración por defecto:', err.message);
    }
}
function guardarCarpetasConfig() {
    escribirJSONAtomico('carpetas.json', carpetasConfig);
}
```
with:

```js
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
function carpetasConfigValida(candidato) {
    if (!candidato || typeof candidato !== 'object' || Array.isArray(candidato)) return false;
    const { modo, carpetas } = candidato;
    if (!Array.isArray(carpetas) || !carpetas.length) return false;

    if (modo === 'seguidas') {
        const ordenadas = [...carpetas].sort((a, b) => a.desde - b.desde);
        let siguienteDesde = 1;
        for (const c of ordenadas) {
            if (!c || typeof c.nombre !== 'string' || !c.nombre.trim()) return false;
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
if (fs.existsSync('carpetas.json')) {
    try {
        let raw = JSON.parse(fs.readFileSync('carpetas.json', 'utf8'));
        if (Array.isArray(raw)) raw = { modo: 'separadas', carpetas: raw }; // formato viejo, antes de este cambio
        if (carpetasConfigValida(raw)) carpetasConfig = raw;
        else console.warn('⚠️  carpetas.json inválido, usando la configuración por defecto.');
    } catch (err) {
        console.error('⚠️  carpetas.json corrupto, usando la configuración por defecto:', err.message);
    }
}
function guardarCarpetasConfig() {
    escribirJSONAtomico('carpetas.json', carpetasConfig);
}
```

- [ ] **Step 2: Verify validation logic with a standalone script**

Run this (doesn't touch the running server, just re-checks the logic in isolation):

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('server.js', 'utf8');
const start = src.indexOf('function pokemonPorGens');
const end = src.indexOf('let carpetasConfig =');
eval(src.slice(start, end));

// separadas válido (el default)
console.log('default separadas:', carpetasConfigValida({modo:'separadas', carpetas: CARPETAS_DEFAULT}));

// seguidas válido: dos carpetas cubriendo 1-1025 sin huecos
const seguidasOk = { modo:'seguidas', carpetas: [
    { nombre:'Una', color:'#3b5bdb', desde:1, hasta:500, espacios:500 },
    { nombre:'Dos', color:'#7c3aed', desde:501, hasta:1025, espacios:525 }
]};
console.log('seguidas ok:', carpetasConfigValida(seguidasOk));

// seguidas con hueco (debe fallar)
const seguidasHueco = { modo:'seguidas', carpetas: [
    { nombre:'Una', color:'#3b5bdb', desde:1, hasta:400, espacios:400 },
    { nombre:'Dos', color:'#7c3aed', desde:501, hasta:1025, espacios:525 }
]};
console.log('seguidas con hueco (debe ser false):', carpetasConfigValida(seguidasHueco));

// seguidas que no llega a 1025 (debe fallar)
const seguidasCorta = { modo:'seguidas', carpetas: [
    { nombre:'Una', color:'#3b5bdb', desde:1, hasta:900, espacios:900 }
]};
console.log('seguidas incompleta (debe ser false):', carpetasConfigValida(seguidasCorta));
"
```

Expected output:
```
default separadas: true
seguidas ok: true
seguidas con hueco (debe ser false): false
seguidas incompleta (debe ser false): false
```

- [ ] **Step 3: Sanity-check the server still boots**

```bash
node --check server.js && echo "sintaxis OK"
```

Expected: `sintaxis OK`. (Full restart happens in Task 2 once the endpoints are updated to match — restarting now would 500 on `GET /api/carpetas-config` since it still does `res.json(carpetasConfig)`, which now returns the wrapped shape; that's fine, nothing reads it until Task 2/4.)

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "Extender el modelo de carpetas.json para soportar modo 'seguidas'"
```

---

### Task 2: Server — `/api/carpetas-config` + `/api/buscar` for ranges

**Files:**
- Modify: `server.js:287-294` (`/api/buscar`)
- Modify: `server.js:343-345` (`GET /api/carpetas-config` — no code change needed, confirm it still returns `carpetasConfig` as-is)
- Modify: `server.js:567-584` (`POST /api/carpetas-config`)

**Interfaces:**
- Consumes: `carpetasConfigValida` from Task 1.
- Produces: `GET /api/carpetas-config` → `{modo, carpetas}`. `POST /api/carpetas-config` body → `{modo, carpetas}`. `GET /api/buscar?desde=N&hasta=M` → `Pokemon[]`.

- [ ] **Step 1: Add `desde`/`hasta` support to `/api/buscar`**

Replace server.js:287-294:
```js
app.get('/api/buscar', (req, res) => {
    const q   = req.query.q ? req.query.q.toUpperCase().trim() : '';
    const gen = req.query.gen ? parseInt(req.query.gen) : null;
    if (gen) return res.json(pokemonDB.filter(p => p.gen == gen));
    if (!q)  return res.json([]);
    const resultados = pokemonDB.filter(p => p.name.startsWith(q) || p.name === q);
    res.json(resultados.slice(0, 5));
});
```
with:
```js
app.get('/api/buscar', (req, res) => {
    const q     = req.query.q ? req.query.q.toUpperCase().trim() : '';
    const gen   = req.query.gen ? parseInt(req.query.gen) : null;
    const desde = req.query.desde ? parseInt(req.query.desde) : null;
    const hasta = req.query.hasta ? parseInt(req.query.hasta) : null;
    if (gen) return res.json(pokemonDB.filter(p => p.gen == gen));
    if (desde && hasta) return res.json(pokemonDB.filter(p => p.id >= desde && p.id <= hasta));
    if (!q)  return res.json([]);
    const resultados = pokemonDB.filter(p => p.name.startsWith(q) || p.name === q);
    res.json(resultados.slice(0, 5));
});
```

- [ ] **Step 2: Update `POST /api/carpetas-config` for the new shape**

Replace server.js:567-584:
```js
app.post('/api/carpetas-config', requiereLogin, rateLimiter, (req, res) => {
    const nueva = req.body;
    if (!carpetasConfigValida(nueva)) {
        return res.status(400).json({
            success: false,
            error: 'Configuración inválida: cada carpeta necesita nombre, color (#rrggbb), al menos una generación, y espacios suficientes para todos sus Pokémon — y las 9 generaciones deben repartirse sin faltar ni repetirse.'
        });
    }
    carpetasConfig = nueva.map(c => ({
        nombre: c.nombre.trim(),
        color: c.color,
        gens: [...c.gens].sort((a, b) => a - b),
        espacios: c.espacios
    }));
    guardarCarpetasConfig();
    broadcast({ tipo: 'config' }); // mismo evento que usa /api/importar para avisar "recargá todo"
    res.json({ success: true, carpetas: carpetasConfig });
});
```
with:
```js
app.post('/api/carpetas-config', requiereLogin, rateLimiter, (req, res) => {
    const nueva = req.body;
    if (!carpetasConfigValida(nueva)) {
        return res.status(400).json({
            success: false,
            error: nueva && nueva.modo === 'seguidas'
                ? 'Configuración inválida: cada carpeta necesita nombre, color (#rrggbb) y un rango de nº de Pokédex — y los rangos deben cubrir del 1 al 1025 sin huecos ni superposición.'
                : 'Configuración inválida: cada carpeta necesita nombre, color (#rrggbb), al menos una generación, y espacios suficientes para todos sus Pokémon — y las 9 generaciones deben repartirse sin faltar ni repetirse.'
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
```

Note `GET /api/carpetas-config` (server.js:343-345) needs no code change — `res.json(carpetasConfig)` already returns whatever shape `carpetasConfig` holds.

- [ ] **Step 3: Restart the server and verify with curl**

```bash
systemctl restart pokedex.service
sleep 1
curl -s http://localhost:3000/api/carpetas-config | head -c 300; echo
curl -s "http://localhost:3000/api/buscar?desde=1&hasta=3" | node -e "
let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
  const arr = JSON.parse(d);
  console.log('count:', arr.length, 'ids:', arr.map(p=>p.id));
});
"
```

Expected: the first `curl` prints `{"modo":"separadas","carpetas":[{"nombre":"Azul",...` (wrapped shape). The second prints `count: 3 ids: [ 1, 2, 3 ]`.

- [ ] **Step 4: Verify login-gated POST rejects a bad seguidas payload**

```bash
curl -s -i -X POST http://localhost:3000/api/carpetas-config \
  -H 'Content-Type: application/json' \
  -d '{"modo":"seguidas","carpetas":[{"nombre":"X","color":"#3b5bdb","desde":1,"hasta":900,"espacios":900}]}' \
  | head -20
```

Expected: `HTTP/1.1 401` (not logged in — `requiereLogin` blocks it before validation even runs; this just confirms the route didn't crash). Logging in and re-testing with valid ranges is covered by the full wizard walkthrough in Task 10.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Soportar modo 'seguidas' en /api/carpetas-config y rangos en /api/buscar"
```

---

### Task 3: Server — PDF de recortables por rango

**Files:**
- Modify: `server.js:395-401` (filter inside `generarPDFRecortables`)
- Modify: `server.js:435-491` (rendering loop inside `generarPDFRecortables`)
- Modify: `server.js:501-526` (`/api/pdf-carpetas` — building `opciones`)

**Interfaces:**
- Consumes: `carpetasConfig.modo`/`carpetasConfig.carpetas` from Task 1/2.
- Produces: `generarPDFRecortables(rutaSalida, opciones)` now takes `opciones = { modo: 'separadas'|'seguidas', gens?: Set<number>, rangos?: {desde,hasta}[], portadas: boolean, numeros: string }`.

- [ ] **Step 1: Generalize the Pokémon filter in `generarPDFRecortables`**

Replace server.js:395-401:
```js
// opciones = { gens: Set<number>, portadas: boolean, numeros: 'ambos'|'regional'|'nacional' }
async function generarPDFRecortables(rutaSalida, opciones) {
    if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
    const pokemonOrdenados = [...pokemonDB]
        .filter(p => opciones.gens.has(p.gen))
        .sort((a, b) => a.id - b.id);
```
with:
```js
// opciones = { modo: 'separadas'|'seguidas', gens?: Set<number>, rangos?: {desde,hasta}[],
//              portadas: boolean, numeros: 'ambos'|'regional'|'nacional' }
async function generarPDFRecortables(rutaSalida, opciones) {
    if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
    const pokemonOrdenados = [...pokemonDB]
        .filter(p => opciones.modo === 'seguidas'
            ? opciones.rangos.some(r => p.id >= r.desde && p.id <= r.hasta)
            : opciones.gens.has(p.gen))
        .sort((a, b) => a.id - b.id);
```

- [ ] **Step 2: Add the "seguidas" rendering branch (no portadas, no per-generation page breaks)**

Find this line in server.js (currently line 435):
```js
    let primeraPagina = true;
    for (let gen = 1; gen <= 9; gen++) {
```
Insert a new branch **before** that `let primeraPagina = true;` line, so the seguidas case returns early and the existing per-generation loop (unchanged) only runs for `separadas`:

```js
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
```

Then, at the end of that `for` loop (currently the closing `}` right before `doc.end();` at server.js:491-493), add the matching closing brace for the new `else`:

```js
        }); // cierra pokemonGen.forEach
    } // cierra el else (modo separadas)

    doc.end();
```

(This just wraps the existing per-generation loop in `else { ... }` — no other change to its body.)

- [ ] **Step 3: Update `/api/pdf-carpetas` to build range-based `opciones` in seguidas mode**

Replace server.js:501-518 (from `app.get('/api/pdf-carpetas'...` through `const esDefault = ...`):
```js
app.get('/api/pdf-carpetas', async (req, res) => {
    try {
        const nombresValidos = new Set(carpetasConfig.map(c => c.nombre.toLowerCase()));
        const carpetasParam = (req.query.carpetas || '').trim();
        const nombresPedidos = carpetasParam
            ? carpetasParam.split(',').map(s => s.trim().toLowerCase()).filter(n => nombresValidos.has(n))
            : [...nombresValidos];
        if (!nombresPedidos.length) {
            return res.status(400).json({ success:false, error: 'No se seleccionó ninguna carpeta válida' });
        }
        const gens = new Set(
            carpetasConfig.filter(c => nombresPedidos.includes(c.nombre.toLowerCase())).flatMap(c => c.gens)
        );
        const portadas = req.query.portadas !== '0' && req.query.portadas !== 'false';
        const numeros = ['ambos', 'regional', 'nacional'].includes(req.query.numeros) ? req.query.numeros : 'ambos';
        const opciones = { gens, portadas, numeros };

        const esDefault = gens.size === 9 && portadas && numeros === 'ambos';
```
with:
```js
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

        const esDefault = opciones.modo === 'separadas' && opciones.gens.size === 9 && opciones.portadas && numeros === 'ambos';
```

The rest of the handler (the `esDefault` cache-or-generate branch and the custom-combination branch, server.js:520-539) is unchanged — it already just reads `opciones` and `esDefault` without caring about their internal shape.

- [ ] **Step 4: Restart and verify with curl (separadas — must be unchanged) and a manual seguidas smoke test**

```bash
systemctl restart pokedex.service
sleep 1
# Regresión: el PDF por defecto (todas las carpetas, modo separadas) debe seguir sirviendo un PDF válido.
curl -s -o /tmp/recortables-test.pdf -w "%{http_code}\n" http://localhost:3000/api/pdf-carpetas
file /tmp/recortables-test.pdf
```

Expected: `200` and `file` reports `PDF document`. (A live seguidas-mode PDF check happens naturally in Task 10's end-to-end wizard walkthrough, once there's an actual seguidas configuration saved to test against — building one here would require a valid saved config first.)

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Generar el PDF de recortables por rango en modo 'seguidas' (sin portadas)"
```

---

### Task 4: Cliente — `cargarCarpetasConfig` y `carpetaDe` para el nuevo formato

**Files:**
- Modify: `public/app.js:31-76` (`carpetas` global, `cargarCarpetasConfig`, `carpetaDe`)

**Interfaces:**
- Produces: new global `modoCarpetasConfig` (`'separadas'|'seguidas'`). Each entry in `carpetas` now has either `{gens, rango}` (separadas) or `{desde, hasta, rango}` (seguidas), always plus `{nombre, color, bg, espacios}`.
- Consumes: `hexToRgba`, `formatearRango` (both unchanged, app.js:37-53).

- [ ] **Step 1: Replace the `carpetas` global and `cargarCarpetasConfig`/`carpetaDe`**

Replace app.js:31-76 (from the comment above `let carpetas = [];` through the end of `carpetaDe`):
```js
// Las carpetas se configuran desde el servidor (Ajustes → Configurar
// carpetas — wizard), para que todos los dispositivos vean la misma
// agrupación. Acá solo completamos `bg` y `rango`, que el servidor no
// guarda (solo nombre/color/gens, o nombre/color/desde/hasta).
let carpetas = [];
let modoCarpetasConfig = 'separadas'; // 'separadas' | 'seguidas'

function formatearRango(gens) {
    const ordenados = [...gens].sort((a, b) => a - b);
    const bloques = [];
    let inicio = ordenados[0], anterior = ordenados[0];
    for (let i = 1; i <= ordenados.length; i++) {
        const actual = ordenados[i];
        if (actual === anterior + 1) { anterior = actual; continue; }
        bloques.push(inicio === anterior ? `${inicio}` : `${inicio}-${anterior}`);
        inicio = anterior = actual;
    }
    return `Gens ${bloques.join(', ')}`;
}

function hexToRgba(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

async function cargarCarpetasConfig() {
    try {
        const res = await fetch('/api/carpetas-config');
        if (!res.ok) throw new Error('respuesta no válida');
        const datos = await res.json();
        modoCarpetasConfig = datos.modo;
        carpetas = datos.carpetas.map(c => modoCarpetasConfig === 'seguidas'
            ? { nombre: c.nombre, color: c.color, bg: hexToRgba(c.color, 0.16), desde: c.desde, hasta: c.hasta, rango: `#${c.desde}–${c.hasta}`, espacios: c.espacios }
            : { nombre: c.nombre, color: c.color, bg: hexToRgba(c.color, 0.16), gens: c.gens, rango: formatearRango(c.gens), espacios: c.espacios }
        );
    } catch (err) {
        console.error('No se pudo cargar la configuración de carpetas:', err.message);
    }
}

// Devuelve la carpeta a la que pertenece un Pokémon, según generación
// (modo separadas) o según su nº de Pokédex nacional (modo seguidas).
function carpetaDe(p) {
    if (modoCarpetasConfig === 'seguidas') {
        return carpetas.find(c => p.id >= c.desde && p.id <= c.hasta) || null;
    }
    return carpetas.find(c => c.gens.includes(p.gen)) || null;
}
```

- [ ] **Step 2: Syntax-check**

```bash
node --check public/app.js && echo "sintaxis OK"
```

- [ ] **Step 3: Manual verification via browser console**

This can't be fully verified until Task 2's server change is live and a page is loaded (the function runs client-side). Once `systemctl restart pokedex.service` has picked up the Task 1-2 server changes, open the app in a browser, open devtools console, and run:

```js
await cargarCarpetasConfig();
console.log(modoCarpetasConfig, carpetas);
```

Expected: `modoCarpetasConfig` is `"separadas"` (nothing has switched modes yet) and `carpetas` is an array of 4 objects each with `gens`/`rango` populated — same as before this change, confirming no regression.

- [ ] **Step 4: Commit**

```bash
git add public/app.js
git commit -m "Cliente: cargar y usar el modo de carpetas (separadas/seguidas)"
```

---

### Task 5: Cliente — progreso compartido para ambos modos

**Files:**
- Modify: `public/app.js:387-424` (`renderSidebar` — the `carpetas.forEach` block)
- Modify: `public/app.js:427-447` (`renderBinderBar`)
- Modify: `public/app.js:527-555` (`actualizarTarjetaProgreso`)

**Interfaces:**
- Consumes: `dataGlobalCache` (already populated by `cargarEstadisticas`/`cargarEstadisticasSinMoverScroll`, includes `.listaIds` — a map of owned ids — and `.generaciones[g]` — per-generation `{total, conseguidos}`), `modoCarpetasConfig`/`carpetas` from Task 4.
- Produces: `progresoCarpeta(c, d)` → `{conseguidos, total}`, usable by any code that needs a carpeta's progress regardless of mode.

- [ ] **Step 1: Add the shared `progresoCarpeta` helper**

Add this function right before `function renderSidebar()` in app.js (find the line just above it — search for `function renderSidebar`):

```js
// Progreso de una carpeta, sin importar el modo: en "separadas" se suma por
// generación (ya lo tenemos agregado en dataGlobalCache.generaciones); en
// "seguidas" se cuenta directo sobre el rango de ids, usando el mapa de
// poseídos que ya viaja en dataGlobalCache.listaIds — sin pedir nada nuevo
// al servidor.
function progresoCarpeta(c, d = dataGlobalCache) {
    if (c.gens) {
        const conseguidos = c.gens.reduce((a, g) => a + (d.generaciones[g]?.conseguidos || 0), 0);
        const total       = c.gens.reduce((a, g) => a + (d.generaciones[g]?.total || 0), 0);
        return { conseguidos, total };
    }
    let conseguidos = 0;
    for (let id = c.desde; id <= c.hasta; id++) {
        if (d.listaIds && d.listaIds[id]) conseguidos++;
    }
    return { conseguidos, total: c.hasta - c.desde + 1 };
}
```

- [ ] **Step 2: Use it in `renderSidebar`**

Replace app.js:387-423 (the `carpetas.forEach` block in `renderSidebar`, i.e. from `carpetas.forEach(c => {` through its closing `});`):
```js
    carpetas.forEach(c => {
        const cCons  = c.gens.reduce((a,g) => a + (d.generaciones[g]?.conseguidos || 0), 0);
        const cTotal = c.gens.reduce((a,g) => a + (d.generaciones[g]?.total || 0), 0);
        const cPct   = cTotal > 0 ? Math.round((cCons / cTotal) * 100) : 0;

        const div = document.createElement('div');
        div.className = 'sb-carpeta';
        const isActiveCarpeta = genActualAbierta?.esCarpeta && genActualAbierta?.carpeta?.nombre === c.nombre;

        div.innerHTML = `
            <div class="sb-carpeta-header${isActiveCarpeta ? ' active' : ''}">
                <div class="sb-carpeta-left">
                    <div class="sb-carpeta-dot" style="background:${c.color}"></div>
                    <span class="sb-carpeta-name">${c.nombre}</span>
                    <span class="sb-carpeta-range">${c.rango}</span>
                </div>
                <span class="sb-carpeta-count" style="color:${c.color}">${cCons}/${cTotal}</span>
            </div>
            <div class="sb-carpeta-bar">
                <div class="sb-carpeta-bar-fill" style="width:${cPct}%;background:${c.color}"></div>
            </div>`;
        div.querySelector('.sb-carpeta-header').onclick = () => verCarpeta(c);

        const gensDiv = document.createElement('div');
        gensDiv.className = 'sb-gens';
        c.gens.forEach(g => {
            const gd       = d.generaciones[g];
            const isActive = !genActualAbierta?.esCarpeta && !genActualAbierta?.esCompleta && genActualAbierta?.gen === g;
            const item     = document.createElement('div');
            item.className = `sb-gen-item${isActive ? ' active' : ''}`;
            item.onclick   = () => verListadoGeneracion(g, regiones[g-1]);
            item.innerHTML = `<span class="sb-gen-name">${regiones[g-1]}</span><span class="sb-gen-count" style="color:${c.color}">${gd.conseguidos}/${gd.total}</span>`;
            gensDiv.appendChild(item);
        });
        div.appendChild(gensDiv);
        wrap.appendChild(div);
    });
```
with:
```js
    carpetas.forEach(c => {
        const { conseguidos: cCons, total: cTotal } = progresoCarpeta(c, d);
        const cPct = cTotal > 0 ? Math.round((cCons / cTotal) * 100) : 0;

        const div = document.createElement('div');
        div.className = 'sb-carpeta';
        const isActiveCarpeta = genActualAbierta?.esCarpeta && genActualAbierta?.carpeta?.nombre === c.nombre;

        div.innerHTML = `
            <div class="sb-carpeta-header${isActiveCarpeta ? ' active' : ''}">
                <div class="sb-carpeta-left">
                    <div class="sb-carpeta-dot" style="background:${c.color}"></div>
                    <span class="sb-carpeta-name">${c.nombre}</span>
                    <span class="sb-carpeta-range">${c.rango}</span>
                </div>
                <span class="sb-carpeta-count" style="color:${c.color}">${cCons}/${cTotal}</span>
            </div>
            <div class="sb-carpeta-bar">
                <div class="sb-carpeta-bar-fill" style="width:${cPct}%;background:${c.color}"></div>
            </div>`;
        div.querySelector('.sb-carpeta-header').onclick = () => verCarpeta(c);

        // La sublista de generaciones solo tiene sentido en modo "separadas"
        // (cada carpeta ES un conjunto de generaciones); en "seguidas" una
        // carpeta puede cortar una generación al medio, así que no se listan.
        if (c.gens) {
            const gensDiv = document.createElement('div');
            gensDiv.className = 'sb-gens';
            c.gens.forEach(g => {
                const gd       = d.generaciones[g];
                const isActive = !genActualAbierta?.esCarpeta && !genActualAbierta?.esCompleta && genActualAbierta?.gen === g;
                const item     = document.createElement('div');
                item.className = `sb-gen-item${isActive ? ' active' : ''}`;
                item.onclick   = () => verListadoGeneracion(g, regiones[g-1]);
                item.innerHTML = `<span class="sb-gen-name">${regiones[g-1]}</span><span class="sb-gen-count" style="color:${c.color}">${gd.conseguidos}/${gd.total}</span>`;
                gensDiv.appendChild(item);
            });
            div.appendChild(gensDiv);
        }
        wrap.appendChild(div);
    });
```

- [ ] **Step 3: Use it in `renderBinderBar`**

Replace app.js:432-433 (inside `renderBinderBar`'s `carpetas.forEach`):
```js
    carpetas.forEach(c => {
        const t = c.gens.reduce((a,g) => a + (dataGlobalCache.generaciones[g]?.total || 0), 0);
```
with:
```js
    carpetas.forEach(c => {
        const { total: t } = progresoCarpeta(c);
```

- [ ] **Step 4: Use it in `actualizarTarjetaProgreso`**

Replace app.js:536-539:
```js
    } else if (genActualAbierta?.esCarpeta) {
        const c = genActualAbierta.carpeta;
        conseguidos = c.gens.reduce((a,g) => a + dataGlobalCache.generaciones[g].conseguidos, 0);
        total       = c.gens.reduce((a,g) => a + dataGlobalCache.generaciones[g].total, 0);
```
with:
```js
    } else if (genActualAbierta?.esCarpeta) {
        ({ conseguidos, total } = progresoCarpeta(genActualAbierta.carpeta));
```

- [ ] **Step 5: Syntax-check**

```bash
node --check public/app.js && echo "sintaxis OK"
```

- [ ] **Step 6: Manual regression check (separadas mode, unchanged behavior)**

In the browser, open the sidebar (desktop view) or the "Carpetas" section (mobile), and confirm each carpeta still shows the same counts/percentages as before this change (no seguidas config exists yet, so this is purely a refactor-safety check — the numbers must be identical to pre-change).

- [ ] **Step 7: Commit**

```bash
git add public/app.js
git commit -m "Cliente: unificar el cálculo de progreso de carpeta para ambos modos"
```

---

### Task 6: Cliente — abrir la galería de una carpeta "seguidas"

**Files:**
- Modify: `public/app.js:307-316` (add `fetchRangoSegura`, next to `fetchGenSegura`)
- Modify: `public/app.js:558-581` (`verCarpeta`)

**Interfaces:**
- Consumes: `/api/buscar?desde=&hasta=` from Task 2.
- Produces: `fetchRangoSegura(desde, hasta)` → `Promise<Pokemon[]|null>`, same error-handling shape as `fetchGenSegura`.

- [ ] **Step 1: Add `fetchRangoSegura`**

Right after `fetchGenSegura` (app.js:307-316), add:
```js
async function fetchRangoSegura(desde, hasta) {
    try {
        const res = await fetch(`/api/buscar?desde=${desde}&hasta=${hasta}`);
        if (!res.ok) throw new Error('respuesta no válida');
        return await res.json();
    } catch (err) {
        mostrarToastError(`No se pudo cargar el rango #${desde}-${hasta}. Reintenta.`);
        return null;
    }
}
```

- [ ] **Step 2: Branch `verCarpeta` on `carpeta.gens` vs `carpeta.desde`**

Replace app.js:558-581 (`async function verCarpeta(carpeta) { ... }`):
```js
async function verCarpeta(carpeta) {
    genActualAbierta = { gen: carpeta.gens[0], region: `Carpeta ${carpeta.nombre}`, esCarpeta: true, carpeta };
    actualizarTarjetaProgreso();
    renderSidebar();
    if (!esDesktop()) {
        document.getElementById('generaciones-section-title').style.display = 'none';
        document.getElementById('grid-generaciones').style.display = 'none';
        document.getElementById('gallery-section').style.display = 'block';
        mostrarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    mostrarGalleryShell(`Carpeta ${carpeta.nombre}`);
    const todos = [];
    for (const g of carpeta.gens) {
        if (!cachePokemon[g]) {
            const datos = await fetchGenSegura(g);
            if (!datos) continue;
            cachePokemon[g] = datos;
        }
        todos.push(...cachePokemon[g]);
    }
    pkmsActuales = todos;
    renderGaleria(todos, false);
}
```
with:
```js
async function verCarpeta(carpeta) {
    genActualAbierta = { gen: carpeta.gens ? carpeta.gens[0] : null, region: `Carpeta ${carpeta.nombre}`, esCarpeta: true, carpeta };
    actualizarTarjetaProgreso();
    renderSidebar();
    if (!esDesktop()) {
        document.getElementById('generaciones-section-title').style.display = 'none';
        document.getElementById('grid-generaciones').style.display = 'none';
        document.getElementById('gallery-section').style.display = 'block';
        mostrarFAB();
        document.getElementById('scroll-root').scrollTo({ top:0, behavior:'smooth' });
    }
    mostrarGalleryShell(`Carpeta ${carpeta.nombre}`);
    let todos;
    if (carpeta.gens) {
        todos = [];
        for (const g of carpeta.gens) {
            if (!cachePokemon[g]) {
                const datos = await fetchGenSegura(g);
                if (!datos) continue;
                cachePokemon[g] = datos;
            }
            todos.push(...cachePokemon[g]);
        }
    } else {
        todos = await fetchRangoSegura(carpeta.desde, carpeta.hasta) || [];
    }
    pkmsActuales = todos;
    renderGaleria(todos, false);
}
```

- [ ] **Step 3: Syntax-check and regression check**

```bash
node --check public/app.js && echo "sintaxis OK"
```
In the browser, click into any of the 4 existing (separadas) carpetas from the sidebar/binder bar and confirm the gallery still opens and shows the right Pokémon — this path (`carpeta.gens` truthy) is unchanged, just moved inside an `if`.

- [ ] **Step 4: Commit**

```bash
git add public/app.js
git commit -m "Cliente: abrir la galería de una carpeta 'seguidas' por rango de ids"
```

---

### Task 7: Cliente — ocultar "portada por región" del PDF en modo seguidas

**Files:**
- Modify: `public/index.html` (PDF options modal — the `pdf-check-portadas` section, around line 286-291)
- Modify: `public/app.js:860-884` (`descargarRecortablesPDF`)
- Modify: `public/app.js:1464-1476` (`abrirOpcionesPDF`)

**Interfaces:**
- Consumes: `modoCarpetasConfig` from Task 4.

- [ ] **Step 1: Give the portadas checkbox section an id**

In `public/index.html`, find:
```html
        <div class="pdf-opciones-seccion">
            <label class="pdf-opciones-check">
                <input type="checkbox" id="pdf-check-portadas" checked>
                Portada por región con los 3 iniciales
            </label>
        </div>
```
and change the opening tag to:
```html
        <div class="pdf-opciones-seccion" id="pdf-opciones-portadas-seccion">
```
(rest of the block unchanged).

- [ ] **Step 2: Hide it when opening the modal in seguidas mode**

In `public/app.js`, replace the `abrirOpcionesPDF` function (app.js:1464-1476):
```js
function abrirOpcionesPDF() {
    // Se re-arma siempre (no se cachea) para reflejar cambios recientes del
    // wizard de carpetas sin depender de un reload de página.
    document.getElementById('pdf-opciones-carpetas').innerHTML = carpetas.map(c => `
        <label class="pdf-opciones-check">
            <input type="checkbox" class="pdf-carpeta-check" value="${c.nombre}" checked>
            <span class="pdf-carpeta-swatch" style="background:${c.color}"></span>
            ${c.nombre} (${c.rango})
        </label>
    `).join('');
    cerrarAjustes();
    document.getElementById('pdf-opciones-modal').classList.add('open');
}
```
with:
```js
function abrirOpcionesPDF() {
    // Se re-arma siempre (no se cachea) para reflejar cambios recientes del
    // wizard de carpetas sin depender de un reload de página.
    document.getElementById('pdf-opciones-carpetas').innerHTML = carpetas.map(c => `
        <label class="pdf-opciones-check">
            <input type="checkbox" class="pdf-carpeta-check" value="${c.nombre}" checked>
            <span class="pdf-carpeta-swatch" style="background:${c.color}"></span>
            ${c.nombre} (${c.rango})
        </label>
    `).join('');
    // La portada por región no aplica en modo "seguidas": una carpeta puede
    // cortar una región al medio, así que no hay "la región" de esa carpeta.
    document.getElementById('pdf-opciones-portadas-seccion').style.display =
        modoCarpetasConfig === 'seguidas' ? 'none' : '';
    cerrarAjustes();
    document.getElementById('pdf-opciones-modal').classList.add('open');
}
```

- [ ] **Step 3: Force `incluirPortadas` to `false` in seguidas mode regardless of the (hidden) checkbox**

In `descargarRecortablesPDF` (app.js:860-884), replace:
```js
    const incluirPortadas = document.getElementById('pdf-check-portadas').checked;
```
with:
```js
    const incluirPortadas = modoCarpetasConfig === 'seguidas' ? false : document.getElementById('pdf-check-portadas').checked;
```

- [ ] **Step 4: Syntax-check and regression check**

```bash
node --check public/app.js && echo "sintaxis OK"
```
In the browser (still in separadas mode, since seguidas isn't saved until Task 10), open Ajustes → "Recortables para carpetas (PDF)" and confirm the "Portada por región" checkbox is still visible and checked by default — unchanged behavior for the current mode.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/app.js
git commit -m "Cliente: ocultar 'portada por región' del PDF cuando el modo es 'seguidas'"
```

---

### Task 8: Wizard — habilitar el paso "modo" y ocultar "espacios en blanco"

**Files:**
- Modify: `public/index.html:318-328` (paso "modo" — los dos botones)
- Modify: `public/index.html:338-342` (paso "formato" — checkbox "espacios en blanco")
- Modify: `public/app.js:1490-1517` (variables del wizard, `wizardModoSeguidas`)

**Interfaces:**
- Produces: new global `wizardModo` (`'separadas'|'seguidas'`), new function `wizardElegirModo(modo)`.

- [ ] **Step 1: Update the "modo" step buttons in `index.html`**

Replace index.html:318-328:
```html
        <!-- Paso 1: modo de acomodo -->
        <div class="wizard-paso" id="wizard-paso-modo">
            <div class="pdf-opciones-label">¿Cómo querés acomodar tu colección?</div>
            <button type="button" class="wizard-opcion-modo" onclick="wizardModoSeguidas()">
                <strong>Todas seguidas</strong>
                <span>Próximamente — por ahora elegí "Separadas por generación"</span>
            </button>
            <button type="button" class="wizard-opcion-modo" onclick="wizardMostrarPaso('formato')">
                <strong>Separadas por generación</strong>
                <span>Cada carpeta tiene generaciones completas, nunca partidas</span>
            </button>
        </div>
```
with:
```html
        <!-- Paso 1: modo de acomodo -->
        <div class="wizard-paso" id="wizard-paso-modo">
            <div class="pdf-opciones-label">¿Cómo querés acomodar tu colección?</div>
            <button type="button" class="wizard-opcion-modo" onclick="wizardElegirModo('seguidas')">
                <strong>Todas seguidas</strong>
                <span>Reparte la colección en orden de Pokédex nacional, sin respetar cortes de generación</span>
            </button>
            <button type="button" class="wizard-opcion-modo" onclick="wizardElegirModo('separadas')">
                <strong>Separadas por generación</strong>
                <span>Cada carpeta tiene generaciones completas, nunca partidas</span>
            </button>
        </div>
```

- [ ] **Step 2: Wrap the "espacios en blanco" checkbox so it can be hidden**

Replace index.html:338-342:
```html
            <div class="wizard-nota">💡 Una hoja tiene 2 páginas (frente y dorso) — cuando más adelante pidamos "hojas", ya vamos a contar las dos caras solas.</div>
            <label class="pdf-opciones-check">
                <input type="checkbox" id="wizard-espacios-blanco">
                Dejar espacios en blanco para que cada generación empiece en una página nueva
            </label>
```
with:
```html
            <div class="wizard-nota">💡 Una hoja tiene 2 páginas (frente y dorso) — cuando más adelante pidamos "hojas", ya vamos a contar las dos caras solas.</div>
            <div id="wizard-espacios-blanco-fila">
                <label class="pdf-opciones-check">
                    <input type="checkbox" id="wizard-espacios-blanco">
                    Dejar espacios en blanco para que cada generación empiece en una página nueva
                </label>
            </div>
```

- [ ] **Step 3: Add `wizardModo` state and `wizardElegirModo`, remove the placeholder**

In `public/app.js`, replace the wizard state block (app.js:1490-1496):
```js
const PALETA_CARPETAS = ['#3b5bdb','#7c3aed','#db2777','#dc2626','#059669','#d97706','#0891b2','#65a30d','#9333ea'];
let wizardBolsillos     = 9;
let wizardEspaciosBlanco = false;
let wizardNumCarpetas    = 4;
let wizardCapacidadesFijas = []; // espacios (hojas × bolsillos) por carpeta, largo wizardNumCarpetas
let wizardAsignacion    = {};    // { gen(1-9): numeroDeCarpeta(1..wizardNumCarpetas) }
let wizardGrupos        = [];    // array de arrays de gens, derivado de wizardAsignacion al pasar a nombres
```
with:
```js
const PALETA_CARPETAS = ['#3b5bdb','#7c3aed','#db2777','#dc2626','#059669','#d97706','#0891b2','#65a30d','#9333ea'];
let wizardModo          = 'separadas'; // 'separadas' | 'seguidas'
let wizardBolsillos     = 9;
let wizardEspaciosBlanco = false;
let wizardNumCarpetas    = 4;
let wizardCapacidadesFijas = []; // espacios (hojas × bolsillos) por carpeta, largo wizardNumCarpetas
let wizardAsignacion    = {};    // { gen(1-9): numeroDeCarpeta(1..wizardNumCarpetas) } — solo modo separadas
let wizardGrupos        = [];    // array de arrays de gens — solo modo separadas
let wizardRangos        = [];    // array de {desde,hasta}|null por carpeta — solo modo seguidas
```

Then replace `wizardModoSeguidas` (app.js:1515-1517):
```js
function wizardModoSeguidas() {
    mostrarToastInfo('"Todas seguidas" todavía no está disponible — por ahora elegí "Separadas por generación".');
}
```
with:
```js
function wizardElegirModo(modo) {
    wizardModo = modo;
    document.getElementById('wizard-espacios-blanco-fila').style.display = modo === 'seguidas' ? 'none' : '';
    wizardMostrarPaso('formato');
}
```

- [ ] **Step 4: Syntax-check**

```bash
node --check public/app.js && echo "sintaxis OK"
```

- [ ] **Step 5: Manual check**

In the browser, open Ajustes → "Configurar carpetas". Click **"Todas seguidas"** — it should now advance to the "formato" step (no more toast), and the "dejar espacios en blanco..." checkbox should be hidden. Click "← Atrás" then **"Separadas por generación"** — should advance to "formato" with the checkbox visible again.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/app.js
git commit -m "Wizard: habilitar la navegación de 'todas seguidas' y ocultar el checkbox que no aplica"
```

---

### Task 9: Wizard — capacidad y cálculo automático de rangos (sin paso de ajuste)

**Files:**
- Modify: `public/app.js:1535-1541` (`wizardConfirmarCantidad`)
- Modify: `public/app.js:1548-1591` (`wizardArmarPasoCapacidad`, `wizardActualizarTotalCapacidad`)
- Modify: `public/app.js:1593-1600` (`wizardCapacidadSiguiente`)

**Interfaces:**
- Consumes: `wizardModo` from Task 8.
- Produces: `wizardNecesarioTotal()` → `number`. `wizardCalcularRangos()` → `Array<{desde,hasta}|null>`, stored in `wizardRangos`.

- [ ] **Step 1: Force `wizardEspaciosBlanco` to `false` in seguidas mode**

Replace `wizardConfirmarCantidad` (app.js:1535-1541):
```js
function wizardConfirmarCantidad() {
    wizardNumCarpetas = Math.max(1, Math.min(9, parseInt(document.getElementById('wizard-cantidad-carpetas').value) || 1));
    wizardBolsillos = parseInt(document.getElementById('wizard-bolsillos-hoja').value) || 9;
    wizardEspaciosBlanco = document.getElementById('wizard-espacios-blanco').checked;
    wizardArmarPasoCapacidad();
    wizardMostrarPaso('capacidad');
}
```
with:
```js
function wizardConfirmarCantidad() {
    wizardNumCarpetas = Math.max(1, Math.min(9, parseInt(document.getElementById('wizard-cantidad-carpetas').value) || 1));
    wizardBolsillos = parseInt(document.getElementById('wizard-bolsillos-hoja').value) || 9;
    wizardEspaciosBlanco = wizardModo === 'seguidas' ? false : document.getElementById('wizard-espacios-blanco').checked;
    wizardArmarPasoCapacidad();
    wizardMostrarPaso('capacidad');
}
```

- [ ] **Step 2: Add `wizardNecesarioTotal` and use it in both capacity functions**

Add this function right before `wizardArmarPasoCapacidad` (app.js:1548):
```js
// Cuánto necesita cubrir la capacidad total: 1025 (toda la colección) en
// modo seguidas, o la suma de "huellas" de las 9 generaciones en separadas.
function wizardNecesarioTotal() {
    if (wizardModo === 'seguidas') return 1025;
    return Array.from({ length: 9 }, (_, i) => wizardHuellaGen(i + 1)).reduce((a, b) => a + b, 0);
}
```

Then replace both occurrences of this line (one in `wizardArmarPasoCapacidad`, app.js:1549; one in `wizardActualizarTotalCapacidad`, app.js:1580):
```js
    const necesarioTotal = Array.from({ length: 9 }, (_, i) => wizardHuellaGen(i + 1)).reduce((a, b) => a + b, 0);
```
with:
```js
    const necesarioTotal = wizardNecesarioTotal();
```
(there are exactly two occurrences — one per function; replace each in place, don't use a global find/replace that could touch unrelated code).

Also, in `wizardActualizarTotalCapacidad` (app.js:1586-1590), the message text mentions "las 9 generaciones" which doesn't fit seguidas mode. Replace:
```js
    if (capacidadTotal < necesarioTotal) {
        div.innerHTML = `<div class="wizard-preview-fila error">⚠️ Entre todas suman ${capacidadTotal} espacios, y hacen falta ${necesarioTotal} para las 9 generaciones.</div>`;
    } else {
        div.innerHTML = `<div class="wizard-preview-fila ok">✓ Entre todas suman ${capacidadTotal} espacios (necesitás al menos ${necesarioTotal}).</div>`;
    }
```
with:
```js
    if (capacidadTotal < necesarioTotal) {
        div.innerHTML = `<div class="wizard-preview-fila error">⚠️ Entre todas suman ${capacidadTotal} espacios, y hacen falta ${necesarioTotal} para cubrir toda la colección.</div>`;
    } else {
        div.innerHTML = `<div class="wizard-preview-fila ok">✓ Entre todas suman ${capacidadTotal} espacios (necesitás al menos ${necesarioTotal}).</div>`;
    }
```

- [ ] **Step 3: Branch `wizardCapacidadSiguiente` and add `wizardCalcularRangos`**

Replace `wizardCapacidadSiguiente` (app.js:1593-1600):
```js
function wizardCapacidadSiguiente() {
    wizardCapacidadesFijas = [...document.querySelectorAll('.wizard-capacidad-fija-input')]
        .sort((a, b) => parseInt(a.dataset.carpeta) - parseInt(b.dataset.carpeta))
        .map(wizardCapacidadDeInput);
    wizardAsignacion = wizardRecomendarAsignacion();
    wizardArmarPasoAjuste();
    wizardMostrarPaso('ajuste');
}
```
with:
```js
function wizardCapacidadSiguiente() {
    wizardCapacidadesFijas = [...document.querySelectorAll('.wizard-capacidad-fija-input')]
        .sort((a, b) => parseInt(a.dataset.carpeta) - parseInt(b.dataset.carpeta))
        .map(wizardCapacidadDeInput);

    if (wizardModo === 'seguidas') {
        // Sin paso de ajuste manual (confirmado: el reparto automático alcanza)
        // — pero si la capacidad no llega a 1025, no hay "ajuste" que lo salve
        // más adelante como en modo separadas, así que se bloquea acá.
        const total = wizardCapacidadesFijas.reduce((a, b) => a + b, 0);
        if (total < 1025) {
            mostrarToastError(`Entre todas suman ${total} espacios, y hacen falta 1025 para cubrir toda la colección.`);
            return;
        }
        wizardRangos = wizardCalcularRangos();
        wizardArmarPasoNombres();
        wizardMostrarPaso('nombres');
        return;
    }

    wizardAsignacion = wizardRecomendarAsignacion();
    wizardArmarPasoAjuste();
    wizardMostrarPaso('ajuste');
}

// Reparte 1..1025 en rangos contiguos según la capacidad fija de cada
// carpeta, en orden. La última carpeta siempre termina en 1025 (si le sobra
// o falta capacidad declarada, ese desajuste se absorbe ahí). Si una carpeta
// anterior ya consumió todo el rango (capacidades muy dispares), las
// carpetas siguientes quedan en null — se descartan al guardar, igual que
// las carpetas sin generaciones asignadas en modo separadas.
function wizardCalcularRangos() {
    const rangos = [];
    let desde = 1;
    for (let i = 0; i < wizardNumCarpetas; i++) {
        if (desde > 1025) { rangos.push(null); continue; }
        const esUltima = i === wizardNumCarpetas - 1;
        const hasta = esUltima ? 1025 : Math.min(1025, desde + wizardCapacidadesFijas[i] - 1);
        rangos.push({ desde, hasta });
        desde = hasta + 1;
    }
    return rangos;
}
```

- [ ] **Step 4: Syntax-check**

```bash
node --check public/app.js && echo "sintaxis OK"
```

- [ ] **Step 5: Manual check with a scratch computation**

Since `wizardCalcularRangos` reads globals (`wizardNumCarpetas`, `wizardCapacidadesFijas`) rather than taking params, verify the pure logic in isolation first:

```bash
node -e "
let wizardNumCarpetas = 4;
let wizardCapacidadesFijas = [260, 260, 260, 260]; // suma 1040 >= 1025
function wizardCalcularRangos() {
    const rangos = [];
    let desde = 1;
    for (let i = 0; i < wizardNumCarpetas; i++) {
        if (desde > 1025) { rangos.push(null); continue; }
        const esUltima = i === wizardNumCarpetas - 1;
        const hasta = esUltima ? 1025 : Math.min(1025, desde + wizardCapacidadesFijas[i] - 1);
        rangos.push({ desde, hasta });
        desde = hasta + 1;
    }
    return rangos;
}
console.log(wizardCalcularRangos());
"
```

Expected: `[ { desde: 1, hasta: 260 }, { desde: 261, hasta: 520 }, { desde: 521, hasta: 780 }, { desde: 781, hasta: 1025 } ]` — three carpetas exactly filled per their capacity, the last one absorbing the leftover (1025 instead of 1040, since 1040 would overshoot).

Then in the browser: open the wizard, pick "Todas seguidas" → any bolsillos/hojas settings → 4 carpetas → on the capacity step, try a total below 1025 first (confirm the red warning and that clicking "Siguiente" shows a toast and does NOT advance), then raise it above 1025 and confirm it advances straight to the "nombres" step (skipping "ajuste" entirely).

- [ ] **Step 6: Commit**

```bash
git add public/app.js
git commit -m "Wizard: calcular rangos automáticos para 'seguidas' y saltar el paso de ajuste"
```

---

### Task 10: Wizard — paso "nombres", guardar, y botón "Atrás"

**Files:**
- Modify: `public/app.js:1681-1697` (`wizardArmarPasoNombres`)
- Modify: `public/app.js:1705-1749` (`wizardGuardar`)
- Modify: `public/index.html:383-391` (paso "nombres" — botón "← Atrás")

**Interfaces:**
- Consumes: `wizardRangos` from Task 9, `wizardModo` from Task 8.
- Produces: `POST /api/carpetas-config` body `{modo: wizardModo, carpetas: [...]}` (matches Task 2's server contract). `wizardVolverDesdeNombres()`.

- [ ] **Step 1: Branch `wizardArmarPasoNombres`**

Replace app.js:1681-1697:
```js
function wizardArmarPasoNombres() {
    document.getElementById('wizard-nombres-lista').innerHTML = wizardGrupos.map((gens, i) => {
        // Si el grupo coincide exactamente con una carpeta existente, reusamos su nombre/color.
        const existente = carpetas.find(c => c.gens.length === gens.length && c.gens.every(g => gens.includes(g)));
        const nombreDefault = existente ? existente.nombre : `Carpeta ${i + 1}`;
        const colorDefault  = existente ? existente.color : wizardColorDeGrupo(i + 1);
        const swatches = PALETA_CARPETAS.map(col =>
            `<button type="button" class="wizard-swatch${col === colorDefault ? ' selected' : ''}" style="background:${col}" data-color="${col}" onclick="wizardElegirColor(this)"></button>`
        ).join('');
        const sub = gens.length ? `${formatearRango(gens)} · ${wizardCapacidadesFijas[i]} espacios` : `Sin generaciones asignadas · ${wizardCapacidadesFijas[i]} espacios`;
        return `<div class="wizard-nombre-fila" data-gens="${gens.join(',')}">
            <input type="text" class="wizard-nombre-input" value="${nombreDefault}" maxlength="24" placeholder="Nombre de la carpeta">
            <div class="wizard-swatches" data-color-actual="${colorDefault}">${swatches}</div>
            <div class="wizard-nombre-sub">${sub}</div>
        </div>`;
    }).join('');
}
```
with:
```js
function wizardArmarPasoNombres() {
    if (wizardModo === 'seguidas') {
        document.getElementById('wizard-nombres-lista').innerHTML = wizardRangos.map((r, i) => {
            const colorDefault = wizardColorDeGrupo(i + 1);
            const swatches = PALETA_CARPETAS.map(col =>
                `<button type="button" class="wizard-swatch${col === colorDefault ? ' selected' : ''}" style="background:${col}" data-color="${col}" onclick="wizardElegirColor(this)"></button>`
            ).join('');
            const sub = r ? `#${r.desde}–${r.hasta} · ${wizardCapacidadesFijas[i]} espacios` : `Sin Pokémon asignados · ${wizardCapacidadesFijas[i]} espacios`;
            return `<div class="wizard-nombre-fila" data-desde="${r ? r.desde : ''}" data-hasta="${r ? r.hasta : ''}">
                <input type="text" class="wizard-nombre-input" value="Carpeta ${i + 1}" maxlength="24" placeholder="Nombre de la carpeta">
                <div class="wizard-swatches" data-color-actual="${colorDefault}">${swatches}</div>
                <div class="wizard-nombre-sub">${sub}</div>
            </div>`;
        }).join('');
        return;
    }
    document.getElementById('wizard-nombres-lista').innerHTML = wizardGrupos.map((gens, i) => {
        // Si el grupo coincide exactamente con una carpeta existente, reusamos su nombre/color.
        const existente = carpetas.find(c => c.gens && c.gens.length === gens.length && c.gens.every(g => gens.includes(g)));
        const nombreDefault = existente ? existente.nombre : `Carpeta ${i + 1}`;
        const colorDefault  = existente ? existente.color : wizardColorDeGrupo(i + 1);
        const swatches = PALETA_CARPETAS.map(col =>
            `<button type="button" class="wizard-swatch${col === colorDefault ? ' selected' : ''}" style="background:${col}" data-color="${col}" onclick="wizardElegirColor(this)"></button>`
        ).join('');
        const sub = gens.length ? `${formatearRango(gens)} · ${wizardCapacidadesFijas[i]} espacios` : `Sin generaciones asignadas · ${wizardCapacidadesFijas[i]} espacios`;
        return `<div class="wizard-nombre-fila" data-gens="${gens.join(',')}">
            <input type="text" class="wizard-nombre-input" value="${nombreDefault}" maxlength="24" placeholder="Nombre de la carpeta">
            <div class="wizard-swatches" data-color-actual="${colorDefault}">${swatches}</div>
            <div class="wizard-nombre-sub">${sub}</div>
        </div>`;
    }).join('');
}
```
(Note: added a `c.gens &&` guard in the `existente` lookup so it doesn't crash if a leftover seguidas-mode carpeta object without `.gens` is ever in `carpetas` at this point.)

- [ ] **Step 2: Branch `wizardGuardar`**

Replace app.js:1705-1749 (the whole `wizardGuardar` function):
```js
async function wizardGuardar() {
    const filas = [...document.querySelectorAll('.wizard-nombre-fila')];
    // Las carpetas sin generaciones asignadas no se guardan (no hay nada que las identifique).
    const nueva = filas
        .map((fila, i) => ({
            nombre: fila.querySelector('.wizard-nombre-input').value.trim(),
            color: fila.querySelector('.wizard-swatches').dataset.colorActual,
            gens: fila.dataset.gens ? fila.dataset.gens.split(',').map(Number) : [],
            espacios: wizardCapacidadesFijas[i]
        }))
        .filter(c => c.gens.length);

    if (!nueva.length) {
        mostrarToastError('Asigná al menos una generación a alguna carpeta.');
        return;
    }
    if (nueva.some(c => !c.nombre)) {
        mostrarToastError('Todas las carpetas necesitan un nombre.');
        return;
    }

    const btn = document.getElementById('wizard-btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    try {
        const res = await fetch('/api/carpetas-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nueva)
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'respuesta no válida');
        await cargarCarpetasConfig();
        renderSidebar();
        renderBinderBar();
        localStorage.setItem('carpetasWizardVisto', '1');
        cerrarWizardCarpetas();
        mostrarToastInfo('Carpetas actualizadas.');
    } catch (err) {
        mostrarToastError(err.message || 'No se pudo guardar la configuración.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}
```
with:
```js
async function wizardGuardar() {
    const filas = [...document.querySelectorAll('.wizard-nombre-fila')];
    // Las carpetas sin nada asignado no se guardan (no hay nada que las identifique).
    const nueva = wizardModo === 'seguidas'
        ? filas
            .map((fila, i) => ({
                nombre: fila.querySelector('.wizard-nombre-input').value.trim(),
                color: fila.querySelector('.wizard-swatches').dataset.colorActual,
                desde: fila.dataset.desde ? Number(fila.dataset.desde) : null,
                hasta: fila.dataset.hasta ? Number(fila.dataset.hasta) : null,
                espacios: wizardCapacidadesFijas[i]
            }))
            .filter(c => c.desde !== null)
        : filas
            .map((fila, i) => ({
                nombre: fila.querySelector('.wizard-nombre-input').value.trim(),
                color: fila.querySelector('.wizard-swatches').dataset.colorActual,
                gens: fila.dataset.gens ? fila.dataset.gens.split(',').map(Number) : [],
                espacios: wizardCapacidadesFijas[i]
            }))
            .filter(c => c.gens.length);

    if (!nueva.length) {
        mostrarToastError(wizardModo === 'seguidas' ? 'Asigná al menos un rango a alguna carpeta.' : 'Asigná al menos una generación a alguna carpeta.');
        return;
    }
    if (nueva.some(c => !c.nombre)) {
        mostrarToastError('Todas las carpetas necesitan un nombre.');
        return;
    }

    const btn = document.getElementById('wizard-btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    try {
        const res = await fetch('/api/carpetas-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modo: wizardModo, carpetas: nueva })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'respuesta no válida');
        await cargarCarpetasConfig();
        renderSidebar();
        renderBinderBar();
        localStorage.setItem('carpetasWizardVisto', '1');
        cerrarWizardCarpetas();
        mostrarToastInfo('Carpetas actualizadas.');
    } catch (err) {
        mostrarToastError(err.message || 'No se pudo guardar la configuración.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar';
    }
}
```

- [ ] **Step 3: Fix the "← Atrás" button on the "nombres" step**

In `public/index.html`, find (inside `wizard-paso-nombres`):
```html
                <button type="button" class="wizard-btn-volver" onclick="wizardMostrarPaso('ajuste')">← Atrás</button>
```
replace with:
```html
                <button type="button" class="wizard-btn-volver" onclick="wizardVolverDesdeNombres()">← Atrás</button>
```

In `public/app.js`, add this function right before `wizardArmarPasoNombres`:
```js
function wizardVolverDesdeNombres() {
    wizardMostrarPaso(wizardModo === 'seguidas' ? 'capacidad' : 'ajuste');
}
```

- [ ] **Step 4: Syntax-check**

```bash
node --check public/app.js && echo "sintaxis OK"
```

- [ ] **Step 5: Bump `CACHE_VERSION` (required — this task's commit touches `index.html` and `app.js`)**

In `public/sw.js`, bump the version (check the current value first):
```bash
grep "CACHE_VERSION = " public/sw.js
```
Then increment the number by one in the same way as the other tasks in this plan that touched the shell (e.g. `'pokedex-tcg-v19'` → `'pokedex-tcg-v20'`).

- [ ] **Step 6: Full end-to-end manual walkthrough**

```bash
systemctl restart pokedex.service
```

In the browser (logged in — this needs a session, since `POST /api/carpetas-config` requires `requiereLogin`):
1. Ajustes → Configurar carpetas → **Todas seguidas**.
2. Bolsillos por página: 9 (default). Siguiente.
3. Cantidad de carpetas: 4. Siguiente.
4. Capacidad: leave the suggested values (should already sum to ≥1025 based on the suggestion logic). Siguiente — should jump straight to "Nombre y color de cada carpeta" (no "ajuste" screen in between).
5. Confirm each row shows `#desde–hasta · N espacios` and lets you edit name/color. Guardar.
6. Confirm the toast "Carpetas actualizadas." appears and the modal closes.
7. Check the sidebar (desktop) or binder bar (mobile): carpetas now show contiguous `#` ranges instead of "Gens X-Y", with no expandable per-generation sublist.
8. Click into one of the carpetas — gallery should open showing exactly that id range.
9. Ajustes → "Recortables para carpetas (PDF)" — confirm "Portada por región" is gone, generate the PDF, confirm it downloads and (if you can open a PDF) shows a continuous grid with no region cover pages.
10. As a regression check, run the wizard again choosing **"Separadas por generación"** all the way through and confirm it still works exactly as before (this is the mode most users will keep using).

Also verify the raw file on disk reflects the new shape:
```bash
cat carpetas.json
```
Expected: `{"modo":"seguidas","carpetas":[{"nombre":"...","color":"...","desde":1,"hasta":...,"espacios":...}, ...]}`.

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/app.js public/sw.js
git commit -m "Wizard: guardar la configuración de 'todas seguidas' y arreglar el botón Atrás"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), `/api/buscar` + `/api/carpetas-config` (Task 2), PDF recortables (Task 3), `carpetaDe`/progress (Tasks 4-5), gallery-open (Task 6), PDF options UI (Task 7), all 6 wizard steps (Tasks 8-10) — every section of the design doc has a corresponding task.
- **Out-of-scope items honored:** no manual range-adjustment UI was added (Task 9 is fully automatic per the user's confirmed answer); no attempt to compute portadas for split regions in seguidas mode (Task 3/7 just disable it).
- **Type/name consistency checked:** `modoCarpetasConfig` (active saved config, Task 4) vs `wizardModo` (in-progress wizard selection, Task 8) are deliberately two different globals — the wizard doesn't mutate the live config until `wizardGuardar` succeeds and `cargarCarpetasConfig()` re-reads it. `progresoCarpeta` (Task 5), `fetchRangoSegura` (Task 6), `wizardCalcularRangos`/`wizardNecesarioTotal`/`wizardVolverDesdeNombres` (Tasks 9-10) are each defined once and used with matching names everywhere they're called.
