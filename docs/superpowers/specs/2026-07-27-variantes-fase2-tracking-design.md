# Fase 2 — Selección de categorías de variantes (núcleo de tracking)

## Contexto

La Fase 1 (`docs/superpowers/specs/2026-07-26-variantes-pokedex-design.md`) ya
dejó `pokemon_db.json` con 1025 entradas base + 179 variantes (57 regionales, 48
mega, 2 primigenia, 33 gigamax, 39 alternativas), cada una con `categoria` y
`especieBase`. Hoy **ningún endpoint las distingue de las entradas base**:
`/api/buscar`, `/api/estadisticas`, `pokemonPorGens()` (que alimenta
`CARPETAS_DEFAULT` y `carpetasConfigValida`), y el PDF de recortables tratan
`pokemonDB` como un array plano de 1204 entradas. Esta rama todavía no se
pusheó a `origin/main`, así que producción no está afectada, pero es la
superficie que hay que resolver antes de mergear.

Esta fase cubre el **núcleo de tracking**: elegir qué categorías de variantes
cuentan como cartas propias, y que esa elección se refleje en el progreso, la
galería y la capacidad de carpetas. El PDF de recortables queda para una
**Fase 3** aparte (mismo criterio que separó Fase 1 de Fase 2: alcance grande,
se decidió cortar el PDF explícitamente para no inflar esta spec).

Confirmado con el usuario durante el brainstorming:

- Es una configuración **global** (afecta `bulk` y `carpetas` por igual), vive
  en una sección nueva de **Ajustes** — no es un paso del wizard de carpetas
  (que solo configura ese modo).
- El usuario elige/marca **cada categoría por separado** (checkboxes), no un
  toggle binario "Nacional" vs. "Con variantes".
- Una variante aparece **inmediatamente después de su especie base** en el
  orden de galería/carpeta/búsqueda (ej. `CHARIZARD`, `CHARIZARD MEGA X`,
  `CHARIZARD MEGA Y`, luego `#007`).
- No se muestra un número propio: se usa el número de la **especie base** +
  un badge de categoría en la tarjeta/ficha.
- Si activar una categoría hace que la capacidad de carpetas ya configurada no
  alcance, se avisa con un toast y se ofrece re-abrir el wizard — no se
  bloquea el toggle ni se rompe la config existente.
- Las 5 categorías arrancan **desactivadas por defecto**: cero cambio de
  comportamiento para quien no toca nada en Ajustes.

## Modelo de datos

### `variantes-config.json`

Archivo nuevo, mismo nivel que `carpetas.json`:

```json
{ "regional": false, "mega": false, "primigenia": false, "gigamax": false, "alternativa": false }
```

- **Validación** (`variantesConfigValida`, mismo estilo que
  `carpetasConfigValida`): objeto con exactamente esas 5 claves, todas
  booleanas. Cualquier otra forma (archivo corrupto, claves faltantes/extra,
  valores no booleanos, `null`, array) cae al default (las 5 en `false`) con
  un `console.warn`, igual que ya hace `carpetasConfig`.
- **Escritura**: `escribirJSONAtomico()` (ya existe, mismo patrón que
  `inventario.json`/`carpetas.json`).
- **Endpoints**:
  - `GET /api/variantes-config` — abierto, sin login (lectura siempre libre,
    mismo criterio que `/api/carpetas-config`).
  - `POST /api/variantes-config` — `requiereLogin` + `rateLimiter`, valida con
    `variantesConfigValida`, guarda, y llama a `broadcast()` (el mismo
    mecanismo SSE que ya usan los cambios de inventario) para que otras
    pestañas/dispositivos se enteren sin refrescar.

### Vista derivada: `pokemonEfectivo()`

Nueva función en `server.js`, recalculada al boot y después de cada `POST
/api/variantes-config`:

```js
const variantesPorBase = new Map(); // especieBase -> variante[], en orden de aparición en pokemon_db.json
for (const v of pokemonDB.filter(p => p.id > 1025)) {
    if (!variantesPorBase.has(v.especieBase)) variantesPorBase.set(v.especieBase, []);
    variantesPorBase.get(v.especieBase).push(v);
}

function pokemonEfectivo() {
    const activas = new Set(Object.entries(variantesConfig).filter(([, v]) => v).map(([k]) => k));
    const resultado = [];
    for (const p of pokemonDB) {
        if (p.id > 1025) continue; // las variantes se insertan junto a su base, no sueltas
        resultado.push(p);
        for (const v of variantesPorBase.get(p.id) || []) {
            if (activas.has(v.categoria)) resultado.push(v);
        }
    }
    return resultado;
}
```

`variantesPorBase` se calcula una sola vez al boot (`pokemonDB` no cambia en
caliente); `pokemonEfectivo()` sí se recalcula en cada request barato (es un
solo recorrido de ~1200 elementos) o se cachea e invalida en el `POST` —
cualquiera de las dos es correcta, se decide al implementar según lo que
quede más simple de leer.

## Cambios en endpoints existentes

- **`/api/buscar`** y **`/api/estadisticas`**: pasan a operar sobre
  `pokemonEfectivo()` en vez de `pokemonDB` crudo. Esto ya resuelve el orden
  intercalado (base seguida de sus variantes activas) sin lógica nueva en el
  cliente.
- **`conseguidosGlobal`/`conseguidosGen`** (`/api/estadisticas`): dejan de ser
  `Object.keys(inv).length` / conteo crudo contra `inv`, y pasan a contar solo
  ids presentes en `pokemonEfectivo()`. **Esto es una corrección necesaria,
  no opcional**: sin ella, una variante marcada mientras su categoría estaba
  activa seguiría sumando al progreso global después de desactivar esa
  categoría, superando incluso al `totalGlobal` ya filtrado.
- **`pokemonPorGens(gens)`** (usado por `CARPETAS_DEFAULT` y
  `carpetasConfigValida` en modo `separadas`): filtra sobre `pokemonEfectivo()`
  en vez de `pokemonDB`, así el cálculo de espacios necesarios ya cuenta las
  variantes activas sin duplicar lógica.
- **Modo `seguidas`** (rangos `desde`/`hasta` sobre 1–1025): la pertenencia de
  una variante a un rango se resuelve por su `especieBase` (siempre 1–1025),
  no por su propio `id` (que siempre es ≥1026 y cae fuera de cualquier rango
  literal). Una variante cuenta para la carpeta cuyo rango contiene a su
  especie base.
- **`/api/exportar`**: **sin cambios** — sigue exportando el inventario crudo
  completo, sin filtrar por `variantesConfig`. Es un respaldo, no una vista;
  filtrarlo arriesgaría perder datos silenciosamente si se restaura con otra
  config activa.
- **`/api/carpetas-config`**: sin cambios de contrato; el efecto de las
  variantes activas ya le llega a través de `pokemonPorGens()`.

## Cliente

### Ajustes

Nuevo ítem en la sección "Colección" del panel de Ajustes (`public/index.html`,
junto a Exportar/Importar/Lista de faltantes): **"Variantes"**, con chevron
`›` que abre un sub-panel (mismo patrón modal-dentro-de-modal que
`abrirOpcionesPDF()`/`abrirWizardCarpetas()`) con 5 checkboxes, una por
categoría, mostrando el conteo al lado (ej. "Formas regionales — 57 cartas").
Tocar un checkbox llama a `POST /api/variantes-config` al instante (sin botón
"Guardar" — mismo estilo inmediato que `toggleTema()`) y dispara
`cargarEstadisticas()` para refrescar galería/progreso ya mismo.

### Galería / ficha

`renderGaleria()` ya itera la lista que le llega de `/api/estadisticas` /
`/api/buscar` en el orden que el servidor decide — no necesita cambiar su
lógica de orden. Lo que sí gana: si la entrada trae `categoria` (indicando que
es una variante), se muestra el número de `especieBase` en vez de un número
propio, más un badge/ícono correspondiente a esa `categoria` en la tarjeta.

### Wizard de carpetas — aviso de capacidad

Al activar una categoría en Ajustes, si la capacidad total ya configurada
(`carpetasConfig`) no alcanza para cubrir el nuevo `pokemonEfectivo()` filtrado
por generación/rango, se muestra un toast de aviso (ej. "Activaste Mega — te
faltan espacios en tus carpetas actuales") con una acción directa a
`abrirWizardCarpetas()`. La config existente sigue funcionando mientras tanto
— no se bloquea el toggle ni se fuerza a resolver antes de continuar.

## Manejo de errores y edge cases

- Marcar/desmarcar una categoría **nunca borra ni modifica `inventario.json`**.
  Una variante marcada como conseguida sigue en el inventario aunque su
  categoría se desactive (solo deja de aparecer/contar); al reactivarla,
  reaparece marcada con la misma fecha original.
- `variantes-config.json` corrupto o con forma inválida cae al default (las 5
  en `false`) con `console.warn` — no tira el servidor abajo, mismo
  comportamiento que ya tiene `carpetasConfig`.
- Cambios desde otra pestaña/dispositivo llegan por el mismo canal SSE que ya
  usan los cambios de inventario — no hace falta refrescar manualmente.

## Fuera de alcance (a propósito, queda para Fase 3)

- El PDF de recortables (`generarPDFRecortables`, `numeroRegional`) no gana
  slots para variantes en esta fase — sigue generando solo los 1025 base,
  exactamente como hoy.
- Cambios al esquema de `pokemon_db.json` o a `fetch_variantes.js` (ya
  cerrados en la Fase 1).
- Migración de colecciones existentes — esta fase no reescribe
  `inventario.json` de ninguna forma, solo cambia qué se muestra/cuenta según
  `variantes-config.json`.

## Testing

No hay suite de tests en el proyecto. Verificación manual al implementar:

- `variantesConfigValida()` contra: objeto válido, con una clave faltante, con
  un valor no booleano, con claves extra, `null`, array — todos caen al
  default salvo el primero.
- Arrancar el server sin `variantes-config.json` → `GET /api/variantes-config`
  da las 5 en `false`, y `/api/estadisticas` da los mismos totales que hoy
  (1025 total) — cero regresión para quien no toca nada.
- Activar "regional" → el total global sube en 57 (confirmar el número
  exacto), y `/api/buscar?gen=1` trae `RAICHU` seguido inmediatamente de
  `RAICHU ALOLA`.
- Marcar una variante como conseguida, desactivar su categoría (desaparece de
  galería/progreso), reactivarla (reaparece marcada, misma fecha) — confirma
  que `inventario.json` no perdió el dato.
- Con una config de carpetas ya ajustada, activar una categoría que deja la
  capacidad corta → aparece el toast de aviso con el atajo al wizard; la
  config vieja sigue funcionando.
- Modo "seguidas": una variante cuya `especieBase` cae en el rango de la
  Carpeta 2 cuenta para esa carpeta, no para otra, aunque su propio `id` sea
  ≥1026.
- `/api/exportar` sigue trayendo el inventario completo sin filtrar, con
  categorías activas o no.
