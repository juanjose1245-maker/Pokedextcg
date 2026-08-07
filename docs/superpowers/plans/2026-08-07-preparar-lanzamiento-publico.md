# Preparar el repo para lanzamiento público — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repo `Pokedextcg` listo para pasar a público: historial de git sin datos de colección personal, licencia MIT, y un README que venda la app a alguien que quiere self-hostearla.

**Architecture:** No hay cambios de código de la app — es reescritura de historial de git (`git filter-repo`) más tres archivos nuevos/editados (`LICENSE`, `package.json`, `README.md`). Todo corre en el mismo directorio que sirve producción (`/var/www/html/pokedex-tcg`), así que cada verificación incluye confirmar que el servidor en el puerto 3000 sigue respondiendo.

**Tech Stack:** `git-filter-repo` (ya instalado vía apt), git, Markdown.

## Global Constraints

- No tocar `inventario.json` real, `carpetas.json`, `variantes-config.json` ni ningún archivo bajo `DATA_DIR` — son datos vivos, no parte de este trabajo.
- La purga de historial elimina exactamente estas 4 rutas de todos los commits, ninguna más: `inventario.json`, `inventario.backup-2026-07-19T16-49-14-701Z.json`, `backups/inventario-2026-07-20T04-02-14-545Z.json`, `backups/inventario-2026-07-20T04-10-35-671Z.json`.
- Copyright del LICENSE: `juanjose1245-maker`, año 2026.
- No cambiar la visibilidad del repo ni del paquete GHCR — son acciones manuales del usuario, fuera de este plan.
- No hay suite de tests en el proyecto — la verificación de cada task es manual (comandos de shell + confirmar output esperado).

---

### Task 1: Purgar datos de colección personal del historial de git

**Files:**
- Modifica: todo `.git/` (reescritura de historial — no hay diff de contenido de archivos de código)

**Interfaces:**
- Consumes: nada (primer task del plan)
- Produces: historial de git en `origin/main` sin los 4 archivos listados en Global Constraints. Los tasks 2 y 3 commitean *sobre* este historial ya purgado.

- [ ] **Step 1: Backup de seguridad del `.git` actual, por si algo sale mal**

```bash
cd /var/www/html/pokedex-tcg
tar czf /tmp/pokedex-tcg-git-backup-$(date +%s).tar.gz .git
```

Guardá la ruta que imprime `ls -la /tmp/pokedex-tcg-git-backup-*.tar.gz` — es la red de seguridad si `filter-repo` hace algo inesperado.

- [ ] **Step 2: Confirmar el estado actual antes de purgar (para comparar después)**

```bash
git log --all --oneline -- inventario.json 'inventario.backup-*.json' 'backups/*.json'
git ls-files | grep -iE "inventario"
```

Expected: la primera lista varios commits (`9eb2bf2`, `c0273b9`, `b5b9d99`, `25ada6d`, `3dddd34`, `39d6fb9`); la segunda muestra `inventario.backup-2026-07-19T16-49-14-701Z.json`.

- [ ] **Step 3: Correr `git filter-repo`**

```bash
git filter-repo --force \
  --path inventario.json \
  --path inventario.backup-2026-07-19T16-49-14-701Z.json \
  --path backups/inventario-2026-07-20T04-02-14-545Z.json \
  --path backups/inventario-2026-07-20T04-10-35-671Z.json \
  --invert-paths
```

Expected: termina sin error, imprime un resumen de commits reescritos. `filter-repo` remueve el remote `origin` como medida de seguridad — es esperado, se re-agrega en el siguiente step.

- [ ] **Step 4: Verificar que la purga funcionó**

```bash
git log --all --oneline -- inventario.json 'inventario.backup-*.json' 'backups/*.json'
git ls-files | grep -iE "inventario"
```

Expected: ambos comandos no devuelven nada (la primera lista de commits desapareció por completo, y `inventario.backup-*.json` ya no está trackeado).

- [ ] **Step 5: Re-agregar el remote y confirmar que el working tree sigue teniendo el `inventario.json` real intacto**

```bash
git remote add origin git@github.com:juanjose1245-maker/Pokedextcg.git
ls -la inventario.json
cat inventario.json | head -c 100
```

Expected: `git remote -v` muestra `origin` de nuevo; `inventario.json` sigue en disco con contenido (nunca estuvo trackeado desde `9eb2bf2` en adelante en la rama actual, así que `filter-repo` no lo tocó como archivo de working tree — solo limpió los commits viejos que sí lo tenían trackeado).

- [ ] **Step 6: Force-push de la historia reescrita**

```bash
git push --force origin main
```

Expected: push exitoso. Como confirmaste que nadie más clonó el repo todavía, este force-push no rompe clones de terceros.

- [ ] **Step 7: Confirmar que producción sigue funcionando (mismo directorio, sin downtime esperado)**

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
systemctl is-active pokedex.service
```

Expected: `200` y `active`. El webhook de auto-deploy puede o no dispararse por este push (dependiendo de si GitHub llega a mandarlo a tiempo); cualquiera de los dos casos deja el servicio activo, porque el `inventario.json` real nunca estuvo en juego.

- [ ] **Step 8: No hay commit en este task** (es una reescritura de historia + push, no un commit nuevo). Confirmar `git log -1 --oneline` para tener claro sobre qué commit se apoyan los tasks 2 y 3.

```bash
git log -1 --oneline
```

---

### Task 2: Agregar LICENSE (MIT) y alinear `package.json`

**Files:**
- Create: `LICENSE`
- Modify: `package.json` (campo `license`)

**Interfaces:**
- Consumes: historial ya purgado y pusheado (Task 1)
- Produces: `LICENSE` en la raíz, referenciado por el README del Task 3 como `[LICENSE](LICENSE)`

- [ ] **Step 1: Crear `LICENSE`**

Contenido completo del archivo `/var/www/html/pokedex-tcg/LICENSE`:

```
MIT License

Copyright (c) 2026 juanjose1245-maker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Editar `package.json`**

Cambiar la línea:
```json
  "license": "ISC",
```
por:
```json
  "license": "MIT",
```

- [ ] **Step 3: Verificar**

```bash
head -3 LICENSE
grep '"license"' package.json
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json válido')"
```

Expected: `MIT License` como primera línea, `"license": "MIT",` en el grep, y `package.json válido` sin errores de parseo.

- [ ] **Step 4: Commit**

```bash
git add LICENSE package.json
git commit -m "$(cat <<'EOF'
Agregar LICENSE (MIT) y alinear package.json

El repo nunca tuvo un archivo de licencia real pese a que package.json
decía "ISC" — se define MIT de cara al lanzamiento público.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Reescribir `README.md`

**Files:**
- Modify: `README.md` (reescritura completa)

**Interfaces:**
- Consumes: `LICENSE` del Task 2 (el README lo referencia con un link relativo)
- Produces: README final, listo para que el usuario pegue el texto de About de GitHub por separado (no es parte de este repo, se entrega en el mensaje final al usuario)

- [ ] **Step 1: Reemplazar el contenido completo de `README.md`**

```markdown
# Pokédex TCG

Pokédex/TCG personal collection tracker — una PWA autohospedada para llevar
el control de tu colección de cartas, sola o en carpetas.

<!-- TODO: agregar captura de pantalla -->

## Qué hace

- **Dos modos de colección independientes**: `bulk` (cartas sueltas, sin
  organizar) y `carpetas` (organizadas en hasta 4 binders configurables —
  por generación completa o por un rango contiguo de números de Pokédex).
- **Wizard de configuración de carpetas**: elegís cuántas carpetas tenés,
  cuántos bolsillos por hoja tienen tus binders físicos, y la app calcula
  sola cómo repartir los Pokémon entre ellas.
- **Escaneo de cartas con la cámara (OCR)**: apuntá la cámara a una carta y
  la app la reconoce automáticamente (Tesseract.js corriendo en el
  navegador, sin mandar imágenes a ningún servidor).
- **Export/import** de tu colección completa, y generación de **PDFs
  recortables** con las cartas que te faltan.
- **Sincronización en vivo entre dispositivos**: marcás una carta desde el
  celular y se refleja al instante en la compu (Server-Sent Events, sin
  polling).
- **Instalable como PWA**, con vista offline de la colección ya cargada.
- **Español / inglés**, con detección automática por navegador y selector
  manual en Ajustes.

## Instalar con Docker

1. Descargá el [`docker-compose.yml`](docker-compose.yml) de este repo a una
   carpeta vacía.
2. Corré:

   ```bash
   docker compose up -d
   ```

3. Abrí `http://localhost:3000` en el navegador — la primera vez que
   intentes hacer un cambio (marcar una carta, configurar carpetas, etc.)
   te va a pedir definir tu contraseña ahí mismo.

¿Necesitás usar otro puerto porque el 3000 ya está ocupado? No hay una
variable de entorno para eso a propósito — cambiá el mapeo de puertos en
`docker-compose.yml`, por ejemplo `"8080:3000"` en vez de `"3000:3000"`.

Tus datos (colección, carpetas, respaldos) se guardan en la carpeta `./data`,
junto al `docker-compose.yml` — no se pierden si actualizás la imagen.

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

### Actualizar

```bash
docker compose pull
docker compose up -d
```

### Problemas comunes

Si `http://localhost:3000` no responde ("connection refused" o similar),
puede que el contenedor esté reiniciándose en loop sin que `docker compose
up -d` te lo avise (ese comando reporta éxito aunque el contenedor esté
fallando). Revisá:

```bash
docker compose ps
```

Si aparece reiniciándose (`Restarting`) en vez de `Up`, mirá el error real
con:

```bash
docker compose logs
```

## Cómo está armado

Backend en Node + Express, un solo archivo (`server.js`) sin base de
datos — la colección y la configuración se guardan en archivos JSON. El
frontend es HTML/CSS/JS planos servidos como estáticos (`public/`), sin
build step ni framework.

## Licencia

MIT — ver [`LICENSE`](LICENSE).
```

- [ ] **Step 2: Verificar**

```bash
grep -c '^##' README.md
grep -n "TODO: agregar captura" README.md
grep -n "LICENSE" README.md
```

Expected: al menos 3 headers de nivel 2 (`## Qué hace`, `## Instalar con Docker`, `## Cómo está armado`, `## Licencia`), el comentario TODO presente una vez, y una línea referenciando `LICENSE`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
Reescribir README para lanzamiento público

Antes solo tenía instrucciones de instalación Docker. Ahora explica qué es
la app, los dos modos de colección y las features principales, pensado
para alguien que llega al repo sin contexto y evalúa si self-hostearla.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Push**

```bash
git push origin main
```

Expected: push normal (no force — ya estamos parados sobre la historia reescrita y pusheada en el Task 1).

- [ ] **Step 5: Confirmar producción sigue arriba tras el push (dispara el webhook de auto-deploy)**

```bash
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
systemctl is-active pokedex.service
```

Expected: `200` y `active`.

---

## Entregable final al usuario (no es un task de código)

Después del Task 3, pasarle al usuario este texto para que lo pegue a mano en GitHub (no se puede automatizar sin `gh` autenticado):

- **Settings → General → Description**:
  `Pokédex/TCG collection tracker — self-hosted PWA to track your card collection (loose cards or organized binders)`
- **Botón ⚙️ junto a "About" en la página principal → Topics**:
  `pokemon`, `pokemon-tcg`, `collection-tracker`, `pwa`, `self-hosted`, `docker`, `express`, `nodejs`

Y recordarle los dos pasos manuales que quedan fuera de este plan antes de anunciar el lanzamiento:
1. Pasar el paquete `ghcr.io/juanjose1245-maker/pokedextcg` a público (hoy da 403 con pull anónimo).
2. Pasar el repo de privado a público en Settings → General → Danger Zone.
