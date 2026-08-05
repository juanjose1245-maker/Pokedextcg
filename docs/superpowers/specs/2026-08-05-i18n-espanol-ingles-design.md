# Internacionalización: español (default) + inglés

## Contexto

Toda la UI de esta app está en español, a propósito y por convención
(`CLAUDE.md`: "Comments and UI text in this codebase are in Spanish").
Ahora que la app se puede self-hostear vía Docker (trabajo de esta misma
sesión), tiene sentido que alguien que no habla español pueda usarla en
inglés. Confirmado con el usuario durante el brainstorming:

- Español sigue siendo el idioma default/base — este trabajo **agrega**
  inglés, no reemplaza nada.
- El idioma arranca automático según `navigator.language` del navegador (si
  empieza con "es", español; cualquier otro caso, inglés — solo hay 2
  idiomas soportados, no hace falta más granularidad), con un botón en
  Ajustes para cambiarlo a mano, igual patrón que ya existe para el tema
  (`toggleTema()`/`temaActual`, persistido en `localStorage`).
- Los mensajes de error del servidor (`server.js`) pasan de texto en
  español armado a **códigos cortos**; el cliente los traduce con el mismo
  diccionario que usa para el resto de la UI. El servidor deja de "hablar"
  ningún idioma — solo emite códigos que el cliente interpreta.

Este documento actualiza también la convención de `CLAUDE.md` citada
arriba: de acá en adelante, texto nuevo user-facing debe pasar por el
diccionario de traducciones (agregar la clave en `ES` y `EN`), no
hardcodearse directo en español. Comentarios de código internos (no
visibles al usuario) siguen en español sin cambios — esa parte de la
convención no se toca.

## Diccionario y función `t()`

Un solo objeto en `public/i18n.js` (archivo nuevo, cargado antes de
`app.js` en `index.html`):

```js
const I18N = {
  es: {
    'ajustes.tema': 'Tema',
    'login.titulo': 'Iniciar sesión',
    // ... una clave por cada string user-facing de index.html/app.js
  },
  en: {
    'ajustes.tema': 'Theme',
    'login.titulo': 'Log in',
    // ... mismas claves, en inglés
  }
};

let idiomaActual = localStorage.getItem('idiomaPreferido') || detectarIdiomaNavegador();

function detectarIdiomaNavegador() {
    const lang = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
    return lang.startsWith('es') ? 'es' : 'en';
}

// t('clave', {n: 5}) → interpola {n} dentro del string encontrado.
// Solo sustitución simple de variables, sin reglas de plural — para los
// pocos casos con singular/plural distinto (ej. "falta 1" vs "faltan 5"),
// la clave completa se elige en el call site con un ternario simple, no
// con un sistema de pluralización genérico (no hace falta para 2 idiomas
// y un puñado de casos).
function t(clave, vars) {
    let texto = (I18N[idiomaActual] && I18N[idiomaActual][clave]) || I18N.es[clave] || clave;
    if (vars) for (const [k, v] of Object.entries(vars)) texto = texto.replaceAll(`{${k}}`, v);
    return texto;
}
```

`I18N.es` es siempre el fallback si una clave falta en `en` (nunca se
rompe la UI por una traducción olvidada — en el peor caso se ve en
español). El key-naming sigue el patrón `área.elemento` (`ajustes.tema`,
`login.titulo`, `wizard.pasoVariantes.pregunta`, `error.passwordIncorrecta`)
para que sea fácil ubicar de qué parte de la app es cada string.

## Texto estático de `index.html`

Cada nodo de texto visible se reemplaza por un atributo `data-i18n`,
dejando el español actual como contenido de fallback (por si JS no cargó
todavía, o para quien lea el HTML crudo):

```html
<!-- Antes -->
<span class="ajustes-item-titulo">Tema</span>
<!-- Después -->
<span class="ajustes-item-titulo" data-i18n="ajustes.tema">Tema</span>
```

Para atributos (no solo texto interno) que también necesitan traducción
(`placeholder`, `title`), variantes `data-i18n-placeholder`/`data-i18n-title`
con el mismo mecanismo.

`aplicarIdioma()` (nueva función, mismo momento/lugar que ya llama a
`aplicarTema()` en `window.onload`, y también disparada por el botón de
Ajustes) recorre `document.querySelectorAll('[data-i18n]')` y pone
`el.textContent = t(el.dataset.i18n)`, y análogamente para los atributos.

## Texto generado por JS (`app.js`)

Cada literal de string en español dentro de un template literal o llamada
a `mostrarToast*`/similar se reemplaza por `t('clave')`, con variables
dinámicas pasadas como segundo argumento:

```js
// Antes
mostrarToastError('Todas las carpetas necesitan un nombre.');
// Después
mostrarToastError(t('wizard.error.nombreFaltante'));
```

Como el contenido dinámico (galería, sidebar, tarjetas, modales) ya se
re-renderiza completo cada vez que cambian sus datos de origen, cambiar de
idioma no necesita lógica especial ahí: alcanza con volver a llamar a las
mismas funciones de render que ya existen (`renderSidebar()`,
`renderBinderBar()`, `renderGridGeneraciones()`, lo que esté visible en ese
momento) desde `aplicarIdioma()`, igual que ya se hace al cambiar de modo o
recibir un evento SSE de config.

## Errores del servidor: de texto a códigos

Los ~16 `res.status(...).json({success:false, error: '<texto en español>'})`
de `server.js` pasan a mandar un código corto en `snake_case`, ej.:

```js
// Antes
return res.status(401).json({ success:false, error: 'Contraseña incorrecta.' });
// Después
return res.status(401).json({ success:false, error: 'password_incorrecta' });
```

El diccionario `I18N` gana una sección `error.*` con una clave por cada
código (`error.password_incorrecta`, `error.ya_configurada`, etc.). Los
puntos del cliente que hoy hacen `errBox.textContent = body.error || '...'`
pasan a `errBox.textContent = t('error.' + body.error) || t('error.generico')`
— con `error.generico` como fallback si llega un código no mapeado (defensa
ante un error nuevo del servidor que todavía no tiene traducción agregada).

## Selector de idioma en Ajustes

Un botón nuevo en el panel de Ajustes, mismo patrón visual que el de Tema
(`btn-tema-ajustes`), que cicla ES↔EN al tocarlo y persiste en
`localStorage['idiomaPreferido']`:

```js
function toggleIdioma() {
    idiomaActual = idiomaActual === 'es' ? 'en' : 'es';
    localStorage.setItem('idiomaPreferido', idiomaActual);
    aplicarIdioma();
}
```

## Fuera de alcance

- El PDF de recortables (`generarPDFRecortables`, texto armado con
  `pdfkit` en `server.js`) sigue siempre en español — es contenido para
  imprimir, no interactivo, y traducirlo es un trabajo aparte (fuentes,
  layout) que no se justifica en esta primera fase.
- Un tercer idioma más allá de inglés — la arquitectura (`I18N.es`/`I18N.en`
  como objetos separados, `t()` genérico) no lo impide a futuro, pero esta
  fase solo entrega los dos.
- Reglas de pluralización genéricas (tipo ICU MessageFormat) — ver nota en
  la sección de `t()`.
- Traducir `docs/`, `README.md`, comentarios de código — quedan en
  español, son para quien mantiene el proyecto, no para quien lo usa.
- Detectar/cambiar idioma por usuario en vez de por dispositivo — no hay
  concepto de "usuario" en esta app (una sola contraseña de admin
  compartida), la preferencia de idioma es por `localStorage`, igual que
  tema y tamaño de tarjeta.

## Testing

Sin suite de tests — verificación manual:

- Navegador con `navigator.language` en inglés (o forzado vía DevTools):
  la app arranca en inglés sin tocar nada.
- Navegador en español (o cualquier otro idioma no-"es"): arranca en
  español (default) — confirma que "cualquier otro idioma" cae a inglés
  solo cuando NO es español, no que todo lo demás quede en español por
  error.
- Tocar el selector de idioma en Ajustes cambia TODA la UI visible en ese
  momento (sidebar, modales abiertos, toasts futuros) sin recargar la
  página, y persiste al recargar.
- Provocar un error de servidor conocido (ej. login con contraseña
  incorrecta) en ambos idiomas: el mensaje aparece traducido, no como
  código crudo (`password_incorrecta`) ni en español cuando el idioma
  activo es inglés.
- Un código de error no mapeado (simulado) cae a `error.generico` en vez
  de mostrar `undefined` o el código crudo.
- El PDF de recortables se sigue generando igual, en español, sin importar
  el idioma activo de la UI.
