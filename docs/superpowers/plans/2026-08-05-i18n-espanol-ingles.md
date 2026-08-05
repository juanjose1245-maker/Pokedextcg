# Internacionalización español/inglés — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar inglés como segundo idioma de la UI (español sigue siendo
el default), con detección automática por navegador, override manual desde
Ajustes, y mensajes de error del servidor traducidos client-side.

**Architecture:** Un diccionario nuevo (`public/i18n.js`) con claves
`área.elemento` mapeadas a texto en `es`/`en`, más una función `t(clave,
vars?)`. El texto estático de `index.html` pasa a `data-i18n="clave"`; el
texto generado en `app.js` (toasts, render de galería/sidebar/modales) pasa
a llamar `t('clave')` en vez de tener el string en español hardcodeado. Los
~16 mensajes de error de `server.js` pasan de texto a códigos cortos, que
el cliente traduce con el mismo diccionario (sección `error.*`).

**Tech Stack:** Vanilla JS, sin librerías de i18n — diccionario propio,
mismo estilo que el resto del proyecto.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-08-05-i18n-espanol-ingles-design.md`.
- **Español sigue siendo el default y no puede cambiar de texto** — cada
  valor `es` del diccionario debe ser **exactamente** el string que hoy
  está hardcodeado (copiado, no reescrito), para que un usuario en español
  no note ninguna diferencia.
- Naming de claves: `área.elemento` (ej. `ajustes.tema`,
  `login.titulo`, `wizard.pasoVariantes.pregunta`,
  `error.password_incorrecta`). Minúsculas, sin espacios ni tildes en la
  clave (el VALOR sí lleva tildes normalmente, la clave no).
- `I18N.es` es siempre fallback si falta una clave en `en` — `t()` nunca
  debe poder devolver `undefined` para una clave real del diccionario.
- **Gotcha del proyecto:** cualquier tarea que toque `public/index.html` o
  `public/app.js` (o agregue `public/i18n.js`, que también es parte del
  "app shell") DEBE bumpear `CACHE_VERSION` en `public/sw.js` en el mismo
  commit.
- Fuera de alcance (ver spec): el PDF de recortables, un tercer idioma,
  reglas de pluralización genéricas, traducir `docs/`/`README.md`/comentarios.
- Sin suite de tests — verificación manual con comandos concretos y, donde
  sea posible, un script de Node standalone que cargue el diccionario y
  corra chequeos sin necesitar navegador.

---

## Task 1: Diccionario `public/i18n.js` — extracción completa + traducción

**Spec:** secciones "Diccionario y función `t()`".

**Files:**
- Create: `public/i18n.js`
- Modify: `public/index.html` (agregar el `<script>` tag, nada más — no
  tocar ningún texto todavía, eso es la Task 2)
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: nada de otras tareas (es la primera).
- Produces: `I18N` (objeto global `{es:{...}, en:{...}}`), `t(clave, vars)`,
  `idiomaActual`, `detectarIdiomaNavegador()`. Las Tasks 2-5 consumen
  `t()`/`I18N`/`idiomaActual` sin modificarlas — solo agregan más claves al
  mismo objeto si encuentran algo que Task 1 no cubrió (ver Step 4).

Este task es la base de todo el trabajo: se lee `public/index.html` y
`public/app.js` completos y se extrae **cada string visible para el
usuario** (texto de botones/labels/títulos, placeholders, contenido de
`mostrarToast*`, texto armado en template literals para tarjetas/modales/
sidebar). NO se incluyen: comentarios de código, `console.log`/`console.warn`
de debug, nombres de variables/funciones, claves de `localStorage`, ni
texto que ya esté en `public/i18n.js` mismo.

- [ ] **Step 1: Extraer y catalogar cada string, con su clave**

Leer `public/index.html` de punta a punta y `public/app.js` de punta a
punta. Por cada string visible al usuario, asignarle una clave siguiendo el
patrón `área.elemento` de los Global Constraints. Ejemplos concretos ya
resueltos (usar como referencia de estilo y para no re-derivar estas 6):

| Clave | ES (copiado literal del código) | EN |
|---|---|---|
| `ajustes.tema` | `Tema` | `Theme` |
| `login.titulo` | `Iniciar sesión` | `Log in` |
| `login.sub` | `Necesitas iniciar sesión para hacer cambios (marcar cartas, importar, etc). Ver tu colección no requiere sesión.` | `You need to log in to make changes (mark cards, import, etc). Viewing your collection doesn't require a session.` |
| `wizard.pasoVariantes.pregunta` | `¿Contás alguna de estas variantes en tu colección?` | `Do you have any of these variants in your collection?` |
| `toast.sesionIniciada` | `Sesión iniciada.` | `Session started.` |
| `error.password_incorrecta` | `Contraseña incorrecta.` | `Incorrect password.` |

Para strings con contenido dinámico interpolado (ej. plantillas con
`${variable}` en medio del texto), la clave lleva placeholders `{nombre}`
en vez del `${...}` original, ej.:
```
"Entre todas suman ${total} espacios, y hacen falta ${necesario} para cubrir toda la colección."
```
se cataloga como clave `wizard.error.capacidadInsuficiente` con valor
`"Entre todas suman {total} espacios, y hacen falta {necesario} para cubrir toda la colección."`
(y el equivalente en inglés con los mismos nombres de variable entre
llaves).

- [ ] **Step 2: Escribir `public/i18n.js`**

```js
const I18N = {
    es: {
        // ... una entrada por cada clave catalogada en el Step 1, en
        // español EXACTAMENTE igual al string que hoy está hardcodeado
        // (copiar y pegar el string original tal cual, no reescribirlo)
    },
    en: {
        // ... misma clave, traducción al inglés
    }
};

let idiomaActual = localStorage.getItem('idiomaPreferido') || detectarIdiomaNavegador();

// "es" si el navegador está en español (cualquier variante: es, es-AR,
// es-MX, etc.), "en" para cualquier otro idioma — solo 2 idiomas
// soportados, no hace falta detectar más granularidad que esa.
function detectarIdiomaNavegador() {
    const lang = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
    return lang.startsWith('es') ? 'es' : 'en';
}

// t('clave', {n: 5}) → interpola {n} dentro del string encontrado.
// I18N.es es el fallback si falta la clave en el idioma activo (nunca
// debe devolver undefined para una clave real del diccionario). Si la
// clave no existe en ningún lado, devuelve la clave misma (para que un
// error de tipeo se note en pantalla en vez de mostrar texto vacío).
function t(clave, vars) {
    let texto = (I18N[idiomaActual] && I18N[idiomaActual][clave]) || I18N.es[clave] || clave;
    if (vars) for (const [k, v] of Object.entries(vars)) texto = texto.replaceAll(`{${k}}`, v);
    return texto;
}
```

- [ ] **Step 2b: Confirmar que cada clave `es` es copia exacta del string original**

Este paso es obligatorio, no opcional: para al menos 15 claves elegidas al
azar entre las extraídas, comparar el valor `es` en `i18n.js` contra el
string original en `index.html`/`app.js` con un diff carácter por carácter
(no "se parece", exacto — mismos signos de puntuación, mismas mayúsculas,
mismos espacios). Documentar en el reporte cuáles 15 se compararon y que
coincidieron.

- [ ] **Step 3: Agregar el `<script>` tag en `public/index.html`**

En `public/index.html`, antes de `<script src="app.js"></script>` (línea
~530):
```html
<script src="i18n.js"></script>
<script src="app.js"></script>
```

(`i18n.js` no depende de nada del DOM ni de `app.js` — puede cargar antes
sin problema, y `app.js` necesita `t()`/`I18N` disponibles desde su primera
línea ejecutada.)

- [ ] **Step 4: Bump `CACHE_VERSION`**

En `public/sw.js`, sumar 1 al número actual (revisar el valor real antes de
escribir el nuevo, no asumir cuál es).

También hay que asegurarse de que `sw.js` cachee `i18n.js` como parte del
app shell (mismo tratamiento que `app.js`/`styles.css`) — revisar si
`sw.js` lista archivos del shell por nombre explícito o los cachea por
patrón/en runtime, y agregar `i18n.js` a esa lista si es por nombre
explícito.

- [ ] **Step 5: Verificar**

```bash
node --check public/i18n.js && echo "i18n.js: sintaxis OK"

# t() funciona básico, standalone (sin navegador)
node -e "
global.navigator = { language: 'en' };
global.localStorage = { getItem: () => null };
$(cat public/i18n.js)
console.log('idioma detectado (navigator.language=en):', idiomaActual);
console.log('t(ajustes.tema):', t('ajustes.tema'));
console.log('t(clave inexistente):', t('esto.no.existe'));
"

# Todas las claves de 'es' existen también en 'en' (ninguna quedó a medio traducir)
node -e "
$(cat public/i18n.js)
const faltantes = Object.keys(I18N.es).filter(k => !(k in I18N.en));
console.log('claves sin traducir a inglés:', faltantes.length ? faltantes : 'ninguna (OK)');
"
```

Expected: `i18n.js: sintaxis OK`; `idioma detectado (navigator.language=en): en`;
`t(ajustes.tema): Theme`; `t(clave inexistente): esto.no.existe`; `claves
sin traducir a inglés: ninguna (OK)`.

No hay nada para probar visualmente todavía en esta tarea — `i18n.js`
existe y funciona pero nada lo usa aún (eso empieza en la Task 2).

- [ ] **Step 6: Commit**

```bash
git add public/i18n.js public/index.html public/sw.js
git commit -m "Agregar diccionario de traducciones ES/EN (i18n.js) — todavía sin conectar a la UI"
```

---

## Task 2: Conectar `index.html` al diccionario

**Spec:** sección "Texto estático de `index.html`".

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js` (agregar `aplicarIdioma()`)
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `I18N`/`t()`/`idiomaActual` de la Task 1 (ya mergeada) — usa
  las claves ya catalogadas ahí, no inventa claves nuevas para texto
  estático de `index.html` (si Task 1 se hizo bien, ya están todas).
- Produces: `aplicarIdioma()` — la Task 4 la reutiliza tal cual para el
  botón de Ajustes; la Task 3 NO la modifica, solo la Task 4.

- [ ] **Step 1: Agregar `data-i18n` a cada nodo de texto estático en `index.html`**

Por cada string catalogado en la Task 1 que vive en `index.html` (no en
`app.js`), agregar el atributo correspondiente sin sacar el texto en
español (queda como contenido/fallback):

```html
<!-- Antes -->
<span class="ajustes-item-titulo">Tema</span>
<!-- Después -->
<span class="ajustes-item-titulo" data-i18n="ajustes.tema">Tema</span>
```

Para `placeholder`:
```html
<!-- Antes -->
<input ... placeholder="Contraseña">
<!-- Después -->
<input ... placeholder="Contraseña" data-i18n-placeholder="login.password.placeholder">
```
Mismo criterio para `title` (`data-i18n-title`) donde aplique.

- [ ] **Step 2: Agregar `aplicarIdioma()` en `public/app.js`**

Cerca de `aplicarTema()` (buscar `function aplicarTema()`):

```js
function aplicarIdioma() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });
}
```

- [ ] **Step 3: Llamarla en `window.onload`, junto a `aplicarTema()`**

En `public/app.js`, dentro de `window.onload = async () => { ... }`:

Antes:
```js
    sincronizarGrids();
    aplicarTema();
```
Después:
```js
    sincronizarGrids();
    aplicarTema();
    aplicarIdioma();
```

- [ ] **Step 4: Bump `CACHE_VERSION`**

- [ ] **Step 5: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# Cantidad de nodos con data-i18n debe ser razonable (no cero, no duplicando
# el total de líneas del archivo)
grep -co 'data-i18n' public/index.html

# aplicarIdioma existe y se llama desde window.onload
grep -c "^function aplicarIdioma" public/app.js
grep -A5 "window.onload = async" public/app.js | grep -c "aplicarIdioma()"
```

Expected: `app.js: sintaxis OK`; el conteo de `data-i18n` es mayor a 0 y
cercano a la cantidad de strings catalogados en la Task 1 para
`index.html`; los últimos dos `grep -c` dan `1` cada uno.

Verificación manual en navegador (instancia Docker de prueba, o local):
forzar `navigator.language` en inglés desde DevTools (o
`localStorage.setItem('idiomaPreferido','en')` y recargar) — todo el texto
estático de Ajustes/login/wizard debe verse en inglés.

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/app.js public/sw.js
git commit -m "Conectar el texto estático de index.html al diccionario de traducciones"
```

---

## Task 3: Conectar el texto generado por JS en `app.js`

**Spec:** sección "Texto generado por JS (`app.js`)".

**Files:**
- Modify: `public/app.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `t()`/`I18N` de la Task 1. Si en el proceso de esta tarea
  aparece un string que la Task 1 no catalogó (posible, dado el tamaño),
  se agrega la clave nueva a `public/i18n.js` en el mismo commit de esta
  tarea (con su traducción real, no un placeholder) — no se deja
  hardcodeado "por ahora".
- Produces: nada nuevo para otras tareas.

- [ ] **Step 1: Reemplazar cada literal en español por `t('clave')` en `public/app.js`**

Recorrer cada uno de los strings catalogados en la Task 1 que viven en
`app.js` (toasts, contenido de `innerHTML` con template literals para
tarjetas de galería/sidebar/modales/wizard) y reemplazar el literal
hardcodeado por la llamada a `t()` correspondiente. Patrón:

```js
// Antes
mostrarToastError('Todas las carpetas necesitan un nombre.');
// Después
mostrarToastError(t('wizard.error.nombreFaltante'));
```

Para strings con variables interpoladas:
```js
// Antes
mostrarToastError(`Entre todas suman ${total} espacios, y hacen falta ${necesario} para cubrir toda la colección.`);
// Después
mostrarToastError(t('wizard.error.capacidadInsuficiente', { total, necesario }));
```

No tocar: comentarios de código, `console.*`, claves de `localStorage`,
nombres de clases CSS, valores de `data-*` que no sean texto visible (ej.
`data-cat="${c.key}"` no se traduce, es un identificador interno).

- [ ] **Step 2: Bump `CACHE_VERSION`**

- [ ] **Step 3: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

# No debe quedar ningún string en español obviamente hardcodeado dentro de
# mostrarToast*(...) — grep busca la señal más común (tildes/ñ dentro de
# comillas simples/backticks pasadas como argumento directo)
grep -nE "mostrarToast(Error|Info|Deshacer|Actualizacion)\('[^']*[áéíóúñÁÉÍÓÚÑ]" public/app.js

# Todas las claves nuevas que se hayan agregado en esta tarea (si las hubo)
# están traducidas en ambos idiomas
node -e "
$(cat public/i18n.js)
const faltantes = Object.keys(I18N.es).filter(k => !(k in I18N.en));
console.log('claves sin traducir a inglés:', faltantes.length ? faltantes : 'ninguna (OK)');
"
```

Expected: `app.js: sintaxis OK`; el primer `grep` no devuelve nada (sin
coincidencias — si devuelve algo, son strings que quedaron sin migrar);
`claves sin traducir a inglés: ninguna (OK)`.

Verificación manual en navegador con `idiomaPreferido=en`: togglear una
categoría de variantes, intentar guardar el wizard sin nombre, etc. — los
toasts de error/info deben verse en inglés.

- [ ] **Step 4: Commit**

```bash
git add public/app.js public/i18n.js public/sw.js
git commit -m "Conectar los toasts y el contenido dinámico de app.js al diccionario de traducciones"
```

---

## Task 4: Selector de idioma en Ajustes + detección automática

**Spec:** secciones "Selector de idioma en Ajustes" y contexto de detección
automática.

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `aplicarIdioma()` (Task 2), `idiomaActual`/`I18N` (Task 1).
- Produces: `toggleIdioma()` — no consumida por ninguna tarea posterior de
  este plan.

- [ ] **Step 1: Agregar el botón de idioma en Ajustes, en `public/index.html`**

Junto al botón de Tema (buscar `id="btn-tema-ajustes"`):

Antes:
```html
                <button class="ajustes-item" onclick="toggleTema()" id="btn-tema-ajustes">
                    <span class="ajustes-item-icon">🌓</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Tema</span>
                        <span class="ajustes-item-sub" id="btn-tema-ajustes-sub">Auto (según el sistema)</span>
                    </span>
                </button>
```
Después (agregar inmediatamente después, como hermano):
```html
                <button class="ajustes-item" onclick="toggleTema()" id="btn-tema-ajustes">
                    <span class="ajustes-item-icon">🌓</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo">Tema</span>
                        <span class="ajustes-item-sub" id="btn-tema-ajustes-sub">Auto (según el sistema)</span>
                    </span>
                </button>
                <button class="ajustes-item" onclick="toggleIdioma()" id="btn-idioma-ajustes">
                    <span class="ajustes-item-icon">🌐</span>
                    <span class="ajustes-item-texto">
                        <span class="ajustes-item-titulo" data-i18n="ajustes.idioma">Idioma</span>
                        <span class="ajustes-item-sub" id="btn-idioma-ajustes-sub">Español</span>
                    </span>
                </button>
```

(Agregar la clave `ajustes.idioma` → ES: `"Idioma"`, EN: `"Language"` a
`public/i18n.js` en esta misma tarea si no quedó ya cargada en la Task 1.)

- [ ] **Step 2: Agregar `toggleIdioma()` en `public/app.js`, junto a `toggleTema()`**

```js
function toggleIdioma() {
    idiomaActual = idiomaActual === 'es' ? 'en' : 'es';
    localStorage.setItem('idiomaPreferido', idiomaActual);
    aplicarIdioma();
    const sub = document.getElementById('btn-idioma-ajustes-sub');
    if (sub) sub.textContent = idiomaActual === 'es' ? 'Español' : 'English';
}
```

- [ ] **Step 3: Sincronizar el sub-label del botón al cargar, dentro de `aplicarIdioma()`**

En `public/app.js`, agregar al final de `aplicarIdioma()` (definida en la
Task 2):

```js
    const subIdioma = document.getElementById('btn-idioma-ajustes-sub');
    if (subIdioma) subIdioma.textContent = idiomaActual === 'es' ? 'Español' : 'English';
```

(Así el sub-label queda correcto también en el primer render, no solo
después de tocar el botón.)

- [ ] **Step 4: Bump `CACHE_VERSION`**

- [ ] **Step 5: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"
grep -c 'id="btn-idioma-ajustes"' public/index.html
grep -c "^function toggleIdioma" public/app.js
node -e "
$(cat public/i18n.js)
console.log('ajustes.idioma es:', I18N.es['ajustes.idioma']);
console.log('ajustes.idioma en:', I18N.en['ajustes.idioma']);
"
```

Expected: `app.js: sintaxis OK`; los dos `grep -c` dan `1`; `ajustes.idioma
es: Idioma`; `ajustes.idioma en: Language`.

Verificación manual en navegador:
- Con `navigator.language` en inglés (DevTools) y sin `idiomaPreferido` en
  `localStorage`: la app arranca en inglés.
- Con `navigator.language` en español (o cualquier variante `es-*`):
  arranca en español.
- Tocar el botón de idioma en Ajustes cambia toda la UI visible al toque
  (sin recargar) y el sub-label pasa de "Español" a "English" (o viceversa).
- Recargar la página después de tocarlo mantiene el idioma elegido
  (persistencia en `localStorage`).

- [ ] **Step 6: Commit**

```bash
git add public/index.html public/app.js public/i18n.js public/sw.js
git commit -m "Agregar selector de idioma en Ajustes y detección automática por navegador"
```

---

## Task 5: Errores del servidor — de texto a códigos traducidos

**Spec:** sección "Errores del servidor: de texto a códigos".

**Files:**
- Modify: `server.js`
- Modify: `public/app.js`
- Modify: `public/i18n.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `t()`/`I18N` de la Task 1.
- Produces: nada nuevo para otras tareas — última tarea del plan.

- [ ] **Step 1: Catalogar los ~16 mensajes de error de `server.js` y asignarles código**

Buscar en `server.js` cada ocurrencia de `error: '<texto>'` dentro de una
respuesta `res.status(...).json(...)`. Por cada una, elegir un código
`snake_case` corto y descriptivo. Ejemplos ya resueltos (usar como
referencia de estilo):

| Texto original (server.js) | Código nuevo |
|---|---|
| `Contraseña incorrecta.` | `password_incorrecta` |
| `Necesitas iniciar sesión para hacer cambios.` | `requiere_sesion` |
| `Ya hay una contraseña configurada.` | `password_ya_configurada` |
| `La contraseña debe tener al menos 4 caracteres.` | `password_muy_corta` |

Para mensajes con contenido dinámico interpolado (ej. que incluyan un
`${variable}` armado en el string), el código se mantiene fijo y sin la
parte variable — esa parte dinámica pasa a resolverse en el cliente vía
`t(código, {variable})`, mismo mecanismo que ya usa el resto del
diccionario. Si algún mensaje de error de `server.js` no tiene una parte
dinámica pero es muy específico de contexto (no reusable), igual se le
asigna su propio código — no se fuerza a compartir código entre mensajes
distintos aunque sean parecidos.

- [ ] **Step 2: Reemplazar cada `error: '<texto>'` por `error: '<código>'` en `server.js`**

```js
// Antes
return res.status(401).json({ success:false, error: 'Contraseña incorrecta.' });
// Después
return res.status(401).json({ success:false, error: 'password_incorrecta' });
```

Repetir para las ~16 ocurrencias catalogadas en el Step 1.

- [ ] **Step 3: Agregar la sección `error.*` a `public/i18n.js`**

Una clave `error.<código>` por cada código del Step 1, en `es` (idéntico al
texto que tenía antes en `server.js`) y `en` (traducido). Agregar también
`error.generico` (`es`: `"Ocurrió un error inesperado."`, `en`: `"An
unexpected error occurred."`) como fallback para códigos no mapeados.

- [ ] **Step 4: Actualizar los puntos del cliente que muestran `body.error`**

Buscar en `public/app.js` cada lugar que hace algo como
`errBox.textContent = body.error || '...'` o
`mostrarToastError(body.error || '...')` (patrón repetido en varios
handlers: login, definir password, guardar wizard, toggle de variantes,
etc.) y cambiarlo a traducir el código:

```js
// Antes
errBox.textContent = body.error || 'Contraseña incorrecta.';
// Después
errBox.textContent = t('error.' + body.error) || t('error.generico');
```

(Como `t()` ya cae a la clave literal si no encuentra nada, y
`'error.' + undefined` daría `'error.undefined'` sin matchear ninguna
clave real, agregar explícitamente el fallback a `error.generico` en cada
call site en vez de confiar en el comportamiento por defecto de `t()` —
así un código de error no mapeado muestra un mensaje genérico legible, no
la clave cruda `error.undefined`.)

- [ ] **Step 5: Bump `CACHE_VERSION`**

- [ ] **Step 6: Verificar**

```bash
node --check server.js && echo "server.js: sintaxis OK"
node --check public/app.js && echo "app.js: sintaxis OK"

# No debe quedar ningún error de servidor con texto en español armado
# (heurística: comillas simples con tilde/ñ dentro de un error: '...')
grep -nE "error: '[^']*[áéíóúñÁÉÍÓÚÑ]" server.js

# Todos los códigos de error de server.js tienen su traducción
node -e "
const fs = require('fs');
const server = fs.readFileSync('server.js', 'utf8');
const codigos = [...server.matchAll(/error:\s*'([a-z_]+)'/g)].map(m => m[1]);
$(cat public/i18n.js)
const faltantes = [...new Set(codigos)].filter(c => !('error.' + c in I18N.es) || !('error.' + c in I18N.en));
console.log('códigos de server.js sin traducir en ambos idiomas:', faltantes.length ? faltantes : 'ninguno (OK)');
"
```

Expected: ambos `sintaxis OK`; el `grep` no devuelve nada; `códigos de
server.js sin traducir en ambos idiomas: ninguno (OK)`.

Verificación manual en navegador, con `idiomaPreferido=en`: provocar un
login con contraseña incorrecta — el mensaje debe verse en inglés
("Incorrect password." o el texto que se haya elegido), no el código crudo
(`password_incorrecta`) ni en español.

- [ ] **Step 7: Commit**

```bash
git add server.js public/app.js public/i18n.js public/sw.js
git commit -m "Servidor: mensajes de error como códigos, traducidos client-side"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** "Diccionario y función t()" → Task 1; "Texto
  estático de index.html" → Task 2; "Texto generado por JS" → Task 3;
  "Selector de idioma en Ajustes" (+ detección automática) → Task 4;
  "Errores del servidor" → Task 5. "Fuera de alcance" no generó tareas, a
  propósito (PDF, tercer idioma, pluralización genérica, docs/README).
- **Por qué la extracción/traducción completa es parte de la Task 1 y no
  algo que yo (quien escribe el plan) enumero acá:** son ~150+ strings
  distintos entre `index.html` y `app.js` — listarlos todos en este
  documento lo haría inmanejable y, más importante, la traducción en sí es
  trabajo mecánico de calidad verificable (un reviewer puede confirmar que
  el español es copia exacta y que el inglés es razonable), no una
  decisión de diseño que necesite fijarse de antemano. Los 6 ejemplos
  resueltos en la Task 1 y los 4 en la Task 5 fijan el estilo/formato
  exacto para que el resto sea consistente.
- **Orden de tareas:** Task 1 (infraestructura + diccionario) antes que
  cualquier conexión, para que Tasks 2-5 siempre tengan `t()`/`I18N` ya
  disponible y solo agreguen wiring, nunca diseño de claves nuevo salvo
  casos puntuales ya previstos (Step de "Interfaces" de cada tarea lo
  aclara).
- **Verificado contra código real antes de escribir el plan:** el patrón
  de `toggleTema()`/`aplicarTema()`/el botón de Ajustes (líneas 159-175 de
  `app.js`, líneas 310-316 de `index.html`) y la posición de
  `window.onload`/`<script src="app.js">` fueron leídos directamente de
  este repo en su estado actual.
- **Riesgo principal identificado:** que la traducción al inglés (Tasks 1
  y 5) tenga inconsistencias de tono/terminología entre tareas hechas por
  implementers distintos (ej. "collection" vs "album" para "colección").
  Mitigado dejando los ejemplos ya resueltos como referencia de estilo en
  cada tarea que lo necesita, y señalando explícitamente en el Step 2b de
  la Task 1 que se verifique la fidelidad del español (que es la parte que
  no puede tener ningún margen de error, a diferencia del inglés que
  admite variación razonable de estilo).
