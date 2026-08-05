# Definir contraseña en el primer uso (reemplaza ADMIN_PASSWORD)

## Contexto

Hoy la contraseña de administración vive únicamente en la variable de
entorno `ADMIN_PASSWORD` (`server.js`), con un fallback inseguro
(`'pokedex123'`) si no se configura nada. En una instalación Docker nueva
(el trabajo de self-hosting de esta misma sesión), esto significa que quien
instala la app o bien edita `docker-compose.yml` a mano antes de arrancar,
o corre con la contraseña insegura por defecto sin darse cuenta.

Confirmado con el usuario durante el brainstorming: en vez de pedir una
contraseña ya definida, la primera vez que alguien intenta hacer un cambio
(abrir el wizard de carpetas, marcar una carta, etc.) sin que haya ninguna
contraseña configurada todavía, la app debe pedirle **definir** una — un
formulario de dos campos (contraseña + confirmar) que deben coincidir — y
loguearlo con esa contraseña en el mismo paso.

`ADMIN_PASSWORD` como variable de entorno se **reemplaza por completo**: no
sigue siendo una fuente de verdad activa. Sirve solo como insumo de una
migración automática, única, para no romper despliegues que ya la tienen
configurada (como este mismo servidor de producción).

## Almacenamiento: hash persistido en `DATA_DIR`

Nuevo archivo `RUTA_ADMIN_PASSWORD = path.join(DATA_DIR, 'admin-password.json')`,
con la forma `{ salt: '<hex>', hash: '<hex>' }`, generado con
`crypto.scryptSync` (built-in de Node, cero dependencias nuevas — mismo
criterio que ya usa `passwordValida` con `timingSafeEqual`).

```js
function hashearPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}
```

`passwordValida(candidata)` deja de comparar contra una constante en
memoria y pasa a comparar contra `passwordHashActual` (variable en memoria,
cargada al arrancar y actualizada al definir la contraseña):

```js
function passwordValida(candidata) {
    if (!passwordHashActual) return false; // todavía no se definió ninguna
    const { hash } = hashearPassword(String(candidata || ''), passwordHashActual.salt);
    const bufA = Buffer.from(hash, 'hex');
    const bufB = Buffer.from(passwordHashActual.hash, 'hex');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}
```

## Migración automática al arrancar

Al boot, en el mismo lugar donde hoy se lee `ADMIN_PASSWORD`:

```js
let passwordHashActual = null;
if (fs.existsSync(RUTA_ADMIN_PASSWORD)) {
    passwordHashActual = JSON.parse(fs.readFileSync(RUTA_ADMIN_PASSWORD, 'utf8'));
} else if (process.env.ADMIN_PASSWORD) {
    // Migración única: alguien ya tenía ADMIN_PASSWORD configurada (ej. el
    // deploy systemd de producción) — se hashea una sola vez y de ahí en
    // más el archivo es la fuente de verdad; la env var ya no se vuelve a
    // consultar en arranques futuros.
    passwordHashActual = hashearPassword(process.env.ADMIN_PASSWORD);
    escribirJSONAtomico(RUTA_ADMIN_PASSWORD, passwordHashActual);
    console.log('🔐 Contraseña migrada desde ADMIN_PASSWORD a admin-password.json.');
}
// Si passwordHashActual sigue en null: instalación nueva, sin contraseña
// definida todavía — /api/auth-estado se lo informa al cliente para que
// muestre el formulario de "definir contraseña" en vez del login normal.
```

Se borra el warning de "estás usando la contraseña por defecto" (ya no hay
default inseguro — o hay una contraseña real definida por el usuario, o no
hay ninguna y la app lo pide explícitamente).

## Endpoints nuevos

**`GET /api/auth-estado`** (lectura, siempre abierto, sin login — mismo
criterio que el resto de los GET):
```js
app.get('/api/auth-estado', (req, res) => {
    res.json({ configurada: passwordHashActual !== null });
});
```

**`POST /api/definir-password`** (sin `requiereLogin` — es, por definición,
el paso previo a tener sesión — pero sí con `rateLimiter`, y con el guard
de que solo funciona si todavía no hay contraseña definida, para que nadie
pueda "resetear" la contraseña de alguien que ya configuró la suya):
```js
app.post('/api/definir-password', rateLimiter, (req, res) => {
    if (passwordHashActual !== null) {
        return res.status(409).json({ success:false, error: 'Ya hay una contraseña configurada.' });
    }
    const { password } = req.body;
    if (typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({ success:false, error: 'La contraseña debe tener al menos 4 caracteres.' });
    }
    passwordHashActual = hashearPassword(password);
    escribirJSONAtomico(RUTA_ADMIN_PASSWORD, passwordHashActual);
    crearSesion(res, req); // mismo helper que usa /api/login — ver abajo
    res.json({ success: true });
});
```

`/api/login` y `/api/definir-password` comparten la creación de sesión
(token + cookie); se extrae a un helper `crearSesion(res, req)` para no
duplicar esas 4 líneas (hoy solo viven en `/api/login`):
```js
function crearSesion(res, req) {
    const token = crypto.randomBytes(24).toString('hex');
    sesionesActivas.set(token, Date.now() + SESION_DURACION_MS);
    const secure = esHttps(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `sesion=${token}; HttpOnly; Path=/; Max-Age=${SESION_DURACION_MS / 1000}; SameSite=Lax${secure}`);
}
```
`/api/login` pasa a terminar con `passwordValida(password)` (sin cambios) →
si es válida, `crearSesion(res, req); res.json({success:true});` en vez de
las 4 líneas que hoy tiene inline.

## Cliente: el modal de login con dos modos

`abrirLoginModal(accionPendiente)` (`app.js`) pasa a ser `async` y, antes de
mostrar nada, consulta `/api/auth-estado`:

- **`configurada: false`** → el modal muestra el modo "definir": dos
  `<input type="password">` (contraseña / confirmar), el botón queda
  deshabilitado hasta que ambos campos coincidan y tengan al menos 4
  caracteres (validación en vivo, igual de estricta que el server). Al
  confirmar, POST a `/api/definir-password` con `{ password }` — si sale
  bien, se comporta exactamente como un login exitoso hoy (cierra el modal,
  corre `accionPendienteTrasLogin` si había alguna encolada).
- **`configurada: true`** → el modal de siempre, sin cambios (`/api/login`,
  un solo campo).

Reusa el mismo modal/markup existente (`login-modal`), agregando el segundo
campo oculto por default y un toggle de qué bloque de inputs mostrar según
la respuesta de `/api/auth-estado` — no se crea un modal nuevo.

## Docker

`docker-compose.yml` pierde la línea obligatoria `ADMIN_PASSWORD=...`; se
deja como comentario, documentando que es un override opcional para quien
prefiera seguir fijándola por variable de entorno (sigue funcionando vía la
migración automática, aunque en una instalación nueva sin archivo previo
simplemente hashea ese valor en el primer arranque igual que hoy migra la
de producción):
```yaml
environment: []
    # - ADMIN_PASSWORD=opcional-si-preferís-fijarla-por-variable-de-entorno
```
`README.md`: el paso "Editá la variable ADMIN_PASSWORD" se reemplaza por
una nota de que la contraseña se define desde la propia app la primera vez
que se usa. La tabla de variables de entorno pierde la fila de
`ADMIN_PASSWORD` (deja de ser una variable que alguien deba tocar en el
flujo recomendado); se agrega una línea aparte, fuera de la tabla, para
quien migra desde una instalación vieja o prefiere seguir fijándola por
variable de entorno, documentando que sigue funcionando vía la migración
automática.

## Fuera de alcance

- Cambiar la contraseña una vez definida (no hay endpoint de "cambiar
  contraseña" hoy tampoco; sigue sin haberlo — para cambiarla habría que
  borrar `admin-password.json` a mano y reiniciar, igual de manual que hoy
  es cambiar `ADMIN_PASSWORD`).
- Múltiples usuarios/cuentas — sigue siendo una única contraseña de
  administración, como hoy.
- Recuperar una contraseña olvidada desde la UI — mismo nivel de soporte
  que hoy (acceso al servidor/archivo para resetearla a mano).
- Tocar `requiereLogin`, `sesionesActivas`, la duración de sesión, o
  cualquier otro endpoint protegido — sin cambios.

## Testing

Sin suite de tests — verificación manual:

- **Este servidor de producción** (con `ADMIN_PASSWORD` ya seteada en
  `/etc/pokedex.env`): tras desplegar, el login sigue funcionando con la
  misma contraseña de siempre, sin pedir "definir" nada — confirma la
  migración automática.
- **Instalación Docker nueva** (volumen vacío, sin `ADMIN_PASSWORD` en el
  compose): la primera acción que requiere sesión (abrir el wizard, marcar
  una carta) muestra el formulario de "definir contraseña", no el login
  normal.
- Definir una contraseña corta (menos de 4 caracteres) la rechaza, tanto en
  el cliente (botón deshabilitado) como si se prueba pegarle directo al
  endpoint.
- Definir una contraseña válida loguea de inmediato y persiste
  `admin-password.json` en `DATA_DIR` — reiniciar el contenedor y loguearse
  de nuevo con esa misma contraseña funciona.
- Intentar `POST /api/definir-password` una segunda vez (con contraseña ya
  definida) da 409, no la pisa.
- El resto de los flujos que ya usan `requiereSesion`/`abrirLoginModal`
  (wizard, variantes, importar, marcar carta) siguen funcionando igual una
  vez que la contraseña ya está definida.
