# Empaquetar la app en Docker para self-hosting — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquier persona pueda instalar su propia copia de esta app con
`docker compose up -d`, sin clonar el repo ni tener Node instalado, publicando
una imagen ya construida en `ghcr.io`.

**Architecture:** Un solo contenedor Node corriendo `server.js` sin cambios de
comportamiento para el deploy systemd actual. El único cambio de código es una
constante `DATA_DIR` (con default retrocompatible) de la que pasan a colgar
los 5 archivos/carpetas de estado del usuario. Todo lo demás es
infraestructura nueva y aditiva: `Dockerfile`, `.dockerignore`,
`docker-compose.yml`, un workflow de GitHub Actions que publica en `ghcr.io`,
y una sección de instalación en `README.md`.

**Tech Stack:** Node 20 (`node:20-slim`), Docker, Docker Compose, GitHub
Actions (`docker/build-push-action`), GitHub Container Registry.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-08-03-docker-self-hosting-design.md`.
- El deploy actual en systemd (`pokedex.service`, `WorkingDirectory=/var/www/html/pokedex-tcg`)
  **no debe verse afectado**: no define `DATA_DIR`, así que debe seguir
  leyendo/escribiendo exactamente donde lo hace hoy.
- **Este servidor (producción) no tiene Docker instalado** — ninguna tarea de
  este plan ejecuta `docker build`/`docker compose up` en este host. Esa
  verificación queda para el usuario en su propia máquina (Task 6).
- **Seguridad al probar Task 1 en este host:** el proceso real de
  `pokedex.service` ya está escuchando en el puerto 3000. Cualquier prueba
  manual de `server.js` en este host debe lanzarse en background capturando
  su PID exacto con `$!` y matar **solo ese PID** — nunca `pkill`/`killall`
  por nombre de proceso (`node server.js` matchearía también al proceso de
  producción real).
- Imagen: `ghcr.io/juanjose1245-maker/pokedextcg` (a partir del remoto
  `origin` de este repo, `github.com/juanjose1245-maker/Pokedextcg`).
- `pokemon_db.json` sigue siendo dato de referencia read-only, horneado en la
  imagen — no se mueve a `DATA_DIR`.
- El webhook `/api/webhook-deploy` no se toca: ya queda inerte si no se
  define `DEPLOY_WEBHOOK_SECRET`, y el `docker-compose.yml` de este plan no
  la define.
- Fuera de alcance (ver spec): hacer `PORT` configurable, healthcheck de
  Docker, multi-instancia/escalado horizontal.
- Sin suite de tests automatizados en el proyecto — verificación manual con
  comandos concretos en cada tarea.

---

## Task 1: Soporte de `DATA_DIR` en `server.js`

**Spec:** sección "Cambio en `server.js`: `DATA_DIR`".

**Files:**
- Modify: `server.js`

**Interfaces:**
- Consumes: nada de otras tareas (es la primera).
- Produces: constante `DATA_DIR` (resuelve a `process.env.DATA_DIR || __dirname`)
  y constantes `RUTA_INVENTARIO`, `RUTA_CARPETAS_CONFIG`,
  `RUTA_VARIANTES_CONFIG` (todas `path.join(DATA_DIR, '<archivo>.json')`).
  `CARPETA_RESPALDOS`/`CARPETA_CACHE` pasan a colgar de `DATA_DIR` en vez de
  `__dirname`. La Task 2 (Dockerfile) consume este contrato fijando
  `ENV DATA_DIR=/app/data` en la imagen.

**Nota respecto a la spec:** la spec proponía `process.env.DATA_DIR || '.'`
como default. Se usa `process.env.DATA_DIR || __dirname` en su lugar —
estrictamente más robusto y con el mismo resultado práctico en el deploy
systemd actual (`WorkingDirectory` ya es igual a `__dirname` ahí), porque
`CARPETA_RESPALDOS`/`CARPETA_CACHE` ya estaban anclados a `__dirname` (no al
directorio de arranque) antes de este cambio; usar `'.'` como default habría
sido una regresión sutil si alguna vez se arranca `node server.js` desde un
cwd distinto al del repo sin `DATA_DIR` seteada.

- [ ] **Step 1: Agregar la constante `DATA_DIR` y las rutas derivadas, justo después de `PORT`**

En `server.js`, línea 11:

Antes:
```js
const app       = express();
const PORT      = 3000;
```
Después:
```js
const app       = express();
const PORT      = 3000;

// Dónde vive el estado escribible del usuario (inventario, config de
// carpetas/variantes, respaldos, caché de PDFs). Default = __dirname para
// que el deploy actual (systemd, WorkingDirectory == directorio del repo)
// siga leyendo/escribiendo exactamente donde lo hace hoy sin tocar nada;
// en Docker la imagen fija DATA_DIR=/app/data vía ENV.
const DATA_DIR = process.env.DATA_DIR || __dirname;
fs.mkdirSync(DATA_DIR, { recursive: true });
const RUTA_INVENTARIO       = path.join(DATA_DIR, 'inventario.json');
const RUTA_CARPETAS_CONFIG  = path.join(DATA_DIR, 'carpetas.json');
const RUTA_VARIANTES_CONFIG = path.join(DATA_DIR, 'variantes-config.json');
```

- [ ] **Step 2: `CARPETA_RESPALDOS` cuelga de `DATA_DIR`, con mkdir recursivo**

Línea 65-66:

Antes:
```js
const CARPETA_RESPALDOS = path.join(__dirname, 'backups');
if (!fs.existsSync(CARPETA_RESPALDOS)) fs.mkdirSync(CARPETA_RESPALDOS);
```
Después:
```js
const CARPETA_RESPALDOS = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(CARPETA_RESPALDOS)) fs.mkdirSync(CARPETA_RESPALDOS, { recursive: true });
```

- [ ] **Step 3: `inventario.json` usa `RUTA_INVENTARIO`**

Línea 73 y 76:

Antes:
```js
if (fs.existsSync('inventario.json')) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync('inventario.json', 'utf8'));
```
Después:
```js
if (fs.existsSync(RUTA_INVENTARIO)) {
    let raw;
    try {
        raw = JSON.parse(fs.readFileSync(RUTA_INVENTARIO, 'utf8'));
```

Línea 105:

Antes:
```js
function guardarInventario() {
    escribirJSONAtomico('inventario.json', inventario);
}
```
Después:
```js
function guardarInventario() {
    escribirJSONAtomico(RUTA_INVENTARIO, inventario);
}
```

- [ ] **Step 4: `variantes-config.json` usa `RUTA_VARIANTES_CONFIG` (3 lugares)**

Línea 126, 128 y 136:

Antes:
```js
if (fs.existsSync('variantes-config.json')) {
    try {
        const raw = JSON.parse(fs.readFileSync('variantes-config.json', 'utf8'));
```
Después:
```js
if (fs.existsSync(RUTA_VARIANTES_CONFIG)) {
    try {
        const raw = JSON.parse(fs.readFileSync(RUTA_VARIANTES_CONFIG, 'utf8'));
```

Antes:
```js
function guardarVariantesConfig() {
    escribirJSONAtomico('variantes-config.json', variantesConfig);
}
```
Después:
```js
function guardarVariantesConfig() {
    escribirJSONAtomico(RUTA_VARIANTES_CONFIG, variantesConfig);
}
```

Línea 755 (dentro de `/api/pdf-carpetas`):

Antes:
```js
            const variantesStat = fs.existsSync('variantes-config.json') ? fs.statSync('variantes-config.json') : null;
```
Después:
```js
            const variantesStat = fs.existsSync(RUTA_VARIANTES_CONFIG) ? fs.statSync(RUTA_VARIANTES_CONFIG) : null;
```

- [ ] **Step 5: `carpetas.json` usa `RUTA_CARPETAS_CONFIG` (3 lugares)**

Línea 254 y 256:

Antes:
```js
let carpetasConfig = { modo: 'separadas', carpetas: CARPETAS_DEFAULT };
if (fs.existsSync('carpetas.json')) {
    try {
        let raw = JSON.parse(fs.readFileSync('carpetas.json', 'utf8'));
```
Después:
```js
let carpetasConfig = { modo: 'separadas', carpetas: CARPETAS_DEFAULT };
if (fs.existsSync(RUTA_CARPETAS_CONFIG)) {
    try {
        let raw = JSON.parse(fs.readFileSync(RUTA_CARPETAS_CONFIG, 'utf8'));
```

Línea 265:

Antes:
```js
function guardarCarpetasConfig() {
    escribirJSONAtomico('carpetas.json', carpetasConfig);
}
```
Después:
```js
function guardarCarpetasConfig() {
    escribirJSONAtomico(RUTA_CARPETAS_CONFIG, carpetasConfig);
}
```

- [ ] **Step 6: `CARPETA_CACHE` cuelga de `DATA_DIR`, con mkdir recursivo**

Línea 535-536:

Antes:
```js
const CARPETA_CACHE = path.join(__dirname, 'cache');
if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE);
```
Después:
```js
const CARPETA_CACHE = path.join(DATA_DIR, 'cache');
if (!fs.existsSync(CARPETA_CACHE)) fs.mkdirSync(CARPETA_CACHE, { recursive: true });
```

- [ ] **Step 7: Verificar sintaxis y que no queden literales viejos**

```bash
node --check server.js && echo "server.js: sintaxis OK"

# No debe quedar ninguna referencia relativa suelta a estos 3 archivos
# (deben quedar solo dentro de la definición de las constantes RUTA_*)
grep -n "'inventario.json'\|'carpetas.json'\|'variantes-config.json'" server.js
```

Expected: `server.js: sintaxis OK`; el `grep` solo debe listar las 3 líneas
de definición de `RUTA_INVENTARIO`/`RUTA_CARPETAS_CONFIG`/`RUTA_VARIANTES_CONFIG`
del Step 1 (3 líneas en total) — ninguna otra ocurrencia.

- [ ] **Step 8: Verificar en runtime con un `DATA_DIR` aislado (sin tocar los datos de producción)**

El servidor de producción (`pokedex.service`) ya está escuchando en el
puerto 3000 en este host — este proceso de prueba va a fallar al hacer
`listen()` por el puerto ocupado, y **eso es esperado**: toda la
inicialización que nos interesa verificar (creación de `DATA_DIR`,
`backups/`, `cache/`, y el primer respaldo automático) ocurre de forma
síncrona antes de esa línea, así que ya se completó para cuando el bind
falla.

```bash
rm -rf /tmp/pokedex-datadir-test
DATA_DIR=/tmp/pokedex-datadir-test node server.js > /tmp/pokedex-datadir-test.log 2>&1 &
TESTPID=$!
sleep 1
ls /tmp/pokedex-datadir-test/backups/
ls /tmp/pokedex-datadir-test/cache/ 2>/dev/null || echo "(cache/ se crea recién al pedir el PDF de recortables, esperado)"
test -f /tmp/pokedex-datadir-test/backups/inventario-*.json && echo "respaldo escrito en DATA_DIR: OK"
kill $TESTPID 2>/dev/null
wait $TESTPID 2>/dev/null
rm -rf /tmp/pokedex-datadir-test /tmp/pokedex-datadir-test.log
```

Expected: `ls .../backups/` muestra un archivo `inventario-<timestamp>.json`;
`respaldo escrito en DATA_DIR: OK`. Confirmá también que el servidor de
producción real sigue respondiendo durante la prueba (no se vio afectado):

```bash
curl -s -o /dev/null -w "producción sigue OK -> %{http_code}\n" http://localhost:3000/api/version
```

Expected: `producción sigue OK -> 200`.

- [ ] **Step 9: Commit**

```bash
git add server.js
git commit -m "Agregar DATA_DIR para poder correr la app con estado en una carpeta separada (self-hosting en Docker)"
```

---

## Task 2: `Dockerfile` y `.dockerignore`

**Spec:** secciones "`Dockerfile`" y "`.dockerignore`".

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

**Interfaces:**
- Consumes: el contrato `DATA_DIR` de la Task 1 (la imagen fija
  `ENV DATA_DIR=/app/data`, que `server.js` ya sabe honrar).
- Produces: imagen buildable con el tag exacto
  `ghcr.io/juanjose1245-maker/pokedextcg:latest` — consumida por la Task 3
  (`docker-compose.yml` referencia ese mismo tag) y la Task 4 (el workflow
  de CI construye con este mismo `Dockerfile`/contexto y publica bajo ese
  tag).

**No ejecutable en este host** (no tiene Docker instalado) — la verificación
real de build queda para la Task 6, en la máquina del usuario.

- [ ] **Step 1: Crear `Dockerfile`**

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app/data

EXPOSE 3000

USER node

CMD ["node", "server.js"]
```

(`node:20-slim` es Debian/glibc — evita el problema conocido de `sharp` con
binarios prebuilt en Alpine/musl. El usuario `node`, uid 1000, ya viene
creado en la imagen oficial.)

- [ ] **Step 2: Crear `.dockerignore`**

```
node_modules
.git
backups
cache
data
inventario.json
carpetas.json
variantes-config.json
docs
graphify-out
.claude
.github
.superpowers
.worktrees
```

(Excluir `carpetas.json`/`variantes-config.json` del build es intencional:
son archivos versionados en este repo con la configuración *personal* del
usuario — una instalación nueva vía Docker debe arrancar con los defaults
del código, no heredarla. `data` se excluye por si alguien corre
`docker build` desde una carpeta donde ya probó `docker compose up` antes —
ver Task 3.)

- [ ] **Step 3: Verificación sintáctica local (sin Docker)**

```bash
test -f Dockerfile && echo "Dockerfile existe"
test -f .dockerignore && echo ".dockerignore existe"

# Confirmar que server.js y package.json quedan dentro del contexto (no
# excluidos por accidente)
grep -qx "server.js" .dockerignore && echo "ERROR: server.js está excluido" || echo "server.js: incluido en el build (OK)"
grep -qx "public" .dockerignore && echo "ERROR: public/ está excluido" || echo "public/: incluido en el build (OK)"
```

Expected: `Dockerfile existe`; `.dockerignore existe`; `server.js: incluido
en el build (OK)`; `public/: incluido en el build (OK)`.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "Agregar Dockerfile para self-hosting (node:20-slim, usuario no-root, DATA_DIR=/app/data)"
```

---

## Task 3: `docker-compose.yml`

**Spec:** sección "`docker-compose.yml`".

**Files:**
- Create: `docker-compose.yml`

**Interfaces:**
- Consumes: el tag de imagen `ghcr.io/juanjose1245-maker/pokedextcg:latest`
  producido por la Task 2, y el contrato de env vars (`ADMIN_PASSWORD`,
  `DATA_DIR`) de la Task 1.
- Produces: el archivo que la Task 5 (README) documenta paso a paso.

**No ejecutable en este host** (no tiene Docker instalado) — verificación
real en la Task 6.

- [ ] **Step 1: Crear `docker-compose.yml`**

```yaml
services:
  pokedex-tcg:
    image: ghcr.io/juanjose1245-maker/pokedextcg:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - ADMIN_PASSWORD=cambiar-esta-contraseña
    volumes:
      - ./data:/app/data
```

(`ADMIN_PASSWORD` queda con un valor placeholder explícito — que grita
"cambiame" — en vez de omitirse, para que a nadie se le pase por alto
dejar la contraseña por defecto insegura del servidor.)

- [ ] **Step 2: Verificación sintáctica local (sin Docker)**

```bash
python3 -c "import yaml; d = yaml.safe_load(open('docker-compose.yml')); assert d['services']['pokedex-tcg']['image'] == 'ghcr.io/juanjose1245-maker/pokedextcg:latest'; assert './data:/app/data' in d['services']['pokedex-tcg']['volumes']; print('docker-compose.yml: estructura OK')"
```

Expected: `docker-compose.yml: estructura OK`.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "Agregar docker-compose.yml de ejemplo para instalar la app con un solo comando"
```

---

## Task 4: Workflow de GitHub Actions para publicar en `ghcr.io`

**Spec:** sección "GitHub Actions (`.github/workflows/docker-publish.yml`)".

**Files:**
- Create: `.github/workflows/docker-publish.yml`

**Interfaces:**
- Consumes: el `Dockerfile`/contexto de build de la Task 2 (mismo
  `context: .`), el tag de imagen ya usado en la Task 2/3.
- Produces: nada consumido en el repo — el efecto es externo (publica la
  imagen en GHCR en cada push a `main`, después de que este plan se pushee).

- [ ] **Step 1: Crear el workflow**

```yaml
name: Publicar imagen Docker

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configurar Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login a GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build y push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/juanjose1245-maker/pokedextcg:latest
```

(Usa el `GITHUB_TOKEN` automático del repo — sin secretos nuevos que
configurar a mano en GitHub. Requiere un ajuste manual, una sola vez, en la
configuración del paquete en GitHub para que quede visible como público
después del primer push — ver Task 6.)

- [ ] **Step 2: Verificación sintáctica local (sin Docker ni GitHub)**

```bash
python3 -c "
import yaml
d = yaml.safe_load(open('.github/workflows/docker-publish.yml'))
assert d['on']['push']['branches'] == ['main']
job = d['jobs']['build-and-push']
assert job['permissions']['packages'] == 'write'
tags = job['steps'][-1]['with']['tags']
assert tags == 'ghcr.io/juanjose1245-maker/pokedextcg:latest', tags
print('workflow YAML: estructura OK')
"
```

Expected: `workflow YAML: estructura OK`.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/docker-publish.yml
git commit -m "Agregar workflow de GitHub Actions para publicar la imagen Docker en ghcr.io en cada push a main"
```

---

## Task 5: Documentación en `README.md`

**Spec:** sección "Documentación".

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: el `docker-compose.yml` exacto de la Task 3 y los nombres de
  env vars (`ADMIN_PASSWORD`, `DATA_DIR`) de la Task 1.
- Produces: nada consumido por otras tareas — es la última en tocar
  archivos de este plan.

- [ ] **Step 1: Crear `README.md`**

```markdown
# Pokédex TCG

Pokédex/TCG personal collection tracker (bulk + carpetas). Instalable como
PWA.

## Instalar con Docker

1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Editá la variable `ADMIN_PASSWORD` con tu propia contraseña (no dejes el
   valor de ejemplo).
3. Corré:

   ```bash
   docker compose up -d
   ```

4. Abrí `http://localhost:3000` en el navegador.

Tus datos (colección, carpetas, respaldos) se guardan en la carpeta `./data`,
junto al `docker-compose.yml` — no se pierden si actualizás la imagen.

### Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ADMIN_PASSWORD` | Sí | Contraseña para las acciones de escritura (marcar cartas, importar, configurar carpetas). Sin esto, el servidor usa una contraseña por defecto insegura — **cambiala siempre** antes de exponer el puerto a internet. |
| `DATA_DIR` | No | Carpeta donde se guardan los datos. La imagen ya la fija en `/app/data`; no hace falta tocarla salvo que sepas lo que estás haciendo. |

### Actualizar

```bash
docker compose pull
docker compose up -d
```

### Problemas comunes

Si al arrancar ves un error de permisos escribiendo en `./data`, corré una
vez en el host:

```bash
sudo chown -R 1000:1000 ./data
```
```

- [ ] **Step 2: Verificar**

```bash
test -f README.md && echo "README.md existe"
grep -q "docker compose up -d" README.md && echo "instrucciones de Docker: OK"
grep -q "ADMIN_PASSWORD" README.md && echo "tabla de env vars: OK"
```

Expected: las 3 líneas `OK`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Agregar README con instrucciones de instalación vía Docker"
```

---

## Task 6: Handoff — verificación real en Docker y publicación

**Esta tarea NO la ejecuta un agente/subagente de forma autónoma.** Es un
checkpoint manual para el usuario, porque:

1. Este servidor de producción no tiene Docker instalado (ver Global
   Constraints) — el build/compose real solo se puede probar en otra
   máquina.
2. Pushear a `main` en este repo dispara el auto-deploy vía
   `/api/webhook-deploy` (`git reset --hard origin/main` + `npm install` +
   reinicio) en **este mismo servidor de producción** — es una acción con
   efecto real e inmediato sobre el servicio en vivo, y además es lo que
   dispara el workflow de la Task 4 (publicar en `ghcr.io`). No debe
   hacerse sin que el usuario lo confirme explícitamente.

Pasos para el usuario, en su propia máquina con Docker instalado:

```bash
git clone git@github.com:juanjose1245-maker/Pokedextcg.git
cd Pokedextcg
docker build -t ghcr.io/juanjose1245-maker/pokedextcg:latest .
mkdir -p data
docker compose up -d
curl -s http://localhost:3000/api/estadisticas?modo=bulk
```

Expected: JSON con `"conseguidos":0` (instalación nueva, vacía).

Prueba de persistencia:

```bash
docker compose down
docker compose up -d
curl -s http://localhost:3000/api/estadisticas?modo=bulk
```

Expected: mismo resultado que antes de `down` (los datos sobrevivieron a
recrear el contenedor, porque viven en `./data`, no dentro del contenedor).

Solo después de que esto funcione en su máquina:

1. Revisar el diff completo de las Tasks 1-5 una vez más.
2. `git push origin main` (dispara el auto-deploy en este servidor y el
   workflow de GitHub Actions).
3. En GitHub → pestaña "Packages" del repo → abrir el paquete
   `pokedextcg` recién publicado → Package settings → cambiar visibilidad a
   **Public** (paso manual, una sola vez, imprescindible para que
   `docker pull` funcione sin login).
4. Confirmar en este servidor que `pokedex.service` sigue arriba después del
   auto-deploy (`systemctl status pokedex.service`) y que
   `curl http://localhost:3000/api/version` sigue devolviendo el nuevo
   commit.

---

## Self-Review (hecho al escribir este plan)

- **Cobertura del spec:** "Cambio en `server.js`" → Task 1; "`Dockerfile`" →
  Task 2; "`.dockerignore`" → Task 2; "`docker-compose.yml`" → Task 3;
  "GitHub Actions" → Task 4; "Documentación" → Task 5. "Fuera de alcance" no
  generó tareas, a propósito.
- **Desviación de la spec, justificada:** default de `DATA_DIR` es
  `__dirname` en vez de `'.'` — ver nota en Task 1. Es estrictamente más
  robusto y produce el mismo resultado en el deploy actual.
- **Verificado contra código real antes de escribir el plan:** todos los
  fragmentos "antes" de la Task 1 (líneas 11, 65-66, 73-76, 105, 126-136,
  254-265, 535-536, 755) fueron leídos directamente de `server.js` en su
  estado actual de este repo, incluyendo los 3 usos de
  `variantes-config.json` (el tercero, dentro de `/api/pdf-carpetas`, es
  fácil de pasar por alto porque está lejos de la definición de
  `guardarVariantesConfig`).
- **Consistencia de nombres:** `DATA_DIR`, `RUTA_INVENTARIO`,
  `RUTA_CARPETAS_CONFIG`, `RUTA_VARIANTES_CONFIG` se usan con el mismo
  nombre en la Task 1 y se referencian igual en las notas de las Tasks 2-3
  (`ENV DATA_DIR=/app/data` en el Dockerfile, `DATA_DIR` en la tabla del
  README).
- **Riesgo de producción identificado y mitigado:** Task 1 corre en el
  mismo host que `pokedex.service` (puerto 3000 ocupado) — el step de
  verificación captura el PID exacto del proceso de prueba (`$!`) y lo mata
  puntualmente, nunca por patrón de nombre, para no arriesgar el proceso
  real. El push a `main` (que dispara auto-deploy + CI) se aisló en la
  Task 6 como checkpoint manual explícito, no como paso automático de
  ninguna tarea anterior.
