# Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.)

## Contexto

El usuario quiere que el wizard de configuración de carpetas permita elegir entre una
"Pokédex nacional normal" (los 1025 Pokémon base, como hoy) y una que **incluya
variantes** — formas regionales, Megaevoluciones, Gigamax, etc. — tratadas como cartas
propias: cuentan aparte en el progreso, tienen su propio casillero "la tengo/no la
tengo", y su propio slot en el PDF de recortables.

Hoy `pokemon_db.json` tiene **exactamente 1025 entradas** (`fetch_pokemon.js`, un
Pokémon por especie, ids 1–1025) — no existe ningún dato de variantes en el proyecto.
Prácticamente todo el sistema (validación del servidor, rangos de carpetas, PDF,
número regional) asume implícitamente "id = número de Pokédex nacional, 1 a 1025", así
que agregar variantes es un cambio de fondo, no un toggle de UI.

Dado el tamaño del pedido, se decidió partirlo en dos proyectos encadenados:

- **Fase 1 (este spec)**: investigar y traer los datos de las variantes a
  `pokemon_db.json`. No toca wizard, servidor de escritura, ni PDF — es puramente
  la base de datos de referencia.
- **Fase 2 (spec aparte, después)**: el paso nuevo del wizard, cómo se numeran/muestran
  las variantes, y todos los cambios de servidor/cliente/PDF que dependen de que la
  Fase 1 ya exista.

Confirmado con el usuario durante el brainstorming:

- Las variantes se trackean como **cartas propias**, separadas de su especie base
  (checkbox propio, cuentan aparte en el progreso, slot propio en el PDF) — no como
  variaciones visuales de la misma entrada.
- Es una configuración **global** (afecta tanto `bulk` como `carpetas`), no algo
  exclusivo del wizard de carpetas.
- Categorías en alcance: formas regionales, Megaevolución, Regresión Primigenia,
  Gigamax/Dynamax, y formas alternativas — pero de estas últimas, **solo las que
  tengan carta TCG propia** (esto excluye variaciones puramente cosméticas sin carta
  individual, como los ~20 patrones de Vivillon, los sabores de Alcremie o las 28
  letras de Unown).
- Teracristalización queda **fuera de alcance**: no es una forma fija de un Pokémon
  (cualquier Pokémon puede teracristalizar a cualquiera de 18 tipos), así que no
  encaja en el modelo "una entrada = una forma coleccionable".
- Los datos viven en el **mismo `pokemon_db.json`**, como entradas agregadas al final
  (no un archivo separado).
- Las variantes se agrupan/ordenan junto a su especie base (orden nacional), no por la
  generación del juego en que salió esa forma específica — así Mega Charizard queda
  al lado de Charizard, no mezclado con los Pokémon nativos de Kalos.

## Modelo de datos

### Esquema de cada entrada variante

Mismos campos que ya tiene toda entrada de `pokemon_db.json`, más dos nuevos:

```json
{
  "id": 1026,
  "name": "CHARIZARD MEGA X",
  "types": ["fire", "dragon"],
  "gen": 1,
  "image": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10034.png",
  "categoria": "mega",
  "especieBase": 6
}
```

- **`id`**: nuevo, secuencial, continuando después de 1025 (1026, 1027, ...). Sin
  decimales ni ids compuestos — sigue siendo un entero simple, para no romper ningún
  código que ya asume `id` numérico entero (server.js lo usa como clave de
  `inventario[modo][id]`, lo valida con `idsValidos.has(Number(id))`, etc.).
- **`name`**: el nombre visible **completo**, incluyendo el calificador de la variante
  (`"CHARIZARD MEGA X"`, `"RAICHU ALOLA"`, `"ROTOM CALOR"` — mantener el mismo criterio
  de mayúsculas que ya usa `fetch_pokemon.js`). Se eligió así (en vez de un campo
  separado para el calificador) para que `/api/buscar` siga funcionando sin cambios:
  como ya hace `p.name.startsWith(q)`, buscar `"CHARIZARD"` sigue encontrando tanto la
  entrada base como sus variantes.
- **`types`**: el tipo de **la variante**, no necesariamente el de la especie base
  (ej. Mega Charizard X es Fuego/Dragón, la base es Fuego/Volador; Alolan Ninetales es
  Hielo/Hada, la base es solo Fuego).
- **`gen`**: **igual al `gen` de la especie base**, no la generación en la que salió
  esa forma específica. Esto es lo que hace que las variantes caigan en la misma
  carpeta que su especie base en el modo "separadas por generación" que ya existe, sin
  necesitar ningún cambio en `carpetaDe()`/`pokemonPorGens()` — el campo ya hace el
  trabajo tal cual está.
- **`image`**: artwork oficial de la variante (no el de la especie base). PokeAPI
  expone la mayoría de estas formas como entradas propias de su endpoint
  `/pokemon/{nombre-con-sufijo}` (ej. `charizard-mega-x`, `raichu-alola`,
  `meowth-galar`, `rotom-heat`, `kyogre-primal`), cada una con su propio artwork
  oficial — se sigue el mismo patrón que ya usa `fetch_pokemon.js` para descargar la
  imagen (`sprites.other['official-artwork'].front_default`), solo que resuelto por
  nombre de forma en vez de por id numérico 1–1025.
- **`categoria`** (nuevo): `"regional"` | `"mega"` | `"primigenia"` | `"gigamax"` |
  `"alternativa"`. Sirve para filtrar/etiquetar en la Fase 2 (ej. mostrar un badge
  distinto por categoría) y para que la investigación de la Fase 1 quede auditable
  (se puede confirmar cuántas entradas hay por categoría).
- **`especieBase`** (nuevo): el `id` (siempre 1–1025, **nunca** el id de otra
  variante, aunque en el juego una forma derive de otra forma) de la especie a la que
  pertenece esta variante. Es la clave para todo lo que la Fase 2 necesite anclar a la
  especie base: ordenar junto a ella, mostrar "variante de Charizard #006" en la
  ficha, etc. Mantener el modelo siempre "plano" (variante → especie base directa)
  evita tener que resolver cadenas al mostrar/ordenar.

**Caso borde — una variante que calza en más de una categoría** (ej. un Pokémon con
forma regional que además tiene su propio Gigamax): se le asigna la `categoria` que
la investigación determine más relevante/distintiva para esa entrada puntual, y se
registra como una nota en el resultado de la investigación (no bloquea la carga, y se
puede reclasificar después sin romper nada — es un solo campo de una fila).

### `fetch_pokemon.js`

Se extiende (o se agrega un script hermano, ej. `fetch_variantes.js`, que se corre
después y agrega sus resultados al mismo `pokemon_db.json` sin pisar las primeras 1025
entradas) para:

1. Recorrer una lista maestra de variantes (nombre de forma en PokeAPI + categoría +
   `especieBase`) — ver "Proceso de investigación" abajo.
2. Por cada una, pedir `https://pokeapi.co/api/v2/pokemon/{nombre-de-forma}`, tomar
   `types`, `sprites.other['official-artwork'].front_default`, y resolver `gen` como
   el `gen` ya asignado a `especieBase` en las primeras 1025 entradas (no hay que
   recalcular cortes de generación para esto).
3. Asignar `id` secuencial empezando en 1026, en el mismo orden en que aparecen en la
   lista maestra.
4. Escribir el resultado combinado (1025 base + variantes) a `pokemon_db.json`.

## Proceso de investigación

La lista completa y literal de variantes (potencialmente 150–250+ entradas) **no se
enumera en este spec** — es trabajo de investigación/implementación, no una decisión
de diseño. Se compila durante la ejecución del plan de la Fase 1, con este criterio:

- **Formas regionales** (Alolan, Galarian, Hisuian, Paldean): lista cerrada y bien
  documentada por generación de juego — bajo riesgo de listar mal.
- **Mega Evolución** y **Regresión Primigenia**: lista cerrada, introducida en Gen 6
  (X/Y y ORAS) y nunca ampliada desde entonces — bajo riesgo.
- **Gigamax**: lista cerrada a Espada/Escudo + expansiones — bajo riesgo, pero PokeAPI
  puede no tener artwork completo para todas; se verifica caso por caso al implementar
  y se reporta cualquier hueco en vez de inventar un id que después no resuelve.
- **Formas alternativas con carta propia**: la más propensa a error/omisión, porque
  "¿tiene carta TCG propia?" no es un dato que exponga PokeAPI — se investiga con
  búsqueda web (Bulbapedia/Serebii/bases de datos de cartas) cruzando "el Pokémon tiene
  una forma alternativa en el videojuego" contra "esa forma tiene un print de carta
  TCG distinto al de la forma base". Se trata como una primera lista revisable, no
  definitiva — el usuario la revisa antes de darla por buena, y es fácil sumar/sacar
  entradas después sin rehacer nada (son filas independientes al final del archivo).

## Fuera de alcance (a propósito, queda para la Fase 2)

- El paso nuevo del wizard ("Nacional" vs. "Con variantes").
- Cómo se muestran/numeran las variantes en la UI (no tienen un "número regional"
  real propio — hay que decidir qué mostrar en su lugar).
- Cambios en `carpetasConfigValida`, rangos de carpetas, o el PDF de recortables para
  darles un slot propio.
- Cambios en `/api/estadisticas`, `/api/buscar` (más allá de que ya funcionan gratis
  por cómo se armó `name`), o en el cliente (`sb-carpetas`, galería, wizard).
- Teracristalización, y cualquier forma cosmética sin carta TCG propia.
- Migración de colecciones existentes — esta fase solo agrega filas nuevas a
  `pokemon_db.json`; no toca `inventario.json` en absoluto.

## Testing

No hay suite de tests en el proyecto. Verificación manual al implementar:

- `pokemon_db.json` sigue siendo un JSON válido, las primeras 1025 entradas
  **byte-a-byte idénticas** a como están hoy (ids, orden, campos — cero regresión en
  la Pokédex nacional existente).
- Cada entrada nueva tiene `id` único (sin colisión entre sí ni con 1–1025),
  `especieBase` apunta a un id real de 1–1025, `categoria` es uno de los 5 valores
  válidos, y `gen` coincide con el de su `especieBase`.
- Spot-check visual de un puñado de imágenes por categoría (abrir 2–3 URLs de
  `image` por categoría y confirmar que cargan y muestran la forma correcta, no la
  especie base ni una imagen rota).
- El servidor sigue arrancando normalmente con el `pokemon_db.json` ampliado
  (`idsValidos`, `pokemonPorGens()`, etc. no asumen en ningún lado que 1025 es el
  `id` más alto — confirmar leyendo ese código antes de dar la fase por cerrada, no
  asumirlo).
