# Preparar el repo para lanzamiento público

## Contexto

El repo (`juanjose1245-maker/Pokedextcg`) es privado hoy — confirmado con
`GET /repos/...` sin auth, devuelve 404. El usuario lo va a pasar a público
en breve para que otra gente pueda self-hostear su propia instancia (ver
`docs/superpowers/specs/2026-08-03-docker-self-hosting-design.md`, que ya
dejó Docker + `docker-compose.yml` + README con instrucciones de
instalación). Falta pulir la presentación del repo antes de ese lanzamiento:
licencia, descripción/topics de GitHub, contenido del README, y — lo más
importante — limpiar datos personales que quedaron en el historial de git
antes de que sea visible para cualquiera.

## Hallazgos de la auditoría de seguridad/privacidad

Se revisó `git log --all -p` completo en busca de secretos reales:

- **Ninguna contraseña ni token real filtrado.** El único string
  relacionado es el fallback inseguro `'pokedex123'` que ya se eliminó del
  código (reemplazado por el flujo de "definir contraseña en el primer
  uso"). `ADMIN_PASSWORD` y `DEPLOY_WEBHOOK_SECRET` solo aparecen como
  nombres de variable de entorno, nunca con su valor real commiteado.
  Ningún `.env` fue trackeado jamás.
- **Datos de colección personal sí quedaron en el historial:**
  - `inventario.backup-2026-07-19T16-49-14-701Z.json` está **trackeado
    ahora mismo** en la raíz del repo (visible en `git ls-files`).
  - `inventario.json` estuvo trackeado en los primeros 4 commits del repo
    (`3dddd34` → `9eb2bf2`, donde se dejó de trackear).
  - `backups/inventario-2026-07-20T04-02-14-545Z.json` y
    `backups/inventario-2026-07-20T04-10-35-671Z.json` estuvieron
    trackeados brevemente (`c0273b9`, `39d6fb9`).
  - Ninguno de estos archivos contiene credenciales — son mapas
    `id → fecha` de qué Pokémon posee el usuario. Baja severidad, pero es
    dato personal que el usuario decidió no dejar público (confirmado:
    prefiere limpiar el historial completo, no solo dejar de trackear hacia
    adelante).
- **El paquete Docker en GHCR es privado.** `ghcr.io/juanjose1245-maker/
  pokedextcg:latest` devuelve 403 incluso con un token anónimo de pull. El
  README le pide a cualquiera que llegue al repo que corra
  `docker compose pull` contra esa imagen — si el repo se hace público pero
  el paquete sigue privado, el primer paso de instalación falla para todo
  el mundo. **Fuera del alcance de este trabajo** (es un toggle en la
  configuración del paquete en GitHub, no algo que se resuelva por git) —
  el usuario lo cambia a mano antes de anunciar el lanzamiento.
- Repo hecho público: también fuera de alcance (acción manual del usuario
  en GitHub, después de que este trabajo esté commiteado y pusheado).

## Alcance

1. Reescribir el historial de git para eliminar por completo los 4 archivos
   de colección personal listados arriba, de todos los commits.
2. Agregar `LICENSE` (MIT) y alinear `package.json`.
3. Reescribir `README.md`.
4. Dejar preparado el texto de descripción/topics para que el usuario lo
   pegue en GitHub (no se puede automatizar sin `gh` autenticado).

## 1) Purga del historial con `git filter-repo`

Ya instalado (`apt-get install git-filter-repo`). Correr desde
`/var/www/html/pokedex-tcg` (el mismo directorio que sirve producción):

```bash
git filter-repo --force \
  --path inventario.json \
  --path inventario.backup-2026-07-19T16-49-14-701Z.json \
  --path backups/inventario-2026-07-20T04-02-14-545Z.json \
  --path backups/inventario-2026-07-20T04-10-35-671Z.json \
  --invert-paths
```

`filter-repo` reescribe cada commit que tocó esas rutas y expira los
reflogs/gc automáticamente. Como safety feature, además **remueve el remote
`origin`** — hay que volver a agregarlo antes de pushear:

```bash
git remote add origin git@github.com:juanjose1245-maker/Pokedextcg.git
git push --force origin main
```

**Impacto en producción**: ninguno. `inventario.json` real vive en
`DATA_DIR` (gitignored, nunca tocado por esto). El mismo directorio es el
`WorkingDirectory` de `pokedex.service`, así que no hay un segundo clon que
resincronizar — el webhook de auto-deploy (`git fetch && git reset --hard
origin/main`) va a funcionar igual con la historia nueva la próxima vez que
se dispare. Como nadie clonó el repo todavía (confirmado con el usuario),
no hay clones de terceros que se rompan por el cambio de hashes.

**Verificación post-purga**: confirmar con
`git log --all --oneline -- inventario.json inventario.backup-*.json 'backups/*.json'`
que no devuelve nada, y que `git ls-files` ya no lista
`inventario.backup-2026-07-19T16-49-14-701Z.json`.

## 2) LICENSE

Archivo `LICENSE` en la raíz, texto estándar MIT, copyright
`juanjose1245-maker`, año 2026.

`package.json`: cambiar `"license": "ISC"` → `"license": "MIT"` (hoy dice
ISC pero nunca hubo un archivo LICENSE real — inconsistencia a corregir).

## 3) README.md — reescritura completa

Audiencia: gente que quiere self-hostear su propia colección (no un
portfolio técnico). Estructura:

1. **Título + pitch de una línea.** Qué es la app en una oración.
   Comentario HTML `<!-- TODO: agregar captura de pantalla -->` donde
   iría una imagen — no hay capturas disponibles todavía (sin navegador
   conectado en esta sesión para tomarlas); se agregan en un paso aparte
   más adelante.
2. **Qué hace / features**, con más detalle que la versión actual (pedido
   explícito del usuario sobre la propuesta inicial más corta):
   - Dos modos de colección independientes: `bulk` (cartas sueltas) y
     `carpetas` (organizadas en hasta 4 binders configurables, por
     generación o por rango contiguo de Pokédex).
   - Wizard de configuración de carpetas (capacidad, nombres, layout).
   - Escaneo de cartas con la cámara vía OCR (Tesseract.js) para marcarlas
     más rápido.
   - Export/import de la colección, y PDFs recortables de las cartas
     faltantes.
   - Sincronización en vivo entre pestañas/dispositivos (Server-Sent
     Events) — marcás una carta en el celu y se refleja al toque en la
     compu.
   - Instalable como PWA, con soporte offline para ver la colección ya
     cargada.
   - Selector de idioma (ES/EN) con detección automática por navegador.
3. **Instalación con Docker.** Contenido ya existente en el README actual
   (compose, puerto, volumen de datos, variables de entorno, actualizar,
   troubleshooting de contenedor reiniciándose) — se conserva tal cual,
   reordenado debajo de las secciones 1 y 2.
4. **Cómo está armado.** Párrafo corto: Node + Express de un solo archivo,
   sin build step ni framework en el frontend (HTML/CSS/JS planos servidos
   como estáticos), datos en archivos JSON (no hay base de datos).
5. **Licencia.** Línea final: "MIT — ver [`LICENSE`](LICENSE)."

## 4) About de GitHub (texto para pegar a mano)

No hay `gh` autenticado en este entorno para setearlo por API — se le
entrega al usuario el texto exacto para pegar en Settings → General
(descripción) y en el ⚙️ de "About" en la página principal (topics):

- **Descripción**: `Pokédex/TCG collection tracker — self-hosted PWA to
  track your card collection (loose cards or organized binders)`
- **Topics**: `pokemon`, `pokemon-tcg`, `collection-tracker`, `pwa`,
  `self-hosted`, `docker`, `express`, `nodejs`

## Fuera de alcance

- Cambiar la visibilidad del repo a público (acción manual del usuario en
  GitHub, después de este trabajo).
- Cambiar la visibilidad del paquete GHCR a público (ídem — bloqueante
  para el lanzamiento pero es un toggle de GitHub, no de este repo).
- Tomar capturas de pantalla reales (no hay navegador conectado en esta
  sesión).
- Cualquier cambio de código/funcionalidad de la app — este trabajo es
  puramente de presentación del repo e higiene de historial.

## Testing / verificación

- Sin suite de tests — verificación manual:
- `git log --all --oneline -- inventario.json 'inventario.backup-*.json' 'backups/*.json'`
  no devuelve commits después de la purga.
- `git ls-files` no lista ningún archivo de colección personal.
- El servidor en el puerto 3000 sigue respondiendo normalmente durante y
  después del force-push (confirma que la purga no afectó producción).
- `node -e "require('./package.json')"` o simplemente abrir el archivo,
  confirmar `"license": "MIT"`.
- Leer el README renderizado en GitHub tras el push, confirmar que los
  bloques de código y el TODO de captura se ven bien.
