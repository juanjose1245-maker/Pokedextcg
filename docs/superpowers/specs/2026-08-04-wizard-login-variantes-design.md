# Login y variantes como primeros pasos del wizard de carpetas

## Contexto

El wizard de carpetas (`abrirWizardCarpetas`) se abre solo la primera vez que
alguien entra a la app (`carpetasWizardVisto` en `localStorage`), y también
manualmente desde Ajustes. Hoy el primer paso es "modo de acomodo", y recién
al final, al tocar "Guardar", el POST a `/api/carpetas-config` puede fallar
con 401 si no hay sesión — el usuario completa las 6 pantallas del wizard y
recién ahí se entera de que necesitaba loguearse, con un toast de error en
vez de un camino claro para resolverlo.

Confirmado con el usuario durante el brainstorming: el wizard debe empezar
pidiendo la contraseña (logueando ahí mismo), después preguntar por las
categorías de variantes, y recién ahí seguir con el wizard tal cual existe
hoy (modo → formato → cantidad → capacidad → ajuste → nombres).

## Login como gate de apertura, no como paso nuevo

**Hallazgo clave revisando el código:** ya existe `requiereSesion(accion)`
(`app.js` línea ~205) — si hay sesión activa corre `accion()` directo; si no,
abre el modal de login existente (`abrirLoginModal`, ya con su propio
manejo de error y su propio botón "Cancelar") y encola `accion` para
reintentarla sola apenas el login sea exitoso. Es el mismo patrón que ya usa
`toggleCategoriaVariante` en Ajustes → Variantes.

En vez de construir un paso "clave" nuevo dentro del wizard (duplicando
markup/CSS del login modal), `abrirWizardCarpetas()` pasa a envolver la
apertura real del wizard en `requiereSesion`:

```js
function abrirWizardCarpetas() {
    cerrarAjustes();
    localStorage.setItem('carpetasWizardVisto', '1');
    requiereSesion(() => {
        wizardMostrarPasoVariantes();
        document.getElementById('wizard-carpetas-modal').classList.add('open');
    });
}
```

Efectos de este cambio:
- **Si ya hay sesión** (reabriste el wizard desde Ajustes más tarde, por
  ejemplo): el paso de login se salta solo, va directo a variantes — cumple
  "si ya tenés sesión no te lo vuelve a pedir".
- **Si no hay sesión**: se abre el login modal existente, sin ningún modal
  del wizard visible todavía. Al loguearse con éxito, el wizard se abre
  automáticamente arrancando en el paso "variantes". Si cancela el login,
  el wizard nunca llega a abrirse — comportamiento correcto, no hace falta
  nada especial.
- `localStorage.setItem('carpetasWizardVisto', '1')` se mueve al principio
  de `abrirWizardCarpetas()` (hoy solo se marca al cerrar el wizard, en
  `cerrarWizardCarpetas`). Así, si alguien cancela el login en el primer
  arranque automático, no le vuelve a insistir en cada recarga — mismo
  espíritu que ya documenta el comentario existente ("si lo cierra sin
  terminar, no vuelve a insistir").

**Fuera de alcance:** `wizardGuardar()` (el POST final de `/api/carpetas-config`)
no se toca — con este cambio, para cuando se llega ahí la sesión siempre
existe (se pidió al abrir el wizard), y la sesión dura 30 días
(`SESION_DURACION_MS` en `server.js`), así que no hay escenario realista de
que expire a mitad de una sesión de wizard. Envolverlo también en
`requiereSesion` sería código sin ningún caso real que lo dispare.

## Nuevo paso "variantes"

Un paso nuevo, primero en aparecer dentro del wizard (después del gate de
login, antes de "modo"), con las mismas 5 categorías que ya existen en
Ajustes → Variantes (`CATEGORIAS_VARIANTES_INFO` en `app.js`): formas
regionales, Megaevolución, Regresión Primigenia, Gigamax, formas
alternativas.

**Reuso, no duplicación:** el bloque de checkboxes que genera
`abrirPanelVariantes()` hoy (el `.map(...).join('')` sobre
`CATEGORIAS_VARIANTES_INFO`, línea ~1687) se extrae a una función compartida
`renderVariantesChecks(elementId)`, usada tanto por `abrirPanelVariantes()`
(target `variantes-checks`, modal de Ajustes) como por el nuevo paso del
wizard (target `wizard-variantes-checks`). El `onchange` de cada checkbox
sigue llamando a `toggleCategoriaVariante(cat, checked)` sin cambios — esa
función **ya** maneja sesión (`requiereSesion` internamente, aunque acá
nunca hace falta porque el login ya pasó), ya persiste en el server, y ya
refresca `dataGlobalCache` vía `cargarEstadisticasSinMoverScroll()` después
de guardar. Por eso los pasos siguientes del wizard (`cantidad`, que usa
`pokemonEnGen()` → lee de `dataGlobalCache`) automáticamente calculan la
capacidad ya con las variantes recién elegidas, sin ningún cambio adicional.

```js
function wizardMostrarPasoVariantes() {
    renderVariantesChecks('wizard-variantes-checks');
    wizardMostrarPaso('variantes');
}
```

Markup nuevo en `index.html`, como paso del wizard (mismo patrón visual que
los demás `wizard-paso`, con nav "Siguiente →" — sin "← Atrás" porque es el
primer paso visible, igual que hoy "modo" tampoco lo tiene):

```html
<div class="wizard-paso" id="wizard-paso-variantes" style="display:none;">
    <div class="pdf-opciones-label">¿Contás alguna de estas variantes en tu colección?</div>
    <div id="wizard-variantes-checks"></div>
    <div class="wizard-nota">💡 Podés dejarlas todas sin marcar y activarlas después desde Ajustes.</div>
    <div class="wizard-nav">
        <button type="button" class="wizard-btn-siguiente" onclick="wizardMostrarPaso('modo')">Siguiente →</button>
    </div>
</div>
```

`wizardMostrarPaso(paso)` agrega `'variantes'` a la lista de pasos que
oculta/muestra:

```js
['variantes','modo','formato','cantidad','capacidad','ajuste','nombres']
```

## Fuera de alcance

- Cualquier cambio a los pasos existentes del wizard (modo, formato,
  cantidad, capacidad, ajuste, nombres) — siguen exactamente igual.
- El modal de login en sí (`login-modal`, `intentarLogin()`) — se reusa tal
  cual, cero cambios.
- El panel de Ajustes → Variantes (`variantes-modal`) — sigue funcionando
  igual, solo su generación de checkboxes pasa a compartir código con el
  wizard vía `renderVariantesChecks`.
- Forzar login para navegar/mirar la colección — sigue sin pedir sesión,
  intacto (`CLAUDE.md`: los endpoints de lectura son siempre abiertos).
- `wizardGuardar()` — ver razón arriba.

## Testing

Sin suite de tests — verificación manual en navegador:

- Perfil nuevo (sin `carpetasWizardVisto` en localStorage, sin sesión): al
  cargar la app, a los 600ms se abre el login (no el wizard). Cancelarlo no
  vuelve a insistir al recargar la página.
- Mismo perfil, esta vez logueándose: tras loguear con éxito, se abre el
  wizard directo en el paso "variantes" (no "modo").
- Marcar/desmarcar una categoría en el paso "variantes" del wizard la
  persiste igual que en Ajustes → Variantes (confirmar recargando y
  abriendo Ajustes → Variantes, debe mostrar el mismo estado).
- Activar una variante en el paso "variantes" y después, en "cantidad" /
  "capacidad", confirmar que los totales por generación ya incluyen esa
  variante (comparar contra `/api/estadisticas` con la categoría activa).
- Reabrir el wizard desde Ajustes con sesión ya iniciada: arranca directo en
  "variantes", sin pedir login de nuevo.
- El resto del wizard (formato en adelante) funciona exactamente igual que
  antes de este cambio.
- Bump de `CACHE_VERSION` en `sw.js` (se tocan `index.html`/`app.js`).
