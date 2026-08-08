# Documentación técnica — Pokédex TCG

Este documento complementa a `CLAUDE.md` (guía operativa para trabajar en el
repo) con una explicación más extensa de **cómo está construida la app**,
**por qué está construida así**, y **cómo llegó a su forma actual**. Está
pensado para alguien que nunca vio el código y quiere entenderlo de punta a
punta, no solo para retomar una tarea puntual.

## Índice

1. [Qué es y qué no es](#1-qué-es-y-qué-no-es)
2. [Arquitectura general](#2-arquitectura-general)
3. [Backend — `server.js`](#3-backend--serverjs)
4. [Frontend — `public/`](#4-frontend--public)
5. [Datos de referencia y datos del usuario](#5-datos-de-referencia-y-datos-del-usuario)
6. [Autenticación y seguridad](#6-autenticación-y-seguridad)
7. [PWA y funcionamiento offline](#7-pwa-y-funcionamiento-offline)
8. [Despliegue](#8-despliegue)
9. [Historia del desarrollo](#9-historia-del-desarrollo)
10. [Convenciones para seguir editando esto](#10-convenciones-para-seguir-editando-esto)

---

## 1. Qué es y qué no es

Un **tracker personal de colección Pokémon TCG**: un Pokédex interactivo
donde cada Pokémon (y, opcionalmente, cada variante — Mega, Gigamax, forma
regional, Regresión Primigenia, forma alternativa) se puede marcar como
"lo tengo" / "no lo tengo", con fecha de obtención. No modela cartas
individuales (rareza, edición, condición), sino **posesión por especie**:
para cada entrada de la Pokédex, ¿tenés esa carta, sí o no?

Dos formas de trackear la colección, **completamente independientes entre
sí** (dos mapas separados, nunca se mezclan):

- **`bulk`** — cartas sueltas, sin organizar.
- **`carpetas`** — cartas ya acomodadas en 1 a 9 carpetas/binders físicos,
  configurables por el usuario (por generación completa, o por rango
  contiguo de número de Pokédex nacional).

No es un catálogo de precios, no tiene marketplace, no tiene multiusuario
(hay una sola contraseña de administrador para todo el sitio) y no usa
ninguna base de datos — todo el estado vive en archivos JSON en disco.

## 2. Arquitectura general

```
┌─────────────────────────┐        HTTP/JSON, SSE        ┌──────────────────────────┐
│   Navegador (PWA)        │ ───────────────────────────▶ │   server.js (Express)     │
│   index.html + app.js    │ ◀─────────────────────────── │   único proceso Node      │
│   + styles.css + i18n.js │        /api/eventos (SSE)     │                            │
└───────────┬──────────────┘                               └────────────┬───────────────┘
            │ cache-first (shell) /                                      │ lee/escribe
            │ network-first (lecturas API)                               ▼
            ▼                                              inventario.json · carpetas.json
     Service Worker (sw.js)                                 variantes-config.json
                                                              admin-password.json · backups/
```

Puntos clave de esta arquitectura, y por qué:

- **Sin base de datos.** El dato "vivo" (`inventario.json`) es un mapa
  `id → {fecha}` por modo; no hay relaciones que justifiquen SQL, y un JSON
  es trivialmente exportable/respaldable/versionable a mano. La escritura es
  siempre atómica (`escribirJSONAtomico`: escribe a un archivo temporal y
  hace `rename`) para que un crash a mitad de escritura nunca deje el
  archivo corrupto.
- **El servidor es la fuente de verdad; `localStorage` es un espejo.** El
  cliente reconstruye su estado local desde `/api/estadisticas` en cada
  carga y en cada evento SSE recibido — nunca al revés. Esto es lo que
  permite que **dos pestañas, o el teléfono y la compu, se mantengan en
  sync sin conflictos**: cualquier escritura pasa siempre por el servidor,
  que la persiste y la retransmite.
- **Server-Sent Events (`/api/eventos`), no polling.** Cada cambio de
  inventario, de config de carpetas o de variantes se transmite en vivo a
  todos los clientes conectados vía `broadcast()`. El cliente distingue dos
  tipos de mensaje: `cambio` (un toggle puntual — sincroniza sin recargar
  nada) y `config` (algo grande cambió — recargar todo). Ver §4 para el
  manejo del lado del cliente, incluida la bandera `sseIgnorarProximoConfig`
  que evita que una pestaña reaccione al eco de su propio cambio.
- **Sin build step.** `public/` se sirve tal cual vía `express.static`; no
  hay bundler ni framework. Esto es deliberado — es un proyecto personal
  chico, no escalado para un equipo — y significa que `server.js` y el
  "app shell" (`index.html`+`app.js`+`styles.css`) son intencionalmente
  monolíticos: no hay arquitectura de módulos que mantener sincronizada.
- **Lectura siempre abierta, escritura siempre protegida.** Cualquiera con
  la URL puede *ver* la colección (`/api/buscar`, `/api/estadisticas`,
  `/api/exportar`, etc. no requieren sesión); solo modificarla requiere
  haber iniciado sesión con la contraseña de administrador. Es un diseño de
  "un solo dueño, visible a quien tenga el link" — no multiusuario.

## 3. Backend — `server.js`

Archivo único (~1030 líneas), organizado en secciones delimitadas por
comentarios `── SECCIÓN ──`. De arriba a abajo:

### 3.1 Configuración y arranque

- `DATA_DIR` (env var, default `__dirname`) decide dónde vive **todo** el
  estado escribible: `inventario.json`, `carpetas.json`,
  `variantes-config.json`, `admin-password.json`, `backups/`, `cache/`. Este
  único punto de indirección es lo que permite que el mismo `server.js`
  corra igual en el deploy systemd original (todo junto al repo) y en
  Docker (`DATA_DIR=/app/data`, montado como volumen).
- `VERSION_COMMIT` — el commit corriendo ahora, para mostrarlo en Ajustes.
  Se lee de `GIT_COMMIT` (env var, seteada por el workflow de Docker al
  buildear la imagen, porque `.git` no viaja dentro de la imagen) o, si no
  está, con `git rev-parse --short HEAD` (deploy systemd/dev local). Sirve
  para distinguir "no llegó el deploy todavía" de "tu navegador tiene el
  shell cacheado viejo".
- `app.set('trust proxy', 1)` — necesario porque corre detrás de un proxy
  inverso (nginx en el deploy original); sin esto `req.ip` siempre da la IP
  del proxy y el rate limiter por IP comparte un solo balde entre todo el
  mundo.
- `pokemonDB` se carga una sola vez desde `pokemon_db.json` al arrancar (no
  cambia en caliente).

### 3.2 Inventario (`bulk` + `carpetas`)

`inventario = { bulk: {}, carpetas: {} }`, cada uno `id → { fecha }`. Al
arrancar, si `inventario.json` existe pero está en el formato viejo (un
mapa plano `id → true/objeto`, de antes de que existiera el modo dual), se
migra automáticamente a `{ bulk: {}, carpetas: migrado }` (todo lo viejo se
asume carpetas, porque bulk no existía todavía en ese formato). Si el
archivo está corrupto (JSON inválido), en vez de tirar el servidor abajo
cae al respaldo automático más reciente en `backups/`.

### 3.3 Respaldos automáticos

`respaldoAutomatico()` corre una vez al arrancar y después cada 24h,
guardando una copia timestamped de `inventario.json` en `backups/`, podada
a las últimas 14. Además, `/api/importar` y `/api/backups/restaurar`
guardan un respaldo del estado *justo antes* de pisarlo
(`antes-de-importar-*.json` / `antes-de-restaurar-*.json`), distinguible
por prefijo en el listado que devuelve `/api/backups`.

### 3.4 Variantes (Mega, Gigamax, formas regionales, Regresión Primigenia, formas alternativas)

`pokemon_db.json` tiene 1025 entradas base (ids 1–1025, una por especie) más
una cola de entradas de variante (ids ≥ 1026), cada una con `especieBase`
(a qué id 1–1025 pertenece) y `categoria` (una de las 5 de arriba).
`variantesConfig` (persistida en `variantes-config.json`) decide qué
categorías cuentan como "cartas propias" — **todas arrancan en `false`**,
así que activar la feature es opt-in y no cambia el comportamiento de nadie
que no toque Ajustes → Variantes.

`pokemonEfectivo()` es la vista derivada que todo el resto del backend
consume: la base completa (1025) más solo las variantes de categorías
activas, cada una **intercalada justo después de su especie base** (no
todas al final) para que listados, búsquedas y el PDF las agrupen
naturalmente. `anclaId(p)` resuelve el id 1–1025 "ancla" de cualquier
entrada (la suya propia si ya es base, o `especieBase` si es variante) —
se usa para decidir en qué carpeta cae una variante en modo `seguidas`
(cuyos rangos se definen sobre 1–1025) y para su número regional/nacional
mostrado.

### 3.5 Configuración de carpetas (wizard)

Antes eran 4 carpetas fijas hardcodeadas; ahora es 100% configurable desde
el cliente (ver el wizard en §4) y persiste en `carpetas.json`, validada
por `carpetasConfigValida`. Dos modos, mutuamente excluyentes:

- **`separadas`** — cada carpeta agrupa generaciones completas (`gens:
  number[]`); entre todas las carpetas, las 9 generaciones aparecen
  exactamente una vez (invariante verificado en la validación).
- **`seguidas`** — cada carpeta es un rango contiguo de número de Pokédex
  nacional (`desde`/`hasta`); los rangos, ordenados, deben ser contiguos
  sin huecos ni superposición y cubrir 1 a 1025 completo.

Los nombres de carpeta deben ser únicos (case-insensitive) porque
`/api/pdf-carpetas` las identifica por nombre, no por índice. Si no existe
`carpetas.json` todavía, el estado por defecto es **cero carpetas** (no un
default hardcodeado) — el usuario ve un estado en blanco hasta terminar el
wizard.

### 3.6 Autenticación

Ver §6, sección dedicada.

### 3.7 Rate limiting

Básico, en memoria: 60 requests/min por IP (`req.ip`, de ahí la
importancia de `trust proxy`), aplicado solo a los endpoints de escritura y
a login. Limpieza periódica de entradas vencidas.

### 3.8 Endpoints de lectura (siempre abiertos)

| Endpoint | Qué devuelve |
|---|---|
| `GET /api/buscar?q=` / `?gen=` / `?desde=&hasta=` | Búsqueda por prefijo de nombre, por generación, o por rango de ids (sobre `pokemonEfectivo()`) |
| `GET /api/estadisticas?modo=` | Progreso global y por generación, `listaIds` (poseídos) y `fechas`, para el modo pedido |
| `GET /api/exportar` | Volcado completo de `bulk` y `carpetas` con nombre resuelto, para respaldo manual |
| `GET /api/carpetas-config` / `GET /api/variantes-config` | Config actual de cada uno |
| `GET /api/version` | Commit corriendo (para el pie de Ajustes) |
| `GET /api/backups` | Listado de respaldos disponibles en disco |
| `GET /api/pdf-carpetas` | Genera (o sirve cacheado) el PDF de recortables — ver §3.9 |
| `GET /api/auth-estado` / `GET /api/sesion` | Si hay contraseña definida / si la sesión actual está activa |
| `GET /api/eventos` | Stream SSE |

### 3.9 PDF de recortables

`generarPDFRecortables()` arma, con `pdfkit`, hojas carta en grilla 3×3 (9
casilleros por hoja) con todos los Pokémon en orden de Pokédex, cada
casillero con imagen + número regional/nacional + nombre — pensado para
imprimir, recortar y usar como guía de qué casillero de la carpeta física
es cada Pokémon. Las imágenes se bajan de la fuente de `pokemon_db.json`,
se redimensionan y comprimen a JPEG con `sharp` (si no, 1025 artworks en
resolución original pesarían cientos de MB), con concurrencia limitada
(`mapConcurrencia`, 12 a la vez) para no saturar la red.

La combinación "todas las carpetas, formato de números por defecto (y
portadas si aplica)" es la única que se cachea en disco
(`cache/pokedex-recortables[-seguidas].pdf`), invalidada cuando
`pokemon_db.json` o `variantes-config.json` cambian de fecha de
modificación. Cualquier combinación personalizada (subconjunto de
carpetas, o formato de números distinto) se genera al vuelo a un archivo
temporal que se borra después de servirlo.

### 3.10 Endpoints de escritura (requieren sesión)

| Endpoint | Qué hace |
|---|---|
| `POST /api/inventario` | Marca/desmarca un id en el modo indicado; hace `broadcast({tipo:'cambio', ...})` |
| `POST /api/carpetas-config` | Reemplaza la config de carpetas (wizard); `broadcast({tipo:'config'})` |
| `POST /api/variantes-config` | Reemplaza qué categorías de variante cuentan; `broadcast({tipo:'config'})` |
| `POST /api/importar` | Reemplaza el inventario del modo indicado con un respaldo exportado; respalda el estado previo primero |
| `POST /api/backups/restaurar` | Reemplaza `bulk` y `carpetas` enteros desde un respaldo en disco; respalda el estado previo primero |

### 3.11 Auto-deploy por webhook

`POST /api/webhook-deploy`: verifica firma HMAC-SHA256 de GitHub
(`X-Hub-Signature-256` contra `DEPLOY_WEBHOOK_SECRET`) sobre el *body
crudo* (por eso `express.json` guarda `req.rawBody` en el `verify`), y si
es un push a `main`, corre `git fetch && git reset --hard origin/main` +
`npm install` y sale del proceso a propósito — el unit de systemd
(`Restart=on-failure`) lo vuelve a levantar solo, ya con el código nuevo.
Deshabilitado (503) si no hay `DEPLOY_WEBHOOK_SECRET` seteada. Es
específico del deploy systemd original, no algo que Docker necesite (la
imagen Docker se reconstruye y publica sola vía GitHub Actions en cada
push).

## 4. Frontend — `public/`

Markup (`index.html`, ~540 líneas), estilos (`styles.css`, ~850 líneas) y
lógica (`app.js`, ~2700 líneas) en archivos separados, sin bundler. La
diferencia mobile/desktop es sobre todo **CSS**: `app.js` construye una
sola estructura de datos y, para la galería de tarjetas, arma *ambos*
subárboles DOM (mobile y desktop) dentro de la misma tarjeta, dejando que
el CSS oculte el que no aplica según el breakpoint (`min-width: 768px`,
constante compartida con `esDesktop()` en JS — si se desalinean, el layout
visual queda de un tamaño mientras la lógica sigue pensando que es del
otro).

### 4.1 Estado global y modo (`bulk` vs `carpetas`)

`modoActual` es el interruptor central: la mayoría de las funciones
consultan o ramifican sobre él. Es una preferencia **local del
dispositivo** (como una pestaña abierta, en `localStorage['modoActivo']`),
no algo que se sincroniza entre dispositivos — lo que sí sincroniza es el
contenido de cada inventario por separado. `claveLS(id)`/`claveFechaLS(id)`
namespacean todas las claves de `localStorage` con el modo actual, así
`bulk` y `carpetas` nunca se pisan en el mismo navegador.

### 4.2 Galería (grilla de tarjetas)

`renderGaleria()` es el motor: por cada Pokémon calcula número
regional/nacional (con caso especial para las formas de Hisui, ids
899–905, que llevan prefijo `H#` y numeración propia), pills de tipo,
fecha de obtención, y color de carpeta/generación; arma la tarjeta mobile y
la desktop en el mismo elemento. Tres tamaños de vista —`chico` (lista
compacta), `normal`, `grande`(con tipos y fecha visibles) —
persistidos en `localStorage`. El filtro `todos/tenemos/faltan` y la vista
de "Pendientes" (§4.6) reutilizan el mismo renderer.

### 4.3 Ficha de detalle

`mostrarFicha()` abre el modal de detalle a modo de "carta física": el
tipo primario define el color de marco (`tiposInfo`), muestra a qué
carpeta pertenece (`carpetaDe()`), y el botón de marcar/desmarcar
(`ejecutarToggleStatus()`) hace el `POST /api/inventario` correspondiente.
Al **desmarcar** una carta se preserva su fecha de registro original (no
se pierde) y aparece un toast con botón "Deshacer" que la restaura exacta,
sin fecha nueva. Marcar/desmarcar dispara además la detección de "generación
o Pokédex recién completada" (confeti).

### 4.4 Wizard de carpetas

`abrirWizardCarpetas()` y las funciones `wizard*` — documentado en el
propio código como una **ayuda de planificación para una carpeta física**,
no un simple formulario de config. Flujo: variantes a contar → modo
(`separadas`/`seguidas`) → formato de hoja (bolsillos por página, espacios
en blanco entre generaciones) → cantidad de carpetas → capacidad de cada
una → (solo en `separadas`) ajuste manual de qué generación va en cuál,
con recomendación automática por bin-packing → nombres y colores → guardar
(`POST /api/carpetas-config`).

En modo `seguidas`, los rangos se calculan por **peso real** (cada id pesa
1 + una unidad por cada variante activa anclada a él), no por cantidad
cruda de ids — así la capacidad declarada coincide con cartas físicas
reales, variantes incluidas.

### 4.5 Panel de variantes

`renderVariantesChecks()` es el renderer compartido entre Ajustes →
Variantes y el primer paso del wizard, para que ambos lean siempre la
misma config real del servidor (`GET`/`POST /api/variantes-config`).
Activar una categoría invalida la caché de Pokémon en memoria, refresca lo
que esté abierto, y avisa (sin bloquear) si la capacidad de carpetas ya
configurada quedó corta.

### 4.6 "Por acomodar" (pendientes)

Vista que compara `bulk` contra `carpetas` (dos llamadas paralelas a
`/api/estadisticas`) y muestra qué está en una pero no en la otra —
cartas sueltas todavía sin ubicar en un binder. Desde la ficha abierta
en esta vista, marcar como "acomodado" siempre escribe en el modo
`carpetas` (por definición, sin importar cuál sea `modoActual`).

### 4.7 Escáner de cartas (cámara + OCR)

`toggleCamaraOCR()` / `iniciarBucleOCR()`: usa la cámara trasera del
dispositivo y **Tesseract.js**, vendorizado localmente en
`public/vendor/tesseract/` (no CDN, no npm), para reconocer el nombre en
un recorte de cada frame de video y matchearlo contra la Pokédex vía
`/api/buscar?q=`. Los paquetes de idioma (`eng`+`spa`) de Tesseract sí
siguen viniendo de su CDN por defecto — deliberado, para no sumar
~20–30MB al repo por una feature que ya requiere cámara activa; el
navegador los cachea en IndexedDB tras el primer uso.

**Nota:** el botón que dispara esta feature está oculto en la UI (mobile y
desktop) — decisión tomada antes del lanzamiento público para pausar la
feature sin borrar el código, que sigue intacto y funcional si se decide
retomarla.

### 4.8 Export / import / respaldos

Exportar descarga un JSON con `bulk` y `carpetas` completos
(`GET /api/exportar`). Importar reemplaza el inventario del modo actual
(`POST /api/importar`, confirmación explícita porque es destructivo).
"Lista de faltantes" es puramente client-side: cruza
`dataGlobalCache`/`localStorage` y baja un `.txt`, sin pegarle al
servidor. El panel de Respaldos lista y permite restaurar cualquier
snapshot automático o pre-operación destructiva desde `backups/`.

### 4.9 PDF de recortables (UI)

`abrirOpcionesPDF()` reconstruye la lista de carpetas seleccionables cada
vez que se abre (para reflejar cambios recientes del wizard sin recargar
la página) y oculta la opción de "portada por región" en modo `seguidas`
(ahí una carpeta puede cortar una región al medio, así que "la portada de
la región" no está bien definida). `descargarRecortablesPDF()` arma la
query string y descarga el PDF que sirve `/api/pdf-carpetas`.

### 4.10 Sincronización en tiempo real (SSE)

`iniciarSSE()` abre `EventSource('/api/eventos')` con reconexión automática
a los 3s si se corta. Dos tipos de mensaje:

- **`cambio`** — un toggle puntual en cualquier dispositivo: si es del modo
  que esta pestaña está mirando, sincroniza `localStorage` y las
  estadísticas sin recargar nada, con un toast liviano no accionable.
- **`config`** — señal genérica de "algo grande cambió" (import, restore,
  reconfiguración de carpetas o de variantes desde *otro* dispositivo):
  recarga todo (config de carpetas, sidebar, stats, badge de pendientes) y
  cierra la galería abierta. La bandera `sseIgnorarProximoConfig` evita que
  la propia pestaña que originó el cambio reaccione al eco de su propio
  broadcast.

### 4.11 Buscador

Autocompletado con debounce de 300ms sobre `/api/buscar?q=`, cancelando
requests en vuelo con `AbortController` si llega una tecla nueva antes de
que responda la anterior. No hay atajos de teclado globales — la única
interacción por teclado es Enter para enviar los formularios de login.

### 4.12 Service worker: registro y aviso de actualización

Ver §7.

### 4.13 Tema, idioma, sesión

- **Tema** (`claro`/`oscuro`/`auto`): `auto` no fija ningún atributo (deja
  que `prefers-color-scheme` decida); `claro`/`oscuro` fuerzan
  `data-theme` en `<html>`. Persistido en `localStorage`.
- **Idioma** (`es`/`en`): ver `public/i18n.js`, diccionario plano por
  clave (`'área.elemento'`) con placeholders `{var}`, aplicado vía
  atributos `data-i18n`/`data-i18n-placeholder`/`data-i18n-title` para
  texto estático y `t('clave')` para texto dinámico. Auto-detectado del
  navegador la primera vez, editable en Ajustes. Un detalle no obvio:
  varias tablas de configuración (`tiposInfo`, `CATEGORIA_INFO`, etc.) se
  arman llamando a `t()` una sola vez al cargar el módulo — cambiar de
  idioma en caliente requiere refrescarlas explícitamente
  (`actualizarTraduccionesEstaticas()`), si no quedan "congeladas" en el
  idioma inicial.
- **Sesión**: la cookie real la maneja el servidor (`httpOnly`); el
  cliente solo mantiene `sesionActiva` para pintar la UI, nunca decide
  autorización por su cuenta. `requiereSesion(accion)` es el patrón
  compartido: si hay sesión ejecuta `accion` directo, si no abre el login
  y la reintenta automáticamente al loguearse con éxito.

## 5. Datos de referencia y datos del usuario

| Archivo | Naturaleza | Contenido |
|---|---|---|
| `pokemon_db.json` | Referencia, versionado en git | 1025 especies base (ids 1–1025) + variantes (ids ≥ 1026) con `especieBase`/`categoria` |
| `variantes_lista.json` | Investigación, no runtime | Lista de variantes por nombre PokeAPI + categoría + especie base, insumo de `fetch_variantes.js` |
| `inventario.json` | Estado del usuario, **gitignored** | `{ bulk: {id:{fecha}}, carpetas: {id:{fecha}} }` |
| `carpetas.json` | Config del usuario, versionado (seed) | Layout de binders (`modo` + array de carpetas) |
| `variantes-config.json` | Config del usuario, versionado (seed) | Qué categorías de variante cuentan |
| `admin-password.json` | Secreto, **gitignored** | `{salt, hash}` scrypt de la contraseña |
| `backups/` | Estado del usuario, **gitignored** | Snapshots automáticos y pre-operación de `inventario.json` |

`fetch_pokemon.js` regenera `pokemon_db.json` desde cero pegándole a
PokeAPI (1025 requests, uno por Pokémon) — lento, se corre solo cuando la
referencia necesita actualizarse, y **pisa el archivo entero, borrando
cualquier variante existente**. Por eso `fetch_variantes.js` siempre debe
correrse *después*: extiende la base con la cola de variantes calculada
desde `variantes_lista.json`, es re-ejecutable las veces que haga falta
(siempre regenera la cola entera desde cero), y falla fuerte en vez de
escribir un resultado parcial si PokeAPI da error en cualquier entrada, o
si dos variantes (o una variante y su propia especie base) resuelven al
mismo artwork — mismo hash de imagen — porque eso significaría contar la
misma carta física dos veces (caso real que motivó el chequeo: Toxtricity
Amped/Low Key Gigamax compartían arte).

## 6. Autenticación y seguridad

Sistema mínimo, sin dependencias nuevas:

- **Sin contraseña preestablecida.** `admin-password.json` no existe hasta
  que alguien la define. `GET /api/auth-estado` le dice al cliente si ya
  hay una configurada; si no, el primer intento de escritura muestra un
  formulario de "definir tu contraseña" (`POST /api/definir-password`, una
  sola vez — 409 si ya existía) en vez de un login normal.
- **`ADMIN_PASSWORD`** (env var) sigue funcionando como **migración única**
  en el arranque, si `admin-password.json` todavía no existe: se hashea
  una sola vez y se escribe a disco; de ahí en más el archivo es la única
  fuente de verdad y la env var nunca se vuelve a leer.
- **Hash con `scrypt`** (built-in de Node, sin librerías externas), salt
  aleatorio por instalación, comparación en **tiempo constante**
  (`crypto.timingSafeEqual`) para no filtrar por timing cuánto de la
  contraseña coincidió.
- **Sesiones** — token aleatorio en un `Map` en memoria (`token →
  expiraEn`, 30 días), mandado como cookie `httpOnly` + `SameSite=Lax` (+
  `Secure` si la conexión es HTTPS, detectado también vía
  `X-Forwarded-Proto` porque puede correr detrás de un proxy que termina
  TLS). Sin `cookie-parser`: el header `Cookie` se parsea a mano porque el
  formato necesario es trivial.
- **Lectura siempre libre, escritura siempre protegida** —
  `requiereLogin` es un middleware que se aplica solo a los endpoints que
  modifican estado.
- **Rate limiting** de 60 req/min/IP en escritura y login, en memoria, para
  frenar fuerza bruta básica.
- **Webhook de auto-deploy** verificado por firma HMAC-SHA256 en tiempo
  constante, para que solo GitHub (con el secreto correcto) pueda
  dispararlo.

## 7. PWA y funcionamiento offline

`public/manifest.json` declara la app instalable (`standalone`, ícono de
Pokéball). `public/sw.js` es el service worker, con una estrategia de
caché deliberadamente distinta según el tipo de recurso:

- **Todo lo que escribe (`POST`)** — nunca se intercepta, siempre va
  directo a la red. Es una decisión explícita: encolar escrituras offline
  podría producir inconsistencias silenciosas entre dispositivos que
  después son difíciles de diagnosticar.
- **`/api/buscar` y `/api/estadisticas` (`GET`)** — network-first: intenta
  la red, y si falla (sin internet) sirve la última respuesta buena
  cacheada. Solo cachea respuestas completas y exitosas (`res.ok`), para
  no guardar para siempre una respuesta cortada a la mitad.
- **Cualquier otro `GET /api/*`** (exportar, PDF de recortables, etc.) —
  siempre red, nunca cacheado: se generan al vuelo y no tiene sentido
  servir una versión vieja por error.
- **Todo lo demás** (el app shell — `index.html`, `app.js`, `styles.css`,
  fuentes, íconos — más imágenes) — cache-first con red de respaldo. Las
  imágenes de Pokémon vienen de otro origen (`raw.githubusercontent.com`)
  y llegan como respuesta *opaque* (`status 0`, `res.ok` siempre `false`
  aunque haya cargado perfecto) — el código lo tiene en cuenta
  explícitamente, si no ninguna imagen se cachearía nunca y cada visita
  las volvería a bajar de la red.

**Gotcha documentado y repetido en el propio código: hay que subir
`CACHE_VERSION` en `sw.js` en el mismo commit que cualquier cambio a
`index.html`, `app.js` o `styles.css`.** El navegador solo vuelve a
chequear/instalar el service worker cuando cambian los bytes de `sw.js`
mismo — si se edita el app shell sin tocar `sw.js`, el navegador sigue
sirviendo el shell viejo cacheado indefinidamente (sobrevive incluso a
"borrar datos del sitio" en algunos casos), sin ningún error que lo
delate. No hay build step que lo detecte automáticamente, así que es
disciplina manual — y de hecho generó un bug real en el historial de
commits ("Encontrado el bug: faltaba subir CACHE_VERSION en los últimos 2
commits").

El lado cliente de esto es `app.js` (§4.12): en cada `visibilitychange`
fuerza `registration.update()` (una PWA puede quedar abierta en un
teléfono indefinidamente, así que no alcanza con el chequeo automático del
navegador), y al detectar `controllerchange` (un service worker nuevo tomó
control) muestra un toast de "hay una versión nueva" que **no se
autooculta** — perder de vista el aviso no debería dejar a alguien sin
saber por qué no ve un cambio que ya está instalado.

## 8. Despliegue

Dos caminos soportados, documentados también en `README.md`/`README.en.md`
y en `CLAUDE.md`:

### 8.1 Docker (el camino general, recomendado para cualquiera que no sea el autor)

`docker compose up -d` con la imagen publicada en
`ghcr.io/juanjose1245-maker/pokedextcg:latest` (amd64+arm64, reconstruida
automáticamente en cada push a `main` por
`.github/workflows/docker-publish.yml`, con el SHA corto pasado como
`GIT_COMMIT` build-arg). `docker-entrypoint.sh` arranca como root solo para
poder `chown` `DATA_DIR` (que puede ser un bind-mount con cualquier dueño)
y recién después baja privilegios al usuario no-root `node` vía `setpriv`
antes de ejecutar la app — así funciona sin importar quién creó la carpeta
`./data` en el host. `DATA_DIR` queda fijo en `/app/data` dentro de la
imagen.

### 8.2 systemd (el deploy específico del autor)

`pokedex.service` (`WorkingDirectory` = el repo, usuario `www-data`,
`Restart=on-failure`), con el webhook de GitHub (§3.11) disparando
`git pull` + reinicio en cada push a `main`. Requiere que `www-data` sea
dueño de todos los archivos/carpetas que el proceso necesita escribir —
incluido `/var/www/.npm` para que `npm install` (parte del auto-deploy) no
falle con `EACCES`. Este camino no es lo que se le recomienda a un tercero
que quiera self-hostear la app; existe porque es cómo corre la instancia
original del autor.

## 9. Historia del desarrollo

Reconstruida a partir del historial real de commits (`git log`), sin
inventar fechas ni intenciones. El proyecto pasó por fases bastante
marcadas:

### Fase 0 — Prototipo (10 al 20 de julio de 2026)

Los primeros commits ("version funcional escritorio y celular", "Version
que parece estable", "Version con mejora...") muestran iteración rápida y
manual, sin Claude Code todavía: una Pokédex básica que funciona en
escritorio y celular, con todos los Pokémon como default. El 14–15 de
julio se agregan las carpetas (funcionando en celular y escritorio, con
mejoras de notificaciones). El 19 de julio aparece el modo dual
**bulk + carpetas** junto con selector de tema y guardado en JSON. El 20 de
julio se agrega backup automático — ya con la forma general que tiene hoy,
pero mucho más simple: 4 carpetas fijas hardcodeadas, sin wizard, sin
variantes, sin i18n, sin auth real más allá de lo mínimo.

### Fase 1 — Adopción de Claude Code (22–23 de julio)

Los commits "inicio con claude" e "inicio con claude y github" marcan el
punto donde el desarrollo pasa a hacerse asistido, con specs y planes
explícitos por feature (patrón que se mantiene el resto del historial:
`Spec: ...` → `Plan: ...` → commits de implementación → fixes de la
revisión final). Primer resultado visible: rediseño de la paleta del tema
oscuro (de una mezcla saturada negro/ámbar/verde-neón/rojo a una paleta
tipo GitHub/Linear, más sobria) — la primera PR real del repo (#1).

### Fase 2 — PDF de recortables y auto-deploy (23 de julio)

Se agrega la generación de PDF de recortables (hojas 3×3 para imprimir y
guiarse al armar las carpetas físicas), con varias iteraciones de debug en
producción (alerts temporales, hasta encontrar que faltaba subir
`CACHE_VERSION` — el primer caso documentado de ese gotcha) y luego mejoras
(separación por generación con portada, número regional además del
nacional). En paralelo se agrega el auto-deploy por webhook de GitHub.

### Fase 3 — Wizard de carpetas (24–26 de julio)

Reemplazo del modelo de 4 carpetas fijas por un **wizard configurable**:
primero con cantidad y agrupación, después con capacidad por carpeta y
validación de factibilidad, después reescrito completo como "ayuda de
planificación" en vez de formulario de config. El 25 de julio se extiende
`carpetas.json` para soportar el modo **`seguidas`** (rangos contiguos de
número nacional) además de `separadas` (por generación) — tocando
`server.js`, el wizard, el cálculo de progreso, el PDF y la apertura de
galería por rango, todo en la misma tanda de commits.

### Fase 4 — Variantes de Pokédex (26 de julio al 1 de agosto)

La fase más larga e investigación-intensiva: specs, planes y adendas
sucesivas para definir criterios (primero solo por nombre distinto en
PokeAPI, después ampliado a "arte distinto" tras encontrar casos que el
primer criterio no cubría bien, como Arceus y sus 18 tipos, o Enamorus
Therian), investigación manual de formas regionales, Mega/Regresión
Primigenia, Gigamax y formas alternativas, y construcción de
`fetch_variantes.js` con su chequeo de imágenes duplicadas (para no contar
la misma carta física dos veces). Recién después de tener los datos
confiables se construye el tracking real: `variantes-config.json`, la
vista derivada `pokemonEfectivo()`, los endpoints
`GET`/`POST /api/variantes-config`, el panel de Ajustes, y por último
(Fase 3 de variantes, ya en agosto) la inclusión de variantes activas en
el PDF de recortables.

### Fase 5 — Pulido de UI (29 de julio al 2 de agosto)

Selector de tamaño de tarjeta (chico/normal/grande) en la galería,
reemplazo de íconos, unificación del selector a la barra de filtros,
arreglos de Service Worker (caché de imágenes, aviso de versión nueva en
vez de depender de cerrar/reabrir la app), vista "Chico" reescrita como
lista real en vez de una grilla con tarjetas más chicas, panel de
Respaldos en Ajustes.

### Fase 6 — Self-hosting con Docker (3–4 de agosto)

Spec y plan explícitos para "empaquetar la app para self-hosting":
`DATA_DIR` configurable, `Dockerfile` (usuario no-root), `docker-compose.yml`
de ejemplo, workflow de GitHub Actions para publicar en `ghcr.io`
(agregando arm64 poco después, pensando en Raspberry Pi), y un
`docker-entrypoint.sh` que autoarregla permisos de `DATA_DIR` en cada
arranque. En la misma ventana se reemplaza `ADMIN_PASSWORD` (obligatoria
por env var) por el flujo de "definir tu contraseña desde la app la
primera vez" — más amigable para alguien instalando vía Docker sin tocar
variables de entorno — y se deja de arrancar con 4 carpetas hardcodeadas
por defecto (arranca vacío hasta terminar el wizard).

### Fase 7 — Internacionalización (5–6 de agosto)

`i18n.js` se agrega primero como diccionario suelto, sin conectar a nada
("existe y funciona, pero index.html/app.js siguen con su texto
hardcodeado" — commit explícito), y recién en commits posteriores se
conecta: primero el texto estático de `index.html`, después los toasts y
el contenido dinámico de `app.js`, después el selector de idioma en
Ajustes con detección automática por navegador, y por último los mensajes
de error del servidor pasan a ser códigos (`password_incorrecta`,
`rate_limit`, etc.) en vez de texto en español, traducidos del lado
cliente.

### Fase 8 — Preparación para lanzamiento público (7–8 de agosto)

Último tramo: `LICENSE` (MIT), reescritura completa del `README` pensando
en un usuario externo instalando vía Docker (en vez de las notas internas
del autor), ocultar el botón de cámara OCR sin borrar el código (pausar la
feature en vez de descartar el trabajo), mostrar el commit real en Docker
aunque no haya `.git` disponible dentro de la imagen, limpieza de
artefactos de desarrollo interno que no le sirven a un tercero, capturas
de pantalla reales en el README, y un `README.en.md` en inglés.

## 10. Convenciones para seguir editando esto

- Este documento describe el **estado actual** del código (verificado
  leyendo `server.js`, `public/app.js` completo, `public/index.html`,
  `public/sw.js`, `public/i18n.js`, `public/styles.css`,
  `fetch_pokemon.js`/`fetch_variantes.js` y el historial de git). Si el
  código cambia de forma sustancial, actualizá la sección correspondiente
  acá — no dejes que se desactualice como un comentario suelto.
- Los comentarios y textos de UI están en español (ver `CLAUDE.md`); este
  documento sigue esa misma convención.
- Para las reglas operativas del día a día (cómo correr, cómo se organiza
  cada archivo, gotchas puntuales para editar) la referencia primaria
  sigue siendo `CLAUDE.md` — este documento es el complemento narrativo,
  no un reemplazo.
