# Modo "Todas seguidas" para configuración de carpetas

## Contexto

El wizard de configuración de carpetas (`abrirWizardCarpetas` en `public/app.js`) hoy solo
soporta un modo: **"Separadas por generación"**, donde cada carpeta contiene un conjunto
de generaciones completas (nunca partidas). La otra opción del wizard, **"Todas
seguidas"**, existe en la UI pero solo muestra un aviso ("Próximamente") — es un
placeholder sin implementar (`wizardModoSeguidas()` en `app.js:1515`).

"Todas seguidas" significa: la colección se reparte en un rango continuo de números de
Pokédex nacional, sin respetar cortes de generación. Ej.: si cada carpeta entra 250
espacios, la carpeta 1 es #1–250, la carpeta 2 es #251–500, etc., aunque eso parta una
generación al medio.

Confirmado con el usuario:
- El reparto es **automático** según la capacidad que se define por carpeta — no hay
  paso de ajuste manual (no existe el equivalente a "mover una generación a otra
  carpeta" cuando no hay generaciones como unidad).
- La opción "Portada por región con los 3 iniciales" del PDF de recortables no aplica
  en este modo (una carpeta puede cortar una región al medio) — se oculta esa opción y
  el PDF lista las cartas en orden de Pokédex sin portadas, cuando el modo activo es
  "seguidas".

Hoy **todo** el sistema de carpetas asume generaciones completas: validación del
servidor, `carpetaDe()` en el cliente, el generador de PDF, y el sidebar. Este spec
extiende el modelo de datos para soportar ambos modos.

## Modelo de datos

### `carpetas.json` (servidor)

Formato actual (plano, implícitamente modo "separadas"):
```json
[
  { "nombre": "Azul", "color": "#3b5bdb", "gens": [1, 2], "espacios": 245 },
  ...
]
```

Formato nuevo:
```json
{
  "modo": "separadas",
  "carpetas": [
    { "nombre": "Azul", "color": "#3b5bdb", "gens": [1, 2], "espacios": 245 },
    ...
  ]
}
```
o, en modo seguidas:
```json
{
  "modo": "seguidas",
  "carpetas": [
    { "nombre": "Carpeta 1", "color": "#3b5bdb", "desde": 1, "hasta": 260, "espacios": 270 },
    { "nombre": "Carpeta 2", "color": "#7c3aed", "desde": 261, "hasta": 520, "espacios": 270 },
    ...
  ]
}
```

**Migración**: al leer `carpetas.json`, si el JSON parseado es un Array (formato viejo),
se envuelve como `{ modo: 'separadas', carpetas: <array> }` antes de validar. Se
reescribe en el formato nuevo la próxima vez que se guarde. No hace falta migrar el
archivo en disco de antemano — se maneja al vuelo en la carga, igual que ya hace el
proyecto con la migración de `inventario.json` (mencionada en CLAUDE.md).

`CARPETAS_DEFAULT` (server.js, la constante con las 4 carpetas de fábrica) también pasa
a envolverse: `carpetasConfig` arranca como `{ modo: 'separadas', carpetas:
CARPETAS_DEFAULT }` en vez de `CARPETAS_DEFAULT` a secas, para que el estado inicial
tenga la misma forma que cualquier config guardada.

### Validación (`carpetasConfigValida`, server.js:106)

Se bifurca según `modo`:

- **`separadas`** (igual que hoy): cada carpeta tiene `gens: number[]` no vacío; entre
  todas las carpetas, las 9 generaciones aparecen exactamente una vez cada una;
  `espacios >= pokemonPorGens(c.gens)`.
- **`seguidas`** (nuevo): cada carpeta tiene `desde`/`hasta` enteros con
  `1 <= desde <= hasta <= 1025`; ordenadas por `desde`, la primera empieza en 1, la
  última termina en 1025, y `carpetas[i+1].desde === carpetas[i].hasta + 1` (contiguas,
  sin huecos ni superposición); `espacios >= (hasta - desde + 1)`.

`carpetasConfigValida(candidato)` pasa a recibir el objeto `{modo, carpetas}` completo
en vez del array a secas. Todos los call-sites (`GET/POST /api/carpetas-config`, carga
inicial) se actualizan para leer `carpetasConfig.modo` y `carpetasConfig.carpetas`.

## Servidor — cambios puntuales

### `/api/buscar` (server.js:287)

Se agregan params opcionales `desde`/`hasta` como alternativa a `gen`:
```js
app.get('/api/buscar', (req, res) => {
    const q     = req.query.q ? req.query.q.toUpperCase().trim() : '';
    const gen   = req.query.gen ? parseInt(req.query.gen) : null;
    const desde = req.query.desde ? parseInt(req.query.desde) : null;
    const hasta = req.query.hasta ? parseInt(req.query.hasta) : null;
    if (gen) return res.json(pokemonDB.filter(p => p.gen == gen));
    if (desde && hasta) return res.json(pokemonDB.filter(p => p.id >= desde && p.id <= hasta));
    if (!q) return res.json([]);
    ...
});
```
Esto es lo único que necesita el cliente para poder abrir la galería de una carpeta
"seguidas" (pedir el rango completo de una sola vez, en vez de reunir generaciones
sueltas).

### `/api/carpetas-config` GET/POST (server.js:343, 567)

- GET: devuelve `carpetasConfig` tal cual (ahora `{modo, carpetas}`).
- POST: el body pasa a ser `{modo, carpetas}` en vez de un array. Se valida con la
  versión nueva de `carpetasConfigValida`. Se guarda con `guardarCarpetasConfig()` sin
  cambios (ya escribe lo que sea que tenga `carpetasConfig`).

### PDF de recortables (server.js, sección que usa `opciones.gens`)

Ahora mismo `opciones.gens` es un `Set` de generaciones a incluir, construido a partir
de `carpetasConfig...flatMap(c => c.gens)` (server.js:512) para las carpetas
seleccionadas por nombre. Con modo `seguidas`, ese filtro pasa a ser por rango de id
(`p.id >= desde && p.id <= hasta` para cada carpeta seleccionada) en vez de por
conjunto de generaciones. La opción de "portada por región" (que agrupa por generación
y muestra los 3 iniciales) se ignora/deshabilita cuando `carpetasConfig.modo ===
'seguidas'` — el PDF en ese caso es una lista continua en orden de Pokédex, sin páginas
de portada.

## Cliente (`public/app.js`)

### Progreso — sin nuevo endpoint de stats

Para una carpeta "seguidas", el total es aritmética simple (`hasta - desde + 1`, los
IDs nacionales son contiguos sin huecos) y lo conseguido es iterar esos IDs contra
`tieneEnLS(id)` (ya disponible en `localStorage`, sin pedir nada al servidor). No se
toca `/api/estadisticas`.

### `carpetaDe(p)` (app.js:74)

```js
function carpetaDe(p) {
    if (modoCarpetasConfig === 'seguidas') {
        return carpetas.find(c => p.id >= c.desde && p.id <= c.hasta) || null;
    }
    return carpetas.find(c => c.gens.includes(p.gen)) || null;
}
```
`modoCarpetasConfig` se guarda como variable global al cargar la config
(`cargarCarpetasConfig()`), junto con el array `carpetas` que ya existe.

### Sidebar (`renderSidebar` y afines, ~app.js:380-440)

Hoy cada carpeta en el sidebar muestra una sublista expandible de generaciones
(`sb-gens`, con conteo por generación). En modo *seguidas* no hay esa subdivisión: se
muestra la carpeta como un ítem simple, con el rango como subtítulo (`#1–260`) en vez
de la lista de generaciones, y el conteo/progreso calculado como se describe arriba.

### Apertura de galería de una carpeta (~app.js:559-571)

Hoy: `genActualAbierta = { gen: carpeta.gens[0], ... }` y itera `carpeta.gens` para
juntar los pokémon de la carpeta desde `cachePokemon`. En modo *seguidas*: se pide
directo `fetchGenSegura`-equivalente pero con `/api/buscar?desde=X&hasta=Y` (una sola
llamada, sin cache por-generación ya que el rango no coincide con generaciones).

## Wizard (`public/index.html` + `public/app.js`)

- **Paso "modo"**: el botón "Todas seguidas" deja de llamar a `wizardModoSeguidas()`
  (que se borra) y pasa a navegar a `wizardMostrarPaso('formato')` igual que
  "Separadas por generación", pero guardando `wizardModo = 'seguidas'`.
- **Paso "formato"**: el checkbox "dejar espacios en blanco para que cada generación
  empiece en una página nueva" se oculta cuando `wizardModo === 'seguidas'` (no aplica:
  no hay generaciones que alinear a un borde de página).
- **Paso "capacidad"**: sin cambios de UI. El mensaje de validación de total
  (`wizardActualizarTotalCapacidad`) usa como "necesario" 1025 en vez de la suma de
  huellas de generación cuando el modo es *seguidas*.
- **Paso "ajuste"**: se **salta** en modo *seguidas* — `wizardCapacidadSiguiente()`
  calcula los rangos directo (carpeta 1 = `1..capacidad[0]`, carpeta 2 =
  `capacidad[0]+1..capacidad[0]+capacidad[1]`, etc., con la `hasta` de la última
  carpeta forzada a 1025 sin importar si su capacidad declarada se pasa o se queda
  corta) y va directo a `wizardMostrarPaso('nombres')`.
- **Paso "nombres"**: el subtítulo de cada fila muestra `#desde–hasta · N espacios` en
  vez de `Gens X-Y · N espacios`.
- **Guardar** (`wizardGuardar`): arma `{modo: wizardModo, carpetas: [...]}` con
  `desde/hasta` (seguidas) o `gens` (separadas) según corresponda, y lo manda tal cual
  al POST.

## Fuera de alcance (a propósito)

- Ajuste manual de dónde corta cada carpeta en modo seguidas (confirmado con el
  usuario: alcanza con el reparto automático).
- Portadas por región en el PDF de recortables en modo seguidas (se deshabilita esa
  opción específica, el resto del PDF funciona igual).
- Mezclar ambos modos en la misma configuración (una colección está en un modo u otro,
  no carpetas de distintos tipos a la vez).

## Testing

No hay suite de tests en el proyecto (`npm test` es un placeholder, según
CLAUDE.md). Verificación manual: recorrer el wizard completo en modo seguidas con
2-3 configuraciones de capacidad (exacta, con sobra, insuficiente), confirmar que
`carpetaDe`, el sidebar, la apertura de galería y el PDF de recortables reflejan bien
los rangos guardados, y que el modo "separadas" existente sigue funcionando sin
regresiones (incluida la migración del `carpetas.json` viejo).
