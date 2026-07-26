# Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar paridad mobile/desktop a los accesos rápidos (Métricas/Cámara/Por acomodar/Ajustes) y reorganizar "Ajustes" de una lista plana de 7 botones a 3 secciones agrupadas con affordance de chevron, sin tocar backend ni cambiar ningún `onclick` existente.

**Architecture:** Cambios puros de `public/index.html` (markup) + `public/styles.css` (estilos nuevos, scoped para no afectar el botón `.ajustes-item` que se reusa en el modal de PDF) + 4 líneas en `public/app.js` (toggle del chevron de sesión). Sin build step: se prueba abriendo `public/index.html` servido por `server.js` y mirándolo en el navegador (no hay suite de tests en el proyecto).

**Tech Stack:** HTML/CSS/JS plano servido por Express (`express.static`), sin bundler ni framework. Verificación visual con Playwright (headless Chromium) contra el servidor real corriendo en `localhost:3000`.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-26-ajustes-navegacion-design.md` — cada tarea cita la sección que implementa.
- Ningún `onclick`/`id` de los botones de Ajustes cambia — solo se reordenan/reagrupan en el DOM.
- `.ajustes-item` también se usa suelto en `#pdf-opciones-modal` (index.html, botón "Generar PDF") — cualquier CSS nuevo de agrupación debe ir scoped a `.ajustes-grupo .ajustes-item`, nunca al selector base `.ajustes-item`, para no afectar ese botón.
- Comentarios y texto de UI en español (convención del proyecto, ver CLAUDE.md).
- **Gotcha del proyecto:** cualquier commit que toque `index.html`, `app.js` o `styles.css` tiene que bumpear `CACHE_VERSION` en `public/sw.js` en el mismo commit (documentado en CLAUDE.md). Se hace en la Tarea 5, después de que el resto de los cambios ya estén.
- No hay suite de tests (`npm test` es un placeholder). La verificación de cada tarea es: `node --check` cuando se toca `app.js`, más una aserción de markup/CSS vía `grep`/`python3` (rápida, sin navegador) para cada tarea individual, y una pasada visual completa con Playwright al final (Tarea 5).

---

## Task 1: Ícono de Ajustes en el header mobile + sacar el atajo redundante de Métricas

**Spec:** sección "Accesos rápidos (Métricas / Cámara / Por acomodar / Ajustes)".

**Files:**
- Modify: `public/index.html` (bloque `.header-actions`, bloque `.metrics-quick-actions`)
- Modify: `public/styles.css` (regla `.metrics-quick-actions`/`.metrics-quick-btn`)

**Interfaces:**
- Consumes: función existente `abrirAjustes()` (definida en `public/app.js`, sin cambios).
- Produces: nada que otras tareas consuman — es una tarea autocontenida.

- [ ] **Step 1: Agregar el botón de Ajustes al header mobile**

En `public/index.html`, dentro de `.header-actions`, después del botón "Por acomodar":

Antes:
```html
            <div class="header-actions">
                <span class="brand-count" id="brand-count">— / 1025</span>
                <button class="header-icon-btn" onclick="mostrarMetricas()" title="Métricas">📊</button>
                <button class="header-icon-btn" id="btn-camara-header" onclick="toggleCamaraOCR()" title="Cámara">📷</button>
                <button class="header-icon-btn" onclick="verPendientesAcomodar()" title="Por acomodar en Carpetas">🔄<span class="btn-badge" id="badge-pendientes-mobile"></span></button>
            </div>
```

Después:
```html
            <div class="header-actions">
                <span class="brand-count" id="brand-count">— / 1025</span>
                <button class="header-icon-btn" onclick="mostrarMetricas()" title="Métricas">📊</button>
                <button class="header-icon-btn" id="btn-camara-header" onclick="toggleCamaraOCR()" title="Cámara">📷</button>
                <button class="header-icon-btn" onclick="verPendientesAcomodar()" title="Por acomodar en Carpetas">🔄<span class="btn-badge" id="badge-pendientes-mobile"></span></button>
                <button class="header-icon-btn" onclick="abrirAjustes()" title="Ajustes">⚙️</button>
            </div>
```

- [ ] **Step 2: Verificar que el botón quedó bien (sin navegador)**

```bash
grep -n 'header-icon-btn" onclick="abrirAjustes()"' public/index.html
```
Esperado: una línea de match, dentro de `.header-actions` (línea ~74-80 del archivo).

- [ ] **Step 3: Quitar el atajo "⚙️ Ajustes" de dentro de Métricas**

En `public/index.html`, dentro de `#metrics-modal`:

Antes:
```html
        <div id="metrics-content"></div>
        <div class="metrics-quick-actions" id="metrics-quick-actions">
            <button class="metrics-quick-btn" onclick="cerrarMetricas(); abrirAjustes();">⚙️ Ajustes</button>
        </div>
    </div>
</div>
```

Después:
```html
        <div id="metrics-content"></div>
    </div>
</div>
```

- [ ] **Step 4: Quitar el CSS ahora huérfano de `.metrics-quick-actions`/`.metrics-quick-btn`**

En `public/styles.css`, dentro del bloque `/* ── METRICS ── */`:

Antes:
```css
        .metrics-close{position:absolute;top:16px;right:18px;font-size:20px;color:var(--muted);cursor:pointer;padding:4px;}
        .metrics-quick-actions{display:flex;flex-direction:column;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);}
        .metrics-quick-btn{width:100%;border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:12px;padding:11px;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;text-align:left;transition:background .15s;}
        .metrics-quick-btn:active{background:var(--border);}
        @media(min-width:768px){.metrics-quick-actions{display:none;}}
```

Después:
```css
        .metrics-close{position:absolute;top:16px;right:18px;font-size:20px;color:var(--muted);cursor:pointer;padding:4px;}
```

- [ ] **Step 5: Verificar que no quedaron referencias sueltas**

```bash
grep -rn "metrics-quick" public/
```
Esperado: sin resultados (0 matches) en `index.html` y `styles.css`.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "Cliente: ícono de Ajustes en el header mobile, sacar el atajo de Métricas"
```

---

## Task 2: Reestructurar el markup de "Ajustes" en 3 secciones agrupadas

**Spec:** sección "'Ajustes' agrupado en 3 secciones".

**Files:**
- Modify: `public/index.html` (bloque `.ajustes-lista` dentro de `#ajustes-modal`)

**Interfaces:**
- Consumes: nada nuevo — reordena los mismos 7 `<button class="ajustes-item">` que ya existen, mismos `onclick`/`id` de cada uno (`exportarColeccion()`, `dispararInputImportar()`, `descargarListaFaltantes()`, `abrirOpcionesPDF()`, `abrirWizardCarpetas()`, `toggleTema()`/`btn-tema-ajustes`, `abrirLoginOLogout()`/`btn-sesion-ajustes`).
- Produces: nuevos selectores `.ajustes-secciones`, `.ajustes-section-label`, `.ajustes-grupo` que la Tarea 3 estiliza. **No agregues el chevron todavía** — eso es la Tarea 4, para mantener este paso enfocado solo en la reagrupación.

- [ ] **Step 1: Reemplazar `.ajustes-lista` por 3 grupos con encabezado**

En `public/index.html`, dentro de `#ajustes-modal`:

Antes (el `<div class="ajustes-lista">...</div>` completo, con los 7 botones tal cual están hoy):
```html
        <div class="ajustes-lista">
            <button class="ajustes-item" onclick="exportarColeccion()">
                <span class="ajustes-item-icon">⬇️</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo">Exportar mi colección</span>
                    <span class="ajustes-item-sub">Descarga un respaldo en JSON</span>
                </span>
            </button>
            <button class="ajustes-item" onclick="dispararInputImportar()">
                <span class="ajustes-item-icon">⬆️</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo">Importar respaldo</span>
                    <span class="ajustes-item-sub">Reemplaza el inventario actual</span>
                </span>
            </button>
            <button class="ajustes-item" onclick="descargarListaFaltantes()">
                <span class="ajustes-item-icon">📋</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo">Lista de faltantes</span>
                    <span class="ajustes-item-sub">Descarga un .txt con lo que te falta</span>
                </span>
            </button>
            <button class="ajustes-item" onclick="abrirOpcionesPDF()">
                <span class="ajustes-item-icon">✂️</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo">Recortables para carpetas (PDF)</span>
                    <span class="ajustes-item-sub">9 por hoja carta, en orden de Pokédex — con opciones</span>
                </span>
            </button>
            <button class="ajustes-item" onclick="abrirWizardCarpetas()">
                <span class="ajustes-item-icon">🗂️</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo">Configurar carpetas</span>
                    <span class="ajustes-item-sub">Elegí cuántas carpetas tenés y qué generaciones va en cada una</span>
                </span>
            </button>
            <button class="ajustes-item" onclick="toggleTema()" id="btn-tema-ajustes">
                <span class="ajustes-item-icon">🌓</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo">Tema</span>
                    <span class="ajustes-item-sub" id="btn-tema-ajustes-sub">Auto (según el sistema)</span>
                </span>
            </button>
            <button class="ajustes-item" onclick="abrirLoginOLogout()" id="btn-sesion-ajustes">
                <span class="ajustes-item-icon">🔒</span>
                <span class="ajustes-item-texto">
                    <span class="ajustes-item-titulo" id="btn-sesion-ajustes-titulo">Iniciar sesión</span>
                    <span class="ajustes-item-sub">Necesaria para marcar/editar cartas</span>
                </span>
            </button>
        </div>
```

Después:
```html
        <div class="ajustes-secciones">
            <div class="ajustes-section-label">Colección</div>
            <div class="ajustes-grupo">
                <button class="ajustes-item" onclick="exportarColeccion()">
                    <span class="ajustes-item-icon">⬇️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Exportar mi colección</span>
                        <span class="ajustes-item-sub">Descarga un respaldo en JSON</span>
                    </span>
                </button>
                <button class="ajustes-item" onclick="dispararInputImportar()">
                    <span class="ajustes-item-icon">⬆️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Importar respaldo</span>
                        <span class="ajustes-item-sub">Reemplaza el inventario actual</span>
                    </span>
                </button>
                <button class="ajustes-item" onclick="descargarListaFaltantes()">
                    <span class="ajustes-item-icon">📋</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Lista de faltantes</span>
                        <span class="ajustes-item-sub">Descarga un .txt con lo que te falta</span>
                    </span>
                </button>
            </div>

            <div class="ajustes-section-label">Carpetas</div>
            <div class="ajustes-grupo">
                <button class="ajustes-item" onclick="abrirOpcionesPDF()">
                    <span class="ajustes-item-icon">✂️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Recortables para carpetas (PDF)</span>
                        <span class="ajustes-item-sub">9 por hoja carta, en orden de Pokédex — con opciones</span>
                    </span>
                </button>
                <button class="ajustes-item" onclick="abrirWizardCarpetas()">
                    <span class="ajustes-item-icon">🗂️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Configurar carpetas</span>
                        <span class="ajustes-item-sub">Elegí cuántas carpetas tenés y qué generaciones va en cada una</span>
                    </span>
                </button>
            </div>

            <div class="ajustes-section-label">Preferencias</div>
            <div class="ajustes-grupo">
                <button class="ajustes-item" onclick="toggleTema()" id="btn-tema-ajustes">
                    <span class="ajustes-item-icon">🌓</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Tema</span>
                        <span class="ajustes-item-sub" id="btn-tema-ajustes-sub">Auto (según el sistema)</span>
                    </span>
                </button>
                <button class="ajustes-item" onclick="abrirLoginOLogout()" id="btn-sesion-ajustes">
                    <span class="ajustes-item-icon">🔒</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo" id="btn-sesion-ajustes-titulo">Iniciar sesión</span>
                        <span class="ajustes-item-sub">Necesaria para marcar/editar cartas</span>
                    </span>
                </button>
            </div>
        </div>
```

- [ ] **Step 2: Verificar que los 7 botones y sus ids siguen todos presentes**

```bash
python3 -c "
h = open('public/index.html').read()
bloque = h.split('AJUSTES MODAL')[1].split('PDF RECORTABLES')[0]
for onclick in ['exportarColeccion()', 'dispararInputImportar()', 'descargarListaFaltantes()',
                 'abrirOpcionesPDF()', 'abrirWizardCarpetas()', 'toggleTema()', 'abrirLoginOLogout()']:
    assert onclick in bloque, f'falta {onclick}'
for id_ in ['btn-tema-ajustes', 'btn-tema-ajustes-sub', 'btn-sesion-ajustes', 'btn-sesion-ajustes-titulo']:
    assert f'id=\"{id_}\"' in bloque, f'falta id {id_}'
assert bloque.count('ajustes-section-label') == 3
assert bloque.count('class=\"ajustes-grupo\"') == 3
assert 'class=\"ajustes-lista\"' not in bloque
print('OK: 7 botones, 3 secciones, sin ajustes-lista viejo')
"
```
Esperado: `OK: 7 botones, 3 secciones, sin ajustes-lista viejo`.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "Cliente: reagrupar Ajustes en 3 secciones (Colección/Carpetas/Preferencias)"
```

---

## Task 3: CSS de las secciones agrupadas

**Spec:** sección "'Ajustes' agrupado en 3 secciones" (bloque de CSS nuevo).

**Files:**
- Modify: `public/styles.css` (bloque `/* ── AJUSTES MODAL ... ── */`)

**Interfaces:**
- Consumes: selectores `.ajustes-secciones`, `.ajustes-section-label`, `.ajustes-grupo` creados en la Tarea 2.
- Produces: estilos finales de la sección — la Tarea 4 solo agrega `.ajustes-item-chev`, no toca nada de esto.

- [ ] **Step 1: Reemplazar `.ajustes-lista` por `.ajustes-secciones` + agregar `.ajustes-section-label`/`.ajustes-grupo`**

En `public/styles.css`:

Antes:
```css
        .ajustes-title{font-family:'Rajdhani',sans-serif;font-size:17px;font-weight:700;color:var(--text);margin-bottom:14px;text-align:center;}
        .ajustes-lista{display:flex;flex-direction:column;gap:8px;}
        .ajustes-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;text-align:left;transition:background .15s;}
        .ajustes-item:active{background:var(--border);}
```

Después:
```css
        .ajustes-title{font-family:'Rajdhani',sans-serif;font-size:17px;font-weight:700;color:var(--text);margin-bottom:14px;text-align:center;}
        .ajustes-secciones{display:flex;flex-direction:column;gap:8px;}
        .ajustes-section-label{font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:8px 0 2px;}
        .ajustes-secciones .ajustes-section-label:first-child{margin-top:0;}
        .ajustes-grupo{display:flex;flex-direction:column;border-radius:14px;border:1px solid var(--border);overflow:hidden;}
        .ajustes-grupo .ajustes-item{border:none;border-radius:0;border-bottom:1px solid var(--border);}
        .ajustes-grupo .ajustes-item:last-child{border-bottom:none;}
        .ajustes-item{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:var(--surface2);cursor:pointer;text-align:left;transition:background .15s;}
        .ajustes-item:active{background:var(--border);}
```

Nota: la regla base `.ajustes-item{...border-radius:14px;border:1px solid var(--border);...}` **se deja intacta** — sigue aplicando tal cual al botón suelto "Generar PDF" de `#pdf-opciones-modal` (que no está dentro de `.ajustes-grupo`). La regla `.ajustes-grupo .ajustes-item{border:none;border-radius:0;...}` tiene más especificidad y solo pisa el `border`/`border-radius` para los botones que sí están agrupados.

- [ ] **Step 2: Verificar que no quedó ninguna referencia a `.ajustes-lista` y que el botón del PDF no se tocó**

```bash
grep -n "ajustes-lista" public/styles.css public/index.html
```
Esperado: sin resultados.

```bash
grep -n 'id="btn-pdf-recortables"' public/index.html
```
Esperado: una línea, sigue existiendo tal cual (no está dentro de `.ajustes-grupo`).

- [ ] **Step 3: Arrancar el server y confirmar visualmente que Ajustes se ve agrupado**

```bash
systemctl restart pokedex.service
sleep 1
curl -s http://localhost:3000/ -o /dev/null -w "%{http_code}\n"
```
Esperado: `200`. Después, con Playwright (mismo patrón usado antes en este proyecto — lanzar Chromium headless con `{ args: ['--no-sandbox'] }`, `localStorage.setItem('carpetasWizardVisto','1')` antes de navegar, click en el botón "⚙️ Ajustes" del sidebar en desktop o el nuevo ícono del header en mobile, esperar `#ajustes-modal.open`), tomar una captura y confirmar visualmente 3 secciones con encabezado, cada una en una tarjeta con divisores — y que el botón "Generar PDF" dentro de "Recortables para carpetas" (abrir esa opción desde Ajustes) sigue con su estilo de píldora suelta de siempre.

- [ ] **Step 4: Commit**

```bash
git add public/styles.css
git commit -m "Cliente: CSS de las secciones agrupadas de Ajustes"
```

---

## Task 4: Chevron de navegación en las filas que abren un modal

**Spec:** sección "Affordance por fila: `›` solo en las que navegan".

**Files:**
- Modify: `public/index.html` (agregar `<span class="ajustes-item-chev">›</span>` en 3 de los 7 botones)
- Modify: `public/styles.css` (regla `.ajustes-item-chev`)
- Modify: `public/app.js:120-126` (función `actualizarBotonSesion`)

**Interfaces:**
- Consumes: `.ajustes-grupo`/`.ajustes-item` de las Tareas 2-3 (ya deben estar aplicadas).
- Produces: nada que otra tarea consuma — última tarea de contenido antes del bump de versión.

- [ ] **Step 1: Agregar el chevron a "Recortables para carpetas (PDF)"**

En `public/index.html`:

Antes:
```html
                <button class="ajustes-item" onclick="abrirOpcionesPDF()">
                    <span class="ajustes-item-icon">✂️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Recortables para carpetas (PDF)</span>
                        <span class="ajustes-item-sub">9 por hoja carta, en orden de Pokédex — con opciones</span>
                    </span>
                </button>
```

Después:
```html
                <button class="ajustes-item" onclick="abrirOpcionesPDF()">
                    <span class="ajustes-item-icon">✂️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Recortables para carpetas (PDF)</span>
                        <span class="ajustes-item-sub">9 por hoja carta, en orden de Pokédex — con opciones</span>
                    </span>
                    <span class="ajustes-item-chev">›</span>
                </button>
```

- [ ] **Step 2: Agregar el chevron a "Configurar carpetas"**

Antes:
```html
                <button class="ajustes-item" onclick="abrirWizardCarpetas()">
                    <span class="ajustes-item-icon">🗂️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Configurar carpetas</span>
                        <span class="ajustes-item-sub">Elegí cuántas carpetas tenés y qué generaciones va en cada una</span>
                    </span>
                </button>
```

Después:
```html
                <button class="ajustes-item" onclick="abrirWizardCarpetas()">
                    <span class="ajustes-item-icon">🗂️</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Configurar carpetas</span>
                        <span class="ajustes-item-sub">Elegí cuántas carpetas tenés y qué generaciones va en cada una</span>
                    </span>
                    <span class="ajustes-item-chev">›</span>
                </button>
```

- [ ] **Step 3: Agregar el chevron a "Iniciar/Cerrar sesión" (arranca visible; se oculta si hay sesión activa en el Step 5)**

Antes:
```html
                <button class="ajustes-item" onclick="abrirLoginOLogout()" id="btn-sesion-ajustes">
                    <span class="ajustes-item-icon">🔒</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo" id="btn-sesion-ajustes-titulo">Iniciar sesión</span>
                        <span class="ajustes-item-sub">Necesaria para marcar/editar cartas</span>
                    </span>
                </button>
```

Después:
```html
                <button class="ajustes-item" onclick="abrirLoginOLogout()" id="btn-sesion-ajustes">
                    <span class="ajustes-item-icon">🔒</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo" id="btn-sesion-ajustes-titulo">Iniciar sesión</span>
                        <span class="ajustes-item-sub">Necesaria para marcar/editar cartas</span>
                    </span>
                    <span class="ajustes-item-chev">›</span>
                </button>
```

- [ ] **Step 4: CSS de `.ajustes-item-chev`**

En `public/styles.css`, después de la regla `.ajustes-item-sub`:

Antes:
```css
        .ajustes-item-sub{font-size:11px;color:var(--muted);}
        .ajustes-item:disabled{opacity:.6;cursor:default;}
```

Después:
```css
        .ajustes-item-sub{font-size:11px;color:var(--muted);}
        .ajustes-item-chev{margin-left:auto;flex-shrink:0;color:var(--border);font-size:16px;}
        .ajustes-item:disabled{opacity:.6;cursor:default;}
```

- [ ] **Step 5: Ocultar el chevron de la fila de sesión cuando hay sesión activa**

En `public/app.js:120-126`, función `actualizarBotonSesion`:

Antes:
```js
function actualizarBotonSesion() {
    const texto = sesionActiva ? '🔓 Cerrar sesión' : '🔒 Iniciar sesión';
    const titulo = document.getElementById('btn-sesion-ajustes-titulo');
    if (titulo) titulo.textContent = sesionActiva ? 'Cerrar sesión' : 'Iniciar sesión';
    const icono = document.querySelector('#btn-sesion-ajustes .ajustes-item-icon');
    if (icono) icono.textContent = sesionActiva ? '🔓' : '🔒';
}
```

Después:
```js
function actualizarBotonSesion() {
    const texto = sesionActiva ? '🔓 Cerrar sesión' : '🔒 Iniciar sesión';
    const titulo = document.getElementById('btn-sesion-ajustes-titulo');
    if (titulo) titulo.textContent = sesionActiva ? 'Cerrar sesión' : 'Iniciar sesión';
    const icono = document.querySelector('#btn-sesion-ajustes .ajustes-item-icon');
    if (icono) icono.textContent = sesionActiva ? '🔓' : '🔒';
    const chev = document.querySelector('#btn-sesion-ajustes .ajustes-item-chev');
    if (chev) chev.style.display = sesionActiva ? 'none' : '';
}
```

- [ ] **Step 6: Verificar sintaxis de `app.js` y presencia de los 3 chevrones**

```bash
node --check public/app.js && echo "app.js OK"
```
Esperado: `app.js OK`.

```bash
python3 -c "
h = open('public/index.html').read()
bloque = h.split('AJUSTES MODAL')[1].split('PDF RECORTABLES')[0]
assert bloque.count('ajustes-item-chev') == 3, bloque.count('ajustes-item-chev')
print('OK: 3 chevrones en el markup de Ajustes')
"
```
Esperado: `OK: 3 chevrones en el markup de Ajustes`.

- [ ] **Step 7: Probar a mano el toggle de sesión**

Con el server corriendo (`systemctl restart pokedex.service`), loguearse (`POST /api/login` con la contraseña de `/etc/pokedex.env`) y confirmar con Playwright o curl+DOM que, tras iniciar sesión, `#btn-sesion-ajustes .ajustes-item-chev` pasa a `display:none`, y que cerrando sesión vuelve a aparecer. Este es exactamente el patrón de verificación ya usado en este proyecto (login vía `/api/login`, cookie de sesión, revisar el DOM con Playwright).

- [ ] **Step 8: Commit**

```bash
git add public/index.html public/styles.css public/app.js
git commit -m "Cliente: chevron de navegación en las filas de Ajustes que abren un modal"
```

---

## Task 5: Bump de `CACHE_VERSION` y verificación visual end-to-end

**Spec:** sección "Testing" del spec — gotcha de `CACHE_VERSION` documentado en CLAUDE.md.

**Files:**
- Modify: `public/sw.js` (constante `CACHE_VERSION`)

**Interfaces:**
- Consumes: todos los cambios de las Tareas 1-4 ya aplicados y commiteados.
- Produces: nada — es la tarea final de esta feature.

- [ ] **Step 1: Bumpear la versión**

Al momento de escribir este plan, `public/sw.js` está en `pokedex-tcg-v22`. Confirmar que sigue siendo esa antes de tocarlo (si algún commit posterior ya la subió, usar el número real que aparezca en vez de v22/v23):

```bash
grep -n "CACHE_VERSION = " public/sw.js
```
Esperado: `const CACHE_VERSION = 'pokedex-tcg-v22';`. Si el número es distinto, usar ese como base para el `+1` del siguiente cambio.

En `public/sw.js`:

Antes:
```js
const CACHE_VERSION = 'pokedex-tcg-v22';
```

Después:
```js
const CACHE_VERSION = 'pokedex-tcg-v23';
```

- [ ] **Step 2: Commit del bump**

```bash
git add public/sw.js
git commit -m "Bump CACHE_VERSION tras reorganizar accesos rápidos y Ajustes"
```

- [ ] **Step 3: Reiniciar el server y correr la verificación visual completa**

```bash
systemctl restart pokedex.service
sleep 1
systemctl is-active pokedex.service
```
Esperado: `active`.

Con Playwright (mismo patrón ya usado en este proyecto: Chromium headless, `args:['--no-sandbox']`, `addInitScript` con `localStorage.setItem('carpetasWizardVisto','1')`, viewports `{width:420,height:800}` y `{width:1280,height:900}`), verificar en **ambos** anchos:

1. El header mobile (420px) tiene 4 iconos (`📊📷🔄⚙️`) en `.header-actions`, y el 4to abre `#ajustes-modal` directo sin pasar por Métricas.
2. Dentro de `#metrics-modal` ya no hay ningún botón de Ajustes.
3. `#ajustes-modal` muestra 3 encabezados de sección (Colección/Carpetas/Preferencias) y cada grupo es una sola tarjeta con divisores entre filas (no 7 píldoras sueltas).
4. El chevron `›` aparece únicamente en "Recortables para carpetas (PDF)", "Configurar carpetas" e "Iniciar sesión" (sin sesión activa).
5. Abrir "Recortables para carpetas (PDF)" desde Ajustes y confirmar que el botón "Generar PDF" ahí adentro se ve igual que siempre (píldora suelta, sin el estilo de fila agrupada).
6. `page.on('console', ...)` no reporta errores en ningún paso.
7. Repetir la revisión con `:root[data-theme="dark"]` (o `prefers-color-scheme: dark` a nivel del navegador) para confirmar que las tarjetas/divisores nuevos usan las variables de color y no quedan invisibles o con contraste roto en modo oscuro.

- [ ] **Step 4: Reportar el resultado**

Si todo lo del Step 3 pasa, la feature está completa — no hace falta un commit adicional (el bump ya se commiteó en el Step 2). Si algo falla, arreglarlo en el archivo correspondiente de las Tareas 1-4 y volver a correr este Step 3 antes de dar por cerrada la tarea.

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** las 4 secciones del spec ("Accesos rápidos", "Ajustes agrupado", "Affordance por fila", "Testing") tienen tarea propia (1, 2+3, 4, 5 respectivamente). "Fuera de alcance" no requiere tarea — es una lista negativa.
- **Placeholders:** ninguno — cada step tiene el diff exacto (antes/después) o el comando concreto a correr.
- **Consistencia de nombres:** `.ajustes-secciones` / `.ajustes-section-label` / `.ajustes-grupo` / `.ajustes-item-chev` se introducen en la Tarea 2/3/4 y se usan igual en todas — no hay variantes de nombre entre tareas.
- **Riesgo cubierto explícitamente:** el scoping de `.ajustes-grupo .ajustes-item` vs `.ajustes-item` a secas, para no romper el botón "Generar PDF" de `#pdf-opciones-modal`, está anotado en la Tarea 3 y verificado en su Step 2 y en la Tarea 5 Step 3.5.
