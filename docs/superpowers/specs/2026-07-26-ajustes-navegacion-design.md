# Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes"

## Contexto

Las funciones secundarias de la app (Métricas, Cámara, Por acomodar, y las 7 acciones
de Ajustes) se fueron agregando una por una a medida que se construían, y hoy no
comparten un patrón de entrada coherente:

- **Desktop**: `.sb-bottom` (index.html:55-60) tiene 4 botones con label ("📊 Métricas",
  "📷 Cámara", "🔄 Por acomodar", "⚙️ Ajustes") en grid 2x2.
- **Mobile**: `.header-actions` (index.html:74-79) solo tiene 3 iconos sin label
  (Métricas, Cámara, Por acomodar) — **no hay acceso directo a Ajustes**; se llega
  abriendo primero Métricas y usando el atajo "⚙️ Ajustes" de
  `.metrics-quick-actions` (index.html:212-215, oculto en desktop vía
  `@media(min-width:768px){.metrics-quick-actions{display:none}}`, styles.css:418).
- **"Ajustes"** (`.ajustes-lista`, index.html:225-275) es una lista plana de 7
  `.ajustes-item` con el mismo peso visual — exportar/importar datos, configurar
  carpetas, generar PDF, cambiar tema, iniciar/cerrar sesión — sin agrupar por tipo de
  acción ni distinguir "esto abre algo" de "esto se ejecuta ya".

Confirmado con el usuario (brainstorming con mockups vía companion visual, opción "A ·
Agrupado simple" elegida sobre "B · cuenta separada arriba" y "C · iconos a color"):

- Métricas/Cámara/Por acomodar/Ajustes siguen siendo accesos directos siempre
  visibles — **no** se esconden detrás de un menú contextual ni una bottom nav bar.
- El resto de las acciones (hoy dentro de "Ajustes") se agrupan en 3 secciones con
  encabezado, estilo iOS Settings.
- Alcance puramente visual/estructural: sin nuevos endpoints, sin cambiar
  `carpetasConfig`/`inventario`. Los únicos cambios de comportamiento son (1) mobile
  gana un ícono directo a Ajustes y (2) se quita el atajo redundante dentro de
  Métricas.

## Accesos rápidos (Métricas / Cámara / Por acomodar / Ajustes)

No se fusionan `.sb-btn` y `.header-icon-btn` en un solo componente CSS — cada uno sigue
siendo apropiado para su contexto (el sidebar tiene espacio para label, el header
mobile no). El cambio es de **paridad de contenido**, no de componente:

- `.header-actions` (index.html:74-79) gana un 4to botón, mismo patrón que los otros 3:
  `<button class="header-icon-btn" onclick="abrirAjustes()" title="Ajustes">⚙️</button>`.
- `.metrics-quick-actions` (index.html:212-215) y su único botón "⚙️ Ajustes"
  (`cerrarMetricas(); abrirAjustes();`) se eliminan del markup — ya no hace falta,
  Ajustes tiene su propio ícono. La regla `@media(min-width:768px){.metrics-quick-actions{display:none}}`
  (styles.css:418) se elimina junto con el bloque.
- Orden consistente en los 4 accesos, en ambos layouts: Métricas, Cámara, Por acomodar,
  Ajustes (ya es así en desktop; mobile pasa a coincidir).

## "Ajustes" agrupado en 3 secciones

`.ajustes-lista` (index.html:225-275) pasa de una lista plana de 7 botones sueltos
(cada uno su propia píldora con `gap:8px` entre sí, styles.css:478-479) a 3 grupos con
encabezado, cada grupo una sola tarjeta con filas separadas por un divisor fino (sin
gap entre filas del mismo grupo):

- **Colección** — Exportar mi colección, Importar respaldo, Lista de faltantes.
- **Carpetas** — Recortables para carpetas (PDF), Configurar carpetas.
- **Preferencias** — Tema, Iniciar/Cerrar sesión.

Markup nuevo (reemplaza `.ajustes-lista` tal cual, los `onclick`/ids de cada
`.ajustes-item` no cambian):

```html
<div class="ajustes-secciones">
  <div class="ajustes-section-label">Colección</div>
  <div class="ajustes-grupo">
    <button class="ajustes-item" onclick="exportarColeccion()">...</button>
    <button class="ajustes-item" onclick="dispararInputImportar()">...</button>
    <button class="ajustes-item" onclick="descargarListaFaltantes()">...</button>
  </div>

  <div class="ajustes-section-label">Carpetas</div>
  <div class="ajustes-grupo">
    <button class="ajustes-item" onclick="abrirOpcionesPDF()">...</button>
    <button class="ajustes-item" onclick="abrirWizardCarpetas()">...</button>
  </div>

  <div class="ajustes-section-label">Preferencias</div>
  <div class="ajustes-grupo">
    <button class="ajustes-item" onclick="toggleTema()" id="btn-tema-ajustes">...</button>
    <button class="ajustes-item" onclick="abrirLoginOLogout()" id="btn-sesion-ajustes">...</button>
  </div>
</div>
```

CSS nuevo (styles.css, junto a las reglas actuales de `.ajustes-item`):

- `.ajustes-section-label` — mismo tratamiento que `.metrics-section-title`
  (styles.css:412: uppercase, 11px, `letter-spacing:.1em`, color `var(--muted)`),
  con margen superior para separar de la sección anterior.
- `.ajustes-grupo` — contenedor `border-radius:14px;border:1px solid var(--border);overflow:hidden;`
  (mismo radio que hoy tienen los `.ajustes-item` sueltos), sin gap interno.
- `.ajustes-item` dentro de `.ajustes-grupo` pierde su propio `border`/`border-radius`
  individual y en su lugar suma `border-bottom:1px solid var(--border)`, quitado en
  `:last-child` — el mismo patrón que ya usa `.metrics-row` (styles.css:407-408).

## Affordance por fila: `›` solo en las que navegan

Hoy ninguna fila distingue "esto abre otra pantalla" de "esto se ejecuta ya". Se agrega
un `<span class="ajustes-item-chev">›</span>` al final de las filas que abren un modal, y
se omite en las que ejecutan una acción inmediata:

| Fila | ¿Chevron? | Por qué |
|---|---|---|
| Exportar mi colección | No | descarga directo (`exportarColeccion()`) |
| Importar respaldo | No | abre el file picker nativo, no un modal propio |
| Lista de faltantes | No | descarga directo |
| Recortables (PDF) | **Sí** | abre `pdf-opciones-modal` |
| Configurar carpetas | **Sí** | abre `wizard-carpetas-modal` |
| Tema | No | cicla en el momento (`toggleTema()`), no navega |
| Iniciar sesión | **Sí** (solo si no hay sesión) | abre `login-modal` |
| Cerrar sesión | No | `cerrarSesion()` corta la sesión ahí mismo, sin modal |

La fila de sesión cambia de texto/ícono dinámicamente via `actualizarBotonSesion()`
(app.js:120-126); se le agrega ahí mismo el toggle del chevron:

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

CSS: `.ajustes-item-chev{margin-left:auto;color:var(--border);font-size:16px;}` — color
apagado (usa `--border`, no `--muted`) para que lea como affordance discreta, no como
otro dato.

## Fuera de alcance (a propósito)

- Menú contextual/dropdown (tipo Gmail/Notion) o bottom nav bar — evaluados y
  descartados: el usuario confirmó que prefiere accesos directos visibles en vez de
  escondidos detrás de un solo botón.
- Iconos a color estilo iOS (opción "C" del brainstorming) — quedó fuera al elegir la
  opción "A"; puede revisitarse después como mejora incremental si se quiere más
  adelante, sin tocar la estructura de este spec.
- Separar "Sesión" como tarjeta de cuenta arriba de todo (opción "B") — mismo caso,
  descartado en el brainstorming.
- Cualquier cambio a `server.js`, `carpetas.json`, `inventario.json` o los endpoints —
  este spec es 100% `public/index.html` + `public/styles.css` + un par de líneas en
  `public/app.js`.

## Testing

No hay suite de tests (`npm test` es un placeholder, según CLAUDE.md). Verificación
manual, en mobile y desktop, luego de aplicar los cambios:

- Los 4 accesos rápidos (Métricas, Cámara, Por acomodar, Ajustes) están presentes y en
  el mismo orden en ambos layouts; el ícono de Ajustes en mobile abre `ajustes-modal`
  directo, sin pasar por Métricas.
- Dentro de Métricas ya no aparece el atajo a Ajustes.
- "Ajustes" muestra las 3 secciones con encabezado y las 7 acciones agrupadas
  correctamente; cada botón sigue disparando exactamente la misma función que antes
  (no cambia ningún `onclick`).
- El chevron aparece solo en Recortables (PDF), Configurar carpetas, e Iniciar sesión
  (cuando no hay sesión activa) — y desaparece de esa fila apenas se inicia sesión,
  reapareciendo al cerrar sesión.
- No hay regresión visual en modo oscuro (los nuevos elementos usan las variables
  `--border`/`--muted`/`--surface2` existentes, no colores hardcodeados).
- Recordar el bump de `CACHE_VERSION` en `sw.js` en el mismo commit (gotcha ya
  documentado en `CLAUDE.md`).
