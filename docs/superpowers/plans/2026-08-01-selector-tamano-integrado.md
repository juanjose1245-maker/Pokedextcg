# Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el selector de tamaño (Chico/Normal/Grande) deje de leerse como un
grupo de botones suelto: reemplazar el texto por iconos compactos de
densidad de grilla, y en mobile mudarlo a la misma fila que los filtros
Todos/✓ Tenemos/○ Faltan (mismo patrón que ya usa desktop).

**Architecture:** Cambio 100% de presentación (HTML + CSS), sin tocar
`modoVista`/`elegirModoVista()`/`aplicarModoVista()` en `app.js` — esas
funciones ya operan por clases (`.active`, `data-vista`), nunca por
`textContent`, así que el swap de contenido de los botones no las afecta.

**Tech Stack:** Vanilla HTML/CSS, sin dependencias nuevas (los iconos son
`<span>` anidados con `background:currentColor`, no una librería de iconos).

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-08-01-selector-tamano-integrado-design.md`.
- **Gotcha del proyecto:** cualquier tarea que toque `public/index.html` o
  `public/styles.css` DEBE bumpear `CACHE_VERSION` en `public/sw.js` en el
  mismo commit (hoy está en `'pokedex-tcg-v35'`).
- Sin suite de tests — verificación manual en navegador (feature 100% de
  cliente/presentación).
- El comportamiento de `modoVista` (persistencia, columnas del grid,
  contenido de la tarjeta en "Grande") no cambia — fuera de alcance según la
  spec.

---

## Task 1: Reemplazar el texto de los botones por iconos compactos

**Spec:** sección "Iconos de tamaño".

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `data-vista`, `.vista-btn`/`.vista-btn.active`, `elegirModoVista(modo)`
  (ya existentes, sin cambios) — este task solo cambia el contenido HTML
  dentro de cada `<button class="vista-btn">` y el CSS que lo dibuja.
- Produces: clases `.vista-icon`, `.vista-icon-chico`, `.vista-icon-normal`,
  `.vista-icon-grande` — usadas por la Tarea 2 sin modificarlas (la Tarea 2
  solo reubica el `<div class="vista-selector">` de mobile en el DOM, no
  toca su contenido interno).

- [ ] **Step 1: Reemplazar los botones del selector desktop en `index.html`**

Antes (línea 150-154):
```html
                    <div class="vista-selector" id="vista-selector-d">
                        <button class="vista-btn" data-vista="chico" onclick="elegirModoVista('chico')">Chico</button>
                        <button class="vista-btn active" data-vista="normal" onclick="elegirModoVista('normal')">Normal</button>
                        <button class="vista-btn" data-vista="grande" onclick="elegirModoVista('grande')">Grande</button>
                    </div>
```
Después:
```html
                    <div class="vista-selector" id="vista-selector-d">
                        <button class="vista-btn" data-vista="chico" title="Chico" onclick="elegirModoVista('chico')">
                            <span class="vista-icon vista-icon-chico"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>
                        </button>
                        <button class="vista-btn active" data-vista="normal" title="Normal" onclick="elegirModoVista('normal')">
                            <span class="vista-icon vista-icon-normal"><span></span><span></span><span></span><span></span></span>
                        </button>
                        <button class="vista-btn" data-vista="grande" title="Grande" onclick="elegirModoVista('grande')">
                            <span class="vista-icon vista-icon-grande"><span></span></span>
                        </button>
                    </div>
```

- [ ] **Step 2: Reemplazar los botones del selector mobile en `index.html`**

Antes (línea 163-167):
```html
                <div class="vista-selector" id="vista-selector">
                    <button class="vista-btn" data-vista="chico" onclick="elegirModoVista('chico')">Chico</button>
                    <button class="vista-btn active" data-vista="normal" onclick="elegirModoVista('normal')">Normal</button>
                    <button class="vista-btn" data-vista="grande" onclick="elegirModoVista('grande')">Grande</button>
                </div>
```
Después:
```html
                <div class="vista-selector" id="vista-selector">
                    <button class="vista-btn" data-vista="chico" title="Chico" onclick="elegirModoVista('chico')">
                        <span class="vista-icon vista-icon-chico"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>
                    </button>
                    <button class="vista-btn active" data-vista="normal" title="Normal" onclick="elegirModoVista('normal')">
                        <span class="vista-icon vista-icon-normal"><span></span><span></span><span></span><span></span></span>
                    </button>
                    <button class="vista-btn" data-vista="grande" title="Grande" onclick="elegirModoVista('grande')">
                        <span class="vista-icon vista-icon-grande"><span></span></span>
                    </button>
                </div>
```

(Este bloque se mueve de lugar en la Tarea 2 — acá se deja en su posición
actual dentro de `gallery-header-mobile`, solo cambia su contenido.)

- [ ] **Step 3: Reemplazar el CSS de `.vista-btn` (texto) por la versión ícono en `public/styles.css`**

Antes (línea 225-227):
```css
        .vista-selector{display:flex;gap:4px;}
        .vista-btn{padding:6px 10px;border-radius:10px;border:1px solid var(--border);background:var(--surface);font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted);cursor:pointer;transition:all .15s;white-space:nowrap;}
        .vista-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;}
```
Después:
```css
        .vista-selector{display:flex;gap:4px;}
        .vista-btn{width:30px;height:30px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid var(--border);background:var(--surface);color:var(--muted);cursor:pointer;transition:all .15s;}
        .vista-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;}
        .vista-icon{display:grid;gap:1.5px;width:14px;height:14px;}
        .vista-icon-chico{grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);}
        .vista-icon-normal{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(2,1fr);}
        .vista-icon-grande{grid-template-columns:1fr;grid-template-rows:1fr;}
        .vista-icon span{background:currentColor;border-radius:1px;}
```

(El ícono hereda color vía `currentColor` — no declara color propio, así que
sigue las mismas reglas de `.vista-btn`/`.vista-btn.active` que ya existen,
sin tocarlas.)

- [ ] **Step 4: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v36';
```

- [ ] **Step 5: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK (no se tocó, solo confirma que el repo sigue sano)"

# Confirmar que no queda texto viejo en los botones de tamaño
grep -c ">Chico<\|>Normal<\|>Grande<" public/index.html

# Confirmar que los 6 botones (3 desktop + 3 mobile) tienen su ícono y su title
grep -c "vista-icon-chico\|vista-icon-normal\|vista-icon-grande" public/index.html
grep -c 'title="Chico"\|title="Normal"\|title="Grande"' public/index.html
```

Expected: el primer `grep -c` da `0` (sin texto viejo); el segundo da `6`
(2 ocurrencias de cada ícono × 3 tamaños); el tercero da `6` (2 botones ×
3 títulos).

La confirmación visual (los iconos se ven proporcionalmente distintos —
3×3 más "denso" que un cuadrado grande — y el ícono activo se distingue por
color, en mobile y desktop) se hace en una pasada manual en el navegador.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/styles.css public/sw.js
git commit -m "Reemplazar el texto del selector de tamaño (Chico/Normal/Grande) por iconos compactos de densidad de grilla"
```

---

## Task 2: Mover el selector de tamaño mobile a la fila de filtros

**Spec:** sección "Ubicación".

**Files:**
- Modify: `public/index.html`
- Modify: `public/styles.css`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: el `<div class="vista-selector" id="vista-selector">` producido
  por la Tarea 1 (contenido de iconos ya resuelto, esta tarea solo lo mueve
  de posición en el DOM) y `<div class="gallery-filter" id="gallery-filter-mobile">`
  (ya existente, sin cambios internos).
- Produces: nada nuevo para otras tareas — es la última de este plan.

- [ ] **Step 1: Sacar el `vista-selector` de `gallery-header-mobile` y envolver `gallery-filter-mobile` junto a él en `index.html`**

Antes (línea 157-173, ya con los iconos de la Tarea 1 aplicados):
```html
            <!-- Header mobile -->
            <div id="gallery-header-mobile" class="gallery-header">
                <div>
                    <div class="gallery-title" id="gallery-title-text"></div>
                    <div class="gallery-subtitle" id="gallery-subtitle-text"></div>
                </div>
                <div class="vista-selector" id="vista-selector">
                    <button class="vista-btn" data-vista="chico" title="Chico" onclick="elegirModoVista('chico')">
                        <span class="vista-icon vista-icon-chico"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>
                    </button>
                    <button class="vista-btn active" data-vista="normal" title="Normal" onclick="elegirModoVista('normal')">
                        <span class="vista-icon vista-icon-normal"><span></span><span></span><span></span><span></span></span>
                    </button>
                    <button class="vista-btn" data-vista="grande" title="Grande" onclick="elegirModoVista('grande')">
                        <span class="vista-icon vista-icon-grande"><span></span></span>
                    </button>
                </div>
            </div>
            <div class="gallery-filter" id="gallery-filter-mobile">
                <button class="filter-btn active" id="filter-todos" onclick="setFiltro('todos')">Todos</button>
                <button class="filter-btn" id="filter-tenemos" onclick="setFiltro('tenemos')">✓ Tenemos</button>
                <button class="filter-btn" id="filter-faltan" onclick="setFiltro('faltan')">○ Faltan</button>
            </div>
```
Después:
```html
            <!-- Header mobile -->
            <div id="gallery-header-mobile" class="gallery-header">
                <div>
                    <div class="gallery-title" id="gallery-title-text"></div>
                    <div class="gallery-subtitle" id="gallery-subtitle-text"></div>
                </div>
            </div>
            <div class="gallery-controls-mobile">
                <div class="gallery-filter" id="gallery-filter-mobile">
                    <button class="filter-btn active" id="filter-todos" onclick="setFiltro('todos')">Todos</button>
                    <button class="filter-btn" id="filter-tenemos" onclick="setFiltro('tenemos')">✓ Tenemos</button>
                    <button class="filter-btn" id="filter-faltan" onclick="setFiltro('faltan')">○ Faltan</button>
                </div>
                <div class="vista-selector" id="vista-selector">
                    <button class="vista-btn" data-vista="chico" title="Chico" onclick="elegirModoVista('chico')">
                        <span class="vista-icon vista-icon-chico"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></span>
                    </button>
                    <button class="vista-btn active" data-vista="normal" title="Normal" onclick="elegirModoVista('normal')">
                        <span class="vista-icon vista-icon-normal"><span></span><span></span><span></span><span></span></span>
                    </button>
                    <button class="vista-btn" data-vista="grande" title="Grande" onclick="elegirModoVista('grande')">
                        <span class="vista-icon vista-icon-grande"><span></span></span>
                    </button>
                </div>
            </div>
```

(`gallery-header-mobile` queda con un solo hijo — el wrapper de
título/subtítulo — no hace falta tocar su CSS: `justify-content:space-between`
no tiene efecto visible con un solo elemento.)

- [ ] **Step 2: Agregar el CSS de `.gallery-controls-mobile` en `public/styles.css`**

Justo después de la regla `.gallery-header{...}` (línea 228):
```css
        .gallery-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
        .gallery-controls-mobile{display:flex;gap:8px;align-items:center;margin-bottom:12px;}
        .gallery-controls-mobile .gallery-filter{flex:1;min-width:0;margin-bottom:0;}
        .gallery-controls-mobile .vista-selector{flex-shrink:0;}
```

(El `margin-bottom:12px` que antes traía `.gallery-filter` por defecto se
mueve al wrapper — adentro del wrapper, `.gallery-filter` pasa a
`margin-bottom:0` para no duplicar el espacio. Este override es específico
del wrapper mobile [`.gallery-controls-mobile .gallery-filter`], así que no
afecta a `.gallery-filter` en desktop, que ya tiene su propio reset a
`margin-bottom:0` en el breakpoint de escritorio.)

- [ ] **Step 3: Ocultar el wrapper mobile en el breakpoint de escritorio**

En `public/styles.css`, junto a las reglas que ya ocultan los elementos
mobile dentro de `gallery-section` en desktop (línea ~686-688):

Antes:
```css
            #gallery-header-mobile{display:none !important;}
            #gallery-filter-mobile{display:none !important;}
            #gallery-grid-mobile-wrap{display:none !important;}
```
Después:
```css
            #gallery-header-mobile{display:none !important;}
            #gallery-filter-mobile{display:none !important;}
            #gallery-grid-mobile-wrap{display:none !important;}
            .gallery-controls-mobile{display:none !important;}
```

- [ ] **Step 4: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v37';
```

- [ ] **Step 5: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK (no se tocó)"

# Confirmar que vista-selector (mobile) ya no está dentro de gallery-header-mobile
# y que gallery-controls-mobile envuelve a gallery-filter-mobile + vista-selector
grep -n "gallery-controls-mobile\|gallery-header-mobile\|gallery-filter-mobile\|id=\"vista-selector\"" public/index.html

# Confirmar que el wrapper se oculta en desktop
grep -c "gallery-controls-mobile{display:none" public/styles.css
```

Expected: `app.js: sintaxis OK`; en el primer `grep -n`, `id="vista-selector"`
(el mobile, sin `-d`) aparece **dentro** del bloque que abre
`gallery-controls-mobile` y **después** del que abre `gallery-filter-mobile`,
no dentro de `gallery-header-mobile`; el segundo `grep -c` da `1`.

La confirmación visual completa (en mobile, los iconos de tamaño quedan al
final de la fila de filtros, no arriba junto al título; en desktop no cambió
nada respecto a la Tarea 1) se hace en una pasada manual en el navegador.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/styles.css public/sw.js
git commit -m "Mover el selector de tamaño a la fila de filtros en mobile (mismo patrón que ya usa escritorio)"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** "Iconos de tamaño" → Tarea 1; "Ubicación" (mobile)
  → Tarea 2 (desktop ya estaba en la posición correcta según la spec, no
  generó tarea propia). "Fuera de alcance" no generó tareas, a propósito.
- **Sin cambios de JS:** verificado contra el código real — `aplicarModoVista()`
  solo hace `classList.toggle` sobre `.vista-btn`/`.vista-chico`/`.vista-grande`
  y nunca lee ni escribe `textContent` de los botones de tamaño (única
  referencia a `.vista-btn` en `app.js` es el `querySelectorAll('.vista-btn').forEach(...)`
  de `aplicarModoVista()`), así que reemplazar el contenido interno por
  `<span>` de iconos no requiere tocar `app.js`.
- **Consistencia con patrones ya existentes:** el wrapper `.gallery-controls-mobile`
  reproduce el mismo patrón que `desktop-topbar-right` (dos grupos de
  botones en una fila, uno con `flex:1` y otro de tamaño fijo) en vez de
  inventar un layout nuevo; ocultar el wrapper en desktop sigue el mismo
  criterio que ya usan `#gallery-header-mobile`/`#gallery-filter-mobile`
  (mismo bloque de reglas, una línea más).
- **Verificado contra código real antes de escribir el plan:** todos los
  fragmentos "antes" (HTML de `index.html` líneas 150-173, CSS de
  `styles.css` líneas 221-228 y 685-688) fueron leídos directamente de este
  repo en su estado actual (después del merge de
  `docs/superpowers/plans/2026-07-29-tamano-tarjeta-galeria.md` y del fix de
  refresco de escritorio), no de una versión vieja.
