# Empaquetar la app en Docker para que otros la auto-hosteen

## Contexto

Hoy la única forma de correr esta app es clonando el repo, instalando Node y
dependencias a mano, y corriendo `node server.js` (o el unit de systemd
`pokedex.service` en el servidor de producción). El objetivo de este cambio
es que **cualquier otra persona** pueda instalar su propia copia con
`docker compose up -d`, sin clonar el repo ni tener Node instalado — como un
self-hosted app típico.

Confirmado con el usuario durante el brainstorming:

- El objetivo es que **otros** se instalen su propia copia (no reemplazar el
  deploy actual del usuario, que sigue en systemd tal cual está).
- El webhook de auto-deploy (`/api/webhook-deploy`, `git reset --hard` +
  `npm install`) no encaja con contenedores (la imagen se reconstruye, no se
  actualiza con git) — pero como ya hoy queda deshabilitado si
  `DEPLOY_WEBHOOK_SECRET` no está seteado, alcanza con no definir esa env var
  en el `docker-compose.yml`. **Cero cambios de código para esto.**
- La imagen se publica ya construida en GitHub Container Registry (`ghcr.io`)
  vía GitHub Actions — quien instale hace `docker pull`/`docker compose up`
  sin buildear nada localmente.
- Se incluye un `docker-compose.yml` listo para copiar y usar (no solo
  instrucciones de `docker run`).
- La persistencia de datos usa una única carpeta `DATA_DIR` montada como
  volumen, en vez de bind-mounts sueltos por archivo — evita el problema
  clásico de Docker donde montar un archivo que no existe en el host crea una
  carpeta vacía en su lugar en vez de fallar con un error claro.

## Cambio en `server.js`: `DATA_DIR`

Una sola constante nueva, retrocompatible por diseño:

```js
const DATA_DIR = process.env.DATA_DIR || '.';
```

Los 5 archivos/carpetas de estado del usuario pasan a resolverse relativos a
`DATA_DIR` en vez de al directorio del proyecto (`__dirname`) o al cwd:

- `inventario.json` → `path.join(DATA_DIR, 'inventario.json')`
- `carpetas.json` → `path.join(DATA_DIR, 'carpetas.json')`
- `variantes-config.json` → `path.join(DATA_DIR, 'variantes-config.json')`
- `CARPETA_RESPALDOS` (`backups/`) → `path.join(DATA_DIR, 'backups')`
- `CARPETA_CACHE` (`cache/`) → `path.join(DATA_DIR, 'cache')`

`pokemon_db.json` (dato de referencia, read-only) **no** se mueve — sigue
leyéndose desde `__dirname`, siempre horneado en la imagen/el checkout de
git.

Como el deploy actual en systemd no define `DATA_DIR`, el valor por defecto
sigue siendo `'.'` — mismo comportamiento exacto que hoy, cero impacto en
producción.

**Detalle de arranque:** hay que asegurar que `DATA_DIR` exista (creación
recursiva) antes de que `CARPETA_RESPALDOS`/`CARPETA_CACHE` intenten
crearse — hoy `CARPETA_RESPALDOS` se crea con `mkdirSync(...)` sin
`{recursive:true}`, lo cual asume que el padre (antes siempre `__dirname`,
que ya existe) está presente. En un contenedor nuevo, `/app/data` no existe
todavía, así que esa llamada rompería. Se agrega
`fs.mkdirSync(DATA_DIR, {recursive:true})` al inicio, y se deja
`{recursive:true}` también en la creación de `CARPETA_RESPALDOS`/
`CARPETA_CACHE` por consistencia.

## `Dockerfile`

- Base `node:20-slim` (Debian/glibc) — evita el problema conocido de `sharp`
  con binarios prebuilt en Alpine/musl.
- `npm ci --omit=dev` contra el `package-lock.json` ya versionado (build
  reproducible, sin devDependencies porque el proyecto no tiene).
- Corre como el usuario no-root `node` que ya trae la imagen oficial (no
  `www-data`, eso es específico del deploy systemd/nginx actual).
- `ENV DATA_DIR=/app/data` — fija el volumen de datos por defecto solo
  dentro del contenedor.
- `EXPOSE 3000`.
- `CMD ["node", "server.js"]`.

## `.dockerignore`

Excluye del build context: `node_modules/`, `.git/`, `backups/`, `cache/`,
`inventario.json`, `carpetas.json`, `variantes-config.json`, `docs/`,
`graphify-out/`, `.claude/`, `.github/`, `.superpowers/`, `.worktrees/`.

Excluir `carpetas.json`/`variantes-config.json` es intencional: son archivos
versionados en git con la configuración *personal* del usuario. Una
instalación nueva vía Docker debe arrancar con los defaults del código
(`CARPETAS_DEFAULT` y todas las categorías de variantes en `false`), no
heredar la config personal de este repo.

## `docker-compose.yml`

Archivo listo para copiar y correr, sin necesidad de clonar el repo:

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

`ADMIN_PASSWORD` queda como env var obligatoria en el ejemplo (con un valor
placeholder explícito) para que nadie deje corriendo la contraseña por
defecto (`pokedex123`) sin darse cuenta — el propio servidor ya advierte por
log si falta, pero el compose de ejemplo la fuerza a estar presente y con un
valor que grita "cambiame".

## GitHub Actions (`.github/workflows/docker-publish.yml`)

Build + push a `ghcr.io/juanjose1245-maker/pokedextcg` (a partir del remoto
`origin` del repo, `github.com/juanjose1245-maker/Pokedextcg`) en cada push a
`main`, tag `latest`,
usando el `GITHUB_TOKEN` automático del repo (sin secretos nuevos que
configurar en GitHub). Requiere que el paquete quede visible como público en
GHCR (ajuste manual, una sola vez, en la configuración del paquete en
GitHub) para que cualquiera pueda hacer `docker pull` sin autenticarse.

## Documentación

Se agrega una sección "Instalar con Docker" al `README.md` del repo (se crea
si no existe) con:

- Los 3 pasos: descargar el `docker-compose.yml` de ejemplo, editar
  `ADMIN_PASSWORD`, correr `docker compose up -d`.
- Tabla de env vars soportadas (`ADMIN_PASSWORD`, `DATA_DIR` con nota de que
  no hace falta tocarla en Docker).
- Aviso explícito de cambiar la contraseña por defecto antes de exponer el
  puerto a internet (mismo espíritu que la advertencia que ya tira el
  servidor por log).

## Fuera de alcance

- Tocar el deploy en systemd/producción del usuario — sigue igual, sin
  `DATA_DIR` seteada, sin Docker de por medio.
- El endpoint `/api/webhook-deploy` — se deja el código intacto; en el
  contexto Docker simplemente nunca se define `DEPLOY_WEBHOOK_SECRET`.
- Multi-instancia / escalado horizontal — las sesiones de auth siguen en un
  `Map` en memoria de un solo proceso; correr más de una réplica del
  contenedor rompería el login. Fuera de alcance para un self-hosted de una
  sola persona.
- Hacer `PORT` configurable por env var — sigue hardcodeado a 3000 en
  `server.js`; en Docker se resuelve mapeando el puerto host que se quiera
  en el `docker-compose.yml` (`"8080:3000"`, por ejemplo), sin tocar código.
- Un healthcheck de Docker (`HEALTHCHECK` en el Dockerfile) — no pedido, se
  puede agregar después si hace falta.

## Testing

Sin suite de tests automatizados en el proyecto — verificación manual:

- `docker build` completa sin errores y la imagen resultante levanta con
  `docker compose up`.
- Con un volumen `./data` vacío, el contenedor arranca limpio: crea
  `data/backups/`, `data/cache/`, y responde en `/api/estadisticas` con
  colección vacía (defaults de `CARPETAS_DEFAULT`, todas las variantes en
  `false`).
- Marcar una carta como conseguida, reiniciar el contenedor
  (`docker compose restart`), y confirmar que el dato persiste (se leyó
  correctamente de `./data/inventario.json` en el host).
- `docker compose down && docker compose up -d` (recrear el contenedor
  entero, no solo reiniciar) también preserva los datos.
- El deploy en systemd (`pokedex.service`) sigue funcionando igual que antes
  del cambio — mismo `inventario.json` en la raíz del repo, sin `DATA_DIR`
  seteada.
- El workflow de GitHub Actions publica correctamente una imagen en
  `ghcr.io` visible como pública, y un `docker pull` desde otra máquina (sin
  login) la descarga sin error.
