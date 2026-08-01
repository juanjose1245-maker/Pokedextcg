# Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros

## Contexto

El selector de tamaño de tarjeta (Chico/Normal/Grande, agregado en
`docs/superpowers/specs/2026-07-29-tamano-tarjeta-galeria-design.md`) funciona
bien pero se ve visualmente aislado del resto de los controles de la galería:

- En **desktop**, el grupo `vista-selector-d` ya comparte fila con el grupo de
  filtros `gallery-filter-desktop` (ambos dentro de `desktop-topbar-right`),
  pero cada botón tiene su propio borde/fondo individual y el grupo de tamaño
  usa texto ("Chico"/"Normal"/"Grande") mientras el de filtros usa etiquetas
  más cortas — se leen como dos grupos de botones sueltos, no como una sola
  barra de herramientas.
- En **mobile** el problema es más notorio: el selector (`vista-selector`)
  vive en `gallery-header-mobile`, junto al título de la galería, en una fila
  completamente distinta a la de los filtros Todos/✓ Tenemos/○ Faltan
  (`gallery-filter-mobile`), que está debajo. Queda flotando arriba, sin
  relación visual con el resto de los controles.

Confirmado con el usuario durante el brainstorming:

- El selector de tamaño pasa de **texto a iconos compactos** — un ícono de
  "densidad de grilla" por tamaño, dibujado con CSS (sin librería de iconos,
  igual que el resto del proyecto), no emoji.
- En **mobile**, el selector se muda de la fila del título a la fila de
  filtros, quedando al final de esa fila — mismo patrón que ya usa desktop.
- Sin cambios de JS: `elegirModoVista()`/`aplicarModoVista()` (`app.js`) solo
  tocan clases (`.active`, `.vista-chico`, `.vista-grande`), nunca
  `textContent` — el swap a iconos es puramente HTML/CSS.

## Iconos de tamaño

Un cuadradito de ~14×14px con una mini-grilla CSS dentro (spans con
`background:currentColor`, así el ícono hereda el mismo color que ya usan los
estados `.vista-btn`/`.vista-btn.active` — `var(--muted)` inactivo, blanco
activo — sin declarar color propio):

- **Chico** → grilla 3×3 (9 cuadraditos): más columnas en el grid real, ícono
  "denso".
- **Normal** → grilla 2×2 (4 cuadraditos).
- **Grande** → un solo cuadrado grande (sin subdivisiones): menos columnas en
  el grid real, ícono "grueso".

El mapeo ícono→resultado es literal: la cantidad de celdas del ícono espeja la
cantidad relativa de columnas que produce ese tamaño en el grid real. Cada
botón mantiene `data-vista` (ya existente, usado por `aplicarModoVista()` para
marcar `.active`) y suma `title="Chico"` / `"Normal"` / `"Grande"` — tooltip
nativo al pasar el mouse y texto accesible para lectores de pantalla, ya que
el botón deja de tener texto visible.

## Ubicación

- **Desktop**: sin cambios de posición — `vista-selector-d` sigue dentro de
  `desktop-topbar-right`, junto a `gallery-filter-desktop`. Solo cambia el
  contenido de cada botón (ícono en vez de texto) y el padding/tamaño del
  botón para que quede compacto y a la misma altura visual que los
  `filter-btn` de al lado.
- **Mobile**: `vista-selector` se saca de `gallery-header-mobile` (que queda
  solo con título/subtítulo) y se agrega al final de la fila de
  `gallery-filter-mobile`, dentro de un contenedor flex compartido — incluyendo
  los filtros y el nuevo iconos-selector como dos grupos en la misma fila. Esto
  no cambia el orden de filtros entre sí, ni afecta a `setFiltro()`, que sigue
  operando sobre los mismos ids de botones de filtro.

## Fuera de alcance

- Cualquier lógica de `modoVista`/`elegirModoVista()`/`aplicarModoVista()` —
  siguen intactas, esto es puramente visual (markup + CSS).
- El comportamiento de cada tamaño (columnas, contenido de la tarjeta en
  "Grande") — ya está implementado y no cambia.
- Un divisor visual explícito entre el grupo de filtros y el de tamaño (se
  evaluó como parte de "una sola barra con separador" en el brainstorming,
  pero el usuario eligió el enfoque de iconos compactos en lugar de esa
  opción) — el espaciado entre grupos alcanza con el `gap` que ya usan
  `desktop-topbar-right` y el nuevo contenedor mobile.

## Testing

Sin suite de tests — verificación manual en navegador (cambio 100% de
presentación):

- Los 3 iconos se ven y su tamaño relativo (3×3, 2×2, 1 cuadrado) comunica
  claramente cuál es más denso/más grande, en mobile y en desktop.
- El ícono activo se distingue del resto (mismo criterio de color que hoy:
  fondo `--accent` + texto/ícono blanco).
- Pasar el mouse sobre cada ícono en desktop muestra el tooltip nativo con el
  nombre del tamaño.
- En mobile, los iconos de tamaño aparecen al final de la fila de filtros
  (Todos/✓ Tenemos/○ Faltan), no arriba junto al título.
- Tocar cada ícono sigue cambiando el grid exactamente igual que antes
  (mismo comportamiento de `elegirModoVista()`, sin regresión).
- Recargar la página mantiene el tamaño elegido (persistencia en
  `localStorage`, sin cambios en esa parte).
