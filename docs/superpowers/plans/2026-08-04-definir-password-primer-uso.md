# Definir contraseña en el primer uso — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `ADMIN_PASSWORD` (env var) por una contraseña definida
desde la propia app en el primer uso, persistida con hash en `DATA_DIR`,
con migración automática y transparente para despliegues que ya tienen
`ADMIN_PASSWORD` configurada (este mismo servidor de producción incluido).

**Architecture:** Server: nuevo archivo `DATA_DIR/admin-password.json`
(salt+hash con `crypto.scryptSync`, sin dependencias nuevas) como fuente de
verdad de `passwordValida`; migración única desde `ADMIN_PASSWORD` al
arrancar si el archivo no existe todavía; dos endpoints nuevos
(`GET /api/auth-estado`, `POST /api/definir-password`). Cliente: el modal
de login existente pasa a tener dos modos (login normal / definir
contraseña) según lo que responda `/api/auth-estado`, sin crear un modal
nuevo. Docker: `docker-compose.yml`/`README.md` dejan de pedir editar
`ADMIN_PASSWORD` a mano.

**Tech Stack:** Vanilla JS (cliente y servidor), `crypto` built-in de
Node (sin dependencias nuevas).

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-08-04-definir-password-primer-uso-design.md`.
- **Este servidor de producción ya tiene `ADMIN_PASSWORD` configurada** en
  `/etc/pokedex.env` — la migración automática debe preservarla sin que el
  usuario tenga que hacer nada. Cualquier prueba de la migración en este
  host debe hacerse en un `DATA_DIR` aislado (nunca contra el `DATA_DIR`
  real de producción), igual que ya se hizo para el trabajo de Docker.
- **Seguridad al probar en este host:** el proceso real de `pokedex.service`
  ya escucha en el puerto 3000. Cualquier prueba manual de `server.js` acá
  debe lanzarse en background capturando su PID exacto con `$!` y matando
  **solo ese PID** — nunca `pkill`/`killall` por nombre de proceso.
- `POST /api/definir-password` debe rechazar (409) si ya hay una
  contraseña configurada — nunca debe poder "resetear" una contraseña ya
  definida.
- `requiereLogin`, `sesionesActivas`, `SESION_DURACION_MS` y el resto de
  los endpoints protegidos no se tocan.
- **Gotcha del proyecto:** cualquier tarea que toque `public/index.html` o
  `public/app.js` DEBE bumpear `CACHE_VERSION` en `public/sw.js` en el
  mismo commit (hoy está en `'pokedex-tcg-v49'`).
- Sin suite de tests — verificación manual con comandos concretos.

---

## Task 1: Hash persistido, migración automática y endpoints nuevos en `server.js`

**Spec:** secciones "Almacenamiento", "Migración automática al arrancar" y
"Endpoints nuevos".

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: `DATA_DIR`, `escribirJSONAtomico` (ya existentes, sin cambios).
- Produces: `RUTA_ADMIN_PASSWORD`, `passwordHashActual` (variable en
  memoria, `null` o `{salt, hash}`), `hashearPassword(password, salt?)`,
  `crearSesion(res, req)`, endpoints `GET /api/auth-estado` y
  `POST /api/definir-password`. La Task 2 consume `auth-estado` y
  `definir-password` desde el cliente sin cambios de contrato.

- [ ] **Step 1: Reemplazar el bloque de `ADMIN_PASSWORD`/`passwordValida` por el hash persistido**

En `server.js`, líneas 298-318:

Antes:
```js
// ── LOGIN: solo protege escrituras, la lectura queda siempre abierta ──
// Sistema mínimo sin dependencias nuevas: contraseña única (variable de
// entorno ADMIN_PASSWORD) + token de sesión aleatorio guardado en memoria,
// mandado al cliente como cookie httpOnly. No usa cookie-parser: se
// parsea el header Cookie a mano porque el formato es muy simple.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'pokedex123';
if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Estás usando la contraseña por defecto ("pokedex123"). Configura la variable de entorno ADMIN_PASSWORD antes de exponer este servidor a internet.');
}
const SESION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const sesionesActivas = new Map(); // token -> expiraEn

// Comparación en tiempo constante para no filtrar por timing cuánto de la
// contraseña coincidió (crypto.timingSafeEqual exige buffers del mismo
// largo, así que un largo distinto ya alcanza para descartarla).
function passwordValida(candidata) {
    const bufA = Buffer.from(String(candidata || ''), 'utf8');
    const bufB = Buffer.from(ADMIN_PASSWORD, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}
```
Después:
```js
// ── LOGIN: solo protege escrituras, la lectura queda siempre abierta ──
// Sistema mínimo sin dependencias nuevas: contraseña única, hasheada con
// scrypt (built-in de Node) y persistida en DATA_DIR, + token de sesión
// aleatorio guardado en memoria, mandado al cliente como cookie httpOnly.
// No usa cookie-parser: se parsea el header Cookie a mano porque el
// formato es muy simple.
const RUTA_ADMIN_PASSWORD = path.join(DATA_DIR, 'admin-password.json');

function hashearPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { salt, hash };
}

// null = todavía no se definió ninguna contraseña (instalación nueva) —
// /api/auth-estado se lo informa al cliente para que muestre el
// formulario de "definir contraseña" en vez del login normal.
let passwordHashActual = null;
if (fs.existsSync(RUTA_ADMIN_PASSWORD)) {
    passwordHashActual = JSON.parse(fs.readFileSync(RUTA_ADMIN_PASSWORD, 'utf8'));
} else if (process.env.ADMIN_PASSWORD) {
    // Migración única: alguien ya tenía ADMIN_PASSWORD configurada (ej. el
    // deploy systemd de producción) — se hashea una sola vez acá y de ahí
    // en más el archivo es la única fuente de verdad; la env var no se
    // vuelve a consultar en arranques futuros.
    passwordHashActual = hashearPassword(process.env.ADMIN_PASSWORD);
    escribirJSONAtomico(RUTA_ADMIN_PASSWORD, passwordHashActual);
    console.log('🔐 Contraseña migrada desde ADMIN_PASSWORD a admin-password.json.');
}

const SESION_DURACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 días
const sesionesActivas = new Map(); // token -> expiraEn

// Comparación en tiempo constante para no filtrar por timing cuánto de la
// contraseña coincidió (crypto.timingSafeEqual exige buffers del mismo
// largo, así que un largo distinto ya alcanza para descartarla).
function passwordValida(candidata) {
    if (!passwordHashActual) return false;
    const { hash } = hashearPassword(String(candidata || ''), passwordHashActual.salt);
    const bufA = Buffer.from(hash, 'hex');
    const bufB = Buffer.from(passwordHashActual.hash, 'hex');
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

function crearSesion(res, req) {
    const token = crypto.randomBytes(24).toString('hex');
    sesionesActivas.set(token, Date.now() + SESION_DURACION_MS);
    const secure = esHttps(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `sesion=${token}; HttpOnly; Path=/; Max-Age=${SESION_DURACION_MS / 1000}; SameSite=Lax${secure}`);
}
```

(`crearSesion` se define acá aunque use `esHttps`, definida más abajo en el
archivo — es una función, no una constante, así que el hoisting de
`function esHttps(...)` la deja disponible sin problema para cuando
`crearSesion` efectivamente se llame en runtime, no en tiempo de carga.)

- [ ] **Step 2: Reescribir `/api/login` para usar `crearSesion`, y agregar `/api/auth-estado` + `/api/definir-password`**

Antes (líneas 405-415, ahora desplazadas por el Step 1 — ubicar por el
contenido, no por número de línea):
```js
app.post('/api/login', rateLimiter, (req, res) => {
    const { password } = req.body;
    if (!passwordValida(password)) {
        return res.status(401).json({ success:false, error: 'Contraseña incorrecta.' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    sesionesActivas.set(token, Date.now() + SESION_DURACION_MS);
    const secure = esHttps(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `sesion=${token}; HttpOnly; Path=/; Max-Age=${SESION_DURACION_MS / 1000}; SameSite=Lax${secure}`);
    res.json({ success: true });
});
```
Después:
```js
app.post('/api/login', rateLimiter, (req, res) => {
    const { password } = req.body;
    if (!passwordValida(password)) {
        return res.status(401).json({ success:false, error: 'Contraseña incorrecta.' });
    }
    crearSesion(res, req);
    res.json({ success: true });
});

// Le dice al cliente si ya hay una contraseña definida (para mostrar el
// login normal) o no (para mostrar el formulario de "definir contraseña").
// Lectura, sin login — mismo criterio que /api/sesion.
app.get('/api/auth-estado', (req, res) => {
    res.json({ configurada: passwordHashActual !== null });
});

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
    crearSesion(res, req);
    res.json({ success: true });
});
```

(Ubicación: agregar `/api/auth-estado` y `/api/definir-password` justo
después de `/api/login`, antes de `/api/logout` — quedan los 4 endpoints
de auth agrupados en el mismo lugar donde ya viven `/api/login`,
`/api/logout` y `/api/sesion`.)

- [ ] **Step 3: Verificar sintaxis y ausencia de referencias viejas**

```bash
node --check server.js && echo "server.js: sintaxis OK"

# No debe quedar ninguna referencia a la constante vieja
grep -n "ADMIN_PASSWORD" server.js
```

Expected: `server.js: sintaxis OK`; el `grep` solo debe mostrar la línea
`} else if (process.env.ADMIN_PASSWORD) {` y el `console.log`/comentario
de migración — ninguna declaración de `const ADMIN_PASSWORD = ...` debe
quedar.

- [ ] **Step 4: Verificar los 3 escenarios en runtime, en `DATA_DIR` aislados (sin tocar producción)**

El puerto 3000 ya está ocupado por `pokedex.service` — cada prueba va a
fallar al hacer `listen()`, y eso es esperado: toda la inicialización que
nos interesa (migración, archivo de hash) ocurre de forma síncrona antes
de esa línea.

**Escenario A — instalación nueva (sin env var, sin archivo):**
```bash
rm -rf /tmp/pokedex-auth-test-a
DATA_DIR=/tmp/pokedex-auth-test-a node server.js > /tmp/pokedex-auth-test-a.log 2>&1 &
PIDA=$!
sleep 1
ls /tmp/pokedex-auth-test-a/admin-password.json 2>&1   # no debe existir
kill $PIDA 2>/dev/null; wait $PIDA 2>/dev/null
```
Expected: `ls` da "No such file or directory" — sin contraseña definida,
sin migración disparada.

**Escenario B — migración desde ADMIN_PASSWORD (simula este servidor):**
```bash
rm -rf /tmp/pokedex-auth-test-b
DATA_DIR=/tmp/pokedex-auth-test-b ADMIN_PASSWORD=miclave123 node server.js > /tmp/pokedex-auth-test-b.log 2>&1 &
PIDB=$!
sleep 1
cat /tmp/pokedex-auth-test-b/admin-password.json
grep "Contraseña migrada" /tmp/pokedex-auth-test-b.log
kill $PIDB 2>/dev/null; wait $PIDB 2>/dev/null
```
Expected: el archivo existe con `salt`/`hash`; el log confirma la
migración.

**Escenario C — ya migrado, la env var deja de importar:**
```bash
DATA_DIR=/tmp/pokedex-auth-test-b ADMIN_PASSWORD=otra-clave-distinta node server.js > /tmp/pokedex-auth-test-c.log 2>&1 &
PIDC=$!
sleep 1
grep -c "Contraseña migrada" /tmp/pokedex-auth-test-c.log
diff <(cat /tmp/pokedex-auth-test-b/admin-password.json) /tmp/pokedex-auth-test-b/admin-password.json
kill $PIDC 2>/dev/null; wait $PIDC 2>/dev/null
rm -rf /tmp/pokedex-auth-test-a /tmp/pokedex-auth-test-b /tmp/pokedex-auth-test-*.log
```
Expected: el `grep -c` da `0` (no vuelve a migrar, el archivo ya existía);
el hash guardado sigue siendo el de `miclave123`, no el de la env var
nueva (confirma que, una vez migrado, la env var se ignora).

Confirmá también que el servidor de producción real sigue arriba durante
todo esto:
```bash
curl -s -o /dev/null -w "producción sigue OK -> %{http_code}\n" http://localhost:3000/api/version
```

- [ ] **Step 5: Commit**

```bash
git add server.js
git commit -m "Reemplazar ADMIN_PASSWORD por contraseña hasheada y persistida, con migración automática"
```

---

## Task 2: Modal de login con dos modos en el cliente

**Spec:** sección "Cliente: el modal de login con dos modos".

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/sw.js` (bump `CACHE_VERSION`)

**Interfaces:**
- Consumes: `GET /api/auth-estado` y `POST /api/definir-password` de la
  Task 1 (ya mergeada).
- Produces: nada nuevo para otras tareas — es la última tarea de cliente
  de este plan.

- [ ] **Step 1: Agregar el bloque "definir contraseña" y hacer dinámicos título/subtítulo en `public/index.html`**

Antes (líneas 499-516):
```html
<!-- LOGIN MODAL -->
<div class="login-modal" id="login-modal">
    <div class="login-box">
        <div class="login-handle"></div>
        <span class="login-close" id="login-close">×</span>
        <div class="login-icon-circle">🔒</div>
        <div class="login-title">Iniciar sesión</div>
        <div class="login-sub">Necesitas iniciar sesión para hacer cambios (marcar cartas, importar, etc). Ver tu colección no requiere sesión.</div>
        <div class="login-input-wrap">
            <input type="password" id="login-password" class="login-input" placeholder="Contraseña" autocomplete="current-password">
            <button type="button" class="login-toggle-ver" id="login-toggle-ver" title="Mostrar/ocultar contraseña">👁️</button>
        </div>
        <div class="login-error" id="login-error"></div>
        <div class="login-actions">
            <button class="login-btn secondary" onclick="cerrarLoginModal()">Cancelar</button>
            <button class="login-btn primary" onclick="intentarLogin()">Entrar</button>
        </div>
    </div>
</div>
```
Después:
```html
<!-- LOGIN MODAL -->
<div class="login-modal" id="login-modal">
    <div class="login-box">
        <div class="login-handle"></div>
        <span class="login-close" id="login-close">×</span>
        <div class="login-icon-circle">🔒</div>
        <div class="login-title" id="login-title">Iniciar sesión</div>
        <div class="login-sub" id="login-sub">Necesitas iniciar sesión para hacer cambios (marcar cartas, importar, etc). Ver tu colección no requiere sesión.</div>
        <div id="login-bloque-entrar">
            <div class="login-input-wrap">
                <input type="password" id="login-password" class="login-input" placeholder="Contraseña" autocomplete="current-password">
                <button type="button" class="login-toggle-ver" id="login-toggle-ver" title="Mostrar/ocultar contraseña">👁️</button>
            </div>
        </div>
        <div id="login-bloque-definir" style="display:none;">
            <div class="login-input-wrap">
                <input type="password" id="login-password-nueva" class="login-input" placeholder="Nueva contraseña" autocomplete="new-password">
            </div>
            <div class="login-input-wrap">
                <input type="password" id="login-password-confirmar" class="login-input" placeholder="Confirmar contraseña" autocomplete="new-password">
            </div>
        </div>
        <div class="login-error" id="login-error"></div>
        <div class="login-actions">
            <button class="login-btn secondary" onclick="cerrarLoginModal()">Cancelar</button>
            <button class="login-btn primary" id="login-btn-entrar" onclick="intentarLogin()">Entrar</button>
            <button class="login-btn primary" id="login-btn-definir" onclick="intentarDefinirPassword()" style="display:none;">Definir contraseña</button>
        </div>
    </div>
</div>
```

- [ ] **Step 2: Hacer `abrirLoginModal` async, consultar `/api/auth-estado` y togglear los bloques, en `public/app.js`**

Antes (líneas 152-159):
```js
function abrirLoginModal(accionPendiente) {
    cerrarAjustes();
    accionPendienteTrasLogin = accionPendiente || null;
    document.getElementById('login-error').classList.remove('visible');
    document.getElementById('login-password').value = '';
    document.getElementById('login-modal').classList.add('open');
    setTimeout(() => document.getElementById('login-password').focus(), 50);
}
```
Después:
```js
async function abrirLoginModal(accionPendiente) {
    cerrarAjustes();
    accionPendienteTrasLogin = accionPendiente || null;
    document.getElementById('login-error').classList.remove('visible');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password-nueva').value = '';
    document.getElementById('login-password-confirmar').value = '';

    let configurada = true; // ante la duda (ej. falla el fetch), mostrar el login normal, nunca "definir"
    try {
        const res = await fetch('/api/auth-estado');
        const data = await res.json();
        configurada = data.configurada !== false;
    } catch (err) { /* se queda en true por el default de arriba */ }

    document.getElementById('login-title').textContent = configurada
        ? 'Iniciar sesión'
        : 'Definí tu contraseña';
    document.getElementById('login-sub').textContent = configurada
        ? 'Necesitas iniciar sesión para hacer cambios (marcar cartas, importar, etc). Ver tu colección no requiere sesión.'
        : 'Todavía no configuraste una contraseña de administración. Elegí una para poder hacer cambios (marcar cartas, importar, etc).';
    document.getElementById('login-bloque-entrar').style.display  = configurada ? '' : 'none';
    document.getElementById('login-bloque-definir').style.display = configurada ? 'none' : '';
    document.getElementById('login-btn-entrar').style.display     = configurada ? '' : 'none';
    document.getElementById('login-btn-definir').style.display    = configurada ? 'none' : '';

    document.getElementById('login-modal').classList.add('open');
    setTimeout(() => document.getElementById(configurada ? 'login-password' : 'login-password-nueva').focus(), 50);
}
```

(No hace falta tocar ningún caller de `abrirLoginModal` — todos la llaman
sin `await` hoy, y eso sigue siendo válido: una función async no obliga a
quien la llama a esperarla.)

- [ ] **Step 3: Extraer el post-éxito compartido y agregar `intentarDefinirPassword`, en `public/app.js`**

Antes (líneas 165-193):
```js
async function intentarLogin() {
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.remove('visible');
    try {
        const res = await fetch('/api/login', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            errBox.textContent = body.error || 'Contraseña incorrecta.';
            errBox.classList.add('visible');
            return;
        }
        sesionActiva = true;
        actualizarBotonSesion();
        cerrarLoginModal();
        mostrarToastInfo('Sesión iniciada.');
        if (accionPendienteTrasLogin) {
            const accion = accionPendienteTrasLogin;
            accionPendienteTrasLogin = null;
            accion();
        }
    } catch (err) {
        errBox.textContent = 'No se pudo conectar con el servidor.';
        errBox.classList.add('visible');
    }
}
```
Después:
```js
// Compartido entre login normal y "definir contraseña" — ambos terminan
// exactamente igual: hay sesión nueva, se cierra el modal y se reintenta
// la acción que haya quedado pendiente (si había alguna).
function sesionIniciadaConExito() {
    sesionActiva = true;
    actualizarBotonSesion();
    cerrarLoginModal();
    mostrarToastInfo('Sesión iniciada.');
    if (accionPendienteTrasLogin) {
        const accion = accionPendienteTrasLogin;
        accionPendienteTrasLogin = null;
        accion();
    }
}

async function intentarLogin() {
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.remove('visible');
    try {
        const res = await fetch('/api/login', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            errBox.textContent = body.error || 'Contraseña incorrecta.';
            errBox.classList.add('visible');
            return;
        }
        sesionIniciadaConExito();
    } catch (err) {
        errBox.textContent = 'No se pudo conectar con el servidor.';
        errBox.classList.add('visible');
    }
}

async function intentarDefinirPassword() {
    const password = document.getElementById('login-password-nueva').value;
    const confirmar = document.getElementById('login-password-confirmar').value;
    const errBox = document.getElementById('login-error');
    errBox.classList.remove('visible');
    if (password.length < 4) {
        errBox.textContent = 'La contraseña debe tener al menos 4 caracteres.';
        errBox.classList.add('visible');
        return;
    }
    if (password !== confirmar) {
        errBox.textContent = 'Las contraseñas no coinciden.';
        errBox.classList.add('visible');
        return;
    }
    try {
        const res = await fetch('/api/definir-password', {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ password })
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            errBox.textContent = body.error || 'No se pudo definir la contraseña.';
            errBox.classList.add('visible');
            return;
        }
        sesionIniciadaConExito();
    } catch (err) {
        errBox.textContent = 'No se pudo conectar con el servidor.';
        errBox.classList.add('visible');
    }
}
```

- [ ] **Step 4: Enter también manda el formulario de "definir", junto a los demás listeners de login**

Antes (buscar el bloque, cerca del final de `app.js`):
```js
document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') intentarLogin();
});
document.getElementById('login-toggle-ver').addEventListener('click', () => {
```
Después:
```js
document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') intentarLogin();
});
document.getElementById('login-password-nueva').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') intentarDefinirPassword();
});
document.getElementById('login-password-confirmar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') intentarDefinirPassword();
});
document.getElementById('login-toggle-ver').addEventListener('click', () => {
```

- [ ] **Step 5: Bump `CACHE_VERSION`**

En `public/sw.js`:
```js
const CACHE_VERSION = 'pokedex-tcg-v50';
```

- [ ] **Step 6: Verificar**

```bash
node --check public/app.js && echo "app.js: sintaxis OK"

grep -c 'id="login-bloque-definir"' public/index.html
grep -c 'id="login-btn-definir"' public/index.html
grep -c "^function sesionIniciadaConExito" public/app.js
grep -c "^async function intentarDefinirPassword" public/app.js
grep -c "await fetch('/api/auth-estado')" public/app.js
```

Expected: `app.js: sintaxis OK`; los 5 `grep -c` dan `1`.

Verificación manual en navegador, contra la instancia Docker de prueba
(volumen vacío, sin `ADMIN_PASSWORD`) que ya se usó en la sesión de Docker
— no contra este servidor de producción, que ya tiene contraseña migrada:

- Al disparar cualquier acción que pida sesión (abrir el wizard, marcar
  una carta), el modal muestra "Definí tu contraseña" con 2 campos, no el
  login normal.
- Contraseña de menos de 4 caracteres, o que no coincide con la
  confirmación, muestra el error correspondiente sin llegar a pegarle al
  servidor.
- Definir una contraseña válida loguea al toque (mismo comportamiento que
  un login exitoso) y persiste — recargar la página y volver a intentar
  una acción protegida ahora muestra el login normal de 1 campo.
- Intentar `POST /api/definir-password` de nuevo (con curl, por ejemplo)
  da 409.

- [ ] **Step 7: Commit**

```bash
git add public/index.html public/app.js public/sw.js
git commit -m "Modal de login con dos modos: definir contraseña en el primer uso, login normal después"
```

---

## Task 3: Actualizar `docker-compose.yml` y `README.md`

**Spec:** sección "Docker".

**Files:**
- Modify: `docker-compose.yml`
- Modify: `README.md`

**Interfaces:**
- Consumes: nada de código — depende conceptualmente de que las Tasks 1-2
  ya existan (para que lo que describe el README sea cierto), pero no hay
  ninguna interfaz de código que consumir.
- Produces: nada consumido por otras tareas — última tarea del plan.

- [ ] **Step 1: Sacar `ADMIN_PASSWORD` obligatoria de `docker-compose.yml`, dejarla comentada como override opcional**

Antes:
```yaml
services:
  pokedex-tcg:
    image: ghcr.io/juanjose1245-maker/pokedextcg:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - ADMIN_PASSWORD=cambiar-esta-password
    volumes:
      - ./data:/app/data
```
Después:
```yaml
services:
  pokedex-tcg:
    image: ghcr.io/juanjose1245-maker/pokedextcg:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment: []
      # - ADMIN_PASSWORD=opcional-si-preferís-fijarla-por-variable-de-entorno
    volumes:
      - ./data:/app/data
```

- [ ] **Step 2: Actualizar `README.md`: pasos de instalación y tabla de variables de entorno**

Antes (pasos de instalación, sección "Instalar con Docker"):
```markdown
1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Editá la variable `ADMIN_PASSWORD` con tu propia contraseña (no dejes el
   valor de ejemplo).
3. Corré:

   ```bash
   docker compose up -d
   ```

4. Abrí `http://localhost:3000` en el navegador.
```
Después:
```markdown
1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Corré:

   ```bash
   docker compose up -d
   ```

3. Abrí `http://localhost:3000` en el navegador — la primera vez que
   intentes hacer un cambio (marcar una carta, configurar carpetas, etc.)
   te va a pedir definir tu contraseña ahí mismo.
```

Antes (tabla de variables de entorno):
```markdown
### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | Sí | Contraseña para las acciones de escritura (marcar cartas, importar, configurar carpetas). Sin esto, el servidor usa una contraseña por defecto insegura — **cambiala siempre** antes de exponer el puerto a internet. |
| `DATA_DIR` | No | Carpeta donde se guardan los datos. La imagen ya la fija en `/app/data`; no hace falta tocarla salvo que sepas lo que estás haciendo. |
```
Después:
```markdown
### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATA_DIR` | No | Carpeta donde se guardan los datos. La imagen ya la fija en `/app/data`; no hace falta tocarla salvo que sepas lo que estás haciendo. |

`ADMIN_PASSWORD` ya no es necesaria: la contraseña se define desde la
propia app la primera vez que hacés un cambio. Si venís de una instalación
vieja que ya la tenía seteada, seguí funcionando igual — se migra sola, una
única vez, a un archivo dentro de `DATA_DIR`. También podés seguir
fijándola por variable de entorno si la preferís así (ver el comentario en
`docker-compose.yml`); en una instalación nueva, esa migración pasa igual,
solo que en el primer arranque en vez de venir de "una instalación vieja".
```

- [ ] **Step 3: Verificar**

```bash
grep -q "ADMIN_PASSWORD=cambiar-esta-password" docker-compose.yml && echo "ERROR: sigue obligatoria" || echo "docker-compose.yml: ya no obligatoria (OK)"
python3 -c "import yaml; d = yaml.safe_load(open('docker-compose.yml')); assert d['services']['pokedex-tcg']['environment'] == []; print('docker-compose.yml: estructura OK')"
grep -q "Editá la variable \`ADMIN_PASSWORD\`" README.md && echo "ERROR: paso viejo sigue en el README" || echo "README.md: paso viejo removido (OK)"
grep -q "definir tu contraseña" README.md && echo "README.md: menciona el flujo nuevo (OK)"
```

Expected: las 4 líneas `OK`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml README.md
git commit -m "Docker: ya no hace falta editar ADMIN_PASSWORD, se define desde la app"
```

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** "Almacenamiento" + "Migración automática" +
  "Endpoints nuevos" → Task 1; "Cliente: modal con dos modos" → Task 2;
  "Docker" → Task 3. "Fuera de alcance" no generó tareas, a propósito
  (cambiar contraseña ya definida, multi-usuario, recuperación).
- **Verificado contra código real antes de escribir el plan:** todos los
  fragmentos "antes" de `server.js` (líneas 298-318, 405-415, 417-428) y de
  `public/app.js`/`public/index.html` (líneas 146-210, 499-516) fueron
  leídos directamente de este repo en su estado actual, después de mergear
  el trabajo del wizard (que ya movió algunas de estas líneas respecto a
  como estaban antes de esa sesión).
- **Riesgo de producción identificado y mitigado:** la Task 1 corre en el
  mismo host que `pokedex.service`, que ya tiene `ADMIN_PASSWORD`
  configurada — el Step 4 de esa tarea prueba los 3 escenarios (nueva,
  migración, ya migrada) en `DATA_DIR` aislados bajo `/tmp`, nunca contra
  el `DATA_DIR` real, y verifica explícitamente que producción sigue
  respondiendo durante la prueba. El PID de cada proceso de prueba se mata
  puntualmente (`$!`), nunca por patrón de nombre.
- **Consistencia de nombres:** `RUTA_ADMIN_PASSWORD`, `passwordHashActual`,
  `hashearPassword`, `crearSesion` se definen en la Task 1 y se usan con
  esos mismos nombres en el resto de esa tarea; `/api/auth-estado` y
  `/api/definir-password` se consumen en la Task 2 con el mismo contrato
  exacto (`{configurada: bool}` y `{password}` respectivamente) que define
  la Task 1.
- **La migración automática es el punto más sensible de todo el plan** —
  por eso tiene su propio escenario de prueba dedicado (Escenario B) y un
  tercer escenario (C) que prueba específicamente que, una vez migrada, la
  env var deja de tener efecto — exactamente el comportamiento que este
  servidor de producción va a atravesar en el próximo deploy.
