# Login y variantes como primeros pasos del wizard de carpetas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el wizard de carpetas pida login primero (reusando el modal de
login existente) y después pregunte por las categorías de variantes, antes
de seguir con el wizard tal cual existe hoy.

**Architecture:** Cambio de cliente (HTML + JS), sin tocar `server.js` ni
endpoints. Se reutiliza `requiereSesion()` (ya existente) para gatear la
apertura del wizard, y se extrae la generación de checkboxes de variantes
(ya existente en Ajustes) a una función compartida para que el nuevo paso
del wizard no duplique ese markup.

**Tech Stack:** Vanilla HTML/CSS/JS, sin dependencias nuevas.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-08-04-wizard-login-variantes-design.md`.
- **Gotcha del proyecto:** cualquier tarea que toque `public/index.html` o
  `public/app.js` DEBE bumpear `CACHE_VERSION` en `public/sw.js` en el
  mismo commit (hoy está en `'pokedex-tcg-v47'`).
- `wizardGuardar()` no se toca — fuera de alcance, ver spec.
- El modal de login (`login-modal`, `intentarLogin()`) no se toca — se
  reusa tal cual.
- Sin suite de tests — verificación manual en navegador.

---

## Task 1: Extraer `renderVariantesChecks()` como helper compartido

**Spec:** sección "Nuevo paso 'variantes'" (subsección "Reuso, no
duplicación").

**Files:**
- Modify: `public/app.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: nada nuevo — `CATEGORIAS_VARIANTES_INFO`, `variantesConfigActual`
  y `toggleCategoriaVariante` ya existen sin cambios.
- Produces: `async function renderVariantesChecks(elementId)` — hace fetch
  a `/api/variantes-config`, actualiza la variable global
  `variantesConfigActual`, renderiza los 5 checkboxes dentro del elemento
  `elementId`, y devuelve `true` si salió bien o `false` si falló el fetch
  (mostrando un toast de error). La Task 2 la consume pasándole
  `'wizard-variantes-checks'` como `elementId`.

Este task es un refactor puro: `abrirPanelVariantes()` debe comportarse
exactamente igual que antes (mismo fetch, mismo render, mismo toast de
error, mismo modal) — solo cambia de dónde saca el HTML de los checkboxes.

- [ ] **Step 1: Extraer `renderVariantesChecks` y reescribir `abrirPanelVariantes` en `public/app.js`**

Antes (líneas 1678-1695):
```js
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
```
Después:
```js
// Fetchea /api/variantes-config, actualiza variantesConfigActual y renderiza
// los checkboxes de categorías dentro de `elementId`. Usado tanto por el
// panel de Ajustes → Variantes como por el paso "variantes" del wizard de
// carpetas — un solo lugar que arma este markup, para que ambos lean
// siempre la misma configuración real del servidor. Devuelve false (y
// muestra el toast de error) si el fetch falla, para que el caller pueda
// abortar sin abrir su modal/paso con contenido vacío.
async function renderVariantesChecks(elementId) {
    try {
        const res = await fetch('/api/variantes-config');
        if (!res.ok) throw new Error('respuesta no válida');
        variantesConfigActual = await res.json();
    } catch (err) {
        mostrarToastError('No se pudo cargar la configuración de variantes.');
        return false;
    }
    document.getElementById(elementId).innerHTML = CATEGORIAS_VARIANTES_INFO.map(c => `
        <label class="pdf-opciones-check">
            <input type="checkbox" class="variante-cat-check" data-cat="${c.key}" ${variantesConfigActual[c.key] ? 'checked' : ''} onchange="toggleCategoriaVariante('${c.key}', this.checked)">
            <span>${c.label}<br><span style="font-size:11px;color:var(--muted);font-weight:400;">${c.sub}</span></span>
        </label>
    `).join('');
    return true;
}

async function abrirPanelVariantes() {
    if (!(await renderVariantesChecks('variantes-checks'))) return;
    cerrarAjustes();
    document.getElementById('variantes-modal').classList.add('open');
}
```

- [ ] **Step 2: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v48';
```

- [ ] **Step 3: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# Confirmar que la función vieja ya no existe suelta y la nueva sí
grep -c "^async function renderVariantesChecks" public/app.js
grep -c "async function abrirPanelVariantes" public/app.js
```

Expected: `app.js: sintaxis OK`; ambos `grep -c` dan `1`.

Verificación manual en navegador: abrir Ajustes → Variantes debe verse y
comportarse exactamente igual que antes de este cambio (mismos 5
checkboxes, mismo estado inicial marcado/desmarcado según lo que ya tenías
activado, togglear una categoría la guarda igual que siempre).

- [ ] **Step 4: Commit**

```bash
git add public/app.js public/sw.js
git commit -m "Extraer renderVariantesChecks como helper compartido (sin cambio de comportamiento en Ajustes)"
```

---

## Task 2: Nuevo paso "variantes" + gate de login al abrir el wizard

**Spec:** secciones "Login como gate de apertura, no como paso nuevo" y
"Nuevo paso 'variantes'".

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `renderVariantesChecks(elementId)` de la Task 1 (ya mergeada);
  `requiereSesion(accion)` (ya existente, sin cambios,
  `app.js` línea ~205).
- Produces: nada nuevo para otras tareas — es la última de este plan.

- [ ] **Step 1: Agregar el paso "variantes" en `public/index.html`, antes del paso "modo"**

Antes (líneas 406-409):
```html
        <div class="ajustes-scroll">

        <!-- Paso 1: modo de acomodo -->
        <div class="wizard-paso" id="wizard-paso-modo">
```
Después:
```html
        <div class="ajustes-scroll">

        <!-- Paso 0: variantes (antes de modo — condiciona la capacidad de las carpetas) -->
        <div class="wizard-paso" id="wizard-paso-variantes" style="display:none;">
            <div class="pdf-opciones-label">¿Contás alguna de estas variantes en tu colección?</div>
            <div id="wizard-variantes-checks"></div>
            <div class="wizard-nota">💡 Podés dejarlas todas sin marcar y activarlas después desde Ajustes.</div>
            <div class="wizard-nav">
                <button type="button" class="wizard-btn-siguiente" onclick="wizardMostrarPaso('modo')">Siguiente →</button>
            </div>
        </div>

        <!-- Paso 1: modo de acomodo -->
        <div class="wizard-paso" id="wizard-paso-modo" style="display:none;">
```

(`wizard-paso-modo` pasa a tener `style="display:none;"` porque deja de ser
el paso visible por defecto en el markup — ahora lo es "variantes". La
llamada a `wizardMostrarPaso('variantes')` en el Step 3 de abajo es la que
realmente decide qué se ve al abrir el wizard; este cambio de markup es
solo para que la página no muestre "modo" por un instante si por lo que sea
el JS tarda en correr.)

- [ ] **Step 2: Agregar `'variantes'` a la lista de pasos de `wizardMostrarPaso` en `public/app.js`**

Antes (línea 1846-1850):
```js
function wizardMostrarPaso(paso) {
    ['modo','formato','cantidad','capacidad','ajuste','nombres'].forEach(p => {
        document.getElementById(`wizard-paso-${p}`).style.display = (p === paso) ? '' : 'none';
    });
}
```
Después:
```js
function wizardMostrarPaso(paso) {
    ['variantes','modo','formato','cantidad','capacidad','ajuste','nombres'].forEach(p => {
        document.getElementById(`wizard-paso-${p}`).style.display = (p === paso) ? '' : 'none';
    });
}
```

- [ ] **Step 3: Gatear `abrirWizardCarpetas` con `requiereSesion` y arrancar en "variantes"**

Antes (líneas 1835-1839):
```js
function abrirWizardCarpetas() {
    cerrarAjustes();
    wizardMostrarPaso('modo');
    document.getElementById('wizard-carpetas-modal').classList.add('open');
}
```
Después:
```js
function abrirWizardCarpetas() {
    cerrarAjustes();
    // Se marca "visto" ya acá (no solo al cerrar el wizard, como antes):
    // si cancela el login que viene a continuación, no debe insistir de
    // nuevo en cada recarga — mismo espíritu de "si lo cierra sin terminar,
    // no vuelve a insistir" que ya aplicaba al resto del wizard.
    localStorage.setItem('carpetasWizardVisto', '1');
    // Gate de login: si ya hay sesión, esto corre la acción directo (salta
    // el login). Si no, abre el modal de login existente y la reintenta
    // sola al loguearse con éxito — así el wizard nunca llega a verse
    // hasta que hay sesión, sin construir ningún paso de login propio.
    requiereSesion(async () => {
        if (!(await renderVariantesChecks('wizard-variantes-checks'))) return;
        wizardMostrarPaso('variantes');
        document.getElementById('wizard-carpetas-modal').classList.add('open');
    });
}
```

(`cerrarWizardCarpetas()`, que también hace
`localStorage.setItem('carpetasWizardVisto', '1')` al cerrar el modal, no
se toca — queda una escritura redundante pero inofensiva a esa misma clave,
igual que ya pasa hoy con `wizardGuardar()`.)

- [ ] **Step 4: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v49';
```

- [ ] **Step 5: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# El paso "variantes" existe en el markup y "modo" ya no es el default visible
grep -c 'id="wizard-paso-variantes"' public/index.html
grep -c 'id="wizard-paso-modo" style="display:none;"' public/index.html

# La lista de pasos incluye "variantes" primero
grep -n "\['variantes','modo','formato'" public/app.js

# abrirWizardCarpetas ya no llama a wizardMostrarPaso('modo') directo
grep -A5 "^function abrirWizardCarpetas" public/app.js | grep -c "requiereSesion"
```

Expected: los dos primeros `grep -c` dan `1`; el `grep -n` encuentra la
línea; el último `grep -c` da `1`.

Verificación manual en navegador (usando `localStorage.removeItem('carpetasWizardVisto')`
y `localStorage.removeItem('sesion')`-equivalente — en la práctica, cerrar
sesión desde Ajustes y borrar `carpetasWizardVisto` en DevTools antes de
recargar):

- Sin sesión y sin `carpetasWizardVisto`: al cargar la app, a los 600ms se
  abre el **login** (no el wizard). Cancelarlo y recargar la página no
  vuelve a abrir nada solo.
- Logueándose desde ese mismo modal: tras loguear con éxito, se abre el
  wizard directo en el paso **"variantes"** (no "modo"), mostrando los 5
  checkboxes con el estado real actual.
- Tocar "Siguiente →" en "variantes" lleva a "modo", y de ahí el resto del
  wizard (formato, cantidad, capacidad, ajuste, nombres) funciona
  exactamente igual que antes de este plan.
- Marcar una categoría en el paso "variantes" la persiste (confirmar
  abriendo luego Ajustes → Variantes: debe mostrar el mismo estado).
- Con sesión ya iniciada, reabrir el wizard desde Ajustes → arranca directo
  en "variantes", sin pedir login de nuevo.
- Activar una variante en "variantes" y confirmar en el paso "cantidad"
  que la capacidad ya considera esa variante (comparar contra
  `/api/estadisticas` con la categoría activa).

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/app.js public/sw.js
git commit -m "Wizard de carpetas: pedir login primero y preguntar por variantes antes de seguir"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** "Login como gate de apertura" → Task 2 Step 3;
  "Nuevo paso variantes" (markup + reuso) → Task 1 (extracción) + Task 2
  Step 1-2 (markup + wiring). "Fuera de alcance" no generó tareas, a
  propósito (`wizardGuardar()`, el login modal en sí, Ajustes → Variantes
  como panel independiente).
- **Verificado contra código real antes de escribir el plan:** los
  fragmentos "antes" de `abrirPanelVariantes` (líneas 1678-1695),
  `abrirWizardCarpetas`/`cerrarWizardCarpetas`/`wizardMostrarPaso` (líneas
  1835-1850) y el bloque `wizard-paso-modo` de `index.html` (líneas
  400-419) fueron leídos directamente de este repo en su estado actual
  (después del merge del trabajo de Docker, que no tocó estos archivos).
- **Consistencia de nombres:** `renderVariantesChecks(elementId)` se define
  en la Task 1 con esa firma exacta y se consume en la Task 2 exactamente
  igual (`renderVariantesChecks('wizard-variantes-checks')`,
  `renderVariantesChecks('variantes-checks')`), devolviendo `boolean` en
  ambos casos.
- **`requiereSesion` y `toggleCategoriaVariante` no se modifican** — se
  verificó leyendo su código actual que ya manejan sesión y refresco de
  `dataGlobalCache` por su cuenta, así que el nuevo paso del wizard no
  necesita ninguna lógica adicional de autenticación ni de refresco de
  totales.
- **Riesgo de regresión en Ajustes → Variantes:** la Task 1 es un refactor
  puro (mismo fetch, mismo render, mismo modal) — el Step 3 de esa tarea
  pide explícitamente confirmar en navegador que el panel de Ajustes se ve
  y comporta idéntico antes de dar la tarea por terminada.
