# Fase 3 — Variantes en el PDF de recortables

## Contexto

Las Fases 1 y 2 (`docs/superpowers/specs/2026-07-26-variantes-pokedex-design.md` y
`docs/superpowers/specs/2026-07-27-variantes-fase2-tracking-design.md`) dejaron
`pokemon_db.json` con 179 variantes investigadas, un panel en Ajustes → Variantes
para elegir qué categorías cuentan como cartas propias, y toda la app (galería,
ficha, progreso, buscador, wizard de carpetas) respetando esa elección. El PDF de
recortables (`generarPDFRecortables`, `server.js`) quedó **explícitamente fuera**
de la Fase 2 — hoy sigue generando únicamente las 1025 entradas base, sin importar
qué categorías estén activas en Ajustes.

Confirmado con el usuario durante el brainstorming:

- Es **automático**: el PDF sigue el mismo `variantesConfig` que ya usa el resto
  de la app (Ajustes → Variantes) — no hay un toggle propio dentro de las
  opciones del PDF para decidir aparte si las incluye o no.
- El texto bajo cada variante en el PDF es **el número de su especie base +
  la categoría entre paréntesis** (ej. `R#006 N#0006 (MEGA X)`) — no un número
  propio (no tiene) ni solo el nombre sin número.
- Cada variante se **intercala justo después de su especie base**, igual que ya
  hace la galería digital — aunque esto implique que activar una categoría
  nueva corre de lugar a los Pokémon impresos después de ese punto en hojas ya
  armadas. El usuario prefirió consistencia con el resto de la app por sobre
  preservar la posición física de recortables ya impresos.

## Cambios

### `generarPDFRecortables(rutaSalida, opciones)` (`server.js`)

- La lista de entrada (`pokemonOrdenados`) pasa de filtrar `pokemonDB` crudo a
  filtrar `pokemonEfectivo()` (ya existente desde la Fase 2 — base 1025 + solo
  las variantes de categorías activas, intercaladas tras su especie base). El
  `.sort((a,b) => a.id - b.id)` que ya tiene la función alcanza para mantener
  el orden intercalado, porque los `id` de las variantes son siempre mayores
  a los de cualquier base (1026+) pero cada variante ya quedó ubicada
  inmediatamente después de su base **en el array que devuelve
  `pokemonEfectivo()`** — hay que ordenar por la posición dentro de ese array
  (o por un índice auxiliar), no por `id` puro, porque ordenar por `id` puro
  volvería a mandar todas las variantes al final. Ver "Riesgo" abajo.
- El filtro por generación (modo `separadas`, `opciones.gens.has(p.gen)`) no
  cambia — el campo `gen` de una variante ya es igual al de su especie base
  desde la Fase 1, así que cae naturalmente en la generación correcta.
- El filtro por rango (modo `seguidas`, `p.id >= r.desde && p.id <= r.hasta`)
  pasa a comparar `anclaId(p)` (ya existente desde la Fase 2) en vez de `p.id`
  directo — igual que ya hace `/api/buscar?desde=&hasta=`, para que una
  variante caiga en el rango de su especie base aunque su propio `id` sea
  ≥1026.
- `textoNumeros(p)` pasa de usar `numeroRegional(p)`/`p.id` a usar `anclaId(p)`
  para calcular el número Regional y Nacional, y agrega `` ` (${p.categoria.toUpperCase()})` ``
  al final cuando `p.categoria` existe. Ejemplo para una Mega de Charizard:
  `R#006 N#0006 (MEGA)`. El label de categoría es el valor crudo en mayúsculas
  (`MEGA`, `REGIONAL`, `PRIMIGENIA`, `GIGAMAX`, `ALTERNATIVA`) — no hace falta
  un mapeo a nombres bonitos como en el cliente (`CATEGORIA_INFO`), porque es
  texto de referencia en una hoja impresa, no una pill de color.
- Las portadas de región (`idsIniciales = [CORTES_GEN[gen]+1, +4, +7]`) no
  cambian — siguen anclando a especies base por posición de Pokédex regional;
  las variantes nunca son "el inicial" de una región.
- El resto de la función (paginación 3×3, descarga de imágenes con
  `mapConcurrencia`/`descargarImagen`, dibujo) no cambia — ya opera sobre
  cualquier entrada con `image`/`name`/`id`, sin asumir que son solo las 1025
  base.

**Riesgo a resolver al implementar:** confirmar cómo ordenar `pokemonOrdenados`
para que el intercalado quede correcto. La forma más simple y menos propensa a
error: no ordenar por `id`, sino recorrer `pokemonEfectivo()` ya filtrado (por
generación o por rango vía `anclaId`) preservando el orden en que esa función
ya las entrega — `pokemonEfectivo()` **ya** devuelve todo en el orden correcto
(cada variante intercalada tras su base), así que basta con **no volver a
ordenar por `id`** después de filtrar, sino mantener el orden de iteración
original de `pokemonEfectivo()`.

### Caché e invalidación (`/api/pdf-carpetas`)

Hoy la caché de disco (`RUTA_PDF_RECORTABLES`/`RUTA_PDF_RECORTABLES_SEGUIDAS`,
la combinación default de "todas las carpetas + números ambos") se invalida
comparando la fecha de modificación del PDF cacheado contra la de
`pokemon_db.json`. Eso ya no alcanza: activar/desactivar una categoría en
Ajustes no toca `pokemon_db.json`, así que el PDF cacheado seguiría sirviendo
una versión vieja (con o sin variantes, según lo que hubiera cuando se generó)
hasta que el usuario regenere la base de datos de referencia — que no tiene
nada que ver con esto.

**Cambio:** el chequeo de "¿la caché sigue sirviendo?" pasa a comparar contra
el más nuevo de **dos** archivos: `pokemon_db.json` **y** `variantes-config.json`
(si este último no existe todavía — nadie tocó Ajustes → Variantes nunca — se
usa solo `pokemon_db.json`, como hoy). Así, togglear una categoría invalida la
caché exactamente igual que regenerar `pokemon_db.json` ya la invalida hoy.

## Fuera de alcance

- Cambios al layout de la grilla 3×3, al tamaño de página, o a las portadas de
  región — sin cambios.
- Un toggle propio dentro de las opciones del PDF para incluir/excluir
  variantes independientemente de Ajustes — decidido explícitamente en contra.
- Migración de PDFs ya descargados por el usuario — esta fase no puede saber
  ni le importa qué imprimió antes.
- Cambios a `/api/carpetas-config`, `carpetasConfigValida`, o el wizard —
  ninguno de estos depende del PDF.

## Testing

Sin suite de tests — verificación manual con `curl` contra una instancia
temporal del worktree (nunca contra `pokedex.service` en producción):

- Con las 5 categorías apagadas: el PDF generado debe ser **byte-idéntico** al
  que generaba el código antes de esta fase (mismo total de páginas/imágenes,
  1025 entradas) — cero regresión para quien no toca Ajustes.
- Con alguna categoría activa (ej. `mega`): el PDF debe traer más entradas que
  antes, en el orden intercalado esperado (spot-check: la entrada de Charizard
  debe estar seguida por sus Megas antes de continuar con el próximo Pokémon
  de la Pokédex).
- Togglear una categoría y volver a pedir el PDF "default" (todas las carpetas
  + números ambos) debe regenerar la caché en disco, no servir la versión
  vieja — confirmar comparando el tamaño/contenido del archivo cacheado antes
  y después del toggle.
- Modo "seguidas": una variante cuya especie base cae en el rango de una
  carpeta debe aparecer en el PDF de esa carpeta, no en otra.
