# Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar `pokemon_db.json` con entradas de variantes de Pokémon (formas regionales, Megaevolución, Regresión Primigenia, Gigamax, y formas alternativas con carta TCG propia), sin tocar ni reordenar las 1025 entradas base existentes.

**Architecture:** Un archivo nuevo `variantes_lista.json` (una fila por variante: nombre de forma en PokeAPI + categoría + especie base) se compila por investigación (una tarea por categoría), y un script nuevo `fetch_variantes.js` lo consume, pega contra PokeAPI por cada forma, y agrega las entradas resultantes al final de `pokemon_db.json`. `fetch_pokemon.js` no se toca.

**Tech Stack:** Node.js (`fetch` nativo, mismo patrón que `fetch_pokemon.js`), sin dependencias nuevas. Investigación vía búsqueda web (Bulbapedia/Serebii/bases de datos de cartas TCG) para las tareas de compilación de listas.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-26-variantes-pokedex-design.md` — cada tarea cita la sección que implementa.
- Las primeras 1025 entradas de `pokemon_db.json` quedan **byte-a-byte idénticas** — nunca se reordenan ni se les toca un campo.
- Ids de variantes: enteros secuenciales empezando en **1026**, sin decimales ni ids compuestos.
- `name`: nombre completo con calificador incluido, mismo criterio de mayúsculas que ya usa `fetch_pokemon.js` (`data.name.toUpperCase()`), ej. `"CHARIZARD MEGA X"`.
- `types`: el tipo de la variante (puede diferir del de la especie base).
- `gen`: **siempre igual al `gen` de su `especieBase`** en `pokemon_db.json` — nunca la generación en la que salió esa forma específica.
- `categoria`: exactamente uno de `"regional" | "mega" | "primigenia" | "gigamax" | "alternativa"`.
- `especieBase`: el `id` numérico (1–1025) de la especie base en `pokemon_db.json` — **buscar por `id`, no por nombre** (algunas entradas base no tienen un nombre "limpio": por ejemplo la entrada base de Zygarde en `pokemon_db.json` es `id:718, name:"ZYGARDE-50"`, no `"ZYGARDE"`, porque así es como PokeAPI nombra la variedad por default de esa especie). Nunca apunta a otra variante.
- Teracristalización y formas puramente cosméticas sin carta TCG propia: excluidas.
- No se toca `server.js`, `inventario.json`, el wizard, ni ningún archivo de `public/` en esta fase — es 100% datos de referencia.
- No hay suite de tests (`npm test` es un placeholder). Cada tarea se verifica con un script de validación de esquema (Python o Node, lo que sea más simple) contra el archivo que produce, más spot-checks manuales puntuales.
- **La investigación de "qué formas tienen carta TCG propia" (Tarea 4) es la de mayor riesgo de error/omisión.** Se trata como una primera pasada revisable: preferí una entrada de menos (que se puede agregar después sin romper nada) a una entrada inventada.

---

## Formato de `variantes_lista.json`

Un array plano en la raíz del repo (mismo nivel que `pokemon_db.json`), que crece con cada tarea de investigación:

```json
[
  { "nombrePokeAPI": "raichu-alola", "categoria": "regional", "especieBase": 26 },
  { "nombrePokeAPI": "charizard-mega-x", "categoria": "mega", "especieBase": 6 },
  { "nombrePokeAPI": "kyogre-primal", "categoria": "primigenia", "especieBase": 382 },
  { "nombrePokeAPI": "charizard-gmax", "categoria": "gigamax", "especieBase": 6 },
  { "nombrePokeAPI": "zygarde-complete", "categoria": "alternativa", "especieBase": 718 }
]
```

Verificado contra la API real (todas responden con `types` y artwork oficial válidos):

| `nombrePokeAPI` | id interno PokeAPI | `types` reales |
|---|---|---|
| `raichu-alola` | 10100 | electric, psychic |
| `charizard-mega-x` | 10034 | fire, dragon |
| `rotom-heat` | 10008 | electric, fire |
| `kyogre-primal` | 10077 | water |
| `charizard-gmax` | 10196 | fire, flying |
| `zygarde-complete` | 10120 | dragon, ground |

`nombrePokeAPI` es el slug que se usa contra `https://pokeapi.co/api/v2/pokemon/{nombrePokeAPI}` — **no** es el `id` interno de PokeAPI (esos números 100xx no se guardan en ningún lado, son solo un detalle de implementación de PokeAPI).

---

## Task 1: Investigar y compilar formas regionales

**Spec:** sección "Proceso de investigación" — formas regionales, "lista cerrada y bien documentada por generación de juego — bajo riesgo".

**Files:**
- Create (si no existe todavía) o Modify: `variantes_lista.json` (agregar las entradas de esta categoría al array)

**Interfaces:**
- Consumes: `pokemon_db.json` (para resolver el `id` de cada especie base por su National Dex number — buscar el Pokémon por su número real, no por nombre).
- Produces: entradas con `"categoria": "regional"` en `variantes_lista.json`, seguiendo el formato de arriba. Las Tareas 2-4 agregan sus propias entradas al mismo archivo — no lo pises, léelo primero y agregá al array existente (si el archivo no existe todavía, creálo).

- [ ] **Step 1: Investigar la lista completa de formas regionales**

Buscar (vía WebSearch/WebFetch, ej. Bulbapedia "Alolan Form", "Galarian Form", "Hisuian Form", "Paldean Form") la lista completa y oficial de Pokémon con forma:
- Alolan (Gen 7 — Espada/Escudo... no, Sol/Luna)
- Galarian (Gen 8 — Espada/Escudo)
- Hisuian (Leyendas Arceus)
- Paldean (Gen 9 — Escarlata/Púrpura, ej. los 3 tipos de Tauros de Paldea, Wooper de Paldea)

Para cada una, confirmar el slug de PokeAPI (patrón `{especie}-alola`, `{especie}-galar`, `{especie}-hisui`, `{especie}-paldea` — verificar con un `curl` puntual si el patrón no calza para algún caso, como los 3 Tauros de Paldea que usan sufijos distintos, ej. `tauros-paldea-combat-breed`).

- [ ] **Step 2: Resolver el `especieBase` de cada una**

Por cada Pokémon de la lista, buscar su entrada en `pokemon_db.json` por National Dex number (no por nombre) y tomar ese `id`.

```bash
python3 -c "
import json
db = json.load(open('pokemon_db.json'))
by_id = {p['id']: p['name'] for p in db}
print(by_id.get(26))  # confirmar que 26 es RAICHU antes de usarlo como especieBase
"
```

- [ ] **Step 3: Escribir las entradas a `variantes_lista.json`**

Si el archivo no existe, crealo con un array vacío `[]` primero. Agregar una entrada por cada forma regional encontrada, con `"categoria": "regional"`.

- [ ] **Step 4: Verificar el resultado**

```bash
python3 -c "
import json
lista = json.load(open('variantes_lista.json'))
db = json.load(open('pokemon_db.json'))
ids_validos = {p['id'] for p in db}
regionales = [e for e in lista if e['categoria'] == 'regional']
assert len(regionales) > 0, 'no se agregó ninguna entrada regional'
nombres = [e['nombrePokeAPI'] for e in regionales]
assert len(nombres) == len(set(nombres)), 'hay nombrePokeAPI duplicados'
for e in regionales:
    assert e['especieBase'] in ids_validos, f\"especieBase inválido: {e['especieBase']}\"
print(f'OK: {len(regionales)} formas regionales, todas con especieBase válido')
"
```

- [ ] **Step 5: Commit**

```bash
git add variantes_lista.json
git commit -m "Investigar y compilar formas regionales (Alolan/Galarian/Hisuian/Paldean)"
```

---

## Task 2: Investigar y compilar Megaevolución y Regresión Primigenia

**Spec:** sección "Proceso de investigación" — "lista cerrada, introducida en Gen 6 (X/Y y ORAS) y nunca ampliada desde entonces — bajo riesgo".

**Files:**
- Modify: `variantes_lista.json` (agregar las entradas de esta categoría al array existente — no pisar lo que dejó la Tarea 1)

**Interfaces:**
- Consumes: `pokemon_db.json` (mismo uso que Tarea 1), `variantes_lista.json` (léelo y agregá, no lo sobreescribas).
- Produces: entradas con `"categoria": "mega"` (incluye los casos con X/Y separados como Charizard y Mewtwo, dos entradas cada uno) y `"categoria": "primigenia"` (solo Kyogre y Groudon).

- [ ] **Step 1: Investigar la lista completa de Megaevoluciones**

Buscar la lista oficial de Pokémon con Megaevolución (introducidas en X/Y y Omega Rubí/Zafiro Alfa). Confirmar los dos casos con dos Megas distintas (Charizard X/Y, Mewtwo X/Y) — cada uno son 2 entradas separadas. Slug de PokeAPI: patrón `{especie}-mega` (o `{especie}-mega-x` / `{especie}-mega-y` para los dos casos dobles).

- [ ] **Step 2: Investigar Regresión Primigenia**

Solo 2 Pokémon: Kyogre y Groudon (introducidos en Omega Rubí/Zafiro Alfa). Slugs: `kyogre-primal`, `groudon-primal` (ya verificado el primero contra la API real, arriba).

- [ ] **Step 3: Resolver `especieBase` para cada entrada** (mismo método que Tarea 1, Step 2)

- [ ] **Step 4: Agregar las entradas a `variantes_lista.json`** (leer el archivo actual, agregar al array, no pisar lo de la Tarea 1)

- [ ] **Step 5: Verificar**

```bash
python3 -c "
import json
lista = json.load(open('variantes_lista.json'))
db = json.load(open('pokemon_db.json'))
ids_validos = {p['id'] for p in db}
megas = [e for e in lista if e['categoria'] in ('mega','primigenia')]
assert len(megas) > 0
nombres_totales = [e['nombrePokeAPI'] for e in lista]
assert len(nombres_totales) == len(set(nombres_totales)), 'hay nombrePokeAPI duplicados en todo el archivo'
for e in megas:
    assert e['especieBase'] in ids_validos
primigenias = [e for e in lista if e['categoria'] == 'primigenia']
assert len(primigenias) == 2, f'debería haber exactamente 2 (Kyogre y Groudon), hay {len(primigenias)}'
print(f'OK: {len(megas)} entradas mega/primigenia, sin duplicados en todo el archivo')
"
```

- [ ] **Step 6: Commit**

```bash
git add variantes_lista.json
git commit -m "Investigar y compilar Megaevolución y Regresión Primigenia"
```

---

## Task 3: Investigar y compilar Gigamax

**Spec:** sección "Proceso de investigación" — "lista cerrada a Espada/Escudo + expansiones — bajo riesgo, pero PokeAPI puede no tener artwork completo para todas; se verifica caso por caso".

**Files:**
- Modify: `variantes_lista.json` (agregar, no pisar)

**Interfaces:**
- Consumes: `pokemon_db.json`, `variantes_lista.json` existente.
- Produces: entradas con `"categoria": "gigamax"`.

- [ ] **Step 1: Investigar la lista completa de formas Gigamax**

Buscar la lista oficial de Pokémon con forma Gigamax (Espada/Escudo base + expansiones Isla de la Armadura/Torre del Mar). Slug de PokeAPI: patrón `{especie}-gmax` (ya verificado `charizard-gmax` arriba).

- [ ] **Step 2: Para cada una, confirmar que PokeAPI realmente tiene los datos antes de agregarla a la lista**

```bash
curl -s "https://pokeapi.co/api/v2/pokemon/{slug}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
tiene_tipos = bool(d.get('types'))
tiene_arte = bool(d.get('sprites',{}).get('other',{}).get('official-artwork',{}).get('front_default'))
print('OK' if tiene_tipos and tiene_arte else 'FALTA DATO')
"
```

Si algún Gigamax conocido no tiene datos completos en PokeAPI, **no lo agregues a la lista** — anotalo en el reporte de esta tarea en vez de forzar una entrada rota (una imagen faltante en 150+ entradas rompe silenciosamente esa carta para siempre, es peor que directamente no tenerla todavía).

- [ ] **Step 3: Resolver `especieBase` y agregar a `variantes_lista.json`** (mismo método que tareas anteriores)

- [ ] **Step 4: Verificar**

```bash
python3 -c "
import json
lista = json.load(open('variantes_lista.json'))
db = json.load(open('pokemon_db.json'))
ids_validos = {p['id'] for p in db}
gmax = [e for e in lista if e['categoria'] == 'gigamax']
assert len(gmax) > 0
for e in gmax:
    assert e['especieBase'] in ids_validos
nombres_totales = [e['nombrePokeAPI'] for e in lista]
assert len(nombres_totales) == len(set(nombres_totales))
print(f'OK: {len(gmax)} entradas gigamax')
"
```

- [ ] **Step 5: Commit**

```bash
git add variantes_lista.json
git commit -m "Investigar y compilar formas Gigamax"
```

---

## Task 4: Investigar y compilar formas alternativas con carta TCG propia

**Spec:** sección "Proceso de investigación" — "la más propensa a error/omisión... se investiga con búsqueda web cruzando 'tiene forma alternativa en el videojuego' contra 'esa forma tiene un print de carta TCG distinto'... primera lista revisable, no definitiva".

**Files:**
- Modify: `variantes_lista.json` (agregar, no pisar)

**Interfaces:**
- Consumes: `pokemon_db.json`, `variantes_lista.json` existente.
- Produces: entradas con `"categoria": "alternativa"`.

- [ ] **Step 1: Investigar candidatos de formas alternativas**

Punto de partida (ejemplos ya confirmados por el usuario, no la lista completa): Deoxys (Ataque/Defensa/Velocidad — Normal ya está en las 1025 base), Giratina (Origen), Rotom (los 5 aparatos: Calor/Lavado/Hielo/Ventilador/Corte), Zygarde (10% y Completo — 50% ya está en las 1025 base como `id:718`), Palafín (Héroe).

A partir de ahí, buscar (Bulbapedia "list of Pokémon forms", Serebii, y una base de datos de cartas TCG como pokemontcg.io o Bulbapedia's TCG pages) otros casos conocidos de forma alternativa **con print de carta TCG propio y distinto al de la forma base** — ej. Kyurem Negro/Blanco, Necrozma Ala del Alba/Melena del Ocaso, Darmanitan Zen (Galar y no-Galar), Aegislash Espada, Hoopa Liberado, Meloetta Pirueta, Wormadam (sus 3 mantos), Shaymin Cielo, Zacian/Zamazenta Coronados, Calyrex Jinete de Hielo/Sombra, Urshifu Golpe Único/Golpe Rápido — **para cada candidato, confirmar que existe una carta TCG real con ese nombre/forma antes de agregarlo** (no alcanza con que la forma exista en el videojuego).

- [ ] **Step 2: Para cada candidato confirmado, resolver el slug de PokeAPI y verificar que responde con datos completos** (mismo chequeo que Tarea 3, Step 2)

- [ ] **Step 3: Resolver `especieBase` y agregar a `variantes_lista.json`**

- [ ] **Step 4: Verificar**

```bash
python3 -c "
import json
lista = json.load(open('variantes_lista.json'))
db = json.load(open('pokemon_db.json'))
ids_validos = {p['id'] for p in db}
alt = [e for e in lista if e['categoria'] == 'alternativa']
assert len(alt) > 0
for e in alt:
    assert e['especieBase'] in ids_validos
nombres_totales = [e['nombrePokeAPI'] for e in lista]
assert len(nombres_totales) == len(set(nombres_totales))
print(f'OK: {len(alt)} entradas alternativas')
"
```

- [ ] **Step 5: Reportar la lista completa de candidatos considerados y descartados**

En el reporte de esta tarea, incluir no solo lo que se agregó sino los candidatos que se investigaron y se **descartaron** por no tener carta TCG propia confirmada — para que el usuario pueda revisar esas decisiones puntuales en la revisión de esta tarea.

- [ ] **Step 6: Commit**

```bash
git add variantes_lista.json
git commit -m "Investigar y compilar formas alternativas con carta TCG propia"
```

---

## Task 5: Escribir `fetch_variantes.js`

**Spec:** sección "Modelo de datos" → "`fetch_pokemon.js`".

**Files:**
- Create: `fetch_variantes.js`

**Interfaces:**
- Consumes: `variantes_lista.json` (formato definido arriba, ya completo tras las Tareas 1-4), `pokemon_db.json` (para resolver `gen` de cada `especieBase`).
- Produces: reescribe `pokemon_db.json` con las 1025 entradas base sin tocar + las entradas nuevas de variantes al final, ids desde 1026.

- [ ] **Step 1: Escribir el script**

```js
const fs = require('fs');

async function fetchVariantes() {
    const base = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
    const baseIds = new Set(base.map(p => p.id));
    if (base.length !== 1025) {
        throw new Error(`pokemon_db.json tiene ${base.length} entradas, se esperaban 1025 — abortando para no pisar datos inesperados.`);
    }
    const genPorId = new Map(base.map(p => [p.id, p.gen]));
    const lista = JSON.parse(fs.readFileSync('variantes_lista.json', 'utf8'));

    const categoriasValidas = new Set(['regional', 'mega', 'primigenia', 'gigamax', 'alternativa']);
    const variantes = [];
    let siguienteId = 1026;

    console.log(`🚀 Procesando ${lista.length} variantes...`);

    for (const entrada of lista) {
        if (!categoriasValidas.has(entrada.categoria)) {
            throw new Error(`categoria inválida: ${entrada.categoria} (${entrada.nombrePokeAPI})`);
        }
        if (!genPorId.has(entrada.especieBase)) {
            throw new Error(`especieBase inválido: ${entrada.especieBase} (${entrada.nombrePokeAPI})`);
        }
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${entrada.nombrePokeAPI}`);
            if (!response.ok) {
                console.error(`❌ ${entrada.nombrePokeAPI}: HTTP ${response.status}, se omite`);
                continue;
            }
            const data = await response.json();
            const imagen = data.sprites.other['official-artwork'].front_default;
            if (!imagen) {
                console.error(`❌ ${entrada.nombrePokeAPI}: sin artwork oficial, se omite`);
                continue;
            }
            variantes.push({
                id: siguienteId++,
                name: data.name.toUpperCase().replace(/-/g, ' '),
                types: data.types.map(t => t.type.name),
                gen: genPorId.get(entrada.especieBase),
                image: imagen,
                categoria: entrada.categoria,
                especieBase: entrada.especieBase
            });
        } catch (error) {
            console.error(`❌ Error en ${entrada.nombrePokeAPI}:`, error.message);
        }
    }

    const idsNuevos = variantes.map(v => v.id);
    if (new Set(idsNuevos).size !== idsNuevos.length) {
        throw new Error('ids duplicados generados — no se escribe el archivo');
    }

    fs.writeFileSync('pokemon_db.json', JSON.stringify([...base, ...variantes], null, 2));
    console.log(`✅ ${variantes.length} variantes agregadas (ids ${variantes[0]?.id}–${variantes[variantes.length - 1]?.id}). Total: ${base.length + variantes.length}.`);
}

fetchVariantes();
```

Nota: `name` reemplaza los guiones del slug de PokeAPI (`charizard-mega-x` → tras `.toUpperCase()` → `CHARIZARD-MEGA-X`) por espacios, para que quede `"CHARIZARD MEGA X"` como especifica el spec.

- [ ] **Step 2: Probar contra una `variantes_lista.json` de juguete, sin tocar los datos reales**

```bash
cp pokemon_db.json /tmp/pokemon_db.backup.json
cp variantes_lista.json /tmp/variantes_lista.backup.json
echo '[{"nombrePokeAPI":"charizard-mega-x","categoria":"mega","especieBase":6}]' > variantes_lista.json
node fetch_variantes.js
python3 -c "
import json
db = json.load(open('pokemon_db.json'))
assert len(db) == 1026, f'se esperaban 1026, hay {len(db)}'
v = db[-1]
assert v['id'] == 1026
assert v['categoria'] == 'mega'
assert v['especieBase'] == 6
assert v['gen'] == 1  # Charizard es gen 1
assert v['types'] == ['fire', 'dragon']
print('OK: prueba de humo con 1 entrada pasó')
"
# restaurar antes de correr con la lista real
cp /tmp/pokemon_db.backup.json pokemon_db.json
cp /tmp/variantes_lista.backup.json variantes_lista.json
```

- [ ] **Step 3: Commit**

```bash
git add fetch_variantes.js
git commit -m "Agregar fetch_variantes.js para poblar pokemon_db.json con variantes"
```

---

## Task 6: Correr el fetch completo y verificar `pokemon_db.json` final

**Spec:** sección "Testing".

**Files:**
- Modify: `pokemon_db.json` (resultado final de esta fase)

**Interfaces:**
- Consumes: `variantes_lista.json` completo (Tareas 1-4), `fetch_variantes.js` (Tarea 5).
- Produces: `pokemon_db.json` final con 1025 + N entradas.

- [ ] **Step 1: Respaldo antes de correr**

```bash
cp pokemon_db.json pokemon_db.backup-pre-variantes.json
```

- [ ] **Step 2: Correr el fetch real**

```bash
node fetch_variantes.js
```

- [ ] **Step 3: Verificar que las 1025 entradas base no cambiaron**

```bash
python3 -c "
import json
antes = json.load(open('pokemon_db.backup-pre-variantes.json'))
despues = json.load(open('pokemon_db.json'))
primeras_1025 = despues[:1025]
assert primeras_1025 == antes, 'las primeras 1025 entradas cambiaron — esto NO debería pasar'
print(f'OK: las 1025 entradas base son idénticas. Total ahora: {len(despues)}')
"
```

- [ ] **Step 4: Verificar el esquema completo de las entradas nuevas**

```bash
python3 -c "
import json
db = json.load(open('pokemon_db.json'))
base = db[:1025]
variantes = db[1025:]
ids_base = {p['id'] for p in base}
categorias_validas = {'regional','mega','primigenia','gigamax','alternativa'}

ids_variantes = [v['id'] for v in variantes]
assert ids_variantes == sorted(ids_variantes), 'los ids de variantes no están en orden secuencial'
assert ids_variantes[0] == 1026, f'el primer id de variante debería ser 1026, es {ids_variantes[0]}'
assert len(set(ids_variantes)) == len(ids_variantes), 'hay ids de variante duplicados'
assert not (set(ids_variantes) & ids_base), 'algún id de variante choca con un id base'

for v in variantes:
    assert v['categoria'] in categorias_validas, f\"categoria inválida: {v['categoria']}\"
    assert v['especieBase'] in ids_base, f\"especieBase inválido: {v['especieBase']} (variante {v['id']})\"
    base_entry = next(p for p in base if p['id'] == v['especieBase'])
    assert v['gen'] == base_entry['gen'], f\"gen no coincide con la especie base en variante {v['id']}\"
    assert isinstance(v['types'], list) and len(v['types']) > 0
    assert v['image'].startswith('http')

por_categoria = {}
for v in variantes:
    por_categoria[v['categoria']] = por_categoria.get(v['categoria'], 0) + 1
print('Entradas por categoría:', por_categoria)
print(f'OK: {len(variantes)} variantes, todas con esquema válido')
"
```

- [ ] **Step 5: Spot-check visual de imágenes (2-3 por categoría)**

Tomar 2-3 URLs de `image` de variantes de cada categoría del resultado del Step 4 y abrirlas (o usar la herramienta de lectura de imágenes) para confirmar que muestran la forma correcta (no la especie base, no una imagen genérica/rota).

- [ ] **Step 6: Confirmar que el servidor sigue arrancando bien con la base ampliada**

```bash
node -e "
const pokemonDB = require('./pokemon_db.json');
const idsValidos = new Set(pokemonDB.map(p => p.id));
console.log('idsValidos.size:', idsValidos.size, '(debería ser 1025 + N variantes)');
console.log('id más alto:', Math.max(...idsValidos));
"
systemctl restart pokedex.service
sleep 1
systemctl is-active pokedex.service
curl -s http://localhost:3000/api/buscar?gen=1 -o /dev/null -w "%{http_code}\n"
```

- [ ] **Step 7: Borrar el respaldo temporal y commitear**

```bash
rm pokemon_db.backup-pre-variantes.json
git add pokemon_db.json
git commit -m "Poblar pokemon_db.json con las variantes investigadas (Fase 1 completa)"
```

---

## Addendum — hallazgos de la revisión final + investigación propia del usuario

Tras completar las Tareas 1-6 y pasar la revisión final de todo el branch, surgieron 5
hallazgos que se resuelven con 5 tareas más antes de mergear/deployar:

- La revisión final encontró que `TOXTRICITY AMPED GMAX` y `TOXTRICITY LOW KEY GMAX`
  tienen **arte idéntico** (mismo hash de imagen) — es la misma carta física
  ("Toxtricity VMAX", una sola en el TCG real), duplicada como si fueran dos.
- La revisión final encontró 6 formas más que sí superan el criterio de "nombre de
  carta distinto" de la Tarea 4 y quedaron afuera por error: Dialga Origen, Palkia
  Origen, Ursaluna Bloodmoon, y las 3 máscaras de Ogerpon (ya verificadas contra
  PokeAPI, ver tabla abajo).
- El usuario, en su propia investigación en paralelo, señaló otros candidatos no
  investigados todavía: Silvally, Castform, Cherrim, Enamorus (forma Tótem), y
  Terapagos (Terastal/Stellar) — este último es un caso especial: son formas fijas de
  **una sola especie**, no la Teracristalización general (que sigue fuera de alcance).
- `fetch_variantes.js` no es re-ejecutable de forma segura (aborta si `pokemon_db.json`
  no tiene exactamente 1025 entradas) y no falla ruidosamente si PokeAPI devuelve un
  error transitorio a mitad de la corrida (sigue y corre los ids siguientes en
  silencio).
- Falta documentar en `CLAUDE.md` que existe `fetch_variantes.js`/`variantes_lista.json`,
  y el orden correcto de regeneración — hoy correr solo `fetch_pokemon.js` borraría las
  159 variantes sin aviso (sobreescribe todo el archivo).

Ids de PokeAPI de las 6 entradas nuevas, ya verificados contra la API real:

| `nombrePokeAPI` | `especieBase` | `types` reales |
|---|---|---|
| `dialga-origin` | 483 (DIALGA) | steel, dragon |
| `palkia-origin` | 484 (PALKIA) | water, dragon |
| `ursaluna-bloodmoon` | 901 (URSALUNA) | ground, normal |
| `ogerpon-hearthflame-mask` | 1017 (OGERPON) | grass, fire |
| `ogerpon-wellspring-mask` | 1017 (OGERPON) | grass, water |
| `ogerpon-cornerstone-mask` | 1017 (OGERPON) | grass, rock |

### Task 7: Arreglar `fetch_variantes.js` (re-ejecutable + falla ante datos incompletos)

**Files:**
- Modify: `fetch_variantes.js`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: mismo contrato de antes, pero ahora seguro de re-correr sin restaurar
  `pokemon_db.json` a mano primero.

- [ ] **Step 1: Hacer la detección de la base idempotente**

Antes:
```js
const base = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
const baseIds = new Set(base.map(p => p.id));
if (base.length !== 1025) {
    throw new Error(`pokemon_db.json tiene ${base.length} entradas, se esperaban 1025 — abortando para no pisar datos inesperados.`);
}
```

Después:
```js
const dbActual = JSON.parse(fs.readFileSync('pokemon_db.json', 'utf8'));
const base = dbActual.filter(p => p.id <= 1025);
if (base.length !== 1025) {
    throw new Error(`Las entradas con id <= 1025 en pokemon_db.json son ${base.length}, se esperaban 1025 — abortando para no pisar datos inesperados.`);
}
```

Esto hace que el script siempre regenere las variantes desde cero a partir de la base
real (ids 1-1025), sin importar si `pokemon_db.json` ya tenía una corrida anterior de
variantes — no hace falta restaurar nada a mano antes de re-correrlo. (`baseIds` ya no
se usa en ningún lado del script — se elimina esa línea, era código muerto.)

- [ ] **Step 2: Fallar en vez de escribir un resultado parcial si algo se saltó**

Antes (dentro del `for` loop, en el `catch`/chequeos de `response.ok`/`imagen`):
```js
if (!response.ok) {
    console.error(`❌ ${entrada.nombrePokeAPI}: HTTP ${response.status}, se omite`);
    continue;
}
```
(y el bloque análogo para `!imagen`, y el `catch` de error de red)

Después: agregar un array `const saltados = [];` antes del loop, y en cada uno de los 3
puntos donde hoy se hace `continue` (HTTP no ok, sin imagen, error de red), agregar
`saltados.push(entrada.nombrePokeAPI);` antes del `continue`. Después del loop, antes
de escribir el archivo:

```js
if (saltados.length > 0) {
    throw new Error(`Se omitieron ${saltados.length} entradas por datos incompletos/error de red: ${saltados.join(', ')} — no se escribe pokemon_db.json. Investigar y reintentar.`);
}
```

Así una falla transitoria de PokeAPI nunca corre los ids silenciosamente ni deja un
archivo a medias committeado — el operador tiene que ver el error y decidir (reintentar
la corrida completa, ya que el Step 1 la hace segura de repetir).

- [ ] **Step 3: Smoke test de que sigue funcionando igual que antes**

Mismo test de humo que la Tarea 5 (backup, lista de juguete de 1 entrada, verificar,
restaurar) — confirmar que sigue pasando con el script modificado.

- [ ] **Step 4: Commit**

```bash
git add fetch_variantes.js
git commit -m "Fix: fetch_variantes.js re-ejecutable y falla ante datos incompletos en vez de correr ids en silencio"
```

---

### Task 8: Sacar el duplicado de Toxtricity y agregar las 6 entradas que faltaban

**Files:**
- Modify: `variantes_lista.json`

**Interfaces:**
- Consumes: `pokemon_db.json` (para confirmar los `especieBase` 483/484/901/1017).
- Produces: `variantes_lista.json` con 1 entrada menos (Toxtricity Low Key Gmax) y 6 más
  (tabla de arriba), neto +5 respecto a las 159 actuales.

- [ ] **Step 1: Sacar `toxtricity-low-key-gmax`**

Es la carta idéntica a `toxtricity-amped-gmax` (mismo arte, una sola carta real en el
TCG) — borrar esa entrada del array.

- [ ] **Step 2: Agregar las 6 entradas de la tabla de arriba**, todas con
  `"categoria": "alternativa"`.

- [ ] **Step 3: Verificar**

```bash
python3 -c "
import json
lista = json.load(open('variantes_lista.json'))
db = json.load(open('pokemon_db.json'))
ids_validos = {p['id'] for p in db if p['id'] <= 1025}
nombres = [e['nombrePokeAPI'] for e in lista]
assert len(nombres) == len(set(nombres)), 'hay nombrePokeAPI duplicados'
assert 'toxtricity-low-key-gmax' not in nombres, 'el duplicado de Toxtricity sigue ahí'
for slug in ['dialga-origin','palkia-origin','ursaluna-bloodmoon','ogerpon-hearthflame-mask','ogerpon-wellspring-mask','ogerpon-cornerstone-mask']:
    assert slug in nombres, f'falta {slug}'
for e in lista:
    assert e['especieBase'] in ids_validos
print(f'OK: {len(lista)} entradas (era 159, ahora 159-1+6=164)')
"
```

- [ ] **Step 4: Commit**

```bash
git add variantes_lista.json
git commit -m "Sacar duplicado de Toxtricity Gmax y agregar Dialga/Palkia Origen, Ursaluna Bloodmoon, y las 3 máscaras de Ogerpon"
```

---

### Task 9: Investigar candidatos nuevos (Silvally, Castform, Cherrim, Enamorus, Terapagos)

**Spec:** mismo criterio de la Tarea 4 (sección "Proceso de investigación" del spec) —
"nombre de carta impreso distinto", no solo arte distinto.

**Files:**
- Modify: `variantes_lista.json` (agregar, no pisar las 164 entradas ya existentes tras
  la Tarea 8)

**Interfaces:**
- Consumes: `pokemon_db.json`, `variantes_lista.json` existente.
- Produces: entradas nuevas con `"categoria": "alternativa"` para lo que se confirme.

- [ ] **Step 1: Investigar cada candidato con el mismo criterio estricto de la Tarea 4**

Para cada uno, buscar en `api.pokemontcg.io/v2/cards?q=name:X` (o WebSearch/Bulbapedia
si la API está caída) si existe una carta cuyo **nombre impreso** distinga la forma:

- **Silvally** (17 memorias/tipos): ¿alguna carta dice "Silvally Fire" o similar, o son
  todas "Silvally" genéricas?
- **Ogerpon** (ya se agregaron sus 3 máscaras en la Tarea 8 vía el hallazgo de la
  revisión — no dupliques esta investigación, solo confirmá que esas 3 ya están).
- **Castform** (3 formas climáticas): ¿"Sunny Castform"/similar, o genérico?
- **Cherrim** (forma soleada): ¿"Sunshine Cherrim" o genérico?
- **Enamorus** (forma Tótem/Therian): mismo patrón que Landorus/Thundurus/Tornadus
  (ya descartados en la Tarea 4 por no tener nombre distinto) — confirmar si Enamorus
  corre la misma suerte o es la excepción.
- **Terapagos** (Terastal/Stellar): son formas fijas de una sola especie (no la
  Teracristalización general de cualquier Pokémon, que sigue excluida) — ¿tienen
  nombre de carta propio?

Para cada uno que SÍ confirme carta con nombre distinto, resolver el slug de PokeAPI y
verificar con `curl` que devuelve `types` y artwork.

- [ ] **Step 2: Resolver `especieBase` para cada confirmado** (mismo método que
  siempre: por id de Pokédex nacional en `pokemon_db.json`, no por nombre)

- [ ] **Step 3: Agregar los confirmados a `variantes_lista.json`**

- [ ] **Step 4: Reportar también lo descartado, con la razón** (mismo estándar que la
  Tarea 4 — no es opcional)

- [ ] **Step 5: Verificar**

```bash
python3 -c "
import json
lista = json.load(open('variantes_lista.json'))
db = json.load(open('pokemon_db.json'))
ids_validos = {p['id'] for p in db if p['id'] <= 1025}
nombres = [e['nombrePokeAPI'] for e in lista]
assert len(nombres) == len(set(nombres)), 'hay nombrePokeAPI duplicados'
for e in lista:
    assert e['especieBase'] in ids_validos
print(f'OK: {len(lista)} entradas totales en variantes_lista.json')
"
```

- [ ] **Step 6: Commit**

```bash
git add variantes_lista.json
git commit -m "Investigar candidatos adicionales de formas alternativas (Silvally, Castform, Cherrim, Enamorus, Terapagos)"
```

---

### Task 10: Documentar en CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (sección "Data files (not code, but load-bearing)")
- Create: `docs/variantes-criterio-investigacion.md` — el criterio de "nombre de carta
  distinto" y la lista de candidatos investigados y descartados (hoy solo vive en
  reportes de subagentes que están en `.superpowers/`, gitignoreado — se pierde en
  cuanto se borra el workspace de esta ejecución).

- [ ] **Step 1: Agregar entradas nuevas a la sección "Data files" de `CLAUDE.md`**

Después de la línea de `pokemon_db.json`:
```markdown
- `variantes_lista.json` — lista de investigación (no runtime) de variantes de Pokémon
  (formas regionales, Mega, Gigamax, formas alternativas con carta TCG propia) por
  nombre de forma en PokeAPI + categoría + especie base. La consume `fetch_variantes.js`.
- `fetch_variantes.js` — extiende `pokemon_db.json` (que `fetch_pokemon.js` deja en
  1025 entradas) con las variantes de `variantes_lista.json`. **Orden de regeneración:
  si corrés `fetch_pokemon.js`, corré `fetch_variantes.js` siempre después** —
  `fetch_pokemon.js` sobreescribe todo el archivo con solo las 1025 entradas base y
  borra cualquier variante existente sin avisar.
```

- [ ] **Step 2: Crear `docs/variantes-criterio-investigacion.md`** con el criterio
  usado ("¿existe una carta impresa cuyo nombre oficial distinga esta forma de la
  especie base, no solo el arte?") y la lista de candidatos descartados hasta ahora
  (Giratina Origen, Zygarde 10%/Completo, Palafín Héroe, Shaymin Cielo, Landorus/
  Thundurus/Tornadus Tótem, Arceus, más lo que decida la Tarea 9) con su razón — para
  que una investigación futura no repita el trabajo.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/variantes-criterio-investigacion.md
git commit -m "Documentar variantes_lista.json/fetch_variantes.js y el criterio de investigación"
```

---

### Task 11: Regenerar `pokemon_db.json` completo y verificar (con chequeo de imágenes duplicadas)

**Files:**
- Modify: `pokemon_db.json`

**Interfaces:**
- Consumes: `variantes_lista.json` final (Tareas 8-9), `fetch_variantes.js` arreglado
  (Tarea 7).
- Produces: `pokemon_db.json` final de la Fase 1.

- [ ] **Step 1: Backup y correr el fetch completo**

```bash
cp pokemon_db.json pokemon_db.backup-pre-addendum.json
node fetch_variantes.js
```

Gracias a la Tarea 7, esto regenera las variantes desde cero gracias a la base
(ids ≤ 1025) — no hace falta restaurar nada a mano antes de correrlo.

- [ ] **Step 2: Verificar contra las mismas 1025 base + esquema completo** (mismo
  script que la Tarea 6, Steps 3-4)

- [ ] **Step 3: Chequeo de imágenes duplicadas (nuevo — esto es justo lo que se le
  escapó a la Tarea 6 con Toxtricity)**

```bash
python3 -c "
import json, urllib.request, hashlib
db = json.load(open('pokemon_db.json'))
variantes = [p for p in db if p['id'] > 1025]
hashes = {}
dupes = []
for v in variantes:
    try:
        data = urllib.request.urlopen(v['image'], timeout=10).read()
        h = hashlib.md5(data).hexdigest()
        if h in hashes:
            dupes.append((hashes[h], v['id'], v['name']))
        else:
            hashes[h] = (v['id'], v['name'])
    except Exception as e:
        print(f'no se pudo bajar {v[\"id\"]} ({v[\"name\"]}): {e}')
if dupes:
    print('⚠️  IMÁGENES DUPLICADAS ENCONTRADAS:')
    for a, id2, name2 in dupes:
        print(f'  {a} == ({id2}, {name2})')
else:
    print(f'OK: {len(variantes)} imágenes de variantes, ninguna duplicada')
"
```

Si aparece algún duplicado nuevo, repetir el criterio de la Tarea 8 (sacar la entrada
redundante de `variantes_lista.json`, volver a este Step).

- [ ] **Step 4: Confirmar el total esperado y borrar el backup**

```bash
python3 -c "
import json
db = json.load(open('pokemon_db.json'))
print('total:', len(db))
"
rm pokemon_db.backup-pre-addendum.json
```

- [ ] **Step 5: Commit**

```bash
git add pokemon_db.json
git commit -m "Regenerar pokemon_db.json con el duplicado de Toxtricity sacado y las entradas nuevas (addendum a la Fase 1)"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** las 5 categorías (regional, mega, primigenia, gigamax, alternativa) tienen tarea propia de investigación (1-4, con mega+primigenia combinadas por ser ambas Gen 6/bajo riesgo). El esquema de datos, el script de fetch, y la verificación final tienen sus propias tareas (5, 6).
- **Placeholders:** el contenido de `variantes_lista.json` no se puede pre-escribir (es investigación, no una decisión de diseño) — cada tarea de investigación tiene en cambio un método de búsqueda concreto, un formato de salida exacto, y un script de verificación ejecutable, que es el estándar aplicable a una tarea de investigación.
- **Consistencia de nombres:** `nombrePokeAPI`/`categoria`/`especieBase` se usan idénticos en las 6 tareas. El comando de verificación de cada tarea de investigación (2-4) es el mismo patrón, ampliado.
- **Riesgo cubierto explícitamente:** el gotcha de Zygarde (especie base sin nombre "limpio") está en Global Constraints; el riesgo de Gigamax con datos incompletos en PokeAPI tiene su propio Step de verificación previa (Tarea 3, Step 2) antes de agregar cualquier entrada; el riesgo de inventar formas alternativas sin carta real tiene su propio Step de reporte de descartes (Tarea 4, Step 5) para que el usuario lo revise.
- **Verificado contra la API real antes de escribir el plan:** los 5 ejemplos de la tabla de formato (`raichu-alola`, `charizard-mega-x`, `rotom-heat`, `kyogre-primal`, `charizard-gmax`, `zygarde-complete`) fueron probados con `curl` real contra PokeAPI, no son hipotéticos.

### Self-Review del addendum (Tareas 7-11)

- **Cobertura de los hallazgos de la revisión final:** el duplicado de Toxtricity (Tarea 8), las 6 entradas faltantes (Tarea 8), los 2 bugs de `fetch_variantes.js` (Tarea 7), y el gap de documentación (Tarea 10) tienen tarea propia cada uno. El chequeo de imágenes duplicadas que hubiera atrapado el problema de Toxtricity desde el principio se agrega permanentemente al proceso de verificación (Tarea 11, Step 3), no es un parche de una sola vez.
- **Cobertura de la investigación propia del usuario:** Silvally/Castform/Cherrim/Enamorus/Terapagos tienen su propia tarea de investigación (9), con el mismo criterio y estándar de reporte de descartes que la Tarea 4. Ogerpon no se duplica (ya viene de la Tarea 8, vía el hallazgo de la revisión).
- **Verificado antes de escribir:** los 6 slugs de la tabla del addendum (`dialga-origin`, `palkia-origin`, `ursaluna-bloodmoon`, y las 3 máscaras de `ogerpon-*-mask`) fueron probados con `curl` real, y sus `especieBase` (483/484/901/1017) confirmados contra `pokemon_db.json` real, antes de escribir estas tareas.
- **No deploy todavía:** el addendum no agrega ninguna tarea de "avisar que no hay que deployar" porque eso no es una tarea de código — se lo comunica directamente al usuario (ya se hizo) y queda como decisión suya cuándo integrar esto con la Fase 2.
