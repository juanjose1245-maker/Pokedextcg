# Graph Report - pokedex-tcg  (2026-08-01)

## Corpus Check
- 35 files · ~100,284 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1011 nodes · 1900 edges · 78 communities (46 shown, 32 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 221 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5621c462`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worker.min.js
- ejecutarToggleStatus
- app.js
- server.js
- V
- V
- tesseract-core-lstm.wasm.js
- tesseract-core-simd-lstm.wasm.js
- L
- L
- esDesktop
- wizardCapacidadSiguiente
- J
- J
- package.json
- renderGaleria
- A
- ji
- A
- Modo "Todas seguidas" para configuración de carpetas
- ji
- Global Constraints
- Lh
- Lh
- zb
- zb
- Fase 3 — Variantes en el PDF de recortables
- mostrarToastError
- d
- p
- hi
- kb
- manifest.json
- CLAUDE.md
- migrar-carpetas-a-bulk.js
- K
- N
- Q
- K
- N
- Q
- Fase 2 — Selección de categorías de variantes (núcleo de tracking)
- qb
- ei
- qb
- di
- di
- M
- ai
- fetch_pokemon.js
- Sh
- ii
- Fase 3 — Variantes en el PDF de recortables — Plan de implementación
- d
- sw.js
- update_script.sh
- p
- Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación
- Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes"
- kb
- qb
- ii
- Criterio de investigación: variantes de Pokémon con carta TCG propia
- Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.)
- Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación
- fetch_variantes.js
- Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación
- ei
- Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación
- p
- escribirJSONAtomico
- carpetasConfigValida
- M
- sesionValida
- CATEGORIAS_VARIANTES
- Sh
- ai
- iniciarBucleOCR

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
- `generarPDFRecortables()` --indirect_call--> `y()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `carpetasConfigValida()` --indirect_call--> `g()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `pokemonEfectivo()` --indirect_call--> `v()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `generarPDFRecortables()` --indirect_call--> `x()`  [INFERRED]
  server.js → public/vendor/tesseract/worker.min.js
- `precargarTodasLasGens()` --indirect_call--> `r()`  [INFERRED]
  public/app.js → public/vendor/tesseract/tesseract.min.js

## Import Cycles
- None detected.

## Communities (78 total, 32 thin omitted)

### Community 0 - "worker.min.js"
Cohesion: 0.15
Nodes (53): A(), b(), c(), e(), f(), G(), h(), i() (+45 more)

### Community 1 - "ejecutarToggleStatus"
Cohesion: 0.25
Nodes (7): Contexto, Control de tamaño de tarjeta en la galería (Chico/Normal/Grande), Fuera de alcance, Modelo de datos y estado, Modo Grande, Testing, UI

### Community 2 - "app.js"
Cohesion: 0.05
Nodes (51): abrirLoginModal(), abrirLoginOLogout(), abrirOpcionesPDF(), abrirPanelVariantes(), abrirWizardCarpetas(), actualizarBotonSesion(), aplicarModoVista(), aplicarTema() (+43 more)

### Community 3 - "server.js"
Cohesion: 0.06
Nodes (24): app, CARPETA_CACHE, CARPETA_RESPALDOS, CARPETAS_DEFAULT, carpetasConfig, clientes, CORTES_GEN, crypto (+16 more)

### Community 6 - "tesseract-core-lstm.wasm.js"
Cohesion: 0.07
Nodes (14): ci(), Da(), fi(), gi(), Kh(), R(), Rh(), Sa() (+6 more)

### Community 7 - "tesseract-core-simd-lstm.wasm.js"
Cohesion: 0.07
Nodes (14): ci(), Da(), fi(), gi(), Kh(), R(), Rh(), Sa() (+6 more)

### Community 10 - "esDesktop"
Cohesion: 0.24
Nodes (21): actualizarBotonesModo(), actualizarTarjetaProgreso(), cambiarModo(), cambiarTab(), cargarEstadisticas(), cargarEstadisticasSinMoverScroll(), cerrarGaleriaYVolver(), esDesktop() (+13 more)

### Community 11 - "wizardCapacidadSiguiente"
Cohesion: 0.16
Nodes (18): formatearRango(), pokemonEnGen(), wizardActualizarPreviewAjuste(), wizardActualizarTotalCapacidad(), wizardAjusteSiguiente(), wizardArmarPasoAjuste(), wizardArmarPasoCapacidad(), wizardArmarPasoNombres() (+10 more)

### Community 14 - "package.json"
Cohesion: 0.11
Nodes (18): express, node-fetch, author, dependencies, express, node-fetch, pdfkit, sharp (+10 more)

### Community 15 - "renderGaleria"
Cohesion: 0.24
Nodes (17): actualizarBotonEstado(), actualizarGalleryHeader(), anclaIdCliente(), cargarCarpetasConfig(), carpetaDe(), clearSearchTimer(), gridActivo(), handleSearchInput() (+9 more)

### Community 19 - "Modo "Todas seguidas" para configuración de carpetas"
Cohesion: 0.11
Nodes (17): Apertura de galería de una carpeta (~app.js:559-571), `/api/buscar` (server.js:287), `/api/carpetas-config` GET/POST (server.js:343, 567), `carpetaDe(p)` (app.js:74), `carpetas.json` (servidor), Cliente (`public/app.js`), Contexto, Fuera de alcance (a propósito) (+9 more)

### Community 21 - "Global Constraints"
Cohesion: 0.14
Nodes (13): Global Constraints, Modo "Todas Seguidas" para Carpetas — Implementation Plan, Self-Review Notes, Task 10: Wizard — paso "nombres", guardar, y botón "Atrás", Task 1: Server — data model, migration, validation, Task 2: Server — `/api/carpetas-config` + `/api/buscar` for ranges, Task 3: Server — PDF de recortables por rango, Task 4: Cliente — `cargarCarpetasConfig` y `carpetaDe` para el nuevo formato (+5 more)

### Community 22 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 23 - "Lh"
Cohesion: 0.14
Nodes (4): bi(), Lh(), Y(), Zh()

### Community 24 - "zb"
Cohesion: 0.42
Nodes (13): ac(), $b(), bc(), cc(), Hh(), Pb(), tb(), ub() (+5 more)

### Community 26 - "Fase 3 — Variantes en el PDF de recortables"
Cohesion: 0.25
Nodes (7): Caché e invalidación (`/api/pdf-carpetas`), Cambios, Contexto, Fase 3 — Variantes en el PDF de recortables, Fuera de alcance, `generarPDFRecortables(rutaSalida, opciones)` (`server.js`), Testing

### Community 27 - "mostrarToastError"
Cohesion: 0.18
Nodes (16): actualizarBadgePendientes(), actualizarTarjetaProgresoPendientes(), calcularIdsPendientes(), calcularIdsPendientesSilencioso(), cerrarWizardCarpetas(), descargarListaFaltantes(), descargarRecortablesPDF(), exportarColeccion() (+8 more)

### Community 28 - "d"
Cohesion: 0.29
Nodes (3): d(), h(), Za()

### Community 29 - "p"
Cohesion: 0.22
Nodes (10): e(), gb(), hb(), Ma(), Na(), Oa(), p(), Pa() (+2 more)

### Community 30 - "hi"
Cohesion: 0.29
Nodes (10): claveFechaLS(), claveLS(), detectarYCelebrarCompletado(), ejecutarToggleStatus(), getFechaISO(), getFechaRegistro(), guardarFechaRegistro(), lanzarConfeti() (+2 more)

### Community 31 - "kb"
Cohesion: 0.33
Nodes (7): Ab(), Db(), Eb(), kb(), Nb(), Ta(), Ua()

### Community 32 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 33 - "CLAUDE.md"
Cohesion: 0.22
Nodes (7): Architecture, Auth, Data files (not code, but load-bearing), Editing conventions, graphify, Running it, What this is

### Community 34 - "migrar-carpetas-a-bulk.js"
Cohesion: 0.25
Nodes (7): fs, idsCarpetas, path, raw, RUTA_INVENTARIO, rutaRespaldo, timestamp

### Community 41 - "Fase 2 — Selección de categorías de variantes (núcleo de tracking)"
Cohesion: 0.14
Nodes (13): Ajustes, Cambios en endpoints existentes, Cliente, Contexto, Fase 2 — Selección de categorías de variantes (núcleo de tracking), Fuera de alcance (a propósito, queda para Fase 3), Galería / ficha, Manejo de errores y edge cases (+5 more)

### Community 42 - "qb"
Cohesion: 0.33
Nodes (5): Ha(), Ia(), qb(), sb(), t()

### Community 44 - "qb"
Cohesion: 0.42
Nodes (13): ac(), $b(), bc(), cc(), Hh(), Pb(), tb(), ub() (+5 more)

### Community 52 - "Fase 3 — Variantes en el PDF de recortables — Plan de implementación"
Cohesion: 0.33
Nodes (5): Fase 3 — Variantes en el PDF de recortables — Plan de implementación, Global Constraints, Self-Review (hecho al escribir este plan), Task 1: `generarPDFRecortables()` variant-aware (orden, rango, y numeración), Task 2: Invalidación de caché consciente de `variantes-config.json`

### Community 53 - "d"
Cohesion: 0.29
Nodes (3): d(), h(), Za()

### Community 56 - "p"
Cohesion: 0.24
Nodes (9): e(), gb(), hb(), Ma(), Na(), Oa(), p(), Pa() (+1 more)

### Community 57 - "Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación"
Cohesion: 0.22
Nodes (8): Global Constraints, Reorganizar accesos rápidos y agrupar "Ajustes" — Plan de implementación, Self-Review (hecho al escribir este plan), Task 1: Ícono de Ajustes en el header mobile + sacar el atajo redundante de Métricas, Task 2: Reestructurar el markup de "Ajustes" en 3 secciones agrupadas, Task 3: CSS de las secciones agrupadas, Task 4: Chevron de navegación en las filas que abren un modal, Task 5: Bump de `CACHE_VERSION` y verificación visual end-to-end

### Community 58 - "Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes""
Cohesion: 0.25
Nodes (7): Accesos rápidos (Métricas / Cámara / Por acomodar / Ajustes), Affordance por fila: `›` solo en las que navegan, "Ajustes" agrupado en 3 secciones, Contexto, Fuera de alcance (a propósito), Reorganizar los accesos a Métricas/Cámara/Por acomodar/Ajustes y agrupar "Ajustes", Testing

### Community 59 - "kb"
Cohesion: 0.33
Nodes (7): Ab(), Db(), Eb(), kb(), Nb(), Ta(), Ua()

### Community 60 - "qb"
Cohesion: 0.33
Nodes (5): Ha(), Ia(), qb(), sb(), t()

### Community 62 - "Criterio de investigación: variantes de Pokémon con carta TCG propia"
Cohesion: 0.25
Nodes (7): Criterio de inclusión, Criterio de investigación: variantes de Pokémon con carta TCG propia, Evidencia positiva (formas incluidas), Formas confirmadas por arte pero bloqueadas por falta de datos en PokeAPI, Formas investigadas y descartadas, Historial del criterio, Notas

### Community 63 - "Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.)"
Cohesion: 0.22
Nodes (8): Contexto, Esquema de cada entrada variante, Fase 1 — Base de datos de variantes de Pokémon (Megas, formas regionales, Gigamax, etc.), `fetch_pokemon.js`, Fuera de alcance (a propósito, queda para la Fase 2), Modelo de datos, Proceso de investigación, Testing

### Community 64 - "Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación"
Cohesion: 0.08
Nodes (24): Addendum 2 — ampliar el criterio de "formas alternativas" a arte distinto, Addendum — hallazgos de la revisión final + investigación propia del usuario, Fase 1 — Base de datos de variantes de Pokémon — Plan de implementación, Formato de `variantes_lista.json`, Global Constraints, Self-Review del Addendum 2, Self-Review del addendum (Tareas 7-11), Self-Review (hecho al escribir este plan) (+16 more)

### Community 65 - "fetch_variantes.js"
Cohesion: 0.50
Nodes (4): buscarImagenesDuplicadas(), crypto, fetchVariantes(), fs

### Community 66 - "Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación"
Cohesion: 0.33
Nodes (5): Control de tamaño de tarjeta en la galería (Chico/Normal/Grande) — Plan de implementación, Global Constraints, Self-Review (hecho al escribir este plan), Task 1: Renombrar a `modoVista`, persistir en `localStorage`, y el selector de 3 botones, Task 2: Modo Grande — menos columnas + tipos y fecha en la tarjeta

### Community 68 - "Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación"
Cohesion: 0.20
Nodes (9): Fase 2 — Selección de categorías de variantes (núcleo de tracking) — Plan de implementación, Global Constraints, Limitación conocida (no cubierta por este plan), Self-Review (hecho al escribir este plan), Task 1: `variantes-config.json` + vista derivada `pokemonEfectivo()` en el servidor, Task 2: Endpoints `/api/variantes-config` + integrar `pokemonEfectivo()` en `/api/buscar` y `/api/estadisticas`, Task 3: Corregir la numeración de variantes en galería/ficha + badge de categoría, Task 4: Panel "Variantes" en Ajustes (+1 more)

### Community 69 - "p"
Cohesion: 0.25
Nodes (8): x(), anclaId(), descargarImagen(), generarPDFRecortables(), mapConcurrencia(), PDFDocument, pokemonEfectivo(), sharp

### Community 70 - "escribirJSONAtomico"
Cohesion: 0.40
Nodes (5): escribirJSONAtomico(), guardarCarpetasConfig(), guardarInventario(), guardarVariantesConfig(), respaldoAutomatico()

### Community 71 - "carpetasConfigValida"
Cohesion: 0.67
Nodes (3): carpetasConfigValida(), nombresUnicos(), pokemonPorGens()

### Community 73 - "sesionValida"
Cohesion: 0.67
Nodes (3): parsearCookies(), requiereLogin(), sesionValida()

### Community 76 - "ai"
Cohesion: 0.17
Nodes (3): ai(), Sh(), Ya()

### Community 77 - "iniciarBucleOCR"
Cohesion: 0.67
Nodes (4): agregarAlHistorial(), detenerCamara(), iniciarBucleOCR(), toggleCamaraOCR()

## Knowledge Gaps
- **190 isolated node(s):** `fs`, `fs`, `crypto`, `fs`, `path` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `g()` connect `worker.min.js` to `carpetasConfigValida`, `esDesktop`, `wizardCapacidadSiguiente`, `qb`, `qb`?**
  _High betweenness centrality (0.208) - this node is a cross-community bridge._
- **Why does `a()` connect `worker.min.js` to `qb`, `A`, `A`, `p`, `qb`, `p`?**
  _High betweenness centrality (0.190) - this node is a cross-community bridge._
- **Why does `A()` connect `A` to `worker.min.js`, `K`, `tesseract-core-simd-lstm.wasm.js`, `Q`, `J`, `di`, `d`, `Lh`, `p`, `zb`, `kb`, `qb`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `fs`, `fs`, `crypto` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0512987012987013 - nodes in this community are weakly interconnected._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `V` be split into smaller, more focused modules?**
  _Cohesion score 0.07007575757575757 - nodes in this community are weakly interconnected._