# Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el botón único "📂 Acomodar" por un selector de 3 posiciones (Chico/Normal/Grande), persistido en `localStorage`, donde "Grande" es un modo nuevo que muestra tipos + fecha de registro directamente en la tarjeta.

**Architecture:** `modoAcomodar` (booleano) se renombra a `modoVista` (string de 3 valores), persistido igual que `temaActual`. La clase CSS `modo-acomodar` se renombra a `vista-chico` (mismas reglas) y se agrega `vista-grande` (reglas nuevas: menos columnas + bloques de tipos/fecha, ocultos por defecto y mostrados solo bajo esa clase).

**Tech Stack:** Vanilla JS/CSS, sin dependencias nuevas.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-29-tamano-tarjeta-galeria-design.md`.
- El modo "Chico" debe comportarse **exactamente igual** que el "Acomodar" de hoy — solo cambia de nombre.
- `modoVista` persiste en `localStorage` (clave `vistaGaleriaPreferida`) y **no se resetea** al cerrar una galería (a diferencia del `modoAcomodar` actual, que sí se reseteaba).
- **Gotcha del proyecto:** cualquier tarea que toque `public/index.html`, `public/app.js` o `public/styles.css` DEBE bumpear `CACHE_VERSION` en `public/sw.js` en el mismo commit (hoy está en `'pokedex-tcg-v31'`).
- Sin suite de tests — verificación manual en navegador (esta es una feature 100% de cliente).
- Este plan asume que el usuario tiene acceso al sitio para la verificación visual final; las tareas incluyen chequeos de sintaxis (`node --check`) y de estructura como verificación intermedia, pero la confirmación visual queda para una pasada manual.

---

## Task 1: Renombrar a `modoVista`, persistir en `localStorage`, y el selector de 3 botones

**Spec:** secciones "Modelo de datos y estado" y "UI".

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: nada nuevo — reutiliza `getElementById`, `localStorage`, el patrón ya establecido por `temaActual`/`aplicarTema()`.
- Produces: `modoVista`, `aplicarModoVista()`, `elegirModoVista(modo)` — usados por la Tarea 2 (que agrega contenido condicionado a `modoVista === 'grande'`, sin cambiar esta interfaz).

- [ ] **Step 1: Reemplazar los dos botones "Acomodar" en `index.html`**

Antes (línea 150):
```html
                    <button class="btn-acomodar" id="btn-acomodar-d" onclick="toggleModoAcomodar()">📂 Acomodar</button>
```
Después:
```html
                    <div class="vista-selector" id="vista-selector-d">
                        <button class="vista-btn" data-vista="chico" onclick="elegirModoVista('chico')">Chico</button>
                        <button class="vista-btn active" data-vista="normal" onclick="elegirModoVista('normal')">Normal</button>
                        <button class="vista-btn" data-vista="grande" onclick="elegirModoVista('grande')">Grande</button>
                    </div>
```

Antes (línea 159):
```html
                <button class="btn-acomodar" id="btn-acomodar" onclick="toggleModoAcomodar()">📂 Acomodar</button>
```
Después:
```html
                <div class="vista-selector" id="vista-selector">
                    <button class="vista-btn" data-vista="chico" onclick="elegirModoVista('chico')">Chico</button>
                    <button class="vista-btn active" data-vista="normal" onclick="elegirModoVista('normal')">Normal</button>
                    <button class="vista-btn" data-vista="grande" onclick="elegirModoVista('grande')">Grande</button>
                </div>
```

(El `active` hardcodeado en "Normal" es solo el estado antes de que corra JS — `aplicarModoVista()` lo corrige al boot según `localStorage`.)

- [ ] **Step 2: Reemplazar el estado y la función de toggle en `app.js`**

Antes (línea 268):
```js
let modoAcomodar     = false;
```
Después:
```js
let modoVista = localStorage.getItem('vistaGaleriaPreferida') || 'normal'; // 'chico' | 'normal' | 'grande'
```

Antes (líneas 1077-1083):
```js
function toggleModoAcomodar() {
    modoAcomodar = !modoAcomodar;
    const grids = [document.getElementById('gallery-grid'), document.getElementById('gallery-grid-mobile')];
    const btns  = [document.getElementById('btn-acomodar'), document.getElementById('btn-acomodar-d')];
    grids.forEach(g => g && g.classList.toggle('modo-acomodar', modoAcomodar));
    btns.forEach(b  => b && (b.classList.toggle('active', modoAcomodar), b.textContent = modoAcomodar ? '📂 Normal' : '📂 Acomodar'));
}
```
Después:
```js
function aplicarModoVista() {
    const grids = [document.getElementById('gallery-grid'), document.getElementById('gallery-grid-mobile')];
    grids.forEach(g => g && g.classList.toggle('vista-chico', modoVista === 'chico'));
    grids.forEach(g => g && g.classList.toggle('vista-grande', modoVista === 'grande'));
    document.querySelectorAll('.vista-btn').forEach(b => b.classList.toggle('active', b.dataset.vista === modoVista));
}

function elegirModoVista(modo) {
    modoVista = modo;
    localStorage.setItem('vistaGaleriaPreferida', modo);
    aplicarModoVista();
    if (genActualAbierta) RefrescarGaleria(true);
}
```

- [ ] **Step 3: Aplicar el modo guardado al arrancar la app**

En `window.onload` (línea ~2211), agregar la llamada junto a `aplicarTema()`:

Antes:
```js
    sincronizarGrids();
    aplicarTema();
    actualizarBotonesModo();
```
Después:
```js
    sincronizarGrids();
    aplicarTema();
    aplicarModoVista();
    actualizarBotonesModo();
```

- [ ] **Step 4: Dejar de resetear el tamaño al cerrar una galería**

En `cerrarGaleriaYVolver()` (línea ~1212), quitar `modoAcomodar = false` de la línea de reseteo de estado, y borrar el bloque que limpiaba la clase/texto del botón viejo (ya no aplica: el tamaño persiste, no hay texto que resetear).

Antes:
```js
function cerrarGaleriaYVolver() {
    genActualAbierta = null; pkmsActuales = []; filtroActual = 'todos'; modoAcomodar = false;
    pendientesActuales = []; fichaOrigenPendientes = false;
    document.querySelectorAll('.gallery-filter').forEach(f => f.style.display = '');
    ['todos','tenemos','faltan'].forEach(x => {
        const a = document.getElementById(`filter-${x}`);
        const b = document.getElementById(`filter-${x}-d`);
        if (a) a.classList.toggle('active', x === 'todos');
        if (b) b.classList.toggle('active', x === 'todos');
    });
    [document.getElementById('gallery-grid'), document.getElementById('gallery-grid-mobile')].forEach(g => g && g.classList.remove('modo-acomodar'));
    ['btn-acomodar','btn-acomodar-d'].forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.classList.remove('active'); b.textContent = '📂 Acomodar'; }
    });
    if (!esDesktop()) {
```
Después:
```js
function cerrarGaleriaYVolver() {
    genActualAbierta = null; pkmsActuales = []; filtroActual = 'todos';
    pendientesActuales = []; fichaOrigenPendientes = false;
    document.querySelectorAll('.gallery-filter').forEach(f => f.style.display = '');
    ['todos','tenemos','faltan'].forEach(x => {
        const a = document.getElementById(`filter-${x}`);
        const b = document.getElementById(`filter-${x}-d`);
        if (a) a.classList.toggle('active', x === 'todos');
        if (b) b.classList.toggle('active', x === 'todos');
    });
    if (!esDesktop()) {
```

- [ ] **Step 5: Renombrar la clase CSS `modo-acomodar` a `vista-chico`, y agregar el selector de 3 botones**

En `public/styles.css`, renombrar **todas** las ocurrencias de `.gallery-grid.modo-acomodar` (hay 4: línea ~264-268 en la sección mobile base, ~579 y ~672 en sendos bloques `@media(min-width:768px)`) a `.gallery-grid.vista-chico` — mismas reglas, sin cambiar ningún valor, es un renombre puro.

Agregar el estilo del selector nuevo, cerca de `.filter-btn`/`.gallery-filter` (línea ~221-224), reutilizando el mismo patrón visual:
```css
.vista-selector{display:flex;gap:4px;}
.vista-btn{padding:6px 10px;border-radius:10px;border:1px solid var(--border);background:var(--surface);font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--muted);cursor:pointer;transition:all .15s;white-space:nowrap;}
.vista-btn.active{background:var(--accent);border-color:var(--accent);color:#fff;}
```

- [ ] **Step 6: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v32';
```

- [ ] **Step 7: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# Confirmar que no queda ninguna referencia a los nombres viejos
grep -c "modoAcomodar\|toggleModoAcomodar\|btn-acomodar" public/app.js public/index.html
# Confirmar que el renombre de clase CSS se aplicó en los 3 lugares (más la clase nueva vista-grande que agrega la Tarea 2 — todavía no debería existir)
grep -c "gallery-grid.vista-chico" public/styles.css
grep -c "gallery-grid.modo-acomodar" public/styles.css
```

Expected: `app.js: sintaxis OK`; el primer `grep -c` da `0` (ninguna referencia vieja sobrevivió); el segundo da `4` (las 4 reglas renombradas); el tercero da `0`.

La confirmación visual (los 3 botones se ven bien, tocar cada uno cambia el grid, y recargar la página mantiene el tamaño elegido) se hace en una pasada manual en el navegador — no es parte de esta tarea individual.

- [ ] **Step 8: Commit**

```bash
git add public/index.html public/app.js public/styles.css public/sw.js
git commit -m "Reemplazar el botón Acomodar por un selector de 3 tamaños (Chico/Normal/Grande), persistido en localStorage"
```

---

## Task 2: Modo Grande — menos columnas + tipos y fecha en la tarjeta

**Spec:** sección "Modo Grande".

**Files:**
- Modify: `public/app.js`
- Modify: `public/styles.css`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `modoVista`, `.vista-grande` (Tarea 1); `infoTipo(t)`, `hexToRgba(hex, alpha)`, `getFechaRegistro(id)` (ya existentes, usados hoy por `mostrarFicha()`).
- Produces: nada nuevo para otras tareas — es la última de este plan.

- [ ] **Step 1: Agregar los bloques de tipos/fecha en `renderGaleria()`**

En `public/app.js`, dentro del `forEach` de `renderGaleria()` (línea ~1097), después de la línea que calcula `catInfo` (línea ~1107) y antes de crear `card`, agregar:
```js
        const tiposPk   = p.types && p.types.length ? p.types : ['normal'];
        const pillsHTML = tiposPk.map(t => {
            const info = infoTipo(t);
            return `<span class="tipo-pill-mini" style="background:${hexToRgba(info.color,0.16)};color:${info.color};">${info.emoji} ${info.label}</span>`;
        }).join('');
        const fechaTxt = tiene ? getFechaRegistro(p.id) : null;
```

Después de crear `dotM` (línea ~1131, `const dotM = document.createElement('div'); dotM.className = 'pk-status-dot'; dotM.textContent = tiene ? '✓' : '○';`), agregar el bloque extra mobile:
```js
        const extraM = document.createElement('div'); extraM.className = 'pk-extra-mobile';
        extraM.innerHTML = `<div class="pk-extra-tipos">${pillsHTML}</div>${fechaTxt ? `<div class="pk-extra-fecha">Registrado el ${fechaTxt}</div>` : ''}`;
```

Después de `footer.appendChild(nameD); footer.appendChild(statusD);` (línea ~1151), agregar el bloque extra desktop dentro del mismo footer:
```js
        const extraD = document.createElement('div'); extraD.className = 'pk-extra-desktop';
        extraD.innerHTML = `<div class="pk-extra-tipos">${pillsHTML}</div>${fechaTxt ? `<div class="pk-extra-fecha">Registrado el ${fechaTxt}</div>` : ''}`;
        footer.appendChild(extraD);
```

Y en la secuencia de `appendChild` (línea ~1153-1155), agregar `extraM` junto a los demás elementos mobile:

Antes:
```js
        card.appendChild(ridM); card.appendChild(nidM); card.appendChild(imgM);
        card.appendChild(nameM); card.appendChild(statusM); card.appendChild(dotM);
        card.appendChild(header); card.appendChild(imgD); card.appendChild(footer);
```
Después:
```js
        card.appendChild(ridM); card.appendChild(nidM); card.appendChild(imgM);
        card.appendChild(nameM); card.appendChild(statusM); card.appendChild(dotM);
        card.appendChild(extraM);
        card.appendChild(header); card.appendChild(imgD); card.appendChild(footer);
```

(`extraD` ya quedó agregado dentro de `footer` más arriba, así que no hace falta tocar esta lista para él — viaja adentro de `footer` cuando éste se agrega.)

- [ ] **Step 2: Agregar `pk-extra-mobile` a la lista de elementos ocultos en desktop**

En `public/styles.css`, la regla que oculta los elementos mobile en el breakpoint de escritorio (línea ~688-693):

Antes:
```css
            .pk-card > .pk-rid,
            .pk-card > .pk-nid,
            .pk-card > .pk-img,
            .pk-card > .pk-name,
            .pk-card > .pk-status-tag,
            .pk-card > .pk-status-dot { display:none !important; }
```
Después:
```css
            .pk-card > .pk-rid,
            .pk-card > .pk-nid,
            .pk-card > .pk-img,
            .pk-card > .pk-name,
            .pk-card > .pk-status-tag,
            .pk-card > .pk-status-dot,
            .pk-card > .pk-extra-mobile { display:none !important; }
```

- [ ] **Step 3: Estilos de los bloques extra y de las pills chicas**

Cerca de `.tipo-pill` (línea ~371), agregar:
```css
.pk-extra-mobile, .pk-extra-desktop{display:none;}
.gallery-grid.vista-grande .pk-extra-mobile,
.gallery-grid.vista-grande .pk-extra-desktop{display:block;margin-top:4px;}
.pk-extra-tipos{display:flex;flex-wrap:wrap;gap:3px;}
.tipo-pill-mini{display:inline-flex;align-items:center;gap:2px;font-family:'Rajdhani',sans-serif;font-size:9px;font-weight:700;padding:2px 6px;border-radius:20px;white-space:nowrap;}
.pk-extra-fecha{font-size:9px;color:var(--muted);margin-top:2px;}
```

- [ ] **Step 4: Menos columnas para "Grande" en cada breakpoint**

Junto a cada regla `.gallery-grid.vista-chico{...}` renombrada en la Tarea 1, agregar su contraparte `.gallery-grid.vista-grande`:

- Base/mobile (junto a la línea ~268, `.gallery-grid.vista-chico{grid-template-columns:repeat(2,1fr);}`):
  ```css
  .gallery-grid.vista-grande{grid-template-columns:repeat(2,1fr);}
  ```
- `@media(min-width:768px)` — bloque "phone-container" (junto a la línea ~579, que en Normal tiene 5 columnas):
  ```css
  .gallery-grid.vista-grande{grid-template-columns:repeat(3,1fr);}
  ```
- `@media(min-width:768px)` — bloque "DESKTOP" de dos paneles (junto a la línea ~672, Normal tiene 5 columnas):
  ```css
  .gallery-grid.vista-grande{grid-template-columns:repeat(3,1fr);}
  ```
- `@media(min-width:1400px)` (línea ~759, Normal pasa a 6 columnas):
  ```css
  .gallery-grid.vista-grande{grid-template-columns:repeat(4,1fr);}
  ```

(El breakpoint de 1800px no necesita su propia regla — hereda las 4 columnas del de 1400px, que ya alcanza para que la tarjeta tenga espacio de sobra en pantallas grandes.)

- [ ] **Step 5: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v33';
```

- [ ] **Step 6: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# Confirmar que los bloques nuevos quedaron en el archivo
grep -c "pk-extra-mobile\|pk-extra-desktop" public/app.js
grep -c "gallery-grid.vista-grande" public/styles.css
```

Expected: `app.js: sintaxis OK`; el primer `grep -c` da al menos `4` (2 en la creación de cada elemento + 2 en el `appendChild`/`innerHTML`); el segundo da `4` (las 4 reglas de columnas agregadas en este Step, sin contar la regla de `display:block` del Step 3 que usa el mismo selector con otro propósito — si el conteo no calza exactamente, revisar a mano que las 4 reglas de columnas estén, no es necesario que el número sea exacto).

La confirmación visual completa (las pills de tipo se ven bien, la fecha aparece solo si la carta está conseguida, y el grid tiene menos columnas que "Normal" en cada tamaño de pantalla) se hace en una pasada manual en el navegador, en mobile y en desktop — no es parte de esta tarea individual.

- [ ] **Step 7: Commit**

```bash
git add public/app.js public/styles.css public/sw.js
git commit -m "Agregar el modo Grande: menos columnas y tipos/fecha visibles en la tarjeta"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** el renombre + persistencia + selector de 3 botones (Tarea 1) y el contenido/columnas del modo Grande (Tarea 2) cubren cada sección de la spec. "Fuera de alcance" no generó tareas, a propósito.
- **El modo Chico queda idéntico al "Acomodar" de hoy:** la Tarea 1 solo renombra la clase/variable/función, sin tocar ningún valor de las reglas CSS de `.modo-acomodar` originales.
- **Persistencia verificada en el diseño, no solo declarada:** `cerrarGaleriaYVolver()` deja explícitamente de resetear el modo (Tarea 1, Step 4), y `aplicarModoVista()` se llama al boot (Step 3) — sin ambos cambios, la persistencia no se notaría nunca aunque `localStorage` se esté guardando bien.
- **Consistencia con patrones ya existentes:** el selector de 3 botones reutiliza el estilo visual de `.filter-btn` (no inventa un componente nuevo); las pills de tipo del modo Grande reutilizan `infoTipo()`/`hexToRgba()` tal cual los usa `mostrarFicha()`, no una paleta nueva; el mecanismo de "elemento oculto por defecto, mostrado solo bajo una clase del grid" es el mismo que ya usa `pk-var-badge`/el resto de la tarjeta mobile-vs-desktop.
- **Verificado contra código real antes de escribir el plan:** todos los fragmentos "antes" (líneas exactas de `index.html`, `app.js`, `styles.css`) fueron leídos directamente de este repo, incluyendo los 5 breakpoints reales donde cambia la cantidad de columnas del grid.
