# Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar que el usuario elija/marque cada categoría de variantes (regional, mega, primigenia, gigamax, alternativa) por separado desde Ajustes, y que esa elección se refleje correctamente en el progreso, la galería/ficha, y la capacidad del wizard de carpetas — sin tocar el PDF de recortables (Fase 3 aparte).

**Architecture:** Un archivo nuevo `variantes-config.json` (mismo patrón que `carpetas.json`) guarda qué categorías están activas. El servidor arma una vista derivada `pokemonEfectivo()` — los 1025 base + solo las variantes de categorías activas, intercaladas justo después de su especie base — y los endpoints de lectura (`/api/buscar`, `/api/estadisticas`) y el cálculo de capacidad (`pokemonPorGens`) pasan a operar sobre esa vista en vez del `pokemonDB` crudo. El cliente gana un panel de checkboxes en Ajustes, corrige los sitios donde hoy calcula el "número regional" a partir del `id` propio (rompería para una variante, cuyo `id` es ≥1026), y agrega un aviso si activar una categoría deja la capacidad de carpetas configurada por debajo de lo necesario.

**Tech Stack:** Node/Express (sin dependencias nuevas), mismo patrón de archivos JSON + escritura atómica que ya usa `carpetas.json`. Sin framework/bundler en el cliente (edición directa de `app.js`/`index.html`/`styles.css`).

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-27-variantes-fase2-tracking-design.md` — cada tarea cita la sección que implementa.
- Las 5 categorías arrancan **todas en `false`** — cero cambio de comportamiento para quien no toca Ajustes.
- Marcar/desmarcar una categoría **nunca borra ni modifica `inventario.json`** — una variante marcada sigue marcada aunque se oculte temporalmente.
- `/api/exportar` **no cambia** — sigue exportando el inventario crudo completo, sin filtrar por categorías activas.
- No hay suite de tests (`npm test` es un placeholder). Cada tarea se verifica con scripts puntuales (`node -e`, `curl`) contra el servidor real, igual que hicieron los planes anteriores de este proyecto (`docs/superpowers/plans/2026-07-26-variantes-pokedex.md`).
- **Gotcha del proyecto:** cualquier tarea que toque `public/index.html`, `public/app.js` o `public/styles.css` DEBE bumpear `CACHE_VERSION` en `public/sw.js` en el mismo commit (hoy está en `'pokedex-tcg-v25'`) — si no, los navegadores siguen sirviendo el shell viejo cacheado indefinidamente.
- Este plan asume que `pokemon_db.json` ya tiene las 179 variantes (Fase 1, ya commiteada).
- **La implementación corre en un worktree aislado** (`.worktrees/variantes-fase2-tracking/`), separado del checkout principal donde vive `pokedex.service` (producción, `WorkingDirectory=/var/www/html/pokedex-tcg`). **Ninguna tarea de este plan corre `systemctl restart/stop pokedex.service`** — reiniciar ese servicio no reflejaría los cambios del worktree (systemd sirve el código del checkout principal) y además reiniciaría la app real del usuario sin necesidad. Para probar cambios de `server.js` contra un servidor real, cada tarea arranca una instancia temporal del propio worktree en el puerto `3099` (ver el patrón en cada Step de verificación), nunca toca el puerto `3000` de producción, y la mata al terminar.

---

## Task 1: `variantes-config.json` + vista derivada `pokemonEfectivo()` en el servidor

**Spec:** secciones "Modelo de datos" (`variantes-config.json`, `pokemonEfectivo()`) y "Cambios en endpoints existentes" (`pokemonPorGens`).

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `pokemonDB` (ya cargado, línea 28).
- Produces: `variantesConfig` (objeto en memoria), `variantesConfigValida(candidato)`, `guardarVariantesConfig()`, `pokemonEfectivo()`, `anclaId(p)` — todas usadas por la Tarea 2 y por `pokemonPorGens` (ya existente, se modifica acá).

**Nota importante que motiva esta tarea:** `pokemonPorGens(gens)` hoy (código ya commiteado, sin pushear) es `pokemonDB.filter(p => gens.includes(p.gen)).length` — cuenta **todas** las 179 variantes sin condición alguna, porque tienen el mismo `gen` que su especie base. Esto ya es un bug latente: en cuanto se pushee, `carpetasConfigValida` (modo `separadas`) empezaría a exigir más espacios de los que el usuario pidió, sin que exista todavía ninguna forma de optar por menos. Esta tarea lo corrige de vuelta a "solo cuenta lo que el usuario activó" (1025 por defecto).

- [ ] **Step 1: Insertar la sección de configuración de variantes**

En `server.js`, insertar el bloque siguiente **entre** el cierre de la sección `── INVENTARIO ──` (línea 96, `function modoValido(modo) {...}`) y el comentario `── CONFIGURACIÓN DE CARPETAS (wizard) ──` (línea 98) — el orden importa: `pokemonPorGens`, definida un poco más abajo en esa segunda sección, necesita que `pokemonEfectivo()` ya exista.

```js
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
if (fs.existsSync('variantes-config.json')) {
    try {
        const raw = JSON.parse(fs.readFileSync('variantes-config.json', 'utf8'));
        if (variantesConfigValida(raw)) variantesConfig = raw;
        else console.warn('⚠️  variantes-config.json inválido, usando todas las categorías desactivadas.');
    } catch (err) {
        console.error('⚠️  variantes-config.json corrupto, usando todas las categorías desactivadas:', err.message);
    }
}
function guardarVariantesConfig() {
    escribirJSONAtomico('variantes-config.json', variantesConfig);
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
```

- [ ] **Step 2: Hacer que `pokemonPorGens` use la vista efectiva**

Antes (línea ~102):
```js
function pokemonPorGens(gens) {
    return pokemonDB.filter(p => gens.includes(p.gen)).length;
}
```

Después:
```js
function pokemonPorGens(gens) {
    return pokemonEfectivo().filter(p => gens.includes(p.gen)).length;
}
```

- [ ] **Step 3: Verificar la lógica de validación y la vista derivada sin arrancar el servidor**

```bash
node -e "
const fs = require('fs');
const pokemonDB = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
const CATEGORIAS_VARIANTES = ['regional','mega','primigenia','gigamax','alternativa'];
function variantesConfigValida(c) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
    const claves = Object.keys(c);
    if (claves.length !== CATEGORIAS_VARIANTES.length) return false;
    return CATEGORIAS_VARIANTES.every(cat => typeof c[cat] === 'boolean');
}
console.assert(variantesConfigValida({regional:false,mega:false,primigenia:false,gigamax:false,alternativa:false}) === true, 'objeto válido debería pasar');
console.assert(variantesConfigValida({regional:false}) === false, 'faltan claves debería fallar');
console.assert(variantesConfigValida({regional:'no',mega:false,primigenia:false,gigamax:false,alternativa:false}) === false, 'valor no booleano debería fallar');
console.assert(variantesConfigValida(null) === false, 'null debería fallar');
console.assert(variantesConfigValida([]) === false, 'array debería fallar');
console.log('OK: variantesConfigValida se comporta como se espera');

const variantesPorBase = new Map();
for (const p of pokemonDB) {
    if (p.id <= 1025) continue;
    if (!variantesPorBase.has(p.especieBase)) variantesPorBase.set(p.especieBase, []);
    variantesPorBase.get(p.especieBase).push(p);
}
function pokemonEfectivo(variantesConfig) {
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
const todoApagado = pokemonEfectivo({regional:false,mega:false,primigenia:false,gigamax:false,alternativa:false});
console.assert(todoApagado.length === 1025, \`con todo apagado debería haber 1025, hay \${todoApagado.length}\`);
const soloMega = pokemonEfectivo({regional:false,mega:true,primigenia:false,gigamax:false,alternativa:false});
console.assert(soloMega.length === 1025 + 48, \`con mega activo debería haber 1073, hay \${soloMega.length}\`);
const idxCharizard = soloMega.findIndex(p => p.id === 6);
console.assert(soloMega[idxCharizard + 1].name.includes('MEGA'), 'la entrada justo después de Charizard debería ser una de sus Mega');
console.log('OK: pokemonEfectivo() cuenta y ordena como se espera');
"
```

Expected: ambos `console.log` de OK se imprimen, ningún `console.assert` dispara un mensaje de error.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "Agregar variantes-config.json + vista derivada pokemonEfectivo(), corregir pokemonPorGens"
```

---

## Task 2: Endpoints `/api/variantes-config` + integrar `pokemonEfectivo()` en `/api/buscar` y `/api/estadisticas`

**Spec:** secciones "Modelo de datos" (endpoints) y "Cambios en endpoints existentes".

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `pokemonEfectivo()`, `anclaId()`, `variantesConfig`, `variantesConfigValida()`, `guardarVariantesConfig()` (Tarea 1); `requiereLogin`, `rateLimiter`, `broadcast()` (ya existentes).
- Produces: `GET /api/variantes-config`, `POST /api/variantes-config` — consumidos por la Tarea 4 (Ajustes) y la Tarea 5 (aviso de capacidad).

**Nota importante que motiva esta tarea:** `/api/estadisticas` hoy calcula `listaIds`/`conseguidosGlobal` recorriendo **todo** `inventario[modo]` sin mirar si ese id sigue siendo válido bajo la config actual. Si no se corrige, una variante marcada mientras su categoría estaba activa seguiría sumando al progreso global (y al numerador que muestra `brand-count`) después de desactivar esa categoría — pudiendo superar incluso al `totalGlobal` ya filtrado. Esta tarea corrige `listaIds`/`fechas`/`conseguidosGlobal`/`conseguidosGen` para que todos deriven de `pokemonEfectivo()`.

- [ ] **Step 1: Reemplazar `/api/buscar`**

Antes (línea 340):
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

Después:
```js
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
```

- [ ] **Step 2: Reemplazar `/api/estadisticas`**

Antes (línea 352):
```js
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
```

Después:
```js
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
```

- [ ] **Step 3: Agregar los endpoints de config de variantes**

Insertar justo después de `app.get('/api/carpetas-config', ...)` (línea ~399-401):

```js
app.get('/api/variantes-config', (req, res) => {
    res.json(variantesConfig);
});
```

Y junto a `app.post('/api/carpetas-config', ...)` (línea ~670), agregar:

```js
app.post('/api/variantes-config', requiereLogin, rateLimiter, (req, res) => {
    if (!variantesConfigValida(req.body)) {
        return res.status(400).json({ success: false, error: 'Configuración de variantes inválida.' });
    }
    variantesConfig = req.body;
    guardarVariantesConfig();
    broadcast({ tipo: 'config' }); // mismo evento que ya usan /api/importar y /api/carpetas-config
    res.json({ success: true, variantesConfig });
});
```

- [ ] **Step 4: Verificar contra el servidor real**

**Nunca reinicies `pokedex.service`** — es la producción, corre el código del checkout principal, no el de este worktree. Arrancá una instancia temporal del worktree en el puerto 3099:

```bash
sed -i 's/const PORT = 3000;/const PORT = 3099;/' server.js
node server.js & SERVER_PID=$!
sleep 1

# GET nuevo, sin login, debe dar las 5 en false (todavía no se activó nada)
curl -s http://localhost:3099/api/variantes-config

# /api/estadisticas sigue dando 1025 de total con todo apagado
curl -s "http://localhost:3099/api/estadisticas?modo=carpetas" | node -e "
let d=''; process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
    const j = JSON.parse(d);
    console.assert(j.global.total === 1025, \`se esperaba 1025, hay \${j.global.total}\`);
    console.log('OK: /api/estadisticas da 1025 con variantes apagadas');
});
"

# POST sin sesión debe rechazarse (401), no debe poder tocar la config sin login
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3099/api/variantes-config \
  -H "Content-Type: application/json" \
  -d '{"regional":true,"mega":false,"primigenia":false,"gigamax":false,"alternativa":false}'

kill $SERVER_PID
sed -i 's/const PORT = 3099;/const PORT = 3000;/' server.js
git diff server.js  # confirmar que no quedó ningún cambio de PORT sin revertir antes de comitear
```

Expected: el primer `curl` da las 5 categorías en `false`; el script de `/api/estadisticas` imprime el OK; el `curl` de POST imprime `401`; el `git diff` final no muestra ninguna línea de `PORT`.

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Agregar endpoints /api/variantes-config e integrar pokemonEfectivo() en /api/buscar y /api/estadisticas"
```

---

## Task 3: Corregir la numeración de variantes en galería/ficha + badge de categoría

**Spec:** sección "Cliente" → "Galería / ficha".

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: entradas de `pokemonEfectivo()` ya devueltas por `/api/buscar`/`/api/estadisticas` (Tarea 2), que para una variante traen `categoria` y `especieBase` (campos ya presentes en `pokemon_db.json` desde la Fase 1).
- Produces: `anclaIdCliente(p)`, usado por la Tarea 5 si hiciera falta (no lo necesita, pero se deja documentado el nombre para no chocar).

**Nota importante que motiva esta tarea:** `carpetaDe()`, `renderGaleria()` y `mostrarFicha()` calculan hoy el número regional (y, en `carpetaDe`, la pertenencia a una carpeta en modo "seguidas") a partir de `p.id` directo. Para una variante (`id` >= 1026) esto da un resultado sin sentido (un número regional absurdo, y ninguna carpeta asignada en modo "seguidas" aunque su especie base sí tenga una). Hay que usar `p.especieBase` en vez de `p.id` cuando la entrada es una variante.

- [ ] **Step 1: Agregar el helper de ancla y la info de categorías, cerca de `carpetaDe`**

En `public/app.js`, antes de `function carpetaDe(p) {` (línea 73), agregar:

```js
// Ancla de una entrada a un id 1–1025: el suyo propio si es especie base, o
// el de su especie base si es una variante (mismo criterio que anclaId() en
// server.js, pero acá sobre las entradas que ya llegaron filtradas del server).
function anclaIdCliente(p) {
    return p.categoria ? p.especieBase : p.id;
}

const CATEGORIA_INFO = {
    regional:    { label: 'Regional',   color: '#0891b2' },
    mega:        { label: 'Mega',       color: '#7c3aed' },
    primigenia:  { label: 'Primigenia', color: '#dc2626' },
    gigamax:     { label: 'Gigamax',    color: '#db2777' },
    alternativa: { label: 'Alt.',       color: '#d97706' },
};
```

- [ ] **Step 2: Corregir `carpetaDe()` para usar la ancla en modo "seguidas"**

Antes (línea 73-78):
```js
function carpetaDe(p) {
    if (modoCarpetasConfig === 'seguidas') {
        return carpetas.find(c => p.id >= c.desde && p.id <= c.hasta) || null;
    }
    return carpetas.find(c => c.gens.includes(p.gen)) || null;
}
```

Después:
```js
function carpetaDe(p) {
    if (modoCarpetasConfig === 'seguidas') {
        const ancla = anclaIdCliente(p);
        return carpetas.find(c => ancla >= c.desde && ancla <= c.hasta) || null;
    }
    return carpetas.find(c => c.gens.includes(p.gen)) || null;
}
```

- [ ] **Step 3: Corregir `renderGaleria()` para calcular R#/N# desde la ancla, y agregar el badge**

Antes (líneas 1032-1036):
```js
        let numR      = p.id - cortesGen[p.gen];
        if (p.id >= 899 && p.id <= 905) numR = p.id - 809;
        const prefijo = (p.id >= 899 && p.id <= 905) ? 'H' : 'R';
        const ridTxt  = `${prefijo}#${numR.toString().padStart(3,'0')}`;
        const nidTxt  = `N#${p.id.toString().padStart(4,'0')}`;
```

Después:
```js
        const ancla   = anclaIdCliente(p);
        let numR      = ancla - cortesGen[p.gen];
        if (ancla >= 899 && ancla <= 905) numR = ancla - 809;
        const prefijo = (ancla >= 899 && ancla <= 905) ? 'H' : 'R';
        const ridTxt  = `${prefijo}#${numR.toString().padStart(3,'0')}`;
        const nidTxt  = `N#${ancla.toString().padStart(4,'0')}`;
        const catInfo = p.categoria ? CATEGORIA_INFO[p.categoria] : null;
```

Y más abajo (línea 1052), el `nidM` (versión mobile) tiene el mismo bug con un formato ligeramente distinto (`padStart(3,'0')` en vez de 4) — antes:
```js
        nidM.textContent = `N#${p.id.toString().padStart(3,'0')}`;
```
Después:
```js
        nidM.textContent = `N#${ancla.toString().padStart(3,'0')}`;
```

Y agregar el badge al final del bloque, justo antes de `frag.appendChild(card);` (línea 1086) — se agrega un único elemento que se reusa en ambos layouts (mobile y desktop lo posicionan distinto vía CSS, ver Step 5):
```js
        if (catInfo) {
            const badge = document.createElement('div'); badge.className = 'pk-var-badge';
            badge.style.background = catInfo.color;
            badge.textContent = catInfo.label;
            card.appendChild(badge);
        }
```

- [ ] **Step 4: Corregir `mostrarFicha()` para calcular R#/N# desde la ancla, y mostrar la categoría**

Antes (líneas 1180-1188):
```js
    let numR = p.id - cortesGen[p.gen];
    let regionName = regiones[p.gen - 1];
    if (p.id >= 899 && p.id <= 905) { numR = p.id - 809; regionName = 'Hisui'; }
    const regionEl = document.getElementById('pk-region');
    regionEl.textContent = regionName.toUpperCase() + ' · GEN ' + p.gen;
    regionEl.style.color = coloresGen[p.gen-1];
    regionEl.style.background = coloresBg[p.gen-1];
    document.getElementById('pk-name').textContent = p.name.toLowerCase();
    document.getElementById('pk-id').textContent   = `Regional #${numR.toString().padStart(3,'0')} · Nacional #${p.id.toString().padStart(4,'0')}`;
```

Después:
```js
    const ancla = anclaIdCliente(p);
    let numR = ancla - cortesGen[p.gen];
    let regionName = regiones[p.gen - 1];
    if (ancla >= 899 && ancla <= 905) { numR = ancla - 809; regionName = 'Hisui'; }
    const regionEl = document.getElementById('pk-region');
    regionEl.textContent = regionName.toUpperCase() + ' · GEN ' + p.gen;
    regionEl.style.color = coloresGen[p.gen-1];
    regionEl.style.background = coloresBg[p.gen-1];
    document.getElementById('pk-name').textContent = p.name.toLowerCase();
    const catInfo = p.categoria ? CATEGORIA_INFO[p.categoria] : null;
    document.getElementById('pk-id').textContent =
        `Regional #${numR.toString().padStart(3,'0')} · Nacional #${ancla.toString().padStart(4,'0')}${catInfo ? ' · ' + catInfo.label : ''}`;
```

- [ ] **Step 5: Estilos del badge**

En `public/styles.css`, cerca de las reglas de `.pk-rid`/`.pk-nid` (línea 292-293), agregar:

```css
.pk-var-badge{position:absolute;bottom:3px;left:4px;font-family:'Rajdhani',sans-serif;font-size:7px;font-weight:700;letter-spacing:.03em;padding:1px 4px;border-radius:4px;color:#fff;}
```

- [ ] **Step 6: Bump `CACHE_VERSION`**

En `public/sw.js` (línea 11):
```js
const CACHE_VERSION = 'pokedex-tcg-v26';
```

- [ ] **Step 7: Verificar**

Esta tarea es 100% cliente (`public/app.js`/`styles.css`/`sw.js`) — no hay servidor que arrancar para probarla. Primero, chequeo de sintaxis:

```bash
node --check public/app.js && echo "app.js: sintaxis OK"
```

Segundo, verificación puntual de la lógica de `anclaIdCliente()` (la pieza nueva de la que depende todo lo demás en esta tarea) sin necesidad de un navegador — se extrae la función tal cual quedó en el archivo y se prueba contra un objeto base y uno de variante:

```bash
node -e "
const fs = require('fs');
const src = fs.readFileSync('public/app.js', 'utf8');
const m = src.match(/function anclaIdCliente\(p\) \{[\s\S]*?\n\}/);
console.assert(m, 'no se encontró anclaIdCliente() en app.js');
eval(m[0]);
console.assert(anclaIdCliente({ id: 6 }) === 6, 'una entrada base debería anclar a su propio id');
console.assert(anclaIdCliente({ id: 1030, categoria: 'mega', especieBase: 6 }) === 6, 'una variante debería anclar a especieBase, no a su propio id');
console.log('OK: anclaIdCliente() distingue base de variante correctamente');
"
```

Expected: ambos comandos imprimen su OK. La confirmación visual (el badge se ve bien, los colores son correctos, Charizard base se sigue viendo igual que antes en la galería) se hace en una pasada manual en el navegador después de que las 5 tareas del plan estén todas mergeadas — no es parte de esta tarea individual.

- [ ] **Step 8: Commit**

```bash
git add public/app.js public/styles.css public/sw.js
git commit -m "Corregir numeración de variantes en galería/ficha (usar especieBase, no id propio) y agregar badge de categoría"
```

---

## Task 4: Panel "Variantes" en Ajustes

**Spec:** sección "Cliente" → "Ajustes".

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `GET /api/variantes-config`, `POST /api/variantes-config` (Tarea 2); `requiereSesion()`, `mostrarToastError()`, `mostrarToastInfo()`, `cargarEstadisticasSinMoverScroll()` (ya existentes); `CATEGORIAS_VARIANTES`-equivalente en cliente (se define acá, propia del cliente).
- Produces: `abrirPanelVariantes()`, `cerrarPanelVariantes()`, `toggleCategoriaVariante(categoria, activada)` — la Tarea 5 dispara la revisión de capacidad después de llamar a este último.

- [ ] **Step 1: Agregar el ítem "Variantes" en Ajustes y el modal del sub-panel**

En `public/index.html`, agregar un botón nuevo en la sección "Colección" del panel de Ajustes, justo después del de "Lista de faltantes" (después de la línea 246, `</button>` que cierra `descargarListaFaltantes()`):

```html
                <button class="ajustes-item" onclick="abrirPanelVariantes()">
                    <span class="ajustes-item-icon">🧬</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Variantes</span>
                        <span class="ajustes-item-sub">Formas regionales, Mega, Gigamax y más como cartas propias</span>
                    </span>
                    <span class="ajustes-item-chev">›</span>
                </button>
```

Y agregar el modal en sí, junto a los otros modales de Ajustes (después del cierre de `<div class="ajustes-modal" id="pdf-opciones-modal">`, línea ~327, antes de `<div class="ajustes-modal" id="wizard-carpetas-modal">`):

```html
<div class="ajustes-modal" id="variantes-modal">
    <div class="ajustes-box">
        <div class="ajustes-handle"></div>
        <span class="ajustes-close" id="variantes-close">×</span>
        <div class="ajustes-title">🧬 Variantes</div>
        <div class="pdf-opciones-seccion">
            <div class="pdf-opciones-label">Categorías a trackear como cartas propias</div>
            <div id="variantes-checks"></div>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Agregar la lógica del panel en `app.js`**

Cerca de `abrirOpcionesPDF()`/`cerrarOpcionesPDF()` (línea ~1505-1525), agregar:

```js
// ── AJUSTES: panel de categorías de variantes ───────────────────────
const CATEGORIAS_VARIANTES_INFO = [
    { key: 'regional',    label: 'Formas regionales',      sub: 'Alolan, Galarian, Hisuian, Paldean' },
    { key: 'mega',        label: 'Megaevolución',          sub: 'Incluye los casos X/Y (Charizard, Mewtwo)' },
    { key: 'primigenia',  label: 'Regresión Primigenia',   sub: 'Kyogre y Groudon' },
    { key: 'gigamax',     label: 'Gigamax',                sub: 'Espada/Escudo + expansiones' },
    { key: 'alternativa', label: 'Formas alternativas',    sub: 'Con carta TCG propia (Deoxys, Rotom, Arceus, etc.)' },
];
let variantesConfigActual = null;

async function abrirPanelVariantes() {
    try {
        const res = await fetch('/api/variantes-config');
        if (!res.ok) throw new Error('respuesta no válida');
        variantesConfigActual = await res.json();
    } catch (err) {
        mostrarToastError('No se pudo cargar la configuración de variantes.');
        return;
    }
    document.getElementById('variantes-checks').innerHTML = CATEGORIAS_VARIANTES_INFO.map(c => `
        <label class="pdf-opciones-check">
            <input type="checkbox" class="variante-cat-check" data-cat="${c.key}" ${variantesConfigActual[c.key] ? 'checked' : ''} onchange="toggleCategoriaVariante('${c.key}', this.checked)">
            <span>${c.label}<br><span style="font-size:11px;color:var(--muted);font-weight:400;">${c.sub}</span></span>
        </label>
    `).join('');
    cerrarAjustes();
    document.getElementById('variantes-modal').classList.add('open');
}
function cerrarPanelVariantes() {
    document.getElementById('variantes-modal').classList.remove('open');
}
document.getElementById('variantes-close').onclick = cerrarPanelVariantes;

async function toggleCategoriaVariante(categoria, activada) {
    const checkbox = document.querySelector(`.variante-cat-check[data-cat="${categoria}"]`);
    const guardar = async () => {
        const nueva = { ...variantesConfigActual, [categoria]: activada };
        try {
            const res = await fetch('/api/variantes-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nueva)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'respuesta no válida');
            variantesConfigActual = nueva;
            await cargarEstadisticasSinMoverScroll();
            mostrarToastInfo(activada ? 'Categoría activada.' : 'Categoría desactivada.');
        } catch (err) {
            if (checkbox) checkbox.checked = !activada; // revertir el toggle visual si falló
            mostrarToastError(err.message || 'No se pudo guardar la configuración de variantes.');
        }
    };
    const revertirSiCancela = () => { if (checkbox) checkbox.checked = !activada; };
    requiereSesion(guardar) || revertirSiCancela();
}
```

Nota: `requiereSesion(accion)` devuelve `true` y ejecuta `accion()` de inmediato si ya hay sesión; si no, abre el modal de login y devuelve `false` — en ese caso revertimos el checkbox visualmente (el login modal, al completarse, no re-dispara este toggle automáticamente, así que si el usuario inicia sesión desde acá tendrá que tocar el checkbox de nuevo; es el mismo comportamiento que ya tiene el botón de "marcar conseguido" en la ficha).

- [ ] **Step 3: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v27';
```

- [ ] **Step 4: Verificar el flujo autenticado completo contra una instancia temporal**

**Nunca reinicies `pokedex.service`** (producción, checkout principal) — arrancá el worktree en el puerto 3099, igual que en la Tarea 2:

```bash
sed -i 's/const PORT = 3000;/const PORT = 3099;/' server.js
node server.js & SERVER_PID=$!
sleep 1

# Login con la contraseña por defecto (ADMIN_PASSWORD no está seteada en este entorno de prueba)
curl -s -c /tmp/cookies-variantes.txt -X POST http://localhost:3099/api/login \
  -H "Content-Type: application/json" -d '{"password":"pokedex123"}'

# Activar "regional" ya autenticado
curl -s -b /tmp/cookies-variantes.txt -X POST http://localhost:3099/api/variantes-config \
  -H "Content-Type: application/json" \
  -d '{"regional":true,"mega":false,"primigenia":false,"gigamax":false,"alternativa":false}'

# Confirmar que quedó guardado y que la galería de Gen 1 ahora trae la variante
curl -s http://localhost:3099/api/variantes-config
curl -s "http://localhost:3099/api/buscar?gen=1" | node -e "
let d=''; process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
    const lista = JSON.parse(d);
    const idx = lista.findIndex(p => p.id === 26);
    console.assert(idx !== -1, 'no se encontró RAICHU (id 26) en gen 1');
    console.assert(lista[idx+1] && lista[idx+1].name.includes('ALOLA'), 'la entrada siguiente a RAICHU debería ser su forma de Alola');
    console.log('OK: RAICHU ALOLA aparece justo después de RAICHU en /api/buscar?gen=1');
});
"

rm -f /tmp/cookies-variantes.txt
kill $SERVER_PID
sed -i 's/const PORT = 3099;/const PORT = 3000;/' server.js
git diff server.js  # confirmar que no quedó ningún cambio de PORT ni de variantes-config.json sin revertir
rm -f variantes-config.json  # lo creó la corrida de prueba; no es parte del commit (ver Global Constraints: las 5 arrancan en false)
```

Expected: el primer `curl` de login da `{"success":true}`; `GET /api/variantes-config` muestra `"regional":true`; el script de Node imprime el OK; el `git diff` final no muestra cambios de `PORT`.

- [ ] **Step 5: Commit**

```bash
git add public/index.html public/app.js public/sw.js
git commit -m "Agregar panel de categorías de variantes en Ajustes"
```

---

## Task 5: Denominador dinámico en `brand-count` + capacidad del wizard consciente de variantes

**Spec:** secciones "Cliente" → "Wizard de carpetas — aviso de capacidad" y el hallazgo de `brand-count` (número total hardcodeado).

**Files:**
- Modify: `public/app.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `dataGlobalCache.global.total` (ya lo devuelve `/api/estadisticas`, Tarea 2), `carpetas`/`modoCarpetasConfig` (ya existentes), `/api/buscar?desde=&hasta=` (Tarea 2, ya ancla-aware).
- Produces: `mostrarToastAvisoCapacidad(mensaje)`, llamada desde `toggleCategoriaVariante()` (Tarea 4) después de guardar.

**Nota importante que motiva esta tarea:** `document.getElementById('brand-count').textContent` hoy arma el texto como `` `${total} / 1025` `` con un `1025` literal, en dos lugares (`cargarEstadisticas()` línea 503 y `cargarEstadisticasSinMoverScroll()` línea 543) — en cuanto haya alguna categoría activa, el numerador (que sí es dinámico) crecería pero el denominador seguiría diciendo "1025", mostrando algo como "1080 / 1025", que no tiene sentido. También `wizardNecesarioTotal()` en modo "seguidas" retorna el literal `1025` en vez de la colección efectiva actual, así que el wizard no pediría capacidad de sobra para variantes activas al configurar carpetas desde cero.

- [ ] **Step 1: Corregir el denominador de `brand-count` en los dos lugares**

En `cargarEstadisticas()` (línea 502-503), antes:
```js
    const total = Object.keys(data.listaIds || {}).length;
    document.getElementById('brand-count').textContent = `${total} / 1025`;
```
Después:
```js
    const total = Object.keys(data.listaIds || {}).length;
    document.getElementById('brand-count').textContent = `${total} / ${data.global.total || 1025}`;
```

En `cargarEstadisticasSinMoverScroll()` (línea 542-543), el mismo cambio:
```js
    const total = Object.keys(data.listaIds || {}).length;
    document.getElementById('brand-count').textContent = `${total} / ${data.global.total || 1025}`;
```

- [ ] **Step 2: Hacer dinámico `wizardNecesarioTotal()` para modo "seguidas"**

Antes (línea ~1599-1602):
```js
// Cuánto necesita cubrir la capacidad total: 1025 (toda la colección) en
// modo seguidas, o la suma de "huellas" de las 9 generaciones en separadas.
function wizardNecesarioTotal() {
    if (wizardModo === 'seguidas') return 1025;
    return Array.from({ length: 9 }, (_, i) => wizardHuellaGen(i + 1)).reduce((a, b) => a + b, 0);
}
```
Después:
```js
// Cuánto necesita cubrir la capacidad total: toda la colección efectiva
// (1025 + variantes activas) en modo seguidas, o la suma de "huellas" de las
// 9 generaciones en separadas (que ya incluyen variantes activas, porque
// pokemonEnGen() lee de dataGlobalCache, ya filtrado por el servidor).
function wizardNecesarioTotal() {
    if (wizardModo === 'seguidas') return (dataGlobalCache && dataGlobalCache.global.total) || 1025;
    return Array.from({ length: 9 }, (_, i) => wizardHuellaGen(i + 1)).reduce((a, b) => a + b, 0);
}
```

Y en `wizardCapacidadSiguiente()` (línea ~1654-1662), antes:
```js
    if (wizardModo === 'seguidas') {
        // Sin paso de ajuste manual (confirmado: el reparto automático alcanza)
        // — pero si la capacidad no llega a 1025, no hay "ajuste" que lo salve
        // más adelante como en modo separadas, así que se bloquea acá.
        const total = wizardCapacidadesFijas.reduce((a, b) => a + b, 0);
        if (total < 1025) {
            mostrarToastError(`Entre todas suman ${total} espacios, y hacen falta 1025 para cubrir toda la colección.`);
            return;
        }
```
Después:
```js
    if (wizardModo === 'seguidas') {
        // Sin paso de ajuste manual (confirmado: el reparto automático alcanza)
        // — pero si la capacidad no llega a lo necesario, no hay "ajuste" que lo
        // salve más adelante como en modo separadas, así que se bloquea acá.
        const total = wizardCapacidadesFijas.reduce((a, b) => a + b, 0);
        const necesario = wizardNecesarioTotal();
        if (total < necesario) {
            mostrarToastError(`Entre todas suman ${total} espacios, y hacen falta ${necesario} para cubrir toda la colección.`);
            return;
        }
```

- [ ] **Step 3: Agregar el toast de aviso de capacidad + la revisión post-toggle**

Cerca de `mostrarToastDeshacer()` (línea ~301), agregar un toast nuevo con acción (mismo patrón, pero la acción abre el wizard en vez de deshacer):

```js
// Toast con acción: avisa que activar una categoría de variantes dejó la
// capacidad de las carpetas ya configuradas por debajo de lo necesario. No
// bloquea nada — la config vieja sigue funcionando, esto es solo un aviso
// con un atajo directo a re-abrir el wizard y ajustar.
let avisoCapacidadTimer = null;
function mostrarToastAvisoCapacidad(msg) {
    let toast = document.getElementById('aviso-capacidad-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'aviso-capacidad-toast';
        toast.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px 8px 8px 16px;font-size:12px;font-weight:600;color:var(--text);box-shadow:0 4px 16px var(--shadow);z-index:800;max-width:calc(100vw - 32px);opacity:0;transition:opacity .2s ease;display:flex;align-items:center;gap:10px;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${msg}</span>
        <button id="btn-ajustar-capacidad" style="background:var(--accent2);color:#fff;border:none;border-radius:8px;padding:6px 12px;font-weight:700;font-size:11px;cursor:pointer;font-family:'Rajdhani',sans-serif;letter-spacing:.04em;white-space:nowrap;">AJUSTAR</button>`;
    toast.style.opacity = '1';
    clearTimeout(avisoCapacidadTimer);
    avisoCapacidadTimer = setTimeout(() => { toast.style.opacity = '0'; }, 6000);
    document.getElementById('btn-ajustar-capacidad').onclick = () => {
        toast.style.opacity = '0';
        cerrarPanelVariantes();
        abrirWizardCarpetas();
    };
}

// Revisa, después de guardar variantes-config, si la capacidad de carpetas ya
// configurada alcanza para la colección efectiva actual — si no, avisa (no
// bloquea nada: la config vieja sigue funcionando mientras tanto).
async function revisarCapacidadCarpetas() {
    if (!carpetas.length) return; // todavía no se configuraron carpetas
    if (modoCarpetasConfig === 'separadas') {
        for (const c of carpetas) {
            const necesario = c.gens.reduce((acc, gen) => acc + (dataGlobalCache.generaciones[gen]?.total || 0), 0);
            if (necesario > c.espacios) {
                mostrarToastAvisoCapacidad(`"${c.nombre}" necesita ${necesario} espacios y tiene ${c.espacios} — ajustá tus carpetas cuando puedas.`);
                return;
            }
        }
        return;
    }
    for (const c of carpetas) {
        try {
            const res = await fetch(`/api/buscar?desde=${c.desde}&hasta=${c.hasta}`);
            if (!res.ok) continue;
            const lista = await res.json();
            if (lista.length > c.espacios) {
                mostrarToastAvisoCapacidad(`"${c.nombre}" necesita ${lista.length} espacios y tiene ${c.espacios} — ajustá tus carpetas cuando puedas.`);
                return;
            }
        } catch { /* no bloquea el flujo si falla la revisión */ }
    }
}
```

Y en `toggleCategoriaVariante()` (Tarea 4, Step 2), agregar la llamada justo después de `await cargarEstadisticasSinMoverScroll();`:

```js
            await cargarEstadisticasSinMoverScroll();
            if (activada) await revisarCapacidadCarpetas();
            mostrarToastInfo(activada ? 'Categoría activada.' : 'Categoría desactivada.');
```

(Solo se revisa al **activar** una categoría — desactivarla nunca puede dejar una carpeta corta de espacio, así que revisar ahí sería trabajo de más.)

- [ ] **Step 4: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v28';
```

- [ ] **Step 5: Verificar**

Esta tarea es 100% cliente — no hay servidor que arrancar. Chequeo de sintaxis y de que los patrones exactos del brief quedaron aplicados (no un texto parecido, el exacto):

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# El denominador dinámico debe aparecer exactamente 2 veces (cargarEstadisticas y cargarEstadisticasSinMoverScroll)
grep -c '${total} / ${data.global.total || 1025}' public/app.js

# No debe quedar ningún hardcodeo del viejo denominador fijo
grep -c '`${total} / 1025`' public/app.js

# wizardNecesarioTotal ya no debe retornar el literal 1025 para 'seguidas'
grep -c "if (wizardModo === 'seguidas') return 1025;" public/app.js
```

Expected: `app.js: sintaxis OK`; el primer `grep -c` da `2`; el segundo da `0`; el tercero da `0`. La confirmación visual completa (el toast "AJUSTAR" aparece cuando corresponde, tocarlo abre el wizard, `brand-count` se ve bien en el header) se hace en una pasada manual en el navegador después de que las 5 tareas del plan estén todas mergeadas — no es parte de esta tarea individual.

- [ ] **Step 6: Commit**

```bash
git add public/app.js public/sw.js
git commit -m "Corregir denominador de brand-count y avisar si activar variantes deja la capacidad de carpetas corta"
```

---

## Limitación conocida (no cubierta por este plan)

`progresoCarpeta(c, d)` (`public/app.js:388`), que alimenta la barra de progreso por carpeta en el sidebar, calcula el progreso de una carpeta en modo "seguidas" iterando `for (let id = c.desde; id <= c.hasta; id++)` y consultando `d.listaIds[id]` — un recorrido puramente numérico sobre el rango 1–1025 de esa carpeta. Una variante activa (id ≥ 1026, aunque su `especieBase` caiga en ese rango) nunca aparece en ese recorrido, así que **la barra de progreso del sidebar para carpetas en modo "seguidas" no va a contar ni sumar variantes** aunque el header global (`brand-count`), las estadísticas por generación, y la galería/ficha sí lo hagan correctamente (Tareas 2-5). Arreglarlo bien requeriría volver `progresoCarpeta` asíncrona (una llamada a `/api/buscar?desde=&hasta=` por carpeta, igual que hace `revisarCapacidadCarpetas` en la Tarea 5) y tocar sus 3 call sites (`renderSidebar`, y donde sea que se vuelva a invocar) — se deja fuera de este plan a propósito para no inflarlo más; si el usuario lo quiere, es una tarea chica aparte una vez que esto esté andando.

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** modelo de datos + endpoints (Tareas 1-2), corrección de numeración/badge en cliente (Tarea 3), UI de Ajustes (Tarea 4), y el aviso de capacidad + fix de `brand-count` (Tarea 5) cubren cada sección de la spec. El PDF de recortables queda explícitamente fuera (Fase 3), tal como se acordó.
- **Bug ya existente detectado y corregido dentro de este plan, no solo "nuevo comportamiento":** `pokemonPorGens()` (Tarea 1) y `conseguidosGlobal`/`listaIds` de `/api/estadisticas` (Tarea 2) ya cuentan las 179 variantes sin condición alguna en el código commiteado hoy — este plan los corrige de vuelta al comportamiento pre-Fase-1 por defecto, no los deja como estaban.
- **Consistencia de nombres:** `anclaId()` (servidor) y `anclaIdCliente()` (cliente) resuelven el mismo concepto en sus respectivos lados; `CATEGORIAS_VARIANTES` (servidor) y `CATEGORIAS_VARIANTES_INFO` (cliente, con label/sub) no chocan porque viven en archivos distintos y se usan para cosas distintas (validación vs. UI).
- **Gotcha de `CACHE_VERSION` cubierto en cada tarea que toca el shell:** Tareas 3, 4 y 5 bumpean la versión (`v26`, `v27`, `v28`) en el mismo commit que su cambio de `app.js`/`index.html`/`styles.css` — nunca queda un commit de shell sin su bump.
- **No bloqueante, tal como se decidió:** el aviso de capacidad (Tarea 5) nunca impide guardar ni activar nada — solo informa con un atajo directo al wizard.
- **Verificado contra código real antes de escribir el plan:** todos los fragmentos "antes" citados en cada Step fueron leídos directamente de `server.js`/`app.js`/`styles.css`/`index.html`/`sw.js` en este mismo repo, no son hipotéticos.

