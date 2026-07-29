# Control de tamaño de tarjeta en la galería (Chico/Normal/Grande)

## Contexto

Hoy la galería tiene un botón único "📂 Acomodar" (`btn-acomodar`/`btn-acomodar-d`,
`toggleModoAcomodar()` en `app.js`) que alterna entre el grid normal y un modo
compacto (fila angosta, imagen 32×32, 2 columnas) pensado para ubicar cartas
rápido. El usuario quiere reemplazar ese botón por un control de 3 posiciones
tipo el selector de tamaño de ícono de Windows Explorer — Chico, Normal, Grande
— donde "Chico" es exactamente el modo "Acomodar" de hoy (mismo comportamiento,
solo se renombra), y "Grande" es un modo nuevo.

Confirmado con el usuario durante el brainstorming:

- El control es **3 iconos en fila**, uno siempre marcado como activo — no un
  slider arrastrable (más simple de implementar, más cómodo en celular).
- El modo **Grande** no es solo "más grande": la tarjeta agrega **tipos** (pills
  de color, mismo criterio que ya usa la ficha de detalle vía `infoTipo()`) y
  la **fecha de registro** (si la carta está conseguida) directamente en la
  tarjeta de la galería — datos que hoy solo se ven abriendo la ficha.
- La elección de tamaño **persiste en `localStorage`** (mismo criterio que
  `temaPreferido`) — se aplica al cargar la app, no se reinicia solo por
  cambiar de generación/carpeta.

## Modelo de datos y estado

- `modoAcomodar` (booleano, `app.js:268`) se reemplaza por `modoVista` (string:
  `'chico' | 'normal' | 'grande'`).
- Nueva clave de `localStorage`: `vistaGaleriaPreferida` — guarda el valor de
  `modoVista`, se lee al boot (mismo patrón que `temaActual = localStorage.getItem('temaPreferido') || 'auto'`)
  y se aplica antes del primer render de galería.
- La clase CSS que hoy es `.gallery-grid.modo-acomodar` se renombra a
  `.gallery-grid.vista-chico` (mismas reglas, sin cambiar su comportamiento) y
  se agrega `.gallery-grid.vista-grande` (reglas nuevas).
- `cerrarGaleriaYVolver()` (que hoy resetea `modoAcomodar = false` al salir de
  una galería) **deja de resetear el tamaño** — el tamaño es una preferencia
  persistente del dispositivo, no un estado de la vista actual (mismo criterio
  que el tema, que tampoco se resetea al navegar).

## UI

- `btn-acomodar`/`btn-acomodar-d` (los dos botones, mobile y desktop) se
  reemplazan por un grupo de 3 botones pequeños en el mismo lugar del layout,
  con un ícono o abreviatura por tamaño (a definir el glifo exacto al
  implementar — ej. algo visualmente distinto por tamaño, no necesariamente
  emoji de tamaño de fuente). El botón del tamaño activo se marca con la
  misma clase `.active` que ya usan los filtros "todos/tenemos/faltan"
  (mismo patrón visual ya establecido en la app, no uno nuevo).
- Tocar un botón del grupo llama a una función que fija `modoVista`, guarda en
  `localStorage`, actualiza las clases del grid, y re-renderiza la galería
  actual si hay una abierta (mismo tipo de refresco que ya hace
  `toggleModoAcomodar()` hoy).

## Modo Grande

- Menos columnas por breakpoint que "Normal" — la cantidad exacta por
  breakpoint (mobile/tablet/desktop) se define al implementar, buscando que la
  tarjeta tenga espacio real para los datos nuevos sin quedar apretada.
- Contenido adicional de la tarjeta (además de imagen/nombre/R#/N#/badge que
  ya tiene toda tarjeta):
  - **Tipos**: pills de color, mismo componente/estilo que ya arma
    `mostrarFicha()` vía `infoTipo(t)` — mismo emoji + color + label por tipo,
    no un estilo nuevo.
  - **Fecha de registro**: mismo texto que ya muestra la ficha
    (`Registrado el <fecha>`) cuando la carta está conseguida y tiene fecha
    guardada (`getFechaRegistro(p.id)`); si no está conseguida, no se muestra
    nada en ese lugar (no hay fecha que mostrar).
- Se aplica tanto en mobile como en desktop, cada uno con su propio ajuste de
  columnas — no es un modo exclusivo de un layout.

## Fuera de alcance

- Cambios al modo "Chico" (comportamiento idéntico al "Acomodar" de hoy, solo
  cambia el nombre interno de la clase/variable).
- Cambios a `verPendientesAcomodar()`/la vista "Por acomodar" más allá de que
  siga funcionando con el `modoVista` que el usuario tenga elegido en ese
  momento (no tiene un tamaño propio distinto).
- Cambios al PDF de recortables, a `/api/estadisticas`, o a cualquier dato del
  servidor — esto es 100% presentación en el cliente.

## Testing

Sin suite de tests — verificación manual en navegador (esta es una tarea de
cliente, no tiene sentido probarla por `curl`):

- Con `localStorage` vacío, la app arranca en "Normal" (comportamiento actual,
  cero regresión).
- Elegir "Chico" se ve y comporta exactamente igual que el actual "Acomodar".
- Elegir "Grande" muestra tipos + fecha (si está conseguida) en cada tarjeta,
  con menos columnas que "Normal", en mobile y en desktop.
- Cerrar la app (recargar la página) y confirmar que el tamaño elegido
  persiste, tanto en mobile como en desktop.
- Cambiar de generación/carpeta sin cerrar la galería no debería resetear el
  tamaño elegido.
