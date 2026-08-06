# Graph Report - pokedex-tcg  (2026-08-06)

## Corpus Check
- 47 files · ~117,587 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1130 nodes · 2039 edges · 88 communities (57 shown, 31 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 226 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b49ef01a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worker.min.js
- app.js
- O
- server.js
- V
- V
- tesseract-core-lstm.wasm.js
- L
- tesseract-core-simd-lstm.wasm.js
- L
- O
- J
- ji
- Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación
- mostrarToastError
- renderGaleria
- wizardCapacidadSiguiente
- J
- package.json
- A
- A
- Modo "Todas seguidas" para configuración de carpetas
- Global Constraints
- Fase 2 — Selección de categorías de variantes (núcleo de tracking)
- Lh
- Lh
- zb
- zb
- Empaquetar la app en Docker para que otros la auto-hosteen
- d
- p
- d
- p
- Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación
- Empaquetar la app en Docker para self-hosting — Plan de implementación
- CLAUDE.md
- Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación
- Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.)
- manifest.json
- Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes"
- Fase 3 — Variantes en el PDF de recortables
- Control de tamaño de tarjeta en la galería (Chico/Normal/Grande)
- Criterio de investigación: variantes de Pokémon con carta TCG propia
- migrar-carpetas-a-bulk.js
- K
- K
- N
- Q
- generarPDFRecortables
- Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros
- kb
- kb
- Fase 3 — Variantes en el PDF de recortables — Plan de implementación
- Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación
- Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros — Plan de implementación
- qb
- qb
- Instalar con Docker
- fetch_variantes.js
- di
- di
- escribirJSONAtomico
- fetch_pokemon.js
- ii
- carpetasConfigValida
- sesionValida
- sw.js
- CATEGORIAS_VARIANTES
- update_script.sh
- Q
- ii
- docker-entrypoint.sh
- wizardGuardar
- ei
- O
- ji
- wizardGuardar
- O
- ei
- M
- ai
- wizardGuardar
- crearSesion
- hashearPassword
- Sh
- O
- Internacionalización: español (default) + inglés
- Internacionalización español/inglés — Plan de implementación

## God Nodes (most connected - your core abstractions)
1. `V()` - 66 edges
2. `V()` - 66 edges
3. `L()` - 47 edges
4. `L()` - 47 edges
5. `A()` - 33 edges
6. `A()` - 33 edges
7. `r()` - 30 edges
8. `a()` - 28 edges
9. `J()` - 25 edges
10. `J()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `listarRespaldos()` --indirect_call--> `f()`  [INFERRED]
  server.js → public/vendor/tesseract/tesseract.min.js
- `generarPDFRecortables()` --indirect_call--> `y()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `carpetasConfigValida()` --indirect_call--> `g()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `pokemonEfectivo()` --indirect_call--> `v()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `generarPDFRecortables()` --indirect_call--> `x()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js

## Import Cycles
- None detected.

## Communities (88 total, 31 thin omitted)

### Community 0 - "worker.min.js"
Cohesion: 0.15
Nodes (53): A(), b(), c(), e(), f(), G(), h(), i() (+45 more)

### Community 1 - "app.js"
Cohesion: 0.04
Nodes (51): abrirAjustes(), actualizarBotonesModo(), actualizarBotonSesion(), aplicarModoVista(), aplicarTema(), cachePokemon, calcularIdsPendientesSilencioso(), calcularJalon() (+43 more)

### Community 2 - "O"
Cohesion: 0.67
Nodes (4): agregarAlHistorial(), detenerCamara(), iniciarBucleOCR(), toggleCamaraOCR()

### Community 3 - "server.js"
Cohesion: 0.06
Nodes (28): app, CARPETA_CACHE, CARPETA_RESPALDOS, carpetasConfig, clientes, CORTES_GEN, crypto, { exec, execSync } (+20 more)

### Community 6 - "tesseract-core-lstm.wasm.js"
Cohesion: 0.07
Nodes (14): ci(), Da(), fi(), gi(), Kh(), R(), Rh(), Sa() (+6 more)

### Community 8 - "tesseract-core-simd-lstm.wasm.js"
Cohesion: 0.07
Nodes (14): ci(), Da(), fi(), gi(), Kh(), R(), Rh(), Sa() (+6 more)

### Community 14 - "Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación"
Cohesion: 0.08
Nodes (24): Addendum 2 — ampliar el criterio de "formas alternativas" a arte distinto, Addendum — hallazgos de la revisión final + investigación propia del usuario, Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación, Formato de `variantes_lista.json`, Global Constraints, Self-Review del Addendum 2, Self-Review del addendum (Tareas 7-11), Self-Review (hecho al escribir este plan) (+16 more)

### Community 15 - "mostrarToastError"
Cohesion: 0.33
Nodes (7): Ab(), Db(), Eb(), kb(), Nb(), Ta(), Ua()

### Community 16 - "renderGaleria"
Cohesion: 0.17
Nodes (20): actualizarBotonEstado(), actualizarGalleryHeader(), anclaIdCliente(), calcularProgresoReciente(), carpetaDe(), clearSearchTimer(), getFechaRegistro(), gridActivo() (+12 more)

### Community 17 - "wizardCapacidadSiguiente"
Cohesion: 0.11
Nodes (25): cargarCarpetasConfig(), fetchRangoSegura(), formatearRango(), pokemonEnGen(), wizardActualizarPreviewAjuste(), wizardActualizarTotalCapacidad(), wizardAjusteSiguiente(), wizardArmarPasoAjuste() (+17 more)

### Community 19 - "package.json"
Cohesion: 0.11
Nodes (18): express, node-fetch, author, dependencies, express, node-fetch, pdfkit, sharp (+10 more)

### Community 22 - "Modo "Todas seguidas" para configuración de carpetas"
Cohesion: 0.11
Nodes (17): Apertura de galería de una carpeta (~app.js:559-571), `/api/buscar` (server.js:287), `/api/carpetas-config` GET/POST (server.js:343, 567), `carpetaDe(p)` (app.js:74), `carpetas.json` (servidor), Cliente (`public/app.js`), Contexto, Fuera de alcance (a propósito) (+9 more)

### Community 23 - "Global Constraints"
Cohesion: 0.14
Nodes (13): Global Constraints, Modo "Todas Seguidas" para Carpetas — Implementation Plan, Self-Review Notes, Task 10: Wizard — paso "nombres", guardar, y botón "Atrás", Task 1: Server — data model, migration, validation, Task 2: Server — `/api/carpetas-config` + `/api/buscar` for ranges, Task 3: Server — PDF de recortables por rango, Task 4: Cliente — `cargarCarpetasConfig` y `carpetaDe` para el nuevo formato (+5 more)

### Community 24 - "Fase 2 — Selección de categorías de variantes (núcleo de tracking)"
Cohesion: 0.14
Nodes (13): Ajustes, Cambios en endpoints existentes, Cliente, Contexto, Fase 2 — Selección de categorías de variantes (núcleo de tracking), Fuera de alcance (a propósito, queda para Fase 3), Galería / ficha, Manejo de errores y edge cases (+5 more)

### Community 25 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 26 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 27 - "zb"
Cohesion: 0.42
Nodes (13): ac(), $b(), bc(), cc(), Hh(), Pb(), tb(), ub() (+5 more)

### Community 28 - "zb"
Cohesion: 0.42
Nodes (13): ac(), $b(), bc(), cc(), Hh(), Pb(), tb(), ub() (+5 more)

### Community 29 - "Empaquetar la app en Docker para que otros la auto-hosteen"
Cohesion: 0.18
Nodes (10): Cambio en `server.js`: `DATA_DIR`, Contexto, `docker-compose.yml`, `Dockerfile`, `.dockerignore`, Documentación, Empaquetar la app en Docker para que otros la auto-hosteen, Fuera de alcance (+2 more)

### Community 30 - "d"
Cohesion: 0.29
Nodes (3): d(), h(), Za()

### Community 31 - "p"
Cohesion: 0.22
Nodes (10): e(), gb(), hb(), Ma(), Na(), Oa(), p(), Pa() (+2 more)

### Community 32 - "d"
Cohesion: 0.29
Nodes (3): d(), h(), Za()

### Community 33 - "p"
Cohesion: 0.22
Nodes (10): e(), gb(), hb(), Ma(), Na(), Oa(), p(), Pa() (+2 more)

### Community 34 - "Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación"
Cohesion: 0.20
Nodes (9): Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación, Global Constraints, Limitación conocida (no cubierta por este plan), Self-Review (hecho al escribir este plan), Task 1: `variantes-config.json` + vista derivada `pokemonEfectivo()` en el servidor, Task 2: Endpoints `/api/variantes-config` + integrar `pokemonEfectivo()` en `/api/buscar` y `/api/estadisticas`, Task 3: Corregir la numeración de variantes en galería/ficha + badge de categoría, Task 4: Panel "Variantes" en Ajustes (+1 more)

### Community 35 - "Empaquetar la app en Docker para self-hosting — Plan de implementación"
Cohesion: 0.20
Nodes (9): Empaquetar la app en Docker para self-hosting — Plan de implementación, Global Constraints, Self-Review (hecho al escribir este plan), Task 1: Soporte de `DATA_DIR` en `server.js`, Task 2: `Dockerfile` y `.dockerignore`, Task 3: `docker-compose.yml`, Task 4: Workflow de GitHub Actions para publicar en `ghcr.io`, Task 5: Documentación en `README.md` (+1 more)

### Community 36 - "CLAUDE.md"
Cohesion: 0.22
Nodes (7): Architecture, Auth, Data files (not code, but load-bearing), Editing conventions, graphify, Running it, What this is

### Community 37 - "Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación"
Cohesion: 0.22
Nodes (8): Global Constraints, Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación, Self-Review (hecho al escribir este plan), Task 1: Ícono de Ajustes en el header mobile + sacar el atajo redundante de Métricas, Task 2: Reestructurar el markup de "Ajustes" en 3 secciones agrupadas, Task 3: CSS de las secciones agrupadas, Task 4: Chevron de navegación en las filas que abren un modal, Task 5: Bump de `CACHE_VERSION` y verificación visual end-to-end

### Community 38 - "Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.)"
Cohesion: 0.22
Nodes (8): Contexto, Esquema de cada entrada variante, Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.), `fetch_pokemon.js`, Fuera de alcance (a propósito, queda para la Fase 2), Modelo de datos, Proceso de investigación, Testing

### Community 39 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 40 - "Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes""
Cohesion: 0.25
Nodes (7): Accesos rápidos (Métricas / Cámara / Por acomodar / Ajustes), Affordance por fila: `›` solo en las que navegan, "Ajustes" agrupado en 3 secciones, Contexto, Fuera de alcance (a propósito), Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes", Testing

### Community 41 - "Fase 3 — Variantes en el PDF de recortables"
Cohesion: 0.25
Nodes (7): Caché e invalidación (`/api/pdf-carpetas`), Cambios, Contexto, Fase 3 — Variantes en el PDF de recortables, Fuera de alcance, `generarPDFRecortables(rutaSalida, opciones)` (`server.js`), Testing

### Community 42 - "Control de tamaño de tarjeta en la galería (Chico/Normal/Grande)"
Cohesion: 0.25
Nodes (7): Contexto, Control de tamaño de tarjeta en la galería (Chico/Normal/Grande), Fuera de alcance, Modelo de datos y estado, Modo Grande, Testing, UI

### Community 43 - "Criterio de investigación: variantes de Pokémon con carta TCG propia"
Cohesion: 0.25
Nodes (7): Criterio de inclusión, Criterio de investigación: variantes de Pokémon con carta TCG propia, Evidencia positiva (formas incluidas), Formas confirmadas por arte pero bloqueadas por falta de datos en PokeAPI, Formas investigadas y descartadas, Historial del criterio, Notas

### Community 44 - "migrar-carpetas-a-bulk.js"
Cohesion: 0.25
Nodes (7): fs, idsCarpetas, path, raw, RUTA_INVENTARIO, rutaRespaldo, timestamp

### Community 47 - "N"
Cohesion: 0.20
Nodes (9): Almacenamiento: hash persistido en `DATA_DIR`, Cliente: el modal de login con dos modos, Contexto, Definir contraseña en el primer uso (reemplaza ADMIN_PASSWORD), Docker, Endpoints nuevos, Fuera de alcance, Migración automática al arrancar (+1 more)

### Community 49 - "generarPDFRecortables"
Cohesion: 0.25
Nodes (8): x(), anclaId(), descargarImagen(), generarPDFRecortables(), mapConcurrencia(), PDFDocument, pokemonEfectivo(), sharp

### Community 50 - "Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros"
Cohesion: 0.29
Nodes (6): Contexto, Fuera de alcance, Iconos de tamaño, Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros, Testing, Ubicación

### Community 51 - "kb"
Cohesion: 0.29
Nodes (6): Definir contraseña en el primer uso — Plan de implementación, Global Constraints, Self-Review (hecho al escribir este plan), Task 1: Hash persistido, migración automática y endpoints nuevos en `server.js`, Task 2: Modal de login con dos modos en el cliente, Task 3: Actualizar `docker-compose.yml` y `README.md`

### Community 52 - "kb"
Cohesion: 0.21
Nodes (12): abrirLoginModal(), abrirLoginOLogout(), abrirOpcionesPDF(), abrirPanelRespaldos(), abrirPanelVariantes(), abrirWizardCarpetas(), cerrarAjustes(), cerrarPanelVariantes() (+4 more)

### Community 53 - "Fase 3 — Variantes en el PDF de recortables — Plan de implementación"
Cohesion: 0.33
Nodes (5): Fase 3 — Variantes en el PDF de recortables — Plan de implementación, Global Constraints, Self-Review (hecho al escribir este plan), Task 1: `generarPDFRecortables()` variant-aware (orden, rango, y numeración), Task 2: Invalidación de caché consciente de `variantes-config.json`

### Community 54 - "Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación"
Cohesion: 0.33
Nodes (5): Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación, Global Constraints, Self-Review (hecho al escribir este plan), Task 1: Renombrar a `modoVista`, persistir en `localStorage`, y el selector de 3 botones, Task 2: Modo Grande — menos columnas + tipos y fecha en la tarjeta

### Community 55 - "Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros — Plan de implementación"
Cohesion: 0.33
Nodes (5): Global Constraints, Integrar el selector de tamaño (Chico/Normal/Grande) a la barra de filtros — Plan de implementación, Self-Review (hecho al escribir este plan), Task 1: Reemplazar el texto de los botones por iconos compactos, Task 2: Mover el selector de tamaño mobile a la fila de filtros

### Community 56 - "qb"
Cohesion: 0.33
Nodes (5): Ha(), Ia(), qb(), sb(), t()

### Community 57 - "qb"
Cohesion: 0.33
Nodes (5): Ha(), Ia(), qb(), sb(), t()

### Community 58 - "Instalar con Docker"
Cohesion: 0.33
Nodes (5): Actualizar, Instalar con Docker, Pokédex TCG, Problemas comunes, Variables de entorno

### Community 59 - "fetch_variantes.js"
Cohesion: 0.50
Nodes (4): buscarImagenesDuplicadas(), crypto, fetchVariantes(), fs

### Community 62 - "escribirJSONAtomico"
Cohesion: 0.40
Nodes (5): escribirJSONAtomico(), guardarCarpetasConfig(), guardarInventario(), guardarVariantesConfig(), respaldoAutomatico()

### Community 64 - "ii"
Cohesion: 0.29
Nodes (6): Contexto, Fuera de alcance, Login como gate de apertura, no como paso nuevo, Login y variantes como primeros pasos del wizard de carpetas, Nuevo paso "variantes", Testing

### Community 65 - "carpetasConfigValida"
Cohesion: 0.67
Nodes (3): carpetasConfigValida(), nombresUnicos(), pokemonPorGens()

### Community 66 - "sesionValida"
Cohesion: 0.67
Nodes (3): parsearCookies(), requiereLogin(), sesionValida()

### Community 73 - "wizardGuardar"
Cohesion: 0.33
Nodes (5): Global Constraints, Login y variantes como primeros pasos del wizard de carpetas — Plan de implementación, Self-Review (hecho al escribir este plan), Task 1: Extraer `renderVariantesChecks()` como helper compartido, Task 2: Nuevo paso "variantes" + gate de login al abrir el wizard

### Community 74 - "ei"
Cohesion: 0.33
Nodes (7): Ab(), Db(), Eb(), kb(), Nb(), Ta(), Ua()

### Community 77 - "wizardGuardar"
Cohesion: 0.15
Nodes (38): actualizarBadgePendientes(), actualizarTarjetaProgreso(), actualizarTarjetaProgresoPendientes(), calcularIdsPendientes(), cambiarModo(), cambiarTab(), cargarEstadisticas(), cargarEstadisticasSinMoverScroll() (+30 more)

### Community 82 - "wizardGuardar"
Cohesion: 0.47
Nodes (6): bgDeColor(), bgDeGen(), colorDeGen(), gradienteDeGen(), renderGridGeneraciones(), segmentosDeGen()

### Community 86 - "O"
Cohesion: 0.05
Nodes (7): ai(), ei(), hi(), ji(), M(), O(), Sh()

### Community 87 - "Internacionalización: español (default) + inglés"
Cohesion: 0.20
Nodes (9): Contexto, Diccionario y función `t()`, Errores del servidor: de texto a códigos, Fuera de alcance, Internacionalización: español (default) + inglés, Selector de idioma en Ajustes, Testing, Texto estático de `index.html` (+1 more)

### Community 92 - "Internacionalización español/inglés — Plan de implementación"
Cohesion: 0.22
Nodes (8): Global Constraints, Internacionalización español/inglés — Plan de implementación, Self-Review (hecho al escribir este plan), Task 1: Diccionario `public/i18n.js` — extracción completa + traducción, Task 2: Conectar `index.html` al diccionario, Task 3: Conectar el texto generado por JS en `app.js`, Task 4: Selector de idioma en Ajustes + detección automática, Task 5: Errores del servidor — de texto a códigos traducidos

## Knowledge Gaps
- **263 isolated node(s):** `docker-entrypoint.sh script`, `fs`, `fs`, `crypto`, `fs` (+258 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `g()` connect `worker.min.js` to `carpetasConfigValida`, `wizardGuardar`, `wizardCapacidadSiguiente`, `qb`, `qb`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `a()` connect `worker.min.js` to `p`, `A`, `A`, `qb`, `qb`, `p`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **Why does `A()` connect `A` to `worker.min.js`, `tesseract-core-lstm.wasm.js`, `L`, `Q`, `ei`, `J`, `K`, `qb`, `Lh`, `di`, `d`, `p`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **What connects `docker-entrypoint.sh script`, `fs`, `fs` to the rest of the system?**
  _263 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.042606516290726815 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `V` be split into smaller, more focused modules?**
  _Cohesion score 0.07007575757575757 - nodes in this community are weakly interconnected._