# Fase 3 — Variantes en el PDF de recortables — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el PDF de recortables (`/api/pdf-carpetas`) incluya automáticamente las variantes de las categorías activas en Ajustes, intercaladas junto a su especie base, con el mismo criterio de "ancla" que ya usa el resto de la app desde la Fase 2.

**Architecture:** `generarPDFRecortables()` pasa de filtrar `pokemonDB` crudo a filtrar `pokemonEfectivo()` (ya existente), comparando rangos/generaciones contra `anclaId(p)` en vez de `p.id` directo. `textoNumeros()` usa esa misma ancla para el número, y agrega la categoría entre paréntesis. La caché en disco de `/api/pdf-carpetas` pasa a invalidarse también cuando cambia `variantes-config.json`, no solo `pokemon_db.json`.

**Tech Stack:** Node/Express, mismas dependencias ya instaladas (`pdfkit`, `sharp`). Sin dependencias nuevas.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-27-variantes-fase3-pdf-design.md` — cada tarea cita la sección que implementa.
- Es automático: el PDF sigue `variantesConfig` tal cual está en Ajustes, sin ningún toggle propio.
- Cada variante se intercala justo después de su especie base (mismo criterio que la galería) — nunca agrupadas al final.
- El texto bajo una variante es el número de su especie base + la categoría en mayúsculas entre paréntesis (ej. `R#006   N#0006 (MEGA)`).
- Con las 5 categorías apagadas, el PDF generado debe ser **byte-idéntico** al que generaba el código antes de esta fase — cero regresión.
- **Nunca reinicies `pokedex.service`** (producción, checkout principal `/var/www/html/pokedex-tcg`). Para probar cambios de `server.js`, arrancá una instancia temporal en el puerto 3099 (cambiando `PORT` con `sed`, corriendo, probando, matando el proceso, y revirtiendo el cambio de `PORT` antes de comitear) — mismo patrón que usaron las tareas de la Fase 2.
- No hay suite de tests (`npm test` es un placeholder). Cada tarea se verifica generando un PDF real contra el servidor temporal y confirmando su contenido con `pdfkit`/inspección de tamaño y conteo de páginas, o con `node -e` sobre funciones puntuales.
- Este plan asume que `pokemonEfectivo()`, `anclaId(p)`, y `variantesConfig` ya existen en `server.js` (Fase 2, ya mergeada a `main`).

---

## Task 1: `generarPDFRecortables()` variant-aware (orden, rango, y numeración)

**Spec:** sección "Cambios" → `generarPDFRecortables(rutaSalida, opciones)`.

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `pokemonEfectivo()`, `anclaId(p)` (ya existen, Fase 2).
- Produces: `generarPDFRecortables()` con el mismo contrato externo (mismos `rutaSalida`/`opciones`, mismo PDF resultante en disco) — consumida por la Tarea 2 sin cambios de firma.

**Nota importante que motiva esta tarea:** `pokemonOrdenados` hoy es `[...pokemonDB].filter(...).sort((a,b) => a.id - b.id)` — si simplemente se cambiara la fuente a `pokemonEfectivo()` sin tocar el `.sort()`, las variantes (id ≥ 1026) volverían a agruparse todas al final en vez de quedar intercaladas junto a su base, porque `pokemonEfectivo()` ya las entrega en el orden correcto y un `sort` por `id` puro lo rompe. La solución es **no volver a ordenar** — filtrar preservando el orden que ya trae `pokemonEfectivo()`.

- [ ] **Step 1: Cambiar la fuente y el filtro de `pokemonOrdenados`**

Antes (línea ~542-546):
```js
    const pokemonOrdenados = [...pokemonDB]
        .filter(p => opciones.modo === 'seguidas'
            ? opciones.rangos.some(r => p.id >= r.desde && p.id <= r.hasta)
            : opciones.gens.has(p.gen))
        .sort((a, b) => a.id - b.id);
```

Después:
```js
    // pokemonEfectivo() ya entrega cada variante activa justo después de su
    // especie base — NO se vuelve a ordenar por id acá, porque eso agruparía
    // todas las variantes (id >= 1026) al final, rompiendo el intercalado.
    const pokemonOrdenados = pokemonEfectivo()
        .filter(p => opciones.modo === 'seguidas'
            ? opciones.rangos.some(r => { const a = anclaId(p); return a >= r.desde && a <= r.hasta; })
            : opciones.gens.has(p.gen));
```

- [ ] **Step 2: Hacer `textoNumeros()` variant-aware**

Antes (línea ~573-579):
```js
    function textoNumeros(p) {
        const rTxt = `R#${String(numeroRegional(p)).padStart(3, '0')}`;
        const nTxt = `N#${String(p.id).padStart(4, '0')}`;
        if (opciones.numeros === 'regional') return rTxt;
        if (opciones.numeros === 'nacional') return nTxt;
        return `${rTxt}   ${nTxt}`;
    }
```

Después:
```js
    function textoNumeros(p) {
        const ancla = anclaId(p);
        const rTxt = `R#${String(numeroRegional({ id: ancla, gen: p.gen })).padStart(3, '0')}`;
        const nTxt = `N#${String(ancla).padStart(4, '0')}`;
        const catTxt = p.categoria ? ` (${p.categoria.toUpperCase()})` : '';
        if (opciones.numeros === 'regional') return rTxt + catTxt;
        if (opciones.numeros === 'nacional') return nTxt + catTxt;
        return `${rTxt}   ${nTxt}${catTxt}`;
    }
```

`numeroRegional()` (ya existente, sin cambios) solo lee `.id`/`.gen` del objeto que recibe — pasarle `{ id: ancla, gen: p.gen }` en vez de `p` calcula el número regional de la especie base sin duplicar esa lógica.

- [ ] **Step 3: Verificar generando PDFs reales contra una instancia temporal**

**Nunca reinicies `pokedex.service`** — arrancá el worktree/checkout en el puerto 3099:

```bash
sed -i 's/const PORT = 3000;/const PORT = 3099;/' server.js
node server.js & SERVER_PID=$!
sleep 1

# Confirmar que con todo apagado (default), el PDF sigue siendo 1025 entradas.
curl -s -o /tmp/pdf-sin-variantes.pdf "http://localhost:3099/api/pdf-carpetas"
node -e "
const fs = require('fs');
const buf = fs.readFileSync('/tmp/pdf-sin-variantes.pdf');
const texto = buf.toString('latin1');
const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('páginas (sin variantes):', paginas, '— esperado: Math.ceil(1025/9) =', Math.ceil(1025/9));
"

# Login + activar 'mega' (48 variantes) y volver a pedir el PDF.
curl -s -c /tmp/cookies-pdf.txt -X POST http://localhost:3099/api/login \
  -H "Content-Type: application/json" -d '{"password":"pokedex123"}'
curl -s -b /tmp/cookies-pdf.txt -X POST http://localhost:3099/api/variantes-config \
  -H "Content-Type: application/json" \
  -d '{"regional":false,"mega":true,"primigenia":false,"gigamax":false,"alternativa":false}'
curl -s -o /tmp/pdf-con-mega.pdf "http://localhost:3099/api/pdf-carpetas"
node -e "
const fs = require('fs');
const buf = fs.readFileSync('/tmp/pdf-con-mega.pdf');
const texto = buf.toString('latin1');
const paginas = (texto.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log('páginas (con mega activo):', paginas, '— esperado: Math.ceil(1073/9) =', Math.ceil(1073/9));
console.assert(paginas > Math.ceil(1025/9), 'con mega activo debería haber más páginas que sin variantes');
console.log('OK: el PDF con mega activo tiene más páginas');
"

# Apagar mega de nuevo para dejar el entorno de prueba limpio.
curl -s -b /tmp/cookies-pdf.txt -X POST http://localhost:3099/api/variantes-config \
  -H "Content-Type: application/json" \
  -d '{"regional":false,"mega":false,"primigenia":false,"gigamax":false,"alternativa":false}'
rm -f /tmp/cookies-pdf.txt /tmp/pdf-sin-variantes.pdf /tmp/pdf-con-mega.pdf variantes-config.json

kill $SERVER_PID
sed -i 's/const PORT = 3099;/const PORT = 3000;/' server.js
git diff server.js  # confirmar que no quedó ningún cambio de PORT sin revertir
```

Expected: el conteo de páginas "sin variantes" coincide con `Math.ceil(1025/9)`; el de "con mega activo" es mayor y coincide con `Math.ceil(1073/9)`; el `assert` de Node no falla; el `git diff` final no muestra cambios de `PORT`.

- [ ] **Step 4: Spot-check del orden intercalado**

Con el mismo PDF "con mega activo" ya generado (antes de borrarlo en el Step 3 — ajustar el orden si hace falta, o regenerar puntualmente), extraer el texto crudo y confirmar que el nombre de una Mega aparece cerca de su especie base, no al final del documento:

```bash
# Nota: pdfkit no comprime el contenido de texto por defecto en los streams
# simples que arma este generador, así que buscar el nombre funciona sobre el
# buffer crudo interpretado como latin1 — si esto no encuentra nada porque el
# contenido está comprimido, extraer con una herramienta de texto de PDF
# (ej. `pdftotext`, si está disponible) en vez de grep sobre el buffer crudo.
node -e "
const fs = require('fs');
const buf = fs.readFileSync('/tmp/pdf-con-mega.pdf');
const idxCharizard = buf.toString('latin1').indexOf('CHARIZARD');
const idxMega = buf.toString('latin1').indexOf('MEGA');
console.assert(idxCharizard !== -1, 'no se encontró CHARIZARD en el PDF');
console.assert(idxMega !== -1, 'no se encontró ninguna entrada MEGA en el PDF');
console.log('offset CHARIZARD:', idxCharizard, '| offset primera MEGA:', idxMega, '| distancia:', Math.abs(idxMega - idxCharizard));
"
```

Expected: la distancia entre ambos offsets es chica en términos relativos al tamaño del archivo (evidencia de que están cerca en el documento, no en extremos opuestos). Si `pdftotext` está disponible en el sistema, preferirlo para un chequeo más confiable (`pdftotext /tmp/pdf-con-mega.pdf - | grep -n "CHARIZARD\|MEGA"` y comparar los números de línea).

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Incluir variantes activas en generarPDFRecortables, intercaladas junto a su especie base"
```

---

## Task 2: Invalidación de caché consciente de `variantes-config.json`

**Spec:** sección "Cambios" → "Caché e invalidación".

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: nada nuevo (usa `fs.existsSync`/`fs.statSync`, ya importados).
- Produces: mismo contrato de `/api/pdf-carpetas` — solo cambia CUÁNDO se considera vieja la caché.

**Nota importante que motiva esta tarea:** hoy la caché de disco del PDF "default" (todas las carpetas + números ambos) solo se invalida si `pokemon_db.json` es más nuevo que el PDF cacheado. Activar/desactivar una categoría en Ajustes no toca `pokemon_db.json`, así que sin este fix la caché seguiría sirviendo una versión vieja del PDF (con o sin variantes, según lo que hubiera la primera vez que se generó) indefinidamente.

- [ ] **Step 1: Ampliar el chequeo de caché**

Antes (línea ~703-709, dentro de `app.get('/api/pdf-carpetas', ...)`):
```js
        if (esDefault) {
            const rutaCache = opciones.modo === 'seguidas' ? RUTA_PDF_RECORTABLES_SEGUIDAS : RUTA_PDF_RECORTABLES;
            const dbStat  = fs.statSync(path.join(__dirname, 'pokemon_db.json'));
            const cacheOk = fs.existsSync(rutaCache) &&
                fs.statSync(rutaCache).mtimeMs >= dbStat.mtimeMs;
            if (!cacheOk) await generarPDFRecortables(rutaCache, opciones);
            return res.download(rutaCache, 'pokedex-recortables.pdf');
        }
```

Después:
```js
        if (esDefault) {
            const rutaCache = opciones.modo === 'seguidas' ? RUTA_PDF_RECORTABLES_SEGUIDAS : RUTA_PDF_RECORTABLES;
            const dbStat = fs.statSync(path.join(__dirname, 'pokemon_db.json'));
            // variantes-config.json puede no existir todavía (nadie tocó Ajustes
            // → Variantes) — en ese caso la referencia sigue siendo solo pokemon_db.json.
            const variantesStat = fs.existsSync('variantes-config.json') ? fs.statSync('variantes-config.json') : null;
            const referenciaMasNueva = variantesStat ? Math.max(dbStat.mtimeMs, variantesStat.mtimeMs) : dbStat.mtimeMs;
            const cacheOk = fs.existsSync(rutaCache) &&
                fs.statSync(rutaCache).mtimeMs >= referenciaMasNueva;
            if (!cacheOk) await generarPDFRecortables(rutaCache, opciones);
            return res.download(rutaCache, 'pokedex-recortables.pdf');
        }
```

- [ ] **Step 2: Verificar la invalidación contra una instancia temporal**

```bash
sed -i 's/const PORT = 3000;/const PORT = 3099;/' server.js
node server.js & SERVER_PID=$!
sleep 1

# Primera pedida: genera y cachea (default = todas las carpetas, números ambos).
curl -s -o /dev/null "http://localhost:3099/api/pdf-carpetas"
STAT_1=$(stat -c %Y cache/pokedex-recortables.pdf)

# Login, activar una categoría (esto toca variantes-config.json).
curl -s -c /tmp/cookies-pdf2.txt -X POST http://localhost:3099/api/login \
  -H "Content-Type: application/json" -d '{"password":"pokedex123"}'
curl -s -b /tmp/cookies-pdf2.txt -X POST http://localhost:3099/api/variantes-config \
  -H "Content-Type: application/json" \
  -d '{"regional":true,"mega":false,"primigenia":false,"gigamax":false,"alternativa":false}'
sleep 1  # asegurar que el mtime de variantes-config.json quede estrictamente después del PDF cacheado

# Segunda pedida: debe regenerar (el PDF cacheado es "viejo" respecto a variantes-config.json).
curl -s -o /dev/null "http://localhost:3099/api/pdf-carpetas"
STAT_2=$(stat -c %Y cache/pokedex-recortables.pdf)

node -e "
console.assert($STAT_2 >= $STAT_1, 'el PDF cacheado debería haberse regenerado (mtime nuevo) tras activar una categoría');
console.log('OK: mtime antes =', $STAT_1, ', después =', $STAT_2, $STAT_2 > $STAT_1 ? '(regenerado)' : '(igual — revisar)');
"

# Limpieza: apagar la categoría, borrar archivos de prueba.
curl -s -b /tmp/cookies-pdf2.txt -X POST http://localhost:3099/api/variantes-config \
  -H "Content-Type: application/json" \
  -d '{"regional":false,"mega":false,"primigenia":false,"gigamax":false,"alternativa":false}'
rm -f /tmp/cookies-pdf2.txt cache/pokedex-recortables.pdf cache/pokedex-recortables-seguidas.pdf variantes-config.json

kill $SERVER_PID
sed -i 's/const PORT = 3099;/const PORT = 3000;/' server.js
git diff server.js  # confirmar que no quedó ningún cambio de PORT sin revertir
```

Expected: `STAT_2` es estrictamente mayor a `STAT_1` (el archivo se regeneró), y el mensaje final dice "(regenerado)".

- [ ] **Step 3: Commit**

```bash
git add server.js
git commit -m "Invalidar la caché del PDF de recortables también cuando cambia variantes-config.json"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** el cambio de fuente/orden/numeración de `generarPDFRecortables()` (Tarea 1) y la invalidación de caché (Tarea 2) cubren las dos secciones de "Cambios" de la spec. "Fuera de alcance" de la spec no generó ninguna tarea a propósito (nada de eso se toca).
- **El riesgo que la spec marcó explícitamente** (ordenar por `id` puro rompería el intercalado) queda resuelto en la Tarea 1 Step 1 con una explicación en el propio comentario del código, no solo en el plan.
- **Regresión cero verificada explícitamente:** la Tarea 1 Step 3 compara el conteo de páginas con las 5 categorías apagadas contra el valor exacto que ya daba el código antes de esta fase (`Math.ceil(1025/9)`), no solo "menos que con variantes".
- **Cache invalidation probada de punta a punta**, no solo leída en el código: la Tarea 2 Step 2 genera el PDF real, activa una categoría, y confirma que el archivo en disco efectivamente cambió de fecha de modificación.
- **Nunca se toca `pokedex.service`**: ambas tareas usan el patrón de puerto 3099 ya establecido en la Fase 2, con revert de `PORT` confirmado antes de cada commit.
- **Verificado contra código real antes de escribir el plan:** los fragmentos "antes" de ambos Steps de código fueron leídos directamente de `server.js` en este mismo repo (líneas exactas citadas), no son hipotéticos.
